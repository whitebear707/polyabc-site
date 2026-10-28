// PolyABC class recording — teacher's browser records the class and uploads it in pieces
// straight to the school's Google Drive while the class is running.
// Every piece is also kept in this browser (IndexedDB) until Google confirms it, so if the
// teacher closes the page early the rest is sent the next time they open the teacher pages.
(function () {
  const SERVER_DEFAULT = 'https://polyabc-server.onrender.com';
  const server = () => (typeof SERVER_URL !== 'undefined' && SERVER_URL) || SERVER_DEFAULT;
  const Q = 256 * 1024;                                    // Google wants pieces in 256 KiB steps
  const CHUNK = () => (window.__REC_CHUNK || 16) * Q;       // ≈4 MiB per upload (≈1 minute of class)
  const token = () => localStorage.getItem('adminToken') || '';
  const api = (path, body) => fetch(server() + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify(body || {}) })
    .then(r => r.json()).catch(() => ({}));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ── little IndexedDB store: meta (one per recording) + pieces ──
  let _db = null;
  function idb() {
    if (_db) return _db;
    _db = new Promise((res) => {
      try {
        const rq = indexedDB.open('polyabc-rec', 1);
        rq.onupgradeneeded = () => { const d = rq.result; d.createObjectStore('meta', { keyPath: 'recId' }); d.createObjectStore('pieces', { keyPath: 'k' }); };
        rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null);
      } catch (e) { res(null); }
    });
    return _db;
  }
  async function tx(store, mode, fn) {
    const d = await idb(); if (!d) return null;
    return new Promise((res) => {
      try { const t = d.transaction(store, mode); const st = t.objectStore(store); const out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => res(null); t.onabort = () => res(null); }
      catch (e) { res(null); }
    });
  }
  const putMeta = m => tx('meta', 'readwrite', s => s.put(m));
  const delMeta = id => tx('meta', 'readwrite', s => s.delete(id));
  const allMeta = () => tx('meta', 'readonly', s => s.getAll());
  const putPiece = (recId, start, blob) => tx('pieces', 'readwrite', s => s.put({ k: [recId, start], recId, start, blob }));
  const piecesOf = recId => tx('pieces', 'readonly', s => s.getAll(IDBKeyRange.bound([recId, 0], [recId, Number.MAX_SAFE_INTEGER])));
  const delPiecesBelow = (recId, endExcl) => tx('pieces', 'readwrite', s => s.delete(IDBKeyRange.bound([recId, 0], [recId, endExcl], false, true)));

  // ── one upload to Google, fed piece by piece ──
  function Upload(meta) {
    const u = { meta, pieces: [], end: 0, sent: meta.sent || 0, final: false, busy: false, done: false, failed: false, onProgress: null, _waiters: [] };
    u.add = (blob) => { if (!blob || !blob.size) return; const start = u.end; u.end += blob.size; u.pieces.push({ start, blob }); putPiece(meta.recId, start, blob); meta.beat = Date.now(); putMeta(meta); u.pump(); };
    u.finish = () => { u.final = true; u.pump(); return new Promise(r => { if (u.done || u.failed) r(u.done); else u._waiters.push(r); }); };
    const settle = (ok) => { if (ok) u.done = true; else u.failed = true; u._waiters.splice(0).forEach(r => r(ok)); };
    const bytesFrom = (from, len) => {
      const parts = u.pieces.filter(p => p.start + p.blob.size > from && p.start < from + len);
      if (!parts.length) return new Blob([]);
      const b = new Blob(parts.map(p => p.blob)); const off = from - parts[0].start;
      return b.slice(off, off + len);
    };
    const prune = () => { u.pieces = u.pieces.filter(p => p.start + p.blob.size > u.sent); delPiecesBelow(meta.recId, firstKeptStart()); meta.sent = u.sent; putMeta(meta); };
    const firstKeptStart = () => u.pieces.length ? u.pieces[0].start : u.sent;
    const markComplete = async (fileId) => {
      const r = await api(`/recordings/${meta.recId}/complete`, { fileId, bytes: u.end });
      if (r && r.success) { await delPiecesBelow(meta.recId, Number.MAX_SAFE_INTEGER); await delMeta(meta.recId); settle(true); return true; }
      return false;
    };
    // ask Google how much it already has
    u.resync = async () => {
      try {
        const r = await fetch(meta.uploadUrl, { method: 'PUT', headers: { 'Content-Range': 'bytes */*' } });
        if (r.status === 200 || r.status === 201) { const f = await r.json().catch(() => ({})); if (f.id) { await markComplete(f.id); return 'done'; } }
        if (r.status === 308) { const rg = r.headers.get('Range'); u.sent = rg ? Number(rg.split('-')[1]) + 1 : 0; return 'ok'; }
        if (r.status === 404 || r.status === 410) return 'gone';
      } catch (e) {}
      return 'err';
    };
    u.pump = async () => {
      if (u.busy || u.done || u.failed) return;
      u.busy = true;
      let errors = 0;
      try {
        while (!u.done) {
          const avail = u.end - u.sent;
          let len, last = false;
          if (u.final) { len = avail; last = true; }
          else if (avail >= CHUNK()) len = CHUNK();
          else break;
          if (last && u.end === 0) { await delMeta(meta.recId); settle(false); break; }
          const body = bytesFrom(u.sent, len);
          const range = len > 0 ? `bytes ${u.sent}-${u.sent + len - 1}/${last ? u.end : '*'}` : `bytes */${u.end}`;
          let r = null;
          try { r = await fetch(meta.uploadUrl, { method: 'PUT', headers: { 'Content-Range': range }, body }); } catch (e) { r = null; }
          if (r && r.status === 308) {
            const rg = r.headers.get('Range'); u.sent = rg ? Number(rg.split('-')[1]) + 1 : u.sent + len;
            errors = 0; prune();
            api(`/recordings/${meta.recId}/progress`, { bytes: u.sent });
            if (u.onProgress) u.onProgress(u.sent, u.end);
            continue;
          }
          if (r && (r.status === 200 || r.status === 201)) {
            const f = await r.json().catch(() => ({}));
            u.sent = u.end; if (u.onProgress) u.onProgress(u.sent, u.end);
            if (f.id && await markComplete(f.id)) break;
          }
          if (r && (r.status === 404 || r.status === 410)) { await delMeta(meta.recId); settle(false); break; } // upload link expired (a week): give up
          // network hiccup: wait, ask Google where we are, try again
          errors++;
          await sleep(Math.min(30000, 1000 * Math.pow(2, Math.min(errors, 5))));
          const s = await u.resync();
          if (s === 'done') break;
          if (s === 'gone') { await delMeta(meta.recId); settle(false); break; }
          if (u.final && errors > 8) break;                                     // try again on the next visit
        }
      } finally { u.busy = false; }
      if (!u.done && !u.failed && (u.final ? u.end > u.sent : u.end - u.sent >= CHUNK())) setTimeout(u.pump, 3000);
    };
    return u;
  }

  // Send what a closed page left behind (runs on the teacher pages)
  let _resuming = false;
  async function resumePending() {
    if (_resuming) return; _resuming = true;
    let waiting = 0;
    try {
    const metas = (await allMeta()) || [];
    for (const m of metas) {
      if (window.__REC_LIVE && window.__REC_LIVE.meta.recId === m.recId) continue;   // this page is recording it
      if (Date.now() - (m.beat || m.createdAt || 0) < 20000) { waiting++; continue; } // still being recorded in another tab (or just closed)
      const ps = ((await piecesOf(m.recId)) || []).sort((a, b) => a.start - b.start);
      const u = Upload(m);
      u.pieces = ps.map(p => ({ start: p.start, blob: p.blob }));
      u.end = ps.length ? ps[ps.length - 1].start + ps[ps.length - 1].blob.size : (m.sent || 0);
      u.final = true;
      const s = await u.resync();
      if (s === 'gone') { await delMeta(m.recId); continue; }
      if (s === 'done') continue;
      if (u.pieces.length && u.pieces[0].start > u.sent) { await delMeta(m.recId); continue; }  // a gap we can't fill
      await u.finish();
    }
    } finally { _resuming = false; }
    if (waiting) setTimeout(resumePending, 25000);
  }

  // ── live class recorder (classroom page, teacher only) ──
  // Draws the whiteboard / shared screen and everyone's cameras on one picture, mixes all voices,
  // and records ≈540p at 12 fps (small files, light on old laptops).
  function LiveRecorder(opts) {
    const W = 960, H = 540, BW = 720, BH = 405, FPS = 12;
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const ctx = out.getContext('2d');
    const frames = new Map();   // track.id -> { frame, reader }
    const audioIds = new Set();
    let ac = opts.audioContext, dest = null, rec = null, upload = null, ticker = null, scanT = null, stopped = false;

    function latest(track) {
      if (!track || track.readyState !== 'live') return null;
      let e = frames.get(track.id);
      if (!e && typeof MediaStreamTrackProcessor !== 'undefined') {
        // Reads frames straight from the camera / share, so it keeps working while the teacher is on another tab
        e = { frame: null, reader: null };
        try {
          e.reader = new MediaStreamTrackProcessor({ track }).readable.getReader();
          (async () => { try { for (;;) { const { value, done } = await e.reader.read(); if (done) break; if (e.frame) e.frame.close(); e.frame = value; if (stopped) { value.close(); e.frame = null; break; } } } catch (er) {} })();
        } catch (er) { e.reader = null; }
        frames.set(track.id, e);
      }
      return e && e.frame;
    }
    function fit(src, sw, sh, x, y, w, h) {
      if (!sw || !sh) return;
      const s = Math.min(w / sw, h / sh), dw = sw * s, dh = sh * s;
      try { ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); } catch (e) {}
    }
    function drawTrackOrEl(track, el, x, y, w, h) {
      const f = latest(track);
      if (f) return fit(f, f.displayWidth, f.displayHeight, x, y, w, h);
      if (el && el.videoWidth) fit(el, el.videoWidth, el.videoHeight, x, y, w, h);
    }
    function liveVideo(el) { const s = el && el.srcObject; const t = s && s.getVideoTracks && s.getVideoTracks()[0]; return t && t.readyState === 'live' && t.enabled !== false ? t : null; }
    function draw() {
      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, W, H);
      const by = (H - BH) / 2;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, by, BW, BH);
      const sv = document.getElementById('screenshare-vid');
      const st = sv && sv.style.display !== 'none' ? liveVideo(sv) : null;
      if (st) { ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, by, BW, BH); drawTrackOrEl(st, sv, 0, by, BW, BH); }
      const board = opts.boardCanvas && opts.boardCanvas();
      if (board) { try { ctx.drawImage(board, 0, by, BW, BH); } catch (e) {} }
      // cameras: teacher first, then students
      const els = [...document.querySelectorAll('video')].filter(v => v !== sv && liveVideo(v));
      const seen = new Set(); const cams = [];
      els.forEach(v => { const t = liveVideo(v); if (!seen.has(t.id)) { seen.add(t.id); cams.push({ t, v }); } });
      const n = cams.length; if (!n) return;
      const cols = n <= 4 ? 1 : 2, cw = (W - BW) / cols, ch = Math.min(cw * 3 / 4, H / Math.ceil(n / cols));
      const top = (H - ch * Math.ceil(n / cols)) / 2;
      cams.forEach((c, i) => { const x = BW + (i % cols) * cw, y = top + Math.floor(i / cols) * ch; ctx.fillStyle = '#000'; ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2); drawTrackOrEl(c.t, c.v, x + 1, y + 1, cw - 2, ch - 2); });
    }
    function scanAudio() {
      if (!ac || !dest) return;
      const streams = [...document.querySelectorAll('video,audio')].map(e => e.srcObject).filter(Boolean);
      (opts.extraStreams ? opts.extraStreams() : []).forEach(s => s && streams.push(s));
      streams.forEach(s => (s.getAudioTracks ? s.getAudioTracks() : []).forEach(t => {
        if (audioIds.has(t.id) || t.readyState !== 'live') return;
        audioIds.add(t.id);
        try { ac.createMediaStreamSource(new MediaStream([t])).connect(dest); } catch (e) {}
      }));
    }
    return {
      async start(recId, uploadUrl) {
        const mime = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
        if (!mime) return false;
        const meta = { recId, uploadUrl, sent: 0, createdAt: Date.now(), beat: Date.now() };
        upload = Upload(meta); window.__REC_LIVE = upload;   // before saving, so this page never "resumes" its own live recording
        await putMeta(meta);
        try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume().catch(() => {}); dest = ac.createMediaStreamDestination(); } catch (e) { dest = null; }
        scanAudio(); scanT = setInterval(scanAudio, 3000);
        const vs = out.captureStream(0); const vt = vs.getVideoTracks()[0];
        // A tiny worker keeps the clock ticking even when the teacher is on another tab (normal timers slow down there)
        const wsrc = URL.createObjectURL(new Blob([`setInterval(()=>postMessage(0),${Math.round(1000 / FPS)})`], { type: 'text/javascript' }));
        ticker = new Worker(wsrc);
        ticker.onmessage = () => { draw(); if (vt.requestFrame) vt.requestFrame(); };
        draw();
        const tracks = [vt, ...(dest ? dest.stream.getAudioTracks() : [])];
        rec = new MediaRecorder(new MediaStream(tracks), { mimeType: mime, videoBitsPerSecond: 450000, audioBitsPerSecond: 48000 });
        rec.ondataavailable = e => upload.add(e.data);
        rec.start(5000);
        return true;
      },
      // stop recording and send the rest; onProgress(sent, total)
      async stop(onProgress) {
        if (!rec || stopped) return upload ? upload.finish() : true;
        stopped = true;
        if (ticker) ticker.terminate(); clearInterval(scanT);
        const stoppedP = new Promise(r => { rec.onstop = r; });
        try { rec.stop(); } catch (e) {}
        await Promise.race([stoppedP, sleep(3000)]);
        for (const [, e] of frames) { try { e.reader && e.reader.cancel(); } catch (er) {} if (e.frame) { try { e.frame.close(); } catch (er) {} } }
        upload.onProgress = onProgress;
        if (onProgress) onProgress(upload.sent, upload.end);
        return upload.finish();
      },
      get upload() { return upload; },
    };
  }

  window.PolyRec = { resumePending, LiveRecorder, _Upload: Upload };
})();

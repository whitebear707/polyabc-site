// PolyABC live help: lets the school see which page you're on (while you're on the site) and send you a
// message with a link — e.g. "here's your class". Nothing is stored after you leave. See privacy.html.
(function () {
  if (window.__polyLive) return; window.__polyLive = true;
  const SERVER = 'https://polyabc-server.onrender.com';
  const ls = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  let vid = ls('liveVid');
  if (!vid) { vid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); try { localStorage.setItem('liveVid', vid); } catch (e) {} }
  const token = ls('parentToken') || ls('studentToken') || ls('teacherToken') || '';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let sock = null, box = null, unread = 0;

  function hello() {
    if (!sock || !sock.connected) return;
    sock.emit('live-hello', { vid, page: location.pathname.split('/').pop() + location.hash, title: document.title, token });
  }
  function start() {
    if (!window.io) return;
    sock = window.io(SERVER, { transports: ['websocket', 'polling'], reconnectionDelayMax: 20000 });
    sock.on('connect', hello);
    sock.on('live-msg', showMsg);
    window.addEventListener('hashchange', hello);
  }
  function load() {
    if (window.io) return start();
    const s = document.createElement('script');
    s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js'; s.async = true; s.onload = start;
    document.head.appendChild(s);
  }

  function ui() {
    if (box) return box;
    box = document.createElement('div');
    box.id = 'poly-live';
    box.innerHTML = `
      <div id="pl-head" style="background:#1a73e8;color:#fff;padding:10px 14px;font-weight:900;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
        <span>💬 PolyABC</span><span id="pl-x" style="font-size:1.1rem;padding:0 4px;">✕</span></div>
      <div id="pl-msgs" style="padding:10px;max-height:46vh;overflow:auto;display:flex;flex-direction:column;gap:8px;background:#f5f7fb;"></div>
      <form id="pl-form" style="display:flex;gap:6px;padding:8px;border-top:1px solid #e0e0e0;background:#fff;">
        <input id="pl-in" maxlength="300" placeholder="Escribe aquí… / Type here…" style="flex:1;min-width:0;padding:9px 10px;border:1px solid #ccc;border-radius:10px;font-family:inherit;font-size:.9rem;"/>
        <button style="border:none;background:#1a73e8;color:#fff;border-radius:10px;padding:0 14px;font-weight:900;cursor:pointer;font-family:inherit;">➤</button>
      </form>`;
    box.style.cssText = 'position:fixed;right:16px;bottom:16px;width:min(340px,calc(100vw - 32px));background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);z-index:2147483000;overflow:hidden;font-family:Nunito,Arial,sans-serif;color:#1a1a2e;';
    document.body.appendChild(box);
    box.querySelector('#pl-x').onclick = e => { e.stopPropagation(); box.style.display = 'none'; };
    box.querySelector('#pl-form').onsubmit = e => {
      e.preventDefault();
      const inp = box.querySelector('#pl-in'), t = inp.value.trim(); if (!t) return;
      sock && sock.emit('live-reply', { text: t });
      add(`<div style="align-self:flex-end;background:#1a73e8;color:#fff;border-radius:12px 12px 2px 12px;padding:8px 11px;max-width:85%;font-size:.9rem;">${esc(t)}</div>`);
      inp.value = '';
    };
    return box;
  }
  function add(html) { const m = ui().querySelector('#pl-msgs'); m.insertAdjacentHTML('beforeend', html); m.scrollTop = m.scrollHeight; }
  function showMsg({ text, link, linkLabel } = {}) {
    ui().style.display = 'block';
    let url = '';
    if (link) { try { url = new URL(link, location.origin + '/').href; } catch (e) {} }
    add(`<div style="align-self:flex-start;background:#fff;border:1px solid #e3e8f0;border-radius:12px 12px 12px 2px;padding:9px 11px;max-width:90%;font-size:.92rem;line-height:1.4;">
      ${text ? esc(text).replace(/\n/g, '<br>') : ''}
      ${url ? `<a href="${esc(url)}" style="display:block;margin-top:${text ? 8 : 0}px;background:#2e7d32;color:#fff;text-align:center;padding:10px;border-radius:10px;font-weight:900;text-decoration:none;">${esc(linkLabel || 'Abrir')} →</a>` : ''}</div>`);
    try { navigator.vibrate && navigator.vibrate(120); } catch (e) {}
  }

  if (document.readyState === 'complete') setTimeout(load, 300); else window.addEventListener('load', () => setTimeout(load, 300));
})();

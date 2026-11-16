// PolyABC public-site visit counter. No cookies, no personal data: a random anonymous id, the page,
// how long the page was actually in view, how far it was scrolled, which sections were read and which
// buttons were tapped. Tech Support sees the totals. See privacy.html.
// To leave your own visits out: open polyabc.academy/?notrack once in that browser (?track undoes it).
(function () {
  if (window.__polyTrack) return; window.__polyTrack = true;
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
  if (/[?&]notrack\b/.test(location.search)) ls.set('polyNoTrack', '1');
  if (/[?&]track\b/.test(location.search)) ls.del('polyNoTrack');
  if (ls.get('polyNoTrack') === '1' || navigator.doNotTrack === '1' || navigator.webdriver || /^(localhost|127\.)/.test(location.hostname)) return;

  const URL_ = 'https://polyabc-server.onrender.com/site-track';
  const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  let vid = ls.get('siteVid'); const ret = !!vid; if (!vid) { vid = rid(); ls.set('siteVid', vid); }
  let sid = null; try { sid = sessionStorage.getItem('siteSid'); if (!sid) { sid = rid(); sessionStorage.setItem('siteSid', sid); } } catch (e) { sid = rid(); }
  const pv = rid();
  const path = location.pathname.split('/').pop() || 'index.html';
  const qs = new URLSearchParams(location.search);
  let refHost = ''; try { if (document.referrer) { const h = new URL(document.referrer).hostname; if (h !== location.hostname) refHost = h; } } catch (e) {}
  const w = Math.min(screen.width || innerWidth, innerWidth || 9999);
  const dev = w < 700 ? 'm' : w < 1100 ? 't' : 'd';

  function send(obj) {
    const body = JSON.stringify(Object.assign({ pv }, obj));
    try { if (navigator.sendBeacon && navigator.sendBeacon(URL_, new Blob([body], { type: 'text/plain' }))) return; } catch (e) {}
    try { fetch(URL_, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {}); } catch (e) {}
  }
  send({ t: 'pv', vid, sid, path, ref: refHost, utm: qs.get('utm_source') || qs.get('src') || '', dev, ret });

  // Active time (page visible + the person did something in the last 30 s), per section in view
  let sec = 0, maxScroll = 0, lastAct = Date.now();
  const secs = {}, inView = new Set();
  ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(ev => addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      const id = e.target.getAttribute('data-sec');
      (e.isIntersecting && (e.intersectionRatio >= 0.3 || e.intersectionRect.height >= innerHeight * 0.4)) ? inView.add(id) : inView.delete(id);
    }), { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1] });
    document.querySelectorAll('[data-sec]').forEach(el => io.observe(el));
  }
  const readScroll = () => { const h = document.documentElement.scrollHeight; if (h > 0) maxScroll = Math.max(maxScroll, Math.min(100, Math.round((scrollY + innerHeight) / h * 100))); };
  addEventListener('scroll', readScroll, { passive: true }); readScroll();
  setInterval(() => {
    if (document.hidden || Date.now() - lastAct > 30000) return;
    sec++; inView.forEach(id => { secs[id] = (secs[id] || 0) + 1; });
  }, 1000);
  const flush = () => { if (sec > 0 || maxScroll > 0) send({ t: 'end', sec, scroll: maxScroll, secs }); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  addEventListener('pagehide', flush);
  setInterval(() => { if (!document.hidden) flush(); }, 20000);

  // Taps: anything with data-track, plus the WhatsApp / login / parent links
  const sent = new Set();
  function click(label) { if (!label || sent.has(label)) return; sent.add(label); send({ t: 'click', label }); }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-track],a');
    if (!a) return;
    let l = a.getAttribute('data-track');
    if (!l && a.classList && a.classList.contains('js-wa')) l = 'whatsapp';
    if (!l && a.tagName === 'A') { const h = a.getAttribute('href') || ''; if (/login\.html/.test(h)) l = 'login'; else if (/parent\.html/.test(h)) l = 'parent'; else if (/check\.html/.test(h)) l = 'check'; }
    if (l && !/^faq:/.test(l)) click(l);
  }, true);
  // FAQ questions: counted when opened (not closed)
  document.addEventListener('toggle', e => { const d = e.target; if (d && d.tagName === 'DETAILS' && d.open) click(d.getAttribute('data-track')); }, true);
})();

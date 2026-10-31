// School announcements banner. Usage: <script src="announce.js" data-aud="student|teacher|parent" defer></script>
(function () {
  const me = document.currentScript;
  const aud = me && me.getAttribute('data-aud');
  if (!aud) return;
  const COLORS = { blue: ['#1a73e8', '#fff'], yellow: ['#ffd54f', '#1a1a2e'], red: ['#e53935', '#fff'], green: ['#2e7d32', '#fff'] };
  function hidden() { try { return JSON.parse(localStorage.getItem('annHidden') || '[]'); } catch (e) { return []; } }
  function hide(id) { try { const h = hidden(); h.push(id); localStorage.setItem('annHidden', JSON.stringify(h.slice(-50))); } catch (e) {} }
  async function load() {
    const server = (typeof SERVER_URL !== 'undefined' && SERVER_URL) || 'https://polyabc-server.onrender.com';
    let list = [];
    try { list = await (await fetch(server + '/announcements?aud=' + aud)).json(); } catch (e) { return; }
    if (!Array.isArray(list)) return;
    const skip = hidden();
    list.filter(a => !skip.includes(a.id)).reverse().forEach(a => {
      const [bg, fg] = COLORS[a.color] || COLORS.blue;
      const d = document.createElement('div');
      d.className = 'school-announcement';
      d.style.cssText = `position:relative;z-index:9000;background:${bg};color:${fg};padding:12px 44px 12px 16px;font-family:Nunito,Arial,sans-serif;font-weight:800;font-size:0.95rem;line-height:1.4;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.15);`;
      const t = document.createElement('span'); t.textContent = '📢 ' + a.text; d.appendChild(t);
      const x = document.createElement('button'); x.textContent = '✕'; x.setAttribute('aria-label', 'Close');
      x.style.cssText = `position:absolute;right:8px;top:50%;transform:translateY(-50%);background:transparent;border:none;color:${fg};font-size:1.1rem;font-weight:900;cursor:pointer;padding:6px;`;
      x.onclick = () => { hide(a.id); d.remove(); };
      d.appendChild(x);
      document.body.insertBefore(d, document.body.firstChild);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();

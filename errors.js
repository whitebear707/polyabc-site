// Sends page errors to the server so tech support can see problems nobody reported.
// Max 5 per page load, no duplicates, ignores harmless browser noise.
(function () {
  const seen = new Set(); let sent = 0;
  const IGNORE = /ResizeObserver loop|^Script error\.?$|AbortError|The play\(\) request was interrupted|NotAllowedError: play\(\)|Load failed|Failed to fetch|NetworkError/i;
  function send(message, where) {
    try {
      message = String(message || '').slice(0, 300);
      if (!message || IGNORE.test(message) || seen.has(message) || sent >= 5) return;
      seen.add(message); sent++;
      const server = (typeof SERVER_URL !== 'undefined' && SERVER_URL) || 'https://polyabc-server.onrender.com';
      let tok = '';
      try { tok = localStorage.getItem('adminToken') || localStorage.getItem('studentToken') || localStorage.getItem('parentToken') || localStorage.getItem('techToken') || ''; } catch (e) {}
      const room = new URLSearchParams(location.search).get('room') || '';
      fetch(server + '/client-error', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) },
        body: JSON.stringify({ page: location.pathname.split('/').pop() || 'index.html', message, where: String(where || '').slice(0, 200), room }) }).catch(() => {});
    } catch (e) {}
  }
  window.addEventListener('error', e => { if (e && e.message) send(e.message, (e.filename || '').split('/').pop() + ':' + (e.lineno || '')); });
  window.addEventListener('unhandledrejection', e => { const r = e && e.reason; send(r && (r.message || r.name) ? (r.name ? r.name + ': ' : '') + (r.message || '') : String(r), 'promise'); });
  window.reportPageError = send;
})();

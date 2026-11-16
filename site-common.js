// Shared bits for the public pages: year in the footer, and the school's current WhatsApp number
// (admin can change it without a redeploy; the links already have a working number as fallback).
(function () {
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
  (async () => {
    try {
      const res = await fetch('https://polyabc-server.onrender.com/school-info/public', { signal: AbortSignal.timeout(6000) });
      if (!res.ok) return;
      const { whatsapp } = await res.json();
      if (!whatsapp || !/^\d{10,15}$/.test(whatsapp)) return;
      const msg = encodeURIComponent('Hola, me interesa inscribir a un alumno en PolyABC y necesito un código de registro.');
      document.querySelectorAll('.js-wa').forEach(a => { a.href = `https://wa.me/${whatsapp}?text=${msg}`; });
    } catch (e) {}
  })();
})();

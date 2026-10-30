// PolyABC certificates: draws name, level, date, ID and a real QR check onto the school's template
// (kids or adult) in the browser, and saves it as a print-ready A4 PDF. Needs qrcode-generator and jsPDF.
(function () {
  const BASE = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/cert\.js(\?.*)?$/, '') : 'cert/';
  const VERIFY_URL = 'https://polyabc.academy/verify.html?id=';
  const NAVY = '#14213d', GOLD = '#c9962b';
  // positions measured on the 3508 × 2480 templates
  const LAYOUT = {
    kids:  { nameY: 1240, levelY: 1716, bottomY: 2093, dateX: 755, idX: 2738, qr: { cx: 2738, cy: 1872 }, drawLabels: true, drawFrame: true },
    adult: { nameY: 1245, levelY: 1716, bottomY: 2122, dateX: 890, idX: 2800, qr: { cx: 2803, cy: 1872, cover: [2690, 1761, 226, 223] }, drawLabels: false, drawFrame: false },
  };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const fmtDate = iso => { const [y, m, d] = String(iso).split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };
  const imgCache = {};
  function loadImg(src) {
    if (!imgCache[src]) imgCache[src] = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    return imgCache[src];
  }
  async function fontsReady() {
    try { await Promise.all(['700 200px "Playfair Display"', '600 80px "Playfair Display"', '700 200px "Libre Baskerville"', '400 70px "Libre Baskerville"', '600 70px "Montserrat"', '500 40px "Montserrat"'].map(f => document.fonts.load(f))); } catch (e) {}
  }
  function spaced(ctx, px) { try { ctx.letterSpacing = px + 'px'; } catch (e) {} }

  async function render(cert) {
    const L = LAYOUT[cert.template === 'adult' ? 'adult' : 'kids'];
    const [img] = await Promise.all([loadImg(BASE + (cert.template === 'adult' ? 'adult.jpg' : 'kids.jpg')), fontsReady()]);
    const c = document.createElement('canvas'); c.width = 3508; c.height = 2480;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, 3508, 2480);
    x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillStyle = NAVY;
    // name: as big as fits on the line
    let size = 210; x.font = `700 ${size}px "Playfair Display", Georgia, serif`;
    while (x.measureText(cert.name).width > 1950 && size > 90) { size -= 6; x.font = `700 ${size}px "Playfair Display", Georgia, serif`; }
    x.fillText(cert.name, 1754, L.nameY);
    // level inside the laurels (Baskerville: full-height numbers, so "B1" doesn't get a small "1")
    let ls = 240; x.font = `700 ${ls}px "Libre Baskerville", Georgia, serif`;
    while (x.measureText(cert.level).width > 560 && ls > 90) { ls -= 10; x.font = `700 ${ls}px "Libre Baskerville", Georgia, serif`; }
    x.fillText(cert.level, 1754, L.levelY);
    // date and ID above the bottom lines
    x.font = '400 66px "Libre Baskerville", Georgia, serif';
    x.fillText(fmtDate(cert.date), L.dateX, L.bottomY - 42);
    x.font = '600 66px "Montserrat", Arial, sans-serif'; spaced(x, 6);
    x.fillText('ID ' + cert.id, L.idX, L.bottomY - 42);
    if (L.drawLabels) {
      x.font = '500 40px "Montserrat", Arial, sans-serif'; spaced(x, 8);
      x.fillText('DATE OF COMPLETION', L.dateX, L.bottomY + 92);
      x.fillText('CERTIFICATE ID', L.idX, L.bottomY + 92);
    }
    spaced(x, 0);
    // QR that opens the check page
    const q = qrcode(0, 'M'); q.addData(VERIFY_URL + cert.id); q.make();
    const n = q.getModuleCount(), box = 200, cell = box / n, qx = L.qr.cx - box / 2, qy = L.qr.cy - box / 2;
    if (L.qr.cover) { x.fillStyle = '#fdfcf8'; x.fillRect(...L.qr.cover); }
    if (L.drawFrame) { x.fillStyle = '#fdfcf8'; x.fillRect(qx - 18, qy - 18, box + 36, box + 36); x.strokeStyle = GOLD; x.lineWidth = 6; x.strokeRect(qx - 18, qy - 18, box + 36, box + 36); }
    x.fillStyle = '#111';
    for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (q.isDark(r, col)) x.fillRect(Math.floor(qx + col * cell), Math.floor(qy + r * cell), Math.ceil(cell), Math.ceil(cell));
    return c;
  }
  async function downloadPdf(cert) {
    const c = await render(cert);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210);
    const safe = String(cert.name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    pdf.save(`Certificado_${safe}_${cert.level}.pdf`);
  }
  window.PolyCert = { render, downloadPdf, fmtDate };
})();

// "Informe Mensual de Progreso del Estudiante" — the school's monthly report template.
// PolyReport.html(review) builds it; PolyReport.show(review) opens it full screen with Print / Close.
(function () {
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const PROGRESS = [
    ['independent', 'Lo hizo de manera independiente.'],
    ['model', 'Lo logró con un modelo o ejemplo.'],
    ['verbal', 'Lo logró con indicaciones verbales.'],
    ['starting', 'Está comenzando a aplicar la habilidad.'],
    ['practice', 'Necesita seguir practicando.'],
  ];
  const SUPPORTS = [
    ['visual', 'Apoyos visuales o modelo.'],
    ['repetition', 'Repetición.'],
    ['guiding', 'Preguntas guía.'],
    ['vocab', 'Vocabulario o banco de palabras.'],
    ['steps', 'Instrucciones paso a paso.'],
    ['time', 'Tiempo adicional para pensar.'],
    ['other', 'Otro:'],
  ];
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  function monthLabel(r) {
    if (r.requested && r.periodFrom && r.periodTo) return `${fmt(r.periodFrom)} – ${fmt(r.periodTo)}`;
    const m = r.month || (r.periodFrom || '').slice(0, 7);
    if (!/^\d{4}-\d{2}/.test(m)) return '';
    return `${cap(MESES[Number(m.slice(5, 7)) - 1])} ${m.slice(0, 4)}`;
  }
  function fmt(iso) { if (!iso) return ''; const [y, mo, d] = String(iso).slice(0, 10).split('-'); return `${Number(d)} ${MESES[Number(mo) - 1].slice(0, 3)} ${y}`; }
  function dateLabel(r) {
    const d = r.submittedAt ? new Date(r.submittedAt) : null;
    return d ? d.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  }
  const CSS = `
  .prr { --ink:#1b2a4a; font-family:Nunito,'Segoe UI',Arial,sans-serif; color:var(--ink); background:#fff; max-width:780px; margin:0 auto; padding:22px 22px 18px; border-radius:18px; box-sizing:border-box; }
  .prr * { box-sizing:border-box; }
  .prr-top { display:flex; align-items:center; gap:16px; margin-bottom:12px; }
  .prr-top img { height:54px; }
  .prr-top .bar { width:2px; align-self:stretch; background:#c9d3e6; }
  .prr-top h1 { margin:0; font-size:1.45rem; line-height:1.15; font-weight:900; color:#1b2a6b; }
  .prr-top .star { margin-left:auto; font-size:2.2rem; }
  .prr-head { display:grid; grid-template-columns:1.4fr .7fr 1.3fr 1.1fr 1fr .9fr; border:1.5px solid #c9d3e6; border-radius:12px; overflow:hidden; margin-bottom:14px; }
  .prr-head div { border-right:1.5px solid #c9d3e6; padding:6px 8px; text-align:center; }
  .prr-head div:last-child { border-right:none; }
  .prr-head b { display:block; font-size:.78rem; font-weight:900; }
  .prr-head span { display:block; background:#eef3fb; border-radius:6px; margin-top:4px; padding:4px 4px; font-size:.82rem; font-weight:800; min-height:1.6em; word-break:break-word; }
  .prr-sec { border-radius:16px; border:2px solid; margin-bottom:12px; overflow:hidden; break-inside:avoid; page-break-inside:avoid; }
  .prr-sec > h2 { margin:0; padding:7px 14px; font-size:1.05rem; font-weight:900; display:flex; align-items:center; gap:8px; }
  .prr-body { background:#fff; margin:0 6px 6px; border-radius:12px; padding:10px 12px; font-size:.86rem; }
  .prr-cols { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .prr-box { border-radius:10px; overflow:hidden; border:1.5px solid; }
  .prr-box b { display:block; padding:5px 10px; font-size:.82rem; font-weight:900; }
  .prr-box p { margin:0; padding:8px 10px; min-height:3.2em; white-space:pre-wrap; font-size:.85rem; line-height:1.4; background:#fff; }
  .prr-chk { display:flex; gap:7px; align-items:flex-start; margin:3px 0; line-height:1.3; }
  .prr-chk i { font-style:normal; width:15px; height:15px; border:1.6px solid #333; border-radius:3px; flex:0 0 15px; margin-top:2px; display:inline-flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:900; }
  .prr-chk.on { font-weight:900; } .prr-chk.on i { background:var(--c); border-color:var(--c); color:#fff; }
  .prr ul { margin:4px 0 0; padding-left:20px; } .prr li { margin:2px 0; }
  .s1 { border-color:#9ec5f2; background:#d8e9fb; --c:#1a73e8; } .s1 > h2 { color:#16357a; }
  .s2 { border-color:#a9dcb5; background:#dcf2e1; --c:#2e7d32; } .s2 .prr-box { border-color:#a9dcb5; } .s2 .prr-box b { background:#dcf2e1; }
  .s3 { border-color:#c9b6ea; background:#ebe2f8; --c:#6a1b9a; } .s3 .prr-box { border-color:#c9b6ea; } .s3 .prr-box b { background:#ebe2f8; }
  .s4 { border-color:#f1d77f; background:#fbefc4; --c:#e6a100; } .s4 .prr-box { border-color:#f1d77f; } .s4 .prr-box b { background:#fbefc4; }
  .s5 { border-color:#f2b0bd; background:#fbdde3; --c:#c2185b; } .s5 .prr-box { border-color:#f2b0bd; }
  .prr-foot { text-align:center; font-weight:900; font-style:italic; color:#1b2a6b; font-size:1.05rem; margin-top:8px; }
  .prr-legacy { font-size:.86rem; }
  @media (max-width:560px) { .prr { padding:14px 10px; } .prr-head { grid-template-columns:1fr 1fr 1fr; } .prr-head div:nth-child(3) { border-right:none; } .prr-head div:nth-child(-n+3) { border-bottom:1.5px solid #c9d3e6; } .prr-cols { grid-template-columns:1fr; } .prr-top h1 { font-size:1.1rem; } .prr-top img { height:40px; } }
  #prr-overlay { position:fixed; inset:0; z-index:100000; background:rgba(15,23,42,.75); overflow-y:auto; padding:12px 8px 40px; }
  #prr-overlay .prr-actions { max-width:780px; margin:0 auto 10px; display:flex; gap:8px; justify-content:flex-end; }
  #prr-overlay .prr-actions button { font-family:inherit; font-weight:900; border:none; border-radius:10px; padding:10px 16px; cursor:pointer; font-size:.95rem; }
  @media print {
    @page { size:letter portrait; margin:10mm; }
    body.prr-printing > *:not(#prr-overlay) { display:none !important; }
    body.prr-printing #prr-overlay { position:static; background:none; padding:0; overflow:visible; }
    body.prr-printing .prr-actions { display:none !important; }
    body.prr-printing .prr { max-width:none; padding:0; border-radius:0; }
    html, body.prr-printing { background:#fff !important; }
    .prr { -webkit-print-color-adjust:exact; print-color-adjust:exact; zoom:.8; }
    .prr-sec { margin-bottom:9px; }
  }`;
  function ensureCss() {
    if (document.getElementById('prr-css')) return;
    const st = document.createElement('style'); st.id = 'prr-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  const box = (title, text) => `<div class="prr-box"><b>${title}</b><p>${esc(text)}</p></div>`;
  const checks = (list, sel, other) => list.map(([k, label]) => `<div class="prr-chk ${sel.includes(k) ? 'on' : ''}"><i>${sel.includes(k) ? '✓' : ''}</i><span>${label}${k === 'other' ? ` <u>${esc(other || '')}${other ? '' : '&nbsp;'.repeat(28)}</u>` : ''}</span></div>`).join('');
  function html(r) {
    const R = r.report || {};
    const head = `<div class="prr-top"><img src="LOGO.png" alt="PolyABC" onerror="this.style.display='none'"><div class="bar"></div><h1>Informe Mensual<br>de Progreso del Estudiante</h1><div class="star">⭐</div></div>
      <div class="prr-head">
        <div><b>Alumno</b><span>${esc(r.studentName)}</span></div>
        <div><b>Nivel</b><span>${esc(R.level || '')}</span></div>
        <div><b>Curso</b><span>${esc(R.course || '')}</span></div>
        <div><b>Docente</b><span>${esc(r.teacherName || '')}</span></div>
        <div><b>${r.requested ? 'Periodo' : 'Mes'}</b><span>${esc(monthLabel(r))}</span></div>
        <div><b>Fecha</b><span>${esc(dateLabel(r))}</span></div>
      </div>`;
    if (!r.report) {
      // older reports (scores + comment) keep their original content
      const LBL = { attendance: 'Asistencia y Puntualidad', participation: 'Participación y Esfuerzo', speaking: 'Expresión Oral y Pronunciación', listening: 'Comprensión Auditiva', reading: 'Lectura', grammar: 'Gramática', vocabulary: 'Vocabulario' };
      return `<div class="prr">${head}<div class="prr-sec s1"><h2>📋 Evaluación</h2><div class="prr-body prr-legacy">
        ${Object.keys(LBL).filter(k => r.scores && r.scores[k] != null).map(k => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #eef;padding:4px 0;"><span>${LBL[k]}</span><b>${r.scores[k]}/5</b></div>`).join('')}
        <p style="white-space:pre-wrap;line-height:1.5;margin:10px 0 0;">${esc(r.comment || '')}</p></div></div>
        <div class="prr-foot">¡Gracias por su apoyo continuo!</div></div>`;
    }
    return `<div class="prr">${head}
      <div class="prr-sec s1"><h2>🎯 1. Enfoque de aprendizaje</h2><div class="prr-body"><b>¿Qué trabajamos este mes?</b><ul>${(R.focus || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul></div></div>
      <div class="prr-sec s2"><h2>📊 2. Avances observados</h2><div class="prr-body prr-cols"><div>${checks(PROGRESS, R.progress || [])}</div>${box('Un ejemplo que observé…', R.example)}</div></div>
      <div class="prr-sec s3"><h2>🧩 3. Apoyos que ayudaron o que aún necesita</h2><div class="prr-body prr-cols"><div>${checks(SUPPORTS, R.supports || [], R.supportOther)}</div>${box('Detalles', R.supportDetails)}</div></div>
      <div class="prr-sec s4"><h2>🚩 4. Siguiente paso</h2><div class="prr-body prr-cols">${box('El siguiente paso será…', R.nextStep)}${box('Meta breve', R.goal)}</div></div>
      <div class="prr-sec s5"><h2>❤️ 5. Nota para la familia</h2><div class="prr-body">${box('Reconocimiento o esfuerzo:', R.familyNote)}</div></div>
      <div class="prr-foot">✨ ¡Gracias por su apoyo continuo! ✨</div>
    </div>`;
  }
  function show(r) {
    ensureCss();
    const old = document.getElementById('prr-overlay'); if (old) old.remove();
    const ov = document.createElement('div'); ov.id = 'prr-overlay';
    ov.innerHTML = `<div class="prr-actions"><button id="prr-print" style="background:#1a73e8;color:#fff;">🖨 Imprimir / Guardar PDF</button><button id="prr-close" style="background:#fff;color:#1a1a2e;">✕ Cerrar</button></div>${html(r)}`;
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';
    const close = () => { ov.remove(); document.body.style.overflow = ''; document.body.classList.remove('prr-printing'); };
    ov.querySelector('#prr-close').onclick = close;
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.querySelector('#prr-print').onclick = () => {
      document.body.classList.add('prr-printing');
      const done = () => { document.body.classList.remove('prr-printing'); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      const prevTitle = document.title;
      document.title = `Informe ${r.studentName} ${monthLabel(r)}`;
      window.print();
      document.title = prevTitle;
    };
  }
  window.PolyReport = { html: r => { ensureCss(); return html(r); }, show, monthLabel, PROGRESS, SUPPORTS };
})();

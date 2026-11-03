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
  const PROFESSIONS = [["medico","Médico"],["medica","Médica"],["enfermero","Enfermero"],["enfermera","Enfermera"],["chofer","Chofer de camión"],["chofera","Chofera de camión"],["taxista_h","Taxista"],["taxista_m","Taxista"],["electricista_h","Electricista"],["electricista_m","Electricista"],["ingeniero","Ingeniero"],["ingeniera","Ingeniera"],["albanil","Albañil"],["albanila","Albañila"],["mecanico","Mecánico"],["mecanica","Mecánica"],["cocinero","Cocinero"],["cocinera","Cocinera"],["profesor","Profesor"],["profesora","Profesora"],["policia_h","Policía"],["policia_m","Policía"],["bombero","Bombero"],["bombera","Bombera"],["contador","Contador"],["contadora","Contadora"],["abogado","Abogado"],["abogada","Abogada"],["arquitecto","Arquitecto"],["arquitecta","Arquitecta"],["tecnico","Técnico en computación"],["tecnica","Técnica en computación"],["agricultor","Agricultor"],["agricultora","Agricultora"],["comerciante_h","Comerciante"],["comerciante_m","Comerciante"],["repartidor","Repartidor"],["repartidora","Repartidora"],["guardia_h","Guardia de seguridad"],["guardia_m","Guardia de seguridad"]];
  const ADULT_ATT = [['attendance', 'Asistencia'], ['punctuality', 'Puntualidad'], ['participation', 'Participación en clase'], ['homework', 'Cumplimiento de tareas'], ['practice', 'Práctica fuera de clase']];
  const ADULT_AREAS = [['listening', 'Comprensión oral'], ['speaking', 'Expresión oral'], ['pronunciation', 'Pronunciación'], ['vocabulary', 'Vocabulario'], ['grammar', 'Gramática'], ['reading', 'Lectura'], ['writing', 'Escritura'], ['confidence', 'Confianza al comunicarse']];
  const RATINGS = [['exc', 'Excelente'], ['good', 'Bien'], ['prog', 'En progreso'], ['help', 'Necesita apoyo']];
  const ICON_BASE = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/report\.js(\?.*)?$/, '') + 'report-icons/' : 'report-icons/';
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
  .pra { position:relative; overflow:hidden; padding:26px 26px 34px; }
  .pra::before { content:''; position:absolute; top:-40px; right:-30px; width:420px; height:70px; background:linear-gradient(100deg,#e53935 0 40%,#1e88e5 40% 70%,transparent 70%); transform:rotate(6deg); opacity:.95; }
  .pra::after { content:''; position:absolute; bottom:0; left:0; right:0; height:14px; background:linear-gradient(90deg,#1e88e5 0 25%,#e53935 25% 50%,#fdd835 50% 75%,#43a047 75%); }
  .pra-top { display:flex; gap:16px; align-items:flex-start; position:relative; z-index:1; }
  .pra-left { flex:1; min-width:0; }
  .pra-logo { display:inline-block; border:2.5px solid #1a1a2e; border-radius:12px; padding:6px 14px; background:#fff; }
  .pra-logo img { height:44px; display:block; }
  .pra h1 { margin:10px 0 4px; font-size:1.75rem; font-weight:900; color:#1a1a2e; line-height:1.1; }
  .pra-rule { display:grid; grid-template-columns:repeat(4,1fr); gap:4px; height:5px; margin-bottom:8px; }
  .pra-rule i:nth-child(1){background:#1e88e5} .pra-rule i:nth-child(2){background:#e53935} .pra-rule i:nth-child(3){background:#fdd835} .pra-rule i:nth-child(4){background:#43a047}
  .pra-info { display:flex; flex-wrap:wrap; gap:4px 14px; font-size:.82rem; color:#333; }
  .pra-info b { color:#1a1a2e; }
  .pra-prof { width:190px; flex:0 0 190px; border:3px solid #1e88e5; border-radius:16px; background:#eef4fd; padding:10px; text-align:center; }
  .pra-prof .pic { width:118px; height:118px; border-radius:50%; margin:0 auto 8px; overflow:hidden; border:3px solid #1e5aa8; background:#dfe8f6; display:flex; align-items:center; justify-content:center; font-size:3.4rem; }
  .pra-prof .pic img { width:100%; height:100%; object-fit:cover; }
  .pra-prof .pill { background:#c9d8ef; border-radius:20px; padding:5px 8px; font-weight:900; font-size:.82rem; color:#1a2e5a; }
  .pra-sec { position:relative; z-index:1; border:2.5px solid var(--c); border-radius:14px; margin-top:12px; overflow:hidden; break-inside:avoid; page-break-inside:avoid; background:#fff; }
  .pra-sec > h2 { margin:0; background:var(--c); color:#fff; font-size:1.05rem; font-weight:900; padding:6px 14px; display:flex; gap:8px; align-items:center; }
  .pra-sec.y > h2 { color:#fff; text-shadow:0 1px 1px rgba(0,0,0,.25); }
  .pra-tbl { width:100%; border-collapse:collapse; font-size:.8rem; }
  .pra-tbl td, .pra-tbl th { padding:4px 6px; border-bottom:1px solid #e3e8f1; }
  .pra-tbl td:first-child { font-weight:900; background:#eef3fb; white-space:nowrap; }
  .pra-tbl th { background:#fde3e3; font-weight:900; }
  .pra-tbl .c { text-align:center; }
  .pra-opt { display:inline-flex; gap:4px; align-items:center; margin-right:10px; white-space:nowrap; }
  .pra-box { width:13px; height:13px; border:1.6px solid #333; border-radius:3px; display:inline-flex; align-items:center; justify-content:center; font-size:.7rem; font-weight:900; }
  .pra-box.on { background:var(--c); border-color:var(--c); color:#fff; }
  .pra-opt.on { font-weight:900; }
  .pra-list { margin:0; padding:8px 14px 8px 30px; font-size:.86rem; } .pra-list li { margin:3px 0; border-bottom:1px solid #d8dee9; padding-bottom:2px; }
  .pra-two { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .pra-two .pra-sec { margin-top:12px; }
  .pra-note { padding:8px 14px; font-size:.88rem; white-space:pre-wrap; line-height:1.45; }
  .pra-foot { display:flex; justify-content:space-between; gap:20px; margin-top:18px; margin-bottom:10px; position:relative; z-index:1; font-weight:900; font-size:.95rem; align-items:flex-end; }
  .pra-foot .sig { font-family:'Brush Script MT','Segoe Script','Lucida Handwriting',cursive; font-weight:400; font-size:1.5rem; border-bottom:1.5px solid #1a1a2e; min-width:200px; display:inline-block; padding:0 6px; }
  .pra-foot .dt { border-bottom:1.5px solid #1a1a2e; min-width:130px; display:inline-block; padding:0 6px; font-weight:700; }
  @media (max-width:600px) { .pra { padding:16px 10px 46px; } .pra-top { flex-direction:column-reverse; align-items:stretch; } .pra-prof { width:auto; flex:none; display:flex; align-items:center; gap:10px; } .pra-prof .pic { width:64px; height:64px; margin:0; font-size:2rem; } .pra h1 { font-size:1.25rem; } .pra-two { grid-template-columns:1fr; } .pra-tbl { font-size:.72rem; } .pra-opt { margin-right:6px; } .pra-foot { flex-direction:column; align-items:flex-start; } }
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
  function adultHtml(r) {
    const R = r.report || {};
    const prof = R.profession || {};
    const profLabel = prof.label || (PROFESSIONS.find(p => p[0] === prof.icon) || [])[1] || 'Profesión / ocupación';
    const pic = prof.icon ? `<img src="${ICON_BASE}${esc(prof.icon)}.jpg" alt="">` : '💼';
    const opt = (sel, k, l) => `<span class="pra-opt ${sel === k ? 'on' : ''}"><span class="pra-box ${sel === k ? 'on' : ''}">${sel === k ? '✓' : ''}</span>${l}</span>`;
    const lst = (a, n) => { const x = (a || []).slice(); while (x.length < n) x.push(''); return `<ul class="pra-list">${x.map(i => `<li>${esc(i) || '&nbsp;'}</li>`).join('')}</ul>`; };
    return `<div class="prr pra">
      <div class="pra-top">
        <div class="pra-left">
          <div class="pra-logo"><img src="LOGO.png" alt="PolyABC" onerror="this.outerHTML='<b style=&quot;font-size:1.6rem&quot;>PolyABC</b>'"></div>
          <h1>Reporte de progreso del estudiante</h1>
          <div class="pra-rule"><i></i><i></i><i></i><i></i></div>
          <div class="pra-info"><span>Alumno: <b>${esc(r.studentName)}</b></span><span>Nivel: <b>${esc(R.level || '')}</b></span>${R.course ? `<span>Curso: <b>${esc(R.course)}</b></span>` : ''}<span>${r.requested ? 'Periodo' : 'Mes'}: <b>${esc(monthLabel(r))}</b></span></div>
        </div>
        <div class="pra-prof"><div class="pic">${pic}</div><div class="pill">${esc(profLabel)}</div></div>
      </div>
      <div class="pra-sec" style="--c:#1e88e5;"><h2>👥 Asistencia y participación</h2>
        <table class="pra-tbl">${ADULT_ATT.map(([k, l]) => `<tr><td>${l}</td><td>${RATINGS.map(([rk, rl]) => opt((R.att || {})[k], rk, rl)).join('')}</td></tr>`).join('')}</table></div>
      <div class="pra-sec" style="--c:#e53935;"><h2>📊 Áreas evaluadas</h2>
        <table class="pra-tbl"><tr><th></th>${RATINGS.map(([, rl]) => `<th class="c">${rl}</th>`).join('')}</tr>
        ${ADULT_AREAS.map(([k, l]) => `<tr><td>${l}</td>${RATINGS.map(([rk]) => `<td class="c"><span class="pra-box ${(R.areas || {})[k] === rk ? 'on' : ''}">${(R.areas || {})[k] === rk ? '✓' : ''}</span></td>`).join('')}</tr>`).join('')}</table></div>
      <div class="pra-sec y" style="--c:#f2b400;"><h2>📖 Temas y habilidades trabajadas</h2>${lst(R.topics, 3)}</div>
      <div class="pra-two">
        <div class="pra-sec" style="--c:#2e9d4a;"><h2>👍 Fortalezas observadas</h2>${lst(R.strengths, 3)}</div>
        <div class="pra-sec" style="--c:#1e88e5;"><h2>🎯 Aspectos por reforzar</h2>${lst(R.improve, 3)}</div>
      </div>
      <div class="pra-sec" style="--c:#e53935;"><h2>🚩 Próximo paso / Meta del siguiente mes</h2>${lst(R.next, 2)}</div>
      <div class="pra-sec" style="--c:#2e9d4a;"><h2>💬 Comentario para la familia</h2><div class="pra-note">${esc(R.familyNote || '')}</div></div>
      <div class="pra-foot"><span>✏️ Firma del docente: <span class="sig">${esc(r.teacherName || '')}</span></span><span>📅 Fecha: <span class="dt">${esc(dateLabel(r))}</span></span></div>
    </div>`;
  }
  function html(r) {
    if (r.report && r.report.type === 'adult') return adultHtml(r);
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
  window.PolyReport = { html: r => { ensureCss(); return html(r); }, show, monthLabel, PROGRESS, SUPPORTS, PROFESSIONS, ADULT_ATT, ADULT_AREAS, RATINGS, ICON_BASE };
})();

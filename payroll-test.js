// PolyABC payroll matrix test — run from admin.html console
(async () => {
  const ROOM='8001', RATE=200, DATE='2026-08-20', DUR=40;
  const H={'Content-Type':'application/json',Authorization:`Bearer ${currentToken}`};
  // minute-offset helper so each case gets its own slot
  const iso=(slot,plus=0)=>new Date(Date.UTC(2026,7,20,6,slot*45+plus)).toISOString();
  const hhmm=slot=>{const t=slot*45;return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;};

  await fetch(`${SERVER_URL}/rooms/${ROOM}`,{method:'DELETE',headers:H}).catch(()=>{});
  const mk=await(await fetch(`${SERVER_URL}/rooms`,{method:'POST',headers:H,body:JSON.stringify({
    room:ROOM,teacherName:'PayrollTest',teacherPassword:'ptest8001',hourlyRate:RATE})})).json();
  if(!mk.success){console.error('❌ Could not create test room:',mk.message||mk);return;}

  // [enrolled, absent] — every combination you listed
  const combos=[];
  for(let enrolled=2; enrolled<=6; enrolled++)
    for(let absent=0; absent<=enrolled-2; absent++)
      combos.push([enrolled,absent]);

  const cases = combos.map(([e,a],i)=>({
    label:`${e} enrolled, ${a} absent`, showed:e-a, enrolled:e, absent:a,
    classType:'Group 40 min', dur:DUR, slot:i
  }));
  // reference rows
  cases.push({label:'1v1 40min (1 student)',showed:1,enrolled:1,absent:0,classType:'1v1 40 min',dur:DUR,slot:cases.length});
  cases.push({label:'Trial (1 student)',showed:1,enrolled:1,absent:0,classType:'Trial',dur:15,slot:cases.length+1});

  for(const c of cases){
    const a=await(await fetch(`${SERVER_URL}/assignments`,{method:'POST',headers:H,body:JSON.stringify({
      room:ROOM,date:DATE,time:hhmm(c.slot),level:'A1',classType:c.classType,groupName:c.label})})).json();
    if(!a.success){console.error('❌ assignment failed for',c.label,a);continue;}

    // absent students are present in the roster but never joined (no joinedAt)
    const students=[
      ...Array.from({length:c.showed},(_,i)=>({name:`P${i+1}`,joinedAt:iso(c.slot,1),leftAt:iso(c.slot,c.dur)})),
      ...Array.from({length:c.absent},(_,i)=>({name:`A${i+1}`,joinedAt:null,leftAt:null}))
    ];

    const att=await(await fetch(`${SERVER_URL}/admin/manual-attendance`,{method:'POST',headers:H,body:JSON.stringify({
      room:ROOM,date:DATE,scheduledTime:hhmm(c.slot),classType:c.classType,
      teacherOpenedAt:iso(c.slot,0), classStartedAt:iso(c.slot,0), classEndedAt:iso(c.slot,c.dur),
      endType:'completed', students })})).json();
    if(!att.success){console.error('❌ attendance failed for',c.label,att);}
  }

  const pay=await(await fetch(`${SERVER_URL}/payroll?from=${DATE}&to=${DATE}&room=${ROOM}`,{headers:H})).json();
  if(!pay[0]){console.error('❌ Payroll returned no data for room',ROOM,'— raw:',pay);return;}
  const got=(pay[0]?.classes)||[];
  const base=m=>(RATE/60)*m;
  const bonusFor=n=>Math.min(Math.max(0,n-2)*20,60);

  let fails=0; const rows=[];
  for(const c of cases){
    let exp;
    if(c.classType==='Trial')            exp=base(15);
    else if(c.classType.includes('1v1')) exp=c.showed===0?base(15):base(c.dur);
    else                                 exp=c.showed===0?base(15):base(c.dur)+bonusFor(c.showed);

    const r=got.find(x=>x.groupName===c.label);
    const actual=r?r.classPay:null;
    const ok=actual!==null&&Math.abs(actual-exp)<0.02;
    if(!ok)fails++;
    rows.push({Class:c.label,Showed:c.showed,Bonus:c.classType.includes('Group')?bonusFor(c.showed):0,
               Expected:Math.round(exp*100)/100,Actual:actual,Pass:ok?'✅':'❌'});
  }
  console.log('%c PAYROLL MATRIX ','background:#1a73e8;color:white;font-weight:bold');
  console.table(rows);
  console.log(`Server total: $${pay[0]?.totalPay}`);
  console.log(fails===0?'%c ALL PASSED ':`%c ${fails} MISMATCH(ES) `,
    `background:${fails===0?'#2e7d32':'#c62828'};color:white;font-weight:bold`);
})()

// Mide los minutos de GitHub Actions por workflow a partir de runs-14d.ndjson (gh api .../actions/runs).
// Uso: node medir-minutos.cjs runs-14d.ndjson 2026-10-01 2026-10-14
const fs=require('fs');
const [,, arch, desde, hasta] = process.argv;
const runs=fs.readFileSync(arch,'utf8').split('\n').filter(Boolean).map(JSON.parse);
const d0=new Date(desde+'T00:00:00Z'), d1=new Date(hasta+'T23:59:59Z');
const sel=runs.filter(r=>{const t=new Date(r.createdAt);return t>=d0&&t<=d1;});
const dias=(d1-d0+1000)/86400000;
const por={};
for(const r of sel){
  const a=new Date(r.startedAt||r.createdAt), b=new Date(r.updatedAt);
  const s=Math.max(0,(b-a)/1000);
  const w=(r.workflowName||'').split(' · ')[0].trim()||'(sin nombre)';
  por[w]=por[w]||{n:0,seg:0,fact:0,fail:0,canc:0,skip:0,ev:{}};
  const p=por[w];
  p.n++; p.seg+=s; p.fact+=r.conclusion==='skipped'?0:Math.max(1,Math.ceil(s/60));
  if(r.conclusion==='failure')p.fail++; if(r.conclusion==='cancelled')p.canc++; if(r.conclusion==='skipped')p.skip++;
  p.ev[r.event]=(p.ev[r.event]||0)+1;
}
console.log(`Ventana ${desde}..${hasta} = ${dias} dias, ${sel.length} corridas`);
console.log('| Workflow | corridas | por dia | min reales | min facturables | min/mes (30d) | USD/mes si privado | falla | cancel | omitidas | disparo |');
let T={n:0,seg:0,fact:0};
for(const [w,v] of Object.entries(por).sort((a,b)=>b[1].fact-a[1].fact)){
  T.n+=v.n;T.seg+=v.seg;T.fact+=v.fact;
  const mes=v.fact/dias*30;
  console.log(`| ${w} | ${v.n} | ${(v.n/dias).toFixed(1)} | ${(v.seg/60).toFixed(0)} | ${v.fact} | ${mes.toFixed(0)} | ${(mes*0.008).toFixed(0)} | ${v.fail} | ${v.canc} | ${v.skip} | ${Object.entries(v.ev).map(e=>e.join(':')).join(' ')} |`);
}
const mesR=T.seg/60/dias*30, mesF=T.fact/dias*30;
console.log(`| TOTAL | ${T.n} | ${(T.n/dias).toFixed(0)} | ${(T.seg/60).toFixed(0)} | ${T.fact} | ${mesF.toFixed(0)} | ${(mesF*0.008).toFixed(0)} | | | | |`);
console.log(`Proyeccion 30 dias: reales ${mesR.toFixed(0)} min (USD ${(mesR*0.008).toFixed(0)}); facturables con redondeo por corrida ${mesF.toFixed(0)} min (USD ${(mesF*0.008).toFixed(0)})`);
// --- distribucion de duraciones de los workflows grandes
const dur={};
for(const r of sel){const w=(r.workflowName||'').split(' · ')[0].trim();const s=(new Date(r.updatedAt)-new Date(r.startedAt||r.createdAt))/1000;(dur[w]=dur[w]||[]).push(s);}
console.log('\nDuracion (segundos): workflow | n | media | p50 | p95 | max');
for(const w of ['Actualizar la web','Cloudflare Pages','Redes','Vigilancia','Auditoría IA','Pistas','Armado con datos vacíos','Panel']){
  const a=(dur[w]||[]).sort((x,y)=>x-y); if(!a.length)continue;
  const q=p=>a[Math.min(a.length-1,Math.floor(a.length*p))];
  console.log(`${w} | ${a.length} | ${(a.reduce((x,y)=>x+y,0)/a.length).toFixed(0)} | ${q(.5)} | ${q(.95)} | ${a[a.length-1]}`);
}

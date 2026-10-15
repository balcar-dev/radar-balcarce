const fs=require('fs');
const runs=fs.readFileSync('runs-14d.ndjson','utf8').split('\n').filter(Boolean).map(JSON.parse)
 .filter(r=>{const t=new Date(r.createdAt);return t>=new Date('2026-10-01T00:00:00Z')&&t<=new Date('2026-10-14T23:59:59Z')});
const d=r=>(new Date(r.updatedAt)-new Date(r.startedAt||r.createdAt))/1000;
const redes=runs.filter(r=>r.workflowName==='Redes');
const largas=redes.filter(r=>d(r)>=60), cortas=redes.filter(r=>d(r)<60);
console.log('Redes: cortas(<60s)',cortas.length,'min reales',(cortas.reduce((a,r)=>a+d(r),0)/60).toFixed(0),'min facturables',cortas.reduce((a,r)=>a+Math.max(1,Math.ceil(d(r)/60)),0));
console.log('Redes: largas(>=60s)',largas.length,'min reales',(largas.reduce((a,r)=>a+d(r),0)/60).toFixed(0),'min facturables',largas.reduce((a,r)=>a+Math.max(1,Math.ceil(d(r)/60)),0));
const rel=redes.filter(r=>r.event==='workflow_dispatch'), wr=redes.filter(r=>r.event==='workflow_run');
console.log('Redes por reloj (dispatch)',rel.length,'min fact',rel.reduce((a,r)=>a+Math.max(1,Math.ceil(d(r)/60)),0),' / tras actualizar (workflow_run)',wr.length,'min fact',wr.reduce((a,r)=>a+Math.max(1,Math.ceil(d(r)/60)),0));
// fallas de Actualizar por dia
const f={};for(const r of runs.filter(r=>r.workflowName==='Actualizar la web'&&r.conclusion==='failure')){const k=r.createdAt.slice(0,10);f[k]=(f[k]||0)+1}
console.log('Fallas Actualizar por dia',JSON.stringify(f));
const n={};for(const r of runs.filter(r=>r.workflowName==='Actualizar la web')){const k=r.createdAt.slice(0,10);n[k]=(n[k]||0)+1}
console.log('Corridas Actualizar por dia',JSON.stringify(n));
// Pages: minutos con ahorro si se evitara el segundo build
const pg=runs.filter(r=>r.workflowName==='Cloudflare Pages'&&r.conclusion==='success');
console.log('Pages exitosas',pg.length,'media s',(pg.reduce((a,r)=>a+d(r),0)/pg.length).toFixed(0));
// separacion de actualizar: exitosas medias
const ac=runs.filter(r=>r.workflowName==='Actualizar la web'&&r.conclusion==='success');
console.log('Actualizar exitosas',ac.length,'media s',(ac.reduce((a,r)=>a+d(r),0)/ac.length).toFixed(0));
// intervalo entre corridas de actualizar (huecos > 60 min)
const ts=runs.filter(r=>r.workflowName==='Actualizar la web').map(r=>+new Date(r.createdAt)).sort((a,b)=>a-b);
let huecos=0,maxh=0;for(let i=1;i<ts.length;i++){const m=(ts[i]-ts[i-1])/60000;if(m>60)huecos++;maxh=Math.max(maxh,m)}
console.log('huecos >60min entre corridas de Actualizar',huecos,'max hueco min',maxh.toFixed(0));

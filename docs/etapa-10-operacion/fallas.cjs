const {execSync}=require('child_process');const fs=require('fs');
const runs=fs.readFileSync('runs-14d.ndjson','utf8').split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.workflowName==='Actualizar la web'&&r.conclusion==='failure');
const porDia={};for(const r of runs){const k=r.createdAt.slice(0,10);(porDia[k]=porDia[k]||[]).push(r.id)}
const cuenta={};
for(const [d,ids] of Object.entries(porDia)){
  const muestra=ids.slice(0,3);
  for(const id of muestra){
    try{const j=JSON.parse(execSync(`gh run view ${id} -R radarbalcarce/radar-balcarce --json jobs`,{encoding:'utf8'}));
      const paso=j.jobs.flatMap(x=>x.steps).find(s=>s.conclusion==='failure');
      const k=d+' | '+(paso?paso.name:'?');cuenta[k]=(cuenta[k]||0)+1;}catch(e){}
  }
  console.log(d,'fallas',ids.length,'(muestra de',muestra.length,')');
}
console.log(cuenta);

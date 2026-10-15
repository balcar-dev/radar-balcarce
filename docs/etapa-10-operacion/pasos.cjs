const {execSync}=require('child_process');const fs=require('fs');
const wf=process.argv[2];
const ids=JSON.parse(fs.readFileSync('ids-'+wf+'.json','utf8')).filter(r=>r.conclusion==='success').slice(0,5);
const acc={};
for(const r of ids){
  const j=JSON.parse(execSync(`gh run view ${r.databaseId} -R radarbalcarce/radar-balcarce --json jobs`,{encoding:'utf8'}));
  for(const job of j.jobs)for(const s of job.steps){
    const d=(new Date(s.completedAt)-new Date(s.startedAt))/1000;
    (acc[s.name]=acc[s.name]||[]).push(d);
  }
}
console.log(wf,'sobre',ids.length,'corridas exitosas (segundos por paso, promedio)');
for(const [k,v] of Object.entries(acc)){const m=v.reduce((a,b)=>a+b,0)/v.length; if(m>=1)console.log(' ',k,'|',m.toFixed(0));}

// Mide cuánto tarda cada archivo de pruebas por separado (6 a la vez). Solo lee; no escribe en el repo.
const {spawn}=require('child_process');const fs=require('fs');const path=require('path');
const raiz=path.resolve(__dirname,'../..');
const files=fs.readdirSync(path.join(raiz,'pruebas')).filter(f=>f.endsWith('.test.mjs'));
const res=[];let i=0;
function uno(){
  if(i>=files.length)return Promise.resolve();
  const f=files[i++];const t0=Date.now();
  return new Promise(ok=>{
    const p=spawn(process.execPath,['--import','./pruebas/datos-fijos.mjs','--test','pruebas/'+f],{cwd:raiz});
    let out='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>out+=d);
    p.on('close',c=>{const n=+(out.match(/ℹ tests (\d+)/)||[])[1]||0;const fl=+(out.match(/ℹ fail (\d+)/)||[])[1]||0;
      res.push({f,seg:(Date.now()-t0)/1000,n,fallan:fl});ok(uno());});
  });
}
Promise.all([uno(),uno(),uno(),uno(),uno(),uno()]).then(()=>{
  res.sort((a,b)=>b.seg-a.seg);
  fs.writeFileSync(path.join(__dirname,'pruebas-tiempos.csv'),'archivo,segundos,pruebas,fallan\n'+res.map(r=>[r.f,r.seg.toFixed(1),r.n,r.fallan].join(',')).join('\n')+'\n');
  console.log('listo',res.length);
});

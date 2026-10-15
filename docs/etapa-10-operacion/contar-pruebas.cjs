const fs=require('fs'),path=require('path');
const dir='../../pruebas';
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.test.mjs'));
const out=[];
for(const f of files){
  const t=fs.readFileSync(path.join(dir,f),'utf8');
  const n=(t.match(/^\s*(test|it)\(/gm)||[]).length;
  const imps=[...t.matchAll(/from\s+['"](\.\.\/[^'"]+)['"]/g)].map(m=>m[1].replace(/^\.\.\//,'').replace(/\.m?js$/,''));
  const dirs=[...new Set(imps.map(i=>i.split('/')[0]+(i.startsWith('web/')?'/'+i.split('/')[1]:'')))];
  const usaRed=/fetch\(|globalThis\.fetch/.test(t);
  const usaFs=/readFileSync|\.workflows|web\/data/.test(t);
  out.push({f,n,l:t.split('\n').length,dirs:dirs.join(','),fs:usaFs?'fs':''});
}
out.sort((a,b)=>b.n-a.n);
console.log('archivos',out.length,'pruebas',out.reduce((a,x)=>a+x.n,0));
for(const x of out)console.log([x.n,x.l,x.f,x.dirs,x.fs].join(' | '));

const fs = require('fs');
const d = process.argv[2];
const b = JSON.parse(fs.readFileSync(`${d}/banco-fotos.json`, 'utf8'));
const a = JSON.parse(fs.readFileSync(`${d}/archivo.json`, 'utf8')).notas;
const man = JSON.parse(fs.readFileSync(`${d}/fotos-manuales.json`, 'utf8'));
const cnt = (arr, f) => { const m = {}; for (const x of arr) { const k = f(x); m[k] = (m[k] || 0) + 1; } return Object.entries(m).sort((x, y) => y[1] - x[1]); };
const deMedios = a.filter((n) => !n.propia);
const conFoto = deMedios.filter((n) => n.foto);
console.log('notas', a.length, 'de medios', deMedios.length, 'con foto', conFoto.length, (100 * conFoto.length / deMedios.length).toFixed(1) + '%');
console.log('propias con foto', a.filter((n) => n.propia && n.foto).length, 'de', a.filter((n) => n.propia).length);
console.log('por seccion (con foto / total):');
const secs = {};
for (const n of deMedios) { const s = secs[n.seccion] ??= [0, 0]; s[1]++; if (n.foto) s[0]++; }
for (const [s, [c, t]] of Object.entries(secs).sort((x, y) => y[1][1] - x[1][1])) console.log('  ', s, c, '/', t, (100 * c / t).toFixed(0) + '%');
// por semana de publicación
const semana = (iso) => { const t = new Date(iso); const d0 = new Date(Date.UTC(2026, 8, 14)); return 'sem ' + Math.floor((t - d0) / (7 * 864e5)); };
console.log('por semana', JSON.stringify(cnt(deMedios, (n) => semana(n.publicadaCuando || n.fecha) + (n.foto ? ' con' : ' sin')).sort()));
// origen de la foto
console.log('origen en banco (de las que tienen archivo):', cnt(Object.values(b).filter((v) => v.archivo && !v.borrada), (v) => v.origen));
console.log('borradas', Object.values(b).filter((v) => v.borrada).length);
// sin foto: por qué (razon en banco)
const sin = deMedios.filter((n) => !n.foto);
const raz = cnt(sin, (n) => {
  const v = b[n.id];
  if (!v) return 'nunca se probó (no está en el banco)';
  if (v.borrada) return 'borrada a mano o por regla';
  if (v.error) return 'error: ' + v.error.slice(0, 50);
  const r = String(v.razon ?? '').toLowerCase();
  if (/marca/.test(r)) return 'todas con marca de agua';
  if (/menor/.test(r)) return 'menor en la foto';
  if (/policial/.test(r)) return 'policiales sin fuente oficial';
  if (/no se pudo bajar|ninguna/.test(r)) return 'no se pudo bajar ninguna / ninguna sirve';
  return 'otro: ' + r.slice(0, 70);
});
console.log('SIN FOTO, por qué:'); for (const x of raz) console.log('  ', x[1], x[0]);
// fotos repetidas por archivo o imagenOriginal
const porOriginal = {};
for (const n of conFoto) { const v = b[n.id]; const k = v?.imagenOriginal || n.foto.archivo; (porOriginal[k] ??= []).push(n.id); }
const rep = Object.entries(porOriginal).filter(([, l]) => l.length > 1);
console.log('misma imagen original en varias notas:', rep.length, 'grupos,', rep.reduce((s, [, l]) => s + l.length, 0), 'notas');
console.log('creditos top', cnt(conFoto, (n) => n.foto.credito).slice(0, 12));
console.log('fotos manuales', Object.keys(man).length, JSON.stringify(man).slice(0, 300));

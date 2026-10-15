const fs = require('fs');
const e = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const dia = (iso) => new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10);
const cats = ['menores', 'acusacion', 'muerte_heridos', 'violencia_victima', 'internacional', 'promocion', 'verificacion_baja', 'medio_de_aca_sin_nombrar', 'hospital_investigacion_(hasta_28-09)', 'otros'];
const de = (c) => {
  if (c.startsWith('menores')) return 'menores';
  if (c.startsWith('acusación')) return 'acusacion';
  if (c.startsWith('muerte')) return 'muerte_heridos';
  if (c.startsWith('violencia')) return 'violencia_victima';
  if (c === 'internacional') return 'internacional';
  if (c === 'promoción') return 'promocion';
  if (c.startsWith('verificación')) return 'verificacion_baja';
  if (/medio de acá/.test(c)) return 'medio_de_aca_sin_nombrar';
  if (/hospital|investigación/.test(c)) return 'hospital_investigacion_(hasta_28-09)';
  return 'otros';
};
const filas = {}; const oct = {}; let octTotal = 0;
for (const [c, l] of Object.entries(e)) for (const x of l) {
  const d = dia(x.primera); const k = de(c);
  (filas[d] ??= {})[k] = ((filas[d] ??= {})[k] || 0) + 1;
  if (d >= '2026-10-01') { oct[k] = (oct[k] || 0) + 1; octTotal++; }
}
const lineas = ['dia,' + cats.join(',') + ',total'];
for (const d of Object.keys(filas).sort()) { const f = filas[d]; const t = cats.reduce((s, c) => s + (f[c] || 0), 0); lineas.push([d, ...cats.map((c) => f[c] || 0), t].join(',')); }
fs.writeFileSync(process.argv[3], lineas.join('\r\n') + '\r\n');
console.log('octubre total', octTotal, 'por dia', (octTotal / 15).toFixed(1), JSON.stringify(Object.fromEntries(Object.entries(oct).map(([k, v]) => [k, `${v} (${(v / 15).toFixed(1)}/día)`]))));

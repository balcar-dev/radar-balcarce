const fs = require('fs');
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const arr = Array.isArray(j.medidas) ? j.medidas : Object.values(j.medidas);
const vista = (m = {}) => m.views ?? m.plays ?? m.ig_reels_aggregated_all_plays_count ?? m.total_video_views ?? m.post_impressions_unique ?? m.post_media_view ?? m.reach ?? m.impressions ?? null;
const keys = {}; for (const x of arr) for (const k of Object.keys(x.metricas ?? {})) keys[k] = (keys[k] || 0) + 1;
console.log('metricas', keys);
const grupos = {};
let inutil = 0;
for (const x of arr) {
  const v = vista(x.metricas);
  const k = `${x.red} ${x.parte} ${String(x.pieza).replace(/-\d.*$/, '')}`;
  const g = grupos[k] ??= { n: 0, vals: [], ceros: 0 };
  g.n++;
  if (v == null || v === 0) { g.ceros++; inutil++; } else g.vals.push(v);
}
const med = (a) => { if (!a.length) return '-'; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
console.log('medidas', arr.length, 'vacías o 0', inutil);
for (const [k, g] of Object.entries(grupos).sort((a, b) => b[1].n - a[1].n)) console.log(k.padEnd(45), 'n', g.n, 'con dato', g.vals.length, 'mediana', med(g.vals), 'max', g.vals.length ? Math.max(...g.vals) : '-');
// top
const top = arr.map((x) => ({ x, v: vista(x.metricas) ?? 0 })).sort((a, b) => b.v - a.v).slice(0, 12);
for (const t of top) console.log('TOP', t.v, t.x.red, t.x.parte, t.x.pieza, t.x.dia, JSON.stringify(t.x.metricas).slice(0, 160));
// por día cuántas piezas
const dias = {}; for (const x of arr) { dias[x.dia] = (dias[x.dia] || 0) + 1; }
console.log(JSON.stringify(dias));

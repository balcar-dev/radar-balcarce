// Agrupa las notas con pares ya confirmados por Mercury, SIN encadenar: cada grupo tiene una nota ancla y sólo entran las
// notas que Mercury confirmó directamente contra esa ancla (agrupación "en estrella"). Evita que A~B y B~C junten todo el tema.
//   node pruebas-modelos/agrupar-estrella.mjs [--minimo=0.5]   (no usa la clave: lee confirmadas.json)
// Escribe historias-estrella.md y historias-estrella.json y deja una muestra para revisar a mano.

import fs from 'node:fs';
import path from 'node:path';

const AQUI = import.meta.dirname;
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = 'true'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const MINIMO = Number(args.minimo ?? 0.5);
const pool = JSON.parse(fs.readFileSync(path.join(AQUI, 'pool.json'), 'utf8'));
const porId = new Map(pool.map((n) => [n.id, n]));
const confirmadas = JSON.parse(fs.readFileSync(path.join(AQUI, 'confirmadas.json'), 'utf8'));

const vecinos = new Map();
for (const [a, b, s, p] of confirmadas) {
  if (p == null || p <= MINIMO) continue;
  (vecinos.get(a) ?? vecinos.set(a, new Map()).get(a)).set(b, p);
  (vecinos.get(b) ?? vecinos.set(b, new Map()).get(b)).set(a, p);
}
// Las notas con más confirmaciones directas son anclas primero. Una nota ancla se lleva sólo a sus vecinas directas libres.
const orden = [...vecinos.keys()].sort((x, y) => vecinos.get(y).size - vecinos.get(x).size);
const asignada = new Set();
const grupos = [];
for (const ancla of orden) {
  if (asignada.has(ancla)) continue;
  const miembros = [ancla, ...[...vecinos.get(ancla)].filter(([id]) => !asignada.has(id)).sort((x, y) => y[1] - x[1]).map(([id]) => id)];
  miembros.forEach((id) => asignada.add(id));
  grupos.push(miembros);
}
const sueltas = pool.filter((n) => !asignada.has(n.id)).length;
const grandes = [...grupos].sort((a, b) => b.length - a.length);
const historias = grupos.length + sueltas;

const L = ['# Historias con agrupación en estrella (sin encadenar)\n'];
L.push(`- Notas: **${pool.length}**. Grupos de 2 o más notas: **${grupos.length}** (${asignada.size} notas). Notas sin par confirmado: **${sueltas}**.`);
L.push(`- Quedan **${historias} historias distintas** en vez de ${pool.length} notas (${Math.round((100 * (pool.length - historias)) / pool.length)}% menos).`);
L.push(`- El grupo más grande tiene ${grandes[0].length} notas; los 10 mayores: ${grandes.slice(0, 10).map((g) => g.length).join(', ')}.`);
L.push(`- Grupos de 2 notas: ${grupos.filter((g) => g.length === 2).length} · de 3 a 5: ${grupos.filter((g) => g.length >= 3 && g.length <= 5).length} · de 6 a 10: ${grupos.filter((g) => g.length >= 6 && g.length <= 10).length} · de más de 10: ${grupos.filter((g) => g.length > 10).length}.\n`);
L.push('## Los 25 grupos más grandes\n');
for (const g of grandes.slice(0, 25)) {
  L.push(`**${g.length} notas — ancla:** ${porId.get(g[0]).medio}: ${porId.get(g[0]).titulo.slice(0, 90)}`);
  for (const id of g.slice(1, 6)) L.push(`- ${porId.get(id).medio}: ${porId.get(id).titulo.slice(0, 90)}`);
  if (g.length > 6) L.push(`- … y ${g.length - 6} más`);
  L.push('');
}
fs.writeFileSync(path.join(AQUI, 'historias-estrella.md'), `${L.join('\n')}\n`);
fs.writeFileSync(path.join(AQUI, 'historias-estrella.json'), JSON.stringify(grupos.map((g) => g.map((id) => ({ id, medio: porId.get(id).medio, titulo: porId.get(id).titulo })))));
console.log(L.slice(0, 6).join('\n'));

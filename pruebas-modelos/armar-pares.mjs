// Busca en muestra-200.json pares de notas que podrían contar el mismo hecho (por palabras en común)
// y los guarda en candidatos-pares.json para etiquetarlos a mano (mismo hecho / no).
//   node pruebas-modelos/armar-pares.mjs [--minimo=0.2] [--max=80]
// En producción esto lo haría un buscador de parecidos (embeddings) y el modelo sólo confirmaría.

import fs from 'node:fs';
import path from 'node:path';

const AQUI = import.meta.dirname;
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = 'true'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const MINIMO = Number(args.minimo ?? 0.2);
const MAX = Number(args.max ?? 80);

const notas = JSON.parse(fs.readFileSync(path.join(AQUI, 'muestra-200.json'), 'utf8')).notas;
const PARADAS = new Set('para como esta este esto sobre entre desde hasta tras ante cuando donde porque pero sino otra otro otros otras todo todos toda todas mas muy sus los las del una uno que con por sin fue sera dijo'.split(' '));
const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const palabras = (s) => new Set(sinTildes(s.toLowerCase()).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !PARADAS.has(w)));
const conjuntos = notas.map((n) => ({ n, t: palabras(n.titulo), r: palabras(`${n.titulo} ${n.resumen}`.slice(0, 300)) }));
const jaccard = (a, b) => { let c = 0; for (const x of a) if (b.has(x)) c += 1; return c / (a.size + b.size - c || 1); };

const pares = [];
for (let i = 0; i < conjuntos.length; i += 1) {
  for (let j = i + 1; j < conjuntos.length; j += 1) {
    const s = Math.max(jaccard(conjuntos[i].t, conjuntos[j].t), jaccard(conjuntos[i].r, conjuntos[j].r) * 0.9);
    if (s >= MINIMO) pares.push({ a: notas[i].id, b: notas[j].id, similitud: Number(s.toFixed(2)) });
  }
}
pares.sort((x, y) => y.similitud - x.similitud);
const elegidos = pares.slice(0, MAX);
const t = new Map(notas.map((n, i) => [n.id, { i, ...n }]));
fs.writeFileSync(path.join(AQUI, 'candidatos-pares.json'), `${JSON.stringify(elegidos, null, 1)}\n`);
console.log(`${pares.length} pares con similitud >= ${MINIMO}; guardo los ${elegidos.length} más parecidos`);
elegidos.forEach((p, k) => {
  const A = t.get(p.a); const B = t.get(p.b);
  console.log(`${String(k).padStart(2)} ${p.similitud} | #${A.i} ${A.medio.slice(0, 14)}: ${A.titulo.slice(0, 80)}\n         | #${B.i} ${B.medio.slice(0, 14)}: ${B.titulo.slice(0, 80)}`);
});

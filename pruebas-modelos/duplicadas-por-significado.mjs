// Busca notas que cuentan lo mismo POR SIGNIFICADO (embeddings baai/bge-m3) entre todas las notas que traen los feeds
// más las 200 de la muestra, agrupa, y deja pares para que Mercury confirme y para revisar a mano.
//   node pruebas-modelos/duplicadas-por-significado.mjs
// Sólo lee los feeds. Clave: OPENROUTER_API_KEY (nunca se imprime). Escribe pool.json, duplicadas-significado.json y .md.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { traer, parsearFeed } from '../ingesta/ingesta.mjs';
import { FUENTES, FUENTES_NACIONALES } from '../ingesta/fuentes.mjs';
import { FUENTES_CRUCE } from '../ingesta/fuentes-cruce.mjs';

const AQUI = import.meta.dirname;
const CLAVE = process.env.OPENROUTER_API_KEY;
if (!CLAVE) { console.error('Falta OPENROUTER_API_KEY. Frené.'); process.exit(1); }
const idDe = (url) => createHash('sha1').update(url).digest('hex').slice(0, 8);
const limpiar = (s = '') => String(s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const HORAS = 72;

// ---- 1. las notas: todo lo que traen los feeds hoy + la muestra de 200
const fuentes = [...FUENTES, ...FUENTES_NACIONALES, ...FUENTES_CRUCE].filter((f) => f.activa !== false && ['rss', 'atom'].includes(f.tipo));
const notas = new Map();
console.log(`Leyendo ${fuentes.length} feeds…`);
async function una(f) {
  try {
    for (const n of parsearFeed(await traer(f.url, { timeout: 15000 }), { ...f, peso: f.peso ?? 10 })) {
      if (!n.titulo || !n.enlace) continue;
      if ((Date.now() - new Date(n.fecha).getTime()) / 3600000 > HORAS) continue;
      if (!notas.has(n.enlace)) notas.set(n.enlace, { id: idDe(n.enlace), medio: f.medio, alcance: f.alcance ?? 'pais', titulo: limpiar(n.titulo), resumen: limpiar(n.cuerpo ?? n.resumen ?? '').slice(0, 500), enlace: n.enlace });
    }
  } catch { /* un feed caído no frena nada */ }
}
const cola = [...fuentes];
await Promise.all(Array.from({ length: 8 }, async () => { while (cola.length) await una(cola.shift()); }));
for (const n of JSON.parse(fs.readFileSync(path.join(AQUI, 'muestra-200.json'), 'utf8')).notas) {
  if (!notas.has(n.enlace)) notas.set(n.enlace, { id: n.id, medio: n.medio, alcance: n.alcance, titulo: n.titulo, resumen: limpiar(n.resumen).slice(0, 500), enlace: n.enlace });
}
const lista = [...notas.values()];
console.log(`${lista.length} notas distintas.`);
fs.writeFileSync(path.join(AQUI, 'pool.json'), JSON.stringify(lista));

// ---- 2. embeddings
const MODELO = 'baai/bge-m3';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function embeber(textos) {
  for (let intento = 0; intento < 4; intento += 1) {
    const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${CLAVE}` },
      body: JSON.stringify({ model: MODELO, input: textos }), signal: AbortSignal.timeout(120_000),
    }).catch(() => null);
    if (res?.ok) { const j = await res.json(); return { vectores: j.data.sort((a, b) => a.index - b.index).map((d) => d.embedding), tokens: j.usage?.prompt_tokens ?? 0 }; }
    await espera(3000 * (intento + 1));
  }
  throw new Error('no se pudieron pedir los embeddings');
}
const textoDe = (n) => `${n.titulo}. ${n.resumen.slice(0, 280)}`;
const DIM = 1024;
const M = new Float32Array(lista.length * DIM);
let tokens = 0;
const LOTE = 64;
for (let i = 0; i < lista.length; i += LOTE) {
  const { vectores, tokens: t } = await embeber(lista.slice(i, i + LOTE).map(textoDe));
  tokens += t;
  vectores.forEach((v, j) => {
    let norma = 0; for (const x of v) norma += x * x; norma = Math.sqrt(norma) || 1;
    for (let k = 0; k < DIM; k += 1) M[(i + j) * DIM + k] = v[k] / norma;
  });
  if ((i / LOTE) % 20 === 0) console.log(`embeddings ${Math.min(i + LOTE, lista.length)}/${lista.length}`);
}
console.log(`Embeddings listos (${tokens} tokens, ~US$ ${(tokens * 0.01 / 1e6).toFixed(3)}).`);

// ---- 3. todos contra todos: pares con parecido alto
const BANDAS = [[0.95, 1.01], [0.90, 0.95], [0.85, 0.90], [0.80, 0.85], [0.75, 0.80], [0.70, 0.75]];
const conteo = BANDAS.map(() => 0);
const pares = [];
const N = lista.length;
for (let i = 0; i < N; i += 1) {
  const a = i * DIM;
  for (let j = i + 1; j < N; j += 1) {
    const b = j * DIM;
    let s = 0;
    for (let k = 0; k < DIM; k += 1) s += M[a + k] * M[b + k];
    if (s < 0.70) continue;
    const bi = BANDAS.findIndex(([lo, hi]) => s >= lo && s < hi);
    conteo[bi] += 1;
    if (s >= 0.75) pares.push([i, j, Number(s.toFixed(4))]);
  }
}
console.log('pares por banda de parecido:', BANDAS.map(([lo], k) => `${lo}+: ${conteo[k]}`).join(' · '));

// Todos los pares candidatos (parecido 0,75 o más), para que Mercury los confirme (confirmar-pares-significado.mjs).
fs.writeFileSync(path.join(AQUI, 'pares-candidatos.json'), JSON.stringify(pares.map(([i, j, s]) => [lista[i].id, lista[j].id, s])));

// ---- 4. cómo separa los pares ya etiquetados a mano (62: 21 del mismo hecho, 41 distintos)
const idx = new Map(lista.map((n, i) => [n.id, i]));
const coseno = (i, j) => { let s = 0; for (let k = 0; k < DIM; k += 1) s += M[i * DIM + k] * M[j * DIM + k]; return s; };
const etiquetados = JSON.parse(fs.readFileSync(path.join(AQUI, 'pares-200.json'), 'utf8')).pares
  .map((p) => ({ ...p, s: idx.has(p.a) && idx.has(p.b) ? coseno(idx.get(p.a), idx.get(p.b)) : null })).filter((p) => p.s != null);
const mismos = etiquetados.filter((p) => p.mismo).map((p) => p.s).sort((x, y) => x - y);
const distintos = etiquetados.filter((p) => !p.mismo).map((p) => p.s).sort((x, y) => y - x);

// ---- 5. grupos con un umbral alto (parecido >= 0.85)
const padre = Array.from({ length: N }, (_, i) => i);
const raiz = (x) => { while (padre[x] !== x) { padre[x] = padre[padre[x]]; x = padre[x]; } return x; };
for (const [i, j, s] of pares) if (s >= 0.85) padre[raiz(i)] = raiz(j);
const grupos = new Map();
for (let i = 0; i < N; i += 1) { const r = raiz(i); (grupos.get(r) ?? grupos.set(r, []).get(r)).push(i); }
const multiples = [...grupos.values()].filter((g) => g.length > 1).sort((a, b) => b.length - a.length);
const notasEnGrupos = multiples.reduce((s, g) => s + g.length, 0);

// ---- 6. pares para revisar: una muestra por banda
const azar = (arr, k) => { const c = [...arr]; for (let i = c.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c.slice(0, k); };
const muestraPares = BANDAS.slice(0, 5).flatMap(([lo, hi]) => azar(pares.filter(([, , s]) => s >= lo && s < hi), 25).map(([i, j, s]) => ({
  a: lista[i].id, b: lista[j].id, s, ta: lista[i].titulo, tb: lista[j].titulo, ma: lista[i].medio, mb: lista[j].medio,
})));
fs.writeFileSync(path.join(AQUI, 'duplicadas-significado.json'), JSON.stringify({ conteo, muestraPares, grupos: multiples.slice(0, 60).map((g) => g.map((i) => ({ id: lista[i].id, medio: lista[i].medio, titulo: lista[i].titulo }))) }));

const L = ['# Duplicadas por significado (embeddings bge-m3)\n'];
L.push(`- Notas: **${N}** (todo lo que traen los feeds en las últimas ${HORAS} horas, más la muestra). Costo de los embeddings: ~US$ ${(tokens * 0.01 / 1e6).toFixed(3)}.`);
L.push(`- Pares de notas con parecido alto, por banda: ${BANDAS.map(([lo], k) => `${lo}+ → ${conteo[k]}`).join(' · ')}.`);
L.push(`- Agrupando todo lo que se parece 0,85 o más: **${multiples.length} grupos** de 2 o más notas, con **${notasEnGrupos} notas**. Quedarían ${N - notasEnGrupos + multiples.length} historias distintas en vez de ${N} notas.`);
L.push(`- Tamaño de los grupos más grandes: ${multiples.slice(0, 10).map((g) => g.length).join(', ')} notas.\n`);
L.push('## Qué tan bien separa el parecido a los 62 pares ya etiquetados\n');
L.push(`- Del mismo hecho (${mismos.length}): parecido entre ${mismos[0]?.toFixed(2)} y ${mismos.at(-1)?.toFixed(2)}; mediana ${mismos[Math.floor(mismos.length / 2)]?.toFixed(2)}.`);
L.push(`- Hechos distintos (${distintos.length}): el más parecido llega a ${distintos[0]?.toFixed(2)}; mediana ${distintos[Math.floor(distintos.length / 2)]?.toFixed(2)}.`);
for (const t of [0.70, 0.75, 0.80, 0.85, 0.90]) L.push(`- Umbral ${t.toFixed(2)}: encuentra ${mismos.filter((x) => x >= t).length} de ${mismos.length} duplicadas y trae ${distintos.filter((x) => x >= t).length} de ${distintos.length} pares que no lo son.`);
L.push('\n## Los 15 grupos más grandes\n');
for (const g of multiples.slice(0, 15)) { L.push(`**${g.length} notas**`); for (const i of g.slice(0, 6)) L.push(`- ${lista[i].medio}: ${lista[i].titulo.slice(0, 90)}`); L.push(''); }
fs.writeFileSync(path.join(AQUI, 'duplicadas-significado.md'), `${L.join('\n')}\n`);
console.log(L.slice(0, 12).join('\n'));

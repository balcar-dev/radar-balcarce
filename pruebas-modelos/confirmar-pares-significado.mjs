// Mercury confirma, de a 12 pares por pedido, si cada par candidato (parecido por significado >= 0,75) cuenta EL MISMO HECHO.
// Con los pares confirmados arma las historias (una nota por hecho) y las compara con agrupar sólo por parecido.
//   node pruebas-modelos/confirmar-pares-significado.mjs [--modelo=inception/mercury-decide] [--umbral=0.75]
// Guarda confirmadas.json y duplicadas-confirmadas.md. Clave: OPENROUTER_API_KEY (nunca se imprime).

import fs from 'node:fs';
import path from 'node:path';

const AQUI = import.meta.dirname;
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = 'true'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const MODELO = args.modelo ?? 'inception/mercury-decide';
const UMBRAL = Number(args.umbral ?? 0.75);
const LOTE = 12;
const CLAVE = process.env.OPENROUTER_API_KEY;
if (!CLAVE) { console.error('Falta OPENROUTER_API_KEY. Frené.'); process.exit(1); }

const pool = JSON.parse(fs.readFileSync(path.join(AQUI, 'pool.json'), 'utf8'));
const porId = new Map(pool.map((n) => [n.id, n]));
const candidatos = JSON.parse(fs.readFileSync(path.join(AQUI, 'pares-candidatos.json'), 'utf8')).filter(([, , s]) => s >= UMBRAL);
console.log(`${candidatos.length} pares candidatos (parecido ${UMBRAL} o más) en ${Math.ceil(candidatos.length / LOTE)} pedidos.`);

// La definición decidida: mismo suceso, mismo día y mismo protagonista; un anuncio y su resultado son dos notas.
const REGLA = 'Dos notas cuentan EXACTAMENTE el mismo hecho si son el mismo suceso, del mismo día y con el mismo protagonista, aunque estén escritas con otras palabras o con distinto detalle. NO es el mismo hecho: dos noticias distintas sobre el mismo tema (la clasificación y la carrera, la previa de un partido y su resultado, un anuncio y su resultado, una suspensión y la nueva fecha, el pronóstico de hoy y el de otro día), un seguimiento con novedad, un análisis u opinión sobre un hecho, o si cambia la persona, el lugar, la fecha o la cifra principal. Ante la duda, no es el mismo hecho.';
const texto = (n) => ({ titulo: n.titulo, texto: `${n.resumen}`.slice(0, 260), medio: n.medio });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedir(grupo) {
  const questions = {};
  grupo.forEach((_, i) => { questions[`p${i + 1}`] = { type: 'noul', instructions: `¿Las dos notas del par ${i + 1} cuentan exactamente el mismo hecho?`, criteria: { false: 'Hechos distintos.', true: 'El mismo hecho.' } }; });
  const cuerpo = JSON.stringify({ model: MODELO, state: { regla: REGLA, pares: grupo.map(([a, b], i) => ({ numero: i + 1, a: texto(porId.get(a)), b: texto(porId.get(b)) })) }, questions });
  for (let intento = 0; intento < 3; intento += 1) {
    const res = await fetch('https://openrouter.ai/api/alpha/decisions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${CLAVE}` }, body: cuerpo, signal: AbortSignal.timeout(90_000) }).catch(() => null);
    if (res?.ok) { const j = await res.json(); return { respuestas: grupo.map((_, i) => j.answers?.[`p${i + 1}`]?.noul ?? null), costo: j.usage?.cost ?? 0 }; }
    await espera(4000 * (intento + 1));
  }
  return { respuestas: grupo.map(() => null), costo: 0 };
}

const confirmadas = [];
let costo = 0; let sinRespuesta = 0;
for (let i = 0; i < candidatos.length; i += LOTE) {
  const grupo = candidatos.slice(i, i + LOTE);
  const { respuestas, costo: c } = await pedir(grupo.map(([a, b]) => [a, b]));
  costo += c;
  grupo.forEach(([a, b, s], k) => { if (respuestas[k] == null) sinRespuesta += 1; confirmadas.push([a, b, s, respuestas[k]]); });
  if ((i / LOTE) % 40 === 0) console.log(`${Math.min(i + LOTE, candidatos.length)}/${candidatos.length}`);
}
fs.writeFileSync(path.join(AQUI, 'confirmadas.json'), JSON.stringify(confirmadas));
console.log(`Mercury contestó ${candidatos.length - sinRespuesta} de ${candidatos.length}. Costo: US$ ${costo.toFixed(4)}.`);

// ---- historias: se unen sólo los pares que Mercury confirmó (probabilidad > 0,5)
const sies = confirmadas.filter(([, , , p]) => p != null && p > 0.5);
const unir = (pares) => {
  const padre = new Map(pool.map((n) => [n.id, n.id]));
  const raiz = (x) => { while (padre.get(x) !== x) { padre.set(x, padre.get(padre.get(x))); x = padre.get(x); } return x; };
  for (const [a, b] of pares) padre.set(raiz(a), raiz(b));
  const g = new Map();
  for (const n of pool) { const r = raiz(n.id); (g.get(r) ?? g.set(r, []).get(r)).push(n.id); }
  return [...g.values()];
};
const porMercury = unir(sies);
const soloParecido = unir(candidatos.filter(([, , s]) => s >= 0.85));
const multiples = (gs) => gs.filter((g) => g.length > 1).sort((a, b) => b.length - a.length);
const mm = multiples(porMercury); const sp = multiples(soloParecido);

const L = ['# Duplicadas: parecido por significado + confirmación de Mercury\n'];
L.push(`- Notas: **${pool.length}**. Pares candidatos (parecido ${UMBRAL}+): **${candidatos.length}**. Mercury dice "mismo hecho" en **${sies.length}** (${Math.round((100 * sies.length) / candidatos.length)}%). Costo de las confirmaciones: US$ ${costo.toFixed(3)}.`);
L.push(`- **Sólo por parecido (0,85+)**: ${sp.length} grupos, el mayor de ${sp[0]?.length} notas; quedarían ${soloParecido.length} historias.`);
L.push(`- **Con la confirmación de Mercury**: ${mm.length} grupos, el mayor de ${mm[0]?.length} notas; quedan ${porMercury.length} historias distintas en vez de ${pool.length} notas.`);
L.push(`- Tamaño de los 15 grupos más grandes: ${mm.slice(0, 15).map((g) => g.length).join(', ')}.`);
L.push(`- Grupos de 2 notas: ${mm.filter((g) => g.length === 2).length} · de 3 a 5: ${mm.filter((g) => g.length >= 3 && g.length <= 5).length} · de 6 o más: ${mm.filter((g) => g.length >= 6).length}.\n`);
L.push('## Los 20 grupos más grandes con la confirmación de Mercury\n');
for (const g of mm.slice(0, 20)) { L.push(`**${g.length} notas**`); for (const id of g.slice(0, 7)) L.push(`- ${porId.get(id).medio}: ${porId.get(id).titulo.slice(0, 95)}`); if (g.length > 7) L.push(`- … y ${g.length - 7} más`); L.push(''); }
fs.writeFileSync(path.join(AQUI, 'duplicadas-confirmadas.md'), `${L.join('\n')}\n`);
fs.writeFileSync(path.join(AQUI, 'historias-confirmadas.json'), JSON.stringify(mm.map((g) => g.map((id) => ({ id, medio: porId.get(id).medio, titulo: porId.get(id).titulo })))));
console.log(L.slice(0, 7).join('\n'));

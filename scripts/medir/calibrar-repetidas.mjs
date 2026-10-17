// Calibra la comparación sin IA de repetidas contra lo publicado (ingesta/repetidas-publicadas.mjs, regla 171).
//
// Sólo lee: los 127 pares etiquetados a mano (etiquetas-duplicadas.json; 84 «si», 25 «dudoso», 18 «no»), el
// archivo y el histórico. Para varios umbrales dice cuántos pares juntaría, cuántos bien (precisión) y cuántos
// de los 84 encuentra (recuperación). La precisión ESTRICTA cuenta un «dudoso» como unión falsa: es la que
// manda (Andrés y Hernán quieren más notas; juntar dos noticias distintas es lo peor).
//
// Después mira TODAS las parejas de notas de medios publicadas a menos de 72 horas (no sólo las 127, que son las
// de parecido TF-IDF 0,45 o más) y lista las que se juntarían sin estar etiquetadas, para leerlas a mano.
//
//   node scripts/medir/calibrar-repetidas.mjs            la tabla y las parejas sin etiqueta
//   node scripts/medir/calibrar-repetidas.mjs --detalle  además, cada par etiquetado con su decisión

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { huella, compararNotas, porQueNo, REPETIDAS_PUBLICADAS } from '../../ingesta/repetidas-publicadas.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (p) => JSON.parse(fs.readFileSync(path.join(RAIZ, p), 'utf8'));
const DETALLE = process.argv.includes('--detalle');

const porId = new Map();
const historico = fs.readdirSync(path.join(RAIZ, 'web/data/historico')).filter((f) => f.endsWith('.json'));
for (const f of historico) for (const n of leer(`web/data/historico/${f}`).notas ?? []) porId.set(n.id, n);
for (const n of leer('web/data/archivo.json').notas ?? []) porId.set(n.id, n); // el archivo pisa al histórico

// Las parejas que alguna variante junta fuera de las 127 etiquetadas, leídas a mano por Claude (Opus) el 15/10/2026
// con el mismo criterio (B6: mismo suceso, día y protagonista; un anuncio y su resultado son dos notas).
const REVISADAS = {
  '1if2xbk|1nud4zm': 'no', // «Se agotaron las entradas…» / «Entradas…: paso a paso para comprarlas»
  '1k3g7wg|x1ihjl': 'si', // «Reino recibió a autoridades del Club de Leones» / «El intendente recibe…»
  '1tftag2|pjnmc': 'no', // «Reinauguran el Autódromo Fangio» / «Nuevo mural de Fangio en el autódromo local»
  'epzsa5|pjnmc': 'si', // «Reinauguran el Autódromo Fangio» / «Reinauguran el autódromo Juan Manuel Fangio»
  '150qeb8|2gmz6t': 'dudoso', // «A qué hora venden las entradas…» / «A qué hora arranca este martes la venta…» (22 h)
  '16zvbdl|5yolmk': 'si', // «…será reinaugurado este viernes» / «Reinauguran este viernes el Autódromo Fangio»
  '5yolmk|epzsa5': 'si', // «…será reinaugurado este viernes» / «Reinauguran el autódromo Juan Manuel Fangio»
  '166n9rw|b22jpv': 'si', // «Robaron nuevamente en una distribuidora de calle 6» / «Volvieron a robar en una distribuidora de calle 6»
  '19t46mo|1rwiqvl': 'si', // «Dos hombres fueron aprehendidos tras una persecución…» / «Persecución y operativo cerrojo: detuvieron a dos hombres…»
  '1vgun5x|ekwjoy': 'si', // «Balcarce expone sus atractivos… en la trigésima Feria Internacional de Turismo» / «Balcarce participa de la trigésima…»
  'g2u3l1|xtbw5': 'no', // «Flavio Briatore critica a Franco Colapinto tras el Gran Premio…» / «Franco Colapinto largará noveno…»
  '1xkcy2n|epzsa5': 'no', // «Autódromo Juan Manuel Fangio: cronograma y nuevas reglas» / «Reinauguran el autódromo Juan Manuel Fangio»
};

const etiquetas = leer('scripts/medir/etiquetas-duplicadas.json').pares;
const huellas = new Map();
const h = (id) => huellas.get(id) ?? huellas.set(id, huella(porId.get(id))).get(id);
const pares = etiquetas.filter((p) => porId.has(p.idA) && porId.has(p.idB));
const SI = pares.filter((p) => p.mismoHecho === 'si').length;

const pct = (a, b) => (b ? `${Math.round((1000 * a) / b) / 10} %` : '—');
function medir(umbrales) {
  let juntaSi = 0; let juntaDudoso = 0; let juntaNo = 0;
  for (const p of pares) {
    if (!compararNotas(h(p.idA), h(p.idB), umbrales).misma) continue;
    if (p.mismoHecho === 'si') juntaSi += 1; else if (p.mismoHecho === 'dudoso') juntaDudoso += 1; else juntaNo += 1;
  }
  const juntadas = juntaSi + juntaDudoso + juntaNo;
  return { juntadas, juntaSi, juntaDudoso, juntaNo, estricta: pct(juntaSi, juntadas), sinDudosos: pct(juntaSi, juntaSi + juntaNo), recuperacion: pct(juntaSi, SI) };
}

const elegido = REPETIDAS_PUBLICADAS;
const variantes = [
  ...[0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.8].map((t) => ({ nombre: `hasta 36 h: título ≥ ${t} y texto ≥ ${elegido.texto}`, u: { titulo: t } })),
  ...[0, 0.25, 0.3, 0.4, 0.45].map((x) => ({ nombre: `hasta 36 h: título ≥ ${elegido.titulo} y texto ≥ ${x}`, u: { texto: x } })),
  { nombre: 'sin el camino de lo de acá (título ≥ 0,3 y texto ≥ 0,6)', u: { tituloDeAca: 2 } },
  ...[[0.25, 0.6], [0.35, 0.55], [0.2, 0.7]].map(([t, x]) => ({ nombre: `lo de acá: título ≥ ${t} y texto ≥ ${x}`, u: { tituloDeAca: t, textoDeAca: x } })),
  { nombre: `título ≥ ${elegido.titulo} y texto ≥ ${elegido.texto} hasta 72 h (sin exigir más de lejos)`, u: { horasCerca: 72 } },
  { nombre: 'sólo hasta 36 h (nada de lejos)', u: { horas: 36 } },
  { nombre: '36-72 h: título ≥ 0,55 y texto ≥ 0,45', u: { tituloLejos: 0.55, textoLejos: 0.45 } },
];
console.log(`Elegido: hasta ${elegido.horasCerca} h, título ≥ ${elegido.titulo} y título + bajada ≥ ${elegido.texto} (lo de acá: o título ≥ ${elegido.tituloDeAca} y título + bajada ≥ ${elegido.textoDeAca}); de ${elegido.horasCerca} a ${elegido.horas} h, título ≥ ${elegido.tituloLejos} y título + bajada ≥ ${elegido.textoLejos}; y los frenos.\n`);

// Todas las parejas de notas de medios publicadas a menos de 72 horas (para ver qué se juntaría sin etiqueta).
const etiquetadas = new Set(pares.map((p) => [p.idA, p.idB].sort().join('|')));
const deMedios = [...porId.values()].filter((n) => !n.propia && n.titulo && n.fecha);
const hs = deMedios.map((n) => h(n.id));
const cercanas = [];
for (let i = 0; i < hs.length; i += 1) {
  for (let j = i + 1; j < hs.length; j += 1) {
    if (Math.abs(hs[i].tiempo - hs[j].tiempo) <= 72 * 3600e3) cercanas.push([i, j]);
  }
}
const sinEtiqueta = (umbrales) => cercanas
  .filter(([i, j]) => !etiquetadas.has([hs[i].id, hs[j].id].sort().join('|')))
  .map(([i, j]) => ({ a: deMedios[i], b: deMedios[j], c: compararNotas(hs[i], hs[j], umbrales) }))
  .filter((x) => x.c.misma);
const revisada = (x) => REVISADAS[[x.a.id, x.b.id].sort().join('|')] ?? '¿?';

console.log(`Pares etiquetados: ${pares.length} (${SI} «si», ${pares.filter((p) => p.mismoHecho === 'dudoso').length} «dudoso», ${pares.filter((p) => p.mismoHecho === 'no').length} «no»)
`);
console.log('| Umbral | Junta | Bien («si») | Dudosos | «No» | Precisión estricta | Precisión sin dudosos | Recuperación (de 84) | Fuera de los 127: junta (si/dudoso/no/sin leer) |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const v of variantes) {
  const m = medir(v.u);
  const fuera = sinEtiqueta(v.u);
  const cuenta = (e) => fuera.filter((x) => revisada(x) === e).length;
  const marca = JSON.stringify({ ...elegido, ...v.u }) === JSON.stringify(elegido) ? ' **(elegido)**' : '';
  console.log(`| ${v.nombre}${marca} | ${m.juntadas} | ${m.juntaSi} | ${m.juntaDudoso} | ${m.juntaNo} | ${m.estricta} | ${m.sinDudosos} | ${m.recuperacion} | ${fuera.length} (${cuenta('si')}/${cuenta('dudoso')}/${cuenta('no')}/${cuenta('¿?')}) |`);
}

// Por historia (lo que importa al lector): las copias de más entre los pares «si» y cuántas se van con el umbral elegido.
{
  const grupos = (lista) => {
    const padre = new Map();
    const r = (x) => { if (!padre.has(x)) padre.set(x, x); while (padre.get(x) !== x) x = padre.get(x); return x; };
    for (const [a, b] of lista) padre.set(r(b), r(a));
    const tam = new Map();
    for (const x of padre.keys()) tam.set(r(x), (tam.get(r(x)) ?? 0) + 1);
    return [...tam.values()];
  };
  const si = pares.filter((p) => p.mismoHecho === 'si');
  const copias = grupos(si.map((p) => [p.idA, p.idB])).reduce((s, n) => s + n - 1, 0);
  const juntadas = si.filter((p) => compararNotas(h(p.idA), h(p.idB)).misma);
  const sacadas = grupos(juntadas.map((p) => [p.idA, p.idB])).reduce((s, n) => s + n - 1, 0);
  const otraSeccion = si.filter((p) => porId.get(p.idA).seccion !== porId.get(p.idB).seccion);
  const lejos = si.filter((p) => Math.abs(h(p.idA).tiempo - h(p.idB).tiempo) > 12 * 3600e3);
  const deAca = si.filter((p) => h(p.idA).aca && h(p.idB).aca);
  const c = (l) => `${l.filter((p) => compararNotas(h(p.idA), h(p.idB)).misma).length} de ${l.length}`;
  console.log(`\nPor historia: los pares «si» dejan ${copias} copias de más; con el umbral elegido se van ${sacadas} (${pct(sacadas, copias)}).`);
  console.log(`  Pares «si» en secciones distintas: junta ${c(otraSeccion)}. Con más de 12 h entre una y otra: ${c(lejos)}. Las dos de acá: ${c(deAca)}.`);
}

// Lo que aportan los frenos: el mismo umbral sin ellos.
{
  let falsas = 0; let frenadas = 0; let siFrenadas = 0;
  const motivos = {};
  for (const p of pares) {
    const c = compararNotas(h(p.idA), h(p.idB));
    const sinFrenos = c.misma || (c.motivo !== 'no se parecen lo suficiente' && c.motivo !== 'lejos en el tiempo' && c.motivo !== 'títulos muy cortos para decidir');
    if (!sinFrenos) continue;
    if (!c.misma) {
      frenadas += 1; motivos[c.motivo] = (motivos[c.motivo] ?? 0) + 1;
      if (p.mismoHecho === 'si') siFrenadas += 1; else falsas += 1;
    }
  }
  console.log(`\nLos frenos (con el umbral elegido): pararon ${frenadas} pares que se parecían lo suficiente; ${falsas} eran «no» o «dudoso» y ${siFrenadas} eran «si».`);
  for (const [m, n] of Object.entries(motivos)) console.log(`  · ${m}: ${n}`);
}

if (DETALLE) {
  console.log('\nCada par etiquetado (con el umbral elegido):');
  for (const p of pares) {
    const c = compararNotas(h(p.idA), h(p.idB));
    console.log(`  ${c.misma ? 'JUNTA' : '     '} ${p.mismoHecho.padEnd(6)} t${c.titulo} x${c.texto} ${c.horas} h · ${c.motivo}\n        ${porId.get(p.idA).titulo}\n        ${porId.get(p.idB).titulo}`);
  }
}

// Las que el umbral elegido juntaría fuera de las 127 etiquetadas, con lo que dijo la lectura a mano.
const fueraElegido = sinEtiqueta(elegido);
console.log(`\nFuera de los 127 pares etiquetados, el umbral elegido junta ${fueraElegido.length} parejas más (entre ${deMedios.length} notas de medios):`);
for (const x of fueraElegido) console.log(`  [${revisada(x)}] t${x.c.titulo} x${x.c.texto} ${x.c.horas} h · ${x.a.id} [${x.a.seccion}] ${x.a.titulo}\n${' '.repeat(32)}${x.b.id} [${x.b.seccion}] ${x.b.titulo}`);

// Los dos casos del análisis.
for (const [x, y] of [['15imf6x', 'ccot62'], ['1gq0pia', '158gkt0']]) {
  const c = compararNotas(h(x), h(y));
  console.log(`\nCaso ${x} / ${y}: ${c.misma ? 'se juntan' : `NO se juntan (${c.motivo})`} · título ${c.titulo}, texto ${c.texto}, ${c.horas} h`);
}
void porQueNo;

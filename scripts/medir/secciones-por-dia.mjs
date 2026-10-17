// Cuántas notas tuvo cada sección cada día, de lo ya publicado (web/data/archivo.json y portada.json), con las secciones de hoy: las que
// el clasificador del mapa manda a Educación, Salud, Ciencia o Tecnología e IA se cuentan ahí (conSeccionDelSitio), igual que las muestra
// el sitio. Sirve para ver qué días quedaría vacía una sección (regla 215, Hernán: "todas las secciones tienen que tener notas todos los
// días, si no, no vale la pena tenerlas"). Es un PISO: son las notas que salieron con el criterio de antes (cupos y mínimos por sección);
// con el criterio nuevo (sin cupos, 3 medios y 2 en las áreas chicas) salen más. Lee sólo web/data; no escribe nada.
//
//   node scripts/medir/secciones-por-dia.mjs                 los últimos 14 días
//   node scripts/medir/secciones-por-dia.mjs --dias=21       otra cantidad
//   node scripts/medir/secciones-por-dia.mjs --json=a.json   además, en un archivo
//
// Los días se cuentan en hora de Balcarce, por la primera vez que se vio cada nota (`visto`) o, si no está, su fecha. No cuenta las notas
// propias (clima, dólar, repasos, efemérides, fútbol y F1 armados con plantilla), como la estadística diaria.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { conSeccionDelSitio, SECCIONES } from '../../web/lib/datos.js';
import { diaAR } from '../../ingesta/zona.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..', '..');
const arg = (nombre) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3) ?? null;

/** Las notas publicadas (archivo y portada, sin repetir), con la sección con que las muestra el sitio. */
export function notasPublicadas(carpeta = path.join(RAIZ, 'web', 'data')) {
  const leer = (f) => { try { return JSON.parse(fs.readFileSync(path.join(carpeta, f), 'utf8')).notas ?? []; } catch { return []; } };
  const porId = new Map();
  for (const n of [...leer('archivo.json'), ...leer('portada.json')]) if (n?.id) porId.set(n.id, n);
  return [...porId.values()].filter((n) => !n.propia && n.seccion).map((n) => conSeccionDelSitio(n));
}

/** { 'AAAA-MM-DD': { Sección: cantidad, … }, … } de los últimos `dias` días cerrados más el de hoy. */
export function porDia(notas, { dias = 14, hoy = diaAR(new Date()) } = {}) {
  const salida = {};
  const desde = new Date(`${hoy}T12:00:00-03:00`).getTime() - (dias - 1) * 864e5;
  for (let i = 0; i < dias; i += 1) salida[diaAR(new Date(desde + i * 864e5))] = {};
  for (const n of notas) {
    const t = new Date(n.visto ?? n.fecha ?? '');
    if (!Number.isFinite(t.getTime())) continue;
    const dia = diaAR(t);
    if (!(dia in salida)) continue;
    salida[dia][n.seccion] = (salida[dia][n.seccion] ?? 0) + 1;
  }
  return salida;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dias = Number(arg('dias') ?? 14);
  const notas = notasPublicadas();
  const tabla = porDia(notas, { dias });
  const nombres = SECCIONES.map((s) => s.nombre);
  const corto = (s) => s.replace('Cultura y agenda', 'Cultura').replace('Automovilismo', 'Autom.').replace('Tecnología', 'Tecno');
  console.log(`día        ${nombres.map((s) => corto(s).padStart(8)).join('')}  total`);
  const vacios = Object.fromEntries(nombres.map((s) => [s, []]));
  for (const [dia, c] of Object.entries(tabla)) {
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    console.log(`${dia} ${nombres.map((s) => String(c[s] ?? 0).padStart(8)).join('')}  ${String(total).padStart(5)}`);
    for (const s of nombres) if (!(c[s] > 0)) vacios[s].push(dia);
  }
  console.log('\nDías sin ninguna nota:');
  for (const s of nombres) console.log(`  ${s.padEnd(18)} ${vacios[s].length}${vacios[s].length ? `  (${vacios[s].map((d) => d.slice(5)).join(', ')})` : ''}`);
  if (arg('json')) fs.writeFileSync(path.resolve(RAIZ, arg('json')), JSON.stringify({ tabla, vacios }, null, 1));
}

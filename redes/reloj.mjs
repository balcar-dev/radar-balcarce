// El reloj: ¿hay alguna pieza para armar y publicar ahora?
//
//   node redes/reloj.mjs
//
// Mira la hora de Balcarce y el libro de lo ya publicado (web/data/redes.json),
// y dice qué piezas tocan. No arma nada ni instala nada: por eso, cuando no hay
// nada que hacer, la corrida de GitHub termina en segundos.
//
// Dentro de GitHub Actions deja dos datos para los pasos siguientes:
//
//   hay=true|false      si hay algo para armar
//   solo=a,b            las piezas, listas para plan.mjs --solo=
//
// Nunca pide más de POR_CORRIDA piezas juntas: que salgan de a poco.

import fs from 'node:fs';
import path from 'node:path';
import { libroNuevo } from './elegir.mjs';
import { slotsQueTocan, POR_CORRIDA } from './piezas.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const LIBRO = path.join(RAIZ, 'web', 'data', 'redes.json');

let libro = libroNuevo();
try { libro = JSON.parse(fs.readFileSync(LIBRO, 'utf8')); } catch { /* todavía no hay libro */ }

const ahora = new Date();
const tocan = slotsQueTocan({ ahora, libro }).slice(0, POR_CORRIDA);
const hora = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires',
}).format(ahora);

if (tocan.length) {
  console.log(`  ${hora} en Balcarce · tocan: ${tocan.map((p) => `${p.nombre} (${p.hora})`).join(', ')}`);
} else {
  console.log(`  ${hora} en Balcarce · no hay ninguna pieza para publicar ahora.`);
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `hay=${tocan.length > 0}\nsolo=${tocan.map((p) => p.nombre).join(',')}\n`,
  );
}

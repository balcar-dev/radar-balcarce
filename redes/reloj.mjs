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
// Pide todo lo que toque: si una corrida llega tarde, no deja nada para la próxima.

import fs from 'node:fs';
import path from 'node:path';
import { libroNuevo } from './elegir.mjs';
import { slotsQueTocan, POR_CORRIDA } from './piezas.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const LIBRO = path.join(RAIZ, 'web', 'data', 'redes.json');

/** Lo que corresponde publicar ahora, como { hora, tocan, textoResumen }. */
export function estadoDelReloj({ ahora = new Date(), libro } = {}) {
  const tocan = slotsQueTocan({ ahora, libro }).slice(0, POR_CORRIDA);
  const hora = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires',
  }).format(ahora);
  const textoResumen = tocan.length
    ? `${hora} en Balcarce · tocan: ${tocan.map((p) => `${p.nombre} (${p.hora})`).join(', ')}`
    : `${hora} en Balcarce · no hay ninguna pieza para publicar ahora.`;
  return { hora, tocan, textoResumen };
}

// Sólo corre cuando esto se ejecuta directamente (node redes/reloj.mjs), igual
// que reels/plan.mjs y compañía: así se puede importar estadoDelReloj() desde
// una prueba sin leer el libro real ni escribir en GITHUB_OUTPUT.
if (process.argv[1] && process.argv[1].endsWith('reloj.mjs')) {
  let libro = libroNuevo();
  try { libro = JSON.parse(fs.readFileSync(LIBRO, 'utf8')); } catch { /* todavía no hay libro */ }

  const { tocan, textoResumen } = estadoDelReloj({ libro });
  console.log(`  ${textoResumen}`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `hay=${tocan.length > 0}\nsolo=${tocan.map((p) => p.nombre).join(',')}\n`,
    );
  }
}

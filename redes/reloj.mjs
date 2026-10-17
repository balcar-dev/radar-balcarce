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
// Con el interruptor REDES_ACTIVAS apagado (estaActivo, redes/elegir.mjs) no
// pide nada: hay=false.

import fs from 'node:fs';
import path from 'node:path';
import { leerJsonEstricto } from '../ingesta/json.mjs';
import { libroNuevo, estaActivo } from './elegir.mjs';
import { slotsQueTocan, POR_CORRIDA } from './piezas.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const LIBRO = path.join(RAIZ, 'web', 'data', 'redes.json');
const PORTADA = path.join(RAIZ, 'web', 'data', 'portada.json');

/** Lo que corresponde publicar ahora, como { hora, tocan, textoResumen }.
 *  `clima` (el de web/data/portada.json) es para el aviso de clima: si hay uno
 *  grave, también lo pide (avisoDeClima en redes/piezas.mjs).
 *
 *  `activo`: el interruptor REDES_ACTIVAS leído con estaActivo (redes/elegir.mjs),
 *  la MISMA regla que usa publicar.mjs (28/09: el workflow comparaba con seis
 *  formas fijas y " si" o "SI " daban otra respuesta). Apagado, no toca nada:
 *  no se gasta el cupo de voz (10 audios por día) en piezas que no se van a
 *  publicar. */
export function estadoDelReloj({
  ahora = new Date(), libro, clima = null, activo = true, hayFarmacia = true,
} = {}) {
  const hora = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires',
  }).format(ahora);
  if (!activo) {
    return { hora, tocan: [], textoResumen: `${hora} en Balcarce · las redes están apagadas (REDES_ACTIVAS): no se arma ninguna pieza.` };
  }
  // Sin farmacia de turno en la web (portada.json), la pieza no se puede armar: no se la pide (17/10, regla 210; el 12/10 el reloj la
  // pidió veinte veces y cada corrida instaló todo para nada). Si la web la recupera, la vuelta siguiente la pide.
  const todas = slotsQueTocan({ ahora, libro, clima });
  const sinFarmacia = !hayFarmacia && todas.some((p) => p.nombre === 'farmacia');
  const tocan = todas.filter((p) => hayFarmacia || p.nombre !== 'farmacia').slice(0, POR_CORRIDA);
  const nota = sinFarmacia ? ' (la farmacia no: la web no tiene farmacia de turno para hoy)' : '';
  const textoResumen = tocan.length
    ? `${hora} en Balcarce · tocan: ${tocan.map((p) => `${p.nombre} (${p.hora})`).join(', ')}${nota}`
    : `${hora} en Balcarce · no hay ninguna pieza para publicar ahora.${nota}`;
  return { hora, tocan, textoResumen };
}

// Sólo corre cuando esto se ejecuta directamente (node redes/reloj.mjs), igual
// que reels/plan.mjs y compañía: así se puede importar estadoDelReloj() desde
// una prueba sin leer el libro real ni escribir en GITHUB_OUTPUT.
if (process.argv[1] && process.argv[1].endsWith('reloj.mjs')) {
  let libro = libroNuevo();
  libro = leerJsonEstricto(LIBRO, libro); // sin libro todavía: uno nuevo; roto: corta (C-5)
  // El clima publicado: el mismo que usa reels/plan.mjs en GitHub (vía
  // redes/datos.mjs), así el reloj pide el mismo aviso que el plan arma.
  let clima = null;
  let hayFarmacia = true;
  try {
    const portada = JSON.parse(fs.readFileSync(PORTADA, 'utf8'));
    clima = portada.clima ?? null;
    hayFarmacia = Boolean(portada.farmacias?.hoy);
  } catch { /* sin portada, sin aviso */ }

  const { tocan, textoResumen } = estadoDelReloj({ libro, clima, hayFarmacia, activo: estaActivo(process.env.REDES_ACTIVAS) });
  console.log(`  ${textoResumen}`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `hay=${tocan.length > 0}\nsolo=${tocan.map((p) => p.nombre).join(',')}\n`,
    );
  }
}

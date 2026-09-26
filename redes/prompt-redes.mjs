// La identidad y la voz de las redes, leídas de CRITERIO-REDES.md.
//
// Hernán y Andrés pidieron (26/09) que la locutora sea SIEMPRE la misma, que el
// medio sea siempre "Radar Balcarce" y la página siempre radarbalcarce.com. Esto
// lee de ese documento, sin copia en el código:
//
//   <!-- IDENTIDAD:INICIO -->     Medio / Sitio escrito / Sitio dicho
//   <!-- VOZ:NOMBRE:INICIO -->    la voz de Gemini (Kore)
//   <!-- VOZ:BASE:INICIO -->      la indicación de siempre
//   <!-- VOZ:MANANA|TARDE|NOCHE:INICIO -->   la del momento del día
//
// (cada una cierra con su :FIN). Si el archivo falta o le falta una parte,
// leerCriterioRedes() LANZA, y como los módulos que lo usan lo cargan al
// importarse, falla a la vista (y `npm test` lo controla) en lugar de hablar con
// una instrucción vacía.
//
// Vive en redes/ y no en reels/ porque reels/plan.mjs lo usa y el panel importa
// plan.mjs: no puede traer ffmpeg. Sin dependencias: sólo lo que trae Node.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Dónde está el criterio de las redes: en la raíz del proyecto. */
export const RUTA_CRITERIO_REDES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'CRITERIO-REDES.md');

const falla = (ruta, que) => new Error(`Criterio de las redes (${ruta}): ${que}. Las redes no hablan sin criterio: corregir CRITERIO-REDES.md.`);

function entreMarcas(texto, nombre, ruta) {
  const inicio = `<!-- ${nombre}:INICIO -->`;
  const fin = `<!-- ${nombre}:FIN -->`;
  const a = texto.indexOf(inicio);
  const b = texto.indexOf(fin);
  if (a < 0 || b < 0) throw falla(ruta, `falta la marca ${a < 0 ? inicio : fin}`);
  if (b < a) throw falla(ruta, `${fin} está antes que ${inicio}`);
  if (texto.indexOf(inicio, a + 1) >= 0 || texto.indexOf(fin, b + 1) >= 0) throw falla(ruta, `la marca ${nombre} está repetida`);
  const adentro = texto.slice(a + inicio.length, b).replace(/^[ \t]*\n+/, '').replace(/\n+[ \t]*$/, '');
  if (!adentro.trim()) throw falla(ruta, `la parte ${nombre} está vacía`);
  return adentro.trim();
}

/** Las tres franjas del día. */
export const MOMENTOS = ['manana', 'tarde', 'noche'];

/**
 * Lee el criterio de las redes. Devuelve
 *   { texto, medio, sitio, sitioDicho, vozNombre, base, momentos: { manana, tarde, noche } }
 * o lanza si falta el archivo o una parte.
 */
export function leerCriterioRedes(ruta = RUTA_CRITERIO_REDES) {
  let texto;
  try {
    texto = fs.readFileSync(ruta, 'utf8');
  } catch (e) {
    throw falla(ruta, `no se pudo leer (${e.code ?? e.message})`);
  }
  texto = texto.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

  const identidad = entreMarcas(texto, 'IDENTIDAD', ruta);
  const campo = (rotulo) => {
    const m = identidad.match(new RegExp(`^${rotulo}:\\s*(.+)$`, 'mi'));
    if (!m) throw falla(ruta, `la identidad no dice "${rotulo}:"`);
    return m[1].trim();
  };
  const medio = campo('Medio');
  const sitio = campo('Sitio escrito');
  const sitioDicho = campo('Sitio dicho');
  if (medio !== 'Radar Balcarce') throw falla(ruta, `el medio se llama siempre "Radar Balcarce" (dice "${medio}")`);
  if (!/^[a-z0-9-]+\.com$/.test(sitio)) throw falla(ruta, `el sitio se escribe siempre radarbalcarce.com, sin .ar ni otra variante (dice "${sitio}")`);
  if (!/ punto com$/i.test(sitioDicho)) throw falla(ruta, `el sitio dicho tiene que terminar en "punto com" (dice "${sitioDicho}")`);

  const voz = entreMarcas(texto, 'VOZ', ruta);
  const parte = (nombre) => entreMarcas(voz, `VOZ:${nombre}`, ruta);
  const base = parte('BASE');
  if (!/punto ar/i.test(base) || !/Radar Balcarce/.test(base)) {
    throw falla(ruta, 'la indicación base tiene que nombrar "Radar Balcarce" y prohibir explícitamente "punto ar"');
  }
  return {
    texto,
    medio,
    sitio,
    sitioDicho,
    vozNombre: parte('NOMBRE'),
    base,
    momentos: { manana: parte('MANANA'), tarde: parte('TARDE'), noche: parte('NOCHE') },
  };
}

// Se carga al importar: si el archivo falta, el módulo que lo importa no arranca.
const CRITERIO = leerCriterioRedes();

/** "Radar Balcarce": el medio se llama siempre así. */
export const MEDIO = CRITERIO.medio;
/** "radarbalcarce.com": la dirección, escrita. */
export const SITIO = CRITERIO.sitio;
/** "Radar Balcarce punto com": la dirección, dicha en voz alta. */
export const SITIO_DICHO = CRITERIO.sitioDicho;
/** La voz de Gemini: siempre la misma (Kore). */
export const VOZ_NOMBRE = CRITERIO.vozNombre;
/** La indicación de siempre, la misma para toda pieza. */
export const INDICACION_BASE = CRITERIO.base;
/** Cómo suena cada momento del día (se suma a la base). */
export const INDICACIONES = CRITERIO.momentos;

/** La indicación completa: la de siempre más la del momento (si hay). Es lo que
 *  recibe Gemini en producción (reels/reel.mjs) y en la auditoría. */
export const componerIndicacion = (delMomento = '') => (delMomento ? `${INDICACION_BASE} ${delMomento}` : INDICACION_BASE);

/** Las opciones de voz de una pieza según su momento: la voz y la indicación. */
export function opcionesDeVoz(momento) {
  if (!MOMENTOS.includes(momento)) throw new Error(`momento desconocido: ${momento}`);
  return { voz: VOZ_NOMBRE, indicacion: componerIndicacion(INDICACIONES[momento]) };
}

/** Qué franja del día es una hora "HH:MM": hasta las 12:59 mañana, desde las 13
 *  tarde, desde las 19 noche. */
export function momentoDeHora(hhmm) {
  const h = Number(String(hhmm).split(':')[0]);
  if (!Number.isFinite(h)) throw new Error(`hora inválida: ${hhmm}`);
  if (h < 13) return 'manana';
  if (h < 19) return 'tarde';
  return 'noche';
}

// La pieza de "Un día como hoy" de cada día (1/10/2026, Hernán: "todos los días, fijo a las 9"): una
// historia con voz (la locutora) con la efeméride principal y, después de "Y además", las otras tres.
//
// Lo que se cuenta sale de web/data/efemerides-piezas.json, que se prepara UNA SEMANA POR VEZ y se
// revisa en el panel y con Hernán y Andrés ("todas las semanas vamos a ir mirando una semana"). Si un día no
// tiene su entrada, ese día no sale nada (no es una falla: no se inventa). Si nadie toca nada, sale como está.
// Una entrada con `"sale": false` se saca sin borrarla.
//
// Cada día: { voz, principal: { id, anio, titulo, cuerpo, verificar }, ademas: [{ id, anio, texto }], guion }.
// El guion lo escribe una persona (o Claude) con los datos verificados; empieza con el saludo, cuenta la
// principal, sigue con "Y además, un día como hoy: …" y cierra con "Un día como hoy, en Radar Balcarce."
//
// Sin dependencias de afuera de Node.

import fs from 'node:fs';
import path from 'node:path';
import { diaAR } from '../ingesta/zona.mjs';

const RUTA = path.join(import.meta.dirname, '..', 'web', 'data', 'efemerides-piezas.json');
export const HORA_EFEMERIDE = '09:00';

/** Lo preparado (el archivo entero) o null. */
export function leerEfemerides(ruta = RUTA) {
  try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch { return null; }
}

/** Una entrada tiene lo mínimo para salir: título, guion y las tres de "Además". */
export function entradaCompleta(d) {
  return Boolean(d?.guion && d?.principal?.titulo && Array.isArray(d?.ademas) && d.ademas.length > 0 && d.sale !== false);
}

/**
 * La efeméride de ese día, o null si no está preparada (o se sacó con `sale: false`).
 * @returns {{ fecha: string, voz: string, principal: object, ademas: object[], guion: string } | null}
 */
export function efemerideDelDia(cuando = new Date(), { datos } = {}) {
  const fecha = diaAR(cuando);
  const d = (datos ?? leerEfemerides())?.dias?.[fecha];
  return entradaCompleta(d) ? { fecha, voz: 'locutora', ...d } : null;
}

/** Los días que tienen su efeméride lista, de la más próxima a la más lejana (para ver hasta cuándo alcanza). */
export function diasPreparados({ datos } = {}) {
  const dias = (datos ?? leerEfemerides())?.dias ?? {};
  return Object.keys(dias).filter((f) => entradaCompleta(dias[f])).sort();
}

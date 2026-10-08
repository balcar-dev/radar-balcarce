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
import { diaAR } from '../ingesta/zona.mjs';
import { rutaDeDatos } from '../ingesta/datos-vivos.mjs';

// Las rutas se arman en cada llamada: las pruebas leen copias fijas (ingesta/datos-vivos.mjs).
export const HORA_EFEMERIDE = '09:00';

/** Lo preparado (el archivo entero) o null. */
export function leerEfemerides(ruta = rutaDeDatos('efemerides-piezas.json')) {
  try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch { return null; }
}

/** Lo que decidieron Hernán y Andrés sobre cada día armado, desde la pestaña Fechas del panel (`piezas` de efemerides-elegidas.json). */
export function leerDecisiones(ruta = rutaDeDatos('efemerides-elegidas.json')) {
  try { return JSON.parse(fs.readFileSync(ruta, 'utf8'))?.piezas ?? {}; } catch { return {}; }
}

/**
 * Qué se armó, para que una decisión valga sólo sobre eso (2/10): si después se rearma el día (otra principal, otro guion), la
 * aprobación vieja ya no cuenta y vuelve a esperar. El panel calcula lo mismo (web/public/panel/fechas.js, huellaDelDia).
 */
export const huellaDelDia = (d) => `${d?.principal?.id ?? ''}|${(d?.ademas ?? []).map((x) => x?.id ?? '').join('+')}|${String(d?.guion ?? '').length}`;

/**
 * Una entrada tiene lo mínimo para salir: título, guion y las de "Además"; y no está sacada. Si una persona la aprobó en el panel
 * (y lo aprobado es lo que hay), sale aunque diga `"sale": false`; si la sacó o pidió cambios, no sale.
 */
export function entradaCompleta(d, decision = null) {
  const completa = Boolean(d?.guion && d?.principal?.titulo && Array.isArray(d?.ademas) && d.ademas.length > 0);
  if (!completa) return false;
  const vale = decision && decision.huella === huellaDelDia(d) ? decision.estado : null;
  if (vale === 'aprobada') return true;
  if (vale === 'sacada' || vale === 'cambiar') return false;
  return d.sale !== false;
}

/**
 * La efeméride de ese día, o null si no está preparada (o se sacó con `sale: false`).
 * @returns {{ fecha: string, voz: string, principal: object, ademas: object[], guion: string } | null}
 */
export function efemerideDelDia(cuando = new Date(), { datos, decisiones } = {}) {
  const fecha = diaAR(cuando);
  const d = (datos ?? leerEfemerides())?.dias?.[fecha];
  return entradaCompleta(d, (decisiones ?? leerDecisiones())[fecha]) ? { fecha, voz: 'locutora', ...d } : null;
}

/** Los días que tienen su efeméride lista, de la más próxima a la más lejana (para ver hasta cuándo alcanza). */
export function diasPreparados({ datos, decisiones } = {}) {
  const dias = (datos ?? leerEfemerides())?.dias ?? {};
  const d = decisiones ?? leerDecisiones();
  return Object.keys(dias).filter((f) => entradaCompleta(dias[f], d[f])).sort();
}

// La popularidad: cuántos medios distintos tienen que contar lo de afuera para que salga (reglas 215 y 260, 17/10/2026).
//
// Hernán: "no hay ningún cupo de nada: tiene que entrar todo lo nacional en base a las notas que más fuentes tienen a la vez" y,
// después: "a nivel nacional, de las secciones populares, sólo a partir de 3 fuentes; la semana que viene lo miramos con la
// estadística y ahí regularizamos". Queda una sola idea, que se explica en seis líneas (ingesta/criterio.mjs):
//
//   · lo de Balcarce entra todo; lo nacional sale si lo cuentan MINIMO_NACIONAL (3) medios distintos (los del mismo dueño
//     cuentan uno); en las áreas chicas (AREAS_CHICAS), MINIMO_AREAS_CHICAS (2); sin cupos ni topes; lo muy contado va primero.
//
// Los dos números se cambian con las variables de GitHub MINIMO_NACIONAL y MINIMO_AREAS_CHICAS, sin tocar código (el valor de
// siempre vive en POPULARIDAD, ingesta/criterio.mjs, y en la tabla de CRITERIO-EDITORIAL.md). Una variable vacía, rota o fuera de
// 2 a 10 se ignora y vale el de siempre: nada de afuera sale con un solo medio, y el área chica nunca pide más que el resto.
//
// Sin dependencias: sólo lo que trae Node.

import { POPULARIDAD, AREAS_CHICAS, SECCIONES_SOLO_DE_ACA } from './criterio.mjs';
import { noEsNoticiaAunqueLaCuentenTodos } from './muy-contada.mjs';

/** Un número entero de 2 a 10 de una variable de entorno; si no hay o no sirve, `porDefecto`. */
function numeroDeLaVariable(nombre, porDefecto) {
  const crudo = String(globalThis.process?.env?.[nombre] ?? '').trim();
  if (!/^\d{1,2}$/.test(crudo)) return porDefecto;
  const n = Number(crudo);
  return n >= 2 && n <= 10 ? n : porDefecto;
}

/** Cuántos medios distintos tienen que contar lo nacional (variable MINIMO_NACIONAL; por defecto POPULARIDAD.minimoNacional). */
export const minimoNacional = () => numeroDeLaVariable('MINIMO_NACIONAL', POPULARIDAD.minimoNacional);

/** Cuántos, en las áreas chicas (variable MINIMO_AREAS_CHICAS; nunca más que el nacional). */
export const minimoAreasChicas = () => Math.min(numeroDeLaVariable('MINIMO_AREAS_CHICAS', POPULARIDAD.minimoAreasChicas), minimoNacional());

/** ¿Es una de las áreas donde suele haber poco (piden menos medios que el resto)? */
export const esAreaChica = (seccion) => AREAS_CHICAS.includes(seccion);

/** ¿Es una sección sólo de Balcarce y la zona (Policiales)? Lo de afuera no sale solo ahí. */
export const esSeccionSoloDeAca = (seccion) => SECCIONES_SOLO_DE_ACA.includes(seccion);

/** Cuántos medios distintos tienen que contar una nota de AFUERA de esta sección para que salga sola. */
export function mediosMinimos(seccion) {
  return esAreaChica(seccion) ? minimoAreasChicas() : minimoNacional();
}

// ------------------------------------------------------------------ el control de calidad

// Lo que no es noticia aunque lo cuenten dos medios: el pronóstico de otra ciudad, "dónde ver", el horóscopo, "en vivo".
// Se mira sólo el título. La lista es la de las muy contadas (ingesta/muy-contada.mjs: pronóstico, "el tiempo en", "clima en",
// alertas del tiempo…), más la temperatura de un lugar ("temperaturas en Tucumán", "el clima para el fin de semana"). Las lluvias
// o el calor como hecho (una sequía, una ola de calor) sí son noticia y no se tocan.
const SERVICIO_DEL_TIEMPO = /\b(el clima|clima|temperaturas?)\s+(en|para)\s+/;
const plano = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ%°\s]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * El control de calidad de lo que sale con menos medios que el mínimo nacional (el de un área chica). Devuelve el motivo por el
 * que NO pasa, o null si pasa. La IA aparte saca los chimentos y la publicidad (aplicarFichas), y el semáforo, lo sensible: acá
 * sólo lo que se reconoce por el título.
 */
export function controlDeCalidad(nota = {}) {
  const titulo = String(nota.titulo ?? '');
  if (noEsNoticiaAunqueLaCuentenTodos(titulo)) return 'es de las que no son noticia (dónde ver, en vivo, horóscopo, cotización, alerta del tiempo)';
  const t = plano(titulo);
  if (SERVICIO_DEL_TIEMPO.test(t) && !/\bbalcarce\b/.test(t) && !nota.nombraBalcarce) return 'es el tiempo de otra ciudad';
  return null;
}

/**
 * ¿Llega esta nota de afuera a la popularidad que pide? Devuelve { llega, minimo, motivo? }:
 *   · con el mínimo nacional de medios o más, llega (no hay control de calidad: es lo de siempre);
 *   · con el mínimo de su sección (el de un área chica), llega si pasa el control de calidad;
 *   · con menos, no.
 *
 * @param {object} nota   con `seccion` y `titulo`
 * @param {number} medios cuántos medios distintos la cuentan (los del mismo dueño, uno)
 */
export function popularidadDe(nota, medios, { seccion = nota?.seccion } = {}) {
  const minimo = mediosMinimos(seccion);
  if (medios >= minimoNacional()) return { llega: true, minimo };
  if (medios < minimo) return { llega: false, minimo };
  const falla = controlDeCalidad(nota);
  return falla ? { llega: false, minimo, motivo: falla } : { llega: true, minimo };
}

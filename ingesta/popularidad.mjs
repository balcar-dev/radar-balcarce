// La popularidad: cuántos medios distintos tienen que contar lo de afuera para que salga (regla 215, 17/10/2026).
//
// Hernán: "dejá todos los criterios que tenemos antes de lado. NO HAY NINGÚN CUPO DE NADA. Tiene que entrar todo lo nacional
// solo en base a las notas más relevantes, las que más fuentes tienen a la vez, y en todo caso que entre en las áreas donde
// suele haber poco. La idea es que tengamos unas 100 notas por día y SIN TOPE de Balcarce."
//
// Esto reemplaza dos cosas que había hasta el 17/10: los medios que pedía cada sección (4, 3 o 2, y 2 con una figura) y el cupo
// de notas de afuera por sección. Queda una sola idea, que se explica en una línea:
//
//   · lo de afuera sale si lo cuentan `mediosPorDefecto` (3) medios distintos (los del mismo dueño cuentan uno);
//   · en las áreas donde suele haber poco (AREAS_CHICAS) alcanzan 2;
//   · una fuente especializada de esas áreas alcanza sola si la IA la considera de interés;
//   · si el día va flojo (ritmoDelDia), lo genérico baja de 3 a 2 hasta alcanzar el ritmo; si sobra, no hay tope.
//
// Los números viven en ingesta/criterio.mjs (POPULARIDAD) y en la tabla de CRITERIO-EDITORIAL.md. Lo de Balcarce, lo oficial y
// las notas propias no pasan por acá: entran todo, como siempre.
//
// Sin dependencias: sólo lo que trae Node.

import { POPULARIDAD, AREAS_CHICAS, SECCIONES_SOLO_DE_ACA } from './criterio.mjs';
import { minutoDelDiaAR, diaAR } from './zona.mjs';
import { noEsNoticiaAunqueLaCuentenTodos } from './muy-contada.mjs';

/** ¿Es una de las áreas donde suele haber poco (piden 2 medios y no 3)? */
export const esAreaChica = (seccion) => AREAS_CHICAS.includes(seccion);

/** ¿Es una sección sólo de Balcarce y la zona (Policiales)? Lo de afuera no sale solo ahí. */
export const esSeccionSoloDeAca = (seccion) => SECCIONES_SOLO_DE_ACA.includes(seccion);

/** La importancia que la lectura con IA tiene que dar para que una fuente especializada de un solo medio salga. */
export const IMPORTANCIAS_DE_INTERES = ['alta', 'media'];

// ------------------------------------------------------------------ el ritmo del día

/**
 * Cuántas noticias tendrían que estar publicadas a esta hora: `notasPorDia` repartidas de forma pareja entre
 * `ritmoDesdeHora` y `ritmoHastaHora` (hora de Balcarce). Antes de la hora de arranque, cero; después de la de cierre, todas.
 * Es una recta a propósito: se explica en una línea y no hay que adivinar cuándo llegan las noticias.
 */
export function esperadasA(ahora = new Date(), { objetivo = POPULARIDAD.notasPorDia } = {}) {
  const desde = POPULARIDAD.ritmoDesdeHora * 60;
  const hasta = POPULARIDAD.ritmoHastaHora * 60;
  const fraccion = Math.min(1, Math.max(0, (minutoDelDiaAR(ahora) - desde) / (hasta - desde)));
  return objetivo * fraccion;
}

/**
 * Cuántas noticias (no las propias: clima, dólar, repasos…) salieron hoy: las que se vieron por primera vez en el día de
 * Balcarce de `ahora`. Es la misma cuenta de la estadística diaria (ingesta/estadistica-diaria.mjs).
 */
export function publicadasHoy(notas = [], ahora = new Date()) {
  const dia = diaAR(ahora);
  const vistas = new Set();
  let cuantas = 0;
  for (const n of notas) {
    if (!n || n.propia || (n.id && vistas.has(n.id))) continue;
    if (n.id) vistas.add(n.id);
    const t = new Date(n.visto ?? n.fecha ?? '');
    if (Number.isFinite(t.getTime()) && diaAR(t) === dia) cuantas += 1;
  }
  return cuantas;
}

/**
 * ¿Va faltando para el ritmo del día? { publicadasHoy, esperadas, vaFaltando }. Con `vaFaltando`, lo genérico de afuera pide
 * `mediosSiVaFaltando` (2) medios y no 3, hasta que alcance. No hay una regla para el otro lado: si sobra, no se saca nada.
 */
export function ritmoDelDia({ publicadas = 0, ahora = new Date() } = {}) {
  const esperadas = esperadasA(ahora);
  return { publicadasHoy: publicadas, esperadas: Math.round(esperadas), vaFaltando: publicadas < esperadas };
}

// ------------------------------------------------------------------ cuántos medios

/**
 * Cuántos medios distintos tienen que contar una nota de AFUERA de esta sección para que salga sola: 2 en las áreas donde suele
 * haber poco, 3 en el resto, y 2 en el resto si el día va faltando. Nunca menos de 2: con un solo medio sólo sale una fuente
 * especializada con el interés de la IA (`popularidadDe`).
 */
export function mediosMinimos(seccion, { vaFaltando = false } = {}) {
  if (esAreaChica(seccion)) return POPULARIDAD.mediosEnAreasChicas;
  return vaFaltando ? Math.min(POPULARIDAD.mediosPorDefecto, POPULARIDAD.mediosSiVaFaltando) : POPULARIDAD.mediosPorDefecto;
}

// ------------------------------------------------------------------ el control de calidad

// Lo que no es noticia aunque lo cuenten dos medios: el pronóstico de otra ciudad, "dónde ver", el horóscopo, "en vivo".
// Se mira sólo el título. La lista es la de las muy contadas (ingesta/muy-contada.mjs: pronóstico, "el tiempo en", "clima en",
// alertas del tiempo…), más la temperatura de un lugar ("temperaturas en Tucumán", "el clima para el fin de semana"). Las lluvias
// o el calor como hecho (una sequía, una ola de calor) sí son noticia y no se tocan.
const SERVICIO_DEL_TIEMPO = /\b(el clima|clima|temperaturas?)\s+(en|para)\s+/;
const plano = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ%°\s]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * El control de calidad de lo que sale por una vía más baja que la de siempre (2 medios por ser un área chica o por el ritmo, o
 * 1 de una fuente especializada). Devuelve el motivo por el que NO pasa, o null si pasa. La IA aparte saca los chimentos y la
 * publicidad (aplicarFichas), y el semáforo, lo sensible: acá sólo lo que se reconoce por el título.
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
 *   · con `mediosPorDefecto` medios o más, llega (no hay control de calidad: es lo de siempre);
 *   · con el mínimo de su sección (2 en un área chica, o por el ritmo), llega si pasa el control de calidad;
 *   · con un solo medio llega sólo una fuente especializada, en un área chica, que la IA marcó de interés
 *     (`nota.interesDeLaIA`, lo pone aplicarFichas) y que pasa el control de calidad.
 *
 * @param {object} nota   con `seccion`, `titulo`, `especializada`, `interesDeLaIA`
 * @param {number} medios cuántos medios distintos la cuentan (los del mismo dueño, uno)
 */
export function popularidadDe(nota, medios, { vaFaltando = false, seccion = nota?.seccion } = {}) {
  const minimo = mediosMinimos(seccion, { vaFaltando });
  if (medios >= POPULARIDAD.mediosPorDefecto) return { llega: true, minimo };
  const falla = controlDeCalidad(nota);
  if (medios >= minimo) return falla ? { llega: false, minimo, motivo: falla } : { llega: true, minimo };
  if (medios >= POPULARIDAD.mediosDeUnaFuenteEspecializada && nota?.especializada && esAreaChica(seccion) && nota.interesDeLaIA) {
    return falla ? { llega: false, minimo, motivo: falla } : { llega: true, minimo };
  }
  return { llega: false, minimo };
}

/** ¿Es una fuente especializada de un área chica que todavía espera que la IA diga si le interesa? */
export const esperaElInteres = (nota, medios, { seccion = nota?.seccion } = {}) => !!nota?.especializada && esAreaChica(seccion)
  && medios < mediosMinimos(seccion) && medios >= POPULARIDAD.mediosDeUnaFuenteEspecializada;

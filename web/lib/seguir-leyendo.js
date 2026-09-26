// "Seguí leyendo": las notas que se ofrecen al pie de una nota.
//
// Hernán y Andrés (25/09) vieron que el final de las notas no tenía criterio:
// dos notas de la misma visita de Santilli, notas sin la hora, la nota del
// dólar y una de hace 14 horas. La regla ahora es una sola:
//
//   · SIEMPRE hay cuatro (si el sitio tiene cuatro notas para ofrecer);
//   · todas cuentan historias distintas entre sí y de la nota que se lee;
//   · todas con su hora real, y de la más nueva a la más vieja;
//   · dos de la misma sección y dos de otras secciones (de secciones
//     distintas entre sí, si se puede);
//   · nunca una nota propia de servicio (el dólar, un repaso) mientras haya
//     otra cosa para ofrecer;
//   · si las últimas 72 horas no alcanzan, se completa con el archivo, con su
//     fecha real ("hace 5 días"), sólo notas con cuerpo.
//
// De una entrada y una salida, sin leer archivos: se prueba sin red.

import { mismaHistoria } from './texto.js';
import { tieneCuerpo } from './cuerpo.js';

export const CUANTAS_SIGUEN = 4;
export const DE_LA_MISMA_SECCION = 2;

const tiempo = (n) => new Date(n?.fecha).getTime() || 0;
const masNueva = (a, b) => tiempo(b) - tiempo(a);
const conHora = (n) => !n.sinFecha && Number.isFinite(new Date(n.fecha).getTime());

/**
 * Elige de `candidatas` hasta `cuantas` que no repitan historia con las
 * `elegidas` (ni con la nota actual), en orden de hora, con el tope de
 * secciones que se pida.
 */
function tomar(candidatas, elegidas, cuantas, { seccionesDistintas = false } = {}) {
  const nuevas = [];
  const secciones = new Set();
  for (const c of candidatas) {
    if (nuevas.length >= cuantas) break;
    if ([...elegidas, ...nuevas].some((e) => mismaHistoria(e, c))) continue;
    if (seccionesDistintas && secciones.has(c.seccion)) continue;
    secciones.add(c.seccion);
    nuevas.push(c);
  }
  return nuevas;
}

/**
 * @param {object} nota      la que se está leyendo
 * @param {object[]} recientes  las notas de la portada (últimas 72 horas)
 * @param {object[]} [archivo]  las archivadas (más viejas), con su cuerpo
 * @param {number} [cuantas]
 */
export function seguirLeyendo(nota, recientes = [], archivo = [], cuantas = CUANTAS_SIGUEN) {
  const yaEn = new Set([nota.id]);
  const unicas = (lista) => lista.filter((n) => {
    if (!n?.id || yaEn.has(n.id)) return false;
    yaEn.add(n.id);
    return true;
  });
  const propia = (n) => Boolean(n.propia);
  const dePortada = unicas(recientes).sort(masNueva);
  const delArchivo = unicas(archivo.filter((n) => tieneCuerpo(n))).sort(masNueva);

  // De mejor a peor candidata: con hora y no propia, de la portada primero; después
  // las del archivo; al final lo que no cumple (sin hora, o de servicio).
  const buenas = (lista) => lista.filter((n) => conHora(n) && !propia(n));
  const escalones = [
    buenas(dePortada),
    buenas(delArchivo),
    dePortada.filter((n) => conHora(n) && propia(n)),
    dePortada.filter((n) => !conHora(n)),
  ];
  const yaDistintas = (lista) => lista.filter((n) => !mismaHistoria(nota, n));

  let elegidas = [];
  for (const escalon of escalones) {
    const pool = yaDistintas(escalon);
    const faltan = cuantas - elegidas.length;
    if (faltan <= 0) break;
    const mismaSec = elegidas.filter((n) => n.seccion === nota.seccion).length;
    const otras = elegidas.length - mismaSec;
    const cupoMisma = Math.max(0, DE_LA_MISMA_SECCION - mismaSec);
    const cupoOtras = Math.max(0, cuantas - DE_LA_MISMA_SECCION - otras);

    const deSeccion = tomar(pool.filter((n) => n.seccion === nota.seccion), [nota, ...elegidas], Math.min(cupoMisma, faltan));
    const deOtras = tomar(pool.filter((n) => n.seccion !== nota.seccion), [nota, ...elegidas, ...deSeccion], Math.min(cupoOtras, faltan - deSeccion.length), { seccionesDistintas: true });
    elegidas = [...elegidas, ...deSeccion, ...deOtras];

    // Si una de las dos mitades no llenó su cupo, la otra completa.
    const aun = cuantas - elegidas.length;
    if (aun > 0) elegidas = [...elegidas, ...tomar(pool, [nota, ...elegidas], aun)];
  }
  return elegidas.sort(masNueva);
}

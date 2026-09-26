// ¿La nota tiene cuerpo de verdad?
//
// Regla del 25/09, a pedido de Hernán y Andrés: una nota automática (la que
// sale sin que una persona la mire) sólo se publica si tiene CUERPO: el
// desarrollo de la nota, de al menos 70 palabras y distinto de la bajada. Ese
// día 42 de las 89 notas de la portada se publicaron con el título y la
// bajada nada más, y todo lo que se armó para elaborar las notas (qué se
// sabe, fuentes, verificación) no servía de nada si la nota no estaba
// escrita. Sin cuerpo, la nota queda "esperando cuerpo": no aparece en la
// portada, las secciones, el feed, el sitemap ni las redes.
//
// Lo usan web/scripts/generar-datos.mjs (qué se publica), reels/reescritura.mjs
// (qué se reusa de una corrida anterior), redes/elegir.mjs (qué sale en las
// redes) y la página de la nota. Sólo importa ./texto.js, que no importa
// nada: lo lee también redes/, que no puede depender de nada de afuera de Node.

import { sinTildes } from './texto.js';

/** Cuántas palabras tiene que tener el cuerpo, como mínimo. La instrucción a
 *  la IA pide de 100 a 180. */
export const PALABRAS_MINIMAS_CUERPO = 70;

/** Cuántas palabras tiene un texto (letras o números seguidos). */
export function palabrasDe(texto) {
  return (String(texto ?? '').match(/[\p{L}\p{N}]+/gu) ?? []).length;
}

const plano = (s) => sinTildes(s)
  .replace(/[^a-z0-9ñ]+/g, ' ')
  .trim();

/**
 * ¿Tiene cuerpo de verdad? Al menos 70 palabras y que no arranque repitiendo
 * la bajada (el verificador ya controla, al escribirlo, que el primer párrafo
 * no la diga de nuevo; esto es la red de seguridad al publicar).
 */
export function tieneCuerpo(nota) {
  const cuerpo = String(nota?.cuerpo ?? '').trim();
  if (palabrasDe(cuerpo) < PALABRAS_MINIMAS_CUERPO) return false;
  const copete = plano(nota?.copete);
  if (copete && plano(cuerpo) === copete) return false;
  if (copete.length >= 40 && plano(cuerpo).startsWith(copete.slice(0, 60))) return false;
  return true;
}

/**
 * ¿Esta nota de la portada salió sola y no tiene cuerpo? Es la que no puede ir
 * a ninguna lista ni a las redes. Lo que publicó una persona desde el panel
 * (`como: 'publicada'`) se respeta aunque no tenga cuerpo.
 */
export function esperaCuerpo(nota) {
  return nota?.como === 'automatica' && !tieneCuerpo(nota);
}

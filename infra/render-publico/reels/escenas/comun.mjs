// Lo que comparten todas las escenas animadas (8/10/2026, "una sola estética"; docs/propuestas/PLANTILLAS-DE-PIEZAS.md).
//
// Una escena es una función `cuadro(t, duracion)` que devuelve el dibujo entero de la pieza (un SVG de 1080 x 1920) en el segundo `t`.
// Todo se calcula cuadro a cuadro (sin zoom ni nada que tiemble: regla 90): el texto entra una vez y queda quieto; el movimiento continuo es
// sólo del fondo (nubes, lluvia, estrellas…). La firma, la raya y la zona segura son las de las placas (reels/placa.mjs).

import {
  ANCHO, ALTO, COLORES, esc, lienzo, pie,
} from '../placa.mjs';

export const W = ANCHO;
export const H = ALTO;
/** Cuadros por segundo de una escena: lo que se mueve es lento, 20 alcanzan y el armado tarda menos. */
export const FPS_ESCENA = 20;

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const easeOut = (x) => 1 - (1 - clamp(x)) ** 3;
export const easeInOut = (x) => { const v = clamp(x); return v < 0.5 ? 4 * v ** 3 : 1 - ((-2 * v + 2) ** 3) / 2; };

/** Cuánto entró algo que empieza en `desde` y tarda `dur` (0 a 1, con freno al final). */
export const entra = (t, desde, dur = 0.6) => easeOut(prog(t, desde, desde + dur));

/** Un grupo que aparece desde `desde`: sube `dy` píxeles (o se corre `dx`) mientras se aclara. Al terminar queda exactamente en su lugar. */
export function aparece(t, desde, contenido, { dx = 0, dy = 34, dur = 0.6 } = {}) {
  const a = entra(t, desde, dur);
  if (a <= 0) return '';
  if (a >= 1) return contenido;
  return `<g opacity="${a.toFixed(3)}" transform="translate(${((1 - a) * dx).toFixed(2)} ${((1 - a) * dy).toFixed(2)})">${contenido}</g>`;
}

/** Un número pseudoaleatorio estable (para que la lluvia y las estrellas caigan siempre en los mismos lugares). */
export function azar(semilla) {
  const x = Math.sin(semilla * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** El lienzo con su fondo de papel: `fondo` y `contenido` van adentro, el pie siempre al final. */
export function escenaSobrePapel({ fondo = '', contenido = '', defs = '' }) {
  return lienzo(`${defs ? `<defs>${defs}</defs>` : ''}${fondo}${contenido}${pie()}`);
}

export { COLORES, esc, pie };

/** Un objeto con lo mínimo que necesita armarReel para una escena. */
export function crearEscena({ nombre, variante, cuadro, duracionMinima = 10 }) {
  return { nombre, variante, cuadro, duracionMinima, fps: FPS_ESCENA };
}

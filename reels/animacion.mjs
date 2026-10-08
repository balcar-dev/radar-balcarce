// La animación de las piezas (8/10/2026, "videos animados y unificados", aprobado): ninguna pieza queda con la imagen fija.
//
// Una sola estética para todas, calculada cuadro a cuadro sobre las mismas placas (reels/placa.mjs): el fondo y la firma de abajo ya
// están, y cada bloque de la pieza (el rótulo, el título, las tarjetas, cada renglón de una lista) entra de a uno, subiendo unos
// pocos píxeles y apareciendo. Cuando termina de entrar, el cuadro es EXACTAMENTE la placa de siempre: no hay zoom ni nada que
// tiemble después (regla 90, 30/09). Una barra roja avanza abajo durante toda la pieza (se agrega en ffmpeg, reels/reel.mjs).
//
// Este archivo es de dibujo puro (texto SVG adentro, texto SVG afuera): se prueba sin ffmpeg ni resvg. Los cuadros se convierten a
// imagen en `renderizarEntrada`, que carga el conversor recién ahí (como aPng).

import fs from 'node:fs';
import path from 'node:path';
import { archivosDeFuente } from './placa.mjs';

export const FPS = 30;

/** Cuánto tarda en entrar cada bloque, y cuánto se espera entre uno y el siguiente (como mucho; con muchos bloques se achica). */
export const ENTRADA = { duracion: 0.55, espera: 0.17, primero: 0.12, tope: 2.2, sube: 34 };

/** Desde esta fila para abajo está la firma de Radar Balcarce (Y_PIE de placa.mjs): aparece enseguida, sin subir. */
const FILA_DEL_PIE = 1470;

const ESTATICOS = new Set(['defs', 'style', 'clippath', 'lineargradient', 'radialgradient', 'filter', 'mask', 'pattern', 'title', 'desc']);

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const suave = (x) => 1 - (1 - clamp(x)) ** 3;

/**
 * Parte una placa en su apertura (`<svg …>`) y sus hijos de primer nivel, o devuelve null si no se puede (entonces la pieza va quieta,
 * como siempre: la animación nunca frena una pieza).
 */
export function partirSvg(svg) {
  const m = String(svg).match(/^\s*(<svg[^>]*>)([\s\S]*)<\/svg>\s*$/);
  if (!m) return null;
  const interior = m[2];
  const etiquetas = /<(\/?)([A-Za-z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  const hijos = [];
  let profundidad = 0;
  let inicio = -1;
  let e;
  while ((e = etiquetas.exec(interior))) {
    const [todo, cierra, , , autoCierra] = e;
    if (!cierra && profundidad === 0) inicio = e.index;
    if (cierra) profundidad -= 1;
    else if (!autoCierra) profundidad += 1;
    if (profundidad < 0) return null;
    if (profundidad === 0 && inicio >= 0) {
      hijos.push(interior.slice(inicio, e.index + todo.length));
      inicio = -1;
    }
  }
  if (profundidad !== 0 || !hijos.length) return null;
  return { apertura: m[1], hijos };
}

const nombreDe = (h) => (h.match(/^<([A-Za-z][\w:.-]*)/)?.[1] ?? '').toLowerCase();
const filaDe = (h) => {
  const y = h.match(/\sy="(-?\d+(?:\.\d+)?)"/);
  return y ? Number(y[1]) : null;
};
const esFondo = (h) => nombreDe(h) === 'rect' && /\swidth="(1080|100%)"/.test(h) && /\sheight="(1920|100%)"/.test(h);

/**
 * Qué hace cada hijo: 'fijo' (el fondo y lo que se referencia por nombre), 'pie' (la firma de abajo) o 'bloque' (entra de a uno,
 * en el orden en que está en la placa: lo de arriba primero).
 */
export function clasificar(hijos) {
  return hijos.map((h, i) => {
    if (ESTATICOS.has(nombreDe(h)) || (i === 0 && esFondo(h))) return { h, tipo: 'fijo' };
    const y = filaDe(h);
    if (y !== null && y >= FILA_DEL_PIE) return { h, tipo: 'pie' };
    return { h, tipo: 'bloque' };
  });
}

/** Cuánto empieza cada bloque (segundos), de modo que todo termine de entrar antes de `ENTRADA.tope`. */
export function esperas(cuantos) {
  if (cuantos <= 0) return [];
  const paso = cuantos > 1 ? Math.min(ENTRADA.espera, (ENTRADA.tope - ENTRADA.duracion - ENTRADA.primero) / (cuantos - 1)) : 0;
  return Array.from({ length: cuantos }, (_, i) => ENTRADA.primero + i * paso);
}

/** Cuánto dura la entrada de una placa, en segundos. */
export function duracionDeLaEntrada(partida) {
  const bloques = clasificar(partida.hijos).filter((c) => c.tipo === 'bloque').length;
  const e = esperas(bloques);
  return bloques ? e[e.length - 1] + ENTRADA.duracion : 0;
}

/** Cuántos cuadros hacen falta para mostrar la entrada entera. */
export const cuadrosDeLaEntrada = (partida) => Math.ceil(duracionDeLaEntrada(partida) * FPS) + 1;

/** La placa en el instante `t` (segundos desde que aparece). Pasada la entrada, es la placa original, sin ningún envoltorio. */
export function placaEn(partida, t) {
  const clases = clasificar(partida.hijos);
  const hay = clases.filter((c) => c.tipo === 'bloque').length;
  const demoras = esperas(hay);
  let k = 0;
  const partes = clases.map((c) => {
    if (c.tipo === 'fijo') return c.h;
    if (c.tipo === 'pie') {
      const a = suave(t / 0.4);
      return a >= 1 ? c.h : `<g opacity="${a.toFixed(3)}">${c.h}</g>`;
    }
    const p = suave((t - demoras[k++]) / ENTRADA.duracion);
    if (p >= 1) return c.h;
    if (p <= 0) return '';
    return `<g opacity="${p.toFixed(3)}" transform="translate(0 ${((1 - p) * ENTRADA.sube).toFixed(2)})">${c.h}</g>`;
  });
  return `${partida.apertura}${partes.join('\n')}</svg>`;
}

/**
 * Dibuja los cuadros de la entrada de una placa como imágenes numeradas (`<prefijo>000.png`…) y devuelve cuántos son. La última queda
 * igual a la placa quieta. Lanza si el conversor no está o la placa no se puede partir: quien llama sigue con la placa quieta.
 */
export async function renderizarEntrada(svg, dir, prefijo, { ancho = 1080 } = {}) {
  const partida = partirSvg(svg);
  if (!partida) throw new Error('la placa no se puede animar');
  const { Resvg } = await import('@resvg/resvg-js');
  fs.mkdirSync(dir, { recursive: true });
  const propias = archivosDeFuente();
  const n = cuadrosDeLaEntrada(partida);
  for (let i = 0; i < n; i += 1) {
    const r = new Resvg(placaEn(partida, i / FPS), {
      fitTo: { mode: 'width', value: ancho },
      font: { fontFiles: propias, loadSystemFonts: propias.length === 0, defaultFontFamily: 'Inter' },
    });
    fs.writeFileSync(path.join(dir, `${prefijo}${String(i).padStart(3, '0')}.png`), r.render().asPng());
  }
  return n;
}

// El collage de los repasos (1/10/2026, Hernán: "en las notas de los podcast, una imagen posta tipo collage").
//
// La nota de un repaso (web/lib/notas-propias.js) junta de dos a ocho notas del día. No tiene foto propia, pero cada
// nota que cuenta puede tener la suya en el banco (web/data/banco-fotos.json). Acá se arma una sola imagen con hasta
// cuatro de esas fotos, con un borde blanco entre una y otra, y la nota la lleva como foto: el crédito dice los medios
// de donde salieron (CLAUDE.md, "Las fotos": el crédito va debajo, nunca adentro de la imagen).
//
// Usa el ffmpeg que ya trae el proyecto (ffmpeg-static), igual que achicar-foto.mjs. Si algo falla, la nota se queda
// como estaba (sin foto): nunca lanza.

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CALIDAD_JPEG } from './achicar-foto.mjs';

const correr = promisify(execFile);

export const COLLAGE = { ancho: 1200, alto: 676, borde: 6, maximo: 4 };

/** Los rectángulos de cada foto según cuántas son: 2 lado a lado, 3 con una alta a la izquierda, 4 en cuadrícula. */
export function distribucion(cuantas, { ancho, alto } = COLLAGE) {
  const m = ancho / 2;
  const h = alto / 2;
  if (cuantas === 2) return [{ x: 0, y: 0, w: m, h: alto }, { x: m, y: 0, w: m, h: alto }];
  if (cuantas === 3) return [{ x: 0, y: 0, w: m, h: alto }, { x: m, y: 0, w: m, h }, { x: m, y: h, w: m, h }];
  if (cuantas >= 4) return [{ x: 0, y: 0, w: m, h }, { x: m, y: 0, w: m, h }, { x: 0, y: h, w: m, h }, { x: m, y: h, w: m, h }];
  return [];
}

/** El filtro de ffmpeg: cada foto recortada a su rectángulo (con el borde blanco) y todas juntas en un xstack. */
export function filtroDelCollage(cuantas, opciones = COLLAGE) {
  const cajas = distribucion(cuantas, opciones);
  const b = opciones.borde;
  const partes = cajas.map((c, i) => `[${i}:v]scale=${c.w - b}:${c.h - b}:force_original_aspect_ratio=increase,crop=${c.w - b}:${c.h - b},setsar=1,pad=${c.w}:${c.h}:${b / 2}:${b / 2}:white[v${i}]`);
  const entradas = cajas.map((_, i) => `[v${i}]`).join('');
  const lugares = cajas.map((c) => `${c.x}_${c.y}`).join('|');
  return `${partes.join(';')};${entradas}xstack=inputs=${cajas.length}:layout=${lugares}:fill=white[out]`;
}

/** Los argumentos de ffmpeg para armar el collage de esos archivos en `destino`. */
export function argumentosDelCollage(rutas, destino, opciones = COLLAGE) {
  return ['-y', ...rutas.flatMap((r) => ['-i', r]), '-filter_complex', filtroDelCollage(rutas.length, opciones),
    '-map', '[out]', '-frames:v', '1', '-q:v', String(CALIDAD_JPEG), destino];
}

async function ffmpegDelProyecto() {
  try { return (await import('ffmpeg-static')).default; } catch { return null; }
}

/**
 * Qué fotos usa el collage de un repaso: las de las notas que cuenta (en el orden del audio) que están en el banco y
 * existen en el disco, sin repetir archivo, hasta COLLAGE.maximo. [{ id, archivo, ruta, medio }]
 */
export function fotosDelRepaso(nota, banco = {}, carpeta, { existe = fs.existsSync, maximo = COLLAGE.maximo } = {}) {
  const salida = [];
  const vistos = new Set();
  for (const id of nota?.notasDelRepaso ?? []) {
    const b = banco[id];
    if (!b?.archivo || vistos.has(b.archivo)) continue;
    const ruta = path.join(carpeta, path.basename(b.archivo));
    if (!existe(ruta)) continue;
    vistos.add(b.archivo);
    salida.push({ id, archivo: b.archivo, ruta, medio: b.medio ?? null, credito: b.credito ?? null });
    if (salida.length >= maximo) break;
  }
  return salida;
}

/** "Fotos: Radio Gabal, Infobae y Clarín" (sin repetir y sin inventar medios que no se saben). */
export function creditoDelCollage(fotos = []) {
  const medios = [...new Set(fotos.map((f) => f.medio).filter(Boolean))];
  if (!medios.length) return 'Fotos de las notas del repaso';
  const lista = medios.length > 1 ? `${medios.slice(0, -1).join(', ')} y ${medios.at(-1)}` : medios[0];
  return `Fotos: ${lista}`;
}

/**
 * La foto de un repaso: `{ archivo, credito }` o null si ninguna nota que cuenta tiene foto. Con una sola foto se usa
 * esa tal cual; con dos o más, se arma el collage (collage-<id>.jpg en la carpeta de fotos, que se reutiliza si ya
 * estaba hecho). Nunca lanza.
 */
export async function collageDeRepaso(nota, { banco = {}, carpeta, ejecutar = correr, ffmpeg } = {}) {
  try {
    const fotos = fotosDelRepaso(nota, banco, carpeta);
    if (!fotos.length) return null;
    if (fotos.length === 1) return { archivo: fotos[0].archivo, credito: fotos[0].credito ?? creditoDelCollage(fotos) };
    const nombre = `collage-${nota.id}.jpg`;
    const destino = path.join(carpeta, nombre);
    const credito = creditoDelCollage(fotos);
    if (fs.existsSync(destino)) return { archivo: `fotos-notas/${nombre}`, credito };
    const programa = ffmpeg ?? await ffmpegDelProyecto();
    if (!programa) return null;
    await ejecutar(programa, argumentosDelCollage(fotos.map((f) => f.ruta), destino));
    return fs.existsSync(destino) ? { archivo: `fotos-notas/${nombre}`, credito } : null;
  } catch {
    return null;
  }
}

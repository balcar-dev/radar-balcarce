// La foto de cada nota de "Un día como hoy" (15/10/2026, Hernán: "la imagen no salió con nada en el medio").
//
// Todas las notas de efemérides llevan la misma ilustración de fondo (web/public/fotos-notas/efemeride-fondo.jpg, hecha con IA), con una
// hoja de almanaque en blanco en el centro. Acá se escribe sobre esa hoja el año (en grande) y la fecha de cada día, y queda una imagen
// por nota (efemeride-<día>.jpg). Cuando haya varias ilustraciones para rotar, se cambia la base y el resto sigue igual.
//
// Dibuja el texto con resvg (el de las placas) y lo superpone con el ffmpeg del proyecto (ffmpeg-static), igual que collage.mjs. Si algo falla, la nota se queda con la ilustración sin
// texto: nunca lanza.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CALIDAD_JPEG } from './achicar-foto.mjs';

const correr = promisify(execFile);

const AQUI = import.meta.dirname;
export const BASE_DE_EFEMERIDE = path.join(AQUI, '..', 'public', 'fotos-notas', 'efemeride-fondo.jpg');

/** Dónde está la hoja en blanco de la ilustración (1200 × 800): el centro y los renglones. */
export const HOJA = { centroX: 600, rotuloY: 205, anioY: 245, fechaY: 425 };

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Lo que se escribe sobre la hoja de una nota: { grande, fecha }. Un "día de…" sin año lleva el día en grande ("13 oct"). */
export function textosDeLaHoja({ dia, anio }) {
  const [, m, d] = String(dia ?? '').split('-').map(Number);
  if (!m || !d) return null;
  return {
    grande: anio ? String(anio) : `${d} ${MESES_CORTOS[m - 1]}`,
    fecha: `${d} de ${MESES[m - 1]}`,
  };
}

/** El escape de un texto para ponerlo adentro de un SVG. */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Los tres renglones sobre la hoja, como un SVG transparente de 1200 × 800 (el mismo tamaño de la ilustración). Se dibuja con el conversor de las
 * placas (resvg) y no con el filtro `drawtext` de ffmpeg: el ffmpeg de Linux que usa GitHub no lo trae (15/10: "No such filter: 'drawtext'").
 * Las posiciones son las de la hoja (HOJA); en SVG la y es la línea de base del texto.
 */
export function svgDeLaHoja({ grande, fecha }) {
  const x = HOJA.centroX;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <text x="${x}" y="${HOJA.rotuloY + 24}" text-anchor="middle" font-family="Inter" font-size="30" font-weight="700" letter-spacing="4" fill="#1F4FD8">UN DÍA COMO HOY</text>
  <text x="${x}" y="${HOJA.anioY + 150}" text-anchor="middle" font-family="Source Serif 4 60pt" font-size="170" font-weight="900" fill="#1D1A16">${esc(grande)}</text>
  <text x="${x}" y="${HOJA.fechaY + 32}" text-anchor="middle" font-family="Inter" font-size="40" font-weight="600" fill="#4A4338">${esc(fecha)}</text>
</svg>`;
}

/** Los argumentos de ffmpeg para poner el dibujo del texto (PNG transparente) sobre `base` y guardar el resultado en `destino`. */
export function argumentosDeLaFoto(base, textoPng, destino) {
  return ['-y', '-i', base, '-i', textoPng, '-filter_complex', '[0:v][1:v]overlay=0:0', '-frames:v', '1', '-q:v', String(CALIDAD_JPEG), destino];
}

async function dibujarSvg(svg, destino, ancho) {
  const { aPng } = await import('../../reels/placa.mjs');
  return aPng(svg, destino, ancho);
}

async function ffmpegDelProyecto() {
  try { return (await import('ffmpeg-static')).default; } catch { return null; }
}

/** El nombre del archivo de la foto de un día: efemeride-2026-10-14.jpg. */
export const archivoDeLaFoto = (dia) => `efemeride-${dia}.jpg`;

/**
 * Arma la foto de la nota de efemérides de un día (si no está ya en `carpeta`) y devuelve `{ archivo, credito }` para la nota, o null si no se
 * pudo (la nota se queda con la ilustración sin texto).
 */
export async function fotoDeEfemeride(nota, { carpeta, base = BASE_DE_EFEMERIDE, ejecutar = correr, ffmpeg = null, soloLasQueEstan = false, dibujar = dibujarSvg } = {}) {
  try {
    const textos = textosDeLaHoja({ dia: nota?.diaDeLaFoto, anio: nota?.anioDeLaFoto });
    if (!textos || !fs.existsSync(base)) return null;
    const nombre = archivoDeLaFoto(nota.diaDeLaFoto);
    const destino = path.join(carpeta, nombre);
    const foto = { archivo: `fotos-notas/${nombre}`, credito: nota.foto?.credito };
    if (fs.existsSync(destino)) return foto;
    if (soloLasQueEstan) return null;
    const exe = ffmpeg ?? await ffmpegDelProyecto();
    if (!exe) { console.warn('  efeméride: no hay ffmpeg para armar la foto'); return null; }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'efemeride-'));
    try {
      const textoPng = path.join(tmp, 'texto.png');
      await dibujar(svgDeLaHoja(textos), textoPng, 1200);
      fs.mkdirSync(carpeta, { recursive: true });
      await ejecutar(exe, argumentosDeLaFoto(base, textoPng, destino), { timeout: 60000 });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    if (fs.existsSync(destino) && fs.statSync(destino).size > 20000) return foto;
    console.warn(`  efeméride: ffmpeg no dejó la foto de ${nota.diaDeLaFoto}`);
    return null;
  } catch (e) {
    // Sin esto la causa se perdía (15/10: en GitHub la foto del día no se armaba y no había manera de ver por qué).
    console.warn(`  efeméride: no se pudo armar la foto de ${nota?.diaDeLaFoto}: ${String(e?.stderr || e?.message || e).replace(/\s+/g, ' ').slice(-400)}`);
    return null;
  }
}

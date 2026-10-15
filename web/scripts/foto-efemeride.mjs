// La foto de cada nota de "Un día como hoy" (15/10/2026, Hernán: "la imagen no salió con nada en el medio").
//
// Todas las notas de efemérides llevan la misma ilustración de fondo (web/public/fotos-notas/efemeride-fondo.jpg, hecha con IA), con una
// hoja de almanaque en blanco en el centro. Acá se escribe sobre esa hoja el año (en grande) y la fecha de cada día, y queda una imagen
// por nota (efemeride-<día>.jpg). Cuando haya varias ilustraciones para rotar, se cambia la base y el resto sigue igual.
//
// Usa el ffmpeg que ya trae el proyecto (ffmpeg-static), igual que collage.mjs. Si algo falla, la nota se queda con la ilustración sin
// texto: nunca lanza.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CALIDAD_JPEG } from './achicar-foto.mjs';

const correr = promisify(execFile);

const AQUI = import.meta.dirname;
const FUENTES = path.join(AQUI, '..', '..', 'reels', 'marca', 'fuentes');
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

/** Un camino adentro del filtro de ffmpeg: barras normales y los dos puntos de "D:" escapados. */
export const caminoParaElFiltro = (ruta) => String(ruta).replace(/\\/g, '/').replace(/:/g, '\\:');

/** El filtro de ffmpeg que escribe los tres renglones sobre la hoja. `archivos`: los .txt de cada renglón. */
export function filtroDeLaHoja(archivos, fuentes = FUENTES) {
  const f = (nombre) => caminoParaElFiltro(path.join(fuentes, nombre));
  const t = (ruta) => caminoParaElFiltro(ruta);
  const x = `${HOJA.centroX}-text_w/2`;
  return [
    `drawtext=fontfile='${f('Inter-700.ttf')}':textfile='${t(archivos.rotulo)}':fontsize=30:fontcolor=0x1F4FD8:x=${x}:y=${HOJA.rotuloY}`,
    `drawtext=fontfile='${f('SourceSerif4-900.ttf')}':textfile='${t(archivos.grande)}':fontsize=170:fontcolor=0x1d1a16:x=${x}:y=${HOJA.anioY}`,
    `drawtext=fontfile='${f('Inter-600.ttf')}':textfile='${t(archivos.fecha)}':fontsize=40:fontcolor=0x4a4338:x=${x}:y=${HOJA.fechaY}`,
  ].join(',');
}

/** Los argumentos de ffmpeg para escribir la hoja sobre `base` y guardar en `destino`. */
export function argumentosDeLaFoto(base, destino, archivos, fuentes = FUENTES) {
  return ['-y', '-i', base, '-vf', filtroDeLaHoja(archivos, fuentes), '-frames:v', '1', '-q:v', String(CALIDAD_JPEG), destino];
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
export async function fotoDeEfemeride(nota, { carpeta, base = BASE_DE_EFEMERIDE, ejecutar = correr, ffmpeg = null, soloLasQueEstan = false } = {}) {
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
      const archivos = {};
      for (const [clave, texto] of Object.entries({ rotulo: 'UN DÍA COMO HOY', grande: textos.grande, fecha: textos.fecha })) {
        archivos[clave] = path.join(tmp, `${clave}.txt`);
        fs.writeFileSync(archivos[clave], texto, 'utf8');
      }
      fs.mkdirSync(carpeta, { recursive: true });
      await ejecutar(exe, argumentosDeLaFoto(base, destino, archivos), { timeout: 60000 });
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

// Achicar las fotos del banco antes de guardarlas (29/09, auditoría del sitio).
//
// Las fotos se guardaban tal cual las baja el medio: hasta 3.778 x 2.126 y 1,6 a
// 1,8 MB cada una. Van a git cada media hora (unos 25 MB por día, cerca de 0,75 GB
// por mes de historial, y borrar la foto no achica el repositorio) y el lector las
// baja enteras aunque las vea a 335 px de ancho. Acá se pasan a JPEG de hasta 1.200
// px de ancho, que sobra para la nota y para las tarjetas de compartir.
//
// Usa el ffmpeg que ya trae el proyecto (ffmpeg-static). Si algo falla, devuelve
// null y quien llama se queda con la foto original: una foto pesada es mejor que
// ninguna. Nunca lanza.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const correr = promisify(execFile);

/** El ancho máximo de una foto guardada (px). */
export const ANCHO_MAXIMO_FOTO = 1200;
/** Calidad JPEG de ffmpeg (2 es la mejor, 31 la peor): 4 es casi como el original. */
export const CALIDAD_JPEG = 4;

async function ffmpegDelProyecto() {
  try {
    return (await import('ffmpeg-static')).default;
  } catch {
    return null;
  }
}

/**
 * Pasa una imagen (JPEG, PNG o WebP) a JPEG de hasta ANCHO_MAXIMO_FOTO de ancho.
 * Devuelve el Buffer nuevo, o null si no se pudo (sin ffmpeg, imagen rota…).
 * `ejecutar(ffmpeg, argumentos)` se puede reemplazar en las pruebas.
 */
export async function achicarFoto(bytes, { ejecutar = correr, ffmpeg = null } = {}) {
  const programa = ffmpeg ?? await ffmpegDelProyecto();
  if (!programa || !bytes?.length) return null;
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-foto-'));
  const entrada = path.join(carpeta, 'entrada');
  const salida = path.join(carpeta, 'salida.jpg');
  try {
    fs.writeFileSync(entrada, bytes);
    await ejecutar(programa, [
      '-y', '-v', 'error', '-i', entrada,
      '-vf', `scale='min(${ANCHO_MAXIMO_FOTO},iw)':-2`,
      '-frames:v', '1', '-q:v', String(CALIDAD_JPEG), salida,
    ]);
    const nueva = fs.readFileSync(salida);
    return nueva.length > 0 ? nueva : null;
  } catch {
    return null;
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
}

/**
 * Qué se guarda: la foto achicada si salió y pesa menos que la original; si no,
 * la original tal cual. Devuelve { bytes, ext } (ext sin punto) o null si la
 * original no tiene una extensión conocida.
 */
export async function fotoParaGuardar(original, extOriginal, { achicar = achicarFoto } = {}) {
  const chica = await achicar(original);
  if (chica && chica.length < original.length) return { bytes: chica, ext: 'jpg', achicada: true };
  return extOriginal ? { bytes: original, ext: extOriginal, achicada: false } : null;
}

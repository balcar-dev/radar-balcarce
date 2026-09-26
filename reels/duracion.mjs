// Cuánto dura un video y cómo se recorta una historia que se pasa.
//
// Una historia acepta 60 segundos como máximo (Instagram: "Max duration for
// stories is 61.0"; Facebook la rechaza también). Cada podcast se sube como reel
// y también como historia, y el de la noche del 25/09 duró 62,7 s: su historia
// falló en las dos redes (PENDIENTES 16a).
//
// Primero se evita al escribir el guion (redes/elegir.mjs, repasoConPresupuesto).
// Esto es la red de seguridad: si aun así el video pasa del máximo, se hace un
// segundo video, sólo para la historia, cortado con un fundido de salida. El
// reel queda entero.
//
// Acá va lo puro (se prueba sin ffmpeg); reels/reel.mjs es el que corre ffmpeg.

import { PODCAST_VOZ } from '../ingesta/criterio.mjs';

/** Lo más que dura una historia que subimos: dos segundos por debajo del límite de Meta. */
export const HISTORIA_MAXIMA = PODCAST_VOZ.segundosMaximoHistoria;

/** Cuánto dura el fundido de salida del corte, en segundos. */
export const FUNDIDO_DE_SALIDA = 1.2;

/** La duración que ffmpeg imprime al abrir un archivo ("Duration: 00:01:02.70"), en segundos, o null. */
export function duracionDeLaSalida(texto) {
  const m = String(texto).match(/Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** ¿Hay que recortar la historia? */
export const pasaDelMaximo = (duracion, maximo = HISTORIA_MAXIMA) => Number.isFinite(duracion) && duracion > maximo + 0.05;

/** Los argumentos de ffmpeg que cortan `entrada` en `maximo` segundos con fundido de audio y video. */
export function argumentosDeRecorte({
  entrada, salida, maximo = HISTORIA_MAXIMA, fundido = FUNDIDO_DE_SALIDA,
}) {
  const desde = (maximo - fundido).toFixed(2);
  return [
    '-y', '-i', entrada,
    '-t', String(maximo),
    '-vf', `fade=t=out:st=${desde}:d=${fundido}`,
    '-af', `afade=t=out:st=${desde}:d=${fundido}`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100',
    '-r', '30', '-movflags', '+faststart',
    salida,
  ];
}

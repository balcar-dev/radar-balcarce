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
/** Calidad JPEG de ffmpeg (2 es la mejor, 31 la peor). Era 4 (casi como el
 *  original); desde el 29/09 es 7: a ese tamaño no se nota la diferencia y cada
 *  foto pesa un 37 % menos (12 fotos del banco: 1,09 MB con 4, 0,68 MB con 7).
 *  Entran unas 50 por día, y cada una queda para siempre en el historial de git. */
export const CALIDAD_JPEG = 7;

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
 *
 * Sin extensión conocida (17/10/2026: una foto AVIF, GIF o "image/jpg" quedaba con "no se pudo volver a bajar la elegida", 13 notas en el
 * banco), sirve la versión achicada aunque pese más que la original: ffmpeg la pasó a JPEG, que es lo que la web sabe mostrar.
 */
export async function fotoParaGuardar(original, extOriginal, { achicar = achicarFoto } = {}) {
  const chica = await achicar(original);
  if (chica && (chica.length < original.length || !extOriginal)) return { bytes: chica, ext: 'jpg', achicada: true };
  return extOriginal ? { bytes: original, ext: extOriginal, achicada: false } : null;
}

// ------------------------------------------------- lo que se le manda a la IA (17/10/2026)

/** El lado más largo de la foto que se le manda a la IA para mirarla (px). Groq contestaba 413 con las fotos enteras (hasta 6 MB y 3.778 px:
 *  cuenta las imágenes como "tokens" y su tope es de 8.000 por minuto); a 1.024 px una foto son unos 800 y alcanzan para ver una marca. */
export const LADO_PARA_LA_IA = 1024;

/**
 * La foto achicada para mandarla a la IA: JPEG con el lado más largo de LADO_PARA_LA_IA como mucho (si ya es más chica, no se agranda).
 * Devuelve el Buffer o null si no se pudo (y entonces quien llama manda la original). Nunca lanza.
 */
export async function achicarParaIA(bytes, { ejecutar = correr, ffmpeg = null } = {}) {
  const programa = ffmpeg ?? await ffmpegDelProyecto();
  if (!programa || !bytes?.length) return null;
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-ia-'));
  const entrada = path.join(carpeta, 'entrada');
  const salida = path.join(carpeta, 'salida.jpg');
  try {
    fs.writeFileSync(entrada, bytes);
    const l = LADO_PARA_LA_IA;
    await ejecutar(programa, [
      '-y', '-v', 'error', '-i', entrada,
      '-vf', `scale='if(gt(iw,ih),min(${l},iw),-2)':'if(gt(iw,ih),-2,min(${l},ih))'`,
      '-frames:v', '1', '-q:v', '5', salida,
    ]);
    const nueva = fs.readFileSync(salida);
    return nueva.length > 0 ? nueva : null;
  } catch {
    return null;
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
}

// ------------------------------------------------- la huella de una foto (17/10/2026)
//
// Para saber si dos fotos son la misma aunque estén guardadas con otro tamaño o en otro formato: la foto se achica a 9 x 8 píxeles en gris y
// cada bit dice si un píxel es más claro que el de su derecha (un "dHash" de 64 bits, en 16 letras hexadecimales). La misma foto achicada,
// recomprimida o con otro nombre da la misma huella o una casi igual; dos fotos distintas, casi nunca.

/** Hasta cuántos bits distintos (de 64) dos huellas son de la misma foto. */
export const DISTANCIA_DE_LA_MISMA_FOTO = 8;

/** Los 72 bytes grises (9 x 8) → la huella en hexadecimal, o null si no son 72. */
export function huellaDePixeles(pixeles) {
  if (!pixeles || pixeles.length < 72) return null;
  let hex = '';
  for (let fila = 0; fila < 8; fila++) {
    let byte = 0;
    for (let x = 0; x < 8; x++) byte = (byte << 1) | (pixeles[fila * 9 + x] > pixeles[fila * 9 + x + 1] ? 1 : 0);
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

/** La huella de una foto (bytes de un JPEG, PNG o WebP), o null si no se pudo. Usa el ffmpeg del proyecto. Nunca lanza. */
export async function huellaDeFoto(bytes, { ejecutar = correr, ffmpeg = null } = {}) {
  const programa = ffmpeg ?? await ffmpegDelProyecto();
  if (!programa || !bytes?.length) return null;
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-huella-'));
  const entrada = path.join(carpeta, 'entrada');
  try {
    fs.writeFileSync(entrada, bytes);
    const { stdout } = await ejecutar(programa, [
      '-v', 'error', '-i', entrada, '-frames:v', '1', '-vf', 'scale=9:8:flags=area,format=gray', '-f', 'rawvideo', '-pix_fmt', 'gray', '-',
    ], { encoding: 'buffer', maxBuffer: 1024 * 1024 });
    return huellaDePixeles(Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout ?? ''));
  } catch {
    return null;
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
}

/** Cuántos bits distintos tienen dos huellas (64 si alguna falta o no se puede leer). */
export function distanciaDeHuellas(a, b) {
  if (!/^[0-9a-f]{16}$/.test(String(a ?? '')) || !/^[0-9a-f]{16}$/.test(String(b ?? ''))) return 64;
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}

/** ¿Las dos huellas son de la misma foto? */
export const mismaFoto = (a, b) => distanciaDeHuellas(a, b) <= DISTANCIA_DE_LA_MISMA_FOTO;

/**
 * Lo mínimo que pesa una foto de verdad ya achicada (4/10/2026): un logo o un dibujo plano pesa muy poco (el de La Vanguardia, 3.850 bytes; las fotos
 * más livianas del banco, 7.000). Por debajo de esto no se guarda ni se usa en un collage.
 */
export const PESO_MINIMO_DE_UNA_FOTO = 6000;

/**
 * El nombre de una foto que reemplaza a otra (W-8, 8/10/2026). Cloudflare y el navegador guardan las fotos una semana por su
 * dirección: si una foto nueva se guardara con el mismo nombre, durante días se seguiría viendo la vieja (justo la que se cambió
 * por tener una marca o un menor). Por eso cada reemplazo lleva un nombre nuevo: ID, ID-2, ID-3…
 * `ocupados` son los nombres que ya existen (en disco o en el banco), con o sin extensión.
 */
export function nombreDeFotoNueva(id, ocupados = []) {
  const usados = new Set([...ocupados].map((f) => String(f).split('/').pop().replace(/\.\w+$/, '')));
  if (!usados.has(id)) return id;
  let version = 2;
  while (usados.has(`${id}-${version}`)) version += 1;
  return `${id}-${version}`;
}

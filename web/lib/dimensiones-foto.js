// Cuánto mide una foto del banco, leyendo sólo la cabecera del archivo (16/10/2026).
//
// Se usa al compilar (los datos estructurados de cada nota declaran el tamaño real de la foto: Google pide 1200 px de ancho para Discover y
// no hay que prometer lo que no hay). Lee como mucho los primeros 64 KB de un JPEG o PNG; si el archivo no está acá (las fotos pueden ir a
// otro lado con FOTOS_BASE) o no se entiende, devuelve null y la foto simplemente no se declara.

import fs from 'node:fs';
import path from 'node:path';

// Dónde está web/public: al compilar se corre desde web/ y en las pruebas desde la raíz del repositorio. (No se usa import.meta.dirname: el
// empaquetador de Next lo deja sin definir y el compilado se cae.)
const carpetasPublicas = () => [path.join(process.cwd(), 'public'), path.join(process.cwd(), 'web', 'public')];

/** { ancho, alto } de un buffer JPEG o PNG; null si no es ninguno de los dos. */
export function medirImagen(b) {
  if (!b || b.length < 12) return null;
  // PNG: 8 bytes de firma, y el IHDR trae ancho y alto.
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return b.length < 24 ? null : { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const marca = b[i + 1];
    if (marca === 0xd8 || marca === 0x01 || (marca >= 0xd0 && marca <= 0xd7)) { i += 2; continue; }
    // SOF0 a SOF15, menos DHT (C4), JPG (C8) y DAC (CC): ahí está el tamaño.
    if (marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc) {
      return { alto: b.readUInt16BE(i + 5), ancho: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

const memoria = new Map();

/** Lo que mide la foto `archivo` ("fotos-notas/ID.jpg") dentro de web/public; null si no se puede saber. */
export function dimensionesDeFoto(archivo) {
  const clave = String(archivo ?? '');
  if (!/^fotos-notas\/[A-Za-z0-9._-]+$/.test(clave)) return null;
  if (memoria.has(clave)) return memoria.get(clave);
  let medida = null;
  try {
    const carpeta = carpetasPublicas().find((c) => fs.existsSync(path.join(c, clave)));
    if (!carpeta) { memoria.set(clave, null); return null; }
    const fd = fs.openSync(path.join(carpeta, clave), 'r');
    try {
      const buf = Buffer.alloc(65536);
      const n = fs.readSync(fd, buf, 0, buf.length, 0);
      medida = medirImagen(buf.subarray(0, n));
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    medida = null;
  }
  memoria.set(clave, medida);
  return medida;
}

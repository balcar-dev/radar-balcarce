// Sumar a mano la foto de una nota (2/10/2026, pestaña Fotos del panel del celular).
//
//   FOTO_URL=https://… FOTO_CREDITO="Municipalidad de Balcarce" FOTO_POR=Hernán node web/scripts/foto-manual.mjs --id=1knptpr
//
// Lo corre el workflow "Panel del celular" (accion=foto). Baja la imagen, la achica como las del banco (1.200 px, JPEG),
// la guarda en web/public/fotos-notas/<id>.jpg y la anota en web/data/fotos-manuales.json, que generar-datos suma al banco
// (y que ninguna otra corrida escribe, para no chocar con "Actualizar la web"). La decisión de que la foto no tenga marca
// de otro medio ni menores es de la persona (lo confirmó en el panel): lo que publica una persona se respeta.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fotoParaGuardar } from './achicar-foto.mjs';
import { urlDeFotoValida, creditoDeFoto } from '../public/panel/fotos.js';

const RAIZ = path.join(import.meta.dirname, '..');
export const ARCHIVO_MANUALES = path.join(RAIZ, 'data', 'fotos-manuales.json');
export const CARPETA_FOTOS = path.join(RAIZ, 'public', 'fotos-notas');
export const TAMANO_MAXIMO = 12 * 1024 * 1024;
const EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export const idValido = (id) => /^[a-z0-9]{3,20}$/.test(String(id ?? ''));

/** Baja la imagen. Lanza un Error con el motivo, en castellano, si no se puede. */
export async function bajarImagen(url, { fetchFn = fetch } = {}) {
  if (!urlDeFotoValida(url)) throw new Error('La dirección de la imagen no sirve (tiene que empezar con https://).');
  const res = await fetchFn(url, { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; RadarBalcarceBot/1.0)' } });
  if (!res.ok) throw new Error(`El sitio contestó ${res.status} al bajar la imagen.`);
  const mime = String(res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!EXTENSION[mime]) throw new Error(`Eso no es una foto que sirva (${mime || 'sin tipo'}): tiene que ser JPG, PNG o WebP. Copiá la dirección de la imagen, no la de la página.`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > TAMANO_MAXIMO) throw new Error('La imagen pesa demasiado (más de 12 MB).');
  if (bytes.length < 2000) throw new Error('La imagen es demasiado chica.');
  return { bytes, ext: EXTENSION[mime] };
}

/** Un libro nuevo con la foto de la nota. */
export const conFotoManual = (libro, id, entrada) => ({ ...(libro ?? {}), [id]: entrada });

export async function sumarFoto({ id, url, credito, por, ahora = new Date() }, {
  fetchFn = fetch, achicar, carpeta = CARPETA_FOTOS, archivo = ARCHIVO_MANUALES,
} = {}) {
  if (!idValido(id)) throw new Error('La nota no es válida.');
  const cred = creditoDeFoto(credito);
  if (!cred) throw new Error('Falta el crédito de la foto.');
  const { bytes, ext } = await bajarImagen(url, { fetchFn });
  const guardar = await fotoParaGuardar(bytes, ext, achicar ? { achicar } : {});
  const nombre = `${id}.${guardar.ext}`;
  fs.mkdirSync(carpeta, { recursive: true });
  fs.writeFileSync(path.join(carpeta, nombre), guardar.bytes);
  const libro = fs.existsSync(archivo) ? JSON.parse(fs.readFileSync(archivo, 'utf8')) : {};
  const entrada = {
    archivo: `fotos-notas/${nombre}`, medio: cred.replace(/^Foto:\s*/, ''), credito: cred, licencia: null, origen: 'manual',
    por: String(por ?? '').slice(0, 30), cuando: ahora.toISOString(), imagenOriginal: String(url).trim().slice(0, 500),
  };
  fs.writeFileSync(archivo, `${JSON.stringify(conFotoManual(libro, id, entrada), null, 1)}\n`, 'utf8');
  return entrada;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const id = (process.argv.find((a) => a.startsWith('--id=')) ?? '').slice(5);
  try {
    const e = await sumarFoto({ id, url: process.env.FOTO_URL, credito: process.env.FOTO_CREDITO, por: process.env.FOTO_POR });
    console.log(`Foto sumada a la nota ${id}: ${e.archivo}`);
  } catch (e) {
    console.error(`No se pudo sumar la foto: ${e.message}`);
    process.exit(1);
  }
}

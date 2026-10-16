// Cuenta los archivos del sitio ya compilado (web/out) y avisa si se acerca al tope de Cloudflare Pages: 20.000 archivos por despliegue (regla 148).
// Nunca frena el armado: sólo escribe un aviso (y, en GitHub Actions, una anotación amarilla) a partir de 16.500, y uno rojo a partir de 18.000.
// 15/10/2026: se midió un armado real con Next 15 (docs/salud-tecnica/ARCHIVO-PERMANENTE.md, § 1): unos 400 archivos de base más unos 4,2
// por cada nota con página. Con el tope de 3.700 notas (MAXIMO_EN_ARCHIVO, web/lib/archivo.js) da unos 15.900, el 80% del tope de Cloudflare.
// Por eso el aviso arranca en 16.500: si el sitio lleno de notas ya está en 15.900, avisar antes sería avisar todo el tiempo; pasar de
// 16.500 quiere decir que la cuenta se quedó corta (más fotos, más imágenes) y hay que revisar el tope de notas.
// Se corre al final de `npm run build`.

// 16/10/2026 (archivo permanente): sólo cuenta lo que sube a Pages. Las notas que ya salieron del sitio y viven en el depósito R2
// (web/scripts/archivar-a-r2.mjs) NO cuentan para los 20.000 archivos; su cuenta la da el Worker en /_archivo/estado y la anota el vigilante.
// Dice además cuántas notas tiene el sitio y con qué tope (topeDeNotas: MAXIMO_EN_ARCHIVO o la variable TOPE_DE_NOTAS, si el archivo está prendido).

import fs from 'node:fs';
import path from 'node:path';
import { topeDeNotas, MAXIMO_EN_ARCHIVO } from '../lib/archivo.js';

export const TOPE_DE_CLOUDFLARE = 20000;
export const AVISO_DESDE = 16500;
export const ALERTA_DESDE = 18000;

/** Lo medido el 15/10/2026: archivos fijos del sitio (Next, escudos, panel, agenda, buscador) y archivos que suma cada nota con página. */
export const ARCHIVOS_DE_BASE = 400;
export const ARCHIVOS_POR_NOTA = 4.2;

/** Cuántos archivos tendría el sitio con tantas notas con página (la cuenta con la que se eligió el tope de notas). */
export function archivosEstimados(notas) {
  return Math.round(ARCHIVOS_DE_BASE + ARCHIVOS_POR_NOTA * notas);
}

/** Cuántos archivos hay adentro de una carpeta (sin contar las carpetas). */
export function contarArchivos(carpeta) {
  let n = 0;
  const pendientes = [carpeta];
  while (pendientes.length) {
    const actual = pendientes.pop();
    for (const e of fs.readdirSync(actual, { withFileTypes: true })) {
      if (e.isDirectory()) pendientes.push(path.join(actual, e.name));
      else n += 1;
    }
  }
  return n;
}

/** Qué decir según la cantidad: null si hay margen. `tope` es el tope de notas con el que se arma el sitio. */
export function mensajeSegunCantidad(n, { tope = MAXIMO_EN_ARCHIVO } = {}) {
  const cuenta = `unos ${archivosEstimados(tope).toLocaleString('es-AR')} con ${tope.toLocaleString('es-AR')} notas`;
  if (n >= ALERTA_DESDE) return { nivel: 'error', texto: `El sitio tiene ${n} archivos: está pegado al tope de Cloudflare Pages (${TOPE_DE_CLOUDFLARE}). Hay que pasar las fotos a R2 o bajar el tope de notas ya (con el archivo permanente prendido: la variable TOPE_DE_NOTAS; si no, MAXIMO_EN_ARCHIVO).` };
  if (n >= AVISO_DESDE) return { nivel: 'warning', texto: `El sitio tiene ${n} archivos de los ${TOPE_DE_CLOUDFLARE} que acepta Cloudflare Pages. Es más de lo que da la cuenta del tope de notas (${cuenta}): conviene revisar el tope o pasar las fotos a R2.` };
  return null;
}

/** Cuántas páginas de nota tiene el sitio compilado (web/out/nota/*.html). */
export function notasConPagina(salida) {
  const carpeta = path.join(salida, 'nota');
  return fs.existsSync(carpeta) ? fs.readdirSync(carpeta).filter((f) => f.endsWith('.html')).length : 0;
}

if (process.argv[1] && process.argv[1].endsWith('contar-archivos.mjs')) {
  const salida = path.join(import.meta.dirname, '..', 'out');
  if (!fs.existsSync(salida)) { console.log('Archivos: no hay web/out.'); process.exit(0); }
  const n = contarArchivos(salida);
  const { tope, aviso } = topeDeNotas(process.env);
  console.log(`Archivos del sitio: ${n} de ${TOPE_DE_CLOUDFLARE} (el tope de Cloudflare Pages). Notas con página en el sitio: ${notasConPagina(salida)} (tope ${tope}).`);
  if (aviso) console.log(`Tope de notas: ${aviso}.`);
  if (String(process.env.R2_ARCHIVO ?? '').trim()) console.log('Las notas que ya salieron del sitio están en el archivo permanente (R2) y no cuentan acá.');
  const m = mensajeSegunCantidad(n, { tope });
  if (m) {
    console.log(m.texto);
    if (process.env.GITHUB_ACTIONS) console.log(`::${m.nivel}::${m.texto}`);
  }
}

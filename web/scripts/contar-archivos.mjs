// Cuenta los archivos del sitio ya compilado (web/out) y avisa si se acerca al tope de Cloudflare Pages: 20.000 archivos por despliegue (regla 148).
// Nunca frena el armado: sólo escribe un aviso (y, en GitHub Actions, una anotación amarilla) a partir de 14.000, y uno rojo a partir de 18.000.
// Se corre al final de `npm run build`.

import fs from 'node:fs';
import path from 'node:path';

export const TOPE_DE_CLOUDFLARE = 20000;
export const AVISO_DESDE = 14000;
export const ALERTA_DESDE = 18000;

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

/** Qué decir según la cantidad: null si hay margen. */
export function mensajeSegunCantidad(n) {
  if (n >= ALERTA_DESDE) return { nivel: 'error', texto: `El sitio tiene ${n} archivos: está pegado al tope de Cloudflare Pages (${TOPE_DE_CLOUDFLARE}). Hay que pasar las fotos a R2 o bajar el archivo ya.` };
  if (n >= AVISO_DESDE) return { nivel: 'warning', texto: `El sitio tiene ${n} archivos de los ${TOPE_DE_CLOUDFLARE} que acepta Cloudflare Pages. Conviene planear el paso de las fotos a R2.` };
  return null;
}

if (process.argv[1] && process.argv[1].endsWith('contar-archivos.mjs')) {
  const salida = path.join(import.meta.dirname, '..', 'out');
  if (!fs.existsSync(salida)) { console.log('Archivos: no hay web/out.'); process.exit(0); }
  const n = contarArchivos(salida);
  console.log(`Archivos del sitio: ${n} de ${TOPE_DE_CLOUDFLARE} (el tope de Cloudflare Pages).`);
  const m = mensajeSegunCantidad(n);
  if (m) {
    console.log(m.texto);
    if (process.env.GITHUB_ACTIONS) console.log(`::${m.nivel}::${m.texto}`);
  }
}

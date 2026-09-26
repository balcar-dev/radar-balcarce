// Las redirecciones de las notas viejas (/nota/1tftag2) a las de ahora
// (/nota/titulo-en-guiones-1tftag2), armadas en el momento de compilar.
//
// Antes esto vivía en next.config.mjs, con `redirects()`: Next las servía
// en cada visita, con un servidor corriendo. Pero exportar el sitio como
// archivos estáticos puros (`output: 'export'`) no soporta `redirects()`:
// no hay servidor que las aplique.
//
// La solución no pierde nada: se escriben las mismas redirecciones, ya
// resueltas, en public/_redirects, que lo lee Cloudflare Pages.
//
//   node scripts/generar-redirects.mjs

import fs from 'node:fs';
import path from 'node:path';
import { leerJson } from '../../ingesta/json.mjs';
import { rutaDeNota } from '../lib/ruta.js';

const AQUI = import.meta.dirname;
const RAIZ = path.join(AQUI, '..');

// Cloudflare Pages acepta hasta 2.000 redirecciones fijas: las que pasan de
// ahí las ignora. Con el archivo de notas (lib/archivo.js) puede haber más
// notas que eso, así que van las más nuevas. Las demás no se pierden: la
// página 404 manda igual a la nota por su identificador (app/not-found.js),
// sólo que con un paso más en el navegador.
export const MAXIMO_REDIRECCIONES = 1900;

/**
 * /nota/ID → /nota/titular-ID, de las notas de la portada y del archivo, sin
 * repetir, de la más nueva a la más vieja.
 */
export function redireccionesDeNotas(portada, archivo = { notas: [] }, maximo = MAXIMO_REDIRECCIONES) {
  const vistos = new Set();
  const notas = [...(portada?.notas ?? []), ...(archivo?.notas ?? [])]
    .filter((n) => n?.id && !vistos.has(n.id) && vistos.add(n.id))
    .sort((a, b) => (new Date(b.fecha).getTime() || 0) - (new Date(a.fecha).getTime() || 0));
  return notas.slice(0, maximo).map((n) => ({
    origen: `/nota/${n.id}`,
    destino: rutaDeNota(n),
  }));
}

export function comoRedirectsDeCloudflare(redirecciones) {
  // Formato Netlify/Cloudflare: "origen destino código", una por línea. El
  // 301 es permanente, igual que el `permanent: true` que tenía Next.
  return `${redirecciones.map((r) => `${r.origen}  ${r.destino}  301`).join('\n')}\n`;
}

if (process.argv[1] && process.argv[1].endsWith('generar-redirects.mjs')) {
  const portada = leerJson(path.join(RAIZ, 'data', 'portada.json'), { notas: [] });
  const archivo = leerJson(path.join(RAIZ, 'data', 'archivo.json'), { notas: [] });
  const redirecciones = redireccionesDeNotas(portada, archivo);

  fs.mkdirSync(path.join(RAIZ, 'public'), { recursive: true });
  fs.writeFileSync(path.join(RAIZ, 'public', '_redirects'), comoRedirectsDeCloudflare(redirecciones), 'utf8');

  console.log(`  ${redirecciones.length} redirecciones (public/_redirects)`);
}

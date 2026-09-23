// Las redirecciones de las notas viejas (/nota/1tftag2) a las de ahora
// (/nota/titulo-en-guiones-1tftag2), armadas en el momento de compilar.
//
// Antes esto vivía en next.config.mjs, con `redirects()`: Next las servía
// en cada visita, con un servidor corriendo. Pero exportar el sitio como
// archivos estáticos puros (`output: 'export'`) — lo que permite subirlo a
// cualquier lado, no sólo a Vercel — no soporta `redirects()`: no hay
// servidor que las aplique.
//
// La solución no pierde nada: se escriben las mismas redirecciones, ya
// resueltas, en los dos formatos que entienden los hosts estáticos:
//
//   public/_redirects   lo lee Cloudflare Pages (y Netlify)
//   vercel.json          lo lee Vercel
//
// Mientras el sitio siga en Vercel, manda vercel.json. El día que se mude a
// Cloudflare Pages, manda _redirects. No hace falta elegir de antemano: los
// dos quedan listos, y cada host usa el que entiende.
//
//   node scripts/generar-redirects.mjs

import fs from 'node:fs';
import path from 'node:path';
import { rutaDeNota } from '../lib/ruta.js';

const AQUI = import.meta.dirname;
const RAIZ = path.join(AQUI, '..');

function leerJson(archivo, porDefecto) {
  try { return JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch { return porDefecto; }
}

export function redireccionesDeNotas(portada) {
  return (portada.notas ?? []).map((n) => ({
    origen: `/nota/${n.id}`,
    destino: rutaDeNota(n),
  }));
}

export function comoRedirectsDeCloudflare(redirecciones) {
  // Formato Netlify/Cloudflare: "origen destino código", una por línea. El
  // 301 es permanente, igual que el `permanent: true` que tenía Next.
  return `${redirecciones.map((r) => `${r.origen}  ${r.destino}  301`).join('\n')}\n`;
}

export function comoVercelJson(redirecciones) {
  return {
    redirects: redirecciones.map((r) => ({ source: r.origen, destination: r.destino, permanent: true })),
  };
}

if (process.argv[1] && process.argv[1].endsWith('generar-redirects.mjs')) {
  const portada = leerJson(path.join(RAIZ, 'data', 'portada.json'), { notas: [] });
  const redirecciones = redireccionesDeNotas(portada);

  fs.mkdirSync(path.join(RAIZ, 'public'), { recursive: true });
  fs.writeFileSync(path.join(RAIZ, 'public', '_redirects'), comoRedirectsDeCloudflare(redirecciones), 'utf8');
  fs.writeFileSync(path.join(RAIZ, 'vercel.json'), `${JSON.stringify(comoVercelJson(redirecciones), null, 2)}\n`, 'utf8');

  console.log(`  ${redirecciones.length} redirecciones (public/_redirects y vercel.json)`);
}

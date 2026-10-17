// Las redirecciones del sitio, armadas en el momento de compilar.
//
// Antes esto vivía en next.config.mjs, con `redirects()`: Next las servía
// en cada visita, con un servidor corriendo. Pero exportar el sitio como
// archivos estáticos puros (`output: 'export'`) no soporta `redirects()`:
// no hay servidor que las aplique. Se escriben ya resueltas en
// public/_redirects, que lo lee Cloudflare Pages.
//
//   node scripts/generar-redirects.mjs            antes de compilar: public/_redirects
//   node scripts/generar-redirects.mjs --paginas  después de compilar: las páginas de redirección que no entraron (out/nota/…)
//
// EL TOPE (17/10/2026, regla 191). Cloudflare Pages acepta 2.000 redirecciones fijas y 100 con comodines; las que pasan de ahí las IGNORA
// sin avisar. Hasta hoy se escribía una por cada nota (/nota/ID → /nota/titular-ID, ~45 por día), cortada en 1.900, más las de las
// repetidas y las secciones viejas por encima de ese corte: el 16/10 iban 1.419 y el archivo se llenaba hacia el 26/10. Pero la dirección
// corta /nota/ID sólo existió hasta el 20/09 (desde ahí cada nota nace con su titular en la dirección, web/lib/ruta.js): para las notas
// nuevas, esa redirección no la usa nadie. Ahora van, en este orden y sin pasar nunca de MAXIMO_REDIRECCIONES:
//
//   1. las secciones que ya no existen (fijas);
//   2. las notas repetidas que se unieron a otra (fusionadas.json): su dirección SÍ se publicó y puede estar compartida; las más nuevas
//      primero. Si alguna vez no entran todas, las que sobran no se pierden: se arma para cada una una página chica en su dirección vieja
//      que manda a la buena (canónica + meta refresh, lo que Google trata como una redirección permanente). No tiene tope;
//   3. las direcciones cortas /nota/ID de las notas de antes del 25/09 (las únicas que se pudieron compartir así), las más nuevas primero,
//      hasta donde entren.
//
// Lo demás que llegue a una dirección vieja lo sigue resolviendo la página 404, que busca el identificador del final en /nota/indice.json
// (app/not-found.js). Nunca se escribe una redirección cuyo origen sea una página que existe: Cloudflare la aplicaría igual y taparía la nota.

import fs from 'node:fs';
import path from 'node:path';
import { leerJson } from '../../ingesta/json.mjs';
import { rutaDeNota } from '../lib/ruta.js';
import { redireccionesDeFusionadas } from '../lib/repetidas.js';

const AQUI = import.meta.dirname;
const RAIZ = path.join(AQUI, '..');

/** Lo que acepta Cloudflare Pages en _redirects (las fijas; las de comodines son otras 100). */
export const TOPE_DE_CLOUDFLARE = 2000;
/** Cuántas se escriben como mucho, entre todas: un margen debajo del tope. */
export const MAXIMO_REDIRECCIONES = 1950;
/** Desde este día ninguna nota se publicó con la dirección corta /nota/ID (las direcciones con titular quedaron fijas el 25/09). */
export const FIN_DE_LAS_DIRECCIONES_CORTAS = '2026-09-25T00:00:00-03:00';

/**
 * /nota/ID → /nota/titular-ID, de las notas de la portada y del archivo, sin
 * repetir, de la más nueva a la más vieja. Con `hasta`, sólo las de antes de esa fecha.
 */
export function redireccionesDeNotas(portada, archivo = { notas: [] }, maximo = MAXIMO_REDIRECCIONES, { hasta = null } = {}) {
  const vistos = new Set();
  const limite = hasta ? Date.parse(hasta) : null;
  const notas = [...(portada?.notas ?? []), ...(archivo?.notas ?? [])]
    .filter((n) => n?.id && !vistos.has(n.id) && vistos.add(n.id))
    .filter((n) => limite === null || (Date.parse(n.fecha) < limite))
    .sort((a, b) => (new Date(b.fecha).getTime() || 0) - (new Date(a.fecha).getTime() || 0));
  return notas.slice(0, maximo).map((n) => ({
    origen: `/nota/${n.id}`,
    destino: rutaDeNota(n),
  }));
}

/**
 * Las secciones que ya no existen (27/09): Servicios se sumó a Balcarce y País
 * pasó a llamarse Argentina. Sus páginas estaban indexadas y compartidas; sin
 * esto daban 404. Van primero: son fijas y no dependen de las notas.
 */
export const SECCIONES_VIEJAS = [
  { origen: '/seccion/servicios', destino: '/seccion/balcarce' },
  { origen: '/seccion/pais', destino: '/seccion/argentina' },
];

/** La dirección de la página de una sección por su nombre (las once), o null. Una prueba la compara con SECCIONES de lib/datos.js. */
export const RANURAS_DE_SECCION = {
  Balcarce: 'balcarce', Política: 'politica', Policiales: 'policiales', Fútbol: 'futbol', Deportes: 'deportes', Automovilismo: 'automovilismo',
  Agro: 'agro', Economía: 'economia', 'Cultura y agenda': 'cultura', Tecnología: 'tecnologia', Argentina: 'argentina',
};
export const rutaDeSeccion = (nombre) => (RANURAS_DE_SECCION[nombre] ? `/seccion/${RANURAS_DE_SECCION[nombre]}` : null);

export function comoRedirectsDeCloudflare(redirecciones) {
  // Formato Netlify/Cloudflare: "origen destino código", una por línea. El
  // 301 es permanente, igual que el `permanent: true` que tenía Next.
  return `${redirecciones.map((r) => `${r.origen}  ${r.destino}  301`).join('\n')}\n`;
}

/** Una dirección corta /nota/ID (sin titular): el identificador nunca lleva guiones (web/lib/ruta.js). */
const esCorta = (origen) => /^\/nota\/[^/-]+$/.test(origen);

/**
 * Qué va en _redirects y qué, si no entra, como página de redirección. Devuelve { reglas, paginas, sinLugar }:
 * `reglas` nunca pasa de `maximo`; `paginas` son las repetidas que no entraron (nunca se pierden); `sinLugar`, cuántas direcciones cortas
 * quedaron para la página 404.
 */
export function planDeRedirecciones({ portada = { notas: [] }, archivo = { notas: [] }, fusionadas = null, maximo = MAXIMO_REDIRECCIONES } = {}) {
  const notas = [...(portada?.notas ?? []), ...(archivo?.notas ?? [])].filter((n) => n?.id);
  const rutas = new Map(notas.map((n) => [n.id, rutaDeNota(n)]));
  const conPagina = new Set(rutas.values());
  // Las repetidas, de la unión más nueva a la más vieja (fusionadas.json no viene ordenado).
  const entradas = Object.entries(fusionadas?.notas ?? {}).sort(([, a], [, b]) => (Date.parse(b?.cuando ?? '') || 0) - (Date.parse(a?.cuando ?? '') || 0));
  const deRepetidas = redireccionesDeFusionadas({ notas: Object.fromEntries(entradas) }, (id) => rutas.get(id), { rutaDeSeccion })
    // la dirección corta de una repetida nunca se publicó (las uniones empezaron el 29/09, con las direcciones con titular)
    .filter((r) => !esCorta(r.origen));
  const cortas = redireccionesDeNotas(portada, archivo, Infinity, { hasta: FIN_DE_LAS_DIRECCIONES_CORTAS });

  const reglas = [];
  const paginas = [];
  const usados = new Set();
  const sirve = (r) => r?.origen && r.destino && r.origen !== r.destino && !usados.has(r.origen) && !conPagina.has(r.origen);
  const poner = (r) => { usados.add(r.origen); reglas.push(r); };
  for (const r of SECCIONES_VIEJAS) if (sirve(r)) poner(r);
  for (const r of deRepetidas) {
    if (!sirve(r)) continue;
    if (reglas.length < maximo) poner(r);
    else { usados.add(r.origen); paginas.push(r); }
  }
  let sinLugar = 0;
  for (const r of cortas) {
    if (!sirve(r)) continue;
    if (reglas.length < maximo) poner(r);
    else sinLugar += 1;
  }
  return { reglas, paginas, sinLugar };
}

const escaparHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * La página chica que reemplaza a una redirección que no entró en _redirects: dice dónde está la nota (canónica), manda ahí enseguida
 * (meta refresh y, por las dudas, JavaScript) y tiene el enlace a mano. Sin nada del sitio: no pesa, no se indexa en el buscador interno.
 */
export function paginaDeRedireccion(destino, sitio = 'https://radarbalcarce.com') {
  const absoluto = `${String(sitio).replace(/\/+$/, '')}${destino}`;
  const d = escaparHtml(destino);
  const a = escaparHtml(absoluto);
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Radar Balcarce</title>
<link rel="canonical" href="${a}"><meta http-equiv="refresh" content="0; url=${d}">
<meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body><p>Esta nota está en <a href="${d}">${a}</a>.</p><script>location.replace(${JSON.stringify(destino).replace(/</g, '\\u003c')})</script></body></html>
`;
}

/** El archivo de out/ de una dirección /nota/… (Cloudflare sirve /nota/x desde nota/x.html), o null si no es de una nota. */
export function archivoDePagina(origen, salida) {
  const m = /^\/nota\/([^/]+)$/.exec(origen ?? '');
  if (!m || m[1].includes('..')) return null;
  return path.join(salida, 'nota', `${m[1]}.html`);
}

/** Escribe las páginas de redirección en el sitio compilado, sin pisar nunca un archivo que ya está. Devuelve cuántas escribió. */
export function escribirPaginas(paginas, salida, { sitio } = {}) {
  let n = 0;
  for (const p of paginas) {
    const archivo = archivoDePagina(p.origen, salida);
    if (!archivo || fs.existsSync(archivo)) continue;
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    fs.writeFileSync(archivo, paginaDeRedireccion(p.destino, sitio), 'utf8');
    n += 1;
  }
  return n;
}

function planDeHoy() {
  return planDeRedirecciones({
    portada: leerJson(path.join(RAIZ, 'data', 'portada.json'), { notas: [] }),
    archivo: leerJson(path.join(RAIZ, 'data', 'archivo.json'), { notas: [] }),
    fusionadas: leerJson(path.join(RAIZ, 'data', 'fusionadas.json'), null),
  });
}

if (process.argv[1] && process.argv[1].endsWith('generar-redirects.mjs')) {
  const { reglas, paginas, sinLugar } = planDeHoy();
  if (process.argv.includes('--paginas')) {
    const salida = path.join(RAIZ, 'out');
    if (!fs.existsSync(salida)) { console.log('  Páginas de redirección: no hay web/out.'); process.exit(0); }
    const n = escribirPaginas(paginas, salida, { sitio: process.env.SITIO || 'https://radarbalcarce.com' });
    if (paginas.length) console.log(`  ${n} página(s) de redirección para repetidas que no entraron en _redirects (out/nota/).`);
  } else {
    fs.mkdirSync(path.join(RAIZ, 'public'), { recursive: true });
    fs.writeFileSync(path.join(RAIZ, 'public', '_redirects'), comoRedirectsDeCloudflare(reglas), 'utf8');
    console.log(`  ${reglas.length} redirecciones (public/_redirects; Cloudflare acepta ${TOPE_DE_CLOUDFLARE}, se escriben ${MAXIMO_REDIRECCIONES} como mucho).`);
    if (paginas.length) {
      const texto = `${paginas.length} repetida(s) no entraron en _redirects: salen como páginas de redirección (no se pierden), pero conviene mirar por qué hay tantas (regla 191).`;
      console.log(`  ${texto}`);
      if (process.env.GITHUB_ACTIONS) console.log(`::warning::${texto}`);
    }
    if (sinLugar) console.log(`  ${sinLugar} dirección(es) corta(s) de antes del 25/09 sin lugar: las resuelve la página 404.`);
  }
}

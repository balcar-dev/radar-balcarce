// Mira el HTML ya compilado de una página y dice qué le haría mal a la velocidad (17/10/2026, regla 252).
//
// Lo usan dos cosas: scripts/revisar-seo.mjs (después de cada compilación, antes de publicar) y pruebas/velocidad-html.test.mjs (con casos
// armados a mano y, si el sitio está compilado en esta máquina, con el HTML de verdad). Sin imports ni JSX: sólo texto adentro, texto afuera.
//
// Lo que se cuida, y por qué (web.dev, Core Web Vitals):
//   · Toda <img> con `width` y `height`: el navegador reserva el lugar antes de bajar la foto y la página no salta (CLS).
//   · La imagen principal (la de arriba) con fetchpriority="high" y NUNCA perezosa; todas las demás con loading="lazy". Una sola con
//     prioridad alta: si hay varias, ninguna lo es.
//   · Nada de terceros que frene el dibujo: ni hojas de estilo ni scripts de otro dominio, ni tipografías de Google (están en el propio
//     sitio desde el 8/10, web/public/fuentes/). Los scripts propios, async o defer.
//   · Como mucho las dos tipografías de siempre precargadas.
// Lo medido (pesos, cantidad de imágenes) se devuelve aparte, para el informe.

/** Los atributos de una etiqueta, en minúsculas: { src: '…', width: '1200', async: '' }. */
export function atributosDe(etiqueta) {
  const salida = {};
  const sinNombre = String(etiqueta).replace(/^<\s*[a-zA-Z0-9-]+/, '').replace(/\/?>$/, '');
  for (const m of sinNombre.matchAll(/([^\s=/"'<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    salida[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return salida;
}

/** Las etiquetas `nombre` de un HTML, cada una con sus atributos. */
export function etiquetasDe(html, nombre) {
  const re = new RegExp(`<${nombre}\\b[^>]*>`, 'gi');
  return [...String(html).matchAll(re)].map((m) => ({ crudo: m[0], atributos: atributosDe(m[0]), posicion: m.index }));
}

/** Los dominios que se aceptan en un recurso externo (hoy ninguno: el sitio no carga nada de afuera). */
export const DOMINIOS_PERMITIDOS = [];

const esExterno = (url) => /^(https?:)?\/\//i.test(String(url ?? '')) && !DOMINIOS_PERMITIDOS.some((d) => String(url).includes(d));

/**
 * Los problemas de velocidad del HTML de una página. Devuelve una lista de textos (vacía si está todo bien).
 * `pagina` es sólo para decir dónde: "/nota/ejemplo".
 */
export function problemasDeVelocidad(html, { pagina = '' } = {}) {
  const problemas = [];
  const donde = pagina ? `${pagina}: ` : '';
  const imagenes = etiquetasDe(html, 'img');

  for (const { atributos: a } of imagenes) {
    const que = a.src ? a.src.slice(0, 70) : '(sin src)';
    if (!(Number(a.width) > 0) || !(Number(a.height) > 0)) problemas.push(`${donde}la imagen ${que} no tiene width y height`);
    if (!('alt' in a)) problemas.push(`${donde}la imagen ${que} no tiene alt`);
  }

  const prioritarias = imagenes.filter(({ atributos: a }) => (a.fetchpriority ?? '').toLowerCase() === 'high');
  if (prioritarias.length > 1) problemas.push(`${donde}hay ${prioritarias.length} imágenes con fetchpriority="high" (tiene que ser una sola, la principal)`);
  for (const { atributos: a } of prioritarias) {
    if ((a.loading ?? '').toLowerCase() === 'lazy') problemas.push(`${donde}la imagen principal ${String(a.src).slice(0, 70)} es perezosa y prioritaria a la vez`);
  }
  for (const { atributos: a } of imagenes) {
    const alta = (a.fetchpriority ?? '').toLowerCase() === 'high';
    if (!alta && (a.loading ?? '').toLowerCase() !== 'lazy') problemas.push(`${donde}la imagen ${String(a.src).slice(0, 70)} no es la principal y no es loading="lazy"`);
  }

  for (const { atributos: a, crudo } of etiquetasDe(html, 'link')) {
    const rel = (a.rel ?? '').toLowerCase();
    if ((rel.includes('stylesheet') || rel.includes('preload') || rel.includes('preconnect')) && esExterno(a.href)) problemas.push(`${donde}recurso de otro dominio que frena la página: ${crudo.slice(0, 90)}`);
  }
  for (const { atributos: a, crudo } of etiquetasDe(html, 'script')) {
    if (!a.src) continue;
    if (esExterno(a.src)) problemas.push(`${donde}script de otro dominio: ${crudo.slice(0, 90)}`);
    // `nomodule` (los polyfills de Next, sólo para navegadores viejos) no lo baja ningún navegador de hoy.
    else if (!('async' in a) && !('defer' in a) && !('nomodule' in a) && (a.type ?? '').toLowerCase() !== 'module') problemas.push(`${donde}script que frena el dibujo (sin async ni defer): ${a.src.slice(0, 80)}`);
  }
  if (/fonts\.(googleapis|gstatic)\.com/i.test(html)) problemas.push(`${donde}pide tipografías a Google (están en el propio sitio)`);
  const fuentesPrecargadas = etiquetasDe(html, 'link').filter(({ atributos: a }) => (a.rel ?? '').toLowerCase() === 'preload' && (a.as ?? '').toLowerCase() === 'font');
  if (fuentesPrecargadas.length > 2) problemas.push(`${donde}precarga ${fuentesPrecargadas.length} tipografías (como mucho las 2 de siempre)`);

  return problemas;
}

/** Lo que pesa y cuántas cosas tiene una página, para el informe: { bytes, imagenes, perezosas, scripts, hojas }. */
export function medidasDelHtml(html) {
  const imagenes = etiquetasDe(html, 'img');
  return {
    bytes: Buffer.byteLength(String(html)),
    imagenes: imagenes.length,
    perezosas: imagenes.filter(({ atributos: a }) => (a.loading ?? '').toLowerCase() === 'lazy').length,
    scripts: etiquetasDe(html, 'script').filter(({ atributos: a }) => a.src).length,
    hojas: etiquetasDe(html, 'link').filter(({ atributos: a }) => (a.rel ?? '').toLowerCase().includes('stylesheet')).length,
  };
}

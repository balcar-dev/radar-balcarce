// La dirección del sitio, calculada y no escrita a mano.
//
// De esto dependen el enlace canónico, las tarjetas que se ven al compartir
// por WhatsApp, el sitemap y el feed. Escribir el dominio a mano tiene un
// problema concreto: mientras el dominio propio no esté conectado, cada nota
// compartida apuntaría a una dirección que no abre — peor que no poner nada.
//
// El orden es:
//
//   1. SITIO, si alguien la fija a mano (para probar, o si algún día el
//      dominio de producción no es el de Vercel).
//   2. El dominio de producción del proyecto en Vercel. Es el de verdad:
//      apenas radarbalcarce.com quede conectado, esta variable pasa a
//      valer eso sola, sin tocar una línea de código.
//   3. La dirección del despliegue puntual, para las vistas previas.
//   4. localhost, cuando se trabaja en la máquina.

const DOMINIO_PROPIO = 'radarbalcarce.com';

function crudo() {
  if (process.env.SITIO) return process.env.SITIO;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.VERCEL_URL) return process.env.VERCEL_URL;
  return 'http://localhost:3000';
}

/** La base del sitio, siempre con esquema y sin barra al final. */
export function sitio() {
  const s = crudo().trim().replace(/\/+$/, '');
  return /^https?:\/\//.test(s) ? s : `https://${s}`;
}

/** Una dirección absoluta a partir de una del sitio: enlace('/nota/abc'). */
export function enlace(camino = '/') {
  return `${sitio()}${camino.startsWith('/') ? camino : `/${camino}`}`;
}

/**
 * ¿Estamos sirviendo desde el dominio propio?
 *
 * Mientras no lo estemos, el sitio le pide a los buscadores que no lo
 * indexen: tener la misma página en dos direcciones distintas es la forma
 * más fácil de que Google elija la equivocada y después cueste sacarla.
 */
export function enElDominioPropio() {
  try {
    // Se compara el host entero, no se busca el texto adentro: con
    // includes(), "radarbalcarce.com.ar" también daba verdadero, y ése no es
    // nuestro dominio — nunca lo compramos.
    const host = new URL(sitio()).hostname.replace(/^www\./, '');
    return host === DOMINIO_PROPIO;
  } catch {
    return false;
  }
}

export const NOMBRE = 'Radar Balcarce';
export const DOMINIO = DOMINIO_PROPIO;

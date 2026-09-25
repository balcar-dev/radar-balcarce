// La dirección del sitio, calculada y no escrita a mano.
//
// De esto dependen el enlace canónico, las tarjetas que se ven al compartir
// por WhatsApp, el sitemap y el feed. Escribir el dominio a mano tiene un
// problema concreto: mientras el dominio propio no esté conectado, cada nota
// compartida apuntaría a una dirección que no abre — peor que no poner nada.
//
// La da la variable SITIO (en GitHub Actions vale https://radarbalcarce.com).
// Sin ella, localhost, cuando se trabaja en la máquina: y como localhost no
// es el dominio propio, el sitio pide que no lo indexen (enElDominioPropio).

const DOMINIO_PROPIO = 'radarbalcarce.com';

function crudo() {
  return process.env.SITIO || 'http://localhost:3000';
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

// Las etiquetas de temas (la tira de la portada y el pie de cada nota) están
// apagadas desde el 21/09: cargaban la página y las notas. Las páginas
// /tema/... siguen existiendo; sólo se dejó de enlazarlas. Para volver a
// mostrarlas alcanza con poner true.
export const MOSTRAR_TEMAS = false;

export const NOMBRE = 'Radar Balcarce';
export const DOMINIO = DOMINIO_PROPIO;

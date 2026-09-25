import { NOMBRE } from '../lib/sitio.js';

// Lo que cada página le dice a Google y a WhatsApp de sí misma.
//
// Next.js mezcla los metadatos del layout con los de la página, pero los
// objetos de adentro (openGraph, alternates) no se mezclan: si la página
// declara el suyo, pisa entero el del layout. Y si no declara nada, hereda
// el del layout tal cual. Las dos cosas mordieron:
//
//   - El 25/09 /farmacias, /agenda, /util y la política de privacidad
//     tenían de canónico la portada, heredado del layout. Para Google eran
//     copias de la portada.
//   - Las secciones, al declarar su openGraph, perdían el nombre del sitio y
//     el idioma (og:site_name, og:locale).
//
// Por eso las páginas fijas arman sus metadatos con esta función, y las que
// declaran su propio openGraph le suman OG_COMUN.
//
// Sin imports con "@/": así las pruebas lo pueden cargar con node pelado.

/** Lo que tiene que ir en todo openGraph, lo declare quien lo declare. */
export const OG_COMUN = { siteName: NOMBRE, locale: 'es_AR' };

/**
 * La tarjeta del sitio (app/opengraph-image.js). Hay que nombrarla a mano en
 * las páginas que declaran su openGraph y no tienen tarjeta propia: si no,
 * Next la pierde junto con el resto del openGraph del layout.
 */
export const TARJETA_DEL_SITIO = {
  url: '/opengraph-image', width: 1200, height: 630, type: 'image/png', alt: NOMBRE,
};

/**
 * Los metadatos de una página fija.
 *
 * `titulo` va sin la marca: la plantilla del layout le agrega
 * " · Radar Balcarce" sola. `camino` es la dirección de la página, que pasa
 * a ser su canónico y su og:url.
 */
export function metadatosDePagina({ titulo, descripcion, camino }) {
  if (!camino || !camino.startsWith('/')) throw new Error(`camino inválido: ${camino}`);
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: camino },
    openGraph: {
      ...OG_COMUN,
      type: 'website',
      title: titulo,
      description: descripcion,
      url: camino,
      images: [TARJETA_DEL_SITIO],
    },
    twitter: { card: 'summary_large_image', title: titulo, description: descripcion, images: [TARJETA_DEL_SITIO.url] },
  };
}

// ------------------------------------------------------ quién escribió

/**
 * Quién escribió una nota, con el mismo criterio que la firma que se ve al
 * pie (Firma, en piezas.js) y que los datos estructurados (ficha.js). Las
 * dos tienen que decir lo mismo: el 25/09 el JSON-LD decía "con revisión"
 * en notas que había publicado la máquina sola.
 *
 *   - reescrita: el resumen lo redactó la IA (si no, es el de la fuente).
 *   - revisada:  la publicó una persona desde el panel (si no, salió sola,
 *                verificada automáticamente contra la fuente).
 */
export function quienEscribio(nota = {}) {
  // Las notas propias (la del dólar, la de cada podcast: lib/notas-propias.js)
  // no las redactó la IA ni son de una fuente: las arma el sitio con
  // plantilla, a partir de datos. Su firma la dice la nota (`firma`).
  if (nota.propia) return { reescrita: false, revisada: false, propia: true };
  return { reescrita: !!nota.guion, revisada: nota.como === 'publicada' };
}

/** El `author` del NewsArticle, igual a la firma de la nota. */
export function autorDeNota(nota = {}, base = '') {
  const { reescrita, revisada, propia } = quienEscribio(nota);
  if (propia) return { '@type': 'Organization', name: NOMBRE, url: base };
  if (!reescrita) {
    // El resumen es el que publicó la fuente: el autor es ese medio.
    const fuente = (nota.medios ?? [])[0];
    return fuente
      ? { '@type': 'Organization', name: fuente }
      : { '@type': 'Organization', name: NOMBRE, url: base };
  }
  const como = revisada
    ? 'resumen escrito con IA y revisado por una persona'
    : 'resumen escrito con IA y verificado automáticamente contra la fuente';
  return { '@type': 'Organization', name: `${NOMBRE} (${como})`, url: base };
}

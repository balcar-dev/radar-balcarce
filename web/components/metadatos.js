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
    ? 'nota escrita con IA y revisada por una persona'
    : 'nota escrita con IA y verificada automáticamente contra las fuentes';
  return { '@type': 'Organization', name: `${NOMBRE} (${como})`, url: base };
}

/**
 * La firma que ve el lector, en una línea corta (va en el renglón del
 * desplegable "Fuentes (N)", components/verificacion.js). Dice lo mismo que el
 * `author` de arriba, en pocas palabras:
 *
 *   · propia:            lo que dice la nota ("Nota de Radar Balcarce con datos de…")
 *   · escrita por la IA: "Redacción con IA, verificada contra las fuentes"
 *   · ...y revisada:     "Redacción con IA, revisada por la redacción"
 *   · de una persona:    "Revisada por la redacción"
 *   · texto de la fuente: "Texto de <medio>"
 *
 * Nunca se promete una revisión que no hubo, ni se dice "sin revisión humana":
 * eso es interno.
 */
export function firmaCorta(nota = {}) {
  const { reescrita, revisada, propia } = quienEscribio(nota);
  if (propia) return String(nota.firma || 'Nota de Radar Balcarce').replace(/\.\s*$/, '');
  if (reescrita) return revisada ? 'Redacción con IA, revisada por la redacción' : 'Redacción con IA, verificada contra las fuentes';
  if (revisada) return 'Revisada por la redacción';
  const medio = (nota.medios ?? [])[0];
  return medio ? `Texto de ${medio}` : 'Texto de la fuente';
}

/** La explicación larga de la firma, que se ve sólo al abrir el desplegable.
 *  Null cuando la firma ya lo dice todo (las notas propias). */
export function explicacionDeFirma(nota = {}) {
  const { reescrita, revisada, propia } = quienEscribio(nota);
  if (propia) return null;
  if (reescrita) {
    return `La escribió una inteligencia artificial con lo que publicaron las fuentes, y se verificó automáticamente contra ellas: un dato que no estaba se descarta.${revisada ? ' Antes de salir la revisó una persona de la redacción.' : ''}`;
  }
  return revisada
    ? 'Una persona de la redacción la revisó y la publicó.'
    : 'El texto es el que publicó la fuente. No lo reescribimos.';
}

import { sitio, enlace, NOMBRE } from '@/lib/sitio';

// Los datos estructurados: lo mismo que ya está en la página, pero escrito
// para que lo lea una máquina.
//
// Google Noticias, Discover y los paneles de búsqueda no adivinan de una
// página qué es una noticia, cuándo se publicó y quién la firma: lo leen de
// acá. Sin esto, para un buscador una nota nuestra es una página cualquiera.
//
// Se escribe como un <script type="application/ld+json">, que es la forma
// estándar, y por eso lleva dangerouslySetInnerHTML — es la única manera de
// poner JSON crudo adentro de una etiqueta en React.

/** Escapa lo que podría cortar la etiqueta. */
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

/** La marca y el sitio. Va en todas las páginas. */
export function FichaDelSitio() {
  const base = sitio();
  const datos = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsMediaOrganization',
        '@id': `${base}/#medio`,
        name: NOMBRE,
        url: base,
        email: 'radarbalcarce@gmail.com',
        areaServed: {
          '@type': 'City',
          name: 'Balcarce',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Balcarce',
            addressRegion: 'Buenos Aires',
            addressCountry: 'AR',
          },
        },
        // Que lo diga acá también: parte de lo que publicamos lo redacta una
        // máquina, y no es algo para esconder en la letra chica.
        publishingPrinciples: `${base}/politica-de-privacidad`,
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#sitio`,
        url: base,
        name: NOMBRE,
        inLanguage: 'es-AR',
        publisher: { '@id': `${base}/#medio` },
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(datos) }} />;
}

/**
 * Una nota.
 *
 * `dateModified` es igual a `datePublished` mientras no editemos notas
 * después de publicarlas. Cuando el panel guarde la hora de la última
 * edición, sale de ahí.
 */
export function FichaDeNota({ nota }) {
  const base = sitio();
  const url = enlace(nota.ruta);
  const datos = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: nota.titulo.slice(0, 110),
    description: nota.copete || undefined,
    datePublished: nota.fecha,
    dateModified: nota.publicadaCuando ?? nota.fecha,
    articleSection: nota.seccion,
    inLanguage: 'es-AR',
    url,
    image: [enlace(`${nota.ruta}/opengraph-image`)],
    isAccessibleForFree: true,
    publisher: { '@id': `${base}/#medio` },
    // Quién la escribió. Si el resumen lo redactó la IA se dice, igual que
    // al pie de la nota.
    author: nota.guion
      ? { '@type': 'Organization', name: `${NOMBRE} (resumen automático con revisión)`, url: base }
      : { '@type': 'Organization', name: NOMBRE, url: base },
    // De dónde salió. Es la mitad de lo que ofrecemos: el trabajo original
    // es del medio que la informó.
    citation: (nota.medios ?? []).map((m) => ({ '@type': 'CreativeWork', name: m })),
    isBasedOn: nota.enlace || undefined,
    keywords: [nota.seccion, ...(nota.temas ?? [])].join(', '),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(datos) }} />;
}

/** El camino de migas: Portada › Sección › Nota. */
export function Migas({ pasos = [] }) {
  if (!pasos.length) return null;
  const datos = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ nombre: 'Portada', camino: '/' }, ...pasos].map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.nombre,
      item: enlace(p.camino),
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(datos) }} />;
}

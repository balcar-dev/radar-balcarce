import { sitio, enlace, NOMBRE } from '@/lib/sitio';
import { autorDeNota } from '@/components/metadatos';
import { REDES_SOCIALES } from '@/lib/datos';
import { fichaDeEvento } from '@/lib/eventos';

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
        // Las cuentas del medio: Google las muestra junto al nombre.
        sameAs: Object.values(REDES_SOCIALES),
        // El logo lo piden Google Noticias y los resultados enriquecidos:
        // cuadrado, de al menos 112 px. Es el mismo ícono del manifiesto.
        logo: {
          '@type': 'ImageObject',
          url: `${base}/icon-512.png`,
          width: 512,
          height: 512,
        },
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
        publishingPrinciples: `${base}/quienes-somos`,
        correctionsPolicy: `${base}/contacto`,
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
    articleBody: nota.cuerpo || undefined,
    datePublished: nota.fecha,
    dateModified: nota.publicadaCuando ?? nota.fecha,
    articleSection: nota.seccion,
    inLanguage: 'es-AR',
    url,
    image: [enlace(`${nota.ruta}/opengraph-image`)],
    isAccessibleForFree: true,
    publisher: { '@id': `${base}/#medio` },
    // Quién la escribió: lo mismo que dice la firma al pie de la nota (IA o
    // fuente, revisada por una persona o publicada sola). Ver
    // components/metadatos.js.
    author: autorDeNota(nota, base),
    // De dónde salió. Es la mitad de lo que ofrecemos: el trabajo original
    // es del medio que la informó.
    citation: (nota.medios ?? []).map((m) => ({ '@type': 'CreativeWork', name: m })),
    isBasedOn: nota.enlace || undefined,
    // Las etiquetas de la nota (desde el 25/09) son palabras clave de verdad.
    // El nivel de verificación, las claves y lo que falta confirmar NO van
    // acá: schema.org no tiene una propiedad clara para eso y no se inventa.
    keywords: [...new Set([nota.seccion, ...(nota.temas ?? []), ...(nota.etiquetas ?? [])])].join(', '),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(datos) }} />;
}

/**
 * Un evento de la agenda: el `Event` de schema.org, con fecha, lugar y quién
 * armó la ficha (lo mismo que dice al pie de la página). Ver lib/eventos.js.
 */
export function FichaDeEvento({ evento }) {
  const datos = fichaDeEvento(evento, { base: sitio(), url: enlace(evento.ruta) });
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

// Piezas puras de los datos estructurados (JSON-LD) que van en el HTML (16/10/2026, auditoría SEO/LLM: docs/seo/AUDITORIA-SEO-LLM.md).
//
// components/ficha.js arma el <script type="application/ld+json">; lo que necesita lógica (qué imágenes declara una nota, qué políticas
// publica el medio, dónde pasa la nota) vive acá, sin React y sin imports con "@/", para que las pruebas lo carguen con node pelado.
//
// Regla de oro: el marcado dice lo que la página ya dice. Nada que el lector no pueda ver o verificar en el sitio (Google lo exige en su
// guía de datos estructurados y penaliza lo contrario). Por eso no se inventan fecha de fundación ni domicilio.

import { palabrasDe } from './cuerpo.js';

/**
 * Las páginas donde el medio explica cómo trabaja. Las anclas existen en /quienes-somos y /contacto (ids de los títulos): una prueba lo
 * controla. NewsMediaOrganization tiene estas propiedades (schema.org); Google no las muestra, pero Bing, los asistentes y los grafos de
 * conocimiento las leen para decidir qué tan confiable es un medio.
 */
export const ANCLAS_DE_POLITICAS = {
  quienes: '/quienes-somos#quienes-somos',
  comoTrabajamos: '/quienes-somos#como-trabajamos',
  loQueNoHacemos: '/quienes-somos#lo-que-no-hacemos',
  correcciones: '/contacto#correcciones',
};

/** Las políticas editoriales del medio, con direcciones absolutas. */
export function politicasDelMedio(base) {
  const a = (clave) => `${base}${ANCLAS_DE_POLITICAS[clave]}`;
  return {
    // Los dos primeros ya estaban (apuntan a la página entera).
    publishingPrinciples: `${base}/quienes-somos`,
    correctionsPolicy: `${base}/contacto`,
    actionableFeedbackPolicy: a('correcciones'),
    ethicsPolicy: a('loQueNoHacemos'),
    verificationFactCheckingPolicy: a('comoTrabajamos'),
    // Cada nota dice al pie quién la escribió (IA, revisada, texto de la fuente): ésa es la política de firmas.
    noBylinesPolicy: a('comoTrabajamos'),
    ownershipFundingInfo: a('quienes'),
    masthead: a('quienes'),
  };
}

/**
 * La política de firmas de la nota: cuando la escribió la IA, el NewsArticle apunta a la sección de "Quiénes somos" que explica cómo
 * trabajamos (IA, fuentes, verificación). Es el lugar del marcado para la transparencia sobre la IA ahora que `author.name` es sólo
 * el nombre (D5). Sin la IA de por medio no hace falta.
 */
export function principiosDeNota({ reescrita }, base) {
  return reescrita ? { publishingPrinciples: `${base}${ANCLAS_DE_POLITICAS.comoTrabajamos}` } : {};
}

/** Cómo se puede contactar al medio: el correo y el WhatsApp que ya están en el pie del sitio. */
export function puntosDeContacto({ email, whatsapp }) {
  return [{
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email,
    telephone: whatsapp ? `+${String(whatsapp).replace(/\D/g, '')}` : undefined,
    availableLanguage: 'es',
    areaServed: 'AR',
  }];
}

/**
 * Las imágenes que declara una nota (propiedad `image` del NewsArticle).
 *
 * Google (Discover y Noticias) quiere una imagen de al menos 1200 px de ancho, y también le sirven 16:9, 4:3 y 1:1. La tarjeta propia de la
 * nota es de 1200 × 630 pero lleva el titular encima; la foto sola es mejor para Discover. Por eso:
 *   · foto de 1200 px o más de ancho y proporción de fotografía (entre 1:1 y 2:1) → primero la foto, después la tarjeta;
 *   · foto más chica pero decente (696 px o más y 50.000 píxeles) → primero la tarjeta, después la foto;
 *   · foto diminuta o sin foto → sólo la tarjeta.
 * `dimensiones(archivo)` devuelve { ancho, alto } o null (se lee la cabecera del JPEG al compilar; si la foto está en otro lado, null).
 */
export function imagenesDeNota({ nota, tarjeta, urlFoto, dimensiones = () => null }) {
  const archivo = nota?.foto?.archivo;
  const d = archivo ? dimensiones(archivo) : null;
  const decente = !!d && d.ancho >= 696 && d.ancho * d.alto >= 50000;
  const foto = decente
    ? {
      '@type': 'ImageObject',
      url: urlFoto(archivo),
      width: d.ancho,
      height: d.alto,
      ...(nota.foto.credito ? { caption: nota.foto.credito, creditText: nota.foto.credito } : {}),
    }
    : null;
  const grande = decente && d.ancho >= 1200 && d.ancho / d.alto >= 1 && d.ancho / d.alto <= 2;
  return [grande && foto, tarjeta, !grande && foto].filter(Boolean);
}

/** Dónde pasa la nota: Balcarce, cuando la nota es de acá (esDeAca ya lo decidió al armar los datos: `local`). */
export function lugarDeNota(nota) {
  if (!nota?.local) return undefined;
  return {
    '@type': 'Place',
    name: 'Balcarce',
    address: { '@type': 'PostalAddress', addressLocality: 'Balcarce', addressRegion: 'Buenos Aires', addressCountry: 'AR' },
  };
}

/** Cuántas palabras tiene el cuerpo (sólo si lo hay). */
export function palabrasDeNota(nota) {
  const n = palabrasDe(nota?.cuerpo);
  return n > 0 ? n : undefined;
}

/**
 * Lo que se agrega al NewsArticle además de lo de siempre. Va aparte para poder probarlo sin React.
 */
export function camposExtraDeNota({ nota, tarjeta, urlFoto, dimensiones }) {
  return {
    image: imagenesDeNota({ nota, tarjeta, urlFoto, dimensiones }),
    contentLocation: lugarDeNota(nota),
    wordCount: palabrasDeNota(nota),
  };
}

/** La dirección de la foto de una nota para el sitemap de imágenes; null si no hay foto o es demasiado chica para valer la pena. */
export function fotoParaElSitemap({ nota, urlFoto, dimensiones = () => null }) {
  const archivo = nota?.foto?.archivo;
  const d = archivo ? dimensiones(archivo) : null;
  return d && d.ancho >= 696 && d.ancho * d.alto >= 50000 ? urlFoto(archivo) : null;
}

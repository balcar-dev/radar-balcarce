import { sitio, enElDominioPropio } from '@/lib/sitio';

// Qué le decimos a los buscadores.
//
// Dos cambios respecto de lo que había. El Sitemap apuntaba a /feed.xml, que
// es otra cosa: ahora apunta al sitemap de verdad. Y mientras el sitio no
// esté sirviendo desde radarbalcarce.com, se pide que no lo indexen —
// tener las mismas notas en dos direcciones es la forma más fácil de que
// Google elija la equivocada, y sacarla después cuesta meses.
//
// Apenas el dominio quede conectado, esto se da vuelta solo.

export const dynamic = 'force-static';

export default function robots() {
  const base = sitio();

  if (!enElDominioPropio()) {
    return {
      rules: { userAgent: '*', disallow: '/' },
      sitemap: `${base}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // El panel del celular (29/09) es una herramienta de la redacción, no una página.
      // El feed ya NO está bloqueado (8/10/2026, V2-13): Google lo usa para descubrir notas
      // nuevas, y el feed no es una página que compita en el índice (los lectores de RSS no
      // miran robots.txt, pero Google sí).
      disallow: ['/panel/'],
    },
    // El de noticias es aparte: Google Noticias y Discover lo miran solo,
    // con las reglas propias de ese sitemap (ver sitemap-news.xml/route.js).
    sitemap: [`${base}/sitemap.xml`, `${base}/sitemap-news.xml`],
  };
}

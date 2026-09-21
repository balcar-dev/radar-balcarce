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
      // El feed es para programas, no para el índice de búsqueda.
      disallow: ['/feed.xml'],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

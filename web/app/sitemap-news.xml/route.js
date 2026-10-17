import { obtenerDatos } from '@/lib/datos';
import { enlace, NOMBRE } from '@/lib/sitio';
import { xmlDeNoticias } from '@/lib/sitemap-noticias';

// El mapa para Google Noticias: un formato aparte del sitemap.xml de siempre, que Google sólo mira para decidir qué mostrar en la
// pestaña "Noticias" y en Discover.
//
// La regla de Google es estricta: como mucho las últimas 48 horas, nada viejo, y hasta 1.000 notas. Un mapa de noticias con notas de la
// semana pasada no ayuda, directamente se ignora esa parte: así que se filtra acá y no se manda todo para que Google elija. Qué notas
// entran y cómo se escribe cada una (publicación, idioma, fecha con zona, título) está en lib/sitemap-noticias.js, que se prueba sin
// compilar (pruebas/sitemaps-noticias.test.mjs).
//
// Se arma en el momento de compilar, igual que feed.xml y sitemap.xml: no hace falta un servidor corriendo para esto. Está en
// robots.txt y en el índice de mapas (/sitemap-index.xml).
export const dynamic = 'force-static';

export async function GET() {
  const d = obtenerDatos();
  const xml = xmlDeNoticias(d.notas ?? [], { enlace, nombre: NOMBRE });
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}

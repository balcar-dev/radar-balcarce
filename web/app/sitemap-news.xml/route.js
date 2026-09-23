import { obtenerDatos } from '@/lib/datos';
import { sitio, enlace, NOMBRE } from '@/lib/sitio';

// El mapa para Google Noticias: un formato aparte del sitemap.xml de
// siempre, que Google sólo mira para decidir qué mostrar en la pestaña
// "Noticias" y en Discover.
//
// La regla de Google es estricta: como mucho las últimas 48 horas, nada
// viejo. Un sitemap de noticias con notas de la semana pasada no ayuda,
// directamente se ignora esa parte — así que se filtra acá, no se manda
// todo y se espera que Google elija.
//
// Se arma en el momento de compilar, igual que feed.xml y sitemap.xml: no
// hace falta un servidor corriendo para esto.
export const dynamic = 'force-static';

const DOS_DIAS_MS = 48 * 60 * 60 * 1000;

export async function GET() {
  const base = sitio();
  const d = obtenerDatos();
  const ahora = Date.now();

  const recientes = (d.notas ?? []).filter((n) => (ahora - new Date(n.fecha).getTime()) <= DOS_DIAS_MS);

  const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const items = recientes.map((n) => `
  <url>
    <loc>${enlace(n.ruta)}</loc>
    <news:news>
      <news:publication>
        <news:name>${esc(NOMBRE)}</news:name>
        <news:language>es</news:language>
      </news:publication>
      <news:publication_date>${new Date(n.fecha).toISOString()}</news:publication_date>
      <news:title>${esc(n.titulo)}</news:title>
    </news:news>
  </url>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${items}
</urlset>`;

  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}

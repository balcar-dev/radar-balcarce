import { obtenerDatos } from '@/lib/datos';
import { sitio } from '@/lib/sitio';

// RSS para quien quiera seguirnos sin redes: Google Noticias y los
// lectores de feeds lo leen desde acá.
export async function GET() {
  const SITIO = sitio();
  const d = obtenerDatos();
  const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const items = d.notas.map((n) => `
    <item>
      <title>${esc(n.titulo)}</title>
      <link>${SITIO}${n.ruta}</link>
      <guid>${SITIO}${n.ruta}</guid>
      <pubDate>${new Date(n.fecha).toUTCString()}</pubDate>
      <category>${esc(n.seccion)}</category>
      <description>${esc(n.copete)}</description>
    </item>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Radar Balcarce</title>
    <link>${SITIO}</link>
    <description>Lo que pasa en Balcarce, la región y el país.</description>
    <language>es-AR</language>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
}

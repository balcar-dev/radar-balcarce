import { obtenerDatos } from '@/lib/datos';
import { sitio } from '@/lib/sitio';
import { armarRss } from '@/lib/rss';

// RSS para quien quiera seguirnos sin redes: Google Noticias y los
// lectores de feeds lo leen desde acá. Desde el 8/10 cada nota trae su texto
// completo, su foto con el crédito y el enlace a la página (lib/rss.js); y cada
// sección tiene su propio feed (/seccion/<sección>/feed.xml).
//
// Se arma en el momento de compilar, no en cada visita: los datos no
// cambian entre una compilación y la siguiente (el sitio se reconstruye
// entero cada 30 minutos), así que no hace falta un servidor corriendo
// para esto — es justo lo que permite exportar el sitio como archivos
// estáticos puros, sin depender de ningún proveedor en particular.
export const dynamic = 'force-static';

export async function GET() {
  const SITIO = sitio();
  const d = obtenerDatos();
  const xml = armarRss({
    enlace: SITIO, autoEnlace: `${SITIO}/feed.xml`, notas: d.notas, sitio: SITIO, generado: d.generado,
  });
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
}

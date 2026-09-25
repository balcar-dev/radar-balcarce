import { obtenerDatos, SECCIONES } from '@/lib/datos';
import { sitio, enlace, NOMBRE } from '@/lib/sitio';

// Un resumen del sitio para sistemas de IA, en el formato que se está
// volviendo estándar (llmstxt.org): markdown simple, qué es esto y por
// dónde entrar. No es un permiso de rastreo — eso lo decide robots.js, y es
// una decisión editorial aparte (ver PENDIENTES.md), no algo que resuelva
// este archivo.
export const dynamic = 'force-static';

export async function GET() {
  const base = sitio();
  const d = obtenerDatos();
  const secciones = SECCIONES
    .filter((s) => (d.notas ?? []).some((n) => n.seccion === s.nombre))
    .map((s) => `- [${s.nombre}](${enlace(`/seccion/${s.ranura}`)})`)
    .join('\n');

  const texto = `# ${NOMBRE}

> Medio digital de Balcarce (provincia de Buenos Aires, Argentina). Cuenta lo que publican los medios locales y de la región, siempre con el enlace a la nota original. Las notas las escribe una inteligencia artificial con lo que publicaron las fuentes y se verifican automáticamente contra ellas; lo sensible lo revisa una persona antes de salir. Las voces de los videos también son de IA.

Cubre la actualidad de Balcarce: noticias locales, política, policiales, deportes, automovilismo (Balcarce es la ciudad natal de Juan Manuel Fangio), agro, economía, cultura y tecnología. Se actualiza cada 30 minutos.

## Secciones

${secciones}

## Otros recursos

- [Feed RSS](${enlace('/feed.xml')})
- [Mapa del sitio](${enlace('/sitemap.xml')})
- [Agenda de eventos](${enlace('/agenda')})
- [Quiénes somos y cómo trabajamos](${enlace('/quienes-somos')})
- [Contacto y pedidos de corrección](${enlace('/contacto')})
- [Política de privacidad](${enlace('/politica-de-privacidad')})

## Contacto

${'radarbalcarce@gmail.com'}
`;

  return new Response(texto, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

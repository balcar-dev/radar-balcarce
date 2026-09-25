# SEO: cómo se posiciona la web

*Actualizado el 25/09/2026.* Qué está hecho, cómo se audita y qué falta. La
lista completa de pendientes está en `PENDIENTES.md` (sección C); acá se explica
el estado.

## Qué está hecho

| Tema | Cómo está | Dónde |
|---|---|---|
| **Direcciones con el titular adentro** | `/nota/titulo-de-la-nota-id`. Las direcciones viejas (`/nota/id`) redirigen con 301. **Desde el 25/09 la dirección queda fija** desde la primera publicación, aunque la IA cambie el titular, y la página dura 180 días aunque la nota salga de la portada (`web/data/archivo.json`). La 404 rescata direcciones viejas por el identificador (`/nota/indice.json`) | `web/lib/ruta.js`, `web/lib/archivo.js`, `web/scripts/generar-redirects.mjs`, `pruebas/archivo.test.mjs` |
| **Redirecciones** | Se escriben en cada compilación en `web/public/_redirects` (Cloudflare), también para las notas archivadas. (`web/vercel.json` se sigue generando pero ya no se usa ni se commitea: Vercel está apagado.) `www` redirige con 301 al dominio sin `www` (regla de Cloudflare) | `pruebas/redirects.test.mjs`; el vigilante avisa si `www` deja de redirigir |
| **Sitemaps** | `sitemap.xml` (todo el sitio, con "Quiénes somos" y "Contacto") y `sitemap-news.xml` (formato Google News, últimas 48 horas; desde el 25/09 deja afuera las notas sin fecha real, en vez de ponerles una de relleno). Los dos enviados a Search Console el 24/09 | `web/app/sitemap.js`, `web/app/sitemap-news.xml/` |
| **`robots.txt`** | En el dominio propio permite todo menos `/feed.xml` y apunta a los dos sitemaps. **Fuera del dominio propio (vistas previas) prohíbe indexar**, para no duplicar las notas | `web/app/robots.js`, `web/lib/sitio.js` |
| **Enlace canónico** | Siempre al dominio sin `www` y con `https`. **Cada página declara el suyo** y sólo la portada es `/`: hasta el 25/09 Farmacias, Agenda, Útil y Privacidad decían ser la portada y Google podía no mostrarlas nunca | `web/lib/sitio.js`, `web/components/metadatos.js`, `pruebas/seo.test.mjs`, `pruebas/seo-paginas.test.mjs` |
| **Datos estructurados (JSON-LD)** | `NewsArticle` en cada nota, `NewsMediaOrganization` (con logo, desde el 25/09) y `WebSite` en el sitio, `BreadcrumbList` en las migas. El autor dice lo mismo que la firma de la nota | `web/components/ficha.js`, `pruebas/seo-paginas.test.mjs` |
| **Título, descripción y `h1` propios** | Portada, cada sección, cada tema y cada nota; se recortan al largo que muestra Google | `pruebas/seo-paginas.test.mjs` |
| **Imagen para compartir** | Una tarjeta propia por nota de 1200 × 630 (`opengraph-image`) y otra de 1080 × 1350 para el posteo de Instagram (`instagram.png`). Nunca la foto de otro medio | `web/lib/tarjeta.js`; medidas en `FORMATOS.md` |
| **Íconos y manifiesto** | `favicon.ico` (16/32/48), `icon-192`, `icon-512`, `apple-touch-icon` (180) y `manifest.webmanifest` | `web/public/`, `web/scripts/hacer-iconos.mjs`, `pruebas/seo-paginas.test.mjs` |
| **`feed.xml`** (RSS) | Para programas, no para el índice de búsqueda | `web/app/feed.xml` |
| **`llms.txt`** | Descripción del sitio para buscadores con IA | `web/app/llms.txt` |
| **Política de privacidad** | Página pública | `web/app/politica-de-privacidad`, `POLITICA-PRIVACIDAD.md` |
| **Páginas de confianza** | "Quiénes somos" y "Contacto" (25/09), enlazadas desde el pie y en el sitemap. El pie ya no promete "revisión humana": dice que los resúmenes los escribe una IA, se verifican solos contra la fuente y lo sensible lo revisa una persona | `web/app/quienes-somos`, `web/app/contacto`, `pruebas/seo-paginas.test.mjs` |
| **Encabezados** (`_headers`) | La imagen para compartir sale como `image/png` (antes `application/octet-stream`: Facebook y WhatsApp podían no mostrarla); HSTS, `nosniff`, `frame-ancestors` y otros de seguridad; caché de un año para `/_next/static` (25/09) | `web/public/_headers`, `pruebas/seo-paginas.test.mjs` |
| **Idioma y accesibilidad básica** | `lang="es-AR"`; las etiquetas de sección con contraste de al menos 4,5:1; el buscador tiene nombre para lectores de pantalla (25/09) | `pruebas/seo-paginas.test.mjs` |
| **Search Console** | Propiedad de dominio verificada con un registro TXT en Cloudflare (24/09) | `radarbalcarce@gmail.com` |
| **Analítica** | Cloudflare Web Analytics (gratis, sin cookies). Vercel Analytics se sacó: en Cloudflare pedía un archivo que no existe | `pruebas/seo-paginas.test.mjs` |
| **Velocidad** | La portada es HTML estático, sin banners de terceros | ver `INVESTIGACION-COMPETENCIA.md` |

## Cómo se audita

- **En cada compilación**: `web/scripts/revisar-seo.mjs` (título, descripción,
  canónico, `h1` de las páginas generadas).
- **En vivo, a demanda**: `node web/scripts/auditar-seo-vivo.mjs [url]`
  revisa las páginas publicadas (título, descripción, `h1`, canónico, ícono,
  imagen para compartir).
- **En vivo, cada lunes**: `redes/auditar.mjs` (workflow `auditoria.yml`)
  corre ese auditor y además mide las imágenes publicadas. Si algo falla, avisa
  por WhatsApp. Ver `FORMATOS.md` e `INFRAESTRUCTURA.md`.

## Lo que falta

| Qué | Por qué importa | Nota |
|---|---|---|
| **Bing Webmaster Tools** | Bing también alimenta a otros buscadores y a asistentes | Se puede importar desde Search Console, pero pide un permiso de Google: lo hace una persona |
| **Mirar qué indexó Google** | El sitemap se envió el 24/09 | Revisar en Search Console en unos días |
| **Google Publisher Center** (Google Noticias y Discover) | El sitemap de noticias ya está; falta el alta manual | Discover pide imágenes de al menos 1200 px |
| **Google Business Profile** | Aparecer en el mapa y en "cerca de mí" | Si corresponde |
| **Google AdSense** | Monetizar con avisos de Google | **Para mañana** (`PENDIENTES.md`). Falta: que una persona abra la cuenta (datos fiscales), `ads.txt` con el ID de editor que da AdSense (sin el ID no se puede armar) y más notas con cuerpo. La aprobación tarda de días a semanas. Ver `PUBLICIDAD.md` |
| **Notas con cuerpo** | Google y AdSense premian el contenido propio | Hoy sólo el 19 % tiene cuerpo. La IA reescribe primero lo local desde el 25/09: mirar si sube |
| **Política editorial** como página | Lo que Google y las IA miran para decidir si un medio es confiable | "Quiénes somos" y "Contacto" ya están. Falta la política editorial: sacar de `EDITORIAL.md` lo que se puede publicar. Y confirmar el texto de "Quiénes somos" |
| **CSP completa** | Seguridad | Hoy `_headers` sólo trae `frame-ancestors` |
| **Rastreadores de IA** (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) | Permitirlos da visibilidad y citas; bloquearlos protege el contenido | Decisión editorial, no técnica. Hoy `robots.txt` no distingue |
| **PageSpeed / Core Web Vitals** | Posicionamiento y experiencia en celulares con mala señal | Medir y ajustar |
| **Depurador de Facebook y Twitter Cards** | Confirmar cómo se ve cada nota compartida | Revisar en todas las páginas |
| **Parámetros UTM** en los enlaces de redes | Saber cuánta gente llega desde cada red | Con la analítica sin cookies |
| **Enlaces internos entre notas** | Ahora las etiquetas de temas están apagadas (`MOSTRAR_TEMAS`) | Pensar una alternativa |
| **Resumen claro al abrir cada nota** | Es lo que una IA cita | Ya lo hace el copete; falta revisar fecha y autor visibles |
| **Permiso `instagram_manage_insights`** | Leer qué rinde cada red | Con Meta |

## Reglas a cuidar

- No cambiar direcciones de notas sin redirección 301.
- No indexar la web desde una dirección que no sea `radarbalcarce.com`
  (`web/lib/sitio.js` lo evita solo).
- El canónico apunta siempre al dominio sin `www`.

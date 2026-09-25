# SEO: cómo se posiciona la web

*Actualizado el 25/09/2026.* Qué está hecho, cómo se audita y qué falta. La
lista completa de pendientes está en `PENDIENTES.md` (sección C); acá se explica
el estado.

## Qué está hecho

| Tema | Cómo está | Dónde |
|---|---|---|
| **Direcciones con el titular adentro** | `/nota/titulo-de-la-nota-id`. Las direcciones viejas (`/nota/id`) redirigen con 301 | `web/lib/ruta.js`, `web/scripts/generar-redirects.mjs` |
| **Redirecciones** | Se escriben en cada compilación a partir de `portada.json`: `web/public/_redirects` (Cloudflare) y `web/vercel.json` (Vercel). `www` redirige con 301 al dominio sin `www` (regla de Cloudflare) | `pruebas/redirects.test.mjs`; el vigilante avisa si `www` deja de redirigir |
| **Sitemaps** | `sitemap.xml` (todo el sitio) y `sitemap-news.xml` (formato Google News, últimas 48 horas). Los dos enviados a Search Console el 24/09 | `web/app/sitemap.js`, `web/app/sitemap-news.xml/` |
| **`robots.txt`** | En el dominio propio permite todo menos `/feed.xml` y apunta a los dos sitemaps. **Fuera del dominio propio (vistas previas) prohíbe indexar**, para no duplicar las notas | `web/app/robots.js`, `web/lib/sitio.js` |
| **Enlace canónico** | Siempre al dominio sin `www` y con `https` | `web/lib/sitio.js`, `pruebas/seo.test.mjs` |
| **Datos estructurados (JSON-LD)** | `NewsArticle` en cada nota, `NewsMediaOrganization` y `WebSite` en el sitio, `BreadcrumbList` en las migas | `web/components/ficha.js` |
| **Título, descripción y `h1` propios** | Portada, cada sección, cada tema y cada nota; se recortan al largo que muestra Google | `pruebas/seo-paginas.test.mjs` |
| **Imagen para compartir** | Una tarjeta propia por nota de 1200 × 630 (`opengraph-image`) y otra de 1080 × 1350 para el posteo de Instagram (`instagram.png`). Nunca la foto de otro medio | `web/lib/tarjeta.js`; medidas en `FORMATOS.md` |
| **Íconos y manifiesto** | `favicon.ico` (16/32/48), `icon-192`, `icon-512`, `apple-touch-icon` (180) y `manifest.webmanifest` | `web/public/`, `web/scripts/hacer-iconos.mjs`, `pruebas/seo-paginas.test.mjs` |
| **`feed.xml`** (RSS) | Para programas, no para el índice de búsqueda | `web/app/feed.xml` |
| **`llms.txt`** | Descripción del sitio para buscadores con IA | `web/app/llms.txt` |
| **Política de privacidad** | Página pública | `web/app/politica-de-privacidad`, `POLITICA-PRIVACIDAD.md` |
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
| **Google AdSense** | Monetizar con avisos de Google | **Se dejó para más adelante (24/09).** Pide cuenta con datos fiscales, verificar el sitio, `ads.txt` (hoy no existe) y aprobación de días a semanas. Ver `PUBLICIDAD.md` |
| **Páginas de confianza** (quiénes somos, contacto, política editorial) | Lo que Google y las IA miran para decidir si un medio es confiable | Sacar de `EDITORIAL.md` lo que se puede publicar |
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

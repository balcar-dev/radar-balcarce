# SEO: cómo se posiciona la web

*Actualizado el 29/09/2026.* Qué está hecho, cómo se audita y qué falta. Lo que
falta, con quién y qué urgencia, vive en `PENDIENTES.md`; acá se explica el estado.

## Lo hecho

| Tema | Cómo está | Dónde |
|---|---|---|
| **Direcciones fijas** | `/nota/titulo-de-la-nota-id`, fija desde la primera vez que sale aunque cambie el titular; la página dura 180 días (`web/data/archivo.json`). La 404 rescata direcciones viejas por el identificador (`/nota/indice.json`) | `web/lib/ruta.js`, `web/lib/archivo.js`, `pruebas/archivo.test.mjs` |
| **Redirecciones 301** | Se escriben en cada compilación en `web/public/_redirects`: las direcciones viejas de las notas (`/nota/id`) y de las secciones y, desde el 29/09, **las notas repetidas**: la misma noticia que volvió a entrar con otro enlace se une sola y la que se retira redirige a la que queda (`web/lib/repetidas.js`, `web/data/fusionadas.json`). `www` va al dominio sin `www` (regla de Cloudflare; el vigilante avisa si deja de andar) | `web/scripts/generar-redirects.mjs`, `pruebas/redirects.test.mjs` |
| **Sitemaps** | `sitemap.xml`: la portada, las secciones, los servicios, las páginas de confianza, las notas, las archivadas con cuerpo (180 días), los eventos que vienen y los temas. `sitemap-news.xml`: formato Google News, últimas 48 horas, sin las notas sin fecha real. Los dos, enviados a Search Console el 24/09 | `web/app/sitemap.js`, `web/app/sitemap-news.xml/` |
| **`robots.txt`** | En el dominio propio permite todo menos `/feed.xml` y **`/panel/`** (el panel del celular, 29/09, que además manda `X-Robots-Tag: noindex`). Fuera del dominio propio (vistas previas) prohíbe indexar, para no duplicar las notas | `web/app/robots.js`, `web/lib/sitio.js` |
| **Canónico** | Siempre `https` y sin `www`; cada página declara el suyo y sólo la portada es `/` | `web/lib/sitio.js`, `web/components/metadatos.js`, `pruebas/seo.test.mjs` |
| **Título, descripción y `h1`** | Propios en la portada, cada sección, cada tema y cada nota; el título de una nota se corta en 60 caracteres y la descripción en 155 (`recortarEn`, `web/lib/texto.js`) | `pruebas/seo-paginas.test.mjs` |
| **Datos estructurados** | `NewsArticle` en cada nota (el autor dice lo mismo que la firma), `NewsMediaOrganization` con logo, `WebSite` y `BreadcrumbList` | `web/components/ficha.js` |
| **Imagen para compartir** | Una tarjeta de 1200 × 630 por nota (`opengraph-image`) y otra de 1080 × 1350 para Instagram, con la foto del banco si hay (sin marca de agua ni crédito adentro) o la banda de color; servidas como `image/png` | `web/lib/tarjeta.js`; medidas en `FORMATOS.md` |
| **Íconos y manifiesto** | `favicon.ico`, `icon-192`, `icon-512`, `apple-touch-icon` y `manifest.webmanifest` | `web/public/`, `web/scripts/hacer-iconos.mjs` |
| **Páginas de servicio y de confianza** | `/farmacias`, `/clima`, `/dolar` (nunca dice "en vivo"), `/agenda`, `/util`; "Quiénes somos", "Contacto" y la política de privacidad, enlazadas desde el pie | `web/app/` |
| **Notas con cuerpo** | Una nota automática sin cuerpo de 70 palabras no se publica, y al sitemap van sólo las archivadas con cuerpo. Las viejas con "EN VIVO" o "minuto a minuto" en el título se retiran solas (`diceEnVivo`) | `web/lib/cuerpo.js`; regla 23 de `docs/10-REGLAS-Y-PRUEBAS.md` |
| **Encabezados** (`_headers`) | HSTS, `nosniff`, `frame-ancestors`; caché de un año para `/_next/static` y de una semana para las fotos; el panel del celular, con su propia política de seguridad (sólo puede hablar con GitHub) | `web/public/_headers`, `pruebas/seo-paginas.test.mjs` |
| **Idioma y accesibilidad básica** | `lang="es-AR"`, etiquetas de sección con contraste de al menos 4,5:1, el buscador con nombre para lectores de pantalla | `pruebas/seo-paginas.test.mjs` |
| **Feed y `llms.txt`** | `feed.xml` (RSS, para programas) y una descripción del sitio para buscadores con IA | `web/app/feed.xml/`, `web/app/llms.txt/` |
| **Search Console y analítica** | Dominio verificado con un registro TXT en Cloudflare (24/09). Cloudflare Web Analytics, gratis y sin cookies; su token (`CLOUDFLARE_ANALYTICS_TOKEN`) trae las visitas al resumen de WhatsApp | `radarbalcarce@gmail.com` |
| **Velocidad** | HTML estático, sin banners de terceros | — |

## Cómo se audita

- **En cada compilación:** `web/scripts/revisar-seo.mjs` (título, descripción,
  canónico y `h1` de las páginas generadas).
- **A demanda:** `node web/scripts/auditar-seo-vivo.mjs [url]` revisa lo publicado
  (título, descripción, `h1`, canónico, ícono, imagen para compartir).
- **Cada lunes:** `redes/auditar.mjs` (workflow `auditoria.yml`) corre ese auditor,
  mide las imágenes publicadas y avisa por WhatsApp si algo falla (`FORMATOS.md`).

## Lo que falta

Con quién y qué urgencia, en `PENDIENTES.md`. En corto:

- **Del sitio (Claude):** las páginas archivadas sin cuerpo de verdad, que Google
  puede encontrar (A7); las tarjetas para compartir pesadas (A8); el feed y el
  sitemap (A11: `robots.txt` bloquea `/feed.xml` pero la portada lo anuncia); las
  cosas chicas (A12: `ads.txt`, una política de seguridad completa para todo el
  sitio, "saltar al contenido"); las páginas `/tema/`, que están en el sitemap sin
  que nada las enlace (sacarlas o prenderlas).
- **De una persona:** el alta en Google Publisher Center (Google Noticias y
  Discover, que pide imágenes de 1200 px o más), Bing Webmaster Tools (se importa
  de Search Console con un permiso de Google), mirar qué indexó Google, Google
  Business Profile si corresponde y AdSense (`PUBLICIDAD.md`).
- **A decidir:** los rastreadores de IA en `robots.txt` (GPTBot, ClaudeBot,
  PerplexityBot, Google-Extended: permitirlos da citas, bloquearlos protege el
  contenido) y la política editorial como página pública (`IDEAS.md`).
- **Para medir:** PageSpeed y Core Web Vitals, cómo se ve cada nota compartida
  (depurador de Facebook, Twitter Cards) y parámetros UTM en los enlaces de redes.

## Reglas a cuidar

- No cambiar la dirección de una nota sin redirección 301.
- Una nota repetida no se borra: se une a la que queda y redirige
  (`web/data/fusionadas.json`).
- No indexar la web desde una dirección que no sea `radarbalcarce.com`
  (`web/lib/sitio.js` lo evita solo).
- El canónico apunta siempre al dominio sin `www`.

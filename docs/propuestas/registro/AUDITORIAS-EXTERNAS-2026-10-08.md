# Auditorías hechas con otras IA · 8/10/2026

*Hernán y Andrés pasaron auditorías del sitio hechas con otras IA. Acá queda qué dice cada una, qué es cierto
contra el código y lo publicado, y qué se sumó a las listas. Lo que se suma está en `../MEJORAS.md`,
`../IDEAS-NUEVAS.md` y `../PRIORIDADES.md`.*

**Estados:** **Cierto** (coincide con el código o los datos) · **Ya estaba** (ya anotado) · **Nuevo** (se suma) ·
**Equivocado** (no coincide con lo que existe) · **No conviene** (choca con una regla o no sirve) ·
**A confirmar**.

---

## Auditoría 1 · "Dossier Radar Balcarce"

**En general:** describe un sitio que no es el nuestro. Dice que la portada es "solo un bloque de texto", sin
titulares, secciones, menú, buscador ni páginas institucionales; que el sitio corre en Akamai, desde Francia, y
"sin frameworks". Nada de eso es así: el sitio tiene portada con titulares, once secciones, buscador, pie con
Quiénes somos, Contacto y Privacidad, y corre en Cloudflare con Next.js. Lo más probable es que esa IA no haya
podido ver el sitio real (por ejemplo, porque leyó una página de bloqueo o una vista sin armar). **Sus
conclusiones de sitio y navegación no sirven**; algunas herramientas y su comparación de medios, sí.

| Lo que dice | Estado | Comentario |
|---|---|---|
| "Indexación nula: `site:radarbalcarce.com` no da resultados" | **A confirmar** | El buscador de esta sesión tampoco devolvió páginas del sitio, pero ese buscador no maneja bien `site:`. Search Console está verificado y con los sitemaps enviados (`SEO.md`). **Hay que mirar en Search Console cuántas páginas indexó Google**: es el dato que define el riesgo S-1 |
| Portada sin titulares, menú, buscador ni páginas institucionales | **Equivocado** | Existen `web/app/quienes-somos`, `contacto`, `politica-de-privacidad`, las secciones y el buscador |
| Akamai, IP de Francia, "sin frameworks" | **Equivocado** | Cloudflare Pages y Next.js |
| "Sin redes sociales" | **Equivocado** | Facebook e Instagram existen (con pocos seguidores) |
| `robots.txt` sugerido con `/admin/`, `/api/` | **No conviene** | No existen esas rutas. Lo único a cambiar del nuestro es destrabar el feed (S-1 y V2-13) |
| Sitemaps general y de noticias | **Ya estaba** | Existen los dos |
| Alta en Google News Publisher Center | **Equivocado** | Publisher Center no admite medios nuevos desde abril de 2024: es automático (SEO) |
| NewsArticle con `citation`, NewsMediaOrganization, BreadcrumbList | **Ya estaba** | Existen. Sumar `ethicsPolicy` cuando exista la página de criterio (S-5) |
| URLs con fecha (`/nota/2026/10/08/…`) | **No conviene** | Las direcciones de hoy son fijas; cambiarlas rompería enlaces y obligaría a redirigir todo |
| Header, buscador, paginación, footer institucional | **Ya estaba** | Existen |
| GA4 con banner de cookies | **No conviene** | Mete scripts de terceros (C-2) y datos a Google. Hoy se mide con Cloudflare, sin cookies |
| Caché de 1 año para archivos fijos | **Ya estaba** | `web/public/_headers` |
| WebP/AVIF con sharp, `loading="lazy"` | **Ya estaba** | C1 y C3; la carga diferida ya existe |
| Política editorial, términos de uso, aviso legal | **Nuevo en parte** | La política editorial pública ya estaba (S-5). **Términos de uso no existe**: se suma a V2-8 |
| Newsletter (Buttondown, Mailerlite) | **Ya estaba** | D-3 (con Brevo) |
| Comparación con medios (Misiones Online, Wips, Prensa Libre SN, Sebastopol Times, El Argentino) | **Nuevo, solo búsqueda** | Ideas útiles: servicios profesionales (ya en K-9) y **membresía de lectores** (nuevo, para más adelante). La cifra de "15 a 28 % de conversión a suscripción" no tiene fuente clara: no tomarla como dato |
| edge-tts gratis e ilimitado | **Ya estaba, con reparos** | No es un servicio oficial: puede cortarse y no contempla el uso comercial. Ver "¿Audio para el 100 % de las notas?" |
| "Gemini TTS no tiene capa gratis" | **Equivocado para nosotros** | Hoy las voces salen de la capa gratis de Gemini (10 audios por día) |
| QuikVox (WordPress), LiveKit, ReadSpeaker | **No conviene** | No usamos WordPress; LiveKit es voz en vivo; ReadSpeaker es pago y otra voz |
| CapCut, Wochit Go, Canva, VistaCreate | **Solo manual** | Sirven para piezas hechas a mano; lo automático ya se arma con código |
| LTX-2.5 (video generado por IA) | **No conviene** | Inventar imágenes en un medio de noticias choca con "no se inventa" |
| AutoTube, Tymonyz | **No conviene** | Repositorios sin verificar; para YouTube y TikTok el freno es la auditoría de cada plataforma, no la herramienta |
| Unsplash y Pexels (fotos libres) | **Nuevo, con decisión** | Pueden servir como "imagen ilustrativa" en temas genéricos (clima, economía), siempre rotuladas así y nunca como si fueran del hecho. Choca en parte con el criterio de fotos: decisión de ustedes |
| Squoosh | **Solo manual** | sharp (ya anotado) hace lo mismo automático |
| Google Pinpoint y NotebookLM | **Nuevo** | Herramientas gratis para que una persona investigue documentos largos (presupuesto municipal, ordenanzas, actas) |
| AdSense | **Ya estaba** | Posponerlo: paga centavos y mete scripts de terceros |
| Spot-On (publicidad política), MGID (nativa) | **No conviene** | Publicidad política choca con la neutralidad; la nativa trae títulos tipo "clickbait" y scripts de terceros |
| EmpowerLocal, NewsBreak | **No conviene** | Son de Estados Unidos |
| Flujo edge-tts + RSS → Spotify y Apple | **Ya estaba** | RS-1 y RS-2; en el proyecto se haría con Node, no con Python |
| ¿Cambiar de Next.js a Astro o WordPress? | **No conviene** | Next.js funciona; el problema no es el armado |

## Auditoría 2 · "Gran resumen completo"

**En general:** está bien hecha y coincide con el código en casi todo (Next.js, Cloudflare, encabezados de
seguridad, PWA, RSS, sitemaps, Cloudflare Web Analytics, el feed bloqueado en `robots.txt`). Su aporte principal
es el **plan de contenido original** y el **sello de "nota propia"**.

| Lo que dice | Estado | Comentario |
|---|---|---|
| Transparencia sobre la IA excepcional; utilidades diarias excelentes | **Cierto** | Coincide con la auditoría de SEO |
| Poca producción original; dependencia de otros medios | **Cierto, ya estaba** | Es el riesgo S-1 de SEO |
| Faltan textos alternativos en imágenes de portada | **Cierto en parte** | Las fotos tienen `alt=""` a propósito (el título está al lado y un lector de pantalla no lo repite). Para Google Imágenes conviene una descripción real, sin inventar (V2-15, R-9) |
| Destrabar `/feed.xml` en `robots.txt` | **Ya estaba** | V2-13, S-1 |
| RSS: descripciones más largas, imagen, autor | **Ya estaba** | RSS-1 (con el cuerpo completo) |
| Feed aparte solo de contenido original | **Nuevo** | Se suma a las ideas |
| Sello visible "Original" / "Nota de Radar Balcarce", separado de lo automático | **Nuevo** | Se suma a las ideas |
| Plan de contenido original: 1 nota propia por semana el primer mes, después 2 | **Nuevo** | Se suma, con las 10 primeras notas cruzadas con las ideas que ya estaban |
| Posicionamiento: "El medio más útil y transparente de Balcarce" | **Nuevo** | Se suma como propuesta de frase para el sitio y las redes |
| Keywords de utilidad ("farmacia de turno Balcarce", "clima Balcarce") | **Ya estaba** | SEO local (S-3) y D-6 |
| Monetización local no invasiva, newsletter | **Ya estaba** | Sección 9 y D-3 |
| NewsArticle con autor real en notas propias | **Ya estaba** | S-5, W-4 |
| Nota 8,7 sobre 10 | — | Opinión |

### Las 10 primeras notas propias que propone, cruzadas con lo que ya estaba

| Nota que propone | Ya estaba como | Estado de los datos |
|---|---|---|
| Qué se está hablando en Balcarce esta semana (de lo que mandan por WhatsApp) | **Nueva** | Trabajo humano |
| Farmacias de turno: por qué a veces no coincide y cómo lo chequeamos | **Nueva** (explicador) | Datos propios |
| El mapa de los baches según los vecinos | El reclamómetro (D-12) | Trabajo humano |
| Cuánto cuesta vivir en Balcarce hoy | Canasta Radar (V-11) | Trabajo humano |
| Entrevista a 3 o 4 comerciantes del centro | Entrevista de 5 minutos (R-15), Abrió en Balcarce | Trabajo humano |
| Lo que nadie te cuenta de la Ruta 55 y la 226 | Rutas y niebla (V-5), Seguridad vial (POC-2) | Parte bloqueada |
| Agenda real de la semana: qué vale la pena | El finde en 5 placas (R-13) | Datos propios |
| Balcarce en números | Notas con datos comprobados (ECO-1, POL-1, AGR-1, POL-3, EDU-2) | **Comprobado** |
| Qué pasó finalmente con… | Qué pasó con… (V-8) | Datos propios |
| Vecinos que hacen cosas, historias de la sierra | **Nueva** (perfiles) | Trabajo humano |

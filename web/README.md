# La web de Radar Balcarce

Sitio público en Next.js 15 (JavaScript), exportado como **HTML estático** y
servido por **Cloudflare Pages** en `radarbalcarce.com`. No se conecta en vivo
a nada: lee dos archivos que regenera GitHub Actions cada 30 minutos
(`../INFRAESTRUCTURA.md`):

- `data/portada.json`: lo que se **muestra** (portada, secciones, buscador,
  feed). Sólo notas de las últimas 72 horas.
- `data/agenda.json`: los **eventos de la agenda**, cada uno con su página
  (`/agenda/<nombre>-<id>`): los del municipio y los que se publican desde el
  panel (llegan por `data/eventos-panel.json`), hasta 60 días después de que
  pasan. Reglas en `lib/eventos.js` y `../CRITERIO-EDITORIAL.md` (sección 8).
- `data/archivo.json`: lo que tiene **página**. Todo lo publicado de los
  últimos 180 días (hasta 2500 notas). Así una nota que sale de la portada
  sigue teniendo su página y los enlaces que circulan no se rompen. La
  dirección de cada nota queda fija desde la primera publicación, aunque la IA
  cambie el titular. Reglas en `lib/archivo.js`.

## Correr en la máquina

```bash
cd web
npm install          # una sola vez
npm run dev          # genera los datos y levanta http://localhost:3000
npm run datos        # sólo regenera data/portada.json y data/archivo.json
npm run build        # compila (arma las redirecciones; NO regenera los datos)
```

`npm run datos` (`scripts/generar-datos.mjs`) arma `data/portada.json` y
`data/archivo.json` a partir de la ingesta y de las decisiones de
`data/decisiones.json`. Si nunca corrió,
la web arranca igual con un aviso.

## Dónde está cada cosa

| Carpeta | Qué hay |
|---|---|
| `app/` | Las páginas: portada, `nota/`, `seccion/`, `tema/`, `agenda/` (y `agenda/[id]`, cada evento con su `.ics`), `farmacias/`, `dolar/` (la cotización, que se pide en el navegador), `util/`, `politica-de-privacidad/`, `quienes-somos/`, `contacto/`, la 404 (`not-found.js`, rescata direcciones viejas con `nota/indice.json`), más `sitemap`, `sitemap-news.xml`, `robots`, `feed.xml` y `llms.txt` |
| `components/` | Piezas de la interfaz (avisos, buscador, clima, ficha con datos estructurados, compartir) |
| `lib/` | Direcciones (`ruta.js`), archivo de notas (`archivo.js`), dirección del sitio (`sitio.js`), tarjetas de imagen (`tarjeta.js`) |
| `data/` | `portada.json`, `archivo.json`, `agenda.json` y `dolar-historia.json` (los regenera Actions), `decisiones.json`, `avisos.json` y `eventos-panel.json` (los sube el panel), `redes.json` (libro de lo publicado); `dolar.json` es la foto del dólar que guarda cada build (no se versiona) |
| `scripts/` | Generar datos y redirecciones, íconos, auditoría de SEO y `recuperar-archivo.mjs` (herramienta de rescate: rearma `data/archivo.json` desde el historial de git si se pierde o se rompe) |
| `public/` | Íconos, manifiesto, `_headers` (la imagen para compartir sale como `image/png`, HSTS y otros encabezados de seguridad, caché de un año para `/_next/static`) y `_redirects` (se genera en cada compilación) |

## El dólar (`/dolar`)

La cotización se pide **en el navegador** de quien abre la página, a
[DolarApi.com](https://dolarapi.com) (`/v1/dolares`), y cada 5 minutos
mientras sigue abierta; si no contesta, a [Bluelytics](https://bluelytics.com.ar)
(sólo oficial y blue). Las dos son gratis, sin clave y con CORS abierto.

Mientras tanto, o si las dos fallan, se ve la foto que guardó el build
(`scripts/foto-dolar.mjs` → `data/dolar.json`, corre al principio de
`npm run build`, nunca lo frena y no se versiona), marcada con su hora y
"no se pudo actualizar". La página **nunca** dice "en vivo": el punto verde y
"Actualizado a las…" aparecen sólo cuando la fuente contestó en el navegador,
y la hora es la que informa la fuente. Lógica y textos en `lib/dolar.js`,
tarjetas en `components/dolar-vivo.js`, pruebas en `../pruebas/dolar.test.mjs`.

## Sistema tipográfico

Las tarjetas de servicio (clima, farmacia, dólar, agenda, buzón, números útiles)
y las páginas `/farmacias`, `/dolar`, `/agenda` y `/util` comparten UN sistema,
definido con variables en `app/globals.css` (bloque "sistema tipográfico").
Nada de tamaños sueltos: se usa una variable.

| Rol | Variable | Valor | Se usa en |
|---|---|---|---|
| Etiqueta | `--t-etiqueta` + `--ls-etiqueta` | 11px, 600, mayúsculas, letra abierta, gris | Primera línea de cada tarjeta (`.etiqueta` dentro de `.cabecera-tarjeta`) |
| Meta | `--t-meta` | 12,5px, gris | Hora, aclaraciones, "compra $1.495" |
| Texto | `--t-texto` | 14px | Dirección, descripción, números útiles |
| Acción | `--t-accion` | 13px, 600, rojo, con "→" | "Ver la semana →", "Ver todos los dólares →", "Toda la guía →", "Toda la agenda →" (`.accion`) |
| Dato | `--t-dato` | 16px, 700 | Nombre de la farmacia, estado del cielo, tipo de dólar |
| Dato grande | `--t-dato-grande` | 22px, 700, tabular | Venta del dólar, número de teléfono |
| Cifra | `--t-cifra` | 44px, 700, tabular | Sólo la temperatura |
| Título de tarjeta | `--t-titulo-tarjeta` | 19px, Fraunces 700 | Buzón e invitaciones ("¿Viste algo en el barrio?") |

Familias: **Fraunces** sólo para títulos de nota, de sección y de tarjeta y para el
nombre de marca; **IBM Plex Sans** para todo lo demás (etiquetas, datos, cifras,
texto). Nunca una cifra ni un nombre de servicio en Fraunces (el "wonk" tuerce la
J y las S y los dígitos quedan de ancho distinto). Las cifras llevan
`font-variant-numeric: tabular-nums`. No se carga IBM Plex Mono: no hace falta.

- **El nombre de la farmacia es un dato, no un titular**: mismo tamaño y peso que
  cualquier dato y en tinta. El rojo es el acento de las acciones. "Cómo llegar"
  lleva el pin del mapa en lugar de la flecha porque abre otra aplicación.
- **Puntito de estado** (`.punto-vivo`, 6px, verde): siempre a la izquierda de la
  etiqueta y sólo cuando el dato está confirmado al día (farmacia del día; clima y
  dólar cuando el navegador ya consultó la fuente).
- **Tarjeta del dólar de la portada**: grilla de tres columnas compartida por las
  filas (`subgrid`): nombre | compra | venta. Cada columna toma el ancho de su
  contenido más largo, así que las tres filas alinean aunque un monto tenga más
  dígitos o falte la compra (la celda queda vacía). Pesos enteros
  (`pesosEnteros`); los centavos se ven en `/dolar`, donde si algún valor los
  tiene, todos llevan dos decimales para que las cifras alineen. El tamaño de las
  ventas es fluido (`cqw`, container query) y el mismo en todas las filas.
- **Cambiar un tamaño** = cambiar la variable, no la tarjeta. Pruebas:
  `../pruebas/tipografia.test.mjs`.

## Las notas propias (`lib/notas-propias.js`)

Notas que arma el sitio con datos propios, **sin IA**: texto de plantilla
lleno con números o con lo ya publicado. Son notas normales (portada,
sección, feed, sitemap de noticias, archivo) y pasan por la regla de cuerpo
(`lib/cuerpo.js`). No van a Facebook ni a los podcasts. Las arma
`scripts/generar-datos.mjs` en cada corrida.

- **El dólar del día**: una por día hábil, desde las 11:00 de Balcarce, con los
  números que da DolarApi en ese momento (oficial, blue, MEP, contado con liqui,
  tarjeta, mayorista y la brecha). Si el oficial no se actualizó hoy (feriado,
  o el mercado no abrió) no se hace, y se vuelve a probar hasta las 18. Compara
  con el día hábil anterior y con una semana atrás sólo con lo guardado en
  `data/dolar-historia.json` (la cotización de cada día, 60 días, versionada;
  sólo la escribe GitHub Actions). Sección Economía, relevancia 55 (no le gana a
  lo de Balcarce), identificador `dolar20260925`, botón "Ver la cotización
  actualizada" a `/dolar`.
- **El repaso de cada podcast**: ver `../REDES.md` ("Cada podcast tiene su nota
  en la web"). Identificador `repaso20260926manana` (`tarde`, `noche`).

Los identificadores no llevan guiones (la dirección es `titular-ID` y el ID es
lo que va después del último guion, `lib/ruta.js`). La firma sale de
`nota.firma` (`components/metadatos.js`, `firmaCorta`), los datos para Google dicen
"Radar Balcarce" (`components/metadatos.js`), y los enlaces adentro del texto
(`nota.enlacesEnTexto`) y los botones (`nota.destacados`) los pone
`app/nota/[id]/page.js` con `lib/enlaces-en-texto.js`. Pruebas:
`../pruebas/notas-propias.test.mjs`.

## Para saber más

- Cómo se eligen y escriben las notas: `../CRITERIO-EDITORIAL.md` (el criterio) y `../MANUAL.md` (lo técnico).
- Qué reglas se cuidan en la portada: `../REGLAS.md`.
- SEO y auditoría: `../SEO.md`.
- Dónde corre y qué se cae: `../INFRAESTRUCTURA.md`.

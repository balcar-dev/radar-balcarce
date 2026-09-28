# 01 · El árbol: cada carpeta y cada archivo

*Escrito el 28/09/2026 con `git ls-files` (la lista completa de lo versionado) y
verificado contra el código: quién importa a quién, qué corre cada workflow
(`.github/workflows/`) y cada script de `package.json`. Si se suma o se saca un
archivo, se corrige acá.*

Cómo leer las tablas:

- **Quién lo llama**: el workflow que lo corre, el archivo que lo importa, "a
  mano" (una persona lo corre en la consola) o "la IA lo lee".
- **¿En uso?**: **Sí** (corre solo, en la nube o en el panel), **A mano**
  (existe para correrlo cuando hace falta), **Apagado** (el código está pero
  no se usa, a propósito) o **Sin uso** (nadie lo llama).
- Los archivos de `pruebas/` (84) tienen su línea cada uno en
  `docs/10-REGLAS-Y-PRUEBAS.md`, "Todos los archivos de `pruebas/`"; los
  documentos (`.md`), en `docs/00-INDICE.md`.

## El árbol, de un vistazo

```
radar-balcarce/
├── .github/workflows/   12 workflows: lo que corre solo en GitHub (docs/08)
├── ingesta/             el motor: fuentes, cruce, selección, lectura con IA, verificador. SIN dependencias (docs/02, 03, 04)
├── reels/               placas, voz, video y la reescritura con IA. SÍ tiene dependencias (docs/04, 07)
├── redes/               Facebook, Instagram, contrato, vigilante, WhatsApp. SIN dependencias (docs/07, 08)
├── panel/               el tablero de la PC, puerto 4321. SIN dependencias (docs/09)
├── web/                 el sitio: Next.js 15 exportado como HTML estático (docs/06)
│   ├── app/             las páginas
│   ├── components/      las piezas de la interfaz
│   ├── lib/             la lógica compartida (datos, archivo, rutas, tarjetas…)
│   ├── scripts/         generar-datos y los ayudantes del build
│   ├── data/            los JSON que lee el sitio (los escribe GitHub, el panel o una persona)
│   ├── public/          íconos, encabezados de Cloudflare, fotos del banco
│   └── fuentes/         las letras de las imágenes para compartir
├── pruebas/             las pruebas (*.test.mjs) + 2 de material (docs/10)
├── comercial/           la base de comercios, aparte del sitio (COMERCIAL.md)
├── docs/                la documentación (docs/00-INDICE.md) e historico/
└── (raíz)               CLAUDE.md, los criterios, PENDIENTES.md y demás documentos; package.json; ARRANCAR.bat
```

Lo que **no** se versiona (`.gitignore`): `node_modules/`, `.env*`,
`panel/datos/` (usuarios, decisiones completas, buzón), `respaldos/`,
`reels/salida/` y `reels/marca/` salvo `reels/marca/fuentes/`,
`ingesta/salida/`, `.cache/` (la memoria del cruce), `web/.next/`, `web/out/`,
`web/public/_redirects`, `web/data/dolar.json`, `comercial/salida/` y
`comercial/datos/osm-crudo.json`.

## La raíz

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `.gitignore` | Lo que no va al repositorio (lista de arriba) | git | Sí |
| `ARRANCAR.bat` | Abre la ventana "Radar Balcarce - PANEL" con `node panel/servidor.mjs` y el navegador en `localhost:4321` | Hernán, doble clic | Sí |
| `package.json` | Las dependencias de `reels/` (`@resvg/resvg-js`, `ffmpeg-static`, `msedge-tts`) y los scripts `test`, `panel`, `ingesta`, `auditar` | `npm`; los workflows (`npm ci`) | Sí |
| `package-lock.json` | Las versiones exactas de esas dependencias | `npm ci` en los workflows | Sí |
| `*.md` (15 documentos) | Ver `docs/00-INDICE.md` | Personas; `CRITERIO-EDITORIAL.md` y `CRITERIO-REDES.md` también el código | Sí |

## `.github/workflows/` (detalle en `docs/08-INFRAESTRUCTURA.md`)

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `actualizar.yml` | "Actualizar la web": pruebas, ingesta, lectura y reescritura con IA, fotos, datos, compilar, revisar SEO, commit de `web/data/` | cron-job.org cada 30 min; `schedule` 7 y 37 de respaldo; a mano | Sí |
| `cloudflare-deploy.yml` | "Cloudflare Pages": compila y sube `web/out` con wrangler | Al terminar bien "Actualizar la web"; a mano | Sí |
| `redes.yml` | "Redes": Facebook, el reloj, armar y subir piezas, completar direcciones, guardar el libro | cron-job.org; al terminar "Actualizar la web"; a mano | Sí |
| `piezas.yml` | "Piezas": armar (y publicar) una pieza a mano | A mano | A mano |
| `vigilancia.yml` | "Vigilancia": `redes/vigilar.mjs` | cron-job.org cada 30 min; `schedule` cada 3 h; a mano | Sí |
| `auditoria.yml` | "Auditoría": medidas, íconos, SEO en vivo y la semana del contrato | Lunes 12:00 UTC; a mano | Sí (corrió por primera vez el 28/09; guarda `web/data/auditoria.json`) |
| `auditar-redes.yml` | "Auditar redes": el contrato contra Meta (hoy, ayer, semana, crudo) | A mano | A mano |
| `auditar-voz.yml` | "Auditar voz": clips con la voz real y su transcripción | A mano | A mano |
| `ver-facebook.yml` | "Ver Facebook": qué hay publicado de verdad en la página | A mano | A mano |
| `prueba-estadisticas.yml` | "Prueba de estadísticas": visitas y seguidores, y qué permisos faltan | A mano | A mano |
| `prueba-gemini.yml` | "Prueba de Gemini": un pedido mínimo con la clave de redacción | A mano | A mano |
| `prueba-whatsapp.yml` | "Prueba de WhatsApp": un mensaje de prueba por CallMeBot | A mano | A mano |

## `ingesta/` — el motor, sin dependencias

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `README.md` | Cómo correr el motor a mano; remite a `docs/02-INGESTA.md` | Personas | — |
| `agenda.mjs` | La agenda del municipio (su API de eventos), las fiestas del calendario anual, la base de contactos y el mensaje para pedir fechas | `web/scripts/generar-datos.mjs`, `panel/servidor.mjs` | Sí |
| `alertas.mjs` | Los avisos de clima (helada, granizo, viento, lluvia) y sus `UMBRALES` | `generar-datos.mjs`, `redes/piezas.mjs` | Sí |
| `articulo.mjs` | Baja la página de la nota original y saca su texto (sin menús, pies ni necrológicas); `decodificar` traduce entidades HTML | `reels/reescritura.mjs`, `ingesta.mjs` | Sí |
| `auditar.mjs` | Muestra qué decide el filtro sobre las notas de hoy y con qué palabra | A mano: `npm run auditar` | A mano |
| `contactos-agenda.json` | Las 43 instituciones a las que se les piden fechas, con sus canales oficiales | Lo lee `agenda.mjs` (para el panel) | Sí |
| `criterio.mjs` | Los números del criterio editorial (largos, topes, medios, cupos, horas, Facebook, podcasts, contrato, nota del dólar) | Casi todo el código; `pruebas/criterio.test.mjs` lo compara con `CRITERIO-EDITORIAL.md` | Sí |
| `cruce.mjs` | Junta las notas que cuentan el mismo hecho (TF-IDF, 0,42) y maneja la memoria de 36 horas | `ingesta.mjs` | Sí |
| `estadistica-diaria.mjs` | Cuántas notas se publicaron hoy y por sección, y su informe de las 21 | `generar-datos.mjs`, `redes/avisos.mjs` | Sí |
| `fotos.mjs` | Candidatas de foto, comparación con Gemini o Groq, la red de seguridad contra la marca de agua, Wikimedia y el crédito | `web/scripts/fotos-notas.mjs` | Sí |
| `fuentes-cruce.mjs` | Las 160 fuentes del cruce de medios, una por línea | `ingesta.mjs`, `lectura-ia.mjs`, `listar-fuentes.mjs` | Sí |
| `fuentes.mjs` | Las 58 fuentes de siempre y todas las listas de palabras: sección, semáforo, local, zona, figuras, filtro de entrada, temas, farmacias a mano; `fichaDeFuente` | `ingesta.mjs`, `lectura-ia.mjs`, `reels/reescritura.mjs`, `generar-datos.mjs` y más | Sí |
| `ingesta.mjs` | `ingestar()`: baja, lee, filtra, marca, cruza, clasifica, puntúa, semáforo, medios, cupos, clima y farmacias. Corrido solo, deja `ingesta/salida/` | `generar-datos.mjs` (nube), `panel/servidor.mjs` (PC); a mano: `npm run ingesta` | Sí |
| `json.mjs` | Leer un JSON sin que un archivo faltante o roto tire abajo el proceso | `generar-datos.mjs`, `panel/servidor.mjs`, varios de `redes/` y `web/scripts/` | Sí |
| `lectura-ia.mjs` | La lectura con IA: fichas, qué saca, secciones, dos llaves, repetidas; Gemini con Groq de respaldo | `generar-datos.mjs` (nube) | Sí |
| `listar-fuentes.mjs` | Escribe `FUENTES.md` desde las dos listas de fuentes | A mano: `node ingesta/listar-fuentes.mjs` | A mano |
| `perfil-balcarce.md` | Lo que la IA de lectura sabe de Balcarce (sólo datos seguros) | La IA lo lee (vía `lectura-ia.mjs`) | Sí |
| `probar.mjs` | Prueba si las fuentes candidatas (`CANDIDATOS`) o una URL suelta están vivas | A mano: `node ingesta/probar.mjs [url]` | A mano |
| `prompt-editorial.mjs` | Lee la instrucción de la IA de `CRITERIO-EDITORIAL.md` § 12, entre sus marcas; sin ella, la reescritura no arranca | `reels/reescritura.mjs` | Sí |
| `utiles.mjs` | Los teléfonos útiles (`NUMEROS`), la farmacia de turno que cambia a las 8:30 (`diaDeTurno`), qué día tocan los útiles (`diaRotativoDeUtiles`) y qué decisión es de una persona (`decisionHumana`) | `ingesta.mjs`, `generar-datos.mjs`, `panel/`, `redes/`, `reels/` | Sí |
| `verificar.mjs` | El verificador de lo que escribe la IA y los arreglos que no inventan (`arreglarEscritura`) | `reels/reescritura.mjs`, `panel/servidor.mjs` | Sí |
| `zona.mjs` | La hora de Balcarce, la única del código (GitHub corre en UTC) | Casi todo lo que mira "hoy" | Sí |

## `reels/` — placas, voz, video y la reescritura (con dependencias)

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `alinear.mjs` | Detecta los silencios del audio con ffmpeg para saber cuándo arranca cada palabra | `voz-gemini.mjs` | Sí |
| `auditar-voz.mjs` | La auditoría de voz: clips de prueba, transcripción y juicio | `auditar-voz.yml` | A mano |
| `avatar.mjs` | Dibuja la foto de perfil de las redes | A mano: `node reels/avatar.mjs` (la sube una persona) | A mano |
| `claves.mjs` | Las cuatro claves de IA (redacción, redes, clasificación, Groq), del entorno o del `.env` | Reescritura, lectura, fotos, voz, panel, `generar-datos.mjs` | Sí |
| `cortina.mjs` | Genera la cortina musical con ffmpeg | `reel.mjs` (la importa, pero la cortina está apagada: sonaba a pitido) | Apagado |
| `duracion.mjs` | Mide un video y recorta la historia que pasa de 58 segundos | `reel.mjs` | Sí |
| `placa.mjs` | Dibuja las placas (SVG → PNG de 1080 × 1920). | `plan.mjs`, `reel.mjs` | Sí |
| `plan.mjs` | El plan del día: qué pieza, con qué guion, placa y hora; con `--generar`, arma los videos | `redes.yml`, `piezas.yml` | Sí |
| `portada.mjs` | Dibuja la portada de la página de Facebook | A mano (la sube una persona) | A mano |
| `probar-gemini.mjs` | Un pedido mínimo a Gemini con la clave de redacción | `prueba-gemini.yml` | A mano |
| `reel.mjs` | Arma un video: placa, voz (Gemini o Elena), subtítulos, ffmpeg | `plan.mjs` | Sí |
| `reescritura.mjs` | La reescritura con IA de punta a punta: orden, topes, texto completo, pedido, verificación, partes internas, nivel de verificación, semáforo sobre lo escrito | `generar-datos.mjs` (nube), `panel/servidor.mjs` y `panel/notas.mjs` (PC) | Sí |
| `tiempos.mjs` | Reparte el tiempo del audio entre las palabras según sus sílabas | `alinear.mjs` | Sí |
| `voz-gemini.mjs` | La voz de Gemini (modelo TTS, clave paga) | `reel.mjs`, `auditar-voz.mjs` | Sí |
| `voz.mjs` | La voz de respaldo (Elena, de Microsoft Edge) y `paraLeer` (símbolos dichos en voz alta) | `reel.mjs`, `auditar-voz.mjs` | Sí |
| `marca/fuentes/*.ttf` (6) | Source Serif 4 (700 y 900, corte de 60 puntos) e Inter (400 a 700) para las placas, el avatar y la portada | `placa.mjs`, `avatar.mjs`, `portada.mjs` | Sí |

## `redes/` — Facebook, Instagram y la vigilancia, sin dependencias

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `auditar-redes.mjs` | Compara el contrato y el libro con lo que Meta tiene publicado | `auditar-redes.yml`, `auditoria.yml`, `vigilar.mjs` (el cierre de las 23:30) | Sí |
| `auditar.mjs` | La auditoría semanal de lo publicado; guarda `web/data/auditoria.json` | `auditoria.yml`; `vigilar.mjs` usa `auditoriaVencida` | Sí |
| `auditoria-voz.mjs` | La parte pura de la auditoría de voz (qué clips y cómo se juzgan) | `reels/auditar-voz.mjs` | A mano |
| `avisos.mjs` | Lo que se dice por WhatsApp y cómo entra en un mensaje; `pendientesDeLaIngesta` | `vigilar.mjs`, `generar-datos.mjs` | Sí |
| `contrato.mjs` | El contrato del día y el estado de cada pieza | `vigilar.mjs`, `avisos.mjs`, `auditar-redes.mjs` | Sí |
| `datos.mjs` | Traduce `web/data/portada.json` a los datos que espera el plan | `reels/plan.mjs` | Sí |
| `elegir.mjs` | Qué se publica: reglas de Facebook, texto del posteo, podcasts, `esParaLasRedes`, el interruptor (`estaActivo`) | `publicar.mjs`, `reloj.mjs`, `reels/plan.mjs`, `contrato.mjs` y más | Sí |
| `espejo.mjs` | Qué espejos de Instagram reintentar | `publicar.mjs` | Sí |
| `estadisticas.mjs` | Visitas (Cloudflare) y seguidores (Meta) | `vigilar.mjs`, `prueba-estadisticas.yml` | Sí |
| `formatos.mjs` | Las medidas de cada red, con fecha de verificación | `auditar.mjs`, pruebas | Sí |
| `guiones.mjs` | Lo que dice la voz en cada pieza (bancos de frases) y `revisarTexto` | `reels/plan.mjs`, `elegir.mjs`, `panel/servidor.mjs`, `reels/reescritura.mjs` | Sí |
| `meta.mjs` | Habla con Meta (Graph v23.0): posteo, foto, video, dirección pública, verificación | `publicar.mjs`, `auditar-redes.mjs`, `estadisticas.mjs`, `ver-facebook.mjs` | Sí |
| `piezas.mjs` | Cronograma, ventanas, podcasts, aviso de clima, color del día, techo de historias | `reloj.mjs`, `publicar-piezas.mjs`, `reels/plan.mjs`, `contrato.mjs`, `vigilar.mjs` | Sí |
| `probar-whatsapp.mjs` | Un WhatsApp de prueba, sin mostrar la clave | `prueba-whatsapp.yml` | A mano |
| `prompt-redes.mjs` | Lee la identidad y la voz de `CRITERIO-REDES.md` | `guiones.mjs`, `elegir.mjs`, `reels/plan.mjs`, `reels/reel.mjs`, `reels/voz-gemini.mjs` | Sí |
| `publicar-piezas.mjs` | Sube los videos (Instagram manda, Facebook con reintentos, la historia de cada reel) y completa direcciones | `publicar.mjs` | Sí |
| `publicar.mjs` | El programa de publicar: `--verificar`, `--facebook`, `--piezas`, `--enlaces` | `redes.yml`, `piezas.yml` | Sí |
| `reloj.mjs` | ¿Toca alguna pieza ahora? (con el interruptor apagado, no) | `redes.yml` | Sí |
| `ver-facebook.mjs` | Lista lo publicado de verdad en la página | `ver-facebook.yml` | A mano |
| `vigilar.mjs` | El vigilante: revisa y avisa por WhatsApp; cierre de las 23:30; resumen de las 21 | `vigilancia.yml` | Sí |
| `whatsapp.mjs` | Manda el WhatsApp por CallMeBot sin mostrar la clave | `vigilar.mjs`, `avisos.mjs`, `auditar.mjs`, `estadisticas.mjs`, `probar-whatsapp.mjs` | Sí |

## `panel/` — el tablero de la PC, sin dependencias (`docs/09-PANEL.md`)

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `acceso.mjs` | Usuarios, claves con hash, sesiones firmadas, freno de intentos | `servidor.mjs`, `clave.mjs` | Sí (en la PC) |
| `agenda.mjs` | Eventos cargados a mano, qué es público, a quién pedirle fechas | `servidor.mjs` | Sí (en la PC) |
| `avisos.mjs` | Cargar o borrar un aviso (tres espacios) | `servidor.mjs` | Sí (en la PC) |
| `buzon.mjs` | Los cuatro tipos del buzón y sus reglas | `servidor.mjs` | Sí (en la PC) |
| `clave.mjs` | Crear una cuenta o cambiar la contraseña | A mano: `node panel/clave.mjs <usuario> "<clave>"` | A mano |
| `horarios.mjs` | Los horarios de fábrica de las historias fijas y `toca` (qué día sale cada una) | `servidor.mjs`, `redes/piezas.mjs`, `reels/plan.mjs` | Sí |
| `notas.mjs` | Qué campos se editan, qué va a la web (`decisionParaLaWeb`), poda de decisiones | `servidor.mjs` | Sí (en la PC) |
| `panel.html` | El tablero entero (una sola página, 13 pestañas) | El navegador, servido por `servidor.mjs` | Sí (en la PC) |
| `respaldo.mjs` | Copia `panel/datos/` al arrancar y cada 6 horas | `servidor.mjs`; a mano | Sí (en la PC) |
| `seguridad.mjs` | Control de origen y de qué direcciones se pueden probar | `servidor.mjs`, `acceso.mjs` | Sí (en la PC) |
| `servidor.mjs` | El servidor: ciclo de 10 minutos, reescritura, la API del tablero, exportar y sincronizar | `ARRANCAR.bat`, `npm run panel` | Sí (en la PC) |
| `sincronizar.mjs` | Sube a GitHub `decisiones.json`, `avisos.json` y `eventos-panel.json`, 30 segundos después del último cambio | `servidor.mjs` | Sí (en la PC) |

## `web/` — el sitio (`docs/06-WEB.md`)

### Configuración

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `web/README.md` | Cómo correr la web en la PC; remite a `docs/06-WEB.md` | Personas | — |
| `web/.gitignore` | Una sola regla: que no se suba ningún `.env` de la web (las demás están en el `.gitignore` de la raíz) | git | Sí |
| `web/package.json` | Next 15 y React 18; scripts `datos`, `dev`, `dolar`, `redirects`, `build` | `npm` en `actualizar.yml` y `cloudflare-deploy.yml` | Sí |
| `web/package-lock.json` | Las versiones exactas | `npm ci` | Sí |
| `web/next.config.mjs` | Exportar el sitio como archivos (`output: 'export'`) | `next build` | Sí |
| `web/jsconfig.json` | El atajo `@/` para importar desde la raíz de `web/` | Next | Sí |

### `web/app/` — las páginas (todas se generan al compilar)

| Archivo | Qué hace | ¿En uso? |
|---|---|---|
| `layout.js` | Lo que está en todas las páginas: franja de arriba, logo, buscador, menú, pie y las letras | Sí |
| `globals.css` | Todos los estilos, los colores por sección (`--s-*`) y el sistema tipográfico (`--t-*`) | Sí |
| `page.js` | La tapa | Sí |
| `not-found.js` | La 404, que rescata direcciones viejas de notas | Sí |
| `opengraph-image.js` | La tarjeta del sitio para compartir | Sí |
| `nota/[id]/page.js` | La página de cada nota (foto del banco si hay, "Fuentes (N)", firma, "Seguí leyendo") | Sí |
| `nota/[id]/opengraph-image.js` | La tarjeta apaisada de cada nota (1200 × 630) | Sí |
| `nota/[id]/instagram.png/route.js` | La tarjeta vertical del espejo (1080 × 1350) | Sí |
| `nota/indice.json/route.js` | El índice de identificadores para el rescate de la 404 | Sí |
| `seccion/[ranura]/page.js`, `seccion/[ranura]/opengraph-image.js` | Cada sección, de a 15 notas, y su tarjeta | Sí |
| `tema/[ranura]/page.js`, `tema/[ranura]/opengraph-image.js` | Cada tema y su tarjeta. Existen, pero nada las enlaza (`MOSTRAR_TEMAS = false`) | Apagado (sin enlaces) |
| `agenda/page.js` | La agenda | Sí |
| `agenda/[id]/page.js`, `agenda/[id]/opengraph-image.js`, `agenda/[id]/evento.ics/route.js` | La ficha de cada evento, su tarjeta y el archivo para agendarlo | Sí |
| `clima/page.js` | El clima ahora y los próximos días (28/09) | Sí |
| `farmacias/page.js` | La farmacia de turno y la semana | Sí |
| `dolar/page.js` | Todos los tipos de dólar, consultados en el navegador | Sí |
| `util/page.js` | Los teléfonos útiles | Sí |
| `quienes-somos/page.js`, `contacto/page.js`, `politica-de-privacidad/page.js` | Las páginas fijas | Sí |
| `feed.xml/route.js`, `sitemap.js`, `sitemap-news.xml/route.js`, `robots.js`, `llms.txt/route.js` | Para lectores de feeds, buscadores y sistemas de IA | Sí |

### `web/components/` — las piezas de la interfaz

| Archivo | Qué hace | Quién lo usa | ¿En uso? |
|---|---|---|---|
| `avisos.js` | Los tres espacios publicitarios | `layout.js`, `page.js` | Sí |
| `buscador.js` | El buscador (entre las notas vigentes, sin consultar nada) | `layout.js` | Sí |
| `clima-vivo.js` | El clima que se actualiza en el navegador | `layout.js`, `clima/page.js`, `hoy-balcarce.js` | Sí |
| `compartir.js` | Los botones de compartir | Páginas de nota y de evento | Sí |
| `dolar-vivo.js` | Las tarjetas de `/dolar` | `dolar/page.js` | Sí |
| `ficha.js` | Los datos estructurados para Google y las migas | `layout.js`, notas, secciones, temas, eventos | Sí |
| `horas-vivas.js` | Recalcula "hace X" cada minuto | `layout.js` | Sí |
| `hoy-balcarce.js` | "Hoy en Balcarce": clima, farmacia y dólar | `page.js` | Sí |
| `metadatos.js` | Título, descripción, canónico, la firma (`firmaCorta`, `quienEscribio`) y el autor | Casi todas las páginas | Sí |
| `navegacion.js` | El menú de secciones | `layout.js` | Sí |
| `piezas.js` | Piezas repetidas: fila de nota, hora, farmacia, evento, cierre, buzón | Casi todas las páginas | Sí |
| `usar-dolar.js` | Pide el dólar en el navegador cada 5 minutos | `dolar-vivo.js`, `hoy-balcarce.js` | Sí |
| `verificacion.js` | El desplegable "Fuentes (N)" con la firma | Notas y eventos | Sí |

### `web/lib/` — la lógica compartida

| Archivo | Qué hace | Quién lo usa | ¿En uso? |
|---|---|---|---|
| `archivo.js` | Qué se muestra (36 h), qué tiene página (180 días), llega tarde, fecha de la nota, retiradas, correcciones, `pierdeLaPagina`, la dirección fija | `generar-datos.mjs`, `datos.js`, `recuperar-archivo.mjs` | Sí |
| `clima.js` | Qué dibujo le toca a cada cielo | `clima-vivo.js` | Sí |
| `cuerpo.js` | `tieneCuerpo` (70 palabras), `tieneRespaldo`, `esperaCuerpo` | `generar-datos.mjs`, `datos.js`, `sitemap.js`, redes, panel, reescritura | Sí |
| `datos.js` | La puerta de entrada a los datos para todas las páginas: secciones, tapa, horas, contacto | Todas las páginas | Sí |
| `dolar.js` | Pedir y leer el dólar, textos de "actualizado" | `/dolar`, "Hoy en Balcarce", `foto-dolar.mjs`, `generar-datos.mjs`, `notas-propias.js` | Sí |
| `enlaces-en-texto.js` | Los enlaces adentro del cuerpo de las notas propias | `nota/[id]/page.js` | Sí |
| `eventos.js` | Los eventos con página | `generar-datos.mjs`, `datos.js`, páginas de agenda | Sí |
| `farmacias.js` | El enlace `tel:` de cada farmacia | `farmacias/page.js`, `piezas.js` | Sí |
| `fuentes-de-la-nota.js` | Qué fuentes ve el lector | `verificacion.js`, `ficha.js` | Sí |
| `notas-propias.js` | La nota del dólar y los repasos de los podcasts | `generar-datos.mjs` | Sí |
| `paginas.js` | Partir una sección en páginas de 15 | Páginas de sección, `sitemap.js` | Sí |
| `pedir-clima.js` | El pedido del clima en el navegador (Open-Meteo, un solo pedido por página) | `clima-vivo.js`, `hoy-balcarce.js` | Sí |
| `ruta.js` | La dirección de cada nota y el rescate de la 404 | `archivo.js`, `datos.js`, páginas de nota, redes, `generar-redirects.mjs` | Sí |
| `seguir-leyendo.js` | "Seguí leyendo" | `nota/[id]/page.js` | Sí |
| `sitio.js` | La dirección del sitio (`SITIO`), si es el dominio propio, `MOSTRAR_TEMAS` | Metadatos, sitemap, robots, feed | Sí |
| `tarjeta-diseno.js` | Las cuentas de las tarjetas y los interruptores `FOTO_EN_INSTAGRAM` y `FOTO_EN_ENLACE` (prendidos desde el 28/09: el espejo y la tarjeta para compartir llevan la foto del banco si hay) | `tarjeta.js`, `instagram.png/route.js`, `redes/publicar.mjs` | Sí |
| `tarjeta.js` | Dibuja las tarjetas para compartir y la de Instagram | Las rutas `opengraph-image` e `instagram.png` | Sí |
| `texto.js` | Comparar textos, nombres, recortes, repetidas (`sinNotasRepetidas`) | Casi todo, también `ingesta/` | Sí |
| `tiempo.js` | "Hace cuánto" | `datos.js`, `horas-vivas.js` | Sí |
| `titulos.js` | Los arreglos mecánicos del título (`tituloAutomatico`, `sinBalcarceAlFinal`) | `generar-datos.mjs`, `ingesta/verificar.mjs` | Sí |

### `web/scripts/` — los programas de la web

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `generar-datos.mjs` | Arma todos los datos de la web (el corazón de "Actualizar la web") | `actualizar.yml`; `npm run datos` | Sí |
| `fotos-notas.mjs` | A qué notas probarles foto (nube) y poner las del banco (siempre) | `generar-datos.mjs` | Sí |
| `foto-dolar.mjs` | Guarda la foto del dólar en `web/data/dolar.json` | `npm run build` (script `dolar`) | Sí |
| `generar-redirects.mjs` | Escribe `web/public/_redirects` | `npm run build` (script `redirects`) | Sí |
| `revisar-seo.mjs` | Revisa el HTML compilado y frena la subida si falta algo | `actualizar.yml` | Sí |
| `auditar-seo-vivo.mjs` | Audita las páginas publicadas | A mano: `node web/scripts/auditar-seo-vivo.mjs [url]` | A mano |
| `hacer-iconos.mjs` | Dibuja los íconos del sitio (usa resvg) | A mano, una vez | A mano |
| `recuperar-archivo.mjs` | Rearma `archivo.json` desde el historial de git (se usó el 25/09) | A mano, si se pierde el archivo | A mano |

### `web/data/` — los datos (uno por renglón; detalle en `docs/06-WEB.md`)

| Archivo | Qué guarda | Quién lo escribe |
|---|---|---|
| `portada.json` | Lo que se muestra (36 h), clima, farmacia, pendientes | "Actualizar la web" |
| `archivo.json` | Lo que tiene página (180 días, hasta 2.500) | "Actualizar la web" |
| `agenda.json` | Los eventos con página | "Actualizar la web" |
| `banco-fotos.json` | El banco de fotos | "Actualizar la web" |
| `dolar-historia.json` | La cotización de las 11 de cada día hábil (60 días) | "Actualizar la web" |
| `esperando-cuerpo.json` | Las notas que esperan cuerpo, con sus fuentes | "Actualizar la web" |
| `fichas.json` | Las fichas de la lectura con IA y los grupos de repetidas | "Actualizar la web" |
| `intentos-ia.json` | Cuántas veces se pidió cada nota a Gemini y por qué falló | "Actualizar la web" |
| `notas-por-dia.json` | La estadística diaria de notas por sección | "Actualizar la web" |
| `vistas.json` | La primera vez que se vio cada nota (7 días) | "Actualizar la web" |
| `decisiones.json` | Lo que decidió el panel | El panel |
| `avisos.json` | Los tres avisos publicitarios | El panel |
| `eventos-panel.json` | Los eventos publicados desde el panel | El panel |
| `retiradas.json` | Lo sacado a mano, con motivo, cuándo y quién | Una persona (o Claude, a pedido) |
| `correcciones.json` | Lo corregido a mano, con motivo, cuándo y quién | Una persona (o Claude, a pedido) |
| `redes.json` | El libro de las redes | "Redes" y "Piezas" |
| `vigilancia.json` | Lo que ya avisó el vigilante | "Vigilancia" |
| `estadisticas.json` | Visitas y seguidores | "Vigilancia" |

No versionado: `dolar.json` (cada build). `auditoria.json` sí se versiona:
lo escribe y lo sube "Auditoría" (la primera vez, el 28/09).

### `web/public/` y `web/fuentes/`

| Archivo | Qué es | ¿En uso? |
|---|---|---|
| `web/public/_headers` | Los encabezados de Cloudflare: seguridad, tipos de las tarjetas y del `.ics`, caché | Sí |
| `web/public/manifest.webmanifest` | La ficha del sitio para instalarlo en el celular | Sí |
| `web/public/favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | Los íconos del sitio (el radar en el rojo de marca; los dibuja `hacer-iconos.mjs`) | Sí |
| `web/public/fotos-notas/` | Las fotos elegidas por el banco, una por nota | Sí |
| `web/fuentes/` (`SourceSerif4-900.ttf`, `Inter-400.ttf`, `Inter-600.ttf`) | Las letras de las tarjetas para compartir y del espejo | Sí |

## `comercial/` — la base de comercios, aparte del sitio (`COMERCIAL.md`)

Nada de esta carpeta lo usa la web ni lo corre un workflow: se corre a mano.

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `base.mjs` | Leer y guardar la base sin perder lo cargado a mano | Los otros de la carpeta | A mano |
| `esquema.mjs` | La ficha de un comercio y cómo se arma desde cada fuente | Los otros de la carpeta | A mano |
| `importar-osm.mjs` | Trae los comercios de OpenStreetMap y los suma | A mano | A mano |
| `verificar.mjs` | Cruza los datos para ver qué comercios siguen vigentes | A mano | A mano |
| `vigencia.mjs` | El puntaje de "¿sigue abierto?" | `verificar.mjs`, `vista.mjs` | A mano |
| `propuestas.mjs` | Qué se le ofrece a cada comercio y cómo se le escribe | Pruebas; a mano | A mano |
| `vista.mjs` | Arma la vista previa de la guía comercial (`comercial/salida/guia-previa.html`) | A mano | A mano |
| `vista.plantilla.html` | La plantilla de esa vista | `vista.mjs` | A mano |
| `datos/comercios.json` | La base (145 comercios) | Todo lo de la carpeta | A mano |
| `datos/calles.json` | Las calles de Balcarce, para el mapa de la vista previa | `vista.mjs` | A mano |

## `docs/`

Los documentos `00` a `12` y la carpeta `historico/`: ver
`docs/00-INDICE.md`.

## `pruebas/`

Los archivos `*.test.mjs` y 2 de material (`cuerpo-de-prueba.mjs`,
`libro-real-24-25-09.json`): cada uno con su línea en
`docs/10-REGLAS-Y-PRUEBAS.md`. Se corren con `npm test`.

## Lo que no tiene uso

- `reels/cortina.mjs`: la importa `reel.mjs`, pero la cortina está apagada.
- Las páginas de `/tema/`: existen y están en el sitemap, pero nada las
  enlaza desde el 21/09.

Están anotados en `PENDIENTES.md` (decidir si se borran o se vuelven a usar).

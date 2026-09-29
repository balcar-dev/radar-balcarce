# 01 · El árbol: cada carpeta y cada archivo

*Actualizado el 29/09/2026 con `git ls-files` (la lista de lo versionado),
mirando quién importa a quién, qué corre cada workflow y cada script de
`package.json`. Si se suma o se saca un archivo, se corrige acá.*

## En una frase

El repositorio tiene el motor (`ingesta/`), la voz y el video (`reels/`), las
redes y la vigilancia (`redes/`), los paneles (`panel/` y `web/public/panel/`) y
el sitio (`web/`); lo que corre solo lo disparan los workflows de
`.github/workflows/`.

En las tablas, **Quién lo llama** es el workflow que lo corre, el archivo que lo
importa o "a mano" (una persona lo corre en la consola). **¿En uso?** dice **Sí**
(corre solo, en la nube o en un panel), **A mano** (para correrlo cuando hace
falta) o **Sin enlaces** (existe, pero nada lleva ahí). Los documentos (`.md`)
se listan en `docs/00-INDICE.md`.

## El árbol, de un vistazo

```
radar-balcarce/
├── .github/workflows/   14 workflows: lo que corre solo en GitHub (docs/08)
├── ingesta/             el motor: fuentes, cruce, selección, lectura con IA, verificador. SIN dependencias (docs/02, 03, 04)
├── reels/               placas, voz, video y la reescritura con IA. SÍ tiene dependencias (docs/04, 07)
├── redes/               Facebook, Instagram, contrato, vigilante, WhatsApp. SIN dependencias (docs/07, 08)
├── panel/               el panel de la PC (puerto 4321) y el lado de GitHub del panel del celular. SIN dependencias (docs/09)
├── web/                 el sitio: Next.js 15 exportado como HTML estático (docs/06)
│   ├── app/             las páginas
│   ├── components/      las piezas de la interfaz
│   ├── lib/             la lógica compartida (datos, archivo, rutas, tarjetas…)
│   ├── scripts/         generar-datos y los ayudantes del build
│   ├── data/            los JSON que lee el sitio (los escriben GitHub, los paneles o una persona)
│   └── public/          íconos, encabezados de Cloudflare, fotos del banco y el panel del celular (public/panel/)
├── pruebas/             las pruebas (*.test.mjs, más de 1.400) y 2 archivos de material (docs/10)
├── comercial/           la base de comercios, aparte del sitio (COMERCIAL.md)
├── docs/                la documentación (docs/00-INDICE.md) e historico/
└── (raíz)               CLAUDE.md, los criterios, PENDIENTES.md y demás documentos; package.json; ARRANCAR.bat
```

Lo que **no** se versiona (`.gitignore`): `node_modules/`, `.env*`,
`panel/datos/` (usuarios, decisiones completas, buzón), `respaldos/`,
`reels/salida/`, `reels/marca/` salvo `reels/marca/fuentes/`, `ingesta/salida/`,
`.cache/` (la memoria del cruce y las notas para el panel del celular, que guarda
la caché de Actions), `web/.next/`, `web/out/`, `web/public/_redirects`,
`web/data/dolar.json`, `comercial/salida/` y `comercial/datos/osm-crudo.json`.

## La raíz

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `.gitignore` | Lo que no va al repositorio (lista de arriba) | git | Sí |
| `ARRANCAR.bat` | Abre la ventana "Radar Balcarce - PANEL" con `node panel/servidor.mjs` y el navegador en `localhost:4321` | Una persona, doble clic | A mano (el panel de la PC es el respaldo) |
| `package.json` | Las dependencias de `reels/` (`@resvg/resvg-js`, `ffmpeg-static`) y los scripts `test`, `panel`, `ingesta`, `auditar` | `npm`; los workflows (`npm ci`) | Sí |
| `package-lock.json` | Las versiones exactas de esas dependencias | `npm ci` | Sí |
| `*.md` | Los documentos: ver `docs/00-INDICE.md` | Personas; `CRITERIO-EDITORIAL.md` y `CRITERIO-REDES.md` también el código | Sí |

## `.github/workflows/` (detalle en `docs/08-INFRAESTRUCTURA.md`)

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `actualizar.yml` | "Actualizar la web": pruebas, ingesta, lectura y reescritura con IA, fotos, datos, compilar, revisar SEO, commit de `web/data/` | cron-job.org cada 30 min; `schedule` 7 y 37 de respaldo; el panel del celular; a mano | Sí |
| `cloudflare-deploy.yml` | "Cloudflare Pages": compila y sube `web/out` con wrangler | Al terminar bien "Actualizar la web"; a mano | Sí |
| `redes.yml` | "Redes": Facebook, el reloj, armar y subir piezas, completar direcciones, guardar el libro | cron-job.org; al terminar "Actualizar la web"; a mano | Sí |
| `piezas.yml` | "Piezas": armar (y publicar) una pieza a mano | A mano | A mano |
| `panel.yml` | "Panel del celular": la IA escribe una nota a pedido y deja el borrador cifrado | El panel del celular | Sí |
| `vigilancia.yml` | "Vigilancia": `redes/vigilar.mjs` | cron-job.org cada 30 min; `schedule` cada 3 h; a mano | Sí |
| `auditoria.yml` | "Auditoría": medidas, íconos, SEO en vivo y la semana del contrato; guarda `web/data/auditoria.json` | Lunes 12:00 UTC; a mano | Sí |
| `auditar-redes.yml` | "Auditar redes": el contrato contra Meta (hoy, ayer, semana, crudo) | A mano | A mano |
| `auditar-voz.yml` | "Auditar voz": clips con la voz real y su transcripción (gasta cupo de voz) | A mano | A mano |
| `crear-voces.yml` | "Crear voces": crea, recrea, lista o borra las voces propias (los modos de diálogo fueron pruebas descartadas) | A mano | A mano |
| `ver-facebook.yml` | "Ver Facebook": qué hay publicado de verdad en la página | A mano | A mano |
| `prueba-estadisticas.yml`, `prueba-gemini.yml`, `prueba-whatsapp.yml` | Las pruebas sueltas: visitas y seguidores (y qué permisos faltan), un pedido mínimo con la clave de redacción, un WhatsApp por CallMeBot | A mano | A mano |

## `ingesta/` — el motor, sin dependencias

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `agenda.mjs` | La agenda del municipio (su API de eventos), las fiestas del calendario anual, la base de contactos y el mensaje para pedir fechas | `web/scripts/generar-datos.mjs`, `panel/servidor.mjs` | Sí |
| `alertas.mjs` | Los avisos de clima (helada, granizo, viento, lluvia) y sus `UMBRALES` | `generar-datos.mjs`, `redes/piezas.mjs` | Sí |
| `articulo.mjs` | Baja la página de la nota original y saca su texto (sin menús, pies ni necrológicas); `decodificar` traduce entidades HTML | `reels/reescritura.mjs`, `ingesta.mjs` | Sí |
| `auditar.mjs` | Muestra qué decide el filtro sobre las notas de hoy y con qué palabra | `npm run auditar` | A mano |
| `contactos-agenda.json` | Las instituciones a las que se les piden fechas, con sus canales oficiales | `agenda.mjs` | Sí |
| `criterio.mjs` | Los números del criterio editorial (largos, topes, medios, cupos, horas, Facebook, podcasts, contrato, nota del dólar) | Casi todo el código; `pruebas/criterio.test.mjs` lo compara con `CRITERIO-EDITORIAL.md` | Sí |
| `cruce.mjs` | Junta las notas que cuentan el mismo hecho (TF-IDF, 0,42) y maneja la memoria de 36 horas | `ingesta.mjs` | Sí |
| `estadistica-diaria.mjs` | Cuántas notas se publicaron hoy y por sección, y su informe de las 21 | `generar-datos.mjs`, `redes/avisos.mjs` | Sí |
| `fotos.mjs` | Candidatas de foto, comparación con Gemini o Groq, la red de seguridad contra la marca de agua, Wikimedia y el crédito | `web/scripts/fotos-notas.mjs` | Sí |
| `fuentes-cruce.mjs` | Las fuentes del cruce de medios, una por línea | `ingesta.mjs`, `lectura-ia.mjs`, `listar-fuentes.mjs` | Sí |
| `fuentes.mjs` | Las fuentes de siempre y todas las listas de palabras: sección, semáforo, local, zona, figuras, filtro de entrada, temas; `fichaDeFuente` | `ingesta.mjs`, `lectura-ia.mjs`, `reels/reescritura.mjs`, `generar-datos.mjs` y más | Sí |
| `ingesta.mjs` | `ingestar()`: baja, lee, filtra, marca, cruza, clasifica, puntúa, semáforo, medios, cupos, clima y farmacias. Corrido solo, deja `ingesta/salida/` | `generar-datos.mjs` (nube), `panel/servidor.mjs` (PC); `npm run ingesta` | Sí |
| `json.mjs` | Leer un JSON sin que un archivo faltante o roto tire abajo el proceso | `generar-datos.mjs`, `panel/`, varios de `redes/` y `web/scripts/` | Sí |
| `lectura-ia.mjs` | La lectura con IA: fichas, qué saca, secciones, dos llaves, repetidas; Gemini con Groq de respaldo | `generar-datos.mjs` (nube) | Sí |
| `listar-fuentes.mjs` | Escribe `FUENTES.md` desde las dos listas de fuentes | `node ingesta/listar-fuentes.mjs` | A mano |
| `perfil-balcarce.md` | Lo que la IA de lectura sabe de Balcarce (sólo datos seguros) | La IA lo lee (vía `lectura-ia.mjs`) | Sí |
| `probar.mjs` | Prueba si las fuentes candidatas (`CANDIDATOS`) o una URL suelta están vivas | `node ingesta/probar.mjs [url]` | A mano |
| `prompt-editorial.mjs` | Lee la instrucción de la IA de `CRITERIO-EDITORIAL.md` § 12, entre sus marcas; sin ella, la reescritura no arranca | `reels/reescritura.mjs` | Sí |
| `utiles.mjs` | Los teléfonos útiles (`NUMEROS`), la farmacia de turno que cambia a las 8:30 (`diaDeTurno`), qué día tocan los útiles y qué decisión es de una persona (`decisionHumana`) | `ingesta.mjs`, `generar-datos.mjs`, `panel/`, `redes/`, `reels/` | Sí |
| `verificar.mjs` | El verificador de lo que escribe la IA, los arreglos que no inventan (`arreglarEscritura`) y `diceEnVivo` | `reels/reescritura.mjs`, `panel/`, `generar-datos.mjs` | Sí |
| `zona.mjs` | La hora de Balcarce, la única del código (GitHub corre en UTC) | Casi todo lo que mira "hoy" | Sí |

## `reels/` — placas, voz, video y la reescritura (con dependencias)

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `alinear.mjs`, `tiempos.mjs` | Cuándo arranca cada palabra: los silencios del audio (ffmpeg) y el reparto del tiempo según las sílabas | `voz-gemini.mjs`, `alinear.mjs` | Sí |
| `auditar-voz.mjs` | La auditoría de voz: clips de prueba, transcripción y juicio | `auditar-voz.yml` | A mano |
| `avatar.mjs`, `portada.mjs` | Dibujan la foto de perfil de las redes y la portada de la página de Facebook (las sube una persona) | A mano | A mano |
| `claves.mjs` | Las cuatro claves de IA (redacción, redes, clasificación, Groq), del entorno o del `.env`, y el modelo de texto | Reescritura, lectura, fotos, voz, panel, `generar-datos.mjs` | Sí |
| `comparar-instruccion.mjs` | Compara versiones de las reglas de la IA con notas reales y el verificador de producción (gasta cupo) | A mano | A mano |
| `crear-voces.mjs` | Crea, lista y borra las voces propias (Voice Design de Gemini 3.8) | `crear-voces.yml` | A mano |
| `duracion.mjs` | Mide un video y recorta la historia que pasa de 58 segundos | `reel.mjs` | Sí |
| `placa.mjs` | Dibuja las placas (SVG → PNG de 1080 × 1920) | `plan.mjs`, `reel.mjs` | Sí |
| `plan.mjs` | El plan del día: qué pieza, con qué guion, placa y hora; con `--generar`, arma los videos. Lee lo publicado (`web/data/portada.json`, `agenda.json`) | `redes.yml`, `piezas.yml` | Sí |
| `probar-gemini.mjs` | Un pedido mínimo a Gemini con la clave de redacción | `prueba-gemini.yml` | A mano |
| `reel.mjs` | Arma un video: placa, voz (sólo Gemini), subtítulos, ffmpeg | `plan.mjs` | Sí |
| `reescritura.mjs` | La reescritura con IA de punta a punta: orden, topes, texto completo, pedido, verificación, partes internas, nivel de verificación, semáforo sobre lo escrito | `generar-datos.mjs` (nube), `panel/reescribir-una.mjs`, `panel/servidor.mjs` | Sí |
| `voz-gemini.mjs` | La voz de Gemini 3.8 (Interactions API, clave de redes): texto literal, estilo aparte, la voz propia de cada pieza; corta si se acabó el cupo del día | `reel.mjs`, `auditar-voz.mjs` | Sí |
| `voz.mjs` | `paraLeer` (los símbolos dichos en voz alta) y `enCarteles` (los subtítulos de 3 a 5 palabras) | `reel.mjs`, `auditar-voz.mjs` | Sí |
| `marca/fuentes/*.ttf` (6) | Source Serif 4 (700 y 900) e Inter (400 a 700): las placas, el avatar, la portada y las tarjetas de la web | `placa.mjs`, `avatar.mjs`, `portada.mjs`, `web/lib/tarjeta.js` | Sí |

## `redes/` — Facebook, Instagram y la vigilancia, sin dependencias

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `auditar-redes.mjs` | Compara el contrato y el libro con lo que Meta tiene publicado | `auditar-redes.yml`, `auditoria.yml`, `vigilar.mjs` (el cierre de las 23:30) | Sí |
| `auditar.mjs` | La auditoría semanal de lo publicado; guarda `web/data/auditoria.json` | `auditoria.yml`; `vigilar.mjs` usa `auditoriaVencida` | Sí |
| `auditoria-voz.mjs` | La parte pura de la auditoría de voz (qué clips y cómo se juzgan) | `reels/auditar-voz.mjs` | A mano |
| `avisos.mjs` | Lo que se dice por WhatsApp y cómo entra en un mensaje; `pendientesDeLaIngesta` | `vigilar.mjs`, `generar-datos.mjs` | Sí |
| `contrato.mjs` | El contrato del día y el estado de cada pieza | `vigilar.mjs`, `avisos.mjs`, `auditar-redes.mjs` | Sí |
| `datos.mjs` | Traduce `web/data/portada.json` a los datos que espera el plan | `reels/plan.mjs` | Sí |
| `elegir.mjs` | Qué se publica: reglas de Facebook (`vaAFacebookPorLoQueEs`: lo aprobado por una persona va sólo si lo marcó), texto del posteo, podcasts, `esParaLasRedes`, el interruptor (`estaActivo`) | `publicar.mjs`, `reloj.mjs`, `reels/plan.mjs`, `contrato.mjs` y más | Sí |
| `espejo.mjs` | Qué espejos de Instagram reintentar | `publicar.mjs` | Sí |
| `estadisticas.mjs` | Visitas (Cloudflare) y seguidores (Meta) | `vigilar.mjs`, `prueba-estadisticas.yml` | Sí |
| `formatos.mjs` | Las medidas de cada red, con fecha de verificación | `auditar.mjs`, pruebas | Sí |
| `guiones.mjs` | Lo que dice la voz en cada pieza (bancos de frases) y `revisarTexto` | `reels/plan.mjs`, `elegir.mjs`, `panel/servidor.mjs`, `reels/reescritura.mjs` | Sí |
| `meta.mjs` | Habla con Meta (Graph v23.0): posteo, foto, video, dirección pública, verificación; `PAGINA_DE_FACEBOOK`, el único identificador de la página | `publicar.mjs`, `auditar-redes.mjs`, `estadisticas.mjs`, `ver-facebook.mjs` | Sí |
| `piezas.mjs` | Cronograma, ventanas, podcasts, aviso de clima, color del día, techo de historias | `reloj.mjs`, `publicar-piezas.mjs`, `reels/plan.mjs`, `contrato.mjs`, `vigilar.mjs` | Sí |
| `probar-whatsapp.mjs` | Un WhatsApp de prueba, sin mostrar la clave | `prueba-whatsapp.yml` | A mano |
| `prompt-redes.mjs` | Lee la identidad, las dos voces, el reparto de voces por pieza y el estilo de `CRITERIO-REDES.md` | `guiones.mjs`, `elegir.mjs`, `reels/plan.mjs`, `reels/reel.mjs`, `reels/voz-gemini.mjs` | Sí |
| `publicar-piezas.mjs` | Sube los videos (Instagram manda, Facebook con reintentos, la historia de cada reel) y completa direcciones | `publicar.mjs` | Sí |
| `publicar.mjs` | El programa de publicar: `--verificar`, `--facebook`, `--piezas`, `--enlaces` | `redes.yml`, `piezas.yml` | Sí |
| `reloj.mjs` | ¿Toca alguna pieza ahora? (con el interruptor apagado, no) | `redes.yml` | Sí |
| `ver-facebook.mjs` | Lista lo publicado de verdad en la página | `ver-facebook.yml` | A mano |
| `vigilar.mjs` | El vigilante: revisa y avisa por WhatsApp; las claves de IA y las voces (`revisarClaves`); cierre de las 23:30; resumen de las 21 | `vigilancia.yml` | Sí |
| `whatsapp.mjs` | Manda el WhatsApp por CallMeBot sin mostrar la clave | `vigilar.mjs`, `avisos.mjs`, `auditar.mjs`, `estadisticas.mjs`, `probar-whatsapp.mjs` | Sí |

## `panel/` — los paneles, sin dependencias (`docs/09-PANEL.md`)

El panel del celular vive en dos lados: la app, en `web/public/panel/` (más
abajo), y lo que corre en GitHub, acá.

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `celular-datos.mjs` | Lo que decide el celular y lo que necesita para decidir: valida sus decisiones, las une encima de las de la PC (`unirDecisiones`, gana la más nueva), arma lo que espera a una persona (`paraDecidir`) y las notas para escribir (`notasParaEscribir`) | `generar-datos.mjs`, `celular.mjs` | Sí |
| `celular.mjs` | El pedido a la IA desde el celular: busca la nota, la escribe con `reescribir-una.mjs` y deja el borrador cifrado en `web/data/celular-borradores.json` | "Panel del celular" (`panel.yml`) | Sí |
| `cifrado.mjs` | El sobre cifrado (AES-256-GCM y RSA-OAEP): cierra para cada celular registrado lo que espera a una persona y los borradores. El otro lado es `web/public/panel/cifrado.js` | `generar-datos.mjs`, `celular.mjs` | Sí |
| `reescribir-una.mjs` | Escribe una nota a pedido de una persona por el mismo camino que la automática, pero devuelve lo que no cuadra en vez de descartarlo | `celular.mjs` | Sí |
| `acceso.mjs`, `seguridad.mjs` | Usuarios, claves con hash, sesiones firmadas, freno de intentos; control de origen y de qué direcciones se pueden probar | `servidor.mjs`, `clave.mjs` | Sí (en la PC) |
| `agenda.mjs`, `avisos.mjs`, `buzon.mjs` | Las pestañas propias de la PC: eventos cargados a mano (qué es público, a quién pedirle fechas), cargar o borrar un aviso, los cuatro tipos del buzón | `servidor.mjs` | Sí (en la PC) |
| `clave.mjs` | Crear una cuenta o cambiar la contraseña | `node panel/clave.mjs <usuario> "<clave>"` | A mano |
| `horarios.mjs` | Los horarios de fábrica de las historias fijas y `toca` (qué día sale cada una) | `servidor.mjs`, `redes/piezas.mjs`, `reels/plan.mjs` | Sí |
| `notas.mjs` | Qué campos se editan y qué va a la web (`decisionParaLaWeb`; `vaALaWeb`: sólo lo que decidió una persona y los textos recientes de la IA) | `servidor.mjs` | Sí (en la PC) |
| `panel.html` | El tablero de la PC entero, en una sola página con pestañas | El navegador, servido por `servidor.mjs` | Sí (en la PC) |
| `respaldo.mjs` | Copia `panel/datos/` al arrancar y cada 6 horas | `servidor.mjs`; a mano | Sí (en la PC) |
| `servidor.mjs` | El servidor de la PC: ingesta cada 10 minutos, el botón "Reescribir", la API del tablero, exportar y sincronizar | `ARRANCAR.bat`, `npm run panel` | Sí (en la PC) |
| `sincronizar.mjs` | Sube a GitHub `decisiones.json`, `avisos.json` y `eventos-panel.json`, 30 segundos después del último cambio | `servidor.mjs` | Sí (en la PC) |

## `web/` — el sitio (`docs/06-WEB.md`)

### Configuración

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `web/README.md` | Cómo correr la web en la PC; remite a `docs/06-WEB.md` | Personas | — |
| `web/.gitignore` | Que no se suba ningún `.env` de la web | git | Sí |
| `web/package.json` | Next 15 y React 18, `"type": "module"`; scripts `datos`, `dev`, `dolar`, `redirects`, `build` | `npm` en `actualizar.yml` y `cloudflare-deploy.yml` | Sí |
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
| `nota/[id]/opengraph-image/route.js` | La tarjeta apaisada (1200 × 630) de las notas de la portada y las que fueron a las redes; las demás declaran la del sitio | Sí |
| `nota/[id]/instagram.png/route.js` | La tarjeta vertical del espejo (1080 × 1350) | Sí |
| `nota/indice.json/route.js` | El índice de identificadores para el rescate de la 404 | Sí |
| `seccion/[ranura]/page.js`, `seccion/[ranura]/opengraph-image.js` | Cada sección, de a 15 notas, y su tarjeta | Sí |
| `tema/[ranura]/page.js`, `tema/[ranura]/opengraph-image.js` | Cada tema y su tarjeta; nada las enlaza (`MOSTRAR_TEMAS = false`) | Sin enlaces |
| `agenda/page.js` | La agenda | Sí |
| `agenda/[id]/page.js`, `agenda/[id]/opengraph-image.js`, `agenda/[id]/evento.ics/route.js` | La ficha de cada evento, su tarjeta y el archivo para agendarlo | Sí |
| `clima/page.js`, `farmacias/page.js`, `dolar/page.js`, `util/page.js` | Los servicios: el clima ahora y los próximos días, la farmacia de turno y la semana, todos los tipos de dólar (consultados en el navegador), los teléfonos útiles | Sí |
| `quienes-somos/page.js`, `contacto/page.js`, `politica-de-privacidad/page.js` | Las páginas fijas | Sí |
| `feed.xml/route.js`, `sitemap.js`, `sitemap-news.xml/route.js`, `robots.js`, `llms.txt/route.js` | Para lectores de feeds, buscadores y sistemas de IA | Sí |

### `web/components/` — las piezas de la interfaz

| Archivo | Qué hace | Quién lo usa | ¿En uso? |
|---|---|---|---|
| `avisos.js` | Los tres espacios publicitarios | `layout.js`, `page.js` | Sí |
| `buscador.js` | El buscador (entre las notas vigentes, sin consultar nada) | `layout.js` | Sí |
| `clima-vivo.js`, `dolar-vivo.js`, `usar-dolar.js`, `horas-vivas.js` | Lo que se actualiza en el navegador: el clima, las tarjetas de `/dolar` (el dólar se pide cada 5 minutos) y el "hace X" de cada minuto | `layout.js`, `clima/page.js`, `dolar/page.js`, `hoy-balcarce.js` | Sí |
| `compartir.js` | Los botones de compartir | Páginas de nota y de evento | Sí |
| `ficha.js` | Los datos estructurados para Google y las migas | `layout.js`, notas, secciones, temas, eventos | Sí |
| `hoy-balcarce.js` | "Hoy en Balcarce": el panel de la portada con tres pestañas (clima, farmacias, dólar) | `page.js` | Sí |
| `metadatos.js` | Título, descripción, canónico, la firma (`firmaCorta`, `quienEscribio`) y el autor | Casi todas las páginas | Sí |
| `navegacion.js` | El menú de secciones | `layout.js` | Sí |
| `piezas.js` | Piezas repetidas: fila de nota, hora, farmacia, evento, cierre, buzón | Casi todas las páginas | Sí |
| `verificacion.js` | El desplegable "Fuentes (N)" con la firma | Notas y eventos | Sí |

### `web/lib/` — la lógica compartida

| Archivo | Qué hace | Quién lo usa | ¿En uso? |
|---|---|---|---|
| `archivo.js` | Qué se muestra (36 h), qué tiene página (180 días), llega tarde, fecha de la nota, retiradas, correcciones, `pierdeLaPagina`, la dirección fija, `aligerarViejas` | `generar-datos.mjs`, `datos.js`, `recuperar-archivo.mjs` | Sí |
| `clima.js`, `pedir-clima.js` | Qué dibujo le toca a cada cielo; el pedido del clima en el navegador (Open-Meteo, un solo pedido por página) | `clima-vivo.js`, `hoy-balcarce.js` | Sí |
| `cuerpo.js` | `tieneCuerpo` (70 palabras), `tieneRespaldo`, `esperaCuerpo` | `generar-datos.mjs`, `datos.js`, `sitemap.js`, redes, panel, reescritura | Sí |
| `datos.js` | La puerta de entrada a los datos para todas las páginas: secciones, tapa, horas, contacto (`WHATSAPP`, `MAIL`) | Todas las páginas | Sí |
| `dolar.js` | Pedir y leer el dólar, textos de "actualizado" | `/dolar`, "Hoy en Balcarce", `foto-dolar.mjs`, `generar-datos.mjs`, `notas-propias.js` | Sí |
| `enlaces-en-texto.js` | Los enlaces adentro del cuerpo de las notas propias | `nota/[id]/page.js` | Sí |
| `eventos.js` | Los eventos con página | `generar-datos.mjs`, `datos.js`, páginas de agenda | Sí |
| `farmacias.js` | El enlace `tel:` de cada farmacia | `farmacias/page.js`, `piezas.js` | Sí |
| `fuentes-de-la-nota.js` | Qué fuentes ve el lector | `verificacion.js`, `ficha.js` | Sí |
| `notas-propias.js` | La nota del dólar y los repasos de los podcasts | `generar-datos.mjs` | Sí |
| `paginas.js` | Partir una sección en páginas de 15 | Páginas de sección, `sitemap.js` | Sí |
| `repetidas.js` | La misma noticia con otra dirección: cuál queda y adónde redirige la otra (`repetidasConOtraDireccion`, `conFusionadas`) | `generar-datos.mjs`, `generar-redirects.mjs` | Sí |
| `ruta.js` | La dirección de cada nota y el rescate de la 404 | `archivo.js`, `datos.js`, páginas de nota, redes, `generar-redirects.mjs` | Sí |
| `seguir-leyendo.js` | "Seguí leyendo" | `nota/[id]/page.js` | Sí |
| `sitio.js` | La dirección del sitio (`SITIO`), si es el dominio propio, `MOSTRAR_TEMAS` | Metadatos, sitemap, robots, feed | Sí |
| `tarjeta-diseno.js` | Las cuentas de las tarjetas y los interruptores `FOTO_EN_INSTAGRAM` y `FOTO_EN_ENLACE` (prendidos: el espejo y la tarjeta para compartir llevan la foto del banco si hay) | `tarjeta.js`, `instagram.png/route.js`, `redes/publicar.mjs` | Sí |
| `tarjeta.js` | Dibuja las tarjetas para compartir y la de Instagram, con las letras de `reels/marca/fuentes/` | Las rutas `opengraph-image` e `instagram.png` | Sí |
| `texto.js` | Comparar textos, nombres, recortes, repetidas por titular (`sinNotasRepetidas`) | Casi todo, también `ingesta/` | Sí |
| `tiempo.js` | "Hace cuánto" | `datos.js`, `horas-vivas.js` | Sí |
| `titulos.js` | Los arreglos mecánicos del título (`tituloAutomatico`, `sinBalcarceAlFinal`) | `generar-datos.mjs`, `ingesta/verificar.mjs` | Sí |

### `web/scripts/` — los programas de la web

| Archivo | Qué hace | Quién lo llama | ¿En uso? |
|---|---|---|---|
| `generar-datos.mjs` | Arma todos los datos de la web (el corazón de "Actualizar la web") | `actualizar.yml`; `npm run datos` | Sí |
| `fotos-notas.mjs` | A qué notas probarles foto (nube) y poner las del banco (siempre) | `generar-datos.mjs` | Sí |
| `achicar-foto.mjs` | Pasa la foto elegida a JPEG de hasta 1.200 px, calidad 7 (con el ffmpeg del proyecto) | `fotos-notas.mjs` | Sí |
| `foto-dolar.mjs` | Guarda la foto del dólar en `web/data/dolar.json` | `npm run build` (script `dolar`) | Sí |
| `generar-redirects.mjs` | Escribe `web/public/_redirects`: secciones viejas, repetidas unidas y `/nota/ID` | `npm run build` (script `redirects`) | Sí |
| `revisar-seo.mjs` | Revisa el HTML compilado y frena la subida si falta algo | `actualizar.yml` | Sí |
| `auditar-seo-vivo.mjs` | Audita las páginas publicadas | `node web/scripts/auditar-seo-vivo.mjs [url]`; la auditoría semanal | A mano |
| `hacer-iconos.mjs` | Dibuja los íconos del sitio (usa resvg) | A mano, una vez | A mano |
| `recuperar-archivo.mjs` | Rearma `archivo.json` desde el historial de git | A mano, si se pierde el archivo | A mano |

### `web/data/` — los datos (detalle en `docs/06-WEB.md`)

| Archivo | Qué guarda | Quién lo escribe |
|---|---|---|
| `portada.json` | Lo que se muestra (36 h), clima, farmacia, pendientes | "Actualizar la web" |
| `archivo.json` | Lo que tiene página (180 días, hasta 2.500), una nota por renglón | "Actualizar la web" |
| `agenda.json` | Los eventos con página | "Actualizar la web" |
| `banco-fotos.json` | El banco de fotos | "Actualizar la web" |
| `dolar-historia.json` | La cotización de las 11 de cada día hábil (60 días) | "Actualizar la web" |
| `esperando-cuerpo.json` | Las notas que esperan cuerpo, con sus fuentes | "Actualizar la web" |
| `fichas.json` | Las fichas de la lectura con IA y los grupos de repetidas | "Actualizar la web" |
| `fusionadas.json` | Las repetidas con otra dirección y la nota a la que redirige cada una | "Actualizar la web" |
| `intentos-ia.json` | Cuántas veces se pidió cada nota a Gemini y por qué falló | "Actualizar la web" |
| `notas-por-dia.json` | La estadística diaria de notas por sección | "Actualizar la web" |
| `vistas.json` | La primera vez que se vio cada nota (7 días) | "Actualizar la web" |
| `celular-pendientes.json` | Lo que espera a una persona, **cifrado** para cada celular registrado | "Actualizar la web" |
| `celular-borradores.json` | Los textos que escribió la IA a pedido, **cifrados** | "Panel del celular" |
| `celular-decisiones.json` | Lo que decidió una persona desde el celular (aprobar, descartar, retirar) y lo marcado para las redes | El panel del celular |
| `celular-llaves.json` | La llave pública de cada celular registrado (la privada no sale del celular) | El panel del celular |
| `correcciones.json` | Lo corregido o escrito a mano, con motivo, cuándo y quién | El panel del celular, una persona o Claude |
| `retiradas.json` | Lo sacado a mano, con motivo, cuándo y quién | Una persona o Claude; los lunes "Actualizar la web" saca las de más de 7 días |
| `decisiones.json` | Lo que decidió el panel de la PC (sólo lo de una persona y los textos recientes de la IA) | El panel de la PC |
| `avisos.json`, `eventos-panel.json` | Los tres avisos publicitarios; los eventos publicados desde la pestaña Agenda | El panel de la PC |
| `redes.json` | El libro de las redes | "Redes" y "Piezas" |
| `vigilancia.json`, `estadisticas.json` | Lo que ya avisó el vigilante; visitas y seguidores | "Vigilancia" |
| `auditoria.json` | El resultado de la auditoría semanal | "Auditoría" |

No versionado: `dolar.json` (se escribe en cada build).

### `web/public/`

| Archivo | Qué es | ¿En uso? |
|---|---|---|
| `_headers` | Los encabezados de Cloudflare: seguridad, tipos de las tarjetas y del `.ics`, caché, y las reglas propias de `/panel/` | Sí |
| `manifest.webmanifest` | La ficha del sitio para instalarlo en el celular | Sí |
| `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | Los íconos del sitio (el radar en el rojo de marca; los dibuja `hacer-iconos.mjs`) | Sí |
| `fotos-notas/` | Las fotos elegidas por el banco, una por nota | Sí |
| `panel/index.html` | La página del panel del celular (`radarbalcarce.com/panel/`), con sus estilos; no se indexa | Sí |
| `panel/app.js` | La app: las pestañas Esperan, Sin cuerpo y Publicadas; aprobar, descartar, editar, retirar, pedir a la IA, "Actualizar la web ahora" | Sí |
| `panel/github.js` | Cómo habla con GitHub con la llave de quien lo usa: leer y guardar archivos, disparar workflows (sin nada de la pantalla: se prueba con Node) | Sí |
| `panel/cifrado.js` | El lado del celular del sobre cifrado: crea el par de llaves (la privada no se puede exportar) y abre lo que llega | Sí |
| `panel/sw.js`, `panel/manifest.webmanifest` | Lo que Chrome pide para instalarlo como app: el service worker (siempre busca primero la versión nueva) y la ficha (nombre, ícono, pantalla completa) | Sí |
| `panel/prueba.js`, `panel/prueba-sobre.js` | El modo de prueba (`/panel/?demo`): notas inventadas, sin GitHub, no guarda nada | A mano |

## `comercial/` — la base de comercios, aparte del sitio (`COMERCIAL.md`)

Nada de esta carpeta lo usa la web ni lo corre un workflow: todo es **a mano**.

| Archivo | Qué hace |
|---|---|
| `base.mjs`, `esquema.mjs` | Leer y guardar la base sin perder lo cargado a mano; la ficha de un comercio y cómo se arma desde cada fuente |
| `importar-osm.mjs`, `verificar.mjs`, `vigencia.mjs` | Traer los comercios de OpenStreetMap; cruzar los datos para ver cuáles siguen vigentes, con el puntaje de "¿sigue abierto?" |
| `propuestas.mjs` | Qué se le ofrece a cada comercio y cómo se le escribe |
| `vista.mjs`, `vista.plantilla.html` | La vista previa de la guía comercial (`comercial/salida/guia-previa.html`) |
| `datos/comercios.json`, `datos/calles.json` | La base de comercios y las calles de Balcarce (para el mapa de la vista previa) |

## `docs/` y `pruebas/`

- **`docs/`**: los documentos `00` a `12` y la carpeta `historico/`; ver
  `docs/00-INDICE.md`.
- **`pruebas/`**: los `*.test.mjs` y 2 de material (`cuerpo-de-prueba.mjs`,
  `libro-real-24-25-09.json`), cada uno con su línea en
  `docs/10-REGLAS-Y-PRUEBAS.md`. Se corren con `npm test`. Los del 29/09:
  `celular.test.mjs` (el sobre cifrado, las decisiones del celular, el pedido a
  la IA), `celular-app.test.mjs` (que la app escriba lo que la web acepta),
  `repetidas.test.mjs` (las repetidas con otra dirección y "EN VIVO") y
  `limpieza-29-09.test.mjs` (que no vuelva lo que se sacó ese día).

## Lo que existe sin enlaces

Las páginas de `/tema/`: existen y están en el sitemap, pero nada las enlaza
(`MOSTRAR_TEMAS = false`, `web/lib/sitio.js`). Qué hacer con ellas, y todo lo
demás que falta, en `PENDIENTES.md`.

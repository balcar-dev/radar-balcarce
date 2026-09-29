# 07 · Las redes: Facebook e Instagram de punta a punta

*Escrito el 28/09/2026 leyendo el código y los workflows de ese día. Si algo de
acá no coincide con el código, manda el código. Cómo suenan y qué dicen las
piezas está en [`CRITERIO-REDES.md`](../CRITERIO-REDES.md); los colores, las
letras y las medidas, en [`MEDIA-KIT.md`](../MEDIA-KIT.md) y
[`FORMATOS.md`](../FORMATOS.md); dónde corre cada workflow y cuánto cuesta, en
[`08-INFRAESTRUCTURA.md`](08-INFRAESTRUCTURA.md); qué hacer a mano, en
[`11-OPERACION.md`](11-OPERACION.md). Cómo nace la nota que después va a las
redes está en `02-INGESTA`, `03-SELECCION` y `04-REDACCION`; cómo se arma la
página de la nota y la nota propia de cada podcast, en `06-WEB`.*

## En una frase

Cada media hora GitHub mira la portada ya publicada, sube a Facebook como mucho
una nota de Balcarce con su enlace (y la misma nota como foto en Instagram), y
si a esa hora le toca una pieza de video (clima, farmacia, uno de los tres
podcasts, los teléfonos útiles o un aviso de clima) la arma con una placa
propia y la voz de Gemini, la sube a Instagram y a la página de Facebook, y
anota todo en un libro para no repetir nada.

## Siete palabras que se usan todo el tiempo

| Palabra | Qué quiere decir acá |
|---|---|
| **Posteo** | Una nota de la web publicada en el muro de Facebook con su enlace. Hasta 5 por día. |
| **Espejo** | El mismo posteo, publicado como foto en el feed de Instagram (la tarjeta de la nota, vertical). |
| **Pieza** | Un video vertical con voz: historia o reel. Todo lo que va a Instagram, salvo el espejo, es una pieza. |
| **Historia / reel** | Los dos formatos de video de Meta. La historia dura 24 horas y acepta hasta 60 segundos; el reel queda en el perfil. El mismo video va a Instagram y a la página de Facebook. |
| **Podcast** (o "repaso") | Un reel que cuenta 2 a 4 notas del día en voz alta. Hay tres por día. Cada uno se sube además como historia. |
| **El libro** | `web/data/redes.json`: la lista de todo lo que ya salió, con la hora y el número que le dio Meta. Es lo que impide que algo salga dos veces. |
| **Simular** | Con el interruptor apagado, todo corre, dice en el registro qué publicaría y no publica nada. |

## El recorrido, paso a paso

Lo que sigue es una corrida del workflow **Redes** (`.github/workflows/redes.yml`),
en el orden en que pasa. Todo corre en los servidores de GitHub, con la PC
apagada, con la hora de Balcarce (`TZ: America/Argentina/Buenos_Aires`).

### 1. Quién la despierta

Dos disparadores, y ninguno es el reloj propio de GitHub (que llegó a dejar
cinco horas entre dos corridas el 21/09):

- **cron-job.org** llama a la API de GitHub pidiendo `redes.yml` con la acción
  `reloj`. Según el historial de corridas del 27 y 28/09, llega a los minutos
  :05, :35 y :45 de cada hora, desde las 0 hasta las 22 (los documentos viejos
  y el comentario de `redes.yml` decían "cada 30 minutos, de 7 a 23": puede
  haber un trabajo de más en cron-job.org; está en `PENDIENTES.md`). El cuerpo
  del pedido es `{"ref":"main","inputs":{"accion":"reloj"}}` y va a
  `actions/workflows/redes.yml/dispatches`.
- **El final de "Actualizar la web"** (`workflow_run`): cada vez que termina
  esa corrida, bien o mal, arranca Redes. Es el respaldo si cron-job.org se
  cae.

"Redes" y "Piezas" comparten un candado (`concurrency: redes`): nunca corren
dos a la vez, así la misma pieza no puede salir dos veces antes de anotarse.
Y cada corrida baja **la última versión de `main`** (`ref: main`), no la del
momento en que se la pidió: el 25/09 el repaso de la mañana salió dos veces
por trabajar con un libro viejo.

### 2. El interruptor: `REDES_ACTIVAS`

Es una **variable** de GitHub (Settings → Secrets and variables → Actions →
Variables), no un secreto. Se lee con **una sola regla**, `estaActivo`
(`redes/elegir.mjs`): "si" sin importar mayúsculas, tildes ni espacios
alrededor ("Si", "SÍ", " sí "). La usan dos programas:

- `redes/publicar.mjs`: con el interruptor prendido publica; con cualquier
  otra cosa escribe "(modo prueba: no se publicó…)".
- `redes/reloj.mjs` (desde el 28/09; antes el workflow comparaba con seis
  formas fijas y podía dar otra respuesta que `publicar.mjs`): **con las
  redes apagadas el reloj no pide ninguna pieza** (`hay=false`, "las redes
  están apagadas"), así no se gasta la voz paga de Gemini en videos que no se
  van a publicar.

**Hoy está apagado**: `No` desde el 28/09, hasta el visto bueno de Hernán al
diseño nuevo (el estado del día está en `CLAUDE.md`, "Estado").

Con el interruptor apagado: el paso de Facebook corre igual pero sólo simula,
no se arma ni se sube ningún video, no se reintentan espejos, el libro no
cambia y el vigilante dice una vez por día que las redes están apagadas (ver
paso 9). El paso que completa direcciones de podcasts (paso 7) corre igual,
porque sólo pregunta.

### 3. Facebook: una nota, y su espejo en Instagram

Corre `node redes/publicar.mjs --facebook` (función `facebook()`), con
`META_TOKEN`, `REDES_ACTIVAS` y `SITIO=https://radarbalcarce.com`. Lee
`web/data/portada.json` (lo ya publicado: si el semáforo frenó una nota, acá
ni aparece) y el libro.

**3a. Primero, los espejos que quedaron debiendo.** Si las redes están
prendidas, `espejosPendientes` (`redes/espejo.mjs`) busca posteos de Facebook
de las últimas **12 horas** que no tienen su foto en Instagram, con menos de
**4 intentos**, y los reintenta del más viejo al más nuevo. El caso típico: el
posteo sale a los 15 minutos de la nota y la tarjeta de Instagram todavía no
estaba en la web (el sitio se arma cada media hora), así que Instagram
contestaba "Only photo or video can be accepted".

**3b. Después, si toca una nota nueva.** `elegirParaFacebook`
(`redes/elegir.mjs`) devuelve cero o una nota. Casi siempre devuelve cero: es
lo normal. Las reglas, con sus números en `FACEBOOK` de `ingesta/criterio.mjs`
(que se controlan contra la tabla "Los números" de `CRITERIO-EDITORIAL.md`):

| Regla | Valor | Por qué |
|---|---|---|
| Horario | de las 8:00 a las 22:00 en punto (se cuenta en minutos) | El 24/09 salió uno a las 22:25 |
| Tope | 5 por día, 1 por corrida | Más sería ruido: la web publica unas 100 notas por día |
| Separación | 90 minutos desde el posteo anterior | Que no salgan pegados |
| Edad de la nota en la web | entre 15 minutos y 8 horas desde que salió (`publicadaCuando`, o la fecha de la nota) | El enlace tiene que existir; lo viejo no se sube |
| Relevancia | 75 o más | Sólo lo fuerte |
| Sección | nunca Política ni Policiales (`SECCIONES_QUE_ESPERAN_PERSONA`) | En una red la nota viaja sin contexto: esas las decide una persona |
| De dónde es | sólo de Balcarce (`esParaLasRedes`): `local: true`, o Automovilismo con una figura argentina | Pedido de Hernán del 27/09 |
| Cuerpo | sin cuerpo no sale (`esperaCuerpo`, `web/lib/cuerpo.js`) | El enlace llevaría a dos renglones |
| Notas propias | la del dólar y las de los podcasts no van (`esNotaPropia`) | Serían redundantes |
| Tema | no repite un tema publicado en las últimas 24 horas (`temaParecido`) | El 24/09 salieron tres del autódromo en cuatro horas |
| Repetición | una nota sale una sola vez (el libro) | — |

`temaParecido` dice que dos notas son "del mismo tema" si sus titulares
comparten dos palabras de cinco letras o más que dicen algo (se descartan las
que están en cualquier titular de acá: "Balcarce", "municipio", "vecinos"…), o
una palabra de ocho letras o más, o una palabra y además un tema de los que
sigue el sitio. Compara con el titular con el que salió cada posteo y, si la
nota sigue en la portada, también con el de ahora.

**3c. El texto del posteo** lo arma `mensajeDeNota`:

- Si la nota trae `textoRedes` (lo escribe la IA junto con la nota y pasa por
  el verificador; ver `04-REDACCION`), va ese texto, una línea con el enlace y
  hasta tres hashtags (`hashtagsDe`: `#Balcarce` primero si la nota es de acá,
  después las etiquetas de la IA).
- Si no, va el titular, la bajada cortada en 220 caracteres y la línea del
  enlace.
- La línea del enlace cambia de frase de una nota a otra ("Leé la nota
  completa:", "Toda la nota acá:", "Seguí leyendo en Radar Balcarce:", "La nota
  completa, en Radar Balcarce:"), siempre la misma para la misma nota.
- **Nunca nombra la fuente** (eso está en la nota de la web) y desde el 26/09
  **no dice "Resumen hecho con IA"** (quién escribió la nota se dice en la web).

La imagen que muestra Facebook la saca sola de la página de la nota: es la
**tarjeta apaisada de 1200 × 630** (`web/app/nota/[id]/opengraph-image.js`,
dibujada por `web/lib/tarjeta.js`). Desde el 28/09 lleva a la izquierda la
foto de la nota guardada en el banco propio, sin el crédito adentro (está en el
epígrafe de la página; `FOTO_EN_ENLACE`); sin foto que sirva, la banda de
color.

**3d. Publicar y anotar.** `api.publicarEnFacebook` (`redes/meta.mjs`) publica
en la página con el token de la página. Apenas Meta contesta, se anota en el
libro (`libro.facebook[id de la nota]`: cuándo, el número del posteo, el
titular, el enlace y los temas) y se guarda el archivo. Si Meta dice que el
token murió (código 190), se corta todo y el registro lo dice.

**3e. El espejo en Instagram.** Enseguida, `api.publicarFotoEnInstagram`
publica en el feed la tarjeta **vertical de 1080 × 1350**
(`/nota/ID/instagram.png`, ver "Las plantillas") con el mismo texto del
posteo. Instagram exige que la foto esté en una dirección pública: ésta ya lo
está, porque la arma la web al compilar. Si falla, el posteo de Facebook no se
toca: se anota un intento más (`intentosEspejo`) y se reintenta en las
vueltas siguientes (3a). Es la **única foto** que sale a Instagram; todo lo
demás es video.

### 4. El reloj: ¿toca alguna pieza ahora?

`node redes/reloj.mjs` no instala nada: mira la hora, el libro y el clima de
la portada, y deja dos datos para los pasos siguientes (`hay=true|false` y
`solo=nombre1,nombre2`). Si no toca nada, la corrida termina en segundos.

Por dentro llama a `slotsQueTocan` (`redes/piezas.mjs`), que arma el
cronograma del día (`cronogramaDelDia`) y se queda con lo que está **dentro de
su ventana** y **todavía no está en el libro** (`libro.instagram["AAAA-MM-DD/nombre"]`).
Pide como mucho 6 por corrida (`POR_CORRIDA`): todo lo que toque, junto, para
que una corrida atrasada no deje nada para la siguiente.

| Pieza (nombre en el libro) | Tipo | Hora | Vale hasta | Qué días |
|---|---|---|---|---|
| Aviso de clima (`aviso-helada`, `aviso-granizo`, `aviso-viento`) | historia | 7:00 | 22:00 | Sólo si hay un aviso grave, hoy o mañana |
| Clima de la mañana (`clima-manana`) | historia | 7:30 | 11:30 | Todos |
| Podcast de la mañana (`noticia1`) | reel + historia | 10:00 | 15:00 | Todos, si hay 2 notas o más |
| Teléfonos útiles (`utiles`) | historia | 11:00 | 16:00 | Un día hábil por semana, rota solo |
| Podcast de la tarde (`noticia2`) | reel + historia | 15:00 | 20:00 | Todos, si hay 2 notas o más |
| Agenda del fin de semana (`agenda`) | historia | jueves 18:00 | 20:00 | Sólo en la PC: GitHub no la pide (`SOLO_EN_LA_PC`) |
| Farmacia de turno (`farmacia`) | historia | 19:00 | 24:00 | Todos |
| Clima de la noche (`clima-noche`) | historia | 20:00 | 24:00 | Todos |
| Podcast de la noche (`podcast`) | reel + historia | 20:30 | 24:00 | Todos, si hay 2 notas o más |

- Las horas de las historias fijas son las **de fábrica** de
  `HISTORIAS_FIJAS` (`panel/horarios.mjs`); las de los podcasts, `PODCASTS` y
  `HORAS_REELS` (`redes/piezas.mjs`). Las ventanas, `VENTANAS` (2 horas si una
  pieza no tiene la suya, `VENTANA_MINUTOS`). Ninguna cruza la medianoche: lo
  de un día no sale al siguiente. Si la ventana se cierra sin que salga, esa
  pieza se pierde por hoy.
- **Los teléfonos útiles rotan** de lunes a viernes, un día distinto cada
  semana (`diaRotativoDeUtiles`, `ingesta/utiles.mjs`, aplicada por `toca` de
  `panel/horarios.mjs`, que es la única que decide qué día sale cada pieza).
- **El aviso de clima** sale apenas se detecta: `avisoDeClima` toma el primer
  aviso de gravedad alta de `avisosDelClima` (`ingesta/alertas.mjs`): helada
  de −2° o menos, tormenta con granizo o viento de 60 km/h o más, hoy o
  mañana. "Posible helada" o "calor extremo" no alcanzan (ya están en la
  tarjeta de la portada). Sale una vez por día y por tipo. No es parte del
  contrato: si un día no hay aviso, no falta nada.

### 5. Instalar y armar los videos

Sólo si el reloj dijo `hay=true`: `npm ci` instala lo que hace falta para
dibujar y hacer video (`@resvg/resvg-js`, `ffmpeg-static`, `msedge-tts`), y
`node reels/plan.mjs --generar --solo=…` arma **sólo** las piezas que pidió el
reloj, con `GEMINI_API_KEY_REDES`.

**5a. Los datos.** En GitHub no hay panel, así que el plan lee
`web/data/portada.json` y lo traduce con `datosDeLaWeb` (`redes/datos.mjs`):
las notas publicadas, el clima y los turnos de farmacia. Como sale de lo ya
publicado, **una pieza nunca habla de algo que el semáforo frenó**. (En la PC,
si existe `panel/datos/ultima.json`, usa eso y filtra con `esPublicable`:
verde, o lo que decidió una persona.) También lee el libro, la historia del
dólar (`web/data/dolar-historia.json`) y, si existiera,
`panel/datos/estado.json` (en GitHub no existe: valen los horarios de fábrica).

**5b. El plan del día** (`planDelDia`) arma cada pieza con cuatro cosas: el
guion (lo que dice la voz), la placa (el dibujo de fondo), el color de acento
y la hora. Ver "Las piezas, una por una" más abajo. Aplica dos techos: 3
reels por día y **8 historias por día** (las 6 del contrato más 2 extras; si
se pasara, se deja de armar primero la de teléfonos útiles y después la
agenda, `historiasQueSobran`). Los avisos de clima y las del contrato nunca se
sacan.

**5c. Cada video** lo arma `armarReel` (`reels/reel.mjs`):

1. **La placa**, de SVG a PNG de 1080 × 1920 con `aPng` (`reels/placa.mjs`),
   con las tipografías de `reels/marca/fuentes/`.
2. **La voz.** `paraLeer` (`reels/voz.mjs`) traduce los símbolos ("12°" →
   "12 grados", "%" → "por ciento", "km/h", "N°"). Después `decirGemini`
   (`reels/voz-gemini.mjs`) pide el audio al modelo `gemini-3.8-flash-tts` por la
   Interactions API: el texto va literal y, aparte, un estilo corto (el de siempre
   más el de la mañana, la tarde o la noche, de `CRITERIO-REDES.md`), con la voz
   de esa pieza: la locutora o el locutor, según el reparto de la sección 6 del
   criterio (`vozDePieza`, `redes/prompt-redes.mjs`; una pieza sin voz lanza).
   Hasta 4 intentos, 2 segundos entre pedidos, 2 minutos como máximo por pedido. Un audio que dura de más para su texto
   (`vozDeMas`: leyó algo que no estaba) cuenta como falla. **Si Gemini falla, la pieza no
   sale** (28/09: nunca con otra voz): `armarReel` corta, `plan.mjs` la deja
   fuera del manifiesto y el reloj la vuelve a pedir en la vuelta siguiente
   mientras dure su ventana.
3. **Los subtítulos.** Gemini no dice cuándo arranca cada palabra: `alinear`
   (`reels/alinear.mjs`) detecta los silencios del audio con ffmpeg y
   `reels/tiempos.mjs` reparte las palabras entre pausa y pausa según sus
   sílabas. Salen de a 2 a 4 palabras, en tinta, con la palabra que se está
   diciendo en el color de acento, centrados en la fila 1660 (abajo, fuera de
   la zona de texto de la placa).
4. **El video**, con ffmpeg: la placa con un zoom muy lento (hasta 1,035),
   30 cuadros por segundo, la voz y un segundo y medio de cola. La cortina
   musical está **apagada** (`reels/cortina.mjs` sonaba a pitido).
5. **La medida de verdad.** Se mide lo que dura el archivo. Si pasa de **58
   segundos** (`PODCAST_VOZ.segundosMaximoHistoria`; Meta acepta 60), se hace
   además una copia cortada con fundido para las historias
   (`recortarParaHistoria`, `reels/duracion.mjs`) y el reel sube entero. El
   registro deja un aviso amarillo.

Lo armado queda en `reels/salida/` (que no va al repositorio) con un
manifiesto, `reels/salida/piezas.json`. Si una pieza falla al armarse, las
demás siguen.

### 6. Publicar las piezas

`node redes/publicar.mjs --piezas` llama a `publicarPiezas`
(`redes/publicar-piezas.mjs`), con `META_TOKEN` y `REDES_ACTIVAS`:

1. Vuelve a filtrar con `piezasQueTocan`: sólo lo que está en hora y no está en
   el libro.
2. **Instagram primero, y manda.** El video se sube en dos pasos (Instagram da
   una dirección de subida y se le manda el archivo; después se espera a que lo
   procese). Un solo intento: si falla, **no se intenta en Facebook**, para no
   dejar un video en una red y otro distinto en la otra si la próxima vuelta
   elige otras notas.
3. **Después, la página de Facebook**, con el mismo video (abrir la subida,
   mandar el archivo, cerrar y publicar). Hasta 3 intentos, esperando 4 y 8
   segundos entre uno y otro. Si igual falla, se avisa y lo de Instagram queda.
4. **Cada reel se sube también como historia** en la misma red (es el mismo
   video, ya armado: no cuesta otra voz). Hasta 3 intentos en la misma
   corrida; **entre corridas no se reintenta** (el video no se guarda y
   armarlo de nuevo gasta la voz y podría elegir otras notas). Esa historia se
   anota aparte, en `libro.historiasDeReels`.
5. **Se anota y se guarda el libro después de cada publicación.** Si algo se
   corta a la mitad, lo que salió no vuelve a salir.
6. **El texto.** Las historias no llevan. Los reels llevan `pieDePieza`: el
   título del podcast, la lista de notas que cuenta (cada una con su enlace) y
   "Más en radarbalcarce.com". Nunca la fuente.
7. **La dirección pública del podcast** (`permalink`) se le pide a Meta
   enseguida y se guarda en el libro: la usa la nota del podcast en la web.

Si Meta dice que el token murió, se corta todo en el acto.

### 7. Guardar las piezas y completar direcciones

- **"Guardar las piezas para revisarlas"**: los `.mp4` y el manifiesto quedan
  3 días como artefacto de la corrida (Actions → la corrida → Artifacts), para
  mirar cómo salieron.
- **"Completar las direcciones de los podcasts"** (`--enlaces`,
  `completarEnlaces`): a Facebook le lleva un rato procesar un video y a veces
  no da la dirección enseguida. En cada vuelta se pregunta por los podcasts de
  los últimos 3 días que no la tienen, hasta 5 veces cada uno. Sólo pregunta:
  corre aunque las redes estén apagadas y nunca frena la corrida.

### 8. Guardar el libro en el repositorio

"Guardar lo publicado" commitea `web/data/redes.json` aunque un paso anterior
haya fallado (lo que salió no tiene que repetirse). Como "Actualizar la web" y
"Vigilancia" también suben cosas, trae lo de ellos primero (`git pull
--rebase`); si chocan en un archivo de `web/data/`, gana lo de esta corrida;
reintenta hasta 3 veces. Si igual no puede, la corrida termina en rojo con
"la vuelta siguiente puede repetir lo publicado".

### 9. Lo que pasa después, en otros lados

- **"Actualizar la web"** (siguiente corrida) lee el libro: respeta la
  dirección con la que salió cada posteo aunque la IA cambie el titular, guarda
  en el archivo las notas que salieron en redes y arma **la nota propia de cada
  podcast** (`web/lib/notas-propias.js`). Detalle en `06-WEB`.
- **"Vigilancia"** (cada media hora) cuenta el contrato del día, avisa por
  WhatsApp lo que salió y lo que falta, y a las 23:30 lo compara con lo que
  Meta tiene publicado. Ver "Estadísticas y auditorías".

## Qué sale cada día: el contrato

Lo que **tiene** que salir cada día en cada red, en hora de Balcarce. Vive en
`redes/contrato.mjs` (función pura `contratoDelDia`); los números, en
`CONTRATO_DIARIO` (`ingesta/criterio.mjs`, controlados contra la tabla de
`CRITERIO-EDITORIAL.md`); las horas y las ventanas, en `redes/piezas.mjs`.
Rige desde el 25/09 (`CONTRATO_DESDE`).

| Por red, por día | Facebook | Instagram |
|---|---|---|
| Reels (los tres podcasts) | 3 | 3 |
| Historias de los podcasts | 3 | 3 |
| Historias de clima (mañana y noche) | 2 | 2 |
| Historia de la farmacia | 1 | 1 |
| **Historias en total** | **6** | **6** |
| Posteos de notas (tope, pueden ser menos) | hasta 5 posteos | hasta 5 espejos (fotos) |
| Aparte, no cuentan en las 6 | teléfonos útiles (1 por semana), agenda (jueves, sólo PC) | igual |
| Techo de historias del día | 8 | 8 |

Cada pieza del contrato está en uno de tres estados:

- **salió**: está en el libro;
- **pendiente**: todavía no es su hora, o está dentro de su ventana;
- **falta**: la ventana se cerró y no salió. La historia de un podcast cuyo reel
  salió hace más de 15 minutos es "falta" enseguida (no se reintenta).

Los posteos se juzgan aparte: si a las 22 quedaron menos de 5, se mira si
**había candidatas** que cumplían todas las reglas y no salieron
(`candidatasSinPublicar`). "Sin más candidatas" es normal; "FALLA: había N
candidata(s)", no. Un posteo de Facebook sin su espejo en Instagram también
cuenta como incompleto.

El contrato también busca **duplicados que dejan rastro**: el mismo número de
Meta bajo dos piezas, o el mismo enlace en dos posteos. Un duplicado de la
misma pieza (dos publicaciones que se pisan en la misma entrada del libro) no
se ve en el libro: sólo lo ve la auditoría contra Meta.

## Las piezas, una por una

Todas comparten: formato vertical 1080 × 1920, fondo papel, la marca "Radar
Balcarce" abajo, texto sólo entre las filas 250 y 1580 (`ZONA_TEXTO`: lo de
afuera lo tapa la interfaz de Instagram), subtítulos debajo. Qué dice cada
una, frase por frase, lo decide `CRITERIO-REDES.md` § 3 ("Una ficha por
pieza") y lo arma `redes/guiones.mjs`.

| Pieza | Guion (`redes/guiones.mjs`) | Placa (`reels/placa.mjs`) | Qué muestra la placa |
|---|---|---|---|
| Clima de la mañana | `guionClima` | `placaClima` | La tarjeta oscura del clima ahora (temperatura, cielo, sensación, viento), hoy y los dos días que siguen. Sin dólar: si se mueve, sale como nota propia |
| Clima de la noche | `guionClimaNoche` | `placaClima` | "Cómo sigue el día": ahora, la mínima de esta noche, mañana y pasado, con el pronóstico de mañana en una frase |
| Aviso de clima | título y texto del aviso | `placaClima` con recuadro de aviso | La tarjeta del clima con el recuadro del aviso: el título del aviso es lo que se ve de reojo y abajo va lo que hay que saber; acento en el color de Policiales |
| Farmacia de turno | `guionFarmacia` | `placaFarmacia` | La farmacia (o las dos) de turno, la dirección y "De turno hasta mañana a las 8:30" (`hastaCuandoElTurno`). El turno lo decide la web (`02-INGESTA`) |
| Teléfonos útiles | `guionUtiles` | `placaUtiles` | Los números de `NUMEROS` (`ingesta/utiles.mjs`), por categoría |
| Agenda (sólo PC) | `guionAgenda` | `placaAgenda` | Los eventos de los próximos 4 días de `panel/datos/agenda.json` |
| Los tres podcasts | `armarPodcast` vía `repasoConPresupuesto` | `placaRepaso` | "Repaso · tapa": el nombre del podcast en el color del día y la lista numerada de sus notas, cada una con el color de su sección |

### Los podcasts

Tres por día: **"El repaso de la mañana"** (`noticia1`, 10:00), **"El repaso
de la tarde"** (`noticia2`, 15:00) y **"El repaso del día"** (`podcast`,
20:30). La lista es una sola, `PODCASTS` en `redes/piezas.mjs`. Desde el 24/09
no hay historias ni reels de una sola nota: dichas de a una sonaban raras.

**Qué notas entran** (`elegirParaPodcast`, `redes/elegir.mjs`; números en
`PIEZAS`, `ingesta/criterio.mjs`):

1. Sólo las que pueden salir solas (`sePuedeSola`): ni roja, ni Política ni
   Policiales, con cuerpo, que no sea nota propia, y **de Balcarce**
   (`esParaLasRedes`, la misma regla que Facebook).
2. **Mañana y tarde:** relevancia 62 o más, **3 notas**, sin repetir lo que ya
   se contó en un podcast de hoy o de los dos días anteriores
   (`notasContadasEnPodcasts`: el 27/09 la misma nota salía en tres podcasts de
   tres días). La tarde no repite las de la mañana.
3. **Noche:** hasta **4 notas**, las más fuertes, sin piso de relevancia; puede
   repetir lo de la mañana y la tarde de hoy (es el repaso del día), pero no lo
   de días anteriores.
4. El mismo hecho contado por dos medios cuenta una vez (`mismoTema`: comparten
   una palabra rara de siete letras o más; es más estricto que el
   `temaParecido` de Facebook, a propósito).
5. Primero una nota por sección, para que no sean tres del mismo evento; si
   sobra lugar, se completa por puntaje.
6. **Con menos de 2 notas, ese podcast no sale** (y el contrato lo marca como
   "falta" cuando se cierra la ventana; el vigilante aclara "si ese día no había
   notas para contar, es normal").

**El guion** (`repasoConPresupuesto`): el saludo de su hora, cada nota con su
titular y, **sólo si el texto es nuestro** (reescrito por la IA o por una
persona), la primera oración de la bajada; y el cierre de su hora, que dice
"radarbalcarce punto com". La fuente no se nombra nunca. Tiene
**presupuesto de 55 segundos** (medido por palabras con `segundosDePodcast`);
si no entra, se saca primero la oración de contexto de las notas, de la última
a la primera, y después notas del final, hasta un mínimo de dos. El posteo con
la lista de enlaces muestra las notas que quedaron, no las que se pidieron.

**Un color por día** (`colorDelDia`, `COLORES_DEL_DIA`): los tres podcasts del
día comparten color y cambia de un día al otro (domingo magenta, lunes el rojo
de la marca, martes verde, miércoles azul, jueves ámbar, viernes violeta,
sábado verde azulado), para distinguirlos en la grilla de Instagram.

**La nota del podcast en la web:** cuando el libro registra un podcast con dos
notas o más, la corrida siguiente de "Actualizar la web" arma su nota propia
con los enlaces a Instagram y Facebook. Ver `06-WEB` y `CRITERIO-EDITORIAL.md`
§ 8.

## Las plantillas del diseño nuevo (28/09)

El 28/09 Hernán aprobó el lienzo "Radar Balcarce · Plantillas redes": fondo
papel, títulos en serif grandes, la marca abajo y el color de cada sección como
acento. Con dos excepciones firmes: las letras son las del sitio (Source Serif
4 e Inter) y los colores de sección son los de la web (`--s-*` de
`web/app/globals.css`; una prueba controla que coincidan). Hay dos familias:

| Qué | Archivo | Medida | Dónde se ve |
|---|---|---|---|
| Placas de historias y reels | `reels/placa.mjs` (`placaRepaso`, `placaClima`, `placaFarmacia`, `placaUtiles`, `placaAgenda`) | 1080 × 1920 | Instagram y la página de Facebook |
| Tarjeta del espejo | `web/lib/tarjeta.js` (`tarjeta(nota, { instagram: true })`), servida en `/nota/ID/instagram.png` (`web/app/nota/[id]/instagram.png/route.js`) | 1080 × 1350 (4:5) | El feed de Instagram |
| Tarjeta para compartir (con la foto del banco a la izquierda si hay; `FOTO_EN_ENLACE`) | `web/lib/tarjeta.js` (`tarjeta(nota)`), servida por `opengraph-image` | 1200 × 630 | Facebook con enlace, WhatsApp, X |
| Las cuentas de las tarjetas (colores, cuerpos del título, qué entra, zonas) | `web/lib/tarjeta-diseno.js` | — | Se prueban sin levantar el sitio (`pruebas/placas.test.mjs`) |

- Las tarjetas se generan **al compilar el sitio**, una por nota (las de la
  portada y las archivadas que salieron en redes, `notasConImagen`), y quedan
  como archivos estáticos.
- La tarjeta de Instagram tiene el texto entre las filas 135 y 1215, porque la
  grilla del perfil la recorta. Sin foto, lleva la "placa sin foto": el bloque
  de color de la sección con los anillos del radar.
- Colores, letras, íconos y el catálogo de plantillas: `MEDIA-KIT.md` ("Las
  plantillas de las piezas"). Medidas y zonas seguras: `FORMATOS.md` y
  `redes/formatos.mjs`.
- El avatar (`reels/avatar.mjs`) y la portada de Facebook (`reels/portada.mjs`)
  se generan a mano en la PC y los sube una persona (`PARA-CARGAR-A-MANO.md`).

## La foto en el espejo de Instagram (`FOTO_EN_INSTAGRAM`)

La tarjeta de Instagram lleva la foto de la nota del banco propio
(`web/data/banco-fotos.json`, ver `05-FOTOS`), recortada y sin el crédito
adentro, con el crédito al final del texto del posteo (`conCreditoDeFoto`,
`redes/elegir.mjs`). Está prendido desde el 28/09 (`FOTO_EN_INSTAGRAM = true`
en `web/lib/tarjeta-diseno.js`, decisión del 27/09: la foto va donde haya una
que sirva). Sin foto en el banco, sale la placa sin foto. La misma constante la
leen la imagen (`instagram.png/route.js`) y el texto del posteo
(`redes/publicar.mjs`), así nunca sale un crédito sin foto ni una foto sin
crédito. Para volver a la placa en todos: `false`. La tarjeta apaisada para
compartir el enlace (Facebook, WhatsApp) también lleva la foto desde el 28/09
(`FOTO_EN_ENLACE`, `paraCompartirConFoto` en `web/lib/tarjeta.js`): a la
izquierda, sin el crédito adentro, que está en el epígrafe de la página a la
que lleva el enlace. Sin foto, la banda de color con los anillos.

## La voz y los guiones

Todo lo que tiene que ver con **cómo suena** está en `CRITERIO-REDES.md`, y el
código lo lee de ahí, sin copias:

- `redes/prompt-redes.mjs` lee de ese documento, entre marcas `<!-- … -->`, la
  identidad ("Radar Balcarce", `radarbalcarce.com`, cómo se dice la dirección),
  el nombre de la voz de Gemini y las indicaciones de tono (la de siempre y la
  de mañana, tarde y noche). Si falta una parte, **falla a la vista** en vez de
  hablar sin criterio (y `npm test` lo controla).
- `redes/guiones.mjs` es el "libro de recursos" hecho código: saludos, aperturas,
  conectores, comentarios del clima, cierres, y los guiones de cada pieza. La
  variedad es **determinística**: cada frase se elige con una semilla hecha de
  la fecha, la pieza y el lugar de la frase. El mismo día y la misma pieza dan
  siempre el mismo texto; días distintos, textos distintos. `revisarTexto`
  controla las reglas de toda pieza (nunca nombrar un medio, nunca ".ar", nunca
  "en vivo", el saludo de su hora). Ojo: la usan **las pruebas**
  (`pruebas/redes-criterio.test.mjs`) sobre los bancos de frases; no se corre
  sobre cada pieza al publicarla.
- Dos reglas de fondo: **la voz no lee la placa** (la placa muestra el dato, la
  voz cuenta qué significa) y **la fuente no se nombra nunca en redes**.
- La voz de verdad se comprueba a mano con el workflow **Auditar voz**
  (`reels/auditar-voz.mjs` y `redes/auditoria-voz.mjs`): genera clips cortos,
  le pide la transcripción a Gemini y controla que diga "Radar Balcarce", que la
  dirección termine en "punto com" y que el saludo sea el de la hora
  (`CRITERIO-REDES.md` § 7). Gasta centavos de la clave paga.

## El libro: `web/data/redes.json`

Es la memoria de las redes. Va al repositorio (lo commitean "Redes" y
"Piezas") y lo leen casi todos. Tiene cinco partes:

| Parte | Clave de cada entrada | Qué guarda | Lo escribe |
|---|---|---|---|
| `facebook` | el id de la nota | cuándo, número del posteo (`postId`), titular, enlace, temas; `intentosEspejo` si el espejo falló | `redes/publicar.mjs --facebook` |
| `instagramFeed` | el id de la nota | cuándo, número de la foto (`mediaId`), titular, enlace | el espejo, mismo programa |
| `instagram` | `AAAA-MM-DD/nombre` (por ejemplo `2026-09-28/noticia1`) | cuándo, `mediaId`, tipo (`REELS` o `STORIES`), `notaId` y `notaIds` (las notas que contó), `permalink`, `intentosEnlace` | `publicarPiezas` |
| `facebookVideos` | igual que `instagram` | lo mismo, para la página de Facebook | `publicarPiezas` |
| `historiasDeReels` | `red/AAAA-MM-DD/nombre` | el reflejo de cada podcast como historia, por red | `publicarPiezas` |

Quién lo lee: `elegirParaFacebook` (no repetir nota ni tema, contar los del
día), el reloj y `piezasQueTocan` (qué ya salió), el plan (qué notas ya se
contaron en podcasts), `redes/contrato.mjs`, `redes/vigilar.mjs` y
`redes/avisos.mjs` (el contrato y el WhatsApp), `redes/auditar-redes.mjs`
(contra Meta) y `web/scripts/generar-datos.mjs` (enlaces fijos, archivo, notas
de los podcasts, estadística diaria). **No se edita a mano**: si una entrada
se borra, esa pieza o ese posteo puede volver a salir.

## Estadísticas y auditorías

| Qué | Cuándo | Archivo | Qué mira | Cómo se entera uno |
|---|---|---|---|---|
| **Lo que salió en redes** | cada corrida de Vigilancia | `redes/avisos.mjs` (`novedadesEnRedes`) | El libro desde la corrida anterior, agrupado (el mismo podcast en las dos redes es una línea) | WhatsApp "📣 Salió en redes" |
| **El contrato del día** | cada corrida y a las 21 | `redes/contrato.mjs`, `redes/vigilar.mjs` (`problemasDelContrato`) | Faltas, duplicados en el libro, posteos sin espejo; con las redes apagadas, sólo lo dice una vez por día | WhatsApp de problemas (cada 6 h por problema); una línea por red en el resumen de las 21 |
| **El cierre del día** | desde las 23:30 (si se atrasa, hasta las 3:00 cierra el día anterior), una vez | `redes/vigilar.mjs` (`fechaDelCierre`, `cierreDelDia`) con `redes/auditar-redes.mjs` (`informeDelDia`) | El día contra lo que Meta tiene de verdad: faltantes, duplicados (dos iguales a menos de 30 minutos), libro sin Meta y Meta sin libro (tolerancia de 20 minutos) | WhatsApp **sólo si hay discrepancias**; si todo cuadra, "✓ Cierre del día…" viaja en el próximo mensaje. Con las redes apagadas se saltea |
| **Estadísticas** | 9 y 21 | `redes/estadisticas.mjs`, guarda `web/data/estadisticas.json` (sólo números, 120 mediciones) | Visitas de Cloudflare Web Analytics (aproximadas) y seguidores de Facebook e Instagram; vistas, alcance e interacciones **sólo si `META_TOKEN` tiene** `read_insights` e `instagram_manage_insights` (hoy no los tiene) | WhatsApp de la mañana y resumen de las 21 |
| **Auditar redes** | a mano | `redes/auditar-redes.mjs` (`auditar-redes.yml`) | Hoy, ayer, la semana (% de cumplimiento por red y pieza) y lo que devuelve Meta sin interpretar | El registro de la corrida (no manda WhatsApp) |
| **La semana del contrato** | lunes 9:00 | `redes/auditar-redes.mjs --semana` dentro de `auditoria.yml` | Igual que la semana de arriba | El registro |
| **Auditoría semanal** | lunes 9:00 | `redes/auditar.mjs` (`auditoria.yml`), guarda `web/data/auditoria.json` | Que la tarjeta de Instagram mida 1080 × 1350 y la de compartir 1200 × 630, los íconos, el SEO en vivo y que las medidas de `redes/formatos.mjs` no tengan más de 90 días (verificadas el 25/09) | WhatsApp si hay problemas. Corrió por primera vez el 28/09 (ver "Qué puede fallar") |
| **Ver Facebook** | a mano | `redes/ver-facebook.mjs` (`ver-facebook.yml`) | Qué hay publicado de verdad en la página: posteos, reels, historias, con fecha | El registro |
| **Auditar voz** | a mano | `reels/auditar-voz.mjs` | Ver "La voz y los guiones" | El registro (PASA/FALLA) |

Límite de lo que Meta deja ver: **las historias sólo se ven mientras están
activas (24 horas)**. Por eso el cierre es a las 23:30, y la auditoría de días
anteriores cuenta las historias por el libro y lo dice.

## Cómo está conectado con Meta

- **Instagram** `@radarbalcarce`: cuenta profesional, vinculada a la página de
  Facebook "Radar Balcarce".
- **La página de Facebook**: su identificador para la API es
  **`1254237411116171`** (Configuración del negocio → Páginas →
  Identificador). El número que aparece en la dirección
  `facebook.com/profile.php?id=…` (61594865361170) es el del perfil y la API
  lo rechaza. El código usa el fijo; `redes/publicar.mjs` y
  `redes/auditar-redes.mjs` aceptan pisarlo con `META_PAGE_ID` y
  `redes/ver-facebook.mjs` con `META_PAGINA_ID` (ninguna está cargada).
- **La app de Meta** "Radar Balcarce Publicador" (ID `2302218363874399`), en el
  portfolio comercial "Radar Balcarce", con los casos de uso Threads,
  Instagram y Páginas, y los permisos `pages_manage_posts`,
  `pages_read_engagement`, `pages_show_list`, `instagram_basic` e
  `instagram_content_publish`. **Se publicó (modo activo) el 26/09**: en modo
  desarrollo publicaba, pero el público no veía los posteos ni los reels de
  Facebook (las historias sí). El campo de dominios de la app quedó vacío.
- **El usuario del sistema** `publicador-radar`, con la página (Contenido y
  Estadísticas), el Instagram (Contenido y Estadísticas) y la app. Su token
  **no vence** y es el secreto `META_TOKEN`. Le faltan `read_insights` e
  `instagram_manage_insights` para las estadísticas (`PENDIENTES.md`).
- **Por qué todo lo de Instagram es video:** la API de Instagram no acepta una
  imagen que no esté en una dirección pública, y no se alojan archivos sueltos.
  El video sí se le entrega directo. La única foto es el espejo, porque su
  tarjeta ya está publicada en el sitio (`/nota/ID/instagram.png`).
- **Lo que pasó con el bloqueo** (22 al 24/09): Meta bloqueó la API por
  "actividad inusual" (`API access blocked`, `OAuthException`) y la pantalla
  "Confirmar cuenta" fallaba. Era una falla de la plataforma que afectó a
  muchas cuentas. Se resolvió el 24/09 confirmando la cuenta; hubo que
  reactivar dos trabajos de cron-job.org que se habían apagado solos.

**Los subtítulos**, medidos contra la voz de Edge (que trae el tiempo exacto de
cada palabra), tienen un error medio de 0,1 a 0,2 segundos
(`reels/tiempos.mjs`; los números se cuentan como los dice la voz: "715" son 6
sílabas).

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `.github/workflows/redes.yml` | El reloj: Facebook, piezas, direcciones y libro | cron-job.org y el final de "Actualizar la web"; a mano (`reloj`, `verificar`, `facebook`) | secretos `META_TOKEN`, `GEMINI_API_KEY_REDES`; variable `REDES_ACTIVAS` | commit de `web/data/redes.json`; artefacto con los videos (3 días) |
| `.github/workflows/piezas.yml` | Armar (y si se pide, publicar) piezas a mano | una persona, Actions → Piezas | `solo` (vacío no arma nada, 28/09), `todas` (armar todas las del día, a propósito), `publicar`, `destino`; mismos secretos | artefacto (7 días); commit del libro si publicó |
| `redes/publicar.mjs` | El programa: `--verificar`, `--facebook`, `--piezas [--sin-horario] [--destino=…]`, `--enlaces` | los dos workflows | `portada.json`, `redes.json`, `reels/salida/piezas.json` | `redes.json` |
| `redes/elegir.mjs` | Qué se publica: reglas de Facebook, texto del posteo, hashtags, qué notas cuenta cada podcast y su guion con presupuesto, el interruptor | `publicar.mjs`, `reels/plan.mjs`, contrato, avisos | `ingesta/criterio.mjs`, `web/lib/cuerpo.js` | — (funciones puras) |
| `redes/espejo.mjs` | Qué espejos reintentar | `publicar.mjs` | el libro y la portada | — |
| `redes/reloj.mjs` | ¿Toca alguna pieza ahora? | `redes.yml` | `redes.json`, el clima de `portada.json` | `hay` y `solo` para el workflow |
| `redes/piezas.mjs` | Cronograma, ventanas, podcasts, aviso de clima, color del día, pie de los reels, techo de historias | reloj, plan, publicar-piezas, contrato, vigilante | `panel/horarios.mjs`, `ingesta/utiles.mjs`, `ingesta/alertas.mjs` | — |
| `redes/publicar-piezas.mjs` | Sube los videos: Instagram manda, Facebook con reintentos, la historia de cada reel; completa direcciones | `publicar.mjs` | manifiesto y videos | el libro (vía `guardar`) |
| `redes/datos.mjs` | Traduce `portada.json` a los datos del plan | `reels/plan.mjs` | `portada.json` | — |
| `redes/meta.mjs` | Habla con Meta (Graph v23.0): posteo, foto, video, dirección pública, verificación. Token en el encabezado, nunca en la dirección; errores limpios del token | todo lo que publica o lee Meta | `META_TOKEN` | — |
| `redes/contrato.mjs` | El contrato del día y sus textos | vigilante, avisos, auditar-redes | libro, portada | — |
| `redes/guiones.mjs` | Lo que dice la voz en cada pieza | plan, elegir, panel | `ingesta/criterio.mjs`, `prompt-redes.mjs` | — |
| `redes/prompt-redes.mjs` | Lee identidad y voz de `CRITERIO-REDES.md` | guiones, plan, reel, voz | `CRITERIO-REDES.md` | — |
| `reels/plan.mjs` | El plan del día y, con `--generar`, los videos | los workflows | datos, libro, dólar, estado del panel si hay | `reels/salida/*.mp4`, `*.png`, `*.mp3`, `piezas.json` |
| `reels/reel.mjs` | Arma un video: placa, voz, subtítulos, ffmpeg, recorte para historia | `plan.mjs` | la pieza | archivos en `reels/salida/` |
| `reels/placa.mjs` | Dibuja las placas (SVG) y las pasa a PNG | `plan.mjs`, `reel.mjs` | `reels/marca/fuentes/` | PNG |
| `reels/voz-gemini.mjs` | La voz de Gemini (modelo TTS) | `reel.mjs`, auditar voz | `GEMINI_API_KEY_REDES` (`reels/claves.mjs`) | mp3 |
| `reels/voz.mjs` | `paraLeer` (los símbolos, dichos en voz alta); la voz de Edge (Elena) ya no se usa en las piezas | `reel.mjs` | — | mp3 |
| `reels/alinear.mjs` y `reels/tiempos.mjs` | Cuándo arranca cada palabra del subtítulo | `voz-gemini.mjs` | el audio | — |
| `reels/duracion.mjs` | El máximo de una historia (58 s) y el recorte | `reel.mjs` | — | — |
| `reels/cortina.mjs` | Cortina musical (apagada) | `reel.mjs` si se prende | — | `reels/marca/cortina.wav` |
| `reels/claves.mjs` | Lee las claves de IA del entorno o del `.env` | voz, reescritura, lectura | entorno, `.env` | — |
| `reels/avatar.mjs`, `reels/portada.mjs` | Foto de perfil y portada de Facebook | una persona, en la PC | — | `reels/salida/` |
| `web/lib/tarjeta.js` | Las tarjetas de cada nota (compartir e Instagram) | las rutas de Next al compilar | la nota, `web/fuentes/`, la foto si `FOTO_EN_INSTAGRAM` | PNG estáticos del sitio |
| `web/lib/tarjeta-diseno.js` | Medidas, colores, cuentas y el interruptor `FOTO_EN_INSTAGRAM` | `tarjeta.js`, `publicar.mjs` | `banco-fotos.json` | — |
| `redes/vigilar.mjs` | El vigilante: contrato, cierre, WhatsApp | `vigilancia.yml` | libro, portada, auditoría, GitHub, Meta | `web/data/vigilancia.json`, `estadisticas.json` |
| `redes/avisos.mjs` | Qué se dice por WhatsApp y cómo entra en un mensaje | vigilante | portada, libro | — |
| `redes/estadisticas.mjs` | Visitas y seguidores | vigilante, "Prueba de estadísticas" | Cloudflare, Meta | (vía vigilante) `estadisticas.json` |
| `redes/auditar-redes.mjs` | Contrato contra Meta | "Auditar redes", "Auditoría", cierre | libro, Meta | — |
| `redes/auditar.mjs` | Auditoría semanal de lo publicado | "Auditoría" | la web en vivo, `formatos.mjs` | `web/data/auditoria.json` |
| `redes/formatos.mjs` | Las medidas de cada red, con fecha de verificación | auditoría, pruebas | — | — |
| `redes/ver-facebook.mjs` | Lista lo publicado en la página | "Ver Facebook" | Meta | — |
| `web/data/redes.json` | El libro | casi todos | — | lo escriben "Redes" y "Piezas" |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Prender o apagar las redes | Variable `REDES_ACTIVAS` en GitHub (`Si` / otra cosa). Sin tocar código |
| Cambiar cuántos posteos, la relevancia, el horario, la espera o la separación de Facebook | `FACEBOOK` en `ingesta/criterio.mjs` **y** la tabla "Los números" de `CRITERIO-EDITORIAL.md` (una prueba controla que coincidan) |
| Que otras notas (no sólo de Balcarce) vayan a las redes | `esParaLasRedes`, `redes/elegir.mjs` (es una decisión editorial: preguntar antes) |
| Qué secciones nunca salen solas | `SECCIONES_QUE_ESPERAN_PERSONA`, `ingesta/criterio.mjs` |
| Cuándo dos notas son "el mismo tema" | `temaParecido` (Facebook) y `mismoTema` (podcasts), `redes/elegir.mjs` |
| El texto del posteo, la frase del enlace, los hashtags | `mensajeDeNota`, `FRASES_DEL_ENLACE`, `hashtagsDe`, `redes/elegir.mjs` |
| Cuántas notas cuenta un podcast, su relevancia mínima, su presupuesto | `PIEZAS` y `PODCAST_VOZ`, `ingesta/criterio.mjs` (y la tabla del criterio) |
| La hora de un podcast | `HORAS_REELS`, `redes/piezas.mjs` |
| La hora de una historia fija (clima, farmacia, útiles, agenda) | Los valores de fábrica de `HISTORIAS_FIJAS`, `panel/horarios.mjs`. La pestaña Calendario del panel **no** cambia lo que publica GitHub: ni el reloj ni el plan leen lo guardado en el panel (`PENDIENTES.md`) |
| Hasta cuándo vale una pieza | `VENTANAS`, `redes/piezas.mjs` |
| Los umbrales del aviso de clima | `UMBRALES`, `ingesta/alertas.mjs` |
| El color de los podcasts de cada día | `COLORES_DEL_DIA`, `redes/piezas.mjs` |
| El contrato (cuántas piezas por día, el techo, la hora del cierre) | `CONTRATO_DIARIO`, `ingesta/criterio.mjs` y su tabla; las piezas, `redes/contrato.mjs` |
| Qué dice la voz, los saludos, cierres, cuándo dice la dirección | `CRITERIO-REDES.md` (identidad y voz) y `redes/guiones.mjs` (bancos de frases); reiniciar el panel si se toca |
| El dibujo de una placa | `reels/placa.mjs` (y `MEDIA-KIT.md`) |
| El dibujo de las tarjetas de las notas | `web/lib/tarjeta.js` y `web/lib/tarjeta-diseno.js` |
| Que el espejo lleve (o no) la foto de la nota | `FOTO_EN_INSTAGRAM` en `web/lib/tarjeta-diseno.js` (hoy `true`) |
| Una medida de imagen de las redes | `redes/formatos.mjs` y `FORMATOS.md` |
| Cuántas veces se reintenta en Meta | `INTENTOS_SECUNDARIA`, `INTENTOS_HISTORIA`, `INTENTOS_ENLACE` (`redes/publicar-piezas.mjs`); `ESPEJO` (`redes/espejo.mjs`) |
| Cómo se habla con Meta | `redes/meta.mjs` |
| Qué avisa el vigilante de las redes | `problemasDelContrato` y `evaluar`, `redes/vigilar.mjs` |

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| **cron-job.org desactivó el trabajo de Redes** (lo hace solo si falla varias veces) | Aviso "El reloj de Redes no corre" (alta). Igual sigue arrancando al final de cada "Actualizar la web", así que suele notarse poco | Reactivarlo en console.cron-job.org (`11-OPERACION`) |
| **Redes está apagado** (`REDES_ACTIVAS` no dice `Si`) | WhatsApp una vez por día: "Las redes están apagadas…"; resumen de las 21: "Redes: apagadas" | Prenderlo si no fue a propósito |
| **El token de Meta murió** (código 190) | La corrida de Redes en rojo: "El token venció o lo revocaron" | Una persona genera otro y lo pega en `META_TOKEN` |
| **Meta bloquea la API** (pasó del 22 al 24/09: "API access blocked") | Fallan Redes y Piezas | Confirmar la cuenta en Meta (lo hace una persona) |
| **Falló Instagram al subir una pieza** | La pieza no sale en ninguna red; el reloj la vuelve a pedir en la vuelta siguiente mientras dure la ventana (gasta otra voz) | Nada, salvo que se repita: mirar el registro |
| **Falló Facebook después de Instagram** | Registro "falló (intento 3 de 3)"; el contrato marca la falta en Facebook | Si es una historia fija (clima, farmacia): Piezas con esa pieza, `publicar` y destino `facebook`. Si es un **podcast**, Piezas no sirve (el plan no vuelve a armar un podcast que ya está en el libro de Instagram): bajar el video del artefacto de esa corrida de Redes (3 días) y subirlo a mano |
| **No salió la historia de un podcast** | WhatsApp: "no salió la historia de… (su reel sí salió y la historia no se reintenta)" | No hay forma automática de reintentarla, y Piezas tampoco sirve (el plan no vuelve a armar un podcast que ya está en el libro de Instagram, y la historia de un reel sólo se sube junto con ese reel). Si importa, bajar el `.mp4` del artefacto de esa corrida de Redes y subirlo a mano como historia; el libro no se entera y el contrato la sigue contando como falta |
| **No salió una pieza fija** (clima, farmacia) | WhatsApp: "No salió la pieza… y ya se cerró su ventana" | Revisar Gemini y `META_TOKEN`; publicarla con Piezas si todavía sirve |
| **No salió un podcast** | WhatsApp de falta del reel | Si "ese día no había notas para contar", es normal |
| **Un posteo sin su foto en Instagram** | WhatsApp: "N posteo(s) de Facebook de hoy no tienen su foto en el feed". Se reintenta solo 4 veces en 12 horas | Si no se arregla solo, mirar que la tarjeta `/nota/ID/instagram.png` exista |
| **Un duplicado** | WhatsApp de prioridad alta (libro) o en el cierre de las 23:30 (Meta) | Borrar la copia a mano en la red (lo hace una persona) |
| **Gemini (voz) no contesta** | La pieza no sale en esa vuelta ("la pieza no sale con otra voz") y se reintenta en la siguiente | Si se repite toda la ventana, el vigilante avisa que no salió: revisar la clave paga y el modelo de voz |
| **El video pasa de 58 segundos** | Aviso amarillo en la corrida; la historia sube recortada con fundido | Nada: está previsto |
| **El libro no se pudo guardar** | Redes en rojo: "No se pudo guardar el libro después de tres intentos" | Mirar enseguida: la vuelta siguiente puede repetir lo publicado |
| **Se publica pero el público no lo ve** (pasó hasta el 26/09: la app de Meta estaba en modo desarrollo) | Nadie avisa | Correr "Ver Facebook" y mirar la página desde una cuenta que no sea administradora |
| **La auditoría semanal no corre** | El vigilante avisa si `web/data/auditoria.json` tiene más de 10 días (existe desde el 28/09, la primera corrida) | Correr "Auditoría" a mano (Actions → Auditoría → Run workflow) |
| **Las medidas de `formatos.mjs` quedaron viejas** (90 días desde el 25/09) | La auditoría semanal avisa por WhatsApp | Volver a verificarlas (`FORMATOS.md`) |
| **Faltan permisos de estadísticas en `META_TOKEN`** | El resumen dice qué le falta | Regenerar el token con `read_insights` e `instagram_manage_insights` (una persona) |

## Lo que sigue abierto

En `PENDIENTES.md`: los disparos de cron-job.org a Redes (tres por hora, de 0
a 22), la pestaña Calendario que no llega a GitHub, confirmar que la
Auditoría de los lunes corra sola (la primera vez fue el 28/09),
el nombre doble de la variable del ID de la página y
la historia de un podcast que no se puede reintentar.

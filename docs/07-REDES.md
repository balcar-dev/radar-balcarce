# 07 · Las redes: Facebook e Instagram de punta a punta

*Actualizado el 29/09/2026. Si algo de acá no coincide con el código, manda el
código.* Cómo suenan y qué dicen las piezas: [`CRITERIO-REDES.md`](../CRITERIO-REDES.md).
Colores, letras y medidas: [`MEDIA-KIT.md`](../MEDIA-KIT.md) y
[`FORMATOS.md`](../FORMATOS.md). Los workflows, las claves de IA y lo que
cuesta: [`08-INFRAESTRUCTURA.md`](08-INFRAESTRUCTURA.md). Qué hacer a mano:
[`11-OPERACION.md`](11-OPERACION.md). Las palabras propias (posteo, espejo,
pieza, podcast, el libro, simular): [`12-GLOSARIO.md`](12-GLOSARIO.md).

## En una frase

Cada media hora GitHub mira la portada ya publicada, sube a Facebook como mucho
una nota con su enlace (y la misma nota como foto en Instagram: el espejo) y,
si a esa hora toca una pieza de video (clima, farmacia, uno de los tres
podcasts, los teléfonos útiles, la agenda o un aviso de clima), la arma con una
placa propia y una de las dos voces de Gemini, la sube a Instagram y a la
página de Facebook, y anota todo en un libro (`web/data/redes.json`) para no
repetir nada.

## El recorrido, paso a paso

Una corrida del workflow **Redes** (`.github/workflows/redes.yml`), en orden.
Corre en GitHub con la PC apagada y la hora de Balcarce
(`TZ: America/Argentina/Buenos_Aires`).

### 1. Quién la despierta

- **cron-job.org** pide `redes.yml` con la acción `reloj` (cuerpo
  `{"ref":"main","inputs":{"accion":"reloj"}}` a
  `actions/workflows/redes.yml/dispatches`). Según el historial de corridas
  llega a los minutos :05, :35 y :45, de 0 a 22 (puede haber un trabajo de más:
  `PENDIENTES.md`).
- **El final de "Actualizar la web"** (`workflow_run`), bien o mal. Es el
  respaldo si cron-job.org se cae.

El reloj propio de GitHub no se usa: el 21/09 dejó cinco horas entre dos
corridas. "Redes" y "Piezas" comparten un candado (`concurrency: redes`), así
la misma pieza no sale dos veces antes de anotarse, y cada corrida baja la
última `main` (`ref: main`): con un libro viejo, el 25/09 un repaso salió dos
veces.

### 2. El interruptor: `REDES_ACTIVAS`

Es una **variable** de GitHub (Settings → Secrets and variables → Actions →
Variables), no un secreto. La lee una sola regla, `estaActivo`
(`redes/elegir.mjs`): "si" con cualquier mayúscula, tilde o espacio alrededor
("Si", "SÍ", " sí "). La usan `redes/publicar.mjs` (con otra cosa escribe
"modo prueba: no se publicó…") y `redes/reloj.mjs` (con otra cosa no pide
ninguna pieza: no se gasta voz en videos que no se van a publicar). Si hoy está
prendida lo dice `CLAUDE.md` ("Estado").

Apagado: Facebook corre pero sólo simula, no se arma ni se sube ningún video,
no se reintentan espejos, el libro no cambia y el vigilante lo dice una vez por
día. Completar las direcciones de los podcasts (paso 7) corre igual, porque
sólo pregunta.

### 3. Facebook: una nota, y su espejo en Instagram

`node redes/publicar.mjs --facebook` (función `facebook()`, con `META_TOKEN`,
`REDES_ACTIVAS` y `SITIO`) lee `web/data/portada.json` (lo ya publicado: lo que
el semáforo frenó ni aparece) y el libro.

**3a. Los espejos que quedaron debiendo.** `espejosPendientes`
(`redes/espejo.mjs`) reintenta, del más viejo al más nuevo, los posteos de las
últimas **12 horas** que no tienen su foto en Instagram, con menos de **4
intentos**. El caso típico: el posteo sale y la tarjeta de Instagram todavía no
está en la web (Instagram contesta "Only photo or video can be accepted").

**3b. Si toca una nota nueva.** `elegirParaFacebook` (`redes/elegir.mjs`)
devuelve cero o una, y casi siempre cero: es lo normal. Los números están en
`FACEBOOK` (`ingesta/criterio.mjs`, controlados contra la tabla "Los números"
de `CRITERIO-EDITORIAL.md`):

| Regla | Valor |
|---|---|
| Horario | De 8:00 a 22:00 en punto (se cuenta en minutos: el 24/09 salió uno a las 22:25) |
| Tope | 5 por día, 1 por corrida, 90 minutos entre uno y otro |
| Edad | Entre 15 minutos y 8 horas desde que salió en la web (`publicadaCuando`, o la fecha de la nota) o desde que una persona la marcó para las redes |
| Qué nota | Una que pueda ir por lo que es (`vaAFacebookPorLoQueEs`, abajo), con cuerpo (`esperaCuerpo`, `web/lib/cuerpo.js`), que no sea nota propia (la del dólar, las de los podcasts: `esNotaPropia`) |
| Tema | No repite un tema publicado en las últimas 24 horas (`temaParecido`: el 24/09 salieron tres del autódromo en cuatro horas) |
| Repetición | Una nota sale una sola vez (el libro) |

**Qué nota puede ir** (`vaAFacebookPorLoQueEs`, regla 78):

- **Sola:** de Balcarce (`esParaLasRedes`: `local: true`, o Automovilismo con
  una figura argentina), relevancia 75 o más, nunca Política ni Policiales
  (`SECCIONES_QUE_ESPERAN_PERSONA`: en una red la nota viaja sin contexto) y
  que haya salido en la web por el semáforo verde. Lo que salió en la web
  porque lo aprobó una persona (era amarillo) **no va solo**.
- **Marcada por una persona** en el panel del celular ("También a Facebook e
  Instagram", `aprobadaParaRedes`): va aunque sea de Política, de Policiales,
  de afuera o de poca relevancia, y pasa primero. El horario, el tope, el tema
  y el cuerpo valen igual.

`temaParecido`: dos notas son del mismo tema si sus titulares comparten dos
palabras de cinco letras o más que dicen algo (sin las que están en cualquier
titular de acá: "Balcarce", "municipio", "vecinos"…), una palabra de ocho
letras o más, o una palabra y un tema de los que sigue el sitio. Compara con el
titular con el que salió cada posteo y, si la nota sigue en la portada, con el
de ahora.

**3c. El texto del posteo** (`mensajeDeNota`): el `textoRedes` que la IA
escribió con la nota (pasa por el verificador, `04-REDACCION`) o, si no hay, el
titular y la bajada cortada en 220 caracteres; después, una línea con el
enlace (la frase cambia de nota en nota y es siempre la misma para la misma
nota: `FRASES_DEL_ENLACE`) y hasta tres hashtags (`hashtagsDe`: `#Balcarce`
primero si es de acá). **Nunca nombra la fuente** ni dice "Resumen hecho con
IA": las dos cosas están en la nota de la web.

La imagen la toma Facebook de la página de la nota: la tarjeta apaisada de
1200 × 630 (`web/app/nota/[id]/opengraph-image.js`, dibujada por
`web/lib/tarjeta.js`), con la foto del banco a la izquierda si hay
(`FOTO_EN_ENLACE`, sin el crédito adentro: está en el epígrafe de la página) o
la banda de color.

**3d. Publicar y anotar.** `publicarEnFacebook` (`redes/meta.mjs`) publica con
el token de la página. Apenas Meta contesta se anota en el libro
(`libro.facebook[id de la nota]`: cuándo, número del posteo, titular, enlace y
temas) y se guarda. Si Meta dice que el token murió (código 190), se corta todo.

**3e. El espejo en Instagram.** Enseguida, `publicarFotoEnInstagram` publica
en el feed la tarjeta vertical de **1080 × 1350** (`/nota/ID/instagram.png`)
con el mismo texto. Instagram exige que la imagen esté en una dirección
pública, y ésta ya lo está porque la arma la web al compilar. Si falla, el
posteo no se toca: se anota el intento (`intentosEspejo`) y se reintenta en las
vueltas siguientes (3a). Es la **única foto** que va a Instagram; todo lo demás
es video.

### 4. El reloj: ¿toca alguna pieza ahora?

`node redes/reloj.mjs` no instala nada: mira la hora, el libro y el clima de la
portada y deja dos datos para los pasos siguientes: `hay=true|false` y
`solo=nombre1,nombre2`. Por dentro, `slotsQueTocan` (`redes/piezas.mjs`) arma
el cronograma del día (`cronogramaDelDia`) y se queda con lo que está **dentro
de su ventana** y **no está en el libro** (`libro.instagram["AAAA-MM-DD/nombre"]`),
hasta 6 por corrida (`POR_CORRIDA`), para que una corrida atrasada no deje nada
para la siguiente. Si no toca nada, la corrida termina en segundos.

**Los horarios** (esta tabla es la referencia; el código manda):

| Pieza (nombre en el libro) | Tipo | Hora | Vale hasta | Qué días |
|---|---|---|---|---|
| Aviso de clima (`aviso-helada`, `aviso-granizo`, `aviso-viento`) | historia | 7:00 | 22:00 | Sólo si hay un aviso grave, hoy o mañana |
| Clima de la mañana (`clima-manana`) | historia | 7:30 | 11:30 | Todos |
| Podcast de la mañana (`noticia1`) | reel + historia | 10:00 | 15:00 | Todos, con 2 notas o más |
| Teléfonos útiles (`utiles`) | historia | 11:00 | 16:00 | Un día hábil por semana, rota solo |
| Podcast de la tarde (`noticia2`) | reel + historia | 15:00 | 20:00 | Todos, con 2 notas o más |
| Agenda del fin de semana (`agenda`) | historia | 18:00 | 20:00 | Jueves, si hay eventos en los próximos 4 días |
| Farmacia de turno (`farmacia`) | historia | 19:00 | 24:00 | Todos |
| Clima de la noche (`clima-noche`) | historia | 20:00 | 24:00 | Todos |
| Podcast de la noche (`podcast`) | reel + historia | 20:30 | 24:00 | Todos, con 2 notas o más |

- Las horas de las historias fijas son las **de fábrica** de `HISTORIAS_FIJAS`
  (`panel/horarios.mjs`): la pestaña Calendario del panel de la PC no llega a
  GitHub (`PENDIENTES.md`, D7). Las de los podcasts, `PODCASTS` y `HORAS_REELS`
  (`redes/piezas.mjs`). Las ventanas, `VENTANAS` (2 horas si una pieza no tiene
  la suya, `VENTANA_MINUTOS`). Ninguna cruza la medianoche: si la ventana se
  cierra sin que salga, esa pieza se pierde por hoy.
- **Los útiles rotan** de lunes a viernes, un día distinto cada semana
  (`diaRotativoDeUtiles`, `ingesta/utiles.mjs`, aplicada por `toca` de
  `panel/horarios.mjs`, la única que decide qué día sale cada pieza).
- **El aviso de clima** sale apenas se detecta: `avisoDeClima` toma el primero
  de gravedad alta de `avisosDelClima` (`ingesta/alertas.mjs`): helada de −2° o
  menos, tormenta con granizo o viento de 60 km/h o más, hoy o mañana. "Posible
  helada" o "calor extremo" no alcanzan (están en la tarjeta de la portada).
  Una vez por día y por tipo; no es parte del contrato.

### 5. Armar los videos

Sólo si el reloj dijo `hay=true`: `npm ci` instala lo que hace falta para
dibujar y hacer video (`@resvg/resvg-js`, `ffmpeg-static`) y
`node reels/plan.mjs --generar --solo=…` arma **sólo** las piezas que pidió el
reloj, con `GEMINI_API_KEY_REDES`.

**5a. Los datos.** El plan lee `web/data/portada.json` y lo traduce con
`datosDeLaWeb` (`redes/datos.mjs`): las notas publicadas, el clima y la
farmacia. Como sale de lo ya publicado, **una pieza nunca habla de algo que el
semáforo frenó**. La agenda sale de la agenda publicada (`web/data/agenda.json`,
`eventosProximos` en `reels/plan.mjs`). También lee el libro y la historia del
dólar. En la PC, si existe `panel/datos/ultima.json`, usa eso filtrado con
`esPublicable` y los horarios guardados en el panel.

**5b. El plan del día** (`planDelDia`) arma cada pieza con su guion (lo que
dice la voz), su placa, su color de acento y su hora. Dos techos: 3 reels y
**8 historias por día** (las 6 del contrato más 2); si sobra, se deja de armar
primero la de útiles y después la agenda (`historiasQueSobran`). Las del
contrato y los avisos de clima nunca se sacan.

**5c. Cada video** lo arma `armarReel` (`reels/reel.mjs`):

1. **La placa**, de SVG a PNG de 1080 × 1920 (`aPng`, `reels/placa.mjs`), con
   las letras de `reels/marca/fuentes/`.
2. **La voz.** `paraLeer` (`reels/voz.mjs`) dice los símbolos en palabras
   ("12°" → "12 grados", "%" → "por ciento", "km/h", "N°"). `decirGemini`
   (`reels/voz-gemini.mjs`) pide el audio a `gemini-3.8-flash-tts` por la
   Interactions API: el texto va literal y, aparte, un estilo corto (el de
   siempre más el de la mañana, la tarde o la noche), con la voz de esa pieza,
   la locutora o el locutor, según el reparto de `CRITERIO-REDES.md` § 6
   (`vozDePieza`, `redes/prompt-redes.mjs`; una pieza sin voz no se arma).
   Hasta 4 intentos, 2 segundos entre pedidos y 2 minutos como máximo por
   pedido. Un audio que dura de más para su texto (`vozDeMas`: leyó algo que no
   estaba) cuenta como falla. Si Google contesta que se acabó el cupo del día
   (`esCupoDelDia`), corta en el acto: esperar no lo arregla. **Si Gemini
   falla, la pieza no sale** (nunca con otra voz): `plan.mjs` la deja fuera del
   manifiesto y el reloj la vuelve a pedir en la vuelta siguiente mientras dure
   su ventana.
3. **Los subtítulos.** Gemini no dice cuándo arranca cada palabra: `alinear`
   (`reels/alinear.mjs`) busca los silencios del audio con ffmpeg,
   `reels/tiempos.mjs` reparte las palabras entre pausa y pausa según sus
   sílabas (error medio de 0,1 a 0,2 segundos; los números se cuentan como los
   dice la voz: "715" son 6 sílabas) y `enCarteles` (`reels/voz.mjs`) las
   agrupa de a 2 a 4. Van en tinta, con la palabra que se está diciendo en el
   color de acento, centrados en la fila 1660 (fuera de la zona de texto de la
   placa).
4. **El video**, con ffmpeg: la placa con un zoom muy lento (hasta 1,035), 30
   cuadros por segundo, la voz y un segundo y medio de cola. Sin música.
5. **La medida de verdad.** Se mide lo que dura el archivo. Si pasa de **58
   segundos** (`PODCAST_VOZ.segundosMaximoHistoria`; Meta acepta 60), la
   historia sube una copia cortada con fundido (`recortarParaHistoria`,
   `reels/duracion.mjs`), el reel sube entero y el registro deja un aviso
   amarillo.

Lo armado queda en `reels/salida/` (no va al repositorio) con un manifiesto,
`reels/salida/piezas.json`. Si una pieza falla al armarse, las demás siguen.

### 6. Publicar las piezas

`node redes/publicar.mjs --piezas` llama a `publicarPiezas`
(`redes/publicar-piezas.mjs`):

1. Vuelve a filtrar con `piezasQueTocan`: sólo lo que está en hora y no está
   en el libro.
2. **Instagram primero, y manda.** El video se sube en dos pasos (Instagram da
   una dirección de subida y después se espera a que lo procese). Un solo
   intento: si falla, **no se intenta en Facebook**, para no dejar un video en
   una red y otro distinto en la otra si la vuelta siguiente elige otras notas.
3. **Después, la página de Facebook**, con el mismo video: hasta 3 intentos,
   esperando 4 y 8 segundos entre uno y otro. Si igual falla, se avisa y lo de
   Instagram queda.
4. **Cada reel se sube también como historia** en las dos redes (el mismo
   video: no gasta otra voz). Hasta 3 intentos en la misma corrida; **entre
   corridas no se reintenta** (el video no se guarda y armarlo de nuevo gasta
   voz y podría elegir otras notas). Se anota en `libro.historiasDeReels`.
5. **El libro se guarda después de cada publicación**: si algo se corta a la
   mitad, lo que salió no vuelve a salir.
6. **El texto.** Las historias no llevan. Los reels llevan `pieDePieza`: el
   título del podcast, sus notas con su enlace y "Más en radarbalcarce.com".
   Nunca la fuente.
7. **La dirección pública del podcast** (`permalink`) se le pide a Meta
   enseguida y se guarda en el libro: la usa la nota del podcast en la web.

Si Meta dice que el token murió, se corta todo en el acto.

### 7. Guardar los videos y completar direcciones

- Los `.mp4` y el manifiesto quedan **3 días** como artefacto de la corrida
  (Actions → la corrida → Artifacts), para mirarlos o subirlos a mano.
- **Completar las direcciones de los podcasts** (`--enlaces`,
  `completarEnlaces`): a Facebook le lleva un rato procesar un video y a veces
  no da la dirección enseguida. En cada vuelta se pregunta por los podcasts de
  los últimos 3 días que no la tienen, hasta 5 veces cada uno. Sólo pregunta:
  corre con las redes apagadas y nunca frena la corrida.

### 8. Guardar el libro en el repositorio

"Guardar lo publicado" commitea `web/data/redes.json` aunque un paso anterior
haya fallado (lo que salió no tiene que repetirse). Trae antes lo de las otras
corridas (`git pull --rebase`); si chocan en un archivo de `web/data/`, gana lo
de esta corrida; reintenta hasta 3 veces. Si no puede, termina en rojo con "la
vuelta siguiente puede repetir lo publicado".

### 9. Lo que pasa después, en otros lados

- **"Actualizar la web"** lee el libro: respeta la dirección con la que salió
  cada posteo aunque la IA cambie el titular, guarda en el archivo las notas
  que salieron en redes y arma **la nota propia de cada podcast**
  (`web/lib/notas-propias.js`, `06-WEB`).
- **"Vigilancia"** (cada media hora) cuenta el contrato del día, avisa por
  WhatsApp lo que salió y lo que falta, y a las 23:30 lo compara con lo que
  Meta tiene publicado ("Estadísticas y auditorías", más abajo).

## El cupo de voz

La clave de redes es gratis y Google le da **10 audios por día** del modelo de
voz (la clave y sus límites: `08-INFRAESTRUCTURA`). Un día normal gasta 6: el
clima de la mañana, los tres repasos, la farmacia y el clima de la noche. A
veces se suman los útiles (un día hábil por semana), la agenda (los jueves con
eventos) y un aviso de clima. La historia de cada reel no gasta: es el mismo
video.

Gastan de más: una pieza que Instagram rechazó y el reloj vuelve a armar, un
audio que duró de más (`vozDeMas`) y lo que se corre a mano con la misma clave:
Piezas (un audio por pieza), Auditar voz (6 audios, 9 con `explorar`) y Crear
voces (`crear` y `recrear`). Si el cupo se acaba, la pieza de ese día no sale:
nunca con otra voz.

## Qué sale cada día: el contrato

Lo que **tiene** que salir cada día en cada red, en hora de Balcarce. Vive en
`redes/contrato.mjs` (`contratoDelDia`); los números, en `CONTRATO_DIARIO`
(`ingesta/criterio.mjs`, controlados contra la tabla de
`CRITERIO-EDITORIAL.md`); las horas y las ventanas, en `redes/piezas.mjs`. Rige
desde el 25/09 (`CONTRATO_DESDE`).

| Por red, por día | Facebook | Instagram |
|---|---|---|
| Reels (los tres podcasts) | 3 | 3 |
| Historias de los podcasts | 3 | 3 |
| Historias de clima (mañana y noche) | 2 | 2 |
| Historia de la farmacia | 1 | 1 |
| **Historias en total** | **6** | **6** |
| Posteos de notas (tope; pueden ser menos) | hasta 5 posteos | hasta 5 espejos |
| Aparte, no cuentan en las 6 | teléfonos útiles (1 por semana), agenda (jueves, si hay eventos) | igual |
| Techo de historias del día | 8 | 8 |

Cada pieza del contrato está en uno de tres estados:

- **salió**: está en el libro;
- **pendiente**: todavía no es su hora, o está dentro de su ventana;
- **falta**: la ventana se cerró y no salió. La historia de un podcast cuyo
  reel salió hace más de 15 minutos es "falta" enseguida (no se reintenta).

Los posteos se juzgan aparte: si a las 22 quedaron menos de 5, se mira si
**había candidatas** que cumplían todas las reglas y no salieron
(`candidatasSinPublicar`). "Sin más candidatas" es normal; "FALLA: había N
candidata(s)", no. Un posteo sin su espejo en Instagram cuenta como incompleto.

El contrato también busca **duplicados que dejan rastro**: el mismo número de
Meta bajo dos piezas o el mismo enlace en dos posteos. Dos publicaciones que se
pisan en la misma entrada del libro no se ven en el libro: sólo las ve la
auditoría contra Meta.

## Las piezas, una por una

Todas comparten: vertical de 1080 × 1920, fondo papel, la marca "Radar
Balcarce" abajo, texto sólo entre las filas 250 y 1580 (`ZONA_TEXTO`: lo de
afuera lo tapa la interfaz de Instagram) y subtítulos debajo. Qué dice cada
una, frase por frase, lo decide `CRITERIO-REDES.md` § 3 ("Una ficha por pieza")
y lo arma `redes/guiones.mjs`.

| Pieza | Guion (`redes/guiones.mjs`) | Placa (`reels/placa.mjs`) | Qué muestra la placa |
|---|---|---|---|
| Clima de la mañana | `guionClima` | `placaClima` | La tarjeta oscura del clima ahora (temperatura, cielo, sensación térmica, viento), hoy y los dos días que siguen. Sin dólar: si se mueve, sale como nota propia |
| Clima de la noche | `guionClimaNoche` | `placaClima` | "Cómo sigue el día": ahora, la mínima de esta noche, mañana y pasado, con el pronóstico de mañana en una frase |
| Aviso de clima | título y texto del aviso | `placaClima` con recuadro | La tarjeta del clima con el recuadro del aviso: el título se ve de reojo y abajo va lo que hay que saber; acento en el color de Policiales |
| Farmacia de turno | `guionFarmacia` | `placaFarmacia` | La farmacia (o las dos) de turno, la dirección y "De turno hasta mañana a las 8:30" (`hastaCuandoElTurno`). El turno lo decide la web (`02-INGESTA`) |
| Teléfonos útiles | `guionUtiles` | `placaUtiles` | Los números de `NUMEROS` (`ingesta/utiles.mjs`), por categoría |
| Agenda | `guionAgenda` | `placaAgenda` | Los eventos de los próximos 4 días de la agenda publicada (`web/data/agenda.json`) |
| Los tres podcasts | `armarPodcast` vía `repasoConPresupuesto` | `placaRepaso` | "Repaso · tapa": el nombre del podcast en el color del día y la lista numerada de sus notas, cada una con el color de su sección |

### Los podcasts

Tres por día: **"El repaso de la mañana"** (`noticia1`, 10:00), **"El repaso
de la tarde"** (`noticia2`, 15:00) y **"El repaso del día"** (`podcast`,
20:30). La lista es una sola, `PODCASTS` (`redes/piezas.mjs`). No hay historias
ni reels de una sola nota: dichas de a una sonaban raras.

**Qué notas entran** (`elegirParaPodcast`, `redes/elegir.mjs`; números en
`PIEZAS`, `ingesta/criterio.mjs`):

1. Sólo las que pueden salir solas (`sePuedeSola`): ni roja, ni Política ni
   Policiales, con cuerpo, que no sea nota propia, y **de Balcarce**
   (`esParaLasRedes`, la misma regla que Facebook).
2. **Los tres, 4 notas** (30/09; eran 3 a la mañana y a la tarde), y **ninguno
   repite** una nota ni un tema que ya contó otro repaso de hoy o de los dos días
   anteriores (`notasContadasEnPodcasts`, `repasosDelDia` en `redes/repasos.mjs`).
3. **Mañana y tarde:** relevancia 62 o más. **Noche:** lo que dejó el día y
   todavía no se contó, sin piso de relevancia. Un día flojo, un repaso sale con
   las notas nuevas que haya (hasta 2).
4. El mismo hecho contado por dos medios cuenta una vez (`mismoTema`: comparten
   una palabra rara de siete letras o más; más estricto que el `temaParecido`
   de Facebook, a propósito).
5. Primero una nota por sección, para que no sean cuatro del mismo evento; si
   sobra lugar, se completa por puntaje.
6. **Con menos de 2 notas, ese podcast no sale** (el contrato lo marca como
   "falta" y el vigilante aclara "si ese día no había notas para contar, es
   normal").

**El guion** (`repasoConPresupuesto`): el saludo de su hora, cada nota con su
titular y, **sólo si el texto es nuestro** (de la IA o de una persona), la
primera oración de la bajada; y el cierre de su hora, que dice "radarbalcarce
punto com". La fuente no se nombra nunca. Tiene **presupuesto de 55 segundos**
(por palabras, `segundosDePodcast`): si no entra, se saca primero la oración de
contexto de las notas, de la última a la primera, y después notas del final,
hasta un mínimo de dos. El pie del reel muestra las notas que quedaron.

**Un color por día** (`colorDelDia`, `COLORES_DEL_DIA`): los tres podcasts del
día comparten color (domingo magenta, lunes el rojo de la marca, martes verde,
miércoles azul, jueves ámbar, viernes violeta, sábado verde azulado), para
distinguirlos en la grilla de Instagram.

**La nota del podcast en la web:** cuando el libro registra un podcast con dos
notas o más, la corrida siguiente de "Actualizar la web" arma su nota propia
con los enlaces a Instagram y Facebook (`06-WEB`, `CRITERIO-EDITORIAL.md` § 8).

## Las plantillas y la foto

Fondo papel, títulos en serif grandes, la marca abajo y el color de cada
sección como acento (el lienzo "Radar Balcarce · Plantillas redes", aprobado
por Hernán el 28/09). Las letras son las del sitio (Source Serif 4 e Inter) y
los colores de sección, los de la web (`--s-*` de `web/app/globals.css`; una
prueba controla que coincidan).

| Qué | Archivo | Medida | Dónde se ve |
|---|---|---|---|
| Placas de historias y reels | `reels/placa.mjs` (`placaRepaso`, `placaClima`, `placaFarmacia`, `placaUtiles`, `placaAgenda`) | 1080 × 1920 | Instagram y la página de Facebook |
| Tarjeta del espejo | `web/lib/tarjeta.js` (`tarjeta(nota, { instagram: true })`), servida en `/nota/ID/instagram.png` | 1080 × 1350 (4:5) | El feed de Instagram |
| Tarjeta para compartir | `web/lib/tarjeta.js` (`tarjeta(nota)`), servida por `opengraph-image` | 1200 × 630 | Facebook con enlace, WhatsApp, X |
| Las cuentas de las tarjetas (colores, cuerpos del título, qué entra, zonas) | `web/lib/tarjeta-diseno.js` | — | Se prueban sin levantar el sitio (`pruebas/placas.test.mjs`) |

- Las tarjetas se generan **al compilar el sitio**, una por nota (las de la
  portada y las archivadas que salieron en redes, `notasConImagen`), y quedan
  como archivos estáticos. La tarjeta de Instagram tiene el texto entre las
  filas 135 y 1215, porque la grilla del perfil la recorta.
- **La foto.** La tarjeta de Instagram lleva la foto de la nota del banco
  propio (`web/data/banco-fotos.json`, `05-FOTOS`), recortada y sin el crédito
  adentro; el crédito va al final del texto del posteo (`conCreditoDeFoto`,
  `redes/elegir.mjs`). La misma constante, `FOTO_EN_INSTAGRAM`
  (`web/lib/tarjeta-diseno.js`, en `true`), la leen la imagen y el texto, así
  nunca sale un crédito sin foto ni una foto sin crédito; en `false`, todas
  vuelven a la placa. La tarjeta para compartir también lleva la foto
  (`FOTO_EN_ENLACE`, `paraCompartirConFoto`). **Sin foto que sirva**, la "placa
  sin foto": el bloque de color de la sección con los anillos del radar. Los
  videos van siempre con placa.
- Colores, letras, íconos y el catálogo de plantillas: `MEDIA-KIT.md`. Medidas
  y zonas seguras: `FORMATOS.md` y `redes/formatos.mjs`.
- El avatar (`reels/avatar.mjs`) y la portada de Facebook (`reels/portada.mjs`)
  se generan a mano en la PC y los sube una persona (`PARA-CARGAR-A-MANO.md`).

## La voz y los guiones

Todo lo que tiene que ver con **cómo suena** está en `CRITERIO-REDES.md`, y el
código lo lee de ahí, sin copias:

- `redes/prompt-redes.mjs` lee de ese documento, entre marcas `<!-- … -->`, la
  identidad ("Radar Balcarce", `radarbalcarce.com`, cómo se dice la dirección),
  las dos voces propias (locutora y locutor, con su identificador), qué voz dice
  cada pieza y los estilos (el de siempre y los de mañana, tarde y noche). Si
  falta una parte, **falla a la vista** en vez de hablar sin criterio (y
  `npm test` lo controla).
- `redes/guiones.mjs` es el libro de recursos hecho código: saludos, aperturas,
  conectores, comentarios del clima, cierres y el guion de cada pieza. La
  variedad es **determinística**: cada frase se elige con una semilla hecha de
  la fecha, la pieza y el lugar de la frase; el mismo día y la misma pieza dan
  siempre el mismo texto. `revisarTexto` controla las reglas de toda pieza
  (nunca nombrar un medio, nunca ".ar", nunca "en vivo", el saludo de su hora);
  la usan las pruebas (`pruebas/redes-criterio.test.mjs`) sobre los bancos de
  frases, no cada pieza al publicarla.
- Dos reglas de fondo: **la voz no lee la placa** (la placa muestra el dato, la
  voz cuenta qué significa) y **la fuente no se nombra nunca en redes**.
- La voz de verdad se comprueba a mano con el workflow **Auditar voz**
  (`reels/auditar-voz.mjs` y `redes/auditoria-voz.mjs`): genera 6 clips cortos
  con la misma ruta de producción, le pide la transcripción a Gemini y controla
  que diga "Radar Balcarce", que la dirección termine en "punto com" y que el
  saludo sea el de la hora (`CRITERIO-REDES.md` § 7). Gasta 6 audios del cupo
  de voz del día: no correrlo un día normal de redes sin necesidad.
- Las voces se crean con el workflow **Crear voces** (`reels/crear-voces.mjs`) y
  viven en el proyecto de Google de la clave de redes. Vencen al año; el
  vigilante avisa 30 días antes (`08-INFRAESTRUCTURA`; el paso a paso para
  crearlas de nuevo, en `11-OPERACION`).

## El libro: `web/data/redes.json`

Es la memoria de las redes. Va al repositorio (lo commitean "Redes" y "Piezas")
y lo leen casi todos. Tiene cinco partes:

| Parte | Clave de cada entrada | Qué guarda | Lo escribe |
|---|---|---|---|
| `facebook` | el id de la nota | cuándo, número del posteo (`postId`), titular, enlace, temas; `intentosEspejo` si el espejo falló | `redes/publicar.mjs --facebook` |
| `instagramFeed` | el id de la nota | cuándo, número de la foto (`mediaId`), titular, enlace | el espejo, el mismo programa |
| `instagram` | `AAAA-MM-DD/nombre` (por ejemplo `2026-09-28/noticia1`) | cuándo, `mediaId`, tipo (`REELS` o `STORIES`), `notaId` y `notaIds` (las notas que contó), `permalink`, `intentosEnlace` | `publicarPiezas` |
| `facebookVideos` | igual que `instagram` | lo mismo, para la página de Facebook | `publicarPiezas` |
| `historiasDeReels` | `red/AAAA-MM-DD/nombre` | el reflejo de cada podcast como historia, por red | `publicarPiezas` |

Lo leen `elegirParaFacebook` (no repetir nota ni tema, contar los del día), el
reloj y `piezasQueTocan` (qué ya salió), el plan (qué notas ya se contaron),
`redes/contrato.mjs`, `redes/vigilar.mjs` y `redes/avisos.mjs` (el contrato y
el WhatsApp), `redes/auditar-redes.mjs` (contra Meta) y
`web/scripts/generar-datos.mjs` (enlaces fijos, archivo, notas de los podcasts,
estadística diaria). **No se edita a mano**: si una entrada se borra, esa pieza
o ese posteo puede volver a salir.

## Estadísticas y auditorías

| Qué | Cuándo | Archivo | Qué mira | Cómo se entera uno |
|---|---|---|---|---|
| **Lo que salió en redes** | cada corrida de Vigilancia | `redes/avisos.mjs` (`novedadesEnRedes`) | El libro desde la corrida anterior, agrupado (el mismo podcast en las dos redes es una línea) | WhatsApp "📣 Salió en redes" |
| **El contrato del día** | cada corrida y a las 21 | `redes/contrato.mjs`, `redes/vigilar.mjs` (`problemasDelContrato`) | Faltas, duplicados en el libro, posteos sin espejo; con las redes apagadas, sólo lo dice una vez por día | WhatsApp de problemas (cada 6 h por problema); una línea por red en el resumen de las 21 |
| **El cierre del día** | desde las 23:30 (si se atrasa, hasta las 3:00 cierra el día anterior), una vez | `redes/vigilar.mjs` (`fechaDelCierre`, `cierreDelDia`) con `redes/auditar-redes.mjs` (`informeDelDia`) | El día contra lo que Meta tiene de verdad: faltantes, duplicados (dos iguales a menos de 30 minutos), libro sin Meta y Meta sin libro (tolerancia de 20 minutos) | WhatsApp **sólo si hay discrepancias**; si todo cuadra, "✓ Cierre del día…" viaja en el próximo mensaje. Con las redes apagadas se saltea |
| **Estadísticas** | 9 y 21 | `redes/estadisticas.mjs`, guarda `web/data/estadisticas.json` (sólo números, 120 mediciones) | Visitas de Cloudflare Web Analytics (aproximadas) y seguidores de Facebook e Instagram; vistas, alcance e interacciones sólo si `META_TOKEN` tiene `read_insights` e `instagram_manage_insights` (`PENDIENTES.md`) | WhatsApp de la mañana y resumen de las 21 |
| **Auditar redes** | a mano | `redes/auditar-redes.mjs` (`auditar-redes.yml`) | Hoy, ayer, la semana (% de cumplimiento por red y pieza) y lo que devuelve Meta sin interpretar | El registro de la corrida |
| **La semana del contrato** | lunes 9:00 | `redes/auditar-redes.mjs --semana`, dentro de `auditoria.yml` | Igual que la semana de arriba | El registro |
| **Auditoría semanal** | lunes 9:00 | `redes/auditar.mjs` (`auditoria.yml`), guarda `web/data/auditoria.json` | Que la tarjeta de Instagram mida 1080 × 1350 y la de compartir 1200 × 630, los íconos, el SEO en vivo y que las medidas de `redes/formatos.mjs` no tengan más de 90 días | WhatsApp si hay problemas; el vigilante avisa si no corre hace más de 10 días |
| **Ver Facebook** | a mano | `redes/ver-facebook.mjs` (`ver-facebook.yml`) | Qué hay publicado de verdad en la página: posteos, reels, historias, con fecha | El registro || **Auditar voz** | a mano | `reels/auditar-voz.mjs` (`auditar-voz.yml`) | Ver "La voz y los guiones" | El registro (PASA/FALLA) |

Límite de lo que Meta deja ver: **las historias sólo se ven mientras están
activas (24 horas)**. Por eso el cierre es a las 23:30, y la auditoría de días
anteriores cuenta las historias por el libro y lo dice.

## Cómo está conectado con Meta

- **Instagram** `@radarbalcarce`: cuenta profesional, vinculada a la página de
  Facebook "Radar Balcarce".
- **La página de Facebook**: su identificador para la API es
  **`1254237411116171`** (Configuración del negocio → Páginas →
  Identificador). El número de la dirección `facebook.com/profile.php?id=…`
  (61594865361170) es el del perfil y la API lo rechaza. En el código hay uno
  solo, `PAGINA_DE_FACEBOOK` (`redes/meta.mjs`), que se puede pisar con la
  variable `META_PAGE_ID` (no está cargada).
- **La app de Meta** "Radar Balcarce Publicador" (ID `2302218363874399`), en el
  portfolio comercial "Radar Balcarce", con los casos de uso Threads, Instagram
  y Páginas, y los permisos `pages_manage_posts`, `pages_read_engagement`,
  `pages_show_list`, `instagram_basic` e `instagram_content_publish`. Está
  **publicada (modo activo)** desde el 26/09: en modo desarrollo publicaba,
  pero el público no veía los posteos ni los reels de Facebook.
- **El usuario del sistema** `publicador-radar`, con la página (Contenido y
  Estadísticas), el Instagram (Contenido y Estadísticas) y la app. Su token
  **no vence** y es el secreto `META_TOKEN`. Le faltan `read_insights` e
  `instagram_manage_insights` para las estadísticas (`PENDIENTES.md`).
- **Por qué todo lo de Instagram es video:** la API no acepta una imagen que no
  esté en una dirección pública, y no se alojan archivos sueltos; el video sí
  se le entrega directo. La única foto es el espejo, porque su tarjeta ya está
  publicada en el sitio.

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `.github/workflows/redes.yml` | La corrida: Facebook, piezas, direcciones y libro | cron-job.org y el final de "Actualizar la web"; a mano (`reloj`, `verificar`, `facebook`) | `META_TOKEN`, `GEMINI_API_KEY_REDES`, `REDES_ACTIVAS` | commit de `web/data/redes.json`; artefacto con los videos (3 días) |
| `.github/workflows/piezas.yml` | Armar (y si se pide, publicar) piezas a mano | una persona, Actions → Piezas | `solo` (vacío no arma nada), `todas`, `publicar`, `destino`; los mismos secretos | artefacto (7 días); el libro si publicó |
| `redes/publicar.mjs` | El programa: `--verificar`, `--facebook`, `--piezas [--sin-horario] [--destino=…]`, `--enlaces` | los dos workflows | `portada.json`, `redes.json`, `reels/salida/piezas.json` | `redes.json` |
| `redes/elegir.mjs` | Qué se publica: reglas de Facebook (`vaAFacebookPorLoQueEs`), texto del posteo, hashtags, qué notas cuenta cada podcast y su guion con presupuesto, el interruptor | `publicar.mjs`, `reels/plan.mjs`, contrato, avisos | `ingesta/criterio.mjs`, `web/lib/cuerpo.js` | — (funciones puras) |
| `redes/espejo.mjs` | Qué espejos reintentar | `publicar.mjs` | el libro y la portada | — |
| `redes/reloj.mjs` | ¿Toca alguna pieza ahora? | `redes.yml` | `redes.json`, el clima de `portada.json` | `hay` y `solo` |
| `redes/piezas.mjs` | Cronograma, ventanas, podcasts, aviso de clima, color del día, pie de los reels, techo de historias | reloj, plan, publicar-piezas, contrato, vigilante | `panel/horarios.mjs`, `ingesta/utiles.mjs`, `ingesta/alertas.mjs` | — |
| `redes/publicar-piezas.mjs` | Sube los videos: Instagram manda, Facebook con reintentos, la historia de cada reel; completa direcciones | `publicar.mjs` | manifiesto y videos | el libro |
| `redes/datos.mjs` | Traduce `portada.json` a los datos del plan | `reels/plan.mjs` | `portada.json` | — |
| `redes/meta.mjs` | Habla con Meta (Graph v23.0): posteo, foto, video, dirección pública, verificación; `PAGINA_DE_FACEBOOK`. Token en el encabezado, nunca en la dirección | todo lo que publica o lee Meta | `META_TOKEN` | — |
| `redes/contrato.mjs` | El contrato del día y sus textos | vigilante, avisos, auditar-redes | libro, portada | — |
| `redes/guiones.mjs` | Lo que dice la voz en cada pieza | plan, elegir, panel de la PC | `ingesta/criterio.mjs`, `prompt-redes.mjs` | — |
| `redes/prompt-redes.mjs` | Lee identidad, voces y estilos de `CRITERIO-REDES.md` | guiones, plan, reel, voz | `CRITERIO-REDES.md` | — |
| `reels/plan.mjs` | El plan del día y, con `--generar`, los videos | los workflows | datos, libro, dólar, agenda publicada | `reels/salida/*.mp4`, `*.png`, `*.mp3`, `piezas.json` |
| `reels/reel.mjs` | Arma un video: placa, voz, subtítulos, ffmpeg, recorte para historia | `plan.mjs` | la pieza | archivos en `reels/salida/` |
| `reels/placa.mjs` | Dibuja las placas (SVG) y las pasa a PNG | `plan.mjs`, `reel.mjs` | `reels/marca/fuentes/` | PNG |
| `reels/voz-gemini.mjs` | La voz de Gemini: pedido, cupo del día, audio que dura de más | `reel.mjs`, Auditar voz | `GEMINI_API_KEY_REDES` (`reels/claves.mjs`) | mp3 |
| `reels/voz.mjs` | `paraLeer` (los símbolos en palabras) y `enCarteles` (los carteles de subtítulos) | `reel.mjs` | — | — |
| `reels/alinear.mjs`, `reels/tiempos.mjs` | Cuándo arranca cada palabra del subtítulo | `voz-gemini.mjs` | el audio | — |
| `reels/duracion.mjs` | El máximo de una historia (58 s) y el recorte | `reel.mjs` | — | — |
| `reels/crear-voces.mjs` | Crear, listar y borrar las voces propias | "Crear voces" | `GEMINI_API_KEY_REDES` | audios de prueba (artefacto) |
| `reels/auditar-voz.mjs`, `redes/auditoria-voz.mjs` | La auditoría de la voz real | "Auditar voz" | `GEMINI_API_KEY_REDES` | — |
| `web/lib/tarjeta.js` | Las tarjetas de cada nota (compartir e Instagram) | las rutas de Next al compilar | la nota, `reels/marca/fuentes/`, la foto del banco | PNG estáticos del sitio |
| `web/lib/tarjeta-diseno.js` | Medidas, colores, cuentas y `FOTO_EN_INSTAGRAM` | `tarjeta.js`, `publicar.mjs` | `banco-fotos.json` | — |
| `redes/vigilar.mjs`, `redes/avisos.mjs` | El vigilante: contrato, cierre, WhatsApp (`08-INFRAESTRUCTURA`) | `vigilancia.yml` | libro, portada, auditoría, GitHub, Meta | `web/data/vigilancia.json`, `estadisticas.json` |

El libro (`web/data/redes.json`) tiene su sección más arriba, y los archivos de
las estadísticas y las auditorías están en su tabla.

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Prender o apagar las redes | Variable `REDES_ACTIVAS` en GitHub (`Si` / otra cosa), sin tocar código (`11-OPERACION`) |
| Que una nota aprobada por una persona vaya también a las redes | Panel del celular → "También a Facebook e Instagram" (`09-PANEL`) |
| Cambiar cuántos posteos, la relevancia, el horario, la espera o la separación de Facebook | `FACEBOOK` en `ingesta/criterio.mjs` **y** la tabla "Los números" de `CRITERIO-EDITORIAL.md` (una prueba controla que coincidan) |
| Que otras notas (no sólo de Balcarce) vayan solas a las redes | `esParaLasRedes` y `vaAFacebookPorLoQueEs`, `redes/elegir.mjs` (decisión editorial: preguntar antes) |
| Qué secciones nunca salen solas | `SECCIONES_QUE_ESPERAN_PERSONA`, `ingesta/criterio.mjs` |
| Cuándo dos notas son "el mismo tema" | `temaParecido` (Facebook) y `mismoTema` (podcasts), `redes/elegir.mjs` |
| El texto del posteo, la frase del enlace, los hashtags | `mensajeDeNota`, `FRASES_DEL_ENLACE`, `hashtagsDe`, `redes/elegir.mjs` |
| Cuántas notas cuenta un podcast, su relevancia mínima, su presupuesto | `PIEZAS` y `PODCAST_VOZ`, `ingesta/criterio.mjs` (y la tabla del criterio) |
| La hora de un podcast | `HORAS_REELS`, `redes/piezas.mjs` |
| La hora de una historia fija (clima, farmacia, útiles, agenda) | Los valores de fábrica de `HISTORIAS_FIJAS`, `panel/horarios.mjs` (la pestaña Calendario del panel de la PC no cambia lo que publica GitHub) |
| Hasta cuándo vale una pieza | `VENTANAS`, `redes/piezas.mjs` |
| Los umbrales del aviso de clima | `UMBRALES`, `ingesta/alertas.mjs` |
| El color de los podcasts de cada día | `COLORES_DEL_DIA`, `redes/piezas.mjs` |
| El contrato (cuántas piezas por día, el techo, la hora del cierre) | `CONTRATO_DIARIO`, `ingesta/criterio.mjs` y su tabla; las piezas, `redes/contrato.mjs` |
| Qué dice la voz, los saludos, los cierres, qué voz dice cada pieza | `CRITERIO-REDES.md` (identidad, voces y estilos) y `redes/guiones.mjs` (bancos de frases) |
| El dibujo de una placa | `reels/placa.mjs` (y `MEDIA-KIT.md`) |
| El dibujo de las tarjetas de las notas | `web/lib/tarjeta.js` y `web/lib/tarjeta-diseno.js` |
| Que el espejo lleve (o no) la foto de la nota | `FOTO_EN_INSTAGRAM`, `web/lib/tarjeta-diseno.js` |
| Una medida de imagen de las redes | `redes/formatos.mjs` y `FORMATOS.md` |
| Cuántas veces se reintenta en Meta | `INTENTOS_SECUNDARIA`, `INTENTOS_HISTORIA`, `INTENTOS_ENLACE` (`redes/publicar-piezas.mjs`); `ESPEJO` (`redes/espejo.mjs`) |
| Cómo se habla con Meta, o el identificador de la página | `redes/meta.mjs` (`PAGINA_DE_FACEBOOK`) |
| Qué avisa el vigilante de las redes | `problemasDelContrato` y `evaluar`, `redes/vigilar.mjs` |

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| **cron-job.org desactivó el trabajo de Redes** (lo hace solo si falla varias veces) | Aviso "El reloj de Redes no corre" (alta). Igual arranca al final de cada "Actualizar la web", así que se nota poco | Reactivarlo en console.cron-job.org (`11-OPERACION`) |
| **Las redes están apagadas** (`REDES_ACTIVAS` no dice `Si`) | WhatsApp una vez por día: "Las redes están apagadas…"; el resumen de las 21: "Redes: apagadas" | Prenderlas si no fue a propósito |
| **El token de Meta murió** (código 190) | Redes en rojo: "El token venció o lo revocaron" | Una persona genera otro y lo pega en `META_TOKEN` |
| **Meta bloquea la API** ("API access blocked", pasó del 22 al 24/09 por "actividad inusual") | Fallan Redes y Piezas | Una persona confirma la cuenta en Meta; después, mirar que cron-job.org no haya apagado trabajos |
| **Falló Instagram al subir una pieza** | La pieza no sale en ninguna red; el reloj la vuelve a pedir mientras dure la ventana (gasta otro audio) | Nada, salvo que se repita: mirar el registro |
| **Falló Facebook después de Instagram** | Registro "falló (intento 3 de 3)"; el contrato marca la falta en Facebook | Una historia fija (clima, farmacia): Piezas con esa pieza, `publicar` y destino `facebook`. Un podcast: Piezas no sirve (no vuelve a armar un podcast que ya está en el libro de Instagram): bajar el video del artefacto de esa corrida de Redes (3 días) y subirlo a mano |
| **No salió la historia de un podcast** | WhatsApp: "no salió la historia de… (su reel sí salió y la historia no se reintenta)" | No hay forma automática. Si importa, bajar el `.mp4` del artefacto de esa corrida y subirlo a mano como historia; el libro no se entera y el contrato la sigue contando como falta |
| **No salió una pieza fija** (clima, farmacia) | WhatsApp: "No salió la pieza… y ya se cerró su ventana" | Mirar el registro de Redes (la voz, el cupo, `META_TOKEN`); publicarla con Piezas si todavía sirve y queda cupo de voz |
| **No salió un podcast** | WhatsApp de falta del reel | Si "ese día no había notas para contar", es normal |
| **Gemini (voz) no contesta** | La pieza no sale en esa vuelta ("la pieza no sale con otra voz") y se reintenta en la siguiente | Si se repite toda la ventana: el vigilante avisa si Google rechaza la clave de redes (`clave-…`) o si una voz ya no existe (`voz-…`); si no, mirar el modelo de voz |
| **Se acabó el cupo de voz del día** | Registro de Redes: "Gemini: se acabó el cupo del día (429)"; faltan piezas | Nada: vuelve al día siguiente. No correr Piezas, Auditar voz ni Crear voces un día de redes sin necesidad |
| **Una voz propia ya no existe o está por vencer** | WhatsApp `voz-locutora`/`voz-locutor` (alta) o `vence-voz-…` (30 días antes, con la fecha de Google) | Crearla de nuevo (`11-OPERACION`) |
| **Un posteo sin su foto en Instagram** | WhatsApp: "N posteo(s) de Facebook de hoy no tienen su foto en el feed". Se reintenta solo 4 veces en 12 horas | Si no se arregla solo, mirar que exista la tarjeta `/nota/ID/instagram.png` |
| **Un duplicado** | WhatsApp de prioridad alta (libro) o en el cierre de las 23:30 (Meta) | Borrar la copia a mano en la red (una persona) |
| **El video pasa de 58 segundos** | Aviso amarillo en la corrida; la historia sube recortada con fundido | Nada: está previsto |
| **El libro no se pudo guardar** | Redes en rojo: "No se pudo guardar el libro después de tres intentos" | Mirar enseguida: la vuelta siguiente puede repetir lo publicado |
| **Se publica pero el público no lo ve** (pasó hasta el 26/09, con la app de Meta en modo desarrollo) | Nadie avisa | Correr "Ver Facebook" y mirar la página desde una cuenta que no sea administradora |
| **La auditoría semanal no corre** | El vigilante avisa si `web/data/auditoria.json` tiene más de 10 días | Correr "Auditoría" a mano (Actions → Auditoría → Run workflow) |
| **Las medidas de `formatos.mjs` quedaron viejas** (90 días) | La auditoría semanal avisa por WhatsApp | Volver a verificarlas (`FORMATOS.md`) |
| **Faltan permisos de estadísticas en `META_TOKEN`** | El resumen dice qué le falta | Regenerar el token con `read_insights` e `instagram_manage_insights` (una persona) |

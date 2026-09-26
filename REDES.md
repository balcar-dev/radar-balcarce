# Redes

*Actualizado el 25/09/2026.* Qué se publica en Instagram y Facebook, cómo y cuándo. El criterio editorial (qué se publica, qué nunca sale solo, cómo se escribe, los números) está en [`CRITERIO-EDITORIAL.md`](CRITERIO-EDITORIAL.md): los números de esta página salen de ahí (`ingesta/criterio.mjs`) y se cambian ahí. Las reglas que siempre se cumplen y qué las vigila están en `REGLAS.md`; dónde corre todo, en `INFRAESTRUCTURA.md`; los textos de los perfiles, en `PERFILES.md`; las medidas de las imágenes, en `FORMATOS.md`.

## 1. La competencia

Se mudó a [`docs/historico/INVESTIGACION-COMPETENCIA.md`](docs/historico/INVESTIGACION-COMPETENCIA.md): qué
hacen El Diario, Punto Nueve y La Vanguardia, los huecos que nadie llena y qué
de eso ya se hizo.

## 2. Publicidad

Se mudó a [`PUBLICIDAD.md`](PUBLICIDAD.md): los tres avisos de la web, cómo se
cargan desde el panel, las reglas que no se negocian y el orden para vender
(incluidas las menciones en los podcasts y en las historias, que son lo que
toca a este documento).

## 3. Las redes: qué sale, cómo y cuándo

*Andando en vivo desde el 24/09 (Meta destrabó la cuenta). El espejo a
Instagram, el reflejo de cada reel como historia y los tres podcasts se
sumaron el 23 y 24/09; el reflejo como historia y las historias se vieron
salir bien el 24/09. Falta mirar unos días el link en los posteos y el
podcast con notas de texto propio.*

### La regla de fondo

**Lo que sale a Instagram es siempre video con voz**: historias y reels.
Instagram no acepta una foto si no está en una dirección pública de internet,
y el video sí se le puede entregar directo. Como no queremos alojar archivos
en ningún lado, todo va en video. Por eso el feed de Instagram con fotos está
apagado (`feedPorDia: 0` en `reels/plan.mjs`).

**Facebook recibe dos cosas.** Por un lado, posteos con enlace: la tarjeta con la
imagen y el titular la arma sola con la imagen de NUESTRA página
(`web/lib/tarjeta.js`), nunca la foto de otro medio. Esa imagen, la que se ve
al compartir un enlace, mide **1200 × 630** (`opengraph-image` de la nota). Por otro, **los mismos
videos de Instagram como historias y reels de la página**, a la misma hora.

**Y, desde el 23/09, cada posteo de Facebook se espeja como foto en el feed
de Instagram** (`redes/publicar.mjs`, función `facebook()`): una tarjeta
propia **vertical de 1080 × 1350 (4:5)**, con el mismo texto que Facebook (titular, copete y el enlace a la
nota, sin nombrar la fuente). Si el espejo
falla, no invalida lo que ya se publicó en Facebook — sólo se avisa. Es la
única foto (no video) que sale a Instagram, y sólo porque es la tarjeta
propia ya alojada en nuestro sitio (`/nota/ID/instagram.png`), no un
archivo nuevo que haya que subir. Es vertical porque Instagram muestra el
posteo vertical y en la grilla del perfil lo recorta: todo el texto queda en
la **zona segura** del centro (1012 × 1080). Facebook usa la apaisada porque
así muestra Facebook un enlace. Por qué y cómo se vigila: `FORMATOS.md`.

### Qué sale hoy y a qué hora (hora de Balcarce)

**Facebook, automático.** Cada 30 minutos (a los :10 y :40) el sistema mira
la portada y publica **una** nota si cumple todo esto:

| Regla | Valor |
|---|---|
| Relevancia | 75 o más |
| Antigüedad en la web | entre 15 minutos y 8 horas (el enlace tiene que existir) |
| Sección | nunca **Política** ni **Policiales**: esas las decide una persona |
| Horario | de las 8 a las **22:00 en punto** (se cuenta en minutos: el 24/09 salió uno a las 22:25 y ya no puede pasar) |
| Tope | **5 por día**, con 90 minutos entre una y otra (conservador a propósito: la web publica unas 100 notas por día y en Facebook sería ruido) |
| Repetición | una nota sale una sola vez (lo garantiza `web/data/redes.json`) |
| Tema | **no repite un tema publicado en las últimas 24 horas** (desde el 25/09; el 24/09 salieron tres posteos de la reapertura del autódromo en cuatro horas). Dos notas son del mismo tema si sus titulares comparten dos palabras que dicen algo, o una larga, o una palabra y un tema del sitio (`temaParecido`, `redes/elegir.mjs`) |

El texto lleva el titular, el copete y **el enlace a la nota en nuestro sitio**
(o el texto para redes que escribe la IA, con hashtags). **Ya no dice "Resumen
hecho con IA"** (desde el 26/09, a pedido de Hernán y Andrés): quién escribió la
nota se dice en la nota, en la web. **La fuente no se nombra en las redes**
(desde el 24/09): eso está en la nota de la web.

**Cada pieza habla según su hora, con la misma locutora** (26/09): saludo, cierre
y tono son los de su horario (mañana "buen día", tarde "buenas tardes", noche
"buenas noches"), los textos varían de un día al otro dentro del criterio, y la
página se dice "Radar Balcarce punto com" (nunca ".ar": la voz lo agregaba una vez)
siempre al cerrar los podcasts y algunos días en el clima y la farmacia. Todo eso
está en [`CRITERIO-REDES.md`](CRITERIO-REDES.md); el código, en
`redes/guiones.mjs` y `redes/prompt-redes.mjs`, con pruebas en
`pruebas/redes-criterio.test.mjs`. La voz de verdad se comprueba a mano con el
workflow **Auditar voz** (`reels/auditar-voz.mjs`).

**El enlace no se rompe** (desde el 25/09). La dirección de cada nota queda
fija desde la primera vez que sale, aunque la IA cambie el titular después. Y
la página sigue existiendo 180 días aunque la nota ya no esté en la portada
(`web/data/archivo.json`, `web/lib/archivo.js`). Si igual llega una
dirección vieja, la página 404 la rescata por el identificador del final.
Antes de eso, dos posteos del primer día daban 404. Pruebas en
`pruebas/archivo.test.mjs`.

**Historias y reels: Instagram y la página de Facebook, el mismo video.** Estas
son las piezas del día y su horario:

| Hora | Pieza | Tipo | Qué es |
|---|---|---|---|
| 07:30 | El clima de hoy | Historia | Todos los días |
| 10:00 | **El repaso de la mañana** | Reel (+ historia) | Podcast de 3 notas de temas distintos |
| 11:00 | Teléfonos útiles | Historia | Un día hábil por semana, rota solo |
| 15:00 | **El repaso de la tarde** | Reel (+ historia) | Podcast de otras 3 notas, sin repetir las de la mañana |
| 19:00 | Farmacia de turno | Historia | Sólo dice cuál es la de turno |
| 20:00 | Cómo sigue el día | Historia | Clima de la noche |
| 20:30 | **El repaso del día** | Reel (+ historia) | Podcast grande: 4 titulares de lo más fuerte |
| Jueves 18:00 | Qué hacer el fin de semana | Historia | Sólo si hay eventos cargados |

Son **3 podcasts por día** (mañana, tarde y noche) y **3 historias fijas**
(clima mañana, clima noche, farmacia), más las semanales. **Ya no salen
noticias sueltas** (24/09): dichas de a una sonaban raras. Cada podcast se
sube también como historia, en la misma red (`redes/publicar-piezas.mjs`);
ese reflejo no cuenta como una historia más del cronograma, se anota aparte
en `libro.historiasDeReels`.

**El texto del posteo de cada podcast** lista las notas que cuenta, cada una
con su enlace, y no nombra la fuente (`pieDePieza`, `redes/piezas.mjs`).

**Cada podcast tiene su nota en la web** (desde el 25/09). Cuando el libro
(`web/data/redes.json`) registra que salió un podcast (`noticia1` = mañana,
`noticia2` = tarde, `podcast` = noche, con dos notas o más), la corrida
siguiente de "Actualizar la web" arma una nota propia: *"El repaso de la
mañana en Radar Balcarce: Ferroviarios, autódromo y economía"*, con cada
nota que se contó (su titular, con el enlace, y una o dos frases de lo que
esa nota ya publicó) y, al final, los botones "Mirá y escuchá el repaso en
Instagram / Facebook". Identificador fijo: `repaso20260926manana`. Firma:
"Nota de Radar Balcarce: el texto del repaso publicado en nuestras redes."
Sección Balcarce si la mayoría de las notas es de acá. Sin IA: el texto sale
sólo de lo ya publicado (`web/lib/notas-propias.js`).

- **La dirección de cada video** (`permalink`) se le pide a Meta al publicar
  (Instagram: el campo `permalink` del medio; Facebook: `permalink_url` del
  video) y se guarda en el libro. Si Meta todavía no la da (a Facebook le
  lleva un rato procesar el video), la completa el paso "Completar las
  direcciones de los podcasts" de `redes.yml` (`node redes/publicar.mjs
  --enlaces`), en cada vuelta, hasta 5 intentos y sólo de los últimos 3 días.
  Sólo pregunta: corre aunque `REDES_ACTIVAS` esté apagado. Sin dirección, la
  nota sale igual, con el enlace que haya (o sólo con el texto).
- **Las notas propias no van a Facebook como posteo ni entran a un podcast**
  (serían redundantes: `esNotaPropia` en `redes/elegir.mjs`). Tampoco la del
  dólar de cada día.
- Si una nota del podcast se retira después (una persona la bloquea), el
  repaso se rearma sin ella; con menos de dos, se retira el repaso.

**Un color por día.** Los tres podcasts del día llevan el mismo color de placa
y cambia de un día al otro (domingo magenta, lunes el rojo de la marca, martes
verde, miércoles azul, jueves ámbar, viernes violeta, sábado verde azulado):
en la grilla de Instagram se nota de un vistazo de qué día es cada uno
(`colorDelDia`, `redes/piezas.mjs`; se cuenta con la hora de Balcarce).

Cómo se eligen (todo en `redes/elegir.mjs`, con pruebas):

- **Un podcast lee el titular de cada nota y, sólo si el texto es nuestro**
  (reescrito por la IA o por una persona), **una oración del copete.** Si el
  copete es el resumen del medio de origen, no se lee. Nunca se nombra la
  fuente. Mañana y tarde: 3 notas de temas distintos (`elegirParaPodcast`,
  `guionRepaso`, en `redes/elegir.mjs`), sin repetir entre sí; relevancia 62
  o más. Con menos de dos notas, ese podcast no sale.
- El mismo tema contado por dos medios cuenta una sola vez (por ejemplo, el
  mismo partido con dos titulares).
- **Política y Policiales no se arman solas en ninguna pieza**, no sólo en
  Facebook.
- Los horarios de las fijas (clima, farmacia, agenda, útiles) se cambian en el
  panel → Calendario, pero eso vale sólo en la PC. En GitHub rigen los de
  fábrica de `panel/horarios.mjs`.

### Quién publica y con qué

- **La voz** es de Gemini (voz Kore), con la clave de redes
  `GEMINI_API_KEY_REDES`, que es **paga**: no hay tope de pedidos. Si Gemini
  falla, la pieza sale igual con Elena, la voz de Microsoft.
- **Las piezas se arman en GitHub** con la PC apagada (workflow **Piezas**).
  Usan el clima, la farmacia y las notas de `web/data/portada.json`, o sea lo
  que ya se publicó: una pieza nunca habla de algo que el semáforo frenó.
- **Facebook (historias y reels de la página)**: el mismo video, con el mismo
  método (se abre la subida, se manda el archivo y se cierra). Instagram manda:
  si falla en Instagram no se intenta en Facebook (quedaría un video distinto en
  cada red); si falla en Facebook se reintenta 3 veces y, si igual no anda, se
  avisa sin perder lo de Instagram.
- **Instagram**: el video se sube directo en dos pasos (Instagram da una
  dirección de subida y se le manda el archivo). Las historias no llevan
  texto; los reels llevan el titular y `Más en radarbalcarce.com`.
- **El interruptor** es la variable de GitHub `REDES_ACTIVAS`. Vale `Si`
  (acepta cualquier mayúscula o tilde). Con otro valor, todo funciona pero
  sólo **simula**: muestra qué publicaría y no publica nada.

### Cómo se dispara solo

El workflow **Redes** (`.github/workflows/redes.yml`) corre varias veces por día,
con la PC apagada. En cada corrida hace tres cosas:

1. **Facebook**: si hay una nota fuerte y reciente, publica una.
2. **El reloj** (`redes/reloj.mjs`): mira la hora de Balcarce y el libro de lo ya
   publicado (`web/data/redes.json`) y dice qué historia o reel de Instagram le
   toca a esta hora y todavía no salió hoy.
3. **Si toca alguna**: la arma con la voz de Gemini (`reels/plan.mjs --solo=…`) y
   la sube a Instagram y a la página de Facebook. Después guarda el libro en el
   repositorio.

Cuando no toca ninguna pieza, la corrida termina en segundos y no instala nada.

**Quién lo dispara: cron-job.org**, desde el 21/09. El planificador propio de
GitHub **no es puntual**: en este repositorio dejó hasta cinco horas entre dos
corridas que debían distar treinta minutos, y el 21/09 no ejecutó ninguna en
toda la tarde-noche (la farmacia de las 19:00 se perdió y se publicó a mano).
Por eso cron-job.org tiene **tres** trabajos: "Actualizar la web", el reloj de
"Redes" y "Vigilancia". El del reloj llama a la API de GitHub (endpoint
`actions/workflows/redes.yml/dispatches`) cada 30 minutos, de 7 a 23 hora de
Balcarce, con `{"ref":"main","inputs":{"accion":"reloj"}}`. La cuenta de
cron-job.org es de `radarbalcarce@gmail.com`; el token de GitHub que usa es de
`balcardev@gmail.com`, personal (Settings → Developer settings → Personal
access tokens → Fine-grained), limitado a este repositorio, sólo permiso
Actions en lectura y escritura, vence el 21/09/2027 (**hay que renovarlo antes**
y actualizar el encabezado `Authorization` en cron-job.org). El workflow no
tiene `schedule` propio: si cron-job.org falla, el único respaldo es que el
reloj también arranca cuando termina "Actualizar la web" (`workflow_run`).

**Las ventanas.** Cada pieza tiene una ventana (`VENTANAS` en
`redes/piezas.mjs`; si no tiene una propia, 2 horas): si una corrida llega
tarde, todavía alcanza. El clima de la mañana vale hasta las 11:30; el repaso
de la mañana, hasta las 15; el de la tarde, hasta las 20; los teléfonos
útiles, hasta las 16; la farmacia, el clima de la noche y el repaso del día,
hasta la medianoche. Ninguna cruza la medianoche. Si la ventana se cierra sin
que salga, esa pieza se pierde por hoy.

**Consecuencia honesta:** una pieza puede salir hasta media hora después de su
hora (cron-job.org dispara cada 30 minutos, y GitHub tarda un poco en
arrancar). Si algo falla más tiempo que su ventana, se pierde.

| Cosa | Estado |
|---|---|
| Posteos en Facebook | **Andando** (desde el 24/09) |
| Historias y podcasts en Instagram y en la página de Facebook | **Andando** (desde el 24/09) |
| Armar las piezas a demanda | Actions → **Piezas** → Run workflow |
| Publicar una pieza a mano | Actions → **Piezas**, con `solo`, `publicar` tildado y `destino` (ambas, instagram o facebook) |
| Comprobar el token | Actions → **Redes** → Run workflow → `verificar` |

Todo esto sólo **publica** si la variable `REDES_ACTIVAS` vale `Si`; con otra cosa
simula.

### La vigilancia

Un tercer trabajo de cron-job.org dispara cada 30 minutos el workflow
**Vigilancia** (`redes/vigilar.mjs`). Revisa que la web responda y se actualice,
que las corridas de GitHub no fallen, que el reloj de Redes corra, que las
piezas fijas del día (clima y farmacia) hayan salido, y que la portada no
vuelva a mostrar lo que se pidió sacar (`REGLAS.md`). Avisa por **WhatsApp**
(`redes/whatsapp.mjs`, CallMeBot, secretos `WHATSAPP_TELEFONO` y
`WHATSAPP_APIKEY`; **funciona desde el 25/09**) una vez cada 6 horas por
problema, y a las 21 manda un resumen "todo bien". También avisa 30 días antes
de que venzan el token de GitHub y el dominio. Cada lunes, la **Auditoría** (`redes/auditar.mjs`) mide
las imágenes publicadas. Detalle en `INFRAESTRUCTURA.md`.

### Lo que pasó con el bloqueo de Meta (22 al 24/09/2026)

Meta bloqueó la API de la cuenta de desarrollador por "actividad inusual": todas
las llamadas devolvían `API access blocked` (código 200, `OAuthException`) y
la pantalla "Confirmar cuenta" fallaba. Era una falla de la plataforma que
afectó a muchas cuentas (hay decenas de reportes públicos desde julio). Se
resolvió el 24/09 confirmando la cuenta; se prendieron de nuevo los workflows
**Redes** y **Piezas** y se verificó el token.

**Ojo con cron-job.org:** cuando un trabajo falla varias veces seguidas
(por ejemplo porque el workflow de GitHub estaba apagado), cron-job.org lo
**desactiva solo**. El 24/09 hubo que volver a activar dos (Actualizar la
web y el reloj de Redes). Si algo deja de salir, es lo primero que hay que
mirar (https://console.cron-job.org/jobs); los pasos completos están en
"Si algo dejó de salir", en `EMPEZAR-ACA.md`.

**Los subtítulos** de las piezas siguen la voz palabra por palabra
(`reels/tiempos.mjs`). Se ubican a partir de las pausas del audio y del peso en
sílabas (los números se cuentan como los dice la voz: "715" son 6 sílabas).
Medido contra la voz de Edge, que trae el tiempo exacto de cada palabra, el error
medio es de 0,1 a 0,2 segundos. El texto va en tinta, sin halo.

### El primer mes (plan de septiembre, histórico)

El plan original era: semana 1, existir (clima y farmacia todos los días);
semana 2, que nos encuentren (agenda del fin de semana los jueves, etiquetar
lugares, escribirle a las instituciones con el mensaje de
`ingesta/agenda.mjs`); semana 3, probar formatos; semana 4, medir y ajustar
los pesos de `ingesta/fuentes.mjs`. Lo de las tres primeras semanas ya corre
solo o cambió (los podcasts reemplazaron a las noticias sueltas). Lo que sigue
vigente es medir con números: `PENDIENTES.md`, secciones A y D.

### El tono y la voz

Todo lo que tiene que ver con **cómo suenan y qué dicen las piezas** (la locutora,
los saludos por horario, cuándo se dice la dirección, los largos, una ficha por
pieza) está en **[`CRITERIO-REDES.md`](CRITERIO-REDES.md)**, el documento único de
las redes. Acá quedan los horarios y la infraestructura. El tono de las notas es
el de la web (`CRITERIO-EDITORIAL.md`, secciones 1 y 4).

### Lo que hay que decir siempre

En el pie de la web (y, más corto, en la bio de las dos cuentas):

> Los resúmenes los escribe una inteligencia artificial y se verifican
> automáticamente contra la fuente original, que queda enlazada; lo sensible
> lo revisa una persona antes de salir. Las voces de los videos también son
> de IA.

(Es el texto del pie de la web desde el 25/09. Antes decía "con revisión
humana", y ninguna nota la había tenido. Las biografías cortas están en
`PERFILES.md`.)

No es humildad: es lo que evita que el día que alguien lo descubra parezca que
lo estábamos escondiendo.

## 4. Cómo está conectado, y lo que falta

### Lo conectado

- **Instagram** `@radarbalcarce`: cuenta profesional (Negocio), vinculada a la
  página de Facebook.
- **Página de Facebook** "Radar Balcarce". Ojo con el ID: el de la API de Meta
  es **`1254237411116171`** (Configuración del negocio → Páginas →
  Identificador). El número de la dirección `facebook.com/profile.php?id=…`
  (61594865361170) es el del perfil de la página y Graph lo rechaza.
- **App de Meta** "Radar Balcarce Publicador" (ID `2302218363874399`), en el
  portfolio comercial "Radar Balcarce". Casos de uso: Threads, Instagram y
  Páginas. Permisos: `pages_manage_posts`, `pages_read_engagement`,
  `pages_show_list`, `instagram_basic`, `instagram_content_publish`.
- **Usuario del sistema** `publicador-radar`, con la página (Contenido y
  Estadísticas), el Instagram (Contenido y Estadísticas) y la app (Desarrollar
  app). Su token **no vence** y está guardado como el secreto `META_TOKEN` en
  GitHub. No hizo falta la revisión de Meta que se preveía: en modo desarrollo,
  con cuentas propias, los permisos andan.

### Secretos y variables (GitHub → Settings → Secrets and variables → Actions)

La lista completa (Cloudflare, WhatsApp, etc.) está en `INFRAESTRUCTURA.md`. Las de redes:

| Nombre | Tipo | Para qué |
|---|---|---|
| `META_TOKEN` | Secreto | Publicar en Facebook e Instagram |
| `GEMINI_API_KEY_REDES` | Secreto | Voces de las piezas (paga) |
| `REDES_ACTIVAS` | Variable | El interruptor: `Si` publica, otro valor sólo simula |

En la PC, en el archivo `.env`: `GEMINI_API_KEY_REDACCION` para redactar las
notas (acepta el nombre viejo `GEMINI_API_KEY`) y, si se quieren armar reels en
la PC, `GEMINI_API_KEY_REDES`. **Van separadas a propósito**: cada clave tiene
su propio cupo y así los reels no le sacan cuota a la redacción. La de redes no
tiene alternativa: si falta, los reels no arrancan. Los tokens y las claves
**nunca** se pegan en un chat ni se escriben en el código.

### Dónde está el código

| Archivo | Qué hace |
|---|---|
| `redes/meta.mjs` | Habla con Meta: posteo, subida de video, verificación. El token viaja en un encabezado, nunca en la dirección |
| `redes/elegir.mjs` | Qué se publica: reglas de Facebook, reels, historias, podcast, interruptor |
| `redes/piezas.mjs` | Qué pieza le toca a cada hora y hasta cuándo vale (`VENTANAS`; 2 horas si no tiene una propia) |
| `redes/publicar-piezas.mjs` | Publica en Instagram y guarda el libro después de cada una |
| `redes/prompt-redes.mjs` | Lee de `CRITERIO-REDES.md` la identidad ("Radar Balcarce", `radarbalcarce.com`) y las instrucciones de la voz |
| `redes/guiones.mjs` | El libro de recursos: saludos, aperturas, conectores, cierres y guiones del clima, la farmacia, lo semanal y los podcasts, con variedad por fecha; y `revisarTexto`, las reglas de toda pieza |
| `redes/auditoria-voz.mjs` y `reels/auditar-voz.mjs` | La auditoría de voz (clips de prueba, transcripción y juicio) |
| `redes/publicar.mjs` | El programa: `--verificar`, `--facebook`, `--enlaces` (la dirección pública de los podcasts), `--piezas [--sin-horario]` |
| `redes/datos.mjs` | Arma los datos del día desde la web, para generar sin panel |
| `reels/claves.mjs` | Las dos claves de Gemini |
| `redes/reloj.mjs` | Dice qué pieza toca a esta hora (sin instalar nada) |
| `redes/formatos.mjs` | Las medidas de imágenes y videos de cada red (`FORMATOS.md`) |
| `redes/auditar.mjs` | Auditoría semanal de lo publicado (`auditoria.yml`) |
| `redes/vigilar.mjs` | El vigilante: revisa y avisa por WhatsApp (`vigilancia.yml`) |
| `redes/whatsapp.mjs` | Manda el aviso por CallMeBot |
| `reels/tiempos.mjs` | Cuándo arranca cada palabra del subtítulo |
| `.github/workflows/redes.yml` | **El reloj**: Facebook + Instagram, varias corridas por día |
| `.github/workflows/piezas.yml` | Armar y publicar piezas a mano |

### Lo que falta

Ver [`PENDIENTES.md`](PENDIENTES.md), secciones A (redes y automatización) y B
(perfiles y medidas).

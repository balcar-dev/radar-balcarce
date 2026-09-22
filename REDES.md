# Redes, marketing y competencia

## 1. Qué hace la competencia (revisado el 18/09/2026)

Los tres medios de Balcarce con web propia, mirados el mismo día:

| | El Diario | Punto Nueve | La Vanguardia |
|---|---|---|---|
| Peso de la portada | 256 KB | 370 KB | 55 KB |
| Publicidad | Google AdSense | Google Ads | Sin avisos |
| Clima | Sí | No | Sí |
| Farmacia de turno | Sí | Sí | Sí |
| Video | Sí | Sí (En Vivo) | No |
| Agenda de eventos | No | No | No |

Secciones que tienen los tres: Balcarce, Policiales, Deportes, Automovilismo,
Agro/Rural, Actualidad.

**La Vanguardia** es el único que monetiza sin banners: vende *Edictos*,
*Inmobiliarias*, *Profesionales* e *Infocampo*. Son secciones pagas, no
publicidad intrusiva. Es el modelo más parecido al que nos sirve.

### Los huecos que nadie llena

1. **Agenda de eventos.** Ninguno de los tres tiene un calendario. Nosotros lo
   sacamos de la API del municipio y se actualiza solo. Es lo más fácil de
   defender: el que quiere saber qué hay para hacer el fin de semana hoy no
   tiene dónde mirar.
2. **Automovilismo que no sea local.** Cubren el TC y el zonal, pero no F1 ni
   MotoGP. En la ciudad de Fangio, con autódromo propio, eso es raro. Ya
   sumamos Motorsport.com en castellano.
3. **Deportes que no son fútbol.** Rugby, hockey, ciclismo, running, atletismo:
   aparecen sólo cuando gana alguien de acá. Sumamos La Nación · Deportes.
4. **Tecnología e IA.** Nadie. Es la sección que nos puede dar identidad propia
   y traer un lector más joven.
5. **Velocidad.** Sus portadas pesan 256 y 370 KB por los banners. La nuestra
   es HTML estático. En un celular con señal mala de la zona rural, eso se nota.

### Dónde no podemos competir todavía

Tienen algo que no se compra: **periodistas en la calle**. Punto Nueve
transmite en vivo. El Diario cubre el Concejo Deliberante. Nosotros hoy
resumimos lo que ellos averiguan. Mientras sea así, la regla de citar y
enlazar la fuente no es sólo legal: es lo que hace que la relación sea
sostenible en un pueblo donde todos se conocen.

## 2. Publicidad: tres avisos y ni uno más

La maqueta está en el lienzo de diseño, artboard "Dónde irían los avisos".

- **Aviso 1** — después de la nota de apertura. El único que interrumpe la
  lectura, y lo hace una sola vez.
- **Aviso 2** — al lado del clima y la farmacia de turno. Es el mejor lugar del
  sitio: lo que la gente mira todos los días, sin interrumpir nada. Es el que
  se cobra más caro.
- **Aviso 3** — abajo de todo. Vale poco. Sirve para regalarlo los primeros
  meses y que un comercio se anime.

Reglas que no se negocian:

- Vendidos a comercios de Balcarce, no traídos por una red publicitaria.
  Sabemos quién es cada aviso.
- Quietos: no parpadean, no se expanden, no persiguen el scroll.
- Grises y con tipografía chica. **Nunca el rojo de la marca.** Si el aviso se
  ve igual que una nota, la gente deja de distinguir qué es qué.
- Dicen "Espacio publicitario" arriba, siempre.
- Son texto y un logo, no imágenes pesadas.

Nunca: pop-ups, videos que arrancan solos, publinotas sin aclarar que lo son,
avisos de apuestas o de préstamos.

## 3. Las redes: qué sale, cómo y cuándo

*Aplicado y probado el 21/09/2026.*

### La regla de fondo

**Lo que sale a Instagram es siempre video con voz**: historias y reels.
Instagram no acepta una foto si no está en una dirección pública de internet,
y el video sí se le puede entregar directo. Como no queremos alojar archivos
en ningún lado, todo va en video. Por eso el feed de Instagram con fotos está
apagado (`feedPorDia: 0` en `reels/plan.mjs`).

**Facebook recibe dos cosas.** Por un lado, posteos con enlace: la tarjeta con la
imagen y el titular la arma sola con la imagen de NUESTRA página
(`web/lib/tarjeta.js`), nunca la foto de otro medio. Por otro, **los mismos
videos de Instagram como historias y reels de la página**, a la misma hora.

### Qué sale hoy y a qué hora (hora de Balcarce)

**Facebook, automático.** Cada 30 minutos (a los :10 y :40) el sistema mira
la portada y publica **una** nota si cumple todo esto:

| Regla | Valor |
|---|---|
| Relevancia | 75 o más |
| Antigüedad en la web | entre 15 minutos y 8 horas (el enlace tiene que existir) |
| Sección | nunca **Política** ni **Policiales**: esas las decide una persona |
| Horario | entre las 8 y las 22 |
| Tope | **5 por día**, con 90 minutos entre una y otra (conservador a propósito: la web publica unas 100 notas por día y en Facebook sería ruido) |
| Repetición | una nota sale una sola vez (lo garantiza `web/data/redes.json`) |

El texto lleva el titular, el copete y `Fuente: …`, más `Resumen hecho con IA`
cuando la redactó la IA. La regla de que cada nota diga quién la escribió
vale también afuera del sitio.

**Historias y reels: Instagram y la página de Facebook, el mismo video.** Estas
son las piezas del día y su horario:

| Hora | Pieza | Tipo | Qué es |
|---|---|---|---|
| 07:30 | El clima de hoy | Historia | Todos los días |
| 10:00 | Noticia 1 | Reel | La de más gancho de Balcarce |
| 10:40 | Nota 1 | Historia | |
| 12:40 | Nota 2 | Historia | |
| 14:40 | Nota 3 | Historia | |
| 15:00 | Noticia 2 | Reel | De otra sección que la primera |
| 19:00 | Farmacia de turno | Historia | Sólo dice cuál es la de turno |
| 20:00 | Cómo sigue el día | Historia | Clima de la noche |
| 20:30 | El repaso del día | Reel | El podcast: 4 titulares dichos con la voz |
| Martes 11:00 | Teléfonos útiles | Historia | Una vez por semana |
| Jueves 18:00 | Qué hacer el fin de semana | Historia | Sólo si hay eventos cargados |

Son **3 reels por día** (2 noticias y el podcast) y **6 historias** (clima
mañana, clima noche, farmacia y 3 de notas), más las semanales.

Cómo se eligen (todo en `redes/elegir.mjs`, con pruebas):

- Los reels de noticias son de Balcarce, con relevancia 78 o más, de
  secciones distintas y sin repetir el mismo tema. "Gancho" es lo que se mide
  sin inventar: relevancia y que sea local.
- Las historias de notas tienen relevancia 62 o más y no repiten lo que ya es
  reel.
- El mismo tema contado por dos medios cuenta una sola vez (por ejemplo, el
  mismo partido con dos titulares).
- El podcast es un repaso de los titulares ya publicados, sin IA: no puede
  inventar nada. Si un día hay menos de dos noticias para repasar, no sale.
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

**Por qué hay tantas corridas programadas.** El planificador de GitHub **no es
puntual**: en este repositorio dejó hasta cinco horas entre dos corridas que
debían distar treinta minutos. Por eso hay dos o tres pasadas alrededor de cada
horario, PERO desde el 21/09 lo que dispara el reloj en la práctica es un
servicio externo (ver más abajo), porque el planificador de GitHub solo no
alcanzaba. Cada pieza tiene una ventana (`VENTANAS` en `redes/piezas.mjs`): si una corrida llega tarde,
todavía alcanza. Lo que no caduca rápido dura más: la farmacia, el clima de la
noche y el podcast valen hasta la medianoche; el clima de la mañana, hasta las
11:30; una historia de nota, 3 horas. Ninguna cruza la medianoche. Si la ventana
se cierra sin que salga, esa pieza se pierde por hoy.

**El disparador real es externo, desde el 21/09.** El 21/09 el planificador de
GitHub no ejecutó ni una corrida programada de esta cola en toda la
tarde-noche (la farmacia de las 19:00 se perdió y se publicó a mano). La
solución: **cron-job.org** llama a la API de GitHub (endpoint
`actions/workflows/redes.yml/dispatches`) cada 30 minutos, de 7 a 23 hora de
Balcarce, con `{"ref":"main","inputs":{"accion":"reloj"}}`. La cuenta de
cron-job.org es de `radarbalcarce@gmail.com`; el token de GitHub que usa es de
`balcardev@gmail.com`, personal (Settings → Developer settings → Personal
access tokens → Fine-grained), limitado a este repositorio, sólo permiso
Actions en lectura y escritura, vence el 21/09/2027 (**hay que renovarlo antes**
y actualizar el encabezado `Authorization` en cron-job.org). El workflow ya no
tiene `schedule` propio: si cron-job.org falla, el único respaldo es que el
reloj también arranca cuando termina "Actualizar la web" (`workflow_run`).

**Consecuencia honesta:** una pieza puede salir bastante después de su hora si
GitHub se demora, y si se demora más que su ventana se pierde. Si algún día hace falta puntualidad exacta, la solución es
que un servicio externo gratuito dispare el workflow a la hora justa (el
workflow ya acepta la acción `reloj` a mano para eso). Necesita una cuenta en ese
servicio y un token de GitHub.

| Cosa | Estado |
|---|---|
| Posteos en Facebook | Automático |
| Historias y reels en Instagram y en la página de Facebook | Automático (reloj) |
| Armar las piezas a demanda | Actions → **Piezas** → Run workflow |
| Publicar una pieza a mano | Actions → **Piezas**, con `solo`, `publicar` tildado y `destino` (ambas, instagram o facebook) |
| Comprobar el token | Actions → **Redes** → Run workflow → `verificar` |

Todo esto sólo **publica** si la variable `REDES_ACTIVAS` vale `Si`; con otra cosa
simula.

**Los subtítulos** de las piezas siguen la voz palabra por palabra
(`reels/tiempos.mjs`). Se ubican a partir de las pausas del audio y del peso en
sílabas (los números se cuentan como los dice la voz: "715" son 6 sílabas).
Medido contra la voz de Edge, que trae el tiempo exacto de cada palabra, el error
medio es de 0,1 a 0,2 segundos. El texto va en tinta, sin halo.

### El primer mes

**Semana 1 — existir.** Abrir Instagram y Facebook. Publicar clima y farmacia
todos los días sin falta: es lo que hace que alguien te empiece a mirar. Tres
o cuatro notas locales por día.

**Semana 2 — que nos encuentren.** Sumar la agenda del fin de semana como
historia el jueves. Etiquetar a los lugares (Teatro Municipal, Museo, el
Cerro). Escribirle a las instituciones que organizan cosas: el mensaje ya está
escrito en `ingesta/agenda.mjs`.

**Semana 3 — probar formatos.** Un reel de automovilismo y uno de agenda.
Mirar cuál funciona. Empezar la sección de tecnología.

**Semana 4 — medir y decidir.** Con números reales de Instagram, ver qué
sección rinde y ajustar los pesos en `ingesta/fuentes.mjs`.

### El tono

El mismo que en la web: informar, no gritar. Sin "IMPACTANTE", sin "MIRÁ LO
QUE PASÓ", sin cebar el clic. En un pueblo el que exagera se quema rápido.

### Lo que hay que decir siempre

En la bio de las dos cuentas, y en el pie de la web:

> Resumimos lo que publican los medios de Balcarce, siempre con el enlace a la
> nota original. Algunos textos y las voces de los videos se producen con
> inteligencia artificial, con revisión humana.

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
| `redes/piezas.mjs` | Qué pieza le toca a cada hora, con ventana de 2 horas |
| `redes/publicar-piezas.mjs` | Publica en Instagram y guarda el libro después de cada una |
| `redes/publicar.mjs` | El programa: `--verificar`, `--facebook`, `--piezas [--sin-horario]` |
| `redes/datos.mjs` | Arma los datos del día desde la web, para generar sin panel |
| `reels/claves.mjs` | Las dos claves de Gemini |
| `redes/reloj.mjs` | Dice qué pieza toca a esta hora (sin instalar nada) |
| `reels/tiempos.mjs` | Cuándo arranca cada palabra del subtítulo |
| `.github/workflows/redes.yml` | **El reloj**: Facebook + Instagram, varias corridas por día |
| `.github/workflows/piezas.yml` | Armar y publicar piezas a mano |

### Lo que falta

1. ✅ **Disparador externo — hecho el 21/09/2026.** Queda pendiente sólo renovar el
   token antes de septiembre de 2027.
2. **Threads**: pide su propio token, no sirve el de Meta.
3. **La categoría de Instagram** sigue en "Blog personal" (no se ve en el
   perfil). Se cambia desde el celular a "Sitio web de noticias y medios de
   comunicación".
4. **La agenda de la semana en historia** sólo se arma en la PC, porque
   `agenda.json` no está en GitHub.
5. **Notas más largas**, con el texto completo de las fuentes.
6. Mirar los primeros días cómo salen las piezas y ajustar horarios y cantidad.
7. **Reescribir las biografías** de Instagram y Facebook, más cortas y sin que la IA
   sea la protagonista (la transparencia se mantiene en una línea). Detalle en
   `NOTAS.md` § 11.
8. **Hashtags**: hoy las piezas salen sin ninguno. Probar 2 o 3 por dos semanas y
   comparar el alcance.
9. **Posicionamiento** en Google, redes y buscadores con IA: lista completa en
   `NOTAS.md` § 11.

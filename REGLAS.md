# Reglas permanentes

*Actualizado el 25/09/2026.* Lo que Hernán y Andrés pidieron que **se cumpla
siempre**, junto con lo que lo vigila. Las reglas editoriales se explican
enteras en [`CRITERIO-EDITORIAL.md`](CRITERIO-EDITORIAL.md); acá está sólo la
lista y qué prueba cuida cada una. Una regla sin vigilancia se rompe sola
con el tiempo: por eso cada una dice qué prueba (`pruebas/`, corre con
`npm test` y antes de cada publicación en GitHub) o qué chequeo del vigilante
(`redes/vigilar.mjs`, cada 30 minutos, avisa por WhatsApp) la protege.

Cómo leer la columna "Qué la cuida":

- **Prueba**: si alguien rompe la regla en el código, `npm test` falla y la
  web no se publica.
- **Vigilante**: mira la web **ya publicada** y avisa si la regla se rompió
  (por ejemplo, porque cambió algo que las pruebas no ven).
- **Nada**: es una regla de criterio. Se dice sin adornos para que se note.

## La web

| # | Regla | Qué la cuida |
|---|---|---|
| 1 | **La portada no muestra la fuente arriba de los títulos** (ni en las secciones ni en los temas). La fuente sí queda en la página de cada nota, con el enlace al original. | Prueba: `pruebas/portada.test.mjs` ("la portada, las secciones y los temas no muestran la fuente arriba del título" y "la fuente sí queda en la página de cada nota"). Vigilante: `regla-fuentes` (`revisarPortada`, mira el HTML de la portada real; probado en `pruebas/vigilancia.test.mjs`). |
| 2 | **Nunca "la vimos hace…" ni "sin hora".** Si la fuente no dio la hora, no se dice nada en ese lugar. | Prueba: `pruebas/web.test.mjs` ("si la fuente no dio la hora, no se dice nada") y `pruebas/portada.test.mjs` ("una nota sin hora de la fuente no muestra nada"). Vigilante: `regla-la-vimos`. |
| 3 | **La farmacia de turno no dice hasta qué hora está.** Sólo el nombre, la dirección, el teléfono y "Cómo llegar". (El turno cambia a las 8:30, pero eso es un dato interno.) | Prueba: `pruebas/portada.test.mjs` ("la tarjeta de la farmacia no dice hasta qué hora está de turno") y `pruebas/farmacias.test.mjs` ("el turno cambia a las 8:30, pero la web NO lo dice"). Vigilante: `regla-hora-farmacia`. |
| 4 | **Las notas van de la más nueva a la más vieja.** Una nota sin hora se ordena por la primera vez que se la vio, no salta arriba de todo. La única excepción es la nota grande de arriba, que es la de más puntaje y de Balcarce. | Prueba: `pruebas/portada.test.mjs` ("el resto va de la más nueva a la más vieja", "una nota sin hora se ordena por cuándo apareció", "al generar los datos…") y `pruebas/web.test.mjs` ("la lista sigue yendo por hora", "la nota grande es la de más puntaje"). Vigilante: nada. |
| 5 | **El cuerpo de la nota es la nota desarrollada y distinta del copete** (pirámide invertida: título, copete, cuerpo). Un cuerpo que repite el copete se rechaza; si trae un dato que no cuadra se sacan esas oraciones, y si no alcanza se reintenta una vez diciéndole qué falló. | Prueba: `pruebas/cuerpo.test.mjs` ("un cuerpo que repite el copete se rechaza", "…empieza con el mismo texto del copete", "si la primera respuesta inventa un dato, se reintenta con la corrección"). Vigilante: `pocos-cuerpos` (avisa si menos del 35 % de las notas de las últimas 24 horas tienen cuerpo; **no** mide que sea distinto del copete: eso lo hace la prueba). |
| 6 | **Lo que escribe la IA se verifica contra la fuente.** Si inventó un número, un nombre, un día o una cita, no se usa. Desde el 25/09 el título, la bajada, el guion y el texto para redes tampoco pueden decir "en vivo", "minuto a minuto" ni "en directo" (`pruebas/verificar.test.mjs`). Desde el 25/09 también las claves, qué se sabe, qué falta confirmar, lo que aportó cada fuente y el texto para redes, cada una por su lado (la que falla se descarta sola). Un dato que sólo está en una nota anterior (antecedente) no puede aparecer como de hoy. El nivel de verificación lo calcula el código, no la IA. | Prueba: `pruebas/verificar.test.mjs` (número, nombre, día, cita, delito como hecho, negaciones), `pruebas/reescritura.test.mjs` y `pruebas/editor.test.mjs` (partes nuevas, antecedentes, nivel de verificación, texto para redes). |
| 7 | **Cada nota dice quién la escribió** (IA o fuente, automática o revisada), y el sitio no promete una revisión que no hubo. | Prueba (desde el 25/09): `pruebas/seo-paginas.test.mjs` ("el autor de los datos estructurados dice lo mismo que la firma de la nota", "no volvemos a prometer una revisión humana que no hay"). La firma visible es una línea corta (`firmaCorta`) en el renglón del desplegable de fuentes (`CRITERIO-EDITORIAL.md`, sección 10). |
| 8 | **Nunca la foto de otro medio.** Va una placa propia con el titular. | Prueba indirecta: `pruebas/redes.test.mjs` ("la imagen del posteo de Instagram es la tarjeta propia… no una foto ajena"). El resto es criterio. |
| 9 | **Nunca identificar a un menor ni a una víctima.** El semáforo rojo lo frena, y desde el 25/09 lee también el texto completo de la fuente y lo que escribió la IA. La instrucción de la IA lo prohíbe. La lista no se toca sin preguntar. | Prueba: `pruebas/semaforo.test.mjs` (**cada término** de las listas roja y amarilla, con su ejemplo; también si está en el resumen y no en el título), `pruebas/reescritura.test.mjs` ("las reglas de la IA prohíben identificar a un menor o a una víctima", "si lo que escribió la IA da rojo o amarillo, no se usa…", "lo que contaron los otros medios también pasa por el semáforo"), `pruebas/notas.test.mjs` y `pruebas/fuentes.test.mjs`. |
| 20 | **Un enlace que ya circula no se rompe.** La dirección de una nota queda fija desde la primera publicación, aunque la IA cambie el titular; la página dura 180 días aunque la nota salga de la portada; la 404 rescata direcciones viejas. Lo que pasa a rojo o se bloquea sí pierde la página. | Prueba: `pruebas/archivo.test.mjs` ("el enlace publicado en Facebook sigue andando cuando la IA cambia el titular", "una nota que sale de la portada sigue teniendo página…", "lo que se bloquea después… sale del archivo"). |
| 21 | **Cada página dice cuál es su dirección** (canónico propio); sólo la portada es `/`. | Prueba: `pruebas/seo-paginas.test.mjs` ("cada página declara su propio canónico…"). |
| 22 | **Una fecha aproximada nunca se publica como confirmada.** Cada evento con página tiene fecha del municipio o una que publicó una persona desde el panel; las fiestas del calendario anual dicen "fecha a confirmar" hasta entonces. La ficha del evento dice quién la armó y no lleva texto de IA (`CRITERIO-EDITORIAL.md`, sección 8). | Prueba: `pruebas/eventos.test.mjs` ("una fiesta anual sólo se enlaza cuando hay un evento con fecha confirmada", "cada ficha dice quién la hizo…", "la entrada no se inventa") y `pruebas/agenda-panel.test.mjs` ("un evento cargado a mano nace como borrador…", "al archivo público va sólo lo que se ve en la web…"). |
| 23 | **Una nota sin cuerpo no se publica** (25/09). Una nota automática sólo va a la portada, las secciones, el feed, el sitemap y las redes si tiene cuerpo de verdad: 70 palabras o más, distinto de la bajada. Si no, queda "esperando cuerpo" (`esperandoCuerpo` en `portada.json`, y el resumen de las 21 lo dice). Un cuerpo vacío nunca cuenta como "ya hecho": la nota se vuelve a intentar, hasta tres veces. Lo que publicó una persona se respeta (el panel pide confirmarlo). Las páginas viejas sin cuerpo conservan su página pero no vuelven a las listas. | Prueba: `pruebas/cuerpo.test.mjs` ("si el cuerpo falla las dos veces, la nota NO se publica sin cuerpo", "la memoria entre corridas NO reusa un cuerpo vacío", "generar-datos no publica una nota automática sin cuerpo", "Facebook y los podcasts no toman una nota automática sin cuerpo", "cada nota se le pide a Gemini como mucho tres veces", "un dato inventado en el cuerpo se va con SU oración", "sin texto completo y con un resumen corto no se le pide nada a Gemini") y `pruebas/editor.test.mjs` ("desde el panel no se publica una nota sin cuerpo sin confirmarlo"). Vigilante: `pocos-cuerpos` y la línea "Esperando cuerpo" del resumen. |
| 24 | **El lector ve la nota, no el análisis** (25/09). En la página: título, bajada, cuerpo y un desplegable chico y cerrado "Fuentes (N)" con el nombre de cada medio y su enlace (que es la atribución). Las claves, qué se sabe, qué falta confirmar, lo que aportó cada fuente y el nivel de verificación se guardan y se ven en el panel, no en la web. | Prueba: `pruebas/editor.test.mjs` ("la página de la nota muestra sólo la nota y un desplegable cerrado…", "las fuentes del lector…", "el panel muestra el análisis interno (plegado)") y `pruebas/portada.test.mjs` ("la fuente sí queda en la página de cada nota"). |
| 25 | **Lo que no es una nota, o no está verificado, no sale solo** (25/09). La cotización del dólar (en el título) queda amarilla: se muestra en `/dolar`. Una nota con verificación BAJA (un solo medio y una denuncia o declaración de parte, o datos centrales sin confirmar) espera a una persona, como una amarilla. | Prueba: `pruebas/semaforo.test.mjs` ("una nota de la cotización del dólar no sale sola…", "lo que habla de plata pero no es la cotización sí sale") y `pruebas/editor.test.mjs` ("con verificación BAJA la nota no sale sola…"). |

| 26 | **El criterio editorial es uno solo y la IA lo lee tal cual** (25/09). `CRITERIO-EDITORIAL.md` es el único documento editorial; la instrucción de la IA sale de su sección 12, sin copia en el código, y si el archivo falta o le falta una parte la reescritura no arranca. Cada número de su tabla "Los números" es el que usa el código. | Prueba: `pruebas/criterio.test.mjs` ("la tabla… dice lo mismo que el código, fila por fila", "la IA lee la instrucción de CRITERIO-EDITORIAL.md, no de una copia en el código", "sin criterio no se escribe…", "los números que el documento repite en el texto son los de la tabla"). |
| 27 | **El enlace de cada fuente es la página de la nota original**, nunca un archivo interno del medio (25/09: las notas de Infórmese Primero enlazaban la entrada XML del feed de Blogger). El identificador de las notas no cambia. | Prueba: `pruebas/informese.test.mjs` ("el enlace de la nota es la página…", "el identificador de la nota no cambia", "al lector nunca le llega el XML de un feed…"). |

## Las redes

| # | Regla | Qué la cuida |
|---|---|---|
| 10 | **Facebook publica la nota con el enlace a la nota en nuestro sitio y SIN nombrar la fuente.** No dice "Resumen hecho con IA" (se sacó el 26/09). Lo mismo el espejo en el feed de Instagram. | Prueba: `pruebas/redes.test.mjs` ("un posteo lleva el mensaje y el enlace de nuestro sitio", "el mensaje lleva el enlace… y NO nombra la fuente", "el mensaje de Instagram es el mismo que Facebook") y `pruebas/piezas.test.mjs` ("el pie de un podcast lista cada nota con su enlace y no nombra la fuente"). Vigilante: nada. |
| 11 | **Podcasts en vez de noticias sueltas.** Tres por día (mañana, tarde y noche), con notas de temas distintos entre sí, más el clima, la farmacia y las historias fijas. Las noticias no salen de a una. | Prueba: `pruebas/piezas.test.mjs` ("el cronograma del día trae las fijas y los tres podcasts, sin historias sueltas de una nota") y `pruebas/redes.test.mjs` ("los podcasts del día no repiten notas ni temas entre sí", "un podcast con menos de dos notas no existe"). Vigilante: sólo las piezas fijas (clima y farmacia) son obligatorias; los podcasts no, porque dependen de que haya notas. |
| 12 | **Cada día, un color distinto para los podcasts** (los tres del día llevan el mismo). | Prueba: `pruebas/piezas.test.mjs` ("hay siete colores distintos", "el color cambia de un día al otro", "el color del día se cuenta con la hora de Balcarce, no la de UTC", "los podcasts del plan usan el color del día"). Definición: `colorDelDia` en `redes/piezas.mjs`. |
| 13 | **El posteo de Instagram es una imagen vertical de 1080 × 1350 (4:5)** con el texto en la zona segura del centro. Facebook, con enlace, usa la apaisada de 1200 × 630. | Prueba: `pruebas/formatos.test.mjs` (medidas y zona segura) y `pruebas/redes.test.mjs`. Vigilante: la **auditoría semanal** (`redes/auditar.mjs`, lunes) baja las imágenes publicadas y mide sus píxeles; el vigilante avisa si esa auditoría dejó de correr (`auditoria-vencida`). Ver `FORMATOS.md`. |
| 14 | **Todo lo que va a Instagram es video con voz** (historias y reels), salvo la tarjeta propia del espejo de Facebook. | Prueba: `pruebas/piezas.test.mjs` (las historias y los reels se suben como video; "las historias no llevan texto y los reels sí"). |
| 15 | **Nada sensible sale solo a las redes.** Política y Policiales esperan a una persona en TODAS las piezas, aunque en la web salgan por el semáforo. Lo que está en rojo tampoco. | Prueba: `pruebas/redes.test.mjs` ("Política y Policiales no salen solas a las redes", "…no se arman solas en ninguna pieza", "nunca entra Política ni Policiales a un podcast, ni lo que está en rojo"). |

## Cómo se trabaja

| # | Regla | Qué la cuida |
|---|---|---|
| 16 | **Claves y tokens nunca en un chat ni en el código.** Van a GitHub Secrets o al `.env` (que está en `.gitignore`). Los pega una persona. Un error nunca muestra la clave. **Importa más desde el 25/09: el repositorio es público** (se revisó el historial entero antes, sin encontrar claves). | Prueba: `pruebas/redes.test.mjs` ("el token viaja en el encabezado y nunca en la dirección", "sinToken borra el token de cualquier texto"), `pruebas/reescritura.test.mjs` y `pruebas/voz-gemini.test.mjs` (la clave de Gemini va en el encabezado), `pruebas/respaldo.test.mjs` (el respaldo del panel no copia las claves en texto plano) y `pruebas/vigilancia.test.mjs` ("un error de CallMeBot… sin la clave a la vista", "sinSecretos tapa todo"). **Ninguna prueba recorre todo el repositorio buscando claves**: lo demás es el hábito y el `.gitignore`. Si una clave se pegó alguna vez en un chat, se da por quemada y se genera otra. |
| 17 | **Todo lo que pueda ir online va online**: la web, las redes, la vigilancia y los avisos corren en GitHub y Cloudflare con la PC apagada. La excepción, por ahora, es el panel (`PANEL.md`). | Vigilante: `web-vieja`, `reloj-Actualizar la web`, `reloj-Redes` (avisan si los relojes de cron-job.org dejaron de correr). Pendiente: el panel online, en `PENDIENTES.md`. |
| 18 | **`ingesta/`, `panel/` y `redes/` no importan nada de afuera de Node.** | Prueba: `pruebas/fuentes.test.mjs` ("el motor no necesita nada instalado", "el detector de imports ve todas las formas de escribirlos"). Desde el 25/09 sigue los imports **en cadena**: antes miraba un solo nivel y no vio que el panel llegaba a `ffmpeg-static` a través de `reels/voz-gemini.mjs`. |
| 19 | **Cuando se arregla algo que estuvo mal publicado, se escribe una prueba.** | Nada automático: es una costumbre. Es la que sostiene a todas las de arriba. |

## Decisiones que siguen valiendo

No tienen prueba: son de criterio. Se decidieron una vez y no se vuelven a
discutir salvo que Hernán y Andrés lo pidan.

- **Tecnología es un sello propio.** Ningún medio de Balcarce la cubre con
  regularidad y conecta con el pueblo (el INTA Balcarce es uno de los centros
  de investigación agropecuaria más grandes del país).
- **El buzón tiene cuatro tipos**: dato, reclamo, opinión y seguimiento
  (`panel/buzon.mjs`). Un reclamo **nunca se publica de un solo lado**: se le
  pregunta a la otra parte. Una opinión va siempre firmada con nombre real.
- **Sin fúnebres** (no hay fuente oficial), **sin comentarios** y **sin
  transmisiones en vivo largas** (`docs/historico/INVESTIGACION-COMPETENCIA.md`).
- **Facebook no se raspa**: va contra sus términos. Por eso las radios que
  sólo existen en Facebook no son fuente (las que no entran y por qué:
  `docs/historico/HISTORIA.md` § 3).
- **Sin música en las piezas**: sonaba a pitido. Sólo la cortina de sonido.
- **Lo de `reels/` que depende de la red o de ffmpeg no tiene prueba** a
  propósito; la lógica pura que tenía adentro sí.

## Cuando se agrega una regla nueva

1. Escribirla acá con el número siguiente, aunque vaya en otra tabla (los
   números no se reordenan: otros documentos los citan).
2. Escribir la prueba (o el chequeo del vigilante, si lo que importa es lo
   que ve el lector en la web publicada).
3. Si es de contenido visible, sumarla a `revisarPortada` en
   `redes/vigilar.mjs` y a `pruebas/vigilancia.test.mjs`.

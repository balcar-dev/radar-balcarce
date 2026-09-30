# 10 · Las reglas y las pruebas que las cuidan

*Escrito el 28/09/2026, leyendo `CLAUDE.md` y cada archivo de `pruebas/` de
ese día, y puesto al día el 29/09 con las reglas 73 a 77 (fotos, voces,
"sensación térmica", guardia de la cooperativa). Las pruebas se corrieron el
29/09: **1.367 pruebas en 83 archivos, todas bien** (la cuenta de cada archivo,
al final). Si un documento dice otra cosa que el
código, manda el código.*

Desde el 28/09 **la lista numerada de reglas vive acá** (antes estaba en un
`REGLAS.md` aparte, que se retiró). Los números no cambian ni se reordenan:
otros documentos y comentarios del código los citan ("regla 16", "regla 20").
Para cada regla está **qué prueba la cuida y qué pasa si se rompe**, y al final
el mapa completo de `pruebas/`. Qué dice cada regla en detalle está en el
documento de su área: `docs/02-INGESTA.md`, `docs/03-SELECCION.md`,
`docs/04-REDACCION.md`, `docs/05-FOTOS.md`, `docs/06-WEB.md`,
`docs/07-REDES.md`, `docs/08-INFRAESTRUCTURA.md`, `docs/09-PANEL.md`,
`docs/11-OPERACION.md`. El criterio editorial entero es uno solo:
`CRITERIO-EDITORIAL.md`.

---

## En una frase

Cada regla importante tiene al lado un programa chico que la pone a prueba con
datos inventados (sin salir a internet); `npm test` corre todos, y si uno solo
falla, GitHub **no actualiza la web**: prefiere dejar la de antes antes que
publicar algo roto.

---

## El recorrido, paso a paso

### 1. Qué es una prueba, para quien no lee código

Cada archivo `pruebas/algo.test.mjs` tiene varias líneas del estilo
`test('una nota sin cuerpo no se publica', …)`. La frase entre comillas es
**la regla escrita en castellano**; lo que sigue arma un caso de mentira (una
nota inventada, una respuesta de Meta simulada, un reloj puesto en UTC) y
comprueba que el código haga lo que dice la frase. Si el código cambia y deja
de cumplirla, esa prueba "falla" y dice cuál fue.

Ninguna prueba sale a internet, publica nada ni gasta cupo de Gemini: Meta,
Gemini, Groq, DolarApi, Open-Meteo y CallMeBot se simulan. Varias usan casos
**reales** que salieron mal (títulos, direcciones y horarios de verdad), para
que el mismo error no pueda volver.

### 2. Cómo se corren

- **En la PC:** desde la carpeta del proyecto, `npm test`. Es
  `node --test "pruebas/*.test.mjs"` (`package.json`): corre todos los
  archivos que terminan en `.test.mjs`. Hace falta haber instalado una vez
  las dependencias de la raíz y de `web/` (`npm install` en cada una): algunas
  pruebas cargan partes de `reels/` y de `web/lib/` que las usan.
- **Un solo archivo:** `node --test pruebas/archivo.test.mjs`.
- **En GitHub:** el workflow "Actualizar la web" (`actualizar.yml`) instala
  todo y corre `npm test` **antes** de salir a buscar noticias. Es el único
  workflow que corre las pruebas.
- **Regla de trabajo (`CLAUDE.md`):** correr `npm test` **siempre antes de
  commitear**.

Dos archivos de `pruebas/` no son pruebas sino material que usan otras:
`cuerpo-de-prueba.mjs` (un cuerpo de nota de más de 70 palabras que pasa el
verificador contra cualquier fuente) y `libro-real-24-25-09.json` (un pedazo del
libro de redes real del 24 y 25/09).

### 3. Qué pasa cuando una falla

1. **En la PC:** `npm test` termina con "fail N" y el nombre de la prueba. No
   se commitea hasta arreglarlo.
2. **En GitHub:** "Actualizar la web" se corta en el paso "Probar que nada se
   rompió". No se buscan noticias, no se escribe `portada.json`, no se
   compila, no se sube nada, y "Cloudflare Pages" no arranca (sólo corre
   cuando "Actualizar la web" termina bien). **La web que está en línea sigue
   como estaba.**
3. **El aviso:** el vigilante (`redes/vigilar.mjs`, cada 30 minutos) avisa por
   WhatsApp que una corrida falló (con cuántas de las últimas fallaron; tres
   seguidas es grave) y, a los 100 minutos sin actualizarse
   (`LIMITES.minutosSinActualizar`), que "la web no se actualiza hace N horas".
4. **Lo que sigue andando:** las redes (`redes.yml`, `piezas.yml`) no corren
   las pruebas: siguen publicando con la última `portada.json` que quedó.

### 4. Cómo se agrega una regla

1. Escribirla en este documento, en la tabla de su tema, con **el número
   siguiente** (hoy, 89), aunque vaya en otra tabla: los números no se
   reordenan.
2. Escribir la prueba en el archivo del área (la tabla de abajo dice cuál) o en
   uno nuevo con un nombre que diga qué cuida.
3. Si es algo que ve el lector en la web publicada, sumarlo también al
   vigilante (`revisarPortada` en `redes/vigilar.mjs` y su prueba en
   `pruebas/vigilancia.test.mjs`).
4. Si es un número del criterio, va en `ingesta/criterio.mjs` **y** en la
   tabla de `CRITERIO-EDITORIAL.md`: `pruebas/criterio.test.mjs` controla que
   digan lo mismo.

---

## Las reglas que no se negocian (`CLAUDE.md`)

| Regla | Qué prueba la cuida | Si se rompe |
|---|---|---|
| **`ingesta/`, `panel/` y `redes/` no importan nada de afuera de Node** | `fuentes.test.mjs`: "el motor no necesita nada instalado" (sigue los imports en cadena) y "el detector de imports ve todas las formas de escribirlos"; `redes-criterio.test.mjs`: "los módulos de redes/ nuevos no importan nada de afuera de Node" | Falla `npm test`. Si pasara igual, "Actualizar la web" o el panel se caerían por "Cannot find package" (pasó dos veces) |
| **Cuando se arregla algo mal publicado, se escribe una prueba** | Ninguna: es costumbre. Ver "La regla de la prueba después del error" | El error puede volver sin que nadie se entere |
| **El criterio editorial es uno solo** (`CRITERIO-EDITORIAL.md`; la IA lee su § 12 tal cual; los números en `ingesta/criterio.mjs`) | `criterio.test.mjs` (las 10): la tabla "Los números" dice lo mismo que el código fila por fila; la IA lee la instrucción del documento; sin el documento no se escribe; los números dichos en palabras son los de la tabla; las frases de relleno son las mismas en código, documento e instrucción; el panel muestra el criterio del archivo | Falla `npm test`; si faltara el documento, la reescritura no arranca (a la vista) |
| **Nunca identificar a un menor ni a una víctima** (el semáforo rojo; la lista no se toca sin preguntar) | `semaforo.test.mjs` (**cada término** de las listas roja y amarilla, también en el resumen); `reescritura.test.mjs`: "las reglas de la IA prohíben identificar a un menor o a una víctima", "si lo que escribió la IA da rojo o amarillo, no se usa…", "lo que contaron los otros medios también pasa por el semáforo", "lo ya publicado que hoy da rojo deja de salir…"; `editor.test.mjs`: "las partes nuevas pasan por el semáforo…"; `zona.test.mjs`: "en el artículo completo… un chico sí"; `agenda.test.mjs`: "el semáforo rojo también mira la agenda…"; `archivo.test.mjs`: "lo que se bloquea después (o el semáforo pasa a rojo) sale del archivo y pierde la página" | Falla `npm test`. Es la regla más grave: por eso cada término tiene su propia prueba |
| **Nunca una marca de agua ni el nombre de otro medio adentro de una imagen** | `placas.test.mjs`: "ninguna placa del plan nombra a un medio ni lleva la fuente adentro", "la placa sin foto… no nombra otro medio", "tarjeta: la foto sale del banco propio y el crédito nunca se dibuja adentro"; `fotos.test.mjs`: "elegirFoto: Gemini elige una candidata sin marca", "…si TODAS tienen marca, ahí sí no se elige ninguna"; `fotos-notas.test.mjs`: "la página de la nota muestra la foto sólo si hay, con el crédito en el epígrafe, nunca en la imagen"; `redes.test.mjs`: "el espejo en Instagram lleva el crédito de la foto al pie, nunca adentro de la imagen" | Falla `npm test`. Que una foto elegida por la IA no tenga marca lo decide la IA: la prueba cuida la regla del código, no el ojo de la IA (`docs/05-FOTOS.md`) |
| **Las fotos (27/09):** foto ajena sólo sin marca, con el crédito en la cita y guardada en el banco propio; Policiales sólo con foto oficial | Las de arriba, más `fotos-notas.test.mjs`: "elegiblePorSeccion: Policiales sólo con una fuente oficial…", "elegirFotosNuevas: una nota de Policiales sin fuente oficial no se pregunta", "el workflow… sube banco-fotos.json y las fotos guardadas"; `arreglos-28-09.test.mjs`: el crédito de Wikimedia con autor y licencia; `redes.test.mjs`: "la imagen del posteo de Instagram es la tarjeta propia y VERTICAL… no una foto ajena" | Falla `npm test` |
| **Lo que escribe la IA se verifica contra la fuente** | `verificar.test.mjs` (43: número, nombre, sigla, día, cita, delito dicho como hecho y bien atribuido, negaciones, "en vivo", Balcarce de más, relleno, localía inventada); `cuerpo.test.mjs`; `editor.test.mjs` (cada parte nueva por separado, antecedentes); `estilo.test.mjs` (título en pasado, ganchos, tildes, "este viernes") | Falla `npm test`. Si el verificador dejara pasar un invento, la nota saldría con el dato falso |
| **Cada nota dice quién la escribió** | `seo-paginas.test.mjs`: "el autor de los datos estructurados dice lo mismo que la firma de la nota", "la firma que ve el lector es una línea corta…", "no volvemos a prometer una revisión humana que no hay"; `notas-propias.test.mjs`: "las notas propias firman como Radar Balcarce…"; `eventos.test.mjs`: "cada ficha dice quién la hizo en UNA línea corta…"; `arreglos-28-09.test.mjs`: lo corregido a mano firma "Revisada por la redacción" | Falla `npm test` |
| **Política y Policiales esperan a una persona en TODAS las piezas de redes** | `redes.test.mjs`: "Política y Policiales no salen solas a las redes", "…no se arman solas en ninguna pieza", "nunca entra Política ni Policiales a un podcast, ni lo que está en rojo"; `notas-propias.test.mjs`: "un repaso con Política o Policiales… no se arma"; `contrato.test.mjs`: "candidatas: no cuenta lo de Política y Policiales…" | Falla `npm test` |
| **Todo lo que va a Instagram es video con voz** (salvo la tarjeta del espejo de Facebook) | `piezas.test.mjs`: "los reels van como reel y lo demás como historia", "las historias no llevan texto y los reels sí", "un reel también se sube como historia…" | Falla `npm test` |
| **Tokens y claves nunca en un chat ni en el código** | `redes.test.mjs`: "el token viaja en el encabezado y nunca en la dirección", "sinToken borra el token de cualquier texto", "un error de Meta llega sin el token adentro…"; `reescritura.test.mjs` y `voz-gemini.test.mjs`: la clave de Gemini va en el encabezado; `meta-tiempo.test.mjs`: el corte se informa sin el token; `respaldo.test.mjs`: "no copia las claves en texto plano ni el secreto de las sesiones"; `vigilancia.test.mjs`: "sinSecretos tapa todo…", los errores de CallMeBot sin la clave; `vigilancia-estadisticas.test.mjs`: "lo que se guarda es sólo números agregados: nada de tokens" | Falla `npm test`. **Ninguna prueba recorre el repositorio buscando claves pegadas**: eso lo cuidan la costumbre y el `.gitignore`. El repositorio es público: una clave pegada se da por quemada |
| **Sin cuerpo no se publica** (70 palabras, hasta tres intentos; lo de una persona se respeta, pidiendo confirmación) | `cuerpo.test.mjs` (30), entre ellas "tieneCuerpo: 70 palabras o más…", "generar-datos no publica una nota automática sin cuerpo y cuenta las que esperan", "cada nota se le pide a Gemini como mucho tres veces…", "Facebook y los podcasts no toman una nota automática sin cuerpo"; `editor.test.mjs`: "desde el panel no se publica una nota sin cuerpo sin confirmarlo…"; `notas-propias.test.mjs`: las propias con la regla de cuerpo; `archivo.test.mjs`: las correcciones con cuerpo cuentan | Falla `npm test`. Si se rompiera, volverían las notas de título y bajada solos (el 25/09 eran 42 de 89) |
| **El lector ve la nota, no el análisis** (título, bajada, cuerpo y "Fuentes (N)" cerrado; verificación BAJA y la cotización del dólar no salen solas) | `editor.test.mjs`: "la página de la nota muestra sólo la nota y un desplegable cerrado…", "las fuentes del lector…", "el panel muestra el análisis interno (plegado)…", "con verificación BAJA la nota no sale sola…"; `semaforo.test.mjs`: "una nota de la cotización del dólar no sale sola…"; `portada.test.mjs`: "la fuente sí queda en la página de cada nota" | Falla `npm test` |

### "Cosas que muerden" de `CLAUDE.md` que también tienen prueba

| Qué | Prueba |
|---|---|
| La dirección de una nota no cambia | `archivo.test.mjs` ("el enlace publicado en Facebook sigue andando cuando la IA cambia el titular" y 8 más), `ruta.test.mjs` (11), `redirects.test.mjs` |
| La portada muestra sólo 36 horas (eran 72) y nada se estrena con más de 12 | `archivo.test.mjs` ("las listas no muestran notas de más de 36 horas…", "una nota que nunca salió no se estrena con el hecho de más de 12 horas", "generar-datos no estrena lo que llega tarde…"), `criterios-extranjero-zona.test.mjs` ("la portada no muestra nada de más de 36 horas…"), `criterio.test.mjs` (el número contra el criterio) |
| Una nota ya publicada que espera sólo por cupo o medios conserva la página | `arreglos-28-09.test.mjs` |
| El turno de farmacia dura hasta las 8:30 | `farmacias.test.mjs` ("a la medianoche sigue de turno la farmacia del día anterior", "a las ocho y media de la mañana cambia"), `fechas-balcarce.test.mjs` |
| La hora de Balcarce en Actions (`TZ`) | `hora-balcarce.test.mjs`, `fechas-balcarce.test.mjs` (con el reloj en UTC), y varias de `redes`, `piezas`, `respaldo` |
| Las listas de sepelios, nunca (ni aprobadas por una persona) | `criterios-extranjero-zona.test.mjs` (tres pruebas), `arreglos-28-09.test.mjs` (dos) |
| De las repetidas queda la ya publicada | `lectura-ia.test.mjs` ("de un grupo de repetidas queda la que ya está publicada…") |
| Retiradas y correcciones a mano | `archivo.test.mjs` (el mecanismo y que los archivos del repositorio estén bien armados) |
| Once secciones, sin Servicios, Región ni Provincia | `notas.test.mjs`, `cruce-coherente.test.mjs`, `lectura-ia.test.mjs`, `redirects.test.mjs`, `arreglos-28-09.test.mjs` (la pieza de útiles) |
| Títulos sin "en Balcarce" | `titulos-colores.test.mjs`, `estilo.test.mjs` |
| Lo de acá que no nombra nada de acá espera a la IA (28/09) | `copia-de-afuera.test.mjs` |
| Una fuente oficial alcanza sola (la historia hereda `oficial`) | `arreglos-28-09.test.mjs` (dos pruebas) |
| El interruptor de las redes, una sola regla | `redes.test.mjs` ("el interruptor acepta si, Si, SÍ y sí, y nada más"), `arreglos-28-09.test.mjs` (el reloj usa la misma) |
| Las corridas que publican bajan la última `main`; las que guardan estado reintentan tres veces | `checkout-main.test.mjs`, `arreglos-28-09.test.mjs` (Vigilancia y Auditoría) |
| Un programa de Actions que no carga | `sintaxis-scripts.test.mjs` (`node --check` de todo lo que corre solo) |
| Si Open-Meteo falla, `api.met.no` | No hay prueba de ese respaldo en `pruebas/` (lo usa `ingesta/ingesta.mjs`; ver `docs/06-WEB.md`) |

---

## Las reglas numeradas

Hay **77 reglas**, del 1 al 77, sin huecos ni repetidas: las 1 a 40 son del 21
al 26/09, las 41 a 62 del 27/09 (el plan V2.2 y lo que se decidió en vivo ese
día) y las 63 a 77 del 28/09. Están agrupadas por tema y no por número.

"Qué la cuida" dice: **Prueba** (si alguien rompe la regla en el código,
`npm test` falla y la web no se publica), **Vigilante** (mira la web ya
publicada y avisa si la regla se rompió por algo que las pruebas no ven) o
**Nada** (es una regla de criterio, y se dice sin adornos).

### La web

| # | Regla | Qué la cuida |
|---|---|---|
| 1 | **La portada no muestra la fuente arriba de los títulos** (ni en las secciones ni en los temas). La fuente sí queda en la página de cada nota, con el enlace al original. | Prueba: `portada.test.mjs` (2). Vigilante: `regla-fuentes` (`revisarPortada`; probado en `vigilancia.test.mjs`) |
| 2 | **Nunca "la vimos hace…" ni "sin hora".** Cada nota dice hace cuánto salió con una sola escala ("recién", "hace N min", "hace N h", "ayer", "hace N días"); si la fuente no dio la hora, se cuenta desde que la nota está en el sitio. | Prueba: `web.test.mjs` ("si la fuente no dio la hora, se dice hace cuánto salió en el sitio…") y `portada.test.mjs` ("una nota sin hora de la fuente muestra desde cuándo está en el sitio, nunca queda en blanco"). Vigilante: `regla-la-vimos` |
| 3 | **La farmacia de turno no dice hasta qué hora está.** Sólo el nombre, la dirección, el teléfono y "Cómo llegar" (el turno cambia a las 8:30, pero es un dato interno). | Prueba: `portada.test.mjs`, `farmacias.test.mjs` ("el turno cambia a las 8:30, pero la web NO lo dice"). Vigilante: `regla-hora-farmacia` |
| 4 | **Las notas van de la más nueva a la más vieja.** La única excepción es la nota grande de arriba: la de más puntaje de las últimas 6 horas, de Balcarce si hay. | Prueba: `portada.test.mjs` (3), `web.test.mjs` (7 de la nota grande y la tapa) |
| 5 | **El cuerpo es la nota desarrollada y distinta de la bajada** (pirámide invertida). Un cuerpo que repite la bajada se rechaza; si trae un dato que no cuadra se sacan esas oraciones, y si no alcanza se reintenta diciéndole qué falló. | Prueba: `cuerpo.test.mjs`. Vigilante: `pocos-cuerpos` (menos del 35 % de las notas de las últimas 24 horas con cuerpo) |
| 6 | **Lo que escribe la IA se verifica contra la fuente**: número, nombre, día, cita, antecedente dicho como de hoy, delito sin atribuir, negaciones, "en vivo" y relleno; las partes internas, cada una por su lado. El nivel de verificación lo calcula el código, no la IA. | Prueba: `verificar.test.mjs`, `reescritura.test.mjs`, `editor.test.mjs`, `estilo.test.mjs`, `json-ia.test.mjs` |
| 7 | **Cada nota dice quién la escribió** (IA, persona o fuente), y el sitio no promete una revisión que no hubo. Lo corregido a mano en `correcciones.json` firma "Revisada por la redacción" (28/09). | Prueba: `seo-paginas.test.mjs`, `arreglos-28-09.test.mjs` |
| 8 | **Las fotos** (27/09, decisión de Hernán con el riesgo explicado; construido el 28/09): la foto de otro medio o de un organismo oficial se puede usar en la página de la nota **sólo sin marca de agua ni el nombre del otro medio adentro**, con el crédito en el epígrafe y guardada en el banco propio (`web/data/banco-fotos.json`). Si no sirve ninguna y la nota es de una persona pública, una foto libre de Wikimedia Commons con autor y licencia. En el espejo de Instagram va la misma foto, con el crédito en el texto del posteo; la tarjeta para compartir el enlace lleva la misma foto (el crédito está en el epígrafe de la página) y los videos siguen con placa, que es lo que sale cuando no hay foto que sirva. Sin foto real lo que identificaría a un menor o a una víctima, y Policiales salvo fuente oficial. | Prueba: `fotos.test.mjs`, `fotos-notas.test.mjs`, `placas.test.mjs`, `redes.test.mjs`, `arreglos-28-09.test.mjs` (`docs/05-FOTOS.md`) |
| 9 | **Nunca identificar a un menor ni a una víctima.** El semáforo rojo lo frena y lee también el texto completo de la fuente y lo que escribió la IA; la instrucción de la IA lo prohíbe. La lista no se toca sin preguntar. | Prueba: `semaforo.test.mjs` (cada término), `reescritura.test.mjs`, `notas.test.mjs`, `fuentes.test.mjs` ("ninguna sección automática está también en rojo") |
| 20 | **Un enlace que ya circula no se rompe.** La dirección queda fija desde la primera publicación; la página dura 180 días aunque la nota salga de la portada; la 404 rescata direcciones viejas. Lo que pasa a rojo, se bloquea o se retira sí pierde la página. | Prueba: `archivo.test.mjs`, `ruta.test.mjs`, `redirects.test.mjs` |
| 21 | **Cada página dice cuál es su dirección** (canónico propio); sólo la portada es `/`. | Prueba: `seo-paginas.test.mjs` |
| 22 | **Una fecha aproximada nunca se publica como confirmada.** Cada evento con página tiene fecha del municipio o una que publicó una persona; las fiestas anuales dicen "fecha a confirmar" hasta entonces. La ficha del evento no lleva texto de IA. | Prueba: `eventos.test.mjs`, `agenda-panel.test.mjs` |
| 23 | **Una nota sin cuerpo no se publica** (25/09): 70 palabras o más, distinto de la bajada. Si no, queda "esperando cuerpo" (`web/data/esperando-cuerpo.json`), se reintenta hasta tres veces y el resumen de las 21 lo dice. Lo que publicó una persona se respeta (el panel pide confirmarlo). | Prueba: `cuerpo.test.mjs`, `editor.test.mjs`. Vigilante: `pocos-cuerpos` y "Esperando cuerpo" del resumen |
| 24 | **El lector ve la nota, no el análisis** (25/09): título, bajada, cuerpo y un desplegable cerrado "Fuentes (N)". Claves, qué se sabe, qué falta confirmar, aportes y nivel de verificación, en el panel. | Prueba: `editor.test.mjs`, `portada.test.mjs` |
| 25 | **Lo que no es una nota, o no está verificado, no sale solo** (25/09): la cotización del dólar en el título queda amarilla (está en `/dolar`); la verificación BAJA espera a una persona. | Prueba: `semaforo.test.mjs`, `editor.test.mjs`, `secciones-flacas.test.mjs` (el dólar de Infocampo) |
| 26 | **El criterio editorial es uno solo y la IA lo lee tal cual** (25/09). | Prueba: `criterio.test.mjs` |
| 27 | **El enlace de cada fuente es la página de la nota original**, nunca un archivo interno del medio (25/09: Infórmese Primero enlazaba el XML del feed). El identificador de las notas no cambia. | Prueba: `informese.test.mjs` |
| 63 | **Una nota que nunca salió no se estrena si el hecho tiene más de 12 horas** (28/09, `llegaTarde`): de 140 notas del 25 al 28/09, 40 salieron con el hecho de más de un día. Lo que ya salió sigue su curso; lo que publicó una persona, también. | Prueba: `archivo.test.mjs` |
| 65 | **Una nota tiene una sola fecha, y puede envejecer pero nunca rejuvenecer** (28/09, `fechaReal`, `fechaDeLaNota`): sin hora de la fuente, la primera vez que se vio (`web/data/vistas.json`); con hora, la más vieja conocida. Un medio que "actualiza" su nota no la devuelve a la tapa. | Prueba: `archivo.test.mjs` ("la fecha más vieja manda") |
| 66 | **Una nota ya publicada no pierde su página por el cupo ni por los medios** (28/09, `pierdeLaPagina`): sale de las listas mientras espera, pero el enlace compartido sigue andando. Sí la pierde por rojo o por un amarillo de contenido. | Prueba: `arreglos-28-09.test.mjs` |
| 68 | **La IA sólo reescribe lo que va a salir solo** (28/09, Hernán: "no reescribir cosas que requieran una habilitación a mano"): sólo las notas en verde, sin decisión de una persona y sin retirar a mano (`retiradas.json`). Amarillo y rojo no gastan cupo de redacción; la lectura con IA sí las lee, porque es la que decide el color. Tampoco escribe sola un borrador de lo que espera para el celular (se probó unas horas el 29/09; esa noche, Hernán: "si la nota no sale en automático, la idea es que no se escriba nada"): lo escribe sólo si una persona lo pide. | Prueba: `reescritura.test.mjs` ("no toca una nota que no es verde", "no gasta un pedido en una nota retirada a mano"), `celular.test.mjs` |
| 69 | **No se junta información sin sentido** (28/09, Hernán): los lunes, en la nube, `retiradas.json` pierde las de más de 7 días que la ingesta ya no trae (`podarRetiradas`, `web/lib/archivo.js`), y el panel no guarda lo que esperó a una persona (pendiente) más de 7 días (`DIAS_DE_PENDIENTES`, `panel/notas.mjs`). Pasada una semana, una nota ya no se puede estrenar. | Prueba: `archivo.test.mjs` ("las retiradas de más de una semana…"), `panel-seguridad.test.mjs` ("lo que espera a una persona…") |
| 70 | **Arreglos de la auditoría del 28/09**: lo de la zona conserva la página aunque lo cuente un solo medio (`deLaZona` en la nota publicada y en `tieneRespaldo`); la foto de una nota retirada a mano o que ya no está en ningún lado se borra de `web/public/fotos-notas/` (`podarFotos`); el panel de la PC no reescribe solo con IA (sólo la nube); `reels/voz.mjs` corre sola sólo con su nombre exacto. | Prueba: `auditoria-28-09.test.mjs` |
| 71 | **Decisiones de Hernán sobre la auditoría (28/09)**: los policiales de la zona entran (con el mismo semáforo); "hospital" e "investigación" ya no frenan, y una muerte o un herido frenan sólo en Policiales, Balcarce, lo de acá o de la zona y lo de un solo medio (`amarilloMuerte`, `laMuerteFrena`); la verificación BAJA es sólo por acusaciones o, con un solo medio, por lo sin confirmar del hecho central; la negación se busca en toda la nota y acepta los verbos que niegan; un nombre escrito de otra forma en la fuente (EE.UU., ONU) no es inventado (`EQUIVALENCIAS`); la IA dice qué le importa a Balcarce sólo si la fuente lo dice. | Prueba: `auditoria-28-09.test.mjs`, `editor.test.mjs` |
| 72 | **Limpieza de la auditoría (28/09)**: el modelo de texto de Gemini vive sólo en `MODELO_DE_TEXTO` (`reels/claves.mjs`); la ficha de la lectura con IA pide sólo lo que decide algo y `es_chimento` es obligatoria; `marcarDeAfuera` pone figura, Balcarce y zona por separado; sin `verdeSecciones` (todas las secciones salen solas si el semáforo da verde). | Prueba: `auditoria-28-09.test.mjs` |
| 73 | **Las fotos: otro medio en la imagen y los menores (28/09; cambiada el 29/09)**. Lo que un medio le pegó encima a la foto (marca de agua, zócalo o logo de un canal, un recuadro con su nombre) la descarta. Lo que estaba en la escena real, no: desde la noche del 29/09 también vale el micrófono con el nombre de una radio (hasta entonces se descartaba, por el caso de Radio Líder en la nota de Reino; "lo del micrófono no hay problema que salga"). La IA marca `menor` si se reconoce a alguien que parece menor de 18, y el código no elige esa foto aunque la IA la prefiera (`interpretarRespuesta`, `ingesta/fotos.mjs`). | Prueba: `fotos.test.mjs` |
| 74 | **Nunca otra voz, nunca Elena (28/09)**. Si Gemini no contesta, la pieza no se arma con otra voz: se cae, queda fuera del manifiesto y el reloj la vuelve a pedir en la vuelta siguiente mientras dure su ventana (`armarReel`, `reels/reel.mjs`). Las placas escriben la fecha sin coma, "Lunes 28 de septiembre" (`fechaLarga`, `reels/plan.mjs`). | Prueba: `arreglos-28-09.test.mjs`, `clima.test.mjs` |
| 75 | **La voz nunca dice de más (28/09)**. Un audio que dura más que el texto a 1,8 palabras por segundo, más 3 segundos, se descarta y se pide de nuevo (`vozDeMas`, `reels/voz-gemini.mjs`): probando el modelo 3.8, el podcast de 81 palabras duró 140 segundos porque leyó las indicaciones. Las placas y la web dicen "sensación térmica", no "sensación" sola (el panel de la PC todavía dice "sensación": `PENDIENTES.md`). | Prueba: `arreglos-28-09.test.mjs`, `placas.test.mjs` |
| 76 | **Dos voces propias, una por pieza (28/09)**. La locutora y el locutor son voces creadas con Voice Design de Gemini 3.8 (`es-AR`), con un identificador fijo que guarda Google (vencen el 29/09/2027). Cada pieza tiene siempre la misma voz, según el reparto de `CRITERIO-REDES.md` § 6 (`vozDePieza`); una pieza sin voz en el reparto no se arma. Nunca dos voces en una pieza: las charlas simuladas se probaron y sonaban falsas. El texto va literal y el estilo aparte y corto, porque con indicaciones largas el modelo leía las indicaciones (`pedidoDeVoz`, `reels/voz-gemini.mjs`). | Prueba: `redes-criterio.test.mjs`, `voz-gemini.test.mjs` |
| 77 | **La guardia de la Cooperativa Eléctrica va entre los teléfonos útiles (28/09)**: el 0800 222 2342 (24 horas, sin barra, para que entre en la portada y en la placa) y la línea fija (02266) 42-4091, tomados de coopbalcarce.com.ar. | Prueba: `arreglos-28-09.test.mjs` |
| 78 | **El panel del celular (29/09)**: una persona aprueba, descarta o retira desde el celular (`web/data/celular-decisiones.json`) y corrige título, bajada, cuerpo o sección (`web/data/correcciones.json`); aprobar pide el texto entero (una decisión humana sin texto publicaría el de la fuente) y retirar pide el motivo (`problemaDeDecision`, `panel/celular-datos.mjs`). Lo que salió en la web porque lo aprobó una persona no va solo a las redes: va si lo marca "también a Facebook e Instagram", y así sí puede ir Política o Policiales (`vaAFacebookPorLoQueEs`, `redes/elegir.mjs`); los podcasts siguen sin Política ni Policiales. | Prueba: `celular.test.mjs`, `celular-app.test.mjs`, `cuerpo.test.mjs` |
| 79 | **Lo que espera a una persona viaja cifrado (29/09)**: el repositorio es público, así que la lista para el celular se cifra para cada celular registrado (`panel/cifrado.mjs`: sólo la llave pública va al repositorio) y el borrador que escribe la IA a pedido, también; el registro del workflow no muestra nada de la nota. Una nota roja no va nunca al celular ni se escribe a pedido. Un sobre por nota: la que no cambió conserva el suyo, y si nada cambió el archivo no se vuelve a subir (`cerrarCadaUno`). | Prueba: `celular.test.mjs` |
| 80 | **La vigilancia pregunta por las claves de IA y por las voces (29/09)**: cada media hora, sin gastar cupo (la lista de modelos y la ficha de cada voz), avisa si una clave dejó de andar (400 a 403) y si una voz propia ya no existe o vence en menos de 30 días; "sin cupo" (429) y los 5xx no se avisan (`revisarClaves`, `redes/vigilar.mjs`). | Prueba: `vigilancia.test.mjs` |
| 81 | **Lo retirado por una persona se puede volver a publicar durante 30 días, y nunca vuelve solo (29/09)**: la corrida guarda la nota como estaba (la papelera, en la caché de Actions, no en el repositorio público) y vuelve a su página, con la misma dirección, sólo si una persona la aprueba de nuevo DESPUÉS de retirarla y ya no está retirada. Que deje de estar en `retiradas.json` no alcanza: se poda sola los lunes (regla 69) (`papeleraAlDia`, `panel/celular-datos.mjs`). | Prueba: `celular.test.mjs` |
| 82 | **El celular pregunta antes de lo que no se deshace fácil, y dice qué va a pasar (29/09)**: mandar a las redes (con las reglas de Facebook de verdad), sacarla de la cola, retirar (con el motivo), descartar, volver a publicar y publicar un cuerpo corto; el foco queda en "Cancelar" (`PREGUNTAS`, `preguntaRedes`, `web/public/panel/textos.js`). El 29/09 se mandó una nota a las redes con un toque de más y salió en Facebook. | Prueba: `celular-app.test.mjs` |
| 83 | **Lo que el celular dice que va a contar un repaso lo elige la misma función que arma el video (29/09)**: `repasosDelDia` (`redes/repasos.mjs`), que usan `reels/plan.mjs` y la previa del celular (`previaDelDia`, `redes/previa.mjs`). Un repaso que pasó su hora sin salir no muestra notas. | Prueba: `previa-redes.test.mjs` |
| 87 | **Los tres repasos cuentan cuatro notas y ninguno repite** (29/09, Hernán: la misma nota salió en el de la tarde y en el de la noche, y uno tenía 3 y otro 4): `PIEZAS.notasPorPodcast` = 4 para los tres; ninguno cuenta una nota ni un tema que ya contó otro repaso de hoy o de los dos días anteriores; la noche cuenta lo que dejó el día y no se contó, sin piso de relevancia. Un repaso cuya hora pasó sin salir no se lleva notas (`repasosDelDia`, `redes/repasos.mjs`). | Prueba: `previa-redes.test.mjs`, `historias-largas.test.mjs`, `piezas.test.mjs` |
| 88 | **Todo lo que se dice es de su parte del día** (29/09, Hernán): cada pieza sale sólo dentro de su franja (mañana hasta las 12:59, tarde hasta las 18:59, noche desde las 19: `VENTANAS`, `redes/piezas.mjs`; el repaso de la mañana podía salir a las 15 diciendo "buen día"). El clima de la noche dice "Cómo sigue el clima esta noche" y la mínima de esta noche, que es la del pronóstico de mañana (la de hoy ya pasó). | Prueba: `piezas.test.mjs`, `contrato.test.mjs`, `redes-criterio.test.mjs` |
| 89 | **Los repasos pueden contar lo de afuera si está entre lo de más puntaje** (29/09, Hernán: "las 4 noticias podrían ser también fuera de Balcarce si son las mejores rankeadas"): con relevancia 80 o más (también a la noche, cuando lo de acá no pide puntaje) y dos como mucho por repaso, las de más puntaje (`elegirParaPodcast`, `sePuedeEnUnRepaso`; `PIEZAS.relevanciaAfueraPodcast` y `PIEZAS.notasDeAfueraPorPodcast`). Facebook sigue sólo con lo de Balcarce (regla 47). | Prueba: `redes.test.mjs`, `criterio.test.mjs` |
| 90 | **Los reels y las historias no tiemblan** (30/09, Hernán: "algunas tiemblan levemente, es molesto"): la placa va quieta, sin zoom. El zoom lento (`zoompan`) recortaba en píxeles enteros y movía el texto fino de medio en medio píxel. El movimiento que se sume será de detalles calculados cuadro a cuadro sobre las mismas placas, nunca un zoom sobre la imagen entera (`reels/reel.mjs`). | Prueba: `reel-quieto.test.mjs` |
| 91 | **"Un día como hoy" se arma con anticipación y lo elige una persona** (30/09, Hernán): para cada día, las 20 mejores candidatas de varias fuentes (Portal Argentina, días especiales y feed de Wikipedia, y lo curado a mano); sin violencia ni menores, con lo político, lo que puede estar vivo y lo religioso marcado y con menos puntaje. Una persona elige la principal desde la pestaña Fechas del panel; nada sale solo. Sólo entra lo importante para Argentina, la zona y Balcarce o para todo el mundo (no lo de España de poca fama). Se evalúa con principal, sí, opcional y no; lo que se elige se guarda con cómo era cada elegida para afinar el criterio. Los feriados llevan un enfoque ya armado que se aprueba o se cambia (`ingesta/efemerides.mjs`, `docs/13-EFEMERIDES.md`). | Prueba: `efemerides.test.mjs` |
| 86 | **El verificador no tira una nota buena por cómo la revisa** (29/09): la negación del título de la fuente se busca en toda la nota también cuando se revisan el título y la bajada, que se revisan con el cuerpo vacío (`sinNegacionQueEstaEnElCuerpo`, `reels/reescritura.mjs`: dos de las ocho notas que esperaban cuerpo, Gaudio y la Federación Agraria, se caían por eso). Y cuando la IA copia, el pedido de corrección le dice qué frase copió (el motivo público de `intentos-ia.json`, no). | Prueba: `redaccion-29-09.test.mjs` |

### Qué se trae y qué es de Balcarce

| # | Regla | Qué la cuida |
|---|---|---|
| 41 | **De los medios de afuera no se trae lo que el propio medio pone en una sección de otro país, de policiales o de consejos genéricos** (se mira la dirección de la nota; el horóscopo, también por el título). De una sección de otro país entra sólo lo que tiene conexión argentina en el título, una figura o es automovilismo. De los medios de Balcarce entra todo. | Prueba: `entrada.test.mjs` |
| 42 | **Un policial que no es de Balcarce no se trae** (ni amarillo). | Prueba: `entrada.test.mjs`, `secciones-flacas.test.mjs` |
| 43 | **Cada fuente tiene ficha con tipo y ciudad** (`fichaDeFuente`); no hay fuentes "de señal" ni máximo por fuente. La lista de todas es `FUENTES.md`, que escribe `node ingesta/listar-fuentes.mjs` y no se edita a mano. | Prueba: `entrada.test.mjs`, `fuentes-registro.test.mjs` |
| 44 | **Una nota de un medio de afuera es de Balcarce sólo si el medio dice Balcarce en su título.** Nombrarla al pasar no la hace local ni le suma puntaje. | Prueba: `notas.test.mjs`, `de-aca.test.mjs` |
| 45 | **Una palabra suelta no decide:** "fangio" sin autódromo ni museo, "taller", "drones", "etcheverry" o "báez" sin nombre no hacen local una nota, no la cambian de sección ni la vuelven figura. | Prueba: `notas.test.mjs`, `zona.test.mjs` |
| 46 | **El título de la IA no pone Balcarce en una nota que no es de Balcarce.** | Prueba: `verificar.test.mjs`. La instrucción, en `CRITERIO-EDITORIAL.md` § 12, regla 2 |
| 47 | **A las redes va sólo lo de Balcarce** (y del automovilismo de afuera, lo que nombra a una figura argentina). Desde el 29/09, los repasos pueden sumar hasta dos notas de afuera de mucho puntaje (regla 89). | Prueba: `redes.test.mjs`, `redes-arreglos.test.mjs` |
| 48 | **Lo que se saca a mano de la web va en `web/data/retiradas.json`**, con motivo, cuándo y quién. Sale de las listas y pierde la página aunque la ingesta lo vuelva a traer; manda aunque el panel esté prendido. | Prueba: `archivo.test.mjs` |
| 49 | **La lectura con IA decide, pero nunca destraba** (27/09): saca publicidad, chimentos, lo del extranjero sin un argentino ni conexión argentina, lo de afuera sin relación con Balcarce y el policial que no es de acá; es de Balcarce sólo con dos llaves (fuente de acá o Balcarce en el título, **y** la IA diciendo que el hecho es de acá); la sección es la de la IA. Lo rojo o amarillo sigue igual; sin ficha, lo de siempre. Topes: 5 pedidos por corrida, 60 por día con la clave gratis y 200 con la propia; nunca la paga. | Prueba: `lectura-ia.test.mjs`, `cruce-coherente.test.mjs`, `criterios-extranjero-zona.test.mjs`, `copia-de-afuera.test.mjs` |
| 50 | **Lo de afuera de Balcarce nunca sale solo con un solo medio.** Cuántos pide cada sección, regla 56. Una fuente oficial alcanza sola (la historia lo es si alguna de sus fuentes lo es, 28/09), pero con un solo medio de afuera ni siquiera pasa el cruce (`PENDIENTES.md`). Lo viejo contado por un solo medio no completa la tapa ni "Seguí leyendo", y pierde la página salvo que haya salido en redes. | Prueba: `lectura-ia.test.mjs`, `seguir-leyendo.test.mjs`, `archivo.test.mjs`, `arreglos-28-09.test.mjs` |
| 51 | **Una noticia, una nota:** las repetidas (el mismo hecho con otro título) se juntan en una, con todos los medios. Queda la que ya está publicada (en la portada o dentro de las 36 horas), aunque a otra la cuenten más medios. Una repetida que fue a redes conserva su página. | Prueba: `lectura-ia.test.mjs`, `portada.test.mjs` |
| 52 | **El cruce de medios:** de afuera sólo entra lo que cuentan dos medios distintos o más (o dice Balcarce en el título, o toca la zona), contando las notas de las últimas 36 horas. Lo que cuentan sólo medios de otras ciudades de la zona no se trae. La nota de una historia conserva su dirección cuando otro medio se suma. | Prueba: `cruce.test.mjs`, `zona.test.mjs` |
| 53 | **Once secciones:** Fútbol aparte de Deportes, Argentina en lugar de País; sin Servicios (lo práctico de acá va a Balcarce), sin Región ni Provincia (lo de afuera que no encaja va a Argentina). | Prueba: `notas.test.mjs`, `cruce-coherente.test.mjs` |
| 54 | **Un título automático nunca termina en "en Balcarce"**, en las notas nuevas y en las ya publicadas (si quedan cuatro palabras o más); lo de una persona no se toca y la dirección no cambia. | Prueba: `titulos-colores.test.mjs` |
| 55 | **Las correcciones a mano sin el panel van en `web/data/correcciones.json`**: título, bajada, sección o cuerpo, con motivo, cuándo y quién. Mandan sobre lo que escribe la IA; la dirección no cambia; el cuerpo cuenta para la regla 23 y a esa nota no se le pide nada a Gemini. | Prueba: `archivo.test.mjs` |
| 56 | **La importancia de lo de afuera se mide en medios, no en puntaje** (27/09): Fútbol y Deportes 4; Economía, Tecnología, Agro y Automovilismo 2; el resto 3; con una figura argentina 2. Si no, espera ("de afuera y poco contada"). Se vuelve a mirar después de la lectura con IA, en los dos sentidos, y recién después van los cupos. | Prueba: `notas.test.mjs`, `lectura-ia.test.mjs`, `criterio.test.mjs`, `secciones-flacas.test.mjs` |
| 57 | **Un medio, un nombre:** todos los feeds de un medio llevan el mismo `medio`. El título de un índice de noticias con palabras sueltas sale del epígrafe (`tituloDelSitemap`). | Prueba: `cruce-coherente.test.mjs` |
| 58 | **Lo que toca la zona sale solo aunque lo cuente un solo medio** (la 226, la 55, la papa: `PALABRAS_ZONA`). No pide medios y, desde el 28/09 (`esDeAca`), tampoco ocupa el cupo de su sección. La lectura con IA igual saca lo que no tenga relación con Balcarce. **"Sudeste bonaerense" ya no alcanza** (29/09): el 28/09 salió sola, con un medio, la fiesta del mate de Copetonas (Tres Arroyos); el perfil que lee la IA ahora dice que la misma región no alcanza. | Prueba: `criterios-extranjero-zona.test.mjs`, `de-aca.test.mjs`, `zona.test.mjs` |
| 59 | **Las listas de sepelios no se publican nunca** (27/09, Hernán: "es sensible y no hay fuente oficial"). Rojo por el título, antes que el amarillo (28/09), y otra vez en el título y la bajada finales, **aunque las apruebe una persona**. Las necrológicas que El Diario Balcarce pega debajo de cada nota no se leen como la nota. | Prueba: `criterios-extranjero-zona.test.mjs`, `arreglos-28-09.test.mjs` |
| 60 | **Nada viejo en la portada ni en las secciones**: sólo lo de las últimas 36 horas (28/09; eran 72). Una sección con menos de tres notas se completa con el archivo, sólo con lo de esas mismas horas, y una misma historia no completa dos secciones. | Prueba: `criterios-extranjero-zona.test.mjs`, `seguir-leyendo.test.mjs`, `archivo.test.mjs` |
| 61 | **Un medio de Balcarce que copia una noticia de afuera no la vuelve "de Balcarce"**: si la cuentan también medios de afuera y ningún medio de acá nombra a Balcarce, es de afuera (`historiaDeAca`). | Prueba: `cruce-coherente.test.mjs`, `copia-de-afuera.test.mjs` |
| 62 | **Lo que se lee de la página de un medio sin feed toma la fecha real de la nota**, y lo de más de 72 horas no se trae (`HORAS_DE_UNA_NOTA_NUEVA`). | Prueba: `criterios-extranjero-zona.test.mjs` |
| 64 | **Lo de un medio de acá que no nombra nada de acá espera a la IA** (28/09, `mencionaAca`): mientras la lectura con IA ande y la nota nunca haya salido, no sale sola sin ficha (pasó con un referéndum de Suiza que copió una radio de acá). | Prueba: `copia-de-afuera.test.mjs` |
| 84 | **Una lista de la nota llega a la IA** (29/09): las calles de un corte, los requisitos de un trámite, los horarios, puestos en `<ul>` u `<ol>`, se leen como un párrafo (`textoDeLista`, `ingesta/articulo.mjs`); una lista de enlaces ("Te puede interesar") no. Cada calle tenía menos de 50 letras y el corte de luz del 30/09 salió sin las calles ("distintas arterias de la ciudad"). | Prueba: `redaccion-29-09.test.mjs` |
| 85 | **"Goleó" no hace fútbol a otro deporte** (29/09): con otro deporte nombrado (rugby, hockey, básquet, vóley…), las palabras que usa cualquier deporte ("goleó", "gol", "arquero", "penal"…) no alcanzan para Fútbol (`DE_CUALQUIER_DEPORTE`, `nombraOtroDeporte`, `ingesta/ingesta.mjs`). "Pato Naranja goleó a Pampas", de rugby, salió en Fútbol y en la cola de Facebook. Y cuando la lectura con IA dice Deportes, manda la IA: que ganen las palabras ("Fútbol") vale sólo para las fichas de antes del 28/09, que no conocían esa sección (`FICHAS_CON_FUTBOL`, `ingesta/lectura-ia.mjs`). | Prueba: `notas.test.mjs`, `lectura-ia.test.mjs` |

### Las redes (detalle en `docs/07-REDES.md`)

| # | Regla | Qué la cuida |
|---|---|---|
| 10 | **Facebook publica con enlace a nuestra nota y sin nombrar la fuente.** No dice "Resumen hecho con IA" (26/09). Lo mismo el espejo en Instagram. | Prueba: `redes.test.mjs`, `piezas.test.mjs`, `redes-criterio.test.mjs` |
| 11 | **Podcasts en vez de noticias sueltas**: tres por día, con notas de temas distintos, más el clima, la farmacia y las historias fijas. | Prueba: `piezas.test.mjs`, `redes.test.mjs`. Vigilante: el contrato del día |
| 12 | **Cada día, un color distinto para los podcasts** (los tres del día, el mismo). | Prueba: `piezas.test.mjs` |
| 13 | **El posteo de Instagram es una imagen vertical de 1080 × 1350** con el texto en la zona segura; Facebook, con enlace, 1200 × 630. | Prueba: `formatos.test.mjs`, `redes.test.mjs`, `placas.test.mjs`. Vigilante: la auditoría semanal (`FORMATOS.md`) |
| 14 | **Todo lo que va a Instagram es video con voz**, salvo la tarjeta del espejo. | Prueba: `piezas.test.mjs` |
| 15 | **Nada sensible sale solo a las redes**: Política y Policiales esperan a una persona en TODAS las piezas; lo rojo, nunca. | Prueba: `redes.test.mjs`, `redes-arreglos.test.mjs` |
| 28 | **Siempre "Radar Balcarce" y `radarbalcarce.com`**; dicha en voz alta, "Radar Balcarce punto com", nunca ".com.ar". | Prueba: `redes-criterio.test.mjs`, `redes.test.mjs`, `perfiles.test.mjs`, `seo.test.mjs`. Y el workflow manual "Auditar voz" |
| 29 | **La voz sale de `CRITERIO-REDES.md`**, sin copia en el código (hasta el 28/09, una sola locutora; desde entonces, dos voces propias con un reparto fijo: regla 76). | Prueba: `redes-criterio.test.mjs` |
| 30 | **Cada pieza habla a su horario y suena humana**: saludo y cierre de su hora, sin exclamaciones, sin "en vivo", sin nombrar la fuente; mismo día y pieza, mismo texto. | Prueba: `redes-criterio.test.mjs`, `guiones.test.mjs` |
| 31 | **Los posteos y los pies llevan el enlace**, no nombran la fuente y no usan la forma hablada. | Prueba: `redes-criterio.test.mjs`, `redes.test.mjs` |
| 32 | **La voz se audita con la voz real**, a mano (workflow "Auditar voz"): gasta centavos, nunca en lazo. | Prueba (la parte pura y que el workflow sea manual): `redes-criterio.test.mjs` |
| 33 | **El contrato del día**: por red, 3 reels, 6 historias y hasta 5 posteos; nunca más de uno por pieza y día. | Prueba: `contrato.test.mjs`, `vigilancia-cierre.test.mjs`, `redes-arreglos.test.mjs`. Vigilante: resumen de las 21 y problemas del contrato |
| 34 | **El libro se compara con lo que Meta tiene de verdad** (el cierre de las 23:30 y "Auditar redes"). | Prueba: `auditar-redes.test.mjs`, `vigilancia-cierre.test.mjs` |
| 35 | **Un posteo de Facebook sin su foto en Instagram se reintenta** (hasta 4 veces y 12 horas). | Prueba: `espejo.test.mjs`. Vigilante: `sin-espejo-instagram` |
| 36 | **Ninguna historia pasa de 58 segundos**: presupuesto de 55 en el guion y, si igual pasa, la historia sube recortada con fundido y el reel entero. | Prueba: `historias-largas.test.mjs` |
| 37 | **La historia de un reel se intenta tres veces en la misma corrida**; entre corridas no se reintenta. | Prueba: `historias-largas.test.mjs` |
| 38 | **Una sola regla de "¿toca hoy?" para los teléfonos útiles** (`diaRotativoDeUtiles`, aplicada por `toca`). | Prueba: `historias-largas.test.mjs`, `piezas.test.mjs`, `horarios.test.mjs` |
| 39 | **El día no pasa de 8 historias**: si sobra, primero los útiles y después la agenda; el contrato y los avisos de clima, nunca. | Prueba: `historias-largas.test.mjs` |
| 40 | **Con `REDES_ACTIVAS` apagado, el vigilante lo dice una vez por día**; el cierre de las 23:30 se saltea; los duplicados se siguen avisando. | Prueba: `historias-largas.test.mjs`, `redes.test.mjs` |
| 67 | **Nada gasta la voz paga sin que se pida** (28/09): con las redes apagadas el reloj no arma ninguna pieza (lee el interruptor con `estaActivo`, igual que `publicar.mjs`), y "Piezas" con `solo` vacío no arma nada salvo que se marque `todas`. | Prueba: `arreglos-28-09.test.mjs` |

### Cómo se trabaja

| # | Regla | Qué la cuida |
|---|---|---|
| 16 | **Claves y tokens nunca en un chat ni en el código.** Van a GitHub Secrets o al `.env`; los pega una persona; un error nunca muestra la clave. Importa más desde el 25/09: el repositorio es público. | Prueba: ver la fila de claves en "Las reglas que no se negocian". Ninguna prueba recorre el repositorio buscando claves |
| 17 | **Todo lo que pueda ir online va online**: web, redes, vigilancia y avisos corren en GitHub y Cloudflare con la PC apagada. La excepción, por ahora, es el panel. | Vigilante: `web-vieja`, `reloj-Actualizar la web`, `reloj-Redes` |
| 18 | **`ingesta/`, `panel/` y `redes/` no importan nada de afuera de Node.** | Prueba: `fuentes.test.mjs` (sigue los imports en cadena), `redes-criterio.test.mjs` |
| 19 | **Cuando se arregla algo que estuvo mal publicado, se escribe una prueba.** | Nada automático: es la costumbre que sostiene a todas las demás |

### Decisiones que siguen valiendo

No tienen prueba: son de criterio. Se decidieron una vez y no se vuelven a
discutir salvo que Hernán y Andrés lo pidan.

- **Tecnología es un sello propio.** Ningún medio de Balcarce la cubre con
  regularidad y conecta con el pueblo (el INTA Balcarce es uno de los centros
  de investigación agropecuaria más grandes del país).
- **El buzón tiene cuatro tipos**: dato, reclamo, opinión y seguimiento
  (`panel/buzon.mjs`). Un reclamo **nunca se publica de un solo lado**: se le
  pregunta a la otra parte. Una opinión va siempre firmada con nombre real.
- **Sin fúnebres** (no hay fuente oficial; las listas de sepelios las frena el
  código: regla 59), **sin comentarios de lectores** y **sin transmisiones en
  vivo largas** (`docs/historico/INVESTIGACION-COMPETENCIA.md`).
- **Facebook no se raspa**: va contra sus términos. Por eso las radios que
  sólo existen en Facebook no son fuente (`docs/historico/HISTORIA.md` § 3).
- **Sin música en las piezas**: la cortina sonaba a pitido y está apagada.
- **Lo de `reels/` que depende de la red o de ffmpeg no tiene prueba** a
  propósito; la lógica pura que tiene adentro sí.

---

## Todos los archivos de `pruebas/`

El número es la cantidad de pruebas que corrió cada archivo el 29/09 (algunas
se repiten por cada término de una lista, como las del semáforo). El área dice
qué documento cuenta ese tema.

| Archivo | Pruebas | Qué vigila | Área |
|---|---|---|---|
| `acceso.test.mjs` | 18 | Entrar al panel: claves con hash, sesiones firmadas, freno después de cinco intentos, que no delate qué usuarios existen | Panel |
| `agenda-panel.test.mjs` | 16 | Eventos cargados a mano: nacen como borrador, qué va al archivo público, contactos para pedir fechas, que el panel no mande nada solo | Panel / Web |
| `agenda.test.mjs` | 13 | La agenda del municipio y las fiestas anuales; el semáforo también en la agenda | Ingesta |
| `archivo.test.mjs` | 29 | Los enlaces no se rompen; archivo de 180 días; retiradas y correcciones; 36 h en las listas; nada se estrena con más de 12 h; la fecha más vieja manda | Web |
| `arreglos-28-09.test.mjs` | 15 | Los arreglos del 28/09 (los trece de la documentación, más el audio que dura de más y la guardia de la cooperativa): firma de lo corregido a mano, sepelios antes del amarillo y aunque los apruebe una persona, la historia oficial, la página que se conserva por cupo, fotos del banco en la PC, crédito de Wikimedia, el interruptor en el reloj, útiles en Balcarce, tres intentos de Vigilancia y Auditoría, las claves, Piezas sin elegir | Varias |
| `articulo.test.mjs` | 9 | Bajar el texto completo de la nota original sin menús ni pies | Ingesta |
| `auditar-redes.test.mjs` | 21 | Comparar el libro de redes con lo que Meta tiene de verdad | Redes |
| `auditoria-28-09.test.mjs` | 15 | Los arreglos y las decisiones de la auditoría del 28/09 (reglas 70 y 71): la zona conserva la página, fotos sin nota se borran, el panel no reescribe solo, policiales de la zona, cuándo frena una muerte, la verificación BAJA, el modelo de IA en un solo lugar | Varias |
| `buzon.test.mjs` | 4 | Los cuatro tipos del buzón y sus reglas (el reclamo nunca de un solo lado) | Panel |
| `celular-app.test.mjs` | 14 | La app del panel del celular: lo que escribe es lo que acepta la web, el cliente de GitHub, que exista todo lo que importa, los textos que explican cada motivo y cada pregunta, la hora de Balcarce | Panel |
| `celular.test.mjs` | 23 | El sobre cifrado (un sobre por nota), las decisiones del celular, lo que va para decidir (sin textos que la IA escriba sola), la papelera (nunca vuelve sola), las redes que aprueba una persona | Panel |
| `checkout-main.test.mjs` | 3 | Los workflows que publican bajan la última `main` | Infraestructura |
| `clima.test.mjs` | 19 | El dibujo de cada cielo (de noche no hay sol) y cuándo avisar helada, granizo o viento | Web / Redes |
| `comercial.test.mjs` | 31 | La base de comercios: fichas, teléfonos, fusión sin pisar lo cargado a mano, vigencia | Comercial (`COMERCIAL.md`) |
| `contrato.test.mjs` | 16 | El contrato del día (3 reels, 6 historias, 5 posteos), con el libro real del 24 y 25/09 | Redes |
| `copia-de-afuera.test.mjs` | 4 | Lo de un medio de acá que no nombra nada de acá espera a la IA (28/09, el referéndum de Suiza) | Selección |
| `criterio.test.mjs` | 10 | El criterio editorial es uno solo y sus números coinciden con el código | Redacción |
| `criterios-extranjero-zona.test.mjs` | 7 | Extranjero sólo con un argentino; la zona sale sola; sepelios nunca; 36 h; la fecha real de El Diario | Selección / Web |
| `cruce-coherente.test.mjs` | 6 | Un medio, un nombre; La Tecla; chimentos; ciudad de cada medio; sin Región ni Provincia; lo copiado de afuera | Selección |
| `cruce.test.mjs` | 6 | Juntar las notas que cuentan el mismo hecho; memoria de 36 h | Ingesta |
| `cuerpo.test.mjs` | 30 | Sin cuerpo no se publica; que no repita la bajada; reintentos; tres intentos por nota | Redacción / Web |
| `de-aca.test.mjs` | 12 | Una sola definición de "de acá" para el semáforo, los medios que pide y el cupo (28/09) | Selección |
| `dolar.test.mjs` | 20 | La página `/dolar`: fuentes, brecha, textos de "actualizado", nunca "en vivo" | Web |
| `editor.test.mjs` | 38 | Las partes nuevas de la IA (claves, qué se sabe…), el nivel de verificación, qué ve el lector y qué el panel | Redacción |
| `entrada.test.mjs` | 9 | El filtro de entrada por la sección del medio; la ficha de cada fuente | Ingesta |
| `espejo.test.mjs` | 5 | Reintentar la foto de Instagram de un posteo de Facebook | Redes |
| `estadistica-diaria.test.mjs` | 6 | La estadística diaria de notas y su informe de las 21 | Infraestructura |
| `estilo.test.mjs` | 25 | Que lo de la IA no parezca IA: título en presente, sin ganchos, tildes, "este viernes", relleno (28/09) | Redacción |
| `eventos.test.mjs` | 30 | La página de cada evento: dirección fija, ficha sin IA, `.ics`, datos para Google, 60 días después | Web |
| `farmacias.test.mjs` | 19 | Leer el cronograma y el directorio del Colegio; el cambio de turno a las 8:30 | Ingesta / Web |
| `fechas-balcarce.test.mjs` | 11 | Las fechas son las de Balcarce aunque el servidor esté en UTC | Infraestructura |
| `formatos.test.mjs` | 18 | Las medidas de las imágenes y videos de las redes; la auditoría semanal | Redes |
| `fotos-notas.test.mjs` | 11 | A qué notas se les prueba foto, el banco, Policiales sólo con foto oficial, que el workflow suba las fotos | Fotos |
| `fotos.test.mjs` | 22 | Elegir una foto sin marca con IA (Gemini, Groq de respaldo, Wikimedia) | Fotos |
| `fuentes-registro.test.mjs` | 2 | `FUENTES.md` dice lo mismo que el código | Ingesta |
| `fuentes.test.mjs` | 12 | La salud de la configuración de fuentes; que el motor no dependa de nada instalado; caracteres escondidos | Ingesta / todo |
| `guiones.test.mjs` | 1 | Los teléfonos útiles no dicen "esta semana" | Redes |
| `historias-largas.test.mjs` | 24 | Historias de hasta 58 s, reintentos, útiles, techo de 8 historias, redes apagadas | Redes |
| `hora-balcarce.test.mjs` | 4 | La hora de Balcarce (`ingesta/zona.mjs`) | Infraestructura |
| `horarios.test.mjs` | 9 | Los horarios de las historias fijas editables desde el panel | Panel / Redes |
| `informese.test.mjs` | 8 | El enlace de Infórmese Primero es la página, no el XML del feed | Ingesta |
| `json-ia.test.mjs` | 3 | Leer una respuesta de la IA con una barra invertida mal formada (28/09) | Redacción |
| `lectura-ia.test.mjs` | 24 | La lectura con IA: perfil, listas cerradas, topes, Groq, repetidas, nunca destraba, la sección de la IA manda | Selección |
| `meta-tiempo.test.mjs` | 3 | Los pedidos a Meta tienen tiempo máximo | Redes |
| `notas-propias.test.mjs` | 24 | La nota del dólar (sólo si se movió 2 %) y los repasos de los podcasts | Web |
| `notas.test.mjs` | 56 | Semáforo, puntaje, secciones ("goleó" no hace fútbol a otro deporte), medios que pide lo de afuera, cupos, limpieza del texto | Selección |
| `panel-seguridad.test.mjs` | 17 | Control de origen, qué se deja probar, que no publique a Vercel, poda de decisiones | Panel |
| `panel.test.mjs` | 16 | Avisos, campos editables que llegan a la web, sincronización con GitHub | Panel |
| `pedir-clima-tiempo.test.mjs` | 3 | El pedido del clima en el navegador no se traba | Web |
| `pedir-clima.test.mjs` | 6 | Cómo se lee la respuesta de Open-Meteo | Web |
| `perfiles.test.mjs` | 4 | Las biografías de Instagram y Facebook (`PERFILES.md`) | Redes |
| `piezas.test.mjs` | 52 | Qué pieza sale, cuándo, cómo se sube a Instagram y Facebook, colores del día | Redes |
| `placa-texto.test.mjs` | 6 | Cómo se cortan los renglones en las placas | Redes |
| `placas.test.mjs` | 15 | El diseño del 28/09 de placas y tarjetas (`web/lib/tarjeta-diseno.js`): todo entra, sin nombres de medios adentro | Redes / Web |
| `plan-vacio.test.mjs` | 1 | El plan no se cae con la lista vacía (25/09) | Redes |
| `portada.test.mjs` | 17 | Lo que ve el lector en la portada: sin fuente arriba, horas, orden, repetidas, farmacia sin botones, `/clima` | Web |
| `presentacion-celular.test.mjs` | 6 | El sitio en el celular: menú en una fila, tarjetas, farmacia, tipografía | Web |
| `previa-redes.test.mjs` | 4 | La pestaña Redes del celular: el cronograma, qué cuenta cada repaso (la misma función que el plan de los videos) y la cola de Facebook | Redes / Panel |
| `propuestas.test.mjs` | 12 | Los mensajes comerciales por WhatsApp | Comercial |
| `redaccion-29-09.test.mjs` | 3 | La auditoría de la redacción del 29/09: la negación se busca en toda la nota, las listas de la nota llegan a la IA, la corrección dice qué frase se copió | Redacción |
| `redes-arreglos.test.mjs` | 16 | Cinco errores de redes del 28/09, una prueba por arreglo | Redes |
| `redes-criterio.test.mjs` | 29 | El criterio de redes: identidad, voz, saludos por horario, auditoría de voz | Redes |
| `redes.test.mjs` | 53 | Qué se publica en Facebook e Instagram, tokens, claves, podcasts | Redes |
| `redirects.test.mjs` | 4 | Las redirecciones de Cloudflare (`/nota/ID` y secciones viejas) | Web |
| `reescritura.test.mjs` | 40 | La reescritura: tonos, varias fuentes, clave gratis y paga, topes, semáforo sobre lo escrito | Redacción |
| `reloj.test.mjs` | 5 | Importar el reloj de redes no publica nada | Redes |
| `respaldo.test.mjs` | 10 | La copia de seguridad del panel | Panel |
| `ruta.test.mjs` | 11 | La dirección de cada nota | Web |
| `secciones-flacas.test.mjs` | 18 | Las fuentes nuevas del 26/09, cupos y medios por sección, orden de la reescritura | Selección |
| `seguir-leyendo.test.mjs` | 17 | "Seguí leyendo" y cómo se completa una sección con el archivo | Web |
| `semaforo.test.mjs` | 48 | Cada término de las listas roja y amarilla; la cotización del dólar | Selección |
| `seo-paginas.test.mjs` | 31 | Íconos, h1, títulos, canónicos, firma, `_headers`, contraste, sitemap de noticias | Web |
| `seo.test.mjs` | 6 | La dirección del sitio (`SITIO`) y el dominio propio | Web |
| `sintaxis-scripts.test.mjs` | 1 | Todos los programas que corren solos se pueden cargar (`node --check`) | Infraestructura |
| `subtitulos.test.mjs` | 11 | Cuándo arranca cada palabra en el audio | Redes |
| `tipografia.test.mjs` | 11 | El sistema tipográfico de las tarjetas y el dólar sin corrimientos | Web |
| `titulos-colores.test.mjs` | 6 | Títulos sin "en Balcarce"; un color por sección; tipografías de placas y tarjetas | Web |
| `verificar.test.mjs` | 43 | Cada forma en que la IA puede inventar algo; las acusaciones bien atribuidas ("presunto", "la denuncia") no se rechazan (28/09) | Redacción |
| `vigilancia-arreglos.test.mjs` | 8 | Tres arreglos del vigilante y el vencimiento del dominio | Infraestructura |
| `vigilancia-avisos.test.mjs` | 29 | Pendientes, noticia importante, redes, resumen de las 21, un solo WhatsApp | Infraestructura |
| `vigilancia-cierre.test.mjs` | 17 | El cierre de las 23:30 contra Meta y los duplicados | Redes / Infraestructura |
| `vigilancia-estadisticas.test.mjs` | 19 | Visitas de Cloudflare y seguidores de Meta, sin tokens | Infraestructura |
| `vigilancia.test.mjs` | 46 | Qué es un problema para el vigilante, cuándo avisa, reglas de la portada publicada | Infraestructura |
| `voz-gemini.test.mjs` | 6 | La voz de Gemini: clave en el encabezado, tiempo máximo, texto literal con el estilo aparte y la voz por su identificador, dónde viene el audio, y el audio que dura de más se rechaza | Redes |
| `voz.test.mjs` | 18 | Cómo se leen los símbolos en voz alta y los carteles de subtítulos | Redes |
| `web.test.mjs` | 29 | Páginas de sección, nombres, horas, la nota grande y la tapa | Web |
| `zona.test.mjs` | 14 | Lo que toca la zona (ruta 226, la papa), Tecnología que no es tecnología, lo internacional | Selección |
| `cuerpo-de-prueba.mjs` | — | Material: un cuerpo de nota que pasa el verificador | — |
| `libro-real-24-25-09.json` | — | Material: el libro de redes real del 24 y 25/09 | — |

**Lo que no tiene prueba, a propósito**: lo de `reels/` que depende de la red
o de ffmpeg (armar el video, pedir la voz); sólo se prueba la lógica pura que
tiene adentro. Tampoco se prueba contra internet de verdad: eso lo mira el
vigilante sobre lo publicado.

---

## La regla de la prueba después del error

Regla 19: **cuando se arregla algo que estuvo mal publicado, se escribe una
prueba.** No hay nada automático que la haga cumplir: es la costumbre que
sostiene a todas las demás. Una regla sin prueba se rompe sola con el tiempo,
porque el que toca el código dentro de un mes no sabe que existía.

Cómo se hace:

1. **Guardar el caso real**: el título, la dirección, la hora o la respuesta
   que salió mal, tal cual.
2. **Escribir la prueba** con ese caso, en el archivo del área (tabla de
   arriba) o en uno nuevo que diga qué cuida. El nombre de la prueba dice la
   regla en castellano, y si sirve, la fecha ("(27/09, Malvinas)").
3. **Comprobar que falla** con el código de antes: si no falla, no está
   probando el error.
4. **Arreglar** y correr `npm test` completo.
5. Si es algo que ve el lector en la web, sumarlo al vigilante; si es una
   regla nueva, anotarla en este documento con el número siguiente.
6. Commitear el arreglo y la prueba juntos.

Ejemplos de pruebas que nacieron así:

| Qué salió mal | Prueba |
|---|---|
| Dos farmacias de turno mostradas como una, un sol dibujado un domingo nublado, enlaces de El Diario a `undefined/…` | `farmacias.test.mjs`, `clima.test.mjs`, `fuentes.test.mjs` |
| 25/09: los enlaces de Facebook daban 404 porque la IA cambió el título | `archivo.test.mjs`, `ruta.test.mjs` |
| 25/09: el repaso de la mañana salió dos veces | `checkout-main.test.mjs` |
| 25/09: el reloj de redes se caía con la lista vacía | `plan-vacio.test.mjs` |
| 25/09: Infórmese Primero enlazaba el XML del feed | `informese.test.mjs` |
| 24/09: el espejo de Instagram falló y nunca se reintentó | `espejo.test.mjs` |
| 25/09: una historia de 62,7 s no subió | `historias-largas.test.mjs` |
| 27/09: un import repetido hizo fallar "Actualizar la web" | `sintaxis-scripts.test.mjs` |
| 27/09: Necochea, Malvinas, sepelios, notas viejas de El Diario | `criterios-extranjero-zona.test.mjs`, `cruce-coherente.test.mjs` |
| 28/09: la mitad de las notas sin cuerpo por un JSON con una barra invertida | `json-ia.test.mjs` |
| 28/09: títulos en pasado, ganchos y tildes en lo que escribe la IA | `estilo.test.mjs` |
| 28/09: cinco errores de redes (el clima de la noche, el aviso de clima, el libro…) | `redes-arreglos.test.mjs` |
| 28/09: un referéndum de Suiza salió en Balcarce | `copia-de-afuera.test.mjs` |
| 28/09: trece cosas encontradas al documentar (firma, sepelios, oficial, páginas perdidas por cupo…) | `arreglos-28-09.test.mjs`, `verificar.test.mjs` |

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `package.json` (raíz), script `test` | Corre `node --test` sobre `pruebas/*.test.mjs` | `npm test` | — | Nada |
| `pruebas/*.test.mjs` (82) | Las pruebas | `npm test`, `node --test archivo` | El código de `ingesta/`, `web/`, `redes/`, `reels/`, `panel/`, `comercial/`, algunos documentos (`CLAUDE.md`, `CRITERIO-EDITORIAL.md`, `CRITERIO-REDES.md`, `FUENTES.md`, `PERFILES.md`, `docs/07-REDES.md`, `docs/10-REGLAS-Y-PRUEBAS.md`) y archivos de `web/data/` | Nada en el proyecto (las que necesitan escribir usan carpetas temporales) |
| `pruebas/cuerpo-de-prueba.mjs`, `pruebas/libro-real-24-25-09.json` | Material para otras pruebas | Otras pruebas | — | — |
| `.github/workflows/actualizar.yml` | Corre `npm test` antes de armar la web | cron-job.org cada 30 min | — | — |
| `docs/10-REGLAS-Y-PRUEBAS.md` | La lista numerada de reglas con su prueba | Personas | — | — |
| `redes/vigilar.mjs` | Mira la web publicada y las corridas; avisa | Workflow "Vigilancia" | La web, GitHub, el libro | WhatsApp, `vigilancia.json` |

---

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Correr todas las pruebas | `npm test` en la carpeta del proyecto |
| Correr un archivo | `node --test pruebas/archivo.test.mjs` |
| Sumar una prueba de algo de la web | `pruebas/portada.test.mjs`, `web.test.mjs`, `archivo.test.mjs` o `seo-paginas.test.mjs`, según el tema |
| Sumar una regla | Este documento (número siguiente) + su prueba (+ el vigilante si es visible) |
| Cambiar un número del criterio | `ingesta/criterio.mjs` y la tabla de `CRITERIO-EDITORIAL.md` (lo controla `criterio.test.mjs`) |
| Que el vigilante mire algo nuevo en la portada publicada | `revisarPortada` (`redes/vigilar.mjs`) y `pruebas/vigilancia.test.mjs` |

---

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| Una prueba falla en GitHub | "Actualizar la web" en rojo en "Probar que nada se rompió"; WhatsApp de corrida fallida y, a los 100 minutos, de web vieja | Correr `npm test` en la PC, ver el nombre de la prueba y arreglar |
| Una prueba falla sólo en GitHub y no en la PC | Suele ser una dependencia que en la PC está y en GitHub no, o la zona horaria (GitHub está en UTC) | Revisar `fuentes.test.mjs` (dependencias) y `fechas-balcarce.test.mjs` (hora) |
| Falta instalar algo en la PC | Error "Cannot find package" | `npm install` en la raíz y en `web/` |
| Una prueba que depende del compilado | Algunas miran el HTML compilado "si ya se compiló" (`dolar.test.mjs`, `tipografia.test.mjs`): sin compilar, esa parte se saltea | Compilar con `cd web && npm run build` para probarla entera |
| Una regla se rompe sin que falle nada | Pasa cuando la regla no tiene prueba (la 17, la 19) o cuando lo roto está afuera del código (una fuente cambió su página, Meta cambió algo) | Lo ve el vigilante sobre lo publicado; si no, escribir la prueba |
| Un documento cita una prueba que ya no existe con ese nombre | Nada falla: los documentos no se prueban (salvo `CRITERIO-EDITORIAL.md`, `CRITERIO-REDES.md`, `FUENTES.md` y unas menciones que controlan `criterio.test.mjs` y `redes-criterio.test.mjs`) | Corregir el documento |

## Lo que sigue abierto

Títulos o encabezados de pruebas que quedaron viejos (no cambian lo que
prueban): `archivo.test.mjs` "corta las listas en 72 horas" (son 36) y el
encabezado de `criterios-extranjero-zona.test.mjs` ("las listas de sepelios
esperan a una persona", "notas de más de 7 días"). Están en `PENDIENTES.md`.

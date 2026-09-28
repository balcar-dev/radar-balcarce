# 10 · Las reglas y las pruebas que las cuidan

*Escrito el 28/09/2026, leyendo `CLAUDE.md`, `REGLAS.md` y cada archivo de
`pruebas/` de ese día. Las pruebas se corrieron ese día: **1.322 pruebas en 81
archivos, todas bien, en unos 10 segundos**. Si un documento viejo dice otra
cosa que el código, manda el código; las diferencias están al final.*

La lista numerada de reglas sigue viviendo en `REGLAS.md` (sus números los
citan otros documentos). Acá está, para cada regla, **qué prueba la cuida y qué
pasa si se rompe**, y el mapa completo de `pruebas/`. Qué dice cada regla en
detalle está en el documento de su área: `docs/02-INGESTA.md`,
`docs/03-SELECCION.md`, `docs/04-REDACCION.md`, `docs/05-FOTOS.md`,
`docs/06-WEB.md`, `docs/07-REDES.md`, `docs/08-INFRAESTRUCTURA.md`,
`docs/09-PANEL.md`, `docs/11-OPERACION.md`.

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

### 4. Qué hay que hacer para agregar una regla

(Lo pide `REGLAS.md`, "Cuando se agrega una regla nueva".)

1. Escribirla en `REGLAS.md` con el número siguiente (hoy, 63).
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
| **Las fotos (27/09):** foto ajena recortada sólo sin marca, con el crédito en la cita y guardada en el banco propio; Policiales sólo con foto oficial | Las de arriba, más `fotos-notas.test.mjs`: "elegiblePorSeccion: Policiales sólo con una fuente oficial…", "elegirFotosNuevas: una nota de Policiales sin fuente oficial no se pregunta", y "el workflow… sube banco-fotos.json y las fotos guardadas"; `redes.test.mjs`: "la imagen del posteo de Instagram es la tarjeta propia y VERTICAL… no una foto ajena" | Falla `npm test` |
| **Lo que escribe la IA se verifica contra la fuente** | `verificar.test.mjs` (39: número, nombre, sigla, día, cita, delito dicho como hecho, negaciones, "en vivo", Balcarce de más, relleno, localía inventada); `cuerpo.test.mjs`; `editor.test.mjs` (cada parte nueva por separado, antecedentes); `estilo.test.mjs` (título en pasado, ganchos, tildes, "este viernes") | Falla `npm test`. Si el verificador dejara pasar un invento, la nota saldría con el dato falso |
| **Cada nota dice quién la escribió** | `seo-paginas.test.mjs`: "el autor de los datos estructurados dice lo mismo que la firma de la nota", "la firma que ve el lector es una línea corta…", "no volvemos a prometer una revisión humana que no hay"; `notas-propias.test.mjs`: "las notas propias firman como Radar Balcarce…"; `eventos.test.mjs`: "cada ficha dice quién la hizo en UNA línea corta…" | Falla `npm test` |
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
| El turno de farmacia dura hasta las 8:30 | `farmacias.test.mjs` ("a la medianoche sigue de turno la farmacia del día anterior", "a las ocho y media de la mañana cambia"), `fechas-balcarce.test.mjs` |
| La hora de Balcarce en Actions (`TZ`) | `hora-balcarce.test.mjs`, `fechas-balcarce.test.mjs` (con el reloj en UTC), y varias de `redes`, `piezas`, `respaldo` |
| Las listas de sepelios, nunca | `criterios-extranjero-zona.test.mjs` (tres pruebas) |
| De las repetidas queda la ya publicada | `lectura-ia.test.mjs` ("de un grupo de repetidas queda la que ya está publicada…") |
| Retiradas y correcciones a mano | `archivo.test.mjs` (el mecanismo y que los archivos del repositorio estén bien armados) |
| Once secciones, sin Servicios, Región ni Provincia | `notas.test.mjs`, `cruce-coherente.test.mjs`, `lectura-ia.test.mjs`, `redirects.test.mjs` |
| Títulos sin "en Balcarce" | `titulos-colores.test.mjs`, `estilo.test.mjs` |
| Lo de acá que no nombra nada de acá espera a la IA (28/09) | `copia-de-afuera.test.mjs` |
| Las corridas que publican bajan la última `main` | `checkout-main.test.mjs` |
| Un programa de Actions que no carga | `sintaxis-scripts.test.mjs` (`node --check` de todo lo que corre solo) |
| Si Open-Meteo falla, `api.met.no` | No hay prueba de ese respaldo en `pruebas/` (lo usa `ingesta/`; ver `docs/02-INGESTA.md`) |

---

## Las 62 reglas de `REGLAS.md` y su prueba

Resumidas; el texto entero, en `REGLAS.md`. "V" = además la mira el
vigilante en la web publicada. Si una prueba falla, en todos los casos pasa lo
mismo: `npm test` falla y la web no se actualiza hasta arreglarlo.

### La web

| # | Regla | Prueba (archivo: pruebas que la cuidan) |
|---|---|---|
| 1 | La portada no muestra la fuente arriba de los títulos; la página de la nota sí | `portada.test.mjs` (2). V: `regla-fuentes` (`vigilancia.test.mjs`) |
| 2 | Nunca "la vimos hace…" ni "sin hora" | `portada.test.mjs`, `web.test.mjs`. V: `regla-la-vimos`. **Ojo:** la segunda mitad de la regla cambió, ver "Diferencias" |
| 3 | La farmacia no dice hasta qué hora está de turno | `portada.test.mjs`, `farmacias.test.mjs`. V: `regla-hora-farmacia` |
| 4 | De la más nueva a la más vieja; la grande es la de más puntaje y de Balcarce | `portada.test.mjs` (3), `web.test.mjs` (7 de la nota grande y la tapa) |
| 5 | El cuerpo desarrolla y no repite la bajada | `cuerpo.test.mjs`. V: `pocos-cuerpos` (menos del 35 % con cuerpo) |
| 6 | Lo de la IA se verifica contra la fuente | `verificar.test.mjs`, `reescritura.test.mjs`, `editor.test.mjs`, `estilo.test.mjs` |
| 7 | Cada nota dice quién la escribió | `seo-paginas.test.mjs` |
| 8 | Las fotos: sin marca, crédito en la cita, banco propio | `redes.test.mjs`, `fotos.test.mjs`, `fotos-notas.test.mjs`, `placas.test.mjs` |
| 9 | Nunca identificar a un menor ni a una víctima | `semaforo.test.mjs`, `reescritura.test.mjs`, `notas.test.mjs`, `fuentes.test.mjs` ("ninguna sección automática está también en rojo") |
| 20 | Un enlace que ya circula no se rompe | `archivo.test.mjs`, `ruta.test.mjs`, `redirects.test.mjs` |
| 21 | Cada página con su canónico; sólo la portada es `/` | `seo-paginas.test.mjs` |
| 22 | Una fecha aproximada nunca se publica como confirmada | `eventos.test.mjs`, `agenda-panel.test.mjs` |
| 23 | Una nota sin cuerpo no se publica | `cuerpo.test.mjs`, `editor.test.mjs`. V: `pocos-cuerpos` y "Esperando cuerpo" del resumen de las 21 |
| 24 | El lector ve la nota, no el análisis | `editor.test.mjs`, `portada.test.mjs` |
| 25 | Lo que no es nota o no está verificado no sale solo | `semaforo.test.mjs`, `editor.test.mjs`, `secciones-flacas.test.mjs` (el dólar de Infocampo) |
| 26 | El criterio editorial es uno solo | `criterio.test.mjs` |
| 27 | El enlace de cada fuente es la página de la nota, no el XML | `informese.test.mjs` |

### Qué se trae y qué es de Balcarce

| # | Regla | Prueba |
|---|---|---|
| 41 | No se trae lo que el medio de afuera pone en otro país, policiales o consejos | `entrada.test.mjs` |
| 42 | Un policial que no es de Balcarce no se trae | `entrada.test.mjs`, `secciones-flacas.test.mjs` |
| 43 | Cada fuente con ficha (tipo y ciudad); `FUENTES.md` al día | `entrada.test.mjs`, `fuentes-registro.test.mjs` |
| 44 | De afuera es "de Balcarce" sólo con Balcarce en el título | `notas.test.mjs`, `de-aca.test.mjs` |
| 45 | Una palabra suelta no decide | `notas.test.mjs`, `zona.test.mjs` |
| 46 | El título de la IA no pone Balcarce de más | `verificar.test.mjs` |
| 47 | A las redes va sólo lo de Balcarce | `redes.test.mjs`, `redes-arreglos.test.mjs` |
| 48 | Lo retirado a mano va en `retiradas.json` | `archivo.test.mjs` |
| 49 | La lectura con IA decide pero nunca destraba; topes 5 por corrida, 60 o 200 por día | `lectura-ia.test.mjs`, `cruce-coherente.test.mjs`, `criterios-extranjero-zona.test.mjs`, `copia-de-afuera.test.mjs` |
| 50 | Lo de afuera nunca sale con un solo medio | `lectura-ia.test.mjs`, `seguir-leyendo.test.mjs`, `archivo.test.mjs` |
| 51 | Una noticia, una nota (repetidas) | `lectura-ia.test.mjs`, `portada.test.mjs` |
| 52 | El cruce de medios | `cruce.test.mjs`, `zona.test.mjs` |
| 53 | Fútbol aparte, Argentina, sin Servicios, Región ni Provincia | `notas.test.mjs`, `cruce-coherente.test.mjs` |
| 54 | Ningún título automático termina en "en Balcarce" | `titulos-colores.test.mjs` |
| 55 | Correcciones a mano en `correcciones.json` | `archivo.test.mjs` |
| 56 | Lo de afuera se mide en medios, no en puntaje | `notas.test.mjs`, `lectura-ia.test.mjs`, `criterio.test.mjs`, `secciones-flacas.test.mjs` |
| 57 | Un medio, un nombre | `cruce-coherente.test.mjs` |
| 58 | Lo de la zona sale solo con un medio | `criterios-extranjero-zona.test.mjs`, `de-aca.test.mjs` |
| 59 | Las listas de sepelios, nunca | `criterios-extranjero-zona.test.mjs` |
| 60 | Nada viejo en la portada ni en las secciones | `criterios-extranjero-zona.test.mjs`, `seguir-leyendo.test.mjs`, `archivo.test.mjs` (el número es 36 h, ver "Diferencias") |
| 61 | Lo que un medio de acá copia de afuera es de afuera | `cruce-coherente.test.mjs`, `copia-de-afuera.test.mjs` |
| 62 | Lo raspado toma la fecha real de la nota | `criterios-extranjero-zona.test.mjs` |

### Las redes (detalle en `docs/07-REDES.md`)

| # | Regla | Prueba |
|---|---|---|
| 10 | Facebook publica con enlace a nuestra nota y sin nombrar la fuente | `redes.test.mjs`, `piezas.test.mjs`, `redes-criterio.test.mjs` |
| 11 | Podcasts en vez de noticias sueltas | `piezas.test.mjs`, `redes.test.mjs`. V: el contrato del día |
| 12 | Un color por día para los podcasts | `piezas.test.mjs` |
| 13 | Instagram 1080 × 1350; Facebook con enlace 1200 × 630 | `formatos.test.mjs`, `redes.test.mjs`, `placas.test.mjs`. V: auditoría semanal |
| 14 | Todo lo de Instagram es video con voz | `piezas.test.mjs` |
| 15 | Nada sensible sale solo a las redes | `redes.test.mjs`, `redes-arreglos.test.mjs` |
| 28 | Siempre "Radar Balcarce" y `radarbalcarce.com`, nunca ".com.ar" | `redes-criterio.test.mjs`, `redes.test.mjs`, `perfiles.test.mjs`, `seo.test.mjs` ("el .com.ar no es nuestro") |
| 29 | Una sola locutora (Kore) | `redes-criterio.test.mjs` |
| 30 | Cada pieza habla a su horario | `redes-criterio.test.mjs`, `guiones.test.mjs` |
| 31 | Posteos y pies con el enlace, sin fuente | `redes-criterio.test.mjs`, `redes.test.mjs` |
| 32 | La voz se audita con la voz real (a mano) | `redes-criterio.test.mjs` (la parte pura y que el workflow sea manual) |
| 33 | El contrato del día | `contrato.test.mjs`, `vigilancia-cierre.test.mjs`, `redes-arreglos.test.mjs` |
| 34 | El libro se compara con Meta | `auditar-redes.test.mjs`, `vigilancia-cierre.test.mjs` |
| 35 | El espejo de Instagram se reintenta | `espejo.test.mjs` |
| 36 | Ninguna historia pasa de 58 s | `historias-largas.test.mjs` |
| 37 | La historia de un reel se intenta tres veces | `historias-largas.test.mjs` |
| 38 | Una sola regla de "¿toca hoy?" para los útiles | `historias-largas.test.mjs`, `piezas.test.mjs`, `horarios.test.mjs` |
| 39 | El día no pasa de 8 historias | `historias-largas.test.mjs` |
| 40 | Con `REDES_ACTIVAS` apagado, un solo aviso por día | `historias-largas.test.mjs`, `redes.test.mjs` ("el interruptor acepta si, Si, SÍ y sí, y nada más") |

### Cómo se trabaja

| # | Regla | Prueba |
|---|---|---|
| 16 | Claves y tokens nunca en un chat ni en el código | Ver la tabla de `CLAUDE.md`, arriba |
| 17 | Todo lo que pueda ir online va online | Sólo el vigilante (`web-vieja`, relojes de cron-job.org) |
| 18 | `ingesta/`, `panel/` y `redes/` sin dependencias | `fuentes.test.mjs`, `redes-criterio.test.mjs` |
| 19 | Cuando se arregla algo mal publicado, se escribe una prueba | Ninguna (costumbre) |

---

## Todos los archivos de `pruebas/`

El número es la cantidad de pruebas que corrió cada archivo el 28/09 (algunas
se repiten por cada término de una lista, como las del semáforo). El área dice
qué documento cuenta ese tema.

| Archivo | Pruebas | Qué vigila | Área |
|---|---|---|---|
| `acceso.test.mjs` | 18 | Entrar al panel: claves con hash, sesiones firmadas, freno después de cinco intentos, que no delate qué usuarios existen | Panel |
| `agenda-panel.test.mjs` | 16 | Eventos cargados a mano: nacen como borrador, qué va al archivo público, contactos para pedir fechas, que el panel no mande nada solo | Panel / Web |
| `agenda.test.mjs` | 13 | La agenda del municipio y las fiestas anuales; el semáforo también en la agenda | Ingesta |
| `archivo.test.mjs` | 27 | Los enlaces no se rompen; archivo de 180 días; retiradas y correcciones; 36 h en las listas; nada se estrena con más de 12 h; la fecha más vieja manda | Web |
| `articulo.test.mjs` | 9 | Bajar el texto completo de la nota original sin menús ni pies | Ingesta |
| `auditar-redes.test.mjs` | 21 | Comparar el libro de redes con lo que Meta tiene de verdad | Redes |
| `buzon.test.mjs` | 4 | Los cuatro tipos del buzón y sus reglas (el reclamo nunca de un solo lado) | Panel |
| `checkout-main.test.mjs` | 3 | Los workflows que publican bajan la última `main` | Infraestructura |
| `clima.test.mjs` | 18 | El dibujo de cada cielo (de noche no hay sol) y cuándo avisar helada, granizo o viento | Web / Redes |
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
| `fotos.test.mjs` | 19 | Elegir una foto sin marca con IA (Gemini, Groq de respaldo, Wikimedia) | Fotos |
| `fuentes-registro.test.mjs` | 2 | `FUENTES.md` dice lo mismo que el código | Ingesta |
| `fuentes.test.mjs` | 13 | La salud de la configuración de fuentes; que el motor no dependa de nada instalado; caracteres escondidos | Ingesta / todo |
| `guiones.test.mjs` | 1 | Los teléfonos útiles no dicen "esta semana" | Redes |
| `historias-largas.test.mjs` | 24 | Historias de hasta 58 s, reintentos, útiles, techo de 8 historias, redes apagadas | Redes |
| `hora-balcarce.test.mjs` | 4 | La hora de Balcarce (`ingesta/zona.mjs`) | Infraestructura |
| `horarios.test.mjs` | 9 | Los horarios de las historias fijas editables desde el panel | Panel / Redes |
| `informese.test.mjs` | 8 | El enlace de Infórmese Primero es la página, no el XML del feed | Ingesta |
| `json-ia.test.mjs` | 3 | Leer una respuesta de la IA con una barra invertida mal formada (28/09) | Redacción |
| `lectura-ia.test.mjs` | 23 | La lectura con IA: perfil, listas cerradas, topes, Groq, repetidas, nunca destraba | Selección |
| `meta-tiempo.test.mjs` | 3 | Los pedidos a Meta tienen tiempo máximo | Redes |
| `notas-propias.test.mjs` | 24 | La nota del dólar (sólo si se movió 2 %) y los repasos de los podcasts | Web |
| `notas.test.mjs` | 55 | Semáforo, puntaje, secciones, medios que pide lo de afuera, cupos, limpieza del texto | Selección |
| `panel-seguridad.test.mjs` | 16 | Control de origen, qué se deja probar, que no publique a Vercel, poda de decisiones | Panel |
| `panel.test.mjs` | 16 | Avisos, campos editables que llegan a la web, sincronización con GitHub | Panel |
| `pedir-clima-tiempo.test.mjs` | 3 | El pedido del clima en el navegador no se traba | Web |
| `pedir-clima.test.mjs` | 6 | Cómo se lee la respuesta de Open-Meteo | Web |
| `perfiles.test.mjs` | 4 | Las biografías de Instagram y Facebook (`PERFILES.md`) | Redes |
| `piezas.test.mjs` | 53 | Qué pieza sale, cuándo, cómo se sube a Instagram y Facebook, colores del día | Redes |
| `placa-texto.test.mjs` | 6 | Cómo se cortan los renglones en las placas | Redes |
| `placas.test.mjs` | 16 | El diseño del 28/09 de placas y tarjetas: todo entra, sin nombres de medios adentro | Redes / Web |
| `plan-vacio.test.mjs` | 1 | El plan no se cae con la lista vacía (25/09) | Redes |
| `portada.test.mjs` | 16 | Lo que ve el lector en la portada: sin fuente arriba, horas, orden, repetidas, farmacia sin botones, `/clima` | Web |
| `presentacion-celular.test.mjs` | 6 | El sitio en el celular: menú en una fila, tarjetas, farmacia, tipografía | Web |
| `propuestas.test.mjs` | 12 | Los mensajes comerciales por WhatsApp | Comercial |
| `redes-arreglos.test.mjs` | 16 | Cinco errores de redes del 28/09, una prueba por arreglo | Redes |
| `redes-criterio.test.mjs` | 28 | El criterio de redes: identidad, voz, saludos por horario, auditoría de voz | Redes |
| `redes.test.mjs` | 53 | Qué se publica en Facebook e Instagram, tokens, claves, podcasts | Redes |
| `redirects.test.mjs` | 4 | Las redirecciones de Cloudflare (`/nota/ID` y secciones viejas) | Web |
| `reescritura.test.mjs` | 39 | La reescritura: tonos, varias fuentes, clave gratis y paga, topes, semáforo sobre lo escrito | Redacción |
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
| `verificar.test.mjs` | 39 | Cada forma en que la IA puede inventar algo | Redacción |
| `vigilancia-arreglos.test.mjs` | 8 | Tres arreglos del vigilante y el vencimiento del dominio | Infraestructura |
| `vigilancia-avisos.test.mjs` | 29 | Pendientes, noticia importante, redes, resumen de las 21, un solo WhatsApp | Infraestructura |
| `vigilancia-cierre.test.mjs` | 17 | El cierre de las 23:30 contra Meta y los duplicados | Redes / Infraestructura |
| `vigilancia-estadisticas.test.mjs` | 19 | Visitas de Cloudflare y seguidores de Meta, sin tokens | Infraestructura |
| `vigilancia.test.mjs` | 46 | Qué es un problema para el vigilante, cuándo avisa, reglas de la portada publicada | Infraestructura |
| `voz-gemini.test.mjs` | 2 | La voz de Gemini: clave en el encabezado, tiempo máximo | Redes |
| `voz.test.mjs` | 18 | Cómo se leen los símbolos en voz alta y los carteles de subtítulos | Redes |
| `web.test.mjs` | 29 | Páginas de sección, nombres, horas, la nota grande y la tapa | Web |
| `zona.test.mjs` | 14 | Lo que toca la zona (ruta 226, la papa), Tecnología que no es tecnología, lo internacional | Selección |
| `cuerpo-de-prueba.mjs` | — | Material: un cuerpo de nota que pasa el verificador | — |
| `libro-real-24-25-09.json` | — | Material: el libro de redes real del 24 y 25/09 | — |

**Lo que no tiene prueba, a propósito** (`REGLAS.md`, "Decisiones que siguen
valiendo"): lo de `reels/` que depende de la red o de ffmpeg (armar el video,
pedir la voz); sólo se prueba la lógica pura que tiene adentro. Tampoco se
prueba contra internet de verdad: eso lo mira el vigilante sobre lo publicado.

---

## La regla de la prueba después del error

`CLAUDE.md` y `REGLAS.md` (regla 19): **cuando se arregla algo que estuvo mal
publicado, se escribe una prueba.** No hay nada automático que la haga
cumplir: es la costumbre que sostiene a todas las demás. Una regla sin prueba
se rompe sola con el tiempo, porque el que toca el código dentro de un mes no
sabe que existía.

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
   regla nueva, anotarla en `REGLAS.md`.
6. Commitear el arreglo y la prueba juntos.

Ejemplos de pruebas que nacieron así:

| Qué salió mal | Prueba |
|---|---|
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

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `package.json` (raíz), script `test` | Corre `node --test` sobre `pruebas/*.test.mjs` | `npm test` | — | Nada |
| `pruebas/*.test.mjs` (81) | Las pruebas | `npm test`, `node --test archivo` | El código de `ingesta/`, `web/`, `redes/`, `reels/`, `panel/`, `comercial/` y algunos documentos (`CRITERIO-EDITORIAL.md`, `CRITERIO-REDES.md`, `FUENTES.md`, `PERFILES.md`, `REDES.md`) y archivos de `web/data/` | Nada en el proyecto (las que necesitan escribir usan carpetas temporales) |
| `pruebas/cuerpo-de-prueba.mjs`, `pruebas/libro-real-24-25-09.json` | Material para otras pruebas | Otras pruebas | — | — |
| `.github/workflows/actualizar.yml` | Corre `npm test` antes de armar la web | cron-job.org cada 30 min | — | — |
| `REGLAS.md` | La lista numerada de reglas con su prueba | Personas | — | — |
| `redes/vigilar.mjs` | Mira la web publicada y las corridas; avisa | Workflow "Vigilancia" | La web, GitHub, el libro | WhatsApp, `vigilancia.json` |

---

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Correr todas las pruebas | `npm test` en la carpeta del proyecto |
| Correr un archivo | `node --test pruebas/archivo.test.mjs` |
| Sumar una prueba de algo de la web | `pruebas/portada.test.mjs`, `web.test.mjs`, `archivo.test.mjs` o `seo-paginas.test.mjs`, según el tema |
| Sumar una regla | `REGLAS.md` (número siguiente) + su prueba (+ el vigilante si es visible) |
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
| Un documento cita una prueba que ya no existe con ese nombre | Nada falla: los documentos no se prueban (salvo `CRITERIO-EDITORIAL.md`, `CRITERIO-REDES.md` y `FUENTES.md`) | Corregir el documento (ver abajo) |

---

## Diferencias encontradas con los documentos viejos

1. **Regla 2 de `REGLAS.md`** dice "si la fuente no dio la hora, no se dice
   nada en ese lugar" y cita dos pruebas que ya no existen con ese nombre
   (`web.test.mjs` "si la fuente no dio la hora, no se dice nada" y
   `portada.test.mjs` "una nota sin hora de la fuente no muestra nada"). El
   código de hoy muestra **desde cuándo está la nota en el sitio** ("hace 3
   h"), y las pruebas se llaman "si la fuente no dio la hora, se dice hace
   cuánto salió en el sitio…" y "una nota sin hora de la fuente muestra desde
   cuándo está en el sitio, nunca queda en blanco". Sigue valiendo que nunca se
   dice "la vimos hace…" ni "sin hora".
2. **Reglas 51 y 60 de `REGLAS.md`** dicen 72 horas; el código dice **36**
   (`HORAS_EN_PORTADA`, desde el 28/09). La regla 60 cita
   `criterios-extranjero-zona.test.mjs` ("…de más de 72 horas…") y
   `seguir-leyendo.test.mjs` ("…de hace más de 72 horas no completan"): las
   pruebas ya dicen 36. (La regla 62 sí es de 72 horas, y está bien:
   `HORAS_DE_UNA_NOTA_NUEVA`.)
3. **La regla de las 12 horas** (una nota que nunca salió no se estrena si el
   hecho tiene más de 12 horas, `HORAS_PARA_ESTRENAR`, 28/09) tiene prueba en
   `archivo.test.mjs` pero **no está en `REGLAS.md`** ni en `CLAUDE.md`.
4. **Regla 8 de `REGLAS.md`** dice "Pendiente de construir: hoy sale la placa
   propia en todos lados". Desde el 28/09 la web usa fotos del banco propio
   (`docs/05-FOTOS.md`, `docs/06-WEB.md`), con pruebas en `fotos.test.mjs`,
   `fotos-notas.test.mjs` y `placas.test.mjs`, que `REGLAS.md` no nombra.
5. **43 de los 81 archivos de prueba no aparecen en `REGLAS.md`**, entre ellos
   varios que cuidan reglas que sí están: `ruta.test.mjs` y
   `redirects.test.mjs` (regla 20), `de-aca.test.mjs` (44 y 58),
   `copia-de-afuera.test.mjs` (61), `secciones-flacas.test.mjs` (42 y 56),
   `estilo.test.mjs` y `json-ia.test.mjs` (6), `redes-arreglos.test.mjs` (15,
   33 y 47), `placas.test.mjs` (13), `notas-propias.test.mjs`,
   `dolar.test.mjs`, `panel-seguridad.test.mjs`, `acceso.test.mjs` y los de
   la hora (`hora-balcarce`, `fechas-balcarce`). La tabla de este documento
   los lista todos.
6. **Números viejos de las pruebas:** `CLAUDE.md`, `MANUAL.md` y
   `docs/RADAR-3.0.md` dicen "más de 1.200" (es cierto: son 1.322 en 81
   archivos); `docs/RADAR-3.0.md` dice que tardan "unos 5 segundos" (el 28/09,
   entre 10 y 11).
7. **Título viejo de una prueba:** `archivo.test.mjs` tiene "generar-datos
   corta las listas en 72 horas…", pero el código corta en 36 (la prueba mira
   el mecanismo, por eso pasa).
8. **El encabezado de `criterios-extranjero-zona.test.mjs`** dice que "las
   listas de sepelios esperan a una persona" y que la portada no se completa
   con notas "de más de 7 días": las pruebas de adentro (y el código) dicen
   que los sepelios **no se publican nunca** y que el límite es de 36 horas.
9. **`web/lib/tarjeta-diseno.js`** dice que se prueba en
   `pruebas/tarjeta-diseno.test.mjs`: ese archivo no existe; lo prueba
   `placas.test.mjs`.
10. **Regla 18 de `REGLAS.md`** cita sólo `fuentes.test.mjs`; también la cuida
    `redes-criterio.test.mjs` ("los módulos de redes/ nuevos no importan nada
    de afuera de Node").

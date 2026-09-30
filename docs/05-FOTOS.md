# 05 · Las fotos: el banco de fotos y dónde se muestran

*Escrito el 28/09/2026 contra el código de ese día. Si el código cambia, manda el código.*

Este documento cuenta cómo una nota ya publicada consigue una foto: de dónde
sale, cómo se elige, cómo se evita una marca de agua, qué se guarda, dónde se
muestra y dónde no. El criterio (qué foto se puede usar y por qué) está en
`CRITERIO-EDITORIAL.md` § 2, "Las fotos"; lo legal, en `INVESTIGACION.md` § 7.

## En una frase

En cada corrida de "Actualizar la web", a hasta 10 notas publicadas que todavía
no se probaron se les busca la foto principal de cada medio que las contó, una
IA con visión elige la mejor **sin marca de agua** (o, si ninguna sirve y la
nota es de una persona pública, se busca una foto libre en Wikimedia Commons),
se guarda en el banco propio con su crédito y se muestra en la página de la
nota con el crédito debajo y en el espejo de Instagram (el crédito va en el
texto del posteo) y en la tarjeta para compartir el enlace; los videos siguen
con placa.
La placa es lo que sale cuando no hay foto que sirva.

### Por qué hay un banco de fotos

Una fotografía es una obra protegida y citar la fuente no alcanza para usarla
(`INVESTIGACION.md` § 7). Hasta el 27/09 el sitio usaba siempre una placa
propia. Ese día Hernán decidió, con el riesgo explicado y aceptado, que se
puede usar la foto de otro medio o de un organismo oficial con dos
condiciones: **nunca con la marca de agua ni el nombre del otro medio pegado
encima** (el crédito va en la cita, debajo) y **siempre guardada en el banco propio**
para poder revisarla y reusarla. Desde el 28/09 está construido y en vivo.

---

## El recorrido, paso a paso

### 1. Cuándo corre

Dentro de `web/scripts/generar-datos.mjs`, después de decidir qué notas se
publican (`docs/03-SELECCION.md`, paso 11) y antes de armar el archivo.
**Elegir fotos nuevas es sólo en la nube** (en GitHub Actions: gasta cupo de
IA). **Poner las que ya están en el banco** (`conFotosDelBanco`,
`web/scripts/fotos-notas.mjs`) corre siempre, también en la PC (28/09: antes
una corrida en la PC dejaba `portada.json` sin ninguna foto). Si elegir falla,
las notas salen con lo que ya tenía el banco ("fotos: no se pudieron elegir
nuevas (…); quedan las del banco").

### 2. A qué notas se les prueba

`elegirFotosNuevas()` (`web/scripts/fotos-notas.mjs`):

1. Sólo las notas **que se publican en esta corrida y vienen de las fuentes**
   (no las notas propias: el dólar y los repasos no llevan foto de otro).
2. Sólo las que **todavía no están en el banco** (`web/data/banco-fotos.json`).
   Una nota ya probada, tenga foto o no, **no se vuelve a preguntar**: cada
   corrida es cada media hora y se gastaría el cupo de la IA en lo mismo.
3. **Policiales, sólo si alguna de sus fuentes es oficial**
   (`elegiblePorSeccion`). Hoy las únicas fuentes marcadas `oficial` son la
   Municipalidad y el Gobierno de la Provincia; Bomberos o la Policía no son
   fuentes propias. Una nota de Policiales de un medio no se prueba nunca.
4. **Las más nuevas primero** (Hernán, 28/09: "no hace falta completar las
   notas anteriores, pero sí que todas las nuevas tengan fotos").
5. **Hasta 10 por corrida** (`TOPE_POR_CORRIDA`). No es por día: con una
   corrida cada media hora, el banco se completa solo en un par de horas sin
   gastar de una todo el cupo que también usa la lectura con IA (comparten la
   clave `GEMINI_API_KEY_CLASIFICACION`).

### 3. Las fotos candidatas

`candidatasDeNota()` (`ingesta/fotos.mjs`): por cada fuente de la nota (las
"Fuentes consultadas"; si no hay, el enlace principal) se abre **la página de
la nota original** y se toma la foto que el propio medio marca como principal
(`og:image` o, si no está, `twitter:image`: la que el medio eligió para que
WhatsApp y Facebook muestren su enlace). No se usa la imagen que traía el feed.

Cada foto se baja (`descargarImagen`): 20 segundos como máximo, sólo si la
respuesta es una imagen y pesa menos de 6 MB (`TAMANO_MAXIMO`). Una fuente
cuya página o foto no se pudo bajar queda afuera de la comparación.

### 4. La comparación con IA

Con las fotos que se pudieron bajar (aunque sea una sola), se hace **un pedido
a Gemini** (`gemini-flash-lite-latest`, temperatura 0) con todas las imágenes,
cada una con una letra (A, B, C…) y el medio que la publicó. La instrucción
(`instruccion()`, en `ingesta/fotos.mjs`) le pide:

- **elegir la que mejor ilustra la nota**: encuadre y nitidez, que se
  identifique el hecho, sin gente irreconocible de más ni nada de mal gusto;
  entre dos casi iguales, la de mejor calidad;
- **mirar cada foto entera buscando una marca de agua**: un logo, un nombre o
  una marca que **el medio agregó** después de sacarla (casi siempre en una
  esquina, a veces semitransparente), con **más atención en los medios locales
  y de la zona**, que son los que más lo hacen (Hernán, 28/09);
- **no confundirla con lo que ya estaba en la escena**: el cartel de un
  sponsor, el escudo de un club, el nombre de un evento o una pantalla no son
  marca de agua ("¿podría estar en una foto que sacó cualquier otra persona
  presente ese día?");
- **el nombre de otro medio que estaba en la escena tampoco es marca** (30/09).
  Del 28 al 30/09 sí lo era (la nota de Reino sobre el Fangio tenía el micrófono
  de "Radio Líder 90.9" y se decidió descartar esas fotos), pero muchas notas
  quedaban sin foto y el 30/09 se decidió: "lo del micrófono no hay problema que
  salga". Sí es marca lo que un medio **le pegó encima** a la imagen aunque no
  esté en una esquina: el zócalo o el logo de un canal (una captura de la tele),
  un recuadro o una placa con su nombre;
- **marcar a los menores** (28/09): si aparece alguien que parece menor de 18 y
  se lo reconoce, aunque esté en un grupo o un equipo, la foto lleva `menor` y
  no se elige; ante la duda, es menor;
- **nunca elegir una foto marcada**: si la mejor tiene marca o un menor, elegir
  la mejor entre las que no tienen ninguna de las dos, aunque no sea la ideal;
  dejar la elección vacía sólo si ninguna está libre.

Devuelve la letra elegida, una frase con el porqué y, por cada foto, si tiene
marca, si tiene un menor y qué vio. El código no confía: una foto con `menor`
se trata igual que una con marca (`interpretarRespuesta`).

### 5. La red de seguridad sobre la respuesta

`interpretarRespuesta()` no confía a ciegas en la letra que eligió la IA:

- si la IA eligió una foto **que ella misma marcó con marca de agua**, se usa
  la primera candidata sin marca en su lugar; si no hay ninguna, no se elige
  nada;
- si la letra no corresponde a ninguna foto que se haya podido bajar, no se
  elige nada.

### 6. Si Gemini falla: Groq

Si Gemini falla o se queda sin cupo, el mismo pedido va a **Groq**
(`GROQ_API_KEY`) con un modelo con visión, `qwen/qwen3.8-27b`
(`MODELO_GROQ_VISION`; Llama 4 Scout dejó de estar el 28/09). Groq acepta **como
mucho 3 imágenes por pedido**, así que se comparan las tres primeras. Si las dos
fallan, la nota queda sin foto. Nunca se usa la clave paga de redes.

### 7. Si ninguna foto sirve: Wikimedia Commons

Idea de Hernán del 28/09, al ver el caso de Mariano Werner (una sola fuente,
con marca de agua, y una persona fácil de identificar):

1. Se le pregunta a Gemini, sólo con el título y la bajada, si la nota es
   **centralmente sobre una sola persona pública identificable** (un
   deportista, un funcionario, alguien con página en Wikipedia) y cómo se
   llama (`personaPublicaDeNota`). Si es sobre un hecho, una institución o
   varias personas, no se sigue.
2. Se busca en Wikimedia Commons una foto con ese nombre en el título del
   archivo (`buscarFotoWikimedia`, sin clave y sin costo), y se toma la
   primera que sea JPEG o PNG, de al menos 400 × 300 píxeles, y con una
   **licencia libre** (CC0, CC BY, CC BY-SA o dominio público:
   `WIKIMEDIA_LICENCIAS_LIBRES`). Lo que tiene "todos los derechos reservados"
   se descarta.

De Commons se guarda también **el autor** (`extmetadata.Artist`, pasado a
texto por `textoPlano`), y el crédito dice autor y licencia, como piden CC BY y
CC BY-SA: "Foto: *autor* / Wikimedia Commons (CC BY-SA 4.0)" (`creditoDeFoto`,
`ingesta/fotos.mjs`, 28/09). La foto de un medio dice "Foto: *medio*".

El 28/09 había 3 fotos de Wikimedia en el banco (Mariano Werner y dos de
Colapinto), las tres CC BY-SA 4.0, guardadas **antes** de ese arreglo: su
crédito sigue diciendo sólo "Foto: Wikimedia Commons" (`PENDIENTES.md`).

### 8. Qué se guarda en el banco

Si hay foto elegida, se vuelve a bajar **sólo esa** y se guarda tal cual,
como archivo propio del sitio: `web/public/fotos-notas/<id de la nota>.<jpg,
png o webp>`. Cloudflare Pages la sirve como cualquier archivo del sitio. El
workflow la sube al repositorio junto con el resto de los datos.

**Se guarda achicada (29/09).** Antes la foto se guardaba tal cual la bajaba el medio (hasta
3.778 × 2.126 y 1,8 MB) y el repositorio crecía unos 25 MB por día. Ahora `fotoParaGuardar`
(`web/scripts/achicar-foto.mjs`, con el ffmpeg del proyecto) la pasa a **JPEG de hasta 1.200 px de ancho**;
si no se puede achicar o queda más pesada, se guarda la original. Las 48 fotos pesadas que ya
estaban en el banco se achicaron una vez (`web/scripts/achicar-fotos-existentes.mjs`): de 32,7 a
6,0 MB. Las fotos se sirven con caché de una semana (`web/public/_headers`).

**Las fotos que se quedan sin nota se borran** (28/09, `podarFotos`): en cada
corrida de la nube, la de una nota retirada a mano (`retiradas.json`: puede
haberse retirado por un menor o una víctima) y la de una nota que ya no está en
el archivo, la portada ni la ingesta. La entrada del banco queda sin `archivo`
y con `borrada: true`, para no volver a gastar cupo en esa nota. Ojo: el
repositorio es público y el historial de git guarda la foto borrada; si una
foto no tenía que estar nunca, hay que pedir que la limpien del historial.

En `web/data/banco-fotos.json`, una entrada por nota:

| Campo | Qué es |
|---|---|
| `archivo` | La ruta de la foto guardada (`fotos-notas/1is0p0y.jpg`) |
| `medio` | De quién es la foto (el medio, o "Wikimedia Commons") |
| `credito` | Lo que se muestra debajo: "Foto: *medio*" |
| `licencia` | La de Wikimedia; `null` para las de un medio |
| `autor` | Sólo en las de Wikimedia guardadas desde el 28/09 |
| `origen` | `medio`, `wikimedia`, `ninguna` o `error` |
| `titulo` | El título de **nuestra** nota |
| `enlace` | La nota del medio de donde salió (o la página de Wikimedia) |
| `imagenOriginal` | La dirección original de la imagen |
| `razon` | Por qué se eligió (lo que dijo la IA, o por qué se usó otra sin marca) |
| `cuando` | Cuándo se probó |

Las notas probadas **sin** foto quedan con `intentado: true`, el origen, el
título, la razón y la fecha (o el error). Ejemplo real:

```json
"1is0p0y": {"archivo":"fotos-notas/1is0p0y.jpg","medio":"QZ Noticias (Mar del Plata)","credito":"Foto: QZ Noticias (Mar del Plata)",
            "licencia":null,"origen":"medio","titulo":"Diego Santilli visita el autódromo en la vuelta de las categorías nacionales",
            "enlace":"https://www.qznoticias.com/la-region/diego-santilli-visito-el-fangio-…","cuando":"2026-09-28T03:52:09Z"}
```

El 28/09 a la tarde el banco tenía 141 notas probadas: 99 con foto (96 de un
medio, 3 de Wikimedia), 38 sin ninguna que sirviera y 4 con error.

### 9. Dónde se muestra: la página de la nota

`fotoDeLaWeb()` le pasa a la nota sólo `{ archivo, credito }` (campo `foto`).
Viaja en `web/data/portada.json` y `web/data/archivo.json`, así la foto sigue
en la página aunque la nota salga de la portada.

En `web/app/nota/[id]/page.js`, **entre la bajada y el cuerpo**: la imagen a lo
ancho de la columna (hasta 480 píxeles de alto, recortada por la página para
llenar ese espacio) y, debajo, el crédito en cursiva gris ("Foto: Radio Gabal
(FM 104.1)"). **El crédito aparece una sola vez, en el epígrafe, nunca adentro
de la imagen.** Sin foto no va nada: no hay placa de sección grande de
respaldo, a propósito (repetía la etiqueta de arriba sin ningún dato).

La prueba `pruebas/fotos-notas.test.mjs` cuida que la foto sea condicional,
que salga del banco y no de la fuente, y que el crédito esté una sola vez.

### 10. Dónde NO se muestra

- **Instagram:** la imagen de cada posteo (`web/app/nota/[id]/instagram.png`)
  lleva la foto del banco desde el 28/09 (`FOTO_EN_INSTAGRAM = true`,
  `web/lib/tarjeta-diseno.js`). Sin foto que sirva, sale la placa sin foto. Lo
  leen la imagen y el texto del posteo (`redes/publicar.mjs`), así nunca va un
  crédito sin foto ni una foto sin crédito: el posteo suma "Foto: *medio*" al
  final (`conCreditoDeFoto`, `redes/elegir.mjs`). Para volver a la placa en
  todos: `false`.
- **Facebook y la tarjeta para compartir enlaces** (WhatsApp, Facebook:
  `opengraph-image.js`): la foto del banco a la izquierda y el título a la
  derecha desde el 28/09 (`FOTO_EN_ENLACE` en `web/lib/tarjeta-diseno.js`), sin
  el crédito adentro: está en el epígrafe de la página. Sin foto, la banda de
  color con los anillos.
- **Podcasts, historias y reels:** placas de datos (`reels/placa.mjs`): no cuentan una sola nota, así que no llevan foto.
- **La imagen que trae la ingesta de cada fuente** (`imagen`) no se publica en
  ningún lado: sólo suma 6 puntos de relevancia como señal de que la nota está
  trabajada.

Ver `docs/07-REDES.md`.

### 11. Lo que nunca lleva foto real

- **Lo que identificaría a un menor o a una víctima**: lo frena el semáforo
  rojo antes de publicarse, así que nunca llega a esta etapa (pero ver "Qué
  puede fallar").
- **Policiales**, salvo que la fuente sea oficial (paso 2).
- **Una foto inventada por IA que parezca real**: el sistema no genera fotos.

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `web/scripts/fotos-notas.mjs` | A qué notas se les prueba foto (`elegirFotosNuevas`, `elegiblePorSeccion`, `TOPE_POR_CORRIDA`; sólo en la nube) y qué se guarda; `fotoDeLaWeb` y `conFotosDelBanco` (las ya guardadas, nube y PC) | `generar-datos.mjs` | El banco anterior | Devuelve el banco nuevo y los archivos |
| `ingesta/fotos.mjs` | Candidatas (`og:image`), descarga, comparación con Gemini o Groq, red de seguridad contra la marca, persona pública y Wikimedia (`elegirFotoParaNota`) | `fotos-notas.mjs` | Las páginas de los medios, las APIs de Gemini, Groq y Wikimedia | — |
| `web/scripts/generar-datos.mjs` | Dispara todo y escribe los archivos | `actualizar.yml` | `banco-fotos.json` | `web/data/banco-fotos.json`, `web/public/fotos-notas/`, el campo `foto` de cada nota |
| `web/data/banco-fotos.json` | El banco: qué nota se probó y con qué resultado | — | — | — |
| `web/public/fotos-notas/` | Las fotos elegidas | — | — | — |
| `web/app/nota/[id]/page.js` | Muestra la foto y el crédito | La web al compilar | `portada.json`, `archivo.json` | — |
| `web/lib/tarjeta-diseno.js` | `FOTO_EN_INSTAGRAM` (prendido desde el 28/09) y `fotoDeLaNota` | Tarjeta de Instagram, `redes/publicar.mjs` | — | — |
| `redes/elegir.mjs` | `conCreditoDeFoto`: el crédito en el texto del posteo, si la imagen lleva foto | `redes/publicar.mjs` | — | — |
| `reels/claves.mjs` | `claveClasificacion` y `claveGroq` | `ingesta/fotos.mjs` | `.env`, variables | — |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Probar más o menos notas por corrida | `TOPE_POR_CORRIDA` (`web/scripts/fotos-notas.mjs`) |
| Que otra sección no lleve foto, o que Policiales lleve | `elegiblePorSeccion` (`web/scripts/fotos-notas.mjs`) |
| Cambiar qué mira la IA (marca de agua, calidad, qué es de la escena) | `instruccion()` en `ingesta/fotos.mjs` |
| Cambiar el modelo | `MODELO_GEMINI` y `MODELO_GROQ_VISION` (`ingesta/fotos.mjs`) |
| Qué licencias de Wikimedia se aceptan | `WIKIMEDIA_LICENCIAS_LIBRES` (`ingesta/fotos.mjs`) |
| Que una nota vuelva a probarse | Borrar su entrada de `web/data/banco-fotos.json` |
| Sacar una foto que no debía salir | Borrar la entrada del banco y el archivo de `web/public/fotos-notas/`, **y** agregar la nota al banco con `"intentado": true` para que no se vuelva a elegir la misma |
| Que el espejo de Instagram lleve (o no) la foto del banco | `FOTO_EN_INSTAGRAM` (`web/lib/tarjeta-diseno.js`; hoy `true`) |
| Cómo se ve en la página | El bloque `{n.foto && …}` de `web/app/nota/[id]/page.js` |

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| **La foto no se recorta de verdad** | El archivo se guarda entero, tal como lo publicó el medio. Lo único que "recorta" es la página, que la ajusta a 480 píxeles de alto: si hubiera un logo en una esquina, puede quedar a la vista, y el archivo en `fotos-notas/` lo conserva | La única defensa contra la marca de agua es que la IA la vea. Revisar el banco a ojo cada tanto, empezando por los medios locales y de la zona |
| La IA no ve una marca de agua | Una foto con el logo de otro medio en la página de una nota | Sacarla del banco (tabla de arriba) y anotar el caso |
| El crédito de una foto de Wikimedia guardada antes del 28/09 | La página dice sólo "Foto: Wikimedia Commons" (lo nuevo ya lleva autor y licencia) | Completar a mano `credito` y `autor` de esas tres entradas del banco (`PENDIENTES.md`) |
| **Una nota amarilla aprobada por una persona puede llevar la foto de un chico** | La exclusión de menores y víctimas depende del semáforo rojo; las notas amarillas por "niño", "adolescente" o "alumno de" que una persona publica desde el panel sí se prueban (sólo Policiales está excluida) | Mirar la foto al aprobar una nota así, o sumar la regla a `elegiblePorSeccion` |
| La elegida no se pudo volver a bajar | Entrada con `"error":"no se pudo volver a bajar la elegida"`; esa nota no se vuelve a probar nunca | Borrar la entrada para que se reintente |
| Una nota sin foto que después cuentan más medios | Se probó con los medios de ese momento y quedó `intentado`: no se vuelve a probar aunque aparezca una foto mejor | Borrar la entrada si importa |
| Gemini y Groq sin cupo | "fotos: N notas nuevas probadas (0 con foto)"; entradas con la razón "Gemini falló…" o "Groq también falló…", que ya no se reintentan | Borrar esas entradas cuando vuelva el cupo |
| La IA de fotos le gana cupo a la lectura con IA | Comparten `GEMINI_API_KEY_CLASIFICACION`: diez pedidos con imágenes por corrida se suman a los de las fichas | Si falta cupo, bajar `TOPE_POR_CORRIDA` |

## Lo que sigue abierto

`CRITERIO-EDITORIAL.md` § 2 ("Las fotos") pide cosas que el código no hace:
una foto propia, oficial, de stock o una ilustración "por defecto" (sin foto
elegida la página va sin imagen), "recortar" la foto de otro medio (se guarda
entera y la página sólo la encuadra) y revisarla a ojo antes de guardarla (lo
hace sólo la IA). Hay que alinear el criterio o el código: está en
`PENDIENTES.md`, con lo de las fotos de chicos en notas amarillas aprobadas y
los tres créditos viejos de Wikimedia.

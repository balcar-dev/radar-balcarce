# Las voces nuevas con la clave paga de Google (procedimiento)

*Escrito el 18/10/2026 (regla 302), a pedido de Hernán: cuando venga la clave paga de Gemini TTS, "tratar de imitar lo que más se pueda a los locutores
actuales; si se modifican levemente no hay problema". **Esto es sólo el procedimiento y las herramientas: no se corrió nada, no se llamó a Gemini y
no se gastó ni un audio.** Quien lo corre es una persona (Hernán o Andrés), porque la clave la pega una persona y nunca se pone en un chat.*

## Por qué hay que volver a crear las voces

Las dos voces de Radar Balcarce (la **locutora**, `voice_v8mf7jt16hch`, y el **locutor**, `voice_cdljkn0jpmk6`; `CRITERIO-REDES.md` § 6) se crearon el 29/09
con Voice Design de Gemini 3.8 **dentro del proyecto de Google de la clave gratis de redes**. Un identificador de voz sólo existe en el proyecto donde se creó:
con una clave de **otro proyecto** (la paga) esos dos `voice_…` no existen y las piezas no podrían hablar. Y Voice Design **no devuelve dos veces la misma voz**:
la misma descripción da una voz parecida, no igual. Por eso el camino es: crear varias versiones con las **mismas descripciones**, medir cuál se parece más a la
voz de hoy y confirmar de oído.

## Qué ya existe (no hay que escribir nada)

| Qué | Dónde | Para qué |
|---|---|---|
| Workflow **Crear voces** (`crear-voces.yml`), a mano | Actions → "Crear voces" → Run workflow | Corre `reels/crear-voces.mjs` con el modo que se elija y sube los audios como artefactos (7 días) |
| Modo **`referencia`** (nuevo) | `reels/crear-voces.mjs` | Dice el texto de comparación con las voces de **ahora** (los ids de `CRITERIO-REDES.md` § 6) y el estilo de producción: 2 audios. Guarda `locutora.mp3`, `locutor.mp3` y `referencias.json` en `reels/referencias-de-voz/` |
| Modo **`recrear`**, con `versiones` (nuevo) | `reels/crear-voces.mjs` | Crea `versiones` versiones (2 a 6, por defecto 2) de la locutora y del locutor con **las mismas descripciones** de siempre (`mujer-c` y `hombre-a`), dice el texto de comparación con cada una y las compara sola con la referencia |
| Modo **`comparar`** (nuevo) | `reels/crear-voces.mjs` | Repite esa comparación con lo que ya hay en `reels/salida/voces/`, **sin llamar a Gemini: cuesta 0** |
| La prueba de parecido | `reels/parecido-de-voz.mjs` (también por línea de comandos, con cualquier audio o video) | Mide ritmo, tono, rango, brillo, pausas y duración, y elige la mejor |
| El texto de la prueba | `reels/texto-de-comparacion.mjs` | Siempre el mismo (81 palabras: un repaso de la noche, con números, nombres, la dirección dicha y el cierre) para que dos audios de días distintos se puedan comparar |
| Proteger las voces de hoy | `reels/crear-voces.mjs` (`VOCES_DE_PRODUCCION`) | Una voz de producción no se borra sin escribir `:borrar-de-produccion` |

## Qué se compara, y cómo se elige

Cada candidata se mide contra el audio de la voz de hoy. Cada diferencia se convierte en una **penalización de 0** (idéntica) **a 1** (tan distinta que ya
es otra voz) y el **parecido** es 100 menos el promedio pesado. Los límites y pesos están en `MEDIDAS` (`reels/parecido-de-voz.mjs`):

| Medida | Qué es | Peso | Penalización 1 (límite) |
|---|---|---|---|
| **Ritmo** | palabras por segundo de toda la pieza (el número que usa el presupuesto de los repasos: `PODCAST_VOZ.palabrasPorSegundo`, 2,4) | 25 | 15 % de diferencia |
| **Tono** | altura de la voz: mediana de su frecuencia fundamental, en semitonos | 30 | 3 semitonos (pasar de una voz a otra) |
| **Rango** | cuánto sube y baja la voz (de lo más grave a lo más agudo) | 10 | 50 % de diferencia |
| **Brillo** | centro de gravedad del espectro: voz más "abierta" o más "oscura" | 10 | 25 % de diferencia |
| **Pausas** | cuánto del tiempo hablado es pausa (de 0,25 s o más) | 15 | 12 puntos porcentuales |
| **Duración** | segundos totales, sólo porque los dos audios dicen el mismo texto | 10 | 10 % de diferencia |

**Cómo se elige la mejor de varias:** gana la de más parecido. Si dos quedan a menos de 3 puntos, gana la de **ritmo más cercano** (el ritmo mueve cuánto dura
cada pieza y entra en el presupuesto de 55 segundos de los repasos) y después la de tono más cercano. Una candidata con alguna medida **en el límite** (tono a
3 semitonos o más, ritmo a 15 % o más…) sólo gana si no hay otra. **La última palabra la tienen el oído de Hernán y de Andrés con las dos primeras de cada voz**:
las cuentas sirven para no escuchar doce audios, no para reemplazar el oído.

## El paso a paso, con cuántos audios gasta cada uno

**Paso 0 · la referencia (2 audios, ANTES de cambiar la clave).** Con la clave de hoy (la gratis, que es la única donde existen las voces actuales), Actions →
"Crear voces" → modo `referencia`. Conviene un día de poco uso y de noche, después del último repaso (cada audio sale del cupo gratis de 10 por día). Se
descargan los artefactos y **se guardan en el repositorio** (`reels/referencias-de-voz/locutora.mp3`, `locutor.mp3` y `referencias.json`: unos 500 KB en total;
lo sube una persona con un commit, porque el workflow no escribe en el repositorio). Si no se quiere gastar ni esos dos audios, hay una salida sin costo: bajar el
audio de **un reel ya publicado de cada voz** y ponerlo en esa carpeta con esos nombres. La comparación funciona igual (el ritmo, el tono, el rango, el brillo y
las pausas no dependen del texto); lo único que se pierde es la medida de duración, que sólo cuenta cuando los dos dicen lo mismo.

**Paso 1 · la clave (Hernán, 0 audios).** Pegar la clave paga como secreto `GEMINI_API_KEY_REDES` en
`https://github.com/radarbalcarce/radar-balcarce/settings/secrets/actions` (la clave **nunca** se pega en un chat ni en el código). Antes, en Google AI Studio →
Gasto, **ponerle un límite mensual** (`docs/08-INFRAESTRUCTURA.md`, "Lo que cuesta"). Esa clave tiene que ser del proyecto donde se van a crear las voces: es donde
van a quedar guardadas (hasta 200 por proyecto, un año).

**Paso 2 · crear y probar las candidatas (8 audios).** Actions → "Crear voces" → modo `recrear`, `versiones` = `2`. Crea 2 versiones de la locutora y 2 del locutor
(cada versión gasta 2 audios del cupo: la muestra que Google devuelve al crearla y el texto de comparación) y, al final, las compara con la referencia. En los
artefactos quedan los mp3, `voces-creadas.json` (con los ids `voice_…` de cada versión), **`comparacion.md`** y `comparacion.json`. Si por algún motivo faltó la
referencia en el repositorio, la comparación se puede repetir después, sin gastar nada, con el modo `comparar` (o con
`node reels/parecido-de-voz.mjs referencia.mp3 candidata1.mp3 candidata2.mp3 --palabras=81 --mismo-texto`).

**Paso 3 · elegir (0 audios).** Abrir `comparacion.md`. Escuchar las **dos primeras de cada voz** con la referencia al lado. Si la mejor tiene **menos de 80 de
parecido** o alguna medida "en el límite", repetir el modo `recrear` con `versiones` = `4` (16 audios; Voice Design da una voz distinta cada vez); no más de dos
rondas. Un parecido de 85 a 95 con el tono a menos de un semitono es "la misma voz con un leve cambio", que es lo que se pidió.

**Paso 4 · poner las voces nuevas (0 audios).** Cambiar los dos identificadores en `CRITERIO-REDES.md` § 6 (las marcas `VOZ:LOCUTORA` y `VOZ:LOCUTOR`) y en
`VOCES_DE_PRODUCCION` de `reels/crear-voces.mjs` (una prueba, `workflows-fijos.test.mjs`, controla que digan lo mismo). **Anotar el nuevo vencimiento** (un año
después de crearlas): `VENCIMIENTOS` en `redes/vigilar.mjs`, la fila de `docs/08-INFRAESTRUCTURA.md` y `PENDIENTES.md`. Correr `npm test`.

**Paso 5 · confirmar con la voz en producción (hasta 8 audios).** Actions → "Auditar voz" (`reels/auditar-voz.mjs`): dice unos clips con la ruta de producción y
comprueba que se oiga "Radar Balcarce", que "punto com" nunca sea "punto ar" y que el saludo sea el de la hora. Después, escuchar la primera pieza real del día.

**Paso 6 · volver a medir el ritmo (0 audios).** Si el ritmo real de las voces nuevas difiere más de 5 % del de hoy (`reels/parecido-de-voz.mjs` lo imprime en la
columna "Ritmo"), actualizar `PODCAST_VOZ.palabrasPorSegundo` (hoy 2,4) y `VOZ.palabrasPorSegundo` (2,5) **en `ingesta/criterio.mjs` y en la tabla de `CRITERIO-REDES.md` § 5**
(una prueba controla que digan lo mismo): de eso depende cuántas notas entran en 55 segundos.

**Paso 7 · limpiar (0 audios, opcional).** Las candidatas que no se eligieron ocupan lugar en el proyecto (200 por proyecto): `borrar` con su id.

**Gasto total.** Mínimo: **2 audios** de referencia (con la clave de hoy) + **8 audios** de `recrear` con 2 versiones + hasta 8 de la auditoría = 10 antes de elegir y
hasta 18 con la confirmación. Con una segunda ronda de 4 versiones, 16 más. Lo que se mide después de tener los audios (`comparar`, `parecido-de-voz.mjs`) no cuesta nada.

## Cómo se lee `comparacion.md`

Una tabla por voz, con la candidata más parecida arriba. Ejemplo (inventado, para mostrar el formato):

| # | Candidata | Parecido (de 100) | Ritmo (pal/s) | Tono | Rango | Brillo | Pausas | Estado |
|---|---|---|---|---|---|---|---|---|
| 1 | hombre-a-v2-podcast.mp3 | **91,4** | 2,38 (-1 %) | 112 Hz (0,4 st) | 6 % | -3 % | 14 % | ok |
| 2 | hombre-a-v1-podcast.mp3 | **78,0** | 2,71 (13 %) | 121 Hz (1,3 st) | -22 % | 9 % | 9 % | ok |

"st" son semitonos de diferencia con la voz de hoy; los porcentajes de ritmo, rango y brillo son contra la referencia. "En el límite" quiere decir que esa medida
llegó a la penalización 1.

## Riesgos y lo que no cubre

- **Las cuentas no reemplazan al oído.** Miden altura, ritmo, pausas y brillo; no miden la sonrisa, el acento ni la "personalidad". Por eso siempre se escuchan las dos primeras.
- **Voice Design no repite.** Con dos versiones puede que ninguna llegue a 80; para eso están la segunda ronda y el tope de dos rondas.
- **La referencia tiene que existir antes de cambiar la clave.** Si se cambia el secreto primero, las voces de hoy dejan de poder hablar con esa clave y la referencia sólo se puede sacar de reels ya publicados (la salida sin costo del paso 0).
- **El cupo contador sigue en 10 audios por día** (`AUDIOS_POR_DIA` en `reels/cupo-voz.mjs`, `CRITERIO-REDES.md` § 2 y la regla 208): con una clave paga ese tope deja de ser real y hay que decidir si se sube (es una decisión de Hernán y Andrés, no algo que cambie este procedimiento).
- **Cada voz vence al año de crearse.** Anotarlo (paso 4): el vigilante avisa 30 días antes.
- **El estilo** (`CRITERIO-REDES.md` § 6, en inglés y corto) se queda como está: la referencia y las candidatas se dicen con el mismo estilo de producción de la noche, así que la comparación es justa.
- **La prueba mide voces con pausas largas bien y audios con música mal:** los audios de esta prueba no llevan música (la cortina se sacó el 29/09).

# 02 · La ingesta: de dónde salen las noticias y cómo se leen

*Escrito el 28/09/2026 contra el código de ese día. Si el código cambia, manda el código.*

Este documento cuenta el primer tramo del recorrido de una noticia: desde que
se sale a buscar a los medios hasta que cada hecho queda armado como una
"historia" con sus fuentes, lista para que se decida si sale y dónde. Qué se
decide después está en `docs/03-SELECCION.md`; cómo se escribe, en
`docs/04-REDACCION.md`; las fotos, en `docs/05-FOTOS.md`.

## En una frase

Cada media hora se leen 214 feeds de 91 medios, se descarta lo que por su
sección nunca le importaría a Balcarce, se juntan las notas de distintos medios
que cuentan el mismo hecho (el "cruce de medios") y de cada hecho queda una
sola historia con todas sus fuentes numeradas.

### Tres palabras antes de empezar

- **Feed (o fuente):** una dirección que se lee. Un mismo medio puede tener
  varias (TN tiene la general, Política, Economía, Deportes, Sociedad y el
  índice de noticias).
- **Medio:** el diario, la radio o el organismo. Todos los feeds de un mismo
  medio llevan el mismo nombre en el campo `medio`, para que un medio cuente
  una sola vez aunque llegue por tres feeds.
- **Nota e historia:** una nota es lo que publicó un medio. Una historia es un
  hecho, con todas las notas de los distintos medios que lo contaron. Lo que
  termina publicado en Radar es una historia.

---

## El recorrido, paso a paso

### 1. Quién la dispara

- **En la nube (lo normal):** el workflow "Actualizar la web"
  (`.github/workflows/actualizar.yml`) corre a los minutos 7 y 37 de cada hora
  (lo dispara cron-job.org) y ejecuta `web/scripts/generar-datos.mjs`. Ese
  script se da cuenta de que no está en la PC del panel (no existe
  `panel/datos/ultima.json`) y llama a `ingestar()` de `ingesta/ingesta.mjs`.
  Le pasa `idsConocidos`: los identificadores de todo lo que ya está en
  `web/data/portada.json` y `web/data/archivo.json`, para que una nota ya
  publicada no cambie de dirección (paso 12).
- **En la PC:** el panel (`panel/servidor.mjs`) corre la misma `ingestar()`
  cada 10 minutos, con las fuentes tal como estén en el panel (pesos
  cambiados o pausadas). Ver `docs/09-PANEL.md`.
- **A mano:** `node ingesta/ingesta.mjs` corre todo y deja el resultado en
  `ingesta/salida/` (`portada.json`, `preview.html`, `farmacias-crudo.txt`).

### 2. La lista de fuentes

Las fuentes viven en dos archivos de código y se juntan en una sola lista,
`TODAS_LAS_FUENTES` (`ingesta/ingesta.mjs`):

| Lista | Archivo | Cuántas | Qué son |
|---|---|---|---|
| `FUENTES` | `ingesta/fuentes.mjs` | 11 | Los medios de Balcarce y la Municipalidad |
| `FUENTES_NACIONALES` | `ingesta/fuentes.mjs` | 47 | Región, provincia, nacionales y temáticas "de siempre" (4 apagadas: Infobae Teleshow, Minuto Uno Espectáculos, Hipertextual y Xataka) |
| `FUENTES_CRUCE` | `ingesta/fuentes-cruce.mjs` | 160 | Las del cruce de medios, una por línea, de 71 medios |

**Total: 218 configuradas, 214 activas, de 91 medios distintos** (contado
contra el código el 28/09). Se leen sólo las que no dicen `activa: false`.

Por tipo de lectura (activas): 174 RSS, 7 Atom, 30 índices de noticias
(`sitemap`) y 3 páginas que se raspan (`scrape`: El Diario Balcarce, La
Vanguardia y Argenpapa). Por alcance: 12 de Balcarce (`local`), 31 de la región,
27 de la provincia y 144 nacionales.

Cada fuente es una ficha con estos datos:

| Campo | Qué dice | Para qué sirve |
|---|---|---|
| `id`, `nombre` | Identificador y nombre del feed | Registro y panel |
| `medio` | El nombre del medio, **igual para todos sus feeds** | Contar medios distintos en el cruce (`pruebas/cruce-coherente.test.mjs` lo controla) |
| `url` | Dónde se lee | — |
| `tipo` | `rss`, `atom`, `sitemap` o `scrape` | Cómo se lee (paso 4) |
| `alcance` | `local`, `region`, `provincia` o `pais` | Qué es de Balcarce, qué entra al filtro y al cruce |
| `ciudad` | De dónde es el medio (las de Balcarce y las nacionales no la llevan) | La lectura con IA la recibe (ver `docs/03-SELECCION.md`, paso 8) |
| `peso` | Cuánto suma a la relevancia: 30 a 24 los de Balcarce, 8 casi todos los nacionales, 7 a 16 el resto | Ordenar, nunca decidir si sale (ver `docs/03-SELECCION.md`, paso 3) |
| `oficial` | `true` si es un organismo público. Hoy son dos: la Municipalidad y el Gobierno de la Provincia | Verde en el semáforo y verificación ALTA |
| `seccion` | La sección fija si el feed ya viene separado por tema | Clasificar (ver `docs/03-SELECCION.md`, paso 2) |
| `temas`, `nota` | Descripción para humanos | Nada automático |
| `patronEnlace`, `base`, `prefijoTitulo` | Sólo en las que se raspan | Reconocer los enlaces a notas en el HTML |

`fichaDeFuente()` (`ingesta/fuentes.mjs`) deduce de esos campos el **tipo** de
fuente (oficial, medio de Balcarce, medio de la región, medio provincial,
nacional por sección o nacional general) y su **ciudad**.

La lista `CANDIDATOS` del mismo archivo son fuentes que se probaron y no
funcionaron (403, sin notas, sin feed): no se leen.

**El registro `FUENTES.md`.** Es la lista entera, en tablas, para leer sin
abrir el código. No se edita a mano: lo escribe `node ingesta/listar-fuentes.mjs`
a partir de las dos listas. La prueba `pruebas/fuentes-registro.test.mjs` falla
si alguien suma, saca o apaga una fuente y no vuelve a correr ese programa.

### 3. Bajar cada fuente

`traer()` (`ingesta/ingesta.mjs`) baja todas las fuentes **a la vez**, cada una
con un límite de 15 segundos y el User-Agent
`RadarBalcarce/0.1 (agregador local de noticias de Balcarce)`. Lee el texto
como UTF-8 y, si queda lleno de caracteres rotos, lo vuelve a leer como latin1
(varios sitios no declaran cómo están escritos).

Una fuente que falla no frena a las demás: queda anotada con `estado: 'error'`.
En GitHub, `generar-datos.mjs` escribe un aviso amarillo arriba de la corrida
("Fuente caída" o "Fuente vacía", si no trajo ninguna nota).

### 4. Leer cada tipo de fuente

**RSS y Atom** (`parsearFeed`). De cada entrada se toma:

- el **título** (sin etiquetas HTML y con las entidades traducidas por
  `decodificar`, de `ingesta/articulo.mjs`: una sola lista para todo);
- el **enlace**. En Atom se busca el enlace a la página (`enlaceAlternativo`):
  Blogger (Infórmese Primero) pone primero la entrada del feed, que es XML.
  Ese primer enlace se guarda aparte como `enlaceFeed`: con él se sigue
  calculando el identificador de la nota (para que no cambie ninguno ya
  publicado) y de ahí se baja el texto completo, que en Blogger viene entero;
- la **fecha** (`pubDate`, `published`, `updated` o `dc:date`). Sin fecha, o
  con una fecha que no se entiende, se pone la hora de ahora (ver paso 5);
- el **resumen** (`content:encoded`, `content`, `description` o `summary`),
  sin HTML. Si pasa de 400 caracteres, la nota queda marcada como
  `textoCompleto` (suma 4 puntos, ver `docs/03-SELECCION.md`);
- la **imagen** (enclosure, `media:content`, `media:thumbnail` o la primera
  `<img>` del resumen) y las **categorías** del medio.

**Índices de noticias** (`sitemap`, el que cada sitio arma para Google News).
Traen todo lo del día, no sólo las últimas 10 o 20 notas de un RSS, pero sin
resumen: en el cruce se comparan sólo por el título. `tituloDelSitemap` arregla
un caso real: La Tecla pone palabras sueltas en el título ("Vista",
"Bicameral seguridad") y el título de verdad en el epígrafe de la foto. Si el
título tiene cinco palabras o menos y el epígrafe es una frase de seis o más
que no empieza con "Foto", "Crédito" o "Gentileza", se usa el epígrafe.

**Páginas que se raspan** (`parsearScrape`, los medios sin feed). Se buscan en
el HTML los enlaces con la forma de una nota de ese medio (`patronEnlace`; por
defecto, direcciones que terminan en "-número"). Si la tarjeta trae un `<h2>`,
ése es el título (La Vanguardia pone la bajada en `<h3>`). `prefijoTitulo`
saca una etiqueta fija (Argenpapa pone "Argentina:" adelante de todo). Un
texto de menos de 25 o más de 140 caracteres no es un título: el 20/09 salió
publicado el "quiénes somos" de El Diario. Estas notas llegan **sin fecha ni
resumen** y quedan marcadas `fechaEstimada`.

### 5. Las fechas

Una nota sin fecha no puede competir con las que la tienen y, peor, parecería
de hoy en cada corrida. Por eso:

1. **Las páginas raspadas se abren una por una** (`ampliar`, de a 4 a la vez,
   12 segundos cada una). De los metadatos de la página se toma:
   - la bajada (`og:description` o `twitter:description`), si la nota no
     tenía y la bajada pasa de 40 caracteres;
   - el título entero (`og:title`), si el de la portada estaba cortado con
     puntos suspensivos;
   - **la fecha real** (`article:published_time` u `og:updated_time`), por
     vieja que sea, siempre que no sea de más de un día en el futuro;
   - la foto (`og:image`), sólo como señal de que la nota está trabajada:
     esa foto no se publica.
2. **Lo raspado de más de 72 horas no se trae** (`HORAS_DE_UNA_NOTA_NUEVA = 72`,
   `ingesta/ingesta.mjs`). El 27/09 la portada de El Diario Balcarce mostraba
   notas de 2025 que salían como de hoy. Una nota a la que no se le pudo sacar
   la fecha (la página no contestó) **sí entra**, con la hora de ahora y la
   marca "sin fecha en la fuente". Es sólo un colador grueso: los cortes de
   verdad (12 horas para estrenar, 36 en la portada) los hace la web, ver
   `docs/03-SELECCION.md`, paso 10.
3. **La primera vez que se vio cada nota** (`web/data/vistas.json`). Lo anota
   `generar-datos.mjs` en cada corrida, antes de decidir nada: por cada
   identificador, la primera hora en que apareció (o la que ya traía de la
   portada o el archivo, campo `visto`). Se poda a 7 días (`DIAS_DE_VISTAS`) y
   se escribe un identificador por renglón. Una nota "sin fecha en la fuente"
   usa esa hora como su fecha; una con fecha nunca puede ser más nueva que
   ella. Cómo se calcula la fecha final (`fechaReal`, `fechaDeLaNota`): ver
   `docs/03-SELECCION.md`, paso 10.

### 6. El filtro de entrada: lo que no se trae (sólo medios de afuera)

`motivoDeDescarte()` (`ingesta/ingesta.mjs`) mira cada nota de un medio de
afuera y devuelve por qué no entra, o nada. **Los medios de Balcarce nunca
pasan por acá: de ellos entra todo.** Mira dos cosas:

1. **El título, por el horóscopo** (`TITULO_HOROSCOPO`): "horóscopo",
   "números de la suerte", "predicciones para cada signo", "los astros
   anticipan", "qué le espera a cada signo". Se sumó el 28/09 porque Canal 26
   y El Día lo publican en secciones genéricas. Motivo: "consejo genérico".
2. **La sección que le puso el propio medio**, leída de la dirección de la
   nota (los tramos de `infobae.com/mexico/…`, sin contar el último, que es el
   nombre de la nota). Así un juego de palabras no engaña. La lista es
   `SECCIONES_QUE_NO_ENTRAN` (`ingesta/fuentes.mjs`):

| Motivo | Tramos de la dirección | Excepción |
|---|---|---|
| "de otro país" | `mexico`, `espana`, `peru`, `colombia`, `america`, `estados-unidos`, `venezuela`, `chile`, `uruguay`, `el-mundo`, `mundo`, `internacional`, `internacionales`, `futbol-internacional` | Entra igual si la fuente es de automovilismo, si nombra a una figura argentina (`FIGURAS`) o si el título tiene conexión argentina (`CONEXION_ARGENTINA`: argentina/o/s, Milei, Malvinas, Boca, River) |
| "policial de afuera" | `policiales`, `seguridad` | Ninguna: los policiales son sólo de Balcarce |
| "consejo genérico" | `autos`, `horoscopo`, `astrologia`, `recetas` | Ninguna |

El registro de "Actualizar la web" dice cuántas notas descartó cada fuente
("Clarín: 12 no entran por la sección del medio").

### 7. Las marcas de lo de afuera (`marcarDeAfuera`)

Toda nota de afuera que pasó el filtro recibe **una** de estas marcas, en este
orden (la primera que corresponda):

1. **`nombraBalcarce`**: el **título** del medio dice Balcarce o una localidad
   del partido (`PALABRAS_LOCALES`: balcarce, balcarceño, Napaleofú, Ramos
   Otero, Laguna La Brava, INTA Balcarce, autódromo Juan Manuel Fangio, museo
   Fangio…). Nombrarla en el texto no alcanza (27/09: una nota de Necochea que
   nombraba a Balcarce en una lista de localidades terminó en el podcast).
2. **`figura`**: el título o los primeros 400 caracteres nombran a una figura
   argentina de la lista `FIGURAS` (Messi, Scaloni, la Selección, Colapinto,
   Canapino, Cerúndolo, Los Pumas…). Se guarda el nombre encontrado.
3. **`deLaZona`**: el título o los primeros 600 caracteres tocan la zona sin
   nombrar a Balcarce (`PALABRAS_ZONA`: ruta 226, ruta 55, sudeste bonaerense,
   productores de papa, papa semilla, cosecha de papa…). Acá se exige la frase
   exacta, sin letras de más ("ruta 2260" no es la 226).

Qué hace cada marca con la nota se explica en `docs/03-SELECCION.md`, pasos 3,
5 y 6.

### 8. Los repetidos del mismo medio

Una misma nota puede llegar por dos feeds del mismo medio (la portada y la
sección, o el RSS y el índice de noticias). Antes del cruce se queda una sola:
la clave es el medio más el título sin tildes, sin signos y sin espacios.

### 9. La memoria del cruce

Para que una nota de esta corrida se junte con la que otro medio publicó hace
tres horas (y que ya no está en su feed), se guarda lo de afuera de las
últimas **36 horas** (`CRUCE.horasDeMemoria`, `ingesta/cruce.mjs`).

- **Dónde vive:** `.cache/cruce-memoria.json` (`MEMORIA_DEL_CRUCE`). No va al
  repositorio: en GitHub la guarda la caché de Actions entre corridas; en la
  PC, el mismo archivo.
- **Qué se guarda de cada nota** (`paraLaMemoria`): título, los primeros 400
  caracteres del resumen, enlace (y `enlaceFeed`), fecha, cuándo se vio,
  medio, fuente, alcance, si es oficial, sección fija, peso, imagen y
  categorías. **Sólo lo de afuera**: lo de Balcarce entra siempre, no hace
  falta recordarlo.
- **Al leerla** (`leerMemoria`) se descarta lo de más de 36 horas (por la
  fecha de la nota) y lo que ya vino en esta corrida (mismo enlace). Lo que
  queda vuelve como nota (`desdeLaMemoria`, marcada `deLaMemoria`, sin texto
  completo) y recibe otra vez sus marcas (paso 7).
- **Al guardarla** (`guardarMemoria`) se suma lo de afuera de esta corrida a
  lo de antes, sin repetir enlaces y sin lo vencido.

### 10. El cruce de medios: juntar las notas que cuentan el mismo hecho

`agruparPorHecho()` (`ingesta/cruce.mjs`) recibe todas las notas (las de esta
corrida más las de la memoria) y devuelve grupos. Sin IA y sin dependencias:
tarda segundos. Cómo compara:

1. **Las palabras de cada nota** (`palabrasDe`): el título **dos veces** (pesa
   el doble) y los primeros 400 caracteres del resumen, sin tildes, en
   minúscula, sólo palabras de tres letras o más y sin las palabras vacías
   (`VACIAS`: de, la, que, hoy, ayer, nuevo, dos, tres, hora…).
2. **TF-IDF**: cada palabra pesa más cuanto más rara es en el conjunto del día
   (una palabra que aparece en tres notas dice mucho; "gobierno", poco).
   Cada nota queda como una lista de palabras con su peso.
3. **Coseno**: la semejanza entre dos notas es un número de 0 a 1 (1 = las
   mismas palabras con los mismos pesos).
4. **Umbral 0,42** (`CRUCE.umbral`). Con 0,42 o más, las dos notas cuentan el
   mismo hecho. Se probó el 27/09 con 90 medios y 2.664 notas: con 0,25
   encadenaba cosas sin relación (`docs/CRUCE-DE-MEDIOS.md`).
5. **Para no comparar todas contra todas**, cada nota se compara sólo con las
   que comparten alguna palabra poco común. Una palabra que está en más del 5 %
   de las notas (`CRUCE.palabraComun`, y nunca menos de 3) no sirve para buscar
   parecidas, aunque sí cuenta en el cálculo.
6. **Dos notas del mismo medio nunca se juntan entre sí** directamente: un
   medio cuenta una vez.
7. **Los grupos se encadenan**: si A se parece a B y B a C, A, B y C son un
   solo grupo aunque A y C no se parezcan tanto.

### 11. Qué grupos quedan

Por cada grupo se mira qué medios lo cuentan (`ingestar`, paso 2 del código):

| El grupo… | ¿Queda? |
|---|---|
| Tiene al menos una nota de un medio de Balcarce | Sí |
| Tiene una nota de afuera con `nombraBalcarce` o `deLaZona` | Sí |
| Lo cuentan **dos medios distintos o más** | Sí (lo que pida su sección se decide después: `docs/03-SELECCION.md`, paso 6) |
| Lo cuenta **un solo medio** de afuera | **No se trae**, ni para esperar a una persona |
| Lo cuentan **sólo medios de la región** (Mar del Plata, Tandil, Necochea…), sin Balcarce en el título ni la zona | **No se trae**: "algo que sea sólo para Necochea no" (Hernán, 27/09) |

El registro de cada corrida dice: "cruce: N notas (M de la memoria) · H
historias · X de afuera con un solo medio y Y de otra ciudad de la zona no
entran".

Un grupo formado sólo por notas de la memoria (lo que ningún feed trae ya,
pero se publicó hace menos de 36 horas) sigue siendo una historia más.

### 12. La nota principal de cada historia

De cada grupo sale **una** nota principal: de ella salen el identificador
(y por lo tanto la dirección en la web), el título de partida, la fecha y el
enlace principal.

1. **¿La historia es de acá?** (`historiaDeAca`). Sí, si la cuenta algún
   medio de Balcarce y, además, o bien ningún medio de afuera la cuenta, o
   bien algún medio nombra a Balcarce (`nombraBalcarce` de afuera, o un medio
   de acá que la nombra en el título o en los primeros 600 caracteres:
   `mencionaBalcarce`). **Un medio de Balcarce que cuenta lo mismo que los
   nacionales sin nombrar nada de acá está copiando una noticia de afuera**
   (27/09: Malvinas, un incendio en Misiones, una pelea de UFC). Esa historia
   se rige por lo de afuera.
2. **Entre quiénes se elige:** si es de acá, entre las notas de los medios de
   Balcarce; si no, entre las de afuera.
3. **Cuál:** la que ya está publicada (su identificador está en
   `idsConocidos`), así la dirección no cambia cuando otro medio se suma a la
   historia. Si ninguna, **la que salió primero**.
4. **Lo que la principal toma de las demás:** el título entero si el suyo
   estaba cortado con puntos suspensivos; la fecha de otra si ella no tenía;
   la imagen; el resumen largo si ella no tenía texto completo; la marca
   `nombraBalcarce` y la figura, si alguna otra las tenía.

Después se guarda la memoria (paso 9).

### 13. Cómo queda armada cada historia

Antes de decidir nada, se sacan los policiales de afuera (ver
`docs/03-SELECCION.md`, paso 1). Del resto, cada historia queda como un objeto
con estos campos, que es lo que usan todos los pasos siguientes:

| Campo | De dónde sale |
|---|---|
| `id` | Un número corto calculado del enlace de la principal (`idDe`, con `enlaceFeed` si lo hay). Es estable: la misma nota da siempre el mismo |
| `titulo` | El de la principal. Si venía EN MAYÚSCULAS (75 % o más de las letras), pasa a mayúscula inicial conservando los nombres propios que aparecen bien escritos en el resumen y los de `NOMBRES_PROPIOS` (`sentenciar`) |
| `enlace`, `enlaceFeed` | Los de la principal |
| `fecha`, `cuando` | La de la principal; `cuando` dice "hace 3 h" o "sin fecha en la fuente" |
| `medio`, `medios` | El medio principal y la lista de medios distintos |
| `seccion`, `semaforo`, `motivo`, `relevancia`, `temas` | Ver `docs/03-SELECCION.md` |
| `imagen` | Sólo como dato: la imagen de la fuente no se publica (`teniaImagenLaFuente`). Las fotos, en `docs/05-FOTOS.md` |
| `resumenFuente` | El resumen de la principal limpio (`limpiarCopete`): sin la firma del medio al final ("… \| Diario La Vanguardia"), sin "leer más", sin repetir el título, cortado en 280 caracteres en el último espacio. Vacío si queda en menos de 40 |
| `fuentesTexto` | Los resúmenes limpios de las otras notas del grupo |
| `origenes` | **Cada fuente, en orden, la principal primero**: medio, enlace, fecha (null si no tenía), si es oficial y su resumen. Es lo que la IA recibe numerado ("Fuente 1, Fuente 2…"), lo que el lector ve en "Fuentes (N)" y con lo que se calcula el nivel de verificación (`docs/04-REDACCION.md`) |
| `local` | `true` si la principal es de un medio de Balcarce o dice Balcarce en el título (`esDeBalcarce`) |
| `figura`, `deLaZona`, `nombraBalcarce`, `alcance` | Las marcas del paso 7 y el alcance de la principal |

Además de las noticias, `ingestar()` trae el **clima** (Open-Meteo y, si
falla, `api.met.no`) y las **farmacias de turno** (Colegio de Farmacéuticos,
cruzado con La Vanguardia y Radio Gabal). Eso no es parte de este documento:
ver `docs/06-WEB.md`.

### 14. El texto completo de la nota original

Los feeds traen un resumen de unos 200 caracteres. Con eso la IA no tiene de
dónde escribir un cuerpo y rellena con datos inventados (23/09: 13 de 20
notas rechazadas). Por eso, **en el momento de escribir** (no en la ingesta),
se baja la página de la nota original. Lo hace `ingesta/articulo.mjs`:

1. **Cuándo y de qué fuente:** `textoCompletoDe()` (`reels/reescritura.mjs`)
   prueba primero la principal (su `enlaceFeed` si es Blogger) y, si no se
   pudo, hasta tres de las otras fuentes. Ver `docs/04-REDACCION.md`, paso 4.
2. **Bajar** (`traerTexto`): 8 segundos como máximo, User-Agent
   `RadarBalcarce/1.0 (+https://radarbalcarce.com)`. Si falla, devuelve nada
   y la nota se escribe sólo con los resúmenes.
3. **Sacar la nota del HTML** (`extraerTexto`):
   - Si es una entrada de un feed Atom (Blogger), el texto viene escapado
     adentro de `<content type="html">` y se lee de ahí (`parrafosDeAtom`).
   - Si es una página, primero se borran los bloques que nunca son la nota
     (`script`, `style`, `nav`, `header`, `footer`, `aside`, `form`, `svg`,
     `figure`…). Después se toman todos los párrafos `<p>` y se arman
     "tramos" de párrafos seguidos; entre dos párrafos de la misma nota puede
     haber hasta 6.000 caracteres de HTML (`SALTO_MAXIMO`: una publicidad o
     una foto en el medio). **Se queda con el tramo con más texto** (La Nación,
     Ámbito y Olé tienen varios `<article>` en la página y el primero no es la
     nota).
   - No cuentan los párrafos de menos de 50 caracteres, los de ruido
     (`RUIDO`: compartir, seguinos, suscribite, leé también, copyright,
     publicidad…) ni **las necrológicas** (`NECROLOGICA`: casa de duelo, sala
     velatoria, servicios de sepelio, inhumación). El Diario Balcarce pega
     debajo de cada nota su bloque de fallecidos, que era más largo que la
     nota: el 27/09 la IA escribió sobre sepelios en una nota de alumnos del
     San José.
4. **El largo:** como máximo 4.000 caracteres
   (`REESCRITURA.caracteresDelTextoCompleto`, `ingesta/criterio.mjs`); con
   menos de 300 se considera que no hay texto completo.

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `ingesta/fuentes.mjs` | Las fuentes de siempre, las palabras de Balcarce y de la zona, el filtro de entrada, las figuras, `fichaDeFuente` (y las reglas de sección y semáforo, ver 03) | Todo el motor | — | — |
| `ingesta/fuentes-cruce.mjs` | Las 160 fuentes del cruce, una por línea | `ingesta.mjs`, `lectura-ia.mjs`, `listar-fuentes.mjs` | — | — |
| `ingesta/listar-fuentes.mjs` | Escribe `FUENTES.md` desde el código | Una persona: `node ingesta/listar-fuentes.mjs` | Las dos listas | `FUENTES.md` |
| `ingesta/ingesta.mjs` | `ingestar()`: baja, lee, filtra, marca, cruza, elige la principal y arma cada historia (también clasifica y da el semáforo, ver 03) | `web/scripts/generar-datos.mjs` (nube), `panel/servidor.mjs` (PC), a mano | Las fuentes, la memoria | La memoria; con `node ingesta/ingesta.mjs`, `ingesta/salida/` |
| `ingesta/cruce.mjs` | Agrupa por hecho (TF-IDF, coseno, 0,42) y maneja la memoria de 36 horas | `ingesta.mjs` | `.cache/cruce-memoria.json` | `.cache/cruce-memoria.json` |
| `ingesta/articulo.mjs` | Baja la página original y saca el texto de la nota; `decodificar` traduce entidades HTML para todo | `reels/reescritura.mjs`, `ingesta.mjs` (sólo `decodificar`) | La página del medio | — |
| `web/scripts/generar-datos.mjs` | Dispara la ingesta en la nube y anota la primera vista | `actualizar.yml` | `portada.json`, `archivo.json`, `vistas.json` | `web/data/vistas.json` (y todo lo de 03 y 04) |
| `.github/workflows/actualizar.yml` | Corre todo cada media hora y guarda la caché de la memoria | cron-job.org | — | Los commits "Datos de la portada" |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Sumar, sacar o apagar una fuente de siempre | `FUENTES` o `FUENTES_NACIONALES` en `ingesta/fuentes.mjs` (`activa: false` para apagar). Después, `node ingesta/listar-fuentes.mjs` |
| Sumar, sacar o apagar una fuente del cruce | Una línea en `ingesta/fuentes-cruce.mjs`; mismo `medio` para todos los feeds de un medio. Después, `node ingesta/listar-fuentes.mjs` |
| Cambiar el peso de una fuente | Campo `peso` de su ficha (o, en la PC, desde el panel) |
| Que un medio sin feed se lea bien | `patronEnlace`, `base` y `prefijoTitulo` de su ficha; el parser es `parsearScrape` |
| Cuántas horas puede tener una nota raspada para entrar | `HORAS_DE_UNA_NOTA_NUEVA` (`ingesta/ingesta.mjs`) |
| Que una sección de un medio de afuera no se traiga | `SECCIONES_QUE_NO_ENTRAN` (`ingesta/fuentes.mjs`) |
| Qué cuenta como conexión argentina en el título | `CONEXION_ARGENTINA` (`ingesta/fuentes.mjs`) |
| Qué palabras hacen que una nota de afuera "diga Balcarce" | `PALABRAS_LOCALES` (`ingesta/fuentes.mjs`) — sólo nombres que no puedan aparecer de casualidad |
| Qué es "la zona" | `PALABRAS_ZONA` (`ingesta/fuentes.mjs`) |
| Qué figuras cuentan | `FIGURAS` (`ingesta/fuentes.mjs`) — con nombre y apellido si el apellido solo es ambiguo |
| Cuánto se parecen dos notas para ser el mismo hecho, o cuántas horas se recuerdan | `CRUCE` en `ingesta/cruce.mjs` (`umbral`, `horasDeMemoria`, `palabraComun`) |
| Qué palabras no cuentan en el cruce | `VACIAS` en `ingesta/cruce.mjs` |
| Un título de un índice de noticias que llega en palabras sueltas | `tituloDelSitemap` (`ingesta/ingesta.mjs`) |
| Un nombre propio que queda en minúscula al pasar un título de MAYÚSCULAS | `NOMBRES_PROPIOS` (`ingesta/fuentes.mjs`) |
| Qué partes de la página original no se leen como nota | `RUIDO` y `NECROLOGICA` (`ingesta/articulo.mjs`) |
| Cuánto texto completo recibe la IA | `REESCRITURA.caracteresDelTextoCompleto` en `ingesta/criterio.mjs` **y** la tabla de `CRITERIO-EDITORIAL.md` § 11 |

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| Un medio cambia su feed o lo cierra | Aviso amarillo "Fuente caída" en la corrida de GitHub; en el panel, la fuente en rojo | Buscar el feed nuevo o apagarla con `activa: false` |
| Un medio que se raspa rediseña su página | Aviso "Fuente vacía" (0 notas), sin ningún error | Ajustar su `patronEnlace` |
| Un feed sin fechas | La nota aparece con "sin fecha en la fuente" en el panel; en la web cuenta desde que se vio (`vistas.json`) | Nada: la primera vista la protege. Ojo: en la relevancia, una entrada de RSS o de un índice sin fecha recibe la hora de ahora y el premio de frescura en cada corrida (sólo las raspadas están marcadas como `fechaEstimada`) |
| Una página raspada no contesta al abrirla | La nota entra sin fecha real aunque sea vieja, y queda con la hora de la primera vista | Se corrige sola si la página contesta en otra corrida antes de que se publique |
| Se pierde la caché de Actions | El cruce arranca sin memoria: durante unas horas hay más notas "de un solo medio" que no entran | Nada: se rearma sola en unas corridas |
| Dos hechos distintos con palabras parecidas se juntan (o uno igual no se junta) | Una historia con fuentes que no corresponden, o la misma noticia dos veces | El umbral es `CRUCE.umbral`; la lectura con IA junta después las repetidas que el cruce no vio (`docs/03-SELECCION.md`, paso 8) |
| Un medio aparece con dos nombres | Una nota de un solo medio cuenta como de dos | Unificar `medio`; `pruebas/cruce-coherente.test.mjs` lo controla |
| La página original tiene la nota partida o metida en `<div>` sin `<p>` | No hay texto completo: la IA escribe con los resúmenes (o no escribe, si son muy cortos) | Mirar `extraerTexto` con esa página (`pruebas/articulo.test.mjs`) |
| Una figura de la lista es ambigua | Entra como "figura" algo que no lo es (27/09: "etcheverry" solo tomó una inmobiliaria de Ayacucho) | Usar nombre y apellido en `FIGURAS` |

## Diferencias encontradas con los documentos viejos

- **`FUENTES.md` (generado) y `CLAUDE.md` dicen que "una fuente oficial alcanza sola"** para que lo de afuera salga. En el código, una nota oficial de afuera contada por un solo medio **no pasa el cruce** (paso 11: un solo medio no se trae, salvo Balcarce en el título o la zona). La ficha del Gobierno de la Provincia en `ingesta/fuentes.mjs` lo dice bien ("lo demás, sólo si lo cuentan otros medios"). Ver también `docs/03-SELECCION.md`, "Diferencias".
- **`CLAUDE.md` (resumen del cruce) dice que "lo de un solo medio no se trae"** sin matiz: es así para lo de afuera; lo de un medio de Balcarce entra siempre, y lo de afuera con Balcarce en el título o de la zona, también.
- **El comentario de `ampliar` dice que abre "sólo lo que no tiene cuerpo, unos 15 pedidos"**: abre también todo lo que no tiene fecha, y lo raspado nunca la tiene, así que abre todas las notas raspadas de cada corrida.
- **El comentario de `ampliar` (`ingesta/ingesta.mjs`) y el de `teniaImagenLaFuente` (`web/scripts/generar-datos.mjs`) dicen que la foto de la fuente "no se publica nunca"**: desde el 28/09 sí se puede publicar, elegida por la IA y guardada en el banco propio (la imagen que trae la ingesta, `imagen`, sigue sin usarse; la del banco sale de otro lado). Ver `docs/05-FOTOS.md`.
- **`docs/RADAR-3.0.md` y un comentario de `ingesta/lectura-ia.mjs` hablan de "76 medios" del cruce** (27/09): hoy son 160 feeds de 71 medios en el cruce, y 91 medios en total.

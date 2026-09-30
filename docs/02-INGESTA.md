# 02 · La ingesta: de dónde salen las noticias y cómo se leen

*Actualizado el 29/09/2026. Si el código cambia, manda el código.*

El primer tramo del recorrido: desde que se sale a buscar a los medios hasta que
cada hecho queda armado como una "historia" con sus fuentes. Qué se decide
después está en `docs/03-SELECCION.md`; cómo se escribe, en
`docs/04-REDACCION.md`; las fotos, en `docs/05-FOTOS.md`.

## En una frase

Cada media hora se leen todas las fuentes activas, se descarta lo que por su
sección nunca le importaría a Balcarce, se juntan las notas de distintos medios
que cuentan el mismo hecho (el "cruce de medios") y de cada hecho queda una sola
historia con todas sus fuentes numeradas.

**Tres palabras antes de empezar:**

- **Feed (o fuente):** una dirección que se lee. Un medio puede tener varias (TN
  tiene la general, Política, Economía, Deportes, Sociedad y su índice de noticias).
- **Medio:** el diario, la radio o el organismo. Todos los feeds de un medio
  llevan el mismo nombre en el campo `medio`, así un medio cuenta una sola vez.
- **Nota e historia:** una nota es lo que publicó un medio; una historia es un
  hecho, con todas las notas que lo contaron. Lo que publica Radar es una historia.

---

## El recorrido, paso a paso

### 1. Quién la dispara

- **En la nube (lo normal):** "Actualizar la web" (`.github/workflows/actualizar.yml`,
  cada media hora, lo dispara cron-job.org) corre `web/scripts/generar-datos.mjs`.
  Ese script ve que no está en la PC (no existe `panel/datos/ultima.json`) y llama
  a `ingestar()` de `ingesta/ingesta.mjs`, con `idsConocidos`: los identificadores
  de lo que ya está en `web/data/portada.json` y `web/data/archivo.json`, para que
  una nota publicada no cambie de dirección (paso 12).
- **En la PC:** el panel de la PC (`panel/servidor.mjs`) corre la misma
  `ingestar()` cada 10 minutos, con las fuentes como estén en el panel (pesos
  cambiados o pausadas). Ver `docs/09-PANEL.md`.
- **A mano:** `node ingesta/ingesta.mjs` corre todo y deja el resultado en
  `ingesta/salida/` (`portada.json`, `preview.html`, `farmacias-crudo.txt`).

### 2. La lista de fuentes

Las fuentes viven en dos archivos y se juntan en `TODAS_LAS_FUENTES`
(`ingesta/ingesta.mjs`). Se leen sólo las que no dicen `activa: false`.

| Lista | Archivo | Qué son |
|---|---|---|
| `FUENTES` | `ingesta/fuentes.mjs` | Los medios de Balcarce y la Municipalidad |
| `FUENTES_NACIONALES` | `ingesta/fuentes.mjs` | Región, provincia, nacionales y temáticas "de siempre" |
| `FUENTES_CRUCE` | `ingesta/fuentes-cruce.mjs` | Las del cruce de medios, una por línea |

Al 29/09 son 218 configuradas, 214 activas, de 91 medios; la cuenta al día y la
lista entera están en **`FUENTES.md`**, que no se edita a mano: lo escribe
`node ingesta/listar-fuentes.mjs`, y `pruebas/fuentes-registro.test.mjs` falla si
alguien toca una fuente y no lo vuelve a correr.

Cada fuente es una ficha con estos datos:

| Campo | Qué dice | Para qué sirve |
|---|---|---|
| `id`, `nombre` | Identificador y nombre del feed | Registro y panel |
| `medio` | El nombre del medio, **igual para todos sus feeds** | Contar medios distintos en el cruce (`pruebas/cruce-coherente.test.mjs`) |
| `url` | Dónde se lee | — |
| `tipo` | `rss`, `atom`, `sitemap` o `scrape` | Cómo se lee (paso 4) |
| `alcance` | `local`, `region`, `provincia` o `pais` | Qué es de Balcarce, qué entra al filtro y al cruce |
| `ciudad` | De dónde es el medio (las de Balcarce y las nacionales no la llevan) | La recibe la lectura con IA (`docs/03-SELECCION.md`, paso 8) |
| `peso` | Cuánto suma a la relevancia: 24 a 30 los de Balcarce, 8 casi todos los nacionales | Ordenar, nunca decidir si sale (`docs/03-SELECCION.md`, paso 3) |
| `oficial` | `true` si es un organismo público: la Municipalidad y el Gobierno de la Provincia. El INTA va **sin** la marca, a propósito: con ella saldría solo sin que lo cuente otro medio | Verde en el semáforo y verificación ALTA. La historia es oficial si **cualquiera** de sus fuentes lo es (paso 13) |
| `seccion` | La sección fija, si el feed ya viene separado por tema | Clasificar (`docs/03-SELECCION.md`, paso 2) |
| `temas`, `nota` | Descripción para personas | Nada automático |
| `patronEnlace`, `base`, `prefijoTitulo` | Sólo en las que se raspan | Reconocer los enlaces a notas en el HTML |

`fichaDeFuente()` (`ingesta/fuentes.mjs`) deduce de esos campos el **tipo** de
fuente (oficial, de Balcarce, de la región, provincial, nacional por sección o
general) y su **ciudad**. La lista `CANDIDATOS` del mismo archivo son fuentes que
se probaron y no funcionaron: no se leen.

### 3. Bajar cada fuente

`traer()` baja todas las fuentes **a la vez**, cada una con 15 segundos como
máximo y el User-Agent `RadarBalcarce/0.1 (agregador local de noticias de
Balcarce)`. Lee como UTF-8 y, si queda lleno de caracteres rotos, vuelve a leer
como latin1 (varios sitios no dicen cómo están escritos).

Una fuente que falla no frena a las demás: queda con `estado: 'error'`, y en
GitHub `generar-datos.mjs` escribe un aviso amarillo arriba de la corrida
("Fuente caída", o "Fuente vacía" si no trajo ninguna nota).

### 4. Leer cada tipo de fuente

**RSS y Atom** (`parsearFeed`). De cada entrada se toma:

- el **título**, sin HTML y con las entidades traducidas (`decodificar`, de
  `ingesta/articulo.mjs`);
- el **enlace**. En Atom se busca el de la página (`enlaceAlternativo`): Blogger
  (Infórmese Primero) pone primero la entrada del feed, que es XML. Ese primer
  enlace se guarda como `enlaceFeed`: con él se calcula el identificador (para que
  no cambie ninguno ya publicado) y de ahí se baja el texto completo;
- la **fecha** (`pubDate`, `published`, `updated` o `dc:date`); sin fecha, o con
  una que no se entiende, la hora de ahora (paso 5);
- el **resumen** (`content:encoded`, `content`, `description` o `summary`), sin
  HTML. Con más de 400 caracteres la nota queda marcada `textoCompleto`;
- la **imagen** (enclosure, `media:content`, `media:thumbnail` o la primera
  `<img>`) y las **categorías** del medio.

**Índices de noticias** (`sitemap`, los que cada sitio arma para Google News).
Traen todo el día, no sólo las últimas 10 o 20 notas, pero sin resumen: en el
cruce se comparan por el título. `tituloDelSitemap` arregla a La Tecla, que pone
palabras sueltas en el título ("Vista") y el título de verdad en el epígrafe de la
foto: con cinco palabras o menos y un epígrafe de seis o más que no empieza con
"Foto", "Crédito" o "Gentileza", se usa el epígrafe.

**Páginas que se raspan** (`parsearScrape`, los medios sin feed: El Diario
Balcarce, La Vanguardia, Argenpapa). Se buscan en el HTML los enlaces con la forma
de una nota del medio (`patronEnlace`; por defecto, direcciones que terminan en
"-número"). Si la tarjeta trae un `<h2>`, ése es el título; `prefijoTitulo` saca
una etiqueta fija ("Argentina:"). Un texto de menos de 25 o más de 140 caracteres
no es un título (así se coló una vez el "quiénes somos" de un medio). Estas notas
llegan **sin fecha ni resumen** y quedan marcadas `fechaEstimada`.

### 5. Las fechas

Una nota sin fecha no puede competir con las que la tienen y, peor, parecería de
hoy en cada corrida. Por eso:

1. **Las notas raspadas se abren una por una** (`ampliar`, de a 4, 12 segundos
   cada una). De los metadatos de la página se toma la bajada (`og:description`,
   si pasa de 40 caracteres), el título entero (`og:title`, si el de la portada
   venía cortado), **la fecha real** (`article:published_time` u
   `og:updated_time`, por vieja que sea, si no es de más de un día en el futuro) y
   la foto (`og:image`, sólo como señal de nota trabajada: no se publica).
2. **Lo raspado de más de 72 horas no se trae** (`HORAS_DE_UNA_NOTA_NUEVA`): la
   portada de un medio mostraba notas de 2025 como de hoy. Una nota a la que no se
   le pudo sacar la fecha **sí entra**, con la hora de ahora y la marca "sin fecha
   en la fuente". Es un colador grueso: los cortes de verdad (12 horas para
   estrenar, 36 en la portada) los hace la web (`docs/03-SELECCION.md`, paso 10).
3. **La primera vez que se vio cada nota** (`web/data/vistas.json`). En cada
   corrida, antes de decidir nada, `generar-datos.mjs` anota por identificador la
   primera hora en que apareció. Se poda a 7 días (`DIAS_DE_VISTAS`), un
   identificador por renglón. Una nota "sin fecha en la fuente" usa esa hora como
   su fecha; una con fecha nunca puede ser más nueva que ella (`fechaReal`,
   `docs/03-SELECCION.md`, paso 10).

### 6. El filtro de entrada: lo que no se trae (sólo medios de afuera)

`motivoDeDescarte()` mira cada nota de un medio de afuera y dice por qué no entra,
o nada. **Los medios de Balcarce nunca pasan por acá: de ellos entra todo.**

1. **El título, por el horóscopo** (`TITULO_HOROSCOPO`: "horóscopo", "números de
   la suerte", "predicciones para cada signo"…), que algunos medios publican en
   secciones genéricas. Motivo: "consejo genérico".
2. **La sección que le puso el propio medio**, leída de la dirección de la nota
   (los tramos de `infobae.com/mexico/…`, sin el último, que es el nombre de la
   nota): así un juego de palabras no engaña. La lista es `SECCIONES_QUE_NO_ENTRAN`
   (`ingesta/fuentes.mjs`):

| Motivo | Tramos de la dirección | Excepción |
|---|---|---|
| "de otro país" | `mexico`, `espana`, `peru`, `colombia`, `america`, `estados-unidos`, `venezuela`, `chile`, `uruguay`, `el-mundo`, `mundo`, `internacional`, `internacionales`, `futbol-internacional` | Entra igual si la fuente es de automovilismo, si nombra a una figura argentina (`FIGURAS`) o si el título tiene conexión argentina (`CONEXION_ARGENTINA`: argentina/o/s, Milei, Malvinas, Boca, River) |
| "policial de afuera" | `policiales`, `seguridad` | Ninguna: los policiales son sólo de Balcarce |
| "consejo genérico" | `autos`, `horoscopo`, `astrologia`, `recetas` | Ninguna |

El registro de "Actualizar la web" dice cuántas descartó cada fuente ("Clarín: 12
no entran por la sección del medio").

### 7. Las marcas de lo de afuera (`marcarDeAfuera`)

Toda nota de afuera que pasó el filtro recibe **una** de estas marcas, la primera
que corresponda:

1. **`nombraBalcarce`**: el **título** dice Balcarce o una localidad del partido
   (`PALABRAS_LOCALES`: balcarce, balcarceño, Napaleofú, Ramos Otero, Laguna La
   Brava, INTA Balcarce, autódromo Juan Manuel Fangio…). Nombrarla en el texto no
   alcanza: una nota de Necochea que nombraba a Balcarce en una lista de
   localidades no es de Balcarce.
2. **`figura`**: el título o los primeros 400 caracteres nombran a una figura
   argentina (`FIGURAS`: Messi, Scaloni, la Selección, Colapinto, Canapino, Los
   Pumas…). Se guarda el nombre encontrado.
3. **`deLaZona`**: el título o los primeros 600 caracteres tocan la zona sin
   nombrar a Balcarce (`PALABRAS_ZONA`: ruta 226, ruta 55, papa semilla, cosecha
   de papa…), con la frase exacta ("ruta 2260" no es la 226). "Sudeste
   bonaerense" se sacó el 29/09: con eso había salido sola, el 28/09, una fiesta de Copetonas.

Qué hace cada marca: `docs/03-SELECCION.md`, pasos 3, 5 y 6.

### 8. Los repetidos del mismo medio

Una nota puede llegar por dos feeds del mismo medio (la portada y la sección, o el
RSS y el índice). Antes del cruce queda una sola: la clave es el medio más el
título sin tildes, signos ni espacios.

### 9. La memoria del cruce

Para que una nota se junte con la que otro medio publicó hace horas (y que ya no
está en su feed), se guarda lo de afuera de las últimas **36 horas**
(`CRUCE.horasDeMemoria`, `ingesta/cruce.mjs`).

- **Dónde vive:** `.cache/cruce-memoria.json` (`MEMORIA_DEL_CRUCE`). No va al
  repositorio: en GitHub la guarda la caché de Actions entre corridas; en la PC,
  el mismo archivo.
- **Qué se guarda** (`paraLaMemoria`): título, los primeros 400 caracteres del
  resumen, enlace (y `enlaceFeed`), fecha, cuándo se vio, medio, fuente, alcance,
  si es oficial, sección fija, peso, imagen y categorías. **Sólo lo de afuera**: lo
  de Balcarce entra siempre.
- **Al leerla** (`leerMemoria`) se descarta lo de más de 36 horas y lo que ya vino
  en esta corrida (mismo enlace). Lo que queda vuelve como nota (`deLaMemoria`, sin
  texto completo) y recibe otra vez sus marcas (paso 7).
- **Al guardarla** (`guardarMemoria`) se suma lo de afuera de esta corrida, sin
  repetir enlaces y sin lo vencido.

### 10. El cruce de medios: juntar las notas que cuentan el mismo hecho

`agruparPorHecho()` (`ingesta/cruce.mjs`) recibe todas las notas (las de esta
corrida y las de la memoria) y devuelve grupos. Sin IA: tarda segundos.

1. **Las palabras de cada nota** (`palabrasDe`): el título **dos veces** (pesa el
   doble) y los primeros 400 caracteres del resumen, sin tildes, en minúscula, de
   tres letras o más y sin las palabras vacías (`VACIAS`: de, la, que, hoy, nuevo…).
2. **TF-IDF**: cada palabra pesa más cuanto más rara es en el día (una que aparece
   en tres notas dice mucho; "gobierno", poco).
3. **Coseno**: la semejanza entre dos notas, de 0 a 1.
4. **Umbral 0,42** (`CRUCE.umbral`): con 0,42 o más, cuentan el mismo hecho. Se
   midió con 90 medios y 2.664 notas: con 0,25 encadenaba cosas sin relación
   (`docs/historico/CRUCE-DE-MEDIOS.md`).
5. **Para no comparar todas contra todas**, cada nota se compara sólo con las que
   comparten una palabra poco común. Una palabra que está en más del 5 % de las
   notas (`CRUCE.palabraComun`, nunca menos de 3) no sirve para buscar parecidas,
   aunque cuenta en el cálculo.
6. **Dos notas del mismo medio nunca se juntan entre sí**: un medio cuenta una vez.
7. **Los grupos se encadenan**: si A se parece a B y B a C, A, B y C son un grupo.

### 11. Qué grupos quedan

| El grupo… | ¿Queda? |
|---|---|
| Tiene al menos una nota de un medio de Balcarce | Sí |
| Tiene una nota de afuera con `nombraBalcarce` o `deLaZona` | Sí |
| Lo cuentan **dos medios distintos o más** | Sí (cuántos pide su sección se decide después: `docs/03-SELECCION.md`, paso 6) |
| Lo cuenta **un solo medio** de afuera | **No se trae**, ni para esperar a una persona. Vale también para una fuente oficial de afuera sola (el Gobierno de la Provincia) |
| Lo cuentan **sólo medios de la región** (Mar del Plata, Tandil, Necochea…), sin Balcarce en el título ni la zona | **No se trae**: lo que es sólo de Necochea no le sirve a Balcarce |

El registro dice: "cruce: N notas (M de la memoria) · H historias · X de afuera
con un solo medio y Y de otra ciudad de la zona no entran". Un grupo hecho sólo de
notas de la memoria sigue siendo una historia más.

### 12. La nota principal de cada historia

De cada grupo sale **una** nota principal, que da el identificador (y por lo tanto
la dirección en la web), el título de partida, la fecha y el enlace principal.

1. **¿La historia es de acá?** (`historiaDeAca`). Sí, si la cuenta un medio de
   Balcarce y, además, ningún medio de afuera la cuenta o algún medio nombra a
   Balcarce (`nombraBalcarce`, o un medio de acá que la nombra en el título o en
   los primeros 600 caracteres: `mencionaBalcarce`). **Un medio de Balcarce que
   cuenta lo mismo que los nacionales sin nombrar nada de acá está copiando una
   noticia de afuera**, y la historia se rige por lo de afuera.
2. **Entre quiénes se elige:** si es de acá, entre las notas de los medios de
   Balcarce; si no, entre las de afuera.
3. **Cuál:** la que ya está publicada (su identificador está en `idsConocidos`),
   así la dirección no cambia cuando otro medio se suma. Si ninguna, **la que
   salió primero**.
4. **Lo que toma de las demás:** el título entero si el suyo venía cortado; la
   fecha, si no tenía; la imagen; el resumen largo, si no tenía texto completo; la
   marca `nombraBalcarce` y la figura.

Después se guarda la memoria (paso 9).

### 13. Cómo queda armada cada historia

Antes de decidir nada se sacan los policiales de afuera (`docs/03-SELECCION.md`,
paso 1). Del resto, cada historia queda con estos campos:

| Campo | De dónde sale |
|---|---|
| `id` | Un código corto calculado del enlace de la principal (`idDe`, con `enlaceFeed` si lo hay). La misma nota da siempre el mismo |
| `titulo` | El de la principal. Si venía EN MAYÚSCULAS (75 % o más de las letras), pasa a mayúscula inicial conservando los nombres propios que aparecen bien escritos en el resumen y los de `NOMBRES_PROPIOS` (`sentenciar`) |
| `enlace`, `enlaceFeed` | Los de la principal |
| `fecha`, `cuando` | La de la principal; `cuando` dice "hace 3 h" o "sin fecha en la fuente" |
| `medio`, `medios` | El medio principal y la lista de medios distintos |
| `seccion`, `semaforo`, `motivo`, `relevancia`, `temas` | Ver `docs/03-SELECCION.md` |
| `imagen` | Sólo como dato: la imagen de la fuente no se publica. Las fotos, en `docs/05-FOTOS.md` |
| `resumenFuente` | El resumen de la principal limpio (`limpiarCopete`): sin la firma del medio al final, sin "leer más", sin repetir el título, cortado en 280 caracteres. Vacío si queda en menos de 40 |
| `fuentesTexto` | Los resúmenes limpios de las otras notas del grupo |
| `origenes` | **Cada fuente, en orden, la principal primero**: medio, enlace, fecha, si es oficial y su resumen. Es lo que la IA recibe numerado ("Fuente 1, Fuente 2…"), lo que el lector ve en "Fuentes (N)" y con lo que se calcula el nivel de verificación (`docs/04-REDACCION.md`) |
| `local` | `true` si la principal es de un medio de Balcarce o dice Balcarce en el título (`esDeBalcarce`) |
| `figura`, `deLaZona`, `nombraBalcarce`, `alcance` | Las marcas del paso 7 y el alcance de la principal |
| `oficial` | `true` si la principal **o cualquiera** de las otras es de una fuente oficial. Lo usan el semáforo, los medios que pide lo de afuera y el archivo (`tieneRespaldo`) |

Además de las noticias, `ingestar()` trae el **clima** (Open-Meteo y, si falla,
`api.met.no`) y las **farmacias de turno** (Colegio de Farmacéuticos, cruzado con
La Vanguardia y Radio Gabal): ver `docs/06-WEB.md`.

### 14. El texto completo de la nota original

Los feeds traen un resumen de unos 200 caracteres: con eso la IA no tiene de dónde
escribir un cuerpo y rellena. Por eso, **en el momento de escribir** (no en la
ingesta), se baja la página de la nota original (`ingesta/articulo.mjs`):

1. **De qué fuente:** `textoCompletoDe()` (`reels/reescritura.mjs`) prueba la
   principal (su `enlaceFeed` si es Blogger) y, si no se pudo, hasta tres de las
   otras. Ver `docs/04-REDACCION.md`, paso 4.
2. **Bajar** (`traerTexto`): 8 segundos como máximo, User-Agent
   `RadarBalcarce/1.0 (+https://radarbalcarce.com)`. Si falla, la nota se escribe
   sólo con los resúmenes.
3. **Sacar la nota del HTML** (`extraerTexto`):
   - En una entrada de Atom (Blogger), el texto viene escapado adentro de
     `<content type="html">` (`parrafosDeAtom`).
   - En una página, primero se borran los bloques que nunca son la nota (`script`,
     `style`, `nav`, `header`, `footer`, `aside`, `form`, `svg`, `figure`…).
     Después se arman "tramos" de párrafos `<p>` seguidos (entre dos párrafos de la
     misma nota puede haber hasta 6.000 caracteres de HTML, `SALTO_MAXIMO`) y **se
     queda con el tramo con más texto** (La Nación, Ámbito y Olé tienen varios
     `<article>` y el primero no es la nota).
   - No cuentan los párrafos de menos de 50 caracteres, los de ruido (`RUIDO`:
     compartir, seguinos, suscribite, leé también, copyright…) ni **las
     necrológicas** (`NECROLOGICA`: casa de duelo, sala velatoria, servicios de
     sepelio). Un medio de acá pega debajo de cada nota su bloque de fallecidos, y
     la IA llegó a escribir sobre sepelios en una nota escolar.
4. **El largo:** hasta 4.000 caracteres (`REESCRITURA.caracteresDelTextoCompleto`,
   `ingesta/criterio.mjs`); con menos de 300 no hay texto completo.

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué escribe |
|---|---|---|---|
| `ingesta/fuentes.mjs` | Las fuentes de siempre, las palabras de Balcarce y de la zona, el filtro de entrada, las figuras, `fichaDeFuente` (y las reglas de sección y semáforo, ver 03) | Todo el motor | — |
| `ingesta/fuentes-cruce.mjs` | Las fuentes del cruce, una por línea | `ingesta.mjs`, `lectura-ia.mjs`, `listar-fuentes.mjs` | — |
| `ingesta/listar-fuentes.mjs` | Escribe `FUENTES.md` desde el código | Una persona | `FUENTES.md` |
| `ingesta/ingesta.mjs` | `ingestar()`: baja, lee, filtra, marca, cruza, elige la principal y arma cada historia (también clasifica y da el semáforo, ver 03) | `generar-datos.mjs` (nube), `panel/servidor.mjs` (PC), a mano | La memoria; a mano, `ingesta/salida/` |
| `ingesta/cruce.mjs` | Agrupa por hecho (TF-IDF, coseno, 0,42) y maneja la memoria de 36 horas | `ingesta.mjs` | `.cache/cruce-memoria.json` |
| `ingesta/articulo.mjs` | Baja la página original y saca el texto de la nota; `decodificar` | `reels/reescritura.mjs`, `ingesta.mjs` | — |
| `web/scripts/generar-datos.mjs` | Dispara la ingesta en la nube y anota la primera vista | `actualizar.yml` | `web/data/vistas.json` (y todo lo de 03 a 06) |
| `.github/workflows/actualizar.yml` | Corre todo cada media hora y guarda `.cache/` en la caché de Actions (la memoria del cruce y las notas para el panel del celular) | cron-job.org | Los commits "Datos de la portada" |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Sumar, sacar o apagar una fuente | `FUENTES` o `FUENTES_NACIONALES` (`ingesta/fuentes.mjs`) o una línea de `ingesta/fuentes-cruce.mjs` (`activa: false` para apagar; el mismo `medio` para todos los feeds de un medio). Después, `node ingesta/listar-fuentes.mjs` |
| Cambiar el peso de una fuente | Campo `peso` de su ficha (o, en la PC, desde el panel) |
| Que un medio sin feed se lea bien | `patronEnlace`, `base` y `prefijoTitulo` de su ficha (`parsearScrape`) |
| Cuántas horas puede tener una nota raspada para entrar | `HORAS_DE_UNA_NOTA_NUEVA` (`ingesta/ingesta.mjs`) |
| Que una sección de un medio de afuera no se traiga | `SECCIONES_QUE_NO_ENTRAN` (`ingesta/fuentes.mjs`) |
| Qué cuenta como conexión argentina en el título | `CONEXION_ARGENTINA` (`ingesta/fuentes.mjs`) |
| Qué palabras hacen que una nota de afuera "diga Balcarce" | `PALABRAS_LOCALES` (`ingesta/fuentes.mjs`): sólo nombres que no aparezcan de casualidad |
| Qué es "la zona" | `PALABRAS_ZONA` (`ingesta/fuentes.mjs`) |
| Qué figuras cuentan | `FIGURAS` (`ingesta/fuentes.mjs`): con nombre y apellido si el apellido solo es ambiguo |
| Cuánto se parecen dos notas para ser el mismo hecho, o cuántas horas se recuerdan | `CRUCE` (`ingesta/cruce.mjs`: `umbral`, `horasDeMemoria`, `palabraComun`) |
| Qué palabras no cuentan en el cruce | `VACIAS` (`ingesta/cruce.mjs`) |
| Un título de un índice que llega en palabras sueltas | `tituloDelSitemap` (`ingesta/ingesta.mjs`) |
| Un nombre propio que queda en minúscula al pasar un título de MAYÚSCULAS | `NOMBRES_PROPIOS` (`ingesta/fuentes.mjs`) |
| Qué partes de la página original no se leen como nota | `RUIDO` y `NECROLOGICA` (`ingesta/articulo.mjs`) |
| Cuánto texto completo recibe la IA | `REESCRITURA.caracteresDelTextoCompleto` (`ingesta/criterio.mjs`) **y** la tabla de `CRITERIO-EDITORIAL.md` § 11 |

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| Un medio cambia su feed o lo cierra | Aviso amarillo "Fuente caída" en la corrida; en el panel de la PC, la fuente en rojo | Buscar el feed nuevo o apagarla con `activa: false` |
| Un medio que se raspa rediseña su página | Aviso "Fuente vacía" (0 notas), sin ningún error | Ajustar su `patronEnlace` |
| Un feed sin fechas | La nota figura "sin fecha en la fuente"; en la web cuenta desde que se vio (`vistas.json`) | Nada. Ojo: en el puntaje, una entrada sin fecha recibe el premio de frescura en cada corrida (sólo las raspadas quedan `fechaEstimada`) |
| Una página raspada no contesta al abrirla | La nota entra sin fecha real y queda con la hora de la primera vista | Se corrige sola si la página contesta en otra corrida antes de publicarse |
| Se pierde la caché de Actions | El cruce arranca sin memoria: por unas horas, más notas "de un solo medio" no entran | Nada: se rearma sola |
| Dos hechos distintos se juntan (o uno igual no se junta) | Una historia con fuentes que no corresponden, o la misma noticia dos veces | El umbral es `CRUCE.umbral`; la lectura con IA junta después las repetidas que el cruce no vio (`docs/03-SELECCION.md`, paso 8) |
| Un medio aparece con dos nombres | Una nota de un solo medio cuenta como de dos | Unificar `medio`; `pruebas/cruce-coherente.test.mjs` lo controla |
| Se cae la plataforma que comparten varios medios de la región | Varios "Fuente caída" juntos (0223, LU9, QZ Noticias, Ecos Diarios, La Noticia 1 y otros leen de `…apiv3.eleco.com.ar`) | Nada: vuelven solos |
| La página original tiene la nota sin `<p>` | No hay texto completo: la IA escribe con los resúmenes (o no escribe, si son cortos) | Mirar `extraerTexto` con esa página (`pruebas/articulo.test.mjs`) |
| Una figura de la lista es ambigua | Entra como "figura" algo que no lo es ("etcheverry" solo tomó una inmobiliaria) | Usar nombre y apellido en `FIGURAS` |

Lo que falta, en `PENDIENTES.md`.

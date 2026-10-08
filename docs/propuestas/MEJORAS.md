# Mejoras y decisiones sobre lo que ya existe

*Armado el 8/10/2026. Acá va **solo lo que ya existe** en Radar Balcarce: arreglos, cosas para
medir, limpiezas y decisiones sobre piezas que ya andan. Lo nuevo (notas propias, formatos de redes,
planes comerciales, canales) está en [`IDEAS-NUEVAS.md`](IDEAS-NUEVAS.md). Nada de esto está
hecho: es una lista para decidir y después hacer.*

**Cómo leerlo**

- **Niveles 0 a 5**, de lo más simple a lo más complejo. El nivel dice cuánto trabajo y cuánto
  riesgo tiene, no cuánto importa. Lo que importa ya está marcado como **crítico** o **clave**.
- **Estado** de cada ítem, revisado contra el código el 8/10:
  - **Confirmado:** se vio en el código o en los registros.
  - **Corregido:** la propuesta original tenía un error y ya está arreglada acá.
  - **Discutible:** es cierto, pero puede no valer el trabajo; lo deciden ustedes.
  - **A confirmar:** depende de un servicio de afuera o de algo que no se pudo ver.
- **Ids**: se mantienen los de la investigación (A1, B1, P16…) para poder buscarlos en
  `registro/`. Cuando dos propuestas eran la misma, quedó una sola, y se aclara.

---

## Lo crítico, con fecha

*Estado al 8/10 por la tarde: ✔ hecho · ◐ parcial · ✗ pendiente. El detalle de cada avance está en la línea "Estado" de cada punto y en [`PRIORIDADES.md`](PRIORIDADES.md).*

Estas son las cosas que **pueden romper algo pronto** si nadie hace nada. Van primero por la fecha,
no por la dificultad.

| # | Qué | Cuándo muerde | Qué pasa si no se hace | Trabajo |
|---|---|---|---|---|
| **C-0 ✔** | **La corrección automática de la auditoría está rompiendo notas publicadas** | **Ya, cada media hora** | Dos notas del sitio ya tienen "en en en en…" y "compitiránnnnn…", y crecen en cada corrida | 30 min para frenarlo + 2-3 h el arreglo |
| C-1 ✔ | **La prueba que congela la web el lunes** | **Lunes 12/10** | La web deja de actualizarse sola | 5 minutos |
| **C-18 ✔** | **Dos botones del celular congelan la web** ("Pedir cambios" en el feriado del 12/10, y "Sacar" o "Pedir cambios" en la efeméride del 11/10) | **Ya, hasta el 12/10** | La web deja de actualizarse sola | No tocarlos hasta el 13/10; arreglo 3-4 h |
| **C-19 ◐** | **"Publicar" de un toque en el celular saca un texto de la IA que nadie leyó, y firma "revisada por una persona"** | Ya (25 de las 33 notas que esperan hablan de denuncias, chicos o víctimas) | Una nota delicada sale sin que nadie la lea, con una firma que no es cierta | 2 h + decisión |
| C-2 ✗ | **Un riesgo de seguridad del panel del celular** (el detalle no va en el repositorio público) | Ya (es un riesgo, no una falla) | Grave si se aprovecha | Medio día a 1 día |
| C-3 ◐ | **Next 15 deja de recibir parches** | **21/10** | El sitio queda con fallas de seguridad conocidas sin arreglo | 1 h (parche) + 1-2 días (Next 16) |
| C-4 ◐ | **Las máquinas de GitHub pasan a Ubuntu 26** | **Desde el 19/10** | Algún robot puede fallar el día del cambio | 2 h para probar antes |
| C-5 ✔ | **Un archivo de datos roto se lee como vacío** | Cualquier día (ya pasó el 25/09) | Se pueden perder hasta 180 días de páginas | 3 h |
| C-6 ◐ | **El tope de 2.500 notas** (un número que puso el proyecto, por un límite de Cloudflare) | **Alrededor del 2/11** | Las notas viejas pierden su página y sus datos | 2 h (subir el tope) + plan para guardar el 100 % |
| C-7 ✔ | **Unas 20 pruebas atadas a los datos reales de efemérides y feriados** | Al armar noviembre (fin de octubre) | Otra vez la web congelada | 2-6 h (junto con C-18) |
| C-8 ✗ | **Los datos de seguimiento comercial quedarían públicos** | El día del primer mensaje a un comercio | Cualquiera ve a quién se le ofreció qué y quién dijo que no | 1 h |
| C-9 ✔ | **Los reels con voz de IA salen sin la etiqueta de IA de Meta** | Ya (lo pide Meta) | Meta puede bajar el alcance o sancionar | Decisión + 2-4 h |
| C-10 ✔ | **Algo en rojo (un menor, una víctima) se publica si una persona lo aprueba** | Ya | Se rompe la regla "nunca identificar a un menor ni a una víctima" por un clic equivocado | 1 h (pero es la lista roja: preguntar antes) |
| C-11 ✗ | **Las pistas que "salen solas" pueden publicar lo que una persona miró y no aprobó** | Ya (hay dos intentándolo: Messi y Margaret Hamilton) | Sale una nota sin control, en la sección equivocada y arriba de todo | Medio día |
| C-12 ✔ | **El semáforo deja salir solas notas que pueden identificar a un menor o a una víctima** | Ya (no se encontró ningún caso publicado todavía) | Una nota con un chico de 16 años o una víctima sale sin que la vea nadie | 3-4 h (es la lista roja: preguntar antes) |
| C-13 ✔ | **Una foto de otro medio y de otro hecho está publicada en una nota de Policiales** | Ya | Rompe la regla de fotos en Policiales | 5 min sacarla + 2 h el freno |
| C-14 ✔ | **Una corrección hecha sobre una nota aprobada desde el celular se deshace sola a los 3 días** | Cuando se use "Editar" sobre una nota aprobada (hoy no hay casos) | Si la corrección sacó el nombre de una víctima, el nombre vuelve | 1 h |
| C-15 ◐ | **Si la web se congela, la farmacia de turno y el clima de las redes quedan viejos** | El lunes 12/10 si no se arregla C-1 | Se manda a la gente a una farmacia que no está de turno; el reel de clima muestra el pronóstico de ayer | 3 h + 2-3 h |
| C-16 ◐ | **Cuando Meta contesta con error, se vuelve a armar la pieza, se gasta voz y puede salir duplicada** | Ya (el 5/10 Meta publicó aunque contestó error) | Una falla repetida puede comerse los 10 audios del día o duplicar un posteo | 1 día |
| C-17 ◐ | **Efemérides: del 19 al 31/10 salen solas sin aprobar, y el 31/10 se acaban (también las piezas fijas)** | **19/10 y 1/11** | La efeméride deja de salir sin aviso y participá empieza a gastar 4 audios por semana | 1 h + decidir antes del 25/10 |

### C-0 · La auditoría está rompiendo notas publicadas — *Confirmado en el sitio, 8/10*

> **Estado:** ✔ HECHO 8/10 · regla 108. Sólo corrige tildes, no estira, notas reparadas.

**Explicado en simple.** Una vez por semana, una auditoría con IA relee lo publicado y, si encuentra un
error chico de ortografía, lo corrige sola (regla 98). El problema es que la web vuelve a aplicar la misma
corrección **en cada corrida, sobre el texto ya corregido**. Cuando la palabra nueva contiene a la vieja,
la estira de nuevo cada media hora.

- **Lo que se ve hoy en el sitio** (confirmado en `web/data/archivo.json` de `main`):
  - Nota `1uh42rm` (inflación de septiembre): "se contrajo 1 por ciento **en en en en en…**", con "en"
    repetido decenas de veces.
  - Nota `1c7wqua` (inauguración minera): "no compet**iránnnnnnnnnnnn…**".
- **Además, algunas "correcciones" cambian el sentido**: "nodocentes" pasó a "docentes", "recaudos" a
  "recursos" (en una cita de Caputo), "Turismo Special" a "Turismo Especial", "definitorias" a
  "definitivas", y le sacó una tilde correcta a "quíntuple". El control solo mira que cambien 3 letras o
  menos.
- **Evidencia:** `ingesta/auditoria-ia.mjs:241` (`cambioMecanico`); `web/lib/archivo.js:127`
  (`conCambiosDeLaAuditoria`); `web/scripts/generar-datos.mjs:533`; `web/data/correcciones-auditoria.json`.
- **Para frenarlo (30 min, necesita su autorización):**
  1. Poner la variable de GitHub `AUDITORIA_SIN_CORREGIR=1` (frena las correcciones nuevas).
  2. Sacar los pares malos de `correcciones-auditoria.json`. Ojo: corregir la nota a mano no alcanza; si
     el par sigue anotado, la vuelve a romper.
  3. Arreglar el texto de esas notas.
- **Arreglo de fondo (2-3 h):** no aplicar si el texto ya tiene la forma corregida; rechazar pares donde
  una forma contiene a la otra; corregir solo tildes y letras dobles, nunca palabras con mayúscula, "no",
  "ni", "nunca" ni números escritos; una prueba con los 15 casos reales.
- **Cómo hacer que una corrección sea real y no empeore:**
  1. Se aplica **una sola vez**: cuando se aplica, se anota como aplicada y el texto corregido queda guardado
     en la nota. La corrida siguiente no la vuelve a buscar.
  2. Antes de aplicar, se fija si el texto **ya tiene** la forma corregida: si la tiene, no hace nada.
  3. Sola, solo lo seguro: tildes y letras dobles. Todo lo demás (otra palabra, un nombre, un número) va a
     la pestaña Revisión del celular para que una persona diga sí o no.
  4. Una prueba con los 15 casos reales de hoy, para que no vuelva.
- **Para que no vuelva a pasar sin que nadie se entere:** que el vigilante avise si el cuerpo de una nota
  publicada cambia sin que lo haya tocado una persona, o si aparece una palabra repetida tres veces seguidas.

### C-1 · La prueba que congela la web el lunes 12/10 — *Confirmado*

> **Estado:** ✔ HECHO 8/10 · la prueba acepta una lista vacía.

**Explicado en simple.** Antes de publicar, cada media hora el robot corre las pruebas: más de 1.800
controles automáticos que revisan que nada esté roto. Si una sola falla, el robot **no publica** y la
web se queda quieta en la última versión buena, hasta que alguien lo arregle.

Una de esas pruebas mira la lista de **notas retiradas** (`web/data/retiradas.json`, las que ustedes
sacaron a mano) y exige que tenga **por lo menos una**. Hoy tiene 11, todas del 28 y 29 de septiembre.

Los lunes, el mismo robot limpia esa lista y saca las retiradas de **más de 7 días**. El lunes 12/10
las 11 van a tener más de 7 días: la lista queda **vacía**. En la corrida siguiente, esa prueba ve la
lista vacía, falla, y la web deja de actualizarse. Se simuló con el código real: salen 11, quedan 0.

Una lista vacía no es un error (quiere decir "no hay nada retirado esta semana"); el error es la prueba.

- **Evidencia:** `pruebas/archivo.test.mjs:60` (`assert.ok(entradas.length > 0)`),
  `web/scripts/generar-datos.mjs:388-398` (la poda de los lunes), `web/lib/archivo.js`
  (`DIAS_DE_RETIRADAS = 7`).
- **Arreglo:** que la prueba acepte una lista vacía (sacar esa línea o cambiarla por "es una lista").
  Es una línea.
- **Si no se hace antes del lunes:** el lunes a la mañana la web se congela. Se nota porque la
  portada no cambia y el vigilante avisa "la web no se actualiza". Se arregla igual, con la misma línea.
- **Decisión pendiente de Hernán y Andrés:** si se arregla antes del lunes (recomendado) o se espera.

### C-18 · Dos botones del celular congelan la web — *Confirmado con una simulación*

> **Estado:** ✔ HECHO 8/10 · regla 112. Ya se puede tocar el feriado y la efeméride desde el celular.

Hay pruebas que usan los datos **reales** del 11 y el 12 de octubre (el feriado y la efeméride), que se
pueden cambiar desde la pestaña Fechas del celular. Se simuló en una copia: con un toque, fallan 9 pruebas
(feriado) o 1 (efeméride), y la web se congela en la corrida siguiente.

- **Hasta el 13/10, no tocar:** "Pedir cambios" en el **feriado del 12/10**, ni "Sacar" o "Pedir cambios"
  en la **efeméride del 11/10**. Aprobar no rompe nada.
- **Evidencia:** `pruebas/cronograma-semana.test.mjs:14,26,37,54,61`, `cronograma-html.test.mjs:17`,
  `hoja-cronograma.test.mjs:11`, `placa-participa.test.mjs:70`, `efemeride-viva.test.mjs:27,79`; el botón
  está en `web/public/panel/app.js:1114`.
- **Arreglo (3-4 h):** que esas pruebas usen datos fijos propios (las funciones ya aceptan datos como
  parámetro). **Regla general:** lo que escriben Hernán y Andrés se valida por su forma, nunca por su
  contenido.

### C-19 · "Publicar" sin leer en el celular — *Confirmado (auditoría del panel, 8/10)*

> **Estado:** ◐ PARCIAL 8/10 · regla 120. Un tema delicado muestra el borrador antes de publicar. Queda: la firma "revisada por una persona" para lo aprobado sin leer.

En "Esperan", el botón "Publicar" hace que la IA escriba la nota y, si el verificador no marca nada, la publica
sola: nadie lee el texto (`web/public/panel/app.js:1433-1442`). Pasa justo con las notas que esperan porque
necesitan que alguien las mire: hoy 25 de las 33 dicen "denuncia", "niño", "víctima", "adolescente" o "el menor
de". Además la nota sale firmada como **revisada por una persona** (`web/components/metadatos.js:81`).

- **Propuesta:** que "Publicar" siempre muestre el texto antes; o, si se deja el atajo, que no exista para lo
  delicado y que la firma diga la verdad. 2 h. **Decisión de Hernán y Andrés.**

### C-2 · Un riesgo de seguridad del panel del celular — *Confirmado (riesgo grave)*

> **Estado:** ✗ PENDIENTE · va con el panel nuevo (PANEL-NUEVO.md). Mientras tanto, ningún script de terceros en la web.

El repositorio es público, así que el detalle de este punto **no se escribe acá**: está en el documento
privado de la investigación (la página de propuestas). En resumen: hay una forma en que la llave de GitHub
del panel podría quedar expuesta.

- **Ya mismo, sin código:** **no sumar ningún script de terceros a la web** (ni publicidad de afuera, ni
  contadores nuevos) hasta resolverlo.
- **Arreglo de fondo:** separar el panel del sitio público (gratis). Medio día a 1 día.

### C-3 · Next 15 deja de recibir parches el 21/10 — *Confirmado*

> **Estado:** ◐ PARCIAL 8/10 · ya está en Next 15.5.27. Queda pasar a Next 16.

Está instalado Next 15.5.25 y ya salió 15.5.27. `npm audit` en `web/` da 4 avisos (postcss, sharp por
librsvg y source-map-js altos; next moderado). Además `web/package.json` dice React 18, pero lo que
corre es React 19.2 (el que trae Next adentro).

- **Paso 1 (1 h):** `npm audit fix` y pasar a 15.5.27; probar con el workflow `armado-vacio`.
- **Paso 2 (1-2 días):** migrar a Next 16 y declarar React 19, en la rama, comparando el sitio armado.
- Como el sitio es estático, el riesgo para el lector es bajo; el riesgo está en el armado.

### C-4 · Ubuntu 26 en GitHub Actions desde el 19/10 — *A confirmar*

> **Estado:** ◐ PARCIAL 8/10 · los robots quedaron fijos en Ubuntu 24.04. Queda probar el 26 a propósito.

`ubuntu-latest` pasa a la versión 26. Además los registros ya avisan que `actions/checkout@v4`,
`setup-node@v4` y `cache@v4` usan Node 20, que GitHub está retirando. (Antes era **Acc-v4**.)

- **Pasos:** probar un workflow manual con `runs-on: ubuntu-26.04` y las acciones nuevas antes del
  19/10; si algo falla, fijar `ubuntu-24.04` mientras se arregla. Ojo con `ffmpeg-static`, `resvg`
  y `sharp`, que traen binarios.

### C-5 · Un archivo de datos roto se lee como vacío — *Confirmado*

> **Estado:** ✔ HECHO 8/10 · regla 110.

`leerJson` trata igual "no existe" y "está roto". Si `web/data/archivo.json` se rompe (ya pasó el 25/09
con uno subido a mano), la corrida arranca como si no hubiera archivo y **guarda uno casi vacío**: se
pierden hasta 180 días de páginas. Si se rompe `redes.json`, el reloj cree que hoy no salió nada.
Ninguna prueba revisa esos dos archivos.

- **Evidencia:** `ingesta/json.mjs:7`; `web/scripts/generar-datos.mjs:228`; `redes/reloj.mjs:56`;
  `redes/publicar.mjs:65`.
- **Arreglo:** si el archivo existe y no se puede leer, cortar con error (no publicar). Guardia extra:
  si el archivo nuevo tiene más de 20 % menos notas que el anterior, no se guarda y se avisa.
- **Consecuencia:** `web/scripts/recuperar-archivo.mjs` **no se borra** (la propuesta Borrar-c lo
  incluía): es el rescate justo para este caso.

### C-6 · El tope de 2.500 notas, y guardar el 100 % año tras año — *Confirmado; decidido el 8/10*

> **Estado:** ◐ PARCIAL 8/10 · regla 111. Tope en 3.500 y histórico por mes. Queda: armar las notas viejas en el momento (etapa 2 del plan de arquitectura).

**Qué es el tope.** Es un número que **puso el propio proyecto** en el código (`web/lib/archivo.js:185-191`):
no es un impuesto ni una regla de nadie de afuera. Se puso por un límite real de Cloudflare Pages, que
acepta **hasta 20.000 archivos por publicación** en el plan gratis, y porque cada nota suma tiempo de
armado. Cada nota son unos 3 archivos (la página, su copia para navegar rápido y su imagen para compartir).
Hoy el sitio tiene 3.315 archivos. Además de las 2.500, una nota pierde su página a los 180 días.

**Qué pasa si no se toca:** cerca del 2/11 se llega a 2.500 y, para que entren las nuevas, las más viejas
pierden su página (y sus datos se sacan del archivo). Nada se rompe, pero se pierden notas.

**Decisión de Hernán y Andrés (8/10):** guardar el **100 % de los datos, año tras año**, desde ahora.

**El problema de guardar todo como páginas:** son unas 21.000 notas por año, o sea ~63.000 archivos. Eso
pasa el límite gratis de Cloudflare (20.000) en pocos meses. El plan pago de Cloudflare (US$ 5) llega a
unos 100.000 archivos (a confirmar): tampoco alcanza para siempre.

**El plan propuesto: separar "guardar" de "tener página".**
1. **Guardar todo, siempre (los datos):** cada nota publicada se agrega a un archivo histórico por mes
   (`web/data/historico/2026-10.json`, etc.) con título, bajada, cuerpo, fuentes, foto, fecha, sección y
   firma. **Nunca se poda.** Pesa unos 4 KB por nota: ~85 MB por año. Las retiradas a mano se marcan como
   retiradas y no se muestran, pero el registro queda.
2. **Páginas fijas para lo reciente:** las notas de los últimos meses siguen siendo páginas armadas, como hoy.
3. **Páginas para lo viejo, sin archivos de más:** una sola función de Cloudflare (gratis hasta 100.000
   visitas por día) arma en el momento la página de cualquier nota vieja leyendo el archivo del mes. La
   dirección de cada nota no cambia nunca. Son unos pocos archivos por mes, no miles.
4. **Buscador de todo** con Pagefind (sección Herramientas).
5. **Las fotos** son lo que más pesa (~4 MB por día, ~1,5 GB por año en git). Antes de fin de año conviene
   sacarlas a un depósito (R2-fotos). R2 pide tarjeta aunque no cobre: es una decisión.

**Lo que pidieron Hernán y Andrés (8/10):** que la historia de la página siga siempre; por ahora, prever que
ande bien 1 o 2 años y después ir adaptando. Hay un **recordatorio programado para el 15/12/2026** que les
llega por notificación y por mail, con una revisión de cómo vienen el archivo, las fotos y el respaldo.

**Mientras tanto (antes del 2/11):** subir el tope (por ejemplo a 5.000 notas, unos 15.000 archivos) y que
lo que salga del archivo vaya al histórico en vez de borrarse. Así no se pierde nada mientras se arma lo
demás. Hoy no se perdió ninguna nota: el archivo empezó a mediados de septiembre.

**Recordar:** los números viven en `ingesta/criterio.mjs` **y** en `web/lib/archivo.js`.

### C-7 · Pruebas atadas a los datos de efemérides y feriados — *Confirmado con una simulación*

> **Estado:** ✔ HECHO 8/10 · regla 112.

Al principio parecían 2; son **unas 20 pruebas en 8 archivos**. Se simuló en una copia lo que va a pasar:

- **Cuando se arme noviembre** (candidatas nuevas, días nuevos): fallan `exportar-efemerides.test.mjs:50`,
  `efemerides.test.mjs:247-248`, `previa-efemerides.test.mjs:43-44,60` y `cronograma-semana.test.mjs:49-50`.
- **Cuando se vuelva a armar la lista de feriados después del 12/10**: el 12/10 desaparece y fallan las
  mismas 9 de C-18.
- **Si se borran los días de octubre**: fallan 11 más (`efemeride-viva`, `previa-efemerides`,
  `reel-dos-placas`, `cronograma-semana`).
- **Si un día se marca para que no salga, o su guion pasa de 100 palabras**: falla
  `previa-efemerides.test.mjs:48,56`.
- **Si alguien vacía `correcciones.json`**: falla `celular-app.test.mjs:39`.

**Lo bueno:** ninguna prueba falla solo porque pasa el tiempo (se corrió la suite como si fueran 12 fechas
distintas, hasta octubre de 2027, y en UTC). Todas las bombas son de **datos**. Por eso "Pruebas con otra
hora" no las ve: adelanta el reloj pero deja los datos como están.

**Arreglo:** el mismo de C-18, más que las pruebas que miran el archivo vivo controlen solo la forma (cada
día tiene principal y guion), sin cantidades ni fechas fijas. Y sumar al workflow semanal una simulación
de lo que va a pasar sí o sí (la poda del lunes, los feriados "desde hoy"); el script ya está escrito en
la investigación. 2 h más, junto con C-18.

### C-8 · Los datos comerciales, antes del primer mensaje — *Confirmado*

> **Estado:** ✗ PENDIENTE · antes del primer mensaje a un comercio.

`comercial/datos/comercios.json` está en el repositorio público. Sus 145 fichas tienen el campo
`comercial` (`contactado`, `confirmadoPorElComercio`, `notas`). Hoy está vacío en todas, así que no se
ve nada; pero el día que se empiece a vender, quién dijo que sí y quién dijo que no queda a la vista de
todos. Además hay algún correo personal que vino de OpenStreetMap.

- **Arreglo:** sacar ese campo del archivo público (dejarlo solo en la PC o cifrarlo como lo del
  celular) **antes del primer mensaje**. No guardar nombre del dueño, DNI ni celular personal.
- El texto de baja (Ley 25.326) ya va al pie de los mensajes comerciales (`PIE`): esa parte está hecha.

### C-9 · La etiqueta de IA de Meta en los reels — *Confirmado; choca con una regla*

> **Estado:** ✔ HECHO 8/10 · regla 114 (aviso en texto). Queda probar el campo is_ai_generated de Instagram.

Meta pide la etiqueta "Información de IA" para audio realista hecho con IA, y da de ejemplo justo "un
reel narrado con una voz de IA realista". El criterio de redes **prohíbe** decir que es IA y el código
no marca nada.

- **Evidencia:** `CRITERIO-REDES.md:180,215`; `redes/guiones.mjs:536`; `redes/meta.mjs` no tiene campo
  de etiqueta.
- **Cómo se avisa (solo búsqueda, confirmar en la documentación de Meta):** desde el 22/06/2026 la API de
  Instagram tiene el campo `is_ai_generated`. Se pone en `true` al crear el contenido y Meta agrega sola la
  etiqueta "Información de IA". Va en el momento de crear: después no se puede agregar. Para Facebook no
  se encontró el equivalente: confirmarlo. En TikTok existe un aviso de "contenido generado con IA"; el
  nombre exacto del campo en su API no se pudo confirmar.
- Fuentes: [registro de cambios de la plataforma de Instagram](https://developers.facebook.com/documentation/instagram-platform/changelog),
  [guía de publicación directa de TikTok](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post).
- **Propuesta:** si la API no deja, una línea fija "Voz generada con IA" en el texto y en la bio de
  Instagram. Implica cambiar las reglas 6 y 4.6 del criterio.
- **Decisión de Hernán y Andrés (8/10):** avisar con una línea de texto en el posteo (por ejemplo "Voz
  generada con IA"), **no** con la etiqueta visual de Meta. El campo `is_ai_generated` pone una etiqueta
  visible, así que **no se usa**. Riesgo a tener en cuenta: Meta podría poner la etiqueta por su cuenta si
  detecta la voz; si pasa, se revisa.

### C-10 · Lo rojo aprobado por una persona se publica — *Confirmado; no se toca sin preguntar*

> **Estado:** ✔ HECHO 8/10 · regla 119.

Las únicas notas que no salen **nunca**, ni aprobadas por una persona, son las listas de sepelios. Algo en
rojo (un menor, una víctima) sí sale si alguien lo aprueba, y el panel de la PC acepta esa aprobación
aunque el botón esté escondido. El criterio dice "no se publica nunca, ni por error".

- **Evidencia:** `web/scripts/generar-datos.mjs:431-434` y `:539`; `panel/servidor.mjs:690`.
- **Propuesta:** que el rojo funcione como los sepelios (nunca), con una prueba. Como toca la lista roja,
  **lo deciden Hernán y Andrés antes**.

### C-11 · Las pistas que salen solas — *Confirmado*

> **Estado:** ✗ PENDIENTE · hay que definir cómo se cuentan los medios argentinos.

La regla 101 ("con 3 medios, una pista sale sola") es de ustedes. Lo que falla es cómo se aplica:

1. **Reintenta lo que una persona ya miró y no publicó:** la pista de Messi tiene un borrador del 7/10 que
   no se publicó, y como no se cerró, el robot la reintenta cada 3 horas.
2. **Cuenta cualquier medio, de cualquier país:** la de Margaret Hamilton suma 31, entre la BBC, medios
   mexicanos e IMDb. No aplica "lo de afuera, solo con un argentino" ni "no se estrena un hecho de más
   de 12 horas".
3. **Solo sabe dos secciones**, Balcarce o Argentina: Messi saldría en Argentina y no en Fútbol.
4. **Entra con relevancia 95**, arriba de todo, y la firma dice que la controló el sistema.
5. **Si falla, no queda anotado por qué.**

- **Evidencia:** `panel/pistas-solas.mjs:17-22,26,46`; `panel/nota-de-pista.mjs:15`;
  `web/lib/notas-de-pistas.js:12,66`.
- **Propuesta:** no salir sola si ya se pidió un borrador; contar solo medios argentinos con el mismo umbral
  por sección; menos de 12 horas; sección según `REGLAS_SECCION`; relevancia normal; anotar el motivo del
  fallo; prueba con el caso Messi. Medio día.
- **Mientras tanto:** cerrar a mano esas dos pistas desde el celular si no quieren que salgan.

### C-12 · Huecos en el semáforo — *Confirmado con el código; no se toca sin preguntar*

> **Estado:** ✔ HECHO 8/10 · regla 118 (autorizado por Hernán y Andrés).

Se probó la función del semáforo con frases inventadas. Todas estas salen en **verde**, o sea, se publican
solas:

- "Un joven intentó **suicidarse**".
- "Investigan **abusos sexuales** en un club".
- "Detienen a un hombre por **feminicidio**".
- "**Violaron a** una mujer".
- "**Murieron** dos jóvenes en un choque en la ruta 226".
- "Hallaron **muerta** a una mujer".
- "Una **chica de 16 años** fue golpeada".

Pasan porque la búsqueda acepta letras de más al final, pero no otras formas del verbo ("murió" no
encuentra "murieron"), y la edad ("de 14 años") no está en ninguna lista. En lo de Balcarce es peor: desde
el 2/10 "denuncia" no frena, ni en Policiales, así que "Una vecina denunció que abusaron de su hija" sale
sola si viene de un medio local. No se encontró ningún caso publicado todavía.

- **Evidencia:** `REGLAS_SEMAFORO` (`ingesta/fuentes.mjs:1054`), `contiene` (`ingesta/ingesta.mjs:126`),
  `AMARILLO_QUE_SE_SUELTA_EN_LO_DE_ACA` (`fuentes.mjs:1193`).
- **Propuesta (3-4 h, con pruebas):** sumar la edad de menores con el sustantivo al lado (para no frenar
  "hace 15 años"); sumar las formas que faltan; que "denuncia" no se suelte en Policiales ni cuando se habla
  de abuso o violencia; y pedirle a la lectura con IA un campo "sensible" que solo pueda frenar.
- **La lista roja no se toca sin que ustedes lo decidan.**
- **Relacionado:** al juntar dos notas del mismo hecho, gana la verde sobre la amarilla
  (`lectura-ia.mjs:589`), y el semáforo de una historia mira solo el título de la nota principal
  (`ingesta.mjs:1482`). Que el grupo herede el peor semáforo. 1 h cada uno.

### C-13 · Foto de otro medio en Policiales — *Confirmado, publicado*

> **Estado:** ✔ HECHO 8/10 · regla 109.

La nota `fd2y4d` ("Choque frontal en la Ruta 226 deja tres heridos", Policiales) tiene una foto de
*El Eco de Tandil* cargada a mano el 3/10, sacada de otra nota de ese diario sobre **otros** accidentes, y
sin decir que es de archivo. El panel muestra el cartel "Policiales sin fuente oficial: no lleva foto real",
pero igual deja subirla. Además, si una nota pasa a Policiales después, conserva la foto que tenía.

- **Evidencia:** `web/scripts/foto-manual.mjs:72-90`; `web/scripts/fotos-notas.mjs:188-193`;
  `web/public/panel/fotos.js:18,140`.
- **Propuesta:** sacarle la foto a `fd2y4d` (5 min, lo decide una persona); que el panel y
  `foto-manual.mjs` no dejen subir foto real en Policiales sin marcar "fuente oficial"; que el banco no
  ponga foto real en Policiales; "(archivo)" en el crédito si la foto viene de otra nota; prueba. 2 h.

### C-14 · Una corrección que se deshace sola — *Confirmado (latente)*

> **Estado:** ✔ HECHO 8/10 · regla 111.

Cuando una nota aprobada desde el celular deja de estar en la ingesta (~72 horas), se rearma con el
título, la bajada y el cuerpo de la aprobación, y eso pisa la corrección hecha después en
`correcciones.json`. Si la corrección había sacado el nombre de una víctima, el nombre vuelve. Hoy no hay
ningún caso; alcanza con usar "Editar" sobre una nota ya aprobada.

- **Evidencia:** `web/scripts/generar-datos.mjs:632-642` y `:902-908`; `web/lib/archivo.js:365`.
- **Propuesta:** aplicar la corrección al final, con una prueba. 1 h.
- **Parecido:** una nota retirada el mismo día en que se aprobó puede volver cuando el lunes se poda la
  lista de retiradas (`panel/celular-datos.mjs:193-197`). Que lo retirado a mano gane siempre. 1 h.

### C-15 · La web congelada deja datos viejos en la web y en las redes — *Confirmado*

> **Estado:** ◐ PARCIAL 8/10 · regla 117. Las redes ya no hablan del clima ni de la farmacia de ayer. Queda la parte de la web.

- **En la web:** el turno de farmacia se fija al armar el sitio (el clima y el dólar se actualizan en el
  navegador; la farmacia no). Si la web se congela pasadas las 8:30, muestra la farmacia de ayer. El pie
  dice la hora del armado, sin la fecha (`generar-datos.mjs:959-967`, `web/app/layout.js:120-130`).
  Propuesta: elegir el turno en el navegador con la lista de próximos (ya trae la fecha), o "Consultá el
  turno" si no coincide; sumar la fecha al pie. 3 h.
- **En las redes:** las piezas se arman con `portada.json` sin mirar de cuándo es. Con la web congelada,
  el reel de clima de las 7 usa la temperatura de la madrugada, o el pronóstico de ayer como "HOY"
  (`reels/plan.mjs:178-182`, `:267-295`; farmacia por número de día, `:202`). Propuesta: si la portada
  tiene más de 2 horas, no armar clima ni repasos y avisar; elegir por fecha. 2-3 h.

### C-16 · Reintentos que gastan voz y duplican — *Confirmado*

> **Estado:** ◐ PARCIAL 8/10 · regla 123. Un mismo audio no se pide dos veces. Queda preguntar a Meta antes de reintentar y el tope por pieza.

El reloj vuelve a pedir toda pieza que no figura publicada, y el plan **la arma de cero y pide la voz otra
vez** (`redes/piezas.mjs:302-308`, `reels/plan.mjs:583`). La voz se pide antes de ffmpeg: si falla ffmpeg,
el audio ya se gastó. No hay tope: la farmacia tiene unas 20 vueltas en su ventana. Además:

- Solo se controla si el reel de Instagram ya salió, y después de gastar la voz.
- Las historias de clima, farmacia y participá se publican de nuevo sin mirar; Facebook y la historia de
  cada reel tienen 3 intentos sin mirar (`publicar-piezas.mjs:412,462-482`).
- Un repaso armado de nuevo puede elegir otras notas y salir dos veces.

**Propuesta (1 día):** guardar el identificador que devuelve Meta y preguntar por él antes de reintentar;
reusar el mp4 de la corrida anterior (como ya hace "Reintentar"); tope de 2 pedidos de voz por pieza y por
día; prueba con un Meta simulado que publica y contesta error.

### C-17 · Se acaban las efemérides y las piezas fijas el 31/10 — *Confirmado, con fecha*

> **Estado:** ◐ PARCIAL 8/10 · el vigilante avisa (desde el 20 y con menos de 7 días) y se corrigieron los documentos. Queda armar noviembre el día 20 y decidir las fijas.

- `web/data/efemerides-piezas.json` llega hasta el 31/10: desde el 1/11 "Un día como hoy" no se programa,
  y no queda anotado como faltante.
- Las fijas de participá vencen el 31/10 (`reels/fijas/vigencia.json`): desde el 1/11 gastan un audio
  lunes, martes, miércoles y viernes.
- Una efeméride **sin aprobar sale sola** (`redes/efemeride.mjs:249-256`). Los documentos (`PENDIENTES.md:16`,
  `docs/efemerides-octubre-para-revisar.md:3`) dicen que del 19 al 31/10 esperan la aprobación de Hernán,
  pero en `web/data/efemerides-piezas.json` esos días **no tienen la marca que los frena** y no hay ninguna
  aprobación registrada: si nadie las aprobó a propósito, **desde el lunes 19/10 salen a las 9 sin
  revisión**. **Decisión de Hernán (8/10): las efemérides
  salen salvo que él diga que no.** O sea, lo que hace el código está bien; lo que hay que corregir son los
  documentos que dicen lo contrario.
- **Decisión de Hernán (8/10): el mes siguiente se arma el día 20** (por ejemplo, el 20/10 todo noviembre),
  para tener por lo menos 10 días de revisión. Propuesta: que la corrida mensual de efemérides corra el 20
  de cada mes y mande un WhatsApp "ya está noviembre para revisar"; que el vigilante avise si el 25 todavía
  no está armado o si quedan menos de 7 días; decidir antes del 25/10 si se renuevan las fijas. Ojo: armar
  noviembre hoy congela la web (C-7); hay que arreglar esas pruebas antes del 20/10. 1-2 h.

---

## Nivel 0 · Arreglar lo que está roto hoy

*Minutos a unas horas. No cambian el comportamiento.*

**N1 · Las 9 fotos rotas** — *Corregido*
- Nueve notas piden una foto `.png` o `.webp` que está guardada como `.jpg` (por ejemplo la nota
  `epzsa5`, del autódromo).
- La causa está en `web/scripts/generar-datos.mjs:612` (`conFotosDelBanco`): la nota se queda con la
  extensión vieja después de que el banco recomprime la foto. Una de las 9 **no tiene ningún archivo**:
  a esa hay que sacarle la foto (sale la placa).
- **Pasos:** reasignar el `.jpg` a las 8; sacar la foto a la novena; que la nota tome siempre la
  extensión final; prueba con un caso real.
- 1-2 h · US$ 0 · riesgo bajo.

**N2 · La auditoría semanal del 5/10** — *Confirmado; en parte resuelto el 8/10*
- **Qué pasó:** la corrida programada para el lunes 5/10 a las 9 (12 UTC) GitHub la largó **8 horas
  tarde** (20:03 UTC) y la canceló a los 15 minutos sin correr nada. No fue un error del código.
- **Hecho el 8/10 (autorizado):** se corrió a mano. Terminó bien y guardó
  `web/data/auditoria.json` (fecha 8/10, un aviso menor: dos medidas de perfil sin confirmar en
  `FORMATOS.md`).
- **Falta:** sacarla del minuto 0, que es cuando GitHub más demora y saltea (`0 12 * * 1` →
  por ejemplo `47 11 * * 1`). Lo mismo para los otros horarios en punto.
- 15 min · US$ 0.

**G1 · Las 14 contradicciones de los documentos** — *Confirmado*
- Redes "apagadas" (prendidas desde el 29/09), "clave paga" (las cuatro son gratis), "14 workflows"
  (son 23 contando el sondeo temporal, 22 sin él), "00 a 12" (existe el 13), la duración de la
  corrida, el horario `7,37`, `PARA-CARGAR-A-MANO.md` (no existe), la cantidad de pruebas (~1.840),
  fechas de encabezados y `TAVILY_API_KEY` sin documentar.
- **Pasos:** corregirlas (manda el código); una prueba que cruce conteos (workflows, última regla).
- 2-4 h.

**M-doc · Las 10 contradicciones de los documentos de redes** — *Confirmado*
- Zoom de la placa, ventanas de los repasos, 6 o 7 audios por día, "Reintentar" sí commitea,
  comentarios de "clave paga", horarios del reloj, vigencia de las fijas.
- **Pasos:** corregir `docs/07-REDES.md`, `docs/08-INFRAESTRUCTURA.md`, `CRITERIO-REDES.md` y los
  comentarios viejos de `reels/` y de los workflows. 1 h.

**C6/P16 · El crédito de las fotos (antes "crédito en la tapa")** — *Corregido*
- La propuesta original decía poner el crédito también en la tapa y las secciones. **Eso contradice la
  regla 102**, que dice que el crédito va solo adentro de la nota. Lo que sí está mal es
  `docs/05-FOTOS.md:226-227`, que dice lo contrario de la regla.
- **Pasos:** corregir `docs/05`. Ya no es urgente. Si quieren revisar la regla 102, es una decisión
  aparte.

**Sondeos · Borrar los archivos que corrieron una sola vez** — *Corregido*
- `sondear-groq.yml`, `sondear-busqueda.yml`, `prueba-gemini.yml` (y su script) y
  `docs/efemerides-octubre-para-revisar.md`.
- **`ingesta/probar.mjs` se queda:** es la herramienta para probar fuentes nuevas (`ingesta/README.md`),
  útil para B5 y B7. Solo está vieja su lista `CANDIDATOS`.
- **Ojo:** borrar el de Gemini rompe `pruebas/auditoria-28-09.test.mjs:150`, que recorre esos archivos;
  hay que ajustar la prueba en el mismo cambio.
- Opcional: un solo workflow "Diagnóstico" con un menú, en lugar de varios manuales.
- 1-2 h · **necesita su aprobación**.

**Sondeo temporal de esta investigación** — *pendiente de borrar*
- `.github/sondeo-fuentes/` y `.github/workflows/sondeo-fuentes.yml` (solo en la rama `main-m9q04a`).
  Se borran al cerrar la investigación.

**V2-21 · Un ajuste de seguridad en la configuración del repositorio** — *A confirmar*
- Es una opción de la configuración de GitHub (5 minutos, la cambia una persona). El detalle está en el
  documento privado.

---

## Nivel 1 · Medir y ordenar sin cambiar nada

*1 a 4 horas cada uno. Casi sin riesgo.*

**B1 · Guardar el motivo real de cada fuente caída** — *Confirmado · clave*
- Cuando el medio contesta con error, `traer()` ya guarda el código ("HTTP 403"). Lo que se pierde es la
  causa cuando falla la red: queda solo "fetch failed". Fallan entre 24 y 84 de 236 fuentes por corrida.
- **Pasos:** guardarlos y mostrarlos en el aviso de "Fuente caída"; prueba con un error simulado.
- El trabajo es menor de lo estimado al principio (1 h). **Une** B1, el historial de N3 y la parte
  de fuentes de A6.

**A6 · Cronometrar cada tramo** — *Confirmado*
- Fuentes, IA, fotos, armado: hoy no se sabe cuánto tarda cada uno (la corrida del 7/10 a las 22:30
  tardó 6 min 58 s en total).
- Una línea de registro por tramo en `generar-datos.mjs`. 1 h.

**D1-1 · Medir cuánta IA se usa por día** — *Confirmado*
- Ninguna respuesta de Gemini o Groq guarda `usageMetadata` (tokens de entrada y salida). Sin eso no se
  pueden comparar proveedores ni prever el cupo.
- Guardarlo en lectura, redacción y fotos y sumarlo por día una semana. **Une** la parte de tokens de N5.

**M1 · Contador de voz con aviso a 8 de 10** — *Confirmado*
- El cupo gratis es 10 audios por día y nadie los cuenta. Un día normal gasta 7 (8 los jueves y
  sábados, según `panel/horarios.mjs`).
- Contar en el libro de redes y avisar por WhatsApp al llegar a 8. **Une** la parte de voz de N5.

**A7 · Vigilar al vigilante** — *Confirmado*
- `redes/vigilar.mjs` mira las corridas de 3 workflows (`actualizar`, `redes`, `cloudflare-deploy`;
  línea 621) y avisa si la auditoría está vencida. Si el propio vigilante deja de correr, nadie avisa.
  CallMeBot es de un solo teléfono y sin garantía.
- **Pasos:** healthchecks.io gratis (una persona pega la dirección como secreto); un aviso al final de
  `vigilancia.yml`; segundo canal (Telegram o ntfy, solo con `fetch`); sumar los workflows que nadie mira.
- Necesita que una persona cree la cuenta y pegue el secreto.

**A8 · Corridas de más de "Actualizar la web"** — *Medido*
- Además de cron-job.org, tiene un reloj propio (`7,37`). Medido: **unas 4 corridas duplicadas por
  día**. Cada una gasta cupo de IA y dispara Cloudflare y Redes.
- Ya no hace falta medir: pasa a **A8-b** (nivel 2).

**S1 · Cuentas y vencimientos** — *Confirmado*
- El dominio y el token de cron-job.org vencen el 21/09/2027; todo cuelga de una sola cuenta de
  Google; la API de Meta está fijada en v23 (se retira hacia mediados de 2027).
- **Pasos (persona):** renovar el dominio por varios años; 2FA con códigos de respaldo fuera de la PC;
  sumar a Andrés como administrador de Meta, Cloudflare y el repositorio; anotar la versión de Meta en
  los vencimientos del vigilante.

**D-priv · Qué hacen las capas gratis de IA con el texto** — *A confirmar*
- En la capa gratis de Gemini el texto puede usarse para mejorar sus productos, y a la IA le llegan
  notas con menores y víctimas que el semáforo después frena.
- **Pasos:** leer los términos de Gemini y Groq y decidir si esos casos van por otra clave. Persona, 1 h.

**V2-9 · La licencia del repositorio** — *Confirmado*
- No hay `LICENSE` y el `package.json` de la raíz dice `"license": "ISC"` (lo que pone `npm init`):
  se puede leer como que todo es libre.
- Poner `"UNLICENSED"` y `"private": true`, y un `LICENSE` que diga qué es de quién (código, textos y
  criterios, datos). 15 min. **Decisión** de qué licencia quieren.

**V2-11 · Que Google no tome el sitio como contenido en masa** — *A confirmar*
- Más de 1.000 notas reescritas con IA a partir de otros medios entran en lo que Google llama "abuso de
  contenido a escala".
- **Pasos:** mirar Search Console (cobertura e índice); considerar `noindex` para lo nacional sin aporte
  propio y empujar lo local. Depende de tener Search Console conectado.

---

## Nivel 2 · Arreglos chicos

*Medio día cada uno. Una cosa concreta, con su prueba.*

### Fuentes

**B5 · Recuperar Puntonueve** — *Confirmado*
- El único medio de Balcarce que falla (5 de cada 6 corridas del 8/10). Depende de B1 para saber por qué.
- Probar otra dirección del feed, `http` o un nombre de navegador honesto; si no hay forma, un acceso
  alternativo. 3-4 h.

**B2 · Reintentar una vez las fuentes que fallan** — *Confirmado*
- Hoy no reintenta nunca, y muchas andan en la corrida siguiente. Un reintento al final, con pausa
  corta; contar cuántas se recuperan. Depende de B1.

**B3 · Tope de pedidos a la vez** — *Corregido*
- Hoy se piden las 236 a la vez. Además de un tope general (20-30), **un tope por sitio**: varios feeds
  del mismo medio a la vez parecen un ataque. Comparar fallas antes y después. Depende de B1.

**B4 · Otro nombre de navegador, fuente por fuente** — *Corregido*
- El campo ya existe: se llama `agente`, en `ingesta/fuentes.mjs`. No hace falta crearlo.
- Usar un nombre **honesto** (que diga Radar Balcarce y la dirección), no simular un navegador. Activar
  de a una fuente y medir.

**B6 · Apagar con una nota las fuentes que nunca andan** — *Confirmado*
- 19 medios no aportaron ninguna nota y 13 casi siempre fallan. Después de B1 y B4, `activa: false`
  con nota y rehacer `FUENTES.md`. **Decisión** de ustedes.

**A4 · No reabrir lo ya visto en las páginas raspadas** — *Corregido*
- Las 3 fuentes raspadas abren unas 15 notas una por una en cada corrida (`ampliar` en
  `ingesta/ingesta.mjs`).
- Saltearlas sin más perdería datos. Lo correcto: **guardar** la bajada, la fecha y la foto de cada una
  la primera vez y reusarlas. 3 h.

**V2-16 · Aceptar solo enlaces http y https de las fuentes** — *Confirmado*
- La ingesta toma el `<link>` del feed tal cual y la nota lo pone en un enlace (`ingesta/ingesta.mjs:209,229`;
  `web/components/verificacion.js:99`). React bloquea `javascript:`, pero conviene cerrarlo igual.
- Filtrar en la ingesta (las Pistas ya lo hacen, `ingesta/pistas.mjs:216`). 1 h.

### Flujo y robots

**A8-b · No correr si ya corrió hace menos de 20 minutos** — *Confirmado*
- Por A8 (~4 duplicadas por día). Un paso al inicio de `actualizar.yml` que corte si la última corrida
  buena tiene menos de 20 minutos. 2 h.

**A2 · Guardar la memoria del armado del sitio** — *Confirmado*
- El registro dice "No build cache found" en cada armado. Guardar `web/.next/cache` con `actions/cache`
  y medir con A6. 2 h.

**A5 · Que las pruebas corran cuando cambia el código, no los datos** — *Corregido*
- Las pruebas tardan 16 s, pero una prueba mal escrita congeló la web dos veces (3,5 h y 10 h), y C-1 y
  C-7 son el mismo problema.
- **Dos caminos:** (a) un `pruebas.yml` con `on: push` que ignore `web/data/`, y en el ciclo dejar solo
  un control corto (JSON válido, motivo/cuándo/quién, SEO); (b) guardar en caché un "sello" del código
  y correr las pruebas largas solo si el código cambió. Se puede combinar con A1.

**V2-20 · Permisos de los workflows** — *Confirmado* — **◐ PARCIAL 8/10 · permisos hechos; faltan fijar las acciones**
- `armado-vacio.yml` y `pruebas-otra-hora.yml` no dicen `permissions:` y heredan lo del repositorio;
  las acciones van por etiqueta (`@v4`), no fijadas; `auditar-redes.yml:64` mete un dato escrito en el
  comando.
- Agregar `permissions: contents: read`, fijar las acciones y pasar el dato por variable. 1 h.

**Borrar-c · Archivos que se proponía borrar** — *Corregido: no se borra ninguno*
- `web/scripts/recuperar-archivo.mjs` es el rescate de C-5; `combinar-auditorias.mjs` es parte del proceso
  mensual de efemérides; `auditar-redes.yml` tiene "ayer" y el modo `--crudo`; `prueba-estadisticas.yml` es
  un diagnóstico útil de Cloudflare y Meta. Se quedan los cuatro.

**Deps · Dependencias que la web usa sin declarar** — *Discutible*
- `ffmpeg-static`, `@resvg/resvg-js` y `sharp` se resuelven desde la carpeta de la raíz. Solo se
  rompería si alguien instalara únicamente `web/`. Anotarlo en `web/package.json` o dejarlo como está.

### Redacción

**P12 · No reintentar si el semáforo va a frenar lo mismo** — *Confirmado*
- Un motivo del semáforo no cuenta como "baja" y se reintenta hasta el tope con el mismo resultado.
  Si el motivo es del semáforo, no reintentar. 3 h.

**P7-10 · Que el criterio diga los mismos números que el código** — *Confirmado*
- "Tres intentos" (son 3, 4 o 5), "450 notas" (son pedidos), copia de 10 o 12 palabras, tono
  "liviano" contra "no liviano". Corregir el criterio. 3 h.

**P11-14-15 · Lo que el criterio pide y nadie hace cumplir** — *Confirmado (P14 exagerado)*
- Ganchos prohibidos en bajada, guion y texto de redes; la ciudad del medio; la bajada de 2 a 3 frases.
- Decidir regla por regla: se aplica en código o se borra del criterio. P14 pesa poco.

**P13 · Que el verificador arregle las tildes que ya conoce** — *Discutible*
- Rechaza una nota con 3 palabras sin tilde aunque `CON_TILDE` sabe arreglarlas. Aplicarlas antes de
  contar. Discutible porque la tilde mal puesta a veces es señal de que la IA copió mal.

### Fotos

**C8 · Reintentar las fotos pendientes y rechazar miniaturas de Google** — *Confirmado*
- 9 "no se pudo volver a bajar" y 2 con el máximo de intentos; una foto manual era una miniatura de
  Google Images (`encrypted-tbn0.gstatic.com`). Marcar las pendientes y rechazar esas direcciones.
  **Une** C8 y P22.

**P17 · Cerrar la puerta a las licencias CC BY-NC y BY-ND** — *Confirmado*
- La expresión de `ingesta/fotos.mjs` no tiene ancla al final: aceptaría NC y ND. Hoy el banco solo
  tiene BY y BY-SA (riesgo latente). Anclarla y probar con NC, ND y NC-SA. 1 h. **Une** P17 y P23.

**C-banco · Podar el banco de fotos** — *Discutible*
- 322 marcas "intentado" sin archivo; `banco-fotos.json` pesa 524 KB y se commitea cada media hora.
  Podarlas ahorra peso pero esas marcas evitan reintentar fotos que no sirven.

**C-rev · Una persona revisa los derechos de las fotos** — *Confirmado*
- Una vez por semana, las fotos de las notas más compartidas y de medios chicos locales
  (`docs/05-FOTOS.md` lo pide). 1 h por semana.

**C7 · Sin foto real de chicos en notas amarillas** — *Discutible; conversar antes*
- Una nota amarilla aprobada a mano puede llevar la foto de un chico (está en `PENDIENTES.md`). Toca la
  regla de menores: **no se toca sin preguntar**.

### IA

**D3 · Fijar la versión del modelo de Gemini** — *Corregido*
- El alias `gemini-flash-lite-latest` cambia de modelo solo. Fijar una versión o al menos registrar el
  `modelVersion` que devuelve cada respuesta.
- **Ojo:** hay una prueba que **exige** `-latest` (`pruebas/auditoria-28-09.test.mjs:149`): fue una
  decisión del 28/09. Si se fija, se cambia la prueba en el mismo paso.

### Web

**N4 · Chequeo de enlaces, imágenes y duplicados, como aviso** — *Confirmado*
- Un chequeo de prueba revisó 1.148 páginas en 13 s y encontró las 9 fotos rotas (N1); 0 enlaces
  internos rotos. Sumarlo a `revisar-seo.mjs` **como aviso, nunca como corte**. Depende de N1.

**RSS-1 · Mejorar el RSS que ya existe** — *Confirmado*
- Hoy hay un solo `feed.xml` (título, enlace, fecha, sección, bajada). Un feed por sección, con el cuerpo
  y validado. 1 día.

**V2-13 · El feed y las imágenes para Google** — *Discutible* — **◐ PARCIAL 8/10 · el feed ya no está bloqueado y se sacó el Host**
- `robots.txt` bloquea `/feed.xml` **a propósito** (comentario en `web/app/robots.js:29-31`: "el feed
  es para programas, no para el índice"). Google sí usa los feeds para descubrir notas: revisar esa
  decisión.
- Cada nota declara una sola imagen (1200×630); Google recomienda tres proporciones (16:9, 4:3, 1:1).

**V2-15 · Accesibilidad** — *Confirmado* — **◐ PARCIAL 8/10 · enlace "Saltar al contenido" hecho**
- No hay enlace "saltar al contenido" y el texto alternativo de cada foto es el título de la nota. Lo
  demás está bien (landmarks, `lang="es-AR"`, contraste). Agregar el enlace y sacar el texto
  alternativo del epígrafe. 2 h.

**V2-12 · Quién publica, en los datos para Google** — *Confirmado*
- `/quienes-somos` dice "Hernán y Andrés", sin apellido ni responsable. En los datos estructurados el
  autor es una organización con la explicación metida en el nombre ("Radar Balcarce (nota escrita con
  IA…)"; `web/components/metadatos.js:98-101`).
- Un autor con el nombre limpio (la explicación queda en la firma). **Decisión:** cuánto quieren
  mostrar de ustedes.

**V2-8 · La política de privacidad** — *Confirmado; revisar con un abogado*
- No dice quién es el responsable ni trae la leyenda de la AAIP (Ley 25.326). Dice "dispositivo y
  página, nada más", pero se guardan país, de dónde llega la visita y la hora, en un JSON público
  (`redes/estadisticas-detalle.mjs:130-146`). No menciona Google Fonts (la IP del lector va a Google,
  `web/app/layout.js:92-99`), Meta, WhatsApp, CallMeBot ni que lo que manda la gente puede pasar por IA.
- Reescribirla y tener las fuentes en el propio sitio (`next/font/local`), que además acelera la carga.
- **Falta una página de términos de uso** (lo señaló una auditoría externa el 8/10). Va junto con la política de
  privacidad y la página "Cómo trabajamos" (S-5).
  3 h + 2 h.

### Redes

**M5-6 · Podar el libro de redes y bajar el peso de las tarjetas** — *Discutible (exagerado)*
- El libro crece ~6 KB por día y las tarjetas de Instagram pesan 811 KB en promedio. Ninguna de las dos
  cosas molesta hoy.

### Comercial (lo que ya está armado)

**Com-1 · El mapa comercial: corregir lo que ya hay** — *Confirmado*
- De las 145 fichas, **47 son escuelas e instituciones** ("Educación y cultura"): comercios hay ~98.
- La zona que trae de OpenStreetMap (`CAJA` en `comercial/importar-osm.mjs:17`) cubre **solo la
  ciudad**: quedan afuera San Agustín, Napaleofú, Los Pinos, Ramos Otero y La Brava.
- **Pasos:** separar instituciones de comercios; reimportar con una zona por localidad.
- Separar siempre lo que vino del mapa (licencia ODbL, hay que citarlo) de lo que confirmó cada comercio.
- **No usar Google Places**: sus condiciones prohíben mostrar los datos en un mapa que no sea de Google y
  obligan a borrar las coordenadas a los 30 días.

### Respaldo (backup) de todo — *Propuesta · decidido hacerlo el 8/10*

**¿Por qué hoy depende todo de GitHub?** Porque ahí está todo junto: el código, los datos (las notas, las
correcciones, las decisiones), las fotos y los robots que corren cada media hora. Cloudflare solo guarda la
última copia armada del sitio. Si GitHub suspendiera la cuenta (por ejemplo, por un reclamo de derechos de
autor por una foto), **la web seguiría en el aire pero congelada**, las redes dejarían de salir, y sin copia
se perdería la historia.

**El flujo propuesto: cuatro copias, cada una en un lugar distinto.**

| # | Dónde | Qué se copia | Cada cuánto | Qué hace falta (persona) | Costo |
|---|---|---|---|---|---|
| 1 | **GitHub** (el original) | Todo | Siempre | Nada | US$ 0 |
| 2 | **GitLab** (otro servicio, proyecto privado) | El repositorio entero, con toda su historia | Una vez por semana, solo, desde un robot | Crear una cuenta con `radarbalcarce@gmail.com`, un proyecto privado y una llave; pegar la llave como secreto de GitHub (`GITLAB_TOKEN`) | US$ 0 (el plan gratis guarda varios GB por proyecto; a confirmar el número exacto) |
| 3 | **Google Drive** de `radarbalcarce@gmail.com` | Un solo archivo con todo el repositorio y su historia (`git bundle`), un .zip de `web/data/` y la lista de claves (solo los nombres) | Una vez por semana; se guardan las últimas 8 semanas y una por mes | Dar permiso una vez para que el robot suba a Drive (se pega como secreto) | US$ 0 (15 GB gratis, compartidos con el Gmail) |
| 4 | **La PC** (y un pendrive o disco externo) | Una copia completa | Una vez por mes, con un `RESPALDAR.bat` que la baja y la guarda con la fecha | Enchufar el pendrive y hacer doble clic | US$ 0 |

**Además:**
- **Un aviso si el respaldo falla** (en el WhatsApp de las 21, y en el vigilante).
- **Una prueba de restauración por año:** alguien baja la copia de GitLab o Drive y comprueba que el sitio se
  arma. Un respaldo que nunca se probó no se sabe si sirve.
- **Un documento privado** con qué cuentas existen, qué secretos hay y dónde se renueva cada uno (**los nombres,
  nunca las claves**). Va en el Drive.
- **Las dos voces no se pueden copiar** (viven en el proyecto de Google). Se anota con qué texto se crearon
  (ya está en `CRITERIO-REDES.md`) para poder rehacerlas parecidas.

**Descartado por ahora:** Codeberg (pide que el proyecto sea de código libre) y Bitbucket (1 GB por
repositorio en el plan gratis: no alcanza para las fotos).

**Trabajo:** 3 a 4 horas de código, más 20 minutos de una persona para crear la cuenta de GitLab y dar el
permiso de Drive.

### Auditoría de fotos — *Propuesta nueva · nivel 2-3*

Hoy nadie revisa las fotos ya publicadas (por eso pasó C-13). Propuesta, de lo barato a lo caro:

1. **Control por código en cada corrida (gratis):** ninguna foto real en Policiales sin marca de fuente
   oficial; ninguna foto sin evaluación (I-4); ninguna foto repetida en el mismo día.
2. **Una vez por semana, con IA (gratis, dentro del cupo):** mirar las fotos de la semana y preguntar si tiene
   marca o nombre de otro medio, si aparece un chico, y si la foto tiene que ver con la nota. Que avise en la
   pestaña Fotos, como hace la auditoría de textos con Revisión.
3. **Herramientas gratis como segundo control** (sección Herramientas): leer texto en los bordes (marcas) y
   detectar caras (para Policiales y notas con chicos).
4. **Una persona, 15 minutos por semana:** las fotos manuales y las de Policiales.

### Estadísticas: qué se mide hoy y qué falta (revisado el 8/10)

**Ya existe y anda.** Dos veces por día el vigilante guarda los números en `web/data/estadisticas.json`. Salen en la
pestaña Números del celular y en el WhatsApp.

| Qué | De dónde | Qué mide | Último dato (8/10, 9 h) |
|---|---|---|---|
| **La web** | Cloudflare Web Analytics, sin cookies | Visitas y vistas (12 h y 24 h), páginas más vistas, de dónde llegan, países, horas y aparatos | 70 visitas y 80 vistas en 24 h |
| **Facebook** | API de Meta (permiso de estadísticas activo) | Seguidores, vistas e interacciones de la página | 7 seguidores, 672 vistas, 0 interacciones |
| **Instagram** | API de Meta | Seguidores, publicaciones, alcance, vistas e interacciones | 4 seguidores, 102 publicaciones, alcance 1, 2 vistas |

**Lo que dicen los números:**
- **Instagram hoy casi no llega a nadie.** Facebook sí: refuerza la decisión de reels en Facebook.
- **En la web, muchas visitas son robots** de afuera. El 6/10 hubo 2 visitas de Argentina.

**Lo que falta:**
1. **Números por pieza:** cuántas reproducciones tuvo cada reel y cada historia, separando seguidores de no
   seguidores. Hace falta para la prueba de 4 semanas de reels (M3-4-7). Los identificadores ya están en el libro
   de redes.
2. **Filtrar robots y contar solo Argentina y la zona** en la web. Sin eso, los números no sirven para vender
   publicidad.
3. **Search Console:** búsquedas, clics y páginas indexadas, en el mismo lugar.
4. **Un resumen semanal y mensual** con la evolución, no solo el día.

### SEO: que Google nos liste bien (auditoría completa del 8/10)

*Se compiló una copia del sitio con la dirección real y se miró el HTML. No se pudo abrir radarbalcarce.com ni
las páginas de Google desde este entorno: los requisitos de Google salen de búsquedas que citan a Google.*

**Cómo estamos, en simple:**
- **La parte técnica está bien:** direcciones fijas, sitemaps, datos para Google, imagen grande permitida y la
  transparencia sobre la IA.
- **El problema principal es de contenido.** De 1.104 notas con página:
  - unas 500 son nacionales, reescritas de otros medios;
  - 294 son locales, reescritas de un solo medio;
  - 194 tienen el texto copiado de la fuente y se pueden indexar.
- **Eso es lo que Google castiga como "contenido a escala sin aporte".** Desde agosto de 2026 Google mide todo
  el dominio junto: las notas flojas arrastran a las buenas.

**S-1 · Riesgo de "contenido a escala"** — *Confirmado · CRÍTICO* (amplía V2-11 y W-5) — **◐ PARCIAL 8/10 · noindex a las 296 sin cuerpo; falta lo de una sola fuente (jefe editor)**
1. `noindex` ya mismo para las 296 páginas sin cuerpo (W-5).
2. **Lo nacional (decidido el 8/10): no hace falta que todo tenga un ángulo de Balcarce.** El filtro es otro:
   - **Se ofrece a Google** lo que tiene **varias fuentes** y una nota **única** (síntesis más un dato verificado
     que no está en las fuentes; ver "Jefe editor" en `IDEAS-NUEVAS.md`).
   - **No se ofrece** (`noindex, follow`, fuera del sitemap) lo que es una reescritura de **un solo** medio sin nada
     propio, y lo duplicado.
   - Se mide en Search Console y se ajusta.
3. En lo local de un solo medio, sumar aporte propio: contexto, enlaces a notas anteriores, datos de servicio,
   una consulta propia.
4. Una regla en el criterio contra los títulos sensacionalistas: hoy hay en el sitemap de noticias títulos como
   "toma una drástica decisión" o "deja una picante dedicatoria".

**S-2 · La fecha que va a Google es la de la fuente, no la nuestra** — *Confirmado · ALTA*
- La página le dice a Google que salió horas antes de existir: mediana de 4 horas, y 370 de 890 notas con más de
  6 (`web/components/ficha.js:89`, `web/app/sitemap-news.xml/route.js:42`). Guardar cuándo sale de verdad en la web
  y usar esa fecha. 3 h.

**S-3 · La mitad de las notas de Balcarce no dicen "Balcarce"** — *Confirmado · ALTA*
- Son 278 de 573 notas locales: Google no puede saber que son de acá. Por ejemplo, "Chocan una EcoSport y un Fiat
  en avenida Cereijo y 14". Que la bajada nombre la localidad cuando el hecho es de acá (es un dato, no se
  inventa) y que la descripción empiece con "En Balcarce:". 3 h.

**S-4 · Para Google, la imagen es una tarjeta con texto, no la foto** — *Confirmado · ALTA* (Discover)
- Hay foto real de 1.200 px en el 63 % de los casos. Declararla en tres proporciones (16:9, 4:3 y 1:1). La tarjeta
  sigue para WhatsApp y Facebook. 4 h.

**S-5 · Señales de confianza** — *Confirmado · ALTA* (amplía V2-12)
- Faltan:
  - nombres completos con su rol (por ejemplo, "Director responsable");
  - una página pública "Cómo trabajamos y cómo usamos la IA";
  - correcciones visibles con su fecha: hoy una corrección no cambia la fecha de modificación ni se avisa
    (`web/lib/tiempo.js:19-25`).
- Quiénes somos dice "sin copiar", y las 194 páginas de S-1 lo contradicen.

**Más chicos (MEDIA y BAJA):**
- El título de la pestaña corta la nota con "…" (se pierde la última palabra).
- Los títulos de las secciones dicen cosas como "Balcarce en Balcarce" o "Argentina en Balcarce".
- El feed está bloqueado en `robots.txt` (V2-13).
- El `lastmod` del sitemap cambia cada media hora en las páginas fijas.
- `/tema/concejo` está en el sitemap.
- La página 404 trae dos indicaciones contradictorias.
- Sobra una línea `Host:` en `robots.txt`.
- **Bing:** importar el sitio desde Search Console a Bing Webmaster y avisarle cada nota nueva (IndexNow). Bing
  también alimenta a ChatGPT.

**Correcciones a lo anotado:**
- **Publisher Center ya no admite medios nuevos** (desde abril de 2024): entrar en Google Noticias es automático.
  Hay que sacar ese pendiente de `SEO.md` y `PENDIENTES.md`.
- **El cuadro de búsqueda en Google** (SearchAction) ya no existe desde noviembre de 2024: no agregarlo.

**El audio en cada nota no mejora la posición en Google.** Gente de Google lo dijo en 2021 y en 2025: lo que Google
lee es el texto. Lo que sí aporta el audio:
- accesibilidad;
- gente que prefiere escuchar;
- como podcast, estar en Apple Podcasts y Spotify. Google Podcasts cerró en 2024.

**Para el podcast en Apple y Spotify** hace falta un RSS con lo que piden: imagen cuadrada de 1.400 a 3.000 px,
categoría, idioma, dueño con correo (queda público), un mp3 por episodio con su duración y un identificador que no
cambie nunca. Hoy los audios viven solo en Instagram y Facebook: primero hay que guardarlos (Q1).

**¿Algo bloquea a los lectores automáticos?** Una auditoría externa no pudo abrir `robots.txt` ni el sitemap: le
apareció un bloqueo de Cloudflare. Nuestro `robots.txt` no bloquea a nadie salvo `/feed.xml` y `/panel/`, y
Cloudflare deja pasar a Google. Mirar en Cloudflare (bots y "rastreadores de IA") qué está activo y decidir si se
deja leer a los buscadores con IA, que pueden traer lectores. El sitio tiene un `llms.txt` pensado para ellos.

**¿Cuántas páginas tiene Google?** Una auditoría externa dice que Google no tiene ninguna. Desde acá no se pudo
comprobar. **Hay que mirarlo en Search Console**, porque define cuán urgente es S-1.

**Las personas:** mirar en Search Console, una vez por semana, qué páginas se indexaron y cuáles no, y las
búsquedas con "balcarce".

### Dónde vive cada cosa (mapa del 8/10, de `docs/08-INFRAESTRUCTURA.md` y del repositorio)

| Qué | Dónde vive hoy |
|---|---|
| **El código** (motor, redes, reels, panel, web) | **GitHub** (repositorio público) |
| **Las notas y sus datos** (archivo, banco de fotos, correcciones, decisiones, libro de redes, estadísticas) | **GitHub**, en `web/data/` (se guardan cada media hora) |
| **Las fotos** (578, unos 45 MB) y el banco de fotos | **GitHub** (`web/public/fotos-notas`); al lector se las sirve **Cloudflare** |
| **La web que ve el lector** (las páginas armadas) | **Cloudflare Pages**: un robot de GitHub la arma y la sube |
| **Los robots** (cada 30 min, redes, vigilancia) | **GitHub Actions**; los dispara **cron-job.org**, un servicio de afuera |
| **El panel del celular** | Sus archivos están en el mismo sitio (**Cloudflare**, en `/panel`). No tiene servidor: guarda las decisiones en **GitHub**, con la llave de quien lo usa |
| **El panel de la PC** | Solo en la PC (hoy sin uso) |
| **Las fuentes** (~90 medios) | Los sitios de cada medio. Solo la **lista** está en GitHub (`ingesta/fuentes.mjs`, `FUENTES.md`) |
| **Las claves** | **GitHub Secrets** (nunca en el código ni en un chat) |
| **Los reels, historias y posteos publicados** | **Meta** (Facebook e Instagram). El video armado queda 3 días como adjunto de GitHub y después se borra |
| **Las voces** | **Google** (proyecto de la clave de redes) |
| **Las visitas** | **Cloudflare Web Analytics**; los números agregados se guardan en GitHub (`estadisticas.json`) |
| **El dominio** | Registrado en **DonWeb**; el DNS está en Cloudflare. Vence el 21/09/2027 |
| **Qué ve Google** | **Search Console** |
| **Respaldo** | **No existe todavía** (propuesta: cuatro lugares) |

**Lo que sí depende de GitHub:** el código, todos los datos, las fotos y los robots. **Cloudflare** solo guarda la
última versión armada del sitio, y por eso, si GitHub falla, la web sigue pero queda congelada.
**Fotos: ya está anotado** pasarlas a Cloudflare y a un formato más liviano: C1 (miniaturas de 400 px), C2 (vista
previa de WhatsApp en JPG), C3 (WebP y tres tamaños) y R2-fotos (llevarlas al depósito de Cloudflare).

### Modelos de IA: cuál para qué y cuánto cuesta (análisis del 8/10)

**Precios por millón de tokens** (entrada / salida; tabla de Anthropic del 6/10, a confirmar al contratar):

| Modelo | Entrada | Salida | Para qué sirve acá |
|---|---|---|---|
| Gemini (hoy, clave gratis) | US$ 0 | US$ 0 | Lo que ya se hace: lectura, fichas, redacción. Con límites por día |
| **Haiku 5.5** | US$ 0,10 | US$ 0,50 | Tareas de volumen: segunda opinión, notas viejas, auditorías, fotos |
| **Sonnet 5.5** | US$ 2 | US$ 10 | Las pocas notas importantes, donde importa más la calidad |
| Opus 5.5 | US$ 4 | US$ 20 | No hace falta en producción |
| Lotes (Batch) | −50 % | −50 % | Todo lo que no corre con apuro (notas viejas, auditorías) |

**Volumen medido en el archivo (8/10):** 1.068 notas. Con 3 o más fuentes entraron **198 en los últimos 8 días,
unas 25 por día** (Economía, Fútbol, Política y Argentina concentran la mayoría). Un pedido de redacción pesa unos
9.000 tokens de entrada (el criterio más las fuentes) y devuelve unos 1.000.

**Cuánto costaría cada cosa** (cuentas con esos números; la medición real es D1-1):

| Tarea | Modelo propuesto | Costo |
|---|---|---|
| Lectura, fichas y redacción de siempre | Gemini gratis, como hoy | US$ 0 |
| Pasar toda la redacción (hasta 60 notas por día) a Haiku | Haiku 5.5 | unos US$ 3-4 por mes |
| "Jefe editor" para las ~25 notas por día con 3+ fuentes | Todas con Haiku | ~US$ 1 por mes |
| Lo mismo, con Sonnet para las 5 más importantes del día | Haiku + Sonnet | ~US$ 5 por mes |
| Lo mismo, con Sonnet para las 25 | Sonnet 5.5 | US$ 13-21 por mes |
| Lo mismo, con Opus | Opus 5.5 | ~US$ 42 por mes |
| Segunda opinión sobre las fotos (~24 por día, cada una ~1.500 tokens) | Haiku 5.5 con imagen | ~US$ 0,15 por mes; las 578 que ya hay, ~US$ 0,10 una vez |
| Reescribir las ~300 notas viejas | Haiku 5.5 en lote | menos de US$ 1 |
| Auditoría semanal de textos y fotos | Haiku 5.5 en lote | centavos |

**Cómo gastar menos:**
1. **Primero el código:** el cruce, el semáforo y el verificador son código y no gastan tokens.
2. **El modelo más barato que alcance:** lo de volumen con Gemini gratis o Haiku; Sonnet solo para lo que más pesa.
3. **Lotes** para lo que no corre con apuro: la mitad del precio.
4. **Caché del criterio:** el criterio editorial viaja igual en cada pedido; guardado, cuesta una décima parte.
5. **Esfuerzo bajo** en las tareas de rutina (el modelo piensa menos y gasta menos).
6. **Mandar solo lo necesario:** el texto relevante de cada fuente, con tope de palabras.
7. **Medir antes y después** (D1-1): sin ese contador, estos números son estimaciones.

**Estado (8/10): todavía no hay cuenta ni API de Anthropic.** Todo lo de arriba queda **para tener en cuenta**.
Mientras tanto se sigue con Gemini y Groq, y el código nuevo se escribe de modo que cambiar de proveedor sea
cambiar una configuración, no reescribir. Para el jefe editor y la segunda opinión de fotos se puede usar
un modelo de Gemini más fuerte dentro del cupo gratis (son pocas notas por día; el cupo y la calidad se confirman
con la prueba de 30 notas).

**Lo que hace falta para usarlos (solo código `fetch`, sin dependencias):**
- una cuenta en Anthropic con crédito y **un tope mensual de gasto** (por ejemplo, US$ 10);
- la clave, pegada por una persona como secreto de GitHub (nunca en un chat);
- si el modelo se niega a escribir una nota (a veces pasa con temas de violencia), la nota sigue con Gemini;
- primero se compara con 30 notas reales (D1) para ver si Haiku o Sonnet escriben mejor que Gemini. **No lo
  sé hasta medirlo:** hoy el verificador rechaza 111 de 611 notas intentadas con Gemini.
- **Privacidad (D-priv):** en la capa gratis de Gemini el texto puede usarse para mejorar sus productos. Según los
  términos comerciales de Anthropic, la API no usa lo que se le manda para entrenar (a confirmar al contratar).
  Eso favorece mandarle lo delicado.

### Las 296 notas viejas sin cuerpo: ¿reescribirlas? (**decidido el 8/10: se adopta la recomendación**)

- **El costo no es el problema:** con Haiku en lote saldría menos de US$ 1; con Sonnet, unos US$ 8.
- **Lo que sí complica:**
  - Para reescribir hace falta la nota original. Son del 18 al 25/09: puede haber cambiado o estar bloqueada.
  - Con solo el resumen copiado (menos de 70 palabras) no hay material. La regla "sin material no se pide" lo frena.
  - Son noticias de hace 2 o 3 semanas: al lector ya no le sirven. Solo le importan a Google.
- **Recomendación:**
  1. **`noindex` a las 296 ahora** (S-1): gratis, 3 horas, resuelve el riesgo con Google.
  2. **Reescribir solo las de Balcarce** y las que salieron en redes (unas 30 a 50), en un lote con Haiku. Cada una
     pasa por el verificador, con su fecha original, y con la foto ya elegida.
  3. Las demás quedan en el archivo, sin Google.

### Reglas y verificador: coherencia y duplicados (auditoría del 8/10)

*Medido con `main` del 8/10: 608 notas intentadas (1 al 8/10), 1.068 en el archivo, 34 horas de historial. La
prueba completa no se pudo correr acá; las 102 pruebas de verificador, estilo, criterio y lectura pasan.*

**Lo que dicen los datos:**
- De 608 notas, **120 quedan sin cuerpo (20 %)** y 488 salen con cuerpo.
- De 81 rechazos del verificador por texto, **35 (43 %) los causan reglas de forma** (`repite`, `copia`, `promesa`,
  `negacion`, `tildes`), que no protegen de ninguna falsedad. Las otras 46 involucran una regla de exactitud.
- Las notas con 3 o más intentos terminan bien solo el 46 %.

**Correcciones a lo anotado:** P7-10 ("copia de 10 o 12 palabras") **no es una contradicción**: es un margen
deliberado y está documentado (`docs/04-REDACCION.md:132-134`); lo que sí pasa es que el número está en cuatro
lugares. P1-6 queda **confirmado con datos** (arriba).

**Los 10 hallazgos, por impacto:**

| # | Qué pasa | Gravedad | Propuesta |
|---|---|---|---|
| 1 | **"ALTA" y "N medios" cuentan fuentes que la IA nunca leyó.** De las fuentes que recibe, solo la principal viene con texto completo; las demás, con un resumen de 280 caracteres. 293 de 724 notas tienen más medios que fuentes consultadas (`uknghh`: 38 medios, 3 leídas). `lectura-ia.mjs:597`, `reescritura.mjs:633-644`, `ingesta.mjs:806-809` | Alta | Unir también los orígenes; anotar si cada fuente se leyó entera o en resumen; que ALTA exija fuentes leídas |
| 2 | **Los números, causa nº 1 de rechazo.** "Treinta y cinco" se lee como 30 y 5; "veintidós", "doscientos" y "2º" no se leen; el guion se rechaza aunque diga lo mismo que el título. 17 de 84 fallos. `verificar.mjs:58-117`; la regla 7 manda escribir los números en palabras | Alta | Leer compuestos, centenas y ordinales; verificar el guion como "mismas cifras que el título"; tolerar "más de" debajo de 100 en el cuerpo |
| 3 | **Fechas:** el prompt manda comparar la fecha de hoy con la de cada fuente, pero esos encabezados no entran en el material del verificador. "Ayer" en la fuente y "el viernes" en la nota se rechaza. 7 notas terminaron así | Alta | Meter las fechas de las fuentes, con su día, en el material verificable |
| 4 | **La regla de negación tira notas buenas:** "Cerondolo no juega" → "se baja / queda fuera" cae. 7 notas | Media-alta | Ampliar el léxico ("fuera", "baja", "ausente") o pasarla a aviso |
| 5 | **"Promesa" mata cuerpos buenos:** cuenta "Gran", "Premio" y "Singapur" como tres nombres. `1we1z9n` espera hoy con 146 palabras | Media | Ignorar sustantivos comunes (Gran Premio, Copa, Liga) |
| 6 | **El segundo pedido rehace todo,** aunque solo falle el título. 923 intentos para 608 notas | Media | Corrección parcial ("rehacé solo el título"); va con P12 |
| 7 | **Los nombres que abren una oración no se controlan:** "Gómez aseguró… Rodríguez criticó…" pasa con ambos apellidos inventados. `verificar.mjs:166-170` | Alta por diseño | Tratar la primera palabra como nombre si no está en el material; medirlo antes en las 336 notas del 1/10 |
| 8 | **Delitos:** la lista solo tiene el singular ("mataron", "robaron", "asaltaron" pasan) y la atribución se busca en todo el texto (I-3). Y al revés: "disparó al arco" se rechaza como delito en deportes | Alta en lo grave, baja en volumen | Sumar conjugaciones; oración por oración; no aplicar en Fútbol y Deportes |
| 9 | **Al revalidar se usa menos material que al escribir:** una bajada que pasa al escribir da `negacion` al revalidar. Riesgo por lectura del código, no medido | Media, latente | Guardar con la nota el material que usó, o revalidar solo reglas de forma |
| 10 | **Reglas sin control y números dispersos:** el medio nombrado solo se controla en el texto para redes; el cuerpo de 180 palabras es solo del prompt (hay uno de 249); el campo `datos` no se usa; números fuera de la tabla del criterio (`CRUCE`, `REPETIDAS`, `PAREJAS`, `LECTURA`, `FALLOS_PARA_CORTAR`) | Baja-media | Aplicarlas o borrarlas; juntar los números |

**Documentación vieja que se suma a G1:** `docs/10:86` dice "hoy, 89"; `docs/10:142` dice "77 reglas" y la tabla llega
a 107; `CLAUDE.md:42` dice 108; el comentario de `reescritura.mjs:849` habla de una clave paga que ya no existe.

**Duplicados, medidos.** Sobre 1.013 notas desde el 14/09, mismo hecho en 96 horas:

| Medición | Resultado |
|---|---|
| Notas redundantes | **66 (6,5 %)**, en 52 grupos |
| Antes del 29/09 (cuando nació la fusión) | 50 de 539 (**9,3 %**) |
| Desde el 29/09 | 16 de 474 (**3,4 %**) |
| Fusiones hechas desde el 29/09 | 68 (el sistema atrapa unas 3 de cada 4) |

- **Lo que se escapa** (19 pares reales): 8 cruzan de sección, 7 tienen títulos casi sin palabras en común y 7 comparten
  2 o más medios. Ejemplos: AUBASA (`r7ox1t` / `116x391`), INDEC (`158583a` / `yhgmbn`), Caputo (`1h348rv` /
  `18bbdzh`), Toyota RIGI en Economía y Automovilismo (`vp5l7j` / `1ugpk62`), el tractor en Agro y Policiales, tres
  notas del aumento de YPF, y **11 notas** sobre las entradas de la despedida de Messi. En 3 semanas hay 49 notas con
  "Messi" en el título: ya no es duplicado, es el mismo tema contado muchas veces.
- **Por qué se escapan:**
  1. El cruce nunca une dos notas del mismo medio: una historia que llega en dos "olas" forma dos grupos.
  2. La pregunta a la IA por pares exige la misma sección y títulos parecidos (AUBASA da 0,10), con un tope de 24 por corrida.
  3. La fusión por título pide 0,8 y deja afuera lo que salió en redes.
  4. Las decisiones se pierden cuando las notas salen de la ventana.
  5. La IA de repetidas es muy conservadora.
- **Efectos de la fusión:** 11 de 68 fusiones (16 %) apuntan a una nota que ya no tiene página (W-6): por ejemplo `uml8iq`,
  que salió en reel. Hay 3 cadenas de redirecciones. En 34 horas, 18 notas salieron del archivo sin intervención humana
  y 7 a las 38-44 horas de vida; la causa no se pudo confirmar (hay que mirar el registro de Actions).
- **Cómo mejorarlo, de más a menos retorno:**
  1. **Segunda pasada en el cruce:** unir grupos con 2 o más medios en común y parecido de 0,45 en 48 horas, sin mirar
     la sección. Atrapa al menos los 7 con medios en común; con 1 medio y parecido de 0,5, sube a 15 de 19.
  2. **Fusión determinista:** si un grupo contiene 2 o más notas ya publicadas con parecido directo de 0,42 o más, fusionarlas sin IA.
  3. **Pares a la IA:** sacar la condición de misma sección, usar el parecido de texto, conservar lo decidido y subir el tope a ~40.
  4. **Antes de retirar una nota:** exigir que el destino tenga cuerpo y semáforo verde; resolver las cadenas.
  5. **Mega-temas:** tope de una nota por ángulo y por día.

**Lo que está bien:** el diseño (verificador mecánico y gratis, nivel calculado por el sistema y no por la IA);
`depurarCuerpo` salva notas en vez de tirarlas; los fallos del servicio no gastan intentos; desde el 1/10 no hay títulos
en pasado ni incumplimientos de `promesa` en lo publicado; la tabla de números del criterio coincide con el código.

### Motor de noticias (revisión del 8/10)

**I-2 · El verificador acepta un año cambiado** — *Confirmado · ALTA*
- Los números de 100 para arriba aceptan un 6 % de diferencia, y los años también: la fuente dice "2019",
  la IA escribe "2024" y pasa (`ingesta/verificar.mjs:113-117`). Comparar exacto años y horas. 1 h.

**I-3 · Un delito dicho como hecho pasa si en otra oración dice "policía"** — *Confirmado · ALTA*
- "Un hombre mató a su vecino." pasa porque otra oración dice "La policía…" (`verificar.mjs:383`).
  Mirarlo oración por oración. 1 h.

**I-4 · Una foto sin evaluación cuenta como "sin marca y sin menor"** — *Confirmado · ALTA* — **✔ HECHO 8/10 · regla 115**
- Si la IA no devuelve la evaluación de una foto, se puede elegir (`ingesta/fotos.mjs:196-233`); es más
  probable con Groq. Elegir solo fotos marcadas explícitamente sin marca y sin menor. 1 h.

**I-6 · Una pista con un chico pasa al archivo público** — *Confirmado · MEDIA* — **✔ HECHO 8/10 · regla 116**
- Antes de guardar una pista en `pistas.json` (público, sin cifrar) solo se mira la lista roja: "Un nene de
  6 años…" pasa (`ingesta/pistas.mjs:33`). Sumar menores y edad. 30 min.

**I-7 · El aviso de helada está corrido una noche** — *Confirmado · MEDIA*
- "Esta noche" usa la mínima de hoy, que ya pasó a la madrugada (`ingesta/alertas.mjs:47-63`). 1 h.

**I-8 · El clima de respaldo puede inventar "0 % de lluvia"** — *A confirmar · MEDIA*
- met.no agrupa por fecha UTC y probablemente no trae probabilidad de lluvia (`ingesta/ingesta.mjs:881,885`).
  Dejar el dato vacío. 1 h.

**I-9 · Una nota sin fecha toma la hora de ahora** — *Confirmado · MEDIA*
- Puede salir como nueva una nota vieja y sumar puntaje (`ingesta.mjs:214,231,1349`). Marcarla como fecha
  estimada. 30 min.

**Chicos (BAJA):**
- Dos medios se llaman igual ("La Tecla", de La Plata y de Mar del Plata) y cuentan como uno en el cruce
  (`fuentes-cruce.mjs:90,116`).
- Una entidad HTML rara hace fallar la agenda municipal (`agenda.mjs:190`).
- `articulo.mjs:164` no detecta páginas en latin1.
- `lectura-ia.mjs:307` sigue probando hasta 5 pedidos cuando Gemini dice "sin cupo".
- `CRITERIO-EDITORIAL.md` no menciona la corrección automática de la auditoría.

**Lo que no se usa (verificado):**
- `UMBRALES.lluviaMucha` y el campo `milimetros`.
- La rama vieja de fichas con fútbol en `lectura-ia.mjs` (ajustar su prueba en el mismo cambio).
- Números del criterio que ningún código usa: `CLIMA_VOZ`, `PIEZA_FIJA_VOZ`, mínimo y máximo de
  `PODCAST_VOZ`, `CUERPO.parrafosMaximo`, `GUION.segundos` y los parciales de `CONTRATO_DIARIO`. O se
  aplican o se marcan como orientativos.
- Comentarios viejos en `utiles.mjs:55-76`, y `ingesta/README.md` dice "214 feeds" (son 236).

**Que alguien más revise:** una persona, una vez por semana, 10 notas verdes de Policiales y Balcarce que
salieron solas, contra su fuente (20 minutos).

### La web (revisión del 8/10)

**W-4 · Quién escribió: las notas con cuerpo de Claude firman "Revisada por la redacción"** — *Confirmado · ALTA (decisión)*
- Las 51 notas cuyo cuerpo escribió Claude a pedido firman "Revisada por la redacción" y, para Google, el
  autor es Radar Balcarce. Solo las del celular dicen "con IA". Choca con "cada nota dice quién la
  escribió" (`web/components/metadatos.js:75-78`, `web/lib/archivo.js:146-154`). Marcarlas como escritas
  con IA. 1 h.

**W-5 · 296 páginas del archivo sin cuerpo** — *Confirmado · ALTA* — **◐ PARCIAL 8/10 · regla 113 (noindex hecho)**
- Del 18 al 25/09, antes de la regla. 194 firman "Texto de \<medio\>" (es el resumen copiado de la
  fuente) y 3 son cotizaciones del dólar. No están en el sitemap pero se pueden indexar, y contradicen
  `/quienes-somos`. Ponerles `noindex` y sacar del archivo las que no salieron en redes. 2 h.

**W-6 · 11 direcciones viejas de notas unidas dan 404** — *Confirmado · MEDIA*
- Apuntan a una nota que ya no tiene página (`web/lib/repetidas.js:136-145`; ejemplo `t3k0l2` → `823fzo`).
  Redirigir a otra del grupo o a la sección. 3 h.

**W-7 · El clima de respaldo inventa la sensación térmica** — *Confirmado · MEDIA* — **✔ HECHO 8/10**
- Con met.no se muestra "Sensación térmica" igual a la temperatura; la regla dice que no se inventa
  (`ingesta/ingesta.mjs:904-906`, `web/components/clima-vivo.js:140`). 30 min.

**W-8 · Una foto reemplazada se sigue viendo hasta una semana** — *Confirmado · MEDIA*
- Se guarda con el mismo nombre y la caché dura 7 días (`web/public/_headers:48-49`). Si se reemplazó por
  tener marca o un menor, la vieja sigue apareciendo. Nombre nuevo al reemplazar. 1 h.

**W-10 · Si la ingesta vuelve casi vacía, la portada queda sin farmacia ni clima** — *Confirmado · MEDIA*
- `generar-datos.mjs:190,966,979`. Si llega menos del 30 % de lo normal, no tocar `portada.json` y avisar. 2 h.

**W-11 · Correr la web en una PC sin el panel actúa como la nube** — *Confirmado · MEDIA*
- Gasta cupo de IA, baja fotos y, si es lunes, poda retiradas (`generar-datos.mjs:176`). Decidirlo con
  `GITHUB_ACTIONS`. 30 min.

**W-12 · El buscador mete ~50 notas en cada página** — *Confirmado · MEDIA*
- Una nota pesa 77 KB con 56 bajadas adentro, y cada corrida cambia las ~1.150 páginas (por la hora del
  pie), así que se resube todo (`web/app/layout.js:146`). Un archivo aparte para el buscador (o Pagefind). 3 h.

**Chicos (BAJA):**
- `/tema/` está en el sitemap aunque los temas estén apagados (`web/app/sitemap.js:58`).
- El tope de redirecciones no cuenta las notas unidas: se pasa del límite de Cloudflare en 2 o 3 semanas
  (`web/scripts/generar-redirects.mjs:28`).
- `nombraBalcarce` nunca llega a la web (`web/lib/datos.js:234`).
- `docs/06-WEB.md` desactualizado en varias partes.
- La política de privacidad tampoco menciona open-meteo, dolarapi y bluelytics (se suma a V2-8).
- Confirmar con qué plan de ElevenLabs se hizo la voz de `public/compartir/*.mp4` (el gratis no permite
  uso comercial).
- Una foto retirada sigue en el historial público de git (se suma a R2-fotos).
- Los títulos de las postales son `h3` sin `h2` antes.

**No se usa:** las clases `.credito-foto`, `.separador` y `.rejilla-secundarias` de `globals.css`. Ningún
archivo de `web/` sobra.

**Correcciones a esta lista:** en V2-15 el epígrafe es solo el crédito; mejor `alt=""` o una descripción
real. Y C-5 también pasa en la web: `web/lib/datos.js:76-97` traga el error y el sitio se armaría sin
ninguna nota; la guardia del 20 % va también ahí.

**Que alguien más revise:** una vez por semana, las fotos manuales de Policiales y las de notas unidas.

### Redes (revisión del 8/10)

**R-1 · Crear voces puede borrar las de producción** — *Confirmado · ALTA* — **✔ HECHO 8/10 · regla (crear voces)**
- El modo `borrar` de "Crear voces" borra cualquier voz, también las dos que usan las piezas (sus ids
  vienen precargados). Una voz borrada no vuelve igual. Los modos que crean gastan cupo y el formulario no
  lo dice (`reels/crear-voces.mjs:108-116`). Pedir un texto de confirmación y decir cuántos audios gasta. 1 h.

**R-2 · Un "Reintentar" del celular se cancela solo** — *Confirmado · MEDIA*
- Comparte candado con Redes y GitHub deja uno solo esperando; el panel dice "Volvió a fallar". Distinguir
  "cancelada" o darle candado propio. 1-2 h.

**R-3 · Reintentar no mira la franja horaria** — *Confirmado · MEDIA*
- Se puede subir a las 21 el clima de la mañana diciendo "Buen día" (`redes/reintentar.mjs:46-98`). 1 h.

**R-4 · El contrato y el vigilante no miran todas las piezas** — *Confirmado · MEDIA*
- Efeméride, participá, feriado, agenda y avisos de clima: si fallan, nadie se entera
  (`redes/contrato.mjs:68-85`). 2 h.

**R-5 · El control de textos no corre antes de gastar la voz** — *Confirmado · MEDIA*
- `revisarTexto` existe pero no corre en el plan; los avisos de clima y participá no dicen "Radar
  Balcarce"; la lista de medios prohibidos tiene 16 nombres contra ~90 (`redes/guiones.mjs:506,528`).
  Correrlo como aviso y armar la lista desde las fuentes. 2 h.

**R-6 · Una pieza fija no se entera si cambió su texto** — *Confirmado · MEDIA*
- Participá sumó un correo el 7/10, pero los videos fijos siguen con lo viejo hasta el 31/10
  (`reels/fijas.mjs:34-40`). Guardar una huella del guion. 1 h.

**R-7 · El vigilante no ve si cron-job.org dejó de disparar Redes** — *A confirmar · MEDIA*
- Redes también arranca cuando termina "Actualizar la web", así que siempre hay corridas
  (`redes/vigilar.mjs:202-208`). Mirar quién disparó cada una. 1 h.

**Chicos (BAJA):**
- El reloj pide piezas que el plan no va a armar e instala todo en vano.
- El adjunto de "Piezas" se llama `piezas`, y "Reintentar" busca nombres que empiezan con `piezas-`
  (`piezas.yml:110`).
- Si Facebook no dice claro el estado del video, se da por publicado.
- Hay tres listas de nombres de piezas y ninguna tiene "efemeride".
- Hay comentarios viejos (se suman a M-doc).
- La versión `v23.0` de Meta está escrita en dos lugares.

**Mejoras de proceso:**
- A las 21, calcular los audios de mañana con las fijas y efemérides reales, y avisar si son 9 o más.
- Un ensayo sin voz a las 6:30 que arme las piezas del día con tiempos inventados (las funciones ya
  existen en `reels/previa-efemerides.mjs`).

**Se puede borrar:** el disparo programado de `fijar-piezas.yml` (era solo para el 2/10), sacando en el
mismo cambio `pruebas/piezas-fijas.test.mjs:67-73`. Nada más sobra en `reels/` ni `redes/`.

**Correcciones a esta lista:**
- **M3-4-7:** las historias de clima, farmacia y participá sí se reintentan, armándolas de nuevo con voz
  (eso causa C-16). Las que no se reintentan son la historia de cada reel y el video de Facebook.
- **M1:** "7 audios por día" vale hasta el 31/10.
- **Borrar-c:** `auditar-redes.yml` **tampoco se borra**: tiene "ayer" y el modo `--crudo`, que solo
  existen ahí.

### Robots, documentos y procesos (revisión del 8/10)

**A-2 · Editar un documento puede congelar la web** — *Confirmado · ALTA*
- Varias pruebas leen documentos (`CLAUDE.md`, `PENDIENTES.md`, `SEO.md`, `docs/*.md`, `PERFILES.md` y los dos
  criterios) y corren antes de publicar. Si alguien edita un `.md` desde la página de GitHub, o al arreglar G1
  o podar en G2, la web se puede quedar quieta. Regla ya mismo: nunca subir un documento sin correr
  `npm test`. De fondo, con A5.

**A-3 · Los candados de GitHub cancelan pedidos que esperaban** — *Confirmado · ALTA*
- Con el candado puesto, GitHub deja una sola corrida esperando y cancela la anterior. Pasa en el candado
  de Redes (reloj, Piezas, Reintentar) y en el del celular (pedidos y Pistas; el 8/10 hubo 8 pedidos en
  5 minutos). La persona ve "falló". Que el celular repita si salió "cancelada" y Pistas en otro candado.
  Une P-5 y R-2. 2-3 h.

**A-4 · Los workflows que se crearon para avisar no le avisan a nadie** — *Confirmado · ALTA* — **✔ HECHO 8/10 · regla 124**
- `armado-vacio.yml` y `pruebas-otra-hora.yml` (creados después del congelamiento del 4/10), Auditoría IA y
  Pistas no los mira el vigilante (`redes/vigilar.mjs:621,637`). Si fallan, solo llega un correo a la
  cuenta de GitHub. Sumarlos. 1 h (es la lista concreta de A7).

**A-5 · Nadie revisa el código antes de que llegue a la web** — *Confirmado · ALTA*
- Los cambios de código van directo a `main` y a la web en media hora. Con ~75 commits automáticos por día,
  nadie encuentra a mano los de código. Primer paso: el WhatsApp de las 21 lista los commits del día que
  tocan algo fuera de `web/data/` (2 h). Después: cambios en una rama con un resumen y aprobación desde el
  celular (1 día).

**M-1 · Una sola cuenta de GitHub para los dos** — *Confirmado · MEDIA*
- Todo queda firmado por `balcardev`; el nombre en cada decisión se escribe a mano. Una cuenta por persona,
  como colaboradores. Lo hace una persona.

**M-2 · El WhatsApp de las 21 no dice qué decidieron las personas** — *Confirmado · MEDIA*
- Qué se aprobó, retiró o corrigió, y quién: el segundo par de ojos más barato. 2 h.

**M-3 · Si cron-job.org se desactiva, el vigilante no se entera** — *Confirmado · MEDIA*
- Las corridas que dispara Actualizar la web y los horarios propios de GitHub lo tapan
  (`vigilar.mjs:300-308`). Mirar quién disparó cada corrida. Une R-7. 1 h.

**M-4 · `auditoria.yml` no tiene tope de tiempo** — *Confirmado · MEDIA* — **✔ HECHO 8/10 · regla 124**
- Una corrida colgada gastaría hasta 6 horas. Agregar `timeout-minutes`. 5 min.

**M-5 · Celulares personales de terceros en un documento público** — *Confirmado · MEDIA* — **✔ HECHO 8/10**
- `docs/historico/HISTORIA.md:200` tiene dos celulares personales. Contradice la regla del propio repo
  ("nunca un celular personal"). Borrarlos (5 min); quedan en la historia de git.

**M-6 · El mail del sitio se publicó sin probarlo** — *A confirmar · MEDIA*
- `contacto@radarbalcarce.com` está en la web y en la política de privacidad; `PENDIENTES.md:127` dice que
  falta mandarse un mail de prueba. Lo hace una persona en 10 minutos.

**M-7 · Nada impide tocar la lista roja sin preguntar** — *Confirmado · MEDIA*
- Una prueba que guarde una "huella" de la lista entera obliga a cambiarla a propósito. 30 min.

**Chicos (BAJA):**
- Si un lunes hay un choque en `retiradas.json` durante la limpieza, gana lo del robot y se pierde una
  retirada cargada en ese momento.
- Activar en GitHub los avisos de dependencias y el bloqueo de secretos al subir (5 min, persona).
- `CLAUDE.md`, `docs/08` y `docs/11` dicen qué mail administra cada servicio: facilita un engaño dirigido
  (discutible).
- `docs/08` no nombra 7 workflows.

**Documentos:**
- `PENDIENTES.md` tiene muchos ítems ya hechos (2, 3, 10, 0, 0h, 0f, etapa 2 del 0j, 0l) y secciones "para
  mañana" vencidas: se puede bajar ~40 %. Siguen pendientes 0o, 15c(1), 25 y renombrar Tecnología.
- `IDEAS.md` tiene números repetidos (30 a 34 dos veces) y varias ya hechas (3, 18, el primer 30, el primer
  33, 8).
- `docs/09-PANEL.md:567` y `docs/13-EFEMERIDES.md:140` se contradicen con lo que existe.
- Ojo: varias de estas las lee una prueba (A-2).

**Se puede borrar (verificado):** además de los workflows de sondeo, sus scripts `redes/sondear-groq.mjs`,
`redes/sondear-busqueda.mjs` y `redes/sondear-tavily.mjs`. Discutible: hay tres formas de ver el cronograma
(`reels/hoja-cronograma.mjs`, `reels/cronograma-html.mjs`, `redes/cronograma-semana.mjs`).

**Ya está bien:** la línea `git add` de `actualizar.yml` no olvida ningún archivo; todos los robots que
guardan usan el mismo ciclo con reintentos; las claves no se imprimen; casi todos los horarios están fuera
del minuto 0 y tienen tope de tiempo.

### Pruebas (revisión del 8/10)

**T-1 · Separar "guardia de datos" de "pruebas de código"** — *Confirmado · ALTA* (concreta A5) — **◐ PARCIAL 8/10 · regla 112 (datos fijos); falta separar el control de datos de las pruebas**
- **¿Hace falta correr todas las pruebas cada media hora? No.** Lo que cambia cada media hora son los datos,
  no el código. Las 1.840 pruebas revisan el código: alcanza con correrlas cuando alguien cambia código y
  una vez por noche. Cada media hora basta con un control corto de que los datos estén sanos.
- **¿Se pueden hacer mejores pruebas, que no fallen cuando algo está vacío?** Sí: cada prueba usa sus propios
  datos de ejemplo, guardados con la prueba, y nunca los archivos vivos. Así, que una lista quede vacía o que
  una persona toque un botón nunca puede congelar la web. Y se suman pruebas de "qué pasa si viene vacío o
  roto" para cada archivo (lo que hoy faltó en C-5).
- **Guardia de datos**, en cada corrida (1-2 s): que todo `web/data/*.json` se pueda leer, motivo, cuándo y
  quién en retiradas y correcciones, decisiones válidas. Sin cantidades ni fechas.
- **Pruebas de código**, al subir código y una vez por noche: las 1.840, con las que leen datos vivos
  pasadas a datos fijos. Esto vuelve inofensivas las bombas de C-1, C-7 y C-18 aunque se escape alguna.
- En GitHub el paso de pruebas tarda 26 s; el más lento es `reel-dos-placas` (44 s locales, arma dos
  videos con ffmpeg en cada corrida).

**T-2 · La lista roja no está trabada** — *Confirmado · ALTA* (es M-7)
- La prueba recorre la lista tal como está: si alguien borra un término, su prueba desaparece con él. De 34
  términos, solo ~26 están escritos fijos en las pruebas. Una prueba con la lista completa a mano. 30 min.

**T-3 · "Pruebas con otra hora" falló el 5/10 y nadie se enteró** — *Confirmado · MEDIA* (va con A-4) — **✔ HECHO 8/10 · regla 124**
- Falló al instalar; el vigilante no lo mira. Lo mismo el panel del celular: 6 fallas en las últimas 30
  corridas.

**T-4 · Falta declarar la versión de Node** — *Confirmado · MEDIA* — **✔ HECHO 8/10 · regla 124**
- Con Node 22 se cancelan 6 pruebas (en GitHub, con Node 24, pasan). Poner `"engines": {"node": ">=24"}`.
  10 min.

**Chicos (BAJA):**
- `tipografia.test.mjs:142` nunca corre en GitHub y falla en la PC.
- `fotos-panel.test.mjs:266` no prueba nada (`length >= 0`).
- `placas.test.mjs:262` se saltea en silencio si no hay fotos.
- `correcciones.json` se valida dos veces.
- `docs/10-REGLAS-Y-PRUEBAS.md:163` cita una prueba de la regla 9 que no existe.
- El mapa de pruebas de `docs/10` dice 83 archivos y 1.367 pruebas; hay 144 y 1.840.
- Unos 115 controles leen el texto del código en vez de probar lo que hace: aceptarlo, no sumar más.

**Que alguien más revise:** anotar en `docs/11-OPERACION.md` "si no llegó el resumen de WhatsApp de las
21, mirar Actions" (el vigilante no tiene quién lo vigile). Que el vigilante avise cuando quedan menos de 7
días de efemérides o de feriados cargados (los feriados llegan hasta el 25/05/2027).

### El panel del celular: auditoría de uso y rediseño (8/10)

*Maqueta de cuatro pantallas en la página privada "Panel nuevo del celular".*

**Los problemas de uso más graves:**
1. **Los borradores no tienen lugar.** Lo que escribe la IA vive en la memoria del celular. El botón "Ver el
   borrador" dura de 20 a 60 segundos en un aviso, y en Publicadas ni existe. Un borrador nuevo pisa al anterior y
   no dice quién lo pidió.
2. **"Publicar" sin leer** (C-19).
3. **Nunca confirma que algo salió:** todo termina en "sale en la próxima actualización".
4. **La foto no se ve en ningún lado:** no se sabe si una nota tiene foto, cuál, ni si sale con placa.
5. **Textos que contradicen lo que pasa:** "30 días en Retiradas" (son 24 h), "72 horas" (son 48), "nada sale
   solo" (lo decidido es lo contrario).
6. **Botones que frenan cosas sin avisar:** "Guardar el día" puede frenar una efeméride; "Pedir cambios" en un
   feriado hace que no salga (y congela la web, C-18). Ningún "pedir cambios" le llega a nadie.
7. **En los feriados se aprueba algo distinto de lo que sale:** el panel muestra cinco datos (incluido el del censo)
   y la locutora dice uno solo.
8. **"Esperan" es una lista larga** (36 tarjetas) que mezcla "necesita tu OK" con "falta el cuerpo", sin ordenar por
   Balcarce ni por importancia.
9. **Hernán y Andrés no ven lo que hace el otro:** los dos pueden aprobar o pedir lo mismo, y gana el último.
10. **Demasiados toques:** corregir una nota lleva 5 o más; revisar un mes de efemérides, unos 90.

**El rediseño propuesto:**
- **Abajo, cinco lugares:**
  - **Hoy:** qué necesita tu toque y cómo viene el día.
  - **Revisar:** dos solapas, "Necesitan tu OK" y "Falta el cuerpo"; Balcarce primero.
  - **Borradores:** "Para leer", "En curso" (compartido entre los dos celulares) y "Ya resueltos".
  - **Publicadas:** con la foto o la placa, la firma, la hora en cada red, y filtros.
  - **Más:** fotos, fechas, redes, pistas, revisión, números y contactos.
- **Cada nota muestra su recorrido completo:** de cuántos medios entró, si esperó, el borrador y quién lo pidió,
  quién la aprobó, la hora en que salió en la web y en cada red, si tiene foto o placa, y la firma.
- **Pocos verbos y siempre los mismos:** Publicar, Descartar, Retirar, Deshacer, Que no salga.
- **El panel pide y la nube contesta:** cada corrida deja un **recibo** por decisión ("salió a las 13:00" o "no se
  aplicó: falta el cuerpo"). Las pruebas nunca leen lo que escriben las personas: así el panel no decide si algo
  sale ni si las pruebas pasan.
- **Fechas en calendario, mes por mes:** una fila de meses y un calendario con puntos de colores (sale, para
  mirar, no sale, feriado). Al tocar un día se ve el texto exacto de la locutora, con tres botones: "Está bien",
  "Pedir cambio" (avisa por WhatsApp) y "Que no salga".

**Efemérides y feriados de todo el año:**
- **Feriados: sí, casi ya.** Todos los nacionales tienen su ficha. Falta:
  - llevar el plazo de 240 a 366 días;
  - guardar el texto exacto que dice la locutora;
  - confirmar los feriados de 2027 contra el decreto de ese año;
  - sacar el dato del censo del 12/10 (después del 13/10, con las pruebas ya arregladas).
- **Candidatas del año: sí, sin gastar IA, pero antes hay que:**
  - arreglar las pruebas (C-7);
  - corregir el año fijo 2026 en el código, que corre un año los aniversarios de 2027;
  - pasar a un archivo por mes, porque todo el año en un solo archivo pesaría unos 3 MB;
  - cuidar que rearmar no borre la propuesta ya revisada.
- **Las piezas de todo el año: todavía no.** El freno es la verificación con una segunda fuente: hoy la hace Claude
  con búsquedas, y el cupo de búsqueda lo comparten las Pistas.
- **Recomendación:** dejar armadas ya las candidatas del año como borrador, y cerrar las piezas mes a mes el día 20,
  con el aviso de "ya está el mes que viene".

**Trabajo:**

| Parte | Esfuerzo |
|---|---|
| Arreglos chicos sin rediseñar (botón del borrador, textos, avisos antes de frenar algo, C-19) | ~1 día |
| Lo que tiene que entregar la nube (recibos, quién pidió, texto exacto del feriado, foto y firma de cada nota) | 1,5-2 días |
| El rediseño completo | 8-10 días |
| Efemérides del año por meses | 3-4 días |

### Panel, Pistas y comercial (revisión del 8/10)

**P-2 · El robot puede pisar lo que decidió una persona en las pistas** — *Confirmado · ALTA*
- `pistas.json` y `notas-de-pistas.json` los escriben el celular y los robots. Si chocan, el robot se queda
  con su versión (`checkout --theirs` en `panel.yml:75-79,110-116` y `pistas.yml:197-203`): una pista
  cerrada o una nota retirada puede volver. Volver a leer y aplicar solo el cambio propio. 3 h.

**P-3 · El texto de las pistas queda público para siempre** — *Confirmado · ALTA*
- El texto que se pega y el pedido de "Escribir con IA" quedan en el registro de Actions y en
  `pistas.json`, también lo que después se rechaza por delicado. Un rumor con nombre y apellido queda en el
  historial. Propuesta: que viaje cifrado como lo demás del celular. 1 día.

**P-4 · Las pistas pueden gastar todo el cupo de búsqueda (Tavily)** — *Confirmado · ALTA*
- Hasta ~64 créditos por día con dos pistas abiertas; el plan gratis ronda los 1.000 por mes (a confirmar).
  Se acabaría en unas dos semanas y "Hacer la nota" dejaría de andar sin aviso. Reintentar como mucho una
  vez por día, búsqueda básica y contar créditos en el WhatsApp. 2 h.

**P-5 · Se pierden pedidos del celular** — *Confirmado · MEDIA*
- "Panel del celular" y "Pistas" comparten el mismo turno, y GitHub deja uno solo esperando: un pedido nuevo
  cancela al anterior. Grupos distintos y reintento si sale "cancelado". 1 h.

**P-6 · Los horarios del panel de la PC no cambian nada** — *Confirmado · MEDIA*
- Se guardan en `decisiones.json`, pero en la nube nadie los lee (dice agenda jueves 18 h y sale a las 12).
  Sacar la pestaña o leerlos de verdad. 1 h.

**P-7 · El logo de un aviso es una dirección de afuera** — *Confirmado · MEDIA*
- Cada lector le pide la imagen a un tercero, y el anunciante podría cambiarla después. Guardar el logo en
  el propio sitio (y ver C-2). 2 h.

**P-8 · Los mensajes comerciales ya escritos contradicen las reglas nuevas** — *Confirmado · MEDIA*
- Ofrecen "sorteos" (Ley 22.802) y "mención a cambio de una novedad" (choca con "el canje nunca paga una
  nota"). Pasar a concursos de habilidad y sacar el canje por cobertura (`comercial/propuestas.mjs`). 1 h.

**P-9 · El WhatsApp a comercios falla con teléfonos fijos** — *Confirmado · MEDIA*
- Le agrega el 9 a todos, y casi todos los de la base son fijos. Ofrecer "llamar" en esos. 1 h.

**Chicos (BAJA, 10 a 30 minutos cada uno):**
- La foto sumada a mano queda firmada por la cuenta de GitHub y no por quien la sumó (`panel.yml:96`).
- El vigilante no avisa si aparece un celular nuevo con permiso para leer lo cifrado, y no hay botón para
  quitar uno viejo.
- El WhatsApp de pistas manda la afirmación a CallMeBot, aunque el comentario dice que no.
- `panel/sincronizar.mjs:41-46` hace un commit sin nombrar archivos.
- `docs/09-PANEL.md` está desactualizado con respecto a las pistas.
- Hay un comercio repetido en la base.

**Lo que no se usa (verificado):**
- El panel de la PC en la práctica (`decisiones.json` del 28/09 sin decisiones, avisos y eventos vacíos).
- `conEstado` y `sinNovedad` (`panel/pistas-libro.mjs`): solo las usan las pruebas; el celular tiene copias
  propias, así que se prueba un código y corre otro.
- `comercial/` entero: no lo usan la web, los paneles ni los robots. La base no cambia desde el 24/09.
- `SOLO_EN_LA_PC = []` (`redes/piezas.mjs:130`).

**Ya está bien:** los workflows no se pueden inyectar desde el celular; el cifrado es correcto; lo rojo no
se escribe ni a pedido; el panel de la PC está bien protegido; lo comercial no usa servicios de afuera y
siempre rotula "Espacio publicitario". El texto de baja (Ley 25.326) ya va en los mensajes comerciales.

---

## Nivel 3 · Mejoras medianas

*1 a 3 días cada una. Se prueban primero en la rama.*

**N3 · Un archivo de salud** — *Confirmado · clave*
- Un `web/data/salud.json` con caídas seguidas por fuente, notas que aporta cada una, duplicados, fotos
  repetidas, tiempos y rechazo de la IA, con ventana de 14 días. Aviso si una fuente lleva 6 corridas
  seguidas caída.
- **Ojo:** agregarlo al `git add` de `actualizar.yml`, si no se pierde. Depende de B1 y A6.

**A1 · Armar el sitio una sola vez por ciclo** — *Corregido · clave*
- Hoy se arma dos veces (66 s y 111 s): el 42 % del ciclo. Ahorra unos 2 minutos (de 7 a 5).
- **Opciones:** pasar `web/out` como adjunto al segundo robot, o subir a Cloudflare desde el primero.
- **Costos que no estaban:** un adjunto de ~340 MB tarda en subir y bajar (parte del ahorro se va
  ahí); subir desde el primero pone el token de Cloudflare en el robot que más código corre.
- Mantener la opción de desplegar a mano. Depende de A6.

**A3 · Fotos y redacción con 2 o 3 pedidos a la vez** — *Confirmado*
- Hoy van de a uno (57 s de redacción y ~50 s de fotos). Tope de 2 o 3 cuidando los límites por minuto
  de Gemini y Groq. Depende de A6.

**C1 · Miniaturas de 400 px** — *Confirmado · clave*
- Las secciones bajan fotos de 1.200 px para mostrarlas a 240. Hasta 80 % menos peso en esas páginas.
  Generar `*-400.jpg` y migrar las ya guardadas. 1 día.

**C2 · La vista previa de WhatsApp en JPG** — *Confirmado*
- Hoy es un PNG de 370 KB en promedio (115 medidas). Pasarla a JPEG 80-85. 1 día.

**C5+C4 · Banco de fotos con etiquetas y reglas para que no se repitan** — *Confirmado · clave*
- La foto de Xhaka y Messi y la de Colapinto en Singapur salieron en 4 notas cada una; hay 12 grupos de
  fotos idénticas.
- Agregar tipo, etiquetas y usos al banco. **Reglas propuestas:** del hecho, solo en la misma historia;
  de archivo de una persona, solo en notas de esa persona y nunca dos el mismo día; institucional, una
  vez por mes; la placa, sin límite.
- **Une** C4 y P20. **Decisión:** qué regla de repetición les parece bien.

**P1-6 · Que lo que se le pide a la IA coincida con lo que rechaza el verificador** — *Confirmado · clave*
- De 611 notas intentadas, 111 se rechazaron; muchas por contradicciones entre el pedido y el control
  (fechas, redondeo, números en palabras, siglas, negaciones, material mínimo).
- El código escribe las fechas completas; el pedido dice el límite de redondeo; ampliar las siglas y la
  regla de negaciones; no pedir si no alcanza el material. Medir antes con D1-1.

**P18-23 · Una sola forma de buscar en Wikimedia, igual al criterio** — *Confirmado (P19 discutible)*
- Hay dos implementaciones de Commons con reglas distintas; Policiales acepta cualquier fuente oficial;
  la duda sobre marcas se resuelve a favor de usar. Un solo `ingesta/commons.mjs` y alinear con
  `docs/05`. Depende de C5+C4.

**Q1 · Guardar las piezas de redes y aprovecharlas** — *Corregido · pedido el 8/10*
- **Lo que pidieron:** que no se pierda lo que se genera. Hoy, una vez publicada la historia o el reel, el
  audio y el video desaparecen; en Instagram y Facebook quedan los reels y posteos, y las historias se van a
  las 24 horas. La idea es guardarlos y reusarlos: por ejemplo, que el clima sea también una **nota propia en
  la web, con su audio para escuchar** y los enlaces a Facebook e Instagram (ver RS-1 y RS-2 en las ideas).

- Hoy el mp4 se guarda 3 días como adjunto de Actions y el mp3 se descarta. Si Meta bloquea la cuenta o
  falla Instagram, después de 3 días no hay copia.
- **Primer paso, sin cuentas nuevas:** subir la retención del adjunto (los repositorios públicos
  permiten hasta 90 días) y sumar el mp3.
- **Después, si hace falta:** un depósito R2 con borrado a 30 días. **R2 pide tarjeta** aunque no cobre:
  choca con "nada que pida tarjeta"; decidirlo. **Une** Q1 y M2.

**M3-4-7 · Historias que se reintentan, números por pieza y ffmpeg en caché** — *Confirmado*
- Las historias no se reintentan solas, no se sabe qué reel anduvo mejor y ffmpeg se baja en cada
  corrida (el 1/10 un 504 al bajarlo atrasó un reel 35 minutos). Depende de Q1.

**D2 · Segunda clave de voz en otro proyecto de Google** — *Discutible*
- Plan B cuando se acaban los 10 audios. Discutible: hay que recrear las dos voces en el otro proyecto
  (la voz cambiaría un poco) y la regla dice "nunca con otra voz". Depende de M1.

**E2 · Un Worker de Cloudflare como disparador** — *Corregido (antes nivel 4 y US$ 5)*
- Reemplaza a cron-job.org, que se desactiva solo si falla varias veces (pasó el 24/09). Los Workers
  **gratis** tienen relojes (Cron Triggers): probablemente no cuesta nada. Una semana con cron-job.org
  de respaldo. Depende de A7.

**N5-6 · Cupo en el WhatsApp de las 21 y los 404 reales** — *Confirmado*
- Sumar "voz 8/10" y los tokens del día al resumen (con M1 y D1-1), y pedirle a Cloudflare los 404 que
  ven los lectores.

**B7 · Sumar fuentes locales, de a una, con regla** — *Confirmado*
- Tres medios son más de la mitad de lo de Balcarce; las instituciones no tienen fuente.
- Prueba de 14 días: se queda la que traiga 10 o más notas y 3 exclusivas; se apaga la que tenga 0 en
  28 días. Depende de B1 y B2.

**G2 · Una página para no técnicos y podar documentos** — *Confirmado*
- ~730 KB de documentos; `PENDIENTES.md` (40 KB) e `IDEAS.md` (33 KB) están inflados. Un léeme de 2 o
  3 carillas y separar en `CLAUDE.md` lo permanente del estado del día. Depende de G1.

**Efem · Efemérides: aprobar octubre y automatizar la propuesta** — *Confirmado*
- Aprobar del 19 al 31/10 y armar la propuesta mensual con Wikidata (y Jolpica para Fangio). Hoy la
  arma Claude a mano. Ojo con C-7 al armar noviembre.

**V2-18 · Funciones repetidas con reglas distintas** — *Confirmado*
- `diaAR` y `horaAR` están en `ingesta/zona.mjs` y se repiten en `ingesta/f1.mjs` y
  `web/lib/notas-propias.js`; hay 4 `sumarDias`, 5 `fechaLarga` y 4 `plegar` que hacen cosas distintas
  (una saca tildes y otra no). Juntarlas en `zona.mjs` y un `texto.mjs`, con prueba. 3 h.

**V2-14 · Las notas pesan más de lo que necesitan** — *Confirmado*
- Una nota carga ~480 KB de JavaScript y el contenido va dos veces (80 KB de página más 53 KB del
  `.txt` de Next). Fuentes en el propio sitio (ver V2-8) y revisar qué partes corren en el navegador.

---

## Nivel 4 · Obras grandes

*1 a 3 semanas cada una. Decidir antes y probar mucho.*

**C3 · WebP o AVIF en tres tamaños** — *Confirmado*
- Ahorro estimado de 15 a 20 MB de los 44 (muestra de 22 fotos). `<picture>` con `srcset`; las
  tarjetas y vistas previas siguen en JPG. Depende de C1.

**P-orden · Una sola fuente por regla** — *Discutible*
- El pedido a la IA tiene ~20.000 caracteres y dice "nunca" 36 veces; los números están en 5 lugares.
  Generar pedido y documentos desde un solo archivo y acortar. Discutible por el riesgo de cambiar cómo
  escribe la IA: medir con `reels/comparar-instruccion.mjs`. Depende de P1-6.

**D1 · Comparar proveedores para redactar** — *Confirmado*
- 30 notas reales con Gemini, Claude Haiku 5.5, GPT-5 nano, DeepSeek, Workers AI y Groq. El costo no
  es el problema (centavos al mes); lo es la fidelidad. Depende de D1-1 y P1-6.

**D4 · Un segundo proveedor de respaldo para la redacción** — *Confirmado*
- Hoy todos los respaldos son de Google. Groq gratis no alcanza (8.000 tokens por minuto y un pedido
  pesa ~9.000). Acortar el pedido o elegir uno de pago por uso. Depende de P-orden y D1.

**N7 · Auditoría semanal completa** — *Confirmado*
- Lighthouse sobre 20-30 páginas, accesibilidad, redirecciones, fotos repetidas y cobertura por
  localidad, con salida al WhatsApp. Solo semanal (sobre todo el sitio tardaría horas). Depende de N2 y N3.

**F1-b · Un archivo de configuración por sección** — *Confirmado*
- Las listas de secciones están repartidas en ~15 lugares. Un `SECCIONES_CONFIG` con cupo, criterio
  extra, redes, barra lateral y fuentes. Es la base de cualquier cambio de secciones.

**V2-19 · Partir los archivos más grandes** — *Confirmado*
- `ingesta/ingesta.mjs` (1.736 líneas), `ingesta/fuentes.mjs` (1.333), `reels/reescritura.mjs`
  (1.274) y `generar-datos.mjs` (1.114, todo suelto, sin funciones que se puedan probar). Empezar por
  partir `generar-datos` por tramos. 2-3 días.

**Ciclo · Bajar el ciclo de 30 a 15 minutos** — *Confirmado*
- La demora media real de una noticia es ~22 minutos y el ciclo es lo que más pesa. Antes, A1, A3 y A8-b.

---

## Nivel 5 · Cambios de plataforma

*Semanas o meses. Riesgo medio a alto.*

**E1 · Repositorio privado por menos de US$ 10 por mes** — *Confirmado · es lo que quieren (8/10)*

**Por qué no alcanza con poner el repositorio en privado:** en público, los robots de GitHub no tienen tope.
En privado, el plan gratis trae 2.000 minutos por mes (el plan Pro, de US$ 4, trae 3.000), y hoy los robots
usan unos 10.000 (48 corridas por día de ~7 minutos, más las redes). El exceso costaría US$ 40-60 por mes.

**¿Dónde se contrata el servidor?** No es de GitHub ni de Cloudflare: es una computadora alquilada en una
empresa de servidores, a la que se le instala el programa de GitHub para correr los robots (ese programa es
gratis). Opciones conocidas, a confirmar precios al contratar:
- **Hetzner** (Alemania): unos € 4-5 por mes por un servidor chico. El más barato de los conocidos.
- **DigitalOcean** o **Vultr**: unos US$ 6 por mes.
- **Oracle Cloud "Always Free"**: gratis, con un servidor bastante grande, pero pide tarjeta y a veces no hay
  lugar disponible para crearlo.
- **Google Cloud** tiene uno gratis, pero es muy chico para armar videos.
Cloudflare no alquila servidores de este tipo.

**¿GitHub cobra por usar un servidor propio?** Hoy no. En diciembre de 2025 anunció que iba a cobrar US$ 0,002
por minuto a los ejecutores propios en repositorios privados desde marzo de 2026, y a los dos días lo postergó.
Según lo último encontrado (junio de 2026), sigue gratis, pero GitHub no descartó cobrarlo más adelante. Con
los minutos de hoy, ese cobro serían unos US$ 20 por mes: hay que confirmarlo antes de decidir. Fuentes:
[Techzine](https://www.techzine.eu/news/devops/137396/github-bends-to-criticism-and-delays-paid-self-hosting-of-runners/),
[SAMexpert](https://samexpert.com/github-actions-pricing-backlash-2026/).

**El plan propuesto (unos US$ 5-6 por mes):**
1. **Un servidor chico propio** (una computadora alquilada en internet, de unos US$ 5 por mes) que corre los
   mismos robots de GitHub como "ejecutor propio". Los minutos de un ejecutor propio no se cobran, aunque el
   repositorio sea privado. El código y los robots siguen igual.
2. **Las fotos, audios y videos en Cloudflare** (ver R2-fotos): gratis hasta 10 GB.
3. **El repositorio pasa a privado.** Lo que se ve de afuera sigue siendo solo la web. Al pasar a privado
   también deja de verse la historia del repositorio.

**Antes de pasar a privado conviene:** armar el sitio una sola vez por ciclo (A1), sacar las corridas de más
(A8-b) y correr las pruebas solo cuando cambia el código (T-1). Así el servidor trabaja menos.

**Lo que hay que saber:**
- Ese servidor hay que mantenerlo (actualizaciones). Si se cae, los robots no corren: va con aviso
  (healthchecks) y con GitHub como plan B por unos días, pagando el exceso solo ese tiempo.
- El panel del celular sigue funcionando con un repositorio privado (usa la llave de quien lo usa).
- La subida a Cloudflare ya es directa y no depende de que el repositorio sea público.

**Orden propuesto:** fotos a Cloudflare → respaldo en cuatro lugares → servidor propio a prueba con un solo
robot → todos los robots → repositorio privado. 3 a 6 semanas en total, sin apuro.

**R2-fotos · Sacar las fotos de git y llevarlas a Cloudflare** — *Confirmado · pedido el 8/10*
- **¿Conviene? Sí (opinión, 8/10).** Cloudflare ya está habilitado con tarjeta. Llevar las fotos, el banco de
  fotos, los audios y los videos a su depósito (R2) sirve para:
  - aliviar el repositorio, que hoy crece con cada foto;
  - armar el sitio más rápido;
  - poder pasar a privado (E1);
  - simplificar el respaldo;
  - bajar el riesgo de que un reclamo por una foto frene todo el repositorio.
- **Costo:** gratis hasta 10 GB guardados, y no cobra por mirar las fotos (a confirmar el detalle en su página).
  Se servirían desde una dirección propia, por ejemplo `fotos.radarbalcarce.com`.
- **Trabajo:** 2 a 3 días, más mudar las 578 fotos que ya hay y probar que ninguna se rompa.
- **Lo que pidieron:** que las fotos y el banco de fotos se guarden directamente en Cloudflare, para no
  depender tanto de GitHub. Hernán cree que la cuenta de Cloudflare ya está habilitada para eso: **a
  confirmar** (el depósito de Cloudflare, R2, pide cargar una tarjeta aunque no cobre hasta 10 GB).
- **Cuánto pesan de verdad (medido el 8/10):** hoy son **578 fotos y 44 MB en total**, unos 77 KB cada una.
  Se suman unas 24 por día: **~1,8 MB por día, unos 650 MB por año**. Los "1,5 GB por año" que se dijeron antes
  eran el crecimiento de todo el repositorio, que además guarda cada media hora una copia nueva de los datos.
- **Bajarles el peso:** pasarlas a WebP (o AVIF) y en tres tamaños (C1 y C3). Con una muestra se estimó un
  ahorro de un tercio a casi la mitad.

- El repositorio pesa 145 MB y crece ~4 MB por día de fotos.
- **Motivo nuevo (V2-7):** guarda 576 fotos de otros medios. Un aviso de derechos de autor a GitHub
  puede deshabilitar el repositorio entero (motor, robots y web juntos). Escribir ya un procedimiento de
  baja en 24 horas, aunque la mudanza sea después.
- Limpiar el historial rompe los clones: se hace con los dos presentes. R2 pide tarjeta.

---

## Herramientas gratis que reemplazarían algo hecho a mano

*De la búsqueda de proyectos de código abierto del 8/10 (detalle, licencias y descartes en
`IDEAS-NUEVAS.md`, sección 10). Nada se probó: cada una es para medir lado a lado antes de cambiar.*

| Hoy, a mano | Reemplazo posible | Licencia | Nivel |
|---|---|---|---|
| El audio de cada pieza sale con el volumen que venga (`reels/reel.mjs`) | El filtro `loudnorm` que ya trae ffmpeg | ya instalado | 1 |
| "¿Corrió todo?" lo mira el propio vigilante | Healthchecks.io (un `curl` por workflow; es A7) | BSD-3 | 1 |
| Avisos solo por CallMeBot, que bloquea si se le manda de más (`redes/avisos.mjs`) | ntfy para lo urgente; WhatsApp para el resumen | Apache-2.0 | 1 |
| Actualizar a mano las versiones de las acciones (C-4) | Dependabot y actionlint | MIT | 1 |
| Contar a mano las imágenes rotas (N4) | lychee en la auditoría de los lunes | Apache-2.0 | 2 |
| El recorte de las tarjetas siempre al centro (`web/lib/tarjeta.js`) | smartcrop, con el punto guardado en el banco | MIT | 2 |
| Achicar fotos con ffmpeg a JPEG (`web/scripts/achicar-foto.mjs`) | sharp con WebP (ayuda a C3) | Apache-2.0 | 3 |
| Buscador de 36 horas con el índice adentro de cada página (`web/components/buscador.js`) | Pagefind sobre todo el archivo | MIT | 3 |
| La marca de agua la decide solo la IA (`ingesta/fotos.mjs`) | Lectura de texto en los bordes (tesseract.js) como segundo control | Apache-2.0 | 3 |
| Chicos en fotos de notas amarillas (C7) | Detección de caras como freno por código, sin estimar edades | Apache-2.0 | 3 (conversar antes) |
| Extractor de texto con expresiones regulares (`ingesta/articulo.mjs`) | trafilatura como plan B, en un paso aparte (no rompe la regla de `ingesta/`) | Apache-2.0 | 3 |
| Subtítulos ubicados por silencios y sílabas (`reels/alinear.mjs`, `tiempos.mjs`) | whisper.cpp solo para los tiempos | MIT | 3 |
| Placas en SVG escrito a mano (`reels/placa.mjs`) | Satori, solo para placas nuevas | MPL-2.0 | 4 |

---

## Descartado por ahora (y por qué)

*Nada está cerrado: si cambia algo, se vuelve a mirar.*

- **Firebase:** pide tarjeta para tareas programadas y no resuelve nada que Cloudflare no resuelva.
- **ElevenLabs:** el plan gratis no alcanza y no permite uso comercial. Las voces siguen abiertas a cambios
  (Hernán y Andrés, 8/10): queda para evaluar, incluida una opción paga.
- **GitHub privado pagando solo el plan:** el exceso de minutos saldría US$ 40-60 por mes.
- **Leer solo lo nuevo de cada feed:** ahorra segundos y rompe la comparación entre medios.
- **Lighthouse en cada ciclo:** serían horas por vuelta.
- **Que un chequeo nuevo frene la publicación:** un falso positivo congelaría el sitio (ver C-1).
- **Separar el motor por sección:** una nota no sabe su sección hasta cruzarse con otros medios.
- **Todo en Cloudflare (Workers y D1):** `ffmpeg` y `resvg` no corren en un Worker.
- **Sacar el candado de Pistas y del panel:** que corran de a uno es a propósito.
- **Google Places para el mapa comercial:** sus condiciones lo impiden (ver Com-1).

## Decisiones que necesitan a Hernán y Andrés

0. **Decidido el 8/10 sobre las notas:** se adopta la recomendación de las notas viejas (`noindex` a las 296 y reescribir solo las de Balcarce y de redes); no hace falta que lo nacional tenga ángulo de Balcarce; el filtro general es varias fuentes y sin duplicados; Política y Policiales, sin filtros nuevos por ahora; hoy no hay API de Anthropic.
0. **C-0:** frenar ya la corrección automática de la auditoría y arreglar las dos notas rotas.
0. **Decidido el 8/10:**
   - Las efemérides salen salvo que Hernán diga que no, y el mes siguiente se arma el día 20.
   - Las pruebas completas no corren cada media hora: solo cuando cambia el código y una vez por noche.
   - Se arma el respaldo en cuatro lugares (GitHub, GitLab, Google Drive y la PC).
   - El aviso de voz con IA va como texto en el posteo, sin la etiqueta visual de Meta.
   - Se guarda el 100 % de las notas, año tras año.
   - Las voces siguen con Gemini por ahora, abiertas a probar otras.
   - Las fotos y el banco de fotos van a Cloudflare, en un formato más liviano.
   - La página guarda su historia siempre; por ahora se prevén 1 o 2 años, con recordatorio el 15/12/2026.
   - Lo que se genera para redes (audio y video) se guarda y se reusa en la web.
   - Las historias y los reels son solo para lo más relevante; los posteos de notas, para llevar gente a la web.
   - Quieren el repositorio privado por menos de US$ 10: servidor propio y fotos en Cloudflare (E1, R2-fotos).
   - Clima y farmacia como reel en Facebook (donde la gente los mira mucho); en Instagram, solo historia.
   - **El panel no decide si algo sale ni si las pruebas pasan.** Se rediseña después, cuando el flujo esté
     rearmado. Mientras tanto, nadie toca el feriado del 12/10 ni la efeméride del 11/10.
0. **C-18:** no tocar el feriado del 12/10 ni la efeméride del 11/10 en el celular hasta el 13/10.
1. **C-1:** si se arregla la prueba antes del lunes 12/10.
2. **C-2:** la regla de "ningún script de terceros" y cómo se separa el panel (detalle en el documento privado).
3. **C-6:** subir el tope de notas o acortar los 180 días.
4. **C-9:** cómo avisar que la voz es de IA (cambia las reglas 6 y 4.6 del criterio de redes).
5. **C-8:** dónde vive el seguimiento comercial (PC o cifrado).
6. Borrar los sondeos del nivel 0 y el disparo viejo de `fijar-piezas.yml`.
7. La regla de repetición de fotos (C5+C4).
8. Guardar las piezas de redes más tiempo, y si se acepta una cuenta que pide tarjeta (Q1, R2).
9. Probar otros proveedores de IA y con qué presupuesto (D1).
10. Qué términos de privacidad aceptan para las capas gratis de IA (D-priv).
11. Licencia del repositorio (V2-9) y cuánto mostrar de ustedes como responsables (V2-12).
12. Fotos de chicos en notas amarillas (C7): conversarlo antes de tocar.
13. **C-10:** que lo rojo no salga nunca, ni aprobado (toca la lista roja).
13b. **S-1:** si lo nacional sin relación con Balcarce se le sigue ofreciendo a Google.
14. **C-12:** sumar a la lista roja las formas y las edades que faltan.
15. **C-13:** sacar la foto de la nota `fd2y4d`.
16. **C-17:** renovar o no las piezas fijas antes del 25/10, y si las efemérides salen solo aprobadas.
17. **W-4:** cómo firman las notas cuyo cuerpo escribió Claude.
18. **C-11:** cómo deben salir solas las pistas, y si se cierran a mano la de Messi y la de Margaret Hamilton.

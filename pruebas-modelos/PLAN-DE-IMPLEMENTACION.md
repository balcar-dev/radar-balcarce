# Radar Balcarce: todo lo que probamos y qué implementar, de más a menos importante

*Armado el 11/10/2026 a partir de lo probado en esta conversación entre Andrés y Claude. No se tocó nada de producción: todas las pruebas están en carpetas nuevas del repositorio (`pruebas-modelos/` y `criterio-unico/`) y no se hizo ningún commit. La clave de OpenRouter que se usó para las pruebas ya fue borrada por Andrés.*

---

## 1. En una página

**Lo que se probó y funcionó**

1. **Duplicadas:** buscar notas parecidas por significado, que un modelo barato confirme cada par y agrupar sin encadenar. Con 4.477 notas de 72 horas quedaron **3.249 historias** (27% menos). Entre los medios de Balcarce, 75 notas bajaron a 56. Cuesta **menos de US$ 1 por mes**.
2. **Validar y clasificar cada nota antes de escribirla** con un modelo de decisiones (Mercury Decide): decide casi igual que Gemini (94% de acuerdo en publicar), no perdió nada importante de Balcarce, dejó pasar 0 de 20 notas de ruido y da la probabilidad de cada respuesta. Cuesta unos **US$ 0,9 por mes** (estimado, por precio de lista).
3. **Sección por tema + ámbito por separado** (Balcarce, La zona, De afuera): Mercury queda más seguro con 17 secciones que con las 11 de hoy.
4. **Fotos repetidas:** hoy 47 de 708 notas (7%) comparten una foto casi idéntica con otra. Se evita gratis, sin IA, con una "huella" de la imagen.
5. **Datos de color con fuente:** dar datos verificados al redactor es fácil. Conseguirlos es lo difícil. Hay un circuito manual gratis (plantilla) y varias formas automáticas.

**Lo que se probó y NO funcionó (o no conviene)**: Gemini por la API de pago con búsqueda (sólo 14% de datos respaldados), los modelos gratis de Gemma (saturados), INDEC por datos.gob.ar (no responde), los modelos que "piensan" sin apagar el razonamiento (lentos y caros), Microsoft, Perplexity y OpenAI como modelos de decisión para seleccionar (peores que Mercury).

**Lo que todavía no se sabe**: cuál es mejor para **redactar** (el prompt nuevo del criterio único todavía no mejora al actual), y cómo rinden estas pruebas con más días y con una "verdad" revisada por personas.

### Tabla de prioridades

| # | Qué | Por qué importa | Costo por mes | Esfuerzo | ¿Probado? |
|---|---|---|---|---|---|
| 1 | Duplicadas: significado + confirmación + agrupación en estrella | Es lo que más les preocupa: no publicar la misma noticia dos veces | < US$ 1 | Medio | Sí (4.477 notas) |
| 2 | Seleccionar con Mercury Decide (reemplaza la ficha) | Valida cada nota, baja el costo y marca lo dudoso | ~US$ 0,9 | Medio | Sí (200 notas) |
| 3 | Sección por tema y ámbito por separado | Policial de Balcarce = Policiales + Balcarce; "Balcarce" pasa a ser una vista | US$ 0 extra | Medio | Sí (200 notas) |
| 4 | Regla de "copia" flexible (nombres, lugares y fechas no cuentan) | Menos notas rechazadas por error | US$ 0 | Bajo | Se vio el problema; el cambio no |
| 5 | Fotos: huella anti-repetición | 7% de notas con foto repetida | US$ 0 | Bajo | Sí (699 fotos) |
| 6 | Criterio único por bloques + arreglar 20 contradicciones | Un solo lugar para cada regla, prompts más cortos y sin choques | baja el costo de IA | Alto | Borrador armado |
| 7 | Datos verificados para el redactor (manual y datos estructurados) | Notas más originales, también las de una sola fuente (88% de las historias) | US$ 0 | Bajo a medio | Sí (una nota) |
| 8 | Feeds: seguir leyendo cada 30 minutos y usar las categorías del diario como pista | Menos pérdida de notas; mejor sección | US$ 0 | Bajo | Sí (206 feeds) |
| 9 | Redacción: modelo de repuesto y mejoras de prompt | Seguridad si Gemini gratis deja de andar | US$ 8 (Gemma 26B) | Medio | Sí (17 modelos) |
| 10 | Datos con IA y búsqueda web automática | Más datos sin trabajo manual | US$ 2 a 3 con 10 notas por día | Medio | Sí (6 IAs, 12 notas) |
| 11 | Infografías y elección de fotos con IA de visión | Futuro | a medir | Alto | No |

**Orden sugerido para implementar:** primero en "modo sombra" (el sistema nuevo corre al lado del actual, sin cambiar nada de lo que se publica, y se comparan los resultados unos días), después se cambia. Ver el punto 12.

---

## 2. Cómo leer este documento

- **Costo por mes** es a precio de lista de los proveedores, con 900 notas por día entrantes salvo que se diga otra cosa. Son estimaciones, no facturas.
- **"Probado"** quiere decir sobre las 200 notas de la muestra (un solo día) o sobre las 4.477 notas de 72 horas, según el caso. Son muestras chicas.
- **Las etiquetas de "mismo hecho" y de "quién tiene razón" las puso Claude** leyendo las notas, no una persona de la redacción. Conviene que Andrés y Hernán revisen una muestra.
- Las rutas de archivos (por ejemplo `ingesta/lectura-ia.mjs`) son del repositorio de radarbalcarce.com.

---

## 3. Prioridad 1: duplicadas

**Qué es.** Hoy una noticia que cuentan tres medios puede salir como tres notas. Se probó un circuito en tres pasos:

1. **Buscar por significado.** Cada nota se convierte en una huella numérica (embedding) con el modelo `baai/bge-m3` de OpenRouter (US$ 0,01 por millón de tokens, el mismo que ya habían elegido). Dos notas que cuentan lo mismo quedan cerca aunque usen otras palabras.
2. **Confirmar.** Mercury Decide recibe los pares candidatos de a 12 y contesta si cuentan **el mismo hecho**, con la definición decidida: mismo suceso, mismo día y mismo protagonista; un anuncio y su resultado son dos notas; ante la duda, no.
3. **Agrupar sin encadenar.** Cada grupo tiene una nota "ancla" y sólo entran las notas que Mercury confirmó **directamente contra esa ancla**. Sin esto, A parecida a B y B parecida a C juntan todo un tema (grupos de 181 notas con hechos distintos).

**Evidencia.**

| Dato | Resultado |
|---|---|
| Notas leídas (72 horas, 208 feeds) | 4.477 |
| Pares candidatos (parecido 0,75 o más) | 12.415 |
| Pares que Mercury confirma como mismo hecho | 47% |
| Grupos de 2 o más notas | 490 (1.718 notas) |
| Historias distintas que quedan | **3.249** (27% menos) |
| Notas sin par (una sola fuente) | 2.759 notas; el **88%** de las historias tienen una sola fuente |
| Medios de Balcarce | 75 notas bajan a **56** historias (12 grupos: Fiesta del Postre ×5, registro de acompañantes ×3, paleta ×3, maxivóley ×3…) |
| Costo de la corrida | ~US$ 0,06 (embeddings US$ 0,003 y confirmaciones US$ 0,054) |

- En los 62 pares etiquetados a mano (21 del mismo hecho), Mercury acertó 95%. Con 12 pares por pedido rinde igual. El grupo de 5 notas de la Fiesta del Postre lo unieron bien los seis modelos de decisiones probados.
- Revisión a ojo de 16 pares confirmados y 16 rechazados: unos 13 de 16 bien en cada grupo. Mercury es estricto con las notas explicativas y se le escaparon 3 duplicadas (dos del "qué es un nódulo" del Papa y una de peajes). El error de ese tipo es leve: sale una nota repetida.
- Un umbral de parecido solo no alcanza: con 0,70 aparecen las 21 duplicadas pero también 16 de 41 pares que no lo son.
- Los grupos grandes son hechos concretos (Colapinto abandonó, 67 medios; anuncio de la operación del Papa, 40; River-Estudiantes, 29), no temas mezclados.

**Qué cambiar en producción.**
- Reemplazar `agruparRepetidas` y las parejas de `confirmarParejas` (`ingesta/lectura-ia.mjs`) por este circuito, guardando las huellas de las últimas 72 horas.
- Cada nota nueva se compara sólo contra las notas "ancla" abiertas de las últimas 72 horas (como ya diseñaron en el documento de módulos), no contra todas.
- Un solo texto de "mismo hecho" para parejas y repetidas (hoy hay dos y tres umbrales distintos).
- Mantener `quitarRepetidas` (queda una nota por grupo, con los medios de todas como fuentes).

**Esfuerzo:** medio. **Riesgo:** bajo (si no ve una duplicada, sale una repetida como hoy). **Decisión pendiente:** si una historia con muchas fuentes se actualiza cuando llega un medio nuevo (hoy la regla es "una nota por hecho" y se decide aparte).

**Cómo se midió y cómo repetirlo:** `pruebas-modelos/duplicadas-por-significado.mjs`, `confirmar-pares-significado.mjs` y `agrupar-estrella.mjs`. Informes: `duplicadas-significado.md`, `duplicadas-confirmadas.md`, `historias-estrella.md`.

---

## 4. Prioridad 2: validar y seleccionar con un modelo de decisiones

**Qué es.** Un modelo de decisiones no escribe texto: contesta preguntas con opciones fijas y devuelve la **probabilidad de cada opción**. Se probó reemplazar la ficha de lectura (hoy Gemini con respaldo de Groq) por **Mercury Decide** (`inception/mercury-decide`). Se le piden tres cosas por nota: sección, ámbito y "¿se publica?".

**Evidencia (200 notas crudas de 208 feeds, incluidas 20 de lo que no debería salir).**

| Modelo | Acuerdo con Gemini en publicar | Notas de Balcarce descartadas | Costo por mes |
|---|---|---|---|
| **Mercury Decide** (una nota por pedido) | **94%** | **0** | **~US$ 0,9** (estimado) |
| Mercury, 12 notas por pedido | 89% (pierde precisión) | — | US$ 0,15 |
| Jev 1.13, 12 por pedido | 93% | 1 (pádel) | US$ 1,08 |
| Perplexity decider | 86% | 0 (publica de más: 27 nacionales contra 9) | ~US$ 2,7 |
| Microsoft Decision 1 | 82% | 1 (Fiesta del Postre) | ~US$ 2,2 |
| OpenAI gpt-6-luna | 91% | 2 (y se negó a contestar 3 notas) | ~US$ 5,8 |
| Gemini Flash-Lite (hoy) | referencia | 0 | ~US$ 4 con 12 por pedido |

- **Ruido** (horóscopo, loterías, chimentos, policiales de afuera, extranjero): 0 de 20 dejadas pasar por Mercury. Dejó afuera las 8 notas "locales" que eran copias de noticias nacionales de un medio de Balcarce (como se esperaba).
- **Las probabilidades sirven para marcar lo dudoso**: las notas de zona gris (probabilidad de publicar entre 0,2 y 0,8) son 14 de 200 (7%), y discrepan con Gemini en el 21%, contra el 5% de las seguras. Con Jev esa zona es de 73 notas (demasiadas para el celular).
- Sobre las 66 notas que algún modelo publicaría, Gemini, Mercury y Jev **coinciden en la sección en 57 (86%)**; en las 9 que no, Mercury y Jev aciertan más que Gemini en unas 5 (por ejemplo, el Concejo es Política y un paro docente provincial no es "Balcarce").
- Errores que comparten todos, Gemini incluido: publicarían "¡EN VIVO! minuto a minuto…" y "Dólar banco por banco". Hoy los frenan las reglas escritas a mano, no la IA.

**Qué cambiar en producción.**
- Reemplazar `leerGrupo`/`leerGrupoGroq` (`ingesta/lectura-ia.mjs`) por una llamada a `POST https://openrouter.ai/api/alpha/decisions` con preguntas tipadas (ver detalles técnicos en el Anexo A).
- **No tocar `aplicarFichas`, el semáforo, los medios mínimos ni los cupos**: el modelo reemplaza sólo la ficha, y sigue valiendo "la IA sólo puede endurecer, nunca destrabar".
- Umbrales de probabilidad iniciales (a ajustar con unos días de datos): arriba de 0,8 sigue sola; entre 0,2 y 0,8 espera en el celular; abajo de 0,2 se descarta.
- Dejar a Gemini como respaldo si Mercury falla.
- Usar la variante **paga** `inception/mercury-decide`: la `:free` tiene tope diario.
- Probarlo primero en modo sombra (punto 12).

**Esfuerzo:** medio. **Riesgo:** medio-bajo (se limita a endurecer). **Decisión pendiente:** los umbrales de probabilidad.

**Cómo repetirlo:** `pruebas-modelos/probar.mjs --modelo=inception/mercury-decide --muestra=muestra-200.json` y `comparar.mjs`. Informe: `comparacion-200.md`.

---

## 5. Prioridad 3: sección por tema y ámbito por separado

**Qué es.** Hoy "Balcarce" es una sección más y mezcla dos preguntas distintas. Se probó separarlas:

1. **De qué trata** (la sección, por tema).
2. **Dónde pasa**: `balcarce` (el partido y sus rutas), `zona` (lo que lo toca desde afuera: rutas fuera del partido, papa, vecinos inmediatos) y `afuera`.

Así un policial de Balcarce va a **Policiales** y queda marcado como de Balcarce. "Balcarce" pasa a ser **una vista** (todo lo de Balcarce, de cualquier tema), que es lo que permite darle prioridad en la tapa. La sección "Argentina" desaparece como cajón: lo nacional se clasifica por tema.

**Esquema probado (17 secciones).** Política, Policiales, Economía y trabajo, Agro, Fútbol, Automovilismo, Fórmula 1, Deportes, Tecnología, Ciencia y ambiente, Salud, Educación, Cultura y espectáculos, Turismo y gastronomía, Sociedad y servicios, Mundo, Esports y juegos.

**Evidencia (Mercury, 200 notas).**

| | Esquema de hoy (11 secciones) | Esquema nuevo (17 + ámbito) |
|---|---|---|
| Seguridad media de la sección | 0,89 | **0,92** |
| Notas dudosas (menos de 0,6) | 20 de 200 | **13 de 200** |
| Seguridad del ámbito | — | 0,98 |

- Los 4 policiales de Balcarce de la muestra fueron a Policiales con ámbito Balcarce.
- De las 50 notas de medios de Balcarce: 35 son de Balcarce, 14 salieron "de afuera" (copias nacionales) y 1 de "La zona". **"La zona" casi no aparece**: hay que revisar si es poco frecuente o si el modelo la subusa.
- Jev con 17 secciones queda menos seguro (0,85; 33 notas dudosas): para esto, Mercury.

**Categorías que traen los propios diarios** (para usarlas como pista, no como decisión):
- En las 200 notas hay **56 etiquetas distintas**, que se juntan en **13 familias** (Sociedad, Deportes, Política, Cultura, Economía, Mundo, Tecnología, Policiales, Fútbol, Automovilismo, Ciencia, Salud, Opinión). Los diarios nacionales usan casi el mismo menú; no hace falta llegar a 20 secciones.
- El 67% de las notas trae alguna categoría (el 83% mirando todo lo que traen los feeds hoy). Los medios de Balcarce casi no categorizan (`index.php`, nada), y "general" es un cajón que no dice nada.
- La sección del diario y la de Mercury coinciden casi siempre en policiales, cultura, tecnología, finanzas, rugby (100%), sociedad (93%) y política (79%). "Deportes" del diario se divide en Fútbol, Deportes y Automovilismo (73%).
- Propuesta: pasarle al modelo la categoría del diario como pista ("el medio la puso en Deportes"); el modelo decide.

**Qué cambiar en producción.**
- La lista de secciones está en 6 lugares (`SECCIONES` en `web/lib/datos.js`, colores, `REGLAS_SECCION`, placas, panel, pruebas): pasar de 11 a 15 o 17 toca todos. Hacerlo de una vez, con una prueba que compare las listas.
- Agregar el campo `ámbito` (balcarce / zona / afuera) en el archivo de notas y una vista "Balcarce" en la web. Hoy hay tres campos para lo mismo (`local`, `deLaZona`, `nombraBalcarce`).
- Renombrar Tecnología a "Ciencia y tecnología" manteniendo la dirección `/seccion/tecnologia` (ya decidido).

**Esfuerzo:** medio (por la cantidad de archivos). **Decisión pendiente (importante):** Andrés decidió **15 secciones** (las 11 de hoy, Tecnología renombrada y 4 nuevas: Salud, Educación, Turismo y gastronomía, Esports y juegos). La prueba usó **17** porque también separó Fórmula 1 y agregó Mundo y "Sociedad y servicios", y quitó "Argentina". Hay que **decidir la lista final** (15 o 17) antes de tocar código.

**Cómo repetirlo:** `pruebas-modelos/probar-secciones.mjs`. Informes: `categorias-de-origen.md`.

---

## 6. Prioridad 4: regla de "copia" más flexible

**El problema.** El verificador rechaza una nota si copia más de 12 palabras seguidas de la fuente (`copiaMaxima` en `ingesta/verificar.mjs`). Pero **nombres, apellidos, lugares y fechas reales tienen que repetirse**: una frase como "se llevará a cabo los días 30 y 31 de octubre y el 1 de noviembre" es un dato, no una copia.

En la prueba de redacción "copia" fue la falla más común en casi todos los modelos y con los dos prompts.

**Qué cambiar.** Que el control ignore nombres propios, lugares, números y fechas, y rechace sólo cuando se copia una frase entera con sus palabras de enlace. Es un cambio acotado en `copiaMasLarga`/`verificar`, con sus pruebas.

**Esfuerzo:** bajo. **Beneficio:** menos notas descartadas o reintentadas por error, y menos reintentos de IA. Decidido por Andrés ("no quiero límites extremadamente estrictos porque sí").

---

## 7. Prioridad 5: fotos repetidas

**Cómo funciona hoy (resumido de `docs/05-FOTOS.md`).** Para cada nota nueva (hasta 10 por corrida) se abre la página de cada fuente y se toma la foto principal del medio (`og:image`). Un pedido a **Gemini con visión** compara todas las fotos de **esa nota**: elige la que mejor ilustra, descarta las que tienen marca de agua o logo agregado por el medio y las que muestran a un menor reconocible. Si Gemini falla, Groq (Qwen, máximo 3 fotos). Si ninguna sirve y la nota es de una persona pública, Wikimedia Commons. Se guarda achicada a 1.200 px. Resultado: 86% de las notas con foto; la causa principal de las que no, los menores reconocibles.

**El hueco.** El sistema compara las fotos **de una misma nota**, pero no se acuerda de las que usaron **otras notas**.

**Evidencia.** Con una "huella" de cada foto de las notas publicadas (699 fotos): **32 pares casi idénticos que involucran 47 notas de 708 (7%)**, aunque por nombre de archivo sólo parecían 8. Ejemplos: cuatro notas de Colapinto sobre Bakú con la misma imagen; "Messi llega a Disney+" con "Scaloni valora el legado de Messi"; dos notas de Milei con la misma foto; varias notas de F1 del mismo Gran Premio. Algunas repeticiones son **por diseño** (los repasos de audio reusan la foto de su nota, las tablas de F1 usan la misma foto del circuito): quedan como excepciones.

**Qué es la huella y por qué no necesita IA.** Se achica la foto a un cuadradito de 9×8 en gris y se anota, píxel por píxel, si cada uno es más claro que el de al lado: 64 unos y ceros. La misma foto da casi los mismos 64 números aunque cambie de tamaño o de compresión. Comparar dos huellas es contar cuántos números difieren. Es matemática, no inteligencia: gratis y siempre da lo mismo. No detecta "otra foto del mismo hecho", sólo la misma foto.

**Qué cambiar en producción.**
- Calcular la huella con `sharp` (ya instalado en `web/node_modules`) al bajar cada candidata y guardarla en `banco-fotos.json`.
- Antes de mandar las fotos a Gemini, descartar las que son casi iguales (diferencia de unos 6 bits o menos) a una usada en una nota de los últimos N días. También juntar las copias de la misma foto entre fuentes de la misma nota: Gemini mira menos fotos, el límite de 3 de Groq pesa menos.
- Excepciones por diseño: repasos de audio y notas propias.
- **Mantener a Gemini** para elegir la mejor, ver marcas de agua y menores: es la parte que sí necesita "mirar" la imagen.

**Esfuerzo:** bajo. **Costo:** US$ 0.

**Futuro (no probado):** hay modelos de decisiones que aceptan imágenes (Cloudflare Clef Flash, Perplexity decider, OpenAI luna, desde unos US$ 0,02 por millón de tokens) y darían probabilidad por foto de "marca de agua" o "menor". Convendría compararlos con Gemini con ~30 fotos etiquetadas antes de cambiar nada.

**Cómo repetirlo:** `pruebas-modelos/fotos-repetidas.mjs`. Informe: `fotos-repetidas.md`.

---

## 8. Prioridad 6: criterio único por bloques y arreglo de contradicciones

**Qué hay hoy** (inventario hecho por un agente que leyó el repositorio, `inventario-criterios.md`): **19 bloques de instrucciones** repartidos por el código (13 prompts con texto propio, 4 textos que se pegan al del redactor y 2 que no van a ninguna IA). El redactor recibe **20.606 caracteres por nota**. Hay **20 contradicciones**. Las más graves:

1. **Tono:** el criterio dice "se lee liviano"; lo que lee la IA dice "no es escribir liviano".
2. **Fotos:** el criterio dice que con la mínima duda sobre un logo no se usa; el prompt dice que ante la duda se aplica un test y se usa.
3. **Rojo:** el criterio dice "nunca, ni aprobada"; la regla 119 deja salir una nota si una persona la reescribe.
4. **Acusaciones:** el criterio dice que siempre esperan a una persona; la regla 96 las suelta en lo de Balcarce.
5. **La zona:** el criterio nombra Los Pinos y "rutas dentro del partido"; el código sólo reconoce las rutas 226 y 55 en cualquier tramo y la papa.
6. **Fórmula 1 sin argentino:** tres versiones distintas.
7. **Nombre del medio:** el pedido de pista manda citarlo y la regla 8 lo prohíbe.
8. **Verificación BAJA:** cuatro definiciones.
9. **Dólar:** figura "no entra nunca" pero en el código es amarillo.
10. **Secciones:** Hernán decidió 15 el 5/10 y todo sigue en 11.

**Qué se armó** (`criterio-unico/`): un `CRITERIO-UNICO.md` con 22 bloques (B0 a B21), cada regla **una sola vez**; un script que arma cada prompt juntando bloques (`armar-prompts.mjs`); una verificación que controla que no haya repeticiones ni números duplicados (`verificar-criterio.mjs`, da OK: 41 bloques, 108 números, 16 prompts); y `CAMBIOS.md` con cómo quedó cada contradicción y los cambios de código que implica.

| Prompt | Armado | Actual | Diferencia |
|---|---|---|---|
| Redactor | 17.448 | 20.606 | **−15%** |
| Lectura (selección) | 9.147 | 5.492 | +67% (suma las definiciones de secciones y del ámbito) |
| Auditoría | 6.943 | 2.173 | +220% (ahora lleva definiciones de secciones y sensibilidad) |
| Parejas / repetidas | 919 / 935 | 633 / 493 | +45% / +90% (un solo texto de "mismo hecho") |

**Cómo salió en la prueba real de redacción.** Con 15 historias y el verificador de producción, el prompt nuevo **no aprobó más notas que el actual al primer intento** (Gemini 5 de 15 a 3 de 15; Gemma 31B 5 a 4; Haiku 2 a 1): con tan pocas notas, diferencias de 1 o 2 son ruido, pero no hay mejora clara, y en algunos modelos subió la falla "repite la bajada". **Conclusión: el criterio único tiene valor por orden y consistencia, pero el prompt nuevo del redactor todavía no está listo.**

**Decisiones ya tomadas que lleva el criterio** (ver Anexo B): zona, tres niveles, 15 secciones, importancia, F1, mismo hecho, chimento, menores, nombre del medio, clima y dólar, verificación baja, tamaños, figura argentina, policiales.

**Qué hacer.**
- **Rápido y sin riesgo** (se puede hacer ya, aun sin migrar): arreglar los dos errores reales de prompts (la nota de pista que pide nombrar al medio, y el respaldo de Groq que no recibe la lista de campos de la ficha); definir "importancia" en una frase; escribir una sola vez "la zona" y "el mismo hecho".
- **Después:** pasar de a un prompt por vez a "armado por bloques" (primero parejas y repetidas, que son los más cortos y hoy se contradicen), midiendo antes y después. El redactor al final.
- Cambios de código que implican las decisiones (lista completa con archivo y línea en `criterio-unico/CAMBIOS.md`): 11 a 15 secciones en más de 8 archivos, la regla 96 y la 119, la lista de figuras argentinas, Boca y River como conexión argentina, reconocer las localidades y rutas de la zona, descartar dólar y clima de otros medios, `PEDIDO_DE_PISTA`, el control del nombre del medio, que el redactor reciba la cantidad de fuentes y que el código deje fijo sólo el mínimo de 70 palabras.

**Esfuerzo:** alto (es una limpieza grande). **Decisiones que necesitan confirmación de Hernán:** policiales de Balcarce con 2 medios (toca el semáforo), menores en notas positivas, importancia, cuatro secciones nuevas y sus "qué no".

---

## 9. Prioridad 7: darle al redactor datos de contexto verificados

**Qué se probó.** Con la nota de Camila Peralta (una fuente) y tres datos ya verificados, se agregó un bloque aparte en el pedido del redactor. Resultado:

- **Es fácil darlos:** un bloque en la entrada y sumar ese mismo texto (incluido el nombre de la fuente) al material del verificador; si no, el verificador marca como inventadas palabras que sí vienen de la fuente.
- **El redactor ignora los datos si no se le pide:** usó 1 de 3. Con la indicación "sumá por lo menos dos si encajan" usó la capacidad del Roxy (954 butacas) y el Premio ACE, atribuidos y sin nombrar al medio, después de lo central.
- Las demás fallas del verificador (frases copiadas) son las de siempre, no las causó el dato.

**Dónde está el trabajo de verdad: conseguir el dato.** Tres niveles:

| Nivel | Cómo se consigue | Costo | Dificultad |
|---|---|---|---|
| **0. Manual** | El equipo lo busca con la plantilla y lo pega (hoy el panel tiene "pedido de la redacción", 400 caracteres) | US$ 0 | Baja: un cambio chico de código |
| **1. Datos estructurados** | El código trae datos de fuentes con API gratis: F1, fútbol, dólar, clima, feriados, la API de la Municipalidad | US$ 0 | Media: un conector por fuente, sólo sirve para ciertos temas |
| **2. IA con búsqueda** | Una IA busca y el código verifica | ~US$ 0,006–0,009 por nota (DeepSeek o Sonar) | Media (ver punto 12) |

**Datos oficiales y abiertos que se probaron en vivo (11/10) y andan:** BCRA (monetarias y cotizaciones), API de la Municipalidad de Balcarce (`wp-json`), feed de la Facultad de Ciencias Agrarias, INA (hidrología), feriados (ArgentinaDatos), clima (Open-Meteo), Wikipedia, Wikidata y Wikimedia Commons, OpenStreetMap, OpenAlex. **INDEC por datos.gob.ar no respondió: descartado por Andrés.** Detalle: al buscar "Balcarce" en Wikipedia devuelve una página de desambiguación; hay que resolver la entidad con Wikidata primero.

**Reglas a decidir.** Cómo se atribuye un dato que viene de un medio (sin nombrar al medio: "según la lista oficial de…"); y datos personales (por ejemplo, la fecha de nacimiento de una persona): sólo de figuras públicas y sólo si suma. Los datos de Wikipedia como hechos están bien; copiar texto exige crédito CC BY-SA.

**Qué cambiar en producción.** `entradaDe` (`reels/reescritura.mjs`): un bloque "DATOS DE CONTEXTO VERIFICADOS (con su fuente)" y la instrucción de usar los que aporten; `materialParaVerificar`/`fuenteParaVerificar`: sumar ese texto; "Fuentes consultadas": agregar el enlace del dato. **Todo opcional:** si no hay dato, la nota sale como hoy.

**Esfuerzo:** bajo a medio. Plantilla para el equipo: `PLANTILLA-DATO-DE-COLOR.md`.

---

## 10. Prioridad 8: feeds, frecuencia y categorías de origen

**Cuántas notas traen.** Leyendo 206 de 208 feeds: **2.354 notas en 24 horas** (sin filtrar), un promedio de **49 por cada media hora**; en el pico de las 10 y 11 de la mañana, unas 150 cada media hora; entre la 1 y las 4, ~15. Cada feed devuelve una mediana de 20 notas por lectura. De esas 2.354, hoy entran unas 900 después de los filtros.

**¿Cada media hora o cada hora?** Seguir **cada 30 minutos**: leer no gasta IA (lo ya visto se descarta antes), y cada hora algunos feeds grandes perderían notas en los picos: Clarín general guarda sólo ~0,7 horas de notas e Infobae ~0,9. Aun si todas las 2.354 notas pasaran por el modelo de decisiones, Mercury costaría ~US$ 2,4 por mes.

**Categorías de origen:** ver el punto 5 (13 familias; usarlas como pista).

**Datos de su documento de fuentes** (módulo 1; no son de estas pruebas): sacar los 16 medios que no aportaron ninguna nota, recortar los 13 feeds de Olé y La Nación, reactivar 4 fuentes que sí andan (El Diario de Tandil, Sendero Regional, 2261 de Lobería, El Argentino Digital de Miramar) y sumar Infocielo. Las pruebas encontraron **fuentes nuevas** que vale la pena sumar al catálogo de contexto: el sitio propio del Concejo Deliberante (`concejodeliberantebalcarce.gob.ar`), los boletines municipales (`sibom.slyt.gba.gob.ar`), la Procuración Penitenciaria, Chequeado, Infoleg y la Legislatura bonaerense.

**Esfuerzo:** bajo. **Cómo repetirlo:** `pruebas-modelos/auditar-feeds.mjs` y `categorias-de-origen.mjs`.

---

## 11. Prioridad 9: redacción (qué modelo y qué prompt)

**Cómo se midió.** 15 historias (10 con una fuente y 5 con varias), el verificador de producción, una sola vez por nota (sin los reintentos de producción). Se probaron 17 modelos con el prompt actual y con el nuevo. Los modelos que "piensan" antes de escribir (Haiku, DeepSeek, GPT-5 nano, gpt-oss) fallaban por demora o gastando todo en razonar: se repitieron con el razonamiento apagado.

| Modelo | Aprobadas al 1.º intento (actual → nuevo) | Costo por mes (450 notas por día, un intento) |
|---|---|---|
| Gemma 4 31B (pago) | 36% → 27% | ~US$ 10–11 |
| Gemini Flash-Lite 3.1 (hoy) | 33% → 20% | ~US$ 35–37 a precio de lista (hoy corre con cupo gratis) |
| Gemma 4 26B (pago) | 27% → 23% | ~US$ 8 |
| GPT-5 nano (razonamiento bajo) | 15% → 0% | ~US$ 12 |
| DeepSeek flash | 15% → 7% | ~US$ 5 |
| Claude Haiku 5.5 (sin razonar) | 13% → 7% | ~US$ 22–23 |
| gpt-oss-20b / 120b | 0–8% | ~US$ 2,7 / 5–6 |
| Qwen 3.5 y 3.7 flash, Mistral Small 3.2, Nova Lite, Gemini 2.5 Flash-Lite | 0–25% (muchos errores de JSON, notas cortas) | US$ 4–15 |
| Gemma 4 gratis, Nemotron gratis | — | no sirven hoy (saturado o lento) |

- Ninguno aprueba "al primer intento" más del 36%; en producción hay hasta 3 intentos y correcciones automáticas, así que las cifras son para comparar, no el porcentaje final.
- La falla que más aparece es **"copia"** (ver punto 6), después "número" y "repite la bajada". Es un problema del verificador y del prompt, no del modelo elegido.
- **El largo depende de los datos, no del prompt:** la nota de la Fiesta del Postre tiene 5 fuentes que dicen casi lo mismo y el cuerpo salió de 96 a 121 palabras.

**Decisión de Andrés:** no volverse locos con la redacción. Seguir con **Gemini gratis**; **Gemma 4 26B (~US$ 8 por mes)** queda anotada como repuesto si Gemini deja de ser gratis. Un cupo gratis puede cambiar: el 29/09 Google desactivó claves y no se publicó nada durante 14 horas.

**Largo del cuerpo (decidido):** dinámico, según los datos. De guía, 90 a 150 palabras con una fuente y 150 a 250 con varias; el único límite duro es publicar desde 70 palabras; si pasa de unas 300, avisa a una persona (no corta). La nota nunca puede ser más larga que sus datos y el cuerpo nunca repite el título ni la bajada. Cambio de código: hoy se fija 70–180 como límites duros.

---

## 12. Prioridad 10: datos con IA y búsqueda web automática

**Qué se probó.** A 6 IAs con búsqueda se les dio 12 notas (7 locales o regionales y 5 nacionales o deportivas) y se les pidió hasta 3 datos de contexto, cada uno con la dirección exacta. Después **un script abrió cada dirección y comprobó si la cifra estaba en la página**.

| IA | Datos | Respaldados por la fuente | Costo por nota |
|---|---|---|---|
| Grok 4.3 | 27 | **89%** (no propuso nada en 3 notas, como se le pidió) | US$ 0,095 |
| Claude Haiku 5.5 | 32 | **84%** | US$ 0,025 |
| Perplexity Sonar | 34 | **82%** | US$ 0,006 |
| DeepSeek V4 Pro | 34 | **79%** | US$ 0,009 |
| ChatGPT (gpt-5-mini) | 34 | 53% | US$ 0,029 |
| Gemini 3.1 Flash-Lite por API (`:online`) | 29 | **14%** | US$ 0,043 |

- **Gemini por API casi no sirve** para esto: pone la portada del medio en vez de la página del dato.
- **La verificación es imprescindible:** un dato de Haiku decía "51.736 habitantes" para Balcarce según el INDEC; la cifra real del censo 2022 es **48.982**. El verificador lo marcó.
- Tipos de datos útiles que salieron: "Colapinto era el único titular sin abandonos en 14 carreras", "Estudiantes (RC) sumó 11 puntos en 28 partidos", "el límite legal de tierras en manos extranjeras es 15% y 31 departamentos lo superan", "el cupo de Marcos Paz es de 1.472 plazas", "el postre Balcarce se creó en 1950".

**Prueba a mano de Andrés (sin costo, apps gratis, nota de Camila Peralta).** meta.ai 3 de 3 datos verificados, Grok 3 de 3, **Gemini (app) 2 de 3** (el tercero era un Facebook que no abre sin iniciar sesión). **La app de Gemini da direcciones exactas**, a diferencia de la API. Dos IAs hallaron lo mismo por separado (Premio ACE: meta y Gemini; salto al Metropolitan: Grok y Gemini): es una buena señal sin costo.

**Método que sirve** (aportado por Andrés): no buscar la nota sino **lo que la nota no dice**: 3 entidades, búsquedas con comillas y `site:`, fuentes sólo de medios, `.gob.ar` u oficiales, dirección exacta, y si no hay dato, "ninguno". Plantilla lista: `PLANTILLA-DATO-DE-COLOR.md`.

**Opciones de búsqueda gratis, verificadas en sus páginas oficiales el 11/10:**

| Proveedor | ¿Gratis? | Detalle |
|---|---|---|
| **Google, Gemini API con búsqueda** | **Sí, con Gemini 2.5** | Gratis en 2.5 Flash y 2.5 Flash-Lite hasta **500 pedidos por día**. En los Gemini 3.x no hay búsqueda gratis sin plan pago. Hay que fijar el modelo 2.5 (no el alias `latest`) |
| **Groq** | Posible, a probar | Retiró `compound` el 21/09/2026; ofrece "browser search" (hecha con Exa) para `gpt-oss-20b` y `gpt-oss-120b`. La página no dice si va en el plan gratis ni el costo. No es compatible con salidas estructuradas |
| **Exa** | Sí | $10 de crédito que se renuevan cada mes (~2.500 búsquedas Instant), sin tarjeta |
| **Tavily** | Sí | 1.000 créditos por mes, sin tarjeta |
| **Brave** | Casi | $5 de crédito por mes (US$ 5 por 1.000 búsquedas); pide tarjeta para confirmar identidad |
| **OpenRouter** | No | Ningún modelo gratis trae búsqueda propia; la búsqueda web se cobra |
| Google Custom Search JSON | No | Cerrada a clientes nuevos |
| DuckDuckGo HTML | Frágil | Funcionó 2 de 3 veces; la tercera la bloqueó |

Con Exa gratis alcanzan unas 25 notas por día (3 búsquedas por nota), con Tavily unas 11.

**Diseño recomendado** (todo opcional y con verificación): una IA de bajo costo saca las entidades y pide búsquedas con comillas; el buscador trae el texto de las páginas; la IA extrae el dato **de ese texto** (no de memoria); **el código abre la fuente y comprueba la cifra**; sólo lo verificado le llega al redactor, con el enlace. Sin dato verificable, la nota sigue como hoy.

**Costo estimado** con DeepSeek o Sonar y búsqueda: unos US$ 0,006–0,009 por nota; con 10 notas por día, US$ 2 a 3 por mes; con 50, US$ 8 a 14. **Andrés no quiere sumar costos por ahora**: queda para después, con el circuito manual y los datos estructurados (nivel 0 y 1) primero.

---

## 13. Prioridad 11: infografías y visión (futuro)

- **Infografías:** el diseño de módulos ya prevé que las arme el código con la serie real (dólar, clima, inflación) y que la IA sólo elija cuál suma. Requiere el catálogo de datos del punto 9. Andrés quiere llegar a ahí "después".
- **Elegir fotos con IA de visión con probabilidades:** punto 7, a comparar con Gemini antes de cambiar.

---

## 14. Costo mensual consolidado (estimado, a precio de lista)

| Parte | Hoy | Con lo probado |
|---|---|---|
| Selección de notas (ficha) | Gemini y Groq gratis | **~US$ 0,9** con Mercury Decide |
| Duplicadas | Gemini y Groq gratis (poco eficaz) | **< US$ 1** |
| Secciones y ámbito | parte de la ficha | incluido en la selección |
| Fotos: huella | — | US$ 0 |
| Datos de color | — | US$ 0 (manual y datos estructurados) |
| Redacción | Gemini gratis (US$ 35–37 a precio de lista) | igual; repuesto Gemma 26B ~US$ 8 |
| Datos con IA y búsqueda | — | US$ 2 a 3 con 10 notas por día (para más adelante) |

**El núcleo nuevo (selección y duplicadas) suma alrededor de US$ 1,5 por mes.** Eso entra con holgura en el tope de US$ 25 por mes que figura en el documento de módulos.

---

## 15. Orden sugerido para implementar

**Ola 0 (inmediata, sin riesgo, cambios chicos)**
1. Arreglar los dos errores de prompts (nota de pista y respaldo de Groq).
2. Regla de "copia" flexible (punto 6).
3. Huella anti-repetición de fotos (punto 7).

**Ola 1 (modo sombra, unos días)**
4. Correr en paralelo, **sin afectar lo que se publica**, el circuito de duplicadas (punto 3) y la selección con Mercury (punto 4), y guardar lo que habrían decidido. Comparar con lo que decide el sistema actual y revisar a mano las discrepancias (Andrés y Hernán).
5. Ajustar los umbrales de probabilidad con esos datos.

**Ola 2 (cambio)**
6. Pasar la selección y las duplicadas a Mercury y embeddings, con Gemini como respaldo.
7. Decidir la lista final de secciones (15 o 17) y agregar el ámbito; una vista "Balcarce".

**Ola 3 (orden)**
8. Criterio único por bloques, de a un prompt por vez, midiendo antes y después. El redactor al final.

**Ola 4 (valor agregado)**
9. Bloque de datos verificados para el redactor, con carga manual y datos estructurados.
10. Más adelante, datos con IA y búsqueda para pocas notas por día, y las infografías.

---

## 16. Lo que no funcionó (para no repetirlo)

- **Gemini con búsqueda por la API de pago (`:online`):** sólo 14% de datos respaldados; direcciones genéricas y enlaces de redirección.
- **Los modelos gratis de Gemma:** error 429 en las 15 notas (saturados). Los modelos gratis comparten un tope diario (50 pedidos sin crédito, 1.000 con crédito).
- **`respan/span-01-lite:free`:** chocó contra el tope diario; no se pudo evaluar.
- **Microsoft, Perplexity y OpenAI como modelo de decisión para seleccionar:** publican de más o descartan notas de Balcarce (OpenAI se negó a contestar 3 notas y es el más caro).
- **Mercury con 12 notas por pedido:** pierde precisión (89%, publicó 70 notas en vez de 57). Con Jev no se pierde.
- **Agrupar por parecido solo, sin confirmar ni usar ancla:** produce grupos gigantes que mezclan hechos del mismo tema.
- **Los modelos "pensantes" sin apagar el razonamiento:** 4.500 tokens de razonamiento para una nota de 800, 18 segundos y el doble de costo.
- **INDEC por datos.gob.ar:** sin respuesta; descartado.
- **Qwen flash:** devuelve JSON mal formado en 30–60% de las notas.

---

## 17. Decisiones abiertas

| Tema | Pregunta | Quién |
|---|---|---|
| Secciones | ¿15 (las decididas) o 17 (las probadas, con Fórmula 1 aparte, Mundo y Sociedad y servicios)? | Andrés y Hernán |
| Importancia | La definición de "alta, media y baja" (propuesta: alta = cambia algo concreto para cualquier argentino o lo cuentan 5 medios o más; media = 3 o 4; baja = el resto) | Andrés y Hernán |
| Policiales de Balcarce | Salen cuando los cuentan 2 o más medios (regla 96). **Toca el semáforo** | Hernán |
| Menores | Nombrarlos en notas positivas con fuente oficial y aprobación humana. Víctima, acusado o testigo menor: nunca | Hernán |
| Umbrales | 0,8 y 0,2 de probabilidad de publicar (iniciales) | Andrés (con datos de la ola 1) |
| Atribución de datos | Cómo se menciona la fuente de un dato sin nombrar al medio | Andrés |
| Datos personales | Fecha de nacimiento y similares: sólo de figuras públicas y sólo si suma | Andrés y Hernán |
| Ley de Tierras, mismo hecho | ¿Una historia con muchos medios se actualiza o se mantiene "una nota por hecho"? | Andrés y Hernán |
| Fotos | Cuántos días se recuerda una foto usada (propuesta: 7) | Andrés |

---

## Anexo A: detalles técnicos

**API de decisiones (OpenRouter).** `POST https://openrouter.ai/api/alpha/decisions` con `Authorization: Bearer <clave>` y cuerpo `{ model, state, questions }`. `state` es el contenido (texto o datos) y `questions` un objeto con una pregunta por clave.
- Tipos de pregunta: `choice` (elige una opción de `criteria`; devuelve `choice`, `probabilities` y `confidence`), `noul` (sí/no; devuelve un número entre 0 y 1, la probabilidad de "sí") y `score`.
- Respuesta: `{ answers, usage: { input_tokens, output_tokens, cost }, model }`. La documentación dice `inputTokens`, pero la API real manda `input_tokens`.
- Varias notas por pedido: una pregunta por nota (`n1_seccion`, `n1_publicar`…). Con Mercury baja la precisión; con Jev no. Ejemplos en `clasificarLoteConDecisiones` de `pruebas-modelos/probar.mjs`.
- Errores vistos: OpenAI contestó 502 "refused to answer" en 3 de 200 notas.
- El texto fijo (instrucciones y `perfil-balcarce.md`) va en `state` y es ~90% del costo: achicarlo baja el costo casi proporcionalmente.

**Embeddings.** `POST https://openrouter.ai/api/v1/embeddings` con `{ model: "baai/bge-m3", input: [...] }`; 1.024 dimensiones; US$ 0,01 por millón de tokens.

**Huella de imagen (dHash).** `sharp(ruta).greyscale().resize(9, 8, { fit: 'fill' }).raw()`; 64 bits; distancia de Hamming; umbral inicial 6 de 64.

**Pruebas de redacción.** Para los modelos que razonan: `reasoning: { enabled: false }` (o `{ effort: "low" }` si no se puede apagar), pasado en la llamada a OpenRouter.

**Clave.** Variable de entorno `OPENROUTER_API_KEY`; nunca en un archivo ni en el repositorio. La clave de prueba que se pegó en el chat fue revocada por Andrés; la variable de usuario de Windows (`setx`) sigue guardando esa clave vieja (inofensiva, se puede limpiar).

---

## Anexo B: decisiones tomadas en esta conversación (11/10/2026)

- **La zona:** el partido de Balcarce, sus localidades (Napaleofú, Ramos Otero, San Agustín, Los Pinos, Villa Laguna La Brava) y las rutas 226 y 55 dentro del partido.
- **Tres niveles fijos:** Balcarce (el partido), La zona (lo que lo toca de afuera) y De afuera.
- **15 secciones:** las 11 de hoy, Tecnología renombrada "Ciencia y tecnología" (misma dirección) y Salud, Educación, Turismo y gastronomía y Esports y juegos.
- **Importancia** se mantiene y se define en una frase.
- **Fórmula 1 sin argentino:** sólo entran las notas propias armadas con datos.
- **Mismo hecho:** mismo suceso, día y protagonista; un anuncio y su resultado son dos notas.
- **Chimento:** vida privada de famosos; estrenos, giras, premios y programas van a Cultura y agenda.
- **Menores:** en nota positiva se pueden nombrar con fuente oficial y aprobación humana; víctima, acusado o testigo menor, nunca.
- **Nombre del medio** dentro de la nota: nunca.
- **Clima y dólar de otros medios:** se descartan.
- **Verificación baja:** la definición del código.
- **Tamaños:** cuerpo dinámico (guía 90–150 con una fuente y 150–250 con varias; mínimo duro de 70; se avisa si pasa de ~300); bajada hasta 360 caracteres.
- **Figura argentina:** que la IA decida (un argentino que protagoniza un logro o un hecho de peso nacional).
- **Policiales de Balcarce:** salen con 2 o más medios (a confirmar con Hernán).
- **Alcance:** lo fundamental es validar notas antes de escribir; la redacción no es prioridad. Sin límites "extremadamente estrictos porque sí" (la regla de "copia" no debe contar nombres, lugares ni fechas).
- **Fotos:** no repetir fotos en notas nuevas.
- **Datos:** quieren un catálogo de datos oficiales automatizado para cotejar y sumar datos (con una fuente o varias) y, más adelante, infografías. **Sin costos nuevos por ahora.** Sumar fuentes de datos no es obligatorio.

---

## Anexo C: inventario de archivos nuevos (repositorio, sin commit)

**`pruebas-modelos/`**
- Muestras: `muestra.json` (30 notas), `muestra-200.json` (200 notas crudas), `pares-200.json` (62 pares etiquetados), `historias.json` (15 historias para redacción), `notas-datos.json`.
- Scripts: `armar-muestra.mjs`, `bajar-crudas.mjs`, `probar.mjs`, `comparar.mjs`, `probar-secciones.mjs`, `armar-pares.mjs`, `etiquetar-pares.mjs`, `duplicadas-por-significado.mjs`, `confirmar-pares-significado.mjs`, `agrupar-estrella.mjs`, `auditar-feeds.mjs`, `categorias-de-origen.mjs`, `fotos-repetidas.mjs`, `redactar.mjs`, `comparar-redaccion.mjs`, `armar-historias.mjs`, `datos-de-color.mjs`, `verificar-datos-de-color.mjs`, `verificar-a-mano.mjs`, `probar-duckduckgo.mjs`.
- Informes: `comparacion-200.md`, `comparacion-pares.md`, `comparacion-redaccion.md`, `redaccion-lado-a-lado.md`, `duplicadas-significado.md`, `duplicadas-confirmadas.md`, `historias-estrella.md`, `categorias-de-origen.md`, `auditoria-feeds.md`, `fotos-repetidas.md`, `datos-de-color.md`, `inventario-criterios.md`, `TRASPASO.md`, más los resultados de cada corrida (`resultados-*.json`, `redaccion-*.json`, `secciones-*.json`, `datos-de-color-*.json`).

**`criterio-unico/`:** `CRITERIO-UNICO.md`, `CRITERIO-UNICO-CON-NUMEROS.md`, `armar-prompts.mjs`, `verificar-criterio.mjs`, `CAMBIOS.md`, `prompts-armados/` (16 prompts) y `partes/`.

**Carpeta de este proyecto (`Fuentes Radar Balcarce Test`):** este documento, `TRASPASO-modelos.md`, `PLANTILLA-DATO-DE-COLOR.md`, `diagrama-seleccion.html`, `inventario-criterios.md`, `comparacion-redaccion.md`, `redaccion-lado-a-lado.md`, `categorias-de-origen.md`, `historias-estrella.md`, `duplicadas-significado.md`, `fotos-repetidas.md` y `datos-de-color.md`.

## Anexo D: glosario

- **Token:** la unidad en que los modelos cuentan el texto (3 o 4 letras). Se cobra por millón de tokens.
- **Modelo de decisiones:** no escribe; contesta preguntas con opciones fijas y da la probabilidad de cada una.
- **Par:** dos notas puestas lado a lado con la pregunta "¿cuentan exactamente el mismo hecho?".
- **12 por pedido (lote):** mandar 12 notas o 12 pares en un solo pedido para pagar una sola vez las instrucciones, que son ~90% del costo. El 12 viene de `notasPorPedido` de la lectura actual.
- **Embedding:** una huella numérica del significado de un texto; textos parecidos quedan cerca.
- **Huella de imagen (dHash):** 64 unos y ceros que resumen una foto; la misma foto da casi los mismos números.
- **Modo sombra:** correr el sistema nuevo al lado del actual, sin cambiar lo que se publica, para comparar.

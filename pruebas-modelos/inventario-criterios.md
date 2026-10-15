# Inventario de todo lo que le dice a una IA cómo seleccionar, clasificar, juntar y escribir

*Hecho el 11/10/2026. Sólo lectura: no se tocó nada del repositorio salvo este informe. Los tamaños se midieron con un programa que carga los textos reales (no a ojo). Cuando el texto y el código no coinciden, vale lo que hace el código, y está dicho en cada caso.*

*Cómo leerlo: "archivo:línea" dice dónde está. "Prompt" = el texto que recibe la IA. "Verificador" = el control automático que revisa lo que escribió la IA (`ingesta/verificar.mjs`).*

---

## 1. Los bloques de instrucciones que existen hoy

Hay **19 bloques** en la tabla: 13 prompts con texto propio, 4 "pegotes" que se suman a un pedido del redactor (filas 6 a 9) y 2 textos que no se mandan a ninguna IA (filas 4 y 5). **Solo el del redactor lo puede leer una persona en el panel**; los otros viven dentro del código.

| # | Bloque | Dónde (archivo:línea) | Para qué sirve | Modelo que lo usa | Tamaño | Cuántas veces corre |
|---|---|---|---|---|---|---|
| 1 | **Reglas fijas del redactor** (las 21 reglas, pasos A–H, campos de salida) | `CRITERIO-EDITORIAL.md:850-908` (marcas en 849 y 909) | Escribir cada nota: título, bajada, cuerpo, guion y las partes internas | Gemini `gemini-flash-lite-latest`, temperatura 0,6. Claves: redacción, si no redes, si no clasificación. Groq no sirve (no alcanza el cupo) | **20.171 caracteres** (3.603 palabras) | Hasta 40 notas por corrida, tope de 450 por día (330 si la lectura comparte clave). "Actualizar la web" corre cada 30 min (48 veces por día). Hasta 3 intentos por nota |
| 2 | Tono de todos los días | `CRITERIO-EDITORIAL.md:914` | Reemplaza `{{TONO}}` (regla 5) | Mismo que 1 | 443 | Con el 1 |
| 3 | Tono serio | `CRITERIO-EDITORIAL.md:920` | Reemplaza `{{TONO}}` si la nota es de Policiales o toca una palabra seria | Mismo que 1 | 284 | Con el 1 |
| | *Pedido completo del redactor = 1 + 2 o 3* | `reels/reescritura.mjs:86-88` | | | **20.606** (ameno) o **20.447** (serio) | Hasta 450 × 20.606 = **9,3 millones de caracteres por día** sólo en instrucción repetida |
| 4 | Nota aparte del panel | `CRITERIO-EDITORIAL.md:926-970` | **No se manda a ninguna IA.** La muestra el panel ("Cómo escribe la IA") y repite en resumen cosas de otras secciones | Ninguno | 2.665 | — |
| 5 | Lista de palabras serias (22) | `CRITERIO-EDITORIAL.md:392` | No es prompt: decide cuál tono va en `{{TONO}}` | Ninguno | 208 | — |
| 6 | Cabeceras que arma cada pedido (`entradaDe`): "FUENTES…", "Texto completo de la Fuente N (de acá sale la mayor parte…)", "ANTECEDENTES: … es información ANTERIOR…" | `reels/reescritura.mjs:233-250` | Explicar a la IA qué es cada dato que recibe | Mismo que 1 | ~250 fijos + los datos de la nota (texto de la fuente hasta 4.000) | Con el 1 |
| 7 | Pegote "PEDIDO DE LA REDACCIÓN" | `reels/reescritura.mjs:352` | Una persona pide desde el celular "más corta", "empezá por el horario" | Mismo que 1 | ~300 + el pedido (hasta 400) | A demanda (panel del celular) |
| 8 | Pegote "CORRECCIÓN OBLIGATORIA" | `reels/reescritura.mjs:356` | Segundo pedido: le dice qué falló y repite "usá únicamente lo que dicen las fuentes" | Mismo que 1 | ~470 + hasta 6 fallas | Sólo en el segundo pedido de una nota |
| 9 | `PEDIDO_DE_PISTA` | `panel/nota-de-pista.mjs:12` | "Hacer la nota" de una pista (un dato de redes): contar sólo lo que confirman las fuentes | Mismo que 1 (va como pegote 7) | 178 | A demanda, o hasta 2 por corrida de "Pistas" (cada 3 h, `pistas.yml:28`) |
| 10 | **Lectura rápida (selección)** `INSTRUCCION` | `ingesta/lectura-ia.mjs:69-95` | Para cada nota: ámbito, sección, impacto, razón, importancia, ¿publicidad?, ¿chimento? | Gemini `flash-lite-latest`, temperatura 0, esquema cerrado; si falla, Groq `openai/gpt-oss-120b` (+99 caracteres: `lectura-ia.mjs:213`) | 3.261 | 12 notas por pedido, 5 pedidos por corrida, **60 por día (200 con clave propia)** |
| 11 | **Perfil de Balcarce** | `ingesta/perfil-balcarce.md:1-53` | Lo que la IA de lectura "sabe" de Balcarce | Va pegado a cada pedido del 10 | 2.186 | Con el 10 (instrucción + perfil = **5.492 fijos** por pedido) |
| 12 | `INSTRUCCION_PAREJAS` | `ingesta/lectura-ia.mjs:435-439` | Confirmar si dos notas "sospechosas" cuentan **exactamente el mismo hecho** | Gemini; si falla, Groq `gpt-oss-20b` | 633 | Hasta 24 parejas por corrida en un pedido, **máximo 40 pedidos por día** (`web/scripts/generar-datos.mjs:883`, `web/lib/repetidas.js:167-179`) |
| 13 | `INSTRUCCION_REPETIDAS` | `ingesta/lectura-ia.mjs:505-508` | Agrupar las notas que cuentan el mismo hecho (mira juntas todas las del momento) | Sólo Gemini | 493 | Una vuelta por corrida si cambió la lista (hasta 2 pedidos), **60 por día** |
| 14 | **Auditoría** `INSTRUCCION` | `ingesta/auditoria-ia.mjs:64-78` | Marcar ortografía, texto roto, sección equivocada, tema sensible, afirmación sin sostén, título que no corresponde | Groq `openai/gpt-oss-20b` | 2.175 | Cada hora (`auditoria-ia.yml:22`): 12 notas por corrida, 3 por pedido = 4 pedidos × 24 = **hasta 96 por día** |
| 15 | **Editor de fotos** `instruccion` | `ingesta/fotos.mjs:124-170` | Elegir la foto, detectar marca de agua de otro medio y menores | Gemini con imágenes; si falla, Groq `qwen/qwen3.8-27b` | 3.659 (+ la lista de candidatas) | Hasta 10 notas por corrida (`web/scripts/fotos-notas.mjs:20`), o sea hasta ~480 por día |
| 16 | "Persona pública" (para buscar foto libre en Wikimedia) | `ingesta/fotos.mjs:328-337` | ¿La nota es sobre una sola persona conocida? | Gemini | ~600 | Una vez por nota sin foto de las fuentes |
| 17 | Pistas: consultas `INSTRUCCION_CONSULTAS` | `ingesta/pistas.mjs:52-54` | Sacar la afirmación y 3 búsquedas de un dato pegado | Gemini | 452 | Por cada pista nueva |
| 18 | Pistas: matices `INSTRUCCION_MATICES` | `ingesta/pistas.mjs:161-162` | ¿Los títulos de los medios confirman o la afirmación exagera? | Gemini | 630 | Por cada pista con medios; se revisan cada 3 h |
| 19 | Estilo de la voz (base + mañana/tarde/noche, en inglés) | `CRITERIO-REDES.md:329, 335, 341, 347` (se arma en `redes/prompt-redes.mjs:138`) | Cómo suena la locutora o el locutor | `gemini-3.8-flash-tts` | 119 + hasta 58 | **10 audios por día** (cupo de la clave) |

**Fuera de la cuenta** (existen, pero no son criterio editorial):
- `reels/auditar-voz.mjs:33-34` (354 caracteres): pide transcribir un audio literal para controlar "punto com". No decide nada editorial.
- `pruebas-modelos/probar.mjs:56` (≈1.250) y `:71` (≈545): **copias abreviadas** de los bloques 10 y 12, hechas para probar otros modelos. Si cambia el criterio, estas copias quedan viejas.
- `CRITERIO-REDES.md` (23.830 caracteres) es otro documento "único", pero no es un prompt de notas: sólo se lee tal cual la parte de las voces (bloque 19). `CRITERIO-EDITORIAL.md` entero mide 80.472 caracteres; a la IA sólo le llegan 20.606 (25 %).
- Lo que **no** se le dice a ninguna IA pero decide casi todo: el semáforo (`REGLAS_SEMAFORO`, `ingesta/fuentes.mjs:1054…`), el cruce de medios (`ingesta/cruce.mjs`), los cupos y los puntajes (`ingesta/criterio.mjs`, `ingesta/ingesta.mjs`). Son listas de palabras y números en el código.

**Dato de fondo.** Sólo el bloque 11 (perfil) sabe qué es Balcarce, y sólo lo recibe la lectura. El redactor, el auditor, el editor de fotos y las parejas no lo reciben. El auditor decide "sección equivocada" con la lista de nombres de secciones pero **sin** la definición de cada una (que está sólo en el bloque 10).

---

## 2. Por tema: dónde se dice cada regla y si los lugares coinciden

Leyenda: **Sí** = coinciden. **Parcial** = dicen casi lo mismo pero con diferencias que cambian un caso. **No** = se contradicen (ver sección 3, "C-n").

### 2.1 Las 11 secciones y qué va en cada una

Las 11: Balcarce, Política, Policiales, Fútbol, Deportes, Automovilismo, Agro, Economía, Cultura y agenda, Tecnología, Argentina.

| Dónde está la lista / definición | Qué dice |
|---|---|
| `CRITERIO-EDITORIAL.md:111-130` | La lista y sólo si "sale sola". **No define qué entra en cada una.** Dice que no hay Servicios, Región ni Provincia; "los cortes, trámites y obras de acá van a Balcarce"; Policiales sólo de Balcarce y la zona |
| `ingesta/lectura-ia.mjs:81-92` | **La única definición completa**, una línea por sección (ej.: Balcarce "y también lo práctico para el vecino: cortes de luz o agua, trámites, horarios…"; Argentina "lo nacional que no entra en ninguna de las anteriores (sociedad, clima, salud, educación, grandes hechos)") |
| `ingesta/lectura-ia.mjs:40-41` y `ingesta/auditoria-ia.mjs:17-18` | La lista de nombres, escrita **dos veces** en el código (más `web/lib/datos.js` y `web/public/panel/github.js`, según `CLAUDE.md:178`) |
| `docs/03-SELECCION.md:41-77` | Cómo clasifica el **código** (palabras): Automovilismo gana siempre, palabras débiles, Fútbol aparte |
| `PENDIENTES.md:139, 150` | Hernán decidió el 5/10 "quedamos en 15 secciones" y renombrar Tecnología a "Ciencia y tecnología". El código y las instrucciones siguen en 11 |

**¿Coinciden? Parcial.** Hay dos sistemas que eligen la sección (palabras en el código y la IA de lectura) y la IA manda al final. Las definiciones sólo existen en el prompt de lectura. Ver C-13 y C-14.

### 2.2 Qué es "de Balcarce" y qué es "la zona"

| Dónde | Qué dice |
|---|---|
| `CRITERIO-EDITORIAL.md:65-68` | "De acá" = lo que toca **la zona** ("la ruta 226, la 55, **Napaleofú, Los Pinos**, la papa"); si no, un medio de Balcarce o Balcarce **en el título**. Nombrarla en el texto no alcanza |
| `CRITERIO-EDITORIAL.md:129-131` | Policiales: "el partido, Napaleofú, Los Pinos, Ramos Otero y las rutas 226 y 55 **dentro del partido**" |
| `ingesta/perfil-balcarce.md:13-16` | Localidades del partido: Balcarce, Napaleofú, Ramos Otero, **San Agustín**, Los Pinos, **Villa Laguna La Brava**. Rutas 226 y 55 "cruzan el partido" |
| `ingesta/perfil-balcarce.md:46-53` | Qué NO es de Balcarce: otro país, otra ciudad, "otra ciudad del sudeste (ej. Copetonas)", "lo nacional que no cambia nada concreto" |
| `ingesta/lectura-ia.mjs:73-79` | Ámbito = el del hecho, no el del medio; mencionar Balcarce en una lista no la hace de Balcarce |
| `ingesta/fuentes.mjs:856-861` (`PALABRAS_LOCALES`) | Lo que el **código** reconoce como Balcarce: balcarce, balcarceño/a, napaleofú, ramos otero, laguna la brava, sierras de balcarce, inta balcarce, partido de balcarce, autódromo juan manuel fangio, museo fangio. **No están Los Pinos ni San Agustín** (comentario 846-849: "colarlos hacía que Radar tomara por locales notas de fútbol europeo") |
| `ingesta/fuentes.mjs:869-873` (`PALABRAS_ZONA`) | "Zona" para el código = ruta 226, ruta 55 (cualquier tramo) y frases de cultivo de papa |
| `ingesta/ingesta.mjs:539-543` (`esDeAca`) | La definición real: zona (siempre sí) → si la IA dijo que no es de Balcarce, no → medio de acá o Balcarce en el título |

**¿Coinciden? No** (C-5). El documento dice una zona que el código no tiene (Los Pinos, "dentro del partido").

### 2.3 Menores y víctimas

| Dónde | Qué dice |
|---|---|
| `CRITERIO-EDITORIAL.md:159` | "Nada que identifique a un menor ni a una víctima de un delito sexual o de violencia de género" (nombre, apodo, iniciales, escuela, domicilio, parentesco, foto, descripción) |
| `CRITERIO-EDITORIAL.md:146-148` | Fotos: "Nunca la foto de un menor o de una víctima, ni en Policiales, salvo una foto oficial de Bomberos o la Policía" |
| Prompt redactor, regla 13 (`CRITERIO-EDITORIAL.md:883`) | Ni a un menor (**"sea víctima, acusado o testigo"**) ni a una víctima de delito sexual o de género |
| Prompt redactor, cierre (`:903`) | Se repite "ningún menor ni víctima identificable" |
| `ingesta/auditoria-ia.mjs:70` | "Sensible": menor o víctima de delito sexual o género, **o "un dato personal que no debería"** (no se define cuál) |
| `ingesta/fotos.mjs:150-153` | Foto: quien "parezca menor de 18" y se lo reconozca; en la duda, menor = sí. "Nunca publica la foto de un menor", sin excepción oficial |
| `ingesta/fuentes.mjs:1054-1100` (semáforo) | Rojo: lista de frases (menor de edad, abuso sexual…). Amarillo: niño, nene, adolescente, "un menor de", "alumno de"…; `ingesta/menores.mjs`: menor de 18 por edad |
| `CRITERIO-REDES.md:234` | Repasos y piezas: "nunca identifica a un menor ni a una víctima" |

**¿Coinciden? Parcial.** El prompt es más duro que el documento (cualquier menor, aunque sea un campeón juvenil o testigo), el semáforo lo trata como "esperar a una persona" y no como prohibición, y la excepción oficial de las fotos no está en el prompt de fotos. Ver C-15.

### 2.4 Publicidad

| Dónde | Qué dice |
|---|---|
| `ingesta/lectura-ia.mjs:93` | `es_publicidad`: "promociona un comercio, producto o servicio sin ser noticia" → **se saca** (y pierde la página) |
| `ingesta/fuentes.mjs` (`promocional`, ~1138) y `CRITERIO-EDITORIAL.md:167` | "Parece promoción y no noticia (sorteos, ganá tu entrada)": **no se bloquea, nunca sale sola** (amarillo) |
| `docs/03-SELECCION.md:110` | Igual: amarillo "parece promoción, no noticia" |

**¿Coinciden? Parcial.** Son dos cosas distintas con nombres parecidos ("publicidad" se saca, "promoción" espera) y nadie dice dónde está el límite. Ver valor sin definir V-7.

### 2.5 Chimento / farándula

| Dónde | Qué dice |
|---|---|
| `ingesta/lectura-ia.mjs:94` | `es_chimento`: "farándula o la vida privada de famosos (romances, casamientos, separaciones, peleas, internaciones, fiestas o viajes de gente de la tele, la música o las redes). La muerte de una figura, un premio, un estreno o una obra no son chimento" → se saca |
| `CRITERIO-EDITORIAL.md:59-61, 92-93` | "Los medios de España y de chimentos están apagados"; la lectura saca los chimentos. No hay definición propia |
| `ingesta/criterio.mjs:216-218` | Comentario: Cultura y agenda baja su cupo "con los espectáculos de los diarios nacionales… la farándula" (o sea, se supone que algo de farándula entra) |

**¿Coinciden? Parcial.** "Farándula" y "chimento" se usan como sinónimos pero la definición sólo cubre la vida privada. Una gala de premios, un programa de TV o un debut musical quedan a criterio de la IA.

### 2.6 Lo del exterior / extranjero

| Dónde | Qué dice |
|---|---|
| `CRITERIO-EDITORIAL.md:55-61` | No se trae lo que el medio pone en sección de otro país; entra sólo con conexión argentina en el título **"o es automovilismo"** |
| `CRITERIO-EDITORIAL.md:162` | Fila de "no entra nunca": "Lo de otros países sin conexión argentina (Trump, Gaza, Ucrania…, sólo en el título)" |
| `ingesta/fuentes.mjs:883-901` | La lista de secciones que no entran (con excepción: figura, conexión argentina o automovilismo) |
| `ingesta/fuentes.mjs:917-918` | "Conexión argentina" = argentina, argentino/a/s, **milei, malvinas, boca, river** (sólo en el título) |
| `ingesta/lectura-ia.mjs:75, 390-393` | "Lo que hace el gobierno argentino en el exterior es nacional"; se saca si ámbito internacional y no hay figura ni conexión. Comentario 391-392: "La Fórmula 1 sin un argentino, no" |
| `ingesta/lectura-ia.mjs:322-323` | El comentario de cabecera dice lo contrario: "lo del extranjero **que no es automovilismo**…" |
| `ingesta/perfil-balcarce.md:36-38, 47` | Fórmula 1 interesa "con un piloto argentino"; otro país sólo con conexión argentina directa |
| `docs/03-SELECCION.md:235-237` | "La Fórmula 1 sin un argentino, no" |
| `CRITERIO-EDITORIAL.md:675` | A las redes: "del automovilismo de afuera, sólo lo que nombra a una figura argentina" |

**¿Coinciden? No** (C-6): hay tres versiones sobre la Fórmula 1 sin argentino.

### 2.7 "El mismo hecho" (duplicadas)

Hay **cuatro mecanismos**, con números distintos, y dos de ellos son prompts:

| Mecanismo | Dónde | Regla |
|---|---|---|
| Cruce por palabras | `ingesta/cruce.mjs:21-27` | Parecido 0,42, memoria de 36 h. "Dos notas del mismo medio no se juntan entre sí" (línea 43-45) |
| Repetidas por título | `web/lib/repetidas.js:46-51` | Parecido 0,8, hasta 96 h. Queda: la que fue a redes, la de foto, la que tiene cuerpo, la más vieja (`:59-65`) |
| Parejas sospechosas (IA) | `ingesta/lectura-ia.mjs:435-439`, `web/lib/repetidas.js:167-179` | Parecido desde 0,3, hasta 72 h. "NO es el mismo hecho si… un anuncio y su resultado, o si cambia la persona, el lugar, la fecha o la cifra principal. **Ante la duda, mismo = false**" |
| Repetidas (IA) | `ingesta/lectura-ia.mjs:505-508` | "Agrupá SOLAMENTE las que cuentan exactamente el mismo hecho… NO agrupes notas distintas sobre el mismo tema". **Sin** "ante la duda", sin "anuncio vs resultado" |
| Documento | `CRITERIO-EDITORIAL.md:95-107` | "Una noticia, una nota… No se juntan notas distintas del mismo tema (dos prácticas del TC son dos notas). Queda: la ya publicada, la que puede salir sola, la que cuentan más medios, la de más puntaje" |

**¿Coinciden? Parcial.** La idea es la misma pero (a) los dos prompts no dicen lo mismo, (b) los tres sistemas eligen "la que queda" con orden distinto (C-12), y (c) los dos prompts hablan de "un medio de Balcarce" (`:435`, `:505`) cuando se refieren a Radar Balcarce; un modelo puede leerlo como "notas de un medio local".

### 2.8 Impacto / importancia

| Dónde | Qué dice |
|---|---|
| `ingesta/lectura-ia.mjs:79` | `impacto_balcarce`: directo / indirecto / nulo (definido en una línea) |
| `ingesta/lectura-ia.mjs:80` | `razon`: local, servicio, actividad, provincia, nacional ("noticia nacional **importante**"), popular ("tema del que habla todo el país"), ninguna |
| `ingesta/lectura-ia.mjs:45, 143` | `importancia`: alta / media / baja. **El prompt nunca la define.** |
| `ingesta/lectura-ia.mjs:383-384` | Para qué sirve en el código: `nacionalQueImporta` = 3 medios o más, **o importancia "alta"**, o razón nacional/popular/servicio. Evita que se saque por "no tiene relación con Balcarce" |
| `ingesta/ingesta.mjs` (`relevancia()`) y `docs/03-SELECCION.md:79-97` | Otro "importancia" distinto: el **puntaje 0 a 100** (peso de la fuente, +25 si es de Balcarce, frescura, medios…). Sólo ordena |
| `ingesta/auditoria-ia.mjs:29, 74` | `gravedad` alta/media/baja (de un hallazgo) |
| `CRITERIO-EDITORIAL.md:411, 472-483` | `nivel` ALTA/MEDIA/BAJA (de verificación) |

**Hay tres escalas "alta/media/baja" y un puntaje numérico, y ninguna está definida para la IA.** Ver V-1.

### 2.9 Cómo se atribuye a las fuentes y el nombre del medio

| Dónde | Qué dice |
|---|---|
| `CRITERIO-EDITORIAL.md:440-445` | Cada dato se atribuye; fuente primaria antes que el medio que lo reprodujo; oficial primero; "en el cuerpo se puede nombrar la fuente en general, **nunca el nombre del medio**" |
| Prompt redactor: paso D (`:857`), G (`:860`), regla 8 (`:878`), regla 16 (`:886`) | Lo mismo en cuatro lugares; regla 16: con una sola fuente "según un medio local" |
| `CRITERIO-EDITORIAL.md:166` | "El nombre del medio de origen en el título, el guion, las placas o las redes" no entra |
| `ingesta/verificar.mjs:820-866` | **El verificador sólo controla el nombre del medio en el texto para redes** (y deja pasar un organismo oficial). En título, bajada, cuerpo y guion no lo controla |
| `panel/nota-de-pista.mjs:12` | Para las pistas: **"atribuí cada dato al medio que lo dijo"** |
| `CRITERIO-REDES.md:229-231` | Las redes nunca nombran la fuente |
| `reels/reescritura.mjs:238-243` | Al redactor se le pasa el nombre de cada medio ("Fuente 1 (Diario La Vanguardia…)") y se le prohíbe usarlo |

**¿Coinciden? No** (C-8): la nota de pista contradice la regla 8.

### 2.10 Fechas y tiempos verbales

| Dónde | Qué dice |
|---|---|
| Prompt regla 2 / criterio `:204-211` | **Título en presente**, aunque el hecho haya pasado |
| Prompt regla 14 / criterio `:299-309` | **Cuerpo** según cuándo pasó: pasado si ya pasó, futuro o con el día si no. "El presente del título no pasa al cuerpo" |
| Prompt regla 11 / criterio `:453-461` | Nunca "ayer / hoy / mañana" si la fuente no dice el día; nunca "este sábado / este lunes / este fin de semana" |
| `ingesta/verificar.mjs:604-657` (`arreglarEscritura`) | Código: cambia "este X" por "el X" **sólo si hoy no es ese día**; "ayer/hoy/mañana" **no se controla** |
| `reels/reescritura.mjs:132-140, 236` | A la IA se le pasa la fecha de hoy y la de cada fuente con el día de la semana |
| `web/lib/notas-propias.js:191` (nota del dólar) | El título propio dice "cotiza a $1.560 **este viernes 25**" |

**¿Coinciden? Parcial** (C-16, C-10).

### 2.11 Títulos (largo, presente, etiquetas)

| Punto | Prompt (`:866`) | Documento (`:202-243`) | Verificador / código |
|---|---|---|---|
| Largo | unos 70, nunca más de 90 | igual | `TITULO.maximo` 90 (`criterio.mjs:18-21`) |
| Presente | sí, y ejemplos | sí | rechaza "-ó", "-aron", "fue/hizo/dijo…" (`verificar.mjs:493-530`) |
| Etiqueta con dos puntos | prohibida ("Rugby:", "Exclusivo:", "Balcarce:") | prohibida | las **conocidas** se sacan solas (`web/lib/titulos.js`); una desconocida (puede ser un lugar) se rechaza |
| "en Balcarce" al final | prohibido | prohibido | se saca solo (`sinBalcarceAlFinal`) |
| Sin verbo / cortado | prohibido | prohibido | rechazado |
| ¡! ¿? ganchos | prohibidos | prohibidos | rechazados |
| "En vivo" | "ni en el título ni en la bajada" | título, bajada, guion y redes | título, bajada, guion y texto para redes (`:674`) |

**¿Coinciden? Sí**, con una nota: el prompt dice "título y bajada", el documento y el control cubren cuatro campos (C-17, menor).

### 2.12 Tono

| Dónde | Qué dice |
|---|---|
| `CRITERIO-EDITORIAL.md:383-386` | De todos los días: "rioplatense neutro y cercano, tercera persona, sin voseo… **Se lee liviano**, como una novedad del pueblo bien contada" |
| `CRITERIO-EDITORIAL.md:914` (lo que lee la IA) | "…no es escribir **'liviano' o 'con calidez'**, es contar el dato justo. Ni solemne ni canchero" |
| `CRITERIO-EDITORIAL.md:387-389, 920` | Serio: "sobrio e institucional, sin calidez ni color" |
| `CRITERIO-REDES.md:56` | Voz: "**cálida y cercana**, rioplatense sin exagerar… como quien le cuenta algo a un vecino" y usa voseo ("Guardá el dato", "salí abrigado") |
| `reels/reescritura.mjs:74-78` | Código: serio si Policiales o si el título/resumen **contiene** una de las 22 palabras (búsqueda de texto, no palabra entera: "robo" encuentra "robot") |

**¿Coinciden? No** (C-1).

### 2.13 Copiar y citas

| Dónde | Qué dice |
|---|---|
| Prompt regla 1 (`:865`) | "Nunca **más de diez** palabras seguidas iguales", ni en el título ni dentro de una cita; la cita tiene **diez** como mucho |
| `CRITERIO-EDITORIAL.md:287, 501, 768` | Cita de diez como mucho; el verificador rechaza **más de 12**; la tabla de números sólo trae el 12 |
| `docs/04-REDACCION.md:132-134, 254` | "El verificador rechaza desde 13… la instrucción pide diez, **para tener margen**" |
| `ingesta/verificar.mjs:747, 851` | Sólo controla el 12. **El largo de una cita (10) no se controla en ningún lado** |

**¿Coinciden? Parcial** (C-7): el margen es intencional pero está explicado sólo en `docs/04`, no en el criterio, y el 10 no está en la tabla de números.

### 2.14 "En vivo"

Prompt regla 2 (`:866`), documento `:164, 504, 612`, verificador `verificar.mjs:411-420, 674-684` ("música en vivo" sí), `CRITERIO-REDES.md:83, 231`, `docs/03-SELECCION.md:366` (se retiran las páginas viejas). **Coinciden** salvo qué campos cubre cada uno (C-17).

### 2.15 Cotización del dólar

| Dónde | Qué dice |
|---|---|
| `CRITERIO-EDITORIAL.md:161` | Está en la tabla **"Lo que no entra nunca"** |
| `CRITERIO-EDITORIAL.md:180`, `docs/03-SELECCION.md:108`, `CLAUDE.md:71-72` | Amarillo: "espera a una persona" / "no sale sola" |
| `CRITERIO-EDITORIAL.md:641-646` | El sitio arma su propia nota si el dólar se mueve 2 % o más, desde las 11 |
| `ingesta/lectura-ia.mjs:88` | Economía incluye "dólar" |
| Prompt redactor | No dice nada del dólar |

**¿Coinciden? Parcial** (C-10): "nunca" contra "espera a una persona".

---

## 3. Contradicciones (las más graves primero)

Para cada una: lado A, lado B, y cuál es lo correcto **según el código**.

**C-1. El tono: "liviano" contra "no es liviano".**
- A: "Se lee liviano, como una novedad del pueblo bien contada" (`CRITERIO-EDITORIAL.md:384-385`, sección 4, la que leen las personas).
- B: "no es escribir 'liviano' o 'con calidez', es contar el dato justo" (`CRITERIO-EDITORIAL.md:914`, lo que lee la IA).
- Correcto: **B**. La IA sólo recibe el bloque 914 (`ingesta/prompt-editorial.mjs`, `reels/reescritura.mjs:87`). La sección 4 es lo que las personas creen que se le pide. Además `CRITERIO-REDES.md:56` pide "cálida" para las voces (otro canal, pero no está aclarado).

**C-2. Fotos: en la duda de un logo, ¿se usa o no se usa?**
- A: "los medios chicos de la zona suelen pegar su logo… **con la mínima duda, esa foto no se usa**" (`CRITERIO-EDITORIAL.md:143-144`).
- B: "Si dudás si un logo es del medio o de la escena, pensá: ¿podría estar en una foto que sacó cualquier otra persona…? Si sí, **no es 'tiene_marca'**" (`ingesta/fotos.mjs:140-142`).
- Correcto: **B**. El código sólo descarta una foto si la IA le puso `tiene_marca: true` (`fotos.mjs:198-204`). En la duda sobre un logo el prompt tira hacia usar la foto; sólo en la duda sobre un menor tira hacia no usarla (`fotos.mjs:152-153`). El documento pide lo contrario.

**C-3. Lo rojo: "nunca, ni aprobada" contra "si lo reescribe una persona, sale".**
- A: "Rojo: No se publica nunca, ni por error" (`CRITERIO-EDITORIAL.md:179`); "No se publica nunca, ni aprobada" (`docs/03-SELECCION.md:23`).
- B: "Si la persona la reescribió y el texto ya no toca la lista, sí puede salir" (`docs/10-REGLAS-Y-PRUEBAS.md:223`, regla 119; código `web/scripts/generar-datos.mjs:439, 559`).
- Correcto: **B**. Y la regla 118 (`docs/10-REGLAS-Y-PRUEBAS.md:222`) dice otra cosa más: "lo único que no sale nunca es el aviso fúnebre". Hay tres versiones de "nunca". El criterio dice "Actualizado el 29/09" y no incorpora lo del 8/10 (reglas 118, 119). Además `CRITERIO-EDITORIAL.md:168` habla de "listas de sepelios" y el semáforo ya frena también "necrológica", "obituario", "cochería" (`fuentes.mjs`, `nunca`).

**C-4. Acusaciones: el documento dice "siempre espera", el código suelta algunas.**
- A: Amarillo cuando "acusa a alguien (denuncia, detenido, imputado)" (`CRITERIO-EDITORIAL.md:180`).
- B: En lo de acá, "denuncia" suelto ya no frena y "detenido/acusado/imputado" no frenan si la noticia es oficial o la cuentan dos medios (`docs/10-REGLAS-Y-PRUEBAS.md:200`, regla 96; `ingesta/fuentes.mjs:1210-1211`).
- Correcto: **B** (decisión de Hernán del 2/10 que el criterio no recogió).

**C-5. La zona: el documento dice una y el código otra.**
- A: "toca la zona (la ruta 226, la 55, Napaleofú, Los Pinos, la papa)" (`CRITERIO-EDITORIAL.md:65-66`) y Policiales "…las rutas 226 y 55 **dentro del partido**" (`:129-131`).
- B: `PALABRAS_ZONA` sólo trae rutas 226/55 (en **cualquier tramo**) y frases de papa (`ingesta/fuentes.mjs:869-873`); `PALABRAS_LOCALES` no trae Los Pinos ni San Agustín (`:856-861`) y las trata como "local" (sólo con aparecer en el título), no como "zona". `tocaLaZona` (`ingesta/ingesta.mjs:510-513`) no mira el tramo.
- Correcto: **B**. La ruta 226 sigue hasta Olavarría y más allá: hoy una nota con "ruta 226" de otro partido sale sola con un solo medio y no ocupa cupo. El perfil de la IA (`perfil-balcarce.md:13-16`) nombra seis localidades; el criterio nombra tres (Napaleofú, Los Pinos, Ramos Otero) y el código reconoce otras tres (Napaleofú, Ramos Otero, Laguna La Brava): sólo Napaleofú y Ramos Otero coinciden en los tres lugares.

**C-6. Fórmula 1 / automovilismo de afuera: tres versiones.**
- A: Automovilismo de afuera entra: sección de otro país "o es automovilismo" (`CRITERIO-EDITORIAL.md:60-61`); "las mejores de la F1 siguen saliendo" (`ingesta/criterio.mjs:199-203`, que además le da cupo propio de 6); comentario de cabecera "lo del extranjero **que no es automovilismo**" (`ingesta/lectura-ia.mjs:322-323`).
- B: "La Fórmula 1 sin un argentino, no" (`ingesta/lectura-ia.mjs:390-393`, `docs/03-SELECCION.md:235-237`, `perfil-balcarce.md:36-38`).
- Correcto: **B** en la parte de la lectura con IA: la excepción `deFierros` sólo protege contra "no tiene relación con Balcarce", no contra "es del extranjero" (`lectura-ia.mjs:393-397`). Pero el filtro de secciones deja entrar el automovilismo de otro país (`fuentes.mjs:886-888`), así que depende de lo que conteste la IA para cada nota. El cupo de 6 para "F1 de afuera" supone algo que la IA después puede sacar.

**C-7. Copiar: 10 contra 12 palabras.**
- A: "nunca más de diez palabras seguidas" (prompt `:865`).
- B: "copiar más de 12 palabras seguidas" rechaza (`CRITERIO-EDITORIAL.md:501`; tabla de números `:768`; `verificar.mjs:747, 851`).
- Correcto: **ambos**, a propósito (margen de 2), pero el margen sólo se explica en `docs/04-REDACCION.md:254`. En la tabla de números no figura el 10. Y la regla "una cita de diez palabras como mucho" no la controla nadie.

**C-8. Nombre del medio: la nota de pista lo manda, la regla 8 lo prohíbe.**
- A: "atribuí cada dato al medio que lo dijo" (`panel/nota-de-pista.mjs:12`).
- B: "nunca citar el nombre del medio que la publicó" (prompt regla 8, `:878`; criterio `:444`).
- Correcto: **B** (es la regla del criterio), pero el pedido de pista va *después* de las reglas y la IA tiende a obedecer lo último. Y en el cuerpo, el título y el guion **el verificador no controla el nombre del medio** (`verificar.mjs:865`, sólo texto para redes), así que nada lo frena.

**C-9. Cuatro definiciones de verificación BAJA.**
- Documento (`:479`): "un solo medio y la nota se apoya en una denuncia o una acusación (denuncia, acusó, habría, presunto…), o lo que falta confirmar toca el hecho central".
- Nota del panel (`:951-953`): "se apoya en una denuncia **o en una declaración de parte**".
- Lo que se le pide a la IA como sugerencia (`:901`): "información preliminar, declaraciones de parte sin verificar o evidencia insuficiente".
- Código (`reels/reescritura.mjs:587, 646-653`): un patrón de palabras (denuncia, acusa, habría, presunto, supuesto, "según trascendió/fuentes/testigos…"); una opinión citada ("aseguró que") **no** baja el nivel.
- Correcto: **el código**. "Declaración de parte" (que el paso B del prompt define como lo que afirma un funcionario sobre su gestión o un club sobre su equipo) **no** hace BAJA, aunque dos textos lo sugieran. El nivel que sugiere la IA se descarta.

**C-10. El dólar: "no entra nunca" contra "espera a una persona", y el título propio usa "este viernes".**
- A: fila de "Lo que no entra nunca" (`CRITERIO-EDITORIAL.md:161`).
- B: amarillo, o sea sale si una persona la aprueba (`:180`, `docs/03-SELECCION.md:108`, `CLAUDE.md:71-72`).
- Correcto: **B** (`REGLAS_SEMAFORO.cotizacion` es amarillo).
- Aparte, la plantilla del sitio escribe "El dólar blue cotiza a $1.560 **este viernes 25**" (`web/lib/notas-propias.js:191`, y el ejemplo en `CRITERIO-EDITORIAL.md:644`) mientras la regla dice "Nunca 'este sábado', 'este viernes'" (`:303-304`). La plantilla no pasa por la IA ni por el arreglo automático.

**C-11. Cuerpo: se pide 70, se publica con 70, y se dice "nunca más largo que los datos".**
- A: "Va de 70 a 180 palabras… Si las fuentes dan poco, la nota es corta: 70 palabras bien escritas valen más que 180 con relleno" (prompt `:868`).
- B: "Con menos de 70 no se publica" (`CRITERIO-EDITORIAL.md:272-274`; `ingesta/criterio.mjs:35-41`; `web/lib/cuerpo.js`).
- Correcto: ambos, pero el mínimo que se le pide es igual al mínimo que se acepta: cualquier cuerpo de 68 o 69 palabras se rechaza. Y el techo de 180 no lo controla nadie (el control es por caracteres: 1.800, `verificar.mjs:267`). La frase "nunca más largo que los datos" convive con la regla 21 ("TODOS los datos prácticos") y la 20 (contexto, antecedente, qué sigue) en 70 palabras. No hay una prioridad dicha.

**C-12. Qué nota "queda" entre repetidas: tres órdenes.**
- A: "Queda, en este orden, la que ya está publicada, la que puede salir sola, la que cuentan más medios y la de más puntaje" (`CRITERIO-EDITORIAL.md:98-99`, `lectura-ia.mjs:573-581, 594`).
- B: "la que fue a las redes, la que tiene foto, la que tiene cuerpo, la primera que salió" (`web/lib/repetidas.js:55-65`).
- Correcto: **los dos**, en etapas distintas (el A cuando se juntan antes de publicar; el B para dos páginas ya publicadas). El criterio presenta una sola regla.

**C-13. Secciones: 11 en todos lados, pero Hernán ya decidió 15.**
- A: "Las secciones son once" (`CLAUDE.md:109`, `CRITERIO-EDITORIAL.md:111-124`, `lectura-ia.mjs:40-41`, `auditoria-ia.mjs:17-18`).
- B: "Quedamos en 15 secciones" y "Renombrar Tecnología a Ciencia y tecnología" (`PENDIENTES.md:139, 150`).
- Correcto: **A** (es lo que hace el código hoy). Pero la decisión está tomada sin bajar a las instrucciones: la lista está escrita en cuatro archivos distintos.

**C-14. El clima: "no es nota" contra "va en Argentina o en Agro".**
- A: "la farmacia, el clima y el dólar son servicios del sitio, no notas" (`CRITERIO-EDITORIAL.md:127-128`).
- B: Argentina incluye "clima" (`lectura-ia.mjs:92`); Agro incluye "clima para el productor" (`:89`).
- Correcto: **B** (no hay ninguna regla en el código que frene una nota del clima).

**C-15. Menores: absoluto, relativo o con excepción.**
- A: el prompt prohíbe identificar a cualquier menor, "sea víctima, acusado o testigo" (`CRITERIO-EDITORIAL.md:883`); la foto: "nunca publica la foto de un menor" (`fotos.mjs:151`).
- B: el documento habla de "un menor **ni** una víctima de un delito sexual o de violencia de género" (`:159`, se puede leer como "menor víctima de…"); el semáforo trata a un chico como amarillo, o sea que una persona puede aprobar la nota (`docs/03-SELECCION.md:107`); las fotos: "salvo una foto oficial de Bomberos o la Policía" (`:148`).
- Correcto: para el texto escrito por la IA vale A (la IA nunca lo nombra); la aprobación humana es una red de seguridad aparte. No hay una regla dicha para el caso común "joven campeón / alumno premiado con nombre".

**C-16. Fechas relativas: absoluto en el prompt, parcial en el código.**
- A: "Tampoco 'este lunes', 'este sábado' ni 'este fin de semana'" (prompt regla 11, `:881`).
- B: el código sólo cambia "este X" por "el X" si hoy no es X (`verificar.mjs:650-657`); un "este sábado" escrito un sábado queda. "Ayer/hoy/mañana" no se controla.
- Correcto: **B** en la práctica. Chico, pero el prompt dice más de lo que se hace cumplir.

**C-17. "En vivo": el prompt cubre dos campos, el control cuatro.**
- A: "ni en el título ni en la bajada" (prompt `:866`).
- B: título, bajada, guion y texto para redes (`CRITERIO-EDITORIAL.md:164`; `verificar.mjs:674`).
- Correcto: **B**. Chico.

**C-18. Hashtags: ¿salen de las "etiquetas" de la IA o son fijos?**
- A: etiquetas "van a Google y dos o tres como hashtags en Facebook" (`CRITERIO-EDITORIAL.md:410`).
- B: "hasta tres hashtags (`#Balcarce` si es de acá)" y el ejemplo "#Balcarce #Fútbol" (`CRITERIO-REDES.md:174-185`).
- Correcto: no se puede decir sin leer `redes/` (fuera del alcance). Hay que decidirlo.

**C-19. De dónde sale una foto: el criterio no lista todas las fuentes.**
- El criterio (`:134-136`) habla de foto propia, oficial o de otro medio. El código suma fotos libres de Wikimedia Commons (`ingesta/fotos.mjs:438-445`; regla 99) y, para notas propias, fotos libres del estadio. Además `PENDIENTES.md:60` (punto 19) describe una tercera versión del criterio ("propia, oficial o de stock, o ilustración"). Sin decisión.

**C-20. Fechas de "actualizado" que no coinciden con el contenido.**
- `CRITERIO-EDITORIAL.md:3`, `CLAUDE.md:3`, `docs/03` y `docs/04` dicen "Actualizado el 29/09/2026" pero el código ya incorpora reglas del 2/10 (96), 8/10 (118, 119, 108, 115, 116) y 3/10 (99–101). Cualquiera que lea el criterio cree que rige algo que ya cambió.

---

## 4. Reglas repetidas y texto que no cambia lo que se escribe

### 4.1 Cuántas veces se dice lo mismo

Las cuentas del redactor son de palabras clave sobre el prompt (20.171 caracteres); la columna de la derecha, sobre todo `CRITERIO-EDITORIAL.md` (80.472).

| Regla | En el prompt del redactor | Otros lugares donde también se dice |
|---|---|---|
| "Balcarce" (mención) | 24 veces | `perfil-balcarce.md`, 75 veces en el criterio entero |
| "Nunca" / prohibiciones | 36 veces | 91 en el criterio |
| Atribuir / condicional (acusaciones) | 15 (pasos B y D, regla 10, 16, cierre) | `verificar.mjs` (`acusacion`), `reescritura.mjs` (BAJA), criterio §2 §5 §6, `docs/04` |
| Título en presente / pasado | 14 (regla 2 la dice 4 veces; regla 14 otras 3) | criterio 30 veces, verificador `pasado` |
| Relleno, "sin dudas", cierres que valoran | 9 (reglas 4, 19, 20) | La lista de 26 frases está en **cuatro lugares** (prompt regla 19, `criterio.mjs:83-90`, criterio `:361-363`, verificador) y una prueba obliga a que digan lo mismo |
| "Este sábado", "ayer, hoy, mañana" | 6 + 9 (reglas 11 y 14, que se citan entre sí) | criterio `:303-306, 453-461`, `arreglarEscritura` |
| Fecha/dato inventado, "sólo con lo que recibiste" | 7 (intro, regla 4, 9, cierre, campo `datos`) | pegote 8 ("ÚNICAMENTE"), criterio §5, §6 |
| Nombre del medio | 5 (G, 8, textoRedes, aportes, regla 16 y lista de relleno "fuentes consultadas") | criterio `:166, 444`, `CRITERIO-REDES.md:229-231`, `PEDIDO_DE_PISTA` (al revés) |
| Menores y víctimas | 5 (regla 13, cierre, ejemplos en pedido de persona) | criterio `:159, 146-148`, auditoría, fotos, pistas, semáforo, `CRITERIO-REDES.md:234` = **8 lugares** |
| Copiar | 5 | criterio 14 |
| "En vivo" | 5 | criterio 18 |
| "El cuerpo no repite la bajada" | regla 3 y regla 4 (3 veces) | verificador (`repite`) |
| El guion es el título | regla 7 | criterio `:377`, `CRITERIO-REDES.md` |
| La lista de secciones | — | **4 listas** (lectura, auditoría, web, panel) más el criterio y `docs/03` |
| "Quién es Radar Balcarce" (frase de presentación) | 5 prompts empiezan con "Sos el editor/corrector de Radar Balcarce, un medio digital de Balcarce…", cada uno con una redacción distinta ("provincia de Buenos Aires, Argentina", "Buenos Aires", sin provincia) | — |
| Ciudades vecinas que "no son Balcarce" (Mar del Plata, Tandil, Necochea…) | — | `perfil-balcarce.md:18-23`, criterio `:73-77`, `fuentes.mjs` |

### 4.2 Reglas que existen sólo en el prompt (nadie las controla)

Conviene saberlo: si la IA las rompe, no pasa nada.
- Citas de diez palabras como máximo (regla 1).
- Bajada de dos o tres frases y unas 50 palabras; cuerpo hasta 180 palabras y hasta 3 párrafos (`BAJADA.frasesMinimas/frasesMaximas/palabras`, `CUERPO.palabrasPedidasMaximo`, `CUERPO.parrafosMaximo`, `GUION.segundos` están en `criterio.mjs:24-47`, la tabla los compara con el documento, pero **ningún código los usa**; el único control es 360 y 1.800 caracteres).
- "Más de dos comas, se parte la oración", voz activa, siglas explicadas, cargo de la persona la primera vez y "después por el apellido".
- "Si la fuente trae un dato de Balcarce, ESO va primero" (regla 17), "posturas enfrentadas" (regla 18), "los términos técnicos como los da la fuente" (regla 9). **No están en el documento de criterio, sólo en el prompt.**
- "Ayer, hoy, mañana" y "este lunes…" absolutos (C-16).

### 4.3 Reglas que existen sólo en el verificador (la IA no las conoce)

- Una negación ("no", "nunca", "sin") que la fuente no tiene, o una que desapareció (`verificar.mjs`, control `negacion`): el prompt no se lo dice.
- "mas" o "ms" por "más" (se cubre indirectamente con la regla 12).
- Que el título no tenga un arranque tipo "Preocupación por…" (el prompt lo dice con ejemplos).

### 4.4 Texto que se le pasa a la IA y no cambia lo que escribe

| Texto | Dónde | Por qué no cambia nada |
|---|---|---|
| Campo `nivel` (ALTA/MEDIA/BAJA) y su explicación (~330 caracteres) | prompt `:901` | El sistema lo calcula solo y la sugerencia de la IA "queda anotada, sin mandar" (`reescritura.mjs:630`, `docs/04:307`) |
| "(27/09, Hernán; el sistema igual lo saca si aparece)" | regla 2 (`:866`) | Historia interna, nada que la IA pueda aplicar |
| "…un texto sin tildes se rechaza" | regla 12 | La IA no ve el rechazo; igual sirve de refuerzo, pero no agrega regla |
| Las explicaciones legales ("Esto no es sólo estilo: es lo que protege a un medio de una demanda…", "lo exigen las leyes 26.061 y 26.485") | reglas 10 y 13 | No cambian la conducta pedida; son motivación |
| Nota aparte del panel (2.665 caracteres) | `:926-970` | No se manda a ninguna IA. Es la tercera copia de reglas de BAJA, semáforo, tono serio, cuerpo, tres intentos, y se va quedando vieja (C-9) |
| Campos de la ficha de lectura que no deciden nada | `lectura-ia.mjs:133-153` | `ambito` valores region/provincia/nacional, `razon` valores local/actividad/provincia/ninguna, `impacto` "indirecto" y `por_que_interesa` se guardan y se muestran en el panel (`panel/celular-datos.mjs:140-144`) pero no cambian ninguna decisión. Sólo deciden: ámbito balcarce/internacional, razón nacional/popular/servicio, impacto directo/nulo, importancia "alta" |
| "Sección: X" en el pedido del redactor | `reescritura.mjs:237` | Sólo cambia el tono si es Policiales. No hay ninguna regla de estilo por sección (resultados deportivos, Política, Cultura) |
| Lista de 22 palabras serias | criterio `:392` | Funciona por texto contenido, no por palabra entera ("robo" encuentra "robot"; "crisis" pone en tono serio una nota de Economía) |
| Copias en `pruebas-modelos/probar.mjs` | `:56, :71` | Para experimentos; si el criterio cambia, quedan viejas |

---

## 5. Valores sin definir o ambiguos que necesitan decisión de las personas

Cada uno con 2 o 3 opciones y una recomendación. Están ordenados por cuánto bloquean unificar el criterio.

**V-1. Qué es importancia alta / media / baja** (y qué es "nacional importante" y "popular").
Hoy: tres escalas distintas con el mismo nombre (importancia de la lectura, gravedad de la auditoría, nivel de verificación) y un puntaje de 0 a 100. El prompt de lectura nunca define `importancia` (`lectura-ia.mjs:45`), y el código sólo mira si es "alta".
- Opción A: **sacar el campo** de la lectura y dejar que "importa" lo diga la cantidad de medios (3 o más, que ya existe) más la razón (nacional/popular/servicio) con definiciones medibles.
- Opción B: definirlo en palabras: alta = cambia algo concreto en la vida de cualquier argentino (precio, tarifa, ley, feriado, elecciones) o lo cuentan 5 medios o más; media = 3 o 4 medios; baja = el resto.
- Opción C: usar el puntaje que ya calcula el sistema (por ejemplo 75 o más = alta) y no preguntárselo a la IA.
- **Recomiendo A**, con "popular" y "nacional" definidos por cantidad de medios. Menos texto y nadie tiene que adivinar.

**V-2. Qué es "la zona".**
- Opción A: sólo el partido de Balcarce (las seis localidades del perfil) y las rutas 226 y 55 **dentro** del partido.
- Opción B: lo de hoy: partido + rutas 226/55 enteras + frases de papa.
- Opción C: A más los partidos vecinos con vínculo concreto (Lobería, Ayacucho, Mar Chiquita) con trato de "región".
- **Recomiendo A**, con "papa" sólo cuando la nota la ubique en Balcarce o el sudeste papero (hoy cualquier "cosecha de papa" entra como zona). La ruta 226 llega hasta Olavarría: sin límite de tramo se cuelan notas de otros partidos.

**V-3. Los tres niveles: "de Balcarce", "de la zona", "de afuera".**
Hoy hay dos palabras ("de acá" y "zona") que se usan según el documento y tres campos para el mismo concepto (`local`, `deLaZona`, `nombraBalcarce`).
- Opción A: dos niveles (Balcarce incluye la zona, y afuera).
- Opción B: tres niveles con nombres fijos usados en todos los textos: **Balcarce** (el partido), **La zona** (lo que lo toca de afuera: rutas, la papa, vecinos inmediatos) y **De afuera**.
- **Recomiendo B**, con una definición única que se pegue igual en todos los prompts.

**V-4. Figura argentina.** Hoy es una lista cerrada (`FIGURAS`, `fuentes.mjs:1223…`) y la "conexión argentina" otra (`argentina, milei, malvinas, boca, river`). El criterio sólo dice "una figura argentina".
- Opción A: lista cerrada ampliable por personas (como hoy), publicada en el criterio.
- Opción B: definición para la IA ("un argentino que protagoniza un logro o un hecho de peso nacional") y que decida.
- Opción C: mixta: la IA propone y entra recién cuando una persona la suma a la lista.
- **Recomiendo A** y decidir si "Boca" y "River" (que hoy cuentan como conexión argentina en cualquier título, aunque sea "river" en inglés) siguen. Es la lista que menos sorpresas da.

**V-5. Fórmula 1 sin argentino** (C-6).
- Opción A: no entra (lo que hoy hace la lectura, `docs/03:235-237`).
- Opción B: entra con el cupo de 6 (lo que supone `criterio.mjs:197-203`).
- Opción C: sólo entran las notas propias armadas con datos (Jolpica, `ingesta/f1.mjs`) y no las de otros medios.
- **Recomiendo C**: las notas propias ya cubren resultados y horarios, y deja de depender del humor de la IA.

**V-6. Chimento y farándula.**
- Opción A: **chimento = vida privada y conflictos personales de famosos** (lo de hoy, con los ejemplos); espectáculos (estrenos, giras, premios, programas) van a Cultura y agenda.
- Opción B: sacar toda la farándula, incluso estrenos de programas de TV y galas.
- Opción C: dejar pasar la farándula pero con cupo (hoy 8 en Cultura).
- **Recomiendo A**, y agregarle 5 ejemplos de cada lado al prompt (hoy la IA decide por una lista de ejemplos de una línea).

**V-7. Publicidad contra promoción.**
- Opción A: publicidad = lo que paga o vende un comercio → se saca; promoción = sorteo o entrada de un evento → espera a una persona (lo de hoy, pero dicho en palabras y con ejemplos).
- Opción B: unir las dos en "promoción": siempre amarillo, sin sacar nada solo.
- **Recomiendo A.** Lo importante es que la lectura (que saca) y el semáforo (que espera) usen la misma frase.

**V-8. "El mismo hecho".**
- Opción A: mismo hecho = mismo suceso, misma persona principal, mismo día; un seguimiento con novedad (anuncio → resultado) es otra nota con antecedente.
- Opción B: una sola nota por historia que se va actualizando cuando suma un medio (lo que `PENDIENTES.md:104, 160` dejó para hablar).
- Opción C: dejarlo como hoy, con dos prompts distintos y tres umbrales (0,42 / 0,8 / 0,3).
- **Recomiendo A** con un único texto para las dos instrucciones (parejas y repetidas) y los umbrales anotados en el criterio. B se decide después, aparte.

**V-9. Tono serio: cuándo se usa.**
- Opción A: sólo Policiales y Política grave (por sección).
- Opción B: por palabra en el título (palabra entera, no "robot") como hoy, pero con la lista visible y revisada (hoy "crisis" y "conflicto" pueden poner serio a una nota de Economía o Deportes).
- Opción C: que lo decida la IA con tres ejemplos.
- **Recomiendo B** corrigiendo la búsqueda a palabra entera.

**V-10. Voseo y calidez según canal.**
Notas: tercera persona, "sin voseo" y "ni calidez" en lo serio. Redes: "cálida y cercana", con voseo ("Guardá el dato").
- Opción A: dejarlo así pero escrito: notas = informativas, redes = cercanas.
- Opción B: mismo registro en todo.
- **Recomiendo A**, dicho en una línea del bloque de estilo.

**V-11. Menores con nombre en nota positiva (deporte, escuela, premios).**
- Opción A: **nunca nombrar a un menor en lo automático**; si la nota lo necesita, la redacta una persona (lo que hoy dice el prompt, y el semáforo ya lo manda a esperar).
- Opción B: permitir nombre con fuente oficial o club/escuela en notas positivas y aprobación humana.
- Opción C: sólo iniciales (hoy prohibidas).
- **Recomiendo A.** Que además el criterio diga "víctima o acusado o testigo" como el prompt, para que el documento y la IA lean lo mismo, y que se aclare si la excepción de Bomberos/Policía en fotos alcanza a menores (hoy el prompt de fotos la desconoce).

**V-12. Tamaño del cuerpo y de la bajada.**
- Cuerpo. Opción A: pedir 90–180 y publicar desde 70 (margen real). Opción B: pedir 70–180 y publicar desde 60. Opción C: dejar igual. **Recomiendo A.**
- Bajada. Opción A: medirla sólo en caracteres (360, lo único que se controla). Opción B: frases (2–3). Opción C: palabras (50). **Recomiendo A**, y que el texto diga "hasta 360 caracteres (unas 55 palabras)".
- Techo de 180: o se controla por palabras o se saca del prompt.

**V-13. Copia y citas.** Opción A: dejar 10 para la IA y 12 para el control, pero declararlo en la tabla de números. Opción B: unificar en 12. Opción C: unificar en 10. Y decidir si se controla el largo de la cita (10). **Recomiendo A**; B si se quiere un solo número.

**V-14. Verificación BAJA.** Opción A: la del código (denuncia/acusación/"según trascendió"; la opinión citada no). Opción B: ampliarla a "declaración de parte" (lo que hoy dicen la nota del panel y el prompt de nivel). **Recomiendo A**: borrar "declaración de parte" de los textos que lo dicen, porque con B casi cualquier nota de un solo medio local quedaría frenada (ya pasó, `reescritura.mjs:582-586`).

**V-15. Nombre del medio en el cuerpo.** Opción A: nunca (criterio actual), y agregarle el control al verificador. Opción B: permitir el nombre de un medio cuando la nota lo cita como fuente y es una nota de pista (como hoy pide `PEDIDO_DE_PISTA`). **Recomiendo A** para todo y cambiar `PEDIDO_DE_PISTA` por "atribuí a la fuente en general".

**V-16. Clima y dólar como nota.** Opción A: las notas del clima de otros medios se descartan (el clima es un servicio del sitio); el dólar sólo lo arma el sitio. Opción B: entran como nota normal. **Recomiendo A**, y ponerlo en las instrucciones de lectura.

**V-17. Secciones: 11 hoy, 15 decididas.** Opción A: cerrar las 15 definiciones (nombre, qué entra, qué no) en un único bloque y recién después tocar el código. Opción B: seguir con 11 y sumar de a una (la propuesta de `PENDIENTES.md:149`). **Recomiendo A**: es el momento ideal porque la lista hoy está en cuatro archivos y las definiciones en uno solo.

**V-18. Relleno y clickbait.** `PENDIENTES.md:121` lo tiene como decisión pendiente número 1 ("hay que escribir el borrador con ejemplos"). Hoy son 26 frases fijas y 4 de gancho. Falta decidir si se hace por lista (como hoy) o por criterio con ejemplos. **Recomiendo** lista corta única (en un solo lugar) más tres ejemplos buenos y malos.

**V-19. Fuentes de fotos permitidas.** Hoy: foto de otro medio sin marca, oficial, libre de Wikimedia (no está en el criterio), placa. Opción A: sumar Wikimedia al criterio. Opción B: sacarla. **Recomiendo A**, con la regla de licencias de `docs/10:203`.

**V-20. Policiales de la zona y Política en la web.** `PENDIENTES.md:39, 124, 144`: ¿salen solas, se aprueban por bloques o se sueltan si las cuentan 2 medios? No se puede unificar el criterio de qué es "sensible" hasta que esto se decida.

---

## 6. Propuesta: un único documento de criterio, armado por bloques

**Idea.** Un solo archivo (`CRITERIO-EDITORIAL.md`) donde cada regla existe **una sola vez**, dentro de un bloque con nombre (`<!-- BLOQUE:xxx:INICIO -->`). Cada prompt se arma pidiendo la lista de bloques que necesita; nadie copia texto. Hoy ya existe el mecanismo (`ingesta/prompt-editorial.mjs` lee entre marcas): se amplía de "4 partes" a "N bloques" y se agrega una prueba que verifica (1) que cada bloque exista, (2) que ningún texto de prompt quede fuera del documento y (3) que cada número esté una sola vez.

### 6.1 Los bloques

| Bloque | Qué contiene (una vez) | Hoy está repartido en |
|---|---|---|
| **B0 Identidad** | Qué es Radar Balcarce, a quién le escribe, en dos frases | las 5 presentaciones distintas, criterio §1 |
| **B1 Glosario** | Definiciones únicas: *Balcarce*, *la zona*, *de afuera*, *medio*, *fuente oficial*, *figura argentina*, *mismo hecho*, *menor*, *víctima*, *hoy* | criterio §2 (partes), perfil, lectura, semáforo |
| **B2 Perfil de Balcarce** | Datos del lugar (localidades, rutas, papa, INTA, autódromo, intendente) | `perfil-balcarce.md` |
| **B3 Secciones** | Las N secciones: nombre, qué entra, qué no, a quién pertenece cuando hay duda | lectura `:81-92`, auditoría `:17`, criterio §2, `docs/03` §2 |
| **B4 Qué entra y qué no** | Publicidad, chimento, extranjero, policial de afuera, dólar, clima, loterías, horóscopo, promoción: una fila por tipo, con "quién lo aplica" (código, IA o persona) | criterio §2 (tabla), lectura `:93-94`, semáforo |
| **B5 Sensibilidad** (para texto y foto) | Menores, víctimas, acusaciones (Campillay), sepelios, datos personales | regla 13, 10, criterio §2, auditoría "sensible", fotos "menor", pistas, semáforo |
| **B6 Mismo hecho** | Una sola definición con casos (anuncio/resultado, dos prácticas del TC) y qué nota queda | parejas, repetidas, criterio §2, `repetidas.js` |
| **B7 Importancia** | Qué es importa para Balcarce (impacto directo/indirecto/nulo) y qué es una nacional que importa | lectura `:76-80` y `nacionalQueImporta` |
| **B8 Fuentes y atribución** | Cómo se cita, contraste, fuente primaria, oficial primero, una sola fuente, nunca el nombre del medio, antecedentes | pasos A–H, reglas 8, 16, criterio §5 |
| **B9 Fechas y tiempos verbales** | Título en presente, cuerpo según cuándo pasó, "ayer/hoy/mañana", "este sábado" | reglas 11 y 14, criterio §4 y §5 |
| **B10 Título** | Largo, presente, etiquetas, "en Balcarce", ganchos, "en vivo" + 6 ejemplos | regla 2, criterio §4 |
| **B11 Bajada** | Frases, largo, qué suma | regla 3 |
| **B12 Cuerpo** | Estructura, datos prácticos, cifras, contexto, siglas | reglas 4, 6, 17–18, 20, 21 |
| **B13 Estilo y tono** | Los dos tonos (con el cuándo), muletillas, **lista única de relleno**, tildes | reglas 5, 12, 19, criterio §4 |
| **B14 Copiar y citar** | Los dos números (10 y 12) con su por qué | regla 1, criterio §6, `docs/04` |
| **B15 Partes internas** | Claves, qué se sabe, qué falta confirmar, aportes, texto para redes, etiquetas (sin `nivel`) | cierre del prompt, criterio §4 |
| **B16 Fotos** | Marca de agua, menores, de dónde pueden venir | fotos, criterio §2 |
| **B17 Auditoría** | Qué marca y con qué gravedad | auditoría |
| **B18 Números** | La tabla única (ya existe), con los números que hoy faltan (10 palabras de cita, 3 a 10 datos) | criterio §11 |
| **B19 Salida** | La forma del JSON, una por prompt | cada prompt |
| **B20 Reglas del sistema (sólo para personas)** | Semáforo, cupos, medios por sección, cruce, ventanas, niveles. **No se manda a ninguna IA** | criterio §3, §5–§11, `docs/03`, `docs/04` |
| **B21 Redes** | La voz (queda su documento, pero comparte B0, B1, B5, B8) | `CRITERIO-REDES.md` |

### 6.2 Qué prompt usa qué bloques (se juntan, no se copian)

| Prompt | Bloques que lo arman |
|---|---|
| Redactor | B0 + B1 (solo *Balcarce / zona / medio / hoy*) + B5 + B8 + B9 + B10 + B11 + B12 + B13 + B14 + B15 + B18 (números que cite) + B19. El tono serio/ameno entra desde B13 |
| Nota de pista / pedido de persona | El del redactor + un pegote corto de B8 (sin "atribuí al medio") |
| Lectura (selección) | B0 + B1 + B2 + B3 + B4 + B7 + B19 |
| Parejas / Repetidas | B1 (mismo hecho) + B6 + B19. Un solo texto; hoy son dos |
| Auditoría | B0 + B3 + B5 + los checks de B10–B14 en forma de lista + B17 + B19 |
| Fotos | B5 (menores) + B16 + B19 |
| Persona pública, Pistas (consultas y matices) | Un renglón de B0 + B19 |
| Voz | B21 |
| Nadie | B20 (para personas) |

### 6.3 Cómo quedaría (estimación, no medida)

El redactor hoy manda unos 20.600 caracteres, con tres reglas repetidas 3 a 5 veces. Sin repeticiones y sin los textos que no cambian nada (sección 4.4), se apunta a entre 12.000 y 14.000 caracteres. Hasta 450 notas por día, eso ahorra del orden de 2,5 a 3,5 millones de caracteres diarios en instrucción repetida. Es una estimación a confirmar midiendo con `reels/comparar-instruccion.mjs`, que ya compara dos versiones con notas reales.

### 6.4 Orden sugerido para hacerlo

1. **Decidir** primero V-1 a V-8 (son los que no dejan escribir el bloque B1 ni B7).
2. Escribir los bloques B0 a B19 en el documento, **sin tocar los prompts viejos**, y una prueba que los arma y los compara contra el texto actual.
3. Cambiar de a un prompt por vez a "armado por bloques" (primero parejas y repetidas, que son los más cortos y hoy se contradicen).
4. Medir el redactor con `comparar-instruccion.mjs` antes de cambiarlo, porque es el que más cuesta si empeora (`docs/04-REDACCION.md:128-130` ya registra que un cambio de reglas el 29/09 hizo bajar y subir cuántas notas sacan cuerpo).
5. Marcar `CRITERIO-EDITORIAL.md` con la fecha real y que `docs/03` y `docs/04` dejen de repetir reglas: sólo "cómo lo hace el código".

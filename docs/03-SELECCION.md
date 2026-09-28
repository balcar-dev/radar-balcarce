# 03 · La selección: qué sale, dónde y cuándo

*Escrito el 28/09/2026 contra el código de ese día. Si el código cambia, manda el código.*

Este documento arranca donde termina `docs/02-INGESTA.md`: cada hecho ya es una
historia con sus fuentes. Acá se cuenta cómo se decide su **sección**, cuánto
**pesa**, de qué **color** sale en el semáforo, si **es de Balcarce**, cuántos
**medios** tiene que tener, qué hace la **lectura con IA**, qué **ventanas de
tiempo** la dejan afuera y cómo se **retira o corrige** a mano. Cómo se escribe
la nota está en `docs/04-REDACCION.md`; cómo se ve en la web, en
`docs/06-WEB.md`.

## En una frase

Cada historia recibe una sección (por el feed o por palabras), un puntaje que
sólo sirve para ordenar y un color del semáforo; lo de afuera sale solo si lo
cuentan los medios que pide su sección y entra en el cupo; una IA lee cada nota
y puede sacarla o cambiarle la sección, pero nunca destrabarla; y al final sale
sólo lo que no llega tarde, tiene cuerpo y nadie retiró.

### Los tres colores, antes de empezar

| Color | Qué pasa |
|---|---|
| **Verde** | Sale sola (si después tiene cuerpo: `docs/04-REDACCION.md`) |
| **Amarillo** | Espera a una persona en el panel. En la nube, sin panel, no sale |
| **Rojo** | No se publica nunca |

Qué va en cada color es criterio editorial: `CRITERIO-EDITORIAL.md` § 3. Acá
se cuenta cómo lo aplica el código.

---

## El recorrido, paso a paso

Los pasos 1 a 7 los hace `ingestar()` (`ingesta/ingesta.mjs`), en la nube y en
la PC. Los pasos 8 a 13 los hace `web/scripts/generar-datos.mjs`; la lectura
con IA (paso 8) y la reescritura (paso 9), **sólo en la nube**.

### 1. Los policiales de afuera no entran

Antes de nada, `esPolicialDeAfuera()` saca toda historia cuya principal no es
de un medio de Balcarce, no dice Balcarce en el título y se clasifica como
Policiales (paso 2). No queda ni amarilla: antes esperaba a una persona y
nadie la miraba (Hernán, 27/09). El registro dice "N policiales de afuera no
entran". (Los que el medio pone en su sección `/policiales/` ya se habían
descartado en el filtro de entrada: `docs/02-INGESTA.md`, paso 6.)

### 2. La sección

Las secciones son once: Balcarce, Política, Policiales, Fútbol, Deportes,
Automovilismo, Agro, Economía, Cultura y agenda, Tecnología y Argentina. No hay
Servicios, Región, Provincia ni País (desde el 27/09).

`clasificar()` (`ingesta/ingesta.mjs`) decide así, en orden:

1. **Automovilismo gana siempre** si el título, las categorías del medio o
   los primeros 400 caracteres tienen una palabra firme de automovilismo
   (`REGLAS_SECCION`: turismo carretera, TC, autódromo, rally, Fórmula 1, F1,
   MotoGP, piloto, escudería…). "Balcarce es tierra de fierros": aparece
   mezclado en cualquier feed.
2. **Si el feed viene con sección fija** (`seccion` en la ficha de la fuente:
   Radio Gabal · Deportes, Olé, TN · Economía…), se le cree. Excepción: una
   fuente de Tecnología sólo se cree si el título nombra algo de tecnología
   (`PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO`), porque esos feeds traen de todo (el
   26/09, la cumbre Trump–Xi).
3. **Si no, por palabras** (`REGLAS_SECCION`, `ingesta/fuentes.mjs`). Se busca
   en el título, las categorías y los primeros 400 caracteres. **Gana la
   palabra más larga que coincide**, de cualquier sección (la más específica:
   "exposición rural" le gana a "exposición"). Si dos empatan, manda el orden
   de las reglas.
4. **Las palabras débiles** (`PALABRAS_DEBILES`: partido, descenso, tenis,
   copa, liga, gol, muestra, exposición, paso, box, comerciantes, precios, IA,
   robot, software, Fangio, taller, penal, ascenso…) sólo deciden **desde el
   título** y **sólo si ninguna palabra firme encontró nada**. "Partido" en la
   provincia es un municipio; "descenso de las temperaturas" no es deporte.
5. **Sin ninguna palabra:** Balcarce si la fuente es de acá o la nota nombra a
   Balcarce en el título; si no, **Argentina**.
6. **Fútbol aparte:** si salió Deportes y la nota tiene una palabra firme de
   fútbol en el título o los primeros 300 caracteres, va a Fútbol.
7. **Balcarce es sólo de acá:** si una palabra de cortes u obras manda a
   Balcarce una nota de afuera que no dice Balcarce en el título, va a
   Argentina.

**Cómo se busca una palabra** (`contiene`): sin tildes ni mayúsculas, como
palabra entera. Las de cinco letras o más aceptan hasta tres letras de más al
final ("granizo" encuentra "granizos", "denuncia" encuentra "denunciado"); las
de cuatro o menos se exigen exactas ("gol" encontraba "golpe" y mandó a
Deportes una nota sobre Alemania).

La lectura con IA puede cambiar la sección después (paso 8).

### 3. La relevancia (el puntaje)

`relevancia()` (`ingesta/ingesta.mjs`) da un número de 0 a 100. **Sólo ordena**:
qué va primero, qué entra en el cupo (paso 7), qué va a Facebook y a los
podcasts (`docs/07-REDES.md`). Desde el 27/09 no decide si lo de afuera sale:
eso lo deciden los medios (paso 6).

| Suma | Cuánto |
|---|---|
| El peso de la fuente principal (`peso`; 10 si no tiene) | 24 a 30 los de Balcarce, 8 casi todos los nacionales |
| Es de Balcarce (medio de acá o Balcarce en el título) | +25 |
| Frescura: menos de 3 horas / de 12 / de 24 | +25 / +15 / +8 (una nota raspada sin fecha real cuenta como de 24 horas: 0) |
| Cada medio más que cuenta lo mismo | +10 por medio, con tope de +40 |
| La fuente trae imagen | +6 |
| La fuente trae texto completo | +4 |
| Un medio de afuera dice Balcarce en el título (`nombraBalcarce`) | +22 (más los +25 de "es de Balcarce": +47) |
| Nombra a una figura argentina | +16 |
| Es Automovilismo | +8 |

Si la lectura con IA dice que una nota "de Balcarce" no lo es, le resta 25
(paso 8). El puntaje no se guarda en el archivo (cambia en cada corrida).

### 4. El semáforo

`semaforo()` (`ingesta/ingesta.mjs`) mira, **en este orden**, y se queda con lo
primero que encuentra:

| # | Qué mira | Dónde | Resultado |
|---|---|---|---|
| 1 | La lista roja (`REGLAS_SEMAFORO.rojo`: menor de edad, abuso sexual, violación, femicidio, grooming, suicidio, trata…) | Título y primeros 600 caracteres | **Rojo** "tema sensible" |
| 2 | Lo que no se publica nunca (`REGLAS_SEMAFORO.nunca`: sepelio, inhumación). Va **antes** del amarillo desde el 28/09: una lista de sepelios dice "falleció", quedaba amarilla y una persona podía aprobarla | Sólo el título | **Rojo** "lista de sepelios: no se publica" |
| 3 | La lista amarilla (`REGLAS_SEMAFORO.amarillo`: denuncia, detenido, imputado, homicidio, víctima, niño, adolescente, "un menor de", "alumno de"…) y, sólo en Policiales, Balcarce, lo de acá o de la zona y lo de un solo medio, la de una muerte o un herido (`amarilloMuerte`: murió, falleció, velatorio, herido…; `laMuerteFrena`). "Hospital" e "investigación" salieron el 28/09 | Título y primeros 600 caracteres | **Amarillo** "necesita ojo humano" |
| 4 | La cotización del dólar (`REGLAS_SEMAFORO.cotizacion`: dólar hoy, dólar blue, a cuánto cotiza…) | Sólo el título | **Amarillo** "cotización del dólar: se muestra en /dolar" |
| 5 | Lo internacional (`REGLAS_SEMAFORO.internacional`: Trump, Putin, Gaza, Ucrania, G20, California…), sólo en lo de afuera que no dice Balcarce en el título | Sólo el título | **Amarillo** "internacional: sin relación con Balcarce" |
| 6 | La promoción (`REGLAS_SEMAFORO.promocional`: sorteo, ganá tu entrada, suscribite, auspicia…) | Título y primeros 600 caracteres | **Amarillo** "parece promoción, no noticia" |
| 7 | La fuente principal es oficial | — | **Verde** "comunicado oficial" |
| 8 | No es de acá (paso 5) y la cuentan menos medios de los que pide su sección (paso 6) | — | **Amarillo** "de afuera y poco contada (N medios; Sección pide M)" |
| 9 | La sección está en `REGLAS_SEMAFORO.verdeSecciones` (hoy, las once) | — | **Verde** "sección X" |
| 10 | Si no | — | Amarillo "sección general, sin regla verde" (hoy no pasa nunca) |

Las listas roja y amarilla se pasan también, más adelante, sobre **el texto
completo** de la fuente y **lo que escribió la IA** (sólo el rojo y lo de
menores y víctimas, `AMARILLO_MENORES`): ver `docs/04-REDACCION.md`, pasos 4 y
11. La lista roja **no se toca sin preguntar** (`CLAUDE.md`).

### 5. Qué es "de acá" (`esDeAca`)

Una sola definición, desde el 28/09, para las tres reglas que la usan (el
semáforo, los medios que pide lo de afuera y el cupo). **Es de acá:**

1. lo que toca la zona (`deLaZona`: la 226, la 55, la papa, el sudeste), pase
   lo que pase;
2. si no, y si la lectura con IA dijo que el hecho **no** es de Balcarce
   (`noEsDeAcaSegunLaIA`, paso 8): **no** es de acá;
3. si no, lo de un medio de Balcarce o lo que dice Balcarce en el título
   (`local`), o lo que otro medio de la misma historia dice con Balcarce en el
   título (`nombraBalcarce`).

Una fuente oficial (la historia lo es si alguna de sus fuentes lo es, desde el
28/09) y una nota propia no piden medios (paso 6), pero **no** son
"de acá".

### 6. Cuántos medios tiene que tener lo de afuera

Lo de afuera sale solo **sólo si lo cuentan varios medios distintos**. Lo mira
`exigirMedios()` con el mínimo de `mediosMinimosDe()`; los números están en
`ingesta/criterio.mjs` y en la tabla de `CRITERIO-EDITORIAL.md` § 11:

| Sección | Medios distintos que pide | Constante |
|---|---|---|
| Fútbol, Deportes | 4 | `MEDIOS_DE_AFUERA.Fútbol`, `.Deportes` |
| Economía, Tecnología, Agro, Automovilismo | 2 | `MEDIOS_DE_AFUERA.Economía`, etc. |
| Todas las demás (Política, Argentina, Cultura y agenda…) | 3 | `MEDIOS_POR_DEFECTO` |
| Cualquier sección, si nombra a una figura argentina | 2 (o menos, si la sección pide menos) | `MEDIOS_CON_FIGURA` |

- **Lo de acá** (paso 5), **lo oficial** y **las notas propias** no piden
  medios.
- **Nunca uno solo**: con un medio, lo de afuera ni siquiera pasa el cruce
  (`docs/02-INGESTA.md`, paso 11).
- **Va en los dos sentidos.** Se mira en la ingesta y otra vez después de la
  lectura con IA. Una nota verde que ya no llega pasa a amarilla con el motivo
  "de afuera y poco contada (…)"; una que esperaba **con ese motivo** y ahora
  llega (porque se juntó con sus repetidas, paso 8) pasa a verde con "de
  afuera, contada por N medios". Ningún otro amarillo se destraba así.
- Los medios se cuentan por nombre de medio, sin repetir (dos secciones de
  Clarín son un medio).

### 7. El cupo de lo de afuera

Aun con los medios, un domingo de fútbol tiene treinta historias contadas por
cuatro medios y la portada sería la de Olé. `aplicarCupos()` recorre las
historias **de más a menos puntaje** y, por sección, deja salir solas sólo las
N primeras de afuera; el resto pasa a amarillo con "pasó el cupo de X de afuera
(N a la vez)". **Lo de acá no cuenta ni ocupa lugar** (desde el 28/09, tampoco
lo de la zona).

| Sección | Cupo de afuera a la vez | Constante |
|---|---|---|
| Argentina, Economía | 12 | `CUPO_DE_AFUERA` |
| Fútbol, Deportes | 10 | `CUPO_DE_AFUERA` |
| Tecnología, Política, Cultura y agenda | 8 | `CUPO_DE_AFUERA` |
| Automovilismo | 6 | `CUPO_DE_AFUERA` |
| Policiales | 0 ("la sección es sólo de Balcarce y la zona") | `CUPO_DE_AFUERA` |
| Las demás (Agro) | 15 | `CUPO_POR_DEFECTO` |

**Primero los medios, después el cupo**: al revés, los lugares se los
llevaban notas que después quedaban frenadas.

### 8. La lectura con IA (sólo en la nube)

Una IA lee cada historia nueva y completa una **ficha**. Desde el 27/09
**decide** (Hernán: "sin testear, corregimos en vivo"). Va antes de la
reescritura, para no gastar cupo escribiendo lo que no va a salir. Todo en
`ingesta/lectura-ia.mjs`; lo llama `generar-datos.mjs`.

**Qué se le manda** (`entradaDeNota`, `pedidoPara`): una instrucción fija
(`INSTRUCCION`, en el mismo archivo: el ámbito es el del hecho y no el del
medio, qué va en cada sección, qué es publicidad, qué es chimento…), el
**perfil de Balcarce** leído tal cual de `ingesta/perfil-balcarce.md` (qué es,
las localidades del partido, lo que queda cerca pero no es Balcarce, las
rutas, lo que mueve a la ciudad; sólo datos seguros) y, de cada nota, el
identificador, el título, los primeros 500 caracteres del resumen
(`LECTURA.resumenMaximo`), el medio y **la ciudad del medio**.

**Qué devuelve cada ficha** (`ESQUEMA`, listas cerradas):

| Campo | Valores |
|---|---|
| `ambito` | balcarce, region, provincia, nacional, internacional |
| `lugar_del_hecho` | texto libre (hasta 60 caracteres) |
| `seccion` | una de las once |
| `impacto_balcarce` | directo, indirecto, nulo |
| `razon` | local, servicio, actividad, provincia, nacional, popular, ninguna |
| `importancia` | alta, media, baja |
| `es_publicidad`, `es_chimento`, `es_anuncio` | sí o no |
| `por_que_interesa` | una frase |
| `clave_tema` | 3 a 5 palabras con guiones |

`fichaValida()` descarta la ficha entera si un valor no está en su lista (se
vuelve a pedir en otra corrida). Las fichas se guardan en
`web/data/fichas.json`, una por renglón, y se borran a los 3 días
(`LECTURA.diasDeFichas`).

**Cuánto se pide** (`leerNotasNuevas`): sólo las notas sin ficha, de a 12 por
pedido (`LECTURA.notasPorPedido`), como mucho 5 pedidos por corrida
(`pedidosPorCorrida`) y 60 por día con la clave gratis compartida
(`pedidosPorDia`) o 200 con la clave propia `GEMINI_API_KEY_CLASIFICACION`
(`pedidosPorDiaConClavePropia`; lo elige `topeDeLecturas`). El día es el de
Balcarce.

**Con qué IA:** Gemini `gemini-flash-lite-latest`, temperatura 0, con el
esquema forzado. La clave es `GEMINI_API_KEY_CLASIFICACION` o, si no está, la
gratis de redacción; **nunca la paga de redes**. Si Gemini falla, el mismo
grupo se prueba con **Groq** (`GROQ_API_KEY`, modelo `openai/gpt-oss-120b`,
`leerGrupoGroq`) con la misma instrucción y la misma validación. Si las dos
dicen "sin cupo" (429), no se insiste en esa corrida. Sin ninguna clave, todo
sigue como lo decidió el sistema.

**Qué hace con la ficha** (`aplicarFichas`). Límites que no se negocian: una
nota roja no se toca, y **la IA sólo puede endurecer** (sacar una nota o
mandarla a esperar), nunca destrabar. Sin ficha, la nota sigue igual.

1. **La saca** (no sale ni queda amarilla, y si tenía página la pierde) si:
   - es publicidad ("es publicidad");
   - es chimento ("es un chimento");
   - el ámbito es internacional y no nombra a una figura argentina ni tiene
     conexión argentina en el título ("es del extranjero": la Fórmula 1 sin un
     argentino, no);
   - el impacto es nulo, no es automovilismo ni figura, no tiene conexión
     argentina, no es una nacional que importa (3 medios o más, importancia
     alta, o razón nacional, popular o servicio) y, si es de un medio de acá,
     tampoco nombra a Balcarce en el título ("no tiene relación con
     Balcarce");
   - la IA la pone en Policiales y no es de Balcarce ("policial que no es de
     Balcarce").
2. **Dos llaves para ser de Balcarce.** Una nota con la llave de la fuente (un
   medio de acá, o Balcarce en el título) es de Balcarce sólo si la IA dice
   que el hecho es de Balcarce o que la afecta directamente. Si no, queda
   marcada `noEsDeAcaSegunLaIA` (se rige por lo de afuera, paso 5), deja de
   ser `local` y pierde 25 puntos.
3. **La sección es la de la IA**, con dos ajustes: "Balcarce" para lo que no
   es de acá no vale (queda la que tenía), y "Argentina" para lo que sí es de
   acá pasa a Balcarce. Las fichas viejas que dicen Servicios o País se leen
   como Balcarce y Argentina; una ficha vieja que dice Deportes para algo que
   las palabras llevaron a Fútbol queda en Fútbol.
4. Si la sección nueva no sale sola (hoy no pasa: salen las once), la nota
   verde pasa a esperar.

**Las repetidas: una noticia, una nota.** El cruce por palabras no junta todo:
el 27/09 salieron tres notas de la misma falsa oferta de empleo de McCain con
títulos distintos. Entonces:

1. Se le muestran a la IA **las notas que van a salir** (verdes) y, en un
   pedido aparte, **las de afuera que esperan por pocos medios**
   (`agruparRepetidas`, instrucción `INSTRUCCION_REPETIDAS`: agrupar sólo las
   que cuentan exactamente el mismo hecho, no dos notas del mismo tema).
2. Se pide sólo si cambió la lista, con tope de 60 vueltas por día
   (`LECTURA.pedidosRepetidasPorDia`), sólo con Gemini (sin respaldo de Groq).
3. Los grupos se suman a los de corridas anteriores (`unirGrupos`: si antes
   A y B, y ahora B y C, son A, B y C), mientras sus notas sigan en la ingesta.
4. De cada grupo **queda una** (`quitarRepetidas`), en este orden de
   preferencia: la que ya está publicada (en la portada anterior o en el
   archivo y todavía dentro de las 36 horas), la verde, la que cuentan más
   medios, la de más puntaje. **Se le suman los medios de las otras.** Las
   demás salen; si alguna ya fue a las redes, conserva su página.

**Después:** con las secciones corregidas y los medios sumados, se vuelven a
correr `exigirMedios` (en los dos sentidos) y `aplicarCupos`. El registro dice
"lectura con IA: N fichas nuevas en P pedidos · sacó X, Y dejaron de ser de
Balcarce, Z cambiaron de sección, W a esperar, R repetidas", con los títulos de
lo que sacó.

### 9. La reescritura puede frenar una nota

Cuando la IA escribe la nota (`docs/04-REDACCION.md`), el semáforo se pasa por
el texto completo de la fuente y por lo que escribió; y el código calcula el
nivel de verificación. Si algo da rojo, amarillo o verificación BAJA, **la
nota verde cambia de color** ahí mismo ("… (visto al reescribir)" o
"verificación baja: espera a una persona") y deja de salir sola.

### 10. La fecha de la nota y "llega tarde"

**La fecha** (`fechaReal`, en `generar-datos.mjs`; una sola regla desde el
28/09): si la fuente no dio hora, es **la primera vez que se vio la nota**
(`web/data/vistas.json`, `docs/02-INGESTA.md`, paso 5). Si la dio, es **la más
vieja que se conoce** entre la de la ingesta, la de cada una de sus fuentes,
la que ya tenía publicada y la primera vez que se vio (`fechaDeLaNota`,
`web/lib/archivo.js`). **Una nota puede envejecer, nunca rejuvenecer**: la de
Colapinto en Bakú, del sábado, figuraba "hace 46 minutos" el lunes porque el
medio la había actualizado. Es la fecha que se muestra, la que ordena y la que
decide lo que sigue.

**Llega tarde** (`llegaTarde`, `web/lib/archivo.js`): una nota que **nunca
salió** no se estrena si el hecho tiene más de **12 horas**
(`HORAS_PARA_ESTRENAR`, igual a `PORTADA.horasParaEstrenar`). De 140 notas
publicadas del 25 al 28/09, 40 salieron con el hecho de más de un día, por
esperar medios o cuerpo. Lo que ya salió (está en la portada anterior o en el
archivo) sigue su curso. Lo que publicó una persona, también. Una nota que
llega tarde tampoco se le pide a la IA.

### 11. La decisión final: `notaPublicada`

`generar-datos.mjs` decide, nota por nota y en este orden:

1. **¿Está retirada a mano?** (`web/data/retiradas.json`, paso 13): no sale.
2. **¿Quién manda?** Si una persona decidió en el panel (`decisionHumana`:
   una decisión con `por` y que no sea de la IA), manda esa decisión. Si no,
   el semáforo: verde = automática, rojo = bloqueada, amarillo = pendiente.
   Sólo "publicada" y "automática" siguen.
3. **¿Llega tarde?** (paso 10), salvo que la haya publicado una persona o ya
   haya salido.
4. **¿Qué texto lleva?** El de la persona; si no, el de la IA (de esta corrida
   o de una anterior); si no, el resumen de la fuente. El título automático
   pasa por los arreglos mecánicos (`tituloAutomatico`,
   `docs/04-REDACCION.md`, paso 7). Se arman las "Fuentes consultadas" con
   los enlaces reales si nadie las completó.
5. **La dirección** se fija la primera vez que sale (`fijarSlug`) y no cambia
   más, aunque cambie el título (ver `docs/06-WEB.md`).
6. **Las correcciones a mano** (`web/data/correcciones.json`, paso 13) pisan
   título, bajada, sección o cuerpo.
7. **Lo que no se publica nunca**, otra vez, sobre el título y la bajada
   finales, **aunque la haya aprobado una persona** (`nuncaSePublica`, que
   usa `esDeLoQueNuncaSePublica` de `web/lib/archivo.js`; la persona, desde
   el 28/09): una lista de sepelios que se coló con otro título no sale.
8. **Sin cuerpo no se publica** (`tieneCuerpo`, `web/lib/cuerpo.js`): la nota
   automática sin cuerpo de 70 palabras o más queda "esperando cuerpo"
   (`docs/04-REDACCION.md`, paso 12). Lo que publicó una persona se respeta.

Lo que pasa los ocho pasos se publica.

### 12. Las ventanas: cuánto se queda una nota a la vista

| Ventana | Cuánto | Dónde | Qué hace |
|---|---|---|---|
| Colador de lo raspado | 72 h | `HORAS_DE_UNA_NOTA_NUEVA` | Lo de una página raspada más viejo no entra (`docs/02-INGESTA.md`) |
| Memoria del cruce | 36 h | `CRUCE.horasDeMemoria` | Con qué se cruza cada nota |
| Estreno | 12 h | `HORAS_PARA_ESTRENAR` = `PORTADA.horasParaEstrenar` | Lo nunca publicado más viejo no sale |
| Portada y secciones | 36 h | `HORAS_EN_PORTADA` = `PORTADA.horas` | Lo que se muestra en las listas (`vigenteEnPortada`). Eran 72 hasta el 28/09 |
| Nota grande de la tapa | 6 h | `VENTANA_HORAS` (`web/lib/datos.js`) = `PORTADA.horasNotaGrande` | Cuánto compite una nota por el lugar grande (`docs/06-WEB.md`) |
| Página de la nota | 180 días | `DIAS_DE_ARCHIVO` = `PORTADA.diasDeArchivo` | Cuánto existe su página |
| Fichas de la IA | 3 días | `LECTURA.diasDeFichas` | Cuánto se recuerda una ficha |
| Primera vista | 7 días | `DIAS_DE_VISTAS` | Cuánto se recuerda cuándo se vio |
| Panel: archivar lo no decidido | 72 h | `HORAS_PARA_ARCHIVAR` (`panel/servidor.mjs`) | En la PC, lo que nadie decidió se archiva (`docs/09-PANEL.md`) |

`ingesta/criterio.mjs` guarda las 36, 12 y 6 horas y los 180 días; la web usa
sus propias constantes (se compilan con el sitio) y las pruebas
(`pruebas/criterio.test.mjs`, `pruebas/archivo.test.mjs`) controlan que sean
iguales.

Además, en las listas no conviven **dos notas con el mismo titular (o casi)**:
queda la de más puntaje y la otra conserva su página (`sinNotasRepetidas`,
`web/lib/texto.js`).

**Cuándo una nota pierde su página** (sale de `web/data/archivo.json`): si una
persona la bloqueó o descartó; si hoy la ingesta la trae en rojo, o en
amarillo **por lo que dice** (`pierdeLaPagina`, `web/lib/archivo.js`: la
cotización del dólar y lo de afuera que espera sólo por el cupo o por los
medios que la cuentan, `esperaSoloPorCantidad`, conservan la página desde el
28/09); si es una lista de sepelios, aunque la haya aprobado una persona; si
la lectura con IA la sacó en esta corrida; si quedó fuera como repetida y no
fue a las redes; si está en `retiradas.json`; si es de afuera y no de la zona, la
contó un solo medio, no es oficial y no fue a las redes (`tieneRespaldo`; lo
de la zona conserva la página desde el 28/09, `deLaZona`); o si pasó de
180 días. Detalle en `docs/06-WEB.md`.

### 13. Retirar y corregir a mano, sin el panel

El panel, si está prendido, **pisa cada 10 minutos** lo que se cargue a mano
en `web/data/decisiones.json`. Por eso hay dos archivos propios, que manda
siempre la nube:

**`web/data/retiradas.json`: sacar una nota.** Cada entrada, por
identificador, tiene que decir por qué (sin `motivo` no vale):

```json
{"notas":{
"bclpti":{"motivo":"aviso de viaje a un show de un tercero, sin hecho de Balcarce","titulo":"Habrá viaje desde Balcarce…","medio":"Infórmese Primero (FM 104.9)","cuando":"2026-09-28","por":"repaso editorial de Claude, pedido por Hernán"}
}}
```

La nota no sale en ninguna lista y **pierde su página**, aunque la ingesta la
vuelva a traer (`idsRetiradosAMano`, `web/lib/archivo.js`). El 28/09 había 294.
No se guardan para siempre: los lunes, en la nube, salen de la lista las de más
de 7 días que la ingesta ya no trae (`podarRetiradas`, regla 69); a esa altura
la nota ya no se puede estrenar.

**`web/data/correcciones.json`: corregir una nota.** Se puede cambiar
`titulo`, `copete`, `seccion` o `cuerpo` (`CAMPOS_CORREGIBLES`), siempre con
`motivo`, `cuando` y `por`. Manda sobre lo que escriba la IA en cualquier
corrida, se aplica también a la página vieja del archivo y **la dirección no
cambia** (`correccionesAMano`, `conCorreccion`). Cómo escribir un cuerpo ahí:
`docs/04-REDACCION.md`, paso 12. El 28/09 había 128 correcciones, 83 con
cuerpo.

Los dos archivos los lee `generar-datos.mjs` al empezar; el cambio se ve en la
corrida siguiente de "Actualizar la web".

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `ingesta/ingesta.mjs` | `clasificar`, `relevancia`, `semaforo`, `esDeAca`, `mediosMinimosDe`, `exigirMedios`, `aplicarCupos`, `esPolicialDeAfuera`; `semaforoDelTexto` (las listas sobre cualquier texto) | `ingestar()`; `generar-datos.mjs`; `reels/reescritura.mjs` | `ingesta/fuentes.mjs`, `ingesta/criterio.mjs` | — |
| `ingesta/fuentes.mjs` | `REGLAS_SECCION`, `REGLAS_SEMAFORO` (rojo, nunca, amarillo, verdeSecciones, promocional, cotizacion, internacional), `AMARILLO_MENORES`, `PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO`, `FIGURAS`, `TEMAS` | Todo el motor | — | — |
| `ingesta/criterio.mjs` | Los números: `MEDIOS_DE_AFUERA`, `MEDIOS_POR_DEFECTO`, `MEDIOS_CON_FIGURA`, `CUPO_DE_AFUERA`, `CUPO_POR_DEFECTO`, `PORTADA` | Todo | — | — |
| `ingesta/lectura-ia.mjs` | Fichas (`leerNotasNuevas`, `aplicarFichas`), repetidas (`agruparRepetidas`, `unirGrupos`, `quitarRepetidas`) | `generar-datos.mjs` (nube) | `ingesta/perfil-balcarce.md`, `web/data/fichas.json`, `reels/claves.mjs` | (lo escribe `generar-datos.mjs`) |
| `ingesta/perfil-balcarce.md` | Lo que la IA sabe de Balcarce (sólo datos seguros) | `lectura-ia.mjs` | — | — |
| `ingesta/utiles.mjs` | `decisionHumana`: qué decisión es de una persona | `generar-datos.mjs`, `reels/reescritura.mjs`, panel | — | — |
| `web/scripts/generar-datos.mjs` | Orquesta todo: lectura con IA, reescritura, `fechaReal`, `notaPublicada`, fotos, archivo | `actualizar.yml` (nube), a mano en la PC | `decisiones.json`, `retiradas.json`, `correcciones.json`, `vistas.json`, `fichas.json`, portada y archivo anteriores | `portada.json`, `archivo.json`, `fichas.json`, `vistas.json`, `esperando-cuerpo.json`, `intentos-ia.json` y más |
| `web/lib/archivo.js` | `HORAS_EN_PORTADA`, `HORAS_PARA_ESTRENAR`, `vigenteEnPortada`, `llegaTarde`, `fechaDeLaNota`, `pierdeLaPagina`, `esDeLoQueNuncaSePublica`, retiradas y correcciones a mano, el archivo | `generar-datos.mjs`, la web | — | — |
| `web/lib/cuerpo.js` | `tieneCuerpo`, `tieneRespaldo` | `generar-datos.mjs`, la web, redes | — | — |
| `web/lib/texto.js` | `sinNotasRepetidas` (mismo titular) | `generar-datos.mjs` | — | — |
| `web/data/retiradas.json`, `web/data/correcciones.json` | Lo que decidió una persona sin el panel | Una persona (o Claude, a pedido) | — | — |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Que una palabra mande una nota a otra sección | `REGLAS_SECCION` (`ingesta/fuentes.mjs`); si es ambigua, además en `PALABRAS_DEBILES` (`ingesta/ingesta.mjs`) |
| Que un feed de Tecnología sólo se crea con ciertas palabras en el título | `PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO` (`ingesta/fuentes.mjs`) |
| Cambiar qué suma al puntaje | `relevancia()` (`ingesta/ingesta.mjs`) |
| Que algo espere a una persona o nunca salga | `REGLAS_SEMAFORO` (`ingesta/fuentes.mjs`). **La lista roja, no sin preguntar** |
| Que la cotización del dólar u otra cosa del título no salga sola | `REGLAS_SEMAFORO.cotizacion` o `.internacional` |
| Cuántos medios pide cada sección | `MEDIOS_DE_AFUERA`, `MEDIOS_POR_DEFECTO`, `MEDIOS_CON_FIGURA` (`ingesta/criterio.mjs`) **y** la tabla de `CRITERIO-EDITORIAL.md` § 11 |
| Cuántas de afuera salen a la vez por sección | `CUPO_DE_AFUERA`, `CUPO_POR_DEFECTO` (mismo par de archivos) |
| Qué es "de acá" | `esDeAca()` (`ingesta/ingesta.mjs`), `PALABRAS_LOCALES` y `PALABRAS_ZONA` (`ingesta/fuentes.mjs`) |
| Qué sabe la IA de Balcarce | `ingesta/perfil-balcarce.md` (sólo datos seguros) |
| Qué saca la IA o cómo elige la sección | `INSTRUCCION` y `aplicarFichas` (`ingesta/lectura-ia.mjs`) |
| Cuánto lee la IA por día | `LECTURA` y `topeDeLecturas` (`ingesta/lectura-ia.mjs`) |
| Cuántas horas tiene un hecho para estrenarse, o cuánto se queda en la portada | `PORTADA` (`ingesta/criterio.mjs`) **y** `HORAS_PARA_ESTRENAR`, `HORAS_EN_PORTADA` (`web/lib/archivo.js`) **y** `CRITERIO-EDITORIAL.md` § 11 |
| Sacar una nota sin el panel | `web/data/retiradas.json` |
| Corregir título, bajada, sección o cuerpo sin el panel | `web/data/correcciones.json` |

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| La IA de lectura se queda sin cupo | "lectura con IA: falló un pedido (HTTP 429)" en el registro; las notas sin ficha salen como lo decidió el sistema | Revisar `GEMINI_API_KEY_CLASIFICACION` y `GROQ_API_KEY` |
| La IA saca algo que sí era de Balcarce | Aparece en "fuera (…)" del registro de "Actualizar la web" | Anotar el caso, ajustar `INSTRUCCION` o el perfil; mientras, publicar desde el panel |
| Una nota de afuera ya publicada rebota en el cupo o en los medios | En una corrida pasa a amarilla (otra nota de más puntaje le ganó el lugar, o un medio la sacó de su feed y la memoria la olvidó) y sale de las listas. **Conserva la página** desde el 28/09 (`pierdeLaPagina`), y como ya salió, si vuelve a verde vuelve a las listas aunque tenga más de 12 horas | Nada; para una nota importante, publicarla desde el panel |
| `aplicarCupos` sólo baja | Después de la lectura con IA, una nota que había quedado amarilla por el cupo en la ingesta no vuelve a verde aunque la IA haya sacado otras de su sección | Se corrige sola en la corrida siguiente, cuando la ingesta vuelve a repartir |
| El panel y la nube archivan distinto | En la PC, lo que nadie decidió se archiva a las 72 horas; la web ya no lo muestra a las 36 | Nada: la web manda en lo que se ve |
| La portada queda vacía de lo de afuera | "de afuera y poco contada" en muchas notas del panel | Revisar que el cruce tenga memoria y que las fuentes estén vivas (`docs/02-INGESTA.md`) |

## Lo que sigue abierto

- `CRITERIO-EDITORIAL.md` § 2 todavía dice que lo que toca la zona "tiene el
  cupo de su sección" (desde el 28/09, `esDeAca`, no ocupa cupo), y el
  comentario de `HORAS_EN_PORTADA` (`web/lib/archivo.js`) dice que es "el mismo
  criterio que el panel" (el panel archiva a las 72 horas). Los dos, en
  `PENDIENTES.md`.

# 03 · La selección: qué sale, dónde y cuándo

*Actualizado el 29/09/2026. Si el código cambia, manda el código.*

Arranca donde termina `docs/02-INGESTA.md` (cada hecho ya es una historia con sus
fuentes). Cómo se escribe la nota está en `docs/04-REDACCION.md`; cómo se ve en la
web, en `docs/06-WEB.md`.

## En una frase

Cada historia recibe una sección (por el feed o por palabras), un puntaje que sólo
sirve para ordenar y un color del semáforo; lo de afuera sale solo si lo cuentan
los medios que pide su sección y entra en el cupo; una IA lee cada nota y puede
sacarla o cambiarle la sección, pero nunca destrabarla; y al final sale sólo lo
que no llega tarde, tiene cuerpo y nadie retiró.

**Los tres colores** (qué va en cada uno es criterio: `CRITERIO-EDITORIAL.md` § 3):

| Color | Qué pasa |
|---|---|
| **Verde** | Sale sola (si después tiene cuerpo: `docs/04-REDACCION.md`) |
| **Amarillo** | Espera a una persona, que decide en el panel del celular (o en el de la PC). Si nadie la aprueba, no sale |
| **Rojo** | No se publica nunca, ni aprobada |

---

## El recorrido, paso a paso

Los pasos 1 a 7 los hace `ingestar()` (`ingesta/ingesta.mjs`), en la nube y en la
PC. Los pasos 8 a 13 los hace `web/scripts/generar-datos.mjs`; la lectura con IA
(paso 8) y la reescritura (paso 9), **sólo en la nube**.

### 1. Los policiales de afuera no entran

`esPolicialDeAfuera()` saca toda historia cuya principal no es de un medio de
Balcarce, no dice Balcarce en el título y se clasifica como Policiales (paso 2).
No queda ni amarilla: esperando, nadie la miraba. El registro dice "N policiales de
afuera no entran". (Los que el medio pone en su sección `/policiales/` ya se
descartaron en el filtro de entrada: `docs/02-INGESTA.md`, paso 6.)

### 2. La sección

Las secciones son once: Balcarce, Política, Policiales, Fútbol, Deportes,
Automovilismo, Agro, Economía, Cultura y agenda, Tecnología y Argentina.

`clasificar()` (`ingesta/ingesta.mjs`) decide así, en orden:

1. **Automovilismo gana siempre** si el título, las categorías del medio o los
   primeros 400 caracteres tienen una palabra firme de automovilismo
   (`REGLAS_SECCION`: turismo carretera, TC, autódromo, rally, Fórmula 1, MotoGP,
   piloto…): en Balcarce aparece mezclado en cualquier feed.
2. **Si el feed viene con sección fija** (`seccion` en la ficha: Radio Gabal ·
   Deportes, Olé, TN · Economía…), se le cree. Excepción: una fuente de Tecnología
   sólo se cree si el título nombra algo de tecnología
   (`PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO`), porque esos feeds traen de todo.
3. **Si no, por palabras** (`REGLAS_SECCION`, `ingesta/fuentes.mjs`), en el título,
   las categorías y los primeros 400 caracteres. **Gana la palabra más larga que
   coincide**, de cualquier sección ("exposición rural" le gana a "exposición"); si
   empatan, manda el orden de las reglas.
4. **Las palabras débiles** (`PALABRAS_DEBILES`: partido, descenso, copa, liga,
   gol, muestra, exposición, paso, precios, IA, Fangio, taller, penal…) sólo
   deciden **desde el título** y **sólo si ninguna palabra firme encontró nada**:
   "partido" en la provincia es un municipio; "descenso de las temperaturas" no es
   deporte.
5. **Sin ninguna palabra:** Balcarce si la fuente es de acá o la nota nombra a
   Balcarce en el título; si no, **Argentina**.
6. **Fútbol aparte:** si salió Deportes y hay una palabra firme de fútbol en el
   título o los primeros 300 caracteres, va a Fútbol.
7. **Balcarce es sólo de acá:** si una palabra de cortes u obras manda a Balcarce
   una nota de afuera que no dice Balcarce en el título, va a Argentina.

**Cómo se busca una palabra** (`contiene`): sin tildes ni mayúsculas, como palabra
entera. Las de cinco letras o más aceptan hasta tres letras de más al final
("granizo" encuentra "granizos"); las de cuatro o menos, exactas ("gol" encontraba
"golpe").

La lectura con IA puede cambiar la sección después (paso 8).

### 3. La relevancia (el puntaje)

`relevancia()` da un número de 0 a 100 que **sólo ordena**: qué va primero, qué
entra en el cupo (paso 7), qué va a Facebook y a los podcasts (`docs/07-REDES.md`).
No decide si lo de afuera sale: eso lo deciden los medios (paso 6).

| Suma | Cuánto |
|---|---|
| El peso de la fuente principal (`peso`; 10 si no tiene) | 24 a 30 los de Balcarce, 8 casi todos los nacionales |
| Es de Balcarce (medio de acá o Balcarce en el título) | +25 |
| Frescura: menos de 3 horas / de 12 / de 24 | +25 / +15 / +8 (una nota raspada sin fecha real cuenta como de 24 horas: 0) |
| Cada medio más que cuenta lo mismo | +10 por medio, hasta +40 |
| La fuente trae imagen / texto completo | +6 / +4 |
| Un medio de afuera dice Balcarce en el título (`nombraBalcarce`) | +22 (más los +25 de "es de Balcarce") |
| Nombra a una figura argentina | +16 |
| Es Automovilismo | +8 |

Si la lectura con IA dice que una nota "de Balcarce" no lo es, le resta 25 (paso
8). El puntaje no se guarda en el archivo: cambia en cada corrida.

### 4. El semáforo

`semaforo()` mira, **en este orden**, y se queda con lo primero que encuentra:

| # | Qué mira | Dónde | Resultado |
|---|---|---|---|
| 1 | La lista roja (`REGLAS_SEMAFORO.rojo`: menor de edad, abuso sexual, violación, femicidio, grooming, suicidio, trata…) | Título y primeros 600 caracteres | **Rojo** "tema sensible" |
| 2 | Lo que no se publica nunca (`REGLAS_SEMAFORO.nunca`: sepelio, inhumación). Va **antes** del amarillo: una lista de sepelios dice "falleció" y, amarilla, una persona podía aprobarla | Sólo el título | **Rojo** "lista de sepelios: no se publica" |
| 3 | La lista amarilla (`REGLAS_SEMAFORO.amarillo`: denuncia, detenido, imputado, homicidio, víctima, niño, adolescente, "un menor de", "alumno de"…) y, sólo en Policiales, Balcarce, lo de acá o de la zona y lo de un solo medio, la de una muerte o un herido (`amarilloMuerte`: murió, falleció, velatorio, herido…; `laMuerteFrena`) | Título y primeros 600 caracteres | **Amarillo** "necesita ojo humano" |
| 4 | La cotización del dólar (`REGLAS_SEMAFORO.cotizacion`: dólar hoy, dólar blue, a cuánto cotiza…) | Sólo el título | **Amarillo** "cotización del dólar: se muestra en /dolar" |
| 5 | Lo internacional (`REGLAS_SEMAFORO.internacional`: Trump, Putin, Gaza, Ucrania…), en lo de afuera que no dice Balcarce en el título | Sólo el título | **Amarillo** "internacional: sin relación con Balcarce" |
| 6 | La promoción (`REGLAS_SEMAFORO.promocional`: sorteo, ganá tu entrada, suscribite…) | Título y primeros 600 caracteres | **Amarillo** "parece promoción, no noticia" |
| 7 | La fuente es oficial | — | **Verde** "comunicado oficial" |
| 8 | No es de acá (paso 5) y la cuentan menos medios de los que pide su sección (paso 6) | — | **Amarillo** "de afuera y poco contada (N medios; Sección pide M)" |
| 9 | Si nada la frenó | — | **Verde** "sección X" |

Las listas roja y amarilla se pasan también sobre **el texto completo** de la
fuente y sobre **lo que escribió la IA** (el rojo y lo de menores y víctimas,
`AMARILLO_MENORES`): ver `docs/04-REDACCION.md`, pasos 4 y 11. **La lista roja no
se toca sin preguntar.**

### 5. Qué es "de acá" (`esDeAca`)

Una sola definición para las tres reglas que la usan (el semáforo, los medios que
pide lo de afuera y el cupo). **Es de acá:**

1. lo que toca la zona (`deLaZona`: la 226, la 55, la papa, el sudeste), pase lo
   que pase;
2. si no, y si la lectura con IA dijo que el hecho **no** es de Balcarce
   (`noEsDeAcaSegunLaIA`, paso 8): **no** es de acá;
3. si no, lo de un medio de Balcarce o lo que dice Balcarce en el título (`local`),
   o lo que otro medio de la misma historia dice con Balcarce en el título
   (`nombraBalcarce`).

Una fuente oficial y una nota propia no piden medios (paso 6), pero **no** son "de
acá".

### 6. Cuántos medios tiene que tener lo de afuera

Lo de afuera sale solo **sólo si lo cuentan varios medios distintos**
(`exigirMedios()`, con el mínimo de `mediosMinimosDe()`; los números, en
`ingesta/criterio.mjs` y en la tabla de `CRITERIO-EDITORIAL.md` § 11):

| Sección | Medios distintos que pide | Constante |
|---|---|---|
| Fútbol, Deportes | 4 | `MEDIOS_DE_AFUERA` |
| Economía, Tecnología, Agro, Automovilismo | 2 | `MEDIOS_DE_AFUERA` |
| Todas las demás (Política, Argentina, Cultura y agenda…) | 3 | `MEDIOS_POR_DEFECTO` |
| Cualquiera, si nombra a una figura argentina | 2 (o menos, si la sección pide menos) | `MEDIOS_CON_FIGURA` |

- **Lo de acá** (paso 5), **lo oficial** y **las notas propias** no piden medios.
- **Nunca uno solo**: con un medio, lo de afuera ni pasa el cruce
  (`docs/02-INGESTA.md`, paso 11).
- **Va en los dos sentidos.** Se mira en la ingesta y otra vez después de la
  lectura con IA. Una verde que ya no llega pasa a amarilla ("de afuera y poco
  contada"); una que esperaba **con ese motivo** y ahora llega (porque se juntó con
  sus repetidas, paso 8) pasa a verde ("de afuera, contada por N medios"). Ningún
  otro amarillo se destraba así.
- Los medios se cuentan por nombre, sin repetir (dos secciones de Clarín son un
  medio).

### 7. El cupo de lo de afuera

Aun con los medios, un domingo de fútbol tiene treinta historias contadas por
cuatro medios. `aplicarCupos()` recorre las historias **de más a menos puntaje** y,
por sección, deja salir solas sólo las N primeras de afuera; el resto pasa a
amarillo ("pasó el cupo de X de afuera (N a la vez)"). **Lo de acá (y lo de la
zona) no cuenta ni ocupa lugar.**

| Sección | Cupo de afuera a la vez |
|---|---|
| Argentina, Economía | 12 |
| Fútbol, Deportes | 10 |
| Tecnología, Política, Cultura y agenda | 8 |
| Automovilismo | 6 |
| Policiales | 0 (la sección es sólo de Balcarce y la zona) |
| Las demás (Agro) | 15 (`CUPO_POR_DEFECTO`) |

Los números están en `CUPO_DE_AFUERA` y `CUPO_POR_DEFECTO`. **Primero los medios,
después el cupo**: al revés, los lugares se los llevaban notas que después
quedaban frenadas.

### 8. La lectura con IA (sólo en la nube)

Una IA lee cada historia nueva y completa una **ficha**, y **decide**. Va antes de
la reescritura, para no gastar cupo escribiendo lo que no va a salir. Todo en
`ingesta/lectura-ia.mjs`; lo llama `generar-datos.mjs`.

**Qué se le manda** (`entradaDeNota`, `pedidoPara`): una instrucción fija
(`INSTRUCCION`: el ámbito es el del hecho y no el del medio, qué va en cada
sección, qué es publicidad, qué es chimento), el **perfil de Balcarce** tal cual
(`ingesta/perfil-balcarce.md`: las localidades, lo que queda cerca pero no es
Balcarce, las rutas, lo que mueve a la ciudad; sólo datos seguros) y, de cada nota,
el identificador, el título, los primeros 500 caracteres del resumen, el medio y
**la ciudad del medio**.

**Qué devuelve cada ficha** (`ESQUEMA`, listas cerradas):

| Campo | Valores |
|---|---|
| `ambito` | balcarce, region, provincia, nacional, internacional |
| `seccion` | una de las once |
| `impacto_balcarce` | directo, indirecto, nulo |
| `razon` | local, servicio, actividad, provincia, nacional, popular, ninguna |
| `importancia` | alta, media, baja |
| `es_publicidad`, `es_chimento` | sí o no |
| `por_que_interesa` | una frase |

`fichaValida()` descarta la ficha entera si un valor no está en su lista (se vuelve
a pedir en otra corrida). Las fichas se guardan en `web/data/fichas.json` y se
borran a los 3 días (`LECTURA.diasDeFichas`).

**Cuánto se pide** (`leerNotasNuevas`): sólo las notas sin ficha, de a 12 por
pedido, hasta 5 pedidos por corrida y 200 por día con la clave propia
`GEMINI_API_KEY_CLASIFICACION` (60 si comparte la de redacción; lo elige
`topeDeLecturas`). El día es el de Balcarce.

**Con qué IA:** Gemini (`gemini-flash-lite-latest`, temperatura 0, esquema
forzado), con `GEMINI_API_KEY_CLASIFICACION` o, si no está, la de redacción;
**nunca la de redes** (`claveClasificacion`, `reels/claves.mjs`). Si Gemini falla,
el mismo grupo va a **Groq** (`GROQ_API_KEY`, `openai/gpt-oss-120b`,
`leerGrupoGroq`) con la misma instrucción y la misma validación. Si las dos dicen
"sin cupo", no se insiste en esa corrida; sin ninguna clave, todo sigue como lo
decidió el sistema.

**Qué hace con la ficha** (`aplicarFichas`). Límites que no se negocian: una nota
roja no se toca, y **la IA sólo puede endurecer** (sacar una nota o mandarla a
esperar), nunca destrabar.

0. **Sin ficha todavía:** lo verde de un medio de acá que no nombra nada de acá (ni
   Balcarce ni la zona en el título o los primeros 600 caracteres, `mencionaAca`) y
   que nunca salió **espera a que la IA lo lea**, si la lectura anda
   (`esperarSinFicha`): así no se cuela la copia de una noticia de afuera. El resto,
   sin ficha, sigue igual.
1. **La saca** (no sale ni queda amarilla, y si tenía página la pierde) si:
   - es publicidad, o es un chimento;
   - el ámbito es internacional y no nombra a una figura argentina ni tiene
     conexión argentina en el título ("es del extranjero": la Fórmula 1 sin un
     argentino, no);
   - el impacto es nulo, no es automovilismo ni figura, no tiene conexión argentina,
     no es una nacional que importa (3 medios o más, importancia alta, o razón
     nacional, popular o servicio) y, si es de un medio de acá, tampoco nombra a
     Balcarce en el título ("no tiene relación con Balcarce");
   - la IA la pone en Policiales y no es de Balcarce.
2. **Dos llaves para ser de Balcarce.** Una nota con la llave de la fuente (un
   medio de acá, o Balcarce en el título) es de Balcarce sólo si la IA dice que el
   hecho es de Balcarce o que la afecta directamente. Si no, queda
   `noEsDeAcaSegunLaIA` (se rige por lo de afuera), deja de ser `local` y pierde 25
   puntos.
3. **La sección es la de la IA**, con dos ajustes: "Balcarce" para lo que no es de
   acá no vale (queda la que tenía) y "Argentina" para lo que sí es de acá pasa a
   Balcarce. Las fichas viejas que dicen Servicios o País se leen como Balcarce y
   Argentina.

**Las repetidas: una noticia, una nota.** El cruce por palabras no junta todo (tres
notas de la misma falsa oferta de empleo salieron con títulos distintos). Entonces:

1. Se le muestran a la IA **las notas que van a salir** y, en otro pedido, **las
   de afuera que esperan por pocos medios** (`agruparRepetidas`,
   `INSTRUCCION_REPETIDAS`: sólo las que cuentan exactamente el mismo hecho).
2. Se pide sólo si cambió la lista, hasta 60 vueltas por día
   (`LECTURA.pedidosRepetidasPorDia`), sólo con Gemini.
3. Los grupos se suman a los de corridas anteriores (`unirGrupos`: si antes A y B,
   y ahora B y C, son A, B y C), mientras sus notas sigan en la ingesta.
4. De cada grupo **queda una** (`quitarRepetidas`): la ya publicada (en la portada
   anterior o en el archivo, dentro de las 36 horas), la verde, la que cuentan más
   medios, la de más puntaje. **Se le suman los medios de las otras.** Las demás
   salen; si alguna ya fue a las redes, conserva su página.

**Después**, con las secciones corregidas y los medios sumados, se vuelven a correr
`exigirMedios` (en los dos sentidos) y `aplicarCupos`. El registro dice "lectura
con IA: N fichas nuevas en P pedidos · sacó X, Y dejaron de ser de Balcarce, Z
cambiaron de sección, W a esperar, R repetidas", con los títulos de lo que sacó.

### 9. La reescritura puede frenar una nota

Cuando la IA escribe la nota (`docs/04-REDACCION.md`), el semáforo se pasa por el
texto completo de la fuente y por lo que escribió, y el código calcula el nivel de
verificación. Si algo da rojo, amarillo o verificación BAJA, **la nota verde cambia
de color** ahí mismo ("… (visto al reescribir)" o "verificación baja: espera a una
persona").

### 10. La fecha de la nota y "llega tarde"

**La fecha** (`fechaReal`, en `generar-datos.mjs`): si la fuente no dio hora, es
**la primera vez que se vio la nota** (`web/data/vistas.json`,
`docs/02-INGESTA.md`, paso 5). Si la dio, es **la más vieja que se conoce** entre
la de la ingesta, la de cada fuente, la que ya tenía publicada y la primera vista
(`fechaDeLaNota`, `web/lib/archivo.js`). **Una nota puede envejecer, nunca
rejuvenecer**: un medio que "actualiza" su nota no la devuelve a la tapa. Es la
fecha que se muestra, la que ordena y la que decide lo que sigue.

**Llega tarde** (`llegaTarde`): una nota que **nunca salió** no se estrena si el
hecho tiene más de **12 horas** (`HORAS_PARA_ESTRENAR`, igual a
`PORTADA.horasParaEstrenar`): esperando medios o cuerpo, lo de afuera salía con el
hecho de días atrás. Lo que ya salió sigue su curso, y lo que publicó una persona
también. A una nota que llega tarde tampoco se le pide texto a la IA.

### 11. La decisión final: `notaPublicada`

`generar-datos.mjs` decide, nota por nota y en este orden:

1. **¿Está retirada a mano?** (`web/data/retiradas.json`, paso 13): no sale.
2. **¿Quién manda?** Si una persona decidió (`decisionHumana`: una decisión con
   `por` y que no sea de la IA), manda esa decisión. Las del celular
   (`web/data/celular-decisiones.json`) se ponen encima de las del panel de la PC
   (`web/data/decisiones.json`) y, si las dos decidieron sobre la misma nota, gana
   la más nueva (`unirDecisiones`, `panel/celular-datos.mjs`). Si nadie decidió,
   el semáforo: verde = automática, rojo = bloqueada, amarillo = pendiente. Sólo
   "publicada" y "automática" siguen.
3. **¿Llega tarde?** (paso 10), salvo que la haya publicado una persona o ya haya
   salido.
4. **¿Qué texto lleva?** El de la persona; si no, el de la IA (de esta corrida o de
   una anterior); si no, el resumen de la fuente. El título automático pasa por los
   arreglos mecánicos (`tituloAutomatico`, `docs/04-REDACCION.md`, paso 7). Se
   arman las "Fuentes consultadas" con los enlaces reales si nadie las completó.
5. **La dirección** se fija la primera vez que sale (`fijarSlug`) y no cambia más
   (`docs/06-WEB.md`).
6. **Las correcciones** (`web/data/correcciones.json`, paso 13) pisan título,
   bajada, sección o cuerpo.
7. **Lo que no se publica nunca**, otra vez, sobre el título y la bajada finales,
   **aunque la haya aprobado una persona** (`nuncaSePublica`): una lista de sepelios
   que se coló con otro título no sale.
8. **Sin cuerpo no se publica** (`tieneCuerpo`, `web/lib/cuerpo.js`): la nota
   automática sin cuerpo de 70 palabras o más queda "esperando cuerpo"
   (`docs/04-REDACCION.md`, paso 12). Lo que publicó una persona se respeta.

Lo que pasa los ocho pasos se publica en la web. Lo que salió porque lo aprobó una
persona (era amarillo) va a las redes sólo si esa persona lo marcó
(`docs/07-REDES.md`).

### 12. Las ventanas: cuánto se queda una nota a la vista

| Ventana | Cuánto | Dónde | Qué hace |
|---|---|---|---|
| Colador de lo raspado | 72 h | `HORAS_DE_UNA_NOTA_NUEVA` | Lo raspado más viejo no entra (`docs/02-INGESTA.md`) |
| Memoria del cruce | 36 h | `CRUCE.horasDeMemoria` | Con qué se cruza cada nota |
| Estreno | 12 h | `HORAS_PARA_ESTRENAR` = `PORTADA.horasParaEstrenar` | Lo nunca publicado más viejo no sale |
| Portada y secciones | 36 h | `HORAS_EN_PORTADA` = `PORTADA.horas` | Lo que se muestra en las listas (`vigenteEnPortada`) |
| Nota grande de la tapa | 6 h | `VENTANA_HORAS` (`web/lib/datos.js`) = `PORTADA.horasNotaGrande` | Cuánto compite una nota por el lugar grande |
| Página de la nota | 180 días | `DIAS_DE_ARCHIVO` = `PORTADA.diasDeArchivo` | Cuánto existe su página |
| Fichas de la IA | 3 días | `LECTURA.diasDeFichas` | Cuánto se recuerda una ficha |
| Primera vista | 7 días | `DIAS_DE_VISTAS` | Cuánto se recuerda cuándo se vio |
| Retiradas a mano | 7 días | `DIAS_DE_RETIRADAS` | Los lunes salen de la lista las más viejas que la ingesta ya no trae |
| Panel de la PC: archivar lo no decidido | 72 h | `HORAS_PARA_ARCHIVAR` (`panel/servidor.mjs`) | En la PC, lo que nadie decidió se archiva (`docs/09-PANEL.md`) |

`ingesta/criterio.mjs` guarda las 36, 12 y 6 horas y los 180 días; la web usa sus
propias constantes (se compilan con el sitio) y `pruebas/criterio.test.mjs` y
`pruebas/archivo.test.mjs` controlan que sean iguales.

En las listas no conviven **dos notas con el mismo titular (o casi)**: queda la de
más puntaje y la otra conserva su página (`sinNotasRepetidas`, `web/lib/texto.js`).
Si la misma noticia volvió a entrar **con otra dirección**, se unen: queda una y la
dirección de la otra redirige (`web/lib/repetidas.js`, `docs/06-WEB.md`).

**Cuándo una nota pierde su página** (sale de `web/data/archivo.json`):

- si una persona la bloqueó, la descartó o la retiró (desde un panel o en
  `retiradas.json`);
- si hoy la ingesta la trae en rojo, o en amarillo **por lo que dice**
  (`pierdeLaPagina`, `web/lib/archivo.js`). La cotización del dólar y lo de afuera
  que espera sólo por el cupo o por los medios (`esperaSoloPorCantidad`) conservan
  la página;
- si es una lista de sepelios, aunque la haya aprobado una persona;
- si la lectura con IA la sacó en esta corrida, o quedó fuera como repetida y no
  fue a las redes;
- si es una repetida con otra dirección (su dirección redirige a la que queda);
- si es una página vieja con "EN VIVO" o "minuto a minuto" en el título
  (`diceEnVivo`; "música en vivo" sí), salvo que la haya decidido una persona;
- si es de afuera y no de la zona, la contó un solo medio, no es oficial y no fue a
  las redes (`tieneRespaldo`);
- si pasó de 180 días.

Detalle en `docs/06-WEB.md`.

### 13. Retirar y corregir

**Desde el panel del celular** (lo de todos los días, `docs/09-PANEL.md`):
"Retirar de la web" deja la nota `bloqueada`, con su motivo, en
`web/data/celular-decisiones.json`; editar título, bajada, cuerpo o sección escribe
en `web/data/correcciones.json` (con `deIA: true` si el texto lo escribió la IA y
lo revisó la persona). Ningún workflow toca esos dos archivos.

**Sin panel, a mano** (una persona o Claude, a pedido). El panel de la PC pisa
`web/data/decisiones.json` cada vez que guarda: por eso hay dos archivos propios, y
cada entrada **tiene que decir `motivo`, `cuando` y `por`** (sin `motivo` no vale;
sin `cuando` y `por` fallan las pruebas y la web se congela):

**`web/data/retiradas.json`: sacar una nota.**

```json
{"notas":{
"bclpti":{"motivo":"aviso de viaje a un show de un tercero, sin hecho de Balcarce","titulo":"Habrá viaje desde Balcarce…","medio":"Infórmese Primero (FM 104.9)","cuando":"2026-09-28","por":"repaso editorial de Claude, pedido por Hernán"}
}}
```

La nota no sale en ninguna lista y **pierde su página**, aunque la ingesta la
vuelva a traer (`idsRetiradosAMano`). Los lunes, en la nube, salen de la lista las
de más de 7 días que la ingesta ya no trae (`podarRetiradas`, regla 69): a esa
altura la nota ya no se puede estrenar.

**`web/data/correcciones.json`: corregir una nota.** Se puede cambiar `titulo`,
`copete`, `seccion` o `cuerpo` (`CAMPOS_CORREGIBLES`). Manda sobre lo que escriba
la IA en cualquier corrida, se aplica también a la página vieja del archivo y **la
dirección no cambia** (`correccionesAMano`, `conCorreccion`). Cómo escribir un
cuerpo ahí: `docs/04-REDACCION.md`, paso 12.

Los dos archivos los lee `generar-datos.mjs` al empezar: el cambio se ve en la
corrida siguiente de "Actualizar la web".

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama |
|---|---|---|
| `ingesta/ingesta.mjs` | `clasificar`, `relevancia`, `semaforo`, `esDeAca`, `mediosMinimosDe`, `exigirMedios`, `aplicarCupos`, `esPolicialDeAfuera`; `semaforoDelTexto` (las listas sobre cualquier texto) | `ingestar()`; `generar-datos.mjs`; `reels/reescritura.mjs` |
| `ingesta/fuentes.mjs` | `REGLAS_SECCION`, `REGLAS_SEMAFORO` (rojo, nunca, amarillo, amarilloMuerte, promocional, cotizacion, internacional), `AMARILLO_MENORES`, `PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO`, `FIGURAS`, `TEMAS` | Todo el motor |
| `ingesta/criterio.mjs` | Los números: `MEDIOS_DE_AFUERA`, `MEDIOS_POR_DEFECTO`, `MEDIOS_CON_FIGURA`, `CUPO_DE_AFUERA`, `CUPO_POR_DEFECTO`, `PORTADA` | Todo |
| `ingesta/lectura-ia.mjs` | Fichas (`leerNotasNuevas`, `aplicarFichas`, `mencionaAca`), repetidas (`agruparRepetidas`, `unirGrupos`, `quitarRepetidas`) | `generar-datos.mjs` (nube) |
| `ingesta/perfil-balcarce.md` | Lo que la IA sabe de Balcarce | `lectura-ia.mjs` |
| `ingesta/utiles.mjs` | `decisionHumana`: qué decisión es de una persona | `generar-datos.mjs`, `reels/reescritura.mjs`, paneles |
| `panel/celular-datos.mjs` | Lee las decisiones del celular y las une con las de la PC (`leerDecisionesCelular`, `unirDecisiones`) | `generar-datos.mjs` |
| `web/scripts/generar-datos.mjs` | Orquesta todo: lectura con IA, reescritura, `fechaReal`, `notaPublicada`, fotos, archivo | `actualizar.yml` (nube); a mano en la PC |
| `web/lib/archivo.js` | `HORAS_EN_PORTADA`, `HORAS_PARA_ESTRENAR`, `vigenteEnPortada`, `llegaTarde`, `fechaDeLaNota`, `pierdeLaPagina`, `esDeLoQueNuncaSePublica`, retiradas y correcciones | `generar-datos.mjs`, la web |
| `web/lib/cuerpo.js` | `tieneCuerpo`, `tieneRespaldo` | `generar-datos.mjs`, la web, redes |
| `web/lib/texto.js`, `web/lib/repetidas.js` | Las repetidas por titular (`sinNotasRepetidas`) y las que volvieron con otra dirección | `generar-datos.mjs` |
| `web/data/celular-decisiones.json`, `correcciones.json`, `retiradas.json`, `decisiones.json` | Lo que decidió una persona: desde el celular, a mano o desde el panel de la PC | Los paneles, una persona o Claude |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Que una palabra mande una nota a otra sección | `REGLAS_SECCION` (`ingesta/fuentes.mjs`); si es ambigua, además en `PALABRAS_DEBILES` (`ingesta/ingesta.mjs`) |
| Que un feed de Tecnología sólo se crea con ciertas palabras en el título | `PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO` (`ingesta/fuentes.mjs`) |
| Cambiar qué suma al puntaje | `relevancia()` (`ingesta/ingesta.mjs`) |
| Que algo espere a una persona o nunca salga | `REGLAS_SEMAFORO` (`ingesta/fuentes.mjs`). **La lista roja, no sin preguntar** |
| Cuántos medios pide cada sección, o cuántas de afuera salen a la vez | `MEDIOS_DE_AFUERA`, `MEDIOS_POR_DEFECTO`, `MEDIOS_CON_FIGURA`, `CUPO_DE_AFUERA`, `CUPO_POR_DEFECTO` (`ingesta/criterio.mjs`) **y** la tabla de `CRITERIO-EDITORIAL.md` § 11 |
| Qué es "de acá" | `esDeAca()` (`ingesta/ingesta.mjs`), `PALABRAS_LOCALES` y `PALABRAS_ZONA` (`ingesta/fuentes.mjs`) |
| Qué sabe la IA de Balcarce | `ingesta/perfil-balcarce.md` (sólo datos seguros) |
| Qué saca la IA, cómo elige la sección o cuánto lee por día | `INSTRUCCION`, `aplicarFichas`, `LECTURA` y `topeDeLecturas` (`ingesta/lectura-ia.mjs`) |
| Cuántas horas tiene un hecho para estrenarse, o cuánto se queda en la portada | `PORTADA` (`ingesta/criterio.mjs`) **y** `HORAS_PARA_ESTRENAR`, `HORAS_EN_PORTADA` (`web/lib/archivo.js`) **y** `CRITERIO-EDITORIAL.md` § 11 |
| Sacar o corregir una nota sin el celular | `web/data/retiradas.json` / `web/data/correcciones.json` |

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| La IA de lectura se queda sin cupo | "lectura con IA: falló un pedido (HTTP 429)" en el registro; las notas sin ficha salen como las decidió el sistema (salvo lo de un medio de acá que no nombra nada de acá, que espera sólo si la lectura anda) | Revisar `GEMINI_API_KEY_CLASIFICACION` y `GROQ_API_KEY` |
| La IA saca algo que sí era de Balcarce | Aparece en "fuera (…)" del registro de "Actualizar la web" | Anotar el caso y ajustar `INSTRUCCION` o el perfil; mientras, publicarla desde el panel del celular |
| Una nota de afuera ya publicada rebota en el cupo o en los medios | En una corrida pasa a amarilla y sale de las listas, pero **conserva la página**; si vuelve a verde, vuelve a las listas aunque tenga más de 12 horas (ya salió) | Nada; si importa, aprobarla desde el panel del celular |
| `aplicarCupos` sólo baja | Una nota que quedó amarilla por el cupo en la ingesta no vuelve a verde aunque la IA saque otras de su sección | Se corrige sola en la corrida siguiente |
| El panel de la PC y la nube archivan distinto | En la PC, lo no decidido se archiva a las 72 horas; la web deja de mostrarlo a las 36 | Nada: la web manda en lo que se ve |
| La portada queda vacía de lo de afuera | "de afuera y poco contada" en muchas notas | Revisar que el cruce tenga memoria y que las fuentes estén vivas (`docs/02-INGESTA.md`) |

Lo que falta, en `PENDIENTES.md`.

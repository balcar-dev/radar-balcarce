# 04 · La redacción: cómo se escribe, se verifica y se firma una nota

*Escrito el 28/09/2026 contra el código de ese día. Si el código cambia, manda el código.*

Este documento cuenta qué pasa desde que una historia está en verde
(`docs/03-SELECCION.md`) hasta que tiene título, bajada y cuerpo propios,
verificados contra sus fuentes, o queda "esperando cuerpo". **Las reglas de
escritura no se repiten acá**: son una sola y están en
[`CRITERIO-EDITORIAL.md`](../CRITERIO-EDITORIAL.md). Acá se cuenta cómo el
código las hace cumplir y se remite a la sección que corresponde.

## En una frase

A cada nota verde que nadie revisó se le baja el texto completo de la fuente,
se le manda a Gemini con la instrucción de `CRITERIO-EDITORIAL.md` § 12 y todas
sus fuentes numeradas, lo que devuelve se arregla sin inventar y se compara
dato por dato contra lo que recibió; si pasa y tiene un cuerpo de 70 palabras o
más, se publica con la firma "Redacción con IA"; si no, se reintenta hasta tres
veces y mientras tanto la nota no sale.

---

## El recorrido, paso a paso

Todo pasa en `reescribirAutomaticas()` (`reels/reescritura.mjs`). La llaman
dos lugares: `web/scripts/generar-datos.mjs` en cada corrida de "Actualizar la
web" (en la nube, con la PC apagada) y el panel en la PC
(`reescribirPendientes`, `panel/servidor.mjs`, cada 10 minutos, 12 notas por
vuelta; ver `docs/09-PANEL.md`). **El flujo es el mismo en los dos lados.**

### 1. Qué notas se escriben

En la nube, `generar-datos.mjs` le pasa las notas de la ingesta menos:

- las que ya tienen un cuerpo escrito a mano en `web/data/correcciones.json`
  (no se gasta cupo en algo que no se va a usar; paso 12);
- las que ya no están dentro de las 36 horas de la portada;
- las que **llegan tarde** (hecho de más de 12 horas y nunca publicadas:
  `docs/03-SELECCION.md`, paso 10).

Las que ya estaban escritas por la IA (paso 2) se pasan siempre, para
revisarlas.

De ésas, `reescribirAutomaticas` toma sólo las **verdes** y **sin decisión de
una persona** (`decisionHumana`). Lo amarillo espera a alguien que lo mire en
el panel; lo que decidió una persona no se toca nunca.

**En qué orden** (`ordenarParaReescribir`), porque el cupo del día es limitado:

1. **Primero lo de Balcarce** (`esLocal`: `local`, sección Balcarce o fuente de
   acá). Entre ellas, lo más nuevo (por tramos de 6 horas) y, a igual tramo,
   el de más puntaje.
2. **Después lo de afuera, repartido por sección**: a cada nota se le asigna
   el "lugar" que ocuparía en su sección, contando como ocupados los lugares de
   las notas que ya tienen cuerpo. Se escribe primero el lugar 1 de cada
   sección, después el 2, y así. Así ninguna sección queda vacía porque
   Política y Deportes siempre tienen más puntaje.

### 2. Lo que ya estaba escrito se reusa (y se revisa)

`previas` son las notas que la portada anterior o el archivo ya tienen
escritas por la IA (con guion y con cuerpo de verdad: `previasDeLaPortada`).
Una nota así **no se vuelve a pedir** (nunca se paga dos veces), pero en cada
corrida:

1. se le aplican los arreglos que no inventan nada (`arreglarEscritura`, paso
   7: "este sábado" pasa a "el sábado" cuando ya no es sábado, una etiqueta
   adelante del título, una tilde);
2. sus partes internas se revalidan con las reglas de forma de hoy
   (`revalidarExtras`) y la que ya no pasa se borra;
3. todo pasa otra vez por el semáforo (`semaforoDeLaReescritura`) y por el
   nivel de verificación: si da rojo, amarillo o BAJA, la nota deja de salir
   sola en esta misma corrida;
4. el título, la bajada, el cuerpo y el guion pasan por el verificador **sólo
   en la forma** (`soloForma`: largo, acusaciones, "más", "en vivo", relleno,
   gancho, forma del título, negación, que el cuerpo no repita la bajada,
   copia). Los datos no se vuelven a comparar: se compararon contra el texto
   completo cuando se escribió, y ese texto no se vuelve a bajar.

Si no pasa, esa escritura no se usa y la nota vuelve a ser candidata en otra
corrida.

**Límite:** esto sólo alcanza a las notas que la ingesta todavía trae. Una nota
que la fuente sacó de su feed queda como estaba escrita (ver "Qué puede
fallar").

### 3. Los topes

| Tope | Cuánto | Constante |
|---|---|---|
| Notas que se le piden a la IA por corrida | 40 (en el panel, 12 por vuelta) | `REESCRITURA.porCorrida`; `REESCRITURAS_POR_CICLO` en el panel |
| Fallas de Gemini en una corrida para dejar de insistir | 3 | `FALLOS_PARA_CORTAR` |
| Notas por día (día de Balcarce), con la clave de lectura propia cargada | 450 | `REESCRITURA.porDia` |
| Lo mismo, mientras la lectura con IA comparte la clave gratis | 330 | `REESCRITURA.porDiaSinClaveDeLectura` (lo elige `topeDeReescrituras`) |
| De esas, las últimas reservadas para lo de Balcarce | 80 (lo de afuera deja de pedirse a los 370, o a los 250) | `REESCRITURA.reservaParaLocales` |
| Intentos por nota, en corridas distintas | 3 | `REESCRITURA.intentosMaximos` (`MAXIMO_DE_INTENTOS`) |
| Días que se recuerdan los intentos | 7 | `REESCRITURA.diasDeIntentos` |

Los pedidos del día se cuentan con los intentos guardados en
`web/data/intentos-ia.json` (`pedidasHoy`; en el panel, en su propio estado).
Cada intento guarda cuántos van, cuándo fue el último y por qué:
`{"intentos":1,"ultimo":"2026-09-27T13:31:22Z","motivo":"título o bajada: 4 problemas (numero): el titulo dice 70 y la fuente no lo dice"}`.

**Una falla del servicio no cuenta como intento** (sin cupo, 503, sin red,
sin clave, tiempo agotado: `FALLA_DEL_SERVICIO`): no se gastó nada. Una
respuesta que no sirve, sí.

**Una nota que ya dio verificación BAJA** no se vuelve a pedir, salvo que hoy
tenga más fuentes que entonces (con más fuentes el nivel puede subir).

### 4. Lo que se junta antes de pedir

1. **El texto completo** de la nota original (`textoCompletoDe`): primero el de
   la principal (de su `enlaceFeed` si es Blogger); si no se pudo bajar, el de
   la primera que se pueda entre hasta tres de las otras fuentes. Queda
   anotado de qué fuente es ("Texto completo de la Fuente 2"). Cómo se saca el
   texto de la página: `docs/02-INGESTA.md`, paso 14. Hasta 4.000 caracteres
   (`REESCRITURA.caracteresDelTextoCompleto`).
2. **Los antecedentes** (`antecedentesDe`): hasta 3 notas
   (`REESCRITURA.antecedentesMaximo`) que el sitio ya publicó en los últimos 30
   días (`REESCRITURA.diasDeAntecedentes`), anteriores a esta, que comparten
   un tema de los que se siguen (`TEMAS`) o dos palabras que dicen algo del
   titular. Las más parecidas primero. Salen de `web/data/archivo.json`: **no
   se busca nada en internet**, a propósito (`CRITERIO-EDITORIAL.md` § 5).
3. **El semáforo sobre la fuente** (`semaforoDeLaReescritura`): el texto
   completo y los resúmenes de los otros medios pasan por la lista roja y la
   de menores y víctimas (`AMARILLO_MENORES`). Si un nombre de un chico está
   en el tercer párrafo, la nota se frena **antes** de gastar un pedido.
4. **¿Hay material?** Sin texto completo de ninguna fuente y con menos de 60
   palabras entre todos los resúmenes (`REESCRITURA.palabrasMinimasDeMaterial`),
   no se le pide nada a la IA ("sin material"): sería pagar por relleno. Cuenta
   como intento: en otra corrida quizás otro medio contó más.

### 5. El pedido a la IA

**La instrucción** es la sección 12 de `CRITERIO-EDITORIAL.md`, **tal cual**.
`ingesta/prompt-editorial.mjs` la lee del archivo al arrancar, buscando las
marcas `<!-- PROMPT:… -->`; si el archivo no está o le falta una parte, lanza
un error y la reescritura no arranca ("la IA no escribe sin criterio"). Se arma
con las reglas fijas y, en el lugar de `{{TONO}}`, uno de los dos tonos:

- **el serio**, si la nota es de Policiales o el título o el resumen tienen
  una de las palabras de la lista `PALABRAS_SERIAS` (robo, choque, incendio,
  corte de luz, protesta, emergencia…; está en `CRITERIO-EDITORIAL.md` § 4,
  entre las marcas `PALABRAS_SERIAS`), lo decide `esTemaSerio`;
- **el de todos los días**, en el resto.

**Lo que va después de la instrucción** (`entradaDe`), por ejemplo:

```
Fecha de hoy: lunes 28/09/2026
Sección: Automovilismo
Titular original (de Diario La Vanguardia / Radio Gabal (FM 104.1)): …
FUENTES (2, numeradas):
Fuente 1 (Diario La Vanguardia · publicada el domingo 27/09/2026): resumen…
Fuente 2 (Radio Gabal (FM 104.1) · publicada el domingo 27/09/2026): resumen…
Texto completo de la Fuente 1 (de acá sale la mayor parte de lo que podés contar en el cuerpo):
…
ANTECEDENTES: notas que Radar Balcarce publicó ANTES sobre el tema. Es información ANTERIOR, no de hoy: …
[21/09/2026] Título de la nota anterior. Su bajada.
```

Con una sola fuente, la línea dice "una sola: no hay confirmación
independiente". Las fuentes oficiales van marcadas "fuente oficial". La fecha
de hoy y la de cada fuente llevan **el día de la semana**, para que la IA sepa
si "el sábado" de la fuente ya pasó (28/09: "participan este viernes", leído el
lunes).

**Cómo se pide:** Gemini `gemini-flash-lite-latest` (el "flash" normal daba 503
de alta demanda seguido), temperatura 0,6, respuesta en JSON, 60 segundos como
máximo. Con un 503 se espera 4 segundos y se reintenta, hasta 3 veces. La clave
es primero `GEMINI_API_KEY_REDACCION` (gratis; acepta el nombre viejo
`GEMINI_API_KEY`); **sólo si esa dice "sin cupo" (429)** se reintenta una vez
con `GEMINI_API_KEY_REDES`, que es paga. El registro dice cuántos pedidos fueron
a cada una ("claves de Gemini usadas: N con la gratis, M con la paga").

**Lo que tiene que devolver**, un JSON con: `titulo`, `copete` (la bajada),
`cuerpo`, `guion`, `claves`, `seSabe`, `noConfirmado`, `aportes`,
`textoRedes`, `etiquetas` y `nivel`. Si el JSON trae una barra invertida mal
formada, se repara antes de leerlo (`repararEscapes`, 28/09: la mitad de los
pedidos de una corrida se perdían por eso). Sin título o sin guion, la
respuesta no sirve.

### 6. Cómo se escribe cada parte

Resumen; las reglas completas, con ejemplos de bien y mal, están en
`CRITERIO-EDITORIAL.md`:

| Parte | En pocas palabras | Dónde está la regla |
|---|---|---|
| **Título** | Una frase completa, en presente, que dice qué pasó; unos 70 caracteres (`TITULO.objetivo`) y nunca más de 90 (`TITULO.maximo`); sin etiqueta adelante, sin cortar, sin signos ni gancho, sin "en Balcarce" al final, nunca "en vivo" | § 4 "El título"; § 12 regla 2 |
| **Bajada** (campo `copete`) | Dos o tres frases (`BAJADA.frasesMinimas`/`frasesMaximas`), unas 50 palabras (`BAJADA.palabras`), hasta 360 caracteres (`BAJADA.maximo`); completa el título, no lo repite; lo que promete, el cuerpo lo cuenta | § 4 "La bajada"; § 12 regla 3 |
| **Cuerpo** | Obligatorio; de 70 a 180 palabras (`CUERPO.palabrasPedidasMinimo`/`Maximo`), nunca más largo que los datos; hasta 3 párrafos (`CUERPO.parrafosMaximo`) y 1.800 caracteres (`CUERPO.maximo`); pirámide invertida; sólo con lo de las fuentes; explica lo que promete el título; pasado para lo que ya pasó; sin relleno ni muletillas de IA | § 4 "El cuerpo"; § 12 reglas 4, 6, 9, 11, 14 a 20 |
| **Guion** | El título dicho tal cual, unos 10 segundos (`GUION.segundos`), hasta 200 caracteres (`GUION.maximo`). Lo usan las redes | § 4 "El guion"; § 12 regla 7 |
| **Las fuentes** | Se contrastan: lo que confirman varias va como hecho, lo de una sola atribuido, lo que se contradice con las dos versiones; nunca el nombre del medio en el texto | § 5; § 12 pasos A a H y reglas 8, 16 |
| **Acusaciones** | Siempre atribuidas y en condicional (doctrina Campillay) | § 2, § 5; § 12 regla 10 |
| **Menores y víctimas** | Nunca identificables, aunque la fuente lo haga | § 2; § 12 regla 13 |
| **Partes internas** | Claves (3 a 5), qué se sabe, qué falta confirmar, lo que aportó cada fuente, texto para redes (280), etiquetas (3 a 8), nivel sugerido | § 4 "Lo que la IA escribe para la redacción"; § 12 final |

Todos los números están en `ingesta/criterio.mjs` y en la tabla de
`CRITERIO-EDITORIAL.md` § 11 (una prueba controla que coincidan).

### 7. Los arreglos automáticos: lo que se corrige sin inventar

Antes de verificar, **`arreglarEscritura()`** (`ingesta/verificar.mjs`) corrige
lo que se puede corregir sin agregar ningún dato, en lo nuevo y en lo ya
escrito:

| Qué | Cómo queda |
|---|---|
| Una etiqueta **conocida** con dos puntos adelante del título (una sección, un deporte, "Exclusivo", "Video", "Urgente"…: `ETIQUETAS_CONOCIDAS`, `web/lib/titulos.js`), si lo que sigue tiene cuatro palabras o más | "Rugby: Pato Naranja gana…" → "Pato Naranja gana…". Una etiqueta desconocida puede ser un lugar ("Necochea: …") y no se toca: la rechaza el verificador |
| Una coma, un signo o un conector colgando al final del título | "…toda la cadena productiva del país," → "…del país" (`sinCierreColgado`) |
| "Este" + un día de la semana que no es hoy (en cualquier parte) | "participan este viernes" (leído el lunes) → "participan el viernes". "Este fin de semana", salvo sábado o domingo, → "el fin de semana". No se calcula la fecha: sería inventarla |
| "Cabe destacar que…", "Es importante señalar que…" y parecidas al comienzo de una oración de la bajada o el cuerpo | Se saca la muletilla y queda la oración |
| Una o dos palabras sin la tilde que siempre llevan (también, según, reunión, información…) | Se les pone (con tres o más, se rechaza: paso 8) |

Y **al publicar**, `tituloAutomatico()` (`web/lib/titulos.js`) aplica al título
y al guion automáticos, también a los ya publicados: la etiqueta conocida
adelante, el cierre colgado y **"en Balcarce" al final** (`sinBalcarceAlFinal`:
"… en Balcarce" o "… de la ciudad de Balcarce", si quedan cuatro palabras o
más; el 27/09 lo tenían 44 de 66 títulos). Lo que escribió una persona no se
toca.

### 8. La verificación: cada control

`verificar()` (`ingesta/verificar.mjs`) compara lo que escribió la IA **contra
todo lo que recibió**: el titular original, el resumen de cada fuente y el texto
completo (juntos, `fuenteParaVerificar`), y aparte los antecedentes. No usa otra
IA: son comparaciones mecánicas, gratis y siempre iguales. Es estricto a
propósito.

Hay controles que **valen siempre** (también al revisar lo ya escrito, paso 2)
y otros que **valen sólo en lo nuevo** (miran los datos contra el texto
completo, que no se vuelve a bajar, o son reglas de estilo que no justifican
bajar una nota ya publicada). Los ejemplos marcados "real" salieron de
`web/data/intentos-ia.json` o de un caso contado en el código; los marcados
"prueba", de `pruebas/verificar.test.mjs`.

**Sobre los datos (sólo en lo nuevo):**

| Control | Qué rechaza | Ejemplo |
|---|---|---|
| `numero` | Una cifra o un número escrito en palabras que las fuentes no traen. Los de menos de 100 tienen que ser exactos; los grandes admiten un 6 % de redondeo. "Un millón y medio" se lee como 1.500.000 | Real: "el título dice 70 y la fuente no lo dice" (27 notas así en la última semana) |
| `nombre` | Un nombre propio o una sigla que las fuentes no nombran (sin contar Balcarce, Argentina, Buenos Aires, Radar, los días y los meses; un plural o femenino del mismo nombre no cuenta) | Real: "el copete nombra a 'municipalidad' y la fuente no" |
| `fecha` | Un día de la semana o un mes que las fuentes no dicen | Real: "el cuerpo menciona 'septiembre' y la fuente no" |
| `cita` | Algo entre comillas que no está textual en las fuentes | Prueba: "El boxeador dijo: 'Es el día más feliz de mi vida'" |
| `antecedente` | Un dato que sólo está en una nota anterior usado como si fuera de hoy. En el cuerpo, las claves y lo que se sabe, vale si la oración lo marca como anterior ("en agosto", "la semana pasada", "como se había informado"); en el título, la bajada, el guion y el texto para redes, nunca. Un día de la semana de un antecedente, nunca | Real: "el cuerpo usa 'viernes', que sale de una nota anterior, como si fuera de hoy" |

**De forma y de criterio (valen siempre):**

| Control | Qué rechaza | Ejemplo |
|---|---|---|
| `lugar` | Una nota que no es de Balcarce con Balcarce en el título, si el titular original no lo decía | Real (27/09): "Comienza la Invasión de Pueblos en Necochea con presencia de jóvenes de Balcarce" |
| `vacio` | Sin título o sin bajada | — |
| `largo` | Pasar el máximo de cada parte (título 90, bajada 360, guion 200, cuerpo 1.800; claves 180, datos 260, aporte 220, texto para redes 280, etiqueta 40) | Un título de 95 caracteres |
| `acusacion` | Un verbo de delito en pasado (asesinó, mató, robó, estafó, abusó…) sin ninguna atribución en el mismo texto (según, habría, presunto, supuesto, acusado, la denuncia, imputado, investigan, policía, fiscal, justicia…). Se mira con tildes: "un robo" o "un presunto abuso" no son "robó" ni "abusó" (28/09) | Prueba: "Asesinó a su vecino" sin atribuir. Real (antes del 28/09 se rechazaba por error): "Difunden un nuevo video sobre un presunto abuso…", que hoy pasa |
| `negacion` | Una negación (no, nunca, jamás, tampoco, ni) en el título o la bajada que las fuentes no tienen, o una del titular original que desapareció | Real: "la fuente niega algo en el título y el texto nuevo no" (28 notas así) |
| `repite` | El primer párrafo del cuerpo dice casi lo mismo que la bajada (70 % de palabras en común) o arranca con sus mismas palabras | Real: "el cuerpo repite el copete en vez de desarrollarlo" |
| `copia` | Más de 12 palabras seguidas copiadas del original (`COPIA_MAXIMA`) | Real: "copia 13 palabras seguidas del original" |
| `tilde` | "mas" o "ms" en vez de "más" | Real (23/09): "con ms de ciento sesenta atletas" |
| `forma` (en vivo) | "En vivo", "en directo", "minuto a minuto" o "live" en el título, la bajada, el guion o el texto para redes ("música en vivo" sí) | Real (25/09): "Dólar hoy y dólar blue en vivo" |
| `relleno` | Una frase de la lista `RELLENO` (`ingesta/criterio.mjs`, `CRITERIO-EDITORIAL.md` § 4), aunque la fuente la diga; y "como se había informado" sin antecedentes | Real: "el copete tiene una frase de relleno sin dato: 'en el marco de'" |
| `localia` | "De nuestra ciudad", "nuestros vecinos", "balcarcense", "automovilistas locales", "productores locales"… cuando las fuentes no dicen Balcarce | Prueba: "Es una buena noticia para los automovilistas locales" en una nota de YPF |
| `gancho` | "Lo que tenés que saber", "enterate", "te contamos", "no te lo pierdas", "imperdible"… en lo que se ve primero | "Lo que tenés que saber del corte de luz" (`CRITERIO-EDITORIAL.md` § 4) |
| `titulo` | Signos de admiración o pregunta; una etiqueta con dos puntos que no se pudo sacar sola; cortado en coma o conector; un arranque sin hecho ("Preocupación por…", "Cruce en Balcarce por…"); un adjetivo de gancho (impresionante, tremendo, increíble, insólito) | Real (28/09): "Tecnopapa, el evento que reunirá a toda la cadena productiva del país," |

**De estilo (sólo en lo nuevo, `problemasDeEstilo`, 28/09):**

| Control | Qué rechaza | Ejemplo |
|---|---|---|
| `pasado` | El título con el verbo principal en pasado (terminado en "-ó", "-aron", "-ieron", o fue, hizo, dijo…). No cuenta el verbo de una subordinada ("Detienen al hombre que robó una moto" pasa) ni lo que va entre comillas | Real (28/09): "El intendente repasó las obras del año" |
| `tildes` | Tres palabras o más sin la tilde que siempre llevan (`ESTILO.palabrasSinTilde`) | "La reunion, que conto con la participacion de productores…" (`CRITERIO-EDITORIAL.md` § 4) |
| `promesa` | Un número del título que el cuerpo no dice, o dos nombres del título o más que el cuerpo no nombra | Real (28/09): un título nombraba a tres sancionados y el cuerpo explicaba uno |

Las partes internas pasan por los mismos controles, cada una por su lado
(`verificarExtras`, paso 10).

### 9. Qué pasa cuando algo no pasa

`evaluar()`, adentro de `reescribirAutomaticas`:

1. **Si falla el título, la bajada o el guion**, la escritura entera no sirve.
2. **Si falla el cuerpo**, se sacan sólo **las oraciones** con problemas
   (`depurarCuerpo`: cada oración pasa sola por los controles de datos y por
   el de copia; si después el primer párrafo repite la bajada, se va ese
   párrafo). Si lo que queda pasa entero y tiene 70 palabras o más, se usa. El
   registro dice "oraciones sacadas · nota X · 2 (numero), quedan 94 palabras".
3. **Si no alcanza, un segundo pedido** en la misma corrida, con una
   "CORRECCIÓN OBLIGATORIA" que le dice a la IA qué falló (hasta seis
   problemas) y, si el cuerpo quedó corto, que es obligatorio y de 70 a 180
   palabras.
4. **Si tampoco**, la nota no sale, se anota el intento con el motivo
   ("IA rechazada · título · cuerpo: 3 problemas (numero, copia)…; sin esas
   oraciones quedan 22 palabras") y se vuelve a probar en otra corrida, hasta
   el tercer intento.

Si Gemini falla del todo, `reescribirConRespaldo` devuelve el armado mecánico
de antes (el titular y el resumen de la fuente), pero `reescribirAutomaticas`
**no lo publica**: sin cuerpo, no sale.

### 10. Las partes internas y el nivel de verificación

`completarReescritura()` (`reels/reescritura.mjs`):

1. **Claves, qué se sabe, qué falta confirmar, lo que aportó cada fuente,
   texto para redes y etiquetas** pasan por el verificador cada una por su
   lado (`verificarExtras`). La que no cuadra se descarta sola y la nota sigue.
   Las etiquetas se sacan de a una. Al texto para redes se le pide además que
   no nombre al medio (salvo un organismo oficial), ni traiga hashtags ni
   enlaces.
2. **Con una sola fuente**, "qué falta confirmar" lleva siempre
   "No pudo ser contrastado de forma independiente con las fuentes
   consultadas." (`FRASE_FUENTE_UNICA`). La pone el sistema, no la IA.
3. **"Fuentes consultadas"** se arma con los datos reales de la ingesta
   (medio, enlace, fecha, si es oficial) y lo que la IA dijo que aportó cada
   una.
4. **El nivel de verificación lo calcula el código**, no la IA
   (`nivelDeVerificacion`; la IA sugiere uno y queda anotado, sin mandar):

| Nivel | Cuándo |
|---|---|
| **ALTA** | Hay una fuente oficial, o dos o más medios distintos |
| **MEDIA** | Un solo medio |
| **BAJA** | Un solo medio y el titular original, el título o la bajada se apoyan en una denuncia o una declaración de parte (denuncia, acusó, habría, presunto, "según trascendió", aseguró que…); o, con cualquier cantidad de fuentes, algo de "qué falta confirmar" toca el hecho central (comparte con el título dos palabras que dicen algo, o una de ocho letras o más) |

Criterio en `CRITERIO-EDITORIAL.md` § 5.

### 11. El último control: semáforo y verificación baja

Antes de guardar, **todo lo que escribió la IA** (título, bajada, cuerpo,
guion y las partes internas) pasa por el semáforo: lo que se ve primero
(título, bajada, guion, texto para redes) por las listas enteras; lo largo, por
el rojo y lo de menores y víctimas. Si da rojo o amarillo, no se usa y la nota
cambia de color ("… (visto al reescribir)"). En el registro de Actions va el
identificador, **nunca el título** de una nota frenada: puede ser justamente la
que identifica a alguien.

Si el nivel es **BAJA**, la nota tampoco sale sola: pasa a amarillo con
"verificación baja: espera a una persona".

Si todo pasa: se anota el intento "con cuerpo" y la nota queda escrita. Al
final, el registro resume: "reescritura: N pedidas, M con cuerpo, F fallaron,
S sin cuerpo que sirva, R rechazadas por el título o la bajada, X sin
material, O oraciones sacadas, A ya agotaron los 3 intentos, P partes nuevas
descartadas, Z frenadas por el semáforo".

### 12. Sin cuerpo no se publica, y cómo escribirlo a mano

**La regla** (25/09): una nota automática sólo se publica si tiene cuerpo
(`tieneCuerpo`, `web/lib/cuerpo.js`): **70 palabras o más**
(`PALABRAS_MINIMAS_CUERPO`, igual a `CUERPO.minimoParaPublicar`), distinto de
la bajada y que no arranque con sus mismas palabras. Sin cuerpo no aparece en
la portada, las secciones, el feed, el sitemap ni las redes. Lo que publicó
una persona desde el panel se respeta (el panel pide confirmarlo). Lo mira
`notaPublicada` (`docs/03-SELECCION.md`, paso 11).

**Las que esperan: `web/data/esperando-cuerpo.json`.** En cada corrida,
`generar-datos.mjs` escribe ahí las notas automáticas que saldrían (dentro de
las 36 horas) pero no tienen cuerpo, con lo necesario para escribirlo a mano:

```json
{"id":"1rymg4t","titulo":"Cerca de 40 mil personas pasaron por el Fangio…","copete":"…","seccion":"Automovilismo","fecha":"2026-09-28T17:01:09Z",
 "fuentes":[{"medio":"Diario La Vanguardia","enlace":"https://www.diariolavanguardia.com/noticias/44916-…","fecha":null}]}
```

La portada lleva además el número (`esperandoCuerpo`), y el vigilante lo dice
en el resumen de las 21 (`docs/08-INFRAESTRUCTURA.md`).

**Cómo escribir un cuerpo a mano.** Se agrega una entrada en
`web/data/correcciones.json`, con el identificador de la nota:

```json
{"notas":{
"1rymg4t":{
  "cuerpo":"Primer párrafo con el hecho y el dato que la bajada no dio.\n\nSegundo párrafo con el contexto.",
  "motivo":"cuerpo escrito a mano: Gemini sin cupo",
  "cuando":"2026-09-28",
  "por":"redacción de Claude, pedida por Hernán"
}
}}
```

- Se puede corregir en la misma entrada el `titulo`, el `copete` o la
  `seccion`. **Sin `motivo`, la entrada no vale.**
- Se escribe con el mismo criterio que la IA (`CRITERIO-EDITORIAL.md` § 4 y
  § 12), leyendo las fuentes de `esperando-cuerpo.json`, y en párrafos
  separados por una línea en blanco (`\n\n`).
- El cuerpo cuenta para "sin cuerpo no se publica" y a esa nota **ya no se le
  pide nada a Gemini**. La dirección no cambia.
- Sale en la corrida siguiente de "Actualizar la web". El 27 y 28/09 se
  escribieron así 83 cuerpos.

### 13. Qué ve el lector y qué es interno

| | Qué | Dónde |
|---|---|---|
| **El lector** | Título, bajada, la foto si la hay (`docs/05-FOTOS.md`), cuerpo y, al pie, una línea gris con la firma y un desplegable **cerrado** "Fuentes (N)" con el nombre de cada medio y el enlace a su nota | `web/app/nota/[id]/page.js`, `web/components/verificacion.js`, `web/lib/fuentes-de-la-nota.js` |
| **La redacción** | Claves, qué se sabe, qué falta confirmar, lo que aportó cada fuente, antecedentes, nivel de verificación con su porqué, texto para redes | Se guardan en `portada.json` y `archivo.json` (`CAMPOS_EXTRA`) y se ven en el panel, en "Análisis interno". No van a la web ni a los datos para Google (las etiquetas sí, como palabras clave) |

Las fuentes que ve el lector: las de "Fuentes consultadas" o, si no hay, los
medios de la nota; sin repetir enlaces; una entrada de feed de Blogger (XML)
se muestra sin enlace. Criterio: `CRITERIO-EDITORIAL.md` § 7.

Las partes internas de una persona y las de la IA **nunca se mezclan**
(`extrasParaLaWeb`): si una persona corrigió el texto, las de la IA no van,
porque se armaron sobre otro texto.

### 14. La firma

Cada nota dice quién la escribió, en una sola línea gris (`firmaCorta`,
`web/components/metadatos.js`), y lo mismo en los datos para Google
(`autorDeNota`). La decide `quienEscribio`: "escrita por la IA" si la nota
tiene **guion** y su cuerpo no se escribió a mano; "revisada" si la publicó
una persona desde el panel (`como: 'publicada'`) o si tiene una corrección en
`web/data/correcciones.json` (`corregidaAMano`, que pone `conCorreccion`,
28/09). Si el cuerpo es el de la corrección (`cuerpoAMano`), el autor de los
datos para Google es Radar Balcarce.

| La nota es… | La línea dice |
|---|---|
| Escrita por la IA, sin revisión | "Redacción con IA, verificada contra las fuentes · Fuentes (N)" |
| Escrita por la IA y publicada por una persona | "Redacción con IA, revisada por la redacción · Fuentes (N)" |
| Escrita por la IA y corregida en `correcciones.json` (título, bajada o sección) | "Redacción con IA, revisada por la redacción · Fuentes (N)" |
| Publicada por una persona sin texto de la IA, o con el cuerpo escrito a mano en `correcciones.json` | "Revisada por la redacción · Fuentes (N)" |
| Sin guion y sin persona | "Texto de *medio* · Fuentes (N)" |
| Propia (el dólar, un repaso) | Lo que dice la nota ("Nota de Radar Balcarce…") |

Al abrir el desplegable se ve la explicación larga ("La escribió una
inteligencia artificial con lo que publicaron las fuentes, y se verificó
automáticamente contra ellas…"). Nunca se dice "sin revisión humana". Criterio:
`CRITERIO-EDITORIAL.md` § 10.

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `reels/reescritura.mjs` | `reescribirAutomaticas` (todo el flujo), `reescribir` (el pedido), `entradaDe`, `esTemaSerio`, `ordenarParaReescribir`, `textoCompletoDe`, `antecedentesDe`, `completarReescritura`, `nivelDeVerificacion`, `semaforoDeLaReescritura`, `revalidarExtras`, `previasDeLaPortada`, `topeDeReescrituras` | `generar-datos.mjs` (nube), `panel/servidor.mjs` (PC) | `CRITERIO-EDITORIAL.md` (vía `prompt-editorial.mjs`), el archivo, las claves | Los intentos (quien llama los guarda) |
| `ingesta/prompt-editorial.mjs` | Lee la sección 12 de `CRITERIO-EDITORIAL.md` entre las marcas; lanza si falta algo | `reels/reescritura.mjs` | `CRITERIO-EDITORIAL.md` | — |
| `CRITERIO-EDITORIAL.md` | **El criterio único**: las reglas (§ 4 a § 10), los números (§ 11) y la instrucción exacta de la IA (§ 12) | La IA, las personas, las pruebas | — | — |
| `ingesta/criterio.mjs` | Los números del criterio (`TITULO`, `BAJADA`, `CUERPO`, `GUION`, `PARTES`, `COPIA_MAXIMA`, `ESTILO`, `RELLENO`, `REESCRITURA`) | Verificador, reescritura, web | — | — |
| `ingesta/verificar.mjs` | `verificar`, `verificarExtras`, `depurarCuerpo`, `arreglarEscritura`, `problemasDeEstilo`, `tituloEnPasado` | `reels/reescritura.mjs`, panel | `ingesta/criterio.mjs`, `web/lib/titulos.js` | — |
| `web/lib/titulos.js` | `tituloAutomatico`: etiqueta adelante, cierre colgado, "en Balcarce" al final | `generar-datos.mjs`, `verificar.mjs` | — | — |
| `web/lib/cuerpo.js` | `tieneCuerpo` (70 palabras) | `generar-datos.mjs`, reescritura, redes, web | — | — |
| `web/scripts/generar-datos.mjs` | Elige qué se le pide a la IA, arma el texto final, aplica correcciones y la regla del cuerpo | `actualizar.yml` | `correcciones.json`, `intentos-ia.json`, portada y archivo | `intentos-ia.json`, `esperando-cuerpo.json`, `portada.json`, `archivo.json` |
| `reels/claves.mjs` | Qué clave usa cada cosa (redacción, redes, clasificación, Groq), del entorno o del `.env` | Reescritura, lectura, fotos | Variables de entorno, `.env` | — |
| `web/components/metadatos.js` | `firmaCorta`, `explicacionDeFirma`, `autorDeNota` | La página de la nota | — | — |
| `web/components/verificacion.js`, `web/lib/fuentes-de-la-nota.js` | El pie de la nota: firma y "Fuentes (N)" | La página de la nota | — | — |
| `web/data/esperando-cuerpo.json` | Las notas que esperan cuerpo, con sus fuentes | Lo escribe `generar-datos.mjs`; lo lee una persona | — | — |
| `web/data/correcciones.json` | Los cuerpos (y títulos, bajadas, secciones) escritos a mano | Una persona | — | — |
| `web/data/intentos-ia.json` | Cuántas veces se pidió cada nota, cuándo y por qué falló | `generar-datos.mjs` | — | — |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Cambiar cómo escribe la IA (el tono, una regla, un ejemplo) | `CRITERIO-EDITORIAL.md` § 12, sin borrar las marcas `<!-- … -->` ni `{{TONO}}`. En la nube sirve desde la corrida siguiente; **el panel, después de reiniciarlo** |
| Que una palabra pida el tono serio | La línea entre las marcas `PALABRAS_SERIAS` de `CRITERIO-EDITORIAL.md` § 4 |
| Cambiar un largo, un tope o una cantidad | `ingesta/criterio.mjs` **y** la tabla de `CRITERIO-EDITORIAL.md` § 11 (`pruebas/criterio.test.mjs` controla que coincidan) |
| Sumar una frase de relleno prohibida | `RELLENO` en `ingesta/criterio.mjs` **y** entre las marcas `RELLENO` de `CRITERIO-EDITORIAL.md` § 4 **y** la regla 19 de § 12 |
| Un control nuevo del verificador | `ingesta/verificar.mjs` (con su prueba en `pruebas/verificar.test.mjs` o `pruebas/estilo.test.mjs`) |
| Una etiqueta más que se pueda sacar del título | `ETIQUETAS_CONOCIDAS` (`web/lib/titulos.js`). Nunca un lugar |
| Cuándo un cuerpo "alcanza" | `PALABRAS_MINIMAS_CUERPO` (`web/lib/cuerpo.js`) **y** `CUERPO.minimoParaPublicar` |
| Cómo se calcula el nivel de verificación | `nivelDeVerificacion` y `DE_PARTE` (`reels/reescritura.mjs`) |
| Qué es oficial | `oficial: true` en la ficha de la fuente (`ingesta/fuentes.mjs`) |
| El modelo de la IA | `MODELO` en `reels/reescritura.mjs` |
| Escribir o corregir el cuerpo de una nota a mano | `web/data/correcciones.json` |
| La firma | `firmaCorta` y `explicacionDeFirma` (`web/components/metadatos.js`) |

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| Gemini sin cupo o saturado | "reescritura: … N fallaron (HTTP 429…)" en el registro; crece `esperando-cuerpo.json`; el vigilante avisa si menos del 35 % de lo de las últimas 24 horas tiene cuerpo | Esperar al día siguiente, o escribir los cuerpos a mano (paso 12) |
| Se cayó `CRITERIO-EDITORIAL.md` o se borró una marca | "Actualizar la web" falla a la vista ("Criterio editorial (…): falta la marca …") y `npm test` también | Restaurar la marca |
| La IA cambia el formato del JSON | "Gemini: Bad Unicode escape…" o "Unexpected token" en `intentos-ia.json` | `repararEscapes` cubre las barras mal formadas; lo demás, mirar `limpiarJson` |
| La IA escribe un verbo de delito sin tilde ("robo" por "robó") | El control no lo ve: los verbos que se confunden con un sustantivo (robó, abusó, secuestró, disparó) sólo se reconocen con la tilde, a propósito, para no rechazar "un robo" | Riesgo aceptado (era peor rechazar cada "un robo"); si una nota así sale, se corrige en `correcciones.json` |
| Una regla nueva no alcanza a lo ya publicado | Una nota vieja sigue con un defecto que hoy se rechazaría | Sólo se revalida lo que la ingesta todavía trae; lo demás se corrige a mano en `correcciones.json` |
| Una nota se frena por verificación BAJA | En el panel, amarilla con "verificación baja: espera a una persona" | Revisarla y publicarla desde el panel si corresponde |
| La reescritura en la PC y en la nube cuentan intentos por separado | El panel lleva su propio conteo (`estado.intentosIA`) y no lo suma a `intentos-ia.json`: el tope del día es por lado | Nada, mientras el panel esté apagado casi siempre |

## Lo que sigue abierto

- El comentario de "si la IA falla tres veces seguidas" de `panel/servidor.mjs`
  (el código cuenta tres fallas en el ciclo, seguidas o no): en la lista de
  comentarios viejos de `PENDIENTES.md`.

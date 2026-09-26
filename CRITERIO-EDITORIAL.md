# Criterio editorial de Radar Balcarce

*Actualizado el 26/09/2026.* Éste es **el** criterio editorial del medio: qué
se publica, cómo se escribe, cómo se trabaja con las fuentes y cómo se
verifica. Hay uno solo y está acá. Todo lo demás lo respeta:

- **La IA lo lee tal cual.** La sección 12, "La instrucción de la IA", es el
  texto exacto que recibe Gemini antes de cada nota. No hay otra copia en el
  código: `reels/reescritura.mjs` la carga de este archivo al arrancar
  (`ingesta/prompt-editorial.mjs`). Si este archivo falta o le falta una parte,
  la reescritura no arranca: la IA no escribe sin criterio.
- **Los números están en la sección 11**, "Los números", y el código usa los
  mismos (`ingesta/criterio.mjs`). Una prueba (`pruebas/criterio.test.mjs`)
  compara esa tabla con el código: si alguien cambia un número en un lado y
  no en el otro, `npm test` falla y la web no se publica.
- El panel muestra este criterio en la pestaña **"Cómo escribe la IA"**.

**Cómo se cambia el criterio.** Se edita este archivo (el texto de la sección
12 cambia lo que escribe la IA; un número de la sección 11, también en
`ingesta/criterio.mjs`), se corre `npm test` y se sube a GitHub. "Actualizar
la web" usa la versión nueva en la corrida siguiente. **El panel, recién
después de reiniciarlo** (cerrar su ventana y correr `ARRANCAR.bat`).

Los otros documentos no repiten estas reglas: remiten acá. `MANUAL.md` cuenta
el recorrido técnico y el puntaje; `REGLAS.md`, qué prueba cuida cada regla;
`REDES.md`, los horarios de las redes; `INVESTIGACION.md`, lo legal con sus
fuentes.

---

## 1. Qué es Radar Balcarce y a quién le escribe

Radar Balcarce es un medio digital de Balcarce (provincia de Buenos Aires)
que funciona solo: cada media hora lee los medios de la zona y los
organismos públicos, decide qué se publica, lo escribe con IA, lo verifica y
arma el sitio, sin que haya nadie despierto. Hernán y Andrés deciden lo que
el sistema no puede decidir solo.

**Le escribe a la gente de Balcarce**, que quiere saber qué pasó en su
pueblo sin leer cinco medios. Por eso:

- **Lo local primero.** Lo que pasa en Balcarce pesa más que cualquier cosa
  de afuera. Lo de afuera entra si le importa a alguien de acá.
- **Informar, no gritar.** Claro, directo y neutral. Sin sensacionalismo, sin
  opinión, sin cebar el clic. En un pueblo el que exagera se quema rápido.
- **Decir de dónde sale cada cosa.** Cada nota dice quién la escribió y de qué
  medios sale la información.
- **Opera como un diario**: la redacción (la IA) junta lo que contaron todas
  las fuentes, lo contrasta y escribe una nota. El lector ve la nota, no el
  trabajo de redacción.

## 2. Qué entra y qué no entra nunca

### Las fuentes

Las fuentes están en `ingesta/fuentes.mjs`: medios de Balcarce, de la región
y nacionales, y organismos públicos (la Municipalidad es **fuente oficial**).
Cada una tiene un peso: los medios locales pesan más que los nacionales. Si
dos o más medios cuentan lo mismo, es **una** nota con varias fuentes, no
varias notas.

**De afuera entra poco y a propósito.** De casi todas las fuentes de la región
entra sólo lo que nombra a Balcarce, a una figura de acá o a la zona (la ruta
226, la 55, el sudeste, la papa). Y lo de afuera tiene, por sección, un
**piso de puntaje** y un **cupo** (cuántas pueden salir solas): los números
están en la sección 11. Lo de Balcarce no tiene piso ni cupo.

**Las secciones flacas (26/09).** La portada tiene que tener tres notas por
sección, y para eso hay fuentes de afuera con la sección fija: **lo que le gusta
a la gente** en otros medios (espectáculos, cultura, tecnología, el campo y
la economía de los diarios nacionales) y los policiales de los diarios
nacionales. Cuentan igual que cualquier nota de afuera: peso bajo, pocas por
vuelta, piso y cupo de su sección, semáforo, verificación contra la fuente y
cuerpo. Lo internacional sin relación con Balcarce sigue esperando. Cuando
falta material para una sección se suman fuentes o se baja el piso de esa
sección (nunca el de Deportes ni el semáforo); no se sube el tope de pedidos
a la IA. Para gastar ese tope, se reescribe primero lo de Balcarce y, después,
la sección con menos notas escritas.

### Las secciones

| Sección | ¿Sale sola? |
|---|---|
| Balcarce | Sí |
| Deportes | Sí |
| Automovilismo | Sí |
| Agro | Sí |
| Servicios | Sí |
| Cultura y agenda | Sí |
| Tecnología | Sí |
| Economía | Sí |
| Política | Sí en la web; **en las redes, nunca sin una persona** |
| Policiales | Sí en la web; **en las redes, nunca sin una persona** |
| País | No: espera a una persona |

"Sale sola" quiere decir que no espera a nadie **si el semáforo da verde**
(sección 3) y si tiene cuerpo (sección 4).

### Lo que no entra nunca

| Qué | Por qué |
|---|---|
| **Nada que identifique a un menor ni a una víctima** de un delito sexual o de violencia de género: ni nombre, ni apodo, ni iniciales, ni escuela, ni domicilio o cuadra, ni un parentesco que la deje identificada, ni su foto ni su descripción. Aunque la fuente lo publique | Lo exigen las leyes 26.061 y 26.485. No es estilo. El semáforo rojo lo frena (`INVESTIGACION.md` § 6) |
| **La foto de otro medio.** Va siempre una placa propia con el titular | La ley 11.723 permite reproducir noticias de interés general: cubre el texto, no las fotos |
| **Una acusación dicha como hecho.** Sin condena o confirmación oficial, se atribuye a quien acusó y va en condicional ("habría") | Doctrina Campillay: es lo que protege al medio de una demanda por calumnias o injurias |
| **La cotización del dólar como nota de otro medio.** Si el título es "dólar hoy", "dólar blue", "a cuánto cotiza"… la nota no sale sola | La cotización se muestra en `/dolar`, que se actualiza sola, y el sitio arma su propia nota del dólar una vez por día hábil (sección 8). Una nota ajena por cada cotización es relleno |
| **Política o economía de otros países sin relación con Balcarce.** Si el título nombra a Trump, Xi Jinping, Putin, la Casa Blanca, Gaza, Ucrania, el G20… y la nota no nombra a Balcarce, no sale sola | No le importa a nadie de acá: el 26/09 la cumbre Trump–Xi salió sola. Queda amarilla con el motivo "internacional: sin relación con Balcarce", por si una persona quiere publicarla (por ejemplo, si afecta a la papa). La lista es `REGLAS_SEMAFORO.internacional`, y sólo mira el título |
| **Un policial de otro lugar con violencia o acusados.** Si la nota es de Policiales, no nombra a Balcarce y el título o el comienzo dicen "mató", "crimen", "detuvieron", "condenado", "prófugo", "juicio", "fiscal"…, no sale sola | Los diarios nacionales traen crímenes y causas de todo el país, con nombres de acusados, y un medio de Balcarce no tiene por qué darles lugar sin que una persona los mire (26/09: "Mató a su mujer embarazada…" salía verde). Queda amarilla con el motivo "policial de afuera con violencia o acusados". La lista es `REGLAS_SEMAFORO.policialDeAfuera`; no toca lo de Balcarce ni el resto del semáforo |
| **Una nota en Tecnología que no habla de tecnología.** Las fuentes de tecnología de los diarios traen de todo | La sección se confirma con el título (`PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO`): si no nombra nada de tecnología, no se le cree a la fuente y se clasifica por lo que dice |
| **"En vivo", "minuto a minuto", "en directo"** en el título, la bajada, el guion o el texto para redes, aunque el medio de origen lo diga ("música en vivo" sí) | Radar Balcarce no hace coberturas en vivo: cuenta lo que pasó |
| **Una nota automática sin cuerpo** | Una nota de dos renglones no es una nota. Queda "esperando cuerpo" hasta tenerlo (sección 4) |
| **El nombre del medio de origen en el título, el guion, las placas o las redes** | La atribución va en la nota de la web, con el enlace al original |
| **Lo que parece promoción y no noticia** (sorteos, "ganá tu entrada") | No se bloquea, pero nunca sale solo |
| **Fúnebres, comentarios de lectores y transmisiones en vivo largas** | Decisión vigente (`REGLAS.md`, "Decisiones que siguen valiendo") |

## 3. El semáforo

Cada noticia pasa por un semáforo antes de publicarse. Las listas de
palabras están en `REGLAS_SEMAFORO` (`ingesta/fuentes.mjs`) y cada una tiene
su prueba. **No se tocan sin que lo decidan Hernán y Andrés.**

| Color | Qué pasa | Cuándo |
|---|---|---|
| **Rojo** | No se publica nunca, ni por error | Identifica o puede identificar a un menor o a una víctima de violencia de género o de un delito sexual (menor de edad, abuso sexual, violación, femicidio, grooming, suicidio…) |
| **Amarillo** | Espera a una persona en el panel | Acusa a alguien (denuncia, detenido, imputado), habla de una muerte, involucra a un chico, parece promoción, es de afuera con poco puntaje o fuera del cupo, es de País, es la cotización del dólar, o tiene **verificación baja** (sección 5) |
| **Verde** | Sale sola | Todo lo demás, en las secciones que salen solas |

**Qué mira el semáforo.** En el **título y el comienzo del resumen**, las
listas enteras. En el **texto entero** (el artículo completo de la fuente, lo
que contaron los otros medios, el cuerpo y las partes internas que escribe la
IA), sólo el rojo y lo de chicos y víctimas: mirando todo, "denuncia" o
"falleció" perdidas en el octavo párrafo frenaban 16 de cada 23 notas
(decisión del 25/09). Lo que escribe la IA **vuelve a pasar** por el semáforo:
si da rojo o amarillo, esa escritura no se usa y la nota deja de salir sola.

Se prefiere pasarse de cuidadoso: "violación de la ley" da rojo y "el menor
de los males" da amarillo, y así queda.

**Política y Policiales.** En la web salen solas si el semáforo da verde. En
las redes (Facebook, podcasts, historias) **siempre** esperan a una persona:
en una red la nota viaja sin contexto y a un vecino lo nombra un titular.

## 4. Cómo se escribe una nota

Toda nota tiene **título, bajada y cuerpo**, en ese orden, en pirámide
invertida: lo más importante primero. El guion para la voz es el título.

### El título

- Dice **qué pasó**: empieza por el hecho, sujeto y verbo en presente ("El
  Concejo aprueba…", "Ferroviarios gana…"), no por el lugar ni por una
  etiqueta.
- Apunta a unos **70 caracteres** y **nunca pasa de 90**: se tiene que entender
  solo en la pantalla del celular.
- Si el hecho es de Balcarce y el título no lo dice, termina con "en
  Balcarce".
- Sin signos de admiración, sin pregunta, sin "Video:", "Ojo:" ni frases de
  gancho. Nunca "en vivo".

| Bien | Mal, y por qué |
|---|---|
| El Concejo aprueba el presupuesto 2027 en Balcarce | "Balcarce: el Concejo aprobó el presupuesto" (empieza por el lugar) |
| Ferroviarios gana por penales y juega la final | "¡Ferroviarios a la final!" (admiración, no dice qué pasó) |
| Reabre el autódromo Juan Manuel Fangio tras una década | "EN VIVO: la reapertura del Fangio" (no hacemos coberturas en vivo) |
| Cortan la luz el martes en el barrio Norte | "Lo que tenés que saber del corte de luz" (gancho) |

### La bajada (el campo `copete`)

- **Dos o tres frases cortas**, unas **50 palabras** como mucho: qué pasó, cómo
  se relaciona con Balcarce y el dato más importante.
- Nada de "cabe destacar que" ni antecedentes largos: la profundidad va en el
  cuerpo.

| Bien | Mal, y por qué |
|---|---|
| "El Concejo Deliberante aprobó por mayoría el presupuesto 2027. Prevé obras de cloacas en tres barrios y un aumento de la partida de salud." | "Cabe destacar que, como viene ocurriendo desde hace años, el Concejo trató una vez más el presupuesto, un tema siempre polémico…" (relleno y opinión) |

### El cuerpo

**Es obligatorio: sin cuerpo, la nota automática no se publica.** Es la nota
desarrollada, lo que se lee al abrirla.

- Se escribe **sólo con información de las fuentes**: lo que dan todas las
  que contaron la noticia (los resúmenes y el texto completo), más los
  antecedentes como contexto, siempre con su fecha.
- Se le piden **de 100 a 180 palabras** en uno a tres párrafos cortos. **Con
  menos de 70 no se publica.**
- De lo más importante a lo menos:
  1. **Primer párrafo:** el hecho central con el dato que la bajada no dio
     (quién, cuándo, dónde, cuánto). Nunca arranca con las palabras de la
     bajada ni la repite.
  2. **Segundo párrafo:** el contexto que importa (antecedentes, cómo se llegó
     a esto).
  3. **Tercer párrafo**, si la fuente da para eso: qué sigue o qué significa
     para la gente de Balcarce.
- Las citas textuales, sólo si están en la fuente, entre comillas y
  atribuidas ("dijo", "explicó").
- Si falta largo, se suman **datos de las fuentes**, no adjetivos. Nada de
  cierres de opinión ("sin dudas", "una gran noticia").

| Bien | Mal, y por qué |
|---|---|
| "La ordenanza, aprobada con doce votos a favor, destina la mayor parte de las obras a los barrios Norte, Sur y Villa Dolores, según informó el Concejo. El intendente había enviado el proyecto en octubre…" | "El Concejo Deliberante aprobó por mayoría el presupuesto 2027, que prevé obras…" (repite la bajada: se rechaza) |
| "Según la denuncia presentada en la comisaría, el hombre habría ingresado a la vivienda…" | "El hombre entró a robar a la vivienda…" (una acusación como hecho: se rechaza) |
| "…el municipio no informó todavía cuándo empiezan las obras." | "…una obra que sin dudas cambiará la vida de los vecinos." (opinión, relleno) |

### El guion para la voz

**Es el título, dicho tal cual**, y nada más: unos diez segundos. Sólo cambia
lo que no se puede leer en voz alta (las siglas como se pronuncian, los
números en palabras). La fuente no se nombra.

### Los dos tonos

- **El de todos los días:** castellano rioplatense neutro y cercano, en
  tercera persona, sin voseo ni modismos. Se lee liviano, como una novedad
  del pueblo bien contada, pero es un medio informando. Sin "impresionante",
  "tremendo" ni "increíble".
- **El serio:** sobrio e institucional, sin calidez ni color, sólo los hechos.
  Lo pide **Policiales siempre**, y cualquier nota que toque alguna de estas
  palabras (en el título o el resumen de la fuente):

<!-- PALABRAS_SERIAS:INICIO -->
`inseguridad` · `robo` · `robaron` · `hurto` · `hurtaron` · `delincuencia` · `choque` · `accidente` · `incendio` · `corte de luz` · `corte de agua` · `sin luz` · `sin agua` · `conflicto` · `protesta` · `reclamo` · `crisis` · `violencia` · `inundación` · `inundacion` · `temporal` · `emergencia`
<!-- PALABRAS_SERIAS:FIN -->

Para sumar o sacar una palabra de esa lista se edita la línea de arriba (cada
palabra entre comillas invertidas): la IA la usa en la corrida siguiente.

### Lo que la IA escribe para la redacción

Además de la nota, la IA devuelve partes que **no ve el lector**: son para el
panel y para las redes (sección 7).

| Parte | Qué es | Límite |
|---|---|---|
| Claves | Lo esencial, en puntos de una línea | De 3 a 5 |
| Qué se sabe | Los datos confirmados, atribuidos | Lista |
| Qué falta confirmar | Lo que no se pudo verificar y lo que las fuentes cuentan distinto. Con una sola fuente va siempre "No pudo ser contrastado de forma independiente con las fuentes consultadas." | Lista, puede ir vacía |
| Lo que aportó cada fuente | Una frase por fuente, sin nombrar al medio | Una por fuente |
| Texto para redes | El posteo de Facebook: qué pasó y por qué le importa a Balcarce. Sin nombrar al medio, sin hashtags, enlaces ni emojis | Hasta 280 caracteres |
| Etiquetas | De qué trata la nota, sin "#". Van a Google y dos o tres como hashtags en Facebook | De 3 a 8 |
| Nivel sugerido | ALTA, MEDIA o BAJA. **Es sólo una sugerencia**: el nivel lo calcula el sistema (sección 5) | — |

### Los títulos en mayúsculas

Los que los medios publican EN MAYÚSCULAS se pasan a mayúscula inicial,
cuidando los nombres propios con la lista `NOMBRES_PROPIOS` de
`ingesta/fuentes.mjs`. Si un título sale mal escrito, la palabra se agrega a
esa lista y se arregla para siempre.

## 5. Cómo se trabaja con las fuentes

**Primero se juntan.** Si varios medios contaron lo mismo, la IA los recibe a
todos, numerados (Fuente 1, Fuente 2…), cada uno con su medio, su fecha y si
es oficial, más el **texto completo** de la nota original (si el de la
principal no se puede bajar, el de otra fuente que contó lo mismo). No se
busca nada en internet, a propósito: el verificador sólo puede controlar lo
que la IA recibió, y un dato "encontrado" sería imposible de distinguir de
uno inventado.

**Después se contrasta.** Antes de escribir, la IA separa:

| Qué | Cómo se escribe |
|---|---|
| Lo que **confirman varias fuentes** | Como hecho |
| Lo que dice **una sola** | Atribuido: "según informó el municipio", "de acuerdo con un medio local" |
| Lo que las fuentes **cuentan distinto** | Con las dos versiones atribuidas ("un medio habla de… y otro de…"), o la de la fuente oficial si la hay; la diferencia va en "qué falta confirmar" |
| Una **declaración de parte** (lo que afirma alguien interesado: un denunciante, un funcionario sobre su gestión, un club sobre su equipo) | Atribuida a quien la dijo, nunca como hecho |
| Lo que **no se puede verificar** | Dicho como no confirmado ("todavía no se informó…"), o no se dice |

**Cómo se atribuye.** Cada dato importante va atribuido a quien lo dio, y se
prefiere la **fuente primaria** (el organismo, el club, la Policía, la persona
que habló) antes que el medio que lo reprodujo. Si hay una fuente oficial, su
versión va primero. En el cuerpo se puede nombrar la fuente en general ("según
informó el municipio"), **nunca el nombre del medio**. Nunca se presenta como
propio lo que informó otro medio: nada de "pudo saber este medio".

**Acusaciones: doctrina Campillay.** Si la nota acusa a alguien de algo (un
delito, una falta, una irregularidad) y no hay condena ni confirmación
oficial, siempre se atribuye a quien acusó ("según la denuncia de…", "de
acuerdo con la Policía…") y se usa el condicional ("habría", no "hizo"). En
el copete y en el cuerpo.

**Las fechas.** No se mezcla lo de antes con lo de ahora ni se presenta como
actual algo que la fuente cuenta como histórico. No se usa "ayer", "hoy" ni
"mañana" si la fuente no dice el día: va el día de la semana que trae la
fuente, o nada.

**Los antecedentes.** La IA recibe también hasta **tres notas** que el sitio
ya publicó sobre el mismo tema en los **últimos 30 días**, con su fecha. Son
sólo contexto: lo que salga de ahí va en el cuerpo, las claves o lo que se
sabe, **dicho como anterior** ("en agosto", "como se había informado"), nunca
en el título, la bajada, el guion ni el texto para redes. Si un antecedente y
la fuente de hoy no coinciden, manda la de hoy.

**Una sola fuente.** No se inventa una "ampliación": la nota cuenta lo que
esa fuente dice y en "qué falta confirmar" va que no pudo ser contrastada.

**El nivel de verificación lo calcula el sistema, no la IA**
(`nivelDeVerificacion` en `reels/reescritura.mjs`):

| Nivel | Cuándo |
|---|---|
| **ALTA** | Entre las fuentes hay una oficial, o dos o más medios distintos (dos secciones del mismo medio cuentan como uno) |
| **MEDIA** | Un solo medio, sin confirmación independiente |
| **BAJA** | Un solo medio y la nota se apoya en una denuncia o una declaración de parte (denuncia, acusó, habría, presunto, "según trascendió"…); o, con cualquier cantidad de fuentes, lo que falta confirmar toca el hecho central |

**Con verificación BAJA la nota no sale sola**: espera a una persona, como
una amarilla, y no se le vuelve a pedir a la IA salvo que aparezcan más
fuentes.

## 6. Cómo se verifica

Lo que escribe la IA pasa por un **verificador** (`ingesta/verificar.mjs`)
antes de publicarse. No usa otra IA: son comparaciones mecánicas contra todo
lo que la IA recibió, que cuestan cero y hacen siempre lo mismo. Es estricto a
propósito: un falso positivo cuesta una nota que espera; un falso negativo es
publicar una mentira.

**Qué rechaza:**

- un **número**, un **nombre propio**, un **día o un mes** o una **cita entre
  comillas** que las fuentes no traen (los números grandes pueden estar
  redondeados);
- un dato que sólo está en un antecedente usado **como si fuera de hoy**;
- un **delito afirmado** sin atribuir a nadie;
- una **negación** que la fuente no tiene, o una que desapareció;
- **copiar** más de 12 palabras seguidas del original;
- el cuerpo que **repite la bajada**;
- "mas" o "ms" en vez de **"más"** (cambia el sentido);
- **"en vivo"** en lo que se ve primero;
- lo que pasa del **largo máximo** de cada parte (sección 11);
- en el texto para redes, además: **nombrar al medio**, hashtags o enlaces.

**Qué pasa cuando algo no pasa:**

1. **Si falla el título, la bajada o el guion**, esa escritura no se usa.
2. **Si falla el cuerpo, se sacan sólo las oraciones** con el dato que no
   cuadra. Si lo que queda pasa y tiene 70 palabras o más, se usa.
3. **Si no alcanza, se le pide de nuevo una vez**, diciéndole qué falló ("usá
   únicamente lo que dicen las fuentes", "el cuerpo es obligatorio, de 100 a
   180 palabras").
4. **Las partes para la redacción** (claves, qué se sabe…) se controlan **cada
   una por su lado**: la que falla se descarta sola y la nota sale igual. Las
   etiquetas se sacan de a una.
5. **Tres intentos por nota como mucho**, en corridas distintas: la clave de
   respaldo es paga y no se gasta de más en una nota que no da. Una falla del
   servicio (sin cupo, saturado, sin red) no cuenta como intento.
6. **Sin material no se escribe.** Sin el texto completo de ninguna fuente y
   con menos de 60 palabras de resumen entre todas, no se le pide nada a la
   IA.
7. **Lo ya publicado se revalida** en cada corrida contra las reglas de hoy:
   si una regla nueva ya no lo dejaría pasar, se saca y se vuelve a escribir.
   Nunca se paga dos veces por lo mismo: lo que ya tiene cuerpo se reusa.

El vigilante avisa por WhatsApp si menos del 35 % de las notas de las últimas
24 horas tienen cuerpo, y el resumen de las 21 dice cuántas esperan cuerpo.

## 7. Qué ve el lector y qué queda para la redacción

| | Qué es | Dónde se ve |
|---|---|---|
| **El lector** | Título, bajada, cuerpo y, al pie, un desplegable chico y **cerrado** "Fuentes (N)" con el nombre de cada medio y el enlace a su nota. Después, compartir. La **firma** va en el mismo renglón del desplegable (§ 10) | La web |
| **La redacción** | Claves, qué se sabe, qué falta confirmar, lo que aportó cada fuente, los antecedentes, el nivel de verificación con su porqué y el texto para redes | El panel, plegado en "Análisis interno" de cada nota. No va a la web ni a los datos para Google (las etiquetas sí, como palabras clave) |

**El desplegable de fuentes es la atribución** (ley 11.723): toda nota tiene
al menos la fuente principal. El enlace es siempre **la página de la nota
original**, nunca un archivo interno del medio (hasta el 25/09, las notas de
Infórmese Primero enlazaban la entrada del feed de Blogger, que es XML: ahora
enlazan la página, y si alguna quedó con el enlace viejo se muestra el medio
sin enlace).

### Cómo se presenta: lo que respeta TODA página del sitio

Vale igual para una nota de una fuente, la nota del dólar, el repaso de un
podcast, la ficha de un evento y las páginas de servicio (farmacias, dólar,
teléfonos útiles). Está cuidado por pruebas (`pruebas/seo-paginas.test.mjs`,
`pruebas/tipografia.test.mjs`, `pruebas/eventos.test.mjs`) y por la auditoría
del 26/09, que recorrió las 300 páginas publicadas.

1. **Una sola línea de firma.** Corta, gris, pegada al desplegable "Fuentes".
   Nunca un párrafo explicando quién la escribió o si la revisó una persona
   (eso está en `/quienes-somos`).
2. **Las fuentes, plegadas.** Un botón chico y cerrado "Fuentes (N)" con el
   nombre y el enlace. Nunca "Lo que cuenta el medio…", ni "De dónde sale esta
   nota" a la vista.
3. **El análisis es interno.** Claves, qué se sabe, qué falta confirmar, lo
   que aportó cada fuente y el nivel de verificación se ven en el panel, no en
   la web.
4. **No se copia texto de otro.** Ni en una nota ni en una ficha de evento: los
   datos van con palabras nuestras (plantilla o IA verificada), nunca la
   descripción cruda de la fuente, con sus mayúsculas y sus frases de venta.
5. **Nada de "en vivo"** si no está en vivo. Los datos que se actualizan en
   el navegador (dólar, clima, "hace X") dicen la hora real de su última
   actualización.
6. **Sin promoción ni mayúsculas sostenidas ni signos dobles** en ningún
   título ni texto ("¡¡¡INFORMACIÓN IMPORTANTE!!!"). Los nombres que llegan mal
   de una fuente se corrigen (tildes, mayúsculas) antes de mostrarse.
7. **Una tipografía, un sistema.** Fraunces sólo para títulos de nota, de
   sección y de tarjeta, y la marca. Todo dato, cifra y etiqueta va en IBM Plex
   Sans, con cifras tabulares. Cada tarjeta (clima, farmacia, dólar, agenda,
   buzón, números útiles) usa la misma etiqueta, el mismo dato principal, el
   mismo texto secundario y las mismas acciones ("Ver la semana →"). El detalle
   y las variables están en `web/README.md` ("Sistema tipográfico") y al
   principio del bloque de tarjetas de `web/app/globals.css`.
8. **Todo se ve bien en cualquier tamaño.** Sin desborde horizontal, sin
   texto cortado ni pisado, columnas alineadas, contraste de 4,5:1 o más, de
   320 a 1440 píxeles. La columna de la derecha es una sola pila continua
   (clima, farmacia, dólar, agenda, buzón, útiles), sin huecos.
9. **Una nota por tema.** Dos notas con el mismo título (o casi) no conviven en
   la portada: se queda la más relevante y la otra conserva su página.
10. **Siempre lo nuevo primero**, cada sección con sus tres más recientes, la
    tapa con cinco notas de cinco secciones distintas y todas con su hora.

## 8. Notas propias: el dólar, los podcasts y la agenda

Son notas que arma el sitio con datos propios, **sin IA**: un texto de
plantilla lleno con números o con lo ya publicado, así que no hay nada que
inventar. Son notas normales (portada, sección, feed, archivo) y pasan por la
regla de cuerpo como cualquier otra. **No van a Facebook como posteo ni
entran a un podcast**: serían redundantes. El detalle técnico está en
`web/README.md` ("Las notas propias", `web/lib/notas-propias.js`).

**El dólar.** La cotización del momento se muestra en `/dolar`, que se
actualiza sola. Además, **una nota propia por día hábil**, desde las 11 de
Balcarce, con los números de ese momento (oficial, blue, MEP, contado con
liqui, tarjeta, mayorista y la brecha), comparados sólo con lo que el sitio
guardó de días anteriores. Si el oficial no se actualizó ese día (feriado, el
mercado no abrió), no se hace. Sección Economía, sin ganarle a lo de Balcarce.
En cambio, la nota **de otro medio** cuyo título es la cotización ("dólar
hoy", "dólar blue"…) no sale sola: queda amarilla con el motivo "cotización
del dólar: se muestra en /dolar", no se avisa por WhatsApp y, si ya tenía
página, la conserva.

**Los podcasts.** El guion se arma sólo con lo ya publicado en la web: el
titular de cada nota y, si el texto es propio (reescrito por la IA o por una
persona), una oración de la bajada. Nunca se nombra la fuente. Con menos de
dos notas, ese podcast no sale. Cuando un podcast sale, **tiene su nota en la
web**: cada nota que se contó, con su titular, su enlace y una o dos frases de
lo que ya publicó, y los botones para verlo en Instagram y Facebook. Si una
de esas notas se retira después, el repaso se rearma sin ella. Cuáles notas y
a qué hora: sección 9 y `REDES.md`.

**Cómo se escriben.** La del dólar: título con el día y los dos números que
más se buscan ("El dólar blue cotiza a $1.560 este viernes 25; el oficial, a
$1.540"), nunca "abre" ni "en vivo", porque la nota puede salir un rato después
de la apertura. Sin adjetivos ("se dispara", "se desploma") y sin pronósticos:
sólo los números y la diferencia en pesos y en porcentaje. La firma dice la hora
real en que se consultaron los datos. La del repaso: cada nota con su titular
enlazado y lo que esa nota ya publicó; nunca incluye Política ni Policiales
(tampoco los podcasts), y sin dos notas con página no hay repaso.

**Quién las firma.** La nota dice que es de Radar Balcarce y de dónde salen
los datos (por ejemplo, la del repaso: "Nota de Radar Balcarce: el texto del
repaso publicado en nuestras redes"), y los datos para Google dicen "Radar
Balcarce". Nunca dicen que las escribió una IA, porque no la escribió.

**La agenda: una página por evento, sin IA.** Cada fecha de la agenda tiene su
página (`/agenda/<nombre>-<id>`), armada con los datos y una plantilla
(`web/lib/eventos.js`): "Del viernes 9 al lunes 12 de octubre, desde las
12.30, en…". No hay nada que inventar.

- **Sólo con fecha confirmada**: la del municipio o una que publicó una persona
  desde el panel. Las fiestas del calendario anual dicen "fecha a confirmar"
  hasta entonces. Una fecha aproximada nunca se publica como confirmada.
- **Qué muestra la ficha** (25/09): el título (con los nombres bien escritos),
  una bajada de plantilla con cuándo y dónde, y un bloque de datos: Cuándo,
  Dónde (con "Cómo llegar"), Entrada, Organiza y, si se detecta, "Qué hay"
  (gastronomía, feria o stands, música en vivo, estacionamiento, ambiente
  familiar: etiquetas nuestras, detectadas por palabras clave en la descripción
  de la fuente y nunca negadas). Debajo, los botones: Agendar en el celular,
  Google Calendar y, si el organizador lo cargó, "Entradas e información ↗"
  (es una acción útil, va como botón). Al pie, la firma corta y "Fuentes (1)".
- **Qué NO muestra**: la descripción que trae el municipio (es el texto de
  otro, con mayúsculas y frases de venta como "no te quedes afuera"; no se
  copia, igual que con las notas); ningún párrafo explicativo de firma; ni
  enlaces a la fuente sueltos ("Lo que cuenta la Municipalidad", "Ver en la
  agenda…"): el enlace al original va adentro del desplegable de fuentes. La
  descripción cruda tampoco va al .ics ni a los datos para Google (llevan la
  bajada de plantilla). Sólo se muestra la descripción que escribió una
  persona de la redacción desde el panel ("De qué se trata"). Una prueba
  (`pruebas/eventos.test.mjs`) cuida todo esto.
- **Los nombres se limpian** (`nombreDeEvento`, `web/lib/eventos.js`), en la
  ficha, la lista, la portada, el .ics y la tarjeta para compartir: lo que
  viene TODO en mayúsculas o todo en minúscula pasa a mayúscula inicial (las
  siglas TC, UTTD, ARG-13, ACTC se quedan) y una lista de correcciones conocidas
  repone las tildes ("Autódromo", "Napaleofú", "Misión"). Un nombre nuevo mal
  escrito se suma a `CORRECCIONES`.
- **La entrada no se inventa**: si no la informaron, la página dice "No la
  informaron. Consultá el valor con quien organiza", nunca "gratis" por las dudas.
- La tarjeta para compartir es propia, **nunca el afiche del organizador**.
- **La firma es una línea corta y gris**, pegada al desplegable "Fuentes (N)" (el
  mismo pie que las notas): "Ficha con los datos de la Municipalidad de
  Balcarce" o "Ficha cargada por la redacción". La explicación larga va sólo al
  abrir el desplegable, y los datos para Google dicen lo mismo. Nunca un
  párrafo a la vista sobre quién la escribió o la revisó.
- El semáforo también mira la agenda: si el nombre de un evento da rojo, no
  sale; si da rojo la descripción, sale sólo con los datos.
- Un evento no es una noticia: no entra en la lista de notas, el feed ni el
  sitemap de noticias. Cuando pasa, la página sigue 60 días con el aviso "Este
  evento ya pasó".

## 9. Las redes

Resumen del criterio. Los horarios, las piezas y cómo se publica, en
[`REDES.md`](REDES.md).

- **Sólo sale lo que ya está publicado en la web.** Lo que el semáforo frenó no
  llega a las redes.
- **Nada sensible sale solo:** Política, Policiales y lo que está en rojo
  esperan a una persona en todas las piezas. Tampoco va una nota sin cuerpo,
  ni una nota propia (el dólar, el repaso de un podcast).
- **Facebook:** hasta **5 notas por día**, con relevancia **75 o más**, de 8
  a **22:00 en punto**, con 90 minutos entre una y otra, y **sin repetir un
  tema** publicado en las últimas 24 horas. El posteo lleva el texto para
  redes (o el título y la bajada), **el enlace a nuestra nota**, "Resumen
  hecho con IA" si la escribió la IA y dos o tres hashtags. **Nunca nombra la
  fuente**: eso está en la nota de la web.
- **Instagram** recibe video con voz (historias y reels) y el espejo de cada
  posteo de Facebook como tarjeta propia. Nunca la foto de otro medio.
- **Podcasts en vez de noticias sueltas:** tres por día, con notas de
  relevancia **62 o más** y de temas distintos, sin repetir las del podcast
  anterior.

## 10. Correcciones y firma

**Cada nota dice quién la escribió**, y lo dice en **una sola línea chica y gris**
al pie, pegada al desplegable de fuentes (`firmaCorta`, en
`web/components/metadatos.js`; la línea es el renglón del `<summary>` de
`web/components/verificacion.js`), y en los datos para Google (`author`, con el
mismo criterio). Los textos:

| La nota es… | La línea dice |
|---|---|
| Escrita por la IA, sin revisión de una persona | "Redacción con IA, verificada contra las fuentes · Fuentes (N)" |
| Escrita por la IA y revisada y publicada por una persona | "Redacción con IA, revisada por la redacción · Fuentes (N)" |
| Cargada o corregida por una persona | "Revisada por la redacción · Fuentes (N)" |
| El texto de la fuente, sin reescribir | "Texto de *medio* · Fuentes (N)" |
| Propia (dólar, repaso) | Lo que dice la nota: "Nota de Radar Balcarce con datos de…" |

La explicación larga ("la escribió una inteligencia artificial con lo que
publicaron las fuentes, y se verificó automáticamente contra ellas: un dato que
no estaba se descarta", más el enlace a *Quiénes somos*) se ve sólo al abrir el
desplegable. Nunca se dice "sin revisión humana": es un dato interno, y el
sitio nunca promete una revisión que no hubo. En Facebook, "Resumen hecho con
IA". El pie de la web lo dice para todo el sitio: los textos los escribe una IA
y se verifican automáticamente contra la fuente, que queda enlazada; lo
sensible lo revisa una persona antes de salir; las voces de los videos
también son de IA.

**Cuando algo sale mal:**

- **Una persona corrige desde el panel** (título, bajada o cuerpo). Lo que
  decide una persona manda siempre: la IA nunca pisa una decisión humana. Al
  corregir, las partes para la redacción se borran, porque las armó la IA
  sobre otro texto y podrían contradecir la corregida.
- **Se saca una nota**: si una persona la bloquea o la descarta, o el semáforo
  la pasa a rojo o amarillo, sale de las listas y su página deja de existir
  hasta que una persona la apruebe.
- **El enlace no se rompe**: la dirección de una nota queda fija desde que sale
  aunque cambie el titular, y la página dura 180 días aunque salga de la
  portada.
- **Cuando se arregla algo que estuvo mal publicado, se escribe una prueba**,
  para que no vuelva a pasar (`REGLAS.md`, regla 19). Y si el error es de
  criterio, se corrige **acá**.

## 11. Los números

Todos los números del criterio. El código los toma de `ingesta/criterio.mjs`
(la columna "Clave" dice cuál) y `pruebas/criterio.test.mjs` controla que esta
tabla diga lo mismo, fila por fila: **si se cambia un número, se cambia en los
dos lados**. Los de las secciones 4 a 10 que se repiten en el texto y en la
instrucción de la IA (70, 90, 100 a 180…) también se controlan.

<!-- NUMEROS:INICIO -->
| Qué | Número | Clave |
|---|---|---|
| Título: largo al que apunta (caracteres) | 70 | `TITULO.objetivo` |
| Título: largo máximo (caracteres) | 90 | `TITULO.maximo` |
| Bajada: frases, como mínimo | 2 | `BAJADA.frasesMinimas` |
| Bajada: frases, como máximo | 3 | `BAJADA.frasesMaximas` |
| Bajada: palabras, más o menos | 50 | `BAJADA.palabras` |
| Bajada: largo máximo (caracteres) | 360 | `BAJADA.maximo` |
| Cuerpo: palabras mínimas para publicarse | 70 | `CUERPO.minimoParaPublicar` |
| Cuerpo: palabras que se le piden, desde | 100 | `CUERPO.palabrasPedidasMinimo` |
| Cuerpo: palabras que se le piden, hasta | 180 | `CUERPO.palabrasPedidasMaximo` |
| Cuerpo: párrafos, como máximo | 3 | `CUERPO.parrafosMaximo` |
| Cuerpo: largo máximo (caracteres) | 1800 | `CUERPO.maximo` |
| Guion: largo máximo (caracteres) | 200 | `GUION.maximo` |
| Guion: duración (segundos, más o menos) | 10 | `GUION.segundos` |
| Claves: como mínimo | 3 | `PARTES.clavesMinimo` |
| Claves: como máximo | 5 | `PARTES.clavesMaximo` |
| Una clave: largo máximo (caracteres) | 180 | `PARTES.clave` |
| Un dato de "qué se sabe" o "qué falta confirmar" (caracteres) | 260 | `PARTES.dato` |
| Lo que aportó una fuente (caracteres) | 220 | `PARTES.aporte` |
| Texto para redes: largo máximo (caracteres) | 280 | `PARTES.textoRedes` |
| Etiquetas: como mínimo | 3 | `PARTES.etiquetasMinimo` |
| Etiquetas: como máximo | 8 | `PARTES.etiquetasMaximo` |
| Una etiqueta: largo máximo (caracteres) | 40 | `PARTES.etiqueta` |
| Palabras seguidas copiadas del original, como máximo | 12 | `COPIA_MAXIMA` |
| Intentos de la IA por nota | 3 | `REESCRITURA.intentosMaximos` |
| Días que se recuerdan los intentos | 7 | `REESCRITURA.diasDeIntentos` |
| Palabras de resumen mínimas sin texto completo | 60 | `REESCRITURA.palabrasMinimasDeMaterial` |
| Notas que se le piden a la IA por corrida | 40 | `REESCRITURA.porCorrida` |
| Notas que se le piden a la IA por día, como máximo | 150 | `REESCRITURA.porDia` |
| Texto completo de la fuente: caracteres que recibe la IA | 4000 | `REESCRITURA.caracteresDelTextoCompleto` |
| Antecedentes: días hacia atrás | 30 | `REESCRITURA.diasDeAntecedentes` |
| Antecedentes: como máximo | 3 | `REESCRITURA.antecedentesMaximo` |
| Portada: horas que una nota está en las listas | 72 | `PORTADA.horas` |
| Portada: horas que una nota compite por el lugar grande | 6 | `PORTADA.horasNotaGrande` |
| Días que dura la página de una nota | 180 | `PORTADA.diasDeArchivo` |
| Piso de lo de afuera: Deportes | 62 | `PISO_DE_AFUERA.Deportes` |
| Piso de lo de afuera: Economía | 38 | `PISO_DE_AFUERA.Economía` |
| Piso de lo de afuera: Tecnología | 34 | `PISO_DE_AFUERA.Tecnología` |
| Piso de lo de afuera: Política | 40 | `PISO_DE_AFUERA.Política` |
| Piso de lo de afuera: Policiales | 40 | `PISO_DE_AFUERA.Policiales` |
| Piso de lo de afuera: Cultura y agenda | 38 | `PISO_DE_AFUERA.Cultura y agenda` |
| Piso de lo de afuera: Agro | 38 | `PISO_DE_AFUERA.Agro` |
| Piso de lo de afuera: el resto de las secciones | 50 | `PISO_POR_DEFECTO` |
| Cupo de lo de afuera: Deportes | 10 | `CUPO_DE_AFUERA.Deportes` |
| Cupo de lo de afuera: Economía | 12 | `CUPO_DE_AFUERA.Economía` |
| Cupo de lo de afuera: Tecnología | 8 | `CUPO_DE_AFUERA.Tecnología` |
| Cupo de lo de afuera: Política | 8 | `CUPO_DE_AFUERA.Política` |
| Cupo de lo de afuera: Policiales | 8 | `CUPO_DE_AFUERA.Policiales` |
| Cupo de lo de afuera: Automovilismo | 6 | `CUPO_DE_AFUERA.Automovilismo` |
| Cupo de lo de afuera: Cultura y agenda | 8 | `CUPO_DE_AFUERA.Cultura y agenda` |
| Cupo de lo de afuera: el resto de las secciones | 15 | `CUPO_POR_DEFECTO` |
| Facebook: notas por día, como máximo | 5 | `FACEBOOK.porDia` |
| Facebook: relevancia mínima | 75 | `FACEBOOK.relevanciaMinima` |
| Facebook: desde la hora | 8 | `FACEBOOK.desdeHora` |
| Facebook: hasta la hora (en punto) | 22 | `FACEBOOK.hastaHora` |
| Facebook: minutos entre un posteo y otro | 90 | `FACEBOOK.minutosEntrePosteos` |
| Facebook: minutos que espera una nota nueva | 15 | `FACEBOOK.esperaMinutos` |
| Facebook: horas de vida de una nota para salir | 8 | `FACEBOOK.edadMaximaHoras` |
| Facebook: horas sin repetir un tema | 24 | `FACEBOOK.horasSinRepetirTema` |
| Podcasts e historias: relevancia mínima | 62 | `PIEZAS.relevanciaPodcast` |
| Feed de Instagram: relevancia mínima | 80 | `PIEZAS.relevanciaFeed` |
| Historias de notas por día | 3 | `PIEZAS.historiasDeNotas` |
| Feed de Instagram: posteos por día | 2 | `PIEZAS.feedPorDia` |
| Podcast de la mañana y de la tarde: notas | 3 | `PIEZAS.notasPorPodcast` |
| Podcast de la noche: notas | 4 | `PIEZAS.notasPodcastNoche` |
| Podcast: notas mínimas para que salga | 2 | `PIEZAS.notasMinimasPodcast` |
<!-- NUMEROS:FIN -->

## 12. La instrucción de la IA

Esto es **lo que lee la IA, tal cual**, antes de cada noticia. Se arma con
las **reglas fijas** y, en el lugar marcado `{{TONO}}`, **uno de los dos
tonos**: el serio si la nota es de Policiales o toca una de las palabras de la
sección 4; si no, el de todos los días. Después va la noticia con sus
fuentes. La "nota aparte" del final **no se le manda**: es lo que el panel
muestra debajo, para quien lee la instrucción.

Se puede corregir cualquier palabra, con dos cuidados: no borrar las marcas
(las líneas que empiezan con `<!--`), que es por donde el sistema sabe qué
parte es cuál, y dejar `{{TONO}}` en su lugar. Si se cambia un número, va
también a la sección 11.

<!-- PROMPT:INICIO -->

### Las reglas fijas

<!-- PROMPT:REGLAS:INICIO -->
Sos el editor digital de Radar Balcarce, un medio digital de Balcarce (provincia de Buenos Aires, Argentina). Tu trabajo es que quien lee entienda qué pasó, dónde, cuándo, a quién afecta, qué significa para los balcarceños, qué se sabe y qué falta confirmar. Escribís claro, directo y neutral: sin sensacionalismo y sin opinión.

Te llega una noticia que publicó otro medio (a veces más de uno contó lo mismo). Antes de escribir, la investigás con lo que recibís — no tenés nada más que eso, y nada de afuera cuenta:

A. Identificás el hecho central: qué pasó, dónde, cuándo y a quién afecta.
B. Contrastás las fuentes que recibís, numeradas (Fuente 1, Fuente 2…): son los medios que contaron esta misma noticia, y a veces un organismo público marcado como fuente oficial. Separás lo que confirman varias fuentes, lo que dice una sola, lo que se contradice entre ellas, lo que es una declaración de parte (lo que afirma alguien interesado: un denunciante, un funcionario sobre su propia gestión, un club sobre su equipo) y lo que no se puede verificar.
C. Priorizás lo local: si la noticia es de afuera, contás qué tiene que ver con Balcarce sólo si las fuentes lo dicen.
D. Cada dato importante va atribuido a quien lo dio, y se prefiere la fuente primaria (el organismo, el club, la Policía, la persona que habló) antes que el medio que lo reprodujo. Si hay una fuente oficial, su versión va primero.
E. Cuidás las fechas: no mezclás lo que pasó antes con lo de ahora, ni presentás como actual algo que la fuente cuenta como histórico.
F. Los ANTECEDENTES, si vienen, son notas que Radar Balcarce publicó antes sobre el mismo tema, cada una con su fecha. Sirven sólo de contexto: lo que saques de ahí va en el cuerpo, en las claves o en lo que se sabe, dicho como anterior y con su fecha o su momento ("en agosto", "a principios de mes", "como se había informado"). Nunca en el título, la bajada, el guion ni el texto para redes, y nunca como si fuera de hoy. Si un antecedente y la fuente de hoy no coinciden, manda la fuente de hoy.
G. Nunca presentás como propio de Radar Balcarce lo que informó otro medio: nada de "pudo saber este medio" ni "confirmó Radar Balcarce".
H. Si recibiste una sola fuente, no inventás una "ampliación": la nota cuenta lo que esa fuente dice, y en lo que falta confirmar va que todavía no pudo ser contrastada de forma independiente.

Después la escribís, con estas reglas fijas:

1. NUNCA copiás el texto original. Se reescribe con palabras propias, cruzando lo que cuenta cada fuente si hay más de una. Podés citar una frase textual corta si hace falta, entre comillas.
2. El título apunta a unos 70 caracteres y NUNCA pasa de 90, sin signos de admiración, sin pregunta, y se entiende solo en la pantalla del celular. Dice qué pasó: empieza por el hecho (sujeto y verbo en presente: "El Concejo aprueba…", "Ferroviarios gana…"), no por el lugar ni por una etiqueta. Si el hecho es de Balcarce y el título no lo dice, va "en Balcarce" al final. Nunca "Video:", "Ojo:" ni frases de gancho ("lo que tenés que saber"). Nunca "en vivo", "EN VIVO", "minuto a minuto", "en directo" ni nada parecido, ni en el título ni en la bajada, aunque el titular original lo diga: Radar Balcarce no hace coberturas en vivo, cuenta lo que pasó.
3. La bajada (el campo "copete") son dos o tres frases cortas, unas 50 palabras como mucho: qué pasó, cómo se relaciona con Balcarce y el dato más importante. Nada de "cabe destacar que" ni antecedentes largos: la profundidad va en el cuerpo (punto 4).
4. El cuerpo es OBLIGATORIO: sin cuerpo la nota no se publica. Es la nota desarrollada, lo que se lee al abrirla, y se escribe SÓLO con información de las fuentes: desarrollás lo que dan TODAS las fuentes que recibiste (los resúmenes de cada medio y el texto completo, que es donde está la mayor parte de los datos), más los antecedentes como contexto, siempre con su fecha. Va de 100 a 180 palabras, en uno a tres párrafos cortos separados por un salto de línea en blanco. Nunca lo devolvés vacío, nunca es la bajada dicha de nuevo con otras palabras, y nunca lo rellenás con frases vacías: si falta largo, suma datos de las fuentes (quién, cuándo, dónde, cuánto, qué dijo cada uno), no adjetivos. Se arma de lo más importante a lo menos:
   · Primer párrafo: el hecho central con el dato que la bajada NO dio (quién, cuándo, dónde, cuánto). Nunca arranca con las mismas palabras de la bajada ni la dice de nuevo.
   · Segundo párrafo: el contexto que sí importa (antecedentes, cómo se llegó a esto, qué había antes).
   · Tercer párrafo (sólo si la fuente da para eso): qué sigue o qué significa para la gente de Balcarce.
   Las citas textuales sólo si están en la fuente, entre comillas y atribuidas ("dijo", "explicó"). Nada de conclusiones ni valoraciones al final ("sin dudas", "una gran noticia").
   El análisis de los pasos A a H se usa PARA ESCRIBIR el cuerpo, no para contarlo aparte: lo que confirman varias fuentes va dicho como hecho; lo que dice una sola, atribuido a esa fuente ("según informó el municipio", "de acuerdo con un medio local"); lo que las fuentes cuentan distinto, con las dos versiones atribuidas; y lo que no se pudo confirmar, dicho como no confirmado ("todavía no se informó…", "no trascendió…"). El lector no ve tu análisis: ve una nota mejor escrita gracias a él.
{{TONO}}
6. Los números van redondeados y comparados cuando se pueda ("el triple que el año pasado") antes que un porcentaje con decimales.
7. El guion para la voz ES EL TÍTULO, dicho tal cual, y nada más. Nada de contexto, nada de cierre, nada de "la nota completa en...". Sólo cambiás algo si el título no se puede leer en voz alta: las siglas se escriben como se pronuncian y los números van en palabras (catorce, no 14). La pieza tiene que durar unos diez segundos: si el título es largo, acortalo al hecho central en vez de agregarle nada.
8. La fuente NO se nombra nunca en el guion de voz, en el título ni en el texto para redes: eso va aparte, en la atribución de la nota. En el cuerpo sí podés referirte a ella en general ("según informó el municipio"), nunca citar el nombre del medio que la publicó.
9. Nunca inventás un dato, una cifra, un nombre, un día o una cita que no esté en lo que recibiste — en ninguna parte de lo que devolvés. Si un dato no se puede verificar con las fuentes recibidas, no lo afirmás: va en lo que falta confirmar. Si dos fuentes se contradicen en un dato (una hora, un número), no elegís una al azar ni inventás uno propio para "resolver" la diferencia: mostrás las dos versiones atribuidas ("un medio habla de… y otro de…"), o usás la de la fuente oficial si la hay, y la diferencia va en lo que falta confirmar.
10. Si la nota original ACUSA a alguien de algo (un delito, una falta, una irregularidad) y todavía no hay una condena o una confirmación oficial: SIEMPRE atribuís la acusación a quien la hizo ("según la denuncia de...", "de acuerdo con la Policía...", "según fuentes judiciales...") y usás el modo condicional ("habría", no "hizo"). Nunca lo escribís como un hecho afirmado por vos, ni en el copete ni en el cuerpo. Esto no es sólo estilo: es lo que en Argentina protege a un medio de una demanda por calumnias o injurias (doctrina Campillay).
11. Presentás a cada persona con su cargo la primera vez que aparece ("el intendente Fulano Pérez", "la concejal Mengana Gómez") y después por el apellido. No usás "ayer", "hoy" ni "mañana" si la fuente no dice el día: ponés el día de la semana que la fuente trae, o nada.
12. Escribís en castellano correcto, con las tildes y la eñe donde van (últimos, sábado, Napaleofú, señal). Un medio que escribe sin tildes se lee como un mensaje apurado, no como un medio.
13. NUNCA identificás a un menor de edad (sea víctima, acusado o testigo) ni a una víctima de un delito sexual o de violencia de género. Eso quiere decir: ni su nombre, ni su apodo, ni sus iniciales, ni su escuela, ni su domicilio o su cuadra, ni un parentesco que la deje identificada ("la hija del dueño de tal comercio"), ni su foto ni su descripción física. Aunque la fuente lo publique, vos no lo repetís: hablás de la persona de forma general, sin nada que permita saber quién es. No es estilo: lo exigen las leyes 26.061 y 26.485.

Además del título, la bajada, el cuerpo y el guion, devolvés:

- claves: de 3 a 5 puntos cortos, de una línea cada uno, con lo esencial de la nota.
- seSabe: los datos confirmados por las fuentes, uno por punto, atribuidos cuando corresponde ("según la Municipalidad…").
- noConfirmado: lo que no se pudo verificar con las fuentes recibidas y lo que las fuentes cuentan distinto, uno por punto. Si no hay nada, una lista vacía. Si recibiste una sola fuente, va este punto tal cual: "No pudo ser contrastado de forma independiente con las fuentes consultadas."
- aportes: por cada fuente que usaste, {"fuente": su número, "aporte": qué información aportó, en una frase}. Sin nombrar al medio: el nombre ya se muestra al lado.
- textoRedes: el texto para el posteo de Facebook, hasta 280 caracteres: qué pasó y por qué le importa a Balcarce. Sin nombrar al medio de origen, sin hashtags, sin enlaces y sin emojis (el enlace a la nota y los hashtags se agregan aparte).
- etiquetas: de 3 a 8 palabras o frases cortas que digan de qué trata la nota, sin "#".
- nivel: cómo evaluás la verificación, ALTA (hay una fuente oficial o varias fuentes independientes), MEDIA (una sola fuente confiable, sin confirmación independiente) o BAJA (información preliminar, declaraciones de parte sin verificar o evidencia insuficiente). Es sólo una sugerencia: el nivel que se publica lo calcula el sistema.

Todo eso sigue las mismas reglas que el cuerpo: nada que no esté en lo que recibiste, nada copiado, ningún menor ni víctima identificable, y las acusaciones siempre atribuidas y en condicional.

Devolvés SOLO un JSON con esta forma exacta, sin texto alrededor:
{"titulo": "...", "copete": "...", "cuerpo": "...", "guion": "...", "claves": ["..."], "seSabe": ["..."], "noConfirmado": ["..."], "aportes": [{"fuente": 1, "aporte": "..."}], "textoRedes": "...", "etiquetas": ["..."], "nivel": "MEDIA"}
<!-- PROMPT:REGLAS:FIN -->

### El tono de todos los días (va en el lugar de `{{TONO}}`)

<!-- PROMPT:TONO_AMENO:INICIO -->
5. Tono: español rioplatense neutro y cercano. Tercera persona, sin voseo ni modismos: no es un amigo contando algo, es un medio informando — pero se lee liviano, como una novedad del pueblo bien contada, no como un parte frío. Ni solemne ni canchero. Sin adjetivos de opinión en nota informativa, sin exclamaciones, sin "impresionante", "tremendo" ni "increíble".
<!-- PROMPT:TONO_AMENO:FIN -->

### El tono serio (va en el lugar de `{{TONO}}` en lo serio)

<!-- PROMPT:TONO_SERIO:INICIO -->
5. Tono: por el tema (inseguridad o una problemática local), acá el registro es sobrio e institucional. Preciso y mesurado, sin ninguna calidez ni color: sólo los hechos, con el cuidado que exige algo que afecta a la gente. Nada de liviandad ni de humor. Tercera persona, sin opinión.
<!-- PROMPT:TONO_SERIO:FIN -->

### Nota aparte (no se le manda a la IA: la muestra el panel)

<!-- PROMPT:NOTA_PANEL:INICIO -->
Nota aparte, esto no se lo manda a la IA: cuando la noticia es de Policiales, o
toca inseguridad, robos, choques, accidentes, incendios, cortes de luz o agua,
conflictos, protestas, reclamos o alguna emergencia, el punto 5 cambia por el
registro serio de arriba en vez del cercano.

Además, antes de publicar lo que escribió la IA, el texto completo de la
fuente y lo que ella escribió pasan por el semáforo (las listas roja y
amarilla de ingesta/fuentes.mjs). Si algo da rojo o amarillo, lo escrito por
la IA no se usa y la nota espera a una persona (o no sale, si es rojo).

Las partes nuevas (claves, qué se sabe, qué falta confirmar, qué aportó cada
fuente, el texto para redes y las etiquetas) pasan por el mismo verificador
que el cuerpo. Si una no cuadra con la fuente, se descarta esa parte sola y la
nota sale igual.

El nivel de verificación que se publica NO es el que sugiere la IA: lo calcula
el sistema. ALTA si entre las fuentes hay una oficial o dos o más medios
distintos; MEDIA con un solo medio; BAJA si, con un solo medio, la nota se
apoya en una denuncia o en una declaración de parte, o si lo que falta
confirmar toca el hecho central. Si da BAJA, la nota no sale sola: espera a
una persona, como una amarilla.

El cuerpo es obligatorio: una nota automática sin cuerpo de al menos 70
palabras no se publica en ningún lado. Si el cuerpo trae un dato que no
cuadra con la fuente, se sacan sólo las oraciones con ese dato; si lo que
queda no alcanza, se le pide de nuevo con la corrección. Cada nota se le pide
a la IA como mucho tres veces, en corridas distintas. Sin el texto completo
de ninguna fuente y con un resumen corto, no se le pide nada.

El lector ve sólo el título, la bajada, el cuerpo y un desplegable con las
fuentes (el nombre de cada medio y su enlace). Las claves, qué se sabe, qué
falta confirmar, lo que aportó cada fuente y el nivel de verificación son de
uso interno: se guardan y se ven en el panel, no en la web.

No se busca nada en internet: las otras fuentes son los medios que contaron lo
mismo y hasta tres notas que el sitio ya publicó sobre el tema en los últimos
30 días (los antecedentes), marcadas con su fecha.
<!-- PROMPT:NOTA_PANEL:FIN -->

<!-- PROMPT:FIN -->

## Dónde está cada cosa en el código

| Qué | Dónde |
|---|---|
| La instrucción de la IA (se lee de acá) | `ingesta/prompt-editorial.mjs` la carga; `reels/reescritura.mjs` la usa |
| Los números | `ingesta/criterio.mjs`, controlados por `pruebas/criterio.test.mjs` |
| El semáforo, las secciones, las fuentes y sus pesos | `ingesta/fuentes.mjs` (`REGLAS_SEMAFORO`, `REGLAS_SECCION`, `FUENTES`) |
| El verificador | `ingesta/verificar.mjs` |
| El nivel de verificación, el tono y los intentos | `reels/reescritura.mjs` |
| "Sin cuerpo no se publica" | `web/lib/cuerpo.js` |
| Lo que ve el lector de las fuentes | `web/lib/fuentes-de-la-nota.js` y `web/components/verificacion.js` |
| Qué sale en las redes | `redes/elegir.mjs` |
| La firma (una línea) | `firmaCorta` en `web/components/metadatos.js`; se ve en `web/components/verificacion.js` |
| Las pruebas de todo esto | `pruebas/criterio.test.mjs`, `pruebas/editor.test.mjs`, `pruebas/reescritura.test.mjs`, `pruebas/verificar.test.mjs`, `pruebas/cuerpo.test.mjs`, `pruebas/semaforo.test.mjs` |

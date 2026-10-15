# Criterio editorial de Radar Balcarce — PROPUESTA

*Borrador del 15/10/2026. **No rige**: rige `CRITERIO-EDITORIAL.md` hasta que Hernán y Andrés aprueben esto.
El porqué de cada cambio está en `docs/criterio/ANALISIS.md`.*

## Cómo se lee

- Es **el criterio editorial y nada más**: qué publicamos, cómo lo contamos y cómo respondemos por lo que
  publicamos. Las reglas del sistema (semáforo, cupos, ventanas de tiempo, verificador, horarios de redes) se
  nombran con un puntero a su documento, sin repetirlas.
- **[INTOCABLE]** = límite legal o regla que no se negocia. Está copiado **palabra por palabra** del criterio
  vigente. Sólo cambia con la decisión escrita de Hernán (`docs/DECISIONES.md`, 15/10).
- **[DUEÑOS]** = decisión editorial abierta. Mientras no se decida, vale lo que hace hoy el código, y se dice cuál
  es.
- **[SIN VERIFICAR]** = no se pudo confirmar.
- Los números van en la tabla del § 12; en el texto se nombran sólo los que hacen falta para entender.

## Cómo encaja con el sistema (las marcas)

El programa que le arma la instrucción a la IA (`ingesta/prompt-editorial.mjs`) lee partes de
`CRITERIO-EDITORIAL.md` entre marcas `<!-- NOMBRE:INICIO -->` y `<!-- NOMBRE:FIN -->`. Si falta una, **la IA no
escribe**. Esta propuesta **conserva todas las marcas con el mismo nombre**:

| Marca | Dónde quedaría | Qué cambia adentro |
|---|---|---|
| `NUMEROS` | § 12 | Nada por ahora (la prueba compara fila por fila). Más adelante: separar guías para la IA de cortes del sistema |
| `RELLENO` | § 5 | Nada (la misma lista de 26 frases) |
| `PALABRAS_SERIAS` | § 5 | Nada, salvo que se decida sacar "crisis" y "conflicto" [DUEÑOS] |
| `PROMPT` (marco) | § 13 | Nada |
| `PROMPT:REGLAS` | § 13 | La versión corta, **sólo si gana la medición** (`ANALISIS.md` § 4.4); `{{TONO}}` sigue, una sola vez |
| `PROMPT:TONO_AMENO` y `PROMPT:TONO_SERIO` | § 13 | Sin el "5." del comienzo, si el tono pasa al final; sin "liviano" en lo que leen las personas |
| `PROMPT:NOTA_PANEL` | § 13 | Tres líneas. **No se puede borrar sin tocar código** (`prompt-editorial.mjs:71`, `reels/reescritura.mjs:94`) y una prueba exige cuatro números ahí (`pruebas/criterio.test.mjs:190-193`) |

---

## 0. Lo intocable [INTOCABLE]

Copiado tal cual del criterio vigente (en las filas que venían de una tabla, la división entre columnas se muestra
con «—»; las palabras son las mismas, controlado con un programa contra `CRITERIO-EDITORIAL.md`). Donde el código
hace hoy algo más preciso, se agrega **al lado** una nota que lo explica, sin cambiar la regla.

**Menores y víctimas** (vigente, `CRITERIO-EDITORIAL.md:159`):

> **Nada que identifique a un menor ni a una víctima** de un delito sexual o de violencia de género: ni nombre, ni
> apodo, ni iniciales, ni escuela, ni domicilio o cuadra, ni un parentesco que la deje identificada, ni su foto ni
> su descripción. Aunque la fuente lo publique — Lo exigen las leyes 26.061 y 26.485. El semáforo rojo lo frena
> (`INVESTIGACION.md` § 6)

Y lo que lee la IA (regla 13 vigente, `CRITERIO-EDITORIAL.md:884`):

> 13. NUNCA identificás a un menor de edad (sea víctima, acusado o testigo) ni a una víctima de un delito sexual o de violencia de género. Eso quiere decir: ni su nombre, ni su apodo, ni sus iniciales, ni su escuela, ni su domicilio o su cuadra, ni un parentesco que la deje identificada ("la hija del dueño de tal comercio"), ni su foto ni su descripción física. Aunque la fuente lo publique, vos no lo repetís: hablás de la persona de forma general, sin nada que permita saber quién es. No es estilo: lo exigen las leyes 26.061 y 26.485.

*Nota de lectura (no cambia la regla):* las dos frases se leen igual que la de la IA: ningún menor identificable,
sea víctima, acusado o testigo, y ninguna víctima de un delito sexual o de violencia de género. Nombrar a un menor
en una nota positiva **sigue prohibido** mientras Hernán no diga lo contrario por escrito.

**El semáforo rojo** (vigente, `CRITERIO-EDITORIAL.md:179`):

> **Rojo** — No se publica nunca, ni por error — Identifica o puede identificar a un menor o a una víctima de
> violencia de género o de un delito sexual (menor de edad, abuso sexual, violación, femicidio, grooming,
> suicidio…). También las listas de sepelios (`REGLAS_SEMAFORO.nunca`)

*Nota de lectura (lo que hace el código desde el 8/10, regla 119, decidido por Hernán y Andrés):* lo rojo no sale
con el texto que lo puso en rojo, ni aprobado por una persona; si una persona lo reescribe y el texto final ya no
toca la lista roja, puede salir (es la salida para un falso positivo como "violación de la ley"). El aviso fúnebre
no sale nunca, de ninguna forma (regla 118). La lista roja no se toca sin preguntar (`CLAUDE.md`).

**Acusaciones** (vigente, `CRITERIO-EDITORIAL.md:160` y `:447-451`):

> **Una acusación dicha como hecho.** Sin condena o confirmación oficial, se atribuye a quien acusó y va en
> condicional ("habría") — Doctrina Campillay: es lo que protege al medio de una demanda por calumnias o injurias

> **Acusaciones: doctrina Campillay.** Si la nota acusa a alguien de algo (un delito, una falta, una
> irregularidad) y no hay condena ni confirmación oficial, siempre se atribuye a quien acusó ("según la denuncia
> de…", "de acuerdo con la Policía…") y se usa el condicional ("habría", no "hizo"). En el copete y en el cuerpo.

Y lo que lee la IA (regla 10 vigente, `CRITERIO-EDITORIAL.md:881`):

> 10. Si la nota original ACUSA a alguien de algo (un delito, una falta, una irregularidad) y todavía no hay una condena o una confirmación oficial: SIEMPRE atribuís la acusación a quien la hizo ("según la denuncia de...", "de acuerdo con la Policía...", "según fuentes judiciales...") y usás el modo condicional ("habría", no "hizo"). Nunca lo escribís como un hecho afirmado por vos, ni en el copete ni en el cuerpo. Esto no es sólo estilo: es lo que en Argentina protege a un medio de una demanda por calumnias o injurias (doctrina Campillay).

**Sepelios** (vigente, `CRITERIO-EDITORIAL.md:168`):

> **Las listas de sepelios** (nombres de personas fallecidas), ni aprobadas por una persona — Decisión de Hernán,
> 27/09: es sensible y no hay fuente oficial (`REGLAS_SEMAFORO.nunca`, `nuncaSePublica`)

*Nota de lectura:* desde el 8/10 la misma regla frena también "necrológica", "obituario", "q.e.p.d.", "servicio
fúnebre" y "cochería" en el título (regla 118). La **noticia** de la muerte de alguien de acá no está ahí: espera a
una persona.

**No copiar** (lo que lee la IA, regla 1 vigente, `CRITERIO-EDITORIAL.md:866`; ley 11.723):

> 1. NUNCA copiás el texto original: nunca más de diez palabras seguidas iguales a las de una fuente, en ninguna parte (tampoco en el título, la bajada ni adentro de una cita). Se reescribe con palabras propias, cruzando lo que cuenta cada fuente si hay más de una: cambiás el orden de la frase y el verbo, y partís en dos lo que la fuente dice en una oración larga. Una cita textual va entre comillas, atribuida, y tiene diez palabras como mucho: si lo que dijo alguien es más largo, lo contás con tus palabras ("explicó que…").

*Nota de lectura:* la IA tiene que quedarse en 10; el verificador rechaza desde más de 12. El margen es a propósito.

**La atribución de lo ajeno** (vigente, `CRITERIO-EDITORIAL.md:592-594`):

> **El desplegable de fuentes es la atribución** (ley 11.723): toda nota tiene al menos la fuente principal, y el
> enlace es siempre **la página de la nota original**, nunca un archivo interno del medio.

**Las fotos** (vigente, `CRITERIO-EDITORIAL.md:137-148`):

> Nunca una foto inventada por IA que parezca real. Condiciones que no se negocian:
>
> - **Nunca la marca de agua ni el nombre de otro medio pegado encima de la imagen** (el logo en una esquina, el
>   zócalo de un canal): el crédito va en la cita, debajo. Los medios chicos de la zona suelen pegar su logo en una
>   esquina: con la mínima duda, esa foto no se usa. Lo que estaba en la escena real sí puede verse, también el
>   micrófono con el nombre de una radio (decisión del 29/09).
> - **Toda foto usada así se guarda en el banco propio** (`web/data/banco-fotos.json`), con su crédito y de qué
>   nota salió.
> - **Nunca la foto de un menor o de una víctima**, ni en Policiales, salvo una foto oficial de Bomberos o la
>   Policía.

*Nota de lectura:* hoy la IA de fotos, en la duda sobre un logo, se pregunta si "podría estar en la foto de
cualquier otra persona presente"; si sí, la usa. Eso es más flexible que "con la mínima duda, esa foto no se usa".
Se respeta lo escrito hasta que Hernán diga cuál vale [DUEÑOS]. Y el código **no** usa la excepción de Bomberos o
Policía para menores: nunca elige la foto de un menor (es más estricto, y así queda).

---

## 1. Misión y audiencia

Radar Balcarce es un medio digital de Balcarce (provincia de Buenos Aires) que funciona solo: lee los medios y los
organismos públicos, decide qué publicar, lo escribe con IA, lo controla contra las fuentes y lo publica. Hernán y
Andrés deciden lo que el sistema no puede decidir solo.

**Le escribe a la gente de Balcarce**, que quiere saber qué pasó en su pueblo sin leer cinco medios. Por eso:

- **Lo de Balcarce primero.** Lo de afuera entra si le importa a alguien de acá o si lo cuenta todo el país.
- **Informar, no gritar.** Claro, directo y neutral: sin sensacionalismo, sin opinión, sin cebar el clic.
- **Decir de dónde sale cada cosa.** Cada nota dice quién la escribió y de qué medios sale lo que cuenta.
- **Una noticia, una nota.** Si varios medios cuentan lo mismo, es una sola nota con todos como fuentes.
- **El lector ve la nota, no el trabajo.** Título, bajada, cuerpo y un desplegable cerrado "Fuentes (N)".

## 2. Qué publicamos y qué no

### 2.1 Por lugar

Tres niveles, siempre con estos nombres:

| Nivel | Qué es hoy (lo que hace el código) | Qué se trae |
|---|---|---|
| **Balcarce** | Lo que publica un medio de Balcarce y nombra algo de acá, o lo que dice Balcarce **en el título**, siempre que la lectura con IA no diga que el hecho es de otro lado (`esDeAca`). Nombrar a Balcarce al pasar, o que participen vecinos en un hecho de otra ciudad, no alcanza | Todo, aunque lo cuente un solo medio |
| **La zona** | Lo que toca a Balcarce desde afuera: hoy, las rutas 226 y 55 y frases de la papa (`PALABRAS_ZONA`) | Sale aunque lo cuente un solo medio |
| **De afuera** | Todo lo demás: otras ciudades del sudeste, el país y el exterior | Sólo si lo cuentan los medios que pide su sección; nunca con uno solo |

- **Lo copiado de afuera es de afuera.** Un medio de acá que cuenta lo mismo que los nacionales sin nombrar nada de
  acá está copiando una noticia de afuera.
- **Lo que cuentan sólo medios de otras ciudades de la zona** (Mar del Plata, Tandil, Necochea) no se trae, salvo
  que diga Balcarce en el título o toque la zona.
- **Una fuente oficial de Balcarce alcanza sola** (Municipalidad, Concejo Deliberante, Facultad de Ciencias
  Agrarias). La de la Provincia, como cualquiera de afuera, necesita que otros medios lo cuenten.

[DUEÑOS] **Hasta dónde llega "la zona"**: ¿la ruta 226 o la 55 en cualquier tramo o sólo dentro del partido (o
cuando afecta a quien viaja desde o hacia Balcarce)? ¿La papa de cualquier lugar o sólo la del sudeste? ¿Lobería,
Ayacucho y Mar Chiquita son "la zona" o "de afuera"? Y que las seis localidades del partido (Balcarce, Napaleofú,
Ramos Otero, San Agustín, Los Pinos, Villa Laguna La Brava) se reconozcan igual en el perfil de la IA y en el código
(hoy no: ver la etapa 2-5).

### 2.2 Por tipo

| Tipo | Qué hacemos | Quién lo aplica |
|---|---|---|
| Noticia de Balcarce o de la zona | Sale sola si el semáforo da verde y tiene cuerpo | Código y lectura con IA |
| Noticia de afuera | Sale sola si la cuentan los medios distintos que pide su sección (§ 12) y entra en el cupo | Código |
| Policiales | Sólo de Balcarce y la zona. En la web, sola si da verde; en las redes, siempre con una persona | Lectura con IA, semáforo |
| Política | En la web, sola si da verde; en las redes, siempre con una persona | Semáforo, redes |
| Lo de otros países | Sólo con conexión argentina (un argentino destacado, el gobierno argentino afuera, Malvinas). Si igual se cuela, espera a una persona. [DUEÑOS: ¿descartarlo del todo?] | Lectura con IA, semáforo |
| Fórmula 1 sin un argentino | Hoy depende de la lectura con IA. [DUEÑOS: propuesta, sólo nuestras notas con datos] | Lectura con IA |
| La cotización del dólar o el pronóstico de otro medio | Hoy el dólar espera a una persona; el clima entra como nota. [DUEÑOS: propuesta, descartarlos: el sitio tiene `/dolar`, el clima y sus propias notas] | Semáforo |
| **Publicidad**: lo que vende o paga un comercio, una marca o un profesional (ofertas, avisos, lanzamientos, notas pagas) | No se publica | Lectura con IA |
| **Promoción**: un sorteo, "ganá tu entrada", un medio que cuenta sus propios datos de contacto | Entra, pero nunca sale sola | Semáforo |
| **Chimento**: la vida privada de famosos (romances, separaciones, peleas, internaciones). Un estreno, una gira, un premio o la muerte de una figura **no** son chimento | No se publica | Lectura con IA |
| Consejos genéricos, horóscopo, recetas, loterías | No se traen | Filtro de entrada |
| Listas de sepelios y avisos fúnebres | Nunca [INTOCABLE, § 0] | Semáforo |
| Efemérides de otro medio | Nunca: las efemérides son nuestras (regla 164) | Semáforo |
| Coberturas "en vivo" | No hacemos: contamos lo que pasó ("música en vivo" sí se puede decir) | Verificador |
| Una nota automática sin cuerpo | No se publica en ningún lado (§ 7) | Código |
| Un dato que circula en redes (pista) | Sólo lo que confirman las fuentes, nunca el rumor; sale sola si la cubren 3 medios o más y el verificador no marca nada (regla 101) | Persona o código |
| Notas propias con datos: dólar (cuando se mueve), clima del día, F1, fútbol, "Un día como hoy", repasos, agenda | Plantilla con datos, **sin IA**, con su fuente y su firma; no van como posteo a Facebook ni a los repasos | Código |
| **Opinión** | Hoy: "sin opinión". [DUEÑOS: propuesta, las notas automáticas nunca opinan; si algún día hay opinión, es una pieza aparte, firmada con nombre real, marcada "Opinión" y nunca escrita por la IA] | — |
| Comentarios de lectores y transmisiones en vivo largas | No hay | — |

### 2.3 Una noticia, una nota; nada viejo

- **Una noticia, una nota**, con todos los medios como fuentes. No se juntan notas distintas del mismo tema (dos
  prácticas del TC son dos notas; un anuncio y su resultado, también). Cuál queda: antes de publicar, la ya
  publicada, la que sale sola, la más contada; si ya había dos páginas, la que fue a redes, la de foto, la de
  cuerpo, la primera, y la otra dirección lleva a ésta. (Detalle: etapa 2-5.)
- **Nada viejo**: lo que nunca salió no se estrena si el hecho tiene más de 12 horas; la portada muestra las últimas
  36 horas y las secciones guardan todo, de a diez por página. Una nota tiene **una sola fecha**, que envejece y
  nunca rejuvenece, y **una sola dirección**, fija desde que sale.

### 2.4 Las secciones

Hoy son once: Balcarce, Política, Policiales, Fútbol, Deportes, Automovilismo, Agro, Economía, Cultura y agenda,
Tecnología y Argentina. Lo práctico de acá (cortes, trámites, obras) va a Balcarce; la farmacia, el clima y el dólar
son servicios del sitio. [DUEÑOS] El 5/10 se habló de pasar a quince; las definiciones (qué entra, qué no, a cuál va
en la duda) las trabaja la etapa 2-5.

## 3. Neutralidad y línea editorial

### Lo que ya vale

- Contamos hechos y atribuimos las opiniones a quien las dijo.
- **Posturas enfrentadas**: cada una con su argumento concreto, atribuida a quien lo dijo; nunca la resolvemos con
  un cierre propio, y nunca cambiamos el momento o la persona a la que se refirió quien habló (hoy, regla 18 de la
  IA).
- Sin adjetivos de opinión, sin cierres que valoren, sin agrandar lo que dice la fuente.

### [DUEÑOS] Qué se suma: dos opciones

Ninguna nombra una ideología dentro de la instrucción de la IA: los modelos tienden a inclinar el texto cuando leen
una etiqueta. Se traduce a reglas que se pueden ver en lo publicado. Cualquiera de las dos iría como **regla 22**,
dentro de la marca `PROMPT:REGLAS`, y se mide antes con `reels/comparar-instruccion.mjs`.

**Opción A — larga (la del plan del 11/10, con tres retoques).** Unos 2.140 caracteres (≈ 550 a 600 tokens más por nota).

> 22. Línea editorial y neutralidad. Radar Balcarce informa desde una mirada de centro, institucional y práctica, y
> esa mirada se nota en qué datos elegís y en cómo los ordenás, nunca en adjetivos ni en juicios. No escribís sobre
> la línea del medio. (a) Contás hechos verificables y atribuís todo lo demás: lo que afirma un gobierno, una
> oposición, un sindicato, una cámara empresaria, un medio o una encuesta va con su autor, con el mismo tratamiento
> para oficialismo y oposición de cualquier nivel. (b) Usás el cargo y el apellido; nada de apodos, motes ni
> etiquetas de campo político ("casta", "kirchnerismo duro", "ultraderecha", "zurdos", "ajuste feroz",
> "motosierra") salvo dentro de una cita atribuida de diez palabras o menos, y nunca en el título. (c) Los insultos
> de un político a otro no son el título: si son la noticia, el título dice el hecho y el cuerpo cuenta, atribuido,
> qué dijo uno y qué respondió el otro. (d) Sin adjetivos ni verbos de juicio sobre personas, gobiernos o políticas
> ("fracasa", "escándalo", "polémico", "demoledor", "desastre", "brillante"): describís con cifras, desde cuándo,
> comparado con qué y según quién. (e) En economía y gestión va primero el dato oficial con su fuente; la lectura
> de un analista va atribuida; si hay dos lecturas, van las dos con la misma extensión. (f) En seguridad y justicia
> va primero la fuente oficial, con presunción de inocencia (regla 10). (g) En los temas en que la sociedad está
> dividida (aborto, armas, drogas, religión, inmigración, género) contás lo que dice cada parte sin elegir cuál
> tiene razón. (h) Nunca escribís opinión, editorial ni "lectura política" propia. (i) Si las fuentes cuentan el
> mismo hecho con tono distinto, dejás afuera el tono y te quedás con lo que todas confirman. (j) Para elegir qué
> datos van primero, priorizás lo que le importa a quien produce, trabaja, estudia o usa un servicio, y a las
> instituciones: empleo, inversión, campo, seguridad, educación, salud y gestión con cifras. Es una prioridad para
> ordenar, no un criterio para callar lo que incomoda a un gobierno o a una oposición: lo relevante entra sin
> importar a quién favorece.

Los tres retoques respecto del plan: (1) "Nunca digas que el medio tiene una línea política" pasa a "No escribís
sobre la línea del medio" (que la IA no comente al medio, sin que eso suene a esconder algo); (2) se saca Malvinas
de los temas "divididos" (en la Argentina es una causa compartida, y la regla de conexión argentina ya la nombra);
(3) se saca "histórico" de los adjetivos prohibidos (choca con datos ciertos como "récord histórico", y "hito
histórico" ya está en la lista de relleno). El punto (j) es el que lleva la mirada "de centro" a la práctica: es
el que más hay que pensar.

**Opción B — mínima.** Unos 600 caracteres (≈ 150 tokens más por nota).

> 22. Neutralidad. Contás hechos y atribuís las opiniones a quien las dijo. Oficialismo y oposición, de cualquier
> nivel, reciben el mismo trato: el cargo y el apellido, su argumento atribuido y, si hay dos posturas, la misma
> extensión. Nada de apodos ni etiquetas políticas fuera de una cita atribuida, y nunca en el título. Sin
> adjetivos ni verbos de juicio sobre personas, gobiernos o políticas ("escándalo", "fracasa", "polémico",
> "demoledor"): cifras, fechas y quién lo dice. Nunca escribís opinión ni lectura política propia, y no le sumás a
> la nota un ángulo que las fuentes no tienen.

**Recomendación**: empezar por la B (corta, fácil de medir, no inclina nada) y sumar el punto (j) de la A sólo si
quieren que la selección priorice explícitamente esos temas. En cualquier caso, que **"Quiénes somos" diga los
principios** (neutralidad, mismo trato, hechos antes que declaraciones): un medio con una mirada que no se dice en
ningún lado choca con la transparencia del § 10.

**Lo que acompañaría** (fuera de este documento, cuando se decida): una lista corta de palabras cargadas que el
verificador rechace en el título y la bajada, con su prueba, y una revisión semanal de equilibrio por tema y por
medio (hoy no existe). Ejemplos reales que no deberían publicarse, según el plan del 11/10: 1ul1h0c, 1loie5,
17pc5cx, zrjl6d, 1uy5mj8 [SIN VERIFICAR: no los revisé uno por uno].

## 4. Atribución y verificación

### Con qué se escribe

- **La IA no busca nada**: el sistema le da las fuentes (los medios que contaron lo mismo, numerados, con su ciudad,
  su fecha y si son oficiales; el texto completo de una de ellas; hasta tres notas nuestras de los últimos 30 días
  como antecedentes). Así el verificador puede controlar todo contra lo que la IA recibió: un dato "encontrado" no
  se distingue de uno inventado. Las notas de pistas usan una búsqueda, pero lo que encuentra se le pasa a la IA
  como fuente y se controla igual.
- **Los antecedentes son contexto**: dichos como anteriores y con su momento ("en agosto"); nunca en el título, la
  bajada, el guion ni el texto para redes. Si no coinciden con la fuente de hoy, manda la de hoy.

### Cómo se contrasta y se atribuye

| Qué | Cómo se escribe |
|---|---|
| Lo que confirman varias fuentes | Como hecho |
| Lo que dice una sola | Atribuido: "según informó el municipio", "de acuerdo con un medio local" |
| Lo que las fuentes cuentan distinto | Las dos versiones atribuidas, o la de la fuente oficial; la diferencia va a "qué falta confirmar" |
| Una declaración de parte (un denunciante, un funcionario sobre su gestión, un club sobre su equipo) | Atribuida a quien la dijo, nunca como hecho |
| Lo que no se puede verificar | Dicho como no confirmado, o no se dice |
| Una acusación sin condena | Atribuida y en condicional [INTOCABLE, § 0] |

- **Fuente primaria antes que el medio** que la reprodujo; la versión oficial, primero.
- **El nombre del medio** no va nunca en el título, la bajada, el cuerpo, el guion, las placas ni las redes: va en
  el desplegable de fuentes, con el enlace. En el cuerpo se nombra la fuente en general. Nunca se presenta como
  propio lo que informó otro medio ("pudo saber este medio").
- **Con una sola fuente** no se inventa una ampliación; cifras, récords y evaluaciones van atribuidos; nunca
  "fuentes consultadas" en plural.
- **Lo que no está confirmado, se dice igual**: si la fuente dice "podría", la nota también. Sin agrandar.
- **Balcarce, sólo si la fuente lo dice**: nunca se afirma (ni se niega) que algo afecta a Balcarce si las fuentes no
  lo dicen; nunca "nuestra ciudad". Si la fuente trae un dato de acá, ese dato va primero.

### Cómo se controla

- **Todo lo que escribe la IA se controla contra las fuentes** antes de salir: un número, un nombre, un día o una
  cita que no estén en ellas, un delito afirmado sin atribuir, una copia, un título mal armado. Si no pasa, no sale;
  se le pide de nuevo una vez diciéndole qué falló, hasta tres intentos por nota. Cómo lo hace: `docs/04-REDACCION.md`
  y el informe de la etapa 6-9.
- **El nivel de verificación lo calcula el sistema, no la IA**: **ALTA** si hay una fuente oficial o dos medios
  distintos o más; **MEDIA** con un solo medio; **BAJA** si, con un solo medio, la nota se apoya en una denuncia o
  una acusación ("denuncia", "acusó", "habría", "presunto", "según trascendió"…) o lo que falta confirmar toca el
  hecho central. Una opinión citada no lo baja. **Con BAJA la nota no sale sola.** (Ésta es la única definición:
  "declaración de parte" no baja el nivel.)
- **Lo que decide una persona manda siempre**: la IA nunca pisa una decisión humana, y **la IA nunca destraba** lo
  que el semáforo frenó.

## 5. Tono y estilo

- **El tono de todos los días**: castellano rioplatense neutro y cercano, en tercera persona, sin voseo ni modismos.
  La cercanía está en elegir el dato que le importa a un vecino, no en los adjetivos. Ni solemne ni canchero.
- **El tono serio**: sobrio e institucional, sin calidez ni color, sólo los hechos. Lo piden Policiales siempre y
  cualquier nota cuyo título o resumen tenga una de las palabras de la lista (entre las marcas `PALABRAS_SERIAS`,
  igual que hoy). [DUEÑOS] ¿Siguen "crisis" y "conflicto"? Hoy ponen serias notas de Economía o Deportes. Y la
  búsqueda debería ser por palabra entera ("robo" no es "robot"): cambio de código, etapa 6-9.
- **Notas y redes no suenan igual, a propósito**: las notas informan en tercera persona; las piezas de voz de las
  redes son cálidas y pueden usar voseo ("Guardá el dato"). Eso vive en `CRITERIO-REDES.md`.
- **Que se lea fácil**: oraciones cortas, un dato por oración (con más de dos comas, se parte); sujeto, verbo y
  predicado en voz activa; palabras de todos los días ("empezó", no "dio inicio"); cada persona con su cargo la
  primera vez y después por el apellido; una sigla se explica la primera vez, salvo las que todos conocen (AFA,
  ANSES); siempre con tildes y eñe. Tiene que sonar a un periodista del pueblo que cuenta bien lo que pasó.
- **Sin muletillas ni relleno**, aunque la fuente los diga. La lista es la de hoy (entre las marcas `RELLENO`, sin
  cambios): "fuentes consultadas", "pudo saber", "hito histórico", "consolidando", "en el marco de", "cabe
  destacar", "sin dudas", "dijo presente" y las demás. Tampoco ganchos: "lo que tenés que saber", "enterate", "te
  contamos", "no te lo pierdas", "imperdible".

| Bien | Mal, y por qué |
|---|---|
| "El programa empezó en marzo y ya atendió a 40 familias." | "Consolidando su compromiso, y en el marco de una política integral, el programa se posiciona como un hito." (tres muletillas, ningún dato) |
| "…el municipio no informó todavía cuándo empiezan las obras." | "…una obra que sin dudas cambiará la vida de los vecinos." (opinión y relleno) |
| "La reunión fue el martes en la Municipalidad. Participaron la directora de Producción y doce productores." | "La reunion, que conto con la participacion de productores, se realizo en la Municipalidad." (sin tildes y en voz pasiva) |

## 6. Títulos, bajadas y guion

**El título** es lo único que lee la mayoría: dice la noticia entera, solo, en la pantalla del celular.

- Apunta a unos 70 caracteres y nunca pasa de 90. Si no entra, se elige el dato central y el resto va a la bajada.
- Una frase completa, con sujeto y verbo **en presente**, aunque el hecho ya haya pasado ("El Concejo aprueba…"); si
  todavía no pasó, con el día ("La Cooperativa corta la luz el miércoles").
- Nunca: pasado, una etiqueta con dos puntos ("Rugby:"), un sustantivo y un lugar sin verbo ("Cruce en Balcarce
  por…"), cortado, signos de admiración o de pregunta, adjetivos o frases de gancho, "en vivo", el nombre del medio,
  "en Balcarce" al final (se sobreentiende). Si el hecho es de otra ciudad, nombra esa ciudad y nunca a Balcarce.
- Con nombre y número cuando los hay: "Pato Naranja gana 24 a 10", no "Gran triunfo del rugby local".

| Bien | Mal, y por qué |
|---|---|
| El Concejo aprueba el presupuesto 2027 | "Balcarce: el Concejo aprobó el presupuesto" (empieza por el lugar y está en pasado) |
| Ferroviarios gana por penales y juega la final | "¡Ferroviarios a la final!" (admiración; no dice qué pasó) |
| Productores y el municipio discuten la tasa vial | "Cruce en Balcarce por la tasa vial" (no dice quién ni qué) |
| Cortan la luz el martes en el barrio Norte | "Lo que tenés que saber del corte de luz" (gancho) |

Lo automático se arregla **sin inventar** (una etiqueta conocida adelante, "en Balcarce" al final, una coma
colgando); lo que escribió una persona no se toca.

**La bajada** (el campo `copete`): hasta 360 caracteres, unas 50 palabras, en dos o tres frases cortas. Suma lo que
el título no dice (cuándo, cuánto, quién decidió) o por qué le importa a alguien de acá, si la fuente lo dice. No
promete nada que el cuerpo no cuente. Nunca una sola frase larguísima (fue el error más frecuente, 28/09).

**El guion para la voz** es el título dicho tal cual; sólo cambian las siglas (como se pronuncian) y los números (en
palabras). Nunca nombra la fuente.

## 7. El cuerpo, los datos y los números

**El cuerpo es obligatorio**: una nota automática sin cuerpo de 70 palabras o más no sale en ningún lado (se
reintenta; lo que escribe una persona se respeta). [Largo que se le pide: hoy de 70 a 180 palabras. Andrés decidió
el 11/10 un largo según la cantidad de fuentes; la propuesta es medir primero el cambio chico (pedir desde 90,
publicar desde 70) y después el dinámico. Ver `ANALISIS.md`, C-11.]

- **Sólo con información de las fuentes**, nunca más largo que los datos: cada oración aporta un dato nuevo.
- **De lo más importante a lo menos**: primero el hecho central con el dato que la bajada no dio, sin repetirla y
  entendible sin ella (nunca "Esta medida…", "el mencionado…"); después el contexto; al final, si la fuente lo da,
  qué sigue.
- **Explica todo lo que prometen el título y la bajada.** Si el título nombra a tres sancionados, el cuerpo dice
  quiénes y por qué.
- **El dato central, con su número**: "aumenta la tasa" no alcanza (cuánto, desde cuándo, a quién); si la fuente no
  lo da, se dice que no se informó.
- **Los datos prácticos, todos**: si se anuncia un corte, un horario, un trámite o un evento, van el día con su
  fecha, la hora de inicio y de fin, el lugar, a quién afecta (calles, barrios), qué hay que hacer y cuánto cuesta.
  Nunca una frase vaga en lugar de un dato (29/09: "se confirmaron las fechas y las sedes", sin decir cuáles).
- **Las cifras, como las da la fuente**: redondear es "unos 3.500" por 3.480; comparar vale si la fuente da los dos
  datos; nunca pasar a otra cifra ("1,7 millones" no es "un millón y medio"). Los años se comparan exactos.
- **Los tiempos verbales, según cuándo pasó**: lo que ya pasó va en pasado en el cuerpo aunque la fuente lo
  anunciara en futuro; lo que no pasó, en futuro o con el día. El presente del título no pasa al cuerpo.
- **Las fechas**: nunca "ayer", "hoy" ni "mañana" si la fuente no dice el día; nunca "este sábado" ni "este fin de
  semana" (la nota se lee días después): va "el sábado" o "el sábado 26". Vale también para nuestras plantillas
  (hoy la del dólar, la del clima y la del repaso dicen "este [día]": hay que corregirlas).
- **Sin cierres** que resuman o valoren ("de esta manera…", "sin dudas un paso importante").

## 8. Fotos

El detalle (cómo se elige, de dónde puede venir, qué hace la IA de fotos) está en `docs/05-FOTOS.md` y en el
informe de la etapa 6-9. Las condiciones legales están en el § 0 [INTOCABLE]. Lo que se suma al documento porque ya
lo hace el código: **fotos libres de Wikimedia Commons** con autor y licencia (sólo dominio público, CC0, CC BY y
CC BY-SA; nunca NC, ND ni "uso justo"), **Policiales sólo con foto oficial**, y **la placa** cuando no hay foto que
sirva (la placa no es una regla: es lo que sale cuando no hay otra cosa).

## 9. Correcciones

- **Una persona corrige** título, bajada, cuerpo o sección desde el panel del celular o, sin el panel, en
  `web/data/correcciones.json`, siempre con motivo, cuándo y quién. Lo que decide una persona manda; la dirección
  de la nota no cambia.
- **Se saca una nota** si una persona la retira o el semáforo la frena por lo que dice: sale de las listas y pierde
  su página. Si ya había salido en Facebook o Instagram, allá se borra a mano.
- **El enlace no se rompe**: la dirección queda fija y la página dura 180 días; si la misma noticia tenía dos
  direcciones, la que se va lleva a la que queda.
- **La auditoría con IA** de lo publicado sólo corrige sola una tilde que falta en una palabra; todo lo demás es un
  aviso para una persona (regla 108).
- **Cuando se arregla algo que estuvo mal publicado, queda una prueba** con el caso real, para que no vuelva. Y si el
  error es de criterio, se corrige en este documento.
- **Si alguien pide una rectificación o una respuesta**, no se ignora: ver el § 11 (límites legales).

## 10. Transparencia sobre la IA

- **Cada nota dice quién la escribió**, en una sola línea chica y gris, al lado del desplegable de fuentes, y en los
  datos para Google:

| La nota es… | La línea dice |
|---|---|
| Escrita por la IA, sin revisión de una persona | "Redacción con IA, verificada contra las fuentes · Fuentes (N)" |
| Escrita por la IA y revisada y publicada por una persona | "Redacción con IA, revisada por la redacción · Fuentes (N)" |
| Cargada o corregida por una persona | "Revisada por la redacción · Fuentes (N)" |
| El texto de la fuente, sin reescribir | "Texto de *medio* · Fuentes (N)" |
| Propia con datos (dólar, clima, repaso) | "Nota de Radar Balcarce con datos de…" |
| Propia con datos de terceros (fútbol, F1) | "Armada con los datos de ESPN" / "…de Jolpica" (regla 100) |
| De una pista que salió sola | "Escrita con IA… y controlada contra esas fuentes" (regla 101) |
| Escrita por Claude a pedido de la redacción | [DUEÑOS: falta decidir la firma] |

- **Nunca se promete una revisión que no hubo**, y nunca se dice "sin revisión humana".
- **El pie del sitio lo dice para todo**: los textos los escribe una IA y se controlan contra las fuentes; lo
  sensible lo revisa una persona antes de salir; las voces de los videos son de IA.
- **En las redes**: los reels cierran con «Voz generada con inteligencia artificial.» (regla 114); los posteos no
  dicen "Resumen hecho con IA" (quién escribió la nota se dice en la nota).
- **Las imágenes hechas con IA** van marcadas ("Ilustración generada con IA · Radar Balcarce", regla 165) y nunca
  parecen una foto real [INTOCABLE, § 0].

## 11. Límites legales

Sin cambios. Están explicados, con sus fuentes, en **`INVESTIGACION.md`**: derecho de rectificación o respuesta
(§ 1), calumnias e injurias (§ 2), doctrina Campillay y real malicia (§ 3), ENACOM (§ 4), datos personales y el
buzón (§ 5), menores y víctimas (§ 6) y uso de fotos y contenido de otros medios (§ 7). Lo que de eso aplica a cada
nota está copiado tal cual en el § 0. Ante un pedido formal (carta documento, nota de un abogado), consultar antes
de responder.

*(Un renglón de `INVESTIGACION.md` — "toda acusación espera a una persona" — quedó viejo desde la regla 96 del
2/10: conviene corregirlo allá, sin tocar lo legal.)*

## 12. Los números

Todos los números del criterio siguen en una tabla única, entre las marcas `NUMEROS`, comparada con
`ingesta/criterio.mjs` por una prueba. Los que importan para escribir:

| Qué | Número | Tipo |
|---|---|---|
| Título: largo al que apunta / máximo (caracteres) | 70 / 90 | guía / corte |
| Bajada: largo máximo (caracteres), unas palabras | 360, unas 50 | corte / guía |
| Cuerpo: palabras para publicarse | 70 | corte |
| Cuerpo: palabras que se le piden | 70 a 180 (en discusión) | guía |
| Palabras seguidas iguales a una fuente: lo que se le pide a la IA / donde corta el verificador | 10 / 12 | guía / corte |
| Texto para redes (caracteres) | 280 | corte |
| Claves / etiquetas | 3 a 5 / 3 a 8 | corte |
| Antecedentes: cuántos y de cuántos días | 3, 30 | sistema |
| Hecho más viejo que se estrena / horas en la portada | 12 / 36 | sistema |
| Medios que tiene que contar lo de afuera, por sección | 2 a 4 (tabla) | sistema |

Propuesta para la tabla: una columna "guía para la IA / corte del sistema", sumar el 10 de la copia
(`COPIA_PEDIDA`) y, más adelante, mover a `docs/` los números de redes y del contrato del día (pide ajustar la
prueba).

## 13. La instrucción de la IA

Se arma igual que hoy: las reglas fijas (`PROMPT:REGLAS`) más uno de los dos tonos en el lugar de `{{TONO}}`, y
después la noticia con sus fuentes. Lo que se propone, en este orden:

1. **Que diga lo que este documento dice, una sola vez cada cosa**: lo que recibís y cómo lo usás → las reglas fijas
   → lo que devolvés. Sin el campo `nivel` (el sistema lo calcula) y sin historia interna.
2. **El tono al final**, para que el comienzo de la instrucción sea siempre igual.
3. **Las reglas 1, 10 y 13, palabra por palabra** [INTOCABLE], y la lista de relleno entre comillas.
4. **Medir antes de cambiar**: el borrador corto está en `docs/criterio/ANALISIS.md` § 4.4 (10.908 caracteres
   contra 20.171) con el procedimiento para `reels/comparar-instruccion.mjs`. Se adopta sólo si no empeora. La
   línea editorial (§ 3) se mide aparte, como una segunda variante.
5. **La nota aparte del panel**, tres líneas (sigue la marca y los cuatro números que pide la prueba):

> Nota aparte, esto no se lo manda a la IA. Lo que escribe la IA pasa por el semáforo y por el verificador; si una
> parte no cuadra con las fuentes se descarta, y una nota automática sin cuerpo de al menos 70 palabras no se
> publica. Cada nota se le pide a la IA como mucho tres veces. Recibe hasta tres notas que el sitio ya publicó en
> los últimos 30 días, como antecedentes.

---

## Anexo: qué cambia respecto del criterio vigente

| Del vigente | En la propuesta | Por qué |
|---|---|---|
| Un documento de 975 líneas con criterio, sistema y diseño | Sólo el criterio; lo demás, con punteros | Lo que más se desactualizaba era lo del sistema |
| § 3 Semáforo completo | Cuatro frases y el rojo en el § 0 | La tabla viva es de la etapa 6-9 |
| § 6 Verificador completo | Tres frases | Es "cómo lo hace el código" (`docs/04-REDACCION.md`) |
| § 7 Diseño de la web (tipografía, tamaños, "Seguí leyendo") | Afuera | Es diseño; además "Seguí leyendo" estaba mal (regla 143) |
| § 9 Redes | Afuera (`CRITERIO-REDES.md`) | Decía "sólo lo de Balcarce", ya no es así (regla 161) |
| "Liviano" en el tono | Sacado | La IA lee lo contrario (C-1) |
| "Una fuente oficial alcanza sola" | "…de Balcarce" | Lo de la Provincia pasa por el cruce (P-6) |
| "Las secciones muestran 36 horas" | "Guardan todo, de a diez" | `web/lib/paginas.js` (P-7) |
| El dólar en "no entra nunca" | Lo que pasa hoy (espera) + [DUEÑOS] | C-10 |
| Lo de otros países en "no entra nunca" | No se trae; si se cuela, espera | P-2 |
| Tres definiciones de BAJA | Una, la del código | C-9 |
| Dos órdenes de "cuál queda" entre repetidas presentados como uno | Las dos etapas | C-12 |
| Sin efemérides ajenas, pistas, notas de datos, firma de pistas y de datos | Sumadas | Reglas 100, 101, 155, 158, 164, 165 |
| Sin Wikimedia | Sumada | Regla 99 |
| Sin rectificación | Puntero a `INVESTIGACION.md` § 1 | Es un derecho con base constitucional |
| Sin línea editorial | Dos opciones [DUEÑOS] | Nunca se escribió |
| Opinión sin definir | Propuesta [DUEÑOS] | El buzón admite opinión firmada |
| Lo legal | **Igual, palabra por palabra**, con notas de lectura de lo que ya hace el código (reglas 118 y 119) | No se negocia |

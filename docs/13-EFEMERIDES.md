# 13 · Un día como hoy y los feriados

*Actualizado el 30/09/2026. Cómo se arma la base mensual de efemérides, qué se
muestra en la pestaña "Fechas" del panel del celular y cómo se afina el criterio
con lo que se elige. Todavía no sale nada solo: esto prepara lo que una persona
aprueba.*

## Para qué

Hernán pidió una pieza diaria de "Un día como hoy" (nota en la web, reel e
historia) y piezas propias para los feriados, armadas **con una semana de
anticipación** para revisarlas y aprobarlas sin gastar audio. Como todavía no
está claro qué efemérides funcionan mejor, la idea es empezar dándole a una
persona **las 20 mejores candidatas de cada día**, dejar que elija, y mirar
después qué patrón siguen las elecciones para ir puliendo el criterio.

## Las dos partes

| Parte | Qué hace | Dónde |
|---|---|---|
| **Efemérides** | 31 días desde el lunes 5/10, con 20 candidatas cada uno | `web/data/efemerides-candidatas.json` |
| **Feriados** | Los feriados de los próximos ocho meses, cada uno con su enfoque, sus datos y sus fuentes | `web/data/feriados-piezas.json` |
| **Lo elegido** | Qué eligió cada persona, con cómo era cada elegida | `web/data/efemerides-elegidas.json` |

Los tres viajan en claro: son datos públicos de Wikipedia y de leyes, no hay nada
sensible. El repositorio es público y está bien.

## De dónde salen las candidatas

`ingesta/generar-efemerides.mjs` (una corrida a mano por mes:
`node ingesta/generar-efemerides.mjs --desde=2026-10-05 --dias=31`) baja:

1. **El Portal Argentina de Wikipedia** ("Efemérides del 7 de octubre"): unas 4
   por día, todas de Argentina.
2. **Los "días especiales" de Wikipedia** (feed `holidays`): sólo los de
   Argentina y los del mundo; sin santos ni lo que es de una provincia.
3. **El feed "un día como hoy"** (`events` y los `births` de argentinos): hechos
   del mundo, con tope.
4. **Lo curado a mano** (`ingesta/efemerides-curadas.json`): las fechas patrias,
   los feriados y las fechas de Balcarce, con datos verificados contra su fuente.

Wikipedia es CC BY-SA: se toma como **pista**, se reescribe con palabras propias
y se cita. Cada fecha o número se confirma con una segunda fuente antes de salir.

## Qué es importante (30/09)

Hernán: "hay muchas de España; tiene que ser figuras importantes o fechas importantes
para todo el mundo, o cosas importantes para Argentina, la región, Balcarce". Por eso:

- **Lo que toca a Argentina, la zona o Balcarce entra siempre** (`RE_ARGENTINA`).
- **Lo del mundo entra sólo si lo conoce todo el mundo**: se mide en cuántas ediciones
  de Wikipedia tiene página lo más específico del hecho (Wikidata), sin contar países,
  ciudades, años, deportes ni religiones. Desde 150 idiomas (`IDIOMAS_MUNDIAL`). Un
  nacimiento del mundo, sólo si es una figura de 150 o más; uno argentino, desde 10.
- **Lo de España**, sólo si es enorme (220 idiomas) o toca a Argentina.
- **Los días especiales del mundo**, sólo los de las Naciones Unidas y sus organismos;
  los de Argentina, todos.
- Hasta **8 del mundo por día**: lo de acá va primero.
- Con menos de **45 puntos** no entra: mejor pocas y buenas que veinte con relleno
  (hay días con 7 candidatas y otros con 20).
- El Portal y el feed a veces cuentan lo mismo (Saavedra Lamas, la fundación de
  Necochea): queda una sola.
- Tampoco entran las tragedias naturales (inundaciones, terremotos…), además de la
  violencia.

## Cómo se ordenan (el puntaje de partida)

`ingesta/efemerides.mjs`, `puntuar`. Es un punto de partida que se afina con lo que la
gente elige:

- **Suben:** lo curado (+50), el Portal Argentina (+15), lo argentino (+12), lo de
  Balcarce o Fangio (+25 a +30), qué tan conocido es (hasta +22), un aniversario
  redondo (25, 50 o 100 años), ciencia, cultura, campo y fundaciones.
- **Bajan:** lo político (−25), lo que puede estar vivo (nacidos desde 1930, −12), lo
  religioso (−15), un argentino casi desconocido (−8), los muertos, y lo muy corto o
  muy largo.
- **No entran:** lo que tiene violencia o menores, salvo las fechas patrias curadas
  (que revisa una persona).
- **Ningún estilo se come la lista:** hasta 6 de un mismo estilo, 5 datos curiosos y
  3 días especiales.

## Qué se ve en el panel

Pestaña **Fechas**:

- **Efemérides:** los días agrupados por semana, cada uno con su estado ("Sin
  armar", "Falta la principal", "✓ Armado (+2)"). Al abrir un día, las 20
  candidatas con su estilo, año, "hace N años", puntaje, marcas (política, puede
  estar vivo…) y fuente. Cada una trae el enlace **"Ver la nota en Wikipedia"** y cuántos idiomas la
  conocen. Se evalúa con cuatro opciones: **★ Principal** (una sola por día),
  **Sí** (va), **Opcional** (puede ir si hace falta) y **No**. Se puede filtrar por estilo. "Guardar el día" escribe en
  GitHub con el nombre de quien lo hizo.
- **Feriados:** cada feriado con su enfoque, los datos con su enlace, las citas
  y lo que falta confirmar. Se aprueba el enfoque o se piden cambios (con un
  comentario). Los puentes no llevan pieza.

## Cómo se afina el criterio

Cada día guardado lleva, de cada elegida, su rol, estilo, puntaje, año, idiomas,
origen y marcas, y en qué lugar de la lista estaba cada candidata. Con varias semanas de elecciones se
puede ver, por ejemplo, si se elige más lo redondo que lo curioso, si el puntaje
ordena bien, o si un estilo casi nunca se elige. Ese análisis lo hace Claude
sobre `efemerides-elegidas.json`, y lo que salga se anota acá y en
`ingesta/efemerides.mjs`.

## La propuesta automática (1/10)

Cada día de `efemerides-candidatas.json` trae una `propuesta`: una principal, tres "sí" que la
acompañan, dos "opcional" y los "no" (lo político, lo religioso y lo que puede estar vivo). La
arma `ingesta/efemerides-propuesta.mjs` al generar las candidatas, y el panel la muestra ya
marcada, con el motivo de cada una, para aprobarla o cambiarla ("Guardar el día" la aprueba).

- **Cuatro lugares, no las cuatro de más puntaje:** la principal (la mejor), una argentina, una
  de ciencia o del mundo y una curiosa. Dentro del día no se repite el estilo si hay de dónde elegir.
- **Variedad entre días:** la principal pierde 12 puntos si repite el estilo de ayer y 5 el de anteayer.
- **Una fecha patria curada habla sola:** ese día no hay combo.
- **"Balcarce" es la ciudad o es un apellido** (`esDeBalcarce`): la Revuelta de los Restauradores,
  "contra el Gobierno de Juan Ramón Balcarce", ya no suma como si fuera de acá.
- **Señales nuevas del puntaje:** +6 por lo del campo y los fierros (INTA, autódromo, la papa),
  −8 por lo que pide contexto (imperios, dinastías, tratados) si no es argentino, −5 por exceso de
  nombres propios. Bombas, pruebas nucleares, Corte Suprema y vicepresidencia, marcadas.
- **Falta:** la foto libre y la distancia a Balcarce (Wikidata), el gancho de una frase con IA y los
  niveles A, B y C (sólo la principal lleva reel). Está en `PENDIENTES.md` 0c e `IDEAS.md` 42.

La propuesta es un punto de partida: es por reglas, no entiende un texto, y a veces propone algo
flojo (una compañía de aviación holandesa de principal). Para eso está la persona que aprueba.

## Criterios que se sumaron el 1/10 (Hernán)

- **Si hay dudas, no se usa.** Cada principal y cada "sí" se verifica contra una fuente independiente (tres
  verificadores con búsqueda en la web, 1/10): lo que sale mal o no se confirma no entra como principal ni
  como "sí" (`--errores=` de `combinar-auditorias.mjs`). Lo que está bien pero con mal redactado (por ejemplo
  "se anuncia" el Nobel, no "recibe") queda con un aviso ⚠ en el motivo.
- **Famosos que ya murieron:** la marca "puede estar vivo" del feed se equivoca con ellos; se revisan contra
  otras fuentes y entran (`--ya-murieron=`). Una persona que fue menor en el hecho pero hoy es adulta o murió
  (el debut de Maradona a los 15) no es un problema.
- **Nada de fundaciones de empresas o ciudades de afuera**, ni política o economía de otros países.
- **La pieza del día** (nota + reel/historia con voz, a las 9:00, en el hueco del feriado): una principal con
  su placa y "Además, un día como hoy" con las otras tres (`reels/previa-efemerides.mjs`, vista previa sin voz
  de la primera semana; datos en `web/data/efemerides-piezas.json`). Todavía no sale nada solo.

## Reglas que no se negocian

- Nada de política partidaria ni de personas conflictivas: ante la duda, esa
  fecha queda afuera o espera a una persona.
- Nunca un menor ni una víctima; nunca nombres ni fotos de una víctima.
- En un feriado la pieza habla sólo de la fecha, en tono formal y ameno.
- Todo dato se confirma con una segunda fuente; lo que no la tiene está
  marcado ("falta una segunda fuente") y no sale.
- Nada sale solo: una persona aprueba cada pieza.

## Compararlo con otra IA

`node ingesta/exportar-efemerides.mjs --salida=carpeta` escribe todo el mes en texto y
un archivo por semana, con un contexto para dárselo a otra IA: quiénes somos, para qué
es, qué buscamos y qué evitamos, y en qué formato contestar (un renglón por día con la
principal, los "sí", los "opcional" y los "no"). Las candidatas van ordenadas por año y
**sin nuestro puntaje**, para no condicionar. La respuesta se compara con lo que se
eligió en el panel: ahí se ven las diferencias de criterio.

## Cada cuánto se regenera

`node ingesta/generar-efemerides.mjs --desde=AAAA-MM-DD --dias=31` tarda unos 10
minutos la primera vez (mide cuántos idiomas conocen cada tema) y menos de 2 con la
memoria que deja en la carpeta temporal. Se corre a mano una vez por mes.

## La propuesta por consenso de auditorías (1/10)

Para armar el mes se exportan las candidatas (`ingesta/exportar-efemerides.mjs`) y se le pasan a tres IA con
enfoques distintos: editor local, audiencia y video, y riesgo y exactitud (la que puede vetar). Cada una
contesta un renglón por día. `node ingesta/combinar-auditorias.mjs A.txt B.txt RIESGO.txt --errores=ids
--ya-murieron=ids` las junta (`ingesta/combinar-auditorias.mjs`): una principal vale 5, un "sí" 3 y un
"opcional" 1; veta la de riesgo o dos que digan "no"; lo que tiene un error de datos no es principal ni "sí";
una fecha patria habla sola. Escribe `propuesta` en `efemerides-candidatas.json`.

**Ojo:** correr `generar-efemerides.mjs` de nuevo reescribe la propuesta con la de reglas. Si pasa, volver a
combinar las auditorías. Las auditorías de octubre de 2026 dejaron anotados datos dudosos de varias candidatas
(el "primer automóvil de 1866", fechas de las sondas Venera, la fecha de fundación del Observatorio de La
Plata); están marcadas "dato a confirmar" en la revisión del mes.


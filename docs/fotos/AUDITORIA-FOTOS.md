# Auditoría de fotos: cuántas notas salen sin foto y por qué

*15/10/2026. Hecha con `npm run auditar-fotos -- --dias=14` (no gasta cupo de IA ni toca nada) y con
una cuenta aparte sobre `web/data/banco-fotos.json`. Si el código cambia, manda el código.*

## En una frase

De las notas de los últimos 14 días, **521 de 590 tienen foto (88 %)**: 69 salen sin foto (12 %) y
con la placa de su sección. De esas 69, 5 son notas viejas a las que se les **podó** la foto (no es una
falla), así que **sin foto de verdad son 64 (11 %)**. Casi la mitad de esas 64 (27) es por un motivo
que no se negocia: la IA vio un menor reconocible en la única foto que había.

## Los números

Ventana: 14 días (del 1 al 15/10), 600 notas, 10 propias (el dólar y los repasos, que no llevan foto de
otro por regla) y 590 que cuentan. Unas 39 notas por día.

| | Notas | % |
|---|---|---|
| Con foto | 521 | 88 % |
| Sin foto (todas) | 69 | 12 % |
| de ellas, foto podada (nota vieja o retirada) | 5 | no es falla |
| de ellas, sin foto de verdad | 64 | 11 % |

En los últimos 3 días el porcentaje es parecido (el 1/10 había dado 86 %). El banco entero (desde que
existe): 1.350 notas probadas, 826 con foto, 319 con la foto podada, 123 descartadas por la IA y 82 por
una falla (7 de esas ya sin más intentos).

### Por sección

| Sección | Con foto | % | Sin foto de verdad |
|---|---|---|---|
| Tecnología | 8 de 8 | 100 % | 0 |
| Agro | 45 de 46 | 98 % | 0 (1 podada) |
| Automovilismo | 46 de 48 | 96 % | 2 |
| Argentina | 44 de 46 | 96 % | 2 |
| Fútbol | 66 de 70 | 94 % | 4 |
| Economía | 99 de 106 | 93 % | 6 (1 podada) |
| Política | 69 de 74 | 93 % | 4 (1 podada) |
| Cultura y agenda | 34 de 42 | 81 % | 8 |
| Balcarce | 74 de 95 | 78 % | 20 (1 podada) |
| Deportes | 36 de 49 | 73 % | 12 (1 podada) |
| Policiales | 0 de 6 | 0 % | 6 (regla firme) |

**Donde más duele es Balcarce, Deportes y Cultura y agenda**: son las que cuentan chicos (escuelas,
clubes, torneos juveniles) y las que dependen de medios chicos que a veces no traen foto.

### Por qué no tienen foto

| Motivo | Notas | Se puede mejorar sin stock |
|---|---|---|
| La IA vio un menor reconocible en la foto (regla firme) | 27 | no |
| La fuente no traía foto para comparar | 11 | no, es lo que rescataría el stock |
| Nota propia (no cuenta) | 10 | no |
| Falló la IA (sin cupo, `413`/`429` de Groq) y se va a reintentar | 7 | sí, solo con reintentos |
| Policiales sin fuente oficial (regla firme) | 6 | no |
| Tenía foto y se podó | 5 | no es falla |
| Falló y ya se probó el máximo de veces | 5 | sí, ver más abajo |
| La foto tenía marca de agua de un medio (regla firme) | 4 | no |
| La única imagen era el logo del medio | 3 | no, lo rescataría el stock |
| La foto no ilustra la nota (flyer, cartel) | 1 | no, lo rescataría el stock |

Cruce por sección (sin las podadas):

| Sección | Menor | Fuente sin foto | Falló la IA | Marca / logo / no ilustra | Policiales | Total |
|---|---|---|---|---|---|---|
| Balcarce | 10 | 7 | 0 | 3 | 0 | 20 |
| Deportes | 7 | 2 | 1 | 2 | 0 | 12 |
| Cultura y agenda | 5 | 2 | 1 | 0 | 0 | 8 |
| Economía | 2 | 0 | 2 | 2 | 0 | 6 |
| Policiales | 0 | 0 | 0 | 0 | 6 | 6 |
| Fútbol | 2 | 0 | 2 | 0 | 0 | 4 |
| Política | 1 | 0 | 2 | 1 | 0 | 4 |
| Argentina | 0 | 0 | 2 | 0 | 0 | 2 |
| Automovilismo | 0 | 0 | 2 | 0 | 0 | 2 |

(La columna "Menor" cuenta 27, pero **2 no son por menores**; ver el hallazgo 1.)

## Qué hallé de paso (no lo toqué: el pedido era no cambiar el flujo)

1. **Las notas con más de 8 fuentes con foto se quedan sin foto: 0 de 3.** `ingesta/fotos.mjs` rotula
   las fotos con `LETRAS = 'ABCDEFGH'` (ocho) y `instruccion()` hace `LETRAS[i]`; con 9 o más candidatas
   la lista le dice a la IA "undefined) medio: …" y la letra que elige no se reconoce
   (`letraValida`) y no se elige nada. Las tres notas del banco con más de 8 fuentes (APTRA con 11, "La
   Justicia multa al jefe de Gabinete" con 18, y la de River en Junín con 9) están sin foto, y en dos
   la razón guardada dice que la foto estaba bien ("sin marcas ni menores"). Son justamente las notas
   más cubiertas. Es una causa probable, no la probé con la IA real. Arreglo chico: comparar sólo las
   8 primeras (o las 8 mejores) y, de paso, que la lista no use letras que no existen.
2. **12 notas sin foto son fallas de la IA** (`413` y `429` de Groq cuando Gemini no contesta): 7 se van a
   reintentar y 5 ya agotaron los 5 intentos. Eso es cupo y tamaño del pedido, no un problema de
   criterio. Con un stock que sólo mira el título esas notas se rescatan igual, pero el camino
   correcto es que la foto de la fuente salga.
3. **El 42 % de las notas sin foto es por menores** (27 de 64). La IA frena por reglas firmes que no
   se tocan (`docs/05-FOTOS.md`, "Menores"), y pasan sobre todo en Balcarce y Deportes. Para esas
   notas la única forma de tener foto sin romper la regla es una foto **sin personas**.
4. Las 11 de "la fuente no traía foto para comparar" son en su mayoría notas de Balcarce (7) armadas
   con un solo medio chico que probablemente no declara foto principal (`og:image`): no lo verifiqué
   una por una. Es lo que más claramente rescataría un stock.

## Cómo se contó

- `npm run auditar-fotos -- --dias=14` para el porcentaje, las secciones y los motivos.
- Un script aparte (no queda en el repositorio) cruzó la lista de notas sin foto con
  `web/data/banco-fotos.json` para ver cuántas fuentes tenía cada una.
- Los motivos son los de `ingesta/auditar-fotos.mjs` (`motivoDeLaNota`), que **clasifica por el
  texto de la razón** que dejó la IA. Por eso 2 notas figuran como "menor" cuando la razón decía que
  la foto estaba bien (hallazgo 1). Las cuentas por motivo pueden tener un error de 2 o 3 notas.
- Nada de esto gastó cupo de IA.

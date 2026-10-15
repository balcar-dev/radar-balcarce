# Duplicadas: ¿dos notas cuentan el mismo hecho? (62 pares)

21 pares son del mismo hecho y 41 no (la etiqueta la puso Claude leyendo las notas; 2 son dudosos). **Error grave** = juntar dos hechos distintos (se pierde una noticia). **Error leve** = no ver una duplicada (sale repetida).

| Modelo | Aciertos | Junta de más (grave) | No ve la duplicada (leve) | Grupo de 5 (Fiesta del Postre) | Seg./par | Costo por 1.000 pares |
|---|---|---|---|---|---|---|
| google/gemini-3.1-flash-lite | 97% (60/62) | 2 | 0 | 10/10 pares unidos | 1.57 | US$ 0.140 |
| inception/mercury-decide [12 por pedido] | 95% (59/62) | 3 | 0 | 10/10 pares unidos | 0.10 | US$ 0.004 |
| inception/mercury-decide | 95% (59/62) | 3 | 0 | 10/10 pares unidos | 0.60 | US$ 0.008 |
| microsoft/microsoft-decision-1 [12 por pedido] | 95% (59/62) | 3 | 0 | 10/10 pares unidos | 0.08 | US$ 0.015 |
| microsoft/microsoft-decision-1 | 97% (60/62) | 2 | 0 | 10/10 pares unidos | 0.54 | US$ 0.015 |
| openai/gpt-6-luna-decisions [12 por pedido] | 89% (55/62) | 4 | 3 | 10/10 pares unidos | 0.05 | US$ 0.047 |
| openai/gpt-6-luna-decisions | 92% (57/62) | 5 | 0 | 10/10 pares unidos | 0.50 | US$ 0.046 |
| perplexity/pplx-decider-v1.1-27b [12 por pedido] | 95% (59/62) | 3 | 0 | 10/10 pares unidos | 0.08 | US$ 0.052 |
| perplexity/pplx-decider-v1.1-27b | 94% (58/62) | 4 | 0 | 10/10 pares unidos | 0.51 | US$ 0.008 |
| typesafe/jev-1.13 [12 por pedido] | 95% (59/62) | 3 | 0 | 10/10 pares unidos | 0.05 | US$ 0.017 |
| typesafe/jev-1.13 | 95% (59/62) | 3 | 0 | 10/10 pares unidos | 0.44 | US$ 0.027 |

## google/gemini-3.1-flash-lite: 2 errores

| Error | Nota A | Nota B | Dudoso |
|---|---|---|---|
| GRAVE: junta hechos distintos | La Fiesta del Postre fue reprogramada para el 30 y 31 de octub | Se suspendio por mal clima la Fiesta del Postre. |  |
| GRAVE: junta hechos distintos | El Gobierno apeló el fallo que ordena aplicar la Ley de Financ | Financiamiento Universitario: el caso pasó a la Cámara Contenc | sí |

## inception/mercury-decide [12 por pedido]: 3 errores

| Error | Nota A | Nota B | Dudoso |
|---|---|---|---|
| GRAVE: junta hechos distintos | Colapinto largará decimoquinto en el Gran Premio de Singapur | Max Verstappen se quedó con la pole position del Gran Premio d |  |
| GRAVE: junta hechos distintos | Milei y Bullrich se reunieron en Olivos tras las diferencias p | Javier Milei y Patricia Bullrich en Olivos: el juego de roles  | sí |
| GRAVE: junta hechos distintos | El Gobierno apeló el fallo que ordena aplicar la Ley de Financ | Financiamiento Universitario: el caso pasó a la Cámara Contenc | sí |

## inception/mercury-decide: 3 errores

| Error | Nota A | Nota B | Dudoso |
|---|---|---|---|
| GRAVE: junta hechos distintos | Colapinto largará decimoquinto en el Gran Premio de Singapur | Max Verstappen se quedó con la pole position del Gran Premio d |  |
| GRAVE: junta hechos distintos | Milei y Bullrich se reunieron en Olivos tras las diferencias p | Javier Milei y Patricia Bullrich en Olivos: el juego de roles  | sí |
| GRAVE: junta hechos distintos | El Gobierno apeló el fallo que ordena aplicar la Ley de Financ | Financiamiento Universitario: el caso pasó a la Cámara Contenc | sí |

## microsoft/microsoft-decision-1 [12 por pedido]: 3 errores

| Error | Nota A | Nota B | Dudoso |
|---|---|---|---|
| GRAVE: junta hechos distintos | Milei y Bullrich se reunieron en Olivos tras las diferencias p | Javier Milei y Patricia Bullrich en Olivos: el juego de roles  | sí |
| GRAVE: junta hechos distintos | Dólar en Bahía Blanca: a cuánto cerró la semana el oficial y e | Dólar oficial y dólar tarjeta: banco por banco, a cuánto cotiz |  |
| GRAVE: junta hechos distintos | El Gobierno apeló el fallo que ordena aplicar la Ley de Financ | Financiamiento Universitario: el caso pasó a la Cámara Contenc | sí |

## microsoft/microsoft-decision-1: 2 errores

| Error | Nota A | Nota B | Dudoso |
|---|---|---|---|
| GRAVE: junta hechos distintos | Colapinto largará decimoquinto en el Gran Premio de Singapur | Max Verstappen se quedó con la pole position del Gran Premio d |  |
| GRAVE: junta hechos distintos | El Gobierno apeló el fallo que ordena aplicar la Ley de Financ | Financiamiento Universitario: el caso pasó a la Cámara Contenc | sí |

## openai/gpt-6-luna-decisions [12 por pedido]: 7 errores

| Error | Nota A | Nota B | Dudoso |
|---|---|---|---|
| GRAVE: junta hechos distintos | 22ª FIESTA NACIONAL DEL POSTRE DE BALCARCE | La Fiesta del Postre se realizará el 30 y 31 de octubre y el 1 |  |
| GRAVE: junta hechos distintos | 22ª FIESTA NACIONAL DEL POSTRE DE BALCARCE | La Fiesta del Postre, ya tiene nueva fecha. |  |
| GRAVE: junta hechos distintos | 22ª FIESTA NACIONAL DEL POSTRE DE BALCARCE | Fiesta del Postre: se confirmó la nueva fecha de realización |  |
| leve: no vio la duplicada | Hora, TV y formaciones: River recibe a Estudiantes de Río Cuar | River recibe a Estudiantes de Río Cuarto en un partido clave p |  |
| leve: no vio la duplicada | River recibe a Estudiantes de Río Cuarto en un partido clave p | River Plate busca arrimarse a zona de Playoffs ante un Estudia |  |
| leve: no vio la duplicada | Hora, TV y formaciones: River recibe a Estudiantes de Río Cuar | River Plate busca arrimarse a zona de Playoffs ante un Estudia |  |
| GRAVE: junta hechos distintos | El Gobierno apeló el fallo que ordena aplicar la Ley de Financ | Financiamiento Universitario: el caso pasó a la Cámara Contenc | sí |

## openai/gpt-6-luna-decisions: 5 errores

| Error | Nota A | Nota B | Dudoso |
|---|---|---|---|
| GRAVE: junta hechos distintos | 22ª FIESTA NACIONAL DEL POSTRE DE BALCARCE | FIESTA NACIONAL DEL POSTRE: CONFIRMACIÓN DE LA NUEVA FECHA PAR |  |
| GRAVE: junta hechos distintos | 22ª FIESTA NACIONAL DEL POSTRE DE BALCARCE | La Fiesta del Postre, ya tiene nueva fecha. |  |
| GRAVE: junta hechos distintos | La Fiesta del Postre se realizará el 30 y 31 de octubre y el 1 | Se suspendio por mal clima la Fiesta del Postre. |  |
| GRAVE: junta hechos distintos | FIESTA NACIONAL DEL POSTRE: CONFIRMACIÓN DE LA NUEVA FECHA PAR | Se suspendio por mal clima la Fiesta del Postre. |  |
| GRAVE: junta hechos distintos | El Gobierno apeló el fallo que ordena aplicar la Ley de Financ | Financiamiento Universitario: el caso pasó a la Cámara Contenc | sí |

## perplexity/pplx-decider-v1.1-27b [12 por pedido]: 3 errores

| Error | Nota A | Nota B | Dudoso |
|---|---|---|---|
| GRAVE: junta hechos distintos | Colapinto largará decimoquinto en el Gran Premio de Singapur | Max Verstappen se quedó con la pole position del Gran Premio d |  |
| GRAVE: junta hechos distintos | Milei y Bullrich se reunieron en Olivos tras las diferencias p | Javier Milei y Patricia Bullrich en Olivos: el juego de roles  | sí |
| GRAVE: junta hechos distintos | El Gobierno apeló el fallo que ordena aplicar la Ley de Financ | Financiamiento Universitario: el caso pasó a la Cámara Contenc | sí |

## perplexity/pplx-decider-v1.1-27b: 4 errores

| Error | Nota A | Nota B | Dudoso |
|---|---|---|---|
| GRAVE: junta hechos distintos | 22ª FIESTA NACIONAL DEL POSTRE DE BALCARCE | FIESTA NACIONAL DEL POSTRE: CONFIRMACIÓN DE LA NUEVA FECHA PAR |  |
| GRAVE: junta hechos distintos | Colapinto largará decimoquinto en el Gran Premio de Singapur | Max Verstappen se quedó con la pole position del Gran Premio d |  |
| GRAVE: junta hechos distintos | Milei y Bullrich se reunieron en Olivos tras las diferencias p | Javier Milei y Patricia Bullrich en Olivos: el juego de roles  | sí |
| GRAVE: junta hechos distintos | El Gobierno apeló el fallo que ordena aplicar la Ley de Financ | Financiamiento Universitario: el caso pasó a la Cámara Contenc | sí |

## typesafe/jev-1.13 [12 por pedido]: 3 errores

| Error | Nota A | Nota B | Dudoso |
|---|---|---|---|
| GRAVE: junta hechos distintos | 22ª FIESTA NACIONAL DEL POSTRE DE BALCARCE | La Fiesta del Postre se realizará el 30 y 31 de octubre y el 1 |  |
| GRAVE: junta hechos distintos | Milei y Bullrich se reunieron en Olivos tras las diferencias p | Javier Milei y Patricia Bullrich en Olivos: el juego de roles  | sí |
| GRAVE: junta hechos distintos | El Gobierno apeló el fallo que ordena aplicar la Ley de Financ | Financiamiento Universitario: el caso pasó a la Cámara Contenc | sí |

## typesafe/jev-1.13: 3 errores

| Error | Nota A | Nota B | Dudoso |
|---|---|---|---|
| GRAVE: junta hechos distintos | 22ª FIESTA NACIONAL DEL POSTRE DE BALCARCE | FIESTA NACIONAL DEL POSTRE: CONFIRMACIÓN DE LA NUEVA FECHA PAR |  |
| GRAVE: junta hechos distintos | 22ª FIESTA NACIONAL DEL POSTRE DE BALCARCE | La Fiesta del Postre, ya tiene nueva fecha. |  |
| GRAVE: junta hechos distintos | El Gobierno apeló el fallo que ordena aplicar la Ley de Financ | Financiamiento Universitario: el caso pasó a la Cámara Contenc | sí |

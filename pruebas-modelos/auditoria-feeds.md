# Auditoría de feeds

Feeds leídos: 206 de 208 (el resto falló en esta lectura). Notas distintas encontradas: 7463.

## Cuántas notas traen los feeds

- Publicadas en las últimas 24 horas: **2354**; en las últimas 72 horas: **4576**.
- Eso es un promedio de **49 notas nuevas por cada media hora** y 98 por hora (sin filtros, antes de sacar lo que no entra).
- Las más publicadas por hora del día (hora de Argentina): 11:00 (298), 10:00 (253), 8:00 (160), 9:00 (147); las menos: 4:00 (31), 1:00 (32), 2:00 (38).
- Cada feed devuelve entre 1 y 1287 notas por lectura (mediana 20).

## ¿Conviene leer cada hora en vez de cada media hora?

Un feed guarda sólo las últimas N notas. Si publica más notas por hora de las que guarda, leerlo menos seguido hace perder notas. Con lectura cada hora, **6 feeds** guardan menos de 1,5 horas de notas y podrían perder alguna en los picos:

| Medio | Notas que guarda | Publica por hora | Cuántas horas guarda |
|---|---|---|---|
| Clarín (clarin-economia) | 10 | 4500 | 0.0 |
| Clarín (clarin) | 10 | 13.7 | 0.7 |
| Infobae (infobae) | 100 | 117.04 | 0.9 |
| Clarín (clarin-deportes) | 10 | 6.86 | 1.5 |
| Radio Gabal (FM 104.1) (gabal-deportes) | 3 | 2.01 | 1.5 |
| Ahora Balcarce (ahorabalcarce) | 10 | 6.68 | 1.5 |

Leer más seguido no cuesta IA: lo que ya se vio se descarta antes de gastar nada.

## Categorías que traen los feeds

- Notas con categorías en el propio feed: **1517 de 7463** (20%).
- Feeds con sección fija en el código (por ejemplo "Deportes", "Economía"): 123 de 206.

Las 40 categorías más comunes: de (349), la (305), en (237), el (188), política (178), a (143), y (135), deportes (125), propia (117), un (75), economía (63), que (62), una (58), del (57), por (55), los (53), motogp (52), con (52), fórmula 1 (51), para (51), previsional (50), marina bay street circuit (46), sociedad (45), mandalika international street circuit (43), su (42), tecnología (40), milei (40), las (38), se (37), espectáculos (36), al (33), argentina (31), más (28), general (22), kicillof (22), actualidad (20), la plata (19), plata (18), creado por ia (17), internacionales (17).

Los 40 primeros tramos de la dirección más comunes (la sección que el diario pone en la URL): /index/ (1191), /noticias/ (656), /nota/ (621), /deportes/ (569), /sociedad/ (469), /politica/ (353), /economia/ (315), /2026/ (195), /noticia/ (160), /ar/ (130), /blog/ (119), /tecno/ (116), /cultura/ (116), /tecnologia/ (99), /clima/ (81), /finanzas/ (67), /rugby/ (62), /futbol/ (61), /deporte-motor/ (54), /f1/ (51), /previsional/ (50), /motogp/ (49), /espectaculos/ (46), /policiales/ (44), /mundo/ (42), /espana/ (42), /articulo/ (40), /negocios/ (39), /actualidad/ (39), /torneo-clausura/ (38), /america/ (35), /business/ (33), /autos/ (31), /academy/ (30), /internacionales/ (29), /global-affairs/ (29), /economia-politica/ (28), /internacional/ (26), /entretenimiento/ (26), /finanzas-mercados/ (23).

### Cuántas notas traen categorías, por medio

| Medio | Notas | Con categorías |
|---|---|---|
| OpenAI | 1287 | 0% |
| Infobae | 684 | 0% |
| Perfil | 440 | 0% |
| ANDigital | 411 | 100% |
| TN (Todo Noticias) | 335 | 0% |
| La Nación | 325 | 0% |
| Radio Mitre | 268 | 0% |
| Infobrisas (Radio Brisas) | 200 | 0% |
| ESPN Argentina | 170 | 0% |
| El Cronista | 162 | 0% |
| El Destape | 127 | 0% |
| A24 | 125 | 100% |
| Ámbito | 123 | 99% |
| Canal 26 | 123 | 0% |
| C5N | 112 | 88% |
| Olé | 107 | 0% |
| El Economista | 105 | 0% |
| Motorsport | 100 | 100% |
| Página/12 | 100 | 0% |
| Crónica | 100 | 0% |
| Realpolitik | 100 | 100% |
| Bolavip Argentina | 100 | 0% |
| La Página Millonaria | 100 | 0% |
| Mundo Ascenso | 100 | 0% |
| Google DeepMind | 100 | 0% |
| iProfesional | 99 | 100% |
| Minuto Uno | 86 | 100% |
| Clarín | 79 | 0% |
| Diario Popular | 78 | 100% |
| Agrositio | 61 | 0% |
| iProUP | 55 | 100% |
| 0223 (Mar del Plata) | 45 | 0% |
| La Nueva | 45 | 0% |
| InfoRegión | 40 | 0% |
| La Verdad | 40 | 0% |
| FayerWayer | 37 | 0% |
| 0221 | 32 | 100% |
| El Día | 30 | 100% |
| La Opinión | 30 | 100% |
| Vavel Argentina | 30 | 100% |

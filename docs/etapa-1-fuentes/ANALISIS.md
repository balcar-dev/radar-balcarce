# Etapa 1 · Fuentes: qué se lee hoy, qué aporta cada una y tres listas posibles

*Medido el 15/10/2026 desde la PC de Hernán. Sólo análisis: no se tocó `ingesta/fuentes.mjs`,
`ingesta/fuentes-cruce.mjs` ni ningún otro archivo del motor.*

Todo lo que dice este documento sale de dos lugares, y se puede volver a medir cuando se quiera:

- **El archivo de notas publicadas**: `web/data/archivo.json` (1.117 notas, del 3/9 al 15/10) más
  `web/data/historico/` (289 notas de agosto y septiembre que ya no están en el archivo). En total
  **1.406 notas; 80 son propias de Radar** (repasos, efemérides, dólar, F1, fútbol) y no cuentan para
  ningún medio. Quedan **1.326 notas que vinieron de medios**: 655 "de acá" y 671 de afuera.
- **La prueba en vivo de cada dirección**: las 254 configuradas (236 activas y 18 apagadas) y 57
  candidatas, leídas con el mismo lector de feeds del motor.

La herramienta es `ingesta/medir-fuentes.mjs` (no usa nada de afuera de Node, sólo lee):

    node ingesta/medir-fuentes.mjs              mide el archivo y prueba todo en vivo (1 a 2 minutos)
    node ingesta/medir-fuentes.mjs --sin-red    sólo el archivo

La planilla con una fila por feed y todas las medidas es `docs/etapa-1-fuentes/fuentes-medidas.csv`
(se abre con Excel o Google Sheets; al final de este documento están sus columnas).

**Lo que NO se pudo medir** está marcado como **NO VERIFICADO**. Lo más importante: la prueba en vivo
se hizo desde una conexión de casa en Argentina, no desde GitHub Actions ni desde Cloudflare. Un sitio
que anda acá puede bloquear al robot allá (es lo que pasó el 30/09 con Lobería y Sendero).

---

## (a) Cómo funcionan las fuentes hoy

### La lista

| | Configuradas | Activas | Apagadas |
|---|---|---|---|
| Feeds (direcciones) | 254 | 236 | 18 |
| Medios distintos | 117 | 105 | — |
| Cómo se leen (activas) | 201 RSS, 7 Atom, 25 índices de noticias (sitemap), 3 portadas raspadas | | |

(El `CLAUDE.md` dice "más de 200 feeds de unos 90 medios": los números de arriba son los del código hoy.)

Cada feed tiene un **peso** puesto a mano. Así están repartidos los 236 activos:

| Peso | Feeds | Quiénes |
|---|---|---|
| 30 | 3 | News Balcarce, Puntonueve, Infórmese Primero |
| 26 a 28 | 9 | el resto de los medios de Balcarce y Radio Gabal |
| 24 | 1 | Municipalidad de Balcarce |
| 13 a 16 | 21 | partes de Clarín, La Nación, Infobae, Ámbito, Perfil, Argenpapa |
| 10 a 12 | 58 | regionales, provinciales y algunos especializados |
| 7 u 8 | 144 | casi todo lo nacional y de nicho (el "valor por defecto") |

### El puntaje (la "relevancia", `ingesta/ingesta.mjs`)

    peso del feed
    + 25 si es de Balcarce
    + frescura: 25 si tiene menos de 3 horas, 15 si menos de 12, 8 si menos de 24 (sin fecha real: 0)
    + 10 por cada medio extra que cuenta lo mismo (tope 40)
    + 6 si trae imagen, + 4 si trae texto completo
    + 22 si un medio de afuera nombra a Balcarce, + 16 si nombra a una figura argentina
    + 8 si es Automovilismo
    tope: 100

El puntaje **sólo ordena**: no decide si una nota sale. Lo de Balcarce sale aunque lo cuente un
solo medio; lo de afuera necesita que lo cuenten varios medios (Fútbol y Deportes 4; Economía,
Tecnología, Agro y Automovilismo 2; el resto 3; con una figura, 2).

### Dos ejemplos reales del archivo

*(La cuenta del puntaje es una reconstrucción con la fórmula: el archivo no guarda el puntaje.)*

1. **"Gastón Gaudio confirmó que será candidato a presidente de Independiente"** (Fútbol, 29/09).
   La contaron **21 medios** (Clarín, La Nación, Infobae, TN, Olé, TyC Sports…). La nota principal
   era de Clarín Deportes, que tiene peso **7**. Leída a menos de 3 horas y con foto:
   7 + 25 (frescura) + 40 (tope por medios) + 6 (foto) = **78**.
2. **"Concejales proponen crear un registro municipal de acompañantes terapéuticos"** (Balcarce).
   La contó **un solo medio**, Diario La Vanguardia (peso **28**), y fue de las notas más leídas del
   período (17 visitas). 28 + 25 (Balcarce) + 0 (frescura: ver abajo) + 6 (foto) + 4 (bajada) = **63**.

Qué muestran: el peso por medio decide poco al lado de la cantidad de medios y la frescura; y La
Vanguardia **nunca suma frescura**, porque su portada no trae la hora y sus notas no tienen la
etiqueta de fecha que busca el robot (en las tres que se abrieron hoy, ninguna la tenía). Cualquier
nota de Balcarce con fecha le gana en orden aunque sea más vieja.

---

## (b) Lo que se midió

### Qué aporta cada medio (los que más notas publicadas tienen)

Columnas: **notas** = notas publicadas que lo nombran entre sus medios · **única** = fue el único
medio · **imprescindible** = nota de afuera que sin él no llegaba al mínimo de medios de su sección
(cota baja: el archivo guarda los medios de al final) · **de acá** = notas de Balcarce o la zona ·
**vistas** = visitas a esas notas del 29/09 al 15/10 (las estadísticas existen sólo desde el 29/09:
17 días y 1.071 visitas a notas en total).

| Medio | Tipo | Feeds activos | Notas | Única | Imprescindible | De acá | Vistas |
|---|---|---|---|---|---|---|---|
| Infobae | nacional | 7 | 311 | 2 | 30 | 7 | 111 |
| La Nación | nacional | 13 | 260 | 1 | 23 | 4 | 93 |
| Noticias Argentinas (NA) | agencia | 2 | 256 | 0 | 18 | 4 | 113 |
| TN | nacional (Grupo Clarín) | 9 | 244 | 0 | 18 | 3 | 119 |
| Perfil | nacional | 7 | 210 | 0 | 8 | 2 | 109 |
| Clarín | nacional (Grupo Clarín) | 8 | 208 | 1 | 31 | 4 | 62 |
| Ámbito | nacional | 7 | 190 | 0 | 15 | 5 | 74 |
| **Infórmese Primero** | local | 1 | 188 | **75** | 1 | 156 | **195** |
| **Diario La Vanguardia** | local | 1 | 184 | **107** | 0 | 165 | **217** |
| Radio Mitre | nacional (Grupo Clarín) | 5 | 182 | 0 | 10 | 4 | 90 |
| **Radio Gabal** | local | 5 | 173 | **117** | 1 | 170 | **152** |
| Crónica | nacional | 1 | 173 | 0 | 6 | 2 | 31 |
| Minuto Uno | nacional | 5 | 165 | 0 | 10 | 3 | 63 |
| El Eco de Tandil | regional (sistema eleco) | 2 | 156 | 3 | 4 | 6 | 67 |
| C5N | nacional | 6 | 143 | 0 | 4 | 1 | 63 |
| El Destape | nacional | 7 | 141 | 1 | 4 | 5 | 70 |
| **El Diario Balcarce** | local | 1 | 132 | **83** | 0 | 116 | **122** |
| TyC Sports | especializado | 1 | 103 | 0 | 8 | 2 | 69 |
| **Municipalidad de Balcarce** | oficial | 1 | 76 | 24 | 0 | 76 | **113** |
| **Puntonueve** | local | 1 | 70 | 40 | 0 | 70 | 46 |
| **News Balcarce** | local | 1 | 42 | 11 | 0 | 42 | 78 |
| **Acción 5** | local | 1 | 15 | 3 | 1 | 14 | 78 |

(Todos los medios, en `fuentes-medidas.csv`.)

**Lo que dicen los números:**

- **Una nota de Balcarce se lee casi seis veces más que una de afuera.** En los 17 días con
  estadísticas: 272 notas de acá con 569 visitas (**2,1 por nota**) contra 545 de afuera con 197
  (**0,36 por nota**). Las diez notas más vistas del período son todas de Balcarce (corte de luz de
  la Cooperativa, la Liga suspendida, el Concejo, el hospital…).
- **Los medios de Balcarce son los únicos que aportan notas que nadie más tiene**: La Vanguardia 107,
  Radio Gabal 117, El Diario 83, Infórmese Primero 75, Puntonueve 40. Un medio nacional casi nunca es
  la única fuente (está en la regla: lo de afuera necesita varios medios).
- **De afuera, el aporte es repetido**: de las 671 notas de afuera, 155 las contaron 10 o más medios
  y sólo 143 salieron con 2. Que un nacional "confirme" no dice mucho: casi todas sus notas están
  confirmadas por definición. Lo útil es cuántas veces fue **imprescindible**: Clarín 31, Infobae 30,
  La Nación 23, TN 18, NA 18, Ámbito 15.
- **"Quién lo contó primero" casi no se puede medir**: sólo 120 notas tienen la hora de al menos dos
  medios. En esa muestra chica: Infobae fue primero en 16 de 44, NA en 15 de 33, Clarín en 11 de 24,
  Ámbito en 9 de 20. **NO VERIFICADO** como tendencia (muestra chica).
- **Los especializados de agro aportan poco**: Agrositio 15 notas, Infocampo 14, Bichos de Campo 7,
  Agroempresario 21, Todo Agro 2, INTA 3, sin visitas registradas. El agro que sale lo traen sobre
  todo los medios de Balcarce y las secciones de campo de los grandes.
- **Automovilismo de acá**: Campeones aportó 18 notas, 13 de Balcarce y 9 como única fuente (es la
  que mejor cubre el autódromo).

### Medios que no aportaron nada (con feeds activos)

**17 medios activos tienen cero notas publicadas** en seis semanas:
Gobierno de la Provincia, FayerWayer, Agencia CyTA, ESPN Argentina (3 feeds y 192 notas por lectura),
Mundo Ascenso, TNT Sports, INCAA, Teatro Colón, Google, Google DeepMind, OpenAI, Microsoft, Nvidia,
NASA, ESA, Municipio de General Alvarado y Municipalidad de San Cayetano.

Casi nada (1 a 4 notas): Argenpapa 4 (las 4 de Balcarce y únicas: ojo, aporta lo de la papa),
Diario Conurbano 4, Córdoba Competición 4, INTA 3, Realpolitik 3, Solotc 3, UAR 2, Todo Agro 2,
Noticias y Protagonistas 1, Pick and Roll 1, CADA 1, SMN 1.

Que no aporten **no quiere decir que estén caídos**: casi todos responden bien (ver abajo). Sus notas
no pasan el filtro (blogs de empresas que nunca cuentan dos medios, temas sin relación con Balcarce).

### Feeds muertos o que fallan

De las 236 activas, **las 236 respondieron** en la corrida final. Pero:

| Feed | Qué pasa |
|---|---|
| Radio Gabal · Agro | responde, la última nota es del 10/09 (35 días) |
| Ahora Balcarce | la última nota es del 3/10 (12 días); 5 notas publicadas en seis semanas |
| Olé · Copa Argentina | última del 6/10 (9 días) |
| Agencia CyTA | última del 7/10 (8 días); cero notas publicadas |
| INCAA | última del 25/09 (20 días); cero notas publicadas |
| Diario La Vanguardia, Argenpapa, SMN avisos | traen notas pero **ninguna con fecha** (no se puede saber si están al día por el feed) |
| Ámbito, C5N, Diario Popular, Minuto Uno (todos con direcciones `/rss/pages/…`) | en dos de las cuatro corridas de hoy, varios de sus feeds tardaron más de 15 segundos; en la última anduvieron todos. **Intermitentes** |

Otros datos de salud que importan:

- **Radio Gabal da sólo 3 notas por feed** (sus 5 secciones no se repiten entre sí). No tiene feed
  general (`index.php?format=feed` da 404). Si un día publica más de 3 notas de una sección entre dos
  lecturas, se pierden.
- **Clarín da sólo 10 notas por feed** y sus 8 feeds casi no se repiten (10 % o menos). No se encontró
  un índice de noticias de Clarín (`sitemap-news.xml` y `sitemap_news.xml` dan 404).
- **Infobae publica más rápido de lo que su feed general alcanza a mostrar**: 100 notas en un poco más
  de media hora. Sus 7 feeds casi no se repiten y su índice de noticias trae sólo las últimas 100 (el
  11 % de lo que traen los 7 feeds juntos).

### Las apagadas que hoy andan (desde esta PC)

De las 18 apagadas, **15 responden bien hoy**: Sendero Regional (dos veces en la lista), 2261 Lobería,
El Argentino Digital, El Diario de Tandil, los índices de Ecos Diarios y La Voz del Pueblo, Municipios
vecinos (Benito Juárez), El Norte, Radio Sudestada, Motor1, Infobae Teleshow, Minuto Uno Espectáculos,
Hipertextual y Xataka. Varias se apagaron "porque bloquean a GitHub": **NO VERIFICADO** si siguen
bloqueando desde GitHub o desde Cloudflare. Otras se apagaron por criterio (chimentos, España, autos 0
km): que anden no cambia ese motivo. Siguen sin servir: el índice de La Nueva y el de Solo Ascenso
(responden sin notas) y Autoblog (403).

### Feeds del mismo medio que traen lo mismo

Se compararon las direcciones de las notas que trae cada feed hoy. "Suma" = cuántas notas trae que
ningún otro feed del mismo medio (ya elegido) trae.

| Medio | Feeds | Qué pasa | Con cuántos alcanza |
|---|---|---|---|
| **TN** | 9 | El índice de noticias trae el **100 %** de lo que traen los 9. Los otros 8 suman 0. | **1** |
| **El Destape** | 7 | El índice trae el 98 %; los 5 de sección suman 0. | **1** |
| **Olé** | 13 | El índice trae el 89 %; 7 de los 12 restantes suman 0 a 2 notas. Copa Argentina, muerto. | 1 a 3 (índice + tenis/básquet si interesan) |
| **La Nación** | 13 | Ningún feed trae más del 24 %. Fútbol, rugby, tenis, automovilismo y campo ya están en Deportes y Economía. El índice de noticias (`sitemap-news.xml`, no está en la lista) trae el **72 %** solo. | 4 a 5, o el índice + 1 o 2 (**a probar en la ingesta**) |
| **Radio Mitre** | 5 | El feed general y el índice son el mismo (99 %). | 3 |
| **Canal 26, Diario Popular, 0221, Infobrisas, El Día, NA, El Eco, El Marplatense, QZ, Mi8, LU9, Doble Amarilla, Vavel, Bolavip, iProUP** | 2 a 5 cada uno | Uno de sus feeds (casi siempre el índice) trae entre el 89 % y el 100 % de todo. | **1** cada uno |
| **Ámbito, C5N, Minuto Uno** | 5 a 7 | Hoy se leen por secciones; su índice de noticias (no está en la lista) trae el 85 %, 87 % y 100 %. | **1** (el índice) |
| **Infobae, Clarín, Perfil, Página/12** | 5 a 8 | Sus feeds casi no se repiten: cada sección trae cosas distintas. | 3 o 4 cada uno |

En total, la herramienta propone **apagar 46 feeds activos por repetidos o muertos** sin perder notas
(ver la columna `accion` de la planilla), y dejar 31 "para revisar".

### Medios que comparten dueño o sistema

- **Sistema eleco.com.ar (verificado por las direcciones)**: El Eco de Tandil, Ecos Diarios, El
  Marplatense, LU9, QZ Noticias, La Noticia 1 y La Voz del Pueblo leen sus feeds del mismo servidor
  (`…apiv3.eleco.com.ar`). Si además comparten redacción, dos de ellos contando lo mismo no son dos
  confirmaciones. **NO VERIFICADO** si comparten dueño o redacción.
- **Grupo Clarín (conocimiento público, a confirmar)**: Clarín, Olé, TN y Radio Mitre. Hoy cuentan como
  cuatro medios distintos para llegar al mínimo.
- Medido: de las 244 notas donde aparece TN, en 7 todos los demás medios eran del mismo grupo (o sea,
  contando el grupo una vez, quedaban con un solo "medio"); con Clarín, 7 de 208; con Olé, 4 de 111.
  El efecto existe pero hoy es chico.

---

## (c) Tres listas posibles

En las tres, **el bloque de Balcarce entra entero** (decisión de principio del rediseño: lo de Balcarce
pasa). Lo que cambia es cuánto de afuera se lee. Las cifras de "cobertura" son una simulación con las
671 notas de afuera ya publicadas: cuántas habrían seguido teniendo los medios necesarios si sólo se
leyeran los medios de esa lista.

### Bloque Balcarce (igual en las tres): 11 medios, 15 feeds

| Medio | Feed propuesto | Tipo | Por qué |
|---|---|---|---|
| Infórmese Primero | `feeds.feedburner.com/informeseprimero` (Atom) | local | 188 notas, 75 únicas, 195 visitas. Ya trae 25 notas (pedir más a Blogger no suma: también da 25) |
| Diario La Vanguardia | portada raspada | local | 184 notas, 107 únicas, la más leída. Sin feed ni sitemap (404). Falta la fecha (ver arriba) |
| Radio Gabal | sus 5 feeds por sección | local | 173 notas, 117 únicas. Sin feed general; 3 notas por feed. Agro sin notas desde el 10/09: dejarlo igual (es poco costoso) |
| El Diario Balcarce | portada raspada | local | 132 notas, 83 únicas |
| Puntonueve | `puntonueve.com.ar/feed` | local | 70 notas, 40 únicas; publica unas 10 por día |
| News Balcarce | `newsbalcarce.com.ar/?feed=rss2` | local | 42 notas, 78 visitas |
| Acción 5 | `accion5.com/feed/` (o su API de WordPress, que anda y trae 20 con texto completo) | local | 15 notas, 78 visitas (5,2 por nota, la más alta) |
| Municipalidad de Balcarce | `balcarce.gob.ar/feed/` (o la API de WordPress, que anda) | oficial | 76 notas, 113 visitas |
| Ahora Balcarce | `ahorabalcarce.com.ar/feed/` | local | **revisar**: 5 notas en seis semanas, la última del 3/10 |
| **Concejo Deliberante** (nuevo) | `concejodeliberantebalcarce.gob.ar/feed/` | oficial | **anda**: 10 notas, 8 nombran Balcarce, la última del 14/10 |
| **Facultad de Ciencias Agrarias** (nuevo) | `fca.mdp.edu.ar/feed/` | oficial | anda pero publica poco: la última del 30/09 |

Aparte, como **dato** y no como noticia: SIBOM (boletín municipal) responde, pero su página no tiene
feed y el último boletín que muestra es del 21/09.

### Opción Chica: 15 medios de afuera (26 en total, ~40 feeds)

| Medio | Feed propuesto | Tipo | Grupo | Por qué |
|---|---|---|---|---|
| Infobae | general + economía + política | nacional | — | 311 notas, imprescindible en 30; sus secciones no se repiten |
| La Nación | índice de noticias (a probar) o general + economía + política + sociedad | nacional | — | 260 notas, imprescindible en 23 |
| Clarín | lo último + economía + política + rural | nacional | Grupo Clarín | 208 notas, imprescindible en 31 (el que más); 10 notas por feed |
| TN | índice de noticias | nacional | Grupo Clarín | 244 notas; el índice trae todo lo de sus 9 feeds |
| Perfil | política + economía + deportes | nacional | — | 210 notas, 109 visitas |
| Página/12 | política (el país) + economía + sociedad | nacional | — | 88 notas; da otra mirada del mismo hecho |
| Ámbito | índice de noticias (nuevo) | nacional | — | 190 notas; el índice trae el 85 % de sus 7 feeds |
| Noticias Argentinas | índice de noticias | agencia | — | 256 notas; agencia: hechos sin tono |
| TyC Sports | índice de 48 horas | especializado | — | 103 notas de deportes |
| Campeones | `campeones.com.ar/feed/` | especializado | — | automovilismo: 18 notas, 13 de Balcarce |
| Infocampo | `infocampo.com.ar/feed/` | especializado | — | el agro especializado que más publica hoy (16 por día) |
| El Eco de Tandil | índice de noticias | regional | eleco | 156 notas; Tandil |
| 0223 | general + deportes | regional | — | 69 notas; Mar del Plata, 9 de la zona |
| Agencia DIB | `dib.com.ar/rss/pages/home.xml` | agencia | — | 88 notas; agencia bonaerense |
| El Día | índice de noticias | provincial | — | 130 notas; La Plata |

- **Cobertura**: de las 671 notas de afuera, 395 (59 %) habrían llegado al mínimo actual; 500 (75 %)
  con un mínimo de 2 medios. De las 655 de acá, 636 (97 %) tienen igual al menos un medio de la lista.
- **Volumen de lectura**: unas 2.300 notas por día de feeds (contando repetidas), contra 6.200 hoy.
- **Costo**: los feeds no cuestan nada. La IA clasifica menos de la mitad que hoy (ahorro de centavos
  a 1 dólar por mes; ver "costos" abajo).
- **Riesgo**: hay que bajar los mínimos de medios (con 15 medios, pedir 4 para Fútbol deja afuera
  mucho); la zona queda flaca (sólo Tandil y Mar del Plata); dos de los cuatro grandes son del mismo
  grupo; se pierde el "termómetro" de cuántos medios cuentan algo.

### Opción Media: 30 medios de afuera (41 en total, ~60 feeds)

La Chica más:

| Medio | Feed propuesto | Tipo | Grupo | Por qué |
|---|---|---|---|---|
| Radio Mitre | sociedad + deportes + general | nacional | Grupo Clarín | 182 notas, 90 visitas |
| Minuto Uno | índice de noticias (nuevo) | nacional | — | 165 notas; el índice trae el 100 % de sus feeds |
| Crónica | últimas noticias | nacional | — | 173 notas |
| C5N | índice de noticias (nuevo) | nacional | — | 143 notas; el índice trae el 87 % |
| El Destape | índice de noticias | nacional | — | 141 notas; otra mirada |
| El Cronista | índice + finanzas y mercados | nacional | — | 114 notas, economía |
| Diario Popular | índice de noticias | nacional | — | 130 notas |
| Olé | índice de noticias | especializado | Grupo Clarín | 111 notas de fútbol |
| Bichos de Campo | `bichosdecampo.com/feed/` | especializado | — | agro con mirada propia (7 notas) |
| Motorsport | F1 | especializado | — | Fórmula 1 en castellano (50 por lectura) |
| Sendero Regional | `senderomultimedios.com.ar/feed` (**reactivar**) | regional | — | Necochea y la zona; anda, 3 de 16 nombran Balcarce |
| 2261 Lobería | `2261.com.ar/feed/` (**reactivar**) | regional | — | partido vecino; anda |
| El Diario de Tandil | índice de noticias (**reactivar**) | regional | — | anda: 23 notas, 12 en el día |
| Infobrisas | noticias | regional | — | Mar del Plata; trae todo lo de sus 3 feeds |
| Ecos Diarios | índice de noticias (**reactivar** el índice) | regional | eleco | Necochea; el índice trae 121 notas contra 20 del Atom |

- **Cobertura**: 507 de 671 (76 %) llegan al mínimo actual; 614 (92 %) con mínimo 2. De acá, 643 de
  655 (98 %).
- **Volumen**: unas 3.450 notas por día de feeds (contando repetidas).
- **Riesgo**: las cuatro reactivadas pueden volver a no responder desde GitHub (**NO VERIFICADO**);
  igual hay que revisar los mínimos de medios.

### Opción Amplia: 50 medios de afuera (61 en total, ~85 feeds)

La Media más: Canal 26 (general), A24 (general + política), iProfesional (general), La Nueva (últimas),
0221 (índice), ANDigital, La Brújula 24, La Verdad (Junín), El Marplatense (índice, eleco), QZ Noticias
(índice, eleco), Mi8 (índice), La Tecla (La Plata y Mar del Plata), Doble Amarilla (índice), Bolavip
(índice), El Gráfico, El Economista, Agrositio (destacadas + hacienda), Argenpapa (portada), El
Argentino Digital (**reactivar**) y Ayacucho al Día; y la **Municipalidad de Necochea** (nuevo, anda).

- **Cobertura**: 566 de 671 (84 %) al mínimo actual; 645 (96 %) con mínimo 2. De acá, 650 de 655.
- **Volumen**: unas 4.150 notas por día de feeds.
- **Riesgo**: mucho de lo que suma son medios del mismo sistema (eleco) o de deportes que repiten lo
  mismo; más medios hacen que todo lo nacional "lo cuenten 10", que es lo que hoy empuja Fútbol y
  Economía arriba aunque nadie lo lea.

### Bloque aparte, opcional en cualquiera: ciencia, tecnología y espacio (internacionales)

De los 24 internacionales del módulo 1, **23 responden con notas** (Nature general devuelve una
página y no un feed). De ésos, Smithsonian y Our World in Data llevan 8 días sin notas, y NASA JPL le
da 403 al nombre del robot y sólo contesta al de un navegador. Y se probaron cuatro en
castellano que el módulo 1 no pudo leer: **BBC Mundo, DW Español, The Conversation (España) y France 24
en español andan**. Ninguno nombra a Balcarce, claro. Sugerencia para empezar, sólo si se decide la
regla de "una sola fuente cuando es científica o institucional": NASA (comunicados), MIT News,
ScienceDaily, The Conversation (España), Centro Internacional de la Papa y BBC Mundo (ciencia). arXiv
trae 1.350 por día: nunca directo. Los blogs de Google, OpenAI, Microsoft, Nvidia y DeepMind que hoy
están activos no aportaron ninguna nota: apagarlos o pasarlos a este bloque.

### Datos (no son noticias: van a un módulo aparte, sin cruce)

Anduvieron hoy: **BCRA** variables monetarias (1.000 registros, dato del 15/10) y cotizaciones (39
monedas, del 14/10); **datos.gob.ar** inflación (último dato: julio de 2026, se publica con atraso);
la **API de WordPress** de la Municipalidad y de Acción 5 (20 notas con texto completo cada una).

### Costos (para las tres)

- **Leer feeds no cuesta nada**: es código común; la corrida de hoy leyó 311 direcciones en 62 a 91
  segundos desde la PC. En GitHub Actions es gratis porque el repositorio es público.
- **La IA**: según `02-IA-MODELOS-OpenRouter.md`, clasificar unas 27.000 notas por mes con Mercury
  Decide cuesta ~US$ 1,08 (US$ 2,16 sin la promoción). Las tres opciones leen entre el 37 % y el 67 %
  de lo que se lee hoy, así que la diferencia de plata entre ellas es de centavos. **El costo real de
  leer de más no es plata: es ruido** (notas repetidas, Fútbol y Economía empujados por cantidad,
  más trabajo para el cruce y para revisar).

---

## (d) Recomendación

**La opción Media, con cuatro reglas**:

1. **Un medio, la menor cantidad de feeds que trae todo**: el índice de noticias cuando trae el 80 %
   o más de lo que traen sus feeds juntos (TN, El Destape, Olé, Ámbito, C5N, Minuto Uno, NA, El Eco…);
   por sección sólo donde las secciones no se repiten (Infobae, Clarín, Perfil, Página/12, Mitre). Así
   se pasa de 236 a unos 60 feeds sin perder lo que hoy se lee de esos medios.
2. **Balcarce entero, más el Concejo Deliberante**, y la Facultad de Agrarias aunque publique poco.
   Revisar Ahora Balcarce con ellos (¿sigue publicando?) y resolver la fecha de La Vanguardia.
3. **Campo `grupo`** en cada medio (eleco y Grupo Clarín para empezar) y que, al contar medios para
   el mínimo, un grupo cuente una vez.
4. **La lista se mide sola**: correr `medir-fuentes.mjs` una vez por mes (o que la vigilancia guarde la
   última nota de cada feed) y sacar lo que no aporta. Avisar si un feed de Balcarce queda 24 horas sin
   notas.

Por qué Media y no Chica: con 15 medios hay que tocar a fondo la regla de "cuántos medios lo cuentan"
(se pierde el 25 % de lo de afuera aun bajando el mínimo a 2) y la zona queda con dos ciudades. Por qué
no Amplia: lo que suma por encima de Media son medios del mismo sistema o de deportes que repiten, y lo
de afuera es lo que menos se lee (0,36 visitas por nota). La Media mantiene el 92 % de lo de afuera con
un mínimo de 2 medios y suma lo que hoy falta: los vecinos (Lobería, Necochea, Tandil) y el Concejo.

Lo que esta recomendación **no** decide: cuántos medios pide cada sección (eso es la Etapa 5) y si
entran los internacionales (pregunta abierta, abajo).

---

## (e) Cómo leer las fuentes: ¿con un modelo tipo Mercury o Jev?

**Respuesta corta: no para leer los feeds. Sí puede ayudar, de forma acotada, con los sitios que no
tienen feed.**

### Leer feeds es trabajo de código y tiene que seguir así

Un feed (RSS, Atom o índice de noticias) es una lista ordenada que el propio medio publica para que la
lean programas: título, enlace, fecha, a veces resumen y foto. El código actual la lee en milésimas de
segundo, gratis y siempre igual. Hoy leyó 311 direcciones en un minuto y medio. Ningún modelo de IA
hace eso mejor: sería más lento, costaría plata y podría equivocarse en algo que hoy no falla nunca.

### Qué hace un modelo de decisiones (Mercury Decide, Jev)

Son modelos que **reciben una nota ya leída** (título, resumen, de qué medio viene) y **contestan
preguntas cerradas**: ¿de qué sección es? (una de 15), ¿le interesa a Balcarce? (directo / indirecto
/ nada), ¿se publica? (sí o no, con probabilidad). **No navegan, no bajan páginas, no escriben texto.**
En las pruebas de `pruebas-modelos/` con 200 notas, Mercury coincidió con Gemini en el 94 % de las
decisiones de publicar, no descartó nada de Balcarce que importara y costaría unos US$ 0,9 por mes.
Su lugar es la **Etapa 4 (clasificación)**, después de que el código leyó los feeds y juntó las
repetidas, no la Etapa 1.

### Donde un modelo sí puede ayudar: los sitios sin feed

Hoy hay tres portadas raspadas (La Vanguardia, El Diario Balcarce, Argenpapa) y hay candidatas sin
feed (La Capital de Mar del Plata: su feed da 403 pero su portada responde con 160 enlaces; SIBOM). El
problema de raspar es que cada sitio es distinto y, cuando cambian el diseño, el robot deja de
encontrar notas sin avisar. Propuesta, en tres niveles:

1. **El modelo escribe la receta, el código lee todos los días.** Cuando se suma un sitio, o cuando un
   sitio raspado queda en cero notas por más de un día, se le pasa a un modelo de chat chico la lista
   de enlaces de la portada (dirección + texto del enlace, no la página entera) y se le pide la regla
   para reconocer cuáles son notas. Una persona la aprueba y queda en el código. Costo: una consulta de
   unos miles de palabras, **menos de 1 centavo de dólar** cada vez.
2. **Filtrar sólo los enlaces nuevos.** En cada lectura, el código compara la portada con la anterior y
   manda al modelo sólo los enlaces que no había visto (2 a 5 por lectura en un sitio local), con una
   pregunta cerrada por enlace: "¿es una nota periodística?". Eso es justo lo que sabe hacer Mercury
   Decide (sí o no con probabilidad). Cálculo con los precios de `02`: 6 sitios × 48 lecturas por día
   × 30 días = 8.640 consultas de ~1.000 tokens = 8,6 millones de tokens por mes → **US$ 0,17 a 0,35
   por mes** con Mercury (0,02 a 0,04 por millón); unos US$ 1 a 1,5 con Claude Haiku 5.5.
3. **Lo que no conviene**: mandar la página entera en cada lectura. Una portada limpia son 15.000 a
   30.000 tokens: 8.640 × 20.000 = 173 millones por mes → US$ 3,5 a 7 con Mercury (y su ventana de
   33.000 a 66.000 tokens queda justa) o más de US$ 17 con Haiku, por un trabajo que el código hace
   gratis.

**Riesgos y límites:**

- **Derechos de autor**: de un sitio sin feed se toma sólo **título, enlace y un resumen corto con
  palabras propias**; nunca se copia el texto. Es lo mismo que hace hoy el robot con las bajadas de
  Open Graph. Respetar `robots.txt` y leer con la misma cortesía que ahora (cada 30 minutos, de a uno).
- **Enlaces inventados**: el modelo sólo puede elegir entre los enlaces que el código le dio; cualquier
  dirección que no esté en la página se descarta sin preguntar.
- **Texto engañoso en la página** (alguien que escribe instrucciones para el robot): por eso el modelo
  contesta preguntas cerradas y no "lee y decide qué hacer".
- **La fecha**: un modelo no puede saber cuándo salió una nota si la página no lo dice. La de La
  Vanguardia hay que sacarla de otro lado (el texto de la nota o el número correlativo de la dirección,
  como sugería el módulo 1). **NO VERIFICADO** cuál de los dos sirve.
- La API de decisiones de OpenRouter es "alpha": puede cambiar. Dejar siempre el raspado por código
  como camino principal y el modelo como ayuda.

---

## (f) Lo que tienen que decidir Andrés y Hernán

1. **Qué opción** (Chica, Media o Amplia) o una mezcla.
2. **Nacionales: equilibrio de miradas.** La lista incluye desde Página/12 y El Destape hasta La Nación
   e Infobae. ¿Se quiere así, o se prefiere otra mezcla? ¿Cuentan Clarín, TN, Olé y Mitre como un solo
   grupo?
3. **¿Se reactivan Sendero, 2261, El Diario de Tandil y El Argentino Digital?** Andan desde la PC; si
   desde GitHub no responden, ¿se espera al robot nuevo de Cloudflare?
4. **Ahora Balcarce**: ¿sigue publicando? (12 días sin notas). **Radio Gabal Agro**: 35 días.
5. **Radio Sudestada**: está apagada y anda; ¿queda afuera del bloque Balcarce (es chimentos
   nacionales)?
6. **Internacionales**: ¿entran? Si entran, ¿alcanza con una sola fuente cuando es científica o
   institucional? ¿Cuáles?
7. **Los blogs de empresas** (Google, OpenAI, Microsoft, Nvidia, DeepMind) y ESPN, TNT Sports, Mundo
   Ascenso, INCAA, Teatro Colón, Gobierno de la Provincia, San Cayetano y General Alvarado: cero notas
   en seis semanas. ¿Se apagan?
8. **Especializados de agro**: aportan poco. ¿Uno (Infocampo), dos (más Bichos de Campo) o ninguno y
   que el agro venga de Balcarce y de las secciones de campo de los grandes?
9. **Medios que comparten sistema (eleco)**: ¿alguien sabe si comparten dueño o redacción?
10. **Sitios sin feed**: ¿se suma La Capital de Mar del Plata leyendo su portada? ¿Se prueba la ayuda
    del modelo (nivel 1 y 2 de arriba)?
11. **Instituciones de Balcarce sin sitio encontrado** (hospital, bomberos, Cooperativa, autódromo,
    radios Líder y 105.1): ¿tienen página propia?
12. **El peso por medio**: ¿se reemplaza por un puntaje calculado con estos datos (notas únicas,
    imprescindibles, visitas), o se elimina y el orden lo dan la cercanía y la frescura? (Se cierra en
    la Etapa 5.)

---

## La planilla `fuentes-medidas.csv`

Una fila por dirección: las 254 configuradas y las 57 candidatas. Columnas principales:

| Columna | Qué es |
|---|---|
| `id`, `medio`, `nombre`, `bloque`, `activa` | quién es y dónde está configurado (`candidata` = no está en la lista) |
| `tipo`, `alcance`, `ciudad`, `seccionFija`, `peso`, `oficial` | lo que dice hoy el código |
| `grupo`, `tipoPropuesto` | grupo de dueño o sistema; tipo propuesto (oficial, local, regional, provincial, nacional, agencia, especializado, internacional) |
| `http`, `contentType`, `ua`, `segundoIntento`, `formato`, `error` | cómo respondió hoy (y si hizo falta otro intento o el nombre de un navegador) |
| `items`, `sinFecha`, `ultimaNota`, `diasDesdeUltima`, `muerta`, `notas24h`, `notas7d`, `nombranBalcarce` | qué trajo |
| `repetidasEnOtroFeedDelMedioPct`, `notasNuevasQueSuma`, `esFeedPrincipalDelMedio`, `masParecidoA`, `candidataCubreDelMedioPct` | cuánto se repite con los otros feeds del mismo medio |
| `medio…` | lo que aportó el medio en el archivo: notas, única, primero (y sobre cuántas se pudo comparar), confirmadas, confirmadas por otro grupo, imprescindible, de acá, vistas, secciones |
| `feedNotasAtribuidas`, `medioNotasSinFeedAtribuible` | notas que se pueden atribuir con seguridad **a ese feed** (sólo si el enlace aparece hoy en el feed o en la memoria del cruce de esta PC, o si el medio tiene un solo feed). En los medios con muchos feeds la mayoría de las notas viejas no se pueden atribuir: **NO VERIFICADO** a nivel feed |
| `accion`, `motivo` | propuesta automática: mantener, apagar, revisar o sumar, con el porqué |

Reglas de la propuesta automática: lo de Balcarce se mantiene; un feed que no responde o está muerto
se revisa (o se apaga si su medio no aportó nada); de un medio con varios feeds, se mantiene el que más
trae y se apaga el que suma menos del 20 % de notas propias; una candidata que anda se suma (si es de un
medio que ya se lee, sólo si trae el 80 % o más de lo que traen sus feeds). **Es una propuesta para
mirar, no una decisión**: por ejemplo, la herramienta marca para mantener las 8 secciones de Clarín,
y en las listas de arriba quedan 4.

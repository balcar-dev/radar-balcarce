# Etapa 1 · La lista de fuentes elegida (15/10/2026)

*Decisión de Hernán y Andrés: se lee **todo lo de Balcarce y sus organismos**, **los 50 mejores medios del país** y **los 10 mejores de Tandil y Mar del Plata**. Nada más. Este documento dice cuáles son, por qué, qué se apagó, qué efecto se espera y qué mirar. Ya está aplicado en `ingesta/fuentes.mjs` y `ingesta/fuentes-cruce.mjs`; el registro completo, feed por feed, es `FUENTES.md`.*

Los datos medidos salen de `docs/etapa-1-fuentes/ANALISIS.md` y de la planilla `fuentes-medidas.csv` (1.326 notas publicadas del 3/9 al 15/10 que vinieron de medios, 17 días de visitas). Columnas de "dato medido": **n** = notas publicadas que lo nombran · **única** = notas donde fue el único medio · **imp.** = veces que fue imprescindible para llegar al mínimo de medios de su sección · **de acá** = notas de Balcarce o la zona · **vistas** = visitas a esas notas.

## En números

| | Antes | Después |
|---|---|---|
| Feeds activos | 236 | **103** |
| Medios activos | 105 | **71** (11 de Balcarce + 10 de la zona + 50 del país) |
| De Balcarce (feeds) | 13 | 15 |
| De la zona: Tandil y Mar del Plata, más Necochea, Lobería, Ayacucho y otros (feeds) | 27 | 11 (10 de Tandil/Mar del Plata y Argenpapa, que es de la papa) |
| Provinciales (feeds) | 25 | 11 |
| Nacionales (feeds) | 171 | 66 |
| Notas leídas por vuelta (suma de lo que traen los feeds, con repetidas) | ~11.300 | ~8.200 |

El registro conserva las 265 entradas (nada se borró); las 162 que no están en las 103 activas están anotadas una por una con `activa: false` y una `nota` ("apagada 15/10/2026: fuera de la lista elegida").

## Cómo se eligió

- **Un medio, un feed.** Cuando el índice de noticias (sitemap) de un medio traía el 80 % o más de lo que traían todos sus feeds juntos, queda sólo el índice (TN, El Destape, El Cronista, NA, Olé, TyC, Minuto Uno, C5N, Ámbito, Diario Popular, El Día, 0221...). Donde no hay índice útil y las secciones no se repiten, se dejan los feeds de sección que aportan lo propio (Infobae 6, La Nación 5, Clarín 7, Perfil 5, Página/12 3, Radio Mitre 3, Ámbito 3 por Tecnología y Cultura).
- **Nacionales**: alcance, cuántas veces el medio fue imprescindible, salud del feed y variedad (diarios, agencia, TV y radio, economía, deportes, agro, tecnología y ciencia, educación y salud) y equilibrio de miradas.
- **Zona**: los 10 de Tandil y Mar del Plata que más aportan de lo medido, con un feed cada uno. Hay sólo dos medios de Tandil que respondan (El Eco y El Diario de Tandil); el resto son de Mar del Plata.
- **Balcarce**: todos. Los feeds de Radio Gabal se dejan los cinco: no se repiten entre sí (0 %) y no tiene feed general.
- Se probaron en vivo, desde esta PC, todas las direcciones nuevas (ver "Qué no se pudo verificar").

## De Balcarce (11 medios, 15 feeds)

| Medio | Feed | Tipo | Grupo | Por qué entra | Dato medido |
|---|---|---|---|---|---|
| Diario La Vanguardia | portada raspada | local | — | la más leída; sin feed | n 184 · única 107 · de acá 165 · vistas 217 |
| Infórmese Primero | `feeds.feedburner.com/informeseprimero` | local | — | | n 188 · única 75 · vistas 195 |
| Radio Gabal | 5 feeds por sección (comunidad, policiales, política, deportes, agro) | local | — | sin feed general (404); 3 notas por feed | n 173 · única 117 · vistas 152 |
| El Diario Balcarce | portada raspada | local | — | su sección Rural no la cubre nadie | n 132 · única 83 · vistas 122 |
| Puntonueve | `puntonueve.com.ar/feed` | local | — | el más rápido en avisar | n 70 · única 40 · vistas 46 |
| News Balcarce | `newsbalcarce.com.ar/?feed=rss2` | local | — | | n 42 · única 11 · vistas 78 |
| Acción 5 | `accion5.com/feed/` | local | — | deportes y Liga; 5,2 visitas por nota, la más alta | n 15 · vistas 78 |
| Ahora Balcarce | `ahorabalcarce.com.ar/feed/` | local | — | todos los medios de Balcarce entran. **A vigilar**: 12 días sin notas | n 5 · vistas 21 |
| Municipalidad de Balcarce | `balcarce.gob.ar/feed/` | oficial | — | | n 76 · única 24 · vistas 113 |
| **Concejo Deliberante** (alta) | `concejodeliberantebalcarce.gob.ar/feed/` | oficial | — | anda: 10 notas, 8 nombran Balcarce, la última del 14/10 | sin historial (nuevo) |
| **Facultad de Ciencias Agrarias (UNMdP)** (alta) | `fca.mdp.edu.ar/feed/` | oficial | — | funciona en Balcarce, junto al INTA; publica poco (la última del 30/09) | sin historial (nuevo) |

Siguen **apagados**: Radio Sudestada (chimentos nacionales, decisión del 30/09; ver "Preguntas"). SIBOM y las instituciones sin sitio (hospital, bomberos, Cooperativa, autódromo, radios Líder y 105.1) quedan como **pendiente**: no tienen feed.

## De Tandil y Mar del Plata (10 medios, 10 feeds)

| Medio | Feed | Tipo | Grupo | Por qué entra | Dato medido |
|---|---|---|---|---|---|
| El Eco de Tandil | índice de noticias | regional | eleco.com.ar | el mejor de Tandil; la ruta 226 | n 156 · imp. 4 · de acá 6 · vistas 67 |
| El Diario de Tandil | índice de noticias | regional | — | el otro medio de Tandil. **Reactivado**: andaba desde la PC y no desde GitHub el 30/09 | n 0 (estaba apagado) · hoy 23 notas |
| 0223 | `0223.com.ar/rss` | regional | — | el medio de afuera que más nombra a Balcarce | n 69 · única 4 · imp. 5 · de acá 9 |
| QZ Noticias | índice de noticias | regional | eleco.com.ar | | n 84 · de acá 7 · vistas 32 |
| El Marplatense | índice de noticias | regional | eleco.com.ar | | n 102 · vistas 39 |
| Infobrisas | noticias (trae lo de sus 3 feeds) | regional | — | | n 70 · de acá 5 · imp. 2 |
| Mi8 (Canal 8) | índice de noticias | regional | — | TV de Mar del Plata | n 69 · vistas 45 |
| LU9 Mar del Plata | Atom | regional | eleco.com.ar | radio con entrevistas propias | n 37 · imp. 1 |
| Punto Noticias | índice de noticias | regional | — | | n 24 · imp. 1 |
| Qué Digital | `quedigital.com.ar/feed/` | regional | — | | n 13 · de acá 1 |

## Del país (50 medios, 66 feeds)

### Diarios, agencia, TV y radio (18)

| Medio | Feed(s) | Tipo | Grupo | Por qué entra | Dato medido |
|---|---|---|---|---|---|
| Infobae | general, política, economía, deportes, tecnología, cultura | nacional | — | el que más notas tiene; sus secciones no se repiten | n 311 · imp. 30 · vistas 111 |
| La Nación | general, política, economía, deportes, cultura | nacional | — | | n 260 · imp. 23 · vistas 93 |
| Clarín | lo último, política, economía, deportes, rural, tecnología, cultura | nacional | Grupo Clarín | el más imprescindible; 10 notas por feed y sin índice | n 208 · imp. 31 · vistas 62 |
| TN | índice de noticias | nacional | Grupo Clarín | el índice trae el 100 % de sus 9 feeds | n 244 · imp. 18 · vistas 119 |
| Perfil | general, política, economía, deportes, tecnología | nacional | — | | n 210 · imp. 8 · vistas 109 |
| Página/12 | política, economía, sociedad | nacional | — | otra mirada del mismo hecho | n 88 · vistas 25 |
| Ámbito | índice de noticias (nuevo) + tecnología + espectáculos | nacional | — | el índice trae el 85 % de sus 7 feeds | n 190 · imp. 15 · vistas 74 |
| El Cronista | índice de noticias | nacional | — | economía | n 114 · imp. 5 |
| C5N | índice de noticias (nuevo) | nacional | — | el índice trae el 87 % de sus 6 feeds | n 143 · vistas 63 |
| A24 | general, política | nacional | — | | n 116 · vistas 37 |
| Noticias Argentinas | índice de noticias | agencia | — | hechos sin tono | n 256 · imp. 18 · vistas 113 |
| Radio Mitre | general, deportes, sociedad | nacional | Grupo Clarín | | n 182 · imp. 10 · vistas 90 |
| Minuto Uno | índice de noticias (nuevo) | nacional | — | el índice trae el 100 % | n 165 · imp. 10 · vistas 63 |
| Crónica | últimas noticias | nacional | — | | n 173 · imp. 6 |
| El Destape | índice de noticias | nacional | — | otra mirada | n 141 · vistas 70 |
| Diario Popular | índice de noticias | nacional | — | | n 130 · vistas 58 |
| Canal 26 | general | nacional | — | | n 126 · imp. 6 · de acá 6 |
| iProfesional | general | nacional | — | economía y negocios | n 67 |

### Diarios de provincia y de otras provincias (8)

| Medio | Feed | Tipo | Grupo | Por qué entra | Dato medido |
|---|---|---|---|---|---|
| El Día (La Plata) | índice de noticias | provincial | — | | n 130 · imp. 4 · vistas 58 |
| La Nueva (Bahía Blanca) | últimas | provincial | — | el sudeste | n 128 · imp. 4 · vistas 65 |
| Agencia DIB | `dib.com.ar/rss/pages/home.xml` | agencia | — | agencia del interior bonaerense | n 88 · de acá 3 |
| 0221 (La Plata) | índice de noticias | provincial | — | | n 73 |
| La Capital (Rosario) **(nuevo feed)** | índice de noticias | otra provincia | — | Santa Fe; reemplaza al feed de Ovación | n 42 · imp. 3 (sólo deportes) |
| La Gaceta (Tucumán) **(alta)** | `lagaceta.com.ar/rss` | otra provincia | — | el norte del país | sin historial · anda, 71 notas |
| Los Andes (Mendoza) **(alta)** | índice de noticias | otra provincia | — | Cuyo | sin historial · anda, 349 notas |
| elDiarioAR **(alta)** | `eldiarioar.com/rss/` | nacional digital | — | otra mirada | sin historial · anda, 99 notas, 1 nombra Balcarce |

### Deportes y automovilismo (9)

| Medio | Feed | Tipo | Grupo | Por qué entra | Dato medido |
|---|---|---|---|---|---|
| Olé | índice de noticias | especializado | Grupo Clarín | el índice trae el 89 % de sus 13 feeds | n 111 · imp. 7 |
| TyC Sports | índice de 48 horas | especializado | — | | n 103 · imp. 8 · vistas 69 |
| Doble Amarilla | índice de noticias | especializado | — | | n 62 · imp. 3 |
| Bolavip Argentina | índice de noticias | especializado | — | | n 63 |
| El Gráfico | `elgrafico.com.ar/rss` | especializado | — | | n 33 |
| Campeones | `campeones.com.ar/feed/` | especializado | — | el que mejor cubre el autódromo | n 18 · única 9 · de acá 13 |
| Motorsport | F1 y MotoGP | especializado | — | F1 en castellano | n 5 · imp. 3 |
| Solotc | Turismo Carretera | especializado | — | | n 3 · de acá 1 |
| Córdoba Competición | `cordobacompeticion.com/feed/` | especializado | — | | n 4 · imp. 2 |

### Agro (6)

| Medio | Feed | Tipo | Grupo | Por qué entra | Dato medido |
|---|---|---|---|---|---|
| Agrositio | destacadas + hacienda | especializado | — | el más imprescindible del agro | n 15 · imp. 8 |
| Noticias Agropecuarias | `noticiasagropecuarias.com/feed/` | especializado | — | | n 12 · imp. 5 |
| Infocampo | `infocampo.com.ar/feed/` | especializado | — | | n 14 · imp. 2 |
| Agroempresario | índice de noticias | especializado | — | | n 21 · imp. 1 |
| INTA | `argentina.gob.ar/inta/noticias/rss` | organismo (sin marca oficial) | — | Balcarce tiene una de sus estaciones más grandes | n 3 · imp. 1 |
| Argenpapa | portada de Argentina | especializado | — | la papa, de Balcarce: las 4 notas fueron únicas y de acá | n 4 · única 4 |

El agro de los grandes entra por el feed rural de Clarín y por los feeds generales de La Nación y TN (sus feeds de campo repetían el 92 % al 100 %).

### Economía, tecnología, ciencia, salud y educación (5)

| Medio | Feed | Tipo | Grupo | Por qué entra | Dato medido |
|---|---|---|---|---|---|
| El Economista | `eleconomista.com.ar/feed/` | especializado | — | | n 27 · imp. 1 |
| iProUP | índice de noticias | especializado | — | tecnología y finanzas | n 14 · imp. 3 |
| Agencia CyTA | `agenciacyta.org.ar/feed/` | especializado | — | ciencia argentina (Instituto Leloir). **Sin notas publicadas** en seis semanas y la última del 7/10: es la única de ciencia | n 0 |
| Ministerio de Salud de la Nación **(alta)** | `argentina.gob.ar/salud/noticias/rss` | organismo (sin marca oficial) | — | salud; anda, 15 notas | sin historial |
| Ministerio de Capital Humano **(alta)** | `argentina.gob.ar/capital-humano/noticias/rss` | organismo (sin marca oficial) | — | educación y trabajo; anda, 8 notas | sin historial |

### Política y provincia, para completar los 50 (4)

La Brújula 24 (Bahía Blanca, n 61, de acá 4), La Verdad (Junín, n 88, vistas 41), Letra P (política, otra mirada, n 16) y La Tecla (La Plata, política bonaerense, n 51).

Cuenta: 18 + 8 + 9 + 6 + 5 + 4 = 50. La cuenta exacta y automática la hace `pruebas/fuentes-lista-elegida.test.mjs` (11 + 10 + 50 = 71 medios activos).

## Lo que se apagó

Sin borrar nada: cada entrada quedó con `activa: false` y la nota "apagada 15/10/2026: fuera de la lista elegida".

**Medios que dejan de leerse (42):**

| Medio | Motivo |
|---|---|
| Ecos Diarios (Necochea), NDEN (Necochea), Sendero Regional, 2261 Lobería, Ayacucho al Día, La Verdad de Ayacucho, El Argentino Digital, Municipio de General Alvarado, Municipalidad de San Cayetano | zona que no es Tandil ni Mar del Plata: queda afuera por la decisión de los dueños (Ecos Diarios tenía 70 notas y 3 imprescindibles; Sendero, 5 únicas) |
| Radio 10 Mar del Plata, Noticias y Protagonistas | entre los 10 de la zona quedaron los que más aportan (8 y 1 notas) |
| La Noticia 1, La Voz del Pueblo | provinciales del sistema eleco, fuera de las tres categorías |
| ANDigital, InfoRegión, Infoeme, La Opinión, Diario Conurbano, Zona Norte Diario, InfoGEI, Realpolitik, Diputados Bonaerenses, Gobierno de la Provincia | provinciales/conurbano fuera del top 50 (cero a 63 notas; Gobierno de la Provincia, cero) |
| ESPN Argentina, TNT Sports, Mundo Ascenso, La Página Millonaria, Vavel, Básquet Plus, Pick and Roll, UAR, CADA | deportes que repiten lo de Olé, TyC o Doble Amarilla (ESPN y TNT, cero notas en seis semanas) |
| Bichos de Campo, Todo Agro | agro: poco aporte (7 y 2 notas) |
| FayerWayer, Google, Google DeepMind, OpenAI, Microsoft, Nvidia, NASA, ESA | tecnología y ciencia internacional: **cero notas publicadas** en seis semanas; los dueños pidieron no leer lo de afuera salvo lo argentino |
| INCAA, Teatro Colón, Servicio Meteorológico Nacional (avisos) | cero o una nota |

**Feeds apagados dentro de medios que siguen** (entre otros): todos los feeds de sección de TN, El Destape, Olé, Canal 26, C5N, Minuto Uno, Cronista y Diario Popular (el índice los reemplaza); La Nación sociedad, rugby, tenis, automovilismo, campo, ciencia, fútbol y tecnología; "sociedad" de Infobae, Clarín y Perfil; el feed de Ovación de La Capital de Rosario; los segundos feeds de Atom de El Eco, QZ, El Marplatense, Mi8, LU9 y los de ciudad/policiales de Infobrisas.

**Quedan afuera y no se sumaron**: los 24 internacionales de ciencia (Nature, MIT, ScienceDaily, BBC Mundo, DW...), arXiv, los datos (BCRA, datos.gob.ar, API de WordPress), SIBOM y La Capital de Mar del Plata (su feed da 403).

## Qué efecto se espera

Simulación con las 1.329 notas ya publicadas que vinieron de medios (671 de afuera, 658 de acá), mirando qué habría pasado si sólo se hubieran leído los 71 medios de la lista. Es la misma que se usó en `ANALISIS.md`: cuántas notas de afuera habrían seguido llegando al mínimo de medios de su sección.

| | Notas de afuera que siguen llegando al mínimo actual | Con mínimo 2 | De acá con al menos un medio de la lista |
|---|---|---|---|
| Leyendo todos los medios de hoy | 599 de 671 (89 %) | 671 (100 %) | 658 de 658 |
| **La lista elegida** | **579 de 671 (86 %)** | 657 (98 %) | 649 de 658 (99 %) |
| La lista elegida, contando los grupos como un solo medio | **565 de 671 (84 %)** | 645 (96 %) | 649 |

- La ANALISIS daba 84 % para la opción Amplia (61 medios): esta lista (71 medios) queda en el mismo orden y mantiene el 99 % de lo de acá.
- Las 9 notas de acá que se pierden las contaban sólo Sendero Regional (5), La Noticia 1 (2), NDEN (1) y Realpolitik (1).
- Cada vuelta lee menos: de unos 11.300 elementos a unos 8.200 (suma de lo que traen los feeds, con repetidas). Los índices de noticias traen más cada uno (TN 821, La Nación feeds 86 a 96, Los Andes 349, Ámbito 368), pero no cuestan nada más: es lectura de texto.
- Qué cambia por **contar grupos**: Clarín, TN, Olé y Radio Mitre cuentan **una sola vez**; los siete del sistema eleco también. Es la regla nueva de `contarMedios` en `ingesta/ingesta.mjs`; se aplica al mínimo de medios, al puntaje y a "confirmada por dos medios". Cuesta 14 notas de afuera más (579 a 565 de 671) y es más prudente.

## Riesgos

1. **Mínimos de medios**: con menos medios, Fútbol (4) y Deportes (4) exigen más de lo que es fácil. Con el grupo Clarín contado una vez, una nota de fútbol necesita 4 grupos distintos, no 4 medios. No se tocaron los números (`ingesta/criterio.mjs`); si Fútbol y Deportes bajan mucho, ahí está la palanca, y es decisión de los dueños.
2. **Feeds que anda desde la PC y no desde GitHub Actions**: los índices nuevos (Ámbito, C5N, Minuto Uno, La Capital, Los Andes) y el de El Diario de Tandil se probaron desde la PC de Hernán. Lobería y Sendero respondían desde la PC y dejaron de responder desde GitHub el 30/09. **NO VERIFICADO desde Actions.**
3. **Índices de noticias**: no traen la sección ni el texto como los feeds por sección; la sección la deciden las palabras clave y la lectura con IA. Los feeds apagados con `seccion` fija (Tecnología, Economía) ya no ayudan a Tecnología: quedan los de Infobae, Clarín, Ámbito y Perfil.
4. **La zona queda flaca**: sin Necochea, Lobería ni Ayacucho. Una nota de la zona que sólo cuente Ecos Diarios o Sendero ya no entra (Ecos Diarios había sido imprescindible en 3 notas).
5. **Dos de los medios nuevos de otras provincias** (La Gaceta, Los Andes) traen noticias locales de su provincia; sólo pasan si las cuentan otros tres medios, pero pueden empujar volumen.
6. **Ministerios sin marca "oficial"** (Salud, Capital Humano, INTA): para que no salgan solos sin que los cuente otro medio. Si se quiere que salgan como comunicado, se les pone `oficial: true`.
7. **Ahora Balcarce** y **Radio Gabal · Agro** casi no publican (12 y 35 días); se dejaron porque son de Balcarce.
8. **Agencia CyTA** y los dos ministerios no tienen notas medidas.
9. **La Vanguardia nunca suma frescura** (su portada no trae la hora): sigue pendiente.

## Qué no se pudo verificar

- Que los índices y feeds nuevos anden desde GitHub Actions (todos se probaron desde la PC; respondieron con títulos y fechas): Ámbito, C5N, Minuto Uno, La Capital (Rosario), La Gaceta, Los Andes, elDiarioAR, Ministerio de Salud, Ministerio de Capital Humano, Concejo Deliberante, Facultad de Ciencias Agrarias y El Diario de Tandil.
- **La Voz del Interior** (Córdoba) se intentó y su sitio da un error de Cloudflare (1016); **Cadena 3** no tiene feed. Por eso no hay medios de Córdoba. **Infocielo** da 403.
- Que los grupos de dueño sean los que se creen: Clarín, TN, Olé y Radio Mitre son del Grupo Clarín (conocimiento público); el sistema eleco es por el servidor de los feeds, **no se sabe si comparten dueño o redacción**.
- "Primero en contar": la muestra es chica (120 notas).

## Qué mirar después de aplicarlo

1. Que la primera corrida de "Actualizar la web" termine y no pierda feeds: en el registro de la corrida, los índices nuevos tienen que traer notas.
2. **Volumen de lo publicado por día** durante una semana, por sección, contra las 6 semanas anteriores: sobre todo Fútbol, Deportes y Economía (más medios para llegar al mínimo) y Balcarce (no tiene que bajar).
3. **Notas de acá que se pierden**: correr `npm run auditar` y `medir-fuentes.mjs --sin-red` a la semana.
4. Que **Concejo Deliberante** y **El Diario de Tandil** den notas, y que **Ahora Balcarce** vuelva a publicar.
5. Avisar si un feed de Balcarce queda 24 horas sin notas (sigue pendiente en la vigilancia).
6. Cada mes, `node ingesta/medir-fuentes.mjs` y sacar lo que no aporta.

## Preguntas abiertas para Andrés y Hernán

- **Radio Sudestada**: quedó apagada (chimentos nacionales); ¿se la saca del todo del bloque Balcarce?
- **Necochea, Lobería y Ayacucho** quedaron fuera por la decisión; ¿se acepta perder lo vecino que sólo cuentan ellos?
- **Fútbol y Deportes pidiendo 4 medios**: ¿se baja a 3 ahora que los medios son menos y los grupos cuentan una vez? (Etapa 5.)
- **Educación y salud**: sólo hay dos ministerios nuevos; ¿hay medios o instituciones que quieran sumar?
- **SIBOM y las instituciones sin sitio** (hospital, bomberos, Cooperativa, autódromo, radios Líder y 105.1): ¿tienen página propia para leer?

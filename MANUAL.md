# Cómo funciona Radar Balcarce

*Actualizado el 27/09/2026.* Este archivo explica la parte técnica: el recorrido de una noticia, cómo se
puntúa y cómo está hecha la web. Es el documento para leer antes de tocar
`ingesta/fuentes.mjs`.

**El criterio editorial** (qué se publica, qué espera, qué no sale nunca y
cómo se escribe) **está en un solo lugar: [`CRITERIO-EDITORIAL.md`](CRITERIO-EDITORIAL.md)**.
Acá no se repite. Los otros documentos: `REGLAS.md` (lo que se exige siempre
y qué lo vigila), `REDES.md`, `INFRAESTRUCTURA.md`, `PENDIENTES.md` (qué
falta) e `INVESTIGACION.md` (lo legal, con fuentes). La lista completa está en
`CLAUDE.md`.

---

## 1. El recorrido de una noticia

```
218 feeds  →  cruce de medios  →  clasificar  →  puntuar  →  semáforo  →  lectura con IA  →  panel  →  web / redes
```

1. **Buscar.** Cada 30 minutos GitHub Actions lee, con la PC apagada, **214
   feeds activos** de 218: 54 de los 58 de `ingesta/fuentes.mjs` (los medios de
   Balcarce, la región, la provincia y las secciones de los diarios nacionales;
   4 apagados) y los 160 de `ingesta/fuentes-cruce.mjs` (71 medios: nacionales,
   provincia, Mar del Plata, la zona y especializados en fútbol, deportes,
   automovilismo, campo y ciencia; muchos con su índice de noticias, que trae
   todo el día); el panel, mientras está prendido, también busca cada 10. La mayoría tiene RSS; El Diario Balcarce
   no, así que se raspa la portada y después se entra a cada nota para sacar
   la bajada y la hora de publicación de sus metadatos; lo que tiene más de 72
   horas no se trae (27/09: su portada muestra también notas viejas, sin fecha,
   que salían como de hoy). La lista entera, con
   ciudad, peso y cómo se usa cada una, es `FUENTES.md` (la escribe
   `node ingesta/listar-fuentes.mjs`; después de tocar una fuente, correrlo).
   **De afuera queda sólo lo que tiene respaldo** (desde el 27/09, paso 2): lo
   que dice Balcarce **en el título** (`PALABRAS_LOCALES`; nombrarla en el texto
   no alcanza), lo que toca la zona sin nombrarla (la ruta 226, la 55, el
   sudeste o el cultivo de papa: `PALABRAS_ZONA`, en `ingesta/fuentes.mjs`) y lo
   que cuentan **dos medios distintos o más** (para salir sola, además, los que
   pide su sección: paso 5). Las fuentes de afuera pesan poco
   para no ganarle a lo local, y lo de afuera que es de Balcarce va a la sección
   Balcarce.
   **El filtro de la entrada (27/09, plan V2.2).** Antes de todo eso, de los
   medios de afuera no se trae lo que el propio medio pone en una sección de
   otro país, de policiales o de consejos genéricos (`SECCIONES_QUE_NO_ENTRAN`),
   y eso no entra ni al cruce. (Desde el 27/09 no hay fuentes "de señal" ni un
   máximo de notas por fuente: `uso` y `maxItems` se sacaron.) Ver `CRITERIO-EDITORIAL.md` § 2 y `docs/PLAN-V2.2.md`.
   **Secciones flacas (26/09).** Hernán y Andrés piden tres notas por sección
   en la portada. Por eso hay 13 fuentes más, todas de afuera y con la sección
   fija (el feed ya viene separado por tema), peso 11 a 14:
   Cultura y agenda (Infobae Teleshow y Cultura, Ámbito y Minuto Uno — desde el
   27/09 Teleshow y Minuto Uno Espectáculos están apagados, por chimentos, y
   también Hipertextual y Xataka, por ser de España —
   Espectáculos, La Nación Cultura: lo que más se lee en los diarios
   nacionales),
   Tecnología (La Nación Tecnología, Hipertextual, Xataka), Agro (Clarín Rural,
   Infocampo, Bichos de Campo, INTA) y Economía (Perfil). Los medios que pide
   y el cupo de cada sección (`ingesta/criterio.mjs`) frenan lo de afuera, y el semáforo
   sigue mandando. Policiales es sólo de Balcarce y la zona: lo que se clasifica
   como policial y no viene de un medio de acá ni dice Balcarce en el título no
   se trae (CRITERIO-EDITORIAL.md § 2).
   Además, la IA reescribe primero las notas de la sección que menos notas
   escritas tiene (`ordenarParaReescribir`, `reels/reescritura.mjs`), sin gastar
   más pedidos.
2. **Cruzar** (`ingesta/cruce.mjs`, desde el 27/09). Si dos medios cuentan lo
   mismo, es UNA historia con dos fuentes, no dos notas. Se comparan el título y
   el resumen de todas las notas (palabras en común, pesando más las raras:
   TF-IDF, umbral 0,42), sumando las notas de afuera de las últimas 36 horas (la
   memoria, en la caché de GitHub Actions, fuera del repositorio). La misma nota
   de un medio que llega por dos feeds suyos cuenta una vez. Lo de afuera que
   cuenta un solo medio y no dice Balcarce en el título ni toca la zona **no se
   trae**. La principal de cada historia es la ya publicada (o la primera que
   salió): así la dirección no cambia cuando otro medio se suma. Un medio de
   Balcarce que cuenta lo mismo que los de afuera sin nombrar nada de acá está
   copiando: la historia es de afuera y la principal, de un medio de afuera
   (27/09, `historiaDeAca`). Que varios
   medios la cuenten es lo que dice que importa: suma puntos y decide si sale
   sola (paso 5). Lo que cuentan **sólo** medios de otras ciudades de la zona
   (Mar del Plata, Tandil, Necochea…) y no dice Balcarce en el título ni toca la
   zona tampoco se trae. Cada medio tiene un solo nombre para todos sus feeds
   (TN, con Campo, Tecno y Clima, es uno): si no, contaría dos veces. Ya no
   entran "las 3 a 5 más nuevas" de cada fuente (`maxItems` se sacó).
3. **Clasificar** (`clasificar`, `ingesta/ingesta.mjs`). Automovilismo gana
   siempre (en Balcarce es sección propia). Después, si la fuente ya viene
   separada por sección, se le cree, salvo en Tecnología, que se confirma con el
   título (`PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO`). Y si no, por palabras clave
   (`REGLAS_SECCION`): gana la coincidencia más larga y, si empatan, el orden de
   las reglas. Las palabras cortas o ambiguas (`PALABRAS_DEBILES`) sólo deciden
   desde el titular. Si nada coincide: Balcarce si es de acá; si no, Argentina
   (Región y Provincia no existen desde el 27/09). Una nota de Deportes que es
   de fútbol pasa a **Fútbol** (27/09). No hay sección Servicios: lo práctico de
   acá va a Balcarce.
4. **Puntuar.** Un número de 0 a 100 (abajo, sección 2).
5. **Semáforo.** Verde / amarillo / rojo (sección 3). Lo de afuera que cuentan
   menos medios distintos de los que pide su sección (`MEDIOS_DE_AFUERA`:
   Fútbol y Deportes 4; Economía, Tecnología, Agro y Automovilismo 2; el resto
   3; con una figura argentina 2) queda amarillo, y después van los cupos
   (`exigirMedios`, `aplicarCupos`; una fuente oficial alcanza sola; lo que toca
   la zona no pide medios desde el 27/09). Las listas de sepelios quedan en rojo
   por el título (`REGLAS_SEMAFORO.nunca`, 27/09). En la
   nube, después, la **lectura con IA** (`ingesta/lectura-ia.mjs`, fichas en
   `web/data/fichas.json`) decide qué entra, la sección y qué es de Balcarce,
   saca publicidad, chimentos y lo del extranjero sin un argentino, y junta las
   repetidas que el cruce no unió (`agruparRepetidas`; queda la ya publicada).
   Después se vuelven a mirar los medios, en los dos
   sentidos (una nota que al juntarse con sus repetidas llega a los que pide,
   sale), y los cupos. Nunca destraba el semáforo.
6. **Decidir.** En el panel (localhost:4321, `PANEL.md`). Lo verde sale solo; lo
   amarillo espera; lo rojo está bloqueado.
7. **Publicar.** `npm run datos` arma `web/data/portada.json` y la web lo lee.
   Ahí se sacan las retiradas a mano (`web/data/retiradas.json`), mandan las
   correcciones a mano de título, bajada, sección o cuerpo
   (`web/data/correcciones.json`; un cuerpo escrito ahí cuenta como cuerpo), se
   vuelve a mirar lo que no se publica nunca (las listas de sepelios) en el
   título y la bajada finales, y los títulos automáticos pierden el "en Balcarce" del final
   (`web/lib/titulos.js`).
   Los reels y las historias salen del mismo material.

## 2. El puntaje

Arranca en el **peso de la fuente** (de 7 a 30: los medios locales pesan más
que los nacionales y los de afuera pesan poco) y suma:

| Qué | Cuánto |
|---|---|
| Es de Balcarce | +25 |
| Salió hace menos de 3 h | +25 |
| Entre 3 y 12 h | +15 |
| Entre 12 y 24 h | +8 |
| Un medio nacional la nombra a Balcarce | +22 |
| Nombra a una figura argentina (`FIGURAS`) | +16 |
| Cada medio extra que la cuenta | +10 (tope: +40) |
| Es de Automovilismo | +8 |
| Tiene foto en la fuente | +6 |
| Trae texto completo | +4 |

Techo: 100. **Sin hora real no se premia la frescura**: si la fuente no
publicó cuándo salió, se la trata como de hace 24 h. No puede competir con
una que sí tiene hora.

Para qué sirve el número:

- **Ordena la portada**, junto con la fecha.
- **Decide qué nota de afuera entra en el cupo** de su sección (si sale sola
  lo decide cuántos medios la cuentan, no el puntaje) y **qué
  se cuenta en las redes** (la relevancia mínima de Facebook y de los
  podcasts). Esos umbrales son criterio editorial: están en la tabla "Los
  números" de `CRITERIO-EDITORIAL.md` y en `ingesta/criterio.mjs`.

## 3. El semáforo, lo que no se publica y cómo se escribe

Es criterio editorial y está en [`CRITERIO-EDITORIAL.md`](CRITERIO-EDITORIAL.md):
el semáforo (sección 3), lo que no entra nunca (sección 2), cómo se escribe
una nota (sección 4), cómo se verifica (sección 6) y qué ve el lector
(sección 7). Lo técnico:

- Las listas del semáforo están en `REGLAS_SEMAFORO` (`ingesta/fuentes.mjs`),
  cada término con su prueba en `pruebas/semaforo.test.mjs`.
- El semáforo corre en la ingesta (`semaforo` y `semaforoDelTexto` en
  `ingesta/ingesta.mjs`) y otra vez sobre lo que escribe la IA
  (`semaforoDeLaReescritura` en `reels/reescritura.mjs`).
- **Archivada.** A las 72 horas, lo que quedó sin decidir se archiva solo
  (menos las notas sin fecha real). Está en la pestaña Archivadas del panel,
  no se pierde, pero deja de tapar la cola. Eso lo hace el panel; aparte, la
  portada de la web muestra sólo lo de las últimas 72 horas aunque la PC esté
  apagada (`web/lib/archivo.js`). Tampoco completa una sección con nada más
  viejo del archivo (`HORAS_PARA_COMPLETAR`, `web/lib/datos.js`, 27/09).

## 4. El diseño de la web

Criterio: portal de noticias, no diario solemne. Fondo blanco, Source Serif 4 en
los títulos, color por sección, y movimiento sólo en las dos piezas que se
miran todos los días.

- **Reglas de la portada** (`REGLAS.md`): sin la fuente arriba de los títulos,
  sin "la vimos hace…", con las notas de la más nueva a la más vieja (la nota
  grande de arriba es la de más puntaje y de Balcarce) y la farmacia sin hora
  de cierre. Hay pruebas y el vigilante las mira en la web publicada.
- **Chapa negra de arriba**: fecha, clima y farmacia de turno, en *todas* las
  páginas. Son las dos cosas que la gente viene a buscar sin querer leer nada.
- **Navegación por secciones reales**, cada una con su página
  (`/seccion/deportes`). El menú lleva las once (`EN_NAVEGACION`, `web/lib/datos.js`)
  y sólo aparecen las que hoy
  tienen notas: una pestaña
  que lleva a una página vacía es peor que no tenerla.
- **Agenda y Balcarce Útil** van a la derecha y en verde: son servicios, no
  secciones. Agenda es su propia página (`/agenda`), no un ancla — antes,
  desde una nota, el botón te devolvía a la portada.
- **Tarjeta del clima**: dibujo propio en SVG que cambia según el pronóstico
  (sol que gira, nube que flota, gotas que caen), con los cuatro días
  siguientes. Quien pidió menos movimiento en su sistema operativo no ve nada
  de eso (`prefers-reduced-motion`).
- **Farmacia de turno**: nombre, dirección, teléfono y "Cómo llegar" a Google
  Maps.
- **La placa de sección** reemplaza a la foto: nunca la foto de otro medio
  (`CRITERIO-EDITORIAL.md`, sección 2).

El lienzo de diseño (portada de escritorio, de celular y la tarjeta del clima)
está publicado como artefacto; si se cambia el aspecto, se cambia en los dos
lados para que no se separen.

## 5. Las pruebas

Se corren con `npm test` desde la carpeta del proyecto. Son más de 1.200, tardan
unos segundos, no instalan nada y no salen a internet.

**Cada una es un error que ya pasó de verdad**, no un ejercicio: dos
farmacias de turno mostradas como una sola, un sol dibujado un domingo
nublado, el encabezado del mes pegado al nombre de la última farmacia, los
enlaces de El Diario apuntando a `undefined/…`. Están en `pruebas/` y cada
una explica arriba qué error cuida.

También corren solas en GitHub Actions **antes** de publicar. Si algo se
rompió, la web se queda como está: es preferible una portada de hace media
hora a una con los datos mal armados.

Al agregar una regla nueva —una palabra en `REGLAS_SECCION`, una farmacia en
`FARMACIAS_A_MANO`— no hace falta escribir una prueba. Cuando se arregla algo
que estuvo mal publicado, sí: es la única forma de que no vuelva.

## 6. Las redes

Qué se publica en Facebook e Instagram, a qué hora y con qué reglas está en
[`REDES.md`](REDES.md).

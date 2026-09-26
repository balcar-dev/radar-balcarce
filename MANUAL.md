# Cómo funciona Radar Balcarce

Este archivo explica la parte técnica: el recorrido de una noticia, cómo se
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
61 fuentes  →  agrupar  →  clasificar  →  puntuar  →  semáforo  →  panel  →  web / reels
```

1. **Buscar.** Cada 30 minutos GitHub Actions lee las 61 fuentes (locales,
   regionales y nacionales; la lista está en `ingesta/fuentes.mjs`), con la PC
   apagada; el panel, mientras está prendido, también busca cada 10. La mayoría tiene RSS; El Diario Balcarce
   no, así que se raspa la portada y después se entra a cada nota para sacar
   la bajada y la hora de publicación de sus metadatos.
   **De afuera entra poco y a propósito.** Desde el 25/09 hay doce fuentes de
   la región y la provincia (0223, LU9, QZ, El Eco de Tandil, Ecos Diarios,
   Lobería, Ayacucho, la Agencia DIB, La Noticia 1, Diputados bonaerenses, el
   Gobierno de la Provincia y Argenpapa). De casi todas entra sólo lo que
   nombra a Balcarce (`PALABRAS_LOCALES`), a una figura (`FIGURAS`) o toca la
   zona sin nombrarla: la ruta 226, la 55, el sudeste o el cultivo de papa
   (`PALABRAS_ZONA`, en `ingesta/fuentes.mjs`). Pesan poco para no ganarle a lo
   local, y lo de afuera que nombra a Balcarce va a la sección Balcarce.
   **Secciones flacas (26/09).** Hernán y Andrés piden tres notas por sección
   en la portada. Por eso hay 16 fuentes más, todas de afuera y con la sección
   fija (el feed ya viene separado por tema), peso 11 a 14 y `maxItems` de 2 o 3:
   Cultura y agenda (Infobae Teleshow y Cultura, Ámbito y Minuto Uno
   Espectáculos, La Nación Cultura: lo que más se lee en los diarios
   nacionales), Policiales (La Nación Seguridad, TN e Infobae Policiales),
   Tecnología (La Nación Tecnología, Hipertextual, Xataka), Agro (Clarín Rural,
   Infocampo, Bichos de Campo, INTA) y Economía (Perfil). El piso y el cupo
   de cada sección (`ingesta/criterio.mjs`) frenan lo de afuera, y el semáforo
   sigue mandando. Policiales es la que menos rinde: casi todo lo que traen
   esos diarios es un crimen o una causa con acusados, y espera a una persona.
   Además, la IA reescribe primero las notas de la sección que menos notas
   escritas tiene (`ordenarParaReescribir`, `reels/reescritura.mjs`), sin gastar
   más pedidos.
2. **Agrupar.** Si dos medios cuentan lo mismo, es UNA historia con dos
   fuentes, no dos notas. Se comparan los títulos por similitud (Jaccard,
   umbral 0,55). Que varios medios la tengan es señal de que importa, y suma
   puntos.
3. **Clasificar.** Por palabras clave, en este orden: Automovilismo, Deportes,
   Cultura, Agro, Política, Servicios, Tecnología. El orden importa: una nota
   de un piloto local es Automovilismo, no Deportes.
4. **Puntuar.** Un número de 0 a 100 (abajo, sección 2).
5. **Semáforo.** Verde / amarillo / rojo (sección 3).
6. **Decidir.** En el panel (localhost:4321, `PANEL.md`). Lo verde sale solo; lo
   amarillo espera; lo rojo está bloqueado.
7. **Publicar.** `npm run datos` arma `web/data/portada.json` y la web lo lee.
   Los reels y las historias salen del mismo material.

## 2. El puntaje

Arranca en el **peso de la fuente** (del 15 al 30: los medios locales pesan
más que los nacionales) y suma:

| Qué | Cuánto |
|---|---|
| Es de Balcarce | +25 |
| Salió hace menos de 3 h | +25 |
| Entre 3 y 12 h | +15 |
| Entre 12 y 24 h | +8 |
| Un medio nacional la nombra a Balcarce | +22 |
| Cada medio extra que la cuenta | +10 |
| Es de Automovilismo | +8 |
| Es de Servicios | +6 |
| Tiene foto en la fuente | +6 |
| Trae texto completo | +4 |

Techo: 100. **Sin hora real no se premia la frescura**: si la fuente no
publicó cuándo salió, se la trata como de hace 24 h. No puede competir con
una que sí tiene hora.

Para qué sirve el número:

- **Ordena la portada**, junto con la fecha.
- **Decide si lo de afuera sale solo** (el piso y el cupo por sección) y **qué
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
  apagada (`web/lib/archivo.js`).

## 4. El diseño de la web

Criterio: portal de noticias, no diario solemne. Fondo blanco, Fraunces en
los títulos, color por sección, y movimiento sólo en las dos piezas que se
miran todos los días.

- **Reglas de la portada** (`REGLAS.md`): sin la fuente arriba de los títulos,
  sin "la vimos hace…", con las notas de la más nueva a la más vieja (la nota
  grande de arriba es la de más puntaje y de Balcarce) y la farmacia sin hora
  de cierre. Hay pruebas y el vigilante las mira en la web publicada.
- **Chapa negra de arriba**: fecha, clima y farmacia de turno, en *todas* las
  páginas. Son las dos cosas que la gente viene a buscar sin querer leer nada.
- **Navegación por secciones reales**, cada una con su página
  (`/seccion/deportes`). Sólo aparecen las que hoy tienen notas: una pestaña
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

Se corren con `npm test` desde la carpeta del proyecto. Son más de 700, tardan
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

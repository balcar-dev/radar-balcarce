# 06 · La web: cómo se arma el sitio

*Escrito el 28/09/2026, leyendo el código de ese día. Si este documento y el
código no coinciden, manda el código.*

Este documento cuenta el último tramo del camino de una nota: desde que el
motor ya sabe qué notas hay y qué se decidió sobre cada una, hasta que el
lector la ve en `radarbalcarce.com`. Qué noticias entran y de dónde es
`docs/02-INGESTA.md`; cómo se decide qué sale sola y qué espera,
`docs/03-SELECCION.md`; cómo escribe la IA el título, la bajada y el cuerpo,
`docs/04-REDACCION.md`; el banco de fotos, `docs/05-FOTOS.md`; las redes,
`docs/07-REDES.md`; los workflows, los secretos y Cloudflare por dentro,
`docs/08-INFRAESTRUCTURA.md`; el panel de la PC, `docs/09-PANEL.md`.

---

## En una frase

Cada media hora GitHub corre `web/scripts/generar-datos.mjs`, que junta las
noticias, lo que decidieron las personas y lo que escribió la IA, y deja todo
escrito en archivos JSON dentro de `web/data/`; después Next.js convierte esos
archivos en un sitio de **puras páginas HTML fijas** (no hay ningún servidor
pensando cuando alguien entra) y Cloudflare Pages las sirve.

---

## El recorrido, paso a paso

La web tiene cuatro momentos: **armar los datos**, **compilar**, **guardar y
publicar**, y lo poco que pasa **en el navegador** del lector.

### A. Armar los datos: `web/scripts/generar-datos.mjs`

Es el programa central de la web (768 líneas). Se corre con
`cd web && npm run datos` (que es `node scripts/generar-datos.mjs`). Lo hace
solo el workflow "Actualizar la web" (`.github/workflows/actualizar.yml`) cada
30 minutos.

**0. ¿Dónde estoy corriendo?** Lo primero que mira es si existe
`panel/datos/ultima.json`. Si no existe (el caso de GitHub, donde no hay panel)
está **en la nube** (`enLaNube = true`). Si existe (la PC de Hernán, con el
panel), está **en la PC**. Casi todo lo que sigue es igual en los dos lados;
las diferencias están marcadas con *(sólo en la nube)*.

**1. Lee las noticias y las decisiones.**
- *En la nube:* corre la ingesta en ese momento (`ingestar` de
  `ingesta/ingesta.mjs`), pasándole los identificadores de las notas que ya
  se publicaron (`idsConocidos`, sacados de `portada.json` y `archivo.json`)
  para que una nota no cambie de dirección cuando otro medio se suma a la
  misma historia. Trae también la agenda del municipio (`agendaCompleta`,
  `ingesta/agenda.mjs`). Las decisiones de las personas las lee de
  `web/data/decisiones.json`, que sube el panel. Por cada fuente caída o
  vacía deja un aviso amarillo arriba de la corrida (`::warning::`), porque
  una fuente que se vacía no da error: sólo trae menos.
- *En la PC:* no busca nada. Lee lo que ya buscó el panel:
  `panel/datos/ultima.json` (las notas), `panel/datos/estado.json` (las
  decisiones) y `panel/datos/agenda.json`.

**2. Anota la primera vez que vio cada nota** (`web/data/vistas.json`). Un
feed que no publica la hora hace que la ingesta le ponga "ahora" en cada
corrida; sin esta memoria, una nota vieja salía como recién publicada. Se
guardan 7 días (`DIAS_DE_VISTAS = 7`), un identificador por renglón. De acá y
de la portada y el archivo anteriores sale `fechaReal(n)`, **la fecha única de
cada nota** (28/09):
- si la fuente no dio hora, la primera vez que la vimos;
- si la dio, la más vieja que se conoce entre la de la ingesta, la de cada
  una de sus fuentes, la que ya publicamos y la primera vez que la vimos
  (`fechaDeLaNota`, `web/lib/archivo.js`). Una nota puede envejecer, nunca
  rejuvenecer: un medio que "actualiza" su nota no la devuelve a la tapa.

Esa fecha es la que se muestra, la que ordena y la que decide si la nota
llega tarde.

**3. La lectura con IA** *(sólo en la nube)*. Llama a `leerNotasNuevas` y
`aplicarFichas` (`ingesta/lectura-ia.mjs`): la IA lee cada nota nueva, saca lo
que no es para Radar, corrige la sección y dice qué es de Balcarce. Desde el
28/09 a la tarde, una nota de un medio de acá que no nombra nada de Balcarce
ni de la zona (`mencionaAca`) **espera a que la IA la lea** antes de salir,
siempre que la lectura esté andando y la nota nunca haya salido
(`esperarSinFicha`, `yaPublicadas`; pasó con un referéndum de Suiza que
copió una radio de acá). Después
junta las repetidas (`agruparRepetidas`, `quitarRepetidas`, quedándose con la
ya publicada) y vuelve a aplicar los medios que pide lo de afuera
(`exigirMedios`) y los cupos (`aplicarCupos`). Guarda las fichas en
`web/data/fichas.json`. Si algo falla, sigue "como siempre", sin la IA. El
detalle es de `docs/03-SELECCION.md`.

**4. La reescritura con IA** *(sólo en la nube)*. `reescribirAutomaticas`
(`reels/reescritura.mjs`) escribe título, bajada y cuerpo de lo que va a
salir solo. No se le pide nada a Gemini de una nota que:
- ya tiene el cuerpo escrito a mano en `web/data/correcciones.json`;
- ya no se va a ver (más vieja que `HORAS_EN_PORTADA`);
- nunca salió y el hecho tiene más de `HORAS_PARA_ESTRENAR` horas
  (`llegaTarde`).

Lo ya reescrito en corridas anteriores (`previasDeLaPortada`, de la portada y
del archivo) se reusa sin gastar. Cuántas veces se pidió cada nota queda en
`web/data/intentos-ia.json` (tope de tres, podado a 7 días). En la PC no se
reescribe nada: es el único lugar que lo hace (el panel dejó de hacerlo el
28/09). El detalle, en `docs/04-REDACCION.md`.

**5. Decide qué nota se publica: `notaPublicada(n)`.** Es el corazón. Para
cada nota de la ingesta, en este orden:
1. Si está en `web/data/retiradas.json`, **no sale** (y pierde la página).
2. ¿Quién decide? Si una **persona** decidió (`decisionHumana`: la decisión
   tiene `por` y no es `'ia'`), manda la persona. Si no, manda el semáforo:
   verde = `automatica`, rojo = `bloqueada`, el resto = `pendiente`. Sólo
   `publicada` o `automatica` siguen.
3. Calcula `fechaReal(n)`. Si la nota **nunca salió**, no la decidió una
   persona y el hecho tiene más de 12 horas (`HORAS_PARA_ESTRENAR`), **no se
   estrena**: llega tarde.
4. Elige el texto: el de la persona si decidió una; si no, el que escribió
   la IA desde el panel **sólo si tiene cuerpo**; si no, el que se escribió
   en esta corrida en la nube; si no hay nada, el resumen de la fuente.
5. Si ni la IA ni una persona armaron la lista de fuentes, la arma con los
   enlaces reales de cada medio que contó la historia
   (`fuentesConsultadasDeOrigenes`).
6. Arregla el título automático sin inventar nada (`tituloAutomatico`,
   `web/lib/titulos.js`: saca "en Balcarce" del final, una etiqueta conocida
   adelante como "Rugby:" y una coma o un conector colgando). Lo que escribió
   una persona no se toca.
7. Le fija la dirección (`fijarSlug`, ver "La dirección fija" más abajo).
8. Aplica la corrección a mano si la hay (`conCorreccion`, de
   `web/data/correcciones.json`): título, bajada, sección o cuerpo.
9. Si el título o la bajada **finales** dicen algo de lo que nunca se
   publica (hoy, las listas de sepelios, `REGLAS_SEMAFORO.nunca`), **no sale**
   (`nuncaSePublica`), **aunque la haya aprobado una persona** (28/09).
10. **Sin cuerpo no se publica:** si no la decidió una persona y no tiene
    cuerpo de verdad (`tieneCuerpo`, `web/lib/cuerpo.js`: 70 palabras o más,
    `PALABRAS_MINIMAS_CUERPO`, y que no repita la bajada), **no sale** y,
    si todavía está dentro de las 36 horas, se anota en la lista de
    "esperando cuerpo".

La nota que pasa lleva: título, bajada, cuerpo, guion, sección, medios,
enlace, `fecha`, `sinFecha`, `visto`, relevancia, `local`, quién la publicó y
cuándo, temas, `como` (automática o publicada) y las partes internas de la IA
(claves, qué se sabe, fuentes consultadas, nivel de verificación; se guardan
pero el lector no las ve). **La foto de la fuente nunca se copia**: sólo se
guarda `teniaImagenLaFuente`.

**6. Las fotos.** *(Sólo en la nube)* `elegirFotosNuevas`
(`web/scripts/fotos-notas.mjs`) prueba una foto para hasta 10 notas nuevas por
corrida (`TOPE_POR_CORRIDA = 10`), guarda lo probado en
`web/data/banco-fotos.json` y los archivos en `web/public/fotos-notas/` (105 al
28/09 a la noche). *(En los dos lados)* `conFotosDelBanco` le pone `n.foto`
(archivo y crédito) a cada nota que ya tiene foto en el banco. Si elegir falla,
quedan las del banco. Todo el detalle, en `docs/05-FOTOS.md`.

**7. Mira lo ya archivado contra lo de hoy.** Recorre `archivo.json` y arma la
lista de `retiradas` (lo que pierde la página):
- lo de `retiradas.json`;
- lo que la lectura con IA sacó en esta corrida;
- las repetidas que la IA descartó, **salvo** que hayan salido en redes (su
  enlace circula);
- lo que una persona bloqueó o descartó después;
- lo que el semáforo hoy pone en rojo, o en amarillo por lo que dice
  (`pierdeLaPagina`, `web/lib/archivo.js`). Conservan la página, aunque salgan
  de las listas, la cotización del dólar y lo de afuera que hoy espera sólo
  por el cupo o por los medios que la cuentan (`esperaSoloPorCantidad`, 28/09:
  antes una nota ya compartida que rebotaba una corrida en el cupo perdía la
  página para siempre);
- las listas de sepelios, aunque las haya aprobado una persona (28/09).

Si una persona corrigió una nota que la ingesta ya no trae, la corrección
llega igual a su página.

**8. Las notas propias.** *(En la nube)* si toca (`cuandoArmarDolar`: día
hábil, de 11 a 18, y todavía no está la de hoy), pide la cotización a
DolarApi (`traerDolar`, `web/lib/dolar.js`) y la guarda en
`web/data/dolar-historia.json`. *(En los dos lados)* arma la nota del dólar de
los días en que se movió (`notasDelDolar`) y la de cada podcast que figura en
el libro de redes (`notasDeRepasos`). Un repaso que ya no se puede armar (una
de sus notas se retiró) también se retira. Las propias pasan por la misma
regla de cuerpo. Detalle en "Las notas propias", más abajo.

**9. Lo que se muestra.** Junta lo de la ingesta con lo propio, ordena de la
más nueva a la más vieja y se queda con lo de las últimas 36 horas
(`vigenteEnPortada`, `HORAS_EN_PORTADA = 36`). Saca los titulares repetidos o
casi iguales (`sinNotasRepetidas`, `web/lib/texto.js`): queda la de más
relevancia, y la otra conserva su página.

**10. El archivo.** `actualizarArchivo` (`web/lib/archivo.js`) arma el nuevo
`archivo.json`. Antes pasa lo viejo por los mismos arreglos: la sección
Servicios pasa a Balcarce (si era local) o a Argentina, País pasa a Argentina,
y el título automático se arregla con `tituloAutomatico`. Ver "El archivo de
180 días".

**11. La agenda.** `actualizarAgenda` (`web/lib/eventos.js`) arma
`web/data/agenda.json` con los eventos del municipio y los que se publicaron
desde el panel (`web/data/eventos-panel.json`). Si la API del municipio no
contestó, lo suyo queda como estaba. En la PC nunca se da un evento por
retirado (`retirar: enLaNube`).

**12. Los servicios.** La farmacia de turno de **ahora** (`diaDeTurno`,
`ingesta/utiles.mjs`: el turno cambia a las 8:30) y los próximos 6 turnos; el
clima con sus avisos (`avisosDelClima`, `ingesta/alertas.mjs`: se calculan
acá para que el aviso ya venga en el HTML; `UMBRALES`: helada con mínima de 0°
o menos y fuerte con −2°, viento de 60 km/h, lluvia de 25 mm o con 85 % de
probabilidad, más los códigos de granizo y tormenta fuerte de Open-Meteo; si
Open-Meteo falla, el clima sale de `api.met.no`, que no da sensación térmica,
y no se inventa); los teléfonos útiles
(`NUMEROS`); las fiestas anuales sin fecha confirmada.

**13. Lo que espera a una persona.** `pendientesDeLaIngesta`
(`redes/avisos.mjs`) deja en `portada.json` lo mínimo de las notas amarillas
sin decidir, para que el vigilante avise por WhatsApp. Como `portada.json` es
público, nunca va una roja y el titular se tapa en Policiales o si habla de
chicos o víctimas. También deja el número de notas esperando cuerpo.

**14. La estadística del día.** `cuentaDelDia` y `anotarDia`
(`ingesta/estadistica-diaria.mjs`) reescriben el día de hoy en
`web/data/notas-por-dia.json` (400 días, `DIAS_GUARDADOS`). El WhatsApp de las
21 la manda.

**15. Escribe, pero sólo si cambió algo que importa.** `esperando-cuerpo.json`
se escribe si cambió la lista. `portada.json` se escribe sólo si
`cambioQueImporta` dice que sí: cambió cualquier cosa que no sea la hora de
generación ni el clima; o el cielo o si es de día; o la temperatura se movió
**2 grados o más**; o cambió el pronóstico de los próximos días. Si no, deja
el archivo como estaba ("sin novedades"), para no disparar un commit y una
compilación entera por un grado. Todos los demás archivos también se
escriben sólo si cambiaron (o si faltan).

### B. Compilar: `npm run build`

`web/package.json` define `build` como tres pasos seguidos:

1. **`npm run dolar`** (`web/scripts/foto-dolar.mjs`): pide la cotización a
   DolarApi (y a Bluelytics si falla) y la guarda en `web/data/dolar.json`.
   Es la "foto" que se ve en `/dolar` y en la portada mientras el navegador
   consulta la de ese momento. Nunca frena la compilación y **no se
   versiona** (está en `.gitignore`).
2. **`npm run redirects`** (`web/scripts/generar-redirects.mjs`): escribe
   `web/public/_redirects`, que Cloudflare lee. Van primero las secciones que
   ya no existen (`SECCIONES_VIEJAS`: `/seccion/servicios` → Balcarce,
   `/seccion/pais` → Argentina) y después `/nota/ID` → `/nota/titular-ID` de
   las notas más nuevas, hasta 1.900 (`MAXIMO_REDIRECCIONES`; Cloudflare
   acepta 2.000). Tampoco se versiona.
3. **`next build`**: con `output: 'export'` (`web/next.config.mjs`) Next.js
   genera **todas** las páginas como archivos en `web/out/`, leyendo
   `web/data/` a través de `web/lib/datos.js`. Las imágenes para compartir se
   dibujan acá también, una por nota (`web/lib/tarjeta.js`).

**`npm run build` no regenera los datos.** Compila con lo que ya hay en
`web/data/`. Por eso `npm run dev` es `npm run datos && next dev`.

### C. Revisar y guardar: el resto de "Actualizar la web"

Dentro de `actualizar.yml`, en orden (el detalle de cada paso, en
`docs/08-INFRAESTRUCTURA.md`):

1. Baja la última versión de `main` (no la del momento en que se disparó).
2. Instala lo de la raíz y lo de `web/`.
3. **`npm test`**: si una prueba falla, la corrida se corta **antes** de
   buscar noticias y la web queda como estaba (`docs/10-REGLAS-Y-PRUEBAS.md`).
4. Recupera la memoria del cruce de medios (`.cache/`, caché de Actions).
5. `node scripts/generar-datos.mjs` con las claves de Gemini y de Groq.
6. `npm run build` con `SITIO=https://radarbalcarce.com`: compila **para
   comprobar** que el sitio compila. Si no compila, no se guarda nada.
7. `node scripts/revisar-seo.mjs`: mira el HTML compilado y falla si se perdió
   algo que Google o WhatsApp necesitan.
8. `git add` de exactamente estos archivos: `portada.json`, `archivo.json`,
   `agenda.json`, `intentos-ia.json`, `dolar-historia.json`, `fichas.json`,
   `notas-por-dia.json`, `banco-fotos.json`, `esperando-cuerpo.json`,
   `vistas.json` y la carpeta `web/public/fotos-notas/`. Si hay cambios,
   commit "Datos de la portada · dd/mm HH:MM", `git pull --rebase` (si choca
   en `web/data/` o en las fotos gana lo de esta corrida) y `git push`, con
   tres intentos.

### D. Publicar: `.github/workflows/cloudflare-deploy.yml`

Cuando "Actualizar la web" **termina bien** (haya o no novedades), arranca
solo "Cloudflare Pages":

1. Baja el repositorio, instala `web/`.
2. **Vuelve a compilar** (`npm run build` con `SITIO`). Es esta segunda
   compilación la que se publica; por eso la foto del dólar publicada es la
   de este momento.
3. Sube `web/out/` a Cloudflare con
   `npx wrangler@4.139.0 pages deploy out --branch=main` (proyecto
   `radar-balcarce`, secretos `CLOUDFLARE_API_TOKEN` y
   `CLOUDFLARE_ACCOUNT_ID`). Es "subida directa": Cloudflare no compila nada,
   así no se gastan los 500 builds gratis por mes.

Desde que "Actualizar la web" arranca hasta que la página nueva está en línea
pasan, según los comentarios de los workflows, entre 3 y 5 minutos.

### E. En el navegador del lector

El HTML llega hecho. Lo único que se mueve en el navegador:

- **El clima** (`components/clima-vivo.js` y `lib/pedir-clima.js`): la
  tarjeta, la pastilla de arriba y la de "Hoy en Balcarce" piden el dato a
  Open-Meteo una sola vez para toda la página (con corte a los 15 segundos,
  `ESPERA_CLIMA`), así los números coinciden.
- **El dólar** (`components/usar-dolar.js`, `components/dolar-vivo.js`,
  `lib/dolar.js`): arranca con la foto del build y consulta DolarApi al abrir
  y cada 5 minutos (`CADA_DOLAR`). Nunca dice "en vivo".
- **"Hace X"** (`components/horas-vivas.js`): recalcula cada minuto el tiempo
  de cada `<time data-hace>`, para que "hace 20 min" no quede congelado.
- **El buscador** (`components/buscador.js`): busca entre las notas
  vigentes que ya vienen en la página. No consulta nada.
- **La página 404** (`app/not-found.js`): si alguien llega a una dirección de
  nota que no existe, baja `/nota/indice.json`, busca el identificador del
  final y lo manda a la dirección buena (`destinoDesde404`, `lib/ruta.js`).

---

## Los archivos de `web/data/`

"¿Lo sube Actualizar?" dice si está en el `git add` de "Actualizar la web".
Los que no, los sube otro (el panel, otro workflow o una persona).

| Archivo | Qué guarda | Quién lo escribe | Quién lo lee | ¿Lo sube Actualizar? |
|---|---|---|---|---|
| `portada.json` | Lo que se **muestra**: las notas de las últimas 36 h, secciones con notas, temas, clima y avisos, farmacia, fiestas anuales, útiles, pendientes, cuántas esperan cuerpo | `generar-datos.mjs`, sólo si `cambioQueImporta` | Todas las páginas (`lib/datos.js`), las redes (`redes/datos.mjs`), el vigilante, la auditoría de redes, y `generar-datos` en la corrida siguiente (primer avistaje, fechas, slugs, lo ya reescrito) | Sí |
| `archivo.json` | Lo que tiene **página**: lo publicado en los últimos 180 días, hasta 2.500 notas, una por renglón | `generar-datos.mjs` (`actualizarArchivo`) | `lib/datos.js` (páginas de notas, tapa, "Seguí leyendo", sitemap), `generar-redirects.mjs`, el panel (antecedentes para la IA), `generar-datos` | Sí |
| `agenda.json` | Los eventos con página: los que vienen y los que pasaron hace menos de 60 días | `generar-datos.mjs` (`actualizarAgenda`) | `lib/datos.js` (agenda, portada, Cultura, sitemap), `reels/plan.mjs` | Sí |
| `intentos-ia.json` | Cuántas veces se le pidió cada nota a Gemini y por qué falló (7 días) | `generar-datos.mjs` con `reels/reescritura.mjs` | `generar-datos.mjs` | Sí |
| `dolar-historia.json` | La cotización de las 11 de cada día hábil, 60 días (`DIAS_DE_HISTORIA`) | `generar-datos.mjs`, **sólo en la nube** | `lib/notas-propias.js`, `reels/plan.mjs` | Sí |
| `fichas.json` | Lo que leyó la IA de cada nota y los grupos de repetidas | `generar-datos.mjs` con `ingesta/lectura-ia.mjs`, sólo en la nube | `generar-datos.mjs` | Sí |
| `notas-por-dia.json` | Cuántas notas salieron cada día y en qué sección (400 días) | `generar-datos.mjs` | `redes/vigilar.mjs` (informe de las 21) | Sí |
| `banco-fotos.json` (+ `web/public/fotos-notas/`) | Qué nota ya se probó para foto, y la foto elegida con su crédito | `generar-datos.mjs` con `scripts/fotos-notas.mjs`, sólo en la nube | `generar-datos.mjs`, `redes/elegir.mjs`, `lib/tarjeta.js` | Sí |
| `esperando-cuerpo.json` | Las notas que no salen por falta de cuerpo, con sus fuentes, para que una persona (o Claude) lo escriba en `correcciones.json` | `generar-datos.mjs` | Personas | Sí |
| `vistas.json` | La primera vez que se vio cada nota (7 días) | `generar-datos.mjs` | `generar-datos.mjs` | Sí |
| `decisiones.json` | Lo que decidió el panel (estado, texto, quién, cuándo) y los horarios de las historias | El panel (`exportarDecisiones`, `panel/servidor.mjs`) | `generar-datos.mjs` en la nube, `recuperar-archivo.mjs` | No: lo sube el panel (`panel/sincronizar.mjs`) |
| `avisos.json` | Los tres espacios publicitarios (apertura, clima, pie) | El panel, pestaña Avisos | `components/avisos.js` (se lee al compilar) | No: lo sube el panel |
| `eventos-panel.json` | Los eventos publicados desde la pestaña Agenda (sólo lo público) | El panel (`exportarEventos`) | `generar-datos.mjs` → `lib/eventos.js` | No: lo sube el panel |
| `retiradas.json` | Lo que se sacó a mano de la web, con motivo, cuándo y quién | Una persona, a mano | `generar-datos.mjs` (`idsRetiradosAMano`) | No: commit a mano |
| `correcciones.json` | Título, bajada, sección o cuerpo corregidos a mano, con motivo, cuándo y quién | Una persona, a mano | `generar-datos.mjs` (`correccionesAMano`) | No: commit a mano |
| `redes.json` | El libro de lo publicado en Facebook e Instagram | Los workflows "Redes" y "Piezas" | `generar-datos.mjs` (direcciones, notas que fueron a redes, repasos, estadística) y todo `redes/` | No: lo suben Redes y Piezas (`docs/07-REDES.md`) |
| `vigilancia.json` | La memoria del vigilante (qué avisó y cuándo) | Workflow "Vigilancia" | `redes/vigilar.mjs` | No: lo sube Vigilancia |
| `estadisticas.json` | Visitas y seguidores | Workflow "Vigilancia" (`redes/estadisticas.mjs`) | `redes/vigilar.mjs` | No: lo sube Vigilancia |
| `dolar.json` | La foto del dólar del momento de compilar | `scripts/foto-dolar.mjs`, en cada build | `fotoDelDolar` (`lib/datos.js`) | **Nunca** se versiona (`.gitignore`) |
| `auditoria.json` | El resultado de la auditoría semanal de medidas y SEO | Workflow "Auditoría" (`redes/auditar.mjs`) | `redes/vigilar.mjs` | No: lo sube Auditoría. Al 28/09 **no está** en el repositorio |

Además, fuera de `web/data/`: `web/public/_redirects` (lo escribe cada build,
no se versiona) y `web/out/` (el sitio compilado, no se versiona).

Tamaños al 28/09, para tener una idea: `decisiones.json` 2,5 MB (1.540
decisiones, 1.390 de ellas escritas por la IA desde el panel),
`archivo.json` 0,98 MB (515 notas), `fichas.json` 0,36 MB, `portada.json`
0,14 MB (29 notas, 2 esperando cuerpo).

---

## La tapa y las secciones

Todo sale de `web/lib/datos.js`. Los números:

| Qué | Valor | Constante | Dónde |
|---|---|---|---|
| Cuánto se queda una nota en las listas (portada, secciones, temas, buscador, feed, sitemap de notas vigentes) | 36 horas | `HORAS_EN_PORTADA` | `web/lib/archivo.js` (= `PORTADA.horas`, `ingesta/criterio.mjs`) |
| Cuánto puede tener un hecho para salir por primera vez | 12 horas | `HORAS_PARA_ESTRENAR` | `web/lib/archivo.js` (= `PORTADA.horasParaEstrenar`) |
| Con qué notas compite la nota grande | las de las últimas 6 horas | `VENTANA_HORAS` | `web/lib/datos.js` (= `PORTADA.horasNotaGrande`) |
| Hasta cuándo el archivo completa una sección | 36 horas (las mismas) | `HORAS_PARA_COMPLETAR = HORAS_EN_PORTADA` | `web/lib/datos.js` |
| Notas por sección en la portada | 3 | `NOTAS_POR_SECCION` | `web/lib/datos.js` |
| Notas por página de sección | 15 | `POR_PAGINA` | `web/lib/paginas.js` |
| Notas en "Seguí leyendo" | 4 (2 de la misma sección) | `CUANTAS_SIGUEN`, `DE_LA_MISMA_SECCION` | `web/lib/seguir-leyendo.js` |

Una prueba (`pruebas/criterio.test.mjs`) controla que las tres primeras digan
lo mismo en la web y en `ingesta/criterio.mjs`.

### Cómo se arma la tapa: `armarTapa`

`armarTapa(notas, orden, { archivo })`, llamada desde `web/app/page.js`:

1. Saca repetidas por las dudas (`sinNotasRepetidas`).
2. **La nota grande** (`ordenarPortada`): de las notas **con hora** (una sin
   hora de la fuente no va a la tapa), toma las de las últimas 6 horas (si no
   hay ninguna, todas). Dentro de esas, prefiere las **de Balcarce** (`local`
   o `nombraBalcarce`); si no hay, todas. Gana la de más puntaje
   (`relevancia`); a igual puntaje, la más nueva.
3. **Las cuatro de abajo**: la más nueva de cada sección, con hora, sin
   repetir la sección de la grande ni entre ellas. Cinco notas, cinco
   secciones.
4. **Los bloques por sección**, en el orden de `SECCIONES` (Balcarce,
   Política, Policiales, Fútbol, Deportes, Automovilismo, Agro, Economía,
   Cultura y agenda, Tecnología, Argentina): las 3 más nuevas que no estén ya
   en la tapa. Si una sección tiene menos de 3, se completa con notas del
   archivo que cumplan todo esto: no están en la portada, tienen hora, no son
   propias, tienen cuerpo, tienen respaldo (`tieneRespaldo`: de acá, propias,
   oficiales o contadas por dos medios o más), son de las últimas 36 horas y
   no se parecen en el titular a nada de la portada ni a lo que ya se sumó en
   otra sección. Cada una muestra su hora real. Una sección sin ninguna nota
   no se dibuja.

### La lista de cada sección y de cada tema

`/seccion/[ranura]` (`web/app/seccion/[ranura]/page.js`): sólo se generan las
secciones que hoy tienen notas, de a 15 por página (`/seccion/deportes-2`…).
En la primera página la nota grande se elige con `ordenarPortada`; en las
siguientes no hay grande. En Cultura y agenda, la primera página suma los 4
próximos eventos. `/tema/[ranura]` hace lo mismo con las notas de un tema.

### Las horas

`cuando(nota)` (`web/lib/datos.js`, con `haceCuanto` de `web/lib/tiempo.js`)
dice siempre con la misma escala: "recién", "hace N min", "hace N h", "ayer",
"hace N días". Sale de `fecha`: si la fuente no dio hora, es desde que la nota
está en el sitio. Sólo queda en blanco si la nota no tiene ninguna fecha
válida. Va en un `<time>` con la fecha exacta (`Hace`,
`web/components/piezas.js`).

### "Hoy en Balcarce": `web/components/hoy-balcarce.js`

Desde el 28/09, en la columna derecha de la portada (en el celular, antes de
la primera noticia), un solo panel de tres filas apiladas, cada una entera un
enlace a su página. La primera versión eran tres tarjetas lado a lado y no
entraban (con dos farmacias de turno el nombre se apretaba); Hernán la cambió
el mismo día. Cada fila: ícono y etiqueta a la izquierda, el dato a la derecha
y una flecha.

| Fila | Dato en negrita | Al lado | Lleva a |
|---|---|---|---|
| Clima | la temperatura | el cielo y "mañana N°" (la máxima) | `/clima` |
| De turno | las farmacias ("Medrano y Del Patio"; cada nombre baja entero) | — | `/farmacias` |
| Dólar blue (u oficial si no hay blue) | la venta en pesos enteros | "oficial $…" | `/dolar` |

El clima y el dólar se actualizan solos en el navegador; la farmacia llega
armada del servidor. Sin ningún dato, la sección no aparece. Debajo va el
espacio publicitario "clima" (`<Aviso slot="clima" />`). No hay botones:
"Llamar" y "Cómo llegar" están en `/farmacias` (Hernán, 28/09).

### El resto de la portada (`web/app/page.js`)

De arriba abajo: el aviso de clima (sólo si hay uno de verdad, el más grave);
en dos columnas, a la derecha "Hoy en Balcarce", los próximos 3 eventos, la
tarjeta del buzón y 5 números útiles (los que son un solo número); a la
izquierda la nota grande, el aviso "apertura", las cuatro de abajo y los
bloques por sección. La tira de temas está apagada (`MOSTRAR_TEMAS = false`,
`web/lib/sitio.js`) desde el 21/09.

### Lo que está en todas las páginas (`web/app/layout.js`)

La franja de arriba (fecha, pastilla del clima que lleva a `/clima`, farmacia
de turno que lleva a `/farmacias`), el logo, el buscador, el menú
(`components/navegacion.js`: las secciones de `EN_NAVEGACION` que hoy tienen
notas, y al final en verde Agenda, Clima, Farmacias, Dólar y Teléfonos) y el
pie. En el `<head>`, la ficha del sitio para Google (`FichaDelSitio`), el feed
y las tipografías de Google Fonts.

---

## Las páginas (`web/app/`)

Todas se generan al compilar, como archivos.

| Dirección | Archivo | Qué muestra / de dónde sale |
|---|---|---|
| `/` | `app/page.js` | La tapa (ver arriba) |
| `/nota/titular-ID` | `app/nota/[id]/page.js` | Título, bajada, **foto si la hay** (con el crédito en el epígrafe, nunca adentro de la imagen), cuerpo (con enlaces si es propia), botones de las notas propias, el desplegable cerrado "Fuentes (N)" con la firma (`components/verificacion.js`), compartir, "Seguí leyendo" y la invitación a escribir. Se genera una página por **cada nota de la portada y del archivo** (`todasLasNotas`) |
| `/nota/titular-ID/opengraph-image` | `app/nota/[id]/opengraph-image.js` | La tarjeta apaisada para compartir (1200 × 630, con la foto del banco si hay) |
| `/nota/titular-ID/instagram.png` | `app/nota/[id]/instagram.png/route.js` | La tarjeta vertical del espejo en Instagram (1080 × 1350). Lleva la foto del banco si la nota tiene una, y si no la placa sin foto (`FOTO_EN_INSTAGRAM = true` desde el 28/09, `web/lib/tarjeta-diseno.js`) |
| `/nota/indice.json` | `app/nota/indice.json/route.js` | `{ id: "titular-id" }` de todas las notas con página, para el rescate de la 404 |
| `/seccion/ranura` y `/seccion/ranura-N` | `app/seccion/[ranura]/page.js` (+ `opengraph-image.js`) | Las notas vigentes de la sección, de a 15 |
| `/tema/ranura` | `app/tema/[ranura]/page.js` (+ `opengraph-image.js`) | Las notas de un tema que hoy tiene 2 o más. Existen y están en el sitemap, pero hoy nada las enlaza (`MOSTRAR_TEMAS = false`) |
| `/agenda` | `app/agenda/page.js` | Los eventos que no terminaron, agrupados por día, y las fiestas del año ("fecha a confirmar" hasta que haya evento confirmado) |
| `/agenda/nombre-clave` | `app/agenda/[id]/page.js` (+ `opengraph-image.js`, `evento.ics/route.js`) | La ficha del evento, el botón para agendarlo (`.ics`) y compartir. Detalle en `CRITERIO-EDITORIAL.md` § 8 |
| `/clima` | `app/clima/page.js` | El clima ahora y los próximos días (desde el 28/09) |
| `/farmacias` | `app/farmacias/page.js` | La de turno con "Llamar" y "Cómo llegar", y cómo sigue la semana |
| `/dolar` | `app/dolar/page.js` | Todos los tipos de dólar, consultados al abrir la página |
| `/util` | `app/util/page.js` | Los teléfonos útiles por categoría |
| `/quienes-somos`, `/contacto`, `/politica-de-privacidad` | sus `page.js` | Páginas fijas |
| `/feed.xml` | `app/feed.xml/route.js` | RSS con todas las notas vigentes |
| `/sitemap.xml` | `app/sitemap.js` | Páginas fijas, secciones (con sus páginas), temas, notas vigentes, notas archivadas **con cuerpo** y eventos que vienen |
| `/sitemap-news.xml` | `app/sitemap-news.xml/route.js` | Para Google Noticias: sólo notas con hora real de las últimas 48 horas |
| `/robots.txt` | `app/robots.js` | Permite todo menos `/feed.xml` en el dominio propio; fuera de él, pide no indexar |
| `/llms.txt` | `app/llms.txt/route.js` | Un resumen del sitio para sistemas de IA |
| `/opengraph-image` | `app/opengraph-image.js` | La tarjeta del sitio |
| 404 | `app/not-found.js` | "No encontramos esa página", con el rescate de direcciones de notas |

---

## El archivo de 180 días y la dirección fija

**Dos listas** (`web/lib/archivo.js`):
- `portada.json` es lo que se **muestra** (36 horas).
- `archivo.json` es lo que tiene **página** (180 días).

Así una nota que sale de la portada sigue teniendo su página y el enlace que
ya está en Facebook, en un grupo de WhatsApp o en Google no da error.

`actualizarArchivo` decide qué queda:
- lo que hoy está en las listas entra, o se actualiza si le corrigieron algo
  (la dirección nunca cambia);
- lo que ya estaba y hoy sigue publicado, se actualiza aunque ya no esté en
  las listas;
- lo que ya estaba y la ingesta no trae más, queda como estaba;
- lo **retirado** (ver paso 7) sale y pierde la página: es lo que protege a
  un menor o a una víctima si se descubre tarde;
- lo que hoy no tiene respaldo (de afuera, contado por un solo medio y sin
  fuente oficial: `tieneRespaldo`, `web/lib/cuerpo.js`) se va, **salvo** que
  haya salido en redes;
- lo de más de 180 días (`DIAS_DE_ARCHIVO`) se va, y si pasa de 2.500 notas
  (`MAXIMO_EN_ARCHIVO`, por el límite de 20.000 archivos por despliegue de
  Cloudflare) se quedan primero las que salieron en redes y después las más
  nuevas.

El puntaje no se guarda en el archivo (`sinPuntaje`): cambia en cada corrida
y haría cambiar el archivo entero.

**Las imágenes** para compartir y para Instagram se generan sólo para las
notas de la portada y las archivadas que salieron en redes (`notasConImagen`):
dos imágenes por cada nota del archivo alargarían mucho la compilación.

### La dirección fija de cada nota (`web/lib/ruta.js`)

La dirección es `/nota/titular-en-guiones-ID`. El titular va adentro porque
Google lo lee y porque se comparte mejor; el **identificador va al final y es
lo único que cuenta**, y nunca lleva guiones.

- El "titular en guiones" (`slugDe`): minúsculas, sin tildes ni signos,
  cortado en una palabra entera, como mucho 70 letras.
- **Se fija la primera vez que la nota sale** y no cambia más, aunque la IA o
  una persona cambien el título (`fijarSlug`). `slugsConocidos` la busca, en
  este orden, en el archivo y la portada anteriores y, si no, en el libro de
  redes (así se rescataron enlaces de Facebook anteriores al arreglo).
- Si igual llega una dirección vieja: `/nota/ID` tiene una redirección fija
  (`_redirects`, hasta 1.900), y cualquier otra la rescata la 404 con
  `/nota/indice.json`.

Pasó el 25/09: la IA reescribía el título después de publicar y los enlaces
de Facebook daban 404.

### "Seguí leyendo" (`web/lib/seguir-leyendo.js`)

Al pie de cada nota, siempre 4 (si hay 4 para ofrecer): distintas entre sí y
de la que se lee (`mismaHistoria`, `web/lib/texto.js`), 2 de la misma
sección y 2 de otras (de secciones distintas entre sí), de la más nueva a la
más vieja. Se buscan por escalones: primero las de la portada con hora y no
propias; después las del archivo con cuerpo y con respaldo; después las
propias; al final las sin hora. Nunca queda vacío si hay algo.

---

## Las notas propias (`web/lib/notas-propias.js`)

Notas que arma el sitio **sin IA**, con plantilla, a partir de datos que
tenemos. Son notas normales (portada, sección, feed, sitemap, archivo),
pasan por la regla de cuerpo y **no van** a Facebook como posteo ni a los
podcasts.

**La nota del dólar.** Sólo el día hábil en que el blue o el oficial se
movieron **2 % o más** contra el día hábil anterior guardado
(`seMovioElDolar`, `NOTA_DEL_DOLAR.movimientoMinimo = 2` en
`ingesta/criterio.mjs`, decisión de Hernán del 28/09; sin día anterior
guardado no se hace). La cotización se guarda de lunes a viernes a partir de
las 11:00 de Balcarce y se sigue intentando hasta las 18:00
(`DOLAR_DESDE`, `DOLAR_HASTA`); un feriado no se guarda porque el oficial no
se actualizó ese día (`entradaDelDia`). Sección Economía, no local,
relevancia 55 (`RELEVANCIA_DOLAR`, para no ganarle a nada de Balcarce),
identificador `dolarAAAAMMDD`, título de hasta 90 letras, tres párrafos
(oficial y blue con la brecha; MEP, contado con liqui, tarjeta y mayorista;
comparación con el día anterior y con una semana atrás), el botón "Ver la
cotización actualizada" y la firma "Nota de Radar Balcarce armada con los
datos de DolarApi.com a las HH:MM". Se arman las de los últimos 4 días.

**La nota de cada podcast (el repaso).** Cuando el libro de redes dice que
salió el podcast de la mañana (`noticia1`), de la tarde (`noticia2`) o de la
noche (`podcast`), se arma una nota que cuenta en texto qué notas se dijeron,
con frases tomadas de lo que **esas notas ya publicaron**, un enlace a cada
una y, si Meta dio la dirección, los botones al video en Instagram y en
Facebook. No se arma con menos de dos notas con página ni si alguna es de
Política o Policiales o está en rojo. Relevancia 60 (`RELEVANCIA_REPASO`),
identificador `repasoAAAAMMDDmanana` (`tarde`, `noche`), firma "Nota de Radar
Balcarce: el texto del repaso publicado en nuestras redes". Se arman las de
los últimos 4 días.

---

## SEO: lo que Google y WhatsApp necesitan

El detalle y lo que falta está en `SEO.md`. Lo que arma el código:

- **Dirección del sitio calculada** (`web/lib/sitio.js`): sale de la variable
  `SITIO`, que en GitHub vale `https://radarbalcarce.com`. Si el sitio no está
  en el dominio propio (por ejemplo, en la PC), `robots.txt` y el `<head>`
  piden **no indexar**.
- **Canónico propio en cada página** (`metadatosDePagina`,
  `web/components/metadatos.js`); sólo la portada es `/`.
- **Título y descripción** de cada nota recortados al largo que muestra
  Google (52 y 155 letras, `recortarEn`).
- **Datos estructurados** (`web/components/ficha.js`): `FichaDelSitio`,
  `FichaDeNota` (con el autor coherente con la firma que ve el lector,
  `autorDeNota`/`firmaCorta`), `FichaDeEvento` y las migas (`Migas`).
- **Tarjetas para compartir** generadas al compilar (`web/lib/tarjeta.js` y
  `web/lib/tarjeta-diseno.js`, con las letras de `web/fuentes/`).
- **Sitemaps** (`sitemap.xml` y `sitemap-news.xml`) y feed.
- **Encabezados** (`web/public/_headers`): seguridad (HSTS, nosniff,
  SAMEORIGIN), que las tarjetas salgan como `image/png` y el `.ics` como
  calendario, y caché de un año para `/_next/static`.
- **Controles:** `web/scripts/revisar-seo.mjs` corre después de compilar en
  cada "Actualizar la web" y frena la subida si falta algo;
  `web/scripts/auditar-seo-vivo.mjs [url]` audita a mano las páginas ya
  publicadas; la auditoría semanal de los lunes mira lo publicado
  (`docs/08-INFRAESTRUCTURA.md`).

---

## El diseño: criterio, tipografías y colores

**El criterio**: portal de noticias,
no diario solemne. Fondo claro, títulos en serif, un color por sección y
movimiento sólo en lo que se mira todos los días (el dibujo del clima: sol que
gira, nube que flota, gotas que caen; quien pidió menos movimiento en su
sistema no lo ve, `prefers-reduced-motion` en `web/app/globals.css`). La
franja de arriba (fecha, clima, farmacia de turno) va en **todas** las
páginas: son las dos cosas que la gente viene a buscar sin querer leer nada.
Una pestaña que lleva a una página vacía es peor que no tenerla: el menú sólo
muestra las secciones que hoy tienen notas. Agenda, Clima, Farmacias, Dólar y
Teléfonos van al final del menú y en verde: son servicios, no secciones.

**Letras y colores.** Source Serif 4 en los títulos e Inter en el resto (desde
el 27/09); once colores, uno por sección (`--s-*` en `web/app/globals.css`);
el sistema tipográfico de las tarjetas de servicio con variables (`--t-*`).
Todo está junto en **`MEDIA-KIT.md`** (los colores, las letras, el sistema
tipográfico con cada variable y dónde vive cada cosa en el código).

**Detalles de presentación que ya se decidieron** (27 y 28/09):

- **El menú** (`web/components/navegacion.js`): el HTML viene armado y anda
  sin JavaScript; en el navegador marca la página actual, la centra en la fila
  y prende un degradé a la derecha mientras quede menú por ver. Con menos de
  900 px es **una sola fila** que se desliza (toques de 44 px); desde 900 px
  es una barra normal que envuelve, y desde 1180 px entra en una línea.
- **Los servicios en el celular** (menos de 620 px, el bloque del final de
  `globals.css`): el clima y la farmacia se apilan, no van en carrusel (nada
  queda escondido detrás de un gesto); los días del clima van en una fila baja
  con la probabilidad de lluvia al lado.
- **La farmacia** (`TarjetaFarmacia` en `web/components/piezas.js`,
  `web/lib/farmacias.js`): cruz propia en verde farmacia, "Llamar" y "Cómo
  llegar"; `enlaceDeLlamada` arma el `tel:` completo ("42-2106" pasa a
  `tel:+542266422106`). El nombre de la farmacia es un dato, no un titular. En
  `/farmacias`, la de turno y la semana ordenada, sin repetir hoy. La tarjeta
  **no dice hasta qué hora está de turno** (regla 3 de
  `docs/10-REGLAS-Y-PRUEBAS.md`).
- **El dólar** (`/dolar`, `web/lib/dolar.js`, `web/components/dolar-vivo.js`):
  se pide en el navegador a DolarApi (`/v1/dolares`) al abrir y cada 5
  minutos; si no contesta, a Bluelytics (sólo oficial y blue). Las dos son
  gratis, sin clave. Mientras tanto se ve la foto del build con su hora y "no
  se pudo actualizar". El punto verde y "Actualizado a las…" aparecen sólo
  cuando la fuente contestó, con la hora que informa la fuente. **Nunca "en
  vivo".** En `/dolar`, si algún valor tiene centavos, todos llevan dos
  decimales para que las cifras alineen; en "Hoy en Balcarce", pesos enteros.
- **El pie de todas las páginas** (`web/app/layout.js`, desde el 25/09) dice
  que los resúmenes los escribe una IA y se verifican automáticamente contra la
  fuente, que lo sensible lo revisa una persona antes de salir, que las voces
  de los videos también son de IA y que cada nota dice al pie quién la
  escribió. Antes decía "con revisión humana" y ninguna nota la había tenido:
  decirlo es lo que evita que el día que alguien lo descubra parezca que se
  escondía. Las biografías de las redes dicen lo mismo, más corto
  (`PERFILES.md`).

Las pruebas que cuidan el diseño: `pruebas/tipografia.test.mjs`,
`pruebas/titulos-colores.test.mjs` y `pruebas/presentacion-celular.test.mjs`.

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `web/scripts/generar-datos.mjs` | Arma todos los datos de la web | "Actualizar la web"; `npm run datos` | Ingesta (nube) o `panel/datos/` (PC), `web/data/*` | Los 10 archivos del `git add` (ver tabla de arriba) y las fotos |
| `web/scripts/fotos-notas.mjs` | Decide a qué notas probarles foto (10 por corrida) | `generar-datos.mjs` (nube) | `banco-fotos.json`, `ingesta/fotos.mjs` | Devuelve el banco y los archivos |
| `web/scripts/foto-dolar.mjs` | Guarda la foto del dólar | `npm run build` | DolarApi / Bluelytics | `web/data/dolar.json` |
| `web/scripts/generar-redirects.mjs` | Arma las redirecciones | `npm run build` | `portada.json`, `archivo.json` | `web/public/_redirects` |
| `web/scripts/revisar-seo.mjs` | Revisa el HTML compilado | "Actualizar la web" | `.next/server/app` | Nada (falla o pasa) |
| `web/scripts/auditar-seo-vivo.mjs` | Audita lo publicado | A mano; la auditoría semanal | El sitio en línea | Nada |
| `web/scripts/recuperar-archivo.mjs` | Rearma `archivo.json` desde el historial de git (se usó una vez, el 25/09) | A mano | `git log`, `git show` | `archivo.json` |
| `web/scripts/hacer-iconos.mjs` | Genera los íconos (una vez; usa resvg) | A mano | El dibujo | `web/public/*.png`, `favicon.ico` |
| `web/lib/datos.js` | La puerta de entrada a los datos para todas las páginas; tapa, secciones, horas, contacto | Todas las páginas | `web/data/portada.json`, `archivo.json`, `agenda.json`, `dolar.json` | Nada |
| `web/lib/archivo.js` | Qué se muestra, qué tiene página, retiradas, correcciones, fechas, direcciones | `generar-datos.mjs`, `datos.js`, `recuperar-archivo.mjs` | Lo que le pasan | Nada (sólo cuentas) |
| `web/lib/ruta.js` | La dirección de cada nota y el rescate de la 404 | `datos.js`, `archivo.js`, páginas, redes | — | — |
| `web/lib/cuerpo.js` | `tieneCuerpo`, `tieneRespaldo`, `esperaCuerpo` | `generar-datos`, `datos.js`, redes, panel, reescritura | — | — |
| `web/lib/titulos.js` | Arreglos mecánicos del título | `generar-datos`, `ingesta/verificar.mjs` | — | — |
| `web/lib/texto.js` | Comparar textos, nombres, recortes, repetidas | Casi todo | — | — |
| `web/lib/seguir-leyendo.js` | "Seguí leyendo" | Página de la nota | — | — |
| `web/lib/notas-propias.js` | Nota del dólar y repasos | `generar-datos.mjs` | Historia del dólar, libro de redes | — |
| `web/lib/eventos.js` | Los eventos con página | `generar-datos`, `datos.js`, páginas de agenda | — | — |
| `web/lib/dolar.js` | Pedir y leer el dólar, textos de "actualizado" | `/dolar`, portada, `foto-dolar`, `generar-datos` | DolarApi, Bluelytics | — |
| `web/lib/pedir-clima.js`, `web/lib/clima.js` | El clima en el navegador y el dibujo de cada cielo | Componentes de clima | Open-Meteo | — |
| `web/lib/sitio.js` | La dirección del sitio y si es el dominio propio | Metadatos, sitemap, robots, feed | Variable `SITIO` | — |
| `web/lib/paginas.js` | Partir una sección en páginas de 15 | Página de sección, sitemap | — | — |
| `web/lib/tarjeta.js`, `web/lib/tarjeta-diseno.js` | Las imágenes para compartir y la de Instagram | Rutas de imágenes | `web/fuentes/`, banco de fotos | Imágenes al compilar |
| `web/lib/fuentes-de-la-nota.js` | Qué fuentes ve el lector | `components/verificacion.js` | — | — |
| `web/lib/enlaces-en-texto.js` | Enlaces adentro del cuerpo de las notas propias | Página de la nota | — | — |
| `web/lib/farmacias.js` | El enlace `tel:` de cada farmacia | Tarjetas de farmacia | — | — |
| `web/lib/tiempo.js` | "Hace cuánto" | `datos.js`, `horas-vivas.js` | — | — |
| `web/components/hoy-balcarce.js` | La franja "Hoy en Balcarce" | Portada | Clima y dólar en vivo | — |
| `web/components/piezas.js` | Piezas repetidas (fila de nota, hora, farmacia, evento, cierre, buzón) | Páginas | — | — |
| `web/components/verificacion.js` | El desplegable "Fuentes (N)" y la firma | Página de la nota | — | — |
| `web/components/metadatos.js`, `ficha.js` | Metadatos, firma, datos estructurados, migas | Páginas | — | — |
| `web/components/avisos.js` | Los tres espacios publicitarios | Portada y pie | `avisos.json` | — |
| `web/components/clima-vivo.js`, `dolar-vivo.js`, `usar-dolar.js`, `horas-vivas.js`, `buscador.js`, `navegacion.js`, `compartir.js` | Lo que se mueve en el navegador | Layout y páginas | APIs públicas | — |
| `web/app/**` | Las páginas (tabla de arriba) | `next build` | `web/lib/datos.js` | `web/out/` |
| `web/next.config.mjs` | Exportar como archivos (`output: 'export'`) | `next build` | — | — |
| `web/public/_headers` | Encabezados de Cloudflare | Cloudflare Pages | — | — |
| `.github/workflows/actualizar.yml` | Probar, armar datos, compilar, revisar, guardar | cron-job.org cada 30 min (respaldo: `cron '7,37 * * * *'`) | Todo | Commit de datos |
| `.github/workflows/cloudflare-deploy.yml` | Compilar y subir a Cloudflare | Al terminar bien "Actualizar la web"; a mano | `web/` | El sitio en línea |

---

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Cuántas horas se queda una nota en la portada | `HORAS_EN_PORTADA` (`web/lib/archivo.js`) **y** `PORTADA.horas` (`ingesta/criterio.mjs`) **y** la tabla de `CRITERIO-EDITORIAL.md` (una prueba controla que coincidan) |
| Cuánto puede tener un hecho para salir por primera vez | `HORAS_PARA_ESTRENAR` y `PORTADA.horasParaEstrenar`, igual que arriba |
| Con cuántas horas compite la nota grande | `VENTANA_HORAS` (`web/lib/datos.js`) y `PORTADA.horasNotaGrande` |
| Cuántas notas por sección en la portada | `NOTAS_POR_SECCION` (`web/lib/datos.js`) |
| El orden, los nombres y el menú de las secciones | `SECCIONES` y `EN_NAVEGACION` (`web/lib/datos.js`); el color, `--s-*` en `web/app/globals.css` (`MEDIA-KIT.md`; Argentina conserva la variable vieja `--s-pais`). Las ranuras son `balcarce`, `politica`, `policiales`, `futbol`, `deportes`, `automovilismo`, `agro`, `economia`, `cultura`, `tecnologia` y `argentina` |
| Cuánto dura el archivo o cuántas notas guarda | `DIAS_DE_ARCHIVO`, `MAXIMO_EN_ARCHIVO` (`web/lib/archivo.js`) |
| Sacar una nota de la web sin el panel | `web/data/retiradas.json` (motivo, cuándo, quién) |
| Corregir título, bajada, sección o cuerpo sin el panel | `web/data/correcciones.json` (motivo, cuándo, quién; `CAMPOS_CORREGIBLES`) |
| Escribir el cuerpo de una nota que lo espera | Tomar la nota de `web/data/esperando-cuerpo.json` y escribirla en `correcciones.json` |
| La tarjeta "Hoy en Balcarce" | `web/components/hoy-balcarce.js` |
| "Seguí leyendo" | `web/lib/seguir-leyendo.js` |
| La nota del dólar (cuándo sale, qué dice) | `web/lib/notas-propias.js`; el porcentaje, `NOTA_DEL_DOLAR` (`ingesta/criterio.mjs`) |
| La página del dólar | `web/lib/dolar.js`, `web/components/dolar-vivo.js`. Nunca decir "en vivo" |
| Cuándo se vuelve a publicar la portada por el clima | `cambioQueImporta` (`web/scripts/generar-datos.mjs`) |
| Qué sale en el sitemap o el feed | `web/app/sitemap.js`, `web/app/sitemap-news.xml/route.js`, `web/app/feed.xml/route.js` |
| Las redirecciones de secciones viejas | `SECCIONES_VIEJAS` (`web/scripts/generar-redirects.mjs`) |
| Los encabezados de Cloudflare | `web/public/_headers` |
| Prender las etiquetas de temas | `MOSTRAR_TEMAS` (`web/lib/sitio.js`) |
| Que la imagen de Instagram lleve (o no) la foto del banco | `FOTO_EN_INSTAGRAM` (`web/lib/tarjeta-diseno.js`; hoy `true`) |
| Los avisos publicitarios | Panel → Avisos (`PUBLICIDAD.md`) |

---

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| Una prueba falla en GitHub | "Actualizar la web" en rojo en el paso "Probar que nada se rompió"; la web queda como estaba; a los 100 minutos sin actualizarse (`LIMITES.minutosSinActualizar`, `redes/vigilar.mjs`) llega el WhatsApp "La web no se actualiza hace N horas" | Ver qué prueba falló (`docs/10-REGLAS-Y-PRUEBAS.md`) |
| cron-job.org desactivó el trabajo | El mismo aviso de web vieja; el `schedule` de GitHub sigue como respaldo, más irregular | Reactivarlo (`docs/11-OPERACION.md`) |
| Una fuente se cae o se vacía | Aviso amarillo "Fuente caída" o "Fuente vacía" arriba de la corrida; nada se rompe | `docs/02-INGESTA.md` |
| Gemini sin cupo | Crece `esperando-cuerpo.json` y la línea "Esperando cuerpo: N" del resumen de las 21; menos notas en la portada | Esperar el cupo, o escribir los cuerpos en `correcciones.json` |
| El sitio no compila | "Actualizar la web" falla en "Compilar el sitio" y no guarda nada; la web queda como estaba | Ver el error del paso |
| Se perdió algo de SEO | Falla "Revisar que el SEO siga en pie" y no se guarda nada | `revisar-seo.mjs` dice qué falta |
| Dos corridas chocan al subir | El `pull --rebase` resuelve solo lo de `web/data/` y las fotos; si el choque es en otro archivo, la corrida falla con "Conflicto fuera de web/data" | Resolver a mano |
| Falla la subida a Cloudflare | "Cloudflare Pages" en rojo; los datos ya están en GitHub pero el sitio no cambió | Correrlo a mano desde Actions |
| DolarApi no contesta | `/dolar` muestra la foto con su hora y "no se pudo actualizar"; la nota del dólar se reintenta hasta las 18 | Nada |
| Una nota vieja reaparece como nueva | Sólo si su fecha no se pudo fijar; `vistas.json` y `fechaDeLaNota` lo evitan | Retirarla en `retiradas.json` |
| Se corre `npm run datos` en la PC | Quedan `portada.json`, `archivo.json` y compañía modificados en la PC; el panel no los sube, pero traban un `git pull` | `git checkout` de esos archivos, o al hacer pull `git checkout --theirs` (`CLAUDE.md`) |
| Un enlace compartido da 404 | No debería: la redirección fija o la 404 lo rescatan. Si pasa, la nota fue retirada (perdió la página a propósito) o se fue del archivo | Ver si está en `retiradas.json` |

---

## Lo que sigue abierto

- Comentarios que quedaron viejos: `HORAS_EN_PORTADA` (`web/lib/archivo.js`,
  "el mismo criterio que el panel"), `web/next.config.mjs` ("las únicas
  imágenes son las placas"), la descripción de `web/package.json`
  ("datos generados desde el panel"), `web/app/sitemap.js` (el feed "trae las
  últimas veinte") y `web/lib/tarjeta-diseno.js` (nombra una prueba que no
  existe, `tarjeta-diseno.test.mjs`; la que lo prueba es `placas.test.mjs`);
  y el título de una prueba de `pruebas/archivo.test.mjs` ("corta las listas
  en 72 horas", el código corta en 36). Están en `PENDIENTES.md`.
- La Auditoría de los lunes corrió por primera vez el 28/09
  (`web/data/auditoria.json`): falta confirmar que corra sola el lunes
  siguiente (`PENDIENTES.md`).

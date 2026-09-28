# 09 · El panel: el tablero de la PC

*Escrito el 28/09/2026, leyendo el código de ese día (`panel/`). Si algo de
acá no coincide con el código, manda el código.*

Qué es cada nota y por qué el semáforo la pone de un color es de
`docs/03-SELECCION.md`; cómo escribe la IA, de `docs/04-REDACCION.md`; cómo
usa la web lo que el panel decide, de `docs/06-WEB.md`; las redes, de
`docs/07-REDES.md`; los enlaces y el uso diario, de `docs/11-OPERACION.md`.

---

## En una frase

El panel es un programa de Node que corre **sólo en la PC de Hernán**
(`http://localhost:4321`): busca noticias cada 10 minutos, reescribe con IA lo
que va a salir solo, muestra la cola de notas amarillas para que Hernán o
Andrés decidan, y **sube solo a GitHub** lo que se decide (las decisiones, los
avisos y los eventos), para que la web, que se arma en GitHub, lo respete
aunque después la PC se apague.

---

## El recorrido, paso a paso

### 1. Arrancar

- Doble clic en **`ARRANCAR.bat`** (en la raíz del proyecto). Abre una ventana
  negra titulada "Radar Balcarce - PANEL" que corre
  `node panel/servidor.mjs`, espera 5 segundos y abre
  `http://localhost:4321` en el navegador. **Esa ventana es el panel:** si se
  cierra, el panel se apaga.
- También se puede arrancar con `npm run panel` desde la raíz.
- El panel **no arma ni publica la web** (dejó de hacerlo el 25/09). La web
  la arma GitHub y la sirve Cloudflare, con la PC prendida o apagada.

### 2. Lo que hace al arrancar (`panel/servidor.mjs`)

1. Lee `panel/datos/estado.json` (la memoria del panel). Si no existe, lo crea
   con la lista de fuentes del código.
2. Si el código tiene fuentes nuevas (`TODAS_LAS_FUENTES`, de
   `ingesta/fuentes.mjs` y `ingesta/fuentes-cruce.mjs`) que el panel no
   conoce, las suma y lo anota en el historial ("fuentes nuevas del código").
   A las que ya tenía les actualiza los temas, pero **respeta** el peso y la
   pausa que se hayan tocado en el panel.
3. Guarda el estado. Guardar el estado **siempre** exporta las decisiones y
   los eventos y programa la subida a GitHub (paso 6).
4. A los 15 segundos hace una copia de seguridad (`panel/respaldo.mjs`), y
   después una cada 6 horas.
5. Empieza a escuchar en el puerto 4321. Si nunca buscó noticias
   (`panel/datos/ultima.json` no existe) hace la primera búsqueda; si no tiene
   la agenda, la trae.
6. Programa dos relojes: **buscar noticias cada 10 minutos** y **traer la
   agenda cada hora**.

### 3. Cada 10 minutos: el ciclo (`correrIngesta`)

1. Corre la ingesta (`ingestar`, `ingesta/ingesta.mjs`) con las fuentes del
   código, pero con el peso y la pausa que tengan en el panel
   (`fuentesParaIngestar`). Una fuente que se borró en el panel no vuelve.
2. Guarda el resultado en `panel/datos/ultima.json`.
3. **Reescribe sola lo que va a salir sola** (`reescribirPendientes`): toma las
   notas **verdes** de menos de 72 horas, reusa lo que la IA ya escribió con
   cuerpo, y pide a Gemini hasta **12 por ciclo** (`REESCRITURAS_POR_CICLO`).
   Usa exactamente el mismo flujo que la nube (`reescribirAutomaticas`,
   `reels/reescritura.mjs`): texto completo de las fuentes, cuerpo
   obligatorio, verificación contra la fuente, tres intentos por nota
   (guardados en `estado.intentosIA`), semáforo sobre lo escrito. Lo que
   escribe lo guarda como una decisión "de la máquina" (`por: 'ia'`,
   `deIA: true`), con el mismo estado que la nota ya tenía. **Nunca pisa lo que
   escribió una persona.** Si lo ya escrito hoy no pasa la revalidación, borra
   ese texto para que se rehaga. Si el semáforo o una verificación baja frenan
   una nota, la nota cambia de color y queda esperando a una persona.
   Necesita la clave de redacción (`claveRedaccion`, `reels/claves.mjs`); sin
   clave, no hace nada.

Mientras corre, la luz de arriba del tablero se pone amarilla.

### 4. Entrar

- La primera pantalla es el **login** (`panel/acceso.mjs`). Hay dos usuarios,
  Hernán y Andrés. Las cuentas se crean o se les cambia la clave desde la
  consola de la PC con `node panel/clave.mjs <usuario> "<clave>" ["Nombre"]`
  (`panel/clave.mjs`). **Una clave nunca se escribe en un documento ni en un
  chat.**
- Las claves se guardan como hash (scrypt con sal) en
  `panel/datos/usuarios.json`. La sesión es una cookie firmada que dura 30
  días (`DIAS_DE_SESION`); la firma sale de `panel/datos/secreto.txt`, que se
  crea solo (si se borra, se cierran todas las sesiones).
- Cinco claves mal seguidas desde la misma dirección cierran la puerta 15
  minutos (`MAX_FALLOS`, `CASTIGO_MS`).
- Además (`panel/seguridad.mjs`): un pedido que cambia algo y viene de otra
  página se rechaza (`origenPermitido`), "Salir" es un botón y no un enlace, y
  "Probar una fuente" no deja entrar a la red de la casa ni a la PC
  (`probarUrlPermitida`).
- Además (`panel/acceso.mjs`): la cookie sale marcada `Secure` cuando se
  entra por https (el túnel); para el freno de intentos, la dirección que
  manda el túnel (`X-Forwarded-For`) sólo se cree si la conexión viene de la
  misma PC, así no se saltea inventándola (25/09); y el error de acceso no
  delata si el usuario existe.
- El panel escucha en todas las conexiones de la PC (cualquiera en la misma
  red llega a la pantalla del login) y, con **Tailscale Funnel** prendido, se
  puede entrar desde afuera, con la dirección que está en
  `panel/datos/DIRECCION-DEL-PANEL.txt` (no va al repositorio, que es
  público). Ahí lo protege **sólo la contraseña**. Para cerrarlo:
  `tailscale funnel --https=443 off`.
- Las contraseñas iniciales se cambiaron el 25/09. Si todavía existe
  `panel/datos/CLAVES-INICIALES.txt`, se borra (`PENDIENTES.md`).

### 5. Usarlo: las pestañas

El tablero (`panel/panel.html`, una sola página) se recarga solo cada minuto
mientras no haya una nota abierta. Arriba a la derecha: quién entró,
**"Buscar noticias ahora"** (corre el ciclo del paso 3 en ese momento) y
**"Salir"**.

| Pestaña | Qué muestra | Qué se puede hacer |
|---|---|---|
| **Para decidir** (con el número de pendientes) | Las notas en estado `pendiente`: las amarillas sin decidir (lo sensible, lo de afuera poco contado o fuera de cupo, la cotización del dólar, la verificación baja). Cada tarjeta: el punto del semáforo, sección, medios, cuándo, "coinciden N" si la cuentan varios medios, "nos nombran afuera", "sin cuerpo" y el puntaje, con el motivo del semáforo | Abrir una nota: editar título, bajada, cuerpo y guion; **Reescribir con IA**; **Publicar**, **Guardar cambios** o **Descartar**. Plegado, el **análisis interno** (nivel de verificación y por qué, claves, qué se sabe, qué falta confirmar, fuentes y lo que aportó cada una, antecedentes): es para quien decide, la web no lo muestra. Si la nota no tiene cuerpo, "Publicar" pide confirmarlo con **"Publicar igual, sin cuerpo"**. Botón **"Archivar esas N"** para descartar de una vez las viejas o flojas (las que dicen "días" o tienen menos de 55 de puntaje) |
| **Publicadas** | Lo publicado por una persona y lo que salió solo (`automatica`) | **Volver a la cola** (borra la decisión) y, en lo que salió solo, **Bajar de la web** (la descarta) |
| **Descartadas** | Lo que alguien descartó | **Volver a la cola** |
| **Frenadas** | El semáforo rojo (menores, víctimas y lo que no se publica nunca) | Nada: no se publica ni por error |
| **Archivadas** | Lo que pasó 72 horas sin que nadie lo decidiera (`HORAS_PARA_ARCHIVAR = 72`) | **Volver a la cola** |
| **Fuentes** | Todas las fuentes con su peso, si están activas y cómo les fue en la última búsqueda; los últimos movimientos del historial | Pausar o reactivar, cambiar el peso (de 1 a 40), borrar, **sumar una fuente** y **probarla** antes |
| **Clima y farmacias** | La farmacia de turno y la semana, el clima ahora y los próximos días, los números útiles | Sólo mirar |
| **Agenda** | Los eventos cargados a mano, los del municipio, el formulario "Cargar un evento", "A quién pedirle fechas" y las fiestas anuales | Cargar un evento (nace como borrador), **Publicar en la web**, **Sacar de la web**, **Borrar**; "Ya tengo la fecha" para una fiesta anual; escribirle a un contacto por WhatsApp o mail (el panel abre el mensaje, **no manda nada solo**), marcar "Le escribimos hoy" y "Respondió". El paso a paso, en "La agenda, paso a paso", más abajo |
| **Calendario** | A qué hora y qué días sale cada historia fija (clima de la mañana y de la noche, farmacia, útiles, agenda) | Cambiar hora, días o apagarla. **Sólo rige en la PC**: en GitHub valen los horarios de fábrica (`HISTORIAS_FIJAS`, `panel/horarios.mjs`) |
| **Para redes** (con el número) | Los videos y placas que se armaron **en la PC** en las últimas 24 horas (`reels/salida/`) | Bajarlos. Las redes de todos los días salen desde GitHub, no de acá (`docs/07-REDES.md`) |
| **Buzón** (con el número de nuevos) | Lo que manda la gente: dato, reclamo, opinión o seguimiento, cada uno con su regla (`panel/buzon.mjs`) | Cargar algo que llegó por otro canal, cambiarle el estado, anotar la respuesta de la otra parte en un reclamo, borrar. Un reclamo **nunca** se publica de un solo lado |
| **Avisos** | Los tres espacios publicitarios de la web (apertura, clima, pie; `SLOTS_AVISOS` en `panel/avisos.mjs`) | Cargar nombre, texto y logo; con el nombre vacío se borra. Ver `PUBLICIDAD.md` |
| **Cómo escribe la IA** | La instrucción exacta que recibe la IA (sale de `CRITERIO-EDITORIAL.md` § 12) y, plegado, el criterio entero | Sólo mirar. Se cambia en el documento y se reinicia el panel |

### 6. Qué pasa cuando alguien decide algo

1. El navegador manda el pedido al panel (`/api/nota`, `/api/lote`,
   `/api/reescribir`, `/api/avisos`, `/api/evento`…). Quién lo hizo sale de
   la sesión, no de lo que diga el navegador.
2. El panel cambia `estado.decisiones` (o el buzón, los eventos, las
   fuentes) y lo anota en el historial.
3. Guarda `panel/datos/estado.json` y, en el mismo momento:
   - **exporta las decisiones** a `web/data/decisiones.json`
     (`exportarDecisiones`): por cada nota, sólo lo que la web usa
     (`decisionParaLaWeb`, `panel/notas.mjs`: estado, título, bajada, cuerpo,
     guion, si es de la IA, quién, cuándo y las partes internas). **Poda** las
     de más de 60 días (`DIAS_DE_DECISIONES`, `podarDecisiones`), salvo lo que
     una persona descartó, bloqueó o archivó: eso se guarda siempre, para que
     no vuelva a salir si un medio la republica. También van los horarios del
     Calendario (que hoy la nube no usa);
   - **exporta los eventos** publicados a `web/data/eventos-panel.json`
     (`eventosParaLaWeb`, `panel/agenda.mjs`): sólo los campos que se ven en
     la web (`CAMPOS_PUBLICOS`), nunca quién avisó ni su teléfono, hasta 90
     días después de que terminan. Si no cambió nada, no lo toca;
   - los avisos se escriben directo en `web/data/avisos.json`.
4. **Programa la subida a GitHub** (`panel/sincronizar.mjs`). Espera **30
   segundos** desde el último cambio (`esperaMs = 30000`): varios cambios
   seguidos se juntan en una sola subida. Después:
   `git add` de los tres archivos → si no hay cambios, nada → `git commit`
   "Panel: decisiones, avisos y agenda · fecha" → `git pull --rebase
   --autostash` → `git push`. Si algo falla (sin internet, un conflicto),
   cancela el rebase, lo dice en la ventana ("no se pudo subir…; queda para
   el próximo intento") y no rompe nada: el cambio queda en el archivo y sube
   con el próximo cambio. Se apaga con la variable `SINCRONIZAR_GITHUB=no`.
5. En la próxima corrida de "Actualizar la web" (cada 30 minutos), GitHub lee
   `decisiones.json` y la web lo respeta (`notaPublicada`,
   `web/scripts/generar-datos.mjs`; ver `docs/06-WEB.md`). Entre que alguien
   aprieta "Publicar" y la nota está en el sitio pueden pasar unos 35 minutos
   en el peor caso.

**Qué cuenta como decisión de una persona.** Para la web, sólo manda una
decisión con `por` distinto de `'ia'` (`decisionHumana`,
`ingesta/utiles.mjs`). Lo que escribió la IA desde el panel se usa **como
texto** (si tiene cuerpo), pero no cambia si la nota sale o no: eso lo sigue
decidiendo el semáforo. Al 28/09, de las 1.540 decisiones exportadas, 1.390
son de la IA y 2 de una persona.

**"Volver a la cola" borra la decisión.** Si la nota es verde, vuelve a salir
sola; si es amarilla, vuelve a "Para decidir".

**Publicar sin cuerpo.** Publicar de a una nota sin cuerpo pide la
confirmación; en lote (`/api/lote`) las que no tienen cuerpo se saltean.

**Si una persona cambia el título, la bajada o el cuerpo,** las partes
internas que armó la IA sobre su versión se borran (`conTextoCorregido`,
`panel/notas.mjs`): podrían contradecir la nota corregida.

### 7. El respaldo (`panel/respaldo.mjs`)

Copia `panel/datos/` a una carpeta con la fecha de Balcarce (`AAAA-MM-DD`) al
arrancar y cada 6 horas, y guarda las **últimas 14** copias. La carpeta es la
de la variable `RESPALDO_CARPETA` (conviene una de Drive u OneDrive, así queda
afuera de la PC); si no está, `respaldos/` junto al proyecto. **Nunca** va a
GitHub (hay usuarios y datos de gente del buzón) y **no copia** los secretos
en texto plano (`esSecreto`: los `.txt` con "clave", "secreto", "password" o
"token" en el nombre). A mano: `node panel/respaldo.mjs [carpeta]`.

---

## La agenda, paso a paso

Desde el 25/09 (`panel/agenda.mjs`; el criterio, en `CRITERIO-EDITORIAL.md`
§ 8; la página de cada evento, en `docs/06-WEB.md`).

**Cargar un evento que avisó alguien:**

1. Pestaña **Agenda** → formulario **Cargar un evento**: nombre, fecha
   (`2026-10-15`) y, si se sabe, hora (`20:30`), cuándo termina, lugar,
   dirección, entrada, quién organiza, página de entradas y una descripción.
   Todo eso **sale en la web tal cual**. "Quién lo avisó" queda en el panel.
2. Si la fecha está **confirmada por quien organiza**, tildar "Publicar ya en
   la web". Si no, queda como **borrador** y se publica después con **Publicar
   en la web**. Una fecha aproximada no se publica.
3. En la próxima corrida de GitHub (media hora como mucho) el evento tiene su
   página. **Sacar de la web** o **Borrar** la hacen desaparecer en la corrida
   siguiente.

**Una fiesta del calendario anual** (Automovilismo, Postre, Balcarce Corre…):
cuando el organizador confirma la fecha, **Ya tengo la fecha** (en "Se acercan
estas fechas anuales" o "Todo el calendario anual") llena el formulario y lo
liga a la fiesta; la web cambia "fecha a confirmar" por la fecha con enlace.

**Pedirle fechas a las instituciones** (tarjeta "A quién pedirle fechas"):

1. **A quién escribir este mes** muestra a los que suelen tener eventos en los
   próximos 45 días (`DIAS_ADELANTE`) y a los que no se les escribió en los
   últimos 30 (`DIAS_ENTRE_MENSAJES`). "Todos" muestra la base completa.
2. **Escribir por WhatsApp** (o por mail) abre el mensaje ya escrito. **El
   panel no manda nada solo**: lo manda una persona. Sin WhatsApp ni mail,
   **Ver mensaje**, copiarlo y mandarlo por Instagram o Facebook.
3. Después, **Le escribimos hoy** (si varios comparten el número, vale para
   todos). Cuando contestan, **Respondió** y, si mandan una fecha, **Cargar un
   evento suyo**.

**La base de contactos** es `ingesta/contactos-agenda.json` (43 instituciones
al 28/09): qué organiza cada una, en qué meses (sólo si hay una fuente que lo
respalde), sus canales **oficiales**, de dónde salió cada dato y cuándo se
verificó. El repositorio es público: nunca un celular personal que la
institución no publique. Se corrige editando ese archivo y reiniciando el
panel. No se mezcla con `comercial/` (comercios para vender publicidad).

## Cómo se podría pasar a online

Ninguna opción está decidida ni probada (`PENDIENTES.md`, "Panel 100%
online"); los límites de los planes gratis cambian, hay que verificarlos antes:

1. **Cloudflare Pages + Functions + Access** (la que mejor encaja: el sitio ya
   está ahí). El panel detrás de Cloudflare Access (entrar con el correo, sin
   contraseñas propias), unas funciones que escriben las decisiones en el
   repositorio por la API de GitHub y los datos del buzón en un almacenamiento
   de Cloudflare, nunca en el repositorio. Trabajo mediano: el servidor se
   reescribe como funciones.
2. **Sólo lo esencial**: aprobar notas y cargar avisos en una página protegida
   que escriba `decisiones.json` y `avisos.json` por GitHub; buzón y agenda,
   después.
3. **Un servidor gratis**: el panel ya corre con Node sin dependencias, pero
   hay que resolver el disco para `panel/datos/`, el respaldo y el acceso (muchos
   planes gratis duermen el servicio o borran el disco).
4. **Con gasto** (unos USD 5 por mes): Railway o Fly.io. Lo más simple.

Mientras tanto: respaldo apuntado afuera de la PC, contraseñas cambiadas (25/09)
y el túnel cerrado cuando no haga falta.

## Qué guarda el panel y dónde

| Archivo | Qué es | ¿Va a GitHub? |
|---|---|---|
| `panel/datos/estado.json` | La memoria del panel: decisiones completas, fuentes, historial (200 movimientos), eventos cargados a mano, buzón, a quién se le escribió y cuándo, horarios, intentos de la IA | No (`.gitignore`) |
| `panel/datos/ultima.json` | La última búsqueda de noticias | No |
| `panel/datos/agenda.json` | La agenda del municipio de la última hora | No |
| `panel/datos/usuarios.json` | Los usuarios con su hash | No |
| `panel/datos/secreto.txt` | La firma de las sesiones | No (y no se respalda) |
| `web/data/decisiones.json` | Lo que la web necesita de las decisiones | **Sí**, lo sube el panel |
| `web/data/avisos.json` | Los tres avisos | **Sí**, lo sube el panel |
| `web/data/eventos-panel.json` | Los eventos publicados, sólo lo público | **Sí**, lo sube el panel |
| `reels/salida/` | Las piezas armadas en la PC | No |

---

## Por qué hay que reiniciarlo

Node lee el código **una sola vez, al arrancar**, y lo guarda en memoria. Si
alguien cambia algo en `ingesta/`, `panel/`, `reels/`, `CRITERIO-EDITORIAL.md`
o `ingesta/contactos-agenda.json` mientras el panel está prendido, el panel
**sigue trabajando con la versión vieja**: busca con las reglas viejas,
reescribe con la instrucción vieja y muestra el criterio viejo. Para que tome
lo nuevo: **cerrar la ventana negra y volver a correr `ARRANCAR.bat`**. Si
hubo un `git pull` que trajo código nuevo, lo mismo.

---

## Cómo el panel puede pisar datos

1. **Pisa `web/data/decisiones.json`.** El panel tiene las decisiones en
   memoria y cada vez que guarda su estado **reescribe el archivo entero**
   desde esa memoria: al arrancar, con cada botón que se aprieta y después de
   cada ciclo de 10 minutos en que la IA escribió o borró algo (en la práctica,
   casi siempre). Si alguien cambió `decisiones.json` a mano o desde GitHub con
   el panel prendido, ese cambio **se pierde** en la próxima escritura. Por eso,
   para sacar o corregir notas sin el panel se usan **`web/data/retiradas.json`**
   y **`web/data/correcciones.json`**, que el panel no toca nunca.
2. **Pisa `web/data/avisos.json`** si se cargan avisos desde el panel: el
   archivo se arma con lo que el panel lee en ese momento, así que un cambio a
   mano que el panel ya leyó se conserva, pero conviene cargar los avisos sólo
   desde el panel.
3. **El estado del panel no se sincroniza entre PCs.** Si el panel se corriera
   en otra PC, tendría su propio `estado.json` y exportaría otras decisiones.
4. **El respaldo borra copias viejas**: sólo quedan las últimas 14 del destino.

---

## La corrida de la PC y la de la nube no son iguales

Las dos usan la misma ingesta y la misma reescritura, pero:

| | Panel (PC, cada 10 min) | "Actualizar la web" (GitHub, cada 30 min) |
|---|---|---|
| Fuentes | Las del código, con el peso y la pausa que se pusieron en el panel | Las del código tal cual (pausar una fuente en el panel **no** la pausa en la nube) |
| Memoria del cruce de medios | `.cache/` de la PC | `.cache/` de la caché de Actions |
| Identificadores ya publicados (`idsConocidos`) | No los pasa | Sí: una historia conserva su identificador cuando otro medio se suma |
| Lectura con IA, repetidas, medios y cupos después de la IA | No | Sí |
| Qué se reescribe | Las verdes de menos de 72 h, hasta 12 por ciclo | Lo que va a salir, con las reglas de 36 h y 12 h |
| Cuándo una nota "se archiva" | A las 72 h sin decidir (`HORAS_PARA_ARCHIVAR`) | Sale de la portada a las 36 h (`HORAS_EN_PORTADA`) |
| Fotos, dólar, estadística, portada | No | Sí |

Consecuencias:
- En "Para decidir" pueden aparecer notas que en la nube la IA ya sacó, o con
  otra sección, o con otro color.
- Para una historia que cuentan varios medios, el identificador que arma el
  panel **puede no ser el mismo** que el de la nube (la nube prefiere el ya
  publicado; el panel, la nota más vieja de la historia). Si difieren, lo que
  se decida en el panel sobre esa nota no le llega a la web, porque la web
  busca la decisión por identificador. No está medido cuántas veces pasa.

Si en la PC se corre `cd web && npm run datos` con el panel habiendo buscado
al menos una vez, `generar-datos.mjs` trabaja en "modo PC" (lee
`panel/datos/`), sin IA ni fotos. Sirve para mirar la web en la PC
(`npm run dev`), pero deja modificados `portada.json`, `archivo.json` y otros,
que el panel no sube y que después chocan en un `git pull` (`CLAUDE.md`: se
resuelve con `git checkout --theirs`).

---

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `ARRANCAR.bat` | Abre la ventana del panel y el navegador | Hernán, con doble clic | — | — |
| `panel/servidor.mjs` | El servidor: ciclo de 10 min, reescritura, API del tablero, exportar y sincronizar | `ARRANCAR.bat`, `npm run panel` | `panel/datos/*`, `web/data/archivo.json` (antecedentes), `web/data/avisos.json`, `reels/salida/` | `panel/datos/estado.json`, `ultima.json`, `agenda.json`, `web/data/decisiones.json`, `eventos-panel.json`, `avisos.json` |
| `panel/panel.html` | El tablero (las 13 pestañas) | El navegador, desde el servidor | `/api/estado` | Pedidos a la API |
| `panel/acceso.mjs` | Usuarios, claves, sesiones, freno por intentos | `servidor.mjs`, `clave.mjs` | `panel/datos/usuarios.json`, `secreto.txt` | Esos dos |
| `panel/clave.mjs` | Crear una cuenta o cambiar la clave | Una persona, en la consola | `usuarios.json` | `usuarios.json` |
| `panel/seguridad.mjs` | Control de origen y de qué direcciones se pueden probar | `servidor.mjs`, `acceso.mjs` | — | — |
| `panel/notas.mjs` | Qué se puede editar, qué va a la web, poda de decisiones | `servidor.mjs` | — | — |
| `panel/sincronizar.mjs` | Subir a GitHub los tres archivos | `servidor.mjs` | git | Commits |
| `panel/respaldo.mjs` | Copia de `panel/datos/` | `servidor.mjs`; a mano | `panel/datos/` | La carpeta de respaldo |
| `panel/avisos.mjs` | Cargar o borrar un aviso (tres espacios) | `servidor.mjs` | — | — |
| `panel/agenda.mjs` | Eventos a mano, qué es público, a quién pedirle fechas | `servidor.mjs` | `ingesta/contactos-agenda.json` (vía `ingesta/agenda.mjs`) | — |
| `panel/horarios.mjs` | Horarios de las historias fijas y `toca` | `servidor.mjs`, `reels/plan.mjs`, `redes/piezas.mjs` | `estado.horarios` | — |
| `panel/buzon.mjs` | Los cuatro tipos del buzón y sus reglas | `servidor.mjs` | — | — |

---

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Crear una cuenta o cambiar una clave | `node panel/clave.mjs <usuario> "<clave>"` en la PC |
| Que el panel no suba nada a GitHub | Arrancarlo con `SINCRONIZAR_GITHUB=no` |
| Que el respaldo quede fuera de la PC | Variable `RESPALDO_CARPETA` apuntando a Drive u OneDrive (pendiente, `PENDIENTES.md`) |
| Cuántas notas reescribe por ciclo | `REESCRITURAS_POR_CICLO` (`panel/servidor.mjs`) |
| Cada cuánto busca noticias | `setInterval(correrIngesta, 10 * 60 * 1000)` al final de `panel/servidor.mjs` |
| A las cuántas horas archiva lo no decidido | `HORAS_PARA_ARCHIVAR` (`panel/servidor.mjs`) |
| Cuánto tarda en subir a GitHub | `esperaMs` (`panel/sincronizar.mjs`) |
| Qué archivos sube | `archivos` en `crearSincronizador(…)` (`panel/servidor.mjs`) |
| Cuántos días se guardan las decisiones | `DIAS_DE_DECISIONES` (`panel/notas.mjs`) |
| Qué campos del evento son públicos | `CAMPOS_PUBLICOS` (`panel/agenda.mjs`) |
| Los horarios de fábrica de las historias fijas | `HISTORIAS_FIJAS` (`panel/horarios.mjs`) |
| Los espacios publicitarios | `SLOTS_AVISOS` (`panel/avisos.mjs`) y `web/components/avisos.js` |
| Sacar o corregir una nota **sin** el panel | `web/data/retiradas.json`, `web/data/correcciones.json` |

---

## Qué puede fallar y cómo se nota

| Qué pasa | Cómo se nota | Qué hacer |
|---|---|---|
| La PC está apagada o se cerró la ventana | No se pueden decidir amarillas ni cargar avisos o eventos. La web, las redes y la vigilancia siguen. El vigilante avisa por WhatsApp las notas que esperan a una persona | Prender la PC y correr `ARRANCAR.bat` |
| Se cambió código y no se reinició | El panel se comporta "como antes" | Cerrar la ventana y `ARRANCAR.bat` |
| No sube a GitHub | En la ventana: "panel → GitHub: no se pudo subir (…)". La web no ve lo decidido | Revisar internet y `git status` en la PC; se reintenta con el próximo cambio |
| Conflicto de git en la PC | El mismo mensaje con "pull: …" | Resolver a mano (`git pull --rebase`; en `web/data/`, `git checkout --theirs`) |
| Se editó `decisiones.json` a mano con el panel prendido | El cambio desaparece | Usar `retiradas.json` o `correcciones.json` |
| Sin clave de redacción de Gemini | El panel no reescribe solo; "Reescribir con IA" cae al armado mecánico y lo dice | Revisar el `.env` de la PC (lo pega una persona) |
| Gemini sin cupo | "Reescribir con IA" deja la versión mecánica y lo anota en el historial | Esperar o escribir a mano |
| La sesión venció | El tablero vuelve al login | Entrar de nuevo |
| Cinco claves mal | "Demasiados intentos. Probá de nuevo en N minutos." | Esperar |
| Se rompió el disco | Se pierde el historial editorial y el buzón, salvo lo respaldado afuera | Por eso conviene `RESPALDO_CARPETA` |

Lo que vigilan las pruebas: `pruebas/panel.test.mjs`,
`pruebas/panel-seguridad.test.mjs`, `pruebas/acceso.test.mjs`,
`pruebas/respaldo.test.mjs`, `pruebas/horarios.test.mjs`,
`pruebas/agenda-panel.test.mjs`, `pruebas/buzon.test.mjs` y parte de
`pruebas/editor.test.mjs` (ver `docs/10-REGLAS-Y-PRUEBAS.md`).

---

## Lo que sigue abierto

En `PENDIENTES.md`: los horarios del Calendario, que se exportan pero GitHub
no lee; el tamaño de `decisiones.json` (2,5 MB al 28/09, 1.540 decisiones,
1.390 escritas por la IA desde el panel: la poda a 60 días no alcanza porque
cada decisión de la IA lleva el cuerpo y las partes internas); que el panel
escucha en todas las conexiones; que una decisión del panel puede no llegar a
la web si la nota tiene otro identificador en la nube (sale de leer el código,
no está medido); y el comentario viejo de la pestaña "Para redes" (dice que es
"el camino real de todos los días": Meta ya publica sola).

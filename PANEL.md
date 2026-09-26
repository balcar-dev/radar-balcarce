# El panel

*Actualizado el 25/09/2026.* El tablero editorial: donde Hernán y Andrés
deciden qué se publica, cargan avisos y miran el buzón.

## Qué es y dónde vive

- Un servidor de Node (`panel/servidor.mjs`) con una sola página
  (`panel/panel.html`), sin dependencias.
- **Vive en la PC de Hernán, puerto 4321**: `http://localhost:4321`. Se
  arranca con `ARRANCAR.bat` (doble clic después de prender la PC), que
  levanta sólo el panel: la web no corre en la PC.
- Además se puede entrar desde afuera por **Tailscale Funnel**, con la
  dirección que figura en `EMPEZAR-ACA.md`. Mientras la PC esté encendida, ese
  túnel deja el panel abierto a internet y lo protege **sólo la contraseña**.
  Para cerrarlo: `tailscale funnel --https=443 off`.
- **No es un servicio online.** Si la PC está apagada, el panel no existe.

## Quién lo usa

Dos usuarios: **Hernán** y **Andrés**. Cada uno con su contraseña.

- Las contraseñas se ponen o se cambian en la PC del panel con
  `node panel/clave.mjs <usuario> "<contraseña nueva>"`. **No se escriben en
  ningún documento ni se mandan por chat** (`REGLAS.md`, regla 16).
- Se guardan con hash en `panel/datos/usuarios.json`. Las contraseñas
  iniciales se cambiaron el 25/09/2026; si `panel/datos/CLAVES-INICIALES.txt`
  todavía existe, se borra.
- Protecciones (`panel/acceso.mjs` y `panel/seguridad.mjs`, con pruebas en
  `pruebas/acceso.test.mjs` y `pruebas/panel-seguridad.test.mjs`):
  - cookie de sesión firmada, y `Secure` cuando se entra por el túnel;
  - freno de una IP después de cinco intentos fallidos. Desde el 25/09 no se
    puede saltear inventando la IP: el encabezado `X-Forwarded-For` sólo se
    cree si la conexión viene de la misma PC (el túnel);
  - **control de origen**: un pedido que cambia algo y viene de otra página
    se rechaza;
  - **"Salir" es un POST**, no un enlace: otra página no puede cerrar la
    sesión;
  - "probar una fuente" sólo acepta `http` y `https` y no entra a la red de
    la casa ni a la propia PC;
  - el error de acceso no delata si el usuario existe.

## Qué hace cada pestaña

| Pestaña | Para qué |
|---|---|
| **Para decidir** | La cola de notas amarillas (denuncias, detenidos, muertes, chicos, promociones, lo de afuera con poco puntaje, País, la cotización del dólar y lo que tiene verificación baja): publicar, descartar o editar título, copete y cuerpo. Política y Policiales llegan acá sólo si el semáforo las frena: si da verde, salen solas a la web (a las redes, nunca sin una persona). Cada nota tiene, plegado, su **análisis interno** (nivel de verificación y porqué, claves, qué se sabe, qué falta confirmar, fuentes con lo que aportó cada una, antecedentes): es para quien decide, no se muestra en la web. Si la nota **no tiene cuerpo** (menos de 70 palabras), lo avisa y "Publicar" pide confirmarlo con el botón "Publicar igual, sin cuerpo" |
| **Publicadas / Descartadas / Frenadas / Archivadas** | Lo ya decidido. **Frenadas** es el semáforo rojo (menores, víctimas): no se publica ni por error. **Archivadas** son las que pasaron 72 horas sin decidir |
| **Fuentes** | Las 61 fuentes, con sus pesos y temas |
| **Clima y farmacias** | Lo que la web muestra hoy |
| **Agenda** | Eventos del municipio, carga y publicación de eventos a mano (cada uno con su página en la web) y la base de contactos para pedir fechas. Ver "La agenda" más abajo |
| **Calendario** | Horarios de las historias fijas (sólo rigen en la PC; en GitHub valen los de `panel/horarios.mjs`) |
| **Para redes** | Las piezas armadas |
| **Buzón** | Datos, reclamos, opiniones y seguimientos que manda la gente, con la regla de cada tipo (`panel/buzon.mjs`) |
| **Avisos** | Los tres espacios publicitarios (`PUBLICIDAD.md`) |
| **Cómo escribe la IA** | La instrucción exacta que lee la IA, que sale tal cual de `CRITERIO-EDITORIAL.md` (sección 12), y debajo, plegado, el criterio editorial completo. Si se cambia el archivo, el panel lo muestra (y la IA lo usa) después de reiniciarlo |

## Qué pasa con lo que se decide

**Sincronización** (`panel/sincronizar.mjs`): unos segundos después del último
cambio, el panel sube solo a GitHub `web/data/decisiones.json`,
`web/data/avisos.json` y (desde el 25/09) `web/data/eventos-panel.json`, los
eventos publicados desde la pestaña Agenda. Con eso "Actualizar la web" respeta lo decidido aunque
la PC se apague. Si algo falla (sin internet, un conflicto de git), lo cuenta en
la consola y no rompe el panel: el cambio queda en el archivo y se sube en el
siguiente intento. Se apaga con `SINCRONIZAR_GITHUB=no`. Al exportar,
`decisiones.json` se poda: se van las decisiones de más de 60 días, salvo lo
que una persona sacó de circulación.

**La reescritura del panel es la misma que la de la nube** (desde el 25/09):
`reescribirPendientes` llama a `reescribirAutomaticas` (`reels/reescritura.mjs`)
con las mismas reglas: texto completo de las fuentes, cuerpo obligatorio,
oraciones dudosas sacadas, tres intentos por nota (`estado.intentosIA`, en
`panel/datos/`), semáforo sobre todo lo escrito, verificación baja que espera
a una persona, la cotización del dólar afuera y nada de "en vivo" en los
títulos. El botón "Reescribir con IA" también baja el texto completo y saca
las oraciones que no cuadran. **Después de actualizar el código hay que
reiniciar el panel** (cerrar su ventana y correr `ARRANCAR.bat`).

**El panel ya no publica la web.** Hasta el 25/09 intentaba subir a Vercel
cada 2 horas y regeneraba `portada.json`; se sacó. La web la arma y la
publica GitHub ("Actualizar la web" → Cloudflare Pages).

**Lo que NO se sincroniza, a propósito:** `panel/datos/` (usuarios con hash,
buzón con datos de personas, la copia de la agenda del municipio, cuándo se le
escribió a cada contacto, quién avisó cada evento, cuota de Gemini). Está en
`.gitignore`. De los eventos cargados a mano sólo sale lo público y sólo lo
publicado (`eventosParaLaWeb` en `panel/agenda.mjs`): nunca quién avisó ni su
teléfono. La agenda de la semana como historia todavía se arma sólo en la PC
(`PENDIENTES.md`).

## La agenda: eventos con página y contactos para pedir fechas

Desde el 25/09 (`panel/agenda.mjs`; el criterio, en `CRITERIO-EDITORIAL.md` § 8).

**Cargar un evento que avisó alguien:**

1. Pestaña **Agenda** → formulario **Cargar un evento** (a la derecha): nombre,
   fecha (`2026-10-15`) y, si se sabe, hora (`20:30`), cuándo termina, lugar,
   dirección, entrada, quién organiza, página de entradas y una descripción.
   Todo eso **sale en la web tal cual**. "Quién lo avisó" queda en el panel.
2. Si la fecha está **confirmada por quien organiza**, tildar "Publicar ya en la
   web". Si no, se carga como **borrador** y se publica después con el botón
   **Publicar en la web** de su tarjeta. Una fecha aproximada no se publica.
3. En la próxima corrida de GitHub (media hora como mucho) el evento tiene su
   página. La tarjeta muestra la dirección. **Sacar de la web** o **Borrar** la
   hacen desaparecer en la corrida siguiente.

**Una fiesta del calendario anual** (Automovilismo, Postre, Balcarce Corre…):
cuando el organizador confirma la fecha, botón **Ya tengo la fecha** (tarjeta
"Se acercan estas fechas anuales" o "Todo el calendario anual"): llena el
formulario con el nombre y lo liga a la fiesta, y la web cambia "fecha a
confirmar" por la fecha con enlace.

**Pedirle fechas a las instituciones** (tarjeta "A quién pedirle fechas", abajo):

1. **A quién escribir este mes** muestra los que suelen tener eventos en los
   próximos 45 días y a los que no se les escribió en los últimos 30. **Todos**
   muestra la base completa (43 instituciones al 25/09).
2. **Escribir por WhatsApp** abre WhatsApp con el mensaje ya escrito (o
   **Escribir por mail**, el correo). **El panel no manda nada solo**: lo manda
   una persona desde el WhatsApp o el correo de Radar. Sin WhatsApp ni mail,
   **Ver mensaje**, copiarlo y mandarlo por Instagram o Facebook.
3. Después, **Le escribimos hoy**. Si varios comparten el mismo número (el de
   Turismo sirve para el autódromo y varias fiestas), vale para todos.
4. Cuando contestan, **Respondió**, y si mandan una fecha, **Cargar un evento
   suyo**: el formulario queda con ellos como organizadores.

**La base de contactos** está en `ingesta/contactos-agenda.json`: por cada
institución, qué organiza, en qué meses (sólo si hay una fuente que lo
respalde), sus canales **oficiales** (teléfono, WhatsApp, mail, Instagram,
Facebook, web), la dirección de donde salió cada dato y cuándo se verificó. El
repositorio es público: nunca un celular personal que la institución no
publique como contacto. Se suma o se corrige editando ese archivo (y
reiniciando el panel). No se mezcla con `comercial/`: aquello son comercios
para vender publicidad; esto, organizadores para pedir fechas.

**Respaldo** (`panel/respaldo.mjs`): copia `panel/datos/` al arrancar y cada 6
horas, con las últimas 14 copias. Por defecto va a `respaldos/` junto al
proyecto (también ignorada por git). Con la variable `RESPALDO_CARPETA`
apuntando a una carpeta de Drive u OneDrive, la copia queda también afuera de
la PC. **Pendiente**: apuntarla (`PENDIENTES.md`). Nunca va a GitHub: hay
usuarios y datos de gente. **Desde el 25/09 no copia `CLAVES-INICIALES.txt`
ni `secreto.txt`** (las claves en texto plano y la firma de las sesiones).
Las copias viejas de `respaldos/` todavía los tienen: hay que borrarlos a
mano.

Cada cambio en `ingesta/`, `panel/` o `reels/` exige **reiniciar el panel**
(cerrar su ventana y correr `ARRANCAR.bat`): Node carga el código al arrancar.
**Los arreglos del 25/09 (seguridad, respaldo, Vercel) sólo corren después de
reiniciarlo.**

## La limitación: no es online

Consecuencias de vivir en una PC:

- Con la PC apagada no se pueden decidir notas amarillas ni cargar avisos.
  Todo lo demás sigue (la web, las redes, la vigilancia).
- El túnel de Tailscale expone la PC de Hernán a internet, protegido por una
  contraseña.
- Si se rompe el disco, se pierde el historial editorial, salvo lo respaldado
  afuera.

## Opciones para pasarlo online sin costo

Ninguna está decidida ni probada. Los límites de los planes gratuitos cambian:
verificarlos antes de elegir.

1. **Cloudflare Pages + Functions + Access** (la que mejor encaja, porque el
   sitio ya está ahí). La página del panel queda detrás de Cloudflare Access
   (login por correo, sin contraseñas propias que cuidar) y unas funciones
   escriben las decisiones en el repositorio por la API de GitHub. Los datos
   personales del buzón irían a un almacenamiento de Cloudflare (KV o D1), no
   al repositorio. Es un trabajo mediano: hay que reescribir el servidor como
   funciones.
2. **Lo esencial en el repositorio.** Pasar sólo aprobar notas y cargar avisos
   a una página protegida que escriba `decisiones.json` y `avisos.json` por
   GitHub. Lo que hoy hace la PC (buzón, agenda) queda para después.
3. **Un servidor gratuito** (una máquina virtual de nivel gratuito, o un
   servicio con capa gratuita). El servidor actual ya corre con Node sin
   dependencias, así que se mudaría casi tal cual, pero hay que resolver el
   disco persistente para `panel/datos/`, el respaldo y la seguridad de
   acceso. Muchos planes gratuitos duermen el servicio o borran el disco.
4. **Con gasto (unos USD 5 por mes):** alojar el panel entero en Railway o
   Fly.io. Es lo más simple y lo menos elegante.

Mientras tanto: respaldo apuntado afuera de la PC, contraseñas cambiadas (hecho
el 25/09) y el túnel cerrado cuando no haga falta.

## Relacionado

`EMPEZAR-ACA.md` (enlaces y cómo entrar), `INFRAESTRUCTURA.md`, `CRITERIO-EDITORIAL.md`,
`PUBLICIDAD.md`, `PENDIENTES.md`.

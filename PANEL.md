# El panel

*Actualizado el 25/09/2026.* El tablero editorial: donde Hernán y Andrés
deciden qué se publica, cargan avisos y miran el buzón.

## Qué es y dónde vive

- Un servidor de Node (`panel/servidor.mjs`) con una sola página
  (`panel/panel.html`), sin dependencias.
- **Vive en la PC de Hernán, puerto 4321**: `http://localhost:4321`. Se
  arranca con `ARRANCAR.bat` (doble clic después de prender la PC).
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
- Protecciones (`panel/acceso.mjs`, con pruebas en `pruebas/acceso.test.mjs`):
  cookie de sesión firmada, cookie `Secure` cuando se entra por el túnel, freno
  de una IP después de cinco intentos fallidos, y el error de acceso no delata
  si el usuario existe.

## Qué hace cada pestaña

| Pestaña | Para qué |
|---|---|
| **Para decidir** | La cola de notas amarillas (Política, Policiales, denuncias, detenidos, promociones): publicar, descartar o editar título, copete y cuerpo |
| **Publicadas / Descartadas / Frenadas / Archivadas** | Lo ya decidido. **Frenadas** es el semáforo rojo (menores, víctimas): no se publica ni por error. **Archivadas** son las que pasaron 72 horas sin decidir |
| **Fuentes** | Las 33 fuentes, con sus pesos y temas |
| **Clima y farmacias** | Lo que la web muestra hoy |
| **Agenda** | Eventos del municipio, carga a mano y recordatorio mensual a los organizadores |
| **Calendario** | Horarios de las historias fijas (sólo rigen en la PC; en GitHub valen los de `panel/horarios.mjs`) |
| **Para redes** | Las piezas armadas |
| **Buzón** | Datos, reclamos, opiniones y seguimientos que manda la gente, con la regla de cada tipo (`panel/buzon.mjs`) |
| **Avisos** | Los tres espacios publicitarios (`PUBLICIDAD.md`) |
| **Cómo escribe la IA** | El prompt exacto que lee la IA (`EDITORIAL.md`) |

## Qué pasa con lo que se decide

**Sincronización** (`panel/sincronizar.mjs`): unos segundos después del último
cambio, el panel sube solo a GitHub `web/data/decisiones.json` y
`web/data/avisos.json`. Con eso "Actualizar la web" respeta lo decidido aunque
la PC se apague. Si algo falla (sin internet, un conflicto de git), lo cuenta en
la consola y no rompe el panel: el cambio queda en el archivo y se sube en el
siguiente intento. Se apaga con `SINCRONIZAR_GITHUB=no`.

**Lo que NO se sincroniza, a propósito:** `panel/datos/` (usuarios con hash,
buzón con datos de personas, agenda, cuota de Gemini). Está en `.gitignore`.
Por eso la agenda de la semana como historia sólo se arma en la PC.

**Respaldo** (`panel/respaldo.mjs`): copia `panel/datos/` al arrancar y cada 6
horas, con las últimas 14 copias. Por defecto va a `respaldos/` junto al
proyecto (también ignorada por git). Con la variable `RESPALDO_CARPETA`
apuntando a una carpeta de Drive u OneDrive, la copia queda también afuera de
la PC. **Pendiente**: apuntarla (`PENDIENTES.md`). Nunca va a GitHub: hay
contraseñas y datos de gente.

Cada cambio en `ingesta/`, `panel/` o `reels/` exige **reiniciar el panel**
(cerrar su ventana y correr `ARRANCAR.bat`): Node carga el código al arrancar.

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

`EMPEZAR-ACA.md` (enlaces y cómo entrar), `INFRAESTRUCTURA.md`, `EDITORIAL.md`,
`PUBLICIDAD.md`, `PENDIENTES.md`.

# Infraestructura: qué corre dónde

*Actualizado el 26/09/2026.* Este documento responde tres preguntas: **qué
corre en cada lugar**, **qué se cae y cómo se ve**, y **qué vence y cuándo**.
Los secretos figuran por nombre; los valores no se escriben en ningún
documento (ver `REGLAS.md`, regla 16).

## El mapa

```
cron-job.org ──(cada 30 min, 3 trabajos)──▶ GitHub Actions ──▶ Cloudflare Pages ──▶ radarbalcarce.com
                                               │  ├─ Actualizar la web  (ingesta, IA, arma la web)
                                               │  ├─ Redes             (Facebook, Instagram, piezas)
                                               │  ├─ Vigilancia        (revisa y avisa)
                                               │  ├─ Cloudflare Pages  (sube el sitio)
                                               │  ├─ Auditoría         (lunes)
                                               │  └─ A mano: Piezas, Auditar redes, Auditar voz,
                                               │     Ver Facebook y las tres pruebas
                                               ├──▶ Meta (Facebook + Instagram)
                                               ├──▶ Gemini (redacción y voces)
                                               └──▶ CallMeBot ──▶ WhatsApp de Hernán
PC de Hernán: el panel (puerto 4321) ── sincroniza decisiones a GitHub
```

## Qué corre en cada lugar

| Dónde | Qué hace | Cuenta |
|---|---|---|
| **GitHub Actions** (repo `balcar-dev/radar-balcarce`) | Todo el trabajo automático. La PC apagada no importa. El repositorio es **público desde el 25/09**: los repos públicos no gastan minutos de Actions. Privado, el plan gratis trae 2.000 minutos por mes y se usaban unos 360 por día: se acababan hacia el día 6. Se revisó todo el historial y no hay ninguna clave en el repo; las claves viven en GitHub Secrets. (El WhatsApp que aparece en `web/lib/datos.js` es el de contacto público del sitio.) | `balcardev@gmail.com` |
| **Cloudflare Pages** | Sirve la web (`radarbalcarce.com` y `www`, que redirige con 301 al dominio sin `www`). El DNS del dominio también está en Cloudflare. Web Analytics activado. Los encabezados de lo publicado (tipo de la imagen para compartir, HSTS y otros de seguridad, caché de un año para `/_next/static`) están en `web/public/_headers`. | `radarbalcarce@gmail.com` |
| **Vercel** | **Apagado desde el 25/09** (sin conexión a GitHub: no despliega ni recibe el dominio). El panel tampoco publica ahí. Falta borrar el proyecto y limpiar el DNS que quedó (`PENDIENTES.md`). El plan Hobby no permite publicidad. | `radarbalcarce@gmail.com` |
| **cron-job.org** | Dispara tres trabajos en GitHub cada 30 minutos: "Actualizar la web", el reloj de "Redes" y "Vigilancia". | `radarbalcarce@gmail.com` |
| **Meta** (app "Radar Balcarce Publicador") | Publicar en la página de Facebook "Radar Balcarce" y en Instagram `@radarbalcarce`. Usuario del sistema `publicador-radar`, token sin vencimiento. **La app se publicó (modo activo) el 26/09**: hasta entonces estaba en modo desarrollo y el público no veía los posteos ni los reels de Facebook (las historias sí). | `radarbalcarce@gmail.com` |
| **Gemini** (Google) | Dos claves separadas: una gratis para redactar las notas y otra (paga) para las voces y los reels. | `radarbalcarce@gmail.com` |
| **CallMeBot** | Manda el WhatsApp de la vigilancia, sólo al número que lo activó. **Funciona desde el 25/09.** | El teléfono de Hernán |
| **Search Console** | Indexación en Google (propiedad de dominio). | `radarbalcarce@gmail.com` |
| **La PC de Hernán** | El panel y su carpeta `panel/datos/`. Ver `PANEL.md`. | — |

### Los workflows (`.github/workflows/`)

Un **workflow** es una tarea automática de GitHub; se ven en la pestaña Actions.
Son doce. La columna "Cuesta" dice si gasta plata (sólo Gemini con la clave paga
puede costar: todo lo demás es gratis).

| Workflow | Cuándo corre | Qué hace | Cuesta |
|---|---|---|---|
| `actualizar.yml` · Actualizar la web | cron-job.org cada 30 min (y un `schedule` propio de GitHub, que es impuntual, como respaldo) | Lee las 58 fuentes, reescribe con IA lo que sale sin revisión, corre las pruebas, arma `web/data/portada.json` (sólo notas de las últimas 72 h) y `web/data/archivo.json` (lo publicado de los últimos 180 días) y los sube. Tiempo máximo: 20 minutos. **Si las pruebas fallan, la web se queda como estaba.** | Gemini: primero la clave gratis; la paga sólo si la gratis se queda sin cupo. Tope de 150 notas por día |
| `cloudflare-deploy.yml` · Cloudflare Pages | Al terminar bien "Actualizar la web"; también a mano | Compila el sitio y lo sube a Cloudflare Pages con `wrangler` en una versión fija (4.139.0). Tiempo máximo: 15 minutos. | No |
| `redes.yml` · Redes | cron-job.org cada 30 min, de 7 a 23 (y al terminar "Actualizar la web"); a mano con `reloj`, `verificar` o `facebook` | Publica en Facebook y, si a esa hora toca una pieza, la arma con la voz de Gemini y la sube a Instagram y a la página. Tiempo máximo: 25 minutos. | Sí, sólo cuando arma una pieza (voz, clave paga). Sin pieza que armar, no gasta |
| `piezas.yml` · Piezas | A mano (Actions → Piezas → Run workflow) | Armar o publicar una pieza puntual, sin esperar su hora. | Sí (voz, clave paga) |
| `vigilancia.yml` · Vigilancia | cron-job.org cada 30 min (y un `schedule` propio como respaldo); a mano con `probar-resumen` o `probar-cierre` | Corre `redes/vigilar.mjs`. Si encuentra un problema deja un aviso amarillo en Actions (no una falla roja) y manda el WhatsApp. | No |
| `auditoria.yml` · Auditoría | Lunes, 12:00 UTC (9:00 en Balcarce); también a mano | Corre `redes/auditar.mjs`: medidas de imágenes, íconos, SEO en vivo y antigüedad de `FORMATOS.md`. Y `redes/auditar-redes.mjs --semana`: el contrato de las redes de los últimos 7 días (sólo en el registro). | No |
| `auditar-redes.yml` · Auditar redes | A mano (Actions → Auditar redes → Run workflow) | Audita el contrato del día de Facebook e Instagram contra lo que Meta tiene publicado (hoy, ayer, la semana y lo que devuelve Meta). **Sólo lee, no manda WhatsApp.** Necesita `META_TOKEN`. Ver `REDES.md`, "El contrato del día". | No |
| `auditar-voz.yml` · Auditar voz | A mano, sólo cuando se toca la voz | Genera unos clips cortos con la voz de siempre, le pide a Gemini la transcripción y comprueba que diga "Radar Balcarce", que la dirección termine en "punto com" y que el saludo sea el de la hora (`CRITERIO-REDES.md`, sección 7). Nunca en lazo. | Centavos (unos pocos audios cortos, clave paga) |
| `ver-facebook.yml` · Ver Facebook | A mano | Muestra qué hay publicado de verdad en la página de Facebook (posteos, reels, historias, visibilidad y configuración de la app). Sólo mira: no publica. Sirve para comprobar que el público ya ve lo que se publica. Necesita `META_TOKEN`. | No |
| `prueba-estadisticas.yml` · Prueba de estadísticas | A mano | Muestra las visitas de la web y los números de Facebook e Instagram, y qué permisos faltan. No guarda ni avisa. | No |
| `prueba-gemini.yml` · Prueba de Gemini | A mano | Un pedido mínimo con la clave gratis de redacción, para saber si anda. | No (clave gratis) |
| `prueba-whatsapp.yml` · Prueba de WhatsApp | A mano (Actions → Prueba de WhatsApp → Run workflow) | Manda un mensaje de prueba y muestra lo que contestó CallMeBot. Sirve para ver que los secretos de WhatsApp están bien. | No |

Todos comparten el huso horario de Balcarce (`TZ: America/Argentina/Buenos_Aires`)
donde importa la hora, porque el servidor corre en UTC. Los que no necesitan
escribir en el repositorio tienen permiso de sólo lectura. "Redes" y "Piezas"
comparten un candado (`concurrency: redes`) para que nunca publiquen dos a la
vez.

## Secretos y variables

Un **secreto** es una clave guardada en GitHub que los workflows usan sin que
nadie la vea. Están en GitHub → Settings → Secrets and variables → Actions.
**Los valores los pega una persona, nunca un chat ni un archivo del repo.**
Desde el repo no se puede ver qué está cargado: la columna "Estado" sale de lo
que se cargó y probó según este proyecto (al 26/09/2026); ante la duda, mirar
esa pantalla o correr el workflow de prueba que corresponda.

| Nombre | Tipo | Estado | Para qué |
|---|---|---|---|
| `META_TOKEN` | Secreto | Cargado. **Faltan permisos** | Publicar en Facebook e Instagram, leer seguidores y **auditar lo publicado** (el cierre de las 23:30, "Auditar redes" y "Ver Facebook" sólo leen). No vence. Para vistas, alcance e interacciones le faltan los permisos `read_insights` e `instagram_manage_insights` (al regenerarlo, tildar TODOS los de ahora más esos dos). |
| `GEMINI_API_KEY_REDES` | Secreto | Cargado | Voces y reels (clave paga). Sin ella los reels no arrancan. |
| `GEMINI_API_KEY_REDACCION` | Secreto | Cargado y probada el 25/09 | Redactar notas. Acepta el nombre viejo `GEMINI_API_KEY`. Es gratis: la reescritura usa esta primero y pasa a la de redes (paga) sólo si se queda sin cupo. El registro de "Actualizar la web" dice cuántos pedidos fueron a cada una. Se prueba con "Prueba de Gemini". |
| `CLOUDFLARE_API_TOKEN` | Secreto | Cargado | Subir el sitio a Cloudflare Pages. |
| `CLOUDFLARE_ACCOUNT_ID` | Secreto | Cargado | Idem (también para las estadísticas). |
| `CLOUDFLARE_ANALYTICS_TOKEN` | Secreto | **Falta cargarlo** | Leer las visitas de Cloudflare Web Analytics para las estadísticas. Token de Cloudflare con permiso *Account · Account Analytics · Read*. Sin él, el resumen dice "falta permiso de Analytics". |
| `WHATSAPP_TELEFONO` | Secreto | Cargado | Número al que la vigilancia manda los avisos: **completo, con 549 adelante**, sin + ni espacios, el mismo con el que se activó CallMeBot. Hasta el 25/09 estaba cargado con 7 dígitos y no llegaba nada. |
| `WHATSAPP_APIKEY` | Secreto | Cargado | La clave que da CallMeBot al activarse: un número corto. Si CallMeBot contesta "APIKey is invalid", está mal copiada. |
| `GITHUB_TOKEN` | Automático | — | Lo pone GitHub en cada corrida. No se carga. |
| `REDES_ACTIVAS` | Variable | `Si` (publica) | El interruptor. Con `Si` (cualquier mayúscula o tilde) publica; con otra cosa sólo simula. |
| `CLOUDFLARE_PROJECT` | Variable (opcional) | No está cargada | Sin ella el workflow usa `radar-balcarce`, que es el nombre real del proyecto de Pages. Sólo haría falta si el proyecto cambiara de nombre. |

Fuera de GitHub:

- **cron-job.org** guarda un token de GitHub (fine-grained, sólo este
  repositorio, permiso Actions: lectura y escritura) en el encabezado
  `Authorization` de sus tres trabajos.
- **En la PC**, el archivo `.env` (ignorado por git) con las claves de Gemini
  para trabajar localmente.
- **Falta un tope de presupuesto en Google Cloud** para la clave paga de
  Gemini (`PENDIENTES.md`).

### Avisos por WhatsApp y estadísticas (25/09)

El vigilante (`redes/vigilar.mjs`, `redes/avisos.mjs`) junta todo en **un solo
WhatsApp por corrida**, con los problemas primero:

- **Problemas** (web, corridas, reloj de redes, piezas del día, vencimientos): una vez cada 6 h por problema.
- **Notas esperando a una persona**: cada 3 h como mucho y sólo si hay nuevas. Salen del campo `pendientes` de `portada.json`, que escribe `generar-datos` sin notas rojas y sin titular en Policiales o si habla de chicos o víctimas.
- **Noticia de Balcarce muy importante**: relevancia 100 y la misma noticia en 3 medios o más; 2 por día como mucho.
- **Lo que salió en redes** desde la corrida anterior, en una línea por pieza.
- **Estadísticas** a las 9 (`redes/estadisticas.mjs`; historia en `web/data/estadisticas.json`, sólo números).
- **Resumen del día** a las 21, siempre: notas, el **contrato del día** de Facebook e Instagram (posteos, reels e historias, con lo que falta y lo que está a tiempo), pendientes, problemas y estadísticas.
- **Cierre del día** a las 23:30, una vez por día (`fechaDelCierre` en `redes/vigilar.mjs`): compara el contrato con lo que Meta tiene publicado de verdad. **Sólo avisa si hay discrepancias**; si todo cuadra, la línea "completos ✓" viaja en el próximo mensaje normal. Usa `META_TOKEN` (sólo lee; nunca se imprime). El duplicado en el libro no espera al cierre: es un problema de prioridad alta en la corrida.

Lo ya avisado se guarda en `web/data/vigilancia.json` (también `ultimoCierre` y `cierreOk`). Para ver cómo llega el
resumen sin guardar nada: Actions → Vigilancia → Run workflow → modo "probar-resumen"; para el cierre, "probar-cierre" (muestra el informe contra Meta y el WhatsApp que saldría, sin mandarlo).

## Vencimientos

| Qué | Cuándo | Qué hacer | Quién avisa |
|---|---|---|---|
| Token de GitHub de cron-job.org | **21/09/2027** | Crear otro y pegarlo en los **tres** trabajos de cron-job.org | El vigilante, por WhatsApp, 30 días antes (alta en la última semana) |
| Dominio `radarbalcarce.com` (DonWeb) | **21/09/2027** | Renovarlo en DonWeb. El DNS está en Cloudflare, pero el registro del dominio sigue en DonWeb | El vigilante, por WhatsApp, 30 días antes (grave en la última semana) |
| Medidas de imágenes de las redes (`FORMATOS.md`) | Cada 90 días desde el 24/09/2026 | Volver a mirar las medidas | La auditoría semanal, por WhatsApp |
| `META_TOKEN` | No vence | — | — |
| Número de CallMeBot | Cambia de vez en cuando | Ver `redes/whatsapp.mjs` | Nadie: si el WhatsApp deja de llegar, mirar ahí |

## Qué se cae y cómo se ve

| Falla | Cómo se nota | Qué hacer |
|---|---|---|
| **cron-job.org desactiva un trabajo** (lo hace solo si falla varias veces seguidas) | La web deja de actualizarse o no salen piezas. El vigilante avisa "no hay corridas nuevas" (`reloj-Actualizar la web`, `reloj-Redes`) | Entrar a console.cron-job.org/jobs y reactivar. Es lo **primero** que hay que mirar. Si se cae el propio trabajo de Vigilancia, no llega ningún aviso: ver que el resumen de las 21 llegue. |
| **La web no responde** | Aviso `web-caida` | Mirar Cloudflare Pages y el último "Cloudflare Pages" en Actions. |
| **La web no se actualiza** (más de 100 min) | Aviso `web-vieja` | Ver "Actualizar la web" en Actions; suele ser cron-job.org o una prueba que falló. |
| **Un workflow falla** | Aviso `falla-<nombre>` (alta si fallaron 3 de las últimas 5) | Abrir la corrida en Actions y leer el paso rojo. |
| **No salió una pieza fija** (clima, farmacia) | Aviso `pieza-…` una vez cerrada su ventana | Publicarla a mano en Piezas; revisar Gemini y `META_TOKEN`. |
| **Pocas notas con cuerpo** | Aviso `pocos-cuerpos` | Revisar la clave de Gemini, la cuota y el verificador. |
| **Se rompió una regla de contenido** | Avisos `regla-la-vimos`, `regla-hora-farmacia`, `regla-fuentes` | Ver `REGLAS.md`. |
| **`www` dejó de redirigir** | Aviso `www` (leve) | Revisar la regla de redirección en Cloudflare. |
| **Meta bloquea la API** (pasó del 22 al 24/09) | Fallan "Redes" y las piezas | Detalle en `REDES.md`. |
| **Se publica pero el público no lo ve** (pasó hasta el 26/09: la app estaba en modo desarrollo) | Nadie avisa: la página se ve bien para quien tiene un rol en la app | Correr **Ver Facebook** y mirar la página desde una cuenta que no sea administradora. |
| **La auditoría dejó de correr** | Aviso `auditoria-vencida` | Ver el workflow "Auditoría". |
| **El WhatsApp no llega** | Silencio (no llega el resumen de las 21) | Correr Actions → **Prueba de WhatsApp**. Si falla, revisar los dos secretos (teléfono completo con 549, la clave de CallMeBot). Sin los secretos, la vigilancia corre pero no avisa. El log de "Vigilancia" en Actions siempre dice qué encontró. |
| **La PC está apagada** | Sólo se ve en el panel: no se pueden decidir notas amarillas ni cargar avisos | Nada se rompe: la web, las redes y la vigilancia siguen. |

Los avisos se repiten a lo sumo una vez cada 6 horas por problema, y a las 21
llega un resumen "todo bien" si no hay nada. Si un día no llega ese resumen,
algo anda mal con la vigilancia misma.

## Qué hay que hacer a mano y cada cuánto

- **Mirar los tres trabajos de cron-job.org** cuando algo deja de salir.
- **Renovar el token de GitHub** antes del 21/09/2027.
- **Re-verificar las medidas de `FORMATOS.md`** cada 90 días (la auditoría avisa).
- **Decidir las notas amarillas** en el panel (`PANEL.md`).

## Documentos relacionados

`REDES.md` (qué se publica y cuándo), `REGLAS.md` (qué vigila cada regla),
`FORMATOS.md`, `PANEL.md`, `PENDIENTES.md`.

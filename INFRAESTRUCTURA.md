# Infraestructura: qué corre dónde

*Actualizado el 25/09/2026.* Este documento responde tres preguntas: **qué
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
                                               │  ├─ Piezas            (a mano)
                                               │  └─ Auditoría         (lunes)
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
| **Meta** (app "Radar Balcarce Publicador") | Publicar en la página de Facebook "Radar Balcarce" y en Instagram `@radarbalcarce`. Usuario del sistema `publicador-radar`, token sin vencimiento. | `radarbalcarce@gmail.com` |
| **Gemini** (Google) | Dos claves separadas: una para redactar las notas y otra (paga) para las voces y los reels. | `radarbalcarce@gmail.com` |
| **CallMeBot** | Manda el WhatsApp de la vigilancia, sólo al número que lo activó. **Funciona desde el 25/09.** | El teléfono de Hernán |
| **Search Console** | Indexación en Google (propiedad de dominio). | `radarbalcarce@gmail.com` |
| **La PC de Hernán** | El panel y su carpeta `panel/datos/`. Ver `PANEL.md`. | — |

### Los workflows (`.github/workflows/`)

| Workflow | Cuándo corre | Qué hace |
|---|---|---|
| `actualizar.yml` · Actualizar la web | cron-job.org cada 30 min (y un `schedule` propio de GitHub, que es impuntual, como respaldo) | Lee las 45 fuentes, reescribe con IA lo que sale sin revisión, corre las pruebas, arma `web/data/portada.json` (sólo notas de las últimas 72 h) y `web/data/archivo.json` (lo publicado de los últimos 180 días) y los sube. Tiempo máximo: 20 minutos. **Si las pruebas fallan, la web se queda como estaba.** |
| `cloudflare-deploy.yml` · Cloudflare Pages | Al terminar "Actualizar la web" | Compila el sitio y lo sube a Cloudflare Pages con `wrangler` en una versión fija (4.139.0). Tiempo máximo: 15 minutos. |
| `redes.yml` · Redes | cron-job.org cada 30 min, de 7 a 23 (y al terminar "Actualizar la web") | Publica en Facebook y, si a esa hora toca una pieza, la arma con la voz de Gemini y la sube a Instagram y a la página. |
| `piezas.yml` · Piezas | A mano (Actions → Piezas → Run workflow) | Armar o publicar una pieza puntual. |
| `vigilancia.yml` · Vigilancia | cron-job.org cada 30 min (y un `schedule` propio como respaldo) | Corre `redes/vigilar.mjs`. Si encuentra un problema deja un aviso amarillo en Actions (no una falla roja) y manda el WhatsApp. |
| `prueba-estadisticas.yml` · Prueba de estadísticas | A mano | Muestra las visitas de la web y los números de Facebook e Instagram, y qué permisos faltan. No guarda ni avisa. |
| `prueba-whatsapp.yml` · Prueba de WhatsApp | A mano (Actions → Prueba de WhatsApp → Run workflow) | Manda un mensaje de prueba. Sirve para ver que los secretos de WhatsApp están bien. |
| `auditoria.yml` · Auditoría | Lunes, 12:00 UTC (9:00 en Balcarce) | Corre `redes/auditar.mjs`: medidas de imágenes, íconos, SEO en vivo y antigüedad de `FORMATOS.md`. |

Todos comparten el huso horario de Balcarce (`TZ: America/Argentina/Buenos_Aires`)
donde importa la hora, porque el servidor corre en UTC. Los que no necesitan
escribir en el repositorio tienen permiso de sólo lectura. "Redes" y "Piezas"
comparten un candado (`concurrency: redes`) para que nunca publiquen dos a la
vez.

## Secretos y variables

En GitHub → Settings → Secrets and variables → Actions. **Los valores los
pega una persona, nunca un chat ni un archivo del repo.**

| Nombre | Tipo | Para qué |
|---|---|---|
| `META_TOKEN` | Secreto | Publicar en Facebook e Instagram, y leer seguidores. No vence. Para vistas, alcance e interacciones le faltan los permisos `read_insights` e `instagram_manage_insights` (al regenerarlo, tildar TODOS los de ahora más esos dos). |
| `GEMINI_API_KEY_REDES` | Secreto | Voces y reels (clave paga). Sin ella los reels no arrancan. |
| `GEMINI_API_KEY_REDACCION` | Secreto | Redactar notas. Acepta el nombre viejo `GEMINI_API_KEY`. **Cargada el 25/09**: la reescritura usa esta primero (gratis) y pasa a la de redes (paga) sólo si se queda sin cupo. El registro de "Actualizar la web" dice cuántos pedidos fueron a cada una. Se prueba con el workflow "Prueba de Gemini". |
| `CLOUDFLARE_API_TOKEN` | Secreto | Subir el sitio a Cloudflare Pages. |
| `CLOUDFLARE_ACCOUNT_ID` | Secreto | Idem (también para las estadísticas). |
| `CLOUDFLARE_ANALYTICS_TOKEN` | Secreto (**falta cargarlo**) | Leer las visitas de Cloudflare Web Analytics para las estadísticas. Token de Cloudflare con permiso *Account · Account Analytics · Read*. Sin él, el resumen dice "falta permiso de Analytics". |
| `WHATSAPP_TELEFONO` | Secreto | Número al que la vigilancia manda los avisos: **completo, con 549 adelante**, sin + ni espacios, el mismo con el que se activó CallMeBot. Hasta el 25/09 estaba cargado con 7 dígitos y no llegaba nada. |
| `WHATSAPP_APIKEY` | Secreto | La clave que da CallMeBot al activarse: un número corto. Si CallMeBot contesta "APIKey is invalid", está mal copiada. |
| `GITHUB_TOKEN` | Automático | Lo pone GitHub en cada corrida. No se carga. |
| `REDES_ACTIVAS` | Variable | El interruptor. Con `Si` (cualquier mayúscula o tilde) publica; con otra cosa sólo simula. |
| `CLOUDFLARE_PROJECT` | Variable (opcional) | **No está cargada**: sin ella el workflow usa `radar-balcarce`, que es el nombre real del proyecto de Pages. Sólo haría falta si el proyecto cambiara de nombre. |

### Avisos por WhatsApp y estadísticas (25/09)

El vigilante (`redes/vigilar.mjs`, `redes/avisos.mjs`) junta todo en **un solo
WhatsApp por corrida**, con los problemas primero:

- **Problemas** (web, corridas, reloj de redes, piezas del día, vencimientos): una vez cada 6 h por problema.
- **Notas esperando a una persona**: cada 3 h como mucho y sólo si hay nuevas. Salen del campo `pendientes` de `portada.json`, que escribe `generar-datos` sin notas rojas y sin titular en Policiales o si habla de chicos o víctimas.
- **Noticia de Balcarce muy importante**: relevancia 100 y la misma noticia en 3 medios o más; 2 por día como mucho.
- **Lo que salió en redes** desde la corrida anterior, en una línea por pieza.
- **Estadísticas** a las 9 (`redes/estadisticas.mjs`; historia en `web/data/estadisticas.json`, sólo números).
- **Resumen del día** a las 21, siempre: notas, redes, piezas, pendientes, problemas y estadísticas.

Lo ya avisado se guarda en `web/data/vigilancia.json`. Para ver cómo llega el
resumen sin guardar nada: Actions → Vigilancia → Run workflow → modo "probar-resumen".

Fuera de GitHub:

- **cron-job.org** guarda un token de GitHub (fine-grained, sólo este
  repositorio, permiso Actions: lectura y escritura) en el encabezado
  `Authorization` de sus tres trabajos.
- **En la PC**, el archivo `.env` (ignorado por git) con las claves de Gemini
  para trabajar localmente.

## Vencimientos

| Qué | Cuándo | Qué hacer | Quién avisa |
|---|---|---|---|
| Token de GitHub de cron-job.org | **21/09/2027** | Crear otro y pegarlo en los **tres** trabajos de cron-job.org | El vigilante, por WhatsApp, 30 días antes (alta en la última semana) |
| Dominio `radarbalcarce.com` (DonWeb) | **21/09/2027** | Renovarlo en DonWeb. El DNS está en Cloudflare, pero el registro del dominio sigue en DonWeb | El vigilante, por WhatsApp, 30 días antes (grave en la última semana) |
| Medidas de imágenes de las redes (`FORMATOS.md`) | Cada 90 días desde el 24/09/2026 | Volver a mirar las medidas | La auditoría semanal, por WhatsApp |
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

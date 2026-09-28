# 08 · Infraestructura: qué corre dónde

*Escrito el 28/09/2026 leyendo los trece workflows de `.github/workflows/`, el
código que corren y el historial de corridas de GitHub de ese día. Si algo de
acá no coincide con los `.yml` o con el código, mandan ellos. Los secretos
figuran **sólo por nombre**: sus valores no se escriben en ningún documento ni
se pegan en un chat. Qué se publica en las redes está en
[`07-REDES.md`](07-REDES.md); el uso diario (qué hacer cuando algo falla), en
[`11-OPERACION.md`](11-OPERACION.md); cómo se arma la web, en `06-WEB`; el
panel, en `09-PANEL`.*

## En una frase

Todo lo automático corre gratis en GitHub Actions, con la PC apagada: un
servicio externo (cron-job.org) lo despierta cada media hora, GitHub busca las
noticias, escribe con IA (Gemini y Groq), arma la web y la sube a Cloudflare
Pages, publica en Facebook e Instagram con la API de Meta, y un vigilante
revisa todo y avisa por WhatsApp; lo único que se paga es la voz de los videos
(y el dominio).

## Tres palabras antes de empezar

- Un **workflow** es una tarea automática de GitHub. Se ven en la pestaña
  **Actions** del repositorio; cada vez que corre queda una **corrida** en
  verde (bien), rojo (falló) o con un aviso amarillo (terminó bien pero dejó
  algo para mirar).
- Un **secreto** es una clave guardada en GitHub (Settings → Secrets and
  variables → Actions → Secrets) que los workflows usan sin que nadie la vea.
  Una **variable** es lo mismo pero a la vista (la pestaña Variables): hoy hay
  una sola que importa, `REDES_ACTIVAS`.
- Un **token** es una clave que le da permiso a un programa para hacer algo en
  otro servicio. Se trata como una contraseña.

## El mapa

```
                         cron-job.org  (cuenta radarbalcarce@gmail.com)
                         │  cada 30 min: "Actualizar la web" (:00 y :30)
                         │  varias por hora: "Redes" (:05, :35, :45)
                         │  cada 30 min: "Vigilancia" (:00 y :30)
                         ▼
GitHub Actions (repo balcar-dev/radar-balcarce, público, cuenta balcardev@gmail.com)
  ├─ Actualizar la web ──(termina bien)──▶ Cloudflare Pages ──▶ radarbalcarce.com
  │        │                                (sube web/out con wrangler)
  │        └──(termina, bien o mal)──▶ Redes
  ├─ Redes ───────────▶ Meta (página de Facebook + @radarbalcarce)
  ├─ Vigilancia ──────▶ CallMeBot ──▶ WhatsApp de Hernán
  ├─ Auditoría (lunes 9:00)
  └─ A mano: Piezas, Auditar redes, Auditar voz, Ver Facebook, Probar banco
     de fotos, Prueba de estadísticas, Prueba de Gemini, Prueba de WhatsApp

  IA: Gemini (Google AI Studio, cuenta radarbalcarce@gmail.com) y Groq
PC de Hernán: el panel (puerto 4321, `09-PANEL`) ── sube sus decisiones a GitHub
```

## El recorrido, paso a paso (una media hora cualquiera)

1. **:00 — cron-job.org** le pide a la API de GitHub que corra "Actualizar la
   web" (`actualizar.yml`) y "Vigilancia" (`vigilancia.yml`). Lo hace con un
   token de GitHub propio (ver "Vencimientos"). El reloj de GitHub
   (`schedule`) queda sólo de respaldo: en este repositorio llegó a dejar cinco
   horas entre dos corridas.
2. **Actualizar la web** instala todo, corre las pruebas (`npm test`) y, si
   pasan, busca noticias, las cruza, las lee y reescribe con IA, arma los
   datos, compila el sitio para comprobar que compila, revisa el SEO y
   commitea los archivos de `web/data/`. **Si una prueba falla, no sigue: la
   web queda como estaba.** (Qué hace cada paso de adentro: `02-INGESTA` a
   `06-WEB`.)
3. **Al terminar bien**, arranca solo **Cloudflare Pages**
   (`cloudflare-deploy.yml`): vuelve a compilar y sube la carpeta `web/out` a
   Cloudflare. En uno o dos minutos la web nueva está en línea.
4. **Al terminar, bien o mal**, arranca también **Redes** (`redes.yml`).
   Además cron-job.org lo llama varias veces por hora. Publica en Facebook y
   arma y sube las piezas que tocan (`07-REDES`).
5. **Vigilancia** mira la web publicada, las últimas corridas de GitHub, el
   libro de las redes y el contrato del día, y manda **un solo WhatsApp** si hay
   algo para decir.
6. Cada workflow que escribe algo lo commitea en `main` con el usuario "Radar
   Balcarce" y el correo noreply de GitHub de la cuenta (no cambiarlo: ver
   `CLAUDE.md`). Los que chocan entre sí se ponen de acuerdo con `git pull
   --rebase` (ver "Cómo no se pisan").

## Los trece workflows

"Gasta plata" quiere decir si puede generar un cargo: GitHub no cobra minutos
porque el repositorio es público; lo único pago es la clave de Gemini de redes.

| Workflow (archivo) | Cuándo corre | Qué corre | Secretos y variables | Qué commitea | Tope | Gasta plata |
|---|---|---|---|---|---|---|
| **Actualizar la web** (`actualizar.yml`) | cron-job.org a los :00 y :30; respaldo `schedule` a los :07 y :37; a mano | `npm ci` (raíz y `web/`), `npm test`, caché `.cache` (la memoria de 36 horas del cruce de medios), `node web/scripts/generar-datos.mjs`, `npm run build` con `SITIO`, `node web/scripts/revisar-seo.mjs` | `GEMINI_API_KEY_REDACCION`, `GEMINI_API_KEY_REDES`, `GEMINI_API_KEY_CLASIFICACION`, `GROQ_API_KEY` | `web/data/portada.json`, `archivo.json`, `agenda.json`, `intentos-ia.json`, `dolar-historia.json`, `fichas.json`, `notas-por-dia.json`, `banco-fotos.json`, `esperando-cuerpo.json`, `vistas.json` y `web/public/fotos-notas/`. Mensaje "Datos de la portada · dd/mm hh:mm" | 20 min | Casi nunca: la redacción usa la clave gratis y pasa a la paga sólo si la gratis contesta "sin cupo" |
| **Cloudflare Pages** (`cloudflare-deploy.yml`) | Al terminar **bien** "Actualizar la web"; a mano | `npm ci` y `npm run build` en `web/`, después `npx wrangler@4.139.0 pages deploy out --branch=main` | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; variable opcional `CLOUDFLARE_PROJECT` (si falta, `radar-balcarce`) | Nada (sólo lee el repo) | 15 min | No |
| **Redes** (`redes.yml`) | cron-job.org (acción `reloj`); al terminar "Actualizar la web"; a mano: `reloj`, `verificar` o `facebook` | `redes/publicar.mjs --facebook`; `redes/reloj.mjs`; si toca: `npm ci`, `reels/plan.mjs --generar --solo=…`, `redes/publicar.mjs --piezas`; `redes/publicar.mjs --enlaces` | `META_TOKEN`, `GEMINI_API_KEY_REDES`; variable `REDES_ACTIVAS` | `web/data/redes.json` ("Redes: libro de publicaciones · …"); los videos quedan 3 días como artefacto | 25 min | Sí, sólo cuando arma una pieza (la voz). Con las redes apagadas no arma nada |
| **Piezas** (`piezas.yml`) | Sólo a mano: `solo` (nombres separados por coma; vacío = todas), `publicar` (sí/no), `destino` (ambas, instagram, facebook) | `npm ci`, `reels/plan.mjs --generar [--solo=…]`; si `publicar`: `redes/publicar.mjs --piezas --sin-horario --destino=…` | `GEMINI_API_KEY_REDES`, `META_TOKEN`; `REDES_ACTIVAS` | `web/data/redes.json` si publicó; artefacto "piezas" 7 días (mp4, mp3, png, manifiesto) | 30 min | Sí (una voz por pieza; con `solo` vacío, todas las del día) |
| **Vigilancia** (`vigilancia.yml`) | cron-job.org a los :00 y :30; respaldo `schedule` cada 3 horas (a los :17 UTC); a mano: `vigilar`, `probar-resumen`, `probar-cierre` | `node redes/vigilar.mjs` | `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ANALYTICS_TOKEN`, `CLOUDFLARE_API_TOKEN`, `META_TOKEN`, `GITHUB_TOKEN` (automático); variable `REDES_ACTIVAS` | `web/data/vigilancia.json` y `web/data/estadisticas.json` (no en los modos de prueba) | 10 min | No |
| **Auditoría** (`auditoria.yml`) | Lunes 12:00 UTC (9:00 en Balcarce); a mano | `redes/auditar.mjs`; `redes/auditar-redes.mjs --semana` (si falla, sigue) | `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY`, `META_TOKEN` | `web/data/auditoria.json` | sin tope propio (el de GitHub: 6 h) | No |
| **Auditar redes** (`auditar-redes.yml`) | A mano (opcional: `desde`, AAAA-MM-DD) | `redes/auditar-redes.mjs` cuatro veces: hoy, ayer, la semana y "crudo" | `META_TOKEN` | Nada | 10 min | No |
| **Auditar voz** (`auditar-voz.yml`) | A mano (opcional: `explorar`) | `npm ci`, `reels/auditar-voz.mjs [--explorar]` | `GEMINI_API_KEY_REDES` | Nada | 15 min | Centavos (unos audios cortos y su transcripción) |
| **Ver Facebook** (`ver-facebook.yml`) | A mano | `redes/ver-facebook.mjs` | `META_TOKEN` | Nada | 5 min | No |
| **Probar banco de fotos** (`probar-fotos.yml`) | A mano (`maximo`: cuántas notas; 100 por defecto) | `ingesta/probar-fotos.mjs` | `GEMINI_API_KEY_CLASIFICACION`, `GEMINI_API_KEY_REDACCION`, `GEMINI_API_KEY` (nombre viejo), `GROQ_API_KEY` | Nada; deja `web/data/_prueba-fotos.json` como artefacto 14 días | 40 min | No (nunca la clave de redes) |
| **Prueba de estadísticas** (`prueba-estadisticas.yml`) | A mano | `redes/estadisticas.mjs` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ANALYTICS_TOKEN`, `CLOUDFLARE_API_TOKEN`, `META_TOKEN` | Nada | 5 min | No |
| **Prueba de Gemini** (`prueba-gemini.yml`) | A mano | `reels/probar-gemini.mjs` (un pedido mínimo) | `GEMINI_API_KEY_REDACCION` | Nada | sin tope propio | No (clave gratis) |
| **Prueba de WhatsApp** (`prueba-whatsapp.yml`) | A mano | `redes/probar-whatsapp.mjs` (manda un mensaje y muestra la respuesta de CallMeBot, sin la clave ni el teléfono) | `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY` | Nada | 5 min | No |

Detalles que importan:

- **La hora.** Todos los que miran la hora ponen `TZ: America/Argentina/Buenos_Aires`:
  los servidores de GitHub corren en UTC. (No lo ponen "Probar banco de
  fotos" ni "Prueba de Gemini", que no dependen de la hora.)
- **Node 24** en todos. Los que no arman videos no instalan nada en la raíz
  (`ingesta/`, `panel/` y `redes/` no usan dependencias; `10-REGLAS-Y-PRUEBAS`).
- **Permisos.** Los que commitean tienen `contents: write`; los demás, sólo
  lectura. Vigilancia tiene además `actions: read`, para leer las corridas.
- **Siempre la última versión.** "Actualizar la web", "Redes", "Piezas",
  "Vigilancia" y "Auditar redes" bajan `main` al día (`ref: main`), no la
  versión del momento en que se los disparó.

### Cómo no se pisan

- **Candados** (`concurrency`): `actualizar-web` (una a la vez; la siguiente
  espera), `redes` (lo comparten Redes y Piezas: nunca dos publicando a la
  vez), `cloudflare-pages` (si llega una nueva, **cancela** la que estaba
  subiendo: sólo importa la última), `vigilancia` y `auditoria`.
- **Al commitear**, "Actualizar la web", "Redes" y "Piezas" hacen `git pull
  --rebase` antes de subir; si chocan en un archivo de `web/data/` (o, en
  "Actualizar la web", de `web/public/fotos-notas/`) gana lo que acaba de armar
  esa corrida; reintentan hasta tres veces y, si no pueden, terminan en rojo.
  Un choque fuera de esas carpetas corta la corrida sin tocar nada.
  "Vigilancia" y "Auditoría" hacen un solo `pull --rebase` y un solo `push`, sin
  reintento.
- **El panel** también sube (`web/data/decisiones.json`, `avisos.json`,
  `eventos-panel.json`, con `pull --rebase --autostash`): ver `09-PANEL`.

## cron-job.org: el despertador

- Cuenta: `radarbalcarce@gmail.com`, en https://console.cron-job.org/jobs.
- Cada trabajo hace un pedido a la API de GitHub
  (`…/actions/workflows/<archivo>.yml/dispatches`) con un encabezado
  `Authorization` que lleva un **token de GitHub de `balcardev@gmail.com`**
  (de grano fino, sólo este repositorio, permiso Actions de lectura y
  escritura). **Vence el 21/09/2027.**
- Según los documentos son **tres trabajos**: "Actualizar la web", el reloj de
  "Redes" y "Vigilancia". El historial de GitHub del 27 y 28/09 muestra:
  "Actualizar la web" y "Vigilancia" a los :00 y :30, todo el día; "Redes" a
  los **:05, :35 y :45**, de 0 a 22 hora de Balcarce (ver "Diferencias").
- **Si un trabajo falla varias veces seguidas, cron-job.org lo desactiva
  solo** (pasó el 24/09 con dos, mientras Meta tenía bloqueada la cuenta y los
  workflows estaban apagados). Es lo primero que hay que mirar cuando algo deja
  de salir.
- Respaldo de cada uno si cron-job.org se apaga: "Actualizar la web" tiene su
  `schedule` de GitHub (impuntual, pero corre); "Redes" arranca al final de
  cada "Actualizar la web"; "Vigilancia" tiene un `schedule` cada 3 horas.

## Cloudflare Pages: la web

- Sirve `radarbalcarce.com` desde el 24/09. El dominio está **registrado en
  DonWeb**, pero sus servidores de nombres apuntan a Cloudflare, que maneja el
  DNS. `www` redirige con un 301 al dominio sin `www` (una regla de
  Cloudflare; el vigilante avisa si deja de hacerlo).
- El sitio es **estático**: Next.js exporta archivos (`output: 'export'` en
  `web/next.config.mjs`) y "Cloudflare Pages" los sube ya compilados
  ("Direct Upload"). Así Cloudflare no compila nada y no cuenta contra su
  límite de 500 compilaciones gratis por mes. Cloudflare acepta hasta 20.000
  archivos por subida: por eso el archivo de notas tiene tope (`06-WEB`).
- Los encabezados de seguridad y de caché están en `web/public/_headers`.
- **Web Analytics** de Cloudflare está activado (gratis, sin cookies): de ahí
  salen las visitas de las estadísticas.
- La versión de `wrangler` va fija (4.139.0) para que una versión nueva no
  rompa el despliegue sin que nadie toque nada. Para subirla: cambiar el
  número y correr "Cloudflare Pages" a mano.
- **Vercel** está apagado desde el 25/09 (sin conexión a GitHub). Falta borrar
  el proyecto y limpiar el DNS que quedó (`PENDIENTES.md`).

## GitHub: el repositorio

- `balcar-dev/radar-balcarce`, cuenta `balcardev@gmail.com`. **Público desde
  el 25/09**: privado, el plan gratis traía 2.000 minutos de Actions por mes y
  se gastaban hacia el día 6; los públicos no pagan minutos. Se revisó el
  historial y no hay claves. **Por eso mismo, nada sensible va al repositorio**:
  ni claves, ni datos de personas (el panel guarda los suyos en `panel/datos/`,
  que no se sube).
- En la PC hay un archivo `.env` (ignorado por git) con las claves de Gemini
  para trabajar localmente; lo lee `reels/claves.mjs` si la clave no está en el
  entorno.

## Las claves de IA y sus topes

Cuatro claves, **separadas a propósito**: en Google el cupo es por proyecto, y
si compartieran, un día de muchos videos se comería la cuota de la redacción
(o al revés). Las lee `reels/claves.mjs`.

| Secreto | Proyecto / servicio | Para qué | Modelo | Topes | Si falta | Costo |
|---|---|---|---|---|---|---|
| `GEMINI_API_KEY_REDACCION` (acepta el nombre viejo `GEMINI_API_KEY`) | Google AI Studio, proyecto "RadarGratis", sin facturación | Reescribir las notas: título, bajada, cuerpo (`reels/reescritura.mjs`, `04-REDACCION`) | `gemini-flash-lite-latest` | Google da 500 pedidos por día. El sistema se pone **450 por día** si la lectura tiene su propia clave, **330** si no (`topeDeReescrituras`, `REESCRITURA` en `ingesta/criterio.mjs`); 40 por corrida; los últimos 80 del día quedan para lo de Balcarce; 3 intentos por nota | Usa la de redes (paga) | Gratis |
| `GEMINI_API_KEY_REDES` | Google AI Studio, proyecto "RadarBalcarce", **con facturación** (Nivel 1) | La voz de las piezas (`reels/voz-gemini.mjs`) y la auditoría de voz. Además, **respaldo pago de la redacción**: si la gratis no está o contesta 429 ("sin cupo"), se reintenta una vez con ésta | `gemini-2.5-flash-preview-tts` (voz) | Sin tope en el código (se sacó el 28/09); 2 segundos entre pedidos | La pieza sale con la voz gratis de Microsoft (Elena) | **Paga.** Hasta el 26/09 se gastaron USD 3,27 (con pruebas); el uso normal ronda USD 0,10 por día. Desde octubre se mide con un presupuesto de USD 10 por mes; **falta poner un límite de gasto** en Google (`PENDIENTES.md`) |
| `GEMINI_API_KEY_CLASIFICACION` (cargada el 28/09) | Google, su propio proyecto | La lectura con IA (`ingesta/lectura-ia.mjs`: qué entra, sección, qué es de Balcarce, repetidas; `03-SELECCION`) y el banco de fotos (`ingesta/fotos.mjs`, `05-FOTOS`) | `gemini-flash-lite-latest` | Fichas: **200 pedidos por día** con esta clave (60 sin ella, `topeDeLecturas`), 5 por corrida, 12 notas por pedido; repetidas: 60 por día | Usa la de redacción. **Nunca la de redes** | No es la paga |
| `GROQ_API_KEY` (cargada el 28/09) | Groq (console.groq.com) | Segundo proveedor, gratis: si Gemini falla o se queda sin cupo en la lectura o en las fotos, se prueba el mismo pedido con Groq | `openai/gpt-oss-120b` (lectura); `qwen/qwen3.8-27b` (fotos, con visión) | Los de la cuenta gratis de Groq | La lectura sigue sólo con Gemini | Gratis |

El registro de "Actualizar la web" dice cuántos pedidos de redacción fueron a
cada clave ("claves de Gemini usadas: N con la gratis, M con la paga") y
cuándo se llegó al tope del día.

## Vigilancia y WhatsApp

`redes/vigilar.mjs`, cada media hora. Mira **desde afuera**, como un lector:

| Qué mira | Clave del aviso | Nivel |
|---|---|---|
| La web no responde | `web-caida` | alta |
| La web no se actualiza hace más de 100 minutos (la fecha más nueva del `sitemap.xml`) | `web-vieja` | alta |
| No se puede leer cuándo se actualizó | `web-sin-fecha` | media |
| `www` no redirige | `www` | media |
| La última corrida de "Actualizar la web", "Redes" o "Cloudflare Pages" falló | `falla-<nombre>` | alta si fallaron 3 de las últimas 5 |
| No hay corridas nuevas de "Actualizar la web" o "Redes" en 100 minutos (sólo de 7 a 23) | `reloj-<nombre>` | alta: "cron-job.org pudo haberse desactivado solo" |
| Volvió algo que se pidió sacar: "la vimos hace…", hasta qué hora está la farmacia, la fuente arriba de un título (`REGLAS.md`) | `regla-…` | alta |
| Menos del 35% de las notas de las últimas 24 horas tiene cuerpo (con 10 o más) | `pocos-cuerpos` | media |
| La auditoría semanal no corre hace más de 10 días | `auditoria-vencida` | media |
| Faltan 30 días o menos para un vencimiento | `vence-token-github`, `vence-dominio` | alta en la última semana |
| Redes: piezas fijas y contrato del día, duplicados, espejos (`07-REDES`) | `pieza-…`, `falta-…`, `duplicado-…`, `sin-espejo-…`, `redes-apagadas` | según el caso |

Cómo avisa:

- **Un solo WhatsApp por corrida** con todo junto, en este orden: problemas
  nuevos, el cierre de las 23:30 si hubo discrepancias, una noticia de
  Balcarce muy importante (relevancia 100 y 3 medios o más, 2 por día como
  mucho), las notas nuevas que esperan a una persona (cada 3 horas), el resumen
  de las 21 o las estadísticas de las 9, el informe breve del día en notas y lo
  que salió en redes. Tope de 1.000 caracteres: lo que no entra no se da por
  avisado y sale en la corrida siguiente. CallMeBot bloquea el número si se le
  manda de más.
- **Cada problema se repite a lo sumo una vez cada 6 horas**; "redes apagadas",
  una vez por día. Cuando un problema se arregla, se borra de lo avisado: si
  vuelve, se avisa de nuevo.
- **A las 21, siempre**, el resumen del día (✅ "todo bien" si no hay problemas
  y el contrato está completo). Si un día no llega, el problema puede ser el
  vigilante mismo.
- Lo avisado se guarda en `web/data/vigilancia.json` (también el último
  resumen, el último cierre y la última medición).
- **Aviso amarillo, no rojo.** Cuando encuentra un problema, la corrida termina
  bien y deja un aviso amarillo arriba. Sólo termina en rojo si el vigilante
  mismo no pudo correr.
- **Sin los secretos de WhatsApp corre igual**: deja todo en el registro y no
  avisa.

**CallMeBot** (`redes/whatsapp.mjs`) es un servicio gratis para avisarse a uno
mismo: sólo manda al número que lo activó. `WHATSAPP_TELEFONO` va completo,
con 549 adelante, sin + ni espacios (hasta el 25/09 tenía 7 dígitos y no
llegaba nada); `WHATSAPP_APIKEY` es la clave que dio CallMeBot al activarlo.
La clave viaja en la dirección del pedido, así que el código la borra de todo
lo que muestra. El número de CallMeBot cambia de vez en cuando (se mira en
callmebot.com). Anda desde el 25/09; se prueba con "Prueba de WhatsApp".

## Vencimientos

| Qué | Cuándo | Qué hacer | Quién avisa |
|---|---|---|---|
| Token de GitHub de cron-job.org | **21/09/2027** | Crear otro en GitHub (cuenta `balcardev@gmail.com` → Settings → Developer settings → Fine-grained tokens, sólo este repositorio, Actions lectura y escritura) y pegarlo en el encabezado de **todos** los trabajos de cron-job.org | El vigilante, desde 30 días antes |
| Dominio `radarbalcarce.com` (DonWeb) | **21/09/2027** | Renovarlo en DonWeb. Si vence, se cae la web y todos los enlaces de los posteos | El vigilante, desde 30 días antes |
| Medidas de imágenes de las redes (`redes/formatos.mjs`) | 90 días desde el 25/09/2026 | Volver a verificarlas (`FORMATOS.md`) | La auditoría semanal |
| `META_TOKEN` | No vence | — | — |
| Presupuesto de Gemini (clave paga) | Cada mes, desde octubre | Mirar el gasto en Google AI Studio | Nadie todavía (`PENDIENTES.md`) |

## Lo que cuesta

| Servicio | Costo | Por qué |
|---|---|---|
| GitHub Actions | 0 | Repositorio público |
| Cloudflare Pages, DNS y Web Analytics | 0 | Plan gratis; permite publicidad (Vercel Hobby no) |
| cron-job.org | 0 | — |
| Meta (API) | 0 | — |
| CallMeBot | 0 | — |
| Gemini redacción y clasificación | 0 | Proyectos sin facturación |
| Groq | 0 | Cuenta gratis |
| **Gemini redes (voces)** | **Centavos por pieza; ~USD 0,10 por día** | La única clave paga. Se gasta al armar piezas (unas 8 por día), al correr "Piezas" o "Auditar voz", y si la redacción gratis se queda sin cupo |
| **Dominio en DonWeb** | Renovación anual | El precio no está en el repositorio |

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Cambiar cada cuánto corre algo | cron-job.org (el disparo real); el `schedule` del `.yml` es sólo el respaldo |
| Agregar o cambiar un secreto | GitHub → Settings → Secrets and variables → Actions (lo hace una persona) y, si un workflow nuevo lo necesita, el bloque `env:` de ese paso en el `.yml` |
| Prender o apagar las redes | Variable `REDES_ACTIVAS` |
| Cambiar la versión de wrangler o el proyecto de Pages | `cloudflare-deploy.yml` (versión) y variable `CLOUDFLARE_PROJECT` |
| Qué archivos commitea "Actualizar la web" | La línea `git add` de `actualizar.yml` (si un archivo nuevo de `web/data/` no está ahí, se arma y se pierde al terminar la corrida: pasó el 28/09 con el banco de fotos) |
| El tope diario de la redacción o de la lectura | `REESCRITURA` en `ingesta/criterio.mjs` (y la tabla de `CRITERIO-EDITORIAL.md`); `LECTURA` en `ingesta/lectura-ia.mjs` |
| El modelo de la redacción, la lectura o las fotos | `MODELO` en `reels/reescritura.mjs` e `ingesta/lectura-ia.mjs`; `MODELO_GEMINI` y `MODELO_GROQ_VISION` en `ingesta/fotos.mjs` |
| El modelo o la voz de las piezas | `MODELO` en `reels/voz-gemini.mjs`; el nombre de la voz, en `CRITERIO-REDES.md` |
| Qué mira el vigilante, sus límites y vencimientos | `LIMITES`, `VENCIMIENTOS` y `evaluar` en `redes/vigilar.mjs` |
| Qué dice el WhatsApp y cuánto entra | `redes/avisos.mjs` (`armarMensaje`, `LARGO_MAXIMO` en `redes/whatsapp.mjs`) |
| A qué hora se mide y se resume | `HORAS_DE_MEDICION` (`redes/estadisticas.mjs`), `horaDelResumen` (`redes/vigilar.mjs`), `cierreMinutoDelDia` (`CONTRATO_DIARIO`) |
| Los encabezados de la web publicada | `web/public/_headers` |

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `.github/workflows/*.yml` | Los trece workflows (tabla de arriba) | cron-job.org, GitHub, una persona | secretos y variables | commits en `main`, artefactos |
| `web/scripts/generar-datos.mjs` | Todo lo que hace "Actualizar la web" entre las pruebas y la compilación | `actualizar.yml` | fuentes, `web/data/`, claves de IA | `web/data/*.json`, `web/public/fotos-notas/` |
| `web/scripts/revisar-seo.mjs` | Que el SEO siga en el HTML compilado | `actualizar.yml` | `web/out` | — |
| `reels/claves.mjs` | Las cuatro claves de IA | redacción, lectura, fotos, voz | entorno, `.env` | — |
| `reels/probar-gemini.mjs` | Un pedido mínimo con la clave de redacción | "Prueba de Gemini" | `GEMINI_API_KEY_REDACCION` | — |
| `redes/vigilar.mjs` | El vigilante | `vigilancia.yml` | la web en vivo, la API de GitHub, `web/data/` (portada, libro, auditoría, notas por día), Meta | `web/data/vigilancia.json`, `estadisticas.json` |
| `redes/avisos.mjs` | Qué se dice y cómo entra en un mensaje | vigilante | portada, libro | — |
| `redes/whatsapp.mjs` | Manda el WhatsApp por CallMeBot sin mostrar la clave | vigilante, auditoría | `WHATSAPP_*` | — |
| `redes/probar-whatsapp.mjs` | Mensaje de prueba | "Prueba de WhatsApp" | `WHATSAPP_*` | — |
| `redes/estadisticas.mjs` | Visitas (Cloudflare) y seguidores (Meta) | vigilante, "Prueba de estadísticas" | `CLOUDFLARE_*`, `META_TOKEN` | — |
| `redes/auditar.mjs` | Auditoría semanal de lo publicado | `auditoria.yml` | la web en vivo, `redes/formatos.mjs` | `web/data/auditoria.json` |
| `web/public/_headers` | Encabezados de Cloudflare | Cloudflare Pages | — | — |
| `web/next.config.mjs` | Exportación estática del sitio | `next build` | — | `web/out/` |

## Qué puede fallar y cómo se nota

| Falla | Cómo se nota | Qué hacer |
|---|---|---|
| **cron-job.org desactivó un trabajo** | "No hay corridas nuevas de…" o "El reloj de Redes no corre"; la web deja de actualizarse puntual (queda el respaldo de GitHub, impuntual) | Reactivarlo en console.cron-job.org/jobs. Si el que se apagó es Vigilancia, no llega ningún aviso salvo el respaldo cada 3 horas: fijarse que llegue el resumen de las 21 |
| **Una prueba falla en "Actualizar la web"** | Corrida roja en el paso "Probar que nada se rompió"; "falla-Actualizar la web" y, a los 100 minutos, "web-vieja" | Leer el paso rojo. Un JSON de `web/data/` mal escrito a mano (por ejemplo `correcciones.json`) también lo causa |
| **La web no compila** | Corrida roja en "Compilar el sitio"; no se commitea nada | Leer el error de Next |
| **Cloudflare no sube** | "falla-Cloudflare Pages"; la web queda con la versión anterior | Mirar el paso "Subir a Cloudflare Pages" (token vencido o sin permiso, versión de wrangler) |
| **La web no responde** | `web-caida` | Mirar Cloudflare (dash.cloudflare.com) |
| **Choque al commitear** | "No se pudo subir la portada después de tres intentos" o "Conflicto fuera de web/data" | Suele arreglarse en la corrida siguiente; si se repite, alguien subió algo a mano que choca |
| **Vigilancia no pudo subir su estado** (un solo intento de `push`) | Corrida roja en "Guardar lo avisado" | La siguiente vuelta lo reintenta; puede repetir un aviso |
| **La clave gratis se quedó sin cupo** | Registro: "tope del día" o pedidos a la paga; aviso `pocos-cuerpos`; crece "Esperando cuerpo" en el resumen | Esperar al día siguiente o escribir los cuerpos a mano (`11-OPERACION`) |
| **Gemini con demasiada demanda (503)** | La reescritura falla seguido | Es el primer lugar donde mirar si vuelve a pasar: el modelo (`gemini-flash-lite-latest`) |
| **El WhatsApp no llega** | No llega el resumen de las 21 | "Prueba de WhatsApp"; si CallMeBot dice "APIKey is invalid", la clave está mal copiada; revisar que el teléfono tenga 549 |
| **Faltan permisos en un token** | El resumen dice "falta permiso de Analytics" o que faltan los de Meta | Una persona regenera el token con los permisos |
| **La auditoría semanal no corre** | Nadie avisa si nunca corrió (ver "Diferencias") | Correrla a mano |
| **Se vence el token de cron-job.org o el dominio** | Aviso 30 días antes | Ver "Vencimientos" |
| **La PC está apagada** | Sólo el panel deja de andar | Nada se rompe: web, redes y vigilancia siguen |

## Diferencias encontradas con los documentos viejos

1. **Los disparos de Redes.** `INFRAESTRUCTURA.md`, `REDES.md` y el
   comentario de `redes.yml` dicen "cron-job.org cada 30 minutos, de 7 a 23".
   El historial de GitHub del 27 y 28/09 muestra disparos a los **:05, :35 y
   :45** de cada hora, **de 0 a 22** (hora de Balcarce). Puede haber un cuarto
   trabajo en cron-job.org (los documentos hablan de tres) o uno con tres
   horarios. No rompe nada, pero conviene mirarlo y, si hay un cuarto, sumarlo
   a la lista de trabajos a los que hay que cambiarles el token en 2027.
2. **La Auditoría semanal nunca corrió.** Su primera corrida programada era el
   lunes 28/09 a las 9:00; a las 15:15 no había ninguna en Actions (el
   workflow figura activo) y `web/data/auditoria.json` no existe.
   `INFRAESTRUCTURA.md` la da por andando. Además, `auditoriaVencida`
   (`redes/auditar.mjs`) no avisa cuando el archivo no existe, así que el aviso
   `auditoria-vencida` nunca va a saltar hasta que corra una primera vez.
3. **El respaldo de Vigilancia** no es "cada 30 minutos": el `schedule` de
   `vigilancia.yml` es **cada 3 horas** (minuto 17 UTC). Cada 30 minutos sólo si
   cron-job.org anda.
4. **"Si falta la clave de redes, los reels no arrancan"** (`CLAUDE.md`,
   `INFRAESTRUCTURA.md`, `reels/claves.mjs`): en el código la pieza sale igual
   con la voz de Elena.
5. **La portada muestra 36 horas, no 72.** `INFRAESTRUCTURA.md` y `CLAUDE.md`
   dicen que "Actualizar la web" arma la portada con las últimas 72 horas; el
   código dice 36 (`HORAS_EN_PORTADA` en `web/lib/archivo.js` y `PORTADA.horas`
   en `ingesta/criterio.mjs`). `EMPEZAR-ACA.md` ya lo dice bien (28/09).
6. **"Probar banco de fotos" pasa `GEMINI_API_KEY`** (el nombre viejo de la
   clave de redacción) además de las otras; no hace daño, pero ningún
   documento lo nombra.
7. **El modelo de Groq para fotos.** El encabezado de `ingesta/fotos.mjs` dice
   "Llama 4 Scout"; el código usa `qwen/qwen3.8-27b` (el comentario de al lado
   explica que Llama 4 Scout daba 404). Manda el código.
8. **El comentario de arriba de `reels/claves.mjs`** habla de "dos claves";
   el archivo maneja cuatro (las tres de Gemini y la de Groq).

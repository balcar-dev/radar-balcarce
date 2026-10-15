# 08 · Infraestructura: qué corre dónde

*Actualizado el 15/10/2026 (el repositorio se mudó a `radarbalcarce/radar-balcarce`,
el reloj pasó a Cloudflare y se borraron las herramientas de prueba sueltas). Si algo de acá no coincide con los `.yml` o con el
código, mandan ellos.* Los secretos figuran **sólo por nombre**: sus valores no
se escriben en ningún documento ni se pegan en un chat. Qué se publica en las
redes: [`07-REDES.md`](07-REDES.md); los paneles: [`09-PANEL.md`](09-PANEL.md);
qué hacer cuando algo falla: [`11-OPERACION.md`](11-OPERACION.md); cómo se arma
la web: `06-WEB`.

## En una frase

Todo lo automático corre gratis en GitHub Actions, con la PC apagada: un
reloj propio (un programa chico de Cloudflare, el Worker `radar-balcarce-reloj`) lo
despierta cada media hora, GitHub busca las
noticias, escribe con IA (Gemini, con Groq de respaldo en la lectura), arma la
web y la sube a Cloudflare Pages, publica en Facebook e Instagram con la API de
Meta, y un vigilante revisa todo y avisa por WhatsApp. El panel del celular
habla directo con GitHub. Lo único que se paga es el dominio.

**Tres palabras.** Un **workflow** es una tarea automática de GitHub (pestaña
**Actions**); cada vez que corre deja una **corrida** en verde (bien), rojo
(falló) o con un aviso amarillo (terminó bien, pero dejó algo para mirar). Un
**secreto** es una clave guardada en GitHub que los workflows usan sin que
nadie la vea; una **variable**, lo mismo pero a la vista (la que importa es
`REDES_ACTIVAS`, el interruptor de las redes). Un **token** (o llave) le da
permiso a un programa en otro servicio: se trata como una contraseña.

## El mapa

```
                         Reloj de Cloudflare  (Worker radar-balcarce-reloj, desde el 15/10/2026)
                         │  cada 30 min: "Actualizar la web" (:00 y :30)
                         │  varias por hora: "Redes" (:05, :35, :45)
                         │  cada 30 min: "Vigilancia" (:00 y :30)
                         ▼
GitHub Actions (repo radarbalcarce/radar-balcarce, público, cuenta radarbalcarce@gmail.com)
  ├─ Actualizar la web ──(termina bien)──▶ Cloudflare Pages ──▶ radarbalcarce.com
  │        │                                (sube web/out con wrangler)
  │        └──(termina, bien o mal)──▶ Redes
  ├─ Redes ───────────▶ Meta (página de Facebook + @radarbalcarce)
  ├─ Vigilancia ──────▶ CallMeBot ──▶ WhatsApp de Hernán
  ├─ Auditoría (lunes 9:00)
  ├─ Panel del celular (lo dispara el celular: la IA escribe una nota)
  └─ A mano: Piezas, Crear voces, Auditar redes, Auditar voz, Ver Facebook,
     Prueba de WhatsApp

  IA: Gemini (Google AI Studio, cuenta radarbalcarce@gmail.com) y Groq

Panel del celular (radarbalcarce.com/panel/) ── llave de GitHub ──▶ API de GitHub
   lee web/data/, escribe sus decisiones y correcciones, dispara
   "Panel del celular" y "Actualizar la web"
PC de Hernán: el panel de la PC (puerto 4321, respaldo) ── sube sus decisiones
```

## El recorrido, paso a paso (una media hora cualquiera)

1. **:00 — el reloj de Cloudflare** le pide a la API de GitHub que corra
   "Actualizar la web" y "Vigilancia", con un token propio ("Vencimientos"). El
   reloj de GitHub (`schedule`) es sólo el respaldo: llegó a dejar cinco horas
   entre dos corridas.
2. **Actualizar la web** corre las pruebas (`npm test`) y, si pasan, busca
   noticias, las cruza, las lee y las escribe con IA, arma los datos (también
   la lista cifrada para el panel del celular), compila el sitio, revisa el SEO
   y commitea `web/data/`. **Si una prueba falla, no sigue: la web queda como
   estaba** (cada paso, en `02-INGESTA` a `06-WEB`).
3. **Si terminó bien**, arranca **Cloudflare Pages**: vuelve a compilar y sube
   `web/out`. En uno o dos minutos la web nueva está en línea.
4. **Bien o mal**, arranca también **Redes** (que el reloj además llama
   varias veces por hora): Facebook y las piezas que tocan (`07-REDES`).
5. **Vigilancia** mira la web publicada, las corridas, el libro de las redes,
   el contrato del día y las claves de IA, y manda **un solo WhatsApp** si hay
   algo para decir.
6. Cada workflow commitea en `main` con el usuario "Radar Balcarce" y el correo
   noreply de GitHub de la cuenta (no cambiarlo: `CLAUDE.md`).

Aparte, lo que decide una persona en el panel del celular se escribe en el
repositorio con su llave de GitHub, y "Escribir con IA" dispara "Panel del
celular", que tarda un minuto (`09-PANEL`).

## Los veintiún workflows

(Son los 21 archivos de `.github/workflows/`. El 15/10/2026 se borraron cuatro
de prueba suelta que ya no se usaban: Prueba de estadísticas, Prueba de Gemini,
Sondear búsqueda y Sondear Groq; el historial de git los guarda.)

| Workflow (archivo) | Cuándo corre | Qué corre | Secretos y variables | Qué commitea | Tope |
|---|---|---|---|---|---|
| **Actualizar la web** (`actualizar.yml`) | El reloj de Cloudflare a los :00 y :30; respaldo `schedule` a los :07 y :37; a mano; "Actualizar la web ahora" del celular | `npm ci` (raíz y `web/`), `npm test`, la caché `.cache` (la memoria de 36 horas del cruce y las notas enteras para el celular), `node web/scripts/generar-datos.mjs`, `npm run build` con `SITIO`, `node web/scripts/revisar-seo.mjs` | Las cuatro claves de IA | En `web/data/`: `portada`, `archivo`, `agenda`, `intentos-ia`, `dolar-historia`, `f1`, `fichas`, `notas-por-dia`, `banco-fotos`, `esperando-cuerpo`, `vistas`, `retiradas`, `celular-pendientes` y `fusionadas` (`.json`); y `web/public/fotos-notas/`. Mensaje "Datos de la portada · dd/mm hh:mm" | 20 min |
| **Cloudflare Pages** (`cloudflare-deploy.yml`) | Al terminar **bien** "Actualizar la web"; a mano | `npm ci` y `npm run build` en `web/`, después `npx wrangler@4.139.0 pages deploy out --branch=main` | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; variable opcional `CLOUDFLARE_PROJECT` (si falta, `radar-balcarce`) | Nada | 15 min |
| **Redes** (`redes.yml`) | El reloj de Cloudflare (acción `reloj`, a los :05, :35 y :45); al terminar "Actualizar la web"; a mano: `reloj`, `verificar` o `facebook` | `redes/publicar.mjs --facebook`; `redes/reloj.mjs`; si toca: `npm ci`, `reels/plan.mjs --generar --solo=…`, `redes/publicar.mjs --piezas`; `redes/publicar.mjs --enlaces` | `META_TOKEN`, `GEMINI_API_KEY_REDES`; variable `REDES_ACTIVAS` | `web/data/redes.json` ("Redes: libro de publicaciones · …"); los videos quedan 3 días como artefacto; si hay `R2_PIEZAS`, al final (con `continue-on-error`) `redes/archivar-piezas.mjs` los copia a R2 para siempre | 25 min |
| **Piezas** (`piezas.yml`) | Sólo a mano: `solo` (nombres separados por coma; **vacío no arma nada**), `todas` (armar todas las del día, a propósito), `publicar` (sí/no), `destino` (ambas, instagram, facebook) | `npm ci`, `reels/plan.mjs --generar [--solo=…]`; si `publicar`: `redes/publicar.mjs --piezas --sin-horario --destino=…` | `GEMINI_API_KEY_REDES`, `META_TOKEN`; `REDES_ACTIVAS` | `web/data/redes.json` si publicó; artefacto "piezas" 7 días (mp4, mp3, png, manifiesto); si hay `R2_PIEZAS`, al final los copia a R2 (`continue-on-error`) | 30 min |
| **Panel del celular** (`panel.yml`) | Lo dispara el panel del celular con la llave de quien lo usa ("Escribir con IA", "Reescribir con IA"): `accion` (`escribir`), `id`, `pedido` (opcional; queda a la vista), `marca` (para que el celular encuentre su corrida) | Trae la caché `.cache` (`celular-notas.json`) y corre `node panel/celular.mjs escribir --id=… --pedido=…` | `GEMINI_API_KEY_REDACCION`, `GEMINI_API_KEY_REDES`, `GEMINI_API_KEY_CLASIFICACION` | `web/data/celular-borradores.json`, cifrado ("Panel del celular: borrador · …") | 8 min |
| **Vigilancia** (`vigilancia.yml`) | El reloj de Cloudflare a los :00 y :30; respaldo `schedule` cada 3 horas (a los :17 UTC); a mano: `vigilar`, `probar-resumen`, `probar-cierre` | `node redes/vigilar.mjs` | `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ANALYTICS_TOKEN`, `CLOUDFLARE_API_TOKEN`, `META_TOKEN`, las cuatro claves de IA (sólo para preguntar si andan), `GITHUB_TOKEN` (automático); variable `REDES_ACTIVAS` | `web/data/vigilancia.json` y `web/data/estadisticas.json` (no en los modos de prueba) | 10 min |
| **Informe diario** (`informe-diario.yml`) | El reloj de Cloudflare a las 8:15 y 21:15 de Balcarce (`momento`: `manana` o `noche`); respaldo `schedule` a las 8:45 y 21:45; a mano: `momento` y `enviar` (apagado = simulacro en el registro) | `node redes/informe-diario.mjs --momento=… --enviar` | `VIGILANTE_TOKEN`, `GITHUB_TOKEN` (automático, sólo lectura), variable `REDES_ACTIVAS` | Nada | 10 min |
| **Auditoría** (`auditoria.yml`) | Lunes 12:00 UTC (9:00 en Balcarce); a mano | `redes/auditar.mjs`; `redes/auditar-redes.mjs --semana` (si falla, sigue) | `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY`, `META_TOKEN` | `web/data/auditoria.json` | El de GitHub (6 h) |
| **Auditar redes** (`auditar-redes.yml`) | A mano (opcional: `desde`, AAAA-MM-DD) | `redes/auditar-redes.mjs` cuatro veces: hoy, ayer, la semana y "crudo" | `META_TOKEN` | Nada | 10 min |
| **Crear voces** (`crear-voces.yml`) | A mano, con un `modo` | `npm ci`, `reels/crear-voces.mjs`. **`crear`**: seis candidatos nuevos, cada uno con un audio de prueba; **`recrear`**: dos versiones nuevas de la locutora y del locutor aprobados (por ejemplo, para una clave de otro proyecto de Google), cada una con su audio; **`listar`**: la biblioteca de voces de Google; **`borrar`**: quita una voz propia. Los modos `dialogo` fueron pruebas de una charla entre las dos voces, descartadas porque sonaban falsas | `GEMINI_API_KEY_REDES` | Nada (los audios quedan 7 días como artefacto) | 30 min |
| **Auditar voz** (`auditar-voz.yml`) | A mano (opcional: `explorar`) | `npm ci`, `reels/auditar-voz.mjs [--explorar]` | `GEMINI_API_KEY_REDES` | Nada | 15 min |
| **Ver Facebook** (`ver-facebook.yml`) | A mano | `redes/ver-facebook.mjs` | `META_TOKEN` | Nada | 5 min |
| **Reintentar pieza** (`reintentar.yml`) | Botón del panel o a mano | `redes/reintentar.mjs` | `META_TOKEN`, `REDES_ACTIVAS` | Nada de voz: sube de nuevo el video que "Redes" guardó tres días | 2 min |
| **Prueba de WhatsApp** (`prueba-whatsapp.yml`) | A mano | `redes/probar-whatsapp.mjs` (manda un mensaje y muestra la respuesta de CallMeBot, sin la clave ni el teléfono) | `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY` | Nada | 5 min |
| **Auditoría IA** (`auditoria-ia.yml`) | Cada hora, a los :41 (`schedule`); a mano (`simular`) | `redes/auditar-notas.mjs` (lee las notas nuevas con Groq y avisa lo que esté mal; corrige sola sólo la ortografía chica y segura) | `GROQ_API_KEY`, `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY` | `web/data/auditoria-ia.json` (cifrado) y `web/data/correcciones-auditoria.json` | 12 min |
| **Pistas** (`pistas.yml`) | Cada 3 horas, a los :23 (`schedule`); el botón "Volver a mirar" del panel del celular; a mano (`id`, `marca`, `simular`) | `panel/revisar-pistas.mjs` (vuelve a mirar las pistas abiertas y avisa si un medio las cubrió) | `GEMINI_API_KEY_REDACCION`, `GEMINI_API_KEY_CLASIFICACION`, `TAVILY_API_KEY`, `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY` | `web/data/pistas.json` y `web/data/notas-de-pistas.json` | 10 min |
| **Fijar piezas** (`fijar-piezas.yml`) | A mano (`piezas`, `desde`, `dias`) | `reels/plan.mjs --generar`, `reels/fijas.mjs`: arma de antemano piezas con voz y las guarda para reutilizarlas unos días | `GEMINI_API_KEY_REDES` | `reels/fijas/` (y, si hay `R2_PIEZAS`, una copia a R2 de lo armado, con `continue-on-error`) | 30 min |
| **Armado con datos vacíos** (`armado-vacio.yml`) | Al subir cambios al código de la web; lunes 9:17 UTC | `web/scripts/armado-vacio.mjs`: arma el sitio con datos vacíos o a medias, para descubrir un código que rompe esos casos antes de que congele la web | Ninguno | Nada | 25 min |
| **Pruebas con otra hora** (`pruebas-otra-hora.yml`) | Lunes 8:43 UTC; a mano | Corre las pruebas como si fuera otra hora y otra fecha (`pruebas/hora-falsa.mjs`) | Ninguno | Nada | 40 min |
| **Respaldo** (`respaldo.yml`) | Domingos 6:17 UTC (3:17 en Balcarce); a mano | Arma un paquete de git con todo el historial y una copia de datos y fotos (artefacto de 90 días); si hay GitLab (`GITLAB_TOKEN`, variable `GITLAB_REPO`) sube un espejo, y si hay R2 (variable `R2_RESPALDOS`) sube el paquete | `GITLAB_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; variables `GITLAB_REPO`, `R2_RESPALDOS` | Nada | 40 min |
| **Fotos a R2** (`fotos-a-r2.yml`) | A mano | Copia `web/public/fotos-notas/` a un depósito de Cloudflare R2; no borra nada ni cambia lo que ve el lector | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; variable `R2_FOTOS` | Nada | 60 min |
| **Reloj de Cloudflare** (`reloj-cloudflare.yml`) | A mano (cuando cambia el reloj) | Sube el Worker `radar-balcarce-reloj` (`infra/reloj-cloudflare/`) con wrangler 4.139.0 y le carga el secreto | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `RELOJ_GITHUB_TOKEN` | Nada | 10 min |
| **Vigilante de Cloudflare** (`vigilante-cloudflare.yml`) | A mano (cuando cambia el vigilante) | Sube el Worker `radar-balcarce-vigilante` (`infra/vigilante-cloudflare/`) con wrangler 4.139.0, crea su KV si falta y le carga los secretos | `CLOUDFLARE_API_TOKEN` (con «Workers KV Storage: Edit»), `CLOUDFLARE_ACCOUNT_ID`, `VIGILANTE_TOKEN`; opcional `VIGILANTE_GITHUB_TOKEN` | Nada | 10 min |

**Respaldo en R2 y los 300 MB** (15/10/2026): wrangler sube hasta 300 MB por archivo y el paquete de git (unos 185 MB, +3,5 MB por día) los pasa hacia el 20/11/2026. Por eso "Respaldo" parte en pedazos de 200 MB (`<archivo>.part-000`, `.part-001`…, más `<archivo>.partes.txt` con nombres, tamaños y sha256 del archivo entero) lo que pase de 250 MB, y sube siempre un `SHA256SUMS`; lo chico sigue yendo entero. "Probar la restauración del respaldo" baja las partes, las junta y compara el sha256. Sin secretos ni herramientas nuevas; la prueba es `pruebas/respaldo-partes.test.mjs`.

**Ninguno cobra**: GitHub no cobra minutos porque el repositorio es público, y
las claves de IA son gratis. Lo que hay que cuidar es el **cupo de voz**: los
10 audios por día los comparten Redes, Piezas, Auditar voz y Crear voces
(`crear` y `recrear`; `listar` y `borrar` no gastan).

Detalles que importan:

- **La hora:** los que miran la hora ponen `TZ: America/Argentina/Buenos_Aires`
  (GitHub corre en UTC); no lo necesitan "Crear voces", "Ver Facebook" ni
  "Prueba de WhatsApp". **Node 24** en todos; los que no arman
  videos no instalan nada en la raíz (`ingesta/`, `panel/` y `redes/` no usan
  dependencias).
- **Permisos:** los que commitean ("Actualizar la web", "Redes", "Piezas",
  "Panel del celular", "Vigilancia", "Auditoría", "Auditoría IA", "Pistas" y
  "Fijar piezas") tienen `contents: write`; los demás, sólo lectura;
  "Vigilancia", además, `actions: read`.
- **Siempre la última versión:** "Actualizar la web", "Redes", "Piezas", "Panel
  del celular", "Vigilancia" y "Auditar redes" bajan `main` al día
  (`ref: main`), no la del momento en que se los disparó.
- **Lo que manda el celular** a "Panel del celular" va por variables de
  entorno, nunca pegado en el comando: un texto con comillas no ejecuta nada.

### Cómo no se pisan

- **Candados** (`concurrency`): `actualizar-web` (la siguiente espera),
  `redes` (Redes y Piezas: nunca dos publicando a la vez), `cloudflare-pages`
  (la nueva **cancela** la que estaba subiendo), `panel-celular` (un borrador
  a la vez), `vigilancia` y `auditoria`.
- **Al commitear**, los que escriben en `main` hacen `git pull --rebase`; si chocan en
  `web/data/` (o, en "Actualizar la web", en `web/public/fotos-notas/`), gana lo
  de esa corrida; reintentan hasta tres veces y, si no pueden, terminan en
  rojo. Un choque fuera de esas carpetas corta la corrida sin tocar nada.
- **El panel del celular** escribe por la API de GitHub archivos que ningún
  workflow toca (`celular-decisiones.json`, `correcciones.json`,
  `celular-llaves.json`); si alguien cambió el archivo en el medio, lo vuelve a
  leer y reintenta. **El de la PC** sube `decisiones.json`, `avisos.json` y
  `eventos-panel.json` con `pull --rebase --autostash` (`09-PANEL`).

## El reloj de Cloudflare: el despertador (desde el 15/10/2026)

Un programa chico de Cloudflare, el Worker **`radar-balcarce-reloj`**
(`infra/reloj-cloudflare/`), que Cloudflare despierta solo y que le pide a la API
de GitHub que corra los workflows. Es gratis y, a diferencia de cron-job.org, no
se apaga solo si una vez falla. **Anda desde el 15/10/2026, 14:46 UTC (11:46 en
Balcarce).**

- **Qué pide y cuándo** (las horas del Worker son UTC, pero los minutos son los
  mismos que en Balcarce): a los **:00 y :30**, "Actualizar la web" y
  "Vigilancia"; a los **:05, :35 y :45**, "Redes" con la acción `reloj`; y desde
  el 15/10, a las **8:15 y 21:15 de Balcarce** (11:15 y 0:15 UTC, una sola
  expresión `15 0,11 * * *`), "Informe diario" con `momento` = `manana` o `noche`.
  Lo dicen `worker.mjs` (`trabajosDelMinuto(minuto, horaUtc)`) y `wrangler.toml`.
  Después de tocarlo hay que correr «Reloj de Cloudflare»; mientras no se corra,
  el informe sale igual por el `schedule` de respaldo (con media hora de atraso).
- **La llave:** un token de GitHub de grano fino, **sólo para este
  repositorio**, con «Actions: lectura y escritura». Está guardado en el
  secreto de GitHub **`RELOJ_GITHUB_TOKEN`**; el workflow «Reloj de Cloudflare»
  lo carga en el Worker (que lo llama `GITHUB_TOKEN`). Nunca en un chat ni en el
  código.
- **Cambiar o resubir el reloj:** GitHub → Actions → «Reloj de Cloudflare» →
  Run workflow (sube `worker.mjs` con wrangler y vuelve a cargar el secreto).
  Si `CLOUDFLARE_API_TOKEN` no tuviera permiso para Workers, fallaría con ese
  mensaje: habría que agregarle «Workers Scripts: edición».
- **Para ver si está vivo:** la página del Worker responde «Reloj de Radar
  Balcarce: en hora.»; el panel de Cloudflare (Workers) muestra cada ejecución,
  y una que GitHub no aceptó figura como fallida.
- **Si el reloj se rompe:** "Actualizar la web" corre con su `schedule`
  (impuntual), "Redes" arranca al final de cada "Actualizar la web" y
  "Vigilancia" corre cada 3 horas. El vigilante avisa (`reloj-…`, `web-vieja`).
  Se puede volver al despertador anterior reactivando los trabajos de
  cron-job.org (abajo), pero **no los dos juntos más de un rato**: si dos relojes
  piden lo mismo, el `concurrency` de los workflows evita que se pisen, pero se
  gastan corridas de más.

### El vigilante de Cloudflare (avisos por mail, afuera de GitHub)

Un segundo Worker, **`radar-balcarce-vigilante`** (`infra/vigilante-cloudflare/`), nació el 15/10/2026 de la auditoría
(`docs/auditoria-opus/ANALISIS.md`, punto 1): los avisos por WhatsApp llevaban muertos desde el 1/10 (se acabó el cupo de CallMeBot) y
`redes/vigilar.mjs` corre dentro del mismo GitHub que vigila. Éste corre aparte, a los **:12 y :42**, y avisa **por mail** a
`radarbalcarce@gmail.com` (Email Workers, desde `vigilante@radarbalcarce.com`; el dominio ya tiene Email Routing):

- **Qué mira:** que la portada conteste 200 en 15 segundos (aviso a la segunda revisión seguida), que la web se haya armado hace menos de
  3 horas (6 de noche; se lee del `sitemap.xml`) y que "Actualizar la web" tenga una corrida buena de menos de 3 horas y no lleve 3 fallas
  seguidas (API pública de GitHub).
- **Anti-spam:** un problema se avisa una vez y se repite cada 6 horas; al arreglarse llega un solo mail de «Se arregló». A las **22** sale un
  resumen mínimo del día, **sólo si el informe de la noche (21:15, abajo) no llegó**: es su respaldo y vive afuera de GitHub. La memoria es un KV (`ESTADO`).
- **`GET /estado`** muestra la última revisión; **`GET /probar-mail`** (encabezado `x-token`, secreto `VIGILANTE_TOKEN`) manda un mail de prueba.
- **Lo que hace una persona la primera vez** (permiso de KV en el token de Cloudflare, mirar que `radarbalcarce@gmail.com` esté *Verified* en
  Email Routing, cargar `VIGILANTE_TOKEN`, correr el workflow y probar el mail): paso a paso, con enlaces, en
  `infra/vigilante-cloudflare/LEEME.md`.
- No reemplaza a `redes/vigilar.mjs` (que sigue mirando redes, claves, contenido y estadísticas): lo complementa en lo que no puede ver
  si GitHub se cae.
- **Avisos por mail desde el 15/10 (regla 173):** el Worker también recibe `POST /avisar` (encabezado `x-token`, el mismo `VIGILANTE_TOKEN`; hasta
  30 mails por hora; con `clave`, la misma no se repite en 6 horas). Lo que antes mandaban por WhatsApp el vigilante (`redes/vigilar.mjs`, con su
  resumen de las 21), la auditoría semanal, la auditoría con IA y las pistas ahora sale **primero por mail** (`redes/avisar-por-mail.mjs`, función
  `avisar`) y **WhatsApp queda de respaldo**: sólo se prueba si el mail no salió o si el workflow no tiene `VIGILANTE_TOKEN`. Los workflows
  `vigilancia.yml`, `auditoria.yml`, `auditoria-ia.yml` y `pistas.yml` pasan `VIGILANTE_TOKEN` (secreto de GitHub, el mismo del Worker). Después de
  tocar el Worker hay que volver a correr «Vigilante de Cloudflare».
- **Informes diarios (regla 176):** `POST /avisar` acepta además un `html` opcional (el mail sale con texto y formato; si pasa de 60.000 caracteres
  se descarta y sale el texto). El informe de las 8:15 y el de las 21:15 (`redes/informe-diario.mjs`, workflow «Informe diario») usan la clave
  `informe-<momento>-<día>`: el Worker la recuerda 6 horas, así que si llegan dos disparos (el reloj y el respaldo) sale un solo mail. Esa misma clave
  es la que mira el resumen de las 22 para saber si el informe de la noche llegó.

### cron-job.org: el despertador anterior (pausado)

- Cuenta `radarbalcarce@gmail.com`, en https://console.cron-job.org/jobs. Hasta
  el 15/10/2026 despertó a GitHub; **sus tres trabajos están PAUSADOS, no
  borrados** ("Actualizar la web" y "Vigilancia" a los :00 y :30, y el reloj de
  "Redes" a los :05, :35 y :45), por si hubiera que volver.
- Cada trabajo pide a la API de GitHub
  `…/actions/workflows/<archivo>.yml/dispatches` con un encabezado
  `Authorization` que lleva un token de GitHub de `balcardev@gmail.com`. **Vence
  el 21/09/2027**; si se reactivan los trabajos con el repositorio nuevo
  (`radarbalcarce/radar-balcarce`), hay que cambiarles también la dirección y
  poner un token con permiso sobre ese repositorio.
- Lo que aprendimos: **si un trabajo falla varias veces seguidas, cron-job.org
  lo desactiva solo** (pasó el 24/09 con dos, mientras Meta tenía bloqueada la
  cuenta).
- Los avisos del vigilante todavía nombran a cron-job.org en su texto («cron-job.org
  pudo haberse desactivado solo»): hoy hay que leerlos como «el reloj dejó de
  despertar».

## Cloudflare Pages: la web

- Sirve `radarbalcarce.com` desde el 24/09. El dominio está **registrado en
  DonWeb**, con el DNS en Cloudflare. `www` redirige con un 301 al dominio sin
  `www` (el vigilante avisa si deja de hacerlo).
- El sitio es **estático** (`output: 'export'` en `web/next.config.mjs`) y se
  sube ya compilado ("Direct Upload"): Cloudflare no compila nada y no cuenta
  contra su límite de 500 compilaciones por mes. Acepta hasta 20.000 archivos
  por subida: por eso el archivo de notas tiene tope (`06-WEB`).
- Los encabezados están en `web/public/_headers`. Los de `/panel/` (el panel
  del celular): no se indexa, el navegador trae siempre la versión nueva y sólo
  puede hablar con GitHub (`Content-Security-Policy`).
- **Web Analytics** está activado (gratis, sin cookies): de ahí salen las
  visitas de las estadísticas.
- `wrangler` va con la versión fija (4.139.0), para que una nueva no rompa el
  despliegue sola. Para subirla: cambiar el número y correr "Cloudflare Pages".
- **Servidor MCP de sólo lectura** (16/10/2026, `infra/mcp-cloudflare/`, Worker `radar-balcarce-mcp`):
  **escrito y probado, NO activado** (sin ruta, sin dominio y sin workflow que lo suba). Cuando se
  active, vive en `mcp.radarbalcarce.com`, lee los JSON de `/agentes/` del sitio y no necesita
  secretos. Los pasos, el límite de pedidos en el WAF y los riesgos están en su `LEEME.md` y en
  `docs/seo/AUDITORIA-SEO-LLM.md`.
- **Vercel** está apagado; borrar el proyecto y su DNS está en `PENDIENTES.md`.

## GitHub: el repositorio

- `radarbalcarce/radar-balcarce`, cuenta dueña `radarbalcarce@gmail.com`;
  colaboradores: `balcardev`, Andrés (`agerace`) y Hernán
  (`hernanaccomo-pixel`). Hasta el 15/10/2026 fue `balcar-dev/radar-balcarce`
  (cuenta `balcardev@gmail.com`); GitHub redirige la dirección vieja, pero lo que
  figure en los workflows, los paneles y los tokens tiene que usar la nueva.
  **Sigue siendo público**, desde el 25/09 (los públicos no pagan minutos de
  Actions; se revisó el historial y no hay claves): **pasarlo a privado costaría
  minutos de Actions**, y no conviene mientras el robot siga corriendo en
  Actions. **Hay que mantenerlo público** hasta que eso cambie. **Nada sensible va al repositorio sin cifrar**: ni claves, ni
  datos de personas (el panel de la PC guarda los suyos en `panel/datos/`, que
  no se sube), y lo que espera a una persona viaja cifrado para el panel del
  celular (regla 79).
- El panel del celular escribe con la **llave de GitHub** de cada persona (de
  grano fino: sólo este repositorio, Contents y Actions de lectura y
  escritura), que vive sólo en su celular (`09-PANEL`).
- En la PC, el `.env` (ignorado por git) tiene las claves de IA para trabajar
  localmente; lo lee `reels/claves.mjs` si la clave no está en el entorno.

## Las claves de IA

Cuatro claves, **todas gratis** y separadas a propósito: en Google el cupo es
**por proyecto y por modelo**, y si dos usos compartieran un proyecto, un día
de muchos pedidos de uno se comería el cupo del otro. Si dos claves son del
mismo proyecto, comparten el cupo de cada modelo (el de texto y el de voz son
modelos distintos: no compiten entre sí). Las lee `reels/claves.mjs`.

| Secreto | Para qué | Modelo | Cupo y topes | Si falla |
|---|---|---|---|---|
| `GEMINI_API_KEY_REDACCION` (acepta el nombre viejo `GEMINI_API_KEY`) | Redactar las notas: título, bajada y cuerpo (`reels/reescritura.mjs`, `04-REDACCION`), también las que pide el panel del celular | `gemini-flash-lite-latest` (`MODELO_DE_TEXTO`) | Google da 500 pedidos por día; el sistema se pone **450** si la lectura tiene su propia clave y **330** si no (`topeDeReescrituras`, `REESCRITURA` en `ingesta/criterio.mjs`); 40 por corrida; los últimos 80 del día quedan para lo de Balcarce; 3 intentos por nota | Pasa a los respaldos (abajo) |
| `GEMINI_API_KEY_REDES` | Las voces de las piezas (`reels/voz-gemini.mjs`), Auditar voz y Crear voces. Las dos voces propias viven en el proyecto de esta clave: si la clave pasa a otro proyecto, hay que crearlas de nuevo. Segundo respaldo de la redacción | `gemini-3.8-flash-tts` (voz) | **10 audios por día**, compartidos por Redes, Piezas, Auditar voz y Crear voces (cuánto gasta un día normal: `07-REDES`, "El cupo de voz"); 2 segundos entre pedidos | La pieza no sale: nunca con otra voz |
| `GEMINI_API_KEY_CLASIFICACION` | La lectura con IA (`ingesta/lectura-ia.mjs`, `03-SELECCION`) y el banco de fotos (`ingesta/fotos.mjs`, `05-FOTOS`). Último respaldo de la redacción | `gemini-flash-lite-latest` | Fichas: **200 pedidos por día** (60 sin esta clave, `topeDeLecturas`), 5 por corrida, 12 notas por pedido; repetidas: 60 por día; fotos: hasta 10 por corrida | Prueba con Groq. Sin esta clave, usa la de redacción; **nunca la de redes** |
| `GROQ_API_KEY` | Segundo proveedor de la lectura con IA y de las fotos: si Gemini falla o se queda sin cupo, el mismo pedido va a Groq | `openai/gpt-oss-120b` (lectura), `qwen/qwen3.8-27b` (fotos, con visión) | Los de la cuenta gratis: 8.000 tokens por minuto, por eso **no sirve para redactar** (un pedido de redacción ocupa unos 9.000) | La lectura sigue sólo con Gemini |

**El orden de la redacción** (`reescribir`, `reels/reescritura.mjs`):

1. La clave de **redacción**.
2. La de **redes**, sólo si la de redacción no está o contesta 429 ("sin cupo").
3. La de **clasificación**, si las anteriores fallaron por el servicio (sin
   cupo, saturado, clave rechazada o sin crédito).

Una nota que falla por el servicio (por ejemplo, una clave rechazada: 401, 402
o 403) no gasta sus intentos. El registro de "Actualizar la web" dice cuántos
pedidos fueron a cada clave ("claves de Gemini usadas: N con la de redacción, M
con la de redes, K con la de clasificación (respaldo)") y cuándo se llegó al
tope del día.

**La vigilancia pregunta por las claves** (regla 80, `revisarClaves` en
`redes/vigilar.mjs`): cada media hora, sin gastar cupo, pide la lista de
modelos con cada clave y, con la de redes, la ficha de cada voz propia (si
existe y cuándo vence, según Google). Avisa si una clave contesta 400 a 403 o
si una voz ya no existe o vence en menos de 30 días. "Sin cupo" (429) y los 5xx
no se avisan: son de un rato y los maneja cada corrida.

## Vigilancia y WhatsApp

`redes/vigilar.mjs`, cada media hora. Mira **desde afuera**, como un lector:

| Qué mira | Clave del aviso | Nivel |
|---|---|---|
| La web no responde | `web-caida` | alta |
| La web no se actualiza hace más de 100 minutos (la fecha más nueva del `sitemap.xml`) | `web-vieja` | alta |
| No se puede leer cuándo se actualizó | `web-sin-fecha` | media |
| `www` no redirige | `www` | media |
| La última corrida de "Actualizar la web", "Redes" o "Cloudflare Pages" falló | `falla-<nombre>` | alta si fallaron 3 de las últimas 5 |
| No hay corridas nuevas de "Actualizar la web" o "Redes" en 100 minutos (sólo de 7 a 23) | `reloj-<nombre>` | alta: el texto todavía dice "cron-job.org pudo haberse desactivado solo"; hoy significa que el reloj de Cloudflare dejó de despertar |
| Volvió algo que se pidió sacar: "la vimos hace…", hasta qué hora está la farmacia, la fuente arriba de un título (reglas 1 a 3 de `10-REGLAS-Y-PRUEBAS`) | `regla-…` | alta |
| Menos del 35 % de las notas de las últimas 24 horas tiene cuerpo (con 10 o más) | `pocos-cuerpos` | media |
| La auditoría semanal no corre hace más de 10 días | `auditoria-vencida` | media |
| Una clave de IA no anda (Google o Groq contestan 400 a 403) | `clave-<NOMBRE>` | alta |
| Una voz propia ya no existe | `voz-locutora`, `voz-locutor` | alta |
| Faltan 30 días o menos para un vencimiento: el token de GitHub del reloj viejo (cron-job.org), el dominio o una voz (con la fecha de Google) | `vence-token-github`, `vence-dominio`, `vence-voz-…` | alta en la última semana |
| Redes: piezas fijas y contrato del día, duplicados, espejos (`07-REDES`) | `pieza-…`, `falta-…`, `duplicado-…`, `sin-espejo-…`, `redes-apagadas` | según el caso |

Cómo avisa:

- **Un solo WhatsApp por corrida**, en este orden: problemas nuevos, el cierre
  de las 23:30 si hubo discrepancias, una noticia de Balcarce muy importante
  (relevancia 100 y 3 medios o más, 2 por día como mucho), las notas nuevas que
  esperan a una persona (cada 3 horas; termina con "Se deciden desde el panel
  del celular: radarbalcarce.com/panel"), el resumen de las 21 o las
  estadísticas de las 9, el informe del día en notas y lo que salió en redes.
  Tope de 1.000 caracteres: lo que no entra sale en la corrida siguiente
  (CallMeBot bloquea el número si se le manda de más).
- **Cada problema se repite a lo sumo cada 6 horas** ("redes apagadas", una vez
  por día); cuando se arregla, se borra de lo avisado. Todo queda en
  `web/data/vigilancia.json`.
- **A las 21, siempre**, el resumen del día (✅ "todo bien" si no hay problemas
  y el contrato está completo). Si un día no llega, el problema puede ser el
  vigilante mismo.
- **Aviso amarillo, no rojo**: con un problema, la corrida termina bien y deja
  un aviso amarillo; en rojo sólo si el vigilante no pudo correr. Sin los
  secretos de WhatsApp corre igual y deja todo en el registro.

**CallMeBot** (`redes/whatsapp.mjs`) es un servicio gratis para avisarse a uno
mismo: sólo manda al número que lo activó (`WHATSAPP_TELEFONO`, completo con
549, sin + ni espacios) con la clave que dio al activarlo (`WHATSAPP_APIKEY`).
La clave viaja en la dirección del pedido, así que el código la borra de todo
lo que muestra. Se prueba con "Prueba de WhatsApp".

## Todos los secretos y variables, por nombre

Están en GitHub → Settings → Secrets and variables → Actions. **Los valores
los pega una persona**, nunca un chat ni un archivo del repositorio. Desde el
repositorio no se puede ver qué está cargado: ante la duda, mirar esa pantalla
o correr el workflow de prueba que corresponda.

Qué workflow usa cada uno está en la tabla de los workflows.

| Nombre | Tipo | Para qué |
|---|---|---|
| `META_TOKEN` | Secreto | Publicar y leer en Facebook e Instagram (`07-REDES`). No vence. Al regenerarlo, tildar todos los permisos de ahora **más** `read_insights` e `instagram_manage_insights` |
| `GEMINI_API_KEY_REDACCION`, `GEMINI_API_KEY_REDES`, `GEMINI_API_KEY_CLASIFICACION`, `GROQ_API_KEY` | Secretos | Las claves de IA ("Las claves de IA") |
| `CLOUDFLARE_API_TOKEN` | Secreto | Subir el sitio; tiene también el permiso *Account · Account Analytics · Read* |
| `CLOUDFLARE_ACCOUNT_ID` | Secreto | La cuenta de Cloudflare: el sitio y las estadísticas |
| `CLOUDFLARE_ANALYTICS_TOKEN` | Secreto | Leer las visitas de Web Analytics. Sin permiso, el resumen dice "falta permiso de Analytics" |
| `WHATSAPP_TELEFONO`, `WHATSAPP_APIKEY` | Secretos | El número de los avisos (completo con 549, sin + ni espacios) y la clave que dio CallMeBot |
| `GITHUB_TOKEN` | Automático | Lo pone GitHub en cada corrida |
| `REDES_ACTIVAS` | Variable | El interruptor de las redes (`07-REDES`) |
| `RELOJ_GITHUB_TOKEN` | Secreto | El token de GitHub (de grano fino, sólo este repositorio, Actions de lectura y escritura) con el que el reloj de Cloudflare despierta a los workflows; lo carga en el Worker el workflow «Reloj de Cloudflare» |
| `TAVILY_API_KEY` | Secreto | La búsqueda con texto de las Pistas (`ingesta/busqueda.mjs`; workflow «Pistas») |
| `R2_PIEZAS` | Variable opcional | El depósito de Cloudflare R2 donde "Redes", "Piezas" y "Fijar piezas" archivan los videos, audios, subtítulos y placas que arman (`redes/archivar-piezas.mjs`; recomendado `radar-piezas`, o `si` para ese nombre; el script lo crea si falta; usa `CLOUDFLARE_API_TOKEN` con *Workers R2 Storage: Edit* y `CLOUDFLARE_ACCOUNT_ID`). Sin ella, cada corrida dice «sin archivo de piezas» y sigue. Qué guarda, cuánto pesa y cuesta, cómo bajar una pieza: `docs/redes/ARCHIVO-DE-PIEZAS.md` |
| `CLOUDFLARE_PROJECT` | Variable opcional | Sin ella se usa `radar-balcarce`, el nombre real del proyecto de Pages |

**El panel del celular no necesita ningún secreto**: usa la llave de GitHub de
cada persona, que vive sólo en su celular (`09-PANEL`). Fuera de GitHub están
el token del reloj de Cloudflare (cargado en el Worker `radar-balcarce-reloj`; el valor está en el secreto `RELOJ_GITHUB_TOKEN`), el de cron-job.org (pausado, en el
encabezado `Authorization` de sus trabajos) y, en la PC, el `.env`.

## Las otras cuentas

| Servicio | Para qué | Cuenta |
|---|---|---|
| Google AI Studio | Las claves de Gemini y sus cupos | `radarbalcarce@gmail.com` |
| Groq (console.groq.com) | La clave de respaldo de la lectura | `radarbalcarce@gmail.com` |
| Google Search Console | Indexación; propiedad de dominio, con los dos sitemaps enviados (`SEO.md`) | `radarbalcarce@gmail.com` |
| DonWeb | El registro del dominio (el DNS está en Cloudflare) | — |
| Tailscale | El túnel que deja entrar al panel de la PC desde afuera (con el panel del celular ya no hace falta; `09-PANEL`) | `radarbalcarce@gmail.com` |
| Vercel | Apagado; falta borrar el proyecto | `radarbalcarce@gmail.com` |
| Meta | La app, la página y el Instagram (`07-REDES`) | `radarbalcarce@gmail.com` |

El WhatsApp que aparece al pie de cada página (`web/lib/datos.js`) es el de
contacto del medio, 2266 51-1612: no es una clave ni el de los avisos del
vigilante (`WHATSAPP_TELEFONO`).

## Vencimientos

| Qué | Cuándo | Qué hacer | Quién avisa |
|---|---|---|---|
| Token de GitHub de cron-job.org (reloj viejo, pausado) | **21/09/2027** | Sólo si se vuelve a usar cron-job.org: crear otro (GitHub, cuenta `balcardev@gmail.com` → Settings → Developer settings → Fine-grained tokens; sólo este repositorio, Actions de lectura y escritura) y pegarlo en el encabezado de **todos** los trabajos de cron-job.org (con la dirección del repositorio nuevo) | El vigilante, desde 30 días antes |
| Dominio `radarbalcarce.com` (DonWeb) | **21/09/2027** | Renovarlo en DonWeb. Si vence, se cae la web y todos los enlaces de los posteos | El vigilante, desde 30 días antes |
| Las dos voces propias de Gemini | **29/09/2027** (la fecha la da Google) | Crearlas de nuevo con "Crear voces" y cambiar los identificadores en `CRITERIO-REDES.md` § 6 (`11-OPERACION`). Si vencen, las piezas con voz dejan de salir | El vigilante, 30 días antes, con la fecha que da Google |
| La llave del panel del celular | Un año después de crearla (la fecha que se elige al crearla) | Crear otra igual y pegarla en el celular (`11-OPERACION`) | Nadie: al vencer, el panel dice "La llave no anda" |
| Medidas de imágenes de las redes (`redes/formatos.mjs`) | 90 días desde la última verificación | Volver a verificarlas (`FORMATOS.md`) | La auditoría semanal |
| `META_TOKEN` | No vence | — | — |

## Lo que cuesta

**Lo único que se paga es el dominio**, que se renueva cada año en DonWeb (el
precio no está en el repositorio). Todo lo demás es gratis: GitHub Actions (el
repositorio es **público**; si se pasara a privado, Actions cobraría minutos mientras el robot siga corriendo ahí), Cloudflare Pages, el DNS y Web Analytics (el plan
gratis permite publicidad; el de Vercel no), el reloj de Cloudflare (el Worker), la API de Meta,
CallMeBot, las tres claves de Gemini y Groq (con sus cupos por día). Si algún
día se vuelve a usar una clave paga de Gemini, antes hay que ponerle un límite
de gasto en Google (`PENDIENTES.md`).

## Dónde se toca cada cosa

| Quiero… | Dónde |
|---|---|
| Cambiar cada cuánto corre algo | El reloj de Cloudflare (`infra/reloj-cloudflare/wrangler.toml` y `worker.mjs`, y después el workflow «Reloj de Cloudflare»); el `schedule` del `.yml` es sólo el respaldo |
| Agregar o cambiar un secreto | GitHub → Settings → Secrets and variables → Actions (lo hace una persona) y, si un workflow nuevo lo necesita, el bloque `env:` de ese paso en el `.yml` |
| Prender o apagar las redes | Variable `REDES_ACTIVAS` |
| Cambiar la versión de wrangler o el proyecto de Pages | `cloudflare-deploy.yml` (versión) y variable `CLOUDFLARE_PROJECT` |
| Qué archivos commitea "Actualizar la web" | La línea `git add` de `actualizar.yml` (un archivo nuevo de `web/data/` que no esté ahí se arma y se pierde al terminar la corrida: pasó el 28/09 con el banco de fotos) |
| El tope diario de la redacción o de la lectura | `REESCRITURA` en `ingesta/criterio.mjs` (y la tabla de `CRITERIO-EDITORIAL.md`); `LECTURA` en `ingesta/lectura-ia.mjs` |
| El orden de las claves de la redacción | `reescribir` (`reels/reescritura.mjs`) y `reels/claves.mjs` |
| El modelo de texto (redacción, lectura, fotos) | `MODELO_DE_TEXTO` (`reels/claves.mjs`); los de Groq, `MODELO_GROQ` (`ingesta/lectura-ia.mjs`) y `MODELO_GROQ_VISION` (`ingesta/fotos.mjs`) |
| El modelo de voz, o qué voz dice cada pieza | `MODELO` en `reels/voz-gemini.mjs`; los identificadores de las dos voces y el reparto, en `CRITERIO-REDES.md` § 6 |
| Qué mira el vigilante: límites, vencimientos, claves | `LIMITES`, `VENCIMIENTOS`, `CLAVES_DE_IA` y `evaluar` (`redes/vigilar.mjs`) |
| Qué dice el WhatsApp y cuánto entra | `redes/avisos.mjs` (`armarMensaje`) y `LARGO_MAXIMO` (`redes/whatsapp.mjs`) |
| A qué hora se mide y se resume | `HORAS_DE_MEDICION` (`redes/estadisticas.mjs`), `horaDelResumen` (`redes/vigilar.mjs`), `cierreMinutoDelDia` (`CONTRATO_DIARIO`) |
| Los encabezados de la web publicada y del panel del celular | `web/public/_headers` |

## Qué archivo hace qué

| Archivo | Qué hace | Quién lo llama | Qué lee | Qué escribe |
|---|---|---|---|---|
| `.github/workflows/*.yml` | Los veintiún workflows (tabla de arriba) | El reloj de Cloudflare, GitHub, el panel del celular, una persona | secretos y variables | commits en `main`, artefactos |
| `web/scripts/generar-datos.mjs` | Todo lo que hace "Actualizar la web" entre las pruebas y la compilación | `actualizar.yml` | fuentes, `web/data/`, claves de IA | `web/data/*.json`, `web/public/fotos-notas/`, `.cache/` |
| `web/scripts/revisar-seo.mjs` | Que el SEO siga en el HTML compilado | `actualizar.yml` | `web/out` | — |
| `reels/claves.mjs` | Las cuatro claves de IA y el modelo de texto | redacción, lectura, fotos, voz | entorno, `.env` | — |
| `panel/celular.mjs` | Escribe con IA la nota que pidió el celular y deja el borrador cifrado (`09-PANEL`) | "Panel del celular" | `.cache/celular-notas.json`, `web/data/` | `web/data/celular-borradores.json` |
| `redes/vigilar.mjs` | El vigilante, y la revisión de claves y voces (`revisarClaves`) | `vigilancia.yml` | la web en vivo, la API de GitHub, `web/data/`, Meta, Google y Groq | `web/data/vigilancia.json`, `estadisticas.json` |
| `redes/avisos.mjs` | Qué se dice y cómo entra en un mensaje | vigilante | portada, libro | — |
| `redes/whatsapp.mjs` | Manda el WhatsApp por CallMeBot sin mostrar la clave | vigilante, auditoría, "Prueba de WhatsApp" | `WHATSAPP_*` | — |
| `redes/estadisticas.mjs` | Visitas (Cloudflare) y seguidores (Meta) | vigilante | `CLOUDFLARE_*`, `META_TOKEN` | — |
| `redes/auditar.mjs` | Auditoría semanal de lo publicado | `auditoria.yml` | la web en vivo, `redes/formatos.mjs` | `web/data/auditoria.json` |
| `web/public/_headers` | Encabezados de Cloudflare (también los de `/panel/`) | Cloudflare Pages | — | — |
| `web/next.config.mjs` | Exportación estática del sitio | `next build` | — | `web/out/` |

## Qué puede fallar y cómo se nota

| Falla | Cómo se nota | Qué hacer |
|---|---|---|
| **El reloj de Cloudflare dejó de despertar** | "No hay corridas nuevas de…" o "El reloj de Redes no corre" (los textos todavía nombran a cron-job.org); la web deja de actualizarse puntual (queda el respaldo de GitHub, impuntual) | Mirar el Worker `radar-balcarce-reloj` en Cloudflare (ejecuciones fallidas: ¿venció el token `RELOJ_GITHUB_TOKEN`?), volver a subirlo con «Reloj de Cloudflare» o, de urgencia, reactivar los trabajos pausados de cron-job.org. Si el apagado es Vigilancia, sólo quedan los avisos del respaldo cada 3 horas: fijarse que llegue el resumen de las 21 |
| **Una prueba falla en "Actualizar la web"** | Corrida roja en "Probar que nada se rompió"; "falla-Actualizar la web" y, a los 100 minutos, "web-vieja" | Leer el paso rojo. Un JSON de `web/data/` mal escrito a mano (por ejemplo `correcciones.json`) también lo causa |
| **La web no compila** | Corrida roja en "Compilar el sitio"; no se commitea nada | Leer el error de Next |
| **Cloudflare no sube** | "falla-Cloudflare Pages"; la web queda con la versión anterior | Mirar el paso "Subir a Cloudflare Pages" (token vencido o sin permiso, versión de wrangler) |
| **La web no responde** | `web-caida` | Mirar Cloudflare (dash.cloudflare.com) |
| **Choque al commitear** | "No se pudo subir la portada después de tres intentos" o "Conflicto fuera de web/data" | Suele arreglarse en la corrida siguiente; si se repite, alguien subió a mano algo que choca |
| **Vigilancia no pudo guardar su estado** | Corrida roja en "Guardar lo avisado": "No se pudo guardar el estado de los avisos después de tres intentos" | La vuelta siguiente lo reintenta; puede repetir un aviso |
| **Google o Groq rechazan una clave** (suspendida, borrada, sin crédito) | WhatsApp `clave-<NOMBRE>` (alta) con lo que contestó el servicio | Una persona crea otra clave (Google AI Studio o console.groq.com) y la pega en GitHub → Secrets. Si es la de redes y cambia de proyecto, crear de nuevo las voces (`11-OPERACION`) |
| **La redacción se quedó sin cupo** | Registro: "tope del día" o pedidos a los respaldos; aviso `pocos-cuerpos`; crece "Esperando cuerpo" en el resumen | Esperar al día siguiente o escribir los cuerpos (panel del celular o `11-OPERACION`) |
| **Se acabó el cupo de voz** | Registro de Redes: "se acabó el cupo del día (429)"; faltan piezas | Vuelve al día siguiente. No correr Piezas, Auditar voz ni Crear voces sin necesidad un día de redes |
| **Una voz ya no existe o está por vencer** | WhatsApp `voz-…` o `vence-voz-…` | Crearla de nuevo (`11-OPERACION`) |
| **Gemini con demasiada demanda (503)** | La redacción falla seguido | Es lo primero que se mira si vuelve a pasar: el modelo (`gemini-flash-lite-latest`) |
| **El WhatsApp no llega** | No llega el resumen de las 21 | "Prueba de WhatsApp"; si CallMeBot dice "APIKey is invalid", la clave está mal copiada; revisar que el teléfono tenga 549 |
| **Faltan permisos en un token** | El resumen dice "falta permiso de Analytics" o que faltan los de Meta | Una persona regenera el token con los permisos |
| **La auditoría semanal no corre** | `auditoria-vencida` si `web/data/auditoria.json` tiene más de 10 días (si el archivo faltara, no avisaría) | Correrla a mano (Actions → Auditoría → Run workflow) |
| **Se vence un token, el dominio o una voz** | Aviso 30 días antes | Ver "Vencimientos" |
| **La PC está apagada** | Sólo deja de andar el panel de la PC (agenda a mano, avisos, buzón, fuentes) | Nada se rompe: la web, las redes, la vigilancia y el panel del celular siguen |

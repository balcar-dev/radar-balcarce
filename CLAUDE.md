# Radar Balcarce

Medio digital automático de Balcarce (Buenos Aires). Lee 33 fuentes cada media
hora, decide qué publicar, arma el sitio y lo sube, sin que haya nadie
despierto. Los usuarios son Hernán y Andrés; escribir siempre en castellano
rioplatense, sin voseo forzado.

## Cómo está armado

    ingesta/   el motor. SIN dependencias: sólo lo que trae Node
    panel/     el tablero editorial (vive en la PC de Hernán, puerto 4321)
    reels/     placas, voz y video. SÍ tiene dependencias (resvg, ffmpeg)
    redes/     publicar en Facebook e Instagram (API de Meta). SIN dependencias
    web/       el sitio público (Next.js 15, JavaScript, HTML estático)
    pruebas/   `npm test`, 300+ pruebas, sin red

Flujo: fuentes → ingesta → clasificar → puntaje → semáforo → `web/data/portada.json`
→ GitHub Actions (cada 30 min) → **Cloudflare Pages** (desde el 24/09; Vercel APAGADO el 25/09, queda
de respaldo). **La web se actualiza con la PC apagada.**

Redes (todo desde GitHub, con la PC apagada): `redes.yml` es el reloj. Varias veces
por día publica en Facebook y, si a esa hora le toca una historia o reel, la arma
con la voz de Gemini y la sube a Instagram. `piezas.yml` sirve para armar o
publicar piezas a mano. Detalle y horarios en `REDES.md`.

## Comandos

    npm test              las pruebas (correr SIEMPRE antes de commitear)
    npm run auditar       qué está decidiendo el filtro sobre las noticias de hoy
    cd web && npm run datos && npm run build     regenerar y compilar

## Reglas que no se negocian

- **`ingesta/`, `panel/` y `redes/` no importan nada de afuera de Node.** Hay una prueba
  que lo vigila. Dos veces se coló un import pesado y las pruebas rompieron en
  GitHub Actions andando en la máquina.
- **Cuando se arregla algo que estuvo mal publicado, se escribe una prueba.**
- **Nada sensible sale solo a las redes.** Política y Policiales esperan a una
  persona en TODAS las piezas (`redes/elegir.mjs`), aunque en la web salgan por
  el semáforo.
- **Todo lo que va a Instagram es video con voz.** La API no acepta una imagen
  si no está en una dirección pública, y no alojamos archivos.
- **Tokens y claves nunca en un chat ni en el código.** Van a GitHub Secrets o
  al `.env`. Quien los pega es una persona.
- **Nunca la foto de otro medio.** La ley 11.723 cubre el texto, no las fotos.
  Va una placa propia con el titular.
- **Nunca identificar a un menor ni a una víctima** (leyes 26.061 y 26.485). El
  semáforo rojo lo frena; no tocar esa lista sin preguntar.
- **Lo que escribe la IA se verifica contra la fuente** (`ingesta/verificar.mjs`).
  Si inventó un número, un nombre, un día o una cita, no se usa.
- **Cada nota dice quién la escribió** (IA o fuente, automática o revisada).

## Cosas que muerden

- **Node carga el código al arrancar.** Si se toca `ingesta/`, `panel/` o
  `reels/`, hay que reiniciar el panel (cerrar su ventana y correr `ARRANCAR.bat`).
  Si no, sigue trabajando con la versión vieja.
- **Los archivos del repo están en CRLF.** Editar por líneas, no con
  reemplazos multilínea: un `\n` literal no encuentra nada.
- **Escapar barras invertidas desde la terminal falla.** Para regex con `\b`,
  `\s`, `\d`: escribir un archivo `.cjs` con la herramienta Write, no `node -e`.
- **`web/data/portada.json` lo regenera GitHub Actions.** Antes de `git push`
  suele haber conflicto en ese archivo: `git pull --rebase`, resolver con
  `git checkout --theirs web/data/portada.json`, continuar.
- **El turno de farmacia dura hasta las 8:30 de la mañana del día siguiente**, no
  hasta la medianoche. La regla está en `ingesta/utiles.mjs`.
- **Las palabras clave cortas engañan.** "gol" encontraba "golpe"; "partido" en
  la provincia es un municipio. Las ambiguas están en `PALABRAS_DEBILES`
  (`ingesta/ingesta.mjs`) y sólo deciden desde el titular.

- **Las redes tienen un interruptor:** la variable de GitHub `REDES_ACTIVAS`.
  Con `Si` (cualquier mayúscula o tilde) publica; con otro valor todo corre pero
  sólo simula. No hay que tocar código para prender o apagar.
- **Dos claves de Gemini, separadas a propósito:** `GEMINI_API_KEY_REDACCION`
  para redactar las notas (acepta el nombre viejo `GEMINI_API_KEY`) y
  `GEMINI_API_KEY_REDES` para voces y reels (`reels/claves.mjs`). La de redes
  no tiene alternativa: si falta, los reels no arrancan. La de redes es paga.
- **En GitHub las piezas se arman con lo ya publicado** (`web/data/portada.json`,
  vía `redes/datos.mjs`), no con los datos del panel. `reels/marca/` está en
  `.gitignore` salvo las tipografías; la cortina de sonido se genera sola.
- **Para que hoy y las horas sean las de Balcarce en Actions** hay que poner
  `TZ: America/Argentina/Buenos_Aires` en el workflow: el servidor corre en UTC.

## Cuentas

- **GitHub:** `balcardev@gmail.com` (única con ese correo). Repo `balcar-dev/radar-balcarce`.
- **Todo lo demás:** `radarbalcarce@gmail.com` (Cloudflare, Vercel, Google/Gemini, Meta, Instagram).
- **Meta:** app "Radar Balcarce Publicador" (ID 2302218363874399), usuario del
  sistema `publicador-radar`, token sin vencimiento en el secreto `META_TOKEN`.
  Página de Facebook "Radar Balcarce"; su ID para la API es **1254237411116171**
  (no el número de la dirección de Facebook). Instagram `@radarbalcarce`.
- El correo de los commits automáticos es el noreply de GitHub, porque Vercel
  valida la firma contra una cuenta de GitHub. No cambiarlo.

## Estado y pendientes

- Sitio: **`radarbalcarce.com`**, servido por **Cloudflare Pages** desde el
  24/09 (nameservers de DonWeb → Cloudflare; `www` también). Se despliega solo
  después de cada "Actualizar la web" (`cloudflare-deploy.yml`, con los
  secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`). Vercel (apagado el 25/09: sin conexión a GitHub) ya no
  despliega ni recibe el dominio; falta borrar el proyecto. `www`
  redirige (301) al dominio sin `www` con una regla de Cloudflare. Web
  Analytics de Cloudflare está activado. Search Console verificado y con los
  dos sitemaps enviados (24/09). Cloudflare permite publicidad; Vercel Hobby no.
- **Redes, al 24/09: andando.** Meta destrabó la cuenta; Redes y Piezas están
  prendidos y los dispara cron-job.org (dos trabajos, uno para "Actualizar la
  web" y otro para el reloj de Redes; si un trabajo falla varias veces
  cron-job.org lo **desactiva solo**: revisarlos si algo deja de salir).
  Facebook publica una nota por vez (5 por día como máximo, relevancia 75 o
  más) con el enlace a la nota y sin nombrar la fuente, y la espeja como foto
  en el feed de Instagram. Instagram y la página de Facebook reciben las
  piezas de video: clima, farmacia y **tres podcasts** (mañana, tarde y noche,
  con notas de temas distintos), y cada podcast se sube también como historia.
  Ya no salen noticias sueltas. Horarios y reglas: `REDES.md`. El token de
  GitHub de cron-job.org vence el 21/09/2027: hay que renovarlo antes.
- **La reescritura con IA corre sola, 100% en la nube, desde el 22/09**: lo
  que se publica sin revisión humana se reescribe en cada corrida de
  "Actualizar la web" (no sólo cuando el panel está prendido), cruzando
  varias fuentes cuando hay más de una, con un tono distinto para lo serio
  (Policiales, inseguridad, emergencias) que para el resto, y verificado
  contra la fuente antes de aceptarse. Detalle completo: `EDITORIAL.md`.
- **Analítica: Cloudflare Web Analytics** (dash.cloudflare.com, gratis y sin
  cookies). Las analíticas de Vercel se sacaron al mudar el sitio. Todavía hay
  poco tráfico para sacar conclusiones.
- **Los tres avisos publicitarios se cargan desde el panel** (pestaña Avisos,
  23/09), no editando `web/data/avisos.json` a mano. Detalle: `PUBLICIDAD.md`.
- **Vigilancia** (`redes/vigilar.mjs`, workflow "Vigilancia", tercer trabajo de
  cron-job.org cada 30 min): revisa la web publicada, las corridas de GitHub,
  el reloj de redes y las piezas fijas del día, y avisa por **WhatsApp**
  (CallMeBot; secretos `WHATSAPP_TELEFONO` y `WHATSAPP_APIKEY`, los pega una
  persona) una vez cada 6 horas por problema, más un resumen "todo bien" a las
  21. También avisa 30 días antes de que venza el token de GitHub
  (21/09/2027). Sin esos secretos corre igual y no avisa.
- **Base comercial** (`comercial/`, ver `COMERCIAL.md`): comercios de Balcarce, aparte
  del sitio, con puntaje de "¿sigue abierto?". Todavía no se usa en la web.
- **SEO:** `web/scripts/auditar-seo-vivo.mjs [url]` audita las páginas
  publicadas (título, descripción, h1, canónico, ícono, imagen para compartir).
- **Respaldo del panel:** `panel/respaldo.mjs` copia `panel/datos/` al arrancar y
  cada 6 horas; con `RESPALDO_CARPETA` apuntando a Drive/OneDrive queda afuera
  de la PC.
- **Lo que decide el panel se sube solo a GitHub** (`panel/sincronizar.mjs`,
  unos segundos después del último cambio; se apaga con
  `SINCRONIZAR_GITHUB=no`). El panel sigue viviendo en la PC: si está apagada,
  no se pueden decidir notas amarillas ni cargar avisos.
- **La IA recibe el texto completo de la nota original** (`ingesta/articulo.mjs`)
  para escribir el cuerpo, y se verifica contra todo lo que recibió. Sin eso
  inventaba nombres y números y se rechazaba 65% de las notas.
- **Todo lo que falta, por categoría, está en [`PENDIENTES.md`](PENDIENTES.md)**
  (redes, SEO, bios, editorial, técnico) y en `IDEAS.md` (ideas de producto).
  Qué se publica y cómo se escribe: `EDITORIAL.md`. Redes: `REDES.md`.
  Documentación del proyecto: `MANUAL.md`.

## Dónde tocar cada cosa

| Quiero… | Archivo |
|---|---|
| agregar una fuente o cambiar un peso | `ingesta/fuentes.mjs` |
| que una palabra mande una nota a otra sección | `REGLAS_SECCION`, mismo archivo |
| que algo espere aprobación o nunca salga | `REGLAS_SEMAFORO`, mismo archivo |
| cambiar cuánto puntaje pide cada sección | `PISO_DE_AFUERA` y `CUPO_DE_AFUERA`, mismo archivo |
| agregar un tema que se sigue | `TEMAS`, mismo archivo |
| ajustar el filtro de la IA | `ingesta/verificar.mjs` |
| cambiar el tono o las reglas con que la IA reescribe una nota | `reels/reescritura.mjs` (`INSTRUCCION_EDITORIAL`, `esTemaSerio`) |
| cambiar cuándo salen las historias | panel → Calendario (`panel/horarios.mjs`) |
| cambiar qué se publica en Facebook, reels, historias o el podcast | `redes/elegir.mjs` |
| cambiar a qué hora sale una pieza de Instagram | `redes/piezas.mjs` (ventana) y `reels/plan.mjs` (horarios de reels e historias de notas) |
| prender o apagar la publicación en redes | variable `REDES_ACTIVAS` en GitHub |
| cambiar cómo se habla con Meta | `redes/meta.mjs` |
| cargar o sacar un aviso publicitario | panel → Avisos (`web/data/avisos.json`) |
| cambiar una medida de imagen de Instagram/Facebook | `redes/formatos.mjs` (fuente única, con fecha de verificación) y `FORMATOS.md`. Los lunes `redes/auditar.mjs` audita lo publicado y avisa por WhatsApp si algo se desvió o los datos pasaron de 90 días |
| cambiar qué revisa el vigilante o cuándo avisa | `redes/vigilar.mjs` |
| sumar o completar comercios | `comercial/` (ver `COMERCIAL.md`) |

## Dónde está cada documento

| Documento | Qué cuenta |
|---|---|
| `EMPEZAR-ACA.md` | Enlaces, qué corre solo y qué hay que hacer a mano |
| `REGLAS.md` | Lo que se exige siempre y la prueba o el chequeo que lo cuida |
| `INFRAESTRUCTURA.md` | Qué corre dónde, secretos por nombre, vencimientos, qué se cae y cómo se ve |
| `MANUAL.md` | Cómo se eligen las noticias: puntaje, semáforo, diseño de la web |
| `EDITORIAL.md` | Secciones y cómo se escribe una nota (título, copete, cuerpo) |
| `REDES.md` | Qué se publica en Instagram y Facebook, cuándo y con qué reglas |
| `PERFILES.md` | Biografías, categorías y colores de las redes |
| `FORMATOS.md` | Medidas de imágenes y videos, con la auditoría semanal |
| `SEO.md` | Posicionamiento: qué está hecho, cómo se audita, qué falta |
| `PANEL.md` | El tablero: pestañas, usuarios, respaldo, sincronización y cómo pasarlo online |
| `PUBLICIDAD.md` | Avisos, monetización y AdSense |
| `COMERCIAL.md` | La base de comercios, la vigencia y las propuestas |
| `INVESTIGACION.md` | Lo legal, con fuentes |
| `INVESTIGACION-COMPETENCIA.md` | Lo que hacen los otros medios, con hecho/pendiente |
| `POLITICA-PRIVACIDAD.md` | El texto de la política de privacidad del sitio |
| `PENDIENTES.md` | Qué falta, por categoría |
| `AUDITORIA.md` | Última auditoría completa (25/09), por urgencia |
| `IDEAS.md` | Ideas de producto |
| `NOTAS.md` | Decisiones vigentes (corto) |
| `HISTORIA.md` | Qué se hizo y por qué, con fecha (histórico) |
| `web/README.md` | La web: cómo correrla y dónde está cada cosa |

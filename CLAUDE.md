# Radar Balcarce

*Actualizado el 26/09/2026.*

Medio digital automático de Balcarce (Buenos Aires). Lee 58 fuentes cada media
hora, decide qué publicar, arma el sitio y lo sube, sin que haya nadie
despierto. Los usuarios son Hernán y Andrés; escribir siempre en castellano
rioplatense, sin voseo forzado.

## Cómo está armado

    ingesta/   el motor. SIN dependencias: sólo lo que trae Node
    panel/     el tablero editorial (vive en la PC de Hernán, puerto 4321)
    reels/     placas, voz y video. SÍ tiene dependencias (resvg, ffmpeg)
    redes/     publicar en Facebook e Instagram (API de Meta). SIN dependencias
    web/       el sitio público (Next.js 15, JavaScript, HTML estático)
    pruebas/   `npm test`, más de 1.100 pruebas, sin red

Flujo: fuentes → ingesta → clasificar → puntaje → semáforo → `web/data/portada.json`
→ GitHub Actions (cada 30 min) → **Cloudflare Pages** (desde el 24/09). Vercel
está apagado desde el 25/09; falta borrar el proyecto. **La web se actualiza con
la PC apagada.**

Redes (todo desde GitHub, con la PC apagada): `redes.yml` es el reloj. Varias veces
por día publica en Facebook y, si a esa hora le toca una historia o reel, la arma
con la voz de Gemini y la sube a Instagram. `piezas.yml` sirve para armar o
publicar piezas a mano. Detalle y horarios en `REDES.md`; cómo suenan y qué dicen
las piezas, en `CRITERIO-REDES.md`. La lista de todos los workflows (qué hace
cada uno, cuándo corre y si cuesta plata), en `INFRAESTRUCTURA.md`.

## Comandos

    npm test              las pruebas (correr SIEMPRE antes de commitear)
    npm run auditar       qué está decidiendo el filtro sobre las noticias de hoy
    cd web && npm run datos && npm run build     regenerar y compilar

## Reglas que no se negocian

- **`ingesta/`, `panel/` y `redes/` no importan nada de afuera de Node.** Hay una prueba
  que lo vigila. Dos veces se coló un import pesado y las pruebas rompieron en
  GitHub Actions andando en la máquina.
- **Cuando se arregla algo que estuvo mal publicado, se escribe una prueba.**
- **El criterio editorial es uno solo: [`CRITERIO-EDITORIAL.md`](CRITERIO-EDITORIAL.md).**
  Qué se publica, cómo se escribe (título, bajada, cuerpo), cómo se trabaja con
  las fuentes, cómo se verifica, qué ve el lector, redes, firma. La IA lee su
  sección 12 **tal cual** (`ingesta/prompt-editorial.mjs`; si falta, la
  reescritura no arranca) y sus números están en `ingesta/criterio.mjs`,
  controlados contra la tabla del documento (`pruebas/criterio.test.mjs`). Un
  cambio de criterio se hace ahí, no en el código ni en otro documento. Lo que
  nunca se rompe al tocar código: nunca identificar a un menor ni a una
  víctima (el semáforo rojo; no tocar esa lista sin preguntar), nunca la foto
  de otro medio, lo que escribe la IA se verifica contra la fuente, cada nota
  dice quién la escribió, y Política y Policiales esperan a una persona en
  TODAS las piezas de redes.
- **Todo lo que va a Instagram es video con voz.** La API no acepta una imagen
  si no está en una dirección pública, y no alojamos archivos.
- **Tokens y claves nunca en un chat ni en el código.** Van a GitHub Secrets o
  al `.env`. Quien los pega es una persona.
- **Sin cuerpo no se publica** (25/09). Una nota automática sin cuerpo de al
  menos 70 palabras no va a ningún lado público (`web/lib/cuerpo.js`); se
  reintenta hasta tres veces (`web/data/intentos-ia.json`). Lo que publica una
  persona se respeta, pero el panel pide confirmarlo.
- **El lector ve la nota, no el análisis** (25/09). La página muestra título,
  bajada, cuerpo y un desplegable cerrado "Fuentes (N)". Claves, qué se sabe,
  qué falta confirmar, aportes y nivel de verificación son de uso interno: se
  ven en el panel. Verificación BAJA y la cotización del dólar no salen solas.

## Cosas que muerden

- **Node carga el código al arrancar.** Si se toca `ingesta/`, `panel/` o
  `reels/`, hay que reiniciar el panel (cerrar su ventana y correr `ARRANCAR.bat`).
  Si no, sigue trabajando con la versión vieja.
- **Los archivos del repo están en CRLF.** Editar por líneas, no con
  reemplazos multilínea: un `\n` literal no encuentra nada.
- **Escapar barras invertidas desde la terminal falla.** Para regex con `\b`,
  `\s`, `\d`: escribir un archivo `.cjs` con la herramienta Write, no `node -e`.
- **`web/data/portada.json` y `web/data/archivo.json` los regenera GitHub
  Actions.** Antes de `git push` suele haber conflicto en esos archivos:
  `git pull --rebase`, resolver con `git checkout --theirs` sobre cada uno,
  continuar.
- **La dirección de una nota es fija** desde la primera vez que sale, aunque la
  IA cambie el titular después (los enlaces ya están en Facebook). La portada
  muestra sólo 72 horas; `web/data/archivo.json` guarda lo publicado de los
  últimos 180 días (hasta 2500 notas) y de ahí también salen páginas. Si una
  nota pasa a rojo o amarillo, o una persona la bloquea, sale del archivo y
  pierde la página. Todo en `web/lib/archivo.js`.
- **El turno de farmacia dura hasta las 8:30 de la mañana del día siguiente**, no
  hasta la medianoche. La regla está en `ingesta/utiles.mjs`. El turno se
  cruza contra La Vanguardia y Radio Gabal; la dirección sale del Colegio o de
  La Vanguardia, y las que no están en ninguno (San José de la Plaza) van en
  `FARMACIAS_A_MANO`
  (`ingesta/fuentes.mjs`).
- **Si Open-Meteo falla, el clima sale de `api.met.no`** (gratis, sin clave).
  No da sensación térmica: no se inventa.
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
  La de redacción es **gratis y está cargada y probada desde el 25/09**: la
  reescritura la usa primero y pasa a la de redes (paga) sólo si se queda sin
  cupo (429). Tope de 150 notas por día (`REESCRITURA.porDia`).
  La reescritura usa `gemini-flash-lite-latest`: `gemini-flash-latest` daba
  503 de alta demanda seguido; si vuelve a fallar, es el primer lugar donde mirar.
- **En GitHub las piezas se arman con lo ya publicado** (`web/data/portada.json`,
  vía `redes/datos.mjs`), no con los datos del panel. `reels/marca/` está en
  `.gitignore` salvo las tipografías; la cortina de sonido se genera sola.
- **Para que hoy y las horas sean las de Balcarce en Actions** hay que poner
  `TZ: America/Argentina/Buenos_Aires` en el workflow: el servidor corre en UTC.

## Cuentas

- **GitHub:** `balcardev@gmail.com` (única con ese correo). Repo
  `balcar-dev/radar-balcarce`, **público desde el 25/09**: un repo privado
  gastaba los 2.000 minutos gratis de Actions hacia el día 6 de cada mes, y
  los públicos no pagan minutos. Se revisó todo el historial: no hay ninguna
  clave. Por eso, más que nunca, nada sensible en el repo.
- **Todo lo demás:** `radarbalcarce@gmail.com` (Cloudflare, Vercel, Google/Gemini, Meta, Instagram).
- **Meta:** app "Radar Balcarce Publicador" (ID 2302218363874399), **publicada
  (modo activo) el 26/09**: antes estaba en modo desarrollo y por eso el
  público no veía los posteos ni los reels de Facebook (las historias sí).
  Usuario del sistema `publicador-radar`, token sin vencimiento en el secreto
  `META_TOKEN`.
  Página de Facebook "Radar Balcarce"; su ID para la API es **1254237411116171**
  (no el número de la dirección de Facebook). Instagram `@radarbalcarce`.
- El correo de los commits automáticos es el noreply de GitHub (lo pedía
  Vercel para validar la firma). No cambiarlo.

## Estado y pendientes

- Sitio: **`radarbalcarce.com`**, servido por **Cloudflare Pages** desde el
  24/09 (nameservers de DonWeb → Cloudflare; `www` también). Se despliega solo
  después de cada "Actualizar la web" (`cloudflare-deploy.yml`, con los
  secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`). Vercel está
  apagado desde el 25/09 (sin conexión a GitHub); falta borrar el proyecto y
  limpiar el DNS que quedó. `www`
  redirige (301) al dominio sin `www` con una regla de Cloudflare. Web
  Analytics de Cloudflare está activado. Search Console verificado y con los
  dos sitemaps enviados (24/09). Cloudflare permite publicidad; Vercel Hobby no.
- **Redes, al 26/09: andando y visibles.** Meta destrabó la cuenta el 24/09 y
  el 26/09 se publicó la app (falta comprobar con alguien que no sea
  administrador que ya se ven los posteos y los reels: `PENDIENTES.md`). Redes y Piezas están
  prendidos y los dispara cron-job.org (tres trabajos: "Actualizar la web",
  el reloj de Redes y "Vigilancia"; si un trabajo falla varias veces
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
  contra la fuente antes de aceptarse. Detalle completo: `CRITERIO-EDITORIAL.md`.
- **Analítica: Cloudflare Web Analytics** (dash.cloudflare.com, gratis y sin
  cookies). Las analíticas de Vercel se sacaron al mudar el sitio. Todavía hay
  poco tráfico para sacar conclusiones. **Faltan** el secreto
  `CLOUDFLARE_ANALYTICS_TOKEN` y los permisos `read_insights` e
  `instagram_manage_insights` en `META_TOKEN`: sin ellos el resumen de las
  9 dice qué le falta (`INFRAESTRUCTURA.md`, `PENDIENTES.md`).
- **Los tres avisos publicitarios se cargan desde el panel** (pestaña Avisos,
  23/09), no editando `web/data/avisos.json` a mano. Detalle: `PUBLICIDAD.md`.
- **Vigilancia** (`redes/vigilar.mjs`, workflow "Vigilancia", tercer trabajo de
  cron-job.org cada 30 min): revisa la web publicada, las corridas de GitHub,
  el reloj de redes y las piezas fijas del día, y avisa por **WhatsApp**
  (CallMeBot; secretos `WHATSAPP_TELEFONO` y `WHATSAPP_APIKEY`, los pega una
  persona) una vez cada 6 horas por problema, más un resumen "todo bien" a las
  21. También avisa 30 días antes de que venzan el token de GitHub y el
  dominio (los dos el 21/09/2027). **El WhatsApp funciona desde el 25/09**
  (se prueba con el workflow "Prueba de WhatsApp"). Sin esos secretos corre
  igual y no avisa. Cuando encuentra un problema deja un aviso amarillo en
  Actions, no una falla roja.
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
  inventaba nombres y números y se rechazaba 65% de las notas. Si el cuerpo
  trae un dato que no cuadra, se sacan esas oraciones (`depurarCuerpo`). Sin
  texto completo de ninguna fuente y con un resumen corto, no se le pide nada.
  El panel reescribe con el mismo flujo (`reescribirAutomaticas`).
- **Todo lo que falta, por categoría, está en [`PENDIENTES.md`](PENDIENTES.md)**
  (redes, SEO, bios, editorial, técnico) y en `IDEAS.md` (ideas de producto).
  Qué se publica y cómo se escribe: `CRITERIO-EDITORIAL.md`. Redes: `REDES.md`.
  Documentación del proyecto: `MANUAL.md`.

## Dónde tocar cada cosa

| Quiero… | Archivo |
|---|---|
| agregar una fuente o cambiar un peso | `ingesta/fuentes.mjs` |
| que una palabra mande una nota a otra sección | `REGLAS_SECCION`, mismo archivo |
| que algo espere aprobación o nunca salga | `REGLAS_SEMAFORO`, mismo archivo |
| cambiar el criterio editorial, el tono o las reglas de escritura | `CRITERIO-EDITORIAL.md` (la IA lo lee tal cual; reiniciar el panel) |
| cambiar un número del criterio (largos, intentos, cupos, pisos, Facebook, podcasts) | `ingesta/criterio.mjs` **y** la tabla "Los números" de `CRITERIO-EDITORIAL.md` (una prueba controla que digan lo mismo) |
| cambiar cuánto puntaje pide cada sección | `PISO_DE_AFUERA` y `CUPO_DE_AFUERA`, en `ingesta/criterio.mjs` (y en `CRITERIO-EDITORIAL.md`) |
| agregar un tema que se sigue | `TEMAS`, mismo archivo |
| ajustar el filtro de la IA | `ingesta/verificar.mjs` |
| que el semáforo mire lo que escribe la IA | `reels/reescritura.mjs` (`semaforoDeLaReescritura`; usa las listas de `REGLAS_SEMAFORO`) |
| cuánto dura una nota en la portada o en el archivo | `web/lib/archivo.js` (`HORAS_EN_PORTADA`, `DIAS_DE_ARCHIVO`, `MAXIMO_EN_ARCHIVO`) |
| que una palabra pida el tono serio | `CRITERIO-EDITORIAL.md`, sección 4 ("Los dos tonos") |
| cambiar cómo se calcula el nivel de verificación, los antecedentes o las partes nuevas (claves, qué se sabe, texto para redes) | `reels/reescritura.mjs` (`nivelDeVerificacion`, `antecedentesDe`, `completarReescritura`); se ven en el panel ("Análisis interno", `panel/panel.html`), no en la web. Qué fuente es oficial: `oficial: true` en `ingesta/fuentes.mjs` |
| cambiar qué ve el lector al pie de la nota (el desplegable de fuentes) | `web/components/verificacion.js` y `web/lib/fuentes-de-la-nota.js` |
| cambiar cuándo una nota "tiene cuerpo" o cuántos intentos se le dan | `web/lib/cuerpo.js` (`PALABRAS_MINIMAS_CUERPO`) y `reels/reescritura.mjs` (`MAXIMO_DE_INTENTOS`, `PALABRAS_MINIMAS_DE_MATERIAL`) |
| que la cotización del dólar (u otra cosa que no es nota) no salga | `REGLAS_SEMAFORO.cotizacion` en `ingesta/fuentes.mjs` (mira sólo el título) |
| cambiar cuándo salen las historias | panel → Calendario (`panel/horarios.mjs`) |
| cambiar qué se publica en Facebook, reels, historias o el podcast | `redes/elegir.mjs` |
| ver qué hay publicado de verdad en la página de Facebook (posteos, reels, historias) | workflow manual "Ver Facebook" (`redes/ver-facebook.mjs`); sólo lee |
| cambiar las estadísticas de los resúmenes de las 9 y de las 21 (visitas, seguidores) | `redes/estadisticas.mjs` (historia en `web/data/estadisticas.json`); a mano, workflow "Prueba de estadísticas" |
| cambiar el reintento del espejo de Instagram (la foto de un posteo de Facebook) | `redes/espejo.mjs` |
| cambiar qué notas propone "Seguí leyendo" o cómo se arma la tapa | `web/lib/seguir-leyendo.js` y `armarTapa` en `web/lib/datos.js` (reglas en `CRITERIO-EDITORIAL.md` § 7) |
| cambiar las notas propias (el dólar del día, el repaso de cada podcast) | `web/lib/notas-propias.js` (`CRITERIO-EDITORIAL.md` § 8; `web/README.md`) |
| cambiar cómo suenan o qué dicen las piezas de redes (la voz, saludos, cierres, cuándo se dice la dirección, largos) | `CRITERIO-REDES.md` (la identidad y las instrucciones de voz se leen de ahí; los bancos de frases, en `redes/guiones.mjs`; reiniciar el panel). Se controla con `npm test` y, para la voz de verdad, con el workflow manual "Auditar voz" |
| cambiar a qué hora sale una pieza de Instagram | `redes/piezas.mjs` (ventana) y `reels/plan.mjs` (horarios de reels e historias de notas) |
| prender o apagar la publicación en redes | variable `REDES_ACTIVAS` en GitHub |
| cambiar cómo se habla con Meta | `redes/meta.mjs` |
| cargar o sacar un aviso publicitario | panel → Avisos (`web/data/avisos.json`) |
| cambiar la página del dólar (fuentes, tipos, textos de "actualizado") | `web/lib/dolar.js` y `web/components/dolar-vivo.js`; la foto de respaldo la guarda `web/scripts/foto-dolar.mjs` en cada build. Nunca decir "en vivo" |
| cambiar una medida de imagen de Instagram/Facebook | `redes/formatos.mjs` (fuente única, con fecha de verificación) y `FORMATOS.md`. Los lunes `redes/auditar.mjs` audita lo publicado y avisa por WhatsApp si algo se desvió o los datos pasaron de 90 días |
| cambiar qué revisa el vigilante o cuándo avisa | `redes/vigilar.mjs` |
| cambiar qué tiene que salir cada día en Facebook e Instagram (el contrato: 3 reels, 6 historias, 5 posteos) | `redes/contrato.mjs` (piezas y estados), los números en `CONTRATO_DIARIO` (`ingesta/criterio.mjs` **y** la tabla de `CRITERIO-EDITORIAL.md`), las horas y ventanas en `redes/piezas.mjs`; se documenta en `REDES.md` ("El contrato del día") |
| auditar lo publicado contra Meta (duplicados, faltantes, libro sin Meta, % de la semana) | `redes/auditar-redes.mjs`; a mano, workflow "Auditar redes"; el cierre de las 23:30 está en `redes/vigilar.mjs` (`fechaDelCierre`, `cierreDelDia`) |
| sumar o completar comercios | `comercial/` (ver `COMERCIAL.md`) |
| publicar un evento, su página en la web o a quién pedirle fechas | panel → Agenda (`panel/agenda.mjs`); la página, `web/lib/eventos.js` y `web/app/agenda/[id]`; los contactos, `ingesta/contactos-agenda.json` (ver `CRITERIO-EDITORIAL.md` § 8 y `PANEL.md`) |

## Dónde está cada documento

| Documento | Qué cuenta |
|---|---|
| `EMPEZAR-ACA.md` | Enlaces, qué corre solo y qué hay que hacer a mano |
| `REGLAS.md` | Lo que se exige siempre y la prueba o el chequeo que lo cuida; las decisiones que siguen valiendo |
| `INFRAESTRUCTURA.md` | Qué corre dónde, secretos por nombre, vencimientos, qué se cae y cómo se ve |
| `MANUAL.md` | Cómo se eligen las noticias: puntaje, semáforo, diseño de la web |
| `CRITERIO-EDITORIAL.md` | **El criterio editorial único**: qué entra, semáforo, cómo se escribe (título, bajada, cuerpo), fuentes, verificación, qué ve el lector, notas propias, redes, firma, los números y la instrucción exacta de la IA |
| `CRITERIO-REDES.md` | **El criterio único de las redes**: identidad ("Radar Balcarce", `radarbalcarce.com`), la voz (siempre la misma locutora), una ficha por pieza, las reglas de toda pieza, los números y las instrucciones exactas de voz |
| `REDES.md` | Qué se publica en Instagram y Facebook, cuándo y con qué reglas (horarios e infraestructura; cómo suena, en `CRITERIO-REDES.md`) |
| `PERFILES.md` | Biografías, categorías y colores de las redes |
| `FORMATOS.md` | Medidas de imágenes y videos, con la auditoría semanal |
| `SEO.md` | Posicionamiento: qué está hecho, cómo se audita, qué falta |
| `PANEL.md` | El tablero: pestañas, usuarios, respaldo, sincronización y cómo pasarlo online |
| `PUBLICIDAD.md` | Avisos, monetización y AdSense |
| `COMERCIAL.md` | La base de comercios, la vigencia y las propuestas |
| `INVESTIGACION.md` | Lo legal, con fuentes |
| `POLITICA-PRIVACIDAD.md` | El texto de la política de privacidad del sitio |
| `PENDIENTES.md` | Qué falta, por categoría |
| `IDEAS.md` | Ideas de producto y de sistema |
| `ingesta/README.md` | El motor: qué hace cada archivo y cómo correrlo a mano |
| `web/README.md` | La web: cómo correrla y dónde está cada cosa |
| `docs/historico/HISTORIA.md` | Qué se hizo y por qué, con fecha (histórico, no se mantiene) |
| `docs/historico/AUDITORIA.md` | La auditoría del 25/09 y qué quedó arreglado (histórico) |
| `docs/historico/INVESTIGACION-COMPETENCIA.md` | Lo que hacen los otros medios, con hecho/pendiente (18/09, histórico) |

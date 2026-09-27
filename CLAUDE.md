# Radar Balcarce

*Actualizado el 27/09/2026.*

Medio digital automático de Balcarce (Buenos Aires). Lee 214 feeds activos (218 configurados: 54 de
los 58 de `ingesta/fuentes.mjs` y los 160 del cruce de medios, de 71 medios,
en `ingesta/fuentes-cruce.mjs`; la lista entera, en `FUENTES.md`) cada media hora, decide qué publicar, arma el sitio y lo sube, sin que haya nadie
despierto. Los usuarios son Hernán y Andrés; escribir siempre en castellano
rioplatense, sin voseo forzado.

## Cómo está armado

    ingesta/   el motor. SIN dependencias: sólo lo que trae Node
    panel/     el tablero editorial (vive en la PC de Hernán, puerto 4321)
    reels/     placas, voz y video. SÍ tiene dependencias (resvg, ffmpeg)
    redes/     publicar en Facebook e Instagram (API de Meta). SIN dependencias
    web/       el sitio público (Next.js 15, JavaScript, HTML estático)
    pruebas/   `npm test`, más de 1.200 pruebas, sin red

Flujo: fuentes → cruce de medios → clasificar → puntaje → semáforo → lectura con IA
→ reescritura con IA → `web/data/portada.json`
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
  persona se respeta, pero el panel pide confirmarlo. Un cuerpo escrito en
  `web/data/correcciones.json` cuenta como cuerpo (27/09).
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
  pierde la página. Lo de afuera contado por un solo medio también la pierde,
  salvo que haya salido en redes (27/09: eran 1.069 páginas, todas de antes del
  cruce; `tieneRespaldo`). Todo en `web/lib/archivo.js`.
- **El turno de farmacia dura hasta las 8:30 de la mañana del día siguiente**, no
  hasta la medianoche. La regla está en `ingesta/utiles.mjs`. El turno se
  cruza contra La Vanguardia y Radio Gabal; la dirección sale del Colegio o de
  La Vanguardia, y las que no están en ninguno (San José de la Plaza) van en
  `FARMACIAS_A_MANO`
  (`ingesta/fuentes.mjs`).
- **Si Open-Meteo falla, el clima sale de `api.met.no`** (gratis, sin clave).
  No da sensación térmica: no se inventa.
- **El panel pisa las decisiones cargadas a mano** si está prendido: guarda su
  estado en memoria y cada 10 minutos lo vuelve a escribir en
  `web/data/decisiones.json`. Para sacar notas sin el panel, usar
  `web/data/retiradas.json`.
- **Una nota de afuera es "de Balcarce" sólo si el medio lo dice en el título**
  (27/09). Nombrarla en el texto no alcanza: así se colaron Necochea y el
  riesgo país. Y a las redes va sólo lo de Balcarce.
- **Del extranjero, sólo con un argentino; lo de la zona, aunque lo cuente un
  medio** (27/09, Hernán). La lectura con IA saca lo internacional sin una
  figura argentina (Colapinto, Messi) ni conexión argentina en el título: la
  Fórmula 1 o el fútbol de otro país sin un argentino ya no pasan
  (`aplicarFichas`, "es del extranjero"). Lo que toca la zona (`PALABRAS_ZONA`:
  la 226, la 55, la papa, el sudeste) sale solo aunque lo cuente un solo medio
  (`deLaZona`, en `semaforo` y `exigirMedios`); la IA igual saca lo que no
  tenga relación con acá.
- **Un medio de acá que copia una noticia de afuera no la hace de Balcarce**
  (27/09: Malvinas, un incendio en Misiones, una pelea de UFC). Si la historia
  la cuentan también medios de afuera y ningún medio de acá nombra algo de
  Balcarce (en el título o al comienzo), el cruce la trata como de afuera: la
  principal es de un medio de afuera y pide los medios de su sección
  (`historiaDeAca` y `mencionaBalcarce`, en `ingestar`).
- **Nada de más de 72 horas en la portada ni en las secciones** (27/09, Hernán:
  "no puede salir nada que ya tenga más de 72 horas publicado"). Para completar
  una sección, del archivo vuelve sólo lo de esas mismas 72 horas
  (`HORAS_PARA_COMPLETAR = HORAS_EN_PORTADA`, `web/lib/datos.js`; eran 14 días
  y después 7), y una misma historia no completa dos secciones. El Diario
  Balcarce, que se raspa, muestra en su portada notas viejas sin fecha (el
  27/09, de 2025): se abre cada nota para leer `article:published_time` y lo
  de más de 72 horas no se trae (`ampliar`, `HORAS_DE_UNA_NOTA_NUEVA`).
- **Las listas de sepelios no se publican nunca** (27/09, Hernán: "es sensible
  y no hay fuente oficial"). `REGLAS_SEMAFORO.nunca` las pone en rojo por el
  título ("lista de sepelios: no se publica") y `nuncaSePublica`
  (`web/scripts/generar-datos.mjs`) lo vuelve a mirar en el título y la bajada
  finales. El bloque de necrológicas que El Diario pega debajo de cada nota
  (`necrologicas-container`) no se lee como la nota (`NECROLOGICA`,
  `ingesta/articulo.mjs`): era más largo que la nota, y la IA escribió sobre
  sepelios en una de alumnos del San José. La lista roja no se tocó.
- **De las repetidas queda la ya publicada** (27/09): la que está en la portada
  o salió en las últimas 72 horas, aunque a otra la cuenten más medios
  (`quitarRepetidas`, `publicadas`). Si no, desaparecía la que la gente ya veía.
- **Las palabras clave cortas engañan.** "gol" encontraba "golpe"; "partido" en
  la provincia es un municipio. Las ambiguas están en `PALABRAS_DEBILES`
  (`ingesta/ingesta.mjs`) y sólo deciden desde el titular.

- **Las secciones son once** (27/09): Balcarce, Política, Policiales, Fútbol,
  Deportes, Automovilismo, Agro, Economía, Cultura y agenda, Tecnología y
  Argentina (`SECCIONES` en `web/lib/datos.js`). **No hay Servicios**: lo
  práctico de acá (cortes, trámites, obras) va a Balcarce. **País se llama
  Argentina** y sale sola. Fútbol es aparte de Deportes. Las fichas viejas de la
  IA que dicen Servicios o País se traducen solas (`aplicarFichas`). Lo de afuera
  que no cae en ninguna va a Argentina: **Región y Provincia no existen** (27/09;
  eran la ciudad del medio, no la del hecho, y lo que caía ahí esperaba siempre).
  Las once van en el menú (`EN_NAVEGACION`) cuando tienen notas. Las direcciones
  viejas `/seccion/servicios` y `/seccion/pais` redirigen a Balcarce y a Argentina
  (`SECCIONES_VIEJAS`, `web/scripts/generar-redirects.mjs`).
- **Los títulos automáticos no terminan en "en Balcarce"** (27/09): el medio es
  de Balcarce. `sinBalcarceAlFinal` (`web/lib/titulos.js`) saca esa cola en las
  notas nuevas y en las ya publicadas; lo que escribió una persona no se toca.

- **Las redes tienen un interruptor:** la variable de GitHub `REDES_ACTIVAS`.
  Con `Si` (cualquier mayúscula o tilde) publica; con otro valor todo corre pero
  sólo simula. No hay que tocar código para prender o apagar.
- **Una tercera clave, para la lectura con IA** (`GEMINI_API_KEY_CLASIFICACION`, plan V2.2): falta cargarla; mientras tanto usa la de redacción (gratis) con tope: 60 pedidos de fichas por día, 200 cuando tenga la propia (`topeDeLecturas`, `ingesta/lectura-ia.mjs`). Nunca la de redes.
- **Dos claves de Gemini, separadas a propósito:** `GEMINI_API_KEY_REDACCION`
  para redactar las notas (acepta el nombre viejo `GEMINI_API_KEY`) y
  `GEMINI_API_KEY_REDES` para voces y reels (`reels/claves.mjs`). La de redes
  no tiene alternativa: si falta, los reels no arrancan. La de redes es paga.
  La de redacción es **gratis y está cargada y probada desde el 25/09**: la
  reescritura la usa primero y pasa a la de redes (paga) sólo si se queda sin
  cupo (429). Tope de 450 por día con la clave de lectura propia, 330 mientras la lectura con IA comparte la clave gratis (`REESCRITURA.porDia`, `porDiaSinClaveDeLectura`; lo elige `topeDeReescrituras`, 27/09).
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
  poco tráfico para sacar conclusiones. Cloudflare ya tiene el permiso
  (27/09). **Faltan** `read_insights` e `instagram_manage_insights` en
  `META_TOKEN`: sin ellos el resumen de las
  9 dice qué le falta (`INFRAESTRUCTURA.md`, `PENDIENTES.md`).
- **Los tres avisos publicitarios se cargan desde el panel** (pestaña Avisos,
  23/09), no editando `web/data/avisos.json` a mano. Detalle: `PUBLICIDAD.md`.
- **Vigilancia** (`redes/vigilar.mjs`, workflow "Vigilancia", tercer trabajo de
  cron-job.org cada 30 min): revisa la web publicada, las corridas de GitHub,
  el reloj de redes y las piezas fijas del día, y avisa por **WhatsApp**
  (CallMeBot; secretos `WHATSAPP_TELEFONO` y `WHATSAPP_APIKEY`, los pega una
  persona) una vez cada 6 horas por problema, más un resumen "todo bien" a las
  21 y, detrás, el **informe del día en notas** (27/09, breve: dos líneas, el
  total contra los días anteriores y las notas por sección; la historia día por
  día queda en `web/data/notas-por-dia.json`). También avisa 30 días antes de que venzan el token de GitHub y el
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
- **El cruce de medios** (27/09 a la tarde, `ingesta/cruce.mjs`): todo lo de
  afuera entra entero y se juntan las notas que cuentan el mismo hecho (título y
  resumen, TF-IDF, umbral 0,42), con una memoria de 36 horas en la caché de
  Actions (`.cache/`, fuera del repo). Queda todo lo de Balcarce y, de afuera, lo
  que dice Balcarce en el título, lo que toca la zona y lo que cuentan **dos
  medios distintos o más**; lo de un solo medio no se trae, y lo que cuentan
  sólo medios de otras ciudades de la zona (Mar del Plata, Tandil, Necochea…)
  tampoco. Ya no entran "las 3 a 5 más nuevas" de cada fuente: `maxItems` y
  `uso: 'senal'` se sacaron del código (27/09 a la noche). La medición que
  llevó a esto: `docs/CRUCE-DE-MEDIOS.md`. Todas las fuentes, con ciudad, peso
  y cómo se usan: `FUENTES.md` (lo escribe `node ingesta/listar-fuentes.mjs`).
- **La importancia de lo de afuera se mide en medios, no en puntaje** (27/09 a
  la noche). Para salir sola, una nota de afuera tiene que estar contada por los
  medios distintos que pide su sección (`MEDIOS_DE_AFUERA` en
  `ingesta/criterio.mjs`): Fútbol y Deportes 4; Economía, Tecnología, Agro y
  Automovilismo 2; el resto 3; con una figura argentina, 2. Nunca uno; una
  fuente oficial alcanza sola. Si no llega, espera con el motivo "de afuera y
  poco contada (N medios; Sección pide M)". El puntaje sólo ordena y decide el
  cupo y Facebook. Lo mira `exigirMedios` (`ingesta/ingesta.mjs`) en la ingesta
  y otra vez después de la lectura con IA, en los dos sentidos (si al juntar
  repetidas una nota llega a los medios que pide, sale), y después van los
  cupos (`aplicarCupos`, "a la vez"). Ya no existen `PISO_DE_AFUERA` ni
  `exigirDosMedios`.
- **Un medio, un nombre** (27/09): todos los feeds de un mismo medio llevan el
  mismo `medio` (TN con Campo, Tecno y Clima; iProfesional; La Tecla; Ecos
  Diarios (Necochea)). Si no, las secciones de un diario contarían como dos
  medios en el cruce (`pruebas/cruce-coherente.test.mjs`).
- **Correcciones a mano sin el panel** (27/09): `web/data/correcciones.json`
  cambia el título, la bajada, la sección o el cuerpo de una nota ya publicada,
  con motivo, cuándo y quién. Manda sobre lo que escribe la IA y la dirección no
  cambia. El cuerpo se aplica antes de mirar si la nota tiene cuerpo (cuenta para
  "sin cuerpo no se publica") y a esa nota ya no se le pide nada a Gemini. El
  27/09 a la noche Claude escribió así 37 cuerpos, a pedido de Hernán ("por":
  "redacción de Claude, pedida por Hernán"), y en un repaso editorial de todo lo
  visible retiró 68 notas y después 15 más, y corrigió 36.
- **Todo lo que falta, por categoría, está en [`PENDIENTES.md`](PENDIENTES.md)**
  (redes, SEO, bios, editorial, técnico) y en `IDEAS.md` (ideas de producto).
  Qué se publica y cómo se escribe: `CRITERIO-EDITORIAL.md`. Redes: `REDES.md`.
  Documentación del proyecto: `MANUAL.md`.

## Dónde tocar cada cosa

| Quiero… | Archivo |
|---|---|
| agregar, sacar o apagar una fuente, o cambiar un peso | `ingesta/fuentes.mjs` (o `ingesta/fuentes-cruce.mjs`, si es del cruce); después, `node ingesta/listar-fuentes.mjs` para rehacer `FUENTES.md` (`pruebas/fuentes-registro.test.mjs` controla que esté al día) |
| que una palabra mande una nota a otra sección | `REGLAS_SECCION`, mismo archivo |
| que algo espere aprobación o nunca salga | `REGLAS_SEMAFORO`, mismo archivo (`nunca`: lo que no se publica nunca aparte del rojo, hoy las listas de sepelios; mira sólo el título, y `nuncaSePublica` en `web/scripts/generar-datos.mjs` lo vuelve a mirar en el título y la bajada finales) |
| que una sección de un medio de afuera no se traiga (otro país, policiales, consejos) | `SECCIONES_QUE_NO_ENTRAN` y `CONEXION_ARGENTINA`, mismo archivo (`motivoDeDescarte` en `ingesta/ingesta.mjs`) |
| la ficha de cada fuente (tipo y ciudad) | `fichaDeFuente`, en `ingesta/fuentes.mjs`: el tipo sale del alcance, de `oficial` y de si el feed tiene `seccion` (nacional por sección o general). Desde el 27/09 no hay `maxItems` ni `uso: 'senal'`: lo de afuera entra por el cruce, venga del feed que venga |
| sumar o sacar una fuente del cruce de medios (nacionales, provincia, zona, especializadas) | `ingesta/fuentes-cruce.mjs` (una línea por feed; `activa: false` para apagarla; el mismo `medio` para todos los feeds de un medio); cómo se cruzan, `ingesta/cruce.mjs`; después, `node ingesta/listar-fuentes.mjs` |
| el título de un índice de noticias (news-sitemap) que trae palabras sueltas | `tituloDelSitemap` (`ingesta/ingesta.mjs`): con cinco palabras o menos, usa el epígrafe de la foto (La Tecla) |
| sacar de la web una nota ya publicada, sin el panel | `web/data/retiradas.json` (motivo, cuándo, quién) |
| corregir a mano el título, la bajada, la sección o el cuerpo de una nota, sin el panel | `web/data/correcciones.json` (cada una con motivo, cuándo y quién; sin motivo no vale; los campos, `CAMPOS_CORREGIBLES`). El cuerpo cuenta para "sin cuerpo no se publica" y a esa nota no se le pide nada a Gemini. Manda sobre lo que escribe la IA y no cambia la dirección: `correccionesAMano` y `conCorreccion` en `web/lib/archivo.js`, aplicadas en `web/scripts/generar-datos.mjs` |
| que los títulos automáticos no terminen en "en Balcarce" | `sinBalcarceAlFinal`, en `web/lib/titulos.js` (lo aplica `generar-datos.mjs`); la instrucción de la IA, `CRITERIO-EDITORIAL.md` § 12, regla 2 |
| agregar, sacar o renombrar una sección, o cambiar su color | `SECCIONES` y `EN_NAVEGACION` (las del menú) en `web/lib/datos.js`; el color, `--s-*` en `web/app/globals.css`; las palabras, `REGLAS_SECCION`, y cuáles salen solas, `verdeSecciones` (`ingesta/fuentes.mjs`); las que conoce la IA, `SECCIONES_DE_LA_FICHA` (`ingesta/lectura-ia.mjs`) |
| cuántos medios pide lo de afuera, o juntar notas repetidas | `MEDIOS_DE_AFUERA`, `MEDIOS_POR_DEFECTO` y `MEDIOS_CON_FIGURA` (`ingesta/criterio.mjs` y la tabla de `CRITERIO-EDITORIAL.md`), aplicados por `exigirMedios` y `mediosMinimosDe` (`ingesta/ingesta.mjs`); `agruparRepetidas` y `quitarRepetidas` (`ingesta/lectura-ia.mjs`; queda la ya publicada, `publicadas`); qué del archivo se muestra y conserva la página, `tieneRespaldo` (`web/lib/cuerpo.js`, usado en `web/lib/archivo.js`) |
| qué va a las redes (hoy, sólo lo de Balcarce) | `esParaLasRedes` en `redes/elegir.mjs` |
| el plan de trabajo en curso (filtro de entrada, lectura con IA, notas populares) | `docs/PLAN-V2.2.md` |
| la lectura con IA (decide desde el 27/09: qué entra, sección, qué es de Balcarce; saca publicidad, chimentos y lo del extranjero sin un argentino; nunca destraba el semáforo) | `ingesta/lectura-ia.mjs` (`LECTURA` y `topeDeLecturas`: 60 pedidos por día con la clave gratis, 200 con la propia), con el perfil de `ingesta/perfil-balcarce.md` (sólo datos seguros); las fichas, en `web/data/fichas.json` |
| cambiar el criterio editorial, el tono o las reglas de escritura | `CRITERIO-EDITORIAL.md` (la IA lo lee tal cual; reiniciar el panel) |
| cambiar un número del criterio (largos, intentos, cupos, medios de afuera, Facebook, podcasts) | `ingesta/criterio.mjs` **y** la tabla "Los números" de `CRITERIO-EDITORIAL.md` (una prueba controla que digan lo mismo) |
| cambiar cuántos medios pide cada sección o cuántas notas de afuera deja salir a la vez | `MEDIOS_DE_AFUERA` y `CUPO_DE_AFUERA`, en `ingesta/criterio.mjs` (y en `CRITERIO-EDITORIAL.md`) |
| agregar un tema que se sigue | `TEMAS`, mismo archivo |
| ajustar el filtro de la IA | `ingesta/verificar.mjs` |
| que el semáforo mire lo que escribe la IA | `reels/reescritura.mjs` (`semaforoDeLaReescritura`; usa las listas de `REGLAS_SEMAFORO`) |
| cuánto dura una nota en la portada o en el archivo | `web/lib/archivo.js` (`HORAS_EN_PORTADA`, `DIAS_DE_ARCHIVO`, `MAXIMO_EN_ARCHIVO`); hasta cuándo el archivo completa una sección de la portada, `HORAS_PARA_COMPLETAR` (`web/lib/datos.js`: las mismas 72 horas) |
| que lo que toca la zona salga solo con un medio, o qué palabras son de la zona | `PALABRAS_ZONA` (`ingesta/fuentes.mjs`); `deLaZona` en `semaforo` y `exigirMedios` (`ingesta/ingesta.mjs`) |
| cuándo una historia que cuenta un medio de acá es de afuera (copiada) | `historiaDeAca` y `mencionaBalcarce`, en `ingestar` (`ingesta/ingesta.mjs`) |
| la fecha de las notas de un medio que se raspa (El Diario Balcarce) o cuántas horas puede tener una nota para entrar | `ampliar` y `HORAS_DE_UNA_NOTA_NUEVA` (`ingesta/ingesta.mjs`) |
| qué partes de la página de un medio no se leen como la nota (pies, menús, necrológicas) | `RUIDO` y `NECROLOGICA`, en `ingesta/articulo.mjs` |
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
| cambiar la tipografía (Source Serif 4 en los títulos, Inter en el resto, desde el 27/09) | La web: `web/app/layout.js` (el `<link>` de Google Fonts) y `web/app/globals.css` (`--f-titulo` y el sistema tipográfico; detalle en `web/README.md`). Las placas, reels, avatar y portada de Facebook: `reels/placa.mjs`, `reels/avatar.mjs` y `reels/portada.mjs`, con los archivos de `reels/marca/fuentes/`. Las imágenes para compartir: `web/lib/tarjeta.js`, con `web/fuentes/`. El panel, `panel/panel.html`; la guía comercial, `comercial/vista.plantilla.html` |
| cambiar una medida de imagen de Instagram/Facebook | `redes/formatos.mjs` (fuente única, con fecha de verificación) y `FORMATOS.md`. Los lunes `redes/auditar.mjs` audita lo publicado y avisa por WhatsApp si algo se desvió o los datos pasaron de 90 días |
| cambiar qué revisa el vigilante o cuándo avisa | `redes/vigilar.mjs` |
| cambiar la estadística diaria de notas (qué cuenta como publicada hoy, por sección) o su informe de las 21 | `ingesta/estadistica-diaria.mjs` (`cuentaDelDia`, `textoDelDia`: breve, dos líneas); la guarda `web/scripts/generar-datos.mjs` en cada corrida en `web/data/notas-por-dia.json` (un día por línea, 400 días); la manda `planDeAvisos` (`redes/vigilar.mjs`, bloque "informe") |
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
| `FUENTES.md` | **El registro único de las fuentes**: las 218 (214 activas, de 91 medios), con dónde se leen, ciudad, cómo se leen, sección, peso, si son oficiales y cómo se usan en el cruce. Lo escribe `node ingesta/listar-fuentes.mjs` desde el código; no se edita a mano (`pruebas/fuentes-registro.test.mjs`) |
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
| `docs/RADAR-3.0.md` | **Todo el proyecto de punta a punta** (27/09): fuentes, recorrido de una nota, criterio, instrucciones de la IA, notas propias, redes y cronograma, sitio, panel, vigilancia, infraestructura, archivos, reglas, hoja de ruta y glosario. Empezar por acá |
| `docs/PLAN-V2.2.md` | El plan en curso para elegir mejor las notas: filtro de entrada, lectura con IA, notas populares, todas las fuentes y cómo se usan (anexo A) |
| `docs/CRUCE-DE-MEDIOS.md` | La medición del 27/09 que llevó al cruce de medios: 90 medios, 2.664 notas en 24 horas, cuántos hechos cuentan dos medios o más, y los medios probados (foto de ese día; la lista vigente es `ingesta/fuentes-cruce.mjs`) |
| `IDEAS.md` | Ideas de producto y de sistema |
| `ingesta/README.md` | El motor: qué hace cada archivo y cómo correrlo a mano |
| `web/README.md` | La web: cómo correrla y dónde está cada cosa |
| `docs/historico/HISTORIA.md` | Qué se hizo y por qué, con fecha (histórico, no se mantiene) |
| `docs/historico/AUDITORIA.md` | La auditoría del 25/09 y qué quedó arreglado (histórico) |
| `docs/historico/INVESTIGACION-COMPETENCIA.md` | Lo que hacen los otros medios, con hecho/pendiente (18/09, histórico) |

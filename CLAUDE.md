# Radar Balcarce

*Actualizado el 29/09/2026. Corto a propósito: el detalle está en `docs/` (empezar por
`docs/00-INDICE.md`). Si esto y el código no coinciden, manda el código, y se corrige
esto.*

Medio digital automático de Balcarce (Buenos Aires), en `radarbalcarce.com`. Cada media
hora lee más de 200 feeds de unos 90 medios (la lista, en `FUENTES.md`), junta la misma
noticia contada por varios, decide qué publicar, lo escribe con IA, lo verifica contra
las fuentes, arma el sitio y lo sube, sin nadie despierto; varias veces por día publica
en Facebook e Instagram con voz. Los usuarios son Hernán y Andrés (no programan):
escribir siempre en castellano rioplatense, claro y sin voseo forzado.

## Cómo está armado

    ingesta/   el motor: fuentes, cruce, selección, lectura con IA, verificador, números del criterio. SIN dependencias
    reels/     placas, voz (Gemini), video… y la reescritura con IA (reels/reescritura.mjs). SÍ tiene dependencias (resvg, ffmpeg)
    redes/     Facebook e Instagram (API de Meta), contrato del día, vigilante, WhatsApp. SIN dependencias
    panel/     lo del panel del celular (cifrado, pedidos a la IA) y el panel de la PC (puerto 4321), que NO se usa y queda en desuso. SIN dependencias
    web/       el sitio (Next.js 15, JavaScript, HTML estático); web/public/panel/ es el panel del celular; web/scripts/generar-datos.mjs arma los datos
    pruebas/   `npm test`: más de 1.400 pruebas, sin red
    docs/      la documentación: 00-INDICE a 12-GLOSARIO, e historico/

Flujo: fuentes → ingesta → cruce → sección, puntaje y semáforo → lectura con IA →
reescritura con IA → verificación → `web/data/*.json` → Cloudflare Pages; después, redes
y vigilancia. Todo en GitHub Actions, disparado por cron-job.org. **La web, las redes, la
vigilancia y el panel del celular andan con la PC apagada.**

## Comandos

    npm test              las pruebas (correr SIEMPRE antes de commitear)
    npm run auditar       qué está decidiendo el filtro sobre las noticias de hoy
    npm run auditar-fotos qué notas tienen foto y, de las que no, por qué (no gasta cupo; `-- --dias=7`, `-- --html` para ver las fotos)
    npm run panel         el panel de la PC (o ARRANCAR.bat)
    node ingesta/listar-fuentes.mjs    rehace FUENTES.md después de tocar una fuente
    cd web && npm run datos && npm run build     regenerar y compilar (en la PC trabaja en "modo PC")
    node reels/comparar-instruccion.mjs actual otra.txt   compara versiones de las reglas de la IA (gasta cupo)

## Reglas que no se negocian

(La lista numerada, con la prueba que cuida cada una: `docs/10-REGLAS-Y-PRUEBAS.md`; la
próxima regla es la 147.)

- **`ingesta/`, `panel/` y `redes/` no importan nada de afuera de Node.** Una prueba lo
  vigila (sigue los imports en cadena).
- **Cuando se arregla algo que estuvo mal publicado, se escribe una prueba** con el caso
  real y, si es una regla nueva, se anota en `docs/10-REGLAS-Y-PRUEBAS.md`.
- **El criterio editorial es uno solo: `CRITERIO-EDITORIAL.md`.** La IA lee su § 12 tal
  cual (`ingesta/prompt-editorial.mjs`; si falta, no escribe) y sus números están en
  `ingesta/criterio.mjs`, controlados contra su tabla. Lo de las redes, en
  `CRITERIO-REDES.md` (el código también lo lee tal cual). No borrar las marcas `<!-- … -->`.
- **Nunca identificar a un menor ni a una víctima** (el semáforo rojo; **no tocar esa
  lista sin preguntar**). **Nunca una marca de agua ni el nombre de otro medio pegado
  encima de una imagen**: el crédito va en la cita. **Lo que escribe la IA se verifica contra la
  fuente. Cada nota dice quién la escribió. Política y Policiales esperan a una persona en
  todas las piezas de redes.**
- **Las fotos**: la de otro medio o de un organismo, sólo sin su marca (lo que estaba en
  la escena, como el micrófono de una radio, sí: 29/09), con el crédito en el epígrafe y guardada en el banco propio
  (`web/data/banco-fotos.json`). Nunca foto real de un menor o una víctima, ni en
  Policiales salvo fuente oficial (`docs/05-FOTOS.md`). La placa es lo que sale cuando no
  hay foto que sirva.
- **Todo lo que va a Instagram es video con voz**, salvo el espejo de cada posteo de
  Facebook.
- **Tokens y claves nunca en un chat ni en el código.** Van a GitHub Secrets o al `.env`,
  y los pega una persona. El repositorio es **público**: por eso lo que espera a una
  persona viaja cifrado para el celular.
- **Sin cuerpo no se publica**: una nota automática sin cuerpo de 70 palabras o más no va
  a ningún lado (`web/lib/cuerpo.js`); se reintenta hasta tres veces y mientras tanto
  figura en `web/data/esperando-cuerpo.json`. Lo que publica una persona se respeta. Un
  cuerpo en `web/data/correcciones.json` cuenta como cuerpo.
- **El lector ve la nota, no el análisis**: título, bajada, cuerpo y un desplegable
  cerrado "Fuentes (N)". Verificación BAJA y la cotización del dólar no salen solas.

## Cosas que muerden

- **Los archivos del repo están en CRLF.** En scripts, editar por líneas; un `\n` literal
  en un reemplazo multilínea no encuentra nada. Para regex con `\b`, `\s`, `\d`: escribir
  un `.cjs` con Write, no `node -e` ni un heredoc (se comen las barras).
- **Node carga el código al arrancar**: si se toca `ingesta/`, `panel/`, `reels/` o un
  criterio, el panel de la PC (si está abierto) hay que reiniciarlo.
- **GitHub Actions regenera `web/data/` cada media hora** (corre a los :00 y :30 UTC y
  tarda ~8 minutos). Antes de `git push`, `git pull --rebase`; si choca en `web/data/`,
  `git checkout --theirs` sobre esos archivos y seguir. Commitear sólo los archivos
  tocados (`git commit -- archivos`). Correr `npm run datos` en la PC deja esos archivos
  cambiados: no subirlos. Subir `banco-fotos.json` o fotos sólo entre corridas.
- **Los archivos que escribe una persona**: `web/data/celular-decisiones.json` y
  `web/data/correcciones.json` (los escribe el celular; ningún workflow los toca) y
  `web/data/retiradas.json` (a mano; los lunes "Actualizar la web" le saca las de más de
  7 días). Siempre con `motivo`, `cuando` y `por`: sin eso la corrida de la web falla y
  la web se congela. El panel de la PC pisa `web/data/decisiones.json` cada vez que
  guarda.
- **Las ventanas de tiempo**: la portada muestra **36 horas** (las secciones guardan todo, 10 por página, lo más nuevo primero)
  (`HORAS_EN_PORTADA`); lo que nunca salió no se estrena si el hecho tiene más de **12**;
  la página dura 180 días (hasta 3.500 notas); lo raspado de más de 72 horas no entra. Los
  números viven en `ingesta/criterio.mjs` **y** en `web/lib/archivo.js`.
- **Una nota tiene una sola fecha**, que envejece y nunca rejuvenece (`fechaReal`,
  `fechaDeLaNota`), y **una sola dirección**, fija desde que sale. La misma noticia que
  vuelve con otra dirección se une a la que ya estaba y redirige (`web/lib/repetidas.js`).
- **"De acá" tiene una sola definición** (`esDeAca`): lo que toca la zona; si no, lo de un
  medio de Balcarce o lo que dice Balcarce **en el título**. Un medio de acá que copia una
  noticia de afuera no la hace de Balcarce (`historiaDeAca`), y lo de un medio de acá que
  no nombra nada de acá espera a la IA (`mencionaAca`).
- **Lo de afuera se mide en medios**: Fútbol y Deportes 4; Economía, Tecnología, Agro y
  Automovilismo 2; el resto 3; con una figura, 2. Con un solo medio ni pasa el cruce. Del
  extranjero, sólo con un argentino.
- **Las listas de sepelios no se publican nunca**, ni aprobadas por una persona.
- **Las palabras clave cortas engañan** ("gol" encontraba "golpe"): las ambiguas van en
  `PALABRAS_DEBILES` y sólo deciden desde el titular.
- **Las secciones son once**: Balcarce, Política, Policiales, Fútbol, Deportes,
  Automovilismo, Agro, Economía, Cultura y agenda, Tecnología y Argentina.
- **Los títulos automáticos se arreglan sin inventar** (`arreglarEscritura`,
  `tituloAutomatico`); lo de una persona no se toca.
- **Las redes tienen un interruptor**: la variable de GitHub `REDES_ACTIVAS` ("Si");
  apagado, todo simula. "Piezas" con `solo` vacío no arma nada (hay que marcar `todas`).
  En GitHub las piezas se arman con lo ya publicado (`web/data/portada.json`) y los
  horarios son los de `panel/horarios.mjs`.
- **Cuatro claves de IA, todas gratis desde el 29/09** (`reels/claves.mjs`):
  `GEMINI_API_KEY_REDACCION` (redactar), `GEMINI_API_KEY_REDES` (las voces; respaldo de la
  redacción sólo con 429), `GEMINI_API_KEY_CLASIFICACION` (lectura con IA y fotos; último
  respaldo de la redacción) y `GROQ_API_KEY` (respaldo de la lectura y las fotos; no sirve
  para redactar). Aparte, `TAVILY_API_KEY` (búsqueda en internet con texto, sólo para las Pistas). **El cupo de voz es de 10 audios por día**: si se acaba, la pieza no
  sale (nunca con otra voz). Una clave rechazada (401/402/403) no gasta los intentos de
  una nota. Modelo de texto: `gemini-flash-lite-latest`; de voz, `gemini-3.8-flash-tts`
  con dos voces propias que **vencen el 29/09/2027** (`CRITERIO-REDES.md` § 6). La
  vigilancia avisa si una clave deja de andar o una voz falta o está por vencer.
- **Para que "hoy" sea el de Balcarce en Actions** hay que poner
  `TZ: America/Argentina/Buenos_Aires` en el workflow (`ingesta/zona.mjs`).
- **El turno de farmacia dura hasta las 8:30 del día siguiente** y la web no dice hasta
  qué hora está. **Si Open-Meteo falla, el clima sale de `api.met.no`**, sin sensación
  térmica: no se inventa.
- **cron-job.org desactiva solo** un trabajo que falla varias veces: es lo primero que se
  mira cuando algo deja de salir. Su token de GitHub y el dominio vencen el **21/09/2027**.
- **El correo de los commits automáticos** es el noreply de GitHub: no cambiarlo.
- **El panel del celular** (`web/public/panel/`) no tiene servidor: escribe con la llave de
  GitHub de quien lo usa; lo sensible viaja cifrado (`panel/cifrado.mjs`); pedirle a la IA
  dispara el workflow "Panel del celular" (`panel.yml`), que lee las notas de la caché de
  Actions. Su página tiene su propia CSP en `web/public/_headers`: no cargar nada de
  afuera ahí.

## Estado (29/09/2026, 18:30)

- **Todo andando en la nube**: la web en Cloudflare Pages, las redes **prendidas desde el
  29/09 a las 16:39** (el primer reel con las voces nuevas salió a las 16:46), la
  vigilancia por WhatsApp con el resumen de las 21 y, desde hoy, el **panel del celular**
  (falta que Hernán cree su llave y lo instale).
- **Las claves de IA son todas gratis** (la paga quedó suspendida por Google el 29/09).
  Las voces son la versión 2 de la locutora y el locutor, en el proyecto de la clave de
  redes. El cupo gratis de voz (10 por día) es justo para un día normal.
- **Las reglas de la IA cambiaron el 29/09** (regla 1 contra la copia y el campo "datos"):
  mirar unos días cuántas notas sacan cuerpo.
- Lo que falta, con quién y qué urgencia: **`PENDIENTES.md`**. El plan de mejoras del 8/10 (auditorías, en orden) y dónde quedó: **`docs/propuestas/DONDE-SEGUIMOS.md`**.

## Dónde tocar cada cosa

| Quiero… | Dónde |
|---|---|
| Sumar, sacar o apagar una fuente, o cambiar un peso | `ingesta/fuentes.mjs` o `ingesta/fuentes-cruce.mjs` (`activa: false`); después, `node ingesta/listar-fuentes.mjs` |
| Que una palabra mande una nota a otra sección | `REGLAS_SECCION` (`ingesta/fuentes.mjs`); si es ambigua, también `PALABRAS_DEBILES` (`ingesta/ingesta.mjs`) |
| Que algo espere a una persona o no salga nunca | `REGLAS_SEMAFORO` (`ingesta/fuentes.mjs`: `rojo` —no sin preguntar—, `nunca`, `amarillo`, `cotizacion`, `internacional`, `promocional`); lo que lo de Balcarce suelta: `AMARILLO_QUE_SE_SUELTA_*` (regla 96) |
| Qué es "de acá" o "la zona" | `esDeAca` (`ingesta/ingesta.mjs`), `PALABRAS_LOCALES` y `PALABRAS_ZONA` (`ingesta/fuentes.mjs`) |
| Cómo se juntan las notas del mismo hecho | `CRUCE` (`ingesta/cruce.mjs`), `agruparRepetidas` y `quitarRepetidas` (`ingesta/lectura-ia.mjs`), y las que vuelven con otra dirección, `web/lib/repetidas.js` |
| Cualquier número del criterio | `ingesta/criterio.mjs` **y** la tabla "Los números" de `CRITERIO-EDITORIAL.md` |
| Cómo decide la lectura con IA | `ingesta/lectura-ia.mjs`; lo que sabe de Balcarce, `ingesta/perfil-balcarce.md` (va tal cual a la IA) |
| Cómo escribe la IA | `CRITERIO-EDITORIAL.md` § 4 y § 12; medir un cambio con `reels/comparar-instruccion.mjs` |
| El verificador o los arreglos que no inventan | `ingesta/verificar.mjs` (`verificar`, `arreglarEscritura`, `diceEnVivo`) |
| Cuándo una nota pierde su página | `pierdeLaPagina` (`web/lib/archivo.js`), `tieneRespaldo` (`web/lib/cuerpo.js`) |
| Sacar o corregir una nota sin el celular | `web/data/retiradas.json` / `web/data/correcciones.json` (motivo, cuándo y quién) |
| Las estadísticas (pestaña Números del panel del celular) | `redes/estadisticas.mjs` (mide) y `redes/estadisticas-detalle.mjs` (el detalle diario de Cloudflare: horas, notas, de dónde llegan, aparatos, países → `web/data/estadisticas.json`), `web/public/panel/numeros.js` (lo que se muestra) |
| La auditoría con IA de lo ya publicado (pestaña Revisión del panel; avisa y corrige sola sólo la ortografía chica y segura, regla 98) | `ingesta/auditoria-ia.mjs` (qué lee, qué busca y `cambioMecanico`), `redes/auditar-notas.mjs`, `.github/workflows/auditoria-ia.yml`, `web/public/panel/revision.js`, `web/data/correcciones-auditoria.json` (lo escribe sólo la auditoría), `conCambiosDeLaAuditoria` (`web/lib/archivo.js`) |
| Las notas sin foto del panel (pestaña Fotos: por qué, dónde buscarla y sumarla a mano) | `web/public/panel/fotos.js`, `web/scripts/foto-manual.mjs`, `web/data/fotos-manuales.json` (lo escribe sólo "Panel del celular"), `accion=foto` de `panel.yml` |
| Los contactos del celular (instituciones y propios, a quién se le escribió; cifrado) | `web/public/panel/contactos.js`, `web/public/panel/cifrado.js` (`cerrar`), `web/data/contactos-celular.json`, `ingesta/contactos-agenda.json` (público) |
| Las pistas del panel (pegar un tuit o un enlace; quedan abiertas, se vuelven a mirar cada 3 horas y se sigue en qué quedó cada una) | `ingesta/pistas.mjs`, `panel/pistas-libro.mjs`, `panel/revisar-pistas.mjs`, `.github/workflows/pistas.yml`, `web/data/pistas.json`, `web/public/panel/pistas.js`, `panel/celular.mjs` (acciones `pista` y `nota-pista`) |
| Hacer una nota propia de una pista (búsqueda con texto en internet, Tavily) | `ingesta/busqueda.mjs`, `panel/nota-de-pista.mjs`, `web/lib/notas-de-pistas.js`, `web/data/notas-de-pistas.json` (lo escribe sólo el celular) |
| El panel del celular | `web/public/panel/` (la app), `panel/celular-datos.mjs` (lo que decide y lo que recibe), `panel/cifrado.mjs`, `panel/celular.mjs` y `panel/reescribir-una.mjs` (el pedido a la IA), `.github/workflows/panel.yml` |
| "Un día como hoy" y los feriados (el mes armado se aprueba, se saca o se frena en la pestaña Fechas → Mes armado: `redes/efemeride.mjs`, regla 97) | `ingesta/efemerides.mjs` (candidatas y puntaje), `ingesta/generar-efemerides.mjs` (la corrida mensual), `ingesta/efemerides-curadas.json` (fechas patrias y de Balcarce), pestaña Fechas del panel (`web/public/panel/fechas.js`); `docs/13-EFEMERIDES.md` |
| La firma de las notas | `quienEscribio`, `firmaCorta` (`web/components/metadatos.js`) |
| Las fotos | `web/scripts/fotos-notas.mjs`, `ingesta/fotos.mjs`, `web/scripts/achicar-foto.mjs` |
| Una sección nueva, su nombre o su color | `SECCIONES` (`web/lib/datos.js`), `--s-*` (`web/app/globals.css`), `REGLAS_SECCION`, `SECCIONES_DE_LA_FICHA` (`ingesta/lectura-ia.mjs`), `SECCIONES` de `web/public/panel/github.js` |
| La tapa, las secciones o "Seguí leyendo" | `armarTapa` (`web/lib/datos.js`), `web/lib/seguir-leyendo.js` |
| La nota del dólar o la de cada podcast | `web/lib/notas-propias.js` |
| Las notas de F1 (horarios, clasificación, resultado; Jolpica) y de fútbol (Liga, Copa Argentina, Libertadores y Sudamericana con equipos argentinos; ESPN) | `ingesta/f1.mjs`, `ingesta/futbol.mjs`, `web/data/f1.json`, `web/data/futbol.json`; la foto libre, `web/scripts/foto-libre.mjs` |
| Qué va a las redes | `vaAFacebookPorLoQueEs`, `elegirParaFacebook`, `sePuedeSola`; en los repasos, `elegirParaPodcast` y `sePuedeEnUnRepaso` (`redes/elegir.mjs`) |
| A qué hora sale una pieza | `HORAS_REELS`, `VENTANAS` (`redes/piezas.mjs`) y `HISTORIAS_FIJAS` (`panel/horarios.mjs`) |
| Cómo suenan o qué dicen las piezas | `CRITERIO-REDES.md` y `redes/guiones.mjs` |
| Las voces | `CRITERIO-REDES.md` § 6; crearlas, "Crear voces" (`reels/crear-voces.mjs`) |
| El contrato del día | `redes/contrato.mjs` y `CONTRATO_DIARIO` (`ingesta/criterio.mjs` **y** `CRITERIO-EDITORIAL.md`) |
| El dibujo de una placa o de una tarjeta | `reels/placa.mjs`; `web/lib/tarjeta.js` y `web/lib/tarjeta-diseno.js` |
| Los colores de las placas (qué color es de qué) | `CRITERIO-REDES.md` § 8 y `COLOR_SECCION` (`reels/placa.mjs`); una prueba controla que digan lo mismo |
| Qué vigila el vigilante o qué dice el WhatsApp | `redes/vigilar.mjs` (`evaluar`, `revisarClaves`, `VENCIMIENTOS`), `redes/avisos.mjs` |
| Qué archivos guarda "Actualizar la web" | La línea `git add` de `.github/workflows/actualizar.yml` (un archivo nuevo de `web/data/` que no esté ahí se pierde) |
| Los avisos publicitarios, la agenda a mano | El panel de la PC (`PUBLICIDAD.md`, `panel/agenda.mjs`) |

## Cuentas

- **GitHub:** `balcardev@gmail.com`, repositorio `balcar-dev/radar-balcarce`, **público**
  (los públicos no gastan minutos de Actions).
- **Todo lo demás:** `radarbalcarce@gmail.com` (Cloudflare, cron-job.org, Google/Gemini,
  Meta, Instagram, Search Console, Tailscale; Vercel, apagado).
- **Meta:** app "Radar Balcarce Publicador" (ID 2302218363874399), usuario del sistema
  `publicador-radar`, token sin vencimiento en `META_TOKEN` (con `read_insights` e
  `instagram_manage_insights`: las estadísticas de Meta andan). Página de Facebook "Radar Balcarce", ID para la API
  **1254237411116171** (`PAGINA_DE_FACEBOOK`, `redes/meta.mjs`). Instagram
  `@radarbalcarce`. WhatsApp del medio: 2266 51-1612.
- Secretos, workflows, costos y vencimientos: `docs/08-INFRAESTRUCTURA.md`.

## Documentos

**`docs/00-INDICE.md`** tiene la lista completa. Los que más se usan: `docs/11-OPERACION.md`
(el uso diario), `docs/10-REGLAS-Y-PRUEBAS.md` (las reglas numeradas), `docs/08-INFRAESTRUCTURA.md`
(claves, workflows, vencimientos), `docs/09-PANEL.md` (los dos paneles), los dos criterios
(`CRITERIO-EDITORIAL.md` y `CRITERIO-REDES.md`), `PENDIENTES.md` e `IDEAS.md`.

# Radar Balcarce

*Actualizado el 29/09/2026. Corto a propósito: el detalle está en `docs/`
(empezar por `docs/00-INDICE.md`). Si esto y el código no coinciden, manda el
código, y se corrige esto.*

Medio digital automático de Balcarce (Buenos Aires), en `radarbalcarce.com`.
Cada media hora lee 214 feeds de 91 medios (218 configurados; la lista, en
`FUENTES.md`), junta la misma noticia contada por varios, decide qué publicar,
lo escribe con IA, lo verifica contra las fuentes, arma el sitio y lo sube,
sin nadie despierto; varias veces por día publica en Facebook e Instagram. Los
usuarios son Hernán y Andrés (no programan); escribir siempre en castellano
rioplatense, sin voseo forzado.

## Cómo está armado

    ingesta/   el motor: fuentes, cruce, selección, lectura con IA, verificador, números del criterio. SIN dependencias
    reels/     placas, voz, video… y la reescritura con IA (reels/reescritura.mjs). SÍ tiene dependencias (resvg, ffmpeg)
    redes/     Facebook e Instagram (API de Meta), contrato del día, vigilante, WhatsApp. SIN dependencias
    panel/     el tablero editorial (vive en la PC de Hernán, puerto 4321). SIN dependencias
    web/       el sitio público (Next.js 15, JavaScript, HTML estático); web/scripts/generar-datos.mjs arma los datos
    pruebas/   `npm test`: 1.367 pruebas en 83 archivos, sin red
    docs/      la documentación: 00-INDICE a 12-GLOSARIO, e historico/

Flujo (`docs/00-INDICE.md`): fuentes → ingesta → cruce de medios → sección,
puntaje y semáforo → lectura con IA → reescritura con IA → verificación →
`web/data/*.json` → Cloudflare Pages; después, redes y vigilancia. Todo en
GitHub Actions, disparado por cron-job.org. **La web, las redes y la
vigilancia andan con la PC apagada**; sólo el panel vive en la PC.

## Comandos

    npm test              las pruebas (correr SIEMPRE antes de commitear)
    npm run auditar       qué está decidiendo el filtro sobre las noticias de hoy
    npm run panel         levanta el panel (o ARRANCAR.bat)
    node ingesta/listar-fuentes.mjs    rehace FUENTES.md después de tocar una fuente
    cd web && npm run datos && npm run build     regenerar y compilar (ojo: en la PC trabaja en "modo PC")

## Reglas que no se negocian

(La lista numerada completa, con la prueba que cuida cada una:
`docs/10-REGLAS-Y-PRUEBAS.md`.)

- **`ingesta/`, `panel/` y `redes/` no importan nada de afuera de Node.** Una
  prueba lo vigila (sigue los imports en cadena).
- **Cuando se arregla algo que estuvo mal publicado, se escribe una prueba**
  (con el caso real) y, si es una regla nueva, se anota en
  `docs/10-REGLAS-Y-PRUEBAS.md` con el número siguiente (hoy, 77).
- **El criterio editorial es uno solo: `CRITERIO-EDITORIAL.md`.** La IA lee su
  § 12 **tal cual** (`ingesta/prompt-editorial.mjs`; si falta, la reescritura
  no arranca) y sus números están en `ingesta/criterio.mjs`, controlados contra
  su tabla (`pruebas/criterio.test.mjs`). Un cambio de criterio se hace ahí. Lo
  de las redes, en `CRITERIO-REDES.md` (también lo lee el código tal cual).
- **Nunca identificar a un menor ni a una víctima** (el semáforo rojo; **no
  tocar esa lista sin preguntar**). **Nunca una marca de agua ni el nombre de
  otro medio adentro de una imagen**: el crédito va en la cita. **Lo que
  escribe la IA se verifica contra la fuente. Cada nota dice quién la
  escribió. Política y Policiales esperan a una persona en TODAS las piezas de
  redes.**
- **Las fotos** (27/09, decisión de Hernán con el riesgo explicado; en vivo
  desde el 28/09): se puede usar la foto de otro medio o de un organismo
  oficial sólo sin su marca de agua, con el crédito en el epígrafe y guardada
  en el banco propio (`web/data/banco-fotos.json`). Va en la página de la nota,
  en el espejo de Instagram (crédito en el texto del posteo) y en la tarjeta
  para compartir el enlace (`FOTO_EN_ENLACE`); los videos siguen con placa. **La placa es lo que sale cuando no
  hay foto que sirva**, no una regla. Nunca foto real de un menor o una
  víctima, ni en Policiales salvo fuente oficial (`docs/05-FOTOS.md`). El
  nombre de otro medio **en la escena** (el micrófono de una radio) también
  descarta la foto, y la IA marca a los menores reconocibles (28/09).
- **Todo lo que va a Instagram es video con voz**, salvo el espejo: la API no
  acepta una imagen que no esté en una dirección pública.
- **Tokens y claves nunca en un chat ni en el código.** Van a GitHub Secrets o
  al `.env`, y los pega una persona. El repositorio es **público**.
- **Sin cuerpo no se publica**: una nota automática sin cuerpo de 70 palabras o
  más no va a ningún lado público (`web/lib/cuerpo.js`); se reintenta hasta
  tres veces y mientras tanto figura en `web/data/esperando-cuerpo.json`. Lo
  que publica una persona se respeta (el panel pide confirmarlo). Un cuerpo en
  `web/data/correcciones.json` cuenta como cuerpo.
- **El lector ve la nota, no el análisis**: título, bajada, cuerpo y un
  desplegable cerrado "Fuentes (N)". Claves, qué se sabe, qué falta confirmar y
  nivel de verificación son del panel. Verificación BAJA y la cotización del
  dólar no salen solas.

## Cosas que muerden

- **Node carga el código al arrancar.** Si se toca `ingesta/`, `panel/`,
  `reels/` o `CRITERIO-EDITORIAL.md`, hay que reiniciar el panel (cerrar su
  ventana y correr `ARRANCAR.bat`).
- **Los archivos del repo están en CRLF.** Editar por líneas; un `\n` literal
  en un reemplazo multilínea no encuentra nada.
- **Escapar barras invertidas desde la terminal falla.** Para regex con `\b`,
  `\s`, `\d`: escribir un `.cjs` con la herramienta Write, no `node -e`.
- **GitHub Actions regenera `web/data/`** (portada, archivo y ocho más, cada
  media hora). Antes de `git push` suele haber conflicto ahí: `git pull
  --rebase`, `git checkout --theirs` sobre cada uno, continuar. Commitear sólo
  los archivos tocados (`git commit -- archivos`): el panel sube solo lo que
  encuentre preparado. Correr `npm run datos` en la PC deja esos archivos
  modificados: no subirlos.
- **Las ventanas de tiempo** (`docs/03-SELECCION.md`, paso 12): la portada y
  las secciones muestran **36 horas** (`HORAS_EN_PORTADA`); una nota que nunca
  salió **no se estrena si el hecho tiene más de 12** (`llegaTarde`); la nota
  grande compite con las de las últimas 6; la página dura 180 días (hasta
  2.500 notas, `web/data/archivo.json`); lo raspado de más de 72 horas no
  entra. Los números viven en `ingesta/criterio.mjs` **y** en
  `web/lib/archivo.js` (una prueba controla que coincidan).
- **Una nota tiene una sola fecha, que puede envejecer y nunca rejuvenecer**
  (`fechaReal` en `generar-datos.mjs`, `fechaDeLaNota`): sin hora de la fuente,
  la primera vez que se vio (`web/data/vistas.json`).
- **La dirección de una nota es fija** desde la primera vez que sale, aunque
  cambie el titular (los enlaces están en Facebook). Pierde la página si pasa a
  rojo, a amarillo **por lo que dice**, la bloquea una persona, está en
  `retiradas.json` o es de afuera de un solo medio sin haber ido a redes. El
  amarillo **sólo por cupo o por medios** no la saca (`pierdeLaPagina`, 28/09).
- **El panel pisa `web/data/decisiones.json`** cada vez que guarda su estado.
  Para sacar o corregir notas sin el panel: `web/data/retiradas.json` y
  `web/data/correcciones.json`, siempre con `motivo` (el código lo exige) y con
  `cuando` y `por` (las pruebas los exigen: sin ellos, la web se congela).
  Los lunes, `retiradas.json` pierde sola las de más de 7 días (regla 69), y
  el panel no guarda lo pendiente de más de 7 días.
- **"De acá" tiene una sola definición** (`esDeAca`, 28/09): lo que toca la
  zona; si no, y si la IA no dijo que no es de Balcarce, lo de un medio de
  Balcarce o lo que dice Balcarce **en el título** (nombrarla en el texto no
  alcanza). Lo de acá no pide medios ni ocupa cupo.
- **Un medio de acá que copia una noticia de afuera no la hace de Balcarce**
  (`historiaDeAca`, `mencionaBalcarce` en `ingestar`), y lo de un medio de acá
  que no nombra nada de acá **espera a la IA** antes de salir (`mencionaAca`,
  `ingesta/lectura-ia.mjs`, 28/09).
- **Lo de afuera se mide en medios, no en puntaje**: sale solo si lo cuentan
  los medios que pide su sección (Fútbol y Deportes 4; Economía, Tecnología,
  Agro y Automovilismo 2; el resto 3; con una figura, 2) y entra en el cupo.
  Con un solo medio ni pasa el cruce, aunque sea oficial. Del extranjero, sólo
  con un argentino.
- **Las listas de sepelios no se publican nunca**, ni aprobadas por una
  persona (el rojo `nunca` va antes que el amarillo desde el 28/09).
- **De las repetidas queda la ya publicada** (en la portada o dentro de las 36
  horas), aunque a otra la cuenten más medios.
- **Las palabras clave cortas engañan** ("gol" encontraba "golpe"; "partido"
  es un municipio): las ambiguas van en `PALABRAS_DEBILES` y sólo deciden
  desde el titular.
- **Las secciones son once**: Balcarce, Política, Policiales, Fútbol,
  Deportes, Automovilismo, Agro, Economía, Cultura y agenda, Tecnología y
  Argentina. No hay Servicios, País, Región ni Provincia.
- **Los títulos automáticos se arreglan sin inventar**: al escribir,
  `arreglarEscritura` (`ingesta/verificar.mjs`: "este sábado", muletillas,
  tildes); al publicar, `tituloAutomatico` (`web/lib/titulos.js`: etiqueta
  adelante, coma colgando, "en Balcarce" al final). Lo de una persona no se
  toca.
- **Las fotos nuevas se eligen sólo en la nube** (gastan cupo de IA, hasta 10
  por corrida); las ya guardadas en el banco se aplican también en la PC.
- **Las redes tienen un interruptor**: la variable de GitHub `REDES_ACTIVAS`
  ("Si", con cualquier mayúscula o tilde; lo leen `publicar.mjs` y el reloj con
  `estaActivo`). Apagado, todo simula y no se arma ninguna pieza. "Piezas" con
  `solo` vacío no arma nada (hay que marcar `todas`).
- **En GitHub las piezas se arman con lo ya publicado** (`web/data/portada.json`,
  vía `redes/datos.mjs`), y los horarios de las historias fijas son los de
  fábrica de `panel/horarios.mjs`: **la pestaña Calendario del panel no llega
  a GitHub**.
- **Cuatro claves de IA, separadas a propósito** (`reels/claves.mjs`):
  `GEMINI_API_KEY_REDACCION` (gratis; redactar, 450 por día), `GEMINI_API_KEY_REDES`
  (**paga**: voces, y respaldo de la redacción sólo si la gratis da 429; si
  falta o Gemini no contesta, las piezas **no salen**: nunca con otra voz;
  modelo `gemini-3.8-flash-tts`, dos voces propias con un reparto fijo por pieza
  en `CRITERIO-REDES.md` § 6, que **vencen el 29/09/2027**),
  `GEMINI_API_KEY_CLASIFICACION` (lectura con IA, 200 pedidos por día, y fotos;
  nunca la de redes; desde el 29/09, **último respaldo de la redacción** si las
  otras fallan por el servicio) y `GROQ_API_KEY` (respaldo gratis de la lectura y
  las fotos; **no sirve para redactar**: 8.000 tokens por minuto y un pedido de
  redacción ocupa unos 9.000). Una clave rechazada (401/402/403) no gasta los
  intentos de una nota. Modelo de texto: `gemini-flash-lite-latest` (el "flash" normal daba
  503 seguido: si vuelve a fallar, es lo primero que se mira).
- **Para que "hoy" sea el de Balcarce en Actions** hay que poner
  `TZ: America/Argentina/Buenos_Aires` en el workflow (el servidor corre en
  UTC); en el código, `ingesta/zona.mjs`.
- **El turno de farmacia dura hasta las 8:30 del día siguiente**
  (`ingesta/utiles.mjs`) y la web no dice hasta qué hora está. **Si Open-Meteo
  falla, el clima sale de `api.met.no`**, que no da sensación térmica: no se
  inventa.
- **cron-job.org desactiva solo** un trabajo que falla varias veces: es lo
  primero que se mira cuando algo deja de salir. El token de GitHub que usa y
  el dominio vencen el **21/09/2027**.
- **El correo de los commits automáticos** es el noreply de GitHub: no
  cambiarlo.

## Cuentas

- **GitHub:** `balcardev@gmail.com`. Repo `balcar-dev/radar-balcarce`,
  **público desde el 25/09** (los públicos no gastan minutos de Actions; se
  revisó el historial: no hay claves).
- **Todo lo demás:** `radarbalcarce@gmail.com` (Cloudflare, cron-job.org,
  Google/Gemini, Meta, Instagram, Search Console, Tailscale; Vercel, apagado).
- **Meta:** app "Radar Balcarce Publicador" (ID 2302218363874399), publicada el
  26/09; usuario del sistema `publicador-radar`, token sin vencimiento en
  `META_TOKEN` (le faltan `read_insights` e `instagram_manage_insights`).
  Página de Facebook "Radar Balcarce", ID para la API **1254237411116171** (no
  el número de la dirección). Instagram `@radarbalcarce`.
- Detalle de secretos, workflows y costos: `docs/08-INFRAESTRUCTURA.md`.

## Estado

Todo andando en la nube desde el 25/09: web en Cloudflare Pages,
redes en pausa (`REDES_ACTIVAS` en `No` desde el 28/09, hasta el visto bueno de Hernán al diseño nuevo), vigilancia por WhatsApp con el resumen de
las 21. **Desde el 29/09 la clave paga de Gemini (`GEMINI_API_KEY_REDES`) está
suspendida** (se acabó el crédito y después Google la suspendió): sin ella no
hay voces, o sea que las redes no pueden volver a prenderse hasta resolverlo
con Google, y la redacción no tiene respaldo si la gratis da 429. Lo que falta,
con quién y qué urgencia: **`PENDIENTES.md`** (entre lo más importante: la
clave paga, mirar los trabajos de cron-job.org).

## Dónde tocar cada cosa

| Quiero… | Dónde |
|---|---|
| Sumar, sacar o apagar una fuente, o cambiar un peso | `ingesta/fuentes.mjs` o `ingesta/fuentes-cruce.mjs` (`activa: false`; el mismo `medio` para todos los feeds de un medio); después, `node ingesta/listar-fuentes.mjs` |
| Que una palabra mande una nota a otra sección | `REGLAS_SECCION` (`ingesta/fuentes.mjs`); si es ambigua, también `PALABRAS_DEBILES` (`ingesta/ingesta.mjs`) |
| Que algo espere a una persona o no salga nunca | `REGLAS_SEMAFORO` (`ingesta/fuentes.mjs`: `rojo` —no sin preguntar—, `nunca`, `amarillo`, `cotizacion`, `internacional`, `promocional`) |
| Qué no se trae de afuera por su sección | `SECCIONES_QUE_NO_ENTRAN` y `CONEXION_ARGENTINA` (`ingesta/fuentes.mjs`) |
| Qué es "de acá" o "la zona" | `esDeAca` (`ingesta/ingesta.mjs`), `PALABRAS_LOCALES` y `PALABRAS_ZONA` (`ingesta/fuentes.mjs`) |
| Cuándo lo de un medio de acá es copia de afuera | `historiaDeAca`/`mencionaBalcarce` (`ingestar`) y `mencionaAca` (`ingesta/lectura-ia.mjs`) |
| Cómo se juntan las notas del mismo hecho | `CRUCE` (`ingesta/cruce.mjs`: umbral, horas de memoria) |
| Cuántos medios pide lo de afuera, o su cupo | `MEDIOS_DE_AFUERA`, `MEDIOS_POR_DEFECTO`, `MEDIOS_CON_FIGURA`, `CUPO_DE_AFUERA` (`ingesta/criterio.mjs`) **y** la tabla de `CRITERIO-EDITORIAL.md` |
| Cualquier número del criterio (largos, topes, horas, Facebook, podcasts, contrato, nota del dólar) | `ingesta/criterio.mjs` **y** la tabla "Los números" de `CRITERIO-EDITORIAL.md` |
| Cuántas horas en la portada o para estrenar | `PORTADA` (`ingesta/criterio.mjs`) **y** `HORAS_EN_PORTADA`, `HORAS_PARA_ESTRENAR` (`web/lib/archivo.js`) |
| La fecha de una nota | `fechaReal` (`web/scripts/generar-datos.mjs`), `fechaDeLaNota` (`web/lib/archivo.js`), `web/data/vistas.json` |
| La fecha de lo raspado (El Diario Balcarce) | `ampliar` y `HORAS_DE_UNA_NOTA_NUEVA` (`ingesta/ingesta.mjs`) |
| Qué partes de la página de un medio no son la nota | `RUIDO` y `NECROLOGICA` (`ingesta/articulo.mjs`) |
| Cómo decide la lectura con IA | `INSTRUCCION`, `aplicarFichas`, `LECTURA`, `topeDeLecturas` (`ingesta/lectura-ia.mjs`); lo que sabe de Balcarce, `ingesta/perfil-balcarce.md` |
| Juntar notas repetidas | `agruparRepetidas`, `quitarRepetidas` (`ingesta/lectura-ia.mjs`) |
| Cómo escribe la IA (tono, reglas) | `CRITERIO-EDITORIAL.md` § 4 y § 12 (sin borrar las marcas `<!-- … -->`); reiniciar el panel |
| El verificador o los arreglos que no inventan | `ingesta/verificar.mjs` (`verificar`, `arreglarEscritura`) |
| Los arreglos del título al publicar | `tituloAutomatico`, `sinBalcarceAlFinal`, `ETIQUETAS_CONOCIDAS` (`web/lib/titulos.js`) |
| El nivel de verificación o el semáforo sobre lo escrito | `nivelDeVerificacion`, `semaforoDeLaReescritura` (`reels/reescritura.mjs`) |
| Cuándo una nota tiene cuerpo | `PALABRAS_MINIMAS_CUERPO` (`web/lib/cuerpo.js`) y `CUERPO` (`ingesta/criterio.mjs`) |
| Escribir el cuerpo de una nota que espera | Tomarla de `web/data/esperando-cuerpo.json` y escribirla en `web/data/correcciones.json` (`docs/04-REDACCION.md`, paso 12) |
| Sacar o corregir una nota sin el panel | `web/data/retiradas.json` / `web/data/correcciones.json` (`CAMPOS_CORREGIBLES`; motivo, cuándo y quién) |
| Cuándo una nota pierde su página | `pierdeLaPagina` (`web/lib/archivo.js`), `esperaSoloPorCantidad` (`ingesta/ingesta.mjs`), `tieneRespaldo` (`web/lib/cuerpo.js`) |
| La firma de las notas | `quienEscribio`, `firmaCorta` (`web/components/metadatos.js`) |
| Qué ve el lector al pie de la nota | `web/components/verificacion.js`, `web/lib/fuentes-de-la-nota.js` |
| Las fotos | `web/scripts/fotos-notas.mjs` (`TOPE_POR_CORRIDA`, `elegiblePorSeccion`), `ingesta/fotos.mjs`; la foto en el espejo, `FOTO_EN_INSTAGRAM` (`web/lib/tarjeta-diseno.js`) |
| Una sección nueva, su nombre o su color | `SECCIONES` y `EN_NAVEGACION` (`web/lib/datos.js`), `--s-*` (`web/app/globals.css`), `REGLAS_SECCION` (`ingesta/fuentes.mjs`), `SECCIONES_DE_LA_FICHA` (`ingesta/lectura-ia.mjs`), `SECCIONES_VIEJAS` (`web/scripts/generar-redirects.mjs`) |
| La tapa, las secciones o "Seguí leyendo" | `armarTapa` (`web/lib/datos.js`), `web/lib/seguir-leyendo.js` |
| "Hoy en Balcarce" o la página del clima | `web/components/hoy-balcarce.js`, `web/app/clima/page.js` |
| La nota del dólar o la de cada podcast | `web/lib/notas-propias.js`; el porcentaje, `NOTA_DEL_DOLAR` (`ingesta/criterio.mjs`) |
| La página del dólar | `web/lib/dolar.js`, `web/components/dolar-vivo.js`. Nunca decir "en vivo" |
| La tipografía o los colores | `MEDIA-KIT.md` (dónde vive cada cosa) |
| Qué va a las redes | `esParaLasRedes` y `elegirParaFacebook` (`redes/elegir.mjs`) |
| A qué hora sale una pieza | `HORAS_REELS`, `VENTANAS` (`redes/piezas.mjs`) y `HISTORIAS_FIJAS` (`panel/horarios.mjs`) |
| Cómo suenan o qué dicen las piezas | `CRITERIO-REDES.md` y `redes/guiones.mjs` |
| El contrato del día | `redes/contrato.mjs` y `CONTRATO_DIARIO` (`ingesta/criterio.mjs` **y** `CRITERIO-EDITORIAL.md`) |
| El dibujo de una placa o de una tarjeta | `reels/placa.mjs`; `web/lib/tarjeta.js` y `web/lib/tarjeta-diseno.js` |
| Una medida de imagen de las redes | `redes/formatos.mjs` y `FORMATOS.md` |
| Cómo se habla con Meta | `redes/meta.mjs` |
| Qué vigila el vigilante o qué dice el WhatsApp | `redes/vigilar.mjs` (`LIMITES`, `evaluar`, `revisarPortada`), `redes/avisos.mjs` |
| La estadística diaria de notas | `ingesta/estadistica-diaria.mjs` |
| Qué archivos guarda "Actualizar la web" | La línea `git add` de `.github/workflows/actualizar.yml` (un archivo nuevo de `web/data/` que no esté ahí se pierde) |
| Los avisos publicitarios | Panel → Avisos (`PUBLICIDAD.md`) |
| Un evento de la agenda | Panel → Agenda (`panel/agenda.mjs`; `docs/09-PANEL.md`) |
| Los comercios | `comercial/` (`COMERCIAL.md`) |

## Dónde está cada documento

**`docs/00-INDICE.md`** tiene la lista completa. Los que más se usan:

| Documento | Qué cuenta |
|---|---|
| `docs/00-INDICE.md` · `docs/01-ARBOL.md` · `docs/12-GLOSARIO.md` | El recorrido de una noticia y todos los documentos · cada archivo del repo · las palabras propias |
| `docs/02-INGESTA.md` a `docs/07-REDES.md` | Ingesta y cruce · selección · redacción y verificación · fotos · web · redes |
| `docs/08-INFRAESTRUCTURA.md` · `docs/09-PANEL.md` | Workflows, secretos, claves, vigilancia, vencimientos, costos · el panel |
| `docs/10-REGLAS-Y-PRUEBAS.md` | **Las reglas numeradas** y qué prueba cuida cada una |
| `docs/11-OPERACION.md` | El manual de uso diario: enlaces, corregir, retirar, escribir cuerpos, qué mirar si algo deja de salir |
| `CRITERIO-EDITORIAL.md` · `CRITERIO-REDES.md` | **Los dos criterios únicos** (la IA y la voz los leen tal cual) |
| `PENDIENTES.md` · `IDEAS.md` | Lo que falta (con quién y urgencia) · ideas |
| `FUENTES.md` | El registro de las fuentes (generado: no se edita a mano) |
| `MEDIA-KIT.md` · `FORMATOS.md` · `PERFILES.md` · `PARA-CARGAR-A-MANO.md` | Identidad visual · medidas · biografías · tareas a mano en las redes |
| `SEO.md` · `PUBLICIDAD.md` · `COMERCIAL.md` · `INVESTIGACION.md` · `POLITICA-PRIVACIDAD.md` | SEO · avisos · comercios · lo legal · privacidad |
| `docs/historico/` | Fotos de un día que no se mantienen (historia, auditoría del 25/09, competencia, medición del cruce, plan V2.2) |

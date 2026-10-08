# Auditoría de todo el proyecto · 8/10/2026

> **Registro de la investigación del 8/10/2026.** Este archivo mezcla mejoras de lo que ya existe con ideas nuevas, y se conserva solo como historial y como fuente del detalle. **Las listas vigentes y ordenadas están en `docs/propuestas/MEJORAS.md` (sobre lo que ya existe) y `docs/propuestas/IDEAS-NUEVAS.md` (propuestas nuevas).** Algunas afirmaciones de acá se corrigieron después: manda lo que dicen esos dos archivos.

*Hecha con cuatro revisiones en paralelo (código muerto y peso; APIs y flujo de trabajo;
secciones y web; lo local y lo comercial). Es de solo lectura: no se tocó nada del proyecto.
Lo que sale del repo va con su ruta; los cupos y precios de servicios de afuera están dichos
de memoria y hay que confirmarlos antes de decidir. Nada de esto se hace sin que Hernán y
Andrés lo aprueben.*

## 0. En una página

1. **El proyecto está sano.** No hay código muerto grande ni dependencias sobrantes. Se puede
   borrar alrededor de una docena de archivos de "sondeo" de una sola vez (sección 1).
2. **El mayor riesgo no es el código, es el flujo:** una prueba o un JSON mal escrito congela
   la web (ya pasó 3,5 h y 10 h), el vigilante no se vigila a sí mismo, y el disparo depende de
   cron-job.org, que se desactiva solo (sección 2).
3. **La voz gratis (10 audios por día) es el cuello de botella** de los podcasts: no hay plan B
   (sección 2, punto 4). Podcasts más variados con la misma voz compiten por ese cupo, así que
   conviene sumar formatos con **voz humana** (sección 5).
4. **Pasar a 15 secciones es viable**, pero con datos de hoy sólo hay volumen para cuatro
   candidatas: Educación, Salud, Deporte local y Trabajo/Ciencia (sección 3).
5. **Lo local tiene huecos grandes** (Concejo Deliberante, INTA, escuelas, clubes, localidades
   del partido) y el contenido realmente humano es casi cero: 10 notas de 1.041 las publicó una
   persona (sección 4).
6. **Lo comercial:** con 20 a 77 visitas por día no se vende por impresiones; se vende presencia
   y servicio (sección 6).
7. **Firebase y ElevenLabs: no por ahora. Gmail: sí, pero para recibir avisos, no como API**
   (sección 2).

## 1. Qué sacar

**Borrar seguro** (nadie lo usa; corrieron una vez para decidir algo que ya está decidido):

| Archivo | Por qué |
|---|---|
| `redes/sondear-groq.mjs` + `.github/workflows/sondear-groq.yml` | Corrió el 1/10; la conclusión ya está en `docs/05-FOTOS.md` |
| `redes/sondear-busqueda.mjs`, `redes/sondear-tavily.mjs` + `.github/workflows/sondear-busqueda.yml` | Corrió el 3/10; las Pistas andan con `ingesta/busqueda.mjs`. **El secreto `TAVILY_API_KEY` se queda.** |
| `.github/workflows/prueba-gemini.yml` + `reels/probar-gemini.mjs` | Última corrida 25/09, sólo a mano |
| `ingesta/probar.mjs` | Sólo lo nombra un README (y `CANDIDATOS` de `ingesta/fuentes.mjs:833`, que es una lista curada: preguntar antes) |
| `docs/efemerides-octubre-para-revisar.md` | Hoja de una sola vez; se va cuando se aprueben los días de octubre |

**Borrar con cuidado** (hay que decir qué prueba se va, según la regla del proyecto):
`web/scripts/recuperar-archivo.mjs` (migración de una vez, tiene prueba),
`ingesta/combinar-auditorias.mjs` (sólo sirve al armado mensual de efemérides),
`.github/workflows/auditar-redes.yml` (duplica a `auditoria.yml` y al vigilante),
`.github/workflows/prueba-estadisticas.yml` (una prueba lee ese yml: `pruebas/vigilancia-estadisticas.test.mjs:225`).

**Juntar:** los ocho workflows manuales de diagnóstico (`prueba-*`, `sondear-*`, `ver-facebook`,
`auditar-redes`) en uno solo, "Diagnóstico", con un menú de opciones. Los que gastan voz
(`auditar-voz`, `crear-voces`) se quedan aparte. Quedaría de 22 a ~14 workflows.

**Dejar** (parecen huérfanos y no lo son): `reels/presentacion.mjs`, `cronograma-html.mjs`,
`hoja-cronograma.mjs`, `comercial/*`, `ingesta/listar-fuentes.mjs`, los `.mp4` de `/compartir`,
`pruebas-otra-hora.yml` (defiende la regla 105), `ver-facebook` (diagnóstico vivo).

**Documentos:** casi no hay superposición entre los de la raíz. Lo que pesa son `IDEAS.md` (33 KB)
y `PENDIENTES.md` (40 KB): podar lo hecho. `docs/08` dice "catorce workflows" y hay 22;
`CLAUDE.md` dice "00 a 12" y existe `13-EFEMERIDES.md`; falta `TAVILY_API_KEY` en la tabla de secretos.

**Peso del repo:** `.git` pesa 145 MB en GitHub. Lo que lo hace crecer:
`web/data/archivo.json` (2,2 MB reescrito 48 veces por día) y `web/public/fotos-notas` (43 MB,
~4 MB por día, unos 1,5 GB por año). La poda de fotos funciona en disco, no en la historia de git.
Opciones, de menor a mayor: bajar `DIAS_DE_ARCHIVO` (180 → menos); mover fotos a R2 cuando el repo
pase 1 GB; `git filter-repo` (rompe los clones: sólo con los dos presentes).
Además, `banco-fotos.json` guarda 322 marcas "intentado" sin archivo que nadie poda.

**Fragilidad chica:** `web/scripts/achicar-foto.mjs`, `collage.mjs` e `hacer-iconos.mjs` usan
`ffmpeg-static` y `@resvg/resvg-js` sin declararlos en `web/package.json` (resuelven por la raíz);
`sharp` tampoco está declarado.

## 2. Herramientas y flujo de trabajo

### Lo más importante (en orden)

1. **Sacar las pruebas del ciclo de datos.** `actualizar.yml` corre `npm test` (1.800 pruebas) en
   cada ciclo, 48 veces por día; una prueba que depende de la hora congela la web. Propuesta: un
   `pruebas.yml` con `on: push` (ignorando `web/data/**`) y, en el ciclo, sólo un control corto:
   JSON válido, `motivo/cuando/por` de `correcciones.json` y `retiradas.json`, y el build.
2. **Que el vigilante no sea punto único.** `redes/vigilar.mjs` sólo mira 3 workflows; no mira
   Vigilancia, Auditoría IA, Pistas, Panel del celular, Auditoría semanal, Armado vacío ni Pruebas
   otra hora. Propuestas baratas: un ping a healthchecks.io al final de `vigilancia.yml` (si dejan de
   llegar, avisa por mail) y un segundo canal (Telegram o ntfy.sh, sólo `fetch`, no rompe la regla de
   cero dependencias). CallMeBot es de un solo teléfono y sin garantía.
3. **Plan B para la voz** (`PENDIENTES` 0g): segunda clave en **otro proyecto de Google, sin
   tarjeta**, con las voces recreadas (`crear-voces.yml`, modo `recrear`), usada sólo ante un 429.
   Es lo único que protege un servicio de cara al público.
4. **Disparo propio con Cloudflare:** un Worker con Cron Trigger (gratis) que dispare el workflow,
   en el mismo proveedor que la web; cron-job.org queda de respaldo. El token de GitHub vence igual
   el 21/09/2027.
5. **Renovar el dominio por varios años ya** (vence el 21/09/2027, con el token del cron).
6. **Cuenta única.** Todo cuelga de `radarbalcarce@gmail.com` y el repo tiene un solo dueño:
   2FA con códigos de respaldo fuera de la PC, y sumar a Andrés como administrador de Meta,
   Cloudflare y el repo.

### Ajustes de flujo

- **Se compila dos veces por ciclo** (`actualizar.yml` y `cloudflare-deploy.yml`) y hay 3 `npm ci`
  sin caché. Subir `web/out` como artefacto o hacer un segundo job con `needs`, y agregar
  `cache: npm`: la nota sale 2-3 minutos antes.
- **Posibles corridas duplicadas:** `actualizar.yml` tiene `schedule 7,37` además del disparo de
  cron-job a :00 y :30. Contar corridas por hora en Actions; si hay repetidas, una guardia de
  "ya corrió hace menos de 20 minutos".
- **Candado compartido:** Pistas y Panel del celular usan el mismo grupo; una pista de las 3 h
  puede hacer perder un pedido de "Escribir con IA". Darle grupo propio a Pistas.
- **Gemini:** el alias `gemini-flash-lite-latest` cambia de modelo sin avisar y puede mover la
  calidad editorial: fijar versión o registrar el `modelVersion`. Revisar los términos del plan
  gratis: pueden permitir usar los datos enviados, y las Pistas pueden traer datos sensibles.
- **Groq:** los modelos *preview* (`ingesta/fotos.mjs`) pueden desaparecer.
- **Meta:** `redes/meta.mjs` fija la API `v23.0`; las versiones se retiran a los ~2 años (mediados
  de 2027). Anotarlo en `VENCIMIENTOS` y probar la siguiente con "Ver Facebook".
- **Tavily:** agregarla al vigilante (`CLAVES_DE_IA`) y a `docs/08`; su plan gratis tiene un cupo mensual.
- **`auditoria.yml`** falló el 5/10 (15 minutos): mirarla antes de tocar auditorías.

### Qué hacer con cada herramienta que preguntaste

| Herramienta | Veredicto |
|---|---|
| **GitHub** | Ya es el motor. Mejorar: pruebas por push, caché, artefacto de build, grupos de concurrencia. |
| **Cloudflare** | Sí: Worker con Cron como disparador; R2 para fotos cuando el repo pese; D1/KV para el libro de redes sólo si los reintentos molestan. No: Images ni Turnstile. |
| **Gemini (voces y texto)** | Quedarse. Plan B de voz y modelo fijo. |
| **Groq** | Quedarse de respaldo; mirar el tope diario de tokens. |
| **Gmail** | **Sí como receptor** de avisos (healthchecks, Actions, Cloudflare). **No** como API para leer Participá: el token de prueba vence a los 7 días. Si Participá crece, un Email Worker de Cloudflare. |
| **Firebase** | **No por ahora.** Hosting es redundante con Pages; GA4 pisa a Web Analytics y obliga a cambiar la política de privacidad; Firestore/Auth no resuelven nada que hoy duela. Lo único útil sería FCM (notificaciones push web), y se puede hacer con un Worker + KV o con OneSignal, cuando haya tráfico que lo justifique. |
| **ElevenLabs** | **No** como principal ni como respaldo directo: el plan gratis no alcanza para 6-8 piezas diarias, no trae licencia comercial y rompe la regla de "nunca con otra voz". Sólo como plan de emergencia pago si Google recortara el cupo. |

## 3. De 11 a 15 secciones, con barra lateral

`PENDIENTES.md` ya dice "quedamos en 15" y fija la regla de sumar **de a una cada dos semanas,
sólo si llena 10 notas por semana**, con una maqueta del menú ("Más") antes de tocar.

**Volumen real** (archivo.json, ~3,4 semanas; casi todo desde el 14/9):

| Sección | Notas | | Sección | Notas |
|---|---|---|---|---|
| Balcarce | 196 | | Cultura y agenda | 59 |
| Automovilismo | 151 | | Argentina | 57 |
| Deportes | 146 | | Policiales | 18 |
| Política | 125 | | Tecnología | 7 |
| Economía | 114 | | Fútbol | 89 |
| Agro | 70 | | | |

**Candidatas** (conteo por palabras, aproximado; reclasificar una muestra antes de decidir):

1. **Educación**: ~63 notas (~18/semana), casi todas de Balcarce.
2. **Salud**: ~48 (~14/semana). Lateral listo: farmacia de turno y números útiles.
3. **Deporte local**: Deportes tiene 100 locales contra 47 de afuera; partirlo da dos secciones sanas.
4. **Ciencia y tecnología** o **Trabajo y empleo** (~33, ~10/semana). Tecnología hoy sólo tiene 7
   y no pasa el piso; llenarla pide la excepción de un solo medio, que decide Hernán.
   *Turismo y gastronomía queda afuera por ahora* (de 43 hallazgos, 18 son "Turismo Carretera").

**Barra lateral:** hoy sólo la portada tiene (`.dos-columnas`, `HoyEnBalcarce`, agenda, buzón);
la página de sección y la nota son una columna y se sacó el clima a propósito. Datos que ya
existen para alimentar cada lateral: Balcarce (clima, farmacias, números útiles, agenda), Fútbol
(`futbol.json`), Automovilismo (`f1.json`, agenda), Economía (dólar), Cultura (agenda, efemérides),
Agro (sólo pronóstico), Salud/Policiales (números útiles, farmacia). **Sin dato propio:** Política,
Tecnología, Argentina, Educación → ahí el lateral tiene que ser "lo más leído de la sección", los
temas (hoy apagados con `MOSTRAR_TEMAS = false`) o un aviso publicitario, para no mostrar un hueco.

**Dónde se toca** (resumen; la lista completa está en la auditoría): `SECCIONES` y
`EN_NAVEGACION` (`web/lib/datos.js`), `--s-*` (`globals.css` y el panel), `COLOR_SECCION`
(`reels/placa.mjs`), `COLOR` (`tarjeta-diseno.js`), `REGLAS_SECCION` (`ingesta/fuentes.mjs`),
`SECCIONES_DE_LA_FICHA` (`lectura-ia.mjs`), `SECCIONES_VALIDAS` (`auditoria-ia.mjs`),
`web/public/panel/github.js`, `notas-de-pistas.js`, `criterio.mjs` + tabla del criterio, los dos
criterios y `CLAUDE.md`, y pruebas con listas fijas (`titulos-colores`, `nota-de-pista` con
`length === 11`, `redirects`). Los colores nuevos tienen que pasar contraste 4,5:1 (hay dos
reservados: `#C0258F`, `#0A7C99`).

**Riesgos:** las URLs de nota no cambian (no llevan la sección); las de sección sí, así que renombrar
exige 301 (`SECCIONES_VIEJAS`). Las notas ya publicadas conservan su sección: reclasificarlas con
`correcciones.json` o una migración, o la nueva arranca vacía y las de origen quedan flacas
(Policiales y Tecnología ya están al límite). Las secciones sin notas salen `noindex`. Con 15 el menú
no entra: hace falta el botón "Más". Una sección sensible nueva (Salud) obliga a decidir si espera
a una persona en redes.

**Orden sugerido:** maqueta del menú y de la barra lateral → Educación y Salud → Deporte local →
cuarta sección, con una muestra reclasificada a mano antes de tocar el clasificador.

## 4. Lo local: dónde está el valor

- **Concentración:** Infórmese Primero (143), Radio Gabal (135), La Vanguardia (134) y El Diario (100)
  son casi todo lo local. Aportan poco: News Balcarce (36), Acción 5 (7), Ahora Balcarce (4),
  Radio Sudestada (bloquea a GitHub), Minuto Balcarce (dormido desde julio), Sendero Regional (apagado).
- **Sin ninguna fuente hoy** (todo "a verificar", no se inventó ninguna URL): Concejo Deliberante
  (sesiones, ordenanzas, actas), boletín oficial y licitaciones, datos abiertos municipales, INTA
  Balcarce propio (hoy sólo el feed nacional) y Facultad de Agrarias, cooperativa eléctrica y de agua
  (cortes), Hospital / Bomberos / Defensa Civil (probablemente sólo Facebook), Consejo Escolar,
  clubes y Liga, Cámara de Comercio, Sociedad Rural, Museo Fangio, Teatro.
- **Localidades sin cobertura propia:** Napaleofú, Ramos Otero, San Agustín, Los Pinos y Laguna La Brava.
- **Clima rural:** el clima es urbano; falta helada, lluvia acumulada y viento por paraje.
- **Contenido propio humano:** 983 notas automáticas, 192 con IA, 10 de una persona. Es la mayor
  diferencia posible contra cualquier medio automático.

## 5. Ideas

### Para la web y las redes (nuevas, no están en `IDEAS.md`)

| # | Idea | Esfuerzo | Valor |
|---|---|---|---|
| 1 | **Parte agroclimático**: riesgo de helada, lluvia acumulada, ventana de viento y humedad (Open-Meteo ya está), como historia y como podcast del campo dos veces por semana; alerta de tizón de la papa validada con el INTA | Bajo-medio | Alto |
| 2 | **Red de pluviómetros vecinal**: productores mandan los mm por WhatsApp; tabla acumulada por paraje | Medio | Alto |
| 3 | **Cartel QR en las farmacias** a `/farmacias` (convenio con el Colegio de Farmacéuticos); distribución gratis y espacio de auspicio | Bajo | Alto |
| 4 | **"¿Hay clases?" matinal**: suspensiones por clima, paro u obra, y calendario escolar | Bajo-medio | Alto |
| 5 | **Voxpop "La pregunta de la semana"**: 3 vecinos en la plaza, 30 s con voz humana (no gasta cupo de voz IA) | Bajo | Medio-alto |
| 6 | **Entrevista de 5 minutos** una vez por semana, audio humano más transcripción como nota | Medio | Alto |
| 7 | **Planilla de los clubes** (vóley, básquet, hockey, rugby, infantiles): delegados mandan resultados por WhatsApp con formato fijo | Medio | Alto |
| 8 | **"Rincones"**: ficha y novedades de cada localidad del partido, con un vecino enlace en cada una | Medio | Alto |
| 9 | **Canasta Radar mensual**: 10 productos en 3 comercios, con foto de góndola (dato propio que otros citan) | Medio | Medio-alto |
| 10 | **Perdidos y encontrados** semanal (cuidar datos personales, ley 25.326) | Bajo-medio | Medio |
| 11 | **"¿Es cierto?"**: chequeo de rumores y estafas locales; se apoya en Pistas | Medio | Alto |
| 12 | **"¿Dónde es?" y trivia semanal**: foto vieja o detalle del pueblo; el premio es un producto de auspicio | Bajo | Medio |

### Podcasts más variados sin gastar más voz

El cupo es de 10 audios por día y hoy hay tres repasos (10, 15 y 21), clima, farmacia y efemérides.
La variedad sale de **cambiar el tipo de audio, no de sumar voz de IA**:

- **Con voz humana** (cupo cero): voxpop (5), entrevista (6), audio-notas de vecinos, "el dato del campo"
  grabado por un productor.
- **Con voz de IA, pero reemplazando, no sumando:** un repaso semanal temático (lunes: agro; jueves:
  cultura y agenda; sábado: deporte local) en lugar de uno de los tres repasos de siempre; resumen de
  la sesión del Concejo cuando haya fuente.
- **Sin audio:** versión en tarjeta o carrusel del mismo contenido, para Instagram y WhatsApp.

## 6. Lo comercial, con los números de hoy

- **Tráfico:** 21 a 77 visitas por día (picos de 120 a 700 vistas); Facebook es la primera fuente;
  parte de las visitas desde EE. UU., Irlanda y China parecen robots. Facebook tiene 7 seguidores e
  Instagram 4.
- **Hay armado:** 3 espacios fijos en la web (todos vacíos), un catálogo de propuestas
  (`comercial/propuestas.mjs`) y 145 comercios (casi todos importados de OpenStreetMap, 1 activo).
  **Falta:** página `/publicidad`, media kit con números, precios y el primer mensaje a un comercio.
- **Camino realista:**
  1. No vender impresiones: no hay nada que cobrar por mil vistas todavía.
  2. Semana 1-2: página `/publicidad` y hoja de venta con números honestos (visitas únicas de
     Argentina, alcance de Facebook, piezas por día); averiguar qué pagan hoy los comercios en la radio.
  3. **Tres auspiciantes fundadores gratis por 60-90 días**, a cambio de un testimonio; después, precio de lista.
  4. Productos que no dependen del tráfico: "Presentado por…" en clima y farmacia, mención en el parte
     del campo (agroinsumos, maquinaria), premio de la trivia, cartel QR con logo.
  5. Cámara de Comercio como aliada (guía gratis para socios a cambio de su lista).
  6. Servicios digitales (webs, redes) como ingreso inmediato.
  7. Posponer AdSense (centavos, y rompe la regla de "nada de terceros").
  8. Meta para cobrar display: 300 visitas diarias reales durante 4 semanas y 300 seguidores.
- **Lo más urgente es de Hernán y Andrés:** los primeros 10 mensajes a comercios, decidir precios y
  mover los grupos de WhatsApp de Balcarce. Es lo que más falta para que suban los números.

## 7. Plan por etapas (para que ustedes elijan)

| Etapa | Qué | Quién | Riesgo |
|---|---|---|---|
| A · esta semana | Borrar los sondeos y juntar workflows de diagnóstico; actualizar `docs/08`, `CLAUDE.md`, `IDEAS`/`PENDIENTES` | Claude | Bajo |
| B · esta semana | Pruebas por push, caché de `npm`, un solo build, healthchecks + segundo canal de aviso | Claude (+ ustedes crean la cuenta y pegan el secreto) | Medio: tocar `actualizar.yml`, hacerlo entre corridas |
| C · 2 semanas | Plan B de voz (otro proyecto de Google), Worker con Cron, renovar dominio | Ustedes + Claude | Medio |
| D · 2-4 semanas | Maqueta del menú y la barra lateral; Educación y Salud; parte agroclimático | Claude, ustedes aprueban la maqueta | Medio |
| E · continuo | Fuentes locales nuevas (Concejo, INTA, escuelas), voxpop y entrevista, `/publicidad` y 10 mensajes a comercios | Ustedes (comercial y calle), Claude (fuentes) | Bajo |

**Lo que necesito que decidan:** (1) si se borran los archivos de la sección 1; (2) cuáles secciones
nuevas y en qué orden; (3) si hacemos primero el flujo (etapa B) o las secciones (etapa D).

# Ideas para que el medio tenga alcance de verdad

*Actualizado el 29/09/2026 (noche).* Ideas para discutir, no tareas: ninguna está
decidida. Cada cosa vive en un solo lugar: lo que ya se decidió hacer y lo que
falta del sistema está en `PENDIENTES.md` (por ejemplo, servir las tipografías
desde el propio sitio, A9); lo que ya se hizo, en `docs/historico/HISTORIA.md`;
cómo ganar plata, en `PUBLICIDAD.md`; la base de comercios y la guía, en
`COMERCIAL.md`.

## La tabla, de la más viable a la menos

"Viable" quiere decir tres cosas a la vez: poco trabajo, no depende de que un
tercero conteste y no necesita audiencia previa. **Valor** es cuánto suma en
lectores, confianza o plata. El orden se armó el 28/09 a pedido de Hernán y se
repasó el 29/09: es para discutirlo juntos, no una decisión.

| # | Área | Idea | Qué es y por qué | Valor | Esfuerzo |
|---|---|---|---|---|---|
| 1 | Audiencia | **La farmacia de turno por WhatsApp** | Un mensaje automático contesta qué farmacia está de turno. Detalle abajo | Alto | Bajo-medio |
| 2 | Audiencia | **Una lista de WhatsApp para conseguir información** | Vecinos que mandan datos, fotos o avisos: la fuente que ningún medio de acá tiene. Detalle abajo | Alto | Bajo |
| 3 | Contenido | **"Un día como hoy" a las 12:30** | Hechos de la fecha, un balcarceño si coincide y el día especial: reel, historia y nota. Detalle abajo | Alto | Bajo-medio |
| 4 | Contenido | **El clima de Balcarce un día como hoy** | "Un 29 de septiembre, en 2019, hizo 24,9°: la máxima más alta para esta fecha desde 1950". Detalle abajo | Medio | Bajo |
| 5 | Contenido | **El cielo de hoy** | La luna, el sol y las lluvias de meteoros del mes. Detalle abajo | Medio | Bajo |
| 6 | Sistema | **Aviso cuando una fuente deja de traer notas** | El vigilante avisa "tal medio no trae nada hace 12 horas". El 25/09 El Diario Balcarce le contestó 403 a GitHub: si pasara siempre, nadie se enteraría | Medio | Bajo |
| 7 | Sistema | **Ser buen vecino con los medios** | Guardar el texto de cada nota ya leída (no volver a pedirla en cada corrida) y espaciar los pedidos al mismo sitio: menos riesgo de que nos bloqueen | Medio | Bajo |
| 8 | Sistema | **Estadísticas en el panel** | La evolución de visitas y seguidores (`web/data/estadisticas.json`, que ya se guarda) sin esperar el WhatsApp; el panel del celular la puede leer de GitHub | Bajo | Bajo |
| 9 | Web / SEO | **Alta en Google Noticias** (Publisher Center) | Un trámite manual: ya están "Quiénes somos", "Contacto", el sitemap de noticias y las notas con cuerpo | Alto | Bajo |
| 10 | Contenido | **"En qué quedó"** | Cargar 3 o 4 promesas concretas del municipio ("asfaltar tal calle") en el buzón del panel de la PC (el tipo `seguimiento` existe; el buzón todavía no tiene ninguna entrada) y publicar una nota corta cada vez que se revisan, cada 4 a 6 semanas. Lo que un medio grande no sostiene | Alto | Bajo |
| 11 | Sistema | **Unir a mano dos notas desde el celular** | Desde el 29/09 la misma noticia que vuelve a entrar con otro enlace se une sola (queda una y la otra redirige con 301: `web/lib/repetidas.js`, `web/data/fusionadas.json`), pero la regla es estricta (80 % de palabras en común, menos de 4 días). Un botón "Unir con…" en el panel del celular cubriría las que se escapan, con el mismo mecanismo | Medio | Bajo-medio |
| 12 | Web / SEO | **Teléfonos y emergencias** | Hacer de `/util` la página de emergencias: las guardias del día juntas arriba (cooperativa, farmacia de turno, hospital), botones grandes para llamar y un título que Google encuentre. Es de lo más buscado en un pueblo | Alto | Bajo |
| 13 | Web / SEO | **Compartir mejor desde el celular** | El botón nativo de compartir, el enlace sin `?fbclid`, un "Copiado" que se anuncie y un botón fijo de WhatsApp al pie de la nota (auditoría del 29/09: casi todos comparten desde el celular) | Medio | Bajo |
| 14 | Audiencia | **Un RSS por sección** | `/seccion/balcarce/feed.xml`, para canales de WhatsApp y lectores de noticias. El feed general ya existe | Bajo | Bajo |
| 15 | Contenido | **La semana en Balcarce y las fechas patrias** | Contenido fijo que llena la portada aunque no pase nada: el resumen del domingo (las 5 más leídas y las 3 cosas que vienen; también sirve para el resumen de `PUBLICIDAD.md`, escalón 7), los feriados con el ángulo local (actos, farmacias, transporte) y los días que mueven el pueblo (del Agricultor, del Niño, del Estudiante y la Primavera, de la Tradición) | Medio | Bajo-medio |
| 16 | Contenido | **Precios del campo** | Hacienda, granos y dólar agro, de fuentes públicas (Bolsa de Cereales, Mercado Agroganadero, BCRA): una tarjeta diaria, muy útil en una zona agrícola | Medio | Bajo-medio |
| 17 | Contenido | **"Lo que abre y lo que cierra"** | Un posteo semanal con los comercios que abrieron y cerraron. Se comparte solo en los grupos del pueblo y es la puerta a vender publicidad: el que recién abre quiere que lo conozcan | Alto | Bajo-medio |
| 18 | Audiencia | **Invitar a participar** | Hernán, 29/09: historias (y reels) que inviten a mandar **noticias**, **reclamos** o **notas para escribir**, "capaz que más dividido": una pieza por tema, rotando en la semana, con el WhatsApp del medio (2266 51-1612). Propuesta de textos y días en `PENDIENTES.md` (espera el visto bueno: son piezas públicas). Alguien tiene que mirar los mensajes todos los días y pasar lo que sirve al buzón. Más adelante, un formulario en la web (pide pensar el spam, la firma y qué se publica) | Alto | Bajo-medio |
| 18b | Contenido | **Descuentos de tarjetas y billeteras** | Hernán, 29/09: una sección con los descuentos del día (Cuenta DNI, MODO, Mercado Pago, bancos), como la del dólar. Se está investigando de dónde sacar los datos de forma automática y sin riesgo legal | Alto | Medio |
| 18c | Contenido | **Aprender de finanzas personales** | Hernán, 29/09: notas para aprender (plazo fijo, dólar MEP, acciones, bonos, jubilación, créditos). Una nota de un solo medio no pasa el cruce de Economía (pide 2): hace falta una regla propia para lo educativo. Se está investigando con qué fuentes **Investigado el 30/09**: la base más limpia es argentina.gob.ar (CNV, ANSES, Economía, Defensa del Consumidor), con licencia Creative Commons que permite reutilizar citando; el BCRA prohíbe usar sus textos con fines comerciales sin permiso (sí sus datos, con palabras propias). No hay un feed educativo oficial: se trata como biblioteca para escribir guías fijas que se revisan cada tanto. Nunca consejo personalizado ni recomendar productos. Hay 20 temas ordenados y un aviso legal propuesto; para empezar, guías de estafas, tarjeta, plazo fijo y monotributo, con revisión humana. | Medio | Medio |
| 19 | Contenido | **Balcarce en números** | Un dato del INDEC o del municipio por semana, con un gráfico simple | Medio | Bajo-medio |
| 20 | Web | **Buscar en todo el archivo** | Hoy el buscador busca sólo en las notas de las últimas 36 horas y cada página trae su índice adentro (unos 27 KB repetidos en 583 páginas). Un `buscador.json` que se baje al abrir la lupa busca en los 180 días | Medio | Medio |
| 21 | Web / SEO | **Correcciones y política editorial, públicas** | `/correcciones` (qué se corrigió, cuándo y por qué) y una página con cómo trabajamos, sacada de `CRITERIO-EDITORIAL.md` y enlazada desde cada nota. Da confianza y la miran Google Noticias y AdSense | Alto | Medio |
| 22 | Web / SEO | **Guías que quedan** | "Cómo sacar…" y "Qué hacer si…": trámites, tasas, turnos, horarios. Se escriben una vez, se revisan cada tanto y traen visitas todos los meses; son el mejor lugar para un aviso | Alto | Medio |
| 23 | Web | **Guardar el audio del podcast para escucharlo en la web** | Guardar el audio de cada repaso (no el video) en `web/public/audio/` y poner un reproductor en su nota (`web/lib/notas-propias.js`). **Suma unos 1,2 MB por día al repositorio** (unos 440 MB por año) y el audio tiene que llegar antes de compilar: los reels los arma `redes.yml` y la web, `actualizar.yml`. A decidir (`PENDIENTES.md`) | Medio | Medio |
| 24 | Web / SEO | **Prender las páginas de "Temas"** | `MOSTRAR_TEMAS` (`web/lib/sitio.js`) cuando cada tema tenga suficientes notas, para enlazar notas entre sí. Las páginas existen y están en el sitemap, pero nada las enlaza (sacarlas o prenderlas se decide en `PENDIENTES.md`) | Medio | Medio |
| 25 | Negocio | **Clasificados** | Compra-venta, changas y alquileres: un aviso que paga el propio vecino, no un espacio por mes. Para empezar, por WhatsApp y una página, cobrado a mano (`PUBLICIDAD.md`, escalón 6) | Medio | Medio |
| 26 | Contenido | **Lo que pasó en el Concejo** | Resumir en cinco líneas las actas que nadie lee (PDF, lenguaje administrativo; fuente primaria: el Boletín Oficial Municipal). No pide estar ahí, pide paciencia, y da autoridad | Alto | Medio |
| 27 | Contenido | **Cortes programados** | Agua, luz y tránsito, del municipio y las cooperativas (las alertas del clima ya salen) | Medio | Medio |
| 28 | Contenido | **Automovilismo como marca propia** | Una nota semanal sobre pilotos balcarceños en cualquier categoría: un nicho que nadie cubre, con público asegurado por Fangio | Medio | Medio |
| 29 | Voz | **Un nombre para cada locutor** | Ponerles nombre a la locutora y al locutor para que se sientan cercanos, no "la voz de Gemini". Las dos voces en una misma pieza se probaron y se descartaron (abajo) | Bajo | Bajo |
| 30 | Contenido | **Resumen del fútbol, lunes, nota propia** | Hernán, 29/09: cada lunes, una nota propia con los resultados de la Primera y de las copas que se jueguen. Antes de aplicarlo hay que analizar de dónde salen los resultados (fuente verificada, no de memoria) y cómo se verifica una nota de puros números **Investigado el 30/09**: la mejor fuente gratis con API es TheSportsDB (Liga Profesional, tabla y resultados, 30 pedidos por minuto; sin términos comerciales claros: conviene escribirles o pagar su plan de 9 dólares), controlada contra ESPN (sin licencia, sólo para comparar). Nota armada sin IA con una plantilla; si un resultado no coincide entre las dos fuentes, el partido no entra. Cuidado con Apertura y Clausura, que repiten el número de fecha. La Liga Balcarceña no se automatiza (su sitio está parado en julio; la cuentan News Balcarce y Radio Gabal). | Alto | Medio |
| 31 | Contenido | **Cultura y Tecnología con identidad** | Hernán, 29/09: más resúmenes propios, hablar de la IA en positivo y cubrir los anuncios grandes (Anthropic, OpenAI, Tesla, SpaceX) y lo de interés general. Ya hay fuentes verificadas (informe del 29/09: El Destape, C5N, MDZ, Perfil tecnología; Perfil, Clarín cultura) **Investigado el 30/09**: para tecnología andan hoy los feeds oficiales de Google (también en castellano), DeepMind, OpenAI, Microsoft, Nvidia, Meta, NASA y ESA; Anthropic no tiene RSS (se lee su página de novedades); Tesla, SpaceX y xAI no tienen fuente usable. Ciencia argentina: UNSAM, UNLP, Exactas UBA y CyTA andan; CONICET sólo tiene HTML. Para cultura: INCAA, Cultura Nación y Teatro Colón andan; la identidad sería lo oficial, lo regional y lo útil para salir, sin farándula. Propuesta: resumen semanal de IA los viernes (atribuido, con cruce de fuentes y un límite o cuidado) y agenda cultural de la región los jueves. | Alto | Medio |
| 32 | Video | **Reels animados que explican** | Hernán, 29/09: animaciones de ciencia, tecnología y economía doméstica. Hoy los videos son placas con voz; esto pide un diseño propio de escenas. Para el mes que viene, con los reels e historias nuevas | Medio | Alto |
| 33 | Contenido | **Un día como hoy y las fechas patrias** | Investigación del 29/09 en `docs/historico/`: fuentes que andan (Wikipedia, Wikidata, feriados) y una lista curada de 16 fechas patrias con datos y citas. Se arma una semana antes para revisar y aprobar | Alto | Medio |
| 34 | Contenido | **Descuentos de todos los bancos y billeteras** | Hernán, 29/09: no sólo Cuenta DNI: MODO, Galicia, Nación, Santander y el resto. Cuenta DNI tiene datos públicos y los de Balcarce; los demás casi no publican datos leíbles: hay que buscar una fuente que junte muchos **Investigado el 30/09**: no hay un agregador oficial con datos abiertos; lo más parecido es MODO (junta más de diez bancos, una página por promo, sitemap de 27.000 direcciones con muchas vencidas, y hay que renderizar la página para leer topes). Cuenta DNI y Nación se leen en HTML. Galicia, Santander, BBVA y Mercado Pago no tienen camino directo confiable. La competencia (PromoArg y notas sueltas de medios) también lo hace por scraping y sin garantías. Ninguna fuente da licencia escrita: conviene escribirles. Recomendación: empezar por una franja "Hoy en Balcarce" con Cuenta DNI y Nación, cada promo con porcentaje, tope, día, vigencia y enlace oficial (si falta un dato, no sale); MODO después, y a las redes sólo tras semanas sin errores. | Alto | Alto |
| 30 | Contenido | **Cine, libro y música de la semana** | Siempre el mismo día. Cine argentino (datos de TMDB o Wikidata), aniversarios de autores. De un autor muerto hace menos de 70 años no se copian fragmentos: se recomienda y, como mucho, una cita corta. Cuando haya criterio sobre el tono | Bajo | Medio |
| 31 | Contenido | **"El vecino que…"** | Una persona o un comercio del pueblo por semana, con una foto que mandan ellos. Alimenta la guía comercial | Medio | Medio |
| 32 | Sistema | **Panel de salud del sistema** | Ver de un vistazo si algo se cayó sin abrir tres workflows (el vigilante ya avisa casi todo por WhatsApp) | Bajo | Medio |
| 33 | Sistema | **Vista previa del reloj** | Ver antes lo que las redes van a publicar en las próximas horas | Bajo | Medio |
| 34 | Negocio | **La guía comercial y el mapa** | El catálogo de venta: un mapa con fichas gratis y mejoras pagas. Lo caro no es el código: es cargar y mantener los datos (`COMERCIAL.md`, "La guía y el mapa") | Alto | Alto |
| 35 | Contenido | **Material gratis de gente local** | Músicos, fotógrafos o realizadores de Balcarce (o bancos libres) que cedan material a cambio de crédito, para el banco de fotos y las redes. Depende de convencerlos de a uno | Medio | Alto |
| 36 | Web | **La accesibilidad a fondo** | Lo que quedó de la revisión del 25/09. Lo concreto ya anotado (botones chicos, "saltar al contenido") está en `PENDIENTES.md` (A6 y A12) | Medio | Medio-alto |
| 37 | Sistema | **Analítica propia sin cookies** | Más completa que la de Cloudflare, pero es construir un sistema nuevo | Bajo | Alto |
| 38 | Sistema | **Probar los workflows en la PC** (`act`) | Ver un workflow de GitHub Actions sin subirlo. Ahorra tiempo; nadie de afuera lo nota | Bajo | Medio |
| 39 | Contenido | **Una historieta con un personaje propio** | Como los diarios de antes: alguien de acá reconocible sin ser nadie en particular (nunca una persona real), con humor de lo que pasó en la semana; de las tiras clásicas se toma el estilo, nunca sus chistes ni sus dibujos. Una por semana (web, posteo e historia), cuando haya lectores | Medio | Alto |
| 40 | Audiencia | **Radio online o YouTube 24/7** | Una señal que no se corta, con los podcasts, el clima, la farmacia y la agenda. Pide un servidor aparte (Icecast o AzuraCast; para YouTube, una máquina transmitiendo), música libre o pagada (SADAIC, AADI-CAPIF) y decir que la voz es generada. Una radio de verdad puede pedir autorización de ENACOM (`INVESTIGACION.md` § 4). Después del lanzamiento, cuando haya avisos que la paguen | Medio | Alto |

Detalles chicos del sitio que dejó la auditoría del 29/09:

- "Actualizado hace X min" arriba de la portada, además del pie.
- La fecha y la hora exactas junto al "hace X" de cada nota.
- Que las pestañas de "Hoy en Balcarce" se puedan enlazar (`/#dolar`).
- Que la auditoría de los lunes cuente las notas con la imagen rota y los grupos
  de notas repetidas.
- La caja de búsqueda de Google (`SearchAction`) cuando se pueda buscar en todo
  el archivo (idea 20).

## Las cinco primeras, en detalle

### 1. La farmacia de turno por WhatsApp

Es lo más buscado de Balcarce y lo peor resuelto: hay que entrar a una web,
buscar el día y leer una tabla. Un mensaje automático que conteste "¿qué
farmacia está de turno?" con el nombre, la dirección y el enlace al mapa lo
resuelve en tres segundos y, además, **deja el número del medio agendado en el
teléfono de la gente**: ése es el activo, no la visita.

El dato ya existe (la farmacia de turno se publica cada media hora). Falta la
puerta: un número con la API de WhatsApp Business y algo que conteste, porque el
sitio es estático y no tiene servidor (por ejemplo, un Worker de Cloudflare,
gratis a esta escala). Contestarle a quien escribe primero no se cobra en la API
de Meta; confirmarlo al arrancar, porque Meta cambia sus precios seguido.

### 2. Una lista de WhatsApp para conseguir información

Vecinos que mandan un dato, una foto o un aviso: un corte de luz, una obra que
empezó, algo que vieron. Es la fuente que ningún medio de Balcarce tiene: todos
escriben desde lo que ya está publicado en otro lado.

Está casi resuelta: el WhatsApp del medio (2266 51-1612) ya está al pie de cada
página, y el buzón del panel de la PC (`panel/buzon.mjs`) ya tiene el tipo
`dato` con su regla (se verifica como cualquier nota y sale sólo si lo confirma
una segunda fuente). Falta invitar a usarlo en serio (una lista o un canal de
difusión), alguien que lo mire todos los días y una regla chica de qué pasa al
buzón: no todo lo que llega es una noticia. **Un dato sin verificar no es una
nota**: nunca se publica sólo porque alguien lo mandó.

### 3. "Un día como hoy" (12:30: reel, historia y nota)

*Pedido de Hernán y Andrés (28-29/09): efemérides con personas y días
importantes, entre el repaso de la mañana y el de la tarde, que además armen la
nota para el diario. Las fuentes se probaron el 29/09 y andan sin clave. Falta
decidirlo (`PENDIENTES.md`).*

**Fuentes que sirven (probadas):**

- **Wikipedia en español, "un día como hoy"**
  (`es.wikipedia.org/api/rest_v1/feed/onthisday/all/MM/DD`): hechos,
  nacimientos, fallecimientos y celebraciones de cada fecha, con la página de
  origen; trae los días de Argentina (el 29/9, el Día del Inventor). Es CC BY-SA:
  la nota se escribe con palabras propias y la fuente va en "Fuentes (N)".
- **Wikidata, los nacidos en Balcarce** (consulta SPARQL): dio 31, con sus
  fechas. Fangio (24/6/1911 y 17/7/1995), Lucas Kraglievich (3/8/1886,
  paleontólogo), Juan Manuel Bordeu (28/1/1934), Carlos Heras (historiador),
  Santiago Mangoni y varios futbolistas. Descartar las fechas "1 de enero" (es
  sólo el año) y cuidar a las personas vivas.
- **Wikidata, argentinos conocidos por fecha** (más de 12 idiomas de Wikipedia
  como señal de fama). Necesita un filtro de temas sensibles: para el 29/9
  apareció una detenida desaparecida.
- **El calendario oficial de feriados** (`api.argentinadatos.com/v1/feriados/AAAA`).
- **Lo local, a mano**: un archivo (`ingesta/efemerides-locales.json`) con las
  fechas de Balcarce (fundación, clubes, escuelas, el autódromo) verificadas con
  el Museo Fangio, el Museo Histórico y el Archivo Municipal: no se publica una
  fecha de memoria. Las fotos viejas tienen dueño (el Museo Histórico Municipal
  "Don Aurelio González", el Archivo Histórico Municipal): se piden, y mientras
  tanto va sin foto.

**No sirven:** las efemérides del Ministerio de Educación (el sitio bloquea el
acceso automático: sólo para controlar a mano) y los portales grandes (el texto
tiene derechos).

**Cómo se armaría:** un hecho de Wikipedia, el balcarceño de la fecha si
coincide, el día especial y el dato del clima de otros años (idea 4). La IA
redacta sólo con esos hechos y el verificador controla que no agregue nada
(`ingesta/verificar.mjs`). Reglas: primero lo de Argentina y Balcarce; nada de
asesinatos, atentados ni víctimas (salvo los feriados nacionales); nunca un
menor; cuerpo de 70 palabras o más. Saldría a las 12:30 con la voz de la
locutora y la nota "Un día como hoy" en Cultura y agenda, y suma un reel y una
historia al contrato del día (`CONTRATO_DIARIO`).

**Lo que hay que resolver es la voz.** Las voces van por el cupo gratis de
Gemini: 10 audios por día, y el día normal ya gasta 6, más los útiles, la agenda
de los jueves y los avisos de clima. Si el cupo se acaba, la pieza que sigue no
sale (nunca con otra voz). Con un audio más por día no entra sin poner en riesgo
otras piezas: decidir si sale sin voz (historia y nota) o qué pieza le deja el
lugar.

### 4. El clima de Balcarce un día como hoy

Con los datos históricos de Open-Meteo (desde 1950, reanálisis ERA5: unos 27.700
días, 760 KB) se calcula para cada fecha la máxima más alta, la mínima más baja y
la mayor lluvia. Para el 29/9: máxima 24,9° (2019), mínima 2° (1963), lluvia
37,2 mm (2013). Son **datos de modelo, no de una estación**: la nota dice "según
los datos históricos de Open-Meteo". Se bajan una sola vez y se guardan en el
repositorio. Sirve sola o dentro de la pieza del clima.

### 5. El cielo de hoy

La fase de la luna, la salida y la puesta del sol (ya las trae el pronóstico),
los solsticios y equinoccios y las lluvias de meteoros del mes (Perseidas,
Gemínidas…). Todo se calcula o sale de un calendario fijo: no depende de ninguna
fuente.

## Las que no haría

- **Clickbait.** En un pueblo el que exagera se quema en dos semanas.
- **Publicar lo mismo que los otros.** Si El Diario ya cubrió el acto del
  intendente, nuestra versión no aporta: mejor lo que ellos no llegan a cubrir.
- **Policiales con nombre y apellido.** Además del riesgo legal, en un pueblo
  chico la gente se cruza en la calle.
- **Seguidores comprados.** Se nota, y el algoritmo muestra menos si la gente no
  interactúa.
- **Dos voces en la misma pieza.** El 28/09 se probaron tres versiones (una
  charla, la charla con pausas y "mhm", y un noticiero con dos lectores que se
  turnan las notas: los modos `dialogo`, `dialogo2` y `dialogo3` del workflow
  "Crear voces") y se descartaron: suenan falsas, cada parte se genera sin saber
  qué dijo la anterior, y lo que se agrega para que "converse" no sale de las
  fuentes verificadas. Una voz por pieza, alternadas a lo largo del día, suena
  profesional.

## Lo aburrido que más sirve

1. **Publicar todos los días sin falta**: el clima y la farmacia, aunque no pase
   nada. La constancia hace el hábito.
2. **Contestar los mensajes**, siempre, aunque sea "gracias, lo miramos".
3. **Corregir rápido y a la vista.** Un medio que corrige gana más de lo que
   pierde.
4. **Que el sitio cargue rápido**: no arruinarlo con banners pesados.

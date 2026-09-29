# Ideas para que el medio tenga alcance de verdad

*Actualizado el 29/09/2026.* Ordenadas por lo que más devuelve con menos
trabajo. No son todas buenas; están acá para discutirlas, no para hacerlas
todas. Lo que ya se hizo está al final ("Lo que ya se hizo"); lo que falta
hacer del sistema, en `PENDIENTES.md`.

---

## La tabla general: todas las ideas juntas, de más viable a menos viable

*Armada el 28/09 a pedido de Hernán ("reunificar todas las ideas... genera
una tabla de la más viable a la menos"), para repasarla juntos con calma. Es
un primer orden, no una decisión: junta TODO lo que está más abajo en este
documento (cada fila linkea a su detalle) más dos ideas nuevas de esta noche.
"Viable" acá quiere decir tres cosas a la vez: poco trabajo, no depende de
que un tercero conteste algo, y no hace falta audiencia previa para que
funcione.*

| # | Idea | Qué es, en una línea | Esfuerzo | Por qué acá |
|---|---|---|---|---|
| 1 | **Farmacia por WhatsApp** | Un mensaje automático contesta qué farmacia está de turno | Bajo | Todo el dato ya existe; sólo falta la puerta de WhatsApp |
| 2 | **Lista de WhatsApp para conseguir información** *(nueva, 28/09)* | Un número o lista de difusión donde vecinos mandan datos, fotos o avisos ("se cortó la luz en tal barrio", "hay una obra en tal calle") | Bajo | El buzón (`panel/buzon.mjs`) ya sabe moderar esto; falta sólo la puerta de entrada, igual que "en qué quedó" |
| 3 | **Aviso cuando una fuente deja de traer notas** | El vigilante avisa si un medio no trae nada hace 12 horas | Bajo | Ya existe el vigilante; es sumarle una regla |
| 4 | **Ser buen vecino con los medios** | Guardar el texto ya leído y espaciar los pedidos a la misma fuente | Bajo | Evita que algún día nos bloqueen; es casi gratis |
| 5 | **Estadísticas en el panel** | Ver la evolución de visitas y seguidores sin esperar el WhatsApp | Bajo | El dato ya se guarda (`estadisticas.json`); falta mostrarlo |
| 6 | **Alta en Google Noticias** | Anotar el sitio en Publisher Center | Bajo | Ya están todos los requisitos; es un trámite manual |
| 7 | **"En qué quedó"** | Cargar 3 o 4 promesas concretas del municipio y revisarlas cada 4-6 semanas | Bajo | El tipo `seguimiento` del buzón ya existe; sólo falta cargar la primera ficha |
| 8 | **Efemérides, fechas patrias y "la semana en Balcarce"** | Contenido fijo que llena la portada aunque no pase nada (Fangio, feriados, resumen del domingo) | Bajo-medio | No depende de que nadie más publique nada; se arma una vez y sirve todos los años |
| 9 | **"Lo que abre y lo que cierra"** | Un posteo semanal con comercios nuevos y cerrados | Bajo-medio | Barato, se comparte solo, y es la puerta a vender publicidad |
| 10 | **Historias invitando a la gente a participar** | Encuestas, "contanos tu reclamo u opinión", y de fondo la idea 2: que cualquier vecino pueda avisar un hecho, no sólo opinar | Bajo-medio | La regla de moderación ya existe (nunca de un solo lado, opinión siempre firmada); falta la costumbre de invitar seguido |
| 11 | **Clasificados** (compra-venta, changas, alquileres) | Un aviso que paga el propio vecino, no un espacio por mes | Medio | Complementa la guía comercial sin competir con los avisos fijos |
| 12 | **"Lo que pasó en el Concejo"** | Resumir en 5 líneas las actas que nadie lee | Medio | Requiere leer PDFs administrativos cada sesión, pero nadie más lo hace |
| 13 | **Aprobar notas desde el celular** | Una mini app con Aprobar / Rechazar / Corregir, sin depender de la PC prendida | Medio | Hoy lo amarillo espera a que Hernán esté frente a la PC |
| 14 | **Buscar en todo el archivo** | El buscador hoy sólo busca en la portada del día | Medio | Un índice liviano alcanza; los 180 días de archivo ya existen |
| 15 | **Automovilismo como marca propia** | Una nota semanal sobre pilotos balcarceños en cualquier categoría | Medio | Nicho que nadie cubre, con público asegurado por Fangio |
| 16 | **Página pública de correcciones** | `/correcciones`: qué se corrigió, cuándo y por qué | Medio | Da confianza, y lo piden Google Noticias y AdSense |
| 17 | **Tipografías servidas por el sitio, no por Google Fonts** | Que la web no le muestre la IP de cada lector a Google | Medio | Ya están dos cortes; faltan todos los pesos que pide `layout.js` |
| 18 | **Panel de salud del sistema** | Ver de un vistazo si algo se cayó, sin abrir tres workflows | Medio | El vigilante ya cubre gran parte por WhatsApp; esto es para cuando hace falta mirar en el momento |
| 19 | **Vista previa de lo que el reloj va a publicar** | Ver antes las próximas horas de redes | Medio | Cambia cómo se mira el sistema, no cómo funciona |
| 20 | **Guía comercial y mapa de Balcarce** | El catálogo de venta: mapa + fichas + mejoras pagas | Alto | Lo caro no es el código, es cargar y mantener los datos de cada comercio |
| 21 | **Contenido gratis de gente local** | Músicos, fotógrafos o video makers que cedan material a cambio de crédito | Alto (investigación) | Depende de contactar y convencer a terceros, uno por uno |
| 22 | ~~**Segundo locutor (voz de hombre)**~~ **Hecho el 28/09** | Dos voces propias (locutora y locutor) con un reparto fijo por pieza (`CRITERIO-REDES.md` § 6, regla 76) | — | Queda la idea de ponerles nombre a las dos voces |
| 23 | **Revisar la accesibilidad a fondo** | El resto de lo que quedó pendiente del 25/09 | Medio-alto | Ninguna fecha límite, pero se acumula si no se agenda |
| 24 | **Analítica propia sin cookies** | Más completa que la de Cloudflare | Alto | Es construir un sistema nuevo, no activar uno que ya existe |
| 25 | **Probar los workflows en la máquina (`act`)** | Ver un workflow de GitHub Actions sin subirlo | Medio (técnico) | Ahorra tiempo a futuro, pero no lo nota nadie de afuera |
| 26 | **Historieta / mascota propia** | Un personaje de Balcarce, como los diarios de antes | Alto | Hernán mismo lo puso "para cuando el medio ya tenga lectores" |
| 27 | **Radio online o YouTube 24/7** | Una señal que no se corta nunca, con nuestras piezas | Alto | Pide un servidor aparte y pagar derechos de música; "para después del lanzamiento" |

No está en la tabla la publicidad en sí (avisos, precios, AdSense): eso vive
en `PUBLICIDAD.md`, que ya tiene su propio orden.

---

## Las que yo haría primero

### 1. La farmacia de turno por WhatsApp

Es lo más buscado de Balcarce y lo peor resuelto: hoy hay que entrar a una
web, buscar el día, y leer una tabla. Un mensaje automático de WhatsApp que
conteste "¿qué farmacia está de turno?" con el nombre, la dirección y el
enlace al mapa resuelve eso en tres segundos.

**Por qué importa más de lo que parece:** te deja el número guardado en la
agenda de la gente. Ese es el activo, no la visita a la web.

**Costo:** la API de WhatsApp Business es gratis hasta 1.000 conversaciones
al mes iniciadas por el usuario. Alcanza de sobra para un pueblo.

### 2. Una sección de "lo que pasó en el Concejo"

El Concejo Deliberante publica actas que nadie lee porque están en PDF y en
lenguaje administrativo. Resumirlas en cinco líneas entendibles, cada sesión,
es el tipo de cosa que un medio chico puede hacer mejor que uno grande —
porque no requiere estar ahí, requiere paciencia.

**Por qué:** es información que afecta a todos y que hoy no llega a nadie. Y
es exactamente lo que le da autoridad a un medio nuevo.

### 3. "Lo que abre y lo que cierra"

Un posteo semanal con los comercios que abrieron y los que cerraron en la
semana. Cuesta poco (se ve caminando o preguntando) y **es de lo que más se
comparte** en los grupos de pueblo.

**Además:** es la puerta natural para vender publicidad. El comercio que
recién abre es el que más ganas tiene de que lo conozcan.

### 4. Preguntarle cosas a la gente

Una historia por semana con una pregunta concreta: "¿Qué calle arreglarías
primero?", "¿Volvería el tren a Balcarce?". Se responde con un toque.

**Por qué:** las encuestas son lo que más interacción genera en Instagram, y
la interacción es lo que hace que el algoritmo te muestre. Además da material
para notas propias, que es lo que hoy no tenemos.

**Ampliado el 23/09, a pedido de Hernán:** una historia que invite
directamente a mandar un reclamo o una opinión ("¿hay una calle rota en tu
barrio? Contanos", "¿querés escribir tu opinión? Mandanos un mensaje"), no
sólo una pregunta de sí/no. Lo interesante es que **el sistema para esto ya
existe y ya tiene la regla justa**: el buzón del panel (`panel/buzon.mjs`)
tiene los tipos `reclamo` (nunca se publica de un solo lado: se le pregunta a
la otra parte antes) y `opinion` (siempre con nombre y apellido real, nunca
anónima) — exactamente "con respeto y moderado por nosotros". Lo único que
falta no es la regla, es la puerta de entrada: hoy sólo se carga a mano
cuando algo llega por WhatsApp o en persona (`panel/panel.html`, pestaña
Buzón). El paso más chico para probarlo: una historia semanal que invite a
escribir por DM, y alguien del equipo lo pasa al buzón a mano, como ya se
hace. El paso más grande, para más adelante: un formulario público en la web
que cargue directo al buzón — eso sí es una idea de las que "cambian cómo
funciona algo" y conviene pensarla con calma (moderación de spam, quién
firma, qué se hace público y qué no).

### 5. Una lista de WhatsApp para conseguir información (nueva, 28/09)

La misma puerta de entrada que le falta a la idea 4, pero pensada para
**hechos, no sólo opiniones**: un número (o una lista de difusión) donde
cualquier vecino manda un dato, una foto o un aviso — un corte de luz, una
obra que empezó, algo que vio. Es la fuente que ningún medio de Balcarce
tiene hoy: todos escriben desde lo que ya está publicado en otro lado.

**Por qué ya está casi resuelta:** es el mismo buzón (`panel/buzon.mjs`) con
otro tipo de ficha (un dato o "tip", no un reclamo ni una opinión), así que
la moderación (nunca se publica de un solo lado, se verifica antes de
escribir) ya existe. Falta sólo: el número o la lista, quién la mira todos
los días, y una regla chica de qué tipo de aviso entra al buzón (no todo lo
que llega por WhatsApp es una noticia).

**El riesgo a cuidar:** un tip sin verificar no es una nota. Entra al buzón
como "sin confirmar" y sigue el mismo camino que cualquier nota con una sola
fuente — nunca se publica solo porque alguien lo mandó por WhatsApp.

---

## Las que sirven pero cuestan más

### La guía comercial y el mapa de Balcarce

*Ampliada el 23/09, a pedido de Hernán: no sólo un directorio, un producto
comercial completo. La base de datos ya existe: `COMERCIAL.md`.*

La versión chica (horarios, dirección, teléfono) sigue siendo buena idea y es
**la parte del sitio que se puede cobrar** sin poner un solo banner (La
Vanguardia ya lo hace con "Profesionales" e "Inmobiliarias"). La versión
grande la convierte en el eje de cómo el medio vende:

- **Un mapa de Balcarce** con cada comercio, empresa, restaurante o feria
  cargado (chico o grande, da igual). Técnicamente es una capa más sobre
  Leaflet/MapLibre con OpenStreetMap (gratis, sin depender de la clave de
  Google Maps), alimentada por un JSON simple: nombre, categoría, dirección,
  coordenadas, teléfono, si tiene un aviso activo.
- **Ese mapa es el catálogo de venta, no sólo una guía.** Un comercio se anota
  gratis (nombre, rubro, dirección: eso ya suma valor al sitio) y desde ahí se
  le ofrece subir de nivel: posición destacada en el mapa o en la home,
  mención en los mini podcasts de los reels de noticias (el guion ya suma una
  segunda noticia — bien podría sumar "y en Tal Café, promoción tal", ver
  `redes/elegir.mjs`), o una historia propia.
- **Marketing conjunto y sorteos.** Con la base de comercios cargada, un
  sorteo mensual entre los negocios anotados ("seguí a Radar Balcarce y a
  estos 5 comercios, sorteamos tal cosa") suma seguidores al medio y clientes
  al comercio en el mismo movimiento. Es lo que hace que el primer contacto
  con un comerciante no sea "te vendo un aviso" sino "te sumo gratis a algo
  que ya está andando".
- **Por qué ahora es más fácil que antes:** ya existen los tres espacios
  publicitarios (`web/data/avisos.json`, cargables desde el panel → pestaña
  Avisos, sumada el 23/09) y ya existe el mecanismo de reels-podcast que
  nombra más de una cosa por pieza. El mapa sería el cuarto lugar para
  vender, y el que mejor conecta con "quiero que me encuentren", que es lo
  que un comercio chico busca de verdad.

Lo caro no es el código: es cargar y mantener los datos. Arrancaría con 15 a
20 comercios del centro (los que ya se puedan visitar o llamar en una tarde)
y crecería sólo si alguien lo pide — la misma lógica que ya funciona con
`ingesta/fuentes.mjs`.

#### Cómo se arma en serio

Pensado para empezar chico y que se pueda dejar de hacer sin que rompa nada:

1. **Datos mínimos por comercio:** nombre, rubro, dirección, teléfono,
   horario, y si quiere, WhatsApp e Instagram. Hoy la base vive en
   `comercial/datos/comercios.json`; para la web haría falta un archivo en
   `web/data/` que se edite desde el panel, igual que los avisos.
2. **Cómo cargarlos sin ser una carga eterna:** salir con un formulario de
   papel o un mensaje de WhatsApp de una línea ("nombre, rubro, dirección,
   horario"). El comerciante lo manda, alguien del equipo lo pasa al panel.
   Con 15 a 20 del centro alcanza para probar.
3. **El mapa:** OpenStreetMap con MapLibre o Leaflet (gratis, sin clave). Las
   coordenadas se sacan una vez de la dirección (Nominatim) y se guardan.
4. **Búsqueda por rubro** ("farmacias", "ferreterías", "restaurantes") — es lo
   que la gente busca en Google, y cada rubro es una página que posiciona sola.
5. **Ferias y eventos** en el mismo mapa con fecha, enganchados a la agenda
   que ya existe (`ingesta/agenda.mjs`).
6. **Mejoras pagas:** pin destacado, foto, aparecer primero en el rubro,
   mención en podcasts, historia propia. Lo básico siempre gratis.
7. **Medir para poder vender:** cuántos toques recibe cada ficha (con
   Analytics por página), y mostrárselo al comerciante una vez al mes. Es lo
   que hace que renueve.

### La historieta de Radar: un personaje propio, como los diarios de antes (27/09)

Hernán lo volvió a traer el 27/09: una tira cómica como la que tenían los
diarios viejos, con un personaje inventado por nosotros. Ideas para pensarla:

- **El personaje**: alguien de acá, reconocible sin ser nadie en particular
  (un vecino de toda la vida, un fierrero del autódromo, un productor de papa,
  un perro de la plaza). Nunca una persona real ni una caricatura de alguien
  identificable.
- **De dónde salen los chistes**: de lo que pasa en Balcarce esa semana (el
  corte de luz, la tasa, el TC en el autódromo, el frío). Las tiras clásicas
  sirven de **influencia de estilo** (el humor costumbrista, el remate en el
  último cuadro), pero no se copian chistes ni dibujos ajenos: tienen dueño.
- **Cómo se hace**: la escribe una persona (o Claude, como propuesta que una
  persona aprueba) y la dibuja un dibujante local, o se arma con una IA de
  imágenes con un estilo fijo y siempre el mismo personaje. Una por semana
  alcanza.
- **Dónde va**: una sección fija en la web, un posteo semanal y una historia.
- **Cuándo**: cuando el medio ya tenga lectores. Una mascota sin público es un
  dibujo.

### Radio online o canal de YouTube 24/7 con nuestras noticias (27/09)

Otra idea de Hernán para más adelante: una señal que no se corta nunca, con las
noticias de Radar, los informes propios y, el día de mañana, publicidad.

- **Qué ya tenemos**: las dos voces (locutora y locutor) de los reels y los
  podcasts (CRITERIO-REDES.md), los tres podcasts por día, el clima, la farmacia y la
  agenda. Con eso se puede armar una grilla que se repite y se actualiza sola.
- **Radio online**: un servidor de audio (Icecast, AzuraCast) que pasa en
  bucle los podcasts del día, los avisos y música libre de derechos. Cuesta un
  servidor chico por mes.
- **YouTube 24/7**: un video en vivo permanente con placas (título, clima,
  farmacia) y la voz de fondo. Pide una máquina transmitiendo todo el tiempo
  (un servidor, no la PC de Hernán).
- **Lo que hay que cuidar**: la música tiene que ser libre de derechos o
  pagada (una radio online también paga SADAIC y AADI-CAPIF), y la voz
  sintética tiene que decir que es una voz generada.
- **Cuándo**: después del lanzamiento, cuando haya avisos que la paguen.

### Automovilismo como marca propia

Balcarce es la ciudad de Fangio. Ya sumamos F1 y MotoGP, pero se puede ir más
lejos: una nota semanal sobre **pilotos balcarceños en cualquier categoría**,
por chicos que sean. Es un nicho que nadie cubre y que en este pueblo tiene
público asegurado.

---

## Dos ideas más, sumadas el 23/09

Pedidas explícitamente ("si se te ocurre alguna es la que dan valor").
Comparten algo con las de arriba: usan lo que ya está construido en vez de
pedir algo nuevo.

### Clasificados: compra-venta, changas y alquileres

Es el complemento natural de la guía comercial: mientras esa vende presencia
a un negocio, esto le vende un aviso puntual a una persona (vendo tal cosa,
busco changa de tal oficio, alquilo una pieza). En un pueblo es contenido que
se comparte solo entre vecinos y es una segunda forma de cobrar que no
compite con los tres avisos fijos de la portada — es un aviso que el mismo
lector paga por publicar, no un espacio que se vende por mes. Arrancaría
mínimo: un formulario simple (o directo por WhatsApp, como la idea 1) y una
página nueva en la web, sin nada de pago en línea al principio — se cobra
como se cobre un aviso hoy, a mano.

### "En qué quedó": el tipo `seguimiento` del buzón, en uso de verdad

El buzón (`panel/buzon.mjs`) ya tiene un tipo pensado exactamente para esto —
un compromiso público que se revisa cada 4 a 6 semanas hasta que se cumple o
se confirma que no — pero hoy no hay ninguna ficha cargada ahí. Es la versión
más chica y más creíble de "lo que pasó en el Concejo" (idea 2, más arriba):
en vez de resumir cada sesión, alcanza con cargar 3 o 4 promesas concretas
("asfaltar tal calle", "arreglar tal plaza") y publicar una notita corta cada
vez que se revisa. Es lo que un medio grande no tiene tiempo de sostener y un
medio chico sí — y es gratis: no pide ninguna fuente nueva, sólo usar lo que
ya está armado.

## Cómo ganar plata

Se mudó a [`PUBLICIDAD.md`](PUBLICIDAD.md): el orden para vender (avisos fijos,
menciones en los podcasts, guía y mapa, sorteos, clasificados, contenido
patrocinado, AdSense al final), las reglas que no se negocian y lo que falta
antes de vender (página `/publicidad`, media kit, precios).

## Contenido propio: cosas que no dependen de lo que publican otros

*Nueva, 24/09. Objetivo: que la portada tenga algo nuestro todos los días,
aunque las otras fuentes no publiquen nada. Es lo que hace que nos citen a
nosotros y no al revés.*

Todo esto se apoya en lo que ya funciona: datos públicos o calendarios fijos,
reescritos por la IA con la verificación contra la fuente
(`ingesta/verificar.mjs`) y con la firma "IA" de siempre. Nada se inventa.

**Calendario fijo (se arma una vez y sirve todos los años)**
- **Efemérides de Balcarce y de Fangio.** Fangio nació en Balcarce el 24 de
  junio de 1911 y murió el 17 de julio de 1995: dos fechas seguras para
  arrancar. El resto (fundación, inauguraciones, hechos locales) hay que
  **verificarlo con el Museo Fangio, el Museo Histórico y el Archivo
  Municipal** antes de escribirlo: no se publica una fecha de memoria.
- **"Un día como hoy" con fotos del archivo.** Se comparte mucho y nadie lo
  hace en Balcarce. Las fotos viejas tienen dueño (Museo Histórico Municipal
  "Don Aurelio González" o el Archivo Histórico Municipal): hay que pedirlas.
  Mientras tanto se puede arrancar sin fotos, sólo con el dato y una placa.
- **Fechas patrias y feriados**, con el ángulo local cuando lo hay (qué acto
  hace el municipio, cómo funcionan farmacias y transporte). Las de siempre:
  24/3, 2/4, 1/5, 25/5, 20/6, 9/7, 17/8, 11/9 (Día del Maestro), 12/10, 20/11,
  8/12 y 25/12, más los feriados puente de cada año.
- **Días temáticos que mueven el pueblo:** del Agricultor, del Padre y la
  Madre, del Niño, del Estudiante y la Primavera (21/9), de la Tradición
  (10/11). Cada uno es un posteo o una historia con recomendación local.
- **Un archivo:** `ingesta/efemerides.mjs` con `{ dia, mes, titulo, texto,
  fuente }`, y una regla que cada mañana arma la pieza del día. Es la misma
  idea que `CALENDARIO_ANUAL` de `ingesta/agenda.mjs`.

**Cultura (una pieza por semana, siempre el mismo día)**
- **Película de la semana.** Elegida por criterio editorial (no por lo que
  esté en cartelera, salvo que haya cine local). Sinopsis corta, dónde verla,
  y por qué. Fuentes de datos abiertas y gratuitas: TMDB (con clave gratis)
  o Wikipedia/Wikidata. Enfocar en **cine argentino** le da identidad propia
  y evita competir con las páginas de estrenos. Un ciclo posible: "Cine
  argentino de los jueves".
- **Libro de la semana.** Lo mismo con literatura argentina: aniversarios de
  autores (Borges nació el 24/8/1899, Cortázar el 26/8/1914, Alfonsina Storni
  el 22/5/1892) y el Día del Libro (23/4). **Ojo con los derechos:** de los
  autores fallecidos hace menos de 70 años no se copian fragmentos largos;
  se recomienda, se cuenta de qué trata y, como mucho, una cita corta. Lo que
  sí es de dominio público (Sarmiento, Hernández, etc.) se puede citar más.
- **Música / disco de la semana** y **escritor o artista local** (ver la
  sección de historias con la gente, abajo).

**Datos convertidos en nota (lo que un medio grande no tiene paciencia de
hacer)**
- **"Lo que pasó en el Concejo"** y **"En qué quedó"** (ya están descriptas
  más arriba). Fuente primaria: el Boletín Oficial Municipal.
- **Precios del campo:** hacienda, granos y dólar agro, de fuentes públicas
  (Bolsa de Cereales, Mercado Agroganadero, BCRA). Una tarjeta diaria en la
  portada, muy útil en una zona agrícola.
- **Balcarce en números:** un dato de INDEC o del municipio por semana, con
  un gráfico simple. Es de lo que más se comparte.
- **Cortes programados** (agua, luz, tránsito) tomados del municipio y las
  cooperativas. (Las alertas del clima ya están: ver "Lo que ya se hizo".)
- **La semana en Balcarce:** cada domingo, las 5 notas más leídas y las 3
  cosas que vienen. Es 100% contenido propio armado con lo que ya tenemos, y
  es el mejor candidato a resumen por WhatsApp o mail (escalón 7).

**Guías que quedan para siempre (las que posicionan en Google)**
- "Cómo sacar…" y "Qué hacer si…": trámites municipales, turnos, dónde pagar
  tasas, teléfonos por rubro, horarios de trámites. Se escriben una vez, se
  revisan cada tanto y traen visitas todos los meses sin esfuerzo. Son
  además el mejor lugar para un aviso.

**Con la gente**
- **Historia de reclamos y opiniones**, moderada por nosotros (ya descripta
  en la idea 4). Sale por el buzón, que ya tiene la regla de "nunca de un
  solo lado".
- **"El vecino que…":** una persona o comercio del pueblo por semana, con una
  foto que mandan ellos (nunca la de otro medio). Alimenta la guía comercial.
- **Encuestas de historia** semanales.

**Cómo seguir esto en serio:** son dos frentes distintos. (1) Averiguar qué
fuentes existen (el Museo y el Archivo para las fotos, si el municipio publica
un calendario de efemérides, si hay cartelera de cine local con web o RSS): es
investigación, no toca código ni pide credenciales. (2) Con fuentes reales,
recién ahí decidir el formato (¿historia semanal? ¿parte del podcast?) y
escribir el código, como con cualquier fuente nueva de `ingesta/fuentes.mjs`.
Para la película, falta decidir qué la hace "de Balcarce": la cartelera de un
cine o club de cine local, si existe, o una curaduría editorial.

**Cómo elegir qué hacer primero:** empezar por lo que **no necesita a nadie
más**: efemérides + fechas patrias + la semana en Balcarce + precios del
campo. Son datos fijos o públicos, se verifican solos y llenan la portada sin
depender de que otro medio publique. La película y el libro después, cuando
haya criterio sobre el tono.

## Ideas de sistema, para pensar con calma

Vinieron de `PENDIENTES.md` (25/09). Cambian cómo funciona algo, así que
conviene decidirlas sin apuro.

- **Un panel de salud del sistema**: hoy hay que mirar tres workflows para
  saber si algo falló (el vigilante ya cubre gran parte por WhatsApp).
- **Una vista previa de lo que el reloj va a publicar** en las próximas horas.
- **Analítica propia sin cookies**, más completa que la de Cloudflare.
- **Probar los workflows en la máquina** (`act`).
- **Revisar la accesibilidad** de la web a fondo (el 25/09 se arreglaron el
  contraste de Automovilismo y el nombre del buscador; falta el resto).

## Después de la auditoría (25/09): lo que haría ahora

Ordenadas por lo que rinde contra lo que cuesta. Las tres primeras son las
que más se notan.

1. **Aprobar notas desde el celular (mini app gratis en Cloudflare).** Una
   página con las notas que esperan y tres botones: Aprobar, Rechazar,
   Corregir título. Se instala como app, se entra con un código al mail
   (Cloudflare Access, gratis hasta 50 personas), y lo decidido va a GitHub
   igual que desde el panel. El WhatsApp de "N notas esperando" trae el
   enlace. Hoy las notas amarillas sólo se deciden con la PC prendida.
2. **Buscar en todo el archivo, no sólo en la portada.** El buscador busca
   entre las notas de hoy. Con un índice liviano (título, sección, fecha) que
   se baja sólo cuando alguien escribe, se busca en los 180 días.
3. **Un aviso cuando una fuente deja de traer notas.** El 25/09 El Diario
   Balcarce le contestó 403 a GitHub en una corrida; si pasara siempre, nadie
   se enteraría hasta ver la portada rara. El vigilante puede avisar "tal
   medio no trae nada hace 12 horas".
4. **Ser buen vecino con los medios.** Guardar el texto completo de cada nota
   ya leída (no volver a pedirla en cada corrida) y espaciar los pedidos al
   mismo sitio. Menos riesgo de que un medio nos bloquee.
5. ~~**"Qué dijo cada medio".**~~ **Hecho**: el desplegable cerrado "Fuentes
   (N)" al pie de cada nota, con una línea por medio y su enlace
   (`web/components/verificacion.js`, `web/lib/fuentes-de-la-nota.js`).
6. **Una página pública de correcciones** (`/correcciones`): qué se corrigió,
   cuándo y por qué. Da confianza y lo piden Google Noticias y AdSense.
7. **Tipografías servidas por el propio sitio.** Hoy la web las pide a Google
   Fonts, que ve la IP de cada lector; la política de privacidad promete
   cuidar eso. En `web/fuentes/` están sólo los dos cortes que usan las imágenes
   para compartir (Source Serif 4 900 e Inter 600); para servir el sitio harían
   falta todos los pesos que pide `web/app/layout.js`.
8. **Estadísticas en el panel.** Una pestaña con la evolución de
   `web/data/estadisticas.json` (visitas, seguidores), además del WhatsApp.
9. **Anotar el sitio en Google Noticias** (Publisher Center): ya están
   "Quiénes somos", "Contacto", el sitemap de noticias y todas las notas
   visibles tienen cuerpo. Falta el alta manual (`PENDIENTES.md`).

## Lo que ya se hizo de esta lista

- Los tres avisos fijos de la web, con su pestaña en el panel (23/09).
- Los podcasts de la mañana, la tarde y la noche (24/09) en lugar de noticias
  sueltas, con el enlace de cada nota en el texto y sin nombrar la fuente.
- Los teléfonos útiles rotando de día (23/09).
- El buzón con reglas de moderación (`panel/buzon.mjs`): falta la puerta de
  entrada pública.
- **El clima con alerta** (helada, granizo, viento fuerte, mucha lluvia): los
  avisos de `ingesta/alertas.mjs` salen en el sitio y como historia
  (`avisosDelClima`, `reels/plan.mjs`).
- **Las notas archivadas en el sitemap** (26/09): las páginas de los últimos
  180 días ya se listan y Google puede encontrarlas.
- **La agenda con una página por evento** y una base de contactos para pedir
  fechas (25/09; `docs/09-PANEL.md`).
- **Notas propias sin IA**: el dólar de cada día hábil y una nota por cada
  podcast (25/09; `CRITERIO-EDITORIAL.md` § 8).
- La base de comercios de Balcarce (145, de OpenStreetMap; `COMERCIAL.md`):
  falta el mapa y la guía pública.

## Las que NO haría

**Clickbait.** En un pueblo el que exagera se quema en dos semanas y no
vuelve.

**Publicar lo mismo que los otros tres.** Si El Diario ya cubrió el acto del
intendente, nuestra versión no aporta nada. Mejor cubrir lo que ellos no
llegan a cubrir.

**Policiales con nombre y apellido.** Además del riesgo legal, en un pueblo
chico la gente se cruza en la calle. No vale la pena.

**Crecer con seguidores comprados.** Se nota, y al algoritmo no lo engañás:
te muestra menos si tu gente no interactúa.

---

## Lo aburrido que más sirve

1. **Publicar todos los días sin falta.** El clima y la farmacia, aunque no
   pase nada. La constancia es lo que construye el hábito.
2. **Contestar los mensajes.** Siempre, aunque sea "gracias, lo miramos".
3. **Corregir rápido y a la vista** cuando nos equivoquemos. Un medio que
   corrige gana más de lo que pierde.
4. **Que el sitio cargue rápido.** Ya estamos bien; no lo arruinemos metiendo
   banners pesados.

---

## Sumadas el 28/09, para más adelante (Hernán las pidió, no son prioridad hoy)

- **Hecho el 28/09** (`CRITERIO-REDES.md` § 2 y 6, regla 76): **un segundo locutor, hombre, además de la voz de mujer**.
  En vez de una voz del catálogo de Gemini, se crearon dos voces propias con
  Voice Design (una locutora y un locutor, es-AR) y cada pieza tiene siempre la
  misma, según un reparto fijo. **Falta** sólo lo de ponerles nombre a los dos
  para que se sientan más cercanos, no "la voz de Gemini".
- **Contenido gratis para redes, de gente local o que recién arranca**:
  investigar si hay músicos, fotógrafos o video makers de Balcarce (o
  bancos de música/fotos libres) dispuestos a que usemos su material a
  cambio de crédito y difusión, para no depender sólo de lo que generamos
  por código. Falta investigar a fondo; ver también si cruza con "Las
  fotos" (`CRITERIO-EDITORIAL.md`) para el banco de fotos propio.

# Criterio de las redes de Radar Balcarce

*Actualizado el 29/09/2026.* Este es **el documento único** de todo lo que sale en Instagram y Facebook: cómo
suena la voz, qué dice cada pieza, qué no dice nunca. Hernán y Andrés lo pidieron
así: que cada cosa de las redes tenga su criterio, que cada pieza tenga **siempre la
misma voz** (una locutora o un locutor), que siempre sea "Radar Balcarce" y que la página sea siempre
`radarbalcarce.com`. Lo editorial de las notas (qué se publica, cómo se escribe
una nota) está en [`CRITERIO-EDITORIAL.md`](CRITERIO-EDITORIAL.md); los horarios y
cómo se publica, en [`docs/07-REDES.md`](docs/07-REDES.md).

**Cómo funciona este documento.** El código lo lee y lo respeta (`redes/prompt-redes.mjs`):
la identidad (sección 1) y las instrucciones de voz (sección 6) se leen de acá, sin
copia en el código, y los números (sección 5) los controla una prueba. Si se cambia
algo de las secciones 1, 5 o 6 hay que **reiniciar el panel** (cerrar su ventana y
correr `ARRANCAR.bat`), porque Node carga el código al arrancar. Si este archivo falta
o está roto, todo falla a la vista: `npm test` avisa antes de publicar.

## 1. Quiénes somos, dicho siempre igual

<!-- IDENTIDAD:INICIO -->
Medio: Radar Balcarce
Sitio escrito: radarbalcarce.com
Sitio dicho: Radar Balcarce punto com
<!-- IDENTIDAD:FIN -->

- **El medio se llama siempre "Radar Balcarce"**: con espacio y las dos
  mayúsculas. Nunca "Radar", nunca "RadarBalcarce", nunca "El Radar".
- **La página se escribe siempre `radarbalcarce.com`.** Nunca `.com.ar`, nunca con
  `www`, nunca otra variante.
- **La página, dicha en voz alta, es "Radar Balcarce punto com".** Y termina ahí:
  la última palabra es "com". Nunca "punto ar", nunca "punto a ere", nunca
  ".com.ar". La voz recibe esa orden explícita (sección 6) y una auditoría la comprueba
  (sección 7).
- Para referirse a la página se dice "Radar Balcarce" o su dirección, no "nuestra
  página" a secas.

## 2. La voz

Hay **dos voces propias**, creadas para Radar Balcarce con Voice Design de Gemini 3.8
(idioma `es-AR`): la **locutora** (unos 45 años, serena y pausada) y el **locutor** (unos
40 años, grave y firme). Cada una tiene un identificador fijo que Google guarda en nuestro
proyecto: por eso suena **siempre igual** y no depende de cómo se escriba cada pedido.
**Cada pieza tiene siempre la misma voz** (la tabla de la sección 6) y las voces se
alternan a lo largo del día. Nunca dos voces en una misma pieza: las charlas simuladas se
probaron el 28/09 y sonaban falsas. Nadie elige otra voz ni cambia la velocidad a mano.
Al texto se le suma, aparte, un estilo corto según el momento del día (mañana, tarde o
noche), que sólo cambia el ánimo, no la voz. **No hay voz de respaldo** (28/09, "mejor
nunca Elena"): si Gemini no responde, la pieza no sale en esa vuelta y se vuelve a pedir en la
siguiente, mientras dure su horario. Es preferible una historia que falta a una que
suena a otro medio.

**Cómo suena:** cálida y cercana, rioplatense sin exagerar, tranquila, como quien le
cuenta algo a un vecino. Humana: nunca un noticiero de televisión ni un robot.

### El libro de recursos para sonar humana

Para que no suene a plantilla, cada pieza elige, con una semilla que depende de la
**fecha y de la pieza** (mismo día y misma pieza dan siempre el mismo texto; días
distintos, textos distintos), entre estos recursos:

- **Aperturas variadas:** "Buen día, Balcarce." / "Muy buen día, Balcarce." /
  "Buenas tardes, Balcarce, ¿cómo va el día?". Nunca la misma tres días seguidos por
  costumbre.
- **Conectores entre notas** que no suenen a lista escolar. "Primero…, después…,
  además…, y para cerrar…" es robótico: se alterna con "Para arrancar", "Empezamos
  con esto", "Cambiando de tema", "Por otro lado", "Otra que se comenta", "Y para
  terminar", "Y cerramos con".
- **Pequeñas humanidades:** una observación breve sobre el clima ("Está fresquito
  para salir: lo mejor es taparse", "Un día lindo para caminar") o un cierre cálido
  ("Que tengan un buen día", "A descansar, que mañana seguimos"). Una sola por pieza.
- **Ritmo con la puntuación:** oraciones cortas, comas donde hay que respirar, un
  punto donde hay que parar. Nada de oraciones de tres renglones.
- **Expresiones locales, moderadas:** "salí abrigado", "un mate caliente", "una
  madrugada". Con medida: una por pieza, no un festival.

### Lo que la voz NO hace

- **Nada de "hola"** fuera de la mañana (y en general se usa "buen día", "buenas
  tardes" o "buenas noches", según la hora).
- **Nada de humor en temas serios** (accidentes, emergencias, salud).
- **Nada de exclamaciones exageradas** ni signos de admiración.
- **Nada de "increíble", "impactante", "escándalo"** ni adjetivos de titular.
- **Nada de opinión.** Se cuenta el dato; no se dice si está bien o mal.
- **Nada de "en vivo" ni "minuto a minuto"** si no lo es (y nuestras piezas no lo
  son: son un repaso de lo ya publicado).

## 3. Una ficha por pieza

Cada ficha dice para qué sirve la pieza, cuándo sale, cuánto dura, cómo está armada,
con qué saludo y qué cierre, qué datos lleva y cuáles no, y un ejemplo bueno y uno
malo. Los largos se miden a **2,5 palabras por segundo** (ritmo de locución). Los
horarios son los de fábrica: los cambia el panel (pestaña Calendario), y el saludo
sigue a la hora real: hasta las 12:59 es "buen día", desde las 13 "buenas tardes",
desde las 19 "buenas noches".

**Sobre la dirección dicha.** Los tres podcasts la dicen **siempre**, al cerrar. El
clima, la farmacia y las piezas semanales la dicen **1 de cada 3 días** (lo decide la
fecha, no el azar: sale el mismo día siempre), y los otros dos días cierran sólo con
"Radar Balcarce". Así se nombra la página con frecuencia sin que suene a propaganda.

### Clima de la mañana

- **Objetivo:** que el vecino sepa qué ropa ponerse y si lleva paraguas.
- **Hora:** 7:30. **Largo:** 10 a 20 segundos (unas 25 a 50 palabras; nunca más de 25 s).
- **Estructura:** saludo, temperatura de ahora, un comentario humano según lo que
  haya (frío, helada, calor, lluvia, tormenta, viento o un día lindo), máxima, chances
  de lluvia, cierre cálido y firma.
- **Saludo y cierre:** "Buen día, Balcarce" y un deseo de buen día.
- **Lleva:** temperatura, mínima y máxima, lluvia, viento fuerte si lo hay.
- **No lleva:** la farmacia (tiene su pieza), la fuente de los datos, alertas
  inventadas.
- **Bueno:** "Buen día, Balcarce. Arrancamos con 8 grados. Mañana fría: salí
  abrigado. A la tarde levanta hasta 19, así que el abrigo te va a sobrar. No se
  espera lluvia. Que tengan un buen día. Radar Balcarce."
- **Malo:** "¡Hola! ¡Increíble mañana en Balcarce, en vivo desde Meteored!" (hola,
  exclamaciones, "increíble", "en vivo" y nombra la fuente).

### Clima de la noche

- **Objetivo:** cómo sigue la noche y cómo amanece mañana.
- **Hora:** 20:00. **Largo:** 10 a 20 segundos.
- **Estructura:** saludo, temperatura de ahora, la mínima de la noche (con aviso si
  hay helada), cómo viene mañana, un toque humano, cierre y firma.
- **Saludo y cierre:** "Buenas noches, Balcarce" y un cierre de noche ("Que
  descansen", "A descansar, que mañana seguimos"). **Nunca "buen día".**
- **Lleva:** temperatura, mínima, máxima y lluvia de mañana.
- **No lleva:** datos de la mañana, la fuente.
- **Bueno:** "Buenas noches, Balcarce. En este momento hay 12 grados. Esta noche la
  mínima va a ser de 7. Mañana levanta: máxima de 21 grados. A descansar, que mañana
  seguimos. Radar Balcarce."
- **Malo:** "Buen día, Balcarce. Minuto a minuto: 12 grados." (buen día de noche y
  "minuto a minuto").

### Farmacia de turno

- **Objetivo:** que en la madrugada alguien sepa adónde ir.
- **Hora:** 19:00. **Largo:** 6 a 25 segundos.
- **Estructura:** saludo, cuál es la de turno (con la dirección dicha, sin "N°" ni
  "e/"), un cierre útil y firma.
- **Saludo y cierre:** "Buenas noches, Balcarce"; cierre: "Guardá el dato, que te
  puede salvar una madrugada".
- **Lleva:** nombre y dirección de la o las farmacias de turno.
- **No lleva:** hasta qué hora está abierta (eso va en la web), teléfonos, la fuente
  (el Colegio de Farmacéuticos, La Vanguardia o Radio Gabal no se nombran).
- **Bueno:** "Buenas noches, Balcarce. Si esta noche necesitás una farmacia, la de
  turno es Del Pueblo, en Calle 17 número 1140. Guardá el dato, que te puede salvar
  una madrugada. Radar Balcarce."
- **Malo:** "Según La Vanguardia, la de turno es DEL PUEBLO." (nombra la fuente y
  lee el nombre en mayúsculas).

### Podcast de la mañana

- **Objetivo:** las tres notas para arrancar el día.
- **Hora:** 10:00. **Largo:** 45 a 75 segundos con tres notas (nunca más de 100 s),
  y **el video no pasa de 55 segundos**: cada podcast se sube también como historia y
  Meta acepta 60. Si el guion no cabe, primero se le saca la oración de contexto a las
  últimas notas y después se sacan notas del final (mínimo dos). Ver "Los números".
- **Estructura:** saludo, una línea de entrada, tres notas de temas distintos (cada
  una con su titular y, si el texto es nuestro, una oración de contexto), cierre
  cálido y la dirección dicha.
- **Saludo y cierre:** "Buen día, Balcarce" y un deseo de buen día; termina en
  "Radar Balcarce punto com".
- **Lleva:** titulares ya publicados en la web, con los conectores del libro de
  recursos.
- **No lleva:** Política ni Policiales, nada en rojo, notas propias del sitio, la
  fuente de ninguna nota, ni nombres de víctimas o menores.
- **Bueno:** "Buen día, Balcarce. Esto es lo que hay para saber esta mañana. Para
  arrancar: Ferroviarios ganó el Apertura. Cambiando de tema: Cortan el agua en el
  centro. Y para cerrar: Nueva muestra en el museo. Que tengan un buen día. Todo lo
  demás lo encontrás en Radar Balcarce punto com."
- **Malo:** "Hola, ¡increíble mañana! Primero: Según Infobae… Segundo…" (hola,
  exclamación, nombra el medio de origen y el conector robótico).

### Podcast de la tarde

- **Objetivo:** lo que se fue sumando desde la mañana, con temas distintos.
- **Hora:** 15:00. **Largo:** 45 a 75 segundos con tres notas.
- **Estructura:** la misma que la de la mañana, sin repetir notas ni temas.
- **Saludo y cierre:** "Buenas tardes, Balcarce" y un deseo de tarde; termina en la
  dirección. **Nunca "buen día".**
- **Lleva y no lleva:** lo mismo que la mañana.
- **Bueno:** "Buenas tardes, Balcarce. Repasamos lo que fue pasando hoy. Lo primero:
  … Por otro lado: … Y cerramos con: … Que tengan una linda tarde. Seguimos en
  Radar Balcarce punto com."
- **Malo:** "Buen día, Balcarce…" a las 15.

### Podcast de la noche

- **Objetivo:** el repaso de lo más fuerte del día, para cerrarlo.
- **Hora:** 20:30. **Largo:** hasta 55 segundos de video (la historia acepta 60):
  cuatro notas si caben; si no, se saca el contexto y después notas, hasta un mínimo
  de dos. El 25/09 salieron cuatro con contexto, 153 palabras y 62,7 s, y su historia
  no salió en ninguna red.
- **Estructura:** saludo con el día de la semana, cuatro notas (o tres o dos si no caben),
  cierre de noche y la dirección dicha.
- **Saludo y cierre:** "Buenas noches, Balcarce" y "Que descansen" o "hasta mañana";
  termina en la dirección.
- **Lleva y no lleva:** lo mismo que la mañana; además, tono más pausado.
- **Bueno:** "Buenas noches, Balcarce. Este es el repaso de este viernes. Para
  arrancar: … Y para terminar: … A descansar, que mañana seguimos. Radar Balcarce
  punto com."
- **Malo:** cerrar con "¡Hasta mañana, gente!" y "punto com punto ar".

### Posteo de una nota en Facebook (y su espejo en Instagram)

- **Objetivo:** que el vecino entre a la nota, en nuestra página.
- **Hora:** cuando hay una nota fuerte (ver `docs/07-REDES.md`). **Largo:** el texto para
  redes tiene un máximo de 280 caracteres (`PARTES.textoRedes`).
- **Estructura:** el texto para redes (o el titular y la bajada), una línea con el
  enlace a nuestra nota (`radarbalcarce.com/nota/…`) que va cambiando de frase, y
  hasta tres hashtags.
- **Lleva:** el enlace a **nuestra** nota, `#Balcarce` si es local.
- **No lleva:** la fuente, "Resumen hecho con IA" (quién escribió la nota se dice
  en la nota), "en vivo", `.com.ar`, "punto com" escrito (en un texto se escribe la
  dirección; "punto com" es sólo para la voz).
- **Bueno:** "Ferroviarios ganó el Apertura y va por la final.\n\nToda la nota acá:
  https://radarbalcarce.com/nota/ferroviarios-gano-abc\n\n#Balcarce #Fútbol"
- **Malo:** "Ferroviarios ganó (Resumen hecho con IA). Fuente: Puntonueve.
  https://puntonueve.com/…"

### Semanales: teléfonos útiles

- **Objetivo:** que tengan a mano los números que sirven.
- **Hora:** 11:00, un día distinto de lunes a viernes. **Largo:** 8 a 20 segundos.
- **Estructura:** saludo, qué números son, un cierre ("Guardalos ahora, que después
  te olvidás") y dónde están todos (el audio no lee los números).
- **Saludo y cierre:** el de su hora (a las 11, "buen día").
- **Lleva:** las categorías (emergencias, hospital, comisaría, municipio).
- **No lleva:** "esta semana" ni "una vez por semana": son siempre los mismos
  teléfonos.
- **Bueno:** "Buen día, Balcarce. Te dejamos los teléfonos que sirve tener a mano.
  Están los de emergencias, el hospital, la comisaría y el municipio. Tenelos a
  mano, que nunca se sabe. Los encontrás todos en la web de Radar Balcarce.
  Radar Balcarce."
- **Malo:** "Los teléfonos de esta semana…" (los números no cambian).

### Semanales: la agenda del jueves

- **Objetivo:** contar qué se puede hacer en Balcarce estos días.
- **Hora:** jueves 18:00, si hay eventos cargados. **Largo:** 6 a 25 segundos.
- **Estructura:** saludo, cuántas actividades hay, la primera con día y lugar, dónde
  está la agenda completa, firma.
- **Saludo y cierre:** el de su hora ("buenas tardes").
- **Lleva:** la primera actividad, con su día y su lugar.
- **No lleva:** actividades sin confirmar, ni la fuente.
- **Bueno:** "Buenas tardes, Balcarce. Hay 3 actividades en Balcarce estos días. La
  feria de artesanos, el sábado 10:00, en el Parque Cerro El Triunfo. La agenda
  completa está en Radar Balcarce punto com. Radar Balcarce."
- **Malo:** "En la agenda del municipio, según el Facebook de Cultura…".

## 4. Lo que TODA pieza respeta

1. **Nombra sólo "Radar Balcarce".** Nunca otro nombre para el medio.
2. **Nunca nombra la fuente del texto** (Infobae, Clarín, La Vanguardia, Puntonueve,
   Radio Gabal ni ningún otro medio): la atribución está en la nota de la web.
3. **Nunca "en vivo" ni "minuto a minuto"** si no lo es.
4. **Nada de Política ni Policiales** en las piezas automáticas: los decide una
   persona.
5. **Nunca identifica a un menor ni a una víctima.**
6. **Nunca dice "Resumen hecho con IA".** La firma de la nota está en la nota.
7. **La dirección escrita es `radarbalcarce.com`;** dicha en voz alta es "Radar
   Balcarce punto com" y termina ahí. Nunca `.com.ar`, "punto ar" ni "punto a ere".
8. **El saludo es el de la hora:** "buen día" sólo de mañana, "buenas tardes" de
   tarde, "buenas noches" de noche. Ningún "buen día" fuera de la mañana.
9. **Sin exclamaciones, sin "increíble", sin opinión, sin humor en lo serio.**
10. **Mismo día y misma pieza dan el mismo texto** (así se puede probar), y días
    distintos suenan distinto.

## 5. Los números

El código los toma de `ingesta/criterio.mjs` (la columna "Clave" dice cuál) y
`pruebas/redes-criterio.test.mjs` controla que esta tabla diga lo mismo, fila por
fila: **si se cambia un número, se cambia en los dos lados.**

<!-- NUMEROS_REDES:INICIO -->
| Qué | Número | Clave |
|---|---|---|
| Ritmo de locución (palabras por segundo) | 2.5 | `VOZ.palabrasPorSegundo` |
| Podcasts: dicen la dirección al cerrar (1 = siempre) | 1 | `VOZ.direccionEnPodcasts` |
| Clima, farmacia y semanales: dicen la dirección 1 de cada N días | 3 | `VOZ.direccionUnaDeCada` |
| Clima: segundos como mínimo | 8 | `CLIMA_VOZ.segundosMinimo` |
| Clima: segundos como máximo (se apunta a 10 a 20) | 25 | `CLIMA_VOZ.segundosMaximo` |
| Podcast: segundos como mínimo | 20 | `PODCAST_VOZ.segundosMinimo` |
| Podcast: segundos como máximo (se apunta a 45 a 75) | 100 | `PODCAST_VOZ.segundosMaximo` |
| Podcast: ritmo real de la voz (palabras por segundo; salieron 2,3 a 2,6) | 2.4 | `PODCAST_VOZ.palabrasPorSegundo` |
| Podcast: segundos que el video suma a la voz (entrada y cola) | 1.65 | `PODCAST_VOZ.segundosDeAdorno` |
| Podcast: presupuesto de duración al escribirlo (segundos) | 55 | `PODCAST_VOZ.segundosPresupuesto` |
| Podcast: corte de seguridad de la historia (segundos; el máximo de Meta es 60) | 58 | `PODCAST_VOZ.segundosMaximoHistoria` |
| Farmacia y semanales: segundos como mínimo | 6 | `PIEZA_FIJA_VOZ.segundosMinimo` |
| Farmacia y semanales: segundos como máximo | 25 | `PIEZA_FIJA_VOZ.segundosMaximo` |
| Posteo: hashtags como máximo | 3 | `POSTEO.hashtagsMaximo` |
<!-- NUMEROS_REDES:FIN -->

**Cómo se usan los cuatro números de la duración** (`redes/elegir.mjs`,
`repasoConPresupuesto`; `reels/duracion.mjs`): la duración estimada de un podcast es
`palabras / ritmo + adorno`. Si pasa de 55, se le saca el contexto a las notas de la
última a la primera y después notas del final (nunca menos de dos). El podcast dice
en el posteo sólo las notas que quedaron. Si el video ya armado igual pasa de 58
(se mide con ffmpeg), las historias suben una copia cortada en 58 con fundido de
salida (`podcast-historia.mp4`) y el reel sube entero. Con el guion del 25/09 a la
noche: 153 palabras y ~65 s estimados antes; 112 palabras y ~48 s ahora, con las
cuatro notas y el contexto sólo de las dos primeras.

## 6. Las voces y cómo se les habla

Esto es **lo que lee el código** (`redes/prompt-redes.mjs`): las dos voces, quién dice cada
pieza y el estilo. No hay copia. Un cambio se hace acá, y se reinicia el panel.

Con el modelo `gemini-3.8-flash-tts` y su Interactions API, el texto se lee **literal** y el
estilo va en un campo aparte, corto y en inglés (es lo que mejor entiende el modelo). Ya no
hay indicaciones largas que la voz pueda leer en voz alta: el 28/09, con el modelo y el
formato anteriores, el podcast leyó las indicaciones y duró 140 s en vez de 35. El saludo
de cada momento sale del guion (`redes/guiones.mjs`), no del estilo.

<!-- VOZ:INICIO -->

Las voces. Cada identificador lo guarda Google en nuestro proyecto y **vence al año de
crearse (29/09/2027)**: hay que crear las voces de nuevo antes (`docs/11-OPERACION.md`).

La locutora (creada el 29/09/2026):

<!-- VOZ:LOCUTORA:INICIO -->
voice_v8mf7jt16hch
<!-- VOZ:LOCUTORA:FIN -->

El locutor (creado el 29/09/2026):

<!-- VOZ:LOCUTOR:INICIO -->
voice_cdljkn0jpmk6
<!-- VOZ:LOCUTOR:FIN -->

Quién dice cada pieza (siempre la misma; los nombres son los de `redes/piezas.mjs`, y `aviso`
vale para todos los avisos de clima):

<!-- VOZ:REPARTO:INICIO -->
clima-manana: locutora
noticia1: locutor
noticia2: locutora
farmacia: locutor
clima-noche: locutora
podcast: locutor
utiles: locutor
agenda: locutora
aviso: locutor
<!-- VOZ:REPARTO:FIN -->

El estilo base:

<!-- VOZ:BASE:INICIO -->
Calm, confident and warm, at a steady natural pace, like a local radio announcer from Buenos Aires province, Argentina.
<!-- VOZ:BASE:FIN -->

Para la mañana:

<!-- VOZ:MANANA:INICIO -->
It is the morning: fresh, with calm energy.
<!-- VOZ:MANANA:FIN -->

Para la tarde:

<!-- VOZ:TARDE:INICIO -->
It is the afternoon: even and warm, unhurried.
<!-- VOZ:TARDE:FIN -->

Para la noche:

<!-- VOZ:NOCHE:INICIO -->
It is the night: slower, lower and calm, closing the day.
<!-- VOZ:NOCHE:FIN -->

<!-- VOZ:FIN -->

## 7. La auditoría de voz

Como nadie puede "escuchar" todo lo que sale, hay una auditoría automática:
`reels/auditar-voz.mjs`, que se corre a mano desde GitHub (Actions → "Auditar voz"
→ Run workflow). Genera con la **misma ruta de producción** unos clips cortos con
la voz (cierres de los podcasts de mañana, tarde y noche, un clima de la noche y
varias frases con la dirección), le pide a Gemini la **transcripción literal** y
comprueba: que se oiga "Radar Balcarce"; que si el texto dice "punto com" la voz
diga "punto com" y **nunca** "punto ar" ni ".com.ar"; y que el saludo sea el de la
hora y ningún otro. Imprime un cuadro PASA/FALLA por clip y sale con error si alguno
falla. Cuesta centavos (unos pocos audios cortos), así que **no se corre en lazo**: se
corre a mano cuando se toca la voz. Si la voz insiste en agregar ".ar" aunque el texto diga
"punto com", la dirección se deja fuera de lo que se dice (poniendo `VOZ.direccionEnPodcasts`
y `VOZ.direccionUnaDeCada` en 0) y las piezas cierran sólo con "Radar Balcarce".

# Ideas para que el medio tenga alcance de verdad

Ordenadas por lo que más devuelve con menos trabajo. No son todas buenas;
están acá para discutirlas, no para hacerlas todas.

---

## Las cinco que yo haría primero

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

### 4. El clima con alerta

Hoy publicamos el clima dos veces por día. Lo que falta es lo que de verdad
importa en una zona agrícola: **avisar cuando viene algo.** Granizo, helada,
viento fuerte, lluvia de más de 30 mm.

El pronóstico ya lo tenemos. Es agregar una regla: si mañana hay más de 80%
de lluvia o la mínima baja de 0°, sale una historia de alerta fuera de
horario.

**Por qué:** una helada anunciada a tiempo le ahorra plata a un productor.
Eso te lo recuerdan para siempre.

### 5. Preguntarle cosas a la gente

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

---

## Las que sirven pero cuestan más

### La guía comercial y el mapa de Balcarce

*Ampliada el 23/09, a pedido de Hernán: no sólo un directorio, un producto
comercial completo.*

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

### Efemérides, fechas patrias y contenido que se repite todos los años

*Ampliada el 23/09.* Tres ideas juntas porque resuelven el mismo problema: un
día sin noticia fuerte, la portada y las redes igual necesitan algo. Y son
contenido "de siempre": se arma una vez por tema y vuelve a servir cada año.

- **"Un día como hoy" con fotos del archivo.** Se comparte mucho y no compite
  con nadie porque nadie lo hace en Balcarce. **El problema sigue siendo el
  mismo:** las fotos viejas tienen dueño — Museo Histórico Municipal "Don
  Aurelio González" o el Archivo Histórico Municipal. Una llamada, pero hay
  que hacerla; mientras no esté, se puede arrancar sin fotos, sólo con el
  dato ("un 15 de octubre de 1944 nació Fangio acá") y una placa propia.
- **Fechas patrias y feriados**, con el ángulo de Balcarce cuando lo hay (el
  25 de mayo o el 9 de julio son iguales en todo el país, pero "qué actividad
  hace el municipio" sí es propio y ya se saca de la misma agenda que
  alimenta `ingesta/agenda.mjs`). Se arma un calendario fijo (como
  `CALENDARIO_ANUAL` en `ingesta/agenda.mjs`, que ya existe para otra cosa)
  con las fechas del año y qué se dice cada una, y se reutiliza siempre.
- **Una película por semana.** Más simple de sostener que las dos anteriores
  porque no depende de conseguir un dato local: una recomendación corta,
  fija los mismos días, sin IA inventando la reseña (se resume una sinopsis
  ya publicada, como el resto de las notas). Punto a decidir: qué la hace
  "de Balcarce" — ¿la cartelera real de algún cine/club de cine local si
  existe, o una curaduría editorial sin pretensión de ser local? Es una
  decisión editorial, no técnica.

**Cómo seguir esto en serio:** son ideas para dos frentes de trabajo
distintos, y conviene separarlos. (1) Reportar qué fuentes existen para cada
una — el Museo/Archivo para las fotos, si el municipio publica un calendario
de efemérides propio, si hay una cartelera de cine local con web o RSS — es
una tarea de investigación que no toca código y se puede encargar aparte,
sin login ni credenciales de por medio. (2) Una vez que haya fuentes reales,
recién ahí se decide el formato (¿historia semanal? ¿parte del podcast?) y se
escribe el código, igual que se hizo con cualquier fuente nueva en
`ingesta/fuentes.mjs`.

### La mascota / las viñetas

Lo mencionaste al principio. Sigue siendo una buena idea de identidad, pero
necesita que Gemini deje generar imágenes (requiere billing activado) y que
alguien defina el personaje. **Lo dejaría para cuando el medio ya tenga
lectores**: una mascota sin público es un dibujo.

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

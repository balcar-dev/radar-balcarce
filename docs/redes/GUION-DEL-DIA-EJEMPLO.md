# Un día completo de guiones, con la línea editorial (ejemplo del 17/10/2026)

*Escrito el 18/10/2026 (regla 301). Es el guion de UN día armado con los datos reales de `web/data/portada.json` del 17/10 (las notas de ese
día, el clima, la farmacia de turno y la efeméride de Einstein), con el plan de verdad (`reels/plan.mjs`) y la línea editorial del día
(`redes/linea-del-dia.mjs`). No se llamó a Gemini, no se pidió ninguna voz y no se gastó cupo: son sólo los textos que diría cada pieza.
Para rehacerlo con los datos de hoy: `node reels/guion-del-dia.mjs --md=docs/redes/GUION-DEL-DIA-EJEMPLO.md` (no cuesta nada).*

**Qué se simuló.** Para mostrar el "Ayer te contamos…" se armó el día como si ayer hubiera cerrado con un repaso de tres notas de esa portada (el libro de
redes real, `web/data/redes.json`, trae esos datos cuando el día es de verdad). Lo demás es lo que armaría el plan a las 6 de la mañana. Los teléfonos
útiles, la agenda y Participá se pidieron a propósito para verlos (no salen todos los días); los útiles quedan fuera del techo de historias del día, como pasaría.

## La estructura que comparten todas las piezas

1. **Gancho (3 segundos, 8 palabras o menos).** El saludo de la franja y, si ya se saludó hace poco, una frase de continuidad propia del momento del día
   en lugar del puente genérico de antes ("Una más para ustedes").
2. **Cuerpo.** Lo propio de cada pieza. No se toca.
3. **Enlace hacia lo que viene.** Sólo si esa pieza está en el plan de hoy y no salió: dice cuál es y a qué hora ("Recordá que a las nueve de la noche
   cerramos con el repaso del día").
4. **Lo ya contado, sin repetirlo.** Se retoma el *tema* de un repaso ("lo de la agenda cultural"), que sale de la sección de sus notas, nunca el titular.
   "Ayer te contamos…" abre el repaso de la mañana.
5. **Cierre.** El deseo de la franja y el **llamado del día**: la misma frase en todas las piezas de la fecha, y ese día todas dicen la dirección o ninguna.

Los capítulos del día y sus frases fijas por momento (la fecha sólo elige la variante, nunca cambia el sentido):

| Momento | Pieza | Gancho de continuidad (cuando ya se saludó) | Hacia lo que viene |
|---|---|---|---|
| 7:00 | Clima de la mañana | el saludo de la mañana | "A las diez, el repaso de la mañana." |
| 9:00 | Un día como hoy / el feriado | "Con el clima visto, vamos a la historia." | "A las diez, el repaso de la mañana." |
| 10:00 | Repaso de la mañana | el saludo (a las 10 ya pasaron más de dos horas y media) | "Más tarde, a las tres, otro repaso." |
| 12:00 | Participá, la agenda | "Un alto: esto es para vos." | "A las tres, el repaso de la tarde." |
| 15:00 | Repaso de la tarde | "Retomamos lo que contamos a la mañana." (en su entrada) | "Recordá que a las nueve de la noche cerramos con el repaso del día." |
| 17:00 | Teléfonos útiles (sábados) | "Ahora te toca a vos." (o "Un alto: esto es para vos.") | "A las siete de la noche, la farmacia de turno." |
| 19:00 | Farmacia de turno | el saludo de la noche | retoma el tema del último repaso ("Seguí lo de la agenda cultural en la web.") |
| 20:00 | Clima de la noche | "Ahora, cómo sigue la noche." | "A las nueve de la noche cerramos el día con el último repaso." |
| 21:00 | Repaso del día | "Ya casi cerramos el día." | "Mañana seguimos desde temprano." |

**Lo que no se suma si no cabe.** Cada frase nueva se pesa contra el tope de su pieza (el repaso, 55 segundos; el clima y la farmacia, 25; un día como
hoy, 45): si no entra, se prueba otra variante más corta y, si ninguna entra, no se suma. Por eso en el 17/10 el repaso de la noche no dice "Hoy ya te
contamos…" (ya está en los 55 s) y la farmacia retoma pero no anuncia (está en los 25).

## Revisado a ojo (18/10)

- **Bien:** cada pieza se apoya en la anterior sin repetirla; las horas que se anuncian son las de piezas que están en el plan; el llamado es el mismo
  en las historias y la efeméride y los repasos usan su variante propia; no hay tuteo ni exclamaciones; los repasos quedan en 54 y 55 segundos.
- **Del cuerpo, no de la línea (queda anotado):** el repaso de la noche cuenta dos veces la Subsecretaría de Deporte y corta "sala Dr." (la oración de
  contexto de esa nota se corta en la abreviatura "Dr."); es de la selección y del corte de oraciones de `redes/elegir.mjs`, que toca el otro agente.
- **A mejorar cuando se prenda la voz paga:** el límite de 25 segundos del clima y la farmacia deja poco aire a la línea (la farmacia con dos de turno ya
  ocupa los 25). Si Hernán lo aprueba, se puede subir a 30 en `ingesta/criterio.mjs` y en la tabla de `CRITERIO-REDES.md` § 5.

---

## El día, pieza por pieza

### 07:00 · El clima de la mañana (historia) · la locutora · 20 s de 25

> Buen día, Balcarce, ¿cómo arrancó la mañana? Ahora hay 11 grados. Está fresquito para salir: lo mejor es taparse. Hoy la máxima llega a 11. No hay lluvia en el pronóstico. Y a las diez, las noticias para arrancar. Que el día les sea leve. Te lo contó Radar Balcarce.

**gancho** (7 palabras): Buen día, Balcarce, ¿cómo arrancó la mañana? · **la línea hizo**: adelante (anuncia El repaso de la mañana) · **llamado**: Te lo contó Radar Balcarce.

### 09:00 · Un día como hoy (reel y historia) · la locutora · 35 s de 45

> Con el clima visto, vamos a la historia. Un día como hoy, en 1933, Albert Einstein llegó a los Estados Unidos, escapando de la Alemania nazi. Allí vivió el resto de su vida. Y además, un día como hoy: en 1905 se sancionó la Ley Láinez, que creó escuelas primarias nacionales en las provincias; en 1920 nació la actriz Zully Moreno; y en 1930 abrió la Línea B del subte de Buenos Aires. A las diez, el repaso de la mañana. Un día como hoy, en Radar Balcarce.

**gancho** (8 palabras): Con el clima visto, vamos a la historia. · **la línea hizo**: gancho, adelante (anuncia El repaso de la mañana) · **llamado**: Un día como hoy, en Radar Balcarce.

### 10:00 · El repaso de la mañana (reel y historia) · el locutor · 55 s de 55

> Buen día, Balcarce, ¿cómo arrancó la mañana? Te cuento lo más importante para arrancar el día. Ayer te contamos lo del país y lo de la economía. Arrancamos por acá: El Festival Cervantino de Azul cumple 20 años con más de 50 actividades. También: Dibu Martínez sufre un fuerte golpe en la cabeza y sale en camilla. El arquero argentino chocó con un rival durante el encuentro entre Chelsea y Everton por la Premier League. Sigamos con esto: Ciudadanos italianos tienen plazo hasta noviembre para votar en el COMITES. Y cerramos con: Santiago Gilligan busca sumar sus primeros minutos en la Serie A de Italia. Más tarde, a las tres, otro repaso. Que el día les sea leve. Todo con más detalle en Radar Balcarce punto com.

**gancho** (7 palabras): Buen día, Balcarce, ¿cómo arrancó la mañana? · **la línea hizo**: adelante, retoma (anuncia El repaso de la tarde) · **llamado**: Todo con más detalle en Radar Balcarce punto com.

### 12:00 · Participá · noticias (reel y historia) · la locutora · 17 s de 25

> Un alto: esto es para vos. ¿Viste algo que tendría que ser noticia? Mandanos la foto o el dato. Escribinos por WhatsApp o por mail: los datos están en pantalla. A las tres, el repaso de la tarde. Te lo contó Radar Balcarce.

**gancho** (6 palabras): Un alto: esto es para vos. · **la línea hizo**: gancho, adelante, llamado (anuncia El repaso de la tarde) · **llamado**: Te lo contó Radar Balcarce.

### 15:00 · El repaso de la tarde (reel y historia) · la locutora · 54 s de 55

> Buenas tardes, Balcarce, ¿cómo viene la tarde? Retomamos lo que contamos a la mañana. Arrancamos por acá: El Museo Histórico Municipal expone el Proyecto Cruz del Centenario. El arquitecto Rubén Kavanagh encabezó una charla sobre patrimonio e identidad en el Museo Histórico Municipal. También: La Dirección de Juventud firma un acuerdo para vender entradas online. El Teatro Municipal contará con una nueva plataforma de venta de localidades a partir de 2027. Sigamos con esto: Jennifer Lasa gana en el campeonato argentino de powerlifting. Y cerramos con: El INTA Balcarce participa de una investigación global sobre suelo. Recordá que a las nueve de la noche cerramos con el repaso del día. Que se les haga liviana la tarde. Todo con más detalle en Radar Balcarce punto com.

**gancho** (7 palabras): Buenas tardes, Balcarce, ¿cómo viene la tarde? · **la línea hizo**: adelante (anuncia El repaso del día) · **llamado**: Todo con más detalle en Radar Balcarce punto com.

### 17:00 · Los teléfonos útiles (reel y historia) · el locutor · 15 s de 25 · **no sale hoy** (pasa el techo de historias del día)

> Buenas tardes, Balcarce. Anotá los teléfonos que conviene tener a mano. Están los de emergencias, el hospital, la comisaría y el municipio. Compartilos con quien los pueda necesitar. Los encontrás todos en la web de Radar Balcarce.

**gancho** (3 palabras): Buenas tardes, Balcarce. · **llamado**: Los encontrás todos en la web de Radar Balcarce.

### 19:00 · La farmacia de turno (historia) · el locutor · 25 s de 25

> Buenas noches, Balcarce, ¿cómo estuvo el día? Si esta noche necesitás una farmacia, hay dos de turno: Benites, en Av. Chaves número 329 entre 5 y 7, y también Freitas, en Av. Kelly número 840 entre 23 y 25. Guardá el dato, que te puede salvar una madrugada. Seguí lo de la agenda cultural en la web. Te lo contó Radar Balcarce.

**gancho** (7 palabras): Buenas noches, Balcarce, ¿cómo estuvo el día? · **la línea hizo**: retoma · **llamado**: Te lo contó Radar Balcarce.

### 20:00 · El clima de la noche (historia) · la locutora · 23 s de 25

> Ahora, cómo sigue la noche. En este momento hay 11 grados. Para la madrugada se esperan 6 grados. Mañana se repite más o menos el día: hasta 12. Buen momento para un mate caliente. A las nueve de la noche cerramos el día con el último repaso. Que tengan un lindo descanso. Te lo contó Radar Balcarce.

**gancho** (5 palabras): Ahora, cómo sigue la noche. · **la línea hizo**: gancho, adelante (anuncia El repaso del día) · **llamado**: Te lo contó Radar Balcarce.

### 21:00 · El repaso del día (reel y historia) · el locutor · 55 s de 55

> Ya casi cerramos el día. Repasamos lo que dejó este sábado. Para arrancar: La Subsecretaría de Deporte mantiene las clases de yoga con vacantes. La Subsecretaría de Deporte anunció que siguen las clases de yoga dictadas por Vilma Suárez en la sala Dr. Otra que se comenta: La organización designa los árbitros para la primera fecha del torneo. Se confirmaron los jueces que dirigirán los encuentros de la jornada inicial del certamen. También: Docentes y estatales bonaerenses discuten una nueva oferta salarial. La Provincia retoma las negociaciones el viernes tras rechazar la primera propuesta del 1,5%. Por último: Una vecina dona un riñón a su hija y transitan la recuperación. Mañana seguimos desde temprano. Que tengan un lindo descanso. Todo con más detalle en Radar Balcarce punto com.

**gancho** (5 palabras): Ya casi cerramos el día. · **la línea hizo**: gancho, despedida · **llamado**: Todo con más detalle en Radar Balcarce punto com.


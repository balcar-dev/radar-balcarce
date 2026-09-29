# Variantes de los criterios (29/09/2026)

*Foto del día: la medición de las reglas de la IA y las opciones para las redes. Lo que
se decidió quedó en `CRITERIO-EDITORIAL.md`; lo que falta decidir, en `PENDIENTES.md`.*

## 1. El criterio editorial: tres variantes medidas

**Cómo se midió.** Con `reels/comparar-instruccion.mjs`: las mismas notas reales (las que
esperaban cuerpo y las últimas de la portada), el mismo pedido a Gemini, el mismo
verificador de producción y los mismos reintentos. Cambia sólo el texto de las reglas.
Cada variante cambia **una sola cosa**, como recomendaba la prueba anterior (A16: la
versión condensada rendía peor). Se cuenta cuántas notas terminan con un cuerpo que pasa
el verificador, y por qué se rechazan las otras.

**Las variantes:**

- **Contra la copia:** la regla 1 dice el límite con número ("nunca más de diez palabras
  seguidas iguales a una fuente, tampoco en una cita"; el verificador rechaza desde 13)
  y cómo evitarlo (cambiar el orden y el verbo, partir la oración larga). Antes decía
  "una frase textual corta" sin número.
- **Datos primero:** antes de escribir, la IA anota en un campo "datos" (que no se
  publica) los datos que va a usar y de qué fuente sale cada uno.
- **Repaso final:** una lista corta de lo que más se rechaza, para revisar antes de
  devolver.
- **Las dos primeras juntas.**

**Resultados** (notas con cuerpo, de las pedidas):

| Vuelta | Notas | Actual | Contra la copia | Datos primero | Repaso final | Las dos juntas |
|---|---|---|---|---|---|---|
| 1 | 24 (muchas difíciles) | 8 | 15 | 16 | 11 | — |
| 2 | 24 (otras) | 13 | 15 | 15 | — | **18** |
| 3 | 30 (sobre todo ya escritas por la actual) | 21 | — | — | — | 20 |

Los rechazos por **copiar** (el problema más común): en la vuelta 2, 12 con la actual y 4
con las dos juntas; en la vuelta 3, 14 y 10. La vuelta 3 tomó notas que la actual ya había
escrito bien en producción, así que era la más fácil para ella: ahí empataron.

**Qué se aplicó (29/09):** las dos juntas, en `CRITERIO-EDITORIAL.md` § 12. No cambia el
criterio (el verificador ya rechazaba las copias largas): cambia cómo se le explica a la
IA. Las notas salen igual de largas (unas 107 palabras) y con títulos de unos 64
caracteres. Hay que mirar unos días en el registro de "Actualizar la web" cuántas sacan
cuerpo ("reescritura: N pedidas, M con cuerpo").

**Qué no conviene:** acortar la instrucción (A16) ni el "repaso final" (rindió menos que
las otras dos).

## 2. El criterio de las redes: opciones para decidir

Acá no se puede medir con la voz: el cupo gratis es de 10 audios por día y el día normal
usa 6. Tampoco hay estadísticas de Meta todavía (falta el permiso `read_insights`,
`PENDIENTES.md`). Así que se comparan los guiones, con las notas de hoy.

### El repaso de la mañana del 29/09, de cuatro maneras

**Actual** (unos 46 segundos): "Buen día, Balcarce. Esto es lo que hay para saber esta
mañana. Empezamos con esto: La Cooperativa de Electricidad anuncia un corte de luz para el
miércoles. Por otro lado: Omar Martínez termina cuarto en el autódromo Juan Manuel Fangio.
A los 60 años, el histórico piloto compitió en la fecha de las TC Pick Up en el circuito
serrano. Y para cerrar: Realizan la fiscalización mensual de artesanos en la Casa del
Bicentenario. La evaluación para feriantes locales será el jueves de 10 a 12 en el espacio
de avenida Favaloro. Que tengan un buen día. Todo con más detalle en Radar Balcarce punto
com."

**A. El titular fuerte primero** (unos 26 segundos): "La Cooperativa de Electricidad
anuncia un corte de luz para el miércoles. Buen día, Balcarce: esto y dos cosas más.
También: Omar Martínez termina cuarto en el autódromo Juan Manuel Fangio. Y además:
Realizan la fiscalización mensual de artesanos en la Casa del Bicentenario. Que tengan un
buen día. Todo con más detalle en Radar Balcarce punto com."

**B. Corto, dos notas** (unos 15 segundos): "Buen día, Balcarce. Primero: La Cooperativa
de Electricidad anuncia un corte de luz para el miércoles. Y: Omar Martínez termina cuarto
en el autódromo Juan Manuel Fangio. Todo en Radar Balcarce punto com."

**C. Una sola nota, la más útil** (unos 22 segundos): "Buen día, Balcarce. La Cooperativa
de Electricidad anuncia un corte de luz para el miércoles. El servicio eléctrico se
interrumpirá el miércoles 30 de septiembre entre las 7:30 y las 13 horas por tareas de
mantenimiento en líneas de baja tensión. La nota completa, en Radar Balcarce punto com."

### Qué recomiendo

- **Probar la A en los tres repasos.** En los reels, lo que decide si alguien se queda
  son los primeros dos segundos: hoy se van en "Buen día, Balcarce. Esto es lo que hay
  para saber esta mañana". Con la A, lo primero que se oye es la noticia, y el video dura
  la mitad (más gente lo mira entero). Se pierde la oración de contexto de cada nota, que
  igual está en la web. No gasta más cupo.
- **La C para el día que hay algo muy útil** (un corte de luz, de agua, un cambio de
  tránsito): en lugar del repaso de la mañana, no además, para no gastar cupo.
- **La B, no:** es demasiado flaca para una pieza de marca.
- **Cómo decidir con números:** con el permiso de estadísticas, alternar la actual y la A
  un día cada una durante dos semanas y comparar reproducciones completas y alcance.

### Otras ideas para las redes, sin voz extra

- **Hashtags**: `#Balcarce` más uno de la sección durante dos semanas, y comparar.
- **La foto de la nota en el reel del repaso**, cuando la nota tiene foto propia del banco
  (hoy los videos llevan placa).
- **Las efemérides** ("Un día como hoy"): son otra pieza con voz; con el cupo gratis de
  10, sólo entran si se saca otra o si se usa una clave paga.

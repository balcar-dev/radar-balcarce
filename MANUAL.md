# Cómo funciona Radar Balcarce

Este archivo explica el criterio: cómo se eligen las noticias, cómo se
puntúan, qué sale solo, qué espera aprobación y qué no sale nunca. Es el
documento para leer antes de tocar `ingesta/fuentes.mjs`, que es donde se
ajusta todo.

Los otros archivos: `NOTAS.md` (estado del proyecto y qué falta),
`INVESTIGACION.md` (lo legal, con fuentes).

---

## 1. El recorrido de una noticia

```
19 fuentes  →  agrupar  →  clasificar  →  puntuar  →  semáforo  →  panel  →  web / reels
```

1. **Buscar.** Cada 10 minutos el panel lee las 19 fuentes (10 locales,
   Sendero Regional, 7 nacionales). La mayoría tiene RSS; El Diario Balcarce
   no, así que se raspa la portada y después se entra a cada nota para sacar
   la bajada y la hora de publicación de sus metadatos.
2. **Agrupar.** Si dos medios cuentan lo mismo, es UNA historia con dos
   fuentes, no dos notas. Se comparan los títulos por similitud (Jaccard,
   umbral 0,55). Que varios medios la tengan es señal de que importa, y suma
   puntos.
3. **Clasificar.** Por palabras clave, en este orden: Automovilismo, Deportes,
   Cultura, Agro, Política, Servicios, Tecnología. El orden importa: una nota
   de un piloto local es Automovilismo, no Deportes.
4. **Puntuar.** Un número de 0 a 100 (abajo, sección 2).
5. **Semáforo.** Verde / amarillo / rojo (sección 3).
6. **Decidir.** En el panel (localhost:4321). Lo verde sale solo; lo amarillo
   espera; lo rojo está bloqueado.
7. **Publicar.** `npm run datos` arma `web/data/portada.json` y la web lo lee.
   Los reels y las historias salen del mismo material.

## 2. El puntaje

Arranca en el **peso de la fuente** (del 15 al 30: los medios locales pesan
más que los nacionales) y suma:

| Qué | Cuánto |
|---|---|
| Es de Balcarce | +25 |
| Salió hace menos de 3 h | +25 |
| Entre 3 y 12 h | +15 |
| Entre 12 y 24 h | +8 |
| Un medio nacional la nombra a Balcarce | +22 |
| Cada medio extra que la cuenta | +10 |
| Es de Automovilismo | +8 |
| Es de Servicios | +6 |
| Tiene foto en la fuente | +6 |
| Trae texto completo | +4 |

Techo: 100. **Sin hora real no se premia la frescura**: si la fuente no
publicó cuándo salió, se la trata como de hace 24 h. No puede competir con
una que sí tiene hora.

Para qué sirve el número:

- **Ordena la portada**, junto con la fecha.
- **Decide qué llega a reel**: hace falta 78 o más. Son 3 reels por día como
  máximo (10:00, 15:00, 20:30). El clima y la farmacia van como **historias**,
  así no gastan cupo de reels con lo que se repite todos los días.

## 3. El semáforo

Se evalúa sobre el título más los primeros 600 caracteres del cuerpo.

**🔴 Rojo — no se publica nunca.** No es criterio editorial, es la ley:
identificar a un menor en un hecho policial o judicial (ley 26.061) o a una
víctima de violencia de género o de un delito sexual (ley 26.485) es ilegal
para un medio. Palabras: menor de edad, abuso sexual, suicidio, violación,
violencia de género, femicidio, grooming, abuso infantil. Detalle en
`INVESTIGACION.md` § 6.

**🟡 Amarillo — espera que alguien apruebe.** Todo lo que puede traer un
problema si sale mal escrito: concejo deliberante, intendente, denuncia,
gremio, paro, protesta, reclamo, detenido, acusado, imputado, hospital,
muerte, investigación. También lo que **parece promoción y no noticia**
(sorteo, "ganá tu entrada", "participá del", auspicia): no se bloquea, pero
nunca sale solo.

**🟢 Verde — sale automático.** Comunicados oficiales del municipio, y las
secciones Servicios, Cultura y agenda, Deportes, Automovilismo y Agro.
Cualquier otra cosa cae en amarillo por defecto.

**⚫ Archivada.** A las 72 horas, lo que quedó sin decidir se archiva solo.
Está en la pestaña Archivadas del panel, no se pierde, pero deja de tapar la
cola.

## 4. Qué NO se publica, más allá del semáforo

- **La foto del medio de origen, nunca.** La excepción de "noticias de interés
  general" de la ley 11.723 cubre el texto, no las fotografías. En su lugar va
  una placa tipográfica propia con el color de la sección.
- **El nombre de la fuente en el reel, la placa o la voz.** La atribución va en
  la nota de la web, con el enlace al original.
- **Una acusación como hecho.** Si hay una denuncia sin condena, se atribuye a
  quien la hizo y se usa el condicional ("habría", no "hizo"). Es la doctrina
  Campillay, y es lo que protege a un medio de una demanda por calumnias e
  injurias.

## 5. Cómo escribe el editor

El prompt completo está en `reels/reescritura.mjs` y se lee tal cual en el
panel, pestaña "Cómo escribe la IA". Lo central:

- Nunca copia el texto original; lo reescribe.
- Título de hasta 65 caracteres, sin signos de admiración.
- Copete de dos líneas como mucho: qué pasó, dónde y cuándo.
- **Tono: español rioplatense neutro y tranquilo, en tercera persona, sin
  voseo ni modismos.** No es un amigo contando algo, es un medio informando.
  Ni solemne ni canchero, sin "tremendo" ni "impresionante".
- El guion de voz cuenta el hecho en 25 a 40 palabras, en voz de locutor de
  radio, con los números en palabras.
- No inventa un dato que no esté en el original.

Los títulos que los medios publican EN MAYÚSCULAS se pasan a mayúscula
inicial, cuidando los nombres propios con la lista `NOMBRES_PROPIOS` de
`fuentes.mjs`. **Si un título aparece mal escrito, la palabra se agrega a esa
lista** y se arregla para siempre.

## 6. El diseño de la web

Criterio: portal de noticias, no diario solemne. Fondo blanco, Fraunces en
los títulos, color por sección, y movimiento sólo en las dos piezas que se
miran todos los días.

- **Chapa negra de arriba**: fecha, clima y farmacia de turno, en *todas* las
  páginas. Son las dos cosas que la gente viene a buscar sin querer leer nada.
- **Navegación por secciones reales**, cada una con su página
  (`/seccion/deportes`). Sólo aparecen las que hoy tienen notas: una pestaña
  que lleva a una página vacía es peor que no tenerla.
- **Agenda y Balcarce Útil** van a la derecha y en verde: son servicios, no
  secciones. Agenda es su propia página (`/agenda`), no un ancla — antes,
  desde una nota, el botón te devolvía a la portada.
- **Tarjeta del clima**: dibujo propio en SVG que cambia según el pronóstico
  (sol que gira, nube que flota, gotas que caen), con los cuatro días
  siguientes. Quien pidió menos movimiento en su sistema operativo no ve nada
  de eso (`prefers-reduced-motion`).
- **Farmacia de turno**: nombre, dirección, teléfono y "Cómo llegar" a Google
  Maps.
- **La placa de sección** reemplaza a la foto (ver § 4).

El lienzo de diseño (portada de escritorio, de celular y la tarjeta del clima)
está publicado como artefacto; si se cambia el aspecto, se cambia en los dos
lados para que no se separen.

## 7. Las pruebas

Se corren con `npm test` desde la carpeta del proyecto. Son 62, tardan un
cuarto de segundo, no instalan nada y no salen a internet.

**Cada una es un error que ya pasó de verdad**, no un ejercicio: dos
farmacias de turno mostradas como una sola, un sol dibujado un domingo
nublado, el encabezado del mes pegado al nombre de la última farmacia, los
enlaces de El Diario apuntando a `undefined/…`. Están en `pruebas/` y cada
una explica arriba qué error cuida.

También corren solas en GitHub Actions **antes** de publicar. Si algo se
rompió, la web se queda como está: es preferible una portada de hace media
hora a una con los datos mal armados.

Al agregar una regla nueva —una palabra en `REGLAS_SECCION`, una farmacia en
`FARMACIAS_A_MANO`— no hace falta escribir una prueba. Cuando se arregla algo
que estuvo mal publicado, sí: es la única forma de que no vuelva.

## 8. Lo que todavía falla

- **La clasificación se equivoca.** Un proyecto de una escuela primaria salió
  en Deportes; noticias de fútbol peruano entran por las fuentes nacionales.
  Se ajusta agregando o sacando palabras en `REGLAS_SECCION`.
- **Hay notas sin hora**, las que vienen de fuentes que no la publican. La web
  dice "sin hora" en vez de inventar un "hace 1 minuto".
- **Los textos automáticos son el resumen del medio original, no una
  reescritura.** La reescritura con IA existe y funciona, pero hoy se dispara
  a mano desde el panel. Que corra sola para todo lo verde es el próximo paso.

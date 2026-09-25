# Cómo funciona Radar Balcarce

Este archivo explica el criterio: cómo se eligen las noticias, cómo se
puntúan, qué sale solo, qué espera aprobación y qué no sale nunca. Es el
documento para leer antes de tocar `ingesta/fuentes.mjs`, que es donde se
ajusta todo.

Los otros documentos: `REGLAS.md` (lo que se exige siempre y qué lo vigila),
`EDITORIAL.md` (cómo se escribe una nota), `REDES.md`, `INFRAESTRUCTURA.md`,
`PENDIENTES.md` (qué falta) e `INVESTIGACION.md`
(lo legal, con fuentes). La lista completa está en `CLAUDE.md`.

---

## 1. El recorrido de una noticia

```
45 fuentes  →  agrupar  →  clasificar  →  puntuar  →  semáforo  →  panel  →  web / reels
```

1. **Buscar.** Cada 30 minutos GitHub Actions lee las 45 fuentes (locales,
   regionales y nacionales; la lista está en `ingesta/fuentes.mjs`), con la PC
   apagada; el panel, mientras está prendido, también busca cada 10. La mayoría tiene RSS; El Diario Balcarce
   no, así que se raspa la portada y después se entra a cada nota para sacar
   la bajada y la hora de publicación de sus metadatos.
   **De afuera entra poco y a propósito.** Desde el 25/09 hay doce fuentes de
   la región y la provincia (0223, LU9, QZ, El Eco de Tandil, Ecos Diarios,
   Lobería, Ayacucho, la Agencia DIB, La Noticia 1, Diputados bonaerenses, el
   Gobierno de la Provincia y Argenpapa). De casi todas entra sólo lo que
   nombra a Balcarce (`PALABRAS_LOCALES`), a una figura (`FIGURAS`) o toca la
   zona sin nombrarla: la ruta 226, la 55, el sudeste o el cultivo de papa
   (`PALABRAS_ZONA`, en `ingesta/fuentes.mjs`). Pesan poco para no ganarle a lo
   local, y lo de afuera que nombra a Balcarce va a la sección Balcarce.
2. **Agrupar.** Si dos medios cuentan lo mismo, es UNA historia con dos
   fuentes, no dos notas. Se comparan los títulos por similitud (Jaccard,
   umbral 0,55). Que varios medios la tengan es señal de que importa, y suma
   puntos.
3. **Clasificar.** Por palabras clave, en este orden: Automovilismo, Deportes,
   Cultura, Agro, Política, Servicios, Tecnología. El orden importa: una nota
   de un piloto local es Automovilismo, no Deportes.
4. **Puntuar.** Un número de 0 a 100 (abajo, sección 2).
5. **Semáforo.** Verde / amarillo / rojo (sección 3).
6. **Decidir.** En el panel (localhost:4321, `PANEL.md`). Lo verde sale solo; lo
   amarillo espera; lo rojo está bloqueado.
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
- **Decide qué se cuenta en las redes.** Facebook pide relevancia de 75 o
  más; los podcasts, 62 o más. Ya no salen noticias sueltas: son **tres
  podcasts por día** (mañana, tarde y noche) con notas de temas distintos.
  Política y Policiales no se arman solas en ninguna pieza. El clima y la
  farmacia van como **historias**. Horarios y reglas completas en `REDES.md`.

## 3. El semáforo

Se evalúa sobre el título, el comienzo del resumen y, desde el 25/09, el texto completo de la nota original y lo que escribe la IA.

**🔴 Rojo — no se publica nunca.** No es criterio editorial, es la ley:
identificar a un menor en un hecho policial o judicial (ley 26.061) o a una
víctima de violencia de género o de un delito sexual (ley 26.485) es ilegal
para un medio. Palabras: menor de edad, abuso sexual, suicidio, violación,
violencia de género, femicidio, grooming, abuso infantil, y desde el 25/09 más frases (la lista completa está en `REGLAS_SEMAFORO`). Detalle en
`INVESTIGACION.md` § 6.

**🟡 Amarillo — espera que alguien apruebe.** Lo que acusa (denuncia,
detenido, acusado, imputado), lo que habla de una muerte y lo que involucra a
un chico. También lo que **parece promoción y no noticia** (sorteo, "ganá tu
entrada", "participá del", auspicia): no se bloquea, pero nunca sale solo. Y
lo de afuera con poco puntaje o fuera del cupo de su sección.

**🟢 Verde — sale automático.** Los comunicados oficiales del municipio y todo
lo demás en diez de las once secciones (todas menos País). Política y
Policiales salen solas en la web si el semáforo da verde, pero en las redes
siempre esperan a una persona.

La lista completa y actual está en `REGLAS_SEMAFORO` (`ingesta/fuentes.mjs`).
Desde el 25/09 el semáforo lee también el texto completo de la fuente y lo
que escribió la IA. Detalle en `EDITORIAL.md`.

**⚫ Archivada.** A las 72 horas, lo que quedó sin decidir se archiva solo
(menos las notas sin fecha real).
Está en la pestaña Archivadas del panel, no se pierde, pero deja de tapar la
cola. (Eso lo hace el panel. Aparte, desde el 25/09 la portada de la web
muestra sólo lo de las últimas 72 horas, aunque la PC esté apagada.)

## 4. Qué NO se publica, más allá del semáforo

- **La foto del medio de origen, nunca.** La excepción de "noticias de interés
  general" de la ley 11.723 cubre el texto, no las fotografías. En su lugar va
  una placa tipográfica propia con el color de la sección.
- **El nombre de la fuente en el reel, la placa, la voz ni el posteo de las
  redes.** La atribución va en la nota de la web, con el enlace al original;
  las redes enlazan a **nuestra** nota.
- **Una acusación como hecho.** Si hay una denuncia sin condena, se atribuye a
  quien la hizo y se usa el condicional ("habría", no "hizo"). Es la doctrina
  Campillay, y es lo que protege a un medio de una demanda por calumnias e
  injurias.

## 5. Cómo escribe el editor

Está en [`EDITORIAL.md`](EDITORIAL.md): las tres partes de una nota (título,
copete y cuerpo), los dos tonos y cómo se controla lo que escribe la IA.

## 6. El diseño de la web

Criterio: portal de noticias, no diario solemne. Fondo blanco, Fraunces en
los títulos, color por sección, y movimiento sólo en las dos piezas que se
miran todos los días.

- **Reglas de la portada** (`REGLAS.md`): sin la fuente arriba de los títulos,
  sin "la vimos hace…", con las notas de la más nueva a la más vieja (la nota
  grande de arriba es la de más puntaje y de Balcarce) y la farmacia sin hora
  de cierre. Hay pruebas y el vigilante las mira en la web publicada.
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

Se corren con `npm test` desde la carpeta del proyecto. Son más de 700, tardan
unos segundos, no instalan nada y no salen a internet.

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

## 8. Las redes

Qué se publica en Facebook e Instagram, a qué hora y con qué reglas está en
[`REDES.md`](REDES.md).

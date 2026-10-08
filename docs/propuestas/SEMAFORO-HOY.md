# El semáforo, tal como funciona hoy

*8/10/2026. Sólo describe lo que hace el código hoy; no propone cambios (los huecos conocidos están al final y en
[`MEJORAS.md`](MEJORAS.md), puntos C-10 y C-12). La lista roja no se toca sin que Hernán y Andrés lo decidan.*

## En una frase

Cada nota que entra recibe un color: **verde** (puede salir sola), **amarillo** (espera a una persona) o **rojo**
(no sale). Lo decide una lista de palabras y frases, más unas pocas reglas de contexto. El color se calcula en la
ingesta, se vuelve a mirar cuando la IA escribe la nota, y se vuelve a mirar al armar el archivo. Si una persona decide
algo desde el celular, esa decisión manda, con una sola excepción (las listas de sepelios).

## Qué hace cada color

| Color | Qué pasa | Dónde se ve |
|---|---|---|
| **Verde** | Sale sola, siempre que además tenga cuerpo de 70 palabras o más, no sea un hecho de más de 12 horas que nunca había salido, y no la haya retirado una persona. | La web, y las redes si corresponde |
| **Amarillo** | No sale. Espera en la pestaña "Esperan" del celular, con el motivo ("necesita ojo humano: «detenido»") y lo que contó cada medio. Una persona la publica, la escribe a mano o la descarta. | Celular |
| **Rojo** | No sale. **No aparece** en la lista de "Esperan" del celular, así que desde ahí no se puede aprobar. Queda "bloqueada". | Sólo en el panel de la PC, y de ahí **sí** se puede aprobar (ver "Huecos") |

## Cómo se calcula el color (en orden)

Lo hace la función `semaforo()` de `ingesta/ingesta.mjs`, una vez por nota en cada ingesta (cada media hora). Mira el
**título y los primeros 600 caracteres del resumen**. Compara sin tildes y sin mayúsculas, por palabra entera (las
palabras de cinco letras o más admiten hasta tres letras de más al final, para plurales: "denuncia" encuentra
"denuncias", pero "murió" no encuentra "murieron").

1. **Rojo por tema sensible** (`REGLAS_SEMAFORO.rojo`): "menor de edad", "abuso sexual", "suicid…", "se quitó la vida",
   "violación", "violencia de género", "femicidio", "abuso infantil", "grooming", "agresión sexual", "pornografía
   infantil", "explotación sexual", "red de trata", "violada", "violador", "estupro", y variantes. Es la lista que cuida
   las leyes 26.061 (menores) y 26.485 (violencia de género). **Si encuentra una, la nota es roja y no se sigue mirando.**
2. **Rojo por "nunca"** (`REGLAS_SEMAFORO.nunca`): "sepelio", "sepelios", "inhumación". Sólo en el título. Son las listas de
   sepelios de la Cooperativa: no se publican nunca, ni aprobadas por una persona (decisión del 27/09).
3. **Amarillo por tema delicado** (`REGLAS_SEMAFORO.amarillo`): "denuncia", "detenido", "acusado", "imputado", "homicidio",
   "asesinato", "cadáver", "víctima", "apuñalado", "baleado", "adolescente", "niño", "niña", "nene", "nena", "un menor de",
   "un bebé", "recién nacido", "alumno de", "abusado", y variantes.
4. **Amarillo por muerte o heridos** (`amarilloMuerte`): "muerte", "falleció", "murió", "muere", "deceso", "velatorio",
   "herido", "lesionado". **Sólo frena donde la muerte puede ser de alguien de acá**: Policiales, Balcarce, lo de la zona,
   o lo que cuenta un solo medio (`laMuerteFrena`). Un homenaje a un artista famoso contado por muchos medios no espera.
5. **Amarillo por cotización del dólar** (sólo el título): "dólar hoy", "dólar blue", etc. No es una nota; está en /dolar.
6. **Amarillo por internacional** (sólo el título, y sólo si no nombra a Balcarce): "Trump", "Putin", "Ucrania", "Gaza",
   "California", etc.
7. **Amarillo por promoción**: "sorteo", "ganá tu entrada", "suscribite", "publicidad", etc. No es noticia nuestra.
8. **Verde por ser oficial**: si la fuente es un organismo oficial y no tropezó con nada de arriba, es verde.
9. **Amarillo si es de afuera y poco contada**: lo que no es de acá sale sola sólo si lo cuentan suficientes medios
   (Fútbol y Deportes 4; Economía, Tecnología, Agro y Automovilismo 2; el resto 3; con una figura argentina, 2). Con menos,
   queda amarilla "de afuera y poco contada".
10. **Verde** si nada de lo anterior frenó.

### Lo que se afloja para lo de Balcarce (2/10, pedido de Hernán)

Para lo que es "de acá" (`esDeAca`: toca la zona, lo cuenta un medio de Balcarce o dice Balcarce en el título):

- "denuncia" / "denunció" **suelto** no frena (un reclamo vecinal no acusa a nadie). En Política, una denuncia contada por
  un solo medio sigue esperando.
- "detenido", "acusado", "imputado" no frenan **si** los confirma una fuente oficial o los cuentan dos medios o más.
- Siguen frenando como antes: "homicidio", "víctima", "cadáver", "baleado", todo lo de chicos, todas las muertes y,
  por supuesto, todo lo rojo.

### Policiales de afuera

Un policial que no es de un medio de acá, no dice Balcarce en el título y no toca la zona **ni siquiera se trae**
(`esPolicialDeAfuera`). Lo de la zona (la 226, la 55) sí entra, con el mismo semáforo.

## Las otras veces que se vuelve a mirar

1. **Cuando la IA escribe la nota** (`semaforoDeLaReescritura`, `reels/reescritura.mjs`). Pasa por el semáforo: el texto
   completo de la fuente, lo que contaron los otros medios, y lo que escribió la IA (título, bajada, texto para redes y
   cuerpo). El título, la bajada y el texto para redes pasan por **todo** el semáforo; lo largo (la fuente entera, el
   cuerpo) sólo por el rojo y por lo de **menores y víctimas** (para no frenar una nota buena porque el tercer párrafo diga
   "detenido"). Si una nota verde sale sensible, **deja de ser verde** en ese momento: pasa a amarilla o roja y no se
   publica sola.
2. **Al armar el archivo** (`generar-datos.mjs`). Cada nota ya archivada se compara con el semáforo de hoy y con las
   decisiones de ahora: si pasó a rojo (o a amarillo sin que una persona la haya aprobado), pierde su página
   (`pierdeLaPagina`). Las listas de sepelios pierden la página siempre.
3. **La agenda de eventos** (`agenda.mjs`): lo rojo en el nombre saca el evento; lo rojo en la descripción saca sólo la
   descripción.
4. **Las pistas del panel** (`pistas.mjs`): una pista que toca la lista roja se rechaza antes de guardarse; desde el 8/10
   también la que junta una persona (nene, chica, adolescente, bebé…) con una edad menor de 18.

## Qué manda cuando una persona decide

`decisionHumana`: sólo cuenta lo que decidió una persona (lo que guarda la máquina es una foto de un semáforo viejo).

- Una persona que **aprueba** una amarilla: sale.
- Una persona que **descarta** o **retira**: no sale, y aunque el semáforo diga verde no vuelve.
- Una persona que **aprueba** algo **rojo**: hoy sale (el celular no muestra las rojas, pero el panel de la PC acepta la
  aprobación). Es el punto C-10 de `MEJORAS.md`.
- Las listas de sepelios no salen **nunca**, ni aprobadas (`nuncaSePublica`).
- "Publicar" en el celular (pestañas Esperan y Sin cuerpo): hay que confirmar una pregunta ("¿Publicarla? La IA la escribe…
  Sí, publicarla"); la IA escribe la nota, el verificador la controla contra las fuentes y, si no encuentra problemas, sale
  en la próxima actualización **sin que nadie lea el texto**. Si el verificador marca algo, se la muestra a la persona.
  Es el punto C-19 de `MEJORAS.md`.

## En las redes

- **Política y Policiales nunca salen solas** a Facebook ni a Instagram: sólo si una persona las marca en el celular
  ("También a Facebook e Instagram"). En los repasos (podcasts), nunca.
- Una nota roja no va a ningún lado, y una nota que espera cuerpo tampoco (`redes/elegir.mjs`).
- Los videos y las historias que cuentan varias notas no se arman si alguna es de las que esperan a una persona
  (`notas-propias.js`).

## Huecos conocidos (no corregidos, esperan decisión)

Probados el 8/10 con frases inventadas y la función real (`semaforoDelTexto`); estas salen **verdes** hoy (C-12 de `MEJORAS.md`):

- "Un joven intentó **suicidarse**": verde (comprobado el 8/10). La lista tiene "suicid", pero la búsqueda sólo admite tres letras de más y "suicidarse" tiene cuatro; "se suicidó" sí frena.
- "Investigan **abusos sexuales** en un club", "Detienen a un hombre por **feminicidio**", "**Violaron a** una mujer".
- "**Murieron** dos jóvenes en un choque en la 226", "Hallaron **muerta** a una mujer": las formas del verbo no están.
- "Una **chica de 16 años** fue golpeada": **la edad no está en ninguna lista** (las pistas del panel sí la miran desde el
  8/10, las notas no).
- En lo de Balcarce, "denuncia" ya no frena ni en Policiales: "Una vecina denunció que abusaron de su hija" sale sola si
  viene de un medio local (comprobado el 8/10: "abusaron" solo no está en ninguna lista).
- Al juntar dos notas del mismo hecho gana la verde sobre la amarilla, y una historia mira sólo el título de la principal.

No se encontró ningún caso publicado todavía. Nada de esto se tocó.

## Qué habría que decidir (para repasar juntos)

1. ¿Se suman las edades de menores y las formas que faltan del verbo? (Es tocar la lista roja y la amarilla.)
2. ¿Lo rojo pasa a funcionar como los sepelios (nunca, ni aprobado)?
3. ¿"Publicar" en el celular muestra el texto antes de publicar cuando la nota es delicada, o se deja como está?
4. ¿Al juntar notas del mismo hecho el grupo hereda el peor color?

# Investigación de la competencia

*Reemplaza a `INVESTIGACION-NACIONALES.md` e `INVESTIGACION-PORTALES.md`
(fusionados el 25/09/2026; el detalle de cada tabla se conserva acá). Estado
revisado el 25/09/2026 contra el código.*

Marcas: **HECHO** (está en el código o en la web), **PENDIENTE** (falta o está
a medias), **DESCARTADO** (se decidió no hacerlo).

Lo relevado es lo que los otros medios **ofrecen**, no lo que **se usa**:
ninguno publica sus números. Cuando la analítica propia tenga un par de meses
de tráfico, varias conclusiones se van a poder confirmar o tirar.

## 1. Los tres medios de Balcarce (revisado el 18/09/2026)

| | El Diario | Punto Nueve | La Vanguardia |
|---|---|---|---|
| Peso de la portada | 256 KB | 370 KB | 55 KB |
| Publicidad | Google AdSense | Google Ads | Sin avisos |
| Clima | Sí | No | Sí |
| Farmacia de turno | Sí | Sí | Sí |
| Video | Sí | Sí (En Vivo) | No |
| Agenda de eventos | No | No | No |

Secciones que tienen los tres: Balcarce, Policiales, Deportes, Automovilismo,
Agro/Rural, Actualidad. **La Vanguardia** es el único que monetiza sin
banners (Edictos, Inmobiliarias, Profesionales, Infocampo): ver
`PUBLICIDAD.md`.

### Los huecos que nadie llenaba

| Hueco | Estado |
|---|---|
| **Agenda de eventos** (calendario que se actualiza solo desde la API del municipio) | **HECHO** (`ingesta/agenda.mjs`, página `/agenda`) |
| **Automovilismo que no sea local** (F1, MotoGP) | **HECHO**: se sumó Motorsport.com en castellano |
| **Deportes que no son fútbol** | **HECHO** en parte: se sumó La Nación · Deportes. Sigue pendiente cubrir a los deportistas balcarceños en cualquier disciplina |
| **Tecnología e IA** como identidad propia | **HECHO**: hay sección Tecnología y sale sola. **PENDIENTE**: un beat propio de IA/agro-tech |
| **Velocidad** (portada estática, sin banners) | **HECHO**, y hay que cuidarla: se pierde el día que se meta publicidad mal (`PUBLICIDAD.md`) |
| **Automovilismo con marca propia** (pilotos balcarceños en cualquier categoría) | **PENDIENTE** (`IDEAS.md`) |

### Dónde no podemos competir todavía

Periodistas en la calle: Punto Nueve transmite en vivo y El Diario cubre el
Concejo Deliberante. Hoy resumimos lo que ellos averiguan. Mientras sea así,
citar y enlazar la fuente no es sólo legal: es lo que sostiene la relación en
un pueblo donde todos se conocen. (Ojo: en las **redes** no se nombra la
fuente y se enlaza a nuestra nota; la atribución vive en la nota de la web.
Ver `REGLAS.md`.)

## 2. Qué ofrecen los portales locales

Cinco medios, relevados el 20/09/2026: los tres de Balcarce y dos de Mar del
Plata (La Capital, 0223).

| | El Diario | Punto Nueve | La Vanguardia | La Capital | 0223 |
|---|:---:|:---:|:---:|:---:|:---:|
| Farmacia de turno | Sí | Sí | Sí | Sí | Sí |
| WhatsApp | Sí | Sí | Sí | Sí | Sí |
| Video en vivo | Sí | Sí | Sí | Sí | Sí |
| Clima | Sí | No | Sí | Sí | Sí |
| Fúnebres | Sí | No | No | Sí | Sí |
| Clasificados | Sí | No | Sí | Sí | No |
| Agenda de eventos | Sí | No | No | Sí | Sí |
| Buscador | Sí | No | No | No | Sí |
| Newsletter | No | No | Sí | No | Sí |
| Encuestas | No | No | No | No | Sí |
| Edictos | No | No | Sí | No | No |
| Publicidad | Sí | Sí | No | Sí | Sí |
| Peso de la portada | 254 KB | 368 KB | 55 KB | 224 KB | 1.542 KB |

Cada punto, con su estado:

| Punto | Conclusión de la investigación | Estado |
|---|---|---|
| **Farmacia de turno** (5 de 5) | Necesidad real: el turno rota y nadie se acuerda | **HECHO** (cruzada contra La Vanguardia y Radio Gabal; en la web sin hora de cierre, regla 3 de `REGLAS.md`) |
| **WhatsApp** (5 de 5) | Es donde vive la conversación del pueblo | **HECHO** a medias: se puede **compartir cada nota por WhatsApp** (`web/components/compartir.js`). **PENDIENTE**: un servicio para los lectores (farmacia por WhatsApp, canal de noticias), la idea 1 de `IDEAS.md` |
| **Clima** (4 de 5) | Todos lo tienen en el teléfono. El valor es **avisar cuando viene algo** (granizo, helada, viento) | Clima **HECHO** (web, historias de mañana y noche). **Alertas: PENDIENTE** (idea 4 de `IDEAS.md`) |
| **Buscador** (2 de 5) | Barato y rinde más cuando hay muchas notas | **HECHO** (`web/components/buscador.js`, busca en el navegador) |
| **Agenda de verdad** | Los otros tienen notas sueltas, no calendario | **HECHO** |
| **Encuestas** (1 de 5) | Lo que más interacción genera en redes | **PENDIENTE**: recién cuando haya público. Se puede empezar con historias (`IDEAS.md`, idea 5) |
| **Newsletter** (2 de 5) | En un pueblo el correo puede ser el canal equivocado; WhatsApp probablemente gane | **PENDIENTE**, y después de WhatsApp |
| **Clasificados** (3 de 5) | Herencia del diario de papel: sirven como espacio pago, no como servicio | **PENDIENTE** como espacio pago (`PUBLICIDAD.md`, escalón 6) |
| **Fúnebres** (3 de 5) | Se lee muchísimo, pero no hay fuente oficial y un error (dar por muerto a alguien vivo) no se perdona | **DESCARTADO** salvo que una casa de sepelios mande el dato con su firma |
| **Video en vivo** (5 de 5) | Se copiaron entre todos; nadie muestra cuánta gente lo mira. Lo que funciona es el video corto y editado | **DESCARTADO** el vivo largo. El video corto **HECHO** (historias, reels y podcasts) |
| **Publicidad** | 4 de 5 tienen; el peso de portada lo paga | **HECHO** a la manera propia: tres avisos fijos, sin red publicitaria (`PUBLICIDAD.md`) |

## 3. Qué hacen los diarios nacionales (La Nación, Infobae, Clarín, Página 12)

Relevado el 20/09/2026. La idea no es copiarles (tienen cien periodistas): es
encontrar qué de lo que hacen podemos hacer con lo que ya tenemos y ningún
medio de Balcarce tiene.

| Función | Nacionales | Locales | Estado |
|---|:---:|:---:|---|
| **Podcast / audio** | 4 de 4 | 0 de 3 | **HECHO**: tres podcasts por día (mañana, tarde y noche), en Instagram y Facebook (`REDES.md`). **PENDIENTE**: un resumen hablado en la web |
| **"Lo más leído"** | 2 de 4 | 0 de 3 | **PENDIENTE**: hacen falta datos de lectura. La analítica de Cloudflare ya está activa; con un par de semanas de tráfico se puede armar |
| **Resumen en puntos** | 1 de 4 | 0 de 3 | **PENDIENTE** tal cual. Lo más cercano es el copete de dos líneas y el cuerpo desarrollado, que hoy escribe la IA (`EDITORIAL.md`) |
| **Temas / etiquetas** | 2 de 4 | 1 de 3 | **HECHO** a medias: existen los temas y sus páginas (`TEMAS` en `ingesta/fuentes.mjs`), pero las etiquetas están apagadas (`MOSTRAR_TEMAS`) porque cargaban la página |
| **Autor identificado** | 2 de 4 | 1 de 3 | **HECHO**: cada nota dice quién la escribió (IA o fuente, automática o revisada). Es una regla (`REGLAS.md`, regla 7) |
| **Fecha de actualización** | 1 de 4 | 0 de 3 | **PENDIENTE** (es gratis) |
| **Newsletters** | 2 de 4 | 0 de 3 | **PENDIENTE**: WhatsApp primero |
| **Sección "en vivo"** | 4 de 4 | 0 de 3 | **DESCARTADO**: en Balcarce no pasa algo que lo justifique más de dos veces por año, y una sección vacía se ve peor que no tenerla |
| **"Guardar para después"** | 1 de 4 | 0 de 3 | **DESCARTADO**: la visita dura dos minutos |
| **Comentarios** | 2 de 4 | — | **DESCARTADO** para siempre: moderar es un trabajo de tiempo completo |
| **Peso de la portada** | Clarín 4,4 MB, La Nación 1,1 MB | 55 a 370 KB | La nuestra es HTML estático. **Cuidarla** |

## 4. Lo que sigue, en orden

1. **WhatsApp para lectores** (farmacia de turno y avisos), el hueco más grande.
2. **Alertas de clima** (helada, granizo, viento): lo que el teléfono no da.
3. **"Lo más leído"**, cuando haya un par de semanas de datos de Cloudflare.
4. **Resumen en puntos** o fecha de actualización arriba de la nota.
5. **Encuestas semanales**, cuando haya público.
6. **Prender las etiquetas de temas** si se resuelve el peso de la portada.

Lo que ya vive en `PENDIENTES.md` (sección D) y en `IDEAS.md` no se repite
acá.

# Pendientes consolidados · 9/10/2026

*Armado el 9/10 con dos auditorías (una de pendientes y salud de los robots, otra de rendimiento del sitio) y lo hecho en el día. Es la lista "madre" para
retomar: si algo de acá ya está hecho, se tacha acá y en su documento de origen. Los números (#) son los de `PRIORIDADES.md` y `PENDIENTES.md`.*

## 1. Lo hecho hoy (9/10)

| Qué | Dónde queda |
|---|---|
| Plantillas animadas aprobadas y **conectadas a las piezas de todos los días** (clima de la mañana y de la noche, avisos, farmacia, efeméride, feriado, Participá, útiles, agenda); si algo falla, sale la placa de siempre (regla 157) | `reels/escenas/`, `reels/plan.mjs`, `escenas-del-plan.test.mjs` |
| Los cuadros se dibujan en paralelo (una pieza de 20 s: de 95 s a 33 s de dibujo; ~1 minuto con el video) | `reels/render-cuadros.mjs` |
| Clima: las 14 variantes del mismo tamaño y pronóstico ilustrado; aviso sin el título repetido; farmacia sin anunciar cuántas hay; Participá, útiles, agenda y feriado por decreto más parejos | `reels/escenas/*.mjs` |
| Escenas de deporte para más adelante (clasificación y carrera de F1, tabla de la Liga, resultado), neutrales, sin equipo marcado | `reels/escenas/deportes.mjs` (sin conectar) |
| Catálogo con todas las variantes y sus reglas (versión 2) | `reels/catalogo-plantillas.mjs`; página privada |
| Web: la primera foto de la portada se pide con prioridad; caché de un año para fuentes y escudos (y de un mes para íconos); caché de npm y de Next en el despliegue | `postales.js`, `_headers`, `cloudflare-deploy.yml` |

## 2. Lo que Claude puede hacer solo (en este orden)

| # | Qué | Esfuerzo | Notas |
|---|---|---|---|
| 1 | **Miniaturas livianas**: al guardar cada foto, hacer también una versión de ~480 px y usarla en las listas (hoy una lista baja ~1 MB de fotos grandes para mostrar cuadraditos) + `srcset` en la portada y la nota | medio | Mayor mejora de carga en celular. `web/scripts/achicar-foto.mjs`, `components/postales.js` |
| 2 | **Fotos nuevas en WebP** (25–35 % menos) cuidando que las tarjetas para compartir sigan leyéndolas | medio | Va junto con la anterior |
| 3 | Sacar los dos videos de `web/public/compartir/` (9,9 MB que viajan en cada despliegue) a R2 o enlace externo | bajo | R2 depende de ustedes (ver 3) |
| 4 | ~~Chequeo del tope de archivos~~ **hecho el 9/10**: `npm run contar` al final del build avisa desde 14.000 y alerta desde 18.000 (el tope de Cloudflare es 20.000) | – | `web/scripts/contar-archivos.mjs` |
| 5 | ~~`alt` en la foto destacada~~ **se dejó vacío a propósito**: el título va al lado y repetirlo molesta a los lectores de pantalla | – | `components/imagen-destacada.js` |
| 6 | Medición real: un build en la PC y un Lighthouse móvil, para confirmar las estimaciones de la auditoría | bajo | |
| 7 | Mirar que hoy salga bien lo nuevo: el clima de las 7 con escena, las efemérides de las 9, el WhatsApp de las 21 | bajo | Claude puede mirarlo solo mañana |
| 8 | Lista de sólo lectura de "lo frenado en rojo" en el panel del celular (#1 de DONDE-SEGUIMOS) | medio | El calendario de Fechas ya está hecho |
| 9 | Cifrar el texto de las pistas (hoy queda en un archivo público) (#50) | medio-alto | Delicado: se avisa antes de tocar |
| 10 | Contar los créditos de búsqueda (Tavily) en el WhatsApp (#51); WhatsApp de las 21 con cambios de código del día (#52) | bajo | |
| 11 | Actualizar las acciones de GitHub (Node 20 deprecado, #15) y probar Ubuntu 26 en un robot antes del 19/10 | bajo | |
| 12 | Arreglos chicos del sitio: título cortado con «…», botones de menos de 44 px, política de privacidad (Open-Meteo, DolarApi), podar `banco-fotos.json`, créditos de Wikimedia (#23) | bajo | |
| 13 | **Limpiar los documentos** (ver 5): PENDIENTES.md, IDEAS.md, CLAUDE.md "Estado", 00-INDICE | medio | Es la tarea #98 y #99 de PRIORIDADES |
| 14 | Escenas de deporte: conectarlas cuando se decida cuándo salen (tabla de la fecha, clasificación del sábado de F1, carrera del domingo) | medio | Falta decidir horarios (ver 3) |
| 15 | Notas propias con datos abiertos (nafta, agro…), de a una, con prueba de acceso a la fuente | medio | |

Lo que Claude **no** hace solo: tocar la lista roja del semáforo, crear cuentas (GitLab, R2, AdSense, Healthchecks), pegar tokens, borrar posteos o proyectos,
cambiar el menú, la portada o la firma, ni nada de lo que Google lee sin hablarlo antes.

### Lo que se agregó el 9/10 por la tarde (pedidos de Hernán)

| Qué | Estado |
|---|---|
| Nota del **sprint de la F1** (podio, puntos, Colapinto y lo que sigue) — regla 158 | Hecha. Jolpica no da la clasificación sprint ni las prácticas: no hay nota de eso |
| **Portada de los Reels** (el primer cuadro era papel vacío y los Reels se veían en blanco) — regla 159 | Hecha: el cuadro 0 es la pieza compuesta. Se confirma con el primer reel de mañana |
| **Miniatura de las notas sin foto**: ahora muestra la placa de su sección en las listas | Hecha |
| **Respaldo local** en `D:\BalcarDev\Respaldos\` (el repositorio entero con su historial en un solo archivo) | Hecho el 9/10 (143 MB); repetirlo cada tanto |
| **Reloj propio en Cloudflare** (reemplaza a cron-job.org) | Código y pruebas listos; falta que una persona cargue el token (docs/08, «El reloj de Cloudflare») |
| **Listado de claves y servicios de IA** y cuáles sumar | `CLAVES-DE-IA.md` |
| Qué hace falta para que el sitio **dure años** (el límite de 20.000 archivos, R2, el historial de Git) | Explicado a Hernán; la decisión es R2 por mes o D1 antes del 2/12 |
| **Aprobar los pull requests de afuera** | Claude **no** lo hace: es un ajuste de seguridad de GitHub (Settings → Actions → General → «Fork pull request workflows from outside collaborators» → «Require approval for all outside collaborators») |
| **Resumen diario por mail** (qué salió, qué falló, estadísticas) | Propuesto: el WhatsApp de las 21 ya junta casi todo; falta un canal de mail (Healthchecks/ntfy o un correo desde GitHub Actions). Se decide con el listado de claves |
| **Qué hace falta para que las notas nacionales sean más propias** (la IA ya las reescribe cruzando fuentes, pero sin aportar datos nuevos) | Análisis abajo |
| Search Console: 409 sin indexar (333 «descubiertas, todavía sin rastrear» —normal en un sitio nuevo—, 55 con `noindex` a propósito, 9 con 404, 9 «rastreadas, sin indexar», 3 redirecciones) | Los 55 `noindex` son notas finas, y las notas viejas sin cuerpo ya salen del archivo (regla 156). Los 9 404 hay que verlos entre los dos (la cuenta de Search Console es la del medio) |

### Las notas con varias fuentes: qué se hace hoy y qué podría mejorar

Hoy, una noticia que cuentan 2 o más medios pasa por el «editor digital» (Gemini): investiga el hecho cruzando las fuentes (qué confirman todas, qué dice una sola, qué se contradice), la reescribe con palabras propias (nunca más de diez palabras seguidas iguales a una fuente), atribuye cada dato, le agrega antecedentes de nuestras propias notas anteriores, y después un verificador la compara con las fuentes. Es redacción propia, pero **no suma datos que las fuentes no tengan**, a propósito: lo que no se puede comprobar no se afirma.

Para que sean más originales (y mejor vistas por Google) sin inventar nada, hay cuatro caminos, de menor a mayor esfuerzo:

1. **Contexto propio verificable**: «cómo llegamos hasta acá» (línea de tiempo con las notas nuestras), «qué cambia y desde cuándo», un glosario de una línea para las siglas.
2. **Un dato de color que sale de una fuente abierta y citada**: el clima de ese día, el dólar, un número del INDEC o del BCRA, la tabla de posiciones, el mapa de un lugar. Es lo que ya hacen las notas propias (F1, fútbol, dólar).
3. **Un gráfico o una tarjeta** hechos por nosotros con datos de la nota (una comparación, una barra, un mapa chico), con las mismas placas de las redes.
4. **Una medición de originalidad** sobre las notas ya publicadas (cuánto se parece cada cuerpo a sus fuentes y cuántas notas quedan sin dato propio) para saber dónde conviene empezar. La puede hacer Claude solo con lo que ya está guardado.

Sobre usar ChatGPT desde el Chrome para pedirle criterio: se puede, pero implica mandar tres notas a un servicio de afuera y entrar con una cuenta; Claude puede hacer ese análisis de criterio sin salir del proyecto. Queda a decisión de ustedes.

## 3. Lo que necesita a Hernán o a Andrés

**Hoy o esta semana**

| Qué | Quién | Dónde |
|---|---|---|
| Mirar Search Console (cuántas páginas indexó Google) y Cloudflare (qué bloquea a los lectores automáticos; permitir o no a los buscadores con IA) | los dos, 25 min | PRIORIDADES #5 y #6 |
| **Activar el respaldo externo** (GitLab y R2): hoy el único historial está en GitHub; es el riesgo operativo número uno con solución simple | los dos | PASOS-PARA-USTEDES §1 |
| Aprobar que corran los pull requests de afuera (5 min, ajuste de GitHub) | los dos | PRIORIDADES #29 |
| Borrar el proyecto de Vercel y limpiar el DNS | los dos | PENDIENTES #8 |
| Pegar las bios y los perfiles en Instagram y Facebook (bio, categoría, enlace, botón de WhatsApp, 5 historias destacadas) | los dos | PENDIENTES #7 |
| Mail de prueba a contacto@, redaccion@ y publicidad@ y decidir «Enviar como» en Gmail | los dos | PRIORIDADES #110 |
| Mirar en cron-job.org que todos los trabajos sigan activos y con su token | los dos, 5 min | PENDIENTES #31 |
| Borrar a mano las copias duplicadas en Instagram (nota de las calles 19 y 114 bis) y los posteos viejos que quieran | los dos | PENDIENTES #1, #34 |
| Mandar el video y mensajes a amigos y grupos (hay 6 seguidores en Facebook y 4 en Instagram) | los dos | PENDIENTES |

**Con fecha**

| Cuándo | Qué |
|---|---|
| **Antes del 19/10** | Juegos Bonaerenses (19 al 23/10): cargar la lista de finalistas de Balcarce; Claude arma la nota |
| **20/10** | Efemérides de noviembre: Claude las arma, ustedes las aprueban en Fechas → Mes armado (antes del 31/10) |
| **Antes del 25/10** | Decidir qué pasa con Participá (las piezas fijas vencen el 31/10) |
| **21/10** | Next 15 deja de recibir parches. Decidir: quedarse (el límite de archivos de Cloudflare impide Next 16 sin R2) o hacer la etapa de R2 antes |
| **Antes del 2/12** | Elegir R2 por mes o D1 para el archivo: se llega a las 3.500 notas con página |

**Decisiones que frenan trabajo**

- **Firma de lo que escribe Claude** (#38) y nombres para «Quiénes somos» (#37).
- Qué **medios argentinos** cuentan para que una pista salga sola (C-11).
- **Línea editorial** (centro y centro-derecha, neutral): hay un borrador sin aplicar (#33g). Las efemérides y los feriados ya la siguen.
- **Ampliar la lista roja** con edades y verbos («violaron a una nena»): falta cubrir las pistas. Es una regla de menores y víctimas: se decide pronto.
- Pasar el **seguimiento comercial** a un lugar privado antes del primer mensaje a un comercio (C-8).
- Menú de 15 secciones: maqueta con «Más» y servicios en verde (no se toca sin aprobar). El código tiene once.
- Policiales y Política: ¿esperan también en la web? (hoy Policiales sale ~1 por día).
- Clave paga de Gemini: reactivar o dejar (hoy todo corre con claves gratis, sin respaldo pago).
- Panel de la PC: ¿se retira? (hoy «en desuso»; hay documentos que todavía dicen «respaldo»).
- Cómo se publica en YouTube y TikTok (manual desde Chrome, video por video con su OK).
- **Piezas de deporte**: cuándo salen y si salen con voz (cupo de voz: 10 por día, justo).

## 4. Riesgos

1. **Un solo disparador y un solo canal de avisos**: cron-job.org dispara todo y los avisos de fallas van por WhatsApp (CallMeBot) a un solo teléfono. Faltan Healthchecks y ntfy (#43).
2. **Una sola persona con acceso completo**: una cuenta de GitHub, una cuenta para todo lo demás, y la llave del panel es la de Hernán (vence el 29/09/2027). Andrés como administrador y la verificación en dos pasos están pendientes (#122).
3. **Sin respaldo externo del historial** (ver 3).
4. **Cupos**: 10 voces por día; las cuatro claves de IA son gratis y sin respaldo pago. Con más piezas (escenas nuevas, deporte) el cupo de voz se acerca al tope.
5. **Pistas que salen solas** con una lista de palabras delicadas que no frena todavía «violaron a una nena»; la segunda barrera es el semáforo.
6. **Los archivos que escribe una persona** (`celular-decisiones.json`, `correcciones.json`, `retiradas.json`) deben llevar `motivo`, `cuando` y `por`: si falta uno, la web falla y se congela.
7. GitHub tuvo dos fallas en Redes el 8/10 (18:05) sin causa legible; las siguientes salieron bien. Si se repite, abrir el log desde la web de GitHub.

## 5. Documentos desactualizados (para limpiar)

- **Next 15 o 16**: PLAN-INTEGRAL (líneas 29 y 72), PRIORIDADES (44 y 108) y MEJORAS (158 y 165) siguen diciendo «pasar a Next 16 antes del 21/10»; el sitio quedó en **Next 15** por el límite de archivos (regla 148, y dos commits con ese número que se contradicen).
- `CLAUDE.md`, `docs/00-INDICE.md`, `PENDIENTES.md` e `IDEAS.md` dicen «actualizado el 29/09»; CLAUDE.md dice «más de 1.400 pruebas» (hoy ~2.000) y su «Estado» es del 29/09.
- `PENDIENTES.md`: varios ítems ya hechos siguen en la lista (0, 0b, 0k, 0l, #2 «comprobar Facebook», #3 «borrar claves», #4 «mirar los primeros días de redes»), una tabla rota en #8, y «Para mañana (7/10)» ya pasó.
- Las pistas: PENDIENTES dice a la vez «por diseñar» y «ya salen solas con 3 o más medios».
- Panel de la PC: «respaldo» en algunos documentos y «en desuso» en otros.
- `IDEAS.md` repite ideas ya hechas (buscador, RSS por sección, un día como hoy, participá) y tiene numeración repetida.
- `docs/propuestas/` tiene tres capas que se pisan (PRIORIDADES, PLAN-INTEGRAL y PENDIENTES/IDEAS) con numeración distinta.

## 6. Salud de los robots (últimas 24 horas)

Todos verdes desde la tarde de ayer (Actualizar la web, Cloudflare Pages, Redes, Vigilancia, Auditoría, Pistas). Fallas del 8/10: Actualizar la web a las 15:30 UTC (el `git add` nombraba una carpeta que todavía no existía; arreglado en 4 minutos y ahora una prueba lo controla) y dos de Redes a las 18:05 sin causa legible. Aviso permanente: GitHub deja de soportar Node 20 en las acciones `checkout`, `setup-node` y `cache` v4.

## 7. Rendimiento del sitio (auditoría del 9/10)

Está bien armado: fotos livianas (76 KB de promedio), fuentes propias, buscador que no pesa hasta que se usa, sin scripts de terceros, caché larga para lo que no cambia, y ancho y alto declarados en todas las fotos (no hay saltos). Lo que queda, en el orden de la sección 2: miniaturas (1 MB de más por lista), WebP, los dos videos de `/compartir`, el tope de archivos vigilado, y a largo plazo las fotos en R2 (saca ~50 MB y 640 archivos de cada despliegue y del historial; es lo que habilita Next 16). Cada «Actualizar la web» commitea `archivo.json` (2,3 MB): el historial ya pesa 165 MB; partirlo por mes lo frena. No se midió el peso real de las páginas porque no hay un build en la PC: queda como tarea 6.

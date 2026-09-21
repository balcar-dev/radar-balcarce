# Radar Balcarce — estado del proyecto

Última revisión: 21 de septiembre de 2026 (ver la sección 10 para las redes). Este archivo es el que se lee
antes de tocar nada: qué existe, qué falta, y las decisiones que ya se
tomaron para no volver a discutirlas cada vez.

Ver también [`INVESTIGACION.md`](INVESTIGACION.md) — lo legal y lo
competitivo, investigado aparte para no inflar este archivo.

## Cómo correr todo

**La forma fácil, después de prender o reiniciar la PC:** doble clic en
**`ARRANCAR.bat`** (está en esta misma carpeta). Levanta el panel y la
web, y te abre las dos en el navegador. Deja dos ventanas negras
abiertas: son los servidores, si las cerrás se apaga todo.

| Qué | Dónde se ve | Qué es |
|---|---|---|
| **El panel** | http://localhost:4321 | Donde ustedes deciden qué se publica. Privado, sólo desde esta PC. |
| **La web** | http://localhost:3000 | Lo que vería la gente. Todavía local — no está en internet. |

Son direcciones locales: funcionan sólo en esta computadora mientras los
servidores estén levantados. Para que Balcarce las pueda ver hace falta
publicarlas (ver sección 9).

Lo demás, a mano desde la terminal:

```bash
node reels/plan.mjs              # ver el plan del día sin generar nada
node reels/plan.mjs --generar    # generar los videos del día
node ingesta/agenda.mjs          # ver la agenda de eventos sola
node ingesta/utiles.mjs          # ver los números útiles y si toca hoy
node reels/reescritura.mjs       # probar la reescritura por IA con un ejemplo
node reels/casting.mjs           # comparar voces (gasta cupo si son de Gemini)
```

La clave de Gemini va en `.env` (`GEMINI_API_KEY=...`), nunca en el código
ni en el chat. Si alguna vez se pegó una clave en una conversación, se
considera quemada: hay que generar una nueva.

---

## 1. Lo que ya funciona de punta a punta

- **Ingesta** (`ingesta/`): 33 fuentes locales, regionales y nacionales,
  agrupación de noticias repetidas entre medios, clasificación por sección,
  semáforo editorial, relevancia.
- **Farmacias** (`ingesta/ingesta.mjs`): cronograma del Colegio +
  directorio con dirección y teléfono, **cruzado contra La Vanguardia y
  Radio Gabal** para confirmar antes de publicar.
- **Agenda de eventos** (`ingesta/agenda.mjs`): API real del municipio
  (`balcarce.gob.ar/wp-json/tribe/events/v1/events`) más un calendario
  anual investigado a mano (ver sección 4).
- **Números útiles** (`ingesta/utiles.mjs`): lista oficial del municipio,
  sale como historia una vez por semana en un día que varía.
- **El tablero** (`panel/`): cola de aprobación con semáforo, fuentes con
  sus temas, agenda, el prompt editorial a la vista, botón de reescritura
  por IA por nota.
- **Las piezas** (`reels/`): placas dibujadas por código (nunca fotos
  ajenas), voz por Microsoft Edge (gratis, sin cuenta) o por Gemini (mejor,
  con respaldo automático a Edge si falla), subtítulos alineados palabra
  por palabra, sin música (se sacó: sonaba a pitido).
- **Reescritura por IA** (`reels/reescritura.mjs`): título, copete y guion
  reescritos con la línea editorial como prompt — no como una regla aparte
  que hay que acordarse de aplicar. Si Gemini falla, cae sola al armado
  mecánico anterior.
- **Agenda con carga a mano** (`ingesta/agenda.mjs`, pestaña Agenda del
  panel): API del municipio + formulario para cargar lo que avisan por
  WhatsApp + contactos reales de los organizadores grandes.
- **Recordatorio mensual de agenda** (mismo lugar): un mensaje formal
  listo para copiar y pegar, con un aviso que se prende solo a los 30 días
  de la última vez que se le escribió a cada organizador. No manda nada
  solo — es un recordatorio, no un bot de WhatsApp.
- **El buzón** (`panel/buzon.mjs`, pestaña Buzón): la entrada de contenido
  propio — datos, reclamos, notas de opinión y seguimientos que manda la
  gente. Es lo que separa un agregador de un medio de verdad. Ver la
  sección 7 para las reglas de cada tipo.

## 2. Lo que falta — en orden de impacto

1. ✅ **La web pública — construida el 18/09/2026.** Ver sección 9. Corre
   local, compila sin errores, 54 páginas generadas con datos reales del
   panel. Lo que falta es sólo **publicarla** (necesita tu cuenta de
   Vercel, no algo que yo pueda hacer solo) y decidir cómo le llegan datos
   frescos una vez en producción (ver el README de `web/`).
2. **Que corra solo.** *(21/09: la web ya se actualiza sola cada 30 minutos
   desde GitHub, y Facebook e Instagram publican desde GitHub; falta el reloj
   de las piezas de Instagram, ver sección 10.)* GitHub Actions con el ciclo
   cada 10 minutos y las
   piezas a su hora, sin depender de que la PC esté prendida. El workflow
   de *deploy* ya está escrito (`.github/workflows/deploy-web.yml`) pero
   necesita tres secretos de tu cuenta de Vercel para activarse. El de
   *ingesta* todavía no se armó: depende de la decisión del punto 1.
3. ✅ **Redes conectadas — hecho el 21/09/2026** (sección 10). Antes de eso, "Publicar" guardaba la decisión pero no empujaba
   nada a ningún lado. Necesita: cuentas creadas, Instagram como cuenta
   profesional vinculada a una página de Facebook, y las claves de la API
   de Meta.
4. **Analítica real.** No se puede saber qué categoría lee más gente hasta
   que haya gente leyendo. Es la pieza que falta para responder con datos
   la pregunta de "en qué enfocarse" — ver sección 5.

## 3. Fuentes: el mapa completo

### Locales, funcionando (10)

| Medio | Cómo se lee | Fuerte en |
|---|---|---|
| News Balcarce | RSS (`?feed=rss2`) | volumen, texto completo |
| Puntonueve | RSS | velocidad, alertas |
| Infórmese Primero | Atom vía FeedBurner | policiales, tránsito |
| Radio Gabal (5 secciones) | RSS por sección | agro, región |
| Municipalidad | RSS | comunicados oficiales |
| El Diario Balcarce | scraping (sin feed) | rural, el único en papel |
| **La Vanguardia** | scraping (sin feed) | campo, salud — sumado hoy |

### Regional (1, sumada hoy)

- **Sendero Regional** (senderomultimedios.com.ar) — cubre Necochea,
  Lobería, San Cayetano, Balcarce y Tandil. Es la primera fuente de región
  que funciona: las otras cuatro probadas antes (La Capital de Mar del
  Plata, El Retrato de Hoy, 0223, La Noticia 1) fallaron por bloqueo o
  falta de feed.

### Nacionales y temáticas (7)

Infobae, La Nación, Clarín, Ámbito, Olé, Clarín Deportes, Campeones
(automovilismo). De éstas sólo entra lo que menciona Balcarce, más unas
pocas recientes para no inundar.

### Revisadas y descartadas — por qué

Esto se investigó a pedido explícito y conviene dejarlo escrito para no
volver a probarlas cada tanto sin necesidad:

- **MinutoBalcarce.com.ar** — última nota de julio, mezcla contenido que no
  es de Balcarce. No entra.
- **La Capital de Mar del Plata, El Retrato de Hoy** — bloquean lectores
  automáticos (403).
- **0223** — responde pero sin items utilizables.
- **La Noticia 1** — no publica feed.
- **Radio Líder Balcarce, Radio Pop 99.1, Radio Sube, Radio 10, Radio del
  Sol** — sólo existen como página de Facebook, sin sitio propio. Scrapear
  Facebook va contra sus términos y es frágil (login, cambios constantes):
  no se automatiza. Si alguna abre un sitio con feed, se suma en cinco
  líneas.
- **Radio Líder** es además la misma empresa que La Vanguardia
  (Multimedios Balcarce): ya está cubierta por ese lado.

## 4. Agenda de eventos: lo que se investigó

La API del municipio (real, no scraping) sólo tiene cargado lo que alguien
tipeó esta semana — hoy son 8 eventos, nunca va a tener en septiembre la
Fiesta del Automovilismo de febrero. Por eso se armó un **calendario anual
por categoría**, investigado a mano, que avisa "esto vuelve por esta
época" sin inventar una fecha exacta:

| Evento | Categoría | Mes aprox. | Última edición conocida |
|---|---|---|---|
| Fiesta Nacional del Automovilismo | automovilismo | febrero | 6-9 feb 2025 (32ª) |
| Mountain Bike Cerro El Triunfo | ciclismo | varias fechas, abr-oct | ronda 26 abr 2026 |
| Educo Agro | agro | septiembre | 6-8 sep 2025 |
| Fiesta Nacional del Postre | feria | **se mueve**: jul 2025 → oct 2026 | ver aviso abajo |
| Fiesta de la Papa Frita | feria | octubre | 1ª edición, 7-8 oct 2026 |
| Balcarce Corre | running | diciembre | 7 dic 2025 |
| Media Maratón de Balcarce | running | agosto | 16 ago 2026 |
| Tierras del Diablo (trail) | running | octubre | 11 oct 2026 |

**Aviso importante:** la Fiesta del Postre cambió de mes de un año a otro
(julio en 2025, octubre en 2026 según la propia API del municipio). Es la
prueba de que estas fechas anuales nunca se publican como confirmadas sin
chequear primero.

Categorías pedidas — oficial, cerro, ciclismo, running, automovilismo,
feria, agro — ya están en `CATEGORIAS` de `agenda.mjs`. Afinarlas más
(por ejemplo separar "cultura" de "oficial") es tocar un objeto, no
reescribir nada.

### Cómo se va completando de acá en adelante

Dos vías, las dos ya andando en el panel (pestaña Agenda):

1. **La API del municipio se actualiza sola**, una vez por hora. Cubre lo
   que el municipio mismo carga — bien para actos oficiales, floja para
   todo lo que organiza un privado o un club.
2. **Carga a mano**, para cuando alguien avisa por WhatsApp, llamada o en
   la calle. Hay un formulario en el panel (nombre, fecha, categoría,
   lugar, y quién avisó — así se puede volver a preguntar). No hace falta
   tocar código para sumar un evento.

Para la segunda vía, ya están cargados los contactos reales de quienes
organizan los eventos grandes (visibles en la misma pestaña del panel):

| Organizador | Para qué preguntarle | Contacto |
|---|---|---|
| Subsecretaría de Deportes y Recreación (municipio) | Cualquier prueba deportiva | (02266) 43-1218 / 43-1704 |
| Perfil Extremo (Tandil) | Mountain bike en el Cerro | Gastón +54 9 249-460-2248 · Lalo +54 9 249-464-1547 |
| Grupo Hets (Balcarce) | Balcarce Corre, Tierras del Diablo | (02266) 47-5024 · grupohets@gmail.com |
| Subsecretaría de Turismo (municipio) | Ferias, fiestas populares | (02266) 42-2394 / 43-0895 · @turismobalcarce en Instagram |

La idea de tener el WhatsApp de quien organiza en el Cerro es exactamente
esto: no hay que inventar un sistema nuevo, hay que preguntarle a Perfil
Extremo directamente cuándo es la próxima fecha de mountain bike, y
cargarlo en el formulario cuando conteste.

## 5. Decisiones editoriales tomadas esta ronda

- **Los guiones tienen que ser cortos.** El prompt de reescritura ahora
  pide copete de máximo 30 palabras y guion de 25 a 40. "Corto y directo
  gana siempre sobre completo: un reel de servicio no es una crónica."
- **Sección Tecnología, como diferencial.** Ningún medio de Balcarce cubre
  esto con regularidad, y conecta con la identidad del pueblo (INTA
  Balcarce es uno de los centros de investigación agropecuaria más grandes
  del país). Hoy entra por palabra clave desde las fuentes que ya se leen
  (agricultura de precisión, biotecnología, etc.); el día que se arme un
  beat propio de IA/agro-tech, tiene sección propia lista.
- **Qué categoría enfocar — todavía no se puede saber con datos.** Sin web
  pública no hay tráfico que medir. Lo que sí se puede hacer ahora es una
  apuesta editorial: Tecnología/agro-tech como sello propio, y el resto
  (Balcarce, Servicios, Deportes) siguiendo el volumen real de noticias del
  pueblo. Cuando la web tenga un mes de tráfico, ahí se decide con números
  y no a ojo.

## 5 bis. Reglas automáticas que evitan trabajo manual

- **Archivado a las 72 horas.** Una nota que pasa tres días sin que nadie
  la decida se archiva sola (pestaña "Archivadas" del panel, no se borra).
  Sin esto la cola crece hasta volverse inmirable: pasó de 47 a 127
  pendientes en una noche. Las que llegan sin fecha real (los scrapers de
  portada, que no dicen cuándo salió la nota) quedan exentas: no sabemos
  si son viejas y descartarlas por las dudas sería tirar notas buenas.
  También aplica a las verdes: si el ciclo estuvo caído dos días, al
  volver no queremos que salga de golpe el clima del martes.
- **Respaldo del clima.** El 18/09 Open-Meteo no respondió en un ciclo y
  la placa quedó sin datos. Ahora, si falla, entra sola la API del
  Instituto Meteorológico de Noruega (`api.met.no`): gratis, sin clave,
  sólo pide identificarse con un User-Agent propio. Probado forzando la
  caída del primario. La única diferencia: met.no no da sensación térmica
  (se usa la temperatura real en vez de inventar un número) y la mínima
  del día en curso puede salir más alta, porque sólo ve las horas que
  quedan por delante.

## 6. Riesgos técnicos anotados (para no redescubrirlos)

- `gemini-flash-latest` respondía con **503 de alta demanda** de forma
  persistente durante las pruebas; se cambió el modelo de reescritura a
  `gemini-flash-lite-latest`, que respondió parejo. Si vuelve a fallar
  seguido, ese es el primer lugar donde mirar.
- El cronograma de farmacias del Colegio se corta antes de fin de mes:
  el sistema ya avisa cuántos días quedan cargados.
- "San José Plaza" no tiene dirección en el directorio del Colegio: hay
  que cargarla a mano una vez.
- La API de imágenes de Gemini necesita facturación habilitada (el plan
  gratuito da `limit: 0`, no es un error nuestro). La de voz sí tiene
  gratis: 10 pedidos por día.

## 7. El buzón: contenido propio, no agregado

Cuatro tipos, cada uno con su regla (texto completo en `panel/buzon.mjs`,
visible también en la pestaña Buzón del panel):

| Tipo | Qué es | Regla de publicación |
|---|---|---|
| **Dato** | Algo que nadie más contó | Se verifica como cualquier nota: sale si se confirma |
| **Reclamo** | Queja contra alguien identificable | **Nunca se publica de un solo lado.** Se contacta a la otra parte antes de salir. El panel bloquea visualmente el reclamo hasta que se carga esa respuesta |
| **Opinión** | Columna firmada | Siempre con nombre y apellido real, nunca anónima. Separada de las noticias, sin corregir el contenido |
| **Seguimiento** | Promesa u obra a revisar con el tiempo | No es una noticia de una vez: ficha con estado (pendiente / en curso / cumplido / incumplido / archivado) que se revisita cada 4 a 6 semanas |

Hoy se carga a mano en el panel — no hay web ni WhatsApp propio todavía —
pero el campo (`estado.buzon` en `panel/servidor.mjs`) ya está pensado
para que un formulario público o un número de WhatsApp escriban ahí
directo el día que existan.

La regla del reclamo (nunca publicar de un solo lado) no es sólo buen
criterio periodístico: en Argentina se cruza con el derecho de rectificación
o respuesta y con la normativa de calumnias e injurias. Ver
`INVESTIGACION.md` para el detalle legal.

Lo que salió de esa investigación ya está aplicado, no sólo escrito:

- ✅ **Política de privacidad** — [`POLITICA-PRIVACIDAD.md`](POLITICA-PRIVACIDAD.md),
  lista para publicar como página del sitio.
- ✅ **Doctrina Campillay en el prompt editorial** — `reels/reescritura.mjs`
  ahora exige atribuir la fuente y usar condicional en cualquier nota con
  una acusación, no sólo como criterio a mano.
- ✅ **Menores/víctimas como regla dura del semáforo** —
  `ingesta/fuentes.mjs`, `REGLAS_SEMAFORO.rojo` ampliada (violencia de
  género, femicidio, grooming, etc.), con la cita legal en el comentario.
- ✅ **El porqué legal documentado en el código** — comentario en
  `panel/buzon.mjs`, junto a la regla del reclamo.
- ⏳ **Zona gris para más adelante, no urgente:** si algún día se arma una
  radio real (streaming de audio en vivo, no sólo un video subido), ahí sí
  correspondería consultar a ENACOM — hoy, web + redes, no hace falta.

## 8. Lo que se investigó a mano en redes (18/09/2026)

A pedido explícito, se miró Facebook e Instagram de los medios locales
para ver qué categoría genera más interacción. El resultado, para que no
se vuelva a intentar de la misma forma:

- **Facebook bloquea todo sin sesión iniciada.** Ni como visitante humano
  se ve más de un posteo suelto detrás del cartel de "Iniciá sesión", y
  ese posteo no muestra el número de me gusta ni comentarios como texto.
- **Instagram deja ver la grilla de publicaciones sin loguearse**, con
  fecha de cada una, pero **tampoco expone los números** de interacción a
  quien no tiene cuenta.
- Lo único que se pudo sacar es **ritmo y tema, no número real**:
  - **Infórmese Primero** publicó 11 veces entre el 13 y el 17 de
    septiembre — más de dos por día. Fuerte en policiales y tránsito
    (ambulancia, choques, un camión) y también agro (tractor,
    cosechadora).
  - **Puntonueve** publica bastante menos seguido, más volcado a deportes
    y salud.
  - Es una pista editorial razonable (quizás policiales/tránsito y agro
    "mueven la aguja" en Balcarce), pero no es un dato duro: puede ser
    sólo que eso es lo que más pasa en el pueblo, no lo que más
    engancha.
- **La única forma limpia de tener el número real es con cuenta propia**,
  vía la API oficial de Meta, el día que Radar Balcarce tenga sus
  páginas. Ahí sí van a ser estadísticas exactas de los posteos propios
  — antes de que la web tenga tráfico, porque se publica en redes
  primero.
- No se intentó ni se va a intentar loguearse para sacar más datos de la
  competencia: eso deja de ser "mirar" y pasa a ser otra cosa.

## 8 bis. Rediseño de las piezas para redes (18/09/2026)

Las placas se veían correctas pero anticuadas, y no terminaban de parecer
del mismo medio que la web. Qué cambió:

- **Las tipografías ahora son las del portal, de verdad.** Antes se
  dibujaban con Georgia y Segoe UI (las que trae Windows) porque eran las
  únicas disponibles. Ahora están incrustadas **Fraunces** (titulares) e
  **IBM Plex Sans** (todo lo demás), en `reels/marca/fuentes/`, y resvg
  las usa directamente. Era la incoherencia número uno que estaba anotada.
- **Se fue el "radar" de anillos concéntricos.** Casi no se veía, y cuando
  se veía ensuciaba. Lo reemplaza un degradado profundo del color de la
  sección más dos arcos limpios: se reconoce como marca incluso en
  miniatura, que es como la gente ve los reels.
- **El rótulo de sección pasó a ser una píldora de color sólido**, lo
  primero que se entiende antes de leer el título.
- **El titular manda.** El cuerpo se adapta al largo (104 px con dos
  renglones, 78 con cinco) y se ancla a una línea fija abajo, así todas
  las piezas se sienten de la misma familia aunque el título cambie.
- **Más aire:** margen de 88 px en vez de 72, y las cajas de datos del
  clima perdieron el recuadro — ahora son una línea fina arriba. Menos
  marco, menos cara de plantilla.
- El logo quedó siempre en ámbar: en el color de la sección perdía
  contraste sobre el fondo oscuro.

## 9. La web pública (`web/`) — construida el 18/09/2026

Next.js, App Router, JavaScript plano (sin TypeScript, consistente con el
resto del proyecto). **No se conecta en vivo al panel**: lee un archivo
estático, `web/data/portada.json`, generado por
`web/scripts/generar-datos.mjs`. Es la decisión de diseño más importante
de esta parte, y vale explicar el porqué: la web se va a desplegar en
Vercel, que no puede leer los archivos de una PC. Un JSON generado y
commiteado es lo que permite que funcione igual en las dos partes, sin
armar una base de datos todavía.

**Páginas:** portada (destacada + grilla por sección + clima/farmacia en
la lateral), `/util` (Balcarce Útil completo: farmacia con dirección,
cronograma de la semana, agenda, teléfonos útiles), `/nota/[id]` (una
página por noticia publicada, generada estática), `/politica-de-privacidad`,
`/feed.xml` (RSS). 54 páginas en el build de prueba, con las 47 notas que
había publicadas o automáticas en ese momento.

**Probado de punta a punta:** `npm install`, `npm run build` (compila
limpio, sin warnings), `npm start` sirviendo en `localhost:3000`, y se
verificó a mano en el navegador — portada, Balcarce Útil, una nota, y en
tamaño de celular. El feed RSS devuelve XML válido con las notas reales.

**Lo que falta, y por qué no lo hice yo solo:**

1. **Publicarla.** Necesita tu cuenta de Vercel — no es algo que yo pueda
   crear por vos. Instrucciones exactas en `web/README.md` (dos caminos:
   la web de Vercel o `npx vercel` desde la terminal). Ojo con un detalle
   fácil de pifiar: el **Root Directory tiene que ser `web`**, no la raíz
   del repo.
2. **Que se actualice sola en producción.** Esto es una decisión de
   infraestructura, no de código, y no la tomé por vos a propósito: hay
   que decidir dónde vive el panel corriendo de forma permanente (¿una PC
   prendida todo el día? ¿un VPS chico?) antes de armar el paso de
   automatización que regenere `portada.json` y dispare el redeploy. El
   workflow de *deploy* (`​.github/workflows/deploy-web.yml`) ya está
   escrito y sólo necesita tres secretos de Vercel para activarse; el de
   *actualizar datos* todavía no, porque depende de esa decisión.
3. **El dominio.** Sale en `algo.vercel.app` para empezar; `.com.ar`
   cuando quieras, no bloquea nada mientras tanto.

**Repo Git:** se inicializó localmente (`git init`, primer commit hecho)
pero **no tiene remoto ni se subió a ningún lado** — eso también queda
para cuando decidas dónde vive (GitHub, y con qué cuenta).

## 10. Redes con Meta y piezas en GitHub (21/09/2026)

Lo que quedó aplicado ese día. El detalle operativo (horarios, reglas, claves,
archivos) está en [`REDES.md`](REDES.md); acá va lo que se decidió y lo que se
aprendió.

**Lo que ya funciona**

- El dominio `radarbalcarce.com` está conectado y online; `www` redirige.
- Instagram `@radarbalcarce` es cuenta profesional, vinculada a la página de
  Facebook "Radar Balcarce", con foto, portada (`reels/portada.mjs`) y bio.
- La app de Meta y el usuario del sistema publican con un token sin
  vencimiento (`META_TOKEN`).
- Facebook publica solo, con enlace, una nota por vez (`redes.yml`).
- Las piezas de video se arman en GitHub con la voz de Gemini y se suben a
  Instagram directo, sin alojar nada (`piezas.yml`). Probado con una historia
  real (el clima) y un posteo real en Facebook.
- Se apagaron las etiquetas de temas de la web (`MOSTRAR_TEMAS`), el turno de
  farmacia cambió a las 8:30, y el plan del día pasó a 3 reels (2 noticias + el
  podcast) y 6 historias.

**Decisiones**

- Todo lo que va a Instagram es video con voz (la API no acepta imágenes sin
  una dirección pública). El feed de fotos quedó apagado.
- Política y Policiales no se arman solas para ninguna red.
- Dos claves de Gemini separadas: redactar y redes. La de redes es paga.
- La farmacia en las piezas no dice hasta qué hora está abierta (eso es para
  la web).
- Se empieza por lo simple para probar: primero Facebook, después Instagram.

**Lo que se aprendió (para no repetirlo)**

- El ID de página que sirve para la API de Meta no es el número de la dirección
  de Facebook. Se sacó de Configuración del negocio → Páginas.
- La variable `REDES_ACTIVAS` se creó como `Si` y la comparación exacta la
  dejaba apagada sin avisar; ahora acepta cualquier forma.
- Una nota es corta porque sólo guardamos el resumen del feed (unos 280
  caracteres) y el guion de voz es el titular dicho en voz alta. Arreglarlo
  pide traer el texto completo de las fuentes.
- La búsqueda de categorías de Instagram no responde cuando se maneja con
  automatización; se cambia desde el celular.
- Las pestañas de Chrome en segundo plano no responden a capturas.

**Historias y reels también en la página de Facebook (21/09, noche):** el mismo
video que va a Instagram sale como historia o reel de la página, a la misma hora.
Probado en vivo (una historia y el reel del podcast). Instagram manda: si falla
ahí no se intenta en Facebook.

**Facebook, conservador (decisión del 21/09):** 5 posteos por día con relevancia 75 o más,
no todas las notas de la web (unas 100 por día). Más adelante se van a mezclar con
las notas propias y originales de la redacción.

**El reloj (mismo día, más tarde)**

- `redes.yml` pasó a ser el reloj: varias corridas por día, cada una publica en
  Facebook y, si toca, arma y sube la historia o reel de esa hora. Cada pieza
  tiene una ventana de 2 horas porque el planificador de GitHub no es puntual
  (en este repositorio dejó hasta 5 horas entre dos corridas de "cada 30
  minutos").
- El plan elige la nota para cada pieza según lo que ya salió hoy (el libro
  guarda la nota usada), así una noticia no se repite entre historia y reel.
- Los subtítulos iban por delante de la voz (hasta 19 s en el podcast) porque el
  alineador usaba las primeras pausas del audio, y la voz también respira en las
  comas. Se rehízo (`reels/tiempos.mjs`) y se midió contra Edge: de 2,5–9,5 s de
  error medio a 0,1–0,2 s. Los números se cuentan como los dice la voz.

**Lo que falta**

Ver "Lo que falta" al final de `REDES.md`: puntualidad exacta si hiciera falta,
Threads, la categoría de Instagram y las notas largas.

## 11. Pendientes anotados el 21/09/2026 (para retomar): posicionamiento y bios

Pedido de Hernán: que la página esté bien estructurada y posicionada en Google,
en las redes y en los buscadores con IA, y mejorar las biografías. Nada de esto
está hecho todavía; es la lista de lo que hay que revisar.

**Lo que ya existe (no repetir):** direcciones con el titular adentro
(`web/lib/ruta.js`), `sitemap.xml`, `robots.txt`, `feed.xml`, enlace canónico
(`web/lib/sitio.js`), una tarjeta de imagen propia por nota para compartir
(`web/lib/tarjeta.js`), el dominio propio con `www` redirigido, y una prueba que
vigila el SEO en cada compilación (`web/scripts/revisar-seo.mjs`).

### Google

- **Search Console**: verificar `radarbalcarce.com` y enviar el sitemap. Sin eso
  no sabemos qué indexó Google ni qué errores tiene. Necesita la cuenta de Google
  del medio (la hace una persona).
- **Datos estructurados (JSON-LD)**: `NewsArticle` en cada nota (titular, fecha
  de publicación y de modificación, autor u organización, imagen) y
  `NewsMediaOrganization` en el sitio (nombre, logo, redes). Es lo que más ayuda
  a que Google entienda qué es cada página.
- **Google News y Discover**: Publisher Center, y cuidar que las imágenes de las
  notas sean grandes (al menos 1200 px de ancho) para poder aparecer en Discover.
- **Páginas que dan confianza (E-E-A-T)**: quiénes somos, contacto, política
  editorial (cómo se hace, qué se resume con IA y qué no, cómo corregimos un
  error), y firma en cada nota. Hoy `POLITICA-PRIVACIDAD.md` está como página;
  faltan las otras.
- **Títulos y descripciones**: revisar que cada sección, tema y nota tenga un
  título y una descripción propios, y no repetidos.
- **Rendimiento (Core Web Vitals)**: medir con PageSpeed Insights y ajustar. La
  web es HTML estático, así que la base es buena.
- **Enlaces internos y migas de pan**: ahora que se sacaron las etiquetas de
  temas (`MOSTRAR_TEMAS`), pensar cómo se relacionan las notas entre sí sin
  cargar la página.
- **Bing Webmaster Tools**: alimenta a Bing y a varios buscadores con IA.
- **Ficha de Google Business Profile** del medio, si corresponde.

### Redes sociales (cuando alguien comparte un enlace)

- Revisar cómo se ve cada nota compartida en Facebook, WhatsApp e Instagram con
  el **Depurador de uso compartido de Facebook** y con pruebas reales.
- Completar las etiquetas Open Graph y de Twitter (tamaño 1200 x 630,
  `og:locale` es_AR, fecha de publicación) y ver que estén en todas las páginas.
- **Medir cuánta gente llega desde cada red**: agregar parámetros UTM a los
  enlaces que publicamos y mirar el resultado en una analítica sin cookies.
- Sumar el permiso de estadísticas de Meta (`instagram_manage_insights`) para
  poder leer qué rinde en cada red.

### Buscadores con IA (ChatGPT, Gemini, Perplexity, etc.)

- Decidir en `robots.txt` si se permite o no a los rastreadores de IA (por
  ejemplo GPTBot, ClaudeBot, PerplexityBot, Google-Extended). Es una decisión de
  la redacción: permitirlo da visibilidad y citas, prohibirlo protege el
  contenido.
- Agregar un archivo `llms.txt` que explique qué es el sitio y dónde está lo
  importante, y un sitemap de noticias (`sitemap-news.xml`).
- Que cada nota abra con un resumen claro y verificable, con fecha, lugar, fuente
  y autor visibles: es lo que las IA citan.
- Nombre único y constante para la entidad ("Radar Balcarce") en el sitio, las
  redes y los datos estructurados.

### Biografías de las redes

- Reescribir las biografías de Instagram y Facebook. **No hace falta que sean
  "full IA"**: la biografía tiene que decir qué es el medio y qué cubre
  (Balcarce, clima, farmacia de turno, agenda, noticias), y la mención de que hay
  textos y voces con IA se mantiene por transparencia pero **más corta y menos
  protagonista** (una línea, o en la página "quiénes somos").
- Sumar el enlace al sitio en la biografía de Instagram (sólo se edita desde el
  celular), la categoría "Sitio web de noticias y medios de comunicación", el
  botón de contacto, y historias destacadas fijas (farmacia, teléfonos, agenda).

### Hashtags

Pregunta abierta de Hernán: si todavía se usan. Resumen de lo que se sabe hoy
(a confirmar mirando los números propios): en Instagram pesan mucho menos que
antes y se recomiendan pocos y relevantes (unos 3 a 5); en Facebook casi no
mueven nada. Lo que más rinde es el texto con las palabras que la gente busca
(Balcarce, el barrio, el evento). Propuesta: probar 2 o 3 (`#Balcarce` y uno de
la sección) en los reels durante dos semanas y comparar el alcance con los que no
los llevan. Hoy las piezas salen sin hashtags.

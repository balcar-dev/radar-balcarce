# 00 · Índice: Radar Balcarce de punta a punta

*Actualizado el 29/09/2026. Es la puerta de entrada a la documentación: qué es el
proyecto, por dónde pasa una noticia y qué documento cuenta cada cosa. Si un
documento y el código no coinciden, manda el código.*

## Qué es Radar Balcarce

Un **medio digital automático** de Balcarce, provincia de Buenos Aires, en
`radarbalcarce.com`, con Instagram `@radarbalcarce` y la página de Facebook
"Radar Balcarce". Cada media hora lee más de 200 feeds de unos 90 medios (de
Balcarce, la zona, la provincia y el país), junta la misma noticia contada por
varios, decide qué sale sola y qué espera a una persona, la escribe con IA
(Gemini), verifica lo escrito contra las fuentes, arma el sitio y lo sube a
Cloudflare. Varias veces por día publica en Facebook e Instagram con dos voces de
IA (una locutora y un locutor), y un vigilante avisa por WhatsApp si algo falla.

**Todo eso corre en GitHub, con la PC apagada.** Lo que el sistema no puede
decidir solo lo deciden Hernán y Andrés desde el **panel del celular**
(`radarbalcarce.com/panel/`); el panel de la PC queda de respaldo (agenda cargada
a mano, avisos, buzón, fuentes).

El principio que decide todo es una pregunta: **¿qué valor tiene esta nota para
alguien que vive en Balcarce?** Lo local pesa más que cualquier cosa de afuera, se
informa sin gritar y cada nota dice de dónde sale y quién la escribió.

## El recorrido de una noticia

Cada media hora cron-job.org dispara "Actualizar la web" (GitHub Actions), que
hace los pasos 1 a 8; las redes y la vigilancia corren aparte.

| # | Paso | Qué pasa | Dónde se cuenta |
|---|---|---|---|
| 1 | Ingesta | Se bajan y se leen los feeds (RSS, Atom, índices, páginas), con sus fechas; el filtro de entrada deja afuera otro país, policiales y consejos de afuera | `docs/02-INGESTA.md` |
| 2 | Cruce | Se juntan las notas que cuentan el mismo hecho (memoria de 36 h); de afuera queda lo que cuentan 2 medios o más, dice Balcarce o toca la zona | `docs/02-INGESTA.md` (pasos 9 a 13) |
| 3 | Selección | Sección, puntaje, semáforo (rojo, amarillo, verde), "de acá", medios que pide lo de afuera, cupos | `docs/03-SELECCION.md` |
| 4 | Lectura con IA | Una ficha por nota: saca, cambia la sección, junta repetidas; nunca destraba | `docs/03-SELECCION.md` (paso 8) |
| 5 | Redacción | Gemini escribe título, bajada y cuerpo con el texto completo de la fuente y `CRITERIO-EDITORIAL.md` § 12 | `docs/04-REDACCION.md` |
| 6 | Verificación | Cada dato contra las fuentes, el semáforo otra vez, el nivel de verificación; sin cuerpo no se publica | `docs/04-REDACCION.md` (pasos 7 a 11) |
| 7 | Publicación | Lo que decidió una persona (panel del celular), fecha real, "llega tarde" (12 h), retiradas y correcciones, foto del banco | `docs/03-SELECCION.md` (pasos 10 a 13), `docs/05-FOTOS.md`, `docs/09-PANEL.md` |
| 8 | Web | `web/data/*.json` → Next.js estático → Cloudflare Pages: portada de 36 h, archivo de 180 días, dirección fija | `docs/06-WEB.md` |
| 9 | Redes | Facebook (posteo y espejo en Instagram) y piezas de video con voz: clima, farmacia, tres podcasts | `docs/07-REDES.md`, `CRITERIO-REDES.md` |
| 10 | Vigilancia | Mira la web, las corridas, las redes, las claves de IA y las voces; WhatsApp a las 21 y cuando algo falla | `docs/08-INFRAESTRUCTURA.md` |

## Cada cosa, un solo lugar

Un dato vive en **un** lugar; los demás documentos remiten a ése.

| Qué | Dónde vive | Cómo se cuida |
|---|---|---|
| El estado del día (qué anda, qué no, las redes, las claves) | `CLAUDE.md`, sección "Estado" | — |
| Lo que falta hacer, con quién y qué urgencia | `PENDIENTES.md` | — |
| El criterio editorial (qué se publica, cómo se escribe, fuentes, verificación, firma) | `CRITERIO-EDITORIAL.md` | La IA lee su § 12 tal cual (`ingesta/prompt-editorial.mjs`); `pruebas/criterio.test.mjs` |
| Los números del criterio (largos, topes, medios, cupos, horas, contrato) | `ingesta/criterio.mjs` **y** la tabla de `CRITERIO-EDITORIAL.md` § 11 | `pruebas/criterio.test.mjs` controla que digan lo mismo |
| Cómo suenan y qué dicen las piezas de redes | `CRITERIO-REDES.md` | `redes/prompt-redes.mjs` lo lee tal cual; `pruebas/redes-criterio.test.mjs` |
| Los horarios de las piezas | `docs/07-REDES.md` (el código: `redes/piezas.mjs`, `panel/horarios.mjs`) | `pruebas/piezas.test.mjs` |
| Las fuentes | `ingesta/fuentes.mjs` y `ingesta/fuentes-cruce.mjs`; `FUENTES.md` es el registro **generado** | `pruebas/fuentes-registro.test.mjs` |
| Lo que la IA sabe de Balcarce | `ingesta/perfil-balcarce.md` (sólo datos seguros) | Lo lee `ingesta/lectura-ia.mjs` |
| Las claves de IA, los secretos, los workflows, los costos y los vencimientos | `docs/08-INFRAESTRUCTURA.md` | — |
| Los dos paneles (el del celular y el de la PC) | `docs/09-PANEL.md` | — |
| Las reglas numeradas y la prueba que cuida cada una | `docs/10-REGLAS-Y-PRUEBAS.md` | Las pruebas de `pruebas/` |
| El uso diario (corregir, retirar, instalar el panel del celular, qué mirar si algo no sale) | `docs/11-OPERACION.md` | — |
| La identidad visual (colores, letras, íconos, plantillas) | `MEDIA-KIT.md` | `pruebas/titulos-colores.test.mjs`, `pruebas/tipografia.test.mjs` |
| Las medidas de imagen y video de cada red | `redes/formatos.mjs` (el porqué, en `FORMATOS.md`) | `pruebas/formatos.test.mjs` y la auditoría de los lunes |
| Las biografías de las redes | `PERFILES.md` | `pruebas/perfiles.test.mjs` |
| Lo legal | `INVESTIGACION.md` | — |
| El texto de la política de privacidad | `web/app/politica-de-privacidad/page.js` (`POLITICA-PRIVACIDAD.md` cuenta sólo lo interno del buzón) | — |
| La historia de lo que pasó | `docs/historico/HISTORIA.md` y los mensajes de los commits | — |

## Todos los documentos

### En `docs/` (cómo funciona)

| Documento | Qué cuenta |
|---|---|
| `docs/00-INDICE.md` | Este índice |
| `docs/01-ARBOL.md` | Cada carpeta y cada archivo versionado: qué hace, quién lo llama y si está en uso |
| `docs/02-INGESTA.md` | De dónde salen las noticias: las fuentes, cómo se leen, las fechas, el filtro de entrada, el cruce de medios, cómo queda armada cada historia y el texto completo de la nota original |
| `docs/03-SELECCION.md` | Qué sale, dónde y cuándo: sección, puntaje, semáforo, "de acá", medios y cupos de lo de afuera, la lectura con IA, la fecha, "llega tarde", la decisión final, las ventanas, retirar y corregir |
| `docs/04-REDACCION.md` | Cómo escribe la IA, cada control del verificador, los arreglos automáticos, el nivel de verificación, "sin cuerpo no se publica", escribir un cuerpo a mano, escribir a pedido y la firma |
| `docs/05-FOTOS.md` | El banco de fotos: cómo se elige una foto sin marca de agua, Wikimedia, qué se guarda, dónde se muestra y dónde no |
| `docs/06-WEB.md` | Cómo se arma el sitio: `generar-datos.mjs` paso a paso, los archivos de `web/data/`, la tapa, las páginas, el archivo de 180 días, la dirección fija, las repetidas, las notas propias, el SEO y el diseño |
| `docs/07-REDES.md` | Facebook e Instagram: el interruptor, los posteos y el espejo, el reloj, las piezas, los podcasts, el contrato del día, el libro, la conexión con Meta y las auditorías |
| `docs/08-INFRAESTRUCTURA.md` | Qué corre dónde: los workflows, cron-job.org, Cloudflare, GitHub, las claves de IA y sus topes, los secretos por nombre, la vigilancia, los vencimientos y lo que cuesta |
| `docs/09-PANEL.md` | Los dos paneles: el del celular (el de todos los días) y el de la PC (respaldo): qué muestra cada uno, qué pasa cuando alguien decide y cómo llega a la web |
| `docs/10-REGLAS-Y-PRUEBAS.md` | **Las reglas numeradas**, qué prueba cuida cada una, el mapa de `pruebas/` y la regla de la prueba después del error |
| `docs/11-OPERACION.md` | El manual de uso diario: los enlaces, corregir, retirar, escribir cuerpos, el panel del celular, prender o apagar las redes, qué mirar cuando algo deja de salir |
| `docs/12-GLOSARIO.md` | Cada palabra propia del proyecto, con su definición y dónde vive |

### En la raíz

| Documento | Qué cuenta |
|---|---|
| `CLAUDE.md` | Lo que Claude lee al empezar cada sesión: qué es, reglas que no se negocian, cosas que muerden, el estado del día, dónde tocar cada cosa |
| `CRITERIO-EDITORIAL.md` | **El criterio editorial único**: qué entra, semáforo, cómo se escribe, fuentes, verificación, qué ve el lector, notas propias, redes, firma, los números (§ 11) y la instrucción exacta de la IA (§ 12). La IA lo lee tal cual |
| `CRITERIO-REDES.md` | **El criterio único de las redes**: identidad, las voces, una ficha por pieza, las reglas de toda pieza y los números. El código lo lee tal cual |
| `FUENTES.md` | Todas las fuentes: dónde se leen, ciudad, tipo, sección, peso, si son oficiales. **Generado** desde el código: no se edita a mano |
| `PENDIENTES.md` | Todo lo que falta, con quién y qué tan urgente |
| `IDEAS.md` | Ideas de producto y de sistema, para discutir |
| `MEDIA-KIT.md` | La identidad visual: colores, tipografía, íconos, medidas, plantillas |
| `FORMATOS.md` | Las medidas de imágenes y videos de cada red y su porqué (los números viven en `redes/formatos.mjs`) |
| `PERFILES.md` | Las biografías, categorías y colores de las redes |
| `PARA-CARGAR-A-MANO.md` | Las tareas para pegar a mano en Instagram y Facebook, con el texto listo |
| `SEO.md` | Posicionamiento: qué está hecho, cómo se audita, qué falta |
| `PUBLICIDAD.md` | Los tres avisos, sus reglas, AdSense y cómo se piensa vender |
| `COMERCIAL.md` | La base de comercios de Balcarce (aparte del sitio), la vigencia y las propuestas |
| `INVESTIGACION.md` | Lo legal, con sus fuentes |
| `POLITICA-PRIVACIDAD.md` | Qué se hace con los datos del buzón (el texto público es la página `/politica-de-privacidad`) |

### En otras carpetas

| Documento | Qué cuenta |
|---|---|
| `web/README.md` | Cómo correr la web en la PC; remite a `docs/06-WEB.md` |
| `ingesta/README.md` | Cómo correr el motor a mano; remite a `docs/02-INGESTA.md` |
| `ingesta/perfil-balcarce.md` | Lo que la IA de lectura sabe de Balcarce (lo lee tal cual) |

### Históricos (`docs/historico/`, no se mantienen)

Fotos de un día o de un plan: lo que dicen puede ya no valer. Nombran documentos
que se retiraron el 28/09 (`REGLAS.md`, `REDES.md`, `INFRAESTRUCTURA.md`,
`PANEL.md`, `EMPEZAR-ACA.md`, `MANUAL.md`, `docs/RADAR-3.0.md`): su contenido
vigente está en `docs/`.

| Documento | Qué cuenta |
|---|---|
| `docs/historico/HISTORIA.md` | Qué se hizo y por qué, con fecha |
| `docs/historico/AUDITORIA.md` | La auditoría del 25/09 y qué quedó arreglado |
| `docs/historico/INVESTIGACION-COMPETENCIA.md` | Lo que hacen los otros medios |
| `docs/historico/CRUCE-DE-MEDIOS.md` | La medición del 27/09 que llevó al cruce de medios |
| `docs/historico/PLAN-V2.2.md` | El plan del 27/09 para elegir mejor las notas (filtro de entrada, lectura con IA) |
| `docs/historico/VARIANTES-29-09.md` | La medición de las reglas de la IA del 29/09 y las opciones para las redes |

## La historia corta

| Fecha | Qué |
|---|---|
| 18 a 24/09 | Motor, panel, piezas y web; cron-job.org como reloj; dominio propio; Meta conectado; Cloudflare Pages; tres podcasts; vigilancia |
| 25 y 26/09 | Repositorio público; sin cuerpo no se publica; archivo de 180 días; criterios únicos; notas propias; contrato del día |
| 27/09 | La lectura con IA decide; el cruce de medios; lo de afuera se mide en medios; correcciones y retiradas a mano |
| 28/09 | Portada de 36 horas; fecha única de cada nota; "de acá" con una sola definición; el banco de fotos; esta documentación |
| 29/09 | Claves gratis nuevas y redes prendidas con las voces propias; el panel del celular; la vigilancia de claves y voces; las repetidas con otra dirección, unidas; fotos más livianas |

El detalle, en `docs/historico/HISTORIA.md` y en los mensajes de los commits.

## Cómo se mantiene esta documentación

- **Se cambia el código, se cambia el documento de su área**, en el mismo commit.
  Si es una regla nueva, va en `docs/10-REGLAS-Y-PRUEBAS.md` con el número
  siguiente y su prueba.
- **Un criterio editorial** se cambia en `CRITERIO-EDITORIAL.md` (y sus números,
  también en `ingesta/criterio.mjs`), no en el código ni en otro documento.
- **Una fuente** se cambia en `ingesta/fuentes.mjs` o `ingesta/fuentes-cruce.mjs`
  y después se corre `node ingesta/listar-fuentes.mjs`.
- **Un archivo nuevo** se suma a `docs/01-ARBOL.md`; **una palabra nueva**, a
  `docs/12-GLOSARIO.md`; **algo que falta**, a `PENDIENTES.md`; **el estado del
  día**, a `CLAUDE.md`.
- **Cada documento** empieza con la línea `*Actualizado el …*`, sigue el mismo
  orden ("En una frase", "Paso a paso", "Qué archivo hace qué", "Dónde se toca",
  "Qué puede fallar") y no guarda listas de pendientes.

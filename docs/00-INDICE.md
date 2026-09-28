# 00 · Índice: Radar Balcarce de punta a punta

*Escrito el 28/09/2026. Es la puerta de entrada a toda la documentación: qué
es el proyecto, por dónde pasa una noticia y qué documento cuenta cada cosa.
Si un documento y el código no coinciden, manda el código.*

## Qué es Radar Balcarce

Un **medio digital automático** de Balcarce, provincia de Buenos Aires, en
`radarbalcarce.com`, con Instagram `@radarbalcarce` y la página de Facebook
"Radar Balcarce". Cada media hora lee 214 feeds de 91 medios (los de Balcarce,
la zona, la provincia y el país), junta la misma noticia contada por varios,
decide qué sale solo y qué espera a una persona, lo escribe con IA (Gemini),
verifica lo escrito contra las fuentes, arma el sitio y lo sube a Cloudflare.
Varias veces por día publica en Facebook e Instagram con una voz de IA, y un
vigilante avisa por WhatsApp si algo falla. **Todo eso corre en GitHub con la
PC apagada.** Lo único que vive en la PC de Hernán es el panel, donde Hernán y
Andrés deciden lo que el sistema no puede decidir solo. El principio que
decide todo es una pregunta: **¿qué valor tiene esta nota para alguien que
vive en Balcarce?** Lo local pesa más que cualquier cosa de afuera, se informa
sin gritar y cada nota dice de dónde sale y quién la escribió.

## El recorrido de una noticia

```
 214 feeds de 91 medios                            (ingesta/fuentes.mjs, ingesta/fuentes-cruce.mjs, FUENTES.md)
   │   cada 30 min: cron-job.org → "Actualizar la web" (GitHub Actions)
   ▼
 1. INGESTA ─ bajar, leer RSS/Atom/índices/páginas, fechas,         → docs/02-INGESTA.md
   │          filtro de entrada (otro país, policiales, consejos)
   ▼
 2. CRUCE ─ juntar las notas que cuentan el mismo hecho              → docs/02-INGESTA.md (pasos 9 a 13)
   │        (TF-IDF, 0,42, memoria de 36 h); de afuera queda lo que
   │        cuentan 2 medios o más, dice Balcarce o toca la zona
   ▼
 3. SELECCIÓN ─ sección, puntaje, semáforo (rojo/amarillo/verde),    → docs/03-SELECCION.md
   │            "de acá", medios que pide lo de afuera, cupos
   ▼
 4. LECTURA CON IA ─ una ficha por nota: saca, cambia sección,       → docs/03-SELECCION.md (paso 8)
   │                 junta repetidas; nunca destraba
   ▼
 5. REDACCIÓN ─ texto completo de la fuente + CRITERIO-EDITORIAL     → docs/04-REDACCION.md
   │            § 12 → Gemini escribe título, bajada y cuerpo            (CRITERIO-EDITORIAL.md)
   ▼
 6. VERIFICACIÓN ─ cada dato contra las fuentes, semáforo otra vez,  → docs/04-REDACCION.md (pasos 7 a 11)
   │               nivel de verificación; sin cuerpo no se publica
   ▼
 7. PUBLICACIÓN ─ fecha real, llega tarde (12 h), retiradas y        → docs/03-SELECCION.md (pasos 10 a 13)
   │              correcciones a mano, foto del banco                  docs/05-FOTOS.md
   ▼
 8. WEB ─ web/data/*.json → Next.js estático → Cloudflare Pages      → docs/06-WEB.md
   │      (portada de 36 h, archivo de 180 días, dirección fija)
   ▼
 9. REDES ─ Facebook (posteo + espejo en Instagram) y piezas de      → docs/07-REDES.md
   │        video con voz (clima, farmacia, tres podcasts)             (CRITERIO-REDES.md)
   ▼
10. VIGILANCIA ─ mira la web, las corridas y las redes;               → docs/08-INFRAESTRUCTURA.md
                 WhatsApp a las 21 y cuando algo falla
```

Lo que queda alrededor: dónde corre cada cosa, los secretos y lo que cuesta
(`docs/08-INFRAESTRUCTURA.md`); el panel de la PC (`docs/09-PANEL.md`); las
reglas numeradas y las pruebas que las cuidan (`docs/10-REGLAS-Y-PRUEBAS.md`);
qué hacer a mano cada día y cuando algo falla (`docs/11-OPERACION.md`); cada
archivo del repositorio (`docs/01-ARBOL.md`); las palabras propias
(`docs/12-GLOSARIO.md`).

## Cada cosa, un solo lugar

Una regla o un número vive en **un** lugar; los demás documentos remiten.

| Qué | La fuente única | Cómo se cuida |
|---|---|---|
| El criterio editorial (qué se publica, cómo se escribe, fuentes, verificación, firma) | `CRITERIO-EDITORIAL.md` | La IA lee su § 12 tal cual (`ingesta/prompt-editorial.mjs`); `pruebas/criterio.test.mjs` |
| Los números del criterio (largos, topes, medios que pide lo de afuera, cupos, horas, Facebook, podcasts, contrato) | `ingesta/criterio.mjs` **y** la tabla "Los números" de `CRITERIO-EDITORIAL.md` | `pruebas/criterio.test.mjs` controla que digan lo mismo |
| Cómo suenan y qué dicen las piezas de redes | `CRITERIO-REDES.md` | `redes/prompt-redes.mjs` lo lee tal cual; `pruebas/redes-criterio.test.mjs` |
| Las fuentes | `ingesta/fuentes.mjs` y `ingesta/fuentes-cruce.mjs`; `FUENTES.md` es el registro **generado** (`node ingesta/listar-fuentes.mjs`) | `pruebas/fuentes-registro.test.mjs` |
| Lo que la IA sabe de Balcarce | `ingesta/perfil-balcarce.md` (sólo datos seguros) | Lo lee `ingesta/lectura-ia.mjs` |
| Las reglas numeradas y qué prueba cuida cada una | `docs/10-REGLAS-Y-PRUEBAS.md` | Las pruebas de `pruebas/` |
| Lo que falta hacer | `PENDIENTES.md` (con quién y urgencia) | — |
| Las ideas de producto | `IDEAS.md` | — |
| La identidad visual (colores, letras, íconos, plantillas) | `MEDIA-KIT.md` | `pruebas/titulos-colores.test.mjs`, `pruebas/tipografia.test.mjs` |
| Las medidas de imagen y video de cada red | `redes/formatos.mjs` (y `FORMATOS.md`, el porqué) | `pruebas/formatos.test.mjs` y la auditoría de los lunes |
| Las biografías de las redes | `PERFILES.md` | `pruebas/perfiles.test.mjs` |
| Lo legal | `INVESTIGACION.md` | — |
| El texto de la política de privacidad | `web/app/politica-de-privacidad/page.js` (`POLITICA-PRIVACIDAD.md` es la copia de referencia) | — |

## Todos los documentos

### En `docs/` (cómo funciona, escrito desde el código el 28/09)

| Documento | Qué cuenta |
|---|---|
| `docs/00-INDICE.md` | Este índice |
| `docs/01-ARBOL.md` | Cada carpeta y cada archivo versionado: qué hace, quién lo llama y si está en uso |
| `docs/02-INGESTA.md` | De dónde salen las noticias: las fuentes, cómo se leen, las fechas, el filtro de entrada, el cruce de medios, cómo queda armada cada historia y el texto completo de la nota original |
| `docs/03-SELECCION.md` | Qué sale, dónde y cuándo: sección, puntaje, semáforo, "de acá", medios y cupos de lo de afuera, la lectura con IA, la fecha, "llega tarde", la decisión final, las ventanas y las retiradas y correcciones a mano |
| `docs/04-REDACCION.md` | Cómo escribe la IA, cada control del verificador, los arreglos automáticos, el nivel de verificación, "sin cuerpo no se publica", cómo escribir un cuerpo a mano y la firma |
| `docs/05-FOTOS.md` | El banco de fotos: cómo se elige una foto sin marca de agua, Wikimedia, qué se guarda, dónde se muestra y dónde no |
| `docs/06-WEB.md` | Cómo se arma el sitio: `generar-datos.mjs` paso a paso, los archivos de `web/data/`, la tapa, las páginas, el archivo de 180 días, la dirección fija, las notas propias, el SEO y el diseño |
| `docs/07-REDES.md` | Facebook e Instagram: el interruptor, los posteos y el espejo, el reloj, las piezas, los podcasts, el contrato del día, el libro, la conexión con Meta y las auditorías |
| `docs/08-INFRAESTRUCTURA.md` | Qué corre dónde: los trece workflows, cron-job.org, Cloudflare, GitHub, las claves de IA y sus topes, todos los secretos por nombre, la vigilancia, los vencimientos y lo que cuesta |
| `docs/09-PANEL.md` | El tablero de la PC: arrancarlo, las pestañas, qué pasa cuando alguien decide, cómo sube a GitHub, el respaldo, la agenda paso a paso y cómo se podría pasar a online |
| `docs/10-REGLAS-Y-PRUEBAS.md` | **Las reglas numeradas** (1 a 70), qué prueba cuida cada una, el mapa de `pruebas/` y la regla de la prueba después del error |
| `docs/11-OPERACION.md` | El manual de uso diario: los enlaces, corregir, retirar, escribir cuerpos, prender o apagar las redes, publicar una pieza, qué mirar cuando algo deja de salir |
| `docs/12-GLOSARIO.md` | Cada palabra propia del proyecto, con su definición y dónde vive |

### En la raíz

| Documento | Qué cuenta | ¿Fuente única de qué? |
|---|---|---|
| `CLAUDE.md` | Lo que Claude lee al empezar cada sesión: qué es, reglas que no se negocian, cosas que muerden, cuentas, dónde tocar cada cosa | De las instrucciones para Claude |
| `CRITERIO-EDITORIAL.md` | **El criterio editorial único**: qué entra, semáforo, cómo se escribe, fuentes, verificación, qué ve el lector, notas propias, redes, firma, los números y la instrucción exacta de la IA (§ 12) | Del criterio editorial. La IA lo lee tal cual |
| `CRITERIO-REDES.md` | **El criterio único de las redes**: identidad, la voz, una ficha por pieza, las reglas de toda pieza, los números y las instrucciones de voz | De cómo suenan las redes. El código lo lee tal cual |
| `FUENTES.md` | Las 218 fuentes (214 activas): dónde se leen, ciudad, tipo, sección, peso, si son oficiales y cómo se usan en el cruce | **Generado** desde el código: no se edita a mano |
| `PENDIENTES.md` | Todo lo que falta, con quién y qué tan urgente | De lo pendiente |
| `IDEAS.md` | Ideas de producto y de sistema, para discutir | De las ideas |
| `MEDIA-KIT.md` | Toda la identidad visual junta: colores, tipografía y su sistema, íconos, medidas, plantillas | De la identidad visual |
| `FORMATOS.md` | Las medidas de imágenes y videos de cada red y su porqué, con la auditoría semanal | Los números viven en `redes/formatos.mjs` |
| `PERFILES.md` | Las biografías, categorías y colores de las redes | De las biografías |
| `PARA-CARGAR-A-MANO.md` | Las tareas para pegar a mano en Instagram y Facebook, con el texto listo | Resumen de acción de `PERFILES.md`, `MEDIA-KIT.md` y `FORMATOS.md` |
| `SEO.md` | Posicionamiento: qué está hecho, cómo se audita, qué falta | Del estado del SEO |
| `PUBLICIDAD.md` | Los tres avisos, las reglas que no se negocian, AdSense y cómo se piensa vender | De la publicidad |
| `COMERCIAL.md` | La base de comercios de Balcarce (aparte del sitio), la vigencia y las propuestas | De la base comercial |
| `INVESTIGACION.md` | Lo legal, con sus fuentes (18/09, revisado el 25/09) | De lo legal |
| `POLITICA-PRIVACIDAD.md` | Copia de referencia del texto de `/politica-de-privacidad` y qué se hace con los datos del buzón | La fuente es la página |

### En otras carpetas

| Documento | Qué cuenta |
|---|---|
| `web/README.md` | Cómo correr la web en la PC; remite a `docs/06-WEB.md` |
| `ingesta/README.md` | Cómo correr el motor a mano; remite a `docs/02-INGESTA.md` |
| `ingesta/perfil-balcarce.md` | Lo que la IA de lectura sabe de Balcarce (lo lee tal cual) |

### Históricos (`docs/historico/`, no se mantienen)

Fotos de un día o de un plan. Lo que dicen puede ya no valer, y nombran
documentos que se retiraron el 28/09 (`REGLAS.md`, `REDES.md`, `MANUAL.md`…):
lo vigente está en `docs/`.

| Documento | Qué cuenta |
|---|---|
| `docs/historico/HISTORIA.md` | Qué se hizo y por qué, con fecha, hasta el 25/09 |
| `docs/historico/AUDITORIA.md` | La auditoría del 25/09 y qué quedó arreglado |
| `docs/historico/INVESTIGACION-COMPETENCIA.md` | Lo que hacen los otros medios (18/09, revisado el 25/09) |
| `docs/historico/CRUCE-DE-MEDIOS.md` | La medición del 27/09 que llevó al cruce de medios (90 medios, 2.664 notas en 24 horas) |
| `docs/historico/PLAN-V2.2.md` | El plan del 27/09 para elegir mejor las notas (filtro de entrada, lectura con IA, notas populares) y su hoja de ruta |

**Retirados el 28/09** (su contenido vigente pasó a `docs/`): `REGLAS.md` →
`docs/10-REGLAS-Y-PRUEBAS.md`; `REDES.md` → `docs/07-REDES.md`;
`INFRAESTRUCTURA.md` → `docs/08-INFRAESTRUCTURA.md`; `PANEL.md` →
`docs/09-PANEL.md`; `EMPEZAR-ACA.md` → `docs/11-OPERACION.md`; `MANUAL.md` →
`docs/02` a `docs/06`; `docs/RADAR-3.0.md` → este índice, `docs/12-GLOSARIO.md`
y los documentos de cada área.

## La historia corta

| Fecha | Qué |
|---|---|
| 18/09 | Primer commit: motor, panel, piezas y la web |
| 20–23/09 | Las secciones salen solas; cron-job.org como reloj; dominio propio; Meta conectado; reescritura con IA 100 % en la nube; avisos desde el panel; espejo de Facebook en Instagram; turno de farmacia a las 8:30 |
| 22–24/09 | Meta bloqueó la API; se destrabó el 24/09 |
| 24/09 | Cloudflare Pages; Search Console; tres podcasts en lugar de noticias sueltas; Vigilancia; texto completo para la IA; el panel sincroniza solo |
| 25/09 | Auditoría: repositorio público, WhatsApp andando, clave gratis de redacción, enlaces que no se rompen (archivo de 180 días), sin cuerpo no se publica, el lector ve la nota, criterios únicos, notas propias, agenda con página, contrato del día |
| 26/09 | App de Meta publicada; Policiales sólo de Balcarce; fuentes para las secciones flacas; historias de hasta 58 s |
| 27/09 | Plan V2.2: filtro de entrada, la lectura con IA decide, el cruce de medios (160 fuentes más), lo de afuera medido en medios, Fútbol y Argentina, títulos sin "en Balcarce", correcciones y retiradas a mano, `FUENTES.md`, Source Serif 4 e Inter |
| 28/09 | Portada de 36 horas y 12 para estrenar; fecha única de cada nota; "de acá" con una sola definición; lo copiado de afuera espera a la IA; el banco de fotos en la web; Groq de respaldo; la nota del dólar sólo si se mueve 2 %; "Hoy en Balcarce" y `/clima`; plantillas nuevas de redes; trece arreglos encontrados al documentar; esta documentación |

El detalle, con fechas, en `docs/historico/HISTORIA.md` (hasta el 25/09) y en
los mensajes de los commits.

## Cómo se mantiene esta documentación

- **Se cambia el código, se cambia el documento de su área** en el mismo
  commit. Si es una regla nueva, va en `docs/10-REGLAS-Y-PRUEBAS.md` con el
  número siguiente y su prueba.
- **Un criterio editorial** se cambia en `CRITERIO-EDITORIAL.md` (y sus
  números, también en `ingesta/criterio.mjs`), no en el código ni en otro
  documento.
- **Una fuente** se cambia en `ingesta/fuentes.mjs` o `ingesta/fuentes-cruce.mjs`
  y después se corre `node ingesta/listar-fuentes.mjs`.
- **Un archivo nuevo** se suma a `docs/01-ARBOL.md`; **una palabra nueva**, a
  `docs/12-GLOSARIO.md`; **algo que falta**, a `PENDIENTES.md`.
- **`CLAUDE.md`** se mantiene corto y exacto: remite acá en vez de repetir.

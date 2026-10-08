# Orden de trabajo · lista completa

*8/10/2026. Junta todo lo anotado: la auditoría propia, la revisión archivo por archivo, la de SEO, las tres
auditorías externas y lo que decidieron Hernán y Andrés. Va **de lo más crítico a lo menos**, sin dejar nada
afuera, aunque sea chico. El detalle de cada punto está en [`MEJORAS.md`](MEJORAS.md) e
[`IDEAS-NUEVAS.md`](IDEAS-NUEVAS.md) (columna "Dónde"). Desde el 8/10 se trabaja en este orden y lo hecho queda anotado en
"Avance" (abajo). Lo que toca reglas que no se negocian o requiere una decisión espera a ustedes.*

**Cómo se ordenó:**
1. Lo que ya publica algo mal o rompe la web.
2. Lo que toca reglas que no se negocian (menores, víctimas, fotos).
3. Lo que tiene fecha.
4. Lo que puede hacer perder datos o la cuenta.
5. Google y las redes.
6. Calidad y orden.
7. Pulido.
8. Plataforma.
9. Ideas nuevas.

**"Quién"**: C = lo hace Claude con su visto bueno · P = lo hace una persona · D = decisión de ustedes.

## Avance

*Se completa a medida que se trabaja. Cada cambio sube a `main` con las pruebas en verde.*

| # | Qué se hizo | Cuándo | Commit / regla |
|---|---|---|---|
| 2 | La prueba de las retiradas acepta una lista vacía; se simuló el lunes 12/10 (la poda deja cero) | 8/10 | `c764736` |
| 1 y 25 | La corrección automática de la auditoría **sólo corrige la tilde que falta en una palabra**, nunca estira un texto y no cambia el sentido. Se reparó "en en en…" (nota `1uh42rm`) y "compiránnn…" (`1c7wqua`) y se revirtieron 13 cambios que alteraban lo que decía la nota; quedaron los 4 pares correctos | 8/10 | `16ca292`, regla 108 |
| 28 | Se borraron dos celulares personales de `docs/historico/HISTORIA.md` (siguen en el historial de git) y se quitó la línea `Host:` del robots | 8/10 | `5bc00d7` |
| 18 | Parche de las herramientas de armado (sharp, source-map-js); el sitio compila. **Falta:** el aviso de fin de parches de Next 15 sólo se resuelve pasando a Next 16 (cambio grande, a decidir) | 8/10 | `5bc00d7` |
| 14 | Un archivo de datos roto corta la corrida en vez de leerse como vacío (archivo de notas, libro de redes, armado del sitio) y no se guarda un archivo con más de 20 % menos notas | 8/10 | regla 110 |
| 15 | Una corrección hecha después de aprobar una nota ya no se deshace, y la poda de los lunes no suelta una retirada que sigue aprobada | 8/10 | regla 111 |
| 20 | El tope de notas con página subió a 3.500 y lo que sale del archivo va al histórico por mes (`web/data/historico/`); el plazo de la subida a Cloudflare pasó de 15 a 25 minutos. **Falta:** armar las notas viejas en el momento (más allá de 3.500) y mover las fotos a un depósito | 8/10 | regla 111 |
| 17 | Los 22 robots quedaron fijos en Ubuntu 24.04 (no `ubuntu-latest`), así el cambio del 19/10 no los agarra de sorpresa. **Falta:** probar un robot con Ubuntu 26 a propósito y pasar de a poco | 8/10 | prueba `workflows-fijos` |
| 30 | "Crear voces" no borra las dos voces de producción sin escribir una confirmación, y el formulario dice cuántos audios gasta cada modo | 8/10 | prueba `workflows-fijos` |
| 13 y 4 | Las pruebas ya no leen los feriados ni las efemérides vivos: usan copias fijas (`pruebas/datos-fijos/`). Se simularon cuatro escenarios (cambiar el feriado, sacar una efeméride, armar noviembre, vaciar correcciones y retiradas) y ninguno hace fallar una prueba. **Ya se puede tocar el feriado del 12/10 y la efeméride del 11/10 desde el celular** | 8/10 | regla 112 |
| 16 | Las 296 páginas sin cuerpo llevan `noindex, follow` (verificado con un armado completo). **Falta:** la parte de "una sola fuente sin aporte" (necesita el jefe editor) | 8/10 | regla 113 |
| 27 | Los reels cierran el posteo con «Voz generada con inteligencia artificial.» (texto, sin etiqueta de Meta). **Falta:** probar el campo `is_ai_generated` de Instagram (sólo búsqueda; decidido que por ahora va en texto) | 8/10 | regla 114 |
| 10 | Una foto que la IA no evaluó (marca y menor) ya no se elige | 8/10 | regla 115 |
| 7 (parte) | Las pistas del panel rechazan a un menor dicho por su edad ("un nene de 6 años"). **Falta, con su visto bueno:** las edades y los verbos en la lista roja del semáforo de las notas (no se toca sin preguntar) | 8/10 | regla 116 |
| 23 (parte) | Si la portada tiene más de 2 horas, las redes no arman el clima, los avisos ni la farmacia. **Falta:** la parte de la web (turno de farmacia en el navegador y fecha en el pie) | 8/10 | regla 117 |
| — | **Tropiezo y arreglo (8/10, 12:30):** al subir el histórico, la corrida de las 12:30 falló en "Guardar si cambió algo" (el `git add` nombraba una carpeta que todavía no existía). Se arregló en 4 minutos, se disparó a mano la actualización y quedó verde; ahora una prueba controla que todo lo que nombra ese `git add` exista. La web quedó con los datos de las 12:04 durante una media hora | 8/10 | `e86e9be` |
| 18 (aclaración) | La web ya está en Next 15.5.27 (la última de la línea 15). Lo que queda es pasar a Next 16 antes de que la línea 15 deje de recibir parches (21/10 según la auditoría); no corre riesgo el lector, sólo el armado | 8/10 | `5bc00d7` |
| 3b | "Publicar" del celular ya no saca solo un tema delicado ("necesita ojo humano"): muestra el borrador para que una persona lo lea. La firma "revisada por una persona" para lo que se aprueba a ciegas queda para el panel nuevo | 8/10 | regla 120 |
| 136 | **Respaldo semanal armado** (`respaldo.yml`): bundle con todo el historial y copia de datos y fotos como archivos de la corrida; espejo a GitLab y copia a R2 listos para activarse con una cuenta y un token. El vigilante avisa si falta. **Falta de ustedes:** crear el proyecto de GitLab y activar R2, ver [`PASOS-PARA-USTEDES.md`](PASOS-PARA-USTEDES.md) | 8/10 | regla 121 |
| 132 | **Fotos a R2, etapa 1 preparada**: `FOTOS_BASE` (una variable cambia de dónde cargan las fotos las páginas) y el workflow "Fotos a R2" que copia las 592 fotos. **Falta de ustedes:** el depósito, el dominio `fotos.radarbalcarce.com` y las dos variables ([pasos](PASOS-PARA-USTEDES.md)) | 8/10 | regla 122 |
| — | El verificador compara exacto los años ("2019" ≠ "2024") y mira cada acusación en su propia oración (I-2 e I-3). Ninguna de las 1.097 notas publicadas cambia | 8/10 | regla 128 |
| — | El aviso de helada mira la mínima de la madrugada que viene (antes usaba la de hoy, que ya había pasado) | 8/10 | regla 129 |
| 53 y 41 | La lista roja tiene huella en una prueba (nadie la cambia sin querer) y los títulos de sección se arreglaron ("Balcarce en Balcarce" → "Noticias de Balcarce"). **Título de la pestaña de la nota (40):** se deja en 60 caracteres porque fue una decisión del 29/09; si prefieren más largo, es un número | 8/10 | regla 130 |
| 130 (hecho) | **"Su recorrido"** en cada nota del panel: de dónde entró, por qué esperó, quién la escribió y aprobó, adónde salió (sin inventar lo que no se sabe) | 8/10 | regla 127 |
| 130 (hecho) | **Pestaña Borradores** del panel (en "Más" y desde "Hoy"): todo lo que se le pidió a la IA, para leer y ya resuelto. Siguen el calendario de Fechas y lo frenado en rojo | 8/10 | regla 126 |
| 130 (hecho) | **Pantalla "Hoy" del panel del celular** (primera de la barra): lo que espera tu toque, los borradores, las notas sin foto, cómo viene el día en las redes y las pistas con novedad. Fotos pasó a Más. El panel de la PC queda en desuso (nunca se usó). Probado en un navegador real. Siguen, de a poco: Borradores, el recorrido de una nota, el calendario de Fechas y lo frenado en rojo | 8/10 | regla 125 |
| 130 | Panel de la PC: decisión de hacerlo de nuevo registrada, con qué pasa con cada pestaña y el orden de construcción: [`PANEL-NUEVO.md`](PANEL-NUEVO.md). No se construyó todavía | 8/10 | — |
| 22 (parte) | **Un mismo audio no se pide dos veces**: memoria de voces (texto + voz + estilo) guardada en la caché de Actions; una pieza armada de nuevo reusa el audio y no gasta el cupo de 10 por día. **Falta:** preguntar a Meta antes de reintentar las historias y el tope de pedidos por pieza | 8/10 | regla 123 |
| 39 | `robots.txt` ya no bloquea el feed (`/feed.xml`); sigue bloqueado `/panel/` | 8/10 | prueba en `seo-paginas.test.mjs` |
| 43 (parte) | El vigilante mira también Armado con datos vacíos, Pruebas con otra hora, Auditoría IA y Pistas; todos los workflows dicen sus permisos y tienen tope de tiempo; el proyecto pide Node 24. **Falta:** el aviso de afuera si el vigilante mismo se cae (Healthchecks) y un segundo canal | 8/10 | regla 124 |
| 8 | **Lo rojo ya no sale con el texto que lo puso en rojo, aunque lo apruebe una persona**; si la persona lo reescribe y el texto ya no toca la lista roja, sí puede salir (para los falsos positivos) | 8/10 | regla 119 |
| 7, 9 | **Semáforo mejorado** (autorizado por Hernán y Andrés): formas que faltaban de rojo y de muerte, edad de menores, aviso fúnebre como "nunca" y la nota hereda el peor color al juntarse. Ninguna de las 1.083 notas publicadas cambia de color. **Sigue abierto:** que lo rojo aprobado a mano no salga (C-10) y "Publicar" del celular | 8/10 | regla 118 |
| 7 (estudio) | Se escribió cómo funciona hoy el semáforo, con ejemplos comprobados, para decidir juntos: [`SEMAFORO-HOY.md`](SEMAFORO-HOY.md). No se cambió nada | 8/10 | — |
| 47 | **Reintentar respeta la franja horaria**: el botón del celular no sube una pieza fuera de su hora ni la de otro día, y dice por qué (antes se podía subir a las 21 el clima de la mañana) | 8/10 | regla 131 |
| 132-136 | **Cuarta auditoría externa leída y contrastada**: acierta en lo central (fotos a R2, datos fuera de git, panel unificado, respaldo) y casi todo ya estaba decidido; se armó un plan por etapas en [`registro/AUDITORIA-EXTERNA-4-ARQUITECTURA-2026-10-08.md`](registro/AUDITORIA-EXTERNA-4-ARQUITECTURA-2026-10-08.md). No se aplicó nada: necesita tarjeta y token de Cloudflare | 8/10 | — |
| — | Se llevó a `docs/propuestas/material/` todo lo generado en la auditoría que se puede ver en la PC: las tres páginas explicativas, las dos maquetas del panel nuevo y los ocho videos de ejemplo (el detalle de seguridad y los montos quedan sólo en la página privada) | 8/10 | [`material/LEEME.md`](material/LEEME.md) |
| 3 y 11 | Se sacó la foto de *El Eco de Tandil* de la nota `fd2y4d` y Policiales sin fuente oficial ya no lleva foto real aunque venga del banco o del panel | 8/10 | `e5ccab5`, regla 109 |

---

## P0 · Crítico: ya está pasando o pasa en días

| # | Qué | Por qué | Dónde | Trabajo | Quién |
|---|---|---|---|---|---|
| 1 | Frenar la corrección automática y arreglar las dos notas rotas ("en en en…", "compitiránnn…") | Rompe notas publicadas cada media hora | C-0 | 30 min | D + C |
| 2 | Que la prueba de las retiradas acepte una lista vacía | El **lunes 12/10** se congela la web | C-1 | 5 min | D + C |
| 3 | Sacar la foto de *El Eco de Tandil* de la nota de Policiales `fd2y4d` | Rompe la regla de fotos, está publicada | C-13 | 5 min | D + C |
| 3b | "Publicar" de un toque en el celular: que muestre el texto antes (no publicar sin leer lo delicado) y que la firma diga la verdad | Notas delicadas salen sin que nadie las lea | C-19 | 2 h | D + C |
| 4 | No tocar en el celular el feriado del 12/10 ni la efeméride del 11/10 | Congela la web | C-18 | — | P |
| 5 | Mirar en Search Console cuántas páginas tiene Google | Define cuán urgente es lo de Google (#16) | SEO | 10 min | P |
| 6 | Mirar en Cloudflare qué bloquea a los lectores automáticos, y decidir si se deja leer a los buscadores con IA | Una auditoría externa quedó bloqueada; el sitio tiene `llms.txt` para que lo lean | Auditoría 3 | 15 min | P + D |

## P1 · Alta: reglas que no se negocian, seguridad, pérdida de datos y fechas cercanas

| # | Qué | Por qué | Dónde | Trabajo | Quién |
|---|---|---|---|---|---|
| 7 | Huecos del semáforo: edades de menores, formas de verbos ("murieron", "suicidarse"), "denuncia" en Policiales | Una nota con un chico o una víctima puede salir sola | C-12 | 3-4 h | D + C |
| 8 | Que lo rojo no salga nunca, ni aprobado por una persona | Regla de menores y víctimas | C-10 | 1 h | D + C |
| 9 | Al juntar notas del mismo hecho, que gane el peor semáforo; mirar todos los títulos del grupo | Hoy puede ganar la verde | C-12 (rel.) | 2 h | C |
| 10 | Una foto sin revisar no cuenta como "sin marca y sin menor" | Puede salir una foto no revisada | I-4 | 1 h | C |
| 11 | No dejar subir foto real en Policiales sin fuente oficial; el banco tampoco | Lo que causó #3 | C-13 | 2 h | C |
| 12 | Regla general de seguridad: ningún script de terceros en la web hasta separar el panel | Riesgo grave del panel | C-2 | — | D |
| 13 | Pruebas con datos propios, y separar el control de cada media hora de las pruebas completas | Nada de lo que toque una persona puede congelar la web; además armar noviembre la congela | C-18, C-7, T-1 | 1 día | C |
| 14 | Un archivo de datos roto no puede vaciar el sitio (con guardia del 20 %) | Ya pasó el 25/09; se pierden 180 días | C-5 | 3 h | C |
| 15 | Una corrección no se deshace sola; una retirada no vuelve | Puede volver el nombre de una víctima | C-14 | 2 h | C |
| 16 | **Google:** `noindex` a las 296 páginas sin cuerpo y a lo derivado de **una sola** fuente sin aporte; lo de varias fuentes con dato propio se deja. **Decidido:** no hace falta que lo nacional tenga ángulo de Balcarce | Riesgo de que Google castigue todo el sitio | S-1, W-5 | 3 h | C |
| 17 | Probar los robots con Ubuntu 26 y las acciones nuevas | Cambia el **19/10** | C-4 | 2 h | C |
| 18 | Parche de seguridad de Next 15 | Sin parches desde el **21/10** | C-3 | 1 h | C |
| 19 | Efemérides: corrida del día 20 con aviso; decidir las piezas fijas antes del 25/10 | El **1/11** se acaban | C-17 | 1-2 h | D + C |
| 20 | Subir el tope de notas y mandar al histórico lo que hoy se borra | Cerca del **2/11** se empiezan a perder notas | C-6 | 2 h | C |
| 21 | Juegos Bonaerenses: lista de finalistas de Balcarce | Son del **19 al 23/10** | DEP-1 | 1 h + persona | P + C |
| 22 | Reintentos de redes que gastan voz o duplican posteos | Una falla puede comerse los 10 audios | C-16 | 1 día | C |
| 23 | Si la web se congela, que la farmacia y el clima de redes no salgan viejos | Manda gente a una farmacia que no está de turno | C-15 | 4-6 h | C |
| 24 | Pistas que salen solas: mismas reglas que todo lo demás (sin borrador pendiente, medios argentinos, menos de 12 h, sección correcta) | Dos están intentando salir | C-11 | Medio día | C |
| 25 | Que la corrección automática sea real: una sola vez, solo tildes y letras dobles; el resto a Revisión | Para que #1 no vuelva | C-0 | 2-3 h | C |
| 26 | Sacar del archivo público el seguimiento comercial, antes del primer mensaje a un comercio | Quedaría a la vista de todos | C-8 | 1 h | C |
| 27 | Aviso de voz con IA como texto en el posteo | Lo pide Meta; decidido como texto | C-9 | 1 h | C |
| 28 | Borrar dos celulares personales de un documento público | Datos de terceros | M-5 | 5 min | C |
| 29 | Pedir aprobación para que corran pull requests de afuera | Ajuste de seguridad del repositorio | V2-21 | 5 min | P |
| 30 | Crear voces no puede borrar las de producción | Una voz borrada no vuelve igual | R-1 | 1 h | C |

## P2 · Importante: Google, redes y lo que más se ve

| # | Qué | Dónde | Trabajo | Quién |
|---|---|---|---|---|
| 31 | **Locución con memoria del día** (cómo está el día, qué saludo ya se usó, qué viene después). **Aprobada** | Ideas | 1-2 días | C |
| 32 | **Videos animados y unificados** para todas las piezas, con subtítulos. **Aprobado**; se repasan juntos la semana que viene | Ideas | 3-5 días | D + C |
| 32b | **El plan de redes completo** (videos, dónde sale cada pieza, memoria, aviso de IA, TikTok) está junto en Ideas, sección 7 | Ideas | — | — |
| 33 | **Reels:** clima y farmacia como reel en Facebook (en Instagram, historia); lo demás con voz, reel en las dos; medir 4 semanas | Ideas | 1 día + medir | C |
| 33b | **Jefe editor** para las notas con 3+ fuentes (sin Política ni Policiales), con **fichas de contexto** verificadas; arranca con Gemini y se prueba con 30 notas reales. Haiku o Sonnet, cuando haya cuenta | Ideas 4c, MEJORAS "Modelos de IA" | 2-3 días + prueba | D + C |
| 33c | **Segunda opinión de fotos** con otro modelo (hoy, Gemini más lectura de texto y detección de caras; Haiku, cuando haya cuenta). Si cualquiera ve marca o menor, sale placa | MEJORAS "Modelos de IA" | 1 día | C |
| 33d | **Notas viejas sin cuerpo (decidido 8/10):** `noindex` a las 296 y reescribir solo las de Balcarce y las de redes en un lote | MEJORAS "Notas viejas" | 3 h + 1 día | C |
| 33e | *(Más adelante)* **Cuenta de Anthropic** con crédito y tope mensual; hoy no hay | MEJORAS "Modelos de IA" | 20 min | P |
| 33f | **Revisar si las reglas y el verificador son coherentes** y cómo se aplican a una nota hecha de varias fuentes; duplicados (**auditoría en curso**) | Auditoría | 1-2 días | C |
| 33g | **Línea editorial** escrita en el criterio (centro y centro-derecha, tono neutral): hay un borrador en Ideas 4c | Ideas 4c | 1 h | D + C |
| 33h | **Duplicados** (hoy 3,4 %, antes 9,3 %): segunda pasada en el cruce, fusión sin IA, no retirar una nota si el destino no tiene página, mega-temas con tope | MEJORAS "Reglas y verificador" | 2-3 días | C |
| 33i | **Menos rechazos de forma:** números en palabras, fechas de las fuentes, negación, "promesa", corrección parcial (35 de 81 rechazos son de forma) | MEJORAS hallazgos 2 a 6 | 2-3 días | C |
| 33j | **"ALTA" y "N medios" solo con fuentes leídas**, no con medios que la IA nunca vio | MEJORAS hallazgo 1 | 1 día | C |
| 33k | **Huecos del verificador:** nombres que abren una oración, delitos conjugados, revalidar con el mismo material | MEJORAS hallazgos 7 a 9, I-2, I-3 | 1-2 días | C |
| 33l | **Jefe editor, diseño y 14 pruebas** (afirmaciones con sus fuentes, contexto con fecha, regla para indexar) | Ideas 4c | 3-4 días | D + C |
| 34 | La fecha que va a Google: la de cuando sale en la web, no la de la fuente | S-2 | 3 h | C |
| 35 | "Balcarce" en las notas locales (bajada, descripción y título, solo con datos que están en la fuente) | S-3, auditoría 3 | 3 h | C |
| 36 | La foto real para Google en tres proporciones | S-4 | 4 h | C |
| 37 | Confianza: **"Quiénes somos" con los nombres de los creadores (en una o dos semanas)**, página "Cómo trabajamos y cómo usamos la IA", correcciones visibles con fecha | S-5, V2-12 | 3 h + decisión | D + C |
| 38 | Firma honesta de lo que escribió Claude | W-4 | 1 h | D + C |
| 39 | Destrabar el feed en `robots.txt` | V2-13 | 5 min | C |
| 40 | Títulos de la pestaña enteros (sin "…") | SEO | 30 min | C |
| 41 | Títulos de sección bien escritos (no "Argentina en Balcarce") | SEO | 1 h | C |
| 42 | Regla contra títulos sensacionalistas en el criterio | S-1 | 30 min | D + C |
| 43 | El vigilante mira todos los robots; aviso de afuera si el vigilante se cae (Healthchecks) y un segundo canal (ntfy) | A-4, A7, M-3 | 3 h | P + C |
| 44 | Mismo volumen en todos los audios (`loudnorm`) | Herramientas | 30 min | C |
| 45 | Que el control de textos de redes corra antes de gastar la voz; lista completa de medios | R-5 | 2 h | C |
| 46 | El contrato y el vigilante miran todas las piezas (efeméride, feriado, participá…) | R-4 | 2 h | C |
| 47 | Reintentar no publica fuera de su franja horaria | R-3 | 1 h | C |
| 48 | Pedidos del celular que se cancelan solos (candados) | A-3, P-5, R-2 | 2-3 h | C |
| 49 | El robot no pisa lo que decidió una persona en las pistas | P-2 | 3 h | C |
| 50 | El texto de las pistas, cifrado (hoy queda público) | P-3 | 1 día | C |
| 51 | Tope de búsquedas de las pistas (Tavily) | P-4 | 2 h | C |
| 52 | El WhatsApp de las 21: commits de código del día y qué decidió cada persona | A-5, M-2 | 3 h | C |
| 53 | Huella de la lista roja en una prueba (nadie la cambia sin querer) | T-2, M-7 | 30 min | C |
| 54 | Respaldo en cuatro lugares (GitHub, GitLab, Google Drive, la PC) | Respaldo | 3-4 h | P + C |
| 55 | Auditoría de fotos (controles, revisión semanal con IA, persona 15 min) | Auditoría de fotos | 1 día | C + P |
| 56 | Huecos del verificador: años cambiados, "mató" con "policía" en otra oración | I-2, I-3 | 2 h | C |
| 57 | Pista con un chico: no guardarla en el archivo público | I-6 | 30 min | C |
| 58 | El aviso de helada corrido una noche | I-7 | 1 h | C |
| 59 | El clima de respaldo no inventa "0 % de lluvia" ni la sensación térmica | I-8, W-7 | 1 h | C |
| 60 | Bing Webmaster e IndexNow (Bing alimenta a ChatGPT) | SEO | 2 h | P + C |
| 60b | Estadísticas: números por pieza de redes, filtrar robots, Search Console y resumen semanal | MEJORAS, "Estadísticas" | 1-2 días | C |
| 60c | **Panel del celular, arreglos chicos:** botón del borrador, textos que se contradicen, avisar antes de frenar algo | Panel | ~1 día | C |
| 60d | **Panel del celular, rediseño:** Hoy / Revisar / Borradores / Publicadas / Más, recorrido de cada nota, recibos de la nube | Panel | 10-12 días | D + C |
| 60e | **Efemérides y feriados del año, mes por mes**, con calendario en el panel | Panel | 3-4 días | C |
| 61 | Personas: una vez por semana mirar Search Console, las fotos manuales y 10 notas verdes contra su fuente | Varios | 45 min por semana | P |

## P3 · Mejoras medianas

| # | Qué | Dónde | Trabajo |
|---|---|---|---|
| 62 | Guardar los audios y videos de redes (subir la retención; después Cloudflare) | Q1 | 2 h + |
| 63 | Notas propias con audio en la web (clima, farmacia, efeméride, repasos), con enlaces a los reels | Ideas | 2-3 días |
| 64 | RSS de texto completo (cuerpo, imagen, autor, por sección) y RSS de audio para Apple y Spotify | RSS-1, RS-2 | 1 semana |
| 65 | Datos para Google del video (VideoObject) | Auditoría 3 | 2 h |
| 66 | Fotos, audios y videos a Cloudflare, en WebP y tres tamaños | R2-fotos, C1, C3 | 3-5 días |
| 67 | Armar el sitio una sola vez por ciclo; sacar las corridas de más; guardar la memoria del armado | A1, A8-b, A2 | 1-2 días |
| 68 | Guardar el 100 % de las notas año tras año (histórico + páginas para lo viejo) | C-6 | 1 semana |
| 69 | Buscador de todo el archivo (Pagefind) y sacar el buscador de cada página | W-12, Herramientas | 1 día |
| 70 | Fuentes tipográficas en el propio sitio | V2-8, SEO | 2 h |
| 71 | Política de privacidad completa y términos de uso | V2-8 | 3 h + abogado |
| 72 | Fuentes que fallan: guardar el motivo, reintentar una vez, tope por sitio, nombre honesto, apagar las que nunca andan, recuperar Puntonueve | B1, B2, B3, B4, B6, B5 | 2 días |
| 73 | Archivo de salud (fuentes, tiempos, duplicados, fotos repetidas) | N3, A6 | 1-2 días |
| 74 | Contar audios (aviso a 8 de 10) y tokens de IA por día | M1, D1-1, N5-6 | 4 h |
| 75 | Banco de fotos con etiquetas y reglas de repetición | C5+C4 | 2-3 días |
| 76 | Lo que se le pide a la IA, igual a lo que rechaza el verificador | P1-6 | 2-3 días |
| 77 | Reintento automático de historias, estadísticas por pieza, ffmpeg en caché | M3-4-7 | 2 días |
| 78 | Disparador propio en Cloudflare (en lugar de cron-job.org) | E2 | 1 semana |
| 79 | Fuentes locales nuevas, de a una, con regla | B7 | 1-2 días cada una |
| 80 | Efemérides: propuesta mensual automática | Efem | 2-3 días |
| 81 | Funciones repetidas, juntas en un solo lugar | V2-18 | 3 h |
| 82 | Páginas de notas más livianas | V2-14 | 1-2 días |
| 83 | Una sola forma de buscar en Wikimedia | P18-23 | 1-2 días |
| 84 | Accesibilidad: "saltar al contenido", textos alternativos reales, títulos de las postales | V2-15, W (chicos) | 2 h |
| 85 | Chequeo de enlaces e imágenes rotas cada semana (lychee) | N4 | 4 h |
| 86 | Arreglar las 9 fotos rotas | N1 | 1-2 h |
| 87 | 11 direcciones viejas que dan 404 | W-6 | 3 h |
| 88 | Una foto reemplazada se ve vieja hasta una semana | W-8 | 1 h |
| 89 | Si la ingesta vuelve casi vacía, no tocar la portada | W-10 | 2 h |
| 90 | Mensajes comerciales: concursos de habilidad, nada de canje por notas, teléfonos fijos | P-8, P-9 | 2 h |
| 91 | El logo de un aviso, guardado en el sitio | P-7 | 2 h |
| 92 | Una pieza fija se entera si cambió su texto | R-6 | 1 h |
| 93 | Mapa comercial con todas las localidades; separar instituciones de comercios | Com-1 | 1 día |

## P4 · Chicos y pulido

| # | Qué | Dónde |
|---|---|---|
| 94 | Sacar del horario en punto la auditoría semanal y ponerle tope de tiempo | N2, M-4 |
| 95 | Permisos de los workflows y acciones fijas | V2-20 |
| 96 | Declarar la versión de Node | T-4 |
| 97 | Borrar los sondeos viejos y sus scripts, y el disparo viejo de `fijar-piezas` | Sondeos |
| 98 | Corregir las contradicciones de los documentos (G1, redes, panel, efemérides, 06-WEB, docs/10) | G1, M-doc |
| 99 | Podar `PENDIENTES.md` e `IDEAS.md`; un léeme simple | G2 |
| 100 | Licencia del repositorio | V2-9 |
| 101 | Enlaces de las fuentes: aceptar solo http y https | V2-16 |
| 102 | `lastmod` honesto, `/tema` fuera del sitemap, la 404 sin indicaciones contradictorias, sacar `Host:` | SEO |
| 103 | Tope de redirecciones de Cloudflare | W (chicos) |
| 104 | Correr la web en una PC sin el panel no debe actuar como la nube | W-11 |
| 105 | Pruebas que no prueban nada, duplicadas o que no corren | T (chicos) |
| 106 | Clases de estilo que no se usan; números del criterio que nadie aplica | W, I (chicos) |
| 107 | Nombres de piezas en una sola lista; versión de Meta en un solo lugar | R (chicos) |
| 108 | Dos medios con el mismo nombre ("La Tecla") | I (chicos) |
| 109 | Agenda municipal que falla con un carácter raro; páginas en latin1 | I (chicos) |
| 110 | Probar el mail del sitio | M-6 |
| 111 | Avisos gratis de GitHub (dependencias, secretos) | A (chicos) |
| 112 | La foto manual firmada por quien la sumó; aviso si aparece un celular nuevo | P (chicos) |
| 113 | Fijar o registrar la versión del modelo de Gemini | D3 |
| 114 | No reintentar si el semáforo va a frenar lo mismo | P12 |
| 115 | Números del criterio iguales a los del código | P7-10 |
| 116 | Reglas del criterio que nadie hace cumplir: aplicar o borrar | P11-14-15 |
| 117 | Licencias de fotos NC y ND, cerradas | P17 |
| 118 | Fotos pendientes; rechazar miniaturas de Google | C8 |
| 119 | Vista previa de WhatsApp en JPG | C2 |
| 120 | Discutibles (ver antes de hacer): tildes que ya conoce el verificador (P13), podar el banco (C-banco), dependencias de la web (Deps), segunda clave de voz (D2), podar el libro de redes (M5-6) | Varios |

## P5 · Plataforma (más adelante)

| # | Qué | Dónde | Necesita |
|---|---|---|---|
| 121 | Repositorio privado con un servidor propio (unos US$ 5-6 por mes) | E1 | D + contratar |
| 122 | Cuentas y vencimientos: dominio por varios años, 2FA, Andrés como administrador, versión de Meta | S1 | P |
| 123 | Revisar los términos de privacidad de las IA gratis | D-priv | P |
| 124 | Comparar proveedores de IA y sumar un respaldo que no sea Google | D1, D4 | D |
| 125 | Una sola fuente por regla en el pedido a la IA | P-orden | — |
| 126 | Configuración por sección (base para las secciones nuevas) | F1-b | — |
| 127 | Partir los archivos más grandes | V2-19 | — |
| 128 | Auditoría semanal completa (Lighthouse, accesibilidad) | N7 | — |
| 129 | Bajar el ciclo a 15 minutos | Ciclo | — |
| 130 | **El panel nuevo**, único, que reemplaza al de la PC y al del celular actual. **Decidido el 8/10** (el de la PC se hace de nuevo y se congela el viejo). Plan por pestañas y por etapas en [`PANEL-NUEVO.md`](PANEL-NUEVO.md) | Decidido | Una reunión corta de diseño con la maqueta |
| 132 | **Arquitectura de datos (cuarta auditoría)**, etapa 1: fotos a Cloudflare R2 con una sola variable `FOTOS_BASE`. Antes del 2/12 | [registro](registro/AUDITORIA-EXTERNA-4-ARQUITECTURA-2026-10-08.md) | D + tarjeta y token en Cloudflare |
| 133 | Etapa 2: `archivo.json` y el histórico fuera de git (R2 por mes o D1) y las notas viejas armadas en el momento; el tope de notas deja de existir | ídem | D (R2 o D1) |
| 134 | Etapa 3: lo que cambia siempre (`vistas`, `estadisticas`, `fichas`, `banco-fotos`, `redes`…) fuera de git; las decisiones de personas se quedan | ídem | — |
| 135 | Etapa 4: un Worker de Cloudflare con Cron Trigger como segundo disparador (convive con cron-job.org) | ídem | P + token |
| 136 | Etapa 6: respaldo en GitLab, Google Drive y la PC (se pide aparte, **lo primero que conviene hacer**) | ídem | P |
| 131 | Herramientas a probar: recorte inteligente, lectura de marcas en fotos, detección de caras, lector de notas (trafilatura), subtítulos con Whisper, Vega, LanguageTool, pa11y, Dependabot y actionlint | Herramientas | — |

*Revisión con recordatorio: 15/12/2026 (archivo histórico, fotos y respaldo).*

---

## P6 · Ideas nuevas, por valor

### Contenido propio
| # | Qué | Estado de los datos | Dónde |
|---|---|---|---|
| 132 | Sello "Nota de Radar Balcarce" y una nota propia por semana (después dos) | — | Ideas 4b |
| 133 | Balcarce en números con datos comprobados: **nafta por estación** | Comprobado | ECO-1 |
| 134 | **TC y TC Pick-Up con Santiago Mangoni** | Comprobado | AUT-1 |
| 135 | **La plata que manda la Provincia** | Comprobado | POL-1 |
| 136 | **Balcarce en el mapa agrícola** | Comprobado | AGR-1 |
| 137 | **Así vota Balcarce** (rumbo a 2027) | Comprobado | POL-3 |
| 138 | **Las escuelas de Balcarce en números** | Comprobado en parte | EDU-2 |
| 139 | Farmacias de turno: por qué a veces no coincide | Datos propios | Ideas 4b |
| 140 | Qué se habla en Balcarce esta semana (WhatsApp) | Trabajo humano | Ideas 4b |
| 141 | Qué pasó finalmente con… (temas vivos con línea de tiempo) | Datos propios | V-8 |
| 142 | Semana del bolsillo y cuándo cobro | Trabajo humano | BAL-1, ARG-1 |
| 143 | ¿Hay clases? | Trabajo humano | EDU-1 |
| 144 | Inflación de la región y plazo fijo en los bancos de Balcarce | Fuente accesible | ECO-2, ECO-3 |
| 145 | Lector de boletines (semana en el Boletín, qué cambia desde hoy, retirados de la venta) | Fuente accesible | COM-4 |
| 146 | Ciencia hecha en Balcarce (INTA, Agrarias) | Fuente accesible | CYT-1 |
| 147 | Fútbol: el descenso de Aldosivi, el Federal A, la Liga Balcarceña | Accesible / persona | FUT-1, 2, 3 |
| 148 | Deportes: ligas de Mar del Plata, este finde | Accesible / persona | DEP-2, DEP-3 |
| 149 | Fangio con datos (camino al 57), Colapinto en datos, el zonal | Accesible / persona | AUT-2, 3, 4 |
| 150 | Agro: papa de la chacra a la góndola, Panorama Agrícola, remates, lluvia del INTA | Varios | AGR-2, 3, 4, 5 |
| 151 | Política: boletín municipal, votómetro del Concejo | Accesible / persona | POL-2, POL-4 |
| 152 | Salud: parte semanal, vacunación | Accesible / persona | SAL-1, SAL-3 |
| 153 | Perfiles de vecinos, entrevistas a comerciantes, voxpop, entrevista de 5 minutos | Trabajo humano | Ideas 4b, R-14, R-15 |
| 154 | Canasta mensual, termómetro del centro, mapa de baches, rutas | Persona / parte bloqueada | V-11, BAL-3, D-12, V-5 |
| 155 | Lo que hoy está bloqueado (volver a probar en un mes): delitos, empleo, conectividad, mapa cultural | Bloqueada | POC-1, TRA-1, CYT-2, CUL-2 |

### Web y servicios
| # | Qué | Dónde |
|---|---|---|
| 155b | **Prioridad a Balcarce en redes**, escrita en el criterio y medida | Ideas 4c |
| 155c | Corresponsales vecinos, notas de colaboradores, entrevistas online y presenciales con video | Ideas 4c |
| 155d | Videos de terceros (turistas, creadores) **solo con permiso**, con aporte y crédito | Ideas 4c |
| 156 | **El repaso como formato central** (web, reel, WhatsApp y mail) | Auditoría 3 |
| 157 | Clima por horas en `/clima` | Auditoría 3 |
| 158 | Mapa chico de la farmacia de turno | Auditoría 3 |
| 159 | Parte agroclimático | V-1 |
| 160 | Archivo permanente con "Hace un año en Balcarce" | V-9 |
| 161 | Micros y combis; rutas y niebla; mi barrio | V-4, V-5, V-6 |
| 162 | Secciones de 11 a 15 con barra lateral (Educación, Salud, Deporte local…) | H1 |
| 163 | En simple (lectura fácil); mapa de la semana; guía de comercios | V-7, V-10, V-16 |
| 164 | Pluviómetros vecinales; Rincones por localidad; perdidos y encontrados; ¿Es cierto? | V-2, V-12, V-14, V-15 |

### Redes y distribución
| # | Qué | Dónde |
|---|---|---|
| 165 | Para pegar hoy (texto diario para WhatsApp y grupos) | D-1 |
| 166 | Canal de WhatsApp de Radar | D-2 |
| 167 | TikTok a mano | RS-4 |
| 168 | Colaboraciones con cuentas de acá | R-4 |
| 169 | Desde el predio (Fiesta del Postre, autódromo, Juegos) | R-5 |
| 170 | Carruseles (si cambian la regla de Instagram): semana en datos, el finde en 5 placas, ayer y hoy, hoja de la semana | R-1, R-13, R-2, R-7 |
| 171 | Pregunta del lunes, foto de la semana, cómo funciona Balcarce | R-3, R-6, R-11 |
| 172 | Repaso semanal temático en lugar de uno diario | R-16 |
| 173 | Boletín por correo; Telegram; avisos del navegador | D-3, D-4, D-5 |
| 174 | Lo que buscan y no encuentran (Search Console) | D-6 |
| 175 | Radar en la radio; alianza con clubes | D-7, D-8 |
| 176 | YouTube Shorts | RS-3 |
| 177 | Reclamómetro; pregunta de los vecinos | D-12, D-13 |
| 178 | Mapa de Medios Bonaerenses, capacitaciones, fondos | D-9, D-10, D-11 |
| 179 | Cortina sonora propia | R-10 |
| 180 | Audio para todas las notas (con otra voz). **No recomendado por ahora**: no ayuda en Google y obliga a otra voz; sí el audio de lo que ya tiene voz (#63) | Ideas |

### Comercial
| # | Qué | Dónde |
|---|---|---|
| 181 | Página `/publicidad` con números reales y la escalera de planes | Ideas 9 |
| 182 | "Presentado por" en clima y agenda | K-1 |
| 183 | Cartel QR en comercios; guía gratis con mejora paga | K-3, K-2 |
| 184 | Convenio con la Cámara de Comercio; Abrió en Balcarce; ¿Qué abre el feriado? | K-6, Panel |
| 185 | Evento destacado; ofertas de la semana; clasificados | Ideas 9 |
| 186 | Concurso de la foto del mes | K-5 |
| 187 | Servicios digitales a comercios | K-9 |
| 188 | Aportes de lectores; membresía (más adelante) | K-7, Ideas 4b |
| 189 | Pauta oficial con reglas públicas ("Quién nos paga") | K-8 |
| 190 | Frase del medio: "El medio más útil y transparente de Balcarce" | Ideas 4b |

---

## Decisiones que hacen falta (por orden)

1. Autorizar #1, #2 y #3 (antes del lunes 12/10).
2. Tocar la lista roja: #7 y #8.
3. Lo nacional sin relación con Balcarce: ¿se le ofrece a Google? (#16)
4. Si se deja leer a los buscadores con IA (#6).
5. Nombres y roles para Quiénes somos, y cómo firmar lo que escribe Claude (#37, #38).
6. Piezas fijas: renovarlas antes del 25/10 (#19).
7. Precios y quién vende (#181).
8. Cuándo pasar a privado (#121).

## Lo que se descartó de las auditorías externas (y por qué)

- **Sus diagnósticos de sitio, en dos de ellas:** decían que faltaban la portada con titulares, los datos para
  Google, el H1, `robots.txt`, el sitemap y las páginas fijas, y que el sitio estaba en Akamai. Todo eso existe y
  el sitio corre en Cloudflare: esas IA no pudieron ver el sitio real.
- **Herramientas que no corresponden:** WordPress y sus complementos (RankMath, Yoast, QuikVox), APO y Polish de
  Cloudflare.
- **Contra las reglas:**
  - GA4 con banner de cookies, publicidad política, publicidad nativa: meten scripts de terceros o chocan con la
    neutralidad.
  - Video generado por IA: inventa imágenes.
- **Contra Google o los enlaces:**
  - Páginas de farmacia por fecha: contenido a escala.
  - Cambiar las direcciones a /año/mes/día: rompe enlaces.
- **Ya no existen o no aplican:** Publisher Center (ya no admite medios nuevos), Business Profile (pide atención en
  persona), redes publicitarias de Estados Unidos.
- **Números inflados:** "12.000 lectores" en un media kit. Regla: solo números reales.

Detalle: `registro/AUDITORIAS-EXTERNAS-2026-10-08.md`.

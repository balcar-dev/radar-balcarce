# Hoja de ruta de mejoras · 8 de octubre de 2026

> **Registro de la investigación del 8/10/2026.** Este archivo mezcla mejoras de lo que ya existe con ideas nuevas, y se conserva solo como historial y como fuente del detalle. **Las listas vigentes y ordenadas están en `docs/propuestas/MEJORAS.md` (sobre lo que ya existe) y `docs/propuestas/IDEAS-NUEVAS.md` (propuestas nuevas).** Algunas afirmaciones de acá se corrigieron después: manda lo que dicen esos dos archivos.

*Reúne todo lo hablado y escrito en `docs/AUDITORIA-2026-10-08.md` y en `docs/PLAN-DE-MEJORAS-2026-10.md` (con sus dos tandas), ordenado **de lo más simple a lo más complejo**. El detalle paso por paso de cada ítem está en el plan, con el mismo número (B1, C4, P16…). Este documento es el índice: dice qué conviene hacer primero y por qué. **No se aplicó nada.** Los tiempos son estimaciones (supuestos); los precios son aproximados y hay que confirmarlos antes de pagar.*

## Cómo se ordenó

La complejidad sale de cuatro cosas: **cuántos archivos toca**, **qué riesgo tiene** (si puede frenar la web o publicar algo mal), **si depende de otra mejora** y **si necesita que una persona cree una cuenta o decida algo**. Dentro de cada nivel, lo urgente va primero.

| Nivel | Qué es | Cuántas | Tiempo por ítem |
|---|---|---|---|
| **0 · Arreglar lo que está roto hoy** | Errores o desfasajes que ya existen. No cambian el comportamiento del sistema y no tienen riesgo. | 5 | minutos a unas horas |
| **1 · Medir sin cambiar nada** | Solo registran información para decidir mejor después. Casi sin riesgo. | 11 | 1 a 4 horas cada uno |
| **2 · Arreglos chicos de comportamiento** | Cambian una cosa concreta en un archivo o dos, con su prueba. Riesgo bajo. | 36 | medio día cada uno |
| **3 · Mejoras medianas** | Tocan varias piezas y piden pruebas nuevas. Conviene probarlas primero en la rama. | 41 | 1 a 3 días cada una |
| **4 · Obras grandes** | Cambian cómo trabaja una parte entera del sistema. Hay que decidir antes y probar mucho. | 13 | 1 a 3 semanas cada una |
| **5 · Cambios de plataforma y de modelo** | Mover dónde corre todo o cambiar cómo se organiza el medio. Riesgo medio a alto. | 4 | semanas a meses |

Total: **110 mejoras**. Las marcadas ⚠ son errores o riesgos que existen hoy; las marcadas ★ son las de más impacto.

## Para empezar: los 12 primeros pasos sugeridos

1. **N1** · Arreglar las 9 fotos rotas *(nivel 0, 1 a 2 h)*
2. **N2** · Ver por qué no corrió la auditoría del lunes 5/10 *(nivel 0, 30 min a 2 h)*
3. **G1** · Corregir las 14 contradicciones de documentos *(nivel 0, 2 a 4 h)*
4. **B1** · Guardar el motivo real de cada fuente caída *(nivel 1, 1 a 2 h)*
5. **A6** · Cronometrar cada tramo en el registro *(nivel 1, 1 h)*
6. **D1-1** · Medir el volumen real de IA por día *(nivel 1, 2 a 3 h)*
7. **M1** · Contador de voz con aviso a 8 de 10 *(nivel 1, 2 a 3 h)*
8. **B5** · Recuperar Puntonueve *(nivel 2, 3 a 4 h)*
9. **P16** · Crédito en la tapa y las secciones *(nivel 2, 4 h)*
10. **N4** · Chequeo de enlaces, imágenes y duplicados como aviso *(nivel 2, 4 h)*
11. **A1** · Publicar con una sola impresión del sitio *(nivel 3, 1 a 2 días)*
12. **C1** · Miniaturas de 400 px *(nivel 3, 1 día)*

La idea: primero arreglar lo roto (nivel 0), después medir (nivel 1) para decidir con datos, y recién entonces tocar el comportamiento.

---

## Nivel 0 · Arreglar lo que está roto hoy

*Errores o desfasajes que ya existen. No cambian el comportamiento del sistema y no tienen riesgo. Tiempo: minutos a unas horas.*

| Id | Mejora | Qué es | Tiempo | Costo | Riesgo | Depende de |
|---|---|---|---|---|---|---|
| N1 | ⚠ **Arreglar las 9 fotos rotas** *(Fotos)* | Las notas guardan `.png` o `.webp` y el archivo es `.jpg`. Reasignarlas y hacer que la nota guarde siempre la extensión final. | 1 a 2 h | US$ 0 | Bajo | — |
| N2 | ⚠ **Ver por qué no corrió la auditoría del lunes 5/10** *(Medición)* | El archivo sigue con fecha del 28/09. Revisar la corrida en Actions y el vigilante. | 30 min a 2 h | US$ 0 | Bajo | — |
| G1 | **Corregir las 14 contradicciones de documentos** *(Documentación)* | Redes prendidas, claves gratis, 22 workflows, documento 13, duración de la corrida, `:07/:37`, archivo que no existe, fechas de encabezados, `TAVILY_API_KEY`. | 2 a 4 h | US$ 0 | Bajo | — |
| M-doc | **Corregir las 10 contradicciones de docs de redes** *(Documentación)* | Zoom de la placa, ventanas de los repasos, 6 o 7 audios, Reintentar sí commitea, comentarios de "clave paga". | 1 h | US$ 0 | Bajo | — |
| Sondeos | **Borrar los archivos de sondeo y unir los workflows de diagnóstico** *(Limpieza)* | Cinco archivos seguros de borrar y ocho workflows manuales que pasan a uno solo. De 22 a unos 14 workflows. | 1 a 2 h | US$ 0 | Bajo | Tu aprobación |

---

## Nivel 1 · Medir sin cambiar nada

*Solo registran información para decidir mejor después. Casi sin riesgo. Tiempo: 1 a 4 horas cada uno.*

| Id | Mejora | Qué es | Tiempo | Costo | Riesgo | Depende de |
|---|---|---|---|---|---|---|
| B1 | **Guardar el motivo real de cada fuente caída** *(Fuentes)* | Hoy se tira la causa y solo queda "fetch failed". Registrar si fue tiempo, bloqueo, nombre no encontrado o certificado. | 1 a 2 h | US$ 0 | Bajo | — |
| A6 | **Cronometrar cada tramo en el registro** *(Medición)* | Fuentes, IA, fotos, impresión. Hoy los 50 s de fotos son una estimación. | 1 h | US$ 0 | Bajo | — |
| D1-1 | **Medir el volumen real de IA por día** *(IA)* | Guardar tokens de entrada y salida por pedido durante una semana, para decidir con datos si cambiar de proveedor. | 2 a 3 h | US$ 0 | Bajo | — |
| M1 | **Contador de voz con aviso a 8 de 10** *(Redes)* | Un día normal gasta 7 de 10 audios y nadie los cuenta. Contar en el libro y avisar por WhatsApp. | 2 a 3 h | US$ 0 | Bajo | — |
| A7 | **Vigilar al vigilante** *(Medición)* | healthchecks.io gratis y un segundo canal de aviso. Sumar los workflows que hoy nadie mira. | 2 a 4 h | US$ 0 | Bajo | Crear cuenta y pegar un secreto (persona) |
| S1 | **Cuentas y vencimientos** *(Plataforma)* | Renovar el dominio por varios años (vence el 21/09/2027, igual que el token de cron-job.org), activar 2FA con códigos de respaldo fuera de la PC, sumar a Andrés como administrador de Meta, Cloudflare y el repositorio, y anotar la versión de la API de Meta (v23, se retira hacia mediados de 2027) entre los vencimientos del vigilante. | 2 a 3 h | Dominio (ya se paga) | Bajo | Las hace una persona con sus cuentas |
| D-priv | **Revisar los términos de privacidad de las capas gratis de IA** *(IA)* | En la capa gratis de Gemini el texto enviado puede usarse para mejorar productos. Revisar qué se manda (notas con datos sensibles, menores, víctimas) y si hace falta otra clave o proveedor. | 1 h | US$ 0 | Bajo | Una persona lee los términos |
| A8 | **Contar corridas duplicadas por hora** *(Flujo)* | "Actualizar la web" tiene un reloj propio (`7,37`) además del disparo de cron-job.org. Cada corrida de más gasta cupo de IA y dispara Cloudflare y Redes. | 1 h | US$ 0 | Bajo | — |
| RS-0 | **Decidir cómo se publica en YouTube y TikTok** *(Redes)* | Tres caminos: a mano con el video ya armado, con una herramienta de terceros que ya pasó las auditorías (de pago, a confirmar) o con API propia después de aprobar una auditoría. Revisar también las reglas de cada plataforma para voces de IA. | 1 h de lectura y decisión | US$ 0 | Bajo | Hernán y Andrés deciden |
| U0 | **Probar el acceso a las fuentes nuevas desde GitHub** *(Notas propias · Todas)* | Desde el entorno de investigación no se pudo abrir ninguna fuente oficial. Un diagnóstico que pruebe cada una desde Actions y diga si responde, el formato y la fecha del último dato. | 2 a 3 h | US$ 0 | Bajo | Antes de cualquier nota propia nueva |
| ECO-1a | **Abrir el archivo de combustibles y ver si trae Balcarce** *(Notas propias · Economía)* | Diez minutos desde la PC: si el dataset de precios en surtidor tiene estaciones de Balcarce al día, la nota de la nafta pasa al primer lugar. | 10 min | US$ 0 | Bajo | Una persona desde la PC |

---

## Nivel 2 · Arreglos chicos de comportamiento

*Cambian una cosa concreta en un archivo o dos, con su prueba. Riesgo bajo. Tiempo: medio día cada uno.*

| Id | Mejora | Qué es | Tiempo | Costo | Riesgo | Depende de |
|---|---|---|---|---|---|---|
| B5 | ⚠ **Recuperar Puntonueve** *(Fuentes)* | Es el único medio de Balcarce que falla (5 de cada 6 corridas). | 3 a 4 h | US$ 0 | Bajo | B1, B4 |
| P16 | ⚠ **Crédito en la tapa y las secciones** *(Fotos)* | Un solo componente `FotoConCredito` para la nota, la tapa, las secciones y los temas (hoy solo la nota muestra crédito). Que el crédito diga autor, licencia con enlace y "(adaptada)" si se recortó; es la ficha C6 del plan. | 4 h | US$ 0 | Bajo | Hablarlo (decisión del 4/10) |
| DEP-1 | ⚠ **Balcarce en la final de los Juegos Bonaerenses (19 al 23/10)** *(Notas propias · Deportes)* | "Hoy compiten los de Balcarce": una persona carga los finalistas una vez y la nota sale cada mañana. Nombrar disciplinas y categorías, nunca chicos. | 1 día | US$ 0 | Bajo | U0 |
| B2 | **Reintentar una vez las fuentes que fallan** *(Fuentes)* | Hoy no reintenta nunca; muchas de las que fallan andan en otras corridas. | 3 a 4 h | US$ 0 | Bajo | B1 |
| B3 | **Tope de pedidos simultáneos** *(Fuentes)* | Hoy se piden las 236 a la vez. Limitar a 20 o 30 y no pedir juntos los feeds de un mismo sitio. | 3 a 4 h | US$ 0 | Bajo | B1 |
| B4 | **Probar User-Agent de navegador, fuente por fuente** *(Fuentes)* | Para Puntonueve, ESPN, TNT, Mundo Ascenso y los diarios que rechazan lo que no parece un navegador. | 3 a 4 h | US$ 0 | Bajo | B1 |
| B6 | **Apagar con nota las que nunca andan** *(Fuentes)* | 19 medios sin ninguna nota y 13 que casi siempre fallan, después de intentar arreglarlas. | 2 a 3 h | US$ 0 | Bajo | B1, B4 y tu decisión |
| A4 | **No reabrir las notas ya vistas en las páginas raspadas** *(Flujo)* | Se abren unas 15 notas una por una en cada corrida. | 3 h | US$ 0 | Bajo | — |
| A2 | **Guardar la memoria de impresión del sitio** *(Flujo)* | El registro dice "No build cache found" en cada impresión. | 2 h | US$ 0 | Bajo | A6 (para medir el ahorro) |
| A5 | **Pruebas por cambio de código** *(Flujo)* | Que las 1.840 pruebas corran al cambiar código, y en el ciclo quede un control corto. Evita que una prueba mal escrita congele la web. | 3 a 4 h | US$ 0 | Bajo | — |
| P17 | **Licencias: cerrar la expresión que acepta CC BY-NC y BY-ND** *(Fotos)* | Hoy está latente (el banco solo tiene BY y BY-SA). Corregir y agregar prueba. | 1 h | US$ 0 | Bajo | — |
| P13 | **Arreglar siempre las tildes conocidas** *(Redacción)* | Hoy rechaza una nota con 3 palabras sin tilde aunque sabe arreglarlas. | 2 h | US$ 0 | Bajo | — |
| P7-10 | **Unificar números y tono en el criterio** *(Redacción)* | "Tres intentos" (son 3, 4 o 5), 450 "notas" por día que en realidad son pedidos, copia de 10 o 12 palabras, "liviano" contra "no liviano". | 3 h | US$ 0 | Bajo | — |
| P12 | **No reintentar si el semáforo va a frenar lo mismo** *(Redacción)* | Hoy se pagan hasta 3 a 5 intentos con el mismo resultado. | 3 h | US$ 0 | Bajo | — |
| C8 | **Reintentar las fotos pendientes y rechazar miniaturas de Google** *(Fotos)* | 9 con "no se pudo volver a bajar", 2 con el máximo de intentos. | 2 h | US$ 0 | Bajo | — |
| D3 | **Fijar la versión del modelo de Gemini** *(IA)* | El alias `-latest` cambia de modelo sin avisar y puede mover la calidad. | 1 a 2 h | US$ 0 | Bajo | — |
| N4 | **Chequeo de enlaces, imágenes y duplicados como aviso** *(Medición)* | Sobre todo el sitio en 13 segundos, informando total y distintos. Nunca frena la publicación. | 4 h | US$ 0 | Bajo | N1 |
| M5-6 | **Podar el libro de redes y bajar el peso de las tarjetas** *(Redes)* | El libro crece unos 6 KB por día; las tarjetas de Instagram pesan 811 KB promedio. | 3 h | US$ 0 | Bajo | — |
| C7 | **Sin foto real de chicos en notas amarillas** *(Fotos)* | Hoy solo Policiales está excluida. | 2 h | US$ 0 | Bajo | Conversarlo antes (menores) |
| A8-b | **Guardia de "ya corrió hace menos de 20 minutos"** *(Flujo)* | Si se confirma el duplicado, que la corrida de respaldo no arranque si la anterior fue reciente. | 2 h | US$ 0 | Bajo | A8 |
| Borrar-c | **Borrar con cuidado cuatro archivos más** *(Limpieza)* | `recuperar-archivo.mjs`, `combinar-auditorias.mjs`, `auditar-redes.yml` y `prueba-estadisticas.yml`. Cada uno tiene una prueba que hay que sacar y decirlo. | 2 h | US$ 0 | Bajo | Tu aprobación |
| Deps | **Declarar las dependencias que la web usa sin declarar** *(Limpieza)* | `ffmpeg-static`, `@resvg/resvg-js` y `sharp` resuelven por la carpeta de la raíz. Si el deploy instalara solo `web/`, se rompería. | 1 h | US$ 0 | Bajo | — |
| Acc-v4 | **Actualizar las acciones de GitHub (Node 20 en desuso)** *(Flujo)* | El registro avisa que `checkout`, `setup-node` y `cache` se fuerzan a Node 24. Probar las versiones nuevas en un workflow manual antes de tocar Actualizar y Redes. | 2 h | US$ 0 | Bajo | — |
| P11-14-15 | **Aplicar o borrar lo que el criterio pide y nadie hace cumplir** *(Redacción)* | Los ganchos prohibidos en bajada, guion y textoRedes (P11), la ciudad del medio que el redactor no recibe (P14) y la bajada de 2 a 3 frases con 3 párrafos (P15). | 3 h | US$ 0 | Bajo | — |
| C-banco | **Podar el banco de fotos** *(Fotos)* | 322 marcas "intentado" sin archivo que nadie borra. Evaluar también bajar los 180 días del archivo para que crezca menos. | 2 h | US$ 0 | Bajo | — |
| C-rev | **Revisión humana de derechos de las fotos** *(Fotos)* | Mirar a ojo las fotos de las notas más compartidas y de medios chicos locales, como ya pide el documento de fotos. | 1 h por semana | US$ 0 | Bajo | Una persona |
| RSS-1 | **Mejorar el RSS de noticias que ya existe** *(Redes)* | Hoy hay un solo `feed.xml` con título, enlace, fecha, sección y bajada (no el cuerpo). Sumar un feed por sección (hasta 15) y el cuerpo de la nota, y revisar que salga con la dirección real del sitio. | 1 día | US$ 0 | Bajo | — |
| BAL-1 | ★ **La semana del bolsillo: qué vence y qué se cobra** *(Notas propias · Balcarce y Argentina)* | ARBA, ANSES y tasas municipales en un calendario cargado a mano con doble control. Nota los lunes, historia sin voz y barra lateral de Balcarce y de Argentina. | 1 día | US$ 0 | Bajo | U0 |
| EDU-1 | ★ **¿Hay clases?** *(Notas propias · Educación)* | Calendario escolar bonaerense cargado una vez por año, más feriados y alertas; paros solo con 2 medios o anuncio del gremio. Nota e historia a las 7 solo con novedad. | 1 día | US$ 0 | Bajo | — |
| ECO-2 | ★ **La inflación del mes en la región Pampeana** *(Notas propias · Economía)* | Dato del INDEC el día que sale, con el molde de la nota del dólar y sin IA. | 1 día | US$ 0 | Bajo | U0 |
| AUT-2 | **Fangio, un día como hoy, con datos de Jolpica** *(Notas propias · Automovilismo)* | Carga única de sus carreras (cruzada con una segunda lista), que alimenta las efemérides sin gastar voz. | 1 día | US$ 0 | Bajo | — |
| FUT-1 | **Así está el descenso (Aldosivi)** *(Notas propias · Fútbol)* | Con las tablas de ESPN que ya se usan y una carga única de puntos de 2024 y 2025 controlada por una persona. | 1 día | US$ 0 | Bajo | — |
| AGR-3 | **La papa, de la chacra a la góndola** *(Notas propias · Agro)* | Precio de la papa en la región Pampeana (INDEC) y reportes del Mercado Central. | 1 día | US$ 0 | Bajo | U0 |
| SAL-3 | **Vacunación: qué toca y dónde** *(Notas propias · Salud)* | Calendario de campañas y página "Dónde vacunarse en Balcarce", confirmada una vez por mes con Salud del Municipio. | 1 día | US$ 0 | Bajo | — |
| EDU-3 | **Fechas para anotarse** *(Notas propias · Educación)* | Progresar, Facultad de Agrarias, listados docentes, inscripción escolar: aviso al abrir y 3 días antes de cerrar. | 1 día | US$ 0 | Bajo | — |
| Humanas | **Notas con trabajo humano barato (una persona, pocos minutos)** *(Notas propias · Varias)* | Votómetro del Concejo, Bomberos y Fiscalía en números, locales vacíos del centro, remates de la zona, peón rural, convocatorias y becas, bibliotecas, trámite de la semana, proyecto de la semana. | 30 min a 2 h cada una | US$ 0 | Bajo | Quién se encarga de cada una |

---

## Nivel 3 · Mejoras medianas

*Tocan varias piezas y piden pruebas nuevas. Conviene probarlas primero en la rama. Tiempo: 1 a 3 días cada una.*

| Id | Mejora | Qué es | Tiempo | Costo | Riesgo | Depende de |
|---|---|---|---|---|---|---|
| N3 | **Archivo de salud: historial por fuente y conteos del día** *(Medición)* | Un solo `web/data/salud.json`: caídas seguidas, notas que aporta cada fuente, duplicados, fotos repetidas, tiempos y rechazo de la IA. | 1 a 2 días | US$ 0 | Bajo | B1, A6 |
| A1 | ★ **Publicar con una sola impresión del sitio** *(Flujo)* | Hoy se imprime dos veces (66 s y 111 s). Ahorra unos 2 minutos, de 7 a 5. | 1 a 2 días | US$ 0 | Medio | A6 |
| A3 | **Fotos y reescritura con 2 o 3 pedidos a la vez** *(Flujo)* | Hoy se hacen de a uno (57 s y ~50 s). Ahorra 1 a 2 minutos; hay que cuidar los cupos. | 1 a 2 días | US$ 0 | Medio | A6 |
| C1 | ★ **Miniaturas de 400 px** *(Fotos)* | Las secciones bajan fotos de 1.200 px para mostrarlas a 240. Hasta 80 % menos de peso en esas páginas. | 1 día | US$ 0 | Bajo | — |
| C2 | **Vista previa de WhatsApp en JPG** *(Fotos)* | Hoy es un PNG de 370 KB de promedio. | 1 día | US$ 0 | Bajo | — |
| C5+C4 | ★ **Banco de fotos con etiquetas y reglas para que no se repitan** *(Fotos)* | Tipo de foto, etiquetas y registro de usos. Que la foto de Messi no ilustre una nota sobre un show. | 2 a 3 días | US$ 0 | Bajo | — |
| P1-6 | ★ **Reconciliar lo que se le pide a la IA con lo que rechaza el verificador** *(Redacción)* | Fechas completas escritas por el código, números, siglas, negaciones, margen de material y guion en código. Menos rechazos y menos cupo gastado. | 2 a 3 días | US$ 0 | Medio | D1-1 (medir antes) |
| Q1 | **Copia de las piezas por 30 días fuera del repo** *(Redes)* | Guardar mp4 y mp3 en Cloudflare R2 para reintentar sin gastar voz y no depender solo de Meta. | 1 a 2 días | US$ 0 (a confirmar) | Bajo | Decisión; crear depósito y token (persona) |
| M3-4-7 | **Reintento de historias, métricas por pieza y caché de ffmpeg** *(Redes)* | Las historias no se reintentan solas, no se sabe qué reel anduvo mejor y ffmpeg se baja en cada corrida. | 2 días | US$ 0 | Bajo | Q1 |
| D2 | **Segunda clave de voz en otro proyecto de Google** *(IA)* | Plan B cuando se acaban los 10 audios. Sin tarjeta, para que no se contagie la suspensión. | 1 día | US$ 0 | Bajo | M1; crear la clave (persona) |
| N5-6 | **Cupo y tokens de IA en el WhatsApp y 404 reales de Cloudflare** *(Medición)* | Mostrar "voz 8/10" y qué enlaces rotos ven los lectores. | 1 a 2 días | US$ 0 | Medio | D1-1, M1 |
| B7 | **Sumar fuentes locales, una por una** *(Fuentes)* | Concejo, INTA, hospital, bomberos, clubes, localidades. Prueba de 14 días con la regla de decisión. | 1 a 2 días cada una | US$ 0 | Bajo | B1, B2; las direcciones se verifican a mano |
| G2 | **Una página "léeme" para no técnicos y podar documentos** *(Documentación)* | Recorrido, semáforo con ejemplos, quién decide qué y qué hacer si algo falla. Podar PENDIENTES, IDEAS y CLAUDE. | 2 días | US$ 0 | Bajo | G1 |
| P18-23 | **Unificar Wikimedia y alinear criterio y código en Policiales** *(Fotos)* | Dos implementaciones con reglas distintas; Policiales acepta cualquier fuente oficial. | 1 a 2 días | US$ 0 | Medio | C5+C4 |
| Efem | **Efemérides: aprobar el mes y automatizar la propuesta** *(Contenido)* | Aprobar los días del 19 al 31/10, y armar la propuesta mensual con Wikidata y ECyT-ar (ya investigadas) con las señales nuevas de puntaje. | 2 a 3 días | US$ 0 | Bajo | Hernán y Andrés aprueban |
| RS-1 | **Audio dentro de la nota de cada repaso** *(Redes)* | Un reproductor en la nota del repaso (mañana, tarde, noche) con el mismo audio que sale en redes. Requiere guardar el mp3 en un depósito público (R2), no en el repo. | 2 a 3 días | US$ 0 (a confirmar) | Bajo | Q1 (copia de las piezas) |
| COM-3 | **Planilla pública de Google que el sistema lee sola** *(Notas propias · Varias)* | Una pieza para todo lo que llenan otros: Liga Balcarceña, "Este finde en Balcarce", zonal, remates, locales vacíos. Con columna "revisado por". | 1 día | US$ 0 | Bajo | — |
| FUT-3 | **La fecha de la Liga Balcarceña** *(Notas propias · Fútbol)* | No hay tabla en internet: la carga la Liga o un cronista en la planilla y la nota sale el domingo a la noche. | 1 día | US$ 0 | Bajo | COM-3; quién carga |
| DEP-3 | **Este finde en Balcarce: qué se juega** *(Notas propias · Deportes)* | Los clubes cargan partido, sede, hora y entrada; sale los viernes y suma a la agenda. | 1 día | US$ 0 | Bajo | COM-3 |
| AUT-1 | ★ **El TC y el TC Pick-Up como la F1, con Santiago Mangoni** *(Notas propias · Automovilismo)* | Resultados y campeonato de la ACTC con el molde de la F1 y un renglón fijo para Mangoni (piloto de Balcarce; confirmar). | 2 días | US$ 0 | Medio | U0; escribir a la ACTC |
| AUT-3 | **La carrera de Colapinto en datos** *(Notas propias · Automovilismo)* | Gráfico de posiciones vuelta a vuelta (OpenF1) para la nota del resultado que ya existe. | 2 días | US$ 0 | Medio | U0 |
| AUT-4 | **El zonal y los pilotos de acá** *(Notas propias · Automovilismo)* | Pedir la clasificación a las categorías y cargar los 5 primeros y los de Balcarce; guía del finde cuando se corre en el Fangio. | 1 día | US$ 0 | Bajo | COM-3 |
| DEP-2 | ★ **Los clubes de Balcarce en las ligas de Mar del Plata** *(Notas propias · Deportes)* | Excepción chica del filtro: tomar de El Marplatense solo el resultado de "Campo de Pato" o "(Balcarce)" y armar una nota semanal propia. | 2 días | US$ 0 | Medio | Confirmar el club |
| FUT-2 | **El Federal A de la zona** *(Notas propias · Fútbol)* | Alvarado, Kimberley, Círculo y Santamarina con TheSportsDB (uso comercial pago, a confirmar), controlado contra El Marplatense. | 2 días | US$ 5 a 9 al mes (a confirmar) | Medio | Pagar o pedir permiso |
| POL-1 | ★ **La plata que manda la Provincia** *(Notas propias · Política)* | Transferencias mensuales a Balcarce, descontada la inflación y por habitante contra los vecinos. Datos abiertos, sin IA. | 1 a 2 días | US$ 0 | Bajo | U0 |
| POL-3 | **Así vota Balcarce, rumbo a 2027** *(Notas propias · Política)* | Página fija con 20 años de resultados y notas en el cierre de listas y la noche de elección. | 2 días | US$ 0 | Bajo | U0 |
| POC-1 | ★ **Balcarce en la estadística criminal oficial** *(Notas propias · Policiales)* | Tasa cada 100.000 habitantes, serie 2014-2025 y vecinos, sin casos. Bloque fijo para la barra lateral de Policiales. | 1 a 2 días | US$ 0 | Bajo | U0 |
| POC-2 | **Seguridad vial en el partido** *(Notas propias · Policiales)* | Muertes y lesiones viales (SNIC, Agencia de Seguridad Vial) y un pedido mensual a Tránsito. Sin nombres, fotos ni patentes. | 2 días | US$ 0 | Medio | U0 |
| AGR-1 | ★ **Balcarce en el mapa agrícola** *(Notas propias · Agro)* | Siembra, cosecha y rinde por cultivo del partido (MAGyP) y existencias de vacas (SENASA). Sin IA. | 1 a 2 días | US$ 0 | Bajo | U0 |
| AGR-2 | **El sudeste en el Panorama Agrícola y la pizarra de Quequén** *(Notas propias · Agro)* | El párrafo del sudeste del panorama de la Bolsa de Cereales, reescrito y atribuido, más el precio del puerto de Quequén. | 2 días | US$ 0 | Medio | U0 |
| ECO-1 | **La nafta en Balcarce, estación por estación** *(Notas propias · Economía)* | Solo precios de los últimos 7 días, cada uno con su fecha; si no hay datos frescos, no sale. | 1 día | US$ 0 | Bajo | ECO-1a |
| ECO-3 | **Cuánto paga un plazo fijo en los bancos de Balcarce** *(Notas propias · Economía)* | API de transparencia del BCRA, semanal, con la lista de bancos locales cargada una vez. Dato, no consejo. | 1 a 2 días | US$ 0 | Bajo | U0 |
| TRA-1 | ★ **El empleo registrado en Balcarce** *(Notas propias · Trabajo)* | Puestos y sueldo promedio del partido, trimestral (observatorio de la Secretaría de Trabajo). | 1 a 2 días | US$ 0 | Bajo | U0 |
| TRA-2 | **Ofertas de empleo de la semana** *(Notas propias · Trabajo)* | Del Portal Empleo y del Municipio; solo fuentes oficiales o empresas identificadas. | 2 días | US$ 0 | Medio | U0 |
| CYT-1 | **Ciencia hecha en Balcarce** *(Notas propias · Ciencia y tecnología)* | Lo nuevo del INTA Balcarce, la Facultad de Agrarias y el IPADS (OpenAlex y repositorio del INTA), resumido y atribuido. Llena la sección sin la regla de dos medios. | 2 a 3 días | US$ 0 | Medio | U0 |
| CYT-2 | **La conectividad de Balcarce y sus pueblos** *(Notas propias · Ciencia y tecnología)* | Accesos a internet y 4G por localidad (ENACOM), trimestral; cubre Napaleofú, San Agustín, Los Pinos y Ramos Otero. | 2 días | US$ 0 | Medio | U0 |
| CUL-1 | **Convocatorias abiertas** *(Notas propias · Cultura)* | Cada 15 días, las convocatorias nacionales y provinciales con cierre futuro y enlace oficial. | 1 a 2 días | US$ 0 | Bajo | U0 |
| CUL-2 | **Mapa cultural de Balcarce** *(Notas propias · Cultura)* | Bibliotecas, museos y salas del partido (SInCA), confirmados por teléfono; página fija. | 1 día | US$ 0 | Bajo | U0 |
| EDU-2 | **Las escuelas de Balcarce en números** *(Notas propias · Educación)* | Matrícula por nivel en 10 años y comparada con los vecinos, más una página con mapa. Solo números agregados. | 1 a 2 días | US$ 0 | Bajo | U0 |
| BAL-2 | **¿Cuánto sube la luz en Balcarce?** *(Notas propias · Balcarce)* | Aviso cuando sale un cuadro tarifario; una persona copia 4 números y la plantilla calcula la factura tipo. | 2 días | US$ 0 | Medio | Confirmar que la Cooperativa figura en los anexos |
| SAL-1 | **El parte de la semana (en temporada)** *(Notas propias · Salud)* | Tres o cuatro números del boletín epidemiológico, con tasa y comparación interanual, sin alarmismo. | 2 a 3 días | US$ 0 | Medio | U0; decidir si Salud espera a una persona en redes |

---

## Nivel 4 · Obras grandes

*Cambian cómo trabaja una parte entera del sistema. Hay que decidir antes y probar mucho. Tiempo: 1 a 3 semanas cada una.*

| Id | Mejora | Qué es | Tiempo | Costo | Riesgo | Depende de |
|---|---|---|---|---|---|---|
| C3 | **WebP o AVIF con tres tamaños** *(Fotos)* | Ahorra de 15 a 20 MB de los 44 (estimado en una muestra de 22 fotos). Las tarjetas y las vistas previas siguen leyendo JPG. | 1 semana | US$ 0 | Medio | C1 |
| P-orden | **Una sola fuente de verdad por regla** *(Redacción)* | Números en un archivo y prompt y documentos generados desde ahí, una prueba que cruce verificador y prompt, y reducir el prompt a un 60 %. | 1 a 2 semanas | US$ 0 | Medio | P1-6 |
| D1 | **Evaluar otros proveedores de IA para redactar** *(IA)* | Probar 30 notas reales con Gemini, Claude Haiku 5.5, GPT-5 nano, DeepSeek, Cloudflare Workers AI y Groq (con prompt corto). Si conviene, adaptador y respaldo de otro proveedor. | 1 a 2 semanas | Centavos de prueba | Medio | D1-1, P1-6 |
| E2 | **Worker de Cloudflare como disparador** *(Plataforma)* | Reemplaza a cron-job.org, que se desactiva solo. Una semana de prueba con el actual de respaldo. | 1 semana | US$ 5 al mes | Bajo | A7 |
| N7 | **Auditoría semanal completa** *(Medición)* | Lighthouse sobre 20 a 30 páginas, accesibilidad, redirecciones, fotos repetidas y cobertura por localidad. 15 a 40 min de robot (estimado). | 1 semana | US$ 0 | Bajo | N2, N3 |
| H1 | ★ **De 11 a 15 secciones con barra lateral** *(Secciones)* | Maqueta del menú y la barra, después Educación y Salud, Deporte local y una cuarta. 15 lugares del código y redirecciones 301. | 2 a 3 semanas | US$ 0 | Medio | Aprobar la maqueta |
| F1-b | **Configuración por sección ("carriles")** *(Secciones)* | Un solo archivo con el cupo, el criterio extra de IA, la frecuencia de redes, la barra lateral y las fuentes de cada sección. | 1 a 2 semanas | US$ 0 | Medio | H1 |
| Ciclo | **Acortar el ciclo de 30 a 15 minutos (idea)** *(Flujo)* | La demora media real para un lector es de unos 22 minutos y el ciclo es lo que más pesa. El repo público no paga minutos, pero hay que cuidar el cupo de IA y la cantidad de commits. | 1 semana | US$ 0 | Medio | A1, A3, A8 |
| D4 | **Un segundo proveedor (Groq, Cloudflare Workers AI, Claude Haiku u otro) como respaldo de la redacción** *(IA)* | Hoy los respaldos de la redacción son otras claves de Gemini: si Google falla o suspende, caen todas juntas. Groq no sirve hoy porque su capa gratis acepta 8.000 tokens por minuto y un pedido ocupa unos 9.000. Se vuelve posible con un prompt más corto (P-orden) o con el plan de pago. | 2 a 3 días | US$ 0 si el prompt cabe; si no, centavos | Medio | P-orden, D1-1 y probar calidad con 30 notas |
| RS-2 | **Feed de podcast (audio y texto) y alta en Spotify y otras** *(Redes)* | Un feed aparte con el audio de cada repaso, la nota como descripción, imagen cuadrada y datos del programa; se registra gratis en Spotify for Creators, Apple Podcasts y otras. Revisar la política de Spotify sobre voces de IA y avisar en cada episodio que la voz es sintética. | 1 semana | US$ 0 | Medio | RS-1, Q1 |
| RS-3 | **Publicar los reels en YouTube Shorts** *(Redes)* | Reusar el mismo mp4 (no gasta voz ni IA). Con API propia, los videos de un proyecto sin auditar quedan privados hasta pasar una auditoría de Google; el cupo diario es discutido (a confirmar). | 1 a 2 semanas más la auditoría | US$ 0 (o una herramienta de terceros) | Medio | RS-0, Q1 |
| RS-4 | **Publicar los reels en TikTok** *(Redes)* | Reusar el mismo mp4. Una app sin auditar solo publica en privado y para pocos usuarios; la auditoría se estima en 2 a 6 semanas y rechaza apps de "gestión de cuenta personal" (a confirmar). Alternativa: subir a la bandeja y que una persona toque "publicar". | 2 a 6 semanas con la auditoría | US$ 0 (o una herramienta de terceros) | Medio | RS-0, Q1 |
| COM-4 | ★ **Lector de boletines oficiales** *(Notas propias · Política, Argentina y Salud)* | Una pieza que detecta normas nuevas (SIBOM municipal, Boletín nacional y provincial, ANMAT) para tres notas: "La semana en el Boletín" (POL-2), "Qué cambia desde hoy" (ARG-2) y "Retirados de la venta" (SAL-2). | 1 a 2 semanas | US$ 0 | Medio | U0 (que se pueda leer SIBOM y los boletines desde Actions) |

---

## Nivel 5 · Cambios de plataforma y de modelo

*Mover dónde corre todo o cambiar cómo se organiza el medio. Riesgo medio a alto. Tiempo: semanas a meses.*

| Id | Mejora | Qué es | Tiempo | Costo | Riesgo | Depende de |
|---|---|---|---|---|---|---|
| E1 | **Repositorio privado y servidor propio** *(Plataforma)* | Un servidor de unos US$ 5 a 6 corre los robots (con los mismos workflows o con su propio reloj). Sin tope de minutos y con lo comercial protegido. | 3 a 6 semanas | US$ 5 a 9 al mes | Alto | E2, A7; mantenimiento |
| R2-fotos | **Sacar las fotos de git (R2) y limpiar el historial** *(Plataforma)* | El repo pesa 145 MB y crece unos 4 MB por día de fotos. `git filter-repo` rompe los clones: se hace con los dos presentes. | 2 a 4 semanas | US$ 0 (a confirmar) | Alto | Q1, C5+C4 |
| I1 | **Contenido propio y comercial** *(Contenido)* | Parte agroclimático, pluviómetros, QR en farmacias, "¿Hay clases?", entrevistas, página `/publicidad`, tres auspiciantes fundadores. Es producto, no solo técnica. | continuo | Variable | Medio | Ustedes (calle y comercial) |
| F1-a | ✖ **Separar el motor entero por sección** *(Secciones)* | No recomendado: una nota no sabe de qué sección es hasta cruzarse con otros medios, y se multiplicaría el trabajo por 15. | meses | — | Alto | Reevaluar si el volumen crece mucho |

---

## Decisiones que necesitan a Hernán y Andrés

1. Si se borran los archivos de sondeo (nivel 0).
2. Si se muestra el crédito de las fotos también en la tapa y las secciones (P16): es una decisión del 4/10 que conviene revisar.
3. Qué regla de repetición de fotos les parece bien (tabla de C4 del plan).
4. Si se guarda copia de las piezas de redes por 30 días (Q1) y cuánto tiempo.
5. Si se prueba otro proveedor de IA para redactar y con qué presupuesto de prueba (D1).
6. Si se sacan de GitHub público los documentos comerciales y personales (E1).
7. Qué secciones nuevas, en qué orden, y aprobar la maqueta (H1).
8. Sobre chicos en notas amarillas (C7): conversarlo antes de tocar.
9. Si Tecnología acepta una fuente de un solo medio (la excepción que hoy decide Hernán), para que esa sección llegue al mínimo.
10. Qué términos de privacidad aceptan para las capas gratis de IA (D-priv).

## Evaluado y descartado (y por qué)

- **Firebase:** Pide tarjeta para tareas programadas y no resuelve nada que Cloudflare no resuelva; sumaría otro proveedor. Solo serviría para avisos push a lectores, y eso se puede hacer con un Worker.
- **ElevenLabs:** El plan gratis no alcanza para 6 a 8 audios por día y no deja uso comercial; además rompe la regla de no cambiar de voz. Queda como plan de emergencia pago si Google recortara el cupo.
- **Pasar GitHub a privado pagando solo el plan:** Los minutos de robot (~10.000 por mes) no entran en los 2.000 a 3.000 incluidos; el exceso saldría unos US$ 40 a 60. Solo cierra junto con un servidor propio (E1).
- **Leer solo lo nuevo de cada feed:** Ahorraría pocos segundos de los 31, funciona mal en muchos sitios y rompería la comparación entre medios (el cruce).
- **Lighthouse en cada ciclo:** Serían 3 a 6 horas por vuelta. Va solo semanal sobre una muestra.
- **Que un chequeo nuevo frene la publicación:** Un falso positivo congelaría el sitio: los chequeos nuevos avisan, no cortan.
- **Separar el motor entero por sección:** Una nota no sabe de qué sección es hasta cruzarse con otros medios; se multiplicaría el trabajo por 15. Sí conviene la configuración por sección (F1-b).
- **Todo en Cloudflare (Workers y D1):** `ffmpeg` y `resvg` no corren en un Worker: harían falta otra máquina para los reels.

## Qué queda afuera por ahora

- **Pistas, el panel del celular y el "panel de notas"** (botón Publicar, borradores, "Esperan cuerpo", reintento de reels desde el panel), a pedido; quedan pausados.
- **Comparación con los 20 medios nacionales:** pendiente (hay que habilitar sus dominios en la red del entorno o pasar capturas de los menús).
- **Precios de IA y de servidores:** confirmar en las páginas oficiales.

## Dónde está el detalle

- `docs/AUDITORIA-2026-10-08.md`: la primera auditoría (qué sacar, flujo, 15 secciones, lo local y lo comercial).
- `docs/PLAN-DE-MEJORAS-2026-10.md`: cada ítem con su por qué (con datos medidos), sus pasos y su riesgo, más las dos tandas de hallazgos.

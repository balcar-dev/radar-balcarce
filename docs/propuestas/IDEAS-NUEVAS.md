# Ideas nuevas

*Armado el 8/10/2026. Acá va **solo lo nuevo**: notas propias, secciones, formatos de redes, canales,
servicios y planes comerciales. Lo que mejora o decide sobre algo que ya existe está en
[`MEJORAS.md`](MEJORAS.md). Nada de esto está hecho ni aprobado.*

**Cómo leerlo**

Cada idea dice **si hay datos de verdad para hacerla o si todavía es especulación**. Para eso, el 8/10
se probó cada fuente desde los robots de GitHub (el mismo lugar desde donde andaría): se bajó el archivo
y se buscó "Balcarce" adentro. Los estados son:

| Estado | Qué quiere decir |
|---|---|
| **Comprobado** | Se bajó el dato desde GitHub y trae a Balcarce, con fecha reciente. Se puede programar. |
| **Fuente accesible** | La fuente responde desde GitHub, pero falta ver si trae a Balcarce o en qué formato. |
| **Solo búsqueda** | La fuente apareció en buscadores; no se pudo probar o no se probó. |
| **Bloqueada** | Se probó desde GitHub y falló (error, bloqueo o certificado vencido). Hoy no sirve. |
| **Trabajo humano** | El dato no está en internet: lo tiene que conseguir o cargar una persona. |
| **Especulación** | No hay dato; depende de supuestos (precios, audiencia, que alguien acepte). |

---

## 1. Lo que tiene fecha

| Fecha | Qué | Idea |
|---|---|---|
| **9 al 12/10** | Fiesta Nacional del Postre | "Desde el predio" (R-5), "Dónde comer" (V-13), QR (V-3) |
| **Martes 13/10** | El INDEC publica la inflación de septiembre | ECO-2 |
| **19 al 23/10** | Final de los Juegos Bonaerenses en Mar del Plata | DEP-1 (lista antes del 19/10) |
| Mediados de 2027 | 70 años del quinto título de Fangio (1957) | AUT-2, R-12 |
| 2027 | Elecciones | POL-3 (con tiempo) |

## 2. Antes de decidir: choques con las reglas de hoy

Varias ideas chocan con reglas escritas. No se pueden hacer sin que ustedes cambien la regla:

1. **"Todo lo que va a Instagram es video con voz, salvo el espejo"** (CLAUDE.md). Los carruseles y las
   placas sin voz de la sección 7 la rompen. Cambiarla sería la regla 108.
2. **"Nunca en vivo"** (`CRITERIO-REDES.md` § 4) está pensada para lo automático. Cubrir un evento con una
   persona en el lugar pide una excepción escrita.
3. **Avisar que la voz es de IA**: lo pide Meta, y también TikTok, YouTube y Spotify. Hoy el criterio lo
   prohíbe (ver C-9 en `MEJORAS.md`). Afecta podcast, YouTube, TikTok y la radio.
4. **Una fuente sola no alcanza** para publicar. Las notas de datos oficiales (sección 4) son una sola
   fuente: ya existe la regla de que "una fuente oficial alcanza sola"; hay que confirmar que cubre estas.
5. **Secciones sensibles nuevas** (Salud): decidir si esperan a una persona en redes, como Política y
   Policiales.

---

## 3. Cinco piezas comunes (se arman una vez y sirven a muchas ideas)

| Id | Pieza | Qué es | Alimenta |
|---|---|---|---|
| COM-1 | **Molde "dato con plantilla"** (como la nota del dólar) | Código que baja un dato abierto, lo compara con el anterior y arma la nota con una plantilla, **sin IA** | Nafta, transferencias, elecciones, siembra, inflación, escuelas |
| COM-2 | **Calendario cargado a mano** | Archivo de fechas (ANSES, ARBA, tasas, calendario escolar, vacunación) con doble control y dos fuentes | Semana del bolsillo, ¿Hay clases?, Fechas para anotarse |
| COM-3 | **Planilla pública de Google** | Una hoja que llena alguien de afuera (Liga, clubes, consignatarias) y el sistema lee sola, con columna "revisado por" | Liga Balcarceña, Este finde, zonal, remates |
| COM-4 | **Lector de boletines oficiales** | Detecta normas nuevas (SIBOM, Boletín nacional y bonaerense, ANMAT); la IA resume solo lo que dice la norma y el verificador controla | Semana en el Boletín, Qué cambia desde hoy, Retirados de la venta |
| COM-5 | **Vigía de páginas** | Revisa una página fija y avisa o extrae cuando cambia | TC con Mangoni, Juegos Bonaerenses, Panorama Agrícola |

---

## 4. Notas propias por sección

*Ejemplos de título y detalle de cada fuente en `registro/PLAN-DE-MEJORAS-2026-10.md`, sección U.*

### Lo que dijo la prueba desde GitHub (8/10)

| Fuente | Resultado |
|---|---|
| Precios en surtidor (Secretaría de Energía) | **146 filas de Balcarce, al 7/10/2026** |
| Estimaciones agrícolas por partido | **657 filas de Balcarce, de 1969 a 2026** |
| Transferencias de la Provincia a municipios | **1.727 filas, de enero de 2010 a julio de 2026** |
| Elecciones bonaerenses | **PASO 2011-2021: 187 filas; generales 2005-2023: 261 filas** |
| Establecimientos educativos (Provincia) | **177 filas, al 28/09/2026** |
| Matrícula por distrito | Balcarce solo de 2011 a 2014; de 2015 a 2025 hay total y por región educativa, no por distrito |
| Campeonato de TC (ACTC) | **Responde y nombra a "MANGONI, Santiago"** |
| SIBOM (boletín municipal) | Se puede leer |
| API de series de datos.gob.ar, calendario del INDEC, IPC (CSV hasta 08/2026), BCRA v4, transparencia de plazos fijos, OpenAlex (201 trabajos en 2026), repositorio del INTA, Boletín Oficial nacional y bonaerense, ANMAT, boletines epidemiológicos, TC Pick-Up, Jolpica, OpenF1, TheSportsDB, Juegos Bonaerenses, Open-Meteo | Responden |
| Estadística criminal (SNIC) | 403 y 404 |
| Empleo por departamento (OEDE) | 403; los otros enlaces de empleo, certificado vencido |
| Existencias bovinas (SENASA) y mapa cultural | El buscador del catálogo nacional da 502 (intermitente) |
| ENACOM | Error de certificado |
| cultura.gob.ar | 403 |
| Vialidad (estado de rutas) | 404 |
| ESPN | 403 con un nombre de navegador nuevo (el que ya usa el repo anda) |

### Las ideas, con su estado

| Id | Sección | Idea | Estado de los datos | Trabajo | Cuidado principal |
|---|---|---|---|---|---|
| **ECO-1** | Economía | **La nafta en Balcarce, estación por estación** | **Comprobado** (146 filas al 7/10) | Bajo (COM-1) | Solo precios de los últimos 7 días, con fecha |
| **AUT-1** | Automovilismo | **TC y TC Pick-Up como la F1, con Santiago Mangoni** | **Comprobado** (TC); Pick-Up accesible | Medio (COM-5 + molde de `f1.mjs`) | Escribir a la ACTC; provisorio hasta el dictamen; confirmar que Mangoni es de Balcarce |
| **POL-1** | Política | **La plata que manda la Provincia** | **Comprobado** (2010 a 07/2026) | Bajo-medio (COM-1) | Decir si es en pesos de hoy o descontada la inflación |
| **AGR-1** | Agro | **Balcarce en el mapa agrícola** (siembra y cosecha) | **Comprobado** (estimaciones); ganado de SENASA, bloqueado por ahora | Bajo-medio (COM-1) | Son estimaciones y llegan con atraso |
| **POL-3** | Política | **Así vota Balcarce** (20 años de elecciones) | **Comprobado** (2005-2023 y PASO) | Medio, una vez | No proyectar; distinguir provisorio de definitivo |
| **EDU-2** | Educación | **Las escuelas de Balcarce en números** | **Comprobado en parte**: establecimientos sí; matrícula por distrito solo hasta 2014 | Bajo | Nunca un grupo de menos de 10 alumnos |
| ECO-2 | Economía | La inflación del mes en la región Pampeana | Fuente accesible (API de series; el CSV probado era nacional) | Bajo (COM-1) | Si cambia la base, cambian los identificadores |
| ECO-3 | Economía | Cuánto paga un plazo fijo en los bancos de Balcarce | Fuente accesible | Bajo-medio | Es dato, no consejo |
| AGR-3 | Agro | La papa, de la chacra a la góndola | Fuente accesible (API de series) | Bajo-medio | Es la región, no Balcarce |
| AGR-2 | Agro | El sudeste en el Panorama Agrícola semanal | Solo búsqueda | Medio (COM-5 + IA) | Solo datos, con palabras propias |
| AGR-4 | Agro | Remates de la zona | Trabajo humano | Bajo | Confirmar qué consignatarias |
| AGR-5 | Agro | Lluvia medida en la estación del INTA | Solo búsqueda | Medio | No confirmado que la estación esté en línea |
| POL-2 | Política | La semana en el Boletín Oficial municipal | Fuente accesible (SIBOM legible) | Medio (COM-4) | Nombrar solo a funcionarios |
| POL-4 | Política | El votómetro del Concejo | Trabajo humano (1-2 h por sesión) | Bajo | Mismo trato para todos los bloques |
| POL-5 | Política | Índice de transparencia fiscal (ASAP) | Solo búsqueda | Bajo | Fuente privada: atribuirla |
| POC-1 | Policiales | Balcarce en la estadística criminal | **Bloqueada** (403/404) | — | Esperar o pedir el dato |
| POC-2 | Policiales | Seguridad vial en las rutas 226 y 55 | Bloqueada (SNIC) + trabajo humano | Medio | Nunca nombres ni patentes |
| POC-3 | Policiales | Bomberos y Fiscalía: el mes en números | Trabajo humano (pedido mensual) | Bajo | Nunca domicilios |
| FUT-1 | Fútbol | Así está el descenso (Aldosivi) | Fuente accesible (ESPN ya se usa) | Bajo-medio | Reglas de desempate de la AFA |
| FUT-2 | Fútbol | El Federal A de la zona | Fuente accesible (TheSportsDB; el uso comercial es pago, ~US$ 5-9) | Medio | Pagar o pedir permiso |
| FUT-3 | Fútbol | La fecha de la Liga Balcarceña | Trabajo humano (COM-3) | Bajo | Segunda persona que revisa |
| DEP-1 | Deportes | Balcarce en la final de los Juegos Bonaerenses | Fuente accesible + persona carga finalistas | Bajo | Muchos chicos: disciplinas, no nombres. **Antes del 19/10** |
| DEP-2 | Deportes | Los de Balcarce en las ligas de Mar del Plata (hockey, rugby) | Fuente accesible (El Marplatense ya se lee) | Medio | Confirmar si "Campo de Pato" es el Club Social Pato |
| DEP-3 | Deportes | Este finde en Balcarce: qué se juega | Trabajo humano (COM-3) | Bajo | "A confirmar" si no está confirmado |
| AUT-2 | Automovilismo | Fangio, un día como hoy (Jolpica) | Fuente accesible (ya se usa) | Bajo | En 1956 las fuentes no coinciden |
| AUT-3 | Automovilismo | La carrera de Colapinto en datos (OpenF1) | Fuente accesible | Medio | No es oficial |
| AUT-4 | Automovilismo | El zonal y los pilotos de acá | Trabajo humano (pedir el PDF) | Bajo | Depende de que contesten |
| BAL-1 | Balcarce | La semana del bolsillo: qué vence y qué se cobra | Trabajo humano (COM-2) | Bajo | Una fecha mal hace daño: doble control |
| BAL-2 | Balcarce | ¿Cuánto sube la luz en Balcarce? | Solo búsqueda + persona copia 4 números | Medio | La Cooperativa está en crisis: todo atribuido |
| BAL-3 | Balcarce | El termómetro del centro (locales vacíos) | Trabajo humano (1 h por mes) | Bajo | Fotos sin gente ni patentes |
| TRA-1 | Trabajo | El empleo registrado en Balcarce | **Bloqueada** (403 y certificado vencido) | — | Volver a probar en un mes |
| TRA-2 | Trabajo | Ofertas de empleo de la semana | Solo búsqueda / trabajo humano | Medio | Solo ofertas de fuentes identificadas |
| TRA-3 | Trabajo | Cuánto cobra un peón rural desde este mes | Trabajo humano (de la norma) | Bajo | Básico no es total |
| CYT-1 | Ciencia | Ciencia hecha en Balcarce (INTA, Agrarias) | Fuente accesible (OpenAlex y repositorio del INTA) | Medio | Lenguaje simple sin exagerar |
| CYT-2 | Ciencia | La conectividad de Balcarce y sus pueblos | **Bloqueada** (ENACOM) | — | — |
| CYT-3 | Ciencia | Convocatorias y becas de la semana | Trabajo humano | Bajo | Sirve también a Trabajo |
| CUL-1 | Cultura | Convocatorias abiertas para artistas | Bloqueada en parte (cultura.gob.ar 403) | Bajo-medio | Manda el organismo |
| CUL-2 | Cultura | Mapa cultural de Balcarce | Bloqueada (502) + persona confirma | Bajo | El dato es de 2023 |
| CUL-3 | Cultura | Lo más pedido en las bibliotecas | Trabajo humano | Bajo | Nunca quién lo pidió |
| ARG-1 | Argentina | Cuándo y cuánto cobro (unida con BAL-1) | Trabajo humano (COM-2) | Bajo-medio | Doble control |
| ARG-2 | Argentina | Qué cambia desde hoy (boletines) | Fuente accesible | Medio (COM-4) | No atribuir efectos que la norma no dice |
| ARG-3 | Argentina | El trámite de la semana | Trabajo humano (preguntas del WhatsApp) | Bajo | — |
| EDU-1 | Educación | ¿Hay clases? | Trabajo humano (calendario) + datos que ya existen | Bajo | Decir "no hay clases" cuando hay es muy dañino |
| EDU-3 | Educación | Fechas para anotarse | Trabajo humano (COM-2) | Bajo | Siempre el enlace oficial |
| EDU-4 | Educación | El proyecto de la semana (una escuela cuenta) | Trabajo humano | Bajo | Sin nombres ni caras de alumnos |
| SAL-1 | Salud | El parte de la semana (dengue, gripe) | Fuente accesible; por región sanitaria, no comprobado | Medio | Contra el alarmismo |
| SAL-2 | Salud | Retirados de la venta (ANMAT) | Fuente accesible | Bajo-medio (COM-4) | Marca y lote textuales |
| SAL-3 | Salud | Vacunación: qué toca y dónde | Trabajo humano | Bajo | "Confirmado el DD/MM" |

---

## 4b. Contenido propio: sello, ritmo y primeras notas (de las auditorías externas del 8/10)

*Detalle y cruce en `registro/AUDITORIAS-EXTERNAS-2026-10-08.md`.*

- **Sello "Nota de Radar Balcarce"** (u "Original"), bien visible y distinto de lo automático, en la nota, la
  portada y las redes. Ayuda con Google (S-1) y con los lectores.
- **Un feed RSS solo de notas propias**, además del general.
- **Ritmo propuesto:** una nota propia por semana el primer mes; después, dos.
- **Las primeras, en este orden:**
  1. Balcarce en números (con los datos ya comprobados: nafta, plata de la Provincia, siembra, elecciones,
     escuelas).
  2. Farmacias de turno: por qué a veces no coincide y cómo lo chequeamos (explicador con datos propios).
  3. Qué se está hablando en Balcarce esta semana (lo que manda la gente por WhatsApp).
  4. Qué pasó finalmente con… (seguimiento de temas abiertos).
  5. Agenda real de la semana.
  6. Vecinos que hacen cosas (perfiles).
  7. Entrevistas a comerciantes.
  8. Cuánto cuesta vivir en Balcarce.
  9. El mapa de los baches según los vecinos.
  10. Las rutas 55 y 226.
- **Frase para el sitio y las redes (propuesta):** "El medio más útil y transparente de Balcarce". Cuando haya
  más contenido propio: "…y el que te cuenta lo que nadie más te cuenta".
- **Herramientas gratis para investigar a mano:** Google Pinpoint y NotebookLM, para leer documentos largos
  (presupuesto municipal, ordenanzas, actas) y sacar datos con su fuente.
- **Fotos ilustrativas de bancos libres** (Unsplash, Pexels) en temas genéricos, siempre rotuladas "Imagen
  ilustrativa" y nunca como si fueran del hecho. **Decisión de ustedes**: choca en parte con el criterio de fotos.
- **Membresía de lectores** (como hacen algunos medios locales de Estados Unidos): para más adelante, cuando haya
  público. Es especulación para una ciudad de 45.000 habitantes.

## 4c. Hacia dónde va el medio y cómo sumar gente (pedido el 8/10)

**La idea de Hernán y Andrés:** ser un medio serio en cinco niveles: **nacional, provincial, zonal, vecinal y de
Balcarce**. Sumar y rehacer notas todo el tiempo, **con prioridad a lo de Balcarce, sobre todo en redes**.

**Qué implica:**
- **Secciones y barras laterales:** sigue pendiente (sección 5, y F1-b en `MEJORAS.md` como base). Los cinco
  niveles pueden ordenar el menú: Balcarce primero; después la zona (Mar del Plata, Tandil, Lobería, la ruta 226);
  la Provincia; y el país.
- **Redes con prioridad a Balcarce:** que los repasos y los posteos elijan primero lo local, y que lo nacional
  entre solo si es muy importante. Hoy ya se elige así en parte (`redes/elegir.mjs`); conviene escribir la regla
  en el criterio de redes y medirla.
- **Lo nacional, con aporte:** para ser un medio nacional serio, lo nacional tiene que sumar algo (contexto, qué
  cambia para Balcarce). Mientras tanto, ver S-1 en `MEJORAS.md`.

**Sumar colaboradores (nuevo):**
1. **Corresponsales vecinos:** gente de cada localidad o institución (clubes, escuelas, el campo) que manda
   información por WhatsApp con un formato fijo. Una persona la revisa antes de publicar.
2. **Notas de colaboradores, con su firma:** invitar a gente que sabe de un tema a escribir. Va con revisión, el
   sello "Colaboración" y una regla escrita: sin conflicto de intereses, nada de política partidaria.
3. **Entrevistas online:** por videollamada grabada, con permiso. Salen como nota, como audio con voz humana (no
   gasta cupo) y como reel con un fragmento.
4. **Entrevistas presenciales con video:** para eventos y personajes del pueblo. Cuidado con los menores y con el
   permiso de imagen.

**Videos de terceros (turistas, creadores que pasan por Balcarce) (nuevo, con reglas):**
- **Solo con permiso escrito** del autor (un mensaje que diga que sí alcanza, guardado). Sin permiso, subir el
  video de otro es usar algo ajeno: Meta lo puede bajar o sacarle alcance. Meta anunció en 2025 que reduce la
  distribución de las cuentas que republican contenido de otros sin aportar nada (solo búsqueda: confirmarlo).
- **Con aporte propio:** recorte, contexto, subtítulos y la placa de Radar. No subirlo tal cual.
- **Con crédito:** el nombre del autor en el texto del posteo y etiquetado en la colaboración de Instagram (R-4).
  Hay que decidir si el crédito también puede ir escrito sobre el video: la regla de hoy dice que sobre una imagen
  nunca va el nombre de otro medio. Un creador no es un medio, pero conviene dejarlo escrito.
- **Sirve también como invitación:** "Te sacamos en Radar Balcarce" suma seguidores de los dos lados.
- **En la web,** los videos de YouTube se pueden mostrar insertados, sin bajarlos, siempre que el autor lo permita.
  Ojo: el reproductor de YouTube carga código de afuera (ver C-2 en `MEJORAS.md`).

### "Jefe editor": una sola nota a partir de todas las fuentes (idea de Hernán y Andrés, 8/10)

**La idea:** cuando un hecho lo cuentan **3 o más medios** (casi siempre lo nacional: el último partido de Messi),
que un "jefe editor" mire todas las fuentes y arme **una nota única**, pensando qué la hace distinta (por ejemplo,
un dato de contexto). Hoy entran unas 25 notas por día así.

**Sí se puede.** Es una pasada de redacción con una instrucción distinta:
1. **El código** junta las fuentes y las ordena (ya lo hace el cruce).
2. **El jefe editor** (un modelo) lee todas, separa lo que **todos** confirman de lo que dice **uno solo**, decide el
   ángulo para Balcarce y qué dato de contexto sumar, y escribe la nota.
3. **El verificador** (código, como hoy) controla nombres, números, fechas y citas contra las fuentes.
4. **Política y Policiales** siguen esperando a una persona.

**Qué modelo:** Haiku 5.5 para todas (~US$ 1 por mes) y Sonnet 5.5 para las 5 más importantes del día (~US$ 5 por
mes en total). Cuentas en `MEJORAS.md`, "Modelos de IA".

**El dato único (la estadística de Messi): sí, pero con fuente.** El verificador no deja pasar un número que no esté
en las fuentes, y un modelo no puede sacarlo de memoria. La forma de hacerlo:
- **Fichas de contexto:** un archivo con datos verificados de las figuras que más aparecen (Messi, Colapinto,
  Milei, Caputo, los clubes), armado por código desde una fuente con su enlace (Wikidata, ESPN, Jolpica), con la
  fecha de actualización.
- El jefe editor elige **uno** de esa lista y lo cita ("según ESPN"). Si no hay ficha, no inventa: la nota sale sin
  dato extra.
- Ya funciona así con las notas de F1 y de fútbol: el dato lo trae el código, no el modelo.

**Lo que no hace una sola nota única:** juntar cinco notas ajenas sigue siendo una nota derivada. Lo que la vuelve
propia para Google (S-1) es lo que **suma**: el dato de contexto verificado y el "qué significa para Balcarce".

**Sobre el criterio de centro-derecha, una advertencia.** `CRITERIO-EDITORIAL.md` dice hoy "claro, directo y
**neutral**: sin sensacionalismo y sin opinión". Un editor "de centro-derecha" choca con esa línea si se
entiende como un tono. Lo que sí se puede declarar, sin chocar:
- **Qué cubrir y qué ángulo elegir:** por ejemplo, más peso a la economía, la gestión, la seguridad, lo productivo.
- **Qué contexto o dato sumar:** elegido por ese criterio, con fuente.
- **El mismo trato** para todos los bloques y personas; las posturas enfrentadas, cada una con su argumento.
- **Lo que no cambia:** tono neutral, sin adjetivos de opinión, atribución de lo que dice cada uno y verificación.
Si quieren una línea más marcada, hay que **escribirla en el criterio** (y en "Quiénes somos") para que la lean la
IA y los lectores, y decidir cómo convive con "independiente y sin partidos", que el sitio dice hoy.

## 5. Secciones: de 11 a 15, con barra lateral (H1)

*Detalle en `registro/AUDITORIA-2026-10-08.md`, sección 3.*

- **Estado:** Comprobado en volumen (conteo aproximado por palabras clave sobre el archivo real).
- **Candidatas:**
  - **Educación:** ~63 notas en 3,4 semanas.
  - **Salud:** ~48.
  - **Deporte local:** Deportes tiene 100 locales contra 47 de afuera.
  - **Ciencia y tecnología o Trabajo y empleo:** ~33.
  - "Sociedad" es la sección común de los medios nacionales que acá falta.
- **Regla que ya estaba:** sumar de a una, cada dos semanas, solo si llena 10 notas por semana. Antes, una
  maqueta del menú ("Más") y de la barra lateral.
- **Barra lateral:** hoy solo está en la portada.
  - Hay datos propios para Balcarce, Fútbol, Automovilismo, Economía y Cultura.
  - Para Política, Tecnología, Argentina y Educación hace falta "lo más leído", temas o publicidad.
  - Las ideas de la sección 4 llenan varias: nafta y plazo fijo en Economía, transferencias en Política,
    escuelas en Educación.
- **Depende de** F1-b (`MEJORAS.md`): un solo archivo de configuración por sección.

---

## 6. Web y servicios útiles

| Id | Idea | Estado | Trabajo | Cuidado |
|---|---|---|---|---|
| V-1 | **Parte agroclimático**: helada, lluvia acumulada, viento, humedad; historia y podcast del campo 2 veces por semana | Fuente accesible (Open-Meteo, ya se usa) | Bajo-medio | Alerta de tizón solo validada con el INTA |
| V-2 | **Red de pluviómetros vecinal** por WhatsApp | Trabajo humano | Medio | Datos personales |
| V-3 | **Cartel QR en farmacias y comercios** ("¿qué farmacia está de turno?"), con logo del comercio | Trabajo humano | Bajo | Una farmacia no auspicia la farmacia de turno |
| V-4 | **Micros y combis**: "el próximo sale a las 14:10" | Trabajo humano (no hay horarios en internet) | Bajo | Fecha de la última revisión |
| V-5 | **Rutas 226 y 55 hoy, más niebla** | Open-Meteo accesible; **Vialidad bloqueada (404)** | Medio | "Pronóstico de niebla", nunca "hay niebla" |
| V-6 | **Mi barrio**: recolección, cortes y obras por zona | Trabajo humano | Medio | Quedar desactualizado |
| V-7 | **En simple**: versión de lectura fácil de las notas de Balcarce | Especulación sobre el uso; técnicamente posible | Medio | Que simplificar cambie el sentido |
| V-8 | **Qué pasó con…**: temas vivos con línea de tiempo (Cooperativa, autódromo) | Datos propios (archivo) | Medio | Atribuir siempre |
| V-9 | **Archivo permanente liviano**, "Hace un año en Balcarce" y buscador Pagefind | Datos propios | Medio | Las retiradas nunca vuelven |
| V-10 | **Mapa de la semana** (notas por localidad) | Datos propios + IA saca el lugar | Medio | En Policiales solo el barrio |
| V-11 | **Canasta Radar mensual** (10 productos en 3 comercios) | Trabajo humano | Medio | Mismo comercio y producto cada mes |
| V-12 | **"Rincones"**: ficha y novedades de cada localidad, con un vecino enlace | Trabajo humano | Medio | — |
| V-13 | **Dónde comer en Balcarce** (para la Fiesta del Postre y siempre) | Trabajo humano (confirmar por teléfono) | Bajo | Solo lo confirmado ese día |
| V-14 | **Perdidos y encontrados** semanal | Trabajo humano | Bajo-medio | Ley 25.326 |
| V-15 | **¿Es cierto?**: chequeo de rumores y estafas locales (se apoya en Pistas) | Trabajo humano | Medio | — |
| V-16 | **Guía de comercios** (`/guia`, por rubro y localidad, "abierto ahora") | Datos propios (mapa comercial) + confirmación | Medio | Separar lo de OpenStreetMap de lo confirmado |

---

### De la tercera auditoría externa (8/10)
- **Clima por horas** en `/clima` (hoy muestra "ahora" y la semana). Open-Meteo ya da el dato por hora.
- **Mapa chico de la farmacia de turno** en `/farmacias`, dibujado al armar el sitio (sin cargar mapas de afuera).
- **El repaso como formato central:** la misma pieza en la web (con audio), reel, WhatsApp y mail.
- **Datos para Google del video** (VideoObject), cuando el audio y el video estén en la web.

## 7. Redes: formatos nuevos

*Ninguno gasta cupo de voz. Todos, salvo R-5, chocan con la regla de Instagram (sección 2, punto 1).*

| Id | Idea | Estado | Trabajo | Cuidado |
|---|---|---|---|---|
| R-1 | **La semana en datos** (carrusel del domingo). Arma el **motor de carruseles** que usan R-2, R-7, R-11 y R-13 | Datos propios | Medio, una vez | La API de Instagram permite 10 placas, no 20 |
| R-2 | **Balcarce, ayer y hoy** (foto vieja y la misma esquina hoy) | Trabajo humano (Museo o Archivo) | Bajo | Permiso escrito de la foto vieja |
| R-3 | **La pregunta del lunes** (encuesta en historias) | Trabajo humano: la API no pone stickers, 1 minuto a mano | Bajo | Nunca preguntas políticas; veda electoral |
| R-4 | **Colaboraciones** con cuentas de acá (el posteo sale en las dos) | Fuente accesible (API de colaboradores) + persona consigue el sí | Bajo | Mismo trato para todos; nunca partidos |
| R-5 | **Desde el predio**: eventos con una persona (Postre, autódromo, Juegos) | Trabajo humano | Alto durante el evento | Chicos en la multitud; regla de "en vivo" |
| R-6 | **La foto de la semana** (de vecinos, se vota) | Trabajo humano | Bajo | Cesión escrita; llena el banco de fotos |
| R-7 | **La hoja de la semana** (letra grande, para mayores) | Datos propios | Bajo | "Vale del … al …" |
| R-8 | **Lectura fácil semanal** | Trabajo humano valida | Medio | Pictogramas ARASAAC no comerciales |
| R-9 | **Texto alternativo automático** en tarjetas y reels | Fuente accesible (la API lo acepta desde 03/2025) | Bajo | No inventar descripciones |
| R-10 | **Cortina sonora propia** (músico de Balcarce) | Trabajo humano + pago único | Bajo | Licencia para todas las plataformas |
| R-11 | **Cómo funciona Balcarce** (explicadores, cada 15 días) | Trabajo humano | Medio | Fuente oficial |
| R-12 | **Camino al 57** (hacia los 70 años del título de Fangio) | Fuente accesible (Jolpica) + Museo | Medio | Derechos de las fotos |
| R-13 | **El finde en 5 placas** (viernes 18 h) | Datos propios | Bajo, con R-1 | "A confirmar" |
| R-14 | **Voxpop "La pregunta de la semana"** (voz humana, 30 s) | Trabajo humano | Bajo | Consentimiento |
| R-15 | **Entrevista de 5 minutos** semanal (audio humano + nota) | Trabajo humano | Medio | — |
| R-16 | **Repaso semanal temático** en lugar de uno de los tres diarios (lunes agro, jueves cultura, sábado deporte local) | Datos propios | Bajo | Reemplaza, no suma voz |

**Lo que dicen las plataformas** (solo búsqueda, a confirmar):
- En Argentina, Facebook sigue primero (38 %) e Instagram cerca (35 %).
- Instagram premia los **envíos por alcance**, o sea, lo que se reenvía a los grupos de WhatsApp.
- Reels de prueba (para no seguidores) por la API: piden 1.000 seguidores.
- Grupos de Facebook: Meta cerró la publicación automática en abril de 2024.

### Redes: el plan completo, en un solo lugar (decidido el 8/10)

Junta lo que se decidió para las redes. El detalle de cada parte está más abajo en esta misma sección.

| Qué | Cómo queda | Estado |
|---|---|---|
| **Videos animados** | Ninguna pieza con imagen fija: todas con movimiento, subtítulos de la voz en la misma franja y una sola estética. Hay ejemplos de nota con foto, clima (lluvia y día lindo), repaso, farmacia (una, dos y tres de turno), participá, efeméride y feriado | Aprobado. Se repasan juntos la semana que viene |
| **Feriados** | Animación y dato propios para cada feriado; el dato lo elige el criterio del medio | Aprobado |
| **Dónde sale cada pieza** | **Facebook:** clima y farmacia también como reel. **Instagram:** clima y farmacia solo como historia. **Lo demás con voz:** reel en las dos redes y el mismo video como historia | Aprobado. Se mide 4 semanas |
| **Locución con memoria del día** | Cada guion sabe cómo está el día, qué saludo ya se usó y qué viene después: nada de tres "buenas noches" seguidos | Aprobado, se hace pronto (`PRIORIDADES.md` #31) |
| **Aviso de voz con IA** | Una línea de texto en el posteo, sin la etiqueta visual de Meta | Aprobado (`MEJORAS.md` C-9) |
| **Historias y reels, para qué** | Para lo más relevante. Los posteos de notas, para llevar gente a la web | Aprobado |
| **Una historia que lleve al posteo de la nota** | Para evaluar, sin cargar de más | Para decidir |
| **Guardar lo que se genera** | Audio y video de cada pieza guardados; se reusan como notas con audio en la web y en el podcast | Aprobado (Q1) |
| **TikTok** | A mano primero; después a la bandeja; al final automático | Aprobado |
| **Voces** | Se sigue con Gemini; las demás quedan abiertas | Aprobado |

### Videos con movimiento (idea nueva, con ejemplos)

Hoy los reels son una placa fija con los subtítulos abajo. Se armaron **tres ejemplos** (sin voz, solo para
mirar, el 8/10) con las mismas letras y colores del sitio:

1. **Nota con foto:** la foto con un zoom lento, el nombre de la sección que entra de costado, el título que
   aparece línea por línea, subtítulos que marcan la palabra que se dice y una barra de avance abajo.
2. **Clima animado:** la temperatura que sube hasta el valor, lluvia suave de fondo si llueve, y las barras de
   máxima y mínima de cada día que crecen de a una.
3. **Repaso con transiciones:** cada titular con su foto, el paso de uno a otro deslizando, y puntos arriba que
   dicen en cuál de los tres vas.

**Cómo se hacen:** cuadro por cuadro con las mismas herramientas que ya usa el proyecto (resvg para dibujar y
ffmpeg para juntar). No suma nada nuevo para instalar ni gasta voz: la voz es la misma de hoy, encima.
**Costo:** US$ 0. Tarda más en armarse (unos 3 minutos para 28 segundos de video en esta prueba, a 720 de
ancho; en GitHub sería parecido) y hay que medir que no atrase los horarios.
**Otras formas:** Remotion (gratis hasta 3 personas, más fácil para animaciones complejas) o efectos simples
de ffmpeg (zoom y fundidos, más rápido pero menos control).
**Cuidado:** el movimiento no puede tapar el crédito de la foto ni la marca de la sección; nada de música sin
licencia; en Policiales sigue sin haber foto real.
**Estado:** técnica comprobada con los ejemplos. **Les gustó (8/10).** Decidido:
- **Ninguna pieza queda con la imagen fija**: todas llevan alguna animación, porque tienen voz.
- **Todas llevan los subtítulos de la voz**, siempre en la misma franja (arriba del pie), con el mismo estilo
  de hoy: la palabra que se dice en rojo. Los ejemplos ya los muestran así.
- **Una sola estética para todas:** mismas letras, colores, pie y barra de avance.
- **La semana que viene** se unifican los criterios, se repasan todas las piezas y se elige la animación de
  cada una. Falta medir cuánto tarda en armarse en GitHub.
- **Segunda tanda de ejemplos (8/10):** clima con día lindo (sol que sale, nubes que pasan), farmacia de turno
  (una cruz verde que entra y late, el marcador de la dirección y los próximos días), participá (el número que
  se escribe solo, el globo de chat y el sobre del mail que se abre), efeméride (el año que corre hacia atrás
  hasta el del hecho, y "Y además" de a uno) y feriado (la hoja del calendario que pasa del 11 al 12, y un dato
  del censo que cuenta). Todos con subtítulos y la misma estética. Los íconos son dibujos propios y genéricos:
  ningún logo de marca (tampoco el de WhatsApp).
- **Tercera tanda (8/10):** farmacia con **dos y tres de turno** (una ficha por farmacia, cada una entra de un costado);
  feriado rehecho con el dato que **de verdad** sale el 12/10 (Colón, 1492, con una carabela que cruza); el clima
  **sin decir de dónde salen los datos** (eso va en la nota, no en la placa).
- **Feriados, decidido (8/10):** cada feriado tiene su animación y su dato propios (una fecha patria no es igual
  a un feriado religioso o a uno trasladable). **Los datos del feriado los elige el criterio editorial del medio**,
  que es de centro-derecha: la historia de la fecha y sus hechos, no estadísticas que no van con esa línea (el
  dato del censo que se usó en el primer ejemplo **no va**; en la pieza real del 12/10 no estaba: sale solo el
  dato de Colón). Hay que escribirlo en `CRITERIO-REDES.md` y revisar el campo "enfoque" de cada feriado en
  `web/data/feriados-piezas.json`.
- **El ejemplo de nota con foto** no corresponde a una pieza de hoy: las notas salen como posteos, no como
  reel ni historia. **Queda para evaluar** una historia que lleve al posteo, sin cargar de más: **las
  historias y los reels son para lo más relevante; los posteos, para llevar gente a la web** (8/10).

### Historias contra reels: qué conviene (análisis del 8/10)

**Hoy:** los tres repasos (10, 15 y 21) salen como reel y como historia; todo lo demás (clima de la mañana y de
la noche, farmacia, efeméride, feriado, participá, útiles, agenda) sale **solo como historia**.

**Lo que pesa más que todo:** una historia la ve **solo quien ya sigue la cuenta**, y hoy son 7 seguidores en
Facebook y 4 en Instagram. Un reel, en cambio, Meta se lo muestra a **gente que no sigue la cuenta**. Por eso
los reels tienen muchas más reproducciones, como vieron en Facebook. Con tan pocos seguidores, casi todo lo que
sale solo como historia **no lo ve nadie**.

**Recomendación:**
1. **Todo lo que tiene voz, como reel**, y el mismo video también como historia. No gasta voz extra: es el mismo
   archivo publicado dos veces.
2. **El clima y la farmacia como reel también.** Sirven todos los días y son lo más compartible. El reel queda
   en el perfil: la fecha tiene que estar grande y clara, para que nadie lea un clima viejo como de hoy.
3. **Instagram con un poco más de cuidado:** su perfil se llena de piezas diarias que vencen. Se puede probar
   todo como reel en Facebook (donde están las visitas) y, en Instagram, reel para repasos, efeméride, feriado
   y clima de la mañana, e historia para farmacia y participá.
4. **Medirlo en serio, 4 semanas:** alcance y reproducciones de cada pieza, separando seguidores y no
   seguidores (M3-4-7 en `MEJORAS.md`; la llave de Meta ya tiene permiso para leer esas estadísticas). Después
   se decide pieza por pieza.

**Lo que quedó (8/10, con lo que ven Hernán y Andrés en Facebook):**
- **Facebook:** clima y farmacia también como reel. Ahí la gente los mira mucho y suman alcance.
- **Instagram:** clima y farmacia solo como historia, para no llenar el perfil de piezas que vencen.
- **Todo lo demás con voz** (repasos, efeméride, feriado, participá): reel en las dos redes y el mismo video como
  historia.
- Se mide 4 semanas y se ajusta pieza por pieza.

**Límites que no molestan:** Facebook acepta hasta 30 reels por día por la API; hoy un día normal tiene unas 10
piezas.

### Una locución que sepa qué se dijo antes (aprobada el 8/10: se hace pronto, ver `PRIORIDADES.md`)

**El problema:** cada pieza se arma sola, así que de noche pueden salir tres seguidas que empiezan "Hola, buenas
noches", y ninguna sabe que llovió todo el día.

**La idea:** una "memoria del día" que cada guion consulta antes de armarse:
- **Cómo está el día:** si llueve, hace frío, calor o hay alerta, el guion lo puede nombrar ("en esta noche de
  lluvia, les paso el repaso").
- **Qué se dijo antes:** el saludo usado no se repite en el mismo día; la segunda pieza de la noche ya no saluda
  igual ("Seguimos con…", "Y para cerrar el día…").
- **Qué viene después:** cerrar con un adelanto ("a las 21, el repaso de la noche").

**Cómo:** con el mismo código que arma hoy los guiones (`redes/guiones.mjs`), con frases armadas y verificables,
sin IA para inventar. El libro de redes ya anota qué salió y a qué hora. No gasta voz extra.
**Cuidado:** que la referencia al clima sea cierta (sale de los datos del día) y que nunca se mezcle con
Policiales o Política. **Trabajo:** 1 o 2 días, con pruebas de que no se repita un saludo en el mismo día.

### Podcast, YouTube y TikTok (RS)

| Id | Idea | Estado | Trabajo | Lo que hay que saber |
|---|---|---|---|---|
| RS-0 | **Decidir el camino** y leer las reglas de cada plataforma sobre voces de IA | — | Persona | Antes de invertir tiempo |
| RS-1 | **Reproductor de audio en la nota del repaso** | Datos propios; depende de guardar el mp3 (Q1 en `MEJORAS.md`) | 2-3 días | Hoy el mp3 se descarta |
| RS-2 | **Feed de podcast** y alta gratis en Spotify y Apple | Solo búsqueda (reglas) | 1 semana | Spotify retira lo que imita voces reales (19/05/2026): avisar que es IA. Episodios de 55 s son cortos: uno diario que junte los tres |
| RS-3 | **Reels en YouTube Shorts** | Solo búsqueda | Medio | Un proyecto sin auditar sube **en privado**; hay que pasar una auditoría de Google, o subir a mano |
| RS-4 | **Reels en TikTok** | Solo búsqueda | Medio | Una app sin auditar publica **en privado**; la auditoría lleva 2 a 6 semanas; o a la bandeja y se termina a mano |

**Todo lo que se genera, guardado y aprovechado (pedido el 8/10):**
- Guardar el audio y el video de cada pieza (Q1 en `MEJORAS.md`), porque hoy se pierden.
- **Notas propias con audio:** por ejemplo, el clima del día como nota en la web, con su audio, su texto y los
  enlaces al reel en Facebook e Instagram. Lo mismo para la farmacia, la efeméride y los repasos.
- **Dos canales RSS bien armados:** uno de texto (todas las notas, con el cuerpo) y uno de audio (el podcast),
  que es el que leen Apple Podcasts y Spotify para sumar episodios.
- **¿Audio para el 100 % de las notas? Recomendación (8/10): no, por ahora.**
  - No mejora la posición en Google (lo dijo gente de Google en 2021 y en 2025).
  - Obliga a usar otra voz, distinta de la de las redes.
  - Suma trabajo y cosas que pueden fallar.
  - **Sí conviene** el audio en lo que **ya tiene voz** (clima, farmacia, efeméride, feriado y repasos), como nota en
    la web y en el podcast: no gasta nada más.
  - Si más adelante quieren audio en las notas de Balcarce, estas son las opciones:
  - **Edge TTS:** usa las voces de lectura en voz alta de Microsoft Edge, que tienen voces argentinas
    (Elena y Tomás). Es gratis, pero no es un servicio oficial: puede cortarse sin aviso y sus condiciones no
    contemplan el uso comercial.
  - **Azure Speech** (el servicio oficial de Microsoft, con las mismas voces argentinas): tiene un plan
    gratis por mes (a confirmar la cantidad); alcanzaría para las notas de Balcarce, no para todas.
  - En cualquier caso es una voz distinta de la de las redes: hay que decidir si se acepta.
- **SEO y que todo esté bien indexado:** sitemap, datos para Google, RSS y Search Console (ver V2-13, V2-11 y
  RSS-1 en `MEJORAS.md`).

**TikTok, el camino propuesto** (Hernán y Andrés: "a mano o lo que haga falta"):
1. **Ya, a mano:** el mp4 de cada reel queda como adjunto en GitHub (3 días; con Q1, más). Una persona lo baja
   y lo sube desde la app de TikTok, marcando "contenido generado con IA". Unos 2 minutos por video.
2. **Después, a la bandeja:** con una app de TikTok con la revisión básica, el robot deja el video en la bandeja
   de la cuenta y una persona solo toca "publicar". Pide crear la app y una persona que la registre.
3. **Al final, automático:** pasar la auditoría de TikTok (2 a 6 semanas, con video de demostración). Recién
   ahí se publica solo y en público.

---

## 8. Distribución y audiencia

**Datos que cambian lo que estaba anotado** (solo búsqueda):
- **Google Noticias** ya no tiene trámite de alta: incluye solo a los sitios que cumplen sus reglas
  (política editorial, firma y datos estructurados).
- **El Perfil de Empresa de Google** pide atención en persona: Radar casi seguro no califica.
- **Los canales de WhatsApp no tienen API oficial** para publicar. Las herramientas que lo hacen arriesgan
  el número.

| Id | Idea | Estado | Trabajo | Cuidado |
|---|---|---|---|---|
| D-1 | **Para pegar hoy**: un botón del panel que arma el texto del día para el canal de WhatsApp y los grupos de Facebook; una persona lo pega a las 7:30 | Datos propios | Bajo | Sin Política ni Policiales; reglas de cada grupo |
| D-2 | **Canal de WhatsApp de Radar** (farmacia y resumen), a mano | Trabajo humano | Bajo | Un mensaje por día |
| D-3 | **Boletín por correo "Balcarce a las 7"** (Brevo: 300 por día gratis) | Fuente accesible, sin probar | Medio | Datos personales: confirmación y baja |
| D-4 | **Bot y canal de Telegram** (`/farmacia`, `/clima`) | Fuente accesible, sin probar | Bajo-medio | Poco usado en Argentina: es un laboratorio |
| D-5 | **Avisame**: avisos del navegador por tema (corte de ruta, alerta, clases) | Solo búsqueda | Medio | En iPhone, solo con la página instalada |
| D-6 | **Lo que buscan y no encuentran** (Search Console, una página fija por búsqueda) | Depende de conectar Search Console | Bajo | "Confirmado el DD/MM" |
| D-7 | **Radar en la radio**: regalar el repaso a una FM a cambio de una mención | Especulación (que acepten) | Bajo | Algunas radios también son fuentes; decir que es IA |
| D-8 | **Alianza con clubes**: mandan resultados, reciben placa y colaboración | Trabajo humano | Medio | Mismo trato para todos |
| D-9 | **Mapa de Medios Bonaerenses** (Potencia Medios, formulario gratis) y Registro Oficial de Medios | Solo búsqueda | Bajo | Confirmar que siga vigente |
| D-10 | **Capacitaciones gratis** (Potencia Medios 2026, FOPEA y Google) | Solo búsqueda | Bajo | — |
| D-11 | **Fondos** (Impulso Local de ADEPA, ICFJ y Meta; programas de Google) | Solo búsqueda: hoy no hay convocatoria abierta confirmada y pedían más de un año publicando | Medio | Anotarse en los avisos de ADEPA, FOPEA y SembraMedia |
| D-12 | **El reclamómetro**: reclamos de vecinos con estado y seguimiento | Trabajo humano todos los días | Medio | Caras, patentes y uso político |
| D-13 | **La pregunta de los vecinos**: la gente vota una pregunta y se le hace al funcionario | Trabajo humano | Bajo | Preguntar a todos los bloques por igual |

---

## 9. Comercial: planes baratos y no invasivos

*Detalle y fuentes en la investigación comercial del 8/10. **Todos los precios son estimación** y los
deciden ustedes.*

### Referencias encontradas (solo búsqueda)

- No apareció ningún tarifario de un medio de Balcarce ni de una ciudad parecida. **El dato que más sirve
  se consigue preguntando a 2 o 3 comercios cuánto pagan hoy en la radio.**
- **Una FM chica:** $50.000 por mes (2 salidas diarias) a $112.000 (8 salidas).
- **Rotativos de radio:** $150.800 a $422.500 por mes; 10 % menos por 3 meses y 20 % menos por 6.
- **Facebook Ads:** con US$ 1 por día son unos $45.000 por mes, más 21 % de IVA y 30 % de percepción con
  tarjeta. Es el piso contra el que compite cualquier plan.
- **Un café:** ~$3.200.
- **Aportes de lectores:**
  - Cafecito se queda con ~5 %.
  - Mercado Pago con link: 6,6 % al instante o 1,56 % a 35 días, más IVA.
- **Monotributo categoría A:** tope de ~$12 millones por año (agosto 2026 a enero 2027). Confirmar con un
  contador.

**Lectura:** cobrar **por lugar y por tiempo**, nunca por cantidad de vistas; claramente por debajo de la
radio; ajustar cada 3 meses por inflación.

### La escalera de planes

Arranca en "un café por semana" y lo básico es siempre gratis. **Los montos propuestos y la estrategia de
lanzamiento no van en el repositorio público**: están en el documento privado de la investigación.

**Reglas para todos los planes:**
- Exclusividad por rubro del escalón 2 al 5.
- Nunca en Política ni Policiales.
- Una farmacia no auspicia la farmacia de turno.

| # | Plan | Qué incluye |
|---|---|---|
| 0 | **Ficha gratis** | Nombre, rubro, dirección, horario, WhatsApp y redes en la guía |
| 1 | **Vecino destacado** | Primero en su rubro y localidad, 3 fotos y una oferta por semana |
| 2 | **Presentado por** | Una línea en un servicio útil (clima, agenda, teléfonos útiles) en la web y en la voz que ya sale, sin audio extra |
| 3 | **Vidriera** | Aviso fijo en la web, más una mención por semana en un repaso, más el plan 1 |
| 4 | **Auspicio de sección** | "Agro, con el apoyo de…" en la sección, sus historias y su parte semanal |
| 5 | **Socio** | Todo lo anterior, una nota "Contenido patrocinado" por trimestre, el premio de la trivia y un informe mensual |

**Extras:**
- Historia propia.
- **Evento destacado** para organizadores: página del evento, historia y lugar en el boletín, rotulado
  "Publicidad". La agenda sigue gratis para todos.
- **Clasificados de vecinos:** gratis siempre; destacado pago para inmobiliarias y concesionarias.
- **Canje:** vale para el premio de la trivia, nunca para una nota.

### Formas gratis de traer auspiciantes y público

| Id | Vía | Estado | Impacto |
|---|---|---|---|
| K-1 | **"Presentado por" en clima y agenda** (escalón 2) | Datos propios; código chico | Alto |
| K-2 | **Guía gratis con mejora paga** (V-16) | Datos propios + confirmación | Alto |
| K-3 | **Cartel QR** en comercios (V-3): reparto gratis y auspicio a la vez | Trabajo humano | Alto |
| K-4 | **Ofertas de la semana**: una oferta gratis por comercio | Trabajo humano | Medio |
| K-5 | **Concurso "La foto del mes"**: el premio lo pone un auspiciante y las bases dan licencia para el banco de fotos | Trabajo humano | Medio-alto |
| K-6 | **Convenio con la Cámara de Comercio**: guía gratis para socios a cambio de la lista, 20 % menos para socios | Especulación (que acepten) | Alto |
| K-7 | **Aportes de lectores** ("Bancá a Radar") con Cafecito y alias | Solo búsqueda | Bajo hoy |
| K-8 | **Pauta oficial con reglas públicas**: misma tarifa que un comercio, rotulada, tope de ingresos (20 o 30 %), lo cobrado publicado en "Quién nos paga" | Decisión | Medio, con riesgo de independencia |
| K-9 | **Servicios digitales a comercios** (webs, redes), que ya están en el catálogo | Trabajo humano | Alto en plata |
| K-10 | **Contenido de marca con la herramienta de Meta** ("colaboración pagada") | Solo búsqueda | Hace visible y legal lo pago |
| K-11 | **Relevar el centro con Every Door** (app gratis que carga cada comercio en OpenStreetMap) y preguntar "¿te sumamos gratis?" | Trabajo humano, ~2 h por semana | Alto para el mapa |
| K-12 | **Pedir el padrón de habilitaciones** al Municipio (o por el Concejo) | Especulación (ley provincial dudosa para municipios) | Medio |

### Plan de 90 días (propuesto)

| Cuándo | Qué | Quién |
|---|---|---|
| 8 al 12/10 | Fiesta del Postre: confirmar fechas con Turismo, 50 volantes QR, "Dónde comer" solo con lo confirmado | Personas (+ código) |
| Semana 1 | Sacar el seguimiento comercial del archivo público (C-8 de `MEJORAS.md`) | Código |
| Semanas 1-2 | Página `/publicidad` con los planes, las reglas y los números reales; fijar precios; preguntar a 3 comercios; consulta con un contador; Mapa de Medios Bonaerenses | Personas + código |
| Semanas 1-4 | Relevar el centro con Every Door; reimportar el mapa con todas las localidades | Personas + código |
| Semanas 3-4 | Ofrecer los primeros planes; "presentado por" en la voz y la tarjeta; `/guia` en prueba | Personas + código |
| Mes 2 | Reunión con la Cámara; QR en 10 comercios; botón de aportes; Ofertas de la semana | Personas + código |
| Mes 3 | Informe mensual por ficha (vistas de Cloudflare); primeros cobros; concurso de la foto | Personas + código |

### Riesgos legales y decisiones

1. **Facturación:**
   - Publicidad es un servicio y entra en el monotributo con factura C.
   - Si arman una SAS, salen del monotributo.
   - Lo decide un contador.
2. **Sorteos:** la Ley 22.802 prohíbe condicionarlos a una compra. Mientras no se confirme qué pide la
   Lotería de la Provincia, hacer **concursos de habilidad** (trivia, foto) con bases publicadas.
3. **Lo patrocinado se rotula siempre:** "Espacio publicitario" y "Contenido patrocinado". El Código Civil
   prohíbe la publicidad engañosa.
4. **Datos de los comercios:**
   - Sí: nombre del local, rubro, dirección, teléfono comercial y de dónde salió cada dato.
   - No: nombre del dueño, DNI ni celular personal sin permiso.
   - En cada mensaje, el derecho a pedir la baja.
5. **Quién hace el trabajo de calle:** relevar, moderar los clasificados y atender el canal.

---

## 10. Herramientas gratis de código abierto (GitHub)

*Nada de esta lista está cerrado: lo descartado es "por ahora" y se puede volver a mirar.*

*Investigado el 8/10. Estrellas, fecha del último cambio y licencia, comprobados en GitHub ese día.
Condiciones y límites de los servicios, solo por búsqueda. Tiempos de ejecución: estimados, nada se
probó. Las que reemplazan algo que ya existe también están en `MEJORAS.md` (sección "Herramientas").*

**Cómo leer la licencia:**
- **MIT, Apache o BSD:** se puede usar todo, también para un medio comercial.
- **GPL o AGPL:** obliga a abrir el código propio si se mete adentro.
- **NC:** no permite uso comercial.

### Las 10 de más valor por esfuerzo

| # | Herramienta | Qué hace | Dónde entra | Licencia | Encaje |
|---|---|---|---|---|---|
| 1 | **`loudnorm` de ffmpeg** | Todas las piezas con el mismo volumen (−14 LUFS) | `reels/reel.mjs` (hoy no se normaliza) | Ya instalado | Una línea, 1-3 s por pieza |
| 2 | **Healthchecks.io** | Avisa si un robot deja de correr (aunque cron-job.org lo haya apagado) | Un `curl` al final de cada workflow | BSD-3; servicio gratis hasta 20 controles | Sin dependencias |
| 3 | **Pagefind** | Buscador de todo el archivo, sin servidor | `web/components/buscador.js` (hoy 36 horas y 27 KB repetidos en cada página) | MIT | Un paso después del armado |
| 4 | **ntfy** | Avisos al celular sin el riesgo de bloqueo de CallMeBot | `redes/avisos.mjs` | Apache-2.0; servicio gratis | Un `fetch`; el canal va en Secrets |
| 5 | **lychee** | Enlaces e imágenes rotas en todo el sitio | Auditoría de los lunes | Apache-2.0 | Programa aparte, 1-2 min |
| 6 | **smartcrop + sharp** | Recorte inteligente (sin cabezas cortadas) y fotos WebP más livianas | `web/lib/tarjeta.js`, `web/scripts/achicar-foto.mjs` | MIT y Apache-2.0 | En `web/` |
| 7 | **tesseract.js** (leer texto en fotos) | Segunda red contra marcas de agua: busca nombres de medios o ".com" en los bordes | `web/scripts/fotos-notas.mjs`, antes del banco | Apache-2.0 | 1-3 s por foto, sin cupo de IA |
| 8 | **trafilatura** | Extrae el texto limpio de una nota | Plan B de `ingesta/articulo.mjs` (21 de 23 fallas del 25/09 fueron del extractor) | Apache-2.0 | Paso en Python aparte que deja un JSON (no rompe la regla de `ingesta/`) |
| 9 | **whisper.cpp** | Ubica cada palabra en el audio: subtítulos que no "van a los tumbos" | `reels/alinear.mjs`, `reels/tiempos.mjs` | MIT | Programa aparte, modelo de 150 MB en caché |
| 10 | **Detección de caras (YuNet o MediaPipe)** | Freno por código: cara reconocible en Policiales, o en nota con palabras de menores, va placa | `web/scripts/fotos-notas.mjs` (cubre el pendiente de chicos en notas amarillas) | Apache-2.0 | Menos de 0,1 s por foto. **No estima edades** |

**Después:**
- **actionlint + Dependabot:** revisan los workflows y actualizan solas las acciones (MIT).
- **Vega:** gráficos SVG sin navegador, para "Balcarce en números", el dólar o el clima (BSD-3).
- **LanguageTool:** una segunda opinión de ortografía que no es IA, para la auditoría (LGPL). El servicio
  público prohíbe el uso automático: va con un servidor propio dentro del workflow.
- **pa11y-ci:** pruebas de accesibilidad semanales (LGPL).
- **Leaflet + PMTiles:** mapas con el mapa de Balcarce en un solo archivo, sin servidor (BSD). Para la
  guía y las farmacias.
- **Remotion:** reels animados escritos como página web. Es gratis con uso comercial hasta 3 personas; con
  4 o más se paga.

### Solo como idea

- **Satori:** placas nuevas con el mismo diseño que las tarjetas.
- **Datasette:** datos navegables en la web.
- **RSS-Bridge:** RSS para instituciones que no tienen.
- **changedetection.io:** vigilar páginas; mejor hacerlo con "git scraping" en Actions.
- **city-scrapers y civic-scraper:** modelo para "Lo que pasó en el Concejo".
- **Comparar por significado** (embeddings con transformers.js): juntaría "choque" con "accidente" en el
  cruce.
- **rembg:** quitar el fondo, solo con fotos propias.
- **auto-archiver de Bellingcat o la Wayback Machine:** guardar copia de lo que llega a Pistas.
- **Meedan Check:** verificación con línea de WhatsApp.
- **Kokoro:** voz de ensayo solo para medir tiempos sin gastar cupo, nunca para publicar.

### Ideas de otros medios para copiar

- **RADAR, de PA Media (Reino Unido):** plantillas con datos públicos que arman la misma nota para cientos
  de distritos, revisadas por personas. Es el molde COM-1.
- **City Bureau Documenters (Chicago):** lectores automáticos de actas más vecinos que toman notas.
- **Git scraping** (Simon Willison): bajar una página cada tanto desde Actions y guardarla en git, para
  ver qué cambió.

### Descartadas por ahora

- **Licencia que no conviene:** aeneas, whisper-timestamped y RSSHub (AGPL).
- **Voces gratis (Piper, Kokoro, sherpa-onnx) y ElevenLabs:** no están descartadas. Por ahora se sigue con
  Gemini (decisión del 8/10). Hernán y Andrés
  dijeron (8/10) que las voces siguen abiertas a cualquier cambio. Hoy chocan con la regla "la voz no se
  cambia", que también se puede revisar; quedan para evaluar escuchándolas (las voces en castellano de Kokoro
  no son rioplatenses).
- **Pesadas o abandonadas:** WhisperX, stable-ts, FFCreator, MoviePy, LAION Watermark y Human (que
  además estima edades, algo que no sirve para decidir).
- **Necesitan servidor:** Uptime Kuma, ArchiveBox, listmonk y Apprise (no hace falta).
- **Van contra las reglas de la plataforma:** tiktok-uploader, que maneja la sesión con un navegador.
- **Chequeado:** no tiene código público que se pueda usar.

## 11. Ranking general (valor sobre esfuerzo, con datos reales)

1. **ECO-1 La nafta en Balcarce:** comprobado al 7/10, automática y sin IA.
2. **AUT-1 TC con Mangoni:** comprobado, con el molde de F1 ya hecho.
3. **POL-1 La plata que manda la Provincia:** comprobado, mensual y sin IA.
4. **AGR-1 Balcarce en el mapa agrícola:** comprobado, un dato oficial del partido que nadie publica.
5. **D-1 Para pegar hoy:** ataca Facebook y WhatsApp, que es de donde viene casi todo el público.
6. **K-1 + V-3 "Presentado por" y QR:** el primer producto comercial, sin depender del tráfico.
7. **POL-3 Así vota Balcarce:** comprobado; se hace una vez y vale hasta 2027.
8. **BAL-1/ARG-1 La semana del bolsillo:** una razón para volver cada semana (trabajo humano).
9. **EDU-1 ¿Hay clases?:** una razón diaria (trabajo humano).
10. **DEP-1 Juegos Bonaerenses:** por fecha, lista antes del 19/10.
11. **R-1 Motor de carruseles + R-13 El finde en 5 placas:** si cambian la regla de Instagram.
12. **COM-4 Lector de boletines:** una pieza para tres secciones (fuentes accesibles).

## 12. Descartadas por ahora (y por qué)

*Ninguna está cerrada: si cambia algo, se vuelven a mirar.*

- **Cargos docentes del día (ABC):** piden usuario del portal.
- **Resultados de Aprender por distrito:** solo hay por provincia.
- **Cine local:** no hay sala en Balcarce.
- **Bases con una fila por víctima, búsquedas de personas, listas de detenidos:** chocan con el semáforo.
- **Soccerway y Sofascore:** no publican condiciones de uso.
- **Mistral para redactar:** exige aceptar que entrene con los datos.
- **Publicar automático en grupos de Facebook o canales de WhatsApp:** no hay API; arriesga la cuenta.
- **AdSense ahora:** paga centavos y mete scripts de terceros (ver C-2 en `MEJORAS.md`).
- **De las auditorías externas:**
  - **GA4 con banner de cookies:** mete scripts de terceros.
  - **Publicidad política (Spot-On) y nativa (MGID):** chocan con la neutralidad y con "nada de terceros".
  - **Video generado por IA (LTX):** inventa imágenes.
  - **Cambiar las direcciones a /año/mes/día:** rompe enlaces.
  - **Pasar a WordPress o Astro:** el armado actual funciona.
- **Perfil de Empresa de Google:** pide atención en persona.

## 13. Decisiones que necesitan a Hernán y Andrés

1. Las reglas de la sección 2: Instagram sin voz, "en vivo" con una persona, aviso de voz de IA.
2. Confirmar que **Santiago Mangoni** es de Balcarce y escribirle a la ACTC (AUT-1).
3. Confirmar si **"Campo de Pato"** es el Club Social Pato (DEP-2).
4. Pagar TheSportsDB o pedir permiso (FUT-2).
5. Cuáles secciones nuevas, en qué orden, y si Salud espera a una persona.
6. Quién llena cada planilla y quién hace los pedidos mensuales (Liga, clubes, Bomberos, bibliotecas, Salud).
7. Los precios y la estrategia de lanzamiento; quién factura; la pauta oficial (sí o no, con qué tope).
8. Quién pega "Para pegar hoy" cada mañana y quién atiende el canal de WhatsApp.
9. El camino para YouTube, TikTok y Spotify (RS-0).

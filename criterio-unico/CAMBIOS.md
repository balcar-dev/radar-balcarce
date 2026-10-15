# Qué cambia con el criterio único (borrador del 11/10/2026)

Nada de esto está hecho: son los cambios que habría que hacer en producción si Andrés y Hernán aprueban `CRITERIO-UNICO.md`. Los números de línea son los del código de hoy (11/10/2026).

---

## (a) Las 20 contradicciones y cómo quedó cada una

| # | Contradicción | Cómo quedó | Dónde queda dicho |
|---|---|---|---|
| C-1 | Tono "liviano" (para personas) contra "no es liviano" (lo que lee la IA) | Vale lo que lee la IA: la cercanía está en el dato justo, no en los adjetivos. El documento para personas ya no dice "liviano" | B13.ameno |
| C-2 | Foto con logo dudoso: el documento dice "no se usa", el código la usa | Vale el código: se pregunta si el logo podría estar en la foto de cualquier persona presente; si sí, no es marca | B16 |
| C-3 | Lo rojo: "nunca" contra "sale si una persona lo reescribe" | Dicho con las dos reglas: lo rojo no sale con el texto que lo puso en rojo, pero si se reescribe y ya no toca la lista, sale (regla 119); sólo el aviso fúnebre no sale nunca (regla 118) | B20 |
| C-4 | Acusaciones: el documento dice "siempre espera", el código suelta algunas | Vale el código (regla 96) y, por decisión de Andrés del 11/10, se amplía para Policiales de Balcarce con 2 o más medios. Lo rojo no cambia | B20 (marcado A CONFIRMAR CON HERNÁN) |
| C-5 | La zona: el documento dice una, el código otra | Una sola definición con tres niveles: Balcarce (partido, seis localidades, rutas 226 y 55 dentro del partido), La zona y De afuera | B1 |
| C-6 | Fórmula 1 sin argentino: tres versiones | Sólo entran las notas propias armadas con datos; las de otros medios, no | B4, B3 |
| C-7 | Copiar: 10 contra 12 palabras | Los dos números quedan, declarados en la tabla: 10 se le pide a la IA, 12 es donde el control rechaza | B14, B18 |
| C-8 | Nombre del medio: la nota de pista lo manda, la regla 8 lo prohíbe | Nunca. La nota de pista dice "atribuí a la fuente en general" | B8, B8.pista |
| C-9 | Cuatro definiciones de verificación BAJA | Una sola, la del código. "Declaración de parte" se borra de todos los textos | B20 |
| C-10 | Dólar: "no entra nunca" contra "espera a una persona"; el título propio dice "este viernes" | El dólar (y el clima) de otros medios se descartan. La nota propia del sitio sigue y debe escribir "el viernes", no "este viernes" | B4, B20 |
| C-11 | Cuerpo: se pide 70, se publica con 70 | Cambió dos veces por decisión de Andrés: ya no es un rango fijo. El único límite duro es el mínimo para publicar (70 palabras); el largo es una guía según la cantidad de fuentes (una fuente: 90 a 150; dos o más: 150 a 250) y se avisa a una persona si pasa de 300. Se agregó un orden de prioridad cuando no entra todo | B12, B18 |
| C-12 | Qué nota queda entre repetidas: tres órdenes | Se escriben las dos etapas por separado (antes de publicar / ya publicadas) | B20 |
| C-13 | Secciones: 11 en el código, 15 decididas | Quedan 15 definidas (nombre, qué entra, qué no, a cuál va si hay duda). Tecnología pasa a "Ciencia y tecnología" | B3 |
| C-14 | Clima: "no es nota" contra "va en Argentina o en Agro" | El clima de otros medios se descarta (servicio del sitio). Agro sólo toma el efecto del clima sobre la cosecha o el ganado | B3, B4 |
| C-15 | Menores: absoluto, relativo o con excepción | Víctima, acusado o testigo menor: nunca. Nota positiva con fuente oficial: se puede nombrar, con aprobación de una persona. Fotos: la regla de hoy (nunca; excepción oficial de Bomberos o Policía, que decide una persona) | B5 |
| C-16 | Fechas relativas: absoluto en el prompt, parcial en el código | La regla queda absoluta ("nunca este sábado"); el código hoy sólo la cumple a medias (ver cambios de código) | B9 |
| C-17 | "En vivo": el prompt cubre dos campos, el control cuatro | Una sola frase: título, bajada, guion y texto para redes | B10 |
| C-18 | Hashtags: etiquetas de la IA o fijos | **Sin resolver**: no se pudo decir sin leer `redes/`. Queda como A CONFIRMAR | (c) |
| C-19 | Fuentes de fotos: el criterio no lista todas | Se suma Wikimedia Commons (con autor y licencia) a las fuentes permitidas | B16 |
| C-20 | Fechas de "actualizado" que no coinciden | Este documento nace con la fecha real; al adoptarlo, `CRITERIO-EDITORIAL.md`, `docs/03` y `docs/04` dejan de repetir reglas | (b) punto 23 |

---

## (b) Cambios de código que implica (no implementados)

Los puntos 1 a 3 son los que cambian lo que se publica; el resto acompaña.

**1. Cuerpo: largo dinámico según la cantidad de fuentes** (decisión de Andrés)
- Hoy el código fija 70 a 180 como límites fijos: `ingesta/criterio.mjs:35-41` (`palabrasPedidasMinimo` 70, `palabrasPedidasMaximo` 180, `maximo` 1800 caracteres), el texto de corrección en `reels/reescritura.mjs:356` que los repite, el control por caracteres en `ingesta/verificar.mjs:267`, y `CRITERIO-EDITORIAL.md:270-274`.
- Habría que dejar **fijo sólo el mínimo para publicar (70)** y pasar el resto a guía: sacar `palabrasPedidasMinimo` y `palabrasPedidasMaximo`; agregar las guías 90 a 150 y 150 a 250; el tope de 1800 caracteres corta una nota de 250 a 300 palabras (hacen falta unos 2.100), así que habría que subirlo (propuesto 2400) o convertirlo en aviso a una persona.
- **El redactor tendrá que recibir la cantidad de fuentes** para elegir el rango: `entradaDe` (`reels/reescritura.mjs:233-250`) ya dice "una sola" o "N, numeradas" en el encabezado de FUENTES; hay que cuidar que el prompt y ese encabezado digan lo mismo, o pasar la cuenta como dato explícito.
- Bajada: `BAJADA.palabras` pasa de 50 a 55; `frasesMinimas` y `frasesMaximas` (`criterio.mjs:24-29`) no las usa ningún código y se retiran. El máximo de 360 caracteres sigue igual (`verificar.mjs:263`).
- `pruebas/criterio.test.mjs` compara la tabla con el código: hay que actualizarlo (claves nuevas: `CUERPO.guia*`, `CUERPO.avisoSiPasaDe`, `COPIA_PEDIDA`, `PARTES.datosMinimo/Maximo`, `IMPORTANCIA.*`, `SEMAFORO.*`; claves retiradas: `BAJADA.frases*`, `CUERPO.palabrasPedidas*`).

**2. De 11 a 15 secciones**
- Lista escrita en: `ingesta/lectura-ia.mjs:40-41` (`SECCIONES_DE_LA_FICHA`; `fichaValida` en `:159` además acepta "Servicios" y "País"); `ingesta/auditoria-ia.mjs:17-18`; `web/lib/datos.js:444, 450, 481` (la dirección `/seccion/tecnologia` no cambia, sólo el nombre mostrado); `web/public/panel/github.js:12`; `web/lib/notas-de-pistas.js:16`; `reels/presentacion.mjs:271`; `CLAUDE.md:109`.
- Palabras que clasifican por sección: `REGLAS_SECCION` (`ingesta/fuentes.mjs:937`) necesita reglas para Salud, Educación, Turismo y gastronomía, y Esports y juegos. La excepción de Tecnología (`ingesta.mjs:615-616, 684`, `PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO`) y la `seccion: "Tecnología"` de unas 20 fuentes en `ingesta/fuentes-cruce.mjs:159-196` y siguientes cambian de nombre.
- Números por sección: `MEDIOS_DE_AFUERA` (`criterio.mjs:176-183`) y `CUPO_DE_AFUERA` (`:206-219`) tienen la clave "Tecnología" (pasa a "Ciencia y tecnología"). Las cuatro nuevas caen en los valores por defecto (3 medios, cupo 15) hasta que se decida otro.
- La lectura devuelve la sección como lista cerrada (`ESQUEMA`, `lectura-ia.mjs:140`): hay que agregarlas.

**3. Policiales de Balcarce: regla 96 ampliada** (DECISIÓN DE ANDRÉS 11/10 — A CONFIRMAR CON HERNÁN)
- Hoy: `AMARILLO_QUE_SE_SUELTA_EN_LO_DE_ACA` y `AMARILLO_QUE_SE_SUELTA_SI_LA_CONFIRMAN` (`ingesta/fuentes.mjs:1210-1211`) y `aflojaParaLoDeAca` / `laMuerteFrena` (`ingesta/ingesta.mjs:779-794`). Una detención con un solo medio o una muerte sigue esperando.
- Cambio: en Policiales de Balcarce, con 2 o más medios, no frena la acusación ni la muerte ni el herido. Lo rojo no se toca. Toca el semáforo, por eso necesita la confirmación de Hernán.

**4. Regla 119 y menores en nota positiva**
- La regla 119 (lo rojo reescrito por una persona que ya no toca la lista sale) ya está en el código (`web/scripts/generar-datos.mjs:439-440, 559`); sólo falta que los documentos la digan, y B20 ya la dice.
- Lo nuevo: un menor nombrado en una nota positiva con fuente oficial tiene que ser amarillo, no rojo. Hoy `'menor de edad'` está en la lista roja (`fuentes.mjs:1062`) y `ingesta/menores.mjs:12-30` (`menorPorEdad`, usado en `ingesta.mjs:766`) trata a "un chico de 14 años" como tema delicado. Habría que distinguir "nota positiva" sin aflojar a víctima, acusado o testigo, que es lo que más cuidado pide (lista roja y leyes 26.061 y 26.485 sin cambios).
- El redactor recibe sólo `oficial` para organismos (`origenesDe`, `reescritura.mjs:148-169`, `MEDIOS_OFICIALES` en `fuentes.mjs:827`); un club o una escuela no están marcados, y la regla de B5 los incluye.

**5. Lista de figuras argentinas → que decida la IA**
- Hoy es una lista cerrada: `FIGURAS` (`ingesta/fuentes.mjs:1223`), usada por `figuraQueNombra` (`ingesta.mjs:548`) y por `n.figura` en `lectura-ia.mjs:374, 393` y `ingesta.mjs:723`. Con la nueva definición ("un argentino que protagoniza un logro o un hecho de peso nacional") la lectura tiene que devolver un campo nuevo `es_figura_argentina` (B7, B19.lectura): agregarlo a `ESQUEMA` y `fichaValida` (`lectura-ia.mjs:133-172`) y usarlo donde hoy se usa `n.figura`. La lista de `FIGURAS` queda sólo como ayuda o se retira.

**6. Boca y River como conexión argentina**
- `CONEXION_ARGENTINA` (`fuentes.mjs:917-918`) incluye `'boca'` y `'river'` por palabra en el título: "river" en inglés cuenta como conexión argentina. En el borrador (B4) se pide "un equipo argentino en una competencia de afuera" y lo decide la IA. Habría que sacar las dos palabras y ajustar `lectura-ia.mjs:382, 393, 396`.

**7. Reconocer las localidades y rutas de la zona**
- `PALABRAS_LOCALES` (`fuentes.mjs:856-861`) no tiene Los Pinos ni San Agustín (comentario en `:846-849`: se evitaron por colarse notas de fútbol europeo); `PALABRAS_ZONA` (`:869-873`) toma las rutas 226 y 55 en cualquier tramo y cualquier frase de papa. `tocaLaZona` (`ingesta.mjs:510-513`) y `esDeAca` (`:539-543`) no distinguen el tramo. Según B1, Balcarce es sólo el tramo dentro del partido; un tramo de afuera es "La zona" sólo si afecta a quien viaja desde o hacia Balcarce, y la papa sólo si la nota la ubica en Balcarce o el sudeste papero. Hace falta un modo de reconocer el tramo (por localidades o kilómetros).
- `ingesta/perfil-balcarce.md` pasa a ser el bloque B2 (y las localidades, a B1).

**8. Dólar y clima de otros medios**
- El dólar es hoy amarillo (`REGLAS_SEMAFORO.cotizacion`, `fuentes.mjs:1151`; `MOTIVO_COTIZACION`); debe pasar a descartarse. Del clima no hay ninguna regla: habría que crear el filtro. `lectura-ia.mjs:88, 89, 92` todavía mencionan dólar y clima como contenido de Economía, Agro y Argentina.
- La nota propia del dólar escribe "este viernes 25" (`web/lib/notas-propias.js:191-192, 203`; también `:378` y `:602`); habría que escribir "el viernes 25". Lo mismo el ejemplo de `CRITERIO-EDITORIAL.md:644`.

**9. `PEDIDO_DE_PISTA`**
- `panel/nota-de-pista.mjs:12` dice "atribuí cada dato al medio que lo dijo": cambiar por el texto de B8.pista ("atribuí a la fuente en general").

**10. Campo importancia**
- `IMPORTANCIAS`, `ESQUEMA` y `fichaValida` (`lectura-ia.mjs:45, 143, 160, 166`) ya tienen el campo, pero el prompt nunca lo definía. Ahora B7 lo define con cantidad de medios, y la IA tiene que **recibir esa cantidad**: `entradaDeNota` (`lectura-ia.mjs:122-125`) hoy no manda `medios_que_la_cuentan`. El único uso en el código es `nacionalQueImporta` (`:383-384`).
- Los campos `ambito` (`:42`), con cinco valores, no coinciden con los tres niveles. Sugerencia: reducir a balcarce, zona, afuera (más un indicador de otro país).

**11. Control del nombre del medio**
- `ingesta/verificar.mjs:820-866` sólo controla el nombre del medio en el texto para redes. Habría que extenderlo al título, la bajada, el cuerpo y el guion (dejando pasar un organismo oficial).

**12. Cargar los bloques en lugar de las marcas viejas**
- `ingesta/prompt-editorial.mjs:30, 65-77` lee `PROMPT:REGLAS`, `TONO_AMENO`, `TONO_SERIO`, `NOTA_PANEL` y `PALABRAS_SERIAS`. Habría que leer `BLOQUE:Bx` (la lógica de `armar-prompts.mjs` ya lo hace) y mantener el marcador `RELLENO` y `PALABRAS_SERIAS`.
- Textos que hoy están en el código y pasarían a venir del documento: `lectura-ia.mjs:69-95` (y `:129`, que pega el perfil), `:435-439` (parejas), `:505-508` (repetidas), `auditoria-ia.mjs:64-78`, `ingesta/fotos.mjs:124-170` y `:328-337` (persona pública), `ingesta/pistas.mjs:52-54` y `:161-162`, `reels/reescritura.mjs:352, 356`, `redes/prompt-redes.mjs:138` con `CRITERIO-REDES.md:329-347` (voz). Las copias de `pruebas-modelos/probar.mjs:56, 71` también quedan viejas.
- Con el criterio único, `entradaDe` (`reescritura.mjs:233-250`) debería mandar sólo etiquetas cortas: B8 ya explica qué es cada dato.
- El redactor ya no pide el campo `nivel` (B15): `extrasDeLaRespuesta` (`reescritura.mjs:319, 389`) tiene que aceptar su ausencia.

**13. Tono serio por palabra entera**
- `esTemaSerio` (`reels/reescritura.mjs:74-77`) usa `texto.includes(p)`: "robo" encuentra "robot". Pasar a palabra entera, con la lista visible de B20.

**14. Fórmula 1**
- `lectura-ia.mjs:322-323` (comentario "lo del extranjero que no es automovilismo") y `fuentes.mjs:883-901, 886-888` dejan entrar el automovilismo de otro país en el filtro de secciones. Para que sólo entren las notas propias (`ingesta/f1.mjs`), hay que sacar esa excepción. El cupo de 6 de `CUPO_DE_AFUERA.Automovilismo` (`criterio.mjs:197-203, 215`) quedaría sin sentido para la F1 de afuera.

**15. Chimento, publicidad y promoción**
- `lectura-ia.mjs:93-94` pasan a las definiciones de B4 (con 5 ejemplos de cada lado de chimento). `REGLAS_SEMAFORO.promocional` (`fuentes.mjs:1138`) y su motivo en el panel deben usar la misma frase que la lectura. Comentario de `criterio.mjs:216-218` sobre la farándula en Cultura y agenda.

**16. Verificación BAJA**
- La lógica (`reescritura.mjs:582-587, 646-653`) no cambia. Hay que borrar "declaración de parte" de `CRITERIO-EDITORIAL.md:437, 951-953`, del paso B del prompt (`:855`) y de la explicación del campo `nivel` (`:901`).

**17. "El mismo hecho"**
- Un solo texto para parejas y repetidas (`lectura-ia.mjs:435-439, 505-508`, hoy distintos: sólo las parejas tienen "ante la duda" y "anuncio contra resultado"). Los tres umbrales (`ingesta/cruce.mjs:21-27`, `web/lib/repetidas.js:46-51, 167-179`) están ahora en la tabla de números. Ambos prompts hablan de "un medio de Balcarce": ahora dicen Radar Balcarce.

**18. Fechas relativas** (C-16)
- `arreglarEscritura` (`verificar.mjs:604-657`) cambia "este X" por "el X" sólo si hoy no es X, y no controla "ayer/hoy/mañana". Para que cumpla lo que pide B9 habría que cambiar siempre "este X" y controlar "ayer/hoy/mañana".

**19. Copia y citas**
- El 12 se controla (`verificar.mjs:747, 851`); el largo de una cita (10) no lo controla nadie. `COPIA_PEDIDA` es una clave nueva en `criterio.mjs:63`.

**20. Fotos**
- `fotos.mjs:150-153` ("nunca publica la foto de un menor") no conoce la excepción de foto oficial de Bomberos o Policía que sí tiene el criterio; B5 la deja en manos de una persona. Si se quiere aplicar, es un cambio de código.
- Wikimedia Commons ya está en el código (`fotos.mjs:400-445`); sólo faltaba en el documento.

**21. Auditoría**
- `auditoria-ia.mjs:20-28` (`TIPOS`) necesita el tipo nuevo "estilo" (B17), y `:70` ("un dato personal que no debería") ahora se define en B5.texto. El prompt armado de auditoría mide 6.943 caracteres contra 2.173 de hoy: con el tope de 8.000 tokens por minuto de Groq (`auditoria-ia.mjs:14, 33-45`) hay que probarlo antes de pasarlo.

**22. Relleno**
- La lista (`criterio.mjs:83-90`) queda igual (26 frases); lo único nuevo es que vive en B13 junto con las frases de gancho. Una prueba obliga a que digan lo mismo.

**23. Documentos**
- `CRITERIO-EDITORIAL.md:3`, `CLAUDE.md:3`, `docs/03-SELECCION.md` y `docs/04-REDACCION.md` dicen "29/09". Al adoptar el criterio único, esos documentos deberían quedar sólo con "cómo lo hace el código" y remitir a `CRITERIO-UNICO.md`.

---

## (c) Lo que quedó marcado "A CONFIRMAR"

**Decisiones de Andrés que tocan algo más**
1. **Policiales de Balcarce, regla 96 ampliada: DECISIÓN DE ANDRÉS 11/10 — A CONFIRMAR CON HERNÁN.** Toca el semáforo (B20, tabla de números `SEMAFORO.mediosParaSoltarPoliciales`).
2. Importancia alta, media y baja (alta: cambia algo concreto o 5 medios o más; media: 3 o 4 medios): propuesta del inventario, a confirmar (B7, `IMPORTANCIA.*`).

**Definiciones nuevas que inventé**
3. Las **cuatro secciones nuevas**: Salud, Educación, Turismo y gastronomía, Esports y juegos (B3).
4. Los "qué no" y "si hay duda" de las 11 secciones que ya existían, redactados a partir de lo que hace el código (B3). En particular: Agro toma el efecto del clima sobre la cosecha pero no el pronóstico; Ciencia y tecnología cede a Salud, Esports y juegos y Agro.
5. "La zona": qué tramos de las rutas cuentan, cuáles son los vecinos inmediatos (propuse Lobería, Ayacucho y Mar Chiquita) y que la papa cuenta sólo en el sudeste papero (B1).
6. Los 5 ejemplos de cada lado de chimento y Cultura y agenda (B4). La muerte de una figura va a la sección de su actividad.
7. Boca y River (y la Selección) como conexión argentina cuando juegan afuera, decidido por la IA y no por palabra (B4).
8. Qué es "dato personal" (domicilio, teléfono, DNI, datos bancarios o de salud de un particular) (B5.texto).
9. Un menor en nota positiva: lo nombra una fuente oficial, su club o su escuela, y siempre aprueba una persona; el semáforo lo deja amarillo (B5, B20). Y la foto: la excepción de Bomberos o Policía la decide una persona.
10. Orden de prioridad del cuerpo cuando no entra todo: dato central y datos prácticos, contexto, lo que sigue (B12).
11. Tope de aviso a una persona si el cuerpo pasa de 300 palabras, y subir el máximo de 1800 a 2400 caracteres (B18).
12. El tipo de hallazgo nuevo "estilo" en la auditoría (B17).
13. "Popular" definido como "la cuentan 5 medios o más" (B7).
14. Las cuatro secciones nuevas usan los valores por defecto de medios mínimos y cupo (B20).
15. Tono serio: revisar si "crisis" y "conflicto" deben seguir en la lista (B20). La lista queda con 21 palabras: se sacó "inundacion" sin tilde, porque se compara sin tildes.

**Sin decidir**
16. Hashtags (C-18): ¿salen de las etiquetas de la IA o son fijos? No se pudo resolver sin leer `redes/`.
17. Política en la web (V-20 del inventario) sigue como hoy: sale sola si el semáforo da verde.
18. Relleno (V-18): se mantuvo la lista completa de 26 frases por la prueba que la compara con el código; "una lista corta" quedaría para otra vuelta.

**Notas de armado**
- Parejas y repetidas no llevan B1 (el glosario): el inventario lo pedía porque allí estaba "mismo hecho"; en este borrador esa definición está en B6.
- Tamaño de los prompts: ver la tabla que muestra `armar-prompts.mjs`. El redactor baja 15 %; lectura, parejas, repetidas y auditoría suben porque ahora llevan las definiciones que antes sólo vivían en el código o en otros textos.

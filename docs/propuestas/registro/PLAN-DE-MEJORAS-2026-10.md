# Plan de mejoras · 8 de octubre de 2026

> **Registro de la investigación del 8/10/2026.** Este archivo mezcla mejoras de lo que ya existe con ideas nuevas, y se conserva solo como historial y como fuente del detalle. **Las listas vigentes y ordenadas están en `docs/propuestas/MEJORAS.md` (sobre lo que ya existe) y `docs/propuestas/IDEAS-NUEVAS.md` (propuestas nuevas).** Algunas afirmaciones de acá se corrigieron después: manda lo que dicen esos dos archivos.

*Borrador de trabajo. **No se aplicó nada**: es el registro de todo lo investigado y de cada
mejora propuesta, con el detalle paso por paso, para decidir después y hacerlo junto. Cada
ítem tiene un número (A1, B3…) para poder nombrarlo. Sale de la auditoría del 8/10
(`docs/AUDITORIA-2026-10-08.md`) y de las investigaciones de ese día: tiempos reales de
GitHub Actions, fuentes que fallan, lectura de feeds, fotos, documentación, precios.*

*Cómo leerlo: **Qué** (en una línea), **Por qué** (la evidencia medida), **Pasos**,
**Riesgo / costo**. Los números marcados "medido" salen de los registros reales; los
marcados "supuesto" son una estimación a confirmar. Los precios de servicios de afuera
salen de búsquedas en sitios de terceros: hay que confirmarlos en la página oficial antes
de pagar.*

*Criterio acordado el 8/10: no nos atamos a las reglas escritas para proponer cambios, y lo
que se contradiga se unifica más adelante. **Única excepción de fondo:** no identificar a
menores ni a víctimas; eso se habla antes de tocarlo, porque es una cuestión de daño real y
no de estilo.*

---

## 0. Resumen: todo en una tabla

| Id | Qué | Impacto | Esfuerzo | Costo | Riesgo |
|---|---|---|---|---|---|
| **A1** | Publicar con una sola impresión del sitio | Alto (−2 min) | Medio | 0 | Medio |
| A2 | Guardar la memoria de impresión (caché de Next.js) | Medio | Bajo | 0 | Bajo |
| A3 | Fotos y reescritura con 2 o 3 pedidos a la vez | Medio (−1 a 2 min) | Medio | 0 | Medio |
| A4 | No reabrir las notas ya vistas en las 3 páginas raspadas | Bajo | Bajo | 0 | Bajo |
| A5 | Pruebas por cambio de código, no en cada ciclo | Medio (seguridad) | Bajo | 0 | Bajo |
| A6 | Medir el tiempo de cada tramo en el registro | Bajo, habilita lo demás | Bajo | 0 | Bajo |
| A7 | Vigilante del vigilante (healthchecks.io) y segundo canal de aviso | Alto (seguridad) | Bajo | 0 | Bajo |
| **B1** | Guardar el motivo real de cada fuente caída | Alto, habilita todo | Bajo | 0 | Bajo |
| B2 | Reintentar una vez las fuentes que fallan | Alto | Bajo | 0 | Bajo |
| B3 | Tope de pedidos simultáneos en la bajada | Medio | Bajo | 0 | Bajo |
| B4 | Probar User-Agent de navegador por fuente | Medio | Bajo | 0 | Bajo |
| B5 | Recuperar Puntonueve (medio de Balcarce) | Alto | Bajo | 0 | Bajo |
| B6 | Apagar con nota las fuentes que nunca andan | Bajo | Bajo | 0 | Bajo |
| B7 | Evaluar y sumar fuentes locales nuevas | Alto | Medio | 0 | Bajo |
| **C1** | Miniaturas de 400 px | Alto (−80 % en secciones) | Bajo | 0 | Bajo |
| C2 | Imágenes de vista previa (WhatsApp) en JPG | Alto en WhatsApp | Bajo-medio | 0 | Bajo |
| C3 | WebP o AVIF con `<picture>` | Medio-alto | Medio | 0 | Medio |
| **C4** | **Que las fotos no se repitan** (reglas por tipo de foto) | Alto (calidad) | Medio | 0 | Bajo |
| C5 | El banco de fotos como base de datos con etiquetas | Alto (habilita C4) | Medio | 0 | Bajo |
| C6 | Crédito completo (autor, licencia, enlace, "adaptada") | Alto (derechos) | Bajo | 0 | Bajo |
| C7 | Sin foto real de chicos en notas amarillas | Medio (riesgo) | Bajo | 0 | Bajo |
| C8 | Reintentar las 9 fotos "no se pudo volver a bajar" | Bajo | Bajo | 0 | Bajo |
| **D1** | Evaluar proveedores de IA para redactar | Alto (costo y calidad) | Medio | casi 0 | Bajo |
| D2 | Segunda clave de voz en otro proyecto de Google | Alto (continuidad) | Bajo | 0 | Bajo |
| D3 | Fijar versión del modelo de Gemini | Medio | Bajo | 0 | Bajo |
| **E1** | Plataforma: qué pagar para independizarse (menos de US$ 10) | Alto | Medio-alto | US$ 5 a 9 | Medio |
| **F1** | Idea "cada sección como un medio" | A decidir | Alto | — | Alto |
| **G1** | Documentación: 14 contradicciones, una página para no técnicos, podar | Alto | Bajo-medio | 0 | Bajo |
| H1 | De 11 a 15 secciones con barra lateral | Alto | Alto | 0 | Medio |
| I1 | Fuentes y contenido local, comercial | Alto | Alto | — | — |

---

## A. Velocidad y flujo de trabajo

**Dato central (medido, corrida de las 22:30 del 7/10):** de que arranca la corrida a que la
nota queda publicada pasan **6 min 58 s**. Son dos robots seguidos.

| Tramo | Segundos |
|---|---|
| Robot 1 · preparar y probar el código | 27 |
| Leer unas 236 fuentes | 31 |
| La IA lee y clasifica | 14 |
| La IA escribe | 57 |
| Buscar fotos (estimado) | 50 |
| **Imprimir el sitio (1ª vez)** | **66** |
| Robot 2 · esperar y preparar | 16 |
| **Imprimir el sitio (2ª vez)** | **111** |
| Subir a Cloudflare | 29 |

El 42 % del tiempo es imprimir dos veces. Y lo que más pesa para el lector no son esos 7
minutos sino el ciclo de 30: la demora media real es de unos 22 minutos.

### A1 · Publicar con una sola impresión
- **Qué:** que el sitio se arme una vez y esa misma versión se suba a Cloudflare.
- **Por qué:** `actualizar.yml` arma el sitio como control y `cloudflare-deploy.yml` lo vuelve a
  armar para publicar (66 s + 111 s). Se separaron porque el segundo corre también a mano y
  con un token propio de Cloudflare, que solo lee el repo.
- **Pasos:**
  1. Elegir la forma: (a) que el primer robot suba `web/out` como archivo adjunto y el segundo
     solo lo baje y lo suba; o (b) pasar la subida al mismo robot, con el token de Cloudflare
     como secreto de ese workflow.
  2. Probar en la rama con "Run workflow" a mano, sin tocar `main`.
  3. Comprobar que el sitio publicado es idéntico (misma cantidad de páginas, el control de
     SEO sigue verde, `_redirects` presente, la foto del dólar generada).
  4. Conservar la opción de "Run workflow" a mano del deploy (que reconstruya solo si se
     pide).
- **Riesgo / costo:** medio. `web/out` pesa ~340 MB; verificar el límite de archivos adjuntos.
  Ahorro esperado: unos 2 minutos (de 7 a 5).

### A2 · Memoria de impresión
- **Qué:** guardar la caché de Next.js (`web/.next/cache`) entre corridas.
- **Por qué:** el registro dice "No build cache found" en cada impresión.
- **Pasos:** agregar `actions/cache` para esa carpeta en los dos workflows (o solo en el que
  quede, si se hace A1); medir antes y después.
- **Riesgo / costo:** bajo; el ahorro hay que medirlo (no lo sé).

### A3 · Dos o tres pedidos a la vez en fotos y reescritura
- **Qué:** hoy se hacen de a uno (`for … await`); pasarlos a 2 o 3 simultáneos.
- **Por qué:** son 57 s de reescritura (`reels/reescritura.mjs`, línea 1070) y ~50 s de fotos
  (`ingesta/fotos.mjs`) en serie.
- **Pasos:**
  1. Reescritura: procesar la lista de notas con un tope de 2 o 3 a la vez.
  2. Fotos: lo mismo, respetando el tope de 8.000 tokens por minuto de Groq.
  3. Cuidar el límite por minuto de Gemini; el 429 ya está contemplado en el código.
  4. Pruebas nuevas con el caso real de varias notas simultáneas.
- **Riesgo / costo:** medio (cupos). Ahorro esperado: 1 a 2 minutos.

### A4 · No reabrir lo ya visto en las páginas raspadas
- **Qué:** las 3 fuentes raspadas abren cada nota una por una, de a 4, en cada corrida
  (`ingesta/ingesta.mjs`, `ampliar`, líneas 267 a 298).
- **Pasos:** usar `vistas.json` para saltear las ya conocidas; prueba con una nota repetida.
- **Riesgo / costo:** bajo; recorta ~15 pedidos por corrida.

### A5 · Pruebas por cambio de código
- **Qué:** que las 1.840 pruebas corran cuando alguien cambia código, y en el ciclo de datos
  quede un control corto.
- **Por qué:** las pruebas tardan solo 16 s (corrijo lo dicho antes: no son lo lento), pero una
  prueba que depende de la hora o un JSON mal escrito congeló la web dos veces (3,5 h y 10 h).
- **Pasos:** (1) crear `pruebas.yml` con `on: push` ignorando `web/data/**`; (2) en el ciclo,
  dejar solo: JSON válido, `motivo/cuando/por` de `correcciones.json` y `retiradas.json`, y
  el control de SEO; (3) probar en la rama con un cambio de código y uno de datos.
- **Riesgo / costo:** bajo.

### A6 · Medir cada tramo
- **Qué:** imprimir en el registro cuánto tarda cada tramo (fuentes, IA, fotos).
- **Por qué:** hoy no se imprime por separado; los 50 s de fotos son una estimación.
- **Pasos:** envolver cada tramo con un cronómetro y una línea de registro.

### A7 · Vigilar al vigilante
- **Qué:** que alguien avise si el propio vigilante deja de funcionar.
- **Por qué:** `redes/vigilar.mjs` solo mira 3 workflows (Actualizar, Redes, Cloudflare); no mira
  Vigilancia, Auditoría IA, Pistas, Panel del celular ni Armado vacío. Y CallMeBot es de un
  solo teléfono y sin garantía.
- **Pasos:** (1) crear una cuenta gratis en healthchecks.io; (2) pegar la URL como secreto
  (la pega una persona); (3) un `curl` al final de `vigilancia.yml`; (4) sumar un segundo canal
  (Telegram o ntfy.sh, solo `fetch`, sin dependencias); (5) sumar los workflows que faltan a la
  lista que mira el vigilante.
- **Riesgo / costo:** bajo; gratis.

---

## B. Fuentes

**Lo medido (6 corridas del 8/10):** hay **236 fuentes activas** de 254 cargadas (201 RSS, 7
Atom, 25 índices, 3 raspadas), de unos 110 sitios. **Fallan entre 24 y 84 por corrida** (10 %
a 35 %). Casi todas son **RSS comunes**: el tipo de fuente no es la causa.

- **Crónicas (fallan siempre):** Municipio de General Alvarado y San Cayetano; INCAA, Teatro
  Colón, Todo Agro, Córdoba Competición; Google, DeepMind, Microsoft, Nvidia, NASA, ESA;
  ESPN y TNT Sports (a veces contestan "0 notas"); Mundo Ascenso (HTTP 403 explícito).
- **Casi siempre (5 de 6 corridas), pero andan en algunas:** **Puntonueve (de Balcarce)**, La
  Nación, Clarín, TN, Perfil, iProfesional, iProUP, El Economista, los feeds de Agro, 0223.
- **Intermitentes:** medios regionales (Ayacucho, Necochea, Tandil, Mar del Plata), Diario
  Popular, Ámbito, C5N.
- La corrida de las 02:00 fue distinta: casi todas las "crónicas de GitHub" anduvieron y
  fallaron otras. Parece depender de la máquina de GitHub que toque, no solo de la fuente.
- **Lo que hace el código hoy** (`ingesta/ingesta.mjs`): un `fetch` simple, 15 s de espera,
  **sin reintento**, un solo User-Agent, y **las ~236 a la vez sin tope**. Descarta el motivo
  real del error y solo guarda "fetch failed".

### B1 · Guardar el motivo real de cada caída
- **Qué:** registrar el error de fondo (conexión cortada, nombre no encontrado, certificado,
  tiempo agotado, código HTTP) en el aviso de "Fuente caída".
- **Por qué:** sin eso, todas las causas de arriba son suposición.
- **Pasos:** (1) en `traer()` conservar `err.cause` y el código HTTP; (2) mostrarlo en el
  `::warning::`; (3) guardar un resumen por fuente en un archivo de estado (cuántas corridas
  seguidas lleva caída y por qué); (4) prueba con un error simulado de cada tipo.
- **Riesgo / costo:** bajo. **Es lo primero**: habilita B2, B4 y B6.

### B2 · Reintentar una vez
- **Qué:** si una fuente falla con "fetch failed" o tiempo agotado, reintentar una vez al
  final de la bajada, con pausa corta.
- **Por qué:** muchas de las que fallan 5 de 6 veces andan algunas veces.
- **Pasos:** reintento único y escalonado, fuera de la ráfaga principal; contar cuántas se
  recuperan para decidir si vale la pena.

### B3 · Tope de pedidos simultáneos
- **Qué:** limitar a 20 o 30 pedidos a la vez y no pedir juntos los feeds de un mismo sitio.
- **Por qué:** hoy se lanzan 236 a la vez. Permite separar "me bloquea el sitio" de "mi ráfaga
  satura la red".
- **Pasos:** una cola con tope; comparar la cantidad de fallas antes y después con B1.
- **Cuidado:** no debería alargar mucho los 31 s actuales.

### B4 · User-Agent de navegador, fuente por fuente
- **Qué:** probar el User-Agent de un navegador común (con `accept` de feed) en las que
  fallan: Puntonueve, ESPN, TNT, Mundo Ascenso y los diarios.
- **Por qué:** hoy se identifica como "RadarBalcarce/0.1"; algunos sitios rechazan lo que no
  parece un navegador. TNT ya mejoró con un nombre parecido.
- **Pasos:** campo `userAgent` por fuente en `ingesta/fuentes.mjs`; activarlo de a una.
- **Riesgo / costo:** bajo, pero conviene respetar los términos de cada sitio.

### B5 · Recuperar Puntonueve
- **Qué:** es el único medio de Balcarce que falla (5 de 6 corridas) y la nota del código dice
  que es "el más rápido en avisar".
- **Pasos:** (1) B1 para saber el motivo; (2) probar con User-Agent de navegador, con `http`, y
  con otra dirección del feed (como se hizo con News Balcarce); (3) si no hay forma, un
  segundo acceso (por ejemplo, un Worker de Cloudflare que lea el feed y lo reexponga);
  (4) prueba con el feed real.

### B6 · Limpiar las que nunca andan
- **Qué:** apagar con `activa: false` y una nota las que no andaron en ninguna corrida
  (Alvarado, San Cayetano, el grupo de Google/OpenAI/NASA si B1 confirma que no hay arreglo).
- **Por qué:** ensucian el aviso amarillo de cada corrida y esconden lo que de verdad es nuevo.
- **Pasos:** ejecutar después de B1/B4; correr `node ingesta/listar-fuentes.mjs` para rehacer
  `FUENTES.md`.

### B7 · ¿Hace falta sumar fuentes? (evaluación)
- **Qué:** decidir si faltan fuentes y cuáles, antes de seguir agregando.
- **Lo que se sabe:** casi todo lo local sale de 4 medios (Infórmese Primero 143, Radio Gabal
  135, La Vanguardia 134, El Diario 100 en lo que va del archivo). Aportan poco News Balcarce
  (36), Acción 5 (7), Ahora Balcarce (4); Radio Sudestada bloquea a GitHub; Minuto Balcarce
  está dormido; Sendero Regional, apagado. **Sin ninguna fuente hoy** (todo "a verificar"):
  Concejo Deliberante, boletín oficial, INTA Balcarce, Facultad de Agrarias, cooperativa,
  Hospital, Bomberos, Consejo Escolar, clubes, Cámara de Comercio.
- **Pasos:** (1) lista de candidatas con la URL real **verificada a mano** (no inventar); (2)
  para cada una, ver si tiene feed; si no, evaluar páginas, Facebook o un Worker; (3) probar
  de a una con B1 activo; (4) medir cuántas notas nuevas aporta cada una en una semana antes
  de dejarla.
- **Cuidado:** más fuentes = más tiempo y más fallas; conviene sumar solo lo local y lo que
  hoy no existe.

---

## C. Fotos

**Lo medido:** 573 archivos y 44,3 MB (559 JPG, 13 WebP, 1 PNG). Promedio 77 KB, mediana 64 KB,
máximo 528 KB; 48 pasan los 150 KB. Una sola versión por foto: JPEG de hasta 1.200 px, calidad
ffmpeg `q:v 7` (`web/scripts/achicar-foto.mjs`). La portada baja 5 fotos (~360 KB). **89 % de
las notas de 7 días tiene foto**; Policiales 17 % y Deportes 63 % son las más flojas. Las que
quedan sin foto en 7 días (36): 14 por un menor reconocible, 5 por Policiales sin fuente
oficial, 3 por marca de agua, 14 mejorables (5 fallaron, 3 solo tenían el logo del medio, 3 sin
foto en la fuente, 2 con el máximo de intentos, 1 un flyer). Las vistas previas para redes son
PNG de 370 KB de promedio (máximo 767 KB); las tarjetas de Instagram, de 818 KB (máximo 1,8 MB).

### C1 · Miniaturas de 400 px
- **Por qué:** las miniaturas de 240×180 (`FilaConMiniatura`) bajan la foto completa de 1.200 px
  (~77 KB); una de 400 px pesaría 5 a 10 KB. Las páginas de sección cargan de 8 a 15 fotos.
- **Pasos:** (1) al guardar cada foto, generar también `*-400.jpg` (`web/scripts/achicar-foto.mjs`);
  (2) usarla en `FilaConMiniatura` y en las postales chicas; (3) migrar las ya guardadas con un
  script único; (4) comprobar que `fotoDeLaNota` (tarjetas) sigue leyendo la grande.
- **Ahorro medido en muestra:** WebP a 400 px = 16 % del peso actual.

### C2 · Vista previa para WhatsApp en JPG
- **Por qué:** `og:image` es un PNG de 1200×630 con la foto adentro; pesa mucho para lo que es
  (supuesto: conviene menos de 300 KB).
- **Pasos:** cambiar el formato de salida de `web/app/nota/[id]/opengraph-image` a JPEG de calidad
  80 a 85; ídem tarjetas de Instagram si el motor las permite; comparar pesos.

### C3 · WebP o AVIF con `<picture>` y varios tamaños
- **Ahorro medido en una muestra de 22 fotos:** WebP calidad 70 = 71 % del peso; AVIF calidad 50 = 50 %;
  AVIF a 800 px = 31 %. Extrapolado: 15 a 20 MB de los 44 (supuesto).
- **Pasos:** guardar 3 tamaños (400, 800, 1200) y 2 formatos; `<picture>` con `srcset`/`sizes`;
  JPG de respaldo. Costo: unos 20 MB más en disco y cero por día en git.
- **Cuidado:** las tarjetas de Instagram y las vistas previas dependen del JPG.

### C4 · Que las fotos no se repitan
- **Qué:** un control para que la misma foto no aparezca en notas que no corresponden ni dos
  veces el mismo día.
- **Lo medido:** 12 grupos de fotos idénticas entre notas distintas. El caso claro es una foto de
  Messi (Wikimedia) usada en 4 notas, entre ellas una sobre la suspensión de un show, donde parece
  un error. Una foto de archivo de Colapinto ilustra notas de Bakú y de Sepang. Repetir la misma
  foto en dos notas del **mismo hecho** es razonable.
- **Reglas propuestas, por tipo de foto:**

| Tipo de foto | Regla de repetición |
|---|---|
| Del hecho (la trajo la fuente de esa noticia) | Solo en notas de **esa misma historia** |
| Archivo de una persona o cosa (Wikimedia, de otro evento) | Solo en notas **centradas en esa persona**, y **no dos veces el mismo día**; máximo 1 uso cada 7 días |
| Institucional (edificio del Municipio, escudo, plaza) | Puede repetirse, **máximo 1 vez cada 30 días** y no el mismo día |
| Genérica (placa de la sección) | Sin límite |

- **Pasos:**
  1. Agregar al banco (`web/data/banco-fotos.json`) el tipo de cada foto y un registro de usos (C5).
  2. En `web/scripts/fotos-notas.mjs`, antes de asignar una foto del banco o de Commons,
     consultar los usos recientes según la tabla y, si no cumple, buscar otra o dejar la placa.
  3. Una foto de archivo se acepta solo si la IA confirma que la nota trata de esa persona o
     hecho (una pregunta más en el pedido de visión que ya existe).
  4. Prueba con el caso real: la foto de Xhaka y Messi no entra en la nota del show de Grupo Cali.
  5. Una pasada única sobre lo ya publicado para detectar repetidas y reasignarlas.
- **Riesgo / costo:** bajo; cero costo.

### C5 · El banco de fotos como base de datos
- **Qué:** convertir `banco-fotos.json` (870 notas probadas, 547 con foto) en una base con
  etiquetas, para reutilizar fotos con criterio.
- **Campos propuestos por foto:** archivo, origen y autor, licencia, tipo (de la tabla de C4),
  etiquetas (persona, lugar, institución, tema), hecho o nota de origen, `usos` (lista de nota y
  fecha), tamaños generados, estado (vigente o podada).
- **Pasos:** (1) esquema y migración del archivo actual; (2) llenar tipo y etiquetas con una
  pasada de IA sobre las fotos existentes (cupo de clasificación); (3) consulta "dame una foto
  de X que no se haya usado en N días"; (4) panel: poder ver y descartar fotos.
- **Cuidado:** el archivo ya pesa 524 KB y se commitea cada media hora; si crece, evaluar D1
  (Cloudflare) o separarlo (ver E1).

### C6 · Crédito completo
- Hoy el crédito dice solo el medio y, para Wikimedia, no enlaza la licencia ni dice "adaptada".
- **Pasos:** guardar autor y URL de la licencia; mostrar "Foto: autor / Wikimedia Commons (CC BY-SA 4.0)"
  con el enlace; sumar "(adaptada)" si se recortó; poner `figcaption` también en las páginas de
  tema y sección, o aclarar que el crédito va solo en la nota (hoy documento y código no coinciden).
- **Nota legal:** es una apreciación propia, no asesoramiento. El uso de fotos de otros medios es
  un riesgo que Hernán ya aceptó el 27/09 (`INVESTIGACION.md` § 7).

### C7 · Foto real de chicos en notas amarillas
- Hoy solo se excluye Policiales; una nota amarilla aprobada a mano puede llevar la foto de un
  chico. Excluir la foto real cuando el título o el texto digan niño, adolescente o "alumno de".
  **Se habla antes de tocarlo** (es parte de la regla de menores).

### C8 · Reintentos pendientes
- 9 entradas "no se pudo volver a bajar la elegida", 2 con el máximo de intentos, y revisar
  las 17 fallas de Groq (429) y 9 (413). Pasos: marcarlas para reintento y observar.
- También: rechazar en fotos manuales las imágenes de Google Images (caso `9599gy`).

---

## D. Inteligencia artificial

### D1 · ¿Gemini es lo mejor para redactar? Evaluación de proveedores
- **Hoy:** Gemini `gemini-flash-lite-latest` (clave gratis) para leer y redactar; Groq de
  respaldo para leer y fotos; Gemini TTS para las voces. Todo gratis, con cupos.
- **Precios por millón de tokens (de sitios de terceros y de la lista cacheada de Claude; confirmar):**

| Proveedor y modelo | Entrada | Salida | Nota |
|---|---|---|---|
| Gemini 3.1 Flash-Lite | US$ 0,25 | US$ 1,50 | tiene capa gratis con tope; en capa gratis Google puede usar los datos |
| DeepSeek V4 Flash | US$ 0,14 | US$ 0,28 | precios inestables según la fuente; el alias `deepseek-chat` puede estar retirado |
| OpenAI GPT-5 nano | US$ 0,05 | US$ 0,40 | sin capa gratis |
| OpenAI GPT-5.4 mini | US$ 0,75 | US$ 4,50 | |
| Anthropic Claude Haiku 5.5 | US$ 0,10 | US$ 0,50 | modelo `claude-haiku-5-5`; hasta 100 K de entrada |
| Anthropic Claude Sonnet 5.5 | US$ 2,00 | US$ 10,00 | modelo `claude-sonnet-5-5` |

- **Cuánto saldría (supuesto, a medir):** el volumen real aún no se midió. Con 100 pedidos por
  día de ~5.000 tokens de entrada y ~1.000 de salida cada uno (15 M de entrada y 3 M de salida
  por mes): Haiku 5.5 ≈ US$ 3; DeepSeek ≈ US$ 3; GPT-5 nano ≈ US$ 2; Gemini Flash-Lite ≈ US$ 8;
  GPT-5.4 mini ≈ US$ 25; Sonnet 5.5 ≈ US$ 60. Con el volumen real probable (menos de 40 por día),
  todo es mucho más barato. **El costo no es el problema; lo es la calidad y la fidelidad.**
- **Qué importa más que el precio:**
  1. **Fidelidad:** que no invente datos (el verificador ya rechaza lo que no cierra; medir
     cuántas notas aprueba cada modelo).
  2. **Cuántas notas llegan a tener cuerpo** (el nuevo criterio del 29/09 es exigente).
  3. **Tono** en castellano rioplatense y la regla de no copiar.
  4. **Privacidad:** en la capa gratis de Gemini el texto puede usarse para mejorar productos;
     las Pistas pueden traer datos sensibles. Revisar los términos de cada uno.
  5. **Estabilidad:** `gemini-flash-lite-latest` cambia de modelo sin aviso; DeepSeek cambió
     nombres y precios; el límite de la capa gratis puede recortarse.
- **Pasos para decidir con datos:**
  1. Medir el volumen real: registrar tokens de entrada y salida por pedido durante una semana.
  2. Armar 30 notas reales (mezclando secciones y casos que hoy fallan).
  3. Correrlas con `reels/comparar-instruccion.mjs` contra Gemini actual, Haiku 5.5, GPT-5 nano y
     DeepSeek V4 Flash (el costo de la prueba es de centavos; pedir aprobación antes).
  4. Tabla: % con cuerpo, % que pasa el verificador, tono (revisión de una persona), costo y
     latencia.
  5. Decidir un titular y un respaldo de otro proveedor para cuando haya 429.
- **Riesgo / costo:** bajo; si se cambia, el código de `reels/reescritura.mjs` y `reels/claves.mjs`
  necesita un adaptador por proveedor (`reels/` sí admite dependencias).

### D2 · Segunda clave de voz (continuidad)
- El cupo gratis es de 10 audios por día y no hay plan B (`PENDIENTES` 0g).
- **Pasos:** crear la clave en **otro proyecto de Google, sin tarjeta**; recrear las dos voces ahí
  (`crear-voces.yml`, modo `recrear`); usarla solo ante un 429. Las voces propias vencen el 29/09/2027.

### D3 · Modelo fijo
- Cambiar el alias `gemini-flash-lite-latest` por una versión fija, o registrar el `modelVersion`
  que devuelve la respuesta, para no perder calidad sin enterarse. También vigilar que los
  modelos *preview* de Groq (`ingesta/fotos.mjs`) no desaparezcan.

---

## E. Plataforma: qué pagar para independizarse (menos de US$ 10)

**Aclaración del 8/10:** el objetivo no es pagar GitHub, sino pagar los servicios que
reemplazan a lo que hoy corre gratis por ser público (Workers, un servidor chico).

**Datos de base (de búsquedas; confirmar):**
- Un repositorio **privado** en una cuenta gratis de GitHub no cuesta; incluye 2.000 minutos de
  robots por mes. El plan de pago personal (Pro) incluye 3.000.
- Hoy el consumo es de unos **10.000 minutos por mes** solo entre "Actualizar" y "Cloudflare Pages"
  (supuesto a partir de lo medido: ~7 min × 48 ciclos). El exceso se cobra a unos US$ 0,006 por
  minuto: **US$ 40 a 60 por mes**.
- Los minutos en una **máquina propia** (runner autoalojado) no se descuentan. GitHub anunció un
  cargo de US$ 0,002 por minuto y lo **postergó** en diciembre de 2025; no encontré que haya
  entrado en vigencia. Es una pausa, no una cancelación. Con 10.000 minutos serían ~US$ 20 por
  mes si algún día se aplica.
- Cloudflare Workers: el plan gratis da 10 ms de CPU por tarea (no alcanza); el de US$ 5 por mes
  da 30 s de CPU (hasta 15 min en tareas horarias) y 10.000 pedidos salientes por tarea.

| Opción | Qué es | Costo mensual aprox. | Mantenimiento | Lo que cambia |
|---|---|---|---|---|
| **E0 · Quedarse** | Público, Actions gratis | US$ 0 | Bajo | Nada. Se mantiene todo lo expuesto: criterios, prompts, listas |
| **E2 · Público + Worker de Cloudflare** | Worker con cron como disparador (reemplaza a cron-job.org) | US$ 5 | Bajo | Se saca un punto de falla; sigue público |
| **E3 · Privado + servidor propio como "runner"** | Los mismos workflows, pero corren en un servidor chico de ~US$ 5 | US$ 5 a 6 | **Medio**: actualizar el sistema, reiniciar el runner, vigilar disco | Repo privado; sin tope de minutos; riesgo del cargo futuro |
| **E4 · Privado + servidor propio con cron (sin Actions)** | El servidor corre los scripts con `cron` y sube el sitio a Cloudflare con `wrangler`; GitHub queda solo como depósito | US$ 5 a 6 | Medio | No depende de ninguna política de GitHub; hay que mover 22 workflows a scripts |
| **E5 · Todo a Cloudflare** | Workers + D1 + R2; GitHub ya no corre nada | US$ 5 | Alto al principio | `ffmpeg` y `resvg` (reels, placas) **no corren en un Worker**: harían falta otra máquina |

- **¿GitHub va a cobrar alguna vez por los runners propios?** No se sabe: dijo "postergamos para
  re-evaluar". Por eso E4 es la opción más firme (no depende de ellos), aunque da más trabajo.
- **¿Es difícil mantener un servidor propio?** Es el costo escondido de E3 y E4. Hace falta: tener
  el sistema al día, vigilar que no se llene el disco, y que alguien lo reinicie si se cuelga.
  Una forma de achicar el riesgo es dejarlo documentado y que el vigilante (A7) avise si se detiene.
  Alternativas de servidor: un VPS de ~US$ 4 a 6 (precios a confirmar) o una máquina gratuita de
  Oracle Cloud (con riesgo de que la recuperen).
- **Un riesgo de seguridad:** un runner propio en un **repositorio público** es peligroso (podría
  ejecutar código de terceros). Por eso E3 solo se hace **después** de pasar el repo a privado.
- **Qué se expone hoy por ser público** y qué quedaría protegido: criterios editoriales, prompts,
  lista de fuentes, `COMERCIAL.md`, `MEDIA-KIT.md`, `PERFILES.md`, `PENDIENTES.md`, `IDEAS.md`,
  contactos. Las claves no se exponen (están en Secrets). Opción intermedia sin costo: un repo
  privado chico para lo comercial y personal, y el motor público.
- **Pasos sugeridos (por etapas, sin apagar nada de golpe):**
  1. **E2:** Worker con cron como disparador, cron-job.org queda de respaldo. Probar una semana.
  2. Pasar a privado lo comercial (repo aparte, gratis).
  3. Decidir entre E3 y E4 con una prueba: un servidor chico corriendo **solo** la lectura de
     fuentes (B) durante unos días, sin tocar la publicación.
  4. Recién después, mover el resto.
- **Guardas ya anotadas:** renovar el dominio por varios años (vence el 21/09/2027, igual que
  el token de cron-job.org); 2FA con códigos de respaldo; sumar a Andrés como administrador en
  Meta, Cloudflare y el repositorio.

---

## F. Idea: ¿cada sección como un medio?

**La pregunta:** correr todo el proceso por sección, de modo que cada una lea sus fuentes, decida,
escriba y arme su propia portada, como si fuera un medio aparte.

**Dos versiones de la idea, que conviene separar:**
1. **Separar el proceso entero** (cada sección con su ingesta, su cruce, su selección, su IA y su
   publicación).
2. **Separar la presentación y las reglas, pero no el motor** (cada sección con su portada, su
   barra lateral, su cupo, su criterio de IA, su frecuencia de redes y sus métricas).

**A favor de la versión 1:**
- Cadencia propia (Deportes e Economía podrían actualizarse más seguido que Cultura).
- Fallos aislados: si una sección se traba, las otras siguen.
- Equipos y responsables por sección; reglas y fuentes propias.

**En contra (con lo que se midió):**
- **Una noticia no pertenece a una sección hasta que se la lee.** Hoy el orden es: juntar lo que
  cuentan varios medios → clasificar → decidir. La sección se decide *después* del cruce (y a
  veces la corrige la IA: 142 notas cambiaron de sección en una corrida). Si cada sección corriera
  sola, habría que leer todas las fuentes 15 veces o clasificar antes de cruzar, y se perdería el
  "cuántos medios lo cuentan".
- **Multiplica el trabajo y la complejidad:** hoy hay 22 workflows; con 15 secciones serían del
  orden de cientos. Más commits en el repo por día (hoy ya son ~48) y más choques.
- **Las costuras entre secciones** (Balcarce frente a Policiales, o Deportes frente a Fútbol) hoy
  se resuelven en un solo lugar.
- **El tiempo no mejora:** el cuello de botella es imprimir el sitio y los pasos con IA, no la
  cantidad de notas.

**Conclusión provisional (a discutir):** no separar el motor, pero sí separar lo barato y útil,
construyendo "carriles" por sección, con **una sola ficha de configuración por sección** que
reúna: cupo y medios mínimos, criterio extra para la IA, frecuencia y formato de redes,
barra lateral y fuentes propias. Es lo que ya se acerca a la idea de las 15 secciones (H1).
Se puede volver a evaluar la separación completa si el volumen crece mucho.

- **Pasos si se decide hacer los carriles:** (1) un solo archivo `SECCIONES_CONFIG` con todo lo de
  cada sección; (2) pasar a leer de ahí los lugares que hoy tienen listas sueltas (colores,
  reglas, cupos, redes); (3) portada y barra lateral por sección (H1).

---

## G. Documentación

**Veredicto (evaluación del 8/10):** criterios, bien; recorrido de una nota, bien pero disperso en
cinco documentos; para no técnicos, regular a mal; volumen, mal (unos 730 KB).

### G1 · Contradicciones confirmadas y cómo arreglarlas
| Dice | Realidad | Dónde |
|---|---|---|
| "Catorce workflows" | Hay 22 | `docs/08-INFRAESTRUCTURA.md:79` y `:350`, `docs/01-ARBOL.md:24` |
| "00-INDICE a 12-GLOSARIO" | Existe `13-EFEMERIDES.md` | `CLAUDE.md:22` |
| La corrida tarda ~8 minutos | 2 a 3,5 min el robot 1, ~7 de punta a punta con el deploy | `CLAUDE.md:82`, `docs/11:89` y `actualizar.yml:43` |
| Corre a los :00 y :30 UTC | El `schedule` es `7,37`; :00 y :30 es el disparo de cron-job.org | `CLAUDE.md:81`, `actualizar.yml:30` |
| Redes apagadas "a propósito" desde el 28/09 | Prendidas desde el 29/09, 16:39 | `docs/11:317`, `docs/12:54` |
| Hay una "clave paga" de Gemini (gasto mensual de USD 10) | Las cuatro claves son gratis | `docs/11:74`, `docs/12:25` |
| "Un día como hoy" es una historia con dos placas | Es un reel y además sale como historia (regla 106) | `docs/07:147` |
| El posteo de Facebook lleva el enlace a la nota | Sale como foto; enlace solo tras 3 fallos (regla 107) | `CRITERIO-EDITORIAL.md:683`, `docs/07:14` |
| 1.367 pruebas en 83 archivos | 1.838 a 1.840, 141 archivos | `docs/10:6` |
| "Más de 1.400 pruebas" | 1.840 | `CLAUDE.md:21` |
| Existe `PARA-CARGAR-A-MANO.md` | No existe | `docs/00:104`, `docs/11:9` y `:465`, `docs/07:435` |
| Todos "actualizado el 29/09" | El contenido llega al 5/10 | encabezados |
| Estado "29/09, 18:30" | Hoy es 8/10 | `CLAUDE.md:140` |
| `TAVILY_API_KEY` | No está en la tabla de secretos | `docs/08` |

- **Pasos:** corregir una por una con la regla de la casa (si el documento y el código no
  coinciden, manda el código); agregar una prueba que cruce conteos (`ls .github/workflows` contra
  el título de `docs/08`; última regla contra `CLAUDE.md`).

### Otras mejoras de documentación
1. Escribir `docs/00-LEEME-PRIMERO.md` de 2 o 3 carillas, sin nombres de archivos: qué es el
   sistema, el recorrido en pasos, el semáforo con un ejemplo de cada color, qué decide cada
   persona y qué hacer si algo falla.
2. Un diagrama del recorrido con el semáforo y los puntos donde interviene una persona.
3. Una tabla "quién decide qué" (sistema, Hernán y Andrés, solo Claude, solo una persona).
4. Podar `PENDIENTES.md` (40 KB) a una pantalla por urgencia, llevando lo hecho a la historia, e
   `IDEAS.md` (33 KB) igual.
5. Dividir `CLAUDE.md`: lo permanente se queda; el "Estado" y la tabla "Dónde tocar" pasan aparte.
6. Mover `docs/AUDITORIA-2026-10-08.md` y este plan a una carpeta propia, y borrar
   `docs/efemerides-octubre-para-revisar.md` cuando Hernán apruebe octubre.
7. Actualizar `docs/07` y `CRITERIO-EDITORIAL.md` § 9 con las reglas 106 y 107, y agregar al
   glosario: Pistas, armado vacío, Panel del celular.

---

## H. Secciones: de 11 a 15, con barra lateral

Detalle completo en la auditoría (`docs/AUDITORIA-2026-10-08.md`, sección 3). Resumen:
- Candidatas con volumen medido (aproximado, por palabras clave): **Educación** (~63 notas en
  ~3,4 semanas), **Salud** (~48), **Deporte local** (Deportes tiene 100 locales contra 47 de
  afuera), y **Ciencia y tecnología** o **Trabajo y empleo** (~33).
- La barra lateral hoy existe solo en la portada. Hay datos propios para Balcarce, Fútbol,
  Automovilismo, Economía y Cultura; no los hay para Política, Tecnología, Argentina y Educación.
- Quince lugares del código hay que tocar (lista en la auditoría); las URLs de nota no cambian,
  las de sección sí, y exigen redirección 301.
- **Comparación de medios nacionales:** no se pudo hacer completa (el entorno bloquea los sitios).
  Con datos parciales de 9 medios: rango de 8 a 15 secciones principales; en casi todos Política,
  Economía y Deportes; Tecnología en 5; sección local solo en los regionales (0223, La Nueva); y
  "Sociedad" es la común que a Radar Balcarce le falta. Pendiente: relevar los menús reales.

---

## I. Contenido local y comercial

Detalle en la auditoría (secciones 4 a 6). Resumen: 12 ideas nuevas (parte agroclimático, red de
pluviómetros, QR en las farmacias, "¿Hay clases?", voxpop, entrevista semanal, planilla de clubes,
"Rincones" por localidad, canasta mensual, perdidos y encontrados, "¿Es cierto?", trivia); formatos
de podcast con voz humana para no gastar cupo de voz; y un camino comercial sin vender impresiones
(tres auspiciantes fundadores, productos que no dependen del tráfico, página `/publicidad`).

---

## J. Orden sugerido (olas)

| Ola | Qué | Por qué en este orden |
|---|---|---|
| **1 · Ver y medir** | B1, A6, A7, medir volumen de IA (D1 paso 1) | No cambia nada del sitio; da los datos para decidir |
| **2 · Arreglos baratos** | B2, B3, B4, B5, A5, A4, C8, G1 (contradicciones) | Bajo riesgo y mucho efecto |
| **3 · Velocidad** | A1, A2, A3 | Tocan los workflows de `main`: se prueban primero en la rama |
| **4 · Fotos** | C1, C2, C5, C4, C6, luego C3 | C5 habilita C4; C1 y C2 son las de mayor ahorro |
| **5 · IA** | D1 (prueba con 30 notas), D2, D3 | Con el volumen real medido en la ola 1 |
| **6 · Plataforma** | E2, luego decidir E3 o E4 | Una vez estables las olas anteriores |
| **7 · Secciones y contenido** | F1 (carriles), H1, I1, G1 (documentación para no técnicos) | Lo más grande, con maqueta aprobada antes |

## K. Decisiones que necesitan a Hernán y Andrés
1. ¿Se borran los archivos de sondeo (lista en la auditoría, sección 1)?
2. ¿Se prueba el cambio de proveedor de IA para redactar, y con qué presupuesto de prueba?
3. ¿Qué regla de repetición de fotos (tabla de C4) les parece bien?
4. ¿Se sacan de GitHub público los documentos comerciales y personales?
5. ¿Qué secciones nuevas y en qué orden?
6. ¿Primero el flujo (olas 1 a 3) o primero las secciones y la barra lateral (ola 7)?
7. Sobre C7 (chicos en notas amarillas): conversarlo antes de tocar.

## L. Pendiente de verificar
- Los precios de IA y de servidores, en las páginas oficiales.
- Si GitHub aplicará algún cargo a los runners propios.
- Si las fuentes que fallan son siempre las mismas (comparar más corridas con B1 activo).
- El volumen real de tokens por día.
- Los menús reales de los 20 medios más importantes (requiere habilitar sus dominios o pasar
  capturas).

---

# Segunda tanda de hallazgos (8/10, tarde)

*Investigaciones de redes/audios/video, medición y auditorías, fuentes, y redacción y fotos
(archivos `.md` y `.mjs`). Pistas y el panel del celular quedan afuera. Mismas marcas:
**medido** (de los registros o del repo) y **supuesto** (a confirmar).*

## M. Redes, audios, imágenes y videos

**Correcciones a supuestos:** el guion de los reels **no** lo escribe una IA (`redes/guiones.mjs` y
`redes/prompt-redes.mjs` son bancos de frases con semilla de fecha); la IA entra solo en el texto del
posteo (`textoRedes`, junto con la nota, `reels/reescritura.mjs:421`) y en la voz. Las tarjetas de las
notas usan `next/og` (`web/lib/tarjeta.js:3`); `resvg` dibuja solo las placas de los videos
(`reels/placa.mjs:802`).

**Dónde vive cada cosa (medido):**
- mp3 de voz, PNG de placa y mp4 del día: en `reels/salida/` del runner de GitHub (en `.gitignore`);
  el mp4 sube directo a Meta (carga "resumable", `redes/meta.mjs:200`) y queda 3 días como artefacto de
  Actions (`piezas-<corrida>`), que es lo que usa `reintentar.yml`.
- **En el repo:** `reels/fijas/*.mp4` (1,6 MB, valen hasta el 31/10), `web/public/compartir/*.mp4`
  (10 MB), `web/public/fotos-notas/` (44 MB), `web/data/redes.json` (107 KB, 17 días, no se poda).
- Tarjetas de Instagram (1080×1350): promedio 811 KB, máximo 1,8 MB; 116 tarjetas suman 94 MB por
  deploy. Tarjetas de compartir (1200×630): promedio 229 KB.
- Horarios en código: repasos 10, 15 y 21 (`HORAS_REELS`, `redes/piezas.mjs:106`); clima 7 y 20;
  feriado 8; "un día como hoy" 9; "Participá" 12 (lun, mar, mié, vie); agenda jueves 12; útiles sábados 17;
  farmacia 19.

**Ítems nuevos:**
- **M1 · Contador de voz.** Un día normal gasta 7 de 10 audios (8 jueves y sábados;
  `panel/horarios.mjs:84`); no se cuenta. Pasos: contar audios en el libro y avisar a 8 de 10 por WhatsApp.
  Esfuerzo bajo, impacto alto.
- **M2 · Guardar las piezas del día para reintentar** sin gastar voz. Hoy `redes.yml` no sube mp3 ni png;
  si falla Instagram, el audio gastado se pierde. Esfuerzo bajo.
- **M3 · Historias de reels sin reintento automático** entre corridas (`docs/07-REDES.md:246`).
- **M4 · Métricas por pieza** con los `mediaId` que ya están en el libro (`/insights` por pieza).
- **M5 · Podar `redes.json`** (crece ~6 KB por día; no urge).
- **M6 · Bajar la calidad de las tarjetas de Instagram** (jpg) para aliviar los 94 MB por deploy.
- **M7 · `ffmpeg-static` se baja en cada `npm ci`.** El 1/10 hubo dos corridas rojas por un 504 de GitHub
  y el reel salió 35 min tarde. Pasos: cachear `node_modules/ffmpeg-static`.

**Contradicciones en este tema (confirmadas):** `docs/07-REDES.md:218` dice zoom en la placa, pero va
quieta (`reels/reel.mjs:157-162`); `docs/07:148,150` dicen que el repaso vale hasta las 15 y las 20, y el
código dice hasta las 13 y las 19 (`redes/piezas.mjs:55-56`); "un día normal gasta 6 audios"
(`docs/07:288`, `CRITERIO-REDES.md:49`) contra 7 (`panel/horarios.mjs:84`); `docs/08:95` dice que Reintentar
no commitea y sí lo hace; comentarios viejos dicen "clave paga" (`reels/voz-gemini.mjs:42,47`,
`reels/claves.mjs:10,55`, `redes.yml:30,107`, `piezas.yml:17`, `reels/fijas.mjs:2`); `docs/07:29-33` dice
:05/:35/:45 y `redes.yml:19` "cada 30 minutos (7 a 23)"; las fijas "valen dos semanas" y valen hasta el 31/10;
`docs/07:501` une dos filas de una tabla.

## N. Medición y auditorías

**Lo que se mide hoy (medido):** web arriba, corridas que fallan, claves y voces, vencimientos, redes contra
Meta (`redes/vigilar.mjs`); visitas y seguidores 2 veces por día (`redes/estadisticas*.mjs`); auditoría con IA
(12 notas por corrida; 4 a 15 hallazgos diarios, casi todos de ortografía); auditoría semanal; control de SEO
al compilar; resumen de las 21; pruebas.

**Lo que no se mide:** historial por fuente, motivo real de caída, fotos repetidas, enlaces e imágenes
rotas, duplicados que pasan, tiempo por tramo, tokens y cupo de IA, tasa de rechazo diaria, cobertura por
localidad, 404 reales.

**Medición real del sitio (build local, 13 s):** 1.148 páginas, 38.934 enlaces internos (0 rotos),
12.109 referencias a imágenes, 573 fotos. Hallazgos: **9 notas con la imagen rota** (el HTML pide
`.png`/`.webp` y el archivo es `.jpg`; ej. `epzsa5`); 12 grupos de fotos idénticas; 2 pares de títulos y
5 de descripciones duplicadas. Falsos positivos descartados: `noindex` de un build sin `SITIO`,
notas viejas sin foto por poda, notas fuera del sitemap a propósito.

**Hallazgo:** `web/data/auditoria.json` sigue con fecha del 28/09; la auditoría del lunes 5/10 no dejó
resultado y el vigilante va a avisar "auditoría vencida". Motivo desconocido.

**Ítems:**
- **N1 · Arreglar las 9 imágenes rotas y entender por qué pasa** (la nota guarda la extensión vieja; el
  banco la recomprime a `.jpg`). Pasos: reasignar las 9; corregir en `web/scripts/fotos-notas.mjs` para
  que la nota guarde siempre la extensión final; prueba con el caso real. **Urgente.**
- **N2 · Revisar por qué no corrió la auditoría del 5/10** (Actions → Auditoría).
- **N3 · `web/data/salud.json`**, un solo archivo escrito por "Actualizar la web" (y agregado al `git add`
  de `actualizar.yml`, o se pierde): historial por fuente (caídas seguidas, última vez bien, notas que
  aporta, último error), conteos diarios (duplicados, fotos repetidas, rotas), tiempo por tramo y rechazo de
  la IA. Unos 100 a 150 KB con 14 días (supuesto). Aviso solo si una fuente lleva 6 corridas seguidas caída.
- **N4 · Chequeo de enlaces, imágenes y duplicados en `revisar-seo.mjs` como aviso, nunca como corte**
  (esa revisión frena la web; un falso positivo congelaría el sitio). El script de la prueba tardó 13 s.
- **N5 · Cupo y tokens de IA por día** (guardar `usageMetadata`/`usage` de Gemini y Groq); mostrar "cupo de
  voz 8/10" en el WhatsApp de las 21. Toca código que escribe notas: riesgo medio.
- **N6 · 404 reales** pidiéndole a Cloudflare por `edgeResponseStatus=404` (puede necesitar un permiso extra
  del token; supuesto).
- **N7 · Auditoría completa semanal** (Lighthouse sobre 20 a 30 páginas, accesibilidad, redirecciones con
  `npm run build`, fotos repetidas, cobertura por localidad), 15 a 40 min de robot (estimado). **No**
  Lighthouse en cada ciclo (3 a 6 horas por el tamaño del sitio).
- **Etapas:** YA = N1, N2, N3 y N4; segunda etapa = N5, N6 y tiempos por tramo; solo para lo nuevo =
  enlaces externos y vista previa remota de cada nota nueva; semanal = N7. Cuidar que un solo WhatsApp por
  corrida protege a CallMeBot del bloqueo: las alertas nuevas entran en `planDeAvisos`.

## O. Fuentes: rendimiento real (1.031 notas con medios)

- 236 feeds de 105 medios; 38 medios con más de un feed. Top 5 medios = 46 % de las notas, top 10 = 67 %,
  top 20 = 84 %. Lo de afuera tiene en promedio 6,7 medios por nota.
- Locales: La Vanguardia (83 notas, 48 exclusivas), Infórmese Primero (63), Radio Gabal (58, 34 exclusivas),
  El Diario (40), Municipalidad (29), News Balcarce (22), Puntonueve (19), Acción 5 (9), Ahora Balcarce (3).
  El 67 % de las notas de acá tiene un solo medio local.
- **19 medios sin ninguna nota** (21 feeds); unos 33 con menos del 2 % y sin aporte decisivo.
- Tecnología: 6 notas en 11 días con 21 feeds fijos; el límite es la regla de 2 medios, no la cantidad
  de fuentes. De lo marcado "de Balcarce" por la IA se publica el 42 %; de lo nacional, el 6 %.
- Huecos locales: Concejo, INTA propio, Facultad, cooperativa, hospital, bomberos, Defensa Civil, Consejo
  Escolar, clubes, Liga, localidades (Napaleofú 2 notas, San Agustín 1, Los Pinos 3, Ramos Otero 1, Laguna
  La Brava 0). Todo "a verificar".
- 18 feeds apagados: 6 por bloqueo de Cloudflare a GitHub, 4 por hosting argentino que no responde, 4 por
  decisión editorial, 2 sin título en el índice, 2 que no sirven.
- **O1 · Orden:** arreglar (B1 a B5), podar (B6; unos 33 candidatos si siguen sin aportar), sumar solo local
  (B7). **Regla propuesta para una fuente nueva (14 días de prueba):** local = 10 o más notas publicadas y
  3 o más exclusivas (o 2 por semana si cubre un hueco); de afuera = 5 o más notas y 3 o más decisivas, o
  una sección con menos de 1 nota por día; se apaga con 0 notas en 28 días; no cuenta si repite más del 80 %
  de lo que ya traían otros medios. Umbrales propuestos, no reglas del código.

## P. Redacción y fotos: contradicciones entre archivos

*De 611 notas intentadas, 500 salieron con cuerpo y 111 se rechazaron. El prompt
(`CRITERIO-EDITORIAL.md:847-905`) tiene ~20.000 caracteres, dice "nunca" 36 veces y pide el campo `datos`
"antes que nada" recién en la línea 902. Gana siempre el verificador.*

| Id | El prompt o el criterio dice | El código hace | Qué hacer |
|---|---|---|---|
| P1 | Fechas con día y mes (reglas 14 y 21, `CRITERIO:268`) | `fecha` rechaza meses y días que no estén en título o resumen (`ingesta/verificar.mjs:354-364`); el material verificado no trae los encabezados de fecha | Que el código escriba las fechas completas y las sume al material verificado |
| P2 | Redondear (regla 6) | Menos de 100 exacto; desde 100, hasta 6 % (`verificar.mjs:113-117`) | Decirle el límite al prompt, o ampliar la tolerancia |
| P3 | Números en palabras en el guion (regla 7) | `numerosDe` no entiende compuestos ("treinta y cinco" = 30 y 5) | Pasar el guion a código (`guionNoticia`, `redes/guiones.mjs:152`) |
| P4 | Explicar siglas (regla 20) | Rechaza palabras capitalizadas que la fuente no trae; solo 8 grupos de equivalencias (`verificar.mjs:137`) | Ampliar las equivalencias o aceptar la sigla expandida |
| P5 | (nada sobre negaciones) | `negacion` rechaza si el título de la fuente tenía "no/sin/ni" (`verificar.mjs:715`) | Agregar la regla al prompt o afinar el control |
| P6 | Cuerpo de 70 a 180 palabras y "si hay poco, la nota es corta" | Publicar exige 70 (`web/lib/cuerpo.js:22`) y el mínimo de material es 60 (`criterio.mjs:101`) | Subir el mínimo de material y no pedir si no alcanza |
| P7 | "Tres intentos" | Son 3, 4 o 5 según el medio (`criterio.mjs:98-99`) | Unificar el nombre y el número |
| P8 | 450 notas por día | Cada intento hace hasta 2 pedidos; mezcla notas con pedidos | Medir con N5; unificar unidades |
| P9 | Copia: "diez palabras" (regla 1) | Rechaza desde 13 (`COPIA_MAXIMA = 12`, `criterio.mjs:63`) | Explicar el margen |
| P10 | Tono "liviano" (`CRITERIO:384-386`) | El prompt dice "no es escribir liviano" (línea 911) | Elegir uno |
| P11 | Gancho solo en el título | También rechaza "insólito/furor/shock" en bajada, guion y textoRedes (`verificar.mjs:426,450`) | Decírselo al prompt |
| P12 | Atribuir acusaciones ("habría", "según la denuncia") | Esas palabras activan el semáforo (`reescritura.mjs:508-513`); un motivo de semáforo se reintenta hasta el tope | No reintentar si el semáforo va a frenar lo mismo |
| P13 | Escribir con tildes | Rechaza con 3 palabras sin tilde, aunque `CON_TILDE` sabe arreglarlas (`verificar.mjs:767`) | Arreglarlas siempre |
| P14 | La IA recibe la ciudad del medio (`CRITERIO:52-53`) | `entradaDe` manda solo el nombre del medio (`reescritura.mjs:233-250`) | Corregir el criterio o enviar el dato |
| P15 | Bajada de 2 a 3 frases, 3 párrafos, claves y etiquetas (§11) | Nada de eso se hace cumplir | Aplicar o borrar |

**Fotos:**
| Id | Documento | Código | Qué hacer |
|---|---|---|---|
| P16 | Foto "con el crédito debajo" (`docs/05:226-227`, `CRITERIO:140-141`) | `imagen-destacada.js` y `postales.js` no muestran crédito; solo `nota/[id]/page.js:120` | **Grave**: componente único `FotoConCredito` |
| P17 | Solo CC0, BY, BY-SA y dominio público (`docs/05:146-148`) | La expresión de `fotos.mjs:360` no tiene ancla al final y acepta CC BY-NC y BY-ND | Corregir y agregar prueba (latente) |
| P18 | Policiales solo con foto de Bomberos o Policía (`CRITERIO:147-148`) | Acepta cualquier fuente "oficial" (Municipalidad, Provincia) | Alinear criterio y código |
| P19 | "Con la mínima duda, no se usa" | La instrucción de visión resuelve la duda a favor de usar | Alinear |
| P20 | Wikimedia solo para persona pública | Commons y manuales no pasan por visión; no se revisa repetición | Dedupe y etiqueta "archivo" (ver C4 y C5) |
| P21 | `origen` es medio, wikimedia, ninguna o error | El banco tiene también `manual` (15) y `libre` (6) | Actualizar `docs/05` |
| P22 | "Diez pedidos por corrida" | Cada nota cuesta 1 a 3 pedidos; 28 notas sin foto por Groq 429/413 | Medir y ajustar tope |
| P23 | — | Dos implementaciones de Commons con reglas distintas (`fotos.mjs` y `foto-libre.mjs`: tamaño, tipos, autor) | Unificar en `ingesta/commons.mjs` |

**Qué pasar de IA a código (con argumentos):** el guion (título tal cual, siglas y números), las fechas
absolutas, las tildes conocidas, el pre-chequeo de material suficiente, los campos internos (`seSabe`,
`noConfirmado`, claves, etiquetas, `nivelSugerido` que no se usa), el dedupe de fotos y las licencias. La
visión (marca de agua y menores) **sigue siendo de IA**: el código no puede ver una imagen.

**Una sola fuente de verdad por regla:** números en `ingesta/criterio.mjs`, y el prompt y los documentos se
generan con plantillas (`{{TITULO.maximo}}`) en vez de compararse a mano; reglas de escritura solo en la
§ 12; una prueba que exija que cada control que emite `verificar.mjs` tenga su línea en el prompt; un solo
componente de foto con crédito; reducir el prompt a ~60 % de su largo; el redactor recibe del perfil solo
"relación con Balcarce".

*Faltó mirar: `lectura-ia.mjs`, `repetidas.js` y `panel/reescribir-una.mjs`. No se corrió `npm test`.*

---

# Aclaraciones y ampliaciones (8/10, noche)

## Q1 · ¿Está bien que se borre lo que se genera para redes?
**Qué pasa hoy (medido):** el mp3 de la voz, la placa (PNG) y el mp4 se arman en la máquina de GitHub, el
mp4 se sube directo a Meta y lo demás se descarta al terminar la corrida. Queda: el video final en Meta (el
reel, para siempre; la historia, 24 h), el registro en `web/data/redes.json` (id y enlace) y una copia del
mp4 como archivo adjunto de Actions por 3 días (de ahí sale "Reintentar").
**Qué se pierde (el riesgo):** si Meta bloquea o borra la cuenta (la API se bloqueó del 22 al 24/09), si se
quiere reusar el video en otro lado (YouTube Shorts, TikTok, canal de WhatsApp, la propia web) o si hay que
reintentar pasados 3 días, **no hay copia propia**. Y la voz cuesta cupo (10 audios por día): lo que se
gasta no se puede recuperar.
**Qué no conviene:** guardarlo en el repositorio (es público y ya pesa; un reel ocupa ~0,4 a 2 MB y son ~7
por día: unos 1,3 a 5 GB por año, estimación).
**Propuesta (a decidir):**
1. Guardar una copia del mp4 final y del mp3 durante 30 días en un almacenamiento barato **fuera del repo**
   (Cloudflare R2: el plan gratis incluye unos 10 GB, a confirmar), con borrado automático a los 30 días.
2. Guardar siempre en el libro: texto, guion, notas de origen, hora y los identificadores de Meta.
3. Los PNG de placa no se guardan (se regeneran sin costo).
4. Con la copia disponible, "Reintentar" funciona sin límite de 3 días y se puede recomponer una pieza sin
   gastar voz.
**Pasos:** (a) crear el depósito en R2 y un token con permiso solo de escritura, pegado como secreto por una
persona; (b) al final de `redes/publicar-piezas.mjs`, subir mp4 y mp3 con el id de la pieza; (c) regla de
caducidad a 30 días en el depósito; (d) `redes/reintentar.mjs` busca primero ahí y después en los adjuntos;
(e) prueba con una pieza real simulada. Esfuerzo medio, impacto medio-alto. Reemplaza y amplía M2.

## Q2 · Los números del chequeo de enlaces e imágenes (aclaración de lectura)
El chequeo de 13 segundos contó **apariciones**, no elementos distintos:
- **38.934 enlaces internos** = cada enlace de cada página (el menú y el pie se repiten en las 1.148
  páginas; unos 34 enlaces por página). Los **destinos distintos son 750** (recuento propio del 8/10).
- **12.109 "referencias de imagen"** = la suma de todo lo que apunta a un archivo dentro de etiquetas de
  imagen, hoja de estilo, ícono, vista previa y video (`img`, `source`, `link`, `meta`, `video`). El nombre
  del script era impreciso: no son 12.109 imágenes. Las fotos distintas en disco son **573**. Los escudos de
  la tabla de la Liga se repiten hasta 30 veces en una misma página, y por eso el total se infla.
- Un recuento propio acotado a `src` y `content` con ruta absoluta dio ~1.183 referencias y 603 imágenes
  distintas. No coincide con 12.109 porque cuenta menos tipos de atributos; es normal que dos recuentos
  distintos den números distintos.
**Mejora (N8):** en el chequeo que se agregue a `revisar-seo.mjs`, reportar siempre **total y distintos**
("38.934 enlaces, 750 destinos distintos") y llamar a cada cosa por su nombre.

## Q3 · Catálogo de chequeos explicado (para no técnicos)
| Chequeo | Qué pregunta responde | Cómo se hace | Cuándo |
|---|---|---|---|
| **Enlaces rotos** | ¿Algún enlace lleva a una página que no existe? | Un programa recorre todas las páginas armadas y comprueba que cada destino esté | Cada ciclo (13 s), como aviso |
| **Imágenes que faltan** | ¿Alguna página pide una foto que no está? (así se encontraron las 9 rotas) | Igual, mirando las fotos | Cada ciclo, como aviso |
| **Duplicados** | ¿Hay dos notas iguales o casi iguales? | Compara títulos y descripciones | Cada ciclo |
| **Mapa del sitio y feeds** | ¿Google y los lectores de noticias ven bien todas las notas? | Comprueba `sitemap.xml` y `feed.xml` | Cada ciclo (ya existe en parte) |
| **Fotos repetidas** | ¿Se usa la misma foto en notas que no corresponden? | Compara el contenido de cada archivo | Semanal |
| **Lighthouse** | ¿Qué tan rápida, accesible y bien armada está la página? (ver abajo) | Abre algunas páginas en un navegador y las mide | **Semanal**, sobre 20 a 30 páginas |
| **404 reales** | ¿Qué enlaces rotos están encontrando los lectores de verdad? | Se le pregunta a Cloudflare qué direcciones pidieron los lectores y no existían | Semanal o mensual |
| **Accesibilidad** | ¿Se puede leer con lector de pantalla? ¿Los colores se leen? | Parte de Lighthouse | Semanal |

**Qué es Lighthouse:** es una herramienta gratuita de Google que pone una nota de 0 a 100 a una página en
cuatro rubros: **rendimiento** (qué tan rápido carga), **accesibilidad**, **buenas prácticas** y **SEO**.
Abre la página en un navegador de verdad y mide cuánto tarda en mostrarse lo importante y si algo se mueve
mientras carga. Tarda entre 10 y 20 segundos por página, por eso no se usa en las 1.148 páginas (serían 3 a
6 horas) sino en una muestra de 20 a 30: portada, secciones, una nota con foto, una sin foto, farmacias,
clima. Se corre una vez por semana en un workflow aparte y manda un resumen. No hace falta sumarlo al proyecto
(se corre con `npx` y no toca las dependencias).

## Q4 · Anotado para más adelante (sin hacer)
- Glosario nuevo para la documentación: Lighthouse, 404, sitemap, feed, artefacto, R2, caché.
- Revisar con Hernán y Andrés qué piezas de redes vale la pena conservar y por cuánto tiempo.
- Evaluar si el almacenamiento de R2 sirve también para las fotos (ver E1 y C5): evitaría que el repo crezca.

---

## R. ¿Groq puede hacer lo mismo que Gemini con las noticias? (8/10, noche)

**Lo que dice el proyecto (medido en los documentos):** `docs/04-REDACCION.md:175`: "Groq no sirve para
redactar (acepta 8.000 tokens por minuto y un pedido ocupa unos 9.000)". Y `docs/05-FOTOS.md:335`: los
cuatro modelos de texto de la clave gratis de Groq (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`,
`qwen/qwen3.8-27b` y `allam-2-7b`) admiten 1.000 pedidos por día (7.000 el último) y **8.000 tokens por minuto**
(6.000 el último); solo `qwen/qwen3.8-27b` acepta imágenes.
**Conclusión:** el límite no es la capacidad ni la "ventana de contexto" del modelo, sino el **tope por minuto
de la capa gratis**. Un pedido de redacción pesa ~9.000 tokens (el prompt de `CRITERIO-EDITORIAL.md:847-905`
tiene unos 20.000 caracteres, más el texto de la fuente y los antecedentes) y no entra en 8.000. Hoy Groq se usa
como respaldo de la lectura y de las fotos, donde el pedido es chico.
**Qué lo haría posible:** (1) acortar el prompt a ~60 % (P-orden) y limitar el texto de la fuente, de modo
que el pedido quede bajo ~6.000 tokens; o (2) pasar a un plan de pago de Groq con más tokens por minuto
(precio y límites a confirmar); o (3) partir el pedido en dos. Además hay que **probar la calidad** (fidelidad,
tono rioplatense, cuerpo de 70 palabras) con 30 notas reales usando `reels/comparar-instruccion.mjs`.
**Por qué vale la pena aunque Gemini ande bien:** hoy las tres claves de redacción son del mismo proveedor, así
que una caída o suspensión de Google (pasó con la clave paga el 29/09) frena todo. Un segundo proveedor
independiente es continuidad. **Ítem D4** en la hoja de ruta (nivel 4; depende de P-orden y de D1-1).
**Lo que no se puede reemplazar fácil:** la voz (las dos voces propias son de Gemini).

## S. Otras APIs posibles para redactar o de respaldo (8/10, noche)

*Datos de búsquedas en sitios de terceros: confirmar cada límite y precio en la consola o la página
oficial antes de contar con ellos. Marcado "propio" lo que es apreciación mía.*

| Opción | Qué se encontró | Cómo encaja |
|---|---|---|
| **Cloudflare Workers AI** | 10.000 "neurons" por día gratis (se reinicia a las 00:00 UTC); al llegar al tope las pedidos fallan y no cobran; pasado el tope, US$ 0,011 por 1.000 neurons en el plan Workers Paid. Modelos como `gpt-oss-120b`, Llama 4 Scout y Gemma 3 | Misma cuenta que la web (sin un proveedor más). Cuántas notas alcanzan por día depende del modelo (a medir). Se llama por API desde los robots, no hace falta un Worker propio |
| **Groq** | 8.000 tokens por minuto en la capa gratis; ver sección R | Respaldo posible con prompt más corto o plan de pago |
| **Anthropic (Claude Haiku 5.5)** | US$ 0,10 por millón de entrada y US$ 0,50 de salida (lista de modelos de Anthropic al 6/10, hasta 100.000 tokens de entrada); `claude-sonnet-5-5` a US$ 2 y US$ 10 | Pago por uso, sin tope diario fijo. Con ~40 notas por día serían centavos (propio, a medir). A confirmar: capa gratis y retención de datos |
| **OpenAI (GPT-5 nano / GPT-5.4 mini)** | US$ 0,05 / 0,40 y US$ 0,75 / 4,50 por millón | Pago por uso; sin capa gratis según una fuente (otra dice créditos de bienvenida) |
| **DeepSeek (V4 Flash)** | ~US$ 0,14 / 0,28 por millón; el alias `deepseek-chat` puede estar retirado | Muy barato; precios y nombres inestables; revisar dónde se procesan los datos |
| **OpenRouter** | Modelos `:free` limitados por cuenta: 20 pedidos por minuto; 50 por día sin haber comprado créditos, 1.000 por día con US$ 10 de créditos comprados. La lista de modelos gratis cambia seguido y puede retirarse sin aviso | Un solo acceso a muchos modelos y respaldo en cadena; poco confiable como único |
| **Mistral (La Plateforme)** | Capa gratis con límites restrictivos; una fuente dice que exige verificar el teléfono y aceptar que se usen los datos para entrenar | Descartable para este contenido por los datos |
| **Cerebras** | Sin capa gratis permanente según la fuente más reciente (créditos de US$ 5 por 30 días con tarjeta) | Poco útil |

**Recomendación a probar (propio):** para la prueba de las 30 notas (D1), incluir **Claude Haiku 5.5, GPT-5 nano,
Cloudflare Workers AI (`gpt-oss-120b`) y Groq (`gpt-oss-120b` con prompt corto)**, además de Gemini. Criterios:
fidelidad (cuántas pasan el verificador), cuerpo de 70 palabras, tono rioplatense, latencia, costo por nota y
privacidad. Para el **respaldo** (D4) conviene un proveedor con otro dueño que Google, sin tope diario fijo (pago
por uso, centavos) o con cupo gratis propio como Workers AI.
**Privacidad (D-priv):** el texto de las notas ya es público, pero lo que va a la IA incluye notas de menores y
víctimas que el semáforo frena; revisar los términos de cada proveedor sobre retención y entrenamiento
antes de elegir.

---

## T. Redes: consumo, RSS, podcast en Spotify, YouTube y TikTok (8/10, noche)

*Las reglas de YouTube, TikTok y Spotify salen de búsquedas en sitios de terceros (varios de empresas que
venden herramientas para esto): confirmar en las páginas oficiales antes de decidir.*

**T1 · ¿Subir a Instagram y TikTok consume algo?**
- **IA:** nada. El video se arma una vez (con voz de IA, que sí gasta cupo: 10 audios por día) y se reusa.
- **Instagram y Facebook (API de Meta):** gratis. Hay un tope de publicaciones por día (~100 por 24 h según mi
  memoria: confirmar). Hoy un día normal son ~7 piezas.
- **Robots de GitHub:** el repo es público, así que no consumen minutos pagos.
- **TikTok y YouTube:** no gastan IA ni voz si se reusa el mismo mp4. Lo que cuesta es **desarrollo y
  aprobaciones** (T4 y T5), no recursos.
**¿Generar el contenido es IA o código común?** Elegir las notas, el guion, la placa, los subtítulos, el video
y la publicación son **código común**. Es **IA** el texto del posteo (se escribe junto con la nota) y la voz.

**T2 · RSS: qué hay hoy (medido)**
- Existe `web/app/feed.xml/route.js`: un RSS de noticias con título, enlace, fecha, sección y bajada (55 notas
  en el build local). No incluye el cuerpo ni el audio, y no hay feeds por sección. También existen
  `sitemap-news.xml` (Google Noticias) y `llms.txt`.
- **No hay ningún feed de podcast ni etiqueta de audio** en el sitio (búsqueda de `enclosure`, `itunes` y
  `<audio>` sin resultados). Las notas de los repasos son solo texto y foto; el audio se descarta tras subirlo.
- **Mejora RSS-1:** un feed por sección, cuerpo completo y dirección real del sitio.

**T3 · Audio en la nota, feed de podcast y Spotify: ¿es viable? Sí, con un paso previo**
1. **Guardar el audio** (mp3) en un depósito público fuera del repo (Cloudflare R2): es la misma pieza que
   Q1. Un mp3 de 55 s pesa ~0,9 MB (supuesto) y son ~3 repasos por día: ~1 GB por año en el repo sería un error.
2. **Reproductor en la nota del repaso** (`<audio>`): RS-1.
3. **Feed de podcast** (RS-2): un RSS aparte con, por episodio, título, descripción (la nota), fecha y la
   etiqueta de audio con la dirección del mp3, su peso y su tipo; más datos del programa (nombre, descripción,
   idioma, categoría, imagen cuadrada). Se genera al compilar, como el feed actual, sin costo.
4. **Alta gratis en Spotify for Creators** ("hospedado en otro lado"), y en Apple Podcasts y otras con la misma
   dirección. Spotify recomienda mp3 de 96 a 320 kbps; no encontré un largo mínimo (máximo 12 h).
5. **Política de voces de IA:** Spotify anunció el 19/05/2026 que retira contenido que imite la voz o la
   identidad de otra persona. No encontré una regla clara sobre un programa con voz sintética propia: hay que
   leer su política, confirmar que las dos voces no clonan a una persona real y avisar en cada episodio que la
   voz es de IA (coherente con la regla "cada nota dice quién la escribió").
6. **Formato:** son episodios de ~55 s, muy cortos para un podcast; una opción es un episodio diario más largo
   que junte los tres repasos reusando los audios (sin gastar voz extra).
**Costo:** US$ 0 si se queda dentro de lo gratis de R2 (a confirmar). **Esfuerzo:** RS-1 2 a 3 días, RS-2 1 semana.

**T4 · Reels en YouTube Shorts (RS-3)**
- Se reusa el mismo mp4 vertical.
- **API de YouTube:** los videos subidos por un proyecto **sin auditar quedan privados** aunque se marquen públicos,
  y no avisa error. Hay que pasar una auditoría de cumplimiento de Google. El costo de cada subida contra el
  cupo diario es discutido (1.600 unidades de 10.000, o un cupo propio de 100 subidas por día desde junio de
  2026): confirmar en la consola.
- **Alternativas:** subirlo a mano con el video ya armado; o una herramienta de terceros que ya pasó la
  auditoría (de pago, a confirmar).

**T5 · Reels en TikTok (RS-4)**
- **API de TikTok (Content Posting):** una app sin auditar publica solo en privado (`SELF_ONLY`), para pocos
  usuarios; la auditoría se estima en 2 a 6 semanas y exige un video de demostración. Se rechazan las apps
  descritas como "gestión de cuenta personal" (confirmar). Con solo la revisión base se puede subir a la
  bandeja del creador, que termina de publicar desde la app.
- **Alternativas:** manual, bandeja, o herramienta de terceros.

**Decisión previa (RS-0):** elegir camino para YouTube y TikTok y leer las reglas de cada plataforma sobre voces
de IA y contenido automatizado antes de invertir tiempo.
**Pieza central:** la copia de las piezas en R2 (Q1) habilita audio en la nota, feed de podcast, YouTube,
TikTok y "Reintentar" sin límite. Por eso Q1 conviene antes que RS-1 a RS-4.

---

# U. Notas propias: 2 a 4 ideas nuevas por sección (investigación del 8/10, noche)

*Cuatro investigaciones en paralelo con búsquedas en internet, una por grupo de secciones. Ninguna idea
repite lo que ya estaba en `IDEAS.md`, `PENDIENTES.md` o la auditoría; cuando una profundiza algo anotado, se
dice. **Importante: desde este entorno no se pudo abrir ninguna fuente oficial** (datos.gob.ar,
argentina.gob.ar, gba.gob.ar, SIBOM, BCRA, INDEC, MAGyP, ENACOM, INTA, ACTC, ESPN, OpenF1, TheSportsDB y
otras devuelven "bloqueado"). Todas las fuentes están **verificadas solo por búsqueda**: antes de programar
cualquiera hay que probar el acceso desde GitHub Actions (ítem U0). Ninguna dirección fue inventada; las
URLs completas están en el registro de cada investigación y se citan abajo las principales.*

## U0 · Primer paso para todo: probar el acceso a las fuentes
Un workflow de diagnóstico que intente abrir cada fuente candidata desde GitHub Actions y diga, para cada una,
si responde, qué formato trae y de cuándo es el último dato. Sin eso, cualquier idea de esta sección puede
caer por un bloqueo. Esfuerzo bajo; se suma al workflow único de "Diagnóstico" (sección 1 de la auditoría).

## U1 · Cinco piezas comunes que sirven a varias secciones
| Id | Pieza | Qué es | Alimenta |
|---|---|---|---|
| COM-1 | **Molde "dato con plantilla"** (el de la nota del dólar) | Código que baja un dato abierto, lo compara con el anterior y arma la nota con una plantilla, **sin IA** | Inflación, siembra, empleo, transferencias, delitos, elecciones, matrícula, papa |
| COM-2 | **Calendario cargado a mano** | Un archivo con fechas (ANSES, ARBA, tasas, calendario escolar, inscripciones, vacunación), cargado por una persona con doble control y dos fuentes | "La semana del bolsillo", "¿Hay clases?", "Fechas para anotarse", vacunación |
| COM-3 | **Planilla pública de Google (CSV)** | Una hoja que llena alguien de afuera (Liga, clubes, categorías del zonal, consignatarias, recorrido de locales) y el sistema lee sola; columna "revisado por" | Liga Balcarceña, "Este finde en Balcarce", zonal, remates, locales vacíos |
| COM-4 | **Lector de boletines oficiales** | Detecta normas nuevas en SIBOM (municipal), el Boletín Oficial nacional y el de la Provincia, y la ANMAT; la IA resume solo lo que dice la norma y el verificador lo controla | "La semana en el Boletín", "Qué cambia desde hoy", "Retirados de la venta", tarifas de luz |
| COM-5 | **Vigía de páginas** | Revisa una página fija (ACTC, Juegos Bonaerenses, Panorama Agrícola) y avisa o extrae cuando cambia | TC con Mangoni, Juegos Bonaerenses, sudeste agrícola |

**Duplicados unificados:** el calendario de cobros de ANSES apareció en tres grupos → una sola idea (BAL-1, que
también alimenta la barra lateral de Argentina). La nafta por estación apareció en tres → una sola (ECO-1). El
lector de boletines apareció en Política, Argentina y Salud → una sola pieza (COM-4).

## U2 · Balcarce
| Id | Idea | Ejemplo de título | Fuente (solo búsqueda) | Cómo se arma | Esfuerzo | Cuidado |
|---|---|---|---|---|---|---|
| BAL-1 | **La semana del bolsillo**: qué vence y qué se cobra | "Vence la cuota 8 de la patente; los jubilados con DNI 2 y 3 cobran desde el martes" | Calendario ARBA 2026 (RN 6/26), cronograma ANSES (Res. 349/2025), vencimientos de tasas en la Ordenanza Fiscal (SIBOM) | COM-2 + plantilla, sin IA; nota los lunes, historia sin voz y barra lateral | Bajo | Una fecha mal hace daño: doble control; ANSES mueve fechas por feriados; cerrar con "confirmalo en ARBA o Mi ANSES" |
| BAL-2 | **¿Cuánto sube la luz en Balcarce?** | "Desde el 1/7, una casa que gasta 250 kWh paga $X sin impuestos" | Resoluciones del Ministerio de Infraestructura bonaerense (399/2026, 585/2026) y de OCEBA; falta confirmar que la Cooperativa figure en los anexos | COM-4 avisa; una persona copia 4 números; plantilla calcula la factura tipo | Medio | Cargo fijo contra variable, impuestos; la Cooperativa está en crisis: todo atribuido, sin adjetivos |
| BAL-3 | **El termómetro del centro** (locales vacíos) — profundiza PENDIENTES 4/10 y la idea 17 | "En el centro hay 23 locales vacíos, 4 más que en septiembre" | Recorrido propio fijo, el primer lunes de cada mes | Persona (1 h por mes) + COM-3 | Bajo | Fotos sin gente ni patentes; no nombrar dueños; no cambiar el recorrido |

## U3 · Política
| Id | Idea | Ejemplo de título | Fuente | Cómo se arma | Esfuerzo | Cuidado |
|---|---|---|---|---|---|---|
| POL-1 | **La plata que manda la Provincia** | "En agosto la Provincia giró a Balcarce $X millones: 6 % menos que hace un año, descontada la inflación" | "Transferencias a municipios" del Ministerio de Economía bonaerense (CSV mensual desde 2010, CC BY 4.0) + IPC (API de series de datos.gob.ar) | COM-1, sin IA; por habitante contra Lobería, Tandil y Ayacucho | Bajo-medio | Decir si son pesos de hoy o descontada la inflación; el dataset se corrige hacia atrás |
| POL-2 | **La semana en el Boletín Oficial** — profundiza IDEAS 26 y 46 | "Lo que firmaron esta semana el Concejo y el Intendente" | SIBOM (Balcarce publica desde 2017; Ley 14.491; sin API ni RSS) + normas.gba.gob.ar | COM-4; IA resume en 2 líneas con verificador | Medio | Nombrar solo a funcionarios (los decretos traen empleados y particulares); octubre a diciembre: Presupuesto 2027 y tasas |
| POL-3 | **Así vota Balcarce**, rumbo a 2027 | "Veinte años de elecciones en Balcarce: quién ganó la intendencia y por cuánto" | Catálogo de la Provincia: resultados electorales provinciales (2005-2023) y nacionales (2011-2023), CSV, CC BY 4.0; 2025 en resultados.elecciones.gob.ar | Código, página fija y notas en momentos clave | Medio (una vez) | No hay cronograma 2027; distinguir provisorio de definitivo; no proyectar; no afirmar si el intendente puede reelegir sin confirmarlo |
| POL-4 | **El votómetro del Concejo** | "La sesión en 5 votos" | Seguimiento de cada sesión (no se encontró transmisión oficial) + SIBOM para el texto final | Persona (1 a 2 h por sesión) + COM-3 | Bajo | Confirmar con el acta; mismo trato para todos los bloques |
| POL-5 (opcional) | Índice de transparencia fiscal | — | ASAP (asociación privada), trimestral | Persona | Bajo | Es una fuente privada: atribuirla |

## U4 · Policiales (solo datos agregados, nunca casos)
| Id | Idea | Ejemplo de título | Fuente | Cómo se arma | Esfuerzo | Cuidado |
|---|---|---|---|---|---|---|
| POC-1 | **Balcarce en la estadística criminal oficial** — profundiza PENDIENTES 4/10 (SNIC) | "Robos en Balcarce en 2025: X cada 100.000 habitantes, menos que Tandil" | SNIC por departamento (datos.gob.ar, CSV desde 2014, CC BY 4.0, anual); confirmar que tenga 2024 y 2025 | COM-1; tasa cada 100.000 (Censo 2022), serie 2014-2025, vecinos | Bajo-medio | Con números chicos no hablar de "ola"; son hechos denunciados; delitos sexuales no desagregados en un partido chico (consultar antes) |
| POC-2 | **Seguridad vial en el partido** (rutas 226 y 55) | "En 2025 murieron X personas en siniestros viales en Balcarce" | SNIC (muertes viales, lesiones culposas), informe de la Agencia Nacional de Seguridad Vial (PDF, último 2023), pedido mensual a Tránsito | Código anual + persona mensual | Medio | Nunca nombres, fotos ni patentes; no mezclar definiciones de víctima (30 días) |
| POC-3 | **Bomberos y Fiscalía: el mes en números** | "Bomberos salió 41 veces en septiembre: 22 por pastizales" | Pedido escrito mensual a Bomberos de Balcarce y San Agustín; trimestral a la Fiscalía Descentralizada y la Comisaría (si no contestan, pedido de acceso a la información) | Persona (30 min por mes) + plantilla | Bajo | Citar "según Bomberos"; nunca domicilios |

## U5 · Fútbol
| Id | Idea | Ejemplo de título | Fuente | Cómo se arma | Esfuerzo | Cuidado |
|---|---|---|---|---|---|---|
| FUT-1 | **Así está el descenso** (Aldosivi) | "Aldosivi, a 3 puntos de salir del último puesto de los promedios" | Las tablas de ESPN que ya se usan; carga única de puntos 2024-2025 controlada por una persona | Código, junto a la nota de tablas, sin IA | Bajo-medio | Reglas de desempate (art. 111 AFA); si no coincide con una tabla publicada, no sale |
| FUT-2 | **El Federal A de la zona** (Alvarado, Kimberley, Círculo, Santamarina) | "Federal A: Alvarado ganó en Salta y sigue primero" | TheSportsDB (liga 5523; uso comercial pide plan pago, ~US$ 5 a 9 por mes a confirmar), controlado contra El Marplatense | Código | Medio | Pagar o pedir permiso; Soccerway y Sofascore no publican condiciones de uso |
| FUT-3 | **La fecha de la Liga Balcarceña** — profundiza 0l e idea 52 | "Liga Balcarceña: Racing ganó y quedó puntero" | No hay sitio ni tabla en internet: planilla de Google llenada por la Liga o un cronista | COM-3 + plantilla, sin IA; domingo a la noche | Bajo | Segunda persona que marca "revisado"; mismo trato para todos los clubes |

## U6 · Deportes (incluido el deporte local)
| Id | Idea | Ejemplo de título | Fuente | Cómo se arma | Esfuerzo | Cuidado |
|---|---|---|---|---|---|---|
| DEP-1 | **Balcarce en la final de los Juegos Bonaerenses** (Mar del Plata, **19 al 23/10**) | "Hoy compiten balcarceños en atletismo, ajedrez y tejo" | Comunicados de gba.gob.ar y juegos.gba.gob.ar; finalistas desde la Municipalidad | Persona carga finalistas una vez + plantilla diaria; IA resume resultados con verificador | Bajo | Muchos juveniles: nombrar disciplinas y categorías, no chicos. **Tiene fecha: lista antes del 19/10** |
| DEP-2 | **Los de Balcarce en las ligas de Mar del Plata** (hockey AAMH, rugby URMDP) | "Hockey: Campo de Pato perdió 5-0 con Villa Gesell" | El Marplatense (ya se lee); La Capital MdP no tiene RSS encontrado | Excepción chica del filtro: detectar "(Balcarce)" o "Campo de Pato" y que la IA saque solo el resultado; nota semanal | Medio | El resultado es un dato, el texto ajeno no; confirmar si "Campo de Pato" es el mismo club que "Club Social Pato" |
| DEP-3 | **Este finde en Balcarce: qué se juega** (la previa, distinta de la idea 7 de resultados) | "Este finde se juega: fútbol, hockey y básquet en Balcarce" | Formulario de los clubes → planilla | COM-3; viernes; historia sin voz; suma a la agenda | Bajo | "A confirmar" si no está confirmado |

## U7 · Automovilismo
| Id | Idea | Ejemplo de título | Fuente | Cómo se arma | Esfuerzo | Cuidado |
|---|---|---|---|---|---|---|
| AUT-1 | **El TC y el TC Pick-Up como la F1, con Santiago Mangoni** (piloto de Balcarce en el TC 2026, ganó en Concepción del Uruguay; confirmar) — profundiza la idea 28 | "TC en San Nicolás: ganó X; Mangoni fue 9.º y está 14.º en el campeonato" | tiempos.actc.org.ar (campeonato, resultados por sesión, PDF de parciales) y actc.org.ar | COM-5 + molde de `ingesta/f1.mjs`; horarios el jueves, resultado el domingo; renglón fijo para Mangoni | Medio | No se encontraron condiciones de uso: escribir a la ACTC y citarla; resultados provisorios hasta el dictamen |
| AUT-2 | **Fangio, un día como hoy** con datos de Jolpica (ya se usa) | "Un día como hoy, Fangio ganó el GP de…" | Jolpica (desde 1950), cruzado con una segunda lista (en 1956 las fuentes discrepan) | Carga única guardada en el repo; alimenta las efemérides sin voz nueva | Bajo | 2027: 70 años del título de 1957 |
| AUT-3 | **La carrera de Colapinto en datos** | "Colapinto en Singapur: largó 12.º, llegó 8.º y terminó 10.º" | OpenF1 (histórico gratis desde 2023; en vivo pago, según terceros) | Gráfico de posiciones para la nota del resultado que ya existe | Medio | No es oficial; confirmar condiciones |
| AUT-4 | **El zonal y los pilotos de acá** | "Zonal del Atlántico: el balcarceño X terminó 3.º" | Federación Mar y Sierras sin resultados en línea: pedir el PDF de la clasificación | Persona + COM-3; "guía del finde" cuando se corre en el Fangio | Bajo | Depende de que contesten |

## U8 · Agro
| Id | Idea | Ejemplo de título | Fuente | Cómo se arma | Esfuerzo | Cuidado |
|---|---|---|---|---|---|---|
| AGR-1 | **Balcarce en el mapa agrícola** (siembra, cosecha y vacas del partido) | "Balcarce sembró X hectáreas de trigo, X % más que la campaña pasada" | Estimaciones Agrícolas del MAGyP por partido (CSV/XLS, 1969/70 a 2024/25, mensual); existencias bovinas de SENASA por partido (CSV, CC BY 4.0; ficha de 2019, serie nueva 2007-2023) | COM-1, sin IA | Bajo-medio | Son estimaciones oficiales; llegan con atraso; SENASA puede estar discontinuado |
| AGR-2 | **El sudeste en el Panorama Agrícola** + pizarra de Quequén — profundiza IDEAS 16 | "Siembra de girasol en el sudeste: X % de avance" | Panorama Agrícola Semanal de la Bolsa de Cereales (jueves, PDF/HTML, zona "Sudeste de Buenos Aires"); pizarra "CAC BA p/Quequén" en el boletín de la BCR | COM-5 extrae el párrafo; IA reescribe atribuido con verificador | Medio | El formato cambia; sin licencia: solo datos, con palabras propias |
| AGR-3 | **La papa, de la chacra a la góndola** | "El kilo de papa costó $X en la región Pampeana en septiembre" | IPC del INDEC: precios de alimentos por región (CSV mensual en datos.gob.ar); reportes semanales del Mercado Central | COM-1 | Bajo-medio | Es la región, no Balcarce |
| AGR-4 | **Remates de la zona** | "Remate de la semana: el ternero a $X" | Lo que publican las consignatarias locales (no verificado cuáles) | Persona carga 5 números por semana (COM-3) | Bajo | Confirmar las consignatarias |
| (profundiza auditoría 1) | Lluvia **medida** en la estación del INTA Balcarce | — | SIGA del INTA (acceso libre; no confirmado que la estación de Balcarce esté) | Código | Medio | — |

## U9 · Economía
| Id | Idea | Ejemplo de título | Fuente | Cómo se arma | Esfuerzo | Cuidado |
|---|---|---|---|---|---|---|
| ECO-1 | **La nafta en Balcarce, estación por estación** | "La súper subió $X en Balcarce: está entre $X y $X" | Dataset "Precios en surtidor" de la Secretaría de Energía (CSV geolocalizado). La Res. 717/2025 sacó la obligación de informar; según la prensa, un juez federal de La Plata la declaró inconstitucional en julio de 2026. No se sabe si trae estaciones de Balcarce ni de cuándo | Código; solo precios de los últimos 7 días con su fecha; si no hay datos frescos, no sale | Bajo (si el dato existe) | **Abrir el CSV y filtrar "BALCARCE" antes de nada** (10 minutos desde la PC). Si trae datos, pasa al primer lugar |
| ECO-2 | **La inflación del mes en la región Pampeana** | "La inflación de septiembre en la región Pampeana fue de X %; los alimentos, X %" | INDEC (CSV en datos.gob.ar y API de series); calendario del INDEC (el IPC de septiembre sale el martes 13/10) | COM-1, el día que sale | Bajo | La canasta nueva del IPC está aplazada; si cambia la base, cambian los identificadores |
| ECO-3 | **Cuánto paga un plazo fijo en los bancos de Balcarce** | "Plazo fijo a 30 días: entre X % y X % en los bancos con sucursal en Balcarce" | API del Régimen de Transparencia del BCRA (marzo 2026, abierta, sin registro) | Código semanal; lista de bancos locales cargada una vez | Bajo-medio | Citar fuente y fecha; el BCRA no garantiza lo que informan los bancos; es dato, no consejo |

## U10 · Trabajo y empleo (candidata a sección)
| Id | Idea | Ejemplo de título | Fuente | Cómo se arma | Esfuerzo | Cuidado |
|---|---|---|---|---|---|---|
| TRA-1 | **El empleo registrado en Balcarce** (y el sueldo promedio) | "Balcarce tiene X puestos registrados: X más que hace un año" | OEDE de la Secretaría de Trabajo: "Empleo y remuneraciones por departamento" (~500 departamentos, desde 2019, trimestral desde 2026) | COM-1; IA solo ordena frases con verificador | Bajo-medio | Atraso; deja afuera el trabajo informal; posible secreto estadístico en un partido chico |
| TRA-2 | **Ofertas de empleo de la semana** | "Diez búsquedas laborales abiertas en Balcarce y la zona" | Portal Empleo nacional (no verificado si se lee automático) y búsquedas del Municipio | Código si se puede; si no, persona | Medio | Solo fuentes oficiales o empresas identificadas (ofertas truchas); no es clasificados pagos (IDEAS 25) |
| TRA-3 | **Cuánto cobra un peón rural desde este mes** | "Peón rural: el nuevo básico desde noviembre" | Escalas de la CNTA y UATRE (la vigente, Disposición 1120/2026, va hasta octubre de 2026) | Persona carga desde la norma | Bajo | La prensa confunde básico con total |

## U11 · Ciencia y tecnología (candidata a renombrar Tecnología)
| Id | Idea | Ejemplo de título | Fuente | Cómo se arma | Esfuerzo | Cuidado |
|---|---|---|---|---|---|---|
| CYT-1 | **Ciencia hecha en Balcarce** (INTA Balcarce, Facultad de Agrarias, IPADS) | "Investigadores del INTA Balcarce estudian X en la papa" | OpenAlex (API, CC0, clave gratis, filtra por institución) y el repositorio INTA Digital (sección Balcarce: 619 artículos, 80 informes) | Código detecta lo nuevo; IA resume desde título y resumen, atribuido, con verificador; semanal | Medio | Bajar a lenguaje simple sin exagerar. Llena la sección sin la regla de dos medios |
| CYT-2 | **La conectividad de Balcarce y sus pueblos** | "Napaleofú sigue sin 4G: los datos de ENACOM" | Indicadores y datos abiertos de ENACOM por localidad | Código trimestral | Medio | No confirmado que haya datos de Balcarce; secreto estadístico; atrasos |
| CYT-3 | **Convocatorias y becas de la semana** (INTA, CONICET, Agencia I+D+i, UNMdP) | "Becas y llamados que cierran este mes" | Páginas de cada organismo (sin RSS) | Persona semanal | Bajo | Sirve también a Trabajo |

## U12 · Cultura y agenda
| Id | Idea | Ejemplo de título | Fuente | Cómo se arma | Esfuerzo | Cuidado |
|---|---|---|---|---|---|---|
| CUL-1 | **Convocatorias abiertas** (cada 15 días) | "Cuatro convocatorias para artistas y bibliotecas que cierran este mes" | Resumen semanal "Cultura Federal: convocatorias abiertas" (Nación), cultura.gob.ar/convocatorias, gba.gob.ar/cultura/convocatorias | COM-5 + plantilla, sin IA; solo con cierre futuro | Bajo-medio | Fechas que no coinciden entre fuentes: manda el organismo |
| CUL-2 | **Mapa cultural de Balcarce** (página fija) | "Las bibliotecas, museos y salas de Balcarce" | SInCA "Mapa Cultural – Espacios Culturales" (datos.gob.ar, CSV, última actualización 2023) | Código filtra el partido; persona confirma por teléfono | Bajo | El dato es viejo: nada sale sin confirmar |
| CUL-3 | **Lo más pedido en las bibliotecas** | "Los 5 libros más pedidos en Balcarce en octubre" | Pedido mensual a cada biblioteca popular | Persona | Bajo | Nunca quién los pidió |

## U13 · Argentina
| Id | Idea | Ejemplo de título | Fuente | Cómo se arma | Esfuerzo | Cuidado |
|---|---|---|---|---|---|---|
| ARG-1 | **Cuándo y cuánto cobro** (unificada con BAL-1) | "ANSES: quiénes cobran esta semana y cuánto queda la mínima" | Cronograma ANSES (Res. 349/2025); movilidad (Decreto 274/2024, Res. 284/2026: +1,66 % en octubre, mínima $435.748,51); calendario del INDEC | COM-2; el porcentaje se calcula el día del IPC "a confirmar con la resolución" | Bajo-medio | Doble control; la prensa da cifras distintas; el bono solo si hay norma |
| ARG-2 | **Qué cambia desde hoy** | "Tres normas que te tocan desde hoy" | Primera sección del Boletín Oficial nacional y Boletín de la Provincia (sin API ni RSS oficial confirmados) | COM-4 filtrado por organismos (ANSES, ANMAT, ARCA, ENACOM, ARBA, IOMA, DGCyE…) | Medio | No atribuirle a una norma efectos que no dice; páginas frágiles |
| ARG-3 | **El trámite de la semana** | "Cómo sacar el certificado X: la pregunta que más llegó" | Preguntas reales del WhatsApp del medio + argentina.gob.ar (CC BY) | Persona elige, IA redacta | Bajo | Distinto de IDEAS 22: nace de lo que pregunta la gente |

## U14 · Educación (candidata a sección)
| Id | Idea | Ejemplo de título | Fuente | Cómo se arma | Esfuerzo | Cuidado |
|---|---|---|---|---|---|---|
| EDU-1 | **¿Hay clases?** — profundiza la idea 4 de la auditoría | "Mañana no hay clases en las escuelas bonaerenses por jornada institucional" | Calendario escolar bonaerense 2026 (inicio 2/3, receso 20 al 31/7, fin 22/12, 5 jornadas institucionales); feriados y alertas que ya existen; paros solo con 2 medios o anuncio del gremio | COM-2; nota e historia a las 7 solo con novedad | Bajo | Decir "no hay clases" cuando sí hay es muy dañino: solo fuente oficial; jornadas distritales con la Jefatura Distrital |
| EDU-2 | **Las escuelas de Balcarce en números** | "Balcarce tiene X alumnos: X menos que hace 10 años" | Catálogo de la Provincia: "Unidades de servicio y matrícula – municipios (2015-2025)" (CSV, CC BY 4.0) y "Establecimientos educativos" (CSV, marzo 2026); Padrón Oficial nacional | COM-1 + página "Escuelas de Balcarce" con mapa | Bajo | Solo números agregados; nunca un grupo de menos de 10 alumnos |
| EDU-3 | **Fechas para anotarse** (Progresar, Facultad de Agrarias, listados docentes, inscripción escolar) | "Cierra el viernes la inscripción a X" | Progresar (Res. 485/2026), FCA de la UNMdP, ABC | COM-2 + plantilla; aviso al abrir y 3 días antes de cerrar | Bajo | Prórrogas: siempre el enlace oficial |
| EDU-4 | **El proyecto de la semana** | "La Técnica 1 armó X" | Una escuela cuenta un proyecto | Persona | Bajo | Nunca nombres de alumnos; fotos sin caras y con permiso de la dirección |

## U15 · Salud (candidata a sección)
| Id | Idea | Ejemplo de título | Fuente | Cómo se arma | Esfuerzo | Cuidado |
|---|---|---|---|---|---|---|
| SAL-1 | **El parte de la semana** (solo en temporada: dengue enero-mayo; gripe y bronquiolitis mayo-septiembre) | "Gripe en la Provincia: X casos cada 100.000, menos que el año pasado" | Boletín Epidemiológico Nacional (PDF semanal, ~9 días de atraso) y boletín semanal de la Provincia; **no comprobado** si hay datos por región sanitaria VIII o municipio | IA lee el PDF y saca 3 o 4 números (sin sumar librerías a `ingesta/`: Gemini lo lee o se hace en `reels/`), verificador | Medio | Contra el alarmismo: tasa y comparación interanual; nunca "récord alarmante"; nunca un caso identificable |
| SAL-2 | **Retirados de la venta** (ANMAT) | "La ANMAT retiró X productos esta semana" | Disposiciones de ANMAT en el Boletín Oficial y su página de alertas (RSS no comprobado) | COM-4 + plantilla con producto, marca y lote textuales; placa semanal sin voz | Bajo-medio | Confundir marca o lote; nada de "urgente" |
| SAL-3 | **Vacunación: qué toca y dónde** | "Antigripal 2026: quiénes y dónde en Balcarce" | Campañas de la Provincia (gba.gob.ar/vacunacion) | COM-2 + página "Dónde vacunarse"; persona confirma una vez por mes con Salud del Municipio | Bajo | La página dice "confirmado el DD/MM" |

## U16 · Ranking general (las 12 de más valor por esfuerzo)
1. **ECO-1 La nafta en Balcarce** — si el dataset trae Balcarce al día (abrirlo antes de nada).
2. **BAL-1 / ARG-1 La semana del bolsillo y cuándo cobro** — barra lateral de Balcarce y Argentina, historia sin voz.
3. **AUT-1 TC y TC Pick-Up con Mangoni** — piloto local ganador, molde de F1 ya hecho.
4. **POL-1 La plata que manda la Provincia** — automática, abierta, mensual, sin IA.
5. **EDU-1 ¿Hay clases?** — razón diaria para entrar.
6. **AGR-1 Balcarce en el mapa agrícola** — dato oficial del partido que nadie publica.
7. **TRA-1 Empleo registrado en Balcarce** — justifica la sección Trabajo.
8. **ECO-2 Inflación Pampeana** — molde del dólar, la nota más buscada del mes.
9. **DEP-2 Los de Balcarce en las ligas de Mar del Plata** — hueco local hoy en cero.
10. **POC-1 Balcarce en la estadística criminal** — barra lateral de Policiales sin casos.
11. **COM-4 Lector de boletines** (POL-2, ARG-2, SAL-2) — una pieza, tres secciones.
12. **DEP-1 Juegos Bonaerenses** — **por fecha, lista antes del 19/10**.

## U17 · Descartadas (y por qué)
- **Cargos docentes del día (actos públicos digitales del ABC):** parecen pedir usuario del portal; automatizarlo con una cuenta personal choca con sus condiciones.
- **Resultados de Aprender por distrito:** solo se encontraron por provincia.
- **Cine local:** no se encontró sala en Balcarce ("Cine de la semana" ya está en IDEAS).
- **Bases con una fila por víctima, búsquedas de personas, listas de detenidos o condenados:** chocan con el semáforo.
- **Soccerway y Sofascore:** no publican condiciones de uso.
- **Mistral para redactar** (de la sección S): exige aceptar entrenamiento con los datos.

## U18 · Decisiones y confirmaciones que necesitan a Hernán y Andrés
1. Confirmar que **Santiago Mangoni** es de Balcarce y si quieren seguirlo (AUT-1).
2. Confirmar si **"Campo de Pato"** de los resultados de Mar del Plata es el **Club Social Pato** (DEP-2).
3. Escribir a la **ACTC** por el uso de sus resultados (AUT-1) y decidir si se paga TheSportsDB o se pide permiso (FUT-2).
4. Si se suman Educación y Salud, decidir si Salud **espera a una persona** en redes.
5. Quién llena cada planilla (Liga, clubes, zonal, consignatarias, recorrido de locales) y quién hace los pedidos mensuales (Bomberos, Fiscalía, Tránsito, bibliotecas, Salud).
6. Abrir desde la PC el CSV de combustibles y filtrar Balcarce (10 minutos).

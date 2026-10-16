# Propuesta: ilustraciones hechas con IA como cuarto escalón de las fotos

*16/10/2026. Para Hernán y Andrés. Lo que está hecho es el módulo `ingesta/foto-ia.mjs`, sus pruebas
(`pruebas/foto-ia.test.mjs`, sin red) y la clave nueva `claveImagenes` en `reels/claves.mjs`. **No está
conectado a nada, el interruptor (`FOTO_IA_ACTIVA`) está apagado y no se probó contra la API real todavía.**
Lo que dice Google sale de su documentación oficial de octubre de 2026 (links al final).*

## Resumen para decidir (sin tecnicismos)

**La pregunta:** "para las notas a las que les faltan imágenes, ¿podemos crear imágenes con la API de
Google?". **Sí se puede, y es barato, pero sirve para muy pocas notas y tiene reglas estrictas.**

- **Qué es.** Cuando una nota no tiene foto de la fuente ni foto de stock, en vez de la placa de la
  sección saldría un **dibujo genérico** (un tractor en un campo al atardecer, un escenario de teatro vacío,
  unas monedas con una flecha) con el epígrafe **"Ilustración generada con IA (Google)"**. Nunca una foto
  falsa de algo que pasó.
- **El orden queda así:** 1) foto de la fuente; 2) foto de stock; 3) **ilustración con IA**; 4) placa de la sección.
- **Qué NO hace nunca** (el código lo frena, ningún parámetro lo apaga): Policiales, Política, Balcarce ni
  Argentina; hechos, delitos, víctimas, justicia, reclamos o lugares concretos; menores (ni un dibujo de
  útiles escolares); personas con nombre o cargo; resultados de partidos. Sin personas, sin rostros, sin
  texto, sin logos en la imagen.
- **Cuánto sirve en la práctica.** En los últimos 14 días había 68 notas sin foto y sólo **4** cumplían todas
  las reglas (7 son por menores, 7 por nombrar personas, 6 son Policiales, 27 son de secciones que quedan
  afuera, como Balcarce). Es decir, **unas 9 por mes**. Esto no arregla el problema de las fotos de Balcarce
  y de los chicos: arregla un rincón chico (Economía, Agro, Tecnología, Cultura) y lo hace con prolijidad.
- **Cuánto cuesta.** **Menos de US$ 1 por mes** (3,4 centavos de dólar por imagen). Aunque se apruebe todo lo
  posible, el tope fijo (6 por día) limita el gasto a **unos US$ 6 por mes como techo**.
- **Un dato que cambia lo del "crédito".** Según la página de precios de Google, **la generación de imágenes
  no está en el plan gratis**: hace falta una clave de un proyecto con facturación activada. En una prueba
  real con las tres claves de Gemini que tenemos (incluida la de voces), el modelo viejo
  (`gemini-2.5-flash-image`) devolvió **429 de cuota**: coincide con eso (y además Google lo apaga el 2/10/2026).
  Por eso el módulo usa **una clave propia, `GEMINI_API_KEY_IMAGENES`**, que no cae nunca en las otras.
- **Riesgo principal.** No es el costo, es la reputación: un medio de noticias con dibujos hechos por IA
  puede leerse como relleno, y una ilustración mal puesta en una nota sensible sería grave. Por eso la lista
  de lo que se ilustra es corta y cerrada, y **cada imagen la mira otra IA antes de guardarla** (si ve una
  persona, un rostro, texto, un logo, un lugar reconocible o algo que parezca una foto, la tira).

**Qué decide Hernán** (detalle en el § 7): si se prende o no; qué secciones suman (¿Balcarce, Argentina?);
si se acepta dibujar objetos para notas de escuela (hoy no); si va a Facebook/Instagram; y quién pega la
clave nueva y activa la facturación (lo hace una persona, nunca yo).

## 1. Qué modelos de Google hay y cuánto cuestan (octubre de 2026)

Datos de la documentación oficial (página de modelos y de precios de la API de Gemini). Precio por imagen,
tarifa paga estándar (la tarifa por lotes, Batch, es la mitad pero tarda hasta 24 horas):

| Modelo | Estado | 1K (aprox. 1024 px) | 2K | 4K |
|---|---|---|---|---|
| `gemini-nano-banana-2.1` (Nano Banana 2.1) | nuevo, estable; **el que recomienda Google para proyectos nuevos** | **US$ 0,0336** | 0,0504 | 0,113 |
| `gemini-3.1-flash-lite-image` (Nano Banana 2 Lite) | estable; el más rápido y barato, sólo 1K | 0,0336 | - | - |
| `gemini-3.1-flash-image` (Nano Banana 2) | estable, generación anterior | 0,067 | 0,101 | 0,151 |
| `gemini-3-pro-image` (Nano Banana Pro) | estable; para lo más complejo | 0,134 | 0,134 | 0,24 |
| `gemini-2.5-flash-image` (Nano Banana) | **se apaga el 2/10/2026** y sólo queda para quien ya lo usaba | 0,039 | - | - |
| Imagen (`imagen-*`) | **apagado**: "ya no está disponible en la API de Gemini" | - | - | - |

- **Imagen ya no existe** en la API: la familia que sirve hoy es Nano Banana (modelos "Gemini ... Image").
- **Gratis: no.** La tabla de precios dice "no disponible" en el plan gratis para todos los modelos de
  imagen. Hay que vincular una cuenta de facturación (nivel 1 de la API, que es inmediato). Con facturación, además,
  Google dice que no usa los pedidos ni las respuestas para mejorar sus productos (en el plan gratis sí).
- **Tamaños:** 1K, 2K y 4K (con "K" mayúscula; la minúscula se rechaza); la versión 3.1 Flash también 0,5K. Los
  ejemplos de la documentación usan proporciones `16:9` y `1:1`. El sitio muestra la imagen de la nota recortada a
  unos 480 px de alto en una columna ancha: **1K en 16:9 alcanza** (el banco las guarda de 1.200 px de ancho).
- **Llamada:** la documentación ya sólo muestra la API nueva `Interactions`
  (`POST .../v1beta/interactions`, con `model`, `input` y `response_format: {type: "image", mime_type, aspect_ratio, image_size}`),
  la misma que ya usan nuestras voces. La anterior (`generateContent`) "sigue totalmente soportada" pero es
  "legado". La imagen vuelve en base64 en un bloque `image` de los pasos `model_output`. El módulo lee ese formato y también el de
  `inlineData` del clásico.
- **Límites por minuto o por día de las imágenes:** la documentación no los publica (dice que se ven en
  AI Studio). No hay cuenta que hacer: por eso el módulo tiene sus propios topes.
- **Marca de agua:** "todas las imágenes generadas incluyen una marca de agua SynthID" (invisible, no se ve ni
  se puede ni se debe quitar). No hace falta hacer nada para que esté; no la sacamos.

## 2. Políticas de uso y si se puede en un medio de noticias

(Fuentes: Términos Adicionales de la API de Gemini y la Política de Uso Prohibido de IA Generativa de Google.)

- **La propiedad:** Google dice que no reclama ser dueño de lo generado. Nosotros somos responsables de cómo se usa
  y de cumplir las leyes aplicables. Puede exigirse dar atribución a Google "cuando lo requiera la ley" (por las dudas,
  el epígrafe dice "(Google)").
- **No hay una prohibición de uso en medios de noticias** ni una obligación general de etiquetar. Pero la política
  prohíbe "presentar el origen del contenido generado como si fuera sólo humano" con intención de engañar, y
  suplantar a una persona (viva o muerta) sin avisar. Etiquetar siempre es la forma de estar del lado correcto.
- **Imágenes de personas reales, de menores y de hechos reales:** la política no las trata como regla aparte (salvo
  explotación infantil, imágenes íntimas sin consentimiento y engaño), pero es **nuestra regla editorial** no
  hacerlas nunca, y el módulo las bloquea por diseño.
- **Filtros de seguridad de Google:** pueden devolver una respuesta sin imagen (bloqueada); el módulo lo trata como "sin imagen" y la nota
  queda con su placa. No se intenta esquivarlos (los términos lo prohíben).
- **Datos:** con facturación, no se usan nuestros pedidos para mejorar Google. Igual, nuestros pedidos no llevan
  nada de la nota (ver § 3).
- **Lo que no verifiqué:** si hay una norma argentina específica sobre etiquetar contenido sintético en medios (no encontré una); y las condiciones de las plataformas
  cuando se sube una imagen hecha con IA: **Meta puede agregar solo su cartel "Info de IA"** si lee la marca IPTC o la
  marca invisible. Es compatible con nuestra etiqueta, pero conviene verlo en el primer posteo real.

**Etiquetado que implementa el módulo (todas juntas, ninguna se puede olvidar):**

1. **Epígrafe visible:** el campo `credito` del banco vale `Ilustración generada con IA (Google)`, y la página de la nota ya lo muestra
   debajo de la imagen (`web/app/nota/[id]/page.js`, sin tocar nada). La misma precedente existe: la nota de "Un día como hoy" lleva
   "Ilustración generada con IA · Radar Balcarce".
2. **Texto alternativo (`alt`):** siempre `Ilustración generada con IA: un tractor en un campo al atardecer` (guardado en el banco).
3. **Metadatos IPTC/XMP dentro del archivo:** `paqueteXmp` + `incrustarXmpEnJpeg` escriben
   `DigitalSourceType = trainedAlgorithmicMedia` (la marca estándar de IPTC "Creado con IA generativa") y el crédito. Se
   pone **después** de achicar la foto, porque la recompresión borra los metadatos.
4. **Redes:** `textoConEtiqueta(texto, entrada)` agrega al pie la etiqueta si falta (y no la repite). **Ninguna pieza con una ilustración sale sin ella.** Mi recomendación: Facebook y la tarjeta de enlace, sí (con la etiqueta); **Instagram, no**.
5. **En el banco:** `origen: "ia"`, `generadaConIA: true`, `modelo`, `tema`, `fuenteDigital`, para poder contar, auditar y sacar todas si hace falta.

## 3. Cómo funciona el módulo (`ingesta/foto-ia.mjs`)

- **Decide primero si la nota puede llevar ilustración** (`evaluarNotaIA`, sin red). Sólo pasa si la sección es una de
  `SECCIONES_APTAS` (Agro, Economía, Tecnología, Cultura y agenda, Deportes, Fútbol, Automovilismo) y ninguna regla dura la frena.
  Cualquier duda es un "no" (queda la placa, que está bien).
- **Qué se dibuja sale de una tabla cerrada** (`TEMAS_IA`, 32 temas: siembra, maquinaria, papa, ganadería, exportaciones, inflación, dinero, energía, gas,
  inteligencia artificial, ciberseguridad, celular, espacio, videojuegos, teatro, cine, música, libros, arte, carnaval, tenis de mesa, vóley, básquet,
  atletismo, natación, ciclismo, pádel, golf, rugby, hockey, fútbol y automovilismo). Cada escena está escrita sin personas y sin marcas (una prueba lo controla). **Lo que no está en la tabla no se ilustra.**
- **El pedido NO lleva el título ni ningún nombre de la nota** (una prueba lo controla): sólo la escena, el estilo y lo prohibido. Una IA que no ve el nombre no puede dibujar a la persona.
- **Estilo único de la marca** (`ESTILO`): collage de papel recortado con trama de puntos y grano de papel, fondo crema `#F4F1EA`, tinta `#14161A`,
  rojo `#C7381C`, verde `#16615B` y ámbar `#E8A33C` (los colores del sitio), más el color de la sección como acento pequeño (`ACENTO_POR_SECCION`, igual
  a las placas). Es el mismo lenguaje de collage de la ilustración de "Un día como hoy" y **a propósito no es fotorrealista**: tiene que verse a la
  legua que es un dibujo. 16:9, 1K.
- **`PROHIBIDO` va en cada pedido:** sin personas, figuras humanas, rostros, manos, texto, letras, números, logos, marcas, banderas, marca de agua, lugares o edificios reales reconocibles.
- **Mirar el resultado** (`verificarIlustracion`): antes de guardar, la IA de clasificación de fotos que ya tenemos (Gemini con `GEMINI_API_KEY_CLASIFICACION`,
  gratis) mira la imagen y contesta seis preguntas (¿personas, rostros, texto, logo o marca, parece una foto real, lugar reconocible?) y si ilustra el tema. **Aprueba sólo si todo lo malo es "no" y el tema se ve.** Una respuesta incompleta, un error o la falta de clave = no se usa. Este control no se puede apagar.
- **Topes:** 3 por corrida y 6 por día (`TOPE_POR_CORRIDA`, `TOPE_POR_DIA`; se pueden bajar o subir con `FOTO_IA_TOPE_CORRIDA` y `FOTO_IA_TOPE_DIA`, pero nunca más de 12 por día). El conteo del día sale de `web/data/uso-ia.json`
  y **cuenta todas las llamadas, también las que salieron mal o se descartaron** (cuestan igual o casi).
- **Gasto registrado** en `web/data/uso-ia.json` bajo la tarea `imagenes` (y `fotos` para la que mira), con el helper que ya existe (`anotarUsoIA`).
- **Clave:** `GEMINI_API_KEY_IMAGENES`, del entorno o del `.env`. No se imprime ni va en ningún mensaje de error (una prueba lo controla con una clave falsa). No cae a ninguna otra clave. Sin ella, no hace nada.
- **Nunca lanza:** cualquier falla (cuota, red, bloqueo de seguridad, imagen ilegible) devuelve "sin imagen" con el motivo y la nota queda con la placa.
- **Ensayo sin red ni claves:** `node ingesta/foto-ia.mjs --prompts` (opcional `--dias=7`) muestra qué notas sin foto se ilustrarían, con qué escena, y cuáles no y por qué.

## 4. Los números: cuántas notas y cuánto cuesta

Con la auditoría de fotos (`docs/fotos/AUDITORIA-FOTOS.md`) y `node ingesta/foto-ia.mjs --prompts --dias=14` sobre los datos del 16/10:

| Notas sin foto de los últimos 14 días | 68 |
|---|---|
| Secciones que no llevan ilustración (Balcarce 20+, Política, Argentina...) | 27 |
| Policiales | 6 |
| Tocan a menores | 7 |
| Nombran personas o cargos (incluye "Colapinto", "Caputo") | 13 |
| Justicia o política | 4 |
| Resultado de un partido concreto | 4 |
| Hecho o emergencia | 2 |
| Sin tema genérico en la tabla | 1 |
| **Podrían llevar ilustración** | **4** (6 %) |

(Si se sumaran Balcarce, Argentina y Política a la lista, serían 5: las demás no tienen un tema genérico que dibujar. No hay por qué ampliar la lista.)

| Escenario | Imágenes por mes | Costo por mes (1K, Nano Banana 2.1) |
|---|---|---|
| Lo que realmente aplica hoy (4 cada 14 días) | ~9 | **~US$ 0,30** |
| Todas las notas sin foto, sin ninguna regla (no se hace; sólo para dimensionar) | ~146 | ~US$ 4,90 |
| Techo fijo: 6 por día todos los días | 180 | **US$ 6,05** |
| Con un modelo más caro (`gemini-3.1-flash-image`, US$ 0,067) y techo | 180 | US$ 12,06 |

Los reintentos y las imágenes descartadas por la IA que mira cuentan en el tope diario, así que el techo vale tal cual. La IA que mira la imagen usa la clave de clasificación (gratis). **El costo no es el problema.**

Si el stock (la propuesta de `PROPUESTA-STOCK.md`) se prende primero, la ilustración recibe menos notas todavía: sólo las que el stock no rescata.

## 5. Riesgos editoriales y de reputación

1. **Parecer relleno o poco serio.** Un dibujo no informa. Mitigación: pocas notas, temas "blandos" (economía, agro, tecnología, cultura), estilo de collage evidente y etiqueta clara.
2. **Que se tome por foto.** El estilo es de dibujo a propósito, el epígrafe lo dice y la IA que mira rechaza lo que parezca una foto. Aun así, un lector que no lea el epígrafe podría creer que el tractor es el de la nota: por eso se evita todo lo concreto y se pone la etiqueta.
3. **Una imagen que contradice la nota.** Mitigación: la tabla cerrada y el control de "ilustra el tema". Se recomienda mirar **a ojo las primeras 20** (Hernán o Andrés) antes de dejarlo solo.
4. **Cosas que se cuelan aunque se pidió que no:** una cara pequeña, un número, algo que parezca un logo. La IA que mira baja el riesgo pero no lo elimina; por eso es obligatoria y estricta (ante la duda, descarta).
5. **Marca/Meta:** Meta puede etiquetar solo como "Info de IA" lo que lleve la marca. Eso es esperable y coherente con lo que decimos.
6. **Inconsistencia con nuestras propias reglas:** `docs/05-FOTOS.md` dice "**Nunca una imagen hecha con IA**" y `CRITERIO-EDITORIAL.md` § 2 pide "foto de stock o ilustración por defecto", y la nota de efemérides (regla 165) ya lleva una ilustración con IA. Si se conecta hay que **reescribir esa frase** (y anotar la regla nueva en `docs/10-REGLAS-Y-PRUEBAS.md`) para que diga: "nunca una imagen de IA que se haga pasar por foto de un hecho; sí una ilustración genérica etiquetada". Ojo: en el repositorio **no quedó registro de cómo se hizo** la ilustración de las efemérides (el commit `005a1490` sólo dice "hecha con IA": ni el modelo ni el pedido). La de este módulo sí queda registrada (`modelo`, `tema` y el pedido en el código).
7. **Dependencia de un tercero y de la facturación:** si Google cambia el modelo o la clave deja de andar, todo vuelve a la placa (nada se rompe).
8. **Cantidad de imágenes iguales:** con 32 escenas, una misma escena puede repetirse en notas distintas. No es grave (son genéricas), pero se nota si hay muchas; conviene mirar el banco cada tanto.

## 6. Cómo se conectaría (no está hecho)

En `web/scripts/fotos-notas.mjs`, en el lugar donde hoy se anota "sin foto", **después** del intento de stock:

1. Si `fotoIaActiva()` y la nota ya no tiene nada que reintentar (la foto de la fuente y la de stock fallaron de verdad, no por una falla de la IA que se puede reintentar), se llama a
   `elegirIlustracionIA(nota, { enLaCorrida })` contando las de la corrida.
2. Si devuelve `elegida`, se guarda como cualquier foto: achicar a 1.200 px (`fotoParaGuardar`), **incrustar el XMP** (`incrustarXmpEnJpeg(buffer, paqueteXmp(entrada))`) y anotar `entradaDeBancoIA(...)` en el banco.
3. Si más adelante la nota gana una foto de la fuente, **la foto real reemplaza a la ilustración** (cambio chico en `sePuedeReintentar` para `origen: "ia"`, igual que el stock).
4. **Redes:** pasar todo texto de redes por `textoConEtiqueta` cuando la foto del banco es `origen: "ia"`; y excluir esas notas del espejo de Instagram (decisión 4).
5. **Web:** ya muestra el `credito`; falta confirmar que el `<img>` use el `alt` del banco (hoy no lo guardaba) y, opcional, un epígrafe con estilo propio.
6. **Variables:** variable de GitHub `FOTO_IA_ACTIVA` ("Si") y secreto `GEMINI_API_KEY_IMAGENES` (los pega una persona), pasados en `actualizar.yml`; `web/data/uso-ia.json` ya se guarda (confirmar que "Actualizar la web" no lo pierda).
7. **Pruebas:** cambiar a propósito la prueba "el módulo no está conectado" de `foto-ia.test.mjs` y sumar la regla en `docs/10-REGLAS-Y-PRUEBAS.md` (la próxima es la 180) y en `docs/05-FOTOS.md`.

## 7. Qué decide Hernán

1. **¿Se prende?** Mi recomendación: **sólo después de la prueba real y de mirar las primeras 20 a ojo**, con el tope en 3 por corrida; y aceptando que cubre ~9 notas por mes, no resuelve el 12 % sin foto.
2. **¿Se activa la facturación del proyecto de Google para imágenes y quién pega `GEMINI_API_KEY_IMAGENES`?** Hace falta una clave de un proyecto con facturación habilitada y, ojalá, **un tope de gasto mensual (US$ 10)** en Google Cloud como segunda defensa. Lo hace una persona; la clave nunca por chat.
3. **¿Qué secciones?** Recomiendo dejar la lista como está (Agro, Economía, Tecnología, Cultura y agenda, Deportes, Fútbol, Automovilismo), **sin Balcarce ni Argentina**: una imagen inventada en una nota de acá parece de acá. Los deportes ya quedan casi todos afuera por nombres, chicos y resultados.
4. **¿A Instagram y Facebook?** Recomiendo **Facebook y la tarjeta de enlace sí (con la etiqueta en el texto) e Instagram no**. Instagram es video con voz, salvo el espejo de Facebook; un espejo con dibujo no suma.
5. **¿Notas de escuela con dibujo de objetos?** (útiles, una biblioteca vacía). Hoy **no**: es el grupo más grande sin foto (7 de 68), pero hoy el criterio dice "ni una imagen ligada a menores". Sumarlo sería cambiar el código a propósito, y lo dejo a su decisión.
6. **¿Reemplazar la ilustración fija de "Un día como hoy" con un set de varias hechas con este estilo?** Hoy hay una sola y se repite todos los días; el módulo podría generar un set de 5 o 6 de una vez (≈ US$ 0,20) para rotar.
7. **¿Modelo?** Empezar con `gemini-nano-banana-2.1` (US$ 0,0336 por imagen, lo recomendado por Google); pasar a `gemini-3.1-flash-image` sólo si la calidad no alcanza.

## 8. La prueba real que queda pendiente (la corrés vos, desde un workflow)

**Qué pasó en la primera prueba:** con las 3 claves de Gemini del proyecto (incluida la paga de voces), `gemini-2.5-flash-image` devolvió **429 de cuota**. Es el modelo viejo, que Google apaga el 2/10/2026 y, según su página de precios, no está en el plan gratis. **Entonces la generación de imágenes puede requerir una clave de un proyecto con facturación habilitada para imágenes** (`GEMINI_API_KEY_IMAGENES`); no alcanza con las claves actuales.

**Variables de entorno que espera el módulo:**

| Variable | Qué es | Obligatoria |
|---|---|---|
| `GEMINI_API_KEY_IMAGENES` | la clave del proyecto con facturación (secreto) | sí, para generar |
| `GEMINI_API_KEY_CLASIFICACION` | la clave que ya existe; la usa la IA que mira la imagen (si falta, `GEMINI_API_KEY_REDACCION`) | sí, para aprobar |
| `FOTO_IA_ACTIVA` | `Si` lo prende (variable de GitHub) | sí (o `forzar: true` en la prueba) |
| `FOTO_IA_MODELO` | un modelo de la tabla (por defecto `gemini-nano-banana-2.1`) | no |
| `FOTO_IA_TOPE_CORRIDA` / `FOTO_IA_TOPE_DIA` | topes (por defecto 3 y 6; máximo 12 por día) | no |

**Modelos a probar, en este orden, de a una imagen** (una escena como "tractor en un campo al atardecer"), anotando HTTP, si vuelve imagen, tamaño real y si sale en `jpeg`:

1. `gemini-nano-banana-2.1` (el de por defecto; 1K, 16:9, `image/jpeg`).
2. `gemini-3.1-flash-lite-image` (la más barata; sólo 1K, no se le manda `image_size`).
3. `gemini-3.1-flash-image`.
4. `gemini-3-pro-image` y `nano-banana-pro-preview` (el nombre que aparece en el listado de modelos visibles de la cuenta; probablemente el equivalente "preview" de Nano Banana Pro). **Ojo:** `nano-banana-pro-preview` no está en `PRECIOS_USD`, así que el módulo todavía lo rechaza por la variable `FOTO_IA_MODELO`; si anda y se quiere usar, hay que sumarlo a la tabla con su precio.
5. `gemini-2.5-flash-image`: ya se sabe que da 429; no vale la pena.

**Qué mirar al correrla** (y qué ajustar si no cumple): (a) si `POST .../v1beta/interactions` acepta el pedido tal como lo arma `pedidoDeImagen` (si da 400, probar `image/png` en lugar de `jpeg` o sacar `image_size`; si no existe para imágenes, usar el `generateContent` clásico, que el lector de respuestas ya entiende); (b) que `imagenDeLaRespuesta` encuentre la imagen (si no, ver el JSON de la respuesta); (c) que la imagen salga **sin personas, texto ni logos** con el estilo (ajustar `ESTILO` y `PROHIBIDO`; medir con 10 escenas distintas antes de aprobar); (d) que el 429 desaparezca con la clave nueva; (e) que `uso-ia.json` anote la tarea `imagenes`; (f) que la IA que mira rechace una imagen con persona (probar a propósito con una escena con gente).

## 9. Archivos

| Archivo | Qué es |
|---|---|
| `ingesta/foto-ia.mjs` | El módulo (sin dependencias, sólo `fetch`). Apagado. Ensayo sin red: `node ingesta/foto-ia.mjs --prompts` |
| `pruebas/foto-ia.test.mjs` | Pruebas sin red: lo que debe rechazar (Policiales, hechos, menores, Política/Balcarce/Argentina, personas, justicia, resultados, lugares), el pedido sin nombres, la verificación estricta, los topes, la etiqueta (epígrafe, alt, IPTC/XMP, redes), que no esté conectado y que no lleve claves |
| `reels/claves.mjs` | Suma `claveImagenes` (`GEMINI_API_KEY_IMAGENES`), sin respaldo en las otras |
| `pruebas/foto-stock.test.mjs` | Ajustada: la prueba "no está conectado" no cuenta a `foto-ia.mjs` |
| `docs/fotos/PROPUESTA-STOCK.md` y `AUDITORIA-FOTOS.md` | Los escalones 2 y la medición de las notas sin foto |

## Fuentes consultadas (documentación oficial, 15-16/10/2026)

- Generación de imágenes con Gemini (Nano Banana): https://ai.google.dev/gemini-api/docs/image-generation
- Precios: https://ai.google.dev/gemini-api/docs/pricing
- Modelos: https://ai.google.dev/gemini-api/docs/models
- Imagen (apagado): https://ai.google.dev/gemini-api/docs/imagen
- API Interactions (y estado de `generateContent`): https://ai.google.dev/gemini-api/docs/interactions
- Límites y niveles: https://ai.google.dev/gemini-api/docs/rate-limits
- Términos adicionales de la API de Gemini: https://ai.google.dev/gemini-api/terms
- Política de uso prohibido de IA generativa: https://policies.google.com/terms/generative-ai/use-policy
- IPTC, "Digital Source Type" `trainedAlgorithmicMedia`: https://iptc.org/news/iptc-publishes-metadata-guidance-for-ai-generated-synthetic-media/

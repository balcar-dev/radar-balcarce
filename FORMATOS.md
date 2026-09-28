# Medidas de imágenes y videos de cada red

Los datos viven en código: [`redes/formatos.mjs`](redes/formatos.mjs). Este
documento explica el porqué. **Verificado el 24/09/2026** (la portada de Facebook, el 25/09/2026). Se vuelve a mirar
cada 90 días (la auditoría avisa por WhatsApp cuando toca).

## Tabla

| Dónde | Medida | Proporción | Qué usamos |
|---|---|---|---|
| Instagram · posteo | 1080 × 1350 | 4:5 | tarjeta propia de la nota: `/nota/ID/instagram.png` (con su foto si tiene, desde el 28/09) |
| Instagram · historia / reel | 1080 × 1920 | 9:16 | placas de `reels/placa.mjs` |
| Facebook · posteo con enlace | 1200 × 630 | 1,91:1 | `opengraph-image` de la nota (con su foto a la izquierda si tiene, desde el 28/09) |
| Facebook · posteo con foto | 1080 × 1350 (o 1080 × 1080) | 4:5 | — |
| Facebook · historia / reel | 1080 × 1920 | 9:16 | las mismas placas que Instagram |
| Facebook · portada de la página | 1640 × 924 (se ve a 820 × 312 en compu y 640 × 360 en celular) | 16:9 | `node reels/portada.mjs` (ver abajo) |
| Web · al compartir un enlace | 1200 × 630 | 1,91:1 | `opengraph-image` |
| Web · íconos | 192, 512, 180 (Apple), 16/32/48 (.ico) | 1:1 | `web/public/` |

**Sin confirmar en fuente oficial** (valores habituales, la auditoría los
marca): foto de perfil de Instagram (1080 × 1080, se ve redonda) y foto de
perfil de Facebook (720 × 720).

## La portada de Facebook (25/09/2026)

La primera versión (1640 × 624, 2,63:1) se veía "agrandada" en el celular: ahí
Facebook la muestra en 16:9 (640 × 360) y recortaba ~32 % del ancho, cortando la
marca ("ADAR BALCARC"), y el avatar redondo tapaba la bajada. Por eso ahora es
**una sola imagen 16:9 de 1640 × 924**:

- **Celular**: se ve entera. El avatar tapa el centro-abajo (en una captura real
  empezaba a ~54 % de la altura, diámetro ~44 % del ancho) y arriba quedan la
  barra de estado y los botones (sólo en los costados).
- **Computadora**: se recorta a 2,63:1 centrado: quedan las filas 150 a 774. El
  avatar cae abajo a la izquierda.
- **Zona segura común** (`ZONA_SEGURA` en `reels/portada.mjs`): x 220 a 1420,
  y 190 a 425. Ahí van la marca y la bajada; los anillos del radar son fondo.
  Una prueba mide las cajas reales del texto contra esa zona.

Fuentes: guías de tamaños (socialsizes.io, brandwatch.com, whatdimensions.com),
consultadas el 25/09/2026, todas coinciden en 820 × 312 y 640 × 360. **No se pudo
leer la ayuda oficial de Meta** (la página no devolvió un texto consistente) ni
hay una medida oficial del avatar: esa se tomó de la captura del celular.

## Las plantillas del 28/09 y sus zonas seguras

Las medidas no cambiaron; cambió el diseño (lienzo "Radar Balcarce · Plantillas
redes", aprobado por Hernán el 28/09). Qué pieza usa qué plantilla:
`MEDIA-KIT.md`, "Las plantillas de las piezas". Dónde va el texto en cada una:

| Pieza | Dónde puede ir texto | Qué llega al borde | Dónde está el número |
|---|---|---|---|
| Historias y reels (podcasts, clima, farmacia, extras) | entre las filas **250 y 1580** (arriba la app pone su nombre y la barra, abajo los botones); la firma termina en la 1570 | nada: el fondo es papel liso | `ZONA_TEXTO` en `reels/placa.mjs` (= `margenArriba` y `margenAbajo` de acá) |
| Subtítulos del video | centrados en la fila **1660**, sobre papel, debajo de todo lo demás | — | `SUB_Y` en `reels/reel.mjs` |
| Espejo en Instagram (4:5) | entre las filas **150 y 1215** (la grilla cuadrada recorta 135 arriba y abajo) y a **72 px** de los costados (la 3:4 recorta 34) | la foto (arriba, 690 px de alto) o el bloque de color de la placa sin foto | `INSTAGRAM` en `web/lib/tarjeta-diseno.js` |
| Enlace de Facebook, WhatsApp (1,91:1) | a 64 px de los costados; con foto, el texto va a la derecha de la foto | la foto (a la izquierda, 460 px de ancho, `ANCHO_FOTO_ENLACE`) o, sin foto, la banda de color de arriba | `web/lib/tarjeta.js`, `web/lib/tarjeta-diseno.js` |

Si una historia trae más de lo que entra (tres farmacias con direcciones
largas, el aviso de clima), la placa se achica entera; nunca se corta ni pisa
la firma. Los títulos nunca se cortan: se achica la letra. Lo prueba
`pruebas/placas.test.mjs`, que mide con resvg cada renglón de cada placa.

## Por qué Instagram y Facebook usan imágenes distintas

- **Instagram** muestra el posteo vertical y, en la grilla del perfil, lo
  recorta (cuadrado en la app vieja, 3:4 en la nueva desde 2025). Una imagen
  apaisada perdía los costados del titular. Por eso la tarjeta es 4:5 y **todo
  el texto queda en la zona segura del centro (1012 × 1080)**: 135 px de
  margen arriba y abajo. La foto de la nota (desde el 28/09) sí llega al borde:
  si la grilla la recorta, no se pierde nada. La foto va sin el crédito
  adentro; el crédito va al pie del posteo.
- **Facebook**, con un enlace, muestra la imagen del enlace apaisada. Por eso
  ahí va la de 1200 × 630, que es la misma que ve WhatsApp. Desde el 28/09
  lleva la foto de la nota a la izquierda (`FOTO_EN_ENLACE`), sin el crédito
  adentro: el crédito está en el epígrafe de la página a la que lleva el
  enlace. Sin foto, la banda de color.
- **Historias y reels**: 9:16. Las apps ponen su propia interfaz arriba (~250 px)
  y abajo (~340 px): ahí no va texto.

## Cómo se cuida

1. `pruebas/formatos.test.mjs` compara lo que el código genera (tarjetas,
   placas, íconos) con `formatos.mjs`. Si alguien cambia una medida sin
   actualizar la fuente única, rompe. **No** falla por fechas: eso frenaría la web.
2. `redes/auditar.mjs` corre **todos los lunes** (workflow `auditoria.yml`):
   baja las imágenes publicadas y mide sus píxeles, revisa que estén los
   íconos, corre el auditor de SEO en vivo y avisa por WhatsApp si algo se
   desvió o si los datos de este documento pasaron de 90 días.
3. El vigilante (`redes/vigilar.mjs`) avisa si la auditoría dejó de correr
   (más de 10 días). Resultado en `web/data/auditoria.json`.

## Cómo actualizar

1. Buscar las medidas vigentes (fuentes abajo o la ayuda oficial de Meta).
2. Cambiar los valores y `VERIFICADO` en `redes/formatos.mjs`.
3. Si cambió una medida que generamos, ajustar `web/lib/tarjeta-diseno.js`
   (y los `TAMANO` de `web/lib/tarjeta.js`) o `reels/placa.mjs` y correr
   `npm test`.
4. Actualizar la tabla de arriba.

## Fuentes (consultadas el 24/09/2026)

- buffer.com/resources/instagram-image-size
- influencermarketinghub.com/instagram-image-sizes
- yoursocial.team/blog/instagram-new-grid-format
- buffer.com/resources/social-media-image-sizes
- socialsizes.io/facebook-cover-photo-size (portada, 25/09/2026)
- brandwatch.com/blog/facebook-cover-photo-size (portada, 25/09/2026)
- whatdimensions.com/photo-image-sizes/dimensions-for-facebook-cover-photo (portada, 25/09/2026)
- blog.hootsuite.com/social-media-image-sizes-guide

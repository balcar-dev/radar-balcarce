# Medidas de imágenes y videos de cada red

*Actualizado el 29/09/2026.* Los números viven en código:
[`redes/formatos.mjs`](redes/formatos.mjs). Este documento explica el porqué.
**Verificadas el 25/09/2026** (`VERIFICADO` en `redes/formatos.mjs`). Se vuelven
a mirar cada 90 días: la auditoría de los lunes avisa por WhatsApp cuando toca
(la próxima, hacia el 24/12/2026).

## Tabla

| Dónde | Medida | Proporción | Qué usamos |
|---|---|---|---|
| Instagram · posteo | 1080 × 1350 | 4:5 | La tarjeta propia de la nota: `/nota/ID/instagram.png` (con su foto, si tiene) |
| Instagram · historia / reel | 1080 × 1920 | 9:16 | Las placas de `reels/placa.mjs` |
| Facebook · posteo con enlace | 1200 × 630 | 1,91:1 | `opengraph-image` de la nota (con su foto a la izquierda, si tiene) |
| Facebook · posteo con foto | 1080 × 1350 (o 1080 × 1080) | 4:5 | — |
| Facebook · historia / reel | 1080 × 1920 | 9:16 | Las mismas placas que Instagram |
| Facebook · portada de la página | 1640 × 924 (se ve a 820 × 312 en la compu y 640 × 360 en el celular) | 16:9 | `node reels/portada.mjs` (abajo) |
| Web · al compartir un enlace | 1200 × 630 | 1,91:1 | `opengraph-image` |
| Web · íconos | 192, 512, 180 (Apple), 16/32/48 (.ico) | 1:1 | `web/public/` |

**Sin confirmar en fuente oficial** (`verificado: false`; la auditoría lo avisa
cada semana y confirmarlas está en `PENDIENTES.md`): la foto de perfil de
Instagram (1080 × 1080, se ve redonda) y la de Facebook (720 × 720).

## La portada de Facebook

La primera versión (1640 × 624, 2,63:1) se veía "agrandada" en el celular: ahí
Facebook la muestra en 16:9 (640 × 360) y recortaba un 32 % del ancho, cortando
la marca ("ADAR BALCARC"), y el avatar redondo tapaba la bajada. Desde el 25/09
es **una sola imagen 16:9 de 1640 × 924**:

- **Celular**: se ve entera. El avatar tapa el centro de abajo (en una captura
  real empezaba al 54 % de la altura, con un diámetro del 44 % del ancho) y
  arriba quedan la barra de estado y los botones (sólo en los costados).
- **Computadora**: se recorta a 2,63:1, centrada: quedan las filas 150 a 774. El
  avatar cae abajo a la izquierda.
- **Zona segura común** (`ZONA_SEGURA` en `reels/portada.mjs`): x de 220 a 1420,
  y de 190 a 425. Ahí van la marca y la bajada; los anillos del radar son fondo.
  Una prueba mide las cajas reales del texto contra esa zona.

Las guías consultadas (abajo) coinciden en 820 × 312 y 640 × 360. **No se pudo
leer la ayuda oficial de Meta** ni hay una medida oficial del avatar: ésa salió de
la captura del celular.

## Las plantillas y sus zonas seguras

Qué pieza usa qué plantilla (el diseño del 28/09): `MEDIA-KIT.md`, "Las
plantillas de las piezas". Dónde puede ir el texto en cada una:

| Pieza | Dónde puede ir texto | Qué llega al borde | Dónde está el número |
|---|---|---|---|
| Historias y reels (podcasts, clima, farmacia, extras) | Entre las filas **250 y 1580** (arriba la app pone su nombre y la barra; abajo, los botones); la firma termina en la 1570 | Nada: el fondo es papel liso | `ZONA_TEXTO` en `reels/placa.mjs` (= `margenArriba` y `margenAbajo` de `redes/formatos.mjs`) |
| Subtítulos del video | Centrados en la fila **1660**, sobre papel, debajo de todo lo demás | — | `SUB_Y` en `reels/reel.mjs` |
| Espejo en Instagram (4:5) | Entre las filas **150 y 1215** (la grilla cuadrada recorta 135 arriba y abajo) y a **72 px** de los costados (la 3:4 recorta 34) | La foto (arriba, 690 px de alto) o el bloque de color de la placa sin foto | `INSTAGRAM` en `web/lib/tarjeta-diseno.js` |
| Enlace de Facebook y WhatsApp (1,91:1) | A 64 px de los costados; con foto, el texto va a la derecha | La foto (a la izquierda, 460 px de ancho, `ANCHO_FOTO_ENLACE`) o, sin foto, la banda de color de arriba | `web/lib/tarjeta.js`, `web/lib/tarjeta-diseno.js` |

Si una historia trae más de lo que entra (tres farmacias con direcciones largas,
el aviso de clima), la placa se achica entera: nunca se corta ni pisa la firma.
Los títulos nunca se cortan: se achica la letra. Lo prueba
`pruebas/placas.test.mjs`, que mide con resvg cada renglón de cada placa.

## Por qué Instagram y Facebook usan imágenes distintas

- **Instagram** muestra el posteo vertical y, en la grilla del perfil, lo recorta
  (cuadrado en la app vieja, 3:4 en la nueva desde 2025): una imagen apaisada
  perdía los costados del titular. Por eso la tarjeta es 4:5 y **todo el texto
  queda en la zona segura del centro (1012 × 1080)**; la foto sí llega al borde.
- **Facebook**, con un enlace, muestra la imagen apaisada: va la de 1200 × 630,
  la misma que ve WhatsApp.
- **Historias y reels** (9:16): las apps ponen su interfaz arriba (unos 250 px) y
  abajo (unos 340 px); ahí no va texto.

## Cómo se cuida

1. `pruebas/formatos.test.mjs` compara lo que el código genera (tarjetas, placas,
   íconos) con `redes/formatos.mjs`: si alguien cambia una medida sin actualizar
   la fuente única, rompe. **No** falla por fechas: eso frenaría la web.
2. `redes/auditar.mjs` corre **todos los lunes** (workflow `auditoria.yml`): mide
   los píxeles de las imágenes publicadas, revisa los íconos, corre el auditor de
   SEO en vivo y avisa por WhatsApp si algo se desvió, si hay medidas sin
   confirmar o si la verificación pasó de 90 días (`web/data/auditoria.json`).
   El vigilante avisa si la auditoría no corre hace más de 10 días.

## Cómo actualizar

1. Buscar las medidas vigentes (las fuentes de abajo o la ayuda oficial de Meta).
2. Cambiar los valores y `VERIFICADO` en `redes/formatos.mjs` (y `verificado:
   true` en las que se confirmen en una fuente oficial).
3. Si cambió una medida que generamos, ajustar `web/lib/tarjeta-diseno.js` (y los
   `TAMANO` de `web/lib/tarjeta.js`) o `reels/placa.mjs`, y correr `npm test`.
4. Actualizar la tabla de arriba y la fecha de este documento.

**Fuentes** (consultadas el 24/09/2026; las de la portada, el 25/09/2026):

- buffer.com/resources/instagram-image-size
- influencermarketinghub.com/instagram-image-sizes
- yoursocial.team/blog/instagram-new-grid-format
- buffer.com/resources/social-media-image-sizes
- blog.hootsuite.com/social-media-image-sizes-guide
- socialsizes.io/facebook-cover-photo-size (portada)
- brandwatch.com/blog/facebook-cover-photo-size (portada)
- whatdimensions.com/photo-image-sizes/dimensions-for-facebook-cover-photo (portada)

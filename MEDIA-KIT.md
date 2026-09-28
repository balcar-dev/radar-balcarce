# El media kit: toda la identidad visual, en un solo lugar

*Creado el 27/09/2026, a pedido de Hernán: "por si en algún momento hay que
cambiar de nuevo el diseño, saber en todo lo que se usaría".* Este documento
no inventa nada nuevo: reúne lo que ya está definido y repartido en otros
documentos y en el código, para que un cambio de diseño no se olvide de
ningún lugar. Cada dato tiene un solo lugar donde vive de verdad (para no
tener dos copias que se desacuerden); acá se lo nombra y se dice dónde está.

## La identidad

- **Nombre:** Radar Balcarce. **Dominio:** `radarbalcarce.com`.
- **Quiénes lo hacen:** Hernán y Andrés, dos vecinos de Balcarce
  (`/quienes-somos`).
- **La voz:** siempre la misma locutora (Kore, de Gemini), un tono cercano y
  otro serio para lo grave. Identidad completa, saludos, cierres y las
  instrucciones exactas de voz: `CRITERIO-REDES.md`.
- **El eslogan de la portada de Facebook:** "Lo que pasa en Balcarce, la
  región y el país" (`BAJADA`, en `reels/portada.mjs`).

## Los colores

**El de la marca:** rojo `#C7381C` (oscuro `#9C2B15`). Es el de la foto de
perfil y el acento general. **Nunca** en un aviso publicitario
(`PUBLICIDAD.md`, para que no se confunda con contenido propio).

**Fondo y texto de la web:** tinta `#14161A`, crema/papel `#F4F1EA`. Viven
como variables CSS en `web/app/globals.css` (`--tinta`, `--papel`, `--crema`,
`--rojo`, etc.), con su versión de modo oscuro.

**Un color por sección**, el mismo en la web, las placas y las tarjetas para
compartir (`--s-*` en `web/app/globals.css`; los mismos valores en
`reels/placa.mjs` y `web/lib/tarjeta.js`; prueba que los tres coincidan:
`pruebas/titulos-colores.test.mjs` y `pruebas/cruce-coherente.test.mjs`):

| Sección | Color |
|---|---|
| Balcarce | `#B91C1C` |
| Política | `#3730A3` |
| Policiales | `#831843` |
| Fútbol | `#15803D` |
| Deportes | `#0F766E` |
| Automovilismo | `#B45309` |
| Agro | `#4D7C0F` |
| Economía | `#8A6500` |
| Cultura y agenda | `#9D2C8F` |
| Tecnología | `#0B6FB8` |
| Argentina | `#4B5563` |

**Los podcasts cambian de color según el día de la semana** (no según la
sección): `colorDelDia` en `redes/piezas.mjs` — domingo magenta, lunes rojo
de la marca, martes verde, miércoles azul, jueves ámbar, viernes violeta,
sábado verde azulado. El perfil de Instagram y Facebook se mantiene siempre
en el rojo de la marca.

## La tipografía

Desde el 27/09: **Source Serif 4** (títulos, marca) e **Inter** (todo lo
demás: etiquetas, datos, cifras, texto). Antes eran Fraunces e IBM Plex Sans
(se veían pesadas en el celular). Detalle del sistema (tamaños, cuándo usar
cada variable): `web/README.md`, sección "Sistema tipográfico".

Dónde están los archivos de letra:

- **La web:** se piden a Google Fonts en `web/app/layout.js`.
- **Las placas de Instagram, el avatar y la portada de Facebook:**
  `reels/marca/fuentes/` (Source Serif 4 en su corte de 60 puntos —
  `SourceSerif4-*.ttf` — e Inter, `Inter-*.ttf`; carpeta en `.gitignore`
  salvo estos archivos).
- **Las imágenes para compartir (Facebook, WhatsApp, la web):**
  `web/fuentes/` (`SourceSerif4-900.ttf`, `Inter-600.ttf`), usadas por
  `web/lib/tarjeta.js`.
- **El panel y la guía comercial:** se piden a Google Fonts (`panel/panel.html`,
  `panel/acceso.mjs`, `comercial/vista.plantilla.html`).

## Los íconos

| Qué | Archivo | Medida |
|---|---|---|
| El sitio (pestaña del navegador) | `web/app/favicon.ico`, `web/app/icon.png` | 16/32/48 (.ico), 192 y 512 (PNG) |
| Apple (agregar a la pantalla de inicio) | `web/public/apple-touch-icon.png` | 180 × 180 |
| Perfil de Instagram | se sube a mano, `node reels/avatar.mjs` lo genera | 1080 × 1080 (se ve redonda; sin confirmar en fuente oficial, `FORMATOS.md`) |
| Perfil de Facebook | mismo archivo que Instagram | 720 × 720 (sin confirmar) |

## Las medidas de imagen y video por red

Tabla completa, con el porqué de cada una y cómo se audita:
[`FORMATOS.md`](FORMATOS.md). Resumen:

| Dónde | Medida | Con qué se arma |
|---|---|---|
| Instagram/Facebook · posteo | 1080 × 1350 (4:5) | tarjeta propia de la nota (`web/lib/tarjeta.js`) |
| Instagram/Facebook · historia y reel | 1080 × 1920 (9:16) | placas (`reels/placa.mjs`) |
| Facebook · posteo con enlace / la web al compartir | 1200 × 630 (1,91:1) | `opengraph-image` de la nota |
| Facebook · portada de la página | 1640 × 924 (16:9) | `node reels/portada.mjs` |

## Cómo suenan y qué dicen las piezas

No es sólo visual: la voz, los saludos, los cierres, cuándo se dice la
dirección del sitio y los largos de cada pieza están en
[`CRITERIO-REDES.md`](CRITERIO-REDES.md) (el criterio) y `redes/guiones.mjs`
(los bancos de frases).

## El rediseño en curso (27/09)

La dirección **B** ("Pantalla": fondo oscuro del color de la sección, un
dato grande cuando la nota lo tiene verificado, tipografía enorme) fue la
elegida. El detalle de las tres direcciones que se probaron, con las
imágenes de cada una: la propuesta de esa noche (`PROPUESTA-REDES.md`, no
versionada — pedirla si hace falta volver a mirarla). Falta aplicarla a
`reels/placa.mjs` y probarla también como tarjeta de WhatsApp
(`PENDIENTES.md`).

## Cuándo actualizar este documento

Cada vez que cambie un color, una tipografía, una medida o el criterio de
voz — o cuando se apruebe un nuevo rediseño de las piezas — para que la
próxima vez que haga falta cambiar de diseño, esté todo en un solo lugar.

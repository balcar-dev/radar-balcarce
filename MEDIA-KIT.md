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

**Fondo de las piezas de redes (28/09):** papel `#FAF8F3`, tinta `#14161A`,
gris de bajadas y direcciones `#474C55`, rayas `#D9D4C7`. La tarjeta del
clima es azul noche `#1B2733` (recuadros `#26374A`, rótulos `#A9C2D9`, sol
`#F2A93B`) y la de la farmacia lleva borde verde `#13804A`. Viven en
`COLORES` (`reels/placa.mjs`) y en `web/lib/tarjeta-diseno.js`.

**Un color por sección**, el mismo en la web, las placas y las tarjetas para
compartir (`--s-*` en `web/app/globals.css`; los mismos valores en
`reels/placa.mjs` y `web/lib/tarjeta-diseno.js`; prueba que los tres coincidan:
`pruebas/titulos-colores.test.mjs` y `pruebas/cruce-coherente.test.mjs`).
Desde el 28/09 las tarjetas también usan estos tonos (antes llevaban una
versión clara, para el fondo oscuro de entonces):

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
(se veían pesadas en el celular). Se eligieron entre cuatro opciones probadas
con titulares reales (Fraunces, Newsreader, Source Serif 4 y Archivo): Source
Serif es la más firme y clara en pantalla chica. El `<link>` de Google Fonts
(`web/app/layout.js`) pide Source Serif 4 (600 a 900) e Inter (400 a 700), con
tamaño óptico; los titulares llevan `lining-nums proportional-nums` y las
cifras, `tabular-nums`. Nunca una cifra ni un nombre de servicio en la letra
de los títulos.

### El sistema tipográfico

Las tarjetas de servicio (clima, farmacia, dólar, agenda, buzón, números
útiles) y las páginas `/farmacias`, `/dolar`, `/agenda` y `/util` comparten
**un** sistema, definido con variables en `web/app/globals.css` (bloque
"sistema tipográfico"). Nada de tamaños sueltos: **cambiar un tamaño es
cambiar la variable, no la tarjeta** (`pruebas/tipografia.test.mjs`).

| Rol | Variable | Valor | Se usa en |
|---|---|---|---|
| Etiqueta | `--t-etiqueta` + `--ls-etiqueta` | 11px, 600, mayúsculas, letra abierta, gris | Primera línea de cada tarjeta |
| Meta | `--t-meta` | 12,5px, gris | Hora, aclaraciones, "compra $1.495" |
| Texto | `--t-texto` | 14px | Dirección, descripción, números útiles |
| Acción | `--t-accion` | 13px, 600, rojo, con "→" | "Ver la semana →", "Toda la agenda →" |
| Dato | `--t-dato` | 16px, 700 | Nombre de la farmacia, estado del cielo, tipo de dólar |
| Dato grande | `--t-dato-grande` | 22px, 700, tabular | Venta del dólar, número de teléfono |
| Cifra | `--t-cifra` | 44px, 700, tabular | Sólo la temperatura |
| Título de tarjeta | `--t-titulo-tarjeta` | 19px, Source Serif 700 | Buzón e invitaciones ("¿Viste algo en el barrio?") |

El nombre de la farmacia es un dato, no un titular (mismo tamaño que cualquier
dato, en tinta); el rojo es el acento de las acciones. El puntito de estado
(`.punto-vivo`, 6px, verde) va a la izquierda de la etiqueta y sólo cuando el
dato está confirmado al día (la farmacia del día; el clima y el dólar cuando
el navegador ya consultó la fuente).

Dónde están los archivos de letra:

- **La web:** se piden a Google Fonts en `web/app/layout.js`.
- **Las placas de Instagram, el avatar y la portada de Facebook:**
  `reels/marca/fuentes/` (Source Serif 4 en su corte de 60 puntos —
  `SourceSerif4-*.ttf` — e Inter, `Inter-*.ttf`; carpeta en `.gitignore`
  salvo estos archivos).
- **Las imágenes para compartir y el espejo de Instagram:**
  `web/fuentes/` (`SourceSerif4-900.ttf`, `Inter-400.ttf` —la bajada, desde
  el 28/09— e `Inter-600.ttf`), usadas por `web/lib/tarjeta.js`.
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
| Instagram · espejo de cada posteo de Facebook | 1080 × 1350 (4:5) | tarjeta de la nota, con su foto si tiene (`web/lib/tarjeta.js`) |
| Instagram/Facebook · historia y reel | 1080 × 1920 (9:16) | placas (`reels/placa.mjs`) |
| Facebook · posteo con enlace / la web al compartir | 1200 × 630 (1,91:1) | `opengraph-image` de la nota, sin foto (`web/lib/tarjeta.js`) |
| Facebook · portada de la página | 1640 × 924 (16:9) | `node reels/portada.mjs` |

## Cómo suenan y qué dicen las piezas

No es sólo visual: la voz, los saludos, los cierres, cuándo se dice la
dirección del sitio y los largos de cada pieza están en
[`CRITERIO-REDES.md`](CRITERIO-REDES.md) (el criterio) y `redes/guiones.mjs`
(los bancos de frases).

## Las plantillas de las piezas (28/09)

El 28/09 salieron piezas en Facebook e Instagram con el diseño viejo (fondo de
color con un corte en diagonal). Ese mismo día se pasaron todas al diseño que
aprobó Hernán en el lienzo **"Radar Balcarce · Plantillas redes"** (reemplaza a
la dirección "Pantalla" que se había elegido el 27/09 y nunca se aplicó): fondo
papel, títulos grandes en Source Serif 4, textos en Inter, la firma "Radar
Balcarce" (Radar en tinta, Balcarce en el rojo de la marca) y el color de cada
sección como acento. Dos cosas del lienzo **no** se tomaron: sus letras
(Fraunces e IBM Plex: van las del proyecto) y sus colores de sección (van los
de la web).

| Pieza | Plantilla del lienzo | Medida | Dónde se arma |
|---|---|---|---|
| Los tres podcasts (reel + historia) | Repaso · tapa: el nombre del podcast y la duración en el color del día, un título ("Tres noticias para empezar el día", "Tres cosas que pasaron hoy", "Lo que dejó el día") y la lista numerada de las notas, cada número en el color de su sección | 1080 × 1920 | `placaRepaso` (`reels/placa.mjs`), desde `reels/plan.mjs` |
| El clima de la mañana | Historia diaria: "Hoy en Balcarce", la fecha, la tarjeta oscura del clima (temperatura, cielo, sensación y viento, hoy y los dos días que siguen); sin dólar: si se mueve, sale como nota propia | 1080 × 1920 | `placaClima` |
| El clima de la noche | Historia diaria: "Cómo sigue el día", la tarjeta del clima (ahora, esta noche, mañana y pasado) y un recuadro con el pronóstico de mañana | 1080 × 1920 | `placaClima` |
| El aviso de clima | Historia diaria con un recuadro de borde rojo ("Qué hay que saber") | 1080 × 1920 | `placaClima` |
| La farmacia de turno | Historia diaria: la fecha y la tarjeta blanca con borde verde (nombre, dirección, teléfono) y hasta cuándo dura el turno | 1080 × 1920 | `placaFarmacia` |
| Teléfonos útiles y agenda (extras) | La misma cabecera de la historia diaria y una lista con rayas finas | 1080 × 1920 | `placaUtiles`, `placaAgenda` |
| Espejo en Instagram de cada posteo de Facebook | Placa de noticia con foto (la foto del banco propio, la franja del color de la sección, título, bajada y el pie con la fecha); sin foto, Placa sin foto (el bloque de color con los anillos del radar y el nombre de la sección) | 1080 × 1350 | `web/lib/tarjeta.js` (`/nota/ID/instagram.png`) |
| Facebook con enlace, WhatsApp, la web al compartir | Una banda con el color de la sección y los anillos, el título y el pie; sin foto | 1200 × 630 | `web/lib/tarjeta.js` (`opengraph-image`) |
| La placa sin foto vertical | Placa sin foto, en 9:16 (hoy no la usa ninguna pieza fija) | 1080 × 1920 | `placaNoticia` |

Lo que no se usa del lienzo, por ahora: "Repaso · una nota por placa" y
"Repaso · cierre" son para un carrusel, y el repaso hoy es **un video**: se
tomó la tapa como placa del video sin cambiar cómo se publica. Tampoco el
sticker de enlace de la historia diaria (la API no lo pone).

**Las fotos.** La foto de una nota sólo aparece en el espejo de Instagram, y
sólo si está en el banco propio (`web/data/banco-fotos.json` →
`web/public/fotos-notas/`). Va recortada y **sin el crédito adentro**: nunca
el nombre de otro medio ni una marca de agua dentro de una imagen. El crédito
va al pie del posteo de Instagram (`conCreditoDeFoto`, `redes/elegir.mjs`) y
en la página de la nota. La imagen de Facebook (la del enlace) no lleva foto:
ese posteo no nombra fuentes (`CRITERIO-EDITORIAL.md` § 9). Un ejemplo de
cada pieza se arma con los datos de la portada en
`reels/salida/muestras-diseno-nuevo/` (no se versiona). Lo cuidan
`pruebas/placas.test.mjs` (mide con resvg cada renglón: nada se sale, nada
se pisa, nada cae en la zona que tapa la app, ningún título se corta) y
`pruebas/formatos.test.mjs`.

## Cuándo actualizar este documento

Cada vez que cambie un color, una tipografía, una medida o el criterio de
voz — o cuando se apruebe un nuevo rediseño de las piezas — para que la
próxima vez que haga falta cambiar de diseño, esté todo en un solo lugar.

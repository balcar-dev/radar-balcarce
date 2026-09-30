# El media kit: toda la identidad visual, en un solo lugar

*Actualizado el 29/09/2026.* Reúne lo que ya está definido en el código y en
otros documentos, para que un cambio de diseño no se olvide de ningún lugar
(lo pidió Hernán el 27/09). Cada dato vive en un solo lugar: acá se dice cuál.
No es el media kit para vender avisos (ése, con números de visitas, está por
hacerse: `PUBLICIDAD.md`).

## La identidad

- **Nombre:** Radar Balcarce. **Dominio:** `radarbalcarce.com`.
- **Quiénes lo hacen:** Hernán y Andrés, dos vecinos de Balcarce (`/quienes-somos`).
- **Contacto público:** WhatsApp 2266 51-1612 y `radarbalcarce@gmail.com`
  (`WHATSAPP` y `MAIL` en `web/lib/datos.js`).
- **El eslogan:** "Lo que pasa en Balcarce, la región y el país" (la portada de
  Facebook, `BAJADA` en `reels/portada.mjs`, y la descripción del sitio en
  `web/app/layout.js`).
- **La voz:** dos voces propias creadas con Gemini, una locutora y un locutor;
  cada pieza sale siempre con la misma. Cómo suenan, los saludos, los cierres y el
  reparto: `CRITERIO-REDES.md` (§ 2 y § 6).

## Los colores

**El de la marca:** rojo `#C7381C` (oscuro `#9C2B15`), el acento general.
**Nunca** en un aviso publicitario, para que no se confunda con contenido propio
(`PUBLICIDAD.md`).

**La web:** fondo blanco (`--papel`, `#FFFFFF`: un portal, no el crema de diario
viejo), crema `#F4F1EA` para recuadros, tinta `#14161A` para el texto, más líneas
y grises. Todo como variables en `web/app/globals.css`. **El sitio público no
tiene modo oscuro**; el panel del celular sí.

**La foto de perfil y la portada de Facebook** (`reels/avatar.mjs`,
`reels/portada.mjs`) son **azules**: fondo azul petróleo `#1D4F63` que se funde
en la tinta, "RADAR" en crema, "BALCARCE" y los anillos del radar en el rojo de la
marca y el punto del centro ámbar `#E8A33C`. El 28/09 se probaron en rojo y Hernán
prefirió las azules ("se ve mejor el contraste entre Radar y Balcarce").

**Las piezas de redes** (28/09): papel `#FAF8F3`, tinta `#14161A`, gris de bajadas
`#474C55`, rayas `#D9D4C7`. La tarjeta del clima es azul noche `#1B2733`
(recuadros `#26374A`, rótulos `#A9C2D9`, sol `#F2A93B`) y la de la farmacia lleva
borde verde `#13804A`. Viven en `COLORES` (`reels/placa.mjs`) y en
`web/lib/tarjeta-diseno.js`.

**Un color por sección**, el mismo en la web, las placas y las tarjetas para
compartir:

| Sección | Color |
|---|---|
| Balcarce | `#B91C1C` |
| Política | `#3730A3` |
| Policiales | `#831843` |
| Fútbol | `#7C3AED` |
| Deportes | `#0F766E` |
| Automovilismo | `#B45309` |
| Agro | `#5A6B0A` |
| Economía | `#8A6500` |
| Cultura y agenda | `#9D2C8F` |
| Tecnología | `#0B6FB8` |
| Argentina | `#4B5563` |

Viven en `--s-*` (`web/app/globals.css`; Argentina conserva la variable vieja
`--s-pais`), con los mismos valores en `reels/placa.mjs` y
`web/lib/tarjeta-diseno.js`: `pruebas/titulos-colores.test.mjs` controla que los
tres coincidan y que el blanco se lea encima. **El panel del celular tiene su
propia copia** (`web/public/panel/index.html`), que ninguna prueba controla: si se
cambia un color, cambiarlo también ahí.

**Los podcasts cambian de color según el día de la semana**, no según la sección
(`COLORES_DEL_DIA` y `colorDelDia` en `redes/piezas.mjs`): domingo magenta, lunes
el rojo de la marca, martes verde, miércoles azul, jueves ámbar, viernes violeta,
sábado verde azulado. El perfil de Instagram y Facebook no cambia: es siempre el
azul.

## La tipografía

Desde el 27/09: **Source Serif 4** en los títulos y la marca, e **Inter** en todo
lo demás (etiquetas, datos, cifras, texto). Antes eran Fraunces e IBM Plex Sans,
que en el celular se veían pesadas; se eligieron entre cuatro opciones probadas
con titulares reales (Fraunces, Newsreader, Source Serif 4 y Archivo). En la web
los titulares llevan `lining-nums proportional-nums` y las cifras,
`tabular-nums`. Nunca una cifra ni un nombre de servicio en la letra de los
títulos.

### El sistema tipográfico

Las tarjetas de servicio (clima, farmacia, dólar, agenda, buzón, números útiles) y
las páginas `/farmacias`, `/dolar`, `/agenda` y `/util` comparten **un** sistema,
con variables en `web/app/globals.css` (bloque "sistema tipográfico"). Nada de
tamaños sueltos: **cambiar un tamaño es cambiar la variable, no la tarjeta**
(`pruebas/tipografia.test.mjs`).

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
dato, en tinta): el rojo es el acento de las acciones. El puntito de estado
(`.punto-vivo`, 6px, verde) va a la izquierda de la etiqueta y sólo cuando el dato
está confirmado al día (la farmacia del día; el clima y el dólar cuando el
navegador ya consultó la fuente).

### Dónde están los archivos de letra

| Qué | De dónde salen las letras |
|---|---|
| La web | Google Fonts, pedidas en `web/app/layout.js` (Source Serif 4 de 600 a 900 e Inter de 400 a 700, con tamaño óptico). Servirlas desde el propio sitio, para que Google no vea la IP de cada lector, está en `PENDIENTES.md` (A9) |
| Las placas, el avatar, la portada de Facebook, las tarjetas para compartir y el espejo de Instagram | `reels/marca/fuentes/`: `SourceSerif4-700.ttf` y `-900.ttf` (el corte de 60 puntos) e `Inter-400.ttf` a `Inter-700.ttf`. Las tarjetas (`web/lib/tarjeta.js`) las leen de ahí desde el 29/09: la copia que había en `web/fuentes/` se borró y una prueba cuida que no vuelva |
| El panel de la PC, la vista de la guía comercial y la vista previa de la ingesta | Google Fonts (`panel/panel.html`, `panel/acceso.mjs`, `comercial/vista.plantilla.html`, `ingesta/ingesta.mjs`) |
| El panel del celular | Las letras del sistema del teléfono: no pide nada afuera de GitHub |

## Los íconos

Las medidas de cada uno están en [`FORMATOS.md`](FORMATOS.md).

| Qué | Archivo | Cómo se hace |
|---|---|---|
| El sitio (pestaña del navegador) y el panel del celular | `web/public/favicon.ico`, `icon-192.png`, `icon-512.png` | `web/scripts/hacer-iconos.mjs`: el radar crema sobre el rojo de la marca, con el punto ámbar. El panel del celular los usa desde su `manifest.webmanifest` |
| Apple (agregar a la pantalla de inicio) | `web/public/apple-touch-icon.png` | El mismo script |
| Perfil de Instagram y de Facebook (el mismo archivo) | `reels/salida/avatar.png` | `node reels/avatar.mjs`; lo sube una persona (`PERFILES.md`, "Cómo cargarlo") |

## Las medidas, la voz y los textos

- **Las medidas de imagen y video por red**, con sus zonas seguras y cómo se
  auditan: [`FORMATOS.md`](FORMATOS.md); los números, en `redes/formatos.mjs`.
- **Cómo suenan y qué dicen las piezas** (saludos, cierres, cuándo se dice la
  dirección del sitio, largos): [`CRITERIO-REDES.md`](CRITERIO-REDES.md) y
  `redes/guiones.mjs`.
- **Los textos de los perfiles:** [`PERFILES.md`](PERFILES.md).

## Las plantillas de las piezas (28/09)

El 28/09 todas las piezas pasaron al diseño que aprobó Hernán en el lienzo
**"Radar Balcarce · Plantillas redes"**: fondo papel, títulos grandes en Source
Serif 4, textos en Inter, la firma "Radar Balcarce" (Radar en tinta, Balcarce en
el rojo de la marca) y el color de cada sección como acento. Del lienzo **no** se
tomaron sus letras (Fraunces e IBM Plex: van las del proyecto) ni sus colores de
sección (van los de la web).

| Pieza | Plantilla del lienzo | Dónde se arma |
|---|---|---|
| Los tres podcasts (reel + historia) | Repaso · tapa: el nombre del podcast y la duración en el color del día, un título ("Tres noticias para empezar el día", "Tres cosas que pasaron hoy", "Lo que dejó el día") y la lista numerada de las notas, cada número en el color de su sección | `placaRepaso` (`reels/placa.mjs`), desde `reels/plan.mjs` |
| El clima de la mañana | Historia diaria: "Hoy en Balcarce", la fecha y la tarjeta oscura del clima (temperatura, cielo, sensación térmica y viento, hoy y los dos días que siguen). Sin dólar: si se mueve, sale como nota propia | `placaClima` |
| El clima de la noche | Historia diaria: "Cómo sigue el día", la tarjeta del clima (ahora, esta noche, mañana y pasado) y un recuadro con el pronóstico de mañana | `placaClima` |
| El aviso de clima | Historia diaria con un recuadro de borde rojo ("Qué hay que saber") | `placaClima` |
| La farmacia de turno | Historia diaria: la fecha y la tarjeta blanca con borde verde (nombre, dirección, teléfono) y hasta cuándo dura el turno | `placaFarmacia` |
| Teléfonos útiles y agenda | La misma cabecera de la historia diaria y una lista con rayas finas | `placaUtiles`, `placaAgenda` |
| Espejo en Instagram de cada posteo de Facebook | Placa de noticia con foto (la foto del banco, la franja del color de la sección, título, bajada y el pie con la fecha); sin foto, el bloque de color con los anillos del radar y el nombre de la sección | `web/lib/tarjeta.js` (`/nota/ID/instagram.png`) |
| Facebook con enlace, WhatsApp y la web al compartir | Con foto (`FOTO_EN_ENLACE`): la foto del banco a la izquierda y el título a la derecha; sin foto, una banda con el color de la sección y los anillos, el título y el pie | `web/lib/tarjeta.js` (`opengraph-image`) |

Lo que no se usa del lienzo, por ahora: "Repaso · una nota por placa" y "Repaso ·
cierre" son para un carrusel, y el repaso es **un video** (la tapa es su placa).
Tampoco el sticker de enlace de la historia diaria: la API no lo pone.

**Las fotos.** La foto de una nota va en la página de la nota, en el espejo de
Instagram y en la tarjeta para compartir el enlace, y sólo si está en el banco
propio (`web/data/banco-fotos.json` → `web/public/fotos-notas/`). Va recortada y
**sin el crédito adentro**: nunca el nombre de otro medio ni una marca de agua
dentro de una imagen. El crédito va en el epígrafe de la página y al pie del
posteo de Instagram (`conCreditoDeFoto`, `redes/elegir.mjs`); la tarjeta del
enlace lleva a la página, que tiene el epígrafe (`CRITERIO-EDITORIAL.md` § 2, "Las
fotos"; `docs/05-FOTOS.md`). Los videos siguen con placa.

Lo cuidan `pruebas/placas.test.mjs` (mide con resvg cada renglón: nada se sale,
nada se pisa, nada cae en la zona que tapa la app, ningún título se corta) y
`pruebas/formatos.test.mjs`. Un ejemplo de cada pieza, con los datos de la
portada, queda en `reels/salida/muestras-diseno-nuevo/` (no se versiona).

## Cuándo actualizar este documento

Cada vez que cambie un color, una letra, un ícono o una medida, o se apruebe un
rediseño de las piezas: así, la próxima vez que haga falta cambiar el diseño,
está todo en un solo lugar.

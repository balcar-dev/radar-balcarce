# Publicidad y monetización

*Actualizado el 25/09/2026.* Cómo se piensa ganar plata sin arruinar lo que
hace distinto al medio (una portada liviana, sin banners de terceros). Este
documento reúne lo que antes estaba repartido entre `REDES.md` y `IDEAS.md`.

## Dónde estamos

- **Los tres avisos fijos de la web están armados** y se cargan desde el panel
  (pestaña **Avisos**). **Falta el primer comercio.**
- Los precios **no están escritos a propósito**: hay que salir a preguntar qué
  paga hoy un comercio de Balcarce en la radio y en los otros medios, y arrancar
  por debajo. Se decide con la realidad, no acá.
- **Google AdSense se dejó para más adelante** (24/09). Ver el final.
- El hosting ya permite publicidad: Cloudflare Pages sí; Vercel Hobby no (por
  eso se mudó el 24/09).

## La competencia y su plata

Revisado el 18/09/2026 (detalle en `INVESTIGACION-COMPETENCIA.md`):

| | El Diario | Punto Nueve | La Vanguardia |
|---|---|---|---|
| Publicidad | Google AdSense | Google Ads | Sin banners |
| Peso de la portada | 256 KB | 370 KB | 55 KB |

**La Vanguardia** monetiza sin banners: vende *Edictos*, *Inmobiliarias*,
*Profesionales* e *Infocampo*. Son secciones pagas, no publicidad intrusiva.
Es el modelo más parecido al que nos sirve. Los otros dos cargan con redes
publicitarias, y eso pesa: nuestra portada es HTML estático y esa ventaja se
pierde el día que se meta publicidad mal.

## Los tres avisos de la web

Maqueta en el lienzo de diseño, artboard "Dónde irían los avisos".

- **Aviso 1** — después de la nota de apertura. El único que interrumpe la
  lectura, y lo hace una sola vez.
- **Aviso 2** — al lado del clima y la farmacia de turno. El mejor lugar del
  sitio: lo que la gente mira todos los días, sin interrumpir nada. Es el que
  se cobra más caro.
- **Aviso 3** — abajo de todo. Vale poco. Sirve para regalarlo los primeros
  meses y que un comercio se anime.

**Cómo se cargan:** panel → **Avisos**. Se completa comercio, texto y
opcionalmente un logo, por cada espacio. Se guarda en `web/data/avisos.json`
(lo lee `web/components/avisos.js`) y el panel lo sube solo a GitHub
(`panel/sincronizar.mjs`): en unos minutos está en la web. Requiere la PC
prendida (`PANEL.md`). Prueba: `pruebas/panel.test.mjs` ("son exactamente tres
espacios, los mismos que dibuja la web").

### Reglas que no se negocian

- Vendidos a comercios de Balcarce, no traídos por una red publicitaria.
  Sabemos quién es cada aviso.
- Quietos: no parpadean, no se expanden, no persiguen el scroll.
- Grises y con tipografía chica. **Nunca el rojo de la marca.** Si el aviso se
  ve igual que una nota, la gente deja de distinguir qué es qué.
- Dicen "Espacio publicitario" arriba, siempre.
- Texto y un logo, no imágenes pesadas.
- Nunca: pop-ups, videos que arrancan solos, publinotas sin aclarar que lo son,
  avisos de apuestas o de préstamos.
- **Un aviso no compra una nota.** Lo que se escribe sobre un anunciante sigue
  el mismo criterio que sobre cualquier otro.
- **Política y Policiales no llevan patrocinio** de nadie.
- **El auspiciante nunca habla por la voz sin que se sepa:** la mención dice
  "gracias a" o "presentado por", no simula ser una noticia.

## El orden en que lo haríamos

Cada escalón se apoya en el anterior y ninguno necesita más tráfico del que
va a haber en los primeros meses. Lo que se vende siempre es **lo mismo: que el
vecino los vea**, en el lugar donde ya mira.

| # | Qué se vende | Dónde vive | Estado |
|---|---|---|---|
| 1 | **Los 3 avisos fijos** de la web | `web/data/avisos.json`, panel → Avisos | Armado. Falta el primer comercio |
| 2 | **"El clima de hoy, presentado por…"**: mención en la historia del clima y de la farmacia, que son lo que más se mira | La voz lee un texto fijo; sumar una línea | Idea |
| 3 | **Mención en los podcasts** ("y esta mañana, gracias a…") | `redes/elegir.mjs`, un cierre distinto por auspiciante | Idea. Los 3 podcasts diarios ya existen |
| 4 | **La guía comercial y el mapa** | Sección nueva de la web, con datos de `comercial/` (`COMERCIAL.md`) | Propuesta |
| 5 | **Sorteos y marketing conjunto** entre comercios anotados | Historias y posteos | Propuesta |
| 6 | **Clasificados** y **empleo/changas** | Página nueva + formulario | Propuesta |
| 7 | **Resumen semanal por WhatsApp o mail** con un espacio patrocinado | "La semana en Balcarce" (`IDEAS.md`) | Propuesta |
| 8 | **Contenido patrocinado**, siempre marcado | Nota con etiqueta "Contenido patrocinado" | Con las reglas de arriba |
| 9 | **Pauta oficial** (vacunación, cortes de servicio) | Igual que un aviso | Depende de la relación con el municipio |
| 10 | **Socios lectores** (aporte voluntario mensual, tipo Cafecito) | Un botón | Cuando haya lectores que lo pidan |
| 11 | **AdSense** en un cuarto espacio | Script de Google | **Al final** |

**El catálogo comercial** (qué servicios se ofrecen a un comercio y con qué
mensaje) está en `comercial/propuestas.mjs` y se explica en `COMERCIAL.md`.

## Antes de vender nada

1. **Una página `/publicidad`** con los espacios, cómo se ven y un contacto
   (WhatsApp). Todavía no existe.
2. **Un media kit de una hoja** con números reales: visitas de Cloudflare Web
   Analytics, seguidores de Instagram y Facebook, alcance de los podcasts. Un
   comercio compra números, no promesas. Con los primeros 30 días de datos
   alcanza para arrancar.
3. **Preguntar precios** (ver arriba).

## Google AdSense: por qué no todavía

- Rinde poco en un pueblo, pesa y rompe la regla de "nada de terceros".
- Pide cuenta con datos fiscales, verificar el sitio, un archivo `ads.txt` (hoy
  no existe) y aprobación de días a semanas.
- Si algún día se hace, va en un cuarto espacio, aparte de los tres avisos
  propios. Pendiente registrado en `PENDIENTES.md` y `SEO.md`.

## Relacionado

`REDES.md` (los podcasts y las historias donde puede haber menciones),
`COMERCIAL.md` (a quién ofrecerle qué), `IDEAS.md` (guía comercial y contenido
propio), `PANEL.md`, `INVESTIGACION-COMPETENCIA.md`.

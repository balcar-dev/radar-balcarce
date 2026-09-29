# Publicidad y monetización

*Actualizado el 29/09/2026.* Cómo se piensa ganar plata sin arruinar lo que hace
distinto al medio: una portada liviana, sin banners de terceros. Lo que falta
hacer, con quién y qué urgencia, está en `PENDIENTES.md`.

## Dónde estamos

- **Los tres avisos fijos de la web están armados** (panel de la PC → Avisos; el
  del celular no los toca). **Falta el primer comercio.**
- **Los precios no están escritos, a propósito**: hay que preguntar qué paga hoy un
  comercio de Balcarce en la radio y en los otros medios, y arrancar por debajo.
- **Google AdSense** lo pidieron Hernán y Andrés; la cuenta no se abrió (abajo).
- El hosting lo permite: Cloudflare Pages sí; Vercel Hobby no (por eso el sitio se
  mudó el 24/09).

## La competencia y su plata

Revisado el 18/09 (`docs/historico/INVESTIGACION-COMPETENCIA.md`): El Diario usa
Google AdSense (portada de 256 KB), Punto Nueve Google Ads (370 KB) y **La
Vanguardia no tiene banners** (55 KB): vende secciones pagas (*Edictos*,
*Inmobiliarias*, *Profesionales*, *Infocampo*). Es el modelo más parecido al que
nos sirve. Nuestra portada es HTML estático, y esa ventaja se pierde el día que se
meta publicidad mal.

## Los tres avisos de la web

Maqueta en el lienzo de diseño, artboard "Dónde irían los avisos".

- **Aviso 1** (`apertura`): después de la nota de apertura. El único que
  interrumpe la lectura, y lo hace una sola vez.
- **Aviso 2** (`clima`): al lado del clima y la farmacia de turno. El mejor lugar
  del sitio, lo que la gente mira todos los días sin interrumpir nada: el que se
  cobra más caro.
- **Aviso 3** (`pie`): abajo de todo. Vale poco; sirve para regalarlo los primeros
  meses y que un comercio se anime.

**Cómo se cargan:** panel de la PC → **Avisos**: comercio, texto y, si se quiere,
un logo, por cada espacio (con el nombre vacío se borra). Se guarda en
`web/data/avisos.json` (lo lee `web/components/avisos.js`) y el panel lo sube solo
a GitHub (`panel/sincronizar.mjs`): en unos minutos está en la web. Requiere la PC
prendida (`docs/09-PANEL.md`). Prueba: `pruebas/panel.test.mjs` ("son exactamente
tres espacios, los mismos que dibuja la web").

### Reglas que no se negocian

- Vendidos a comercios de Balcarce, no traídos por una red publicitaria: sabemos
  quién es cada aviso.
- Quietos: no parpadean, no se expanden, no persiguen el scroll.
- Grises y con letra chica. **Nunca el rojo de la marca**: si el aviso se ve igual
  que una nota, la gente deja de distinguir qué es qué.
- Dicen "Espacio publicitario" arriba, siempre.
- Texto y un logo, no imágenes pesadas.
- Nunca: ventanas emergentes, videos que arrancan solos, publinotas sin aclarar
  que lo son, avisos de apuestas o de préstamos.
- **Un aviso no compra una nota.** Lo que se escribe sobre un anunciante sigue el
  mismo criterio que sobre cualquier otro.
- **Política y Policiales no llevan patrocinio** de nadie.
- **El auspiciante nunca habla por la voz sin que se sepa:** la mención dice
  "gracias a" o "presentado por"; no simula ser una noticia.

## El orden en que lo haríamos

Cada escalón se apoya en el anterior y ninguno necesita más tráfico del que va a
haber en los primeros meses. Lo que se vende es siempre **lo mismo: que el vecino
los vea**, en el lugar donde ya mira.

| # | Qué se vende | Dónde vive | Estado |
|---|---|---|---|
| 1 | **Los 3 avisos fijos** de la web | `web/data/avisos.json`, panel → Avisos | Armado. Falta el primer comercio |
| 2 | **"El clima de hoy, presentado por…"**: una mención en la historia del clima y en la de la farmacia, que son lo que más se mira | Una línea más en lo que lee la voz | Idea |
| 3 | **Mención en los podcasts** ("y esta mañana, gracias a…") | `redes/elegir.mjs`, un cierre distinto por auspiciante | Idea. Los 3 podcasts diarios ya salen |
| 4 | **La guía comercial y el mapa** | Sección nueva de la web, con los datos de `comercial/` (`COMERCIAL.md`) | Propuesta |
| 5 | **Sorteos y marketing conjunto** entre comercios anotados | Historias y posteos | Propuesta |
| 6 | **Clasificados** y **empleo o changas** | Página nueva y un formulario | Propuesta |
| 7 | **Resumen semanal por WhatsApp o correo** con un espacio patrocinado | "La semana en Balcarce" (`IDEAS.md`) | Propuesta |
| 8 | **Contenido patrocinado**, siempre marcado | Nota con la etiqueta "Contenido patrocinado" | Con las reglas de arriba |
| 9 | **Pauta oficial** (vacunación, cortes de servicio) | Igual que un aviso | Depende de la relación con el municipio |
| 10 | **Socios lectores** (aporte voluntario mensual, tipo Cafecito) | Un botón | Cuando haya lectores que lo pidan |
| 11 | **AdSense**, en un cuarto espacio | Un script de Google | Falta abrir la cuenta y el `ads.txt` |

Qué servicios se le ofrecen a un comercio, y con qué mensaje: `CATALOGO` y
`OFERTAS` en `comercial/propuestas.mjs`, explicados en `COMERCIAL.md`.

## Antes de vender nada

1. **Una página `/publicidad`** con los espacios, cómo se ven y un contacto (el
   WhatsApp del medio, 2266 51-1612). Todavía no existe.
2. **Un media kit de venta, de una hoja**, con números reales: visitas de
   Cloudflare Web Analytics, seguidores de Instagram y Facebook, alcance de los
   podcasts. Un comercio compra números, no promesas; con los primeros 30 días de
   datos alcanza. (No confundir con `MEDIA-KIT.md`, que es la identidad visual.)
3. **Preguntar precios** (arriba).

## Google AdSense

Lo que falta, en orden: (1) que una persona abra la cuenta (pide datos fiscales) y
pida la revisión; (2) el `ads.txt` con el ID de editor que da AdSense (sin ese ID
no se puede armar); (3) sostener las notas con cuerpo: una nota automática sin
cuerpo no se publica (desde el 25/09), y AdSense rechaza los sitios con poco
contenido propio. "Quiénes somos", "Contacto" y la política de privacidad ya
están; la aprobación tarda de días a semanas.

En un pueblo rinde poco, pesa y rompe la regla de "nada de terceros": por eso va
en un cuarto espacio, aparte de los tres avisos propios.

## Relacionado

`docs/07-REDES.md` (los podcasts y las historias donde puede haber menciones),
`COMERCIAL.md` (a quién ofrecerle qué), `IDEAS.md` (guía comercial, clasificados y
contenido propio), `docs/09-PANEL.md`, `docs/historico/INVESTIGACION-COMPETENCIA.md`.

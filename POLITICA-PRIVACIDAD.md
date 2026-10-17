# Política de privacidad: lo interno

*Actualizado el 17/10/2026.* **El texto público vive en un solo lugar: la página
`/politica-de-privacidad`** (`web/app/politica-de-privacidad/page.js`). Si hay que
cambiar lo que lee el público, se cambia ahí. Acá queda lo interno: qué se hace con
lo que manda la gente, qué ven otros servicios de cada lector y qué guarda el
panel del celular. El marco legal (ley 25.326), en `INVESTIGACION.md`, sección 5.

## Por dónde llega lo que manda la gente

No hay formulario en el sitio. La gente escribe por **WhatsApp** (2266 51-1612) o
por **correo** (`contacto@radarbalcarce.com`), desde el pie de cada página, la
tarjeta "¿Viste algo en el barrio?" y las invitaciones de la web
(`web/components/piezas.js`). Lo que llega se trata con uno de cuatro tipos: dato,
reclamo, opinión o seguimiento.

## Qué se guarda y dónde

- Lo que manda la gente **se queda donde llegó** (el WhatsApp del medio y el correo):
  no se copia al repositorio, que es público. Hasta el 17/10/2026 se podía cargar en
  el buzón del panel de la PC (en esa PC, fuera de git); ese panel se retiró sin
  haberse usado. Si en esa PC quedó la carpeta `panel/datos/` o `respaldos/`, se
  borra a mano.
- Los contactos propios del panel del celular (a quién se le escribió para pedir
  fechas) viajan **cifrados** (`web/data/contactos-celular.json`, `panel/cifrado.mjs`):
  en el repositorio no se lee ningún nombre ni teléfono.

## Qué se hace con eso

- Se usa para verificar antes de publicar y para armar la nota, el reclamo o el
  seguimiento que pidieron. Nunca para otra cosa ni se comparte con nadie.
- **El teléfono nunca se publica.** El nombre, sólo con autorización explícita; si
  pidió anonimato, se respeta. La opinión va siempre firmada con nombre real.
- **Un reclamo nunca sale de un solo lado**: antes se le pide su versión a la otra
  parte y se anota en la entrada (`respuestaOtraParte`).
- **Si alguien pide que borremos sus datos**, se borran el mensaje y, si lo hay, su
  contacto propio en el celular. Una nota ya publicada no se borra por eso: se
  resuelve aparte.

## Qué ven otros servicios de cada lector

El sitio no usa cookies ni Google Analytics: las visitas las cuenta Cloudflare Web
Analytics, sin cookies (Cloudflare es además donde vive el sitio, así que ve cada
visita). Pero el navegador de cada lector le pide cosas a otros tres servicios, y
**cada uno recibe la dirección IP del lector** y que viene de `radarbalcarce.com`
(no qué nota lee: la `Referrer-Policy` de `web/public/_headers` manda sólo el
dominio):

| Servicio | Para qué | Cuándo | Dónde está en el código |
|---|---|---|---|
| **Tipografías** | Las letras de la web, ahora en el propio sitio (desde el 8/10/2026: antes se pedían a Google Fonts) | Ya no se le manda nada a Google por las letras | `web/public/fuentes/`, `web/app/globals.css` |
| **Open-Meteo** | El clima al momento | En cada página (el clima de arriba), y cada 10 minutos mientras está abierta | `web/lib/pedir-clima.js` |
| **DolarApi.com** (y **Bluelytics**, si DolarApi no contesta) | El dólar al momento | En la portada y en `/dolar`, y cada 5 minutos mientras está abierta | `web/lib/dolar.js`, `web/components/usar-dolar.js` |

**La página pública todavía no lo dice** (`PENDIENTES.md`, A9). Hay que sumarle
una sección que nombre esos tres servicios, diga que reciben la IP del lector para
poder mandarle las letras, el clima y el dólar, y que el sitio no les manda nada
más. Servir las letras desde el propio sitio sacaría a Google de la lista.

## El panel del celular

`radarbalcarce.com/panel/` lo usa **sólo la redacción** (Hernán y Andrés): no es
para lectores, no se indexa y no junta datos de nadie. Qué guarda y dónde:

- **La llave de GitHub** de quien lo usa, y el nombre que escribió, quedan
  guardados **sólo en ese celular** (el almacenamiento del navegador). La llave
  privada que descifra lo que espera a una persona también vive sólo ahí
  (IndexedDB) y no sale nunca del teléfono. "Salir y borrar la llave de este
  celular" borra todo.
- El panel **sólo puede hablar con GitHub**: su política de seguridad
  (`web/public/_headers`) no le deja cargar nada de otro lado.
- **Lo que espera a una persona viaja cifrado**, porque el repositorio es público
  y esas notas pueden nombrar a un acusado o a un chico
  (`web/data/celular-pendientes.json`, `web/data/celular-borradores.json`).
- **Lo que sí queda a la vista en el repositorio público:** la llave pública de
  cada celular con el nombre "Celular de …" (`web/data/celular-llaves.json`), las
  decisiones con el nombre de quien las tomó y el pedido que se le escribe a la IA
  en "Escribir con IA" (el celular avisa: no poner nombres).

Cómo se instala y se usa: `docs/09-PANEL.md` y `docs/11-OPERACION.md`.

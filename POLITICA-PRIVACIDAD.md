# Política de privacidad: lo interno

*Actualizado el 28/09/2026.* **El texto público vive en un solo lugar: la
página `/politica-de-privacidad`** (`web/app/politica-de-privacidad/page.js`).
Si hay que cambiar lo que lee el público, se cambia ahí; este documento ya no
es una copia de la página. Acá queda sólo lo interno: qué se hace con lo que
manda la gente. El marco legal (Ley 25.326), en `INVESTIGACION.md`, sección 5.

## Por dónde llega

No hay formulario en el sitio. La gente escribe por **WhatsApp** o por
**mail** (la tarjeta "¿Viste algo en el barrio?" y las invitaciones de la web,
`web/components/piezas.js`). Lo que sirve se carga **a mano** en el buzón del
panel (pestaña Buzón), con uno de cuatro tipos: dato, reclamo, opinión o
seguimiento (`panel/buzon.mjs`, con la regla de cada uno).

## Qué se guarda y dónde

- Cada entrada guarda el texto, el tipo, el nombre y el teléfono de contacto
  (si los dio), si pidió anonimato, quién la cargó y cuándo
  (`panel/servidor.mjs`, `/api/buzon`).
- Vive **sólo en la PC del panel** (`panel/datos/`, fuera de git). No va a
  GitHub ni a la web: `web/data/decisiones.json` exporta sólo las decisiones
  editoriales, nunca el buzón, el historial ni los contactos.
- La copia de seguridad (`panel/respaldo.mjs`) sí lo incluye; por eso la
  carpeta de respaldo no va a GitHub.

## Qué se hace con eso

- Se usa para verificar antes de publicar y para armar la nota, el reclamo o
  el seguimiento que pidieron. Nunca para otra cosa ni se comparte con nadie.
- **El teléfono nunca se publica.** El nombre, sólo con autorización
  explícita; si pidió anonimato, se respeta. La opinión va siempre firmada con
  nombre real.
- **Un reclamo nunca sale de un solo lado**: antes se le pide su versión a la
  otra parte y se anota en la entrada (`respuestaOtraParte`).
- **Si alguien pide que borremos sus datos**, se borra la entrada desde el
  panel (pestaña Buzón → Borrar). Una nota ya publicada no se borra por eso: se
  resuelve aparte. Las copias viejas del respaldo se van renovando solas (se
  guardan las últimas 14).

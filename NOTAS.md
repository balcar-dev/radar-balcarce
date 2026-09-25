# Notas: decisiones vigentes

*Actualizado el 25/09/2026.* El historial completo de cómo se llegó hasta acá
(con fecha, error y arreglo) está en [`HISTORIA.md`](HISTORIA.md), tal como
estaba en este archivo hasta el 24/09/2026. Lo que **falta** está en
[`PENDIENTES.md`](PENDIENTES.md); lo que **se exige siempre**, en
[`REGLAS.md`](REGLAS.md). Acá van sólo las decisiones que siguen valiendo.

## Editorial

- **Tecnología como sello propio.** Ningún medio de Balcarce la cubre con
  regularidad y conecta con la identidad del pueblo (el INTA Balcarce es uno
  de los centros de investigación agropecuaria más grandes del país).
- **Qué sección enfocar se decide con números**, no a ojo: cuando la analítica
  tenga tráfico (`PENDIENTES.md`, sección D).
- **Archivado a las 72 horas.** Lo que nadie decide se archiva solo (pestaña
  Archivadas); no se borra. Las notas sin fecha real quedan exentas.
- **El buzón tiene cuatro tipos**: dato, reclamo, opinión y seguimiento
  (`panel/buzon.mjs`). Un reclamo **nunca se publica de un solo lado**: se le
  pregunta a la otra parte. Una opinión va siempre firmada con nombre real.
- **Lo legal ya está aplicado** (`INVESTIGACION.md`): política de privacidad
  publicada, doctrina Campillay en el prompt, menores y víctimas en rojo.
  No hace falta trámite en ENACOM mientras no haya una radio con señal.
- **Sin fúnebres** (sin fuente oficial), **sin comentarios**, **sin
  transmisiones en vivo largas**: ver `INVESTIGACION-COMPETENCIA.md`.

## Fuentes

- Hay **33 fuentes**. Las que no entran y por qué (MinutoBalcarce, La Capital,
  0223, La Noticia 1, las radios que sólo existen en Facebook) están en
  `HISTORIA.md` § 3. **Scrapear Facebook no se hace**: va contra sus términos.
- El cronograma de farmacias se cruza contra La Vanguardia y Radio Gabal antes
  de publicar. "San José Plaza" no tiene dirección en el directorio del
  Colegio y se carga a mano.

## Técnico

- **Modelo de reescritura:** `gemini-flash-lite-latest`. `gemini-flash-latest`
  daba 503 de alta demanda de forma persistente; si vuelve a fallar seguido,
  es el primer lugar donde mirar.
- **Respaldo del clima:** si Open-Meteo falla, entra `api.met.no` (gratis, sin
  clave). No da sensación térmica: no se inventa.
- **Las imágenes de Gemini** necesitan facturación; la voz tiene un cupo
  gratis, pero la clave de redes es paga.
- **Sin música en las piezas**: sonaba a pitido. Sólo la cortina de sonido.
- **El motor no tiene dependencias** y una prueba lo vigila.
- **Los scripts de `reels/` que dependen de red o de binarios pesados** no
  tienen prueba a propósito; la lógica pura que tenían adentro sí.

## Cómo correr todo

- `ARRANCAR.bat` levanta el panel (puerto 4321) y la web local (3000). La
  web pública **no** corre en la PC: está en Cloudflare Pages.
- La clave de Gemini va en `.env`, nunca en el código ni en un chat.
- Cada cambio en `ingesta/`, `panel/` o `reels/` exige reiniciar el panel.

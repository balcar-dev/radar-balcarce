# Dónde seguimos (traspaso del 8/10/2026, a la tarde)

*Para quien siga desde la PC (Hernán, Andrés o la otra sesión de Claude). Está escrito para leerse en cinco minutos. El detalle de cada
cosa está en [`PRIORIDADES.md`](PRIORIDADES.md) (la lista en orden, con lo hecho en "Avance") y en [`MEJORAS.md`](MEJORAS.md) (cada punto,
marcado ✔ cuando está hecho). Todo lo de este documento ya está subido a `main`.*

> **Mapa por frentes y etapas (8/10, noche): [`PLAN-INTEGRAL.md`](PLAN-INTEGRAL.md).**

## Cómo arrancar en la PC

1. `git pull` en la carpeta del proyecto (para traer todo y lo que haya guardado el robot).
2. Correr `npm test`: tienen que pasar todas (hoy son 1.916; en Node 22 hay 6 "canceladas" por tiempo, en GitHub con Node 24 no pasa).
3. Abrir `CLAUDE.md` (las reglas que no se negocian) y este documento. La próxima regla a numerar es la **154**
   (las reglas 108 a 141 se escribieron en esta tanda, en `docs/10-REGLAS-Y-PRUEBAS.md`).
4. Para subir algo: `git pull --rebase`, `npm test`, commit y push. El robot de GitHub guarda `web/data/` cada media hora: si choca,
   `git checkout --theirs` sobre esos archivos y seguir. Borrar `web/out` y `web/.next` después de compilar en la PC (si no, fallan unas pruebas).

## Qué se hizo hoy (resumen, todo en `main`, con sus pruebas)

- **Primero lo que estaba mal publicado o rompía la web:** la corrección automática de la auditoría ya no estira ni cambia textos; la
  prueba que congelaba la web los lunes; la foto de Policiales; un archivo de datos roto ya no se lee como vacío; el histórico por mes
  guarda lo que sale del archivo.
- **Semáforo mejorado** (autorizado): más formas de rojo y de muerte, la edad de menores, avisos fúnebres siempre "nunca"; lo rojo no
  sale ni aprobado con el texto que lo puso en rojo; la lista roja tiene "huella" en una prueba. Nada de lo ya publicado cambió de color.
- **Redes:** memoria de voces (no se gasta el cupo dos veces), tope de edad de la portada, aviso de helada corregido, **mismo volumen en
  todas las voces**, el control de textos corre **antes** de gastar la voz, la lista de medios que no se nombran sale de las fuentes,
  el contrato del día y el vigilante miran también efeméride, feriado, Participá y avisos, y **reintentar no sube una pieza fuera de hora**.
- **Web y datos:** direcciones viejas de notas unidas ya no dan 404; una foto reemplazada lleva nombre nuevo (no se ve la vieja una semana);
  si casi todas las fuentes fallan, la web no se rearma con eso; el clima de respaldo no inventa "0 % de lluvia".
- **Pistas y panel del celular:** las pistas que salen solas no gastan toda la búsqueda; el robot **no pisa lo que decidió una persona**
  (se unen los cambios); un pedido que GitHub cancela **se vuelve a pedir solo**; pantalla **Hoy**, pestaña **Borradores** y "Su recorrido"
  en cada nota (el panel de la PC queda en desuso; el único panel es el del celular).
- **Respaldo y fotos:** workflow de respaldo semanal y de fotos a R2, listos para encenderse (ver "Los pasos de ustedes").

## Lo que sigue y quién lo hace

### Lo que puede hacer Claude (en orden de conveniencia)

1. **Panel del celular:** el calendario de la pestaña Fechas y una lista de sólo lectura de lo frenado en rojo (con su motivo). Está dibujado
   en `material/panel-nuevo-maqueta.html` y explicado en [`PANEL-NUEVO.md`](PANEL-NUEVO.md).
2. **#50 (P-3):** que el texto de las pistas viaje cifrado (hoy queda en un archivo público). Es lo más delicado de lo que queda: un día de trabajo.
3. **#52:** el WhatsApp de las 21 con los cambios de código del día y qué decidió cada persona. **#55:** auditoría de fotos con IA.
4. **#51 (resto de P-4):** contar los créditos de búsqueda en el WhatsApp.
5. **#34, #35, #36 (Google):** la fecha que va a Google, "Balcarce" en las notas locales y la foto en tres proporciones. Conviene
   hablarlo antes con Hernán y Andrés porque cambia lo que Google muestra.
6. **#40:** títulos de la pestaña enteros (hoy 60 caracteres, decisión del 29/09: preguntar si se cambia).

### Lo que necesita decisión de Hernán y Andrés

- **C-2** seguridad del panel (los detalles están sólo en la pestaña Privado de la página privada, no en el repositorio).
- **C-8** pasar a lugar privado el seguimiento comercial antes del primer mensaje a un comercio.
- **C-11** pistas solas con medios argentinos: definir cuáles medios cuentan.
- **#38 y #42:** la firma de lo que escribe Claude y la regla contra títulos sensacionalistas.
- **Línea editorial** centro / centro-derecha neutral (hay un borrador sin aplicar) y **"Quiénes somos"** con los nombres (en una o dos semanas).
- **Videos animados y locución con memoria del día:** ya aprobados; se repasan juntos "la semana que viene".
- **Etapa 2 de datos:** elegir R2 por mes o D1 **antes de diciembre** (se llega a las 3.500 notas alrededor del 2/12).

### Los pasos de ustedes (están en [`PASOS-PARA-USTEDES.md`](PASOS-PARA-USTEDES.md))

GitLab (cuenta y token para el espejo), Cloudflare R2 (depósitos `radar-respaldos` y `radar-fotos`, dominio `fotos.radarbalcarce.com`, las
variables y el token), Bing / IndexNow, aprobar que corran los pull requests de afuera, y mirar una vez por semana Search Console.
**Nunca pegar claves en un chat ni en el código**: van a GitHub Secrets.

## Fechas que vienen

| Cuándo | Qué |
|---|---|
| Lunes 12/10 | Feriado. Es lunes: la poda de retiradas corre (ya se probó que la prueba la acepta vacía) |
| 19/10 | Ubuntu 26 (los robots están fijos en Ubuntu 24.04; probar uno a propósito antes de pasar) |
| 19 al 23/10 | Juegos Bonaerenses (lista de finalistas de Balcarce: la carga una persona) |
| 20/10 | Armar las efemérides de noviembre (el mes armado se aprueba en la pestaña Fechas) |
| 21/10 | Fin de parches de Next 15. **No se pasó a Next 16**: exporta 2,4 veces más archivos y el límite de Cloudflare Pages es 20.000 por despliegue (regla 148). Las páginas ya están listas; se pasa cuando haya menos archivos por página |
| 25/10 | Decidir las piezas fijas de Participá (vencen el 31/10) |
| 15/12 | Recordatorio de revisión general |

## Cosas a vigilar los próximos días

- **La corrida de "Actualizar la web"** (cada media hora): tiene que seguir en verde. Si falla con el mensaje "Ingesta casi vacía", no
  es un error del código: casi todas las fuentes no contestaron (se reintenta sola a la media hora).
- **El vigilante de WhatsApp** ahora avisa también si no sale la efeméride, el feriado, una pieza de Participá o un aviso de clima
  (nivel medio). Si un día hubo más de ocho historias, el tope pudo sacarla a propósito.
- **Las notas que sacan cuerpo** después del cambio de reglas de la IA del 29/09 (mirar unos días).
- **Panel del celular:** se actualizó (versión de caché 22). Si algo se ve viejo, cerrar y abrir el panel o recargar una vez.

## Reglas para no romper nada (resumen)

No tocar la lista roja del semáforo sin preguntar (hay una prueba con huella). Política y Policiales esperan a una persona en las redes.
Nunca identificar a un menor o una víctima. Las listas de sepelios y necrológicas no salen nunca. Cuando se arregla algo mal publicado,
se escribe una prueba con el caso real y se anota la regla nueva en `docs/10-REGLAS-Y-PRUEBAS.md`. Detalles de seguridad y plata: sólo
en la página privada, nunca en este repositorio (es público).

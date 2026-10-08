# El panel nuevo (reemplaza al de la PC)

*8/10/2026. **Decisión de Hernán y Andrés:** el panel de la PC se hace de nuevo. Este documento fija qué se hace con cada pestaña del viejo,
en qué orden, y qué reglas tiene que cumplir el nuevo. Nada de esto está construido todavía; lo que sí está hecho es lo que lo
habilita (ver "Ya hecho"). La maqueta para mirar: [`material/panel-nuevo-maqueta.html`](material/panel-nuevo-maqueta.html).*

## Actualización del 8/10 (tarde): el panel de la PC no se usó nunca

Hernán y Andrés confirmaron que **sólo usan el del celular o lo abren online**. Por eso el panel nuevo **no es un panel nuevo desde cero**:
es el del celular, mejorado, y el de la PC queda en desuso (no se borra todavía; se retira cuando se confirme que nada depende de él).
Se decidió **no portar** Fuentes, Calendario, Agenda, Buzón ni Avisos del panel de la PC, porque nadie los usó: si más adelante hacen falta,
se piden y se hacen en el celular.

**Hecho el 8/10:** la pantalla **Hoy** (primera de la barra; lo que espera tu toque, cómo viene el día) y Fotos pasó a Más ([regla 125](../10-REGLAS-Y-PRUEBAS.md)); la pestaña **Borradores** (todo lo que se le pidió a la IA, con lo ya resuelto; [regla 126](../10-REGLAS-Y-PRUEBAS.md)).
**Hecho también:** "Su recorrido" en cada nota ([regla 127](../10-REGLAS-Y-PRUEBAS.md)) y el **calendario del mes** en Fechas ([regla 144](../10-REGLAS-Y-PRUEBAS.md)); falta la lista de lo frenado en rojo, que pide un archivo cifrado nuevo (sus títulos hablan de víctimas y menores y el repositorio es público).
**Sigue (se va mejorando de a poco):** (el recorrido de una nota ya está)
(entró de qué medios, esperó, la IA escribió, quién la aprobó, dónde salió), el **calendario de Fechas** y una lista de sólo lectura de lo **frenado en rojo**
con su motivo. Todas están dibujadas en [`material/panel-nuevo-maqueta.html`](material/panel-nuevo-maqueta.html).

## La decisión, en una frase

Un **solo panel** (una aplicación que se instala en el celular y también se abre en la PC), separado del sitio público, que reemplaza al
panel de la PC (`panel/servidor.mjs`, puerto 4321) y al del celular actual (`web/public/panel/`). El panel de la PC viejo **se congela**:
no se le agregan funciones y no se borra hasta que el nuevo cubra todo.

## Reglas que tiene que cumplir (las que ya decidieron)

1. **Nunca decide si algo sale ni si las pruebas pasan.** El semáforo, las reglas y las pruebas mandan; el panel sólo registra lo que
   decide una persona (aprobar, descartar, retirar, corregir) y lo muestra con claridad.
2. **Nada sensible en un repositorio público**: lo que espera a una persona viaja cifrado, como hoy. Y ninguna llave de GitHub en el
   celular una vez que haya un servicio de por medio (ver C-2 en la página privada).
3. **Un panel, una forma de decir las cosas**: castellano rioplatense claro, sin jerga (Hernán y Andrés no programan).
4. **Lo delicado se lee antes de publicar** (regla 120) y lo rojo no sale con el texto que lo puso en rojo (regla 119).
5. **Funciona con la PC apagada** (hoy el celular ya lo hace; el de la PC no).
6. **Una pestaña por cosa que se hace**, no una por cosa que existe.

## Qué pasa con cada pestaña del panel de la PC

| Pestaña de la PC | Ya está en el celular | Qué falta para el panel nuevo |
|---|---|---|
| Para decidir | Sí (Esperan) | — |
| Publicadas / Descartadas / Archivadas | Sí (Publicadas, Retiradas) | Que se vea de un vistazo lo que salió solo y lo que aprobó una persona |
| Frenadas (rojo) | No (a propósito: no se aprueban) | Una lista de sólo lectura con el motivo, para entender por qué no salió algo (útil para los falsos positivos) |
| **Fuentes** (peso, pausar, sumar y probar) | **No** | **Lo más pedido que falta.** En la nube las fuentes salen de `ingesta/fuentes.mjs` (lo que se pausa en el panel de la PC no llega ahí); el panel nuevo lo escribiría en un archivo de datos que lea la ingesta |
| Clima y farmacias | Parcial | Sólo mirar: alcanza con una tarjeta |
| **Agenda** (cargar eventos, fiestas anuales, a quién pedirle fechas) | Parcial (Contactos) | Cargar un evento con fecha, lugar y enlace; ver los de la semana |
| **Calendario** (horario de cada historia) | No | Hoy sólo rige en la PC; los horarios de la nube son los de fábrica. El nuevo tiene que escribirlos donde los lean los robots |
| Para redes | Sí (estado de las piezas) | Bajar el video de una pieza armada |
| **Buzón** (lo que manda la gente) | No | Cargar un dato o reclamo, cambiarle el estado, anotar la respuesta. Un reclamo nunca se publica de un solo lado |
| **Avisos** (los tres espacios publicitarios) | No | Cargar nombre, texto y logo; con el nombre vacío se borra |
| Cómo escribe la IA | No | Sólo mirar el criterio vigente |

Lo que el celular tiene y la PC no: Fotos, Revisión (auditoría con IA), Pistas, Fechas (efemérides y feriados), Números, Contactos.

## Orden de construcción

1. **Diseño** con la maqueta, pestaña por pestaña (Hernán y Andrés dicen qué usan de verdad y qué no): 1 reunión corta.
2. **Fuentes y Calendario** primero: son lo que hoy obliga a abrir la PC.
3. **Agenda, Buzón y Avisos.**
4. **Separar el panel del sitio** (otra dirección, por ejemplo `panel.radarbalcarce.com`, con acceso protegido por Cloudflare Access, que es
   gratis hasta 50 personas) y sacar la llave de GitHub del celular. Es la solución de fondo de C-2.
5. **Apagar el panel de la PC.** Se borra `panel/servidor.mjs` sólo cuando no quede ninguna función que dependa de él.

## Qué se necesita

- Que la etapa 2 de datos esté hecha (los datos que cambian siempre fuera de git, ver
  [`registro/AUDITORIA-EXTERNA-4-ARQUITECTURA-2026-10-08.md`](registro/AUDITORIA-EXTERNA-4-ARQUITECTURA-2026-10-08.md)) **o** aceptar que el panel
  nuevo siga escribiendo en el repositorio por ahora (es lo más rápido, y lo que hace hoy el del celular).
- Dos horas de Hernán y Andrés para el punto 1.

## Ya hecho (8/10)

- "Publicar" ya no saca solo un tema delicado (regla 120) y lo rojo no sale aprobado (regla 119): dos reglas que el panel nuevo hereda.
- Las pruebas ya no dependen de lo que toquen desde el panel (regla 112): se puede rehacer sin miedo a congelar la web.
- Lo que falla hoy en el panel del celular está anotado en `MEJORAS.md` (por ejemplo R-2, pedidos que se cancelan solos) y la seguridad (C-2) en la página privada.

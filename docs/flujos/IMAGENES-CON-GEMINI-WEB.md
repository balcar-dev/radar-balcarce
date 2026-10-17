# Flujo: ilustrar con Gemini web las notas sin foto — DESACTIVADO

*Desactivado el 17/10/2026 (regla 206, `docs/10-REGLAS-Y-PRUEBAS.md`). No se usa más. El detalle de cómo era está en el historial de git
de este archivo.*

## Por qué

La auditoría de fotos del 16/10/2026 (`docs/auditoria-2-0/03-FOTOS.md`, § 3.5 y hallazgo 5) miró las seis ilustraciones hechas a mano con
Gemini web (Claude manejando el Chrome de la PC, a las 10:00 y a las 18:00) y **cinco rompían las reglas propias**: texto legible
(«CARAVANA DE LA ALEGRÍA», «PLANILLA DE COMPETENCIA - JUEGOS BONAERENSES», «ENTREVISTA 10 AM - CASO PLAGUICIDAS»), marcas (Spalding,
Sennheiser) y gente de fondo (una pista llena de chicos). Además dependía de la PC prendida y manejar la web de Gemini con un robot es zona
gris de los términos de Google. Los dueños pidieron un solo camino claro y sin costo.

## Qué queda

- **Un solo camino:** «Ilustrar notas sin foto» (`web/scripts/ilustrar-notas.mjs`), automático cada 2 horas con Cloudflare (SDXL, gratis) y el
  control con visión (`docs/05-FOTOS.md`, § 12).
- **Las de Gemini web que ya estaban** pasan por el mismo control la próxima vez que su nota entra en una revisión: si pasan, quedan; si no,
  se reemplazan por la automática o se sacan. Las cinco que la auditoría vio mal las saca el script del 17/10
  (`web/scripts/arreglar-fotos-17-10.mjs`, `docs/05-FOTOS.md`, § 14).

## Lo que tiene que hacer una persona

- **Apagar la tarea programada de la PC** que corría este flujo a las 10:00 y a las 18:00 (en la app de Claude, la lista de tareas
  programadas). No se borró desde acá: hay que pausarla o borrarla a mano.

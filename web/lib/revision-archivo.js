// Lo que los demás leen de la revisión del archivo (regla 212, web/data/revision-archivo.json; la hace web/scripts/revisar-archivo.mjs).
// Sin dependencias: lo usan generar-datos (las retiradas y las repetidas), «Ilustrar notas sin foto» (las notas que quedaron sin foto) y el
// informe diario por mail (redes/informe-diario.mjs, que no puede depender de nada de afuera de Node).

/** Quién firma lo que hace la revisión (`por`). */
export const POR_LA_REVISION = 'revisión del archivo';

/**
 * Los ids que retiró la revisión. generar-datos los suma a lo retirado a mano en cada vuelta y esta lista NO se poda (la de
 * retiradas.json pierde los lunes lo de más de una semana): una nota retirada por la revisión no vuelve aunque un feed la traiga otra vez.
 * Cada una tiene que tener motivo y `por`; con un archivo vacío o roto, ninguna.
 */
export function idsRetiradosPorLaRevision(json) {
  const r = json && typeof json === 'object' ? json.retiradas : null;
  if (!r || typeof r !== 'object') return new Set();
  return new Set(Object.keys(r).filter((id) => r[id]?.motivo && r[id]?.por));
}

/** Las parejas [laQueQueda, laCopia] que encontró la revisión: generar-datos las une como las que confirma la IA (la copia redirige). */
export function parejasDeLaRevision(json) {
  const r = json && typeof json === 'object' ? json.repetidas : null;
  if (!r || typeof r !== 'object') return [];
  return Object.entries(r).filter(([id, x]) => x?.queda && x.queda !== id).map(([id, x]) => [x.queda, id]);
}

/** Las notas que la revisión dejó sin foto y esperan su ilustración automática (las más viejas primero). */
export function idsParaIlustrar(json) {
  const p = json && typeof json === 'object' ? json.paraIlustrar : null;
  if (!p || typeof p !== 'object') return [];
  return Object.entries(p).sort(([, a], [, b]) => String(a?.cuando ?? '').localeCompare(String(b?.cuando ?? ''))).map(([id]) => id);
}

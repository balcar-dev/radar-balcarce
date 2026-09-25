// Las fuentes que ve el lector al pie de una nota: el nombre de cada medio y
// el enlace a su nota, y nada más (criterio del 25/09, EDITORIAL.md). Lo que
// aportó cada una, las fechas y los antecedentes son de uso interno.
//
// La atribución no es opcional (ley 11.723): toda nota tiene al menos la
// fuente principal, aunque sea de antes de que existieran las fuentes
// consultadas. Sin imports ni JSX: se prueba con node --test.

/** Las fuentes para el lector: { medio, enlace } sin repetir enlaces. */
export function fuentesDeLaNota(nota) {
  const consultadas = (nota?.fuentesConsultadas ?? [])
    .map((f) => ({ medio: f?.medio ?? null, enlace: f?.enlace ?? null }))
    .filter((f) => f.medio || f.enlace);
  const lista = consultadas.length
    ? consultadas
    : (nota?.medios ?? []).map((medio, i) => ({ medio, enlace: i === 0 ? (nota?.enlace ?? null) : null }));
  if (!lista.length && nota?.enlace) lista.push({ medio: null, enlace: nota.enlace });
  const vistos = new Set();
  return lista.filter((f) => {
    const clave = f.enlace ?? `medio:${f.medio}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

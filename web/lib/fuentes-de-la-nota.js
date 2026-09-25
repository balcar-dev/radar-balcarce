// Las fuentes que ve el lector al pie de una nota: el nombre de cada medio y
// el enlace a su nota, y nada más (CRITERIO-EDITORIAL.md, sección 7). Lo que
// aportó cada una, las fechas y los antecedentes son de uso interno.
//
// La atribución no es opcional (ley 11.723): toda nota tiene al menos la
// fuente principal, aunque sea de antes de que existieran las fuentes
// consultadas. Sin imports ni JSX: se prueba con node --test.

// La entrada de un feed de Blogger (http://www.blogger.com/feeds/…/posts/
// default/…) no es una página: es XML. Hasta el 25/09 las notas de Infórmese
// Primero la guardaban como enlace (la ingesta ya da la página de la nota).
// Si alguna quedó así, el medio se muestra igual, sin enlace: al lector nunca
// le llega un XML.
const ENTRADA_DE_FEED = /\/feeds\/\d+\/posts\/default\/\d+/;

/** El enlace que puede ver el lector, o null. */
export function enlaceParaElLector(enlace) {
  return enlace && !ENTRADA_DE_FEED.test(String(enlace)) ? enlace : null;
}

/** Las fuentes para el lector: { medio, enlace } sin repetir enlaces. */
export function fuentesDeLaNota(nota) {
  const consultadas = (nota?.fuentesConsultadas ?? [])
    .map((f) => ({ medio: f?.medio ?? null, enlace: enlaceParaElLector(f?.enlace ?? null) }))
    .filter((f) => f.medio || f.enlace);
  const principal = enlaceParaElLector(nota?.enlace ?? null);
  const lista = consultadas.length
    ? consultadas
    : (nota?.medios ?? []).map((medio, i) => ({ medio, enlace: i === 0 ? principal : null }));
  if (!lista.length && principal) lista.push({ medio: null, enlace: principal });
  const vistos = new Set();
  return lista.filter((f) => {
    const clave = f.enlace ?? `medio:${f.medio}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

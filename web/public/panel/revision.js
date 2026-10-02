// La pestaña "Revisión" del panel del celular (1/10/2026): lo que la auditoría con IA marcó en notas ya publicadas
// (ingesta/auditoria-ia.mjs). Los hallazgos llegan CIFRADOS para este celular (web/data/auditoria-ia.json, un sobre
// por nota); acá, ya abiertos, se ordenan y se muestran. Sin nada del DOM ni de la red: se prueba con Node
// (pruebas/revision-panel.test.mjs).

export const TIPOS = {
  ortografia: 'Ortografía o puntuación',
  'texto-roto': 'Texto roto',
  seccion: 'Sección equivocada',
  sensible: 'Tema sensible',
  afirmacion: 'Afirmación sin sostén',
  titulo: 'Título que no corresponde',
};
const ORDEN_GRAVEDAD = { alta: 0, media: 1, baja: 2 };
const NOMBRE_GRAVEDAD = { alta: 'Grave', media: 'A mirar', baja: 'Menor' };

/**
 * De los sobres ya abiertos ([{ id, titulo, ruta, seccion, cuando, hallazgos }]) a la lista a mostrar: lo grave primero,
 * y dentro de cada gravedad lo más nuevo. Una nota sin hallazgos no aparece.
 */
export function ordenarRevision(items = []) {
  const peor = (e) => Math.min(...(e.hallazgos ?? []).map((h) => ORDEN_GRAVEDAD[h.gravedad] ?? 1), 9);
  return items
    .filter((e) => e && Array.isArray(e.hallazgos) && e.hallazgos.length)
    .map((e) => ({ ...e, hallazgos: [...e.hallazgos].sort((a, b) => (ORDEN_GRAVEDAD[a.gravedad] ?? 1) - (ORDEN_GRAVEDAD[b.gravedad] ?? 1)) }))
    .sort((a, b) => peor(a) - peor(b) || Date.parse(b.cuando ?? 0) - Date.parse(a.cuando ?? 0));
}

/** Cuántos hallazgos hay en total, y cuántos graves. */
export function contarRevision(items = []) {
  const todos = items.flatMap((e) => e?.hallazgos ?? []);
  return { total: todos.length, graves: todos.filter((h) => h.gravedad === 'alta').length, notas: items.filter((e) => e?.hallazgos?.length).length };
}

/**
 * El HTML de la pestaña (2/10: "que diga qué encontró mal y qué corrigió"). Dos partes: lo que la IA **corrigió sola** (faltas de ortografía
 * chicas y seguras, `corregidas`: web/data/correcciones-auditoria.json) y lo que **deja para que mires** (`items`, cifrado para este
 * celular). `abierto`: false si este celular no pudo abrir ningún sobre (se registró después de la última revisión); `generado`: cuándo se
 * leyó por última vez. `esc`, `haceCuanto` y `chip` vienen de la app.
 */
export function htmlDeRevision({
  items = [], abierto = true, generado = null, corregidas = [],
}, {
  esc, haceCuanto, chip, enlace,
}) {
  const lista = ordenarRevision(items);
  const hechas = corregidas.filter((e) => e?.cambios?.length).sort((a, b) => Date.parse(b.cuando ?? 0) - Date.parse(a.cuando ?? 0));
  const cuando = generado ? `<p class="meta">Última lectura: ${esc(haceCuanto(generado))}.</p>` : '';
  const vinculo = (e) => (enlace ? enlace(e) : (e.ruta ? `https://radarbalcarce.com${e.ruta}` : null));
  const titulo = (e) => { const href = vinculo(e); return `<div class="titulo">${href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(e.titulo)}</a>` : esc(e.titulo)}</div>`; };
  const nCorregidos = hechas.reduce((s, e) => s + e.cambios.length, 0);
  const corregido = hechas.length ? `<h2>✓ Corregido solo (${nCorregidos})</h2>
    <p class="meta">Faltas de ortografía chicas y seguras: la IA las arregló sola y ya están en la web. Lo delicado nunca se corrige solo.</p>
    ${hechas.map((e) => `<article class="tarjeta revision"><div>${chip(e.seccion)}<span class="meta">${esc(haceCuanto(e.cuando))}</span></div>${titulo(e)}<ul class="hallazgos">${e.cambios.map((c) => `<li class="hallazgo ok"><b>Corregido</b> <span class="antes">${esc(c.antes)}</span> → <span class="despues">${esc(c.despues)}</span></li>`).join('')}</ul></article>`).join('')}` : '';
  if (!abierto && !hechas.length) {
    return `<h1>Revisión</h1>${cuando}<p class="vacio">Este celular se registró después de la última revisión: los avisos le llegan a partir de la próxima.</p>`;
  }
  if (!lista.length && !hechas.length) {
    return `<h1>Revisión</h1>${cuando}<p class="vacio">Nada para mirar. La IA lee las notas nuevas cada hora y avisa acá si encuentra algo.</p>`;
  }
  const { total, graves } = contarRevision(lista);
  const queHizo = `<div class="caja"><strong>Qué hizo la IA:</strong> leyó las notas nuevas y encontró ${total + nCorregidos} ${total + nCorregidos === 1 ? 'cosa' : 'cosas'}: <strong>corrigió ${nCorregidos} sola${nCorregidos === 1 ? '' : 's'}</strong> y <strong>dejó ${total} para que mires</strong>${graves ? ` (${graves} ${graves === 1 ? 'grave' : 'graves'})` : ''}.</div>`;
  const resumen = `<p class="meta">${total} ${total === 1 ? 'hallazgo' : 'hallazgos'} en ${lista.length} ${lista.length === 1 ? 'nota' : 'notas'}${graves ? `, ${graves} ${graves === 1 ? 'grave' : 'graves'}` : ''}. Lo marca una IA: puede equivocarse.</p>`;
  const tarjetas = lista.map((e) => {
    const filas = e.hallazgos.map((h) => `<li class="hallazgo ${esc(h.gravedad)}"><b>${esc(NOMBRE_GRAVEDAD[h.gravedad] ?? h.gravedad)} · ${esc(TIPOS[h.tipo] ?? h.tipo)}</b> ${esc(h.detalle)}${h.sugerencia ? `<span class="meta"> Quedaría: ${esc(h.sugerencia)}</span>` : ''}</li>`).join('');
    return `<article class="tarjeta revision"><div>${chip(e.seccion)}<span class="meta">${esc(haceCuanto(e.cuando))}</span></div>${titulo(e)}<ul class="hallazgos">${filas}</ul></article>`;
  }).join('');
  const paraMirar = lista.length ? `<h2>Para que mires (${total})</h2>${resumen}${tarjetas}` : '<h2>Para que mires</h2><p class="vacio">Nada para mirar: lo único que encontró lo corrigió sola.</p>';
  return `<h1>Revisión</h1>${cuando}${queHizo}${corregido}${paraMirar}${!abierto ? '<p class="meta">Este celular se registró después de la última revisión: los avisos para mirar le llegan a partir de la próxima.</p>' : ''}`;
}

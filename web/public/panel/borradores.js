// La pestaña Borradores (8/10/2026, rediseño del panel; maqueta en docs/propuestas/material/panel-nuevo-maqueta.html): todo lo que se le pidió
// a la IA que escribiera, en un solo lugar: lo que está para leer y lo que ya se resolvió. Antes un borrador sólo se encontraba abriendo la nota.
// Funciones puras (se prueban en pruebas/panel-borradores.test.mjs); app.js lee los sobres cifrados y los abre con la llave del celular.

/** Cuántos días se muestran. El archivo guarda unos pocos más (panel/celular.mjs). */
export const DIAS_DE_BORRADORES = 7;

const ESTADOS_RESUELTOS = { aprobada: '✓ la aprobaste', descartada: '✕ la descartaste', retirada: '✕ retirada', publicada: '✓ salió en la web' };

/**
 * Parte los borradores en "para leer" (la nota todavía espera y el borrador tiene texto) y "resueltos" (todo lo demás), lo más nuevo primero.
 * `items`: [{ id, tipo, cuando (ms), b (el borrador abierto), estado ('espera'|'aprobada'|'descartada'|'retirada'|'publicada'), tituloNota, seccionNota }].
 */
export function clasificarBorradores(items = [], ahora = Date.now(), dias = DIAS_DE_BORRADORES) {
  const desde = ahora - dias * 864e5;
  const vistos = items
    .filter((x) => x?.b && Number.isFinite(x.cuando) && x.cuando >= desde)
    .map((x) => ({
      ...x,
      titulo: x.b.texto?.titulo || x.tituloNota || 'Una nota',
      seccion: x.b.seccion || x.seccionNota || '',
      conTexto: !!(x.b.ok && x.b.texto),
      marcas: Array.isArray(x.b.problemas) ? x.b.problemas.length : 0,
    }))
    .sort((a, b) => b.cuando - a.cuando);
  return {
    paraLeer: vistos.filter((x) => x.estado === 'espera' && x.conTexto),
    resueltos: vistos.filter((x) => !(x.estado === 'espera' && x.conTexto)),
  };
}

/** Cómo se ve el borrador en una frase: "✓ el verificador no marcó nada", "⚠ 2 cosas para mirar" o por qué no salió texto. */
export function estadoDelBorrador(x) {
  if (!x.conTexto) return `✕ la IA no pudo escribirla${x.b?.motivo ? `: ${String(x.b.motivo).slice(0, 90)}` : ''}`;
  return x.marcas ? `⚠ ${x.marcas} ${x.marcas === 1 ? 'cosa para mirar' : 'cosas para mirar'}` : '✓ el verificador no marcó nada';
}

/** El HTML de la pestaña. `apps`: { esc, haceCuanto, chip }. `estado`: { cargando, sinLlave, enCurso: [titulo] }. */
export function htmlDeBorradores({ paraLeer = [], resueltos = [] } = {}, { esc, haceCuanto, chip }, { cargando = false, sinLlave = false, enCurso = [] } = {}) {
  const tarjeta = (x) => `<button type="button" class="tarjeta" data-accion="abrir-borrador" data-tipo="${esc(x.tipo)}" data-id="${esc(x.id)}">
      <div>${x.seccion ? chip(x.seccion) : ''}<span class="meta">${esc(haceCuanto(new Date(x.cuando).toISOString()))}</span></div>
      <div class="titulo">${esc(x.titulo)}</div>
      <div class="meta">${esc(estadoDelBorrador(x))}</div>
      ${x.b.pedido ? `<div class="meta">Pedido: “${esc(String(x.b.pedido).slice(0, 120))}”</div>` : ''}
      ${x.estado !== 'espera' ? `<div class="meta">${esc(ESTADOS_RESUELTOS[x.estado] ?? '')}</div>` : ''}</button>`;
  const curso = enCurso.length ? `<p class="estado">✎ La IA está escribiendo ${enCurso.map((t) => `“${esc(t)}”`).join(', ')}.</p>` : '';
  if (sinLlave) return `<h1>Borradores</h1>${curso}<p class="vacio">Este celular no puede abrir los borradores guardados (falta registrarlo). Los que pidas ahora se ven acá mientras la app esté abierta.</p>`;
  if (cargando) return `<h1>Borradores</h1>${curso}<div class="girando"></div>`;
  return `<h1>Borradores</h1>${curso}
    <p class="estado">Todo lo que se le pidió a la IA en los últimos ${DIAS_DE_BORRADORES} días. Un borrador no se publica solo: lo lee una persona y decide.</p>
    <h2>Para leer (${paraLeer.length})</h2>
    ${paraLeer.length ? paraLeer.map(tarjeta).join('') : '<p class="vacio">No hay borradores esperando.</p>'}
    ${resueltos.length ? `<h2>Ya resueltos (${resueltos.length})</h2>${resueltos.map(tarjeta).join('')}` : ''}`;
}

// La pestaña "Pistas" del panel del celular (1/10/2026): se pega un dato o parte de una noticia (un tuit, un mensaje) y la
// nube investiga si lo cubrieron los medios (ingesta/pistas.mjs). Acá, sin nada del DOM ni de la red, el HTML del formulario y
// del informe; se prueba con Node (pruebas/pistas.test.mjs).

export const MAXIMO_DE_TEXTO = 1500;

const NIVELES = {
  'muy-cubierta': ['bien', 'Muy cubierta: la publicaron muchos medios'],
  cubierta: ['bien', 'Cubierta por más de un medio'],
  'un-medio': ['mal', 'La publicó un solo medio: cuidado'],
  'sin-cobertura': ['mal', 'No encontré que la haya cubierto ningún medio'],
};
const CONFIRMA = {
  si: 'Los títulos confirman lo central.',
  parcial: 'Los títulos confirman una parte.',
  no: 'Los títulos no la confirman.',
  'no-se': 'Los títulos no alcanzan para saberlo.',
};

/** El formulario: un cuadro para pegar y el botón. `texto` es lo que quedó escrito la vez anterior. */
export function htmlDeFormulario({ texto = '' } = {}, { esc }) {
  return `<h1>Pistas</h1>
    <p class="meta">Pegá un dato o parte de una noticia (un tuit, un mensaje) y la IA busca si ya lo cubrieron los medios, qué dicen y qué se está exagerando. Tarda un minuto.</p>
    <div class="caja"><textarea id="texto-pista" rows="7" maxlength="${MAXIMO_DE_TEXTO}" placeholder="Pegá acá el texto de la pista…">${esc(texto)}</textarea>
    <p class="meta">El texto queda a la vista en GitHub (el repositorio es público): no pegues nombres de menores ni de víctimas. Esas pistas no se investigan.</p>
    <button type="button" class="boton ancho" data-accion="investigar-pista">Investigar</button></div>`;
}

const fecha = (iso, haceCuanto) => (iso ? haceCuanto(iso) : '');

/** El informe de una pista ya abierto. `esc`, `haceCuanto` y `chip` vienen de la app. */
export function htmlDeInforme(i, { esc, haceCuanto, chip }) {
  if (!i) return '';
  if (!i.ok) {
    return `<div class="caja"><h2>No se pudo investigar</h2><p>${esc(i.motivo ?? 'Probá de nuevo con más detalle.')}</p></div>`;
  }
  const [clase, titulo] = NIVELES[i.nivel] ?? ['', i.nivel];
  const medios = (i.medios ?? []).slice(0, 10).map((m) => `<li><b>${esc(m.medio)}</b> ${esc(m.titulo)}${m.fecha ? `<span class="meta"> · ${esc(fecha(m.fecha, haceCuanto))}</span>` : ''}</li>`).join('');
  const m = i.matices;
  const matices = m ? `<h2>Qué dicen los títulos</h2><p><b>${esc(CONFIRMA[m.confirma] ?? '')}</b> ${esc(m.resumen)}</p>
      ${m.exagera?.length ? `<p class="meta">Puede estar exagerando:</p><ul class="hallazgos">${m.exagera.map((x) => `<li class="hallazgo media">${esc(x)}</li>`).join('')}</ul>` : ''}
      ${m.falta?.length ? `<p class="meta">Falta chequear en el texto de las notas:</p><ul class="hallazgos">${m.falta.map((x) => `<li class="hallazgo baja">${esc(x)}</li>`).join('')}</ul>` : ''}` : '';
  const nuestras = (i.nuestras ?? []).length
    ? `<h2>Lo que ya tenemos</h2><ul class="hallazgos">${i.nuestras.map((n) => `<li class="hallazgo baja">${chip(n.seccion)} ${n.ruta ? `<a href="https://radarbalcarce.com${esc(n.ruta)}" target="_blank" rel="noopener">${esc(n.titulo)}</a>` : esc(n.titulo)}</li>`).join('')}</ul>`
    : '<p class="meta">No tenemos nada publicado de esto.</p>';
  return `<div class="caja"><h2>${esc(i.afirmacion ?? 'La pista')}</h2>
    <p class="${esc(clase)}"><b>${esc(titulo)}</b>${i.total ? ` (${esc(i.total)} ${i.total === 1 ? 'medio' : 'medios'}${i.primera ? `, el primero ${esc(fecha(i.primera, haceCuanto))}` : ''})` : ''}</p>
    ${(i.consultas ?? []).length ? `<p class="meta">Se buscó: ${(i.consultas ?? []).map((c) => `“${esc(c)}”`).join(', ')}.</p>` : ''}
    ${medios ? `<ul class="hallazgos">${medios}</ul>` : ''}${matices}${nuestras}
    <p class="meta">Lo busca una IA en Google Noticias y compara títulos: no leyó las notas. Antes de publicar nada, mirá las fuentes.</p></div>`;
}

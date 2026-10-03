// La pestaña "Pistas" del panel del celular (1/10/2026; 2/10: las pistas quedan abiertas). Se pega un dato, un tuit o un enlace y la nube
// investiga si lo cubrieron los medios (ingesta/pistas.mjs); la pista queda guardada (web/data/pistas.json) y se vuelve a mirar sola
// cada tres horas, 14 días (panel/revisar-pistas.mjs). Acá, sin nada del DOM ni de la red, el HTML de la lista, de cada pista y del
// informe; se prueba con Node (pruebas/pistas.test.mjs y pruebas/pistas-abiertas.test.mjs).

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
    <p class="meta">Pegá un dato, un tuit o el enlace de una nota. La IA busca si ya lo cubrieron los medios y la pista <strong>queda abierta</strong>: se vuelve a mirar sola cada tres horas durante 14 días y te avisa si aparece. Tarda un minuto.</p>
    <div class="caja"><textarea id="texto-pista" rows="6" maxlength="${MAXIMO_DE_TEXTO}" placeholder="Pegá acá el texto, el tuit o el enlace…">${esc(texto)}</textarea>
    <p class="meta">El texto queda a la vista en GitHub (el repositorio es público): no pegues nombres de menores ni de víctimas. Esas pistas no se investigan. Los enlaces de redes (X, Facebook, Instagram) no se pueden leer: pegá el texto.</p>
    <button type="button" class="boton principal ancho" data-accion="investigar-pista">Investigar y dejar abierta</button></div>`;
}

const fecha = (iso, haceCuanto) => (iso ? haceCuanto(iso) : '');

/** Una frase corta de cuántos medios la cubren, para la lista. */
export function cobertura(p) {
  if (!p.total) return 'sin cobertura';
  return p.total === 1 ? '1 medio' : `${p.total} medios`;
}

const ESTADOS = { abierta: 'Abierta', archivada: 'Archivada', vencida: 'Vencida (14 días sin novedades)' };

/** En qué quedó una pista cerrada (los mismos que RESULTADOS de panel/pistas-libro.mjs). */
export const RESULTADOS = {
  confirmada: 'Se confirmó: la cubrieron medios',
  desmentida: 'Se desmintió o era falsa',
  'sin-novedad': 'Sin novedades: no pasó nada',
  publicada: 'Salió como nota nuestra',
  descartada: 'La descartamos',
};

/**
 * La lista de pistas guardadas: las abiertas primero (las que tienen novedad arriba de todo), después las archivadas y vencidas.
 * `libro`: lo que dice web/data/pistas.json ({ pistas: { id: {…} } }).
 */
export function htmlDeLista(libro, { esc, haceCuanto }) {
  const todas = Object.entries(libro?.pistas ?? {}).map(([id, p]) => ({ id, ...p }));
  if (!todas.length) return '<h2>Tus pistas</h2><p class="vacio">Todavía no hay pistas guardadas. Cuando investigues una, queda acá y se sigue mirando sola.</p>';
  const fila = (p) => `<button type="button" class="tarjeta" data-accion="abrir-pista" data-id="${esc(p.id)}">
      <div>${p.novedad ? '<span class="marca">● Novedad</span>' : ''}<span class="meta">${esc(ESTADOS[p.estado] ?? p.estado)} · creada ${esc(fecha(p.creada, haceCuanto))}</span></div>
      <div class="titulo">${esc(p.afirmacion || p.texto)}</div>
      <span class="est ${p.resultado ? (p.resultado.tipo === 'publicada' || p.resultado.tipo === 'confirmada' ? 'ok' : 'espera') : (p.total >= 2 ? 'ok' : 'espera')}">${esc(p.resultado ? `En qué quedó: ${RESULTADOS[p.resultado.tipo] ?? p.resultado.tipo}` : cobertura(p))}</span>
      <span class="meta">Última mirada ${esc(fecha(p.ultimaRevision, haceCuanto))}${p.teniamos ? ' · ya la tenemos nosotros' : ''}</span></button>`;
  const abiertas = todas.filter((p) => p.estado === 'abierta').sort((a, b) => Number(!!b.novedad) - Number(!!a.novedad) || Date.parse(b.creada) - Date.parse(a.creada));
  const otras = todas.filter((p) => p.estado !== 'abierta').sort((a, b) => Date.parse(b.creada) - Date.parse(a.creada));
  return `<h2>Abiertas (${abiertas.length})</h2>${abiertas.length ? abiertas.map(fila).join('') : '<p class="vacio">No hay pistas abiertas.</p>'}
    ${otras.length ? `<h2>Archivadas y vencidas (${otras.length})</h2>${otras.map(fila).join('')}` : ''}`;
}

/** La historia de una pista: cuántos medios la cubrían en cada mirada, de la más vieja a la más nueva. */
export function htmlDeHistorial(historial = [], { esc, haceCuanto }) {
  if (historial.length < 2) return '';
  const puntos = historial.slice(-6).map((h) => `<li><span class="meta">${esc(fecha(h.cuando, haceCuanto))}</span> ${esc(h.total ? `${h.total} ${h.total === 1 ? 'medio' : 'medios'}` : 'sin cobertura')}</li>`).join('');
  return `<h2>Cómo fue cambiando</h2><ul class="lista-simple">${puntos}</ul>`;
}

/**
 * Una pista abierta entera: su estado, cómo fue cambiando, el informe (ya abierto, o null si este celular no lo pudo abrir) y lo que
 * se puede hacer con ella. `apps`: { esc, haceCuanto, chip }.
 */
export function htmlDeUnaPista({ id, pista, informe }, apps) {
  const { esc, haceCuanto } = apps;
  const abierta = pista.estado === 'abierta';
  return `<button type="button" class="boton" data-accion="volver-pistas">← Mis pistas</button>
    <h1>${esc(pista.afirmacion || pista.texto)}</h1>
    <p class="est ${abierta ? 'ok' : 'espera'}">${esc(ESTADOS[pista.estado] ?? pista.estado)} · ${esc(cobertura(pista))} · última mirada ${esc(fecha(pista.ultimaRevision, haceCuanto))}</p>
    ${abierta ? '<p class="ayuda">Se vuelve a mirar sola cada tres horas, hasta 14 días después de crearla. Si un medio la empieza a cubrir, te avisa por WhatsApp.</p>' : ''}
    ${htmlDeResultado(pista, apps)}
    ${htmlDeSeguimiento(pista.seguimiento, apps)}
    ${htmlDeHistorial(pista.historial, apps)}
    ${informe ? htmlDeInforme(informe, apps) : '<p class="problemas">Este celular todavía no puede abrir el informe: se registró después. Tocá "Volver a mirar" y llega cifrado para este celular.</p>'}
    ${informe?.noLeidos?.length ? `<p class="problemas">No pude leer ${esc(informe.noLeidos.join(', '))}: las redes no dejan leer sus enlaces. Si querés que cuente, pegá el texto.</p>` : ''}
    <div class="botones">
      <button type="button" class="boton" data-accion="mirar-pista" data-id="${esc(id)}">Volver a mirar ahora</button>
      <button type="button" class="boton" data-accion="nota-de-pista" data-id="${esc(id)}">Hacer la nota</button>
      ${abierta ? `<button type="button" class="boton" data-accion="cerrar-pista" data-id="${esc(id)}">Cerrar: ¿en qué quedó?</button>` : `<button type="button" class="boton" data-accion="reabrir-pista" data-id="${esc(id)}">Reabrir 14 días</button>`}
      ${pista.resultado?.tipo === 'publicada' && pista.resultado.ruta ? `<button type="button" class="boton peligro" data-accion="retirar-nota-pista" data-id="${esc(id)}">Retirar la nota de la web</button>` : ''}
    </div>`;
}

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

/** Lo que quedó resuelto de una pista cerrada: en qué quedó, cuándo y la nota, si salió una. */
export function htmlDeResultado(p, { esc, haceCuanto }) {
  const r = p.resultado;
  if (!r) return '';
  return `<div class="caja"><strong>En qué quedó:</strong> ${esc(RESULTADOS[r.tipo] ?? r.tipo)} <span class="meta">· ${esc(fecha(r.cuando, haceCuanto))}</span>
    ${r.comentario ? `<p>${esc(r.comentario)}</p>` : ''}${r.ruta ? `<p><a href="https://radarbalcarce.com${esc(r.ruta)}" target="_blank" rel="noopener">Ver la nota en la web ↗</a></p>` : ''}</div>`;
}

/** El seguimiento de una pista, de lo más nuevo a lo más viejo: cuándo se empezó, qué pasó y cómo se cerró. */
export function htmlDeSeguimiento(seguimiento = [], { esc, haceCuanto }) {
  if (!seguimiento.length) return '';
  return `<h2>Seguimiento</h2><ul class="lista-simple">${[...seguimiento].reverse().slice(0, 12).map((s) => `<li><span class="meta">${esc(fecha(s.cuando, haceCuanto))}</span> ${esc(s.texto)}</li>`).join('')}</ul>`;
}

/** Cerrar una pista: elegir en qué quedó, con un comentario opcional. */
export function htmlDeCerrarPista({ id, pista }, { esc }) {
  return `<button type="button" class="boton" data-accion="abrir-pista" data-id="${esc(id)}">← Volver a la pista</button>
    <h1>¿En qué quedó?</h1>
    <p class="estado">${esc(pista.afirmacion || pista.texto)}</p>
    <p class="ayuda">Quedan anotadas la fecha y la respuesta en el seguimiento de la pista. Se puede reabrir.</p>
    <label for="comentario-pista">Un comentario (opcional)</label>
    <textarea id="comentario-pista" rows="2" maxlength="200" placeholder="Por ejemplo: lo desmintió el municipio"></textarea>
    <div class="botones">${Object.entries(RESULTADOS).filter(([k]) => k !== 'publicada').map(([k, texto]) => `<button type="button" class="boton" data-accion="resultado-pista" data-id="${esc(id)}" data-resultado="${esc(k)}">${esc(texto)}</button>`).join('')}</div>`;
}

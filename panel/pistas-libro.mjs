// El libro de pistas (web/data/pistas.json, 2/10/2026): las pistas que se pasaron por el panel y siguen abiertas. Funciones de una
// entrada y una salida, sin leer ni escribir archivos (se prueban en pruebas/pistas-abiertas.test.mjs). Sin dependencias.
//
// Qué queda a la vista (el repositorio es público; el texto de la pista ya viajaba como dato del workflow): el texto, la afirmación,
// las búsquedas, el nivel de cobertura, los nombres de los medios que la cubrieron y el historial de cuántos eran. El informe entero
// (qué dice cada medio, los matices, lo que tenemos nosotros) viaja cifrado para los celulares registrados (`sobre`).

export const PISTAS_ABIERTAS = {
  /** Cuántos días se sigue mirando una pista antes de dejarla vencida. */
  dias: 14,
  /** Cuántos días queda a la vista una archivada o vencida. */
  diasArchivada: 30,
  /** Cuántas pistas como máximo. */
  maximo: 40,
  /** Cuántos renglones de historial. */
  historial: 30,
};

/** En qué puede quedar una pista (2/10, Hernán: "ir haciendo un seguimiento en qué quedó cada pista"). */
export const RESULTADOS = {
  confirmada: 'Se confirmó: la cubrieron medios',
  desmentida: 'Se desmintió o era falsa',
  'sin-novedad': 'Sin novedades: no pasó nada',
  publicada: 'Salió como nota nuestra',
  descartada: 'La descartamos',
};

const dia = 864e5;
const SEGUIMIENTO_MAXIMO = 40;

const conRenglon = (p, texto, ahora) => ({ ...p, seguimiento: [...(p.seguimiento ?? []), { cuando: ahora.toISOString(), texto: String(texto).slice(0, 200) }].slice(-SEGUIMIENTO_MAXIMO) });

/** Una pista nueva (o la misma, vuelta a investigar) con su informe: `sobre` es el informe ya cifrado. */
export function conPista(libro, id, { texto, informe, sobre, ahora = new Date() }) {
  const antes = libro?.pistas?.[id];
  const registro = {
    creada: antes?.creada ?? ahora.toISOString(),
    texto: String(texto ?? '').slice(0, 3000),
    afirmacion: informe.afirmacion ?? '',
    consultas: informe.consultas ?? [],
    estado: 'abierta',
    ultimaRevision: ahora.toISOString(),
    nivel: informe.nivel ?? 'sin-cobertura',
    total: informe.total ?? 0,
    mediosVistos: (informe.medios ?? []).map((m) => m.medio),
    teniamos: (informe.nuestras ?? []).length > 0,
    novedad: false,
    historial: [...(antes?.historial ?? []), { cuando: ahora.toISOString(), total: informe.total ?? 0, nivel: informe.nivel ?? 'sin-cobertura' }].slice(-PISTAS_ABIERTAS.historial),
    seguimiento: antes?.seguimiento ?? [],
    ...(antes?.resultado ? { resultado: antes.resultado } : {}),
    ...(antes?.nota ? { nota: antes.nota } : {}),
    sobre,
  };
  const conInicio = antes ? registro : conRenglon(registro, `Se empezó a seguir: ${cobertura(informe)}`, ahora);
  return podar({ version: 1, pistas: { ...(libro?.pistas ?? {}), [id]: conInicio } }, ahora);
}

function cobertura(informe) {
  const n = informe.total ?? 0;
  return n ? `${n} ${n === 1 ? 'medio' : 'medios'}` : 'sin cobertura todavía';
}

/** Los ids de las pistas que hay que volver a mirar ahora: abiertas, de menos de `dias` días. */
export function pistasParaRevisar(libro, ahora = new Date()) {
  return Object.entries(libro?.pistas ?? {})
    .filter(([, p]) => p.estado === 'abierta' && ahora - Date.parse(p.creada) <= PISTAS_ABIERTAS.dias * dia)
    .map(([id]) => id);
}

/**
 * Lo que salió de volver a mirar una pista. `informe`/`sobre` sólo se reemplazan si hay algo nuevo (si no, el celular sigue viendo el
 * informe que ya tenía, con sus matices); el historial y la fecha de la última mirada se actualizan siempre.
 */
export function conRevision(libro, id, { informe, sobre = null, novedad = false, motivo = '', ahora = new Date() }) {
  const p = libro?.pistas?.[id];
  if (!p) return libro;
  const cambio = novedad || (informe.total ?? 0) !== p.total;
  const nueva = {
    ...p,
    ultimaRevision: ahora.toISOString(),
    nivel: informe.nivel ?? p.nivel,
    total: informe.total ?? p.total,
    mediosVistos: [...new Set([...(p.mediosVistos ?? []), ...(informe.medios ?? []).map((m) => m.medio)])],
    teniamos: p.teniamos || (informe.nuestras ?? []).length > 0,
    // La novedad queda marcada hasta que alguien la mira (el panel la apaga con `sinNovedad`).
    novedad: p.novedad || novedad,
    ...(cambio && sobre ? { sobre } : {}),
    historial: cambio ? [...(p.historial ?? []), { cuando: ahora.toISOString(), total: informe.total ?? 0, nivel: informe.nivel ?? p.nivel }].slice(-PISTAS_ABIERTAS.historial) : (p.historial ?? []),
  };
  const conRenglonNuevo = novedad && motivo ? conRenglon(nueva, `Novedad: ${motivo}`, ahora) : nueva;
  return podar({ ...libro, pistas: { ...libro.pistas, [id]: conRenglonNuevo } }, ahora);
}

/** Después de mirarla: ya no es una novedad. */
export function sinNovedad(libro, id) {
  const p = libro?.pistas?.[id];
  return p ? { ...libro, pistas: { ...libro.pistas, [id]: { ...p, novedad: false } } } : libro;
}

/** Archivar (o reabrir) una pista a mano. */
export function conEstado(libro, id, estado, ahora = new Date()) {
  const p = libro?.pistas?.[id];
  if (!p || !['abierta', 'archivada'].includes(estado)) return libro;
  return { ...libro, pistas: { ...libro.pistas, [id]: { ...p, estado, ...(estado === 'abierta' ? { creada: ahora.toISOString() } : { archivada: ahora.toISOString() }) } } };
}

/** Las abiertas que pasaron los días quedan "vencidas"; las archivadas o vencidas viejas se van; nunca más de `maximo`. */
export function podar(libro, ahora = new Date()) {
  const salida = {};
  for (const [id, p] of Object.entries(libro?.pistas ?? {})) {
    const edad = ahora - Date.parse(p.creada);
    let q = p;
    if (p.estado === 'abierta' && edad > PISTAS_ABIERTAS.dias * dia) q = { ...p, estado: 'vencida', archivada: p.archivada ?? new Date(Date.parse(p.creada) + PISTAS_ABIERTAS.dias * dia).toISOString() };
    if (['archivada', 'vencida'].includes(q.estado) && ahora - Date.parse(q.archivada ?? q.creada) > PISTAS_ABIERTAS.diasArchivada * dia) continue;
    salida[id] = q;
  }
  const ids = Object.keys(salida).sort((a, b) => Date.parse(salida[b].creada) - Date.parse(salida[a].creada)).slice(0, PISTAS_ABIERTAS.maximo);
  return { ...libro, version: 1, pistas: Object.fromEntries(ids.map((id) => [id, salida[id]])) };
}

/** Una pista por renglón, como los otros archivos que escribe el celular: el historial de git dice qué cambió cuándo. */
export function comoRenglones(libro) {
  const lineas = Object.entries(libro?.pistas ?? {}).map(([id, p]) => `${JSON.stringify(id)}:${JSON.stringify(p)}`);
  return `{"version":1,"pistas":{${lineas.length ? `\n${lineas.join(',\n')}\n` : ''}}}\n`;
}

/** El aviso de WhatsApp cuando una pista tiene novedad (corto, sin el texto de la pista: va a un teléfono). */
export function avisoDePistas(novedades = []) {
  if (!novedades.length) return '';
  const lineas = novedades.slice(0, 4).map((n) => `• ${String(n.afirmacion ?? '').slice(0, 80)}: ${n.motivo}`);
  return `Radar Balcarce · ${novedades.length === 1 ? 'una pista tiene novedades' : `${novedades.length} pistas tienen novedades`}:\n${lineas.join('\n')}\nMirá la pestaña Pistas del panel.`;
}

/** Anota algo en el seguimiento de una pista (se hizo el borrador, salió la nota…). */
export function conSeguimiento(libro, id, texto, ahora = new Date()) {
  const p = libro?.pistas?.[id];
  return p ? { ...libro, pistas: { ...libro.pistas, [id]: conRenglon(p, texto, ahora) } } : libro;
}

/**
 * Cerrar una pista diciendo en qué quedó: queda archivada con su resultado (RESULTADOS) y, si salió como nota nuestra, el enlace a esa nota.
 * El motivo es opcional ("lo desmintió el municipio").
 */
export function conResultado(libro, id, { tipo, comentario = '', ruta = null }, ahora = new Date()) {
  const p = libro?.pistas?.[id];
  if (!p || !(tipo in RESULTADOS)) return libro;
  const resultado = { tipo, cuando: ahora.toISOString(), ...(comentario ? { comentario: String(comentario).slice(0, 200) } : {}), ...(ruta ? { ruta } : {}) };
  const cerrada = conRenglon({ ...p, estado: 'archivada', archivada: ahora.toISOString(), resultado, novedad: false }, `Cerrada: ${RESULTADOS[tipo]}${comentario ? ` (${String(comentario).slice(0, 80)})` : ''}`, ahora);
  return { ...libro, pistas: { ...libro.pistas, [id]: cerrada } };
}

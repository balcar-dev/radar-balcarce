// La estadística diaria de lo publicado (27/09, Hernán: "que sigamos esa
// estadística de ahora en más, categorías y demás, diariamente").
//
// Cada corrida de "Actualizar la web" (web/scripts/generar-datos.mjs) vuelve
// a contar el día de hoy y lo guarda en web/data/notas-por-dia.json, un día
// por línea. La última corrida del día deja el número final. El resumen de
// WhatsApp de las 21 (redes/avisos.mjs) lo lee para decir cuántas notas
// salieron, en qué sección, y cómo viene contra los días anteriores.
//
// Qué cuenta como "publicada hoy": una nota que HOY está publicada (en las
// listas del sitio, con cuerpo) y que se vio por primera vez hoy, en hora de
// Balcarce. Lo que salió y después se sacó (repetida, retirada, el filtro la
// frenó) no cuenta: no está publicado.
//
// Sin dependencias: sólo lo que trae Node.

import { diaAR } from './zona.mjs';

/** Cuántos días se guardan. Un año alcanza para comparar temporadas. */
export const DIAS_GUARDADOS = 400;

const primeraVez = (n) => n?.visto ?? n?.fecha;

/**
 * Los números de un día a partir de la portada que se acaba de armar.
 *
 * @param {object} o.portada   lo que va a web/data/portada.json
 * @param {Date}   o.ahora
 * @param {object} [o.libro]   web/data/redes.json, para contar lo que salió en redes
 */
export function cuentaDelDia({ portada = {}, ahora = new Date(), libro = {} } = {}) {
  const dia = diaAR(ahora);
  const esDeHoy = (iso) => {
    if (!iso) return false;
    const t = new Date(iso);
    return Number.isFinite(t.getTime()) && diaAR(t) === dia;
  };
  const deHoy = (portada.notas ?? []).filter((n) => esDeHoy(primeraVez(n)));
  const propias = deHoy.filter((n) => n.propia);
  const noticias = deHoy.filter((n) => !n.propia);
  const porSeccion = {};
  for (const n of noticias) porSeccion[n.seccion ?? 'Sin sección'] = (porSeccion[n.seccion ?? 'Sin sección'] ?? 0) + 1;
  const ordenadas = Object.fromEntries(Object.entries(porSeccion).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')));
  const medios = (n) => new Set((n.medios ?? []).map((m) => (typeof m === 'string' ? m : m?.nombre)).filter(Boolean)).size;
  return {
    dia,
    publicadas: noticias.length,
    deBalcarce: noticias.filter((n) => n.local).length,
    deAfuera: noticias.filter((n) => !n.local).length,
    conDosMediosOMas: noticias.filter((n) => medios(n) >= 2).length,
    porPersona: noticias.filter((n) => n.publicadaPor && n.publicadaPor !== 'ia').length,
    propias: propias.length,
    porSeccion: ordenadas,
    enPortada: (portada.notas ?? []).length,
    esperandoCuerpo: Number.isFinite(portada.esperandoCuerpo) ? portada.esperandoCuerpo : null,
    esperandoPersona: Array.isArray(portada.pendientes) ? portada.pendientes.length : null,
    facebook: Object.values(libro?.facebook ?? {}).filter((p) => esDeHoy(p?.cuando)).length,
  };
}

/** La historia con el día de hoy puesto (o reemplazado), sin pasar de DIAS_GUARDADOS. */
export function anotarDia(historia = {}, cuenta, maximo = DIAS_GUARDADOS) {
  const dias = { ...(historia?.dias ?? {}) };
  if (cuenta?.dia) dias[cuenta.dia] = cuenta;
  const fechas = Object.keys(dias).sort().slice(-maximo);
  return { dias: Object.fromEntries(fechas.map((f) => [f, dias[f]])) };
}

/** El texto de web/data/notas-por-dia.json: un día por línea, así cada corrida cambia una sola. */
export function comoHistoriaJson(historia) {
  const fechas = Object.keys(historia?.dias ?? {}).sort();
  return `{"dias":{\n${fechas.map((f) => `${JSON.stringify(f)}:${JSON.stringify(historia.dias[f])}`).join(',\n')}\n}}\n`;
}

/**
 * Cómo viene el día contra los anteriores: el promedio de publicadas de los
 * últimos `dias` días cerrados (sin contar hoy). null si todavía no hay días.
 */
export function promedioAnterior(historia = {}, hoy, dias = 7) {
  const anteriores = Object.keys(historia?.dias ?? {}).filter((f) => f < hoy).sort().slice(-dias);
  if (!anteriores.length) return null;
  const total = anteriores.reduce((s, f) => s + (historia.dias[f]?.publicadas ?? 0), 0);
  return { dias: anteriores.length, promedio: Math.round(total / anteriores.length) };
}

/**
 * El informe del día para el WhatsApp de las 21. Breve (Hernán, 27/09): dos
 * líneas, el total contra los días anteriores y las notas por sección.
 *
 *   📰 Hoy: 21 notas (18 de Balcarce) · promedio de 7 días: 40
 *   Automovilismo 11 · Política 4 · Balcarce 2 · Policiales 2
 */
export function textoDelDia(cuenta, historia = {}) {
  if (!cuenta) return '';
  const previo = promedioAnterior(historia, cuenta.dia);
  const contra = previo ? ` · ${previo.dias === 1 ? 'ayer' : `promedio de ${previo.dias} días`}: ${previo.promedio}` : '';
  const l = [`📰 Hoy: ${cuenta.publicadas} notas (${cuenta.deBalcarce} de Balcarce)${contra}`];
  const secciones = Object.entries(cuenta.porSeccion ?? {});
  if (secciones.length) l.push(secciones.map(([s, n]) => `${s} ${n}`).join(' · '));
  return l.join('\n');
}

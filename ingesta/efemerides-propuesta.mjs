// La propuesta automática de "Un día como hoy" (1/10/2026, pendiente 0c): de las
// candidatas de cada día, arma sola una principal y tres que la acompañan, con el
// motivo de cada una, para que una persona sólo apruebe o cambie en el panel
// (pestaña Fechas). Nada sale solo: es una propuesta.
//
// Las reglas salen de lo que Hernán y Andrés pidieron y de tres análisis externos
// (docs/13-EFEMERIDES.md), que coinciden en lo mismo:
//
//   · Orden de interés: lo de Balcarce y la zona, lo argentino que un vecino
//     reconoce, lo que conoce todo el mundo, una curiosidad liviana al cierre.
//   · Cuatro lugares, no las cuatro de más puntaje: la principal (la mejor), una
//     argentina, una de ciencia o del mundo y una curiosa.
//   · Variedad: que el estilo de la principal no repita el de ayer (ni el de
//     anteayer, menos) y que dentro del día no se repita el estilo.
//   · Lo político, lo religioso y lo que puede estar vivo no se proponen (van a
//     "no"); la violencia y los menores ya no llegan a las candidatas.
//   · Una fecha patria curada habla sola: ese día no hay combo.
//
// Sin dependencias, como todo `ingesta/`. Es una función pura: se prueba sin red.

import { RE_ARGENTINA, esDeBalcarce } from './efemerides.mjs';

/** Las marcas que sacan una candidata de la propuesta (la persona igual puede elegirla a mano). */
export const MARCAS_QUE_EXCLUYEN = ['política', 'religión', 'puede estar vivo'];

const esFechaPatria = (c) => c.origen === 'curada' && c.estilo === 'patria';
const esArgentina = (c) => RE_ARGENTINA.test(c.texto) || ['portal', 'especial-ar', 'curada'].includes(c.origen) || esDeBalcarce(c.texto);
const esMundo = (c) => !esArgentina(c);
const SIRVE_PARA_CIENCIA_O_MUNDO = new Set(['ciencia', 'cultura', 'deporte', 'nacimiento', 'campo']);
const SIRVE_PARA_CURIOSA = new Set(['curioso', 'fundacion', 'historia']);

/** Los tres lugares que acompañan a la principal, en orden. */
const LUGARES = [
  { clave: 'argentina', sirve: (c) => esArgentina(c) },
  { clave: 'mundo', sirve: (c) => esMundo(c) || SIRVE_PARA_CIENCIA_O_MUNDO.has(c.estilo) },
  { clave: 'curiosa', sirve: (c) => SIRVE_PARA_CURIOSA.has(c.estilo) },
];

/** Cuánto vale ahora: el puntaje, menos lo que repite el estilo de ayer o de anteayer o el de otra del mismo día. */
function ajustado(c, { ayer, anteayer, usados }) {
  let p = c.puntaje;
  if (c.estilo === ayer) p -= 12;
  else if (c.estilo === anteayer) p -= 5;
  if (usados.has(c.estilo)) p -= 10;
  return p;
}

const mejor = (lista, contexto) => lista.reduce((m, c) => (!m || ajustado(c, contexto) > ajustado(m, contexto) ? c : m), null);

/** Por qué se propone: en una frase, para que quien revise entienda el criterio. */
export function motivoDe(c, { lugar, ayer } = {}) {
  const partes = [];
  if (esDeBalcarce(c.texto)) partes.push('Es de Balcarce o de lo que identifica al pueblo.');
  else if (lugar === 'principal' && esArgentina(c)) partes.push('Lo más fuerte del día y es argentino.');
  else if (lugar === 'argentina' || esArgentina(c)) partes.push('Argentina que un vecino reconoce.');
  else if (c.importancia >= 150) partes.push(`Lo conoce todo el mundo (${c.importancia} idiomas en Wikipedia).`);
  else if (lugar === 'curiosa') partes.push('Una curiosidad para cerrar liviano.');
  else partes.push('Suma variedad al día.');
  if (c.hace && c.hace > 0 && c.hace % 25 === 0) partes.push(`Aniversario redondo (hace ${c.hace} años).`);
  if (lugar === 'principal' && ayer && c.estilo !== ayer) partes.push('Cambia de estilo respecto de ayer.');
  return partes.join(' ');
}

/**
 * La propuesta de un día.
 *
 * @param {object[]} candidatas  las del día, con { id, estilo, puntaje, texto, origen, marcas, importancia, hace }
 * @param {{ayer?: string|null, anteayer?: string|null}} [o]  el estilo de la principal de ayer y de anteayer
 * @returns {{principal: string|null, si: string[], opcionales: string[], descartadas: string[], motivos: Record<string,string>, estilo: string|null, automatica: true}}
 */
export function proponerDia(candidatas = [], { ayer = null, anteayer = null } = {}) {
  const vacia = { principal: null, si: [], opcionales: [], descartadas: [], motivos: {}, estilo: null, automatica: true };
  const todas = candidatas.filter((c) => c?.id);
  if (!todas.length) return vacia;

  // Una fecha patria habla sola.
  const patria = todas.find(esFechaPatria);
  if (patria) {
    return { ...vacia, principal: patria.id, estilo: patria.estilo, motivos: { [patria.id]: 'Fecha patria: ese día la pieza habla sólo de esto, sin combo.' } };
  }

  const excluida = (c) => c.origen !== 'curada' && (c.marcas ?? []).some((m) => MARCAS_QUE_EXCLUYEN.includes(m));
  const descartadas = todas.filter(excluida).map((c) => c.id);
  let quedan = todas.filter((c) => !excluida(c));
  if (!quedan.length) return { ...vacia, descartadas };

  const usados = new Set();
  const contexto = { ayer, anteayer, usados };
  const motivos = {};
  const principal = mejor(quedan, contexto);
  quedan = quedan.filter((c) => c !== principal);
  usados.add(principal.estilo);
  motivos[principal.id] = motivoDe(principal, { lugar: 'principal', ayer });

  const si = [];
  for (const { clave, sirve } of LUGARES) {
    const elegida = mejor(quedan.filter(sirve), contexto) ?? mejor(quedan, contexto);
    if (!elegida) break;
    si.push(elegida.id);
    quedan = quedan.filter((c) => c !== elegida);
    usados.add(elegida.estilo);
    motivos[elegida.id] = motivoDe(elegida, { lugar: clave });
  }

  const opcionales = [];
  for (let i = 0; i < 2; i += 1) {
    const c = mejor(quedan, { ayer, anteayer, usados: new Set() });
    if (!c) break;
    opcionales.push(c.id);
    quedan = quedan.filter((x) => x !== c);
  }
  return { principal: principal.id, si, opcionales, descartadas, motivos, estilo: principal.estilo, automatica: true };
}

/**
 * La propuesta de varios días seguidos: cada día mira el estilo de la principal de
 * ayer y de anteayer. `dias` = { 'AAAA-MM-DD': { candidatas } }; devuelve { fecha: propuesta }.
 */
export function proponerDias(dias = {}) {
  const salida = {};
  let ayer = null;
  let anteayer = null;
  for (const fecha of Object.keys(dias).sort()) {
    const p = proponerDia(dias[fecha]?.candidatas ?? [], { ayer, anteayer });
    salida[fecha] = p;
    anteayer = ayer;
    ayer = p.estilo;
  }
  return salida;
}

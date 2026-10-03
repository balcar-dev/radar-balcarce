// "Hacer la nota" de una pista (3/10/2026, Hernán: "si investiga y si puede armar algo, publicarlas como propias"). Busca en internet las notas
// de los medios que hablan de lo mismo, con su texto (ingesta/busqueda.mjs, Tavily), y escribe una nota propia con el mismo camino que
// "Escribir con IA" del panel: el criterio editorial, los arreglos que no inventan y el verificador contra el texto de esas fuentes
// (panel/reescribir-una.mjs). El borrador viaja cifrado al celular; lo publica una persona (se guarda en web/data/notas-de-pistas.json, que
// lee web/lib/notas-de-pistas.js). Sin dependencias.

import { reescribirUna } from './reescribir-una.mjs';
import { buscarConTexto, juntarFuentes, BUSQUEDA } from '../ingesta/busqueda.mjs';
import { palabraDelicada } from '../ingesta/pistas.mjs';

/** Lo que se le pide a la IA además del criterio de siempre. */
export const PEDIDO_DE_PISTA = 'Esta nota nace de un dato que circulaba en redes. Contá sólo lo que confirman las fuentes, atribuí cada dato al medio que lo dijo y, si no coinciden, decilo. No repitas el rumor.';

/** La sección con que arranca la nota (se cambia en el borrador): Balcarce si la pista nombra algo de acá. */
export const seccionDeLaPista = (texto) => (/balcarce|balcarce[ñn]/i.test(String(texto ?? '')) ? 'Balcarce' : 'Argentina');

/** "www.diariolavanguardia.com" → "diariolavanguardia.com" (el nombre que figura en "Fuentes"). */
const nombreDelMedio = (f) => String(f.medio || f.url).replace(/^www\./, '');

/**
 * La nota "de entrada" para escribirla: sus fuentes con el enlace y un resumen, el título de la pista y la sección. El texto de cada fuente
 * no va acá: lo sirve `traer` (ya lo trajo la búsqueda).
 */
export function notaParaEscribir(pista, fuentes, { ahora = new Date() } = {}) {
  const origenes = fuentes.map((f) => ({
    medio: nombreDelMedio(f), enlace: f.url, fecha: f.fecha ?? null, oficial: false, resumen: f.resumen.slice(0, 400),
  }));
  const seccion = seccionDeLaPista(`${pista.afirmacion ?? ''} ${pista.texto ?? ''}`);
  return {
    id: `np${String(pista.id ?? '').replace(/\W/g, '').slice(0, 14)}`,
    titulo: pista.afirmacion || String(pista.texto ?? '').slice(0, 120),
    seccion,
    medios: origenes.map((o) => o.medio),
    fecha: ahora.toISOString(),
    local: seccion === 'Balcarce',
    temas: [],
    resumenFuente: fuentes[0]?.resumen ?? '',
    origenes,
    enlace: fuentes[0]?.url ?? null,
    // Lo que contaron las otras fuentes: el verificador lo usa para controlar lo que se escribe.
    fuentesTexto: fuentes.slice(1).map((f) => f.texto),
  };
}

/**
 * El borrador de una nota a partir de una pista guardada. `buscar` y `escribir` se pueden cambiar (las pruebas).
 * Devuelve { ok, motivo?, texto?, problemas, sacadas, aviso, seccion, fuentes: [{ medio, enlace, fecha }], medios }.
 */
export async function escribirNotaDePista(pista, {
  buscar = buscarConTexto, escribir = reescribirUna, archivo = [], ahora = new Date(), fetchFn,
} = {}) {
  const vacio = { problemas: [], sacadas: 0, aviso: null, fuentes: [], medios: 0 };
  const delicada = palabraDelicada(`${pista.texto ?? ''} ${pista.afirmacion ?? ''}`);
  if (delicada) return { ...vacio, ok: false, motivo: `La pista toca un tema que no se escribe desde acá ("${delicada}": menores, víctimas).` };
  const consultas = [...new Set([...(pista.consultas ?? []), pista.afirmacion].filter(Boolean))].slice(0, 2);
  if (!consultas.length) return { ...vacio, ok: false, motivo: 'La pista no tiene qué buscar.' };
  const resultados = [];
  const errores = [];
  for (const c of consultas) {
    try { resultados.push(await buscar(c, { fetchFn })); } catch (e) { errores.push(e); }
  }
  if (!resultados.length && errores.length) return { ...vacio, ok: false, motivo: `No pude buscar en internet (${String(errores[0].message).slice(0, 120)}).` };
  const fuentes = juntarFuentes(resultados);
  if (!fuentes.length) {
    return { ...vacio, ok: false, motivo: `No encontré notas de medios con texto que hablen de esto (hace falta al menos una con ${BUSQUEDA.textoMinimo} caracteres). La pista sigue abierta: se vuelve a mirar sola.` };
  }
  const nota = notaParaEscribir(pista, fuentes, { ahora });
  const porEnlace = new Map(fuentes.map((f) => [f.url, f.texto]));
  const r = await escribir(nota, { pedido: PEDIDO_DE_PISTA, archivo, ahora, traer: async (url) => porEnlace.get(url) ?? null });
  return {
    ...vacio, ...r, seccion: nota.seccion, medios: fuentes.length,
    fuentes: fuentes.map((f) => ({ medio: nombreDelMedio(f), enlace: f.url, fecha: f.fecha ?? null })),
  };
}

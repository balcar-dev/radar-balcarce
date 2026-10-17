// Cuántos medios distintos cuentan una nota, para decidir qué lo de afuera llega a las redes (regla 280, 17/10/2026).
//
// Es la misma cuenta de la ingesta (`contarMedios`, ingesta/ingesta.mjs): los medios que comparten dueño o sistema (campo `grupo`
// de la fuente: Grupo Clarín, eleco.com.ar) cuentan UNA vez. Está acá aparte, y no importa ingesta.mjs entero, porque redes/ se
// prueba y se corre sin cargar el motor: alcanza con la lista de fuentes, que es sólo datos.
//
// Sin dependencias: sólo lo que trae Node.

import { FUENTES, FUENTES_NACIONALES } from '../ingesta/fuentes.mjs';
import { FUENTES_CRUCE } from '../ingesta/fuentes-cruce.mjs';

/** medio → grupo, de las fuentes que tienen `grupo`. Un medio sin grupo cuenta por su nombre. */
const GRUPO_DE_MEDIO = new Map(
  [...FUENTES, ...FUENTES_NACIONALES, ...FUENTES_CRUCE].filter((f) => f.grupo && f.medio).map((f) => [f.medio, f.grupo]),
);

/** Cuántos medios distintos hay en una lista de nombres (un grupo cuenta una vez). */
export const contarMedios = (nombres) => new Set((nombres ?? []).filter(Boolean).map((m) => GRUPO_DE_MEDIO.get(m) ?? m)).size;

/**
 * Cuántos medios distintos cuentan esta nota de la portada: sus `medios` (un grupo cuenta una vez) o, si la ingesta ya la marcó como
 * "muy contada" (`muyContada.medios`), lo que ella dice si es más. Una nota sin lista de medios cuenta uno.
 */
export function mediosDeLaNota(nota) {
  const lista = Array.isArray(nota?.medios) && nota.medios.length ? nota.medios : [nota?.medio];
  return Math.max(contarMedios(lista), Number(nota?.muyContada?.medios) || 0);
}

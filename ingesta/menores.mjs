// Una persona menor de 18 años dicha por su edad: "una chica de 16 años", "un nene de 6 años", "un menor de 14 años".
// Sin dependencias: sólo lo que trae Node.
//
// La lista roja y la amarilla del semáforo no miraban edades (8/10/2026, C-12 e I-6): "Una chica de 16 años fue golpeada" salía en
// verde. Lo usan el semáforo (`semaforoDelTexto`, ingesta/ingesta.mjs) y las pistas del panel (ingesta/pistas.mjs).
// Se pide la persona JUNTO a la edad ("chica de 16 años") para no frenar "la menor inflación en 12 años" ni "hace 15 años".

const sinTildes = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const PERSONA = '(?:nen[eao]s?|nin[oa]s?|chic[oa]s?|pib[ea]s?|adolescentes?|bebes?|jovencit[oa]s?|joven|jovenes|hij[oa]s?|alumn[oa]s?|criatura)';
// Una edad o varias ("de 15 y 16 años", "de 14, 15 y 17 años", "de entre 12 y 17 años"): alcanza con que la más chica sea menor de 18 (15/10/2026, regla 172).
const CON_EDAD = new RegExp(`\\b${PERSONA}\\b,?\\s+(?:de|con|que tiene|que tenia|de unos|de apenas|de entre|entre)?\\s*(\\d{1,2}(?:(?:\\s*(?:,|y|e|o|a)\\s*|\\s+)\\d{1,2})*)\\s*(?:anos?|anitos)\\b`, 'g');
const MENOR_DE = /\bmenor(?:es)?\s+de\s+(\d{1,2})\s*(?:anos?|anitos)\b/g;

/** ¿Habla de alguien de menos de 18 años por su edad? Devuelve lo que pegó, o null. Mira TODAS las personas con edad del texto, no sólo la primera
 *  ("Una joven de 22 años y su hija de 3 años"): alcanza con que cualquiera sea menor. Acepta el texto crudo o el ya normalizado (sin comas):
 *  el espacio también separa edades ("14 15 y 17 años"). */
export function menorPorEdad(texto) {
  const t = sinTildes(texto);
  for (const re of [CON_EDAD, MENOR_DE]) {
    for (const m of t.matchAll(re)) {
      if (Math.min(...m[1].match(/\d+/g).map(Number)) < 18) return m[0];
    }
  }
  return null;
}

// Una persona menor de 18 años dicha por su edad: "una chica de 16 años", "un nene de 6 años", "un menor de 14 años".
// Sin dependencias: sólo lo que trae Node.
//
// La lista roja y la amarilla del semáforo no miraban edades (8/10/2026, C-12 e I-6): "Una chica de 16 años fue golpeada" salía en
// verde. Lo usan el semáforo (`semaforoDelTexto`, ingesta/ingesta.mjs) y las pistas del panel (ingesta/pistas.mjs).
// Se pide la persona JUNTO a la edad ("chica de 16 años") para no frenar "la menor inflación en 12 años" ni "hace 15 años".

const sinTildes = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const PERSONA = '(?:nen[eao]s?|nin[oa]s?|chic[oa]s?|pib[ea]s?|adolescentes?|bebes?|jovencit[oa]s?|joven|jovenes|hij[oa]s?|alumn[oa]s?|criatura)';
const CON_EDAD = new RegExp(`\\b${PERSONA}\\b,?\\s+(?:de|con|que tiene|que tenia|de unos|de apenas)?\\s*(\\d{1,2})\\s*(?:anos?|anitos)\\b`);
const MENOR_DE = /\bmenor(?:es)?\s+de\s+(\d{1,2})\s*(?:anos?|anitos)\b/;

/** ¿Habla de alguien de menos de 18 años por su edad? Devuelve lo que pegó, o null. */
export function menorPorEdad(texto) {
  const t = sinTildes(texto);
  for (const re of [CON_EDAD, MENOR_DE]) {
    const m = re.exec(t);
    if (m && Number(m[1]) < 18) return m[0];
  }
  return null;
}

// Arreglos de texto que necesitan varias páginas.
//
// Están acá y no dentro de un componente para que se puedan probar sin
// levantar React: son funciones de una entrada y una salida, y las pruebas
// viven en pruebas/web.test.mjs.

/** Minúsculas y sin tildes: para comparar textos sin que importe cómo se escribieron. */
export const sinTildes = (texto = '') => String(texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Pasa un nombre escrito todo en mayúsculas a la forma en que se escribe.
 *
 * El cronograma del Colegio de Farmacéuticos llega así —"SAN JOSE PLAZA"— y
 * en la página quedaba gritando. Si el texto ya está bien escrito no se
 * toca: el umbral de 80% de mayúsculas deja pasar siglas sueltas como
 * "Farmacia SUM" sin arruinar el resto.
 */
export function comoNombre(texto = '') {
  const t = String(texto);
  const letras = t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  const mayusculas = letras.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length;
  if (!letras.length || mayusculas / letras.length < 0.8) return t;
  return t.toLowerCase().replace(/(^|\s)([a-záéíóúñ])/g, (m, a, l) => a + l.toUpperCase());
}

/**
 * Recorta en una palabra entera y agrega "…". Los títulos de los buscadores
 * se cortan a unos 60 caracteres y las descripciones a unos 155: mejor que el
 * corte lo haga uno, en un lugar que se lea bien, y no Google a mitad de una
 * palabra.
 */
export function recortarEn(texto = '', maximo = 60) {
  const t = String(texto).replace(/\s+/g, ' ').trim();
  if (t.length <= maximo) return t;
  const corte = t.slice(0, maximo - 1);
  const ultimo = corte.lastIndexOf(' ');
  return `${corte.slice(0, ultimo > maximo * 0.6 ? ultimo : maximo - 1).replace(/[\s,.;:–—-]+$/, '')}…`;
}

/** Lo que Google muestra de una descripción (unos 155 caracteres) y hasta dónde se deja pasar sin cortar. */
export const DESCRIPCION_IDEAL = 155;
export const DESCRIPCION_HOLGURA = 160;

// Abreviaturas que terminan en punto sin terminar la oración ("el Dr. Pérez", "Av. Mitre").
const ABREVIATURAS = new Set(['dr', 'dra', 'sr', 'sra', 'srta', 'lic', 'ing', 'av', 'gral', 'cnel', 'pte', 'prof', 'arq', 'etc', 'vs', 'sta', 'sto', 'nro', 'núm']);

/**
 * La descripción que le damos a Google (meta description, og:description, twitter:description).
 *
 * Google corta sola lo que no entra; lo que no hay que hacer es ayudarla a cortar mal (16/10/2026, D5 de la auditoría SEO):
 *   · hasta ~160 caracteres va entera, sin "…" de más;
 *   · si es más larga, se corta donde termina una oración (la última que entre y pase de 70 caracteres), sin "…";
 *   · si no hay un final de oración que sirva, se corta en una palabra entera con "…" (recortarEn).
 * Nunca se agrega ni se cambia una palabra: es siempre el principio del texto original.
 */
export function descripcionParaBuscador(texto = '') {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= DESCRIPCION_HOLGURA) return t;
  const ventana = t.slice(0, DESCRIPCION_HOLGURA + 1);
  const fin = /[.!?]+["”»')\]]*(?=\s|$)/g;
  let corte = -1;
  let m;
  while ((m = fin.exec(ventana))) {
    const hasta = m.index + m[0].length;
    if (hasta > DESCRIPCION_HOLGURA) break;
    const palabra = ventana.slice(0, m.index).split(/\s/).pop().toLowerCase();
    const abreviatura = m[0] === '.' && (ABREVIATURAS.has(palabra) || /^[a-zñ]$/.test(palabra));
    if (!abreviatura) corte = hasta;
  }
  if (corte >= 70) return t.slice(0, corte);
  return recortarEn(t, DESCRIPCION_IDEAL);
}

/**
 * El titular reducido a lo que dice: minúsculas, sin tildes ni signos. Dos
 * notas con el mismo titular así son la misma nota contada dos veces (el
 * 25/09 había dos "El Senado aprueba la reforma de Zona Fría en Balcarce",
 * de dos medios distintos).
 */
export function titularNormalizado(titulo = '') {
  return sinTildes(titulo)
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

// Las palabras que no distinguen un titular de otro.
const VACIAS = new Set(['de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'un', 'una', 'del',
  'por', 'con', 'para', 'que', 'se', 'su', 'al', 'lo', 'es', 'no', 'mas', 'sobre', 'tras']);

/** Las palabras que cuentan de un titular: más de tres letras y sin vacías. */
function fichasDeTitular(titulo) {
  return new Set(titularNormalizado(titulo).split(' ').filter((w) => w.length > 3 && !VACIAS.has(w)));
}

/**
 * ¿Dos titulares cuentan lo mismo? Sí si son iguales una vez normalizados, o
 * si casi todas las palabras del más corto están en el otro (0,8 o más; es la
 * misma cuenta que `parecido` de ingesta/ingesta.mjs). Con menos de cuatro
 * palabras que cuenten no se compara "casi": dos titulares cortos comparten
 * palabras sin ser la misma historia.
 */
export function titularesParecidos(a = '', b = '', umbral = 0.8) {
  const A = titularNormalizado(a);
  if (A && A === titularNormalizado(b)) return true;
  const FA = fichasDeTitular(a);
  const FB = fichasDeTitular(b);
  if (Math.min(FA.size, FB.size) < 4) return false;
  let comunes = 0;
  for (const w of FA) if (FB.has(w)) comunes += 1;
  return comunes / Math.min(FA.size, FB.size) >= umbral;
}

/**
 * La lista sin notas repetidas: dos que cuentan lo mismo con el mismo titular
 * (o casi) no pueden estar las dos en la portada. El 25/09 "Franco Colapinto
 * larga décimo en el Gran Premio de Azerbaiyán" salió dos veces en
 * Automovilismo: la IA reescribió dos notas de fuentes distintas y dio el
 * mismo titular, y la agrupación de antes no las había juntado.
 *
 * Se queda la de mayor relevancia (a igual relevancia, la más nueva) y la
 * otra sale de la lista. El orden de las que quedan es el de entrada.
 */
export function sinNotasRepetidas(notas = []) {
  const tiempo = (n) => new Date(n.fecha).getTime() || 0;
  const porMerito = [...notas].sort((a, b) => ((b.relevancia ?? 0) - (a.relevancia ?? 0)) || (tiempo(b) - tiempo(a)));
  const quedan = [];
  for (const n of porMerito) {
    // Las notas propias (el dólar, los repasos de los podcasts) nunca son
    // "repetidas": "El repaso de la tarde en Radar Balcarce: …" se parece al de
    // la mañana en casi todo el titular y se sacaba de la portada (26/09).
    if (n.propia || !quedan.some((q) => titularesParecidos(q.titulo, n.titulo))) quedan.push(n);
  }
  const ids = new Set(quedan);
  return notas.filter((n) => ids.has(n));
}
/**
 * ¿Dos notas cuentan la misma historia, aunque el titular sea distinto?
 *
 * Más flojo que `titularesParecidos`, que sólo junta las que dicen lo mismo con
 * las mismas palabras: "Diego Santilli visita Balcarce por la reinauguración
 * del autódromo" y "Diego Santilli llega a Balcarce por el automovilismo" son
 * la misma visita y salían las dos en "Seguí leyendo" (25/09). Es la misma
 * historia si son titulares parecidos, si comparten un tema de los que se
 * siguen, o si comparten tres palabras que cuentan (o dos, cuando son la
 * mitad del titular más corto). "Balcarce" no cuenta: está en todo.
 */
export function mismaHistoria(a, b) {
  if (!a || !b) return false;
  if (titularesParecidos(a.titulo, b.titulo)) return true;
  if ((a.temas ?? []).some((t) => (b.temas ?? []).includes(t))) return true;
  const FA = fichasDeTitular(a.titulo);
  const FB = fichasDeTitular(b.titulo);
  FA.delete('balcarce');
  FB.delete('balcarce');
  let comunes = 0;
  for (const w of FA) if (FB.has(w)) comunes += 1;
  if (comunes >= 3) return true;
  return comunes >= 2 && comunes / Math.max(1, Math.min(FA.size, FB.size)) >= 0.5;
}

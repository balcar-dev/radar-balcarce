// El texto de una nota, sacado de la página del medio original.
//
// Los feeds sólo traen un resumen de unos 200 caracteres. Con eso la IA no
// tiene de dónde sacar un cuerpo de uno a tres párrafos y, para llenarlo,
// inventa nombres y números que el verificador tira (23/09: 13 de 20 notas
// rechazadas). Con el texto completo de la nota tiene de dónde reescribir.
//
// Sin dependencias: sólo fetch y expresiones regulares. Es un extractor
// simple a propósito — junta los párrafos <p> de la nota y descarta lo que
// parece menú, pie o publicidad. Si no encuentra texto suficiente devuelve
// null y la nota se reescribe sólo con el resumen, como antes.
//
// 25/09: de 42 notas publicadas sin cuerpo, 23 no tenían texto completo, y 21
// de esas NO por un bloqueo del medio sino por este extractor (las otras dos:
// Motorsport contesta 403 y una citación del municipio tiene dos renglones):
//   · La Nación, Ámbito, Minuto Uno, Olé y Campeones tienen varios <article>
//     en la página (notas relacionadas, tarjetas) y el primero no es la nota:
//     se tomaba ése y quedaba vacío. Ahora se buscan los párrafos en toda la
//     página y se queda con el tramo de párrafos seguidos más largo, que es
//     la nota (lo relacionado está desparramado entre menús y tarjetas).
//   · Infórmese Primero se lee de Blogger y su enlace es la entrada del feed
//     (XML de Atom), no una página: el texto viene escapado adentro de
//     <content type="html"> y casi sin <p>. Ahora se lee de ahí.

const ENTIDADES = {
  '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>',
  '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú', '&ntilde;': 'ñ',
  '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú', '&Ntilde;': 'Ñ',
  '&ldquo;': '"', '&rdquo;': '"', '&lsquo;': "'", '&rsquo;': "'", '&hellip;': '…', '&ndash;': '–', '&mdash;': '—',
  '&uuml;': 'ü', '&Uuml;': 'Ü', '&iexcl;': '¡', '&iquest;': '¿', '&laquo;': '«', '&raquo;': '»',
};

function decodificar(texto) {
  return String(texto)
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-zA-Z]+;/g, (e) => ENTIDADES[e] ?? ' ');
}

function limpiar(html) {
  return decodificar(String(html).replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

// Lo que aparece en los pies y menús de los medios y no es la nota.
const RUIDO = /(^|\s)(compartir|seguinos|suscri|newsletter|leé también|lee también|leer más|te puede interesar|todos los derechos|©|copyright|publicidad|comentarios|whatsapp|facebook|twitter|outdated browser|navegador desactualizado)(\s|$|:)/i;

// Cuánto HTML puede haber entre dos párrafos de la MISMA nota: una
// publicidad, una foto con epígrafe o un "leé también" en el medio. Lo
// relacionado del costado o del pie está mucho más lejos, separado por menús
// y tarjetas enteras.
const SALTO_MAXIMO = 6000;

const sinBloquesDeRuido = (html) => String(html ?? '')
  .replace(/<(script|style|nav|header|footer|aside|form|noscript|svg|figure|figcaption)[\s\S]*?<\/\1>/gi, ' ');

/**
 * El tramo de párrafos seguidos con más texto de la página: la nota. Los
 * párrafos cortos o de ruido no cuentan, pero tampoco cortan el tramo.
 */
function tramoPrincipal(html) {
  const tramos = [];
  let actual = null;
  for (const m of html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)) {
    const t = limpiar(m[1]);
    if (t.length < 50 || RUIDO.test(t)) continue;
    const inicio = m.index;
    if (!actual || inicio - actual.fin > SALTO_MAXIMO) {
      actual = { parrafos: [], largo: 0, fin: 0 };
      tramos.push(actual);
    }
    if (!actual.parrafos.includes(t)) {
      actual.parrafos.push(t);
      actual.largo += t.length;
    }
    actual.fin = inicio + m[0].length;
  }
  return tramos.reduce((mejor, t) => (t.largo > (mejor?.largo ?? 0) ? t : mejor), null)?.parrafos ?? [];
}

/** Una entrada de un feed de Atom (Blogger): el texto está escapado adentro
 *  de <content type="html">, con los párrafos a veces en <div> o sueltos. */
function parrafosDeAtom(xml) {
  const m = String(xml).match(/<content[^>]*type=['"](?:html|xhtml)['"][^>]*>([\s\S]*?)<\/content>/i);
  if (!m) return null;
  const html = decodificar(m[1].replace(/<!\[CDATA\[|\]\]>/g, ''));
  return sinBloquesDeRuido(html)
    .replace(/<(br|\/p|\/div|\/h\d|\/li|\/blockquote)[^>]*>/gi, '\n')
    .split('\n')
    .map(limpiar)
    .filter((t) => t.length >= 50 && !RUIDO.test(t))
    .filter((t, i, todos) => todos.indexOf(t) === i);
}

const esEntradaDeFeed = (texto) => /^\s*(<\?xml[^>]*\?>\s*)*<entry[\s>]/i.test(texto);

/**
 * Los párrafos de la nota, uno por línea, o null si no hay texto suficiente.
 * @param {string} html
 * @param {{ max?: number, minimo?: number }} [o]
 */
export function extraerTexto(html, { max = 4000, minimo = 300 } = {}) {
  const crudo = String(html ?? '');
  const parrafos = esEntradaDeFeed(crudo)
    ? (parrafosDeAtom(crudo) ?? [])
    : tramoPrincipal(sinBloquesDeRuido(crudo));
  const texto = parrafos.join('\n').slice(0, max);
  return texto.length >= minimo ? texto : null;
}

/** Baja la página y devuelve el texto de la nota, o null si algo falla. */
export async function traerTexto(url, { fetchFn = fetch, timeout = 8000 } = {}) {
  if (!url) return null;
  try {
    const res = await fetchFn(url, {
      headers: { 'user-agent': 'RadarBalcarce/1.0 (+https://radarbalcarce.com)', accept: 'text/html' },
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return null;
    return extraerTexto(await res.text());
  } catch {
    return null;
  }
}

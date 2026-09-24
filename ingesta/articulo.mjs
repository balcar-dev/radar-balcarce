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

const ENTIDADES = {
  '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>',
  '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú', '&ntilde;': 'ñ',
  '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú', '&Ntilde;': 'Ñ',
  '&ldquo;': '"', '&rdquo;': '"', '&lsquo;': "'", '&rsquo;': "'", '&hellip;': '…', '&ndash;': '–', '&mdash;': '—',
};

function limpiar(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-zA-Z]+;/g, (e) => ENTIDADES[e] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Lo que aparece en los pies y menús de los medios y no es la nota.
const RUIDO = /(^|\s)(compartir|seguinos|suscri|newsletter|leé también|lee también|leer más|te puede interesar|todos los derechos|©|copyright|publicidad|comentarios|whatsapp|facebook|twitter)(\s|$|:)/i;

/**
 * Los párrafos de la nota, uno por línea, o null si no hay texto suficiente.
 * @param {string} html
 * @param {{ max?: number, minimo?: number }} [o]
 */
export function extraerTexto(html, { max = 4000, minimo = 300 } = {}) {
  let cuerpo = String(html ?? '')
    .replace(/<(script|style|nav|header|footer|aside|form|noscript|svg)[\s\S]*?<\/\1>/gi, ' ');
  const dentro = cuerpo.match(/<article[\s\S]*?<\/article>/i);
  if (dentro) cuerpo = dentro[0];

  const parrafos = [];
  for (const m of cuerpo.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = limpiar(m[1]);
    if (t.length < 50 || RUIDO.test(t)) continue;
    if (!parrafos.includes(t)) parrafos.push(t);
  }
  const texto = parrafos.join('\n').slice(0, max);
  return texto.length >= minimo ? texto : null;
}

/** Baja la página y devuelve el texto de la nota, o null si algo falla. */
export async function traerTexto(url, { fetchFn = fetch, timeout = 8000 } = {}) {
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

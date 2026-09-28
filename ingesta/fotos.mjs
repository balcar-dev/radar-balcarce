// El banco de fotos (PENDIENTES.md, "El banco de fotos propio"): primer paso,
// una comparación de verdad con IA. Cuando una nota tiene 2 medios o más que
// la cubrieron, se les pide la foto principal de cada uno y se le muestran
// las dos (o las que haya) a una IA con visión para que elija la que mejor
// sirve, y para que avise si alguna tiene una marca de agua o el nombre de
// otro medio adentro (más cuidado con los medios locales y de la zona:
// CRITERIO-EDITORIAL.md, "Las fotos"). Nunca elige una foto marcada: si la
// mejor tiene marca, usa la mejor SIN marca en su lugar, aunque no sea la
// ideal (Hernán, 28/09); si ninguna sirve sin marca, no elige ninguna.
//
// Si ninguna fuente sirve y la nota es claramente sobre una sola persona
// pública identificable (`personaPublicaDeNota`), se prueba una foto libre
// de Wikimedia Commons antes de resignarse a la placa (`buscarFotoWikimedia`,
// 28/09, idea de Hernán al ver el caso de Mariano Werner: una sola fuente,
// con marca de agua, y una figura fácil de identificar).
//
// Usa la clave de clasificación (GEMINI_API_KEY_CLASIFICACION) y, si falla o
// se queda sin cupo, Groq con un modelo con visión (28/09: Llama 4 Scout, el
// único con visión que Groq aloja gratis). Sin dependencias: sólo fetch de
// Node.

import { claveClasificacion, claveGroq } from '../reels/claves.mjs';

const MODELO_GEMINI = 'gemini-flash-lite-latest';
// El modelo con visión que documenta Groq hoy (confirmado el 28/09 en
// console.groq.com/docs/vision: Llama 4 Scout, con el que se armó esto al
// principio, ya no figura ahí y daba 404 en la corrida real). El gpt-oss-120b
// que usa la lectura con IA sigue siendo sólo de texto.
const MODELO_GROQ_VISION = 'qwen/qwen3.8-27b';

const ESPERA = 20_000;
// No tiene sentido bajar una foto de 15 MB para mandarla achicada a la IA:
// además de lento, algunas APIs rechazan páginas muy pesadas.
const TAMANO_MAXIMO = 6 * 1024 * 1024;

/** La primera imagen que la página dice que es la principal (og:image o,
 *  si no está, twitter:image). No es una lectura completa del HTML: alcanza
 *  con esto porque son las mismas etiquetas que ya lee `web/scripts/auditar-seo-vivo.mjs`. */
export function imagenPrincipalDe(html) {
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (og) return og[1];
  const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  return tw ? tw[1] : null;
}

/** Trae la foto principal de cada fuente que cubrió la nota (fuentesConsultadas,
 *  o el único medio si es una nota de una sola fuente). No baja la imagen
 *  todavía: sólo la dirección. */
export async function candidatasDeNota(nota, { fetchFn = fetch } = {}) {
  const fuentes = nota.fuentesConsultadas?.length
    ? nota.fuentesConsultadas
    : (nota.enlace ? [{ medio: nota.medios?.[0] ?? nota.medio ?? 'la fuente', enlace: nota.enlace }] : []);
  const candidatas = [];
  for (const f of fuentes) {
    if (!f.enlace) continue;
    try {
      const res = await fetchFn(f.enlace, { signal: AbortSignal.timeout(ESPERA), headers: { 'user-agent': 'Mozilla/5.0 (compatible; RadarBalcarceBot/1.0)' } });
      if (!res.ok) { candidatas.push({ medio: f.medio, enlace: f.enlace, imagen: null, error: `HTTP ${res.status}` }); continue; }
      const html = await res.text();
      const imagen = imagenPrincipalDe(html);
      candidatas.push({ medio: f.medio, enlace: f.enlace, imagen });
    } catch (e) {
      candidatas.push({ medio: f.medio, enlace: f.enlace, imagen: null, error: e.message });
    }
  }
  return candidatas;
}

/** Baja una imagen y la deja en base64, lista para mandar a una IA con
 *  visión. `null` si no se pudo (falló, no es una imagen, o pesa de más). */
export async function descargarImagen(url, { fetchFn = fetch } = {}) {
  try {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(ESPERA), headers: { 'user-agent': 'Mozilla/5.0 (compatible; RadarBalcarceBot/1.0)' } });
    if (!res.ok) return null;
    const tipo = res.headers.get('content-type') ?? '';
    if (!tipo.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > TAMANO_MAXIMO) return null;
    return { mime: tipo.split(';')[0], base64: buf.toString('base64') };
  } catch {
    return null;
  }
}

/** Junta candidatas + imagen bajada, para las que sirven. */
export async function candidatasConDatos(nota, { fetchFn = fetch } = {}) {
  const candidatas = await candidatasDeNota(nota, { fetchFn });
  const conDatos = [];
  for (const c of candidatas) {
    if (!c.imagen) { conDatos.push({ ...c, datos: null }); continue; }
    const datos = await descargarImagen(c.imagen, { fetchFn });
    conDatos.push({ ...c, datos });
  }
  return conDatos;
}

const LETRAS = 'ABCDEFGH';

function instruccion(nota, candidatas) {
  const lista = candidatas.map((c, i) => `${LETRAS[i]}) medio: ${c.medio}`).join('\n');
  return `Sos el editor de fotos de Radar Balcarce, un medio digital de Balcarce (Buenos Aires).
Para la nota "${nota.titulo}" (sección ${nota.seccion}), tenés estas fotos, una por medio que cubrió el hecho.
Cada imagen que sigue está identificada con su letra, en el mismo orden de esta lista:
${lista}

Elegí la que mejor sirve para ilustrar la nota: mejor encuadre y nitidez, que se identifique bien el hecho, sin gente
irreconocible de más ni nada de mal gusto. Si dos son casi iguales, preferí la de mejor calidad de imagen.

Muy importante: mirá cada foto ENTERA, no sólo el centro, buscando específicamente un logo, un nombre o una marca de
agua que el MEDIO haya agregado a la imagen después de sacarla, para identificarse como la fuente de la foto (casi
siempre en una esquina, a veces semitransparente). Los medios locales y de la zona (de Balcarce o de ciudades
cercanas, no los grandes diarios nacionales) son los que más acostumbran poner su logo así: prestales más atención.
"tiene_marca" es sólo para ESO. NO es "tiene_marca": un cartel de sponsor, el logo de un club o equipo, el nombre de
un evento, un tablero o una pantalla, o cualquier otro logo que ya estaba ahí cuando se sacó la foto, aunque se vea
grande o nítido — eso es parte de la escena real, no algo que el medio le agregó después. Si dudás si un logo es del
medio o de la escena, pensá: ¿podría estar en una foto que sacó cualquier otra persona presente ese día? Si sí, no
es "tiene_marca".

Regla que no se negocia: "elegida" NUNCA puede ser la letra de una foto a la que vos mismo le pusiste "tiene_marca"
en true, aunque sea la que mejor encuadre o nitidez tenga. Si la mejor foto tiene marca, elegí la mejor ENTRE LAS
QUE NO TIENEN MARCA, aunque no sea la ideal: una foto sin marca y sin ser perfecta sirve más que ninguna. Sólo
dejá "elegida" en null si NINGUNA foto de la lista está libre de marca.

Devolvé sólo un objeto JSON con esta forma exacta:
{"elegida": "A" (la letra, o null si ninguna sirve), "razon": "una frase corta explicando por qué",
"fotos": [{"letra": "A", "tiene_marca": false, "detalle": "qué viste, o vacío si no tiene nada"}]}
con una entrada en "fotos" por cada letra de la lista, en el mismo orden.`;
}

const letraValida = (l) => typeof l === 'string' && LETRAS.includes(l);

/** Interpreta la respuesta (misma forma venga de Gemini o de Groq) contra
 *  las candidatas reales, y arma el resultado final. Nunca confía a ciegas
 *  en la letra elegida: si la IA marcó esa foto con una marca de agua, o si
 *  la letra no corresponde a ninguna candidata con imagen, no se elige nada. */
function interpretarRespuesta(obj, candidatas) {
  const fotos = Array.isArray(obj?.fotos) ? obj.fotos : [];
  const porLetra = new Map(fotos.filter((f) => letraValida(f?.letra)).map((f) => [f.letra, f]));
  const conMarca = new Set([...porLetra.entries()].filter(([, f]) => f.tiene_marca === true).map(([l]) => l));

  const resultado = candidatas.map((c, i) => {
    const letra = LETRAS[i];
    const f = porLetra.get(letra);
    return {
      medio: c.medio, enlace: c.enlace, imagen: c.imagen,
      sospechaMarca: f ? f.tiene_marca === true : null,
      detalle: f?.detalle ?? null,
    };
  });

  let elegida = null;
  let razon = String(obj?.razon ?? '').slice(0, 300);
  if (letraValida(obj?.elegida) && conMarca.has(obj.elegida)) {
    // La instrucción le pide que nunca elija una marcada (28/09), pero por
    // si igual pasa: se busca la mejor candidata SIN marca en su lugar, en
    // vez de resignarse a ninguna foto (Hernán, 28/09: "aunque no sea la
    // ideal" es mejor que la placa). No es un ranking de calidad —eso ya lo
    // intentó la IA y falló—, es la primera que sirve.
    const i = LETRAS.indexOf(obj.elegida);
    const medio = candidatas[i]?.medio ?? 'esa fuente';
    const detalle = porLetra.get(obj.elegida)?.detalle;
    const iSinMarca = candidatas.findIndex((c, j) => c.datos && !conMarca.has(LETRAS[j]));
    if (iSinMarca >= 0) {
      elegida = { ...resultado[iSinMarca], letra: LETRAS[iSinMarca] };
      razon = `La IA había preferido la de ${medio}, pero tiene marca de agua${detalle ? ` (${detalle})` : ''}: se usa ${resultado[iSinMarca].medio} en su lugar, sin marca, aunque no sea la ideal.`;
    } else {
      razon = `La mejor foto era la de ${medio}, pero tiene marca de agua${detalle ? ` (${detalle})` : ''}, y ninguna de las otras sirve sin marca: no se elige ninguna.`;
    }
  } else if (letraValida(obj?.elegida)) {
    const i = LETRAS.indexOf(obj.elegida);
    if (candidatas[i]?.datos) elegida = { ...resultado[i], letra: obj.elegida };
  }
  return { elegida, razon, candidatas: resultado };
}

/** Un pedido a Gemini, con las fotos como `inlineData`. */
async function pedirAGemini(nota, candidatas, { clave, fetchFn = fetch, modelo = MODELO_GEMINI } = {}) {
  const conFoto = candidatas.filter((c) => c.datos);
  if (conFoto.length === 0) return null;
  const parts = [{ text: instruccion(nota, conFoto) }];
  for (const c of conFoto) parts.push({ inlineData: { mimeType: c.datos.mime, data: c.datos.base64 } });
  const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
  const j = await res.json();
  const texto = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  let obj;
  try { obj = JSON.parse(texto); } catch { throw new Error('la respuesta no es JSON'); }
  return interpretarRespuesta(obj, conFoto);
}

/** El mismo pedido, pero con Groq (API de OpenAI: un solo mensaje con texto
 *  e imágenes como `image_url` en base64). */
async function pedirAGroq(nota, candidatas, { clave, fetchFn = fetch, modelo = MODELO_GROQ_VISION } = {}) {
  const conFoto = candidatas.filter((c) => c.datos);
  if (conFoto.length === 0) return null;
  const content = [{ type: 'text', text: instruccion(nota, conFoto) }];
  for (const c of conFoto) content.push({ type: 'image_url', image_url: { url: `data:${c.datos.mime};base64,${c.datos.base64}` } });
  const res = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${clave}` },
    body: JSON.stringify({ model: modelo, messages: [{ role: 'user', content }], response_format: { type: 'json_object' }, temperature: 0 }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
  const j = await res.json();
  const texto = j.choices?.[0]?.message?.content ?? '';
  let obj;
  try { obj = JSON.parse(texto); } catch { throw new Error('la respuesta no es JSON'); }
  return interpretarRespuesta(obj, conFoto);
}

/**
 * Compara las fotos candidatas de una nota y elige la mejor (o ninguna).
 * Gemini primero; si falla o se queda sin cupo, Groq. Nunca lanza: si las
 * dos fallan, devuelve `{ elegida: null, error: '…' }` y la nota se queda sin
 * foto, como hoy.
 */
export async function elegirFoto(nota, candidatas, {
  clave = claveClasificacion(), claveRespaldo = claveGroq(), fetchFn = fetch,
} = {}) {
  const conFoto = candidatas.filter((c) => c.datos);
  if (conFoto.length === 0) return { elegida: null, razon: 'sin fotos para comparar', candidatas, proveedor: null };
  if (clave) {
    try {
      const r = await pedirAGemini(nota, candidatas, { clave, fetchFn });
      return { ...r, proveedor: 'gemini' };
    } catch (e) {
      if (!claveRespaldo) return { elegida: null, razon: `Gemini falló: ${e.message}`, candidatas, proveedor: null };
    }
  }
  if (claveRespaldo) {
    try {
      const r = await pedirAGroq(nota, candidatas, { clave: claveRespaldo, fetchFn });
      return { ...r, proveedor: 'groq' };
    } catch (e) {
      return { elegida: null, razon: `Groq también falló: ${e.message}`, candidatas, proveedor: null };
    }
  }
  return { elegida: null, razon: 'sin clave para comparar', candidatas, proveedor: null };
}

/** ¿La nota es sobre UNA sola persona pública identificable? Sólo texto, sin
 *  visión: es mucho más liviano que comparar fotos y no hace falta pedirlo
 *  si ya se eligió una foto de las fuentes. */
async function pedirPersonaPublica(nota, { clave, fetchFn = fetch, modelo = MODELO_GEMINI } = {}) {
  const texto = `Mirá el título y la bajada de esta nota de Radar Balcarce, un medio digital de Balcarce (Buenos Aires).
Título: "${nota.titulo}"
Bajada: "${nota.copete ?? ''}"

¿Es centralmente sobre UNA sola persona pública identificable (un deportista, un funcionario, una figura conocida,
alguien con página en Wikipedia)? Si sí, devolvé su nombre completo tal como se la conoce (por ejemplo "Mariano
Werner" o "León XIV"). Si es sobre un hecho, una institución, dos o más personas por igual, o alguien sin
identidad pública clara, devolvé null.

Devolvé sólo un objeto JSON: {"persona": "Nombre Apellido" (o null)}`;
  const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
    body: JSON.stringify({ contents: [{ parts: [{ text: texto }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
  const j = await res.json();
  const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  let obj;
  try { obj = JSON.parse(t); } catch { return null; }
  const persona = obj?.persona;
  return (typeof persona === 'string' && persona.trim().length >= 3) ? persona.trim() : null;
}

/** Nunca lanza: sin nombre claro, devuelve null y la nota se queda sin foto,
 *  como hoy. */
export async function personaPublicaDeNota(nota, { clave = claveClasificacion(), fetchFn = fetch } = {}) {
  if (!clave) return null;
  try {
    return await pedirPersonaPublica(nota, { clave, fetchFn });
  } catch {
    return null;
  }
}

// Sólo licencias que de verdad permiten reusar la foto sin pedir permiso.
// "Sólo con atribución" alcanza (el crédito ya va siempre en la cita); lo que
// no está en esta lista (por ejemplo "todos los derechos reservados", que
// Commons también aloja para material de archivo) se descarta.
const WIKIMEDIA_LICENCIAS_LIBRES = /^(cc0|cc[\s-]?by(?:[\s-]?sa)?|public domain|dominio p[uú]blico|\bpd\b)/i;

/** Busca una foto libre de una persona puntual en Wikimedia Commons: sin
 *  clave, sin costo, y con la licencia siempre a la vista (`extmetadata`).
 *  Devuelve la primera que sea una foto de verdad (no un logo ni un mapa) y
 *  tenga una licencia libre, o null si no hay ninguna que sirva. */
export async function buscarFotoWikimedia(nombre, { fetchFn = fetch, limite = 6 } = {}) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search`
    + `&gsrsearch=${encodeURIComponent(`intitle:"${nombre}"`)}&gsrnamespace=6&gsrlimit=${limite}`
    + `&prop=imageinfo&iiprop=url|mime|extmetadata|size&format=json&origin=*`;
  try {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(ESPERA), headers: { 'user-agent': 'Mozilla/5.0 (compatible; RadarBalcarceBot/1.0)' } });
    if (!res.ok) return null;
    const j = await res.json();
    const paginas = Object.values(j?.query?.pages ?? {});
    for (const p of paginas) {
      const info = p.imageinfo?.[0];
      if (!info || !/^image\/(jpeg|png)$/.test(info.mime ?? '')) continue;
      if ((info.width ?? 0) < 400 || (info.height ?? 0) < 300) continue;
      const licencia = info.extmetadata?.LicenseShortName?.value ?? '';
      if (!WIKIMEDIA_LICENCIAS_LIBRES.test(licencia)) continue;
      return { medio: 'Wikimedia Commons', enlace: info.descriptionurl, imagen: info.url, licencia };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * El armado completo para una nota: compara las fotos de las fuentes y,
 * si ninguna sirve, prueba con una foto libre de la persona de la nota en
 * Wikimedia Commons (28/09). Nunca lanza.
 */
export async function elegirFotoParaNota(nota, {
  clave = claveClasificacion(), claveRespaldo = claveGroq(), fetchFn = fetch,
} = {}) {
  const candidatas = await candidatasConDatos(nota, { fetchFn });
  const r = await elegirFoto(nota, candidatas, { clave, claveRespaldo, fetchFn });
  if (r.elegida) return { ...r, origen: 'medio' };

  const persona = await personaPublicaDeNota(nota, { clave, fetchFn });
  if (!persona) return { ...r, origen: 'ninguna' };
  const wiki = await buscarFotoWikimedia(persona, { fetchFn });
  if (!wiki) return { ...r, razon: `${r.razon} (se probó una foto libre de "${persona}" en Wikimedia Commons, sin resultado)`, origen: 'ninguna' };
  return {
    elegida: { medio: wiki.medio, enlace: wiki.enlace, imagen: wiki.imagen, licencia: wiki.licencia, letra: null },
    razon: `Ninguna fuente tenía una foto que sirviera; se usó una foto libre de "${persona}" de Wikimedia Commons (${wiki.licencia}).`,
    candidatas: r.candidatas,
    proveedor: r.proveedor,
    origen: 'wikimedia',
  };
}

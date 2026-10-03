// Búsqueda en internet CON el texto de las notas (3/10/2026, Tavily): lo que necesitan las Pistas para "hacer la nota" (panel/nota-de-pista.mjs).
// Google Noticias (ingesta/pistas.mjs) sólo dice quién publicó algo; esto trae además el texto de cada página, para escribir una nota propia
// con datos de las fuentes y verificarla contra ellas.
//
// La clave (TAVILY_API_KEY) vive en GitHub Secrets y viaja en un encabezado, nunca en la dirección ni en un mensaje de error. Qué trae una
// búsqueda se sondeó el 3/10 (redes/sondear-tavily.mjs): resultados con url, title, content (resumen), raw_content (texto) y score; las redes
// (Facebook, Instagram) casi nunca traen texto. Sin dependencias.

import { leerVariable } from '../reels/claves.mjs';

const ENDPOINT = 'https://api.tavily.com';

export const BUSQUEDA = {
  /** Cuántos resultados por búsqueda. */
  resultados: 6,
  /** Hasta cuántos días atrás mira. */
  dias: 30,
  /** Un texto más corto que esto no sirve para escribir (una portada, un resumen, un posteo). */
  textoMinimo: 600,
  /** Cuánto texto de cada página se guarda (caracteres): alcanza para una nota y cuida el tope de la IA. */
  textoMaximo: 9000,
  /** Cuántas fuentes se usan como máximo para escribir. */
  fuentes: 4,
};

/** Sitios que no traen texto que se pueda citar: sólo prueban que alguien lo dijo. */
export const SITIOS_SIN_TEXTO = ['facebook.com', 'instagram.com', 'x.com', 'twitter.com', 'tiktok.com', 'youtube.com', 'youtu.be', 'whatsapp.com', 'threads.net', 't.me'];

export const claveDeBusqueda = (o) => leerVariable('TAVILY_API_KEY', o);

const sitioDe = (url) => { try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };

/** El nombre de un medio a partir de su dirección, cuando la búsqueda no lo trae: "www.diariolavanguardia.com" → "diariolavanguardia.com". */
export const medioDe = (url) => sitioDe(url);

/** ¿Es un sitio sin texto (una red)? */
export const esDeRedes = (url) => SITIOS_SIN_TEXTO.some((s) => sitioDe(url) === s || sitioDe(url).endsWith(`.${s}`));

/**
 * Una búsqueda de noticias con el texto de cada página. Devuelve [{ url, titulo, medio, fecha, resumen, texto, puntaje }] (sin las redes y
 * sin lo que trae poco texto), o lanza si la clave no sirve o el servicio falla (con `status`).
 */
export async function buscarConTexto(consulta, { clave = claveDeBusqueda(), fetchFn = fetch, dias = BUSQUEDA.dias, maximo = BUSQUEDA.resultados } = {}) {
  if (!clave) throw Object.assign(new Error('falta TAVILY_API_KEY'), { status: 401 });
  const res = await fetchFn(`${ENDPOINT}/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${clave}` },
    body: JSON.stringify({
      query: String(consulta).slice(0, 380), topic: 'news', search_depth: 'advanced', max_results: maximo, include_raw_content: 'text',
      time_range: dias <= 7 ? 'week' : 'month', exclude_domains: SITIOS_SIN_TEXTO,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const detalle = String(await (res.text?.() ?? '')).replace(/\s+/g, ' ').slice(0, 160);
    throw Object.assign(new Error(`Tavily HTTP ${res.status}${detalle ? `: ${detalle}` : ''}`), { status: res.status });
  }
  const j = await res.json();
  return (j.results ?? [])
    .filter((r) => r?.url && !esDeRedes(r.url))
    .map((r) => ({
      url: r.url, titulo: String(r.title ?? '').trim(), medio: medioDe(r.url), fecha: r.published_date ?? null, resumen: String(r.content ?? '').trim(),
      texto: String(r.raw_content ?? '').trim().slice(0, BUSQUEDA.textoMaximo), puntaje: r.score ?? 0,
    }))
    .filter((r) => r.texto.length >= BUSQUEDA.textoMinimo);
}

/** Junta lo que trajeron varias búsquedas: sin repetir una página, de mayor a menor puntaje, hasta `maximo`. */
export function juntarFuentes(resultados = [], maximo = BUSQUEDA.fuentes) {
  const vistas = new Set();
  const sitios = new Map();
  const unicas = [];
  for (const r of resultados.flat().sort((a, b) => (b.puntaje ?? 0) - (a.puntaje ?? 0))) {
    const clave = r.url.replace(/[?#].*$/, '').replace(/\/$/, '');
    if (vistas.has(clave)) continue;
    // Dos páginas del mismo sitio no son dos medios: una sola por sitio.
    if (sitios.has(r.medio)) continue;
    vistas.add(clave);
    sitios.set(r.medio, true);
    unicas.push(r);
  }
  return unicas.slice(0, maximo);
}

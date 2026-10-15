// Sondeo de fuentes desde la red de Cloudflare (15/10/2026, fase 2 de docs/etapa-10-operacion/ANALISIS.md).
// Pregunta: ¿los feeds que desde GitHub Actions "no llegan a conectar" contestan si los pide Cloudflare?
// Un Worker de prueba, SIN cron y SIN dependencias: no toca nada de producción y se borra cuando sirvió (LEEME.md).
//
// GET /sondear?lote=N[&ua=navegador|robot]  con el encabezado  x-sondeo-token: <SONDEO_TOKEN>
//   Pide un lote de LOTE feeds de la lista guardada al subir el Worker (lista.json, generada con generar-lista.mjs) y devuelve, por cada uno:
//   id, url, http, contentType, bytes, formato, items, nuevo (la fecha más nueva que trae), ms y error.
// Sin SONDEO_TOKEN cargado en el Worker contesta 503; con un token que no coincide, 401. Nada de esto se guarda.
//
// Límites de Workers que se respetan: 6 conexiones abiertas a la vez (se usan 4), pedidos salientes de sobra (10 por llamada), CPU chica
// (sólo se lee y se analiza hasta TOPE_BYTES de cada feed) y 15 s de tiempo por feed.
import lista from './lista.json' with { type: 'json' };

export const LOTE = 10;
export const SIMULTANEOS = 4;
export const TIEMPO_MS = 15000;
export const TOPE_BYTES = 2_000_000;
// Un navegador de escritorio común (así se ve un lector cualquiera) y, aparte, el nombre que usa hoy el robot (ingesta/ingesta.mjs).
export const AGENTES = {
  navegador: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  robot: 'RadarBalcarce/0.1 (agregador local de noticias de Balcarce)',
};

/** Cuántos lotes hay para una lista. */
export const cantidadDeLotes = (fuentes, tam = LOTE) => Math.ceil(fuentes.length / tam);

/** El lote N (desde 0) de la lista; vacío si N no existe. */
export function loteDe(fuentes, n, tam = LOTE) {
  if (!Number.isInteger(n) || n < 0) return [];
  return fuentes.slice(n * tam, (n + 1) * tam);
}

const quitarCdata = (s) => s.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '').trim();

/** Qué clase de documento es: rss, atom, sitemap, indice-de-sitemaps, html u otro. */
export function formatoDe(texto) {
  const t = texto.slice(0, 5000);
  if (/<urlset[\s>]/i.test(t)) return 'sitemap';
  if (/<sitemapindex[\s>]/i.test(t)) return 'indice-de-sitemaps';
  if (/<rss[\s>]/i.test(t) || /<rdf:RDF[\s>]/i.test(t)) return 'rss';
  if (/<feed[\s>]/i.test(t)) return 'atom';
  if (/<channel[\s>]/i.test(t)) return 'rss';
  if (/<!doctype html|<html[\s>]/i.test(t)) return 'html';
  return 'otro';
}

/** Cuántas notas trae un RSS (<item>), un Atom (<entry>) o un sitemap de noticias (<url>). Para html y otros: null. */
export function contarItems(texto, formato = formatoDe(texto)) {
  const cuenta = (re) => (texto.match(re) ?? []).length;
  if (formato === 'rss') return cuenta(/<item[\s>]/gi);
  if (formato === 'atom') return cuenta(/<entry[\s>]/gi);
  if (formato === 'sitemap') return cuenta(/<url[\s>]/gi); // en un RSS <url> es el logo: por eso sólo se cuenta si es un sitemap
  if (formato === 'indice-de-sitemaps') return cuenta(/<sitemap[\s>]/gi);
  return null;
}

/** La fecha más nueva que aparece en el documento (ISO), o null. Mira pubDate, dc:date, published, updated, lastmod y publication_date. */
export function fechaMasNueva(texto) {
  const re = /<(?:pubDate|dc:date|published|updated|lastmod|news:publication_date|publication_date)\b[^>]*>([\s\S]{0,80}?)<\//gi;
  let mejor = null;
  let m;
  while ((m = re.exec(texto)) !== null) {
    const t = Date.parse(quitarCdata(m[1]));
    if (Number.isFinite(t) && (mejor === null || t > mejor)) mejor = t;
  }
  return mejor === null ? null : new Date(mejor).toISOString();
}

/** ¿La respuesta parece la pantalla de "verificando que sos humano" de un protector (Cloudflare, etc.) y no el feed? */
export function pareceDesafio(texto, cabeceras) {
  if (cabeceras?.get?.('cf-mitigated')) return true;
  return /just a moment|attention required|enable javascript and cookies|captcha|access denied|are you a human/i.test(texto.slice(0, 4000));
}

/** Lee el cuerpo hasta `tope` bytes (para no gastar memoria ni CPU con feeds enormes). Devuelve { texto, bytes, truncado }. */
export async function leerHasta(res, tope = TOPE_BYTES) {
  if (!res.body) {
    const t = await res.text();
    return { texto: t.slice(0, tope), bytes: t.length, truncado: t.length > tope };
  }
  const lector = res.body.getReader();
  const partes = [];
  let bytes = 0;
  let truncado = false;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    partes.push(value);
    bytes += value.byteLength;
    if (bytes >= tope) { truncado = true; await lector.cancel(); break; }
  }
  const todo = new Uint8Array(bytes);
  let pos = 0;
  for (const p of partes) { todo.set(p, pos); pos += p.byteLength; }
  return { texto: new TextDecoder('utf-8').decode(todo), bytes, truncado };
}

/** Sondea una fuente. Nunca tira: si algo falla, lo dice en `error`. */
export async function sondearUno(fuente, { fetchFn = fetch, agente = AGENTES.navegador, tiempoMs = TIEMPO_MS, ahora = () => Date.now() } = {}) {
  const salida = { id: fuente.id, url: fuente.url, tipo: fuente.tipo, http: null, contentType: null, bytes: 0, formato: null, items: null, nuevo: null, ms: 0, error: null };
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), tiempoMs);
  const t0 = ahora();
  try {
    const res = await fetchFn(fuente.url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': agente, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5', 'accept-language': 'es-AR,es;q=0.9' },
    });
    salida.http = res.status;
    salida.contentType = res.headers.get('content-type');
    if (res.url && res.url !== fuente.url) salida.redirigioA = res.url;
    const { texto, bytes, truncado } = await leerHasta(res);
    salida.bytes = bytes;
    if (truncado) salida.truncado = true;
    salida.formato = formatoDe(texto);
    salida.items = contarItems(texto, salida.formato);
    salida.nuevo = fechaMasNueva(texto);
    if ((!res.ok || salida.formato === 'html') && pareceDesafio(texto, res.headers)) salida.desafio = true;
    if (!res.ok) salida.error = `HTTP ${res.status}`;
  } catch (e) {
    salida.error = e?.name === 'AbortError' ? `tiempo agotado (${Math.round(tiempoMs / 1000)} s)` : String(e?.message ?? e).slice(0, 200);
  } finally {
    clearTimeout(reloj);
    salida.ms = ahora() - t0;
  }
  return salida;
}

/** Sondea una lista con a lo sumo `simultaneos` pedidos a la vez; devuelve los resultados en el mismo orden. */
export async function sondearLote(fuentes, opciones = {}, simultaneos = SIMULTANEOS) {
  const resultados = new Array(fuentes.length);
  let siguiente = 0;
  const obrero = async () => {
    while (siguiente < fuentes.length) {
      const i = siguiente;
      siguiente += 1;
      resultados[i] = await sondearUno(fuentes[i], opciones);
    }
  };
  await Promise.all(Array.from({ length: Math.min(simultaneos, fuentes.length) }, obrero));
  return resultados;
}

/** Compara dos textos sin cortar en el primer carácter distinto (no es criptografía fuerte; alcanza para una llave de uso corto). */
export function mismoToken(a, b) {
  const x = String(a ?? '');
  const y = String(b ?? '');
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) d |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return d === 0;
}

const json = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

/** El pedido HTTP: separado del `export default` para poder probarlo sin red. */
export async function atender(request, env, { fuentes = lista, fetchFn = fetch } = {}) {
  const url = new URL(request.url);
  if (url.pathname !== '/sondear') return json({ error: 'No hay nada acá.' }, 404);
  if (request.method !== 'GET') return json({ error: 'Sólo GET.' }, 405);
  if (!env?.SONDEO_TOKEN) return json({ error: 'El sondeo no está habilitado: falta el secreto SONDEO_TOKEN.' }, 503);
  if (!mismoToken(request.headers.get('x-sondeo-token'), env.SONDEO_TOKEN)) return json({ error: 'No autorizado.' }, 401);
  const lotes = cantidadDeLotes(fuentes);
  const texto = url.searchParams.get('lote') ?? '0';
  const n = /^\d+$/.test(texto) ? Number(texto) : -1;
  if (n < 0 || n >= lotes) return json({ error: `lote inválido: va de 0 a ${lotes - 1}`, lotes }, 400);
  const ua = url.searchParams.get('ua') === 'robot' ? 'robot' : 'navegador';
  const resultados = await sondearLote(loteDe(fuentes, n), { fetchFn, agente: AGENTES[ua] });
  return json({ lote: n, lotes, total: fuentes.length, ua, resultados });
}

export default {
  fetch: (request, env) => atender(request, env),
};

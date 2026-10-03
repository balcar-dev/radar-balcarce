// Sondea la clave de Tavily (3/10/2026, para "Hacer la nota" de las Pistas): UNA búsqueda de noticias y UNA extracción, y cuenta qué llegó
// (cuántos resultados, de qué sitios, cuánto texto trae cada uno). A mano: Actions → Sondear búsqueda. Nunca imprime la clave.
import { leerVariable } from '../reels/claves.mjs';

const clave = leerVariable('TAVILY_API_KEY');
if (!clave) { console.log('TAVILY_API_KEY: no está'); process.exit(0); }
const pedir = async (ruta, cuerpo) => {
  const res = await fetch(`https://api.tavily.com/${ruta}`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${clave}` }, body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(60_000),
  });
  const j = await res.json().catch(() => ({}));
  return { res, j };
};

const { res, j } = await pedir('search', { query: 'Ultra Trail Tierras del Diablo Balcarce', topic: 'news', search_depth: 'advanced', max_results: 6, include_raw_content: 'text', time_range: 'month' });
console.log(`search: HTTP ${res.status}${j.usage ? `, uso ${JSON.stringify(j.usage)}` : ''}${j.response_time ? `, ${j.response_time}s` : ''}`);
if (!res.ok) console.log(`   ${JSON.stringify(j).slice(0, 300)}`);
for (const r of j.results ?? []) {
  console.log(`   · ${new URL(r.url).hostname} | ${String(r.title ?? '').slice(0, 70)} | fecha ${r.published_date ?? '—'} | resumen ${String(r.content ?? '').length} | texto ${String(r.raw_content ?? '').length} | puntaje ${r.score}`);
}
const primero = (j.results ?? []).find((r) => r.url);
if (primero) {
  const e = await pedir('extract', { urls: [primero.url], format: 'text' });
  console.log(`extract: HTTP ${e.res.status}, resultados ${(e.j.results ?? []).length}, fallidos ${(e.j.failed_results ?? []).length}, texto ${String((e.j.results ?? [])[0]?.raw_content ?? '').length}`);
  if (!e.res.ok) console.log(`   ${JSON.stringify(e.j).slice(0, 300)}`);
}
console.log(`campos de un resultado: ${Object.keys((j.results ?? [])[0] ?? {}).join(', ')}`);

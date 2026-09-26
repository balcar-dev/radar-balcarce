// Mira, sólo mirando, qué hay publicado de verdad en la página de Facebook:
// posteos, reels y historias, con fecha. Sirve para comparar con lo que anota
// nuestro libro (web/data/redes.json) cuando algo no cuadra. No publica nada.
//   node redes/ver-facebook.mjs        (con META_TOKEN)
import { sinToken } from './meta.mjs';

const PAGINA = process.env.META_PAGINA_ID ?? '1254237411116171';
const token = process.env.META_TOKEN;
if (!token) { console.log('Falta META_TOKEN.'); process.exit(1); }
const BASE = 'https://graph.facebook.com/v23.0';

async function pedir(camino, params = {}, conToken = token) {
  const url = new URL(`${BASE}/${camino}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const r = await fetch(url, { headers: { Authorization: `Bearer ${conToken}` }, signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(sinToken(sinToken(j.error?.message ?? `HTTP ${r.status}`, token), conToken));
  return j;
}
const hora = (t) => new Date(t).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const corto = (t) => String(t ?? '').replace(/\s+/g, ' ').slice(0, 70);

const pag = await pedir(PAGINA, { fields: 'name,fan_count,followers_count,access_token' });
const tp = pag.access_token ?? token;
console.log(`Página: ${pag.name} · seguidores ${pag.followers_count ?? '?'} · me gusta ${pag.fan_count ?? '?'}`);

async function seccion(titulo, camino, campos, mostrar) {
  try {
    const j = await pedir(`${PAGINA}/${camino}`, { fields: campos, limit: 30 }, tp);
    const datos = j.data ?? [];
    console.log(`\n${titulo}: ${datos.length} (los últimos 30)`);
    const porDia = {};
    for (const d of datos) { const k = hora(d.created_time ?? d.creation_time ?? d.updated_time).slice(0, 5); porDia[k] = (porDia[k] || 0) + 1; }
    console.log('  por día:', JSON.stringify(porDia));
    for (const d of datos.slice(0, 6)) console.log('  ·', hora(d.created_time ?? d.creation_time ?? d.updated_time), mostrar(d));
  } catch (e) { console.log(`\n${titulo}: no se pudo leer (${e.message.slice(0, 140)})`); }
}

await seccion('Posteos del feed', 'published_posts', 'created_time,message,permalink_url,is_published', (d) => `${corto(d.message)} ${d.permalink_url ?? ''}`);
await seccion('Reels', 'video_reels', 'created_time,description,permalink_url,status', (d) => `${corto(d.description)} ${d.permalink_url ?? ''}`);
await seccion('Videos', 'videos', 'created_time,description,permalink_url', (d) => `${corto(d.description)} ${d.permalink_url ?? ''}`);
await seccion('Historias', 'stories', 'creation_time,status,url', (d) => `${d.status ?? ''} ${d.url ?? ''}`);

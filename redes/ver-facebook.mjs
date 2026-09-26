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
// Meta manda la hora de los posteos como texto ISO (con "+0000") y la de las
// historias de Facebook (`creation_time`) como segundos Unix: sin distinguir,
// salía "Invalid Date".
const aFecha = (t) => new Date(typeof t === 'number' || /^\d{9,11}$/.test(String(t)) ? Number(t) * 1000 : String(t).replace(/([+-]\d\d)(\d\d)$/, '$1:$2'));
const hora = (t) => aFecha(t).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const dia = (t) => aFecha(t).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit' });
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
    for (const d of datos) { const k = dia(d.created_time ?? d.creation_time ?? d.updated_time); porDia[k] = (porDia[k] || 0) + 1; }
    console.log('  por día:', JSON.stringify(porDia));
    for (const d of datos.slice(0, 6)) console.log('  ·', hora(d.created_time ?? d.creation_time ?? d.updated_time), mostrar(d));
  } catch (e) { console.log(`\n${titulo}: no se pudo leer (${e.message.slice(0, 140)})`); }
}

await seccion('Posteos del feed', 'published_posts', 'created_time,message,permalink_url,is_published', (d) => `${corto(d.message)} ${d.permalink_url ?? ''}`);
await seccion('Reels', 'video_reels', 'created_time,description,permalink_url,status,length', (d) => `${corto(d.description)} ${d.permalink_url ?? ''} estado=${JSON.stringify(d.status ?? {}).slice(0, 160)} duración=${d.length ?? '?'}s`);
await seccion('Videos', 'videos', 'created_time,description,permalink_url', (d) => `${corto(d.description)} ${d.permalink_url ?? ''}`);
await seccion('Historias', 'stories', 'creation_time,status,url', (d) => `${d.status ?? ''} ${d.url ?? ''}`);

// --- ¿Lo ve el público? Visibilidad de la página, de los posteos y de los reels.
async function visibilidad() {
  console.log('\n== Visibilidad ==');
  try {
    const p = await pedir(PAGINA, { fields: 'is_published,is_unclaimed,verification_status,restrictions,has_transitioned_to_new_page_experience' }, tp);
    console.log('Página:', JSON.stringify(p));
  } catch (e) { console.log('Página: no se pudo leer (' + e.message.slice(0, 140) + ')'); }
  try {
    const j = await pedir(`${PAGINA}/published_posts`, { fields: 'created_time,is_published,is_hidden,is_expired,privacy,status_type,permalink_url,message', limit: 8 }, tp);
    for (const d of j.data ?? []) console.log('Posteo', hora(d.created_time), JSON.stringify({ publicado: d.is_published, oculto: d.is_hidden, privacidad: d.privacy?.value ?? d.privacy, tipo: d.status_type }), corto(d.message));
  } catch (e) { console.log('Posteos: no se pudo leer (' + e.message.slice(0, 140) + ')'); }
  try {
    const j = await pedir(`${PAGINA}/video_reels`, { fields: 'created_time,status,permalink_url', limit: 4 }, tp);
    for (const d of j.data ?? []) console.log('Reel', hora(d.created_time), JSON.stringify(d.status ?? {}));
  } catch (e) { console.log('Reels: no se pudo leer (' + e.message.slice(0, 140) + ')'); }
  try {
    const j = await pedir(`${PAGINA}/videos`, { fields: 'created_time,published,privacy,content_category,is_crosspost_video', limit: 4 }, tp);
    for (const d of j.data ?? []) console.log('Video', hora(d.created_time), JSON.stringify({ publicado: d.published, privacidad: d.privacy?.value ?? d.privacy }));
  } catch (e) { console.log('Videos: no se pudo leer (' + e.message.slice(0, 140) + ')'); }
}
await visibilidad();

// --- La app que publica: ¿está lista para que el público vea lo que publica?
// Las publicaciones de una app en modo "Desarrollo" las ven sólo quienes tienen
// un rol en la app (administradores, desarrolladores, probadores).
async function laApp() {
  console.log('\n== La app de Meta ==');
  for (const campos of ['id,name,link,category,privacy_policy_url,terms_of_service_url,user_support_email,app_domains', 'id,name,link,category', 'id,name']) {
    try {
      const a = await pedir('app', { fields: campos });
      console.log('App:', JSON.stringify(a));
      if (!('privacy_policy_url' in a)) console.log('(no pude leer la política de privacidad de la app con este token)');
      break;
    } catch (e) { console.log('App (' + campos.split(',').length + ' campos): ' + e.message.slice(0, 160)); }
  }
  try {
    const t = await pedir('me', { fields: 'id,name' });
    console.log('El token es de:', JSON.stringify(t));
  } catch (e) { console.log('Token: ' + e.message.slice(0, 120)); }
  try {
    const roles = await pedir(PAGINA + '/roles', {}, tp);
    console.log('Roles en la página:', (roles.data ?? []).map((r) => (r.name ?? r.id) + ':' + (r.tasks ?? r.role ?? '')).join(' | ').slice(0, 300));
  } catch (e) { console.log('Roles de la página: ' + e.message.slice(0, 120)); }
}
await laApp();

// Las estadísticas del medio: cuánta gente entra a la web y cómo crecen las
// redes. Se miden dos veces por día (9 y 21, hora de Balcarce) desde el
// vigilante, se guardan en web/data/estadisticas.json para ver la evolución y
// salen en el WhatsApp de la mañana y en el resumen de las 21.
//
//   node redes/estadisticas.mjs    mide ahora y muestra los números y los
//                                  permisos que faltan (no guarda ni avisa;
//                                  lo usa el workflow "Prueba de estadísticas")
//
// De dónde sale cada cosa:
//
//   · La web: Cloudflare Web Analytics, por su API GraphQL (el conjunto
//     rumPageloadEventsAdaptiveGroups). Necesita el ID de la cuenta
//     (CLOUDFLARE_ACCOUNT_ID) y un token con permiso "Account Analytics:
//     Read". El token que ya existe (CLOUDFLARE_API_TOKEN) es para subir el
//     sitio y probablemente no lo tiene: por eso se usa uno propio,
//     CLOUDFLARE_ANALYTICS_TOKEN, y sólo si falta se prueba con el otro.
//     Cloudflare guarda más o menos una de cada diez visitas y estima el
//     resto: los números son aproximados.
//   · Facebook e Instagram: la API de Meta, con el mismo META_TOKEN que
//     publica. Seguidores siempre; vistas, alcance e interacciones sólo si el
//     token tiene los permisos de estadísticas (read_insights e
//     instagram_manage_insights). Lo que no se puede se dice en el registro y
//     se omite en el mensaje.
//
// En estadisticas.json van sólo números agregados (el repositorio es
// público): nada de quién entró ni desde dónde.
//
// Sin dependencias: sólo fetch, con tiempo máximo.

import fs from 'node:fs';
import path from 'node:path';
import { crearCliente } from './meta.mjs';
import { sinSecretos } from './whatsapp.mjs';
import { diaAR, horaAR } from './elegir.mjs';
import { idDeRuta } from '../web/lib/ruta.js';

export const SITIO = 'radarbalcarce.com';
/** El identificador del sitio que Cloudflare pone en el HTML (data-cf-beacon).
 *  No es secreto: está en cada página. A veces el de la API es otro; por eso
 *  primero se le pregunta a Cloudflare cuál corresponde a radarbalcarce.com. */
export const TOKEN_DEL_BEACON = '63fea16828ce46988d62382b0fbabf60';
export const PAGINA_ID = '1254237411116171';
export const MAXIMO_DE_PUNTOS = 120;
export const HORAS_DE_MEDICION = [9, 21];
const GRAPHQL = 'https://api.cloudflare.com/client/v4/graphql';
const ESPERA = 20000;

// ------------------------------------------------------------ cuándo medir

/** El turno de medición que corresponde a esta hora ("2026-09-25/9"), o null
 *  antes de las 9. Cada turno se mide una sola vez. */
export function turnoDeMedicion(ahora = new Date()) {
  const h = horaAR(ahora);
  const turno = [...HORAS_DE_MEDICION].reverse().find((x) => h >= x);
  return turno === undefined ? null : `${diaAR(ahora)}/${turno}`;
}

export function tocaMedir(ahora, estado = {}) {
  const t = turnoDeMedicion(ahora);
  return Boolean(t) && estado?.ultimaMedicion !== t;
}

// ---------------------------------------------------------------- la historia

/** Suma un punto y deja los últimos 120 (dos meses a dos por día). */
export function agregarPunto(puntos = [], punto, maximo = MAXIMO_DE_PUNTOS) {
  return [...(puntos ?? []), punto].slice(-maximo);
}

/** El punto medido hace unas `horas` (el más cercano, con tres horas de margen). */
export function puntoDeHace(puntos = [], ahora, horas, margen = 3) {
  const objetivo = ahora.getTime() - horas * 3600e3;
  let mejor = null;
  for (const p of puntos ?? []) {
    const d = Math.abs(new Date(p.cuando).getTime() - objetivo);
    if (d <= margen * 3600e3 && (!mejor || d < mejor.d)) mejor = { p, d };
  }
  return mejor?.p ?? null;
}

// ---------------------------------------------------------------- Cloudflare

/** Qué token usar: el propio de estadísticas, y si no está, el de Pages. */
export function tokenDeCloudflare(env = {}) {
  if (env.CLOUDFLARE_ANALYTICS_TOKEN) return { token: env.CLOUDFLARE_ANALYTICS_TOKEN, nombre: 'CLOUDFLARE_ANALYTICS_TOKEN' };
  if (env.CLOUDFLARE_API_TOKEN) return { token: env.CLOUDFLARE_API_TOKEN, nombre: 'CLOUDFLARE_API_TOKEN' };
  return { token: null, nombre: null };
}

const PARECE_PERMISO = /auth|permission|not authori[sz]ed|access|forbidden|does not have/i;

async function consultar({ query, token, fetchFn }) {
  let r;
  try {
    r = await fetchFn(GRAPHQL, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(ESPERA),
    });
  } catch (e) {
    return { error: e?.name === 'TimeoutError' ? 'Cloudflare tardó demasiado en contestar' : `no se pudo hablar con Cloudflare (${sinSecretos(e?.message, token)})` };
  }
  let j = null;
  try { j = await r.json(); } catch { /* sin cuerpo */ }
  const errores = (j?.errors ?? []).map((e) => String(e?.message ?? '')).filter(Boolean);
  if (r.status === 401 || r.status === 403 || errores.some((m) => PARECE_PERMISO.test(m))) {
    return { sinPermiso: true, error: sinSecretos(`Cloudflare respondió ${r.status}: ${errores.join('; ') || 'sin permiso'}`.slice(0, 240), token) };
  }
  if (!r.ok || errores.length || !j?.data) {
    return { error: sinSecretos(`Cloudflare respondió ${r.status}: ${errores.join('; ') || 'sin datos'}`.slice(0, 240), token) };
  }
  return { datos: j.data };
}

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const texto = (s) => JSON.stringify(String(s));

/** Cuál es el siteTag de radarbalcarce.com para la API: se le pregunta a
 *  Cloudflare qué sitios de la cuenta tuvieron visitas en la última semana. */
export async function buscarSitio({ cuenta, token, ahora, fetchFn }) {
  const query = `{ viewer { accounts(filter: { accountTag: ${texto(cuenta)} }) {
    sitios: rumPageloadEventsAdaptiveGroups(limit: 50, orderBy: [count_DESC], filter: { datetime_geq: ${texto(iso(ahora.getTime() - 7 * 86400e3))}, datetime_leq: ${texto(iso(ahora.getTime()))} }) {
      count dimensions { siteTag requestHost }
    } } } }`;
  const r = await consultar({ query, token, fetchFn });
  if (!r.datos) return r;
  const cuentas = r.datos.viewer?.accounts ?? [];
  if (!cuentas.length) return { sinPermiso: true, error: 'la cuenta de Cloudflare no aparece (¿ID equivocado o token sin permiso sobre esa cuenta?)' };
  const filas = cuentas[0].sitios ?? [];
  const nuestra = filas.find((f) => String(f.dimensions?.requestHost ?? '').replace(/^www\./, '') === SITIO);
  return { siteTag: nuestra?.dimensions?.siteTag ?? null };
}

/**
 * Visitas y páginas vistas de las últimas 12 y 24 horas, las del mismo
 * período anterior (para comparar) y las tres páginas más vistas del día.
 */
export async function estadisticasDeCloudflare({ cuenta, token, ahora = new Date(), fetchFn = fetch, siteTag = null }) {
  let sitio = siteTag;
  if (!sitio) {
    const b = await buscarSitio({ cuenta, token, ahora, fetchFn });
    if (b.sinPermiso) return { ok: false, sinPermiso: true, error: b.error };
    sitio = b.siteTag ?? TOKEN_DEL_BEACON;
  }
  const t = ahora.getTime();
  const tramo = (alias, desdeH, hastaH, extra = '') => `${alias}: rumPageloadEventsAdaptiveGroups(limit: ${extra ? 4 : 1}${extra ? ', orderBy: [count_DESC]' : ''}, filter: { siteTag: ${texto(sitio)}, datetime_geq: ${texto(iso(t - desdeH * 3600e3))}, datetime_leq: ${texto(iso(t - hastaH * 3600e3))} }) { count sum { visits }${extra} }`;
  const query = `{ viewer { accounts(filter: { accountTag: ${texto(cuenta)} }) {
    ${tramo('u12', 12, 0)}
    ${tramo('a12', 24, 12)}
    ${tramo('u24', 24, 0)}
    ${tramo('a24', 48, 24)}
    ${tramo('top', 24, 0, ' dimensions { requestPath }')}
  } } }`;
  const r = await consultar({ query, token, fetchFn });
  if (!r.datos) return { ok: false, sinPermiso: Boolean(r.sinPermiso), error: r.error };
  const c = r.datos.viewer?.accounts?.[0];
  if (!c) return { ok: false, sinPermiso: true, error: 'la cuenta de Cloudflare no aparece (¿ID equivocado o token sin permiso sobre esa cuenta?)' };
  const de = (alias) => ({ visitas: c[alias]?.[0]?.sum?.visits ?? 0, vistas: c[alias]?.[0]?.count ?? 0 });
  return {
    ok: true,
    siteTag: sitio,
    web: {
      u12: de('u12'), a12: de('a12'), u24: de('u24'), a24: de('a24'),
      top: (c.top ?? []).filter((f) => f.dimensions?.requestPath).slice(0, 3)
        .map((f) => ({ camino: f.dimensions.requestPath, vistas: f.count ?? 0 })),
    },
  };
}

// ---------------------------------------------------------------------- Meta

/** Las métricas que se piden, una por una: si Meta no acepta una (por
 *  permiso o porque la dio de baja, como hizo con "impressions" en 2025), las
 *  otras salen igual. */
export const METRICAS_FACEBOOK = [
  ['vistas', 'page_media_view'],
  ['interacciones', 'page_post_engagements'],
];
export const METRICAS_INSTAGRAM = [
  ['alcance', 'reach'],
  ['vistas', 'views'],
  ['interacciones', 'total_interactions'],
];

export async function estadisticasDeMeta({ token, paginaId = PAGINA_ID, ahora = new Date(), fetchFn = fetch }) {
  const faltan = [];
  const api = crearCliente({ token, paginaId, fetchFn, espera: ESPERA });
  let p;
  try { p = await api.pagina(); } catch (e) {
    return { facebook: null, instagram: null, faltan: [`Meta: no se pudo leer la página (${e.message})`] };
  }
  const conPagina = { conToken: p.tokenPagina };
  const hasta = Math.floor(ahora.getTime() / 1000);
  const desde = hasta - 86400;

  const facebook = {};
  try {
    const j = await api.pedir(paginaId, { ...conPagina, params: { fields: 'followers_count,fan_count' } });
    facebook.seguidores = j.followers_count ?? j.fan_count ?? null;
  } catch (e) { faltan.push(`Facebook, seguidores: ${e.message}`); }
  for (const [clave, metrica] of METRICAS_FACEBOOK) {
    try {
      const j = await api.pedir(`${paginaId}/insights`, { ...conPagina, params: { metric: metrica, period: 'day' } });
      const valor = (j.data?.[0]?.values ?? []).at(-1)?.value;
      if (typeof valor === 'number') facebook[clave] = valor;
      else faltan.push(`Facebook, ${clave} (${metrica}): Meta no devolvió el dato`);
    } catch (e) { faltan.push(`Facebook, ${clave} (${metrica}): ${e.message}`); }
  }

  let instagram = null;
  if (!p.instagramId) faltan.push('Instagram: la página no tiene un Instagram vinculado');
  else {
    instagram = {};
    try {
      const j = await api.pedir(p.instagramId, { ...conPagina, params: { fields: 'followers_count,media_count' } });
      instagram.seguidores = j.followers_count ?? null;
      instagram.publicaciones = j.media_count ?? null;
    } catch (e) { faltan.push(`Instagram, seguidores: ${e.message}`); }
    for (const [clave, metrica] of METRICAS_INSTAGRAM) {
      try {
        const j = await api.pedir(`${p.instagramId}/insights`, {
          ...conPagina, params: { metric: metrica, period: 'day', metric_type: 'total_value', since: desde, until: hasta },
        });
        const valor = j.data?.[0]?.total_value?.value ?? (j.data?.[0]?.values ?? []).at(-1)?.value;
        if (typeof valor === 'number') instagram[clave] = valor;
        else faltan.push(`Instagram, ${clave} (${metrica}): Meta no devolvió el dato`);
      } catch (e) { faltan.push(`Instagram, ${clave} (${metrica}): ${e.message}`); }
    }
  }
  const vacio = (o) => !o || !Object.values(o).some((v) => v !== null && v !== undefined);
  return { facebook: vacio(facebook) ? null : facebook, instagram: vacio(instagram) ? null : instagram, faltan };
}

// ---------------------------------------------------------------- medir todo

/**
 * Mide todo lo que se pueda. Nunca falla: lo que no se pudo queda en
 * `faltan` (y en el registro, una vez) y el resto sigue.
 *
 * @returns {Promise<{ punto: object, faltan: string[] }>}
 */
export async function medir({ env = process.env, ahora = new Date(), fetchFn = fetch, log = console.log } = {}) {
  const punto = { cuando: ahora.toISOString() };
  const faltan = [];
  const cuenta = env.CLOUDFLARE_ACCOUNT_ID;
  const { token, nombre } = tokenDeCloudflare(env);
  if (!cuenta || !token) {
    punto.cloudflare = 'sin-secretos';
    faltan.push(`Cloudflare: falta ${!cuenta ? 'el secreto CLOUDFLARE_ACCOUNT_ID' : 'un token (CLOUDFLARE_ANALYTICS_TOKEN)'}`);
  } else {
    const r = await estadisticasDeCloudflare({ cuenta, token, ahora, fetchFn, siteTag: env.CLOUDFLARE_SITE_TAG || null });
    if (r.ok) punto.web = r.web;
    else {
      punto.cloudflare = r.sinPermiso ? 'sin-permiso' : 'error';
      faltan.push(r.sinPermiso
        ? `Falta permiso de Analytics en el token de Cloudflare (se probó con ${nombre}): ${r.error}`
        : `Cloudflare: ${r.error}`);
    }
  }
  if (!env.META_TOKEN) faltan.push('Meta: falta el secreto META_TOKEN');
  else {
    const m = await estadisticasDeMeta({ token: env.META_TOKEN, paginaId: env.META_PAGE_ID ?? PAGINA_ID, ahora, fetchFn });
    if (m.facebook) punto.facebook = m.facebook;
    if (m.instagram) punto.instagram = m.instagram;
    faltan.push(...m.faltan);
  }
  const limpias = faltan.map((f) => sinSecretos(f, token, env.META_TOKEN, cuenta));
  for (const f of limpias) log(`  (estadísticas) ${f}`);
  return { punto, faltan: limpias };
}

// ---------------------------------------------------------------- el mensaje

const numero = (n) => Number(n ?? 0).toLocaleString('es-AR');

/** "↑ 12%", "↓ 5%", "=" o "nuevo", comparando con el período anterior. */
export function variacion(actual, antes) {
  const a = Number(actual ?? 0);
  const b = Number(antes ?? 0);
  if (!b) return a ? 'antes 0' : '=';
  const pct = Math.round(((a - b) / b) * 100);
  if (pct === 0) return '=';
  return `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct)}%`;
}

/** "(+5 desde ayer)", comparando con lo guardado. */
function cambio(actual, anterior, desde) {
  if (actual === null || actual === undefined || anterior === null || anterior === undefined) return '';
  const d = actual - anterior;
  return ` (${d > 0 ? '+' : ''}${d === 0 ? 'igual' : numero(d)} ${desde})`;
}

/**
 * El texto de las estadísticas, con la evolución.
 *
 * @param {object} o.punto      lo medido ahora
 * @param {object[]} o.puntos   la historia (sin el punto de ahora o con él: da igual)
 * @param {(camino:string)=>string} [o.nombreDeCamino]  "/nota/…-id" → titular
 */
export function textoEstadisticas({ punto, puntos = [], ahora = new Date(), nombreDeCamino = (c) => c, titulo = '📊 Estadísticas' }) {
  if (!punto) return '';
  const previos = (puntos ?? []).filter((p) => p.cuando !== punto.cuando);
  const ayer = puntoDeHace(previos, ahora, 24);
  const medioDia = ayer ? null : puntoDeHace(previos, ahora, 12);
  const ref = ayer ?? medioDia;
  const desde = ayer ? 'desde ayer' : 'en 12 h';
  const l = [titulo];
  const w = punto.web;
  if (w) {
    l.push(`Web, últimas 24 h: ${numero(w.u24.visitas)} visitas (${variacion(w.u24.visitas, w.a24.visitas)}) y ${numero(w.u24.vistas)} páginas vistas (${variacion(w.u24.vistas, w.a24.vistas)})`);
    l.push(`Web, últimas 12 h: ${numero(w.u12.visitas)} visitas (${variacion(w.u12.visitas, w.a12.visitas)}) y ${numero(w.u12.vistas)} páginas vistas (${variacion(w.u12.vistas, w.a12.vistas)})`);
    if (w.top?.length) l.push(`Lo más visto: ${w.top.map((t) => `${nombreDeCamino(t.camino)} (${numero(t.vistas)})`).join(', ')}`);
  } else if (punto.cloudflare === 'sin-permiso') {
    l.push('Web: falta permiso de Analytics en el token de Cloudflare.');
  } else if (punto.cloudflare) {
    l.push('Web: no se pudieron leer las visitas de Cloudflare.');
  }
  const fb = punto.facebook;
  if (fb) {
    const extra = [fb.vistas !== undefined ? `${numero(fb.vistas)} vistas` : '', fb.interacciones !== undefined ? `${numero(fb.interacciones)} interacciones` : ''].filter(Boolean).join(' y ');
    l.push(`Facebook: ${fb.seguidores !== null && fb.seguidores !== undefined ? `${numero(fb.seguidores)} seguidores${cambio(fb.seguidores, ref?.facebook?.seguidores, desde)}` : 'seguidores sin dato'}${extra ? ` · ${extra} en el último día` : ''}`);
  }
  const ig = punto.instagram;
  if (ig) {
    const extra = [ig.alcance !== undefined ? `alcance ${numero(ig.alcance)}` : '', ig.vistas !== undefined ? `${numero(ig.vistas)} vistas` : '', ig.interacciones !== undefined ? `${numero(ig.interacciones)} interacciones` : ''].filter(Boolean).join(', ');
    l.push(`Instagram: ${ig.seguidores !== null && ig.seguidores !== undefined ? `${numero(ig.seguidores)} seguidores${cambio(ig.seguidores, ref?.instagram?.seguidores, desde)}` : 'seguidores sin dato'}${extra ? ` · ${extra} (24 h)` : ''}`);
  }
  return l.length > 1 ? l.join('\n') : '';
}

/** Un nombre corto para una página del sitio: el titular si es una nota. */
export function nombresDeCaminos(notas = []) {
  const porId = new Map((notas ?? []).map((n) => [n.id, n.titulo]));
  return (camino) => {
    const c = String(camino ?? '');
    if (c === '/' || c === '') return 'Portada';
    if (c.startsWith('/nota/')) {
      const titulo = porId.get(idDeRuta(c.slice(6).split('/')[0]));
      if (titulo) return titulo.length > 40 ? `${titulo.slice(0, 39).replace(/\s+\S*$/, '')}…` : titulo;
    }
    return c.length > 40 ? `${c.slice(0, 39)}…` : c;
  };
}

// ---------------------------------------------------------------- a mano

async function main() {
  const RAIZ = path.join(import.meta.dirname, '..');
  const leer = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
  const ahora = new Date();
  const { token, nombre } = tokenDeCloudflare(process.env);
  console.log('Estadísticas, prueba (no guarda nada ni manda WhatsApp)');
  console.log(`  Cloudflare: cuenta ${process.env.CLOUDFLARE_ACCOUNT_ID ? 'cargada' : 'FALTA'}, token ${token ? `de ${nombre}` : 'FALTA'}`);
  console.log(`  Meta: token ${process.env.META_TOKEN ? 'cargado' : 'FALTA'}`);
  const { punto, faltan } = await medir({ ahora });
  console.log('\nLo medido (lo que se guardaría en web/data/estadisticas.json):');
  console.log(JSON.stringify(punto, null, 2));
  console.log(`\nFaltan ${faltan.length} dato(s)${faltan.length ? ':' : '.'}`);
  for (const f of faltan) console.log(`  - ${f}`);
  const historia = leer(path.join(RAIZ, 'web', 'data', 'estadisticas.json'), { puntos: [] });
  const portada = leer(path.join(RAIZ, 'web', 'data', 'portada.json'), { notas: [] });
  console.log('\nAsí saldría en el WhatsApp:\n');
  console.log(textoEstadisticas({ punto, puntos: historia.puntos, ahora, nombreDeCamino: nombresDeCaminos(portada.notas) }) || '(nada para mostrar)');
}

if (process.argv[1] && process.argv[1].endsWith('estadisticas.mjs')) {
  await main().catch((e) => {
    console.error(`No se pudieron medir las estadísticas: ${e?.stack ?? e}`);
    process.exit(1);
  });
}

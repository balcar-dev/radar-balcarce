// Los números de CADA pieza de las redes (8/10/2026, "estadísticas por pieza"; pedido para medir cuatro semanas "dónde sale cada pieza"):
// cuánta gente alcanzó y vio cada reel, historia y posteo, en Instagram y en Facebook. Hasta ahora sólo se medía la cuenta entera.
//
// Cada publicación se mide UNA vez, cuando ya tiene números casi finales: los reels, los posteos y los videos de Facebook a las 24 horas
// o más (hasta 8 días); las historias de Instagram entre las 12 y las 24 horas, porque Instagram deja de dar sus números a las 24. Lo que
// se mide queda en web/data/estadisticas-piezas.json: sólo números agregados (el repositorio es público).
//
// Meta cambia de nombre sus métricas seguido (en 2025 reemplazó "impresiones" por "vistas"): por eso cada métrica se pide sola y, si una
// no existe, se anota en `faltan` y se sigue con las otras. Nunca frena nada.
//
// LA MEDICIÓN ARREGLADA (17/10/2026, regla 207; la prueba de "dónde sale cada pieza" se decide el 5/11 con estos números). Hasta acá:
//   · Las historias de Facebook daban SIEMPRE 0: se pedía `total_video_views` al video de la historia, y esa métrica no cuenta las
//     historias. Ahora se le pide al POSTEO de la historia (`post_id`, que Facebook da al publicarla y desde hoy queda en el libro; las
//     viejas se buscan en /{página}/stories) la métrica de historias que Meta sumó en la versión 25 (`page_story_total_media_view_unique`)
//     y, de respaldo, las de un posteo común.
//   · Los reels de Facebook nunca tuvieron un número: `total_video_views` no existe para un reel (Meta contesta vacío, sin error). Ahora
//     se piden las métricas propias de los reels (`blue_reels_play_count`, `fb_reels_total_plays`, `post_impressions_unique`…).
//   · Las historias de Instagram nunca tuvieron un número: con menos de 5 personas, Instagram contesta "(#10) Not enough viewers for
//     the media to show insights". No es una falla: es el dato "menos de 5". Se guarda así (`pocas: true`).
// Las mediciones viejas de los reels y las historias de Facebook que todavía están a tiempo (8 días) se vuelven a medir una vez.
//
//   node redes/estadisticas-piezas.mjs            muestra el resumen de las últimas cuatro semanas (no pide nada a Meta)
//
// Sin dependencias: sólo fetch (vía redes/meta.mjs).

import fs from 'node:fs';
import path from 'node:path';
import { crearCliente, PAGINA_DE_FACEBOOK } from './meta.mjs';
import { diaAR } from '../ingesta/zona.mjs';

export const ARCHIVO = path.join(import.meta.dirname, '..', 'web', 'data', 'estadisticas-piezas.json');

/** Cuántas medidas se guardan (las más nuevas). Con unas 25 piezas por día son unos 25 días. */
export const MAXIMO_DE_MEDIDAS = 700;
/** Cuántas publicaciones se miden por corrida, como mucho (el vigilante corre cada 30 minutos). */
export const POR_CORRIDA = 12;

/** La forma de medir. Una medida de un reel o una historia de Facebook hecha con la forma vieja (sin `v`) se vuelve a pedir. */
export const VERSION_DE_MEDICION = 2;
const SE_VUELVEN_A_MEDIR = new Set(['facebook/reel', 'facebook/historia']);
/** La versión de la API para las métricas de historias de Facebook (Meta las sumó en la v25, febrero de 2026). */
export const VERSION_PARA_HISTORIAS = 'v25.0';

/** Qué se le pide a Meta de cada tipo de publicación. Se piden de a una: lo que no exista se anota y no frena lo demás. */
export const METRICAS = {
  'instagram/reel': ['reach', 'views', 'likes', 'comments', 'shares', 'saved', 'total_interactions'],
  'instagram/historia': ['reach', 'views', 'replies', 'shares'],
  'instagram/foto': ['reach', 'views', 'likes', 'comments', 'shares', 'saved'],
  // Las de los reels de Facebook (referencia de video_insights, "Reels metrics"), por el video del reel.
  'facebook/reel': ['blue_reels_play_count', 'fb_reels_total_plays', 'post_impressions_unique', 'post_video_avg_time_watched', 'post_video_social_actions', 'post_video_likes_by_reaction_type'],
  // Las de las historias, por el POSTEO de la historia: la nueva de historias (v25) y, de respaldo, las de cualquier posteo.
  'facebook/historia': ['page_story_total_media_view_unique', 'post_total_media_view_unique', 'post_media_view'],
  // `post_impressions_unique` se sacó el 17/10: Meta contesta "(#100) The value must be a valid insights metric" para los posteos.
  'facebook/posteo': ['post_media_view', 'post_total_media_view_unique', 'post_clicks', 'post_reactions_by_type_total'],
};

const HORA = 3600e3;

/** Una entrada de los libros → { red, parte, pieza, id, cuando, postId? } o null. */
const item = (red, parte, pieza, id, cuando, extra = {}) => (id && cuando && Number.isFinite(Date.parse(cuando))
  ? { red, parte, pieza, id: String(id), cuando, ...(extra.postId ? { postId: String(extra.postId) } : {}) }
  : null);

/**
 * Todo lo publicado en los últimos días, listo para medir. Las historias de Instagram figuran en `libro.instagram` (cuando son de por sí
 * historia) o en `libro.historiasDeReels` (el reflejo de un reel); en Facebook, los videos en `facebookVideos` y el reel extra en
 * `reelsEnFacebook`. Las historias de Facebook traen, desde el 17/10, el `postId` de su posteo (que es lo que se mide).
 */
export function publicaciones(libro = {}) {
  const fuera = [];
  for (const [clave, v] of Object.entries(libro.instagram ?? {})) fuera.push(item('instagram', v.tipo === 'REELS' ? 'reel' : 'historia', v.nombre ?? clave.slice(11), v.mediaId, v.cuando));
  for (const [clave, v] of Object.entries(libro.historiasDeReels ?? {})) {
    if (String(clave).startsWith('instagram/')) fuera.push(item('instagram', 'historia', v.nombre ?? clave.split('/').pop(), v.mediaId, v.cuando));
    else if (String(clave).startsWith('facebook/')) fuera.push(item('facebook', 'historia', v.nombre ?? clave.split('/').pop(), v.mediaId, v.cuando, v));
  }
  for (const [clave, v] of Object.entries(libro.instagramFeed ?? {})) fuera.push(item('instagram', 'foto', clave, v.mediaId, v.cuando));
  for (const [clave, v] of Object.entries(libro.facebookVideos ?? {})) fuera.push(item('facebook', v.tipo === 'REELS' ? 'reel' : 'historia', v.nombre ?? clave.slice(11), v.mediaId, v.cuando, v));
  for (const [clave, v] of Object.entries(libro.reelsEnFacebook ?? {})) fuera.push(item('facebook', 'reel', v.nombre ?? clave.slice(11), v.mediaId, v.cuando));
  for (const [clave, v] of Object.entries(libro.facebook ?? {})) fuera.push(item('facebook', 'posteo', clave, v.postId, v.cuando));
  return fuera.filter(Boolean);
}

/** La clave de una publicación medida, para no medirla dos veces. */
export const claveDeMedida = (p) => `${p.red}/${p.parte}/${p.id}`;

/** ¿Esta medida ya vale? Las de los reels y las historias de Facebook hechas con la forma vieja, no: se vuelven a pedir. */
export const medidaVigente = (m) => !SE_VUELVEN_A_MEDIR.has(`${m?.red}/${m?.parte}`) || (m?.v ?? 1) >= VERSION_DE_MEDICION;

/**
 * Las que toca medir ahora: ya pasó el tiempo (24 horas; las historias de Instagram, 12) y todavía no se vencieron los datos (8 días;
 * las historias de Instagram, 24 horas), y no están medidas (o se midieron con la forma vieja que no servía).
 */
export function queTocaMedir({ libro, medidas = [], ahora = new Date(), porCorrida = POR_CORRIDA }) {
  const medidasYa = new Set(medidas.filter(medidaVigente).map((m) => m.clave));
  return publicaciones(libro)
    .filter((p) => {
      const horas = (ahora.getTime() - Date.parse(p.cuando)) / HORA;
      const historiaDeInstagram = p.red === 'instagram' && p.parte === 'historia';
      return historiaDeInstagram ? horas >= 12 && horas < 24 : horas >= 24 && horas < 8 * 24;
    })
    .filter((p) => !medidasYa.has(claveDeMedida(p)))
    .sort((a, b) => Date.parse(a.cuando) - Date.parse(b.cuando))
    .slice(0, porCorrida);
}

/** El valor de una métrica en lo que contesta Meta: un número, o la suma de un desglose (reacciones por tipo). */
export function valorDe(j) {
  const d = j?.data?.[0];
  const v = d?.total_value?.value ?? (d?.values ?? []).at(-1)?.value;
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object') {
    const suma = Object.values(v).filter((x) => typeof x === 'number').reduce((a, b) => a + b, 0);
    return suma;
  }
  return null;
}

/** "(#10) Not enough viewers for the media to show insights": Instagram no da los números de una historia que vieron menos de 5 personas. */
export const sonPocasPersonas = (e) => Number(e?.codigo) === 10 || /not enough viewers/i.test(String(e?.message ?? e ?? ''));

/** Por dónde se le pregunta a Meta: los reels de Facebook por su video; las historias de Facebook por su posteo; lo demás, por su id. */
export function caminoDeLaMedicion(p) {
  if (p.red === 'facebook' && p.parte === 'reel') return `${p.id}/video_insights`;
  if (p.red === 'facebook' && p.parte === 'historia') return p.postId ? `${p.postId}/insights` : null;
  return `${p.id}/insights`;
}

/**
 * Mide una publicación: devuelve { metricas, faltan, pocas? , sinPosteo? }. Cada métrica se pide sola. Si Instagram dice que la vieron
 * menos de 5 personas, no se insiste con las demás métricas (todas contestan lo mismo): queda `pocas: true`.
 */
export async function medirPublicacion({ api, tokenPagina, p }) {
  const metricas = {};
  const faltan = [];
  const lista = METRICAS[`${p.red}/${p.parte}`] ?? [];
  const camino = caminoDeLaMedicion(p);
  if (!camino) return { metricas, faltan: [`${p.red}/${p.parte}: no se encontró el posteo de la historia (${p.id})`], sinPosteo: true };
  for (const metrica of lista) {
    try {
      const j = await api.pedir(camino, { conToken: tokenPagina, params: { metric: metrica } });
      const v = valorDe(j);
      if (typeof v === 'number') metricas[metrica] = v;
    } catch (e) {
      if (sonPocasPersonas(e)) return { metricas: {}, faltan: [], pocas: true };
      faltan.push(`${p.red}/${p.parte} · ${metrica}: ${String(e.message ?? e).slice(0, 110)}`);
    }
  }
  return { metricas, faltan };
}

/**
 * Las historias de la página de los últimos días, para encontrar el posteo de las que se publicaron antes del 17/10 (el libro guardaba
 * sólo el video). Devuelve un Map video → posteo; vacío si Meta no contesta (no frena nada).
 */
export async function posteosDeLasHistorias({ api, tokenPagina, paginaId, ahora = new Date(), dias = 9 }) {
  const mapa = new Map();
  try {
    let pagina = await api.pedir(`${paginaId}/stories`, {
      conToken: tokenPagina, params: { fields: 'post_id,media_id,creation_time', since: Math.floor(ahora.getTime() / 1000) - dias * 86400, limit: 100 },
    });
    for (let vuelta = 0; vuelta < 5 && pagina; vuelta += 1) {
      for (const h of pagina.data ?? []) if (h?.media_id && h?.post_id) mapa.set(String(h.media_id), String(h.post_id));
      const despues = pagina.paging?.cursors?.after;
      if (!despues || !(pagina.data ?? []).length) break;
      pagina = await api.pedir(`${paginaId}/stories`, { conToken: tokenPagina, params: { fields: 'post_id,media_id,creation_time', limit: 100, after: despues } });
    }
  } catch { /* sin la lista, las viejas quedan sin medir */ }
  return mapa;
}

/**
 * Mide lo que toca. `previo` es lo que ya había en el archivo ({ medidas: [...] }). Nunca lanza: devuelve el archivo nuevo, cuántas se
 * midieron y lo que no se pudo. Sin cambios devuelve `cambio: false`.
 */
export async function medirPiezas({
  token, paginaId = PAGINA_DE_FACEBOOK, libro = {}, previo = {}, ahora = new Date(), fetchFn = fetch, porCorrida = POR_CORRIDA,
}) {
  const medidas = Array.isArray(previo.medidas) ? previo.medidas : [];
  const tocan = queTocaMedir({ libro, medidas, ahora, porCorrida });
  if (!tocan.length) return { archivo: previo, midieron: 0, faltan: [], cambio: false };
  const faltan = [];
  const api = crearCliente({ token, paginaId, fetchFn });
  let tokenPagina;
  try { tokenPagina = (await api.pagina()).tokenPagina; } catch (e) {
    return { archivo: previo, midieron: 0, faltan: [`Meta: no se pudo leer la página (${e.message})`], cambio: false };
  }
  // Las historias de Facebook sin su posteo en el libro (las de antes del 17/10): se buscan una vez por corrida.
  const sinPosteo = tocan.filter((p) => p.red === 'facebook' && p.parte === 'historia' && !p.postId);
  if (sinPosteo.length) {
    const mapa = await posteosDeLasHistorias({ api, tokenPagina, paginaId, ahora });
    for (const p of sinPosteo) if (mapa.has(p.id)) p.postId = mapa.get(p.id);
  }
  // La métrica de historias nació en la versión 25 de la API: esos pedidos (sólo lectura) van por esa versión; todo lo demás, por la de
  // siempre (redes/meta.mjs), así publicar no cambia.
  const apiDeHistorias = crearCliente({ token, paginaId, fetchFn, version: VERSION_PARA_HISTORIAS });
  const nuevas = [];
  for (const p of tocan) {
    const esHistoriaDeFacebook = p.red === 'facebook' && p.parte === 'historia';
    const r = await medirPublicacion({ api: esHistoriaDeFacebook ? apiDeHistorias : api, tokenPagina, p });
    faltan.push(...r.faltan);
    // Se anota aunque no haya vuelto ningún número: así no se vuelve a pedir una y otra vez lo que Meta no da.
    nuevas.push({
      clave: claveDeMedida(p), red: p.red, parte: p.parte, pieza: p.pieza, dia: diaAR(new Date(p.cuando)), cuando: p.cuando, medida: ahora.toISOString(),
      v: VERSION_DE_MEDICION, metricas: r.metricas,
      ...(r.pocas ? { pocas: true } : {}), ...(r.sinPosteo ? { sinPosteo: true } : {}),
    });
  }
  // Una medida nueva reemplaza a la vieja de la misma publicación (las que se vuelven a medir).
  const reemplazadas = new Set(nuevas.map((m) => m.clave));
  const todas = [...medidas.filter((m) => !reemplazadas.has(m.clave)), ...nuevas].slice(-MAXIMO_DE_MEDIDAS);
  return { archivo: { version: 1, medidas: todas }, midieron: nuevas.length, faltan: [...new Set(faltan)], cambio: true };
}

/** Los nombres de una pieza, sin la fecha ni el sufijo, para juntar los días ("participa-nota" es lo mismo cada viernes). */
const nombreDePieza = (p) => String(p ?? '').replace(/^\d{4}-\d{2}-\d{2}\//, '');

/**
 * Lo que alcanzó una medida (personas distintas) y lo que se vio (vistas o reproducciones), con el nombre que tenga en cada red, o null.
 * `total_video_views` de una historia de Facebook NO cuenta: es la medición vieja que siempre daba 0 sin que nadie la hubiera visto o no.
 */
export function alcanceYVistas(m = {}) {
  const x = m.metricas ?? {};
  const historiaVieja = m.red === 'facebook' && m.parte === 'historia' && !medidaVigente(m);
  const alcance = x.reach ?? x.post_impressions_unique ?? x.page_story_total_media_view_unique ?? x.post_total_media_view_unique
    ?? x.total_video_views_unique ?? null;
  const vistas = x.views ?? x.fb_reels_total_plays ?? x.blue_reels_play_count ?? x.post_media_view
    ?? (historiaVieja ? null : x.total_video_views) ?? null;
  return { alcance, vistas };
}

/**
 * El resumen para decidir: por red, tipo (reel, historia, posteo) y pieza, cuántas se midieron, el promedio de lo que alcanzaron
 * (`alcance`: reach en Instagram, personas únicas en Facebook) y de vistas (`vistas`), y cuántas vio menos de 5 personas (`pocas`: las
 * historias de Instagram que Meta no mide). Mira los últimos `dias` días.
 */
export function resumen(archivo = {}, { ahora = new Date(), dias = 28 } = {}) {
  const desde = diaAR(new Date(ahora.getTime() - dias * 86400e3));
  const grupos = new Map();
  for (const m of (archivo.medidas ?? []).filter((x) => x.dia >= desde)) {
    const { alcance, vistas } = alcanceYVistas(m);
    const k = `${m.red} · ${m.parte} · ${nombreDePieza(m.pieza)}`;
    const g = grupos.get(k) ?? { grupo: k, red: m.red, parte: m.parte, pieza: nombreDePieza(m.pieza), n: 0, pocas: 0, alcance: [], vistas: [] };
    g.n += 1;
    if (m.pocas) g.pocas += 1;
    if (alcance !== null) g.alcance.push(alcance);
    if (vistas !== null) g.vistas.push(vistas);
    grupos.set(k, g);
  }
  const media = (l) => (l.length ? Math.round(l.reduce((a, b) => a + b, 0) / l.length) : null);
  return [...grupos.values()].map((g) => ({
    grupo: g.grupo, red: g.red, parte: g.parte, pieza: g.pieza, n: g.n, pocas: g.pocas, alcance: media(g.alcance), vistas: media(g.vistas),
  }))
    .sort((a, b) => (b.alcance ?? -1) - (a.alcance ?? -1));
}

/** El resumen en texto, para la consola o un mensaje. */
export function textoDelResumen(filas = []) {
  if (!filas.length) return 'Todavía no hay piezas medidas.';
  return filas.map((f) => `${f.grupo.padEnd(48)} n=${String(f.n).padStart(2)}  alcance ${f.alcance ?? '—'}  vistas ${f.vistas ?? '—'}${f.pocas ? `  (${f.pocas} con menos de 5 personas)` : ''}`).join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('estadisticas-piezas.mjs')) {
  let archivo = {};
  try { archivo = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')); } catch { /* sin archivo todavía */ }
  console.log(textoDelResumen(resumen(archivo)));
}

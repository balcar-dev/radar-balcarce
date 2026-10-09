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

/** Qué se le pide a Meta de cada tipo de publicación. Se piden de a una: lo que no exista se anota y no frena lo demás. */
export const METRICAS = {
  'instagram/reel': ['reach', 'views', 'likes', 'comments', 'shares', 'saved', 'total_interactions'],
  'instagram/historia': ['reach', 'views', 'replies', 'shares'],
  'instagram/foto': ['reach', 'views', 'likes', 'comments', 'shares', 'saved'],
  'facebook/reel': ['total_video_views', 'total_video_views_unique', 'total_video_reactions_by_type_total'],
  'facebook/historia': ['total_video_views', 'total_video_views_unique'],
  'facebook/posteo': ['post_media_view', 'post_total_media_view_unique', 'post_impressions_unique', 'post_clicks', 'post_reactions_by_type_total'],
};

const HORA = 3600e3;

/** Una entrada de los libros → { red, parte, pieza, id, cuando } o null. */
const item = (red, parte, pieza, id, cuando) => (id && cuando && Number.isFinite(Date.parse(cuando)) ? { red, parte, pieza, id: String(id), cuando } : null);

/**
 * Todo lo publicado en los últimos días, listo para medir. Las historias de Instagram figuran en `libro.instagram` (cuando son de por sí
 * historia) o en `libro.historiasDeReels` (el reflejo de un reel); en Facebook, los videos en `facebookVideos` y el reel extra en
 * `reelsEnFacebook`.
 */
export function publicaciones(libro = {}) {
  const fuera = [];
  for (const [clave, v] of Object.entries(libro.instagram ?? {})) fuera.push(item('instagram', v.tipo === 'REELS' ? 'reel' : 'historia', v.nombre ?? clave.slice(11), v.mediaId, v.cuando));
  for (const [clave, v] of Object.entries(libro.historiasDeReels ?? {})) {
    if (String(clave).startsWith('instagram/')) fuera.push(item('instagram', 'historia', v.nombre ?? clave.split('/').pop(), v.mediaId, v.cuando));
    else if (String(clave).startsWith('facebook/')) fuera.push(item('facebook', 'historia', v.nombre ?? clave.split('/').pop(), v.mediaId, v.cuando));
  }
  for (const [clave, v] of Object.entries(libro.instagramFeed ?? {})) fuera.push(item('instagram', 'foto', clave, v.mediaId, v.cuando));
  for (const [clave, v] of Object.entries(libro.facebookVideos ?? {})) fuera.push(item('facebook', v.tipo === 'REELS' ? 'reel' : 'historia', v.nombre ?? clave.slice(11), v.mediaId, v.cuando));
  for (const [clave, v] of Object.entries(libro.reelsEnFacebook ?? {})) fuera.push(item('facebook', 'reel', v.nombre ?? clave.slice(11), v.mediaId, v.cuando));
  for (const [clave, v] of Object.entries(libro.facebook ?? {})) fuera.push(item('facebook', 'posteo', clave, v.postId, v.cuando));
  return fuera.filter(Boolean);
}

/** La clave de una publicación medida, para no medirla dos veces. */
export const claveDeMedida = (p) => `${p.red}/${p.parte}/${p.id}`;

/**
 * Las que toca medir ahora: ya pasó el tiempo (24 horas; las historias de Instagram, 12) y todavía no se vencieron los datos (8 días;
 * las historias de Instagram, 24 horas), y no están medidas.
 */
export function queTocaMedir({ libro, medidas = [], ahora = new Date(), porCorrida = POR_CORRIDA }) {
  const medidasYa = new Set(medidas.map((m) => m.clave));
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

/** Mide una publicación: devuelve { metricas, faltan }. Cada métrica se pide sola. */
export async function medirPublicacion({ api, tokenPagina, p }) {
  const metricas = {};
  const faltan = [];
  const lista = METRICAS[`${p.red}/${p.parte}`] ?? [];
  const camino = p.red === 'facebook' && p.parte !== 'posteo' ? `${p.id}/video_insights` : `${p.id}/insights`;
  for (const metrica of lista) {
    try {
      const j = await api.pedir(camino, { conToken: tokenPagina, params: { metric: metrica } });
      const v = valorDe(j);
      if (typeof v === 'number') metricas[metrica] = v;
    } catch (e) {
      faltan.push(`${p.red}/${p.parte} · ${metrica}: ${String(e.message ?? e).slice(0, 110)}`);
    }
  }
  return { metricas, faltan };
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
  const nuevas = [];
  for (const p of tocan) {
    const { metricas, faltan: f } = await medirPublicacion({ api, tokenPagina, p });
    faltan.push(...f);
    // Se anota aunque no haya vuelto ningún número: así no se vuelve a pedir una y otra vez lo que Meta no da.
    nuevas.push({
      clave: claveDeMedida(p), red: p.red, parte: p.parte, pieza: p.pieza, dia: diaAR(new Date(p.cuando)), cuando: p.cuando, medida: ahora.toISOString(), metricas,
    });
  }
  const todas = [...medidas, ...nuevas].slice(-MAXIMO_DE_MEDIDAS);
  return { archivo: { version: 1, medidas: todas }, midieron: nuevas.length, faltan: [...new Set(faltan)], cambio: true };
}

/** Los nombres de una pieza, sin la fecha ni el sufijo, para juntar los días ("participa-nota" es lo mismo cada viernes). */
const nombreDePieza = (p) => String(p ?? '').replace(/^\d{4}-\d{2}-\d{2}\//, '');

/**
 * El resumen para decidir: por red, tipo (reel, historia, posteo) y pieza, cuántas se midieron y el promedio de lo que alcanzaron
 * (`alcance`: reach en Instagram, vistas únicas en Facebook) y de vistas (`vistas`). Mira los últimos `dias` días.
 */
export function resumen(archivo = {}, { ahora = new Date(), dias = 28 } = {}) {
  const desde = diaAR(new Date(ahora.getTime() - dias * 86400e3));
  const grupos = new Map();
  for (const m of (archivo.medidas ?? []).filter((x) => x.dia >= desde)) {
    const alcance = m.metricas?.reach ?? m.metricas?.total_video_views_unique ?? m.metricas?.post_total_media_view_unique ?? m.metricas?.post_impressions_unique ?? null;
    const vistas = m.metricas?.views ?? m.metricas?.total_video_views ?? m.metricas?.post_media_view ?? null;
    const k = `${m.red} · ${m.parte} · ${nombreDePieza(m.pieza)}`;
    const g = grupos.get(k) ?? { grupo: k, red: m.red, parte: m.parte, pieza: nombreDePieza(m.pieza), n: 0, alcance: [], vistas: [] };
    g.n += 1;
    if (alcance !== null) g.alcance.push(alcance);
    if (vistas !== null) g.vistas.push(vistas);
    grupos.set(k, g);
  }
  const media = (l) => (l.length ? Math.round(l.reduce((a, b) => a + b, 0) / l.length) : null);
  return [...grupos.values()].map((g) => ({ grupo: g.grupo, red: g.red, parte: g.parte, pieza: g.pieza, n: g.n, alcance: media(g.alcance), vistas: media(g.vistas) }))
    .sort((a, b) => (b.alcance ?? -1) - (a.alcance ?? -1));
}

/** El resumen en texto, para la consola o un mensaje. */
export function textoDelResumen(filas = []) {
  if (!filas.length) return 'Todavía no hay piezas medidas.';
  return filas.map((f) => `${f.grupo.padEnd(48)} n=${String(f.n).padStart(2)}  alcance ${f.alcance ?? '—'}  vistas ${f.vistas ?? '—'}`).join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('estadisticas-piezas.mjs')) {
  let archivo = {};
  try { archivo = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')); } catch { /* sin archivo todavía */ }
  console.log(textoDelResumen(resumen(archivo)));
}

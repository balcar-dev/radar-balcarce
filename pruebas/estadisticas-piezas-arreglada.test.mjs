// Regla 207 (17/10/2026): la medición de cada pieza, arreglada antes del 5/11 (la prueba de "dónde sale cada pieza"). Las historias de
// Facebook daban siempre 0, los reels de Facebook y las historias de Instagram nunca tuvieron un número. Se prueba con las respuestas de
// Meta grabadas en pruebas/datos-fijos/meta-insights.json (los errores, textuales de los registros de Vigilancia del 16/10), sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  medirPiezas, medirPublicacion, queTocaMedir, publicaciones, resumen, textoDelResumen, alcanceYVistas, caminoDeLaMedicion, sonPocasPersonas,
  METRICAS, VERSION_DE_MEDICION, VERSION_PARA_HISTORIAS,
} from '../redes/estadisticas-piezas.mjs';
import { ErrorMeta } from '../redes/meta.mjs';

const GRABADO = JSON.parse(fs.readFileSync(new URL('./datos-fijos/meta-insights.json', import.meta.url), 'utf8'));
const AHORA = new Date('2026-10-17T15:00:00Z');
const hace = (h) => new Date(AHORA.getTime() - h * 3600e3).toISOString();

/** Una respuesta de fetch con lo grabado. */
const respuesta = ({ http = 200, cuerpo }) => ({ ok: http < 400, status: http, json: async () => cuerpo });
/** Una métrica sola, como la devuelve Meta. */
const unaMetrica = (nombre, valor) => respuesta({ cuerpo: { data: [{ name: nombre, period: 'lifetime', values: [{ value: valor }], id: `X/insights/${nombre}/lifetime` }] } });

/** Un Meta de mentira que contesta con lo grabado y anota cada pedido. */
function metaGrabado() {
  const pedidos = [];
  const fetchFn = async (url) => {
    const u = new URL(String(url));
    pedidos.push(u.pathname + u.search);
    const metric = u.searchParams.get('metric');
    const camino = u.pathname;
    if (u.searchParams.get('fields')?.includes('access_token')) return respuesta({ cuerpo: { name: 'Radar Balcarce', access_token: 'TP', instagram_business_account: { id: '999' } } });
    if (camino.endsWith('/stories')) return u.searchParams.get('after') ? respuesta({ cuerpo: { data: [] } }) : respuesta(GRABADO.historiasDeLaPagina);
    if (camino.includes('/IGH')) return respuesta(GRABADO.instagramHistoriaPocas);
    if (camino.includes('/FBR') && camino.endsWith('/video_insights')) {
      return metric in GRABADO.reelDeFacebook ? unaMetrica(metric, GRABADO.reelDeFacebook[metric]) : respuesta(GRABADO.reelViejoSinDatos);
    }
    if (camino.includes('_555000') && camino.endsWith('/insights')) {
      return metric in GRABADO.historiaDeFacebook ? unaMetrica(metric, GRABADO.historiaDeFacebook[metric]) : respuesta(GRABADO.metricaInvalida);
    }
    if (camino.includes('/FBP') && metric === 'post_impressions_unique') return respuesta(GRABADO.metricaInvalida);
    return unaMetrica(metric, 3);
  };
  return { pedidos, fetchFn };
}

const LIBRO = () => ({
  instagram: { '2026-10-16/farmacia': { mediaId: 'IGH1', nombre: 'farmacia', tipo: 'STORIES', cuando: hace(16) } },
  historiasDeReels: {
    // Una historia vieja de Facebook: el libro guardaba sólo el video.
    'facebook/2026-10-16/noticia1': { mediaId: 'FBH1', nombre: 'noticia1', red: 'facebook', cuando: hace(30) },
    // Una nueva: con el posteo, como queda desde el 17/10.
    'facebook/2026-10-16/noticia2': { mediaId: 'FBH9', postId: '1254237411116171_5550009', nombre: 'noticia2', red: 'facebook', cuando: hace(26) },
  },
  facebookVideos: { '2026-10-16/noticia1': { mediaId: 'FBR1', nombre: 'noticia1', tipo: 'REELS', cuando: hace(30) } },
  reelsEnFacebook: { '2026-10-16/clima-manana': { mediaId: 'FBR2', nombre: 'clima-manana', tipo: 'REELS', cuando: hace(32) } },
  facebook: { nota1: { postId: 'FBP1', cuando: hace(28) } },
});

test('las historias de Instagram con menos de 5 personas quedan como "pocas", no como una falla, y no se insiste', async () => {
  assert.ok(sonPocasPersonas(new ErrorMeta('(#10) Not enough viewers for the media to show insights', { codigo: 10 })));
  assert.ok(!sonPocasPersonas(new ErrorMeta('(#100) The value must be a valid insights metric', { codigo: 100 })));
  const { pedidos, fetchFn } = metaGrabado();
  const r = await medirPiezas({ token: 'T', libro: { instagram: LIBRO().instagram }, previo: {}, ahora: AHORA, fetchFn });
  const m = r.archivo.medidas[0];
  assert.equal(m.pocas, true);
  assert.deepEqual(m.metricas, {});
  assert.equal(r.faltan.length, 0, 'no es una falla');
  assert.equal(pedidos.filter((p) => p.includes('IGH1')).length, 1, 'con la primera respuesta alcanza');
});

test('los reels de Facebook se miden con las métricas de reels (antes: total_video_views, que para un reel viene vacío)', async () => {
  assert.ok(!METRICAS['facebook/reel'].includes('total_video_views'));
  assert.equal(caminoDeLaMedicion({ red: 'facebook', parte: 'reel', id: 'FBR1' }), 'FBR1/video_insights');
  const { fetchFn } = metaGrabado();
  const r = await medirPiezas({ token: 'T', libro: { facebookVideos: LIBRO().facebookVideos, reelsEnFacebook: LIBRO().reelsEnFacebook }, previo: {}, ahora: AHORA, fetchFn });
  const reel = r.archivo.medidas.find((m) => m.clave === 'facebook/reel/FBR1');
  assert.equal(reel.metricas.blue_reels_play_count, 14);
  assert.equal(reel.metricas.post_impressions_unique, 11);
  assert.equal(reel.metricas.post_video_social_actions, 1, 'los desgloses se suman');
  assert.deepEqual(alcanceYVistas(reel), { alcance: 11, vistas: 17 });
  assert.equal(reel.v, VERSION_DE_MEDICION);
});

test('las historias de Facebook se miden por su POSTEO: el del libro o, si es vieja, el que da /stories', async () => {
  assert.equal(caminoDeLaMedicion({ red: 'facebook', parte: 'historia', id: 'FBH1' }), null, 'sin posteo no se pregunta al video');
  assert.equal(caminoDeLaMedicion({ red: 'facebook', parte: 'historia', id: 'FBH9', postId: 'P9' }), 'P9/insights');
  const l = publicaciones(LIBRO());
  assert.equal(l.find((p) => p.id === 'FBH9').postId, '1254237411116171_5550009');
  const { pedidos, fetchFn } = metaGrabado();
  const r = await medirPiezas({ token: 'T', libro: { historiasDeReels: LIBRO().historiasDeReels }, previo: {}, ahora: AHORA, fetchFn });
  const vieja = r.archivo.medidas.find((m) => m.clave === 'facebook/historia/FBH1');
  const nueva = r.archivo.medidas.find((m) => m.clave === 'facebook/historia/FBH9');
  assert.equal(vieja.metricas.page_story_total_media_view_unique, 6);
  assert.equal(nueva.metricas.post_media_view, 8);
  assert.deepEqual(alcanceYVistas(vieja), { alcance: 6, vistas: 8 });
  assert.ok(pedidos.some((p) => p.includes('/1254237411116171/stories')), 'la vieja se buscó en la lista de historias');
  assert.ok(pedidos.filter((p) => p.includes('_555000')).every((p) => p.startsWith(`/${VERSION_PARA_HISTORIAS}/`)), 'las métricas de historias van por la v25');
  assert.ok(!pedidos.some((p) => p.includes('FBH1/video_insights')), 'nunca más al video de la historia');
});

test('una historia de Facebook cuyo posteo no aparece queda anotada (sinPosteo) y no traba la fila', async () => {
  const { fetchFn } = metaGrabado();
  const libro = { historiasDeReels: { 'facebook/2026-10-16/x': { mediaId: 'NOESTA', nombre: 'x', cuando: hace(30) } } };
  const r = await medirPiezas({ token: 'T', libro, previo: {}, ahora: AHORA, fetchFn });
  assert.equal(r.archivo.medidas[0].sinPosteo, true);
  assert.equal(queTocaMedir({ libro, medidas: r.archivo.medidas, ahora: AHORA }).length, 0);
});

test('lo medido con la forma vieja (reels e historias de Facebook) se vuelve a medir una vez y la medida nueva reemplaza a la vieja', async () => {
  const viejas = [
    { clave: 'facebook/historia/FBH1', red: 'facebook', parte: 'historia', pieza: 'noticia1', dia: '2026-10-16', metricas: { total_video_views: 0 } },
    { clave: 'facebook/reel/FBR1', red: 'facebook', parte: 'reel', pieza: 'noticia1', dia: '2026-10-16', metricas: {} },
    { clave: 'facebook/posteo/FBP1', red: 'facebook', parte: 'posteo', pieza: 'nota1', dia: '2026-10-16', metricas: { post_media_view: 2 } },
  ];
  const tocan = queTocaMedir({ libro: LIBRO(), medidas: viejas, ahora: AHORA }).map((p) => p.id).sort();
  assert.ok(tocan.includes('FBH1') && tocan.includes('FBR1'), 'las de la forma vieja vuelven');
  assert.ok(!tocan.includes('FBP1'), 'un posteo bien medido no se repite');
  // El 0 viejo de una historia de Facebook no cuenta como dato.
  assert.deepEqual(alcanceYVistas(viejas[0]), { alcance: null, vistas: null });
  const { fetchFn } = metaGrabado();
  const r = await medirPiezas({ token: 'T', libro: LIBRO(), previo: { medidas: viejas }, ahora: AHORA, fetchFn });
  assert.equal(r.archivo.medidas.filter((m) => m.clave === 'facebook/historia/FBH1').length, 1, 'una sola medida por publicación');
  assert.equal(r.archivo.medidas.find((m) => m.clave === 'facebook/historia/FBH1').v, VERSION_DE_MEDICION);
  const otra = await medirPiezas({ token: 'T', libro: LIBRO(), previo: r.archivo, ahora: AHORA, fetchFn });
  assert.equal(otra.cambio, false, 'medida con la forma nueva, no se vuelve a pedir');
});

test('el posteo de Facebook ya no pide post_impressions_unique (Meta la rechaza: "(#100) The value must be a valid insights metric")', async () => {
  assert.ok(!METRICAS['facebook/posteo'].includes('post_impressions_unique'));
  const api = { pedir: async (_c, { params }) => (params.metric === 'post_impressions_unique' ? Promise.reject(new Error('x')) : { data: [{ values: [{ value: 4 }] }] }) };
  const r = await medirPublicacion({ api, tokenPagina: 'T', p: { red: 'facebook', parte: 'posteo', id: 'FBP1' } });
  assert.equal(r.faltan.length, 0);
});

test('el resumen cuenta las historias con menos de 5 personas y las muestra', () => {
  const filas = resumen({
    medidas: [
      { red: 'instagram', parte: 'historia', pieza: 'farmacia', dia: '2026-10-16', metricas: {}, pocas: true },
      { red: 'instagram', parte: 'historia', pieza: 'farmacia', dia: '2026-10-15', metricas: { reach: 7, views: 9 } },
      { red: 'facebook', parte: 'historia', pieza: 'farmacia', dia: '2026-10-16', v: 2, metricas: { page_story_total_media_view_unique: 3, post_media_view: 4 } },
    ],
  }, { ahora: AHORA });
  const ig = filas.find((f) => f.grupo === 'instagram · historia · farmacia');
  assert.deepEqual([ig.n, ig.pocas, ig.alcance], [2, 1, 7]);
  assert.match(textoDelResumen(filas), /\(1 con menos de 5 personas\)/);
  assert.equal(filas.find((f) => f.red === 'facebook').alcance, 3);
});

test('al publicar, la historia de Facebook guarda su posteo en el libro (para medirla)', () => {
  const p = fs.readFileSync(new URL('../redes/publicar-piezas.mjs', import.meta.url), 'utf8');
  assert.match(p, /\.\.\.\(rh\.postId \? \{ postId: rh\.postId \} : \{\}\)/);
  assert.match(p, /\.\.\.\(r\.postId \? \{ postId: r\.postId \} : \{\}\)/);
  const m = fs.readFileSync(new URL('../redes/meta.mjs', import.meta.url), 'utf8');
  assert.match(m, /postId: fin\.post_id \?\? null/);
});

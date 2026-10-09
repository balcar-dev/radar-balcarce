// Los números de cada pieza (8/10/2026): se mide una vez, cuando ya hay datos casi finales, y lo que Meta no da no frena nada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  publicaciones, queTocaMedir, valorDe, medirPublicacion, medirPiezas, resumen, textoDelResumen, METRICAS, MAXIMO_DE_MEDIDAS,
} from '../redes/estadisticas-piezas.mjs';

const AHORA = new Date('2026-10-10T15:00:00Z');
const hace = (h) => new Date(AHORA.getTime() - h * 3600e3).toISOString();
const LIBRO = () => ({
  instagram: {
    '2026-10-09/noticia1': { mediaId: 'IG1', nombre: 'noticia1', tipo: 'REELS', cuando: hace(30) },
    '2026-10-09/farmacia': { mediaId: 'IG2', nombre: 'farmacia', tipo: 'STORIES', cuando: hace(18) },
    '2026-10-10/clima-manana': { mediaId: 'IG3', nombre: 'clima-manana', tipo: 'STORIES', cuando: hace(5) },
  },
  historiasDeReels: { 'instagram/2026-10-09/noticia1': { mediaId: 'IG4', nombre: 'noticia1', cuando: hace(30) }, 'facebook/2026-10-09/noticia1': { mediaId: 'FB4', nombre: 'noticia1', cuando: hace(30) } },
  instagramFeed: { nota1: { mediaId: 'IG5', cuando: hace(40) } },
  facebookVideos: { '2026-10-09/noticia1': { mediaId: 'FB1', nombre: 'noticia1', tipo: 'REELS', cuando: hace(30) } },
  reelsEnFacebook: { '2026-10-09/farmacia': { mediaId: 'FB2', nombre: 'farmacia', cuando: hace(40) } },
  facebook: { nota1: { postId: 'FB3', cuando: hace(40), titulo: 'x' }, vieja: { postId: 'FB9', cuando: hace(24 * 12) } },
});

test('se juntan las publicaciones de los dos libros, con su red y su tipo', () => {
  const l = publicaciones(LIBRO());
  const por = (id) => l.find((p) => p.id === id);
  assert.deepEqual([por('IG1').red, por('IG1').parte], ['instagram', 'reel']);
  assert.deepEqual([por('IG2').red, por('IG2').parte], ['instagram', 'historia']);
  assert.deepEqual([por('IG4').parte, por('FB4').red, por('FB4').parte], ['historia', 'facebook', 'historia']);
  assert.deepEqual([por('IG5').parte, por('FB1').parte, por('FB2').parte, por('FB3').parte], ['foto', 'reel', 'reel', 'posteo']);
  assert.equal(l.length, 10);
});

test('toca medir lo que ya tiene 24 horas (las historias de Instagram, entre 12 y 24), una sola vez y sin lo vencido', () => {
  const tocan = queTocaMedir({ libro: LIBRO(), ahora: AHORA }).map((p) => p.id).sort();
  // IG3 (historia de hace 5 h) todavía no; FB9 (12 días) ya venció; IG2 (historia de hace 18 h) sí; IG4 (historia de Instagram de hace 30 h) ya no se puede.
  assert.deepEqual(tocan, ['FB1', 'FB2', 'FB3', 'FB4', 'IG1', 'IG2', 'IG5']);
  const medidas = [{ clave: 'instagram/reel/IG1' }, { clave: 'facebook/posteo/FB3' }];
  assert.ok(!queTocaMedir({ libro: LIBRO(), medidas, ahora: AHORA }).some((p) => ['IG1', 'FB3'].includes(p.id)));
  assert.equal(queTocaMedir({ libro: LIBRO(), ahora: AHORA, porCorrida: 3 }).length, 3);
  // Una historia de Instagram que ya pasó las 24 horas no se puede medir: Instagram no da sus números.
  assert.ok(!queTocaMedir({ libro: { instagram: { '2026-10-08/x': { mediaId: 'S', tipo: 'STORIES', cuando: hace(30) } } }, ahora: AHORA }).length);
});

test('el valor sale de un número o de la suma de un desglose, y si no hay, null', () => {
  assert.equal(valorDe({ data: [{ values: [{ value: 5 }, { value: 9 }] }] }), 9);
  assert.equal(valorDe({ data: [{ total_value: { value: 12 } }] }), 12);
  assert.equal(valorDe({ data: [{ values: [{ value: { like: 3, love: 2 } }] }] }), 5);
  assert.equal(valorDe({ data: [] }), null);
  assert.equal(valorDe(null), null);
});

test('cada métrica se pide sola: una que Meta no conoce se anota y las demás se guardan', async () => {
  const pedidos = [];
  const api = {
    pedir: async (camino, { params }) => {
      pedidos.push({ camino, metric: params.metric });
      if (params.metric === 'saved') throw new Error('(#100) metric saved no es válida');
      return { data: [{ values: [{ value: params.metric.length }] }] };
    },
  };
  const r = await medirPublicacion({ api, tokenPagina: 'T', p: { red: 'instagram', parte: 'reel', id: 'IG1' } });
  assert.equal(pedidos.length, METRICAS['instagram/reel'].length);
  assert.ok(pedidos.every((x) => x.camino === 'IG1/insights'));
  assert.equal(r.metricas.reach, 5);
  assert.equal(r.metricas.saved, undefined);
  assert.equal(r.faltan.length, 1);
  assert.match(r.faltan[0], /instagram\/reel · saved/);
  // Los videos de Facebook van por video_insights; los posteos, por insights.
  const v = [];
  await medirPublicacion({ api: { pedir: async (c) => { v.push(c); return {}; } }, tokenPagina: 'T', p: { red: 'facebook', parte: 'reel', id: 'FB1' } });
  assert.ok(v.every((c) => c === 'FB1/video_insights'));
  const q = [];
  await medirPublicacion({ api: { pedir: async (c) => { q.push(c); return {}; } }, tokenPagina: 'T', p: { red: 'facebook', parte: 'posteo', id: 'FB3' } });
  assert.ok(q.every((c) => c === 'FB3/insights'));
});

test('medirPiezas: mide lo que toca con un Meta de mentira, lo anota aunque no vuelva nada y no vuelve a medirlo', async () => {
  const fetchFn = async (url) => {
    const u = String(url);
    if (u.includes('/me/accounts') || u.includes('fields=')) return { ok: true, status: 200, json: async () => ({ access_token: 'TP', instagram_business_account: { id: '999' }, name: 'R', link: 'x' }) };
    return { ok: true, status: 200, json: async () => ({ data: [{ values: [{ value: 7 }] }] }) };
  };
  const r = await medirPiezas({ token: 'T', libro: LIBRO(), previo: {}, ahora: AHORA, fetchFn, porCorrida: 2 });
  assert.equal(r.cambio, true);
  assert.equal(r.midieron, 2);
  assert.equal(r.archivo.medidas.length, 2);
  assert.ok(r.archivo.medidas[0].clave && r.archivo.medidas[0].dia);
  const otra = await medirPiezas({ token: 'T', libro: LIBRO(), previo: r.archivo, ahora: AHORA, fetchFn, porCorrida: 20 });
  assert.equal(otra.archivo.medidas.length, 7, 'las dos primeras no se repiten: en total las 7 que tocaban');
  const nada = await medirPiezas({ token: 'T', libro: LIBRO(), previo: otra.archivo, ahora: AHORA, fetchFn });
  assert.equal(nada.cambio, false);
  assert.ok(MAXIMO_DE_MEDIDAS >= 500);
});

test('el resumen junta por red, tipo y pieza y ordena por alcance', () => {
  const m = (red, parte, pieza, dia, metricas) => ({ red, parte, pieza, dia, metricas });
  const filas = resumen({
    medidas: [
      m('instagram', 'reel', 'participa-nota', '2026-10-09', { reach: 100, views: 150 }),
      m('instagram', 'reel', 'participa-nota', '2026-10-02', { reach: 300, views: 350 }),
      m('instagram', 'historia', 'participa-nota', '2026-10-09', { reach: 80, views: 90 }),
      m('facebook', 'reel', 'clima-manana', '2026-10-09', { total_video_views_unique: 500, total_video_views: 700 }),
      m('facebook', 'posteo', 'nota1', '2026-08-01', { post_impressions_unique: 9 }),
    ],
  }, { ahora: AHORA, dias: 28 });
  assert.equal(filas.length, 3, 'lo de hace más de 28 días no cuenta');
  assert.deepEqual([filas[0].grupo, filas[0].alcance, filas[0].vistas], ['facebook · reel · clima-manana', 500, 700]);
  const ig = filas.find((f) => f.grupo === 'instagram · reel · participa-nota');
  assert.deepEqual([ig.n, ig.alcance, ig.vistas], [2, 200, 250]);
  assert.match(textoDelResumen(filas), /instagram · reel · participa-nota\s+n= 2\s+alcance 200\s+vistas 250/);
  assert.equal(textoDelResumen([]), 'Todavía no hay piezas medidas.');
});

test('el vigilante mide las piezas sin frenar nada y el workflow guarda el archivo', () => {
  const v = fs.readFileSync(new URL('../redes/vigilar.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(v, /medirPiezas\(\{ token: process\.env\.META_TOKEN, libro/);
  assert.match(v, /estadísticas por pieza\) no se pudo medir/);
  const w = fs.readFileSync(new URL('../.github/workflows/vigilancia.yml', import.meta.url), 'utf8');
  assert.match(w, /git add web\/data\/estadisticas-piezas\.json/);
});

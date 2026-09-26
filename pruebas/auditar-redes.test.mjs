// La auditoría del contrato contra Meta (redes/auditar-redes.mjs). Todo con
// respuestas SIMULADAS de la API, con la forma de las verdaderas del 25/09/2026
// (las que vio "Ver Facebook" y "Auditar redes"): sin red y sin token.
//
// Lo que dejó a la vista ese día: el repaso de la mañana salió DOS veces en las
// dos redes (10:03/10:07 en Instagram, 10:04/10:08 en Facebook, y la historia de
// Facebook también), y el libro sólo anotó una. Y el podcast de la noche no
// tuvo historia.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  aFecha, armarMeta, delLibro, emparejar, informeDelDia, informeDeSemana, diasDeLaSemana,
  textoInforme, textoSemana, textoCierre, lineaDeCierreCompleto, pedirMeta, resumenCrudo,
} from '../redes/auditar-redes.mjs';

const REAL = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'libro-real-24-25-09.json'), 'utf8'));
const AR = (fecha, hhmm) => new Date(`${fecha}T${hhmm}:00-03:00`);
/** La hora de Meta para un instante de Balcarce: ISO con "+0000", como la manda la API. */
const meta = (fecha, hhmm) => AR(fecha, hhmm).toISOString().replace(/\.\d{3}Z$/, '+0000');
const unix = (fecha, hhmm) => Math.floor(AR(fecha, hhmm).getTime() / 1000);

const D = '2026-09-25';
/** Lo que Meta tenía publicado el 25/09 a las 23:30 (con los duplicados de la mañana). */
function respuestasDelDia25() {
  const nota = (hhmm, n) => ({ id: `1254237411116171_${n}`, created_time: meta(D, hhmm), message: `Titular ${n}\n\nhttps://radarbalcarce.com/nota/nota-${n}?utm=fb`, permalink_url: `https://www.facebook.com/122096225421495512/posts/${n}`, is_published: true });
  const reelEnElFeed = (hhmm, n) => ({ id: `r${n}`, created_time: meta(D, hhmm), message: 'El repaso', permalink_url: `https://www.facebook.com/reel/${n}/` });
  return {
    fbPosteos: {
      data: [
        nota('14:32', '5'), nota('12:45', '4'), nota('11:05', '3'), nota('09:34', '2'), nota('08:02', '1'),
        reelEnElFeed('20:37', '901'), reelEnElFeed('15:04', '902'), reelEnElFeed('10:08', '903'), reelEnElFeed('10:04', '904'),
      ],
    },
    fbReels: {
      data: [['20:37', 901], ['15:03', 902], ['10:08', 903], ['10:04', 904]].map(([h, n]) => ({ id: String(n), created_time: meta(D, h), description: 'El repaso • …', permalink_url: `/reel/${n}/` })),
    },
    // Las historias de Facebook: `creation_time` en SEGUNDOS Unix (de ahí el "Invalid Date").
    fbHistorias: {
      data: [['20:02'], ['19:02'], ['15:04'], ['10:08'], ['10:06'], ['07:33']].map(([h], i) => ({ creation_time: unix(D, h), status: 'published', url: `https://facebook.com/stories/x/${i}` })),
    },
    igMedia: {
      data: [
        ...[['14:32', 'a'], ['12:45', 'b'], ['11:05', 'c'], ['09:34', 'd'], ['08:02', 'e']].map(([h, i]) => ({ id: `f${i}`, media_product_type: 'FEED', timestamp: meta(D, h), permalink: `https://www.instagram.com/p/${i}/`, caption: `Nota ${i}` })),
        ...[['20:36', 'p1'], ['15:03', 'p2'], ['10:07', 'p3'], ['10:03', 'p4']].map(([h, i]) => ({ id: `r${i}`, media_product_type: 'REELS', timestamp: meta(D, h), permalink: `https://www.instagram.com/reel/${i}/`, caption: 'El repaso' })),
      ],
    },
    igHistorias: { data: [['20:02'], ['19:02'], ['15:03'], ['10:04'], ['07:33']].map(([h], i) => ({ id: `s${i}`, timestamp: meta(D, h), media_type: 'VIDEO' })) },
  };
}
const ahora = AR(D, '23:30');
const finDelDia = new Date(AR(D, '23:59').getTime() + 60000);

test('las horas de Meta: ISO con "+0000" y segundos Unix (las historias de Facebook) dan la misma hora', () => {
  assert.equal(aFecha('2026-09-25T13:04:00+0000'), '2026-09-25T13:04:00.000Z');
  assert.equal(aFecha(unix(D, '10:04')), aFecha(meta(D, '10:04')), 'Unix en segundos, no en milisegundos');
  assert.equal(aFecha(String(unix(D, '10:04'))), '2026-09-25T13:04:00.000Z', 'también si llega como texto');
  assert.equal(aFecha(undefined), null);
  assert.equal(aFecha('nada'), null);
});

test('armarMeta: los reels del feed de Facebook no cuentan como posteos, y cada red queda aparte', () => {
  const m = armarMeta(respuestasDelDia25());
  assert.equal(m.facebook.posteos.length, 5, 'las 4 publicaciones de reel del feed no son notas');
  assert.equal(m.facebook.reels.length, 4);
  assert.equal(m.facebook.historias.length, 6);
  assert.equal(m.instagram.posteos.length, 5);
  assert.equal(m.instagram.reels.length, 4);
  assert.equal(m.instagram.historias.length, 5);
  assert.deepEqual(m.errores, []);
  assert.equal(m.facebook.posteos[0].enlace, 'https://radarbalcarce.com/nota/nota-5', 'el enlace sin los parámetros');
});

test('armarMeta: una consulta que falla queda en null (no en cero) y dice cuál fue', () => {
  const r = respuestasDelDia25();
  r.igHistorias = { error: '(#10) Application does not have permission for this action' };
  r.fbHistorias = { error: 'Unsupported get request' };
  const m = armarMeta(r);
  assert.equal(m.instagram.historias, null);
  assert.equal(m.facebook.historias, null);
  assert.equal(m.facebook.posteos.length, 5, 'las demás siguen');
  assert.deepEqual(m.errores.map((e) => `${e.red}.${e.seccion}`), ['facebook.historias', 'instagram.historias']);
});

test('emparejar: uno por uno por hora; lo pegado que sobra es duplicado, lo lejano es "Meta sin libro"', () => {
  const libro = [{ cuando: AR(D, '10:05').toISOString(), etiqueta: 'a' }, { cuando: AR(D, '15:00').toISOString(), etiqueta: 'b' }];
  const enMeta = [10 * 60 + 4, 10 * 60 + 8, 12 * 60].map((m) => ({ cuando: AR(D, `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`).toISOString() }));
  const r = emparejar(libro, enMeta);
  assert.deepEqual(r.libroSinMeta.map((x) => x.etiqueta), ['b']);
  assert.equal(r.duplicados.length, 1);
  assert.equal(r.metaSinLibro.length, 1);
});

test('el 25/09 con Meta simulada como la de verdad: encuentra los duplicados y la historia que falta', () => {
  const m = armarMeta(respuestasDelDia25());
  const inf = informeDelDia({ libro: REAL, meta: m, fecha: D, ahora: finDelDia });
  const fb = inf.redes.facebook; const ig = inf.redes.instagram;
  assert.deepEqual(fb.real, { posteos: 5, reels: 4, historias: 6 });
  assert.deepEqual(ig.real, { posteos: 5, reels: 4, historias: 5 });
  assert.deepEqual(fb.libro, { posteos: 5, reels: 3, historias: 5 });
  // (c) los duplicados de verdad, con su hora
  assert.deepEqual(fb.duplicados.map((d) => `${d.tipo} ${d.hora}`).sort(), ['historia 10:08', 'reel 10:08']);
  assert.deepEqual(ig.duplicados.map((d) => `${d.tipo} ${d.hora}`), ['reel 10:07']);
  // (d) el faltante: la historia del podcast de la noche, con la hora que le tocaba
  assert.ok(inf.discrepancias.some((d) => /Facebook: falta la historia de podcast noche \(era de las 20:30\)/.test(d)));
  assert.ok(inf.discrepancias.some((d) => /Instagram: falta la historia de podcast noche/.test(d)));
  // (a) y (b): con este libro no hay
  assert.deepEqual(fb.libroSinMeta, []);
  assert.deepEqual(fb.metaSinLibro, []);
  assert.equal(inf.ok, false);
  assert.equal(inf.discrepancias.length, 5);
});

test('(a) el libro dice que salió y Meta no lo tiene', () => {
  const r = respuestasDelDia25();
  r.igMedia.data = r.igMedia.data.filter((x) => x.timestamp !== meta(D, '15:03')); // se borró el reel de la tarde
  const inf = informeDelDia({ libro: REAL, meta: armarMeta(r), fecha: D, ahora: finDelDia });
  assert.deepEqual(inf.redes.instagram.libroSinMeta.map((d) => `${d.tipo} ${d.hora} ${d.etiqueta}`), ['reel 15:03 noticia2']);
  assert.ok(inf.discrepancias.some((d) => /el libro dice que salió el reel de las 15:03 \(noticia2\) pero Meta no lo tiene/.test(d)));
});

test('(b) Meta lo tiene y el libro no: un posteo a mano que no quedó anotado', () => {
  const r = respuestasDelDia25();
  r.fbPosteos.data.push({ id: 'x', created_time: meta(D, '17:00'), message: 'Un posteo a mano', permalink_url: 'https://www.facebook.com/x/posts/9', is_published: true });
  const inf = informeDelDia({ libro: REAL, meta: armarMeta(r), fecha: D, ahora: finDelDia });
  assert.deepEqual(inf.redes.facebook.metaSinLibro.map((d) => `${d.tipo} ${d.hora}`), ['posteo 17:00']);
  assert.deepEqual(inf.redes.facebook.duplicados.map((d) => d.tipo).sort(), ['historia', 'reel']);
});

test('dos posteos con el mismo enlace, aunque estén lejos en la hora, son un duplicado', () => {
  const r = respuestasDelDia25();
  r.fbPosteos.data.push({ id: 'y', created_time: meta(D, '18:30'), message: 'Titular 5\n\nhttps://radarbalcarce.com/nota/nota-5', permalink_url: 'https://www.facebook.com/y/posts/10', is_published: true });
  const inf = informeDelDia({ libro: REAL, meta: armarMeta(r), fecha: D, ahora: finDelDia });
  const rep = inf.redes.facebook.duplicados.filter((d) => d.tipo === 'posteo');
  assert.equal(rep.length, 1);
  assert.match(rep[0].etiqueta, /nota-5/);
});

test('si una consulta falla (falta un permiso), lo dice y sigue con el resto', () => {
  const r = respuestasDelDia25();
  r.igHistorias = { error: '(#10) permiso faltante' };
  const inf = informeDelDia({ libro: REAL, meta: armarMeta(r), fecha: D, ahora: finDelDia });
  assert.equal(inf.redes.instagram.real.historias, null);
  assert.ok(inf.redes.instagram.noVerificado.some((n) => /historias \(\(#10\) permiso faltante\)/.test(n)));
  assert.equal(inf.redes.instagram.real.reels, 4, 'lo demás se sigue auditando');
  assert.deepEqual(inf.redes.instagram.duplicados.map((d) => d.tipo), ['reel']);
  assert.match(textoInforme(inf), /no se pudo verificar: historias/);
});

test('las historias de hace más de 24 horas no se pueden comprobar en Meta: no son "libro sin Meta"', () => {
  // El 24/09, mirado el 26/09 a las 10:00: Meta ya no muestra ninguna historia.
  const m = armarMeta({ ...respuestasDelDia25(), fbHistorias: { data: [] }, igHistorias: { data: [] } });
  const inf = informeDelDia({ libro: REAL, meta: m, fecha: '2026-09-24', ahora: AR('2026-09-26', '10:00') });
  assert.deepEqual(inf.redes.facebook.libroSinMeta.filter((d) => d.tipo === 'historia'), []);
  assert.equal(inf.redes.facebook.real.historias, null);
  assert.ok(inf.redes.facebook.noVerificado.some((n) => /historia\(s\) de hace más de 24 horas/.test(n)));
});

test('sin Meta (sin token) audita sólo el libro y lo dice', () => {
  const inf = informeDelDia({ libro: REAL, meta: null, fecha: D, ahora: finDelDia });
  assert.equal(inf.consultoMeta, false);
  assert.equal(inf.redes.facebook.real.posteos, null);
  assert.match(textoInforme(inf), /sólo el libro/);
  assert.match(lineaDeCierreCompleto({ ...inf, ok: true }), /no pude consultar Meta/);
});

test('un día que cuadra: sin discrepancias y con la línea de cierre', () => {
  // El 24/09 real menos lo que no cumplía el contrato de entonces: se compara sólo con Meta.
  const libro = { facebook: {}, instagram: {}, facebookVideos: {}, instagramFeed: {}, historiasDeReels: {} };
  const inf = informeDelDia({ libro, meta: armarMeta({ fbPosteos: { data: [] }, fbReels: { data: [] }, fbHistorias: { data: [] }, igMedia: { data: [] }, igHistorias: { data: [] } }), fecha: '2026-09-27', ahora: AR('2026-09-27', '09:00') });
  assert.equal(inf.discrepancias.length, 0, 'el 27 a las 9 todo está pendiente todavía');
  assert.equal(inf.ok, true);
  assert.equal(lineaDeCierreCompleto(inf), 'Cierre del día: Facebook e Instagram completos ✓');
});

test('el aviso del cierre entra en WhatsApp: corto, con las discrepancias y sin repetidas', () => {
  const inf = informeDelDia({ libro: REAL, meta: armarMeta(respuestasDelDia25()), fecha: D, ahora: finDelDia });
  const t = textoCierre(inf);
  assert.ok(t.length <= 700, `largo ${t.length}`);
  assert.match(t, /^🔎 Cierre del día/);
  assert.match(t, /DUPLICADO en Meta, reel de las 10:08/);
  assert.match(t, /falta la historia de podcast noche/);
  // Con muchas discrepancias se corta y dice cuántas quedaron afuera.
  const muchas = { ...inf, discrepancias: Array.from({ length: 40 }, (_, i) => `Facebook: algo raro número ${i} con un texto largo para llenar el mensaje`) };
  const largo = textoCierre(muchas);
  assert.ok(largo.length <= 700);
  assert.match(largo, /…y \d+ más/);
});

// ------------------------------------------------------------ la semana

test('los últimos 7 días terminan hoy', () => {
  assert.deepEqual(diasDeLaSemana(AR(D, '10:00')), ['2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', D]);
});

test('la semana: cumplimiento por red y por pieza, con los días que fallaron; los días sin contrato no cuentan', () => {
  const inf = informeDeSemana({ libro: REAL, meta: null, ahora: AR(D, '23:59'), desde: '2026-09-24' });
  assert.deepEqual(inf.dias, ['2026-09-24', D]);
  assert.ok(inf.diasSinContrato.includes('2026-09-21'));
  const fb = inf.porRed.facebook;
  // 24/09: falta clima mañana, podcast mañana (reel + historia). 25/09: falta la historia de la noche.
  assert.equal(fb.debian, 18);
  assert.equal(fb.salieron, 14);
  assert.equal(fb.porcentaje, 78);
  assert.deepEqual(fb.piezas['reel:noticia1'].fallos, ['2026-09-24']);
  assert.deepEqual(fb.piezas['historia:podcast'].fallos, [D]);
  assert.equal(fb.piezas['reel:podcast'].salio, 2);
  assert.equal(fb.posteos, 10);
  assert.equal(fb.posteosTope, 10);
  assert.ok(inf.fallaron.some((f) => f.red === 'instagram' && f.fecha === '2026-09-24' && /clima mañana/.test(f.pieza)));
  const t = textoSemana(inf);
  assert.match(t, /Facebook: cumplimiento de las piezas de video 78%/);
  assert.match(t, /historia podcast noche\s+1\/2\s+falló: 2026-09-25/);
});

test('la semana con Meta: junta los duplicados del 25/09', () => {
  const inf = informeDeSemana({ libro: REAL, meta: armarMeta(respuestasDelDia25()), ahora: AR(D, '23:59'), desde: D });
  assert.deepEqual(inf.dias, [D]);
  assert.equal(inf.duplicados.filter((d) => d.red === 'facebook').length, 2);
  assert.equal(inf.duplicados.filter((d) => d.red === 'instagram').length, 1);
  assert.match(textoSemana(inf), /Duplicados:/);
});

test('sin piezas vencidas todavía no hay porcentaje (a las 8 sólo estaba a tiempo el clima)', () => {
  const libro = { facebook: {}, instagram: {}, facebookVideos: {}, instagramFeed: {}, historiasDeReels: {} };
  const inf = informeDeSemana({ libro, meta: null, ahora: AR('2026-09-27', '08:00'), desde: '2026-09-27' });
  assert.equal(inf.porRed.facebook.porcentaje, null);
  assert.equal(inf.porRed.facebook.debian, 0);
});

// ---------------------------------------------------- el pedido (separado)

test('pedirMeta: pide las cinco cosas con el token de la página, sigue si una falla y no muestra el token', async () => {
  const pedidos = [];
  const api = {
    pagina: async () => ({ tokenPagina: 'TOKEN-DE-LA-PAGINA', instagramId: '178414' }),
    pedir: async (camino, { params, conToken }) => {
      pedidos.push({ camino, conToken, campos: params.fields });
      if (camino.endsWith('/stories') && camino.startsWith('178414')) throw new Error('(#10) sin permiso con TOKEN-DE-LA-PAGINA');
      return { data: [] };
    },
  };
  const m = await pedirMeta({ api, paginaId: '1254237411116171', ahora, token: 'TOKEN-DE-LA-PAGINA' });
  assert.deepEqual(pedidos.map((p) => p.camino).sort(), [
    '1254237411116171/published_posts', '1254237411116171/stories', '1254237411116171/video_reels',
    '178414/media', '178414/stories',
  ]);
  assert.ok(pedidos.every((p) => p.conToken === 'TOKEN-DE-LA-PAGINA'));
  assert.match(pedidos.find((p) => p.camino === '178414/media').campos, /media_product_type,.*timestamp,permalink,caption/);
  assert.equal(m.instagram.historias, null);
  assert.deepEqual(m.facebook.posteos, []);
  assert.ok(!JSON.stringify(m).includes('TOKEN-DE-LA-PAGINA'), 'el token no aparece en lo que devuelve');
  assert.match(resumenCrudo(m), /instagram.historias: \(no se pudo leer\)/);
});

test('pedirMeta: sin Instagram vinculado, sigue con Facebook y lo dice', async () => {
  const api = { pagina: async () => ({ tokenPagina: 't', instagramId: null }), pedir: async () => ({ data: [] }) };
  const m = await pedirMeta({ api, paginaId: '1', ahora, token: 't' });
  assert.equal(m.instagram.reels, null);
  assert.ok(m.errores.some((e) => /Instagram vinculado/.test(e.mensaje)));
  assert.deepEqual(m.facebook.reels, []);
});

test('pedirMeta: si ni siquiera se puede leer la página, todo queda sin verificar', async () => {
  const api = { pagina: async () => { throw new Error('token vencido TOK'); }, pedir: async () => ({ data: [] }) };
  const m = await pedirMeta({ api, paginaId: '1', ahora, token: 'TOK' });
  assert.equal(m.facebook.posteos, null);
  assert.equal(m.errores.length, 5);
  assert.ok(!JSON.stringify(m).includes('TOK'));
});

test('el libro se lee por red y por tipo', () => {
  const fb = delLibro(REAL, 'facebook');
  const ig = delLibro(REAL, 'instagram');
  assert.equal(fb.posteos.length, 10);
  assert.equal(ig.posteos.length, 9);
  assert.equal(fb.reels.length, 5);
  assert.ok(ig.historias.some((h) => h.etiqueta === 'noticia2'), 'las historias de podcast salen de historiasDeReels');
});

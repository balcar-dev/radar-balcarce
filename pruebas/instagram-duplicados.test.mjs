// 5/10/2026 (Hernán): en el Instagram aparecieron CUATRO copias del mismo posteo. Meta contestó "Application request limit reached" pero igual publicó, el sistema
// lo dio por fallado y cada vuelta (cada 30 minutos) volvió a subirlo. Ahora, antes de reintentar y después de un error, se mira si ya salió; y tras un límite
// de Meta se espera en vez de insistir.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { crearCliente } from '../redes/meta.mjs';
import { libroNuevo } from '../redes/elegir.mjs';
import { claveDePieza, pieDePieza } from '../redes/piezas.mjs';
import { publicarPiezas } from '../redes/publicar-piezas.mjs';
import { esElMismoPosteo, posteoYaPublicado, esLimiteDeMeta, espejosPendientes, ESPEJO } from '../redes/espejo.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const PIE = 'Vecinos reclaman soluciones por el difícil tránsito en la zona de calles 19 y 114 bis\n\nMás en radarbalcarce.com\n#Balcarce';
const AHORA = new Date('2026-10-05T19:00:00Z');

test('el mismo posteo se reconoce por el principio del texto, sin importar tildes, mayúsculas ni lo que se agregue al final', () => {
  assert.ok(esElMismoPosteo('vecinos reclaman soluciones por el dificil transito en la zona de calles 19 y 114 bis  más en radarbalcarce.com #balcarce #Hospital', PIE));
  assert.ok(!esElMismoPosteo('Otro título distinto de otra noticia de Balcarce que no tiene nada que ver', PIE));
  assert.ok(!esElMismoPosteo('', PIE));
  assert.ok(!esElMismoPosteo(PIE, 'corto'), 'un pie muy corto no alcanza para asegurar que es el mismo');
});

test('si en Instagram ya está, se encuentra; si es de hace más de 12 horas o es otro, no', () => {
  const medias = [
    { id: 'a', caption: 'Algo que no tiene nada que ver con lo otro que se busca', timestamp: '2026-10-05T18:50:00+0000' },
    { id: 'b', caption: `${PIE} #otro`, timestamp: '2026-10-05T18:50:00+0000' },
  ];
  assert.equal(posteoYaPublicado(medias, PIE, { ahora: AHORA }).id, 'b');
  assert.equal(posteoYaPublicado([{ ...medias[1], timestamp: '2026-10-04T10:00:00+0000' }], PIE, { ahora: AHORA }), null, 'uno de ayer es otro posteo');
  assert.equal(posteoYaPublicado([], PIE, { ahora: AHORA }), null);
  assert.equal(posteoYaPublicado(undefined, PIE, { ahora: AHORA }), null);
});

test('un límite de pedidos de Meta se reconoce por el mensaje o por el código', () => {
  assert.ok(esLimiteDeMeta('Application request limit reached'));
  assert.ok(esLimiteDeMeta('algo', 4));
  assert.ok(esLimiteDeMeta('x', 613));
  assert.ok(!esLimiteDeMeta('Only photo or video can be accepted as media type', 100));
});

test('después de un límite de Meta el espejo espera: no se reintenta hasta que pase el rato', () => {
  const nota = { id: 'n1xmig' };
  const libro = { facebook: { n1xmig: { cuando: '2026-10-05T18:45:00Z', espejoDespuesDe: '2026-10-05T19:30:00Z' } }, instagramFeed: {} };
  assert.equal(espejosPendientes({ notas: [nota], libro, ahora: new Date('2026-10-05T19:05:00Z') }).length, 0, 'todavía espera');
  assert.equal(espejosPendientes({ notas: [nota], libro, ahora: new Date('2026-10-05T19:31:00Z') }).length, 1, 'pasado el rato vuelve a tocar');
  assert.equal(ESPEJO.minutosTrasUnLimite, 45);
});

test('el cliente de Meta sabe preguntar qué hay publicado en Instagram', async () => {
  const pedidos = [];
  const respuestas = [
    { json: { name: 'Radar Balcarce', link: 'x', access_token: 'TP', instagram_business_account: { id: '999', username: 'radarbalcarce' } } },
    { json: { data: [{ id: 'm1', caption: 'hola', timestamp: '2026-10-05T18:50:00+0000' }] } },
  ];
  const fetchFn = async (url) => { pedidos.push(String(url)); const r = respuestas.shift(); return { ok: true, status: 200, json: async () => r.json }; };
  const api = crearCliente({ token: 'TOKEN', paginaId: '123', fetchFn });
  const medias = await api.publicacionesRecientesDeInstagram({ limite: 10 });
  assert.equal(medias[0].id, 'm1');
  assert.match(pedidos[1], /\/999\/media\?.*fields=id%2Ccaption%2Ctimestamp/);
  assert.match(pedidos[1], /limit=10/);
});

test('un reel que falló pero que Instagram sí publicó no se vuelve a subir; se anota con el id que ya tiene', async () => {
  const pieza = { nombre: 'efemeride', tipo: 'reel', hora: '09:00', archivo: 'efe.mp4', titulo: 'Un día como hoy: Se funda un pueblo de la zona', notaId: null };
  const ahora = new Date('2026-10-05T12:30:00Z');
  const pie = pieDePieza(pieza);
  const subidas = [];
  const api = {
    publicarVideoEnInstagram: async ({ tipo }) => { subidas.push(tipo); return { id: `nuevo-${subidas.length}` }; },
    publicacionesRecientesDeInstagram: async () => [{ id: 'ya-salio', caption: pie, timestamp: '2026-10-05T12:10:00+0000' }],
  };
  const libro = libroNuevo();
  const clave = claveDePieza('efemeride', ahora);
  // La vuelta anterior dejó anotado que falló.
  libro.problemas = { [`${clave}/instagram/reel`]: { pieza: 'efemeride', red: 'instagram', parte: 'reel', error: 'Application request limit reached', cuando: '2026-10-05T12:05:00Z' } };
  const r = await publicarPiezas({
    api, manifiesto: [pieza], libro, activo: true, destinos: ['instagram'], esperar: async () => {}, sinHorario: true, ahora,
    leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {},
  });
  assert.deepEqual(subidas, [], 'no se subió otra copia');
  assert.equal(libro.instagram[clave].mediaId, 'ya-salio');
  assert.equal(libro.problemas?.[`${clave}/instagram/reel`], undefined, 'el problema queda resuelto');
  assert.deepEqual(r.fallos, []);
});

test('si el reel de verdad no salió, se sube como siempre', async () => {
  const pieza = { nombre: 'efemeride', tipo: 'reel', hora: '09:00', archivo: 'efe.mp4', titulo: 'Un día como hoy: Se funda un pueblo de la zona' };
  const ahora = new Date('2026-10-05T12:30:00Z');
  const subidas = [];
  const api = {
    publicarVideoEnInstagram: async ({ tipo }) => { subidas.push(tipo); return { id: `nuevo-${subidas.length}` }; },
    publicacionesRecientesDeInstagram: async () => [],
  };
  const libro = libroNuevo();
  libro.problemas = { [`${claveDePieza('efemeride', ahora)}/instagram/reel`]: { pieza: 'efemeride', red: 'instagram', parte: 'reel', error: 'x', cuando: '2026-10-05T12:05:00Z' } };
  await publicarPiezas({ api, manifiesto: [pieza], libro, activo: true, destinos: ['instagram'], esperar: async () => {}, sinHorario: true, ahora, leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {} });
  assert.deepEqual(subidas, ['REELS', 'STORIES'], 'el reel y su historia');
});

test('el espejo de Facebook a Instagram mira si ya salió, antes de reintentar y después de un error', () => {
  const c = fs.readFileSync(path.join(RAIZ, 'redes', 'publicar.mjs'), 'utf8');
  assert.match(c, /const yaSalio = async \(\) =>/);
  assert.match(c, /\(f\?\.intentosEspejo \?\? 0\) > 0 \|\| f\?\.espejoDespuesDe/);
  assert.match(c, /Meta contestó con un error pero lo publicó/);
  assert.match(c, /esLimiteDeMeta\(e\.message, e\.codigo\)/);
});

// ------------------------------------------------ el vigilante busca las copias

import { copiasRepetidas } from '../redes/espejo.mjs';
import { evaluar } from '../redes/vigilar.mjs';

test('se encuentran las copias repetidas en Instagram (mismo texto, últimas 48 horas) y no se confunden notas distintas', () => {
  const medias = [
    { id: '1', caption: PIE, timestamp: '2026-10-05T18:50:00+0000' },
    { id: '2', caption: PIE, timestamp: '2026-10-05T19:20:00+0000' },
    { id: '3', caption: `${PIE}\n#otro`, timestamp: '2026-10-05T19:50:00+0000' },
    { id: '4', caption: 'Otra noticia distinta de Balcarce que salió una sola vez en el día', timestamp: '2026-10-05T17:00:00+0000' },
    { id: '5', caption: PIE, timestamp: '2026-09-20T10:00:00+0000' },
  ];
  const r = copiasRepetidas(medias, { ahora: AHORA });
  assert.equal(r.length, 1);
  assert.equal(r[0].copias, 3);
  assert.deepEqual(r[0].ids, ['1', '2', '3']);
  assert.match(r[0].titulo, /^Vecinos reclaman soluciones/);
  assert.deepEqual(copiasRepetidas([], { ahora: AHORA }), []);
});

test('el vigilante avisa grave si Instagram tiene copias repetidas, y dice qué hacer', () => {
  const hace = (min) => new Date(AHORA.getTime() - min * 60000).toISOString();
  const corrida = (min) => ({ createdAt: hace(min), conclusion: 'success', status: 'completed' });
  const o = {
    ahora: AHORA, web: { estado: 200, actualizado: hace(20) }, www: { redirige: true },
    corridas: { 'Actualizar la web': [corrida(20)], Redes: [corrida(10)], 'Cloudflare Pages': [corrida(18)] },
    libro: { instagram: {}, facebook: {} },
    copiasEnInstagram: [{ titulo: 'Vecinos reclaman soluciones por el difícil tránsito', copias: 4, ids: ['1', '2', '3', '4'] }],
  };
  const p = evaluar(o).find((x) => x.clave === 'instagram-copias');
  assert.ok(p, 'avisa');
  assert.equal(p.nivel, 'alta');
  assert.match(p.texto, /4 copias/);
  assert.match(p.texto, /borrá las demás a mano/);
  assert.equal(evaluar({ ...o, copiasEnInstagram: [] }).find((x) => x.clave === 'instagram-copias'), undefined);
});

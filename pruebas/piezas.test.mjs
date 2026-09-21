// Las piezas de video a Instagram: qué sale, cuándo, y cómo se sube.
//
// Todo con un Meta de mentira. Lo que se vigila: que una pieza no salga dos
// veces, que no salga fuera de su hora, y que un video que Instagram no acepta
// no termine publicado a medias.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearCliente } from '../redes/meta.mjs';
import { libroNuevo, anotar } from '../redes/elegir.mjs';
import { claveDePieza, piezasQueTocan, tipoInstagram, pieDePieza } from '../redes/piezas.mjs';
import { publicarPiezas } from '../redes/publicar-piezas.mjs';

const TOKEN = 'TOKEN-DE-USUARIO';
const PAGINA = {
  json: {
    name: 'Radar Balcarce', link: 'x', access_token: 'TOKEN-DE-PAGINA',
    instagram_business_account: { id: '999', username: 'radarbalcarce' },
  },
};

function fetchFalso(respuestas) {
  const pedidos = [];
  const fn = async (url, init) => {
    pedidos.push({ url: String(url), init });
    const r = respuestas.shift();
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.json };
  };
  return { fn, pedidos };
}

// -------------------------------------------------------- subir un video

test('un video se sube directo a la dirección que da Instagram, y recién ahí se publica', async () => {
  const video = Buffer.from('un-video-de-mentira');
  const { fn, pedidos } = fetchFalso([
    PAGINA,
    { json: { id: 'cont1', uri: 'https://rupload.facebook.com/ig-api-upload/v23.0/cont1' } },
    { json: { success: true } },                     // la subida
    { json: { status_code: 'IN_PROGRESS' } },
    { json: { status_code: 'FINISHED' } },
    { json: { id: 'media1' } },
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  const r = await api.publicarVideoEnInstagram({ video, tipo: 'STORIES' });

  assert.equal(r.id, 'media1');

  const contenedor = new URLSearchParams(pedidos[1].init.body);
  assert.equal(contenedor.get('media_type'), 'STORIES');
  assert.equal(contenedor.get('upload_type'), 'resumable');
  assert.ok(!contenedor.has('caption'), 'las historias no llevan texto');

  const subida = pedidos[2];
  assert.equal(subida.url, 'https://rupload.facebook.com/ig-api-upload/v23.0/cont1');
  assert.equal(subida.init.headers.Authorization, 'OAuth TOKEN-DE-PAGINA');
  assert.equal(subida.init.headers.offset, '0');
  assert.equal(subida.init.headers.file_size, String(video.length));
  assert.equal(subida.init.body, video);

  assert.ok(pedidos.at(-1).url.endsWith('/999/media_publish'));
  for (const p of pedidos) assert.ok(!p.url.includes('TOKEN'), 'el token está en una dirección');
});

test('un reel lleva su texto', async () => {
  const { fn, pedidos } = fetchFalso([
    PAGINA,
    { json: { id: 'c', uri: 'https://rupload/c' } }, { json: { success: true } },
    { json: { status_code: 'FINISHED' } }, { json: { id: 'm' } },
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '1', fetchFn: fn, esperar: async () => {} });
  await api.publicarVideoEnInstagram({ video: Buffer.from('v'), tipo: 'REELS', pie: 'Un titular' });
  assert.equal(new URLSearchParams(pedidos[1].init.body).get('caption'), 'Un titular');
});

test('si la subida falla, no se publica nada', async () => {
  const { fn, pedidos } = fetchFalso([
    PAGINA,
    { json: { id: 'c', uri: 'https://rupload/c' } },
    { ok: false, status: 500, json: { debug_info: { message: `roto ${TOKEN}` } } },
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '1', fetchFn: fn, esperar: async () => {} });
  await assert.rejects(api.publicarVideoEnInstagram({ video: Buffer.from('v'), tipo: 'STORIES' }), (e) => {
    assert.ok(!e.message.includes(TOKEN), 'el error repite el token');
    return true;
  });
  assert.ok(!pedidos.some((p) => p.url.includes('media_publish')));
});

test('si Instagram rechaza el video al procesarlo, no se publica', async () => {
  const { fn, pedidos } = fetchFalso([
    PAGINA,
    { json: { id: 'c', uri: 'https://rupload/c' } }, { json: { success: true } },
    { json: { status_code: 'ERROR', status: 'formato inválido' } },
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '1', fetchFn: fn, esperar: async () => {} });
  await assert.rejects(api.publicarVideoEnInstagram({ video: Buffer.from('v'), tipo: 'STORIES' }), /rechaz/);
  assert.ok(!pedidos.some((p) => p.url.includes('media_publish')));
});

test('un tipo que no existe ni se intenta', async () => {
  const { fn } = fetchFalso([PAGINA]);
  const api = crearCliente({ token: TOKEN, paginaId: '1', fetchFn: fn });
  await assert.rejects(api.publicarVideoEnInstagram({ video: Buffer.from('v'), tipo: 'POST' }), /desconocido/);
});

// ------------------------------------------------------ qué pieza sale ya

/** Las 08:00 del 21/09 en Balcarce. */
const A_LAS = (hhmm) => new Date(`2026-09-21T${hhmm}:00-03:00`);

const PIEZAS = [
  { nombre: 'clima-manana', tipo: 'historia', hora: '07:30', titulo: 'El clima de hoy', archivo: 'clima-manana.mp4' },
  { nombre: 'noticia1', tipo: 'reel', hora: '10:00', titulo: 'Una noticia con gancho', archivo: 'noticia1.mp4' },
  { nombre: 'farmacia', tipo: 'historia', hora: '19:00', titulo: 'Farmacia de turno', archivo: 'farmacia.mp4' },
];

test('cada pieza sale a su hora y no antes', () => {
  assert.deepEqual(piezasQueTocan({ piezas: PIEZAS, libro: libroNuevo(), ahora: A_LAS('07:00') }), []);
  assert.deepEqual(piezasQueTocan({ piezas: PIEZAS, libro: libroNuevo(), ahora: A_LAS('08:00') }).map((p) => p.nombre), ['clima-manana']);
});

test('una pieza vencida no sale: el clima de la mañana a las tres de la tarde ya no sirve', () => {
  assert.deepEqual(piezasQueTocan({ piezas: PIEZAS, libro: libroNuevo(), ahora: A_LAS('15:00') }), []);
});

test('lo que ya salió no sale de nuevo', () => {
  const libro = libroNuevo();
  anotar(libro, 'instagram', claveDePieza('clima-manana', A_LAS('08:00')), {});
  assert.deepEqual(piezasQueTocan({ piezas: PIEZAS, libro, ahora: A_LAS('08:30') }), []);
});

test('el libro de un día no frena las piezas del día siguiente', () => {
  const libro = libroNuevo();
  anotar(libro, 'instagram', claveDePieza('clima-manana', A_LAS('08:00')), {});
  const manana = new Date('2026-09-22T08:00:00-03:00');
  assert.deepEqual(piezasQueTocan({ piezas: PIEZAS, libro, ahora: manana }).map((p) => p.nombre), ['clima-manana']);
});

test('a mano, sin horario, salen todas las que falten', () => {
  const r = piezasQueTocan({ piezas: PIEZAS, libro: libroNuevo(), ahora: A_LAS('16:00'), sinHorario: true });
  assert.equal(r.length, 3);
});

test('los reels van como reel y lo demás como historia', () => {
  assert.equal(tipoInstagram(PIEZAS[0]), 'STORIES');
  assert.equal(tipoInstagram(PIEZAS[1]), 'REELS');
});

test('las historias no llevan texto y los reels sí', () => {
  assert.equal(pieDePieza(PIEZAS[0]), '');
  assert.match(pieDePieza(PIEZAS[1]), /^Una noticia con gancho\n\nMás en radarbalcarce\.com$/);
  assert.match(pieDePieza({ nombre: 'podcast', tipo: 'reel' }), /repaso del día/);
});

// ------------------------------------------------ publicar de punta a punta

function apiFalsa({ falla = [] } = {}) {
  const subidas = [];
  return {
    subidas,
    publicarVideoEnInstagram: async ({ video, tipo, pie }) => {
      const nombre = video.toString();
      if (falla.includes(nombre)) throw Object.assign(new Error('Instagram dijo que no'), { tokenMuerto: false });
      subidas.push({ nombre, tipo, pie });
      return { id: `id-${nombre}` };
    },
  };
}

test('publica lo que toca, lo anota y guarda después de cada una', async () => {
  const api = apiFalsa();
  const libro = libroNuevo();
  let guardados = 0;
  const r = await publicarPiezas({
    api, manifiesto: PIEZAS, libro, activo: true, sinHorario: true, ahora: A_LAS('16:00'),
    leerVideo: (a) => Buffer.from(a), guardar: () => { guardados += 1; }, log: () => {},
  });
  assert.equal(r.publicadas.length, 3);
  assert.equal(guardados, 3, 'tiene que guardar después de cada pieza');
  assert.ok(libro.instagram[claveDePieza('noticia1', A_LAS('16:00'))]);
});

test('si una pieza falla, las otras igual salen y la que falló queda para reintentar', async () => {
  const api = apiFalsa({ falla: ['noticia1.mp4'] });
  const libro = libroNuevo();
  const r = await publicarPiezas({
    api, manifiesto: PIEZAS, libro, activo: true, sinHorario: true, ahora: A_LAS('16:00'),
    leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {},
  });
  assert.deepEqual(r.publicadas, ['clima-manana', 'farmacia']);
  assert.equal(r.fallos.length, 1);
  assert.equal(libro.instagram[claveDePieza('noticia1', A_LAS('16:00'))], undefined);
});

test('en modo prueba no publica ni anota nada', async () => {
  const api = apiFalsa();
  const libro = libroNuevo();
  await publicarPiezas({
    api, manifiesto: PIEZAS, libro, activo: false, sinHorario: true, ahora: A_LAS('16:00'),
    leerVideo: (a) => Buffer.from(a), guardar: () => assert.fail('no debería guardar'), log: () => {},
  });
  assert.equal(api.subidas.length, 0);
  assert.deepEqual(libro.instagram, {});
});

test('si el token murió, corta: no tiene sentido seguir', async () => {
  const api = {
    publicarVideoEnInstagram: async () => { throw Object.assign(new Error('token'), { tokenMuerto: true }); },
  };
  const r = await publicarPiezas({
    api, manifiesto: PIEZAS, libro: libroNuevo(), activo: true, sinHorario: true, ahora: A_LAS('16:00'),
    leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {},
  });
  assert.equal(r.tokenMuerto, true);
  assert.equal(r.fallos.length, 1, 'siguió intentando con un token muerto');
});

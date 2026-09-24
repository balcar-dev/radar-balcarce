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
    api, manifiesto: PIEZAS, libro, activo: true, destinos: ['instagram'], esperar: async () => {}, sinHorario: true, ahora: A_LAS('16:00'),
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
    api, manifiesto: PIEZAS, libro, activo: true, destinos: ['instagram'], esperar: async () => {}, sinHorario: true, ahora: A_LAS('16:00'),
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
    api, manifiesto: PIEZAS, libro, activo: false, destinos: ['instagram'], esperar: async () => {}, sinHorario: true, ahora: A_LAS('16:00'),
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
    api, manifiesto: PIEZAS, libro: libroNuevo(), activo: true, destinos: ['instagram'], esperar: async () => {}, sinHorario: true, ahora: A_LAS('16:00'),
    leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {},
  });
  assert.equal(r.tokenMuerto, true);
  assert.equal(r.fallos.length, 1, 'siguió intentando con un token muerto');
});

// ------------------------------------------------------------- el reloj

import {
  cronogramaDelDia, slotsQueTocan, notasUsadasHoy, piezasPublicadasHoy, VENTANA_MINUTOS, HORAS_REELS, horaHistoriaDeNota, ventanaDe,
  diaRotativoDeUtiles,
} from '../redes/piezas.mjs';

/** Un lunes (21/09/2026) a la hora de Balcarce que se pida. */
const LUNES = (hhmm) => new Date(`2026-09-21T${hhmm}:00-03:00`);
const nombres = (lista) => lista.map((p) => p.nombre);

test('el cronograma del día trae las fijas, los reels y las historias de notas', () => {
  const c = cronogramaDelDia(LUNES('12:00'));
  assert.deepEqual(nombres(c), [
    'clima-manana', 'noticia1', 'historia1', 'historia2', 'historia3', 'noticia2', 'farmacia', 'clima-noche', 'podcast',
  ]);
  assert.equal(c.find((p) => p.nombre === 'clima-manana').hora, '07:30');
  assert.equal(c.find((p) => p.nombre === 'podcast').tipo, 'reel');
});

test('los teléfonos útiles salen un día hábil por semana, y rotan de una semana a la otra', () => {
  // No siempre el mismo día: se probó una semana y salía siempre martes, y
  // se pidió que cambiara. diaRotativoDeUtiles ya dice qué día es esta
  // semana; alcanza con probar que el cronograma lo respeta y que otro día
  // de la misma semana no lo tiene.
  const unLunes = LUNES('12:00');
  const diaDeEstaSemana = diaRotativoDeUtiles(unLunes);
  const otroDiaHabil = new Date(unLunes);
  otroDiaHabil.setDate(otroDiaHabil.getDate() + ((diaDeEstaSemana === 1 ? 2 : 1)));

  const conElDiaQueToca = new Date(unLunes);
  conElDiaQueToca.setDate(conElDiaQueToca.getDate() + (diaDeEstaSemana - 1));
  assert.ok(nombres(cronogramaDelDia(conElDiaQueToca)).includes('utiles'));
  assert.ok(!nombres(cronogramaDelDia(otroDiaHabil)).includes('utiles'));

  // Y de una semana a la siguiente, el día cambia.
  const semanaQueViene = new Date(unLunes);
  semanaQueViene.setDate(semanaQueViene.getDate() + 7);
  assert.notEqual(diaRotativoDeUtiles(semanaQueViene), diaDeEstaSemana);
});

test('si alguien fija el día de los útiles a mano en el panel, eso manda y no rota', () => {
  const unLunes = LUNES('12:00');
  const diaFijado = diaRotativoDeUtiles(unLunes) === 3 ? 4 : 3; // cualquiera distinto del que tocaría solo
  const estado = { horarios: { utiles: { dias: [diaFijado] } } };
  const diaConElFijado = new Date(unLunes);
  diaConElFijado.setDate(diaConElFijado.getDate() + (diaFijado - 1));
  assert.ok(nombres(cronogramaDelDia(diaConElFijado, { estado })).includes('utiles'));
});

test('la agenda no la espera GitHub: necesita datos que sólo hay en la PC', () => {
  // Si GitHub la esperara, la reintentaría en cada corrida sin poder
  // armarla nunca.
  const jueves = new Date('2026-09-24T12:00:00-03:00');
  assert.ok(!nombres(cronogramaDelDia(jueves)).includes('agenda'));
});

test('los horarios de los reels y las historias de notas son los que dice REDES.md', () => {
  assert.deepEqual(HORAS_REELS, ['10:00', '15:00', '20:30']);
  assert.deepEqual([0, 1, 2].map(horaHistoriaDeNota), ['10:40', '12:40', '14:40']);
});

test('a cada hora toca lo que corresponde', () => {
  const libro = libroNuevo();
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('07:35'), libro })), ['clima-manana']);
  // El clima de la mañana sigue valiendo hasta las 11:30.
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('10:05'), libro })), ['clima-manana', 'noticia1']);
  // El reel de las 15:00 sigue valiendo hasta las 20:00.
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('19:05'), libro })), ['noticia2', 'farmacia']);
  // La farmacia de las 19:00 todavía está en su ventana (hasta las 21:00): si no salió, toca.
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('20:35'), libro })), ['farmacia', 'clima-noche', 'podcast']);
});

test('de madrugada no toca nada', () => {
  assert.deepEqual(slotsQueTocan({ ahora: LUNES('03:00'), libro: libroNuevo() }), []);
});

test('una corrida que llega tarde todavía alcanza, pero no para siempre', () => {
  // El reloj de GitHub se demora: la ventana es lo que lo hace tolerable.
  const libro = libroNuevo();
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('08:50'), libro })), ['clima-manana']);
  assert.deepEqual(slotsQueTocan({ ahora: LUNES('11:40'), libro }).filter((p) => p.nombre === 'clima-manana'), [],
    'el clima de las 7:30 ya no sirve a las 11:40');
  assert.equal(VENTANA_MINUTOS, 120);
});

test('la farmacia, el clima de la noche y el podcast valen toda la noche', () => {
  // El 21/09 GitHub no corrió nada entre las 19:00 y las 21:00 y la farmacia de
  // esa noche se perdió con una ventana de 2 horas. El turno dura hasta la
  // mañana siguiente: no tiene sentido que la pieza venza a las 21:00.
  const libro = libroNuevo();
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('23:30'), libro })), ['farmacia', 'clima-noche', 'podcast']);
  assert.equal(ventanaDe('farmacia'), 300);
});

test('ninguna ventana cruza la medianoche: lo de un día no sale al siguiente', () => {
  const dia = cronogramaDelDia(LUNES('12:00'));
  for (const p of dia) {
    const [h, m] = p.hora.split(':').map(Number);
    assert.ok(h * 60 + m + ventanaDe(p.nombre) <= 24 * 60, `${p.nombre} llega después de las 24:00`);
  }
  assert.deepEqual(slotsQueTocan({ ahora: new Date('2026-09-22T00:30:00-03:00'), libro: libroNuevo() }), []);
});

test('lo que ya salió hoy no vuelve a tocar', () => {
  const libro = libroNuevo();
  anotar(libro, 'instagram', claveDePieza('clima-manana', LUNES('08:00')), {});
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('08:35'), libro })), []);
});

test('lo de ayer no frena lo de hoy', () => {
  const libro = libroNuevo();
  anotar(libro, 'instagram', claveDePieza('clima-manana', new Date('2026-09-20T08:00:00-03:00')), {});
  assert.deepEqual(nombres(slotsQueTocan({ ahora: LUNES('07:35'), libro })), ['clima-manana']);
});

test('las notas ya usadas hoy y las piezas ya publicadas se reconocen', () => {
  const libro = libroNuevo();
  anotar(libro, 'instagram', claveDePieza('noticia1', LUNES('10:00')), { notaId: 'abc' });
  anotar(libro, 'instagram', claveDePieza('clima-manana', new Date('2026-09-20T08:00:00-03:00')), { notaId: 'vieja' });
  assert.deepEqual([...notasUsadasHoy(libro, LUNES('12:00'))], ['abc']);
  assert.deepEqual([...piezasPublicadasHoy(libro, LUNES('12:00'))], ['noticia1']);
});


// -------------------------------------------- el mismo video en Facebook

const PAGINA_FB = {
  json: {
    name: 'Radar Balcarce', link: 'x', access_token: 'TOKEN-DE-PAGINA',
    instagram_business_account: { id: '999', username: 'radarbalcarce' },
  },
};

test('un reel en Facebook: se abre la subida, se manda el archivo y se cierra con su texto', async () => {
  const video = Buffer.from('un-reel-de-mentira');
  const { fn, pedidos } = fetchFalso([
    PAGINA_FB,
    { json: { video_id: 'v1', upload_url: 'https://rupload.facebook.com/video-upload/v23.0/v1' } },
    { json: { success: true } },                       // la subida
    { json: { success: true, post_id: 'p1' } },        // el cierre
    { json: { status: { video_status: 'ready' } } },   // ya está procesado
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  const r = await api.publicarVideoEnFacebook({ video, tipo: 'REELS', pie: 'Un titular' });

  assert.deepEqual(r, { id: 'v1', postId: 'p1' });
  assert.ok(pedidos[1].url.endsWith('/123/video_reels'));
  assert.equal(new URLSearchParams(pedidos[1].init.body).get('upload_phase'), 'start');

  assert.equal(pedidos[2].url, 'https://rupload.facebook.com/video-upload/v23.0/v1');
  assert.equal(pedidos[2].init.headers.Authorization, 'OAuth TOKEN-DE-PAGINA');
  assert.equal(pedidos[2].init.headers.file_size, String(video.length));
  assert.equal(pedidos[2].init.body, video);

  const cierre = new URLSearchParams(pedidos[3].init.body);
  assert.equal(cierre.get('upload_phase'), 'finish');
  assert.equal(cierre.get('video_id'), 'v1');
  assert.equal(cierre.get('video_state'), 'PUBLISHED');
  assert.equal(cierre.get('description'), 'Un titular');
  for (const p of pedidos) assert.ok(!p.url.includes('TOKEN'), 'el token está en una dirección');
});

test('una historia en Facebook usa su propia dirección y no lleva texto', async () => {
  const { fn, pedidos } = fetchFalso([
    PAGINA_FB,
    { json: { video_id: 'v2', upload_url: 'https://rupload/v2' } },
    { json: { success: true } }, { json: { success: true } }, { json: { status: {} } },
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  await api.publicarVideoEnFacebook({ video: Buffer.from('v'), tipo: 'STORIES', pie: 'no debería ir' });
  assert.ok(pedidos[1].url.endsWith('/123/video_stories'));
  const cierre = new URLSearchParams(pedidos[3].init.body);
  assert.ok(!cierre.has('description'));
  assert.ok(!cierre.has('video_state'));
});

test('si Facebook rechaza el video al procesarlo, se avisa', async () => {
  const { fn } = fetchFalso([
    PAGINA_FB,
    { json: { video_id: 'v3', upload_url: 'https://rupload/v3' } },
    { json: { success: true } }, { json: { success: true } },
    { json: { status: { video_status: 'error' } } },
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  await assert.rejects(api.publicarVideoEnFacebook({ video: Buffer.from('v'), tipo: 'REELS' }), /rechaz/);
});

test('si falla la subida a Facebook, no se cierra ni se publica', async () => {
  const { fn, pedidos } = fetchFalso([
    PAGINA_FB,
    { json: { video_id: 'v4', upload_url: 'https://rupload/v4' } },
    { ok: false, status: 500, json: { debug_info: { message: `roto ${TOKEN}` } } },
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  await assert.rejects(api.publicarVideoEnFacebook({ video: Buffer.from('v'), tipo: 'STORIES' }), (e) => {
    assert.ok(!e.message.includes(TOKEN), 'el error repite el token');
    return true;
  });
  assert.equal(pedidos.length, 3, 'siguió después de una subida fallida');
});

// -------------------------------------- las dos redes juntas

function apiDoble({ fallaInstagram = false, fallaFacebook = 0 } = {}) {
  const hechas = { instagram: [], facebook: [] };
  let intentosFb = 0;
  return {
    hechas,
    publicarVideoEnInstagram: async ({ video, tipo }) => {
      if (fallaInstagram) throw new Error('Instagram dijo que no');
      hechas.instagram.push({ nombre: video.toString(), tipo });
      return { id: `ig-${video}` };
    },
    publicarVideoEnFacebook: async ({ video, tipo }) => {
      intentosFb += 1;
      if (intentosFb <= fallaFacebook) throw new Error('Facebook dijo que no');
      hechas.facebook.push({ nombre: video.toString(), tipo });
      return { id: `fb-${video}` };
    },
  };
}

const CORRIDA = (api, libro, extra = {}) => publicarPiezas({
  api, manifiesto: PIEZAS, libro, activo: true, sinHorario: true, ahora: A_LAS('16:00'),
  leerVideo: (a) => Buffer.from(a), guardar: () => {}, log: () => {}, esperar: async () => {}, ...extra,
});

test('el mismo video sale en Instagram y en Facebook, y cada uno se anota en su libro', async () => {
  const api = apiDoble();
  const libro = libroNuevo();
  const r = await CORRIDA(api, libro);
  assert.equal(r.publicadas.length, 3);
  assert.equal(api.hechas.instagram.length, 3);
  assert.equal(api.hechas.facebook.length, 3);
  assert.deepEqual(api.hechas.facebook.map((h) => h.nombre), api.hechas.instagram.map((h) => h.nombre));
  assert.ok(libro.instagram[claveDePieza('noticia1', A_LAS('16:00'))]);
  assert.ok(libro.facebookVideos[claveDePieza('noticia1', A_LAS('16:00'))]);
});

test('los reels van como reel y las historias como historia, en las dos redes', async () => {
  const api = apiDoble();
  await CORRIDA(api, libroNuevo());
  const tipos = (lista) => Object.fromEntries(lista.map((h) => [h.nombre, h.tipo]));
  assert.deepEqual(tipos(api.hechas.instagram), tipos(api.hechas.facebook));
  assert.equal(tipos(api.hechas.facebook)['noticia1.mp4'], 'REELS');
  assert.equal(tipos(api.hechas.facebook)['clima-manana.mp4'], 'STORIES');
});

test('si falla Instagram, no se publica en Facebook: quedaría un video distinto en cada red', async () => {
  const api = apiDoble({ fallaInstagram: true });
  const libro = libroNuevo();
  const r = await CORRIDA(api, libro);
  assert.equal(api.hechas.facebook.length, 0);
  assert.equal(r.publicadas.length, 0);
  assert.equal(libro.facebookVideos[claveDePieza('noticia1', A_LAS('16:00'))], undefined);
});

test('si Facebook falla una vez, se reintenta y sale', async () => {
  const api = apiDoble({ fallaFacebook: 1 });
  const libro = libroNuevo();
  const r = await CORRIDA(api, libro);
  assert.equal(r.fallos.length, 0);
  assert.equal(api.hechas.facebook.length, 3);
});

test('si Facebook no anda nunca, Instagram igual sale y se avisa', async () => {
  const api = apiDoble({ fallaFacebook: 99 });
  const libro = libroNuevo();
  const r = await CORRIDA(api, libro);
  assert.equal(api.hechas.instagram.length, 3, 'no puede perderse lo de Instagram por Facebook');
  assert.equal(r.publicadas.length, 3);
  assert.ok(r.fallos.length >= 1 && r.fallos.every((f) => f.red === 'facebook'));
});

test('sólo Facebook: se publica lo que Facebook no tiene, aunque Instagram ya lo tenga', async () => {
  const api = apiDoble();
  const libro = libroNuevo();
  anotar(libro, 'instagram', claveDePieza('noticia1', A_LAS('16:00')), {});
  const r = await CORRIDA(api, libro, { destinos: ['facebook'] });
  assert.equal(api.hechas.instagram.length, 0);
  assert.equal(api.hechas.facebook.length, 3);
  assert.equal(r.publicadas.length, 3);
});

test('lo que Facebook ya tiene no se vuelve a subir', async () => {
  const api = apiDoble();
  const libro = libroNuevo();
  anotar(libro, 'facebookVideos', claveDePieza('clima-manana', A_LAS('16:00')), {});
  await CORRIDA(api, libro);
  assert.ok(!api.hechas.facebook.some((h) => h.nombre === 'clima-manana.mp4'));
  assert.equal(api.hechas.instagram.length, 3);
});

// Las redes: qué se publica en Facebook e Instagram, y cómo se habla con Meta.
//
// Nada de esto toca la red: el cliente recibe un fetch de mentira. Lo que se
// vigila es lo que no puede fallar en silencio: que el token no se filtre,
// que nada se publique dos veces y que lo delicado espere a una persona.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearCliente, ErrorMeta, sinToken } from '../redes/meta.mjs';
import {
  elegirParaFacebook, mensajeDeNota, enlaceDeNota, libroNuevo, anotar, yaPublicada, horaAR, REGLAS_FACEBOOK,
} from '../redes/elegir.mjs';

const TOKEN = 'TOKEN-SECRETO-123';

/** Un fetch de mentira: contesta lo que se le diga y anota qué se le pidió. */
function fetchFalso(respuestas) {
  const pedidos = [];
  const fn = async (url, init) => {
    pedidos.push({ url: String(url), init });
    const r = respuestas.shift();
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.json };
  };
  return { fn, pedidos };
}

const PAGINA = {
  json: {
    name: 'Radar Balcarce', link: 'https://facebook.com/radar',
    access_token: 'TOKEN-DE-PAGINA', instagram_business_account: { id: '999', username: 'radarbalcarce' },
  },
};

// ------------------------------------------------------------------- Meta

test('el token viaja en el encabezado y nunca en la dirección', async () => {
  const { fn, pedidos } = fetchFalso([PAGINA, { json: { id: '1_2' } }]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn });
  await api.publicarEnFacebook({ mensaje: 'hola', enlace: 'https://radarbalcarce.com/nota/x' });

  for (const p of pedidos) {
    assert.ok(!p.url.includes('TOKEN'), `el token está en la dirección: ${p.url}`);
    assert.match(p.init.headers.Authorization, /^Bearer /);
  }
  // Y las publicaciones se hacen con el token de la página, no con el del usuario.
  assert.equal(pedidos[1].init.headers.Authorization, 'Bearer TOKEN-DE-PAGINA');
});

test('un posteo lleva el mensaje y el enlace de nuestro sitio', async () => {
  const { fn, pedidos } = fetchFalso([PAGINA, { json: { id: '1_2' } }]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn });
  const r = await api.publicarEnFacebook({ mensaje: 'Titular', enlace: 'https://radarbalcarce.com/nota/x' });

  assert.equal(r.id, '1_2');
  const cuerpo = new URLSearchParams(pedidos[1].init.body);
  assert.equal(cuerpo.get('message'), 'Titular');
  assert.equal(cuerpo.get('link'), 'https://radarbalcarce.com/nota/x');
  assert.ok(pedidos[1].url.endsWith('/123/feed'));
});

test('un error de Meta llega sin el token adentro y avisa si el token murió', async () => {
  const { fn } = fetchFalso([{
    ok: false, status: 400,
    json: { error: { message: `Invalid OAuth access token ${TOKEN}`, code: 190, type: 'OAuthException' } },
  }]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn });

  await assert.rejects(api.pagina(), (e) => {
    assert.ok(e instanceof ErrorMeta);
    assert.ok(!e.message.includes(TOKEN), 'el mensaje repite el token');
    assert.equal(e.tokenMuerto, true);
    return true;
  });
});

test('sinToken borra el token de cualquier texto', () => {
  assert.equal(sinToken(`a ${TOKEN} b ${TOKEN}`, TOKEN), 'a *** b ***');
  assert.equal(sinToken('nada', ''), 'nada');
});

test('una foto en Instagram espera a que el contenedor esté listo antes de publicar', async () => {
  const { fn, pedidos } = fetchFalso([
    PAGINA,
    { json: { id: 'cont1' } },                    // crea el contenedor
    { json: { status_code: 'IN_PROGRESS' } },     // todavía no
    { json: { status_code: 'FINISHED' } },        // listo
    { json: { id: 'media1' } },                   // publica
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  const r = await api.publicarFotoEnInstagram({ imagenUrl: 'https://x/y.jpg', pie: 'pie' });

  assert.equal(r.id, 'media1');
  assert.ok(pedidos.at(-1).url.endsWith('/999/media_publish'));
  assert.equal(new URLSearchParams(pedidos.at(-1).init.body).get('creation_id'), 'cont1');
});

test('Instagram rechaza la imagen: no se publica nada', async () => {
  const { fn, pedidos } = fetchFalso([PAGINA, { json: { id: 'c' } }, { json: { status_code: 'ERROR' } }]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  await assert.rejects(api.publicarFotoEnInstagram({ imagenUrl: 'https://x/y.jpg', pie: 'p' }), /rechaz/);
  assert.ok(!pedidos.some((p) => p.url.includes('media_publish')));
});

test('sin token o sin página, el cliente ni arranca', () => {
  assert.throws(() => crearCliente({ token: '', paginaId: '1' }), /token/i);
  assert.throws(() => crearCliente({ token: 'x', paginaId: '' }), /página/i);
});

// ------------------------------------------------------------ qué se elige

/** Las 15:00 del 21/09 en Balcarce. */
const AHORA = new Date('2026-09-21T15:00:00-03:00');
const haceMin = (m) => new Date(AHORA.getTime() - m * 60000).toISOString();

const nota = (extra = {}) => ({
  id: 'abc', titulo: 'Un titular', copete: 'Un copete', seccion: 'Deportes', relevancia: 90,
  medios: ['Diario La Vanguardia'], publicadaPor: 'ia', publicadaCuando: haceMin(60), ...extra,
});

test('la hora se cuenta en Balcarce, no en UTC', () => {
  assert.equal(horaAR(new Date('2026-09-21T15:00:00-03:00')), 15);
  assert.equal(horaAR(new Date('2026-09-21T00:30:00-03:00')), 0);
});

test('una nota fuerte y reciente se publica', () => {
  const r = elegirParaFacebook({ notas: [nota()], ahora: AHORA });
  assert.equal(r.length, 1);
});

test('Política y Policiales no salen solas a las redes', () => {
  // En la web las frena el semáforo; en una red viaja un titular sin contexto
  // y a un vecino lo nombra. Para esas secciones decide una persona.
  for (const seccion of ['Política', 'Policiales']) {
    assert.equal(elegirParaFacebook({ notas: [nota({ seccion })], ahora: AHORA }).length, 0, seccion);
  }
});

test('una nota se publica una sola vez', () => {
  const libro = anotar(libroNuevo(), 'facebook', 'abc', {}, new Date(AHORA.getTime() - 5 * 3600000));
  assert.ok(yaPublicada(libro, 'facebook', 'abc'));
  assert.equal(elegirParaFacebook({ notas: [nota()], libro, ahora: AHORA }).length, 0);
});

test('no se publica de madrugada', () => {
  const noche = new Date('2026-09-21T03:00:00-03:00');
  const n = nota({ publicadaCuando: new Date(noche.getTime() - 3600000).toISOString() });
  assert.equal(elegirParaFacebook({ notas: [n], ahora: noche }).length, 0);
});

test('hay que esperar a que la nota exista en la web', () => {
  // Publicar el enlace antes del deploy deja a Facebook con una tarjeta de
  // "página no encontrada" guardada.
  const recien = nota({ publicadaCuando: haceMin(3) });
  assert.equal(elegirParaFacebook({ notas: [recien], ahora: AHORA }).length, 0);
});

test('lo viejo no se publica', () => {
  const vieja = nota({ publicadaCuando: haceMin(REGLAS_FACEBOOK.edadMaximaHoras * 60 + 30) });
  assert.equal(elegirParaFacebook({ notas: [vieja], ahora: AHORA }).length, 0);
});

test('lo flojo no se publica', () => {
  assert.equal(elegirParaFacebook({ notas: [nota({ relevancia: 60 })], ahora: AHORA }).length, 0);
});

test('hay un tope diario y un respiro entre posteos', () => {
  const libro = libroNuevo();
  anotar(libro, 'facebook', 'uno', {}, new Date(AHORA.getTime() - 30 * 60000));
  // Salió una hace media hora: todavía es pronto.
  assert.equal(elegirParaFacebook({ notas: [nota()], libro, ahora: AHORA }).length, 0);

  // Ya pasó el respiro, pero con dos hechas hoy se llegó al tope.
  const lleno = libroNuevo();
  anotar(lleno, 'facebook', 'uno', {}, new Date('2026-09-21T10:00:00-03:00'));
  anotar(lleno, 'facebook', 'dos', {}, new Date('2026-09-21T12:00:00-03:00'));
  assert.equal(elegirParaFacebook({ notas: [nota()], libro: lleno, ahora: AHORA }).length, 0);
});

test('sale de a una por vez, la más fuerte primero', () => {
  const r = elegirParaFacebook({
    notas: [nota({ id: 'a', relevancia: 82 }), nota({ id: 'b', relevancia: 95 })], ahora: AHORA,
  });
  assert.deepEqual(r.map((n) => n.id), ['b']);
});

// -------------------------------------------------------------- el mensaje

test('el mensaje dice de dónde sale y cuándo lo resumió una IA', () => {
  const m = mensajeDeNota(nota());
  assert.match(m, /^Un titular\n\nUn copete\n\nFuente: Diario La Vanguardia · Resumen hecho con IA$/);
});

test('el mensaje no dice IA si no fue la IA', () => {
  assert.ok(!mensajeDeNota(nota({ publicadaPor: null })).includes('IA'));
});

test('el enlace es de nuestro sitio, con el titular adentro', () => {
  assert.equal(
    enlaceDeNota({ id: 'abc', titulo: 'Nuevo mural de Fangio' }, 'https://radarbalcarce.com/'),
    'https://radarbalcarce.com/nota/nuevo-mural-de-fangio-abc',
  );
});

// ------------------------------------------------------- las claves de Gemini

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { claveRedaccion, claveRedes, leerVariable } from '../reels/claves.mjs';

/** Un .env de mentira en una carpeta temporal. */
function envDe(contenido) {
  const archivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'env-')), '.env');
  fs.writeFileSync(archivo, contenido);
  return archivo;
}

test('la clave de redes nunca cae en la de redactar', () => {
  // Si los reels usaran la clave vieja cuando falta la suya, un día de videos
  // se comería en silencio el cupo con el que se reescriben las notas.
  const archivo = envDe('GEMINI_API_KEY=vieja\n');
  assert.equal(claveRedes({ env: {}, archivo }), null);
  assert.equal(claveRedaccion({ env: {}, archivo }), 'vieja');
});

test('cada clave se lee con su nombre, sin confundirse por el prefijo', () => {
  const archivo = envDe('GEMINI_API_KEY=vieja\r\nGEMINI_API_KEY_REDES=de-redes\r\nGEMINI_API_KEY_REDACCION=de-redaccion\r\n');
  assert.equal(claveRedes({ env: {}, archivo }), 'de-redes');
  assert.equal(claveRedaccion({ env: {}, archivo }), 'de-redaccion');
  assert.equal(leerVariable('GEMINI_API_KEY', { env: {}, archivo }), 'vieja');
});

test('el entorno manda sobre el archivo', () => {
  const archivo = envDe('GEMINI_API_KEY_REDES=del-archivo\n');
  assert.equal(claveRedes({ env: { GEMINI_API_KEY_REDES: 'del-entorno' }, archivo }), 'del-entorno');
});

test('sin archivo ni variable no hay clave, y no se rompe', () => {
  assert.equal(claveRedes({ env: {}, archivo: path.join(os.tmpdir(), 'no-existe', '.env') }), null);
});

test('las comillas del .env no forman parte de la clave', () => {
  const archivo = envDe('GEMINI_API_KEY_REDES="con-comillas"\n');
  assert.equal(claveRedes({ env: {}, archivo }), 'con-comillas');
});

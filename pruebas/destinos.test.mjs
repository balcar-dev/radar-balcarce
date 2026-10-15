// Los otros destinos de los reels (redes/destinos.mjs): el contrato común, sin ninguna red de verdad.
//
// Lo que se vigila: que apagado SIMULE y no toque el libro, que una red que falla no frene a las demás, que nada salga dos
// veces ni fuera de su hora, y que cada red reciba sólo las piezas que le tocan.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DESTINOS, destinoPrendido, destinosDeLaPieza, faltanClaves, publicarEnDestinos, yaEnDestino,
} from '../redes/destinos.mjs';
import { claveDePieza } from '../redes/piezas.mjs';

const AHORA = new Date('2026-10-15T13:05:00Z'); // 10:05 en Balcarce, jueves 15/10/2026
const callar = () => {};
const sinEspera = async () => {};

const repaso = { nombre: 'noticia1', tipo: 'reel', hora: '10:00', titulo: 'El repaso de la mañana', archivo: 'noticia1.mp4', items: [] };
const clima = { nombre: 'clima-manana', tipo: 'historia', hora: '07:00', titulo: 'El clima de la mañana', archivo: 'clima.mp4' };

/** Todas las claves cargadas y todo prendido, salvo lo que se pida distinto. */
function entorno(extra = {}) {
  const env = { REDES_ACTIVAS: 'Si' };
  for (const d of Object.values(DESTINOS)) {
    env[d.interruptor] = 'Si';
    for (const k of d.claves) env[k] = `valor-de-${k}`;
  }
  return { ...env, ...extra };
}

function clienteFalso({ falla = 0, tokenMuerto = false } = {}) {
  const llamadas = [];
  let restantes = falla;
  return {
    llamadas,
    async publicarVideo(args) {
      llamadas.push(args);
      if (tokenMuerto) throw Object.assign(new Error('la clave murió'), { tokenMuerto: true });
      if (restantes > 0) { restantes -= 1; throw new Error('la red no contestó'); }
      return { id: `id-${llamadas.length}`, enlace: 'https://ejemplo.test/v/1' };
    },
  };
}

const todosLosClientes = () => Object.fromEntries(Object.keys(DESTINOS).map((id) => [id, clienteFalso()]));
const correr = (o) => publicarEnDestinos({
  manifiesto: [repaso], leerVideo: () => Buffer.from('video'), libro: {}, ahora: AHORA, log: callar, esperar: sinEspera, ...o,
});

test('el catálogo: cada red tiene su libro propio, su interruptor REDES_* y sus claves', () => {
  const interruptores = new Set();
  for (const [id, d] of Object.entries(DESTINOS)) {
    assert.match(d.interruptor, /^REDES_[A-Z]+$/, id);
    assert.ok(d.claves.length > 0, `${id} sin claves`);
    assert.equal(typeof d.va, 'function', id);
    assert.ok(!interruptores.has(d.interruptor), `interruptor repetido: ${d.interruptor}`);
    interruptores.add(d.interruptor);
  }
  // Ninguna se llama como el interruptor general ni como una red que ya existe.
  assert.ok(!interruptores.has('REDES_ACTIVAS'));
  assert.ok(!('instagram' in DESTINOS) && !('facebook' in DESTINOS));
});

test('prendida: hace falta REDES_ACTIVAS y el interruptor propio, los dos en "Si" (con tildes y mayúsculas da igual)', () => {
  assert.equal(destinoPrendido('telegram', {}), false);
  assert.equal(destinoPrendido('telegram', { REDES_ACTIVAS: 'Si' }), false, 'sin el propio');
  assert.equal(destinoPrendido('telegram', { REDES_TELEGRAM: 'Si' }), false, 'sin el general');
  assert.equal(destinoPrendido('telegram', { REDES_ACTIVAS: ' SÍ ', REDES_TELEGRAM: 'sí' }), true);
  assert.equal(destinoPrendido('telegram', { REDES_ACTIVAS: 'Si', REDES_TELEGRAM: 'No' }), false);
  assert.equal(destinoPrendido('no-existe', entorno()), false);
});

test('las claves que faltan se dicen por nombre y una vacía cuenta como faltante', () => {
  assert.deepEqual(faltanClaves('telegram', {}), ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CANAL']);
  assert.deepEqual(faltanClaves('telegram', { TELEGRAM_BOT_TOKEN: 'x', TELEGRAM_CANAL: '  ' }), ['TELEGRAM_CANAL']);
  assert.deepEqual(faltanClaves('telegram', entorno()), []);
});

test('qué pieza va a qué red: el repaso a todas, el clima sólo a Telegram, la efeméride también a YouTube y TikTok', () => {
  assert.deepEqual(destinosDeLaPieza('noticia1'), ['telegram', 'bluesky', 'threads', 'x']);
  assert.deepEqual(destinosDeLaPieza('clima-manana'), ['telegram']);
  assert.deepEqual(destinosDeLaPieza('farmacia'), ['telegram']);
  assert.deepEqual(destinosDeLaPieza('participa-nota'), ['telegram']);
  assert.deepEqual(destinosDeLaPieza('efemeride'), ['telegram', 'bluesky', 'threads', 'x', 'youtube', 'tiktok']);
  assert.deepEqual(destinosDeLaPieza('podcast'), ['telegram', 'bluesky', 'threads', 'x', 'youtube', 'tiktok']);
  assert.deepEqual(destinosDeLaPieza('utiles'), ['telegram', 'youtube']);
});

test('apagado SIMULA: no llama a ningún cliente y no toca el libro', async () => {
  const clientes = todosLosClientes();
  const libro = {};
  const guardados = [];
  const r = await correr({ clientes, libro, env: { REDES_ACTIVAS: 'No' }, guardar: () => guardados.push(1) });
  assert.equal(r.publicadas.length, 0);
  assert.equal(r.simuladas.length, 4); // telegram, bluesky, threads, x
  for (const c of Object.values(clientes)) assert.equal(c.llamadas.length, 0);
  assert.deepEqual(libro.destinos, {});
  assert.equal(guardados.length, 0);
});

test('prendida la general pero sin la clave de una red: esa red simula y las otras salen', async () => {
  const clientes = todosLosClientes();
  const env = entorno({ BLUESKY_CLAVE_APP: '' });
  const r = await correr({ clientes, libro: {}, env });
  assert.deepEqual(r.publicadas.map((p) => p.red).sort(), ['telegram', 'threads', 'x']);
  assert.deepEqual(r.simuladas, [{ pieza: 'noticia1', red: 'bluesky' }]);
  assert.equal(clientes.bluesky.llamadas.length, 0);
});

test('publica en cada red que le toca, anota en el libro y no repite en la corrida siguiente', async () => {
  const clientes = todosLosClientes();
  const libro = {};
  const guardados = [];
  const opciones = { clientes, libro, env: entorno(), guardar: () => guardados.push(1) };
  const r1 = await correr(opciones);
  assert.equal(r1.publicadas.length, 4);
  const clave = claveDePieza('noticia1', AHORA);
  for (const id of ['telegram', 'bluesky', 'threads', 'x']) {
    assert.ok(yaEnDestino(libro, id, clave), id);
    assert.equal(libro.destinos[id][clave].nombre, 'noticia1');
    assert.equal(libro.destinos[id][clave].permalink, 'https://ejemplo.test/v/1');
  }
  assert.ok(!yaEnDestino(libro, 'youtube', clave), 'el repaso de la mañana no va a YouTube');
  assert.equal(guardados.length, 4, 'se guarda el libro después de CADA publicación');

  const r2 = await correr(opciones);
  assert.equal(r2.publicadas.length, 0);
  for (const id of ['telegram', 'bluesky', 'threads', 'x']) assert.equal(clientes[id].llamadas.length, 1, `${id} no repite`);
});

test('el cliente recibe el video, la pieza y el pie armado para su red', async () => {
  const clientes = todosLosClientes();
  await correr({ clientes, libro: {}, env: entorno() });
  const [llamada] = clientes.telegram.llamadas;
  assert.equal(llamada.video.toString(), 'video');
  assert.equal(llamada.pieza.nombre, 'noticia1');
  assert.match(llamada.pie, /Voz generada con inteligencia artificial\./);
});

test('una red que falla no frena a las demás: se reintenta, queda anotada como problema y el resto sale', async () => {
  const clientes = { ...todosLosClientes(), threads: clienteFalso({ falla: 99 }) };
  const libro = {};
  const r = await correr({ clientes, libro, env: entorno() });
  assert.deepEqual(r.publicadas.map((p) => p.red).sort(), ['bluesky', 'telegram', 'x']);
  assert.equal(clientes.threads.llamadas.length, 3, 'tres intentos');
  assert.equal(r.fallos.length, 1);
  const clave = claveDePieza('noticia1', AHORA);
  assert.ok(libro.problemas[`${clave}/threads/reel`], 'el problema queda en el libro');
  assert.equal(libro.problemas[`${clave}/threads/reel`].red, 'threads');
  assert.ok(!yaEnDestino(libro, 'threads', clave));
});

test('si el segundo intento sale, no queda ningún problema', async () => {
  const clientes = { ...todosLosClientes(), x: clienteFalso({ falla: 1 }) };
  const libro = {};
  const r = await correr({ clientes, libro, env: entorno() });
  assert.equal(r.fallos.length, 0);
  assert.equal(clientes.x.llamadas.length, 2);
  assert.deepEqual(libro.problemas ?? {}, {});
});

test('una clave muerta corta esa red en toda la corrida (no insiste con las demás piezas) y las otras siguen', async () => {
  const clientes = { ...todosLosClientes(), telegram: clienteFalso({ tokenMuerto: true }) };
  const otra = { ...repaso, nombre: 'noticia2', hora: '10:00', titulo: 'El repaso de la tarde' };
  const r = await correr({ clientes, manifiesto: [repaso, otra], libro: {}, env: entorno() });
  assert.equal(clientes.telegram.llamadas.length, 1, 'un solo intento y no vuelve a probar con la segunda pieza');
  assert.equal(r.fallos.filter((f) => f.red === 'telegram').length, 1);
  assert.equal(clientes.bluesky.llamadas.length, 2, 'bluesky recibe las dos');
});

test('fuera de su hora no sale: el clima de las 7 a las 10:05 sigue dentro de su ventana, el repaso de las 10 a las 15:05 ya no', async () => {
  const clientes = todosLosClientes();
  const libro = {};
  // clima-manana vale hasta las 11:00 (VENTANAS): a las 10:05 todavía sale, sólo en Telegram.
  let r = await correr({ clientes, manifiesto: [clima], libro, env: entorno() });
  assert.deepEqual(r.publicadas, [{ pieza: 'clima-manana', red: 'telegram' }]);
  // Un repaso de las 10:00 a las 15:00 ya no (ventana de 180 minutos).
  const tarde = new Date('2026-10-15T18:05:00Z'); // 15:05
  r = await correr({ clientes: todosLosClientes(), manifiesto: [repaso], libro: {}, env: entorno(), ahora: tarde });
  assert.equal(r.publicadas.length, 0);
  // Con sinHorario (prueba a mano) sale igual.
  r = await correr({ clientes: todosLosClientes(), manifiesto: [repaso], libro: {}, env: entorno(), ahora: tarde, sinHorario: true });
  assert.equal(r.publicadas.length, 4);
});

test('una red sin cliente cargado se saltea sin romper nada', async () => {
  const clientes = { telegram: clienteFalso() };
  const r = await correr({ clientes, libro: {}, env: entorno() });
  assert.deepEqual(r.publicadas, [{ pieza: 'noticia1', red: 'telegram' }]);
  assert.equal(r.fallos.length, 0);
});

// El vigilante: qué considera un problema, cuándo avisa y cómo no se repite.
// Todo con datos inventados, sin red y sin mandar nada.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluar, aAvisar, mensajeDeProblemas, mensajeDelResumen, tocaResumen, LIMITES,
} from '../redes/vigilar.mjs';
import { enviarWhatsApp, sinSecretos } from '../redes/whatsapp.mjs';
import { claveDePieza } from '../redes/piezas.mjs';

/** Una hora de Balcarce del 24/09/2026. */
const A = (hhmm) => new Date(`2026-09-24T${hhmm}:00-03:00`);
const hace = (ahora, minutos) => new Date(ahora.getTime() - minutos * 60000).toISOString();

const corrida = (ahora, minutos, conclusion = 'success', status = 'completed') => ({ createdAt: hace(ahora, minutos), conclusion, status });

/** Un día normal: todo al día. */
function sano(ahora) {
  return {
    ahora,
    web: { estado: 200, actualizado: hace(ahora, 20) },
    www: { redirige: true },
    corridas: {
      'Actualizar la web': [corrida(ahora, 20), corrida(ahora, 50)],
      Redes: [corrida(ahora, 10), corrida(ahora, 40)],
      'Cloudflare Pages': [corrida(ahora, 18)],
    },
    // Las tres piezas fijas ya salieron: un día sano.
    libro: {
      instagram: Object.fromEntries(['clima-manana', 'farmacia', 'clima-noche'].map((n) => [claveDePieza(n, ahora), { mediaId: '1' }])),
      facebook: {},
    },
  };
}
const claves = (r) => r.map((p) => p.clave);

test('un día sano no tiene problemas', () => {
  assert.deepEqual(evaluar(sano(A('12:00'))), []);
});

test('la web caída es un problema grave', () => {
  const o = sano(A('12:00')); o.web = { estado: 522, actualizado: null };
  const r = evaluar(o);
  assert.deepEqual(claves(r), ['web-caida']);
  assert.equal(r[0].nivel, 'alta');
});

test('una web que no se actualiza hace horas nombra a cron-job.org', () => {
  const o = sano(A('15:00')); o.web.actualizado = hace(o.ahora, 200);
  const r = evaluar(o);
  assert.ok(claves(r).includes('web-vieja'));
  assert.match(r.find((p) => p.clave === 'web-vieja').texto, /cron-job\.org/);
});

test('con la web actualizada hace 60 minutos todavía no hay alarma', () => {
  const o = sano(A('15:00')); o.web.actualizado = hace(o.ahora, 60);
  assert.deepEqual(evaluar(o), []);
});

test('una corrida fallida se avisa y dice cuántas de las últimas fallaron', () => {
  const o = sano(A('12:00'));
  o.corridas.Redes = [corrida(o.ahora, 10, 'failure'), corrida(o.ahora, 40, 'failure'), corrida(o.ahora, 70)];
  const r = evaluar(o);
  assert.deepEqual(claves(r), ['falla-Redes']);
  assert.match(r[0].texto, /2 de las últimas 3/);
});

test('tres fallas seguidas suben el aviso a grave', () => {
  const o = sano(A('12:00'));
  o.corridas.Redes = [10, 40, 70, 100].map((m) => corrida(o.ahora, m, 'failure'));
  assert.equal(evaluar(o)[0].nivel, 'alta');
});

test('una corrida cancelada o salteada no cuenta como falla', () => {
  const o = sano(A('12:00'));
  o.corridas.Redes = [corrida(o.ahora, 10, 'skipped'), corrida(o.ahora, 20, 'cancelled'), corrida(o.ahora, 40)];
  assert.deepEqual(evaluar(o), []);
});

test('si hace horas que no corre "Redes", se sospecha de cron-job.org', () => {
  const o = sano(A('15:00'));
  o.corridas.Redes = [corrida(o.ahora, 400)];
  assert.ok(claves(evaluar(o)).includes('reloj-Redes'));
});

test('de madrugada no se alarma por relojes quietos', () => {
  const o = sano(A('03:00'));
  o.corridas.Redes = [corrida(o.ahora, 400)];
  o.corridas['Actualizar la web'] = [corrida(o.ahora, 400)];
  o.web.actualizado = hace(o.ahora, 40);
  assert.deepEqual(evaluar(o), []);
});

test('una corrida en curso cuenta como que el reloj anda', () => {
  const o = sano(A('15:00'));
  o.corridas.Redes = [corrida(o.ahora, 5, null, 'in_progress'), corrida(o.ahora, 400)];
  assert.ok(!claves(evaluar(o)).includes('reloj-Redes'));
});

test('si no salió el clima de la mañana y ya se cerró su ventana, se avisa', () => {
  const o = sano(A('13:00')); // el clima de la mañana valía hasta las 11:30
  delete o.libro.instagram[claveDePieza('clima-manana', o.ahora)];
  const r = evaluar(o);
  assert.ok(claves(r).includes('pieza-clima-manana'));
});

test('si el clima de la mañana salió, no se avisa', () => {
  const o = sano(A('13:00'));
  o.libro.instagram[claveDePieza('clima-manana', o.ahora)] = { mediaId: '1' };
  assert.ok(!claves(evaluar(o)).includes('pieza-clima-manana'));
});

test('no se avisa de una pieza que todavía está a tiempo', () => {
  const o = sano(A('09:00'));
  assert.ok(!claves(evaluar(o)).includes('pieza-clima-manana'));
});

test('los podcasts no cuentan como pieza obligatoria: dependen de que haya notas', () => {
  const o = sano(A('23:30'));
  for (const n of ['clima-manana', 'farmacia', 'clima-noche']) o.libro.instagram[claveDePieza(n, o.ahora)] = {};
  assert.deepEqual(claves(evaluar(o)).filter((c) => c.startsWith('pieza-')), []);
});

test('si www deja de redirigir, se avisa (sin urgencia)', () => {
  const o = sano(A('12:00')); o.www = { redirige: false };
  const r = evaluar(o);
  assert.deepEqual(claves(r), ['www']);
  assert.equal(r[0].nivel, 'media');
});

// ---------------------------------------------- no repetir avisos

test('lo que se avisó hace poco no se vuelve a avisar', () => {
  const ahora = A('12:00');
  const problemas = [{ clave: 'web-vieja', nivel: 'alta', texto: 'x' }];
  assert.equal(aAvisar(problemas, { avisos: { 'web-vieja': hace(ahora, 60) } }, ahora).length, 0);
});

test('pasadas las seis horas, se avisa de nuevo', () => {
  const ahora = A('12:00');
  const problemas = [{ clave: 'web-vieja', nivel: 'alta', texto: 'x' }];
  assert.equal(aAvisar(problemas, { avisos: { 'web-vieja': hace(ahora, LIMITES.horasEntreAvisos * 60 + 1) } }, ahora).length, 1);
});

test('un problema nuevo se avisa aunque haya otro ya avisado', () => {
  const ahora = A('12:00');
  const r = aAvisar([{ clave: 'a' }, { clave: 'b' }], { avisos: { a: hace(ahora, 10) } }, ahora);
  assert.deepEqual(r.map((p) => p.clave), ['b']);
});

// ---------------------------------------------------- los mensajes

test('el mensaje de un problema grave empieza con la alerta', () => {
  const m = mensajeDeProblemas([{ nivel: 'alta', texto: 'La web no responde.' }]);
  assert.match(m, /^⚠️/);
  assert.match(m, /• La web no responde\./);
});

test('un problema leve no se presenta como emergencia', () => {
  assert.match(mensajeDeProblemas([{ nivel: 'media', texto: 'x' }]), /^ℹ️/);
});

test('el resumen de las 21 cuenta lo que salió hoy', () => {
  const ahora = A('21:05');
  const libro = {
    instagram: { [claveDePieza('clima-manana', ahora)]: {}, [claveDePieza('farmacia', ahora)]: {}, '2026-09-23/farmacia': {} },
    facebook: { a: { cuando: ahora.toISOString() }, b: { cuando: '2026-09-23T15:00:00Z' } },
  };
  const m = mensajeDelResumen({ ahora, libro, web: { actualizado: hace(ahora, 15) } });
  assert.match(m, /todo bien/);
  assert.match(m, /2 pieza\(s\) de video y 1 posteo\(s\)/);
});

test('el resumen sale una sola vez por día, desde las 21', () => {
  assert.equal(tocaResumen(A('20:59'), {}), false);
  assert.equal(tocaResumen(A('21:00'), {}), true);
  assert.equal(tocaResumen(A('22:00'), { ultimoResumen: '2026-09-24' }), false);
  assert.equal(tocaResumen(A('22:00'), { ultimoResumen: '2026-09-23' }), true);
});

// -------------------------------------------------------- WhatsApp

test('el mensaje va con el número y la clave, y el texto codificado', async () => {
  let pedido;
  const r = await enviarWhatsApp({
    telefono: '+54 9 2266 123456', apikey: 'CLAVE-SECRETA', texto: 'Hola ñandú & más',
    fetchFn: async (u) => { pedido = u; return { ok: true, status: 200, text: async () => 'Message queued' }; },
  });
  assert.equal(r.ok, true);
  assert.match(pedido, /phone=5492266123456&/);
  assert.match(pedido, /text=Hola%20%C3%B1and%C3%BA%20%26%20m%C3%A1s/);
  assert.match(pedido, /apikey=CLAVE-SECRETA$/);
});

test('sin teléfono o sin clave no intenta nada', async () => {
  let llamado = false;
  const f = async () => { llamado = true; return { ok: true, text: async () => '' }; };
  assert.equal((await enviarWhatsApp({ telefono: '', apikey: 'x', texto: 'y', fetchFn: f })).ok, false);
  assert.equal((await enviarWhatsApp({ telefono: '1', apikey: '', texto: 'y', fetchFn: f })).ok, false);
  assert.equal(llamado, false);
});

test('un error de CallMeBot (con HTTP 200) se toma como error, y sin la clave a la vista', async () => {
  const r = await enviarWhatsApp({
    telefono: '5492266123456', apikey: 'CLAVE-SECRETA', texto: 'x',
    fetchFn: async () => ({ ok: true, status: 200, text: async () => 'ERROR: APIKEY is invalid CLAVE-SECRETA 5492266123456' }),
  });
  assert.equal(r.ok, false);
  assert.ok(!r.error.includes('CLAVE-SECRETA'), 'mostró la clave');
  assert.ok(!r.error.includes('5492266123456'), 'mostró el teléfono');
});

test('si la red falla, el error no filtra la clave', async () => {
  const r = await enviarWhatsApp({
    telefono: '5492266123456', apikey: 'CLAVE-SECRETA', texto: 'x',
    fetchFn: async () => { throw new Error('fetch failed: https://x?apikey=CLAVE-SECRETA'); },
  });
  assert.equal(r.ok, false);
  assert.ok(!r.error.includes('CLAVE-SECRETA'));
});

test('sinSecretos tapa todo lo que se le pide', () => {
  assert.equal(sinSecretos('a SECRETO b SECRETO', 'SECRETO'), 'a *** b ***');
});

// ------------------------------------------------------ vencimientos

import { VENCIMIENTOS } from '../redes/vigilar.mjs';

test('un mes antes de que venza el token de GitHub, se avisa', () => {
  const o = sano(new Date('2027-08-25T12:00:00-03:00'));
  o.web.actualizado = hace(o.ahora, 20);
  for (const n of ['clima-manana', 'farmacia', 'clima-noche']) o.libro.instagram[claveDePieza(n, o.ahora)] = {};
  const r = evaluar(o);
  const v = r.find((p) => p.clave === 'vence-token-github');
  assert.ok(v, 'no avisó del vencimiento');
  assert.match(v.texto, /Faltan \d+ día/);
});

test('con tiempo de sobra no molesta', () => {
  assert.ok(!claves(evaluar(sano(A('12:00')))).includes('vence-token-github'));
});

test('la última semana el aviso es grave', () => {
  const o = sano(new Date('2027-09-17T12:00:00-03:00'));
  const v = evaluar(o).find((p) => p.clave === 'vence-token-github');
  assert.equal(v.nivel, 'alta');
});

test('pasada la fecha dice que ya venció', () => {
  const v = evaluar(sano(new Date('2027-09-23T12:00:00-03:00'))).find((p) => p.clave === 'vence-token-github');
  assert.match(v.texto, /YA VENCIÓ/);
});

test('el vencimiento apunta al 21/09/2027, como dice REDES.md', () => {
  assert.equal(VENCIMIENTOS.find((v) => v.clave === 'vence-token-github').fecha, '2027-09-21');
});

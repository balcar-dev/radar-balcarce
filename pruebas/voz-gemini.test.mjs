// La voz de Gemini: cómo se le habla, sin salir a la red.
//
// Auditoría del 25/09: la clave viajaba en la dirección (`?key=`) y el pedido
// no tenía tiempo máximo. Uno colgado dejaba el reloj de Redes esperando
// hasta que GitHub lo mataba.
//
// El fetch de mentira falla siempre "por tiempo", así decirGemini no llega a
// sintetizar nada. (Hasta el 28/09 anotaba cada pedido en un registro de cuota
// de la PC, panel/datos/cuota-gemini.json, que nadie leía: la clave de redes es
// paga y no hay cupo gratis que contar.)

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { decirGemini, pedidoDeVoz, audioDeLaRespuesta, segundosDeWav, ENDPOINT, MODELO } from '../reels/voz-gemini.mjs';

before(() => { process.env.GEMINI_API_KEY_REDES = 'clave-redes-de-prueba'; });
after(() => { delete process.env.GEMINI_API_KEY_REDES; });

test('la clave va en el encabezado, el pedido tiene tiempo máximo, y un corte se informa', async () => {
  const pedidos = [];
  const colgado = async (url, init) => {
    pedidos.push({ url: String(url), init });
    throw new DOMException('se cortó por tiempo', 'TimeoutError');
  };
  const destino = path.join(os.tmpdir(), 'radar-prueba-voz', 'x.mp3');
  await assert.rejects(
    () => decirGemini('Hola', destino, { intentos: 1, fetchFn: colgado }),
    /Gemini no respondió: más de \d+ segundos/,
  );
  assert.equal(pedidos.length, 1);
  assert.ok(!pedidos[0].url.includes('clave-redes-de-prueba'), 'la clave no puede ir en la dirección');
  assert.ok(!/[?&]key=/.test(pedidos[0].url));
  assert.equal(pedidos[0].init.headers['x-goog-api-key'], 'clave-redes-de-prueba');
  assert.ok(pedidos[0].init.signal instanceof AbortSignal);
});

test('la voz ya no lleva la cuenta de un cupo gratis: no escribe en panel/datos', async () => {
  const fs = await import('node:fs');
  const codigo = fs.readFileSync(new URL('../reels/voz-gemini.mjs', import.meta.url), 'utf8');
  assert.ok(!/cuota-gemini\.json'/.test(codigo), 'volvió el registro de cuota');
  assert.ok(!/CUPO_DIARIO|anotarPedido/.test(codigo));
  const modulo = await import('../reels/voz-gemini.mjs');
  assert.equal('CUPO_DIARIO' in modulo, false);
});

// ------- 28/09: el modelo 3.8 y su Interactions API
test('el pedido lleva el texto literal y el estilo aparte, con la voz por su identificador', () => {
  const p = pedidoDeVoz({ texto: 'Buen día, Balcarce.', voz: 'voice_abc123', estilo: 'calm and warm' });
  assert.equal(p.model, 'gemini-3.8-flash-tts');
  assert.equal(MODELO, p.model);
  assert.equal(ENDPOINT, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  const [texto] = p.input[0].content;
  assert.equal(texto.text, 'Buen día, Balcarce.', 'el texto va solo, sin indicaciones mezcladas');
  assert.deepEqual(texto.annotations, [{ type: 'speech_metadata', style: 'calm and warm' }]);
  assert.deepEqual(p.generation_config.speech_config, [{ voice: 'voice_abc123' }]);
  assert.deepEqual(p.response_format, { type: 'audio' });
  assert.ok(!('systemInstruction' in p), 'el modelo no acepta instrucciones de sistema');
});

test('el audio de la respuesta se busca en los pasos del modelo y se toma el último', () => {
  const r = { steps: [{ type: 'user_input' }, { type: 'model_output', content: [{ type: 'text', text: 'hola' }, { type: 'audio', data: 'AAA' }, { type: 'audio', data: 'BBB' }] }] };
  assert.equal(audioDeLaRespuesta(r), 'BBB');
  assert.equal(audioDeLaRespuesta({ steps: [] }), null);
});

function wavDeSegundos(segundos) {
  const datos = Buffer.alloc(Math.round(segundos * 48000));
  const cab = Buffer.alloc(44);
  cab.write('RIFF', 0, 'ascii'); cab.writeUInt32LE(36 + datos.length, 4); cab.write('WAVE', 8, 'ascii');
  cab.write('fmt ', 12, 'ascii'); cab.writeUInt32LE(16, 16); cab.writeUInt16LE(1, 20); cab.writeUInt16LE(1, 22);
  cab.writeUInt32LE(24000, 24); cab.writeUInt32LE(48000, 28); cab.writeUInt16LE(2, 32); cab.writeUInt16LE(16, 34);
  cab.write('data', 36, 'ascii'); cab.writeUInt32LE(datos.length, 40);
  return Buffer.concat([cab, datos]);
}

test('segundosDeWav lee la duración del trozo de datos', () => {
  assert.equal(segundosDeWav(wavDeSegundos(12.5)), 12.5);
});

test('un audio que dura de más para su texto no sale: se rechaza (la voz leyó las indicaciones)', async () => {
  const largo = wavDeSegundos(100).toString('base64');
  const fetchFn = async () => ({ ok: true, status: 200, json: async () => ({ steps: [{ type: 'model_output', content: [{ type: 'audio', data: largo }] }] }) });
  const destino = path.join(os.tmpdir(), 'radar-prueba-voz', 'largo.mp3');
  await assert.rejects(
    () => decirGemini('Hola, Balcarce.', destino, { intentos: 1, fetchFn }),
    /leyó algo que no estaba en el texto/,
  );
});

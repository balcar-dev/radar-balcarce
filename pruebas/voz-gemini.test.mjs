// La voz de Gemini: cómo se le habla, sin salir a la red.
//
// Auditoría del 25/09: la clave viajaba en la dirección (`?key=`) y el pedido
// no tenía tiempo máximo. Uno colgado dejaba el reloj de Redes esperando
// hasta que GitHub lo mataba.
//
// El fetch de mentira falla siempre "por tiempo", así decirGemini no llega a
// anotar nada en el registro de cuota de la PC (panel/datos/cuota-gemini.json).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { decirGemini } from '../reels/voz-gemini.mjs';

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

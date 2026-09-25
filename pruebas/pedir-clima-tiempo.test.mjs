// El clima en vivo de la web no se puede quedar trabado.
//
// Auditoría del 25/09: el pedido a Open-Meteo no tenía tiempo máximo. Si uno
// quedaba colgado, `enCurso` no se liberaba nunca y todos los pedidos
// siguientes esperaban a ése: el clima de la pestaña dejaba de actualizarse.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { traer, ESPERA_CLIMA } from '../web/lib/pedir-clima.js';

/** Un fetch que no contesta nunca, salvo que lo corten. */
const colgado = (url, init) => new Promise((_, rechazar) => {
  init.signal.addEventListener('abort', () => rechazar(new Error('cortado')));
});

test('un pedido colgado se corta y el siguiente puede salir', async () => {
  let pedidos = 0;
  const contando = (url, init) => { pedidos += 1; return colgado(url, init); };
  await traer({ fetchFn: contando, espera: 20 }); // tiene que volver, no quedarse esperando
  await traer({ fetchFn: contando, espera: 20 });
  assert.equal(pedidos, 2, 'el segundo pedido no puede quedarse esperando al primero');
});

test('si el pedido falla, también se libera', async () => {
  let pedidos = 0;
  const falla = async () => { pedidos += 1; throw new Error('sin red'); };
  await traer({ fetchFn: falla });
  await traer({ fetchFn: falla });
  assert.equal(pedidos, 2);
});

test('el pedido lleva su corte y el tiempo es razonable', async () => {
  let senal = null;
  await traer({ fetchFn: async (url, init) => { senal = init.signal; return { ok: false }; } });
  assert.ok(senal instanceof AbortSignal);
  assert.ok(ESPERA_CLIMA >= 5000 && ESPERA_CLIMA <= 30000);
});

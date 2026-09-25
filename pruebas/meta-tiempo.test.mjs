// Meta con tiempo máximo.
//
// Auditoría del 25/09: ningún pedido a Meta tenía tiempo máximo. Si Meta
// dejaba uno colgado (pasa, sobre todo con la subida de un video), el reloj de
// Redes se quedaba esperando hasta que GitHub lo mataba, sin publicar nada y
// sin guardar el libro de lo que sí había salido.
//
// El fetch de mentira nunca contesta: sólo se entera cuando lo cortan.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearCliente, ErrorMeta, ESPERA_MAXIMA, ESPERA_MAXIMA_SUBIDA } from '../redes/meta.mjs';

/** Un fetch que no contesta nunca, salvo que lo corten. */
const colgado = (url, init) => new Promise((_, rechazar) => {
  init.signal.addEventListener('abort', () => rechazar(init.signal.reason));
});

test('un pedido a Meta que no contesta se corta y se informa, sin el token', async () => {
  const c = crearCliente({ token: 'TOKEN-SECRETO', paginaId: '1', fetchFn: colgado, espera: 30 });
  const antes = Date.now();
  await assert.rejects(() => c.pagina(), (e) => {
    assert.ok(e instanceof ErrorMeta);
    assert.match(e.message, /No se pudo hablar con Meta/);
    assert.ok(!e.message.includes('TOKEN-SECRETO'));
    return true;
  });
  assert.ok(Date.now() - antes < 5000, 'tiene que cortar enseguida, no quedarse esperando');
});

test('la subida de un video que no termina se corta, con su propio tiempo (más largo)', async () => {
  const pedidos = [];
  const fetchFn = async (url, init) => {
    pedidos.push({ url: String(url), init });
    const u = String(url);
    if (u.includes('/1?')) return { ok: true, status: 200, json: async () => ({ name: 'Radar', access_token: 'TP', instagram_business_account: { id: 'IG' } }) };
    if (u.endsWith('/IG/media')) return { ok: true, status: 200, json: async () => ({ id: 'C1', uri: 'https://subida.example/video' }) };
    return colgado(url, init); // la subida en sí
  };
  const c = crearCliente({ token: 'TOKEN-SECRETO', paginaId: '1', fetchFn, espera: 5000, esperaSubida: 30 });
  await assert.rejects(
    () => c.publicarVideoEnInstagram({ video: Buffer.from('mp4'), tipo: 'REELS', pie: 'x' }),
    /No se pudo subir el video/,
  );
  assert.ok(pedidos.every((p) => p.init.signal instanceof AbortSignal), 'todos los pedidos llevan su corte');
});

test('los tiempos por defecto: la subida tiene bastante más margen que un pedido común', () => {
  assert.ok(ESPERA_MAXIMA >= 30_000);
  assert.ok(ESPERA_MAXIMA_SUBIDA >= 5 * 60_000);
  assert.ok(ESPERA_MAXIMA_SUBIDA > ESPERA_MAXIMA);
});

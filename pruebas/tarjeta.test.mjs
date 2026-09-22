// El tamaño del titular en la tarjeta que se ve al compartir una nota.
//
// Un titular largo con letra grande se corta o se sale de la tarjeta; uno
// corto con letra chica se ve perdido en el espacio. cuerpo() decide el punto
// según cuántos caracteres tiene.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cuerpo } from '../web/lib/tamano-titulo.js';

test('un titular corto usa la letra más grande', () => {
  assert.equal(cuerpo('Corto'), 74);
  assert.equal(cuerpo('x'.repeat(48)), 74);
});

test('a medida que el titular crece, la letra achica', () => {
  assert.equal(cuerpo('x'.repeat(49)), 62);
  assert.equal(cuerpo('x'.repeat(80)), 62);
  assert.equal(cuerpo('x'.repeat(81)), 52);
  assert.equal(cuerpo('x'.repeat(120)), 52);
  assert.equal(cuerpo('x'.repeat(121)), 44);
});

test('nunca da un tamaño menor al mínimo, por más largo que sea', () => {
  assert.equal(cuerpo('x'.repeat(500)), 44);
});

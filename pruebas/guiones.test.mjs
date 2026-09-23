// Lo que dice la voz en las piezas fijas (no las de una noticia puntual).
//
// Son funciones puras de texto, sin resvg ni ffmpeg: se prueban solas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guionUtiles } from '../reels/plan.mjs';

test('los teléfonos útiles no dicen "esta semana": son siempre los mismos', () => {
  // Pasó el 22/09: "una vez por semana te dejamos los teléfonos" daba a
  // entender que los números cambiaban semana a semana, y no es así — lo
  // único que varía es cuándo sale la pieza, no el contenido.
  const g = guionUtiles();
  assert.ok(!/esta semana|una vez por semana/i.test(g), g);
  assert.ok(g.includes('emergencias'));
});

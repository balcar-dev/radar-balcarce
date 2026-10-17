// Los horarios de las historias fijas (redes/horarios.mjs; hasta el 17/10, en panel/ y editables desde el panel de la PC, retirado).
//
// Es lo que decide a qué hora sale el clima, la farmacia, la agenda y los
// teléfonos útiles — y, desde el 21/09, también lo que usa redes/piezas.mjs
// para armar el cronograma que corre en GitHub. Un valor guardado mal acá
// hace que una pieza no salga nunca o salga a una hora rara, sin que se vea
// ningún error en ningún lado.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HISTORIAS_FIJAS, horariosDe, toca } from '../redes/horarios.mjs';

test('sin nada guardado, salen los valores de fábrica', () => {
  const h = horariosDe({});
  assert.equal(h.length, HISTORIAS_FIJAS.length);
  assert.equal(h.find((x) => x.id === 'clima-manana').hora, '07:00');
});

test('lo guardado pisa el valor de fábrica, pero el nombre y el porqué no cambian', () => {
  const estado = { horarios: { farmacia: { hora: '19:30' } } };
  const h = horariosDe(estado);
  const farmacia = h.find((x) => x.id === 'farmacia');
  assert.equal(farmacia.hora, '19:30');
  assert.equal(farmacia.nombre, 'Farmacia de turno');
});

test('una pieza nueva en el código aparece sola, sin perder lo ya ajustado', () => {
  // Simula que HISTORIAS_FIJAS creció: lo guardado de las viejas se respeta.
  const estado = { horarios: { 'clima-manana': { hora: '08:00' } } };
  const h = horariosDe(estado);
  assert.equal(h.length, HISTORIAS_FIJAS.length);
  assert.equal(h.find((x) => x.id === 'clima-manana').hora, '08:00');
});

test('toca() respeta el día de la semana y si está apagada', () => {
  const lunes = new Date('2026-09-21T12:00:00-03:00'); // lunes
  const martes = new Date('2026-09-22T12:00:00-03:00');
  assert.equal(toca({ activa: true, dias: [2] }, martes), true);
  assert.equal(toca({ activa: true, dias: [2] }, lunes), false);
  assert.equal(toca({ activa: false, dias: [1] }, lunes), false, 'apagada no toca aunque sea su día');
});

test('sin días guardados, toca todos los días', () => {
  assert.equal(toca({ activa: true }, new Date('2026-09-21T12:00:00-03:00')), true);
});

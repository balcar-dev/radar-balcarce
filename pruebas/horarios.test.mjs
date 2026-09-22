// Los horarios de las historias fijas, editables desde el panel.
//
// Es lo que decide a qué hora sale el clima, la farmacia, la agenda y los
// teléfonos útiles — y, desde el 21/09, también lo que usa redes/piezas.mjs
// para armar el cronograma que corre en GitHub. Un valor guardado mal acá
// hace que una pieza no salga nunca o salga a una hora rara, sin que se vea
// ningún error en ningún lado.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIAS, HISTORIAS_FIJAS, horariosDe, guardarHorario, toca } from '../panel/horarios.mjs';

test('sin nada guardado, salen los valores de fábrica', () => {
  const h = horariosDe({});
  assert.equal(h.length, HISTORIAS_FIJAS.length);
  assert.equal(h.find((x) => x.id === 'clima-manana').hora, '07:30');
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

test('guardar un horario inválido no cambia nada', () => {
  const estado = {};
  assert.throws(() => guardarHorario(estado, { id: 'farmacia', hora: '25:00' }), /hora/);
  assert.throws(() => guardarHorario(estado, { id: 'farmacia', hora: '9:30' }), /hora/, 'sin el cero adelante no vale');
  assert.throws(() => guardarHorario(estado, { id: 'no-existe', hora: '10:00' }), /no existe/);
  assert.throws(() => guardarHorario(estado, { id: 'farmacia', dias: [] }), /día/);
});

test('un horario válido se guarda y no toca las otras piezas', () => {
  const estado = {};
  guardarHorario(estado, { id: 'farmacia', hora: '19:15' });
  guardarHorario(estado, { id: 'clima-manana', activa: false });
  const h = horariosDe(estado);
  assert.equal(h.find((x) => x.id === 'farmacia').hora, '19:15');
  assert.equal(h.find((x) => x.id === 'clima-manana').activa, false);
  assert.equal(h.find((x) => x.id === 'clima-noche').hora, '20:00', 'no se movió sola');
});

test('los días repetidos o inválidos se limpian antes de guardar', () => {
  const estado = {};
  guardarHorario(estado, { id: 'farmacia', dias: [1, 1, 9, -1, 3] });
  assert.deepEqual(estado.horarios.farmacia.dias, [1, 3]);
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

test('los 7 días de la semana están, uno por número de Date#getDay()', () => {
  const numeros = DIAS.map((d) => d.n).sort((a, b) => a - b);
  assert.deepEqual(numeros, [0, 1, 2, 3, 4, 5, 6]);
});

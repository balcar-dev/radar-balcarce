// La hora de Balcarce (ingesta/zona.mjs): la única que usan la ingesta, el
// panel y las redes. GitHub Actions corre en UTC; de 21 a 24 en Balcarce ya
// es "mañana" ahí, y todo lo que dependa del día o de la hora tiene que
// seguir marcando Balcarce.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diaAR, horaAR, minutoDelDiaAR, diaSemanaAR, horaCortaAR, minutosDeHora } from '../ingesta/zona.mjs';

// 22:30 del sábado 26/09 en Balcarce = 01:30 UTC del domingo 27/09.
const NOCHE = new Date('2026-09-27T01:30:00Z');

test('el día, la hora y los minutos son los de Balcarce, no los de UTC', () => {
  assert.equal(diaAR(NOCHE), '2026-09-26');
  assert.equal(horaAR(NOCHE), 22);
  assert.equal(minutoDelDiaAR(NOCHE), 22 * 60 + 30);
  assert.equal(horaCortaAR(NOCHE), '22:30');
});

test('la medianoche es la hora 0 y el minuto 0, no la 24', () => {
  const medianoche = new Date('2026-09-26T00:00:00-03:00');
  assert.equal(horaAR(medianoche), 0);
  assert.equal(minutoDelDiaAR(medianoche), 0);
  assert.equal(diaAR(medianoche), '2026-09-26');
});

test('el día de la semana cuenta desde el domingo (0) y sigue a Balcarce', () => {
  assert.equal(diaSemanaAR(NOCHE), 6); // sábado, aunque en UTC ya sea domingo
  assert.equal(diaSemanaAR(new Date('2026-09-27T12:00:00-03:00')), 0);
  assert.equal(diaSemanaAR(new Date('2026-09-28T12:00:00-03:00')), 1);
});

test('una hora escrita "HH:MM" se cuenta en minutos desde la medianoche', () => {
  assert.equal(minutosDeHora('00:00'), 0);
  assert.equal(minutosDeHora('09:30'), 570);
  assert.equal(minutosDeHora('22:00'), 1320);
});

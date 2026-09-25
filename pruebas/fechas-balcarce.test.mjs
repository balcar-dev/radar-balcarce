// Las fechas son las de Balcarce, no las del servidor.
//
// GitHub Actions corre en UTC, tres horas adelante. De 21 a 24 de Balcarce,
// `new Date().getDate()` ya da el día siguiente: la farmacia se cruzaba con la
// de mañana, el control del cronograma decía "no es del mes en curso" el
// último día del mes a la noche, y la agenda miraba el mes que viene
// (auditoría del 25/09).
//
// Este archivo corre con el reloj en UTC a propósito (cada archivo de prueba
// es un proceso aparte, así que no afecta a los demás): en una PC de Balcarce
// el error no se ve nunca, y justamente por eso llegó a GitHub.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { fechaEnBalcarce, diaDeTurno } from '../ingesta/utiles.mjs';
import { paraPruebas } from '../ingesta/ingesta.mjs';
import { anualesQueSeAcercan, CALENDARIO_ANUAL } from '../ingesta/agenda.mjs';

const { cruzarFarmacias, controlDelCronograma } = paraPruebas;

before(() => { process.env.TZ = 'UTC'; });

const a = (iso) => new Date(iso);
const A_LAS_22 = a('2026-09-25T22:00:00-03:00'); // en UTC ya es el 26 a la 1
const A_LAS_2330 = a('2026-09-25T23:30:00-03:00'); // en UTC, el 26 a las 2:30

test('el reloj de este archivo está en UTC, como en GitHub', () => {
  assert.equal(A_LAS_22.getDate(), 26, 'si esto falla, la prueba no está probando nada');
});

test('fechaEnBalcarce: a las 22 y a las 23:30 sigue siendo el 25', () => {
  assert.deepEqual(fechaEnBalcarce(A_LAS_22), { anio: 2026, mes: 9, dia: 25 });
  assert.deepEqual(fechaEnBalcarce(A_LAS_2330), { anio: 2026, mes: 9, dia: 25 });
  assert.deepEqual(fechaEnBalcarce(a('2026-09-26T00:30:00-03:00')), { anio: 2026, mes: 9, dia: 26 });
});

test('fechaEnBalcarce: fin de mes y fin de año a la noche', () => {
  assert.deepEqual(fechaEnBalcarce(a('2026-09-30T23:30:00-03:00')), { anio: 2026, mes: 9, dia: 30 });
  assert.deepEqual(fechaEnBalcarce(a('2026-12-31T22:00:00-03:00')), { anio: 2026, mes: 12, dia: 31 });
});

test('diaDeTurno también da el 25 a las 22 y a las 23:30 con el servidor en UTC', () => {
  assert.equal(diaDeTurno(A_LAS_22).getDate(), 25);
  assert.equal(diaDeTurno(A_LAS_2330).getDate(), 25);
});

// ---------------------------------------------------------- la farmacia

const COLEGIO = [
  { dia: 25, farmacias: ['BENITES'] },
  { dia: 26, farmacias: ['MARIOLI'] },
];
const OTRAS = async () => [{ dia: 25, nombre: 'Benites' }, { dia: 26, nombre: 'Marioli' }];

for (const [nombre, ahora] of [['22:00', A_LAS_22], ['23:30', A_LAS_2330]]) {
  test(`cruzarFarmacias a las ${nombre} compara la farmacia de HOY, no la de mañana`, async () => {
    const r = await cruzarFarmacias(COLEGIO, { ahora, vanguardia: OTRAS, gabalFn: OTRAS });
    assert.equal(r.dia, 25);
    assert.deepEqual(r.discrepancias, [], 'con el día de UTC comparaba Benites contra Marioli');
    assert.equal(r.confirmado, true);
  });
}

test('cruzarFarmacias a las 2 de la mañana sigue con el turno de ayer (cambia a las 8:30)', async () => {
  const r = await cruzarFarmacias(COLEGIO, { ahora: a('2026-09-26T02:00:00-03:00'), vanguardia: OTRAS, gabalFn: OTRAS });
  assert.equal(r.dia, 25);
  const r2 = await cruzarFarmacias(COLEGIO, { ahora: a('2026-09-26T09:00:00-03:00'), vanguardia: OTRAS, gabalFn: OTRAS });
  assert.equal(r2.dia, 26);
});

test('cruzarFarmacias sigue avisando cuando las fuentes no coinciden de verdad', async () => {
  const distinta = async () => [{ dia: 25, nombre: 'San Antonio' }];
  const r = await cruzarFarmacias(COLEGIO, { ahora: A_LAS_22, vanguardia: distinta, gabalFn: OTRAS });
  assert.equal(r.discrepancias.length, 1);
  assert.match(r.discrepancias[0], /San Antonio/);
});

// ------------------------------------------------- el control del cronograma

const SEPTIEMBRE = {
  mes: 9, anio: 2026, turnos: Array.from({ length: 30 }, (_, i) => ({ dia: i + 1, mes: 9, farmacias: ['X'] })),
};

test('el 30 a las 22 y a las 23:30, el cronograma de septiembre es "del mes en curso"', () => {
  assert.deepEqual(controlDelCronograma(SEPTIEMBRE, a('2026-09-30T22:00:00-03:00')), []);
  assert.deepEqual(controlDelCronograma(SEPTIEMBRE, a('2026-09-30T23:30:00-03:00')), []);
});

test('el 1 de octubre, el de septiembre sí avisa que es viejo', () => {
  const avisos = controlDelCronograma(SEPTIEMBRE, a('2026-10-01T10:00:00-03:00'));
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /septiembre, no del mes en curso/);
});

// ------------------------------------------------------------- la agenda

test('la agenda del 31 de agosto a las 22 y a las 23:30 mira agosto, no septiembre', () => {
  const deAgosto = CALENDARIO_ANUAL.filter((e) => e.mesAproximado === 8).map((e) => e.id);
  assert.ok(deAgosto.length, 'hace falta al menos una fiesta de agosto en el calendario para probar esto');
  for (const hora of ['22:00', '23:30']) {
    const ids = anualesQueSeAcercan(a(`2026-08-31T${hora}:00-03:00`)).map((e) => e.id);
    for (const id of deAgosto) assert.ok(ids.includes(id), `a las ${hora} del 31/08 falta ${id}: miró septiembre`);
  }
});

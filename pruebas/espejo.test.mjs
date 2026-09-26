// El reintento del espejo de Facebook en el feed de Instagram (redes/espejo.mjs).
// El 25/09 a las 22:25 el espejo de un posteo falló y nunca se reintentaba:
// Instagram quedó en 4 de 5.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { espejosPendientes, ESPEJO } from '../redes/espejo.mjs';

const REAL = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'libro-real-24-25-09.json'), 'utf8'));
const AR = (fecha, hhmm) => new Date(`${fecha}T${hhmm}:00-03:00`);
const nota = (id) => ({ id, titulo: `Nota ${id}` });

test('el posteo de Facebook sin su foto en Instagram se reintenta (el caso real del 24/09 a las 22:25)', () => {
  const r = espejosPendientes({ notas: [nota('yaqf3p'), nota('942wi7')], libro: REAL, ahora: AR('2026-09-24', '23:00') });
  assert.deepEqual(r.map((n) => n.id), ['yaqf3p'], 'el otro ya tiene su foto');
});

test('pasadas las 12 horas ya no tiene sentido espejarlo', () => {
  assert.deepEqual(espejosPendientes({ notas: [nota('yaqf3p')], libro: REAL, ahora: AR('2026-09-25', '12:00') }), []);
});

test('con un tope de intentos por posteo', () => {
  const libro = JSON.parse(JSON.stringify(REAL));
  libro.facebook.yaqf3p.intentosEspejo = ESPEJO.intentosMaximos;
  assert.deepEqual(espejosPendientes({ notas: [nota('yaqf3p')], libro, ahora: AR('2026-09-24', '23:00') }), []);
  libro.facebook.yaqf3p.intentosEspejo = ESPEJO.intentosMaximos - 1;
  assert.equal(espejosPendientes({ notas: [nota('yaqf3p')], libro, ahora: AR('2026-09-24', '23:00') }).length, 1);
});

test('si la nota ya no está en la portada no hay con qué armar la tarjeta: se deja', () => {
  assert.deepEqual(espejosPendientes({ notas: [], libro: REAL, ahora: AR('2026-09-24', '23:00') }), []);
});

test('sin libro no hay nada que reintentar', () => {
  assert.deepEqual(espejosPendientes({ notas: [nota('a')], libro: {}, ahora: new Date() }), []);
});

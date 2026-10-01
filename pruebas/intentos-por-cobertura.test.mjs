// Una nota muy contada tiene más intentos de la IA antes de quedar "sin cuerpo" (1/10/2026, Hernán:
// "si la cuentan 12 medios tiene lógica"). Caso real: la visita de JD Vance, 12 medios, tres intentos y nada.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { intentosMaximosPara, MAXIMO_DE_INTENTOS } from '../reels/reescritura.mjs';
import { REESCRITURA } from '../ingesta/criterio.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

test('con pocos medios, los tres intentos de siempre; con muchos, más', () => {
  assert.equal(MAXIMO_DE_INTENTOS, 3);
  assert.equal(intentosMaximosPara(1), 3);
  assert.equal(intentosMaximosPara(4), 3);
  assert.equal(intentosMaximosPara(REESCRITURA.fuentesParaUnIntentoExtra), 4);
  assert.equal(intentosMaximosPara(7), 4);
  assert.equal(intentosMaximosPara(REESCRITURA.fuentesParaDosIntentosExtra), 5);
  assert.equal(intentosMaximosPara(12), 5, 'la de Vance');
  assert.equal(intentosMaximosPara(), 3);
});

test('el generador de datos lo anota por nota y el panel lo usa', () => {
  assert.match(fs.readFileSync(path.join(RAIZ, 'web/scripts/generar-datos.mjs'), 'utf8'), /maximo: intentosMaximosPara\(/);
  assert.match(fs.readFileSync(path.join(RAIZ, 'web/public/panel/app.js'), 'utf8'), /maximo: n\.maximo \?\? E\.intentosMaximos/);
});

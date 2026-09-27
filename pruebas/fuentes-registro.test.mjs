// FUENTES.md dice lo mismo que el código (27/09, Hernán: "un archivo sólo
// para fuentes… así eso no vuelve a cambiar"). Si alguien toca una lista de
// fuentes y no vuelve a correr `node ingesta/listar-fuentes.mjs`, esto falla.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registroDeFuentes, ARCHIVO } from '../ingesta/listar-fuentes.mjs';

test('FUENTES.md está al día con ingesta/fuentes.mjs y fuentes-cruce.mjs', () => {
  const escrito = fs.readFileSync(ARCHIVO, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(escrito, registroDeFuentes(), 'correr: node ingesta/listar-fuentes.mjs');
});

test('FUENTES.md explica cómo se usa cada fuente en el cruce', () => {
  const t = registroDeFuentes();
  for (const s of ['## Cómo se usan', 'El cruce', '## De Balcarce', '## De la región', '## De la provincia', '## Nacionales', 'Nunca con un solo medio']) {
    assert.ok(t.includes(s), `falta "${s}"`);
  }
});

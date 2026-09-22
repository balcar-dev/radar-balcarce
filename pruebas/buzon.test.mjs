// El buzón: qué tipos de contenido propio existen y qué regla frena a cada
// uno. No hay lógica que decida nada (eso lo hace panel/servidor.mjs a mano,
// desde el panel), pero es el catálogo del que depende: si un tipo desaparece
// o cambia de nombre, hay que saberlo acá y no descubrirlo en producción.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIPOS, ESTADOS_SEGUIMIENTO } from '../panel/buzon.mjs';

test('los cuatro tipos de contenido propio están, cada uno con su regla', () => {
  assert.deepEqual(Object.keys(TIPOS).sort(), ['dato', 'opinion', 'reclamo', 'seguimiento']);
  for (const [id, t] of Object.entries(TIPOS)) {
    assert.ok(t.nombre, `${id} sin nombre`);
    assert.ok(t.que, `${id} sin descripción`);
    assert.ok(t.regla, `${id} sin regla`);
  }
});

test('el reclamo es el único que exige la otra versión antes de publicar', () => {
  // Es la regla más importante del archivo: publicar una acusación de un solo
  // lado es lo que puede exponer a una demanda por calumnias o injurias.
  assert.match(TIPOS.reclamo.regla, /NUNCA se publica de un solo lado/);
  assert.match(TIPOS.reclamo.regla, /otra parte/);
});

test('la opinión va siempre firmada, nunca anónima', () => {
  assert.match(TIPOS.opinion.regla, /nunca anónima/);
});

test('el seguimiento tiene sus cinco estados, y "cumplido" es uno de ellos', () => {
  assert.equal(ESTADOS_SEGUIMIENTO.length, 5);
  assert.ok(ESTADOS_SEGUIMIENTO.includes('cumplido'));
  assert.ok(ESTADOS_SEGUIMIENTO.includes('pendiente'));
});

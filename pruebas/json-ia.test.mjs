// Una respuesta de la IA con una barra invertida mal formada (28/09): la mitad de
// los pedidos de una corrida se perdieron con "Bad Unicode escape in JSON" y
// ninguna nota recibió cuerpo. Se lee igual, sin cambiar el texto.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limpiarJson, repararEscapes } from '../reels/reescritura.mjs';

const B = '\\'; // una barra invertida, para no pelear con los escapes

test('un JSON con un escape inválido se lee igual, sin cambiar el texto', () => {
  // "\u00" cortado y "\é" suelto: JSON.parse fallaba.
  const roto = `{"titulo":"La Municipalidad informa","cuerpo":"Texto con ${B}u00 raro y ${B}é suelto."}`;
  assert.throws(() => JSON.parse(roto));
  const obj = limpiarJson(`Respuesta: ${roto}`);
  assert.equal(obj.titulo, 'La Municipalidad informa');
  assert.equal(obj.cuerpo, `Texto con ${B}u00 raro y ${B}é suelto.`);
});

test('lo que ya era un JSON válido no se toca', () => {
  const valido = `{"a":"línea${B}nnueva ${B}"cita${B}" ${B}u00e9"}`;
  assert.equal(repararEscapes(valido), valido);
  assert.deepEqual(limpiarJson(`{"a":"ok ${B}u00e9"}`), { a: 'ok é' });
});

test('sin un JSON reconocible sigue diciendo que no hay JSON', () => {
  assert.throws(() => limpiarJson('no hay nada acá'), /no trae un JSON/);
});

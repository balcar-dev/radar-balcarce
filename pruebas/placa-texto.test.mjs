// Cómo se cortan los renglones de texto en las placas.
//
// envolver() corta por cantidad de caracteres (para los datos chicos, como la
// dirección de una farmacia); envolverAncho() corta por el ancho real en
// píxeles que ocupa el texto (para el titular grande, donde una M y una i no
// miden lo mismo). Si cualquiera de las dos corta mal, el texto se sale de la
// placa o queda un renglón vacío.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envolver, envolverAncho } from '../reels/placa.mjs';

test('envolver no corta si el texto entra en un renglón', () => {
  assert.deepEqual(envolver('Calle 18 número 715', 40), ['Calle 18 número 715']);
});

test('envolver corta en la palabra, nunca a la mitad de una', () => {
  const r = envolver('Una dirección bastante larga de verdad', 15);
  for (const linea of r) assert.ok(!linea.endsWith('-'), `"${linea}" se cortó a la mitad`);
  assert.equal(r.join(' '), 'Una dirección bastante larga de verdad');
});

test('envolver no deja renglones vacíos', () => {
  const r = envolver('  ', 10);
  assert.ok(r.every((l) => l.trim().length > 0));
});

test('envolverAncho corta antes de pasarse del espacio disponible', () => {
  const r = envolverAncho('Un titular bastante largo para una placa chica', 60, 400);
  assert.ok(r.length > 1, 'un texto largo en poco espacio tiene que partirse en más de un renglón');
  assert.equal(r.join(' '), 'Un titular bastante largo para una placa chica', 'no se pierde ninguna palabra');
});

test('envolverAncho con letra chica entra en menos renglones que con letra grande', () => {
  const titulo = 'Nuevo mural de Fangio en el autódromo local de Balcarce';
  const chica = envolverAncho(titulo, 40, 900);
  const grande = envolverAncho(titulo, 100, 900);
  assert.ok(chica.length <= grande.length);
});

test('una sola palabra muy larga no rompe: queda sola en su renglón', () => {
  const r = envolverAncho('Supercalifragilisticoespialidoso', 60, 100);
  assert.equal(r.length, 1);
  assert.equal(r[0], 'Supercalifragilisticoespialidoso');
});

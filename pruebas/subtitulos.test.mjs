// Los subtítulos: cuándo arranca cada palabra dentro del audio.
//
// El 21/09 los subtítulos iban por delante de la voz, hasta 19 segundos en el
// podcast. Se midió contra la voz de Edge, que trae el tiempo exacto de cada
// palabra: el error medio bajó de 2,5–9,5 segundos a 0,1–0,2. Estas pruebas
// vigilan las causas, no sólo el número.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { silabas, numeroEnPalabras, clausulas, repartir } from '../reels/tiempos.mjs';

test('los números se cuentan como los dice la voz', () => {
  // "715" se dice "setecientos quince": 6 sílabas. Contarlo como una palabra de
  // una sílaba corría todo el subtítulo de la dirección de la farmacia.
  assert.equal(numeroEnPalabras(715), 'setecientos quince');
  assert.equal(numeroEnPalabras(21), 'veintiuno');
  assert.equal(numeroEnPalabras(100), 'cien');
  assert.equal(numeroEnPalabras(38), 'treinta y ocho');
  assert.equal(numeroEnPalabras(2026), 'dos mil veintiseis');
  assert.equal(silabas('715'), 6);
});

test('los diptongos son una sílaba', () => {
  // Contar cada vocal inflaba las palabras con diptongo y desparejaba el tiempo.
  assert.equal(silabas('diez'), 1);
  assert.equal(silabas('cuatro'), 2);
  assert.equal(silabas('Balcarce'), 3);
  assert.equal(silabas('que'), 1);
});

test('el hiato es de dos sílabas', () => {
  assert.equal(silabas('país'), 2);
  assert.equal(silabas('día'), 2);
});

test('el texto se parte en cláusulas en cada signo de puntuación', () => {
  const c = clausulas(['Primero:', 'uno', 'dos.', 'Después:', 'tres.']);
  assert.deepEqual(c.map((x) => x.tipo), ['coma', 'frase', 'coma', 'frase']);
});

/**
 * Un audio armado a mano, con la voz a 5 sílabas por segundo y sus pausas:
 *
 *   Primero: (0–0.6)  pausa (0.6–1.0)  uno dos tres. (1.0–1.8)  pausa (1.8–2.8)
 *   Después: (2.8–3.4)  pausa (3.4–3.8)  cuatro cinco seis. (3.8–4.8)
 */
const PALABRAS = ['Primero:', 'uno', 'dos', 'tres.', 'Después:', 'cuatro', 'cinco', 'seis.'];
const PAUSAS = [
  { desde: 0.6, hasta: 1.0 },   // la coma de "Primero:"
  { desde: 1.8, hasta: 2.8 },   // el fin de la oración
  { desde: 3.4, hasta: 3.8 },   // la coma de "Después:"
];
const VERDAD = { 'Primero': 0.0, 'uno': 1.0, 'tres': 1.6, 'Después': 2.8, 'cuatro': 3.8, 'seis': 4.6 };

test('cada palabra cae donde la voz la dice, aunque haya pausas de coma', () => {
  // La versión anterior tomaba las primeras pausas como finales de oración: acá
  // hay una pausa de coma ANTES del fin de la primera oración, y con ella se
  // adelantaba todo lo que venía después.
  const r = repartir(PALABRAS, PAUSAS, 0, 4.8);
  for (const w of r) {
    if (w.texto in VERDAD) {
      assert.ok(Math.abs(w.desde - VERDAD[w.texto]) <= 0.15, `${w.texto}: ${w.desde.toFixed(2)} y tendría que ser ${VERDAD[w.texto]}`);
    }
  }
});

test('la palabra siguiente a una pausa arranca cuando la pausa termina, no en el medio', () => {
  // Después de "tres." hay casi un segundo de silencio: "Después" no puede
  // aparecer mientras la voz todavía está callada.
  const r = repartir(PALABRAS, PAUSAS, 0, 4.8);
  const despues = r.find((w) => w.texto === 'Después');
  assert.ok(despues.desde >= 2.7, `arrancó en ${despues.desde.toFixed(2)}, con la voz callada`);
});

test('el orden nunca se rompe y todo cae adentro del audio', () => {
  const r = repartir(PALABRAS, PAUSAS, 0, 4.8);
  for (let i = 1; i < r.length; i += 1) {
    assert.ok(r[i].desde >= r[i - 1].desde, `${r[i].texto} arranca antes que ${r[i - 1].texto}`);
  }
  assert.ok(r[0].desde >= 0);
  assert.ok(r.at(-1).hasta <= 4.8 + 1e-6);
});

test('marca dónde termina cada oración y dónde hay una coma', () => {
  const r = repartir(PALABRAS, PAUSAS, 0, 4.8);
  assert.equal(r.find((w) => w.texto === 'tres').finFrase, true);
  assert.equal(r.find((w) => w.texto === 'Primero').pausa, true);
  assert.equal(r.find((w) => w.texto === 'uno').finFrase, false);
});

test('una pausa que no corresponde a ningún corte se ignora', () => {
  // Una respiración en medio de una cláusula no puede partirla.
  const conRuido = [...PAUSAS, { desde: 1.4, hasta: 1.55 }];
  const r = repartir(PALABRAS, conRuido, 0, 4.8);
  const cuatro = r.find((w) => w.texto === 'cuatro');
  assert.ok(Math.abs(cuatro.desde - 3.8) <= 0.3, `cuatro arrancó en ${cuatro.desde.toFixed(2)}`);
});

test('sin ninguna pausa reparte por peso y no se rompe', () => {
  const r = repartir(PALABRAS, [], 0, 4.8);
  assert.equal(r.length, PALABRAS.length);
  assert.ok(r.every((w) => Number.isFinite(w.desde) && w.hasta >= w.desde));
});

test('con un texto vacío devuelve vacío', () => {
  assert.deepEqual(repartir([], [], 0, 3), []);
});

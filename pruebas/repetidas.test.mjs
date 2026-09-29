// La misma noticia con dos direcciones (29/09, pendiente A1): queda una y la otra
// redirige. Y las páginas viejas que dicen "EN VIVO" en el título se retiran.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  parecido, repetidasConOtraDireccion, conFusionadas, redireccionesDeFusionadas, REPETIDAS,
} from '../web/lib/repetidas.js';
import { diceEnVivo } from '../ingesta/verificar.mjs';

const CUERPO = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(' ');
const nota = (id, titulo, fecha, o = {}) => ({ id, titulo, fecha, slug: titulo.toLowerCase().replace(/\W+/g, '-'), ...o });

test('los casos reales del 29/09 son la misma noticia; dos notas del mismo tema, no', () => {
  assert.equal(parecido('Boccanera y Baigorria ganan en el regreso del Turismo Special de la Costa al Fangio', 'Boccanera y Baigorria ganan en el regreso del Turismo Special de la Costa al Fangio'), 1);
  assert.ok(parecido('Reabre el Autódromo Juan Manuel Fangio', 'El autódromo Juan Manuel Fangio reabre sus puertas') >= REPETIDAS.umbral);
  assert.ok(parecido('Top Serrano clasifica sus seis equipos a los Play Off', 'Top Serrano clasifica sus seis equipos a los Play Off provinciales') >= REPETIDAS.umbral);
  // El mismo tema, otra noticia.
  assert.ok(parecido('Mariano Werner logra la pole de las TC Pick Up', 'Hernán Palazzo gana la final del TC Pick Up en el autódromo Fangio') < REPETIDAS.umbral);
  assert.ok(parecido('Campo de Pato gana en el Torneo Desarrollo de rugby', 'Campo de Pato disputa una doble fecha de hockey') < REPETIDAS.umbral);
  assert.equal(parecido('Reabre', 'Reabre'), 0, 'con menos de tres palabras que dicen algo no se decide');
});

test('queda la que fue a las redes; si no, la que tiene cuerpo; si no, la primera', () => {
  const a = nota('a', 'Reabre el Autódromo Juan Manuel Fangio', '2026-09-25T00:03:00Z');
  const b = nota('b', 'El autódromo Juan Manuel Fangio reabre sus puertas', '2026-09-25T08:03:00Z', { cuerpo: CUERPO });
  const c = nota('c', 'El Autódromo Juan Manuel Fangio reabre', '2026-09-27T17:29:00Z');
  assert.deepEqual([...repetidasConOtraDireccion([a, b, c])], [['a', 'b'], ['c', 'b']]);
  assert.deepEqual([...repetidasConOtraDireccion([a, b, c], { enRedes: new Set(['c']) })], [['a', 'c'], ['b', 'c']]);
  assert.deepEqual([...repetidasConOtraDireccion([a, { ...b, cuerpo: '' }])], [['b', 'a']], 'sin cuerpo en ninguna, la primera');
});

test('no se tocan las notas propias, lo que fue a las redes, ni lo que está lejos en el tiempo', () => {
  const d1 = nota('d1', 'El dólar blue cotiza a $1.560 este viernes 25', '2026-09-25T14:00:00Z', { propia: true });
  const d2 = nota('d2', 'El dólar blue cotiza a $1.560 este lunes 28', '2026-09-28T14:00:00Z', { propia: true });
  assert.equal(repetidasConOtraDireccion([d1, d2]).size, 0);
  const x = nota('x', 'Impulsan educación tributaria en secundarias', '2026-09-01T10:00:00Z');
  const y = nota('y', 'Impulsan educación tributaria en secundarias', '2026-09-20T10:00:00Z');
  assert.equal(repetidasConOtraDireccion([x, y]).size, 0, 'con semanas de diferencia puede ser otra edición');
  const r1 = nota('r1', 'Hernán Palazzo gana en el regreso del TC Pick Up', '2026-09-27T18:00:00Z', { redes: true });
  const r2 = nota('r2', 'Hernán Palazzo gana en el regreso del TC Pick Up', '2026-09-27T19:00:00Z', { redes: true });
  assert.equal(repetidasConOtraDireccion([r1, r2]).size, 0, 'las dos circulan en Facebook');
});

test('la dirección de la repetida redirige a la que queda, y se guarda con su fecha', () => {
  const porId = new Map([['a', nota('a', 'Reabre el Autódromo Juan Manuel Fangio', '2026-09-25T00:03:00Z')]]);
  const ahora = new Date('2026-09-29T20:00:00Z');
  const json = conFusionadas({ notas: { vieja: { a: 'q', ruta: '/nota/x-vieja', cuando: '2026-01-01T00:00:00Z' } } }, new Map([['a', 'b']]), porId, ahora);
  assert.deepEqual(Object.keys(json.notas), ['a'], 'las de más de 180 días se van');
  assert.equal(json.notas.a.ruta, '/nota/reabre-el-aut-dromo-juan-manuel-fangio-a');
  const r = redireccionesDeFusionadas(json, (id) => (id === 'b' ? '/nota/el-autodromo-reabre-b' : null));
  assert.deepEqual(r, [
    { origen: '/nota/reabre-el-aut-dromo-juan-manuel-fangio-a', destino: '/nota/el-autodromo-reabre-b' },
    { origen: '/nota/a', destino: '/nota/el-autodromo-reabre-b' },
  ]);
  assert.deepEqual(redireccionesDeFusionadas(json, () => null), [], 'si la que queda ya no tiene página, no se redirige');
});

test('"EN VIVO" y "minuto a minuto" en el título se retiran; "música en vivo", no', () => {
  assert.ok(diceEnVivo('Dólar hoy y dólar blue, EN VIVO: a cuánto cotiza'));
  assert.ok(diceEnVivo('Minuto a minuto en vivo de San Lorenzo vs. Boca'));
  assert.ok(diceEnVivo('A qué hora habla Javier Milei en la ONU y cómo verlo en vivo'));
  assert.ok(!diceEnVivo('Una noche de música en vivo en el Teatro'));
  assert.ok(!diceEnVivo('Reabre el Autódromo Juan Manuel Fangio'));
  const datos = fs.readFileSync(new URL('../web/scripts/generar-datos.mjs', import.meta.url), 'utf8');
  assert.match(datos, /!decisionHumana\(d\) && diceEnVivo\(/);
  assert.match(fs.readFileSync(new URL('../.github/workflows/actualizar.yml', import.meta.url), 'utf8'), /web\/data\/fusionadas\.json/);
});

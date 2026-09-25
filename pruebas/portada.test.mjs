// Lo que ve un lector en la portada: sin fuentes arriba de los títulos, sin
// "la vimos hace…", con las notas de la más nueva a la más vieja.
//
// Son cosas que se pidieron varias veces (24/09) y volvían a aparecer: por eso
// están vigiladas acá.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ordenarPortada, cuando } from '../web/lib/datos.js';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const nota = (id, horasAtras, extra = {}) => ({
  id, titulo: id, seccion: 'Balcarce', relevancia: 50, local: false, fecha: new Date(Date.now() - horasAtras * 3600e3).toISOString(), ...extra,
});

// ------------------------------------------------------- las fuentes

test('la portada, las secciones y los temas no muestran la fuente arriba del título', () => {
  for (const f of ['web/app/page.js', 'web/app/seccion/[ranura]/page.js', 'web/app/tema/[ranura]/page.js', 'web/components/piezas.js']) {
    assert.ok(!/medios\.join/.test(leer(f)), `${f} vuelve a mostrar los medios de origen`);
  }
});

test('la fuente sí queda en la página de cada nota (la atribución va ahí)', () => {
  // Desde el 25/09, en un desplegable chico al pie: "Fuentes (N)", con el
  // nombre de cada medio y su enlace (EDITORIAL.md).
  assert.match(leer('web/app/nota/[id]/page.js'), /<FuentesDeLaNota nota=\{n\} \/>/);
  assert.match(leer('web/lib/fuentes-de-la-nota.js'), /nota\?\.medios/);
});

// -------------------------------------------------- "la vimos hace…"

test('una nota sin hora de la fuente no muestra nada en el lugar de la hora', () => {
  assert.equal(cuando({ sinFecha: true, visto: new Date().toISOString() }), '');
  assert.equal(cuando({ sinFecha: true }), '');
  assert.ok(!/la vimos|sin hora/i.test(leer('web/lib/datos.js').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')));
});

test('con hora de la fuente, sí se dice hace cuánto', () => {
  assert.match(cuando({ sinFecha: false, fecha: new Date(Date.now() - 3 * 3600e3).toISOString() }), /hace 3 h/);
});

// ------------------------------------------------------------ el orden

test('el resto va de la más nueva a la más vieja', () => {
  const { resto } = ordenarPortada([nota('vieja', 30), nota('media', 10), nota('nueva', 1), nota('lider', 5, { local: true, relevancia: 99 })]);
  assert.deepEqual(resto.map((n) => n.id), ['nueva', 'media', 'vieja']);
});

test('una nota sin hora se ordena por cuándo apareció, no salta arriba de todo', () => {
  // La ingesta le pone la hora de ahora a lo que no trae fecha; generar-datos
  // la reemplaza por la primera vez que se la vio. Acá se prueba el resultado.
  const { resto } = ordenarPortada([
    nota('sin-hora-vista-hace-2-dias', 48, { sinFecha: true }),
    nota('de-hace-1-hora', 1),
    nota('de-hace-5-horas', 5),
    nota('lider', 2, { local: true, relevancia: 99 }),
  ]);
  assert.deepEqual(resto.map((n) => n.id), ['de-hace-1-hora', 'de-hace-5-horas', 'sin-hora-vista-hace-2-dias']);
});

test('al generar los datos, una nota sin hora usa la primera vez que se la vio', () => {
  const s = leer('web/scripts/generar-datos.mjs');
  assert.match(s, /fecha: n\.cuando === 'sin fecha en la fuente' \? \(vistoAntes\[n\.id\] \?\? ahoraISO\) : n\.fecha/);
});

// --------------------------------------------------------- la farmacia

test('la tarjeta de la farmacia no dice hasta qué hora está de turno', () => {
  assert.ok(!/termina a las|hasta-cuando/.test(leer('web/components/piezas.js')));
  assert.ok(!/termina a las/.test(leer('web/app/farmacias/page.js')));
});

// Lo que ve un lector en la portada: sin fuentes arriba de los títulos, sin
// "la vimos hace…", con las notas de la más nueva a la más vieja.
//
// Son cosas que se pidieron varias veces (24/09) y volvían a aparecer: por eso
// están vigiladas acá.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ordenarPortada, cuando, armarTapa } from '../web/lib/datos.js';
import { sinNotasRepetidas, titularesParecidos } from '../web/lib/texto.js';

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
  // nombre de cada medio y su enlace (CRITERIO-EDITORIAL.md, sección 7).
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

// ----------------------------------------------- notas repetidas (25/09)

const COLAPINTO = 'Franco Colapinto larga décimo en el Gran Premio de Azerbaiyán';

test('dos notas con el mismo titular no pueden estar en la portada: queda la de más relevancia', () => {
  // Los dos titulares reales del 25/09 (id distinto, mismo título).
  const a = nota('a1b2c3', 1, { titulo: COLAPINTO, seccion: 'Automovilismo', relevancia: 62 });
  const b = nota('d4e5f6', 3, { titulo: 'Franco Colapinto larga décimo en el Gran Premio de Azerbaiyán.', seccion: 'Automovilismo', relevancia: 71 });
  const otra = nota('otra', 2, { titulo: 'Abrió la inscripción al torneo de truco', relevancia: 40 });
  assert.deepEqual(sinNotasRepetidas([a, otra, b]).map((n) => n.id), ['otra', 'd4e5f6'], 'gana la de más relevancia, en el orden de entrada');
  // A igual relevancia, la más nueva.
  const c = { ...b, id: 'c', relevancia: 62 };
  assert.deepEqual(sinNotasRepetidas([c, a]).map((n) => n.id), ['a1b2c3']);
  // Mayúsculas, tildes y signos no distinguen.
  assert.equal(sinNotasRepetidas([{ ...a, titulo: '¡FRANCO COLAPINTO LARGA DECIMO EN EL GRAN PREMIO DE AZERBAIYAN!' }, { ...c, relevancia: 10 }]).length, 1);
});

test('titulares casi idénticos también se juntan; los distintos, no', () => {
  assert.ok(titularesParecidos(COLAPINTO, 'Colapinto larga décimo en el Gran Premio de Azerbaiyán, en Bakú'));
  assert.ok(!titularesParecidos(COLAPINTO, 'Franco Colapinto clasificó undécimo en el Gran Premio de Azerbaiyán'), 'una palabra clave distinta pesa');
  assert.ok(!titularesParecidos('Balcarce: robaron una casa', 'Balcarce: robaron una moto'), 'los cortos no se comparan "casi"');
  assert.ok(!titularesParecidos('Kevin Gómez campeón mundial', 'Ferroviarios ganó por penales'));
  assert.deepEqual(sinNotasRepetidas([]), []);
});

test('generar-datos saca las repetidas de las listas pero deja su página en el archivo, y armarTapa también las junta', () => {
  const s = leer('web/scripts/generar-datos.mjs');
  assert.match(s, /const notas = sinNotasRepetidas\(vigentes\);/);
  assert.match(s, /enPortada: new Set\(vigentes\.map\(\(n\) => n\.id\)\)/, 'la repetida entra igual al archivo: su enlace puede estar compartido');
  const { principal, secundarias, bloques } = armarTapa([
    nota('a', 1, { titulo: COLAPINTO, seccion: 'Automovilismo', relevancia: 60 }),
    nota('b', 3, { titulo: COLAPINTO, seccion: 'Automovilismo', relevancia: 60 }),
    nota('c', 2, { titulo: 'Otra cosa distinta de verdad ahora', seccion: 'Automovilismo', relevancia: 30 }),
  ]);
  const todas = [principal, ...secundarias, ...bloques.flatMap(([, ns]) => ns)];
  assert.equal(todas.filter((n) => n.titulo === COLAPINTO).length, 1);
});

// ---------------------------------------- la columna de la hora (25/09)

test('en escritorio la columna de la hora se reserva siempre, con hora o sin ella', () => {
  const piezas = leer('web/components/piezas.js');
  assert.match(piezas, /<div className="col-hora"><Hace nota=\{nota\} className="meta" \/><\/div>/);
  const css = leer('web/app/globals.css');
  assert.match(css, /\.fila-nota \.col-hora \{ width: 96px; flex-shrink: 0; display: none; \}/);
  assert.match(css, /@media \(min-width: 620px\) \{ \.fila-nota \.col-hora \{ display: block; \} \}/);
  // Sin hora no se inventa ninguna: Hace no dibuja nada.
  assert.equal(cuando({ sinFecha: true }), '');
});

// ------------------------------- la columna derecha, una sola pila (25/09)

test('la columna derecha es una sola pila: servicios y lateral dentro de .derecha, sin filas de grilla aparte', () => {
  const page = leer('web/app/page.js');
  const orden = ['className="derecha"', '<TarjetaClima', '<TarjetaFarmacia', '<TarjetaDolar', 'Agenda de Balcarce', '<TarjetaBuzon', 'Números útiles', 'className="principal"']
    .map((t) => page.indexOf(t));
  assert.ok(orden.every((x, i) => x > 0 && (i === 0 || x > orden[i - 1])), `orden en el HTML: ${orden}`);
  const css = leer('web/app/globals.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.dos-columnas \.derecha \{ display: contents; \}/, 'en el celular la pila se desarma');
  assert.match(css, /\.dos-columnas \.derecha \{ display: flex; flex-direction: column; gap: 16px; grid-column: 2; grid-row: 1;/);
  assert.ok(!/grid-row: 1 \/ span 2/.test(css), 'una fila que abarca dos filas de la grilla estira la de arriba y deja el hueco');
});

// La web: cómo se parten las secciones en páginas y cómo se escriben los
// nombres que llegan gritados desde las fuentes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comoNombre } from '../web/lib/texto.js';
import {
  POR_PAGINA, partirRanura, cuantasPaginas, direccionDePagina,
} from '../web/lib/paginas.js';
import { cuando, haceCuanto } from '../web/lib/datos.js';

// Las secciones que existen de verdad, para que partirRanura sepa distinguir.
const esSeccion = (r) => ['deportes', 'balcarce', 'automovilismo', 'agro'].includes(r);

// --------------------------------------------------------------- el nombre

test('un nombre en mayúsculas se escribe como se escribe', () => {
  assert.equal(comoNombre('SAN JOSE PLAZA'), 'San Jose Plaza');
  assert.equal(comoNombre('DEL CERRO'), 'Del Cerro');
});

test('un nombre ya bien escrito no se toca', () => {
  assert.equal(comoNombre('San José de la Plaza'), 'San José de la Plaza');
  assert.equal(comoNombre('Del Cerro'), 'Del Cerro');
});

test('no se rompe con texto vacío', () => {
  assert.equal(comoNombre(''), '');
  assert.equal(comoNombre(undefined), '');
  assert.equal(comoNombre('42-1611'), '42-1611');
});

// -------------------------------------------------------------- las páginas

test('la primera página no lleva número en la dirección', () => {
  // Que /seccion/deportes siga siendo /seccion/deportes importa: es la
  // dirección que ya está compartida por WhatsApp y la que conoce Google.
  assert.equal(direccionDePagina('deportes', 1), '/seccion/deportes');
  assert.equal(direccionDePagina('deportes', 3), '/seccion/deportes-3');
});

test('la ranura se parte en sección y número', () => {
  assert.deepEqual(partirRanura('deportes', esSeccion), { base: 'deportes', pagina: 1 });
  assert.deepEqual(partirRanura('deportes-2', esSeccion), { base: 'deportes', pagina: 2 });
});

test('una sección que no existe no se parte', () => {
  // Si "ruta-226" fuera una sección, esto la leería como la página 226 de
  // una sección llamada "ruta" y mostraría un 404 confuso.
  assert.deepEqual(partirRanura('ruta-226', esSeccion), { base: 'ruta-226', pagina: 1 });
});

test('ida y vuelta: la dirección que se genera se vuelve a leer igual', () => {
  for (const pagina of [1, 2, 7, 12]) {
    const url = direccionDePagina('deportes', pagina);
    const ranura = url.replace('/seccion/', '');
    assert.deepEqual(partirRanura(ranura, esSeccion), { base: 'deportes', pagina });
  }
});

test('las páginas alcanzan para todas las notas y no sobra ninguna', () => {
  // Deportes llegó a tener más de sesenta notas en un día.
  for (const cuantas of [1, 14, 15, 16, 60, 61]) {
    const paginas = cuantasPaginas(cuantas);
    let sumadas = 0;
    for (let i = 1; i <= paginas; i += 1) {
      sumadas += Math.min(POR_PAGINA, cuantas - (i - 1) * POR_PAGINA);
    }
    assert.equal(sumadas, cuantas, cuantas + ' notas en ' + paginas + ' páginas');
  }
});

test('una sección sin notas tiene igual una página', () => {
  // Es la que dice que no hay nada: cero páginas no se puede dibujar.
  assert.equal(cuantasPaginas(0), 1);
});

test('quince notas entran en una sola página', () => {
  assert.equal(cuantasPaginas(15), 1);
  assert.equal(cuantasPaginas(16), 2);
});


// ----------------------------------------------------- la hora de la nota

test('si la fuente dio la hora, se usa esa', () => {
  const hace2h = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  assert.equal(cuando({ fecha: hace2h, sinFecha: false }), 'hace 2 h');
});

test('si la fuente no dio la hora, se dice cuándo la vimos', () => {
  // Decía "sin hora", que se lee como un error nuestro y no le sirve a
  // nadie para saber si la nota es de hoy. Cuándo la vimos aparecer sí lo
  // sabemos, y es honesto decirlo así.
  const hace3h = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  assert.equal(cuando({ sinFecha: true, visto: hace3h }), 'la vimos hace 3 h');
});

test('sin fecha y sin avistaje no se inventa nada', () => {
  assert.equal(cuando({ sinFecha: true }), 'sin hora');
});

test('haceCuanto dice lo que corresponde en cada tramo', () => {
  const hace = (min) => haceCuanto(new Date(Date.now() - min * 60000).toISOString());
  assert.equal(hace(0), 'recién');
  assert.equal(hace(20), 'hace 20 min');
  assert.equal(hace(180), 'hace 3 h');
  assert.equal(hace(1500), 'ayer');
  assert.equal(hace(4400), 'hace 3 días');
});
// La web: cómo se parten las secciones en páginas y cómo se escriben los
// nombres que llegan gritados desde las fuentes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comoNombre } from '../web/lib/texto.js';
import {
  POR_PAGINA, partirRanura, cuantasPaginas, direccionDePagina,
} from '../web/lib/paginas.js';
import { cuando, haceCuanto, ordenarPortada, armarTapa } from '../web/lib/datos.js';

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

test('si la fuente no dio la hora, no se dice nada (ni "la vimos" ni "sin hora")', () => {
  // Decía "sin hora", que se lee como un error nuestro y no le sirve a
  // nadie para saber si la nota es de hoy. Cuándo la vimos aparecer sí lo
  // sabemos, y es honesto decirlo así.
  const hace3h = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  assert.equal(cuando({ sinFecha: true, visto: hace3h }), '', 'no debe decir "la vimos"');
});

test('sin fecha y sin avistaje no se inventa nada', () => {
  assert.equal(cuando({ sinFecha: true }), '');
});

test('haceCuanto dice lo que corresponde en cada tramo', () => {
  const hace = (min) => haceCuanto(new Date(Date.now() - min * 60000).toISOString());
  assert.equal(hace(0), 'recién');
  assert.equal(hace(20), 'hace 20 min');
  assert.equal(hace(180), 'hace 3 h');
  assert.equal(hace(1500), 'ayer');
  assert.equal(hace(4400), 'hace 3 días');
});

// --------------------------------------------------- qué nota va arriba

/** Una nota mínima: id, cuándo salió y cuánto puntúa. */
const n = (id, horas, relevancia) => ({
  id, relevancia, fecha: new Date(Date.now() - horas * 3600 * 1000).toISOString(),
});

test('la nota grande es la de más puntaje, no la más nueva', () => {
  // El 20/09 la portada abría con la que había entrado hace un minuto y la
  // caravana para recibir al campeón balcarceño (100 puntos) estaba
  // enterrada en el medio de la lista.
  const { principal } = ordenarPortada([n('recien', 0.1, 63), n('campeon', 5, 100), n('vieja', 8, 70)]);
  assert.equal(principal.id, 'campeon');
});

test('la lista sigue yendo por hora', () => {
  const { resto } = ordenarPortada([n('a', 3, 50), n('b', 0.5, 40), n('c', 5, 95)]);
  // La grande es "c" (95). El resto va de lo más nuevo a lo más viejo.
  assert.deepEqual(resto.map((x) => x.id), ['b', 'a']);
});

test('el lugar grande es de Balcarce aunque puntúe menos', () => {
  // Messi jugando en la MLS puntúa 97 y Ferroviarios ganando por penales,
  // 90. Messi puede estar en la portada de cualquier diario del país;
  // Ferroviarios, no.
  const messi = { ...n('messi', 1, 97), local: false };
  const ferro = { ...n('ferro', 3, 90), local: true };
  assert.equal(ordenarPortada([messi, ferro]).principal.id, 'ferro');
});

test('si un medio de afuera nombra a Balcarce, también cuenta', () => {
  const nacional = { ...n('nombra', 1, 70), local: false, nombraBalcarce: true };
  const otro = { ...n('otro', 1, 95), local: false };
  assert.equal(ordenarPortada([nacional, otro]).principal.id, 'nombra');
});

test('si no hay nada de Balcarce, manda el puntaje', () => {
  const a = { ...n('a', 1, 60), local: false };
  const b = { ...n('b', 2, 88), local: false };
  assert.equal(ordenarPortada([a, b]).principal.id, 'b');
});

test('una nota vieja con mucho puntaje no se queda arriba para siempre', () => {
  // Pasadas 24 horas deja de competir: si no, la nota del campeón seguiría
  // abriendo la portada una semana después.
  const { principal } = ordenarPortada([n('anteayer', 40, 100), n('hoy', 2, 55)]);
  assert.equal(principal.id, 'hoy');
});

test('si no hay nada de hoy, manda el puntaje igual', () => {
  const { principal } = ordenarPortada([n('vieja', 50, 40), n('viejaBuena', 60, 90)]);
  assert.equal(principal.id, 'viejaBuena');
});

test('la grande compite sólo con las de las últimas 6 horas (25/09: abría una de hace 8 h)', () => {
  const { principal } = ordenarPortada([n('de-la-manana', 8, 100), n('nueva', 1, 60)]);
  assert.equal(principal.id, 'nueva');
});

// -------------------------------------------------------------- la tapa

/** Una nota con sección, horas y puntaje. */
const t = (id, seccion, horas, relevancia = 60, extra = {}) => ({ ...n(id, horas, relevancia), seccion, local: true, ...extra });

test('las cinco de la tapa son de cinco secciones distintas (25/09: salían 4 de Economía)', () => {
  const notas = [
    t('pol', 'Política', 2, 90),
    t('eco1', 'Economía', 0.2), t('eco2', 'Economía', 0.3), t('eco3', 'Economía', 0.4), t('eco4', 'Economía', 0.5),
    t('dep', 'Deportes', 1), t('agro', 'Agro', 1.5), t('bal', 'Balcarce', 3),
  ];
  const { principal, secundarias } = armarTapa(notas);
  const secciones = [principal, ...secundarias].map((x) => x.seccion);
  assert.equal(new Set(secciones).size, secciones.length, secciones.join(', '));
  assert.equal(secundarias.length, 4);
  assert.equal(secundarias[0].id, 'eco1', 'de cada sección, la más nueva');
});

test('en la tapa no va una nota sin hora', () => {
  const notas = [t('grande', 'Balcarce', 1, 95), t('sinhora', 'Agro', 0.1, 99, { sinFecha: true }), t('dep', 'Deportes', 2)];
  const { principal, secundarias, bloques } = armarTapa(notas);
  assert.notEqual(principal.id, 'sinhora');
  assert.ok(!secundarias.some((x) => x.id === 'sinhora'));
  assert.ok(bloques.some(([s, lista]) => s === 'Agro' && lista[0].id === 'sinhora'), 'queda en su sección');
});

test('cada sección muestra sus tres más nuevas, sin repetir las de la tapa', () => {
  const notas = [
    t('grande', 'Balcarce', 1, 95),
    ...[0.5, 2, 3, 4, 5].map((h, i) => t('dep' + i, 'Deportes', h)),
  ];
  const { secundarias, bloques } = armarTapa(notas, ['Balcarce', 'Deportes']);
  assert.equal(secundarias[0].id, 'dep0');
  const [, deportes] = bloques.find(([s]) => s === 'Deportes');
  assert.deepEqual(deportes.map((x) => x.id), ['dep1', 'dep2', 'dep3']);
});

test('sin notas no se rompe', () => {
  assert.deepEqual(armarTapa([]), { principal: null, secundarias: [], bloques: [] });
  assert.deepEqual(ordenarPortada([]), { principal: null, resto: [] });
  assert.deepEqual(ordenarPortada(), { principal: null, resto: [] });
});
// ------------------------------------------------ las horas no se congelan

test('"hace X" se recalcula en el navegador: el <time> lleva la fecha exacta (26/09)', async () => {
  const { haceCuanto } = await import('../web/lib/tiempo.js');
  const hace2h = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  assert.equal(haceCuanto(hace2h), 'hace 2 h');
  assert.equal(haceCuanto(hace2h, Date.now() + 3600 * 1000), 'hace 3 h', 'una hora después dice otra cosa');
  const fs = await import('node:fs');
  const piezas = fs.readFileSync(new URL('../web/components/piezas.js', import.meta.url), 'utf8');
  assert.match(piezas, /<time[^>]*dateTime=[^>]*data-hace/);
  const layout = fs.readFileSync(new URL('../web/app/layout.js', import.meta.url), 'utf8');
  assert.match(layout, /<HorasVivas \/>/);
});

// "Seguí leyendo" al pie de cada nota y los tres por sección de la portada
// (25/09): siempre presentes, distintos, con hora real, lo nuevo primero, y
// completados con el archivo (con su fecha verdadera) cuando faltan.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { seguirLeyendo } from '../web/lib/seguir-leyendo.js';
import { armarTapa } from '../web/lib/datos.js';
import { mismaHistoria } from '../web/lib/texto.js';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const AHORA = Date.now();
const CUERPO = Array.from({ length: 90 }, (_, i) => `palabra${i}`).join(' ');
const nota = (id, titulo, horas, extra = {}) => ({
  id, titulo, seccion: 'Balcarce', relevancia: 50, local: false, copete: `bajada de ${id}`,
  fecha: new Date(AHORA - horas * 3600e3).toISOString(), ...extra,
});
const conCuerpo = (n) => ({ ...n, cuerpo: CUERPO });

// ----------------------------------------------------- "Seguí leyendo"

test('no ofrece dos notas de la misma visita, aunque los titulares cambien', () => {
  const actual = nota('a', 'El intendente entregó las obras del barrio norte', 1);
  const seguir = seguirLeyendo(actual, [
    nota('s1', 'Diego Santilli visita Balcarce por la reinauguración del autódromo', 2),
    nota('s2', 'Diego Santilli llega a Balcarce por el automovilismo', 3),
    nota('s3', 'Ferroviarios ganó por penales y llegó a la final anual', 4),
    nota('s4', 'La cosecha gruesa avanza con lluvias en el sudeste', 5, { seccion: 'Agro' }),
    nota('s5', 'Se reunió el Concejo Deliberante con siete temas', 6, { seccion: 'Política' }),
  ]);
  const santilli = seguir.filter((n) => /Santilli/.test(n.titulo));
  assert.equal(santilli.length, 1);
  assert.equal(santilli[0].id, 's1', 'queda la más nueva de las repetidas');
  assert.equal(seguir.length, 4);
});

test('no ofrece notas del mismo tema que la nota actual', () => {
  const actual = nota('a', 'Cambios en el autódromo', 1, { temas: ['autodromo'] });
  const seguir = seguirLeyendo(actual, [
    nota('t', 'Nuevo asfalto en pista', 2, { temas: ['autodromo'] }),
    nota('o1', 'Ferroviarios ganó por penales', 3),
    nota('o2', 'Cosecha gruesa avanza en el sudeste', 4, { seccion: 'Agro' }),
    nota('o3', 'Sesión del Concejo por el presupuesto', 5, { seccion: 'Política' }),
    nota('o4', 'Feria del libro en la biblioteca', 6, { seccion: 'Cultura y agenda' }),
  ]);
  assert.ok(!seguir.some((n) => n.id === 't'));
});

test('siempre cuatro: dos de la misma sección y dos de otras, de la más nueva a la más vieja', () => {
  const actual = nota('a', 'Nota actual sobre la calle', 0.5);
  const seguir = seguirLeyendo(actual, [
    nota('b1', 'Rutas cortadas por las lluvias del fin de semana', 1),
    nota('b2', 'Vecinos piden mejoras en la plaza principal', 2),
    nota('b3', 'Nuevo horario del transporte a Mar del Plata', 3),
    nota('p1', 'Sesión del Concejo aprobó el presupuesto anual', 1.5, { seccion: 'Política' }),
    nota('e1', 'Suben las tasas de interés en los bancos', 2.5, { seccion: 'Economía' }),
    nota('d1', 'Ferroviarios ganó por penales y llegó a la final', 0.7, { seccion: 'Deportes' }),
  ]);
  assert.equal(seguir.length, 4);
  assert.equal(seguir.filter((n) => n.seccion === 'Balcarce').length, 2);
  const otras = seguir.filter((n) => n.seccion !== 'Balcarce');
  assert.equal(otras.length, 2);
  assert.notEqual(otras[0].seccion, otras[1].seccion);
  const horas = seguir.map((n) => new Date(n.fecha).getTime());
  assert.deepEqual(horas, [...horas].sort((x, y) => y - x), 'lo más nuevo primero');
});

test('no elige notas sin hora ni la nota del dólar mientras haya otra opción', () => {
  const actual = nota('a', 'Nota actual del día', 1, { seccion: 'Economía' });
  const seguir = seguirLeyendo(actual, [
    nota('sin', 'Nota sin hora de la fuente sobre obras', 0.2, { sinFecha: true }),
    nota('dolar', 'El dólar blue cotiza a $1.560 este viernes', 0.3, { propia: 'dolar', seccion: 'Economía' }),
    nota('r1', 'Suben los precios de los combustibles', 2, { seccion: 'Economía' }),
    nota('r2', 'El banco central compró reservas esta semana', 3, { seccion: 'Economía' }),
    nota('r3', 'Ferroviarios ganó por penales y llegó a la final', 4, { seccion: 'Deportes' }),
    nota('r4', 'Sesión del Concejo aprobó el presupuesto anual', 5, { seccion: 'Política' }),
  ]);
  assert.deepEqual(seguir.map((n) => n.id).sort(), ['r1', 'r2', 'r3', 'r4']);
});

test('si sólo hay notas sin hora o propias, igual muestra algo (nunca vacío)', () => {
  const actual = nota('a', 'Nota actual del día', 1);
  const seguir = seguirLeyendo(actual, [
    nota('dolar', 'El dólar blue cotiza a $1.560 este viernes', 0.3, { propia: 'dolar', seccion: 'Economía' }),
    nota('sin', 'Nota sin hora sobre las obras del barrio', 0.2, { sinFecha: true }),
  ]);
  assert.equal(seguir.length, 2);
});

test('si las últimas 72 horas no alcanzan, completa con el archivo (con cuerpo, con su fecha)', () => {
  const actual = nota('a', 'Nota actual del día', 1);
  const archivo = [
    conCuerpo(nota('v1', 'Hace días se inauguró la sala de teatro', 24 * 5)),
    nota('sc', 'Archivada sin cuerpo que no debe salir', 24 * 4),
    conCuerpo(nota('v2', 'Se renovó la cancha del club Ferroviarios', 24 * 6, { seccion: 'Deportes' })),
    conCuerpo(nota('v3', 'La cooperativa eléctrica cambió los medidores', 24 * 8, { seccion: 'Servicios' })),
  ];
  const seguir = seguirLeyendo(actual, [nota('r1', 'Reciente sobre las lluvias del fin de semana', 2)], archivo);
  assert.equal(seguir.length, 4);
  assert.ok(!seguir.some((n) => n.id === 'sc'));
  assert.equal(seguir[0].id, 'r1');
});

test('no repite la nota actual aunque esté también en el archivo', () => {
  const actual = conCuerpo(nota('a', 'Nota actual del día', 1));
  const seguir = seguirLeyendo(actual, [actual], [actual]);
  assert.equal(seguir.length, 0);
});

test('la página de la nota usa seguirLeyendo y no lleva botones al pie', () => {
  const p = leer('web/app/nota/[id]/page.js');
  assert.match(p, /seguirLeyendo\(/);
  assert.ok(!/Más de|texto: 'Agenda'|← Portada/.test(p));
  assert.ok(!/botonera|← Portada/.test(leer('web/components/piezas.js')));
});

test('ninguna página termina con botones de navegación que ya están arriba', () => {
  for (const f of ['agenda/page.js', 'agenda/[id]/page.js', 'dolar/page.js', 'util/page.js', 'farmacias/page.js', 'tema/[ranura]/page.js', 'seccion/[ranura]/page.js', 'nota/[id]/page.js']) {
    assert.ok(!/enlaces=\{\[/.test(leer(`web/app/${f}`)), `${f} vuelve a pasar enlaces al Cierre`);
  }
});

test('mismaHistoria: mismo tema o mismas palabras, pero no notas distintas', () => {
  assert.ok(mismaHistoria(
    { titulo: 'Diego Santilli visita Balcarce por la reinauguración del autódromo' },
    { titulo: 'Diego Santilli llega a Balcarce por el automovilismo' },
  ));
  assert.ok(!mismaHistoria({ titulo: 'Ferroviarios ganó por penales en Balcarce' }, { titulo: 'Cosecha gruesa avanza en Balcarce' }));
  assert.ok(mismaHistoria({ titulo: 'Uno', temas: ['x'] }, { titulo: 'Otro', temas: ['x'] }));
});

// ------------------------------------------- tres por sección (portada)

const en = (b, s) => b.find(([x]) => x === s)?.[1] ?? [];

test('una sección con una nota reciente y cinco viejas muestra tres: la reciente y dos del archivo, con su fecha', () => {
  const portada = [
    nota('p', 'Nota grande de Balcarce sobre la obra', 1, { local: true, relevancia: 99 }),
    nota('c1', 'Muestra de pintura en el museo', 5, { seccion: 'Cultura y agenda' }),
  ];
  const titulos = ['Estrenan obra de teatro en la sala municipal', 'Charla de escritores en la biblioteca popular', 'Nueva muestra fotográfica del taller escuela', 'Coro de niños canta en la parroquia', 'Festival folclórico llega al parque'];
  const archivo = titulos.map((t, i) => conCuerpo(nota(`cv${i + 1}`, t, 24 * (i + 4), { seccion: 'Cultura y agenda' })));
  // La de cultura es la única de su sección: va a la tapa como secundaria, así que
  // para probar el bloque se le suma otra reciente de otra sección que la deje abajo.
  const { bloques, secundarias } = armarTapa(portada, ['Balcarce', 'Cultura y agenda'], { archivo });
  const cultura = en(bloques, 'Cultura y agenda');
  assert.equal(secundarias.length, 1);
  assert.equal(cultura.length, 3, 'el bloque se completa con el archivo');
  assert.deepEqual(cultura.map((n) => n.id), ['cv1', 'cv2', 'cv3'], 'las más nuevas del archivo, en orden');
  assert.ok(cultura.every((n) => !n.sinFecha && n.fecha), 'todas con su hora real');
});

test('una sección vacía en la portada y en el archivo no se dibuja; una vacía en la portada pero con archivo, sí', () => {
  const portada = [nota('p', 'Nota grande de Balcarce', 1, { local: true })];
  const archivo = [conCuerpo(nota('pol1', 'Robo en una casa de la calle veinte', 24 * 3, { seccion: 'Policiales' }))];
  const { bloques } = armarTapa(portada, ['Balcarce', 'Policiales', 'Agro'], { archivo });
  assert.equal(en(bloques, 'Agro').length, 0);
  assert.ok(!bloques.some(([s]) => s === 'Agro'));
  assert.equal(en(bloques, 'Policiales').length, 1);
});

test('las del archivo sin cuerpo, propias, sin hora o de hace más de 14 días no completan', () => {
  const portada = [nota('p', 'Nota grande de Balcarce', 1, { local: true })];
  const archivo = [
    nota('sin-cuerpo', 'Archivada que no tiene cuerpo de verdad', 24 * 2, { seccion: 'Agro' }),
    conCuerpo(nota('vieja', 'Archivada de hace veinte días por la sequía', 24 * 20, { seccion: 'Agro' })),
    conCuerpo(nota('propia', 'Repaso del podcast de la tarde de ayer', 24 * 2, { seccion: 'Agro', propia: 'repaso' })),
    conCuerpo(nota('sinhora', 'Archivada sin hora de la fuente sobre siembra', 24 * 2, { seccion: 'Agro', sinFecha: true })),
    conCuerpo(nota('ok', 'Archivada buena sobre el precio de la soja', 24 * 5, { seccion: 'Agro' })),
  ];
  const { bloques } = armarTapa(portada, ['Balcarce', 'Agro'], { archivo });
  assert.deepEqual(en(bloques, 'Agro').map((n) => n.id), ['ok']);
});

test('una nota del archivo que repite un titular de la portada no se suma, ni una que ya está en la portada', () => {
  const portada = [
    nota('p', 'Nota grande de Balcarce', 1, { local: true }),
    nota('a1', 'Ferroviarios ganó por penales y llegó a la final anual', 3, { seccion: 'Deportes' }),
  ];
  const archivo = [
    conCuerpo(nota('a1', 'Ferroviarios ganó por penales y llegó a la final anual', 3, { seccion: 'Deportes' })),
    conCuerpo(nota('dup', 'Ferroviarios ganó por penales y llegó a la final anual', 24 * 2, { seccion: 'Deportes' })),
    conCuerpo(nota('d2', 'Nuevo entrenador en el básquet local de la ciudad', 24 * 3, { seccion: 'Deportes' })),
  ];
  const { bloques } = armarTapa(portada, ['Balcarce', 'Deportes'], { archivo });
  // La de Deportes de la portada (a1) va a la tapa; el bloque se completa sin repetirla.
  const ids = en(bloques, 'Deportes').map((n) => n.id);
  assert.ok(!ids.includes('dup'));
  assert.ok(!ids.includes('a1'));
  assert.deepEqual(ids, ['d2']);
});

test('la tapa (grande y secundarias) sigue usando sólo lo de la portada', () => {
  const portada = [nota('p', 'Nota grande de Balcarce', 1, { local: true })];
  const archivo = [conCuerpo(nota('v', 'Muy nueva pero archivada sobre el clima', 0.1, { seccion: 'Agro' }))];
  const { principal, secundarias } = armarTapa(portada, undefined, { archivo });
  assert.equal(principal.id, 'p');
  assert.equal(secundarias.length, 0);
});

test('una sección con notas recientes de sobra no toca el archivo', () => {
  const portada = [
    nota('p', 'Nota grande de Balcarce', 1, { local: true }),
    ...[1, 2, 3, 4].map((i) => nota(`d${i}`, `Deporte distinto número ${i} sobre partido${i}`, 1 + i, { seccion: 'Deportes' })),
  ];
  const archivo = [conCuerpo(nota('v', 'Archivada de deportes sobre natación', 24, { seccion: 'Deportes' }))];
  const { bloques } = armarTapa(portada, ['Deportes'], { archivo });
  assert.deepEqual(en(bloques, 'Deportes').map((n) => n.id), ['d2', 'd3', 'd4']);
});

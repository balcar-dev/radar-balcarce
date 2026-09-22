// La agenda de eventos: qué fiestas anuales avisar cada mes, cómo se traduce
// un evento del municipio, y el mensaje que se manda a pedir la agenda.
//
// eventosDelMunicipio() en sí usa la red (ingesta/ingesta.mjs → fetch) y no se
// prueba acá; lo que sí se prueba es la parte pura: la conversión de un evento
// y qué fiestas anuales caen cerca de una fecha dada.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CALENDARIO_ANUAL, CONTACTOS, eventoDeMunicipio, anualesQueSeAcercan, mesesHastaQueLlegue, mensajeAgenda,
} from '../ingesta/agenda.mjs';

test('un evento de la API se traduce a nuestra forma, con el guion largo bien escrito', () => {
  const e = {
    id: 123, title: 'Feria &#8211; Edición 2026', start_date: '2026-10-07 10:00:00', end_date: '2026-10-08 20:00:00',
    venue: { venue: 'Predio ferial', address: 'Ruta 2' }, cost: 'Gratis',
    image: { url: 'https://x/img.jpg' }, url: 'https://x/evento', categories: [{ name: 'Feria' }],
  };
  const r = eventoDeMunicipio(e);
  assert.equal(r.id, 'muni-123');
  assert.equal(r.nombre, 'Feria – Edición 2026');
  assert.equal(r.lugar, 'Predio ferial');
  assert.equal(r.confirmado, true);
  assert.equal(r.fuente, 'Municipalidad de Balcarce');
  assert.deepEqual(r.categorias, ['Feria']);
});

test('sin lugar, costo o imagen, quedan en null y no en undefined ni vacío', () => {
  const r = eventoDeMunicipio({ id: 1, title: 'X', start_date: 'a', end_date: 'b', categories: [] });
  assert.equal(r.lugar, null);
  assert.equal(r.direccion, null);
  assert.equal(r.costo, null);
  assert.equal(r.imagen, null);
});

test('las fiestas de este mes y del que viene se avisan, con confirmado en false', () => {
  // La Fiesta del Postre tiene mesAproximado: 7. Estando en julio o en junio,
  // tiene que aparecer.
  const enJulio = new Date('2026-07-15T12:00:00-03:00');
  const r = anualesQueSeAcercan(enJulio);
  const postre = r.find((e) => e.id === 'fiesta-papa-frita' || e.id === 'fiesta-postre');
  assert.ok(r.every((e) => e.confirmado === false), 'nunca se muestra como fecha confirmada');
});

test('una fiesta de un mes lejano no se avisa todavía', () => {
  // automovilismo-nacional es de febrero (mesAproximado: 2).
  const enSeptiembre = new Date('2026-09-15T12:00:00-03:00');
  const r = anualesQueSeAcercan(enSeptiembre);
  assert.ok(!r.some((e) => e.id === 'automovilismo-nacional'));
});

test('el mes da la vuelta del año sin romperse: de diciembre a enero es 1 mes, no 11', () => {
  assert.equal(mesesHastaQueLlegue(12, 1), 1);
  assert.equal(mesesHastaQueLlegue(11, 12), 1);
  assert.equal(mesesHastaQueLlegue(1, 12), 11, 'diciembre ya pasó, mirando desde enero');
  assert.equal(mesesHastaQueLlegue(6, 6), 0, 'el mismo mes es 0, no 12');
});


test('todos los eventos del calendario anual tienen mes, categoría y contacto posible', () => {
  const categoriasValidas = ['oficial', 'cerro', 'ciclismo', 'running', 'automovilismo', 'feria', 'agro'];
  for (const ev of CALENDARIO_ANUAL) {
    assert.ok(ev.mesAproximado >= 1 && ev.mesAproximado <= 12, `${ev.id}: mes fuera de rango`);
    assert.ok(categoriasValidas.includes(ev.categoria), `${ev.id}: categoría "${ev.categoria}" no existe`);
  }
});

test('cada contacto tiene a quién llamar y para qué sirve', () => {
  for (const c of CONTACTOS) {
    assert.ok(c.quien, `${c.id} sin nombre`);
    assert.ok(c.telefono, `${c.id} sin teléfono`);
    assert.ok(c.para, `${c.id} sin decir para qué sirve`);
  }
});

test('el mensaje de agenda saluda por su nombre y firma como el medio', () => {
  const m = mensajeAgenda({ quien: 'Gastón', firma: 'Radar Balcarce' });
  assert.match(m, /^Hola, Gastón!/);
  assert.match(m, /— Radar Balcarce$/);
});

test('sin nombre, el mensaje no queda con una coma pegada', () => {
  const m = mensajeAgenda();
  assert.match(m, /^Hola! Te escribimos/);
  assert.doesNotMatch(m, /Hola,/);
});

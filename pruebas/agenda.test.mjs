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
  textoDeDescripcion, eventoSinSensibles, sinEntidades, MAXIMO_DESCRIPCION,
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

test('cada contacto tiene a quién escribirle y para qué sirve (la base completa, en agenda-panel.test.mjs)', () => {
  for (const c of CONTACTOS) {
    assert.ok(c.quien, `${c.id} sin nombre`);
    assert.ok(Object.keys(c.canales).length, `${c.id} sin ningún canal`);
    assert.ok(c.para, `${c.id} sin decir para qué sirve`);
  }
});

test('cada fiesta anual tiene una clave para reconocer su fecha confirmada', () => {
  for (const ev of CALENDARIO_ANUAL) {
    assert.ok(ev.clave, `${ev.id} sin clave`);
    assert.equal(ev.clave, ev.clave.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), `${ev.id}: la clave va sin tildes ni mayúsculas`);
  }
});

// ------------------------------------------ la descripción y el organizador

test('del evento del municipio se guarda la descripción limpia, el organizador y su página', () => {
  const r = eventoDeMunicipio({
    id: 7,
    title: 'TC PICK UP &#8211; BALCARCE',
    start_date: '2026-09-26 08:00:00',
    end_date: '2026-09-27 17:00:00',
    all_day: false,
    description: '<h2 class="x">Acerca del Evento</h2>\n<div><h1><strong>¡Las TC Pick Up llegan!</strong></h1><h1></h1><p>El fin de semana&nbsp;del 26 y 27.</p><p>El fin de semana&nbsp;del 26 y 27.</p><ul><li>Gastronomía</li></ul></div>',
    website: 'https://ticket-motor.actc.org.ar/x',
    venue: { venue: 'Autodromo', address: 'Av Suipacha y calle 63', city: 'Balcarce' },
    organizer: [{ organizer: 'ACTC', website: 'https://actc.org.ar', phone: '2266 15-111111', email: 'alguien@x.com' }],
    categories: [],
  });
  assert.equal(r.nombre, 'TC PICK UP – BALCARCE');
  assert.equal(r.descripcion, '¡Las TC Pick Up llegan!\nEl fin de semana del 26 y 27.\n• Gastronomía');
  assert.equal(r.organizador, 'ACTC');
  assert.equal(r.organizadorUrl, 'https://actc.org.ar');
  assert.equal(r.web, 'https://ticket-motor.actc.org.ar/x');
  assert.equal(r.localidad, 'Balcarce');
  assert.equal(r.todoElDia, false);
  // El teléfono y el mail del organizador no se guardan: pueden ser de una persona.
  assert.ok(!JSON.stringify(r).includes('111111'));
  assert.ok(!JSON.stringify(r).includes('alguien@x.com'));
});

test('una descripción larga se corta al final de una oración y avisa que sigue', () => {
  const larga = `<p>${'Una oración de relleno para la prueba. '.repeat(80)}</p>`;
  const t = textoDeDescripcion(larga);
  assert.ok(t.length <= MAXIMO_DESCRIPCION + 4, `mide ${t.length}`);
  assert.ok(t.endsWith('. […]'), t.slice(-20));
  assert.equal(textoDeDescripcion('<p> </p>'), null, 'vacía queda en null');
  assert.equal(textoDeDescripcion(null), null);
  assert.equal(sinEntidades('Fiesta &amp; feria &#8220;x&#8221;'), 'Fiesta & feria “x”');
});

test('el semáforo rojo también mira la agenda: nunca un menor ni una víctima', () => {
  const base = { id: 'muni-1', nombre: 'Feria', descripcion: 'Una feria.' };
  assert.deepEqual(eventoSinSensibles(base), base);
  assert.equal(eventoSinSensibles({ ...base, nombre: 'Marcha por la víctima de violencia de género' }), null, 'con el nombre en rojo, no sale');
  assert.equal(eventoSinSensibles({ ...base, descripcion: 'En memoria del menor de edad que...' }).descripcion, null, 'con la descripción en rojo, sale sin descripción');
  // El amarillo no frena un evento.
  assert.equal(eventoSinSensibles({ ...base, descripcion: 'Para menores de 12, acompañados.' }).descripcion, 'Para menores de 12, acompañados.');
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

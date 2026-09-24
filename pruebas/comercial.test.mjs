// La base comercial: fichas, fusión sin pisar lo cargado a mano, y vigencia.
// Sin red.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rubroDe, normalizarTelefono, direccionDeRed, desdeOSM, completitud, clave, slug,
} from '../comercial/esquema.mjs';
import { evaluarVigencia, accionSugerida } from '../comercial/vigencia.mjs';
import { fusionar, cargarAMano, resumen } from '../comercial/base.mjs';
import { nombrado, mencionesEnNotas } from '../comercial/verificar.mjs';

const AHORA = new Date('2026-09-24T12:00:00Z');
const osm = (tags, extra = {}) => ({ type: 'node', id: 1, lat: -37.84, lon: -58.25, timestamp: '2026-01-10T00:00:00Z', tags, ...extra });
const vacia = () => ({ comercios: [] });

// ------------------------------------------------------------- rubros

test('el rubro sale de la etiqueta del mapa', () => {
  assert.equal(rubroDe({ shop: 'bakery' }).rubro, 'Alimentos y almacenes');
  assert.equal(rubroDe({ amenity: 'restaurant' }).rubro, 'Gastronomía');
  assert.equal(rubroDe({ amenity: 'pharmacy' }).rubro, 'Salud y farmacias');
  assert.equal(rubroDe({ office: 'lawyer' }).rubro, 'Servicios profesionales');
  assert.equal(rubroDe({ tourism: 'hotel' }).rubro, 'Turismo y alojamiento');
});

test('lo que no se reconoce va a "Otros", no se pierde', () => {
  assert.equal(rubroDe({ shop: 'algo-raro' }).rubro, 'Otros');
  assert.equal(rubroDe({}).rubro, 'Otros');
});

// ---------------------------------------------------------- teléfonos

test('los teléfonos quedan en un solo formato', () => {
  assert.equal(normalizarTelefono('+54 2266 42-1234'), '+54 2266 42-1234');
  assert.equal(normalizarTelefono('02266 421234'), '+54 2266 42-1234');
  assert.equal(normalizarTelefono('(02266) 42-1234'), '+54 2266 42-1234');
  assert.equal(normalizarTelefono('2266 421234'), '+54 2266 42-1234');
});

test('sin característica se asume que es de Balcarce', () => {
  assert.equal(normalizarTelefono('421234'), '+54 2266 42-1234');
});

test('el 9 y el 15 de los celulares no rompen el número', () => {
  assert.equal(normalizarTelefono('+54 9 2266 421234'), '+54 2266 42-1234');
  assert.equal(normalizarTelefono('2266 15 421234'), '+54 2266 42-1234');
});

test('si hay varios números, se queda con el primero', () => {
  assert.equal(normalizarTelefono('02266 421234; 02266 431111'), '+54 2266 42-1234');
});

test('lo que no parece un teléfono es null', () => {
  assert.equal(normalizarTelefono('llamar al dueño'), null);
  assert.equal(normalizarTelefono('123'), null);
  assert.equal(normalizarTelefono(null), null);
});

// -------------------------------------------------------------- redes

test('un usuario de Instagram se vuelve una dirección', () => {
  assert.equal(direccionDeRed('instagram', '@panaderia.ejemplo'), 'https://www.instagram.com/panaderia.ejemplo');
  assert.equal(direccionDeRed('facebook', 'https://www.facebook.com/ejemplo/?ref=x'), 'https://www.facebook.com/ejemplo');
  assert.equal(direccionDeRed('instagram', ''), null);
});

// --------------------------------------------------------- desde OSM

test('un lugar del mapa se vuelve una ficha completa', () => {
  const f = desdeOSM(osm({ name: 'Panadería La Espiga', shop: 'bakery', 'addr:street': 'Calle 17', 'addr:housenumber': '432', phone: '02266 421234', website: 'laespiga.com.ar', opening_hours: 'Mo-Sa 08:00-20:00' }), AHORA);
  assert.equal(f.id, 'osm-n1');
  assert.equal(f.rubro, 'Alimentos y almacenes');
  assert.equal(f.direccion.texto, 'Calle 17 432');
  assert.equal(f.contacto.telefono, '+54 2266 42-1234');
  assert.equal(f.contacto.web, 'https://laespiga.com.ar');
  assert.deepEqual(f.ubicacion, { lat: -37.84, lon: -58.25 });
  assert.equal(f.fuentes[0].url, 'https://www.openstreetmap.org/node/1');
});

test('un lugar sin nombre no entra a la guía', () => {
  assert.equal(desdeOSM(osm({ shop: 'bakery' }), AHORA), null);
});

test('un lugar marcado como cerrado en el mapa entra como cerrado', () => {
  const f = desdeOSM(osm({ name: 'Viejo Bar', amenity: 'bar', 'disused:amenity': 'bar' }), AHORA);
  assert.equal(f.vigencia.estado, 'cerrado');
});

test('no se guarda nada de personas: sólo datos del negocio', () => {
  const f = desdeOSM(osm({ name: 'Estudio X', office: 'lawyer', operator: 'Juan Pérez', 'contact:email': 'estudio@x.com' }), AHORA);
  assert.ok(!JSON.stringify(f).includes('Juan Pérez'), 'guardó el nombre de una persona');
});

// ------------------------------------------------------------- fusión

test('una ficha nueva se agrega', () => {
  const base = vacia();
  assert.equal(fusionar(base, desdeOSM(osm({ name: 'A', shop: 'bakery' }), AHORA)), 'nueva');
  assert.equal(base.comercios.length, 1);
});

test('la misma ficha dos veces no se duplica', () => {
  const base = vacia();
  fusionar(base, desdeOSM(osm({ name: 'A', shop: 'bakery' }), AHORA));
  assert.equal(fusionar(base, desdeOSM(osm({ name: 'A', shop: 'bakery' }), AHORA)), 'igual');
  assert.equal(base.comercios.length, 1);
});

test('el mapa completa lo que falta y actualiza lo suyo', () => {
  const base = vacia();
  fusionar(base, desdeOSM(osm({ name: 'A', shop: 'bakery' }), AHORA));
  const r = fusionar(base, desdeOSM(osm({ name: 'A', shop: 'bakery', phone: '02266 421234' }, { timestamp: '2026-09-01T00:00:00Z' }), AHORA));
  assert.equal(r, 'actualizada');
  assert.equal(base.comercios[0].contacto.telefono, '+54 2266 42-1234');
});

test('lo cargado a mano NO se pisa con lo que trae el mapa', () => {
  const base = vacia();
  fusionar(base, desdeOSM(osm({ name: 'A', shop: 'bakery', phone: '02266 421234' }), AHORA));
  cargarAMano(base.comercios[0], 'contacto.telefono', '+54 2266 43-9999', AHORA);
  fusionar(base, desdeOSM(osm({ name: 'A', shop: 'bakery', phone: '02266 421234' }, { timestamp: '2026-09-01T00:00:00Z' }), AHORA));
  assert.equal(base.comercios[0].contacto.telefono, '+54 2266 43-9999');
});

test('el mismo lugar que viene de otra fuente se reconoce por nombre y dirección', () => {
  const base = vacia();
  fusionar(base, desdeOSM(osm({ name: 'Farmacia Marioli', amenity: 'pharmacy', 'addr:street': 'Calle 17', 'addr:housenumber': '100' }), AHORA));
  const otra = desdeOSM(osm({ name: 'FARMACIA MARIOLI', amenity: 'pharmacy', 'addr:street': 'calle 17', 'addr:housenumber': '100' }, { id: 999 }), AHORA);
  assert.notEqual(fusionar(base, otra), 'nueva');
  assert.equal(base.comercios.length, 1);
});

// ------------------------------------------------------------ vigencia

const ficha = (extra = {}) => ({
  horarios: null, contacto: { telefono: '+54 2266 42-1234' }, redes: {}, comercial: {},
  fuentes: [{ tipo: 'osm', editadoEnOSM: '2026-03-01T00:00:00Z' }], ...extra,
});

test('sin ninguna señal buena, un comercio queda "a confirmar", no "cerrado"', () => {
  const v = evaluarVigencia(ficha({ fuentes: [{ tipo: 'osm', editadoEnOSM: '2019-01-01T00:00:00Z' }], contacto: {} }), {}, AHORA);
  assert.equal(v.estado, 'a-confirmar');
});

test('varias señales juntas lo dan por activo', () => {
  const v = evaluarVigencia(ficha({ horarios: 'Mo-Fr 9-18' }), { web: { ok: true }, mencionesEnNotas: 2, enOtraFuente: true }, AHORA);
  assert.equal(v.estado, 'activo');
  assert.ok(v.puntaje >= 60);
  assert.ok(v.senales.length >= 4, 'no explica por qué');
});

test('un sitio web caído baja el puntaje pero no lo da por cerrado', () => {
  const con = evaluarVigencia(ficha(), { web: { ok: true } }, AHORA).puntaje;
  const sin = evaluarVigencia(ficha(), { web: { ok: false, estado: 404 } }, AHORA);
  assert.ok(sin.puntaje < con);
  assert.notEqual(sin.estado, 'cerrado');
});

test('que el propio comercio lo confirme pesa mucho, y se vence al año', () => {
  const reciente = evaluarVigencia(ficha({ comercial: { confirmadoPorElComercio: true, confirmadoEl: '2026-08-01T00:00:00Z' } }), {}, AHORA).puntaje;
  const viejo = evaluarVigencia(ficha({ comercial: { confirmadoPorElComercio: true, confirmadoEl: '2024-01-01T00:00:00Z' } }), {}, AHORA).puntaje;
  assert.ok(reciente > viejo);
});

test('lo que alguien marcó como cerrado, está cerrado', () => {
  const v = evaluarVigencia(ficha({ comercial: { cerradoConfirmado: true } }), { web: { ok: true }, mencionesEnNotas: 5 }, AHORA);
  assert.equal(v.estado, 'cerrado');
  assert.equal(v.puntaje, 0);
});

test('el puntaje nunca sale del 0 al 100', () => {
  const alto = evaluarVigencia(ficha({ horarios: 'x', comercial: { confirmadoPorElComercio: true, confirmadoEl: '2026-09-01T00:00:00Z' } }), { web: { ok: true }, mencionesEnNotas: 9, enOtraFuente: true }, AHORA);
  assert.ok(alto.puntaje <= 100);
});

test('la acción sugerida depende de cómo se lo puede contactar', () => {
  assert.match(accionSugerida({ contacto: { telefono: '1' }, vigencia: { estado: 'dudoso' } }), /WhatsApp|llamar/);
  assert.match(accionSugerida({ contacto: {}, redes: { instagram: 'x' }, vigencia: { estado: 'dudoso' } }), /red social/);
  assert.match(accionSugerida({ contacto: {}, redes: {}, direccion: { texto: 'Calle 1' }, vigencia: { estado: 'dudoso' } }), /dirección/);
  assert.match(accionSugerida({ vigencia: { estado: 'cerrado' } }), /sacar/);
  assert.equal(accionSugerida({ comercial: { confirmadoPorElComercio: true }, vigencia: { estado: 'activo' } }), 'ninguna');
});

// ---------------------------------------------- cruzar con las notas

test('un nombre propio en una nota cuenta como mención', () => {
  assert.equal(nombrado('Frigorífico Cabaña Los Pinos', clave('El remate de Frigorífico Cabaña Los Pinos fue un éxito')), true);
});

test('un nombre genérico solo no prueba nada', () => {
  assert.equal(nombrado('Farmacia', clave('Cortaron el agua y la farmacia cerró')), false);
  assert.equal(nombrado('Bar', clave('un bar del centro')), false);
});

test('no confunde una palabra con parte de otra', () => {
  assert.equal(nombrado('Marioli', clave('El primer ministro Mariolino habló')), false);
});

test('las menciones sólo cuentan notas recientes', () => {
  const comercios = [{ id: 'a', nombre: 'Panadería La Espiga' }];
  const notas = [
    { titulo: 'La Panadería La Espiga cumple 40 años', fecha: '2026-09-10T00:00:00Z' },
    { titulo: 'La Panadería La Espiga abre otro local', fecha: '2025-01-01T00:00:00Z' },
  ];
  assert.equal(mencionesEnNotas(comercios, notas, AHORA).a, 1);
});

// -------------------------------------------------------- utilidades

test('la completitud sube a medida que se cargan datos', () => {
  const pobre = completitud({ nombre: 'A', rubro: 'Otros' });
  const rica = completitud({
    nombre: 'A', rubro: 'Gastronomía', direccion: { texto: 'x' }, ubicacion: {}, contacto: { telefono: '1' }, horarios: 'x', redes: { instagram: 'x' },
  });
  assert.ok(pobre < 30);
  assert.equal(rica, 100);
});

test('slug y clave no dependen de tildes ni mayúsculas', () => {
  assert.equal(clave('Panadería  "La Espiga"'), 'panaderia la espiga');
  assert.equal(slug('Ñandú & Hijos'), 'nandu-hijos');
});

test('el resumen cuenta cuántas fichas tienen cada dato', () => {
  const base = { comercios: [
    { rubro: 'A', contacto: { telefono: '1' }, direccion: { texto: 'x' }, ubicacion: {}, vigencia: { estado: 'activo' }, comercial: { confirmadoPorElComercio: true } },
    { rubro: 'A', contacto: {}, vigencia: { estado: 'dudoso' }, comercial: {} },
  ] };
  const r = resumen(base);
  assert.equal(r.total, 2);
  assert.equal(r.conTelefono, 1);
  assert.equal(r.confirmados, 1);
  assert.deepEqual(r.porEstado, { activo: 1, dudoso: 1 });
});

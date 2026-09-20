// La farmacia de turno.
//
// Es el dato más importante que publicamos: es el único que alguien busca a
// las tres de la mañana, y el único donde equivocarse manda a una persona a
// una puerta cerrada. También es el que más veces se rompió sin que nadie se
// diera cuenta, porque sale de leer el HTML de colbalcarce.com con
// expresiones regulares y el Colegio cambia el formato cuando quiere.
//
// Cada prueba de acá abajo es un error que pasó de verdad.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsearCronograma } from '../ingesta/ingesta.mjs';

// Una copia reducida de lo que publica el Colegio: el encabezado del mes,
// los turnos, y —esto es lo importante— el encabezado del mes siguiente
// pegado atrás sin ningún separador.
const CRONOGRAMA = `
  Farmacias de turno SEPTIEMBRE 2026
  VIERNES 18 SAN ANTONIO
  SABADO 19 SAN JOSE - VUOTTO
  DOMINGO 20 DEL CERRO - SAN JOSE PLAZA
  LUNES 21 GALINDO
  MARTES 29 BENITES
  MIERCOLES 30 MARIOLI
  OCTUBRE 2026
  JUEVES 1 GALINDO - NORTE
  VIERNES 2 MEDRANO
  Recordamos que el turno termina a las 9
`;

test('lee los turnos del cronograma', () => {
  const { mes, anio, turnos } = parsearCronograma(CRONOGRAMA);
  assert.equal(mes, 9);
  assert.equal(anio, 2026);
  assert.equal(turnos.length, 8);
  assert.deepEqual(turnos[0].farmacias, ['SAN ANTONIO']);
});

test('un día con dos farmacias de turno son dos, no una', () => {
  // Pasó el 20/09/2026: la tarjeta mostraba "DEL CERRO y SAN JOSE PLAZA"
  // como si fuera el nombre de una sola farmacia, con una sola dirección.
  const { turnos } = parsearCronograma(CRONOGRAMA);
  const domingo = turnos.find((t) => t.dia === 20);
  assert.deepEqual(domingo.farmacias, ['DEL CERRO', 'SAN JOSE PLAZA']);
  assert.equal(domingo.detalle.length, 2);
});

test('el encabezado del mes siguiente no se pega al nombre', () => {
  // Pasó: el turno del 30 de septiembre se leía "MARIOLI OCTUBRE 2026",
  // y además aparecía en el panel como una farmacia sin dirección.
  const { turnos } = parsearCronograma(CRONOGRAMA);
  const treinta = turnos.find((t) => t.dia === 30);
  assert.deepEqual(treinta.farmacias, ['MARIOLI']);
});

test('los días que vuelven para atrás son del mes siguiente', () => {
  // …29, 30, 1, 2: el 1 no es el 1 de septiembre, es el 1 de octubre. Sin
  // esto, el 30 de septiembre "lo que sigue" quedaba fechado para atrás y
  // la página de farmacias mostraba turnos vencidos.
  const { turnos } = parsearCronograma(CRONOGRAMA);
  assert.equal(turnos.find((t) => t.dia === 30).fecha, '2026-09-30');
  assert.equal(turnos.find((t) => t.dia === 1).fecha, '2026-10-01');
  assert.equal(turnos.find((t) => t.dia === 2).fecha, '2026-10-02');
});

test('diciembre rueda a enero del año que viene', () => {
  const { turnos } = parsearCronograma(`
    DICIEMBRE 2026
    MARTES 30 BENITES
    JUEVES 1 GALINDO
  `);
  assert.equal(turnos.find((t) => t.dia === 30).fecha, '2026-12-30');
  assert.equal(turnos.find((t) => t.dia === 1).fecha, '2027-01-01');
});

test('la dirección sale del directorio del Colegio', () => {
  const directorio = {
    'del cerro': { nombre: 'Del Cerro', direccion: 'Calle 28 N° 920', telefono: '42-1611' },
  };
  const { turnos } = parsearCronograma(CRONOGRAMA, directorio);
  const [primera] = turnos.find((t) => t.dia === 20).detalle;
  assert.equal(primera.direccion, 'Calle 28 N° 920');
});

test('si no está en el directorio, se usa la lista cargada a mano', () => {
  // San José de la Plaza está de turno pero no figura en el directorio del
  // Colegio. Sin esto, la tarjeta mostraba el nombre sin dirección: el dato
  // que la persona necesita justamente a esa hora.
  const { turnos } = parsearCronograma(CRONOGRAMA);
  const segunda = turnos.find((t) => t.dia === 20).detalle[1];
  assert.equal(segunda.nombre, 'San José de la Plaza');
  assert.equal(segunda.direccion, 'Av. Chaves esquina 15');
});

test('una farmacia desconocida queda sin dirección, no con una inventada', () => {
  const { turnos } = parsearCronograma(CRONOGRAMA);
  const [sola] = turnos.find((t) => t.dia === 21).detalle;
  assert.equal(sola.nombre, 'GALINDO');
  assert.equal(sola.direccion, null);
});

test('un cronograma que no se entiende devuelve vacío en vez de romper', () => {
  // Si el Colegio cambia la página entera, es preferible publicar sin
  // farmacia a publicar cualquier cosa.
  const { turnos } = parsearCronograma('<p>La página está en mantenimiento</p>');
  assert.deepEqual(turnos, []);
});

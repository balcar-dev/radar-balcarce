// La dirección de cada nota: el titular adentro y el identificador al final.
//
// Lo que importa acá es que la dirección sea entendible Y que siga
// funcionando cuando el titular cambia. Por eso el identificador va al final
// y es lo único que cuenta.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugDe, parteDeNota, rutaDeNota, idDeRuta } from '../web/lib/ruta.js';

test('el titular se vuelve una dirección legible', () => {
  assert.equal(slugDe('Nuevo mural de Fangio en el autódromo local'), 'nuevo-mural-de-fangio-en-el-autodromo-local');
});

test('sin tildes, sin eñes raras y sin signos', () => {
  assert.equal(slugDe('¿Qué hará el Concejo? "Sesión" clave: 3 puntos'), 'que-hara-el-concejo-sesion-clave-3-puntos');
  assert.equal(slugDe('Napaleofú: fiesta del año'), 'napaleofu-fiesta-del-ano');
});

test('la ñ pierde la tilde pero no se rompe', () => {
  assert.equal(slugDe('El niño y la señal'), 'el-nino-y-la-senal');
});

test('un titular larguísimo se corta en una palabra entera', () => {
  const largo = 'El Concejo Deliberante aprobó por unanimidad el presupuesto municipal para el año próximo con modificaciones';
  const s = slugDe(largo);
  assert.ok(s.length <= 70, s.length + ': ' + s);
  assert.ok(!s.endsWith('-'), 'termina en guion: ' + s);
  // Cada tramo del slug tiene que ser una palabra completa del titular.
  const palabras = largo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/);
  for (const parte of s.split('-')) assert.ok(palabras.includes(parte), `"${parte}" está cortada`);
});

test('un titular vacío no deja una dirección vacía', () => {
  assert.equal(slugDe(''), 'nota');
  assert.equal(slugDe('¿¡!?'), 'nota');
  assert.equal(slugDe(undefined), 'nota');
});

test('el identificador va al final', () => {
  const n = { id: '1tftag2', titulo: 'Nuevo mural de Fangio' };
  assert.equal(parteDeNota(n), 'nuevo-mural-de-fangio-1tftag2');
  assert.equal(rutaDeNota(n), '/nota/nuevo-mural-de-fangio-1tftag2');
});

test('ida y vuelta: de la dirección se recupera el identificador', () => {
  for (const titulo of ['Nuevo mural de Fangio', '¿Qué pasa con el TC?', '', 'A-B-C - D']) {
    const n = { id: 'zx81q0p', titulo };
    assert.equal(idDeRuta(parteDeNota(n)), n.id, titulo);
  }
});

test('la dirección vieja, con el id a secas, también se resuelve', () => {
  // /nota/1tftag2 puede estar compartida en un grupo de WhatsApp.
  assert.equal(idDeRuta('1tftag2'), '1tftag2');
});

test('si se corrige el titular, la dirección vieja sigue llegando a la misma nota', () => {
  // Es la razón de que el identificador sea lo único que cuenta: el titular
  // se puede editar desde el panel y nadie tiene que romper un enlace.
  const antes = parteDeNota({ id: 'abc123', titulo: 'Titular con una errata' });
  const despues = parteDeNota({ id: 'abc123', titulo: 'Titular corregido' });
  assert.notEqual(antes, despues);
  assert.equal(idDeRuta(antes), idDeRuta(despues));
});

test('dos notas con el mismo titular no chocan', () => {
  const a = parteDeNota({ id: 'aaa111', titulo: 'Ferroviarios ganó' });
  const b = parteDeNota({ id: 'bbb222', titulo: 'Ferroviarios ganó' });
  assert.notEqual(a, b);
});

test('el identificador de una nota nunca lleva guiones', async () => {
  // Si los llevara, idDeRuta cortaría por el lugar equivocado y ninguna
  // página se encontraría. Se prueba con el generador real de identificadores.
  const { paraPruebas } = await import('../ingesta/ingesta.mjs');
  for (const enlace of ['https://a.com/x-y-z', 'https://b.com/nota-con-guiones-123', 'https://c.com/']) {
    assert.ok(!paraPruebas.idDe(enlace).includes('-'), enlace);
  }
});

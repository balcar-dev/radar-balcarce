// La quiniela y la lotería no se analizan (2/10/2026, Hernán): ni de un medio de afuera ni de uno de acá, salvo que la nota nombre
// algo de Balcarce (un balcarceño que gana un pozo grande sí es noticia).

import test from 'node:test';
import assert from 'node:assert/strict';
import { TITULO_LOTERIA } from '../ingesta/fuentes.mjs';
import { paraPruebas } from '../ingesta/ingesta.mjs';

const { motivoDeDescarte, normalizar } = paraPruebas;
const nota = (titulo, cuerpo = 'El resultado del sorteo de hoy.') => ({ titulo, cuerpo, enlace: 'https://www.infobae.com/sociedad/2026/10/02/algo-de-la-nota/', fecha: new Date() });
const NACIONAL = { alcance: 'nacional', seccion: 'Argentina' };
const LOCAL = { alcance: 'local', seccion: 'Balcarce' };

test('los títulos de quiniela y lotería se reconocen', () => {
  for (const t of [
    'Quiniela: resultados de hoy', 'Resultados de la Quiniela Nacional y Provincial', 'Lotería de la Provincia: ganadores del sorteo', 'Resultados del Loto de hoy',
    'Quini 6: números ganadores del sorteo', 'El Brinco: resultado del domingo', 'Telekino: resultados', 'Resultados del sorteo de la Tómbola',
    'Pozo millonario del Quini 6: quién ganó', 'Telebingo: los números ganadores',
  ]) assert.ok(TITULO_LOTERIA.test(normalizar(t)), t);
});

test('no se confunde con otras notas', () => {
  for (const t of [
    'El Gobierno anunció un plan de seguridad', 'Un loteo nuevo en Balcarce', 'Descubren un pozo de agua en la ruta 226',
    'El tren de la bolsa tuvo un día movido', 'Se inauguró el Hospital Felipe Fossati renovado',
  ]) assert.ok(!TITULO_LOTERIA.test(normalizar(t)), t);
});

test('una nota de lotería de afuera o de un medio de acá no entra; si nombra Balcarce, sí', () => {
  assert.match(motivoDeDescarte(nota('Quiniela: resultados de hoy'), NACIONAL), /lotería o quiniela/);
  assert.match(motivoDeDescarte(nota('Quiniela de la Provincia: resultados'), LOCAL), /lotería o quiniela/, 'ni de un medio de acá');
  assert.equal(motivoDeDescarte(nota('Un vecino de Balcarce ganó el pozo del Quini 6'), NACIONAL), null);
  assert.equal(motivoDeDescarte(nota('Quini 6: hubo un ganador', 'El ganador es de Balcarce y cobrará 800 millones.'), NACIONAL), null);
});

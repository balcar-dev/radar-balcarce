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

test('por el camino real de la ingesta: la quiniela de un medio de Balcarce no entra; si nombra a Balcarce, sí (regla 175)', async () => {
  // Hasta el 15/10 la ingesta llamaba a motivoDeDescarte sólo para los medios de afuera: la prueba de arriba pasaba (llama a la
  // función directo) y la quiniela de una radio de acá entraba igual.
  const { ingestar } = await import('../ingesta/ingesta.mjs');
  const fuentes = [{ id: 'loc1', nombre: 'Radio de Acá', medio: 'Radio de Acá', url: 'https://loc1.test/rss', tipo: 'rss', alcance: 'local', peso: 28 }];
  const item = (titulo, enlace, descripcion = `${titulo}. Más detalles de la nota.`) => `<item><title>${titulo}</title><link>${enlace}</link><pubDate>${new Date(Date.now() - 3600e3).toUTCString()}</pubDate><description>${descripcion}</description></item>`;
  const xml = `<rss><channel>${[
    item('Quiniela de la Provincia: resultados de hoy', 'https://loc1.test/quiniela-hoy', 'Los números ganadores de la Quiniela de la Provincia de hoy.'),
    item('Un vecino de Balcarce ganó el pozo del Quini 6', 'https://loc1.test/ganador-quini'),
    item('El Concejo Deliberante aprueba el presupuesto participativo de Balcarce', 'https://loc1.test/concejo'),
  ].join('')}</channel></rss>`;
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const cuerpo = url === 'https://loc1.test/rss' ? xml : '<rss><channel></channel></rss>';
    return { ok: true, status: 200, headers: new Map(), text: async () => cuerpo, arrayBuffer: async () => new TextEncoder().encode(cuerpo).buffer };
  };
  try {
    const r = await ingestar({ fuentes, silencioso: true, memoria: null });
    const titulos = r.notas.map((n) => n.titulo).join(' | ');
    assert.ok(!/Quiniela de la Provincia/.test(titulos), titulos);
    assert.ok(/Quini 6/.test(titulos), 'un balcarceño que gana sí es noticia');
    assert.ok(/Concejo/.test(titulos), 'lo demás de un medio de acá entra todo, como siempre');
  } finally {
    globalThis.fetch = original;
  }
});

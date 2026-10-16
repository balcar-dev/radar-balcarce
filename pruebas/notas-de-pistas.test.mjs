// Notas de pistas pedidas para los repasos de las redes (16/10/2026).
import test from 'node:test';
import assert from 'node:assert/strict';

// 16/10/2026: una persona puede pedir que una nota de pista entre al PRÓXIMO repaso de las redes (caso: la gacetilla del Festival Cervantino de Azul).
import { elegirParaPodcast, sePuedeEnUnRepaso } from '../redes/elegir.mjs';
import { notasDePistas as notasDePistasRepaso } from '../web/lib/notas-de-pistas.js';

const entradaRepaso = (extra = {}) => ({
  notas: {
    pistaazul: {
      titulo: 'Titular de una nota de pista', copete: 'Una bajada que resume la nota de pista armada por la redacción para las pruebas.',
      cuerpo: Array.from({ length: 90 }, (_, i) => `palabra${i}`).join(' '), seccion: 'Cultura y agenda',
      fuentes: [{ medio: 'Prensa X', enlace: 'https://ejemplo.com/p', fecha: null }],
      motivo: 'gacetilla', cuando: '2026-10-16T12:52:00.000Z', por: 'Hernán Accomo', ...extra,
    },
  },
});
const ahoraRepaso = new Date('2026-10-16T15:00:00.000Z');

test('una nota de pista aprobada para las redes y pedida para el repaso entra primero a los repasos, aunque no le alcance el puntaje', () => {
  const [pista] = notasDePistasRepaso(entradaRepaso({ aprobadaParaRedes: true, paraElRepaso: true }), { ahora: ahoraRepaso });
  assert.equal(pista.aprobadaParaRedes, true);
  assert.equal(pista.paraElRepaso, true);
  assert.equal(sePuedeEnUnRepaso(pista), true);
  const titulos = ['Ferroviarios ganó el clásico apertura', 'Cortan el agua barrio norte cooperativa', 'Suben las naftas desde medianoche', 'Concejales aprobaron presupuesto municipal', 'Cosecha de trigo retrasada humedad'];
  const otras = titulos.map((titulo, i) => ({ id: `o${i}`, titulo, seccion: ['Deportes', 'Balcarce', 'Economía', 'Política', 'Agro'][i], relevancia: 99 - i, local: true, semaforo: 'verde', temas: [], medios: ['Un medio'] }));
  const elegidas = elegirParaPodcast([...otras, { ...pista, relevancia: 10 }], { cuantas: 4 });
  assert.equal(elegidas.length, 4);
  assert.equal(elegidas[0].id, pista.id, 'la pedida va primera');
});

test('sin el pedido o sin la aprobación para las redes, una nota de pista sigue afuera de los repasos', () => {
  const [sola] = notasDePistasRepaso(entradaRepaso(), { ahora: ahoraRepaso });
  assert.equal(sePuedeEnUnRepaso(sola), false);
  const [soloAprobada] = notasDePistasRepaso(entradaRepaso({ aprobadaParaRedes: true }), { ahora: ahoraRepaso });
  assert.equal(soloAprobada.paraElRepaso, undefined);
  assert.equal(sePuedeEnUnRepaso(soloAprobada), true, 'aprobada para las redes puede competir por puntaje');
});

test('el pedido para el repaso vence a las 12 horas, y las otras notas propias (dólar, clima, efeméride) nunca entran a un repaso', () => {
  const [vieja] = notasDePistasRepaso(entradaRepaso({ aprobadaParaRedes: true, paraElRepaso: true }), { ahora: new Date('2026-10-17T01:00:00.000Z') });
  assert.equal(vieja.paraElRepaso, undefined);
  for (const propia of ['dolar', 'clima', 'efemeride', 'repaso']) assert.equal(sePuedeEnUnRepaso({ id: 'x', propia, seccion: 'Economía', como: 'automatica', aprobadaParaRedes: true, semaforo: 'verde' }), false, propia);
});

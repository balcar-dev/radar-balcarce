// El robo a Frutimar (4/10/2026): la nota de otro medio quedó esperando aprobación al lado de la ya publicada, y aprobarla las duplicaba.
import test from 'node:test';
import assert from 'node:assert/strict';
import { candidatasParaAgrupar, quitarRepetidas } from '../ingesta/lectura-ia.mjs';

const nota = (id, semaforo, extra = {}) => ({ id, titulo: id, semaforo, medios: [id], ...extra });

test('se miran juntas las verdes y las que esperan a una persona; no las rojas ni las de afuera con pocos medios', () => {
  const l = [nota('a', 'verde'), nota('b', 'amarillo', { motivo: 'denuncia' }), nota('c', 'rojo'), nota('d', 'amarillo', { motivo: 'de afuera y poco contada (1 medio; Argentina pide 3)' })];
  assert.deepEqual(candidatasParaAgrupar(l).map((n) => n.id), ['a', 'b']);
});

test('si la que espera cuenta lo mismo que la publicada, desaparece de la espera y la publicada suma el medio', () => {
  const publicada = nota('pub', 'verde');
  const espera = nota('esp', 'amarillo');
  const r = quitarRepetidas([publicada, espera], [['pub', 'esp']], { publicadas: new Set(['pub']) });
  assert.deepEqual(r.notas.map((n) => n.id), ['pub']);
  assert.deepEqual(r.notas[0].medios.sort(), ['esp', 'pub']);
  assert.equal(r.repetidas[0].id, 'esp');
});

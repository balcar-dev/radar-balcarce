// La auditoría semanal de las fuentes (ingesta/auditar-fuentes.mjs, 16/10/2026): sin red, con lo ya publicado,
// marca lo que no aporta, lo de Balcarce que se durmió y lo redundante por dueño.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditarFuentes, simularLista, voces, informeEnTexto, leerPublicadas } from '../ingesta/auditar-fuentes.mjs';

const registro = [
  { id: 'a', medio: 'Radio de Acá', alcance: 'local' },
  { id: 'b', medio: 'Dormida de Acá', alcance: 'local' },
  { id: 'c', medio: 'Clarín', grupo: 'Grupo Clarín', alcance: 'pais' },
  { id: 'd', medio: 'TN', grupo: 'Grupo Clarín', alcance: 'pais' },
  { id: 'e', medio: 'Infobae', alcance: 'pais' },
  { id: 'f', medio: 'La Nación', alcance: 'pais' },
  { id: 'g', medio: 'Sin Nada', alcance: 'pais' },
  { id: 'h', medio: 'Apagado', alcance: 'pais', activa: false },
];
const ahora = new Date('2026-10-15T12:00:00Z');
const hace = (h) => new Date(ahora.getTime() - h * 3600000).toISOString();
const notas = [
  { id: '1', cuando: hace(2), seccion: 'Balcarce', local: true, medios: ['Radio de Acá'] },
  { id: '2', cuando: hace(5), seccion: 'Política', local: false, medios: ['Clarín', 'TN', 'Infobae', 'La Nación'] },
  { id: '3', cuando: hace(8), seccion: 'Tecnología', local: false, medios: ['Infobae', 'La Nación'] },
  { id: '4', cuando: hace(9), seccion: 'Política', local: false, medios: ['TN', 'Clarín', 'Infobae'] },
  { id: '5', cuando: hace(24 * 6), seccion: 'Balcarce', local: true, medios: ['Dormida de Acá'] },
  { id: '6', cuando: hace(24 * 20), seccion: 'Política', local: false, medios: ['Sin Nada', 'Infobae', 'La Nación'] },
];

test('los del mismo dueño son una sola voz', () => {
  assert.equal(voces(['Clarín', 'TN', 'Infobae'], (m) => (m === 'Clarín' || m === 'TN' ? 'Grupo Clarín' : null)), 2);
});

test('la auditoría cuenta y marca: sin aporte, dormida, redundante; imprescindible con los grupos como una voz', () => {
  const a = auditarFuentes({ notas, registro, vistas: { 1: 10, 2: 4 }, ahora, dias: 7 });
  const f = Object.fromEntries(a.filas.map((x) => [x.medio, x]));
  assert.ok(!f.Apagado, 'lo apagado no se audita');
  assert.equal(a.notas, 5, 'la de hace 20 días queda fuera de la ventana');
  assert.equal(f['Radio de Acá'].publicadas, 1);
  assert.equal(f['Radio de Acá'].visitas, 10);
  assert.deepEqual(f['Radio de Acá'].marcas, []);
  assert.deepEqual(f['Dormida de Acá'].marcas, ['dormida'], 'de Balcarce y 6 días sin notas');
  assert.deepEqual(f['Sin Nada'].marcas, ['sin aporte']);
  // Nota 2 (Política, pide 3): voces Clarín-grupo, Infobae, La Nación = 3. Sin Infobae, 2: imprescindible.
  // Sin Clarín sigue TN (misma voz): no es imprescindible ninguno de los dos.
  // Y en la 3 (Tecnología, un área chica: pide 2) los dos son imprescindibles.
  assert.equal(f.Infobae.imprescindible, 2);
  assert.equal(f['La Nación'].imprescindible, 2);
  assert.equal(f.Clarín.imprescindible, 0);
  assert.ok(f.Clarín.marcas.includes('redundante'), 'todo lo de Clarín lo contó también TN');
  assert.ok(f.TN.marcas.includes('redundante'));
  assert.equal(f['Sin Nada'].ultima, notas[5].cuando, 'la última nota se busca en todo el historial');
  assert.match(informeEnTexto(a), /Para mirar: .*Sin Nada \(sin aporte\)/);
});

test('simularLista: cuántas notas de afuera llegan al mínimo con un conjunto de medios', () => {
  const grupoDe = (m) => (m === 'Clarín' || m === 'TN' ? 'Grupo Clarín' : null);
  const todos = new Set(['Clarín', 'TN', 'Infobae', 'La Nación', 'Sin Nada']);
  const r = simularLista(notas, todos, { grupoDe });
  assert.equal(r.total, 4, 'lo de acá no cuenta');
  assert.equal(r.llegan, 3, 'la 4 (Política) tiene dos voces: no llega a 3');
  assert.equal(simularLista(notas, new Set(['Clarín', 'TN', 'Infobae']), { grupoDe }).llegan, 0, 'Clarín y TN son una voz: con Infobae, dos; no alcanza para Política');
  assert.equal(simularLista(notas, new Set(['Infobae', 'La Nación']), { grupoDe }).llegan, 1, 'sólo la de Tecnología (pide 2)');
});

test('sin red: lee sólo los archivos del repositorio (y no falla si no hay)', () => {
  assert.deepEqual(leerPublicadas('C:/no-existe-esta-carpeta'), []);
});

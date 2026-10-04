// Pistas que salen solas con 3 o más medios (4/10/2026). Sin red.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pistasParaSalirSolas, sacarPistasSolas, POR_AUTOMATICA } from '../panel/pistas-solas.mjs';
import { notasDePistas, firmaDePista } from '../web/lib/notas-de-pistas.js';

const libro = () => ({ pistas: {
  p1: { estado: 'abierta', total: 3, afirmacion: 'Hallaron un perro' },
  p2: { estado: 'abierta', total: 2 },
  p3: { estado: 'archivada', total: 5 },
  p4: { estado: 'abierta', total: 4, resultado: { tipo: 'publicada' } },
  p5: { estado: 'abierta', total: 6 },
} });
const cuerpo = Array.from({ length: 90 }, (_, i) => `palabra${i}`).join(' ');
const bueno = async () => ({ ok: true, problemas: [], aviso: null, medios: 3, seccion: 'Argentina',
  texto: { titulo: 'Un título', copete: 'Una bajada', cuerpo },
  fuentes: [1, 2, 3].map((i) => ({ medio: `m${i}.com`, enlace: `https://m${i}.com/x`, fecha: null })) });

test('sólo salen las abiertas con 3 o más medios, sin nota ni cierre, y de a pocas', () => {
  assert.deepEqual(pistasParaSalirSolas(libro(), { notas: { p5: {} } }), ['p1']);
  assert.deepEqual(pistasParaSalirSolas(libro()), ['p1', 'p5']);
});

test('si el verificador no avisa nada, sale como nota propia automática y la pista se cierra con el enlace', async () => {
  const ahora = new Date('2026-10-04T12:00:00Z');
  const r = await sacarPistasSolas({ libro: libro(), notas: { notas: {} }, escribir: bueno, ahora });
  assert.deepEqual(r.salieron, ['p1', 'p5']);
  assert.equal(r.notas.notas.p1.por, POR_AUTOMATICA);
  assert.equal(r.libro.pistas.p1.estado, 'archivada');
  assert.equal(r.libro.pistas.p1.resultado.tipo, 'publicada');
  const [n] = notasDePistas(r.notas, { ahora });
  assert.match(n.firma, /controlada contra esas fuentes/);
  assert.doesNotMatch(n.firma, /revisada por la redacción/);
  assert.match(firmaDePista(['a'], {}), /revisada por la redacción/);
});

test('con avisos del verificador, pocos medios o cuerpo corto no sale: la pista sigue abierta', async () => {
  for (const malo of [
    async () => ({ ok: false, motivo: 'la IA no contestó', problemas: [] }),
    async () => ({ ...(await bueno()), problemas: ['un dato no cuadra'], ok: false }),
    async () => ({ ...(await bueno()), aviso: 'revisar' }),
    async () => ({ ...(await bueno()), medios: 2 }),
    async () => ({ ...(await bueno()), texto: { titulo: 't', copete: 'c', cuerpo: 'corto' } }),
  ]) {
    const r = await sacarPistasSolas({ libro: libro(), escribir: malo });
    assert.deepEqual(r.salieron, []);
    assert.equal(r.intentadas.length, 2);
    assert.equal(r.libro.pistas.p1.estado, 'abierta');
  }
});

test('una pista que toca menores o víctimas nunca sale sola, aunque la cubran muchos medios (regla del semáforo rojo)', async () => {
  const delicado = { pistas: { x: { estado: 'abierta', total: 8, afirmacion: 'Abuso sexual de un menor en el pueblo', texto: 'Abuso sexual de un menor en el pueblo', consultas: ['abuso sexual menor'] } } };
  let buscó = false;
  const { escribirNotaDePista } = await import('../panel/nota-de-pista.mjs');
  const r = await sacarPistasSolas({ libro: delicado, escribir: (p, o) => escribirNotaDePista(p, { ...o, buscar: async () => { buscó = true; return []; } }) });
  assert.deepEqual(r.salieron, []);
  assert.equal(buscó, false, 'ni siquiera se busca');
  assert.equal(r.libro.pistas.x.estado, 'abierta');
});

test('la corrida de pistas sólo intenta salir sola con la clave de búsqueda y no cuando se mira una sola pista', async () => {
  const fs = await import('node:fs');
  const t = fs.readFileSync(new URL('../panel/revisar-pistas.mjs', import.meta.url), 'utf8');
  assert.match(t, /!solo && process\.env\.TAVILY_API_KEY/);
  assert.match(fs.readFileSync(new URL('../.github/workflows/pistas.yml', import.meta.url), 'utf8'), /TAVILY_API_KEY/);
});

// Pistas que salen solas con 3 o más medios (4/10/2026). Sin red.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pistasParaSalirSolas, sacarPistasSolas, POR_AUTOMATICA, INTENTOS_SOLAS } from '../panel/pistas-solas.mjs';
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

// P-4 (8/10/2026): una pista que no sale sola no se reintenta en cada vuelta (cada intento gasta créditos de búsqueda).
test('un intento fallido se anota y la pista espera 20 horas; después de tres intentos queda para una persona', async () => {
  const malo = async () => ({ ok: false, motivo: 'el verificador tiene avisos', problemas: ['x'] });
  const t0 = new Date('2026-10-08T12:00:00Z');
  let l = libro();
  let r = await sacarPistasSolas({ libro: l, escribir: malo, ahora: t0 });
  assert.equal(r.libro.pistas.p1.sola.n, 1);
  assert.equal(r.libro.pistas.p1.sola.ultimo, t0.toISOString());
  l = r.libro;
  // Tres horas después (la vuelta siguiente) no se vuelve a intentar.
  assert.deepEqual(pistasParaSalirSolas(l, {}, new Date('2026-10-08T15:00:00Z')), []);
  let llamadas = 0;
  r = await sacarPistasSolas({ libro: l, escribir: async () => { llamadas += 1; return malo(); }, ahora: new Date('2026-10-08T15:00:00Z') });
  assert.equal(llamadas, 0, 'no gasta búsquedas');
  // Al día siguiente sí, y otra vez.
  const d2 = new Date('2026-10-09T09:00:00Z');
  assert.deepEqual(pistasParaSalirSolas(l, {}, d2), ['p1', 'p5']);
  l = (await sacarPistasSolas({ libro: l, escribir: malo, ahora: d2 })).libro;
  const d3 = new Date('2026-10-10T09:00:00Z');
  l = (await sacarPistasSolas({ libro: l, escribir: malo, ahora: d3 })).libro;
  assert.equal(l.pistas.p1.sola.n, INTENTOS_SOLAS.total);
  assert.deepEqual(pistasParaSalirSolas(l, {}, new Date('2026-10-20T09:00:00Z')), [], 'después de tres intentos, sólo a mano');
});

test('si el servicio de búsqueda rechaza la clave o no tiene créditos, no se sigue con las demás pistas', async () => {
  let llamadas = 0;
  const r = await sacarPistasSolas({
    libro: libro(), ahora: new Date('2026-10-08T12:00:00Z'),
    escribir: async () => { llamadas += 1; return { ok: false, motivo: 'No pude buscar en internet (Tavily HTTP 432: plan limit).', problemas: [] }; },
  });
  assert.equal(llamadas, 1);
  assert.equal(r.intentadas.length, 1);
});

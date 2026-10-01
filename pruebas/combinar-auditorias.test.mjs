// Las auditorías de varias IA se juntan en una propuesta por día (1/10/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { leerAuditoria, consensoDelDia, combinarMes } from '../ingesta/combinar-auditorias.mjs';

const cand = (id, estilo, puntaje, extra = {}) => ({ id, estilo, puntaje, texto: `texto ${id}`, origen: 'feed', marcas: [], ...extra });
const DIA = [cand('a1', 'deporte', 80), cand('b2', 'ciencia', 75), cand('c3', 'cultura', 70), cand('d4', 'curioso', 65), cand('e5', 'historia', 60), cand('f6', 'nacimiento', 55)];
const VALIDOS = new Set(DIA.map((c) => c.id));

const linea = (fecha, { p, si = [], op = [], no = [], m = 'porque sí' }) =>
  `${fecha} | PRINCIPAL: ${p} | SI: ${si.join(', ') || '-'} | OPCIONAL: ${op.join(', ') || '-'} | NO: ${no.join(', ') || '-'} | MOTIVO: ${m}`;

test('se lee el formato de las auditorías y se ignoran los ids que no existen', () => {
  const t = [linea('2026-10-05', { p: 'a1', si: ['b2', 'zzz'], no: ['f6'], m: 'gancho' }), 'Criterios que seguí', '- algo'].join('\n');
  const a = leerAuditoria(t, VALIDOS);
  assert.deepEqual(a.dias['2026-10-05'], { principal: 'a1', si: ['b2'], opcional: [], no: ['f6'], motivo: 'gancho' });
});

test('la sección VETOS aporta los ids vetados (sólo lo que está antes de los dos puntos)', () => {
  const t = [linea('2026-10-05', { p: 'a1' }), 'VETOS', '- c3 (Perón), d4: política partidaria', '- e5: tragedia', 'ERRORES DE DATOS', '- b2 (1866): mal'].join('\n');
  const a = leerAuditoria(t, VALIDOS);
  assert.deepEqual([...a.vetos].sort(), ['c3', 'd4', 'e5']);
  assert.ok(!a.vetos.has('b2'), 'los errores de datos no son vetos');
});

const auds = (...lineas) => lineas.map((l) => leerAuditoria(l, VALIDOS));

test('gana quien más votos suma y las tres de al lado acompañan sin repetir estilo', () => {
  const a = auds(
    linea('2026-10-05', { p: 'a1', si: ['b2', 'c3', 'd4'], m: 'la local' }),
    linea('2026-10-05', { p: 'a1', si: ['c3', 'b2', 'e5'] }),
    linea('2026-10-05', { p: 'b2', si: ['a1', 'c3'] }),
  );
  const p = consensoDelDia('2026-10-05', DIA, { auditorias: a });
  assert.equal(p.principal, 'a1');
  assert.equal(p.motivos.a1, 'la local');
  assert.equal(p.si.length, 3);
  assert.ok(p.si.includes('b2') && p.si.includes('c3'));
  assert.match(p.fuente, /3 auditorías/);
});

test('lo que veta la auditoría de riesgo no entra, aunque las otras lo quieran', () => {
  const a = auds(
    linea('2026-10-05', { p: 'a1', si: ['b2'] }),
    linea('2026-10-05', { p: 'a1', si: ['b2'] }),
    linea('2026-10-05', { p: 'b2', si: ['c3'], no: ['a1'] }),
  );
  const p = consensoDelDia('2026-10-05', DIA, { auditorias: a });
  assert.equal(p.principal, 'b2');
  assert.ok(p.descartadas.includes('a1'));
  assert.ok(![p.principal, ...p.si, ...p.opcionales].includes('a1'));
});

test('dos auditorías que dicen "no" también vetan', () => {
  const a = auds(
    linea('2026-10-05', { p: 'b2', no: ['a1'] }),
    linea('2026-10-05', { p: 'b2', no: ['a1'] }),
    linea('2026-10-05', { p: 'a1', si: ['b2'] }),
  );
  assert.ok(consensoDelDia('2026-10-05', DIA, { auditorias: a }).descartadas.includes('a1'));
});

test('un error de datos saca a la candidata de principal y de "sí"', () => {
  const a = auds(linea('2026-10-05', { p: 'a1', si: ['b2'] }), linea('2026-10-05', { p: 'a1', si: ['b2'] }), linea('2026-10-05', { p: 'b2' }));
  const p = consensoDelDia('2026-10-05', DIA, { auditorias: a, errores: new Set(['a1']) });
  assert.equal(p.principal, 'b2');
  assert.ok(!p.si.includes('a1'));
});

test('un famoso que murió hace años no se veta por la marca "puede estar vivo"', () => {
  const a = auds(
    linea('2026-10-05', { p: 'a1' }), linea('2026-10-05', { p: 'a1' }), linea('2026-10-05', { p: 'b2', no: ['a1'] }),
  );
  const sin = consensoDelDia('2026-10-05', DIA, { auditorias: a });
  assert.equal(sin.principal, 'b2');
  const con = consensoDelDia('2026-10-05', DIA, { auditorias: a, yaMurieron: new Set(['a1']) });
  assert.equal(con.principal, 'a1');
});

test('una fecha patria habla sola y un día sin opiniones queda con la propuesta por reglas', () => {
  const patria = cand('p1', 'patria', 120, { origen: 'curada' });
  const a = auds(linea('2026-10-12', { p: 'a1' }));
  const f = consensoDelDia('2026-10-12', [patria, ...DIA], { auditorias: a });
  assert.equal(f.principal, 'p1');
  assert.deepEqual(f.si, []);
  const sinOpinion = consensoDelDia('2026-10-20', DIA, { auditorias: a });
  assert.equal(sinOpinion.fuente, 'reglas');
  assert.ok(sinOpinion.principal);
});

test('el mes entero: una propuesta por día, sin ids repetidos', () => {
  const dias = { '2026-10-05': { candidatas: DIA }, '2026-10-06': { candidatas: DIA.map((c) => ({ ...c, id: `${c.id}x` })) } };
  const validos = new Set(Object.values(dias).flatMap((d) => d.candidatas.map((c) => c.id)));
  const a = [leerAuditoria(linea('2026-10-05', { p: 'a1', si: ['b2'] }), validos), leerAuditoria(linea('2026-10-06', { p: 'a1x', si: ['b2x'] }), validos)];
  const r = combinarMes(dias, { auditorias: a });
  assert.deepEqual(Object.keys(r), ['2026-10-05', '2026-10-06']);
  for (const p of Object.values(r)) {
    const todos = [p.principal, ...p.si, ...p.opcionales];
    assert.equal(new Set(todos).size, todos.length);
  }
});

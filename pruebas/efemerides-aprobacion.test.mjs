// Los días armados de "Un día como hoy" se aprueban, se sacan o se frenan desde la pestaña Fechas del panel (2/10/2026, Hernán:
// "¿dónde vemos todo el mes armado en el panel para rearmar, sumar o descartar?"). Esa decisión la respeta el 9:00 (redes/efemeride.mjs).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { efemerideDelDia, diasPreparados, entradaCompleta, huellaDelDia } from '../redes/efemeride.mjs';
import { huellaDelDia as huellaDelPanel, estadoDeDiaArmado, decisionVencida } from '../web/public/panel/fechas.js';
import { conDecisionDePieza, formatear, ARCHIVOS } from '../web/public/panel/github.js';

const leer = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const dia = (extra = {}) => ({ guion: 'Buen día, Balcarce.', principal: { id: 'p1', titulo: 'Algo' }, ademas: [{ id: 'a1', texto: 'x' }], ...extra });
const A = (d) => new Date(`${d}T12:00:00-03:00`);

test('el panel y el 9:00 calculan la misma huella de un día armado', () => {
  for (const d of [dia(), dia({ guion: 'otro' }), dia({ principal: { id: 'q' } }), { principal: {}, ademas: [] }]) assert.equal(huellaDelPanel(d), huellaDelDia(d));
  assert.notEqual(huellaDelDia(dia()), huellaDelDia(dia({ guion: 'otro guion más largo' })));
});

test('un día "sale: false" sale si una persona lo aprobó; si lo sacó o pidió cambios, no sale aunque salga por defecto', () => {
  const d = dia({ sale: false });
  const h = huellaDelDia(d);
  assert.equal(entradaCompleta(d), false, 'sin decisión, no sale');
  assert.equal(entradaCompleta(d, { estado: 'aprobada', huella: h }), true);
  assert.equal(entradaCompleta(dia(), { estado: 'sacada', huella: huellaDelDia(dia()) }), false);
  assert.equal(entradaCompleta(dia(), { estado: 'cambiar', huella: huellaDelDia(dia()) }), false);
  assert.equal(entradaCompleta(dia()), true, 'sin decisión y sin "sale: false", sale como estaba');
});

test('una aprobación vieja no vale si después se rearmó el día (otra principal, otro guion)', () => {
  const viejo = dia({ sale: false });
  const aprobada = { estado: 'aprobada', huella: huellaDelDia(viejo) };
  const rearmado = dia({ sale: false, principal: { id: 'otra', titulo: 'Otra cosa' } });
  assert.equal(entradaCompleta(rearmado, aprobada), false, 'vuelve a esperar');
  assert.ok(decisionVencida(rearmado, aprobada));
  assert.ok(!decisionVencida(viejo, aprobada));
  assert.match(estadoDeDiaArmado(rearmado, aprobada).texto, /Sin revisar/);
});

test('efemerideDelDia y diasPreparados leen las decisiones', () => {
  const d = dia({ sale: false });
  const datos = { dias: { '2026-10-20': d, '2026-10-21': dia(), '2026-10-22': dia() } };
  const decisiones = {
    '2026-10-20': { estado: 'aprobada', huella: huellaDelDia(d) },
    '2026-10-21': { estado: 'sacada', huella: huellaDelDia(dia()) },
  };
  assert.equal(efemerideDelDia(A('2026-10-20'), { datos, decisiones }).fecha, '2026-10-20');
  assert.equal(efemerideDelDia(A('2026-10-21'), { datos, decisiones }), null);
  assert.equal(efemerideDelDia(A('2026-10-22'), { datos, decisiones }).fecha, '2026-10-22');
  assert.deepEqual(diasPreparados({ datos, decisiones }), ['2026-10-20', '2026-10-22']);
});

test('el estado de un día armado, para la lista del panel', () => {
  const d = dia({ sale: false });
  const h = huellaDelDia(d);
  assert.deepEqual([estadoDeDiaArmado(d).clase, estadoDeDiaArmado(d).sale], ['espera', false]);
  assert.deepEqual([estadoDeDiaArmado(d, { estado: 'aprobada', huella: h }).clase, estadoDeDiaArmado(d, { estado: 'aprobada', huella: h }).sale], ['ok', true]);
  assert.equal(estadoDeDiaArmado(dia()).sale, true);
  assert.equal(estadoDeDiaArmado(dia(), { estado: 'sacada', huella: huellaDelDia(dia()) }).clase, 'mal');
  assert.equal(estadoDeDiaArmado(dia(), { estado: 'cambiar', huella: huellaDelDia(dia()) }).clase, 'espera');
  assert.equal(estadoDeDiaArmado({ principal: { titulo: 'x' } }).sale, false, 'incompleto no sale');
});

test('la decisión se guarda en efemerides-elegidas.json (piezas), un día por renglón, sin pisar lo demás', () => {
  const antes = { dias: { '2026-10-05': { principal: 'x' } }, feriados: { '2026-10-12': { estado: 'aprobada' } } };
  const j = conDecisionDePieza(antes, '2026-10-20', { estado: 'aprobada', huella: 'h', por: 'Hernán' });
  assert.equal(j.piezas['2026-10-20'].estado, 'aprobada');
  assert.equal(j.piezas['2026-10-20'].por, 'Hernán');
  assert.deepEqual(j.dias, antes.dias);
  assert.deepEqual(j.feriados, antes.feriados);
  const texto = formatear(ARCHIVOS.elegidas, conDecisionDePieza(j, '2026-10-21', { estado: 'sacada', comentario: 'no me gusta', huella: 'h2', por: 'Andrés' }));
  assert.equal(texto.split('\n').filter((l) => l.startsWith('"2026-10-2')).length, 2, 'un día por renglón');
  assert.equal(JSON.parse(texto).piezas['2026-10-21'].comentario, 'no me gusta');
});

test('la pestaña Fechas muestra el mes armado y conecta aprobar, sacar, pedir cambios y elegir otras candidatas', () => {
  const app = leer('web/public/panel/app.js');
  assert.match(app, /sub\('piezas', 'Mes armado'\)/);
  assert.match(app, /ARCHIVOS\.piezas/);
  assert.match(app, /data-accion="abrir-pieza"/);
  for (const a of ['aprobar-pieza', 'sacar-pieza', 'cambiar-pieza', 'armar-con-candidatas']) assert.match(app, new RegExp(`data-accion="${a}"`));
  assert.match(app, /conDecisionDePieza\(j, dia, \{ estado, comentario, huella: huellaDelDia\(d\), por: E\.nombre \}\)/);
  // Elegir otra principal en las candidatas frena el día armado.
  assert.match(app, /estado: 'cambiar', comentario: 'Eligió otra principal en las candidatas'/);
  assert.match(app, /Sin armar \(ese día no sale nada\)/);
  assert.match(leer('web/public/panel/github.js'), /piezas: 'web\/data\/efemerides-piezas\.json'/);
});

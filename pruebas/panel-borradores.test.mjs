// La pestaña Borradores del panel del celular (8/10/2026): todo lo que se le pidió a la IA, en un lugar. Puras, sin red.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { clasificarBorradores, estadoDelBorrador, htmlDeBorradores, DIAS_DE_BORRADORES } from '../web/public/panel/borradores.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const apps = { esc, haceCuanto: () => 'hace 12 min', chip: (s) => `<chip>${esc(s)}</chip>` };
const AHORA = Date.parse('2026-10-08T18:00:00Z');
const hace = (horas) => AHORA - horas * 3600e3;
const ok = (extra = {}) => ({ ok: true, texto: { titulo: 'Corte de agua en el barrio Norte', copete: 'c', cuerpo: 'x' }, problemas: [], seccion: 'Balcarce', ...extra });

test('se separan los que esperan lectura de los ya resueltos, lo más nuevo primero, y se descartan los viejos', () => {
  const items = [
    { id: 'a', tipo: 'pendiente', cuando: hace(1), b: ok({ pedido: 'que empiece por el horario' }), estado: 'espera' },
    { id: 'b', tipo: 'pendiente', cuando: hace(3), b: ok({ problemas: [{}, {}] }), estado: 'espera' },
    { id: 'c', tipo: 'publicada', cuando: hace(30), b: ok(), estado: 'aprobada' },
    { id: 'd', tipo: 'pendiente', cuando: hace(2), b: { ok: false, motivo: 'No encontré la nota', problemas: [] }, estado: 'espera' },
    { id: 'e', tipo: 'pendiente', cuando: hace(24 * (DIAS_DE_BORRADORES + 1)), b: ok(), estado: 'espera' },
    { id: 'f', tipo: 'pendiente', cuando: NaN, b: ok(), estado: 'espera' },
    { id: 'g', tipo: 'pendiente', cuando: hace(5), b: null, estado: 'espera' },
  ];
  const r = clasificarBorradores(items, AHORA);
  assert.deepEqual(r.paraLeer.map((x) => x.id), ['a', 'b']);
  assert.deepEqual(r.resueltos.map((x) => x.id), ['d', 'c'], 'el que falló y el aprobado; el viejo, el sin fecha y el vacío no figuran');
  assert.equal(r.paraLeer[0].marcas, 0);
  assert.equal(r.paraLeer[1].marcas, 2);
});

test('cada borrador dice cómo está en una frase', () => {
  const dato = (b) => ({ b, conTexto: !!(b.ok && b.texto), marcas: (b.problemas ?? []).length });
  assert.equal(estadoDelBorrador(dato(ok())), '✓ el verificador no marcó nada');
  assert.equal(estadoDelBorrador(dato(ok({ problemas: [{}] }))), '⚠ 1 cosa para mirar');
  assert.equal(estadoDelBorrador(dato(ok({ problemas: [{}, {}, {}] }))), '⚠ 3 cosas para mirar');
  assert.match(estadoDelBorrador(dato({ ok: false, motivo: 'No encontré la nota' })), /la IA no pudo escribirla: No encontré la nota/);
});

test('el HTML muestra las dos listas, el pedido y a dónde lleva cada tarjeta', () => {
  const r = clasificarBorradores([
    { id: 'a', tipo: 'pendiente', cuando: hace(1), b: ok({ pedido: 'que empiece por el horario' }), estado: 'espera' },
    { id: 'c', tipo: 'publicada', cuando: hace(30), b: ok(), estado: 'aprobada' },
  ], AHORA);
  const h = htmlDeBorradores(r, apps, { enCurso: ['Paro docente'] });
  assert.match(h, /Para leer \(1\)/);
  assert.match(h, /Ya resueltos \(1\)/);
  assert.match(h, /Pedido: “que empiece por el horario”/);
  assert.match(h, /✓ la aprobaste/);
  assert.match(h, /data-accion="abrir-borrador" data-tipo="pendiente" data-id="a"/);
  assert.match(h, /La IA está escribiendo “Paro docente”/);
  assert.match(htmlDeBorradores({}, apps), /No hay borradores esperando/);
  assert.match(htmlDeBorradores({}, apps, { cargando: true }), /girando/);
  assert.match(htmlDeBorradores({}, apps, { sinLlave: true }), /falta registrarlo/);
});

test('un título o un pedido con HTML no rompe la página', () => {
  const r = clasificarBorradores([{ id: 'x', tipo: 'pendiente', cuando: hace(1), b: ok({ texto: { titulo: '<img src=x onerror=alert(1)>' }, pedido: '<script>alert(1)</script>' }), estado: 'espera' }], AHORA);
  const h = htmlDeBorradores(r, apps);
  assert.ok(!h.includes('<img') && !h.includes('<script'));
});

test('la pestaña está en Más, se abre desde Hoy y el borrador se abre con su tipo', () => {
  const app = leer('web/public/panel/app.js');
  assert.match(app, /\['borradores', 'Borradores', '✎'/);
  assert.match(app, /E\.pestana === 'borradores'\) vistaBorradores\(\)/);
  assert.match(app, /accion === 'abrir-borrador'/);
  assert.match(leer('web/public/panel/sw.js'), /'\/panel\/borradores\.js'/);
  assert.match(leer('web/public/panel/hoy.js'), /id: 'borradores', n: b\.listos/);
});

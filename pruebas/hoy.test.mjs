// /hoy: lo de hoy en una sola dirección (17/10/2026, regla 255). Sin red y sin compilar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  armarHoy, diaEscrito, diaIso, tituloDeHoy, mediosDe, MINIMO_DE_NOTAS_DE_HOY, NOTAS_DE_BALCARCE, NOTAS_MAS_CONTADAS,
} from '../web/lib/hoy.js';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
// Sábado 17/10/2026, 15:00 en Balcarce (18:00 UTC).
const AHORA = Date.parse('2026-10-17T18:00:00Z');
const hace = (h) => new Date(AHORA - h * 3600e3).toISOString();
const cuerpo = Array.from({ length: 90 }, (_, i) => `palabra${i}`).join(' ');
const nota = (id, horas, extra = {}) => ({
  id, ruta: `/nota/titulo-${id}`, titulo: `Titular ${id}`, copete: `Bajada ${id}`, cuerpo, seccion: 'Balcarce', fecha: hace(horas),
  medios: ['El Diario'], local: false, relevancia: 50, como: 'automatica', ...extra,
});

test('el día se escribe en hora de Balcarce, no en la del servidor', () => {
  assert.equal(diaEscrito(AHORA), 'sábado 17 de octubre');
  assert.equal(diaIso(AHORA), '2026-10-17');
  // A las 02:00 UTC del 18 todavía es 17 en Balcarce (UTC-3).
  assert.equal(diaIso(Date.parse('2026-10-18T02:00:00Z')), '2026-10-17');
  assert.equal(diaIso(Date.parse('2026-10-18T03:00:00Z')), '2026-10-18');
});

test('el título lleva el día, y la marca detrás sólo si entra en 70 caracteres', () => {
  assert.equal(tituloDeHoy(AHORA), 'Lo de hoy en Balcarce · sábado 17 de octubre · Radar Balcarce');
  const largo = tituloDeHoy(Date.parse('2026-09-30T18:00:00Z'));
  assert.ok(largo.startsWith('Lo de hoy en Balcarce · miércoles 30 de septiembre'));
  assert.ok(largo.length <= 70);
});

test('lo de Balcarce va primero, lo muy contado de acá antes, y lo demás por relevancia', () => {
  const notas = [
    nota('a', 5, { local: true, relevancia: 60 }),
    nota('b', 6, { local: true, relevancia: 80 }),
    nota('c', 7, { local: true, relevancia: 40, muyContadaDeAca: 3 }),
    nota('d', 2, { nombraBalcarce: true, relevancia: 70 }),
    nota('e', 1, { relevancia: 99, medios: ['A', 'B', 'C'] }),
    nota('f', 1, { relevancia: 10 }),
    nota('g', 1, { relevancia: 10 }),
    nota('h', 1, { relevancia: 10 }),
  ];
  const r = armarHoy(notas, { ahora: AHORA });
  assert.equal(r.ventana, 'hoy');
  assert.deepEqual(r.balcarce.map((n) => n.id), ['c', 'b', 'd', 'a']);
  // Lo más contado: sólo dos medios o más, y nunca lo que ya está arriba.
  assert.deepEqual(r.masContadas.map((n) => n.id), ['e']);
  assert.equal(r.total, 8);
});

test('lo más contado ordena por cantidad de medios y no repite lo de Balcarce', () => {
  const notas = [
    nota('x', 1, { medios: ['A', 'B'], relevancia: 90 }),
    nota('y', 2, { medios: ['A', 'B', 'C', 'D'], relevancia: 20 }),
    nota('z', 3, { medios: ['A', 'B', 'C'], relevancia: 70 }),
    nota('loc', 3, { local: true, medios: ['A', 'B', 'C', 'D', 'E'] }),
    nota('uno', 3, { medios: ['A'] }),
    nota('dolar', 3, { propia: 'dolar', medios: ['DolarApi', 'Otro'] }),
    nota('r1', 1), nota('r2', 1),
  ];
  const r = armarHoy(notas, { ahora: AHORA });
  assert.deepEqual(r.masContadas.map((n) => n.id), ['y', 'z', 'x']);
  assert.equal(mediosDe({ medios: ['A', { nombre: 'B' }, 'A'] }), 2);
});

test('no se pasan los topes de cada bloque', () => {
  const muchas = Array.from({ length: 40 }, (_, i) => nota(`l${i}`, 1 + (i % 10) * 0.1, { local: true }));
  const contadas = Array.from({ length: 40 }, (_, i) => nota(`c${i}`, 1 + (i % 10) * 0.1, { medios: ['A', 'B', 'C'] }));
  const r = armarHoy([...muchas, ...contadas], { ahora: AHORA });
  assert.equal(r.balcarce.length, NOTAS_DE_BALCARCE);
  assert.equal(r.masContadas.length, NOTAS_MAS_CONTADAS);
});

test('lo de ayer no se hace pasar por lo de hoy: con pocas notas de hoy se avisa y se completa con las últimas 24 horas', () => {
  const notas = [
    nota('hoy1', 2), nota('hoy2', 3), nota('ayer1', 20, { local: true }), nota('ayer2', 24.5, { local: true }), nota('vieja', 40, { local: true }),
  ];
  assert.ok(2 < MINIMO_DE_NOTAS_DE_HOY);
  const r = armarHoy(notas, { ahora: AHORA });
  assert.equal(r.ventana, '24h');
  assert.deepEqual(r.balcarce.map((n) => n.id), ['ayer1']);
  assert.equal(r.total, 3, 'las de hace más de 24 horas no entran');
  // Con suficientes de hoy, sólo las de hoy.
  const muchas = Array.from({ length: 7 }, (_, i) => nota(`h${i}`, 1 + i * 0.5, { local: true }));
  const r2 = armarHoy([...muchas, nota('ayer', 20, { local: true })], { ahora: AHORA });
  assert.equal(r2.ventana, 'hoy');
  assert.ok(!r2.balcarce.some((n) => n.id === 'ayer'));
});

test('nunca entra una nota sin hora real, con noindex, sin dirección o del futuro; sin notas, no se rompe', () => {
  const r = armarHoy([
    nota('sinhora', 1, { sinFecha: true, local: true }),
    nota('sincuerpo', 1, { cuerpo: 'corto', local: true }),
    nota('sinruta', 1, { ruta: undefined, local: true }),
    nota('futura', -2, { local: true }),
    nota('buena', 1, { local: true }),
  ], { ahora: AHORA });
  assert.deepEqual(r.balcarce.map((n) => n.id), ['buena']);
  const vacio = armarHoy([], { ahora: AHORA });
  assert.deepEqual(vacio, { ventana: '24h', balcarce: [], masContadas: [], total: 0 });
  assert.deepEqual(armarHoy(undefined, { ahora: AHORA }).balcarce, []);
});

test('la página existe, no pisa nada, se arma al compilar y está en el sitemap y en el pie', () => {
  assert.ok(fs.existsSync(path.join(import.meta.dirname, '..', 'web', 'app', 'hoy', 'page.js')));
  assert.ok(fs.existsSync(path.join(import.meta.dirname, '..', 'web', 'app', 'hoy', 'opengraph-image.js')));
  const p = leer('web/app/hoy/page.js');
  assert.match(p, /export const dynamic = 'force-static'/);
  assert.match(p, /alternates: \{ canonical: '\/hoy' \}/);
  assert.match(p, /absolute: titulo/);
  assert.match(p, /<h1>Lo de hoy en Balcarce<\/h1>/);
  assert.match(p, /<Compartir titulo=\{`Lo de hoy en Balcarce · \$\{dia\}`\} camino="\/hoy"/);
  assert.match(leer('web/app/sitemap.js'), /\$\{base\}\/hoy/);
  assert.match(leer('web/app/layout.js'), /<a href="\/hoy">Lo de hoy<\/a>/);
  assert.match(leer('web/public/_headers'), /\/hoy\/opengraph-image\n\s+Content-Type: image\/png/);
  // Ninguna otra página se llama "hoy": /hoy no pisa una ruta existente.
  const rutas = fs.readdirSync(path.join(import.meta.dirname, '..', 'web', 'app'));
  assert.equal(rutas.filter((r) => r === 'hoy').length, 1);
});

test('/hoy no cambia la portada ni el menú (cambios visibles grandes se proponen antes)', () => {
  assert.ok(!/["'`]\/hoy["'`]/.test(leer('web/app/page.js')), 'la portada enlaza /hoy');
  assert.ok(!/href: '\/hoy'/.test(leer('web/app/layout.js')), '/hoy está en el menú');
});

// La fecha exacta de cada nota y "Antes en esta sección" (1/10/2026, Hernán): las secciones no se ven vacías
// y quien lee una nota otro día ve cuándo salió.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fechaLarga, fechaCorta, partesEnBalcarce } from '../web/lib/tiempo.js';
import { notasDeAntes, DIAS_DE_ANTES } from '../web/lib/datos.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

test('la fecha exacta sale en hora de Balcarce, no en la del servidor', () => {
  // La nota de la Cooperativa del 1/10: salió a las 18:32 UTC = 15:32 en Balcarce.
  assert.equal(fechaLarga('2026-10-01T18:32:00Z'), 'jueves 1 de octubre de 2026 · 15:32');
  assert.equal(fechaCorta('2026-09-30T17:20:00Z'), 'mié 30 de septiembre · 14:20');
  // Pasada la medianoche UTC todavía es el día anterior en Balcarce.
  assert.equal(fechaLarga('2026-10-02T01:30:00Z'), 'jueves 1 de octubre de 2026 · 22:30');
  assert.equal(partesEnBalcarce('2026-12-31T23:59:00Z').dia, 31);
  assert.equal(fechaLarga('no es una fecha'), '');
  assert.equal(fechaLarga(undefined), '');
});

const TITULOS = {};
const PALABRAS = ['cosecha', 'piloto', 'carrera', 'museo', 'tractor', 'escuela', 'hospital', 'torneo', 'festival', 'puente', 'semilla', 'campeón', 'orquesta', 'biblioteca', 'granizo', 'ruta', 'club', 'feria', 'concejo', 'rugby', 'maratón', 'clínica', 'cooperativa', 'sembradora', 'exposición', 'kartódromo', 'rally', 'turismo', 'ciclismo', 'natación'];
const nota = (id, seccion, horasAtras, extra = {}) => ({
  id, seccion, titulo: TITULOS[id] ?? `${PALABRAS[Math.abs([...id].reduce((h, c) => h * 31 + c.charCodeAt(0), 7)) % PALABRAS.length]} ${PALABRAS[(Math.abs([...id].reduce((h, c) => h * 17 + c.charCodeAt(0), 3)) + 5) % PALABRAS.length]} ${id}`, fecha: new Date(Date.UTC(2026, 9, 1, 18) - horasAtras * 3600e3).toISOString(),
  cuerpo: 'palabra '.repeat(90), ruta: `/nota/${id}`, medios: ['Medio uno', 'Medio dos'], ...extra,
});
const AHORA = Date.UTC(2026, 9, 1, 18);

test('"Antes": lo de los últimos 7 días de esa sección que no está arriba, lo más nuevo primero', () => {
  const archivo = [
    nota('a1', 'Automovilismo', 40), nota('a2', 'Automovilismo', 100), nota('a3', 'Automovilismo', 24 * 8),
    nota('b1', 'Agro', 50), nota('a4', 'Automovilismo', 60, { propia: true }), nota('a5', 'Automovilismo', 70, { cuerpo: 'corto' }),
  ];
  const arriba = [nota('a0', 'Automovilismo', 5)];
  const r = notasDeAntes('Automovilismo', { archivo, enSeccion: arriba, ahora: AHORA });
  assert.deepEqual(r.map((n) => n.id), ['a1', 'a2'], 'sin las de otra sección, las de más de 7 días, las propias ni las sin cuerpo');
  assert.equal(DIAS_DE_ANTES, 7);
});

test('"Antes" no repite una historia que ya está arriba ni se pasa del tope', () => {
  const archivo = [nota('x1', 'Agro', 40, { titulo: 'El agro liquidó 3.228 millones de dólares en septiembre' })];
  const arriba = [nota('x0', 'Agro', 5, { titulo: 'El agro liquidó 3.228 millones de dólares en septiembre y alcanzó el récord' })];
  assert.deepEqual(notasDeAntes('Agro', { archivo, enSeccion: arriba, ahora: AHORA }), []);
  const muchas = Array.from({ length: 30 }, (_, i) => nota(`m${i}`, 'Deportes', 30 + i));
  assert.equal(notasDeAntes('Deportes', { archivo: muchas, ahora: AHORA }).length, 12);
  assert.equal(notasDeAntes('Deportes', { archivo: muchas, ahora: AHORA, cuantas: 5 }).length, 5);
});

test('la sección muestra "Antes en…" debajo de lo nuevo y la nota lleva su fecha exacta', () => {
  const seccion = leer('web/app/seccion/[ranura]/page.js');
  assert.match(seccion, /notasDeAntes\(s\.nombre, \{ enSeccion: todas \}\)/);
  assert.match(seccion, /Antes en \{nombreCorto\(s\.nombre\)\}/);
  assert.match(seccion, /<FilaAntes nota=\{n\} key=\{n\.id\} \/>/);
  const pagina = leer('web/app/nota/[id]/page.js');
  assert.match(pagina, /<FechaExacta nota=\{n\} \/>/);
  const piezas = leer('web/components/piezas.js');
  assert.match(piezas, /export function FechaExacta/);
  assert.match(piezas, /fechaLarga\(nota\?\.fecha\)/);
});

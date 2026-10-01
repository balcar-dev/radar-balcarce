// La fecha exacta de cada nota y las secciones que guardan todo (1/10/2026, Hernán): las notas no se borran
// nunca, se ven de a 10 por página, las más nuevas primero; y quien lee una nota otro día ve cuándo salió.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fechaLarga, fechaCorta, partesEnBalcarce } from '../web/lib/tiempo.js';
import { notasDeLaSeccion } from '../web/lib/datos.js';

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

test('la sección guarda todo: portada + archivo, lo más nuevo primero, sin repetir ni lo que no tiene página', () => {
  const portada = [nota('a0', 'Automovilismo', 5), nota('z0', 'Agro', 3)];
  const archivo = [
    nota('a0', 'Automovilismo', 5), nota('a1', 'Automovilismo', 40), nota('a2', 'Automovilismo', 24 * 20), nota('a3', 'Automovilismo', 24 * 100),
    nota('b1', 'Agro', 50), nota('a4', 'Automovilismo', 60, { propia: true }), nota('a5', 'Automovilismo', 70, { cuerpo: 'corto' }),
  ];
  const r = notasDeLaSeccion('Automovilismo', { archivo, portada });
  assert.deepEqual(r.map((n) => n.id), ['a0', 'a1', 'a2', 'a3'], 'sin las de otra sección, las propias ni las sin cuerpo; sin límite de días');
});

test('la sección pagina de a 10, muestra la más nueva arriba y no tiene "Antes en" ni agenda', () => {
  const seccion = leer('web/app/seccion/[ranura]/page.js');
  assert.match(seccion, /notasDeLaSeccion\(s\.nombre\)/);
  assert.doesNotMatch(seccion, /Antes en|notasDeAntes|proximosEventos|Se viene en la agenda/);
  assert.doesNotMatch(seccion, /últimas 36 horas/);
  assert.match(seccion, /Más viejas →/);
  const pagina = leer('web/app/nota/[id]/page.js');
  assert.match(pagina, /<FechaExacta nota=\{n\} \/>/);
  const piezas = leer('web/components/piezas.js');
  assert.match(piezas, /export function FechaExacta/);
  assert.match(piezas, /fechaLarga\(nota\?\.fecha\)/);
});

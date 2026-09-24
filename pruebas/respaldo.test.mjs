// La copia de seguridad del panel: copia todo, no acumula para siempre y no
// toca el original.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { respaldar, nombreDeCopia } from '../panel/respaldo.mjs';

function carpetaConDatos() {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'respaldo-'));
  const origen = path.join(raiz, 'datos');
  fs.mkdirSync(path.join(origen, 'sub'), { recursive: true });
  fs.writeFileSync(path.join(origen, 'estado.json'), '{"a":1}');
  fs.writeFileSync(path.join(origen, 'sub', 'buzon.json'), '[]');
  return { raiz, origen, destino: path.join(raiz, 'copias') };
}

test('copia todos los archivos, también los de las subcarpetas', () => {
  const { origen, destino } = carpetaConDatos();
  const r = respaldar({ origen, destino, fecha: new Date('2026-09-24T15:00:00Z') });
  assert.equal(r.archivos, 2);
  assert.equal(fs.readFileSync(path.join(r.carpeta, 'sub', 'buzon.json'), 'utf8'), '[]');
  assert.ok(r.carpeta.endsWith('2026-09-24'));
});

test('el original queda como estaba', () => {
  const { origen, destino } = carpetaConDatos();
  respaldar({ origen, destino });
  assert.equal(fs.readFileSync(path.join(origen, 'estado.json'), 'utf8'), '{"a":1}');
});

test('repetir el mismo día pisa la copia de ese día, no crea otra', () => {
  const { origen, destino } = carpetaConDatos();
  const f = new Date('2026-09-24T15:00:00Z');
  respaldar({ origen, destino, fecha: f });
  fs.writeFileSync(path.join(origen, 'estado.json'), '{"a":2}');
  respaldar({ origen, destino, fecha: f });
  assert.equal(fs.readdirSync(destino).length, 1);
  assert.equal(fs.readFileSync(path.join(destino, '2026-09-24', 'estado.json'), 'utf8'), '{"a":2}');
});

test('sólo se guardan las últimas copias', () => {
  const { origen, destino } = carpetaConDatos();
  for (let d = 1; d <= 5; d += 1) respaldar({ origen, destino, fecha: new Date(`2026-09-0${d}T15:00:00Z`), guardar: 3 });
  assert.deepEqual(fs.readdirSync(destino).sort(), ['2026-09-03', '2026-09-04', '2026-09-05']);
});

test('no toca otras carpetas que estén en el destino', () => {
  const { origen, destino } = carpetaConDatos();
  fs.mkdirSync(path.join(destino, 'mis-fotos'), { recursive: true });
  respaldar({ origen, destino, guardar: 1 });
  assert.ok(fs.existsSync(path.join(destino, 'mis-fotos')));
});

test('sin datos de origen avisa en vez de crear una copia vacía', () => {
  assert.throws(() => respaldar({ origen: '/no/existe/nunca', destino: os.tmpdir() }), /no existe/);
});

test('el nombre es la fecha de Balcarce, no la de UTC', () => {
  assert.equal(nombreDeCopia(new Date('2026-09-25T01:30:00Z')), '2026-09-24');
});

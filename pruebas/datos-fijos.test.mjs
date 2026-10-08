// C-7 y C-18 (8/10/2026): las pruebas no dependen de los archivos vivos que tocan Hernán y Andrés desde el celular.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { carpetaDeDatos, rutaDeDatos } from '../ingesta/datos-vivos.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

test('las pruebas leen los datos fijos y la producción, web/data', () => {
  const antes = process.env.RADAR_DATOS_FIJOS;
  try {
    process.env.RADAR_DATOS_FIJOS = 'pruebas/datos-fijos';
    assert.equal(carpetaDeDatos(), path.join(RAIZ, 'pruebas', 'datos-fijos'));
    delete process.env.RADAR_DATOS_FIJOS;
    assert.equal(carpetaDeDatos(), path.join(RAIZ, 'web', 'data'));
    assert.equal(rutaDeDatos('feriados-piezas.json'), path.join(RAIZ, 'web', 'data', 'feriados-piezas.json'));
  } finally {
    if (antes === undefined) delete process.env.RADAR_DATOS_FIJOS; else process.env.RADAR_DATOS_FIJOS = antes;
  }
});

test('los datos fijos están y tienen la forma que lee el código', () => {
  for (const f of ['feriados-piezas.json', 'efemerides-piezas.json', 'efemerides-elegidas.json', 'efemerides-candidatas.json']) {
    assert.ok(fs.existsSync(path.join(RAIZ, 'pruebas', 'datos-fijos', f)), `falta pruebas/datos-fijos/${f}`);
  }
  const feriados = JSON.parse(fs.readFileSync(path.join(RAIZ, 'pruebas', 'datos-fijos', 'feriados-piezas.json'), 'utf8'));
  assert.ok(feriados.feriados.some((x) => x.fecha === '2026-10-12'), 'el feriado del 12/10 que usan las pruebas de la semana');
  const piezas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'pruebas', 'datos-fijos', 'efemerides-piezas.json'), 'utf8'));
  assert.ok(piezas.dias['2026-10-11'] && piezas.dias['2026-10-05']);
});

test('el código que lee feriados y efemérides pasa por datos-vivos, y las dos formas de correr las pruebas cargan los datos fijos', () => {
  for (const f of ['redes/feriado.mjs', 'redes/efemeride.mjs']) assert.match(fs.readFileSync(path.join(RAIZ, f), 'utf8'), /rutaDeDatos\(/, f);
  assert.match(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'), /--import \.\/pruebas\/datos-fijos\.mjs --test/);
  assert.match(fs.readFileSync(path.join(RAIZ, '.github', 'workflows', 'pruebas-otra-hora.yml'), 'utf8'), /--import \.\/pruebas\/datos-fijos\.mjs/);
});

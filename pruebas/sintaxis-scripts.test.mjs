// Los programas que corren solos en GitHub Actions tienen que poder cargarse.
//
// 27/09: se sumó un import a web/scripts/generar-datos.mjs con un nombre que
// ya estaba importado de otro archivo (comoHistoriaJson). Las pruebas pasaban
// —ninguna carga ese script entero, porque baja datos de la red— y "Actualizar
// la web" falló en GitHub apenas arrancó. `node --check` lo detecta sin correr
// nada: revisa que el archivo se pueda leer como módulo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CARPETAS = ['web/scripts', 'ingesta', 'redes', 'panel', 'reels'];

const archivos = CARPETAS.flatMap((c) => fs.readdirSync(path.join(RAIZ, c))
  .filter((f) => f.endsWith('.mjs'))
  .map((f) => path.join(c, f)));

test('todos los programas de web/scripts, ingesta, redes, panel y reels se pueden cargar', () => {
  assert.ok(archivos.includes(path.join('web/scripts', 'generar-datos.mjs')));
  const rotos = [];
  for (const f of archivos) {
    const r = spawnSync(process.execPath, ['--check', path.join(RAIZ, f)], { encoding: 'utf8' });
    if (r.status !== 0) rotos.push(`${f}: ${(r.stderr.match(/SyntaxError[^\n]*/) ?? [r.stderr.trim()])[0]}`);
  }
  assert.deepEqual(rotos, []);
});

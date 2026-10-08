// 8/10/2026 (C-4): GitHub pasa `ubuntu-latest` a Ubuntu 26 desde el 19/10. Los robots (ffmpeg-static, resvg, sharp traen binarios) se
// fijan en 24.04 hasta probarlos con 26 a propósito; así el cambio no nos agarra un día cualquiera.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const CARPETA = path.join(import.meta.dirname, '..', '.github', 'workflows');

test('ningún workflow corre en ubuntu-latest: todos fijan la versión', () => {
  const archivos = fs.readdirSync(CARPETA).filter((f) => f.endsWith('.yml'));
  assert.ok(archivos.length > 10);
  for (const f of archivos) {
    const t = fs.readFileSync(path.join(CARPETA, f), 'utf8');
    assert.ok(!/runs-on:\s*ubuntu-latest/.test(t), `${f} usa ubuntu-latest`);
    assert.match(t, /runs-on:\s*ubuntu-\d\d\.\d\d/, `${f} no fija la versión`);
  }
});

// 8/10/2026 (R-1): "Crear voces" no borra las dos voces de producción sin una confirmación escrita.
test('crear-voces protege las voces de producción y coincide con CRITERIO-REDES.md', () => {
  const raiz = path.join(import.meta.dirname, '..');
  const codigo = fs.readFileSync(path.join(raiz, 'reels/crear-voces.mjs'), 'utf8');
  const criterio = fs.readFileSync(path.join(raiz, 'CRITERIO-REDES.md'), 'utf8');
  const lista = /VOCES_DE_PRODUCCION = \[([^\]]+)\]/.exec(codigo)[1].match(/voice_[a-z0-9]+/g);
  assert.equal(lista.length, 2);
  for (const id of lista) assert.ok(criterio.includes(id), `${id} no figura en CRITERIO-REDES.md`);
  assert.match(codigo, /VOCES_DE_PRODUCCION\.includes\(id\) && !pedido\.endsWith\(CONFIRMA_PRODUCCION\)/);
  assert.match(fs.readFileSync(path.join(raiz, '.github/workflows/crear-voces.yml'), 'utf8'), /borrar-de-produccion/);
});

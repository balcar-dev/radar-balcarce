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

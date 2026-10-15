// Corre el "núcleo legal" de las pruebas: los archivos de pruebas/nucleo-legal.txt, con los mismos datos fijos que `npm test`.
// Lo usan `npm run test:nucleo` y "Actualizar la web" (antes de publicar). Sale con el código de `node --test`: distinto de 0 si algo falla.
// Si la lista está vacía o nombra un archivo que no existe, también falla (una lista rota no puede dejar pasar todo).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const RAIZ = path.join(import.meta.dirname, '..');
const lista = fs.readFileSync(path.join(import.meta.dirname, 'nucleo-legal.txt'), 'utf8')
  .split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

if (lista.length === 0) {
  console.error('pruebas/nucleo-legal.txt está vacío: el núcleo legal no probaría nada.');
  process.exit(1);
}
const faltan = lista.filter((f) => !fs.existsSync(path.join(import.meta.dirname, f)));
if (faltan.length) {
  console.error(`pruebas/nucleo-legal.txt nombra archivos que no existen: ${faltan.join(', ')}`);
  process.exit(1);
}

const r = spawnSync(process.execPath, ['--import', './pruebas/datos-fijos.mjs', '--test', ...lista.map((f) => path.join('pruebas', f))], { cwd: RAIZ, stdio: 'inherit' });
process.exit(r.status ?? 1);

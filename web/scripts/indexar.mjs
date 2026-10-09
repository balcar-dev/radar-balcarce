// Arma el índice del buscador (Pagefind) sobre el sitio ya compilado (web/out): un buscador de TODO el archivo, no sólo de las notas de hoy
// (8/10/2026, #69). Pagefind lee las páginas de nota (las que llevan `data-pagefind-body`) y deja en out/pagefind/ un índice en pedacitos
// que el navegador baja de a poco, según lo que se busque: no hay servidor ni base de datos.
//
// NUNCA frena el armado del sitio: si Pagefind falla (o no hay páginas, como en "Armado con datos vacíos"), se avisa y el sitio sale igual;
// el buscador, sin su índice, dice que no está disponible.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const AQUI = import.meta.dirname;
const SALIDA = path.join(AQUI, '..', 'out');
// Se corre con el propio Node (sin shell): en Windows, una carpeta con espacios ("Radar Balcarce") rompe la llamada por el .cmd.
const BIN = path.join(AQUI, '..', 'node_modules', 'pagefind', 'lib', 'runner', 'bin.cjs');

if (!fs.existsSync(SALIDA)) {
  console.log('Buscador: no hay web/out, no se arma el índice.');
  process.exit(0);
}
if (!fs.existsSync(BIN)) {
  console.log('Buscador: Pagefind no está instalado (npm ci en web/); el sitio sale sin índice de búsqueda.');
  process.exit(0);
}

const r = spawnSync(process.execPath, [BIN, '--site', SALIDA, '--output-subdir', 'pagefind', '--quiet'], { encoding: 'utf8' });
if (r.status === 0) {
  const archivos = fs.existsSync(path.join(SALIDA, 'pagefind')) ? fs.readdirSync(path.join(SALIDA, 'pagefind')).length : 0;
  console.log(`Buscador: índice armado (${archivos} archivos en out/pagefind).`);
} else {
  console.log(`Buscador: no se pudo armar el índice (${(r.stderr || r.stdout || `código ${r.status}`).toString().trim().split('\n').slice(-2).join(' ')}). El sitio sale igual.`);
}
process.exit(0);

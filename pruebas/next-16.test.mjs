// El sitio corre en Next 16 con React 19 (8/10/2026; la línea 15 deja de recibir parches el 21/10). En Next 16 `params` es siempre una promesa:
// leerlo directo (params.id) dejaba las páginas vacías sin avisar. Esta prueba lo cuida.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const web = (...r) => path.join(RAIZ, 'web', ...r);

function archivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? archivos(path.join(dir, d.name)) : [path.join(dir, d.name)]));
}

test('el sitio usa Next 16 y React 19', () => {
  const p = JSON.parse(fs.readFileSync(web('package.json'), 'utf8')).dependencies;
  assert.match(p.next, /^\^?16/);
  assert.match(p.react, /^\^?19/);
  assert.match(p['react-dom'], /^\^?19/);
});

test('ninguna página ni imagen lee `params` sin esperarlo (params.algo)', () => {
  for (const f of archivos(web('app')).filter((x) => /\.(js|mjs)$/.test(x))) {
    const codigo = fs.readFileSync(f, 'utf8').split(/\r?\n/).filter((l) => !l.trim().startsWith('//')).join('\n');
    // Hay `params` como variable propia en generateStaticParams (una lista): lo que no puede haber es leer una propiedad de la promesa.
    const malos = [...codigo.matchAll(/\bparams\.(id|ranura)\b/g)];
    assert.equal(malos.length, 0, `${path.relative(RAIZ, f)} lee params.${malos[0]?.[1]} sin await`);
    if (/\bfunction\s+\w+\(\{\s*params\s*\}\)/.test(codigo)) {
      assert.match(codigo, /await params/, `${path.relative(RAIZ, f)} recibe params y no lo espera`);
    }
  }
});

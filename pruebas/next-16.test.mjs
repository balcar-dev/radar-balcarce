// Next 16 y `params` (8/10/2026). En Next 16 `params` es siempre una promesa: leerlo directo (params.id) dejaba las páginas vacías sin avisar. El código
// ya lo espera (sirve igual en Next 15), así que el día que se pase a Next 16 no hay que tocar las páginas. Esta prueba lo cuida.
//
// OJO: el sitio SIGUE en Next 15 a propósito. Next 16 exporta, por cada página, cuatro archivos de más para la navegación (`__next._full.txt`,
// `_index`, `_tree` y uno por tramo): el despliegue pasó de 3.500 a 8.400 archivos con 1.100 notas. Cloudflare Pages acepta 20.000 por
// despliegue, y con 3.000 notas (pasaría a fin de noviembre) no entraría. Para el sitio exportado, Next 15 sin parches de servidor no
// corre ningún riesgo (no hay servidor); se pasa a 16 cuando haya menos archivos por página (fotos y archivo viejo en R2, etapa 2 de datos).
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

test('el sitio sigue en Next 15 hasta que haya menos archivos por página (Cloudflare Pages acepta 20.000 por despliegue)', () => {
  const p = JSON.parse(fs.readFileSync(web('package.json'), 'utf8')).dependencies;
  assert.match(p.next, /^\^?15\./);
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

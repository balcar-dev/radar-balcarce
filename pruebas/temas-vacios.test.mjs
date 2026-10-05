// 4/10/2026: "Actualizar la web" falló desde las 21:30 (la web se congeló) porque no había ningún tema vivo: generateStaticParams devolvía [] y Next
// (output: export) cortaba el armado: "Page /tema/[ranura]/opengraph-image is missing generateStaticParams()". Nunca puede devolver una lista vacía.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

test('sin ningún tema vivo, las páginas de temas arman una de relleno (que da "no encontrada") y con temas arman las suyas', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'temas-'));
  fs.mkdirSync(path.join(dir, 'data'));
  const antes = process.cwd();
  process.chdir(dir);
  try {
    const { ranurasDeTemasParaArmar } = await import('../web/lib/datos.js');
    fs.writeFileSync(path.join(dir, 'data', 'portada.json'), JSON.stringify({ notas: [], temas: [] }));
    assert.deepEqual(ranurasDeTemasParaArmar(), [{ ranura: 'ninguno' }]);
    await new Promise((r) => { setTimeout(r, 20); });
    fs.writeFileSync(path.join(dir, 'data', 'portada.json'), JSON.stringify({ notas: [], temas: [{ ranura: 'autodromo', nombre: 'El autódromo' }, { ranura: 'concejo', nombre: 'El Concejo' }] }));
    assert.deepEqual(ranurasDeTemasParaArmar(), [{ ranura: 'autodromo' }, { ranura: 'concejo' }]);
  } finally { process.chdir(antes); }
});

test('las dos rutas de temas usan la lista que nunca queda vacía, y el relleno no es un tema', () => {
  for (const f of ['web/app/tema/[ranura]/page.js', 'web/app/tema/[ranura]/opengraph-image.js']) {
    const c = leer(f);
    assert.match(c, /generateStaticParams\(\) \{\s*return ranurasDeTemasParaArmar\(\);/, f);
  }
  assert.match(leer('web/app/tema/[ranura]/page.js'), /if \(!nombre \|\| notas\.length === 0\) notFound\(\)/);
});

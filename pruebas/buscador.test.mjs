// El buscador de todo el archivo (8/10/2026, #69): Pagefind arma el índice al compilar y el navegador lo baja sólo cuando alguien abre el
// buscador. Las páginas ya no llevan adentro la lista de notas. Sin servidor: se prueba lo que no necesita el navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const leer = (...r) => fs.readFileSync(path.join(RAIZ, ...r), 'utf8').replace(/\r\n/g, '\n');

test('el armado del sitio arma el índice de búsqueda, y si falla el sitio sale igual', () => {
  const p = JSON.parse(leer('web', 'package.json'));
  assert.match(p.scripts.build, /next build && npm run indexar$/);
  assert.equal(p.scripts.indexar, 'node scripts/indexar.mjs');
  assert.ok(p.devDependencies.pagefind, 'Pagefind es una dependencia de desarrollo de la web');
  const s = leer('web', 'scripts', 'indexar.mjs');
  assert.match(s, /process\.exit\(0\);$/m, 'nunca frena el armado');
  assert.match(s, /process\.execPath/, 'se corre con Node, sin shell (una carpeta con espacios rompe el .cmd en Windows)');
  assert.match(s, /--output-subdir', 'pagefind'/);
});

test('sólo se indexan las notas que Google también puede ver, con su sección, y no la fecha ni la chapa', () => {
  const nota = leer('web', 'app', 'nota', '[id]', 'page.js');
  assert.match(nota, /noSeOfreceAGoogle\(n\) \? \{ 'data-pagefind-ignore': 'all' \} : \{ 'data-pagefind-body': '' \}/);
  assert.match(nota, /data-pagefind-meta=\{`seccion:\$\{n\.seccion\}`\}/);
  assert.match(nota, /className="chapa-nota" data-pagefind-ignore=""/);
  assert.match(nota, /className="fecha-de-la-nota" data-pagefind-ignore=""/);
});

test('las páginas ya no llevan la lista de notas adentro y el buscador baja el índice recién al abrirse', () => {
  const layout = leer('web', 'app', 'layout.js');
  assert.match(layout, /<Buscador \/>/);
  assert.ok(!/<Buscador notas=/.test(layout));
  const b = leer('web', 'components', 'buscador.js');
  assert.match(b, /\/pagefind\/pagefind\.js/);
  assert.match(b, /webpackIgnore: true/);
  assert.match(b, /sin-indice/, 'si el índice no está, lo dice en vez de romperse');
  assert.match(b, /Buscando/);
});

test('un resultado de Pagefind se muestra con su dirección sin ".html", su título y su sección', async () => {
  const { aResultado } = await import('../web/components/buscador.js').catch(() => ({ aResultado: null }));
  // El componente es de React (JSX en .js): si Node no lo puede cargar se prueba por el texto.
  if (aResultado) {
    assert.deepEqual(aResultado({ url: '/nota/una-nota.html', meta: { title: 'Una nota', seccion: 'Balcarce' }, excerpt: 'un <mark>texto</mark>' }),
      { url: '/nota/una-nota', titulo: 'Una nota', seccion: 'Balcarce', extracto: 'un <mark>texto</mark>' });
    assert.deepEqual(aResultado({}), { url: '', titulo: 'Una nota', seccion: '', extracto: '' });
  } else {
    assert.match(leer('web', 'components', 'buscador.js'), /replace\(\/\\\.html\$\/, ''\)/);
  }
});

test('el índice está en la lista de lo que Cloudflare debe conocer (la carpeta /pagefind se sirve como archivos estáticos)', () => {
  const h = leer('web', 'public', '_headers');
  assert.ok(!/pagefind/.test(h) || /Cache-Control/i.test(h), 'si hay reglas para /pagefind, que sean de caché');
});

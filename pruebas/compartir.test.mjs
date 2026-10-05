// 5/10/2026 (Hernán): "que sea más fácil copiar y pegar el mensaje y que pueda descargar el video". /compartir es una herramienta para pasar el dato, no una página de noticias.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

test('la página /compartir tiene los mensajes, los tres enlaces y los dos videos, y no nombra a ninguna persona', () => {
  const p = leer('web/app/compartir/page.js');
  for (const e of ['https://radarbalcarce.com', 'https://www.instagram.com/radarbalcarce', 'https://www.facebook.com/profile.php?id=61594865361170']) assert.ok(p.includes(e), e);
  assert.match(p, /Mensaje titulo="Mensaje corto/);
  assert.match(p, /Mensaje titulo="Mensaje personal/);
  assert.match(p, /radar-balcarce-vertical\.mp4/);
  assert.match(p, /radar-balcarce-horizontal\.mp4/);
  for (const prohibido of [/hern[aá]n/i, /andr[eé]s/i, /balcar-?dev/i, /gerace/i]) assert.doesNotMatch(p.replace(/\/\/.*$/gm, ''), prohibido);
});

test('los videos están en el sitio y pesan lo que corresponde para bajarlos por el celular', () => {
  for (const f of ['web/public/compartir/radar-balcarce-vertical.mp4', 'web/public/compartir/radar-balcarce-horizontal.mp4']) {
    const st = fs.statSync(path.join(RAIZ, f));
    assert.ok(st.size > 1_000_000 && st.size < 15_000_000, `${f}: ${st.size} bytes`);
  }
});

test('el botón de copiar y el de compartir el video están, con descarga directa de respaldo', () => {
  const c = leer('web/components/invitar.js');
  assert.match(c, /navigator\.clipboard\.writeText/);
  assert.match(c, /navigator\.share\(\{ files: \[f\]/);
  assert.match(c, /download>/);
});

test('/compartir no está en el menú, ni en el mapa del sitio, y los buscadores no la indexan', () => {
  assert.ok(!/href: '\/compartir'/.test(leer('web/app/layout.js')));
  assert.ok(!leer('web/app/sitemap.js').includes('/compartir'));
  assert.match(leer('web/app/compartir/page.js'), /robots: \{ index: false, follow: false \}/);
});

// Velocidad de las páginas (17/10/2026, regla 252): imágenes con tamaño, la principal prioritaria y el resto perezosas, nada de terceros.
// Primero con casos armados a mano; después, si el sitio está compilado en esta máquina (cd web && npm run build), con el HTML de verdad.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { atributosDe, etiquetasDe, problemasDeVelocidad, medidasDelHtml } from '../web/lib/auditoria-html.js';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

const BIEN = `<html><head>
<link rel="preload" href="/fuentes/source-serif-4-latin.woff2" as="font" type="font/woff2" crossorigin=""/>
<link rel="preload" href="/fuentes/inter-latin.woff2" as="font" type="font/woff2" crossorigin=""/>
<link rel="stylesheet" href="/_next/static/css/abc.css"/>
<script src="/_next/static/chunks/main.js" async=""></script></head><body>
<img src="/fotos-notas/a.jpg" alt="" width="1200" height="900" decoding="async" fetchpriority="high"/>
<img src="/fotos-notas/b.jpg" alt="" width="1200" height="900" decoding="async" loading="lazy"/>
<img src="/escudos/x.png" alt="" width="28" height="28" loading="lazy" decoding="async"/>
</body></html>`;

test('se leen los atributos de una etiqueta, en minúsculas y con valores vacíos', () => {
  assert.deepEqual(atributosDe('<img src="/a.jpg" ALT="" width=1200 fetchPriority="high" async/>'), { src: '/a.jpg', alt: '', width: '1200', fetchpriority: 'high', async: '' });
  assert.equal(etiquetasDe(BIEN, 'img').length, 3);
});

test('una página bien hecha no tiene problemas', () => {
  assert.deepEqual(problemasDeVelocidad(BIEN, { pagina: '/' }), []);
  const m = medidasDelHtml(BIEN);
  assert.equal(m.imagenes, 3);
  assert.equal(m.perezosas, 2);
  assert.equal(m.scripts, 1);
  assert.equal(m.hojas, 1);
});

test('una imagen sin ancho o sin alto se marca', () => {
  const p = problemasDeVelocidad('<img src="/f.jpg" alt="" loading="lazy" width="10"/><img src="/g.jpg" alt="" height="10" loading="lazy"/>', { pagina: '/x' });
  assert.equal(p.filter((t) => /no tiene width y height/.test(t)).length, 2);
  assert.match(p[0], /^\/x: /);
});

test('la imagen sin alt se marca, la de alt vacío (decorativa) no', () => {
  assert.equal(problemasDeVelocidad('<img src="/f.jpg" width="1" height="1" loading="lazy"/>').filter((t) => /alt/.test(t)).length, 1);
  assert.equal(problemasDeVelocidad('<img src="/f.jpg" alt="" width="1" height="1" loading="lazy"/>').length, 0);
});

test('una sola imagen prioritaria, y nunca perezosa; las demás, perezosas', () => {
  const dos = '<img src="/a.jpg" alt="" width="1" height="1" fetchpriority="high"/><img src="/b.jpg" alt="" width="1" height="1" fetchpriority="high"/>';
  assert.match(problemasDeVelocidad(dos).join('\n'), /2 imágenes con fetchpriority="high"/);
  const mezcla = '<img src="/a.jpg" alt="" width="1" height="1" fetchpriority="high" loading="lazy"/>';
  assert.match(problemasDeVelocidad(mezcla).join('\n'), /perezosa y prioritaria/);
  const eager = '<img src="/a.jpg" alt="" width="1" height="1"/>';
  assert.match(problemasDeVelocidad(eager).join('\n'), /no es la principal y no es loading="lazy"/);
});

test('se marcan los recursos de terceros, las tipografías de Google y los scripts que frenan', () => {
  const malo = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter"/>
<script src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>
<script src="/_next/static/chunks/main.js"></script>`;
  const t = problemasDeVelocidad(malo).join('\n');
  assert.match(t, /recurso de otro dominio/);
  assert.match(t, /script de otro dominio/);
  assert.match(t, /sin async ni defer/);
  assert.match(t, /tipografías a Google/);
  const tres = ['a', 'b', 'c'].map((n) => `<link rel="preload" href="/fuentes/${n}.woff2" as="font"/>`).join('');
  assert.match(problemasDeVelocidad(tres).join('\n'), /precarga 3 tipografías/);
});

test('los componentes que dibujan fotos las dibujan con tamaño y con carga perezosa (salvo la principal)', () => {
  assert.match(leer('web/components/postales.js'), /\{\.\.\.\(indice === 0 \? \{ fetchPriority: 'high' \} : \{ loading: 'lazy' \}\)\}/);
  assert.match(leer('web/components/postales.js'), /<img src=\{urlDeFoto\(foto\.archivo\)\} alt="" width=\{240\} height=\{180\} loading="lazy"/);
  assert.match(leer('web/app/nota/[id]/page.js'), /width=\{1200\}\s+height=\{675\}\s+decoding="async"\s+fetchPriority="high"/);
  assert.match(leer('web/components/imagen-destacada.js'), /width=\{1200\} height=\{675\}[^>]*fetchPriority="high"/);
  assert.match(leer('web/components/avisos.js'), /width=\{40\} height=\{40\} loading="lazy"/);
  // Y el control corre con cada compilación, antes de publicar.
  assert.match(leer('web/scripts/revisar-seo.mjs'), /problemasDeVelocidad\(html, \{ pagina: donde \}\)/);
});

test('la hoja de estilos no pide nada de afuera y las tipografías son las del propio sitio', () => {
  const css = leer('web/app/globals.css');
  assert.ok(!/@import\s+url\(["']?https?:/i.test(css), 'la hoja importa algo de otro dominio');
  assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(css));
  assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(leer('web/app/layout.js')));
  assert.equal((css.match(/font-display: swap/g) ?? []).length >= 4, true, 'las tipografías tienen que mostrar texto mientras bajan (font-display: swap)');
});

// ----------------------------------------------------------- el sitio compilado, si está

const SALIDA = path.join(import.meta.dirname, '..', 'web', '.next', 'server', 'app');
const compilado = fs.existsSync(path.join(SALIDA, 'index.html'));

test('el HTML compilado de la portada, las secciones, /hoy y las notas no tiene problemas de velocidad', { skip: !compilado && 'el sitio no está compilado en esta máquina (cd web && npm run build)' }, () => {
  const paginas = [['/', 'index.html'], ['/hoy', 'hoy.html']];
  for (const carpeta of ['nota', 'seccion']) {
    const dir = path.join(SALIDA, carpeta);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.html'))) paginas.push([`/${carpeta}/${f}`, path.join(carpeta, f)]);
  }
  assert.ok(paginas.length > 10, 'casi no hay páginas compiladas');
  const problemas = [];
  for (const [donde, archivo] of paginas) {
    if (fs.existsSync(path.join(SALIDA, archivo))) problemas.push(...problemasDeVelocidad(fs.readFileSync(path.join(SALIDA, archivo), 'utf8'), { pagina: donde }));
  }
  assert.deepEqual(problemas.slice(0, 5), [], `${problemas.length} problemas de velocidad`);
});

test('el HTML compilado de una nota pesa poco y la foto principal viene primero y prioritaria', { skip: !compilado && 'el sitio no está compilado en esta máquina (cd web && npm run build)' }, () => {
  const dir = path.join(SALIDA, 'nota');
  const conFoto = fs.readdirSync(dir).filter((f) => f.endsWith('.html'))
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
    .find((h) => /<img [^>]*fetchpriority="high"/i.test(h));
  assert.ok(conFoto, 'ninguna nota compilada tiene su foto principal prioritaria');
  const m = medidasDelHtml(conFoto);
  assert.ok(m.bytes < 150_000, `el HTML de una nota pesa ${m.bytes} bytes`);
  assert.ok(m.scripts <= 12, `${m.scripts} scripts en una nota`);
  assert.equal(m.hojas <= 2, true, `${m.hojas} hojas de estilo`);
});

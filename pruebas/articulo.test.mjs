// El texto de la nota original, sacado de la página del medio. Sin red.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extraerTexto, traerTexto } from '../ingesta/articulo.mjs';

const P1 = 'El municipio anunció que este viernes se reinaugura el autódromo con la presencia de autoridades provinciales y pilotos.';
const P2 = 'Las actividades comenzarán a las diez de la mañana y se extenderán hasta la tarde, con entrada libre y gratuita para todos.';
const P3 = 'Habrá vuelta de reconocimiento, exhibiciones y una charla abierta con los pilotos que participaron en la recuperación del circuito.';

const PAGINA = `<html><body>
  <nav><p>Compartir en Facebook y Twitter con todos tus amigos ahora mismo</p></nav>
  <article><h1>Título</h1><p>${P1}</p><p>${P2}</p><p>Leer más: otras notas que te pueden interesar hoy en la web</p><p>${P3}</p></article>
  <footer><p>© 2026 Todos los derechos reservados por el medio de comunicación</p></footer>
</body></html>`;

test('junta los párrafos de la nota y deja afuera menú, pie y "leer más"', () => {
  const t = extraerTexto(PAGINA);
  assert.ok(t.includes(P1) && t.includes(P2) && t.includes(P3));
  assert.ok(!/Compartir|Leer más|©/.test(t));
});

test('con poco texto devuelve null: mejor reescribir sólo con el resumen', () => {
  assert.equal(extraerTexto('<article><p>Muy corto.</p></article>'), null);
});

test('las entidades HTML se leen como texto normal', () => {
  const t = extraerTexto(`<article><p>${P1.replace('autódromo', 'aut&oacute;dromo')}</p><p>${P2}</p><p>${P3}</p></article>`);
  assert.ok(t.includes('autódromo'));
});

test('no pasa del máximo', () => {
  const largo = `<article>${`<p>${P1} ${P2}</p>`.repeat(60).replace(/(\d)/g, '')}</article>`;
  assert.ok(extraerTexto(largo, { max: 500 }) === null || extraerTexto(largo, { max: 500 }).length <= 500);
});

test('si la página no responde, devuelve null en vez de romper', async () => {
  assert.equal(await traerTexto('https://x', { fetchFn: async () => { throw new Error('caído'); } }), null);
  assert.equal(await traerTexto('https://x', { fetchFn: async () => ({ ok: false }) }), null);
});

test('baja la página y devuelve el texto', async () => {
  const t = await traerTexto('https://x', { fetchFn: async () => ({ ok: true, text: async () => PAGINA }) });
  assert.ok(t.includes(P2));
});

// 25/09: de 42 notas publicadas sin cuerpo, 21 no tenían el texto completo
// por culpa de este extractor, no del medio. Dos casos reales:

test('La Nación, Olé, Ámbito…: el primer <article> es una tarjeta, no la nota; igual encuentra la nota', () => {
  const tarjeta = '<article class="relacionada"><p>Otra nota que no tiene nada que ver con esta y que aparece arriba.</p></article>';
  const relleno = '<div class="menu">' + 'x'.repeat(8000) + '</div>';
  const pagina = `<html><body>${tarjeta}${relleno}<div class="cuerpo"><p>${P1}</p><div class="aviso">publicidad</div><p>${P2}</p><p>${P3}</p></div>${relleno}<article><p>Más notas relacionadas con títulos largos para leer después.</p></article></body></html>`;
  const t = extraerTexto(pagina);
  assert.ok(t && t.includes(P1) && t.includes(P2) && t.includes(P3), t);
  assert.ok(!t.includes('Otra nota que no tiene nada que ver'), 'se coló una tarjeta relacionada');
});

test('Infórmese Primero (Blogger): el enlace es una entrada de feed Atom y el texto viene escapado adentro', () => {
  const html = `<p></p><div class="separator"><a href="x"><img src="y.jpg" /></a></div>${P1}<p></p><p>${P2}</p><p><b>Un subtítulo</b></p><p>${P3}</p>`;
  const escapado = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const xml = `<?xml version='1.0' encoding='UTF-8'?><?xml-stylesheet href="http://www.blogger.com/styles/atom.css" type="text/css"?><entry xmlns='http://www.w3.org/2005/Atom'><title type='text'>Título</title><content type='html'>${escapado}</content><link rel='alternate' type='text/html' href='http://www.informeseprimero.com.ar/x.html'/></entry>`;
  const t = extraerTexto(xml);
  assert.ok(t && t.includes(P1) && t.includes(P2) && t.includes(P3), t);
  assert.ok(!t.includes('<'), 'quedaron etiquetas');
});

test('sin enlace no sale a buscar nada', async () => {
  let pidio = false;
  assert.equal(await traerTexto(undefined, { fetchFn: async () => { pidio = true; return { ok: true, text: async () => PAGINA }; } }), null);
  assert.equal(pidio, false);
});

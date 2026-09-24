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

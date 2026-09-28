// El sistema tipográfico de las tarjetas de servicio (web/app/globals.css) y el
// dólar sin corrimientos. Sin red, sin navegador: lee la hoja de
// estilo y los componentes. (Las medidas reales, columna por columna y ancho por
// ancho, se tomaron en el navegador: ver web/README.md.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pesos, pesosEnteros, hayCentavos, filasDelPanel } from '../web/lib/dolar.js';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8').replace(/\r\n/g, '\n');
const css = leer('web/app/globals.css');

/** El cuerpo de la primera regla que empieza con exactamente este selector. */
function regla(selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = css.match(new RegExp(`(?:^|\\n)${esc}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `no hay una regla para ${selector}`);
  return m[1];
}

test('las variables del sistema tipográfico existen', () => {
  for (const v of [
    '--f-titulo', '--f-texto', '--t-etiqueta', '--ls-etiqueta', '--t-meta', '--t-texto',
    '--t-accion', '--t-dato', '--t-dato-grande', '--t-cifra', '--t-titulo-tarjeta',
    '--suave-oscuro', '--pad-tarjeta', '--radio-tarjeta',
  ]) {
    assert.match(css, new RegExp(`\\n\\s*${v}:\\s*[^;]+;`), `falta ${v}`);
  }
  assert.match(css, /sistema tipográfico/, 'el sistema está documentado al principio del bloque');
});

test('la letra de los títulos no se usa en cifras ni en nombres de servicio', () => {
  // Los datos van en la letra de texto (--f-texto), con cifras tabulares.
  for (const sel of ['.nombre-farmacia', '.tarjeta-clima .temp', '.taco .dia', '.cabeza-dolar h2']) {
    const r = regla(sel);
    assert.match(r, /font-family:\s*var\(--f-texto\)/, `${sel} tiene que ir en la sans`);
    assert.ok(!/--f-titulo|Serif/.test(r), `${sel} no usa la letra de los títulos`);
  }
});

test('el nombre de la farmacia es un dato: mismo tamaño que los demás datos y en tinta', () => {
  const r = regla('.nombre-farmacia');
  assert.match(r, /font-size:\s*var\(--t-dato\)/);
  assert.match(r, /color:\s*var\(--tinta\)/);
  assert.ok(!/var\(--rojo\)/.test(r), 'el rojo es el acento de las acciones, no del dato');
  assert.ok(!/@media[^{]*\{\s*\.nombre-farmacia/.test(css), 'sin tamaño distinto en pantalla grande');
});

test('todas las tarjetas usan la etiqueta única y el enlace de acción único', () => {
  const r = regla('.meta, .etiqueta');
  assert.match(r, /font-size:\s*var\(--t-etiqueta\)/);
  assert.match(r, /letter-spacing:\s*var\(--ls-etiqueta\)/);
  assert.match(r, /text-transform:\s*uppercase/);
  const accion = css.match(/\n\.accion,[^{]*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(accion, /font-size:\s*var\(--t-accion\)/);
  assert.match(accion, /color:\s*var\(--rojo\)/);
  for (const clase of ['.ver-todo', '.ver-semana']) {
    assert.ok(css.match(/\n\.accion,[^{]*/)[0].includes(clase), `${clase} comparte el estilo de la acción`);
  }
  // Los componentes usan la etiqueta y la cabecera común, sin tamaños a mano.
  const piezas = leer('web/components/piezas.js');
  const clima = leer('web/components/clima-vivo.js');
  const pagina = leer('web/app/page.js');
  for (const [nombre, fuente] of [['piezas', piezas], ['clima', clima], ['portada', pagina]]) {
    assert.match(fuente, /className="cabecera-tarjeta"/, `${nombre} usa la cabecera común`);
    assert.match(fuente, /className="etiqueta"/, `${nombre} usa la etiqueta única`);
  }
  assert.ok(!/fontSize:\s*12\.5/.test(pagina), 'la portada no tiene tamaños sueltos en las acciones');
  assert.match(pagina, /className="accion">Toda la guía →/);
  assert.match(pagina, /className="accion">Toda la agenda →/);
  assert.match(piezas, /className="accion ver-semana"><span className="solo-lg">Ver <\/span>la semana →/);
});

test('el puntito de estado es uno solo, del mismo tamaño en todas las tarjetas', () => {
  assert.match(css, /\.punto-vivo \{ width: 6px; height: 6px;/);
  assert.ok(!/\.en-vivo\b/.test(css), 'no hay un segundo puntito');
  assert.ok(!/en-vivo/.test(leer('web/components/clima-vivo.js')));
});

test('las tarjetas grandes de /dolar: mismo tamaño de cifra, tabulares y sin desborde', () => {
  const precio = regla('.precios-dolar .precio');
  assert.match(precio, /clamp\([^;]*cqw[^;]*\)/);
  assert.match(precio, /font-variant-numeric:\s*tabular-nums/);
  assert.match(precio, /white-space:\s*nowrap/);
  assert.match(css, /\.tarjeta-dolar \{ container-type: inline-size;/);
  assert.match(regla('.cabeza-dolar'), /flex-wrap:\s*wrap/);
});

test('el dólar de la portada muestra pesos enteros, y una falta de compra queda en null', () => {
  assert.equal(pesosEnteros(1549.8), '$1.550');
  assert.equal(pesosEnteros(1545), '$1.545');
  assert.equal(pesosEnteros(10000), '$10.000');
  assert.equal(pesosEnteros(1234567.4), '$1.234.567');
  assert.equal(pesosEnteros(null), '—');
  assert.equal(pesosEnteros(NaN), '—');
  // En la portada el dólar es un renglón de "Hoy en Balcarce" (28/09).
  const hoy = leer('web/components/hoy-balcarce.js');
  assert.match(hoy, /pesosEnteros\(/);
  assert.ok(!/\bpesos\(/.test(hoy), 'el dólar de la portada nunca muestra centavos');
  const filas = filasDelPanel([{ casa: 'oficial', compra: null, venta: 1500, fecha: '2026-09-25T12:00:00Z' }]);
  assert.equal(filas[0].compra, null);
});

test('/dolar: los centavos, todos o ninguno, para que las cifras alineen', () => {
  assert.equal(pesos(1545), '$1.545');
  assert.equal(pesos(1549.8), '$1.549,80');
  assert.equal(pesos(1545, { centavos: 'siempre' }), '$1.545,00');
  assert.equal(pesos(10000.5, { centavos: 'siempre' }), '$10.000,50');
  assert.equal(hayCentavos([{ compra: 1495, venta: 1545 }]), false);
  assert.equal(hayCentavos([{ compra: 1495, venta: 1545 }, { compra: null, venta: 1549.8 }]), true);
  const vivo = leer('web/components/dolar-vivo.js');
  assert.match(vivo, /hayCentavos\(lista\)/);
  assert.match(vivo, /pesos\(c\.compra, opciones\)/);
  assert.match(vivo, /pesos\(c\.venta, opciones\)/);
});

test('/dolar y el dólar de la portada siguen sin decir "en vivo"', () => {
  for (const f of ['web/app/dolar/page.js', 'web/components/dolar-vivo.js', 'web/components/hoy-balcarce.js']) {
    const sin = leer(f).replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/en vivo/i.test(sin.replace(/"nunca dice[^"]*"/g, '')), `${f} no dice "en vivo"`);
  }
});

test('la barra de navegación no se pasa del ancho entre 900 y 1180px', () => {
  // Desde 900px envuelve; sólo desde 1180px entra todo en una línea y queda fija arriba.
  assert.match(css, /@media \(min-width: 1180px\) \{\s*nav\.principal \{ position: sticky;[^}]*\}\s*nav\.principal \.envoltura \{ height: 52px; flex-wrap: nowrap;/);
});

test('el HTML compilado tiene las clases del sistema (si ya se compiló)', (t) => {
  const f = path.join(RAIZ, 'web/out/index.html');
  if (!fs.existsSync(f)) { t.skip('todavía no se compiló el sitio'); return; }
  const html = fs.readFileSync(f, 'utf8');
  if (!/class="etiqueta"/.test(html)) { t.skip('la compilación es de antes del sistema tipográfico'); return; }
  assert.match(html, /class="cabecera-tarjeta"/);
  // Desde el 28/09 la farmacia de la portada es una tarjeta de "Hoy en Balcarce".
  assert.match(html, /class="etiqueta-hoy"[^>]*>De turno/);
  assert.match(html, /class="etiqueta">Agenda de Balcarce/);
  assert.match(html, /class="etiqueta">Números útiles/);
  assert.match(html, /class="tarjeta tarjeta-util"/);
  assert.match(html, /class="accion">Toda la guía →/);
  const d = path.join(RAIZ, 'web/out/dolar.html');
  if (fs.existsSync(d)) assert.ok(!/en vivo/i.test(fs.readFileSync(d, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '')));
});

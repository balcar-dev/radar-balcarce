// Lo que pidieron Hernán y Andrés viendo el sitio en el celular (25/09): el
// menú en una fila, las tarjetas de servicio compactas, la farmacia con
// identidad y las letras de los títulos sin las formas "wonky".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { enlaceDeLlamada } from '../web/lib/farmacias.js';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const css = leer('web/app/globals.css');

// ------------------------------------------------ el menú, en una fila

test('el menú de secciones es una sola fila que se desliza en el celular, con degradé y toques de 44px', () => {
  const nav = leer('web/components/navegacion.js');
  const layout = leer('web/app/layout.js');
  assert.match(layout, /<Navegacion/);
  assert.ok(!/<nav className="principal">/.test(layout), 'el menú lo dibuja el componente');
  // Servicios al final y en verde.
  assert.match(layout, /servicios=\{\[[\s\S]*Agenda[\s\S]*Farmacias[\s\S]*Dólar[\s\S]*Teléfonos/);
  assert.match(nav, /aria-current/);
  assert.match(nav, /hay-mas/);
  const base = css.slice(css.indexOf('nav.principal .envoltura {'));
  assert.match(base, /flex-wrap:\s*nowrap/);
  assert.match(base, /overflow-x:\s*auto/);
  assert.match(base, /scroll-snap-type:\s*x proximity/);
  assert.match(css, /nav\.principal \.envoltura::-webkit-scrollbar \{ display: none; \}/, 'sin barra visible');
  assert.match(css, /nav\.principal::after \{[^}]*linear-gradient/, 'degradé en el borde derecho');
  assert.match(css, /nav\.principal a \{[^}]*min-height:\s*44px/);
  // En escritorio vuelve a envolver, sin deslizar.
  assert.match(css, /@media \(min-width: 900px\) \{\s*nav\.principal::after \{ display: none; \}[\s\S]*?flex-wrap: wrap;[\s\S]*?overflow: visible/);
});

// ------------------------------------------ servicios compactos (celular)

test('las tarjetas de servicio se compactan sólo en el celular y el MEP queda para escritorio', () => {
  const i = css.indexOf('@media (max-width: 619px) {\n  .dos-columnas .servicios');
  assert.ok(i > 0, 'hay un bloque de celular para los servicios');
  const bloque = css.slice(i);
  assert.match(bloque, /\.fila-panel-dolar:nth-child\(n\+3\) \{ display: none; \}/);
  assert.match(bloque, /\.tira-dias \.lluvia-chica \{ display: inline;/);
  // Va al final de la hoja: si otra regla base va después, le gana.
  assert.ok(css.lastIndexOf('.tira-dias .min.con-lluvia { display: none; }') < i);
  // La columna de escritorio no se achica: la grilla de dos columnas sigue igual.
  assert.match(css, /@media \(min-width: 980px\) \{\s*\.dos-columnas \{ grid-template-columns: minmax\(0, 1fr\) 340px;/);
});

test('el dólar del celular mantiene la grilla alineada de tres columnas', () => {
  assert.match(css, /\.filas-panel-dolar \{[^}]*grid-template-columns:\s*max-content minmax\(0, 1fr\) max-content/);
  assert.match(css, /\.fila-panel-dolar \{[^}]*grid-template-columns:\s*subgrid/);
});

// -------------------------------------------- la farmacia, con identidad

test('la tarjeta de la farmacia lleva cruz verde, píldora de turno y botones Llamar y Cómo llegar', () => {
  const piezas = leer('web/components/piezas.js');
  assert.match(piezas, /export function CruzFarmacia/);
  assert.match(piezas, /tarjeta tarjeta-farmacia/);
  assert.match(piezas, /className="pastilla-turno"/);
  assert.match(piezas, /Llamar<\/a>/);
  assert.match(piezas, /Cómo llegar<\/a>/);
  assert.match(piezas, /enlaceDeLlamada\(f\.telefono\)/);
  assert.match(css, /--farmacia:\s*#0E7C45/);
  assert.match(css, /\.tarjeta-farmacia \{ border-top: 4px solid var\(--farmacia\); \}/);
  // Sin imágenes de afuera: la cruz es un SVG propio.
  assert.ok(!/<img|https?:\/\/[^'"]*\.(png|jpg|svg)/.test(piezas));
});

test('el enlace de llamada arma el número completo para marcar desde un celular', () => {
  assert.equal(enlaceDeLlamada('42-2106'), 'tel:+542266422106');
  assert.equal(enlaceDeLlamada('15-677121'), 'tel:+5492266677121');
  assert.equal(enlaceDeLlamada('2266 42-2106'), 'tel:+542266422106');
  assert.equal(enlaceDeLlamada(null), null);
  assert.equal(enlaceDeLlamada(''), null);
  assert.equal(enlaceDeLlamada('sin teléfono'), null);
});

test('/farmacias destaca la de turno con la misma tarjeta y ordena la semana sin repetir hoy', () => {
  const p = leer('web/app/farmacias/page.js');
  assert.match(p, /<TarjetaFarmacia farmacia=\{f\.hoy\}/);
  assert.match(p, /t\.fecha !== f\.hoy\.fecha/);
  assert.match(p, /className="taco-turno"/);
  assert.match(p, /enlaceDeLlamada\(x\.telefono\)/);
});

// -------------------------------------------------------- tipografía

test('Fraunces se pide con el eje WONK y se usa con WONK 0 y SOFT 0, con cifras alineadas a la línea base', () => {
  const layout = leer('web/app/layout.js');
  assert.match(layout, /family=Fraunces:opsz,wght,WONK@9\.\.144,500\.\.900,0\.\.1/);
  assert.ok(!/family=Fraunces:opsz,wght@/.test(layout), 'sin el eje WONK no hay forma de apagar el wonk');
  assert.match(css, /html \{ font-variation-settings: "WONK" 0, "SOFT" 0; \}/);
  assert.match(css, /h1, h2, h3, \.fraunces \{[^}]*font-variant-numeric:\s*lining-nums proportional-nums/);
});

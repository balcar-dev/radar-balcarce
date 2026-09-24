// Lo que ve un buscador de nuestras páginas: íconos, títulos, encabezados.
//
// El 24/09 se auditó el sitio publicado y no tenía ícono, la portada y las
// secciones no tenían un h1, las notas tenían títulos de más de 70 caracteres
// y las secciones compartían la misma descripción. Esto vigila que no vuelva.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { recortarEn } from '../web/lib/texto.js';

const RAIZ = path.join(import.meta.dirname, '..', 'web');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');

// ----------------------------------------------------- recortar títulos

test('un texto corto no se toca', () => {
  assert.equal(recortarEn('Un título corto', 60), 'Un título corto');
});

test('un texto largo se corta en una palabra entera y termina en puntos suspensivos', () => {
  const r = recortarEn('Ferroviarios se consagró campeón de básquet en una final apretadísima', 40);
  assert.ok(r.length <= 40, `mide ${r.length}`);
  assert.ok(r.endsWith('…'));
  assert.ok(!/\s…$/.test(r), 'dejó un espacio antes de los puntos');
  assert.ok('Ferroviarios se consagró campeón de básquet en una final apretadísima'.startsWith(r.slice(0, -1)), 'cortó por la mitad de una palabra');
});

test('no deja una coma ni un guion colgando antes de los puntos', () => {
  const r = recortarEn('Balcarce, la ciudad de Fangio, recibe a los pilotos - y a todo el país', 32);
  assert.ok(!/[,\-–—.;:]…$/.test(r), r);
});

test('espacios de sobra y saltos de línea se limpian', () => {
  assert.equal(recortarEn('  Una   nota\n con  espacios  ', 60), 'Una nota con espacios');
});

// ------------------------------------------------------------- íconos

test('están todos los íconos que piden los navegadores y los celulares', () => {
  for (const f of ['favicon.ico', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'manifest.webmanifest']) {
    assert.ok(fs.existsSync(path.join(RAIZ, 'public', f)), `falta web/public/${f}`);
  }
});

test('favicon.ico es un ícono de verdad, con varios tamaños', () => {
  const b = fs.readFileSync(path.join(RAIZ, 'public', 'favicon.ico'));
  assert.equal(b.readUInt16LE(0), 0, 'cabecera');
  assert.equal(b.readUInt16LE(2), 1, 'no es un .ico');
  assert.ok(b.readUInt16LE(4) >= 2, 'tiene un solo tamaño');
});

test('los PNG son cuadrados y del tamaño que dicen', () => {
  for (const [f, t] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
    const b = fs.readFileSync(path.join(RAIZ, 'public', f));
    assert.equal(b.subarray(1, 4).toString(), 'PNG');
    assert.equal(b.readUInt32BE(16), t, `${f}: ancho`);
    assert.equal(b.readUInt32BE(20), t, `${f}: alto`);
  }
});

test('el manifiesto apunta a íconos que existen', () => {
  const m = JSON.parse(leer('public/manifest.webmanifest'));
  assert.equal(m.name, 'Radar Balcarce');
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(RAIZ, 'public', i.src.replace(/^\//, ''))), i.src);
});

test('el layout declara los íconos y el manifiesto', () => {
  const l = leer('app/layout.js');
  for (const s of ['/favicon.ico', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/manifest.webmanifest']) {
    assert.ok(l.includes(s), `el layout no menciona ${s}`);
  }
});

// -------------------------------------------------- encabezados y títulos

test('la portada tiene un h1 y un título que dice qué es', () => {
  const p = leer('app/page.js');
  assert.match(p, /<h1 className="solo-lectores">/);
  assert.match(p, /absolute: 'Radar Balcarce · Noticias de Balcarce/);
});

test('cada página de sección tiene un h1 y su propia tarjeta para compartir', () => {
  assert.match(leer('app/seccion/[ranura]/page.js'), /<h1 style=\{\{ fontSize: 28 \}\}>/);
  assert.ok(fs.existsSync(path.join(RAIZ, 'app/seccion/[ranura]/opengraph-image.js')));
});

test('la descripción de una sección nombra las últimas notas: no es igual para todas', () => {
  const s = leer('app/seccion/[ranura]/page.js');
  assert.match(s, /ultimas/);
  assert.ok(!s.includes('Todo lo que publicamos en ${nombreCorto(s.nombre)}, en Radar Balcarce.'));
});

test('los títulos y descripciones de las notas se recortan al largo que muestra Google', () => {
  const n = leer('app/nota/[id]/page.js');
  assert.match(n, /title: recortarEn\(n\.titulo, \d+\)/);
  assert.match(n, /recortarEn\(n\.copete[^)]*, 155\)/);
});

test('las analíticas de Vercel ya no están: en Cloudflare pedían un archivo que no existe', () => {
  assert.ok(!leer('app/layout.js').includes('@vercel/analytics'));
  assert.ok(!leer('package.json').includes('@vercel/analytics'));
});

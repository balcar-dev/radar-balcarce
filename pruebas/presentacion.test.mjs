// El video de presentación para el público general (4/10/2026, Hernán): sin nombres de personas, sólo lo que el sistema hace de verdad,
// y las escenas se acomodan a lo que dura la voz.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ESCENAS, GUION, FORMATOS, duracionesDeLasEscenas, cuadro } from '../reels/presentacion.mjs';

const leer = (f) => fs.readFileSync(path.join(import.meta.dirname, '..', f), 'utf8');

test('el video para el público general no nombra a ninguna persona ni al usuario de la cuenta', () => {
  const todo = [GUION, ...ESCENAS.map((e) => e.caption), leer('reels/presentacion.mjs').split('// ---')[1] ?? ''].join('\n');
  for (const prohibido of [/hern[aá]n/i, /andr[eé]s/i, /balcar-?dev/i, /gerace/i]) assert.doesNotMatch(todo, prohibido, String(prohibido));
});

test('cada escena tiene lo que se dice y lo que se lee, y el cierre dice dónde encontrarnos', () => {
  assert.equal(ESCENAS.length, 8);
  for (const e of ESCENAS) { assert.ok(e.voz.length > 20, e.id); assert.ok(e.caption.length > 10, e.id); }
  assert.match(GUION, /radarbalcarce punto com/, 'la voz dice la dirección como se pronuncia');
  const dibujo = cuadro(FORMATOS.vertical, 1, duracionesDeLasEscenas()).length + cuadro(FORMATOS.horizontal, 1, duracionesDeLasEscenas()).length;
  assert.ok(dibujo > 1000);
});

test('con audio, las escenas se reparten el tiempo en proporción a lo que se dice y suman lo que dura la voz', () => {
  const d = duracionesDeLasEscenas(48);
  assert.equal(d.length, ESCENAS.length);
  assert.ok(Math.abs(d.reduce((a, b) => a + b, 0) - 48) < 1e-9);
  assert.ok(d.every((x) => x > 1.5), 'ninguna escena queda cortita');
  const sin = duracionesDeLasEscenas();
  assert.ok(sin.every((x) => x >= 4.2));
});

test('cada cuadro es un SVG de su tamaño, en los dos formatos, de principio a fin', () => {
  const d = duracionesDeLasEscenas();
  const total = d.reduce((a, b) => a + b, 0);
  for (const f of Object.values(FORMATOS)) {
    for (const tt of [0, 1.5, total / 3, total / 2, total - 0.1]) {
      const svg = cuadro(f, tt, d);
      assert.match(svg, new RegExp(`^<svg [^>]*width="${f.W}" height="${f.H}"`));
      assert.ok(!/NaN|undefined/.test(svg), `${f.nombre} ${tt}: tiene NaN o undefined`);
    }
  }
});

test('el archivo no importa ffmpeg al cargarlo (GitHub Actions no instala dependencias)', () => {
  const codigo = leer('reels/presentacion.mjs');
  assert.ok(!/^import .* from 'ffmpeg-static'/m.test(codigo));
  assert.match(codigo, /await import\('ffmpeg-static'\)/);
});

// Títulos sin "en Balcarce" al final y un color distinto por sección
// (27/09, Hernán).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sinBalcarceAlFinal } from '../web/lib/titulos.js';
import { SECCIONES } from '../web/lib/datos.js';

test('los títulos automáticos no terminan en "en Balcarce"', () => {
  // El 27/09, 44 de las 66 notas de la portada terminaban así.
  assert.equal(sinBalcarceAlFinal('Bomberos controlan un principio de incendio en Balcarce'), 'Bomberos controlan un principio de incendio');
  assert.equal(sinBalcarceAlFinal('Kicillof visita Balcarce y Lobería junto a los intendentes en Balcarce'), 'Kicillof visita Balcarce y Lobería junto a los intendentes');
  assert.equal(sinBalcarceAlFinal('Hernán Palazzo gana en el regreso del TC Pick Up en Balcarce.'), 'Hernán Palazzo gana en el regreso del TC Pick Up');
  // Balcarce en otro lugar del título queda.
  assert.equal(sinBalcarceAlFinal('Balcarce pierde el subsidio al gas'), 'Balcarce pierde el subsidio al gas');
  // Si lo que queda no se sostiene solo, se deja.
  assert.equal(sinBalcarceAlFinal('Llueve en Balcarce'), 'Llueve en Balcarce');
  assert.equal(sinBalcarceAlFinal(null), '');
});

test('la instrucción de la IA dice que el título nunca termina en "en Balcarce"', () => {
  const criterio = fs.readFileSync(new URL('../CRITERIO-EDITORIAL.md', import.meta.url), 'utf8');
  assert.match(criterio, /NUNCA termina en "en Balcarce"/);
  assert.doesNotMatch(criterio, /va "en Balcarce" al final/);
});

const css = fs.readFileSync(new URL('../web/app/globals.css', import.meta.url), 'utf8');
const colorDe = (s) => css.match(new RegExp(`--s-${s.ranura}:\\s*(#[0-9A-Fa-f]{6})`))?.[1]?.toUpperCase();
const tono = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b); const mn = Math.min(r, g, b); const d = mx - mn;
  if (d < 0.15) return null; // un gris no compite por tono
  const x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (x * 60 + 360) % 360;
};

test('cada sección tiene su color, y no hay dos del mismo tono', () => {
  const colores = SECCIONES.map((s) => [s.nombre, s.color.includes('--s-pais') ? css.match(/--s-pais:\s*(#[0-9A-Fa-f]{6})/)[1].toUpperCase() : colorDe(s)]);
  for (const [nombre, c] of colores) assert.ok(c, `${nombre} sin color`);
  const vistos = new Map();
  for (const [nombre, c] of colores) {
    assert.ok(!vistos.has(c), `${nombre} y ${vistos.get(c)} tienen el mismo color (${c})`);
    vistos.set(c, nombre);
  }
  const conTono = colores.map(([nombre, c]) => [nombre, tono(c)]).filter(([, t]) => t != null);
  for (let i = 0; i < conTono.length; i += 1) {
    for (let j = i + 1; j < conTono.length; j += 1) {
      const d = Math.abs(conTono[i][1] - conTono[j][1]);
      assert.ok(Math.min(d, 360 - d) >= 15, `${conTono[i][0]} y ${conTono[j][0]} tienen tonos demasiado parecidos`);
    }
  }
});

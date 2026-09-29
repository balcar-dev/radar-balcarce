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

// Las placas de Instagram y las tarjetas para compartir, con los mismos
// colores y la misma letra que la web (27/09).
const luz = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => { const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

test('las placas de Instagram usan el color de cada sección de la web', async () => {
  const { COLOR_SECCION } = await import('../reels/placa.mjs');
  for (const s of SECCIONES) {
    const web = s.color.includes('--s-pais') ? css.match(/--s-pais:\s*(#[0-9A-Fa-f]{6})/)[1] : colorDe(s);
    assert.equal(COLOR_SECCION[s.nombre]?.toUpperCase(), web.toUpperCase(), `${s.nombre} tiene otro color en las placas`);
  }
  assert.ok(!('Servicios' in COLOR_SECCION) && !('País' in COLOR_SECCION), 'sin las secciones que ya no existen');
});

test('la tarjeta para compartir usa el color de la web para cada sección, legible sobre el papel y con blanco encima', async () => {
  // Desde el 28/09 (diseño nuevo) la tarjeta es de fondo papel: el color de la
  // sección es el de la web (--s-*), de fondo del rótulo con texto blanco.
  const { COLOR, PAPEL, colorDe: colorDeLaTarjeta, POR_DEFECTO } = await import('../web/lib/tarjeta-diseno.js');
  for (const s of SECCIONES) {
    const web = s.color.includes('--s-pais') ? css.match(/--s-pais:\s*(#[0-9A-Fa-f]{6})/)[1] : colorDe(s);
    assert.equal(COLOR[s.nombre]?.toUpperCase(), web.toUpperCase(), `${s.nombre} tiene otro color en la tarjeta`);
    assert.equal(colorDeLaTarjeta(s.nombre), COLOR[s.nombre]);
    assert.ok(contraste(COLOR[s.nombre], PAPEL) >= 4.5, `${s.nombre} no se lee sobre el papel`);
    assert.ok(contraste(COLOR[s.nombre], '#FFFFFF') >= 4.5, `el blanco no se lee sobre ${s.nombre}`);
  }
  assert.equal(colorDeLaTarjeta('Una sección que no existe'), POR_DEFECTO, 'sin sección, el rojo de la marca, nunca un color inventado');
  assert.ok(!('Servicios' in COLOR) && !('País' in COLOR));
});

test('placas y tarjetas usan Source Serif 4 e Inter, con los archivos en su lugar', () => {
  const raiz = new URL('../', import.meta.url);
  const t = fs.readFileSync(new URL('web/lib/tarjeta.js', raiz), 'utf8');
  for (const f of ['SourceSerif4-900.ttf', 'Inter-600.ttf']) {
    assert.match(t, new RegExp(f.replace('.', '\.')));
    assert.ok(fs.existsSync(new URL(`reels/marca/fuentes/${f}`, raiz)), `falta reels/marca/fuentes/${f}`);
  }
  assert.ok(t.includes("path.join(process.cwd(), '..', 'reels', 'marca', 'fuentes')"), 'las tarjetas no leen las tipografías de reels/marca/fuentes');
  assert.ok(!fs.existsSync(new URL('web/fuentes/', raiz)), 'volvió la copia de las tipografías en web/fuentes');
  const marca = fs.readdirSync(new URL('reels/marca/fuentes/', raiz));
  for (const f of ['SourceSerif4-700.ttf', 'SourceSerif4-900.ttf', 'Inter-400.ttf', 'Inter-500.ttf', 'Inter-600.ttf', 'Inter-700.ttf']) {
    assert.ok(marca.includes(f), `falta reels/marca/fuentes/${f}`);
  }
  assert.ok(!marca.some((f) => /Fraunces|Plex/.test(f)), 'sin las letras de antes');
  for (const f of ['reels/placa.mjs', 'reels/portada.mjs', 'reels/avatar.mjs', 'reels/reel.mjs', 'web/lib/tarjeta.js', 'panel/panel.html', 'panel/acceso.mjs', 'ingesta/ingesta.mjs', 'comercial/vista.plantilla.html']) {
    const sin = fs.readFileSync(new URL(f, raiz), 'utf8').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/Fraunces|IBM Plex|IBMPlex/.test(sin), `${f} todavía usa la letra de antes`);
  }
});

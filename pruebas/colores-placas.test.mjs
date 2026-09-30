// Los colores de las placas tienen un sentido de uso y están en CRITERIO-REDES.md
// § 8 (30/09, Hernán). La tabla del criterio y el código dicen lo mismo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COLORES, COLOR_SECCION, COLOR_FERIADO } from '../reels/placa.mjs';

const criterio = fs.readFileSync(new URL('../CRITERIO-REDES.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const tabla = criterio.match(/<!-- COLORES:INICIO -->\n([\s\S]*?)\n<!-- COLORES:FIN -->/)?.[1] ?? '';
const filas = tabla.split('\n').filter((l) => /^\| .+ \| #[0-9A-Fa-f]{6} \|/.test(l)).map((l) => {
  const [, nombre, hex, uso] = l.split('|').map((c) => c.trim());
  return { nombre, hex: hex.toUpperCase(), uso };
});

const DEL_CODIGO = {
  Tinta: COLORES.tinta, Papel: COLORES.papel, 'Rojo de la marca': COLORES.rojo, ...COLOR_SECCION,
};

test('la tabla de colores del criterio dice lo mismo que el código, fila por fila', () => {
  assert.ok(filas.length >= 18, 'falta la tabla de colores en CRITERIO-REDES.md');
  for (const f of filas) {
    assert.ok(f.nombre in DEL_CODIGO, `${f.nombre}: el criterio lo nombra y el código no lo tiene`);
    assert.equal(f.hex, DEL_CODIGO[f.nombre].toUpperCase(), `${f.nombre}: otro color en el criterio y en el código`);
    assert.ok(f.uso.length >= 6, `${f.nombre}: sin decir para qué se usa`);
  }
  // Y lo que tiene el código está en el criterio: ningún color sin sentido de uso.
  const nombres = new Set(filas.map((f) => f.nombre));
  for (const n of Object.keys(DEL_CODIGO)) assert.ok(nombres.has(n), `${n} está en el código y no en el criterio`);
});

test('el color de los feriados es uno solo, en el código, el panel y el criterio', () => {
  assert.equal(COLOR_FERIADO, COLOR_SECCION.Feriados);
  const panel = fs.readFileSync(new URL('../web/public/panel/index.html', import.meta.url), 'utf8');
  assert.match(panel, new RegExp(`--s-feriado:\\s*${COLOR_FERIADO}`, 'i'));
  assert.ok(filas.some((f) => f.nombre === 'Feriados' && f.hex === COLOR_FERIADO.toUpperCase()));
});

const luz = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => { const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

test('cada color de sección se lee sobre el papel y con letras blancas encima', () => {
  for (const f of filas.filter((x) => !['Tinta', 'Papel'].includes(x.nombre))) {
    assert.ok(contraste(f.hex, COLORES.papel) >= 4.5, `${f.nombre} (${f.hex}) no se lee sobre el papel`);
    assert.ok(contraste(f.hex, '#FFFFFF') >= 4.5, `el blanco no se lee sobre ${f.nombre}`);
  }
});

test('el criterio dice que el repaso lleva el rojo de la marca y que la acción va en tinta', () => {
  assert.match(criterio, /El repaso lleva el rojo de la marca/);
  assert.match(criterio, /franja del número de WhatsApp va en verde/);
});

// La distancia de color (OKLab): que ningún par parezca el mismo color (30/09).
const aLineal = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const oklab = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(aLineal);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const distancia = (x, y) => Math.hypot(...oklab(x).map((v, i) => v - oklab(y)[i]));

test('los colores de las piezas se distinguen entre sí, reservados incluidos', async () => {
  const { COLORES_RESERVADOS } = await import('../reels/placa.mjs');
  assert.ok(COLORES_RESERVADOS.length >= 2);
  const todos = { ...COLOR_SECCION };
  delete todos.Región; // es el mismo gris que Argentina a propósito
  COLORES_RESERVADOS.forEach((h, i) => { todos[`Reservado ${i + 1}`] = h; });

  const nombres = Object.keys(todos);
  for (let i = 0; i < nombres.length; i += 1) for (let j = i + 1; j < nombres.length; j += 1) {
    assert.ok(distancia(todos[nombres[i]], todos[nombres[j]]) >= 0.06, `${nombres[i]} y ${nombres[j]} se parecen demasiado`);
  }
  for (const h of COLORES_RESERVADOS) {
    assert.ok(contraste(h, COLORES.papel) >= 4.5 && contraste(h, '#FFFFFF') >= 4.5, `el reservado ${h} no se lee`);
  }
});

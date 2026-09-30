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
  assert.match(criterio, /franja del\s+WhatsApp es negra/);
});

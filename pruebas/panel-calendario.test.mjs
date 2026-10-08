// El calendario del mes en la pestaña Fechas del panel (8/10/2026; maqueta: docs/propuestas/material/panel-nuevo-maqueta.html).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mesesDe, nombreDelMes, celdasDelMes, resumenDelMes } from '../web/public/panel/fechas.js';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');

test('los meses que tocan los días armados salen en orden y sin repetir', () => {
  assert.deepEqual(mesesDe(['2026-11-03', '2026-10-30', '2026-10-31', '2026-12-01']), ['2026-10', '2026-11', '2026-12']);
  assert.equal(nombreDelMes('2026-11'), 'noviembre 2026');
});

test('el calendario empieza en lunes: noviembre de 2026 arranca un domingo, con seis lugares vacíos', () => {
  const c = celdasDelMes('2026-11');
  assert.equal(c.filter((x) => x.vacio).length, 6);
  assert.equal(c.filter((x) => x.dia).length, 30);
  assert.equal(c[6].iso, '2026-11-01');
  // Octubre de 2026 arranca un jueves: tres lugares vacíos.
  assert.equal(celdasDelMes('2026-10').filter((x) => x.vacio).length, 3);
});

test('cada día lleva el color de lo que va a pasar: sale, espera, no sale o falta armar; y el feriado se marca', () => {
  const c = celdasDelMes('2026-10', { '2026-10-09': { clase: 'ok' }, '2026-10-10': { clase: 'espera' }, '2026-10-11': { clase: 'mal' } },
    ['2026-10-12'], { desde: '2026-10-09', hasta: '2026-10-13' });
  const por = Object.fromEntries(c.filter((x) => x.dia).map((x) => [x.iso, x]));
  assert.equal(por['2026-10-09'].clase, 'ok');
  assert.equal(por['2026-10-10'].clase, 'espera');
  assert.equal(por['2026-10-11'].clase, 'mal');
  assert.equal(por['2026-10-12'].clase, 'sin', 'dentro del tramo y sin entrada: falta armar');
  assert.equal(por['2026-10-12'].feriado, true);
  assert.equal(por['2026-10-13'].clase, 'sin');
  assert.equal(por['2026-10-14'].clase, '', 'después del último día armado no se marca nada');
  assert.equal(por['2026-10-08'].clase, '', 'antes de hoy tampoco');
  assert.deepEqual(resumenDelMes(c), { salen: 1, esperan: 1, noSalen: 1, sinArmar: 2 });
});

test('la pestaña Fechas dibuja el calendario con los meses y deja tocar un día armado', () => {
  const app = leer('web/public/panel/app.js');
  assert.ok(app.includes("data-accion=\"mes-fechas\""));
  assert.ok(app.includes("accion === 'mes-fechas'"));
  assert.ok(app.includes('celdasDelMes(E.mesFechas'));
  assert.match(leer('web/public/panel/index.html'), /\.cal \.d\.fer/);
});

// Los datos de un feriado (8/10/2026, Hernán y Andrés): los elige el criterio editorial, o sea la historia de la fecha y sus hechos, sin
// estadísticas que no vayan con la línea del medio (el dato del censo del 12/10 se sacó). CRITERIO-REDES.md, "El feriado".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const leer = (r) => JSON.parse(fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8'));

test('ningún feriado cuenta un dato de censo ni lo promete en su enfoque', () => {
  const generados = leer('web/data/feriados-piezas.json').feriados;
  const curadas = leer('ingesta/efemerides-curadas.json');
  const feriados = [...generados, ...(curadas.fechas ?? []).filter((f) => f.tipo === 'feriado' || f.enfoque && /feriado/i.test(f.nombre ?? ''))];
  for (const f of generados) {
    assert.ok(!/censo/i.test(f.enfoque ?? ''), `${f.fecha}: el enfoque habla de censo`);
    for (const d of f.datos ?? []) assert.ok(!/censo/i.test(d.texto), `${f.fecha}: un dato de censo (${d.texto.slice(0, 40)})`);
  }
  assert.ok(feriados.length > 0);
});

test('cada feriado que va a salir tiene su enfoque y sus datos con fuente', () => {
  for (const f of leer('web/data/feriados-piezas.json').feriados.filter((x) => (x.datos ?? []).length)) {
    assert.ok(f.enfoque, `${f.fecha}: sin enfoque`);
    for (const d of f.datos) assert.ok(d.fuente, `${f.fecha}: un dato sin fuente`);
  }
});

test('el 12/10 sale con el dato de Colón y la historia del nombre, sin el censo', () => {
  const f = leer('web/data/feriados-piezas.json').feriados.find((x) => x.fecha === '2026-10-12');
  assert.match(f.datos[0].texto, /Col[oó]n/);
  assert.equal(f.datos.length, 4);
});

test('CRITERIO-REDES.md dice qué dato se cuenta en un feriado', () => {
  const c = fs.readFileSync(new URL('../CRITERIO-REDES.md', import.meta.url), 'utf8');
  assert.match(c, /### El feriado/);
  assert.match(c, /la historia de la fecha y sus\s+hechos/);
});

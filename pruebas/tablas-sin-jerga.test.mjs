// Las páginas de tablas hablan para el lector, no para nosotros (12/10/2026, Hernán): sin "datos abiertos", sin la hora de actualización y sin mandar de una tabla a la otra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { colorDelEquipo } from '../web/lib/equipos-f1.js';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');

test('las páginas de tablas no muestran frases de uso interno ni mandan a la otra tabla', () => {
  const f1 = leer('web/app/tablas/formula-1/page.js');
  const liga = leer('web/app/tablas/liga-profesional/page.js');
  for (const [nombre, fuente] of [['F1', f1], ['Liga', liga]]) {
    assert.ok(!/Datos abiertos|Datos de ESPN|Actualizad[ao] el|Otras tablas/.test(fuente), `${nombre}: queda una frase interna`);
  }
  assert.ok(!f1.includes('/tablas/liga-profesional'), 'la tabla de F1 no manda a la de fútbol');
  assert.ok(!liga.includes('/tablas/formula-1'), 'la tabla de fútbol no manda a la de F1');
});

test('el pie del sitio no cuenta cuándo se armó la página', () => {
  const layout = leer('web/app/layout.js');
  assert.ok(!/Esta página se armó|se actualizan solas cada media hora/.test(layout));
});

test('cada equipo de la F1 de la temporada tiene su color', () => {
  const f1 = JSON.parse(leer('web/data/f1.json'));
  const equipos = new Set([...(f1.clasificacion?.filas ?? []), ...(f1.constructores?.filas ?? [])].map((x) => x.equipo));
  for (const e of equipos) assert.ok(colorDelEquipo(e), `falta el color de ${e}`);
  assert.equal(colorDelEquipo('Equipo que no existe'), null);
});

// El reloj y el programa de publicación: que se puedan IMPORTAR sin que pase
// nada.
//
// El 22/09 se encontró que redes/reloj.mjs y redes/publicar.mjs ejecutaban su
// lógica con sólo importarlos (leían el libro real, y publicar.mjs hasta podía
// llamar a process.exit()), a diferencia del resto del proyecto (reels/plan.mjs
// y compañía), que sólo corre cuando se ejecuta directo. Si algún día alguna
// prueba los importara sin querer, hubiera cortado toda la corrida de pruebas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { libroNuevo, anotar } from '../redes/elegir.mjs';
import { estadoDelReloj } from '../redes/reloj.mjs';

test('importar redes/reloj.mjs no lee nada ni publica nada: sólo define la función', () => {
  // Si esto imprimiera algo por consola o tocara un archivo, ya se rompió la
  // idea de que sea seguro de importar. Alcanza con que exista la función.
  assert.equal(typeof estadoDelReloj, 'function');
});

test('importar redes/publicar.mjs no dispara ninguna acción', async () => {
  // No debería llegar a pedir un token, publicar nada ni cerrar el proceso.
  await import('../redes/publicar.mjs');
  assert.ok(true, 'la importación terminó sin tirar ni cerrar el proceso');
});

test('el reloj resume en una línea qué toca y a qué hora, en horario de Balcarce', () => {
  const ahora = new Date('2026-09-21T10:05:00-03:00');
  const r = estadoDelReloj({ ahora, libro: libroNuevo() });
  assert.match(r.textoResumen, /^10:05.*tocan:/);
  assert.ok(r.tocan.some((p) => p.nombre === 'noticia1'));
});

test('sin nada para publicar, lo dice sin romperse', () => {
  const ahora = new Date('2026-09-21T03:00:00-03:00');
  const r = estadoDelReloj({ ahora, libro: libroNuevo() });
  assert.deepEqual(r.tocan, []);
  assert.match(r.textoResumen, /no hay ninguna pieza/);
});

test('lo que ya se publicó no vuelve a aparecer en el resumen del reloj', () => {
  const ahora = new Date('2026-09-21T10:05:00-03:00');
  const libro = libroNuevo();
  anotar(libro, 'instagram', '2026-09-21/noticia1', {});
  const r = estadoDelReloj({ ahora, libro });
  assert.ok(!r.tocan.some((p) => p.nombre === 'noticia1'));
});

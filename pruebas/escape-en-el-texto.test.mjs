// Un escape sin decodificar que se coló en un título publicado (1/10/2026, la nota de Laporte).
import test from 'node:test';
import assert from 'node:assert/strict';
import { arreglarEscritura } from '../ingesta/verificar.mjs';

const BARRA_U = '\\u';

test('los escapes unicode que quedaron escritos en el texto (antif + barra-u00fu + tbol) se arreglan, sin tocar el resto', () => {
  const { nuevo, arreglos } = arreglarEscritura({
    titulo: `Aymeric Laporte califica a la Argentina de antif${BARRA_U}00futbol tras la final`,
    cuerpo: `Dijo caf${BARRA_U}00e9 y ma${BARRA_U}00f1ana vuelve, sin otra cosa.`,
  });
  assert.equal(nuevo.titulo, 'Aymeric Laporte califica a la Argentina de antifútbol tras la final');
  assert.equal(nuevo.cuerpo, 'Dijo café y mañana vuelve, sin otra cosa.');
  assert.ok(arreglos.some((a) => /escape/.test(a)));
  const limpio = arreglarEscritura({ titulo: 'Un título normal con ñ y tildes: más' });
  assert.ok(!limpio.arreglos.some((a) => /escape/.test(a)));
});

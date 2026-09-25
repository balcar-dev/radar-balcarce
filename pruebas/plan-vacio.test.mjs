// El 25/09 Redes falló en cada vuelta desde las 10:05: el reloj pedía una pieza
// (--solo=utiles) que ese día no tocaba, no se armó ningún video, nadie creó
// reels/salida y al guardar la lista vacía (piezas.json) el programa se caía.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('reels/plan.mjs crea la carpeta de salida antes de guardar el manifiesto vacío', () => {
  const fuente = fs.readFileSync(new URL('../reels/plan.mjs', import.meta.url), 'utf8');
  const escribe = fuente.indexOf("path.join(SALIDA, 'piezas.json')");
  const crea = fuente.lastIndexOf('fs.mkdirSync(SALIDA, { recursive: true })', escribe);
  assert.ok(escribe > 0, 'no encontré dónde se guarda piezas.json');
  assert.ok(crea > 0 && escribe - crea < 600, 'falta crear la carpeta justo antes de guardar piezas.json');
});

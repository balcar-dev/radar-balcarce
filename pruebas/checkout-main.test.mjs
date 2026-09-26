// El 25/09 el repaso de la mañana salió dos veces en Facebook e Instagram: la
// segunda corrida esperó a la primera (candado "redes") pero descargó el proyecto
// como estaba cuando se DISPARÓ, sin el libro que la primera acababa de guardar,
// y publicó de nuevo. Las corridas que publican bajan siempre la última main.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

for (const f of ['redes', 'piezas', 'actualizar']) {
  test(`${f}.yml descarga la última versión de main, no la del disparo`, () => {
    const yml = fs.readFileSync(new URL(`../.github/workflows/${f}.yml`, import.meta.url), 'utf8');
    assert.match(yml, /uses: actions\/checkout@v4\r?\n\s+with:\r?\n\s+ref: main/, `${f}.yml tiene que hacer checkout con ref: main`);
  });
}

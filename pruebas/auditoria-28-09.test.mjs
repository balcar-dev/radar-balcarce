// Arreglos de la auditoría del 28/09 (Opus 5.5) que no necesitaban ninguna
// decisión: la zona conserva la página, las fotos sin nota se borran, el panel
// ya no reescribe solo y voz.mjs no corre cuando se audita la voz.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tieneRespaldo } from '../web/lib/cuerpo.js';
import { podarFotos } from '../web/scripts/fotos-notas.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');

test('lo de la zona contado por un solo medio conserva la página', () => {
  assert.equal(tieneRespaldo({ medios: ['La Capital (Mar del Plata)'], deLaZona: true }), true);
  assert.equal(tieneRespaldo({ medios: ['La Capital (Mar del Plata)'] }), false);
  assert.match(leer('web/scripts/generar-datos.mjs'), /n\.deLaZona \? \{ deLaZona: true \}/);
});

test('se borran las fotos de lo retirado a mano y de lo que ya no está en ningún lado', () => {
  const banco = {
    viva: { intentado: true, archivo: 'fotos-notas/viva.jpg', credito: 'Foto: A' },
    retirada: { intentado: true, archivo: 'fotos-notas/retirada.jpg', credito: 'Foto: B' },
    vieja: { intentado: true, archivo: 'fotos-notas/vieja.png', credito: 'Foto: C' },
    sinFoto: { intentado: true, origen: 'ninguna' },
  };
  const { banco: nuevo, borrar } = podarFotos({
    banco,
    enDisco: ['viva.jpg', 'retirada.jpg', 'vieja.png', 'huerfana.jpg'],
    quedan: new Set(['viva', 'retirada', 'sinFoto']),
    retiradas: new Set(['retirada']),
  });
  assert.deepEqual(borrar.sort(), ['huerfana.jpg', 'retirada.jpg', 'vieja.png']);
  assert.equal(nuevo.viva.archivo, 'fotos-notas/viva.jpg');
  assert.equal(nuevo.retirada.archivo, undefined, 'la nota retirada no vuelve a mostrar la foto');
  assert.equal(nuevo.retirada.intentado, true, 'y no se vuelve a gastar cupo en ella');
  assert.equal(nuevo.vieja.credito, undefined);
  assert.deepEqual(nuevo.sinFoto, banco.sinFoto);
});

test('la poda de fotos corre en la nube y el workflow sube las fotos borradas', () => {
  assert.match(leer('web/scripts/generar-datos.mjs'), /enLaNube && fs\.existsSync\(FOTOS_NOTAS\)[\s\S]*podarFotos/);
  assert.match(leer('.github/workflows/actualizar.yml'), /git add [^\n]*web\/public\/fotos-notas\//);
});

test('el panel de la PC no reescribe solo con IA (lo hace sólo la nube)', () => {
  const servidor = leer('panel/servidor.mjs');
  assert.doesNotMatch(servidor, /reescribirAutomaticas/);
  assert.doesNotMatch(servidor, /reescribirPendientes\(\)/);
});

test('voz.mjs corre sola sólo con su nombre exacto (no con auditar-voz.mjs)', () => {
  const voz = leer('reels/voz.mjs');
  assert.match(voz, /path\.basename\(process\.argv\[1\]\) === 'voz\.mjs'/);
  assert.doesNotMatch(voz, /endsWith\('voz\.mjs'\)/);
});

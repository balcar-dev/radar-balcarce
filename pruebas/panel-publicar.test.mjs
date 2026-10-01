// El botón "Publicar" del panel del celular, el borrador que no se pierde y el motivo de "Sin cuerpo" (1/10/2026, Hernán).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { explicarMotivoSinCuerpo } from '../web/public/panel/textos.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

test('el motivo de una nota sin cuerpo se explica en castellano', () => {
  const vance = 'cuerpo: 2 problemas (relleno, copia): el cuerpo tiene una frase de relleno sin dato: "en el marco de"; sin esas oraciones quedan 30 palabras';
  const t = explicarMotivoSinCuerpo(vance);
  assert.match(t, /copió demasiadas palabras/);
  assert.match(t, /relleno/);
  assert.match(explicarMotivoSinCuerpo('cuerpo: 5 problemas (numero): el cuerpo dice 30'), /un número no coincidía/);
  assert.match(explicarMotivoSinCuerpo('título o bajada: 2 problemas (nombre): el titulo nombra'), /un nombre no coincidía/);
  assert.equal(explicarMotivoSinCuerpo('con cuerpo'), '', 'si ya tuvo cuerpo no hay nada que explicar');
  assert.equal(explicarMotivoSinCuerpo(''), '');
  assert.match(explicarMotivoSinCuerpo('algo raro que no conocemos'), /algo raro/);
});

test('Esperan y Sin cuerpo tienen un botón "Publicar" que escribe y publica', () => {
  const app = leer('web/public/panel/app.js');
  assert.match(app, /data-accion="publicar-ia" data-tipo="pendiente"[^>]*>Publicar<\/button>/);
  assert.match(app, /data-accion="publicar-ia" data-tipo="sin-cuerpo"[^>]*>Publicar<\/button>/);
  assert.match(app, /pedirALaIA\(tipo, id, '', \{ publicar: true \}\)/);
  // Sólo se publica sola si el verificador no marcó nada; si marcó algo, se la muestra a quien decide.
  assert.match(app, /publicar && borrador\.ok && borrador\.texto && !\(borrador\.problemas \?\? \[\]\)\.length/);
  assert.match(app, /el verificador marcó algo: revisala antes de publicar/);
});

test('el borrador de la IA no se pierde al volver atrás', () => {
  const app = leer('web/public/panel/app.js');
  assert.match(app, /\(E\.borradoresIA \?\?= \{\}\)\[id\] = \{ b: borrador/);
  assert.match(app, /data-accion="ver-borrador"/);
  assert.match(app, /data-accion="borrador-guardado"/);
  assert.match(app, /No se perdió/);
});

test('Sin cuerpo muestra primero lo que cuentan más medios y por qué falló', () => {
  const app = leer('web/public/panel/app.js');
  assert.match(app, /sort\(\(a, b\) => \(b\.fuentes\?\.length \?\? 0\) - \(a\.fuentes\?\.length \?\? 0\)\)/);
  assert.match(app, /medios la cuentan/);
  assert.match(leer('web/scripts/generar-datos.mjs'), /motivo: String\(intentos\[n\.id\]\?\.motivo/);
});

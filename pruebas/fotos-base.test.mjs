// Etapa 1 del plan de arquitectura (8/10/2026): las direcciones de las fotos de las notas salen de un solo lugar (web/lib/fotos.js),
// para poder pasarlas a Cloudflare R2 con una variable (FOTOS_BASE) sin tocar nada más.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { baseDeFotos, urlDeFoto } from '../web/lib/fotos.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

test('sin FOTOS_BASE las fotos se sirven desde el propio sitio, como siempre', () => {
  const antes = process.env.FOTOS_BASE;
  try {
    delete process.env.FOTOS_BASE;
    assert.equal(baseDeFotos(), '');
    assert.equal(urlDeFoto('fotos-notas/abc.jpg'), '/fotos-notas/abc.jpg');
    process.env.FOTOS_BASE = '';
    assert.equal(urlDeFoto('fotos-notas/abc.jpg'), '/fotos-notas/abc.jpg');
  } finally {
    if (antes === undefined) delete process.env.FOTOS_BASE; else process.env.FOTOS_BASE = antes;
  }
});

test('con FOTOS_BASE las fotos salen del dominio nuevo, sin barras de más', () => {
  const antes = process.env.FOTOS_BASE;
  try {
    process.env.FOTOS_BASE = ' https://fotos.radarbalcarce.com/ ';
    assert.equal(urlDeFoto('fotos-notas/abc.jpg'), 'https://fotos.radarbalcarce.com/fotos-notas/abc.jpg');
    assert.equal(urlDeFoto('/fotos-notas/abc.jpg'), 'https://fotos.radarbalcarce.com/fotos-notas/abc.jpg');
  } finally {
    if (antes === undefined) delete process.env.FOTOS_BASE; else process.env.FOTOS_BASE = antes;
  }
});

test('ninguna página arma a mano la dirección de una foto, y los workflows pasan FOTOS_BASE', () => {
  for (const f of ['web/components/postales.js', 'web/components/imagen-destacada.js', 'web/app/nota/[id]/page.js']) {
    const t = leer(f);
    assert.ok(!/src=\{`\/\$\{[^}]*foto[^}]*archivo\}`\}/.test(t), `${f} arma la dirección a mano`);
    assert.match(t, /urlDeFoto\(/, f);
  }
  for (const f of ['.github/workflows/cloudflare-deploy.yml', '.github/workflows/actualizar.yml']) assert.match(leer(f), /FOTOS_BASE: \$\{\{ vars\.FOTOS_BASE \}\}/, f);
  // (17/10/2026: se borró "Fotos a R2", fotos-a-r2.yml, que nunca se corrió. Si algún día las fotos pasan a un depósito, FOTOS_BASE sigue
  // siendo el único lugar donde se cambia la dirección.)
});

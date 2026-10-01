// La auditoría de las fotos (1/10/2026): por qué una nota no tiene foto, sin gastar cupo de IA.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { motivoDeLaNota, auditarFotos, resumenDelBanco, MOTIVOS, MOTIVOS_FIRMES } from '../ingesta/auditar-fotos.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const AHORA = Date.parse('2026-10-01T18:00:00Z');
const nota = (id, seccion = 'Balcarce', extra = {}) => ({ id, seccion, titulo: `Nota ${id}`, fecha: new Date(AHORA - 3600e3).toISOString(), ...extra });

test('cada caso del banco cae en su motivo', () => {
  assert.equal(motivoDeLaNota(nota('a', 'Balcarce', { foto: { archivo: 'fotos-notas/a.jpg' } }), undefined), 'conFoto');
  assert.equal(motivoDeLaNota(nota('b', 'Balcarce', { propia: true }), undefined), 'propia');
  assert.equal(motivoDeLaNota(nota('c'), undefined), 'sinProbar');
  assert.equal(motivoDeLaNota(nota('c', 'Policiales'), undefined), 'policiales');
  assert.equal(motivoDeLaNota(nota('d'), { borrada: true, intentado: true }), 'borrada');
  assert.equal(motivoDeLaNota(nota('e'), { razon: 'La única foto disponible incluye menores de edad reconocibles.' }), 'menor');
  assert.equal(motivoDeLaNota(nota('f'), { razon: 'La única foto disponible contiene una marca de agua institucional del medio.' }), 'marca');
  assert.equal(motivoDeLaNota(nota('g'), { razon: 'La única imagen disponible es el logotipo del medio y no ilustra la nota.' }), 'logo');
  assert.equal(motivoDeLaNota(nota('h'), { razon: 'Ninguna de las fotos ilustra la muestra de la Escuela de Arte.' }), 'noIlustra');
  assert.equal(motivoDeLaNota(nota('i'), { razon: 'Groq también falló: HTTP 429', intentos: 1 }), 'fallaReintentable');
  assert.equal(motivoDeLaNota(nota('j'), { razon: 'Groq también falló: HTTP 413', intentos: 5 }), 'fallaAgotada');
  assert.equal(motivoDeLaNota(nota('k'), { origen: 'error', error: 'no se pudo volver a bajar la elegida', intentos: 1 }), 'fallaReintentable');
  assert.equal(motivoDeLaNota(nota('l'), { razon: 'sin fotos para comparar', intentos: 3 }), 'fuenteSinFoto');
  assert.equal(motivoDeLaNota(nota('m'), { razon: 'algo que nadie previó' }), 'otra');
});

test('"sin marca de agua" no es una marca de agua: la IA explica por qué eligió una foto', () => {
  assert.notEqual(motivoDeLaNota(nota('n'), { razon: 'Es la única opción, tiene buena nitidez y no presenta marcas de agua.' }), 'marca');
});

test('se mide por nota: la foto podada no es una falla y las propias no cuentan', () => {
  const notas = [nota('1', 'Balcarce', { foto: { archivo: 'x.jpg' } }), nota('2'), nota('3', 'Balcarce', { propia: true }), nota('1'), nota('vieja', 'Balcarce', { fecha: '2026-09-01T00:00:00Z' })];
  const banco = { 2: { razon: 'Todas las fotos muestran menores de edad reconocibles.' } };
  const r = auditarFotos({ notas, banco, desde: AHORA - 3 * 86_400_000 });
  assert.equal(r.total, 3, 'sin la repetida ni la de hace un mes');
  assert.equal(r.medibles, 2);
  assert.equal(r.conFoto, 1);
  assert.equal(r.porcentaje, 50);
  assert.equal(r.porMotivo.menor, 1);
  assert.equal(r.arreglables, 0, 'lo del menor es una regla firme');
});

test('las reglas firmes son las que dicen CLAUDE.md: menores y marcas de agua', () => {
  for (const m of ['menor', 'marca', 'propia', 'policiales']) assert.ok(MOTIVOS_FIRMES.has(m), m);
  for (const m of MOTIVOS_FIRMES) assert.ok(MOTIVOS[m], m);
});

test('el resumen del banco separa lo podado de lo descartado y de lo que falló', () => {
  const r = resumenDelBanco({
    a: { archivo: 'fotos-notas/a.jpg' }, b: { borrada: true }, c: { razon: 'incluye menores de edad reconocibles' },
    d: { razon: 'Groq también falló: HTTP 429', intentos: 1 }, e: { razon: 'Groq también falló: HTTP 429', intentos: 5 },
  });
  assert.deepEqual(r, { entradas: 5, conFoto: 1, borradas: 1, descartadas: 1, fallas: 2, agotadas: 1 });
});

test('npm run auditar-fotos existe y la auditoría no importa nada de afuera de Node', () => {
  const p = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
  assert.equal(p.scripts['auditar-fotos'], 'node ingesta/auditar-fotos.mjs');
  const f = fs.readFileSync(path.join(RAIZ, 'ingesta/auditar-fotos.mjs'), 'utf8');
  for (const m of f.matchAll(/^import .* from '([^']+)'/gm)) assert.match(m[1], /^(node:|\.\/)/, m[1]);
});

test('la página para mirar las fotos muestra qué dijo la IA y las candidatas, y escapa lo que viene de afuera', async () => {
  const { htmlDeAuditoria } = await import('../ingesta/auditar-fotos.mjs');
  const html = htmlDeAuditoria([{
    nota: { titulo: 'Nota <b>rara</b>', seccion: 'Balcarce', ruta: '/nota/x' }, motivo: 'menor',
    entrada: { razon: 'La única foto incluye menores de edad reconocibles.' },
    candidatas: [{ medio: 'Radio Gabal', enlace: 'https://a/b', imagen: 'https://a/foto.jpg' }, { medio: 'Otro', enlace: 'https://c', imagen: null, error: 'HTTP 404' }],
  }], { dias: 3 });
  assert.match(html, /Nota &lt;b&gt;rara&lt;\/b&gt;/);
  assert.match(html, /regla firme/);
  assert.match(html, /La IA dijo: La única foto incluye menores/);
  assert.match(html, /<img src="https:\/\/a\/foto\.jpg"/);
  assert.match(html, /Otro: HTTP 404/);
});

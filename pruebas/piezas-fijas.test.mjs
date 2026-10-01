// Las piezas armadas de antemano se reutilizan sin pedir la voz (1/10/2026): participá, dos semanas.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fijaVigente, guardarFija, leerVigencias, sumarDias } from '../reels/fijas.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const carpeta = () => fs.mkdtempSync(path.join(os.tmpdir(), 'fijas-'));
const video = (dir) => { const f = path.join(dir, 'origen.mp4'); fs.writeFileSync(f, 'video'); return f; };

test('una pieza fija vale entre su desde y su hasta, y sólo si el video existe', () => {
  const dir = carpeta();
  const v = guardarFija({ nombre: 'participa-noticias', mp4: video(dir), desde: '2026-10-05', dias: 14, duracion: 24.123, carpeta: dir });
  assert.deepEqual({ desde: v.desde, hasta: v.hasta, duracion: v.duracion }, { desde: '2026-10-05', hasta: '2026-10-18', duracion: 24.1 });
  assert.ok(fijaVigente('participa-noticias', '2026-10-05', { carpeta: dir }), 'el primer día');
  assert.ok(fijaVigente('participa-noticias', '2026-10-12', { carpeta: dir }), 'la segunda semana');
  assert.ok(fijaVigente('participa-noticias', '2026-10-18', { carpeta: dir }), 'el último día');
  assert.equal(fijaVigente('participa-noticias', '2026-10-19', { carpeta: dir }), null, 'pasada la vigencia vuelve a armarse con voz');
  assert.equal(fijaVigente('participa-noticias', '2026-10-04', { carpeta: dir }), null, 'antes de que valga');
  assert.equal(fijaVigente('otra-pieza', '2026-10-06', { carpeta: dir }), null, 'una que no es fija');
  fs.rmSync(path.join(dir, 'participa-noticias.mp4'));
  assert.equal(fijaVigente('participa-noticias', '2026-10-06', { carpeta: dir }), null, 'sin el video no hay fija');
});

test('guardar una segunda pieza no pisa la primera', () => {
  const dir = carpeta();
  const mp4 = video(dir);
  guardarFija({ nombre: 'participa-noticias', mp4, desde: '2026-10-05', carpeta: dir });
  guardarFija({ nombre: 'participa-evento', mp4, desde: '2026-10-06', carpeta: dir });
  assert.deepEqual(Object.keys(leerVigencias(dir)).sort(), ['participa-evento', 'participa-noticias']);
  assert.throws(() => guardarFija({ nombre: '../mal', mp4, desde: '2026-10-05', carpeta: dir }), /inválido/);
});

test('los días se suman bien', () => {
  assert.equal(sumarDias('2026-10-05', 13), '2026-10-18');
  assert.equal(sumarDias('2026-10-30', 3), '2026-11-02');
});

test('el plan usa la fija si vale hoy y no pide la voz; --sin-fijas la fuerza; --incluir arma una pieza que hoy no toca', () => {
  const plan = leer('reels/plan.mjs');
  assert.match(plan, /fijaVigente\(p\.nombre, diaAR\(\)\)/);
  assert.match(plan, /sinFijas \? null : fijaVigente/);
  assert.match(plan, /vozUsada: `fija hasta el/);
  assert.match(plan, /forzar\.includes\(id\) \|\| toca\(cuando\[id\], fecha, \{ estado \}\)/);
  assert.match(plan, /incluir\.includes\(x\.nombre\)/);
});

test('el workflow que las arma valida lo pedido, comparte el candado de voz y las guarda en reels/fijas', () => {
  const y = leer('.github/workflows/fijar-piezas.yml');
  assert.match(y, /group: redes/);
  assert.match(y, /\*\[!a-z0-9,-\]\*/, 'valida los nombres');
  assert.match(y, /--sin-fijas/);
  assert.match(y, /node reels\/fijas\.mjs/);
  assert.match(y, /git add reels\/fijas\//);
  assert.match(y, /GEMINI_API_KEY_REDES: \$\{\{ secrets\.GEMINI_API_KEY_REDES \}\}/);
});

test('reels/fijas/ no está en el .gitignore (hay que subir los videos)', () => {
  const ign = leer('.gitignore');
  assert.ok(!/^reels\/fijas/m.test(ign));
  assert.ok(!/^reels\/\*$/m.test(ign) || /!reels\/fijas/.test(ign));
});

test('las dos piezas que faltan se arman solas el 2/10 a las 05:30, ya con el cupo del día nuevo, y sólo en 2026', () => {
  const y = leer('.github/workflows/fijar-piezas.yml');
  assert.match(y, /cron: '30 8 2 10 \*'/, '05:30 de Balcarce el 2 de octubre');
  assert.match(y, /inputs\.piezas \|\| 'participa-evento,participa-reclamos'/);
  assert.match(y, /inputs\.desde \|\| '2026-10-06'/);
  assert.match(y, /date \+%Y\)" != "2026"/, 'no se repite el año que viene');
  assert.ok((y.match(/env\.SEGUIR != 'false'/g) ?? []).length >= 6, 'todos los pasos respetan la guarda');
});

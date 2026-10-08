// C-16 (8/10/2026): una pieza que se arma de nuevo no vuelve a gastar un audio del cupo (10 por día) si el texto, la voz y el estilo son los mismos.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { claveDeVoz, leerDeLaMemoriaDeVoz, guardarEnLaMemoriaDeVoz } from '../reels/voz-gemini.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

test('la clave cambia con el texto, la voz o el estilo, y es la misma si no cambia nada', () => {
  const a = claveDeVoz('Buen día, Balcarce.', 'voice_x', 'calm');
  assert.equal(a, claveDeVoz('Buen día, Balcarce.', 'voice_x', 'calm'));
  for (const otra of [claveDeVoz('Buen día, Balcarce', 'voice_x', 'calm'), claveDeVoz('Buen día, Balcarce.', 'voice_y', 'calm'), claveDeVoz('Buen día, Balcarce.', 'voice_x', 'warm')]) assert.notEqual(otra, a);
  assert.match(a, /^[0-9a-f]{24}$/);
});

test('un audio guardado se reusa: se copia al destino con su duración y sus palabras', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voz-'));
  const memoria = path.join(dir, 'memoria');
  const origen = path.join(dir, 'a.mp3');
  fs.writeFileSync(origen, 'AUDIO');
  const palabras = [{ texto: 'Buen', inicio: 0, fin: 0.3 }, { texto: 'día', inicio: 0.3, fin: 0.6 }];
  const k = claveDeVoz('Buen día', 'v', 'e');
  assert.equal(leerDeLaMemoriaDeVoz(k, path.join(dir, 'b.mp3'), memoria), null, 'todavía no hay nada');
  guardarEnLaMemoriaDeVoz(k, { archivo: origen, duracion: 0.6, palabras, anclasUsadas: 1 }, memoria);
  const destino = path.join(dir, 'salida', 'b.mp3');
  const r = leerDeLaMemoriaDeVoz(k, destino, memoria);
  assert.equal(r.deLaMemoria, true);
  assert.equal(r.duracion, 0.6);
  assert.deepEqual(r.palabras, palabras);
  assert.equal(fs.readFileSync(destino, 'utf8'), 'AUDIO');
});

test('sin carpeta de memoria no hace nada, y la memoria vieja se limpia', () => {
  assert.equal(leerDeLaMemoriaDeVoz('x', '/tmp/no-importa.mp3', undefined), null);
  guardarEnLaMemoriaDeVoz('x', { archivo: '/no/existe', duracion: 1, palabras: [] }, undefined);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voz-'));
  const memoria = path.join(dir, 'm');
  fs.mkdirSync(memoria);
  const vieja = path.join(memoria, 'vieja.mp3');
  fs.writeFileSync(vieja, 'x');
  const hace5dias = new Date(Date.now() - 5 * 864e5);
  fs.utimesSync(vieja, hace5dias, hace5dias);
  const origen = path.join(dir, 'a.mp3');
  fs.writeFileSync(origen, 'A');
  guardarEnLaMemoriaDeVoz('nueva', { archivo: origen, duracion: 1, palabras: [{ texto: 'a' }] }, memoria);
  assert.ok(!fs.existsSync(vieja), 'lo de más de 3 días se va');
  assert.ok(fs.existsSync(path.join(memoria, 'nueva.mp3')));
});

test('decirGemini mira la memoria antes de gastar un audio, y los workflows que arman piezas la guardan', () => {
  const v = leer('reels/voz-gemini.mjs');
  assert.ok(v.indexOf('leerDeLaMemoriaDeVoz(claveDeMemoria') < v.indexOf("throw new Error('falta GEMINI_API_KEY_REDES"), 'la memoria va antes de pedir la clave y el audio');
  assert.match(v, /guardarEnLaMemoriaDeVoz\(claveDeMemoria, resultado\)/);
  for (const f of ['.github/workflows/redes.yml', '.github/workflows/piezas.yml']) {
    const y = leer(f);
    assert.match(y, /VOZ_CACHE: \$\{\{ github\.workspace \}\}\/\.cache\/voz/, f);
    assert.match(y, /actions\/cache\/restore@v4/, f);
    assert.match(y, /actions\/cache\/save@v4/, f);
  }
});

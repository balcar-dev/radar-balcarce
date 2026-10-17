// Regla 302 (18/10/2026): lo que deja listo el cambio a la clave paga de Google para recrear las dos voces propias (docs/redes/VOCES-NUEVAS.md): los modos
// "referencia", "recrear" con versiones y "comparar" de reels/crear-voces.mjs y el workflow "Crear voces". Acá no se llama a Gemini ni se gasta cupo:
// "comparar" se corre de verdad, sin ninguna clave, con audios de tonos hechos con ffmpeg.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const raiz = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(raiz, r), 'utf8').replace(/\r\n/g, '\n');

test('crear-voces: "referencia" usa las voces de hoy, "recrear" hace VERSIONES versiones (mínimo 2) y compara solo, y "comparar" no pide ninguna clave', () => {
  const codigo = leer('reels/crear-voces.mjs');
  // La referencia se hace con las voces de CRITERIO-REDES.md § 6 y con el estilo de producción, no con uno de prueba.
  assert.match(codigo, /process\.argv\[2\] === 'referencia'/);
  assert.match(codigo, /const idVoz = VOCES\[rol\]/);
  assert.match(codigo, /ESTILO_DE_PRODUCCION = componerIndicacion\(INDICACIONES\.noche\)/);
  assert.match(codigo, /style: ESTILO_DE_PRODUCCION/);
  // El texto es el único de la prueba (reels/texto-de-comparacion.mjs), no una copia.
  assert.match(codigo, /const PODCAST = TEXTO_DE_COMPARACION/);
  assert.ok(!/Buenas noches Balcarce, cómo estuvo el día\. Repasamos/.test(codigo), 'el texto no está copiado en el script');
  // Versiones: de 2 a 6, por defecto 2.
  assert.match(codigo, /Math\.max\(2, Math\.min\(VERSIONES_MAXIMAS, Number\(process\.env\.VERSIONES\) \|\| VERSIONES_POR_DEFECTO\)\)/);
  assert.match(codigo, /if \(process\.argv\[2\] === 'recrear'\) await compararConLaReferencia\(SALIDA\)/);
  // "comparar" corre ANTES de pedir la clave: no necesita ninguna ni llama a la red.
  const comparar = codigo.indexOf("process.argv[2] === 'comparar'");
  const clave = codigo.indexOf('const clave = claveRedes()');
  assert.ok(comparar > 0 && clave > comparar, 'el modo comparar va antes de la clave');
  const bloque = codigo.slice(codigo.indexOf('async function compararConLaReferencia'), clave);
  assert.ok(!/\bapi\(|fetch\(/.test(bloque), 'comparar no llama a la red');
  // Lo que ya existía sigue: las dos voces de producción no se borran sin confirmar.
  assert.match(codigo, /VOCES_DE_PRODUCCION = \['voice_v8mf7jt16hch', 'voice_cdljkn0jpmk6'\]/);
});

test('el workflow "Crear voces" ofrece referencia, recrear y comparar, pasa las versiones y guarda la referencia entre los archivos', () => {
  const yml = leer('.github/workflows/crear-voces.yml');
  assert.match(yml, /options: \[crear, referencia, recrear, comparar, dialogo, dialogo2, dialogo3, listar, borrar\]/);
  assert.match(yml, /VERSIONES: \$\{\{ github\.event\.inputs\.versiones \}\}/);
  assert.match(yml, /reels\/referencias-de-voz\//);
  assert.match(yml, /docs\/redes\/VOCES-NUEVAS\.md/);
  assert.match(yml, /GEMINI_API_KEY_REDES: \$\{\{ secrets\.GEMINI_API_KEY_REDES \}\}/, 'sigue usando el secreto de las voces');
});

test('"comparar" se corre de verdad, sin clave y sin red: ordena las candidatas por parecido con la referencia y escribe la tabla', (t) => {
  if (!ffmpeg || !fs.existsSync(ffmpeg)) { t.skip('sin ffmpeg'); return; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voces-'));
  const refs = path.join(dir, 'referencias');
  const salida = path.join(dir, 'salida');
  fs.mkdirSync(refs);
  fs.mkdirSync(salida);
  const tono = (archivo, hz, segundos) => execFileSync(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', `sine=frequency=${hz}:duration=${segundos}`, '-af', 'tremolo=f=4:d=0.9,volume=3', '-b:a', '128k', archivo]);
  // La referencia de la locutora: 190 Hz y 6 s. Dos candidatas: una casi igual y otra más grave y más corta.
  tono(path.join(refs, 'locutora.mp3'), 190, 6);
  tono(path.join(salida, 'mujer-c-v1-podcast.mp3'), 196, 6.1);
  tono(path.join(salida, 'mujer-c-v2-podcast.mp3'), 130, 4.5);
  // El locutor no tiene referencia: se avisa y se sigue.
  const entorno = { ...process.env, REFERENCIAS_DE_VOZ: refs, GEMINI_API_KEY_REDES: '', GEMINI_API_KEY: '', GEMINI_API_KEY_REDACCION: '', GEMINI_API_KEY_CLASIFICACION: '' };
  const r = spawnSync(process.execPath, [path.join(raiz, 'reels', 'crear-voces.mjs'), 'comparar', salida], { env: entorno, encoding: 'utf8', timeout: 120_000 });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /La locutora/);
  assert.match(r.stdout, /locutor: falta la referencia/);
  const md = fs.readFileSync(path.join(salida, 'comparacion.md'), 'utf8');
  assert.match(md, /La más parecida: \*\*mujer-c-v1-podcast\.mp3\*\*/);
  const json = JSON.parse(fs.readFileSync(path.join(salida, 'comparacion.json'), 'utf8'));
  assert.equal(json.locutora.ganadora, 'mujer-c-v1-podcast.mp3');
  assert.deepEqual(json.locutora.ranking.map((x) => x.nombre), ['mujer-c-v1-podcast.mp3', 'mujer-c-v2-podcast.mp3']);
  assert.ok(json.locutora.ranking[0].parecido > json.locutora.ranking[1].parecido + 10);
});

test('el procedimiento está escrito, dice cuántos audios gasta cada paso y no pide nada que cueste de más', () => {
  const doc = leer('docs/redes/VOCES-NUEVAS.md');
  for (const clave of ['referencia', 'recrear', 'comparar', 'GEMINI_API_KEY_REDES', 'reels/parecido-de-voz.mjs', 'reels/referencias-de-voz', 'CRITERIO-REDES.md', 'palabras por segundo']) {
    assert.ok(doc.includes(clave), `el documento no nombra "${clave}"`);
  }
  assert.match(doc, /Gasto total/i);
  assert.match(doc, /8 audios|ocho audios/);
});

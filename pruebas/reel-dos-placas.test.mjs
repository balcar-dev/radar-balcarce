// El video de "Un día como hoy" con dos placas y la voz (1/10/2026): sin red ni cupo, con una voz falsa
// (un tono) y los tiempos de las palabras que daría Gemini. Comprueba que ffmpeg arma el video entero,
// con audio, y que la segunda placa entra cuando la voz dice "Y además".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, execFile } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { armarReel, medirDuracion, VOLUMEN_PAREJO } from '../reels/reel.mjs';
import { placasDelDia } from '../reels/placas-efemeride.mjs';
import { palabrasSinteticas } from '../reels/previa-efemerides.mjs';
import { efemerideDelDia } from '../redes/efemeride.mjs';

test('con dos placas y una voz falsa, el video sale armado, con audio, y dura lo que la voz más el cierre', async (t) => {
  if (!ffmpeg || !fs.existsSync(ffmpeg)) { t.skip('sin ffmpeg'); return; }
  const e = efemerideDelDia(new Date('2026-10-05T12:00:00-03:00'));
  const placas = placasDelDia(e.fecha, e);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reel2-'));
  let pedido = null;
  const palabras = palabrasSinteticas(e.guion);
  const duracion = palabras.at(-1).hasta;
  const decirFalso = async (texto, mp3, opciones) => {
    pedido = { texto, opciones };
    execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', `sine=frequency=330:duration=${duracion.toFixed(2)}`, '-c:a', 'libmp3lame', mp3], { stdio: 'ignore' });
    return { palabras, duracion };
  };
  const r = await armarReel({ nombre: 'efemeride', svg: placas.principal, svg2: placas.ademas, guion: e.guion, acento: '#9D2C8F', hablar: decirFalso }, dir);
  assert.ok(fs.existsSync(r.mp4) && fs.statSync(r.mp4).size > 20000, 'el video existe');
  assert.ok(fs.existsSync(path.join(dir, 'efemeride-2.png')), 'la segunda placa se dibujó');
  const real = await medirDuracion(r.mp4);
  assert.ok(Math.abs(real - (duracion + 0.25 + 1.4)) < 1.5, `dura ${real} s, se esperaba unos ${(duracion + 1.65).toFixed(1)}`);
  assert.match(pedido.texto, /Un día como hoy/);
  assert.ok(pedido.opciones.voz, 'pide la voz del reparto (la de la locutora)');
  assert.equal(r.vozUsada, 'gemini');
});

test('con una sola placa sigue funcionando como siempre', async (t) => {
  if (!ffmpeg || !fs.existsSync(ffmpeg)) { t.skip('sin ffmpeg'); return; }
  const e = efemerideDelDia(new Date('2026-10-05T12:00:00-03:00'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reel1-'));
  const palabras = palabrasSinteticas('Buen día, Balcarce. Un día como hoy, en Radar Balcarce.');
  const duracion = palabras.at(-1).hasta;
  const decirFalso = async (texto, mp3) => {
    execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', `sine=frequency=330:duration=${duracion.toFixed(2)}`, '-c:a', 'libmp3lame', mp3], { stdio: 'ignore' });
    return { palabras, duracion };
  };
  const r = await armarReel({ nombre: 'efemeride', svg: placasDelDia(e.fecha, e).principal, guion: 'Buen día, Balcarce.', acento: '#9D2C8F', hablar: decirFalso }, dir);
  assert.ok(fs.existsSync(r.mp4));
  assert.ok(!fs.existsSync(path.join(dir, 'efemeride-2.png')));
});

// Herramientas (8/10/2026): todas las voces al mismo volumen. Una voz muy baja y una fuerte salen parejas (-16 LUFS).
test('una voz muy baja y una fuerte quedan al mismo volumen en el video', async (t) => {
  if (!ffmpeg || !fs.existsSync(ffmpeg)) { t.skip('sin ffmpeg'); return; }
  assert.match(VOLUMEN_PAREJO, /loudnorm=I=-16/);
  const e = efemerideDelDia(new Date('2026-10-05T12:00:00-03:00'));
  const palabras = palabrasSinteticas('Buen día, Balcarce. Un día como hoy, en Radar Balcarce.');
  const duracion = palabras.at(-1).hasta;
  const medir = async (v) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-vol-'));
    const decirFalso = async (_texto, mp3) => {
      execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', `sine=frequency=330:duration=${duracion.toFixed(2)},volume=${v}`, '-c:a', 'libmp3lame', mp3], { stdio: 'ignore' });
      return { palabras, duracion };
    };
    const r = await armarReel({ nombre: 'efemeride', svg: placasDelDia(e.fecha, e).principal, guion: 'Buen día, Balcarce.', acento: '#9D2C8F', hablar: decirFalso }, dir);
    const out = await new Promise((resolve) => {
      let err = '';
      const p = execFile(ffmpeg, ['-hide_banner', '-nostats', '-i', r.mp4, '-af', 'ebur128', '-vn', '-f', 'null', '-'], () => resolve(err));
      p.stderr.on('data', (d) => { err += d; });
    });
    const finales = [...out.matchAll(/I:\s+(-?\d+\.\d)\s+LUFS/g)];
    return Number(finales.at(-1)[1]);
  };
  const bajo = await medir(0.03);
  const fuerte = await medir(0.8);
  assert.ok(Math.abs(bajo - fuerte) < 2, `quedaron en ${bajo} y ${fuerte} LUFS`);
});

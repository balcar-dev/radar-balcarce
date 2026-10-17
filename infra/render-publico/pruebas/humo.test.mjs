// Prueba de humo del render: con un pedido mínimo hecho acá mismo y una voz de mentira (un tono de 3 segundos), arma el video de verdad. Si esto pasa, resvg,
// ffmpeg, las tipografías y todo el camino de reels/ andan en esta máquina. No hace falta ninguna dirección ni ningún secreto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { armarPedido, conVoz, huellaDelPedido, problemasDelPedido } from '../reels/pedido.mjs';
import { renderizar, direccionValida, problemasDelAviso } from '../render.mjs';
import { HISTORIA_MAXIMA } from '../reels/duracion.mjs';

const PLACA = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="#F4F1EA"/>
<text x="540" y="600" font-family="Inter" font-size="72" font-weight="700" text-anchor="middle" fill="#14161A">Radar Balcarce</text></svg>`;

function tono(segundos) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'humo-'));
  const mp3 = path.join(carpeta, 'voz.mp3');
  execFileSync(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', `sine=frequency=330:duration=${segundos}`, '-b:a', '64k', mp3]);
  return fs.readFileSync(mp3);
}

test('un pedido mínimo con una voz de mentira da un video, una tapa, subtítulos y un manifiesto', async () => {
  const voz = tono(3);
  const pedido = conVoz(armarPedido({ nombre: 'humo', tipo: 'historia', guion: 'Buen día, Balcarce. Esto es una prueba.', svg: PLACA, animar: false, historiaMaxima: HISTORIA_MAXIMA }), voz);
  assert.deepEqual(problemasDelPedido(pedido), []);
  const r = await renderizar({ pedido, voz, log: () => {} });
  assert.equal(r.manifiesto.huella, huellaDelPedido(pedido));
  assert.ok(r.manifiesto.duracion > 3, `dura ${r.manifiesto.duracion}`);
  assert.ok(fs.statSync(path.join(r.carpeta, 'humo.mp4')).size > 10_000);
  assert.ok(fs.existsSync(path.join(r.carpeta, 'humo.png')) && fs.existsSync(path.join(r.carpeta, 'humo.ass')));
});

test('un pedido con la voz cambiada o un nombre que sale de la carpeta se rechaza antes de dibujar nada', async () => {
  const voz = tono(1);
  const pedido = conVoz(armarPedido({ nombre: 'humo', tipo: 'historia', guion: 'Hola.', svg: PLACA, animar: false, historiaMaxima: HISTORIA_MAXIMA }), voz);
  await assert.rejects(renderizar({ pedido, voz: Buffer.concat([voz, Buffer.from([0])]), log: () => {} }), /no es la del pedido/);
  assert.ok(problemasDelPedido({ ...pedido, nombre: '../../etc/pasa' }).length > 0);
  assert.ok(problemasDelPedido({ ...pedido, texto: 'otra cosa' }).some((x) => /no es el del guion/.test(x)));
});

test('sólo se aceptan direcciones https de R2', () => {
  assert.equal(direccionValida('https://abc.r2.cloudflarestorage.com/radar-render/a?X-Amz-Signature=1'), true);
  for (const mala of ['http://abc.r2.cloudflarestorage.com/a', 'https://evil.example.com/a', 'https://user:pass@abc.r2.cloudflarestorage.com/a', 'no es una url', undefined]) assert.equal(direccionValida(mala), false, String(mala));
  const huella = crypto.createHash('sha256').update('x').digest('hex').slice(0, 24);
  assert.deepEqual(problemasDelAviso({ huella, nombre: 'humo', pedido: 'https://a.r2.cloudflarestorage.com/p', voz: 'https://a.r2.cloudflarestorage.com/v', subidas: {} }).length > 0, true, 'faltan las subidas');
});

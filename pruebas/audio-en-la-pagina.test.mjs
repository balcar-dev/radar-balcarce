// El prototipo del reproductor de audio en la nota (17/10/2026, docs/redes/AUDIO-EN-LA-PAGINA-Y-PODCAST-GENERAL.md). Está SIN CONECTAR y APAGADO:
// estas pruebas fijan eso a propósito. Cuando se prenda, se cambian a propósito (el interruptor y la prueba de que la página lo usa).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  AUDIO_EN_LA_PAGINA, SERVIDOR_DE_AUDIO, audioDeNota, duracionHablada, pesoLegible,
} from '../web/lib/audio-de-nota.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

const bueno = { audio: { url: `https://${SERVIDOR_DE_AUDIO}/repasos/2026-10-17-manana.mp3`, bytes: 424_000, segundos: 53 } };

test('el interruptor está apagado: aunque la nota traiga un audio válido, no se muestra nada', () => {
  assert.equal(AUDIO_EN_LA_PAGINA, false);
  assert.equal(audioDeNota(bueno), null);
});

test('con el interruptor prendido, un audio válido devuelve lo que necesita el reproductor', () => {
  const a = audioDeNota(bueno, { activo: true });
  assert.equal(a.url, bueno.audio.url);
  assert.equal(a.tipo, 'audio/mpeg');
  assert.equal(a.duracion, '53 segundos');
  assert.equal(a.peso, '424 KB');
  assert.equal(audioDeNota({ audio: { ...bueno.audio, url: bueno.audio.url.replace('.mp3', '.m4a') } }, { activo: true }).tipo, 'audio/mp4');
});

test('sólo se acepta el servidor propio de audio, por https, sin sorpresas en la dirección', () => {
  const con = (url) => audioDeNota({ audio: { ...bueno.audio, url } }, { activo: true });
  assert.ok(con(bueno.audio.url));
  for (const mala of [
    'http://audio.radarbalcarce.com/x.mp3',                    // sin https
    'https://radarbalcarce.com/audio/x.mp3',                   // el sitio mismo: el audio no va en Cloudflare Pages
    'https://audio.radarbalcarce.com.malo.com/x.mp3',          // otro dominio que empieza igual
    'https://malo.com/audio.radarbalcarce.com/x.mp3',          // el host no es el nuestro
    'https://usuario@audio.radarbalcarce.com/x.mp3',           // usuario en la dirección
    'https://audio.radarbalcarce.com:8443/x.mp3',              // puerto raro
    'https://pub-123.r2.dev/x.mp3',                            // r2.dev tiene límite de pedidos y no es para producción
    'https://audio.radarbalcarce.com/x.mp3?token=1',           // con parámetros
    'https://audio.radarbalcarce.com/x.wav',                   // formato que no se publica
    'https://audio.radarbalcarce.com/x',                       // sin extensión
    'javascript:alert(1)',
    '',
  ]) assert.equal(con(mala), null, mala);
});

test('sin tamaño real o sin duración, o sin audio, no hay reproductor', () => {
  for (const nota of [
    {}, null, { audio: null }, { audio: {} },
    { audio: { ...bueno.audio, bytes: 0 } },
    { audio: { ...bueno.audio, segundos: 0 } },
    { audio: { ...bueno.audio, bytes: 'mucho' } },
  ]) assert.equal(audioDeNota(nota, { activo: true }), null);
});

test('duración y peso se escriben para leer en voz alta', () => {
  assert.equal(duracionHablada(1), '1 segundo');
  assert.equal(duracionHablada(52.4), '52 segundos');
  assert.equal(duracionHablada(65), '1 minuto 5 segundos');
  assert.equal(duracionHablada(600), '10 minutos');
  assert.equal(pesoLegible(150_000), '150 KB');
  assert.equal(pesoLegible(1_400_000), '1,4 MB');
});

test('el componente es de servidor, sin JavaScript propio, no baja nada hasta tocar "reproducir" y avisa que la voz es de IA', () => {
  const c = leer('web/components/reproductor-de-audio.js');
  assert.doesNotMatch(c, /use client/);
  assert.doesNotMatch(c, /useState|useEffect|addEventListener/);
  assert.match(c, /<audio controls preload="none"/);
  assert.match(c, /<a href=\{a\.url\}>/);          // enlace de respaldo para bajar el audio
  assert.match(c, /Voz generada con inteligencia artificial/);
  assert.match(c, /audioDeNota/);
});

test('SIN CONECTAR: ninguna página ni componente del sitio importa el reproductor (si se conecta, esta prueba se cambia a propósito)', () => {
  const dirs = ['web/app', 'web/components'];
  const archivos = [];
  const recorrer = (d) => {
    for (const e of fs.readdirSync(path.join(RAIZ, d), { withFileTypes: true })) {
      const r = `${d}/${e.name}`;
      if (e.isDirectory()) recorrer(r);
      else if (/\.(js|jsx|mjs)$/.test(e.name) && r !== 'web/components/reproductor-de-audio.js') archivos.push(r);
    }
  };
  dirs.forEach(recorrer);
  for (const f of archivos) assert.doesNotMatch(leer(f), /reproductor-de-audio|audio-de-nota/, f);
});

// Casting de voces: dice el mismo texto con cada voz disponible para poder
// compararlas con los oídos y no con la teoría.
//   node reels/casting.mjs
//   node reels/casting.mjs "otro texto para probar"

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
import { decir } from './voz.mjs';

const correr = promisify(execFile);
const AQUI = import.meta.dirname;
const SALIDA = path.join(AQUI, 'casting');
const PIPER = path.join(AQUI, 'voces', 'piper');

const TEXTO = process.argv.slice(2).join(' ') || [
  'Buen día, Balcarce. Arrancamos con catorce grados y a la tarde levanta hasta veintitrés.',
  'Racing confirmó la participación de Inter Miami en el Torneo de Fútbol Infantil Ciudad de Balcarce.',
  'Y si necesitás una farmacia, la de turno es Benites.',
].join(' ');

// Las de Microsoft, por el mismo camino que usa el navegador Edge.
const DE_EDGE = [
  { id: '1-elena', voz: 'es-AR-ElenaNeural', vel: '+4%', que: 'Elena · argentina · mujer' },
  { id: '2-elena-pausada', voz: 'es-AR-ElenaNeural', vel: '-6%', que: 'Elena más pausada, tono informativo' },
  { id: '3-tomas', voz: 'es-AR-TomasNeural', vel: '+4%', que: 'Tomás · argentino · varón' },
  { id: '4-mexicana', voz: 'es-MX-DaliaNeural', vel: '+4%', que: 'Dalia · mexicana, para contraste' },
];

async function piper(destino) {
  const modelo = path.join(PIPER, 'es_AR-daniela-high.onnx');
  const exe = path.join(PIPER, 'piper', 'piper.exe');
  if (!fs.existsSync(exe) || !fs.existsSync(modelo)) return null;
  const wav = destino.replace(/\.mp3$/, '.wav');
  await new Promise((ok, mal) => {
    const p = execFile(exe, ['--model', modelo, '--output_file', wav], (e) => (e ? mal(e) : ok()));
    p.stdin.end(TEXTO);
  });
  await correr(ffmpeg, ['-y', '-v', 'error', '-i', wav, '-b:a', '128k', destino]);
  fs.rmSync(wav, { force: true });
  return destino;
}

fs.mkdirSync(SALIDA, { recursive: true });
console.log(`\n\x1b[1mCASTING DE VOCES\x1b[0m\n  "${TEXTO.slice(0, 78)}…"\n`);

for (const v of DE_EDGE) {
  const destino = path.join(SALIDA, `${v.id}.mp3`);
  const r = await decir(TEXTO, destino, { voz: v.voz, velocidad: v.vel });
  console.log(`  \x1b[32mok\x1b[0m  ${v.id.padEnd(18)} ${r.duracion.toFixed(1)} s · ${v.que}`);
}

try {
  const d = await piper(path.join(SALIDA, '5-piper-daniela.mp3'));
  console.log(`  ${d ? '\x1b[32mok\x1b[0m  5-piper-daniela   sin internet · Daniela · argentina · modelo abierto'
    : '\x1b[33m--\x1b[0m  piper no está instalado'}`);
} catch (e) {
  console.log(`  \x1b[31mfalla\x1b[0m piper: ${e.message.split('\n')[0]}`);
}

console.log(`\n  Quedaron en ${SALIDA}\n`);

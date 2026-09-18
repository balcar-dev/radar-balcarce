// La cortina de Radar Balcarce: se genera por código, así que es nuestra,
// no paga derechos y suena igual todos los días. Esa repetición es lo que
// hace que alguien la reconozca sin mirar la pantalla.
//
// Qué suena: un colchón grave en la mica (110 Hz) con su quinta, y encima un
// "pin" de radar cada 2,8 segundos que responde una segunda nota más aguda.
// Va tan abajo en la mezcla que no compite con la voz: se siente más que se
// escucha.
//
//   node reels/cortina.mjs        genera marca/cortina.wav y lo deja listo

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';

const correr = promisify(execFile);
export const ARCHIVO = path.join(import.meta.dirname, 'marca', 'cortina.wav');
const CICLO = 2.8; // cada cuánto vuelve el pin del radar
const LARGO = CICLO * 15; // 42 s, para que el loop no se note

// Cada término es una nota; exp(-k*mod(...)) es el golpe que decae.
const VOZ_MUSICAL = [
  // colchón: la grave y su quinta, con una respiración muy lenta
  '0.24*sin(2*PI*110*t)*(0.86+0.14*sin(2*PI*0.09*t))',
  '0.10*sin(2*PI*164.81*t)*(0.80+0.20*sin(2*PI*0.06*t))',
  '0.05*sin(2*PI*220*t)',
  // el pin del radar y su respuesta
  `0.26*sin(2*PI*880*t)*exp(-9*mod(t,${CICLO}))`,
  `0.16*sin(2*PI*1318.5*t)*exp(-11*mod(t-0.22,${CICLO}))`,
  // un armónico apenas, para que no suene a sintetizador barato
  `0.05*sin(2*PI*1760*t)*exp(-16*mod(t,${CICLO}))`,
].join(' + ');

export async function generar() {
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  await correr(ffmpeg, [
    '-y', '-v', 'error',
    '-f', 'lavfi',
    // La expresión va entre comillas simples porque tiene comas adentro
    // (mod(t,2.8)) y sin eso ffmpeg cree que empieza otro filtro.
    '-i', `aevalsrc=exprs='${VOZ_MUSICAL}':s=44100:d=${LARGO}`,
    '-af', [
      'lowpass=f=2600', // le saca el filo digital
      'aecho=0.8:0.7:150|320:0.22|0.10', // aire, como si sonara en una sala
      'highpass=f=60',
      'volume=0.9',
      `afade=t=in:st=0:d=1.5,afade=t=out:st=${LARGO - 2}:d=2`,
    ].join(','),
    '-ac', '2', '-ar', '44100',
    ARCHIVO,
  ], { maxBuffer: 1024 * 1024 * 20 });
  return ARCHIVO;
}

if (process.argv[1] && process.argv[1].endsWith('cortina.mjs')) {
  await generar();
  const kb = (fs.statSync(ARCHIVO).size / 1024).toFixed(0);
  console.log(`\n  Cortina lista: ${ARCHIVO}`);
  console.log(`  ${LARGO.toFixed(0)} s · ${kb} kB · pin cada ${CICLO} s\n`);
}

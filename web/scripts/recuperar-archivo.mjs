// Arma (o completa) web/data/archivo.json con las notas que ya salieron de la
// portada ANTES de que existiera el archivo, sacándolas del historial de git.
//
// Hace falta una sola vez. Hasta el 25/09 una nota que salía de portada.json
// perdía su página, y los enlaces de Facebook de esas notas daban 404
// (por ejemplo /nota/…-1o216bo, "Los Ciantini presentaron las Pick Up", y
// /nota/…-lcvlqf, la reapertura del autódromo). Cada versión de portada.json
// está en git: de ahí se recuperan.
//
//   node scripts/recuperar-archivo.mjs                   escribe data/archivo.json
//   node scripts/recuperar-archivo.mjs --salida=otro.json  para mirar antes
//
// Sólo lee el historial (git log y git show): no cambia nada del repositorio
// salvo el archivo de salida. Lo que ya esté en el archivo no se toca. De cada
// nota se guarda la última versión que se publicó, con la dirección:
//
//   · la del posteo de Facebook, si salió en Facebook (el libro de las redes);
//   · si no, la del último titular con el que se publicó.
//
// Lo que una persona bloqueó o descartó después no entra. Lo que el semáforo
// frene de ahora en más lo saca generar-datos en la corrida siguiente.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  slugsConocidos, fijarSlug, actualizarArchivo, idsEnRedes, sinPuntaje, comoArchivoJson,
} from '../lib/archivo.js';

const AQUI = import.meta.dirname;
const RAIZ_REPO = path.join(AQUI, '..', '..');
const DATOS = path.join(AQUI, '..', 'data');
const PORTADA_EN_GIT = 'web/data/portada.json';

function leerJson(archivo, porDefecto) {
  try { return JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch { return porDefecto; }
}

const git = (...args) => execFileSync('git', args, { cwd: RAIZ_REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** Todas las versiones de portada.json, de la más vieja a la más nueva. */
function versionesDeLaPortada() {
  const commits = git('log', '--format=%H', '--reverse', '--', PORTADA_EN_GIT).split('\n').filter(Boolean);
  const versiones = [];
  for (const c of commits) {
    try { versiones.push(JSON.parse(git('show', `${c}:${PORTADA_EN_GIT}`))); } catch { /* una versión rota no frena nada */ }
  }
  return versiones;
}

/**
 * Las notas de todas las versiones, cada una en su última forma publicada.
 * Separado para poder probarlo sin git.
 */
export function notasDelHistorial(versiones = []) {
  const ultima = new Map();
  for (const v of versiones) for (const n of v?.notas ?? []) if (n?.id) ultima.set(n.id, n);
  return [...ultima.values()];
}

if (process.argv[1] && process.argv[1].endsWith('recuperar-archivo.mjs')) {
  const salida = process.argv.find((a) => a.startsWith('--salida='))?.slice(9) ?? path.join(DATOS, 'archivo.json');
  const existente = leerJson(path.join(DATOS, 'archivo.json'), { notas: [] });
  const libro = leerJson(path.join(DATOS, 'redes.json'), {});
  const decisiones = leerJson(path.join(DATOS, 'decisiones.json'), { decisiones: {} }).decisiones ?? {};

  const versiones = versionesDeLaPortada();
  const historial = notasDelHistorial(versiones);
  console.log(`  ${versiones.length} versiones de portada.json · ${historial.length} notas distintas`);

  // Lo que ya está en el archivo manda (dirección incluida); del historial se
  // suma sólo lo que falta. La dirección de lo nuevo: la del libro de las
  // redes si salió ahí, o la de su último titular.
  const yaEstan = new Set((existente.notas ?? []).map((n) => n.id));
  const conocidos = slugsConocidos({ libro });
  const humana = (d) => !!d && !!d.por && d.por !== 'ia';
  const retiradas = new Set(historial
    .filter((n) => humana(decisiones[n.id]) && !['publicada', 'automatica'].includes(decisiones[n.id].estado))
    .map((n) => n.id));
  const nuevas = historial
    .filter((n) => !yaEstan.has(n.id) && !retiradas.has(n.id))
    .map((n) => sinPuntaje(fijarSlug(n, conocidos)));

  const archivo = actualizarArchivo({
    archivo: [...(existente.notas ?? []), ...nuevas],
    retiradas,
    enRedes: idsEnRedes(libro),
  });
  fs.writeFileSync(salida, comoArchivoJson(archivo), 'utf8');
  console.log(`  ${salida}: ${archivo.length} notas (${nuevas.length} recuperadas del historial, ${retiradas.size} bloqueadas)`);
}

// Achica UNA VEZ las fotos que ya estaban en el banco (29/09): las guardadas
// antes de que se achicaran al bajarlas (web/scripts/achicar-foto.mjs).
//
//   node web/scripts/achicar-fotos-existentes.mjs           muestra qué haría
//   node web/scripts/achicar-fotos-existentes.mjs --hacer   lo hace
//
// Por cada foto del banco (`web/data/banco-fotos.json`) de más de 200 KB: la pasa
// a JPEG de hasta 1.200 px; si pesa menos, reemplaza el archivo (cambia la
// extensión a .jpg y la entrada del banco), y si no, la deja como está. Se puede
// correr las veces que haga falta: una foto ya achicada no se toca.

import fs from 'node:fs';
import path from 'node:path';
import { achicarFoto } from './achicar-foto.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const BANCO = path.join(RAIZ, 'data', 'banco-fotos.json');
const UMBRAL = 200_000;
const hacer = process.argv.includes('--hacer');

const crudo = fs.readFileSync(BANCO, 'utf8');
const eol = crudo.includes('\r\n') ? '\r\n' : '\n';
const banco = JSON.parse(crudo);

let antes = 0;
let despues = 0;
let cambiadas = 0;
for (const [id, b] of Object.entries(banco)) {
  if (!b?.archivo) continue;
  const ruta = path.join(RAIZ, 'public', b.archivo);
  if (!fs.existsSync(ruta)) continue;
  const original = fs.readFileSync(ruta);
  if (original.length <= UMBRAL) continue;
  const chica = await achicarFoto(original);
  if (!chica || chica.length >= original.length) { console.log(`${id}: se queda (${Math.round(original.length / 1024)} KB)`); continue; }
  antes += original.length;
  despues += chica.length;
  cambiadas += 1;
  const nuevoArchivo = `fotos-notas/${id}.jpg`;
  console.log(`${id}: ${Math.round(original.length / 1024)} KB → ${Math.round(chica.length / 1024)} KB`);
  if (!hacer) continue;
  fs.writeFileSync(path.join(RAIZ, 'public', nuevoArchivo), chica);
  if (nuevoArchivo !== b.archivo) fs.rmSync(ruta, { force: true });
  banco[id] = { ...b, archivo: nuevoArchivo };
}
console.log(`\n${cambiadas} fotos: ${(antes / 1e6).toFixed(1)} MB → ${(despues / 1e6).toFixed(1)} MB${hacer ? '' : ' (no se cambió nada: falta --hacer)'}`);
if (hacer && cambiadas) fs.writeFileSync(BANCO, JSON.stringify(banco, null, 2).split('\n').join(eol) + (crudo.endsWith(eol) ? eol : ''));

// Busca fotos repetidas o casi iguales entre las notas publicadas (sólo lectura).
//   node pruebas-modelos/fotos-repetidas.mjs
// Calcula una "huella" de cada foto (dHash: se achica la imagen a 9x8 en gris y se compara cada píxel con el vecino) con la
// librería sharp que ya trae el sitio (web/node_modules). Dos fotos casi iguales tienen huellas casi iguales aunque tengan
// otro tamaño, otro formato o una compresión distinta. Sin IA, sin costo, siempre da lo mismo.
// Escribe fotos-repetidas.md.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const AQUI = import.meta.dirname;
const RAIZ = path.join(AQUI, '..');
const sharp = createRequire(path.join(RAIZ, 'web', 'package.json'))('sharp');
const archivo = Object.values(JSON.parse(fs.readFileSync(path.join(RAIZ, 'web/data/archivo.json'), 'utf8')).notas);
const conFoto = archivo.filter((n) => n.foto?.archivo);
const DISTANCIA = Number(process.argv.find((a) => a.startsWith('--distancia='))?.split('=')[1] ?? 6);

async function huella(ruta) {
  const px = await sharp(ruta).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let h = 0n;
  for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) h = (h << 1n) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1n : 0n);
  return h;
}
const hamming = (a, b) => { let x = a ^ b; let c = 0; while (x) { c += Number(x & 1n); x >>= 1n; } return c; };

const huellas = [];
let sinArchivo = 0; let fallas = 0;
for (const n of conFoto) {
  const ruta = path.join(RAIZ, 'web', 'public', n.foto.archivo);
  if (!fs.existsSync(ruta)) { sinArchivo += 1; continue; }
  try { huellas.push({ id: n.id, titulo: n.titulo, foto: n.foto.archivo, fecha: n.fecha, h: await huella(ruta), seccion: n.seccion }); } catch { fallas += 1; }
}
console.log(`${huellas.length} fotos con huella (${sinArchivo} sin archivo, ${fallas} no se pudieron leer).`);

const pares = [];
for (let i = 0; i < huellas.length; i += 1) for (let j = i + 1; j < huellas.length; j += 1) {
  const d = hamming(huellas[i].h, huellas[j].h);
  if (d <= DISTANCIA) pares.push({ d, a: huellas[i], b: huellas[j] });
}
pares.sort((x, y) => x.d - y.d);
const porD = {}; pares.forEach((p) => { porD[p.d] = (porD[p.d] ?? 0) + 1; });
const mismaFoto = new Set(pares.flatMap((p) => [p.a.id, p.b.id]));

const L = ['# Fotos repetidas o casi iguales entre las notas publicadas\n'];
L.push(`- Notas publicadas: ${archivo.length}. Con foto propia guardada: ${conFoto.length}. Huellas calculadas: **${huellas.length}**.`);
L.push(`- Pares de fotos con huella casi igual (diferencia de ${DISTANCIA} bits o menos de 64): **${pares.length}**, que involucran **${mismaFoto.size} notas**.`);
L.push(`- Por diferencia: ${Object.entries(porD).map(([d, c]) => `${d} bits → ${c}`).join(' · ') || '—'}.\n`);
L.push('| Dif. | Nota A | Nota B | Archivo A | Archivo B |', '|---|---|---|---|---|');
for (const p of pares.slice(0, 60)) L.push(`| ${p.d} | ${p.a.titulo.slice(0, 55).replace(/\|/g, '/')} | ${p.b.titulo.slice(0, 55).replace(/\|/g, '/')} | ${path.basename(p.a.foto)} | ${path.basename(p.b.foto)} |`);
fs.writeFileSync(path.join(AQUI, 'fotos-repetidas.md'), `${L.join('\n')}\n`);
console.log(L.slice(0, 5).join('\n'));

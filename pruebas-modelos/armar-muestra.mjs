// Arma pruebas-modelos/muestra.json con 30 notas reales (sólo LEE del repo).
//   node pruebas-modelos/armar-muestra.mjs
//
// De dónde sale cada cosa:
//  · Las 27 notas publicadas: web/data/archivo.json (+ la ficha de la IA en fichas.json, si hay).
//  · Las 3 que NO deberían salir: web/data/retiradas.json (notas que el sistema dejó pasar y una persona
//    sacó a mano). archivo.json sólo guarda lo publicado, así que lo que el sistema descarta solo no queda
//    guardado con su título; estas tres son las únicas descartadas reales con título. Sin cuerpo.
//  · Los pares: 3 que cuentan el mismo hecho (los que el sistema juntó: web/data/fusionadas.json) y 3 de
//    control que tratan el mismo tema pero NO son el mismo hecho (criterio nuestro).

import fs from 'node:fs';
import path from 'node:path';
import { ciudadDelMedio } from '../ingesta/lectura-ia.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, 'web/data', f), 'utf8'));

const archivo = Object.values(leer('archivo.json').notas);
const porId = new Map(archivo.map((n) => [n.id, n]));
const fichas = leer('fichas.json').fichas;
const retiradas = leer('retiradas.json').notas;

const IMPACTO_A_INTERES = { directo: 'alto', indirecto: 'medio', nulo: 'ninguno' };

// grupo: balcarce | zona | afuera
const ELEGIDAS = [
  ['balcarce', 'u6j4ho', 'aqy95q', '1d75c0g', '601x8n', '18jx7kk', '16tb2vo', '7r5ucc', 'a00g5p', '6txjlx'],
  ['zona', '1pwavd9', 'ayjy85', 'fd2y4d', '1dbacpl', 'gepu85', '1dou3ni'],
  ['afuera', '1qnkumc', '1egbk71', 'rilva6', '1cnlvgi', 'vwb5m5', 'l5o975', '1onb1mo', 'w8iv0l', 'vr9xc5', '5crmtt', '1s56ua', 'tnbf7h'],
];
// Las que no deberían salir: [id, de qué clase es]
const NO_DEBERIAN = [['1m3wgub', 'horóscopo'], ['o84faj', 'chimento de farándula'], ['1q0dki', 'del extranjero sin conexión argentina']];

const PARES_MISMO_HECHO = [['1qnkumc', '1egbk71'], ['rilva6', '1cnlvgi'], ['a00g5p', '6txjlx']];
const PARES_DISTINTOS = [['7r5ucc', '15imf6x'], ['ovito2', 'yya7lo'], ['5crmtt', '117ewnb']];

function deArchivo(id, grupo) {
  const n = porId.get(id);
  if (!n) throw new Error(`no está en archivo.json: ${id}`);
  const f = fichas[id];
  const medio = n.medios?.[0] ?? '';
  return {
    id, grupo, titulo: n.titulo, resumen: n.copete ?? '', cuerpo: n.cuerpo ?? '', medio, medios: n.medios ?? [],
    ciudad_del_medio: ciudadDelMedio({ medio }),
    sistema: {
      publicada: true,
      seccion: n.seccion,
      interes: f ? IMPACTO_A_INTERES[f.impacto] : null,
      ambito: f?.ambito ?? null,
      motivo: f?.porque ?? null,
    },
  };
}

function deRetiradas([id, clase]) {
  const r = retiradas[id];
  if (!r) throw new Error(`no está en retiradas.json: ${id}`);
  return {
    id, grupo: 'afuera', titulo: r.titulo, resumen: '', cuerpo: '', sinCuerpo: true, medio: r.medio, medios: [r.medio],
    ciudad_del_medio: ciudadDelMedio({ medio: r.medio }),
    sistema: { publicada: false, seccion: null, interes: 'ninguno', ambito: null, motivo: `${clase}: ${r.motivo}` },
  };
}

const notas = [];
for (const [grupo, ...ids] of ELEGIDAS) for (const id of ids) notas.push(deArchivo(id, grupo));
for (const caso of NO_DEBERIAN) notas.push(deRetiradas(caso));
if (notas.length !== 30) throw new Error(`se esperaban 30 notas y hay ${notas.length}`);

// Notas extra que sólo se usan para los pares de control (no cuentan entre las 30).
const idsDeLas30 = new Set(notas.map((n) => n.id));
const soloParaPares = [];
const nota = (id) => {
  const n = notas.find((x) => x.id === id) ?? soloParaPares.find((x) => x.id === id);
  if (n) return n;
  const nueva = deArchivo(id, 'afuera');
  soloParaPares.push(nueva);
  return nueva;
};
const par = (clave, [a, b], mismo) => ({ clave, a: a, b: b, mismo_sistema: mismo });
const pares = [
  ...PARES_MISMO_HECHO.map((p, i) => par(`mismo-${i + 1}`, p, true)),
  ...PARES_DISTINTOS.map((p, i) => par(`distinto-${i + 1}`, p, false)),
];
for (const p of pares) { nota(p.a); nota(p.b); }

const salida = {
  armada: new Date().toISOString(),
  nota: 'Las 30 notas son reales. Las 3 con sinCuerpo salen de retiradas.json (sólo tienen título). Los pares "mismo" son los que juntó el sistema; los "distinto" son de control y su verdad la fijamos nosotros.',
  notas,
  notasSoloParaPares: soloParaPares.filter((n) => !idsDeLas30.has(n.id)),
  pares,
};
const destino = path.join(import.meta.dirname, 'muestra.json');
fs.writeFileSync(destino, `${JSON.stringify(salida, null, 1)}\n`);

const cuenta = (f) => notas.filter(f).length;
console.log(`muestra.json: ${notas.length} notas (Balcarce ${cuenta((n) => n.grupo === 'balcarce')}, zona ${cuenta((n) => n.grupo === 'zona')}, afuera ${cuenta((n) => n.grupo === 'afuera')}); ${cuenta((n) => !n.sistema.publicada)} que no deberían salir; ${pares.length} pares`);

// Compara dos versiones de las reglas de la IA (CRITERIO-EDITORIAL.md, § 12) con
// notas reales y el mismo verificador de producción (29/09).
//
//   node reels/comparar-instruccion.mjs actual
//   node reels/comparar-instruccion.mjs archivo-de-reglas.txt [--notas=24]
//
// Usa reescribirAutomaticas, la función de producción: mismo pedido a Gemini, mismo
// verificador, mismos reintentos con corrección. Los textos completos de las fuentes se
// bajan una sola vez y se guardan en reels/salida/comparar/textos.json, así las dos
// versiones parten del mismo material. Deja los resultados en
// reels/salida/comparar/<nombre>.json y un resumen en pantalla.
//
// Gasta pedidos de la clave de redacción (uno o dos por nota): no correrlo de más.

import fs from 'node:fs';
import path from 'node:path';
import { traerTexto } from '../ingesta/articulo.mjs';
import { reescribirAutomaticas, usarReglasDePrueba } from './reescritura.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const SALIDA = path.join(import.meta.dirname, 'salida', 'comparar');
fs.mkdirSync(SALIDA, { recursive: true });

const [, , queVersion = 'actual', ...resto] = process.argv;
const cuantas = Number(resto.find((a) => a.startsWith('--notas='))?.split('=')[1] ?? 24);
const nombre = queVersion === 'actual' ? 'actual' : path.basename(queVersion).replace(/\.[^.]+$/, '');
if (queVersion !== 'actual') usarReglasDePrueba(fs.readFileSync(queVersion, 'utf8').replace(/\r\n/g, '\n').trim());

// Las notas de prueba: las que hoy esperan cuerpo y, para completar, las últimas de la portada.
const leer = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', f), 'utf8'));
const esperando = leer('esperando-cuerpo.json');
const deEsperando = (Array.isArray(esperando) ? esperando : Object.values(esperando)).map((n) => ({
  id: n.id, titulo: n.titulo, resumenFuente: n.copete ?? '', seccion: n.seccion, fecha: n.fecha,
  medios: (n.fuentes ?? []).map((f) => f.medio ?? f).filter(Boolean), enlace: (n.fuentes ?? []).find((f) => f?.enlace)?.enlace ?? null,
}));
const dePortada = leer('portada.json').notas.map((n) => ({
  id: n.id, titulo: n.titulo, resumenFuente: n.copete ?? '', seccion: n.seccion, fecha: n.fecha,
  medios: n.medios ?? [], enlace: n.fuentesConsultadas?.find((f) => f?.enlace)?.enlace ?? n.enlace ?? null,
}));
const vistas = new Set();
const notas = [...deEsperando, ...dePortada]
  .filter((n) => n.id && n.enlace && !vistas.has(n.id) && vistas.add(n.id))
  .slice(0, cuantas)
  .map((n) => ({ ...n, semaforo: 'verde', relevancia: 50, local: true }));

// Los textos completos, bajados una vez.
const ARCHIVO_TEXTOS = path.join(SALIDA, 'textos.json');
const textos = fs.existsSync(ARCHIVO_TEXTOS) ? JSON.parse(fs.readFileSync(ARCHIVO_TEXTOS, 'utf8')) : {};
const traer = async (enlace) => {
  if (!(enlace in textos)) textos[enlace] = (await traerTexto(enlace)) ?? null;
  return textos[enlace];
};

const lineas = [];
const t0 = Date.now();
const r = await reescribirAutomaticas(notas, {
  traer, tope: cuantas, porDia: Infinity, maximoDeIntentos: 99, registro: (l) => { lineas.push(l); },
});
fs.writeFileSync(ARCHIVO_TEXTOS, JSON.stringify(textos));

const cuerpos = Object.values(r).filter((x) => x.cuerpo);
const palabras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean).length;
const media = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const resumen = {
  version: nombre,
  notasPedidas: notas.length,
  conCuerpo: cuerpos.length,
  cuerpoMediaPalabras: media(cuerpos.map((x) => palabras(x.cuerpo))),
  tituloMediaCaracteres: media(cuerpos.map((x) => x.titulo.length)),
  copeteMediaPalabras: media(cuerpos.map((x) => palabras(x.copete))),
  segundos: Math.round((Date.now() - t0) / 1000),
  registro: lineas.filter((l) => /reescritura:|IA rechazada|oraciones sacadas/.test(l)),
};
fs.writeFileSync(path.join(SALIDA, `${nombre}.json`), JSON.stringify({ resumen, notas: r }, null, 2));
console.log(JSON.stringify(resumen, null, 2));

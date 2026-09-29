// Compara versiones de las reglas de la IA (CRITERIO-EDITORIAL.md, § 12) con
// notas reales y el mismo verificador de producción (29/09).
//
//   node reels/comparar-instruccion.mjs actual
//   node reels/comparar-instruccion.mjs actual variante-a.txt variante-b.txt [--notas=24] [--nuevas]
//
// Usa reescribirAutomaticas, la función de producción: mismo pedido a Gemini, mismo
// verificador, mismos reintentos con corrección. Todas las versiones de una corrida
// reciben las MISMAS notas: la primera vez se eligen (las que esperan cuerpo y, para
// completar, las últimas de la portada) y se guardan en reels/salida/comparar/notas.json;
// las corridas siguientes las reusan hasta que se pida --nuevas. Los textos completos
// de las fuentes se bajan una sola vez (reels/salida/comparar/textos.json).
//
// Entre pedido y pedido espera unos segundos, y si Gemini contesta "sin cupo" (429)
// espera y reintenta: el 29/09 el primer A/B se ensució con esos rechazos, que no
// dicen nada de la instrucción. Deja cada resultado en reels/salida/comparar/<nombre>.json
// y una tabla al final.
//
// Gasta pedidos de la clave de redacción (uno o dos por nota): no correrlo de más.

import fs from 'node:fs';
import path from 'node:path';
import { traerTexto } from '../ingesta/articulo.mjs';
import { reescribirAutomaticas, usarReglasDePrueba } from './reescritura.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const SALIDA = path.join(import.meta.dirname, 'salida', 'comparar');
fs.mkdirSync(SALIDA, { recursive: true });

const argumentos = process.argv.slice(2);
const cuantas = Number(argumentos.find((a) => a.startsWith('--notas='))?.split('=')[1] ?? 24);
const nuevas = argumentos.includes('--nuevas');
const versiones = argumentos.filter((a) => !a.startsWith('--'));
if (!versiones.length) versiones.push('actual');

// Las notas de prueba, las mismas para todas las versiones.
const ARCHIVO_NOTAS = path.join(SALIDA, 'notas.json');
const leer = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', f), 'utf8'));
function elegirNotas() {
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
  return [...deEsperando, ...dePortada]
    .filter((n) => n.id && n.enlace && !vistas.has(n.id) && vistas.add(n.id))
    .slice(0, cuantas)
    .map((n) => ({ ...n, semaforo: 'verde', relevancia: 50, local: true }));
}
const notas = !nuevas && fs.existsSync(ARCHIVO_NOTAS)
  ? JSON.parse(fs.readFileSync(ARCHIVO_NOTAS, 'utf8')).slice(0, cuantas)
  : elegirNotas();
fs.writeFileSync(ARCHIVO_NOTAS, JSON.stringify(notas, null, 2));

// Los textos completos, bajados una vez.
const ARCHIVO_TEXTOS = path.join(SALIDA, 'textos.json');
const textos = fs.existsSync(ARCHIVO_TEXTOS) ? JSON.parse(fs.readFileSync(ARCHIVO_TEXTOS, 'utf8')) : {};
const traer = async (enlace) => {
  if (!(enlace in textos)) textos[enlace] = (await traerTexto(enlace)) ?? null;
  return textos[enlace];
};

// Un pedido cada 5 segundos como mínimo, y paciencia con el 429.
const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });
let ultimoPedido = 0;
let sinCupo = 0;
async function fetchConPausa(url, init) {
  for (let intento = 1; ; intento += 1) {
    const espera = ultimoPedido + 5000 - Date.now();
    if (espera > 0) await dormir(espera);
    ultimoPedido = Date.now();
    const res = await fetch(url, init);
    if (res.status !== 429 || intento === 4) return res;
    sinCupo += 1;
    await dormir(20000 * intento);
  }
}

const palabras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean).length;
const media = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
// Los tipos de problema que anota el verificador, contados en el registro.
const TIPOS = ['copia', 'numero', 'nombre', 'fecha', 'cita', 'promesa', 'pasado', 'tildes', 'relleno', 'localia', 'repite', 'titulo', 'largo', 'corto'];

const tabla = [];
for (const version of versiones) {
  const nombre = version === 'actual' ? 'actual' : path.basename(version).replace(/\.[^.]+$/, '');
  usarReglasDePrueba(version === 'actual' ? null : fs.readFileSync(version, 'utf8').replace(/\r\n/g, '\n').trim());
  const lineas = [];
  const t0 = Date.now();
  const sinCupoAntes = sinCupo;
  const r = await reescribirAutomaticas(notas, {
    traer, tope: cuantas, porDia: Infinity, maximoDeIntentos: 99, registro: (l) => { lineas.push(l); },
    opciones: { fetchFn: fetchConPausa },
  });
  fs.writeFileSync(ARCHIVO_TEXTOS, JSON.stringify(textos));

  const cuerpos = Object.values(r).filter((x) => x.cuerpo);
  const problemas = lineas.filter((l) => /IA rechazada|oraciones sacadas/.test(l));
  const porTipo = Object.fromEntries(TIPOS.map((t) => [t, problemas.filter((l) => l.includes(t === 'corto' ? 'cuerpo corto' : t)).length]));
  const resumen = {
    version: nombre,
    notasPedidas: notas.length,
    conCuerpo: cuerpos.length,
    rechazadas: lineas.filter((l) => l.includes('IA rechazada')).length,
    conOracionesSacadas: lineas.filter((l) => l.includes('oraciones sacadas')).length,
    porTipo,
    cuerpoMediaPalabras: media(cuerpos.map((x) => palabras(x.cuerpo))),
    tituloMediaCaracteres: media(cuerpos.map((x) => x.titulo.length)),
    copeteMediaPalabras: media(cuerpos.map((x) => palabras(x.copete))),
    sinCupo: sinCupo - sinCupoAntes,
    segundos: Math.round((Date.now() - t0) / 1000),
    registro: lineas.filter((l) => /reescritura:|IA rechazada|oraciones sacadas|claves de Gemini/.test(l)),
  };
  fs.writeFileSync(path.join(SALIDA, `${nombre}.json`), JSON.stringify({ resumen, notas: r }, null, 2));
  console.log(`\n${nombre}: ${resumen.conCuerpo} de ${resumen.notasPedidas} con cuerpo · ${resumen.segundos} s`);
  for (const l of resumen.registro) console.log(l);
  tabla.push(resumen);
}

console.log('\nversión            con cuerpo  rechazadas  copia  número  nombre  palabras  título  429');
for (const x of tabla) {
  console.log(`${x.version.padEnd(18)} ${`${x.conCuerpo}/${x.notasPedidas}`.padStart(10)}  ${String(x.rechazadas).padStart(10)}  ${String(x.porTipo.copia).padStart(5)}  ${String(x.porTipo.numero).padStart(6)}  ${String(x.porTipo.nombre).padStart(6)}  ${String(x.cuerpoMediaPalabras).padStart(8)}  ${String(x.tituloMediaCaracteres).padStart(6)}  ${String(x.sinCupo).padStart(3)}`);
}

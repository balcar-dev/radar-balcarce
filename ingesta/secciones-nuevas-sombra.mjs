// El mapa nuevo de secciones, en modo sombra: cómo quedarían repartidas las
// notas REALES ya publicadas si se aprobara (docs/secciones/MAPA-DE-SECCIONES.md).
//
//   node ingesta/secciones-nuevas-sombra.mjs                 los últimos 30 días
//   node ingesta/secciones-nuevas-sombra.mjs --dias=60
//   node ingesta/secciones-nuevas-sombra.mjs --json=salida.json   además, todo en un archivo
//   node ingesta/secciones-nuevas-sombra.mjs --feeds=lectura.json  una lista de notas propia ({ notas: [...] })
//
// No toca nada: lee web/data/portada.json, archivo.json e historico/*.json y
// muestra. No usa la red ni la IA. Sin dependencias (sólo Node).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECCIONES_NUEVAS, seccionNueva } from './secciones-nuevas.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATOS = path.join(RAIZ, 'web', 'data');

const opcion = (nombre, porDefecto = null) => {
  const a = process.argv.find((x) => x.startsWith(`--${nombre}=`));
  return a ? a.slice(nombre.length + 3) : porDefecto;
};
const leer = (archivo) => {
  try { return JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch { return null; }
};

/** Las notas publicadas (sin las propias: repasos, dólar, clima…), sin repetir, de los últimos `dias`. */
export function notasPublicadas({ dias = 30, ahora = Date.now(), datos = DATOS } = {}) {
  const fuentes = [leer(path.join(datos, 'portada.json')), leer(path.join(datos, 'archivo.json'))];
  const dirHist = path.join(datos, 'historico');
  if (fs.existsSync(dirHist)) for (const f of fs.readdirSync(dirHist).filter((x) => x.endsWith('.json')).sort().reverse()) fuentes.push(leer(path.join(dirHist, f)));
  const vistos = new Set();
  const corte = ahora - dias * 864e5;
  const notas = [];
  for (const d of fuentes) for (const n of d?.notas ?? []) {
    if (!n?.id || vistos.has(n.id) || n.propia || !n.seccion) continue;
    vistos.add(n.id);
    const t = new Date(n.fecha).getTime();
    if (Number.isFinite(t) && t >= corte && t <= ahora + 864e5) notas.push(n);
  }
  return notas;
}

/** Un número fijo por nota (para que la muestra sea siempre la misma con los mismos datos). */
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/** La muestra para revisar a mano: `cambian` de las que cambian de sección y el resto de las que quedan. */
export function muestra(clasificadas, { total = 40, cambian = 25 } = {}) {
  const orden = (a, b) => hash(a.nota.id) - hash(b.nota.id);
  const movidas = clasificadas.filter((c) => c.r.seccion !== c.r.antes).sort(orden);
  const quietas = clasificadas.filter((c) => !movidas.includes(c)).sort(orden);
  const m = movidas.slice(0, cambian);
  return [...m, ...quietas.slice(0, total - m.length)];
}

export function informe(notas, { dias = 30 } = {}) {
  const clasificadas = notas.map((nota) => ({ nota, r: seccionNueva(nota) }));
  const semanas = dias / 7;
  const filas = SECCIONES_NUEVAS.map((s) => {
    const suyas = clasificadas.filter((c) => c.r.seccion === s.nombre);
    const deAca = suyas.filter((c) => c.nota.local || c.nota.seccion === 'Balcarce').length;
    return {
      seccion: s.nombre, etiqueta: s.etiqueta ?? s.nombre, nueva: s.nueva, menu: s.menu, color: s.color,
      notas: suyas.length, porSemana: +(suyas.length / semanas).toFixed(1), porDia: +(suyas.length / dias).toFixed(2), deAca,
      dudosas: suyas.filter((c) => c.r.duda).length,
    };
  });
  const matriz = {};
  for (const { nota, r } of clasificadas) (matriz[nota.seccion] ??= {})[r.seccion] = (matriz[nota.seccion][r.seccion] ?? 0) + 1;
  const resumen = (c) => ({ id: c.nota.id, titulo: c.nota.titulo, antes: c.r.antes, nueva: c.r.seccion, motivo: c.r.motivo, duda: c.r.duda, alternativa: c.r.alternativa ?? null, local: !!c.nota.local, fecha: c.nota.fecha });
  return {
    dias, total: notas.length, filas, matriz,
    cambian: clasificadas.filter((c) => c.r.seccion !== c.r.antes).length,
    dudosas: clasificadas.filter((c) => c.r.duda).map(resumen),
    avisos: clasificadas.filter((c) => c.r.aviso).map((c) => ({ ...resumen(c), aviso: c.r.aviso })),
    muestra: muestra(clasificadas).map(resumen),
  };
}

const esEjecutable = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (esEjecutable) {
  const dias = Number(opcion('dias', 30));
  const feeds = opcion('feeds');
  const notas = feeds ? (leer(feeds)?.notas ?? []) : notasPublicadas({ dias });
  const inf = informe(notas, { dias });
  const negrita = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);
  negrita(`MAPA NUEVO EN SOMBRA · ${inf.total} notas de los últimos ${dias} días · ${inf.cambian} cambian de sección`);
  console.log('SECCIÓN                    NOTAS  /SEM  /DÍA  DE ACÁ  DUDOSAS  MENÚ');
  for (const f of [...inf.filas].sort((a, b) => b.notas - a.notas)) {
    console.log(`${(f.etiqueta + (f.nueva ? ' *' : '')).padEnd(26)} ${String(f.notas).padStart(5)} ${String(f.porSemana).padStart(5)} ${String(f.porDia).padStart(5)} ${String(f.deAca).padStart(7)} ${String(f.dudosas).padStart(8)}  ${f.menu}`);
  }
  console.log('(* = sección nueva)');
  negrita('DE DÓNDE VIENE CADA UNA (sección de hoy → nueva; sólo lo que cambia)');
  for (const [a, destinos] of Object.entries(inf.matriz)) {
    const cambios = Object.entries(destinos).filter(([d]) => d !== a);
    if (cambios.length) console.log(`${a.padEnd(18)} → ${cambios.sort((x, y) => y[1] - x[1]).map(([d, c]) => `${d} ${c}`).join(' · ')}`);
  }
  negrita(`DUDOSAS (${inf.dudosas.length}; las primeras 30)`);
  for (const d of inf.dudosas.slice(0, 30)) console.log(`  ${d.antes} → ${d.nueva}${d.alternativa ? ` (o ${d.alternativa})` : ''} · ${d.motivo} · ${d.titulo.slice(0, 90)}`);
  negrita(`PRONÓSTICOS PUBLICADOS COMO NOTA (${inf.avisos.length})`);
  for (const d of inf.avisos) console.log(`  ${d.titulo.slice(0, 100)}`);
  negrita('MUESTRA PARA REVISAR A MANO (40: 25 que cambian, 15 que quedan)');
  inf.muestra.forEach((m, i) => console.log(`${String(i + 1).padStart(2)}. [${m.antes} → ${m.nueva}] ${m.titulo.slice(0, 95)}  (${m.motivo})`));
  const salida = opcion('json');
  if (salida) { fs.writeFileSync(salida, JSON.stringify(inf, null, 1)); console.log(`\nGuardado en ${salida}`); }
}

// Arma la base mensual de "Un día como hoy" (30/09): para cada día, las 20
// mejores candidatas, y las piezas de los feriados que vienen. Baja los datos de
// Wikipedia (Portal Argentina, feed "un día como hoy") y de la API de feriados,
// y escribe:
//
//   web/data/efemerides-candidatas.json   las 20 mejores de cada día
//   web/data/feriados-piezas.json         cada feriado con su enfoque y sus datos
//
// Uso:  node ingesta/generar-efemerides.mjs --desde=2026-10-05 --dias=31
// Es una corrida a mano, una vez por mes: no está en ningún workflow.
// Lo que elige la gente desde el panel del celular queda en
// web/data/efemerides-elegidas.json y sirve para afinar el puntaje
// (ingesta/efemerides.mjs, docs/13-EFEMERIDES.md).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parsearPortal, especialesDelDia, candidatasDelDia, lasMejores, curadasDelDia, leerCuradas, piezasDeFeriados,
  marcasDe, ANIO_DE_REFERENCIA,
} from './efemerides.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const UA = 'RadarBalcarce/0.1 (https://radarbalcarce.com; radarbalcarce@gmail.com)';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });

async function json(url, intentos = 3) {
  for (let i = 1; ; i += 1) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i >= intentos) throw new Error(`${url}: ${e.message}`);
      await dormir(1500 * i);
    }
  }
}

async function portalDelDia(mes, dia) {
  for (const numero of dia === 1 ? ['1º', '1'] : [String(dia)]) {
    const titulo = encodeURIComponent(`Portal:Argentina/Efemérides del ${numero} de ${MESES[mes - 1]}`);
    const j = await json(`https://es.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&page=${titulo}`);
    if (j?.parse?.wikitext) return parsearPortal(j.parse.wikitext);
  }
  return [];
}

const pad = (n) => String(n).padStart(2, '0');
const feed = (tipo, mes, dia) => json(`https://es.wikipedia.org/api/rest_v1/feed/onthisday/${tipo}/${pad(mes)}/${pad(dia)}`);

/** Del feed de Wikipedia, lo que vale la pena: hechos con algo curioso o argentino, y argentinos que nacieron ese día. */
function delFeed({ events, births }) {
  const salida = [];
  const url = (p) => p?.pages?.[0]?.content_urls?.desktop?.page ?? null;
  for (const e of events?.events ?? []) {
    if (!e.text || !e.year) continue;
    salida.push({ anio: e.year, texto: mayuscula(e.text.trim()), fuente: url(e) });
  }
  for (const b of births?.births ?? []) {
    const descripcion = b.pages?.[0]?.description ?? '';
    if (!/argentin|balcarce/i.test(`${b.text} ${descripcion}`) || !b.year) continue;
    // El texto ya trae la descripción ("Fulano, actor argentino (f. 2011)."): no se repite.
    salida.push({ anio: b.year, texto: `Nace ${b.text.trim()}`.replace(/\s+/g, ' '), fuente: url(b) });
  }
  return salida;
}

const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const normal = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 32);

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
  const desde = new Date(`${args.desde ?? '2026-10-05'}T12:00:00Z`);
  const dias = Number(args.dias ?? 31);
  const curadas = leerCuradas();
  const resultado = {};
  for (let i = 0; i < dias; i += 1) {
    const f = new Date(desde.getTime() + i * 86400000);
    const iso = f.toISOString().slice(0, 10);
    const mes = f.getUTCMonth() + 1; const dia = f.getUTCDate();
    const mmdd = `${pad(mes)}-${pad(dia)}`;
    const [portal, holidays, events, births] = [await portalDelDia(mes, dia), await feed('holidays', mes, dia), await feed('events', mes, dia), await feed('births', mes, dia)];
    const especiales = especialesDelDia(holidays?.holidays?.map((h) => h.text) ?? []);
    const del = delFeed({ events, births });
    let todas = candidatasDelDia(mmdd, { portal, especiales, feed: del, curadas: curadasDelDia(mmdd, curadas) });
    // Repetidas (el mismo "Día del…" en dos listas) y las que no valen nada.
    const vistas = new Set();
    todas = todas.filter((c) => c.puntaje >= 20 && !vistas.has(normal(c.texto)) && vistas.add(normal(c.texto)));
    resultado[iso] = { diaSemana: DIAS[f.getUTCDay()], candidatas: lasMejores(todas) };
    process.stdout.write(`${iso}: ${todas.length} candidatas (${resultado[iso].candidatas.length} en la lista)\n`);
    await dormir(400);
  }
  const salida = { generado: new Date().toISOString(), anioDeReferencia: ANIO_DE_REFERENCIA, desde: args.desde ?? '2026-10-05', dias };
  const renglones = Object.entries(resultado).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',\n');
  fs.writeFileSync(path.join(RAIZ, 'web', 'data', 'efemerides-candidatas.json'),
    `{${JSON.stringify(salida).slice(1, -1)},\n"dias":{\n${renglones}\n}}\n`.replace(/\n/g, '\r\n'));

  // Los feriados que vienen (esta corrida y los meses siguientes).
  const hoy = new Date().toISOString().slice(0, 10);
  const limite = new Date(Date.now() + 240 * 86400000).toISOString().slice(0, 10);
  const feriados = [];
  for (const anio of [new Date().getFullYear(), new Date().getFullYear() + 1]) {
    const lista = await json(`https://api.argentinadatos.com/v1/feriados/${anio}`);
    feriados.push(...(lista ?? []));
  }
  const piezas = piezasDeFeriados(feriados, curadas, { desde: hoy, hasta: limite });
  fs.writeFileSync(path.join(RAIZ, 'web', 'data', 'feriados-piezas.json'),
    `${JSON.stringify({ generado: new Date().toISOString(), feriados: piezas }, null, 1)}\n`.replace(/\n/g, '\r\n'));
  process.stdout.write(`feriados: ${piezas.length}\n`);
}

// marcasDe se importa para que las pruebas vean que el generador usa las mismas marcas.
export { marcasDe };

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  await main();
}

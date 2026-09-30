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
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parsearPortal, especialesDelDia, candidatasDelDia, lasMejores, curadasDelDia, leerCuradas, piezasDeFeriados,
  marcasDe, ANIO_DE_REFERENCIA, RE_PAGINA_GENERICA, IDIOMAS_FIGURA_MUNDIAL, IDIOMAS_ARGENTINO_CONOCIDO, mismoHecho, PUNTAJE_MINIMO,
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

/** Del feed de Wikipedia, lo que puede valer la pena, con las páginas que trae cada hecho (para medir qué tan importante es). */
function delFeed({ events, births }) {
  const salida = [];
  const paginas = (x) => (x.pages ?? []).map((p) => ({ qid: p.wikibase_item ?? null, descripcion: p.description ?? '', url: p.content_urls?.desktop?.page ?? null }));
  for (const e of events?.events ?? []) {
    if (!e.text || !e.year) continue;
    salida.push({ anio: e.year, texto: mayuscula(e.text.trim()), paginas: paginas(e) });
  }
  for (const b of births?.births ?? []) {
    if (!b.text || !b.year) continue;
    // Argentinos, y cualquiera de los que el mundo entero conoce (se filtra por importancia más adelante).
    salida.push({ anio: b.year, texto: ('Nace ' + b.text.trim()).replace(/\s+/g, ' '), paginas: paginas(b), nacimiento: true });
  }
  return salida;
}

// ------------------------------------------------- qué tan conocido es algo

const PAGINA_CACHE = new Map(); // título → qid
const WD_CACHE = new Map(); // qid → { idiomas, descripcion }
const RUTA_CACHE = path.join(os.tmpdir(), 'radar-efemerides-importancia.json');
try {
  const c = JSON.parse(fs.readFileSync(RUTA_CACHE, 'utf8'));
  for (const [k, v] of Object.entries(c.paginas ?? {})) PAGINA_CACHE.set(k, v);
  for (const [k, v] of Object.entries(c.wikidata ?? {})) WD_CACHE.set(k, v);
} catch { /* sin caché todavía */ }
const guardarCache = () => { try { fs.writeFileSync(RUTA_CACHE, JSON.stringify({ paginas: Object.fromEntries(PAGINA_CACHE), wikidata: Object.fromEntries(WD_CACHE) })); } catch { /* no pasa nada */ } };
const enLotes = (lista, n) => { const r = []; for (let i = 0; i < lista.length; i += n) r.push(lista.slice(i, i + n)); return r; };

/** De títulos de Wikipedia en español, sus identificadores de Wikidata. */
async function qidsDeTitulos(titulos) {
  const faltan = [...new Set(titulos)].filter((x) => !PAGINA_CACHE.has(x));
  for (const lote of enLotes(faltan, 40)) {
    const j = await json('https://es.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=pageprops&ppprop=wikibase_item&titles=' + encodeURIComponent(lote.join('|')));
    const q = j?.query ?? {};
    const siguiente = (t) => {
      let x = (q.normalized ?? []).find((n) => n.from === t)?.to ?? t;
      x = (q.redirects ?? []).find((n) => n.from === x)?.to ?? x;
      return x;
    };
    const porTitulo = new Map((q.pages ?? []).map((p) => [p.title, p.pageprops?.wikibase_item ?? null]));
    for (const t of lote) PAGINA_CACHE.set(t, porTitulo.get(siguiente(t)) ?? null);
    await dormir(200);
  }
}

/** De identificadores de Wikidata, en cuántas ediciones de Wikipedia tienen página y su descripción. */
async function datosDeWikidata(qids) {
  const faltan = [...new Set(qids)].filter((x) => x && !WD_CACHE.has(x));
  for (const lote of enLotes(faltan, 50)) {
    const j = await json('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks|descriptions&languages=es&ids=' + lote.join('|'));
    for (const id of lote) {
      const e = j?.entities?.[id];
      const idiomas = Object.keys(e?.sitelinks ?? {}).filter((k) => /wiki$/.test(k) && !/^(commons|species|meta|wikidata|mediawiki|wikimania)wiki$/.test(k)).length;
      WD_CACHE.set(id, { idiomas, descripcion: e?.descriptions?.es?.value ?? '' });
    }
    await dormir(300);
  }
}

const esGenerica = (descripcion) => RE_PAGINA_GENERICA.test(descripcion);

/** Qué tan conocido es lo más específico de un hecho del feed: el máximo entre sus páginas que no son un país, un año o una ciudad. */
function importanciaDelFeed(paginas) {
  let mejor = { idiomas: 0, url: paginas[0]?.url ?? null };
  for (const p of paginas) {
    const d = p.qid ? WD_CACHE.get(p.qid) : null;
    if (!d || esGenerica(d.descripcion || p.descripcion)) continue;
    if (d.idiomas > mejor.idiomas) mejor = { idiomas: d.idiomas, url: p.url ?? mejor.url };
  }
  return mejor;
}

const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const normal = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 32);

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
  const desde = new Date(`${args.desde ?? '2026-10-05'}T12:00:00Z`);
  const dias = Number(args.dias ?? 31);
  const curadas = leerCuradas();
  const crudos = [];
  for (let i = 0; i < dias; i += 1) {
    const f = new Date(desde.getTime() + i * 86400000);
    const iso = f.toISOString().slice(0, 10);
    const mes = f.getUTCMonth() + 1; const dia = f.getUTCDate();
    const [portal, holidays, events, births] = [await portalDelDia(mes, dia), await feed('holidays', mes, dia), await feed('events', mes, dia), await feed('births', mes, dia)];
    crudos.push({ iso, mes, dia, semana: DIAS[f.getUTCDay()], portal, especiales: especialesDelDia(holidays?.holidays?.map((h) => h.text) ?? []), feed: delFeed({ events, births }) });
    process.stdout.write(iso + ': bajado\n');
    await dormir(400);
  }

  // Qué tan conocido es cada tema (en cuántos idiomas de Wikipedia tiene página).
  process.stdout.write('midiendo qué tan conocido es cada tema…\n');
  await qidsDeTitulos(crudos.flatMap((c) => c.portal.map((p) => p.pagina).filter(Boolean)));
  await datosDeWikidata([...crudos.flatMap((c) => c.portal.map((p) => PAGINA_CACHE.get(p.pagina)).filter(Boolean)), ...crudos.flatMap((c) => c.feed.flatMap((x) => x.paginas.map((p) => p.qid)).filter(Boolean))]);

  guardarCache();
  const resultado = {};
  for (const c of crudos) {
    const mmdd = pad(c.mes) + '-' + pad(c.dia);
    const portal = c.portal.map((p) => {
      const qid = PAGINA_CACHE.get(p.pagina);
      const d = qid ? WD_CACHE.get(qid) : null;
      const importancia = d && !esGenerica(d.descripcion) ? d.idiomas : 0;
      return { anio: p.anio, texto: p.texto, importancia, enlace: p.pagina ? 'https://es.wikipedia.org/wiki/' + encodeURIComponent(p.pagina.replace(/ /g, '_')) : null };
    });
    const dePortal = 'https://es.wikipedia.org/wiki/' + encodeURIComponent('Portal:Argentina/Efemérides_del_' + c.dia + '_de_' + MESES[c.mes - 1]);
    for (const p of portal) p.enlace ??= dePortal;
    const delMundo = c.feed.map((x) => {
      const m = importanciaDelFeed(x.paginas);
      // Sin página propia, el enlace lleva al día en Wikipedia ("16 de octubre"): siempre hay algo para leer.
      return { anio: x.anio, texto: x.texto, importancia: m.idiomas, enlace: m.url ?? 'https://es.wikipedia.org/wiki/' + c.dia + '_de_' + MESES[c.mes - 1], nacimiento: x.nacimiento };
    })
      // Los nacimientos del mundo, sólo los de figuras que conoce todo el mundo (o argentinos).
      .filter((x) => !x.nacimiento || (/argentin|balcarce/i.test(x.texto) ? x.importancia >= IDIOMAS_ARGENTINO_CONOCIDO : x.importancia >= IDIOMAS_FIGURA_MUNDIAL));
    let todas = candidatasDelDia(mmdd, { portal, especiales: c.especiales, feed: delMundo, curadas: curadasDelDia(mmdd, curadas) });
    const vistas = new Set();
    todas = todas.filter((x) => x.puntaje >= PUNTAJE_MINIMO && !vistas.has(normal(x.texto)) && vistas.add(normal(x.texto)));
    // El Portal y el feed cuentan a veces lo mismo (Saavedra Lamas, Homero Manzi): queda la de más puntaje.
    todas = todas.filter((x, i) => !todas.slice(0, i).some((y) => mismoHecho(x, y)));
    resultado[c.iso] = { diaSemana: c.semana, candidatas: lasMejores(todas) };
    process.stdout.write(c.iso + ': ' + todas.length + ' candidatas (' + resultado[c.iso].candidatas.length + ' en la lista)\n');
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

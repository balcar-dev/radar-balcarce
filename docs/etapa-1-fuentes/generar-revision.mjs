// Arma docs/etapa-1-fuentes/REVISION-FUENTES.html: un solo archivo, sin librerías, para que
// Hernán y Andrés revisen las fuentes de a una (Sí / No / Duda) desde la PC o el celular.
//
//   node docs/etapa-1-fuentes/generar-revision.mjs            escribe REVISION-FUENTES.html
//   node docs/etapa-1-fuentes/generar-revision.mjs --salida=otra.html
//
// SÓLO LEE. De dónde sale cada cosa (no se inventa nada: sin dato, "—"):
//   · la lista de fuentes y sus pesos, dueños y secciones: ingesta/fuentes.mjs y ingesta/fuentes-cruce.mjs
//   · a qué grupo pertenece cada medio, por qué entró y su dato medido: LISTA-ELEGIDA.md
//   · cuántas notas publicadas nombran a cada medio en los últimos 30 días: web/data/archivo.json y
//     web/data/historico/*.json (es lo único que el motor guarda; lo que se leyó y se descartó no queda registrado)
//   · cuántas notas trae cada feed y si andaba: fuentes-medidas.csv (medido desde la PC el 15/10)
//   · qué feeds fallan desde Cloudflare: el sondeo del 15/10 (constante SONDEO_CLOUDFLARE, con su origen)
//   · cuántas veces fue imprescindible y cuántas visitas tuvo: también del CSV, medido sobre el archivo
// Sin dependencias: sólo Node.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FUENTES, FUENTES_NACIONALES } from '../../ingesta/fuentes.mjs';
import { FUENTES_CRUCE } from '../../ingesta/fuentes-cruce.mjs';
import { MEDIOS_DE_AFUERA, MEDIOS_POR_DEFECTO, MEDIOS_CON_FIGURA } from '../../ingesta/criterio.mjs';
import { BALCARCE_FONDO, COMO, FECHA_INVESTIGACION } from './balcarce-fondo.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..', '..');

/** Del registro de Actions de "Sondeo de fuentes desde Cloudflare" (corrida 38786372081, 15/10/2026 18:31 UTC,
 *  nombre de navegador): "97 de 103 feeds andan. No andan 6: 6 desafío (HTTP 403)". Y "contestan pero con lo más
 *  nuevo de hace más de 7 días: ahorabalcarce, fca-unmdp, agenciacyta, gabal-agro". */
export const SONDEO_CLOUDFLARE = {
  cuando: '15/10/2026',
  corrida: '38786372081',
  total: 103,
  andan: 97,
  desafio: ['infobae', 'infobae-tecno', 'infobae-economia', 'infobae-politica', 'infobae-cultura', 'infobae-deportes'],
  viejos: ['ahorabalcarce', 'fca-unmdp', 'agenciacyta', 'gabal-agro'],
};

/** Las fuentes de AFUERA que Claude saca de la pantalla principal (pedido de Hernán y Andrés, 15/10) y las manda a
 *  "Descartadas", con el motivo. Además se descartan solas: (1) todas las apagadas y (2) toda activa de afuera cuya
 *  sugerencia automática es "apagar" (feed caído, cero notas, etc.). Acá van las que el criterio automático no atrapa:
 *  las de mismo dueño que otra que ya cuenta y las que casi no aportan. Nada se borra: queda todo en la sección
 *  plegada del final, y ingesta/fuentes*.mjs no se toca hasta que los dueños decidan. La clave es el nombre del medio. */
export const DESCARTADAS_POR_CLAUDE = {
  'Radio Mitre': {
    tipo: 'dueno',
    motivo: (m) => `Mismo dueño que Clarín, TN y Olé (Grupo Clarín): los cuatro cuentan como una sola voz en el cruce, así que Radio Mitre no suma ningún medio nuevo. Con sus ${m.nFeedsActivos} feeds trae ${m.trae7 ?? '—'} notas por semana a esa misma voz. Clarín y TN quedan.`,
  },
  'El Marplatense': {
    tipo: 'dueno',
    motivo: (m) => `Mismo sistema que El Eco de Tandil, QZ y LU9 (eleco.com.ar): los cuatro cuentan como un solo medio. Nunca fue imprescindible (${m.imprescindible ?? 0} veces). Quedan El Eco (de Tandil, imprescindible 4) y QZ.`,
  },
  'LU9 Mar del Plata': {
    tipo: 'dueno',
    motivo: (m) => `Mismo sistema que El Eco, QZ y El Marplatense (eleco.com.ar): cuentan como un solo medio. Aporta ${m.pub30} notas en 30 días y fue imprescindible ${m.imprescindible ?? 0} ${m.imprescindible === 1 ? 'vez' : 'veces'}.`,
  },
  'Qué Digital': {
    tipo: 'sin-aporte',
    motivo: (m) => `${m.pub30} notas publicadas en 30 días, nunca imprescindible (${m.imprescindible ?? 0}) y ${m.vistas ?? 0} visitas a sus notas: casi no suma ni al cruce ni a los lectores.`,
  },
  'La Gaceta (Tucumán)': {
    tipo: 'sin-aporte',
    motivo: (m) => `Alta del 15/10 sin historial. ${m.pub30} notas publicadas que lo nombran y casi todo lo que trae es de Tucumán, a más de mil kilómetros: sólo puede pasar el cruce si otros tres medios lo cuentan, pero suma volumen sin aportar a Balcarce.`,
  },
  'Los Andes (Mendoza)': {
    tipo: 'sin-aporte',
    motivo: (m) => `Alta del 15/10 sin historial. ${m.pub30} notas publicadas que lo nombran y su índice trae 349 notas por vuelta (según LISTA-ELEGIDA.md), casi todas de Mendoza.`,
  },
  elDiarioAR: {
    tipo: 'sin-aporte',
    motivo: (m) => `Alta del 15/10 sin historial. ${m.pub30} nota publicada en 30 días y una sola que nombra a Balcarce: es "otra mirada" pero no llega a pesar en el cruce.`,
  },
};

const ETIQUETA_DESCARTE = {
  apagada: 'Ya estaba apagada',
  caida: 'Caída o bloqueada',
  dueno: 'Mismo dueño: redundante',
  'sin-aporte': 'No aporta',
};

/** ¿Va a "Descartadas"? Devuelve { tipo, etiqueta, motivo } o null. */
export function descarteDe(m) {
  if (m.grupo === 'balcarce') return null; // lo de Balcarce nunca se descarta solo
  if (!m.activo) {
    const sug = m.sugerencia.accion === 'revisar' ? ` ${m.sugerencia.texto}` : '';
    return { tipo: 'apagada', etiqueta: ETIQUETA_DESCARTE.apagada, motivo: `${m.motivoApagada || 'Apagada en el registro (activa: false).'}${sug}`.trim() };
  }
  const regla = DESCARTADAS_POR_CLAUDE[m.nombre];
  if (regla) return { tipo: regla.tipo, etiqueta: ETIQUETA_DESCARTE[regla.tipo], motivo: regla.motivo(m) };
  if (m.sugerencia.accion === 'apagar') {
    const caida = m.feeds.filter((f) => f.activa).every((f) => f.nivel === 'mal');
    const tipo = caida ? 'caida' : 'sin-aporte';
    return { tipo, etiqueta: ETIQUETA_DESCARTE[tipo], motivo: m.sugerencia.texto };
  }
  return null;
}

/** Los umbrales de la sugerencia: se muestran en la página para que se vea con qué criterio se arma. */
export const UMBRALES = {
  dias: 30,
  pocas: 2, // 2 notas publicadas o menos en 30 días = "aporta muy poco"
  aportaba: 15, // una apagada con 15 o más notas publicadas en 30 días merece que la miren
  imprescindible: 10, // veces imprescindible que justifican un feed bloqueado
  muchas: 20, // notas publicadas en 30 días que justifican un feed bloqueado
  diasMuerta: 7,
};

// ---------------------------------------------------------------- utilidades

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[\p{M}]/gu, '');
const norm = (s) => sinTildes(s).toLowerCase().replace(/\s+/g, ' ').trim();
const normSinParentesis = (s) => norm(String(s ?? '').replace(/\([^)]*\)/g, ' '));
const clave = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const fechaCorta = (iso) => (iso ? `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}` : null);

/** CSV con comillas (la planilla de medir-fuentes.mjs). Devuelve filas de objetos. */
export function leerCSV(texto) {
  const bruto = String(texto ?? '');
  const t = bruto.charCodeAt(0) === 0xFEFF ? bruto.slice(1) : bruto;
  const filas = [];
  let fila = [];
  let campo = '';
  let entre = false;
  for (let i = 0; i < t.length; i += 1) {
    const c = t[i];
    if (entre) {
      if (c === '"') {
        if (t[i + 1] === '"') { campo += '"'; i += 1; } else entre = false;
      } else campo += c;
    } else if (c === '"') entre = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo.replace(/\r$/, '')); filas.push(fila); fila = []; campo = ''; }
    else campo += c;
  }
  if (campo || fila.length) { fila.push(campo.replace(/\r$/, '')); filas.push(fila); }
  const [cab, ...resto] = filas;
  return resto.filter((f) => f.length > 1).map((f) => Object.fromEntries(cab.map((k, i) => [k, f[i] ?? ''])));
}

/** Las tablas de LISTA-ELEGIDA.md: a qué grupo pertenece cada medio, por qué entra y su dato medido. */
export function leerListaElegida(texto) {
  const filas = []; // { nombre, grupo, subgrupo, porQue, dato, alta }
  let grupo = null;
  let subgrupo = null;
  let enApagadas = false;
  const apagadas = []; // { nombres: [..], motivo }
  for (const linea of String(texto ?? '').split(/\r?\n/)) {
    const h2 = linea.match(/^## (.+)/);
    const h3 = linea.match(/^### (.+)/);
    if (h2) {
      subgrupo = null;
      enApagadas = false;
      if (/^De Balcarce/i.test(h2[1])) grupo = 'balcarce';
      else if (/^De Tandil/i.test(h2[1])) grupo = 'zona';
      else if (/^Del pa[ií]s/i.test(h2[1])) grupo = 'pais';
      else { grupo = null; enApagadas = /^Lo que se apag/i.test(h2[1]); }
      continue;
    }
    if (h3) { subgrupo = h3[1].replace(/\s*\(\d+\)\s*$/, '').trim(); continue; }
    if (!linea.startsWith('|')) {
      const pol = linea.match(/^La Brújula 24 \(.*?\),\s*La Verdad.*Letra P.*La Tecla/);
      if (grupo === 'pais' && pol) {
        const dato = {
          'La Brújula 24': 'n 61 · de acá 4', 'La Verdad': 'n 88 · vistas 41', 'Letra P': 'política, otra mirada · n 16', 'La Tecla': 'política bonaerense · n 51',
        };
        for (const [nombre, d] of Object.entries(dato)) filas.push({ nombre, grupo, subgrupo, porQue: '', dato: d, alta: false });
      }
      continue;
    }
    const celdas = linea.split('|').slice(1, -1).map((c) => c.trim());
    if (celdas.length < 2 || /^-+$/.test(celdas[0].replace(/\s/g, '')) || /^Medio/.test(celdas[0])) continue;
    if (enApagadas) {
      if (/^Medio/i.test(celdas[0])) continue;
      const nombres = celdas[0].split(/,\s*|\s+y\s+/).map((n) => n.replace(/\([^)]*\)/g, '').trim()).filter(Boolean);
      apagadas.push({ nombres, motivo: (celdas[1] ?? '').replace(/\*\*/g, '').replace(/`/g, '') });
      continue;
    }
    if (!grupo) continue;
    const bruto = celdas[0];
    const nombre = bruto.replace(/\*\*/g, '').replace(/\((alta|nuevo feed)\)/gi, '').replace(/\s+/g, ' ').trim();
    const alta = /\((alta)\)/i.test(bruto) || /sin historial|estaba apagad/i.test(celdas[celdas.length - 1] ?? '') || /reactivad/i.test(celdas[4] ?? '');
    const porQue = celdas.length >= 5 ? celdas[4] : '';
    const dato = celdas.length >= 6 ? celdas[5] : celdas[celdas.length - 1];
    filas.push({ nombre, grupo, subgrupo, porQue: porQue.replace(/\*\*/g, '').replace(/`/g, ''), dato: (dato ?? '').replace(/\*\*/g, '').replace(/`/g, ''), alta });
  }
  return { filas, apagadas };
}

/** ¿El nombre de la lista (a veces abreviado) es este medio del registro? */
function mismoMedio(nombreLista, medio) {
  const a = normSinParentesis(nombreLista);
  const b = normSinParentesis(medio);
  if (!a || !b) return false;
  return a === b || b.startsWith(`${a} `) || a.startsWith(`${b} `);
}

// ---------------------------------------------------------------- los datos

function leerJSON(ruta, defecto) {
  try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch { return defecto; }
}

/** Notas publicadas (archivo + histórico, sin repetir ni propias) con la fecha en que se vieron. */
export function leerNotas(raiz) {
  const dir = path.join(raiz, 'web', 'data');
  const todas = [...(leerJSON(path.join(dir, 'archivo.json'), { notas: [] }).notas ?? [])];
  const hist = path.join(dir, 'historico');
  let archivos = [];
  try { archivos = fs.readdirSync(hist).filter((f) => f.endsWith('.json')); } catch { /* sin histórico */ }
  for (const f of archivos) todas.push(...(leerJSON(path.join(hist, f), { notas: [] }).notas ?? []));
  const vistas = new Set();
  const notas = [];
  for (const n of todas) {
    if (!n || n.propia || !n.id || vistas.has(n.id)) continue;
    vistas.add(n.id);
    notas.push({ id: n.id, cuando: n.visto ?? n.fecha ?? null, medios: Array.isArray(n.medios) ? n.medios.filter(Boolean) : [] });
  }
  return notas;
}

const TIPO_TEXTO = {
  rss: ['Feed · RSS', 'feed'],
  atom: ['Feed · Atom', 'feed'],
  sitemap: ['Feed · índice de noticias', 'feed'],
  scrape: ['Scraping de la portada', 'scraping'],
};

/** Junta todo en un objeto listo para pintar. `ahora` sólo se usa para el sello de "generado". */
export function armarDatos({ raiz = RAIZ, ahora = new Date() } = {}) {
  const dirDoc = path.join(raiz, 'docs', 'etapa-1-fuentes');
  const lista = leerListaElegida(fs.readFileSync(path.join(dirDoc, 'LISTA-ELEGIDA.md'), 'utf8'));
  let csv = [];
  try { csv = leerCSV(fs.readFileSync(path.join(dirDoc, 'fuentes-medidas.csv'), 'utf8')); } catch { /* sin planilla */ }
  const csvPorId = new Map(csv.map((r) => [r.id, r]));
  let medidoEl = null;
  try { medidoEl = fs.readFileSync(path.join(dirDoc, 'ANALISIS.md'), 'utf8').match(/Medido el (\d{1,2}\/\d{1,2}\/\d{4})/)?.[1] ?? null; } catch { /* sin análisis */ }

  // --- los feeds, con de qué archivo vienen
  const feedsTodos = [
    ...FUENTES.map((f) => ({ ...f, origen: 'fuente', archivoOrigen: 'fuentes.mjs' })),
    ...FUENTES_NACIONALES.map((f) => ({ ...f, origen: 'fuente', archivoOrigen: 'fuentes.mjs' })),
    ...FUENTES_CRUCE.map((f) => ({ ...f, origen: 'cruce', archivoOrigen: 'fuentes-cruce.mjs' })),
  ];

  // --- las notas de los últimos 30 días
  const notas = leerNotas(raiz);
  const fechas = notas.map((n) => n.cuando).filter(Boolean).sort();
  const ultimaNota = fechas.at(-1) ?? null;
  const corte = ultimaNota ? new Date(new Date(ultimaNota).getTime() - UMBRALES.dias * 86400000).toISOString() : null;
  const enVentana = notas.filter((n) => n.cuando && corte && n.cuando >= corte);
  const publicadas = new Map();
  const unica = new Map();
  for (const n of enVentana) {
    const distintos = [...new Set(n.medios)];
    for (const m of distintos) {
      publicadas.set(m, (publicadas.get(m) ?? 0) + 1);
      if (distintos.length === 1) unica.set(m, (unica.get(m) ?? 0) + 1);
    }
  }

  // --- los medios
  const porMedio = new Map();
  for (const f of feedsTodos) {
    const m = f.medio ?? f.nombre;
    if (!porMedio.has(m)) porMedio.set(m, []);
    porMedio.get(m).push(f);
  }
  const activosDe = (fs_) => fs_.filter((f) => f.activa !== false);
  const gruposActivos = new Map(); // dueño -> medios activos
  for (const [m, fs_] of porMedio) {
    if (!activosDe(fs_).length) continue;
    for (const g of new Set(fs_.map((f) => f.grupo).filter(Boolean))) {
      if (!gruposActivos.has(g)) gruposActivos.set(g, new Set());
      gruposActivos.get(g).add(m);
    }
  }

  const apagadasLista = lista.apagadas;
  const medios = [];
  for (const [nombre, fs_] of porMedio) {
    const activos = activosDe(fs_);
    const activo = activos.length > 0;
    const exacta = lista.filas.find((r) => normSinParentesis(r.nombre) === normSinParentesis(nombre));
    const enLista = activo ? (exacta ?? lista.filas.find((r) => mismoMedio(r.nombre, nombre))) : null;
    let grupo;
    if (!activo) grupo = 'apagadas';
    else if (enLista) grupo = enLista.grupo;
    else grupo = 'otras';
    const filaApagada = !activo ? apagadasLista.find((a) => a.nombres.some((n) => mismoMedio(n, nombre))) : null;

    // feeds con su estado
    const feedsFila = fs_.map((f) => {
      const r = csvPorId.get(f.id);
      const [tipoTexto, tipoCorto] = TIPO_TEXTO[f.tipo] ?? [f.tipo ?? '—', 'feed'];
      const bloqueado = SONDEO_CLOUDFLARE.desafio.includes(f.id);
      let nivel = 'nada';
      let texto = '—';
      if (r) {
        const http = num(r.http);
        const items = num(r.items);
        const dias = num(r.diasDesdeUltima);
        if (http == null || http < 200 || http >= 300) { nivel = 'mal'; texto = `No responde desde la PC (${http == null ? 'sin conexión' : `HTTP ${http}`})`; }
        else if (!items) { nivel = 'aviso'; texto = 'Responde pero no trae notas'; }
        else if (r.muerta === 'sí' || (dias != null && dias >= UMBRALES.diasMuerta)) {
          nivel = 'aviso'; texto = `la nota más nueva tiene ${dias == null ? 'más de 7' : Math.round(dias)} días`;
        } else if (!r.ultimaNota) { nivel = 'ok'; texto = `Anda: ${items} notas (la portada no trae fechas)`; }
        else { nivel = 'ok'; texto = `Anda: ${items} notas, la última el ${r.ultimaNota.slice(8, 10)}/${r.ultimaNota.slice(5, 7)}`; }
      }
      let cloudflare = null;
      if (bloqueado) {
        const andaEnLaPC = r && num(r.http) >= 200 && num(r.http) < 300 && num(r.items);
        nivel = 'mal';
        texto = `${andaEnLaPC ? `Desde la PC anda (${num(r.items)} notas), pero ` : ''}Cloudflare lo bloquea (HTTP 403, pantalla de verificación)`;
      } else if (SONDEO_CLOUDFLARE.viejos.includes(f.id)) cloudflare = ['aviso', 'Desde Cloudflare contesta, pero con lo más nuevo de hace más de 7 días'];
      else if (f.activa !== false && r) cloudflare = ['ok', 'Desde Cloudflare: anda'];
      return {
        id: f.id,
        url: f.url,
        tipo: f.tipo,
        tipoTexto,
        tipoCorto,
        seccion: f.seccion ?? null,
        peso: f.peso ?? null,
        activa: f.activa !== false,
        origen: f.origen,
        oficial: !!f.oficial,
        nota: f.nota ?? null,
        // si casi todas las notas vienen sin fecha (portadas raspadas) no se sabe cuántas son de los últimos 7 días
        notas7d: r && !((num(r.sinFecha) ?? 0) * 2 > (num(r.items) ?? 0)) ? num(r.notas7d) : null,
        nivel,
        estado: texto,
        cloudflare,
        bloqueado,
      };
    });

    // lo medido a nivel del medio (el CSV lo repite en cada feed del medio)
    const filaCsv = fs_.map((f) => csvPorId.get(f.id)).find(Boolean);
    const imprescindible = filaCsv ? num(filaCsv.medioImprescindible) : null;
    const vistas = filaCsv ? num(filaCsv.medioVistas) : null;
    const totalHistorico = filaCsv ? num(filaCsv.medioNotasPublicadas) : null;
    const feedsQueCuentan = feedsFila.filter((f) => (activo ? f.activa : true));
    const trae7 = feedsQueCuentan.some((f) => f.notas7d != null) ? feedsQueCuentan.reduce((s, f) => s + (f.notas7d ?? 0), 0) : null;

    const pub = publicadas.get(nombre) ?? 0;
    const uni = unica.get(nombre) ?? 0;
    const duenos = [...new Set(fs_.map((f) => f.grupo).filter(Boolean))];
    const hermanos = [...new Set(duenos.flatMap((g) => [...(gruposActivos.get(g) ?? [])]))].filter((m) => m !== nombre);

    const f0 = fs_[0];
    medios.push({
      clave: clave(nombre),
      nombre,
      grupo,
      subgrupo: enLista?.subgrupo ?? null,
      alcance: f0.alcance ?? null,
      ciudad: f0.ciudad ?? null,
      activo,
      dueno: duenos.join(' / ') || null,
      hermanos,
      feeds: feedsFila,
      nFeedsActivos: activos.length,
      nFeeds: fs_.length,
      soloCruce: activo && activos.every((f) => f.origen === 'cruce'),
      pub30: pub,
      unica30: uni,
      trae7,
      imprescindible,
      vistas,
      totalHistorico,
      nuevo: !!enLista?.alta,
      apagadaPorLaLista: !activo && fs_.some((f) => /apagada 15\/10\/2026/.test(f.nota ?? '')),
      porQue: enLista?.porQue || '',
      datoMedido: enLista?.dato || '',
      motivoApagada: filaApagada?.motivo || [...new Set(fs_.map((f) => f.nota).filter(Boolean))].join(' · ') || '',
      notasRegistro: [...new Set(fs_.map((f) => f.nota).filter(Boolean))],
    });
  }

  for (const m of medios) {
    m.dudas = dudasDe(m);
    m.sugerencia = sugerenciaDe(m);
  }
  // Pedido del 15/10: las de afuera que no sirven salen de la pantalla principal y van a "Descartadas".
  for (const m of medios) m.descartada = descarteDe(m);

  // "Balcarce a fondo": lo investigado se pega a las filas de Balcarce del registro; lo demás son filas nuevas.
  const filasFondo = []; // { orden, medio?, fondo }
  const usadas = new Set();
  for (const f of BALCARCE_FONDO) {
    const m = f.registroIds.length ? medios.find((x) => x.grupo === 'balcarce' && x.feeds.some((fd) => f.registroIds.includes(fd.id))) : null;
    if (m) { m.fondo = f; usadas.add(m.clave); filasFondo.push({ orden: f.orden, medio: m, fondo: f }); } else filasFondo.push({ orden: f.orden, fondo: f });
  }
  for (const m of medios.filter((x) => x.grupo === 'balcarce' && !usadas.has(x.clave))) filasFondo.push({ orden: 999, medio: m, fondo: null }); // por si se suma una de Balcarce al registro
  filasFondo.sort((a, b) => a.orden - b.orden);

  // orden: grupo, y adentro por subgrupo y nombre (los de Balcarce, por notas)
  const ORDEN = ['balcarce', 'pais', 'zona', 'otras', 'apagadas'];
  medios.sort((a, b) => {
    const g = ORDEN.indexOf(a.grupo) - ORDEN.indexOf(b.grupo);
    if (g) return g;
    if (a.grupo === 'pais') {
      const s = ordenSub(a.subgrupo) - ordenSub(b.subgrupo);
      if (s) return s;
    }
    return b.pub30 - a.pub30 || a.nombre.localeCompare(b.nombre, 'es');
  });

  const activos = medios.filter((m) => m.activo);
  const enPantalla = medios.filter((m) => !m.descartada);
  const descartadas = medios.filter((m) => m.descartada);
  const feedsActivos = feedsTodos.filter((f) => f.activa !== false);
  const nuevasFondo = filasFondo.filter((x) => !x.medio);
  const resumen = {
    mediosActivos: activos.length,
    feedsActivos: feedsActivos.length,
    feedsFuente: feedsActivos.filter((f) => f.origen === 'fuente').length,
    feedsCruce: feedsActivos.filter((f) => f.origen === 'cruce').length,
    mediosSoloCruce: activos.filter((m) => m.soloCruce).length,
    // lo que queda en la pantalla principal, por grupo (sin las descartadas)
    porGrupo: Object.fromEntries(ORDEN.map((g) => [g, enPantalla.filter((m) => m.grupo === g).length])),
    feedsPorGrupo: Object.fromEntries(ORDEN.map((g) => [g, enPantalla.filter((m) => m.grupo === g).reduce((s, m) => s + (g === 'apagadas' ? m.nFeeds : m.nFeedsActivos), 0)])),
    // la lista elegida el 15/10, antes de descartar (11 + 50 + 10)
    porGrupoLista: Object.fromEntries(ORDEN.map((g) => [g, medios.filter((m) => m.grupo === g).length])),
    dudosas: enPantalla.filter((m) => m.dudas.length).length,
    totalMedios: medios.length,
    feedsTotales: feedsTodos.length,
    sugerencias: Object.fromEntries(['mantener', 'revisar', 'apagar'].map((s) => [s, enPantalla.filter((m) => m.sugerencia.accion === s).length])),
    queQuedan: {
      medios: enPantalla.filter((m) => m.activo).length,
      feeds: enPantalla.filter((m) => m.activo).reduce((t, m) => t + m.nFeedsActivos, 0),
    },
    descartadas: {
      total: descartadas.length,
      porTipo: Object.fromEntries(Object.keys(ETIQUETA_DESCARTE).map((t) => [t, descartadas.filter((m) => m.descartada.tipo === t).length])),
      activasQueSeSacan: descartadas.filter((m) => m.activo).length,
    },
    balcarceFondo: {
      filas: filasFondo.length,
      enUso: filasFondo.filter((x) => x.medio).length,
      nuevas: filasFondo.filter((x) => x.fondo?.nueva).length,
      sinRegistro: nuevasFondo.length,
      porComo: Object.fromEntries(Object.keys(COMO).map((k) => [k, filasFondo.filter((x) => (x.fondo?.como ?? 'feed') === k).length])),
      sumar: filasFondo.filter((x) => x.fondo?.accion === 'sumar').length,
    },
  };

  return {
    generado: ahora.toISOString(),
    notasAnalizadas: enVentana.length,
    ventana: corte ? { desde: corte.slice(0, 10), hasta: (ultimaNota ?? '').slice(0, 10) } : null,
    medidoEl,
    hayPlanilla: csv.length > 0,
    medios,
    filasFondo,
    resumen,
    criterio: { MEDIOS_DE_AFUERA, MEDIOS_POR_DEFECTO, MEDIOS_CON_FIGURA },
  };
}

const SUB_ORDEN = ['Diarios, agencia, TV y radio', 'Diarios de provincia y de otras provincias', 'Deportes y automovilismo', 'Agro', 'Economía, tecnología, ciencia, salud y educación', 'Política y provincia, para completar los 50'];
function ordenSub(s) {
  const i = SUB_ORDEN.findIndex((x) => norm(x) === norm(s ?? ''));
  return i < 0 ? 99 : i;
}

// ------------------------------------------------- las dudosas y la sugerencia

/** Lo que hace dudosa a una fuente activa, por datos. Cada duda: { tipo, texto }. */
export function dudasDe(m) {
  if (!m.activo) return [];
  const d = [];
  const activos = m.feeds.filter((f) => f.activa);
  if (!m.nuevo && m.pub30 === 0) d.push({ tipo: 'cero', texto: `No aportó ninguna nota publicada en ${UMBRALES.dias} días` });
  else if (!m.nuevo && m.pub30 <= UMBRALES.pocas) d.push({ tipo: 'poco', texto: `Aportó muy poco: ${m.pub30} ${m.pub30 === 1 ? 'nota publicada' : 'notas publicadas'} en ${UMBRALES.dias} días` });
  const bloq = activos.filter((f) => f.bloqueado);
  if (bloq.length) d.push({ tipo: 'cloudflare', texto: `Bloquea a Cloudflare (${bloq.length} de ${activos.length} ${activos.length === 1 ? 'dirección' : 'direcciones'})` });
  const caidos = activos.filter((f) => f.nivel === 'mal' && !f.bloqueado);
  if (caidos.length) d.push({ tipo: 'caido', texto: `Feed caído: ${caidos.length} de ${activos.length} no responde${caidos.length === 1 ? '' : 'n'} desde la PC` });
  const viejos = activos.filter((f) => f.nivel === 'aviso');
  if (viejos.length && !caidos.length) d.push({ tipo: 'viejo', texto: `Sin notas nuevas en el feed: ${viejos.map((f) => `${f.id} (${f.estado.charAt(0).toLowerCase()}${f.estado.slice(1)})`).join('; ')}` });
  if (m.hermanos.length) d.push({ tipo: 'hermano', texto: `Mismo dueño que ${m.hermanos.join(', ')} (${m.dueno}): cuentan como un solo medio` });
  return d;
}

/** Sugerencia con criterio objetivo: { accion: mantener|revisar|apagar, texto }. */
export function sugerenciaDe(m) {
  const U = UMBRALES;
  const n = m.pub30;
  const imp = m.imprescindible;
  const impTxt = imp ? `, imprescindible ${imp} ${imp === 1 ? 'vez' : 'veces'}` : '';
  if (!m.activo) {
    if (n >= U.aportaba) return { accion: 'revisar', texto: `Estaba aportando (${n} notas publicadas en ${U.dias} días${impTxt}) y ${m.apagadaPorLaLista ? 'se apagó el 15/10 por la lista elegida' : 'hoy está apagada'}. Mirar si se la quiere de vuelta.` };
    if (n > 0) return { accion: 'apagar', texto: `Seguir apagada: aportó ${n} ${n === 1 ? 'nota publicada' : 'notas publicadas'} en ${U.dias} días.` };
    return { accion: 'apagar', texto: `Seguir apagada: no aportó ninguna nota publicada en ${U.dias} días.` };
  }
  const activos = m.feeds.filter((f) => f.activa);
  const bloq = activos.filter((f) => f.bloqueado);
  const caidos = activos.filter((f) => f.nivel === 'mal' && !f.bloqueado);
  const viejos = activos.filter((f) => f.nivel === 'aviso');
  const sobreHermano = m.hermanos.length ? ` Ojo: cuenta como uno con ${m.hermanos.join(', ')}.` : '';
  if (m.nuevo) return { accion: 'mantener', texto: `Mantener a prueba: es nuevo o reactivado desde el 15/10 y todavía no tiene historial. Mirarlo en dos semanas.${sobreHermano}` };
  if (m.grupo === 'balcarce') {
    if (bloq.length || caidos.length) return { accion: 'revisar', texto: `Es de Balcarce (entra siempre), pero su feed no anda bien: ${(bloq[0] ?? caidos[0]).estado.toLowerCase()}.` };
    if (n === 0 || viejos.length) {
      const dato = viejos.length ? viejos[0].estado.toLowerCase() : `cero notas publicadas en ${U.dias} días`;
      return { accion: 'mantener', texto: `Mantener y vigilar: es de Balcarce (entra siempre), pero ${dato}.` };
    }
    return { accion: 'mantener', texto: `Mantener: es de Balcarce y entra siempre (${n} ${n === 1 ? 'nota publicada' : 'notas publicadas'} en ${U.dias} días${impTxt}).` };
  }
  if (bloq.length === activos.length && activos.length) {
    if (n >= U.muchas || (imp ?? 0) >= U.imprescindible) return { accion: 'revisar', texto: `Bloquea a Cloudflare, pero es de los que más aportan (${n} notas publicadas en ${U.dias} días${impTxt}). Buscarle otra vía de lectura antes de apagarlo.` };
    return { accion: 'apagar', texto: `Bloquea a Cloudflare y aporta poco (${n} notas publicadas en ${U.dias} días).` };
  }
  if (caidos.length === activos.length && activos.length) return { accion: 'apagar', texto: `Su feed no responde (${caidos[0].estado.toLowerCase()}).` };
  if (n === 0) return { accion: 'apagar', texto: `Cero notas publicadas en ${U.dias} días${m.feeds.some((f) => f.nivel === 'ok') ? ' (aunque su feed anda)' : ''}.${sobreHermano}` };
  if (n <= U.pocas) {
    if ((imp ?? 0) > 0) return { accion: 'mantener', texto: `Aporta poco (${n} en ${U.dias} días), pero fue imprescindible ${imp} ${imp === 1 ? 'vez' : 'veces'}.${sobreHermano}` };
    return { accion: 'revisar', texto: `Aporta muy poco: ${n} ${n === 1 ? 'nota publicada' : 'notas publicadas'} en ${U.dias} días y nunca fue imprescindible.${sobreHermano}` };
  }
  if (bloq.length || caidos.length || viejos.length) {
    const malo = bloq[0] ?? caidos[0] ?? viejos[0];
    return { accion: 'revisar', texto: `Aporta (${n} notas publicadas en ${U.dias} días${impTxt}), pero hay un feed con problemas: ${malo.estado.toLowerCase()}.${sobreHermano}` };
  }
  return { accion: 'mantener', texto: `Aporta: ${n} notas publicadas en ${U.dias} días${impTxt}.${sobreHermano}` };
}

// ---------------------------------------------------------------- la página

const NOMBRE_GRUPO = {
  balcarce: ['Balcarce a fondo', 'Todo lo de Balcarce y su partido: lo que se lee hoy y lo que se podría leer, investigado el 15/10. Los de acá entran todos.'],
  pais: ['Nacionales elegidos', 'Los 50 mejores medios del país (incluye los de provincia y otras provincias, deportes, agro y economía).'],
  zona: ['Tandil y Mar del Plata', 'Los 10 mejores de la zona.'],
  otras: ['Otras activas', 'Activas que no están en la lista elegida (debería estar vacío).'],
  apagadas: ['Apagadas', 'Están en el registro con activa: false. No se leen, pero se pueden prender de nuevo.'],
  descartadas: ['Descartadas', 'Las de afuera que Claude sacó de la pantalla principal: apagadas, caídas, de mismo dueño o que no aportan.'],
};

const SUG_TEXTO = { mantener: 'Mantener', revisar: 'Revisar', apagar: 'Apagar', sumar: 'Sumar', nosumar: 'No sumar' };

function hostCorto(url) {
  try {
    const u = new URL(url);
    return `${u.host.replace(/^www\./, '')}${u.pathname === '/' ? '' : u.pathname}${u.search}`;
  } catch { return url; }
}

const pluralNotas = (n) => `${n} ${n === 1 ? 'nota' : 'notas'}`;

function htmlFeed(f) {
  const tags = [
    `<span class="tipo tipo-${f.tipoCorto}">${esc(f.tipoTexto)}</span>`,
    `<span class="etq ${f.origen === 'cruce' ? 'etq-cruce' : 'etq-fuente'}" title="${f.origen === 'cruce' ? 'Está en fuentes-cruce.mjs: se lee para contar cuántos medios cuentan lo mismo' : 'Está en fuentes.mjs'}">${f.origen === 'cruce' ? 'de cruce' : 'fuente'}</span>`,
    f.oficial ? '<span class="etq">oficial</span>' : '',
    f.activa ? '' : '<span class="etq etq-apagada">apagada</span>',
  ].join(' ');
  return `<li class="feed${f.activa ? '' : ' feed-apagada'}" data-feed="${esc(f.id)}">
    <div class="feed-linea">${tags}</div>
    <a class="url" href="${esc(f.url)}" target="_blank" rel="noopener noreferrer" title="${esc(f.url)}">${esc(hostCorto(f.url))}</a>
    <div class="feed-datos"><span title="La sección que la dirección fija; sin ella la deciden las palabras clave y la IA">Sección: ${f.seccion ? esc(f.seccion) : '—'}</span> · <span>Peso: ${f.peso ?? '—'}</span> · <code>${esc(f.id)}</code></div>
    <div class="feed-estado nivel-${f.nivel}">${esc(f.estado)}</div>
    ${f.cloudflare ? `<div class="feed-estado nivel-${f.cloudflare[0]}">${esc(f.cloudflare[1])}</div>` : ''}
  </li>`;
}

function htmlNotas(m) {
  const filas = [];
  filas.push(`<div class="num" title="Notas publicadas en los últimos 30 días que lo nombran entre sus medios"><b>${m.pub30}</b> publicadas <span class="chico">en 30 días</span></div>`);
  filas.push(`<div class="chico" title="Notas en las que fue el único medio que la contó">${m.unica30} como única fuente</div>`);
  filas.push(`<div class="chico" title="Suma de lo que traen hoy sus feeds en los últimos 7 días (antes de cualquier filtro; con repetidas entre feeds)">${m.trae7 == null ? '—' : `${m.trae7} que trajo su feed en 7 días`}</div>`);
  if (m.imprescindible != null) filas.push(`<div class="chico" title="Veces que sin este medio una nota de afuera no llegaba al mínimo de medios de su sección (3/9 al 15/10)">imprescindible ${m.imprescindible} ${m.imprescindible === 1 ? 'vez' : 'veces'}</div>`);
  if (m.vistas != null) filas.push(`<div class="chico" title="Visitas a las notas donde figura (desde el 29/9)">${m.vistas} visitas a sus notas</div>`);
  return filas.join('');
}

function htmlEstado(m) {
  const act = m.feeds.filter((f) => (m.activo ? f.activa : true));
  const malos = act.filter((f) => f.nivel === 'mal');
  const avisos = act.filter((f) => f.nivel === 'aviso');
  const sinDato = act.filter((f) => f.nivel === 'nada');
  let nivel = 'ok';
  let texto = `${act.length === 1 ? 'Anda' : `Andan ${act.length - malos.length - avisos.length - sinDato.length} de ${act.length}`}`;
  if (malos.length) { nivel = 'mal'; texto = `${malos.length} de ${act.length} ${malos.length === 1 ? 'no anda' : 'no andan'}`; }
  else if (avisos.length) { nivel = 'aviso'; texto = `${avisos.length} de ${act.length} con notas viejas o vacío`; }
  else if (sinDato.length === act.length) { nivel = 'nada'; texto = '—'; }
  const peor = malos[0] ?? avisos[0];
  return `<div class="feed-estado nivel-${nivel}"><b>${esc(texto)}</b></div>${peor ? `<div class="chico">${esc(peor.estado)}</div>` : ''}`;
}

function htmlPorQue(m) {
  const partes = [];
  if (m.porQue) partes.push(`<p>${esc(m.porQue)}</p>`);
  if (m.datoMedido) partes.push(`<p class="chico"><b>Dato medido:</b> ${esc(m.datoMedido)}</p>`);
  if (!m.activo && m.motivoApagada) partes.push(`<p>${esc(m.motivoApagada)}</p>`);
  if (m.activo && !m.porQue && m.grupo === 'balcarce') partes.push('<p>Es de Balcarce: entran todos los medios y organismos de acá.</p>');
  return partes.join('') || '—';
}

/** La investigación de una fuente de Balcarce (balcarce-fondo.mjs), lista para pegar en la celda "Por qué está". */
function bloqueFondo(f) {
  const peso = f.peso ? `Peso hoy: ${esc(f.peso.hoy)} · sugerido: <b>${esc(f.peso.sugerido)}</b>. ${esc(f.peso.criterio)}` : '';
  return `<details class="afondo" open><summary>A fondo (probado el ${esc(FECHA_INVESTIGACION)})</summary>
    <p><b>Cómo leerla:</b> ${esc(f.comoLeerla)}</p>
    <p class="chico"><b>Qué se probó:</b> ${esc(f.probado)}</p>
    <p class="chico"><b>Qué trae:</b> ${esc(f.contenido)}</p>
    <p class="chico"><b>Texto:</b> ${esc(f.texto)} · <b>Foto:</b> ${esc(f.foto)}</p>
    ${f.selector && f.selector !== '—' ? `<p class="chico"><b>Estructura de la página:</b> ${esc(f.selector)}</p>` : ''}
    <p class="chico"><b>Peso:</b> ${peso}</p>
    ${f.redes && f.redes !== '—' ? `<p class="chico"><b>Redes:</b> ${esc(f.redes)}</p>` : ''}
    ${f.alertas?.length ? `<ul class="dudas">${f.alertas.map((a) => `<li class="duda">${esc(a)}</li>`).join('')}</ul>` : ''}
  </details>`;
}

function htmlFila(m, { descartada = null } = {}) {
  const buscar = norm([m.nombre, m.dueno, m.ciudad, m.subgrupo, m.hermanos.join(' '), ...m.feeds.map((f) => `${f.id} ${f.url} ${f.seccion ?? ''}`)].join(' '));
  const tipos = [...new Set(m.feeds.filter((f) => f.activa || !m.activo).map((f) => f.tipoCorto))].join(' ');
  const origenes = [...new Set(m.feeds.filter((f) => f.activa || !m.activo).map((f) => f.origen))].join(' ');
  const dudaTipos = m.dudas.map((d) => d.tipo).join(' ');
  const feedsHtml = m.feeds.map(htmlFeed).join('');
  const feeds = m.feeds.length > 3
    ? `<details><summary>${m.feeds.length} direcciones (${m.nFeedsActivos} activas)</summary><ul class="feeds">${feedsHtml}</ul></details>`
    : `<ul class="feeds">${feedsHtml}</ul>`;
  const s = m.sugerencia;
  const grupoFila = descartada ? 'descartadas' : m.grupo;
  return `<tr class="fila${descartada ? ' fila-descartada' : ''}${m.dudas.length ? ' dudosa' : ''}${m.activo ? '' : ' fila-apagada'}" id="m-${esc(m.clave)}" data-k="${esc(m.clave)}" data-nombre="${esc(m.nombre)}" data-grupo="${grupoFila}" data-sug="${s.accion}" data-dudosa="${m.dudas.length ? 1 : 0}" data-duda-tipos="${esc(dudaTipos)}" data-tipos="${esc(tipos)}" data-origen="${esc(origenes)}" data-pub="${m.pub30}" data-buscar="${esc(buscar)}">
  <td data-label="Medio" class="c-medio">
    <div class="nombre">${esc(m.nombre)}</div>
    <div class="etqs">${m.subgrupo ? `<span class="etq">${esc(m.subgrupo)}</span>` : ''}${m.ciudad ? `<span class="etq">${esc(m.ciudad)}</span>` : ''}${m.alcance ? `<span class="etq">${esc(m.alcance)}</span>` : ''}${m.nuevo ? '<span class="etq etq-nueva" title="Alta o reactivado el 15/10: todavía sin historial">nuevo / sin historial</span>' : ''}</div>
    ${descartada ? `<div class="motivo-desc"><span class="etq etq-apagada">${esc(descartada.etiqueta)}</span> ${esc(descartada.motivo)}</div>` : ''}
    <div class="dueno" data-dueno><b>Dueño (grupo):</b> ${m.dueno ? esc(m.dueno) : '—'}${m.hermanos.length ? `<br><span class="chico">Hermanos activos: ${esc(m.hermanos.join(', '))}</span>` : ''}</div>
    ${m.dudas.length ? `<ul class="dudas">${m.dudas.map((d) => `<li class="duda duda-${d.tipo}">${esc(d.texto)}</li>`).join('')}</ul>` : ''}
  </td>
  <td data-label="Direcciones que se leen (tipo, URL, sección, peso)" class="c-feeds">${feeds}</td>
  <td data-label="Activa" class="c-activa"><span class="pill ${m.activo ? 'pill-si' : 'pill-no'}">${m.activo ? 'Activa' : 'Apagada'}</span><div class="chico">${m.activo ? `${m.nFeedsActivos} de ${m.nFeeds} direcciones` : `${m.nFeeds} ${m.nFeeds === 1 ? 'dirección' : 'direcciones'}`}</div></td>
  <td data-label="Notas (últimos 30 días)" class="c-notas">${htmlNotas(m)}</td>
  <td data-label="Último estado" class="c-estado">${htmlEstado(m)}</td>
  <td data-label="Por qué está" class="c-porque">${htmlPorQue(m)}${m.fondo ? bloqueFondo(m.fondo) : ''}</td>
  <td data-label="Sugerencia de Claude" class="c-sug"><span class="sug sug-${s.accion}">${SUG_TEXTO[s.accion]}</span><p>${esc(s.texto)}</p>${descartada && s.accion !== 'apagar' ? '<p class="chico">Es el criterio automático por los datos; Claude la sacó igual por el motivo escrito a la izquierda.</p>' : ''}${m.fondo ? `<p class="chico"><b>Sobre cómo leerla:</b> <span class="sug sug-${m.fondo.accion}">${SUG_TEXTO[m.fondo.accion]}</span></p>` : ''}</td>
  <td data-label="${descartada ? 'Tu decisión (Sí = rescatarla)' : 'Tu decisión'}" class="c-decision">
    <div class="botones" role="group" aria-label="Decisión sobre ${esc(m.nombre)}">
      <button type="button" class="b b-si" data-d="Sí" aria-pressed="false">Sí</button>
      <button type="button" class="b b-no" data-d="No" aria-pressed="false">No</button>
      <button type="button" class="b b-duda" data-d="Duda" aria-pressed="false">Duda</button>
    </div>
    <input type="text" class="coment" placeholder="Comentario (opcional)" aria-label="Comentario sobre ${esc(m.nombre)}" maxlength="400">
  </td>
</tr>`;
}

const PILDORA_COMO = { feed: 'pill-si', pagina: 'pill-si', cubierta: 'pill-si', redes: 'pill-no', nada: 'pill-no' };

/** Fila de "Balcarce a fondo" para algo que NO está en el registro (candidata nueva, o ya cubierta por otra fuente). */
function htmlFilaFondo(f) {
  const clave_ = clave(f.nombre);
  const [comoTitulo, comoAyuda, comoCorto] = COMO[f.como];
  const tipoCorto = f.como === 'feed' ? 'feed' : f.como === 'pagina' ? 'scraping' : 'manual';
  const buscar = norm([f.nombre, f.tipoEntidad, ...f.urls.map((u) => `${u.url} ${u.rol}`), f.contenido].join(' '));
  const urlsHtml = f.urls.map((u) => `<li class="feed">
      <div class="feed-linea"><span class="tipo tipo-${tipoCorto}">${esc(u.rol)}</span></div>
      ${/^https?:/.test(u.url) ? `<a class="url" href="${esc(u.url)}" target="_blank" rel="noopener noreferrer" title="${esc(u.url)}">${esc(hostCorto(u.url))}</a>` : ''}
      <div class="feed-estado nivel-${f.nivel}">${esc(u.resultado)}</div>
    </li>`).join('');
  const etqNueva = f.nueva ? '<span class="etq etq-nueva" title="No estaba en la lista ni en el registro">nueva</span>' : '<span class="etq" title="Ya llega por otra fuente o se investigó pero no se lee">investigada</span>';
  return `<tr class="fila fila-fondo" id="m-${esc(clave_)}" data-k="${esc(clave_)}" data-nombre="${esc(f.nombre)}" data-grupo="balcarce" data-sug="${f.accion}" data-dudosa="${f.alertas?.length ? 1 : 0}" data-duda-tipos="" data-tipos="${tipoCorto}" data-origen="" data-pub="0" data-buscar="${esc(buscar)}">
  <td data-label="Medio" class="c-medio">
    <div class="nombre">${esc(f.nombre)}</div>
    <div class="etqs">${etqNueva}<span class="etq">${esc(f.tipoEntidad)}</span></div>
    ${f.alertas?.length ? `<ul class="dudas">${f.alertas.map((a) => `<li class="duda">${esc(a)}</li>`).join('')}</ul>` : ''}
  </td>
  <td data-label="Direcciones que se leen (tipo, URL, sección, peso)" class="c-feeds"><ul class="feeds">${urlsHtml}</ul></td>
  <td data-label="Activa" class="c-activa"><span class="pill ${PILDORA_COMO[f.como]}" title="${esc(comoTitulo + ': ' + comoAyuda)}">${esc(comoCorto)}</span><div class="chico">${f.nueva ? 'Todavía no se lee' : 'No se lee'}</div></td>
  <td data-label="Notas (últimos 30 días)" class="c-notas"><div class="chico">${esc(f.cadencia)}</div></td>
  <td data-label="Último estado" class="c-estado"><div class="feed-estado nivel-${f.nivel}"><b>${f.nivel === 'ok' ? 'Anda' : f.nivel === 'aviso' ? 'Con reparos' : f.nivel === 'mal' ? 'No anda' : 'Sin dato'}</b></div><div class="chico">Probado el ${esc(FECHA_INVESTIGACION)} desde la PC</div></td>
  <td data-label="Por qué está" class="c-porque">${bloqueFondo(f)}</td>
  <td data-label="Sugerencia de Claude" class="c-sug"><span class="sug sug-${f.accion}">${SUG_TEXTO[f.accion]}</span><p>${esc(f.accion === 'sumar' ? 'Conviene sumarla.' : f.accion === 'nosumar' ? 'No conviene sumarla (ver cómo leerla).' : f.accion === 'apagar' ? 'No sirve.' : f.accion === 'revisar' ? 'Tiene sentido, pero hay algo para decidir.' : 'Ya está cubierta.')}</p></td>
  <td data-label="Tu decisión" class="c-decision">
    <div class="botones" role="group" aria-label="Decisión sobre ${esc(f.nombre)}">
      <button type="button" class="b b-si" data-d="Sí" aria-pressed="false">Sí</button>
      <button type="button" class="b b-no" data-d="No" aria-pressed="false">No</button>
      <button type="button" class="b b-duda" data-d="Duda" aria-pressed="false">Duda</button>
    </div>
    <input type="text" class="coment" placeholder="Comentario (opcional)" aria-label="Comentario sobre ${esc(f.nombre)}" maxlength="400">
  </td>
</tr>`;
}

function htmlResumen(d) {
  const r = d.resumen;
  const c = d.criterio;
  const tarjeta = (g, n, extra) => `<div class="tarjeta"><div class="t-num">${n}</div><div class="t-nom">${esc(NOMBRE_GRUPO[g][0])}</div><div class="chico">${extra}</div></div>`;
  const cond = Object.entries(c.MEDIOS_DE_AFUERA).map(([s, n]) => `${esc(s)} ${n}`).join(', ');
  return `<section class="resumen" aria-label="Resumen">
  <div class="tarjetas">
    <div class="tarjeta tarjeta-total"><div class="t-num">${r.queQuedan.medios}</div><div class="t-nom">Medios activos que quedan</div><div class="chico">${r.queQuedan.feeds} direcciones (feeds). Hoy el registro lee ${r.mediosActivos} medios y ${r.feedsActivos} direcciones; ${r.descartadas.activasQueSeSacan} medios activos pasaron a Descartadas</div></div>
    <div class="tarjeta tarjeta-balcarce"><div class="t-num">${r.balcarceFondo.filas}</div><div class="t-nom">Balcarce a fondo</div><div class="chico">${r.balcarceFondo.enUso} se leen hoy · ${r.balcarceFondo.nuevas} candidatas nuevas · ${r.balcarceFondo.porComo.feed} con feed · ${r.balcarceFondo.porComo.pagina} con página</div></div>
    ${tarjeta('pais', r.porGrupo.pais, `de ${r.porGrupoLista.pais} elegidos · ${r.feedsPorGrupo.pais} direcciones`)}
    ${tarjeta('zona', r.porGrupo.zona, `de ${r.porGrupoLista.zona} elegidos · ${r.feedsPorGrupo.zona} ${r.feedsPorGrupo.zona === 1 ? 'dirección' : 'direcciones'}`)}
    ${r.porGrupo.otras ? tarjeta('otras', r.porGrupo.otras, 'fuera de la lista elegida') : ''}
    <div class="tarjeta"><div class="t-num">${r.feedsCruce}</div><div class="t-nom">Direcciones de cruce</div><div class="chico">de ${r.feedsActivos} activas (las otras ${r.feedsFuente} son de fuentes.mjs). ${r.mediosSoloCruce} medios se leen sólo por direcciones de cruce</div></div>
    <div class="tarjeta tarjeta-desc"><div class="t-num">${r.descartadas.total}</div><div class="t-nom">Descartadas</div><div class="chico">${r.descartadas.porTipo.apagada} ya apagadas · ${r.descartadas.porTipo.dueno} de mismo dueño · ${r.descartadas.porTipo['sin-aporte']} sin aporte · ${r.descartadas.porTipo.caida} caídas. Abajo del todo, por si querés rescatar alguna</div></div>
    <div class="tarjeta tarjeta-duda"><div class="t-num">${r.dudosas}</div><div class="t-nom">Dudosas por datos</div><div class="chico">marcadas con una franja amarilla</div></div>
  </div>
  <div class="explica">
    <h2>Qué es una fuente y qué es una fuente de cruce</h2>
    <ol>
      <li><b>Qué cambió el 15/10 en esta página:</b> (1) arriba está <b>Balcarce a fondo</b>, con todo lo que se pudo investigar de Balcarce; (2) las fuentes de afuera que no sirven (las apagadas, las caídas, las de mismo dueño que otra y las que no aportan) salieron de la tabla y están en <b>Descartadas</b>, una sección plegada al final, cada una con su motivo. Ninguna se borró del registro.</li>
      <li><b>Una fuente</b> es un medio u organismo cuyas noticias leemos cada media hora. Cada uno se lee por una o más direcciones: un feed (RSS o Atom), un índice de noticias o, si no hay otra, raspando la portada.</li>
      <li><b>Las fuentes de Balcarce</b> (medios de acá, Municipalidad, Concejo, Facultad) entran siempre: lo que publican puede salir solo.</li>
      <li><b>Una fuente de cruce</b> es la dirección de un medio de afuera (del país, de la provincia, de Tandil o Mar del Plata) que no se lee para copiarle, sino para contar cuántos medios distintos cuentan lo mismo. En el código esas están en <code>fuentes-cruce.mjs</code>; desde el 27/9 las de afuera que están en <code>fuentes.mjs</code> cumplen el mismo papel.</li>
      <li>Una noticia de afuera sale sólo si la cuentan varios: ${esc(String(c.MEDIOS_POR_DEFECTO))} medios en general, ${esc(cond)}; si nombra a una figura argentina alcanza con ${esc(String(c.MEDIOS_CON_FIGURA))}. Con uno solo, ni pasa.</li>
      <li>Los medios del mismo dueño (Grupo Clarín, los del sistema eleco) cuentan como uno solo: por eso la tabla muestra quién es hermano de quién.</li>
    </ol>
  </div>
</section>`;
}

function clienteDeLaPagina() {
  const CLAVE = 'radar-revision-fuentes-v1';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const todas = $$('tr.fila'); // todas, incluidas las descartadas (que tienen sus propios botones)
  const filas = todas.filter((tr) => !tr.classList.contains('fila-descartada')); // las que cuentan en el progreso
  const descartadas = todas.filter((tr) => tr.classList.contains('fila-descartada'));
  let decisiones = {};
  let hayAlmacen = true;

  function leer() {
    try { return JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) { hayAlmacen = false; return {}; }
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(decisiones)); } catch (e) { hayAlmacen = false; }
    $('#aviso-almacen').hidden = hayAlmacen;
  }
  decisiones = leer();

  function pintarFila(tr) {
    const k = tr.dataset.k;
    const d = decisiones[k] || {};
    $$('.b', tr).forEach((b) => b.setAttribute('aria-pressed', d.d === b.dataset.d ? 'true' : 'false'));
    tr.dataset.decision = d.d || '';
    const inp = $('.coment', tr);
    if (inp.value !== (d.c || '')) inp.value = d.c || '';
  }
  function contar() {
    const tot = { 'Sí': 0, No: 0, Duda: 0 };
    filas.forEach((tr) => { const d = (decisiones[tr.dataset.k] || {}).d; if (tot[d] !== undefined) tot[d] += 1; });
    const hechas = tot['Sí'] + tot.No + tot.Duda;
    $('#progreso').textContent = hechas + ' de ' + filas.length + ' con decisión · Sí ' + tot['Sí'] + ' · No ' + tot.No + ' · Duda ' + tot.Duda;
    $('#barra').style.width = (filas.length ? (100 * hechas) / filas.length : 0) + '%';
  }
  function guardarFila(tr, cambios) {
    const k = tr.dataset.k;
    const nuevo = Object.assign({}, decisiones[k] || {}, cambios);
    if (!nuevo.d && !nuevo.c) delete decisiones[k]; else decisiones[k] = nuevo;
    guardar();
    pintarFila(tr);
    contar();
    filtrar();
  }

  todas.forEach((tr) => {
    $$('.b', tr).forEach((b) => b.addEventListener('click', () => {
      const actual = (decisiones[tr.dataset.k] || {}).d;
      guardarFila(tr, { d: actual === b.dataset.d ? '' : b.dataset.d });
    }));
    $('.coment', tr).addEventListener('input', (e) => guardarFila(tr, { c: e.target.value }));
  });

  // ---- buscador y filtros
  const quitarTildes = (s) => s.normalize('NFD').replace(/[\p{M}]/gu, '').toLowerCase();
  function filtrar() {
    const q = quitarTildes($('#q').value.trim());
    const g = $('#f-grupo').value;
    const dec = $('#f-decision').value;
    const sug = $('#f-sug').value;
    const tipo = $('#f-tipo').value;
    const org = $('#f-origen').value;
    const solo = $('#f-dudosas').checked;
    let visibles = 0;
    todas.forEach((tr) => {
      const d = tr.dataset.decision || '';
      let ok = true;
      if (q && tr.dataset.buscar.indexOf(q) < 0) ok = false;
      if (g && tr.dataset.grupo !== g) ok = false;
      if (dec === 'sin' && d) ok = false;
      if (dec && dec !== 'sin' && d !== dec) ok = false;
      if (sug && tr.dataset.sug !== sug) ok = false;
      if (tipo && (' ' + tr.dataset.tipos + ' ').indexOf(' ' + tipo + ' ') < 0) ok = false;
      if (org && (' ' + tr.dataset.origen + ' ').indexOf(' ' + org + ' ') < 0) ok = false;
      if (solo && tr.dataset.dudosa !== '1') ok = false;
      tr.hidden = !ok;
      if (ok && !tr.classList.contains('fila-descartada')) visibles += 1;
    });
    $$('tbody.grupo').forEach((tb) => {
      const alguna = $$('tr.fila', tb).some((tr) => !tr.hidden);
      tb.hidden = !alguna;
    });
    const hayDesc = descartadas.some((tr) => !tr.hidden);
    const caja = $('#descartadas');
    if (caja) caja.hidden = !hayDesc;
    const cuenta = $('#desc-visibles');
    if (cuenta) cuenta.textContent = descartadas.filter((tr) => !tr.hidden).length + ' de ' + descartadas.length;
    $('#visibles').textContent = 'Mostrando ' + visibles + ' de ' + filas.length;
  }
  ['q', 'f-grupo', 'f-decision', 'f-sug', 'f-tipo', 'f-origen', 'f-dudosas'].forEach((id) => {
    $('#' + id).addEventListener('input', filtrar);
    $('#' + id).addEventListener('change', filtrar);
  });
  $('#limpiar').addEventListener('click', () => {
    $('#q').value = '';
    ['f-grupo', 'f-decision', 'f-sug', 'f-tipo', 'f-origen'].forEach((id) => { $('#' + id).value = ''; });
    $('#f-dudosas').checked = false;
    filtrar();
  });

  // ---- orden dentro de cada grupo
  const original = new Map();
  $$('tbody.grupo').forEach((tb) => original.set(tb, $$('tr.fila', tb)));
  $('#orden').addEventListener('change', (e) => {
    const modo = e.target.value;
    $$('tbody.grupo').forEach((tb) => {
      const lista = original.get(tb).slice();
      if (modo === 'nombre') lista.sort((a, b) => a.dataset.nombre.localeCompare(b.dataset.nombre, 'es'));
      if (modo === 'mas') lista.sort((a, b) => Number(b.dataset.pub) - Number(a.dataset.pub));
      if (modo === 'menos') lista.sort((a, b) => Number(a.dataset.pub) - Number(b.dataset.pub));
      lista.forEach((tr) => tb.appendChild(tr));
    });
  });

  // ---- copiar y descargar
  function armarTexto() {
    const hoy = new Date();
    const lineas = [];
    const tot = { 'Sí': 0, No: 0, Duda: 0 };
    let sin = 0;
    filas.forEach((tr) => {
      const d = decisiones[tr.dataset.k] || {};
      if (!d.d) { if (!d.c) sin += 1; return; }
      tot[d.d] += 1;
      lineas.push(d.d + ' | ' + tr.dataset.nombre + (d.c ? ' | ' + d.c : ''));
    });
    filas.forEach((tr) => {
      const d = decisiones[tr.dataset.k] || {};
      if (!d.d && d.c) lineas.push('Sin decidir | ' + tr.dataset.nombre + ' | ' + d.c);
    });
    const rescate = [];
    descartadas.forEach((tr) => {
      const d = decisiones[tr.dataset.k] || {};
      if (!d.d && !d.c) return;
      rescate.push((d.d === 'Sí' ? 'Rescatar' : d.d === 'No' ? 'Sigue descartada' : d.d === 'Duda' ? 'Duda' : 'Sin decidir') + ' | ' + tr.dataset.nombre + (d.c ? ' | ' + d.c : ''));
    });
    const cab = 'Decisiones sobre las fuentes (' + hoy.toLocaleDateString('es-AR') + '): Sí ' + tot['Sí'] + ' · No ' + tot.No + ' · Duda ' + tot.Duda + ' · sin decidir ' + sin;
    const desc = rescate.length ? '\nDescartadas (Rescatar = volver a la lista):\n' + rescate.join('\n') + '\n' : '';
    return cab + '\n' + lineas.join('\n') + '\n' + desc;
  }
  function aviso(t) {
    const el = $('#toast');
    el.textContent = t;
    el.classList.add('ver');
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => el.classList.remove('ver'), 3500);
  }
  $('#copiar').addEventListener('click', () => {
    const texto = armarTexto();
    const caja = $('#caja');
    caja.value = texto;
    caja.hidden = false;
    const respaldo = () => {
      try { caja.focus(); caja.select(); const ok = document.execCommand('copy'); aviso(ok ? 'Copiado. Pegalo en el chat.' : 'No pude copiar solo: está seleccionado abajo, copialo a mano.'); } catch (e) { aviso('No pude copiar solo: copialo a mano desde la caja de abajo.'); }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(() => aviso('Copiado. Pegalo en el chat.'), respaldo);
    } else respaldo();
  });
  $('#descargar').addEventListener('click', () => {
    const blob = new Blob([armarTexto()], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'decisiones-fuentes-' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });
  $('#borrar').addEventListener('click', () => {
    if (!window.confirm('¿Borrar todas tus decisiones y comentarios de este navegador?')) return;
    decisiones = {};
    guardar();
    todas.forEach(pintarFila);
    contar();
    filtrar();
    $('#caja').hidden = true;
  });

  todas.forEach(pintarFila);
  $('#aviso-almacen').hidden = hayAlmacen;
  contar();
  filtrar();
}

const CSS = String.raw`
:root{--fondo:#f6f7f9;--tarjeta:#fff;--texto:#1b2430;--suave:#5c6878;--borde:#d9dee6;--acento:#1f5fbf;--si:#1c7a3d;--si-f:#e3f4e8;--no:#b3261e;--no-f:#fbe7e5;--duda:#9a6700;--duda-f:#fff3cd;--ok:#1c7a3d;--aviso:#9a6700;--mal:#b3261e;--franja:#e0a800;--cabecera:#eef1f6}
@media (prefers-color-scheme:dark){:root:not([data-tema="claro"]){--fondo:#12161c;--tarjeta:#1a2029;--texto:#e6ebf2;--suave:#9aa6b6;--borde:#2c3644;--acento:#7fb0ff;--si:#5fd48a;--si-f:#17331f;--no:#ff8f86;--no-f:#3a1a18;--duda:#f1c04d;--duda-f:#3a2f10;--ok:#5fd48a;--aviso:#f1c04d;--mal:#ff8f86;--franja:#c99700;--cabecera:#202835}}
:root[data-tema="oscuro"]{--fondo:#12161c;--tarjeta:#1a2029;--texto:#e6ebf2;--suave:#9aa6b6;--borde:#2c3644;--acento:#7fb0ff;--si:#5fd48a;--si-f:#17331f;--no:#ff8f86;--no-f:#3a1a18;--duda:#f1c04d;--duda-f:#3a2f10;--ok:#5fd48a;--aviso:#f1c04d;--mal:#ff8f86;--franja:#c99700;--cabecera:#202835}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--fondo);color:var(--texto);font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.pagina{max-width:1500px;margin:0 auto;padding:16px}
h1{font-size:1.5rem;margin:.2em 0}
h2{font-size:1.1rem;margin:.2em 0 .5em}
.sub{color:var(--suave);margin:0 0 12px}
.chico{font-size:.82rem;color:var(--suave)}
.tarjetas{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}
.tarjeta{background:var(--tarjeta);border:1px solid var(--borde);border-radius:10px;padding:10px 12px}
.tarjeta-total{border-color:var(--acento)}
.tarjeta-duda{border-color:var(--franja)}
.tarjeta-balcarce{border-color:var(--si)}
.tarjeta-desc{border-color:var(--no)}
.t-num{font-size:1.8rem;font-weight:700;line-height:1}
.t-nom{font-weight:600;margin-top:2px}
.explica{background:var(--tarjeta);border:1px solid var(--borde);border-radius:10px;padding:10px 16px;margin:12px 0}
.explica ol{margin:.3em 0;padding-left:1.3em}
.explica li{margin:.35em 0}
.como{background:var(--tarjeta);border:1px dashed var(--borde);border-radius:10px;padding:8px 14px;margin:12px 0;font-size:.92rem}
.como summary{cursor:pointer;font-weight:600}
.herramientas{position:sticky;top:0;z-index:5;background:var(--fondo);padding:8px 0 10px;border-bottom:1px solid var(--borde);margin-top:8px}
.filtros{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;align-items:end}
.filtros label{display:flex;flex-direction:column;font-size:.78rem;color:var(--suave);gap:2px}
.filtros input[type=search],.filtros select{font:inherit;color:var(--texto);background:var(--tarjeta);border:1px solid var(--borde);border-radius:8px;padding:8px;min-height:40px;width:100%}
.filtros .check{flex-direction:row;align-items:center;gap:6px;color:var(--texto);font-size:.9rem;min-height:40px}
.acciones{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center}
.btn{font:inherit;border:1px solid var(--borde);background:var(--tarjeta);color:var(--texto);border-radius:8px;padding:8px 14px;min-height:40px;cursor:pointer}
.btn-fuerte{background:var(--acento);color:#fff;border-color:var(--acento)}
.btn:hover{filter:brightness(.95)}
.progreso{display:flex;flex-direction:column;gap:3px;margin-left:auto;min-width:220px;flex:1 1 220px}
.pista{height:6px;background:var(--borde);border-radius:4px;overflow:hidden}
#barra{height:100%;width:0;background:var(--si)}
#aviso-almacen{background:var(--duda-f);color:var(--duda);padding:6px 10px;border-radius:8px;margin-top:8px;font-size:.9rem}
#caja{width:100%;min-height:140px;margin-top:8px;font:13px/1.4 ui-monospace,Consolas,monospace;background:var(--tarjeta);color:var(--texto);border:1px solid var(--borde);border-radius:8px;padding:8px}
.tabla-caja{overflow-x:auto;margin-top:12px;border:1px solid var(--borde);border-radius:10px;background:var(--tarjeta)}
table{border-collapse:collapse;width:100%;min-width:1180px}
@media (min-width:901px){table{table-layout:fixed}td{overflow-wrap:anywhere}}
th{position:sticky;top:0;text-align:left;background:var(--cabecera);font-size:.8rem;padding:8px;border-bottom:1px solid var(--borde);white-space:nowrap}
td{vertical-align:top;padding:10px 8px;border-bottom:1px solid var(--borde);font-size:.9rem}
tr.encabezado-grupo td{background:var(--cabecera);font-weight:700;font-size:1rem;padding:10px 8px}
tr.encabezado-grupo .chico{font-weight:400;margin-left:8px}
tr.fila.dudosa td:first-child{box-shadow:inset 5px 0 0 var(--franja)}
tr.fila-apagada{opacity:.92}
.nombre{font-weight:700;font-size:1rem}
.etqs{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}
.etq{font-size:.72rem;border:1px solid var(--borde);border-radius:99px;padding:1px 7px;color:var(--suave);background:var(--fondo);white-space:nowrap}
.etq-cruce{border-color:var(--acento);color:var(--acento)}
.etq-nueva{border-color:var(--si);color:var(--si)}
.etq-apagada{border-color:var(--no);color:var(--no)}
.dueno{font-size:.82rem;margin-top:4px}
.dudas{list-style:none;margin:6px 0 0;padding:0}
.duda{font-size:.8rem;background:var(--duda-f);color:var(--duda);border-radius:6px;padding:3px 7px;margin:3px 0}
.duda-caido,.duda-cloudflare,.duda-cero{background:var(--no-f);color:var(--no)}
.feeds{list-style:none;margin:0;padding:0}
.feed{padding:6px 0;border-bottom:1px dotted var(--borde)}
.feed:last-child{border-bottom:0}
.feed-linea{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:2px}
.tipo{font-size:.72rem;font-weight:600;border-radius:4px;padding:1px 6px;background:var(--cabecera)}
.tipo-scraping{background:var(--duda-f);color:var(--duda)}
.url{display:block;color:var(--acento);word-break:break-all;font-size:.82rem}
.feed-datos{font-size:.78rem;color:var(--suave)}
.feed-datos code{font-size:.75rem}
.feed-estado{font-size:.8rem}
.nivel-ok{color:var(--ok)}.nivel-aviso{color:var(--aviso)}.nivel-mal{color:var(--mal)}.nivel-nada{color:var(--suave)}
.feed-apagada{opacity:.75}
details summary{cursor:pointer;color:var(--acento);font-size:.85rem}
.pill{display:inline-block;border-radius:99px;padding:2px 9px;font-size:.78rem;font-weight:600}
.pill-si{background:var(--si-f);color:var(--si)}.pill-no{background:var(--no-f);color:var(--no)}
.num b{font-size:1.25rem}
.c-porque p,.c-sug p{margin:.2em 0}
.sug{display:inline-block;font-weight:700;font-size:.8rem;border-radius:6px;padding:2px 8px}
.sug-mantener{background:var(--si-f);color:var(--si)}.sug-revisar{background:var(--duda-f);color:var(--duda)}.sug-apagar{background:var(--no-f);color:var(--no)}
.botones{display:flex;gap:6px}
.b{font:inherit;font-weight:700;flex:1;min-width:0;padding:0 4px;min-height:44px;border:2px solid var(--borde);border-radius:8px;background:var(--tarjeta);color:var(--texto);cursor:pointer}
.b-si[aria-pressed=true]{background:var(--si);border-color:var(--si);color:#fff}
.b-no[aria-pressed=true]{background:var(--no);border-color:var(--no);color:#fff}
.b-duda[aria-pressed=true]{background:var(--franja);border-color:var(--franja);color:#111}
.coment{width:100%;margin-top:6px;font:inherit;font-size:.9rem;color:var(--texto);background:var(--fondo);border:1px solid var(--borde);border-radius:8px;padding:8px;min-height:40px}
#toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%) translateY(80px);background:#1b2430;color:#fff;border-radius:8px;padding:10px 16px;opacity:0;transition:.25s;z-index:20;max-width:90vw}
#toast.ver{opacity:1;transform:translateX(-50%) translateY(0)}
.pie{color:var(--suave);font-size:.82rem;margin:16px 0}
.sug-sumar{background:var(--si-f);color:var(--si);outline:1px solid var(--si)}
.sug-nosumar{background:var(--cabecera);color:var(--suave)}
.afondo{margin-top:8px;border:1px solid var(--borde);border-radius:8px;padding:6px 10px;background:var(--fondo)}
.afondo p{margin:.3em 0}
.motivo-desc{font-size:.82rem;margin:6px 0;padding:6px 8px;border-left:4px solid var(--no);background:var(--no-f);border-radius:4px}
.fondo-intro{background:var(--tarjeta);border:2px solid var(--si);border-radius:10px;padding:10px 16px;margin:12px 0}
.fondo-intro ul{margin:.3em 0;padding-left:1.2em}
.fondo-intro li{margin:.3em 0}
.fondo-intro table{min-width:0;width:auto;margin:6px 0}
.fondo-intro td,.fondo-intro th{position:static;padding:3px 10px 3px 0;border:0;font-size:.88rem;white-space:normal}
tbody.grupo[data-grupo=balcarce] tr.encabezado-grupo td{background:var(--si-f);color:var(--si)}
details.descartadas{margin-top:22px;border:2px dashed var(--no);border-radius:10px;padding:8px 12px;background:var(--tarjeta)}
details.descartadas>summary{font-size:1.05rem;font-weight:700;color:var(--no);cursor:pointer}
details.descartadas .tabla-caja{margin-top:10px}
tr.fila-descartada{opacity:.95}
[hidden]{display:none!important}
@media (max-width:900px){
  .pagina{padding:12px}
  table{min-width:0}
  thead{display:none}
  .tabla-caja{border:0;background:transparent}
  tbody.grupo,tbody.grupo tr{display:block}
  tr.encabezado-grupo{margin-top:14px}
  tr.encabezado-grupo td{display:block;border-radius:8px}
  tr.fila{background:var(--tarjeta);border:1px solid var(--borde);border-radius:10px;margin:10px 0;padding:6px 10px}
  tr.fila td{display:block;border:0;padding:6px 0}
  tr.fila td[data-label]::before{content:attr(data-label);display:block;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:var(--suave);margin-bottom:2px}
  tr.fila td.c-medio::before{display:none}
  tr.fila.dudosa td:first-child{box-shadow:none}
  tr.fila.dudosa{border-left:6px solid var(--franja)}
  .herramientas{position:static}
}
`;

/** La explicación de "Balcarce a fondo" que va arriba de la tabla, con los números de la investigación. */
function htmlBalcarceIntro(d) {
  const b = d.resumen.balcarceFondo;
  const c = b.porComo;
  const lista = (pred) => d.filasFondo.filter((x) => pred(x.fondo)).map((x) => `<li>${esc(x.fondo.nombre)}</li>`).join('');
  return `<section class="fondo-intro" id="balcarce-a-fondo" aria-label="Balcarce a fondo">
  <h2>Balcarce a fondo · ${b.filas} fuentes investigadas el ${esc(FECHA_INVESTIGACION)}</h2>
  <p>Se buscó todo lo que pueda dar noticias del partido de Balcarce (la ciudad, San Agustín, Los Pinos, Napaleofú, Ramos Otero, Bosch y Laguna La Brava): medios, Municipalidad y sus áreas, Concejo, hospital, cooperativa, INTA, Facultad, clubes, bomberos, escuelas, instituciones y redes. De cada una se probó la dirección en vivo y se anotó qué trae, cada cuánto publica y cómo conviene leerla. <b>Mar del Sud no es de Balcarce</b>: es una localidad de General Alvarado, a 17 km de Miramar.</p>
  <table>
    <tr><th>Con feed (se lee entero)</th><td><b>${c.feed}</b></td></tr>
    <tr><th>Sin feed: hay que leer la página</th><td><b>${c.pagina}</b></td></tr>
    <tr><th>Ya llegan por otra fuente (sobre todo el feed municipal)</th><td><b>${c.cubierta}</b></td></tr>
    <tr><th>Sólo redes o a mano (no se pueden leer solas)</th><td><b>${c.redes}</b></td></tr>
    <tr><th>No sirven o no existen</th><td><b>${c.nada}</b></td></tr>
    <tr><th>Se leen hoy / candidatas nuevas</th><td><b>${b.enUso}</b> / <b>${b.nuevas}</b></td></tr>
  </table>
  <p><b>Qué falta (Claude sugiere sumar):</b></p>
  <ul>${lista((f) => f?.accion === 'sumar')}</ul>
  <p><b>Qué se puede mejorar de lo que ya se lee</b> (marcadas "Revisar"): ${d.filasFondo.filter((x) => x.fondo?.accion === 'revisar' && x.medio).map((x) => esc(x.fondo.nombre.replace(/ \(.*/, ''))).join(', ')}.</p>
  <p><b>Qué sobra:</b> nada del registro de Balcarce; una candidata (Minuto Balcarce) está muerta. Dos advertencias: el sitio de <b>Acción 5</b> tiene spam de apuestas escondido en la portada (el feed está limpio) y <b>Ahora Balcarce</b> está dormido hace 12 días.</p>
  <p class="chico">Todo se probó desde la PC de Hernán el ${esc(FECHA_INVESTIGACION)}; nada desde GitHub Actions. En cada fila, <b>Sí</b> quiere decir "que se lea / que se sume (o se quede)". El detalle de todas, en <code>docs/etapa-1-fuentes/BALCARCE-INVESTIGACION.md</code>.</p>
</section>`;
}

/** Las descartadas, en una sección plegada al final. */
function htmlDescartadas(d) {
  const lista = d.medios.filter((m) => m.descartada);
  if (!lista.length) return '';
  const ORDEN_TIPO = ['caida', 'dueno', 'sin-aporte', 'apagada'];
  const cuerpo = ORDEN_TIPO.map((t) => {
    const delTipo = lista.filter((m) => m.descartada.tipo === t).sort((a, b) => b.pub30 - a.pub30 || a.nombre.localeCompare(b.nombre, 'es'));
    if (!delTipo.length) return '';
    return `<tbody class="grupo" id="g-desc-${t}" data-grupo="descartadas">
  <tr class="encabezado-grupo"><td colspan="8">${esc(ETIQUETA_DESCARTE[t])} · ${delTipo.length} ${delTipo.length === 1 ? 'medio' : 'medios'}</td></tr>
  ${delTipo.map((m) => htmlFila(m, { descartada: m.descartada })).join('\n')}
</tbody>`;
  }).join('\n');
  const r = d.resumen.descartadas;
  return `<details class="descartadas" id="descartadas">
  <summary>Descartadas (por si querés rescatar alguna) · <span id="desc-total">${lista.length}</span> <span class="chico">· mostrando <span id="desc-visibles">${lista.length} de ${lista.length}</span></span></summary>
  <p class="chico">Son fuentes de <b>afuera</b> que Claude sacó de la tabla de arriba: ${r.porTipo.apagada} ya estaban apagadas, ${r.porTipo.dueno} son de mismo dueño que otra que ya cuenta, ${r.porTipo['sin-aporte']} casi no aportan y ${r.porTipo.caida} están caídas. Cada una dice el motivo. No se borró ni se tocó <code>ingesta/fuentes.mjs</code>: si querés que alguna vuelva, marcá <b>Sí</b> (quiere decir &laquo;rescatarla&raquo;) y se copia aparte en <b>Copiar mis decisiones</b>. Estas filas no cuentan en el progreso.</p>
  <div class="tabla-caja">
  <table>
  <colgroup><col style="width:21%"><col style="width:19%"><col style="width:6%"><col style="width:8%"><col style="width:8%"><col style="width:13%"><col style="width:13%"><col style="width:12%"></colgroup>
  <thead><tr><th>Medio, dueño y motivo</th><th>Direcciones</th><th>Activa</th><th>Notas (30 días)</th><th>Último estado</th><th>Por qué estaba</th><th>Sugerencia automática</th><th>Rescatar</th></tr></thead>
  ${cuerpo}
  </table>
  </div>
</details>`;
}

/** La página entera, lista para escribir en un archivo. */
export function generarHTML(d) {
  const principales = ['pais', 'zona', 'otras'].filter((g) => d.medios.some((m) => m.grupo === g && !m.descartada));
  const filasBalcarce = d.filasFondo.map((x) => (x.medio ? htmlFila(x.medio) : htmlFilaFondo(x.fondo)));
  const tbodyBalcarce = `<tbody class="grupo" id="g-balcarce" data-grupo="balcarce">
  <tr class="encabezado-grupo"><td colspan="8">${esc(NOMBRE_GRUPO.balcarce[0])} · ${filasBalcarce.length} fuentes<span class="chico">${esc(NOMBRE_GRUPO.balcarce[1])}</span></td></tr>
  ${filasBalcarce.join('\n')}
</tbody>`;
  const cuerpo = [tbodyBalcarce, ...principales.map((g) => {
    const lista = d.medios.filter((m) => m.grupo === g && !m.descartada);
    return `<tbody class="grupo" id="g-${g}" data-grupo="${g}">
  <tr class="encabezado-grupo"><td colspan="8">${esc(NOMBRE_GRUPO[g][0])} · ${lista.length} ${lista.length === 1 ? 'medio' : 'medios'}<span class="chico">${esc(NOMBRE_GRUPO[g][1])}</span></td></tr>
  ${lista.map((m) => htmlFila(m)).join('\n')}
</tbody>`;
  })].join('\n');
  const grupos = ['balcarce', ...principales, ...(d.medios.some((m) => m.descartada) ? ['descartadas'] : [])];
  const opcionesGrupo = grupos.map((g) => `<option value="${g}">${esc(NOMBRE_GRUPO[g][0])}</option>`).join('');
  const u = UMBRALES;
  const generado = d.generado.slice(0, 10).split('-').reverse().join('/');
  const ventana = d.ventana ? `${d.ventana.desde.split('-').reverse().join('/')} al ${d.ventana.hasta.split('-').reverse().join('/')}` : '—';
  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Revisión de fuentes · Radar Balcarce</title>
<style>${CSS}</style>
</head>
<body>
<div class="pagina">
<header>
  <h1>Revisión de fuentes</h1>
  <p class="sub">Radar Balcarce · generado el ${esc(generado)} · notas publicadas del ${esc(ventana)} (${d.notasAnalizadas} notas). Marcá <b>Sí</b>, <b>No</b> o <b>Duda</b> en cada medio; se guarda solo en este navegador. Al final apretá <b>Copiar mis decisiones</b> y pegalas en el chat. Primero está <a href="#balcarce-a-fondo">Balcarce a fondo</a>; las fuentes de afuera que no sirven están plegadas al final, en <a href="#descartadas">Descartadas</a>.</p>
</header>
${htmlResumen(d)}
${htmlBalcarceIntro(d)}
<details class="como"><summary>De dónde sale cada dato y cómo se arma la sugerencia</summary>
  <ul>
    <li><b>Publicadas en 30 días</b>: notas ya publicadas (del ${esc(ventana)}) que nombran al medio entre sus fuentes. El motor no guarda lo que leyó y descartó, así que no hay un número de &laquo;notas leídas&raquo; en 30 días: como aproximación se muestra lo que trajo su feed en los últimos 7 días (medido el ${esc(d.medidoEl ?? '—')} desde la PC).</li>
    <li><b>Imprescindible</b>: veces que, sin ese medio, una nota de afuera no llegaba al mínimo de medios (3/9 al 15/10). <b>Visitas</b>: las de las notas donde figura.</li>
    <li><b>Último estado</b>: la prueba en vivo de cada dirección hecha desde la PC el ${esc(d.medidoEl ?? '—')}; y, para las activas, el sondeo desde Cloudflare del ${esc(SONDEO_CLOUDFLARE.cuando)} (${SONDEO_CLOUDFLARE.andan} de ${SONDEO_CLOUDFLARE.total} andaban; las seis que no, son las de Infobae). <b>No está verificado desde GitHub Actions.</b></li>
    <li><b>Dudosa por datos</b> (franja amarilla): cero o casi cero notas en 30 días, feed caído o sin notas nuevas, bloquea a Cloudflare, o mismo dueño que otro medio activo.</li>
    <li><b>Sugerencia</b>: <i>Apagar</i> si no aportó nada en 30 días, si su feed no responde, o si bloquea y aporta poco. <i>Revisar</i> si aporta ${u.pocas} notas o menos sin haber sido imprescindible, si tiene un feed con problemas, si bloquea pero aporta mucho (${u.muchas} notas o ${u.imprescindible} veces imprescindible), o si una apagada aportaba ${u.aportaba} notas o más. <i>Mantener</i> en el resto. Los de Balcarce nunca se sugieren apagar (decisión de ustedes: entran todos) y las altas nuevas van a prueba. Es una ayuda: la decisión es de ustedes.</li>
    <li><b>Descartadas</b>: salen solas de la tabla las apagadas y las activas de afuera cuya sugerencia es <i>Apagar</i>; además Claude sacó a mano las de mismo dueño que otra que ya cuenta y las que casi no aportan (con el motivo escrito en cada una).</li>
    <li><b>Balcarce a fondo</b>: la sugerencia de esas filas es <i>Mantener</i>, <i>Revisar</i> (hay algo para cambiar), <i>Sumar</i> (hoy no se lee y conviene), <i>No sumar</i> o <i>Apagar</i>; los datos salen de <code>docs/etapa-1-fuentes/balcarce-fondo.mjs</code>.</li>
  </ul>
</details>

<section class="herramientas" aria-label="Buscador y filtros">
  <div class="filtros">
    <label>Buscar<input id="q" type="search" placeholder="Medio, dueño, dirección, sección…" autocomplete="off"></label>
    <label>Grupo<select id="f-grupo"><option value="">Todos</option>${opcionesGrupo}</select></label>
    <label>Mi decisión<select id="f-decision"><option value="">Todas</option><option value="sin">Sin decidir</option><option value="Sí">Sí</option><option value="No">No</option><option value="Duda">Duda</option></select></label>
    <label>Sugerencia de Claude<select id="f-sug"><option value="">Todas</option><option value="mantener">Mantener</option><option value="revisar">Revisar</option><option value="sumar">Sumar</option><option value="nosumar">No sumar</option><option value="apagar">Apagar</option></select></label>
    <label>Tipo<select id="f-tipo"><option value="">Todos</option><option value="feed">Feed (RSS, Atom, índice)</option><option value="scraping">Hay que leer la página (scraping)</option><option value="manual">Sólo redes o a mano</option></select></label>
    <label>Origen<select id="f-origen"><option value="">Todos</option><option value="fuente">Fuente (fuentes.mjs)</option><option value="cruce">De cruce (fuentes-cruce.mjs)</option></select></label>
    <label>Orden dentro del grupo<select id="orden"><option value="">El de la lista</option><option value="nombre">Por nombre</option><option value="mas">Más notas primero</option><option value="menos">Menos notas primero</option></select></label>
    <label class="check"><input id="f-dudosas" type="checkbox"> Sólo las dudosas por datos</label>
  </div>
  <div class="acciones">
    <button class="btn btn-fuerte" id="copiar" type="button">Copiar mis decisiones</button>
    <button class="btn" id="descargar" type="button">Descargar</button>
    <button class="btn" id="limpiar" type="button">Limpiar filtros</button>
    <button class="btn" id="borrar" type="button">Borrar mis decisiones</button>
    <div class="progreso"><span id="progreso" class="chico"></span><div class="pista"><div id="barra"></div></div><span id="visibles" class="chico"></span></div>
  </div>
  <div id="aviso-almacen" hidden>Este navegador no deja guardar las decisiones: copialas o descargalas antes de cerrar la página.</div>
  <textarea id="caja" hidden readonly aria-label="Texto de las decisiones"></textarea>
</section>

<div class="tabla-caja">
<table>
<colgroup><col style="width:14%"><col style="width:17%"><col style="width:6%"><col style="width:8%"><col style="width:8%"><col style="width:25%"><col style="width:11%"><col style="width:11%"></colgroup>
<thead><tr>
  <th>Medio y dueño</th><th>Direcciones (tipo, URL, sección, peso)</th><th>Activa</th><th>Notas (30 días)</th><th>Último estado</th><th>Por qué está</th><th>Sugerencia de Claude</th><th>Tu decisión</th>
</tr></thead>
${cuerpo}
</table>
</div>
${htmlDescartadas(d)}
<p class="pie">Hecho con docs/etapa-1-fuentes/generar-revision.mjs a partir de ingesta/fuentes.mjs, ingesta/fuentes-cruce.mjs, LISTA-ELEGIDA.md, balcarce-fondo.mjs, fuentes-medidas.csv y web/data. Para rehacerlo: <code>node docs/etapa-1-fuentes/generar-revision.mjs</code>.</p>
</div>
<div id="toast" role="status" aria-live="polite"></div>
<script>(${clienteDeLaPagina.toString()})();</script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- el informe de Balcarce (markdown)

const celda = (t) => String(t ?? '—').replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').trim() || '—';
const resumirUrl = (f) => {
  const u = f.urls.find((x) => /^https?:/.test(x.url));
  return u ? `\`${u.url}\`` : '—';
};
const TEXTO_ACCION = { mantener: 'Mantener', revisar: 'Cambiar algo', sumar: 'Sumar', nosumar: 'No sumar', apagar: 'No sirve' };

/** docs/etapa-1-fuentes/BALCARCE-INVESTIGACION.md: tabla, una ficha por fuente y la recomendación de cómo leerla. */
export function generarMarkdownBalcarce(d) {
  const b = d.resumen.balcarceFondo;
  const c = b.porComo;
  const L = [];
  L.push('# Balcarce a fondo · investigación de fuentes (15/10/2026)');
  L.push('');
  L.push(`*Pedido de Hernán y Andrés: investigar de nuevo, a fondo, todas las fuentes posibles de Balcarce (el partido: Balcarce, San Agustín, Los Pinos, Napaleofú, Ramos Otero, Bosch, Laguna La Brava), y decir de cada una si tiene feed, si hay que leer la página o si sólo se puede seguir a mano. Este archivo se arma con \`node docs/etapa-1-fuentes/generar-revision.mjs\` a partir de \`docs/etapa-1-fuentes/balcarce-fondo.mjs\`; la misma información está en la sección "Balcarce a fondo" de \`REVISION-FUENTES.html\`, donde se decide con Sí / No / Duda. No se tocó \`ingesta/fuentes.mjs\`.*`);
  L.push('');
  L.push('## En una mirada');
  L.push('');
  L.push(`Se investigaron **${b.filas} fuentes** de Balcarce. **${b.enUso}** se leen hoy (los 8 medios locales, la Municipalidad, el Concejo y la Facultad) y **${b.nuevas}** son candidatas nuevas que no estaban en ningún registro.`);
  L.push('');
  L.push('| Cómo se lee | Cuántas |');
  L.push('|---|---|');
  for (const k of Object.keys(COMO)) L.push(`| ${COMO[k][0]}: ${COMO[k][1]} | **${c[k]}** |`);
  L.push('');
  L.push('**Qué falta** (Claude sugiere sumar):');
  for (const x of d.filasFondo.filter((y) => y.fondo?.accion === 'sumar')) L.push(`- **${x.fondo.nombre}** (${COMO[x.fondo.como][0].toLowerCase()}): ${x.fondo.comoLeerla}`);
  L.push('');
  L.push('**Qué conviene cambiar de lo que ya se lee:**');
  for (const x of d.filasFondo.filter((y) => y.fondo?.accion === 'revisar' && y.medio)) L.push(`- **${x.fondo.nombre}**: ${x.fondo.comoLeerla}`);
  L.push('');
  L.push('**Qué sobra:** nada del registro de Balcarce. Minuto Balcarce (candidata) está muerta; **Ahora Balcarce** está dormida hace 12 días y repite al Municipio; el sitio de **Acción 5** tiene spam de apuestas en la portada (el feed está limpio).');
  L.push('');
  L.push('**Dato para los dueños:** *Mar del Sud* **no es del partido de Balcarce**: es una localidad balnearia del partido de General Alvarado, a 17 km de Miramar (Wikipedia, 15/10). Las localidades del partido son Balcarce, San Agustín, Bosch, Napaleofú (compartida con Lobería), Los Pinos, Villa Laguna La Brava y Ramos Otero, más el paraje Juan Vincenty.');
  L.push('');
  L.push('## Lo más importante que apareció');
  L.push('');
  L.push('1. **El feed de la Municipalidad ya trae todas las áreas** (hospital, deportes, cultura, turismo, ARBAL, delegaciones…). En las últimas 100 notas: Deportes y Recreación 39, hospital 10, cultura 6, turismo 6. Pedir los feeds por área no sirve y satura el servidor del Municipio (4 de 18 dieron "508 Resource Limit Is Reached").');
  L.push('2. **SIBOM (boletín oficial municipal) sí se puede leer**: https://sibom.slyt.gba.gob.ar/cities/10 es HTML estable (lista de boletines con fecha y, adentro, las ordenanzas con su texto).');
  L.push('3. **La Cooperativa Eléctrica tiene una página de cortes programados** que se puede vigilar con una comparación de texto (hoy dice "No hay Cortes Programados.").');
  L.push('4. **Infórmese Primero** conviene leerlo por el feed de Blogger directo (100 notas, sin FeedBurner). **Radio Gabal** tiene un sexto feed (Cultura) que hoy no se lee, y cada feed trae sólo 3 notas.');
  L.push('5. **El sitio de Acción 5 fue vulnerado** (spam de apuestas escondido en la portada): leer sólo el feed, que está limpio.');
  L.push('6. **Google Noticias** (búsqueda "Balcarce") sirve de detector: muestra qué medios hablan de Balcarce. Los de afuera que más la cubren son 0223, Diario La Capital de Mar del Plata (feed bloqueado por Cloudflare) y los de motor (Carburando, ACTC).');
  L.push('7. **Hospital, bomberos, policía, Liga Balcarceña, clubes, escuelas, Cámara de Comercio y Sociedad Rural no tienen sitio con novedades** que se haya encontrado: sólo Facebook/Instagram, que no se pueden leer sin cuenta. El hospital sí sale por el feed municipal.');
  L.push('');
  L.push('## La tabla');
  L.push('');
  L.push('| # | Fuente | Qué es | Cómo se lee | Dirección | Cada cuánto publica | Sugerencia |');
  L.push('|---|---|---|---|---|---|---|');
  d.filasFondo.forEach((x, i) => {
    const f = x.fondo;
    if (!f) return;
    const hoy = x.medio ? 'se lee hoy · ' : f.nueva ? 'nueva · ' : '';
    L.push(`| ${i + 1} | ${celda(f.nombre)} | ${celda(f.tipoEntidad)} | ${hoy}${COMO[f.como][0]} | ${resumirUrl(f)} | ${celda(f.cadencia).slice(0, 110)} | ${TEXTO_ACCION[f.accion]} |`);
  });
  L.push('');
  L.push('## Las fichas, una por fuente');
  L.push('');
  L.push('Cada ficha dice: qué se probó (HTTP, cantidad de notas, fecha de la última, si trae texto completo o sólo resumen, si trae foto), cada cuánto publica, qué contenido aporta, cómo conviene leerla (feed, página o a mano) y qué peso darle. El **peso** es el número de `ingesta/fuentes.mjs`: hoy los medios de acá van entre 24 y 30 y los de afuera 8; "una fuente local oficial vale más que tres de afuera" se cumple con cualquier valor de 24 para arriba. Una fuente `oficial: true` sale con verde en el semáforo, la verificación es ALTA y alcanza sola.');
  L.push('');
  d.filasFondo.forEach((x, i) => {
    const f = x.fondo;
    if (!f) return;
    L.push(`### ${i + 1}. ${f.nombre}`);
    L.push('');
    L.push(`- **Es:** ${f.tipoEntidad}${x.medio ? ' · **se lee hoy**' : f.nueva ? ' · **candidata nueva**' : ''}.`);
    L.push(`- **Cómo se lee:** ${COMO[f.como][0]} (${COMO[f.como][1]}). **Sugerencia: ${TEXTO_ACCION[f.accion]}.**`);
    L.push('- **Direcciones probadas:**');
    for (const u of f.urls) L.push(`  - ${/^https?:/.test(u.url) ? `\`${u.url}\`` : u.url} (${u.rol}): ${u.resultado}.`);
    L.push(`- **Qué se probó:** ${f.probado}`);
    L.push(`- **Texto / foto:** ${f.texto} / ${f.foto}.`);
    L.push(`- **Cada cuánto publica:** ${f.cadencia}`);
    L.push(`- **Qué aporta:** ${f.contenido}`);
    L.push(`- **Recomendación de lectura:** ${f.comoLeerla}`);
    if (f.selector && f.selector !== '—') L.push(`- **Estructura de la página:** ${f.selector}`);
    L.push(`- **Peso:** hoy ${f.peso.hoy}; sugerido ${f.peso.sugerido}. ${f.peso.criterio}`);
    if (f.redes && f.redes !== '—') L.push(`- **Redes (no se pueden leer):** ${f.redes}`);
    for (const a of f.alertas ?? []) L.push(`- **Ojo:** ${a}`);
    L.push('');
  });
  L.push('## Contra lo que hay en `ingesta/fuentes.mjs`');
  L.push('');
  L.push('Hoy hay 11 de Balcarce (8 medios, Municipalidad, Concejo y Facultad), con 15 direcciones.');
  L.push('');
  L.push('- **Falta:** ' + d.filasFondo.filter((y) => y.fondo?.accion === 'sumar').map((y) => y.fondo.nombre).join('; ') + '.');
  L.push('- **A revisar:** ' + d.filasFondo.filter((y) => y.fondo?.accion === 'revisar').map((y) => y.fondo.nombre).join('; ') + '.');
  L.push('- **Sobra:** nada. Candidata muerta: Minuto Balcarce. Dormida: Ahora Balcarce.');
  L.push('- Las pendientes de `LISTA-ELEGIDA.md` ("SIBOM y las instituciones sin sitio: hospital, bomberos, Cooperativa, autódromo, radios Líder y 105.1") quedan respondidas: SIBOM y la Cooperativa se pueden leer como página; el hospital sale por el feed municipal; bomberos y autódromo no tienen sitio; Radio Líder es del grupo de La Vanguardia y la 105.1 (FM Ebeneser) no tiene sitio de noticias.');
  L.push('');
  L.push('## Cómo se probó y qué no se pudo');
  L.push('');
  L.push('- Todo se pidió desde la PC de Hernán (curl y fetch con nombre de navegador) el 15/10/2026 por la tarde. **Nada se probó desde GitHub Actions ni desde Cloudflare**: las que dependen de esto (La Capital de Mar del Plata, el feed de Ahora Balcarce con https) hay que verificar antes de sumarlas.');
  L.push('- "No se encontró sitio" quiere decir que las búsquedas (buscadores, Google Noticias y los enlaces de los sitios de acá) no devolvieron uno; puede existir sólo en Facebook o Instagram, y se lo hay que pedir a la institución.');
  L.push('- Facebook, Instagram y X no se pueden leer sin una cuenta: quedan "a mano".');
  L.push('- No se vio nunca la página de cortes programados de la Cooperativa con un corte cargado, ni un boletín SIBOM más nuevo que el 128º (21/09).');
  L.push('');
  return L.join('\n');
}

export function escribirRevision({ raiz = RAIZ, salida, salidaMd } = {}) {
  const datos = armarDatos({ raiz });
  const html = generarHTML(datos);
  const destino = salida ?? path.join(raiz, 'docs', 'etapa-1-fuentes', 'REVISION-FUENTES.html');
  fs.writeFileSync(destino, html, 'utf8');
  const md = generarMarkdownBalcarce(datos);
  const destinoMd = salidaMd ?? (salida ? null : path.join(raiz, 'docs', 'etapa-1-fuentes', 'BALCARCE-INVESTIGACION.md'));
  if (destinoMd) fs.writeFileSync(destinoMd, md, 'utf8');
  return { destino, destinoMd, datos, bytes: Buffer.byteLength(html) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv.slice(2).find((a) => a.startsWith('--salida='));
  const r = escribirRevision({ salida: arg ? path.resolve(arg.split('=').slice(1).join('=')) : undefined });
  const s = r.datos.resumen;
  console.log(`Escrito ${r.destino} (${Math.round(r.bytes / 1024)} KB)${r.destinoMd ? ` y ${r.destinoMd}` : ''}`);
  console.log(`Medios: ${s.totalMedios} (activos ${s.mediosActivos}; quedan ${s.queQuedan.medios}, descartadas ${s.descartadas.total}) · direcciones activas ${s.feedsActivos} (de cruce ${s.feedsCruce}) · dudosas ${s.dudosas}`);
  console.log(`Por grupo: ${JSON.stringify(s.porGrupo)} · sugerencias: ${JSON.stringify(s.sugerencias)}`);
  console.log(`Balcarce a fondo: ${JSON.stringify(s.balcarceFondo)}`);
}

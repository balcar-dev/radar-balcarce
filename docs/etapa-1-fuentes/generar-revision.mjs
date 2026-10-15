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
  const feedsActivos = feedsTodos.filter((f) => f.activa !== false);
  const resumen = {
    mediosActivos: activos.length,
    feedsActivos: feedsActivos.length,
    feedsFuente: feedsActivos.filter((f) => f.origen === 'fuente').length,
    feedsCruce: feedsActivos.filter((f) => f.origen === 'cruce').length,
    mediosSoloCruce: activos.filter((m) => m.soloCruce).length,
    porGrupo: Object.fromEntries(ORDEN.map((g) => [g, medios.filter((m) => m.grupo === g).length])),
    feedsPorGrupo: Object.fromEntries(ORDEN.map((g) => [g, medios.filter((m) => m.grupo === g).reduce((s, m) => s + (g === 'apagadas' ? m.nFeeds : m.nFeedsActivos), 0)])),
    dudosas: activos.filter((m) => m.dudas.length).length,
    totalMedios: medios.length,
    feedsTotales: feedsTodos.length,
    sugerencias: Object.fromEntries(['mantener', 'revisar', 'apagar'].map((s) => [s, medios.filter((m) => m.sugerencia.accion === s).length])),
  };

  return {
    generado: ahora.toISOString(),
    notasAnalizadas: enVentana.length,
    ventana: corte ? { desde: corte.slice(0, 10), hasta: (ultimaNota ?? '').slice(0, 10) } : null,
    medidoEl,
    hayPlanilla: csv.length > 0,
    medios,
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
  balcarce: ['Balcarce', 'Los medios y organismos de acá. Entran todos.'],
  pais: ['Nacionales elegidos', 'Los 50 mejores medios del país (incluye los de provincia y otras provincias, deportes, agro y economía).'],
  zona: ['Tandil y Mar del Plata', 'Los 10 mejores de la zona.'],
  otras: ['Otras activas', 'Activas que no están en la lista elegida (debería estar vacío).'],
  apagadas: ['Apagadas', 'Están en el registro con activa: false. No se leen, pero se pueden prender de nuevo.'],
};

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

function htmlFila(m) {
  const buscar = norm([m.nombre, m.dueno, m.ciudad, m.subgrupo, m.hermanos.join(' '), ...m.feeds.map((f) => `${f.id} ${f.url} ${f.seccion ?? ''}`)].join(' '));
  const tipos = [...new Set(m.feeds.filter((f) => f.activa || !m.activo).map((f) => f.tipoCorto))].join(' ');
  const origenes = [...new Set(m.feeds.filter((f) => f.activa || !m.activo).map((f) => f.origen))].join(' ');
  const dudaTipos = m.dudas.map((d) => d.tipo).join(' ');
  const feedsHtml = m.feeds.map(htmlFeed).join('');
  const feeds = m.feeds.length > 3
    ? `<details><summary>${m.feeds.length} direcciones (${m.nFeedsActivos} activas)</summary><ul class="feeds">${feedsHtml}</ul></details>`
    : `<ul class="feeds">${feedsHtml}</ul>`;
  const s = m.sugerencia;
  return `<tr class="fila${m.dudas.length ? ' dudosa' : ''}${m.activo ? '' : ' fila-apagada'}" id="m-${esc(m.clave)}" data-k="${esc(m.clave)}" data-nombre="${esc(m.nombre)}" data-grupo="${m.grupo}" data-sug="${s.accion}" data-dudosa="${m.dudas.length ? 1 : 0}" data-duda-tipos="${esc(dudaTipos)}" data-tipos="${esc(tipos)}" data-origen="${esc(origenes)}" data-pub="${m.pub30}" data-buscar="${esc(buscar)}">
  <td data-label="Medio" class="c-medio">
    <div class="nombre">${esc(m.nombre)}</div>
    <div class="etqs">${m.subgrupo ? `<span class="etq">${esc(m.subgrupo)}</span>` : ''}${m.ciudad ? `<span class="etq">${esc(m.ciudad)}</span>` : ''}${m.alcance ? `<span class="etq">${esc(m.alcance)}</span>` : ''}${m.nuevo ? '<span class="etq etq-nueva" title="Alta o reactivado el 15/10: todavía sin historial">nuevo / sin historial</span>' : ''}</div>
    <div class="dueno" data-dueno><b>Dueño (grupo):</b> ${m.dueno ? esc(m.dueno) : '—'}${m.hermanos.length ? `<br><span class="chico">Hermanos activos: ${esc(m.hermanos.join(', '))}</span>` : ''}</div>
    ${m.dudas.length ? `<ul class="dudas">${m.dudas.map((d) => `<li class="duda duda-${d.tipo}">${esc(d.texto)}</li>`).join('')}</ul>` : ''}
  </td>
  <td data-label="Direcciones que se leen (tipo, URL, sección, peso)" class="c-feeds">${feeds}</td>
  <td data-label="Activa" class="c-activa"><span class="pill ${m.activo ? 'pill-si' : 'pill-no'}">${m.activo ? 'Activa' : 'Apagada'}</span><div class="chico">${m.activo ? `${m.nFeedsActivos} de ${m.nFeeds} direcciones` : `${m.nFeeds} ${m.nFeeds === 1 ? 'dirección' : 'direcciones'}`}</div></td>
  <td data-label="Notas (últimos 30 días)" class="c-notas">${htmlNotas(m)}</td>
  <td data-label="Último estado" class="c-estado">${htmlEstado(m)}</td>
  <td data-label="Por qué está" class="c-porque">${htmlPorQue(m)}</td>
  <td data-label="Sugerencia de Claude" class="c-sug"><span class="sug sug-${s.accion}">${s.accion[0].toUpperCase()}${s.accion.slice(1)}</span><p>${esc(s.texto)}</p></td>
  <td data-label="Tu decisión" class="c-decision">
    <div class="botones" role="group" aria-label="Decisión sobre ${esc(m.nombre)}">
      <button type="button" class="b b-si" data-d="Sí" aria-pressed="false">Sí</button>
      <button type="button" class="b b-no" data-d="No" aria-pressed="false">No</button>
      <button type="button" class="b b-duda" data-d="Duda" aria-pressed="false">Duda</button>
    </div>
    <input type="text" class="coment" placeholder="Comentario (opcional)" aria-label="Comentario sobre ${esc(m.nombre)}" maxlength="400">
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
    <div class="tarjeta tarjeta-total"><div class="t-num">${r.mediosActivos}</div><div class="t-nom">Medios activos</div><div class="chico">${r.feedsActivos} direcciones (feeds) en total</div></div>
    ${tarjeta('balcarce', r.porGrupo.balcarce, `${r.feedsPorGrupo.balcarce} direcciones`)}
    ${tarjeta('pais', r.porGrupo.pais, `${r.feedsPorGrupo.pais} direcciones`)}
    ${tarjeta('zona', r.porGrupo.zona, `${r.feedsPorGrupo.zona} ${r.feedsPorGrupo.zona === 1 ? 'dirección' : 'direcciones'}`)}
    ${r.porGrupo.otras ? tarjeta('otras', r.porGrupo.otras, 'fuera de la lista elegida') : ''}
    <div class="tarjeta"><div class="t-num">${r.feedsCruce}</div><div class="t-nom">Direcciones de cruce</div><div class="chico">de ${r.feedsActivos} activas (las otras ${r.feedsFuente} son de fuentes.mjs). ${r.mediosSoloCruce} medios se leen sólo por direcciones de cruce</div></div>
    ${tarjeta('apagadas', r.porGrupo.apagadas, `${r.feedsPorGrupo.apagadas} direcciones apagadas`)}
    <div class="tarjeta tarjeta-duda"><div class="t-num">${r.dudosas}</div><div class="t-nom">Dudosas por datos</div><div class="chico">marcadas con una franja amarilla</div></div>
  </div>
  <div class="explica">
    <h2>Qué es una fuente y qué es una fuente de cruce</h2>
    <ol>
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
  const filas = $$('tr.fila');
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

  filas.forEach((tr) => {
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
    filas.forEach((tr) => {
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
      if (ok) visibles += 1;
    });
    $$('tbody.grupo').forEach((tb) => {
      const alguna = $$('tr.fila', tb).some((tr) => !tr.hidden);
      tb.hidden = !alguna;
    });
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
    const cab = 'Decisiones sobre las fuentes (' + hoy.toLocaleDateString('es-AR') + '): Sí ' + tot['Sí'] + ' · No ' + tot.No + ' · Duda ' + tot.Duda + ' · sin decidir ' + sin;
    return cab + '\n' + lineas.join('\n') + '\n';
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
    filas.forEach(pintarFila);
    contar();
    filtrar();
    $('#caja').hidden = true;
  });

  filas.forEach(pintarFila);
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

/** La página entera, lista para escribir en un archivo. */
export function generarHTML(d) {
  const grupos = ['balcarce', 'pais', 'zona', 'otras', 'apagadas'].filter((g) => d.medios.some((m) => m.grupo === g));
  const cuerpo = grupos.map((g) => {
    const lista = d.medios.filter((m) => m.grupo === g);
    let ultimoSub = null;
    const filas = [];
    for (const m of lista) {
      filas.push(htmlFila(m));
      ultimoSub = m.subgrupo;
    }
    void ultimoSub;
    return `<tbody class="grupo" id="g-${g}" data-grupo="${g}">
  <tr class="encabezado-grupo"><td colspan="8">${esc(NOMBRE_GRUPO[g][0])} · ${lista.length} ${lista.length === 1 ? 'medio' : 'medios'}<span class="chico">${esc(NOMBRE_GRUPO[g][1])}</span></td></tr>
  ${filas.join('\n')}
</tbody>`;
  }).join('\n');
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
  <p class="sub">Radar Balcarce · generado el ${esc(generado)} · notas publicadas del ${esc(ventana)} (${d.notasAnalizadas} notas). Marcá <b>Sí</b>, <b>No</b> o <b>Duda</b> en cada medio; se guarda solo en este navegador. Al final apretá <b>Copiar mis decisiones</b> y pegalas en el chat.</p>
</header>
${htmlResumen(d)}
<details class="como"><summary>De dónde sale cada dato y cómo se arma la sugerencia</summary>
  <ul>
    <li><b>Publicadas en 30 días</b>: notas ya publicadas (del ${esc(ventana)}) que nombran al medio entre sus fuentes. El motor no guarda lo que leyó y descartó, así que no hay un número de &laquo;notas leídas&raquo; en 30 días: como aproximación se muestra lo que trajo su feed en los últimos 7 días (medido el ${esc(d.medidoEl ?? '—')} desde la PC).</li>
    <li><b>Imprescindible</b>: veces que, sin ese medio, una nota de afuera no llegaba al mínimo de medios (3/9 al 15/10). <b>Visitas</b>: las de las notas donde figura.</li>
    <li><b>Último estado</b>: la prueba en vivo de cada dirección hecha desde la PC el ${esc(d.medidoEl ?? '—')}; y, para las activas, el sondeo desde Cloudflare del ${esc(SONDEO_CLOUDFLARE.cuando)} (${SONDEO_CLOUDFLARE.andan} de ${SONDEO_CLOUDFLARE.total} andaban; las seis que no, son las de Infobae). <b>No está verificado desde GitHub Actions.</b></li>
    <li><b>Dudosa por datos</b> (franja amarilla): cero o casi cero notas en 30 días, feed caído o sin notas nuevas, bloquea a Cloudflare, o mismo dueño que otro medio activo.</li>
    <li><b>Sugerencia</b>: <i>Apagar</i> si no aportó nada en 30 días, si su feed no responde, o si bloquea y aporta poco. <i>Revisar</i> si aporta ${u.pocas} notas o menos sin haber sido imprescindible, si tiene un feed con problemas, si bloquea pero aporta mucho (${u.muchas} notas o ${u.imprescindible} veces imprescindible), o si una apagada aportaba ${u.aportaba} notas o más. <i>Mantener</i> en el resto. Los de Balcarce nunca se sugieren apagar (decisión de ustedes: entran todos) y las altas nuevas van a prueba. Es una ayuda: la decisión es de ustedes.</li>
  </ul>
</details>

<section class="herramientas" aria-label="Buscador y filtros">
  <div class="filtros">
    <label>Buscar<input id="q" type="search" placeholder="Medio, dueño, dirección, sección…" autocomplete="off"></label>
    <label>Grupo<select id="f-grupo"><option value="">Todos</option>${opcionesGrupo}</select></label>
    <label>Mi decisión<select id="f-decision"><option value="">Todas</option><option value="sin">Sin decidir</option><option value="Sí">Sí</option><option value="No">No</option><option value="Duda">Duda</option></select></label>
    <label>Sugerencia de Claude<select id="f-sug"><option value="">Todas</option><option value="mantener">Mantener</option><option value="revisar">Revisar</option><option value="apagar">Apagar</option></select></label>
    <label>Tipo<select id="f-tipo"><option value="">Todos</option><option value="feed">Feed (RSS, Atom, índice)</option><option value="scraping">Scraping de portada</option></select></label>
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
<colgroup><col style="width:17%"><col style="width:19%"><col style="width:6%"><col style="width:9%"><col style="width:9%"><col style="width:13%"><col style="width:14%"><col style="width:13%"></colgroup>
<thead><tr>
  <th>Medio y dueño</th><th>Direcciones (tipo, URL, sección, peso)</th><th>Activa</th><th>Notas (30 días)</th><th>Último estado</th><th>Por qué está</th><th>Sugerencia de Claude</th><th>Tu decisión</th>
</tr></thead>
${cuerpo}
</table>
</div>
<p class="pie">Hecho con docs/etapa-1-fuentes/generar-revision.mjs a partir de ingesta/fuentes.mjs, ingesta/fuentes-cruce.mjs, LISTA-ELEGIDA.md, fuentes-medidas.csv y web/data. Para rehacerlo: <code>node docs/etapa-1-fuentes/generar-revision.mjs</code>.</p>
</div>
<div id="toast" role="status" aria-live="polite"></div>
<script>(${clienteDeLaPagina.toString()})();</script>
</body>
</html>
`;
}

export function escribirRevision({ raiz = RAIZ, salida } = {}) {
  const datos = armarDatos({ raiz });
  const html = generarHTML(datos);
  const destino = salida ?? path.join(raiz, 'docs', 'etapa-1-fuentes', 'REVISION-FUENTES.html');
  fs.writeFileSync(destino, html, 'utf8');
  return { destino, datos, bytes: Buffer.byteLength(html) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv.slice(2).find((a) => a.startsWith('--salida='));
  const r = escribirRevision({ salida: arg ? path.resolve(arg.split('=').slice(1).join('=')) : undefined });
  const s = r.datos.resumen;
  console.log(`Escrito ${r.destino} (${Math.round(r.bytes / 1024)} KB)`);
  console.log(`Medios: ${s.totalMedios} (activos ${s.mediosActivos}, apagados ${s.porGrupo.apagadas}) · direcciones activas ${s.feedsActivos} (de cruce ${s.feedsCruce}) · dudosas ${s.dudosas}`);
  console.log(`Por grupo: ${JSON.stringify(s.porGrupo)} · sugerencias: ${JSON.stringify(s.sugerencias)}`);
}

// Mide las fuentes (Etapa 1 del rediseño, 15/10/2026). SÓLO LEE: no toca
// fuentes.mjs, fuentes-cruce.mjs ni nada de web/data/.
//
//   node ingesta/medir-fuentes.mjs              mide el archivo y prueba cada feed en vivo
//   node ingesta/medir-fuentes.mjs --sin-red    sólo lo que dice el archivo (no sale a internet)
//   node ingesta/medir-fuentes.mjs --json=x.json   además guarda el detalle completo
//   node ingesta/medir-fuentes.mjs --csv=x.csv     dónde dejar la planilla
//                                  (por defecto docs/etapa-1-fuentes/fuentes-medidas.csv)
//
// Qué mide:
//  1. Del archivo de notas publicadas (web/data/archivo.json y web/data/historico/*.json):
//     por medio, cuántas notas publicadas lo nombran entre sus medios, en cuántas fue el
//     único, en cuántas fue el primero (sólo donde hay hora de al menos dos medios), cuántas
//     confirmaron otros medios (y otros GRUPOS), en cuántas de afuera fue imprescindible (sin él no
//     llegaba al mínimo de medios de su sección: cota baja), cuántas eran de Balcarce, en qué secciones
//     y cuántas visitas tuvieron esas notas (web/data/estadisticas.json, desde el 29/09).
//     Por feed, sólo lo que se puede atribuir con seguridad (el enlace aparece en ese feed
//     hoy o en la memoria del cruce, o el medio tiene un solo feed).
//  2. En vivo, cada feed activo, apagado y candidato: respuesta HTTP, tipo de contenido,
//     cuántas notas trae, la más nueva, si está muerto (más de 7 días sin notas) y cuánto
//     se repite con los otros feeds del mismo medio.
//
// Cortesía con los sitios: de a 4 pedidos a la vez y nunca dos al mismo sitio juntos;
// 15 segundos de espera como máximo. Primero con el nombre del robot (el que ve cada
// sitio en producción); si lo bloquean, una vez más con el de un navegador común.
// Sin dependencias: sólo Node.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FUENTES, FUENTES_NACIONALES, PALABRAS_LOCALES } from './fuentes.mjs';
import { FUENTES_CRUCE } from './fuentes-cruce.mjs';
import { parsearFeed, normalizar, paraPruebas, mediosMinimosDe } from './ingesta.mjs';

const { parsearScrape, meta } = paraPruebas;
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opcion = (nombre) => args.find((a) => a.startsWith(`--${nombre}=`))?.split('=').slice(1).join('=');
const SIN_RED = args.includes('--sin-red');
const CSV = opcion('csv') ?? path.join(RAIZ, 'docs', 'etapa-1-fuentes', 'fuentes-medidas.csv');
const JSON_SALIDA = opcion('json');

const UA_ROBOT = 'RadarBalcarce/0.1 (agregador local de noticias de Balcarce)'; // el mismo de ingesta.mjs
const UA_NAVEGADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
const ESPERA = 15000;
const DIAS_MUERTA = 7;

// --------------------------------------------------------------- las fuentes

const CONFIGURADAS = [
  ...FUENTES.map((f) => ({ ...f, bloque: 'fuentes.mjs · FUENTES' })),
  ...FUENTES_NACIONALES.map((f) => ({ ...f, bloque: 'fuentes.mjs · FUENTES_NACIONALES' })),
  ...FUENTES_CRUCE.map((f) => ({ ...f, bloque: 'fuentes-cruce.mjs' })),
];

/**
 * Las candidatas de la propuesta (09-PROPUESTA-FUENTES-NUEVAS y módulo 1). `forma`: feed (RSS, Atom
 * o índice de noticias), pagina (HTML: se mira si anuncia un feed y cuántos enlaces trae) o api (JSON).
 * Las URL del módulo 1 que estaban cortadas (ESA) se completaron a mano: están marcadas.
 */
const CANDIDATAS = [
  // Zona y provincia (las que se apagaron "por GitHub" se prueban igual por estar en la lista)
  { id: 'cand-diario-tandil', medio: 'El Diario de Tandil', url: 'https://www.eldiariodetandil.com/sitemap-news.php', forma: 'feed', tipoPropuesto: 'regional' },
  { id: 'cand-sendero', medio: 'Sendero Regional', url: 'https://www.senderomultimedios.com.ar/feed/', forma: 'feed', tipoPropuesto: 'regional' },
  { id: 'cand-2261', medio: '2261 – Noticias de Lobería', url: 'https://www.2261.com.ar/feed/', forma: 'feed', tipoPropuesto: 'regional' },
  { id: 'cand-argentino-digital', medio: 'El Argentino Digital', url: 'https://www.elargentinodigital.com.ar/feed/', forma: 'feed', tipoPropuesto: 'regional' },
  { id: 'cand-infocielo', medio: 'Infocielo', url: 'https://www.infocielo.com/rss', forma: 'feed', tipoPropuesto: 'provincial' },
  { id: 'cand-infocielo-feed', medio: 'Infocielo', url: 'https://www.infocielo.com/feed', forma: 'feed', tipoPropuesto: 'provincial' },
  { id: 'cand-necochea', medio: 'Municipalidad de Necochea', url: 'https://www.necochea.gob.ar/feed/', forma: 'feed', tipoPropuesto: 'oficial' },
  { id: 'cand-lacapitalmdp', medio: 'La Capital (Mar del Plata)', url: 'https://www.lacapitalmdp.com/feed/', forma: 'feed', tipoPropuesto: 'regional' },
  { id: 'cand-lacapitalmdp-portada', medio: 'La Capital (Mar del Plata)', url: 'https://www.lacapitalmdp.com/', forma: 'pagina', tipoPropuesto: 'regional' },
  // Balcarce: instituciones y datos
  { id: 'cand-fca', medio: 'Facultad de Ciencias Agrarias (UNMdP)', url: 'https://fca.mdp.edu.ar/feed/', forma: 'feed', tipoPropuesto: 'oficial' },
  { id: 'cand-concejo', medio: 'Concejo Deliberante de Balcarce', url: 'https://concejodeliberantebalcarce.gob.ar/', forma: 'pagina', tipoPropuesto: 'oficial' },
  { id: 'cand-concejo-feed', medio: 'Concejo Deliberante de Balcarce', url: 'https://concejodeliberantebalcarce.gob.ar/feed/', forma: 'feed', tipoPropuesto: 'oficial' },
  { id: 'cand-sibom', medio: 'SIBOM Balcarce (boletín municipal)', url: 'https://sibom.slyt.gba.gob.ar/cities/10', forma: 'pagina', tipoPropuesto: 'oficial' },
  { id: 'cand-muni-wpjson', medio: 'Municipalidad de Balcarce', url: 'https://balcarce.gob.ar/wp-json/wp/v2/posts?per_page=20', forma: 'api', tipoPropuesto: 'oficial' },
  { id: 'cand-vanguardia-sitemap', medio: 'Diario La Vanguardia', url: 'https://www.diariolavanguardia.com/sitemap.xml', forma: 'feed', tipoPropuesto: 'local' },
  { id: 'cand-informese-25', medio: 'Infórmese Primero (FM 104.9)', url: 'https://informeseprimero.blogspot.com/feeds/posts/default?max-results=50', forma: 'feed', tipoPropuesto: 'local' },
  { id: 'cand-accion5-wpjson', medio: 'Acción 5 (Balcarce)', url: 'https://accion5.com/wp-json/wp/v2/posts?per_page=20', forma: 'api', tipoPropuesto: 'local' },
  // Índices de noticias (sitemap) de nacionales que hoy se leen por varios feeds de sección: ¿alcanza con uno?
  { id: 'cand-lanacion-sitemap', medio: 'La Nación', url: 'https://www.lanacion.com.ar/sitemap-news.xml', forma: 'feed', tipoPropuesto: 'nacional' },
  { id: 'cand-infobae-sitemap', medio: 'Infobae', url: 'https://www.infobae.com/arc/outboundfeeds/news-sitemap/?outputType=xml', forma: 'feed', tipoPropuesto: 'nacional' },
  { id: 'cand-ambito-sitemap', medio: 'Ámbito', url: 'https://www.ambito.com/sitemap-news.xml', forma: 'feed', tipoPropuesto: 'nacional' },
  { id: 'cand-c5n-sitemap', medio: 'C5N', url: 'https://www.c5n.com/sitemap-news.xml', forma: 'feed', tipoPropuesto: 'nacional' },
  { id: 'cand-minutouno-sitemap', medio: 'Minuto Uno', url: 'https://www.minutouno.com/sitemap-news.xml', forma: 'feed', tipoPropuesto: 'nacional' },
  { id: 'cand-gabal-general', medio: 'Radio Gabal (FM 104.1)', url: 'https://www.radiogabal.com.ar/index.php?format=feed&type=rss', forma: 'feed', tipoPropuesto: 'local' },
  // Datos (no son noticias: series)
  { id: 'cand-bcra-monetarias', medio: 'BCRA (datos)', url: 'https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias', forma: 'api', tipoPropuesto: 'oficial' },
  { id: 'cand-bcra-cotizaciones', medio: 'BCRA (datos)', url: 'https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones', forma: 'api', tipoPropuesto: 'oficial' },
  { id: 'cand-datosgob-ipc', medio: 'INDEC vía datos.gob.ar', url: 'https://apis.datos.gob.ar/series/api/series/?ids=148.3_INIVELNAL_DICI_M_26&last=3&format=json', forma: 'api', tipoPropuesto: 'oficial' },
  // Internacionales del módulo 1 (24 medios; MIT, arXiv y ESA con dos direcciones)
  { id: 'int-sciencenews', medio: 'Science News', url: 'https://www.sciencenews.org/feed', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-sciencedaily', medio: 'ScienceDaily', url: 'https://www.sciencedaily.com/rss/all.xml', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-quanta', medio: 'Quanta Magazine', url: 'https://www.quantamagazine.org/feed/', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-smithsonian', medio: 'Smithsonian (ciencia)', url: 'https://www.smithsonianmag.com/rss/science-nature/', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-scitechdaily', medio: 'SciTechDaily', url: 'https://scitechdaily.com/feed/', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-nature', medio: 'Nature', url: 'https://www.nature.com/nature.rss', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-ncomms', medio: 'Nature Communications', url: 'https://www.nature.com/ncomms.rss', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-elife', medio: 'eLife', url: 'https://elifesciences.org/rss/recent.xml', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-owid', medio: 'Our World in Data', url: 'https://ourworldindata.org/atom.xml', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-mit', medio: 'MIT News', url: 'https://news.mit.edu/rss/feed', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-mit-ia', medio: 'MIT News', url: 'https://news.mit.edu/rss/topic/artificial-intelligence2', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-techreview', medio: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-ieee', medio: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/feeds/feed.rss', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-huggingface', medio: 'Hugging Face (blog)', url: 'https://huggingface.co/blog/feed.xml', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-mistral', medio: 'Mistral AI', url: 'https://mistral.ai/rss.xml', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-arxiv-ai', medio: 'arXiv', url: 'https://rss.arxiv.org/rss/cs.AI', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-arxiv-cl', medio: 'arXiv', url: 'https://rss.arxiv.org/rss/cs.CL', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-nasa-releases', medio: 'NASA', url: 'https://www.nasa.gov/news-release/feed/', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-nasa-webb', medio: 'NASA', url: 'https://www.nasa.gov/missions/webb/feed/', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-jpl', medio: 'NASA JPL', url: 'https://www.jpl.nasa.gov/feeds/news', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-universetoday', medio: 'Universe Today', url: 'https://www.universetoday.com/feed', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-esa-ciencia', medio: 'ESA', url: 'https://www.esa.int/rssfeed/Our_Activities/Space_Science', forma: 'feed', tipoPropuesto: 'internacional', nota: 'URL completada a mano (el módulo 1 la daba cortada)' },
  { id: 'int-esa-tierra', medio: 'ESA', url: 'https://www.esa.int/rssfeed/Our_Activities/Observing_the_Earth', forma: 'feed', tipoPropuesto: 'internacional', nota: 'URL completada a mano (el módulo 1 la daba cortada)' },
  { id: 'int-noaa', medio: 'NOAA', url: 'https://www.noaa.gov/rss.xml', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-usda', medio: 'USDA', url: 'https://www.usda.gov/rss/latest-releases.xml', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-cip', medio: 'Centro Internacional de la Papa (CIP)', url: 'https://cipotato.org/feed/', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-the74', medio: 'The 74', url: 'https://www.the74million.org/feed/', forma: 'feed', tipoPropuesto: 'internacional' },
  // En castellano que el módulo 1 no pudo leer (vale probarlos)
  { id: 'int-bbcmundo', medio: 'BBC Mundo', url: 'https://feeds.bbci.co.uk/mundo/rss.xml', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-dw', medio: 'DW Español', url: 'https://rss.dw.com/xml/rss-sp-all', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-conversation', medio: 'The Conversation (España)', url: 'https://theconversation.com/es/articles.atom', forma: 'feed', tipoPropuesto: 'internacional' },
  { id: 'int-france24', medio: 'France 24 (español)', url: 'https://www.france24.com/es/rss', forma: 'feed', tipoPropuesto: 'internacional' },
];

/** Grupos de medios que comparten dueño o sistema. El de eleco.com.ar sale de las direcciones (verificado);
 *  el de Clarín es de conocimiento público y queda "a confirmar" por los dueños de Radar. */
const GRUPOS_A_MANO = {
  'Clarín': 'Grupo Clarín (a confirmar)',
  'Olé': 'Grupo Clarín (a confirmar)',
  'TN (Todo Noticias)': 'Grupo Clarín (a confirmar)',
  'Radio Mitre': 'Grupo Clarín (a confirmar)',
};
const grupoPorHost = (url) => (/apiv3\.eleco\.com\.ar$/i.test(hostDe(url)) ? 'sistema eleco.com.ar' : null);

const AGENCIAS = new Set(['Noticias Argentinas (NA)', 'Agencia DIB', 'ANDigital', 'InfoGEI']);
const OFICIALES_SIN_MARCA = new Set(['INTA', 'Servicio Meteorológico Nacional (avisos)', 'Teatro Colón', 'UAR (Unión Argentina de Rugby)',
  'CADA (Confederación Argentina de Atletismo)', 'Municipios vecinos (General Alvarado, Benito Juárez, San Cayetano)']);
const INTERNACIONALES = new Set(['Google', 'Google DeepMind', 'OpenAI', 'Microsoft', 'Nvidia', 'NASA', 'ESA', 'Hipertextual', 'Xataka', 'FayerWayer']);
const GENERALISTAS = new Set(['La Nación', 'Clarín', 'Infobae', 'Página/12', 'Perfil', 'Ámbito', 'El Cronista', 'TN (Todo Noticias)', 'C5N', 'A24',
  'Radio Mitre', 'Minuto Uno', 'Diario Popular', 'Crónica', 'El Destape', 'Canal 26', 'iProfesional', 'La Capital (Rosario)']);

function tipoPropuesto(f) {
  if (f.tipoPropuesto) return f.tipoPropuesto;
  if (f.oficial || OFICIALES_SIN_MARCA.has(f.medio)) return 'oficial';
  if (f.alcance === 'local') return 'local';
  if (AGENCIAS.has(f.medio)) return 'agencia';
  if (INTERNACIONALES.has(f.medio)) return 'internacional';
  if (f.medio === 'Argenpapa') return 'especializado';
  if (f.alcance === 'region') return 'regional';
  if (f.alcance === 'provincia') return 'provincial';
  if (GENERALISTAS.has(f.medio)) return 'nacional';
  return 'especializado';
}

// ------------------------------------------------------------------ utilidades

function hostDe(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
}
/** La dirección de una nota sin lo que cambia entre feeds (www, parámetros, barra final). */
function claveDeEnlace(url) {
  try {
    const u = new URL(String(url).trim());
    return `${u.hostname.toLowerCase().replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '').toLowerCase()}`;
  } catch { return ''; }
}
const ESMEDIOPROPIO = (m) => /^Radar Balcarce/i.test(String(m ?? ''));
const diasEntre = (a, b) => (b - a) / 864e5;
const redondear = (x, d = 1) => (x == null || Number.isNaN(x) ? '' : Math.round(x * 10 ** d) / 10 ** d);
const RE_LOCALES = PALABRAS_LOCALES.map((p) => new RegExp(`\\b${normalizar(p).replace(/\s+/g, '\\s+')}`));
const nombraBalcarce = (texto) => { const t = normalizar(texto); return RE_LOCALES.some((re) => re.test(t)); };

function leerJson(rel) {
  try { return JSON.parse(fs.readFileSync(path.join(RAIZ, rel), 'utf8')); } catch { return null; }
}

// ------------------------------------------------------- 1. lo que dice el archivo

function cargarNotas() {
  const vistas = new Set();
  const notas = [];
  const sumar = (lista, origen) => {
    for (const n of lista ?? []) {
      if (!n?.id || vistas.has(n.id)) continue;
      vistas.add(n.id);
      notas.push({ ...n, _origen: origen });
    }
  };
  sumar(leerJson('web/data/archivo.json')?.notas, 'archivo');
  const dirHist = path.join(RAIZ, 'web', 'data', 'historico');
  for (const f of fs.existsSync(dirHist) ? fs.readdirSync(dirHist).filter((x) => x.endsWith('.json')).sort() : []) {
    sumar(leerJson(`web/data/historico/${f}`)?.notas, `historico/${f}`);
  }
  return notas;
}

function cargarVistas() {
  const est = leerJson('web/data/estadisticas.json');
  const porNota = new Map();
  const dias = Object.keys(est?.dias ?? {}).sort();
  for (const d of dias) {
    for (const [id, v] of Object.entries(est.dias[d].notas ?? {})) porNota.set(id, (porNota.get(id) ?? 0) + Number(v || 0));
  }
  return { porNota, desde: dias[0] ?? null, hasta: dias.at(-1) ?? null, dias: dias.length };
}

function grupoDeMedio(medio, feedsDelMedio) {
  if (GRUPOS_A_MANO[medio]) return GRUPOS_A_MANO[medio];
  for (const f of feedsDelMedio ?? []) { const g = grupoPorHost(f.url); if (g) return g; }
  return '';
}

function medirArchivo(notas, vistas, feedsPorMedio, enlacesAFeeds) {
  const porMedio = new Map();
  const porFeed = new Map();
  const nuevo = () => ({
    notas: 0, unica: 0, primero: 0, comparables: 0, confirmadas: 0, confirmadasOtroGrupo: 0, imprescindible: 0,
    deBalcarce: 0, secciones: {}, vistas: 0, vistasUnica: 0, sinFeed: 0, ultimaNota: null,
  });
  const resumen = { total: notas.length, propias: 0, sinMedios: 0, porOrigen: {}, conHoraDeDos: 0 };
  const grupo = (m) => grupoDeMedio(m, feedsPorMedio.get(m)) || m;

  for (const n of notas) {
    resumen.porOrigen[n._origen] = (resumen.porOrigen[n._origen] ?? 0) + 1;
    const fc = (n.fuentesConsultadas ?? []).filter((f) => !ESMEDIOPROPIO(f.medio));
    let medios = [...new Set((n.medios ?? []).filter((m) => m && !ESMEDIOPROPIO(m)))];
    if (!medios.length) medios = [...new Set(fc.map((f) => f.medio).filter(Boolean))];
    if (n.propia || !medios.length) {
      if (n.propia || (n.medios ?? []).some(ESMEDIOPROPIO)) resumen.propias += 1; else resumen.sinMedios += 1;
      continue;
    }
    const grupos = new Set(medios.map(grupo));
    const deAca = !!(n.local || n.deLaZona);
    const v = vistas.porNota.get(n.id) ?? 0;
    // ¿Quién fue el primero? Sólo cuando hay hora de al menos dos medios distintos.
    const horas = new Map();
    for (const f of fc) {
      const t = Date.parse(f.fecha ?? '');
      if (!Number.isNaN(t) && (!horas.has(f.medio) || t < horas.get(f.medio))) horas.set(f.medio, t);
    }
    let primero = null;
    if (horas.size >= 2) {
      resumen.conHoraDeDos += 1;
      primero = [...horas].sort((a, b) => a[1] - b[1])[0][0];
    }
    // ¿Sin este medio la nota de afuera no llegaba al mínimo de su sección? (cota baja: el archivo guarda
    // los medios de al final, que pueden ser más que los que tenía al salir, y no guarda si nombraba a una figura)
    const justa = !deAca && medios.length === mediosMinimosDe(n.seccion, {});
    for (const m of medios) {
      const x = porMedio.get(m) ?? porMedio.set(m, nuevo()).get(m);
      x.notas += 1;
      if (justa) x.imprescindible += 1;
      if (medios.length === 1) { x.unica += 1; x.vistasUnica += v; }
      if (medios.length >= 2) x.confirmadas += 1;
      if (grupos.size >= 2) x.confirmadasOtroGrupo += 1;
      if (deAca) x.deBalcarce += 1;
      x.secciones[n.seccion ?? '?'] = (x.secciones[n.seccion ?? '?'] ?? 0) + 1;
      x.vistas += v;
      if (horas.has(m) && horas.size >= 2) x.comparables += 1;
      if (primero === m) x.primero += 1;
      const f = n.fecha ?? n.visto;
      if (f && (!x.ultimaNota || f > x.ultimaNota)) x.ultimaNota = f;
    }
    // Atribución a un feed: sólo lo seguro.
    const enlacesDeLaNota = new Map(); // medio -> claves
    for (const f of fc) if (f.enlace) (enlacesDeLaNota.get(f.medio) ?? enlacesDeLaNota.set(f.medio, new Set()).get(f.medio)).add(claveDeEnlace(f.enlace));
    for (const m of medios) {
      const activos = (feedsPorMedio.get(m) ?? []).filter((f) => f.activa !== false);
      const creditos = new Set();
      for (const k of enlacesDeLaNota.get(m) ?? []) for (const id of enlacesAFeeds.get(k) ?? []) creditos.add(id);
      if (!creditos.size && activos.length === 1) creditos.add(activos[0].id);
      if (!creditos.size) { porMedio.get(m).sinFeed += 1; continue; }
      for (const id of creditos) {
        const y = porFeed.get(id) ?? porFeed.set(id, { notas: 0, deBalcarce: 0 }).get(id);
        y.notas += 1;
        if (deAca) y.deBalcarce += 1;
      }
    }
  }
  return { porMedio, porFeed, resumen };
}

// ------------------------------------------------------------ 2. la prueba en vivo

async function pedir(url, { agente = UA_ROBOT, sinCompresion = false } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ESPERA);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': agente, accept: '*/*', ...(sinCompresion ? { 'accept-encoding': 'identity' } : {}) },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const utf8 = new TextDecoder('utf-8').decode(buf);
    const rotos = (utf8.match(/�/g) ?? []).length;
    return {
      http: res.status, ok: res.ok, contentType: (res.headers.get('content-type') ?? '').split(';')[0].trim(),
      bytes: buf.length, cuerpo: rotos > utf8.length / 2000 ? buf.toString('latin1') : utf8,
      urlFinal: res.url !== url ? res.url : '', ms: Date.now() - t0,
    };
  } catch (err) {
    const codigo = String(err?.cause?.code ?? err?.code ?? '');
    const motivo = err?.name === 'AbortError' ? `tiempo agotado (${ESPERA / 1000} s)` : `${err?.message ?? err}${codigo ? ` (${codigo})` : ''}`;
    return { http: 0, ok: false, error: motivo, ms: Date.now() - t0 };
  } finally {
    clearTimeout(t);
  }
}

async function pedirConRespaldo(url, f) {
  let r = await pedir(url, { agente: f.agente ?? UA_ROBOT, sinCompresion: f.sinCompresion });
  r.ua = f.agente ? 'propio de la fuente' : 'robot';
  if (!r.ok && (r.http === 401 || r.http === 403 || r.http === 429 || r.http === 0) && !/tiempo agotado/.test(r.error ?? '')) {
    const r2 = await pedir(url, { agente: UA_NAVEGADOR, sinCompresion: f.sinCompresion });
    r2.ua = 'navegador';
    r2.conRobot = r.http ? `HTTP ${r.http}` : r.error;
    if (r2.ok || !r.http) r = r2; else r.conNavegador = r2.http ? `HTTP ${r2.http}` : r2.error;
  }
  return r;
}

function fechasDe(items, t0) {
  const conFecha = items.filter((n) => n.fecha instanceof Date && n.fecha.getTime() < t0 && !n.fechaEstimada);
  const ts = conFecha.map((n) => n.fecha.getTime()).sort((a, b) => b - a);
  return { sinFecha: items.length - conFecha.length, nueva: ts[0] ?? null, vieja: ts.at(-1) ?? null, ts };
}

/** Prueba una fuente: responde, cuántas notas, la más nueva, sus enlaces. */
async function probar(f) {
  const r = await pedirConRespaldo(f.url, f);
  const out = {
    http: r.http, contentType: r.contentType ?? '', ua: r.ua, conRobot: r.conRobot ?? '', conNavegador: r.conNavegador ?? '',
    urlFinal: r.urlFinal ?? '', ms: r.ms, bytes: r.bytes ?? 0, error: r.error ?? '', items: 0, sinFecha: 0,
    nueva: null, vieja: null, n24h: 0, n7d: 0, balcarce: 0, enlaces: [], feedAnunciado: '', detalle: '',
  };
  if (!r.ok) { if (!out.error) out.error = `HTTP ${r.http}`; return out; }
  const t0 = Date.now() - 1000;
  const cuerpo = r.cuerpo;
  let items = [];
  const forma = f.forma ?? (f.tipo === 'scrape' ? 'scrape' : 'feed');
  try {
    if (forma === 'api') {
      const j = JSON.parse(cuerpo);
      const lista = Array.isArray(j) ? j : (j.results ?? j.data ?? []);
      out.items = Array.isArray(lista) ? lista.length : 0;
      const fechas = (Array.isArray(lista) ? lista : []).map((x) => Date.parse(x?.date ?? x?.fecha ?? x?.ultFechaInformada ?? (Array.isArray(x) ? x[0] : '')))
        .filter((x) => !Number.isNaN(x) && x < Date.now() + 864e5).sort((a, b) => b - a);
      if (j?.results && !Array.isArray(j.results) && j.results.fecha) fechas.unshift(Date.parse(j.results.fecha));
      out.nueva = fechas[0] ?? null;
      out.detalle = Array.isArray(lista) ? `JSON con ${out.items} registros` : 'JSON';
      if (j?.results?.detalle) { out.items = j.results.detalle.length; out.detalle = `cotizaciones de ${out.items} monedas, fecha ${j.results.fecha}`; out.nueva = Date.parse(j.results.fecha); }
      if (Array.isArray(lista) && lista[0]?.link) out.enlaces = lista.map((x) => claveDeEnlace(x.link)).filter(Boolean);
      return finalizar(out, []);
    }
    if (forma === 'pagina') {
      const feed = cuerpo.match(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/i)?.[0]?.match(/href=["']([^"']+)["']/i)?.[1] ?? '';
      out.feedAnunciado = feed;
      const enlaces = new Set([...cuerpo.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)].map((m) => m[1]));
      out.items = enlaces.size;
      const fechasTexto = [...cuerpo.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(20\d\d)\b/g)].map((m) => Date.UTC(+m[3], +m[2] - 1, +m[1]))
        .filter((x) => x < Date.now() + 864e5).sort((a, b) => b - a);
      out.nueva = fechasTexto[0] ?? null;
      out.detalle = `página HTML con ${enlaces.size} enlaces${feed ? `; anuncia feed ${feed}` : '; no anuncia feed'}${fechasTexto.length ? '; fecha más nueva escrita en la página' : ''}`;
      return finalizar(out, []);
    }
    if (forma === 'scrape') {
      items = parsearScrape(cuerpo, f);
      // La portada no trae fecha: se entra a las tres primeras notas a leerla, como hace la ingesta.
      for (const n of items.slice(0, 3)) {
        const p = await pedir(n.enlace, { agente: f.agente ?? UA_ROBOT });
        if (!p.ok) continue;
        const cruda = meta(p.cuerpo, 'article:published_time') || meta(p.cuerpo, 'og:updated_time');
        const d = cruda ? new Date(cruda.includes('T') ? cruda : cruda.replace(' ', 'T')) : null;
        if (d && !Number.isNaN(+d)) { n.fecha = d; n.fechaEstimada = false; }
      }
      out.detalle = 'portada raspada; fecha leída de las 3 primeras notas';
    } else {
      items = parsearFeed(cuerpo, { ...f, peso: f.peso ?? 10 });
      if (/<urlset[\s>]/i.test(cuerpo)) out.detalle = 'índice de noticias (sitemap)';
      else if (/<feed[\s>]/i.test(cuerpo) && !/<rss[\s>]/i.test(cuerpo)) out.detalle = 'Atom';
      else if (/<rss[\s>]/i.test(cuerpo)) out.detalle = 'RSS';
      else if (/<sitemapindex[\s>]/i.test(cuerpo)) out.detalle = 'índice de sitemaps (no de noticias)';
      else if (/<html[\s>]/i.test(cuerpo)) out.detalle = 'devuelve una página HTML, no un feed';
    }
    if (f.maxNotas) items = items.slice(0, f.maxNotas);
  } catch (e) {
    out.error = `no se pudo leer: ${String(e.message).slice(0, 80)}`;
  }
  return finalizar(out, items, t0);
}

function finalizar(out, items, t0 = Date.now()) {
  if (items.length) {
    out.items = items.length;
    const fe = fechasDe(items, t0 + 864e5 * 0);
    out.sinFecha = fe.sinFecha;
    out.nueva = fe.nueva;
    out.vieja = fe.vieja;
    out.n24h = fe.ts.filter((t) => Date.now() - t <= 864e5).length;
    out.n7d = fe.ts.filter((t) => Date.now() - t <= 7 * 864e5).length;
    out.balcarce = items.filter((n) => nombraBalcarce(`${n.titulo} ${String(n.cuerpo ?? '').slice(0, 500)}`)).length;
    out.enlaces = [...new Set(items.map((n) => claveDeEnlace(n.enlace)).filter(Boolean))];
  }
  out.diasDesdeUltima = out.nueva ? diasEntre(out.nueva, Date.now()) : null;
  // Sin ninguna fecha (portadas raspadas que no la publican, avisos del SMN) no se puede decir que esté muerta.
  out.muerta = out.http >= 200 && out.http < 300 && (!out.items || (out.diasDesdeUltima != null && out.diasDesdeUltima > DIAS_MUERTA));
  out.sinNingunaFecha = !!out.items && out.nueva == null;
  return out;
}

/** De a 4 a la vez y nunca dos al mismo sitio en simultáneo. */
async function probarTodas(lista, { concurrencia = 4, alAvanzar = () => {} } = {}) {
  const resultados = new Map();
  const pendientes = [...lista];
  const ocupados = new Set();
  let hechos = 0;
  async function trabajador() {
    for (;;) {
      const i = pendientes.findIndex((f) => !ocupados.has(hostDe(f.url)));
      if (i === -1) {
        if (!pendientes.length) return;
        await new Promise((r) => { setTimeout(r, 150); });
        continue;
      }
      const [f] = pendientes.splice(i, 1);
      const h = hostDe(f.url);
      ocupados.add(h);
      try { resultados.set(f.id, await probar(f)); } catch (e) { resultados.set(f.id, { http: 0, error: String(e.message), items: 0, enlaces: [] }); }
      ocupados.delete(h);
      hechos += 1;
      alAvanzar(hechos, lista.length, f);
    }
  }
  await Promise.all(Array.from({ length: concurrencia }, trabajador));
  return resultados;
}

/** Cuánto se repite cada feed con los otros feeds del mismo medio. */
function solapamiento(fuentes, vivo) {
  const porMedio = new Map();
  for (const f of fuentes) (porMedio.get(f.medio) ?? porMedio.set(f.medio, []).get(f.medio)).push(f);
  const res = new Map();
  const medios = new Map();
  for (const [medio, lista] of porMedio) {
    const conDatos = lista.filter((f) => vivo.get(f.id)?.enlaces?.length);
    if (conDatos.length < 2) continue;
    const union = new Set(conDatos.flatMap((f) => vivo.get(f.id).enlaces));
    // Orden "voraz": primero el feed que más notas trae; después, cada vez, el que más notas NUEVAS suma
    // a lo ya cubierto. Así dos feeds iguales entre sí no se tachan los dos: queda uno.
    const cubiertas = new Set();
    const restantes = [...conDatos];
    const aporte = new Map();
    let orden = 0;
    while (restantes.length) {
      restantes.sort((a, b) => vivo.get(b.id).enlaces.filter((k) => !cubiertas.has(k)).length
        - vivo.get(a.id).enlaces.filter((k) => !cubiertas.has(k)).length);
      const f = restantes.shift();
      const nuevas = vivo.get(f.id).enlaces.filter((k) => !cubiertas.has(k));
      orden += 1;
      aporte.set(f.id, { orden, nuevas: nuevas.length, nuevasPct: nuevas.length / vivo.get(f.id).enlaces.length });
      for (const k of nuevas) cubiertas.add(k);
    }
    let principal = null;
    for (const f of conDatos) {
      const propios = new Set(vivo.get(f.id).enlaces);
      const otros = new Set(conDatos.filter((g) => g !== f).flatMap((g) => vivo.get(g.id).enlaces));
      const repetidos = [...propios].filter((k) => otros.has(k)).length;
      let parecido = null;
      for (const g of conDatos) {
        if (g === f) continue;
        const eg = new Set(vivo.get(g.id).enlaces);
        const comun = [...propios].filter((k) => eg.has(k)).length;
        const pct = comun / propios.size;
        if (!parecido || pct > parecido.pct) parecido = { id: g.id, pct };
      }
      const cobertura = propios.size / union.size;
      res.set(f.id, { repetidosPct: repetidos / propios.size, propiosDelFeed: propios.size - repetidos, parecido, cobertura, ...aporte.get(f.id) });
      if (aporte.get(f.id).orden === 1) principal = { id: f.id, cobertura };
    }
    medios.set(medio, { union: union.size, feeds: conDatos.length, principal });
  }
  return { porFeed: res, porMedio: medios };
}

// ------------------------------------------------------------ 3. la propuesta

function accionPara(f, v, sol, medioArchivo, medioSol) {
  const esCandidata = f.bloque === 'candidata';
  const vivo = v && v.http >= 200 && v.http < 300 && !v.error;
  const nada = !medioArchivo || medioArchivo.notas === 0;
  if (!v) return ['revisar', 'no se probó en vivo (--sin-red)'];
  if (esCandidata) {
    if (!vivo) return ['revisar', `no responde desde esta PC (${v.error || `HTTP ${v.http}`})`];
    if (f.forma === 'api') return ['sumar', 'datos (API) que responden: van al módulo de datos, no al cruce'];
    if (f.forma === 'pagina') return ['revisar', v.feedAnunciado ? `la página anuncia un feed: ${v.feedAnunciado}` : 'página sin feed: sólo leyendo el HTML'];
    if (v.muerta) return ['revisar', v.items ? `responde pero la nota más nueva tiene ${Math.round(v.diasDesdeUltima)} días` : 'responde pero no trae notas'];
    return ['sumar', `anda: ${v.items} notas, la última hace ${redondear(v.diasDesdeUltima * 24, 0)} h`];
  }
  if (f.activa === false) {
    if (vivo && !v.muerta) return ['revisar', `está apagada pero desde esta PC anda (${v.items} notas): ver si vuelve`];
    return ['apagar', `sigue apagada: ${v.error || (v.muerta ? 'sin notas nuevas' : 'no sirve')}`];
  }
  if (!vivo) return [nada ? 'apagar' : 'revisar', `no responde desde esta PC (${v.error || `HTTP ${v.http}`})${nada ? ' y su medio no aportó notas' : ''}`];
  if (v.muerta) return [nada ? 'apagar' : 'revisar', v.items ? `muerta: la nota más nueva tiene ${Math.round(v.diasDesdeUltima ?? 999)} días` : 'responde pero no trae notas'];
  if (f.alcance === 'local') return ['mantener', 'de Balcarce: entra siempre'];
  if (sol && medioSol) {
    const esPrincipal = medioSol.principal?.id === f.id;
    if (esPrincipal) return ['mantener', `feed principal del medio (trae el ${Math.round(sol.cobertura * 100)} % de lo que traen todos sus feeds juntos)`];
    if (sol.nuevasPct < 0.2) return ['apagar', `repetido: sólo suma ${sol.nuevas} notas (${Math.round(sol.nuevasPct * 100)} % de las suyas) que no traiga ya otro feed del mismo medio`];
    if (sol.nuevasPct < 0.5) return ['revisar', `la mitad o más de sus notas ya las trae otro feed del mismo medio (suma ${sol.nuevas} propias)`];
  }
  if (nada) return ['revisar', 'anda, pero su medio no aportó ninguna nota publicada'];
  return ['mantener', 'anda y su medio aporta'];
}

// ------------------------------------------------------------------ la corrida

function csvCelda(x) {
  const s = x == null ? '' : String(x);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const fechaCorta = (t) => (t ? new Date(t).toISOString().slice(0, 16).replace('T', ' ') : '');

async function main() {
  const t0 = Date.now();
  const candidatas = CANDIDATAS.map((c) => ({ ...c, bloque: 'candidata', activa: null, tipo: c.forma, alcance: '', peso: '' }));
  const todas = [...CONFIGURADAS, ...candidatas];
  const feedsPorMedio = new Map();
  for (const f of CONFIGURADAS) (feedsPorMedio.get(f.medio) ?? feedsPorMedio.set(f.medio, []).get(f.medio)).push(f);

  let vivo = new Map();
  if (!SIN_RED) {
    console.log(`Probando ${todas.length} direcciones (${CONFIGURADAS.length} configuradas y ${candidatas.length} candidatas), de a 4…`);
    vivo = await probarTodas(todas, {
      alAvanzar: (h, total) => { if (h % 25 === 0 || h === total) console.log(`  ${h}/${total}`); },
    });
    // Las que no contestaron (tiempo agotado, conexión cortada) se prueban una vez más, de a una, al final.
    const sinRespuesta = todas.filter((f) => !vivo.get(f.id)?.http);
    if (sinRespuesta.length) console.log(`Segundo intento, de a una, para ${sinRespuesta.length} que no contestaron…`);
    for (const f of sinRespuesta) {
      const primera = vivo.get(f.id);
      const otra = await probar(f);
      otra.segundoIntento = otra.http ? 'contestó en el segundo intento' : `tampoco en el segundo intento (${otra.error})`;
      if (!otra.http) otra.error = `${primera?.error ?? ''}; segundo intento: ${otra.error}`;
      vivo.set(f.id, otra);
    }
  }

  // Enlace de nota -> feeds que lo traen (lo de hoy en vivo + la memoria del cruce, si está en esta PC).
  const enlacesAFeeds = new Map();
  const anotar = (k, id) => { if (k) (enlacesAFeeds.get(k) ?? enlacesAFeeds.set(k, new Set()).get(k)).add(id); };
  const idsConfigurados = new Set(CONFIGURADAS.map((f) => f.id));
  for (const [id, v] of vivo) if (idsConfigurados.has(id)) for (const k of v.enlaces ?? []) anotar(k, id);
  const memoria = leerJson('.cache/cruce-memoria.json');
  for (const n of memoria?.notas ?? []) anotar(claveDeEnlace(n.enlace), n.fuenteId);

  const notas = cargarNotas();
  const vistas = cargarVistas();
  const arch = medirArchivo(notas, vistas, feedsPorMedio, enlacesAFeeds);
  const sol = solapamiento(CONFIGURADAS.filter((f) => f.activa !== false), vivo);

  const filas = todas.map((f) => {
    const v = vivo.get(f.id);
    const m = arch.porMedio.get(f.medio);
    const s = sol.porFeed.get(f.id);
    const ms = sol.porMedio.get(f.medio);
    const fa = arch.porFeed.get(f.id);
    let [accion, motivo] = accionPara(f, v, s, m, ms);
    // Una candidata de un medio que ya se lee: ¿qué parte de lo que hoy traen sus feeds trae ella sola?
    let cubre = '';
    if (f.bloque === 'candidata' && v?.enlaces?.length) {
      const union = new Set((feedsPorMedio.get(f.medio) ?? []).filter((g) => g.activa !== false).flatMap((g) => vivo.get(g.id)?.enlaces ?? []));
      if (union.size) {
        const propios = new Set(v.enlaces);
        cubre = Math.round(([...union].filter((k) => propios.has(k)).length / union.size) * 100);
        if (accion === 'sumar') { accion = cubre >= 80 ? 'sumar' : 'revisar'; motivo = `${motivo}; trae el ${cubre} % de lo que hoy traen todos los feeds del medio juntos${cubre >= 80 ? ': puede reemplazarlos' : ''}`; }
      }
    }
    const seccionesOrden = m ? Object.entries(m.secciones).sort((a, b) => b[1] - a[1]) : [];
    return {
      id: f.id, medio: f.medio, nombre: f.nombre ?? f.medio, bloque: f.bloque,
      activa: f.activa === null ? 'candidata' : (f.activa === false ? 'no' : 'sí'),
      tipo: f.tipo, alcance: f.alcance ?? '', ciudad: f.ciudad ?? (f.alcance === 'local' ? 'Balcarce' : ''),
      seccionFija: f.seccion ?? '', peso: f.peso ?? '', oficial: f.oficial ? 'sí' : '',
      grupo: grupoDeMedio(f.medio, feedsPorMedio.get(f.medio) ?? [f]), tipoPropuesto: tipoPropuesto(f), url: f.url,
      http: v?.http ?? '', contentType: v?.contentType ?? '', ua: v?.ua ?? '', conRobot: v?.conRobot ?? '', segundoIntento: v?.segundoIntento ?? '',
      formato: v?.detalle ?? '', items: v?.items ?? '', sinFecha: v?.sinFecha ?? '', ultimaNota: fechaCorta(v?.nueva),
      diasDesdeUltima: redondear(v?.diasDesdeUltima), muerta: v ? (v.muerta ? 'sí' : (v.sinNingunaFecha ? 'sin fecha' : 'no')) : '',
      notas24h: v?.n24h ?? '', notas7d: v?.n7d ?? '', nombranBalcarce: v?.balcarce ?? '',
      repetidasEnOtroFeedDelMedioPct: s ? Math.round(s.repetidosPct * 100) : '', propiasDelFeed: s?.propiosDelFeed ?? '',
      masParecidoA: s?.parecido ? `${s.parecido.id} (${Math.round(s.parecido.pct * 100)} %)` : '',
      esFeedPrincipalDelMedio: ms ? (ms.principal?.id === f.id ? 'sí' : 'no') : '',
      ordenEnElMedio: s?.orden ?? '', notasNuevasQueSuma: s?.nuevas ?? '', candidataCubreDelMedioPct: cubre,
      medioNotasPublicadas: m?.notas ?? 0, medioUnicaFuente: m?.unica ?? 0, medioPrimero: m?.primero ?? 0,
      medioComparablesPrimero: m?.comparables ?? 0, medioConfirmadas: m?.confirmadas ?? 0,
      medioConfirmadasOtroGrupo: m?.confirmadasOtroGrupo ?? 0, medioImprescindible: m?.imprescindible ?? 0, medioDeBalcarce: m?.deBalcarce ?? 0,
      medioVistas: m?.vistas ?? 0, medioVistasComoUnica: m?.vistasUnica ?? 0,
      medioSecciones: seccionesOrden.map(([k, n]) => `${k} ${n}`).join(' | '), medioUltimaNotaPublicada: m?.ultimaNota?.slice(0, 10) ?? '',
      medioNotasSinFeedAtribuible: m?.sinFeed ?? 0, feedNotasAtribuidas: fa?.notas ?? 0,
      error: v?.error ?? '', feedAnunciado: v?.feedAnunciado ?? '', accion, motivo,
    };
  });

  fs.mkdirSync(path.dirname(CSV), { recursive: true });
  const columnas = Object.keys(filas[0]);
  fs.writeFileSync(CSV, `﻿${[columnas.join(','), ...filas.map((r) => columnas.map((c) => csvCelda(r[c])).join(','))].join('\r\n')}\r\n`);

  // Medios citados en el archivo que no están en la lista.
  const configurados = new Set(CONFIGURADAS.map((f) => f.medio));
  const fuera = [...arch.porMedio].filter(([m]) => !configurados.has(m)).map(([m, x]) => ({ medio: m, notas: x.notas }));

  if (JSON_SALIDA) {
    const detalle = {
      cuando: new Date().toISOString(), sinRed: SIN_RED, resumenArchivo: arch.resumen, vistas: { desde: vistas.desde, hasta: vistas.hasta, dias: vistas.dias },
      medios: Object.fromEntries([...arch.porMedio]), feeds: Object.fromEntries([...arch.porFeed]),
      solapamientoPorMedio: Object.fromEntries([...sol.porMedio]), mediosFueraDeLaLista: fuera,
      vivo: Object.fromEntries([...vivo].map(([id, v]) => [id, { ...v, enlaces: v.enlaces?.length ?? 0 }])),
      memoriaDelCruce: memoria ? { notas: memoria.notas?.length ?? 0 } : null,
      filas,
    };
    fs.writeFileSync(JSON_SALIDA, JSON.stringify(detalle, null, 1));
  }

  // Resumen en la consola
  const cuenta = (pred) => filas.filter(pred).length;
  console.log(`\nNotas medidas: ${arch.resumen.total} (${Object.entries(arch.resumen.porOrigen).map(([k, n]) => `${k} ${n}`).join(', ')}); propias de Radar: ${arch.resumen.propias}.`);
  console.log(`Visitas: estadísticas del ${vistas.desde} al ${vistas.hasta} (${vistas.dias} días).`);
  console.log(`Medios configurados: ${configurados.size}; con al menos una nota publicada: ${[...configurados].filter((m) => arch.porMedio.get(m)?.notas).length}.`);
  if (!SIN_RED) {
    console.log(`Feeds configurados que responden bien: ${cuenta((r) => r.bloque !== 'candidata' && r.http >= 200 && r.http < 300 && !r.error)} de ${CONFIGURADAS.length}; muertos (más de ${DIAS_MUERTA} días o vacíos): ${cuenta((r) => r.bloque !== 'candidata' && r.muerta === 'sí')}.`);
  }
  const acciones = {};
  for (const r of filas) acciones[r.accion] = (acciones[r.accion] ?? 0) + 1;
  console.log(`Acciones propuestas: ${Object.entries(acciones).map(([k, n]) => `${k} ${n}`).join(', ')}.`);
  console.log(`Planilla: ${path.relative(RAIZ, CSV)}${JSON_SALIDA ? `; detalle: ${JSON_SALIDA}` : ''}. Tardó ${Math.round((Date.now() - t0) / 1000)} s.`);
}

const esEjecutable = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (esEjecutable) main().catch((e) => { console.error(e); process.exit(1); });

export { claveDeEnlace, tipoPropuesto, accionPara, solapamiento, medirArchivo };

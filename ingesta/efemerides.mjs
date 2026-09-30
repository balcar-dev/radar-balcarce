// "Un día como hoy": de dónde salen las candidatas y cómo se ordenan (30/09).
//
// Hernán pidió una base mensual: para cada día, las 20 mejores posibilidades,
// que una persona elige desde el panel del celular. Acá está la parte que no
// necesita red (leer el texto de Wikipedia, marcar lo delicado, puntuar y
// quedarse con las 20 mejores) y, aparte, la que baja los datos. Sin
// dependencias, como todo `ingesta/`.
//
// Lo que sale de acá son CANDIDATAS, nunca notas: una persona las elige y cada
// dato se confirma con una segunda fuente antes de salir (docs/13-EFEMERIDES.md).
// Wikipedia se toma como pista, no como prueba, y se reescribe con palabras
// propias (CC BY-SA).

import fs from 'node:fs';
import path from 'node:path';

export const ANIO_DE_REFERENCIA = 2026;
export const CANDIDATAS_POR_DIA = 20;
/** De un mismo estilo no entran más que esto entre las 20, salvo que falten. */
export const MAXIMO_POR_ESTILO = 6;
/** Los días especiales del mundo son relleno: pocos. */
export const MAXIMO_DE_DIAS_ESPECIALES = 3;
/** Los datos curiosos del mundo, que sobran, también con tope. */
export const MAXIMO_DE_CURIOSOS = 5;

const AQUI = import.meta.dirname;
export const RUTA_CURADAS = path.join(AQUI, 'efemerides-curadas.json');

// ---------------------------------------------------------------- el texto

const ENTIDADES = { '&ndash;': '–', '&mdash;': '—', '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&lt;': '<', '&gt;': '>' };

/** El wikitexto de una línea, en texto llano: sin notas, plantillas ni enlaces. */
export function limpiarWiki(t = '') {
  let s = String(t);
  s = s.replace(/<ref[^>]*\/>/gi, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
  // Plantillas {{...}} (pueden anidarse una vez).
  for (let i = 0; i < 3; i += 1) s = s.replace(/\{\{[^{}]*\}\}/g, '');
  s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1');
  s = s.replace(/'{2,}/g, '').replace(/<[^>]+>/g, '');
  s = s.replace(/&[a-z]+;/g, (e) => ENTIDADES[e] ?? ' ');
  return s.replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
}

/** Las efemérides del Portal Argentina de Wikipedia: [{ anio, texto }]. */
export function parsearPortal(wikitext = '') {
  const salida = [];
  for (const linea of String(wikitext).split('\n')) {
    const m = linea.match(/^\*\s*'''\s*(\d{1,4})\s*'''\s*(?:[-–—]|&ndash;|&mdash;)?\s*(.*)$/);
    if (m) {
      const texto = limpiarWiki(m[2]);
      if (texto) salida.push({ anio: Number(m[1]), texto });
    }
  }
  return salida;
}

/**
 * Los "días especiales" que Wikipedia lista para una fecha: los de Argentina
 * (`nacional: true`, sin los de una provincia) y los internacionales.
 * `lista` es el arreglo de textos que da el feed `holidays`.
 */
export function especialesDelDia(lista = []) {
  const salida = [];
  const RELIGIOSO = /\b(san|santa|santo|santos|beato|beata|m[aá]rtires?|obispo|papa|virgen|advocaci[oó]n|presb[ií]tero|abad|nuestra se[ñn]ora|liturgi\w*|festividad)\b/i;
  for (const bruto of lista) {
    const s = String(bruto).replace(/\u00a0/g, ' ');
    const cabecera = s.match(/^([^\n]{2,90}):\n([\s\S]*)$/);
    if (cabecera) {
      // Un bloque de un país ("Argentina Argentina:" y sus líneas): sólo el nuestro.
      if (!/^Argentina\b/.test(cabecera[1])) continue;
      for (const linea of cabecera[2].split('\n')) {
        // Lo que sigue a "Misiones:" o "Ciudad Autónoma (CABA): …" es de una provincia, no nacional.
        if (/^\s*[^.:]{2,60}:(\s|$)/.test(linea)) break;
        const texto = limpiarWiki(linea);
        if (texto) salida.push({ texto, nacional: true });
      }
    } else {
      const texto = limpiarWiki(s);
      if (texto && !RELIGIOSO.test(texto)) salida.push({ texto, nacional: false });
    }
  }
  return salida;
}

// ------------------------------------------------------------- las marcas

const RE_VIOLENCIA = /\b(asesin\w*|mata|matan|matar|mat[oó]|mataron|matanza|fusil\w*|golpe de estado|guerra|batalla|atentado|bombard\w*|masacre|secuestr\w*|desaparecid\w*|tortur\w*|genocid\w*|terroris\w*|ejecut\w*|linch\w*|explosi[oó]n|incendio|naufrag\w*|accidente|tragedia|v[ií]ctimas?|represi[oó]n|dictadura|crimen|homicid\w*|suicid\w*|c[aá]rcel|condenad\w*|invasi[oó]n|combate|sublevaci\w*|mot[ií]n|derrocad\w*|epidemia|peste)\b/i;
const RE_POLITICA = /\b(presidente|presidencia|gobernador|ministro|elecci\w*|golpe|peronis\w*|per[oó]n|evita|kirchner\w*|radical|senador|diputad\w*|congreso|gobierno|asume|decreto|constituci[oó]n|sindicat\w*|partido)\b/i;
const RE_RELIGION = /\b(papa [A-Z]\w+|el papa|iglesia|obispo|enc[ií]clica|cardenal|cat[oó]lic\w*|conc[ií]lio|bula)\b/i;
const RE_MENORES = /\b(ni[ñn]os?|ni[ñn]as?|menores?|adolescentes?|chicos?|chicas?)\b/i;

/** Lo delicado de un texto: las marcas que el panel muestra y el puntaje descuenta. */
export function marcasDe(texto = '', anio = null) {
  const marcas = [];
  if (RE_VIOLENCIA.test(texto)) marcas.push('violencia');
  if (RE_POLITICA.test(texto)) marcas.push('política');
  if (RE_MENORES.test(texto)) marcas.push('menores');
  if (RE_RELIGION.test(texto)) marcas.push('religión');
  if (/^(Nace|Nacimiento)\b/i.test(texto) && anio && anio >= 1930) marcas.push('puede estar vivo');
  return marcas;
}

const ESTILOS = [
  ['balcarce', /(Balcarce|Fangio|Napaleof\w*|Ramos Otero)/i],
  ['muerte', /^(Muere|Fallece|Fallecimiento|Se suicida|Muerte)\b/i],
  ['nacimiento', /^(Nace|Nacimiento)\b/i],
  ['campo', /\b(agro\w*|campo|rural\w*|papas|ganader\w*|cosecha|inta|trigo|soja|gaucho|estancia|tambo|agricultor\w*)\b/i],
  ['ciencia', /\b(cient[ií]fic\w*|descubr\w*|invent\w*|patente|laboratorio|observatorio|nobel|m[eé]dic\w*|investigador\w*|sat[eé]lite|espacial|tecnolog\w*)\b/i],
  ['deporte', /\b(f[uú]tbol|boxe\w*|automovil\w*|piloto|campe[oó]n\w*|ol[ií]mpic\w*|tenis|rugby|b[aá]squet|club|copa|carrera|mundial|deportiv\w*)\b/i],
  ['cultura', /\b(escritor\w*|poeta|novela|libro|pel[ií]cula|cine|teatro|m[uú]sic\w*|cantante|pintor\w*|artista|disco|obra|estrena\w*|orquesta|museo|biblioteca|humorista|actor|actriz)\b/i],
  ['fundacion', /\b(se funda|es fundada|fundaci[oó]n|se inaugura|es inaugurad\w*|se crea|es creada|se establece|inauguraci[oó]n|se funda)\b/i],
];

/** El estilo de una efeméride: histórico, nacimiento, ciencia, cultura… */
export function estiloDe(texto = '') {
  for (const [estilo, re] of ESTILOS) if (re.test(texto)) return estilo;
  return 'historia';
}

export const NOMBRE_DE_ESTILO = {
  balcarce: 'Balcarce', nacimiento: 'Nació', muerte: 'Murió', campo: 'Campo', ciencia: 'Ciencia', deporte: 'Deporte',
  cultura: 'Cultura', fundacion: 'Fundación', historia: 'Historia', 'dia-especial': 'Día especial', patria: 'Fecha patria',
  curioso: 'Dato curioso',
};

// ------------------------------------------------------------ el puntaje

const BONO_POR_ESTILO = { fundacion: 6, ciencia: 8, cultura: 7, deporte: 5, campo: 6, nacimiento: 4, muerte: -12, historia: 0, balcarce: 30, curioso: 6 };
const PISTA_DE_CURIOSO = /\b(primer\w*|invent\w*|patente|lanz\w*|estren\w*|fundaci\w*|inaugur\w*|descubr\w*|r[eé]cord)\b/i;

/**
 * Cuánto vale una candidata: lo de Balcarce y lo redondo (25, 50, 100 años)
 * suben; lo político, lo que puede seguir vivo y lo muy corto o muy largo
 * bajan. Los números son de partida: se afinan mirando qué elige la gente
 * (docs/13-EFEMERIDES.md).
 */
export function puntuar({ origen, estilo, texto, anio, marcas = [], nacional = true }) {
  let p = 40;
  p += { curada: 50, portal: 15, 'especial-ar': 12, feed: 0, especial: 0 }[origen] ?? 0;
  if (origen === 'feed' && /\b(Argentina|argentin\w*|Buenos Aires|Rosario|C[oó]rdoba|Mendoza|Am[eé]rica Latina)\b/i.test(texto)) p += 12;
  p += BONO_POR_ESTILO[estilo] ?? 0;
  if (anio) {
    const hace = ANIO_DE_REFERENCIA - anio;
    if (hace > 0 && hace % 100 === 0) p += 14;
    else if (hace > 0 && hace % 50 === 0) p += 10;
    else if (hace > 0 && hace % 25 === 0) p += 7;
    else if (hace > 0 && hace % 10 === 0) p += 3;
  }
  if (/\b(Balcarce|Fangio)\b/i.test(texto)) p += 25;
  else if (/\b(Mar del Plata|Tandil|Necochea|Lober[ií]a)\b/i.test(texto)) p += 8;
  if (marcas.includes('política')) p -= 25;
  if (marcas.includes('puede estar vivo')) p -= 12;
  if (marcas.includes('religión')) p -= 15;
  if (texto.length < 45) p -= 8;
  if (texto.length > 260) p -= 5;
  if (origen === 'especial' && !nacional) p -= 10;
  return Math.round(p);
}

const idDe = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

const corto = (t, max = 100) => {
  if (t.length <= max) return t;
  const corte = t.slice(0, max).replace(/\s+\S*$/, '');
  return `${corte}…`;
};

// ------------------------------------------------------- armar las candidatas

/**
 * Las candidatas de un día, ya marcadas y puntuadas, de todas las fuentes.
 * `dia` = 'MM-DD'. `fuentes` = { portal: [{anio,texto}], especiales: [{texto,nacional}],
 * feed: [{anio,texto,url}], curadas: [...] }. Las que tienen violencia o menores
 * no entran (salvo las curadas: son las fechas patrias, que las revisa una persona).
 */
export function candidatasDelDia(dia, fuentes = {}) {
  const todas = [];
  const sumar = (c) => {
    const texto = c.texto.trim();
    if (!texto) return;
    const estilo = c.estilo ?? estiloDe(texto);
    const marcas = c.marcas ?? marcasDe(texto, c.anio);
    const puntaje = puntuar({ origen: c.origen, estilo, texto, anio: c.anio, marcas, nacional: c.nacional });
    todas.push({
      id: idDe(`${dia}|${c.origen}|${c.anio ?? ''}|${texto.slice(0, 60)}`),
      origen: c.origen, estilo, anio: c.anio ?? null, hace: c.anio ? ANIO_DE_REFERENCIA - c.anio : null,
      titulo: c.titulo ?? corto(texto), texto, marcas, puntaje, fuente: c.fuente ?? null,
      ...(c.datos ? { datos: c.datos } : {}),
      ...(c.revisaUnaPersona ? { revisaUnaPersona: true } : {}),
    });
  };
  for (const c of fuentes.curadas ?? []) sumar({ ...c, origen: 'curada', marcas: [] });
  for (const c of fuentes.portal ?? []) sumar({ ...c, origen: 'portal', fuente: 'Portal Argentina de Wikipedia' });
  for (const c of fuentes.especiales ?? []) {
    sumar({ ...c, origen: c.nacional ? 'especial-ar' : 'especial', estilo: 'dia-especial', fuente: 'Wikipedia: días especiales' });
  }
  for (const c of fuentes.feed ?? []) {
    const tieneCuriosidad = PISTA_DE_CURIOSO.test(c.texto);
    sumar({ ...c, origen: 'feed', estilo: tieneCuriosidad ? 'curioso' : undefined, fuente: 'Wikipedia: un día como hoy' });
  }
  const vistas = new Set();
  return todas
    .filter((c) => c.origen === 'curada' || !(c.marcas.includes('violencia') || c.marcas.includes('menores')))
    .filter((c) => (vistas.has(c.id) ? false : vistas.add(c.id)))
    .sort((a, b) => b.puntaje - a.puntaje);
}

/** Las mejores `cuantas`, sin que un estilo se coma la lista. */
export function lasMejores(ordenadas, cuantas = CANDIDATAS_POR_DIA, maximoPorEstilo = MAXIMO_POR_ESTILO) {
  const elegidas = [];
  const cuenta = {};
  for (const c of ordenadas) {
    if (elegidas.length >= cuantas) break;
    if ((cuenta[c.estilo] ?? 0) >= ({ 'dia-especial': MAXIMO_DE_DIAS_ESPECIALES, curioso: MAXIMO_DE_CURIOSOS }[c.estilo] ?? maximoPorEstilo)) continue;
    cuenta[c.estilo] = (cuenta[c.estilo] ?? 0) + 1;
    elegidas.push(c);
  }
  for (const c of ordenadas) {
    if (elegidas.length >= cuantas) break;
    if (!elegidas.includes(c)) elegidas.push(c);
  }
  return elegidas.sort((a, b) => b.puntaje - a.puntaje);
}

// --------------------------------------------------------- lo curado a mano

/** Las fechas curadas (ingesta/efemerides-curadas.json), leídas del archivo. */
export function leerCuradas(ruta = RUTA_CURADAS) {
  try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch { return { fechas: [] }; }
}

/** Las curadas de un día 'MM-DD' como candidatas. */
export function curadasDelDia(dia, curadas = leerCuradas()) {
  return (curadas.fechas ?? []).filter((f) => f.fecha === dia).map((f) => ({
    titulo: f.nombre, texto: f.datos?.[0]?.texto ?? f.nombre, estilo: f.local ? 'balcarce' : 'patria',
    fuente: f.datos?.[0]?.fuente ?? null, datos: f.datos, revisaUnaPersona: !!f.revisaUnaPersona,
  }));
}

// ----------------------------------------------------------- los feriados

/** Palabras del nombre de un feriado que lo ligan con su fecha curada. */
const CLAVES_DE_FERIADO = [
  ['01-01', /a[ñn]o nuevo/i], ['carnaval', /carnaval/i], ['semana-santa', /viernes santo|jueves santo/i],
  ['03-24', /memoria/i], ['04-02', /malvinas/i], ['05-01', /trabajador/i], ['05-25', /revoluci[oó]n/i],
  ['06-17', /g[uü]emes/i], ['06-20', /belgrano|bandera/i], ['07-09', /independencia/i], ['08-17', /san mart[ií]n/i],
  ['10-12', /diversidad|respeto|raza/i], ['11-20', /soberan[ií]a/i], ['12-08', /inmaculada/i], ['12-25', /navidad/i],
];

/**
 * Las piezas de feriados: para cada feriado que da la API, la ficha curada que
 * le corresponde (con su enfoque y sus datos) o "por definir". Los puentes son
 * días comunes: no llevan pieza.
 */
export function piezasDeFeriados(feriados = [], curadas = leerCuradas(), { desde = '0000-00-00', hasta = '9999-99-99' } = {}) {
  const porClave = new Map((curadas.fechas ?? []).map((f) => [f.fecha, f]));
  // Las fuentes van por nombre ("ley27399") en el archivo curado: acá, con su enlace.
  const conEnlace = (x) => ({ ...x, fuente: curadas.fuentes?.[x.fuente] ?? x.fuente ?? null });
  const salida = [];
  const vistos = new Set();
  for (const f of feriados) {
    if (f.fecha < desde || f.fecha > hasta) continue;
    if (/puente/i.test(f.tipo) || /puente/i.test(f.nombre)) continue;
    const clave = CLAVES_DE_FERIADO.find(([, re]) => re.test(f.nombre))?.[0] ?? null;
    // Carnaval son dos días con la misma pieza: se cuenta una vez, el primero.
    const grupo = `${clave ?? f.fecha}|${f.fecha.slice(0, 4)}`;
    if (clave === 'carnaval' || clave === 'semana-santa') { if (vistos.has(grupo)) continue; vistos.add(grupo); }
    const c = clave ? porClave.get(clave) : null;
    salida.push({
      fecha: f.fecha, nombre: f.nombre, tipo: f.tipo,
      enfoque: c?.enfoque ?? null, datos: (c?.datos ?? []).map(conEnlace), citas: (c?.citas ?? []).map(conEnlace),
      revisaUnaPersona: !!c?.revisaUnaPersona, nota: c?.nota ?? null,
      estado: c ? 'propuesta' : 'por definir',
    });
  }
  return salida;
}

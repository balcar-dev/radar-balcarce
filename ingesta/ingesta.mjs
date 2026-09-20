// Ingesta de Radar Balcarce — prueba local, sin dependencias ni cuentas.
//   node ingesta.mjs
// Deja los resultados en ./salida (portada.json y preview.html).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NOMBRES_PROPIOS, FIGURAS, BALCARCE, FUENTES, FUENTES_NACIONALES, PALABRAS_LOCALES, REGLAS_SECCION, REGLAS_SEMAFORO,
} from './fuentes.mjs';

export const TODAS_LAS_FUENTES = [...FUENTES, ...FUENTES_NACIONALES];

// Cuando corre desde el panel no queremos que escriba en la consola.
let log = console.log;

// Un identificador estable por nota, para que el panel recuerde qué aprobaste
// aunque la ingesta vuelva a correr veinte veces.
function idDe(texto) {
  let h = 5381;
  for (let i = 0; i < texto.length; i += 1) h = ((h * 33) ^ texto.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const SALIDA = path.join(import.meta.dirname, 'salida');
const UA = 'RadarBalcarce/0.1 (agregador local de noticias de Balcarce)';

// ---------------------------------------------------------------- utilidades

export async function traer(url, { timeout = 15000, agente } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      // Algunas APIs (met.no) exigen un User-Agent que identifique al que
      // llama, con contacto incluido: es su condición de uso gratuito.
      headers: { 'user-agent': agente ?? UA, accept: '*/*' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Varios sitios no declaran charset y fetch los lee como latin1: forzamos UTF-8
    // y sólo volvemos atrás si el resultado queda lleno de caracteres rotos.
    const buf = Buffer.from(await res.arrayBuffer());
    const utf8 = new TextDecoder('utf-8').decode(buf);
    const rotos = (utf8.match(/�/g) ?? []).length;
    return rotos > utf8.length / 2000 ? buf.toString('latin1') : utf8;
  } finally {
    clearTimeout(t);
  }
}

const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', laquo: '«', raquo: '»',
  hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
};

function decodificar(s = '') {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n] ?? m);
}

function sinEtiquetas(s = '') {
  return decodificar(
    s.replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

function etiqueta(xml, nombre) {
  const re = new RegExp(`<${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)</${nombre}>`, 'i');
  const m = xml.match(re);
  return m ? decodificar(m[1]).trim() : '';
}

function atributo(xml, nombre, attr) {
  const re = new RegExp(`<${nombre}[^>]*\\s${attr}=["']([^"']+)["']`, 'i');
  const m = xml.match(re);
  return m ? decodificar(m[1]) : '';
}

function bloques(xml, nombre) {
  const re = new RegExp(`<${nombre}(?:\\s[^>]*)?>[\\s\\S]*?</${nombre}>`, 'gi');
  return xml.match(re) ?? [];
}

function normalizar(s = '') {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

const VACIAS = new Set(['de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'un', 'una', 'del',
  'por', 'con', 'para', 'que', 'se', 'su', 'al', 'lo', 'es', 'no', 'mas', 'sobre', 'tras']);

function fichas(titulo) {
  return new Set(normalizar(titulo).split(' ').filter((w) => w.length > 3 && !VACIAS.has(w)));
}

// Busca una palabra entera, no un pedazo: "obra" no puede matchear dentro de
// "cobra", pero sí tiene que matchear "obras". Los sufijos cortos se permiten.
const CACHE_RE = new Map();
function contiene(textoNormalizado, palabra) {
  let re = CACHE_RE.get(palabra);
  if (!re) {
    const p = normalizar(palabra).replace(/\s+/g, '\\s+');
    re = new RegExp(`\\b${p}\\w{0,3}\\b`);
    CACHE_RE.set(palabra, re);
  }
  return re.test(textoNormalizado);
}

function parecido(a, b) {
  const A = fichas(a); const B = fichas(b);
  if (!A.size || !B.size) return 0;
  let comunes = 0;
  for (const w of A) if (B.has(w)) comunes += 1;
  return comunes / Math.min(A.size, B.size);
}

function haceCuanto(fecha) {
  const min = Math.round((Date.now() - fecha.getTime()) / 60000);
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} días`;
}

// ------------------------------------------------------------------- parseo

export function parsearFeed(xml, fuente) {
  const esAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const crudos = esAtom ? bloques(xml, 'entry') : bloques(xml, 'item');

  return crudos.map((b) => {
    const titulo = sinEtiquetas(etiqueta(b, 'title'));

    let enlace = '';
    if (esAtom) {
      enlace = atributo(b, 'link', 'href') || etiqueta(b, 'id');
    } else {
      enlace = etiqueta(b, 'link') || atributo(b, 'link', 'href') || etiqueta(b, 'guid');
    }

    const fechaTexto = etiqueta(b, 'pubDate') || etiqueta(b, 'published')
      || etiqueta(b, 'updated') || etiqueta(b, 'dc:date');
    const fecha = fechaTexto ? new Date(fechaTexto) : new Date();

    const cuerpoHtml = etiqueta(b, 'content:encoded') || etiqueta(b, 'content')
      || etiqueta(b, 'description') || etiqueta(b, 'summary');
    const cuerpo = sinEtiquetas(cuerpoHtml);

    const imagen = atributo(b, 'enclosure', 'url')
      || atributo(b, 'media:content', 'url')
      || atributo(b, 'media:thumbnail', 'url')
      || (cuerpoHtml.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? '');

    const categorias = bloques(b, 'category').map((c) => sinEtiquetas(c)).filter(Boolean);

    return {
      titulo,
      enlace: enlace.trim(),
      fecha: Number.isNaN(fecha.getTime()) ? new Date() : fecha,
      cuerpo,
      textoCompleto: cuerpo.length > 400,
      imagen,
      categorias,
      fuenteId: fuente.id,
      medio: fuente.medio,
      alcance: fuente.alcance,
      oficial: !!fuente.oficial,
      seccionFuente: fuente.seccion ?? null,
      peso: fuente.peso ?? 10,
    };
  }).filter((n) => n.titulo && n.enlace);
}

// Los medios sin feed se leen de la portada. `fuente.patronEnlace` es la
// forma de reconocer un link a una nota (distinta en cada sitio) y
// `fuente.base` es lo que se antepone a un href relativo.
// Lee un <meta> de Open Graph o del <head>. Los medios los ponen para que
// WhatsApp y Facebook muestren bien el link, así que son el texto que ellos
// mismos eligieron como resumen: es lo más honesto que podemos tomar.
function meta(html, nombre) {
  const directo = new RegExp(`<meta[^>]+(?:property|name)=["']${nombre}["'][^>]*content=["']([^"']*)["']`, 'i');
  const alReves = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${nombre}["']`, 'i');
  const m = html.match(directo) ?? html.match(alReves);
  return m ? sinEtiquetas(m[1]).trim() : '';
}

// Las fuentes que se leen raspando la portada (hoy El Diario) sólo dan el
// título: ni bajada ni fecha real. Eso terminaba en la web como notas que
// eran un titular pelado, y además, al no tener hora, no podían competir
// en relevancia contra las que sí la tienen. Esto entra a cada nota y saca
// la bajada y la fecha de publicación de sus propios metadatos.
//
// De a 4 en paralelo y sólo para lo que no tiene cuerpo: son unos 15
// pedidos por ciclo, nada para el servidor de ellos.
async function ampliar(notas, { concurrencia = 4 } = {}) {
  const pendientes = notas.filter((n) => !n.cuerpo);
  for (let i = 0; i < pendientes.length; i += concurrencia) {
    await Promise.allSettled(pendientes.slice(i, i + concurrencia).map(async (n) => {
      const html = await traer(n.enlace, { timeout: 12000 });
      const bajada = meta(html, 'og:description') || meta(html, 'twitter:description');
      if (bajada.length > 40) { n.cuerpo = bajada; n.textoCompleto = true; }

      // La portada corta los títulos con puntos suspensivos; adentro está entero.
      const entero = meta(html, 'og:title');
      if (/[.…]{3}$|…$/.test(n.titulo) && entero.length > n.titulo.length - 3) n.titulo = entero;

      const cruda = meta(html, 'article:published_time') || meta(html, 'og:updated_time');
      // Viene como "2026-09-17 18:45:02" (sin la T del formato ISO).
      const d = cruda ? new Date(cruda.includes('T') ? cruda : cruda.replace(' ', 'T')) : null;
      const dentroDeRango = d && !Number.isNaN(+d)
        && d < new Date(Date.now() + 864e5) && d > new Date(Date.now() - 30 * 864e5);
      if (dentroDeRango) { n.fecha = d; n.fechaEstimada = false; }

      // La foto no se publica nunca (es del medio que la sacó); se guarda
      // sólo porque tener foto es señal de que la nota está trabajada.
      const foto = meta(html, 'og:image');
      if (foto) n.imagen = foto;
    }));
  }
  return notas;
}

// Varios medios publican los títulos ENTEROS EN MAYÚSCULAS. En una placa de
// reel y en una portada eso se lee como un grito, así que se pasa a mayúscula
// inicial. El problema es no perder los nombres propios, y para eso se mira
// el cuerpo de la nota, que casi siempre sí viene bien escrito: cualquier
// palabra que ahí aparezca con mayúscula (Balcarce, Fangio, Municipalidad)
// se conserva con mayúscula acá.
const ARTICULOS = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'y', 'en', 'al', 'un', 'una']);

function sentenciar(titulo, cuerpo = '') {
  const letras = titulo.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '');
  if (letras.length < 8) return titulo;
  const mayusculas = letras.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, '').length;
  if (mayusculas / letras.length < 0.75) return titulo; // ya está bien escrito

  // Los nombres salen de dos lados: el cuerpo de la nota (que casi siempre
  // viene bien escrito) y la lista a mano de fuentes.mjs.
  const propios = new Map();
  for (const palabra of cuerpo.match(/[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{2,}/g) ?? []) {
    propios.set(palabra.toLowerCase(), palabra);
  }
  for (const nombre of NOMBRES_PROPIOS) {
    for (const palabra of nombre.split(' ')) {
      // "El Triunfo" y "Los Pinos" no pueden dejar suelto que "el" y "los"
      // llevan mayuscula: un titulo quedaba "por El dia del estudiante".
      if (ARTICULOS.has(palabra.toLowerCase())) continue;
      propios.set(palabra.toLowerCase(), palabra);
    }
  }

  const texto = titulo.toLowerCase()
    .replace(/(^|[.:¿?¡!"“«] *)([a-záéíóúñü])/g, (m, antes, letra) => antes + letra.toUpperCase());
  return texto.replace(/[a-záéíóúñü]{2,}/g, (p) => propios.get(p) ?? p);
}

function parsearScrape(html, fuente) {
  const vistos = new Set();
  const notas = [];
  const re = fuente.patronEnlace ?? /<a[^>]+href=["']([^"']*\/[a-z0-9][a-z0-9-]{12,}-\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].startsWith('http') ? m[1] : `${fuente.base}${m[1].startsWith('/') ? '' : '/'}${m[1]}`;
    // Algunas tarjetas traen bajada y título en encabezados separados
    // (<h3>bajada</h3><h2>título</h2>): si hay un <h2>, es el título real.
    const h2 = m[2].match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const titulo = sinEtiquetas(h2 ? h2[1] : m[2]);
    if (titulo.length < 25 || vistos.has(href)) continue;
    vistos.add(href);
    notas.push({
      titulo,
      enlace: href,
      fecha: new Date(),
      cuerpo: '',
      textoCompleto: false,
      imagen: '',
      categorias: [],
      fuenteId: fuente.id,
      medio: fuente.medio,
      alcance: fuente.alcance,
      oficial: false,
      seccionFuente: null,
      peso: fuente.peso,
      fechaEstimada: true,
    });
  }
  return notas;
}

// ------------------------------------------------- clasificación y semáforo

function esDeBalcarce(nota) {
  if (nota.alcance === 'local') return true;
  const texto = normalizar(`${nota.titulo} ${nota.cuerpo.slice(0, 600)}`);
  return PALABRAS_LOCALES.some((p) => contiene(texto, p));
}

/** ¿Nombra a alguien que en Balcarce se lee igual aunque la noticia sea de
 *  afuera? Messi, Colapinto, la Selección. Devuelve el nombre encontrado o
 *  null, para poder mostrar por qué entró. */
function figuraQueNombra(nota) {
  const texto = normalizar(`${nota.titulo} ${nota.cuerpo.slice(0, 400)}`);
  return FIGURAS.find((f) => contiene(texto, f)) ?? null;
}

function clasificar(nota) {
  const texto = normalizar(`${nota.titulo} ${nota.categorias.join(' ')} ${nota.cuerpo.slice(0, 400)}`);

  // 1. Automovilismo gana siempre: en Balcarce es sección propia, no un
  //    subtema de deportes, y aparece mezclado en cualquier feed.
  const fierros = REGLAS_SECCION.find((r) => r.seccion === 'Automovilismo');
  if (fierros.palabras.some((p) => contiene(texto, p))) return 'Automovilismo';

  // 2. Si la fuente ya viene separada por sección (las de Radio Gabal, Olé,
  //    Clarín Deportes), le creemos: es más confiable que adivinar.
  if (nota.seccionFuente) return nota.seccionFuente;

  // 3. Recién ahí, palabras clave.
  for (const regla of REGLAS_SECCION) {
    if (regla.palabras.some((p) => contiene(texto, p))) return regla.seccion;
  }
  if (nota.alcance === 'local') return 'Balcarce';
  if (nota.alcance === 'region') return 'Región';
  if (nota.alcance === 'provincia') return 'Provincia';
  return 'País';
}

function semaforo(nota, seccion) {
  const texto = normalizar(`${nota.titulo} ${nota.cuerpo.slice(0, 600)}`);
  for (const p of REGLAS_SEMAFORO.rojo) {
    if (contiene(texto, p)) return { color: 'rojo', motivo: `tema sensible: "${p}"` };
  }
  for (const p of REGLAS_SEMAFORO.amarillo) {
    if (contiene(texto, p)) return { color: 'amarillo', motivo: `necesita ojo humano: "${p}"` };
  }
  for (const p of REGLAS_SEMAFORO.promocional ?? []) {
    if (contiene(texto, p)) return { color: 'amarillo', motivo: `parece promoción, no noticia: "${p}"` };
  }
  if (nota.oficial) return { color: 'verde', motivo: 'comunicado oficial' };
  if (REGLAS_SEMAFORO.verdeSecciones.includes(seccion)) return { color: 'verde', motivo: `sección ${seccion}` };
  return { color: 'amarillo', motivo: 'sección general, sin regla verde' };
}

/** Deja el copete listo para publicar: le saca la firma del medio que casi
 *  todos pegan al final ("... | Diario La Vanguardia"), y lo descarta si es
 *  apenas el título repetido, que no le suma nada a nadie. */
function limpiarCopete(cuerpo, titulo, medio) {
  let t = (cuerpo ?? '').trim();
  if (!t) return '';
  // La firma del medio, con los separadores que usan: " | ", " - ", " :: ".
  t = t.replace(/\s*[|–—-]\s*[^|–—-]{0,40}$/u, (cola) => (
    normalizar(cola).includes(normalizar(medio).slice(0, 10)) ? '' : cola
  ));
  t = t.replace(/^\s*[-–—]\s*/, '').trim();
  // Si arranca repitiendo el título, se le saca esa parte.
  const nt = normalizar(titulo);
  if (normalizar(t).startsWith(nt)) t = t.slice(titulo.length).replace(/^\s*[-:.–—|]\s*/, '').trim();
  if (normalizar(t).length < 40) return '';
  return t.slice(0, 280);
}

function relevancia(nota, seccion, medios) {
  let p = nota.peso;
  if (esDeBalcarce(nota)) p += 25;
  // Sin fecha real no se premia la frescura: si no sabemos cuándo salió, no
  // puede competir con una nota que sí tiene hora.
  const horas = nota.fechaEstimada ? 24 : (Date.now() - nota.fecha.getTime()) / 3600000;
  if (horas < 3) p += 25; else if (horas < 12) p += 15; else if (horas < 24) p += 8;
  if (medios > 1) p += 10 * (medios - 1);
  if (nota.imagen) p += 6;
  if (nota.textoCompleto) p += 4;
  // Que un medio nacional nombre a Balcarce es noticia en Balcarce.
  if (nota.nombraBalcarce) p += 22;
  // Una figura argentina no vale tanto como que nombren a Balcarce, pero
  // vale bastante más que una nota nacional cualquiera.
  if (nota.figura) p += 16;
  if (seccion === 'Automovilismo') p += 8; // Balcarce es tierra de fierros
  if (seccion === 'Servicios') p += 6;
  return Math.min(100, Math.round(p));
}

// ------------------------------------------------------------ datos fijos

const CIELO = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Niebla', 48: 'Niebla con escarcha', 51: 'Llovizna leve', 53: 'Llovizna',
  55: 'Llovizna intensa', 61: 'Lluvia leve', 63: 'Lluvia', 65: 'Lluvia fuerte',
  71: 'Nieve leve', 73: 'Nieve', 75: 'Nieve intensa', 80: 'Chaparrones',
  81: 'Chaparrones fuertes', 82: 'Chaparrones muy fuertes', 95: 'Tormenta',
  96: 'Tormenta con granizo', 99: 'Tormenta fuerte con granizo',
};

const RUMBOS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

// El clima es de las pocas cosas que se publican solas todos los días, así
// que no puede depender de un solo proveedor: el 18/09 Open-Meteo no
// respondió en un ciclo y la placa del clima quedó sin datos. Este es el
// respaldo: la API del Instituto Meteorológico de Noruega, gratis, sin
// clave, sólo pide identificarse con un User-Agent propio (lo exige su
// política de uso).
const SIMBOLOS_METNO = {
  clearsky: 'Despejado', fair: 'Mayormente despejado', partlycloudy: 'Parcialmente nublado',
  cloudy: 'Nublado', fog: 'Niebla', lightrain: 'Lluvia leve', rain: 'Lluvia',
  heavyrain: 'Lluvia fuerte', lightrainshowers: 'Chaparrones leves',
  rainshowers: 'Chaparrones', heavyrainshowers: 'Chaparrones fuertes',
  lightsnow: 'Nieve leve', snow: 'Nieve', heavysnow: 'Nieve intensa',
  sleet: 'Aguanieve', thunderstorm: 'Tormenta', rainandthunder: 'Lluvia con tormenta',
  heavyrainandthunder: 'Tormenta fuerte',
};

function cieloDeSimbolo(codigo = '') {
  // met.no devuelve cosas como "partlycloudy_day" o "rain_night".
  const base = codigo.replace(/_(day|night|polartwilight)$/, '');
  return SIMBOLOS_METNO[base] ?? 'Sin datos';
}

async function climaDeMetNo() {
  const url = 'https://api.met.no/weatherapi/locationforecast/2.0/compact'
    + `?lat=${BALCARCE.lat}&lon=${BALCARCE.lon}`;
  const j = JSON.parse(await traer(url, { agente: 'RadarBalcarce/0.1 (radarbalcarce.com.ar)' }));
  const serie = j.properties.timeseries;
  const ahora = serie[0];
  const det = ahora.data.instant.details;

  // met.no da una entrada por hora: se agrupan por día para sacar máxima,
  // mínima y probabilidad de lluvia, que es lo que usan las placas.
  const porDia = {};
  for (const punto of serie) {
    const dia = punto.time.slice(0, 10);
    const t = punto.data.instant.details.air_temperature;
    porDia[dia] ??= { temps: [], lluvia: 0, simbolo: null };
    porDia[dia].temps.push(t);
    const prob = punto.data.next_1_hours?.details?.probability_of_precipitation
      ?? punto.data.next_6_hours?.details?.probability_of_precipitation ?? 0;
    porDia[dia].lluvia = Math.max(porDia[dia].lluvia, prob);
    porDia[dia].simbolo ??= punto.data.next_6_hours?.summary?.symbol_code
      ?? punto.data.next_1_hours?.summary?.symbol_code;
  }

  const dias = Object.entries(porDia).slice(0, 4).map(([fecha, d]) => ({
    fecha,
    dia: DIAS_CORTOS[new Date(`${fecha}T12:00:00`).getDay()],
    max: Math.round(Math.max(...d.temps)),
    min: Math.round(Math.min(...d.temps)),
    lluvia: Math.round(d.lluvia),
    cielo: cieloDeSimbolo(d.simbolo ?? ''),
  }));

  return {
    ahora: {
      temp: Math.round(det.air_temperature),
      // met.no no da sensación térmica: se usa la temperatura real antes
      // que inventar un número.
      sensacion: Math.round(det.air_temperature),
      humedad: Math.round(det.relative_humidity),
      // Viene en metros por segundo, hay que pasarlo a km/h.
      viento: Math.round(det.wind_speed * 3.6),
      rumbo: RUMBOS[Math.round(det.wind_from_direction / 45) % 8],
      cielo: cieloDeSimbolo(ahora.data.next_1_hours?.summary?.symbol_code ?? ''),
    },
    dias,
    fuente: 'MET Noruega',
  };
}

async function traerClima() {
  try {
    return await climaDeOpenMeteo();
  } catch (e) {
    log(`  \x1b[33maviso\x1b[0m Open-Meteo falló (${e.message}), probando el respaldo`);
    return climaDeMetNo();
  }
}

async function climaDeOpenMeteo() {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${BALCARCE.lat}&longitude=${BALCARCE.lon}`
    + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day'
    + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code'
    + `&timezone=${encodeURIComponent(BALCARCE.tz)}&forecast_days=4`;
  const j = JSON.parse(await traer(url));
  const rumbos = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  return {
    ahora: {
      temp: Math.round(j.current.temperature_2m),
      sensacion: Math.round(j.current.apparent_temperature),
      humedad: j.current.relative_humidity_2m,
      viento: Math.round(j.current.wind_speed_10m),
      rumbo: rumbos[Math.round(j.current.wind_direction_10m / 45) % 8],
      cielo: CIELO[j.current.weather_code] ?? 'Sin datos',
      esDeDia: j.current.is_day === 1,
    },
    dias: j.daily.time.map((f, i) => ({
      fecha: f,
      dia: dias[new Date(`${f}T12:00:00`).getDay()],
      max: Math.round(j.daily.temperature_2m_max[i]),
      min: Math.round(j.daily.temperature_2m_min[i]),
      lluvia: j.daily.precipitation_probability_max[i],
      cielo: CIELO[j.daily.weather_code[i]] ?? '',
    })),
    fuente: 'Open-Meteo',
  };
}

// El Colegio de Farmacéuticos publica el cronograma del mes en texto plano,
// en un Google Sites. El formato real es:
//   "VIERNES 11 BENITES SABADO 12 SAN ANTONIO - MARIOLI DOMINGO 13 ..."
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_RE = 'LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO';

// El cronograma sólo trae el apellido de la farmacia. La dirección, que es lo
// que la gente necesita a las once de la noche, está en otra página del mismo
// Colegio: "Nombre · dirección · teléfono", todo seguido.
async function traerDirectorioFarmacias() {
  const texto = sinEtiquetas(await traer('https://www.colbalcarce.com/farmacias-de-balcarce'));
  // El título "Farmacias de Balcarce" se repite en el menú: el que interesa es
  // el último, el que encabeza la lista. Si se corta antes, la primera farmacia
  // se mezcla con el título y queda sin dirección.
  const titulo = 'Farmacias de Balcarce';
  const recorte = texto.slice(texto.lastIndexOf(titulo) + titulo.length);
  const re = /([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]*(?:\s+(?:de\s+|del\s+|la\s+)?[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ]*)?)\s+((?:Av\.|Calle|Ruta)[^\d]*\d[^]*?)\s+((?:\d{2}-\d{4,6})|(?:15-\d{6}))/g;
  const directorio = {};
  let m;
  while ((m = re.exec(recorte)) !== null) {
    directorio[normalizar(m[1])] = {
      nombre: m[1].trim(),
      direccion: m[2].replace(/\s+/g, ' ').trim(),
      telefono: m[3],
    };
  }
  return directorio;
}

async function traerFarmacias() {
  const html = await traer('https://www.colbalcarce.com/');
  const texto = sinEtiquetas(html);
  const directorio = await traerDirectorioFarmacias().catch(() => ({}));

  // Mes y año del cronograma publicado.
  const cab = texto.match(new RegExp(`(${MESES.join('|')})\\s*,?\\s*(20\\d\\d)`, 'i'));
  const mes = cab ? MESES.indexOf(cab[1].toLowerCase()) + 1 : null;
  const anio = cab ? +cab[2] : null;

  const turnos = [];
  const re = new RegExp(`(${DIAS_RE})\\s+(\\d{1,2})\\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9'’.\\- ]*?)(?=\\s+(?:${DIAS_RE})\\s+\\d|\\s+Recordamos|\\s+Turnos|\\s*$)`, 'gi');
  let m;
  while ((m = re.exec(texto)) !== null) {
    const nombres = m[3].trim().split(/\s+-\s+/).map((s) => s.trim()).filter((s) => s.length > 2);
    if (!nombres.length) continue;
    turnos.push({
      dia: +m[2],
      diaSemana: m[1].toUpperCase(),
      farmacias: nombres,
      // Cada nombre del cronograma se busca en el directorio para sumarle
      // dirección y teléfono. Si alguno no aparece, queda sin dirección y el
      // panel lo avisa en vez de inventarla.
      detalle: nombres.map((n) => directorio[normalizar(n)]
        ?? { nombre: n, direccion: null, telefono: null }),
      fecha: mes && anio ? `${anio}-${String(mes).padStart(2, '0')}-${String(+m[2]).padStart(2, '0')}` : null,
    });
  }

  // Control de calidad: el cronograma tiene que llegar hasta fin de mes.
  const hoy = new Date();
  const ultimoDia = turnos.length ? Math.max(...turnos.map((t) => t.dia)) : 0;
  const diasEnMes = mes ? new Date(anio, mes, 0).getDate() : 31;
  const avisos = [];
  if (mes && mes !== hoy.getMonth() + 1) avisos.push(`el cronograma publicado es de ${MESES[mes - 1]}, no del mes en curso`);
  if (ultimoDia && ultimoDia < diasEnMes) avisos.push(`sólo llega hasta el día ${ultimoDia} de ${diasEnMes}: hay que recargarlo`);

  // Una farmacia sin dirección se publica igual, pero avisando: es preferible
  // dar el nombre solo a inventar una calle.
  const sinDireccion = [...new Set(turnos.flatMap((t) => t.detalle)
    .filter((f) => !f.direccion).map((f) => f.nombre))];
  if (sinDireccion.length) {
    avisos.push(`sin dirección en el directorio del Colegio: ${sinDireccion.join(', ')}. Hay que cargarla a mano`);
  }

  // Cruce con otras fuentes que también publican farmacia de turno. Si dos
  // fuentes independientes coinciden, el dato está confirmado de verdad; si
  // no coinciden, mejor saberlo antes de publicar que después de un llamado
  // de un vecino enojado.
  const cruce = await cruzarFarmacias(turnos).catch((e) => ({ error: e.message, fuentes: [] }));
  if (cruce.discrepancias?.length) {
    cruce.discrepancias.forEach((d) => avisos.push(d));
  }

  return {
    mes, anio, turnos, avisos, cruce, textoCrudo: texto.slice(0, 1800),
  };
}

// La Vanguardia (diario de Balcarce) publica hoy y mañana con dirección
// incluida, sin necesidad de cruzar con el directorio. Sirve de segunda
// fuente independiente del Colegio.
async function turnosDeLaVanguardia() {
  const texto = sinEtiquetas(await traer('https://www.diariolavanguardia.com/farmacias/'));
  const recorte = texto.slice(texto.indexOf('Farmacias de turno'));
  const re = /(\d{1,2})\s+Farmacia:\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ' ]*?)\s+((?:Av\.|Calle|Ruta)[^\d]*\d[^]*?)(?=\s+\d{1,2}\s+Farmacia:|\s+Inmobiliarias|\s*$)/g;
  const turnos = [];
  let m;
  while ((m = re.exec(recorte)) !== null) {
    turnos.push({ dia: +m[1], nombre: m[2].trim(), direccion: m[3].replace(/\s+/g, ' ').trim() });
  }
  return turnos;
}

// Radio Gabal publica el cronograma semanal en su propia nota, como texto.
async function turnosDeGabal() {
  const url = 'https://www.radiogabal.com.ar/index.php/comunidad/farmacias-de-turno-en-balcarce-cronograma-de-la-semana';
  const texto = sinEtiquetas(await traer(url));
  const turnos = [];
  const re = new RegExp(`(${DIAS_RE})\\s+(\\d{1,2})\\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9'’.\\- ]{2,40}?)(?=\\s+(?:${DIAS_RE})\\s+\\d|\\s*$)`, 'gi');
  let m;
  while ((m = re.exec(texto)) !== null) turnos.push({ dia: +m[2], nombre: m[3].trim() });
  return turnos;
}

async function cruzarFarmacias(turnosColegio) {
  const hoy = new Date().getDate();
  const nuestraDeHoy = turnosColegio.find((t) => t.dia === hoy);
  const nombresNuestros = new Set((nuestraDeHoy?.farmacias ?? []).map((n) => normalizar(n)));

  const fuentes = [];
  const discrepancias = [];

  const [vang, gabal] = await Promise.allSettled([turnosDeLaVanguardia(), turnosDeGabal()]);

  if (vang.status === 'fulfilled') {
    const deHoy = vang.value.filter((t) => t.dia === hoy);
    fuentes.push({ nombre: 'La Vanguardia', estado: 'ok', turnosHoy: deHoy.map((t) => t.nombre) });
    const coincide = deHoy.some((t) => nombresNuestros.has(normalizar(t.nombre)));
    if (deHoy.length && !coincide) {
      discrepancias.push(`La Vanguardia dice que hoy es ${deHoy.map((t) => t.nombre).join(' y ')}, `
        + `el Colegio dice ${[...nombresNuestros].join(' y ') || 'nada'}: revisar antes de publicar`);
    }
  } else {
    fuentes.push({ nombre: 'La Vanguardia', estado: 'error', error: vang.reason?.message });
  }

  if (gabal.status === 'fulfilled') {
    const deHoy = gabal.value.filter((t) => t.dia === hoy);
    fuentes.push({ nombre: 'Radio Gabal', estado: 'ok', turnosHoy: deHoy.map((t) => t.nombre) });
    const coincide = deHoy.some((t) => nombresNuestros.has(normalizar(t.nombre)));
    if (deHoy.length && !coincide) {
      discrepancias.push(`Radio Gabal dice que hoy es ${deHoy.map((t) => t.nombre).join(' y ')}, `
        + `el Colegio dice ${[...nombresNuestros].join(' y ') || 'nada'}: revisar antes de publicar`);
    }
  } else {
    fuentes.push({ nombre: 'Radio Gabal', estado: 'error', error: gabal.reason?.message });
  }

  return { fuentes, discrepancias, confirmado: fuentes.some((f) => f.estado === 'ok') && !discrepancias.length };
}

// ------------------------------------------------------------------ correr

export async function ingestar({
  fuentes = null, silencioso = false, escribirArchivos = false,
} = {}) {
  log = silencioso ? () => {} : console.log;
  const lista = (fuentes ?? TODAS_LAS_FUENTES).filter((f) => f.activa !== false);
  const t0 = Date.now();
  log('\n\x1b[1mRADAR BALCARCE · ingesta de prueba\x1b[0m');
  log(`${new Date().toLocaleString('es-AR', { timeZone: BALCARCE.tz })}\n`);

  // 1. Fuentes de noticias
  log('\x1b[1mFUENTES\x1b[0m');
  const resultados = await Promise.allSettled(lista.map(async (f) => {
    const cuerpo = await traer(f.url);
    let notas = f.tipo === 'scrape' ? parsearScrape(cuerpo, f) : parsearFeed(cuerpo, f);
    // Raspar la portada da títulos sin bajada ni fecha: hay que entrar a cada nota.
    if (f.tipo === 'scrape') await ampliar(notas);
    // De las fuentes de afuera entra lo que nombra a Balcarce (siempre) y unas
    // pocas recientes para tener sección País sin tapar lo local.
    if (f.alcance !== 'local') {
      const nuestras = notas.filter(esDeBalcarce);
      nuestras.forEach((n) => { n.nombraBalcarce = true; });
      // Las que nombran a una figura entran aunque no digan Balcarce: son
      // las que la gente lee igual. Van marcadas para que el puntaje las
      // suba y para poder explicar en el panel por qué están.
      const conFigura = notas.filter((n) => !nuestras.includes(n) && figuraQueNombra(n));
      conFigura.forEach((n) => { n.figura = figuraQueNombra(n); });
      const resto = notas.filter((n) => !nuestras.includes(n) && !conFigura.includes(n))
        .sort((a, b) => b.fecha - a.fecha)
        .slice(0, f.maxItems ?? 5);
      notas = [...nuestras, ...conFigura, ...resto];
    }
    return { fuente: f, notas };
  }));

  let todas = [];
  const estadoFuentes = [];
  resultados.forEach((r, i) => {
    const f = lista[i];
    if (r.status === 'fulfilled') {
      const { notas } = r.value;
      const ultima = notas.length
        ? notas.map((n) => n.fecha).sort((a, b) => b - a)[0] : null;
      const frescura = ultima && !notas[0].fechaEstimada ? haceCuanto(ultima) : 'sin fecha';
      log(`  \x1b[32mok\x1b[0m   ${f.nombre.padEnd(28)} ${String(notas.length).padStart(3)} notas   última ${frescura}`);
      estadoFuentes.push({ id: f.id, nombre: f.nombre, estado: 'ok', notas: notas.length, frescura });
      todas = todas.concat(notas);
    } else {
      log(`  \x1b[31mfalla\x1b[0m ${f.nombre.padEnd(28)} ${r.reason?.message ?? r.reason}`);
      estadoFuentes.push({ id: f.id, nombre: f.nombre, estado: 'error', error: String(r.reason?.message ?? r.reason) });
    }
  });

  // 2. Agrupar la misma noticia contada por varios medios
  const grupos = [];
  for (const nota of todas.sort((a, b) => b.fecha - a.fecha)) {
    const g = grupos.find((x) => parecido(x.principal.titulo, nota.titulo) >= 0.55);
    if (g) {
      if (!g.medios.includes(nota.medio)) g.medios.push(nota.medio);
      g.tambien.push(nota);
      // La portada de El Diario corta los títulos con puntos suspensivos:
      // si otro medio trae el título entero, nos quedamos con ese.
      const cortado = /[.…]{3}$|…$/.test(g.principal.titulo);
      if (cortado && !/[.…]{3}$|…$/.test(nota.titulo) && nota.titulo.length > 25) {
        g.principal.titulo = nota.titulo;
      }
      if (g.principal.fechaEstimada && !nota.fechaEstimada) {
        g.principal.fecha = nota.fecha;
        g.principal.fechaEstimada = false;
      }
      if (!g.principal.imagen && nota.imagen) g.principal.imagen = nota.imagen;
      if (!g.principal.textoCompleto && nota.textoCompleto) {
        g.principal.cuerpo = nota.cuerpo;
        g.principal.textoCompleto = true;
      }
    } else {
      grupos.push({ principal: nota, medios: [nota.medio], tambien: [] });
    }
  }

  // 3. Clasificar, semáforo y relevancia
  const portada = grupos.map((g) => {
    const seccion = clasificar(g.principal);
    const sem = semaforo(g.principal, seccion);
    return {
      id: idDe(g.principal.enlace),
      titulo: sentenciar(g.principal.titulo, g.principal.cuerpo),
      enlace: g.principal.enlace,
      fecha: g.principal.fecha.toISOString(),
      cuando: g.principal.fechaEstimada ? 'sin fecha en la fuente' : haceCuanto(g.principal.fecha),
      medio: g.principal.medio,
      medios: g.medios,
      seccion,
      semaforo: sem.color,
      motivo: sem.motivo,
      relevancia: relevancia(g.principal, seccion, g.medios.length),
      imagen: g.principal.imagen || null,
      resumenFuente: limpiarCopete(g.principal.cuerpo, g.principal.titulo, g.principal.medio),
      local: esDeBalcarce(g.principal),
      figura: g.principal.figura ?? null,
      alcance: g.principal.alcance,
      nombraBalcarce: !!g.principal.nombraBalcarce,
    };
  }).sort((a, b) => b.relevancia - a.relevancia);

  // 4. Clima y farmacias
  let clima = null; let farmacias = null;
  try { clima = await traerClima(); console.log('\n\x1b[1mCLIMA\x1b[0m\n  \x1b[32mok\x1b[0m   Open-Meteo responde'); } catch (e) { console.log(`\n  \x1b[31mfalla\x1b[0m clima: ${e.message}`); }
  try { farmacias = await traerFarmacias(); console.log(`\x1b[1m\nFARMACIAS\x1b[0m\n  ${farmacias.turnos.length ? '\x1b[32mok\x1b[0m  ' : '\x1b[33maviso\x1b[0m'} ${farmacias.turnos.length} turnos reconocidos en colbalcarce.com`); } catch (e) { console.log(`  \x1b[31mfalla\x1b[0m farmacias: ${e.message}`); }

  // 5. Resumen en pantalla
  const porSeccion = {};
  for (const n of portada) porSeccion[n.seccion] = (porSeccion[n.seccion] ?? 0) + 1;
  const porSemaforo = { verde: 0, amarillo: 0, rojo: 0 };
  for (const n of portada) porSemaforo[n.semaforo] += 1;

  log(`\n\x1b[1mRESULTADO\x1b[0m`);
  log(`  ${todas.length} notas leídas → ${portada.length} historias únicas`);
  log(`  semáforo: \x1b[32m${porSemaforo.verde} verdes\x1b[0m · \x1b[33m${porSemaforo.amarillo} amarillas\x1b[0m · \x1b[31m${porSemaforo.rojo} rojas\x1b[0m`);
  log(`  secciones: ${Object.entries(porSeccion).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} ${n}`).join(' · ')}`);

  log(`\n\x1b[1mLO QUE IRÍA A LA PORTADA\x1b[0m`);
  const color = { verde: '\x1b[32m', amarillo: '\x1b[33m', rojo: '\x1b[31m' };
  for (const n of portada.slice(0, 12)) {
    const marca = `${color[n.semaforo]}●\x1b[0m`;
    log(`  ${marca} [${String(n.relevancia).padStart(3)}] ${n.titulo.slice(0, 82)}`);
    log(`        ${n.seccion} · ${n.medios.join(' + ')} · ${n.cuando}${n.medios.length > 1 ? ' · \x1b[1mcoinciden varios medios\x1b[0m' : ''}`);
  }

  const desdeAfuera = portada.filter((n) => n.nombraBalcarce);
  if (desdeAfuera.length) {
    log('\n\x1b[1mNOS NOMBRAN DESDE AFUERA\x1b[0m');
    for (const n of desdeAfuera.slice(0, 5)) {
      log(`  · ${n.titulo.slice(0, 84)}\n      ${n.medio} · ${n.cuando}`);
    }
  }

  if (clima) {
    const c = clima.ahora;
    log(`\n\x1b[1mCLIMA AHORA\x1b[0m\n  ${c.temp}° · ${c.cielo} · sensación ${c.sensacion}° · viento ${c.rumbo} ${c.viento} km/h · humedad ${c.humedad}%`);
    log(`  ${clima.dias.map((d) => `${d.dia} ${d.max}°/${d.min}°`).join('  ')}`);
  }

  if (farmacias?.turnos.length) {
    const hoy = new Date().getDate();
    const deHoy = farmacias.turnos.find((t) => t.dia === hoy);
    log('\n\x1b[1mFARMACIA DE TURNO\x1b[0m');
    log(`  hoy (día ${hoy}): ${deHoy ? `\x1b[1m${deHoy.farmacias.join(' y ')}\x1b[0m` : 'no figura en el cronograma'}`);
    const prox = farmacias.turnos.filter((t) => t.dia > hoy).slice(0, 4);
    if (prox.length) console.log(`  siguen: ${prox.map((t) => `${t.dia} ${t.farmacias.join('/')}`).join(' · ')}`);
    for (const a of farmacias.avisos) console.log(`  \x1b[33maviso\x1b[0m ${a}`);
  }

  // 6. Archivos de salida
  const datos = {
    generado: new Date().toISOString(),
    fuentes: estadoFuentes,
    clima,
    farmacias: farmacias ? {
      mes: farmacias.mes, anio: farmacias.anio, turnos: farmacias.turnos, avisos: farmacias.avisos, cruce: farmacias.cruce,
    } : null,
    notas: portada,
  };
  if (escribirArchivos) {
    fs.mkdirSync(SALIDA, { recursive: true });
    fs.writeFileSync(path.join(SALIDA, 'portada.json'), JSON.stringify(datos, null, 2), 'utf8');
    if (farmacias) fs.writeFileSync(path.join(SALIDA, 'farmacias-crudo.txt'), farmacias.textoCrudo, 'utf8');
    fs.writeFileSync(path.join(SALIDA, 'preview.html'), armarPreview(datos), 'utf8');
    log('\n  Escrito: salida/portada.json · salida/preview.html · salida/farmacias-crudo.txt');
  }
  log(`  Listo en ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
  return datos;
}

// ------------------------------------------------------------- vista previa

function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function armarPreview(d) {
  const puntos = { verde: '#16615B', amarillo: '#C99A16', rojo: '#A8371F' };
  const nota = (n) => `
    <article class="nota">
      <div class="chapa">
        <span class="punto" style="background:${puntos[n.semaforo]}"></span>
        <span class="secc">${esc(n.seccion)}</span>
        <span class="sep">·</span>
        <span>${esc(n.medios.join(' + '))}</span>
        <span class="sep">·</span>
        <span>${esc(n.cuando)}</span>
        <span class="rel">${n.relevancia}</span>
      </div>
      <h3><a href="${esc(n.enlace)}" target="_blank" rel="noopener">${esc(n.titulo)}</a></h3>
      ${n.resumenFuente ? `<p>${esc(n.resumenFuente)}…</p>` : ''}
    </article>`;

  const secciones = [...new Set(d.notas.map((n) => n.seccion))];
  const c = d.clima?.ahora;

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Radar Balcarce · prueba de ingesta</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<style>
  :root { --tinta:#14161A; --papel:#F7F5EF; --rojo:#A8371F; --verde:#16615B; --linea:#D5CFC0; --suave:#4A4F4B; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--papel); color:var(--tinta); font-family:"IBM Plex Sans",system-ui,sans-serif; }
  header { background:var(--tinta); color:var(--papel); padding:22px 32px; }
  h1 { margin:0; font-family:Fraunces,Georgia,serif; font-size:34px; font-weight:700; letter-spacing:-.02em; }
  h1 span { color:#E8A33C; }
  .sub { margin-top:6px; font-size:13px; color:#BDC1B8; }
  .barra { display:flex; gap:10px; flex-wrap:wrap; padding:14px 32px; background:#fff; border-bottom:1px solid var(--linea); }
  .pill { background:var(--papel); border:1px solid var(--linea); border-radius:20px; padding:6px 12px; font-size:12px; font-weight:600; }
  .pill.err { background:#FBF3EE; border-color:#E8CFC5; color:#8C2D18; }
  main { display:grid; grid-template-columns:1fr 330px; gap:28px; padding:24px 32px 60px; align-items:start; }
  .nota { border-bottom:1px solid var(--linea); padding:14px 0; }
  .chapa { display:flex; align-items:center; gap:8px; font-size:11px; font-weight:600; color:var(--suave); }
  .punto { width:9px; height:9px; border-radius:50%; display:inline-block; }
  .secc { text-transform:uppercase; letter-spacing:.06em; color:var(--rojo); }
  .sep { color:var(--linea); }
  .rel { margin-left:auto; background:var(--papel); border:1px solid var(--linea); border-radius:3px; padding:2px 7px; }
  h3 { margin:7px 0 0; font-family:Fraunces,Georgia,serif; font-size:20px; line-height:1.25; font-weight:600; }
  h3 a { color:inherit; text-decoration:none; }
  h3 a:hover { color:var(--rojo); }
  .nota p { margin:6px 0 0; font-size:13px; line-height:1.5; color:var(--suave); }
  aside section { background:#fff; border:1px solid var(--linea); border-radius:6px; padding:16px; margin-bottom:16px; }
  aside h2 { margin:0 0 10px; font-family:Fraunces,Georgia,serif; font-size:18px; }
  .temp { font-family:Fraunces,Georgia,serif; font-size:44px; font-weight:700; line-height:1; }
  .dias { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-top:12px; text-align:center; }
  .dias div { background:var(--papel); border-radius:4px; padding:8px 2px; font-size:12px; }
  .dias b { display:block; font-size:10px; color:var(--suave); text-transform:uppercase; }
  code { background:var(--papel); padding:1px 5px; border-radius:3px; font-size:12px; }
</style></head>
<body>
<header>
  <h1>Radar <span>Balcarce</span></h1>
  <div class="sub">Prueba de ingesta real · ${new Date(d.generado).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })} · ${d.notas.length} historias únicas</div>
</header>
<div class="barra">
  ${d.fuentes.map((f) => `<span class="pill ${f.estado === 'ok' ? '' : 'err'}">${esc(f.nombre)} ${f.estado === 'ok' ? `· ${f.notas}` : '· error'}</span>`).join('')}
</div>
<main>
  <div>
    ${secciones.map((s) => `
      <h2 style="font-family:Fraunces,Georgia,serif;font-size:24px;margin:26px 0 4px;border-bottom:2px solid var(--tinta);padding-bottom:6px;">${esc(s)}</h2>
      ${d.notas.filter((n) => n.seccion === s).map(nota).join('')}
    `).join('')}
  </div>
  <aside>
    ${c ? `<section>
      <h2>El clima ahora</h2>
      <div class="temp">${c.temp}°</div>
      <div style="font-size:13px;color:var(--suave);margin-top:6px;">${esc(c.cielo)} · sensación ${c.sensacion}°<br>Viento ${esc(c.rumbo)} ${c.viento} km/h · humedad ${c.humedad}%</div>
      <div class="dias">${d.clima.dias.map((x) => `<div><b>${esc(x.dia)}</b>${x.max}°/${x.min}°<br><span style="color:var(--suave)">${x.lluvia}%</span></div>`).join('')}</div>
      <div style="margin-top:10px;font-size:11px;color:var(--suave)">Fuente: Open-Meteo</div>
    </section>` : ''}
    <section>
      <h2>Farmacias de turno</h2>
      ${d.farmacias?.turnos?.length
    ? `<div style="font-size:13px;line-height:1.8">${d.farmacias.turnos.filter((t) => t.dia >= new Date().getDate()).slice(0, 8).map((t) => `<span style="color:var(--suave)">${esc(t.diaSemana)} ${t.dia}</span> · <b>${esc(t.farmacias.join(' y '))}</b>`).join('<br>')}</div>
       <div style="margin-top:10px;font-size:11px;color:var(--suave)">De 9 de la mañana a 9 del día siguiente · Colegio de Farmacéuticos de Balcarce</div>
       ${d.farmacias.avisos.map((a) => `<div style="margin-top:8px;background:#FDF3E2;color:#6B5210;border-radius:4px;padding:8px 10px;font-size:12px">${esc(a)}</div>`).join('')}`
    : '<div style="font-size:13px;color:var(--suave)">El cronograma está en la página del Colegio, pero el formato todavía no se reconoce automáticamente. Mirá <code>salida/farmacias-crudo.txt</code> para ajustar el lector.</div>'}
    </section>
    <section>
      <h2>Qué mirar acá</h2>
      <div style="font-size:13px;line-height:1.6;color:var(--suave)">
        El número de la derecha es la relevancia calculada. El punto es el semáforo:
        verde sale solo, amarillo espera aprobación, rojo no se publica.
        Cuando dice <b>dos medios</b> es la misma noticia contada por los dos y agrupada en una sola.
      </div>
    </section>
  </aside>
</main>
</body></html>`;
}

// Sólo corre cuando se lo invoca directo; si lo importa probar.mjs, no.
const esEjecutable = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (esEjecutable) {
  ingestar({ escribirArchivos: true }).catch((e) => { console.error(e); process.exit(1); });
}

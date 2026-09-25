// Ingesta de Radar Balcarce — prueba local, sin dependencias ni cuentas.
//   node ingesta.mjs
// Deja los resultados en ./salida (portada.json y preview.html).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NOMBRES_PROPIOS, FIGURAS, TEMAS, FARMACIAS_A_MANO, PISO_DE_AFUERA, PISO_POR_DEFECTO, CUPO_DE_AFUERA, CUPO_POR_DEFECTO, BALCARCE, FUENTES, FUENTES_NACIONALES, PALABRAS_LOCALES, PALABRAS_ZONA, REGLAS_SECCION, AMARILLO_MENORES, REGLAS_SEMAFORO, MOTIVO_COTIZACION,
} from './fuentes.mjs';
import { diaDeTurno, fechaEnBalcarce } from './utiles.mjs';

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

/** El enlace a la PÁGINA de una entrada de Atom: el <link rel="alternate">
 *  de tipo HTML, con los atributos en cualquier orden. Sin `rel`, Atom lo da
 *  por "alternate"; sin `type`, se lo toma como página. Vacío si no hay. */
export function enlaceAlternativo(xml) {
  for (const m of String(xml).matchAll(/<link\b[^>]*>/gi)) {
    const valor = (attr) => m[0].match(new RegExp(`\\s${attr}=["']([^"']*)["']`, 'i'))?.[1];
    const rel = (valor('rel') ?? 'alternate').toLowerCase();
    const tipo = (valor('type') ?? 'text/html').toLowerCase();
    const href = valor('href');
    if (href && rel === 'alternate' && tipo.includes('html')) return decodificar(href).trim();
  }
  return '';
}

export function normalizar(s = '') {
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
// De cuántas letras para arriba se permite que la palabra siga.
const SUFIJO_DESDE = 5;

/**
 * ¿Aparece esa palabra en el texto?
 *
 * Se permiten hasta tres letras de más al final para no tener que escribir
 * todas las formas de cada una: "granizo" encuentra "granizos", "denuncia"
 * encuentra "denunciado".
 *
 * Con palabras cortas eso se vuelve peligroso. "gol" encontraba "golpe", y
 * por eso "Los extremismos dan un doble golpe en Alemania" salió publicada
 * en Deportes. De cuatro letras para abajo se exige la palabra entera.
 */
function contiene(textoNormalizado, palabra) {
  let re = CACHE_RE.get(palabra);
  if (!re) {
    const p = normalizar(palabra).replace(/\s+/g, '\\s+');
    const cola = p.length >= SUFIJO_DESDE ? '\\w{0,3}' : '';
    re = new RegExp(`\\b${p}${cola}\\b`);
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
    // En Atom, el primer enlace de la entrada puede no ser la página. Blogger
    // (Infórmese Primero) pone primero la entrada del feed, que es XML, y la
    // nota va en <link rel="alternate" type="text/html">: hasta el 25/09 el
    // lector veía el XML en el desplegable de fuentes. Ahora el enlace es la
    // página, y el primero se guarda aparte como `enlaceFeed`: con él se
    // sigue calculando el identificador de la nota (no cambia el de ninguna
    // ya publicada o decidida) y de ahí se baja el texto completo, que en
    // Blogger viene entero adentro de la entrada (ingesta/articulo.mjs).
    let enlaceFeed = '';
    if (esAtom) {
      const primero = (atributo(b, 'link', 'href') || etiqueta(b, 'id')).trim();
      enlace = enlaceAlternativo(b) || primero;
      if (primero && primero !== enlace.trim()) enlaceFeed = primero;
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
      ...(enlaceFeed ? { enlaceFeed } : {}),
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

// Las letras del castellano, para poder pedir "palabra entera". El \b de
// las expresiones regulares no sirve acá: para JavaScript la "á" no es una
// letra, así que \bBalcarce\b y \bBalcarcé\b se comportan distinto.
const PALABRA_CON_MAYUSCULA = /(?<![A-Za-zÁÉÍÓÚÑÜáéíóúñü])[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{2,}(?![A-Za-zÁÉÍÓÚÑÜáéíóúñü])/gu;
const PALABRA_SUELTA = /(?<![A-Za-zÁÉÍÓÚÑÜáéíóúñü])[a-záéíóúñü]{2,}(?![A-Za-zÁÉÍÓÚÑÜáéíóúñü])/gu;

function sentenciar(titulo, cuerpo = '') {
  const letras = titulo.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '');
  if (letras.length < 8) return titulo;
  const mayusculas = letras.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, '').length;
  if (mayusculas / letras.length < 0.75) return titulo; // ya está bien escrito

  // Los nombres salen de dos lados: el cuerpo de la nota (que casi siempre
  // viene bien escrito) y la lista a mano de fuentes.mjs.
  const propios = new Map();
  // Una palabra con mayúscula al principio de una oración no prueba nada:
  // "Durante la sesión…" no convierte a "durante" en nombre propio. Sólo
  // cuentan las que aparecen con mayúscula en medio de una frase.
  for (const m of cuerpo.matchAll(PALABRA_CON_MAYUSCULA)) {
    const antes = cuerpo.slice(0, m.index).trimEnd();
    if (!antes || /[.!?:;¡¿"«»]$/u.test(antes)) continue;
    propios.set(m[0].toLowerCase(), m[0]);
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
  return texto.replace(PALABRA_SUELTA, (p) => propios.get(p) ?? p);
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
    // Algunos medios le ponen una etiqueta fija adelante a cada título
    // ("Argentina: …" en Argenpapa): `fuente.prefijoTitulo` la saca.
    let titulo = sinEtiquetas(h2 ? h2[1] : m[2]);
    if (fuente.prefijoTitulo && titulo.startsWith(fuente.prefijoTitulo)) titulo = titulo.slice(fuente.prefijoTitulo.length).trim();
    // Un titular no pasa de cien caracteres: el más largo que publicaron
    // las 24 fuentes hoy tiene 99 y la mediana es 53. Lo que se pasa no es
    // una noticia, es un bloque de texto de la página. El 20/09 salió
    // publicado "El único diario de Balcarce de aparición en papel y en
    // formato digital…", que es el "quiénes somos" de El Diario.
    if (titulo.length < 25 || titulo.length > 140 || vistos.has(href)) continue;
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
      oficial: !!fuente.oficial,
      seccionFuente: fuente.seccion ?? null,
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

/** ¿Toca la zona sin nombrar a Balcarce? La ruta 226, el sudeste, la papa.
 *  Coincidencia exacta, sin la cola de `contiene` (que acepta hasta tres
 *  letras más para los plurales): con ella "ruta 2260" era "ruta 226". */
const RE_ZONA = PALABRAS_ZONA.map((p) => new RegExp(`\\b${normalizar(p).replace(/\s+/g, '\\s+')}\\b`));
function tocaLaZona(nota) {
  const texto = normalizar(`${nota.titulo} ${(nota.cuerpo ?? '').slice(0, 600)}`);
  return RE_ZONA.some((re) => re.test(texto));
}

/** ¿Nombra a alguien que en Balcarce se lee igual aunque la noticia sea de
 *  afuera? Messi, Colapinto, la Selección. Devuelve el nombre encontrado o
 *  null, para poder mostrar por qué entró. */
function figuraQueNombra(nota) {
  const texto = normalizar(`${nota.titulo} ${nota.cuerpo.slice(0, 400)}`);
  return FIGURAS.find((f) => contiene(texto, f)) ?? null;
}

// Palabras que adentro del deporte significan una cosa y afuera otra.
//
// Son las que más notas mandaron a la sección equivocada:
//
//   · "partido" — en la provincia de Buenos Aires un partido es un municipio,
//     y en castellano común es también un partido político. Mandó a Deportes
//     "Violento robo en la puerta de un kiosco" y "Recordaron a Domingo
//     Teruggi a 50 años de su asesinato".
//   · "descenso" — "un marcado descenso de las temperaturas" terminó en
//     Deportes.
//   · "tenis" — "piedras del tamaño de pelotas de tenis", también.
//   · "muestra" y "exposición" — "La EducoAgro muestra el potencial de
//     Balcarce" cayó en Cultura.
//   · "paso" — son las elecciones PASO, pero también el verbo pasar.
//
// No se borran, porque cuando no hay nada mejor sí aciertan: "Boca le ganó a
// San Lorenzo" no tiene otra palabra que la delate. Lo que hacen es esperar:
// deciden sólo si ninguna palabra firme encontró nada.
const PALABRAS_DEBILES = new Set([
  'partido', 'descenso', 'tenis', 'copa', 'liga', 'gol',
  'muestra', 'exposicion', 'exposición', 'paso', 'box',
  // Economía y Tecnología (21/09). Con "gana la palabra más larga", una
  // palabra genérica y larga le ganaba a una corta y precisa: "Rompieron la
  // vidriera y se llevaron herramientas" cayó en Economía por decir
  // "comerciantes", que le ganaba a "robo". Estas sólo deciden desde el
  // titular, y sólo si no hay nada más firme.
  'comerciantes', 'comercio local', 'precios', 'ahorro', 'inversiones', 'mercados',
  'bonos', 'finanzas', 'empresas en mora', 'salarios', 'deuda',
  'ia', 'claude', 'gemini', 'copilot', 'robot', 'robots', 'software', 'startup',
  'smartphone', 'chatbot',
]);

/** Los temas de larga duración que toca esta nota. Suele ser ninguno. */
function temasDe(nota) {
  const texto = normalizar(`${nota.titulo} ${nota.cuerpo.slice(0, 600)}`);
  return TEMAS.filter((t) => t.palabras.some((p) => contiene(texto, p))).map((t) => t.ranura);
}

function clasificar(nota) {
  const texto = normalizar(`${nota.titulo} ${nota.categorias.join(' ')} ${nota.cuerpo.slice(0, 400)}`);
  // Una palabra débil sólo decide si está en el TITULAR. En el cuerpo
  // aparece de casualidad: "Recordaron a Domingo Teruggi" hablaba del
  // partido de Lobería y terminó en Deportes.
  const titular = normalizar(nota.titulo);

  // 1. Automovilismo gana siempre: en Balcarce es sección propia, no un
  //    subtema de deportes, y aparece mezclado en cualquier feed.
  const fierros = REGLAS_SECCION.find((r) => r.seccion === 'Automovilismo');
  if (fierros.palabras.some((p) => !PALABRAS_DEBILES.has(p) && contiene(texto, p))) return 'Automovilismo';

  // 2. Si la fuente ya viene separada por sección (las de Radio Gabal, Olé,
  //    Clarín Deportes), le creemos: es más confiable que adivinar.
  if (nota.seccionFuente) return nota.seccionFuente;

  // 3. Recién ahí, palabras clave. Gana la coincidencia más específica, no la
  //    primera de la lista: "Exposición Rural de Palermo" caía en Cultura
  //    porque "exposición" está en esa regla y Cultura va antes que Agro.
  //    Si dos palabras son igual de largas, manda el orden de las reglas.
  let mejor = null;
  let largo = 0;
  let debil = null;
  for (const regla of REGLAS_SECCION) {
    for (const palabra of regla.palabras) {
      if (!contiene(texto, palabra)) continue;
      if (PALABRAS_DEBILES.has(palabra)) {
        if (!debil && contiene(titular, palabra)) debil = regla.seccion;
        continue;
      }
      if (palabra.length > largo) {
        largo = palabra.length;
        mejor = regla.seccion;
      }
    }
  }
  if (mejor) return mejor;
  if (debil) return debil;

  if (nota.alcance === 'local') return 'Balcarce';
  // Una nota de afuera que nombra a Balcarce y no encaja en ninguna sección
  // es de Balcarce, no de "Región" (que no sale sola). El 25/09 el acuerdo
  // salarial del STM con el Municipio, que trajo QZ Noticias, quedaba ahí.
  if (nota.nombraBalcarce) return 'Balcarce';
  if (nota.alcance === 'region') return 'Región';
  if (nota.alcance === 'provincia') return 'Provincia';
  return 'País';
}

// El piso de puntaje para lo de afuera ya no es uno solo: cada sección tiene
// el suyo (PISO_DE_AFUERA en fuentes.mjs, con el porqué de cada número).
const pisoDe = (seccion) => PISO_DE_AFUERA[seccion] ?? PISO_POR_DEFECTO;

/**
 * Las listas roja y amarilla del semáforo, pasadas sobre un texto cualquiera.
 * Devuelve { color, motivo } con lo primero que encuentra (el rojo antes que
 * el amarillo), o null si no hay nada sensible.
 *
 * Aparte del semáforo porque no sólo se usa acá: la ingesta mira el título y
 * el principio del resumen, pero la IA reescribe con la nota ENTERA
 * (ingesta/articulo.mjs). Lo que dice el tercer párrafo de la fuente, o lo
 * que la IA escribió con eso, tiene que pasar por la misma lista antes de
 * publicarse (reels/reescritura.mjs). Leyes 26.061 y 26.485.
 *
 * La lista de promociones no está acá a propósito: es sobre qué ES la nota,
 * y el texto completo de una página trae "seguinos en" y "suscribite" en
 * cualquier nota.
 */
export function semaforoDelTexto(textoCrudo, { soloMenores = false } = {}) {
  const texto = normalizar(String(textoCrudo ?? ''));
  if (!texto) return null;
  for (const p of REGLAS_SEMAFORO.rojo) {
    if (contiene(texto, p)) return { color: 'rojo', motivo: `tema sensible: "${p}"` };
  }
  // En un texto entero (el artículo completo, el cuerpo que escribió la IA)
  // sólo frena lo que cuida a chicos y víctimas: ver AMARILLO_MENORES.
  for (const p of soloMenores ? AMARILLO_MENORES : REGLAS_SEMAFORO.amarillo) {
    if (contiene(texto, p)) return { color: 'amarillo', motivo: `necesita ojo humano: "${p}"` };
  }
  return null;
}

function semaforo(nota, seccion, puntaje) {
  const sensible = semaforoDelTexto(`${nota.titulo} ${nota.cuerpo.slice(0, 600)}`);
  if (sensible) return sensible;
  // La cotización del dólar no sale como nota: está en /dolar. Sólo el título.
  const delTitulo = normalizar(String(nota.titulo ?? ''));
  if ((REGLAS_SEMAFORO.cotizacion ?? []).some((p) => contiene(delTitulo, p))) {
    return { color: 'amarillo', motivo: MOTIVO_COTIZACION };
  }
  const texto = normalizar(`${nota.titulo} ${nota.cuerpo.slice(0, 600)}`);
  for (const p of REGLAS_SEMAFORO.promocional ?? []) {
    if (contiene(texto, p)) return { color: 'amarillo', motivo: `parece promoción, no noticia: "${p}"` };
  }
  if (nota.oficial) return { color: 'verde', motivo: 'comunicado oficial' };

  // Automovilismo tampoco tiene piso. No es una sección más: es la ciudad
  // de Fangio y ya se le suman 8 puntos por eso en el puntaje. Con el piso
  // puesto, las notas de Fórmula 1 quedaban justo abajo (48 de 50) y la
  // sección se vaciaba.
  const deAca = nota.local || nota.nombraBalcarce || seccion === 'Automovilismo' || esDeBalcarce(nota);
  if (!deAca && puntaje < pisoDe(seccion)) {
    return { color: 'amarillo', motivo: `de afuera y con poco puntaje (${puntaje} de ${pisoDe(seccion)})` };
  }

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
  // El "seguir leyendo" que casi todas las fuentes pegan al final del
  // resumen no es parte de la noticia: es el link para ir a su nota.
  t = t.replace(/\s*(leer|le[eé]|segu[ií]|sigue)\s+(m[aá]s|leyendo)\s*[.…»]*\s*$/iu, '').trim();
  // Si arranca repitiendo el título, se le saca esa parte.
  const nt = normalizar(titulo);
  if (normalizar(t).startsWith(nt)) t = t.slice(titulo.length).replace(/^\s*[-:.–—|]\s*/, '').trim();
  if (normalizar(t).length < 40) return '';
  // Cortar en 280 a lo bruto partía la última palabra a la mitad, y a veces
  // en plena frase ("...pasión por los"): se veía como una nota rota, no
  // como un resumen. Se corta en el último espacio y se avisa con "…".
  if (t.length <= 280) return t;
  const corte = t.slice(0, 280);
  const ultimoEspacio = corte.lastIndexOf(' ');
  return `${corte.slice(0, ultimoEspacio > 200 ? ultimoEspacio : 280).replace(/[\s,.;:]+$/, '')}…`;
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
  const j = JSON.parse(await traer(url, { agente: 'RadarBalcarce/0.1 (radarbalcarce.com)' }));
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
    + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,wind_speed_10m_max,precipitation_sum'
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
      // Para los avisos (ingesta/alertas.mjs): el código dice si hay granizo
      // o tormenta, y el viento y los milímetros dicen si es en serio.
      codigo: j.daily.weather_code[i],
      viento: Math.round(j.daily.wind_speed_10m_max?.[i] ?? 0),
      milimetros: Math.round(j.daily.precipitation_sum?.[i] ?? 0),
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
// Los nexos que un listado escribe y el otro no. El Colegio publica
// "SAN JOSE PLAZA" y La Vanguardia "SAN JOSÉ DE LA PLAZA": es la misma
// farmacia y hay que poder cruzarlas.
const NEXOS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y']);

/** Las formas en que puede estar escrito un nombre: como viene, y sin los
 *  nexos. Se indexa por las dos y se busca por las dos, así da igual cuál
 *  de los dos listados abrevió. */
function clavesDe(nombre) {
  const tal = normalizar(nombre);
  const corta = tal.split(/\s+/).filter((x) => !NEXOS.has(x)).join(' ');
  return corta && corta !== tal ? [tal, corta] : [tal];
}

/** Guarda una farmacia bajo todas sus claves, sin pisar lo que ya había. */
function anotar(directorio, nombre, datos) {
  for (const clave of clavesDe(nombre)) {
    if (!directorio[clave]) directorio[clave] = datos;
  }
}

/** La busca por cualquiera de sus formas, en el orden en que se pasen los
 *  directorios: primero el del Colegio, que es el oficial. */
function buscarFarmacia(nombre, ...directorios) {
  for (const dir of directorios) {
    for (const clave of clavesDe(nombre)) {
      if (dir?.[clave]) return dir[clave];
    }
  }
  return null;
}

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
    anotar(directorio, m[1], {
      nombre: m[1].trim(),
      direccion: m[2].replace(/\s+/g, ' ').trim(),
      telefono: m[3],
    });
  }
  return directorio;
}

// Lee el cronograma del Colegio y devuelve los turnos con fecha y detalle.
//
// Está separada del pedido de red a propósito: es la parte que ya se rompió
// dos veces en silencio (una farmacia pegada al encabezado del mes, los
// turnos de octubre fechados en septiembre) y es la única forma de probarla
// sin salir a internet. Las pruebas viven en pruebas/farmacias.test.mjs.
export function parsearCronograma(texto, directorio = {}) {
  // Mes y año del cronograma publicado.
  const cab = texto.match(new RegExp(`(${MESES.join('|')})\\s*,?\\s*(20\\d\\d)`, 'i'));
  const mes = cab ? MESES.indexOf(cab[1].toLowerCase()) + 1 : null;
  const anio = cab ? +cab[2] : null;

  // El corte del nombre también mira el encabezado del mes siguiente: la
  // página publica dos cronogramas seguidos y, sin eso, la última farmacia
  // del mes se leía como "MARIOLI OCTUBRE 2026".
  const turnos = [];
  const re = new RegExp(`(${DIAS_RE})\\s+(\\d{1,2})\\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9'’.\\- ]*?)(?=\\s+(?:${DIAS_RE})\\s+\\d|\\s+(?:${MESES.join('|')})\\s*,?\\s*20|\\s+Recordamos|\\s+Turnos|\\s*$)`, 'gi');
  // La página publica el cronograma del mes y el arranque del siguiente, uno
  // detrás del otro y sin repetir el encabezado. Cuando el número de día
  // vuelve para atrás (…29, 30, 3, 4) es que empezó el mes que viene, y esos
  // turnos tienen que quedar fechados en octubre, no en septiembre.
  let m;
  let mesDe = mes;
  let anioDe = anio;
  let diaAnterior = 0;
  while ((m = re.exec(texto)) !== null) {
    const nombres = m[3].trim().split(/\s+-\s+/).map((s) => s.trim()).filter((s) => s.length > 2);
    if (!nombres.length) continue;
    const dia = +m[2];
    if (mesDe && dia < diaAnterior) {
      if (mesDe === 12) { mesDe = 1; anioDe += 1; } else { mesDe += 1; }
    }
    diaAnterior = dia;
    turnos.push({
      dia,
      diaSemana: m[1].toUpperCase(),
      farmacias: nombres,
      // La dirección se busca en el directorio que llega armado (Colegio +
      // La Vanguardia) y, si ninguno la tiene, en la lista cargada a mano.
      // Una farmacia de turno sin dirección no sirve para nada: es el dato
      // que la persona necesita a las tres de la mañana.
      detalle: nombres.map((n) => buscarFarmacia(n, directorio, FARMACIAS_A_MANO)
        ?? { nombre: n, direccion: null, telefono: null }),
      mes: mesDe,
      fecha: mesDe && anioDe ? `${anioDe}-${String(mesDe).padStart(2, '0')}-${String(dia).padStart(2, '0')}` : null,
    });
  }

  return { mes, anio, turnos };
}

/**
 * El segundo lugar de donde sacamos direcciones.
 *
 * La Vanguardia publica la farmacia de turno CON la dirección al lado, y
 * eso cubre un agujero del directorio del Colegio: San José de la Plaza
 * estuvo de turno el 20/09/2026 y no figuraba en el directorio oficial, así
 * que en la tarjeta salía el nombre sin dirección — justo el dato que la
 * persona necesita a las tres de la mañana.
 *
 * Se arma del mismo pedido que ya hacíamos para cruzar los turnos, así que
 * no cuesta una llamada de red más.
 */
function directorioDeLaVanguardia(turnos) {
  const directorio = {};
  for (const t of turnos) {
    if (!t.direccion) continue;
    anotar(directorio, t.nombre, {
      nombre: t.nombre.trim(),
      direccion: t.direccion,
      telefono: null,
      // De dónde salió, para que el panel pueda mostrarlo.
      fuente: "La Vanguardia",
    });
  }
  return directorio;
}

/**
 * Control de calidad del cronograma: que sea del mes en curso y llegue hasta
 * fin de mes. "El mes en curso" es el de Balcarce: con el reloj del servidor
 * (UTC), el 30 a las 22 ya era el mes siguiente y avisaba de más.
 */
function controlDelCronograma({ mes, anio, turnos }, ahora = new Date()) {
  const delMes = turnos.filter((t) => !mes || t.mes === mes);
  const ultimoDia = delMes.length ? Math.max(...delMes.map((t) => t.dia)) : 0;
  const diasEnMes = mes ? new Date(anio, mes, 0).getDate() : 31;
  const avisos = [];
  if (mes && mes !== fechaEnBalcarce(ahora).mes) avisos.push(`el cronograma publicado es de ${MESES[mes - 1]}, no del mes en curso`);
  if (ultimoDia && ultimoDia < diasEnMes) avisos.push(`sólo llega hasta el día ${ultimoDia} de ${diasEnMes}: hay que recargarlo`);
  return avisos;
}

async function traerFarmacias() {
  const html = await traer('https://www.colbalcarce.com/');
  const texto = sinEtiquetas(html);
  // Las direcciones salen de dos lados. El Colegio es el oficial y trae
  // teléfono, así que manda; La Vanguardia tapa los huecos. Se piden a la
  // vez para no sumar espera.
  const [oficial, enLaVanguardia] = await Promise.all([
    traerDirectorioFarmacias().catch(() => ({})),
    turnosDeLaVanguardia().then(directorioDeLaVanguardia).catch(() => ({})),
  ]);
  const directorio = { ...enLaVanguardia, ...oficial };

  const { mes, anio, turnos } = parsearCronograma(texto, directorio);

  const avisos = controlDelCronograma({ mes, anio, turnos });

  // Una farmacia sin dirección se publica igual, pero avisando: es preferible
  // dar el nombre solo a inventar una calle.
  // Las cargadas a mano ya no cuentan como faltantes.
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

/**
 * El día que se compara es el del turno que está abierto AHORA (diaDeTurno:
 * hasta las 8:30 del día siguiente, en hora de Balcarce). Antes era
 * `new Date().getDate()`, el día del servidor: en GitHub (UTC), de 21 a 24
 * comparaba la farmacia de mañana, y de 0 a 8:30 la de un día que todavía no
 * había empezado. `ahora` y las dos fuentes se pueden pasar para probarlo
 * sin red.
 */
async function cruzarFarmacias(turnosColegio, {
  ahora = new Date(), vanguardia = turnosDeLaVanguardia, gabalFn = turnosDeGabal,
} = {}) {
  const hoy = diaDeTurno(ahora).getDate();
  const nuestraDeHoy = turnosColegio.find((t) => t.dia === hoy);
  const nombresNuestros = new Set((nuestraDeHoy?.farmacias ?? []).map((n) => normalizar(n)));

  const fuentes = [];
  const discrepancias = [];

  const [vang, gabal] = await Promise.allSettled([vanguardia(), gabalFn()]);

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

  return {
    dia: hoy, fuentes, discrepancias, confirmado: fuentes.some((f) => f.estado === 'ok') && !discrepancias.length,
  };
}

// ------------------------------------------------------------------ correr

/**
 * Baja a "amarillo" las notas de afuera que se pasan del cupo de su sección.
 * Recibe la portada ya ordenada de más a menos puntaje, y la modifica.
 */
export function aplicarCupos(portada) {
  const usados = {};
  for (const n of portada) {
    if (n.semaforo !== 'verde') continue;
    if (n.local || n.nombraBalcarce) continue;
    // Automovilismo no tenía cupo hasta el 25/09; ahora tiene el suyo en
    // CUPO_DE_AFUERA. Sin esa entrada seguiría sin tope, como antes.
    if (n.seccion === 'Automovilismo' && CUPO_DE_AFUERA.Automovilismo == null) continue;
    usados[n.seccion] = (usados[n.seccion] ?? 0) + 1;
    const cupo = CUPO_DE_AFUERA[n.seccion] ?? CUPO_POR_DEFECTO;
    if (usados[n.seccion] > cupo) {
      n.semaforo = 'amarillo';
      n.motivo = `pasó el cupo de ${n.seccion} de afuera (${cupo} por vuelta)`;
    }
  }
  return portada;
}

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
      // Lo que toca la zona (ruta 226, sudeste, papa) entra aunque no diga
      // Balcarce, pero sin marcarse como que la nombra (sin los +22).
      const deLaZona = notas.filter((n) => !nuestras.includes(n) && !conFigura.includes(n) && tocaLaZona(n));
      deLaZona.forEach((n) => { n.deLaZona = true; });
      const resto = notas.filter((n) => !nuestras.includes(n) && !conFigura.includes(n) && !deLaZona.includes(n))
        .sort((a, b) => b.fecha - a.fecha)
        .slice(0, f.maxItems ?? 5);
      notas = [...nuestras, ...conFigura, ...deLaZona, ...resto];
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
    const rel = relevancia(g.principal, seccion, g.medios.length);
    const sem = semaforo(g.principal, seccion, rel);
    return {
      // Con el enlace del feed si lo hay (Blogger): así el identificador es el
      // mismo que antes de que el enlace pasara a ser la página de la nota.
      id: idDe(g.principal.enlaceFeed ?? g.principal.enlace),
      titulo: sentenciar(g.principal.titulo, g.principal.cuerpo),
      enlace: g.principal.enlace,
      ...(g.principal.enlaceFeed ? { enlaceFeed: g.principal.enlaceFeed } : {}),
      fecha: g.principal.fecha.toISOString(),
      cuando: g.principal.fechaEstimada ? 'sin fecha en la fuente' : haceCuanto(g.principal.fecha),
      medio: g.principal.medio,
      medios: g.medios,
      seccion,
      temas: temasDe(g.principal),
      semaforo: sem.color,
      motivo: sem.motivo,
      relevancia: rel,
      imagen: g.principal.imagen || null,
      resumenFuente: limpiarCopete(g.principal.cuerpo, g.principal.titulo, g.principal.medio),
      // El resumen de cada medio que contó lo mismo, no sólo el principal:
      // es lo que permite reescribir cruzando varias versiones en vez de
      // repetir una sola. Vacío si nadie más lo contó.
      fuentesTexto: g.tambien
        .map((n) => limpiarCopete(n.cuerpo, n.titulo, n.medio))
        .filter(Boolean),
      // Cada fuente de la noticia, en orden (la principal primero), con su
      // medio, su enlace, su fecha y si es oficial. Es lo que la IA recibe
      // numerado ("Fuente 1", "Fuente 2"…), lo que la nota muestra en
      // "Fuentes consultadas" y con lo que se calcula el nivel de
      // verificación (reels/reescritura.mjs). El resumen se usa sólo para
      // escribir: a la web no llega.
      origenes: [g.principal, ...g.tambien].map((n) => ({
        medio: n.medio,
        enlace: n.enlace,
        ...(n.enlaceFeed ? { enlaceFeed: n.enlaceFeed } : {}),
        fecha: n.fechaEstimada || !(n.fecha instanceof Date) ? null : n.fecha.toISOString(),
        oficial: !!n.oficial,
        resumen: limpiarCopete(n.cuerpo, n.titulo, n.medio),
      })),
      local: esDeBalcarce(g.principal),
      figura: g.principal.figura ?? null,
      alcance: g.principal.alcance,
      nombraBalcarce: !!g.principal.nombraBalcarce,
    };
  }).sort((a, b) => b.relevancia - a.relevancia);

  // 3b. El cupo de lo de afuera.
  //
  // El piso solo no alcanza: un domingo de fútbol tiene treinta notas arriba
  // de 62 puntos y la portada de Balcarce sería la de Olé. Por sección, las
  // de afuera que salen solas son las N de más puntaje; el resto espera.
  // Lo de Balcarce no entra en la cuenta. Automovilismo sí, desde el 25/09.
  aplicarCupos(portada);

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
    // El turno abierto ahora, en hora de Balcarce (no el día del servidor).
    const hoy = diaDeTurno().getDate();
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
    ? `<div style="font-size:13px;line-height:1.8">${d.farmacias.turnos.filter((t) => t.dia >= diaDeTurno().getDate()).slice(0, 8).map((t) => `<span style="color:var(--suave)">${esc(t.diaSemana)} ${t.dia}</span> · <b>${esc(t.farmacias.join(' y '))}</b>`).join('<br>')}</div>
       <div style="margin-top:10px;font-size:11px;color:var(--suave)">De 8:30 de la mañana a 8:30 del día siguiente · Colegio de Farmacéuticos de Balcarce</div>
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

// Las piezas internas que las pruebas necesitan ver.
//
// No se exportan una por una para que quede claro, leyendo el archivo, cuál
// es la interfaz de verdad (ingestar, parsearFeed, parsearCronograma, traer)
// y cuál es la ventana que abrimos sólo para poder probar. Las pruebas están
// en la carpeta pruebas/ y corren con `npm test`, sin red.
export const paraPruebas = {
  idDe, normalizar, parecido, sentenciar, esDeBalcarce, figuraQueNombra,
  clasificar, semaforo, limpiarCopete, relevancia, meta, parsearScrape,
  cieloDeSimbolo, haceCuanto, sinEtiquetas, decodificar,
  clavesDe, anotar, buscarFarmacia, directorioDeLaVanguardia, pisoDe,
  contiene, cruzarFarmacias, controlDelCronograma, tocaLaZona,
};

// Sólo corre cuando se lo invoca directo; si lo importa probar.mjs, no.
const esEjecutable = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (esEjecutable) {
  ingestar({ escribirArchivos: true }).catch((e) => { console.error(e); process.exit(1); });
}

// El texto de cada pieza para cada red (regla 281, 17/10/2026; la tabla de largos, enlaces y hashtags está en docs/redes/FORMATOS-POR-RED.md).
//
// Hernán: "revisá el formato del texto de lo que va en Facebook, en Instagram y en cada red social: no todas usan el mismo ni respetan los links".
// Hoy sólo se publican Facebook e Instagram, y su texto lo siguen armando `mensajeDeNota` (redes/elegir.mjs) y `pieDePieza` (redes/piezas.mjs): esta
// función los usa tal cual. Las demás redes (Threads, X, Telegram, Bluesky, TikTok, YouTube Shorts, el canal de WhatsApp) todavía no tienen cuenta:
// su texto queda listo y probado para el día que existan. Esta función NO publica nada ni habla con ninguna red.
//
//   textoParaRed('telegram', { tipo: 'nota', nota, sitio })
//   textoParaRed('youtube',  { tipo: 'reel', pieza })
//
// Devuelve { red, tipo, publicable, motivo?, texto, titulo?, descripcion?, enlace, hashtags, etiquetaDeTema?, facetas?, largo, maximo, cabe, avisos }.
// `texto` es lo que se escribe en el posteo (en YouTube, `titulo` y `descripcion` van aparte). `cabe` dice si entra en el máximo de esa red; si no
// entra, se recorta en una palabra entera y `avisos` lo dice. Nunca nombra a la fuente (criterio de las redes).
//
// Sin dependencias: sólo lo que trae Node.

import {
  armarHashtags, conCreditoDeFoto, enlaceConOrigen, hashtagsDe, mensajeDeNota, ponerOrigen, HASHTAGS_FIJOS,
} from './elegir.mjs';
import { AVISO_DE_VOZ, enlaceDelRepaso, hashtagsDePieza, pieDePieza, SERVICIOS_CON_PAGINA } from './piezas.mjs';
import { FOTO_EN_INSTAGRAM } from '../web/lib/tarjeta-diseno.js';
import { SITIO } from './prompt-redes.mjs';

/**
 * Lo que sabe el generador de cada red. `maximo`: lo más que acepta el texto (0 = no aplica); `recomendado`: hasta dónde conviene llegar;
 * `enlace`: 'tocable' | 'bio' | 'costo' | 'no'; `hashtags`: cuántos como mucho en total (con los fijos); `verificado`: false si algún dato de la fila es
 * "SIN VERIFICAR" en docs/redes/FORMATOS-POR-RED.md § 1. Los números de las redes con cuenta (Facebook, Instagram) son los que ya se publican.
 */
export const FORMATO_POR_RED = {
  facebook: { nombre: 'Facebook', maximo: 63206, recomendado: 500, enlace: 'tocable', hashtags: 5, verificado: false },
  instagram: { nombre: 'Instagram', maximo: 2200, recomendado: 500, enlace: 'bio', hashtags: 5, verificado: true },
  threads: { nombre: 'Threads', maximo: 500, recomendado: 400, enlace: 'tocable', hashtags: 1, verificado: true },
  x: { nombre: 'X', maximo: 280, recomendado: 270, enlace: 'costo', hashtags: 2, verificado: true },
  telegram: { nombre: 'Telegram', maximo: 4096, recomendado: 900, enlace: 'tocable', hashtags: 5, verificado: true },
  bluesky: { nombre: 'Bluesky', maximo: 300, recomendado: 280, enlace: 'tocable', hashtags: 3, verificado: false },
  tiktok: { nombre: 'TikTok', maximo: 2200, recomendado: 400, enlace: 'bio', hashtags: 5, verificado: false },
  youtube: { nombre: 'YouTube Shorts', maximo: 5000, recomendado: 800, enlace: 'no', hashtags: 3, verificado: false, maximoDelTitulo: 100 },
  whatsapp: { nombre: 'Canal de WhatsApp', maximo: 0, recomendado: 700, enlace: 'tocable', hashtags: 0, verificado: false },
};

/** Las redes que ya publica el robot; el resto está listo pero sin cuenta. */
export const REDES_QUE_PUBLICAN = ['facebook', 'instagram'];

// ------------------------------------------------------------ medir y recortar

const URL_EN_TEXTO = /https?:\/\/\S+/g;
const EMOJI = /\p{Extended_Pictographic}/u;
const segmentador = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('es', { granularity: 'grapheme' }) : null;

/** Cuántos "caracteres" ve cada red. */
const MEDIDAS = {
  // X: cada URL cuenta 23 y cada emoji 2 (docs.x.com/fundamentals/counting-characters).
  x: (t) => [...t.replace(URL_EN_TEXTO, 'x'.repeat(23))].reduce((s, c) => s + (EMOJI.test(c) ? 2 : 1), 0),
  // Threads: 500 caracteres, y los emojis cuentan por sus bytes UTF-8.
  threads: (t) => [...t].reduce((s, c) => s + (EMOJI.test(c) ? new TextEncoder().encode(c).length : 1), 0),
  // Bluesky: 300 "graphemes" (lo que ve una persona como una letra).
  bluesky: (t) => (segmentador ? [...segmentador.segment(t)].length : [...t].length),
  // Telegram, TikTok, YouTube, Instagram, Facebook: caracteres (puntos de código).
  porDefecto: (t) => [...t].length,
};
export const largoEn = (red, texto) => (MEDIDAS[red] ?? MEDIDAS.porDefecto)(String(texto ?? ''));

/** Recorta en una palabra entera para que `texto` mida `maximo` o menos en esa red; agrega "…" si cortó. */
export function recortarPara(red, texto, maximo) {
  let t = String(texto ?? '').replace(/[ \t]+/g, ' ').trim();
  if (largoEn(red, t) <= maximo) return t;
  const palabras = t.split(' ');
  while (palabras.length > 1 && largoEn(red, `${palabras.join(' ')}…`) > maximo) palabras.pop();
  t = palabras.join(' ').replace(/[\s,.;:!?¡¿-]+$/, '');
  return largoEn(red, `${t}…`) <= maximo ? `${t}…` : [...t].slice(0, Math.max(0, maximo - 1)).join('') + '…';
}

// ---------------------------------------------------------------- las piezas

const sinRetorno = (t) => String(t ?? '').replace(/\r/g, '');
const enlaceDeNotaPara = (red, nota, sitio) => enlaceConOrigen(nota, sitio, { fuente: red, campana: 'posteo', contenido: nota.id });

/** Las tres cosas que una nota tiene para decir, de más corta a más larga. */
function piezasDeLaNota(nota) {
  const titular = String(nota.titulo ?? '').trim();
  const resumen = String(nota.textoRedes ?? '').trim();
  const bajada = String(nota.copete ?? '').replace(/\s+/g, ' ').trim();
  return { titular, resumen, bajada };
}

/** Las facetas de Bluesky (posiciones en BYTES de UTF-8): los enlaces y los hashtags del texto, para que sean tocables. */
export function facetasDeBluesky(texto) {
  const bytes = new TextEncoder();
  const posicion = (indice) => bytes.encode(texto.slice(0, indice)).length;
  const facetas = [];
  for (const m of texto.matchAll(URL_EN_TEXTO)) {
    const uri = m[0].replace(/[).,;:!?]+$/, '');
    facetas.push({ index: { byteStart: posicion(m.index), byteEnd: posicion(m.index + uri.length) }, features: [{ $type: 'app.bsky.richtext.facet#link', uri }] });
  }
  for (const m of texto.matchAll(/(^|\s)#([\p{L}\p{N}_]+)/gu)) {
    const inicio = m.index + m[1].length;
    facetas.push({ index: { byteStart: posicion(inicio), byteEnd: posicion(inicio + 1 + m[2].length) }, features: [{ $type: 'app.bsky.richtext.facet#tag', tag: m[2] }] });
  }
  return facetas;
}

function resultado(red, tipo, partes) {
  const f = FORMATO_POR_RED[red];
  const avisos = partes.avisos ?? [];
  const texto = partes.texto ?? '';
  const largo = largoEn(red, texto);
  const maximo = partes.maximo ?? f.maximo;
  const cabe = maximo === 0 ? true : largo <= maximo;
  if (!cabe) avisos.push(`el texto mide ${largo} y ${f.nombre} acepta ${maximo}`);
  return {
    red, tipo, publicable: partes.publicable !== false, motivo: partes.motivo ?? null, texto, titulo: partes.titulo ?? null, descripcion: partes.descripcion ?? null,
    enlace: partes.enlace ?? null, hashtags: partes.hashtags ?? [], etiquetaDeTema: partes.etiquetaDeTema ?? null,
    facetas: partes.facetas ?? null, largo, maximo, cabe, avisos,
  };
}

const noSePublica = (red, tipo, motivo) => resultado(red, tipo, { publicable: false, motivo, maximo: 0 });

/** Una línea por cada titular del repaso (los titulares, sin la fuente). */
const titulares = (pieza) => (pieza.items ?? []).map((i) => String(i.titulo ?? '').trim()).filter(Boolean);

// ------------------------------------------------------------- una nota

function deUnaNota(red, { nota, sitio = `https://${SITIO}`, conEnlace = false }) {
  const f = FORMATO_POR_RED[red];
  const { titular, resumen, bajada } = piezasDeLaNota(nota);
  const enlace = enlaceDeNotaPara(red, nota, sitio);

  if (red === 'facebook' || red === 'instagram') {
    const origen = { fuente: red };
    const pie = FOTO_EN_INSTAGRAM ? conCreditoDeFoto(mensajeDeNota(nota, sitio, origen), nota) : mensajeDeNota(nota, sitio, origen);
    return resultado(red, 'nota', { texto: pie, enlace: red === 'instagram' ? null : enlace, hashtags: hashtagsDe(nota) });
  }
  if (red === 'tiktok' || red === 'youtube') return noSePublica(red, 'nota', `${f.nombre} es de video: las notas no se publican, sólo los repasos y las piezas con voz`);

  if (red === 'threads') {
    // Un posteo de puro texto con el enlace: la primera URL se vuelve la tarjeta (sólo en posteos de texto, no con foto ni video). La etiqueta de tema va aparte.
    const base = resumen || [titular, bajada].filter(Boolean).join('\n\n');
    const cola = `\n\n${enlace}`;
    const texto = recortarPara('threads', base, f.recomendado - largoEn('threads', cola)) + cola;
    return resultado(red, 'nota', { texto, enlace, hashtags: [], etiquetaDeTema: 'Balcarce' });
  }
  if (red === 'x') {
    const hashtags = armarHashtags([], 0).slice(0, f.hashtags);
    const cola = `${conEnlace ? `\n${enlace}` : ''}\n${hashtags.join(' ')}`;
    const avisos = conEnlace ? [] : ['sin enlace: en X cada posteo con enlace cuesta US$ 0,20 (13 veces más)'];
    const texto = recortarPara('x', titular, f.maximo - largoEn('x', cola)) + cola;
    return resultado(red, 'nota', { texto, enlace: conEnlace ? enlace : null, hashtags, avisos });
  }
  if (red === 'telegram') {
    const hashtags = hashtagsDe(nota, 3);
    const cuerpo = [titular, resumen || bajada].filter(Boolean).join('\n\n');
    const texto = [recortarPara('telegram', cuerpo, f.maximo - 400), enlace, hashtags.join(' ')].join('\n\n');
    return resultado(red, 'nota', { texto, enlace, hashtags });
  }
  if (red === 'bluesky') {
    const hashtags = HASHTAGS_FIJOS.map((h) => `#${h}`);
    const cola = `\n${enlace}\n${hashtags.join(' ')}`;
    const texto = recortarPara('bluesky', titular, f.maximo - largoEn('bluesky', cola)) + cola;
    return resultado(red, 'nota', { texto, enlace, hashtags, facetas: facetasDeBluesky(texto) });
  }
  // WhatsApp (canal): a mano, titular y enlace, sin hashtags.
  const texto = [titular, resumen || bajada ? recortarPara('whatsapp', resumen || bajada, 300) : null, enlace].filter(Boolean).join('\n\n');
  return resultado('whatsapp', 'nota', { texto, enlace, avisos: ['el canal no tiene API: el robot deja el texto y una persona lo reenvía'] });
}

// ------------------------------------------------------ un reel o una historia

function deUnaPieza(red, { pieza, tipo }) {
  const f = FORMATO_POR_RED[red];
  const esReel = pieza.tipo === 'reel' || tipo === 'reel';
  if (!esReel) return noSePublica(red, 'historia', red === 'facebook' || red === 'instagram' ? 'las historias no llevan texto' : `${f.nombre} no tiene historias`);

  if (red === 'facebook' || red === 'instagram') {
    return resultado(red, 'reel', { texto: pieDePieza({ ...pieza, tipo: 'reel' }, red), enlace: red === 'facebook' ? enlaceDelRepaso(pieza, 'facebook') : null, hashtags: hashtagsDePieza(pieza) });
  }
  const lista = titulares(pieza);
  const enlace = enlaceDelRepaso(pieza, red) ?? enlaceDeServicio(pieza, red);
  const tags = hashtagsDePieza(pieza);
  const sitioDicho = `Más en ${SITIO}`;

  if (red === 'youtube') {
    const titulo = recortarPara('youtube', `${pieza.titulo} · Radar Balcarce`, f.maximoDelTitulo);
    // En un Short no hay enlace tocable (agosto de 2023): se dice la dirección y se pone la lista.
    const descripcion = [lista.length ? lista.map((t) => `• ${t}`).join('\n') : null, sitioDicho, AVISO_DE_VOZ, tags.slice(0, f.hashtags).join(' ')].filter(Boolean).join('\n\n');
    return resultado(red, 'reel', { texto: descripcion, titulo, descripcion, enlace: null, hashtags: tags.slice(0, f.hashtags), maximo: f.maximo });
  }
  if (red === 'tiktok') {
    const texto = [pieza.titulo, lista.length ? lista.map((t) => `• ${t}`).join('\n') : null, `${sitioDicho} (link en la bio)`, AVISO_DE_VOZ, tags.join(' ')].filter(Boolean).join('\n\n');
    return resultado(red, 'reel', { texto, enlace: null, hashtags: tags });
  }
  if (red === 'telegram') {
    // El pie de un video en Telegram mide hasta 1.024: si la lista no entra, se sacan titulares del final.
    const arma = (n) => [pieza.titulo, n ? lista.slice(0, n).map((t) => `• ${t}`).join('\n') : null, enlace ?? sitioDicho, AVISO_DE_VOZ, tags.join(' ')].filter(Boolean).join('\n\n');
    let n = lista.length;
    while (n > 0 && largoEn('telegram', arma(n)) > 1024) n -= 1;
    return resultado(red, 'reel', { texto: arma(n), enlace, hashtags: tags, maximo: 1024 });
  }
  if (red === 'whatsapp') {
    const texto = [pieza.titulo, lista.length ? lista.map((t) => `• ${t}`).join('\n') : null, enlace ?? sitioDicho, AVISO_DE_VOZ].filter(Boolean).join('\n\n');
    return resultado('whatsapp', 'reel', { texto, enlace, avisos: ['el canal no tiene API: el robot deja el texto y una persona lo reenvía'] });
  }
  // Threads, X y Bluesky: una línea con el título, el primer titular y el enlace (X, sin enlace: cuesta); el aviso de la voz no entra en 280, va en el video.
  const cola = red === 'x' ? `\n${tags.slice(0, f.hashtags).join(' ')}` : `\n${enlace ?? sitioDicho}${red === 'bluesky' ? `\n${tags.slice(0, 2).join(' ')}` : ''}`;
  const cuerpo = [pieza.titulo, lista[0]].filter(Boolean).join(': ');
  const texto = recortarPara(red, cuerpo, f.recomendado - largoEn(red, cola)) + cola;
  return resultado(red, 'reel', {
    texto, enlace: red === 'x' ? null : enlace, hashtags: red === 'threads' ? [] : tags.slice(0, f.hashtags), etiquetaDeTema: red === 'threads' ? 'Balcarce' : null,
    facetas: red === 'bluesky' ? facetasDeBluesky(texto) : null,
  });
}

/** El enlace a la página de servicio (clima, farmacias) de una pieza, con el origen de la red. */
function enlaceDeServicio(pieza, red) {
  const s = SERVICIOS_CON_PAGINA.find((x) => x.es(pieza.nombre));
  return s ? ponerOrigen(`https://${SITIO}${s.camino}`, { fuente: red, campana: 'servicio', contenido: pieza.nombre }) : null;
}

/**
 * El texto de una pieza para una red.
 *
 * @param {string} red  facebook | instagram | threads | x | telegram | bluesky | tiktok | youtube | whatsapp
 * @param {{ tipo: 'nota' | 'reel' | 'historia', nota?: object, pieza?: object, sitio?: string, conEnlace?: boolean }} entrada
 *        `nota` es una de portada.json; `pieza` es la del plan ({ nombre, tipo, titulo, items:[{titulo}], dia }); `conEnlace` sólo cuenta para X.
 */
export function textoParaRed(red, entrada = {}) {
  const r = String(red ?? '').toLowerCase();
  if (!FORMATO_POR_RED[r]) throw new Error(`Red desconocida: ${red}. Son: ${Object.keys(FORMATO_POR_RED).join(', ')}.`);
  const tipo = entrada.tipo ?? (entrada.nota ? 'nota' : 'reel');
  const salida = tipo === 'nota' ? deUnaNota(r, entrada) : deUnaPieza(r, { pieza: entrada.pieza ?? {}, tipo });
  salida.texto = sinRetorno(salida.texto);
  return salida;
}

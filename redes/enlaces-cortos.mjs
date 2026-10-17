// Los enlaces cortos de las redes: radarbalcarce.com/r/<red>/<destino> (regla 282, 17/10/2026; docs/redes/ACORTADOR-DE-ENLACES.md).
//
// Hoy el enlace de un posteo de Facebook se ve así (150 caracteres o más):
//   https://radarbalcarce.com/nota/la-plata-concentra-propuestas-culturales-y-deportivas-para-el-sabado-dg5er4?utm_source=facebook&utm_medium=social&utm_campaign=posteo&utm_content=dg5er4
// y con el enlace corto, que sigue diciendo de qué red viene y a qué pieza corresponde:
//   https://radarbalcarce.com/r/f/dg5er4
//
// Este archivo es LA gramática del enlace, y la comparten dos lados que no se hablan: el generador de textos de las redes (acá abajo,
// `enlaceCorto`) y el Worker que redirige (infra/enlaces-cloudflare/worker.mjs, que importa `analizarCodigo` y `destinoDeLaVisita`).
// Si cambia, cambia en un solo lugar.
//
//   /r/<red>/<destino>
//     red      una letra: f Facebook, i Instagram, h Threads, x X, t Telegram, b Bluesky, y YouTube, k TikTok, w WhatsApp
//     destino  · el identificador de una nota (`dg5er4`, de 3 a 16 letras y números)                  → campaña "posteo"
//              · el repaso de un turno (`repaso20261017manana`; también tarde y noche)                → campaña "repaso"
//              · una pieza de servicio (`clima-manana`, `clima-noche`, `farmacia`, `aviso-viento`…)  → campaña "servicio"
//
// El interruptor es la variable `ENLACES_CORTOS` ("Si"): vacía o apagada, todo sale como siempre (con las UTM largas). Se prende DESPUÉS de
// poner la ruta del Worker y probar un enlace: un enlace corto que ya salió tiene que seguir andando para siempre, así que la ruta nunca se saca.
//
// Sin dependencias: sólo lo que trae Node (y anda tal cual dentro de un Worker).

/** La letra de cada red en el enlace. */
export const LETRAS_DE_RED = {
  facebook: 'f', instagram: 'i', threads: 'h', x: 'x', telegram: 't', bluesky: 'b', youtube: 'y', tiktok: 'k', whatsapp: 'w',
};
/** Al revés: letra → nombre de la red (el `utm_source` que le toca). */
export const RED_DE_LETRA = Object.fromEntries(Object.entries(LETRAS_DE_RED).map(([red, letra]) => [letra, red]));

/** Lo que el repaso de cada turno llama internamente (`pieza.nombre`, redes/piezas.mjs) — es el `utm_content` del enlace largo. */
export const PIEZA_DEL_TURNO = { manana: 'noticia1', tarde: 'noticia2', noche: 'podcast' };

/** Las piezas de servicio que tienen su página en el sitio (regla 210, redes/piezas.mjs SERVICIOS_CON_PAGINA): nombre de la pieza → camino. */
export const CAMINO_DE_SERVICIO = (nombre) => {
  const n = String(nombre ?? '');
  if (/^(clima-(manana|noche)|aviso-[a-z]{3,20})$/.test(n)) return '/clima';
  if (n === 'farmacia') return '/farmacias';
  return null;
};

const ID_DE_NOTA = /^[a-z0-9]{3,16}$/;
const REPASO = /^repaso(\d{8})(manana|tarde|noche)$/;

/**
 * Qué dice un código `/r/<red>/<destino>`. Devuelve { red, letra, tipo: 'nota' | 'repaso' | 'servicio', destino, campana, contenido } o null si no es un
 * código de los nuestros. `contenido` es el `utm_content` que tenía el enlace largo. El repaso se mira primero porque su nombre también cabe en
 * "una palabra de letras y números".
 */
export function analizarCodigo(camino) {
  const m = /^\/r\/([a-z])\/([a-z0-9-]{3,40})\/?$/.exec(String(camino ?? ''));
  if (!m) return null;
  const red = RED_DE_LETRA[m[1]];
  if (!red) return null;
  const destino = m[2];
  const rep = REPASO.exec(destino);
  if (rep) return { red, letra: m[1], tipo: 'repaso', destino, campana: 'repaso', contenido: PIEZA_DEL_TURNO[rep[2]] };
  if (CAMINO_DE_SERVICIO(destino)) return { red, letra: m[1], tipo: 'servicio', destino, campana: 'servicio', contenido: destino };
  if (ID_DE_NOTA.test(destino)) return { red, letra: m[1], tipo: 'nota', destino, campana: 'posteo', contenido: destino };
  return null;
}

/**
 * A dónde manda un código ya analizado: { camino, utm } con el camino dentro del sitio y las UTM de siempre (utm_source = la red, utm_medium
 * social, utm_campaign y utm_content). `parteDeLaNota` (por ejemplo `la-plata-concentra…-dg5er4`) es lo que el Worker sacó de /nota/indice.json; sin ella
 * la nota se pide por su identificador (`/nota/<id>`: el archivo permanente la redirige a su dirección buena).
 */
export function destinoDeLaVisita(codigo, { parteDeLaNota = null } = {}) {
  if (!codigo) return null;
  const camino = codigo.tipo === 'nota' ? `/nota/${parteDeLaNota || codigo.destino}`
    : codigo.tipo === 'repaso' ? `/nota/${codigo.destino}`
      : CAMINO_DE_SERVICIO(codigo.destino);
  return {
    camino,
    utm: { utm_source: codigo.red, utm_medium: 'social', utm_campaign: codigo.campana, utm_content: codigo.contenido },
  };
}

// ------------------------------------------------------------- el interruptor

const esSi = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase() === 'si';

let fijado = null; // null = mirar el entorno; true/false = lo fijó quien publica (`main`)

/** Fija el interruptor desde el entorno que recibe quien publica (un Worker no tiene `process.env` a la vista al importar). */
export function fijarEnlacesCortos(valor) {
  fijado = esSi(valor);
}
/** Vuelve a mirar el entorno (para las pruebas). */
export function soltarEnlacesCortos() {
  fijado = null;
}
/** ¿Están prendidos los enlaces cortos? Apagados por defecto. */
export function hayEnlacesCortos() {
  if (fijado !== null) return fijado;
  return typeof process !== 'undefined' && esSi(process.env?.ENLACES_CORTOS);
}

// ------------------------------------------------------------- el generador

/**
 * El enlace corto para un enlace largo NUESTRO de una nota, un repaso o un servicio, o null si no se puede (otra red, otro sitio, una página que no
 * es de las tres): en ese caso quien llama deja el enlace largo con sus UTM de siempre.
 *
 * @param {string} enlace    la dirección limpia (`https://radarbalcarce.com/nota/titular-ID`, `…/nota/repaso20261017manana`, `…/clima`)
 * @param {{ fuente: string, campana: string, contenido?: string }} o  la red (nombre), la campaña y la pieza
 */
export function enlaceCorto(enlace, { fuente, campana, contenido } = {}) {
  const letra = LETRAS_DE_RED[String(fuente ?? '').toLowerCase()];
  if (!letra || !enlace) return null;
  let u;
  try { u = new URL(enlace); } catch { return null; }
  const base = `${u.origin}/r/${letra}`;
  const nota = /^\/nota\/([a-z0-9-]+)$/.exec(u.pathname.replace(/\/+$/, ''));
  if (nota && campana === 'repaso' && REPASO.test(nota[1])) return `${base}/${nota[1]}`;
  if (nota && campana === 'posteo') {
    const id = nota[1].slice(nota[1].lastIndexOf('-') + 1);
    return ID_DE_NOTA.test(id) ? `${base}/${id}` : null;
  }
  const servicio = (u.pathname === '/clima' || u.pathname === '/farmacias') && campana === 'servicio';
  if (servicio && CAMINO_DE_SERVICIO(contenido) === u.pathname) return `${base}/${contenido}`;
  return null;
}

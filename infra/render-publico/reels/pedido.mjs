// El pedido de video: lo que el repositorio principal le manda al repositorio público de render (18/10/2026; docs/07-REDES.md,
// «El video, como módulo aparte», y docs/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md).
//
// El principal decide QUÉ sale (la pieza, su guion, su placa, su escena) y pide la voz a Gemini (clave secreta); el render sólo DIBUJA y ARMA el video
// (resvg y ffmpeg), sin ninguna clave y sin ningún archivo del proyecto. Todo lo que necesita viaja en este pedido, que es público: un guion que va a
// salir al aire, las placas ya dibujadas y la voz. Una pieza que espera a una persona (Política, Policiales) no llega acá hasta que se aprueba.
//
//   pedido.json   { version, nombre, tipo, guion, texto, acento, placa, segunda, escena, secuencia, opciones, voz }
//   voz.mp3       el audio que dio Gemini (el render lo alinea con el texto: reels/alinear.mjs, sólo ffmpeg)
//
// `huella` es el resumen del pedido (con el de la voz adentro): el mismo pedido da el mismo video, y por eso sirve de nombre de la carpeta de trabajo y de
// memoria (no se vuelve a dibujar lo que ya se dibujó). Este archivo es puro (sin red ni disco), lo usan los dos lados.

import crypto from 'node:crypto';
import { paraLeer } from './voz.mjs';

export const VERSION_DEL_PEDIDO = 1;
export const TIPOS_DE_PIEZA = ['reel', 'historia'];
/** Un nombre de pieza ("clima-manana", "noticia1"): sólo minúsculas, números y guiones. Va a nombres de archivo: nada de barras ni puntos. */
export const NOMBRE_VALIDO = /^[a-z0-9][a-z0-9-]{0,39}$/;
/** El pedido entero no puede pasar de esto (la secuencia de un repaso lleva las fotos adentro de los SVG). */
export const BYTES_MAXIMOS_DEL_PEDIDO = 12 * 1024 * 1024;
export const NOMBRE_DE_LA_VOZ = 'voz.mp3';

const sha256 = (datos) => crypto.createHash('sha256').update(datos).digest('hex');

/** JSON con las claves ordenadas: el mismo pedido da siempre el mismo texto (y la misma huella). */
export function jsonCanonico(valor) {
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor);
  if (Array.isArray(valor)) return `[${valor.map(jsonCanonico).join(',')}]`;
  return `{${Object.keys(valor).sort().filter((k) => valor[k] !== undefined).map((k) => `${JSON.stringify(k)}:${jsonCanonico(valor[k])}`).join(',')}}`;
}

/**
 * Arma el pedido de una pieza (todavía sin voz). `escena` es la escena que arma reels/escenas/del-plan.mjs (se manda su descriptor, no la función) y
 * `secuencia` la del repaso ({ placas: [{ svg, marca }], tapa }).
 */
export function armarPedido({
  nombre, tipo, guion, svg, svg2 = null, acento = '#E8A33C', escena = null, secuencia = null, animar = true, historiaMaxima, fps = 30,
}) {
  return {
    version: VERSION_DEL_PEDIDO,
    nombre,
    tipo,
    guion,
    texto: paraLeer(guion),
    acento,
    placa: svg,
    segunda: svg2,
    escena: escena?.descriptor ?? null,
    secuencia: secuencia ? { placas: secuencia.placas.map((p) => ({ svg: p.svg, marca: p.marca ?? null })), tapa: secuencia.tapa ?? null } : null,
    opciones: { animar: Boolean(animar), historiaMaxima, fps },
  };
}

/** Le suma la voz (los bytes del mp3): su tamaño y su huella digital, que el render controla antes de usarla. */
export function conVoz(pedido, bytesDeLaVoz) {
  return { ...pedido, voz: { archivo: NOMBRE_DE_LA_VOZ, bytes: bytesDeLaVoz.length, sha256: sha256(bytesDeLaVoz) } };
}

/** El resumen corto del pedido (24 letras y números): lo mismo en, lo mismo afuera. */
export const huellaDelPedido = (pedido) => sha256(jsonCanonico(pedido)).slice(0, 24);

/**
 * Lo que el manifiesto de piezas (reels/salida/piezas.json, lo que lee redes/publicar.mjs) dice de una pieza ANTES de tener el video: el nombre, a qué hora
 * sale, de qué notas habla. Con el archivo y la duración que deja el render se completa la entrada. La misma forma que arma reels/plan.mjs.
 */
export function entradaDelManifiesto({
  nombre, tipo, hora, titulo, notaId = null, notaIds = [], items = [], reelEnFacebook = false,
}) {
  return {
    nombre, tipo, hora, titulo, notaId: notaId ?? null, notaIds: notaIds ?? [], items: items ?? [], ...(reelEnFacebook ? { reelEnFacebook: true } : {}),
  };
}

/** Los archivos que el render tiene que dejar para ese pedido, por nombre (lo que se firma para subir). */
export function archivosDeSalida(nombre) {
  return [`${nombre}.mp4`, `${nombre}-historia.mp4`, `${nombre}.png`, `${nombre}.ass`, 'manifiesto.json'];
}

/** Revisa un pedido que llegó de afuera. Devuelve la lista de problemas (vacía = bien). Nada de esto se confía: el pedido viene por la red. */
export function problemasDelPedido(p, { funcionesDeEscena = null } = {}) {
  const e = [];
  if (!p || typeof p !== 'object') return ['el pedido no es un objeto'];
  if (p.version !== VERSION_DEL_PEDIDO) e.push(`versión ${p.version} (este render entiende la ${VERSION_DEL_PEDIDO})`);
  if (!NOMBRE_VALIDO.test(String(p.nombre ?? ''))) e.push('el nombre de la pieza no es válido (minúsculas, números y guiones)');
  if (!TIPOS_DE_PIEZA.includes(p.tipo)) e.push(`el tipo tiene que ser ${TIPOS_DE_PIEZA.join(' o ')}`);
  if (typeof p.guion !== 'string' || !p.guion.trim()) e.push('falta el guion');
  else if (typeof p.texto !== 'string' || paraLeer(p.guion) !== p.texto) e.push('el texto que se dice no es el del guion (el render y el principal no leen igual)');
  if (!/^#[0-9a-fA-F]{6}$/.test(String(p.acento ?? ''))) e.push('el color del acento no es #RRGGBB');
  const esSvg = (s) => typeof s === 'string' && /^\s*<svg[\s>]/.test(s) && /<\/svg>\s*$/.test(s);
  if (!esSvg(p.placa)) e.push('falta la placa (un SVG)');
  if (p.segunda != null && !esSvg(p.segunda)) e.push('la segunda placa no es un SVG');
  if (p.escena != null) {
    if (typeof p.escena.fn !== 'string') e.push('la escena no dice qué función la dibuja');
    else if (funcionesDeEscena && !Object.prototype.hasOwnProperty.call(funcionesDeEscena, p.escena.fn)) e.push(`escena desconocida: ${p.escena.fn.slice(0, 40)}`);
  }
  if (p.secuencia != null) {
    if (!Array.isArray(p.secuencia.placas) || p.secuencia.placas.length < 2) e.push('la secuencia necesita al menos dos placas');
    else if (!p.secuencia.placas.every((x) => esSvg(x?.svg))) e.push('alguna placa de la secuencia no es un SVG');
  }
  const o = p.opciones ?? {};
  if (typeof o.animar !== 'boolean') e.push('opciones.animar tiene que ser verdadero o falso');
  if (!Number.isFinite(o.historiaMaxima) || o.historiaMaxima < 10 || o.historiaMaxima > 90) e.push('opciones.historiaMaxima fuera de rango');
  if (!Number.isFinite(o.fps) || o.fps < 15 || o.fps > 60) e.push('opciones.fps fuera de rango');
  if (p.voz?.archivo !== NOMBRE_DE_LA_VOZ || !/^[0-9a-f]{64}$/.test(String(p.voz?.sha256 ?? '')) || !(p.voz?.bytes > 0)) e.push('falta la voz (archivo, tamaño y huella)');
  if (Buffer.byteLength(JSON.stringify(p)) > BYTES_MAXIMOS_DEL_PEDIDO) e.push('el pedido es demasiado grande');
  return e;
}

export { sha256 };

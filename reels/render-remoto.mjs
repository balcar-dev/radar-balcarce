// Armar una pieza de video MANDÁNDOLA al repositorio público de render (18/10/2026; docs/07-REDES.md, «El video, como módulo aparte»).
//
// Es el reemplazo de `armarReel` (reels/reel.mjs) cuando se corre con `RENDER_REMOTO=Si` (el workflow «Piezas de redes», redes-piezas.yml): hace la parte
// que necesita secretos —pedir la voz a Gemini— y le deja todo lo demás al render:
//
//   1. pide la voz a Gemini (reels/voz-gemini.mjs: con su cupo de 10 audios por día y su memoria, igual que siempre; nunca con otra voz);
//   2. arma el pedido (reels/pedido.mjs): el guion, las placas, la escena, la secuencia y la huella de la voz;
//   3. sube a R2 (depósito `radar-render`) `pedidos/<huella>/pedido.json`, `voz.mp3` y `meta.json` (con lo que el manifiesto de piezas necesita saber);
//   4. firma direcciones temporales (1 hora): una para bajar el pedido y la voz, y una para subir cada archivo que el render tiene que dejar en
//      `listos/<huella>/`. El render no tiene ninguna clave: sólo esas direcciones, que valen para UN objeto y UN verbo;
//   5. despierta al repositorio de render (`repository_dispatch`, tipo «render») y sigue. NO espera el video: lo publica el Worker de tareas en la
//      vuelta siguiente del reloj de Redes (infra/tareas-cloudflare/redes.mjs), cuando el render dejó el manifiesto.
//
// Si el mismo pedido ya se renderizó (hay manifiesto en R2) no se vuelve a pedir. Si algo falla ANTES de la voz, la pieza no sale y el reloj la vuelve a
// pedir; después de la voz, la voz queda en la memoria (VOZ_CACHE) y un reintento no gasta otro audio.
//
// Los secretos que usa (nunca se imprimen): GEMINI_API_KEY_REDES, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, CLOUDFLARE_ACCOUNT_ID y RENDER_GITHUB_TOKEN
// (un token de grano fino SÓLO para el repositorio de render, con «Contents: lectura y escritura» —lo que pide `repository_dispatch`—).

import fs from 'node:fs';
import path from 'node:path';
import { diaAR } from '../ingesta/zona.mjs';
import { paraLeer } from './voz.mjs';
import { clienteR2 } from '../infra/compartido/r2-s3.mjs';
import { crearGithub } from '../infra/compartido/github.mjs';
import {
  armarPedido, conVoz, huellaDelPedido, archivosDeSalida, entradaDelManifiesto, problemasDelPedido, jsonCanonico, sha256, NOMBRE_DE_LA_VOZ,
} from './pedido.mjs';
import { HISTORIA_MAXIMA } from './duracion.mjs';

export const REPOSITORIO_DE_RENDER = 'radarbalcarce/radar-balcarce-render';
export const TIPO_DE_AVISO = 'render';
export const VIGENCIA_DE_LAS_DIRECCIONES_SEG = 3600;
const TIPOS = { mp4: 'video/mp4', png: 'image/png', ass: 'text/plain; charset=utf-8', json: 'application/json' };
const tipoDe = (archivo) => TIPOS[archivo.split('.').pop()] ?? 'application/octet-stream';

/** El cliente de R2 y el del repositorio de render, desde el entorno. Lanza un error claro si falta algo. */
export function dependenciasDelEntorno(env = process.env) {
  const falta = ['CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_RENDER', 'RENDER_GITHUB_TOKEN'].filter((n) => !String(env[n] ?? '').trim());
  if (falta.length) throw new Error(`faltan variables para mandar el video al render: ${falta.join(', ')}`);
  return {
    r2: clienteR2({ cuenta: env.CLOUDFLARE_ACCOUNT_ID, bucket: env.R2_RENDER.trim(), accessKey: env.R2_ACCESS_KEY_ID, secretKey: env.R2_SECRET_ACCESS_KEY }),
    render: crearGithub({ token: env.RENDER_GITHUB_TOKEN, repo: (env.RENDER_REPOSITORIO ?? '').trim() || REPOSITORIO_DE_RENDER }),
  };
}

/**
 * Deja el pedido en R2 y despierta al render. Devuelve { huella, yaListo }. No espera nada. `entrada` es lo que el manifiesto de piezas necesita saber de la
 * pieza (reels/pedido.mjs, entradaDelManifiesto); el Worker de tareas lo junta con lo que dice el render (archivo y duración) al publicar.
 */
export async function enviarAlRender({ pedido, voz, entrada, r2, render, ahora = new Date(), log = console.log }) {
  const errores = problemasDelPedido(pedido);
  if (errores.length) throw new Error(`el pedido de ${pedido?.nombre} no está bien armado: ${errores.join('; ')}`);
  const huella = huellaDelPedido(pedido);
  const base = `pedidos/${huella}`;
  if (await r2.existe(`listos/${huella}/manifiesto.json`)) { log(`  (el render de ${pedido.nombre} ya está listo: ${huella})`); return { huella, yaListo: true }; }

  await r2.guardar(`${base}/${NOMBRE_DE_LA_VOZ}`, voz, 'audio/mpeg');
  await r2.guardar(`${base}/pedido.json`, jsonCanonico(pedido), 'application/json');
  await r2.guardar(`${base}/meta.json`, JSON.stringify({ armada: ahora.toISOString(), dia: diaAR(ahora), entrada }), 'application/json');

  const subidas = {};
  for (const archivo of archivosDeSalida(pedido.nombre)) subidas[archivo] = await r2.firmar(`listos/${huella}/${archivo}`, { metodo: 'PUT', expira: VIGENCIA_DE_LAS_DIRECCIONES_SEG });
  const aviso = {
    huella,
    nombre: pedido.nombre,
    pedido: await r2.firmar(`${base}/pedido.json`, { metodo: 'GET', expira: VIGENCIA_DE_LAS_DIRECCIONES_SEG }),
    voz: await r2.firmar(`${base}/${NOMBRE_DE_LA_VOZ}`, { metodo: 'GET', expira: VIGENCIA_DE_LAS_DIRECCIONES_SEG }),
    subidas,
  };
  await render.avisar(TIPO_DE_AVISO, aviso);
  log(`  enviada al render: ${pedido.nombre} (${huella})`);
  return { huella, yaListo: false };
}

/**
 * Lo mismo que `armarReel` (reels/reel.mjs) pero sin armar el video: pide la voz, arma el pedido y lo manda. Devuelve { pendiente: true, huella, ... }:
 * el plan (reels/plan.mjs) sabe que esa pieza no tiene video todavía y no la anota en el manifiesto.
 */
export async function armarReelRemoto({
  nombre, tipo, svg, svg2 = null, guion, acento = '#E8A33C', indicacion = null, vozGemini = null, hablar = null, animar = process.env.REELS_ANIMADOS !== 'no',
  escena = null, secuencia = null, reservarVoz = 0, entrada = null, hora, titulo, notaId, notaIds, items, reelEnFacebook,
}, dir, {
  env = process.env, ahora = new Date(), log = console.log, dependencias = null,
} = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const mp3 = path.join(dir, `${nombre}.mp3`);
  const texto = paraLeer(guion);
  // La voz: la de Gemini, con las mismas reglas y los mismos mensajes que en armarReel (nunca con otra voz; sin cupo, la pieza no sale).
  const { decirGemini } = hablar ? { decirGemini: hablar } : await import('./voz-gemini.mjs');
  const { componerIndicacion, vozDePieza } = await import('../redes/prompt-redes.mjs');
  try {
    await decirGemini(texto, mp3, { voz: vozGemini ?? vozDePieza(nombre), indicacion: componerIndicacion(indicacion), pieza: nombre, reservar: reservarVoz });
  } catch (e) {
    if (e.sinCupo) throw new Error(`sin voz: ${e.message.slice(0, 160)}. La pieza no sale con otra voz`);
    throw new Error(`Gemini no respondió (${e.message.slice(0, 80)}): la pieza no sale con otra voz, se reintenta en la próxima vuelta`);
  }
  const voz = fs.readFileSync(mp3);
  const pedido = conVoz(armarPedido({
    nombre, tipo: tipo ?? 'historia', guion, svg, svg2, acento, escena, secuencia, animar, historiaMaxima: HISTORIA_MAXIMA,
  }), voz);
  const { r2, render } = dependencias ?? dependenciasDelEntorno(env);
  const r = await enviarAlRender({
    pedido, voz, entrada: entrada ?? entradaDelManifiesto({ nombre, tipo, hora, titulo, notaId, notaIds, items, reelEnFacebook }), r2, render, ahora, log,
  });
  return { pendiente: true, huella: r.huella, yaListo: r.yaListo, mp4: null, mp3, duracion: 0, historia: null, vozUsada: 'gemini' };
}

/**
 * Una pieza FIJA (reels/fijas/: armada de antemano, no gasta voz) no necesita render: el video ya existe. Se sube tal cual a `listos/<huella>/` con su
 * manifiesto, y el Worker de tareas la publica en su hora como a cualquier otra. La huella es de la pieza, su vigencia y el día (una por día).
 */
export async function subirPiezaFija({ p, archivoMp4, duracion, hasta, r2, ahora = new Date(), log = console.log }) {
  const dia = diaAR(ahora);
  const huella = sha256(`fija:${p.nombre}:${hasta}:${dia}`).slice(0, 24);
  if (!(await r2.existe(`listos/${huella}/manifiesto.json`))) {
    await r2.guardar(`pedidos/${huella}/meta.json`, JSON.stringify({ armada: ahora.toISOString(), dia, entrada: entradaDelManifiesto(p), fija: true }), 'application/json');
    await r2.guardar(`listos/${huella}/${p.nombre}.mp4`, fs.readFileSync(archivoMp4), 'video/mp4');
    await r2.guardar(`listos/${huella}/manifiesto.json`, JSON.stringify({ nombre: p.nombre, archivo: `${p.nombre}.mp4`, duracion: Number(Number(duracion).toFixed(1)), huella, fija: true }), 'application/json');
    log(`  pieza fija subida: ${p.nombre} (${huella})`);
  }
  return { pendiente: true, huella, mp4: null, duracion: 0, historia: null, vozUsada: `fija hasta el ${hasta}, no gasta voz` };
}

export { tipoDe };

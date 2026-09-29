// Voz por Gemini 3.8 (Interactions API). Desde el 28/09 Radar Balcarce tiene dos
// voces propias, creadas con Voice Design (reels/crear-voces.mjs) y guardadas en el
// proyecto de Google con un identificador fijo (voice_…): la locutora y el locutor.
// Cada pieza usa siempre la misma (CRITERIO-REDES.md, sección 6).
//
// El pedido separa el TEXTO, que la voz lee literal, del ESTILO, un campo aparte
// (speech_metadata.style), corto y en inglés. Ya no hay indicaciones largas
// mezcladas con el guion: con el formato anterior el modelo 3.8 las leía en voz
// alta (el 28/09 el podcast duró 140 s en vez de 35).
//
// La clave es la de REDES: GEMINI_API_KEY_REDES, en el entorno o en el .env de
// la raíz. Es distinta de la que redacta las notas (ver claves.mjs), para que
// los reels no gasten el cupo de la redacción. Nunca se escribe en el código.

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
import { alinear } from './alinear.mjs';
import { claveRedes } from './claves.mjs';
import { VOCES, INDICACION_BASE } from '../redes/prompt-redes.mjs';

const correr = promisify(execFile);

// El modelo de voz definitivo de Google (23/09/2026). El de antes,
// gemini-2.5-flash-preview-tts, era "de prueba" y no respetaba el texto al pie de la
// letra ("Buenos días" por "Buen día").
export const MODELO = 'gemini-3.8-flash-tts';
export const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';

export function clave() {
  return claveRedes();
}

/** Por si nadie elige: habla la locutora, con el estilo de siempre. */
export const VOZ_POR_DEFECTO = VOCES.locutora;
export const ESTILO_POR_DEFECTO = INDICACION_BASE;

const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });

// La clave de redes es PAGA (desde el 25/09): no hay cupo diario gratis que
// contar. Igual Google puede limitar pedidos por minuto, así que las llamadas se
// espacian un poco y, si salta el límite (429), se espera lo que pide Google y
// se reintenta. Nunca conviene disparar una atrás de la otra.
let ultimoPedido = 0;
const ESPACIADO = 2000; // dos segundos entre pedidos alcanzan con la clave paga
// Una voz de diez segundos tarda unos pocos en generarse; un podcast, más.
// Dos minutos es de sobra, y corta un pedido que se quedó colgado.
export const ESPERA_MAXIMA_VOZ = 120_000;

// La voz no puede tardar mucho más de lo que lleva decir el texto (28/09).
// Probando el modelo 3.8 pasaron dos cosas: con el pedido mal armado el podcast
// de 81 palabras duró 140 s (leyó las indicaciones), y una vez el clima de 47
// palabras duró 35 s (lo leyó dos veces). La voz lee a 2,1 a 2,9 palabras por
// segundo; por debajo de 1,8 (más tres segundos de margen) leyó algo que no
// estaba en el guion, y ese audio nunca sale: se pide de nuevo.
export const RITMO_MINIMO_VOZ = 1.8;
export const MARGEN_VOZ_SEGUNDOS = 3;

/** Si un audio de `segundos` es demasiado largo para `texto`: devuelve el
 *  motivo, o null si está bien. */
export function vozDeMas(texto, segundos) {
  const palabras = String(texto).trim().split(/\s+/).filter(Boolean).length;
  const maximo = palabras / RITMO_MINIMO_VOZ + MARGEN_VOZ_SEGUNDOS;
  return segundos > maximo
    ? `la voz duró ${segundos.toFixed(0)} s para ${palabras} palabras (máximo ${maximo.toFixed(0)} s): leyó algo que no estaba en el texto`
    : null;
}

/** ¿La respuesta 429 es del límite por DÍA (GenerateRequestsPerDay…) y no del de por minuto? */
export const esCupoDelDia = (cuerpo) => /PerDay/i.test(String(cuerpo));

/** El cuerpo del pedido: el texto literal y, aparte, el estilo; la voz por su
 *  identificador. Sin `systemInstruction`: el modelo no lo acepta. */
export function pedidoDeVoz({ texto, voz = VOZ_POR_DEFECTO, estilo = ESTILO_POR_DEFECTO }) {
  return {
    model: MODELO,
    input: [{
      type: 'user_input',
      content: [{ type: 'text', text: texto, annotations: [{ type: 'speech_metadata', style: estilo }] }],
    }],
    response_format: { type: 'audio' },
    generation_config: { speech_config: [{ voice: voz }] },
  };
}

/** El audio (base64) de la respuesta: el último trozo de audio que devuelve. */
export function audioDeLaRespuesta(json) {
  const audios = [];
  const buscar = (n) => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'audio' && typeof n.data === 'string') audios.push(n.data);
    for (const v of Object.values(n)) buscar(v);
  };
  buscar(json);
  return audios.length ? audios[audios.length - 1] : null;
}

/** Cuántos segundos dura un WAV de 24 kHz, mono, 16 bits (busca el trozo "data"). */
export function segundosDeWav(buf) {
  let p = 12;
  while (p + 8 <= buf.length) {
    const nombre = buf.toString('ascii', p, p + 4);
    const largo = buf.readUInt32LE(p + 4);
    if (nombre === 'data') return Math.min(largo, buf.length - p - 8) / 48000;
    p += 8 + largo;
  }
  return buf.length / 48000;
}

/**
 * Sintetiza con Gemini. Devuelve { archivo, duracion, palabras }, con los
 * tiempos de cada palabra resueltos por alineación (ver alinear.mjs).
 * `voz` es el identificador de la voz de la pieza (vozDePieza, redes/prompt-redes.mjs)
 * e `indicacion`, el estilo corto (componerIndicacion).
 */
export async function decirGemini(texto, destino, {
  voz = VOZ_POR_DEFECTO, indicacion = ESTILO_POR_DEFECTO, intentos = 4, fetchFn = fetch,
} = {}) {
  const k = clave();
  if (!k) throw new Error('falta GEMINI_API_KEY_REDES (en el entorno o en .env)');
  fs.mkdirSync(path.dirname(destino), { recursive: true });

  let ultimoError = null;
  for (let intento = 1; intento <= intentos; intento += 1) {
    const esperar = Math.max(0, ultimoPedido + ESPACIADO - Date.now());
    if (esperar) await dormir(esperar);
    ultimoPedido = Date.now();

    // La clave va en el encabezado, no en la dirección (`?key=`): una
    // dirección termina en registros y en mensajes de error. Y el pedido
    // tiene tiempo máximo: uno colgado dejaba el reloj de Redes esperando
    // hasta que GitHub lo mataba, sin publicar nada.
    let res;
    try {
      res = await fetchFn(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': k },
        body: JSON.stringify(pedidoDeVoz({ texto, voz, estilo: indicacion })),
        signal: AbortSignal.timeout(ESPERA_MAXIMA_VOZ),
      });
    } catch (e) {
      // Sin respuesta (se cortó por tiempo o no hay red): se reintenta como
      // un 5xx, y si era el último intento, se avisa.
      ultimoError = new Error(`Gemini no respondió: ${e.name === 'TimeoutError' ? `más de ${ESPERA_MAXIMA_VOZ / 1000} segundos` : e.message}`);
      if (intento < intentos) { await dormir(4000 * intento); continue; }
      throw ultimoError;
    }

    if (res.status === 429) {
      const cuerpo = await res.text();
      const seg = +(cuerpo.match(/"retryDelay":\s*"(\d+)s"/)?.[1] ?? 30);
      ultimoError = new Error(`Gemini pidió esperar (429, límite de pedidos): ${cuerpo.slice(0, 300)}`);
      // Con una clave gratis (10 audios por día y por modelo) el límite del DÍA no se arregla
      // esperando: reintentar sólo gasta tiempo. Se corta acá y la pieza espera a la próxima vuelta.
      if (esCupoDelDia(cuerpo)) throw new Error(`Gemini: se acabó el cupo del día (429). ${cuerpo.slice(0, 200)}`);
      if (intento < intentos) { await dormir((seg + 2) * 1000); continue; }
      throw ultimoError;
    }
    if (!res.ok) {
      ultimoError = new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      // 500, 502, 503 y 504 son "el servicio está ocupado o se cayó un momento":
      // vale la pena esperar y volver a pedir antes de resignarse. El 402 es que se
      // acabó el crédito (28/09): no se arregla reintentando.
      if (res.status >= 500 && intento < intentos) { await dormir(4000 * intento); continue; }
      throw ultimoError;
    }

    const j = await res.json();
    const datos = audioDeLaRespuesta(j);
    if (!datos) {
      // El modelo de voz a veces contesta sin audio y al pedir de nuevo el mismo
      // texto responde bien (se vio el 21/09 con el modelo anterior).
      ultimoError = new Error(`sin audio en la respuesta: ${JSON.stringify(j).slice(0, 200)}`);
      if (intento < intentos) { await dormir(3000 * intento); continue; }
      throw ultimoError;
    }

    // Viene un WAV de 24 kHz, mono, 16 bits: 48.000 bytes por segundo.
    const wav = Buffer.from(datos, 'base64');
    const deMas = vozDeMas(texto, segundosDeWav(wav));
    if (deMas) {
      ultimoError = new Error(deMas);
      if (intento < intentos) { await dormir(3000 * intento); continue; }
      throw ultimoError;
    }
    const crudo = `${destino}.wav`;
    fs.writeFileSync(crudo, wav);
    await correr(ffmpeg, ['-y', '-v', 'error', '-i', crudo, '-b:a', '128k', destino]);
    fs.rmSync(crudo, { force: true });

    const { palabras, duracion, anclasUsadas } = await alinear(texto, destino);
    return { archivo: destino, duracion, palabras, anclasUsadas };
  }
  throw ultimoError ?? new Error('no se pudo sintetizar');
}

// Voz por Gemini. A diferencia de las otras, a ésta se le puede pedir el
// TONO en palabras: no elegís una voz de catálogo, le explicás cómo leer.
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
import { VOZ_NOMBRE, INDICACION_BASE } from '../redes/prompt-redes.mjs';

const correr = promisify(execFile);
const RAIZ = path.join(import.meta.dirname, '..');
const MODELO = 'gemini-2.5-flash-preview-tts';

export function clave() {
  return claveRedes();
}

// Cómo suena el medio: la voz (Kore) y la indicación de siempre se leen de
// CRITERIO-REDES.md (sección 6) y no se repiten acá: hay UNA sola locutora.
export const VOZ_DEL_MEDIO = VOZ_NOMBRE;
export const INDICACION = INDICACION_BASE;

const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });

// --- cuota ------------------------------------------------------------------
// Google no expone cuánto te queda, así que lo llevamos nosotros. El cupo del
// plan gratuito para este modelo es de 10 pedidos y se renueva a la medianoche
// de California, o sea entre las 4 y las 5 de la mañana de acá.
export const CUPO_DIARIO = 10;
const REGISTRO = path.join(RAIZ, 'panel', 'datos', 'cuota-gemini.json');

function diaDeCuota(d = new Date()) {
  // Pasamos a hora del Pacífico para saber a qué "día de Google" pertenece.
  return new Date(d.getTime() - 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function leerRegistro() {
  try { return JSON.parse(fs.readFileSync(REGISTRO, 'utf8')); } catch { return {}; }
}

function anotarPedido(ok) {
  const r = leerRegistro();
  const dia = diaDeCuota();
  r[dia] ??= { pedidos: 0, fallados: 0 };
  r[dia].pedidos += 1;
  if (!ok) r[dia].fallados += 1;
  // Sólo guardamos los últimos días, no hace falta más.
  const dias = Object.keys(r).sort().slice(-7);
  const podado = {};
  dias.forEach((d) => { podado[d] = r[d]; });
  fs.mkdirSync(path.dirname(REGISTRO), { recursive: true });
  fs.writeFileSync(REGISTRO, JSON.stringify(podado, null, 2), 'utf8');
}

// El plan gratuito limita pedidos por minuto, así que las llamadas se espacian
// solas y, si igual salta el límite, se espera y se reintenta. Nunca conviene
// disparar una atrás de la otra.
let ultimoPedido = 0;
const ESPACIADO = 2000; // la clave de redes es paga: no hay cupo gratis que cuidar
// Una voz de diez segundos tarda unos pocos en generarse; un podcast, más.
// Dos minutos es de sobra, y corta un pedido que se quedó colgado.
export const ESPERA_MAXIMA_VOZ = 120_000;

/**
 * Sintetiza con Gemini. Devuelve { archivo, duracion, palabras }, con los
 * tiempos de cada palabra resueltos por alineación (ver alinear.mjs).
 */
export async function decirGemini(texto, destino, {
  voz = VOZ_DEL_MEDIO, indicacion = INDICACION, intentos = 4, fetchFn = fetch,
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
      res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': k },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${indicacion}\n\n${texto}` }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } },
          },
        }),
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
      anotarPedido(false);
      const cuerpo = await res.text();
      const seg = +(cuerpo.match(/"retryDelay":\s*"(\d+)s"/)?.[1] ?? 30);
      ultimoError = new Error(`límite del plan gratuito: ${cuerpo.slice(0, 300)}`);
      if (intento < intentos) { await dormir((seg + 2) * 1000); continue; }
      throw ultimoError;
    }
    if (!res.ok) {
      anotarPedido(false);
      ultimoError = new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      // 500, 502, 503 y 504 son "el servicio está ocupado o se cayó un momento":
      // vale la pena esperar y volver a pedir antes de resignarse.
      if (res.status >= 500 && intento < intentos) { await dormir(4000 * intento); continue; }
      throw ultimoError;
    }
    anotarPedido(true);

    const j = await res.json();
    const parte = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!parte) {
      // El modelo de voz a veces contesta sin audio (finishReason "OTHER") y al
      // pedir de nuevo el mismo texto responde bien. Se vio el 21/09 en GitHub:
      // una pieza cayó a Elena por un único intento fallido.
      ultimoError = new Error(`sin audio en la respuesta: ${JSON.stringify(j).slice(0, 200)}`);
      if (intento < intentos) { await dormir(3000 * intento); continue; }
      throw ultimoError;
    }

    // Viene PCM 16 bits a 24 kHz, mono, sin cabecera.
    const crudo = `${destino}.pcm`;
    fs.writeFileSync(crudo, Buffer.from(parte.inlineData.data, 'base64'));
    await correr(ffmpeg, ['-y', '-v', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1',
      '-i', crudo, '-b:a', '128k', destino]);
    fs.rmSync(crudo, { force: true });

    const { palabras, duracion, anclasUsadas } = await alinear(texto, destino);
    return { archivo: destino, duracion, palabras, anclasUsadas };
  }
  throw ultimoError ?? new Error('no se pudo sintetizar');
}

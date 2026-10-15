// Cuánta IA se usa por día (15/10/2026): llamadas, tokens de entrada y de salida, por tarea y por modelo.
// Hasta hoy los tokens se perdían: Gemini los informa en cada respuesta (`usageMetadata`) y Groq también (`usage`),
// pero nadie los guardaba, y sin eso no se puede saber cuánto costaría la IA el día que deje de ser gratis.
//
// Va a web/data/uso-ia.json (sólo números agregados por día; "Actualizar la web" lo guarda, ver su `git add`):
//
//   { "dias": { "2026-10-15": { "redaccion": { "gemini-flash-lite-latest": {
//       "llamadas": 14, "errores": 1, "entrada": 98000, "salida": 12000, "pensamiento": 0, "total": 110000,
//       "claves": { "redaccion": 13, "redes": 1 } } } } } }
//
// Cómo se usa, desde cualquier lugar que llame a Gemini o a Groq (reels/reescritura.mjs ya lo hace):
//
//   import { anotarUsoIA } from '../redes/uso-ia.mjs';
//   const j = await res.json();
//   anotarUsoIA({ tarea: 'lectura', modelo: MODELO, clave: 'clasificacion', respuesta: j });   // éxito
//   anotarUsoIA({ tarea: 'lectura', modelo: MODELO, clave: 'clasificacion', error: res.status });  // una llamada que falló
//
// `respuesta` es el JSON de la respuesta tal cual (Gemini: `usageMetadata`; Groq/OpenAI: `usage`). Nunca lanza: anotar el
// uso jamás puede romper una corrida. Dentro de `node --test` no escribe en el repositorio (a menos que se le pase `archivo`).
//
// Sin dependencias.

import fs from 'node:fs';
import path from 'node:path';
import { diaAR } from '../ingesta/zona.mjs';
import { leerJson } from '../ingesta/json.mjs';

export const ARCHIVO_DE_USO = path.join(import.meta.dirname, '..', 'web', 'data', 'uso-ia.json');
export const MAXIMO_DE_DIAS_DE_USO = 120;

const entero = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Math.round(Number(n)) : 0);

/**
 * Los tokens que informa una respuesta de Gemini (`usageMetadata`) o de Groq/OpenAI (`usage`).
 * @returns {{ entrada: number, salida: number, pensamiento: number, total: number } | null} null si la respuesta no los trae
 */
export function usoDe(respuesta) {
  const g = respuesta?.usageMetadata;
  if (g && typeof g === 'object') {
    const entrada = entero(g.promptTokenCount);
    const salida = entero(g.candidatesTokenCount);
    const pensamiento = entero(g.thoughtsTokenCount);
    return { entrada, salida, pensamiento, total: entero(g.totalTokenCount) || entrada + salida + pensamiento };
  }
  const o = respuesta?.usage;
  if (o && typeof o === 'object') {
    const entrada = entero(o.prompt_tokens ?? o.input_tokens);
    const salida = entero(o.completion_tokens ?? o.output_tokens);
    return { entrada, salida, pensamiento: 0, total: entero(o.total_tokens) || entrada + salida };
  }
  return null;
}

/**
 * Suma una llamada al archivo (función pura: devuelve el archivo nuevo).
 * @param {object} archivo  el contenido actual de uso-ia.json
 * @param {object} o
 * @param {string} o.dia      AAAA-MM-DD de Balcarce
 * @param {string} o.tarea    'redaccion', 'lectura', 'fotos', 'voz', 'pistas'…
 * @param {string} o.modelo   el modelo pedido
 * @param {string} [o.clave]  qué clave se usó (redaccion, redes, clasificacion, groq…)
 * @param {object|null} [o.uso]    el resultado de usoDe()
 * @param {number|string|null} [o.error]  si la llamada falló (el código HTTP, por ejemplo)
 */
export function sumarUso(archivo, { dia, tarea, modelo, clave = null, uso = null, error = null }, maximo = MAXIMO_DE_DIAS_DE_USO) {
  const dias = { ...(archivo?.dias ?? {}) };
  const delDia = { ...(dias[dia] ?? {}) };
  const deLaTarea = { ...(delDia[tarea] ?? {}) };
  const c = { llamadas: 0, errores: 0, entrada: 0, salida: 0, pensamiento: 0, total: 0, claves: {}, ...(deLaTarea[modelo] ?? {}) };
  c.claves = { ...c.claves };
  c.llamadas += 1;
  if (error !== null && error !== undefined && error !== false) c.errores += 1;
  if (uso) {
    c.entrada += uso.entrada;
    c.salida += uso.salida;
    c.pensamiento += uso.pensamiento;
    c.total += uso.total;
  }
  if (clave) c.claves[clave] = (c.claves[clave] ?? 0) + 1;
  deLaTarea[modelo] = c;
  delDia[tarea] = deLaTarea;
  dias[dia] = delDia;
  const ordenados = Object.fromEntries(Object.entries(dias).sort((a, b) => a[0].localeCompare(b[0])).slice(-maximo));
  return { ...(archivo ?? {}), dias: ordenados };
}

/**
 * Anota una llamada a la IA en web/data/uso-ia.json. Nunca lanza ni frena nada.
 * @returns {boolean} true si lo anotó
 */
export function anotarUsoIA({ tarea, modelo, clave = null, respuesta = null, error = null, ahora = new Date(), archivo = null } = {}) {
  try {
    if (!tarea || !modelo) return false;
    // En las pruebas (node --test) no se escribe en el repositorio salvo que la prueba diga a qué archivo.
    // (la variable USO_IA_ARCHIVO también lo cambia: así lo prueban las pruebas de quien llama).
    if (!archivo && !process.env.USO_IA_ARCHIVO && process.env.NODE_TEST_CONTEXT) return false;
    const destino = archivo ?? process.env.USO_IA_ARCHIVO ?? ARCHIVO_DE_USO;
    const actual = leerJson(destino, { dias: {} });
    const nuevo = sumarUso(actual && typeof actual === 'object' ? actual : { dias: {} }, {
      dia: diaAR(ahora), tarea, modelo, clave, uso: respuesta ? usoDe(respuesta) : null, error,
    });
    fs.writeFileSync(destino, `${JSON.stringify(nuevo, null, 1)}\n`);
    return true;
  } catch {
    return false;
  }
}

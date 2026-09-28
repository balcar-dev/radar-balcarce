// Las claves de las IA: cuatro, cada una con su cupo y su uso.
//
// Van separadas a propósito. Cada clave tiene su propio cupo diario en Google,
// y si comparten, un día de muchos reels se come la cuota con la que se
// reescriben las notas (o al revés) y una de las dos cosas deja de andar sin
// que nadie se entere.
//
//   GEMINI_API_KEY_REDACCION       reescribir y redactar notas (gratis). Acepta
//                                  también el nombre viejo, GEMINI_API_KEY
//   GEMINI_API_KEY_REDES           voces y reels (paga). La reescritura la usa
//                                  sólo si la de redacción se queda sin cupo (429)
//   GEMINI_API_KEY_CLASIFICACION   la lectura con IA y el banco de fotos; si no
//                                  está, usa la de redacción, nunca la de redes
//   GROQ_API_KEY                   Groq, el respaldo gratis de la lectura con IA
//                                  y de la comparación de fotos
//
// Se leen de una variable de entorno o del archivo .env de la raíz. Nunca se
// escriben en el código ni se muestran.
//
// La de redes no se reemplaza con otra clave de Gemini: si falta, no se gasta
// en silencio la de redactar. Las piezas igual salen: decirGemini
// (reels/voz-gemini.mjs) falla y armarReel (reels/reel.mjs) las lee con Elena,
// la voz gratis de Microsoft.

import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.join(import.meta.dirname, '..');

/** Lee una variable del entorno o, si no está, del archivo .env. */
export function leerVariable(nombre, { env = process.env, archivo = path.join(RAIZ, '.env') } = {}) {
  if (env[nombre]) return String(env[nombre]).trim();
  try {
    // El nombre va seguido de espacios opcionales y un "=", así que
    // GEMINI_API_KEY no confunde con GEMINI_API_KEY_REDES.
    const m = fs.readFileSync(archivo, 'utf8').match(new RegExp(`^${nombre}\\s*=\\s*(.+)$`, 'm'));
    if (m) return m[1].trim().replace(/^["']|["']$/g, '') || null;
  } catch { /* sin .env */ }
  return null;
}

/** El modelo de texto de Gemini, en un solo lugar: lo usan la redacción, la
 *  lectura con IA, las fotos y la auditoría de voz. El "flash" normal daba 503
 *  seguido; si vuelve a fallar, es lo primero que se mira (CLAUDE.md). */
export const MODELO_DE_TEXTO = 'gemini-flash-lite-latest';

export const claveRedaccion = (o) => leerVariable('GEMINI_API_KEY_REDACCION', o) ?? leerVariable('GEMINI_API_KEY', o);

export const claveRedes = (o) => leerVariable('GEMINI_API_KEY_REDES', o);

/** La de la lectura con IA (plan V2.2): su propio proyecto de Google, para no
 *  gastarle cupo a la redacción. Mientras no esté cargada, usa la de redacción
 *  (gratis). NUNCA la de redes, que es paga (Hernán, 27/09). */
export const claveClasificacion = (o) => leerVariable('GEMINI_API_KEY_CLASIFICACION', o) ?? claveRedaccion(o);

/** Groq (28/09): un segundo proveedor gratis para la lectura con IA, para
 *  cuando Gemini se queda sin cupo o falla. Sin ella, la lectura sigue sólo
 *  con Gemini, como hasta ahora. */
export const claveGroq = (o) => leerVariable('GROQ_API_KEY', o);

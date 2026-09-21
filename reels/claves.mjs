// Las claves de Gemini: una para redactar las notas y otra para las redes.
//
// Van separadas a propósito. Cada clave tiene su propio cupo diario en Google,
// y si comparten, un día de muchos reels se come la cuota con la que se
// reescriben las notas (o al revés) y una de las dos cosas deja de andar sin
// que nadie se entere.
//
//   GEMINI_API_KEY_REDACCION   reescribir y redactar notas (panel/servidor.mjs)
//   GEMINI_API_KEY_REDES       voces, ilustraciones y reels (reels/)
//
// Se leen de una variable de entorno o del archivo .env de la raíz. Nunca se
// escriben en el código ni se muestran.
//
// La de redacción acepta también el nombre viejo, GEMINI_API_KEY, para que
// nada se rompa mientras se migra. La de redes NO tiene alternativa: si falta,
// los reels no arrancan, en vez de gastar en silencio la de redactar.

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

export const claveRedaccion = (o) => leerVariable('GEMINI_API_KEY_REDACCION', o) ?? leerVariable('GEMINI_API_KEY', o);

export const claveRedes = (o) => leerVariable('GEMINI_API_KEY_REDES', o);

// Lo chico que comparten las tareas del Worker de tareas (18/10/2026). Sin dependencias.

import fs from 'node:fs';
import path from 'node:path';

/** "18/10 10:07", en hora de Balcarce (el mismo texto que ponían los workflows con `date '+%d/%m %H:%M'`). */
export function fechaDeLosMensajes(ahora = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(ahora).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month} ${String(Number(p.hour) % 24).padStart(2, '0')}:${p.minute}`;
}

/** Un JSON de la carpeta de trabajo, o `defecto` si no está o está roto. */
export function leerJsonDe(raiz, ruta, defecto = null) {
  try { return JSON.parse(fs.readFileSync(path.join(raiz, ruta), 'utf8')); } catch { return defecto; }
}

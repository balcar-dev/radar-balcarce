// Leer un JSON sin que un archivo faltante o roto tire abajo el proceso.
// Sin dependencias: sólo lo que trae Node.
import fs from 'node:fs';

/** El contenido del JSON, o `porDefecto` si el archivo no existe o no se puede leer. */
export function leerJson(archivo, porDefecto = null) {
  try { return JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch { return porDefecto; }
}

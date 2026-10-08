// Leer un JSON sin que un archivo faltante o roto tire abajo el proceso.
// Sin dependencias: sólo lo que trae Node.
import fs from 'node:fs';

/** El contenido del JSON, o `porDefecto` si el archivo no existe o no se puede leer. */
export function leerJson(archivo, porDefecto = null) {
  try { return JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch { return porDefecto; }
}

/**
 * Como `leerJson`, pero un archivo que EXISTE y no se puede leer corta con error en vez de pasar por vacío (8/10/2026, C-5): si
 * `archivo.json` o `redes.json` se rompían, la corrida arrancaba "de cero" y guardaba un archivo casi vacío o volvía a publicar lo
 * ya publicado. Si el archivo no existe, devuelve `porDefecto`.
 */
export function leerJsonEstricto(archivo, porDefecto = null) {
  let texto;
  try { texto = fs.readFileSync(archivo, 'utf8'); } catch (e) {
    if (e?.code === 'ENOENT') return porDefecto;
    throw new Error(`No se pudo leer ${archivo}: ${e.message}`);
  }
  try { return JSON.parse(texto); } catch (e) {
    throw new Error(`${archivo} está roto (${e.message}). No sigo para no pisarlo con uno vacío; arreglalo o recuperalo (web/scripts/recuperar-archivo.mjs).`);
  }
}

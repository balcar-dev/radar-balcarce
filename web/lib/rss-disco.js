// Lo único del feed que lee el disco (15/10/2026): cuánto pesa cada foto, para declarar el <enclosure> con su `length` real.
// Aparte de lib/rss.js para que ése siga siendo de texto adentro, texto afuera. Se usa al compilar (carpeta web/).

import fs from 'node:fs';
import path from 'node:path';

/** Cuántos bytes pesa una foto del banco propio (web/public/fotos-notas/…); 0 si no está en el disco o no es un archivo de ahí. */
export function tamanoDeFotoLocal(archivo, { raiz = path.join(process.cwd(), 'public') } = {}) {
  try {
    const relativo = String(archivo ?? '').replace(/^\/+/, '');
    if (!relativo) return 0;
    const ruta = path.resolve(raiz, relativo);
    if (!ruta.startsWith(path.resolve(raiz) + path.sep)) return 0;
    const st = fs.statSync(ruta);
    return st.isFile() ? st.size : 0;
  } catch {
    return 0;
  }
}

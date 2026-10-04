// El escudo de un club, si ya está guardado en web/public/escudos/ (web/scripts/escudos.mjs). Sin escudo, la nota sale sólo con el nombre.

import fs from 'node:fs';
import path from 'node:path';

export function rutaDelEscudo(id) {
  if (!/^\d{1,8}$/.test(String(id ?? ''))) return null;
  return fs.existsSync(path.join(process.cwd(), 'public', 'escudos', `${id}.png`)) ? `/escudos/${id}.png` : null;
}

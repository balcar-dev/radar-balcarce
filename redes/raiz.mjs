// Dónde está la carpeta del proyecto (18/10/2026, mudanza a Cloudflare: infra/tareas-cloudflare/).
//
// En la línea de comandos y en GitHub Actions es la carpeta de arriba de `redes/` (o `panel/`…), como siempre. Un Worker de Cloudflare no tiene
// el repositorio en disco: el corredor de tareas (infra/tareas-cloudflare/corredor.mjs) baja los archivos que la tarea lee a una carpeta temporal
// (/tmp/radar) y avisa con `RADAR_RAIZ`, así el mismo programa corre sin cambios. Sin dependencias.

import path from 'node:path';

/** La carpeta del proyecto: `RADAR_RAIZ` si está, y si no, la de arriba de `desdeDir` (el `import.meta.dirname` del programa que pregunta). */
export function raizDelProyecto(env = process.env, desdeDir = '') {
  const puesta = String(env?.RADAR_RAIZ ?? '').trim();
  return puesta || path.join(desdeDir, '..');
}

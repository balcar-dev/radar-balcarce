// Guarda una foto de la cotización del dólar en data/dolar.json.
//
//   node scripts/foto-dolar.mjs
//
// Corre al principio de `npm run build`, así que la toma cada compilación:
// la de "Actualizar la web" y la de "Cloudflare Pages", cada media hora, sin
// tocar ningún workflow. La página /dolar la muestra mientras el navegador
// consulta la de ahora, o si no puede, siempre con su hora y diciendo que no
// se pudo actualizar (lib/dolar.js).
//
// Nunca frena la compilación: si DolarApi y Bluelytics no contestan, deja la
// foto anterior (si hay) y sigue. data/dolar.json no se versiona (.gitignore):
// es un artefacto de la compilación, como public/_redirects.

import fs from 'node:fs';
import path from 'node:path';
import { traerDolar } from '../lib/dolar.js';

const ARCHIVO = path.join(import.meta.dirname, '..', 'data', 'dolar.json');

try {
  const datos = await traerDolar();
  if (datos) {
    fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
    fs.writeFileSync(ARCHIVO, `${JSON.stringify(datos, null, 2)}\n`);
    console.log(`Dólar: ${datos.cotizaciones.length} cotizaciones de ${datos.fuente}.`);
  } else {
    console.log(`Dólar: ninguna fuente contestó. ${fs.existsSync(ARCHIVO) ? 'Queda la foto anterior.' : 'La página dirá que no se pudo consultar.'}`);
  }
} catch (e) {
  console.log(`Dólar: no se pudo guardar la foto (${e.message}). Sigue la compilación.`);
}

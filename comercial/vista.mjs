// Arma una vista previa de la guía comercial: mapa, guía y lista de trabajo.
//
//   node comercial/vista.mjs        deja comercial/salida/guia-previa.html
//
// Es un solo archivo HTML, sin nada de afuera, para mirar cómo quedaría antes
// de decidir si va al sitio. No publica nada. El mapa se dibuja con las calles
// de OpenStreetMap (comercial/datos/calles.json) en vez de mosaicos de
// internet: así no depende de ningún servicio y se ve igual en cualquier lado.

import fs from 'node:fs';
import path from 'node:path';
import { leerBase, resumen } from './base.mjs';
import { RUBROS, completitud } from './esquema.mjs';
import { accionSugerida } from './vigencia.mjs';

const AQUI = import.meta.dirname;

/** Lo que va al navegador: sólo lo necesario, con lo calculado. */
export function datosParaLaVista(base) {
  return {
    generado: base.actualizado ?? new Date().toISOString(),
    fuentes: base.fuentesUsadas ?? [],
    rubros: RUBROS,
    resumen: resumen(base),
    comercios: base.comercios
      .filter((c) => c.vigencia?.estado !== 'cerrado')
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        rubro: c.rubro,
        direccion: { texto: c.direccion?.texto ?? null },
        ubicacion: c.ubicacion,
        contacto: { telefono: c.contacto?.telefono ?? null, web: c.contacto?.web ?? null },
        redes: { instagram: c.redes?.instagram ?? null, facebook: c.redes?.facebook ?? null },
        horarios: c.horarios,
        vigencia: c.vigencia,
        completitud: completitud(c),
        accion: accionSugerida(c),
      })),
  };
}

/** Un JSON que se puede poner dentro de un <script> sin romper la página. */
export const paraScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, '');

export function armarVista({ base, calles }) {
  const plantilla = fs.readFileSync(path.join(AQUI, 'vista.plantilla.html'), 'utf8');
  return plantilla
    .replace('__DATOS__', () => paraScript(datosParaLaVista(base)))
    .replace('__CALLES__', () => paraScript(calles));
}

if (process.argv[1]?.endsWith('vista.mjs')) {
  const calles = JSON.parse(fs.readFileSync(path.join(AQUI, 'datos', 'calles.json'), 'utf8'));
  const html = armarVista({ base: leerBase(), calles });
  const salida = path.join(AQUI, 'salida');
  fs.mkdirSync(salida, { recursive: true });
  fs.writeFileSync(path.join(salida, 'guia-previa.html'), html);
  console.log(`  guia-previa.html: ${(html.length / 1024).toFixed(0)} KB`);
}

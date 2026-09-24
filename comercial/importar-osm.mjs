// Trae los comercios de Balcarce de OpenStreetMap y los suma a la base.
//
//   node comercial/importar-osm.mjs                 baja de internet
//   node comercial/importar-osm.mjs --desde-archivo usa comercial/datos/osm-crudo.json
//
// OpenStreetMap es abierto (licencia ODbL: hay que nombrarlo como fuente) y lo
// arma la gente. En Balcarce hay unos 200 lugares con nombre: alcanza de
// semilla, no de guía completa. Lo demás sale de la Cámara de Comercio, del
// municipio y de los propios comercios (ver COMERCIAL.md).

import fs from 'node:fs';
import path from 'node:path';
import { desdeOSM } from './esquema.mjs';
import { leerBase, guardarBase, fusionar, resumen } from './base.mjs';

// El centro de Balcarce y un margen: (sur, oeste, norte, este).
const CAJA = '-37.90,-58.32,-37.80,-58.19';
const ESPEJOS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

export const CONSULTA = `[out:json][timeout:90];
(
  nwr["shop"](${CAJA});
  nwr["amenity"](${CAJA});
  nwr["craft"](${CAJA});
  nwr["office"](${CAJA});
  nwr["tourism"](${CAJA});
);
out center tags meta;`;

async function bajar() {
  for (const url of ESPEJOS) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        body: `data=${encodeURIComponent(CONSULTA)}`,
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'RadarBalcarce/1.0 (radarbalcarce@gmail.com)' },
        signal: AbortSignal.timeout(120000),
      });
      if (r.ok) return r.json();
      console.log(`  ${new URL(url).hostname}: HTTP ${r.status}, pruebo otro`);
    } catch (e) {
      console.log(`  ${new URL(url).hostname}: ${e.message}, pruebo otro`);
    }
  }
  throw new Error('ningún servidor de OpenStreetMap respondió; probá en un rato');
}

if (process.argv[1]?.endsWith('importar-osm.mjs')) {
  const CRUDO = path.join(import.meta.dirname, 'datos', 'osm-crudo.json');
  let datos;
  if (process.argv.includes('--desde-archivo')) datos = JSON.parse(fs.readFileSync(CRUDO, 'utf8'));
  else { datos = await bajar(); fs.mkdirSync(path.dirname(CRUDO), { recursive: true }); fs.writeFileSync(CRUDO, JSON.stringify(datos)); }

  const base = leerBase();
  const cuentas = { nueva: 0, actualizada: 0, igual: 0, descartada: 0 };
  const ahora = new Date();
  for (const el of datos.elements ?? []) {
    const ficha = desdeOSM(el, ahora);
    if (!ficha) { cuentas.descartada += 1; continue; }
    cuentas[fusionar(base, ficha)] += 1;
  }
  base.actualizado = ahora.toISOString();
  base.fuentesUsadas = [...new Set([...(base.fuentesUsadas ?? []), '© colaboradores de OpenStreetMap (ODbL)'])];
  guardarBase(base);
  console.log(`  OpenStreetMap: ${cuentas.nueva} nuevos, ${cuentas.actualizada} actualizados, ${cuentas.igual} sin cambios, ${cuentas.descartada} sin nombre (descartados)`);
  console.log(`  La base tiene ${resumen(base).total} comercios.`);
}

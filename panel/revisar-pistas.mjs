// Vuelve a mirar las pistas que quedaron abiertas (2/10/2026, Hernán: "que quede abierta la investigación y ver si aparece en algún medio").
//
//   node panel/revisar-pistas.mjs                 mira todas las abiertas (cada tres horas, .github/workflows/pistas.yml)
//   node panel/revisar-pistas.mjs --id=pista1a2b  mira sólo esa (el botón "Volver a mirar" del panel)
//   node panel/revisar-pistas.mjs --simular       muestra qué pasaría, sin escribir ni avisar
//
// Por cada pista abierta repite las mismas búsquedas en Google Noticias (sólo cuenta quién la cubrió y cuándo, no copia texto) y mira si
// ya la tenemos nosotros. Si la cobertura subió de nivel (de "sin cobertura" a "un medio", a "cubierta"…) o ya la publicamos, marca la
// novedad en web/data/pistas.json (el informe nuevo viaja cifrado para el celular) y avisa por WhatsApp, sin el texto de la pista.
// Sin dependencias.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { leerJson } from '../ingesta/json.mjs';
import { revisarPista } from '../ingesta/pistas.mjs';
import { cerrar, leerLlaves } from './cifrado.mjs';
import { conRevision, pistasParaRevisar, comoRenglones, avisoDePistas, PISTAS_ABIERTAS } from './pistas-libro.mjs';
import { leerVariable, claveRedaccion, claveClasificacion } from '../reels/claves.mjs';
import { enviarWhatsApp } from '../redes/whatsapp.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const DATOS = path.join(RAIZ, 'web', 'data');
export const ARCHIVO_PISTAS = path.join(DATOS, 'pistas.json');

/**
 * Una pasada entera, sin leer ni escribir nada (para probarla). Devuelve { libro, novedades, revisadas }.
 * `solo`: el id de una sola pista (se mira aunque no toque), o null.
 */
export async function pasadaDePistas({
  libro = { pistas: {} }, llaves = [], notas = [], clave = null, fetchFn = fetch, buscar, ahora = new Date(), solo = null,
} = {}) {
  let actual = libro;
  const novedades = [];
  const revisadas = [];
  const ids = solo ? [solo].filter((id) => libro.pistas?.[id]) : pistasParaRevisar(libro, ahora);
  for (const id of ids) {
    const pista = actual.pistas[id];
    const r = await revisarPista(pista, { clave, fetchFn, notas, ahora, ...(buscar ? { buscar } : {}) });
    const sobre = r.novedad || r.informe.total !== pista.total ? cerrar({ id, tipo: 'pista', ...r.informe }, llaves) : null;
    actual = conRevision(actual, id, { informe: r.informe, sobre, novedad: r.novedad, ahora });
    revisadas.push(id);
    if (r.novedad) novedades.push({ id, afirmacion: pista.afirmacion, motivo: r.motivo });
  }
  return { libro: actual, novedades, revisadas };
}

async function main() {
  const simular = process.argv.includes('--simular');
  const solo = (process.argv.find((a) => a.startsWith('--id=')) ?? '').slice(5) || null;
  const libro = leerJson(ARCHIVO_PISTAS, { pistas: {} });
  const llaves = leerLlaves(leerJson(path.join(DATOS, 'celular-llaves.json'), null));
  if (!Object.keys(libro.pistas ?? {}).length) { console.log('No hay pistas abiertas.'); return; }
  if (!llaves.length) { console.log('No hay ningún celular registrado: no hay a quién mandarle el informe.'); return; }
  const notas = [...(leerJson(path.join(DATOS, 'portada.json'), null)?.notas ?? []), ...(leerJson(path.join(DATOS, 'archivo.json'), null)?.notas ?? [])];
  const r = await pasadaDePistas({ libro, llaves, notas, clave: claveRedaccion() ?? claveClasificacion(), solo });
  console.log(`Pistas: ${r.revisadas.length} revisadas, ${r.novedades.length} con novedades (se siguen ${PISTAS_ABIERTAS.dias} días).`);
  for (const n of r.novedades) console.log(`  novedad (${n.id}): ${n.motivo}`);
  if (simular) return;
  fs.writeFileSync(ARCHIVO_PISTAS, comoRenglones(r.libro), 'utf8');
  const texto = avisoDePistas(r.novedades);
  if (texto) {
    const telefono = leerVariable('WHATSAPP_TELEFONO');
    const apikey = leerVariable('WHATSAPP_APIKEY');
    if (telefono && apikey) await enviarWhatsApp({ telefono, apikey, texto }).catch((e) => console.log(`WhatsApp: ${e.message}`));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

// Arma infra/sondeo-fuentes/lista.json con las fuentes ACTIVAS de hoy (sólo lee el registro de ingesta/; no cambia nada de producción).
// Correr de nuevo si se toca una fuente:  node infra/sondeo-fuentes/generar-lista.mjs
// Una prueba (pruebas/sondeo-fuentes.test.mjs) controla que lista.json y el registro digan lo mismo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TODAS_LAS_FUENTES } from '../../ingesta/ingesta.mjs';

export const ARCHIVO = path.join(import.meta.dirname, 'lista.json');

const sitioDe = (url) => new URL(url).host;

/**
 * La lista para el sondeo: sólo las activas, con los datos mínimos, y ordenada para ser amable: los feeds de un mismo sitio no quedan
 * pegados (se reparten como en una baraja), así un lote no le pide varias cosas seguidas al mismo servidor.
 */
export function listaParaSondeo(fuentes = TODAS_LAS_FUENTES) {
  const activas = fuentes.filter((f) => f.activa !== false);
  const porSitio = new Map();
  for (const f of activas) {
    const k = sitioDe(f.url);
    if (!porSitio.has(k)) porSitio.set(k, []);
    porSitio.get(k).push({ id: f.id, nombre: f.nombre, medio: f.medio, url: f.url, tipo: f.tipo, alcance: f.alcance });
  }
  const grupos = [...porSitio.values()];
  const salida = [];
  for (let ronda = 0; salida.length < activas.length; ronda += 1) {
    for (const g of grupos) if (g[ronda]) salida.push(g[ronda]);
  }
  return salida;
}

export const textoDeLista = (fuentes) => `${JSON.stringify(listaParaSondeo(fuentes), null, 1)}\n`;

const esEjecutable = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (esEjecutable) {
  const lista = listaParaSondeo();
  fs.writeFileSync(ARCHIVO, textoDeLista());
  console.log(`  lista.json escrito: ${lista.length} feeds activos (${new Set(lista.map((f) => f.medio)).size} medios)`);
}

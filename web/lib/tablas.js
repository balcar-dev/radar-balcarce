// Los datos de las páginas fijas de tablas (4/10/2026, Hernán: "tener fijo una página con la tabla de fútbol y de F1, para usarla de referencia y para Google").
// Salen de lo que ya guardan las notas propias: web/data/futbol.json (ESPN) y web/data/f1.json (Jolpica). Se actualizan solas con "Actualizar la web". Si falta algo,
// la página lo dice en vez de inventar nada.

import fs from 'node:fs';
import path from 'node:path';

const leer = (nombre) => {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', nombre), 'utf8')); } catch { return null; }
};

/** La tabla de posiciones de la Liga Profesional por zona: { torneo, zonas, actualizada } o null. */
export function tablaDeLaLiga() {
  const f = leer('futbol.json');
  if (!f?.tabla?.zonas?.length) return null;
  return { torneo: f.tabla.torneo || null, zonas: f.tabla.zonas, actualizada: f.tablaCuando ?? null };
}

/** El campeonato de F1: { temporada, ronda, carreras, pilotos, constructores, actualizado } o null si no hay ni uno. */
export function campeonatoDeF1() {
  const f = leer('f1.json');
  const pilotos = f?.clasificacion?.filas?.length ? f.clasificacion : null;
  const constructores = f?.constructores?.filas?.length ? f.constructores : null;
  if (!pilotos && !constructores) return null;
  const base = pilotos ?? constructores;
  return {
    temporada: base.temporada,
    ronda: base.ronda,
    carreras: f.calendario?.carreras?.length ?? null,
    pilotos: pilotos?.filas ?? [],
    constructores: constructores?.filas ?? [],
    actualizado: f.consultado ?? null,
  };
}

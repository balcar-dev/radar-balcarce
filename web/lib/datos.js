// Lee web/data/portada.json, generado por scripts/generar-datos.mjs.
// Todas las páginas del sitio pasan por acá — nunca leen el panel
// directamente, así la web funciona igual desplegada en Vercel que en
// una PC con el panel corriendo al lado.

import fs from 'node:fs';
import path from 'node:path';

const ARCHIVO = path.join(process.cwd(), 'data', 'portada.json');

export function obtenerDatos() {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
  } catch {
    // Sin datos generados todavía: la web no se rompe, muestra vacío.
    return {
      generado: null, notas: [], secciones: [], clima: null,
      farmacias: { hoy: null, proximos: [], avisos: [] },
      agenda: { municipio: [], proximosAnuales: [] },
      utiles: { numeros: [], diaDeLaSemana: null, tocaHoy: false },
    };
  }
}

export function obtenerNota(id) {
  return obtenerDatos().notas.find((n) => n.id === id) ?? null;
}

export function haceCuanto(fechaISO) {
  const min = Math.round((Date.now() - new Date(fechaISO).getTime()) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} días`;
}

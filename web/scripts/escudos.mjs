// Los escudos de los clubes para la maqueta de las notas de fútbol (4/10/2026, Hernán: "agregar las banderas de los clubes").
// Se bajan una sola vez de ESPN (el mismo servicio de donde salen los datos), chicos (96 px), y se guardan en web/public/escudos/<id>.png: la web
// nunca los pide a otro sitio (la página tiene `img-src 'self'`) y si uno falta, la nota sale igual, sólo con el nombre. Sólo adornan: ningún
// dato depende de ellos.

import fs from 'node:fs';
import path from 'node:path';

const AGENTE = 'RadarBalcarce/1.0 (https://radarbalcarce.com; contacto: radarbalcarce@gmail.com)';
const MAXIMO_POR_CORRIDA = 40;

export const urlDelEscudo = (id) => `https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/${id}.png&w=96&h=96`;

/** Los ids de los equipos que dibujan las notas de fútbol que se muestran ahora. */
export function idsDeEscudos(notas = []) {
  const ids = new Set();
  for (const n of notas) {
    const d = n?.datosFutbol;
    if (!d) continue;
    for (const p of d.partidos ?? []) { ids.add(p.local?.id); ids.add(p.visitante?.id); }
    for (const z of d.zonas ?? []) for (const f of z.filas ?? []) ids.add(f.id);
  }
  return [...ids].filter((id) => /^\d{1,8}$/.test(String(id ?? ''))).map(String);
}

/** Baja los que faltan en `carpeta`. Devuelve cuántos bajó. Nunca lanza: si ESPN no contesta, esa nota sale con el nombre solo. */
export async function bajarEscudos(ids, carpeta, { fetchFn = fetch } = {}) {
  const faltan = ids.filter((id) => !fs.existsSync(path.join(carpeta, `${id}.png`))).slice(0, MAXIMO_POR_CORRIDA);
  let bajados = 0;
  for (const id of faltan) {
    try {
      const res = await fetchFn(urlDelEscudo(id), { signal: AbortSignal.timeout(20_000), headers: { 'user-agent': AGENTE } });
      if (!res.ok || !/image\/png/i.test(res.headers?.get?.('content-type') ?? 'image/png')) continue;
      const bytes = Buffer.from(await res.arrayBuffer());
      // Un PNG de verdad (firma de 8 bytes) y de tamaño razonable.
      if (bytes.length < 300 || bytes.length > 200_000 || bytes.readUInt32BE(0) !== 0x89504e47) continue;
      fs.mkdirSync(carpeta, { recursive: true });
      fs.writeFileSync(path.join(carpeta, `${id}.png`), bytes);
      bajados += 1;
    } catch { /* se sigue sin ese escudo */ }
  }
  return bajados;
}

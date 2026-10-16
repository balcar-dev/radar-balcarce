// Las RUTAS del archivo permanente en radarbalcarce.com (16/10/2026, docs/salud-tecnica/ARCHIVO-PERMANENTE-IMPLEMENTACION.md).
//
// Mientras ninguna ruta apunte al Worker `radar-balcarce-archivo`, el Worker existe pero nadie le pregunta nada y el sitio responde solo,
// como siempre. Poner la ruta es EL momento del cambio; sacarla es la vuelta atrás en un minuto. Este script hace sólo eso, con la API de
// Cloudflare (no con wrangler.toml: así subir el Worker de nuevo nunca pone ni saca una ruta sin querer). Hay dos rutas:
//   notas   radarbalcarce.com/nota/*          las páginas de las notas (la principal)
//   fotos   radarbalcarce.com/fotos-notas/*   las fotos, sólo para cuando una nota archivada ya no tenga su foto en el sitio (si no se usa
//                                             FOTOS_BASE); el Worker pregunta primero al sitio y sólo si dice 404 la busca en R2
//
//   node infra/archivo-cloudflare/ruta.mjs ver              dice cuáles están puestas (en GitHub Actions deja presente=si|no y fotos=si|no)
//   node infra/archivo-cloudflare/ruta.mjs poner [notas|fotos|todas]   las pone (por defecto, notas; si ya está, no hace nada)
//   node infra/archivo-cloudflare/ruta.mjs sacar [notas|fotos|todas]   las saca (por defecto, TODAS las del archivo; nunca otra ruta)
//
// Necesita CLOUDFLARE_API_TOKEN con permiso "Zone → Workers Routes: Edit" (y "Zone → Zone: Read" para encontrar la zona por su nombre, o
// la zona ya dada en CLOUDFLARE_ZONE_ID). Sin dependencias: sólo fetch. Nunca imprime el token.

import fs from 'node:fs';

export const API = 'https://api.cloudflare.com/client/v4';
export const ZONA = 'radarbalcarce.com';
export const PATRONES = { notas: 'radarbalcarce.com/nota/*', fotos: 'radarbalcarce.com/fotos-notas/*' };
export const PATRON = PATRONES.notas;
export const WORKER = 'radar-balcarce-archivo';

const sinToken = (texto, token) => (token && token.length >= 6 ? String(texto).split(token).join('***') : String(texto));

/** Un pedido a la API de Cloudflare. Devuelve { ok, result, error }. Nunca lanza. */
async function pedir(camino, { metodo = 'GET', cuerpo, token, fetchFn }) {
  try {
    const r = await fetchFn(`${API}${camino}`, {
      method: metodo,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
      signal: AbortSignal.timeout(20000),
    });
    let j = null;
    try { j = await r.json(); } catch { j = null; }
    if (!r.ok || j?.success === false) {
      const detalle = (j?.errors ?? []).map((e) => `${e.code ?? ''} ${e.message ?? ''}`.trim()).join('; ');
      return { ok: false, error: sinToken(`HTTP ${r.status}${detalle ? `: ${detalle}` : ''}`, token) };
    }
    return { ok: true, result: j?.result ?? null };
  } catch (e) {
    return { ok: false, error: sinToken(`sin respuesta de Cloudflare: ${e?.message ?? e}`, token) };
  }
}

/** El id de la zona (CLOUDFLARE_ZONE_ID, o buscándola por su nombre). */
export async function idDeLaZona({ token, fetchFn = fetch, env = process.env }) {
  const dada = String(env.CLOUDFLARE_ZONE_ID ?? '').trim();
  if (dada) return { ok: true, id: dada };
  const r = await pedir(`/zones?name=${encodeURIComponent(ZONA)}`, { token, fetchFn });
  if (!r.ok) return { ok: false, error: `no se pudo buscar la zona ${ZONA} (${r.error}); hace falta el permiso "Zone: Read" o la variable CLOUDFLARE_ZONE_ID` };
  const id = Array.isArray(r.result) ? r.result.find((z) => z?.name === ZONA)?.id : null;
  return id ? { ok: true, id } : { ok: false, error: `la cuenta no tiene la zona ${ZONA}` };
}

/** Las rutas de Workers de la zona: { ok, rutas: [{ id, pattern, script }] }. */
export async function rutasDeLaZona({ zona, token, fetchFn = fetch }) {
  const r = await pedir(`/zones/${zona}/workers/routes`, { token, fetchFn });
  if (!r.ok) return { ok: false, error: `no se pudieron leer las rutas (${r.error}); hace falta el permiso "Workers Routes: Edit"` };
  return { ok: true, rutas: Array.isArray(r.result) ? r.result : [] };
}

/** La ruta del archivo con ese patrón, si está; y si el patrón lo usa OTRO Worker (conflicto: no se toca). */
export function buscarRuta(rutas = [], patron = PATRON) {
  const conPatron = rutas.filter((x) => x?.pattern === patron);
  return { nuestra: conPatron.find((x) => x.script === WORKER) ?? null, ajena: conPatron.find((x) => x.script !== WORKER) ?? null };
}

/** Qué rutas pide el argumento: 'notas', 'fotos' o 'todas'. */
export function cualesDe(arg, porDefecto) {
  if (!arg) return porDefecto;
  if (arg === 'todas') return ['notas', 'fotos'];
  return PATRONES[arg] ? [arg] : null;
}

/**
 * Hace lo pedido ('ver' | 'poner' | 'sacar') con las rutas `cuales`. Devuelve { ok, presente, fotos, texto }: si la ruta de las notas y la
 * de las fotos quedan puestas al terminar.
 */
export async function ruta(accion, { env = process.env, fetchFn = fetch, cuales = null } = {}) {
  const token = String(env.CLOUDFLARE_API_TOKEN ?? '').trim();
  const nada = { presente: null, fotos: null };
  if (!['ver', 'poner', 'sacar'].includes(accion)) return { ok: false, ...nada, texto: 'Uso: ruta.mjs ver | poner [notas|fotos|todas] | sacar [notas|fotos|todas]' };
  const lista = cuales ?? (accion === 'sacar' ? ['notas', 'fotos'] : ['notas']);
  if (!lista.length || lista.some((c) => !PATRONES[c])) return { ok: false, ...nada, texto: 'Las rutas son: notas, fotos o todas.' };
  if (!token) return { ok: false, ...nada, texto: 'Falta CLOUDFLARE_API_TOKEN.' };
  const z = await idDeLaZona({ token, fetchFn, env });
  if (!z.ok) return { ok: false, ...nada, texto: z.error };
  let leidas = await rutasDeLaZona({ zona: z.id, token, fetchFn });
  if (!leidas.ok) return { ok: false, ...nada, texto: leidas.error };

  const textos = [];
  let ok = true;
  if (accion === 'poner' || accion === 'sacar') {
    for (const cual of lista) {
      const patron = PATRONES[cual];
      const { nuestra, ajena } = buscarRuta(leidas.rutas, patron);
      if (accion === 'poner') {
        if (nuestra) { textos.push(`La ruta ${patron} → ${WORKER} ya estaba puesta.`); continue; }
        if (ajena) { ok = false; textos.push(`No se pone: el patrón ${patron} ya apunta a otro Worker (${ajena.script}). Hay que mirarlo a mano en Cloudflare.`); continue; }
        const r = await pedir(`/zones/${z.id}/workers/routes`, { metodo: 'POST', cuerpo: { pattern: patron, script: WORKER }, token, fetchFn });
        if (!r.ok) { ok = false; textos.push(`No se pudo poner la ruta ${patron}: ${r.error}`); continue; }
        textos.push(`Ruta PUESTA: ${patron} → ${WORKER}.`);
      } else {
        if (!nuestra) { textos.push(`La ruta ${patron} → ${WORKER} no estaba puesta: nada que sacar.${ajena ? ` (OJO: el patrón apunta a ${ajena.script}; no se tocó.)` : ''}`); continue; }
        const r = await pedir(`/zones/${z.id}/workers/routes/${nuestra.id}`, { metodo: 'DELETE', token, fetchFn });
        if (!r.ok) { ok = false; textos.push(`No se pudo sacar la ruta ${patron}: ${r.error}. A mano: Cloudflare → Workers → ${WORKER} → Settings → Domains & Routes → borrarla.`); continue; }
        textos.push(`Ruta SACADA: ${patron} ya no pasa por el archivo (el sitio responde solo).`);
      }
    }
    // Se confirma contra la lista de Cloudflare, no contra lo que dijo el pedido.
    leidas = await rutasDeLaZona({ zona: z.id, token, fetchFn });
    if (!leidas.ok) return { ok: false, ...nada, texto: `${textos.join(' ')} No se pudo confirmar cómo quedaron (${leidas.error}).` };
    for (const cual of lista) {
      const queda = Boolean(buscarRuta(leidas.rutas, PATRONES[cual]).nuestra);
      if (accion === 'poner' && !queda && ok) { ok = false; textos.push(`Cloudflare dijo que sí, pero la ruta ${PATRONES[cual]} no aparece en la lista: revisar a mano.`); }
      if (accion === 'sacar' && queda) { ok = false; textos.push(`La ruta ${PATRONES[cual]} sigue en la lista: sacarla a mano.`); }
    }
  }
  const presente = Boolean(buscarRuta(leidas.rutas, PATRONES.notas).nuestra);
  const fotos = Boolean(buscarRuta(leidas.rutas, PATRONES.fotos).nuestra);
  if (accion === 'ver') {
    for (const [cual, patron] of Object.entries(PATRONES)) {
      const { nuestra, ajena } = buscarRuta(leidas.rutas, patron);
      textos.push(ajena && !nuestra ? `OJO: el patrón ${patron} apunta a otro Worker (${ajena.script}), no al archivo.`
        : nuestra ? `La ruta ${patron} → ${WORKER} está PUESTA${cual === 'notas' ? ': las notas pasan por el archivo' : ''}.`
          : `La ruta ${patron} NO está puesta${cual === 'notas' ? ': el sitio responde solo' : ''}.`);
    }
  }
  return { ok, presente, fotos, texto: textos.join('\n') };
}

if (process.argv[1] && process.argv[1].endsWith('ruta.mjs')) {
  const accion = process.argv[2];
  const cuales = cualesDe(process.argv[3], null);
  const r = process.argv[3] && !cuales ? { ok: false, presente: null, fotos: null, texto: 'Las rutas son: notas, fotos o todas.' } : await ruta(accion, { cuales });
  console.log(r.texto);
  if (process.env.GITHUB_OUTPUT && r.presente !== null) fs.appendFileSync(process.env.GITHUB_OUTPUT, `presente=${r.presente ? 'si' : 'no'}\nfotos=${r.fotos ? 'si' : 'no'}\n`);
  process.exit(r.ok ? 0 : 1);
}

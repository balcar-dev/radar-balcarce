// La RUTA de los enlaces cortos en radarbalcarce.com (17/10/2026, regla 282; docs/redes/ACORTADOR-DE-ENLACES.md).
//
// Mientras la ruta no esté, el Worker `radar-balcarce-enlaces` existe pero nadie le pregunta nada. Poner la ruta es EL momento del cambio y se hace ANTES
// de prender ENLACES_CORTOS. Sacarla rompe todos los enlaces cortos que ya salieron: sólo se saca si todavía no salió ninguno (el script lo recuerda).
// Es la misma idea y casi el mismo código que infra/archivo-cloudflare/ruta.mjs, con la API de Cloudflare (no con wrangler.toml, para que volver a
// subir el Worker nunca ponga ni saque la ruta sin querer).
//
//   node infra/enlaces-cloudflare/ruta.mjs ver     dice si está puesta (en GitHub Actions deja presente=si|no)
//   node infra/enlaces-cloudflare/ruta.mjs poner   la pone (si ya está, no hace nada)
//   node infra/enlaces-cloudflare/ruta.mjs sacar   la saca (sólo ESTA ruta, nunca otra)
//
// Necesita CLOUDFLARE_API_TOKEN con permiso "Zone → Workers Routes: Edit" (y "Zone → Zone: Read", o la zona ya dada en CLOUDFLARE_ZONE_ID).
// Sin dependencias: sólo fetch. Nunca imprime el token.

import fs from 'node:fs';

export const API = 'https://api.cloudflare.com/client/v4';
export const ZONA = 'radarbalcarce.com';
export const PATRON = 'radarbalcarce.com/r/*';
export const WORKER = 'radar-balcarce-enlaces';

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

/** La ruta de los enlaces con ese patrón, si está; y si el patrón lo usa OTRO Worker (conflicto: no se toca). */
export function buscarRuta(rutas = []) {
  const conPatron = rutas.filter((x) => x?.pattern === PATRON);
  return { nuestra: conPatron.find((x) => x.script === WORKER) ?? null, ajena: conPatron.find((x) => x.script !== WORKER) ?? null };
}

/** Hace lo pedido ('ver' | 'poner' | 'sacar'). Devuelve { ok, presente, texto }. */
export async function ruta(accion, { env = process.env, fetchFn = fetch } = {}) {
  const token = String(env.CLOUDFLARE_API_TOKEN ?? '').trim();
  if (!['ver', 'poner', 'sacar'].includes(accion)) return { ok: false, presente: null, texto: 'Uso: ruta.mjs ver | poner | sacar' };
  if (!token) return { ok: false, presente: null, texto: 'Falta CLOUDFLARE_API_TOKEN.' };
  const z = await idDeLaZona({ token, fetchFn, env });
  if (!z.ok) return { ok: false, presente: null, texto: z.error };
  const leer = async () => {
    const r = await pedir(`/zones/${z.id}/workers/routes`, { token, fetchFn });
    return r.ok ? { ok: true, rutas: Array.isArray(r.result) ? r.result : [] } : { ok: false, error: `no se pudieron leer las rutas (${r.error}); hace falta el permiso "Workers Routes: Edit"` };
  };
  let leidas = await leer();
  if (!leidas.ok) return { ok: false, presente: null, texto: leidas.error };

  const textos = [];
  let ok = true;
  const { nuestra, ajena } = buscarRuta(leidas.rutas);
  if (accion === 'poner') {
    if (nuestra) textos.push(`La ruta ${PATRON} → ${WORKER} ya estaba puesta.`);
    else if (ajena) { ok = false; textos.push(`No se pone: el patrón ${PATRON} ya apunta a otro Worker (${ajena.script}). Hay que mirarlo a mano en Cloudflare.`); }
    else {
      const r = await pedir(`/zones/${z.id}/workers/routes`, { metodo: 'POST', cuerpo: { pattern: PATRON, script: WORKER }, token, fetchFn });
      if (r.ok) textos.push(`Ruta PUESTA: ${PATRON} → ${WORKER}. Falta probar un enlace a mano y recién después prender ENLACES_CORTOS.`);
      else { ok = false; textos.push(`No se pudo poner la ruta ${PATRON}: ${r.error}`); }
    }
  } else if (accion === 'sacar') {
    if (!nuestra) textos.push(`La ruta ${PATRON} → ${WORKER} no estaba puesta: nada que sacar.${ajena ? ` (OJO: el patrón apunta a ${ajena.script}; no se tocó.)` : ''}`);
    else {
      const r = await pedir(`/zones/${z.id}/workers/routes/${nuestra.id}`, { metodo: 'DELETE', token, fetchFn });
      if (r.ok) textos.push(`Ruta SACADA: ${PATRON}. OJO: todo enlace corto que ya salió en una red dejó de andar. Si ya hay enlaces publicados, volvé a ponerla.`);
      else { ok = false; textos.push(`No se pudo sacar la ruta ${PATRON}: ${r.error}.`); }
    }
  }
  if (accion !== 'ver') {
    // Se confirma contra la lista de Cloudflare, no contra lo que dijo el pedido.
    leidas = await leer();
    if (!leidas.ok) return { ok: false, presente: null, texto: `${textos.join(' ')} No se pudo confirmar cómo quedó (${leidas.error}).` };
    const queda = Boolean(buscarRuta(leidas.rutas).nuestra);
    if (accion === 'poner' && !queda && ok) { ok = false; textos.push('Cloudflare dijo que sí, pero la ruta no aparece en la lista: revisar a mano.'); }
    if (accion === 'sacar' && queda) { ok = false; textos.push('La ruta sigue en la lista: sacarla a mano.'); }
  }
  const actual = buscarRuta(leidas.rutas);
  const presente = Boolean(actual.nuestra);
  if (accion === 'ver') {
    textos.push(actual.ajena && !actual.nuestra ? `OJO: el patrón ${PATRON} apunta a otro Worker (${actual.ajena.script}), no a los enlaces.`
      : presente ? `La ruta ${PATRON} → ${WORKER} está PUESTA: los enlaces cortos andan.`
        : `La ruta ${PATRON} NO está puesta: los enlaces cortos no andan (y ENLACES_CORTOS tiene que estar vacía).`);
  }
  return { ok, presente, texto: textos.join('\n') };
}

if (process.argv[1] && process.argv[1].endsWith('ruta.mjs') && process.argv[1].includes('enlaces-cloudflare')) {
  const r = await ruta(process.argv[2]);
  console.log(r.texto);
  if (process.env.GITHUB_OUTPUT && r.presente !== null) fs.appendFileSync(process.env.GITHUB_OUTPUT, `presente=${r.presente ? 'si' : 'no'}\n`);
  process.exit(r.ok ? 0 : 1);
}

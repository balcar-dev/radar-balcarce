// Las comprobaciones del archivo permanente contra Cloudflare de verdad (16/10/2026). Las corre "Archivo permanente (producción)" antes de
// poner la ruta (contra la dirección de workers.dev del Worker) y justo después (contra radarbalcarce.com): si algo no da, la ruta NO se pone,
// o se saca sola. También se pueden correr a mano (ver la guía, sección 5).
//
//   node infra/archivo-cloudflare/verificar.mjs workers-dev --manifiesto=m.json   el Worker en su dirección propia, antes de la ruta
//   node infra/archivo-cloudflare/verificar.mjs sitio --manifiesto=m.json         radarbalcarce.com, con la ruta puesta
//   (con --con-fotos, además una foto de una nota archivada: para cuando también se pone la ruta de las fotos)
//
// Qué mira (con una nota del manifiesto del depósito y la nota más nueva de web/data/archivo.json):
//   · una nota que el sitio tiene responde 200 y NO viene del archivo (las notas recientes no notan el Worker);
//   · una dirección con otro titular y el id de una nota archivada responde 301 a su dirección canónica (eso sólo lo hace el archivo);
//   · una nota que no existe responde 404;
//   · en workers.dev, además, /_archivo/estado responde con las notas archivadas.
// Sin dependencias: sólo fetch. No necesita claves.

import fs from 'node:fs';
import path from 'node:path';

export const URL_DEL_WORKER = 'https://radar-balcarce-archivo.radarbalcarce.workers.dev';
export const URL_DEL_SITIO = 'https://radarbalcarce.com';

/**
 * Qué notas usar: una del archivo del sitio con más de un día (la más nueva de ésas: seguro ya está publicada, aunque el despliegue de la
 * última media hora todavía no haya terminado) y la más vieja del manifiesto del depósito.
 */
export function elegirMuestras({ archivo = [], manifiesto = null, ahora = Date.now() }) {
  const porFecha = [...archivo].filter((n) => n?.id && n?.slug && new Date(n.fecha).getTime() <= Number(ahora) - 24 * 3600e3)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const reciente = porFecha[0] ? `/nota/${porFecha[0].slug}-${porFecha[0].id}` : null;
  const archivadas = Object.entries(manifiesto?.notas ?? {}).filter(([, n]) => typeof n?.ruta === 'string' && n.ruta.startsWith('/nota/'))
    .sort((a, b) => String(a[1].fecha ?? '').localeCompare(String(b[1].fecha ?? '')));
  const [id, n] = archivadas[0] ?? [];
  const foto = archivadas.flatMap(([, x]) => (x.objetos ?? []).map((o) => o?.clave)).find((c) => /^fotos-notas\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(String(c ?? ''))) ?? null;
  return { reciente, archivada: id ? { id, ruta: n.ruta } : null, foto: foto ? `/${foto}` : null };
}

async function pedir(url, fetchFn) {
  try {
    return await fetchFn(url, { redirect: 'manual', headers: { 'user-agent': 'radar-balcarce-verificar-archivo' }, signal: AbortSignal.timeout(20000) });
  } catch { return null; }
}

/**
 * Corre las comprobaciones contra `base`. Devuelve { ok, lineas: [texto] } (cada línea empieza con "bien" o "MAL").
 */
export async function verificar({ base, muestras, conEstado = false, conFoto = false, fetchFn = fetch }) {
  const lineas = [];
  let ok = true;
  const marcar = (bien, texto) => { lineas.push(`${bien ? 'bien' : 'MAL '} ${texto}`); if (!bien) ok = false; };

  if (!muestras.reciente) marcar(false, 'no hay una nota reciente en web/data/archivo.json para probar');
  else {
    const r = await pedir(`${base}${muestras.reciente}`, fetchFn);
    marcar(r?.status === 200 && r.headers.get('x-radar-archivo') !== 'r2', `nota reciente ${muestras.reciente} → ${r?.status ?? 'sin respuesta'}${r?.headers.get('x-radar-archivo') ? ` (x-radar-archivo: ${r.headers.get('x-radar-archivo')})` : ''} (tiene que ser 200 del sitio)`);
  }

  if (!muestras.archivada) marcar(false, 'el manifiesto del depósito no tiene ninguna nota (¿se cargaron?)');
  else {
    const falsa = `/nota/verificacion-del-archivo-${muestras.archivada.id}`;
    const r = await pedir(`${base}${falsa}`, fetchFn);
    const destino = r?.headers.get('location') ?? '';
    let camino = '';
    try { camino = new URL(destino, base).pathname; } catch { camino = destino; }
    marcar(r?.status === 301 && camino === muestras.archivada.ruta, `${falsa} → ${r?.status ?? 'sin respuesta'}${destino ? ` a ${camino}` : ''} (tiene que ser 301 a ${muestras.archivada.ruta}: lo hace el archivo)`);
  }

  const nada = await pedir(`${base}/nota/no-existe-zzzzzz`, fetchFn);
  marcar(nada?.status === 404, `/nota/no-existe-zzzzzz → ${nada?.status ?? 'sin respuesta'} (tiene que ser 404)`);

  // Con la ruta de las fotos puesta: una foto de una nota archivada tiene que llegar (del sitio o, si el sitio ya no la tiene, de R2).
  if (conFoto) {
    if (!muestras.foto) marcar(false, 'el manifiesto no tiene ninguna foto para probar');
    else {
      const r = await pedir(`${base}${muestras.foto}`, fetchFn);
      marcar(r?.status === 200 && /^image\//.test(r.headers.get('content-type') ?? ''), `${muestras.foto} → ${r?.status ?? 'sin respuesta'} ${r?.headers.get('content-type') ?? ''} (tiene que ser 200 con una imagen)`);
    }
  }

  if (conEstado) {
    const r = await pedir(`${base}/_archivo/estado`, fetchFn);
    let estado = null;
    try { estado = r?.status === 200 ? await r.json() : null; } catch { estado = null; }
    marcar(Boolean(estado && estado.notas > 0), `/_archivo/estado → ${r?.status ?? 'sin respuesta'}${estado ? ` (${estado.notas} notas archivadas, última corrida ${estado.cuando}, ${estado.ok ? 'bien' : 'con problemas'})` : ''}`);
  }
  return { ok, lineas };
}

function leerJson(ruta, porDefecto) {
  try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch { return porDefecto; }
}

if (process.argv[1] && process.argv[1].endsWith('verificar.mjs')) {
  const modo = process.argv[2];
  const arg = (n) => process.argv.find((x) => x.startsWith(`--${n}=`))?.slice(n.length + 3);
  if (!['workers-dev', 'sitio'].includes(modo)) { console.log('Uso: verificar.mjs workers-dev|sitio --manifiesto=archivo.json'); process.exit(2); }
  const raiz = path.join(import.meta.dirname, '..', '..');
  const muestras = elegirMuestras({
    archivo: leerJson(path.join(raiz, 'web', 'data', 'archivo.json'), { notas: [] }).notas ?? [],
    manifiesto: arg('manifiesto') ? leerJson(arg('manifiesto'), null) : null,
  });
  const base = modo === 'sitio' ? (process.env.SITIO || URL_DEL_SITIO) : (process.env.ARCHIVO_URL || URL_DEL_WORKER);
  const r = await verificar({ base: base.replace(/\/$/, ''), muestras, conEstado: modo === 'workers-dev', conFoto: process.argv.includes('--con-fotos') });
  console.log(`Comprobaciones contra ${base}:`);
  for (const l of r.lineas) console.log(`  ${l}`);
  console.log(r.ok ? 'Todo bien.' : 'Algo NO dio: ver arriba.');
  process.exit(r.ok ? 0 : 1);
}

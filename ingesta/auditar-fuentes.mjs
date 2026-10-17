// La auditoría semanal de las fuentes: cuánto aporta y cómo está cada medio, mirando SÓLO lo que ya se
// publicó (sin red, sin gastar nada). Pedido de Hernán y Andrés (15/10/2026): que la lista de fuentes se
// pueda revisar sola cada semana.
//
//   node ingesta/auditar-fuentes.mjs              los últimos 7 días
//   node ingesta/auditar-fuentes.mjs --dias=30    otra ventana
//   node ingesta/auditar-fuentes.mjs --json       la salida en JSON (para otro programa)
//
// De dónde sale cada número (web/data/archivo.json y web/data/historico/*.json, las notas publicadas, y
// web/data/estadisticas.json, las visitas de cada nota por día):
//   · publicadas: notas publicadas en la ventana que nombran al medio entre sus fuentes.
//   · únicas: las que contó SÓLO ese medio.
//   · imprescindible: notas de afuera que llegaron al mínimo de medios de su sección (POPULARIDAD,
//     ingesta/criterio.mjs) y que, sin ese medio, no llegaban. Los medios del mismo dueño (`grupo`) cuentan
//     como una sola voz, igual que en el cruce (contarMedios).
//   · redundante: todas sus notas de afuera las contó también otro medio del mismo dueño.
//   · de acá: notas de Balcarce o la zona (las que el motor marcó `local`) en las que figura.
//   · visitas: las de esas notas.
//   · última: cuándo se publicó la última nota que lo nombra.
// Lo que NO puede medir sin red: si el feed responde hoy (eso lo hace `node ingesta/medir-fuentes.mjs`, que sí
// sale a internet, y el sondeo desde Cloudflare). Las marcas que pone:
//   · "sin aporte": un medio de afuera sin ninguna nota publicada en la ventana.
//   · "dormida": un medio de Balcarce sin notas publicadas hace más de DIAS_DORMIDA días.
//   · "redundante" y "nunca imprescindible" (de afuera, con notas): candidatas a sacar.
// Sin dependencias: sólo Node.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FUENTES, FUENTES_NACIONALES } from './fuentes.mjs';
import { FUENTES_CRUCE } from './fuentes-cruce.mjs';
import { mediosMinimos } from './popularidad.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIAS_DORMIDA = 3;
const DIA = 86400000;

/** Los medios del registro (activos o no), con su dueño y si son de Balcarce. */
export function mediosDelRegistro(registro = [...FUENTES, ...FUENTES_NACIONALES, ...FUENTES_CRUCE]) {
  const m = new Map();
  for (const f of registro) {
    const nombre = f.medio ?? f.nombre;
    const previo = m.get(nombre) ?? { nombre, grupo: null, local: false, activo: false, feeds: 0 };
    previo.grupo = previo.grupo ?? f.grupo ?? null;
    previo.local = previo.local || f.alcance === 'local';
    previo.activo = previo.activo || f.activa !== false;
    previo.feeds += f.activa !== false ? 1 : 0;
    m.set(nombre, previo);
  }
  return m;
}

/** Las notas publicadas (archivo + histórico), sin repetir y sin las propias. */
export function leerPublicadas(raiz = RAIZ) {
  const leer = (r) => { try { return JSON.parse(fs.readFileSync(r, 'utf8')); } catch { return null; } };
  const dir = path.join(raiz, 'web', 'data');
  const todas = [...(leer(path.join(dir, 'archivo.json'))?.notas ?? [])];
  let hist = [];
  try { hist = fs.readdirSync(path.join(dir, 'historico')).filter((f) => f.endsWith('.json')); } catch { /* sin histórico */ }
  for (const f of hist) todas.push(...(leer(path.join(dir, 'historico', f))?.notas ?? []));
  const vistas = new Set();
  return todas.filter((n) => n && n.id && !n.propia && !vistas.has(n.id) && vistas.add(n.id)).map((n) => ({
    id: n.id, cuando: n.visto ?? n.fecha ?? null, seccion: n.seccion ?? null, local: !!n.local,
    medios: [...new Set((Array.isArray(n.medios) ? n.medios : []).filter(Boolean))],
  }));
}

/** Las visitas de cada nota, sumando los días de web/data/estadisticas.json (el detalle diario de Cloudflare). */
export function visitasPorNota(raiz = RAIZ) {
  const v = {};
  try {
    const e = JSON.parse(fs.readFileSync(path.join(raiz, 'web', 'data', 'estadisticas.json'), 'utf8'));
    for (const dia of Object.values(e.dias ?? {})) for (const [id, n] of Object.entries(dia?.notas ?? {})) v[id] = (v[id] ?? 0) + (Number(n) || 0);
  } catch { /* sin estadísticas */ }
  return v;
}

/** El mínimo de medios de afuera de una sección (sin figura: es el caso que más pide). */
export const minimoDe = (seccion) => mediosMinimos(seccion);

/** Las voces distintas (un dueño = una voz) entre estos medios. */
export function voces(medios, grupoDe) {
  return new Set(medios.map((m) => grupoDe(m) ?? m)).size;
}

/**
 * Cuántas notas de afuera habrían llegado al mínimo de medios si sólo se leyeran los medios de `conjunto`.
 * Devuelve { total, llegan, porSeccion: { sección: { total, llegan } } }.
 */
export function simularLista(notas, conjunto, { grupoDe = () => null, esDeBalcarce = () => false } = {}) {
  const r = { total: 0, llegan: 0, porSeccion: {} };
  for (const n of notas) {
    if (n.local || n.medios.some(esDeBalcarce)) continue;
    const s = n.seccion ?? '—';
    r.porSeccion[s] ??= { total: 0, llegan: 0 };
    r.total += 1;
    r.porSeccion[s].total += 1;
    if (voces(n.medios.filter((m) => conjunto.has(m)), grupoDe) >= minimoDe(n.seccion)) {
      r.llegan += 1;
      r.porSeccion[s].llegan += 1;
    }
  }
  return r;
}

/**
 * La auditoría: una fila por medio activo, con sus números y sus marcas.
 * `notas` son las publicadas (leerPublicadas); `vistas` es { id: visitas } (visitasPorNota).
 */
export function auditarFuentes({ notas, registro, vistas = {}, ahora = new Date(), dias = 7 } = {}) {
  const medios = mediosDelRegistro(registro);
  const grupoDe = (m) => medios.get(m)?.grupo ?? null;
  const esDeBalcarce = (m) => !!medios.get(m)?.local;
  const desde = ahora.getTime() - dias * DIA;
  const enVentana = notas.filter((n) => n.cuando && Date.parse(n.cuando) >= desde && Date.parse(n.cuando) <= ahora.getTime());
  const visitas = (id) => { const v = vistas[id]; return typeof v === 'number' ? v : Number(v?.total ?? v?.vistas ?? 0) || 0; };
  const activos = new Set([...medios.values()].filter((m) => m.activo).map((m) => m.nombre));
  const filas = new Map([...activos].map((nombre) => [nombre, {
    medio: nombre, deBalcarce: esDeBalcarce(nombre), grupo: grupoDe(nombre), feeds: medios.get(nombre).feeds,
    publicadas: 0, unicas: 0, imprescindible: 0, deAca: 0, visitas: 0, afuera: 0, conHermano: 0, ultima: null,
  }]));
  // La última nota que nombra a cada medio, con todo el historial (no sólo la ventana).
  for (const n of notas) for (const m of n.medios) {
    const f = filas.get(m);
    if (f && n.cuando && (!f.ultima || n.cuando > f.ultima) && Date.parse(n.cuando) <= ahora.getTime()) f.ultima = n.cuando;
  }
  for (const n of enVentana) {
    const lista = n.medios.filter((m) => activos.has(m));
    const deAfuera = !n.local && !n.medios.some(esDeBalcarce);
    const vocesNota = voces(lista, grupoDe);
    for (const m of lista) {
      const f = filas.get(m);
      f.publicadas += 1;
      if (n.medios.length === 1) f.unicas += 1;
      if (n.local) f.deAca += 1;
      f.visitas += visitas(n.id);
      if (!deAfuera) continue;
      f.afuera += 1;
      const g = grupoDe(m);
      const hermanos = g ? lista.filter((x) => x !== m && grupoDe(x) === g) : [];
      if (hermanos.length) f.conHermano += 1;
      // Imprescindible: con él llega al mínimo y sin su voz no (si un hermano está, la voz sigue).
      if (vocesNota >= minimoDe(n.seccion) && !hermanos.length && vocesNota - 1 < minimoDe(n.seccion)) f.imprescindible += 1;
    }
  }
  const resultado = [...filas.values()].map((f) => {
    const marcas = [];
    const diasSinNotas = f.ultima ? Math.floor((ahora.getTime() - Date.parse(f.ultima)) / DIA) : null;
    if (f.deBalcarce) {
      if (diasSinNotas == null || diasSinNotas > DIAS_DORMIDA) marcas.push('dormida');
    } else if (f.publicadas === 0) marcas.push('sin aporte');
    else {
      if (f.afuera > 0 && f.conHermano === f.afuera) marcas.push('redundante');
      if (f.imprescindible === 0 && f.unicas === 0 && f.deAca === 0) marcas.push('nunca imprescindible');
    }
    return { ...f, diasSinNotas, marcas };
  });
  resultado.sort((a, b) => Number(b.deBalcarce) - Number(a.deBalcarce) || b.imprescindible - a.imprescindible || b.publicadas - a.publicadas || a.medio.localeCompare(b.medio, 'es'));
  return {
    dias,
    desde: new Date(desde).toISOString(),
    hasta: ahora.toISOString(),
    notas: enVentana.length,
    simulacion: simularLista(enVentana, activos, { grupoDe, esDeBalcarce }),
    filas: resultado,
  };
}

/** El informe en texto, para leer en la consola. */
export function informeEnTexto(a) {
  const L = [];
  L.push(`Auditoría de fuentes · ${a.desde.slice(0, 10)} al ${a.hasta.slice(0, 10)} (${a.dias} días, ${a.notas} notas publicadas)`);
  L.push(`Notas de afuera que llegaron al mínimo de medios con los medios activos: ${a.simulacion.llegan} de ${a.simulacion.total}`);
  L.push('');
  L.push('Medio · publicadas · únicas · imprescindible · de acá · visitas · días sin notas · marcas');
  for (const f of a.filas) {
    L.push(`${f.deBalcarce ? '[Balcarce] ' : ''}${f.medio} · ${f.publicadas} · ${f.unicas} · ${f.imprescindible} · ${f.deAca} · ${f.visitas} · ${f.diasSinNotas ?? '—'} · ${f.marcas.join(', ') || 'ok'}`);
  }
  const marcadas = a.filas.filter((f) => f.marcas.length);
  L.push('');
  L.push(marcadas.length ? `Para mirar: ${marcadas.map((f) => `${f.medio} (${f.marcas.join(', ')})`).join('; ')}` : 'Nada para mirar.');
  return L.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const dias = Number(args.find((a) => a.startsWith('--dias='))?.split('=')[1]) || 7;
  const vistas = visitasPorNota();
  const notas = leerPublicadas();
  // La ventana termina en la última nota publicada (en la PC el archivo puede estar atrasado).
  const ultima = notas.map((n) => n.cuando).filter(Boolean).sort().at(-1);
  const a = auditarFuentes({ notas, vistas, dias, ahora: ultima ? new Date(ultima) : new Date() });
  console.log(args.includes('--json') ? JSON.stringify(a, null, 2) : informeEnTexto(a));
}

// El detalle de las visitas a la web, día por día (1/10/2026): a qué hora entra
// la gente, qué notas lee, de dónde llega (Google, Facebook, directo…), con qué
// aparato y desde qué país. Lo lee la pestaña "Números" del panel del celular
// (web/public/panel/numeros.js) desde web/data/estadisticas.json, en `dias`.
//
// Cada medición (9 y 21) vuelve a pedir los últimos tres días de Balcarce y los
// pisa: el día de hoy se va completando y los de ayer y anteayer se corrigen con
// lo que Cloudflare terminó de contar. Los días más viejos no se tocan.
//
// Sólo números agregados (el repositorio es público): nada de quién entró.
// Cada grupo se pide por separado: si Cloudflare no acepta uno (una dimensión
// que no existe o que el plan no trae), los otros salen igual y lo que falta
// queda dicho en el registro.
//
// Sin dependencias. `consultar` viene de estadisticas.mjs (así no hay imports en círculo).

import { diaAR, horaAR } from '../ingesta/zona.mjs';

export const DIAS_A_MEDIR = 3;
export const MAXIMO_DE_DIAS = 120;
const DIA_MS = 86400e3;
/** Balcarce no cambia de hora: la medianoche es siempre a las 03:00 UTC. */
const DESFASE_UTC = 3 * 3600e3;

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const texto = (s) => JSON.stringify(String(s));

/** Los días de Balcarce a medir, del más viejo al de hoy, con sus límites en milisegundos. */
export function diasAMedir(ahora = new Date(), cuantos = DIAS_A_MEDIR) {
  const dias = [];
  for (let k = cuantos - 1; k >= 0; k--) {
    const dia = diaAR(new Date(ahora.getTime() - k * DIA_MS));
    const desde = Date.parse(`${dia}T00:00:00Z`) + DESFASE_UTC;
    dias.push({ dia, desde, hasta: Math.min(desde + DIA_MS - 1000, ahora.getTime()) });
  }
  return dias;
}

/** De dónde llegó la visita, con un nombre corto: "directo", "google.com", "facebook.com"… */
export function nombreDeReferente(host) {
  let h = String(host ?? '').trim().toLowerCase();
  if (!h) return 'directo';
  h = h.replace(/^(www|m|l|lm|mobile|web)\./, '');
  if (/^radarbalcarce\.com$/.test(h)) return null; // navegar dentro del sitio no es una fuente
  if (/^google\.[a-z.]+$/.test(h) || h === 'com.google.android.googlequicksearchbox') return 'google.com';
  if (h === 't.co' || h === 'twitter.com') return 'x.com';
  if (h === 'lnkd.in') return 'linkedin.com';
  return h;
}

/** Una dirección de la web: { id } si es una nota, { pagina } si es otra cosa. */
export function clasificarCamino(camino) {
  let c = String(camino ?? '').split('?')[0].split('#')[0];
  if (!c) return null;
  if (c.length > 1) c = c.replace(/\/+$/, '');
  if (c.startsWith('/nota/')) {
    const parte = c.slice(6).split('/')[0];
    const id = parte.slice(parte.lastIndexOf('-') + 1);
    return id && id !== 'indice.json' ? { id } : null;
  }
  return { pagina: c.length > 60 ? c.slice(0, 60) : c };
}

const sumar = (mapa, clave, n) => { mapa[clave] = (mapa[clave] ?? 0) + n; };
const masVistos = (mapa, limite) => Object.fromEntries(
  Object.entries(mapa).sort((a, b) => b[1] - a[1]).slice(0, limite),
);

/**
 * Trae el detalle de los últimos días.
 *
 * @returns {Promise<{ dias: Record<string, object>, faltan: string[] }>}
 */
export async function detalleDeCloudflare({ consultar, cuenta, token, siteTag, ahora = new Date(), fetchFn = fetch }) {
  const rango = diasAMedir(ahora);
  const dias = Object.fromEntries(rango.map((d) => [d.dia, {}]));
  const faltan = [];
  const filtro = (desde, hasta) => `{ siteTag: ${texto(siteTag)}, datetime_geq: ${texto(iso(desde))}, datetime_leq: ${texto(iso(hasta))} }`;
  const pedir = async (cuerpo) => consultar({
    query: `{ viewer { accounts(filter: { accountTag: ${texto(cuenta)} }) { ${cuerpo} } } }`, token, fetchFn,
  });
  const cuentaDe = (r) => r.datos?.viewer?.accounts?.[0] ?? null;

  /** Un grupo por día, agrupado por una dimensión. */
  const porDia = async (nombre, dimension, limite, alRecibir) => {
    const cuerpo = rango.map((d, i) => `d${i}: rumPageloadEventsAdaptiveGroups(limit: ${limite}, orderBy: [count_DESC], filter: ${filtro(d.desde, d.hasta)}) { count dimensions { ${dimension} } }`).join('\n');
    const r = await pedir(cuerpo);
    const c = cuentaDe(r);
    if (!c) { faltan.push(`Cloudflare, detalle de ${nombre}: ${r.error ?? 'sin datos'}`); return; }
    rango.forEach((d, i) => alRecibir(dias[d.dia], c[`d${i}`] ?? []));
  };

  await Promise.all([
    // Totales del día.
    (async () => {
      const cuerpo = rango.map((d, i) => `d${i}: rumPageloadEventsAdaptiveGroups(limit: 1, filter: ${filtro(d.desde, d.hasta)}) { count sum { visits } }`).join('\n');
      const r = await pedir(cuerpo);
      const c = cuentaDe(r);
      if (!c) { faltan.push(`Cloudflare, detalle de totales: ${r.error ?? 'sin datos'}`); return; }
      rango.forEach((d, i) => {
        dias[d.dia].visitas = c[`d${i}`]?.[0]?.sum?.visits ?? 0;
        dias[d.dia].vistas = c[`d${i}`]?.[0]?.count ?? 0;
      });
    })(),
    // Hora por hora (en hora de Balcarce).
    (async () => {
      const r = await pedir(`horas: rumPageloadEventsAdaptiveGroups(limit: 100, orderBy: [datetimeHour_ASC], filter: ${filtro(rango[0].desde, ahora.getTime())}) { count dimensions { datetimeHour } }`);
      const c = cuentaDe(r);
      if (!c) { faltan.push(`Cloudflare, detalle por hora: ${r.error ?? 'sin datos'}`); return; }
      for (const d of rango) dias[d.dia].horas = Array(24).fill(0);
      for (const f of c.horas ?? []) {
        const cuando = new Date(f.dimensions?.datetimeHour);
        if (Number.isNaN(cuando.getTime())) continue;
        const dia = dias[diaAR(cuando)];
        if (dia?.horas) dia.horas[horaAR(cuando)] += f.count ?? 0;
      }
    })(),
    // Qué se leyó: las notas por su identificador, lo demás por su dirección.
    porDia('direcciones', 'requestPath', 100, (dia, filas) => {
      const notas = {};
      const paginas = {};
      for (const f of filas) {
        const k = clasificarCamino(f.dimensions?.requestPath);
        if (!k) continue;
        if (k.id) sumar(notas, k.id, f.count ?? 0); else sumar(paginas, k.pagina, f.count ?? 0);
      }
      dia.notas = masVistos(notas, 80);
      dia.paginas = masVistos(paginas, 15);
    }),
    porDia('referentes', 'refererHost', 40, (dia, filas) => {
      const m = {};
      for (const f of filas) {
        const nombre = nombreDeReferente(f.dimensions?.refererHost);
        if (nombre) sumar(m, nombre, f.count ?? 0);
      }
      dia.referentes = masVistos(m, 12);
    }),
    porDia('dispositivos', 'deviceType', 8, (dia, filas) => {
      const m = {};
      for (const f of filas) sumar(m, String(f.dimensions?.deviceType || 'otro').toLowerCase(), f.count ?? 0);
      dia.dispositivos = m;
    }),
    porDia('países', 'countryName', 30, (dia, filas) => {
      const m = {};
      for (const f of filas) sumar(m, String(f.dimensions?.countryName || 'sin dato'), f.count ?? 0);
      dia.paises = masVistos(m, 12);
    }),
  ]);

  // Un día que quedó sin ningún dato no se guarda.
  for (const d of Object.keys(dias)) if (!Object.keys(dias[d]).length) delete dias[d];
  return { dias, faltan };
}

/** Suma lo recién medido a lo guardado: campo por campo (lo que no se pudo medir
 *  no borra lo anterior) y sólo los últimos `maximo` días. */
export function mezclarDias(guardados = {}, nuevos = {}, maximo = MAXIMO_DE_DIAS) {
  const todos = { ...(guardados ?? {}) };
  for (const [dia, datos] of Object.entries(nuevos ?? {})) todos[dia] = { ...(todos[dia] ?? {}), ...datos };
  return Object.fromEntries(Object.entries(todos).sort((a, b) => a[0].localeCompare(b[0])).slice(-maximo));
}

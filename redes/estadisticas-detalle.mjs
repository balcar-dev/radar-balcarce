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
  if (h === 'radarbalcarce.com' || h.endsWith('.pages.dev')) return null; // navegar dentro del sitio (o de su copia de pruebas) no es una fuente
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

const sumaDe = (xs) => (xs ?? []).reduce((a, b) => a + (Number(b) || 0), 0);

/**
 * ¿Los números de un día se contradicen entre sí? Pasó de verdad (15/10/2026): el 11/10 figuraba con 0
 * vistas y las horas sumaban 98; el 9/10 con 139 vistas y las horas en cero. Una lectura así no es un
 * dato, es una falla de Cloudflare: se repite una vez y, si sigue igual, el día queda "sin lectura".
 */
export function diaIncoherente(d = {}) {
  if (d.vistas === undefined && d.visitas === undefined) return false;
  const vistas = Number(d.vistas ?? 0);
  const visitas = Number(d.visitas ?? 0);
  if (visitas > vistas) return true; // nadie visita sin cargar una página
  if (Array.isArray(d.horas) && (vistas === 0) !== (sumaDe(d.horas) === 0)) return true;
  return false;
}

/**
 * Trae el detalle de los últimos días.
 *
 * Una respuesta vacía de Cloudflare NO es un cero: no se guarda nada de ese campo. Si los números de un día
 * se contradicen se vuelve a pedir una vez (`esperaReintento` ms después); si siguen sin cerrar, o no llegó
 * nada de un día que ya terminó, ese día queda `{ sinLectura: true }` y `mezclarDias` no lo deja pisar un
 * dato bueno (15/10/2026: tres días en cero que no eran reales).
 *
 * @returns {Promise<{ dias: Record<string, object>, faltan: string[] }>}
 */
export async function detalleDeCloudflare({ consultar, cuenta, token, siteTag, ahora = new Date(), fetchFn = fetch, esperaReintento = 15000, cuantos = DIAS_A_MEDIR }) {
  let r = await juntarDetalle({ consultar, cuenta, token, siteTag, ahora, fetchFn, cuantos });
  const malos = Object.keys(r.dias).filter((d) => diaIncoherente(r.dias[d]));
  if (malos.length) {
    if (esperaReintento) await new Promise((fin) => setTimeout(fin, esperaReintento));
    const otra = await juntarDetalle({ consultar, cuenta, token, siteTag, ahora, fetchFn, cuantos });
    // Lo que ahora cierra se queda; lo que sigue contradiciéndose se marca.
    for (const d of malos) if (!diaIncoherente(otra.dias[d])) r.dias[d] = otra.dias[d]; else r.dias[d] = { sinLectura: true };
    r = { dias: r.dias, faltan: [...r.faltan, ...otra.faltan.filter((f) => !r.faltan.includes(f))] };
    for (const d of malos) if (r.dias[d]?.sinLectura) r.faltan.push(`Cloudflare, ${d}: los números del día no cierran entre sí (queda sin lectura)`);
  }
  // Un día que ya terminó y quedó sin ningún dato no es un día en cero: es un día sin lectura.
  const hoy = diaAR(ahora);
  for (const d of Object.keys(r.dias)) {
    if (Object.keys(r.dias[d]).length) continue;
    if (d === hoy) delete r.dias[d]; else r.dias[d] = { sinLectura: true };
  }
  return r;
}

async function juntarDetalle({ consultar, cuenta, token, siteTag, ahora, fetchFn, cuantos = DIAS_A_MEDIR }) {
  const rango = diasAMedir(ahora, cuantos);
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
    // Un día sin filas no escribe nada (no es un cero); si ningún día trajo filas, se deja dicho.
    let alguno = false;
    rango.forEach((d, i) => {
      const filas = c[`d${i}`] ?? [];
      if (!filas.length) return;
      alguno = true;
      alRecibir(dias[d.dia], filas);
    });
    if (!alguno) faltan.push(`Cloudflare, detalle de ${nombre}: respuesta vacía`);
  };

  await Promise.all([
    // Totales del día.
    (async () => {
      const cuerpo = rango.map((d, i) => `d${i}: rumPageloadEventsAdaptiveGroups(limit: 1, filter: ${filtro(d.desde, d.hasta)}) { count sum { visits } }`).join('\n');
      const r = await pedir(cuerpo);
      const c = cuentaDe(r);
      if (!c) { faltan.push(`Cloudflare, detalle de totales: ${r.error ?? 'sin datos'}`); return; }
      // Sin fila no hay dato: no se escribe un 0 (una respuesta vacía no es "cero visitas").
      let alguno = false;
      rango.forEach((d, i) => {
        const fila = c[`d${i}`]?.[0];
        if (!fila) return;
        alguno = true;
        dias[d.dia].visitas = fila.sum?.visits ?? 0;
        dias[d.dia].vistas = fila.count ?? 0;
      });
      if (!alguno) faltan.push('Cloudflare, detalle de totales: respuesta vacía');
    })(),
    // Hora por hora (en hora de Balcarce).
    (async () => {
      const r = await pedir(`horas: rumPageloadEventsAdaptiveGroups(limit: 100, orderBy: [datetimeHour_ASC], filter: ${filtro(rango[0].desde, ahora.getTime())}) { count dimensions { datetimeHour } }`);
      const c = cuentaDe(r);
      if (!c) { faltan.push(`Cloudflare, detalle por hora: ${r.error ?? 'sin datos'}`); return; }
      if (!(c.horas ?? []).length) { faltan.push('Cloudflare, detalle por hora: respuesta vacía'); return; }
      // El arreglo de horas se arma sólo para los días que recibieron alguna fila (no se inventan días en cero).
      for (const f of c.horas ?? []) {
        const cuando = new Date(f.dimensions?.datetimeHour);
        if (Number.isNaN(cuando.getTime())) continue;
        const dia = dias[diaAR(cuando)];
        if (!dia) continue;
        dia.horas ??= Array(24).fill(0);
        dia.horas[horaAR(cuando)] += f.count ?? 0;
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

  return { dias, faltan };
}

/** Cuánto "hay" en un valor medido: el número, o la suma de un arreglo o de un mapa. 0 = vacío. */
const peso = (v) => {
  if (v && typeof v === 'object') return Object.values(v).reduce((a, b) => a + (Number(b) || 0), 0);
  return Number(v) || 0;
};

/** Suma lo recién medido a lo guardado: campo por campo (lo que no se pudo medir
 *  no borra lo anterior) y sólo los últimos `maximo` días.
 *
 *  Un valor nuevo vacío (0, [0,0,…], {}) NO pisa uno viejo con datos, y un día `sinLectura` nunca
 *  pisa un día con datos: un día cerrado sólo puede mejorar (15/10/2026: un cero de Cloudflare
 *  borraba lecturas buenas). Cuando llega una lectura buena sobre un día que estaba `sinLectura`, la marca se va. */
export function mezclarDias(guardados = {}, nuevos = {}, maximo = MAXIMO_DE_DIAS) {
  const todos = { ...(guardados ?? {}) };
  for (const [dia, datos] of Object.entries(nuevos ?? {})) {
    const viejo = todos[dia] ?? {};
    const { sinLectura, ...campos } = datos ?? {};
    const viejoConDatos = Object.entries(viejo).some(([k, v]) => k !== 'sinLectura' && peso(v) > 0);
    if (sinLectura && !Object.keys(campos).length) {
      if (!viejoConDatos) todos[dia] = { ...viejo, sinLectura: true };
      continue;
    }
    const r = { ...viejo };
    for (const [k, v] of Object.entries(campos)) if (!(peso(v) === 0 && peso(viejo[k]) > 0)) r[k] = v;
    if (Object.values(campos).some((v) => peso(v) > 0)) delete r.sinLectura;
    todos[dia] = r;
  }
  return Object.fromEntries(Object.entries(todos).sort((a, b) => a[0].localeCompare(b[0])).slice(-maximo));
}

// Repara los días de web/data/estadisticas.json que quedaron guardados con ceros falsos (regla 168, 15/10/2026).
//
// Qué pasó: entre el 9 y el 15/10 Cloudflare contestó vacío o a medias y el vigilante guardó eso como si fuera tráfico
// real: días con 0 visitas y 0 vistas, días con las horas en cero y 139 vistas, días con 400 celulares y 139 vistas… La
// causa ya está arreglada para lo que se mida de ahora en adelante (docs/analiticas/ANALISIS.md, 1.3 y parte E); esto
// arregla lo que ya estaba guardado.
//
//   node redes/reparar-estadisticas.mjs                       SIMULA (por defecto): muestra qué días son sospechosos y, si
//                                                             hay credenciales, qué pondría en su lugar. No escribe nada.
//   node redes/reparar-estadisticas.mjs --aplicar             escribe web/data/estadisticas.json (sólo `dias`, sólo los
//                                                             días sospechosos para los que Cloudflare dio una lectura buena)
//   --sin-red                                                 sólo el diagnóstico, sin hablar con Cloudflare
//   --dias=2026-10-09,2026-10-11                              limita la reparación a esos días
//   --con-hoy                                                 incluye el día de hoy (por defecto no: está a medias y la
//                                                             próxima medición de las 9 o las 21 lo corrige sola)
//   --marcar-sin-lectura                                      con --aplicar: un día sospechoso que está TODO en cero y que
//                                                             Cloudflare ya no puede dar queda `{ sinLectura: true }` (el
//                                                             panel lo dibuja con una rayita, no como cero)
//   --archivo=ruta                                            otro archivo en lugar de web/data/estadisticas.json
//
// Credenciales (variables de entorno o el .env de la raíz; NUNCA se imprimen): CLOUDFLARE_ACCOUNT_ID y
// CLOUDFLARE_ANALYTICS_TOKEN (o, si falta, CLOUDFLARE_API_TOKEN); opcional CLOUDFLARE_SITE_TAG.
//
// Reglas de seguridad:
//   · Un cero nunca se vuelve "dato": una lectura nueva sólo reemplaza a un día si es buena (vistas > 0, los números
//     cierran entre sí y no falta ningún grupo). Si no, el día queda como estaba. «Un día cerrado sólo puede mejorar.»
//   · Sólo se toca `dias`. Los `puntos` (las mediciones de las 9 y las 21) se informan pero no se tocan: son ventanas de
//     12 y 24 horas de un momento y no se pueden reconstruir.
//
// Sin dependencias: sólo lo que trae Node (más los módulos de redes/ y ingesta/).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { leerVariable } from '../reels/claves.mjs';
import { leerJsonEstricto } from '../ingesta/json.mjs';
import { diaAR } from '../ingesta/zona.mjs';
import { sinSecretos } from './whatsapp.mjs';
import { consultar, buscarSitio, tokenDeCloudflare, esIncoherente } from './estadisticas.mjs';
import { detalleDeCloudflare, diaIncoherente } from './estadisticas-detalle.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const ARCHIVO = path.join(RAIZ, 'web', 'data', 'estadisticas.json');
const DIA_MS = 86400e3;
const DESFASE_UTC = 3 * 3600e3; // la medianoche de Balcarce es a las 03:00 UTC
/** Cuánto se puede apartar un grupo (dispositivos, países, notas) del total de vistas: Cloudflare estima, no es exacto. */
const TOLERANCIA = { relativa: 0.25, absoluta: 10 };

/** Cuánto "hay" en un valor: el número, o la suma de un arreglo o de un mapa. 0 = vacío. */
const peso = (v) => {
  if (v && typeof v === 'object') return Object.values(v).reduce((a, b) => a + (Number(b) || 0), 0);
  return Number(v) || 0;
};

const GRUPOS = [
  ['horas', (d) => peso(d.horas)],
  ['notas y páginas', (d) => peso(d.notas) + peso(d.paginas)],
  ['dispositivos', (d) => peso(d.dispositivos)],
  ['países', (d) => peso(d.paises)],
];

// ------------------------------------------------------------------ el diagnóstico

/**
 * ¿Los números de un día guardado son sospechosos? Devuelve null si el día está sano, o
 * `{ gravedad, motivos }` con la gravedad:
 *   · 'vacio'      todo en cero (ningún número del día vale algo): el cero que no es real;
 *   · 'contradice' los números se pelean entre sí (0 vistas con horas, horas en cero con vistas, 400 celulares con 139 vistas…);
 *   · 'incompleto' hay vistas pero falta un grupo entero (sin dispositivos, sin países…);
 *   · 'sinLectura' el día ya está marcado sin lectura (se vuelve a intentar).
 */
export function diagnosticarDia(d) {
  if (!d || typeof d !== 'object') return { gravedad: 'vacio', motivos: ['el día no tiene nada'] };
  if (d.sinLectura) return { gravedad: 'sinLectura', motivos: ['marcado sin lectura'] };
  const vistas = Number(d.vistas ?? 0);
  const visitas = Number(d.visitas ?? 0);
  const evidencia = Math.max(0, ...GRUPOS.map(([, f]) => f(d)));
  if (vistas === 0 && visitas === 0 && evidencia === 0) return { gravedad: 'vacio', motivos: ['0 visitas, 0 vistas y ningún grupo con datos'] };

  const motivos = [];
  if (vistas === 0 && evidencia > 0) motivos.push(`0 vistas pero los grupos suman hasta ${evidencia}`);
  if (diaIncoherente(d) && vistas > 0) {
    if (visitas > vistas) motivos.push(`más visitas (${visitas}) que vistas (${vistas})`);
    else motivos.push(`${vistas} vistas y las horas suman ${peso(d.horas)}`);
  }
  if (vistas > 0) {
    for (const [nombre, f] of GRUPOS) {
      const suma = f(d);
      if (suma > 0 && Math.abs(suma - vistas) >= TOLERANCIA.absoluta && Math.abs(suma - vistas) / vistas > TOLERANCIA.relativa) {
        motivos.push(`${nombre} suman ${suma} y las vistas son ${vistas}`);
      }
    }
  }
  if (motivos.length) return { gravedad: 'contradice', motivos };

  if (vistas > 0) {
    const faltan = GRUPOS.filter(([, f]) => f(d) === 0).map(([n]) => n);
    if (faltan.length) return { gravedad: 'incompleto', motivos: [`faltan ${faltan.join(', ')}`] };
  }
  return null;
}

/** ¿Esta lectura nueva sirve para reemplazar un día sospechoso? Con vistas, sin contradicciones y sin grupos que falten. */
export function lecturaBuena(nuevo) {
  if (!nuevo || nuevo.sinLectura) return false;
  if (!(Number(nuevo.vistas) > 0)) return false; // un cero no se prueba solo: no se acepta
  return diagnosticarDia(nuevo) === null;
}

/** Los días sospechosos de `dias`, del más viejo al más nuevo. `hoy` y `soloDias` filtran. */
export function diasSospechosos(dias = {}, { hoy = diaAR(), conHoy = false, soloDias = null } = {}) {
  const r = [];
  for (const dia of Object.keys(dias ?? {}).sort()) {
    if (soloDias && !soloDias.includes(dia)) continue;
    const dx = diagnosticarDia(dias[dia]);
    if (!dx) continue;
    r.push({ dia, hoy: dia === hoy, omitido: dia === hoy && !conHoy, ...dx });
  }
  return r;
}

/** Las mediciones (puntos) cuyas ventanas de 12 y 24 horas se contradicen. Sólo se informan. */
export function puntosSospechosos(puntos = []) {
  return (puntos ?? []).filter((p) => p?.cloudflare === 'incoherente' || p?.cloudflare === 'sitio-no-encontrado' || (p?.web ? esIncoherente(p.web) : false))
    .map((p) => p.cuando);
}

// ------------------------------------------------------------------ la reparación

const resumen = (d) => {
  if (!d || typeof d !== 'object') return '(nada)';
  if (d.sinLectura) return 'sin lectura';
  return `${d.visitas ?? '-'} visitas, ${d.vistas ?? '-'} vistas, horas ${peso(d.horas)}, celulares/compus ${peso(d.dispositivos)}, países ${peso(d.paises)}`;
};

/**
 * Decide qué hacer con cada día sospechoso. NO escribe nada: devuelve el plan y los `dias` resultantes.
 *
 * @param {object} o.dias        `dias` de estadisticas.json
 * @param {(dia:string)=>Promise<{dia:object|null, faltan:string[]}>} o.leerDia  pide un día a Cloudflare (se inyecta, así se prueba sin red)
 * @param {boolean} [o.marcarSinLectura]  un día todo en cero que no se pudo recuperar queda `{ sinLectura: true }`
 */
export async function planDeReparacion({ dias = {}, leerDia, hoy = diaAR(), conHoy = false, soloDias = null, marcarSinLectura = false } = {}) {
  const sospechosos = diasSospechosos(dias, { hoy, conHoy, soloDias });
  const resultado = { ...dias };
  const plan = [];
  for (const s of sospechosos) {
    const antes = dias[s.dia];
    const item = { dia: s.dia, gravedad: s.gravedad, motivos: s.motivos, antes: resumen(antes), accion: 'nada', despues: null, nota: '' };
    if (s.omitido) {
      item.nota = 'es hoy: la próxima medición lo corrige sola (--con-hoy para pedirlo igual)';
      plan.push(item);
      continue;
    }
    let lectura = null;
    if (leerDia) {
      try { lectura = await leerDia(s.dia); } catch (e) { lectura = { dia: null, faltan: [`no se pudo leer: ${e?.message ?? e}`] }; }
    }
    if (lectura && lecturaBuena(lectura.dia)) {
      resultado[s.dia] = lectura.dia;
      Object.assign(item, { accion: 'reemplazar', despues: resumen(lectura.dia) });
    } else {
      const porQue = !leerDia ? 'sin consulta a Cloudflare'
        : lectura?.dia && !lectura.dia.sinLectura && Object.keys(lectura.dia).length ? `Cloudflare dio una lectura que tampoco sirve (${resumen(lectura.dia)}${(diagnosticarDia(lectura.dia)?.motivos ?? []).length ? `; ${diagnosticarDia(lectura.dia).motivos.join('; ')}` : ''})`
          : (lectura?.faltan?.[0] ?? 'Cloudflare no devolvió el día');
      item.nota = porQue;
      // Sólo un día que no tiene NINGÚN dato se vuelve "sin lectura": un día con números a medias no se borra.
      // (Sin consulta no hay prueba de nada: no se marca.)
      if (leerDia && marcarSinLectura && s.gravedad === 'vacio') {
        resultado[s.dia] = { sinLectura: true };
        item.accion = 'marcar-sin-lectura';
      }
    }
    plan.push(item);
  }
  return { plan, dias: resultado };
}

/** Pide un día entero (de 00:00 a 23:59 de Balcarce, o hasta ahora si es hoy) con el detalle de siempre. */
export async function leerDiaDeCloudflare({ dia, cuenta, token, siteTag, fetchFn = fetch, ahora = new Date(), esperaReintento = 15000 }) {
  const finDelDia = Date.parse(`${dia}T00:00:00Z`) + DESFASE_UTC + DIA_MS - 1000;
  const hasta = new Date(Math.min(finDelDia, ahora.getTime()));
  const r = await detalleDeCloudflare({ consultar, cuenta, token, siteTag, ahora: hasta, fetchFn, esperaReintento, cuantos: 1 });
  return { dia: r.dias[dia] ?? null, faltan: r.faltan.map((f) => sinSecretos(f, token, cuenta)) };
}

/** El texto de `dias` tal como lo escribe el vigilante (2 espacios, salto final), con el fin de línea del archivo original. */
export function textoDelArchivo(archivoJson, textoOriginal = '') {
  const lf = `${JSON.stringify(archivoJson, null, 2)}\n`;
  return /\r\n/.test(textoOriginal) ? lf.replace(/\n/g, '\r\n') : lf;
}

// ------------------------------------------------------------------ a mano

function opciones(argv) {
  const valor = (n) => argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  return {
    aplicar: argv.includes('--aplicar'),
    sinRed: argv.includes('--sin-red'),
    conHoy: argv.includes('--con-hoy'),
    marcarSinLectura: argv.includes('--marcar-sin-lectura'),
    soloDias: valor('dias') ? valor('dias').split(',').map((x) => x.trim()).filter(Boolean) : null,
    archivo: valor('archivo') ? path.resolve(valor('archivo')) : ARCHIVO,
  };
}

async function main() {
  const o = opciones(process.argv.slice(2));
  const ahora = new Date();
  const hoy = diaAR(ahora);
  console.log(`Reparar estadísticas (${o.aplicar ? 'APLICAR: escribe el archivo' : 'SIMULAR: no escribe nada'})`);
  const original = fs.existsSync(o.archivo) ? fs.readFileSync(o.archivo, 'utf8') : '';
  const historia = leerJsonEstricto(o.archivo, null);
  if (!historia?.dias) { console.error(`No hay \`dias\` en ${o.archivo}. No hay nada que reparar.`); process.exit(1); }

  const env = { ...process.env };
  for (const n of ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ANALYTICS_TOKEN', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_SITE_TAG']) env[n] ??= leerVariable(n, { env }) ?? undefined;
  const cuenta = env.CLOUDFLARE_ACCOUNT_ID;
  const { token, nombre } = tokenDeCloudflare(env);
  console.log(`  Cloudflare: cuenta ${cuenta ? 'cargada' : 'FALTA'}, token ${token ? `de ${nombre}` : 'FALTA'}`);

  let leerDia = null;
  if (!o.sinRed && cuenta && token) {
    let siteTag = env.CLOUDFLARE_SITE_TAG || null;
    if (!siteTag) {
      const b = await buscarSitio({ cuenta, token, ahora, fetchFn: fetch });
      if (!b.siteTag) {
        console.error(`  No pude encontrar el sitio de analítica en la cuenta: ${sinSecretos(b.error ?? 'la etiqueta de la página no aparece (¿CLOUDFLARE_ACCOUNT_ID de otra cuenta?)', token, cuenta)}`);
        console.error('  Sin el sitio no se consulta nada: sigo sólo con el diagnóstico.');
      } else siteTag = b.siteTag;
    }
    if (siteTag) leerDia = (dia) => leerDiaDeCloudflare({ dia, cuenta, token, siteTag, ahora });
  } else if (!o.sinRed) console.log('  (sin credenciales de Cloudflare: sólo el diagnóstico)');

  const { plan, dias } = await planDeReparacion({ dias: historia.dias, leerDia, hoy, conHoy: o.conHoy, soloDias: o.soloDias, marcarSinLectura: o.marcarSinLectura });

  console.log(`\nDías guardados: ${Object.keys(historia.dias).length}. Sospechosos: ${plan.length}.`);
  for (const p of plan) {
    console.log(`\n  ${p.dia}  [${p.gravedad}]  ${p.motivos.join('; ')}`);
    console.log(`     hoy guardado: ${p.antes}`);
    if (p.accion === 'reemplazar') console.log(`     -> REEMPLAZAR por: ${p.despues}`);
    else if (p.accion === 'marcar-sin-lectura') console.log(`     -> MARCAR sin lectura (Cloudflare no pudo darlo: ${p.nota})`);
    else console.log(`     -> sin cambio: ${p.nota}`);
  }
  const sosp = puntosSospechosos(historia.puntos);
  if (sosp.length) console.log(`\nMediciones (puntos) con ventanas que no cierran, SOLO INFORMADAS, no se tocan: ${sosp.length} (${sosp.map((c) => c.slice(0, 16)).join(', ')})`);

  const cambios = plan.filter((p) => p.accion === 'reemplazar' || p.accion === 'marcar-sin-lectura');
  console.log(`\nCambiaría ${cambios.length} día(s)${cambios.length ? `: ${cambios.map((c) => c.dia).join(', ')}` : ''}.`);
  if (!o.aplicar) {
    console.log(cambios.length ? 'Fue una simulación: no se escribió nada. Para escribir, repetí con --aplicar.' : 'Fue una simulación: no se escribió nada.');
    return;
  }
  if (!cambios.length) { console.log('No hay nada para escribir.'); return; }

  const nueva = { ...historia, dias };
  if (JSON.stringify(nueva.puntos) !== JSON.stringify(historia.puntos)) throw new Error('los puntos cambiaron: esto no debería pasar; no escribo');
  const tmp = `${o.archivo}.tmp`;
  fs.writeFileSync(tmp, textoDelArchivo(nueva, original));
  fs.renameSync(tmp, o.archivo);
  console.log(`Escrito ${path.relative(RAIZ, o.archivo)}. Revisalo con \`git diff\` antes de subirlo (ver docs/analiticas/ANALISIS.md, parte E).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main().catch((e) => {
    console.error(`No se pudo reparar: ${sinSecretos(e?.stack ?? e, process.env.CLOUDFLARE_ANALYTICS_TOKEN, process.env.CLOUDFLARE_API_TOKEN, process.env.CLOUDFLARE_ACCOUNT_ID)}`);
    process.exit(1);
  });
}


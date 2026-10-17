// Cuánto se parece una voz a otra (18/10/2026, regla 302): la prueba de parecido para cuando Hernán cargue la clave paga de Google y haya que volver a crear
// las dos voces propias (docs/redes/VOCES-NUEVAS.md). Sólo mide audios que ya existen con ffmpeg y cuentas en JavaScript: NO llama a Gemini, no gasta
// cupo y no cuesta nada, así que se puede correr cuantas veces haga falta.
//
// Qué se compara (lo que Hernán pidió: "imitar lo que más se pueda a los locutores actuales"):
//   · el RITMO: palabras por segundo (el número que usa el presupuesto de los repasos, `PODCAST_VOZ.palabrasPorSegundo`) y cuánto de la pieza es pausa;
//   · el TONO: la altura de la voz (la mediana de su frecuencia fundamental, en semitonos de diferencia), su rango (de lo más grave a lo más agudo) y su
//     brillo (el centro de gravedad del espectro: una voz más "abierta" o más "oscura");
//   · la DURACIÓN, cuando los dos audios dicen el mismo texto (la prueba de siempre: `TEXTO_DE_COMPARACION`).
// Cada diferencia se vuelve una penalización de 0 (idénticas) a 1 (tan distintas que no sirve) y el parecido es 100 menos el promedio pesado.
//
//   node reels/parecido-de-voz.mjs referencia.mp3 candidata1.mp3 candidata2.mp3 …  [--palabras=81] [--mismo-texto] [--json]
//
// Sin dependencias fuera de ffmpeg-static (que ya viene con el proyecto).

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import path from 'node:path';
import ffmpeg from 'ffmpeg-static';

const correr = promisify(execFile);

/** La frecuencia a la que se mide (la voz humana entra de sobra en 16 kHz). */
const FM = 16000;

// ------------------------------------------------------------------ las cuentas (puras, se prueban sin ffmpeg)

const percentil = (valores, p) => {
  if (!valores.length) return 0;
  const v = [...valores].sort((a, b) => a - b);
  return v[Math.min(v.length - 1, Math.max(0, Math.round((v.length - 1) * p)))];
};
const semitonos = (a, b) => 12 * Math.log2(a / b);
const rms = (x, desde, hasta) => {
  let s = 0;
  for (let i = desde; i < hasta; i += 1) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, hasta - desde));
};

/** La energía (RMS) de cada tramo de 20 ms. */
function energias(x, fm = FM) {
  const paso = Math.round(fm * 0.02);
  const e = [];
  for (let i = 0; i + paso <= x.length; i += paso) e.push(rms(x, i, i + paso));
  return { e, paso, segundosPorTramo: paso / fm };
}

/**
 * Las pausas del audio: tramos de silencio de `minimo` segundos o más (no cuentan el silencio de antes de la primera palabra ni el de después de la
 * última). Devuelve { cantidad, proporcion (del tiempo hablado, de 0 a 1), media (segundos), hablado (segundos sin pausas) }.
 */
export function pausasDe(x, { fm = FM, minimo = 0.25 } = {}) {
  const { e, segundosPorTramo } = energias(x, fm);
  if (!e.length) return { cantidad: 0, proporcion: 0, media: 0, hablado: 0, duracion: 0 };
  const techo = percentil(e, 0.95);
  const umbral = techo * 0.04;
  let primero = e.findIndex((v) => v > umbral);
  let ultimo = e.length - 1 - [...e].reverse().findIndex((v) => v > umbral);
  if (primero < 0) { primero = 0; ultimo = e.length - 1; }
  const corridas = [];
  let largo = 0;
  for (let i = primero; i <= ultimo; i += 1) {
    if (e[i] <= umbral) largo += 1;
    else { if (largo) corridas.push(largo); largo = 0; }
  }
  if (largo) corridas.push(largo);
  const largas = corridas.map((n) => n * segundosPorTramo).filter((s) => s >= minimo);
  const total = (ultimo - primero + 1) * segundosPorTramo;
  const enPausa = largas.reduce((s, v) => s + v, 0);
  return {
    cantidad: largas.length, proporcion: total ? enPausa / total : 0, media: largas.length ? enPausa / largas.length : 0, hablado: Math.max(0, total - enPausa), duracion: x.length / fm,
  };
}

/** Una FFT de potencia de 2 (iterativa): modifica `re` e `im` en el lugar. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let largo = 2; largo <= n; largo <<= 1) {
    const ang = (-2 * Math.PI) / largo;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += largo) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < largo / 2; k += 1) {
        const ur = re[i + k]; const ui = im[i + k];
        const vr = re[i + k + largo / 2] * cr - im[i + k + largo / 2] * ci;
        const vi = re[i + k + largo / 2] * ci + im[i + k + largo / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + largo / 2] = ur - vr; im[i + k + largo / 2] = ui - vi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

/**
 * El tono de la voz: de cada tramo con voz (energía suficiente y una periodicidad clara) se saca la frecuencia fundamental por autocorrelación y el
 * centro de gravedad del espectro. Devuelve { f0: mediana en Hz, grave: percentil 10, agudo: percentil 90, rango: semitonos entre los dos, brillo: Hz
 * (media del centroide), conVoz: proporción de tramos con voz, tramos }.
 */
export function tonoDe(x, { fm = FM, minHz = 65, maxHz = 400 } = {}) {
  const ventana = Math.round(fm * 0.04);
  const salto = Math.round(fm * 0.02);
  const lagMin = Math.floor(fm / maxHz);
  const lagMax = Math.ceil(fm / minHz);
  const { e } = energias(x, fm);
  const techo = percentil(e, 0.95) || 1;
  const f0s = [];
  const brillos = [];
  let tramos = 0;
  for (let ini = 0; ini + ventana + lagMax < x.length; ini += salto) {
    tramos += 1;
    if (rms(x, ini, ini + ventana) < techo * 0.15) continue;
    // Autocorrelación normalizada: 1 es una señal que se repite exacta.
    let r0 = 0;
    for (let i = 0; i < ventana; i += 1) r0 += x[ini + i] * x[ini + i];
    if (r0 <= 0) continue;
    let mejor = 0;
    let lagMejor = 0;
    const r = new Float64Array(lagMax + 2);
    for (let lag = lagMin; lag <= lagMax + 1; lag += 1) {
      let s = 0;
      let e2 = 0;
      for (let i = 0; i < ventana; i += 1) { s += x[ini + i] * x[ini + i + lag]; e2 += x[ini + i + lag] * x[ini + i + lag]; }
      r[lag] = s / Math.sqrt(r0 * e2 + 1e-12);
    }
    // El primer máximo local alto (no el mayor de todos: así no se salta a la octava de abajo).
    const tope = Math.max(...r.subarray(lagMin, lagMax + 1));
    for (let lag = lagMin + 1; lag <= lagMax; lag += 1) {
      if (r[lag] >= tope * 0.9 && r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1]) { mejor = r[lag]; lagMejor = lag; break; }
    }
    if (mejor < 0.5 || !lagMejor) continue;
    // Interpolación parabólica para afinar entre dos lags.
    const a = r[lagMejor - 1]; const b = r[lagMejor]; const c = r[lagMejor + 1];
    const desvio = (a - c) / (2 * (a - 2 * b + c) || 1);
    f0s.push(fm / (lagMejor + (Number.isFinite(desvio) ? Math.max(-1, Math.min(1, desvio)) : 0)));
    // El brillo, cada cuatro tramos con voz (la FFT cuesta más).
    if (f0s.length % 4 === 0) {
      const n = 512;
      const re = new Float64Array(n);
      const im = new Float64Array(n);
      for (let i = 0; i < n; i += 1) re[i] = (x[ini + i] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
      fft(re, im);
      let num = 0; let den = 0;
      for (let k = 1; k < n / 2; k += 1) { const m = Math.hypot(re[k], im[k]); num += m * ((k * fm) / n); den += m; }
      if (den > 0) brillos.push(num / den);
    }
  }
  const f0 = percentil(f0s, 0.5);
  const grave = percentil(f0s, 0.1);
  const agudo = percentil(f0s, 0.9);
  return {
    f0, grave, agudo, rango: f0 ? semitonos(agudo || f0, grave || f0) : 0, brillo: brillos.length ? brillos.reduce((s, v) => s + v, 0) / brillos.length : 0, conVoz: tramos ? f0s.length / tramos : 0, tramos,
  };
}

/** El perfil de un audio (ya decodificado a números entre -1 y 1): su duración, su ritmo, sus pausas y su tono. `palabras` es lo que dice (para el ritmo). */
export function perfilDeMuestras(x, { palabras = null, fm = FM } = {}) {
  const pausas = pausasDe(x, { fm });
  const tono = tonoDe(x, { fm });
  return {
    duracion: x.length / fm,
    palabras,
    ritmo: palabras ? palabras / (x.length / fm) : null,
    ritmoDeHabla: palabras && pausas.hablado ? palabras / pausas.hablado : null,
    pausas,
    tono,
  };
}

// ------------------------------------------------------------------ cuánto se parecen

/** Cuánta diferencia es "tan distinta que no sirve" en cada cosa, y cuánto pesa en el parecido (suma 100 con la duración). */
export const MEDIDAS = {
  ritmo: { peso: 25, limite: 0.15, que: 'palabras por segundo (15 % de diferencia ya es otra voz)' },
  tono: { peso: 30, limite: 3, que: 'altura de la voz, en semitonos (3 semitonos es pasar de una voz a otra)' },
  rango: { peso: 10, limite: 0.5, que: 'rango entre lo más grave y lo más agudo (50 % de diferencia)' },
  brillo: { peso: 10, limite: 0.25, que: 'brillo del espectro (25 % de diferencia)' },
  pausas: { peso: 15, limite: 0.12, que: 'proporción de pausas (12 puntos de diferencia)' },
  duracion: { peso: 10, limite: 0.1, que: 'duración, sólo si dicen el mismo texto (10 % de diferencia)' },
};

const penalizar = (diferencia, limite) => Math.min(1, Math.abs(diferencia) / limite);

/**
 * Compara el perfil de una candidata con el de la referencia. Devuelve { parecido: 0 a 100, penalizaciones: { medida: { ref, cand, diferencia, penalizacion } },
 * descartada: lista de medidas donde llegó al límite }. `mismoTexto`: los dos audios dicen lo mismo, y entonces la duración también cuenta.
 */
export function compararPerfiles(ref, cand, { mismoTexto = false } = {}) {
  const pen = {};
  if (ref.ritmo && cand.ritmo) pen.ritmo = { ref: ref.ritmo, cand: cand.ritmo, diferencia: cand.ritmo / ref.ritmo - 1, limite: MEDIDAS.ritmo.limite };
  if (ref.tono.f0 && cand.tono.f0) pen.tono = { ref: ref.tono.f0, cand: cand.tono.f0, diferencia: semitonos(cand.tono.f0, ref.tono.f0), limite: MEDIDAS.tono.limite };
  if (ref.tono.rango && cand.tono.rango) pen.rango = { ref: ref.tono.rango, cand: cand.tono.rango, diferencia: cand.tono.rango / ref.tono.rango - 1, limite: MEDIDAS.rango.limite };
  if (ref.tono.brillo && cand.tono.brillo) pen.brillo = { ref: ref.tono.brillo, cand: cand.tono.brillo, diferencia: cand.tono.brillo / ref.tono.brillo - 1, limite: MEDIDAS.brillo.limite };
  pen.pausas = { ref: ref.pausas.proporcion, cand: cand.pausas.proporcion, diferencia: cand.pausas.proporcion - ref.pausas.proporcion, limite: MEDIDAS.pausas.limite };
  if (mismoTexto) pen.duracion = { ref: ref.duracion, cand: cand.duracion, diferencia: cand.duracion / ref.duracion - 1, limite: MEDIDAS.duracion.limite };
  let pesos = 0;
  let perdido = 0;
  const descartada = [];
  for (const [nombre, v] of Object.entries(pen)) {
    v.penalizacion = penalizar(v.diferencia, v.limite);
    pesos += MEDIDAS[nombre].peso;
    perdido += MEDIDAS[nombre].peso * v.penalizacion;
    if (v.penalizacion >= 1) descartada.push(nombre);
  }
  return { parecido: pesos ? Math.round(1000 * (1 - perdido / pesos)) / 10 : 0, penalizaciones: pen, descartada };
}

/**
 * Elige la mejor de varias candidatas (`candidatas`: [{ nombre, perfil }]) contra la referencia. Gana la de más parecido; si dos quedan a menos de 3
 * puntos, la de ritmo más cercano (el ritmo cambia cuánto dura cada pieza y entra en el presupuesto de 55 segundos) y después la de tono más cercano. Una
 * candidata con alguna medida en el límite ("descartada") sólo gana si no hay otra. Devuelve { ganadora, ranking } (el ranking, de la mejor a la peor); la
 * última palabra la tienen el oído de Hernán y de Andrés con las dos primeras.
 */
export function elegirLaMejor(ref, candidatas, { mismoTexto = false, empate = 3 } = {}) {
  const ranking = candidatas.map((c) => ({ nombre: c.nombre, ...compararPerfiles(ref, c.perfil, { mismoTexto }) }));
  const distancia = (r, medida) => Math.abs(r.penalizaciones[medida]?.penalizacion ?? 1);
  ranking.sort((a, b) => {
    if (Boolean(a.descartada.length) !== Boolean(b.descartada.length)) return a.descartada.length ? 1 : -1;
    if (Math.abs(b.parecido - a.parecido) >= empate) return b.parecido - a.parecido;
    return (distancia(a, 'ritmo') - distancia(b, 'ritmo')) || (distancia(a, 'tono') - distancia(b, 'tono')) || (b.parecido - a.parecido);
  });
  return { ganadora: ranking[0] ?? null, ranking };
}

// ------------------------------------------------------------------ con audios de verdad (ffmpeg)

/** Decodifica un audio o un video (mp3, wav, mp4…) a números entre -1 y 1, en mono a 16 kHz. */
export async function leerMuestras(archivo) {
  const { stdout } = await correr(ffmpeg, ['-v', 'error', '-i', archivo, '-vn', '-ac', '1', '-ar', String(FM), '-f', 's16le', '-'], { encoding: 'buffer', maxBuffer: 1024 * 1024 * 400 });
  const x = new Float32Array(Math.floor(stdout.length / 2));
  for (let i = 0; i < x.length; i += 1) x[i] = stdout.readInt16LE(i * 2) / 32768;
  return x;
}

/** El perfil de un archivo de audio. `palabras`: cuántas palabras dice (para el ritmo). */
export async function perfilDeAudio(archivo, { palabras = null } = {}) {
  return perfilDeMuestras(await leerMuestras(archivo), { palabras });
}

/** La tabla en texto, para la consola y el documento de la comparación. */
export function tablaDeComparacion(ranking, ref) {
  const f = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : '—');
  const filas = ranking.map((r, i) => {
    const p = r.penalizaciones;
    return `| ${i + 1} | ${r.nombre} | **${f(r.parecido, 1)}** | ${f(p.ritmo?.cand)} (${f((p.ritmo?.diferencia ?? NaN) * 100, 0)} %) | ${f(p.tono?.cand, 0)} Hz (${f(p.tono?.diferencia, 1)} st) | ${f((p.rango?.diferencia ?? NaN) * 100, 0)} % | ${f((p.brillo?.diferencia ?? NaN) * 100, 0)} % | ${f(p.pausas?.cand * 100, 0)} % | ${r.descartada.length ? `en el límite: ${r.descartada.join(', ')}` : 'ok'} |`;
  });
  return [
    `Referencia: ${f(ref.ritmo)} palabras por segundo · ${f(ref.tono.f0, 0)} Hz · pausas ${f(ref.pausas.proporcion * 100, 0)} % · ${f(ref.duracion, 1)} s`,
    '',
    '| # | Candidata | Parecido (de 100) | Ritmo (pal/s) | Tono | Rango | Brillo | Pausas | Estado |',
    '|---|---|---|---|---|---|---|---|---|',
    ...filas,
  ].join('\n');
}

/** Compara varios archivos con una referencia y devuelve el resultado (para `crear-voces.mjs comparar` y la línea de comandos). */
export async function compararArchivos(referencia, candidatas, { palabras = null, palabrasDeLasCandidatas = null, mismoTexto = false } = {}) {
  const ref = await perfilDeAudio(referencia, { palabras });
  const perfiles = [];
  for (const c of candidatas) perfiles.push({ nombre: path.basename(c), perfil: await perfilDeAudio(c, { palabras: palabrasDeLasCandidatas ?? palabras }) });
  return { ref, ...elegirLaMejor(ref, perfiles, { mismoTexto }) };
}

if (process.argv[1] && process.argv[1].endsWith('parecido-de-voz.mjs')) {
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const archivos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (archivos.length < 2) {
    console.log('Uso: node reels/parecido-de-voz.mjs referencia.mp3 candidata.mp3 [otra.mp3 …] [--palabras=81] [--mismo-texto] [--json]');
    process.exit(1);
  }
  const palabras = arg('palabras') ? Number(arg('palabras')) : null;
  const r = await compararArchivos(archivos[0], archivos.slice(1), { palabras, mismoTexto: process.argv.includes('--mismo-texto') });
  if (process.argv.includes('--json')) console.log(JSON.stringify({ referencia: r.ref, ranking: r.ranking }, null, 2));
  else {
    console.log(tablaDeComparacion(r.ranking, r.ref));
    console.log(`\nLa más parecida: ${r.ganadora?.nombre ?? 'ninguna'}. La decisión final es de oído: escuchar las dos primeras.`);
  }
}

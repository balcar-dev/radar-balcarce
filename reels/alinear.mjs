// Alineación de texto y audio SIN transcribir.
//
// El problema: Gemini devuelve el audio pero no dice cuándo arranca cada
// palabra, y sin eso los subtítulos van a los tumbos.
//
// La solución, que no necesita otro modelo: como el texto ya lo sabemos, sólo
// hay que ubicarlo en el tiempo. ffmpeg detecta los silencios del audio, que
// en una lectura son exactamente los puntos donde termina cada oración. Con
// esas anclas, adentro de cada oración las palabras se reparten por peso
// silábico: una palabra de cuatro sílabas ocupa el doble que una de dos.
//
// El error que queda es de centésimas dentro de una misma oración, y como los
// carteles duran una oración entera, no se nota.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';

const correr = promisify(execFile);

/** Duración del archivo, leída de la salida de ffmpeg. */
async function duracion(archivo) {
  try {
    await correr(ffmpeg, ['-hide_banner', '-i', archivo, '-f', 'null', '-']);
  } catch (e) {
    const m = (e.stderr ?? '').match(/time=(\d+):(\d+):(\d+\.\d+)/g);
    if (m) {
      const [h, mi, s] = m[m.length - 1].replace('time=', '').split(':');
      return +h * 3600 + +mi * 60 + +s;
    }
  }
  const { stderr } = await correr(ffmpeg, ['-hide_banner', '-i', archivo, '-f', 'null', '-'])
    .catch((e) => ({ stderr: e.stderr ?? '' }));
  const d = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  return d ? +d[1] * 3600 + +d[2] * 60 + +d[3] : 0;
}

/** Los silencios del audio: cada uno es el final de una oración. */
async function silencios(archivo, { umbral = '-32dB', minimo = 0.18 } = {}) {
  const salida = await correr(ffmpeg, [
    '-hide_banner', '-i', archivo,
    '-af', `silencedetect=noise=${umbral}:d=${minimo}`,
    '-f', 'null', '-',
  ]).then((r) => r.stderr).catch((e) => e.stderr ?? '');

  const pausas = [];
  const re = /silence_start: (-?[\d.]+)[\s\S]*?silence_end: ([\d.]+)/g;
  let m;
  while ((m = re.exec(salida)) !== null) {
    pausas.push({ desde: Math.max(0, +m[1]), hasta: +m[2] });
  }
  return pausas;
}

const VOCALES = /[aeiouáéíóúü]/gi;
// Aproximación de sílabas: alcanza de sobra para repartir tiempo.
const silabas = (p) => Math.max(1, (p.match(VOCALES) ?? []).length);

/**
 * @returns [{ texto, desde, hasta, finFrase, pausa }] en segundos
 */
export async function alinear(texto, archivo) {
  const total = await duracion(archivo);
  const pausas = await silencios(archivo);

  // Las oraciones del texto, con sus palabras.
  const oraciones = texto.split(/(?<=[.!?…])\s+/).map((o) => o.trim()).filter(Boolean)
    .map((o) => ({ texto: o, palabras: o.split(/\s+/).filter(Boolean) }));

  // Pausas que caen adentro del audio (la inicial y la final no cuentan).
  const cortes = pausas
    .filter((p) => p.desde > 0.15 && p.hasta < total - 0.15)
    .map((p) => (p.desde + p.hasta) / 2);

  // Arranque real de la voz: el primer silencio suele ser el aire del principio.
  const inicio = pausas.length && pausas[0].desde <= 0.05 ? pausas[0].hasta : 0;
  const fin = pausas.length && pausas[pausas.length - 1].hasta >= total - 0.05
    ? pausas[pausas.length - 1].desde : total;

  // Si los cortes coinciden con las oraciones, los usamos como anclas. Si no,
  // repartimos todo el audio por peso silábico y listo: peor pero nunca roto.
  const anclas = [inicio];
  if (cortes.length >= oraciones.length - 1) {
    for (let i = 0; i < oraciones.length - 1; i += 1) anclas.push(cortes[i]);
  } else {
    const pesoTotal = oraciones.reduce((a, o) => a + o.palabras.reduce((b, p) => b + silabas(p), 0), 0);
    let acumulado = 0;
    for (let i = 0; i < oraciones.length - 1; i += 1) {
      acumulado += oraciones[i].palabras.reduce((b, p) => b + silabas(p), 0);
      anclas.push(inicio + ((fin - inicio) * acumulado) / pesoTotal);
    }
  }
  anclas.push(fin);

  const palabras = [];
  oraciones.forEach((o, i) => {
    const desde = anclas[i];
    const hasta = anclas[i + 1];
    const pesos = o.palabras.map(silabas);
    const suma = pesos.reduce((a, b) => a + b, 0);
    let t = desde;
    o.palabras.forEach((p, j) => {
      const dur = ((hasta - desde) * pesos[j]) / suma;
      const limpia = p.replace(/^[¡¿("']+|[.,;:!?…)"']+$/g, '');
      palabras.push({
        texto: limpia || p,
        desde: t,
        hasta: t + dur,
        finFrase: j === o.palabras.length - 1,
        pausa: /[,;:]$/.test(p),
      });
      t += dur;
    });
  });

  return { palabras, duracion: total, anclasUsadas: cortes.length >= oraciones.length - 1 };
}

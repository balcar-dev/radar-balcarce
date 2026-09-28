// El cruce de medios (27/09, pedido de Hernán; docs/PLAN-V2.2.md).
//
// Junta las notas de todos los medios que cuentan EL MISMO HECHO, aunque cada
// uno le ponga otro título, y guarda una memoria de las últimas horas para que
// una nota de esta corrida se cruce con la que otro medio publicó hace tres
// horas. De ahí sale cuántos medios distintos cuentan cada historia: con dos o
// más, lo de afuera de Balcarce puede entrar (regla de dos fuentes), y cuantos
// más, más arriba va (es lo que se está hablando).
//
// Cómo se compara: título (pesa doble) y resumen, palabra por palabra, pesando
// más las palabras raras (TF-IDF, coseno). Se probó el 27/09 con 90 medios y
// 2.664 notas: con un umbral de 0,42 junta bien el mismo hecho y no mezcla
// notas distintas del mismo tema; con 0,25 encadenaba cosas sin relación.
//
// Sin dependencias y sin IA: tarda segundos.

import fs from 'node:fs';
import path from 'node:path';
import { sinTildes } from '../web/lib/texto.js';

export const CRUCE = {
  umbral: 0.42,
  horasDeMemoria: 36,
  // Una palabra que aparece en más del 5 % de las notas no sirve para buscar
  // parecidas (es "gobierno", "hoy", "argentina"): no entra al índice.
  palabraComun: 0.05,
};

const VACIAS = new Set(('de la el en y a los las del que se por con un una para al lo como mas su sus es fue son ser hay '
  + 'este esta estos estas ese esa tras sobre entre desde hasta ante ya no si o u le les nos todo todos toda todas otro otra '
  + 'otros muy sin segun cuando donde quien cual hoy ayer manana dia dias ano anos semana tambien pero sino porque mientras '
  + 'durante contra hacia bajo tiene tienen puede pueden ha han sera seran fueron era eran esto eso aqui alli asi luego antes '
  + 'despues nuevo nueva nuevos nuevas gran grandes mejor peor primera primer ultimo ultima dos tres cuatro cinco seis siete '
  + 'ocho nueve diez vivo hora horas minuto cuanto cuantos').split(' '));

/** Las palabras que cuentan de una nota: el título dos veces y el resumen. */
function palabrasDe(nota) {
  const texto = `${nota.titulo ?? ''} ${nota.titulo ?? ''} ${String(nota.cuerpo ?? nota.resumen ?? '').slice(0, 400)}`;
  return sinTildes(texto).split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 3 && !VACIAS.has(w));
}

/**
 * Agrupa las notas que cuentan el mismo hecho. Dos notas del mismo medio no se
 * juntan entre sí (un medio cuenta una vez: eso lo resuelve quien cuenta los
 * medios). Devuelve una lista de grupos (arrays de índices de `notas`).
 */
export function agruparPorHecho(notas, { umbral = CRUCE.umbral } = {}) {
  const N = notas.length;
  const df = new Map();
  const tfs = notas.map((n) => {
    const tf = new Map();
    for (const w of palabrasDe(n)) tf.set(w, (tf.get(w) ?? 0) + 1);
    for (const w of tf.keys()) df.set(w, (df.get(w) ?? 0) + 1);
    return tf;
  });
  const vectores = tfs.map((tf) => {
    const v = new Map();
    let norma = 0;
    for (const [w, c] of tf) {
      const x = (1 + Math.log(c)) * (Math.log((N + 1) / ((df.get(w) ?? 0) + 1)) + 1);
      v.set(w, x);
      norma += x * x;
    }
    norma = Math.sqrt(norma) || 1;
    for (const [w, x] of v) v.set(w, x / norma);
    return v;
  });
  const indice = new Map();
  vectores.forEach((v, i) => {
    for (const w of v.keys()) {
      if ((df.get(w) ?? 0) > Math.max(3, N * CRUCE.palabraComun)) continue;
      (indice.get(w) ?? indice.set(w, []).get(w)).push(i);
    }
  });
  const padre = notas.map((_, i) => i);
  const raiz = (x) => { while (padre[x] !== x) { padre[x] = padre[padre[x]]; x = padre[x]; } return x; };
  for (let i = 0; i < N; i += 1) {
    const candidatos = new Set();
    for (const w of vectores[i].keys()) for (const j of indice.get(w) ?? []) if (j > i) candidatos.add(j);
    for (const j of candidatos) {
      if (notas[i].medio === notas[j].medio) continue;
      const [a, b] = vectores[i].size < vectores[j].size ? [vectores[i], vectores[j]] : [vectores[j], vectores[i]];
      let s = 0;
      for (const [w, x] of a) { const y = b.get(w); if (y) s += x * y; }
      if (s >= umbral) padre[raiz(j)] = raiz(i);
    }
  }
  const grupos = new Map();
  notas.forEach((_, i) => { const r = raiz(i); (grupos.get(r) ?? grupos.set(r, []).get(r)).push(i); });
  return [...grupos.values()];
}

// ------------------------------------------------------------- la memoria

/** Lo que se guarda de cada nota de afuera para cruzarla en las próximas horas. */
function paraLaMemoria(n) {
  return {
    titulo: n.titulo,
    cuerpo: String(n.cuerpo ?? '').slice(0, 400),
    enlace: n.enlace,
    ...(n.enlaceFeed ? { enlaceFeed: n.enlaceFeed } : {}),
    fecha: (n.fecha instanceof Date ? n.fecha : new Date(n.fecha)).toISOString(),
    visto: n.visto ?? new Date().toISOString(),
    medio: n.medio,
    fuenteId: n.fuenteId,
    alcance: n.alcance,
    oficial: !!n.oficial,
    seccionFuente: n.seccionFuente ?? null,
    peso: n.peso ?? 10,
    imagen: n.imagen ?? '',
    categorias: n.categorias ?? [],
  };
}

/** Una nota de la memoria, lista para volver a usarse como las de la corrida. */
export function desdeLaMemoria(m) {
  return { ...m, fecha: new Date(m.fecha), textoCompleto: false, deLaMemoria: true };
}

/** Lee la memoria del archivo, sin lo de más de `horasDeMemoria`. */
export function leerMemoria(archivo, { ahora = Date.now() } = {}) {
  try {
    const j = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    const limite = ahora - CRUCE.horasDeMemoria * 3600e3;
    return (j.notas ?? []).filter((n) => Date.parse(n.fecha) >= limite);
  } catch {
    return [];
  }
}

/** Guarda la memoria: lo de antes más lo de esta corrida, sin repetir enlaces. */
export function guardarMemoria(archivo, anteriores, nuevas, { ahora = Date.now() } = {}) {
  const limite = ahora - CRUCE.horasDeMemoria * 3600e3;
  const porEnlace = new Map();
  for (const n of [...anteriores, ...nuevas.map(paraLaMemoria)]) {
    if (!n.enlace || Date.parse(n.fecha) < limite) continue;
    if (!porEnlace.has(n.enlace)) porEnlace.set(n.enlace, n);
  }
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, JSON.stringify({ notas: [...porEnlace.values()] }));
  return porEnlace.size;
}

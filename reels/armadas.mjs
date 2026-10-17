// Las piezas ya armadas HOY (17/10/2026, regla 208): un reintento no vuelve a gastar voz.
//
// Cuando una pieza se arma pero no llega a salir (Instagram contestó "Request processing failed", se cortó la corrida), la vuelta
// siguiente la volvía a armar desde cero: si el texto cambiaba un poco (el clima subió un grado, el repaso eligió otra nota porque se
// publicó una nueva), la memoria de voces no la reconocía y se gastaba otro audio del cupo. Ahora el video armado queda guardado en la
// memoria de voces (la carpeta VOZ_CACHE, la caché de Actions) hasta que termina el día, y la vuelta siguiente sube ESE video, con su lista
// de notas tal cual, sin pedir nada.
//
// Un video guardado no se usa si alguna de sus notas ya no está publicada (la retiraron o la corrigieron a mano: regla de siempre, lo que
// sale es lo que está en la web), ni si es de otro día. Sin VOZ_CACHE no hay nada guardado. Sin dependencias.

import fs from 'node:fs';
import path from 'node:path';

const valido = (nombre) => /^[a-z0-9-]+$/.test(String(nombre ?? ''));
const base = (carpeta, dia, nombre) => path.join(carpeta, `armada-${dia}-${nombre}`);

/**
 * Guarda el video de una pieza recién armada (y su versión para historias, si la hay) con lo que dice el manifiesto. No lanza.
 * `entrada` es la del manifiesto de reels/plan.mjs; `salida`, la carpeta donde quedó el video.
 */
export function guardarArmada({ entrada, salida, dia, carpeta = process.env.VOZ_CACHE }) {
  if (!carpeta || !valido(entrada?.nombre) || !/^\d{4}-\d{2}-\d{2}$/.test(dia ?? '')) return false;
  try {
    fs.mkdirSync(carpeta, { recursive: true });
    const b = base(carpeta, dia, entrada.nombre);
    fs.copyFileSync(path.join(salida, entrada.archivo), `${b}.mp4`);
    if (entrada.archivoHistoria) fs.copyFileSync(path.join(salida, entrada.archivoHistoria), `${b}-historia.mp4`);
    fs.writeFileSync(`${b}.json`, JSON.stringify({ dia, entrada }));
    // Lo de otros días ya no sirve: se borra para que la caché no crezca.
    for (const f of fs.readdirSync(carpeta)) if (f.startsWith('armada-') && !f.startsWith(`armada-${dia}-`)) fs.rmSync(path.join(carpeta, f), { force: true });
    return true;
  } catch { return false; }
}

/**
 * Saca de la memoria los videos de las piezas que ya salieron (y los de otros días): sólo queda lo que puede hacer falta reintentar, así
 * la caché de Actions no carga decenas de megas de más en cada vuelta. Devuelve cuántos borró.
 */
export function limpiarArmadas({ dia, publicadas = new Set(), carpeta = process.env.VOZ_CACHE }) {
  if (!carpeta) return 0;
  let borrados = 0;
  try {
    for (const f of fs.readdirSync(carpeta)) {
      if (!f.startsWith('armada-')) continue;
      const suya = f.startsWith(`armada-${dia}-`) ? f.slice(`armada-${dia}-`.length).replace(/(-historia)?\.(mp4|json)$/, '') : null;
      if (suya === null || publicadas.has(suya)) { fs.rmSync(path.join(carpeta, f), { force: true }); borrados += 1; }
    }
  } catch { /* sin memoria no pasa nada */ }
  return borrados;
}

/**
 * La pieza ya armada hoy, copiada a `salida`, lista para el manifiesto; o null. `vigentes` son los ids de las notas publicadas ahora: si
 * el video cuenta una que ya no está, no sirve.
 */
export function usarArmada({ nombre, dia, salida, vigentes = null, carpeta = process.env.VOZ_CACHE }) {
  if (!carpeta || !valido(nombre)) return null;
  try {
    const b = base(carpeta, dia, nombre);
    const { dia: suDia, entrada } = JSON.parse(fs.readFileSync(`${b}.json`, 'utf8'));
    if (suDia !== dia || entrada?.nombre !== nombre || !fs.existsSync(`${b}.mp4`)) return null;
    const notas = [entrada.notaId, ...(entrada.notaIds ?? [])].filter(Boolean);
    if (vigentes && notas.some((id) => !vigentes.has(id))) return null;
    fs.mkdirSync(salida, { recursive: true });
    fs.copyFileSync(`${b}.mp4`, path.join(salida, entrada.archivo));
    if (entrada.archivoHistoria) {
      if (!fs.existsSync(`${b}-historia.mp4`)) return null;
      fs.copyFileSync(`${b}-historia.mp4`, path.join(salida, entrada.archivoHistoria));
    }
    return entrada;
  } catch { return null; }
}

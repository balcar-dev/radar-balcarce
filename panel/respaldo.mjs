// Copia de seguridad de lo que sólo vive en esta PC: panel/datos/ (usuarios,
// decisiones editoriales, buzón, agenda).
//
//   node panel/respaldo.mjs                  copia a respaldos/AAAA-MM-DD
//   node panel/respaldo.mjs "D:\Drive\radar"  copia a otra carpeta
//
// Si esa otra carpeta está sincronizada con un servicio en la nube (Google
// Drive para escritorio, OneDrive, Dropbox), la copia queda también afuera de
// esta PC: si se rompe el disco, no se pierde el historial. Se puede fijar una
// vez con la variable RESPALDO_CARPETA.
//
// NO va a GitHub a propósito: hay contraseñas (con hash) y datos de gente que
// escribió al buzón. Se guardan las últimas 14 copias.
//
// Lo que NO se copia: los secretos en texto plano (ver esSecreto). Si la
// carpeta es de Drive, lo que se copia termina en la nube, y ni las claves
// iniciales ni la firma de las sesiones tienen que salir de esta PC. Si se
// pierde el secreto de las sesiones no pasa nada grave: se crea otro solo y
// hay que volver a entrar.
//
// Sin dependencias.

import fs from 'node:fs';
import path from 'node:path';

const AQUI = import.meta.dirname;
export const ORIGEN = path.join(AQUI, 'datos');

/** Los archivos que no se respaldan nunca: las contraseñas iniciales en
 *  texto plano (CLAVES-INICIALES.txt), la firma de las sesiones
 *  (secreto.txt) y cualquier .txt con "clave" o "secreto" en el nombre. Los
 *  hashes de usuarios.json sí van: sin ellos, restaurar deja a todos afuera. */
export function esSecreto(nombre) {
  const n = String(nombre).toLowerCase();
  return n.endsWith('.txt') && /clave|secreto|password|token/.test(n);
}

/** El nombre de la carpeta de una copia: la fecha de hoy en Balcarce. */
export const nombreDeCopia = (fecha = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(fecha);

/**
 * Copia `origen` a `destino/AAAA-MM-DD` y deja sólo las últimas `guardar`.
 * @returns {{ carpeta: string, archivos: number, borradas: string[] }}
 */
export function respaldar({ origen = ORIGEN, destino, fecha = new Date(), guardar = 14 }) {
  if (!fs.existsSync(origen)) throw new Error(`no existe ${origen}`);
  const carpeta = path.join(destino, nombreDeCopia(fecha));
  fs.mkdirSync(carpeta, { recursive: true });
  fs.cpSync(origen, carpeta, { recursive: true, filter: (de) => !esSecreto(path.basename(de)) });
  // Si la copia de hoy se hizo antes de que existiera este filtro, se le
  // sacan los secretos que hayan quedado (sólo en la copia, nunca en el origen).
  const limpiar = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const completo = path.join(d, e.name);
      if (e.isDirectory()) limpiar(completo);
      else if (esSecreto(e.name)) fs.rmSync(completo, { force: true });
    }
  };
  limpiar(carpeta);

  const contar = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? contar(path.join(d, e.name)) : 1), 0);
  const copias = fs.readdirSync(destino).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n)).sort();
  const borradas = copias.slice(0, Math.max(0, copias.length - guardar));
  for (const n of borradas) fs.rmSync(path.join(destino, n), { recursive: true, force: true });
  return { carpeta, archivos: contar(carpeta), borradas };
}

if (process.argv[1]?.endsWith('respaldo.mjs')) {
  const destino = process.argv[2] ?? process.env.RESPALDO_CARPETA ?? path.join(AQUI, '..', 'respaldos');
  const r = respaldar({ destino });
  console.log(`  Respaldo hecho: ${r.archivos} archivos en ${r.carpeta}`);
  if (r.borradas.length) console.log(`  Copias viejas borradas: ${r.borradas.join(', ')}`);
  if (path.resolve(destino).startsWith(path.resolve(AQUI, '..'))) {
    console.log('  Ojo: está en esta misma PC. Para que sirva de verdad, apuntalo a una carpeta de Drive/OneDrive.');
  }
}

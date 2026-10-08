// Cuando dos corridas tocan el mismo archivo de pistas, no gana la última: se unen cambio por cambio (P-2, 8/10/2026).
//
// `web/data/pistas.json` y `web/data/notas-de-pistas.json` los escriben el celular (una persona cierra una pista, retira una nota) y los robots
// ("Pistas" y "Panel del celular", que además vuelven a mirar cada 3 horas). Hasta hoy, si chocaban en un `git pull --rebase`, el workflow se
// quedaba con la versión del robot (`git checkout --theirs`): una pista que una persona había cerrado o una nota que había sacado podía volver.
//
// Esto se llama en medio de ese choque (ver los workflows pistas.yml y panel.yml). Para cada uno de los dos archivos hace una unión de tres
// vías por clave (la base común, lo que ya estaba subido, lo que quiere subir el robot):
//   · si el robot no cambió una entrada, queda la de afuera;  · si sólo el robot la cambió, queda la del robot;
//   · si cambiaron las dos: gana lo de afuera (una persona), salvo que el robot haya vuelto a mirar una pista que sigue abierta: entonces
//     se le suman sólo sus campos (cobertura, historial, informe), nunca el estado ni el resultado.
// Cualquier otro archivo en conflicto sigue como antes (lo resuelve el workflow). Sin dependencias.

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { comoRenglones } from './pistas-libro.mjs';

export const ARCHIVOS_QUE_SE_UNEN = ['web/data/pistas.json', 'web/data/notas-de-pistas.json'];

/** Lo que mira el robot de cada pista (el resto —estado, resultado, texto…— es de las personas). */
const CAMPOS_DEL_ROBOT = ['ultimaRevision', 'nivel', 'total', 'mediosVistos', 'teniamos', 'sobre', 'historial', 'sola'];

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Une tres versiones de un objeto de entradas: `base` (el antecedente común), `fuera` (lo que ya está subido) y `robot` (lo que quiere subir
 * esta corrida). `ambos(base, fuera, robot, clave)` decide cuando las dos cambiaron la misma entrada.
 */
export function unirPorClave(base = {}, fuera = {}, robot = {}, ambos = (b, f) => f) {
  const salida = {};
  for (const k of new Set([...Object.keys(fuera), ...Object.keys(robot), ...Object.keys(base)])) {
    const [b, f, r] = [base[k], fuera[k], robot[k]];
    let v;
    if (igual(r, b)) v = f;
    else if (igual(f, b) || igual(f, r)) v = r;
    else v = ambos(b, f, r, k);
    if (v !== undefined) salida[k] = v;
  }
  return salida;
}

/** Una pista que cambiaron una persona y el robot a la vez. */
export function unirPista(base, fuera, robot) {
  // Si la sacaron (o ya no está) del otro lado, o la cerró una persona: queda como está afuera.
  if (!fuera || !robot) return fuera;
  if (fuera.estado !== 'abierta' || fuera.resultado) return fuera;
  const unida = { ...fuera };
  const masNueva = Date.parse(robot.ultimaRevision ?? 0) > Date.parse(fuera.ultimaRevision ?? 0);
  if (masNueva) {
    for (const campo of CAMPOS_DEL_ROBOT) if (campo in robot) unida[campo] = robot[campo];
    unida.novedad = Boolean(fuera.novedad || robot.novedad);
  }
  // El seguimiento escrito por unos y otros se junta, sin repetir.
  const vistos = new Set();
  const seguimiento = [...(fuera.seguimiento ?? []), ...(robot.seguimiento ?? [])]
    .filter((s) => { const c = `${s.cuando}|${s.texto}`; return !vistos.has(c) && vistos.add(c); })
    .sort((a, b) => Date.parse(a.cuando) - Date.parse(b.cuando));
  if (seguimiento.length) unida.seguimiento = seguimiento.slice(-40);
  return unida;
}

/** El texto del archivo unido, en el formato que usa cada uno. `nombre` es la ruta ("web/data/pistas.json"). */
export function unirArchivo(nombre, base, fuera, robot) {
  if (nombre.endsWith('notas-de-pistas.json')) {
    const notas = unirPorClave(base?.notas, fuera?.notas, robot?.notas);
    return `${JSON.stringify({ ...(fuera ?? {}), notas }, null, 1)}\n`;
  }
  const pistas = unirPorClave(base?.pistas, fuera?.pistas, robot?.pistas, unirPista);
  return comoRenglones({ ...(fuera ?? {}), pistas });
}

// ------------------------------------------------------------------ dentro de un `git pull --rebase` con conflicto

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
/** Una de las tres versiones de un archivo en conflicto (1 = base, 2 = lo que ya estaba subido, 3 = lo del robot), o {} si no existe. */
function version(etapa, ruta) {
  try { return JSON.parse(git('show', `:${etapa}:${ruta}`)); } catch { return {}; }
}

/** Resuelve los archivos de personas que estén en conflicto y los deja agregados. Devuelve las rutas resueltas. */
export function resolverConflictos() {
  const enConflicto = git('diff', '--name-only', '--diff-filter=U').split('\n').map((s) => s.trim()).filter(Boolean);
  const resueltos = [];
  for (const ruta of enConflicto.filter((r) => ARCHIVOS_QUE_SE_UNEN.includes(r))) {
    fs.writeFileSync(ruta, unirArchivo(ruta, version(1, ruta), version(2, ruta), version(3, ruta)), 'utf8');
    git('add', '--', ruta);
    resueltos.push(ruta);
    console.log(`  ${ruta}: unido sin pisar lo que decidió una persona`);
  }
  return resueltos;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) resolverConflictos();

// Las escenas animadas por su nombre (18/10/2026, el video en un repositorio aparte: docs/07-REDES.md, «El video, como módulo aparte»).
//
// Una escena es una función `cuadro(t)` que no se puede mandar por la red. Lo que sí se puede mandar es CÓMO se arma: el nombre de la función que la
// dibuja y los datos que recibe (todo JSON). `reels/escenas/del-plan.mjs` anota en cada escena ese «descriptor» ({ fn, args }) y el repositorio de render
// la rehace con `rehacerEscena`, con el mismo código y los mismos datos: el mismo dibujo, cuadro por cuadro.

import { escenaDeClima } from './clima.mjs';
import { escenaDeFarmacia, escenaDeParticipa, escenaDeUtiles, escenaDeAgenda } from './servicios.mjs';
import { escenaDeEfemeride, escenaDeFeriado } from './fechas.mjs';

export const FUNCIONES_DE_ESCENA = {
  escenaDeClima, escenaDeFarmacia, escenaDeParticipa, escenaDeUtiles, escenaDeAgenda, escenaDeEfemeride, escenaDeFeriado,
};

/** Rehace una escena desde su descriptor { fn, args }. Lanza si la función no existe (el pedido es de una versión que este render no conoce). */
export function rehacerEscena(descriptor) {
  const f = FUNCIONES_DE_ESCENA[descriptor?.fn];
  if (!f) throw new Error(`escena desconocida: ${String(descriptor?.fn).slice(0, 40)}`);
  return f(descriptor.args ?? {});
}

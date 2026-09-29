// Qué notas cuenta cada repaso del día (29/09).
//
// Es la elección que hacía reels/plan.mjs adentro, sacada acá para que la usen
// los dos lados con la misma regla: el plan, que arma los videos, y la previa
// del panel del celular (redes/previa.mjs), que muestra qué contaría cada
// repaso si saliera ahora. Sin dependencias: se prueba sin nada instalado.
//
// Las reglas de fondo (nada de Política ni Policiales, sólo lo de Balcarce, temas
// distintos, sin repetir lo que se contó en los últimos días, el presupuesto de
// 55 segundos) están en redes/elegir.mjs.

import { elegirParaPodcast, repasoConPresupuesto } from './elegir.mjs';
import { PODCASTS, piezasPublicadasHoy, notasContadasEnPodcasts } from './piezas.mjs';
import { PIEZAS } from '../ingesta/criterio.mjs';

/**
 * Los repasos que todavía no salieron hoy, con sus notas: { nombre:
 * repasoConPresupuesto(...) } (guion, notas, segundos…). `publicables` son las
 * notas que pueden entrar (lo ya publicado en la web), de más a menos relevantes.
 *
 * El de la mañana y el de la tarde cuentan tres notas de temas distintos, sin
 * repetir entre sí ni lo contado en los últimos días. El de la noche repasa lo
 * más fuerte del día: puede repetir lo de la mañana o la tarde de hoy, no lo de
 * días anteriores, y no pide relevancia mínima. Un repaso de menos de dos notas
 * no sale.
 */
export function repasosDelDia(publicables = [], { libro = null, fecha = new Date() } = {}) {
  const hechas = piezasPublicadasHoy(libro, fecha);
  const contadas = notasContadasEnPodcasts(libro, fecha);
  const libres = publicables.filter((n) => !contadas.has(n.id));
  const [manana, tarde, noche] = PODCASTS;
  const salida = {};
  const yaContadas = [];
  for (const ronda of [manana, tarde]) {
    if (hechas.has(ronda.nombre)) continue;
    const repaso = repasoConPresupuesto(
      elegirParaPodcast(libres, { cuantas: PIEZAS.notasPorPodcast, excluir: yaContadas }), { momento: ronda.momento, fecha },
    );
    if (!repaso) continue;
    yaContadas.push(...repaso.notas);
    salida[ronda.nombre] = repaso;
  }
  const contadasAntes = notasContadasEnPodcasts(libro, fecha, 3, { incluirHoy: false });
  const delDia = elegirParaPodcast(
    publicables.filter((n) => !contadasAntes.has(n.id)),
    { cuantas: PIEZAS.notasPodcastNoche },
    { relevanciaParaPodcast: 0 },
  );
  const repasoNoche = repasoConPresupuesto(delDia, { momento: noche.momento, fecha });
  if (repasoNoche && !hechas.has(noche.nombre)) salida[noche.nombre] = repasoNoche;
  return salida;
}

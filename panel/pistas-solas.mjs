// Pistas que salen solas (4/10/2026, Hernán: "si 3 medios, sale sola"). Una pista abierta que ya cubren TRES o más medios se escribe con el mismo
// camino que "Hacer la nota" (panel/nota-de-pista.mjs) y, si el verificador no tiene nada para decir, queda como nota propia en
// web/data/notas-de-pistas.json con la firma de la IA (sin decir que la revisó una persona). Si hay cualquier aviso, no sale: la pista sigue
// abierta para que la vea una persona. Sin dependencias.

import { escribirNotaDePista } from './nota-de-pista.mjs';
import { conResultado } from './pistas-libro.mjs';
import { motivoDeRechazo, idDeNotaDePista } from '../web/lib/notas-de-pistas.js';

/** Con cuántos medios distintos una pista sale sola. */
export const MEDIOS_PARA_SALIR_SOLA = 3;
/** Cuántas notas de pistas salen solas por corrida (cada una gasta búsquedas y pedidos a la IA). */
export const MAXIMO_POR_CORRIDA = 2;
export const POR_AUTOMATICA = 'Radar Balcarce (automática)';

/** Los ids de las pistas que están para salir solas: abiertas, con 3 o más medios, sin nota ni cierre. */
export function pistasParaSalirSolas(libro, notas = {}) {
  return Object.entries(libro?.pistas ?? {})
    .filter(([id, p]) => p.estado === 'abierta' && (p.total ?? 0) >= MEDIOS_PARA_SALIR_SOLA && !p.resultado && !notas?.notas?.[id])
    .map(([id]) => id)
    .slice(0, MAXIMO_POR_CORRIDA);
}

/**
 * Intenta sacar solas las pistas que están para eso. Devuelve { libro, notas, salieron: [id], intentadas: [{ id, motivo }] }. Lo que falla
 * queda anotado en el seguimiento de la pista y se vuelve a intentar en la próxima corrida (mientras siga abierta).
 */
export async function sacarPistasSolas({ libro, notas = { notas: {} }, archivo = [], escribir = escribirNotaDePista, ahora = new Date() } = {}) {
  let l = libro;
  let n = notas;
  const salieron = [];
  const intentadas = [];
  for (const id of pistasParaSalirSolas(libro, notas)) {
    const r = await escribir({ ...l.pistas[id], id }, { archivo, ahora });
    const motivo = !r.ok ? (r.motivo ?? 'el verificador tiene avisos')
      : (r.problemas?.length || r.aviso) ? 'el verificador tiene avisos'
        : (r.medios ?? 0) < MEDIOS_PARA_SALIR_SOLA ? `la búsqueda con texto encontró sólo ${r.medios ?? 0} medios`
          : !r.texto ? 'no hay texto' : null;
    const entrada = motivo ? null : {
      titulo: r.texto.titulo, copete: r.texto.copete, cuerpo: r.texto.cuerpo, seccion: r.seccion, fuentes: r.fuentes,
      pista: id, automatica: true, motivo: `nota escrita con IA a partir de una pista cubierta por ${r.medios} medios y verificada contra sus textos`,
      cuando: ahora.toISOString(), por: POR_AUTOMATICA,
    };
    const rechazo = entrada ? motivoDeRechazo(entrada) : null;
    if (!entrada || rechazo) {
      intentadas.push({ id, motivo: motivo ?? rechazo });
      continue;
    }
    n = { ...n, notas: { ...(n.notas ?? {}), [id]: entrada } };
    l = conResultado(l, id, { tipo: 'publicada', comentario: 'salió sola (3 o más medios)', ruta: `/nota/${idDeNotaDePista(id)}` }, ahora);
    salieron.push(id);
  }
  return { libro: l, notas: n, salieron, intentadas };
}

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
/**
 * P-4 (8/10/2026): cada intento gasta créditos de búsqueda (Tavily, unos 8 con dos búsquedas a fondo) y el plan gratis es corto. Antes una
 * pista que no salía se volvía a intentar en cada vuelta (cada 3 horas): con dos pistas abiertas, unos 64 créditos por día. Ahora, a lo sumo
 * un intento por pista cada 20 horas y tres en total; después queda para una persona ("Hacer la nota" a mano, que no tiene este límite).
 */
export const INTENTOS_SOLAS = { total: 3, horasEntreIntentos: 20 };

/** Los ids de las pistas que están para salir solas: abiertas, con 3 o más medios, sin nota ni cierre, y con intentos por gastar. */
export function pistasParaSalirSolas(libro, notas = {}, ahora = new Date()) {
  const puedeOtraVez = (p) => !p.sola
    || ((p.sola.n ?? 0) < INTENTOS_SOLAS.total && ahora - Date.parse(p.sola.ultimo ?? 0) >= INTENTOS_SOLAS.horasEntreIntentos * 3600e3);
  return Object.entries(libro?.pistas ?? {})
    .filter(([id, p]) => p.estado === 'abierta' && (p.total ?? 0) >= MEDIOS_PARA_SALIR_SOLA && !p.resultado && !notas?.notas?.[id] && puedeOtraVez(p))
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
  for (const id of pistasParaSalirSolas(libro, notas, ahora)) {
    const r = await escribir({ ...l.pistas[id], id }, { archivo, ahora });
    // Un servicio de búsqueda que rechaza la clave o no tiene más créditos (401/402/429/432/433): no se sigue con las demás.
    const sinCreditos = /Tavily HTTP (401|402|429|432|433)|falta TAVILY_API_KEY/.test(String(r.motivo ?? ''));
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
      const p = l.pistas[id];
      l = { ...l, pistas: { ...l.pistas, [id]: { ...p, sola: { n: (p.sola?.n ?? 0) + 1, ultimo: ahora.toISOString() } } } };
      if (sinCreditos) break;
      continue;
    }
    n = { ...n, notas: { ...(n.notas ?? {}), [id]: entrada } };
    l = conResultado(l, id, { tipo: 'publicada', comentario: 'salió sola (3 o más medios)', ruta: `/nota/${idDeNotaDePista(id)}` }, ahora);
    salieron.push(id);
  }
  return { libro: l, notas: n, salieron, intentadas };
}

// Escribir UNA nota con IA porque lo pidió una persona (29/09, panel del
// celular: panel/celular.mjs, que corre en GitHub Actions).
//
// Es el mismo camino que la reescritura automática: el texto completo de las
// fuentes, los antecedentes que el sitio ya publicó, el mismo criterio
// (CRITERIO-EDITORIAL.md § 12, con el pedido de la persona al final), los
// arreglos que no inventan nada y el mismo verificador. La diferencia: acá no
// se descarta nada en silencio. Una persona lo va a leer antes de publicar, así
// que vuelve el texto con la lista de lo que no cuadra con las fuentes.
//
// Sin dependencias: lo que importa de reels/ y web/lib no trae paquetes.

import {
  textoCompletoDe, antecedentesDe, reescribir, materialParaVerificar, completarReescritura,
  semaforoDeLaReescritura, esLocal,
} from '../reels/reescritura.mjs';
import { arreglarEscritura, verificar, depurarCuerpo } from '../ingesta/verificar.mjs';
import { tieneCuerpo, palabrasDe, PALABRAS_MINIMAS_CUERPO } from '../web/lib/cuerpo.js';

/**
 * @param {object} nota  como la trae la ingesta (con `origenes`) o armada con lo publicado
 * @param {object} [o]
 * @param {string} [o.pedido]    lo que pidió la persona ("más corta", "empezá por…")
 * @param {object[]} [o.archivo] lo ya publicado (web/data/archivo.json), para los antecedentes
 * @returns {Promise<{ ok: boolean, motivo?: string, texto?: object, problemas: string[], sacadas: number, aviso: string|null }>}
 */
export async function reescribirUna(nota, {
  pedido = null, archivo = [], traer, opciones = {}, ahora = new Date(),
} = {}) {
  const completo = await textoCompletoDe(nota, traer);
  const conTexto = {
    ...nota,
    textoDeLaFuente: completo.texto,
    fuenteDelTexto: completo.numero,
    antecedentes: antecedentesDe(nota, archivo, { ahora }),
  };
  // Lo rojo (un menor, una víctima) no se escribe nunca, ni a pedido.
  const deLaFuente = semaforoDeLaReescritura(conTexto);
  if (deLaFuente?.color === 'rojo') return { ok: false, motivo: `no se escribe: ${deLaFuente.motivo}`, problemas: [], sacadas: 0, aviso: null };
  const material = materialParaVerificar(conTexto);
  if (!String(material.resumen ?? '').trim()) {
    return { ok: false, motivo: 'no se pudo bajar el texto de ninguna fuente: no hay de dónde escribir', problemas: [], sacadas: 0, aviso: null };
  }

  let r;
  try {
    r = await reescribir(conTexto, { ...opciones, pedido });
  } catch (e) {
    return { ok: false, motivo: `la IA no contestó (${String(e.message).slice(0, 120)})`, problemas: [], sacadas: 0, aviso: null };
  }
  r = { ...r, ...arreglarEscritura(r, { hoy: ahora }).nuevo };

  // Como en la automática: si el cuerpo trae un dato que no cuadra, se sacan
  // esas oraciones; si lo que queda pasa y alcanza, se usa eso.
  const deBalcarce = esLocal(nota);
  let control = verificar(material, r, { estilo: true, deBalcarce });
  let sacadas = 0;
  if (!control.ok) {
    const depurado = depurarCuerpo(material, r);
    const limpio = { ...r, cuerpo: depurado.cuerpo };
    const otra = verificar(material, limpio, { estilo: true, deBalcarce });
    if (otra.ok && tieneCuerpo(limpio)) {
      r = limpio;
      control = otra;
      sacadas = depurado.sacadas.length;
    }
  }
  const problemas = control.problemas.map((p) => p.detalle);
  if (!tieneCuerpo(r)) problemas.push(`el cuerpo tiene ${palabrasDe(r.cuerpo)} palabras: hacen falta ${PALABRAS_MINIMAS_CUERPO}`);

  // Lo escrito también pasa por el semáforo: rojo no vuelve nunca; amarillo
  // vuelve con el aviso (lo va a decidir una persona).
  const sensible = semaforoDeLaReescritura(conTexto, r);
  if (sensible?.color === 'rojo') return { ok: false, motivo: `lo que escribió la IA da rojo: ${sensible.motivo}`, problemas: [], sacadas: 0, aviso: null };
  const { extras } = completarReescritura(conTexto, r);
  return {
    ok: problemas.length === 0,
    texto: {
      titulo: r.titulo, copete: r.copete, cuerpo: r.cuerpo, guion: r.guion, ...extras,
    },
    problemas,
    sacadas,
    aviso: sensible?.motivo ?? null,
  };
}

/**
 * Una nota publicada (portada.json o archivo.json) o que espera cuerpo
 * (esperando-cuerpo.json), armada como la espera reescribirUna: sus fuentes con
 * el enlace (de ahí se baja el texto completo) y el titular de hoy.
 */
export function notaDesdeLoPublicado(n = {}) {
  const fuentes = (n.fuentesConsultadas ?? n.fuentes ?? []).filter((f) => f?.enlace);
  return {
    id: n.id,
    titulo: n.titulo,
    seccion: n.seccion,
    medios: n.medios?.length ? n.medios : fuentes.map((f) => f.medio).filter(Boolean),
    fecha: n.fecha,
    local: n.local,
    temas: n.temas ?? [],
    resumenFuente: '',
    origenes: fuentes.map((f) => ({
      medio: f.medio ?? null, enlace: f.enlace, fecha: f.fecha ?? null, oficial: !!f.oficial, resumen: '',
    })),
  };
}

// Qué campos de una nota se pueden corregir a mano en el panel, y cómo se
// mezcla lo que trajo la ingesta con lo que ya se decidió.
//
// Está acá y no dentro de vista() en servidor.mjs porque el 23/09 se descubrió
// que el panel no mostraba el cuerpo de la nota: se había agregado al resto de
// la cadena y no a esta mezcla. Ahora hay una prueba que lo vigila.

import { extrasDe, sinExtras } from '../reels/reescritura.mjs';

/** El título, el copete, el cuerpo y el guion tal como salen en el panel:
 *  lo decidido manda; si no, lo que trajo la fuente. Y, si la IA las
 *  escribió, las partes nuevas (claves, qué se sabe, nivel de verificación…),
 *  que el panel muestra sin dejarlas editar. */
export function camposEditables(nota, decision) {
  return {
    titulo: decision?.titulo ?? nota.titulo,
    copete: decision?.copete ?? nota.resumenFuente,
    cuerpo: decision?.cuerpo ?? null,
    guion: decision?.guion ?? null,
    deIA: decision?.deIA ?? null,
    ...extrasDe(decision),
  };
}

/** Lo que del panel necesita la web (web/data/decisiones.json). Todo lo que se
 *  puede editar en el panel tiene que estar acá: si no, se ve en el tablero y
 *  no llega al sitio. Así pasó con el cuerpo hasta el 24/09. Las partes
 *  nuevas, sólo si existen: no se llena el archivo de nulos. */
export function decisionParaLaWeb(d) {
  return {
    estado: d.estado,
    ...Object.fromEntries(
      ['titulo', 'copete', 'cuerpo', 'guion', 'deIA', 'por', 'cuando'].map((k) => [k, d[k] ?? null]),
    ),
    ...extrasDe(d),
  };
}

/**
 * La decisión después de que una persona tocó el texto. Las partes nuevas
 * (claves, qué se sabe, texto para redes…) las escribió la IA sobre SU
 * versión: si una persona cambia el título, la bajada o el cuerpo, podrían
 * contradecir la nota corregida, así que se borran. Si sólo apretó
 * "Publicar" sin cambiar el texto, quedan.
 */
export function conTextoCorregido(previo = {}, nuevo = {}) {
  const cambio = ['titulo', 'copete', 'cuerpo'].some((k) => nuevo[k] != null && nuevo[k] !== previo[k]);
  return cambio ? { ...sinExtras(previo), ...nuevo } : { ...previo, ...nuevo };
}

// Cuánto se guarda una decisión en web/data/decisiones.json. Hasta el 25/09
// no se podaba nunca: 950 decisiones y 437 KB que viajan en cada commit y que
// "Actualizar la web" lee entero cada media hora, aunque sólo mira las de las
// notas que la ingesta trae ese día (web/scripts/generar-datos.mjs busca por
// id de nota). Una nota de hace dos meses ya no vuelve a aparecer.
export const DIAS_DE_DECISIONES = 60;

// Lo que una persona sacó de circulación se guarda igual, sin importar la
// fecha: si una portada que no fecha sus notas vuelve a mostrar una vieja,
// sin la decisión saldría otra vez por el semáforo. Son pocas.
const SACADAS_A_MANO = new Set(['descartada', 'bloqueada', 'archivada']);

/** Las decisiones sin las de más de `dias` días. Las que no tienen fecha
 *  (`cuando`) se conservan: no hay cómo saber si son viejas. */
export function podarDecisiones(decisiones, { ahora = Date.now(), dias = DIAS_DE_DECISIONES } = {}) {
  const limite = ahora - dias * 86400000;
  return Object.fromEntries(Object.entries(decisiones ?? {}).filter(([, d]) => {
    const t = Date.parse(d?.cuando ?? '');
    if (!Number.isFinite(t) || t >= limite) return true;
    const humana = !!d.por && d.por !== 'ia';
    return humana && SACADAS_A_MANO.has(d.estado);
  }));
}

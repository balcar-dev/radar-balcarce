// Qué pieza de video sale a Instagram y cuándo.
//
// Todo lo que va a Instagram es video: las historias y los reels llevan voz, y
// el video es lo único que se puede entregar sin alojarlo en un sitio público.
//
// La PC o GitHub arman las piezas del día (reels/plan.mjs --generar) y dejan
// un manifiesto, piezas.json, que dice cuáles hay y a qué hora le toca a cada
// una. Esto decide, con el reloj y el libro de lo ya publicado, cuáles salen
// ahora. Sin red y sin reloj propio: se prueba entera.

import { diaAR, horaAR, yaPublicada } from './elegir.mjs';

/** Cuánto tiempo después de su hora una pieza todavía vale la pena. Un clima
 *  de las 7:30 a las 15:00 ya no es el clima. */
export const VENTANA_MINUTOS = 120;

/** Las piezas por corrida: que salgan de a poco y no todas juntas. */
export const POR_CORRIDA = 2;

/** Lo que identifica a una pieza en el libro: el día y el nombre. */
export const claveDePieza = (nombre, fecha = new Date()) => `${diaAR(fecha)}/${nombre}`;

/** Cómo se llama en Instagram lo que arma el plan. */
export const tipoInstagram = (pieza) => (pieza.tipo === 'reel' ? 'REELS' : 'STORIES');

/**
 * El texto que acompaña al reel. Las historias no llevan.
 * Sólo lo que ya está publicado: el titular y de dónde seguir leyendo.
 */
export function pieDePieza(pieza) {
  if (pieza.tipo !== 'reel') return '';
  if (pieza.nombre === 'podcast') {
    return 'El repaso del día en Balcarce.\n\nLas notas, con la fuente, en radarbalcarce.com';
  }
  return `${pieza.titulo}\n\nMás en radarbalcarce.com`;
}

const aMinutos = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
};

const minutosAR = (fecha) => horaAR(fecha) * 60 + Number(
  new Intl.DateTimeFormat('en-GB', { minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }).format(fecha),
);

/**
 * Las piezas que corresponde publicar ahora.
 *
 * @param {object[]} o.piezas   el manifiesto: { nombre, tipo, hora, titulo, archivo }
 * @param {object} o.libro      lo ya publicado
 * @param {boolean} [o.sinHorario] para probar a mano: todas las que falten
 */
export function piezasQueTocan({ piezas, libro, ahora = new Date(), sinHorario = false, ventana = VENTANA_MINUTOS, porCorrida = POR_CORRIDA }) {
  const ahoraMin = minutosAR(ahora);
  return [...piezas]
    .filter((p) => !yaPublicada(libro, 'instagram', claveDePieza(p.nombre, ahora)))
    .filter((p) => {
      if (sinHorario) return true;
      const desde = aMinutos(p.hora);
      return ahoraMin >= desde && ahoraMin < desde + ventana;
    })
    .sort((a, b) => aMinutos(a.hora) - aMinutos(b.hora))
    .slice(0, sinHorario ? piezas.length : porCorrida);
}

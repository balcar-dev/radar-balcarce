// Qué pieza de video sale a Instagram y cuándo.
//
// Todo lo que va a Instagram es video: las historias y los reels llevan voz, y
// el video es lo único que se puede entregar sin alojarlo en un sitio público.
//
// Hay dos preguntas distintas y las dos viven acá:
//
//   1. ¿Qué piezas le tocan al día y a qué hora?  → cronogramaDelDia()
//   2. ¿Cuáles salen AHORA?                       → slotsQueTocan()
//
// La segunda se responde sin armar nada (sin instalar resvg ni ffmpeg): sólo
// con la hora y el libro de lo ya publicado. Así, cuando no hay nada para
// publicar, la corrida de GitHub termina en segundos y no gasta minutos.
//
// Sin red y sin reloj propio: se prueba entera.

import { diaAR, horaAR, yaPublicada } from './elegir.mjs';
import { horariosDe } from '../panel/horarios.mjs';

/** Cuánto tiempo después de su hora una pieza todavía vale la pena. Un clima
 *  de las 7:30 a las 15:00 ya no es el clima.
 *
 *  Es también lo que hace tolerable que el reloj de GitHub sea impuntual: si
 *  una corrida llega una hora tarde, todavía alcanza. */
export const VENTANA_MINUTOS = 120;

/** Las piezas por corrida. Antes eran 2, para que salieran de a poco, pero con el
 *  reloj impuntual de GitHub una pieza que quedaba para la corrida siguiente se
 *  podía perder. La clave de Gemini es paga y no hay cupo que cuidar: sale todo
 *  lo que toque, junto. */
export const POR_CORRIDA = 6;

/** Los reels del día: dos noticias y el podcast. Los usa reels/plan.mjs. */
export const HORAS_REELS = ['10:00', '15:00', '20:30'];

/** Las historias de notas: 10:40, 12:40 y 14:40. Las usa reels/plan.mjs. */
export const horaHistoriaDeNota = (i) => `${String(10 + i * 2).padStart(2, '0')}:40`;

/** Cuántas historias de notas hay por día (ver REGLAS_PIEZAS en elegir.mjs). */
export const HISTORIAS_DE_NOTAS = 3;

/** Piezas fijas que sólo se pueden armar en la PC: sus datos no están en la
 *  web. Hasta que lo estén, GitHub no las espera (si no, las reintentaría en
 *  cada corrida sin poder armarlas nunca). */
export const SOLO_EN_LA_PC = ['agenda'];

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

/** El día de la semana en Balcarce, con 0 = domingo como Date#getDay(). */
const diaSemanaAR = (fecha) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
  new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).format(fecha),
);

/**
 * Todas las piezas del día con su hora, sin saber todavía qué nota va en cada
 * una. Es la lista que el reloj recorre.
 *
 * Las fijas (clima, farmacia, útiles…) toman su horario de panel/horarios.mjs;
 * en GitHub no hay panel, así que valen los de fábrica. Los reels y las
 * historias de notas tienen los suyos arriba.
 */
export function cronogramaDelDia(fecha = new Date(), { estado = {} } = {}) {
  const dia = diaSemanaAR(fecha);
  const fijas = horariosDe(estado)
    .filter((h) => h.activa !== false && (h.dias ?? []).includes(dia))
    .filter((h) => !SOLO_EN_LA_PC.includes(h.id))
    .map((h) => ({ nombre: h.id, tipo: 'historia', hora: h.hora }));

  return [
    ...fijas,
    { nombre: 'noticia1', tipo: 'reel', hora: HORAS_REELS[0] },
    { nombre: 'noticia2', tipo: 'reel', hora: HORAS_REELS[1] },
    { nombre: 'podcast', tipo: 'reel', hora: HORAS_REELS[2] },
    ...Array.from({ length: HISTORIAS_DE_NOTAS }, (_, i) => (
      { nombre: `historia${i + 1}`, tipo: 'historia', hora: horaHistoriaDeNota(i) }
    )),
  ].sort((a, b) => aMinutos(a.hora) - aMinutos(b.hora));
}

/** ¿Está dentro de su hora? Desde que le toca hasta que vence la ventana. */
function enHora(hora, ahora, ventana) {
  const desde = aMinutos(hora);
  const ahoraMin = minutosAR(ahora);
  return ahoraMin >= desde && ahoraMin < desde + ventana;
}

/**
 * Las piezas que corresponde armar y publicar AHORA: las que están dentro de
 * su hora y todavía no salieron hoy.
 *
 * Si una corrida se demora, la pieza sigue valiendo hasta que se cierra su
 * ventana. Si se cierra sin haber salido, se pierde: es preferible a publicar
 * el clima de la mañana a la tarde.
 */
export function slotsQueTocan({ ahora = new Date(), libro, ventana = VENTANA_MINUTOS, estado = {} }) {
  return cronogramaDelDia(ahora, { estado })
    .filter((p) => !yaPublicada(libro, 'instagram', claveDePieza(p.nombre, ahora)))
    .filter((p) => enHora(p.hora, ahora, ventana));
}

/**
 * Las notas que ya se usaron hoy en una pieza (reel o historia), para no
 * repetirlas. Sin esto, cada corrida elegiría "la mejor nota" desde cero y la
 * misma podría salir de historia a las 10:40 y de reel a las 15:00.
 */
export function notasUsadasHoy(libro, fecha = new Date()) {
  const hoy = diaAR(fecha);
  return new Set(
    Object.entries(libro?.instagram ?? {})
      .filter(([clave, v]) => clave.startsWith(`${hoy}/`) && v?.notaId)
      .map(([, v]) => v.notaId),
  );
}

/**
 * Las piezas armadas que salen ahora: las del manifiesto que están en hora y
 * todavía no salieron.
 *
 * @param {object[]} o.piezas   el manifiesto: { nombre, tipo, hora, titulo, archivo }
 * @param {object} o.libro      lo ya publicado
 * @param {boolean} [o.sinHorario] para probar a mano: todas las que falten
 */
export function piezasQueTocan({
  piezas, libro, ahora = new Date(), sinHorario = false, ventana = VENTANA_MINUTOS, porCorrida = POR_CORRIDA, red = 'instagram',
}) {
  return [...piezas]
    .filter((p) => !yaPublicada(libro, red, claveDePieza(p.nombre, ahora)))
    .filter((p) => sinHorario || enHora(p.hora, ahora, ventana))
    .sort((a, b) => aMinutos(a.hora) - aMinutos(b.hora))
    .slice(0, sinHorario ? piezas.length : porCorrida);
}

/** Los nombres de las piezas que ya salieron hoy. */
export function piezasPublicadasHoy(libro, fecha = new Date()) {
  const hoy = diaAR(fecha);
  return new Set(
    Object.keys(libro?.instagram ?? {})
      .filter((clave) => clave.startsWith(`${hoy}/`))
      .map((clave) => clave.slice(hoy.length + 1)),
  );
}

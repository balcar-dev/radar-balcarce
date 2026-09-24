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

/**
 * Cuánto sigue valiendo cada pieza después de su hora, en minutos.
 *
 * Es más larga que las 2 horas de arriba en lo que no caduca rápido: el 21/09 el
 * planificador de GitHub no ejecutó ninguna corrida entre las 19:00 y las 21:00,
 * se cerró la ventana de la farmacia y esa noche no salió. Pero la farmacia de
 * turno sirve toda la noche (el turno dura hasta la mañana siguiente), igual que
 * el clima de la noche y el podcast. Ninguna pasa de la medianoche: lo de un día
 * no sale al siguiente.
 *
 * Lo que sí caduca (una historia de una nota, el clima "de hoy" de la mañana) se
 * deja más corto, para no publicar viejo.
 */
export const VENTANAS = {
  'clima-manana': 240, // 7:30 → 11:30
  noticia1: 300,       // 10:00 → 15:00
  noticia2: 300,       // 15:00 → 20:00
  historia1: 180,      // 10:40 → 13:40
  historia2: 180,      // 12:40 → 15:40
  historia3: 180,      // 14:40 → 17:40
  farmacia: 300,       // 19:00 → 24:00
  'clima-noche': 240,  // 20:00 → 24:00
  podcast: 210,        // 20:30 → 24:00
  utiles: 300,         // 11:00 → 16:00
};

/** La ventana de una pieza: la suya, o la de siempre si no tiene. */
export const ventanaDe = (nombre) => VENTANAS[nombre] ?? VENTANA_MINUTOS;

/** Las piezas por corrida. Antes eran 2, para que salieran de a poco, pero con el
 *  reloj impuntual de GitHub una pieza que quedaba para la corrida siguiente se
 *  podía perder. La clave de Gemini es paga y no hay cupo que cuidar: sale todo
 *  lo que toque, junto. */
export const POR_CORRIDA = 6;

/** Los tres podcasts del día: mañana, tarde y noche. Los usa reels/plan.mjs. */
export const HORAS_REELS = ['10:00', '15:00', '20:30'];

/** Las historias de notas: 10:40, 12:40 y 14:40. Las usa reels/plan.mjs. */
export const horaHistoriaDeNota = (i) => `${String(10 + i * 2).padStart(2, '0')}:40`;

/** Cuántas historias de UNA nota hay por día. Cero desde el 24/09: una noticia
 *  sola dicha en voz alta sonaba rara. Las notas salen dentro de los podcasts, y
 *  cada podcast se sube también como historia. */
export const HISTORIAS_DE_NOTAS = 0;

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
  // Un podcast lista las notas que cuenta, cada una con su enlace. La fuente
  // no se nombra: eso está en la nota de la web.
  if (pieza.items?.length) {
    const lista = pieza.items.map((i) => `• ${i.titulo}${i.enlace ? `\n  ${i.enlace}` : ''}`).join('\n');
    return `${pieza.titulo}\n\n${lista}\n\nMás en radarbalcarce.com`;
  }
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

// Los teléfonos útiles no dependen de una fecha para tener sentido (a
// diferencia de la agenda del finde), así que no hay motivo para que caigan
// siempre el mismo día: se pidió que roten, de lunes a viernes, una semana
// distinta cada vez. La placa es la misma casi siempre — sólo cambia si se
// actualiza la lista de teléfonos en ingesta/utiles.mjs —, lo único que se
// mueve es qué día de la semana le toca.
const DIAS_HABILES = [1, 2, 3, 4, 5]; // lunes a viernes, como en horariosDe()
const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

/** Qué día (lunes a viernes) le toca a los teléfonos útiles esta semana. */
export function diaRotativoDeUtiles(fecha = new Date()) {
  // Se ancla al lunes de la semana (hora de Balcarce), no a la fecha exacta:
  // si no, un martes podría quedar en una "semana" distinta que el lunes de
  // al lado nada más porque los siete días no arrancan a contarse un lunes.
  const medianoche = new Date(`${diaAR(fecha)}T00:00:00Z`).getTime();
  const diasDesdeElLunes = (diaSemanaAR(fecha) + 6) % 7; // domingo=0 → 6, lunes=1 → 0…
  const lunesDeEstaSemana = medianoche - diasDesdeElLunes * 24 * 60 * 60 * 1000;
  const semanas = Math.floor(lunesDeEstaSemana / SEMANA_MS);
  return DIAS_HABILES[semanas % DIAS_HABILES.length];
}

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
  // Si alguien fijó a mano qué días salen los útiles desde el panel, eso
  // manda. Si no, rota sola.
  const diasUtilesAMano = estado?.horarios?.utiles?.dias;
  const fijas = horariosDe(estado)
    .filter((h) => h.activa !== false)
    .filter((h) => !SOLO_EN_LA_PC.includes(h.id))
    .filter((h) => (h.id === 'utiles' && !diasUtilesAMano
      ? dia === diaRotativoDeUtiles(fecha)
      : (h.dias ?? []).includes(dia)))
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
export function slotsQueTocan({ ahora = new Date(), libro, ventana, estado = {} }) {
  return cronogramaDelDia(ahora, { estado })
    .filter((p) => !yaPublicada(libro, 'instagram', claveDePieza(p.nombre, ahora)))
    .filter((p) => enHora(p.hora, ahora, ventana ?? ventanaDe(p.nombre)));
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
      .filter(([clave]) => clave.startsWith(`${hoy}/`))
      .flatMap(([, v]) => [v?.notaId, ...(v?.notaIds ?? [])])
      .filter(Boolean),
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
  piezas, libro, ahora = new Date(), sinHorario = false, ventana, porCorrida = POR_CORRIDA, red = 'instagram',
}) {
  return [...piezas]
    .filter((p) => !yaPublicada(libro, red, claveDePieza(p.nombre, ahora)))
    .filter((p) => sinHorario || enHora(p.hora, ahora, ventana ?? ventanaDe(p.nombre)))
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

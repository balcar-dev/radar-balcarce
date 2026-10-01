// Qué pieza de video (historia o reel) sale y cuándo, en Instagram y en la
// página de Facebook: el mismo video va a las dos redes, a la misma hora.
//
// Todo lo que va a Instagram es video: las historias y los reels llevan voz, y
// el video es lo único que se puede entregar sin alojarlo en un sitio público.
// (Los posteos de notas en Facebook y su foto espejo en Instagram no pasan por
// acá: los elige redes/elegir.mjs, elegirParaFacebook.)
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

import { yaPublicada } from './elegir.mjs';
import { diaAR, minutoDelDiaAR, diaSemanaAR, minutosDeHora } from '../ingesta/zona.mjs';
import { horariosDe, toca } from '../panel/horarios.mjs';
import { diaRotativoDeUtiles } from '../ingesta/utiles.mjs';
import { CONTRATO_DIARIO } from '../ingesta/criterio.mjs';
import { avisosDelClima } from '../ingesta/alertas.mjs';
import { SITIO } from './prompt-redes.mjs';

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
 * Lo que sí caduca (el clima "de hoy" de la mañana) se deja más corto, para no
 * publicar viejo. El aviso de clima tiene la suya (VENTANA_AVISO, más abajo).
 */
// Cada pieza sale dentro de su parte del día (29/09, Hernán: "que siempre lo que
// se diga tenga en cuenta si es mañana, tarde o noche"): el saludo, el cierre y
// lo que dice son los de su hora (momentoDeHora: mañana hasta las 12:59, tarde
// hasta las 18:59, noche desde las 19), así que una pieza de la mañana no puede
// salir a las 14 diciendo "buen día". Si se le pasa la franja, ese día no sale.
const VENTANAS = {
  'clima-manana': 240, // 7:00 → 11:00
  noticia1: 180,       // 10:00 → 13:00 (hasta el 29/09, hasta las 15)
  noticia2: 240,       // 15:00 → 19:00 (hasta el 29/09, hasta las 20)
  farmacia: 300,       // 19:00 → 24:00
  'clima-noche': 240,  // 20:00 → 24:00
  podcast: 180,        // 21:00 → 24:00
  utiles: 60,          // 17:00 → 18:00, los sábados
  agenda: 60,          // 12:00 → 13:00, los jueves
  feriado: 240,        // 8:00 → 12:00, los feriados
  'participa-noticias': 60, 'participa-evento': 60, 'participa-reclamos': 60, 'participa-nota': 60, // 12:00 → 13:00
};

/**
 * El aviso de clima (helada fuerte, granizo, viento de más de 60 km/h) no
 * tiene hora: sale apenas se detecta. Para el reloj, "su hora" es la de la
 * primera vuelta del día de cron-job.org con gente despierta (7:00) y vale
 * hasta las 22:00: si el aviso aparece a las 15:00, la vuelta de las 15:05 lo
 * encuentra dentro de su ventana y lo pide. Sale una vez por día y por tipo
 * (la clave del libro es el día y `aviso-<tipo>`). Antes tenía `hora: 'ahora'`,
 * que no es una hora: el reloj nunca lo pedía y sólo salía a mano (28/09).
 */
export const HORA_AVISO = '07:00';
export const VENTANA_AVISO = 15 * 60; // 7:00 → 22:00

/** ¿Es un aviso de clima? Se llaman `aviso-helada`, `aviso-granizo`, `aviso-viento`. */
const esAviso = (nombre) => String(nombre ?? '').startsWith('aviso-');

/** La ventana de una pieza: la suya, o la de siempre si no tiene. */
export const ventanaDe = (nombre) => VENTANAS[nombre] ?? (esAviso(nombre) ? VENTANA_AVISO : VENTANA_MINUTOS);

/**
 * El aviso de clima de hoy, si hay uno grave: el primero de gravedad alta de
 * `avisosDelClima` (ingesta/alertas.mjs). Lo usan el reloj (para pedirlo) y el
 * plan (para armarlo), así los dos ven el mismo nombre. Sin clima, null.
 *
 * Sólo los graves. Un "posible helada" o un "calor extremo" ya están en la
 * tarjeta de la portada; interrumpir a alguien con una historia es para lo
 * que le puede costar plata o un susto.
 */
export function avisoDeClima(clima) {
  const a = avisosDelClima(clima).find((x) => x.gravedad === 'alta');
  return a ? { ...a, nombre: `aviso-${a.tipo}` } : null;
}

/** Las piezas por corrida. Antes eran 2, para que salieran de a poco, pero con el
 *  reloj impuntual de GitHub una pieza que quedaba para la corrida siguiente se
 *  podía perder. La clave de Gemini es paga y no hay cupo que cuidar: sale todo
 *  lo que toque, junto. */
export const POR_CORRIDA = 6;

/** Los tres podcasts del día: mañana, tarde y noche. Los usa reels/plan.mjs. */
export const HORAS_REELS = ['10:00', '15:00', '21:00'];

/**
 * LA lista de los podcasts (28/09: antes estaba repetida en redes/contrato.mjs,
 * acá y dos veces en reels/plan.mjs). Cada uno sale como reel y se sube también
 * como historia. `nombre` es la clave en el libro; `etiqueta`, cómo lo nombran
 * el contrato y el vigilante; `titulo` y `momento`, lo que usa el plan.
 *
 * Desde el 24/09 no hay historias de UNA nota (una noticia sola dicha en voz
 * alta sonaba rara): las notas salen dentro de los podcasts.
 */
export const PODCASTS = [
  { nombre: 'noticia1', etiqueta: 'podcast mañana', titulo: 'El repaso de la mañana', momento: 'manana', hora: HORAS_REELS[0] },
  { nombre: 'noticia2', etiqueta: 'podcast tarde', titulo: 'El repaso de la tarde', momento: 'tarde', hora: HORAS_REELS[1] },
  { nombre: 'podcast', etiqueta: 'podcast noche', titulo: 'El repaso del día', momento: 'noche', hora: HORAS_REELS[2] },
];

/** Los nombres de los podcasts, para preguntar "¿esta pieza es un podcast?". */
export const NOMBRES_DE_PODCAST = PODCASTS.map((p) => p.nombre);

/** Piezas fijas que sólo se pueden armar en la PC: sus datos no están en la
 *  web. Hasta que lo estén, GitHub no las espera (si no, las reintentaría en
 *  cada corrida sin poder armarlas nunca). Desde el 29/09 no queda ninguna: la
 *  agenda sale de la agenda publicada (web/data/agenda.json, reels/plan.mjs). */
const SOLO_EN_LA_PC = [];

// Desde el 30/09 el repaso lleva siempre el rojo de la marca (CRITERIO-REDES.md § 8): ya no rota un color por día.

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
    return `${pieza.titulo}\n\n${lista}\n\nMás en ${SITIO}`;
  }
  if (pieza.nombre === 'podcast') {
    return `El repaso del día en Balcarce.\n\nLas notas, con la fuente, en ${SITIO}`;
  }
  return `${pieza.titulo}\n\nMás en ${SITIO}`;
}

// Los teléfonos útiles rotan de lunes a viernes, una semana distinta cada vez
// (ingesta/utiles.mjs). Esa regla es la única: la usan también reels/plan.mjs y
// el panel, vía `toca` de panel/horarios.mjs. Se re-exporta con el nombre de
// siempre.
export { diaRotativoDeUtiles };

/** Las historias extras (no están en el contrato de las seis), de la que se
 *  sacaría primero a la que menos importa. */
export const EXTRAS_DE_HISTORIAS = ['utiles', 'agenda', 'participa-noticias', 'participa-evento', 'participa-reclamos', 'participa-nota', 'feriado'];

/**
 * Qué historias sobran para que el día no pase el techo (CONTRATO_DIARIO
 * .historiasMaximasPorDia: las 6 del contrato más 2 extras). Recibe los
 * nombres de todas las historias del día (los tres podcasts cuentan: cada uno
 * se sube también como historia) y devuelve los de los extras que hay que
 * dejar de armar: primero los teléfonos útiles, después la agenda. Las del
 * contrato y los avisos de clima nunca se sacan. Función pura.
 */
export function historiasQueSobran(nombres, techo = CONTRATO_DIARIO.historiasMaximasPorDia) {
  const todas = [...new Set(nombres)];
  let exceso = todas.length - techo;
  const sobran = [];
  for (const extra of EXTRAS_DE_HISTORIAS) {
    if (exceso <= 0) break;
    if (todas.includes(extra)) { sobran.push(extra); exceso -= 1; }
  }
  return sobran;
}

/**
 * Todas las piezas del día con su hora, sin saber todavía qué nota va en cada
 * una. Es la lista que el reloj recorre.
 *
 * Las fijas (clima, farmacia, útiles…) toman su horario de panel/horarios.mjs;
 * en GitHub no hay panel, así que valen los de fábrica. Los podcasts tienen los
 * suyos arriba (PODCASTS).
 *
 * Con `clima` (el de web/data/portada.json, que le pasa el reloj), suma el
 * aviso de clima si hay uno grave (avisoDeClima, HORA_AVISO). Sin clima (el
 * contrato, el vigilante) no lo trae: el aviso no es parte del contrato.
 */
export function cronogramaDelDia(fecha = new Date(), { estado = {}, clima = null } = {}) {
  // `toca` (panel/horarios.mjs) es la única que decide qué día sale cada pieza,
  // la misma que usa reels/plan.mjs: si alguien fijó los días de los útiles a
  // mano desde el panel, manda eso; si no, rotan solos.
  const fijas = horariosDe(estado)
    .filter((h) => !SOLO_EN_LA_PC.includes(h.id))
    .filter((h) => toca(h, fecha, { estado }))
    .map((h) => ({ nombre: h.id, tipo: 'historia', hora: h.hora }));
  const aviso = avisoDeClima(clima);

  return [
    ...(aviso ? [{ nombre: aviso.nombre, tipo: 'historia', hora: HORA_AVISO }] : []),
    ...fijas,
    ...PODCASTS.map((p) => ({ nombre: p.nombre, tipo: 'reel', hora: p.hora })),
  ].sort((a, b) => minutosDeHora(a.hora) - minutosDeHora(b.hora));
}

/** ¿Está dentro de su hora? Desde que le toca hasta que vence la ventana. */
function enHora(hora, ahora, ventana) {
  const desde = minutosDeHora(hora);
  const ahoraMin = minutoDelDiaAR(ahora);
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
export function slotsQueTocan({
  ahora = new Date(), libro, ventana, estado = {}, clima = null,
}) {
  return cronogramaDelDia(ahora, { estado, clima })
    .filter((p) => !yaPublicada(libro, 'instagram', claveDePieza(p.nombre, ahora)))
    .filter((p) => enHora(p.hora, ahora, ventana ?? ventanaDe(p.nombre)));
}

// (notasUsadasHoy, "las notas de cualquier pieza de hoy", se sacó el 28/09: sólo
// la usaban las historias de una nota. Los podcasts no repiten notas con
// notasContadasEnPodcasts, que mira hoy y los dos días anteriores.)

/** Los nombres de pieza que son un podcast (mañana, tarde y noche): las tres
 *  cuentan varias notas, con su lista de enlaces. */
const PIEZAS_DE_PODCAST = new Set(NOMBRES_DE_PODCAST);

/**
 * Las notas que ya se contaron en un podcast en los últimos `dias` días, para
 * que un repaso no vuelva a contar la misma historia mientras siga siendo
 * noticia. Sin esto, una nota local con puntaje alto se repetía en el
 * podcast de la mañana, el de la tarde y el de la noche de tres días
 * seguidos (27/09, Hernán: "veo de nuevo la nota de McCain"). Cuenta también
 * lo de hoy: desde el 29/09 el repaso de la noche tampoco repite lo que contaron
 * el de la mañana o el de la tarde.
 */
export function notasContadasEnPodcasts(libro, fecha = new Date(), dias = 3) {
  const dentro = new Set(Array.from({ length: dias }, (_, i) => diaAR(new Date(fecha.getTime() - i * 86400e3))));
  return new Set(
    Object.entries(libro?.instagram ?? {})
      .filter(([clave]) => {
        const [dia, nombre] = clave.split('/');
        return dentro.has(dia) && PIEZAS_DE_PODCAST.has(nombre);
      })
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
    .sort((a, b) => minutosDeHora(a.hora) - minutosDeHora(b.hora))
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

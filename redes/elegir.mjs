// Qué se publica en las redes, y cuándo.
//
// Es la parte editorial de las redes, y por eso está separada de meta.mjs:
// una función pura que recibe las notas y el libro de lo ya publicado, y
// devuelve qué corresponde salir ahora. Sin red, sin reloj propio: se prueba
// entera.
//
// Reglas de fondo:
//
//   · Sólo sale lo que YA está en la portada. Si el semáforo lo frenó, acá ni
//     se ve, porque portada.json no lo trae.
//   · Política y Policiales no salen solos a las redes. En la web sí, con el
//     semáforo, pero en una red la nota viaja sin contexto y a un vecino lo
//     nombra un titular. Para esas secciones decide una persona.
//   · Una nota se publica una sola vez por red. El libro lo garantiza.
//   · Se espera un rato antes de publicar: el enlace tiene que existir en la
//     web, o Facebook guarda una tarjeta de "página no encontrada".

import { rutaDeNota } from '../web/lib/ruta.js';

/** Secciones que no salen solas a ninguna red: las decide una persona. */
export const SECCIONES_QUE_ESPERAN_PERSONA = ['Policiales', 'Política'];

export const REGLAS_FACEBOOK = {
  // Conservador a propósito (decisión del 21/09): en las últimas 24 horas la web
  // publicó unas 100 notas y publicar todas en Facebook sería ruido: una página
  // nueva con 90 posteos por día pierde alcance y parece un robot. Cinco buenas
  // por día, y más adelante se mezclan con las notas propias y originales.
  porDia: 5,
  relevanciaMinima: 75,
  porCorrida: 1,           // así no salen dos pegadas
  minutosEntrePosteos: 90,
  esperaMinutos: 15,       // que el deploy de la web ya haya terminado
  edadMaximaHoras: 8,      // no se publica lo que ya es viejo
  desdeHora: 8,            // horario de Balcarce
  hastaHora: 22,           // hasta las 22:00 en punto, no hasta las 22:59
  // Un tema, una vez por día. El 24/09 salieron tres posteos de la reapertura
  // del autódromo en cuatro horas: para el que sigue la página es la misma
  // noticia tres veces. Ver temaParecido.
  horasSinRepetirTema: 24,
  seccionesQueEsperanPersona: SECCIONES_QUE_ESPERAN_PERSONA,
};

const ZONA = 'America/Argentina/Buenos_Aires';

/** La hora (0 a 23) en Balcarce. */
export function horaAR(fecha) {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: ZONA }).format(fecha)) % 24;
}

/** Los minutos desde la medianoche en Balcarce (22:00 es 1320). */
export function minutoDelDiaAR(fecha) {
  const partes = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA,
  }).formatToParts(fecha);
  const valor = (tipo) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  return (valor('hour') % 24) * 60 + valor('minute');
}

/** El día en Balcarce como AAAA-MM-DD. */
export function diaAR(fecha) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(fecha);
}

/** El libro vacío. */
export const libroNuevo = () => ({ facebook: {}, instagram: {} });

export function yaPublicada(libro, red, id) {
  return Boolean(libro?.[red]?.[id]);
}

/** Anota una publicación. Devuelve el libro, para poder encadenar. */
export function anotar(libro, red, id, datos, ahora = new Date()) {
  libro[red] ??= {};
  libro[red][id] = { cuando: ahora.toISOString(), ...datos };
  return libro;
}

const minutosDesde = (iso, ahora) => (ahora.getTime() - new Date(iso).getTime()) / 60000;

/** Cuándo salió la nota a la web. Si no lo dice, se usa la fecha de la nota. */
const cuandoSalio = (n) => n.publicadaCuando ?? n.fecha ?? null;

/**
 * Las notas que corresponde publicar ahora en Facebook, en orden.
 * Puede devolver cero, y casi siempre lo hace: es lo normal.
 */
export function elegirParaFacebook({ notas, libro = libroNuevo(), ahora = new Date(), reglas = REGLAS_FACEBOOK }) {
  // Se cuenta en minutos: con la hora sola, "hasta las 22" dejaba pasar todo
  // hasta las 22:59, y el 24/09 salió un posteo a las 22:25.
  const minutos = minutoDelDiaAR(ahora);
  if (minutos < reglas.desdeHora * 60 || minutos > reglas.hastaHora * 60) return [];

  const hoy = diaAR(ahora);
  const previas = Object.values(libro.facebook ?? {});
  const deHoy = previas.filter((p) => diaAR(new Date(p.cuando)) === hoy);
  const cupo = reglas.porDia - deHoy.length;
  if (cupo <= 0) return [];

  const ultima = previas.reduce((max, p) => Math.max(max, new Date(p.cuando).getTime()), 0);
  if (ultima && (ahora.getTime() - ultima) / 60000 < reglas.minutosEntrePosteos) return [];

  // Lo publicado en Facebook en las últimas 24 horas, para no repetir tema.
  // Cada posteo se compara con el titular con el que salió (el libro lo
  // guarda) y, si la nota sigue en la portada, también con el de ahora y con
  // sus temas: la IA reescribe titulares, y el 24/09 "Balcarce se prepara
  // para vivir un fin de semana a fondo" era, por sus temas, el autódromo.
  const porId = new Map(notas.map((n) => [n.id, n]));
  const recientes = Object.entries(libro.facebook ?? {})
    .filter(([, p]) => minutosDesde(p.cuando, ahora) <= (reglas.horasSinRepetirTema ?? 24) * 60)
    .flatMap(([id, p]) => {
      const hoyEnLaWeb = porId.get(id);
      return [{ titulo: p.titulo, temas: p.temas ?? hoyEnLaWeb?.temas ?? [] }, ...(hoyEnLaWeb ? [hoyEnLaWeb] : [])];
    });

  const candidatas = notas.filter((n) => {
    if (yaPublicada(libro, 'facebook', n.id)) return false;
    if ((n.relevancia ?? 0) < reglas.relevanciaMinima) return false;
    if (reglas.seccionesQueEsperanPersona.includes(n.seccion)) return false;
    if (recientes.some((p) => temaParecido(n, p))) return false;
    const salio = cuandoSalio(n);
    if (!salio) return false;
    const edad = minutosDesde(salio, ahora);
    return edad >= reglas.esperaMinutos && edad <= reglas.edadMaximaHoras * 60;
  });

  candidatas.sort((a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0));
  return candidatas.slice(0, Math.min(cupo, reglas.porCorrida));
}

// Palabras de cinco letras o más que no dicen de qué trata una nota: están en
// cualquier titular de acá.
const VACIAS = new Set([
  'balcarce', 'balcarceno', 'balcarcena', 'balcarcenos', 'balcarcenas', 'municipio', 'municipal',
  'municipalidad', 'provincia', 'provincial', 'ciudad', 'partido', 'argentina', 'argentino', 'nacional',
  'gobierno', 'vecinos', 'nuevo', 'nueva', 'nuevos', 'nuevas', 'sobre', 'desde', 'hasta', 'entre',
  'durante', 'luego', 'antes', 'despues', 'cuando', 'donde', 'todos', 'todas', 'tiene', 'tienen',
  'puede', 'pueden', 'hacer', 'parte', 'semana', 'fecha', 'jornada', 'local', 'locales', 'saber',
  'tenes', 'otros', 'otras', 'primer', 'primera', 'segundo', 'segunda', 'grande', 'grandes',
  'sigue', 'siguen', 'vuelve', 'vuelven', 'llega', 'llegan', 'realizo', 'realizara', 'plata', 'aires',
]);

const palabrasDeTitular = (titulo = '') => new Set(
  String(titulo).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 5 && !VACIAS.has(w)),
);

/**
 * ¿Estas dos notas son del mismo tema, para Facebook?
 *
 * Sin nada de afuera, a propósito: sus titulares comparten dos palabras que
 * dicen algo, o una sola si es larga (ocho letras o más: "autodromo",
 * "reapertura", "presupuesto"), o una palabra y además un tema de los que
 * sigue el sitio (TEMAS en ingesta/fuentes.mjs). Se prefiere pasarse de
 * cuidadoso: Facebook publica cinco por día y lo que no sale hoy no se
 * pierde, sigue en la web.
 */
export function temaParecido(a, b) {
  const A = palabrasDeTitular(a?.titulo);
  const compartidas = [...palabrasDeTitular(b?.titulo)].filter((w) => A.has(w));
  if (compartidas.length >= 2 || compartidas.some((w) => w.length >= 8)) return true;
  // Un tema en común solo no alcanza: los temas se marcan también por el
  // cuerpo de la nota, y el fin de semana de la reapertura medio sitio
  // nombraba al autódromo (hasta la visita de una maestra china). Con el
  // tema y una palabra del titular en común, sí: "la reapertura del Fangio"
  // y "Reabre el Autódromo Juan Manuel Fangio" son lo mismo.
  const temasA = new Set(a?.temas ?? []);
  return compartidas.length >= 1 && (b?.temas ?? []).some((t) => temasA.has(t));
}

/** El copete cortado en una palabra entera. */
function recortar(texto = '', maximo = 220) {
  const t = String(texto).replace(/\s+/g, ' ').trim();
  if (t.length <= maximo) return t;
  const corte = t.slice(0, maximo);
  return `${corte.slice(0, corte.lastIndexOf(' ') > 100 ? corte.lastIndexOf(' ') : maximo).replace(/[\s,.;:]+$/, '')}…`;
}

/** La dirección completa de la nota en NUESTRO sitio. */
export function enlaceDeNota(nota, sitio) {
  return `${String(sitio).replace(/\/+$/, '')}${rutaDeNota(nota)}`;
}

/** La tarjeta de la nota para INSTAGRAM (web/lib/tarjeta.js, servida en
 *  /nota/ID/instagram.png): una imagen propia, pública y ya alojada — lo que
 *  pide Instagram para un posteo de foto, sin alojar nada nuevo. Es vertical
 *  (1080x1350, 4:5) con el texto en el centro, porque la grilla del perfil la
 *  recorta. Facebook usa otra: la apaisada del enlace (opengraph-image). */
export function imagenDeNota(nota, sitio) {
  return `${enlaceDeNota(nota, sitio)}/instagram.png`;
}

/**
 * El texto del posteo: titular, copete y el enlace a la nota completa en
 * NUESTRO sitio. La fuente no se nombra en las redes: la atribución y el
 * enlace al original están en la nota de la web. Cuando la redactó la IA,
 * lo dice: la regla de que cada nota diga quién la escribió vale también
 * afuera del sitio.
 */
export function mensajeDeNota(nota, sitio) {
  const partes = [nota.titulo];
  const copete = recortar(nota.copete);
  if (copete) partes.push(copete);
  if (sitio) partes.push(`Leé la nota completa: ${enlaceDeNota(nota, sitio)}`);
  if (nota.publicadaPor === 'ia') partes.push('Resumen hecho con IA');
  return partes.join('\n\n');
}

/** Lo mismo para Instagram. Ahí el enlace no es clickeable, pero se pide que
 *  esté igual: quien lo quiera lo copia, y queda a la vista adónde ir. */
export function mensajeParaInstagram(nota, sitio) {
  return mensajeDeNota(nota, sitio);
}

// ------------------------------------------------- reels, historias y feed
//
// Lo que sale de la PC (reels/plan.mjs) se elige con las mismas reglas de
// fondo que Facebook: nada sensible solo. Está acá, y no en plan.mjs, porque
// plan.mjs necesita resvg y ffmpeg instalados y esto se prueba sin nada.

export const REGLAS_PIEZAS = {
  reelsDeNoticias: 2,      // el tercer reel del día es el podcast
  historiasDeNotas: 3,     // además del clima y la farmacia, que son fijas
  relevanciaParaReel: 78,
  relevanciaParaHistoria: 62,
  relevanciaParaFeed: 80,
  feedPorDia: 2,
};

/** ¿Se puede armar una pieza sola con esta nota? */
export function sePuedeSola(nota) {
  return nota.semaforo !== 'rojo' && !SECCIONES_QUE_ESPERAN_PERSONA.includes(nota.seccion);
}

const porRelevancia = (a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0);

// Palabras que aparecen en media portada y no dicen "es la misma noticia".
const COMUNES = new Set(['balcarce', 'municipio', 'municipal', 'municipalidad', 'provincia', 'ciudad', 'escuela', 'escuelas']);

const palabrasClave = (titulo = '') => new Set(
  String(titulo).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 7 && !COMUNES.has(w)),
);

/** ¿Dos titulares cuentan lo mismo? Los medios locales repiten mucho: el mismo
 *  partido sale con tres titulares distintos y no tiene sentido contarlo tres
 *  veces en el mismo día. Alcanza con que compartan una palabra larga y rara. */
export function mismoTema(a, b) {
  const A = palabrasClave(a?.titulo);
  return [...palabrasClave(b?.titulo)].some((w) => A.has(w));
}

/** Saca de la lista las que repiten un tema ya elegido o ya visto. */
function sinRepetidos(notas, yaVistas = []) {
  const elegidas = [];
  for (const n of notas) {
    if ([...yaVistas, ...elegidas].some((v) => v.id === n.id || mismoTema(v, n))) continue;
    elegidas.push(n);
  }
  return elegidas;
}

/**
 * Los reels de noticias del día: los de más gancho, de secciones distintas.
 *
 * "Gancho" acá es lo que se puede medir sin inventar: relevancia alta y que
 * sea de Balcarce. Y que no se repita la sección, porque dos reels seguidos
 * del mismo tema se comen entre ellos y el que ve el segundo ya se aburrió.
 */
export function elegirReels(notas, reglas = REGLAS_PIEZAS) {
  const elegidas = [];
  const secciones = new Set();
  for (const n of [...notas].filter(sePuedeSola).sort(porRelevancia)) {
    if (elegidas.length >= reglas.reelsDeNoticias) break;
    if (!n.local || (n.relevancia ?? 0) < reglas.relevanciaParaReel) continue;
    if (secciones.has(n.seccion)) continue;
    if (elegidas.some((e) => mismoTema(e, n))) continue;
    secciones.add(n.seccion);
    elegidas.push(n);
  }
  return elegidas;
}

/** Las notas que van como historia, sin repetir las que ya son reel. */
export function elegirHistoriasDeNotas(notas, yaElegidas = [], reglas = REGLAS_PIEZAS) {
  const candidatas = [...notas]
    .filter(sePuedeSola)
    .filter((n) => (n.relevancia ?? 0) >= reglas.relevanciaParaHistoria)
    .sort(porRelevancia);
  return sinRepetidos(candidatas, yaElegidas).slice(0, reglas.historiasDeNotas);
}

/** Los posteos del feed de Instagram. */
export function elegirFeed(notas, reglas = REGLAS_PIEZAS) {
  return [...notas]
    .filter(sePuedeSola)
    .filter((n) => (n.relevancia ?? 0) >= reglas.relevanciaParaFeed)
    .sort(porRelevancia)
    .slice(0, reglas.feedPorDia);
}

/** ¿El texto de esta nota es nuestro (reescrito por la IA o por una persona)?
 *  Sólo de esas se lee el copete en voz alta: en las demás el copete es el
 *  resumen del medio de origen y ahí sólo se dice el titular. */
const esPropia = (n) => Boolean(n.guion) || n.deIA === true;

/** La primera oración del copete, para que el audio no se alargue. */
export function primeraOracion(texto = '', maximo = 150) {
  const t = String(texto).replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const fin = t.search(/[.!?](\s|$)/);
  const oracion = fin > 0 ? t.slice(0, fin + 1) : t;
  return oracion.length <= maximo ? oracion : '';
}

/** Las notas de un podcast: las de más puntaje, de temas distintos, sin
 *  repetir las que ya se contaron en otro podcast del día (`excluir`). Primero
 *  una por sección, para que un podcast no sea tres notas del mismo evento
 *  (el 24/09 salían tres del autódromo); si sobra lugar, se completa por
 *  puntaje. */
export function elegirParaPodcast(notas, { cuantas = 3, excluir = [] } = {}, reglas = REGLAS_PIEZAS) {
  const candidatas = sinRepetidos(
    [...notas]
      .filter(sePuedeSola)
      .filter((n) => (n.relevancia ?? 0) >= reglas.relevanciaParaHistoria)
      .sort(porRelevancia),
    excluir,
  );
  const secciones = new Set();
  const variadas = candidatas.filter((n) => {
    if (secciones.has(n.seccion)) return false;
    secciones.add(n.seccion);
    return true;
  }).slice(0, cuantas);
  const resto = candidatas.filter((n) => !variadas.includes(n));
  return [...variadas, ...resto].slice(0, cuantas).sort(porRelevancia);
}

/**
 * El guion de un podcast: un saludo, cada noticia con su titular y, si el
 * texto es propio, una oración más de contexto, y el cierre. Todo sale de lo
 * ya publicado: no hay nada que la IA pueda inventar acá. La fuente no se
 * nombra nunca. Con menos de dos noticias no es un repaso: devuelve null.
 */
export function guionRepaso(elegidas, { saludo, cierre = 'Todas las notas, en radar balcarce punto com.' }) {
  if (elegidas.length < 2) return null;
  const marca = (i) => (i === elegidas.length - 1 ? 'Y para cerrar' : ['Primero', 'Después', 'Además'][i]);
  const cuerpo = elegidas.map((n, i) => {
    const titular = String(n.titulo).replace(/\s+/g, ' ').trim().replace(/[.:]+$/, '');
    const detalle = esPropia(n) ? primeraOracion(n.copete) : '';
    return `${marca(i)}: ${titular}.${detalle ? ` ${detalle}` : ''}`;
  }).join(' ');
  return `${saludo} ${cuerpo} ${cierre}`;
}

/**
 * El podcast de la noche: el repaso de lo más importante del día, dicho por
 * la voz de siempre.
 */
export function guionPodcast(notas, { cuantas = 4, fecha = new Date() } = {}) {
  const dia = new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: ZONA }).format(fecha);
  const elegidas = elegirParaPodcast(notas, { cuantas }, { ...REGLAS_PIEZAS, relevanciaParaHistoria: 0 });
  return guionRepaso(elegidas, { saludo: `Buenas, Balcarce. Este es el repaso de este ${dia}.` });
}

/** ¿Está prendido el interruptor de publicar? Acepta "si", "Si", "SÍ", "sí"…
 *  Se descubrió el 21/09: la variable se creó como "Si" y una comparación
 *  exacta la dejaba apagada sin avisar. */
export function estaActivo(valor) {
  return String(valor ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') === 'si';
}

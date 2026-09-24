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
  hastaHora: 22,
  seccionesQueEsperanPersona: SECCIONES_QUE_ESPERAN_PERSONA,
};

const ZONA = 'America/Argentina/Buenos_Aires';

/** La hora (0 a 23) en Balcarce. */
export function horaAR(fecha) {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: ZONA }).format(fecha)) % 24;
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
  const hora = horaAR(ahora);
  if (hora < reglas.desdeHora || hora > reglas.hastaHora) return [];

  const hoy = diaAR(ahora);
  const previas = Object.values(libro.facebook ?? {});
  const deHoy = previas.filter((p) => diaAR(new Date(p.cuando)) === hoy);
  const cupo = reglas.porDia - deHoy.length;
  if (cupo <= 0) return [];

  const ultima = previas.reduce((max, p) => Math.max(max, new Date(p.cuando).getTime()), 0);
  if (ultima && (ahora.getTime() - ultima) / 60000 < reglas.minutosEntrePosteos) return [];

  const candidatas = notas.filter((n) => {
    if (yaPublicada(libro, 'facebook', n.id)) return false;
    if ((n.relevancia ?? 0) < reglas.relevanciaMinima) return false;
    if (reglas.seccionesQueEsperanPersona.includes(n.seccion)) return false;
    const salio = cuandoSalio(n);
    if (!salio) return false;
    const edad = minutosDesde(salio, ahora);
    return edad >= reglas.esperaMinutos && edad <= reglas.edadMaximaHoras * 60;
  });

  candidatas.sort((a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0));
  return candidatas.slice(0, Math.min(cupo, reglas.porCorrida));
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

/** La tarjeta que ya se genera para compartir por WhatsApp (web/lib/tarjeta.js,
 *  servida en /nota/ID/opengraph-image): es una imagen propia, pública y ya
 *  alojada — exactamente lo que pide Instagram para un posteo de foto, sin
 *  tener que alojar nada nuevo. */
export function imagenDeNota(nota, sitio) {
  return `${enlaceDeNota(nota, sitio)}/opengraph-image`;
}

/**
 * El texto del posteo. Dice de dónde sale la información y, cuando la
 * redactó la IA, que fue la IA: es la regla de que cada nota diga quién la
 * escribió, y vale también afuera del sitio.
 */
export function mensajeDeNota(nota) {
  const partes = [nota.titulo];
  const copete = recortar(nota.copete);
  if (copete) partes.push(copete);

  const fuente = (nota.medios ?? []).join(', ');
  const linea = [fuente ? `Fuente: ${fuente}` : null, nota.publicadaPor === 'ia' ? 'Resumen hecho con IA' : null]
    .filter(Boolean).join(' · ');
  if (linea) partes.push(linea);

  return partes.join('\n\n');
}

/** Lo mismo que se posteó en Facebook, para Instagram: el enlace de arriba
 *  no es clickeable en un posteo de Instagram, así que se lo nombra en
 *  texto en vez de pegarlo. */
export function mensajeParaInstagram(nota) {
  return `${mensajeDeNota(nota)}\n\nMás en radarbalcarce.com`;
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

/**
 * La segunda noticia de un reel-podcast corto: de otro tema, y sin repetir la
 * que ya se usó en otro reel del día (para eso está `excluir`). Si no queda
 * ninguna, la principal sale sola, como antes.
 */
export function elegirSecundariaDeReel(principal, notas, excluir = [], reglas = REGLAS_PIEZAS) {
  const candidatas = [...notas]
    .filter(sePuedeSola)
    .filter((n) => n.id !== principal.id)
    .filter((n) => (n.relevancia ?? 0) >= reglas.relevanciaParaHistoria)
    .sort(porRelevancia);
  return sinRepetidos(candidatas, [principal, ...excluir])[0] ?? null;
}

/**
 * El guion de un reel de noticias del mediodía: ya no cuenta un solo
 * titular, sino dos — la principal, la que se ve en la placa, y una segunda
 * de otro tema, a modo de racconto corto. Mismo espíritu que el repaso del
 * podcast de la noche, pero pensado para un reel de 45 a 75 segundos, no
 * para el resumen completo del día.
 */
export function guionMiniPodcast(principal, secundaria) {
  const t1 = String(principal.titulo).replace(/\s+/g, ' ').trim().replace(/[.:]+$/, '');
  if (!secundaria) return `${t1}.`; // no hay con qué acompañarla: sale sola
  const t2 = String(secundaria.titulo).replace(/\s+/g, ' ').trim().replace(/[.:]+$/, '');
  return `${t1}. Además, ${t2.charAt(0).toLowerCase()}${t2.slice(1)}.`;
}

/**
 * El guion del podcast del día: un repaso de lo más importante, dicho por la
 * voz de siempre. Sólo usa los titulares que ya están publicados, no agrega ni
 * un dato: no hay nada que la IA pueda inventar porque la IA no participa.
 */
export function guionPodcast(notas, { cuantas = 4, fecha = new Date() } = {}) {
  const dia = new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: ZONA }).format(fecha);
  const elegidas = sinRepetidos([...notas].filter(sePuedeSola).sort(porRelevancia)).slice(0, cuantas);
  if (elegidas.length < 2) return null; // un repaso de una sola noticia no es un repaso

  const titulares = elegidas.map((n) => String(n.titulo).replace(/\s+/g, ' ').trim().replace(/[.:]+$/, ''));
  const marca = (i) => (i === titulares.length - 1 ? 'Y para cerrar' : ['Primero', 'Después', 'Además'][i]);
  const cuerpo = titulares.map((t, i) => `${marca(i)}: ${t}.`).join(' ');

  return `Buenas, Balcarce. Este es el repaso de este ${dia}. ${cuerpo} `
    + 'Todas las notas, con la fuente, en radar balcarce punto com.';
}

/** ¿Está prendido el interruptor de publicar? Acepta "si", "Si", "SÍ", "sí"…
 *  Se descubrió el 21/09: la variable se creó como "Si" y una comparación
 *  exacta la dejaba apagada sin avisar. */
export function estaActivo(valor) {
  return String(valor ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') === 'si';
}

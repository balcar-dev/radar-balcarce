// Agenda de eventos de Balcarce.
//
// Dos fuentes, de naturaleza distinta:
//
// 1. LA API DEL MUNICIPIO. balcarce.gob.ar corre "The Events Calendar" de
//    WordPress y expone una API REST de verdad (no hay que scrapear nada):
//      https://balcarce.gob.ar/wp-json/tribe/events/v1/events
//    Trae título, fecha exacta, lugar, dirección, precio e imagen. El problema
//    es que sólo carga lo que alguien tipeó esta semana: hoy son 8 eventos,
//    nunca vas a encontrar ahí la Fiesta del Automovilismo de febrero en
//    septiembre. Es la fuente para "qué hay esta semana", no para "qué pasa
//    en el año".
//
// 2. EL CALENDARIO ANUAL. Investigado a mano: las fiestas y competencias que
//    se repiten todos los años en Balcarce, con el mes en que salieron el año
//    pasado. Las fechas exactas cambian de un año a otro (la Fiesta del
//    Automovilismo fue 6-9 de febrero en 2025), así que esto NUNCA se muestra
//    como fecha confirmada: es un recordatorio de "esto vuelve por esta época,
//    confirmá la fecha real cuando se acerque".

import fs from 'node:fs';
import { traer, semaforoDelTexto } from './ingesta.mjs';
import { fechaEnBalcarce } from './utiles.mjs';

const API = 'https://balcarce.gob.ar/wp-json/tribe/events/v1/events';

// Categorías pedidas: oficiales del municipio, el cerro (que en Balcarce es
// su propio polo de eventos deportivos y culturales), deportes de ciclismo,
// running/pedestrismo, y ferias/fiestas de pueblo. Se afinan con el uso.
export const CATEGORIAS = {
  oficial: 'Actos y agenda cultural del municipio',
  cerro: 'Eventos en el Cerro "El Triunfo"',
  ciclismo: 'Mountain bike y ciclismo',
  running: 'Running, maratones y trail',
  automovilismo: 'Automovilismo y motor',
  feria: 'Ferias, exposiciones y fiestas populares',
  agro: 'Agro y rural',
};

// El calendario anual: lo que vuelve todos los años. `mesAproximado` es
// 1-12; `diaAprox` cuando se conoce el patrón (ej. "primer sábado"). Todo
// entra con `confirmado: false` — es una expectativa, no un dato de hoy.
//
// `clave` es cómo se reconoce la fiesta en un evento con fecha confirmada
// (el del municipio o el que se carga en el panel): cuando aparece, la web
// enlaza a su página en vez de decir sólo el mes (web/lib/eventos.js). Sin
// tildes y en minúsculas.
export const CALENDARIO_ANUAL = [
  {
    id: 'automovilismo-nacional',
    clave: 'fiesta nacional del automovilismo',
    nombre: 'Fiesta Nacional del Automovilismo',
    categoria: 'automovilismo',
    mesAproximado: 2,
    ultimaEdicion: { anio: 2025, desde: '2025-02-06', hasta: '2025-02-09', edicion: 32 },
    lugar: 'Autódromo Juan Manuel Fangio y Plaza Libertad',
    nota: 'La más grande del año. Organizan el municipio, la Fundación Fangio, la Cámara de Comercio y el Auto Club Balcarce.',
  },
  {
    id: 'mountain-bike-cerro',
    clave: 'mountain bike',
    nombre: 'Fechas de Mountain Bike en el Cerro El Triunfo',
    categoria: 'ciclismo',
    mesAproximado: 4, // suele tener rondas entre abril y octubre
    ultimaEdicion: { anio: 2026, desde: '2026-04-26', edicion: null },
    lugar: 'Cerro "El Triunfo"',
    nota: 'No es una fiesta única sino varias fechas del campeonato bonaerense durante el año. Circuito de ~4.000 m con desnivel técnico.',
  },
  {
    id: 'educo-agro',
    clave: 'educo agro',
    nombre: 'Educo Agro',
    categoria: 'agro',
    mesAproximado: 9,
    ultimaEdicion: { anio: 2025, desde: '2025-09-06', hasta: '2025-09-08', edicion: null },
    lugar: 'Predio ferial',
    nota: 'Exposición agropecuaria y educativa organizada con el Colegio San José.',
  },
  {
    id: 'fiesta-postre',
    clave: 'fiesta nacional del postre',
    nombre: 'Fiesta Nacional del Postre',
    categoria: 'feria',
    mesAproximado: 7, // en 2025 fue julio; el municipio ya cargó la edición 2026 para octubre
    ultimaEdicion: { anio: 2025, desde: '2025-07-18', hasta: '2025-07-20', edicion: 21 },
    lugar: 'Sociedad Rural de Balcarce',
    nota: 'OJO: la edición 2026 quedó confirmada por la API del municipio para el 9-12 de octubre, no julio. La fecha se mueve de año a año: no asumir el mes anterior sin chequear.',
  },
  {
    id: 'fiesta-papa-frita',
    clave: 'papa frita',
    nombre: 'Fiesta de la Papa Frita',
    categoria: 'feria',
    mesAproximado: 10,
    ultimaEdicion: { anio: 2026, desde: '2026-10-07', hasta: '2026-10-08', edicion: 1 },
    lugar: 'Anfiteatro del Cerro El Triunfo',
    nota: 'Primera edición en 2026. Si funciona, es candidata a repetirse: revisar si vuelve en 2027.',
  },
  {
    id: 'balcarce-corre',
    clave: 'balcarce corre',
    nombre: 'Balcarce Corre',
    categoria: 'running',
    mesAproximado: 12,
    ultimaEdicion: { anio: 2025, desde: '2025-12-07', edicion: null },
    lugar: 'A confirmar cada año',
    nota: '10K y 5K recreativo (se puede correr-caminar). Organiza Grupo Hets.',
  },
  {
    id: 'media-maraton',
    clave: 'media maraton',
    nombre: 'Media Maratón de Balcarce',
    categoria: 'running',
    mesAproximado: 8,
    ultimaEdicion: { anio: 2026, desde: '2026-08-16', edicion: null },
    lugar: 'Salón "Dr. Victorio Tommasi"',
    nota: '21K, 10K y 5K. Larga hasta el momento sólo vista en 2026: confirmar si es primera edición o ya venía de antes.',
  },
  {
    id: 'tierras-del-diablo',
    clave: 'tierras del diablo',
    nombre: 'Tierras del Diablo (trail)',
    categoria: 'running',
    mesAproximado: 10,
    ultimaEdicion: { anio: 2026, desde: '2026-10-11', edicion: null },
    lugar: 'Cerro "El Triunfo"',
    nota: 'Trail de montaña con distancias de 10, 21, 42, 70 y 100 km. Ya aparece en la API del municipio.',
  },
];

// Quién organiza qué, para cuando hay que preguntar directamente en vez de
// esperar a que alguien lo suba a una web. Desde el 25/09 es una base aparte,
// ingesta/contactos-agenda.json: instituciones de Balcarce que organizan
// eventos, cada una con los canales que ELLA MISMA publica (teléfono, mail,
// WhatsApp, redes), de dónde salió cada dato y cuándo se verificó. El repo es
// público: nunca un celular personal que no esté publicado como contacto de
// la institución. No se mezcla con comercial/: aquello son comercios, para
// vender publicidad; esto son organizadores, para pedir fechas.
//
// Cuándo se les escribió y si respondieron lo lleva el panel (panel/datos/,
// que no va a GitHub), no este archivo.
const F_CONTACTOS = new URL('./contactos-agenda.json', import.meta.url);

/** Los canales que puede tener un contacto, en el orden en que se muestran. */
export const CANALES = ['whatsapp', 'telefono', 'mail', 'instagram', 'facebook', 'web'];

function leerContactos() {
  try {
    const datos = JSON.parse(fs.readFileSync(F_CONTACTOS, 'utf8'));
    return (datos.contactos ?? []).map((c) => ({
      ...c,
      meses: c.meses ?? [],
      canales: c.canales ?? {},
      // `para` es el nombre viejo de `organiza`: lo sigue usando el panel.
      para: c.organiza ?? c.para ?? '',
    }));
  } catch (e) {
    console.error('  no se pudo leer ingesta/contactos-agenda.json:', e.message);
    return [];
  }
}

export const CONTACTOS = leerContactos();

// El mensaje formal para pedir la agenda una vez por mes. Se manda por
// WhatsApp a cada contacto de CONTACTOS, con el nombre reemplazado. Corto,
// dice quiénes somos, qué pedimos y qué ofrecemos a cambio (difusión) — así
// no es sólo un pedido, es un intercambio que les conviene aceptar.
export function mensajeAgenda({ quien = '', firma = 'Radar Balcarce' } = {}) {
  return `Hola${quien ? `, ${quien}` : ''}! Te escribimos de ${firma}, un medio digital de noticias de Balcarce.

Estamos armando la agenda de eventos del mes y nos gustaría sumar los suyos, con fecha, lugar y lo que haga falta. Si nos pasan lo que tengan confirmado (o por confirmarse) para las próximas semanas, lo publicamos en nuestra web y en nuestras redes, con link a ustedes.

¿Nos pueden pasar lo que tengan? Gracias, y cualquier novedad nos pueden escribir por acá cuando quieran.

— ${firma}`;
}

const ENTIDADES = {
  '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>',
  '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú', '&ntilde;': 'ñ',
  '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú', '&Ntilde;': 'Ñ',
  '&ldquo;': '“', '&rdquo;': '”', '&lsquo;': '‘', '&rsquo;': '’', '&hellip;': '…', '&ndash;': '–', '&mdash;': '—',
  '&iexcl;': '¡', '&iquest;': '¿', '&deg;': '°', '&ordm;': 'º', '&ordf;': 'ª',
};

/** Las entidades de HTML ("&#8211;", "&amp;") a letras. */
export function sinEntidades(texto = '') {
  return String(texto ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-zA-Z]+;/g, (e) => ENTIDADES[e] ?? ' ');
}

/** Cuánto de la descripción de la fuente se muestra. Lo demás, en la fuente. */
export const MAXIMO_DESCRIPCION = 1500;

/**
 * La descripción de un evento, de HTML a texto: un párrafo por línea, sin
 * etiquetas, sin el "Acerca del Evento" que pone la plantilla del municipio,
 * sin líneas repetidas. Se corta al final de una oración. null si no queda
 * nada que valga la pena.
 */
export function textoDeDescripcion(html, maximo = MAXIMO_DESCRIPCION) {
  const lineas = sinEntidades(String(html ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|li|div|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, ' '))
    .split('\n')
    .map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter((l) => l && l !== '•' && !/^acerca del evento$/i.test(l));
  const unicas = lineas.filter((l, i) => lineas.indexOf(l) === i);
  let texto = unicas.join('\n');
  if (texto.length < 20) return null;
  if (texto.length > maximo) {
    const corte = texto.slice(0, maximo);
    const fin = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('.\n'), corte.lastIndexOf('\n'));
    texto = `${corte.slice(0, fin > maximo * 0.5 ? fin + 1 : maximo).trim()} […]`;
  }
  return texto;
}

/** Un evento de la API del municipio, en nuestra forma. Aparte para poder
 *  probarlo sin llamar a la API de verdad.
 *
 *  Del organizador se guarda el nombre y su página, nunca su teléfono ni su
 *  mail: pueden ser de una persona, y esto termina en un archivo público. La
 *  imagen se guarda para el panel, pero la web no la muestra (es el afiche de
 *  otro: la misma regla que las fotos de los medios). */
export function eventoDeMunicipio(e) {
  const organizador = (e.organizer ?? [])[0];
  return {
    id: `muni-${e.id}`,
    nombre: sinEntidades(e.title ?? '').replace(/\s+/g, ' ').trim(),
    desde: e.start_date,
    hasta: e.end_date,
    todoElDia: !!e.all_day,
    lugar: e.venue?.venue ? sinEntidades(e.venue.venue).trim() : null,
    direccion: e.venue?.address ? sinEntidades(e.venue.address).trim() : null,
    localidad: e.venue?.city ? sinEntidades(e.venue.city).trim() : null,
    costo: e.cost ? sinEntidades(e.cost).trim() : null,
    organizador: organizador?.organizer ? sinEntidades(organizador.organizer).trim() : null,
    organizadorUrl: /^https?:\/\//.test(organizador?.website ?? '') ? organizador.website : null,
    web: /^https?:\/\//.test(e.website ?? '') ? e.website : null,
    descripcion: textoDeDescripcion(e.description),
    imagen: e.image?.url || null,
    url: e.url,
    categorias: (e.categories ?? []).map((c) => c.name),
    fuente: 'Municipalidad de Balcarce',
    confirmado: true,
  };
}

/**
 * El semáforo también mira la agenda: nunca identificar a un menor ni a una
 * víctima (leyes 26.061 y 26.485), tampoco en un evento. Si el nombre da
 * rojo, el evento no sale; si lo que da rojo es la descripción, sale sin
 * descripción, sólo con los datos. El amarillo no frena: un evento no acusa
 * a nadie, y "para menores de 12" es una agenda cualquiera.
 */
export function eventoSinSensibles(e) {
  if (semaforoDelTexto(e.nombre)?.color === 'rojo') return null;
  if (e.descripcion && semaforoDelTexto(e.descripcion)?.color === 'rojo') return { ...e, descripcion: null };
  return e;
}

/** Trae lo que el municipio tiene cargado ahora mismo, con paginación. */
export async function eventosDelMunicipio({ hasta = 60 } = {}) {
  const j = JSON.parse(await traer(`${API}?per_page=${hasta}`));
  return (j.events ?? []).map(eventoDeMunicipio).map(eventoSinSensibles).filter(Boolean);
}

/**
 * Cuántos meses faltan de `desde` a `hasta`, mirando siempre hacia adelante
 * (nunca da negativo): de noviembre a diciembre es 1, y de diciembre a enero
 * también es 1, no 11. Aparte para poder probar el cruce de año con números
 * simples, sin depender de qué haya en el calendario ese mes.
 */
export function mesesHastaQueLlegue(desde, hasta) {
  return (((hasta - desde) % 12) + 12) % 12;
}

/** Los eventos anuales cuyo mes aproximado cae este mes o el que viene, para
 *  avisar con antelación. Aparte para poder probarla con una fecha fija. */
export function anualesQueSeAcercan(ahora = new Date()) {
  // El mes de Balcarce, no el del servidor: en GitHub (UTC), el último día
  // del mes a las 21 ya era el mes siguiente.
  const mesActual = fechaEnBalcarce(ahora).mes;
  return CALENDARIO_ANUAL
    .filter((ev) => mesesHastaQueLlegue(mesActual, ev.mesAproximado) <= 1)
    .map((ev) => ({ ...ev, confirmado: false }));
}

/**
 * La agenda completa: lo confirmado por el municipio para las próximas
 * semanas, más un recordatorio de qué fiesta anual cae cerca (por mes), sin
 * inventarle una fecha exacta.
 */
export async function agendaCompleta(ahora = new Date()) {
  // `municipioOk` distingue "la API no tiene nada" de "la API no contestó":
  // con la API caída no hay que dar por retirado lo que ya estaba publicado.
  let municipioOk = true;
  const municipio = await eventosDelMunicipio().catch(() => { municipioOk = false; return []; });
  // "Cerca" = mismo mes o el próximo, para dar aviso con antelación.
  const proximosAnuales = anualesQueSeAcercan(ahora);
  return {
    municipio, municipioOk, proximosAnuales, generado: ahora.toISOString(),
  };
}

if (process.argv[1] && process.argv[1].endsWith('agenda.mjs')) {
  const { municipio, proximosAnuales } = await agendaCompleta();
  console.log(`\n\x1b[1mAGENDA DE BALCARCE\x1b[0m\n`);
  console.log(`\x1b[1mCargados por el municipio (${municipio.length})\x1b[0m`);
  municipio.forEach((e) => {
    console.log(`  ${e.desde.slice(0, 10)}  ${e.nombre.slice(0, 55).padEnd(55)} ${e.lugar ?? ''}`);
  });
  if (proximosAnuales.length) {
    console.log(`\n\x1b[33mSe acercan estas fechas anuales (verificar antes de publicar)\x1b[0m`);
    proximosAnuales.forEach((e) => {
      console.log(`  ~mes ${e.mesAproximado}  ${e.nombre} · última vez: ${e.ultimaEdicion.desde}`);
    });
  }
  console.log('');
}

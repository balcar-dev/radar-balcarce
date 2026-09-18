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

import { traer } from './ingesta.mjs';

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
export const CALENDARIO_ANUAL = [
  {
    id: 'automovilismo-nacional',
    nombre: 'Fiesta Nacional del Automovilismo',
    categoria: 'automovilismo',
    mesAproximado: 2,
    ultimaEdicion: { anio: 2025, desde: '2025-02-06', hasta: '2025-02-09', edicion: 32 },
    lugar: 'Autódromo Juan Manuel Fangio y Plaza Libertad',
    nota: 'La más grande del año. Organizan el municipio, la Fundación Fangio, la Cámara de Comercio y el Auto Club Balcarce.',
  },
  {
    id: 'mountain-bike-cerro',
    nombre: 'Fechas de Mountain Bike en el Cerro El Triunfo',
    categoria: 'ciclismo',
    mesAproximado: 4, // suele tener rondas entre abril y octubre
    ultimaEdicion: { anio: 2026, desde: '2026-04-26', edicion: null },
    lugar: 'Cerro "El Triunfo"',
    nota: 'No es una fiesta única sino varias fechas del campeonato bonaerense durante el año. Circuito de ~4.000 m con desnivel técnico.',
  },
  {
    id: 'educo-agro',
    nombre: 'Educo Agro',
    categoria: 'agro',
    mesAproximado: 9,
    ultimaEdicion: { anio: 2025, desde: '2025-09-06', hasta: '2025-09-08', edicion: null },
    lugar: 'Predio ferial',
    nota: 'Exposición agropecuaria y educativa organizada con el Colegio San José.',
  },
  {
    id: 'fiesta-postre',
    nombre: 'Fiesta Nacional del Postre',
    categoria: 'feria',
    mesAproximado: 7, // en 2025 fue julio; el municipio ya cargó la edición 2026 para octubre
    ultimaEdicion: { anio: 2025, desde: '2025-07-18', hasta: '2025-07-20', edicion: 21 },
    lugar: 'Sociedad Rural de Balcarce',
    nota: 'OJO: la edición 2026 quedó confirmada por la API del municipio para el 9-12 de octubre, no julio. La fecha se mueve de año a año: no asumir el mes anterior sin chequear.',
  },
  {
    id: 'fiesta-papa-frita',
    nombre: 'Fiesta de la Papa Frita',
    categoria: 'feria',
    mesAproximado: 10,
    ultimaEdicion: { anio: 2026, desde: '2026-10-07', hasta: '2026-10-08', edicion: 1 },
    lugar: 'Anfiteatro del Cerro El Triunfo',
    nota: 'Primera edición en 2026. Si funciona, es candidata a repetirse: revisar si vuelve en 2027.',
  },
  {
    id: 'balcarce-corre',
    nombre: 'Balcarce Corre',
    categoria: 'running',
    mesAproximado: 12,
    ultimaEdicion: { anio: 2025, desde: '2025-12-07', edicion: null },
    lugar: 'A confirmar cada año',
    nota: '10K y 5K recreativo (se puede correr-caminar). Organiza Grupo Hets.',
  },
  {
    id: 'media-maraton',
    nombre: 'Media Maratón de Balcarce',
    categoria: 'running',
    mesAproximado: 8,
    ultimaEdicion: { anio: 2026, desde: '2026-08-16', edicion: null },
    lugar: 'Salón "Dr. Victorio Tommasi"',
    nota: '21K, 10K y 5K. Larga hasta el momento sólo vista en 2026: confirmar si es primera edición o ya venía de antes.',
  },
  {
    id: 'tierras-del-diablo',
    nombre: 'Tierras del Diablo (trail)',
    categoria: 'running',
    mesAproximado: 10,
    ultimaEdicion: { anio: 2026, desde: '2026-10-11', edicion: null },
    lugar: 'Cerro "El Triunfo"',
    nota: 'Trail de montaña con distancias de 10, 21, 42, 70 y 100 km. Ya aparece en la API del municipio.',
  },
];

// Quién organiza qué, para cuando hay que preguntar directamente en vez de
// esperar a que alguien lo suba a una web. Investigado el 18/09/2026: son
// los organizadores reales de los eventos grandes del calendario anual, no
// números genéricos del municipio.
export const CONTACTOS = [
  {
    id: 'deportes-municipio',
    quien: 'Subsecretaría de Deportes y Recreación (municipio)',
    para: 'Running, ciclismo, eventos deportivos en general',
    telefono: '(02266) 43-1218 / 43-1704',
    nota: 'Av. Suipacha 931. Lunes a viernes de 7 a 13. Es el primer lugar para preguntar por cualquier prueba deportiva que se venga.',
  },
  {
    id: 'perfil-extremo',
    quien: 'Perfil Extremo (organiza el Mountain Bike del Cerro)',
    para: 'Ciclismo / Cerro El Triunfo',
    telefono: 'Gastón +54 9 249-460-2248 · Lalo +54 9 249-464-1547',
    nota: 'Empresa de Tandil, no de Balcarce. contacto@perfilextremo.com',
  },
  {
    id: 'grupo-hets',
    quien: 'Grupo Hets (organiza Balcarce Corre y Tierras del Diablo)',
    para: 'Running / trail',
    telefono: '(02266) 47-5024',
    nota: 'grupohets@gmail.com · grupohets.org. Con sede en Balcarce, son los mismos para varias carreras del año.',
  },
  {
    id: 'turismo-municipio',
    quien: 'Subsecretaría de Turismo (municipio)',
    para: 'Ferias, fiestas populares, agenda cultural amplia',
    telefono: '(02266) 42-2394 (centro) / 43-0895 (el cruce)',
    nota: 'También en @turismobalcarce (Instagram, 25 mil seguidores) con WhatsApp propio en su Linktree.',
  },
];

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

/** Trae lo que el municipio tiene cargado ahora mismo, con paginación. */
export async function eventosDelMunicipio({ hasta = 60 } = {}) {
  const j = JSON.parse(await traer(`${API}?per_page=${hasta}`));
  return (j.events ?? []).map((e) => ({
    id: `muni-${e.id}`,
    nombre: e.title.replace(/&#8211;/g, '–').trim(),
    desde: e.start_date,
    hasta: e.end_date,
    lugar: e.venue?.venue || null,
    direccion: e.venue?.address || null,
    costo: e.cost || null,
    imagen: e.image?.url || null,
    url: e.url,
    categorias: (e.categories ?? []).map((c) => c.name),
    fuente: 'Municipalidad de Balcarce',
    confirmado: true,
  }));
}

/**
 * La agenda completa: lo confirmado por el municipio para las próximas
 * semanas, más un recordatorio de qué fiesta anual cae cerca (por mes), sin
 * inventarle una fecha exacta.
 */
export async function agendaCompleta() {
  const municipio = await eventosDelMunicipio().catch(() => []);
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;

  // "Cerca" = mismo mes o el próximo, para dar aviso con antelación.
  const proximosAnuales = CALENDARIO_ANUAL.filter((ev) => {
    const dist = ((ev.mesAproximado - mesActual) + 12) % 12;
    return dist <= 1;
  }).map((ev) => ({ ...ev, confirmado: false }));

  return { municipio, proximosAnuales, generado: hoy.toISOString() };
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

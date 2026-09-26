// Lo que dice la locutora en cada pieza, con su libro de recursos.
//
// El criterio está en CRITERIO-REDES.md (fichas por pieza, libro de recursos, reglas
// de toda pieza). Acá está el libro de recursos hecho código: bancos de saludos,
// aperturas, conectores, comentarios del clima y cierres, y el elegidor.
//
// VARIEDAD DETERMINÍSTICA: cada frase se elige con una semilla = FECHA (en Balcarce)
// + PIEZA + el lugar de la frase. Mismo día y misma pieza dan siempre el mismo
// texto (se puede reproducir y probar); días distintos dan textos distintos.
//
// Sin dependencias de afuera de Node: lo usan reels/plan.mjs (que importa el
// panel) y redes/elegir.mjs. Son funciones puras de texto.

import { VOZ, CLIMA_VOZ, PODCAST_VOZ, PIEZA_FIJA_VOZ } from '../ingesta/criterio.mjs';
import { MEDIO, SITIO_DICHO } from './prompt-redes.mjs';

const ZONA = 'America/Argentina/Buenos_Aires';

// --- la semilla ------------------------------------------------------------

/** El día en Balcarce como AAAA-MM-DD. */
export const diaDe = (fecha = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(fecha);

/** El día de la semana en Balcarce ("lunes", "viernes"…). */
export const diaDeLaSemana = (fecha = new Date()) => new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: ZONA }).format(fecha);

/** FNV-1a de 32 bits: barato, estable y sin dependencias. */
export function hash(texto) {
  let h = 2166136261;
  for (const c of String(texto)) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** La semilla de una pieza en un día. */
export const semillaDe = (pieza, fecha = new Date()) => `${diaDe(fecha)}|${pieza}`;

/** Elige una entrada del banco para un lugar (`ranura`) de la pieza. */
export const variante = (banco, semilla, ranura) => banco[hash(`${semilla}|${ranura}`) % banco.length];

/** Elige `n` entradas seguidas y distintas del banco (para los conectores del medio). */
export function variantes(banco, semilla, ranura, n) {
  const inicio = hash(`${semilla}|${ranura}`) % banco.length;
  return Array.from({ length: Math.min(n, banco.length) }, (_, i) => banco[(inicio + i) % banco.length]);
}

/** ¿Esta pieza dice hoy la dirección en voz alta? Los podcasts, siempre (si el
 *  criterio lo dice); el clima, la farmacia y los semanales, 1 de cada N días. */
export function diceLaDireccion(semilla, { podcast = false, forzar } = {}) {
  if (forzar !== undefined && forzar !== null) return Boolean(forzar);
  if (podcast) return VOZ.direccionEnPodcasts === 1;
  const cada = VOZ.direccionUnaDeCada;
  return cada > 0 && hash(`${semilla}|direccion`) % cada === 0;
}

/** Cuántos segundos tarda la locutora en decir un texto. */
export const segundosDe = (texto) => String(texto).trim().split(/\s+/).filter(Boolean).length / VOZ.palabrasPorSegundo;

export { CLIMA_VOZ, PODCAST_VOZ, PIEZA_FIJA_VOZ };

// --- saludos y cierres por horario -----------------------------------------

/** Saludo por horario. Sólo de mañana se dice "buen día". */
export const SALUDOS = {
  manana: [
    'Buen día, Balcarce.',
    'Muy buen día, Balcarce.',
    'Buen día, Balcarce, vamos con lo que hay.',
    'Buen día, Balcarce, ¿cómo arrancó la mañana?',
  ],
  tarde: [
    'Buenas tardes, Balcarce.',
    'Muy buenas tardes, Balcarce.',
    'Buenas tardes, Balcarce, ¿cómo va el día?',
    'Buenas tardes, Balcarce, seguimos.',
  ],
  noche: [
    'Buenas noches, Balcarce.',
    'Muy buenas noches, Balcarce.',
    'Buenas noches, Balcarce, ¿cómo estuvo el día?',
    'Buenas noches, Balcarce, ¿cómo estuvo la jornada?',
  ],
};

/** El deseo humano con el que cierra cada franja del día. */
export const CIERRES_HUMANOS = {
  manana: [
    'Que tengan un buen día.',
    'Que sea un buen día para todos.',
    'Que tengan una linda jornada.',
    'Que el día les sea leve.',
  ],
  tarde: [
    'Que sigan bien la tarde.',
    'Que tengan una linda tarde.',
    'Que la tarde les rinda.',
    'Que se les haga liviana la tarde.',
  ],
  noche: [
    'Que descansen.',
    'Que descansen, y hasta mañana.',
    'Que tengan una buena noche.',
    'A descansar, que mañana seguimos.',
  ],
};

const FIRMAS_SIN_DIRECCION = [
  'Radar Balcarce.',
  'Te lo contó Radar Balcarce.',
  'Seguimos en Radar Balcarce.',
  'Esto fue Radar Balcarce.',
];

export const firmasConDireccion = (D, tipo) => (tipo === 'podcast'
  ? [`Las notas completas, en ${D}.`, `Todo con más detalle en ${D}.`, `Seguimos en ${D}.`, `Todo lo demás lo encontrás en ${D}.`]
  : [`Más información en ${D}.`, `Seguimos en ${D}.`, `Todo lo demás, en ${D}.`, `Te esperamos en ${D}.`]);

/** La firma: "Radar Balcarce." o, cuando toca, la dirección dicha ("… Radar
 *  Balcarce punto com."). Nunca otra cosa. */
export function firma(semilla, { conDireccion = false, tipo = 'general' } = {}) {
  return conDireccion
    ? variante(firmasConDireccion(SITIO_DICHO, tipo), semilla, 'firma')
    : variante(FIRMAS_SIN_DIRECCION, semilla, 'firma');
}

const cierre = (semilla, momento, opciones) => `${variante(CIERRES_HUMANOS[momento], semilla, 'cierre')} ${firma(semilla, opciones)}`;

const unir = (partes) => partes.filter(Boolean).join(' ');

/** El cronograma del Colegio viene todo en mayúsculas y así el sintetizador
 *  tiende a deletrear o a gritar: lo pasamos a nombre propio antes de leerlo. */
export const comoNombre = (s) => String(s).toLowerCase()
  .replace(/(^|\s|-)([a-záéíóúñ])/g, (_, a, b) => a + b.toUpperCase());

// --- el clima --------------------------------------------------------------

const hayTormenta = (c) => /tormenta|granizo/i.test(String(c?.cielo ?? ''));

function comentarioDeLluvia(v, hoy) {
  const l = hoy.lluvia ?? 0;
  if (l >= 50) {
    return v([
      `Hay muchas chances de lluvia, ${l} por ciento: llevate el paraguas.`,
      `Se pinta lluvioso: ${l} por ciento de probabilidad, así que paraguas a mano.`,
      `La lluvia tiene ${l} por ciento de chances: mejor salir con paraguas.`,
    ], 'lluvia');
  }
  if (l >= 25) {
    return v([
      'Puede caer algo suelto a la tarde.',
      'Hay alguna chance de lluvia a la tarde: por las dudas, llevá un paraguas.',
      'Podría llover un poco más tarde.',
    ], 'lluvia');
  }
  return v([
    'No se espera lluvia.',
    'Sin lluvia a la vista.',
    'No hay lluvia en el pronóstico.',
  ], 'lluvia');
}

/**
 * El clima de la mañana (7:30). Un saludo de mañana, la temperatura de ahora, un
 * comentario según lo que haya (frío, helada, calor, lluvia, tormenta, viento o
 * un día lindo), la máxima y un cierre cálido con la firma.
 */
export function guionClima(clima, _turno, { fecha = new Date(), direccion } = {}) {
  const s = semillaDe('clima-manana', fecha);
  const v = (banco, ranura) => variante(banco, s, ranura);
  const c = clima.ahora;
  const hoy = clima.dias[0];
  const partes = [
    v(SALUDOS.manana, 'saludo'),
    v([
      `Arrancamos con ${c.temp} grados.`,
      `Ahora hay ${c.temp} grados.`,
      `Así amanece Balcarce: ${c.temp} grados.`,
      `De momento, ${c.temp} grados.`,
    ], 'apertura'),
  ];
  let conToque = false;

  if (hoy.min <= 2) {
    conToque = true;
    partes.push(v([
      'Puede haber helada: abrigate bien.',
      'Hay riesgo de helada: salí bien abrigado.',
    ], 'frio'));
  } else if (hoy.min <= 6) {
    conToque = true;
    partes.push(v([
      'Mañana fría: salí abrigado.',
      'Hace frío temprano, así que abrigate bien.',
      'Está fresquito para salir: lo mejor es taparse.',
    ], 'frio'));
  } else if (hoy.min <= 11) {
    partes.push(v([
      'Está fresco temprano.',
      'Se siente fresco a esta hora.',
    ], 'frio'));
  }

  if (hoy.max >= 28) {
    conToque = true;
    partes.push(v([
      `A la tarde aprieta: vamos a ${hoy.max} grados. Tomá agua y buscá la sombra.`,
      `Se viene un día caluroso, con máxima de ${hoy.max}. Hidratate bien.`,
    ], 'max'));
  } else if (hoy.max - hoy.min >= 12) {
    partes.push(v([
      `A la tarde levanta hasta ${hoy.max}, así que el abrigo te va a sobrar.`,
      `Después levanta: la máxima llega a ${hoy.max}.`,
    ], 'max'));
  } else {
    partes.push(v([
      `La máxima de hoy es de ${hoy.max} grados.`,
      `Hoy la máxima llega a ${hoy.max}.`,
      `Durante el día, hasta ${hoy.max} grados.`,
    ], 'max'));
  }

  if (hayTormenta(c)) {
    conToque = true;
    partes.push(v([
      'Ojo, hay tormentas en el pronóstico: precaución si salís a la ruta.',
      'Hay tormentas en el pronóstico: mejor andar con cuidado.',
    ], 'lluvia'));
  } else {
    if ((hoy.lluvia ?? 0) >= 25) conToque = true;
    partes.push(comentarioDeLluvia(v, hoy));
  }

  if (c.viento >= 30) {
    conToque = true;
    partes.push(v([
      `Ojo con el viento, que sopla a ${c.viento} kilómetros por hora.`,
      `El viento sopla fuerte, a ${c.viento} kilómetros por hora: cuidado con lo que vuela.`,
    ], 'viento'));
  }

  if (!conToque && hoy.max >= 16 && hoy.max < 28) {
    partes.push(v([
      'Un día lindo para salir a caminar.',
      'Buen día para aprovechar afuera.',
      'Pinta un día tranquilo.',
    ], 'toque'));
  }

  // La farmacia NO va acá: tiene su propia pieza a la noche. Mezclarlas hace que
  // ninguna de las dos se recuerde.
  partes.push(cierre(s, 'manana', { conDireccion: diceLaDireccion(s, { forzar: direccion }) }));
  return unir(partes);
}

/**
 * El segundo pase del clima (20:00): no repite el de la mañana, mira para
 * adelante. Saludo de noche, cierre de noche, nunca "buen día".
 */
export function guionClimaNoche(clima, { fecha = new Date(), direccion } = {}) {
  const s = semillaDe('clima-noche', fecha);
  const v = (banco, ranura) => variante(banco, s, ranura);
  const c = clima.ahora;
  const hoy = clima.dias[0];
  const manana = clima.dias[1];
  const partes = [
    v(SALUDOS.noche, 'saludo'),
    v([
      `En este momento hay ${c.temp} grados.`,
      `Ahora mismo, ${c.temp} grados.`,
      `Afuera hay ${c.temp} grados.`,
      `La temperatura ahora es de ${c.temp} grados.`,
    ], 'apertura'),
  ];
  let conToque = false;

  if (hoy.min <= 2) {
    conToque = true;
    partes.push(v([
      `Se viene una noche muy fría, con mínima de ${hoy.min} y riesgo de helada. Abrigate bien.`,
      `Esta noche puede helar: la mínima baja hasta ${hoy.min}.`,
    ], 'minima'));
  } else if (hoy.min <= 8) {
    conToque = true;
    partes.push(v([
      `Esta noche refresca fuerte, baja hasta ${hoy.min}.`,
      `La noche viene fresca: la mínima llega a ${hoy.min}.`,
      `Hoy refresca bastante, hasta ${hoy.min} grados.`,
    ], 'minima'));
  } else {
    partes.push(v([
      `Esta noche la mínima va a ser de ${hoy.min} grados.`,
      `Para la noche, mínima de ${hoy.min}.`,
      `Hoy la mínima llega a ${hoy.min} grados.`,
    ], 'minima'));
  }

  if (manana) {
    if ((manana.lluvia ?? 0) >= 50) {
      conToque = true;
      partes.push(v([
        `Y ojo mañana, que se viene agua: ${manana.lluvia} por ciento de probabilidad.`,
        `Mañana hay ${manana.lluvia} por ciento de chances de lluvia: dejá el paraguas cerca.`,
      ], 'manana'));
    } else if (manana.max >= 28) {
      partes.push(v([
        `Mañana va a estar caluroso: máxima de ${manana.max} grados.`,
        `Mañana aprieta el calor, hasta ${manana.max}.`,
      ], 'manana'));
    } else if (manana.max - hoy.max >= 4) {
      partes.push(v([
        `Mañana levanta: máxima de ${manana.max} grados.`,
        `Mañana se pone más agradable, con máxima de ${manana.max}.`,
      ], 'manana'));
    } else if (hoy.max - manana.max >= 4) {
      partes.push(v([
        `Mañana baja un poco, máxima de ${manana.max}.`,
        `Mañana refresca: la máxima es de ${manana.max}.`,
      ], 'manana'));
    } else {
      partes.push(v([
        `Mañana, parecido: máxima de ${manana.max} grados.`,
        `Mañana se repite más o menos el día: hasta ${manana.max}.`,
        `Para mañana, una máxima de ${manana.max} grados.`,
      ], 'manana'));
    }
  }

  if (hoy.min <= 8) {
    partes.push(v(['Buen momento para un mate caliente.', 'Buena noche para quedarse bajo techo.'], 'toque'));
  } else if (!conToque) {
    partes.push(v(['Una noche tranquila para descansar.', 'Buena noche para salir a tomar el fresco.'], 'toque'));
  }

  partes.push(cierre(s, 'noche', { conDireccion: diceLaDireccion(s, { forzar: direccion }) }));
  return unir(partes);
}

/** El nombre de siempre de esta pieza (antes se la llamaba "de la tarde"). */
export const guionClimaTarde = (clima, opciones) => guionClimaNoche(clima, opciones);

// --- la farmacia y las piezas semanales ------------------------------------

/** La farmacia de turno (19:00). Dice el nombre y la dirección; no dice hasta
 *  qué hora está abierta (eso es para la web) ni de dónde salió el dato. */
export function guionFarmacia(turno, { fecha = new Date(), direccion, momento = 'noche' } = {}) {
  const s = semillaDe('farmacia', fecha);
  const lista = turno.detalle?.length ? turno.detalle : turno.farmacias.map((n) => ({ nombre: n }));
  const dichas = lista.map((f) => {
    const n = comoNombre(f.nombre);
    // La dirección se dice, no sólo se muestra: mucha gente escucha el reel
    // mientras hace otra cosa.
    return f.direccion ? `${n}, en ${f.direccion.replace(/N°/g, 'número').replace(/e\//g, 'entre')}` : n;
  });
  const cual = dichas.length > 1
    ? `hay dos de turno: ${dichas.join(', y también ')}`
    : `la de turno es ${dichas[0]}`;
  return unir([
    variante(SALUDOS[momento], s, 'saludo'),
    variante([
      `Si esta noche necesitás una farmacia en Balcarce, ${cual}.`,
      `Por si hace falta una farmacia esta noche, ${cual}.`,
      `Para esta noche, en Balcarce, ${cual}.`,
    ], s, 'apertura'),
    variante([
      'Guardá el dato, que te puede salvar una madrugada.',
      'Pasale el dato a quien lo pueda necesitar.',
      'Por las dudas, anotá la dirección.',
    ], s, 'consejo'),
    firma(s, { conDireccion: diceLaDireccion(s, { forzar: direccion }) }),
  ]);
}

/** Los teléfonos útiles. Nada de "esta semana" ni "una vez por semana": son los
 *  mismos teléfonos siempre, la única variable es cuándo sale la pieza. */
export function guionUtiles({ fecha = new Date(), direccion, momento = 'manana' } = {}) {
  const s = semillaDe('utiles', fecha);
  const con = diceLaDireccion(s, { forzar: direccion });
  return unir([
    variante(SALUDOS[momento], s, 'saludo'),
    variante([
      'Te dejamos los teléfonos que sirve tener a mano en Balcarce:',
      'Estos son los teléfonos que conviene tener a mano en Balcarce:',
      'Anotá los teléfonos que sirven en Balcarce:',
    ], s, 'apertura'),
    'emergencias, el hospital, la comisaría y los servicios del municipio.',
    variante([
      'Guardalos ahora, que después te olvidás.',
      'Tenelos a mano, que nunca se sabe.',
      'Compartilos con quien los pueda necesitar.',
    ], s, 'consejo'),
    // La última frase es la firma: dice dónde están los demás números.
    con ? `Los demás números están en ${SITIO_DICHO}.` : `Los demás números están en la web de ${MEDIO}.`,
  ]);
}

/** La agenda de los próximos días (jueves a la tarde). Vacía si no hay eventos. */
export function guionAgenda(eventos, { fecha = new Date(), direccion, momento = 'tarde' } = {}) {
  if (!eventos.length) return '';
  const s = semillaDe('agenda', fecha);
  const con = diceLaDireccion(s, { forzar: direccion });
  const primero = eventos[0];
  const cuantos = eventos.length;
  const cuantas = cuantos === 1 ? 'una actividad' : `${cuantos} actividades`;
  return unir([
    variante(SALUDOS[momento], s, 'saludo'),
    variante([
      `Hay ${cuantas} en Balcarce estos días.`,
      `Estos días en Balcarce hay ${cuantas}.`,
      `Para estos días, ${cuantas} en Balcarce.`,
    ], s, 'apertura'),
    `${primero.nombre}, el ${primero.cuando}${primero.lugar ? `, en ${primero.lugar}` : ''}.`,
    // La última frase es la firma: dice dónde está la agenda completa.
    con ? `La agenda completa está en ${SITIO_DICHO}.` : `La agenda completa está en la web de ${MEDIO}.`,
  ]);
}

// --- los podcasts -----------------------------------------------------------

const INTROS = {
  manana: [
    'Esto es lo que hay para saber esta mañana.',
    'Te cuento lo más importante para arrancar el día.',
    'Estas son las notas para empezar la mañana.',
    'Vamos con lo que tenés que saber esta mañana.',
  ],
  tarde: [
    'Repasamos lo que fue pasando hoy.',
    'Un repaso de lo que se viene comentando en Balcarce.',
    'Vamos con las novedades de la tarde.',
    'Esto es lo que se fue sumando desde la mañana.',
  ],
  noche: (dia) => [
    `Este es el repaso de este ${dia}.`,
    `Cerramos este ${dia} con lo más fuerte del día.`,
    `Repasamos lo que dejó este ${dia}.`,
    `Así se va este ${dia} en Balcarce.`,
  ],
};

const CONECTORES = {
  primero: ['Para arrancar', 'Lo primero', 'Empezamos con esto', 'Arrancamos por acá'],
  medio: ['Cambiando de tema', 'Por otro lado', 'Otra que se comenta', 'También', 'Sigamos con esto'],
  ultimo: ['Y para cerrar', 'Y para terminar', 'Por último', 'Y cerramos con'],
};

/** El saludo de un podcast: el de su hora y una línea de entrada. */
export function saludoDePodcast(momento, { fecha = new Date() } = {}) {
  const s = semillaDe(`podcast-${momento}`, fecha);
  const intros = typeof INTROS[momento] === 'function' ? INTROS[momento](diaDeLaSemana(fecha)) : INTROS[momento];
  return `${variante(SALUDOS[momento], s, 'saludo')} ${variante(intros, s, 'intro')}`;
}

/** El cierre de un podcast: un deseo de su hora y la firma (con la dirección
 *  dicha, cuando el criterio lo pide). */
export function cierreDePodcast(momento, { fecha = new Date(), direccion } = {}) {
  const s = semillaDe(`podcast-${momento}`, fecha);
  return cierre(s, momento, { conDireccion: diceLaDireccion(s, { podcast: true, forzar: direccion }), tipo: 'podcast' });
}

/**
 * Arma el texto de un podcast: saludo, cada noticia (titular y, si hay, una
 * oración de contexto) con conectores variados, y cierre. `items` es
 * [{ titular, detalle }]. Si `saludo` o `cierre` vienen dados, se usan tal cual.
 */
export function armarPodcast(items, { momento = 'manana', fecha = new Date(), saludo, cierre: cierreDado, direccion } = {}) {
  const s = semillaDe(`podcast-${momento}`, fecha);
  const medios = variantes(CONECTORES.medio, s, 'medio', Math.max(0, items.length - 2));
  const conector = (i) => {
    if (i === 0) return variante(CONECTORES.primero, s, 'primero');
    if (i === items.length - 1) return variante(CONECTORES.ultimo, s, 'ultimo');
    return medios[i - 1];
  };
  const cuerpo = items.map((it, i) => {
    const titular = String(it.titular).replace(/\s+/g, ' ').trim().replace(/[.:]+$/, '');
    const fin = /[?!]$/.test(titular) ? '' : '.';
    return `${conector(i)}: ${titular}${fin}${it.detalle ? ` ${it.detalle}` : ''}`;
  }).join(' ');
  return `${saludo ?? saludoDePodcast(momento, { fecha })} ${cuerpo} ${cierreDado ?? cierreDePodcast(momento, { fecha, direccion })}`;
}

// --- la revisión: las reglas que TODA pieza respeta -------------------------

/** Medios de los que nunca se dice el nombre en una pieza. */
export const MEDIOS_QUE_NO_SE_NOMBRAN = [
  'Infobae', 'Clarín', 'La Nación', 'Página 12', 'Página/12', 'Ámbito', 'Todo Noticias',
  'La Vanguardia', 'Puntonueve', 'Radio Gabal', 'La Capital', 'El Cronista', 'Télam', 'Noticias Argentinas',
  'El Diario de Balcarce', 'Meteored',
];

const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const RE_MEDIOS = new RegExp(`(?<![\\p{L}\\p{N}])(${MEDIOS_QUE_NO_SE_NOMBRAN.map(escapar).join('|')})(?![\\p{L}\\p{N}])`, 'iu');

/**
 * Revisa un texto contra las reglas de CRITERIO-REDES.md sección 4. `tipo` es
 * 'voz' (lo que dice la locutora) o 'texto' (un posteo o un pie: lleva la
 * dirección escrita). `momento` (manana, tarde, noche) controla el saludo.
 * Devuelve la lista de problemas: vacía si está todo bien.
 */
export function revisarTexto(texto, { tipo = 'voz', momento } = {}) {
  const t = String(texto);
  const problemas = [];
  const mal = (cond, que) => { if (cond) problemas.push(que); };

  mal(/\.com\.ar|\.ar\b|punto\s+a\s+ere|punto\s+ar\b/i.test(t), 'dice o escribe la dirección con ".ar"');
  mal(RE_MEDIOS.test(t), 'nombra un medio de origen');
  mal(/en vivo|minuto a minuto|tiempo real/i.test(t), 'dice "en vivo" o "minuto a minuto"');
  mal(/resumen hecho con ia/i.test(t), 'dice "Resumen hecho con IA"');
  mal(/incre[ií]ble|impactante|esc[aá]ndalo/i.test(t), 'usa un adjetivo de titular');
  mal(/radar\s*balcarce\.com\.ar/i.test(t), 'la dirección es radarbalcarce.com');

  if (tipo === 'voz') {
    mal(!t.includes('Radar Balcarce'), 'no nombra a "Radar Balcarce"');
    mal(/[!¡]/.test(t), 'tiene signos de exclamación');
    mal(/radarbalcarce|\.com\b/i.test(t), 'escribe la dirección en vez de decirla');
    mal(/punto com/i.test(t) && !/Radar Balcarce punto com/i.test(t), 'dice "punto com" sin "Radar Balcarce" adelante');
    mal(/punto com(?![.]|$)/i.test(t), 'agrega algo después de "punto com"');
    if (momento) {
      const otros = { manana: /buenas (tardes|noches)/i, tarde: /buen d[ií]a|buenas noches/i, noche: /buen d[ií]a|buenas tardes/i };
      mal(otros[momento].test(t), `saluda con otro horario (es de ${momento})`);
      mal(momento !== 'manana' && /\bhola\b/i.test(t), 'dice "hola" fuera de la mañana');
    }
  } else {
    mal(/punto com/i.test(t), 'en un texto la dirección se escribe, no se dice');
    mal(!/radarbalcarce\.com/.test(t), 'falta la dirección radarbalcarce.com');
  }
  return problemas;
}

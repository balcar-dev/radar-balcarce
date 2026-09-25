// Teléfonos útiles de Balcarce: seguridad, salud, servicios.
//
// Esto no cambia casi nunca, así que no hace falta ingesta automática: es un
// dato fijo que se carga una vez y se revisa cada tanto. Lo que SÍ se
// automatiza es cuándo sale: una historia por semana, en un día que no se
// puede adivinar, para que no sea "todos los martes a las tres" y la gente
// deje de mirarla por previsible.

// Tomados el 18/09/2026 de la página oficial del municipio
// (balcarce.gob.ar/telefonos-utiles/), que es justamente una lista de
// teléfonos útiles ya armada por ellos. Los nacionales (911, 107) no están
// ahí pero son estándar en toda la Argentina, así que se agregan aparte.
// Todo el prefijo es 02266 salvo que se indique otro.
export const NUMEROS = [
  // Nacionales, los mismos en cualquier punto del país.
  { categoria: 'Emergencias', nombre: 'Emergencias (línea única)', numero: '911' },
  { categoria: 'Emergencias', nombre: 'SAME / Emergencias médicas', numero: '107' },
  { categoria: 'Emergencias', nombre: 'Bomberos', numero: '100' },

  // De la lista oficial del municipio.
  { categoria: 'Salud', nombre: 'Hospital · conmutador', numero: '(02266) 42-2017 / 42-2018 / 43-0384 / 43-0449' },
  { categoria: 'Salud', nombre: 'Hospital · dirección', numero: '(02266) 42-2964 / 42-2570' },
  { categoria: 'Seguridad', nombre: 'Comisaría de la Mujer', numero: '(02266) 43-1042' },
  { categoria: 'Seguridad', nombre: 'Juzgado de Faltas', numero: '(02266) 43-0566' },
  { categoria: 'Seguridad', nombre: 'Tránsito (Movilidad y Control Urbano)', numero: '(02266) 43-1765' },
  { categoria: 'Municipio', nombre: 'Municipalidad · conmutador', numero: '(02266) 42-4044 / 42-5330 / 42-4009' },
  { categoria: 'Municipio', nombre: 'Concejo Deliberante', numero: '(02266) 42-4089' },
  { categoria: 'Servicios', nombre: 'ARBAL · atención al público', numero: '(02266) 15-674175 / 15-660261' },
  { categoria: 'Servicios', nombre: 'Cementerio', numero: '(02266) 42-4064' },
  { categoria: 'Servicios', nombre: 'Licencias de conducir', numero: '(02266) 42-0055' },
  { categoria: 'Servicios', nombre: 'Defensa al Consumidor', numero: '(02266) 43-0695' },
  { categoria: 'Servicios', nombre: 'Zoonosis', numero: '(02266) 15-661845' },
  { categoria: 'Cultura', nombre: 'Teatro Municipal', numero: '(02266) 15-548766' },
  { categoria: 'Turismo', nombre: 'Oficina de Turismo · centro', numero: '(02266) 42-2394' },
  { categoria: 'Turismo', nombre: 'Oficina de Turismo · el cruce', numero: '(02266) 43-0895' },
  { categoria: 'Delegaciones', nombre: 'Delegación Los Pinos', numero: '(02266) 49-0250' },
  { categoria: 'Delegaciones', nombre: 'Delegación Napaleofú', numero: '(02261) 49-0600 / 49-0643' },
  { categoria: 'Delegaciones', nombre: 'Delegación San Agustín', numero: '(02266) 49-1013' },
];

export const FUENTE = 'balcarce.gob.ar/telefonos-utiles';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/**
 * Decide si HOY toca publicar la historia de números útiles.
 *
 * La regla: una vez por semana, en un día elegido al azar pero ESTABLE — la
 * semilla es el número de semana del año, así que no cambia si se corre el
 * chequeo varias veces el mismo día, pero sí varía de una semana a la otra
 * (no siempre cae lunes).
 */
export function tocaHoy(fecha = new Date()) {
  const inicioAnio = new Date(fecha.getFullYear(), 0, 1);
  const semana = Math.floor((fecha - inicioAnio) / (7 * 24 * 3600 * 1000));
  // Semilla simple y determinística: no hace falta más para elegir 1 de 7.
  const diaElegido = (semana * 2654435761) % 7;
  return fecha.getDay() === Math.abs(diaElegido);
}

/** Para el panel: qué día le tocó a esta semana, sin esperar a que llegue. */
export function diaDeEstaSemana(fecha = new Date()) {
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(fecha);
    d.setDate(d.getDate() - d.getDay() + i);
    if (tocaHoy(d)) return DIAS[i];
  }
  return DIAS[0];
}

if (process.argv[1] && process.argv[1].endsWith('utiles.mjs')) {
  console.log(`\n\x1b[1mNÚMEROS ÚTILES\x1b[0m`);
  console.log(`  esta semana toca: \x1b[1m${diaDeEstaSemana()}\x1b[0m`);
  console.log(`  ¿hoy? ${tocaHoy() ? '\x1b[32msí\x1b[0m' : 'no'}\n`);
  for (const cat of [...new Set(NUMEROS.map((n) => n.categoria))]) {
    console.log(`  ${cat}`);
    NUMEROS.filter((n) => n.categoria === cat).forEach((n) => {
      console.log(`    ${n.nombre.padEnd(38)} ${n.numero}${n.confirmar ? '  \x1b[33m(confirmar)\x1b[0m' : ''}`);
    });
  }
  console.log('');
}

// A qué día corresponde la farmacia que está abierta AHORA.
//
// El turno no va de medianoche a medianoche: arranca a la mañana y termina a
// las 8:30 de la mañana del día siguiente (el 21/09 se corrigió: eran las 9). La página lo decía y el cálculo no lo
// hacía — a las 00:30 del lunes ya mostraba la del lunes, cuando la que está
// abierta es todavía la del domingo.
//
// Es el error más caro que puede tener este sitio: manda a alguien a una
// puerta cerrada justo a la hora en que no hay a quién preguntarle.
export const HORA_DE_CAMBIO = 8;
export const MINUTO_DE_CAMBIO = 30;

/**
 * Devuelve el día (como Date) cuyo turno está corriendo ahora.
 *
 * Todo se mira en hora de Balcarce y no en la del servidor: GitHub Actions
 * corre en UTC, tres horas adelante, y ahí el cambio de turno se adelantaba
 * a las seis de la tarde.
 */
export function diaDeTurno(ahora = new Date()) {
  const enBalcarce = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const dia = new Date(enBalcarce);
  const minutos = enBalcarce.getHours() * 60 + enBalcarce.getMinutes();
  if (minutos < HORA_DE_CAMBIO * 60 + MINUTO_DE_CAMBIO) dia.setDate(dia.getDate() - 1);
  return dia;
}

/**
 * Año, mes (1 a 12) y día de HOY en Balcarce, sea cual sea la zona del
 * servidor. `new Date().getDate()` da el día del servidor: GitHub Actions
 * corre en UTC, y de 21 a 24 de Balcarce ahí ya es mañana. Pasaba con la
 * farmacia (cruzarFarmacias), el control del cronograma y la agenda.
 */
export function fechaEnBalcarce(ahora = new Date()) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(ahora).map((p) => [p.type, p.value]));
  return { anio: Number(partes.year), mes: Number(partes.month), dia: Number(partes.day) };
}

/** La misma fecha en formato 2026-09-20, sin pasar por UTC. */
export function comoISO(fecha) {
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, '0'),
    String(fecha.getDate()).padStart(2, '0'),
  ].join('-');
}


/**
 * ¿Esta decisión la tomó una persona?
 *
 * Sólo esas mandan sobre el semáforo. Una decisión guardada por la máquina
 * ("automática", "pendiente", "archivada") es una foto de lo que decía el
 * semáforo ese día, y si se la respeta para siempre, cambiar las reglas no
 * cambia nada de lo ya publicado.
 *
 * Se vio el 21/09: el panel guarda el estado cuando la IA reescribe una
 * nota, y eso dejó 29 notas de Deportes publicadas por encima del cupo
 * nuevo — las reglas se habían apretado y ellas no se enteraron.
 *
 * La IA firma con por: "ia". Una decisión sin firma es de la máquina también.
 */
export function decisionHumana(d) {
  return !!d && !!d.por && d.por !== 'ia';
}
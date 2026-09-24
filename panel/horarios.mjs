// Cuándo salen las historias fijas.
//
// Hasta ahora los horarios estaban escritos en reels/plan.mjs, así que
// cambiarlos era tocar código. Son justamente lo que más se va a querer
// ajustar cuando vean qué hora rinde en Balcarce, así que tienen que poder
// cambiarse desde el panel.
//
// Lo que se guarda vive en panel/datos/estado.json, que no se versiona: son
// decisiones de la redacción, no del proyecto.

// Los días de la semana como los devuelve Date#getDay(): 0 es domingo.
export const DIAS = [
  { n: 1, corto: 'L', nombre: 'lunes' },
  { n: 2, corto: 'M', nombre: 'martes' },
  { n: 3, corto: 'M', nombre: 'miércoles' },
  { n: 4, corto: 'J', nombre: 'jueves' },
  { n: 5, corto: 'V', nombre: 'viernes' },
  { n: 6, corto: 'S', nombre: 'sábado' },
  { n: 0, corto: 'D', nombre: 'domingo' },
];

const TODOS = [0, 1, 2, 3, 4, 5, 6];

/** Las piezas fijas y su horario por defecto. Cada una explica por qué sale
 *  a esa hora: si alguien lo cambia, que sepa qué estaba pensado. */
export const HISTORIAS_FIJAS = [
  {
    id: 'clima-manana',
    nombre: 'El clima de la mañana',
    porQue: 'Antes de salir de casa. Es la pieza que más se mira de todas.',
    activa: true,
    hora: '07:30',
    dias: TODOS,
  },
  {
    id: 'clima-noche',
    nombre: 'El clima de la noche',
    porQue: 'Cuando la gente ya está en casa y lo que importa es cómo amanece mañana.',
    activa: true,
    hora: '20:00',
    dias: TODOS,
  },
  {
    id: 'farmacia',
    nombre: 'Farmacia de turno',
    porQue: 'A la hora en que cierran las demás farmacias.',
    activa: true,
    hora: '19:00',
    dias: TODOS,
  },
  {
    id: 'agenda',
    nombre: 'Qué hacer este fin de semana',
    porQue: 'El jueves, cuando la gente empieza a planear. Sólo sale si hay eventos cargados.',
    activa: true,
    hora: '18:00',
    dias: [4],
  },
  {
    id: 'utiles',
    nombre: 'Teléfonos útiles',
    porQue: 'Una vez por semana. No es noticia: es para que lo guarden en el celular.',
    activa: true,
    hora: '11:00',
    // Este valor es el que se usa si alguien fija el día a mano desde acá.
    // Si nadie lo toca, en GitHub el día rota solo, de lunes a viernes, una
    // semana distinta cada vez, en vez de ser siempre martes — ver
    // diaRotativoDeUtiles en redes/piezas.mjs.
    dias: [2],
  },
];

/** Mezcla lo guardado con los valores por defecto. Una pieza que se agregue
 *  al código más adelante aparece sola, sin perder lo que ya se ajustó. */
export function horariosDe(estado) {
  const guardado = estado?.horarios ?? {};
  return HISTORIAS_FIJAS.map((h) => ({
    ...h,
    ...(guardado[h.id] ?? {}),
    id: h.id,
    nombre: h.nombre,
    porQue: h.porQue,
  }));
}

/** Guarda un cambio del panel. Devuelve la lista completa ya mezclada. */
export function guardarHorario(estado, { id, activa, hora, dias }) {
  if (!HISTORIAS_FIJAS.some((h) => h.id === id)) throw new Error('esa pieza no existe');
  estado.horarios ??= {};
  const previo = estado.horarios[id] ?? {};
  const limpio = { ...previo };

  if (activa !== undefined) limpio.activa = !!activa;
  if (hora !== undefined) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) throw new Error('la hora tiene que ser como 07:30');
    limpio.hora = hora;
  }
  if (dias !== undefined) {
    const validos = [...new Set(dias)].filter((d) => TODOS.includes(d)).sort();
    if (!validos.length) throw new Error('tiene que quedar al menos un día');
    limpio.dias = validos;
  }

  estado.horarios[id] = limpio;
  return horariosDe(estado);
}

/** ¿Toca hoy esta pieza? La usa el plan del día. */
export function toca(horario, cuando = new Date()) {
  return horario.activa !== false && (horario.dias ?? TODOS).includes(cuando.getDay());
}

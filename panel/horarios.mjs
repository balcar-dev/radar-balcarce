// Cuándo salen las historias fijas.
//
// Hasta ahora los horarios estaban escritos en reels/plan.mjs, así que
// cambiarlos era tocar código. Son justamente lo que más se va a querer
// ajustar cuando vean qué hora rinde en Balcarce, así que tienen que poder
// cambiarse desde el panel.
//
// Lo que se guarda vive en panel/datos/estado.json, que no se versiona: son
// decisiones de la redacción, no del proyecto.

import { diaRotativoDeUtiles } from '../ingesta/utiles.mjs';
import { PIEZAS_PARTICIPA } from '../redes/participa.mjs';
import { feriadoDelDia } from '../redes/feriado.mjs';
import { efemerideDelDia } from '../redes/efemeride.mjs';
import { diaSemanaAR } from '../ingesta/zona.mjs';

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
    hora: '07:00',
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
    porQue: 'El jueves al mediodía, cuando la gente empieza a planear. Sólo sale si hay eventos cargados.',
    activa: true,
    hora: '12:00',
    dias: [4],
  },
  {
    id: 'utiles',
    nombre: 'Teléfonos útiles',
    porQue: 'Una vez por semana, los sábados a la tarde. No es noticia: es para que lo guarden en el celular.',
    activa: true,
    hora: '17:00',
    // Fijo, los sábados (1/10/2026). Si alguien lo cambia desde el panel (`estado.horarios.utiles.dias`), manda lo que se guardó.
    dias: [6],
  },
];

// El feriado: un hueco reservado a las 8:00 que sólo se usa los días de feriado (redes/feriado.mjs). "Un día como hoy" sale igual a las 9:00.
HISTORIAS_FIJAS.push({
  id: 'feriado', nombre: 'El feriado', porQue: 'Los días de feriado, a la mañana: qué se conmemora, con datos verificados. Reserva su hueco aparte de lo demás.',
  activa: true, hora: '08:00', dias: TODOS,
});

// "Un día como hoy" (1/10, Hernán: "todos los días, fijo a las 9"): sale cada día que tiene su entrada
// preparada en web/data/efemerides-piezas.json (redes/efemeride.mjs); sin entrada, ese día no sale nada.
HISTORIAS_FIJAS.push({
  id: 'efemeride', nombre: 'Un día como hoy', porQue: 'Todos los días a las 9:00, fijo: la efeméride del día y tres más. Se prepara una semana por vez y se revisa antes.',
  activa: true, hora: '09:00', dias: TODOS,
});

// Las piezas de participá (30/09): una historia con voz a las 12:00, cuatro días por semana.
for (const [id, p] of Object.entries(PIEZAS_PARTICIPA)) {
  HISTORIAS_FIJAS.push({
    id, nombre: p.nombre, porQue: 'Invita a mandar noticias, eventos, reclamos o notas por WhatsApp. Al mediodía, que es cuando más gente mira.',
    activa: true, hora: '12:00', dias: [p.dia],
  });
}

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

/**
 * ¿Toca hoy esta pieza? LA ÚNICA FUENTE: el reloj de Redes (redes/piezas.mjs) y
 * el plan que arma los videos (reels/plan.mjs) usan esta misma función, así que
 * no puede pasar que uno diga "toca" y el otro no arme nada (PENDIENTES 16c).
 *
 * Los teléfonos útiles salen fijos los sábados (`diaRotativoDeUtiles`). Si
 * alguien fija los días a mano desde el panel (`estado.horarios.utiles.dias`),
 * manda eso.
 *
 * El día es el de Balcarce, no el de la máquina: en GitHub el reloj es UTC.
 */
export function toca(horario, cuando = new Date(), { estado = null } = {}) {
  if (horario.activa === false) return false;
  if (horario.id === 'feriado') return !!feriadoDelDia(cuando);
  if (horario.id === 'efemeride') return !!efemerideDelDia(cuando);
  const dia = diaSemanaAR(cuando);
  const aMano = estado?.horarios?.utiles?.dias;
  if (horario.id === 'utiles' && !aMano) return dia === diaRotativoDeUtiles(cuando);
  return (horario.dias ?? TODOS).includes(dia);
}

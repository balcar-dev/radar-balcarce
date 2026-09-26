// La hora de Balcarce, en un solo lugar. El servidor de GitHub Actions corre en
// UTC y la PC de Hernán en hora argentina: todo lo que dependa de "hoy", de la
// hora o del día de la semana pasa por acá y no por la zona de la máquina.
// Sin dependencias: sólo lo que trae Node (la usan ingesta/, panel/, redes/ y reels/).

export const ZONA = 'America/Argentina/Buenos_Aires';

/** El día de Balcarce como AAAA-MM-DD. */
export function diaAR(fecha = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(fecha);
}

/** La hora (0 a 23) en Balcarce. */
export function horaAR(fecha = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: ZONA }).format(fecha)) % 24;
}

/** Los minutos desde la medianoche en Balcarce (22:00 es 1320). */
export function minutoDelDiaAR(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA,
  }).formatToParts(fecha);
  const valor = (tipo) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  return (valor('hour') % 24) * 60 + valor('minute');
}

/** El día de la semana en Balcarce, con 0 = domingo como Date#getDay(). */
export function diaSemanaAR(fecha = new Date()) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: ZONA }).format(fecha),
  );
}

/** "HH:MM" en Balcarce (24 horas). */
export function horaCortaAR(fecha) {
  return new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA });
}

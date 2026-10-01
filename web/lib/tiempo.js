// Cuánto hace de algo, en palabras. Aparte de lib/datos.js (que lee archivos
// del disco) para que lo pueda usar también el navegador: components/horas-vivas.js.

export function haceCuanto(fechaISO, ahora = Date.now()) {
  const min = Math.round((ahora - new Date(fechaISO).getTime()) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  // Hacia abajo (29/09): 1 h 30 decía "hace 2 h" y 36 h "hace 2 días".
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`;
  const dias = Math.floor(min / 1440);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
}

/**
 * La fecha de "modificada" de una nota para Google (dateModified, og:modifiedTime):
 * la de la última vez que salió, pero nunca anterior a la de publicación. Había 12
 * notas con la modificación antes que la publicación (auditoría del 29/09).
 */
export function fechaDeModificacion(nota) {
  const publicada = new Date(nota.fecha).getTime();
  const modificada = new Date(nota.publicadaCuando ?? nota.fecha).getTime();
  if (!Number.isFinite(publicada)) return nota.publicadaCuando ?? nota.fecha;
  if (!Number.isFinite(modificada) || modificada < publicada) return nota.fecha;
  return nota.publicadaCuando ?? nota.fecha;
}

// La fecha exacta de algo, en hora de Balcarce (1/10/2026, Hernán: "si alguien lee la noticia otro día,
// tiene que ver la fecha"). Los nombres van escritos acá y no con Intl: así salen igual en cualquier
// servidor y en el navegador, sin depender de los datos de idioma de cada uno.
const DIAS_DE_LA_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_DEL_ANIO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Las partes de una fecha en hora de Balcarce (UTC-3, sin cambio de hora): { anio, mes, dia, hora, minuto, diaSemana } o null. */
export function partesEnBalcarce(fechaISO) {
  const t = new Date(fechaISO).getTime();
  if (!Number.isFinite(t)) return null;
  const d = new Date(t - 3 * 3600e3);
  return {
    anio: d.getUTCFullYear(), mes: d.getUTCMonth(), dia: d.getUTCDate(), diaSemana: d.getUTCDay(),
    hora: String(d.getUTCHours()).padStart(2, '0'), minuto: String(d.getUTCMinutes()).padStart(2, '0'),
  };
}

/** "jueves 1 de octubre de 2026 · 15:32" (o "" si la fecha no es válida). */
export function fechaLarga(fechaISO) {
  const p = partesEnBalcarce(fechaISO);
  return p ? `${DIAS_DE_LA_SEMANA[p.diaSemana]} ${p.dia} de ${MESES_DEL_ANIO[p.mes]} de ${p.anio} · ${p.hora}:${p.minuto}` : '';
}

/** "mié 30 de septiembre · 14:20", para las listas. */
export function fechaCorta(fechaISO) {
  const p = partesEnBalcarce(fechaISO);
  return p ? `${DIAS_DE_LA_SEMANA[p.diaSemana].slice(0, 3)} ${p.dia} de ${MESES_DEL_ANIO[p.mes]} · ${p.hora}:${p.minuto}` : '';
}

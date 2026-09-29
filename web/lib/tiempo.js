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

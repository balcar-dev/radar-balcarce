// Cuánto hace de algo, en palabras. Aparte de lib/datos.js (que lee archivos
// del disco) para que lo pueda usar también el navegador: components/horas-vivas.js.

export function haceCuanto(fechaISO, ahora = Date.now()) {
  const min = Math.round((ahora - new Date(fechaISO).getTime()) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.round(min / 60)} h`;
  const dias = Math.round(min / 1440);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
}

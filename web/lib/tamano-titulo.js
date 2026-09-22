// Cuánto achicar el titular de la tarjeta de compartir, según lo largo que
// sea. Aparte de tarjeta.js porque ese archivo importa next/og, que sólo
// carga adentro de Next: si esto viviera ahí, no se podría probar sin
// levantar el sitio entero.

export function cuerpo(titulo) {
  const n = titulo.length;
  if (n <= 48) return 74;
  if (n <= 80) return 62;
  if (n <= 120) return 52;
  return 44;
}

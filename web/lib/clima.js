// Qué dibujo le corresponde a un estado del cielo.
//
// Esto vivía dos veces: una en la pastilla de la barra de arriba (SolChico,
// en components/piezas.js) y otra en la tarjeta grande (components/clima-vivo.js).
// Las dos copias se fueron separando y terminó pasando lo obvio: el 20/09
// estaba nublado, la tarjeta grande decía "Nublado" y la barra de arriba
// dibujaba un sol radiante. Ahora deciden las dos con esta función.
//
// El vocabulario de entrada es el de CIELO en ingesta/ingesta.mjs:
// "Despejado", "Mayormente despejado", "Parcialmente nublado", "Nublado",
// "Niebla", "Llovizna", "Lluvia", "Chaparrones", "Tormenta", "Nieve".

/**
 * @param {string} cielo  el texto del pronóstico
 * @param {boolean} esDeDia
 * @returns {'lluvia'|'cubierto'|'nube'|'luna-nube'|'sol'|'luna'}
 */
export function tipoDeCielo(cielo = '', esDeDia = true) {
  const t = String(cielo).toLowerCase();

  // Si cae agua, lo que importa es eso y no si hay sol detrás.
  if (/lluvia|llovizna|chaparr|tormenta|nieve/.test(t)) return 'lluvia';

  // Cubierto de verdad: nube sola. "Nublado" a secas y la niebla no dejan
  // ver el sol, así que dibujarlo asomando es dibujar otro día.
  if (/^nublado|cubierto|niebla/.test(t)) return 'cubierto';

  // Con claros: el sol (o la luna) asoma detrás de una nube.
  if (/nubl|nubos/.test(t)) return esDeDia ? 'nube' : 'luna-nube';

  // De noche no hay sol. Parece obvio, pero la versión anterior dibujaba un
  // sol radiante a la una de la mañana.
  return esDeDia ? 'sol' : 'luna';
}

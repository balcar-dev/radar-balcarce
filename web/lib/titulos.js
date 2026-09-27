// Los títulos sin "en Balcarce" al final (27/09, Hernán).
//
// La IA le pegaba "en Balcarce" a casi todos los títulos: el 27/09, 44 de las
// 66 notas de la portada terminaban así ("Bomberos controlan un principio de
// incendio en Balcarce"). En un medio de Balcarce sobra: se saca la cola, sin
// volver a pedirle nada a la IA, en las notas nuevas y en las ya publicadas.
// Balcarce en otro lugar del título ("Balcarce pierde el subsidio al gas")
// queda. La dirección de la nota no cambia (lib/ruta.js).

const COLA = /\s+(?:en|de)\s+(?:la\s+ciudad\s+de\s+)?Balcarce\s*\.?\s*$/i;

/** El título sin "en Balcarce" al final, si lo que queda se sostiene solo. */
export function sinBalcarceAlFinal(titulo) {
  const t = String(titulo ?? '');
  if (!COLA.test(t)) return t;
  const sin = t.replace(COLA, '').trim();
  // "Llueve en Balcarce" no queda en "Llueve": con menos de cuatro palabras se deja.
  return sin.split(/\s+/).length >= 4 ? sin : t;
}

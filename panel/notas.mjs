// Qué campos de una nota se pueden corregir a mano en el panel, y cómo se
// mezcla lo que trajo la ingesta con lo que ya se decidió.
//
// Está acá y no dentro de vista() en servidor.mjs porque el 23/09 se descubrió
// que el panel no mostraba el cuerpo de la nota: se había agregado al resto de
// la cadena y no a esta mezcla. Ahora hay una prueba que lo vigila.

/** El título, el copete, el cuerpo y el guion tal como salen en el panel:
 *  lo decidido manda; si no, lo que trajo la fuente. */
export function camposEditables(nota, decision) {
  return {
    titulo: decision?.titulo ?? nota.titulo,
    copete: decision?.copete ?? nota.resumenFuente,
    cuerpo: decision?.cuerpo ?? null,
    guion: decision?.guion ?? null,
    deIA: decision?.deIA ?? null,
  };
}

/** Lo que del panel necesita la web (web/data/decisiones.json). Todo lo que se
 *  puede editar en el panel tiene que estar acá: si no, se ve en el tablero y
 *  no llega al sitio. Así pasó con el cuerpo hasta el 24/09. */
export function decisionParaLaWeb(d) {
  return {
    estado: d.estado,
    ...Object.fromEntries(
      ['titulo', 'copete', 'cuerpo', 'guion', 'deIA', 'por', 'cuando'].map((k) => [k, d[k] ?? null]),
    ),
  };
}

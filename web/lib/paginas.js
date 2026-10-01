// Cómo se parte una sección en páginas.
//
// Una sección guarda todas sus notas (las del archivo de 180 días también) y no se
// recorren de corrido: se cortan de a diez, las más nuevas primero (1/10, Hernán: "se
// tienen que ver 10 notas y un botón para pasar de página"). Las siguientes quedan en
// /seccion/deportes-2, deportes-3…
//
// La ranura y el número van pegados en la misma parte de la dirección
// porque la sección es una ruta dinámica sola: /seccion/[ranura]. Separarlos
// obligaría a una carpeta más y a duplicar la página.

/** Diez entra en una o dos pantallas de celular. */
export const POR_PAGINA = 10;

/**
 * Parte "deportes-3" en { base: 'deportes', pagina: 3 }.
 *
 * `esSeccion` decide si lo de la izquierda es una sección de verdad: sin eso,
 * una ranura que termine en número —"ruta-226"— se leería como la página 226
 * de una sección llamada "ruta".
 */
export function partirRanura(ranura, esSeccion = () => true) {
  const m = String(ranura ?? '').match(/^(.*?)-(\d+)$/);
  if (m && esSeccion(m[1])) return { base: m[1], pagina: Math.max(1, Number(m[2])) };
  return { base: String(ranura ?? ''), pagina: 1 };
}

/** Cuántas páginas hacen falta para esa cantidad de notas. */
export function cuantasPaginas(cuantasNotas) {
  return Math.max(1, Math.ceil(cuantasNotas / POR_PAGINA));
}

/** La dirección de una página de la sección. La primera no lleva número. */
export function direccionDePagina(ranura, pagina) {
  return pagina <= 1 ? `/seccion/${ranura}` : `/seccion/${ranura}-${pagina}`;
}

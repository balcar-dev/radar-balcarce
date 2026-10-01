// Cómo se parte una sección en páginas.
//
// Una sección guarda todas sus notas (las del archivo de 180 días también) y no se
// recorren de corrido: las más nuevas primero (1/10, Hernán). La primera página trae cinco
// notas de arriba, como postales, y diez en lista; las siguientes, diez en lista cada una, con
// un botón para pasar de página. Quedan en /seccion/deportes-2, deportes-3…
//
// La ranura y el número van pegados en la misma parte de la dirección
// porque la sección es una ruta dinámica sola: /seccion/[ranura]. Separarlos
// obligaría a una carpeta más y a duplicar la página.

/** Las notas de una página de lista: diez entran en una o dos pantallas de celular. */
export const POR_PAGINA = 10;

/** Las de arriba de la primera página, en postales. */
export const POSTALES = 5;

/** Cuántas notas trae la primera página (las postales y la lista). */
export const EN_LA_PRIMERA = POSTALES + POR_PAGINA;

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
  if (cuantasNotas <= EN_LA_PRIMERA) return 1;
  return 1 + Math.ceil((cuantasNotas - EN_LA_PRIMERA) / POR_PAGINA);
}

/** Qué notas (de la más nueva a la más vieja) van en una página: [desde, hasta). */
export function rangoDePagina(pagina) {
  if (pagina <= 1) return [0, EN_LA_PRIMERA];
  const desde = EN_LA_PRIMERA + (pagina - 2) * POR_PAGINA;
  return [desde, desde + POR_PAGINA];
}

/** La dirección de una página de la sección. La primera no lleva número. */
export function direccionDePagina(ranura, pagina) {
  return pagina <= 1 ? `/seccion/${ranura}` : `/seccion/${ranura}-${pagina}`;
}

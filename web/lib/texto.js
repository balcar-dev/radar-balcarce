// Arreglos de texto que necesitan varias páginas.
//
// Están acá y no dentro de un componente para que se puedan probar sin
// levantar React: son funciones de una entrada y una salida, y las pruebas
// viven en pruebas/web.test.mjs.

/**
 * Pasa un nombre escrito todo en mayúsculas a la forma en que se escribe.
 *
 * El cronograma del Colegio de Farmacéuticos llega así —"SAN JOSE PLAZA"— y
 * en la página quedaba gritando. Si el texto ya está bien escrito no se
 * toca: el umbral de 80% de mayúsculas deja pasar siglas sueltas como
 * "Farmacia SUM" sin arruinar el resto.
 */
export function comoNombre(texto = '') {
  const t = String(texto);
  const letras = t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  const mayusculas = letras.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length;
  if (!letras.length || mayusculas / letras.length < 0.8) return t;
  return t.toLowerCase().replace(/(^|\s)([a-záéíóúñ])/g, (m, a, l) => a + l.toUpperCase());
}

/**
 * Recorta en una palabra entera y agrega "…". Los títulos de los buscadores
 * se cortan a unos 60 caracteres y las descripciones a unos 155: mejor que el
 * corte lo haga uno, en un lugar que se lea bien, y no Google a mitad de una
 * palabra.
 */
export function recortarEn(texto = '', maximo = 60) {
  const t = String(texto).replace(/\s+/g, ' ').trim();
  if (t.length <= maximo) return t;
  const corte = t.slice(0, maximo - 1);
  const ultimo = corte.lastIndexOf(' ');
  return `${corte.slice(0, ultimo > maximo * 0.6 ? ultimo : maximo - 1).replace(/[\s,.;:–—-]+$/, '')}…`;
}

/**
 * El titular reducido a lo que dice: minúsculas, sin tildes ni signos. Dos
 * notas con el mismo titular así son la misma nota contada dos veces (el
 * 25/09 había dos "El Senado aprueba la reforma de Zona Fría en Balcarce",
 * de dos medios distintos).
 */
export function titularNormalizado(titulo = '') {
  return String(titulo).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Saca de la lista las notas con un titular ya visto (en la lista o en
 *  `yaMostradas`), dejando la primera. */
export function sinTitularRepetido(notas = [], yaMostradas = []) {
  const vistos = new Set(yaMostradas.map((n) => titularNormalizado(n.titulo)));
  return notas.filter((n) => {
    const t = titularNormalizado(n.titulo);
    if (vistos.has(t)) return false;
    vistos.add(t);
    return true;
  });
}
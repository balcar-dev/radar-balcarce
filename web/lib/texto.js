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

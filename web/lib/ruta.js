// La dirección de cada nota: el titular adentro y el identificador al final.
//
//   antes    /nota/1tftag2
//   ahora    /nota/nuevo-mural-de-fangio-en-el-autodromo-local-1tftag2
//
// Tres motivos, en orden de importancia:
//
//   1. Google lee la dirección. Un titular ahí adentro le dice de qué trata
//      la página antes de abrirla, y es una de las pocas señales de posición
//      que dependen enteramente de nosotros.
//   2. Se comparte mejor. Una dirección que se entiende sin abrirla da más
//      confianza en un grupo de WhatsApp que una serie de letras.
//   3. Es lo que hace un medio.
//
// El identificador va AL FINAL y es lo único que cuenta. Si mañana se corrige
// el titular, la dirección cambia pero sigue apuntando a la misma nota, y el
// que traiga la vieja llega igual: la página se resuelve por el final y no por
// el titular entero. Por eso el identificador nunca tiene guiones.
//
// Está en un archivo aparte, sin importar nada, para poder probarlo sin
// levantar el sitio y para usarlo desde los scripts.

const MAXIMO = 70;

/**
 * El titular como parte de una dirección: minúsculas, sin tildes, sin
 * signos, con guiones. Se corta en una palabra entera, no a la mitad.
 */
export function slugDe(titulo = '') {
  const limpio = String(titulo)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (limpio.length <= MAXIMO) return limpio || 'nota';

  // Se corta en el último guion que entre, para no dejar una palabra a medias.
  const corte = limpio.slice(0, MAXIMO);
  const ultimo = corte.lastIndexOf('-');
  return (ultimo > 20 ? corte.slice(0, ultimo) : corte).replace(/-+$/, '');
}

/** Lo que va después de /nota/: "titular-en-guiones-id". */
export function parteDeNota(nota) {
  return `${slugDe(nota.titulo)}-${nota.id}`;
}

/** La dirección completa de una nota, sin dominio. */
export function rutaDeNota(nota) {
  return `/nota/${parteDeNota(nota)}`;
}

/**
 * De lo que llegó en la dirección al identificador de la nota.
 *
 * Acepta las dos formas: "titular-en-guiones-1tftag2" (la de ahora) y
 * "1tftag2" a secas (la de antes, que ya puede estar compartida por ahí).
 */
export function idDeRuta(parte = '') {
  const s = String(parte);
  return s.slice(s.lastIndexOf('-') + 1);
}

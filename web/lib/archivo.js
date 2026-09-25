// El archivo de notas: todo lo que alguna vez salió en la web, aunque ya no
// esté en la portada.
//
// Hasta el 25/09 la página de una nota existía mientras la nota estuviera en
// web/data/portada.json. El día que salía de ahí (porque la fuente la bajó o
// porque pasaron los días), la página dejaba de generarse y el enlace que ya
// estaba en Facebook, en un grupo de WhatsApp o en Google daba 404. Pasó con
// dos posteos de Facebook en su primer día.
//
// Ahora hay dos listas separadas:
//
//   portada.json   lo que se MUESTRA: portada, secciones, temas, buscador,
//                  feed. Sólo notas de las últimas 72 horas.
//   archivo.json   lo que tiene PÁGINA: todo lo publicado de los últimos 180
//                  días, con lo necesario para armar la página de la nota.
//
// Todo lo de acá es de una entrada y una salida, sin leer ni escribir
// archivos: generar-datos lo usa y las pruebas lo prueban sin red.

import { slugDe } from './ruta.js';

/** Cuánto se queda una nota en las listas del sitio. Es el mismo criterio que
 *  usa el panel para archivar lo que nadie decidió (panel/servidor.mjs,
 *  HORAS_PARA_ARCHIVAR), pero corre en la nube: el panel sólo archiva con la
 *  PC prendida, y el 25/09 la portada tenía 43 notas de más de tres días. */
export const HORAS_EN_PORTADA = 72;

/** Cuánto dura una página. Pasado eso, el enlace ya no circula. */
export const DIAS_DE_ARCHIVO = 180;

/** Tope de notas con página. Cada una son varios archivos en el sitio (la
 *  página y sus dos imágenes) y Cloudflare Pages acepta hasta 20.000 archivos
 *  por despliegue; además, cada nota más es tiempo de compilación. Si se pasa,
 *  se quedan primero las que salieron en las redes y después las más nuevas. */
export const MAXIMO_EN_ARCHIVO = 2500;

const HORA = 3600e3;
const tiempo = (n) => new Date(n?.fecha).getTime();
const porFecha = (a, b) => (tiempo(b) || 0) - (tiempo(a) || 0);

/**
 * ¿Esta nota va en las listas del sitio?
 *
 * Se cuenta desde `fecha`, que para las notas sin hora de la fuente ya es la
 * primera vez que la vimos (generar-datos la pone así): una nota vista por
 * primera vez hace cinco días no es de hoy aunque la fuente no diga la hora.
 * Sin ninguna fecha no se sabe, y se deja.
 */
export function vigenteEnPortada(nota, ahora = Date.now(), horas = HORAS_EN_PORTADA) {
  const t = tiempo(nota);
  if (!Number.isFinite(t)) return true;
  return Number(ahora) - t <= horas * HORA;
}

/** El slug de una dirección de nota ya publicada ("/nota/slug-id" o una
 *  dirección completa), o null si no se puede leer. */
function slugDeEnlace(enlace, id) {
  const m = String(enlace ?? '').match(/\/nota\/([^/?#]+)/);
  if (!m) return null;
  const fin = `-${id}`;
  return m[1].endsWith(fin) ? m[1].slice(0, -fin.length) || null : null;
}

/**
 * Las direcciones que ya salieron a la calle, por id de nota.
 *
 * Primero lo que el sitio ya sirve (el archivo y la portada anterior): esa
 * dirección es la que está compartida. Si no hay, la que se publicó en las
 * redes: el libro (web/data/redes.json) guarda el titular con el que salió el
 * posteo, que es con el que se armó el enlace. Así se rescatan los enlaces de
 * Facebook anteriores a este arreglo, cuya nota cambió de titular después.
 */
export function slugsConocidos({ archivo = [], anterior = [], libro = {} } = {}) {
  const conocidos = {};
  for (const n of [...archivo, ...anterior]) if (n?.id && n.slug) conocidos[n.id] = n.slug;
  for (const red of Object.values(libro ?? {})) {
    for (const [id, p] of Object.entries(red ?? {})) {
      // Las piezas de Instagram se anotan por "día/nombre", no por nota.
      if (id.includes('/') || conocidos[id]) continue;
      const slug = slugDeEnlace(p?.enlace, id) ?? (p?.titulo ? slugDe(p.titulo) : null);
      if (slug) conocidos[id] = slug;
    }
  }
  return conocidos;
}

/** La nota con su dirección fijada: la que ya tenía, o la de su titular de
 *  hoy si es la primera vez que sale. */
export function fijarSlug(nota, conocidos = {}) {
  return { ...nota, slug: conocidos[nota.id] || nota.slug || slugDe(nota.titulo) };
}

/** Los ids de notas que salieron en alguna red, según el libro. */
export function idsEnRedes(libro = {}) {
  const ids = new Set();
  for (const red of Object.values(libro ?? {})) {
    for (const [id, p] of Object.entries(red ?? {})) {
      if (!id.includes('/')) ids.add(id);
      else if (p?.notaId) ids.add(p.notaId);
    }
  }
  return ids;
}

/** El puntaje baja con las horas y cambia en cada corrida: en el archivo no
 *  sirve (la página no lo usa) y haría cambiar el archivo entero cada vez. */
export const sinPuntaje = ({ relevancia, ...resto }) => resto;

/** El texto de web/data/archivo.json. Una nota por línea: el archivo pesa
 *  megas y así cada corrida cambia sólo las líneas de las notas que cambiaron. */
export function comoArchivoJson(notas = []) {
  return `{"notas":[\n${notas.map((n) => JSON.stringify(n)).join(',\n')}\n]}\n`;
}

/**
 * El archivo nuevo, a partir del anterior y de lo publicado en esta corrida.
 *
 *   · Lo que está hoy en las listas entra (o se actualiza, si le corrigieron
 *     el titular o el copete). La dirección no cambia nunca.
 *   · Lo que ya estaba y hoy sigue publicado pero tiene más de 72 horas, se
 *     actualiza igual: una corrección llega también a la página vieja.
 *   · Lo que ya estaba y la ingesta ya no trae, queda como estaba.
 *   · Lo que alguien bloqueó, o que el semáforo ahora frena (`retiradas`),
 *     sale del archivo y su página deja de existir. Es lo que protege a un
 *     menor o a una víctima si se descubre tarde: no puede quedar una página
 *     vieja dando vueltas.
 *   · Más de 180 días, o pasado el tope, se va.
 */
export function actualizarArchivo({
  archivo = [], publicadas = [], enPortada = new Set(), retiradas = new Set(), enRedes = new Set(),
  ahora = Date.now(), dias = DIAS_DE_ARCHIVO, maximo = MAXIMO_EN_ARCHIVO,
} = {}) {
  const porId = new Map();
  for (const n of archivo) if (n?.id) porId.set(n.id, n);

  for (const n of publicadas) {
    const previa = porId.get(n.id);
    if (!previa && !enPortada.has(n.id)) continue;
    porId.set(n.id, { ...previa, ...n, slug: previa?.slug || n.slug || slugDe(n.titulo) });
  }

  for (const id of retiradas) porId.delete(id);

  const corte = Number(ahora) - dias * 24 * HORA;
  let notas = [...porId.values()]
    .map((n) => (enRedes.has(n.id) || n.redes ? { ...n, redes: true } : n))
    .filter((n) => !Number.isFinite(tiempo(n)) || tiempo(n) >= corte)
    .sort(porFecha);

  if (notas.length > maximo) {
    const deRedes = notas.filter((n) => n.redes).slice(0, maximo);
    const resto = notas.filter((n) => !n.redes).slice(0, maximo - deRedes.length);
    notas = [...deRedes, ...resto].sort(porFecha);
  }
  return notas;
}

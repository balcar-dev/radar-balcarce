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
//                  feed. Sólo notas de las últimas HORAS_EN_PORTADA (36
//                  desde el 28/09; eran 72).
//   archivo.json   lo que tiene PÁGINA: todo lo publicado de los últimos 180
//                  días, con lo necesario para armar la página de la nota.
//
// Todo lo de acá es de una entrada y una salida, sin leer ni escribir
// archivos: generar-datos lo usa y las pruebas lo prueban sin red.

import { slugDe } from './ruta.js';
import { tieneRespaldo } from './cuerpo.js';

/** Cuánto se queda una nota en las listas del sitio. Es el mismo criterio que
 *  usa el panel para archivar lo que nadie decidió (panel/servidor.mjs,
 *  HORAS_PARA_ARCHIVAR), pero corre en la nube: el panel sólo archiva con la
 *  PC prendida, y el 25/09 la portada tenía 43 notas de más de tres días. */
export const HORAS_EN_PORTADA = 36;

/**
 * Las notas que se sacaron a mano de la web (web/data/retiradas.json), fuera
 * del panel. Existe desde el 27/09: ese día se retiraron de una vez las notas
 * que nunca tendrían que haber salido (de otros países, chimentos, medios de
 * España, policiales de afuera, publicidad) y el panel estaba prendido, así
 * que sus decisiones se habrían pisado. Una nota de esta lista no sale en
 * ninguna lista ni tiene página, aunque la ingesta la vuelva a traer.
 * Devuelve el conjunto de ids; con un archivo vacío o roto, ninguno.
 */
export function idsRetiradosAMano(json) {
  const notas = json && typeof json === 'object' ? json.notas : null;
  if (!notas || typeof notas !== 'object') return new Set();
  return new Set(Object.keys(notas).filter((id) => notas[id] && notas[id].motivo));
}

/** Los campos que se pueden corregir a mano en web/data/correcciones.json.
 *  El cuerpo, desde el 27/09: Hernán pidió que Claude escriba el de las notas
 *  aprobadas que esperaban a Gemini ("hacé todo con Claude"). Se escribe con
 *  el mismo criterio (CRITERIO-EDITORIAL.md § 12), contra el texto de las
 *  fuentes, y la nota lo dice en "por". */
const CAMPOS_CORREGIBLES = ['titulo', 'copete', 'seccion', 'cuerpo'];

/**
 * Las correcciones a mano (web/data/correcciones.json, 27/09): el título, la
 * bajada o la sección de una nota ya publicada, arreglados en un repaso
 * editorial fuera del panel. Mandan sobre lo que escriba la IA en cada
 * corrida. Devuelve un Map id → { titulo?, copete?, seccion? }; con un
 * archivo vacío o roto, ninguna. Cada una tiene que decir por qué.
 */
export function correccionesAMano(json) {
  const notas = json && typeof json === 'object' ? json.notas : null;
  const salida = new Map();
  if (!notas || typeof notas !== 'object') return salida;
  for (const [id, c] of Object.entries(notas)) {
    if (!c || !c.motivo) continue;
    const campos = Object.fromEntries(CAMPOS_CORREGIBLES.filter((k) => typeof c[k] === 'string' && c[k].trim()).map((k) => [k, c[k].trim()]));
    if (Object.keys(campos).length) salida.set(id, campos);
  }
  return salida;
}

/** Aplica la corrección a mano de una nota, si la tiene. */
export function conCorreccion(nota, correcciones) {
  const c = nota?.id ? correcciones?.get(nota.id) : null;
  return c ? { ...nota, ...c } : nota;
}

/** Cuánto dura una página. Pasado eso, el enlace ya no circula. */
export const DIAS_DE_ARCHIVO = 180;

/** Tope de notas con página. Cada una son varios archivos en el sitio (la
 *  página y sus dos imágenes) y Cloudflare Pages acepta hasta 20.000 archivos
 *  por despliegue; además, cada nota más es tiempo de compilación. Si se pasa,
 *  se quedan primero las que salieron en las redes y después las más nuevas. */
const MAXIMO_EN_ARCHIVO = 2500;

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

/**
 * La fecha de una nota: la más vieja entre la que trae la ingesta, la de cada
 * una de sus fuentes, la que ya publicamos antes y la primera vez que la vimos.
 *
 * Los medios "actualizan" sus notas y el feed trae la fecha nueva: la de
 * Colapinto y Gasly en Bakú (sábado 26/09) figuraba "hace 46 minutos" el lunes
 * 28 (Hernán), y con la fecha corriéndose sola nunca salía de la portada. Una
 * nota puede envejecer, nunca rejuvenecer. Devuelve ISO, o la de la ingesta si
 * no hay ninguna fecha válida.
 */
export function fechaDeLaNota(nota, { fechaAnterior = null, visto = null } = {}) {
  const candidatas = [
    nota?.fecha, fechaAnterior, visto,
    ...(nota?.origenes ?? []).map((o) => o?.fecha),
  ].map((f) => (f ? new Date(f).getTime() : NaN)).filter(Number.isFinite);
  if (!candidatas.length) return nota?.fecha ?? null;
  return new Date(Math.min(...candidatas)).toISOString();
}

/** Horas que puede tener un hecho para publicarse por primera vez
 *  (PORTADA.horasParaEstrenar en ingesta/criterio.mjs; una prueba lo controla). */
export const HORAS_PARA_ESTRENAR = 12;

/**
 * ¿Esta nota llega tarde para estrenarse? Una nota que nunca salió no se
 * publica si el hecho (su fecha, ya corregida con fechaDeLaNota) tiene más de
 * HORAS_PARA_ESTRENAR. Lo ya publicado sigue su curso hasta HORAS_EN_PORTADA.
 *
 * 28/09, Hernán: "¿por qué trae noticias viejas todo el tiempo?". De 140 notas
 * publicadas desde el viernes, 40 salieron con el hecho de más de 24 horas y 20
 * de más de 48: lo de afuera esperaba a juntar medios, o esperaba cuerpo
 * porque Gemini no tenía cupo, y al destrabarse salía como nuevo.
 */
export function llegaTarde(fecha, ahora = Date.now(), horas = HORAS_PARA_ESTRENAR) {
  if (!fecha) return false;
  const t = new Date(fecha).getTime();
  if (!Number.isFinite(t)) return false;
  return Number(ahora) - t > horas * HORA;
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
 *   · Lo que ya estaba y hoy sigue publicado pero ya salió de las listas
 *     (más de HORAS_EN_PORTADA), se
 *     actualiza igual: una corrección llega también a la página vieja.
 *   · Lo que ya estaba y la ingesta ya no trae, queda como estaba.
 *   · Lo que alguien bloqueó, o que el semáforo ahora frena (`retiradas`),
 *     sale del archivo y su página deja de existir. Es lo que protege a un
 *     menor o a una víctima si se descubre tarde: no puede quedar una página
 *     vieja dando vueltas.
 *   · Lo que hoy no cumpliría la regla de las fuentes (de afuera y contado
 *     por un solo medio: tieneRespaldo) se va, salvo que haya salido en las
 *     redes, donde su enlace circula. Son las notas de antes del cruce de
 *     medios (27/09): el 27/09 eran 1.069 de 1.614 páginas.
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
    .filter((n) => n.redes || tieneRespaldo(n))
    .filter((n) => !Number.isFinite(tiempo(n)) || tiempo(n) >= corte)
    .sort(porFecha);

  if (notas.length > maximo) {
    const deRedes = notas.filter((n) => n.redes).slice(0, maximo);
    const resto = notas.filter((n) => !n.redes).slice(0, maximo - deRedes.length);
    notas = [...deRedes, ...resto].sort(porFecha);
  }
  return notas;
}

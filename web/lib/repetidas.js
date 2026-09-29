// La misma noticia con dos direcciones (29/09, pendiente A1 de la auditoría).
//
// Una nota ya publicada puede volver a entrar como nota nueva, con otra
// dirección, cuando el medio cambia el enlace o cuando otro medio pasa a ser la
// fuente principal: el identificador sale del enlace (idDe, ingesta/ingesta.mjs).
// La portada ya no las mostraba juntas (sinNotasRepetidas, lib/texto.js), pero
// cada una conservaba su página: el 29/09 había once pares con el título
// idéntico ("Boccanera y Baigorria ganan…" el 27 y el 28/09) y varios casi
// iguales ("Reabre el Autódromo Juan Manuel Fangio", tres veces). Compiten entre
// sí en Google y se ve desprolijo.
//
// Acá se decide cuál queda: la que fue a las redes (su enlace circula), si no la
// que tiene cuerpo, y si no la primera que salió. Las otras se retiran y su
// dirección redirige a la que queda (web/scripts/generar-redirects.mjs, con lo
// que guarda web/data/fusionadas.json). Es a propósito estricto: dos títulos con
// casi todas las palabras que dicen algo en común, publicados con menos de
// cuatro días de diferencia. Dos notas distintas del mismo tema (la pole y la
// carrera) tienen títulos distintos y no se tocan.
//
// Sin dependencias de React: la usa web/scripts/generar-datos.mjs.

import { sinTildes } from './texto.js';
import { tieneCuerpo } from './cuerpo.js';
import { rutaDeNota } from './ruta.js';

/** Palabras que no dicen de qué trata un título. */
const VACIAS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en', 'y', 'e', 'a', 'al', 'por', 'para', 'con',
  'que', 'se', 'su', 'sus', 'tras', 'sobre', 'este', 'esta', 'hoy', 'mas', 'muy', 'ya', 'o', 'u', 'le', 'les', 'lo',
]);

/** Las palabras que dicen algo de un título, sin tildes ni mayúsculas. */
export const palabrasQueDicen = (titulo = '') => new Set(
  sinTildes(String(titulo)).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !VACIAS.has(w)),
);

/** Cuánto se parecen dos títulos: palabras en común sobre palabras en total (0 a 1). */
export function parecido(a, b) {
  const A = palabrasQueDicen(a);
  const B = palabrasQueDicen(b);
  if (A.size < 3 || B.size < 3) return 0;
  const comunes = [...A].filter((w) => B.has(w)).length;
  return comunes / (A.size + B.size - comunes);
}

export const REPETIDAS = {
  /** Desde cuánto parecido dos títulos son la misma noticia. */
  umbral: 0.8,
  /** Cuántas horas puede haber entre las dos. */
  horas: 96,
};

const tiempo = (n) => Date.parse(n?.fecha ?? '') || 0;

/**
 * De un grupo de notas que son la misma noticia, la que queda: la que fue a las
 * redes, la que tiene cuerpo, la primera que salió.
 */
function laQueQueda(grupo, enRedes) {
  return [...grupo].sort((x, y) => (Number(enRedes.has(y.id) || !!y.redes) - Number(enRedes.has(x.id) || !!x.redes))
    || (Number(tieneCuerpo(y)) - Number(tieneCuerpo(x)))
    || (tiempo(x) - tiempo(y))
    || String(x.id).localeCompare(String(y.id)))[0];
}

/**
 * Las notas que son otra copia de una que queda: Map id → id de la que queda.
 * No toca las notas propias (la del dólar de cada día se parece a la del día
 * anterior y no es la misma) ni las que fueron a las redes (su enlace circula:
 * se quedan, aunque haya otra igual).
 */
export function repetidasConOtraDireccion(notas = [], { enRedes = new Set(), umbral = REPETIDAS.umbral, horas = REPETIDAS.horas } = {}) {
  const lista = [];
  const vistas = new Set();
  for (const n of notas) {
    if (!n?.id || n.propia || !n.titulo || vistas.has(n.id)) continue;
    vistas.add(n.id);
    lista.push(n);
  }
  // Grupos: dos notas parecidas van al mismo grupo (y las parecidas a ellas también).
  const padre = new Map(lista.map((n) => [n.id, n.id]));
  const raiz = (id) => { let r = id; while (padre.get(r) !== r) r = padre.get(r); padre.set(id, r); return r; };
  for (let i = 0; i < lista.length; i += 1) {
    for (let j = i + 1; j < lista.length; j += 1) {
      if (Math.abs(tiempo(lista[i]) - tiempo(lista[j])) > horas * 3600e3) continue;
      if (parecido(lista[i].titulo, lista[j].titulo) >= umbral) padre.set(raiz(lista[j].id), raiz(lista[i].id));
    }
  }
  const grupos = new Map();
  for (const n of lista) {
    const r = raiz(n.id);
    if (!grupos.has(r)) grupos.set(r, []);
    grupos.get(r).push(n);
  }
  const fusion = new Map();
  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue;
    const queda = laQueQueda(grupo, enRedes);
    for (const n of grupo) {
      if (n.id === queda.id || enRedes.has(n.id) || n.redes) continue;
      fusion.set(n.id, queda.id);
    }
  }
  return fusion;
}

/** Cuántos días se guarda la redirección de una repetida (lo que dura la página de una nota). */
export const DIAS_DE_FUSIONADAS = 180;

/**
 * web/data/fusionadas.json con las de esta corrida sumadas: { notas: { id: { a,
 * ruta, cuando } } }. `ruta` es la dirección que tenía la repetida (la que
 * puede estar compartida) y `a`, la nota que queda. La primera fecha no se
 * pisa; las de más de DIAS_DE_FUSIONADAS días se van.
 */
export function conFusionadas(antes, fusion, porId, ahora = new Date()) {
  const limite = ahora.getTime() - DIAS_DE_FUSIONADAS * 864e5;
  const notas = Object.fromEntries(Object.entries(antes?.notas ?? {}).filter(([, f]) => Date.parse(f?.cuando ?? '') >= limite));
  for (const [id, a] of fusion) {
    const nota = porId.get(id);
    if (!nota) continue;
    notas[id] = { a, ruta: notas[id]?.ruta ?? rutaDeNota(nota), cuando: notas[id]?.cuando ?? ahora.toISOString() };
  }
  return { notas };
}

/** Las redirecciones de las repetidas a la nota que queda (si todavía tiene página). */
export function redireccionesDeFusionadas(fusionadas, rutaDe) {
  const salida = [];
  for (const [id, f] of Object.entries(fusionadas?.notas ?? {})) {
    const destino = rutaDe(f.a);
    if (!destino) continue;
    if (f.ruta && f.ruta !== destino) salida.push({ origen: f.ruta, destino });
    salida.push({ origen: `/nota/${id}`, destino });
  }
  return salida;
}

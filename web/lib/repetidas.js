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
import { enlacesDeLaNota } from '../../ingesta/repetidas-publicadas.mjs';

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
function laQueQueda(grupo, enRedes, conFoto = new Set()) {
  return [...grupo].sort((x, y) => (Number(enRedes.has(y.id) || !!y.redes) - Number(enRedes.has(x.id) || !!x.redes))
    || (Number(conFoto.has(y.id)) - Number(conFoto.has(x.id)))
    || (Number(tieneCuerpo(y)) - Number(tieneCuerpo(x)))
    || (tiempo(x) - tiempo(y))
    || String(x.id).localeCompare(String(y.id)))[0];
}

/**
 * Las notas que son otra copia de una que queda: Map id → id de la que queda.
 * No toca las notas propias (la del dólar de cada día se parece a la del día
 * anterior y no es la misma) ni las que fueron a las redes (su enlace circula:
 * se quedan, aunque haya otra igual).
 *
 * `preferidas` son parejas [laQueYaEstaba, laNueva] (ya incluidas en `confirmadas`): en su grupo la nueva nunca
 * es la que queda, tenga o no foto (15/10/2026, M2 de la revisión: una nota no rejuvenece; si la nueva trae foto,
 * se la pasa a la que queda con `fotosParaLaQueQueda`).
 *
 * `firmes` (Map id → id de la que quedó, de `unionesFirmes`): las uniones de corridas anteriores, que quedan firmes (regla 175,
 * hueco 4). La unida nunca es la que queda; si la que quedó no está en la lista (una persona la retiró, o se fue en esta
 * corrida), la unida igual queda afuera y redirige a ella: es la misma noticia.
 */
export function repetidasConOtraDireccion(notas = [], {
  enRedes = new Set(), umbral = REPETIDAS.umbral, horas = REPETIDAS.horas, confirmadas = [], conFoto = new Set(), preferidas = [],
  firmes = new Map(),
} = {}) {
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
  // Las que la IA confirmó que cuentan el mismo hecho aunque los títulos no se parezcan (1/10: "La Cooperativa corta la luz el
  // viernes en un sector" y "La Cooperativa de Electricidad corta el suministro el viernes").
  for (const [a, b] of confirmadas) {
    if (padre.has(a) && padre.has(b)) padre.set(raiz(b), raiz(a));
  }
  const fueALasRedes = new Set(lista.filter((n) => enRedes.has(n.id) || n.redes).map((n) => n.id));
  // Las uniones firmes de antes (regla 175): la unida va al grupo de la que quedó y no puede quedar ella. Lo que fue a las
  // redes no es una unión firme (unionesFirmes tampoco las devuelve): se queda como siempre.
  const firmesVigentes = [...firmes].filter(([id, a]) => padre.has(id) && id !== a && !fueALasRedes.has(id));
  const firmesSinLaQueQueda = new Map();
  for (const [id, a] of firmesVigentes) {
    if (padre.has(a)) padre.set(raiz(id), raiz(a));
    else firmesSinLaQueQueda.set(id, a);
  }
  // La nueva de una pareja «preferida» no puede quedar (sólo si la que ya estaba está en la lista), ni la unida firme. Salvo
  // que haya ido a las redes: ésa se queda igual (su enlace circula), así que es mejor que sea la que queda y la otra redirija
  // a ella (la Zona Fría del 13/10: la de Balcarce fue a Facebook; la de Política, no).
  const noQuedan = new Set(preferidas.filter(([vieja, nueva]) => padre.has(vieja) && padre.has(nueva)).map(([, nueva]) => nueva));
  for (const [id] of firmesVigentes) noQuedan.add(id);
  for (const id of fueALasRedes) noQuedan.delete(id);
  const grupos = new Map();
  for (const n of lista) {
    const r = raiz(n.id);
    if (!grupos.has(r)) grupos.set(r, []);
    grupos.get(r).push(n);
  }
  const fusion = new Map();
  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue;
    const candidatas = grupo.filter((n) => !noQuedan.has(n.id));
    const queda = laQueQueda(candidatas.length ? candidatas : grupo, enRedes, conFoto);
    for (const n of grupo) {
      if (n.id === queda.id || enRedes.has(n.id) || n.redes) continue;
      fusion.set(n.id, queda.id);
    }
  }
  // Una unida firme cuya «que queda» no está en la lista (sola, o sin otra que pueda quedar en su grupo): igual afuera,
  // redirigida a la de antes; y las que se le habían unido en esta corrida van a ésa también.
  for (const [id, a] of firmesSinLaQueQueda) {
    const n = lista.find((x) => x.id === id);
    if (fusion.has(id) || !n || enRedes.has(id) || n.redes) continue;
    fusion.set(id, a);
    for (const [otra, queda] of fusion) if (queda === id) fusion.set(otra, a);
  }
  return fusion;
}

/**
 * De las parejas [x, y] que cuentan lo mismo (las que confirmó la IA), las que tienen una ya publicada y otra no, como
 * [laPublicada, laNueva]: para pasarlas como `preferidas` (regla 175, hueco 5: queda la que ya salió, con su sección).
 */
export function conLaPublicadaPrimero(parejas = [], yaSalieron = new Set()) {
  const salida = [];
  for (const [x, y] of parejas) {
    if (yaSalieron.has(x) && !yaSalieron.has(y)) salida.push([x, y]);
    else if (yaSalieron.has(y) && !yaSalieron.has(x)) salida.push([y, x]);
  }
  return salida;
}

/**
 * Las uniones que quedan firmes (regla 175, hueco 4: «una unión no queda firme»). Hasta el 15/10, web/data/fusionadas.json
 * sólo armaba las redirecciones: en cada corrida la unión se recalculaba desde cero y, si las dos notas ya no «se
 * reconocían», la unida volvía a tener página propia y se volvía a escribir con IA (de 100 unidas, 8 habían vuelto; la
 * segunda de la VTV se escribió 4 veces el 15/10). Devuelve Map id → id de la que quedó, con las unidas que:
 *   · no fueron a las redes (`enRedes`: su enlace circula y se queda, como siempre);
 *   · no las aprobó una persona después de la unión (`aprobadas`: id → cuándo; una persona manda: así se deshace una unión,
 *     o borrando su renglón de fusionadas.json);
 *   · tienen una «que queda» de verdad: siguiendo la cadena (como las redirecciones), alguna tiene página (`conPagina`) o la
 *     retiró una persona (`retiradasPorPersona`: la misma noticia que una persona sacó no vuelve por la otra dirección).
 *     Si ninguna de la cadena sigue (se fue por otro motivo), la unión no se fuerza y todo queda como antes.
 */
export function unionesFirmes(fusionadas, {
  conPagina = new Set(), retiradasPorPersona = new Set(), aprobadas = new Map(), enRedes = new Set(),
} = {}) {
  const notas = fusionadas?.notas ?? {};
  const firmes = new Map();
  for (const [id, f] of Object.entries(notas)) {
    if (!f?.a || f.a === id || enRedes.has(id)) continue;
    if (aprobadas.has(id)) {
      const cuando = Date.parse(aprobadas.get(id) ?? '');
      const union = Date.parse(f.cuando ?? '');
      if (!cuando || !union || cuando >= union) continue;
    }
    const cadena = [];
    let siguiente = f.a;
    while (siguiente && siguiente !== id && !cadena.includes(siguiente) && cadena.length < 6) {
      cadena.push(siguiente);
      siguiente = notas[siguiente]?.a;
    }
    // Una cadena que vuelve a empezar (dos que se apuntan entre sí) no tiene «la que queda»: no se fuerza.
    if (siguiente === id || cadena.includes(siguiente)) continue;
    if (!cadena.some((x) => conPagina.has(x) || retiradasPorPersona.has(x))) continue;
    firmes.set(id, f.a);
  }
  return firmes;
}

/**
 * Si la que queda no tiene foto y una de las que se le unieron sí (la nueva trajo la foto y la que ya estaba no),
 * la foto pasa a la que queda en vez de cambiar cuál queda. Devuelve Map idDeLaQueQueda → idDeLaQueTrajoLaFoto.
 * `conFoto` son los ids con foto en el banco (de donde sale la foto) y `yaTienen`, los que ya muestran una.
 */
export function fotosParaLaQueQueda(fusion = new Map(), { conFoto = new Set(), yaTienen = new Set() } = {}) {
  const pasan = new Map();
  for (const [id, queda] of fusion) {
    if (id === queda || pasan.has(queda) || conFoto.has(queda) || yaTienen.has(queda) || !conFoto.has(id)) continue;
    pasan.set(queda, id);
  }
  return pasan;
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
    notas[id] = {
      a, ruta: notas[id]?.ruta ?? rutaDeNota(nota), cuando: notas[id]?.cuando ?? ahora.toISOString(),
      // La sección, para que si la que queda pierde su página la dirección vieja lleve a la sección y no dé 404 (W-6).
      ...((nota.seccion ?? notas[id]?.seccion) ? { seccion: nota.seccion ?? notas[id].seccion } : {}),
    };
  }
  return { notas };
}

/**
 * Las redirecciones de las repetidas a la nota que queda. W-6 (8/10/2026): si la que queda ya no tiene página, se sigue la cadena
 * (a su vez unida a otra) y, si no se llega a ninguna con página, se lleva a la sección de la repetida (`rutaDeSeccion`) o a la
 * portada, en vez de dejar la dirección compartida con un 404.
 */
export function redireccionesDeFusionadas(fusionadas, rutaDe, { rutaDeSeccion = () => null } = {}) {
  const salida = [];
  const notas = fusionadas?.notas ?? {};
  for (const [id, f] of Object.entries(notas)) {
    let destino = rutaDe(f.a);
    for (let saltos = 0, siguiente = f.a; !destino && saltos < 5 && notas[siguiente]; saltos += 1) {
      siguiente = notas[siguiente].a;
      destino = rutaDe(siguiente);
    }
    if (!destino) destino = rutaDeSeccion(f.seccion) ?? '/';
    if (f.ruta && f.ruta !== destino) salida.push({ origen: f.ruta, destino });
    salida.push({ origen: `/nota/${id}`, destino });
  }
  return salida;
}

// ----------------------------------------------- las repetidas con otras palabras (1/10)
//
// Dos notas que cuentan el mismo hecho con títulos distintos no llegan al umbral de parecido
// (0,8) y la IA de la lectura, que mira cien notas juntas, a veces no las junta: el 1/10 salieron
// dos de la Cooperativa y dos del RENAPER. Acá se eligen las parejas SOSPECHOSAS (misma sección,
// poco tiempo de diferencia, algo de parecido) para preguntarle a la IA sólo por ellas. Desde el 15/10
// (regla 175), también en otra sección y con menos parecido si las dos citan la misma nota de otro medio. Desde el 17/10
// (regla 195), lo de acá también en otra sección: «SUTEBA Balcarce adhiere al paro…» salió en Balcarce y en Política.

export const PAREJAS = {
  /** Desde cuánto parecido de títulos vale la pena preguntar (abajo del umbral de REPETIDAS). */
  minimo: 0.3,
  /** …y si las dos citan la misma nota de otro medio (regla 175), aunque estén en otra sección. */
  minimoConFuente: 0.15,
  /** Cuántas horas puede haber entre las dos. */
  horas: 72,
  /** Cuántas parejas se preguntan por corrida. */
  porCorrida: 24,
  /** Cuántas van en el pedido de cada corrida, sumadas las de significado de lo de acá (regla 195). */
  porPedido: 30,
};

/** ¿Las dos son de acá? Entonces se comparan aunque estén en otra sección (regla 195: SUTEBA en Balcarce y en Política). */
const lasDosDeAca = (a, b) => [a, b].every((n) => !!(n.local || n.deLaZona || n.deUnMedioDeAca));

/** La clave de una pareja, igual en cualquier orden. */
export const clavePareja = (a, b) => [String(a), String(b)].sort().join('|');

/**
 * Las parejas a preguntar: [{ clave, a, b }] con las notas. No repite las que ya se decidieron
 * (`decididas`: { clave: true|false }) ni las que ya son la misma por título (esas las junta
 * repetidasConOtraDireccion), y no toca las notas propias.
 */
export function parejasSospechosas(notas = [], {
  decididas = {}, minimo = PAREJAS.minimo, umbral = REPETIDAS.umbral, horas = PAREJAS.horas, tope = PAREJAS.porCorrida,
  minimoConFuente = PAREJAS.minimoConFuente,
} = {}) {
  const lista = [];
  const vistas = new Set();
  for (const n of notas) {
    if (!n?.id || n.propia || !n.titulo || !n.seccion || vistas.has(n.id)) continue;
    vistas.add(n.id);
    lista.push(n);
  }
  const salida = [];
  // En otra sección también, si las dos citan la misma nota de otro medio (regla 175, hueco 5: la misma noticia cae en
  // Política y en Balcarce, o en Balcarce y en Cultura). Igual decide la IA; y con lo ya publicado queda la publicada.
  const enlaces = new Map(lista.map((n) => [n.id, enlacesDeLaNota(n)]));
  const citanLoMismo = (a, b) => [...enlaces.get(a.id)].some((e) => enlaces.get(b.id).has(e));
  for (let i = 0; i < lista.length; i += 1) {
    for (let j = i + 1; j < lista.length; j += 1) {
      const [a, b] = [lista[i], lista[j]];
      if (Math.abs(tiempo(a) - tiempo(b)) > horas * 3600e3) continue;
      const citan = citanLoMismo(a, b);
      if (a.seccion !== b.seccion && !citan && !lasDosDeAca(a, b)) continue;
      const clave = clavePareja(a.id, b.id);
      if (clave in decididas) continue;
      const p = parecido(a.titulo, b.titulo);
      if (p >= (citan ? Math.min(minimo, minimoConFuente) : minimo) && p < umbral) salida.push({ clave, a, b, p });
    }
  }
  return salida.sort((x, y) => y.p - x.p).slice(0, tope).map(({ clave, a, b }) => ({ clave, a, b }));
}

/**
 * A las notas de `notas` que tienen una pareja confirmada, les suma las fuentes de la otra
 * (`medios` y `fuentesConsultadas`, sin repetir): así la foto se busca en todas las fuentes de la
 * misma noticia (1/10, Hernán: "usar la foto si se repite en varias fuentes"). Modifica las notas.
 */
export function sumarFuentesDeParejas(notas = [], confirmadas = []) {
  const porId = new Map(notas.map((n) => [n.id, n]));
  for (const [x, y] of confirmadas) {
    const [a, b] = [porId.get(x), porId.get(y)];
    if (!a || !b) continue;
    for (const [dest, orig] of [[a, b], [b, a]]) {
      dest.medios = [...new Set([...(dest.medios ?? []), ...(orig.medios ?? [])])];
      const enlaces = new Set((dest.fuentesConsultadas ?? []).map((f) => f.enlace));
      const nuevas = (orig.fuentesConsultadas ?? []).filter((f) => f.enlace && !enlaces.has(f.enlace));
      if (nuevas.length) dest.fuentesConsultadas = [...(dest.fuentesConsultadas ?? []), ...nuevas];
    }
  }
  return notas;
}

// "Muy contada": lo de afuera que cuenta medio país (regla 197, 17/10/2026).
//
// Hernán: "lo de Balcarce entra todo; lo nacional, según su popularidad (cuántos medios lo cuentan) y que sea
// de interés". Hasta acá la cantidad de medios era sólo una puerta (2, 3 o 4 según la sección) y un puntaje que
// dejaba de crecer a los 5 medios: el 15/10 no salieron la sesión caída de Diputados (23 medios), los incidentes
// de la Marcha Federal Universitaria (18) ni el financiamiento universitario (16), y sí "La Messi Cup define
// fechas" (2). La medición, en docs/auditoria-2-0/02-FUENTES-CRITERIO-REPETIDAS.md § 2.
//
// Qué es (los números, en MUY_CONTADA de ingesta/criterio.mjs):
//   · una historia de AFUERA que cuentan 8 medios distintos o más (los del mismo dueño cuentan uno), o que junta
//     5 en sus primeras 3 horas (4 si empezó de noche, de 20 a 7: de noche se publica menos);
//   · con el hecho de menos de 24 horas y alguna nota de las últimas 12;
//   · que sea noticia: "dónde ver", "a qué hora juega", el "en vivo", la cotización del dólar o el pronóstico no lo
//     son aunque los cuenten todos. Lo demás que no es noticia (chimentos, lo del extranjero sin un argentino,
//     lo frenado por el semáforo) ya no llega verde: esto sólo mira lo que el semáforo dejó salir.
//
// Qué gana: sale aunque el cupo de su sección esté lleno (aplicarCupos, ingesta/ingesta.mjs) y va primera en su
// sección durante 6 horas (web/lib/datos.js). Como mucho 2 del mismo tema a la vez (la marcha universitaria eran
// cinco historias): las de más medios. Policiales de afuera sigue sin salir (cupo 0, la sección es de acá).
//
// Sin dependencias: sólo lo que trae Node.

import { MUY_CONTADA, CUPO_DE_AFUERA, CUPO_POR_DEFECTO } from './criterio.mjs';
import { horaAR } from './zona.mjs';
import { REGLAS_SEMAFORO } from './fuentes.mjs';

const HORA = 3600e3;
const plano = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9ñ%°\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Lo que no es noticia aunque lo cuenten todos los medios. Se mira sólo el título. */
// "La formación de Estudiantes para la semifinal" (18 medios, 15/10) y la alerta del clima de otra ciudad ("Alerta
// amarilla en CABA", 11 medios) tampoco: son servicio, no la noticia del día.
const NO_ES_NOTICIA = /\b(donde ver|por donde ver|como ver|a que hora juega|a que hora juegan|a que hora y donde|a que hora es|en que canal|que canal (pasa|transmite)|tv en vivo|formaciones|la formacion|formacion (de|confirmada|titular|probable)|en vivo|minuto a minuto|en directo|cuando vuelve a jugar|cuando juega|cuando se juega|venta de entradas|entradas a la venta|a la venta las entradas|como comprar (las )?entradas|horoscopo|quiniela|pronostico (del tiempo|extendido|para)|el tiempo en|como estara el (tiempo|clima)|clima en|clima hoy|alerta (amarilla|naranja|roja))\b/;

/** ¿El título es de lo que no es noticia aunque lo cuenten todos (dónde ver, en vivo, la cotización…)? */
export function noEsNoticiaAunqueLaCuentenTodos(titulo = '') {
  const t = plano(titulo);
  if (NO_ES_NOTICIA.test(t)) return true;
  return (REGLAS_SEMAFORO.cotizacion ?? []).some((p) => t.includes(plano(p)));
}

/** Cuántos nombres distintos hay (si quien llama no pasa su forma de contar medios). */
const contarNombres = (nombres) => new Set((nombres ?? []).filter(Boolean)).size;

const fechaDe = (n) => n?.fecha;

/**
 * ¿Por qué es muy contada esta nota? Devuelve { medios, porque } o null. No mira si es de acá ni el semáforo:
 * eso lo hace marcarMuyContadas.
 *
 * @param {object} nota  de la ingesta: medios, origenes (con medio y fecha), fecha, titulo
 * @param {{ ahora?: number, fecha?: (n) => string|Date, contar?: (nombres: string[]) => number }} [o]
 */
export function porQueEsMuyContada(nota, { ahora = Date.now(), fecha = fechaDe, contar = contarNombres } = {}) {
  if (!nota || nota.propia) return null;
  const delHecho = Date.parse(fecha(nota) ?? '');
  if (!Number.isFinite(delHecho) || ahora - delHecho > MUY_CONTADA.horasDelHecho * HORA) return null;
  const conFecha = (nota.origenes ?? []).filter((o) => o?.medio && Number.isFinite(Date.parse(o.fecha ?? '')));
  const ultima = conFecha.length ? Math.max(...conFecha.map((o) => Date.parse(o.fecha))) : delHecho;
  if (ahora - ultima > MUY_CONTADA.horasDeLaUltimaNota * HORA) return null;
  if (noEsNoticiaAunqueLaCuentenTodos(nota.titulo)) return null;
  const medios = contar(nota.medios?.length ? nota.medios : [nota.medio]);
  if (medios >= MUY_CONTADA.medios) return { medios, porque: `${medios} medios` };
  // La velocidad: cuántos medios la contaron en sus primeras horas. Avisa antes (de las que juntan 5 medios en
  // 3 horas, el 85 % termina con 8 o más; de noche, las 4 que juntaron 4 terminaron las 4 con 8 o más).
  if (!conFecha.length) return null;
  const inicio = Math.min(...conFecha.map((o) => Date.parse(o.fecha)));
  const temprano = contar(conFecha.filter((o) => Date.parse(o.fecha) - inicio <= MUY_CONTADA.horasRapidas * HORA).map((o) => o.medio));
  const h = horaAR(new Date(inicio));
  const deNoche = h >= MUY_CONTADA.nocheDesde || h < MUY_CONTADA.nocheHasta;
  const pide = deNoche ? MUY_CONTADA.mediosRapidosDeNoche : MUY_CONTADA.mediosRapidos;
  if (temprano >= pide) {
    return { medios, porque: `${temprano} medios en sus primeras ${MUY_CONTADA.horasRapidas} horas${deNoche ? ', de noche' : ''}` };
  }
  return null;
}

// ------------------------------------------------------------------ el tema

// Las palabras de un título que no dicen de qué trata (cinco letras o más que están en cualquier titular).
const VACIAS = new Set([
  'balcarce', 'argentina', 'argentino', 'argentinos', 'nacional', 'gobierno', 'provincia', 'provincial', 'nuevo',
  'nueva', 'nuevos', 'nuevas', 'sobre', 'desde', 'hasta', 'entre', 'durante', 'luego', 'antes', 'despues', 'cuando',
  'donde', 'todos', 'todas', 'tiene', 'tienen', 'puede', 'pueden', 'hacer', 'parte', 'semana', 'fecha', 'jornada',
  'otros', 'otras', 'primer', 'primera', 'segundo', 'segunda', 'grande', 'grandes', 'sigue', 'siguen', 'vuelve',
  'vuelven', 'llega', 'llegan', 'tras', 'contra', 'porque', 'mientras', 'dijo', 'aseguro', 'confirmo', 'anuncio',
  'presidente', 'personas', 'millones', 'pesos', 'record', 'video', 'fotos',
]);

/** Las raíces (las primeras siete letras) de las palabras de un título que dicen de qué trata. */
function raicesDelTitulo(titulo = '') {
  return plano(titulo).split(' ').filter((w) => w.length >= 5 && !VACIAS.has(w)).map((w) => ({ raiz: w.slice(0, 7), larga: w.length >= 8 }));
}

/**
 * ¿Estas dos historias son del mismo tema? Comparten dos raíces de palabras que dicen algo, o una sola de una palabra
 * larga (ocho letras o más: "universitaria", "Diputados", "Confessore"). Es la misma idea que temaParecido de las redes
 * (redes/elegir.mjs), con raíces para que "universitaria" y "universitario" sean lo mismo. No junta historias: sólo
 * decide el tope por tema.
 */
export function mismoTema(a, b) {
  const A = raicesDelTitulo(a?.titulo);
  const deA = new Set(A.map((x) => x.raiz));
  const compartidas = raicesDelTitulo(b?.titulo).filter((x) => deA.has(x.raiz));
  const unicas = new Set(compartidas.map((x) => x.raiz));
  return unicas.size >= 2 || compartidas.some((x) => x.larga && A.some((y) => y.raiz === x.raiz && y.larga));
}

/**
 * Marca las muy contadas de la portada (`muyContada: { medios, porque }`) y les saca la marca a las que ya no lo son.
 * Sólo lo de afuera (`esDeAca` dice qué no lo es), sólo lo verde y sólo de secciones con cupo de afuera (Policiales
 * de afuera no sale solo). Como mucho MUY_CONTADA.porTema del mismo tema: las de más medios; la que queda afuera
 * del tope sigue como cualquier otra (compite por el cupo). Modifica la portada y la devuelve.
 */
export function marcarMuyContadas(portada, {
  ahora = Date.now(), fecha = fechaDe, contar = contarNombres, esDeAca = () => false,
} = {}) {
  const candidatas = [];
  for (const n of portada) {
    delete n.muyContada;
    if (n.semaforo !== 'verde' || n.oficial || n.propia || esDeAca(n)) continue;
    if ((CUPO_DE_AFUERA[n.seccion] ?? CUPO_POR_DEFECTO) === 0) continue;
    const mc = porQueEsMuyContada(n, { ahora, fecha, contar });
    if (mc) candidatas.push([n, mc]);
  }
  candidatas.sort((a, b) => (b[1].medios - a[1].medios) || ((b[0].relevancia ?? 0) - (a[0].relevancia ?? 0)));
  const elegidas = [];
  for (const [n, mc] of candidatas) {
    if (elegidas.filter((e) => mismoTema(e, n)).length >= MUY_CONTADA.porTema) continue;
    n.muyContada = mc;
    elegidas.push(n);
  }
  return portada;
}

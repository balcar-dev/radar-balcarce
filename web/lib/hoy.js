// Lo de hoy en una sola dirección: /hoy (17/10/2026, regla 255).
//
// Una página pensada para mandarla por WhatsApp ("pasame lo de hoy"): arriba lo de Balcarce, después lo que más medios contaron, y los
// servicios del día (farmacia de turno, agenda). Se arma al compilar, igual que la portada, con las mismas notas de las últimas 36 horas
// (`obtenerDatos().notas`), así que no suma nada nuevo que publicar ni cambia ninguna regla de qué sale: sólo las vuelve a ordenar para
// quien quiere una lista corta del día.
//
// "Hoy" es el día de Balcarce (UTC-3). Si todavía hay pocas notas de hoy (a la madrugada), se completa con las de las últimas 24 horas y la
// página lo dice ("lo último de las 24 horas"): nunca queda vacía a las 00:30 ni se hace pasar lo de ayer por lo de hoy.
//
// Sin imports con "@/": las pruebas lo cargan con node pelado.

import { noSeOfreceAGoogle } from './cuerpo.js';
import { partesEnBalcarce } from './tiempo.js';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Cuántas notas de hoy hacen falta para no completar con las de las últimas 24 horas. */
export const MINIMO_DE_NOTAS_DE_HOY = 6;
/** Cuántas notas lleva cada bloque. */
export const NOTAS_DE_BALCARCE = 8;
export const NOTAS_MAS_CONTADAS = 6;
/** Cuántos medios hacen falta para ir en "Lo más contado". */
export const MEDIOS_PARA_MAS_CONTADA = 2;

/** "jueves 17 de octubre" para el día de Balcarce de `ahora`. */
export function diaEscrito(ahora = Date.now()) {
  const p = partesEnBalcarce(new Date(ahora).toISOString());
  return p ? `${DIAS[p.diaSemana]} ${p.dia} de ${MESES[p.mes]}` : '';
}

/** "2026-10-17" para el día de Balcarce de `ahora`. */
export function diaIso(ahora = Date.now()) {
  const p = partesEnBalcarce(new Date(ahora).toISOString());
  return p ? `${p.anio}-${String(p.mes + 1).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}` : '';
}

/** El título de la página: el nombre y el día, con la marca detrás sólo si todo junto entra en 70 caracteres (igual que las notas). */
export function tituloDeHoy(ahora = Date.now(), marca = 'Radar Balcarce') {
  const t = `Lo de hoy en Balcarce · ${diaEscrito(ahora)}`;
  return `${t} · ${marca}`.length <= 70 ? `${t} · ${marca}` : t;
}

/** Cuántos medios distintos contaron la nota. */
export function mediosDe(nota) {
  return new Set((nota?.medios ?? []).map((m) => (typeof m === 'string' ? m : m?.nombre)).filter(Boolean)).size;
}

const esDeBalcarce = (n) => !!(n.local || n.nombraBalcarce);

/**
 * Arma las listas de /hoy a partir de las notas que se muestran.
 * Devuelve { ventana: 'hoy' | '24h', balcarce, masContadas, total } con notas ya elegidas y ordenadas.
 *   · balcarce: lo de acá. Primero lo que contaron tres medios de Balcarce o más (`muyContadaDeAca`), después por relevancia y por hora.
 *   · masContadas: lo de afuera (y lo de acá que no entró arriba) que contaron dos medios o más, la que más medios tiene primero.
 */
export function armarHoy(notas = [], { ahora = Date.now() } = {}) {
  const limiteFuturo = Number(ahora) + 5 * 60e3;
  const validas = (notas ?? [])
    .filter((n) => n && n.id && n.ruta && n.titulo && !n.sinFecha && !noSeOfreceAGoogle(n))
    .filter((n) => { const t = new Date(n.fecha).getTime(); return Number.isFinite(t) && t <= limiteFuturo; });

  const p = partesEnBalcarce(new Date(ahora).toISOString());
  // Medianoche de Balcarce (UTC-3) de hoy.
  const inicioDeHoy = p ? Date.UTC(p.anio, p.mes, p.dia, 3, 0, 0) : Number(ahora) - 24 * 3600e3;
  const deHoy = validas.filter((n) => new Date(n.fecha).getTime() >= inicioDeHoy);
  const ventana = deHoy.length >= MINIMO_DE_NOTAS_DE_HOY ? 'hoy' : '24h';
  const elegidas = ventana === 'hoy' ? deHoy : validas.filter((n) => new Date(n.fecha).getTime() >= Number(ahora) - 24 * 3600e3);

  const porFecha = (a, b) => new Date(b.fecha) - new Date(a.fecha);
  const balcarce = elegidas.filter(esDeBalcarce)
    .sort((a, b) => ((b.muyContadaDeAca ?? 0) - (a.muyContadaDeAca ?? 0)) || ((b.relevancia ?? 0) - (a.relevancia ?? 0)) || porFecha(a, b))
    .slice(0, NOTAS_DE_BALCARCE);
  const arriba = new Set(balcarce.map((n) => n.id));
  const masContadas = elegidas
    .filter((n) => !arriba.has(n.id) && !n.propia && mediosDe(n) >= MEDIOS_PARA_MAS_CONTADA)
    .sort((a, b) => (mediosDe(b) - mediosDe(a)) || ((b.relevancia ?? 0) - (a.relevancia ?? 0)) || porFecha(a, b))
    .slice(0, NOTAS_MAS_CONTADAS);

  return { ventana, balcarce, masContadas, total: elegidas.length };
}

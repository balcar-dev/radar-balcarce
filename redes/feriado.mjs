// La pieza del feriado (30/09, Hernán: "los feriados tienen que salir, se suman en el cronograma"):
// una historia con voz a las 9:00 los días de feriado, con lo que dice web/data/feriados-piezas.json
// (datos verificados con su fuente: nada se inventa). Sale sola salvo que desde el panel del celular
// se haya pedido "cambiar" ese feriado (web/data/efemerides-elegidas.json). Sin dependencias de afuera de Node.

import fs from 'node:fs';
import path from 'node:path';
import { diaAR } from '../ingesta/zona.mjs';
import { rutaDeDatos } from '../ingesta/datos-vivos.mjs';
import { semillaDe, variante } from './guiones.mjs';

const leer = (nombre) => { try { return JSON.parse(fs.readFileSync(rutaDeDatos(nombre), 'utf8')); } catch { return null; } };

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** "lunes 12 de octubre". */
export function fechaDeFeriado(fecha) {
  const [a, m, d] = fecha.split('-').map(Number);
  return `${DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${d} de ${MESES[m - 1]}`;
}

/**
 * El feriado de ese día, o null. `feriados` y `elegidas` se pueden pasar (las pruebas); si no, se leen de
 * web/data. Sin datos verificados (sin enfoque ni datos) no sale: "por definir" no se publica.
 */
export function feriadoDelDia(cuando = new Date(), { feriados, elegidas } = {}) {
  const lista = (feriados ?? leer('feriados-piezas.json'))?.feriados ?? [];
  const decididas = (elegidas ?? leer('efemerides-elegidas.json'))?.feriados ?? {};
  const fecha = diaAR(cuando);
  const f = lista.find((x) => x.fecha === fecha);
  if (!f || !(f.datos ?? []).length) return null;
  if (decididas[fecha]?.estado === 'cambiar') return null;
  return f;
}

/** Los datos que se cuentan: el primero y, si hay lugar, el segundo (la placa no es un artículo). */
export function datosParaContar(f, maximo = 260) {
  const textos = (f.datos ?? []).map((d) => String(d.texto ?? '').trim()).filter(Boolean);
  const salida = [];
  for (const t of textos) {
    if ([...salida, t].join(' ').length > maximo && salida.length) break;
    salida.push(t);
    if (salida.length === 2) break;
  }
  return salida;
}

/** Lo que dice la locutora. */
export function guionFeriado(f, { fecha = new Date(), momento = 'manana' } = {}) {
  const s = semillaDe('feriado', fecha);
  const saludo = { manana: ['Buen día, Balcarce.', 'Muy buen día, Balcarce.'], tarde: ['Buenas tardes, Balcarce.'], noche: ['Buenas noches, Balcarce.'] }[momento];
  const apertura = f.alcance && f.alcance !== 'nacional'
    ? `Hoy es feriado en la ${f.alcance}.`
    : variante([`Hoy es feriado: ${f.nombre}.`, `Hoy, feriado nacional: ${f.nombre}.`], s, 'apertura');
  return [variante(saludo, s, 'saludo'), apertura, ...datosParaContar(f, 220), 'Que tengan un buen feriado.'].join(' ');
}

// Simula el criterio de popularidad (regla 211, 17/10/2026) sobre un día de lecturas guardadas: cuántas notas saldrían, de acá y de
// afuera, por sección y por cantidad de medios, y qué hace el ritmo del día. Pedido de Hernán: "unas 100 notas por día y SIN TOPE de
// Balcarce", con notas todos los días en todas las secciones.
//
//   node scripts/medir/simular-popularidad.mjs --ingesta=.cache/informe-del-dia-202610170150.json --dia=2026-10-16
//   node scripts/medir/simular-popularidad.mjs ... --nuevas=.cache/fuentes-nuevas.json     suma las fuentes que se sumaron el 17/10
//   node scripts/medir/simular-popularidad.mjs ... --sin-ritmo                              sin bajar el mínimo cuando va faltando
//   node scripts/medir/simular-popularidad.mjs ... --ralear=0.6                             tira el 60 % de lo de afuera: un día flojo, para ver el ritmo
//   node scripts/medir/simular-popularidad.mjs ... --extra=.cache/fuentes-espana.json       suma otras crudas (de scripts/medir/traer-fuentes-nuevas.mjs)
//   node scripts/medir/simular-popularidad.mjs ... --interes=0.8                            de las fuentes especializadas de un solo medio que NO son una guía de uso, una
//                                                                                           oferta o un truco, qué parte la IA marcaría de interés (no hay ficha: se sortea)
//   node scripts/medir/simular-popularidad.mjs ... --con-apagadas=hipertextual,xataka       trata esas fuentes apagadas como activas (para medir qué sumarían)
//   node scripts/medir/simular-popularidad.mjs ... --json=salida.json                       además, todo en un archivo
//
// Qué hace, igual que la nube pero cada media hora del día, de las 7 a las 23:30 (hora de Balcarce):
//   1. arma el conjunto del cruce con lo que había salido hasta ese momento (las «crudas» de la lectura guardada, con las 36 horas de
//      memoria) y corre armarHistorias() de la ingesta: es el mismo código;
//   2. arma la portada (armarPortada) y le aplica la lectura con IA con las fichas guardadas de web/data/fichas.json (aplicarFichas);
//   3. aplica la popularidad (aplicarPopularidad) con el ritmo del día (ritmoDelDia);
//   4. lo verde, con el hecho de menos de 12 horas, sale; lo que ya salió no se baja.
//
// Lo que NO es exacto (se dice en el informe): las notas sin ficha guardada (las de las fuentes nuevas y algunas de la lectura) no las
// puede juzgar la IA, y el resumen de cada nota es de 300 caracteres (no el completo); no juntan las repetidas de la IA, que sacan
// algunas notas más. No llama a ninguna IA, no escribe en web/data y no sube nada.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TODAS_LAS_FUENTES, armarHistorias, armarPortada, aplicarPopularidad, contarMedios, esDeAca, esDeUnMedioDeAca, paraPruebas,
} from '../../ingesta/ingesta.mjs';
import { aplicarFichas } from '../../ingesta/lectura-ia.mjs';
import { ritmoDelDia } from '../../ingesta/popularidad.mjs';
import { enlaceNormalizado } from '../../ingesta/repetidas-publicadas.mjs';
import { POPULARIDAD, PORTADA } from '../../ingesta/criterio.mjs';
import { diaAR } from '../../ingesta/zona.mjs';

const { normalizar, marcarDeAfuera, idDe } = paraPruebas;
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..', '..');
const HORA = 3600e3;
const arg = (nombre) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3) ?? null;
const tiene = (nombre) => process.argv.includes(`--${nombre}`);

/** Un número entre 0 y 1 que depende sólo del texto: el «sorteo» es siempre el mismo. */
function azar(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i += 1) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return (h % 100000) / 100000;
}

/** Las notas del cruce a partir de las «crudas» de una lectura guardada (como ingestar() las deja antes de agrupar). */
export function notasDeLasCrudas(crudas = [], { generado = Date.now(), incluir = [] } = {}) {
  const fuentes = new Map(TODAS_LAS_FUENTES.map((f) => [f.id, f]));
  const vistas = new Set();
  const salida = [];
  for (const c of crudas) {
    if (c.x || c.v || !c.d) continue; // sin fecha real no se puede poner en la línea del día
    const f = fuentes.get(c.f);
    if (!f || (f.activa === false && !incluir.includes(f.id))) continue;
    const k = `${c.m}|${normalizar(c.t).replace(/\s+/g, '')}`;
    const e = enlaceNormalizado(c.e);
    if (vistas.has(k) || (e && vistas.has(e))) continue;
    vistas.add(k); if (e) vistas.add(e);
    const fecha = new Date(c.d);
    if (f.tipo === 'scrape' && generado - fecha.getTime() > 72 * HORA) continue;
    const n = {
      titulo: c.t, cuerpo: c.r ?? '', enlace: c.e, fecha, medio: c.m, fuenteId: c.f, alcance: f.alcance, oficial: !!f.oficial,
      especializada: !!f.especializada, seccionFuente: f.seccion ?? null, peso: f.peso ?? 10, categorias: [], imagen: '', textoCompleto: false,
    };
    if (f.alcance !== 'local') marcarDeAfuera(n);
    salida.push(n);
  }
  return salida;
}

/** Lo que la instrucción de la IA manda a "baja" en ciencia, tecnología, educación y salud: guías de uso, ofertas, trucos, curiosidades. */
export const PARECE_GUIA = /^(c[oó]mo|cu[aá]l(es)?|qu[eé] (es|son|pasa|hacer|diferencia)|por qu[eé]|\d+ )|beneficios|consejos|tips\b|truco|receta|paso a paso|oferta|descuento|cu[aá]nto cuesta|gratis|mejores? (celulares|ofertas)/i;

/**
 * Corre el día. `opciones.ritmo`: bajar el mínimo cuando va faltando (por defecto sí). `interes`: de las fuentes especializadas de un solo
 * medio sin ficha, qué parte la IA marcaría de interés. `fichas`: las guardadas. Devuelve lo que salió, con la hora de cada una.
 */
export function simularElDia({ notas, dia, fichas = {}, ritmo = true, interes = 0.8, retiro = 0.15, calentamiento = 14, paso = 0.5 } = {}) {
  const publicadas = new Map(); // id -> { ms, nota }
  const traza = [];
  const idsPublicados = new Set();
  // Arranca `calentamiento` horas antes de la medianoche del día pedido (lo de la tarde anterior sale ese día anterior, no en éste) y
  // llega hasta las 23:30. Cada paso es una corrida de «Actualizar la web».
  const inicio = Date.parse(`${dia}T00:00:00-03:00`) - calentamiento * HORA;
  const fin = Date.parse(`${dia}T23:30:00-03:00`);
  const delDia = (ms) => diaAR(new Date(ms)) === dia;
  for (let ahora = inicio; ahora <= fin; ahora += paso * HORA) {
    const conjunto = notas.filter((n) => n.fecha.getTime() <= ahora && n.fecha.getTime() >= ahora - 36 * HORA)
      .map((n) => ({ ...n })); // armarHistorias cambia las principales
    // Lo que salió en el día de ahora (cada día empieza de cero, como la cuenta de la nube).
    const hoy = [...publicadas.values()].filter((p) => diaAR(new Date(p.ms)) === diaAR(new Date(ahora))).length;
    const r = ritmoDelDia({ publicadas: hoy, ahora: new Date(ahora) });
    const vaFaltando = ritmo && r.vaFaltando;
    const { grupos } = armarHistorias(conjunto, { idsConocidos: idsPublicados });
    const { portada } = armarPortada(grupos, { vaFaltando });
    aplicarPopularidad(portada, { ahora, publicadas: idsPublicados, fecha: (n) => n.fecha, vaFaltando });
    // La lectura con IA con las fichas que hay; a las que no tienen ficha se les aplica una tasa parecida (retiro) y, a las fuentes
    // especializadas de un solo medio, la parte que se marca de interés. No son fichas de verdad: es un sorteo siempre igual.
    const conFicha = portada.filter((n) => fichas[n.id]);
    // Las fichas guardadas son de antes del 17/10: su lista de secciones no conocía Educación, Salud ni Ciencia (y la de Tecnología era
    // la vieja), así que mandaban todo a Argentina. La IA de ahora, con la lista nueva, coincide con las palabras cuando son firmes: a las
    // notas que las palabras ya mandaron a una de esas secciones se les deja esa sección en la ficha.
    const fichasDeAhora = { ...fichas };
    for (const n of portada) {
      const f = fichas[n.id];
      if (f && ['Educación', 'Salud', 'Ciencia', 'Tecnología'].includes(n.seccion) && !['Política', 'Policiales'].includes(f.seccion)) fichasDeAhora[n.id] = { ...f, seccion: n.seccion };
    }
    const { notas: leidas } = aplicarFichas(portada, fichasDeAhora, { esperarSinFicha: false, yaPublicadas: idsPublicados });
    const finales = leidas.map((n) => {
      if (fichas[n.id] || idsPublicados.has(n.id)) return n;
      if (n.especializada && n.semaforo === 'amarillo' && /^de afuera y poco contada/.test(String(n.motivo))) {
        return !PARECE_GUIA.test(n.titulo) && azar(`i${n.id}`) < interes ? { ...n, interesDeLaIA: true } : n;
      }
      return azar(`r${n.id}`) < retiro && !esDeAca(n) && !esDeUnMedioDeAca(n) ? null : n;
    }).filter(Boolean);
    aplicarPopularidad(finales, { ahora, publicadas: idsPublicados, fecha: (n) => n.fecha, vaFaltando });
    for (const n of finales) {
      // Lo que ya salió se actualiza con lo último que se sabe (los medios que la cuentan al final del día).
      if (idsPublicados.has(n.id)) { const p = publicadas.get(n.id); if (p) p.nota = { ...n }; continue; }
      if (n.semaforo !== 'verde') continue;
      if (ahora - Date.parse(n.fecha) > PORTADA.horasParaEstrenar * HORA) continue; // llega tarde
      idsPublicados.add(n.id);
      publicadas.set(n.id, { ms: ahora, hora: (ahora - Date.parse(`${dia}T00:00:00-03:00`)) / HORA, nota: { ...n } });
    }
    if (delDia(ahora)) traza.push({ hora: (ahora - Date.parse(`${dia}T00:00:00-03:00`)) / HORA, publicadas: hoy, esperadas: r.esperadas, vaFaltando, conFicha: conFicha.length, historias: portada.length });
  }
  return { publicadas: [...publicadas.values()].filter((p) => delDia(p.ms)), traza };
}

function resumir(publicadas) {
  const lista = publicadas.map((p) => p.nota);
  const aca = (n) => esDeAca(n) || esDeUnMedioDeAca(n) || n.alcance === 'local';
  const porSeccion = {};
  const porMedios = {};
  for (const n of lista) {
    porSeccion[n.seccion] = (porSeccion[n.seccion] ?? 0) + 1;
    const m = contarMedios(n.medios);
    const k = aca(n) ? `de acá` : m >= 6 ? '6 o más' : String(m);
    porMedios[k] = (porMedios[k] ?? 0) + 1;
  }
  return { total: lista.length, deAca: lista.filter(aca).length, deAfuera: lista.filter((n) => !aca(n)).length, porSeccion, porMedios };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ingesta = path.resolve(RAIZ, arg('ingesta') ?? '.cache/informe-del-dia-202610170150.json');
  const corrida = JSON.parse(fs.readFileSync(ingesta, 'utf8'));
  const dia = arg('dia') ?? diaAR(new Date(Date.parse(corrida.generado) - 6 * HORA));
  const generado = Date.parse(corrida.generado);
  const nuevasRuta = arg('nuevas');
  const nuevas = nuevasRuta ? JSON.parse(fs.readFileSync(path.resolve(RAIZ, nuevasRuta), 'utf8')).crudas : [];
  const fichas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'fichas.json'), 'utf8')).fichas ?? {};
  const incluir = (arg('con-apagadas') ?? '').split(',').filter(Boolean);
  const extra = arg('extra') ? JSON.parse(fs.readFileSync(path.resolve(RAIZ, arg('extra')), 'utf8')).crudas : [];
  let notas = notasDeLasCrudas([...(corrida.crudas ?? []), ...nuevas, ...extra], { generado, incluir });
  // --ralear=0.5: tira la mitad de lo de afuera (siempre las mismas) para imitar un día flojo, como un domingo, y ver qué hace el ritmo.
  const ralear = Number(arg('ralear') ?? 0);
  if (ralear > 0) notas = notas.filter((n) => n.alcance === 'local' || azar(`d${n.enlace}`) >= ralear);
  const { publicadas, traza } = simularElDia({
    notas, dia, fichas, ritmo: !tiene('sin-ritmo'), interes: Number(arg('interes') ?? 0.8), retiro: Number(arg('retiro') ?? 0.15),
  });
  const r = resumir(publicadas);
  console.log(`Día ${dia} · ${notas.length} notas en el cruce · ${nuevas.length ? `con ${nuevas.length} de las fuentes nuevas` : 'sin las fuentes nuevas'} · ritmo ${tiene('sin-ritmo') ? 'apagado' : 'prendido'}`);
  console.log(`SALIERON ${r.total}: ${r.deAca} de acá, ${r.deAfuera} de afuera`);
  console.log('Por cantidad de medios:', JSON.stringify(r.porMedios));
  console.log('Por sección:', Object.entries(r.porSeccion).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s} ${n}`).join(' · '));
  console.log('\nRitmo (hora · salidas · esperadas · mínimo):');
  console.log(traza.filter((t, i) => i % 2 === 0).map((t) => `${String(Math.floor(t.hora)).padStart(2, '0')}:${t.hora % 1 ? '30' : '00'} ${String(t.publicadas).padStart(3)}/${String(t.esperadas).padStart(3)} ${t.vaFaltando ? '2' : '3'}`).join('  '));
  if (arg('json')) fs.writeFileSync(path.resolve(RAIZ, arg('json')), JSON.stringify({ dia, resumen: r, traza, notas: publicadas.map((p) => ({ hora: p.hora, id: p.nota.id, titulo: p.nota.titulo, seccion: p.nota.seccion, medios: contarMedios(p.nota.medios), medio: p.nota.medio, especializada: !!p.nota.especializada, interes: !!p.nota.interesDeLaIA, motivo: p.nota.motivo })) }, null, 1));
}

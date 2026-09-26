// El contrato del día: lo que TIENE que salir cada día en Facebook y en
// Instagram, y una función pura que, con el libro (web/data/redes.json), dice
// qué salió, qué falta, qué está duplicado y qué todavía está a tiempo.
//
//   POR RED (Facebook e Instagram), CADA DÍA, hora de Balcarce:
//     · 3 reels: los podcasts de la mañana (10:00), la tarde (15:00) y la noche (20:30);
//     · 3 historias, las de esos mismos podcasts;
//     · 2 historias de clima: la de la mañana (7:30) y la de la noche (20:00);
//     · 1 historia de la farmacia de turno (19:00);
//     · hasta 5 posteos de notas: en Facebook, con enlace; en Instagram, el
//       espejo como foto del feed. Pueden ser menos si no hubo candidatas
//       (relevancia 75 o más, tema no repetido, de 8 a 22).
//   SEMANALES, aparte (no cuentan en las 6 historias): los teléfonos útiles un
//   día por semana y la agenda del jueves (ésta sólo se arma en la PC).
//
// Las horas y las ventanas salen de redes/piezas.mjs (no se repiten acá) y los
// números de ingesta/criterio.mjs (CONTRATO_DIARIO).
//
// ANTES DE ESTE CONTRATO nadie miraba los podcasts ni sus historias, ni nada de
// Facebook fuera del posteo: el 25/09 la historia del podcast de la noche no
// salió en ninguna de las dos redes (el video duraba 62,7 segundos y las
// historias aceptan 61) y no se enteró nadie.
//
// Un libro no puede mostrar un duplicado por su clave (dos publicaciones de la
// misma pieza se pisan en la misma entrada): eso lo ve la auditoría contra Meta
// (redes/auditar-redes.mjs). Acá se ven los que dejan rastro: el mismo id de
// Meta bajo dos claves, o el mismo enlace en dos posteos.
//
// Sin dependencias: sólo lo que trae Node. Sin red y sin reloj propio.

import { CONTRATO_DIARIO, FACEBOOK, SECCIONES_QUE_ESPERAN_PERSONA } from '../ingesta/criterio.mjs';
import { diaAR, minutoDelDiaAR, temaParecido, esNotaPropia } from './elegir.mjs';
import { cronogramaDelDia, ventanaDe, HORAS_REELS } from './piezas.mjs';
import { esperaCuerpo } from '../web/lib/cuerpo.js';

/** El día desde el que rige este contrato. Antes las historias eran de notas y
 *  los podcasts no se subían como historia: no se les puede pedir lo de ahora. */
export const CONTRATO_DESDE = '2026-09-25';

export const REDES_DEL_CONTRATO = [
  { red: 'facebook', nombre: 'Facebook', posteos: 'facebook', videos: 'facebookVideos' },
  { red: 'instagram', nombre: 'Instagram', posteos: 'instagramFeed', videos: 'instagram' },
];

/** Los tres podcasts: el reel y su historia. */
export const PODCASTS = [
  { nombre: 'noticia1', etiqueta: 'podcast mañana' },
  { nombre: 'noticia2', etiqueta: 'podcast tarde' },
  { nombre: 'podcast', etiqueta: 'podcast noche' },
];

/** Las de fábrica, por si el cronograma no las trae. */
const HORAS_FIJAS = { 'clima-manana': '07:30', farmacia: '19:00', 'clima-noche': '20:00', utiles: '11:00' };
const ETIQUETAS_FIJAS = {
  'clima-manana': 'clima mañana', farmacia: 'farmacia', 'clima-noche': 'clima noche', utiles: 'teléfonos útiles',
};

const aMinutos = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + (m || 0); };
const alMediodia = (fecha) => new Date(`${fecha}T12:00:00-03:00`);

/**
 * Las piezas del contrato de un día, con su hora: { id, grupo, nombre, etiqueta,
 * tipo, hora, ventana, semanal }. `grupo` es reel, historia-podcast, clima o
 * farmacia (o utiles, que es semanal).
 */
export function piezasDelContrato(fecha) {
  const cronograma = cronogramaDelDia(alMediodia(fecha));
  const horaDe = (nombre) => cronograma.find((p) => p.nombre === nombre)?.hora ?? HORAS_FIJAS[nombre];
  const lista = [];
  PODCASTS.forEach((p, i) => {
    lista.push({ id: `reel:${p.nombre}`, grupo: 'reel', nombre: p.nombre, etiqueta: p.etiqueta, tipo: 'REELS', hora: HORAS_REELS[i], ventana: ventanaDe(p.nombre) });
  });
  PODCASTS.forEach((p, i) => {
    lista.push({ id: `historia:${p.nombre}`, grupo: 'historia-podcast', nombre: p.nombre, etiqueta: p.etiqueta, tipo: 'STORIES', hora: HORAS_REELS[i], ventana: ventanaDe(p.nombre) });
  });
  for (const [nombre, grupo] of [['clima-manana', 'clima'], ['farmacia', 'farmacia'], ['clima-noche', 'clima']]) {
    lista.push({ id: `historia:${nombre}`, grupo, nombre, etiqueta: ETIQUETAS_FIJAS[nombre], tipo: 'STORIES', hora: horaDe(nombre), ventana: ventanaDe(nombre) });
  }
  if (cronograma.some((p) => p.nombre === 'utiles')) {
    lista.push({ id: 'historia:utiles', grupo: 'utiles', nombre: 'utiles', etiqueta: ETIQUETAS_FIJAS.utiles, tipo: 'STORIES', hora: horaDe('utiles'), ventana: ventanaDe('utiles'), semanal: true });
  }
  return lista.sort((a, b) => aMinutos(a.hora) - aMinutos(b.hora));
}

/** Cómo va una pieza que no salió: 'pendiente' (todavía no es su hora, o está
 *  dentro de su ventana) o 'falta' (la ventana se cerró y no salió). */
export function estadoDeLaPieza({ hora, ventana, fecha, ahora }) {
  const hoy = diaAR(ahora);
  if (fecha > hoy) return { estado: 'pendiente', fase: 'futura' };
  if (fecha < hoy) return { estado: 'falta', fase: 'vencida' };
  const m = minutoDelDiaAR(ahora);
  const inicio = aMinutos(hora);
  const fin = Math.min(inicio + ventana, 24 * 60); // lo de un día no sale al siguiente
  if (m < inicio) return { estado: 'pendiente', fase: 'futura' };
  if (m < fin) return { estado: 'pendiente', fase: 'a-tiempo' };
  return { estado: 'falta', fase: 'vencida' };
}

/** Cuánto se le da a la historia de un podcast, después de su reel, antes de darla por perdida. */
export const MINUTOS_PARA_LA_HISTORIA = 15;

/** Los ids de Meta repetidos bajo claves distintas del mismo día. */
function idsRepetidos(entradas) {
  const porId = new Map();
  for (const [clave, v] of entradas) {
    const id = v?.mediaId ?? v?.postId;
    if (!id) continue;
    porId.set(id, [...(porId.get(id) ?? []), clave]);
  }
  return [...porId.values()].filter((c) => c.length > 1);
}

const enlaceDe = (v) => String(v?.enlace ?? '').replace(/[?#].*$/, '').replace(/\/$/, '');

/**
 * Las notas que todavía se podían publicar ese día y no salieron: relevancia
 * suficiente, de una sección que sale sola, con cuerpo, sin tema repetido con lo
 * ya publicado. Sirve para distinguir "no había candidatas" de "falló".
 * Sólo se puede saber mirando la portada (72 horas): sin ella devuelve null.
 */
export function candidatasSinPublicar({ portada, libro, fecha }) {
  if (!Array.isArray(portada?.notas)) return null;
  const publicadas = Object.entries(libro?.facebook ?? {}).filter(([, v]) => diaAR(new Date(v.cuando)) === fecha);
  const yaPuestas = publicadas.map(([id, v]) => ({ titulo: v.titulo, temas: v.temas ?? portada.notas.find((n) => n.id === id)?.temas ?? [] }));
  const elegidas = [];
  const candidatas = portada.notas
    .filter((n) => !libro?.facebook?.[n.id])
    .filter((n) => !esNotaPropia(n) && !esperaCuerpo(n))
    .filter((n) => (n.relevancia ?? 0) >= FACEBOOK.relevanciaMinima)
    .filter((n) => !SECCIONES_QUE_ESPERAN_PERSONA.includes(n.seccion))
    .filter((n) => { const t = n.publicadaCuando ?? n.fecha; return t && diaAR(new Date(t)) === fecha; })
    .sort((a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0));
  for (const n of candidatas) {
    if ([...yaPuestas, ...elegidas].some((p) => temaParecido(n, p))) continue;
    elegidas.push(n);
  }
  return elegidas;
}

function contratoDeUnaRed(def, { libro, fecha, ahora, portada }) {
  const hoy = diaAR(ahora);
  const videos = libro?.[def.videos] ?? {};
  const historiasDeReels = libro?.historiasDeReels ?? {};

  // --- las piezas de video
  const piezas = piezasDelContrato(fecha).map((p) => {
    let entrada = null;
    let clave = `${fecha}/${p.nombre}`;
    if (p.grupo === 'historia-podcast') {
      clave = `${def.red}/${fecha}/${p.nombre}`;
      entrada = historiasDeReels[clave] ?? null;
    } else {
      entrada = videos[clave] ?? null;
    }
    const base = { ...p, clave, cuando: entrada?.cuando ?? null, mediaId: entrada?.mediaId ?? null };
    if (entrada) return { ...base, estado: 'salio', fase: null };
    // La historia de un podcast se sube en el mismo momento que su reel. Si el
    // reel ya salió hace rato y la historia no, no va a salir más: el reloj ya
    // no arma el podcast (piezasQueTocan mira sólo el reel), así que no está
    // "a tiempo" por más ventana que le quede.
    if (p.grupo === 'historia-podcast') {
      const reel = videos[`${fecha}/${p.nombre}`];
      if (reel?.cuando && (ahora.getTime() - new Date(reel.cuando).getTime()) / 60000 > MINUTOS_PARA_LA_HISTORIA) {
        return { ...base, estado: 'falta', fase: 'no-se-reintenta' };
      }
    }
    return { ...base, ...estadoDeLaPieza({ hora: p.hora, ventana: p.ventana, fecha, ahora }) };
  });
  const delContrato = piezas.filter((p) => !p.semanal);
  const semanales = piezas.filter((p) => p.semanal);
  // La agenda sólo se arma en la PC: si es jueves se anota, pero no se le exige nada.
  const agenda = [...Object.entries(videos)].find(([k]) => k === `${fecha}/agenda`);
  if (agenda) semanales.push({ id: 'historia:agenda', grupo: 'agenda', nombre: 'agenda', etiqueta: 'agenda', tipo: 'STORIES', estado: 'salio', cuando: agenda[1].cuando, semanal: true });

  // --- duplicados que dejan rastro en el libro
  const delDia = (seccion, prefijo = '') => Object.entries(libro?.[seccion] ?? {}).filter(([k]) => k.startsWith(`${prefijo}${fecha}/`));
  const duplicadas = [
    ...idsRepetidos(delDia(def.videos)),
    ...idsRepetidos(Object.entries(historiasDeReels).filter(([k]) => k.startsWith(`${def.red}/${fecha}/`))),
  ].map((claves) => ({ tipo: 'video', claves, texto: `el mismo video figura ${claves.length} veces en el libro (${claves.join(', ')})` }));

  // --- los posteos de notas
  const posteos = Object.entries(libro?.[def.posteos] ?? {}).filter(([, v]) => v?.cuando && diaAR(new Date(v.cuando)) === fecha);
  const porEnlace = new Map();
  for (const [id, v] of posteos) {
    const e = enlaceDe(v);
    if (e) porEnlace.set(e, [...(porEnlace.get(e) ?? []), id]);
  }
  const posteosDuplicados = [
    ...[...porEnlace.values()].filter((ids) => ids.length > 1),
    ...idsRepetidos(posteos),
  ].map((ids) => ({ tipo: 'posteo', claves: ids, texto: `el mismo enlace o id figura ${ids.length} veces entre los posteos (${ids.join(', ')})` }));
  duplicadas.push(...posteosDuplicados);

  const maximo = CONTRATO_DIARIO.posteosPorDia;
  const minutoDeCierreDePosteos = FACEBOOK.hastaHora * 60;
  const cerrado = fecha < hoy || (fecha === hoy && minutoDelDiaAR(ahora) > minutoDeCierreDePosteos);
  const abre = FACEBOOK.desdeHora * 60;
  const estadoPosteos = posteos.length >= maximo ? 'completo'
    : cerrado ? 'cerrado'
      : (fecha > hoy || (fecha === hoy && minutoDelDiaAR(ahora) < abre)) ? 'futuro' : 'a-tiempo';

  // Si quedó corto y ya cerró: ¿no había candidatas o falló?
  let explicacion = null;
  let candidatas = null;
  if (estadoPosteos === 'cerrado') {
    candidatas = candidatasSinPublicar({ portada, libro, fecha });
    if (candidatas === null) explicacion = 'sin-datos';
    else explicacion = candidatas.length ? 'falla' : 'sin-candidatas';
  }
  // Los que no tienen espejo: sólo tiene sentido en Instagram.
  const sinEspejo = def.red === 'instagram'
    ? Object.entries(libro?.facebook ?? {})
      .filter(([id, v]) => v?.cuando && diaAR(new Date(v.cuando)) === fecha && !libro?.instagramFeed?.[id])
      .map(([id, v]) => ({ id, titulo: v.titulo ?? '' }))
    : [];

  const reels = delContrato.filter((p) => p.grupo === 'reel');
  const historias = delContrato.filter((p) => p.grupo !== 'reel');
  const faltan = delContrato.filter((p) => p.estado === 'falta');
  const pendientes = delContrato.filter((p) => p.estado === 'pendiente');
  if (sinEspejo.length && def.red === 'instagram') explicacion = 'espejo';
  const posteosFalla = explicacion === 'falla';
  return {
    red: def.red,
    nombre: def.nombre,
    posteos: {
      salieron: posteos.length, maximo, estado: estadoPosteos, explicacion,
      candidatas: candidatas ? candidatas.map((n) => ({ id: n.id, titulo: n.titulo })) : null,
      ids: posteos.map(([id]) => id), sinEspejo,
    },
    reels: { salieron: reels.filter((p) => p.estado === 'salio').length, esperados: CONTRATO_DIARIO.reelsPorDia },
    historias: { salieron: historias.filter((p) => p.estado === 'salio').length, esperadas: CONTRATO_DIARIO.historiasPorDia },
    piezas: delContrato,
    semanales,
    faltan,
    pendientes,
    duplicadas,
    completo: !faltan.length && !duplicadas.length && !posteosFalla && !sinEspejo.length,
  };
}

/**
 * El contrato de un día, red por red.
 *
 * @param {object} o
 * @param {object} o.libro       web/data/redes.json
 * @param {string} [o.fecha]     AAAA-MM-DD (hora de Balcarce); por defecto, hoy
 * @param {Date} [o.ahora]
 * @param {object} [o.portada]   web/data/portada.json, para saber si había candidatas de posteo
 */
export function contratoDelDia({ libro = {}, fecha, ahora = new Date(), portada = null } = {}) {
  const dia = fecha ?? diaAR(ahora);
  const redes = Object.fromEntries(REDES_DEL_CONTRATO.map((d) => [d.red, contratoDeUnaRed(d, { libro, fecha: dia, ahora, portada })]));
  return { fecha: dia, ...redes };
}

// ------------------------------------------------------------------ los textos

const nombresDe = (lista) => lista.map((p) => p.etiqueta);

/** Una red en una línea, para WhatsApp: "posteos 4/5 · reels 2/3 · historias 4/6 (faltan: farmacia · pendiente: podcast noche)". */
export function lineaDeRed(c) {
  const nombre = c.red === 'instagram' ? 'fotos' : 'posteos';
  const p = c.posteos;
  let posteos = `${nombre} ${p.salieron}/${p.maximo}`;
  if (p.estado === 'cerrado' && p.salieron < p.maximo) {
    posteos += p.explicacion === 'falla' ? ` (FALLA: había ${p.candidatas.length} candidata(s))`
      : p.explicacion === 'sin-candidatas' ? ' (sin más candidatas)' : '';
  }
  const detalle = (grupos) => {
    const falta = c.faltan.filter((x) => grupos.includes(x.grupo));
    const pend = c.pendientes.filter((x) => grupos.includes(x.grupo));
    const partes = [];
    if (falta.length) partes.push(`falta: ${nombresDe(falta).join(', ')}`);
    if (pend.length) partes.push(`pendiente: ${nombresDe(pend).join(', ')}`);
    return partes.length ? ` (${partes.join(' · ')})` : '';
  };
  const reels = `reels ${c.reels.salieron}/${c.reels.esperados}${detalle(['reel'])}`;
  const historias = `historias ${c.historias.salieron}/${c.historias.esperadas}${detalle(['historia-podcast', 'clima', 'farmacia'])}`;
  const extra = [];
  if (c.duplicadas.length) extra.push(`DUPLICADO: ${c.duplicadas.map((d) => d.claves.join('=')).join(', ')}`);
  if (c.posteos.sinEspejo.length) extra.push(`${c.posteos.sinEspejo.length} posteo(s) sin espejo`);
  return `${c.nombre}: ${[posteos, reels, historias, ...extra].join(' · ')}`;
}

/** El contrato en el resumen de las 21: una línea por red. */
export function textoContrato(contrato) {
  return [lineaDeRed(contrato.facebook), lineaDeRed(contrato.instagram)].map((l) => `• ${l}`).join('\n');
}

/** ¿Está todo lo que ya venció y sin duplicados, en las dos redes? */
export const contratoCompleto = (contrato) => contrato.facebook.completo && contrato.instagram.completo;

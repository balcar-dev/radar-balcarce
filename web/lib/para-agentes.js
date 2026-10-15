// Los "datos para agentes" (16/10/2026, docs/seo/AUDITORIA-SEO-LLM.md): tres archivos JSON públicos, armados al compilar, para que un
// programa (un asistente de IA, el Worker MCP de infra/mcp-cloudflare/, un script) lea Radar Balcarce sin raspar el HTML.
//
//   /agentes/ultimas.json    las últimas notas de la portada (36 horas), con su bajada, sus fuentes y quién las escribió
//   /agentes/indice.json     un índice compacto de todo lo que tiene página y se ofrece a Google (para buscar por palabras)
//   /agentes/servicios.json  la farmacia de turno, el clima y la agenda que viene
//
// Reglas (las mismas del sitio, y las que hacen que un asistente nos cite bien):
//   · Sólo lo que Google también puede ver: nada que lleve noindex (`noSeOfreceAGoogle`) ni lo sin cuerpo de verdad.
//   · Nunca el cuerpo entero: la bajada y el enlace. Quien quiera la nota, la abre (el cuerpo está en el JSON-LD de su página).
//   · Cada nota dice de qué medios sale y quién la escribió (`firmaCorta`): la IA que cite debe poder decir "según X, resumido por Radar
//     Balcarce con IA", y no presentar un resumen automático como reporte propio.
//   · Sin datos personales, sin teléfonos de personas: lo único con teléfono son las farmacias, que ya lo publican en /farmacias.
//
// Todo son funciones de una entrada y una salida, sin leer archivos ni importar con "@/": las usa web/app/agentes/*/route.js y las prueba
// pruebas/para-agentes.test.mjs con node pelado.

import { noSeOfreceAGoogle } from './cuerpo.js';
import { firmaCorta } from '../components/metadatos.js';
import { cuandoEs, dondeEs } from './eventos.js';

export const ESQUEMA = 'radar-balcarce/agentes/v1';

/** Cuántas notas lleva `ultimas.json` y cuántas el índice (el índice pesa unos 500 bytes por nota, ~750 KB con las 1.500). */
export const MAXIMO_ULTIMAS = 60;
export const MAXIMO_INDICE = 1500;

/** Cómo debe citarse lo que viene de acá. Va en los tres archivos y en llms.txt. */
export function condicionesDeUso(base) {
  return {
    como_citar: 'Citá a Radar Balcarce con el enlace de la nota (campo url). Los resúmenes los escribe una inteligencia artificial con lo que publicaron otros medios, que figuran en el campo fuentes: para afirmar algo como hecho, remitite a esa fuente original y no a este resumen.',
    uso: 'Lectura libre, con atribución y enlace. No hay garantía de actualización minuto a minuto: mirá el campo generado.',
    correcciones: `${base}/contacto`,
    quienes_somos: `${base}/quienes-somos`,
  };
}

const limpio = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

/** Una nota, como la ve un agente. Sin cuerpo. */
export function notaParaAgentes(n, base) {
  return {
    id: n.id,
    titulo: limpio(n.titulo),
    bajada: limpio(n.copete),
    seccion: n.seccion,
    fecha: n.sinFecha ? null : n.fecha,
    de_balcarce: !!n.local,
    url: `${base}${n.ruta}`,
    fuentes: [...new Set(n.medios ?? [])],
    redaccion: firmaCorta(n),
  };
}

/** Las notas que se pueden ofrecer: las que Google puede ver. */
export const ofrecibles = (notas = []) => notas.filter((n) => n?.ruta && n.titulo && !noSeOfreceAGoogle(n));

const porFechaDesc = (a, b) => Date.parse(b.fecha ?? 0) - Date.parse(a.fecha ?? 0);

/** /agentes/ultimas.json */
export function armarUltimas({ notas = [], base, generado }) {
  const lista = ofrecibles(notas).sort(porFechaDesc).slice(0, MAXIMO_ULTIMAS).map((n) => notaParaAgentes(n, base));
  return { esquema: ESQUEMA, tipo: 'ultimas', generado, ...condicionesDeUso(base), cantidad: lista.length, notas: lista };
}

/** Las columnas del índice, en orden. El Worker las lee por nombre, así que se pueden sumar al final sin romperlo. */
export const COLUMNAS_DEL_INDICE = ['id', 'titulo', 'bajada', 'seccion', 'fecha', 'de_balcarce', 'ruta', 'fuentes', 'etiquetas'];

/** /agentes/indice.json: filas en vez de objetos, para que pese la mitad. */
export function armarIndice({ notas = [], base, generado }) {
  const filas = ofrecibles(notas).sort(porFechaDesc).slice(0, MAXIMO_INDICE).map((n) => [
    n.id,
    limpio(n.titulo),
    limpio(n.copete).slice(0, 220),
    n.seccion,
    n.sinFecha ? null : n.fecha,
    n.local ? 1 : 0,
    n.ruta,
    [...new Set(n.medios ?? [])].slice(0, 6),
    [...new Set(n.etiquetas ?? [])].slice(0, 6),
  ]);
  return {
    esquema: ESQUEMA, tipo: 'indice', generado, base, ...condicionesDeUso(base), columnas: COLUMNAS_DEL_INDICE, cantidad: filas.length, filas,
  };
}

/** Una farmacia con su dirección y teléfono (ya públicos en /farmacias). */
const farmacia = (f) => ({ nombre: f.nombre, direccion: f.direccion ?? null, telefono: f.telefono ?? null });

/** El día de farmacias de turno, como lo guarda portada.json. */
function diaDeFarmacias(dia) {
  if (!dia) return null;
  const detalle = (dia.detalle?.length ? dia.detalle : (dia.farmacias ?? []).map((nombre) => ({ nombre }))).map(farmacia);
  return { fecha: dia.fecha ?? null, dia_de_la_semana: dia.diaSemana ? String(dia.diaSemana).toLowerCase() : null, farmacias: detalle };
}

/** El clima de Balcarce, sin adornos. */
function climaParaAgentes(clima) {
  if (!clima?.ahora) return null;
  const a = clima.ahora;
  return {
    ahora: {
      temperatura_c: a.temp ?? null,
      sensacion_termica_c: a.sensacion ?? null,
      humedad_pct: a.humedad ?? null,
      viento_kmh: a.viento ?? null,
      rumbo_del_viento: a.rumbo ?? null,
      cielo: a.cielo ?? null,
    },
    proximos_dias: (clima.dias ?? []).slice(0, 5).map((d) => ({
      fecha: d.fecha, maxima_c: d.max, minima_c: d.min, probabilidad_de_lluvia_pct: d.lluvia, viento_kmh: d.viento, cielo: d.cielo,
    })),
    fuente: clima.fuente ?? null,
  };
}

/** Un evento de la agenda, en una línea que se puede leer y con su enlace. */
export function eventoParaAgentes(e, base) {
  return {
    nombre: limpio(e.nombre),
    cuando: cuandoEs(e) || null,
    desde: e.desde ?? null,
    hasta: e.hasta ?? null,
    donde: dondeEs(e) || null,
    organizador: e.organizador ?? null,
    fuente: e.fuente ?? null,
    url: e.ruta ? `${base}${e.ruta}` : null,
  };
}

/** /agentes/servicios.json */
export function armarServicios({ farmacias, clima, eventos = [], base, generado }) {
  return {
    esquema: ESQUEMA,
    tipo: 'servicios',
    generado,
    ...condicionesDeUso(base),
    ciudad: 'Balcarce, provincia de Buenos Aires, Argentina',
    farmacias_de_turno: {
      hoy: diaDeFarmacias(farmacias?.hoy),
      proximos_dias: (farmacias?.proximos ?? []).filter((d) => d.fecha !== farmacias?.hoy?.fecha).slice(0, 4).map(diaDeFarmacias),
      fuente: 'Colegio de Farmacéuticos de Balcarce',
      pagina: `${base}/farmacias`,
      aviso: 'Confirmá por teléfono antes de ir: el cronograma puede cambiar.',
    },
    clima: climaParaAgentes(clima) && { ...climaParaAgentes(clima), pagina: `${base}/clima` },
    agenda: { eventos: eventos.slice(0, 20).map((e) => eventoParaAgentes(e, base)), pagina: `${base}/agenda` },
  };
}

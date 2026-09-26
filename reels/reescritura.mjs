// Reescritura editorial por IA.
//
// Hasta acá, el título y el guion salían de tomar la primera oración del
// resumen y pegarle una entrada fija ("Deportes en Balcarce. ..."). Servía
// para probar que el resto de la cadena funcionaba, pero se notaba. Esto lo
// reemplaza por un texto escrito de verdad, con la línea editorial como
// instrucción — no como una regla aparte que alguien tiene que acordarse de
// aplicar a mano.
//
// El prompt se arma con reglas fijas + UNO de dos tonos, según el tema
// (esTemaSerio). El texto NO está en este archivo: sale de
// CRITERIO-EDITORIAL.md, el criterio editorial único, que se lee al cargar
// este módulo (ingesta/prompt-editorial.mjs). Si ese archivo no se puede leer
// o le falta una parte, este módulo no carga: la IA no escribe sin criterio.
// Se exporta INSTRUCCION_EDITORIAL a propósito: es lo que el panel muestra en
// la pestaña "Cómo escribe la IA".
//
// Desde el 25/09 la IA trabaja como "editor digital" (el modelo que mandaron
// Hernán y Andrés): antes de escribir contrasta las fuentes que recibe, y
// además del título, la bajada y el cuerpo devuelve las claves, qué se sabe,
// qué falta confirmar, qué aportó cada fuente, un texto para redes y
// etiquetas. Todo pasa por el verificador, parte por parte: lo que no cuadra
// con la fuente se descarta sin perder la nota. El NIVEL DE VERIFICACIÓN no
// lo decide la IA sino nivelDeVerificacion(), con reglas fijas.
//
// Sin búsqueda en internet, a propósito (CRITERIO-EDITORIAL.md): las "otras fuentes"
// son los medios que contaron lo mismo y los ANTECEDENTES, notas que el sitio
// ya publicó sobre el tema en los últimos 30 días (antecedentesDe).

import { claveRedaccion, claveRedes } from './claves.mjs';
import {
  verificar, verificarExtras, resumirProblemas, depurarCuerpo,
} from '../ingesta/verificar.mjs';
import { semaforoDelTexto } from '../ingesta/ingesta.mjs';
import { decisionHumana } from '../ingesta/utiles.mjs';
import { ZONA } from '../ingesta/zona.mjs';
import { traerTexto } from '../ingesta/articulo.mjs';
import { MEDIOS_OFICIALES } from '../ingesta/fuentes.mjs';
import { palabrasDeTitular } from '../redes/elegir.mjs';
import { rutaDeNota } from '../web/lib/ruta.js';
import { sinTildes } from '../web/lib/texto.js';
import { tieneCuerpo, palabrasDe } from '../web/lib/cuerpo.js';
import { leerCriterio } from '../ingesta/prompt-editorial.mjs';
import {
  TITULO, CUERPO, PARTES, REESCRITURA,
} from '../ingesta/criterio.mjs';

// "-latest" en vez de un número de versión fijo: la reescritura no necesita
// la última novedad, necesita no romperse cuando Google jubile un modelo
// (como pasó con gemini-2.5-flash, discontinuado para cuentas nuevas).
// "flash-lite" en vez de "flash" a secas: para reescribir un título y un
// copete no hace falta el modelo grande, y en la práctica respondió más
// rápido y con menos 503 de "alta demanda" que el flash normal.
const MODELO = 'gemini-flash-lite-latest';

// El criterio editorial, leído de CRITERIO-EDITORIAL.md (sección 12): las
// reglas fijas (con el lugar del tono marcado {{TONO}}), los dos tonos, la
// nota aparte que muestra el panel y las palabras que piden el tono serio.
// Si el archivo falta o le falta una parte, leerCriterio() lanza y este
// módulo no carga.
const CRITERIO = leerCriterio();

/** Palabras que, sin llegar a frenar el semáforo (eso ya lo filtra
 *  REGLAS_SEMAFORO en ingesta/fuentes.mjs), sí piden el tono serio en vez del
 *  ameno de todos los días: son una "problemática", no una novedad cualquiera.
 *  Están en CRITERIO-EDITORIAL.md (sección 4, "Los dos tonos"). */
export const PALABRAS_SERIAS = CRITERIO.palabrasSerias;

/** ¿Esta nota pide el tono serio en vez del ameno de todos los días?
 *  Policiales siempre lo pide: aunque ya pasó el filtro de palabras (lo que
 *  acusa o involucra a alguien sigue esperando a una persona), lo que queda
 *  igual no es una nota liviana. */
export function esTemaSerio(nota) {
  if (nota?.seccion === 'Policiales') return true;
  const texto = `${nota?.titulo ?? ''} ${nota?.resumenFuente ?? ''}`.toLowerCase();
  return PALABRAS_SERIAS.some((p) => texto.includes(p));
}

function instruccionPara(nota) {
  return CRITERIO.reglas.replace('{{TONO}}', () => (esTemaSerio(nota) ? CRITERIO.tonoSerio : CRITERIO.tonoAmeno));
}

// Para el panel ("Cómo escribe la IA"): las reglas con el tono de todos los
// días, más la aclaración de cuándo cambia. No es literalmente el prompt que
// recibe cada nota (ésa se arma con instruccionPara), pero describe las dos
// igual de fiel.
export const INSTRUCCION_EDITORIAL = `${instruccionPara({ seccion: '', titulo: '', resumenFuente: '' })}\n\n—\n\n${CRITERIO.notaPanel}`;

/** El criterio editorial entero (CRITERIO-EDITORIAL.md), para el panel. */
export const CRITERIO_EDITORIAL = CRITERIO.texto;

function limpiarJson(texto) {
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('la respuesta no trae un JSON reconocible');
  return JSON.parse(m[0]);
}

/** "24/09/2026", en la hora de Balcarce. Vacío si no hay fecha. */
export function fechaCorta(iso) {
  const t = Date.parse(iso ?? '');
  if (!Number.isFinite(t)) return '';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: ZONA,
  }).format(new Date(t));
}

/**
 * Las fuentes de la noticia, en el orden en que la IA las recibe numeradas:
 * la principal primero. Las notas de la ingesta nueva (25/09) las traen en
 * `origenes`, con su medio, su enlace, su fecha y si son oficiales. Para las
 * de antes se arman con lo que haya, sin adivinar el medio de las demás.
 */
export function origenesDe(nota) {
  if (nota?.origenes?.length) {
    return nota.origenes.map((o) => ({
      medio: o.medio ?? null,
      enlace: o.enlace ?? null,
      // La entrada del feed (Blogger): de ahí se baja el texto completo.
      ...(o.enlaceFeed ? { enlaceFeed: o.enlaceFeed } : {}),
      fecha: o.fecha ?? null,
      oficial: !!o.oficial || MEDIOS_OFICIALES.has(o.medio),
      resumen: o.resumen ?? '',
    }));
  }
  const medio = nota?.medio ?? nota?.medios?.[0] ?? null;
  const principal = {
    medio,
    enlace: nota?.enlace ?? null,
    fecha: nota?.cuando === 'sin fecha en la fuente' ? null : (nota?.fecha ?? null),
    oficial: MEDIOS_OFICIALES.has(medio),
    resumen: nota?.resumenFuente ?? '',
  };
  const otras = (nota?.fuentesTexto ?? []).filter(Boolean).map((resumen) => ({
    medio: null, enlace: null, fecha: null, oficial: false, resumen,
  }));
  return [principal, ...otras];
}

/**
 * Las notas que el sitio ya publicó sobre el mismo tema: los ANTECEDENTES.
 *
 * Sin buscar en internet (CRITERIO-EDITORIAL.md): salen del archivo del sitio
 * (web/data/archivo.json). Cuentan las de los últimos `dias` días, anteriores
 * a la nota, que comparten un tema de los que sigue el sitio (`temas`) o dos
 * palabras que dicen algo del titular. Las más parecidas primero y, entre
 * iguales, las más nuevas. Como mucho `maximo`.
 */
export function antecedentesDe(nota, archivo = [], {
  ahora = Date.now(), dias = REESCRITURA.diasDeAntecedentes, maximo = REESCRITURA.antecedentesMaximo,
} = {}) {
  const desde = Number(ahora) - dias * 86400000;
  const tope = Math.min(Number(ahora), Date.parse(nota?.fecha ?? '') || Number(ahora));
  const temas = new Set(nota?.temas ?? []);
  const propias = palabrasDeTitular(nota?.titulo);
  return (archivo ?? [])
    .map((a) => {
      if (!a?.id || !a.titulo || a.id === nota?.id) return null;
      const t = Date.parse(a.fecha ?? '');
      if (!Number.isFinite(t) || t < desde || t >= tope) return null;
      const comunes = [...palabrasDeTitular(a.titulo)].filter((w) => propias.has(w)).length;
      const mismoTema = (a.temas ?? []).some((x) => temas.has(x));
      if (!mismoTema && comunes < 2) return null;
      return { a, t, peso: comunes * 2 + (mismoTema ? 1 : 0) };
    })
    .filter(Boolean)
    .sort((x, y) => (y.peso - x.peso) || (y.t - x.t))
    .slice(0, maximo)
    .map(({ a }) => ({
      id: a.id, titulo: a.titulo, copete: a.copete ?? '', fecha: a.fecha, ruta: rutaDeNota(a),
    }));
}

/** Los antecedentes como los lee la IA (y como los compara el verificador):
 *  cada uno con su fecha adelante. */
function textoDeAntecedentes(antecedentes = []) {
  return antecedentes.map((a) => `[${fechaCorta(a.fecha)}] ${a.titulo}. ${a.copete ?? ''}`.trim()).join('\n');
}

/** El texto que recibe el modelo: el titular, cada fuente numerada con su
 *  medio y su fecha (para que cruce en vez de repetir una, y para que en
 *  `aportes` diga qué dio cada una), el texto completo de la principal y los
 *  antecedentes, marcados como información anterior. */
function entradaDe(nota) {
  const origenes = origenesDe(nota);
  const partes = [
    `Fecha de hoy: ${fechaCorta(new Date().toISOString())}`,
    `Sección: ${nota.seccion}`,
    `Titular original (de ${nota.medios?.join(' / ') ?? 'la fuente'}): ${nota.titulo}`,
    `FUENTES (${origenes.length === 1 ? 'una sola: no hay confirmación independiente' : `${origenes.length}, numeradas`}):`,
  ];
  origenes.forEach((o, i) => {
    const datos = [o.medio ?? 'otro medio', o.oficial ? 'fuente oficial' : null, o.fecha ? `publicada el ${fechaCorta(o.fecha)}` : null].filter(Boolean).join(' · ');
    partes.push(`Fuente ${i + 1} (${datos}): ${o.resumen || '(sin resumen)'}`);
  });
  if (nota.textoDeLaFuente) partes.push(`Texto completo de la Fuente ${nota.fuenteDelTexto ?? 1} (de acá sale la mayor parte de lo que podés contar en el cuerpo):\n${nota.textoDeLaFuente}`);
  if (nota.antecedentes?.length) {
    partes.push(`ANTECEDENTES: notas que Radar Balcarce publicó ANTES sobre el tema. Es información ANTERIOR, no de hoy: si usás algo de acá, va con su fecha o su momento, sólo en el cuerpo, las claves o lo que se sabe.\n${textoDeAntecedentes(nota.antecedentes)}`);
  }
  return partes.join('\n');
}

/** Todo lo que la IA recibió de la fuente, junto: contra eso se verifica. Si se
 *  verificara sólo contra un resumen, un dato que venía en otro medio o en el
 *  texto completo pasaría por inventado. */
export function fuenteParaVerificar(nota) {
  const resumenes = nota?.origenes?.length
    ? nota.origenes.map((o) => o.resumen)
    : [nota.resumenFuente, ...(nota.fuentesTexto ?? [])];
  return [...resumenes, nota.textoDeLaFuente].filter(Boolean).join('\n');
}

/** Lo que se le pasa al verificador: la fuente de hoy y, aparte, los
 *  antecedentes (que valen sólo como información anterior). */
export function materialParaVerificar(nota) {
  return {
    titulo: nota.titulo,
    resumen: fuenteParaVerificar(nota),
    antecedentes: textoDeAntecedentes(nota.antecedentes ?? []),
  };
}

const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });

// Cuánto se espera a Gemini por pedido. Contesta en unos segundos; un pedido
// colgado sin límite dejaba a "Actualizar la web" esperando hasta que GitHub
// la mataba, sin publicar nada de esa corrida.
export const ESPERA_MAXIMA_GEMINI = 60_000;

/** Un pedido a Gemini con una clave puntual. Devuelve la respuesta cruda
 *  (fetch Response) o lanza si se agotaron los reintentos por saturación.
 *  La clave va en el encabezado `x-goog-api-key` y no en la dirección
 *  (`?key=`): una dirección queda en registros y mensajes de error. */
async function pedir({ prompt, entrada, clave, fetchFn, intentos }) {
  let res;
  for (let i = 1; i <= intentos; i += 1) {
    res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\n---\n\n${entrada}` }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
      }),
      signal: AbortSignal.timeout(ESPERA_MAXIMA_GEMINI),
    });
    // 503 es "el modelo está saturado en este instante", no un error nuestro:
    // vale la pena esperar un poco y reintentar antes de resignarse.
    if (res.status !== 503 || i === intentos) break;
    await dormir(4000);
  }
  return res;
}

/**
 * Reescribe una nota. `nota` = { titulo, resumenFuente, seccion, medios,
 * fuentesTexto?, origenes?, textoDeLaFuente?, antecedentes? }. Devuelve
 * { titulo, copete, cuerpo, guion, deIA: true } más las partes nuevas que haya
 * mandado (extrasDeLaRespuesta, todavía sin verificar), o lanza si Gemini
 * falla — quien llama decide el respaldo (ver reescribirConRespaldo).
 *
 * Prueba primero con la clave de redacción (gratis). Si esa clave devuelve
 * "sin cupo" (429) y hay una clave de redes cargada (paga), reintenta una
 * sola vez con esa — mejor gastar un poco de la paga que dejar la nota sin
 * reescribir. Cualquier otro error no reintenta con la otra clave: no tiene
 * sentido pagar por un pedido que ya está mal armado.
 */
/** Cuántos pedidos fueron a cada clave desde que arrancó el programa: la gratis
 *  ('redaccion') o la paga ('redes'). El registro de Actualizar la web lo
 *  muestra, para ver de un vistazo si se está gastando. */
export const USO_DE_CLAVES = { redaccion: 0, redes: 0 };

export async function reescribir(nota, { intentos = 3, fetchFn = fetch, correccion = null } = {}) {
  const primera = claveRedaccion();
  const segunda = claveRedes();
  if (!primera && !segunda) throw new Error('falta GEMINI_API_KEY_REDACCION');

  const prompt = instruccionPara(nota);
  let entrada = entradaDe(nota);
  // Segundo intento: se le dice qué inventó y se le pide que lo rehaga sin eso.
  if (correccion?.length) {
    entrada += `\n\nCORRECCIÓN OBLIGATORIA: en un intento anterior tu texto tenía estos problemas, y por eso se descartó:\n- ${correccion.join('\n- ')}\nEscribilo de nuevo usando ÚNICAMENTE lo que dicen las fuentes de arriba: si un nombre, un número, un día o una cita no está ahí, no lo pongas. El cuerpo sigue siendo obligatorio, de ${CUERPO.palabrasPedidasMinimo} a ${CUERPO.palabrasPedidasMaximo} palabras, desarrollado con lo que SÍ dicen todas las fuentes, y nunca repite el copete.`;
  }

  let res;
  let usada = 'redaccion';
  if (primera) {
    res = await pedir({ prompt, entrada, clave: primera, fetchFn, intentos });
  }
  if ((!primera || res?.status === 429) && segunda) {
    res = await pedir({ prompt, entrada, clave: segunda, fetchFn, intentos });
    usada = 'redes';
  }
  if (!res) throw new Error('no se pudo pedir a Gemini');
  USO_DE_CLAVES[usada] += 1;
  if (!res.ok) throw new Error(`HTTP ${res.status} (clave ${usada}): ${(await res.text()).slice(0, 200)}`);

  const j = await res.json();
  const texto = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  const salida = limpiarJson(texto);
  if (!salida.titulo || !salida.guion) throw new Error('la respuesta no trae título o guion');

  return {
    titulo: salida.titulo.trim().slice(0, TITULO.maximo),
    copete: (salida.copete ?? '').trim(),
    cuerpo: (salida.cuerpo ?? '').trim(),
    guion: salida.guion.trim(),
    ...extrasDeLaRespuesta(salida),
    deIA: true,
  };
}

/** Una lista de textos limpia: sólo textos con algo, sin repetir, hasta `max`. */
function listaDeTextos(valor, max) {
  if (!Array.isArray(valor)) return [];
  const vistos = new Set();
  return valor
    .map((v) => String(typeof v === 'string' ? v : '').replace(/\s+/g, ' ').trim())
    .filter((v) => v && !vistos.has(v.toLowerCase()) && vistos.add(v.toLowerCase()))
    .slice(0, max);
}

/**
 * Las partes nuevas de la respuesta (25/09), limpias de forma: listas de
 * textos, sin vacíos, con topes, y las etiquetas sin "#". Si la IA no las
 * mandó, no aparecen. Todavía no están verificadas: eso lo hace
 * completarReescritura().
 */
export function extrasDeLaRespuesta(salida = {}) {
  const extras = {};
  const claves = listaDeTextos(salida.claves, PARTES.clavesMaximo);
  const seSabe = listaDeTextos(salida.seSabe, 6);
  const noConfirmado = listaDeTextos(salida.noConfirmado, 6);
  const aportes = (Array.isArray(salida.aportes) ? salida.aportes : [])
    .map((a) => ({ fuente: Number(a?.fuente), aporte: String(a?.aporte ?? '').replace(/\s+/g, ' ').trim() }))
    .filter((a) => Number.isInteger(a.fuente) && a.fuente >= 1 && a.aporte)
    .slice(0, 8);
  const etiquetas = listaDeTextos((Array.isArray(salida.etiquetas) ? salida.etiquetas : [])
    .map((e) => String(e ?? '').replace(/^#+/, '')), PARTES.etiquetasMaximo);
  const textoRedes = String(salida.textoRedes ?? '').replace(/\s+/g, ' ').trim();
  const nivel = String(salida.nivel ?? '').trim().toUpperCase();

  if (claves.length) extras.claves = claves;
  if (seSabe.length) extras.seSabe = seSabe;
  if (noConfirmado.length) extras.noConfirmado = noConfirmado;
  if (aportes.length) extras.aportes = aportes;
  if (textoRedes) extras.textoRedes = textoRedes;
  if (etiquetas.length) extras.etiquetas = etiquetas;
  if (['ALTA', 'MEDIA', 'BAJA'].includes(nivel)) extras.nivelSugerido = nivel;
  return extras;
}

/**
 * Igual que reescribir(), pero si Gemini falla por cualquier motivo (cupo,
 * red, respuesta rara), cae al armado mecánico que ya existía — nunca deja
 * una pieza sin texto. `mecanico` es la función de fallback que le pasa
 * quien llama (para no crear una dependencia circular con plan.mjs).
 */
export async function reescribirConRespaldo(nota, mecanico, opciones) {
  try {
    return await reescribir(nota, opciones);
  } catch (e) {
    const m = mecanico(nota);
    return { ...m, deIA: false, motivoRespaldo: e.message };
  }
}

// El respaldo mecánico por defecto: lo que se mostraba antes de que
// existiera la reescritura. Lo usa reescribirAutomaticas(); plan.mjs y el
// panel tienen el suyo propio (guionNoticia), más elaborado, porque ahí sí
// pueden darse el lujo de tener reels/plan.mjs cargado.
function mecanicoPorDefecto(nota) {
  const titulo = String(nota.titulo ?? '').replace(/\s+/g, ' ').trim().replace(/[.:]+$/, '');
  return { titulo: nota.titulo, copete: nota.resumenFuente || '', guion: `${titulo}.` };
}

// Cuántas se reescriben por corrida. La ingesta corre cada 30 minutos, así
// que 40 por vuelta son unas 80 por hora: de sobra para lo que Balcarce
// publica en un día. Lo ya reescrito (en caché) no cuenta contra el tope.
export const REESCRITURAS_POR_CORRIDA = REESCRITURA.porCorrida;
// Si la IA falla tres veces seguidas (Gemini saturado, sin red), se corta:
// insistir sólo llenaría el registro de errores sin cambiar el resultado.
const FALLOS_PARA_CORTAR = 3;

/** ¿Es de acá? Lo local se reescribe primero (ver reescribirAutomaticas). */
export function esLocal(nota) {
  return !!(nota?.local || nota?.seccion === 'Balcarce' || nota?.alcance === 'local');
}

/** Todo lo que escribió la IA, junto, para pasarlo por el semáforo. */
function textoEscrito(e) {
  return [
    e.titulo, e.copete, e.cuerpo, e.guion,
    ...(e.claves ?? []), ...(e.seSabe ?? []), ...(e.noConfirmado ?? []),
    ...(e.aportes ?? []).map((a) => a?.aporte),
    ...(e.fuentesConsultadas ?? []).map((f) => f?.aporte),
    e.textoRedes, ...(e.etiquetas ?? []),
  ].filter(Boolean).join('\n');
}

/**
 * El semáforo pasado sobre todo lo que la ingesta no miró.
 *
 * La ingesta decide el color con el título y los primeros 600 caracteres del
 * resumen. Pero la IA reescribe con la nota ENTERA (ingesta/articulo.mjs) y
 * con lo que contaron los otros medios: si el nombre de un chico o de una
 * víctima está en el tercer párrafo, la IA lo lee, y lo que escribe no volvía
 * a pasar por ningún filtro. Leyes 26.061 y 26.485: esto no se negocia.
 *
 * Mira, en este orden: el texto completo de la fuente, los resúmenes de los
 * otros medios y lo que escribió la IA (título, copete, cuerpo y guion, y
 * desde el 25/09 también las claves, qué se sabe, qué falta confirmar, qué
 * aportó cada fuente, el texto para redes y las etiquetas).
 * Devuelve { color, motivo } con lo más grave que encontró (el rojo gana), o
 * null si todo está limpio.
 *
 * @param {object} nota   con textoDeLaFuente y fuentesTexto, si los hay
 * @param {object} [escrito]  lo que devolvió la IA
 */
export function semaforoDeLaReescritura(nota, escrito = null) {
  // Lo que se ve primero (el título, la bajada y el texto para redes) pasa
  // por el semáforo entero, como el título y el comienzo de la fuente. Lo
  // largo (el artículo completo, lo de otros medios, el cuerpo y las partes
  // nuevas) sólo por el rojo y lo de menores y víctimas: decisión del 25/09,
  // ver AMARILLO_MENORES en ingesta/fuentes.mjs.
  const aLaVista = escrito ? [escrito.titulo, escrito.copete, escrito.guion, escrito.textoRedes].filter(Boolean).join('\n') : '';
  const partes = [
    ['el texto completo de la fuente', nota?.textoDeLaFuente, true],
    ['lo que contaron otros medios', (nota?.fuentesTexto ?? []).join('\n'), true],
    ['lo que escribió la IA (título, bajada o texto para redes)', aLaVista, false],
    ['lo que escribió la IA', escrito ? textoEscrito(escrito) : '', true],
  ];
  let peor = null;
  for (const [donde, texto, soloMenores] of partes) {
    const s = semaforoDelTexto(texto, { soloMenores });
    if (!s) continue;
    const conDonde = { color: s.color, motivo: `${s.motivo}, en ${donde}` };
    if (s.color === 'rojo') return conDonde;
    peor ??= conDonde;
  }
  return peor;
}

/**
 * Una nota verde que, mirada entera, resultó sensible deja de ser verde.
 *
 * Se cambia el objeto que llegó (no una copia) a propósito: quien llama
 * (web/scripts/generar-datos.mjs) decide qué se publica mirando
 * `nota.semaforo` de esas mismas notas DESPUÉS de reescribir. Así, una nota
 * que pasa a amarillo espera a una persona y una que pasa a rojo no sale,
 * igual que si la ingesta la hubiera visto así desde el principio.
 */
function frenar(nota, s) {
  nota.semaforo = s.color;
  nota.motivo = `${s.motivo} (visto al reescribir)`;
}

/** El motivo de un rechazo del verificador, en una línea corta: el tipo de
 *  cada problema y el primero, recortado. Nunca el texto entero. */
export function motivoCorto(problemas = []) {
  const primero = String(problemas[0]?.detalle ?? '').replace(/\s+/g, ' ').slice(0, 100);
  return `${resumirProblemas(problemas)}${primero ? `: ${primero}` : ''}`;
}

// ------------------------------------------------ el nivel de verificación

/** Lo que va en "Qué falta confirmar" cuando hay una sola fuente. */
export const FRASE_FUENTE_UNICA = 'No pudo ser contrastado de forma independiente con las fuentes consultadas.';

const normalizar = (s = '') => sinTildes(s)
  .replace(/\s+/g, ' ')
  .trim();

// Una denuncia o una declaración de parte (doctrina Campillay): lo que alguien
// afirma o acusa, no un hecho comprobado. "Según" a secas no: la instrucción
// pide atribuir todo ("según informó el municipio") y eso no es una denuncia.
const DE_PARTE = /\b(denuncia\w*|denuncio|denunciaron|acusa|acusan|acuso|acusaron|acusacion\w*|acusad\w*|habria|habrian|presunt\w*|supuest\w*|segun (trascendio|fuentes|la denuncia|el denunciante|la denunciante|testigos|vecinos|familiares|allegados)|aseguro que|afirmo que|sostuvo que|reclamo que)\b/;

const EN_PALABRAS = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis'];

/** Cuántas fuentes hay, contadas como corresponde: los medios distintos (dos
 *  secciones de Clarín son UN medio) y los organismos oficiales aparte. */
function contarFuentes(origenes = [], medios = []) {
  const oficiales = [...new Set(origenes.filter((o) => o.oficial).map((o) => o.medio).filter(Boolean))];
  const deMedios = new Set([
    ...origenes.filter((o) => !o.oficial).map((o) => o.medio),
    ...medios.filter((m) => !MEDIOS_OFICIALES.has(m)),
  ].filter(Boolean).map(normalizar));
  const nOficiales = oficiales.length || (origenes.some((o) => o.oficial) ? 1 : 0);
  const nMedios = deMedios.size || (origenes.some((o) => !o.oficial) ? 1 : 0);
  return { oficiales, nOficiales, nMedios };
}

/** ¿Este dato sin confirmar toca el hecho central? Comparte con el título dos
 *  palabras que dicen algo, o una larga ("autódromo", "presupuesto"). */
function tocaElHecho(dato, titulo) {
  const delTitulo = palabrasDeTitular(titulo);
  const comunes = [...palabrasDeTitular(dato)].filter((w) => delTitulo.has(w));
  return comunes.length >= 2 || comunes.some((w) => w.length >= 8);
}

/**
 * El nivel de verificación de una nota, con su porqué. Lo calcula el código,
 * no la IA (la IA sugiere uno y queda anotado, pero no manda):
 *
 *   ALTA   hay una fuente oficial (la Municipalidad u otro organismo público,
 *          `oficial: true` en ingesta/fuentes.mjs) o dos o más medios
 *          distintos contaron lo mismo.
 *   MEDIA  un solo medio, sin confirmación independiente.
 *   BAJA   un solo medio y la nota se apoya en una denuncia o una declaración
 *          de parte (denuncia, acusó, habría, presunto, "según trascendió"…,
 *          en el titular original, el título o la bajada); o, con cualquier
 *          cantidad de fuentes, lo que falta confirmar toca el hecho central.
 *
 * Devuelve { nivel, porque, sugeridoPorIA } o null si no se sabe de dónde
 * salió la nota.
 */
export function nivelDeVerificacion({
  origenes = [], medios = [], escrito = {}, tituloFuente = '', sugerido = null,
} = {}) {
  const { oficiales, nOficiales, nMedios } = contarFuentes(origenes, medios);
  if (!nOficiales && !nMedios) return null;
  const con = (nivel, porque) => ({ nivel, porque, sugeridoPorIA: sugerido ?? null });

  const centrales = (escrito.noConfirmado ?? [])
    .filter((d) => normalizar(d) !== normalizar(FRASE_FUENTE_UNICA))
    .filter((d) => tocaElHecho(d, escrito.titulo || tituloFuente));
  if (centrales.length) return con('BAJA', 'Hay datos centrales de la nota que no pudieron confirmarse con las fuentes consultadas.');

  const cuantos = EN_PALABRAS[nMedios] ?? String(nMedios);
  if (nOficiales) {
    const quien = oficiales[0] ?? 'un organismo oficial';
    if (!nMedios) return con('ALTA', `Sale de una fuente oficial: ${quien}.`);
    if (nMedios === 1) return con('ALTA', `Lo informaron ${quien} y un medio independiente.`);
    return con('ALTA', `Lo confirman ${cuantos} medios independientes y ${quien}.`);
  }
  if (nMedios >= 2) return con('ALTA', `Lo contaron ${cuantos} medios independientes.`);

  const central = normalizar(`${tituloFuente} ${escrito.titulo ?? ''} ${escrito.copete ?? ''}`);
  if (DE_PARTE.test(central)) {
    return con('BAJA', 'Se apoya en una denuncia o en declaraciones de parte que informó un solo medio, sin confirmación independiente.');
  }
  return con('MEDIA', 'La informó un solo medio y todavía no pudo ser contrastada de forma independiente.');
}

// ---------------------------------------------------- las partes nuevas

/** Los campos que la nota suma desde el 25/09, tal como llegan a la web. */
export const CAMPOS_EXTRA = [
  'claves', 'seSabe', 'noConfirmado', 'textoRedes', 'etiquetas', 'fuentesConsultadas', 'antecedentes', 'verificacion',
];

/** Sólo las partes nuevas de un objeto (las que tienen algo). */
export function extrasDe(o) {
  if (!o) return {};
  return Object.fromEntries(CAMPOS_EXTRA
    .filter((k) => o[k] != null && !(Array.isArray(o[k]) && !o[k].length))
    .map((k) => [k, o[k]]));
}

/** Un objeto sin las partes nuevas. */
export function sinExtras(o = {}) {
  return Object.fromEntries(Object.entries(o).filter(([k]) => !CAMPOS_EXTRA.includes(k)));
}

/**
 * Las partes nuevas que van a la web: las de la decisión del panel si ahí hay
 * texto propio (la escribió la IA desde el panel, o una persona, y en ese
 * caso el panel ya las borró si cambió el texto); si no, las de la
 * reescritura automática. Nunca se mezclan: unas claves escritas sobre otro
 * texto podrían contradecir la nota.
 */
export function extrasParaLaWeb(decision, auto) {
  const textoPropio = !!decision && ['titulo', 'copete', 'cuerpo', 'guion'].some((k) => decision[k] != null);
  return extrasDe(textoPropio ? decision : auto);
}

/** Los medios que el texto para redes no puede nombrar: los de la noticia,
 *  menos los organismos oficiales ("según la Municipalidad" es atribuir). */
function mediosQueNoSeNombran(nota, origenes) {
  return [...origenes.filter((o) => !o.oficial).map((o) => o.medio), ...(nota.medios ?? []).filter((m) => !MEDIOS_OFICIALES.has(m))]
    .filter(Boolean);
}

/**
 * Las partes nuevas, verificadas y listas para publicar.
 *
 * Cada parte pasa por el verificador (verificarExtras) contra todo lo que la
 * IA recibió, antecedentes incluidos; la que no cuadra se descarta sola y la
 * nota sigue. Además:
 *   · si hay una sola fuente, "Qué falta confirmar" dice que no pudo
 *     contrastarse (y si hay varias, esa frase no va, aunque la IA la ponga);
 *   · el nivel de verificación se calcula acá (nivelDeVerificacion);
 *   · "Fuentes consultadas" se arma con los datos de la ingesta (medio,
 *     enlace, fecha) y lo que la IA dijo que aportó cada una.
 *
 * @returns {{ extras: object, descartados: {campo:string, problemas:object[]}[] }}
 */
export function completarReescritura(nota, r) {
  const origenes = origenesDe(nota);
  const pedidos = {
    claves: r.claves,
    seSabe: r.seSabe,
    noConfirmado: r.noConfirmado,
    // Un número de fuente que no existe no se muestra, sin tirar el resto.
    aportes: (r.aportes ?? []).filter((a) => a.fuente >= 1 && a.fuente <= origenes.length),
    textoRedes: r.textoRedes,
    etiquetas: r.etiquetas,
  };
  const control = verificarExtras(materialParaVerificar(nota), pedidos, { medios: mediosQueNoSeNombran(nota, origenes) });

  const quedan = {};
  const descartados = [];
  for (const campo of ['claves', 'seSabe', 'noConfirmado', 'aportes', 'textoRedes']) {
    if (!control[campo]) continue;
    if (control[campo].ok) quedan[campo] = pedidos[campo];
    else descartados.push({ campo, problemas: control[campo].problemas });
  }
  if (control.etiquetas) {
    if (control.etiquetas.validas.length) quedan.etiquetas = control.etiquetas.validas;
    if (!control.etiquetas.ok) descartados.push({ campo: 'etiquetas', problemas: control.etiquetas.problemas });
  }

  const { nOficiales, nMedios } = contarFuentes(origenes, nota.medios ?? []);
  const unica = nOficiales + nMedios === 1;
  const noConfirmado = [
    ...(quedan.noConfirmado ?? []).filter((d) => normalizar(d) !== normalizar(FRASE_FUENTE_UNICA)),
    ...(unica ? [FRASE_FUENTE_UNICA] : []),
  ];

  const verificacion = nivelDeVerificacion({
    origenes, medios: nota.medios ?? [], escrito: { ...r, noConfirmado }, tituloFuente: nota.titulo, sugerido: r.nivelSugerido,
  });

  const vistos = new Set();
  const fuentesConsultadas = origenes
    .map((o, i) => ({
      medio: o.medio, enlace: o.enlace, fecha: o.fecha, oficial: !!o.oficial,
      aporte: quedan.aportes?.find((a) => a.fuente === i + 1)?.aporte ?? null,
    }))
    .filter((f) => (f.medio || f.enlace) && !(f.enlace && vistos.has(f.enlace)) && (!f.enlace || vistos.add(f.enlace)));

  const antecedentes = (nota.antecedentes ?? []).map(({
    id, titulo, fecha, ruta,
  }) => ({
    id, titulo, fecha, ruta,
  }));

  return {
    extras: extrasDe({
      claves: quedan.claves,
      seSabe: quedan.seSabe,
      noConfirmado,
      textoRedes: quedan.textoRedes,
      etiquetas: quedan.etiquetas,
      fuentesConsultadas,
      antecedentes,
      verificacion,
    }),
    descartados,
  };
}

/**
 * Las fuentes consultadas con el enlace que ve el lector: la página de la
 * nota original. Hasta el 25/09 las de Infórmese Primero (Blogger) guardaban
 * la entrada del feed, que es XML; la ingesta ahora da la página y guarda
 * aquélla como `enlaceFeed`. Lo ya escrito con el enlace viejo se corrige acá
 * con los orígenes de hoy, sin pedir nada a Gemini.
 */
export function conEnlacesDelLector(fuentes = [], nota = {}) {
  const deHoy = [...(nota?.origenes ?? []), nota ?? {}].filter((o) => o?.enlaceFeed && o.enlace);
  if (!deHoy.length) return fuentes;
  const mapa = new Map(deHoy.map((o) => [o.enlaceFeed, o.enlace]));
  return fuentes.map((f) => (f?.enlace && mapa.has(f.enlace) ? { ...f, enlace: mapa.get(f.enlace) } : f));
}

/**
 * Lo ya publicado, revalidado con las reglas de forma de hoy (largo, tildes,
 * acusaciones, que el texto para redes no nombre al medio): la parte que ya
 * no pasa se saca, sin tocar el resto ni pedir nada a Gemini.
 */
export function revalidarExtras(cacheada = {}, nota = {}) {
  const fuentes = conEnlacesDelLector(cacheada.fuentesConsultadas ?? [], nota);
  const pedidos = {
    claves: cacheada.claves,
    seSabe: cacheada.seSabe,
    noConfirmado: cacheada.noConfirmado,
    aportes: fuentes.map((f, i) => ({ fuente: i + 1, aporte: f?.aporte })).filter((a) => a.aporte),
    textoRedes: cacheada.textoRedes,
    etiquetas: cacheada.etiquetas,
  };
  const control = verificarExtras({ titulo: nota.titulo, resumen: nota.resumenFuente }, pedidos, {
    soloForma: true, medios: mediosQueNoSeNombran(nota, fuentes),
  });
  const limpia = { ...cacheada };
  if (cacheada.fuentesConsultadas) limpia.fuentesConsultadas = fuentes;
  for (const campo of ['claves', 'seSabe', 'noConfirmado', 'textoRedes']) {
    if (control[campo] && !control[campo].ok) delete limpia[campo];
  }
  if (control.aportes && !control.aportes.ok) limpia.fuentesConsultadas = fuentes.map((f) => ({ ...f, aporte: null }));
  if (control.etiquetas && !control.etiquetas.ok) {
    if (control.etiquetas.validas.length) limpia.etiquetas = control.etiquetas.validas;
    else delete limpia.etiquetas;
  }
  return limpia;
}

/**
 * Lo que la portada de la corrida anterior ya trae reescrito, para no volver
 * a pedírselo a Gemini. La portada no guarda un campo "redactada por IA": la
 * señal es que la nota tenga guion (el resumen mecánico de la fuente no lo
 * tiene). Las que no tienen CUERPO DE VERDAD (tieneCuerpo: 70 palabras o
 * más, distinto de la bajada) quedan afuera a propósito, para que se
 * reescriban de nuevo. Hasta el 25/09 alcanzaba con `cuerpo != null`: un
 * cuerpo vacío ('') contaba como "ya hecho", se reusaba para siempre y la
 * nota nunca se volvía a intentar (39 notas sin cuerpo ese día).
 *
 * Las partes nuevas (25/09) viajan con la nota. Lo reescrito antes de que
 * existieran NO se vuelve a pedir para llenarlas: nunca se paga dos veces por
 * lo mismo, y esas notas se ven como se veían.
 */
export function previasDeLaPortada(notas) {
  return Object.fromEntries(notas
    .filter((n) => n.titulo && n.guion && tieneCuerpo(n))
    .map((n) => [n.id, {
      titulo: n.titulo, copete: n.copete, cuerpo: n.cuerpo, guion: n.guion, ...extrasDe(n), deIA: true,
    }]));
}

/** Cuántas veces, como mucho, se le pide una misma nota a Gemini, en
 *  corridas distintas (25/09). Una nota que no sale con cuerpo después de
 *  tres intentos queda sin publicar: la clave de respaldo es paga y Hernán y
 *  Andrés no quieren gastar de más en una nota que no da. */
export const MAXIMO_DE_INTENTOS = REESCRITURA.intentosMaximos;

/** Cuántas notas se le pueden pedir a la IA en un día (gasto de la clave paga). */
export const REESCRITURAS_POR_DIA = REESCRITURA.porDia;

/**
 * Cuántas notas ya se le pidieron a la IA hoy (día de Balcarce), según los
 * intentos guardados. Cuenta de más si una nota se pidió también otro día:
 * mejor pasarse de cuidadoso que de gasto.
 */
export function pedidasHoy(intentos = {}, ahora = Date.now()) {
  const dia = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: ZONA });
  const hoy = dia(Number(ahora));
  return Object.values(intentos ?? {})
    .filter((v) => v?.ultimo && dia(v.ultimo) === hoy)
    .reduce((suma, v) => suma + (v.intentos ?? 1), 0);
}

/** Con menos de esto de resumen (sumando todas las fuentes) y sin el texto
 *  completo de ninguna, no hay de dónde escribir una nota: no se le pide
 *  nada a Gemini. */
export const PALABRAS_MINIMAS_DE_MATERIAL = REESCRITURA.palabrasMinimasDeMaterial;

/** Criterio de editor (25/09): lo que el código califica con verificación
 *  BAJA (una denuncia o una declaración de parte que contó un solo medio, o
 *  datos centrales sin confirmar) no sale solo, aunque el semáforo esté en
 *  verde: espera a una persona, como una nota amarilla. */
export const FRENO_POR_VERIFICACION = { color: 'amarillo', motivo: 'verificación baja: espera a una persona' };
export const esVerificacionBaja = (x) => x?.verificacion?.nivel === 'BAJA';

/** Cuántos días se recuerdan los intentos (web/data/intentos-ia.json). */
export const DIAS_DE_INTENTOS = REESCRITURA.diasDeIntentos;

/** Los intentos de hace más de `dias` días ya no sirven: la nota ya no está
 *  en ninguna lista. Devuelve una copia podada. */
export function podarIntentos(intentos = {}, ahora = Date.now(), dias = DIAS_DE_INTENTOS) {
  const corte = Number(ahora) - dias * 86400000;
  return Object.fromEntries(Object.entries(intentos ?? {})
    .filter(([, v]) => Date.parse(v?.ultimo ?? '') >= corte)
    .sort(([a], [b]) => a.localeCompare(b)));
}

/** Una falla de Gemini que no es culpa de la nota (sin cupo, saturado, sin
 *  red, sin clave): no cuenta como intento, porque no se gastó nada. */
const FALLA_DEL_SERVICIO = /falta GEMINI|no se pudo pedir|HTTP (429|5\d\d)|fetch failed|abort|timeout|network|ECONN|ENOTFOUND|EAI_AGAIN/i;

/**
 * El texto completo de la noticia: el de la nota principal y, si ése no se
 * pudo bajar, el de alguna de las otras fuentes que contaron lo mismo.
 * Devuelve { texto, numero } (el número de fuente, como la lee la IA) o
 * { texto: null }.
 */
export async function textoCompletoDe(nota, traer = traerTexto) {
  // Si la fuente es un feed de Blogger, el texto se baja de la entrada del
  // feed (`enlaceFeed`), que lo trae entero; el enlace es la página.
  const dePrincipal = nota?.enlaceFeed ?? nota?.enlace;
  const principal = await traer(dePrincipal);
  if (principal) return { texto: principal, numero: 1 };
  const otras = origenesDe(nota)
    .map((o, i) => ({ enlace: o.enlaceFeed ?? o.enlace, numero: i + 1 }))
    .filter((o) => o.enlace && o.enlace !== dePrincipal)
    .slice(0, 3);
  const textos = await Promise.all(otras.map((o) => traer(o.enlace)));
  const i = textos.findIndex(Boolean);
  return i >= 0 ? { texto: textos[i], numero: otras[i].numero } : { texto: null };
}

/** Las palabras de todos los resúmenes de las fuentes, sin repetir uno. */
function palabrasDeResumenes(nota) {
  return palabrasDe([...new Set(origenesDe(nota).map((o) => o.resumen).filter(Boolean))].join(' '));
}

/**
 * En qué orden se gasta el tope de pedidos a la IA (26/09).
 *
 * Primero lo de Balcarce, como siempre. Después lo de afuera, pero ya no
 * sólo por puntaje: el puntaje solo dejaba sin cuerpo a las secciones flacas
 * (Cultura y agenda, Tecnología, Policiales, Agro), porque Política,
 * Economía y Deportes siempre tienen más notas con más puntos, y una nota sin
 * cuerpo no se publica. Los usuarios piden tres notas por sección. Entonces
 * la sección con MENOS notas ya escritas pasa primero: a cada nota se le
 * asigna el "lugar" que ocuparía en su sección (las que ya tienen cuerpo de
 * una corrida anterior cuentan como lugares ocupados) y se reescribe por
 * lugar, de menor a mayor, y a igual lugar por puntaje.
 *
 * No cambia CUÁNTO se le pide a la IA (el tope por corrida y por día siguen
 * igual): sólo QUÉ se le pide primero. Lo ya escrito no gasta nada.
 */
export function ordenarParaReescribir(notas, previas = {}) {
  const porPuntaje = (a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0);
  const yaEscrita = (n) => !!(previas[n.id]?.titulo && tieneCuerpo(previas[n.id]));
  const locales = notas.filter(esLocal).sort(porPuntaje);
  const deAfuera = notas.filter((n) => !esLocal(n)).sort(porPuntaje);
  const ocupados = {};
  for (const n of [...locales, ...deAfuera]) if (yaEscrita(n)) ocupados[n.seccion] = (ocupados[n.seccion] ?? 0) + 1;
  const lugar = new Map();
  const vistos = {};
  for (const n of deAfuera) {
    if (yaEscrita(n)) { lugar.set(n, -1); continue; }
    vistos[n.seccion] = (vistos[n.seccion] ?? 0) + 1;
    lugar.set(n, (ocupados[n.seccion] ?? 0) + vistos[n.seccion]);
  }
  deAfuera.sort((a, b) => (lugar.get(a) - lugar.get(b)) || porPuntaje(a, b));
  return [...locales, ...deAfuera];
}

/**
 * Reescribe con IA, sola y sin que nadie la mire, las notas que van a salir
 * sin revisión humana (semáforo verde y sin que una persona haya decidido
 * algo). Es lo que hace posible que el sitio se actualice con la PC apagada
 * y aun así tenga texto propio, no sólo el resumen de la fuente.
 *
 * Nunca pisa lo que ya escribió una persona (`decisiones`), y reusa lo que
 * ya se reescribió en una corrida anterior (`previas`, la portada de la vez
 * pasada) en vez de volver a gastar cuota en la misma nota — pero sólo si
 * tiene cuerpo de verdad (tieneCuerpo): lo que quedó sin cuerpo vuelve a ser
 * candidata.
 *
 * Primero lo de Balcarce (esLocal) y, en lo de afuera, la sección con menos
 * notas escritas (ordenarParaReescribir): el tope por corrida se gasta en lo
 * que define al medio y en que ninguna sección quede vacía, no en la
 * Fórmula 1.
 *
 * Antes de pedirle nada a Gemini, el texto completo de la fuente pasa por el
 * semáforo; y lo que escribe la IA, también (semaforoDeLaReescritura). Si da
 * rojo o amarillo, no se usa y la nota cambia de color: deja de salir sola.
 *
 * Desde el 25/09 una nota automática SIN CUERPO no se publica
 * (web/lib/cuerpo.js). Por eso acá:
 *   · si no hay texto completo de ninguna fuente y los resúmenes suman menos
 *     de 60 palabras, no se le pide nada a Gemini ("sin material");
 *   · si el cuerpo no pasa el verificador, se sacan las ORACIONES con el dato
 *     que no cuadra (depurarCuerpo) y, si lo que queda pasa y tiene 70
 *     palabras o más, se usa; si no, un segundo pedido con la corrección, y
 *     lo mismo;
 *   · si falla el título, la bajada o el guion, la nota no se usa (como
 *     siempre);
 *   · cada nota se intenta como mucho MAXIMO_DE_INTENTOS veces, en corridas
 *     distintas: los intentos se anotan en `intentos` (que se cambia, a
 *     propósito: quien llama lo guarda en web/data/intentos-ia.json).
 * Lo que no sale con cuerpo no entra en el resultado: la nota queda
 * "esperando cuerpo", sin publicarse.
 *
 * Las partes nuevas (claves, qué se sabe, qué falta confirmar, fuentes
 * consultadas, texto para redes, etiquetas) y el nivel de verificación:
 * completarReescritura(). Si falla una parte, se descarta esa sola.
 *
 * @param {object[]} notas   OJO: las que resultan sensibles se modifican (frenar)
 * @param {object} [o]
 * @param {Record<string, {titulo:string,copete:string,cuerpo?:string,guion:string}>} [o.previas]
 * @param {Record<string, object>} [o.decisiones]
 * @param {number} [o.tope]
 * @param {object[]} [o.archivo] lo ya publicado (web/data/archivo.json), de donde salen los antecedentes
 * @param {Record<string, {intentos:number, ultimo:string, motivo:string}>} [o.intentos] se cambia
 * @param {object} [o.opciones] se le pasa tal cual a reescribir() (fetchFn, intentos)
 * @returns {Promise<Record<string, {titulo:string,copete:string,cuerpo:string,guion:string,deIA:boolean}>>}
 */
export async function reescribirAutomaticas(notas, {
  previas = {}, decisiones = {}, tope = REESCRITURAS_POR_CORRIDA, opciones, traer = traerTexto, registro = console.log,
  archivo = [], ahora = Date.now(), intentos = {}, maximoDeIntentos = MAXIMO_DE_INTENTOS,
  minimoDeMaterial = PALABRAS_MINIMAS_DE_MATERIAL, porDia = REESCRITURAS_POR_DIA,
} = {}) {
  const resultado = {};
  const cuenta = {
    hechas: 0, conCuerpo: 0, fallos: 0, rechazadas: 0, sinCuerpo: 0, sinMaterial: 0, agotadas: 0,
    oraciones: 0, frenadas: 0, partesDescartadas: 0,
  };
  let motivo = null;
  const yaPedidasHoy = pedidasHoy(intentos, ahora);
  let topeDelDia = false;

  const candidatas = ordenarParaReescribir(
    [...notas]
      .filter((n) => n.semaforo === 'verde')
      .filter((n) => !decisionHumana(decisiones[n.id])),
    previas,
  );

  // En el registro de Actions no va el título de una nota frenada por el
  // semáforo: si la frenó, puede ser justamente porque identifica a alguien.
  const frenada = (nota, s) => {
    frenar(nota, s);
    cuenta.frenadas += 1;
    registro(`  semáforo al reescribir · nota ${nota.id} · ${s.color}: ${s.motivo}`);
  };

  /** Anota un intento. Si con éste se agotaron, el registro lo dice. */
  const anotarIntento = (nota, porque, extra = {}) => {
    const n = (intentos[nota.id]?.intentos ?? 0) + 1;
    intentos[nota.id] = {
      intentos: n, ultimo: new Date(Number(ahora)).toISOString(), motivo: String(porque).slice(0, 160), ...extra,
    };
    if (porque !== 'con cuerpo' && !extra.baja && n >= maximoDeIntentos) {
      registro(`  sin cuerpo después de ${n} intentos, no se publica · nota ${nota.id} · ${String(porque).slice(0, 120)}`);
    }
  };

  for (const nota of candidatas) {
    // Ya se reescribió en una corrida anterior, CON cuerpo: se revalida (es
    // local y gratis, no pide nada a Gemini) y se reusa sin gastar un pedido
    // nuevo. Así, si mañana se agrega una regla nueva a verificar.mjs, lo que
    // ya estaba publicado y ahora la incumple se cae solo y se vuelve a
    // reescribir en una corrida siguiente, en vez de quedar mal para siempre
    // porque "ya estaba hecho".
    const previa = previas[nota.id];
    if (previa?.titulo && tieneCuerpo(previa)) {
      const cacheada = revalidarExtras(previa, nota);
      // Lo ya publicado también pasa por el semáforo de hoy: si la lista
      // creció (como el 25/09), lo que ya estaba y ahora da rojo o amarillo
      // deja de salir solo en esta misma corrida.
      const sensible = semaforoDeLaReescritura(nota, cacheada);
      if (sensible) { frenada(nota, sensible); continue; }
      if (esVerificacionBaja(cacheada)) { frenada(nota, FRENO_POR_VERIFICACION); continue; }
      // Sólo la forma (largo, tildes, que el cuerpo no repita el copete):
      // los datos ya se compararon contra el texto completo cuando se escribió,
      // y ese texto no se vuelve a bajar en cada corrida.
      const control = verificar(
        { titulo: nota.titulo, resumen: nota.resumenFuente },
        {
          titulo: cacheada.titulo, copete: cacheada.copete, guion: cacheada.guion, cuerpo: cacheada.cuerpo,
        },
        { soloForma: true },
      );
      if (control.ok) { resultado[nota.id] = cacheada; continue; }
      // No entra en resultado: no se publica por ahora, y como no aparece
      // acá tampoco va a aparecer en `previas` la próxima vez, así que se
      // reintenta con Gemini en una corrida futura.
      continue;
    }
    if (cuenta.hechas >= tope || cuenta.fallos >= FALLOS_PARA_CORTAR) continue; // sigue por si algo más abajo está en caché
    // El tope del día: la clave es paga. Lo que no entra hoy espera a mañana.
    if (yaPedidasHoy + cuenta.hechas >= porDia) {
      if (!topeDelDia) { topeDelDia = true; registro(`  tope del día: ya se le pidieron ${yaPedidasHoy + cuenta.hechas} notas a la IA hoy (máximo ${porDia}); el resto espera a mañana`); }
      continue;
    }

    // Ya se escribió y el código la calificó con verificación BAJA: espera a
    // una persona sin gastar otro pedido, salvo que hoy la cuenten más
    // fuentes que entonces (con más fuentes el nivel puede subir).
    const anterior = intentos[nota.id];
    if (anterior?.baja && origenesDe(nota).length <= (anterior.fuentes ?? 0)) { frenada(nota, FRENO_POR_VERIFICACION); continue; }

    // El tope de intentos por nota: tres corridas y no más.
    if ((intentos[nota.id]?.intentos ?? 0) >= maximoDeIntentos) { cuenta.agotadas += 1; continue; }

    // El texto completo de la nota original (o de otra fuente que contó lo
    // mismo), para que el cuerpo salga de hechos reales y no de rellenar. Y
    // los antecedentes: lo que el sitio ya publicó sobre el tema.
    const completo = await textoCompletoDe(nota, traer);
    const conTexto = {
      ...nota,
      textoDeLaFuente: completo.texto,
      fuenteDelTexto: completo.numero,
      antecedentes: antecedentesDe(nota, archivo, { ahora }),
    };

    // Antes de gastar un pedido: si la nota entera es sensible, la IA no la
    // escribe y la nota deja de salir sola.
    const deLaFuente = semaforoDeLaReescritura(conTexto);
    if (deLaFuente) { frenada(nota, deLaFuente); continue; }

    // Sin texto completo y con un resumen de dos renglones no hay nota que
    // escribir: pedírsela a Gemini es pagar por relleno (o por un cuerpo que
    // el verificador va a tirar). Cuenta como intento: quizás en la corrida
    // siguiente otro medio cuenta lo mismo y hay material.
    if (!conTexto.textoDeLaFuente && palabrasDeResumenes(nota) < minimoDeMaterial) {
      cuenta.sinMaterial += 1;
      anotarIntento(nota, 'sin material');
      continue;
    }
    cuenta.hechas += 1;

    const fuente = materialParaVerificar(conTexto);
    const comprobar = (x) => verificar(fuente, {
      titulo: x.titulo, copete: x.copete, guion: x.guion, cuerpo: x.cuerpo,
    });

    /** Lo que se puede publicar de una respuesta: tal cual, o con el cuerpo
     *  sin las oraciones que no pasan. Nunca sin cuerpo. */
    const evaluar = (x) => {
      const control = comprobar(x);
      const cabeza = comprobar({ ...x, cuerpo: '' });
      if (!cabeza.ok) return { ok: false, problemas: control.problemas, motivo: `título o bajada: ${motivoCorto(cabeza.problemas)}` };
      if (control.ok && tieneCuerpo(x)) return { ok: true, r: x, sacadas: [] };
      const depurado = control.ok ? { cuerpo: x.cuerpo, sacadas: [] } : depurarCuerpo(fuente, x);
      const limpio = { ...x, cuerpo: depurado.cuerpo };
      if (depurado.sacadas.length && comprobar(limpio).ok && tieneCuerpo(limpio)) {
        return { ok: true, r: limpio, sacadas: depurado.sacadas };
      }
      const palabras = palabrasDe(depurado.cuerpo);
      return control.ok
        ? { ok: false, problemas: [], corto: palabrasDe(x.cuerpo), motivo: `cuerpo corto (${palabrasDe(x.cuerpo)} palabras)` }
        : { ok: false, problemas: control.problemas, motivo: `cuerpo: ${motivoCorto(control.problemas)}; sin esas oraciones quedan ${palabras} palabras` };
    };

    let r = await reescribirConRespaldo(conTexto, mecanicoPorDefecto, opciones);
    if (!r.deIA) {
      // Gemini falló. Si fue culpa del servicio (sin cupo, sin red), no se
      // gastó nada y no cuenta; si contestó algo que no sirve, sí.
      cuenta.fallos += 1;
      motivo ??= r.motivoRespaldo;
      if (!FALLA_DEL_SERVICIO.test(String(r.motivoRespaldo))) anotarIntento(nota, `Gemini: ${r.motivoRespaldo}`);
      continue;
    }
    let evaluacion = evaluar(r);

    // Segunda oportunidad: se le dice qué inventó (o que el cuerpo quedó
    // corto) y se le pide que lo rehaga. Antes se tiraba todo apenas aparecía
    // un dato de más, y así sólo 1 de cada 10 notas llegaba a tener cuerpo.
    if (!evaluacion.ok) {
      const correccion = evaluacion.problemas.map((p) => p.detalle).slice(0, 6);
      if (evaluacion.corto !== undefined) {
        correccion.push(`el cuerpo quedó corto (${evaluacion.corto} palabras): es obligatorio y va de ${CUERPO.palabrasPedidasMinimo} a ${CUERPO.palabrasPedidasMaximo} palabras, desarrollado con lo que dicen todas las fuentes`);
      }
      const r2 = await reescribirConRespaldo(conTexto, mecanicoPorDefecto, { ...opciones, correccion });
      if (r2.deIA) { r = r2; evaluacion = evaluar(r2); }
    }

    if (!evaluacion.ok) {
      // No se publica: queda "esperando cuerpo" y se reintenta en otra
      // corrida, hasta el tope. El motivo va al registro de "Actualizar la
      // web": sin eso, "12 rechazadas" no decía si era un número, un nombre o
      // una tilde.
      if (evaluacion.motivo.startsWith('título')) cuenta.rechazadas += 1; else cuenta.sinCuerpo += 1;
      registro(`  IA rechazada · ${String(nota.titulo).slice(0, 50)} · ${evaluacion.motivo}`);
      anotarIntento(nota, evaluacion.motivo);
      continue;
    }
    r = evaluacion.r;
    if (evaluacion.sacadas.length) {
      cuenta.oraciones += evaluacion.sacadas.length;
      const tipos = [...new Set(evaluacion.sacadas.flatMap((s) => s.problemas.map((p) => p.tipo)))];
      registro(`  oraciones sacadas · nota ${nota.id} · ${evaluacion.sacadas.length} (${tipos.join(', ')}), quedan ${palabrasDe(r.cuerpo)} palabras`);
    }

    // Las partes nuevas, cada una por el verificador: la que no cuadra se
    // descarta sola. En el registro, el id y no el título.
    const { extras, descartados } = completarReescritura(conTexto, r);
    if (descartados.length) {
      cuenta.partesDescartadas += descartados.length;
      registro(`  partes descartadas · nota ${nota.id} · ${descartados.map((d) => `${d.campo}: ${motivoCorto(d.problemas)}`).join(' · ')}`);
    }

    // Lo que escribió la IA, todo, por el semáforo antes de publicarse.
    const loEscrito = semaforoDeLaReescritura({}, { ...r, ...extras });
    if (loEscrito) { frenada(nota, loEscrito); anotarIntento(nota, `semáforo: ${loEscrito.motivo}`); continue; }

    // Criterio de editor: con verificación BAJA no sale sola.
    if (esVerificacionBaja(extras)) {
      frenada(nota, FRENO_POR_VERIFICACION);
      anotarIntento(nota, FRENO_POR_VERIFICACION.motivo, { baja: true, fuentes: origenesDe(nota).length });
      continue;
    }

    anotarIntento(nota, 'con cuerpo');
    cuenta.conCuerpo += 1;
    resultado[nota.id] = {
      titulo: r.titulo, copete: r.copete, cuerpo: r.cuerpo, guion: r.guion, ...extras, deIA: true,
    };
  }

  if (cuenta.hechas || cuenta.frenadas || cuenta.sinMaterial || cuenta.agotadas) {
    registro(`  reescritura: ${cuenta.hechas} pedidas, ${cuenta.conCuerpo} con cuerpo, ${cuenta.fallos} fallaron${motivo ? ` (${String(motivo).slice(0, 160)})` : ''}, `
      + `${cuenta.sinCuerpo} sin cuerpo que sirva, ${cuenta.rechazadas} rechazadas por el título o la bajada, ${cuenta.sinMaterial} sin material, `
      + `${cuenta.oraciones} oraciones sacadas, ${cuenta.agotadas} ya agotaron los ${maximoDeIntentos} intentos, `
      + `${cuenta.partesDescartadas} partes nuevas descartadas, ${cuenta.frenadas} frenadas por el semáforo`);
    registro(`  claves de Gemini usadas: ${USO_DE_CLAVES.redaccion} con la gratis, ${USO_DE_CLAVES.redes} con la paga`);
  }
  return resultado;
}

if (process.argv[1] && process.argv[1].endsWith('reescritura.mjs')) {
  const prueba = {
    titulo: 'Puesta en valor de las canchas de tenis del Polideportivo Municipal',
    resumenFuente: 'El municipio informó que se realizaron trabajos de mantenimiento y mejora en las canchas de tenis del Polideportivo, que incluyeron el recambio de la superficie y el arreglo del alambrado perimetral.',
    seccion: 'Balcarce',
    medios: ['Puntonueve', 'News Balcarce'],
  };
  console.log('\n\x1b[1mPRUEBA DE REESCRITURA\x1b[0m\n');
  console.log('Original:', prueba.titulo);
  try {
    const r = await reescribir(prueba);
    console.log('\n\x1b[32mTítulo IA:\x1b[0m', r.titulo);
    console.log('\x1b[32mCopete:\x1b[0m  ', r.copete);
    console.log('\x1b[32mGuion:\x1b[0m   ', r.guion, '\n');
  } catch (e) {
    console.log('\n\x1b[31mfalla\x1b[0m', e.message, '\n');
  }
}

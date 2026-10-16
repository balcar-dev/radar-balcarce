// La selección nueva, en MODO SOMBRA (16/10/2026). NO está conectada a producción: nadie la llama
// desde web/scripts/generar-datos.mjs ni desde ningún workflow. La usa sólo ingesta/comparar-seleccion.mjs
// para medir qué saldría con las reglas nuevas, y las pruebas (pruebas/seleccion-nueva.test.mjs).
// El diseño, con el porqué de cada regla: docs/flujo/FLUJO-NUEVO.html.
//
// La idea (Hernán, 16/10): "un flujo real sin nada que lo frene; máximo 150 notas por día en total;
// TODO lo de Balcarce sale, salvo las autopublicadas de otros medios o cosas muy menores; y todo lo
// NACIONAL que tenga muchas fuentes también se publica: no es una competencia entre lo nacional y
// Balcarce. Lo de Balcarce va a los repasos, a los posteos y se queda más tiempo en la tapa."
//
// Recibe lo MISMO que hoy usa la decisión: las historias que devuelve ingestar() (con su semáforo,
// sus medios y sus orígenes) y las fichas de la lectura con IA (web/data/fichas.json). Devuelve, por
// historia, publicar / esperar / descartar con su motivo, y un puntaje para ORDENAR (no para decidir).
//
// Los frenos que no se tocan (lista roja, lo que no se publica nunca, lo que cuida a menores y
// víctimas) se toman de las MISMAS listas que hoy (REGLAS_SEMAFORO en ingesta/fuentes.mjs), y se
// vuelven a mirar sobre TODO el texto que trae la historia (los resúmenes de cada medio), no sólo
// sobre el título: este módulo es, a propósito, más estricto que el flujo de hoy en eso.
//
// Sin dependencias de afuera de Node (como todo ingesta/).

import {
  esDeAca, esDeUnMedioDeAca, contarMedios, semaforoDelTexto, esEfemerideAjena, normalizar, paraPruebas,
} from './ingesta.mjs';
import { REGLAS_SEMAFORO, CONEXION_ARGENTINA, MOTIVO_COTIZACION, MOTIVO_INTERNACIONAL } from './fuentes.mjs';

const { contiene } = paraPruebas;

/** Los números del flujo nuevo. Reemplazarían a MEDIOS_DE_AFUERA, CUPO_DE_AFUERA y parte de PORTADA
 *  (ingesta/criterio.mjs) el día que se apruebe; mientras, viven sólo acá. */
export const SELECCION_NUEVA = {
  // El tope de notas publicadas (de medios: Balcarce + nacional) en 24 horas corridas.
  topeDiario: 150,
  // Lo que se le guarda a lo de Balcarce dentro del tope (lo que se publica de acá en un día: medido,
  // 14 a 25; con "sale todo", unas 30). Lo de Balcarce NUNCA se frena por el tope: si un día hay más,
  // se usa lo que hubo (y el total puede pasar de 150 por lo de acá, nunca por lo de afuera).
  reservaLocal: 30,
  // Cuántos medios independientes (un grupo cuenta una vez: Clarín = TN = Olé) tienen que contar
  // una noticia de afuera para que salga.
  mediosNacional: 3,
  mediosNacionalConFigura: 2,
  // Las secciones que cubren pocos medios y que se quieren con más notas (tecnología, ciencia, IA)
  // piden 2. Se comparan sin tildes ni mayúsculas, así sirven con las secciones nuevas.
  seccionesConDos: ['tecnologia', 'ciencia', 'ciencia y tecnologia', 'inteligencia artificial', 'ia', 'investigacion',
    'salud y ciencia', 'espacio', 'automovilismo'],
  // Cuando el tope aprieta, una sola sección no se lleva más que esta parte de los lugares de afuera
  // (para que un domingo de fútbol no sea todo Olé).
  parteMaximaPorSeccion: 0.3,
  // Ventanas, en horas. Lo de afuera, 24 (hoy 12): una noticia de la noche que los demás medios
  // levantan a la mañana ("Murió Marcelo Decall": Crónica a las 20:56, La Nación y Perfil al otro día
  // a las 11:42) completa sus medios con más de 12 horas y hoy "llega tarde".
  horasParaEstrenarLocal: 48,
  horasParaEstrenarNacional: 24,
  horasEsperaLectura: 2,
  horasEnTapaLocal: 72,
  horasEnTapaNacional: 24,
  // El refrito: lo de acá que ya salió en los últimos días contado por otro medio.
  diasRefrito: 7,
  parecidoRefrito: 0.7,
  palabrasEnComunRefrito: 3,
  palabrasNuevasRefrito: 1,
  // El puntaje (sólo ordena). Lo de Balcarce arranca de una base que lo deja arriba de casi todo lo de afuera.
  puntaje: {
    baseLocal: 60,
    medios: [[8, 36], [6, 30], [4, 24], [3, 16], [2, 8]],
    frescura: [[3, 20], [6, 14], [12, 8]],
    importanciaAlta: 12,
    importanciaMedia: 6,
    impactoDirecto: 10,
    impactoIndirecto: 5,
    servicio: 8,
    figura: 6,
    // Cuánto pierde por hora en la tapa: lo de acá envejece más despacio.
    caidaPorHoraLocal: 0.8,
    caidaPorHoraNacional: 2.5,
  },
  // Repasos (podcasts) y posteos.
  repaso: { notas: 4, minimoNacional: 50 },
  facebook: { porDia: 5, minimoNacional: 52 },
};

/** Lo que nunca va solo a redes (CLAUDE.md, regla firme). */
export const SECCIONES_CON_PERSONA_EN_REDES = ['Policiales', 'Política'];

export const ACCIONES = ['publicar', 'esperar', 'descartar'];

const sinTildes = (s) => normalizar(String(s ?? ''));
const esSeccionConDos = (seccion) => SELECCION_NUEVA.seccionesConDos.includes(sinTildes(seccion).trim());

/** Todo el texto que trae una historia: título, resumen y el resumen de cada medio. */
export function textoDeLaHistoria(n = {}) {
  return [n.titulo, n.resumenFuente, ...(n.fuentesTexto ?? []), ...(n.origenes ?? []).map((o) => o.resumen)]
    .filter(Boolean).join('\n');
}

// ------------------------------------------------------------------ 1. los frenos que no se tocan

/**
 * ¿Toca la lista roja o lo que no se publica nunca? Devuelve el motivo o null. Mira el semáforo que ya
 * trae la historia Y vuelve a pasar las listas por todo su texto: si cualquiera de los dos dice rojo, rojo.
 * Esto NO se afloja nunca (CLAUDE.md: "no tocar esa lista sin preguntar").
 */
export function frenoRojo(n = {}) {
  if (n.semaforo === 'rojo') return `lista roja o nunca (${n.motivo ?? 'semáforo'})`;
  const sensible = semaforoDelTexto(textoDeLaHistoria(n));
  if (sensible?.color === 'rojo') return `lista roja: ${sensible.motivo}`;
  const titulo = sinTildes(n.titulo);
  if ((REGLAS_SEMAFORO.nunca ?? []).some((p) => contiene(titulo, p))) return 'lista de sepelios: no se publica nunca';
  if (esEfemerideAjena(n)) return 'efeméride de otro medio: no se publica nunca';
  return null;
}

/**
 * ¿Necesita a una persona por cuidar a un menor o a una víctima? Lo que hoy el semáforo deja amarillo
 * por "necesita ojo humano" (chicos, víctimas, muertes de acá, una detención que nadie confirma) sigue
 * esperando, y además se mira lo de menores sobre todo el texto (los resúmenes de todos los medios).
 */
export function frenoPersona(n = {}) {
  if (n.semaforo === 'amarillo' && String(n.motivo ?? '').startsWith('necesita ojo humano')) return n.motivo;
  const menores = semaforoDelTexto(textoDeLaHistoria(n), { soloMenores: true });
  if (menores) return menores.motivo;
  return null;
}

// ------------------------------------------------------------------ 2. autopublicadas y menudencias

// Un medio de acá hablando de sí mismo o anunciando su programación. Sólo para lo de un MEDIO (no para
// un organismo: la Municipalidad anunciando un sorteo de viviendas es noticia). Se mira el título ya
// normalizado (sin tildes ni signos).
const AUTOPUBLICADA = [
  // "El abogado de Virginia Aparicio visita una radio local para hablar del caso" (Radio Gabal, 16/10).
  /\b(visita|visitara|visitará|estara|estará|pasara por|pasará por|llega a|invitad[oa]s? (a|en))\b.{0,40}\b(radio|estudios|programa|stream|streaming|la fm)\b/,
  // "Radio Líder Balcarce Stream alcanza cifras récord a dos semanas de su inicio" (La Vanguardia, 11/10).
  /\b(radio|fm|stream|streaming|canal|diario|portal|semanario)\b.{0,40}\b(record|récord|cumple|aniversario|alcanza|estrena|lanza|nueva programacion|nueva programación|audiencia|oyentes|seguidores|suscriptores)\b/,
  /^(escucha|escuchá|mira|mirá|segui|seguí|sintoniza|sintonizá|en vivo|programa completo|la entrevista completa|audio completo)\b/,
];

// Lo que ya damos nosotros, o que no es noticia.
const MENUDENCIAS = [
  { motivo: 'farmacias de turno (el sitio tiene la suya)', re: /farmacias?\b.{0,30}\bturnos?\b|\bturnos? de farmacias?\b|farmacias? de turno/ },
  // El pronóstico del día de una ciudad ("El tiempo en el AMBA para este viernes", "Clima hoy en Corrientes",
  // "El pronóstico anticipa una semana fresca" de Radio Gabal). No el clima para el campo ni una alerta.
  { motivo: 'pronóstico del tiempo (el sitio tiene el suyo)', re: /^(el )?(clima|pronostico|tiempo)( hoy| de hoy| para hoy| del dia)?( en [a-z ]+)?[ ,:]+(para|hoy|este|esta|el pronostico|del|manana)\b|\bpronostico (anticipa|extendido|del fin de semana|para (hoy|manana|el))\b|\bclima (muestra|de hoy|para hoy)\b|\bcielo (nublado|despejado|parcialmente)\b/, salvo: /alerta|suspend|granizo|evacu|emergencia|temporal|campo|productor|siembra|cosecha|cultivo|lluvias de mas de/ },
  { motivo: 'resumen o recopilación sin novedad', re: /lo mas leido|resumen (de noticias|semanal|de la semana|informativo)|las noticias (de hoy|del dia|de la semana)|titulares (de|del)|tapas? de (hoy|los diarios)/ },
  { motivo: 'horóscopo o santoral', re: /horoscopo|santoral|frase del dia/ },
  { motivo: 'saludo, no noticia', re: /^(feliz|felices|saludos?)\b/ },
];

/** ¿Es una nota que un medio publica sobre sí mismo, o una promoción? Devuelve el motivo o null. */
export function esAutopublicada(n = {}) {
  if (n.oficial) return null;
  const titulo = sinTildes(n.titulo);
  // Lo de un medio de acá hablando de sí mismo (en lo de afuera, "Netflix alcanza récord de suscriptores" es noticia).
  if (n.alcance === 'local' && AUTOPUBLICADA.some((re) => re.test(titulo))) return 'autopublicada: el medio habla de sí mismo o anuncia su programación';
  const texto = sinTildes(`${n.titulo} ${n.resumenFuente ?? ''}`);
  const promo = (REGLAS_SEMAFORO.promocional ?? []).find((p) => contiene(texto, p) && !/sorteo (del|de la|de los) (fixture|zonas|cruces|grupos)/.test(texto));
  if (promo) return `autopublicada: promoción ("${promo}")`;
  if (n.semaforo === 'amarillo' && String(n.motivo ?? '').startsWith('parece promoción')) return 'autopublicada: promoción';
  return null;
}

/** ¿Es una menudencia (algo que ya damos nosotros, un resumen, un saludo)? Devuelve el motivo o null. */
export function esMenudencia(n = {}) {
  const titulo = sinTildes(n.titulo);
  for (const m of MENUDENCIAS) {
    if (m.re.test(titulo) && !(m.salvo && m.salvo.test(titulo))) return `menudencia: ${m.motivo}`;
  }
  if (n.motivo === MOTIVO_COTIZACION) return 'menudencia: cotización del dólar (está en /dolar)';
  return null;
}

const VACIAS = new Set(['para', 'por', 'con', 'una', 'uno', 'unos', 'unas', 'los', 'las', 'del', 'que', 'como', 'sobre', 'tras',
  'entre', 'desde', 'hasta', 'este', 'esta', 'estos', 'estas', 'sus', 'mas', 'muy', 'ante', 'balcarce', 'nuevo', 'nueva',
  'cuando', 'donde', 'dentro', 'fueron', 'sera', 'seran', 'hacia', 'tiene', 'tienen', 'hace', 'hizo', 'todo', 'todos']);
const palabrasDe = (titulo) => new Set(sinTildes(titulo).split(/[^a-z0-9ñ]+/).filter((p) => p.length >= 4 && !VACIAS.has(p) && !/^\d+$/.test(p)));
const numerosDe = (titulo) => new Set((sinTildes(titulo).match(/\d+/g) ?? []));

/**
 * ¿Es un refrito de algo de acá que ya salió? (El Diario cuenta el 15/10 lo que Acción 5 contó el 12/10.)
 * Se compara el título con lo publicado en los últimos `diasRefrito` días: si comparten
 * `palabrasEnComunRefrito` palabras o más, el parecido pasa de `parecidoRefrito`, el título nuevo suma como
 * mucho `palabrasNuevasRefrito` palabra que el viejo no tenía y no trae ningún número que el viejo no tuviera (una fecha nueva, una cifra nueva = novedad), es refrito: no sale
 * como nota nueva (se suma como fuente a la que ya salió). `publicadas`: [{ id, titulo, fecha }].
 */
export function refritoDe(n = {}, publicadas = [], ahora = Date.now()) {
  if (!publicadas.length) return null;
  const a = palabrasDe(n.titulo);
  if (a.size < SELECCION_NUEVA.palabrasEnComunRefrito) return null;
  const numsA = numerosDe(n.titulo);
  const desde = ahora - SELECCION_NUEVA.diasRefrito * 864e5;
  const fechaNota = Date.parse(n.fecha ?? '') || ahora;
  for (const p of publicadas) {
    if (!p?.titulo || p.id === n.id) continue;
    const fp = Date.parse(p.fecha ?? '');
    // Sólo lo que salió ANTES que esta nota (y dentro de la ventana).
    if (!(fp >= desde) || fp > fechaNota) continue;
    const b = palabrasDe(p.titulo);
    const comunes = [...a].filter((x) => b.has(x)).length;
    if (comunes < SELECCION_NUEVA.palabrasEnComunRefrito) continue;
    if (comunes / Math.min(a.size, b.size) < SELECCION_NUEVA.parecidoRefrito) continue;
    // Dos palabras nuevas o más ya cuentan otra cosa ("Suspenden la Fiesta Nacional del Postre por el mal clima").
    if (a.size - comunes > SELECCION_NUEVA.palabrasNuevasRefrito) continue;
    const numsB = numerosDe(p.titulo);
    if ([...numsA].some((x) => !numsB.has(x))) continue;
    return { id: p.id, titulo: p.titulo, fecha: p.fecha };
  }
  return null;
}

// ------------------------------------------------------------------ 3. de dónde es

// Lo de acá dicho sin "Balcarce" (sólo en un medio de acá; propuesta P8a de BALCARCE-TODAS-LAS-NOTAS.md).
const SENALES_DE_ACA = ['hospital municipal', 'felipe fossati', 'teatro municipal', 'casa de la cultura', 'museo historico municipal',
  'escuela municipal', 'policia comunal', 'sociedad rural de balcarce', 'liga balcarcena', 'cerro el triunfo', 'cerro el centinela',
  'muhba', 'museo fangio', 'autodromo juan manuel fangio', 'concejo deliberante', 'intendente reino', 'esteban reino'];

/** La sección según la ficha de la IA (si hay), como hoy hace aplicarFichas, sin sacar nada. */
export function seccionDe(n = {}, ficha = null, local = false) {
  const deLaFicha = ficha?.seccion ? ({ Servicios: 'Balcarce', País: 'Argentina' }[ficha.seccion] ?? ficha.seccion) : null;
  const s = deLaFicha ?? n.seccion ?? 'Argentina';
  if (s === 'Balcarce' && !local) return n.seccion && n.seccion !== 'Balcarce' ? n.seccion : 'Argentina';
  if (s === 'Argentina' && local) return 'Balcarce';
  return s;
}

/**
 * La clase de una historia: 'balcarce' (sale toda), 'nacional' (sale si la cuentan N medios) o
 * 'espera-ia' (un medio de acá que no nombra nada de acá y la IA todavía no leyó: puede ser una copia
 * de una noticia de afuera).
 */
export function claseDe(n = {}, ficha = null) {
  const local = n.alcance === 'local';
  if (esDeUnMedioDeAca(n)) return 'balcarce';
  // La zona (la 226, la 55, la papa) contada por un medio de afuera: de acá, salvo que la IA diga que no le
  // cambia nada a Balcarce ("un sector de la Ruta 226" en Mar del Plata).
  if (n.deLaZona && !(ficha?.impacto === 'nulo' && !local)) return 'balcarce';
  // De un medio de acá, "de la región" con impacto indirecto también es de acá: la gente de acá en algo de la
  // zona ("Tenis: en Copa Sudamericana competirá Natalia Carballo", Acción 5, 12/10: la IA dijo región e indirecto).
  const iaDiceAca = ficha && (ficha.ambito === 'balcarce' || ficha.impacto === 'directo'
    || (local && ficha.ambito === 'region' && ficha.impacto === 'indirecto'));
  const iaDiceAfuera = ficha && !iaDiceAca;
  if (local) {
    if (iaDiceAca) return 'balcarce';
    if (iaDiceAfuera) return 'nacional';
    if (esDeAca(n) && (n.nombraBalcarce || n.nombraAca)) return 'balcarce';
    const texto = sinTildes(`${n.titulo} ${n.resumenFuente ?? ''}`);
    if (SENALES_DE_ACA.some((p) => contiene(texto, p))) return 'balcarce';
    return 'espera-ia';
  }
  // De un medio de afuera: es de acá si nombra a Balcarce en el título (y la IA no lo desmiente).
  if (n.nombraBalcarce && !iaDiceAfuera) return 'balcarce';
  return 'nacional';
}

/** Cuántos medios independientes pide una noticia de afuera en esta sección. */
export function mediosQuePide(seccion, n = {}, { mediosNacional = SELECCION_NUEVA.mediosNacional } = {}) {
  if (n.figura) return Math.min(SELECCION_NUEVA.mediosNacionalConFigura, mediosNacional);
  return esSeccionConDos(seccion) ? Math.min(2, mediosNacional) : mediosNacional;
}

const palabrasDelTitulo = (n) => new Set(sinTildes(n.titulo).split(/[^a-z0-9ñ]+/));
const conArgentino = (n) => CONEXION_ARGENTINA.some((p) => palabrasDelTitulo(n).has(sinTildes(p)));

// ------------------------------------------------------------------ 4. el puntaje (sólo ordena)

/** Horas desde el hecho: la fecha de la historia o, si la fuente no la dio, la primera vez que se vio. */
export function horasDesde(n = {}, ahora = Date.now(), vistas = {}) {
  const sinFecha = n.cuando === 'sin fecha en la fuente';
  const t = Date.parse((sinFecha ? vistas[n.id] : null) ?? n.fecha ?? '') || ahora;
  return Math.max(0, (ahora - t) / 3600e3);
}

/** El puntaje para ordenar (sin tope). No decide si sale: ordena la tapa, el tope, los repasos y los posteos. */
export function puntajeNuevo(n = {}, { clase = 'nacional', ficha = null, ahora = Date.now(), vistas = {} } = {}) {
  const P = SELECCION_NUEVA.puntaje;
  let p = clase === 'balcarce' ? P.baseLocal : 0;
  const medios = contarMedios(n.medios ?? [n.medio]);
  p += P.medios.find(([desde]) => medios >= desde)?.[1] ?? 0;
  const horas = horasDesde(n, ahora, vistas);
  p += P.frescura.find(([hasta]) => horas < hasta)?.[1] ?? 0;
  if (ficha?.importancia === 'alta') p += P.importanciaAlta;
  else if (ficha?.importancia === 'media') p += P.importanciaMedia;
  if (clase !== 'balcarce') {
    if (ficha?.impacto === 'directo') p += P.impactoDirecto;
    else if (ficha?.impacto === 'indirecto') p += P.impactoIndirecto;
  }
  if (ficha?.razon === 'servicio') p += P.servicio;
  if (n.figura) p += P.figura;
  return Math.round(p);
}

/** El orden en la tapa: el puntaje menos lo que envejece (lo de acá, más despacio). null = ya no va en la tapa. */
export function puntajeEnTapa(d, horas) {
  const P = SELECCION_NUEVA.puntaje;
  const local = d.clase === 'balcarce';
  if (horas > (local ? SELECCION_NUEVA.horasEnTapaLocal : SELECCION_NUEVA.horasEnTapaNacional)) return null;
  return Math.round(d.puntaje - horas * (local ? P.caidaPorHoraLocal : P.caidaPorHoraNacional));
}

// ------------------------------------------------------------------ 5. la decisión de una historia

/**
 * La decisión para UNA historia, sin el tope del día (eso lo hace aplicarTope).
 * @param {object} n  una historia de ingestar() (o de la portada de la ingesta)
 * @param {object} o
 * @param {object} [o.ficha]       su ficha de la lectura con IA, si la hay
 * @param {Set<string>} [o.yaPublicadas] ids que ya salieron (se respetan: no se vuelven a decidir)
 * @param {object[]} [o.publicadas] lo publicado de los últimos días [{ id, titulo, fecha }] (refritos)
 * @param {number} [o.ahora]
 * @param {object} [o.vistas]      id → primera vez que se vio (web/data/vistas.json)
 * @returns {{ id, titulo, seccion, clase, accion, motivo, freno, puntaje, medios, pide }}
 */
export function decidir(n = {}, {
  ficha = null, yaPublicadas = new Set(), publicadas = [], ahora = Date.now(), vistas = {},
  mediosNacional = SELECCION_NUEVA.mediosNacional,
} = {}) {
  const clase = claseDe(n, ficha);
  const local = clase === 'balcarce';
  const seccion = seccionDe(n, ficha, local);
  const medios = contarMedios(n.medios ?? [n.medio]);
  const base = { id: n.id, titulo: n.titulo, seccion, clase, medios, fecha: n.fecha };
  const puntaje = puntajeNuevo(n, { clase, ficha, ahora, vistas });
  const sale = (accion, motivo, freno = null, extra = {}) => ({ ...base, accion, motivo, freno, puntaje, ...extra });

  // 1. Los frenos que no se tocan. Valen también para lo ya publicado (si aparece rojo, se saca).
  const rojo = frenoRojo(n);
  if (rojo) return sale('descartar', rojo, 'rojo');
  const persona = frenoPersona(n);
  if (persona) return sale('esperar', persona, 'persona');

  // Lo que ya salió sigue (una nota tiene una sola dirección y no se despublica por cantidad).
  if (yaPublicadas.has(n.id)) return sale('publicar', 'ya publicada', null, { yaPublicada: true });

  // 2. Lo que la lectura con IA dice que no es para Radar (como hoy, menos "sin relación con Balcarce":
  //    lo de afuera se mide en medios).
  if (ficha?.publicidad) return sale('descartar', 'la IA dice que es publicidad', 'ia');
  if (ficha?.chimento) return sale('descartar', 'la IA dice que es un chimento', 'ia');
  if (ficha?.ambito === 'internacional' && !n.figura && !conArgentino(n) && !local) return sale('descartar', 'del extranjero sin un argentino', 'ia');
  if (!local && ficha?.seccion === 'Policiales' && !n.deLaZona) return sale('descartar', 'policial que no es de Balcarce ni de la zona', 'ia');
  if (!local && n.motivo === MOTIVO_INTERNACIONAL) return sale('descartar', 'del extranjero sin un argentino (título)', 'ia');

  // 3. Autopublicadas y menudencias.
  const auto = esAutopublicada(n);
  if (auto) return sale('descartar', auto, 'menudencia');
  const menor = esMenudencia(n);
  if (menor) return sale('descartar', menor, 'menudencia');

  // 4. Lo que llega tarde (nunca salió y el hecho ya es viejo).
  const horas = horasDesde(n, ahora, vistas);
  const ventana = local ? SELECCION_NUEVA.horasParaEstrenarLocal : SELECCION_NUEVA.horasParaEstrenarNacional;
  if (horas > ventana) return sale('descartar', `llega tarde (el hecho tiene ${Math.round(horas)} h; ${local ? 'lo de acá' : 'lo de afuera'} se estrena hasta ${ventana} h)`, 'tiempo');

  // 5. Balcarce: sale todo.
  if (local) {
    const refrito = refritoDe(n, publicadas, ahora);
    if (refrito) return sale('descartar', `refrito: ya salió «${refrito.titulo}» (se suma como fuente a ésa)`, 'menudencia', { refritoDe: refrito.id });
    return sale('publicar', n.oficial ? 'de Balcarce (organismo de acá)' : 'de Balcarce', null);
  }
  if (clase === 'espera-ia') {
    if (horas < SELECCION_NUEVA.horasEsperaLectura) return sale('esperar', 'de un medio de acá sin nombrar nada de acá: espera la lectura con IA (2 h como mucho)', 'ia');
    // Pasadas las 2 horas sin ficha: se trata como una noticia de afuera más (pide sus medios).
  }

  // 6. Nacional: sale si la cuentan N medios independientes (o una fuente oficial).
  const pide = mediosQuePide(seccion, n, { mediosNacional });
  if (n.oficial) return sale('publicar', 'fuente oficial', null, { candidataTope: true, pide });
  if (medios < pide) return sale('descartar', `de afuera y poco contada (${medios} de ${pide} medios)`, 'medios', { pide });
  return sale('publicar', `de afuera, contada por ${medios} medios`, null, { candidataTope: true, pide });
}

// ------------------------------------------------------------------ 6. el tope del día

/**
 * El tope: lo de Balcarce nunca se frena; lo de afuera entra, de más a menos puntaje, mientras en las
 * últimas 24 horas haya lugar (tope − lo de afuera ya publicado − lo de acá publicado o, si fue menos, la
 * reserva). Cuando aprieta, una sección no se lleva más de `parteMaximaPorSeccion` de los lugares de afuera.
 * Lo que no entra ESPERA (puede entrar en la corrida siguiente si se libera lugar, hasta que llegue tarde).
 * @param {object[]} decisiones  las de decidir() de esta corrida (se cambian)
 * @param {{ local:number, nacional:number, porSeccion?:Record<string,number> }} ventana lo publicado en las últimas 24 h
 */
export function aplicarTope(decisiones, ventana = { local: 0, nacional: 0, porSeccion: {} }, {
  tope = SELECCION_NUEVA.topeDiario, reservaLocal = SELECCION_NUEVA.reservaLocal,
} = {}) {
  const localesAhora = decisiones.filter((d) => d.accion === 'publicar' && d.clase === 'balcarce' && !d.yaPublicada).length;
  const locales = (ventana.local ?? 0) + localesAhora;
  let lugares = tope - (ventana.nacional ?? 0) - Math.max(locales, reservaLocal);
  const maxSeccion = Math.ceil(SELECCION_NUEVA.parteMaximaPorSeccion * (tope - reservaLocal));
  const porSeccion = { ...(ventana.porSeccion ?? {}) };
  const candidatas = decisiones.filter((d) => d.candidataTope && d.accion === 'publicar' && !d.yaPublicada)
    .sort((a, b) => b.puntaje - a.puntaje);
  for (const d of candidatas) {
    const s = d.seccion;
    if (lugares <= 0) {
      d.accion = 'esperar';
      d.motivo = `tope del día (${tope} en 24 h): entra si se libera lugar`;
      d.freno = 'tope';
    } else if ((porSeccion[s] ?? 0) >= maxSeccion) {
      d.accion = 'esperar';
      d.motivo = `tope de ${s} (${maxSeccion} de afuera en 24 h)`;
      d.freno = 'tope';
    } else {
      lugares -= 1;
      porSeccion[s] = (porSeccion[s] ?? 0) + 1;
    }
  }
  return decisiones;
}

/**
 * La selección nueva sobre las historias de UNA corrida.
 * @returns {{ decisiones: object[], cuenta: Record<string, number> }}
 */
export function seleccionNueva(notas = [], {
  fichas = {}, yaPublicadas = new Set(), publicadas = [], ahora = Date.now(), vistas = {}, ventana,
  tope, reservaLocal, mediosNacional,
} = {}) {
  const decisiones = notas.map((n) => decidir(n, {
    ficha: fichas[n.id] ?? null, yaPublicadas, publicadas, ahora, vistas, ...(mediosNacional ? { mediosNacional } : {}),
  }));
  aplicarTope(decisiones, ventana, { tope, reservaLocal });
  const cuenta = {};
  for (const d of decisiones) cuenta[d.accion] = (cuenta[d.accion] ?? 0) + 1;
  return { decisiones, cuenta };
}

// ------------------------------------------------------------------ 7. repasos y posteos

/** Las notas de un repaso (podcast): lo de acá primero, por puntaje; si faltan, lo de afuera más relevante.
 *  Política y Policiales no van solas a redes (esperan a una persona). */
export function elegirParaRepaso(decisiones = [], { notas = SELECCION_NUEVA.repaso.notas } = {}) {
  const validas = decisiones.filter((d) => d.accion === 'publicar' && !SECCIONES_CON_PERSONA_EN_REDES.includes(d.seccion));
  const locales = validas.filter((d) => d.clase === 'balcarce').sort((a, b) => b.puntaje - a.puntaje);
  const afuera = validas.filter((d) => d.clase !== 'balcarce' && d.puntaje >= SELECCION_NUEVA.repaso.minimoNacional)
    .sort((a, b) => b.puntaje - a.puntaje);
  return [...locales, ...afuera].slice(0, notas);
}

/** Los posteos de Facebook del día: lo de acá primero; el relleno, sólo lo de afuera muy contado. */
export function elegirParaFacebook(decisiones = [], { porDia = SELECCION_NUEVA.facebook.porDia } = {}) {
  const validas = decisiones.filter((d) => d.accion === 'publicar' && !SECCIONES_CON_PERSONA_EN_REDES.includes(d.seccion));
  const locales = validas.filter((d) => d.clase === 'balcarce').sort((a, b) => b.puntaje - a.puntaje);
  const afuera = validas.filter((d) => d.clase !== 'balcarce' && d.puntaje >= SELECCION_NUEVA.facebook.minimoNacional)
    .sort((a, b) => b.puntaje - a.puntaje);
  return [...locales, ...afuera].slice(0, porDia);
}

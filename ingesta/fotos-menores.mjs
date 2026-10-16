// La excepción `menorEnActividadOficial` (regla 186, 17/10/2026): la foto PROPIA de un organismo de Balcarce puede salir aunque la IA vea
// chicos reconocibles, sólo en una actividad deportiva, escolar, cultural o recreativa, y sólo si se cumplen TODAS las condiciones.
//
// Hernán, 17/10/2026: "si hay menores en la foto y la fuente es de Balcarce y es un juego, olimpíadas o algo deportivo/escolar/cultural, y
// son fuentes que realmente no suben nada policial, como el municipio, estaría bueno dejarlo". Hasta ese día la regla era firme y sin
// excepciones ("nunca foto real de un menor"): el 42 % de las notas sin foto lo era por eso, muchas de una escuela deportiva municipal.
//
// Las condiciones (docs/05-FOTOS.md, § 13):
//   (a) la foto viene de una página de un organismo de la lista cerrada FUENTES_OFICIALES_PARA_FOTOS_DE_MENORES (ingesta/fuentes.mjs):
//       el nombre del medio y el dominio de la nota tienen que coincidir los dos (`esFuenteOficialParaMenores`);
//   (b) la nota es de Deportes, Cultura y agenda, Educación o Balcarce; su título o su bajada nombran una actividad de la lista cerrada
//       ACTIVIDADES (torneo, juegos, olimpíadas, escuela, festival, muestra…); y en NINGUNA parte del texto aparece algo policial, judicial,
//       de salud o discapacidad, un accidente, violencia, abuso, una denuncia, una muerte o un desaparecido (PROHIBIDAS), ni nada que el
//       semáforo marque en rojo o amarillo (`semaforoDelTexto`, sin tocar sus listas), ni la edad de un chico (`menorPorEdad`);
//   (c) la foto no tiene marca de agua ni logo sobreimpreso: eso lo dice la IA (`tiene_marca` en false), igual que siempre;
//   (d) la nota no nombra a un chico por su nombre y apellido (`nombraAUnMenor`: una lista de nombres, o un nombre al lado de "alumno",
//       "jugadora", "juveniles"…): con nombre, la foto lo identifica;
//   (e) el crédito de la foto va en el epígrafe, como siempre (creditoDeFoto, ingesta/fotos.mjs).
// Y todo detrás del interruptor FOTOS_MENORES_OFICIALES (variable de GitHub, "Si" para prender; vacío o cualquier otra cosa: apagado).
// Apagado, la regla vuelve a ser la de siempre, también para las fotos que ya se aceptaron (conFotosDelBanco deja de mostrarlas).
//
// Sin dependencias: sólo lo que trae Node.

import { FUENTES_OFICIALES_PARA_FOTOS_DE_MENORES } from './fuentes.mjs';
import { semaforoDelTexto } from './ingesta.mjs';
import { menorPorEdad } from './menores.mjs';

/** El nombre de la excepción, tal cual queda anotado en el banco de fotos (`excepcion.regla`). */
export const REGLA_FOTOS_MENORES = 'menorEnActividadOficial';

/** El nombre de la variable de GitHub que la prende. */
export const INTERRUPTOR_FOTOS_MENORES = 'FOTOS_MENORES_OFICIALES';

const sinTildes = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** ¿Está prendida? Sólo con "Si" (o "sí", "SI"…), como REDES_ACTIVAS. Por defecto, APAGADA. */
export function excepcionActiva(env = process.env) {
  return sinTildes(env?.[INTERRUPTOR_FOTOS_MENORES]) === 'si';
}

/** Las secciones donde vale. "Educación" no es una sección hoy: queda por si se suma. */
export const SECCIONES_FOTOS_MENORES = ['Deportes', 'Cultura y agenda', 'Educación', 'Balcarce'];

// Cómo se escriben las dos listas: sin tildes y en minúscula. Una entrada es el COMIENZO de una palabra ("deport" encuentra deporte,
// deportivo, deportistas); con "=" al final, la palabra entera ("salud=" no encuentra "saludó"; "robo=" no encuentra "robótica").

// (b) La actividad, lista cerrada, en el título o la bajada. Sin "partido" (también es el partido político y el Partido de Balcarce) ni
// "acto" suelto (un acto político).
export const ACTIVIDADES = [
  'deport', 'torneo', 'campeonato', 'certamen', 'competencia', 'compiten', 'juegos=', 'olimpiada', 'liga=', 'copa=',
  'basquet', 'futbol', 'voley', 'handball', 'hockey', 'natacion', 'atletismo', 'atletic', 'gimnasia', 'gimnastas', 'tenis', 'ajedrez', 'rugby',
  'patin', 'ciclismo', 'maraton', 'carrera', 'canotaje', 'remo=', 'judo=', 'karate', 'taekwondo', 'pato=',
  'escuela', 'escolar', 'colegio', 'jardin de infantes', 'estudiant', 'alumn', 'egresad', 'feria de ciencias', 'acto escolar', 'desfile',
  'festival', 'muestra=', 'muestras=', 'exposicion', 'concurso', 'coro=', 'coros=', 'musical', 'danza', 'baile', 'malambo', 'folklor', 'teatro',
  'taller', 'recreativ', 'colonia de vacaciones', 'campamento', 'polideportivo', 'cultura', 'cultural', 'pena=', 'penas=', 'concierto',
  'orquesta', 'banda=', 'ballet', 'murga', 'comparsa', 'carnaval', 'fiesta', 'aniversario', 'encuentro', 'jornada', 'premiacion', 'medalla',
  'podio', 'campeon', 'clasific',
];

// (b) Lo que nunca: policial, judicial, salud y discapacidad (dato sensible: la foto de un chico de una escuela especial dice su salud),
// accidentes, violencia, abuso, denuncias, muertes, desaparecidos, chicos bajo protección. Sobre el texto ENTERO. Salta de más a propósito:
// una nota que no pasa sigue con la regla de siempre (sin foto real, con su ilustración sin personas).
export const PROHIBIDAS = [
  // policial y judicial
  'policia', 'policial', 'comisaria', 'patrullero', 'detenid', 'detencion', 'aprehend', 'arrest', 'allanamiento', 'delito', 'robo=', 'robos=',
  'robaron', 'hurto', 'asalto', 'arma=', 'armas=', 'droga', 'narco', 'judicial', 'justicia', 'juzgado', 'fiscal=', 'fiscales=', 'fiscalia', 'tribunal', 'causa penal',
  'imputad', 'procesad', 'condena', 'denunci', 'querella',
  // abuso y violencia
  'abuso', 'abusad', 'acoso', 'grooming', 'maltrat', 'violencia', 'violent', 'agresi', 'agredi', 'golpe', 'pelea', 'amenaz', 'bullying',
  'discrimin', 'victima',
  // accidentes y emergencias
  'accidente', 'choque', 'siniestro', 'atropell', 'herid', 'lesion', 'incendio', 'evacu', 'emergencia', 'rescate',
  // salud y discapacidad
  'salud=', 'sanitari', 'hospital', 'medic', 'enferm', 'vacun', 'cancer', 'oncolog', 'diagnostic', 'internad', 'internacion=', 'internaciones=', 'discapacidad',
  'sordo', 'sorda', 'ciego', 'ciega', 'autism', 'autista', 'sindrome', 'escuela especial', 'deporte adaptado', 'adaptad',
  // muerte, duelo y desaparecidos
  'fallec', 'muert', 'murio', 'velorio', 'sepelio', 'luto=', 'en memoria', 'desaparec', 'extraviad', 'paradero', 'suicid',
  // chicos bajo protección
  'servicio local', 'proteccion de derechos', 'minoridad', 'hogar de ninos', 'vulnerab', 'tenencia', 'adopcion',
];

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** ¿El texto (ya sin tildes y en minúscula) tiene esta entrada de una de las dos listas? Devuelve la entrada sin el "=", o null. */
function aparece(texto, entrada) {
  const entera = entrada.endsWith('=');
  const base = entera ? entrada.slice(0, -1) : entrada;
  return new RegExp(`(^|[^a-z0-9])${escapar(base)}${entera ? '(?![a-z0-9])' : ''}`).test(texto) ? base : null;
}
const primeraQueAparece = (texto, lista) => {
  for (const e of lista) {
    const a = aparece(texto, e);
    if (a) return a;
  }
  return null;
};

// (d) Un nombre propio de persona: dos o tres palabras con mayúscula ("Matías Jurado", "Juan Ignacio Petti", "María de la Paz Gómez").
const MAYUS = '[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+';
const NOMBRE = `${MAYUS}(?:\\s+(?:de\\s+(?:la\\s+|los\\s+)?)?${MAYUS}){1,2}`;
// Lo que empieza con una de estas palabras es una institución, un lugar o un equipo, no una persona.
const NO_ES_PERSONA = new Set(sinTildes(`
  el la los las del de un una al en con por para
  escuela colegio instituto jardin complejo polideportivo gimnasio municipalidad municipio concejo federacion asociacion subsecretaria
  secretaria direccion ministerio provincia universidad facultad centro sociedad union circulo deportivo atletico club seleccion
  seleccionado liga copa torneo juegos mundial nacional provincial regional municipal dia mes semana fiesta festival encuentro feria muestra
  programa concurso mar san santa general villa plaza parque barrio ruta avenida calle teatro museo biblioteca casa sala salon estadio
  balcarce argentina buenos aires tandil necochea miramar loberia benito coronel puerto bahia sierra laguna cerro rio mini pre sub primera
  segunda tercera reserva division categoria up top escuelas cooperativa parroquia iglesia capilla hogar banda orquesta coro ballet
  inta conicet anses pami campo voley basquet futbol hockey handball tenis rugby atletismo gimnasia natacion ajedrez patin ciclismo
  maxivoley taekwondo karate judo
`).split(' ').filter(Boolean));
const esPersona = (nombre) => !NO_ES_PERSONA.has(sinTildes(nombre.split(/\s+/)[0]));
// Palabras que, pegadas a un nombre, dicen que es un chico (o alguien de un equipo de chicos).
const DE_CHICOS = new RegExp('(?:^|[^a-záéíóúñü])(?:alumn[oa]s?|estudiantes?|nen[ea]s?|niñ[oa]s?|chic[oa]s?|jovencit[oa]s?|joven|jóvenes'
  + '|adolescentes?|pib[ea]s?|hij[oa]s?|niet[oa]s?|juvenil(?:es)?|infantil(?:es)?|cadetes?|menores|gimnastas?|deportistas?|jugador(?:a|es|as)?'
  + '|atletas?|integrantes|bailarin(?:a|es|as)?|egresad[oa]s?|campe[oó]n(?:a|es|as)?|ganador(?:a|es|as)?|nadador(?:a|es|as)?'
  + '|competidor(?:a|es|as)?)(?![a-záéíóúñü])', 'gi');

/**
 * (d) ¿La nota nombra a un chico por su nombre y apellido? Devuelve lo que encontró, o null. Dos señales:
 *   · una lista de dos o más personas ("Matías Jurado, Carmelo Favano y Juan Ignacio Petti"; la de fútbol playa del 30/09);
 *   · un nombre pegado a una palabra de chicos o de equipo, antes o después y en la misma oración ("la alumna María Pérez", "la
 *     jugadora Sofía Gómez", "Sofía Gómez, de la categoría infantil").
 * Además, menorEnActividadOficial no acepta ningún nombre de persona en el título o la bajada (el protagonista de la nota).
 * Salta de más a propósito (también con el nombre de un adulto en una lista): con la duda, la foto no sale.
 */
export function nombraAUnMenor(texto) {
  const t = String(texto ?? '');
  const lista = new RegExp(`${NOMBRE}(?:\\s*,\\s*${NOMBRE})*\\s*,?\\s+(?:y|e)\\s+${NOMBRE}|${NOMBRE}(?:\\s*,\\s*${NOMBRE})+`, 'g');
  const unNombre = new RegExp(`^${NOMBRE}$`);
  for (const m of t.matchAll(lista)) {
    const personas = m[0].split(/\s*,\s*|\s+(?:y|e)\s+/).filter((x) => unNombre.test(x) && esPersona(x));
    if (personas.length >= 2) return m[0];
  }
  // El nombre se busca en los 50 caracteres que siguen a la palabra de chicos, sin pasar de un punto, y con mayúsculas de verdad.
  for (const m of t.matchAll(DE_CHICOS)) {
    const fin = m.index + m[0].length;
    const ventana = t.slice(fin, fin + 50).split(/[.;:\n]/)[0];
    for (const n of ventana.matchAll(new RegExp(NOMBRE, 'g'))) {
      if (esPersona(n[0])) return `${m[0].trim()}${ventana.slice(0, n.index + n[0].length)}`;
    }
    const antes = t.slice(Math.max(0, m.index - 50), m.index + 1).split(/[.;:\n]/).pop();
    for (const n of antes.matchAll(new RegExp(NOMBRE, 'g'))) {
      if (esPersona(n[0])) return `${antes.slice(n.index)}${m[0].trim()}`;
    }
  }
  return null;
}

/** El primer nombre de persona (dos o tres palabras con mayúscula que no son una institución, un lugar ni un deporte) del texto, o null.
 *  Se usa sobre el título y la bajada: si la nota tiene un protagonista con nombre y la foto tiene un chico, puede ser ese chico. */
export function personaNombrada(texto) {
  for (const n of String(texto ?? '').matchAll(new RegExp(NOMBRE, 'g'))) if (esPersona(n[0])) return n[0];
  return null;
}

/** (a) La entrada de la lista cerrada a la que pertenece esta foto candidata ({ medio, enlace }), o null. Tienen que coincidir el nombre
 *  del medio y el dominio de la página de donde salió la foto. */
export function esFuenteOficialParaMenores(candidata, lista = FUENTES_OFICIALES_PARA_FOTOS_DE_MENORES) {
  if (!candidata?.medio || !candidata?.enlace) return null;
  let host;
  try { host = new URL(String(candidata.enlace)).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; }
  return lista.find((f) => f.medio === candidata.medio
    && f.dominios.some((d) => host === d || host.endsWith(`.${d}`))) ?? null;
}

/** ¿La nota tiene, entre las fuentes donde se buscan las fotos, una de la lista cerrada? */
export function tieneFuenteOficialParaMenores(nota) {
  const fuentes = nota?.fuentesConsultadas?.length
    ? nota.fuentesConsultadas
    : (nota?.enlace ? [{ medio: nota.medios?.[0] ?? nota.medio, enlace: nota.enlace }] : []);
  return fuentes.some((f) => esFuenteOficialParaMenores(f));
}

/**
 * (b) y (d): ¿la NOTA permite la excepción? `{ ok, motivo }`: el motivo dice por qué sí (la actividad que encontró) o por qué no (lo
 * primero que frenó). No mira el interruptor ni la foto: eso lo hacen elegirFoto (ingesta/fotos.mjs) y conFotosDelBanco.
 */
export function menorEnActividadOficial(nota, { semaforo = semaforoDelTexto } = {}) {
  if (!nota) return { ok: false, motivo: 'sin nota' };
  if (nota.propia) return { ok: false, motivo: 'nota propia' };
  if (!SECCIONES_FOTOS_MENORES.includes(nota.seccion)) return { ok: false, motivo: `sección ${nota.seccion ?? '(ninguna)'}` };
  if (nota.semaforo && nota.semaforo !== 'verde') return { ok: false, motivo: `semáforo ${nota.semaforo}` };
  const crudo = [nota.titulo, nota.copete, nota.cuerpo].filter(Boolean).join('. ');
  const prohibida = primeraQueAparece(sinTildes(crudo), PROHIBIDAS);
  if (prohibida) return { ok: false, motivo: `toca un tema que no: "${prohibida}"` };
  const sensible = semaforo(crudo);
  if (sensible?.color) return { ok: false, motivo: `semáforo del texto: ${sensible.color} (${sensible.motivo})` };
  const edad = menorPorEdad(crudo);
  if (edad) return { ok: false, motivo: `dice la edad de un chico: "${edad}"` };
  const nombre = nombraAUnMenor(crudo);
  if (nombre) return { ok: false, motivo: `nombra personas: "${nombre.slice(0, 80)}"` };
  const protagonista = personaNombrada([nota.titulo, nota.copete].filter(Boolean).join('. '));
  if (protagonista) return { ok: false, motivo: `el título o la bajada nombran a una persona: "${protagonista}"` };
  const actividad = primeraQueAparece(sinTildes([nota.titulo, nota.copete].filter(Boolean).join('. ')), ACTIVIDADES);
  if (!actividad) return { ok: false, motivo: 'el título y la bajada no nombran una actividad deportiva, escolar o cultural' };
  return { ok: true, motivo: `${nota.seccion}, actividad: "${actividad}"` };
}

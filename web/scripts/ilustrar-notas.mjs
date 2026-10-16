// Ilustraciones hechas con IA para las notas que quedaron sin foto (16/10/2026, Hernán: "todas las notas de las últimas 24 horas que no tengan
// foto, generarles una con Cloudflare; revisar que no sea nada raro; y que no gaste ni un dólar de más"). Regla 182.
//
// Va en DOS pasos, y el segundo sólo con lo que una persona ya miró (workflow manual "Ilustrar notas sin foto", .github/workflows/ilustrar-notas.yml):
//
//   1) REVISAR (aplicar = no, lo de siempre):
//        node web/scripts/ilustrar-notas.mjs revisar --salida=salida-ilustraciones --cuentas=cuentas
//      Elige de web/data/portada.json las notas publicadas en las últimas HORAS (24) que no tienen foto real, les pasa los FILTROS de abajo y, a
//      las que pasan, les pide a Gemini (clave de redacción, gratis) un prompt corto en inglés con el pedido de Hernán (un bodegón sin personas)
//      y al Worker de Cloudflare (infra/imagenes-cloudflare/, SDXL 1024 x 576, dentro de las neuronas gratis) la imagen. Otra vez Gemini mira la
//      imagen terminada buscando personas, texto, logos o algo feo. Deja todo en la carpeta de salida (las imágenes, candidatas.json con el
//      prompt de cada una y el motivo de las que se saltaron, e index.html para mirarlas) y NO toca el repositorio.
//   2) APLICAR (aplicar = sí, con el número de la corrida de revisión):
//        node web/scripts/ilustrar-notas.mjs aplicar --desde=revision
//      Toma las imágenes de esa revisión (las de IDS, o si IDS está vacío las que pasaron el control), las vuelve a pasar por los filtros con los
//      datos de ahora (si mientras tanto apareció una foto real, gana la foto), las guarda en web/public/fotos-notas/<id>-ia.jpg (1.200 px,
//      JPEG) y las anota en web/data/fotos-ia.json, que sólo escribe este paso. NO genera nada: no gasta ni una neurona.
//
// generar-datos.mjs suma web/data/fotos-ia.json con la prioridad MÁS BAJA (conFotosDelBanco, web/scripts/fotos-notas.mjs): una foto real del
// banco o una que sumó una persona siempre gana, y una nota que después se vuelve sensible pierde la ilustración. El epígrafe dice siempre
// "Ilustración generada con IA" (la web, la tarjeta, el RSS y el pie de Instagram lo toman de ahí).
//
// Topes, para no gastar: 12 llamadas al Worker por corrida y 20 por día (cuentan las de las revisiones anteriores de hoy y lo ya aplicado hoy),
// un solo reintento por imagen. Las únicas claves que se leen son GEMINI_API_KEY_REDACCION (gratis) y VIGILANTE_TOKEN (la contraseña del
// Worker). Ninguna se imprime.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { semaforoDelTexto } from '../../ingesta/ingesta.mjs';
import { REGLAS_SEMAFORO } from '../../ingesta/fuentes.mjs';
import { nombresDePersona } from '../../ingesta/foto-ia.mjs';
import { diaAR } from '../../ingesta/zona.mjs';
import { leerJson } from '../../ingesta/json.mjs';
import { fotoParaGuardar, nombreDeFotoNueva, PESO_MINIMO_DE_UNA_FOTO } from './achicar-foto.mjs';
import { CREDITO_ILUSTRACION, esIlustracionDeNota } from './fotos-notas.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

/** Dónde se lee y se escribe. Las pruebas pasan otras carpetas. */
export const RUTAS = {
  portada: path.join(RAIZ, 'data', 'portada.json'),
  archivo: path.join(RAIZ, 'data', 'archivo.json'),
  banco: path.join(RAIZ, 'data', 'banco-fotos.json'),
  manuales: path.join(RAIZ, 'data', 'fotos-manuales.json'),
  ilustraciones: path.join(RAIZ, 'data', 'fotos-ia.json'),
  carpeta: path.join(RAIZ, 'public', 'fotos-notas'),
};

// ------------------------------------------------------------------ números

/** Llamadas al Worker por corrida y por día. Cada llamada cuenta, salga bien o mal (el reintento también). */
export const TOPE_POR_CORRIDA = 12;
export const TOPE_POR_DIA = 20;
/** Cuántas veces se vuelve a pedir una imagen que falló (sólo si el Worker falló por su lado: 5xx o sin respuesta). */
export const REINTENTOS_POR_IMAGEN = 1;
export const HORAS_POR_DEFECTO = 24;
export const HORAS_MAXIMAS = 72;

export const URL_DEL_WORKER = 'https://radar-balcarce-imagenes.radarbalcarce.workers.dev/generar';
export const MODELO = 'sdxl';
export const ANCHO = 1024;
export const ALTO = 576;
export const PASOS = 20;
/** Lo que se le suma a todo prompt, pase lo que pase con el de Gemini. */
export const AGREGADO = 'blank paper, no writing, no letters, no signs, no logos, no people';
/** Lo que el modelo tiene que evitar (el Worker lo corta a 300 caracteres). */
export const NEGATIVO = 'people, person, human, face, hands, child, crowd, text, letters, words, writing, numbers, signs, logo, watermark, signature, brand, '
  + 'flag, emblem, coat of arms, blood, weapon, cartoon, illustration, painting, 3d render, oversaturated, deformed';
export const PROMPT_MAXIMO = 700;

/**
 * Neuronas de Workers AI que gasta una imagen, ESTIMADAS. Cloudflare no publica la tarifa de SDXL (está en beta); se usa la de flux-1-schnell,
 * que sí está en la página de precios (unas 4,8 neuronas por cada tesela de 512 x 512 y 9,6 por paso): 1024 x 576 son 4 teselas y 20 pasos,
 * unas 212 neuronas. Con el tope de 20 por día son unas 4.240, menos de la mitad de las 10.000 diarias gratis.
 */
export const TARIFA_ESTIMADA = { porTesela512: 4.8, porPaso: 9.6 };
export function neuronasEstimadas({ ancho = ANCHO, alto = ALTO, pasos = PASOS } = {}) {
  const teselas = Math.ceil(ancho / 512) * Math.ceil(alto / 512);
  return Math.ceil(teselas * TARIFA_ESTIMADA.porTesela512 + pasos * TARIFA_ESTIMADA.porPaso);
}
export const NEURONAS_GRATIS_POR_DIA = 10_000;

/** El pedido de Hernán (el mismo de redes/probar-imagen-nota.mjs; una prueba controla que digan lo mismo). */
export const PROMPT_DE_HERNAN = `Generá una imagen fotoperiodística y conceptual para ilustrar la nota periodística que te dejo abajo. Requisitos importantes:
1. No debe aparecer ninguna persona en la imagen (completamente sin gente) para evitar confusiones de identidad.
2. Debe ser un plano detalle o bodegón natural y espontáneo de los objetos y herramientas típicos de la actividad o profesión de la que habla la nota.
3. Los objetos deben estar sobre una superficie de trabajo (mesa, escritorio, etc.) y mostrar desgaste por uso.
4. Evitá por completo mostrar logotipos oficiales, escudos, marcas o textos institucionales específicos. Si hay carteles, folletos o documentos, que tengan un diseño genérico, desenfocado o meramente de texto simple, o solo colores y formas abstractas sin emblemas.
5. El fondo debe estar muy desenfocado (efecto bokeh) pero debe sugerir el lugar donde transcurren los hechos.
6. La foto debe ser natural, con luz real (de archivo de diario), de aspecto cotidiano y sin retoques digitales exagerados.`;

// ------------------------------------------------------------------ filtros

const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Secciones que nunca llevan una ilustración: Policiales (podría pasar por la escena) y Política (es sobre personas y cargos). */
export const SECCIONES_QUE_NO = ['Policiales', 'Política'];
/** Secciones donde la nota suele tener un protagonista deportista: si se nombra a alguien (o puede ser un nombre), se salta. */
export const SECCIONES_DEPORTIVAS = ['Deportes', 'Fútbol', 'Automovilismo'];

// Lo que se salta además del semáforo (semaforoDelTexto ya frena menores, víctimas, abusos, suicidio, denuncias, detenidos y muertes, con las
// listas de ingesta/fuentes.mjs y ingesta/menores.mjs). Esto es más ancho a propósito: una imagen inventada al lado de un hecho así confunde,
// y saltar de más sólo cuesta una ilustración (la nota queda con su placa, como hasta ahora).
const SENSIBLE = [
  ['un hecho policial o judicial', /\b(detenid\w*|detuv\w*|aprehen\w*|arrest\w*|allanamient\w*|imputad\w*|procesad\w*|condenad\w*|prision\w*|carcel\w*|presos?|penal\w*|fiscal\w*|juzgad\w*|tribunal\w*|juez|jueza|jueces|juicio\w*|querell\w*|denunci\w*|robo|robos|robaron|hurto\w*|estafa\w*|delito\w*|policia\w*|policial\w*|comisaria\w*|patrull\w*|comando de prevencion|operativo\w*|intercept\w*|decomis\w*|incaut\w*|secuestr\w*|narco\w*|droga\w*|justicia|judicial\w*|fallo|fallos|cautelar\w*|amparo\w*)\b/],
  ['una muerte o un velorio', /\b(muert\w*|muri\w*|muere|mueren|fallec\w*|deceso\w*|sepeli\w*|velatorio\w*|velorio\w*|luto|duelo|condolencia\w*|cementerio\w*|necropolis|cocheria\w*|funebre\w*|sin vida|cadaver\w*|restos)\b/],
  ['un accidente o una emergencia', /\b(accident\w*|choque\w*|choco|chocaron|vuelco\w*|volco|siniestro\w*|incendi\w*|herid\w*|lesionad\w*|internad\w*|hospitalizad\w*|atropell\w*|derrumb\w*|explosi\w*|tragedia\w*|emergencia)\b/],
  ['una víctima, un abuso o violencia', /\b(victim\w*|abus\w*|acoso\w*|violen\w*|violaci\w*|agresi\w*|agredi\w*|maltrat\w*|femicid\w*|homicid\w*|asesin\w*|suicid\w*|desaparec\w*|paradero)\b/],
  ['chicos (escuela, deporte infantil o juvenil, edades)', /\b(menor|menores|nin[oa]s?|nene\w*|nena\w*|chic[oa]s|chiquit\w*|pibes?|pibas?|adolescen\w*|bebe\w*|beba\w*|infan\w*|juvenil\w*|alumn[oa]\w*|estudiant\w*|escolar\w*|escuel\w*|colegio\w*|jardin de infantes|jardin maternal|jardin n|jardin \d+|primaria\w*|secundaria\w*|egresad\w*|estudiantina\w*|sub[ -]?\d{1,2}|categoria \d{4}|mini ?voley|minibasquet|baby futbol)\b/],
];

// Un cargo de la política: si además la nota nombra a alguien, es una nota política con nombre propio.
const CARGO_POLITICO = /\b(intendent\w*|concejal\w*|diputad\w*|senador\w*|gobernador\w*|vicegobernador\w*|president\w*|vicepresident\w*|ministr[oa]s?|candidat\w*|funcionari\w*|legislador\w*|secretari[oa]s? de|jefe de gabinete|dirigente\w*|militante\w*|referente\w*|opositor\w*|oficialis\w*|peronis\w*|kirchner\w*|libertari\w*|radical\w*|partido)\b/;

// Una nota que habla de deporte (para las de otras secciones que nombran a alguien).
const TEMA_DEPORTIVO = /\b(deport\w*|box\w*|pelea\w*|titulo|campeon\w*|torneo\w*|partido\w*|goles?|golea\w*|atleta\w*|jugador\w*|futbol\w*|basquet|voley|tenis|rugby|hockey|padel|carrera\w*|piloto\w*|maraton\w*|podio\w*|medalla\w*|seleccion\w*|club\w*|automovilismo|autodromo|nadador\w*|ciclista\w*|corredor\w*)\b/;

// En una nota de deportes, las palabras con mayúscula que NO son el nombre de una persona (clubes genéricos, torneos, lugares de acá).
const SIN_PERSONA_EN_DEPORTES = new Set(('balcarce balcarceno balcarcena balcarcenos balcarcenas mar plata tandil necochea miramar mdq argentina argentino argentinos buenos aires provincia provincial nacional municipal municipalidad '
  + 'club clubes centro escuela liga copa torneo campeonato fecha final semifinal gran premio formula turismo carretera tc rally autodromo circuito juan manuel fangio estadio cancha polideportivo '
  + 'tenis mesa voley basquet futbol rugby hockey atletismo natacion ciclismo trail running maraton padel golf patin karate judo taekwondo boxeo pato ajedrez bochas '
  + 'desarrollo apertura clausura regional zona region sudeste bonaerense primera division b c reserva femenino masculino mayores veteranos senior master '
  + 'el la los las un una unos unas se en con por para tras desde nueva nuevo nuevas nuevos otra otro gran buena buen exitosa historica comienza comienzan arranca arrancan abre abren sigue siguen '
  + 'atletas jugadores jugadoras equipo equipos deportistas pilotos competencia competencias carrera carreras jornada jornadas partido partidos encuentro encuentros').split(' '));

/** ¿Puede ser el nombre de una persona? Una palabra con mayúscula que no es una sigla ni una palabra común de deportes. */
function posiblesNombresEnDeportes(titulo) {
  const tokens = String(titulo ?? '').split(/\s+/).map((t) => t.replace(/^[«"'“”‘’(\[¿¡]+|[»"'“”‘’),.:;!?\]]+$/g, '')).filter(Boolean);
  return tokens.filter((t) => /^\p{Lu}/u.test(t) && !/^\p{Lu}{2,}$/u.test(t) && !/^\d/.test(t) && !SIN_PERSONA_EN_DEPORTES.has(plano(t)));
}

/** Las figuras conocidas que nombra un texto: nombresDePersona devuelve una palabra sola sólo cuando es una de ellas. */
export function figurasConocidas(texto) {
  const tokens = String(texto ?? '').split(/\s+/).map((t) => t.replace(/^[«"'“”‘’(\[¿¡]+|[»"'“”‘’),.:;!?\]]+$/g, '')).filter((t) => /^\p{Lu}/u.test(t));
  return [...new Set(tokens.filter((t) => nombresDePersona(t).length > 0))];
}

const textoDe = (nota) => [nota?.titulo, nota?.copete, nota?.cuerpo].filter(Boolean).join('. ');
const tieneArchivo = (e) => !!(e && e.archivo);

/**
 * Por qué una nota NO lleva ilustración (el motivo, en castellano), o null si puede llevarla. Sólo mira la nota y los bancos; no usa la red.
 *   banco:          web/data/banco-fotos.json (las fotos reales)
 *   manuales:       web/data/fotos-manuales.json (las que sumó una persona)
 *   ilustraciones:  web/data/fotos-ia.json (lo ya ilustrado)
 */
export function motivoParaSaltar(nota, { banco = {}, manuales = {}, ilustraciones = {} } = {}) {
  if (!nota?.id || !nota?.titulo) return 'la nota no tiene id o título';
  if (nota.propia) return `nota propia (${nota.propia}): lleva su propia imagen o ninguna`;
  if (nota.foto?.archivo && !esIlustracionDeNota(nota.foto)) return 'ya tiene foto';
  if (tieneArchivo(banco[nota.id])) return 'ya tiene foto en el banco';
  if (tieneArchivo(manuales[nota.id])) return 'ya tiene una foto que sumó una persona';
  if (tieneArchivo(ilustraciones[nota.id])) return 'ya tiene una ilustración';
  if (nota.seccion === 'Policiales') return 'Policiales: nunca una ilustración (podría pasar por la escena)';
  if (nota.seccion === 'Política') return 'Política: no se ilustra (habla de personas y cargos)';
  if (nota.semaforo && nota.semaforo !== 'verde') return `semáforo ${nota.semaforo}`;
  // `publicadaPor: 'ia'` es la lectura con IA, que nunca destraba (regla 49): eso sigue siendo verde. Una persona, no.
  if ((nota.publicadaPor && nota.publicadaPor !== 'ia') || (nota.como && nota.como !== 'automatica')) return 'la publicó una persona (esperó: no era verde)';
  const texto = textoDe(nota);
  const normal = plano(texto);
  const sepelio = (REGLAS_SEMAFORO.nunca ?? []).find((p) => normal.includes(plano(p)));
  if (sepelio) return `nunca se publica: "${sepelio}"`;
  const sem = semaforoDelTexto(texto, { conMuerte: true });
  if (sem) return `semáforo ${sem.color}: ${sem.motivo}`;
  for (const [que, re] of SENSIBLE) {
    const m = normal.match(re);
    if (m) return `toca ${que}: "${m[0]}"`;
  }
  const cabeza = [nota.titulo, nota.copete].filter(Boolean).join('. ');
  const nombres = nombresDePersona(cabeza);
  // Las figuras conocidas de la política y el deporte (Milei, Caputo, Kicillof, Messi, Colapinto…: la lista de ingesta/foto-ia.mjs), aunque
  // vengan con nombre y apellido: siempre se saltan.
  const figura = figurasConocidas(cabeza)[0];
  if (figura) return `nombra a una figura pública: "${figura}"`;
  if (nombres.length && CARGO_POLITICO.test(plano(`${cabeza} ${String(nota.cuerpo ?? '').slice(0, 600)}`))) return `nota política con nombre propio: "${nombres[0]}"`;
  // Un deportista nombrado en una nota de otra sección ("Kevin Gómez busca el título argentino supermediano", en Balcarce).
  if (nombres.length && TEMA_DEPORTIVO.test(plano(cabeza))) return `deportes con un protagonista nombrado: "${nombres[0]}"`;
  if (SECCIONES_DEPORTIVAS.includes(nota.seccion)) {
    if (nombres.length) return `deportes con un protagonista nombrado: "${nombres[0]}"`;
    const posibles = posiblesNombresEnDeportes(nota.titulo);
    if (posibles.length) return `deportes: "${posibles[0]}" puede ser el nombre de un deportista (en la duda, se salta)`;
  }
  return null;
}

const idValido = (id) => /^[a-z0-9]{3,20}$/.test(String(id ?? ''));

/** Los ids pedidos ("abc, def ghi"), sólo los que tienen forma de id. */
export function idsPedidos(texto) {
  return [...new Set(String(texto ?? '').split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(idValido))];
}

/** Las horas pedidas: un número de 1 a 72; cualquier otra cosa, 24. */
export function horasPedidas(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, HORAS_MAXIMAS) : HORAS_POR_DEFECTO;
}

const cuandoSalio = (n) => Date.parse(n?.fecha ?? n?.publicadaCuando ?? n?.visto ?? '') || 0;

/**
 * Qué notas se ilustrarían: las de la portada publicadas en las últimas `horas` (con `ids`, sólo ésas, de la portada o del archivo y sin
 * mirar la hora), las más nuevas primero. Devuelve `{ candidatas, saltadas }`; cada saltada con su motivo.
 */
export function elegirCandidatas({ portada = [], archivo = [], banco = {}, manuales = {}, ilustraciones = {}, horas = HORAS_POR_DEFECTO, ids = [], ahora = new Date() } = {}) {
  let notas;
  const saltadas = [];
  if (ids.length) {
    const porId = new Map([...archivo, ...portada].map((n) => [n?.id, n]));
    notas = [];
    for (const id of ids) {
      if (porId.has(id)) notas.push(porId.get(id));
      else saltadas.push({ id, titulo: null, seccion: null, motivo: 'no está en la portada ni en el archivo' });
    }
  } else {
    const desde = ahora.getTime() - horas * 3_600_000;
    notas = portada.filter((n) => cuandoSalio(n) >= desde && cuandoSalio(n) <= ahora.getTime() + 3_600_000);
  }
  notas = [...new Map(notas.map((n) => [n.id, n])).values()].sort((a, b) => cuandoSalio(b) - cuandoSalio(a));
  const candidatas = [];
  for (const n of notas) {
    const motivo = motivoParaSaltar(n, { banco, manuales, ilustraciones });
    if (motivo) saltadas.push({ id: n.id, titulo: n.titulo ?? null, seccion: n.seccion ?? null, motivo });
    else candidatas.push(n);
  }
  return { candidatas, saltadas };
}

// ------------------------------------------------------------------ topes

/** Cuántas ilustraciones se aplicaron en ese día (de web/data/fotos-ia.json). */
export function aplicadasHoy(ilustraciones = {}, dia = diaAR()) {
  return Object.values(ilustraciones ?? {}).filter((e) => e?.cuando && diaAR(new Date(e.cuando)) === dia).length;
}

/** Cuántas llamadas al Worker hicieron las revisiones anteriores de ese día (sus cuenta.json, que el workflow baja de las corridas de hoy). */
export function generadasHoy(cuentas = [], dia = diaAR()) {
  return cuentas.filter((c) => c?.dia === dia).reduce((s, c) => s + (Number(c.llamadas) || 0), 0);
}

/** Cuántas llamadas al Worker se pueden hacer en esta corrida: 12 como mucho, y lo que quede de las 20 del día. */
export function cupoDeLaCorrida(usadasHoy = 0) {
  return Math.max(0, Math.min(TOPE_POR_CORRIDA, TOPE_POR_DIA - (Number(usadasHoy) || 0)));
}

/** Los cuenta.json de una carpeta (y sus subcarpetas: una por corrida bajada). */
export function leerCuentas(carpeta) {
  const salida = [];
  if (!carpeta || !fs.existsSync(carpeta)) return salida;
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const completo = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(completo);
      else if (e.name === 'cuenta.json') { const c = leerJson(completo, null); if (c) salida.push(c); }
    }
  };
  recorrer(carpeta);
  return salida;
}

// ------------------------------------------------------------------ el prompt

/** Lo que se le pide a Gemini: el pedido de Hernán, cómo tiene que salir el prompt y la nota (título, bajada y el cuerpo). */
export function armarInstruccion(nota) {
  const cuerpo = String(nota?.cuerpo ?? '').slice(0, 3000);
  return `${PROMPT_DE_HERNAN}

Tu salida NO es la imagen: es el PROMPT para un generador de imágenes (Stable Diffusion XL), escrito en INGLÉS, de 40 a 70 palabras, en una sola línea, que describa esa foto cumpliendo los requisitos de arriba. Empezá por «Candid photojournalistic close-up still life of». Describí sólo objetos, la superficie de trabajo, el fondo desenfocado y la luz. NUNCA escribas nombres de personas, de lugares, de instituciones, de clubes, de marcas ni de medios. Nada de chicos ni de cosas de chicos (juguetes, útiles escolares), nada de armas, sangre, ataúdes, coronas de flores, esposas ni nada que sugiera un delito, un accidente o una muerte. Si hay papeles, que estén en blanco. Incluí «no people, no text, no logos». Respondé SOLO con el prompt.

Nota:
${nota?.titulo ?? ''}

${nota?.copete ?? ''}

${cuerpo}`;
}

/** El prompt que va al Worker: el de Gemini en una línea, sin comillas, recortado para que siempre entre el agregado, y el agregado. */
export function promptFinal(deGemini) {
  const base = String(deGemini ?? '').replace(/[\r\n]+/g, ' ').replace(/["“”«»`*]/g, '').replace(/^\s*prompt\s*:\s*/i, '').replace(/\s+/g, ' ').trim().replace(/[.,;\s]+$/, '');
  const lugar = PROMPT_MAXIMO - AGREGADO.length - 2;
  const corto = base.length > lugar ? base.slice(0, lugar).replace(/\s+\S*$/, '').replace(/[.,;\s]+$/, '') : base;
  return corto ? `${corto}, ${AGREGADO}` : '';
}

// Lo que no puede describir el prompt (sacadas antes las negaciones: "no people" está bien).
const PROHIBIDO_EN_PROMPT = /\b(child|children|kids?|boys?|girls?|bab(?:y|ies)|toddlers?|teens?|teenagers?|students?|pupils?|schoolchildren|man|men|woman|women|persons?|people|humans?|crowd|faces?|portraits?|silhouettes?|hands?|players?|athletes?|blood\w*|weapons?|guns?|pistols?|rifles?|knife|knives|bullets?|corpses?|coffins?|caskets?|funeral\w*|graves?|tombstones?|wreaths?|handcuffs?|crime scene|police tape|syringes?|drugs?|toys?|dolls?|teddy|strollers?|cribs?|flags?|logos?|emblems?|coat of arms)\b/i;

/** Por qué el prompt de Gemini no sirve (nombra a alguien de la nota, o describe personas, chicos o algo feo), o null si sirve. */
export function problemaDelPrompt(prompt, nota) {
  const p = String(prompt ?? '');
  if (p.length < 40) return 'Gemini devolvió un prompt demasiado corto';
  const sinNegaciones = p.split(/[,.;]/).map((f) => f.replace(/\b(?:no|without|free of|devoid of|nobody|absent)\b.*$/i, '')).join(' , ');
  const m = sinNegaciones.match(PROHIBIDO_EN_PROMPT);
  if (m) return `el prompt describe "${m[0]}"`;
  const nombres = nombresDePersona([nota?.titulo, nota?.copete, String(nota?.cuerpo ?? '').slice(0, 3000)].filter(Boolean).join('. '));
  const pp = plano(p);
  for (const nombre of nombres) {
    for (const parte of nombre.split(/\s+/).filter((x) => x.length >= 4)) {
      if (new RegExp(`\\b${plano(parte).replace(/[^a-z0-9]/g, '')}\\b`).test(pp)) return `el prompt nombra a "${nombre}"`;
    }
  }
  return null;
}

// ------------------------------------------------------------------ la red

const MODELOS_DE_TEXTO = ['gemini-flash-lite-latest', 'gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-flash-latest'];
const dormir = (ms) => new Promise((ok) => { setTimeout(ok, ms); });

/** Un pedido a Gemini con la clave de redacción (gratis). Hasta 4 intentos (503 es común), probando también el modelo flash. Nunca muestra la clave. */
async function pedirAGemini(partes, { clave, fetchFn = fetch, esperar = dormir, json = false }) {
  let ultimo = 'sin respuesta';
  for (const [i, modelo] of MODELOS_DE_TEXTO.entries()) {
    try {
      const r = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: 'POST', headers: { 'x-goog-api-key': clave, 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: partes }], ...(json ? { generationConfig: { responseMimeType: 'application/json', temperature: 0 } } : {}) }),
        signal: AbortSignal.timeout(60_000),
      });
      ultimo = `HTTP ${r.status}`;
      const j = await r.json().catch(() => null);
      const t = (j?.candidates?.[0]?.content?.parts ?? []).map((p) => p?.text ?? '').join('').trim();
      if (r.status === 200 && t) return t;
      if ([400, 401, 402, 403].includes(r.status)) break; // una clave rechazada no mejora insistiendo
    } catch { ultimo = 'sin red'; }
    if (i < MODELOS_DE_TEXTO.length - 1) await esperar(4000 * (i + 1));
  }
  throw new Error(`Gemini ${ultimo}`);
}

/** El prompt de una nota, escrito por Gemini. */
export async function pedirPrompt(nota, opciones) {
  return pedirAGemini([{ text: armarInstruccion(nota) }], opciones);
}

/** Lo que se le pregunta a Gemini al mirar la imagen terminada. Todo tiene que venir en false. */
export const PREGUNTA_DE_CONTROL = `Sos el control de calidad de Radar Balcarce, un medio de noticias. Te muestro una imagen hecha con IA que se publicaría como ilustración de una nota, con la leyenda "Ilustración generada con IA". Tiene que ser un bodegón de objetos, sin gente.
Mirala ENTERA y contestá sólo un JSON con estas claves booleanas:
  "personas": hay alguna persona, silueta, mano o parte de un cuerpo,
  "rostros": hay algún rostro, aunque sea chico, dibujado o en un cuadro,
  "texto": hay letras, palabras o números, aunque estén deformes o no se entiendan,
  "logos": hay un logo, una marca, una bandera, un escudo o un emblema,
  "sensible": hay sangre, armas, un ataúd, flores de velorio, heridas, drogas, cosas de chicos (juguetes, útiles) o algo que sugiera un delito, un accidente o una muerte,
  "raro": algo deforme, absurdo, de mal gusto o que no parece una foto de diario,
y "razon": una frase corta en castellano que diga qué se ve.`;
const CLAVES_DEL_CONTROL = ['personas', 'rostros', 'texto', 'logos', 'sensible', 'raro'];

/** Lo que dijo el control: pasa sólo si TODAS las claves vinieron en false (una clave que falta es un no). */
export function interpretarControl(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, motivo: 'el control no contestó con un JSON' };
  const malas = CLAVES_DEL_CONTROL.filter((k) => obj[k] !== false);
  const razon = typeof obj.razon === 'string' ? obj.razon.slice(0, 300) : null;
  return malas.length ? { ok: false, motivo: `el control vio: ${malas.join(', ')}`, razon } : { ok: true, motivo: null, razon };
}

/** Gemini (clave de redacción) mira la imagen. Nunca lanza: si no la pudo mirar, no pasa (una persona decide con IDS). */
export async function mirarImagen(bytes, opciones) {
  try {
    const t = await pedirAGemini([{ text: PREGUNTA_DE_CONTROL }, { inlineData: { mimeType: 'image/jpeg', data: Buffer.from(bytes).toString('base64') } }], { ...opciones, json: true });
    return interpretarControl(JSON.parse(t.replace(/^```(?:json)?|```$/g, '').trim()));
  } catch (e) {
    return { ok: false, motivo: `no se pudo mirar la imagen (${String(e?.message ?? e).slice(0, 80)})`, razon: null };
  }
}

/** El cuerpo del pedido al Worker. */
export function pedidoAlWorker(prompt) {
  return { prompt, modelo: MODELO, ancho: ANCHO, alto: ALTO, steps: PASOS, negativo: NEGATIVO };
}

/**
 * UNA llamada al Worker. Nunca lanza. Devuelve `{ bytes, ext }` o `{ error, reintentable, sinPermiso }`.
 * Sólo se reintenta lo que falló del lado del Worker (5xx o sin respuesta); un 4xx no mejora.
 */
export async function llamarAlWorker(prompt, { token, fetchFn = fetch, url = URL_DEL_WORKER }) {
  try {
    const r = await fetchFn(url, {
      method: 'POST', headers: { 'x-token': token, 'content-type': 'application/json' },
      body: JSON.stringify(pedidoAlWorker(prompt)), signal: AbortSignal.timeout(120_000),
    });
    if (r.status !== 200) return { error: `Worker HTTP ${r.status}`, reintentable: r.status >= 500, sinPermiso: r.status === 401 };
    const tipo = String(r.headers?.get?.('content-type') ?? '').toLowerCase();
    const bytes = Buffer.from(await r.arrayBuffer());
    return { bytes, ext: tipo.includes('png') ? 'png' : 'jpg' };
  } catch {
    return { error: 'el Worker no contestó', reintentable: true };
  }
}

// ------------------------------------------------------------------ revisar

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Una página para mirar las candidatas (va dentro del adjunto de la corrida). */
export function paginaDeRevision(resultado) {
  const filas = resultado.candidatas.map((c) => `<section><h2>${esc(c.titulo)}</h2><p class="m">${esc(c.seccion)} · <code>${esc(c.id)}</code> · ${c.control?.ok ? '<b class="ok">pasó el control</b>' : `<b class="no">${esc(c.control?.motivo ?? 'sin control')}</b>`}${c.control?.razon ? ` — ${esc(c.control.razon)}` : ''}</p>${c.archivo ? `<img src="${esc(c.archivo)}" alt="">` : `<p class="no">${esc(c.error ?? 'sin imagen')}</p>`}<details><summary>Prompt</summary><p>${esc(c.prompt ?? '')}</p></details></section>`).join('\n');
  const saltadas = resultado.saltadas.map((s) => `<tr><td><code>${esc(s.id)}</code></td><td>${esc(s.seccion ?? '')}</td><td>${esc(s.titulo ?? '')}</td><td>${esc(s.motivo)}</td></tr>`).join('\n');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ilustraciones para revisar</title>
<style>body{font:16px/1.4 system-ui,sans-serif;max-width:900px;margin:0 auto;padding:16px;background:#f4f1ea;color:#14161a}img{width:100%;height:auto;border-radius:6px}section{margin:0 0 32px}h2{font-size:18px;margin:0 0 4px}.m{font-size:14px;margin:0 0 8px}.ok{color:#16615b}.no{color:#c7381c}table{border-collapse:collapse;font-size:13px;width:100%}td{border-top:1px solid #ccc;padding:4px;vertical-align:top}</style></head><body>
<h1>Ilustraciones para revisar</h1><p>${esc(resultado.resumen)}</p>
${filas || '<p>No hay candidatas.</p>'}
<h2>Las que se saltaron</h2><table>${saltadas || '<tr><td>Ninguna.</td></tr>'}</table></body></html>`;
}

/**
 * El paso de revisión. Genera hasta el cupo y deja todo en `salida` (y la cuenta del día en `cuenta`). No toca web/.
 * Devuelve el resultado (lo mismo que candidatas.json).
 */
export async function revisar({
  horas = HORAS_POR_DEFECTO, ids = [], ahora = new Date(), rutas = RUTAS, salida, cuenta, cuentas = [], clave, token,
  fetchFn = fetch, achicar, esperar = dormir, registro = console.log,
} = {}) {
  const portada = leerJson(rutas.portada, { notas: [] }).notas ?? [];
  const archivo = ids.length ? (leerJson(rutas.archivo, { notas: [] }).notas ?? []) : [];
  const banco = leerJson(rutas.banco, {});
  const manuales = leerJson(rutas.manuales, {});
  const ilustraciones = leerJson(rutas.ilustraciones, {});
  const dia = diaAR(ahora);
  const usadas = Math.max(aplicadasHoy(ilustraciones, dia), generadasHoy(cuentas, dia));
  const cupo = cupoDeLaCorrida(usadas);
  const { candidatas, saltadas } = elegirCandidatas({ portada, archivo, banco, manuales, ilustraciones, horas, ids, ahora });
  const porImagen = neuronasEstimadas();
  registro(`Notas a ilustrar: ${candidatas.length} (se saltaron ${saltadas.length}). Llamadas al Worker usadas hoy: ${usadas} de ${TOPE_POR_DIA}; en esta corrida, hasta ${cupo}. Neuronas estimadas por imagen: ~${porImagen}.`);
  fs.mkdirSync(salida, { recursive: true });
  const hechas = [];
  let llamadas = 0;
  let sinPermiso = false;
  for (const nota of candidatas) {
    if (sinPermiso) { saltadas.push({ id: nota.id, titulo: nota.titulo, seccion: nota.seccion, motivo: 'el Worker rechazó la contraseña (VIGILANTE_TOKEN): no se siguió' }); continue; }
    if (llamadas >= cupo) { saltadas.push({ id: nota.id, titulo: nota.titulo, seccion: nota.seccion, motivo: `sin cupo (tope de ${TOPE_POR_CORRIDA} por corrida y ${TOPE_POR_DIA} por día)` }); continue; }
    const item = { id: nota.id, titulo: nota.titulo, seccion: nota.seccion, fecha: nota.fecha ?? null, prompt: null, archivo: null, control: null };
    let deGemini;
    try { deGemini = await pedirPrompt(nota, { clave, fetchFn, esperar }); } catch (e) {
      saltadas.push({ id: nota.id, titulo: nota.titulo, seccion: nota.seccion, motivo: `no se pudo escribir el prompt (${String(e?.message ?? e).slice(0, 80)})` });
      continue;
    }
    const prompt = promptFinal(deGemini);
    const problema = problemaDelPrompt(prompt, nota);
    if (problema) { saltadas.push({ id: nota.id, titulo: nota.titulo, seccion: nota.seccion, motivo: problema, prompt }); continue; }
    item.prompt = prompt;
    let r = null;
    for (let intento = 0; intento <= REINTENTOS_POR_IMAGEN && llamadas < cupo; intento++) {
      llamadas += 1;
      r = await llamarAlWorker(prompt, { token, fetchFn });
      registro(`  [${nota.id}] llamada ${llamadas}/${cupo}: ${r.bytes ? `${r.bytes.length} bytes` : r.error} (~${porImagen} neuronas)`);
      if (r.bytes || !r.reintentable) break;
      if (intento < REINTENTOS_POR_IMAGEN) await esperar(5000);
    }
    if (r?.sinPermiso) sinPermiso = true;
    if (!r?.bytes) { item.error = r?.error ?? 'sin imagen'; hechas.push(item); continue; }
    const guardar = await fotoParaGuardar(r.bytes, r.ext, achicar ? { achicar } : {});
    if (!guardar || guardar.ext !== 'jpg') { item.error = 'no se pudo pasar a JPEG'; hechas.push(item); continue; }
    if (guardar.bytes.length < PESO_MINIMO_DE_UNA_FOTO) { item.error = 'la imagen salió vacía (casi negra o lisa)'; hechas.push(item); continue; }
    item.archivo = `${nota.id}.jpg`;
    fs.writeFileSync(path.join(salida, item.archivo), guardar.bytes);
    item.control = await mirarImagen(guardar.bytes, { clave, fetchFn, esperar });
    hechas.push(item);
  }
  const listas = hechas.filter((c) => c.archivo && c.control?.ok).map((c) => c.id);
  const resultado = {
    generado: ahora.toISOString(), dia, horas, ids, cupo, usadasAntes: usadas, llamadas,
    neuronasPorImagen: porImagen, neuronasEstimadas: llamadas * porImagen, modelo: MODELO, tamano: `${ANCHO}x${ALTO}`, pasos: PASOS, negativo: NEGATIVO,
    resumen: `${hechas.filter((c) => c.archivo).length} imágenes (${listas.length} pasaron el control), ${saltadas.length} notas saltadas, ${llamadas} llamadas al Worker (~${llamadas * porImagen} neuronas de ${NEURONAS_GRATIS_POR_DIA} gratis por día).`,
    paraAplicar: listas, candidatas: hechas, saltadas,
  };
  fs.writeFileSync(path.join(salida, 'candidatas.json'), `${JSON.stringify(resultado, null, 1)}\n`, 'utf8');
  fs.writeFileSync(path.join(salida, 'index.html'), paginaDeRevision(resultado), 'utf8');
  if (cuenta) {
    fs.mkdirSync(cuenta, { recursive: true });
    fs.writeFileSync(path.join(cuenta, 'cuenta.json'), `${JSON.stringify({ dia, llamadas, neuronas: llamadas * porImagen, cuando: ahora.toISOString() })}\n`, 'utf8');
  }
  registro(resultado.resumen);
  return resultado;
}

// ------------------------------------------------------------------ aplicar

/** La entrada de web/data/fotos-ia.json. El crédito es siempre la etiqueta. */
export function entradaDeIlustracion({ archivo, nota, prompt, ahora = new Date() }) {
  return {
    archivo, credito: CREDITO_ILUSTRACION, medio: CREDITO_ILUSTRACION, origen: 'ia', cuando: ahora.toISOString(),
    titulo: nota?.titulo ?? null, modelo: MODELO, prompt: prompt ?? null,
  };
}

/**
 * El paso de aplicar: guarda las imágenes de una revisión ya hecha (carpeta `desde`) y las anota en fotos-ia.json. No genera nada.
 * Con `ids`, sólo ésas (aunque el control haya dudado: lo decidió una persona que las miró); sin `ids`, las que pasaron el control.
 */
export function aplicar({ desde, ids = [], ahora = new Date(), rutas = RUTAS, registro = console.log } = {}) {
  const revision = leerJson(path.join(desde, 'candidatas.json'), null);
  if (!revision?.candidatas) throw new Error(`No encontré candidatas.json en ${desde}: ¿el número de corrida es el de una revisión?`);
  const portada = leerJson(rutas.portada, { notas: [] }).notas ?? [];
  const archivo = leerJson(rutas.archivo, { notas: [] }).notas ?? [];
  const porId = new Map([...archivo, ...portada].map((n) => [n?.id, n]));
  const banco = leerJson(rutas.banco, {});
  const manuales = leerJson(rutas.manuales, {});
  const libro = leerJson(rutas.ilustraciones, {});
  const elegidas = revision.candidatas.filter((c) => c.archivo && (ids.length ? ids.includes(c.id) : c.control?.ok === true));
  for (const id of ids) if (!revision.candidatas.some((c) => c.id === id && c.archivo)) registro(`  ${id}: no tiene imagen en esa revisión`);
  let quedan = Math.max(0, TOPE_POR_DIA - aplicadasHoy(libro, diaAR(ahora)));
  const nuevo = { ...libro };
  const aplicadas = [];
  fs.mkdirSync(rutas.carpeta, { recursive: true });
  for (const c of elegidas) {
    const nota = porId.get(c.id);
    if (!nota) { registro(`  ${c.id}: la nota ya no está publicada, no se aplica`); continue; }
    const motivo = motivoParaSaltar(nota, { banco, manuales, ilustraciones: nuevo });
    if (motivo) { registro(`  ${c.id}: no se aplica (${motivo})`); continue; }
    if (quedan <= 0) { registro(`  ${c.id}: no se aplica (tope de ${TOPE_POR_DIA} por día)`); continue; }
    const origen = path.join(desde, path.basename(c.archivo));
    if (!fs.existsSync(origen)) { registro(`  ${c.id}: falta la imagen en la revisión`); continue; }
    const bytes = fs.readFileSync(origen);
    if (bytes.length < PESO_MINIMO_DE_UNA_FOTO || bytes[0] !== 0xff || bytes[1] !== 0xd8) { registro(`  ${c.id}: la imagen no es un JPEG que sirva`); continue; }
    const ocupados = [...fs.readdirSync(rutas.carpeta).filter((f) => f.startsWith(`${c.id}-ia`)), libro[c.id]?.archivo ?? ''];
    const nombre = `${nombreDeFotoNueva(`${c.id}-ia`, ocupados)}.jpg`;
    fs.writeFileSync(path.join(rutas.carpeta, nombre), bytes);
    nuevo[c.id] = entradaDeIlustracion({ archivo: `fotos-notas/${nombre}`, nota, prompt: c.prompt, ahora });
    aplicadas.push(c.id);
    quedan -= 1;
    registro(`  ${c.id}: guardada como fotos-notas/${nombre}${c.control?.ok ? '' : ` (pedida a mano; el control había dicho: ${c.control?.motivo ?? 'nada'})`}`);
  }
  if (aplicadas.length) {
    fs.mkdirSync(path.dirname(rutas.ilustraciones), { recursive: true });
    fs.writeFileSync(rutas.ilustraciones, `${JSON.stringify(nuevo, null, 1)}\n`, 'utf8');
  }
  registro(`Aplicadas: ${aplicadas.length}.`);
  return { aplicadas, libro: nuevo };
}

// ------------------------------------------------------------------ desde la terminal

function resumenParaGitHub(resultado) {
  const archivo = process.env.GITHUB_STEP_SUMMARY;
  if (!archivo) return;
  const corrida = process.env.GITHUB_RUN_ID ?? '(el número de esta corrida)';
  const lineas = [
    '## Ilustraciones para revisar', '', resultado.resumen, '',
    'Bajá el adjunto **ilustraciones** y abrí `index.html` para mirarlas.', '',
    ...resultado.candidatas.map((c) => `- \`${c.id}\` ${c.archivo ? (c.control?.ok ? '✔' : `✖ ${c.control?.motivo ?? ''}`) : `sin imagen (${c.error ?? ''})`} — ${String(c.titulo ?? '').replace(/[|<>]/g, ' ')}`),
    '', `Para publicarlas: correr otra vez **Ilustrar notas sin foto** con *aplicar* marcado, *corrida* = \`${corrida}\` e *ids* = las que estén bien (vacío = las que pasaron el control: \`${resultado.paraAplicar.join(', ') || 'ninguna'}\`).`,
  ];
  try { fs.appendFileSync(archivo, `${lineas.join('\n')}\n`, 'utf8'); } catch { /* el resumen no frena nada */ }
}

async function principal() {
  const [accion] = process.argv.slice(2);
  const opcion = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? '').slice(n.length + 3);
  const ids = idsPedidos(process.env.IDS);
  if (accion === 'revisar') {
    const clave = (process.env.GEMINI_API_KEY_REDACCION ?? '').trim();
    const token = (process.env.VIGILANTE_TOKEN ?? '').trim();
    if (!clave || !token) { console.error('Faltan GEMINI_API_KEY_REDACCION o VIGILANTE_TOKEN.'); process.exit(1); }
    const resultado = await revisar({
      horas: horasPedidas(process.env.HORAS), ids, salida: opcion('salida') || 'salida-ilustraciones', cuenta: opcion('cuenta') || 'cuenta-ilustraciones',
      cuentas: leerCuentas(opcion('cuentas') || 'cuentas'), clave, token,
    });
    resumenParaGitHub(resultado);
  } else if (accion === 'aplicar') {
    aplicar({ desde: opcion('desde') || 'revision', ids });
  } else {
    console.log('Uso: node web/scripts/ilustrar-notas.mjs revisar|aplicar (ver el comentario de arriba).');
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((e) => { console.error(`Falló: ${String(e?.message ?? e).slice(0, 300)}`); process.exit(1); });
}

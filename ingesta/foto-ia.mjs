// El cuarto escalón de las fotos: una ILUSTRACIÓN genérica hecha con IA (15/10/2026, pedido de Hernán y Andrés: "para las notas a las que les
// faltan imágenes, ¿podemos crear imágenes con la API de Google?").
//
// La cadena de las fotos, en orden: (1) la foto de la fuente (ingesta/fotos.mjs); (2) una foto de stock libre y relevante
// (ingesta/foto-stock.mjs); (3) ESTE módulo: una ilustración genérica, claramente dibujada y etiquetada "Ilustración generada con IA";
// (4) la placa de la sección. Este módulo NO está conectado a nada: ningún archivo lo importa y el interruptor viene APAGADO
// (FOTO_IA_ACTIVA = "Si" lo prende). docs/fotos/PROPUESTA-IMAGEN-IA.md explica cómo se enchufaría, cuánto cuesta y qué decide Hernán.
//
// Reglas duras (ningún parámetro las apaga):
//   - Nunca en Policiales, Política, Balcarce ni Argentina; nunca en una nota que cuente un hecho, un delito, una víctima, un fallo, un
//     reclamo o un lugar concreto; nunca si toca a menores; nunca si nombra a una persona o a un cargo. La ilustración no puede hacerse pasar
//     por la foto de la escena: sólo conceptos genéricos de una tabla cerrada (TEMAS_IA: un tractor en un campo, un escenario vacío…).
//   - El pedido a la IA NUNCA lleva el título ni los nombres de la nota: sólo la escena de la tabla y el estilo de la marca.
//   - Estilo único (ESTILO): collage de papel recortado, sin personas, sin rostros, sin texto, sin logos ni marcas, NO fotorrealista.
//   - Lo que sale de la IA se mira antes de guardarlo (verificarIlustracion): si se ve una persona, un rostro, texto, un logo, un lugar
//     reconocible o algo que parezca una foto, no se usa. Si no se puede mirar, no se usa.
//   - Siempre con la etiqueta "Ilustración generada con IA (Google)" en el epígrafe (campo `credito` del banco), el texto alternativo y los
//     metadatos IPTC/XMP (DigitalSourceType = trainedAlgorithmicMedia). Ninguna pieza de redes sale sin esa etiqueta (textoConEtiqueta).
//   - Topes: 3 por corrida y 6 por día (cada llamada, salga bien o mal, cuenta); el gasto queda en web/data/uso-ia.json (tarea "imagenes").
//   - La clave es GEMINI_API_KEY_IMAGENES (un proyecto con facturación; el plan gratis no genera imágenes). Se lee del entorno o del .env,
//     nunca se escribe ni se muestra, y ningún mensaje de error la lleva.
//
// Sin dependencias: sólo fetch de Node. (No importa ingesta/foto-stock.mjs a propósito: la prueba de ese módulo vigila que nadie lo nombre.)

import { claveImagenes, claveClasificacion, leerVariable, MODELO_DE_TEXTO } from '../reels/claves.mjs';
import { anotarUsoIA, ARCHIVO_DE_USO } from '../redes/uso-ia.mjs';
import { leerJson } from './json.mjs';
import { diaAR } from './zona.mjs';
import { pathToFileURL } from 'node:url';

// ------------------------------------------------------------------ números

/** Lo que se muestra al lector. Siempre empieza por la etiqueta. */
export const ETIQUETA = 'Ilustración generada con IA';
/** El epígrafe (campo `credito` del banco de fotos). */
export const CREDITO = `${ETIQUETA} (Google)`;
/** El tipo de fuente digital del estándar IPTC para lo hecho por un modelo generativo ("Created using Generative AI"). */
export const FUENTE_DIGITAL_IPTC = 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia';

export const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
/** Nano Banana 2.1 (estable desde octubre de 2026): a 1K cuesta lo mismo que la versión Lite y trae más calidad. */
export const MODELO_POR_DEFECTO = 'gemini-nano-banana-2.1';
/** Precio por imagen de salida, en dólares, de la página oficial de precios (ai.google.dev/gemini-api/docs/pricing, 15/10/2026), paga estándar.
 *  El plan gratis no genera imágenes. `gemini-2.5-flash-image` se apaga el 2/10/2026: no está. */
export const PRECIOS_USD = {
  'gemini-nano-banana-2.1': { '1K': 0.0336, '2K': 0.0504, '4K': 0.113 },
  'gemini-3.1-flash-lite-image': { '1K': 0.0336 },
  'gemini-3.1-flash-image': { '0.5K': 0.045, '1K': 0.067, '2K': 0.101, '4K': 0.151 },
  'gemini-3-pro-image': { '1K': 0.134, '2K': 0.134, '4K': 0.24 },
};
export const TAMANO = '1K';
export const ASPECTO = '16:9';
export const TIPO_DE_ARCHIVO = 'image/jpeg';
export const TOPE_POR_CORRIDA = 3;
export const TOPE_POR_DIA = 6;
/** Ni cambiando las variables se pasa de esto por día. */
export const MAXIMO_ABSOLUTO_POR_DIA = 12;
const ESPERA = 120_000;
const TAMANO_MAXIMO = 6 * 1024 * 1024;

/** Las secciones donde una ilustración genérica tiene sentido. Fuera quedan, a propósito: Policiales, Política, Balcarce (parecería una
 *  imagen de acá) y Argentina (mezcla política y justicia). Sumar una sección es una decisión de Hernán (propuesta § 7). */
export const SECCIONES_APTAS = ['Agro', 'Economía', 'Tecnología', 'Cultura y agenda', 'Deportes', 'Fútbol', 'Automovilismo'];

/** El interruptor: la variable FOTO_IA_ACTIVA tiene que valer "Si". Apagado por defecto. */
export function fotoIaActiva({ env } = {}) {
  const v = env ? leerVariable('FOTO_IA_ACTIVA', { env, archivo: null }) : leerVariable('FOTO_IA_ACTIVA');
  return /^s[ií]$/i.test(String(v ?? '').trim());
}

const entero = (v, porDefecto, maximo) => {
  const n = v === null || v === undefined || String(v).trim() === '' ? NaN : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), maximo) : porDefecto;
};

/** Los topes: los de arriba, o los de las variables FOTO_IA_TOPE_CORRIDA y FOTO_IA_TOPE_DIA (nunca más de MAXIMO_ABSOLUTO_POR_DIA). */
export function topes({ env } = {}) {
  const leer = (n) => (env ? leerVariable(n, { env, archivo: null }) : leerVariable(n));
  const dia = entero(leer('FOTO_IA_TOPE_DIA'), TOPE_POR_DIA, MAXIMO_ABSOLUTO_POR_DIA);
  return { porCorrida: Math.min(entero(leer('FOTO_IA_TOPE_CORRIDA'), TOPE_POR_CORRIDA, MAXIMO_ABSOLUTO_POR_DIA), dia), porDia: dia };
}

/** El modelo: el de la variable FOTO_IA_MODELO si es uno de los que figuran en PRECIOS_USD; si no, el de por defecto. */
export function modeloDeImagen({ env } = {}) {
  const v = String((env ? leerVariable('FOTO_IA_MODELO', { env, archivo: null }) : leerVariable('FOTO_IA_MODELO')) ?? '').trim();
  return PRECIOS_USD[v] ? v : MODELO_POR_DEFECTO;
}

/** Cuánto cuestan `cuantas` imágenes, en dólares (un modelo o un tamaño que no figuran: null). */
export function costoEstimado(cuantas, { modelo = MODELO_POR_DEFECTO, tamano = TAMANO } = {}) {
  const p = PRECIOS_USD[modelo]?.[tamano];
  return p === undefined ? null : Math.round(cuantas * p * 10_000) / 10_000;
}

// -------------------------------------------------------------------- texto

const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// ------------------------------------------------------- reglas de la nota

// Lo que cuenta un hecho, un delito o una víctima (la misma idea que en el stock, pero acá también se frenan los fallos y los resultados).
const HECHO_O_VICTIMA = /\b(victim\w*|muert\w*|muri\w*|fallec\w*|asesin\w*|homicid\w*|femicid\w*|abus\w*|violaci\w*|violad\w*|desaparec\w*|secuestr\w*|herid\w*|accident\w*|choc\w*|vuelc\w*|incendi\w*|tirote\w*|robo|robos|robar\w*|asalt\w*|detenid\w*|detuv\w*|aprehen\w*|imputad\w*|condena\w*|sepeli\w*|velatorio|suicid\w*|ahog\w*|atropell\w*|ataque\w*|mordedura|apunal\w*|balaz\w*|narco\w*|droga\w*|estupefaciente\w*|operativo\w*|allanamiento\w*|intercept\w*|decomis\w*|inundaci\w*|temporal\w*|tornado\w*|derrumb\w*|explosi\w*|rescat\w*|evacua\w*|represi\w*|incidentes|disturbio\w*|marcha|marchas|protesta\w*|piquete\w*|paro|paros|huelga\w*|toma de|sin vida|cadaver\w*|restos|denuncia\w*|denunci\w*|estafa\w*|amenaza\w*|violen\w*|agresi\w*|pelea\w*|rina|disparo\w*|cuchill\w*|crisis|quiebra\w*|despido\w*|emergencia|alerta|granizo|helada\w*|sequia\w*|ciberataque\w*|hackeo\w*|hackear|phishing|ransomware|filtracion\w*|vulnerabilidad\w*)\b/;

// Justicia, cárcel y política: una ilustración sobre eso no se hace (nada de balanzas ni edificios).
const JUSTICIA_O_POLITICA = /\b(justicia|judicial\w*|tribunal\w*|juzgado\w*|juez|jueza|jueces|fiscal\w*|fallo\w*|sentencia\w*|causa|causas|carcel\w*|preso\w*|penal\w*|multa\w*|sancion\w*|electoral\w*|eleccion\w*|votaci\w*|campana|partido politico|gobierno|oficialismo|oposicion|congreso|senado|diputad\w*|legislatura|casa rosada|decreto\w*|reforma\w*)\b/;

// Un lugar o un problema concreto del barrio: una foto de otro lugar parecería "esa" calle (y una ilustración, también).
const LUGAR_CONCRETO = /\b(vecinos? (?:reclam|denunci|piden)\w*|reclamo\w*|bache\w*|estado del camino|camino rural|calles? \d+|esquina de|corte de (?:ruta|calle|luz|agua)|sin luz|sin agua|transito)\b/;

// Menores como sujeto o como contexto: escuela, deporte infantil o juvenil. Ni una ilustración de objetos.
const MENORES = /\b(menor|menores|nino\w*|nina\w*|infanc\w*|infantil\w*|bebe|bebes|adolescen\w*|chico|chica|chicos|chicas|pibe\w*|alumn[oa]\w*|estudiant\w*|escolar\w*|escuela\w*|colegio\w*|jardin\w*|primaria|secundaria|sub-?\d{2}|juvenil\w*|cadete\w*|egresad\w*|joven|jovenes|hijo|hijos|familias?|maestr[oa]\w*|docente\w*|clases)\b/;

// Cargos, funciones y oficios con nombre propio: la nota es sobre personas.
const CARGO_O_PERSONA = /\b(president\w*|vicepresident\w*|gobernador\w*|intendent\w*|ministr\w*|jefe de gabinete|secretari[oa]\w*|senador\w*|concejal\w*|candidat\w*|dirigente\w*|legislador\w*|funcionari\w*|referente\w*|periodista\w*|cantante\w*|actor|actriz|jugador\w*|futbolista\w*|piloto\w*|deportista\w*|atleta\w*|entrenador\w*|dt|campeon\w*|idolo\w*|figura|artista\w*|productor\w*|productores|vecin\w*)\b/;

// Un resultado o un partido concreto: el hecho real del que habla la nota. La ilustración sería decorativa pero engañosa.
const RESULTADO = /\b(gana\w*|gano|perdi\w*|derrot\w*|empat\w*|victoria|triunf\w*|final|semifinal\w*|clasific\w*|clasico|superclasico|goles?|vs|pole|podio|campeonato|fecha \d+|resultado\w*)\b/;

// Palabras de instituciones, lugares y organizaciones que NO son el nombre de una persona aunque lleven mayúscula.
const NO_PERSONA = new Set(('municipalidad municipal concejo club banco senado congreso gobierno provincia provincial nacion nacional ministerio argentina buenos aires mar plata balcarce '
  + 'tandil necochea miramar nicolas junin cordoba rosario mendoza espana estados unidos brasil chile uruguay europa instituto escuela colegio hospital cementerio comando sindicato copa liga '
  + 'torneo fiesta dia radio tecnica universidad facultad bomberos policia camara ley plaza campo desarrollo proyecto sociedad cooperativa asociacion federacion consejo secretaria direccion centro '
  + 'casa palacio teatro cine museo biblioteca iglesia parroquia estadio autodromo circuito gran premio turismo formula super mundial sudamericana libertadores argentino argentinos rural '
  + 'maxivoley voley basquet rugby tenis mesa futbol atletismo patin natacion gimnasia ciclismo trail enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre '
  + 'lunes martes miercoles jueves viernes sabado domingo anses indec afip arca bcra pami inteligencia artificial banco central bolsa comercio expo feria exposicion festival nacional').split(' '));
const DETERMINANTES = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'en', 'con', 'por', 'para', 'tras', 'desde', 'hasta', 'ante', 'sobre', 'se', 'su', 'sus', 'nuevo', 'nueva', 'llega', 'llegan', 'este', 'esta']);
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'van', 'von', 'da', 'di']);
const FIGURAS = new Set(('milei caputo kicillof macri bullrich villarruel messi colapinto canapino scaloni riquelme tapia fernandez cristina sturzenegger francos adorni menem massa larreta posse zamora '
  + 'maradona fangio pichetto santilli').split(' '));
const esMayuscula = (t) => /^\p{Lu}[\p{L}'’-]*$/u.test(t) && !/^\p{Lu}{3,}$/u.test(t);

/** Los nombres de persona que parece haber en un texto (dos palabras seguidas con mayúscula que no son una institución ni un lugar) y las
 *  figuras conocidas con sólo el apellido. Pasarse de estricto sólo cuesta una ilustración, nunca una ilustración de una persona real. */
export function nombresDePersona(texto) {
  const tokens = String(texto ?? '').split(/\s+/).map((t) => t.replace(/^[«"'“”‘’(\[¿¡]+|[»"'“”‘’),.:;!?\]]+$/g, '')).filter(Boolean);
  const nombres = [];
  let corrida = [];
  const cerrar = () => {
    while (corrida.length && (DETERMINANTES.has(plano(corrida[0])) || CONECTORES.has(plano(corrida[0])))) corrida.shift();
    while (corrida.length && CONECTORES.has(plano(corrida.at(-1)))) corrida.pop();
    if (corrida.filter(esMayuscula).length >= 2 && !corrida.some((t) => NO_PERSONA.has(plano(t)))) nombres.push(corrida.join(' '));
    corrida = [];
  };
  for (const t of tokens) {
    if (esMayuscula(t)) corrida.push(t);
    else if (corrida.length && CONECTORES.has(plano(t))) corrida.push(t);
    else cerrar();
  }
  cerrar();
  for (const t of tokens) if (FIGURAS.has(plano(t)) && !nombres.some((n) => plano(n).includes(plano(t)))) nombres.push(t);
  return [...new Set(nombres)];
}

// ------------------------------------------------------------ los temas

// Cada tema: lo que se reconoce en el título (o, si no, en las etiquetas) → la ESCENA que se le pide a la IA (en inglés, siempre sin personas) y
// el texto alternativo en castellano. Tabla cerrada: lo que no está acá no se ilustra. Sin lugares reales, sin marcas, sin personas.
// Se agrega de a poco y mirando el resultado (`node ingesta/foto-ia.mjs --prompts`).
export const TEMAS_IA = [
  { id: 'siembra', re: /\b(siembra\w*|sembr\w*|cosecha\w*|soja|maiz|trigo|girasol|cebada|cultivo\w*|campana gruesa|campana fina)\b/, escena: 'a tractor in a wide open farm field at sunset, rows of crops, seen from a distance, no driver visible', alt: 'un tractor en un campo al atardecer' },
  { id: 'maquinaria', re: /\b(maquinaria agricola|sembradora\w*|cosechadora\w*|tractor\w*)\b/, escena: 'a harvester machine crossing a golden wheat field at dusk, seen from a distance, no driver visible', alt: 'una cosechadora en un campo de trigo' },
  { id: 'papa', re: /\b(papa|papas)\b/, escena: 'neat rows of potato plants in dark soil under a wide sky', alt: 'surcos de un cultivo de papa' },
  { id: 'ganaderia', re: /\b(ganader\w*|vacuno\w*|hacienda|novillo\w*|vaca\w*|feedlot|frigorifico\w*|remate\w*)\b/, escena: 'a small herd of cattle grazing on green pasture at dawn, distant, plain unmarked animals', alt: 'vacas pastando en un campo verde' },
  { id: 'exportaciones', re: /\b(exportacion\w*|importacion\w*|comercio exterior|puerto\w*|retenciones)\b/, escena: 'a cargo ship with stacked plain containers sailing on calm water at sunrise, no readable markings', alt: 'un barco de carga con contenedores' },
  { id: 'inflacion', re: /\b(inflacion|precios|canasta basica|supermercado\w*|consumo|ventas)\b/, escena: 'a shopping basket with fruit, bread and vegetables on a simple table', alt: 'una canasta con alimentos' },
  { id: 'dinero', re: /\b(ahorro\w*|credito\w*|prestamo\w*|tasa de interes|plazo fijo|inversion\w*|bonos|acciones|bolsa|mercado de capitales|riesgo pais|dolar|cotizacion|tipo de cambio)\b/, escena: 'stacks of plain golden coins next to a small metal arrow pointing upward, no numbers, no currency symbols', alt: 'monedas apiladas con una flecha hacia arriba' },
  { id: 'energia', re: /\b(energia\w*|eolic\w*|parque solar|paneles solares|solar|tarifas? de (?:luz|energia)|electric\w*)\b/, escena: 'wind turbines and power pylons on an open plain at dusk', alt: 'molinos de viento y torres de energía en una llanura' },
  { id: 'gas', re: /\b(gasoducto\w*|gas natural|hidrocarburo\w*|petroleo|vaca muerta)\b/, escena: 'a long industrial pipeline crossing a flat dry landscape at sunset, no buildings', alt: 'un gasoducto atravesando una llanura' },
  { id: 'ia', re: /\b(inteligencia artificial|ia generativa|chatbot\w*|algoritmo\w*|modelos? de lenguaje)\b/, escena: 'an abstract network of glowing connected nodes and lines, geometric, no text and no symbols', alt: 'una red abstracta de nodos conectados' },
  { id: 'ciberseguridad', re: /\b(ciberseguridad|contrasena\w*|privacidad)\b/, escena: 'a large padlock resting on an abstract circuit board pattern, no text', alt: 'un candado sobre un circuito' },
  { id: 'celular', re: /\b(celular\w*|smartphone\w*|android|telefon\w*|aplicacion\w*|app)\b/, escena: 'a plain generic smartphone with a blank glowing screen lying on a desk, no logo, no brand', alt: 'un teléfono celular genérico' },
  { id: 'espacio', re: /\b(satelite\w*|espacial|nasa|cohete\w*|orbita)\b/, escena: 'a satellite orbiting a stylized planet with stars, no logos, no flags', alt: 'un satélite en órbita' },
  { id: 'videojuegos', re: /\b(videojuego\w*|gamer|consola\w*|esports)\b/, escena: 'a generic game controller on a dark desk with colorful abstract light, no brand', alt: 'un joystick de videojuegos' },
  { id: 'teatro', re: /\b(teatro|obra de teatro|musical|escenario|funcion\w*)\b/, escena: 'an empty theatre stage with heavy curtains and a single warm spotlight, rows of empty seats, nobody on stage', alt: 'un escenario de teatro vacío' },
  { id: 'cine', re: /\b(cine|cortometraje\w*|pelicula\w*|festival de cine)\b/, escena: 'an old film projector and film reels on a table, beam of light, no screen text', alt: 'un proyector de cine y rollos de película' },
  { id: 'musica', re: /\b(recital\w*|concierto\w*|musica|disco|gira|festival de musica)\b/, escena: 'an empty music stage with a guitar and a drum kit under warm string lights, nobody on stage', alt: 'un escenario musical vacío con instrumentos' },
  { id: 'libros', re: /\b(biblioteca\w*|libro\w*|lectura|literatur\w*|poesia|feria del libro)\b/, escena: 'a wooden bookshelf full of plain books with a reading lamp, cozy light, no readable titles', alt: 'una biblioteca con libros' },
  { id: 'arte', re: /\b(museo|exposicion\w*|muestra de arte|galeria|pintura|artes plasticas)\b/, escena: 'an empty gallery room with abstract colorful paintings on the walls, nobody inside', alt: 'una sala de arte con cuadros abstractos' },
  { id: 'carnaval', re: /\b(murga\w*|comparsa\w*|carnaval)\b/, escena: 'colorful paper streamers, confetti and a pair of festive drums on a table, nobody in the scene', alt: 'serpentinas, papel picado y tambores de fiesta' },
  { id: 'tenis-de-mesa', re: /\b(tenis de mesa|ping ?pong)\b/, escena: 'two table tennis paddles and a white ball on a green table, close up, nobody in the scene', alt: 'paletas y pelota de tenis de mesa' },
  { id: 'voley', re: /\b(maxivoley|voley|volley\w*)\b/, escena: 'a volleyball on an empty indoor court, net in the background, nobody in the scene', alt: 'una pelota de vóley en una cancha vacía' },
  { id: 'basquet', re: /\b(basquet|basket\w*|baloncesto)\b/, escena: 'a basketball under the hoop on an empty indoor court, nobody in the scene', alt: 'una pelota de básquet en una cancha vacía' },
  { id: 'atletismo', re: /\b(atletismo|maraton|carrera pedestre|running|trail)\b/, escena: 'an empty running track at sunrise with lane lines and a pair of running shoes in the foreground, nobody in the scene', alt: 'una pista de atletismo vacía' },
  { id: 'natacion', re: /\b(natacion|pileta|piscina)\b/, escena: 'an empty swimming pool with lane ropes and calm blue water, nobody in the scene', alt: 'una pileta vacía con andariveles' },
  { id: 'ciclismo', re: /\b(ciclismo|bicicleta\w*|mountain bike)\b/, escena: 'a road bicycle leaning against a wooden fence on a country road at sunset, nobody in the scene', alt: 'una bicicleta apoyada en un alambrado' },
  { id: 'padel', re: /\b(padel)\b/, escena: 'a padel racket and ball on an empty glass-walled court, nobody in the scene', alt: 'una paleta de pádel en una cancha vacía' },
  { id: 'golf', re: /\b(golf)\b/, escena: 'a golf ball near a flag on a green fairway at sunrise, nobody in the scene', alt: 'una pelota de golf en un green' },
  { id: 'rugby', re: /\b(rugby|pato)\b/, escena: 'a rugby ball on the grass under goalposts at dusk, nobody in the scene', alt: 'una pelota de rugby bajo los palos' },
  { id: 'hockey', re: /\b(hockey)\b/, escena: 'a field hockey stick and ball on green turf, nobody in the scene', alt: 'un palo y una pelota de hockey' },
  { id: 'futbol', re: /\b(futbol|liga profesional|copa argentina|libertadores|sudamericana|arquero|torneo de futbol)\b/, escena: 'a football on the grass of an empty stadium at dusk with floodlights on, plain unmarked ball, nobody in the scene', alt: 'una pelota de fútbol en un estadio vacío' },
  { id: 'automovilismo', re: /\b(automovilismo|autodromo|rally|turismo carretera|tc 2000|formula 1|f1|gran premio)\b/, escena: 'an empty asphalt racetrack with a checkered flag and curved corners at sunset, no cars, nobody in the scene', alt: 'un circuito de carreras vacío' },
];

/** Lo que se reconoce de un tema en una nota: primero el título; si ahí no hay ninguno, las etiquetas (la bajada trae demasiadas palabras
 *  sueltas que engañan). Devuelve el tema de la tabla o null. */
export function temaDeLaNota(nota) {
  const enTitulo = TEMAS_IA.find((t) => t.re.test(plano(nota?.titulo)));
  if (enTitulo) return enTitulo;
  return TEMAS_IA.find((t) => t.re.test(plano((nota?.etiquetas ?? []).join(' . ')))) ?? null;
}

/**
 * ¿A esta nota se le puede poner una ilustración con IA? Sólo mira el texto de la nota (título, bajada y etiquetas); no usa red.
 * Devuelve `{ apto, motivo, tema }`. Cualquier duda es un "no": una nota sin ilustración queda con su placa, que está bien.
 */
export function evaluarNotaIA(nota) {
  const no = (motivo) => ({ apto: false, motivo, tema: null });
  if (!nota?.titulo) return no('la nota no tiene título');
  if (nota.propia) return no('nota propia: lleva su propia imagen');
  if (nota.foto?.archivo) return no('la nota ya tiene foto');
  if (nota.seccion === 'Policiales') return no('Policiales: nunca una ilustración (podría pasar por la escena)');
  if (!SECCIONES_APTAS.includes(nota.seccion)) return no(`la sección ${nota.seccion ?? '(sin sección)'} no lleva ilustraciones con IA`);
  const texto = plano([nota.titulo, nota.copete, ...(nota.etiquetas ?? [])].filter(Boolean).join(' . '));
  if (HECHO_O_VICTIMA.test(texto)) return no('cuenta un hecho, un delito, una víctima o una emergencia: una ilustración podría pasar por la escena');
  if (JUSTICIA_O_POLITICA.test(texto)) return no('trata de justicia o de política: no se ilustra');
  if (LUGAR_CONCRETO.test(texto)) return no('trata de un lugar o un problema concreto: una imagen inventada parecería ése');
  if (MENORES.test(texto)) return no('toca a menores (escuela, deporte infantil o juvenil)');
  if (CARGO_O_PERSONA.test(texto)) return no('habla de personas o de cargos');
  if (RESULTADO.test(plano(nota.titulo))) return no('cuenta un resultado o un partido concreto');
  const nombres = [...nombresDePersona(nota.titulo), ...(nota.etiquetas ?? []).flatMap((e) => nombresDePersona(e))];
  if (nombres.length) return no('nombra a una persona');
  const tema = temaDeLaNota(nota);
  if (!tema) return no('sin un tema genérico de la tabla para ilustrar');
  return { apto: true, motivo: null, tema };
}

// ------------------------------------------------------------ el pedido

/** El estilo de la marca, igual para todas: el mismo collage de papel recortado con puntos de trama de la ilustración de "Un día como hoy",
 *  con la paleta del sitio (tinta, crema, rojo, verde, ámbar). */
export const ESTILO = 'Flat editorial cut-paper collage illustration with halftone dot texture and slight paper grain, bold simple shapes, '
  + 'a warm cream paper background (#F4F1EA), deep ink (#14161A) outlines, vermilion red (#C7381C), deep teal (#16615B) and amber (#E8A33C) as the main colors, '
  + 'wide 16:9 composition with a clear single subject and calm empty space, clearly a hand-made illustration and NOT a photograph';

/** Lo que nunca puede haber en la imagen (va en el pedido y se vuelve a controlar al mirar el resultado). */
export const PROHIBIDO = 'Absolutely no people, no human figures, no faces, no hands, no text, no letters, no numbers, no logos, no brand names, no flags, no watermark, '
  + 'no real or recognizable places or buildings, not photorealistic';

/** Un acento por sección (los --s-* del sitio, web/app/globals.css; una prueba los compara con COLOR_SECCION de las placas). */
export const ACENTO_POR_SECCION = {
  Agro: '#5A6B0A', 'Economía': '#8A6500', 'Tecnología': '#0B6FB8', 'Cultura y agenda': '#9D2C8F', Deportes: '#0F766E', 'Fútbol': '#7C3AED', Automovilismo: '#B45309',
};

/**
 * El texto que se le pide a la IA: la escena de la tabla, el estilo, el acento de la sección y lo prohibido. NO lleva el título, la bajada ni
 * ningún nombre de la nota: una IA que no los ve no puede dibujarlos.
 */
export function armarPrompt(evaluacion, nota) {
  if (!evaluacion?.apto || !evaluacion.tema) throw new Error('armarPrompt: la nota no es apta');
  const acento = ACENTO_POR_SECCION[nota?.seccion];
  return `Scene: ${evaluacion.tema.escena}. Style: ${ESTILO}.${acento ? ` Use ${acento} as a small accent color.` : ''} ${PROHIBIDO}.`;
}

/** El cuerpo del pedido a la API de Interactions de Gemini (la misma que ya usan las voces, reels/voz-gemini.mjs). */
export function pedidoDeImagen({ prompt, modelo = MODELO_POR_DEFECTO, tamano = TAMANO, aspecto = ASPECTO, tipo = TIPO_DE_ARCHIVO }) {
  const formato = { type: 'image', mime_type: tipo, aspect_ratio: aspecto };
  // Sólo los modelos con más de un tamaño lo aceptan sin problema; la Lite hace únicamente 1K.
  if (modelo !== 'gemini-3.1-flash-lite-image') formato.image_size = tamano;
  return { model: modelo, input: prompt, response_format: formato };
}

/** La imagen (base64) de una respuesta: el bloque `image` de los pasos `model_output` o, por si el formato clásico de generateContent, `inlineData`. */
export function imagenDeLaRespuesta(json) {
  const hallazgos = [];
  const buscar = (n) => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'image' && typeof n.data === 'string' && n.data.length > 100) hallazgos.push({ mime: n.mime_type ?? n.mimeType ?? TIPO_DE_ARCHIVO, base64: n.data });
    const inline = n.inlineData ?? n.inline_data;
    if (inline && typeof inline.data === 'string' && inline.data.length > 100) hallazgos.push({ mime: inline.mimeType ?? inline.mime_type ?? TIPO_DE_ARCHIVO, base64: inline.data });
    for (const v of Object.values(n)) buscar(v);
  };
  buscar(json);
  const h = hallazgos.at(-1);
  if (!h || !/^image\//.test(h.mime)) return null;
  const bytes = Math.floor((h.base64.length * 3) / 4);
  return bytes > TAMANO_MAXIMO ? null : h;
}

/** El mensaje de una respuesta que no es 200, sin el cuerpo completo (nunca lleva la clave: sólo el código y el aviso corto de Google). */
function motivoDeError(estado, texto) {
  let aviso = '';
  try { aviso = JSON.parse(texto)?.error?.message ?? ''; } catch { /* sin cuerpo útil */ }
  return `Gemini HTTP ${estado}${aviso ? `: ${String(aviso).replace(/\s+/g, ' ').slice(0, 160)}` : ''}`;
}

/**
 * Pide UNA imagen. Nunca lanza: devuelve `{ datos, respuesta }` (datos = { mime, base64 }) o `{ datos: null, motivo, estado? }`. Cada llamada se anota en
 * uso-ia.json (tarea "imagenes"), salga bien o mal. Una respuesta sin imagen (bloqueada por seguridad, por ejemplo) no es un error de red: es "sin imagen".
 */
export async function generarImagen(prompt, { fetchFn = fetch, claveApi = claveImagenes(), modelo = MODELO_POR_DEFECTO, anotarUso = anotarUsoIA, ahora = new Date() } = {}) {
  if (!claveApi) return { datos: null, motivo: 'falta la clave GEMINI_API_KEY_IMAGENES' };
  const anotar = (extra) => { try { anotarUso({ tarea: 'imagenes', modelo, clave: 'imagenes', ahora, ...extra }); } catch { /* anotar el gasto nunca frena nada */ } };
  try {
    const res = await fetchFn(ENDPOINT, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': claveApi },
      body: JSON.stringify(pedidoDeImagen({ prompt, modelo })), signal: AbortSignal.timeout(ESPERA),
    });
    if (!res.ok) {
      const texto = await res.text().catch(() => '');
      anotar({ error: res.status });
      return { datos: null, estado: res.status, motivo: motivoDeError(res.status, texto) };
    }
    const json = await res.json();
    const datos = imagenDeLaRespuesta(json);
    anotar(datos ? { respuesta: json } : { respuesta: json, error: 'sin imagen' });
    return datos ? { datos, respuesta: json } : { datos: null, motivo: 'la respuesta no trae una imagen (¿bloqueada por seguridad?)' };
  } catch (e) {
    anotar({ error: 'red' });
    return { datos: null, motivo: `no se pudo pedir la imagen (${String(e?.name === 'TimeoutError' ? 'tiempo agotado' : 'error de red')})` };
  }
}

// ----------------------------------------------------- mirar el resultado

/** Lo que se le pregunta a la IA que mira la imagen ya hecha. Todo lo "malo" tiene que venir en false y `ilustra_el_tema` en true. */
export function instruccionDeVerificacion(evaluacion) {
  return `Sos el control de calidad de Radar Balcarce, un medio de noticias. Te muestro una ilustración hecha con IA que se publicaría como imagen genérica de una nota sobre: ${evaluacion?.tema?.alt ?? 'un tema general'}.
Mirala ENTERA y contestá sólo un JSON con estas claves booleanas:
  "personas_visibles": hay alguna persona, silueta humana, mano o parte de un cuerpo,
  "rostros": hay algún rostro, aunque sea dibujado o muy chico,
  "texto_visible": hay letras, palabras, números o símbolos de moneda legibles,
  "logo_o_marca": hay un logo, una marca, una bandera, un escudo o un nombre,
  "parece_foto_real": podría confundirse con una fotografía real y no con una ilustración,
  "lugar_reconocible": muestra un edificio, monumento o lugar real y reconocible,
  "ilustra_el_tema": sí muestra claramente ${evaluacion?.tema?.alt ?? 'el tema'},
y "razon": una frase corta en castellano.`;
}

const CLAVES_MALAS = ['personas_visibles', 'rostros', 'texto_visible', 'logo_o_marca', 'parece_foto_real', 'lugar_reconocible'];

/** Lo que dijo la IA que miró la imagen: aprobada sólo si TODAS las claves malas vinieron en false y `ilustra_el_tema` en true (una clave que falta es un "no"). */
export function interpretarVerificacion(obj) {
  if (!obj || typeof obj !== 'object') return { aprobada: false, motivo: 'la IA no contestó con un JSON' };
  const malas = CLAVES_MALAS.filter((k) => obj[k] !== false);
  if (malas.length) return { aprobada: false, motivo: `la imagen no pasa el control (${malas.join(', ')})`, razon: obj.razon ?? null };
  if (obj.ilustra_el_tema !== true) return { aprobada: false, motivo: 'la imagen no muestra claramente el tema', razon: obj.razon ?? null };
  return { aprobada: true, razon: obj.razon ?? null };
}

/**
 * La IA de visión (la de clasificación de fotos: Gemini con MODELO_DE_TEXTO) mira la ilustración. Nunca lanza: sin clave o sin respuesta completa
 * devuelve `{ aprobada: false }`, y una ilustración que no se pudo mirar no se usa.
 */
export async function verificarIlustracion(datos, evaluacion, { fetchFn = fetch, claveApi = claveClasificacion(), anotarUso = anotarUsoIA } = {}) {
  if (!datos) return { aprobada: false, motivo: 'no hay imagen para mirar' };
  if (!claveApi) return { aprobada: false, motivo: 'no hay clave de IA para mirar la imagen' };
  try {
    const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO_DE_TEXTO}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': claveApi },
      body: JSON.stringify({
        contents: [{ parts: [{ text: instruccionDeVerificacion(evaluacion) }, { inlineData: { mimeType: datos.mime, data: datos.base64 } }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) { try { anotarUso({ tarea: 'fotos', modelo: MODELO_DE_TEXTO, clave: 'clasificacion', error: res.status }); } catch { /* nada */ } return { aprobada: false, motivo: `la IA no pudo mirar la imagen (Gemini HTTP ${res.status})` }; }
    const j = await res.json();
    try { anotarUso({ tarea: 'fotos', modelo: MODELO_DE_TEXTO, clave: 'clasificacion', respuesta: j }); } catch { /* nada */ }
    return interpretarVerificacion(JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''));
  } catch {
    return { aprobada: false, motivo: 'la IA no pudo mirar la imagen (respuesta ilegible o sin red)' };
  }
}

// ---------------------------------------------------------------- los topes

/** Cuántas imágenes se pidieron en un día, según uso-ia.json (cuentan todas las llamadas de la tarea "imagenes", las que salieron mal también). */
export function llamadasDelDia(uso, { dia = diaAR() } = {}) {
  const modelos = uso?.dias?.[dia]?.imagenes ?? {};
  return Object.values(modelos).reduce((s, m) => s + (Number(m?.llamadas) || 0), 0);
}

/** ¿Se puede pedir una imagen más? `{ puede, motivo }` según lo ya pedido en la corrida y en el día. */
export function hayCupo({ enLaCorrida = 0, usoDelDia = 0, env } = {}) {
  const t = topes({ env });
  if (enLaCorrida >= t.porCorrida) return { puede: false, motivo: `tope por corrida alcanzado (${t.porCorrida})` };
  if (usoDelDia >= t.porDia) return { puede: false, motivo: `tope por día alcanzado (${t.porDia})` };
  return { puede: true, motivo: null };
}

// ------------------------------------------------------- etiqueta y metadatos

/** El texto alternativo de la imagen: siempre empieza por la etiqueta. */
export function textoAlternativo(tema) {
  return `${ETIQUETA}: ${tema?.alt ?? 'imagen genérica'}`;
}

/** ¿Una entrada del banco de fotos es una ilustración hecha con IA? */
export const esIlustracionIA = (entrada) => entrada?.origen === 'ia' || entrada?.generadaConIA === true;

/** Lo que se anota en `web/data/banco-fotos.json`: los mismos campos que las demás, más `origen: "ia"`, `ilustrativa`, `generadaConIA`, `modelo` y `alt`. `archivo` es la
 *  ruta decidida por el flujo que guarda el archivo (`fotos-notas/<id>.jpg`). No guarda el título del prompt (el prompt no lo lleva). */
export function entradaDeBancoIA(elegida, nota, { archivo, ahora = new Date() } = {}) {
  return {
    archivo, medio: 'Radar Balcarce (ilustración con IA)', credito: CREDITO, licencia: null, origen: 'ia', ilustrativa: true, generadaConIA: true,
    modelo: elegida.modelo, tema: elegida.tema?.id ?? null, alt: textoAlternativo(elegida.tema), fuenteDigital: FUENTE_DIGITAL_IPTC,
    titulo: nota?.titulo ?? null, razon: elegida.razon ?? null, cuando: ahora.toISOString(),
  };
}

const escXml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** El paquete XMP con la marca IPTC de "creado con IA generativa": DigitalSourceType, el crédito y la descripción. */
export function paqueteXmp(entrada) {
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/">
<Iptc4xmpExt:DigitalSourceType>${FUENTE_DIGITAL_IPTC}</Iptc4xmpExt:DigitalSourceType>
<photoshop:Credit>${escXml(entrada?.credito ?? CREDITO)}</photoshop:Credit>
<dc:description><rdf:Alt><rdf:li xml:lang="es">${escXml(entrada?.alt ?? ETIQUETA)}</rdf:li></rdf:Alt></dc:description>
<xmpRights:UsageTerms><rdf:Alt><rdf:li xml:lang="es">${escXml(ETIQUETA)}</rdf:li></rdf:Alt></xmpRights:UsageTerms>
</rdf:Description></rdf:RDF></x:xmpmeta>
<?xpacket end="w"?>`;
}

/** Mete el XMP en un JPEG (un segmento APP1 justo después de SOI). Va DESPUÉS de achicar la foto: la recompresión borra los metadatos. Devuelve un Buffer nuevo,
 *  o null si no es un JPEG o el paquete no entra (64 KB). */
export function incrustarXmpEnJpeg(jpeg, xmp) {
  if (!Buffer.isBuffer(jpeg) || jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return null;
  const cuerpo = Buffer.concat([Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'latin1'), Buffer.from(xmp, 'utf8')]);
  if (cuerpo.length + 2 > 0xffff) return null;
  const cabecera = Buffer.from([0xff, 0xe1, (cuerpo.length + 2) >> 8, (cuerpo.length + 2) & 0xff]);
  return Buffer.concat([jpeg.subarray(0, 2), cabecera, cuerpo, jpeg.subarray(2)]);
}

/** Lo que se escribe al pie de un texto de redes (Facebook, la tarjeta de enlace, Instagram, WhatsApp) cuando la imagen es una ilustración: la etiqueta, siempre. */
export function textoConEtiqueta(texto, entrada) {
  if (!esIlustracionIA(entrada)) return String(texto ?? '');
  const t = String(texto ?? '').trimEnd();
  return plano(t).includes(plano(ETIQUETA)) ? t : `${t}${t ? '\n\n' : ''}${entrada?.credito ?? CREDITO}`;
}

// ----------------------------------------------------------------- elegir

/**
 * El armado completo para una nota: decide si es apta, mira los topes, pide la imagen, la hace mirar a otra IA y devuelve la elegida con su
 * etiqueta. Nunca lanza. Devuelve `{ elegida, razon, evaluacion, origen: 'ia' }`; `elegida` trae `datos` ({ mime, base64 }), `credito`, `alt` y `modelo`.
 * Apagado (sin `forzar`), no hace nada, ni un pedido. Hay que llamarla sólo cuando la foto de la fuente y la de stock ya fallaron.
 *   enLaCorrida: cuántas se pidieron ya en esta corrida (lo cuenta quien llama).
 *   usoDelDia:   cuántas se pidieron hoy (por defecto, de web/data/uso-ia.json).
 *   verificar:   true → la IA mira la imagen; una función → esa (para pruebas). No se puede apagar.
 */
export async function elegirIlustracionIA(nota, {
  fetchFn = fetch, env, forzar = false, enLaCorrida = 0, usoDelDia, verificar = true, claveApi, claveVerificacion, anotarUso = anotarUsoIA, ahora = new Date(),
} = {}) {
  const sin = (razon, extra = {}) => ({ elegida: null, razon, evaluacion: extra.evaluacion ?? null, origen: 'ia', ...extra });
  if (!forzar && !fotoIaActiva({ env })) return sin('la ilustración con IA está apagada (FOTO_IA_ACTIVA)', { apagado: true });
  const evaluacion = evaluarNotaIA(nota);
  if (!evaluacion.apto) return sin(`no se usa ilustración: ${evaluacion.motivo}`, { evaluacion });
  const llave = claveApi ?? (env ? leerVariable('GEMINI_API_KEY_IMAGENES', { env, archivo: null }) : claveImagenes());
  if (!llave) return sin('falta la clave GEMINI_API_KEY_IMAGENES', { evaluacion, sinClave: true });
  const cupo = hayCupo({ enLaCorrida, usoDelDia: usoDelDia ?? llamadasDelDia(leerJson(ARCHIVO_DE_USO, { dias: {} }), { dia: diaAR(ahora) }), env });
  if (!cupo.puede) return sin(cupo.motivo, { evaluacion, tope: true });

  const modelo = modeloDeImagen({ env });
  const prompt = armarPrompt(evaluacion, nota);
  const hecha = await generarImagen(prompt, { fetchFn, claveApi: llave, modelo, anotarUso, ahora });
  if (!hecha.datos) return sin(hecha.motivo, { evaluacion, pedida: true, estado: hecha.estado });

  const mirada = typeof verificar === 'function'
    ? await verificar(hecha.datos, evaluacion, nota)
    : verificar
      ? await verificarIlustracion(hecha.datos, evaluacion, { fetchFn, anotarUso, ...(claveVerificacion !== undefined ? { claveApi: claveVerificacion } : {}) })
      : { aprobada: false, motivo: 'la verificación no se puede apagar' };
  if (!mirada?.aprobada) return sin(`la imagen se descartó: ${mirada?.motivo ?? 'no pasó el control'}`, { evaluacion, pedida: true, descartada: true });

  return {
    elegida: { datos: hecha.datos, modelo, tema: evaluacion.tema, credito: CREDITO, alt: textoAlternativo(evaluacion.tema), ilustrativa: true, generadaConIA: true,
      razon: `Ilustración generada con ${modelo} para el tema "${evaluacion.tema.id}"${mirada.razon ? `; la IA que la miró: ${mirada.razon}` : ''}.` },
    razon: `Ilustración con IA (${modelo}) del tema "${evaluacion.tema.id}".`,
    evaluacion, pedida: true, origen: 'ia',
  };
}

/*
 * Para ver qué escena y qué texto se pedirían, sin red, sin clave y sin escribir nada:
 *   node ingesta/foto-ia.mjs --prompts            las notas de los últimos 14 días sin foto: cuáles aptas y con qué escena
 *   node ingesta/foto-ia.mjs --prompts --dias=7
 */
async function ensayo() {
  const path = await import('node:path');
  const { auditarFotos } = await import('./auditar-fotos.mjs');
  const raiz = path.join(import.meta.dirname, '..');
  const leer = (f, d) => leerJson(path.join(raiz, f), d);
  const dias = Number((process.argv.find((a) => a.startsWith('--dias=')) ?? '--dias=14').split('=')[1]) || 14;
  const notas = [...(leer('web/data/portada.json', { notas: [] }).notas ?? []), ...(leer('web/data/archivo.json', { notas: [] }).notas ?? [])];
  const a = auditarFotos({ notas, banco: leer('web/data/banco-fotos.json', {}), desde: Date.now() - dias * 86_400_000 });
  let aptas = 0;
  for (const { nota } of a.sinFoto) {
    const e = evaluarNotaIA(nota);
    if (e.apto) { aptas += 1; console.log(`SI  [${nota.seccion}] ${nota.titulo}
    ${armarPrompt(e, nota)}`); } else console.log(`NO  [${nota.seccion}] ${nota.titulo}
    ${e.motivo}`);
  }
  console.log(`
${aptas} de ${a.sinFoto.length} notas sin foto de los últimos ${dias} días podrían llevar ilustración (costo estimado si fueran todas: US$ ${costoEstimado(aptas)}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && process.argv.includes('--prompts')) await ensayo();

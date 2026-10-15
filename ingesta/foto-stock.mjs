// Fotos de stock libres para las notas que quedaron sin foto (15/10/2026, pedido de Hernán y Andrés: "toda nota con foto").
//
// El orden que se busca es éste: (1) la foto de la fuente, como ya se hace (ingesta/fotos.mjs); (2) si no hay una que sirva, una foto de
// stock libre y RELEVANTE al tema, que este módulo busca; (3) recién al final, la placa de la sección. Este módulo es el paso (2) y NO
// está conectado a nada: ningún archivo lo importa todavía y el interruptor viene APAGADO (FOTO_STOCK_ACTIVA = "Si" lo prende).
// docs/fotos/PROPUESTA-STOCK.md explica cómo se enchufaría.
//
// Qué hace:
//   1. `evaluarNota` decide si a la nota se le puede poner una foto de stock (y con qué condiciones) y arma la consulta a partir de la
//      sección y del TEMA del título, nunca de nombres de personas.
//   2. `candidatasDeStock` busca en Wikimedia Commons (sin clave) y, si hay clave en el entorno, en Pexels, Unsplash y Pixabay, y puntúa
//      cada candidata (relevancia por palabras, ancho mínimo de 1.200 px, orientación, licencia).
//   3. `elegirFotoStock` toma la mejor, la baja, la hace confirmar por una IA barata (`confirmarConIA`, paso opcional: obligatorio si la
//      foto tiene que ser sin personas) y devuelve la elegida con su crédito "Foto ilustrativa. Foto: autor / proveedor (licencia)".
//   4. `entradaDeBancoStock` arma lo que se anotaría en `web/data/banco-fotos.json`; guardar el archivo achicado lo haría el flujo
//      existente (`fotoParaGuardar`, web/scripts/achicar-foto.mjs), como con cualquier otra foto.
//
// Reglas duras (docs/fotos/PROPUESTA-STOCK.md § 3), que ningún parámetro apaga:
//   - Nunca en Policiales, ni en nada que cuente un hecho (choque, incendio, detención, operativo, temporal…): una foto de stock
//     podría hacerse pasar por la escena.
//   - Nunca cuando el tema es un menor o una víctima. Si la nota toca a chicos (escuela, deporte infantil), sólo una foto SIN personas,
//     confirmada por la IA.
//   - Política y las notas que nombran a una persona o a un cargo: sólo una foto SIN personas, confirmada por la IA.
//   - Nunca marca de agua ni nombre de otro medio (se filtra por texto y la IA lo mira), nunca un menor en la imagen.
//   - Nunca sin el epígrafe "Foto ilustrativa", el autor, el proveedor y la licencia.
//   - Las claves (PEXELS_API_KEY, UNSPLASH_ACCESS_KEY, PIXABAY_API_KEY) las pega una persona en GitHub Secrets o en el .env; este
//     módulo sólo las lee y nunca las escribe ni las muestra.
//
// Sin dependencias: sólo fetch de Node.

import { claveClasificacion, claveGroq, leerVariable, MODELO_DE_TEXTO } from '../reels/claves.mjs';
import { pathToFileURL } from 'node:url';
import { descargarImagen, WIKIMEDIA_LICENCIAS_LIBRES, textoPlano } from './fotos.mjs';

// ------------------------------------------------------------------ números

/** Ancho mínimo de una foto de stock (Hernán y Andrés: "al menos 1.200 px"; el banco las guarda de 1.200). */
export const ANCHO_MINIMO = 1200;
/** Puntaje (0 a 100) por debajo del cual una candidata no sirve. */
export const UMBRAL = 45;
/** Cuántas candidatas se devuelven como mucho. */
export const MAXIMO_CANDIDATAS = 5;
/** Lo más que puede sacar una foto genérica de la sección o del lugar (no del tema de la nota). */
export const TOPE_GENERICA = 60;
/** Qué consultas se buscan por defecto: del tema, y del tema en Balcarce. La genérica de la sección queda afuera hasta que se decida. */
export const TIPOS_POR_DEFECTO = ['lugar', 'tema'];
/** Consultas distintas por proveedor, como mucho (cada una es un pedido a la red). */
const MAXIMO_CONSULTAS = 3;
const ESPERA = 25_000;
const AGENTE = 'RadarBalcarce/1.0 (https://radarbalcarce.com; contacto: radarbalcarce@gmail.com)';
const MODELO_GROQ_VISION = 'qwen/qwen3.8-27b';

/** El interruptor: la variable FOTO_STOCK_ACTIVA tiene que valer "Si". Apagado por defecto. */
export function fotoStockActiva({ env } = {}) {
  const v = env ? leerVariable('FOTO_STOCK_ACTIVA', { env, archivo: null }) : leerVariable('FOTO_STOCK_ACTIVA');
  return /^s[ií]$/i.test(String(v ?? '').trim());
}

const clave = (nombre, env) => (env ? leerVariable(nombre, { env, archivo: null }) : leerVariable(nombre));

/** Los proveedores que se pueden usar ahora: Commons siempre; los demás, sólo si hay clave en el entorno. Devuelve los nombres, nunca las claves. */
export function proveedoresDisponibles({ env } = {}) {
  const lista = ['commons'];
  if (clave('PEXELS_API_KEY', env)) lista.push('pexels');
  if (clave('UNSPLASH_ACCESS_KEY', env)) lista.push('unsplash');
  if (clave('PIXABAY_API_KEY', env)) lista.push('pixabay');
  return lista;
}

export const NOMBRE_DEL_PROVEEDOR = {
  commons: 'Wikimedia Commons', pexels: 'Pexels', unsplash: 'Unsplash', pixabay: 'Pixabay',
};

// -------------------------------------------------------------------- texto

const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const palabrasDe = (t) => plano(t).split(/[^a-z0-9ñ]+/).filter(Boolean);

const PALABRAS_VACIAS = new Set(('de la el los las un una unos unas y o u e en con por para sin sobre entre desde hasta tras al del lo le les se su sus que como mas '
  + 'menos muy ya no si tambien este esta estos estas ese esa fue ser son hay pero sus nuevo nueva nuevos nuevas primer primera dos tres cuatro cinco seis siete ocho '
  + 'nueve diez the and for with from of in on to a an').split(' '));

// ------------------------------------------------------- reglas de la nota

// Lo que cuenta un hecho, un delito o una víctima: nunca una foto de stock, porque podría pasar por la escena de lo que pasó.
const HECHO_O_VICTIMA = /\b(victim\w*|muert\w*|muri\w*|fallec\w*|asesin\w*|homicid\w*|femicid\w*|abus\w*|violaci\w*|violad\w*|desaparec\w*|secuestr\w*|herid\w*|accident\w*|choc\w*|vuelc\w*|incendi\w*|tirote\w*|robo|robos|robar\w*|asalt\w*|detenid\w*|detuv\w*|aprehen\w*|imputad\w*|condena\w*|sepeli\w*|velatorio|suicid\w*|ahog\w*|atropell\w*|ataque\w*|mordedura|apunal\w*|balaz\w*|narco\w*|droga\w*|estupefaciente\w*|operativo\w*|allanamiento\w*|intercept\w*|decomis\w*|inundaci\w*|temporal\w*|tornado\w*|derrumb\w*|explosi\w*|rescat\w*|evacua\w*|represi\w*|incidentes|disturbio\w*|marcha|marchas|protesta\w*|piquete\w*|toma de|sin vida|cadaver\w*|restos|denuncia\w*|denunci\w*|estafa\w*|amenaza\w*|violen\w*|agresi\w*|pelea\w*|rina|disparo\w*|cuchill\w*)\b/;

// Un lugar o un problema concreto del barrio: un camino, una calle, un corte. Una foto de otro lugar parecería "esa" calle.
const LUGAR_CONCRETO = /\b(vecinos? (?:reclam|denunci|piden)\w*|reclamo\w*|bache\w*|estado del camino|camino rural|calles? \d+|esquina de|corte de (?:ruta|calle|luz|agua)|sin luz|sin agua|transito)\b/;

// Menores como sujeto: escuela, deporte infantil o juvenil. Sólo una foto sin personas.
const MENORES = /\b(menor|menores|nino\w*|nina\w*|infanc\w*|infantil\w*|bebe|bebes|adolescen\w*|chico|chica|chicos|chicas|pibe\w*|alumn[oa]\w*|estudiant\w*|escolar\w*|escuela\w*|colegio\w*|jardin\w*|primaria|secundaria|sub-?\d{2}|juvenil\w*|cadete\w*|egresad\w*|joven|jovenes|hijo|hijos|familias?)\b/;

// Cargos y funciones públicas: la nota es sobre personas. Sólo una foto sin personas.
const CARGO_PUBLICO = /\b(president\w*|vicepresident\w*|gobernador\w*|intendent\w*|ministr\w*|jefe de gabinete|secretari[oa]\w*|senador\w*|diputad\w*|concejal\w*|candidat\w*|dirigente\w*|legislador\w*|funcionari\w*|juez|jueza|jueces|fiscal\w*|oficialismo|oposicion|referente\w*|periodista\w*|cantante\w*|actor|actriz)\b/;

// Gente del deporte: con `personasAnonimas` una foto de stock con deportistas anónimos pasa; sin él (por defecto) hace falta una foto sin personas.
const GENTE_DEL_DEPORTE = /\b(jugador\w*|futbolista\w*|piloto\w*|deportista\w*|atleta\w*|equipo\w*|seleccion\w*|delegacion\w*)\b/;

// Palabras de instituciones, lugares y organizaciones que NO son el nombre de una persona aunque lleven mayúscula.
const NO_PERSONA = new Set(('municipalidad municipal concejo deliberativo club banco senado congreso gobierno provincia provincial nacion nacional ministerio argentina buenos aires '
  + 'mar plata balcarce tandil necochea miramar nicolas junin cordoba rosario mendoza espana estados unidos brasil chile uruguay europa instituto escuela colegio hospital cementerio '
  + 'comando sindicato copa liga torneo fiesta dia radio tecnica universidad facultad bomberos policia camara ley plaza campo desarrollo proyecto sociedad cooperativa asociacion '
  + 'federacion confederacion consejo secretaria direccion centro casa palacio teatro cine museo biblioteca iglesia parroquia ermita virgen santa san santo estadio autodromo '
  + 'circuito gran premio turismo formula super mundial sudamericana libertadores argentino argentinos ejercito fuerza aerea naval prevencion rural maxivoley voley basquet '
  + 'rugby tenis mesa futbol atletismo patin natacion gimnasia ciclismo trail enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre '
  + 'lunes martes miercoles jueves viernes sabado domingo anses indec afip arca bcra pami osebal lalcec uatre aacyc apm apt ford toyota fiat renault').split(' '));

const DETERMINANTES_INICIALES = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'en', 'con', 'por', 'para', 'tras', 'desde', 'hasta', 'ante', 'sobre']);
const CONECTORES_DE_NOMBRE = new Set(['de', 'del', 'la', 'las', 'los', 'van', 'von', 'da', 'di', 'mc']);

// Figuras que aparecen sólo con el apellido: sin esto, "Milei sube…" no se vería como una persona.
const FIGURAS_CONOCIDAS = new Set(('milei caputo kicillof macri bullrich villarruel messi colapinto canapino scaloni riquelme tapia lanus fernandez cristina sturzenegger '
  + 'francos adorni karina menem massa larreta posse zamora').split(' '));

const esMayuscula = (t) => /^\p{Lu}[\p{L}'’-]*$/u.test(t) && !/^\p{Lu}{3,}$/u.test(t);

/** Los nombres de persona que parece haber en un texto: secuencias de dos palabras con mayúscula (admite "de la") que no son una
 *  institución ni un lugar, más las figuras conocidas con sólo el apellido. Se usa para NO ponerlos en la consulta y para exigir una
 *  foto sin personas. Pasarse de estricto sólo cuesta una foto sin personas, nunca una foto equivocada. */
export function nombresDePersona(texto) {
  const tokens = String(texto ?? '').split(/\s+/).map((t) => t.replace(/^[«"'“”‘’(\[¿¡]+|[»"'“”‘’),.:;!?\]]+$/g, '')).filter(Boolean);
  const nombres = [];
  let corrida = [];
  const cerrar = () => {
    // Sin los determinantes del principio ("El Cementerio Municipal" → "Cementerio Municipal") ni conectores sueltos al final.
    while (corrida.length && (DETERMINANTES_INICIALES.has(plano(corrida[0])) || CONECTORES_DE_NOMBRE.has(plano(corrida[0])))) corrida.shift();
    while (corrida.length && CONECTORES_DE_NOMBRE.has(plano(corrida.at(-1)))) corrida.pop();
    const capitalizadas = corrida.filter((t) => esMayuscula(t));
    if (capitalizadas.length >= 2 && !corrida.some((t) => NO_PERSONA.has(plano(t)))) nombres.push(corrida.join(' '));
    corrida = [];
  };
  for (const t of tokens) {
    if (esMayuscula(t)) corrida.push(t);
    else if (corrida.length && CONECTORES_DE_NOMBRE.has(plano(t))) corrida.push(t);
    else cerrar();
  }
  cerrar();
  for (const t of tokens) if (FIGURAS_CONOCIDAS.has(plano(t)) && esMayuscula(t) && !nombres.some((n) => plano(n).includes(plano(t)))) nombres.push(t);
  return [...new Set(nombres)];
}

// ------------------------------------------------------ los temas y consultas

// Cada tema: lo que se reconoce en el texto de la nota → cómo se lo busca. `es` para Commons (que entiende castellano) y `en` para los demás.
// Se agregan de a poco, mirando las notas que quedan sin foto (npm run auditar-fotos). Va de lo más específico a lo más general.
export const TEMAS = [
  { re: /\b(silla de ruedas|muletas|ortopedi\w*|elementos de fisiatria)\b/, es: 'silla de ruedas', en: 'wheelchair' },
  { re: /\b(cine|cortometraje\w*|pelicula\w*|festival de cine)\b/, es: 'cine proyector', en: 'cinema film projector' },
  { re: /\b(murga\w*|comparsa\w*|carnaval)\b/, es: 'carnaval disfraces', en: 'carnival costumes parade' },
  { re: /\b(martin fierro|premios?|nominad\w*|terna)\b/, es: 'trofeo premio', en: 'award trophy' },
  { re: /\b(cementerio\w*)\b/, es: 'cementerio', en: 'cemetery' },
  { re: /\b(farmacia\w*|turnos de farmacia)\b/, es: 'farmacia', en: 'pharmacy sign' },
  { re: /\b(utiles escolares|mochila\w*|inscripcion\w* (?:para )?utiles)\b/, es: 'útiles escolares', en: 'school supplies' },
  { re: /\b(vtv|verificacion tecnica)\b/, es: 'verificación técnica vehicular', en: 'vehicle inspection' },
  { re: /\b(bomberos)\b/, es: 'autobomba bomberos', en: 'fire truck' },
  { re: /\b(tenis de mesa|ping ?pong)\b/, es: 'tenis de mesa', en: 'table tennis' },
  { re: /\b(maxivoley|voley|volley\w*)\b/, es: 'voleibol', en: 'volleyball court' },
  { re: /\b(basquet|basket\w*|baloncesto)\b/, es: 'baloncesto cancha', en: 'basketball court' },
  { re: /\b(trail|atletismo|maraton|carrera pedestre|running)\b/, es: 'atletismo carrera de montaña', en: 'trail running' },
  { re: /\b(gimnasia artistica|gimnasia)\b/, es: 'gimnasia artística', en: 'gymnastics' },
  { re: /\b(rugby|pato naranja|pato negro|campo de pato)\b/, es: 'rugby', en: 'rugby ball field' },
  { re: /\b(hockey)\b/, es: 'hockey sobre césped', en: 'field hockey' },
  { re: /\b(natacion|pileta|piscina)\b/, es: 'natación piscina', en: 'swimming pool' },
  { re: /\b(ciclismo|bicicleta\w*)\b/, es: 'ciclismo bicicleta', en: 'cycling bicycle road' },
  { re: /\b(padel)\b/, es: 'pádel', en: 'padel court' },
  { re: /\b(golf)\b/, es: 'golf campo', en: 'golf course' },
  { re: /\b(tenis)\b/, es: 'tenis cancha', en: 'tennis court' },
  { re: /\b(formula 1|f1|gran premio|colapinto|grilla)\b/, es: 'Fórmula 1 automóvil de carrera', en: 'formula one racing car' },
  { re: /\b(turismo nacional|turismo carretera|turismo competicion|tc 2000|rally|autodromo|automovilismo)\b/, es: 'automovilismo carrera autódromo', en: 'touring car race track' },
  { re: /\b(desafio eco|auto electrico|autos electricos|vehiculo electrico|energia solar|solar)\b/, es: 'automóvil eléctrico', en: 'electric car' },
  { re: /\b(futbol|liga profesional|copa argentina|libertadores|sudamericana|goles?|arquero|boca juniors|river plate)\b/, es: 'estadio de fútbol', en: 'football stadium' },
  { re: /\b(riesgo pais|bolsa|acciones|merval|bonos|mercado de capitales)\b/, es: 'Bolsa de Comercio de Buenos Aires', en: 'stock exchange trading screen' },
  { re: /\b(dolar|cotizacion|devalu\w*|cepo|tipo de cambio|reservas|banco central|bcra|oro)\b/, es: 'billetes de pesos argentinos', en: 'argentine peso banknotes' },
  { re: /\b(inflacion|indec|precios|canasta basica|servicios aumentan)\b/, es: 'supermercado góndola precios', en: 'supermarket shelves prices' },
  { re: /\b(consumo|ventas|comercio|comercial\w*|shopping|black friday|hot sale|empleos? por eventos)\b/, es: 'comercio vidriera calle comercial', en: 'retail shopping street' },
  { re: /\b(jubilacion\w*|jubilad\w*|pension\w*|anses|asignacion\w*)\b/, es: 'billetes pesos argentinos', en: 'argentine peso banknotes' },
  { re: /\b(tarifas? de (?:luz|energia)|luz|energia electrica|distribuidora\w*|electric\w*)\b/, es: 'líneas de alta tensión', en: 'power lines electricity pylon' },
  { re: /\b(gas|gasoducto)\b/, es: 'gasoducto', en: 'gas pipeline' },
  { re: /\b(agua potable|osebal|cloaca\w*|agua)\b/, es: 'agua canilla', en: 'water tap' },
  { re: /\b(subte|metro|linea f)\b/, es: 'subte de Buenos Aires', en: 'buenos aires subway train' },
  { re: /\b(colectivo\w*|transporte publico|micro|transporte)\b/, es: 'colectivo autobús', en: 'city bus' },
  { re: /\b(licitacion\w*|obra publica|construccion|construir)\b/, es: 'obra en construcción grúa', en: 'construction site crane' },
  { re: /\b(salud mental)\b/, es: 'salud mental', en: 'mental health abstract' },
  { re: /\b(mamograf\w*|cancer de mama|mes rosa|lalcec)\b/, es: 'lazo rosa cáncer de mama', en: 'pink ribbon breast cancer awareness' },
  { re: /\b(hospital\w*|salud|sanitari\w*|vacun\w*|medic\w*|fisiatria|rehabilitacion)\b/, es: 'hospital', en: 'hospital building' },
  { re: /\b(senado|congreso|diputados|dictamen|legislativ\w*)\b/, es: 'Congreso de la Nación Argentina', en: 'argentine national congress building' },
  { re: /\b(casa rosada|gobierno nacional|poder ejecutivo)\b/, es: 'Casa Rosada', en: 'casa rosada buenos aires' },
  { re: /\b(legislatura|gobierno bonaerense|provincia de buenos aires|bonaerense)\b/, es: 'La Plata edificio gubernamental', en: 'la plata government building' },
  { re: /\b(universidad\w*|universitari\w*|facultad)\b/, es: 'universidad edificio', en: 'university campus building' },
  { re: /\b(justicia|tribunal\w*|juzgado\w*|camara federal|fallo|multa)\b/, es: 'tribunales palacio de justicia', en: 'courthouse justice building' },
  { re: /\b(concejo deliberativo|municipalidad|municipio|palacio municipal|tasa municipal|tasa local|intendencia)\b/, es: 'palacio municipal', en: 'city hall building' },
  { re: /\b(soja|maiz|trigo|girasol|cosecha|siembra|cultivo\w*)\b/, es: 'cosecha campo', en: 'harvest crop field' },
  { re: /\b(papa|papas)\b/, es: 'cultivo de papa', en: 'potato field harvest' },
  { re: /\b(ganader\w*|vacuno\w*|hacienda|novillo\w*|vaca\w*|feedlot|frigorifico\w*)\b/, es: 'ganado vacuno pastura', en: 'cattle pasture' },
  { re: /\b(tractor\w*|maquinaria agricola|sembradora|cosechadora)\b/, es: 'tractor campo', en: 'tractor field' },
  { re: /\b(sequia|lluvias?|clima|pronostico)\b/, es: 'nubes campo', en: 'storm clouds field' },
  { re: /\b(inteligencia artificial|ia generativa|chatbot)\b/, es: 'inteligencia artificial', en: 'artificial intelligence abstract' },
  { re: /\b(ciberseguridad|hackeo|ciberataque\w*|phishing)\b/, es: 'ciberseguridad', en: 'cybersecurity' },
  { re: /\b(celular\w*|smartphone\w*|iphone|android|telefon\w*)\b/, es: 'teléfono inteligente', en: 'smartphone' },
  { re: /\b(satelite\w*|espacial|nasa|cohete\w*)\b/, es: 'satélite en órbita', en: 'satellite earth orbit' },
  { re: /\b(videojuego\w*|gamer|consola\w*)\b/, es: 'videojuegos', en: 'video game controller' },
  { re: /\b(musical|teatro|obra de teatro|escenario)\b/, es: 'teatro escenario', en: 'theatre stage' },
  { re: /\b(recital\w*|concierto\w*|show|gira|banda|rock|ratones paranoicos|u2)\b/, es: 'concierto escenario luces', en: 'live concert stage lights' },
  { re: /\b(biblioteca|libro\w*|lectura)\b/, es: 'biblioteca libros', en: 'library bookshelves' },
  { re: /\b(museo|exposicion|muestra de arte|galeria)\b/, es: 'museo sala', en: 'museum gallery' },
  { re: /\b(peregrinacion\w*|ermita|virgen|misa|iglesia|parroquia|religios\w*)\b/, es: 'iglesia', en: 'church building' },
  { re: /\b(radio|aptra)\b/, es: 'micrófono de radio estudio', en: 'radio microphone studio' },
  { re: /\b(plaza libertad|plaza)\b/, es: 'plaza', en: 'town square' },
  { re: /\b(turismo|turistic\w*|hotel\w*|alojamiento)\b/, es: 'turismo paisaje serrano', en: 'tourism landscape hills' },
];

// Cuando no se reconoce ningún tema: lo más parecido a la sección.
const POR_SECCION = {
  Balcarce: { es: 'Balcarce Buenos Aires', en: 'Balcarce Argentina', lugar: true },
  Economía: { es: 'economía Argentina', en: 'argentina economy buenos aires' },
  Política: { es: 'edificio gubernamental Buenos Aires', en: 'buenos aires government building' },
  Fútbol: { es: 'estadio de fútbol', en: 'football stadium' },
  Deportes: { es: 'deporte cancha', en: 'sports field' },
  Automovilismo: { es: 'automovilismo autódromo', en: 'racing car circuit' },
  Agro: { es: 'campo argentino', en: 'argentine farmland' },
  'Cultura y agenda': { es: 'cultura escenario', en: 'culture stage' },
  Tecnología: { es: 'tecnología', en: 'technology abstract' },
  Argentina: { es: 'Buenos Aires Argentina', en: 'buenos aires argentina' },
};

/**
 * ¿A esta nota se le puede poner una foto de stock, y con qué condiciones? Sólo mira el texto de la nota (título, bajada y etiquetas);
 * no usa red. Devuelve `{ apto, motivo, sinPersonas, personas, consultas }`:
 *   - `apto: false` + `motivo`: no se busca nada (queda la placa).
 *   - `sinPersonas: true`: sólo vale una foto sin personas, confirmada por la IA.
 *   - `consultas`: de la más específica a la más general, `{ tipo, es, en }` (tipo: lugar, tema, palabras o seccion).
 */
export function evaluarNota(nota, { personasAnonimas = false } = {}) {
  const seccion = nota?.seccion;
  const texto = plano([nota?.titulo, nota?.copete, ...(nota?.etiquetas ?? [])].filter(Boolean).join(' . '));
  const no = (motivo) => ({ apto: false, motivo, sinPersonas: true, personas: [], consultas: [] });
  if (!nota?.titulo) return no('la nota no tiene título');
  if (nota.propia) return no('nota propia: lleva su propia imagen');
  if (seccion === 'Policiales') return no('Policiales: nunca una foto de stock (podría pasar por la escena)');
  if (HECHO_O_VICTIMA.test(texto)) return no('cuenta un hecho, un delito o una víctima: una foto de stock podría pasar por la escena');
  if (LUGAR_CONCRETO.test(texto)) return no('trata de un lugar o un problema concreto: una foto de otro lugar parecería ésa');

  const personas = [...nombresDePersona(nota.titulo), ...(nota.etiquetas ?? []).flatMap((e) => nombresDePersona(e))];
  const unicas = [...new Set(personas)];
  let sinPersonas = false;
  const razones = [];
  if (seccion === 'Política') { sinPersonas = true; razones.push('Política'); }
  if (unicas.length) { sinPersonas = true; razones.push('nombra a una persona'); }
  if (CARGO_PUBLICO.test(texto)) { sinPersonas = true; razones.push('habla de un cargo o de personas'); }
  if (MENORES.test(texto)) { sinPersonas = true; razones.push('toca a menores (escuela, deporte infantil o juvenil)'); }
  if (!personasAnonimas && GENTE_DEL_DEPORTE.test(texto)) { sinPersonas = true; razones.push('habla de deportistas'); }

  const consultas = armarConsultas(nota);
  if (!consultas.length) return no('sin tema reconocible para buscar una foto');
  return { apto: true, motivo: null, sinPersonas, razonSinPersonas: razones.join(', ') || null, personas: unicas, consultas };
}

/** Las consultas de búsqueda: nunca llevan nombres de personas, sólo el tema (por la tabla TEMAS), el lugar si es de Balcarce y, al final,
 *  la sección. */
export function armarConsultas(nota) {
  // El tema se reconoce primero en el título; sólo si ahí no hay ninguno, en las etiquetas (no en la bajada: trae demasiadas palabras sueltas
  // que engañan). Se usan hasta dos temas, en el orden de la tabla (lo más específico primero).
  const enTitulo = TEMAS.filter((t) => t.re.test(plano(nota?.titulo)));
  const temas = (enTitulo.length ? enTitulo : TEMAS.filter((t) => t.re.test(plano((nota?.etiquetas ?? []).join(' . '))))).slice(0, 2);
  const consultas = [];
  for (const t of temas) {
    if (nota?.seccion === 'Balcarce') consultas.push({ tipo: 'lugar', es: `${t.es} Balcarce`, en: `${t.en} Balcarce Argentina` });
    consultas.push({ tipo: 'tema', es: t.es, en: t.en });
  }
  const s = POR_SECCION[nota?.seccion];
  // La genérica de la sección (o del lugar) va siempre al final y nunca pasa de 60 puntos (puntuarCandidata): no le gana a una del tema.
  if (s) consultas.push({ tipo: 'seccion', es: s.es, en: s.en });
  const vistas = new Set();
  return consultas.filter((c) => { const k = `${c.tipo}|${c.es}`; if (vistas.has(k)) return false; vistas.add(k); return true; });
}

// ------------------------------------------------------------- proveedores

const MARCA_O_LOGO = /\b(?:watermark|marca de agua|shutterstock|getty|alamy|istock|depositphotos|dreamstime|123rf|adobe stock|copyright|logo|logotipo|icon|map|mapa|diagram|poster|flag|bandera|signature|banner|stamp|crest|escudo|coat of arms|screenshot|captura|schematic|vector|illustration|ilustracion|clipart|painting|cuadro|dibujo|drawing|cartoon|sketch)\b|\.svg\b/;
const PERSONAS = /\b(person|people|man|men|woman|women|boy|girl|child|children|kid|kids|baby|portrait|selfie|crowd|group|team|player|players|athlete|athletes|runner|runners|student|students|family|couple|speaker|politician|audience|fans|hombre|hombres|mujer|mujeres|persona|personas|gente|nino|nina|ninos|retrato|multitud|equipo|jugador|jugadores|corredor|corredores|estudiante|estudiantes|familia|grupo|publico|hinchada|bailarin\w*|cantante|musico\w*|actor|actriz)\b/;

/** Wikimedia Commons: sin clave; la licencia se verifica en la propia respuesta (extmetadata). Devuelve candidatas crudas. */
export async function buscarEnCommons(consulta, { fetchFn = fetch, limite = 20 } = {}) {
  const q = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrsearch: `${String(consulta).slice(0, 150)} filetype:bitmap`, gsrnamespace: '6', gsrlimit: String(limite),
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1600',
    iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|ImageDescription|ObjectName|Categories|Restrictions|NonFree|Copyrighted|AttributionRequired',
    origin: '*',
  });
  const res = await fetchFn(`https://commons.wikimedia.org/w/api.php?${q}`, { signal: AbortSignal.timeout(ESPERA), headers: { 'user-agent': AGENTE } });
  if (!res.ok) throw new Error(`Commons HTTP ${res.status}`);
  const paginas = Object.values((await res.json())?.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const candidatas = [];
  for (const p of paginas) {
    const info = p.imageinfo?.[0];
    if (!info || !/^image\/(jpeg|png)$/.test(info.mime ?? '')) continue;
    const meta = info.extmetadata ?? {};
    const licencia = String(meta.LicenseShortName?.value ?? '').trim();
    // La licencia se verifica en lo que devolvió la API: libre (CC0, CC BY, CC BY-SA, dominio público), nada NC/ND, sin "no libre",
    // sin restricciones (marca registrada, derechos de la personalidad).
    if (!WIKIMEDIA_LICENCIAS_LIBRES.test(licencia)) continue;
    if (/true|yes|1/i.test(String(meta.NonFree?.value ?? ''))) continue;
    if (String(meta.Restrictions?.value ?? '').trim()) continue;
    const ancho = info.thumbwidth ?? info.width;
    const alto = info.thumbheight ?? info.height;
    const imagen = info.thumburl || info.url;
    if (!imagen) continue;
    const titulo = String(p.title ?? '').replace(/^File:/, '').replace(/\.\w{3,4}$/, '');
    const categorias = String(meta.Categories?.value ?? '').split('|').join(' ');
    candidatas.push({
      proveedor: 'commons', id: String(p.pageid ?? p.title), imagen, pagina: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title ?? '')}`,
      ancho, alto, autor: textoPlano(meta.Artist?.value) ?? null, licencia, titulo,
      texto: `${titulo} ${textoPlano(meta.ImageDescription?.value) ?? ''} ${categorias}`,
    });
  }
  return candidatas;
}

/** Pexels (PEXELS_API_KEY): licencia propia, gratis y sin obligación de crédito (igual se da). */
export async function buscarEnPexels(consulta, { fetchFn = fetch, claveApi, limite = 20 } = {}) {
  const q = new URLSearchParams({ query: String(consulta).slice(0, 100), per_page: String(limite), orientation: 'landscape' });
  const res = await fetchFn(`https://api.pexels.com/v1/search?${q}`, { signal: AbortSignal.timeout(ESPERA), headers: { authorization: claveApi, 'user-agent': AGENTE } });
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
  return ((await res.json())?.photos ?? []).filter((f) => f?.src?.large2x || f?.src?.original).map((f) => ({
    proveedor: 'pexels', id: String(f.id), imagen: f.src.large2x ?? f.src.original, pagina: f.url, ancho: f.width, alto: f.height,
    autor: f.photographer ?? null, licencia: 'Licencia Pexels', titulo: f.alt ?? '', texto: f.alt ?? '',
  }));
}

/** Unsplash (UNSPLASH_ACCESS_KEY). Pide avisar la descarga (`avisarDescargaUnsplash`). */
export async function buscarEnUnsplash(consulta, { fetchFn = fetch, claveApi, limite = 20 } = {}) {
  const q = new URLSearchParams({ query: String(consulta).slice(0, 100), per_page: String(limite), orientation: 'landscape', content_filter: 'high' });
  const res = await fetchFn(`https://api.unsplash.com/search/photos?${q}`, {
    signal: AbortSignal.timeout(ESPERA), headers: { authorization: `Client-ID ${claveApi}`, 'accept-version': 'v1', 'user-agent': AGENTE },
  });
  if (!res.ok) throw new Error(`Unsplash HTTP ${res.status}`);
  return ((await res.json())?.results ?? []).filter((f) => f?.urls?.raw || f?.urls?.regular).map((f) => ({
    proveedor: 'unsplash', id: String(f.id), imagen: f.urls.raw ? `${f.urls.raw}${f.urls.raw.includes('?') ? '&' : '?'}w=1600&fit=max&q=80&fm=jpg` : f.urls.regular,
    pagina: f.links?.html, ancho: f.width, alto: f.height, autor: f.user?.name ?? null, licencia: 'Licencia Unsplash',
    titulo: f.description ?? f.alt_description ?? '', texto: `${f.description ?? ''} ${f.alt_description ?? ''} ${(f.tags ?? []).map((t) => t.title).join(' ')}`,
    avisarDescarga: f.links?.download_location ?? null,
  }));
}

/** Unsplash pide que se avise cada descarga (sus condiciones de la API). Nunca lanza. */
export async function avisarDescargaUnsplash(candidata, { fetchFn = fetch, claveApi } = {}) {
  if (candidata?.proveedor !== 'unsplash' || !candidata.avisarDescarga || !claveApi) return false;
  try {
    const res = await fetchFn(candidata.avisarDescarga, { signal: AbortSignal.timeout(ESPERA), headers: { authorization: `Client-ID ${claveApi}`, 'accept-version': 'v1' } });
    return !!res.ok;
  } catch { return false; }
}

/** Pixabay (PIXABAY_API_KEY). `largeImageURL` mide hasta 1.280 px de ancho. */
export async function buscarEnPixabay(consulta, { fetchFn = fetch, claveApi, limite = 20 } = {}) {
  const q = new URLSearchParams({
    key: claveApi, q: String(consulta).slice(0, 100), image_type: 'photo', orientation: 'horizontal', min_width: String(ANCHO_MINIMO), safesearch: 'true', per_page: String(limite),
  });
  const res = await fetchFn(`https://pixabay.com/api/?${q}`, { signal: AbortSignal.timeout(ESPERA), headers: { 'user-agent': AGENTE } });
  if (!res.ok) throw new Error(`Pixabay HTTP ${res.status}`);
  return ((await res.json())?.hits ?? []).filter((f) => f?.largeImageURL).map((f) => ({
    proveedor: 'pixabay', id: String(f.id), imagen: f.largeImageURL, pagina: f.pageURL, ancho: Math.min(f.imageWidth ?? 0, 1280), alto: Math.min(f.imageHeight ?? 0, 1280),
    // El ancho original (imageWidth) es el que se exige; lo que se baja mide hasta 1.280.
    anchoOriginal: f.imageWidth ?? null, autor: f.user ?? null, licencia: 'Licencia de contenido de Pixabay', titulo: f.tags ?? '', texto: f.tags ?? '',
  }));
}

const BUSCADORES = {
  commons: (consulta, ctx) => buscarEnCommons(consulta, ctx),
  pexels: (consulta, ctx) => buscarEnPexels(consulta, ctx),
  unsplash: (consulta, ctx) => buscarEnUnsplash(consulta, ctx),
  pixabay: (consulta, ctx) => buscarEnPixabay(consulta, ctx),
};

// ------------------------------------------------------------------ puntaje

/**
 * El puntaje (0 a 100) de una candidata para una consulta. Devuelve `{ puntaje, descartada, desglose }`; `descartada` trae el motivo y el
 * puntaje queda en 0. Es puro: no usa red.
 *   relevancia (0-60): qué parte de las palabras de la consulta aparece en el título, la descripción, las etiquetas o las categorías
 *   tamaño (0-15):     1.200 px es el mínimo (menos, se descarta); 1.600 suma 8; 2.400 o más, 15
 *   orientación (0-15): apaisada 1,3 a 1,9 es lo ideal; vertical se descarta
 *   licencia (0-5):    CC0 o dominio público 5; el resto 3
 *   tipo (-5 a 5):     una consulta de tema suma, una de sección resta
 *   personas (-25):    si el texto habla de personas y la nota no exige "sin personas"; con `sinPersonas` se descarta
 */
export function puntuarCandidata(candidata, consulta, { sinPersonas = false, tipo = 'tema', idioma = 'es', anchoMinimo = ANCHO_MINIMO } = {}) {
  const descartar = (motivo) => ({ puntaje: 0, descartada: motivo, desglose: {} });
  const texto = plano(`${candidata.titulo ?? ''} ${candidata.texto ?? ''}`);
  const ancho = candidata.anchoOriginal ?? candidata.ancho ?? 0;
  const alto = candidata.alto ?? 0;
  if (!(ancho >= anchoMinimo)) return descartar(`mide ${ancho || '?'} px de ancho (mínimo ${anchoMinimo})`);
  if (!(alto > 0)) return descartar('sin alto conocido');
  const proporcion = ancho / alto;
  if (proporcion < 1.2) return descartar('no es apaisada');
  if (MARCA_O_LOGO.test(texto)) return descartar('parece un logo, un dibujo, una captura o tiene una marca');
  const hablaDePersonas = PERSONAS.test(texto);
  if (sinPersonas && hablaDePersonas) return descartar('la nota exige una foto sin personas y ésta las menciona');

  const palabras = [...new Set(palabrasDe(consulta[idioma] ?? consulta.es ?? '').filter((p) => p.length > 2 && !PALABRAS_VACIAS.has(p)))];
  const coinciden = palabras.filter((p) => texto.includes(p) || (p.length > 4 && texto.includes(p.slice(0, -1)))).length;
  const relevancia = palabras.length ? Math.round(60 * (coinciden / palabras.length)) : 0;
  const tamano = ancho >= 2400 ? 15 : ancho >= 1600 ? 8 : 3;
  const orientacion = proporcion >= 1.3 && proporcion <= 1.9 ? 15 : proporcion <= 2.3 ? 8 : 3;
  const licencia = /cc0|public domain|dominio p/i.test(candidata.licencia ?? '') ? 5 : 3;
  const delTipo = { lugar: 5, tema: 5, palabras: 0, seccion: -5 }[tipo] ?? 0;
  const personas = !sinPersonas && hablaDePersonas ? -25 : 0;
  // La genérica de la sección no pasa de 60: nunca le gana a una foto del tema concreto de la nota.
  const tope = tipo === 'seccion' ? TOPE_GENERICA : 100;
  const puntaje = Math.max(0, Math.min(tope, relevancia + tamano + orientacion + licencia + delTipo + personas));
  return { puntaje, descartada: null, desglose: { relevancia, tamano, orientacion, licencia, tipo: delTipo, personas, coinciden, palabras: palabras.length } };
}

// ----------------------------------------------------------------- búsqueda

/** Las fotos que ya usó otra nota (para no repetir la misma foto de stock en diez notas): la dirección original guardada en el banco. */
export function yaUsadasEnElBanco(banco = {}) {
  return new Set(Object.values(banco).filter((b) => b?.origen === 'stock' && b.imagenOriginal).map((b) => b.imagenOriginal));
}

/**
 * Busca y puntúa fotos de stock para una nota. Nunca lanza. Devuelve
 * `{ evaluacion, candidatas, consultas, errores }`, con `candidatas` ya filtradas (>= UMBRAL), de mayor a menor puntaje.
 * No baja ninguna imagen. Si la nota no es apta, no hace ningún pedido.
 */
export async function candidatasDeStock(nota, {
  fetchFn = fetch, env, proveedores, excluir = new Set(), personasAnonimas = false, umbral = UMBRAL, maximo = MAXIMO_CANDIDATAS, tiposPermitidos = TIPOS_POR_DEFECTO,
} = {}) {
  const evaluacion = evaluarNota(nota, { personasAnonimas });
  if (!evaluacion.apto) return { evaluacion, candidatas: [], consultas: [], errores: [] };
  const usar = (proveedores ?? proveedoresDisponibles({ env })).filter((p) => BUSCADORES[p]);
  const errores = [];
  const todas = [];
  const vistas = new Set();
  const consultasHechas = [];

  // `tiposPermitidos`: por defecto sólo fotos del tema concreto de la nota (y del tema en Balcarce); la genérica de la sección ('seccion')
  // es optativa y la decide Hernán (PROPUESTA-STOCK.md).
  for (const consulta of evaluacion.consultas.filter((c) => tiposPermitidos.includes(c.tipo)).slice(0, MAXIMO_CONSULTAS)) {
    for (const prov of usar) {
      const claveApi = prov === 'pexels' ? clave('PEXELS_API_KEY', env) : prov === 'unsplash' ? clave('UNSPLASH_ACCESS_KEY', env) : prov === 'pixabay' ? clave('PIXABAY_API_KEY', env) : null;
      if (prov !== 'commons' && !claveApi) continue;
      // Commons entiende castellano y los demás buscan mejor en inglés.
      const idioma = prov === 'commons' ? 'es' : 'en';
      try {
        consultasHechas.push({ proveedor: prov, texto: consulta[idioma], tipo: consulta.tipo });
        const crudas = await BUSCADORES[prov](consulta[idioma], { fetchFn, claveApi });
        for (const c of crudas) {
          const llave = `${c.proveedor}:${c.id}`;
          if (vistas.has(llave) || excluir.has(c.imagen)) continue;
          vistas.add(llave);
          const p = puntuarCandidata(c, consulta, { sinPersonas: evaluacion.sinPersonas, tipo: consulta.tipo, idioma });
          if (p.descartada || p.puntaje < umbral) continue;
          todas.push({ ...c, ...p, consulta: consulta[idioma], tipoDeConsulta: consulta.tipo });
        }
      } catch (e) {
        errores.push(`${prov}: ${e.message}`);
      }
    }
    // Con dos o más candidatas buenas de una consulta específica no se sigue con las más generales.
    if (todas.filter((c) => c.puntaje >= Math.max(umbral + 15, 70)).length >= 2) break;
  }
  todas.sort((a, b) => b.puntaje - a.puntaje);
  return { evaluacion, candidatas: todas.slice(0, maximo), consultas: consultasHechas, errores };
}

// -------------------------------------------------------- confirmar con IA

function instruccionDeConfirmacion(nota, evaluacion) {
  return `Sos el editor de fotos de Radar Balcarce, un medio digital de Balcarce (Buenos Aires).
Tenés que decidir si esta foto de STOCK (una foto genérica de un banco de imágenes, no del hecho) sirve como foto ilustrativa de la nota:
Título: "${nota.titulo}" (sección ${nota.seccion})

Mirá la imagen y devolvé sólo un objeto JSON con esta forma exacta:
{"relevante": true o false (¿ilustra bien el TEMA de la nota, de manera genérica?), "puntaje": número de 0 a 10 (qué tan bien),
 "hay_personas": true o false (¿se ve alguna persona, aunque sea chica o de lejos?),
 "hay_menores": true o false (¿se ve alguien que parezca menor de 18 años? ante la duda, true),
 "marca_o_texto": true o false (¿tiene una marca de agua, un logo de un medio o un banco de imágenes, o texto sobreimpreso, o un cartel con un nombre propio legible: un negocio, una calle, una institución?),
 "parece_escena_real": true o false (¿parece la foto de un hecho concreto o de un lugar identificable del que habla la nota, de manera que alguien podría creer que es la foto del hecho?),
 "razon": "una frase corta"}
${evaluacion?.sinPersonas ? 'Para esta nota la foto tiene que ser SIN personas: si se ve cualquier persona, "hay_personas" va en true.' : ''}`;
}

/** Interpreta la respuesta de la IA: `{ aprobada, motivo, ... }`. Pura. Sólo se aprueba con todas las respuestas explícitas. */
export function interpretarConfirmacion(obj, evaluacion = {}) {
  const r = {
    relevante: obj?.relevante === true, puntaje: Number(obj?.puntaje), hayPersonas: obj?.hay_personas, hayMenores: obj?.hay_menores,
    marcaOTexto: obj?.marca_o_texto, parecEscenaReal: obj?.parece_escena_real, razon: String(obj?.razon ?? '').slice(0, 300),
  };
  const falta = ['hayPersonas', 'hayMenores', 'marcaOTexto', 'parecEscenaReal'].filter((k) => typeof r[k] !== 'boolean');
  let motivo = null;
  if (falta.length) motivo = 'la IA no contestó todo lo que se le preguntó';
  else if (r.hayMenores) motivo = 'se ve un menor';
  else if (r.marcaOTexto) motivo = 'tiene marca de agua, logo o texto';
  else if (evaluacion.sinPersonas && r.hayPersonas) motivo = 'la nota exige una foto sin personas y se ve alguien';
  else if (r.parecEscenaReal) motivo = 'podría pasar por la foto del hecho';
  else if (!r.relevante || !(r.puntaje >= 6)) motivo = 'no ilustra bien el tema';
  return { ...r, aprobada: !motivo, motivo };
}

async function pedirConfirmacion(nota, evaluacion, datos, { claveGemini, claveGroqApi, fetchFn }) {
  const texto = instruccionDeConfirmacion(nota, evaluacion);
  let ultimo = null;
  if (claveGemini) {
    try {
      const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO_DE_TEXTO}:generateContent`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': claveGemini },
        body: JSON.stringify({ contents: [{ parts: [{ text: texto }, { inlineData: { mimeType: datos.mime, data: datos.base64 } }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
      const j = await res.json();
      return JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '');
    } catch (e) { ultimo = e; }
  }
  if (claveGroqApi) {
    try {
      const res = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${claveGroqApi}` },
        body: JSON.stringify({
          model: MODELO_GROQ_VISION, temperature: 0, response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: [{ type: 'text', text: texto }, { type: 'image_url', image_url: { url: `data:${datos.mime};base64,${datos.base64}` } }] }],
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
      const j = await res.json();
      return JSON.parse(j.choices?.[0]?.message?.content ?? '');
    } catch (e) { ultimo = e; }
  }
  throw ultimo ?? new Error('sin clave de IA para confirmar');
}

/**
 * La confirmación con una IA barata (el modelo de clasificación de fotos que ya existe: Gemini y, de respaldo, Groq). Paso opcional,
 * salvo que la nota exija una foto sin personas. Nunca lanza: si la IA falla devuelve `{ aprobada: false, motivo }`, y una foto sin
 * confirmar no se usa cuando se pidió confirmación.
 */
export async function confirmarConIA(nota, evaluacion, datos, {
  claveGemini = claveClasificacion(), claveGroqApi = claveGroq(), fetchFn = fetch,
} = {}) {
  if (!datos) return { aprobada: false, motivo: 'no se pudo bajar la imagen para confirmarla' };
  try {
    return interpretarConfirmacion(await pedirConfirmacion(nota, evaluacion, datos, { claveGemini, claveGroqApi, fetchFn }), evaluacion);
  } catch (e) {
    return { aprobada: false, motivo: `la IA no pudo confirmar la foto (${e.message})` };
  }
}

// ----------------------------------------------------------------- elegir

/** El epígrafe: "Foto ilustrativa. Foto: Autor / Proveedor (licencia)". Siempre empieza por "Foto ilustrativa". */
export function creditoDeStock({ proveedor, autor, licencia } = {}) {
  const nombre = NOMBRE_DEL_PROVEEDOR[proveedor] ?? 'banco de imágenes';
  const quien = autor ? `${autor} / ${nombre}` : nombre;
  const lic = proveedor === 'commons' && licencia ? ` (${licencia})` : '';
  return `Foto ilustrativa. Foto: ${quien}${lic}`;
}

/**
 * El armado completo para una nota: busca, puntúa, baja la mejor y la hace confirmar. Nunca lanza.
 * Devuelve `{ elegida, razon, candidatas, evaluacion, origen: 'stock' }`; `elegida` trae `datos` (la imagen bajada, { mime, base64 }) y el
 * `credito`. Apagado (sin `forzar`), no hace nada. Una nota que exige "sin personas" sólo se resuelve con la confirmación de la IA.
 *   confirmar: false → sin IA (no sirve para notas que exigen sin personas); true → la IA existente; una función → esa (para pruebas).
 */
export async function elegirFotoStock(nota, {
  fetchFn = fetch, env, forzar = false, confirmar = true, proveedores, excluir, personasAnonimas = false, tiposPermitidos, claveGemini, claveGroqApi, intentosDeConfirmacion = 3,
} = {}) {
  if (!forzar && !fotoStockActiva({ env })) return { elegida: null, razon: 'la foto de stock está apagada (FOTO_STOCK_ACTIVA)', candidatas: [], evaluacion: null, origen: 'stock', apagado: true };
  const busqueda = await candidatasDeStock(nota, { fetchFn, env, proveedores, excluir, personasAnonimas, ...(tiposPermitidos ? { tiposPermitidos } : {}) });
  const { evaluacion, candidatas } = busqueda;
  const sin = (razon) => ({ elegida: null, razon, candidatas, evaluacion, errores: busqueda.errores, consultas: busqueda.consultas, origen: 'stock' });
  if (!evaluacion.apto) return sin(`no se usa stock: ${evaluacion.motivo}`);
  if (evaluacion.sinPersonas && !confirmar) return sin(`la nota exige una foto sin personas (${evaluacion.razonSinPersonas}) y hace falta la IA para confirmarlo`);
  if (!candidatas.length) return sin(busqueda.errores.length ? `sin candidatas (${busqueda.errores.join('; ')})` : 'ninguna foto de stock con el puntaje mínimo');

  const rechazadas = [];
  for (const c of candidatas.slice(0, intentosDeConfirmacion)) {
    const datos = await descargarImagen(c.imagen, { fetchFn });
    if (!datos) { rechazadas.push(`${c.proveedor} ${c.id}: no se pudo bajar`); continue; }
    let confirmacion = null;
    if (confirmar) {
      confirmacion = typeof confirmar === 'function'
        ? await confirmar(nota, evaluacion, datos, c)
        : await confirmarConIA(nota, evaluacion, datos, { fetchFn, ...(claveGemini !== undefined ? { claveGemini } : {}), ...(claveGroqApi !== undefined ? { claveGroqApi } : {}) });
      if (!confirmacion?.aprobada) { rechazadas.push(`${c.proveedor} ${c.id}: ${confirmacion?.motivo ?? 'no confirmada'}`); continue; }
    }
    if (c.proveedor === 'unsplash') await avisarDescargaUnsplash(c, { fetchFn, claveApi: clave('UNSPLASH_ACCESS_KEY', env) });
    return {
      elegida: {
        ...c, datos, medio: NOMBRE_DEL_PROVEEDOR[c.proveedor], enlace: c.pagina, credito: creditoDeStock(c), ilustrativa: true, confirmada: !!confirmacion?.aprobada,
      },
      razon: `Foto de stock de ${NOMBRE_DEL_PROVEEDOR[c.proveedor]} (puntaje ${c.puntaje}) para "${c.consulta}"${confirmacion?.razon ? `; la IA: ${confirmacion.razon}` : ''}.`,
      candidatas, evaluacion, errores: busqueda.errores, consultas: busqueda.consultas, rechazadas, origen: 'stock',
    };
  }
  return sin(`ninguna candidata pasó: ${rechazadas.join(' | ')}`);
}

/**
 * Lo que se anota en `web/data/banco-fotos.json` para una foto de stock elegida (los mismos campos que las demás, más `ilustrativa`,
 * `proveedor` y `consulta`). `archivo` es la ruta ya decidida por el flujo que guarda el archivo (`fotos-notas/<id>.jpg`).
 */
export function entradaDeBancoStock(elegida, nota, { archivo, ahora = new Date() } = {}) {
  return {
    archivo, medio: elegida.medio ?? NOMBRE_DEL_PROVEEDOR[elegida.proveedor], credito: elegida.credito ?? creditoDeStock(elegida), licencia: elegida.licencia ?? null,
    ...(elegida.autor ? { autor: elegida.autor } : {}), origen: 'stock', ilustrativa: true, proveedor: elegida.proveedor, consulta: elegida.consulta ?? null,
    titulo: nota?.titulo ?? null, enlace: elegida.pagina ?? elegida.enlace ?? null, imagenOriginal: elegida.imagen ?? null, razon: elegida.razon ?? null, cuando: ahora.toISOString(),
  };
}

// ---------------------------------------------------------------- ensayo

const esc = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** La página para revisar a ojo (sólo en la PC, reels/salida/ no se sube): por cada nota, hasta tres candidatas con su puntaje, licencia y crédito. */
export function htmlDeEnsayo(tarjetas = [], { dias = 14 } = {}) {
  const cuerpo = tarjetas.map(({ nota, motivo, ev, candidatas }) => `
  <article><h2>${esc(nota.titulo)}</h2>
    <p class="m"><b>${esc(nota.seccion)}</b> · ${esc(motivo)}${ev.sinPersonas ? ' · <b>exige foto SIN personas</b>' : ''}</p>
    <div class="f">${candidatas.length ? candidatas.map((c) => `<figure><a href="${esc(c.pagina)}"><img src="${esc(c.imagen)}" loading="lazy" alt=""></a><figcaption><b>${c.puntaje} pts</b> · ${esc(c.tipoDeConsulta)}: ${esc(c.consulta)}<br>${esc(c.titulo).slice(0, 80)}<br>${esc(creditoDeStock(c))}</figcaption></figure>`).join('') : '<p>Sin candidata.</p>'}</div></article>`).join('');
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fotos de stock candidatas</title>
<style>body{font:15px/1.4 system-ui,sans-serif;max-width:1000px;margin:24px auto;padding:0 16px;background:#f6f5f2;color:#1c1b19}article{background:#fff;border:1px solid #e4e1da;padding:12px 16px;margin:14px 0;border-radius:6px}h2{font-size:17px;margin:0}.m{margin:2px 0;color:#6b6860}.f{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}figure{margin:0;width:300px}img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:4px}figcaption{font-size:12px;color:#6b6860}</style>
<h1>Fotos de stock candidatas para las notas sin foto de ${dias} días (${tarjetas.length})</h1><p>Sólo para revisar: todavía no se usa ninguna.</p>${cuerpo}</html>`;
}

/*
 * Para mirar qué haría, sin tocar nada:
 *   node ingesta/foto-stock.mjs                 qué notas de los últimos 14 días sin foto se podrían rescatar (sin red)
 *   node ingesta/foto-stock.mjs --dias=7
 *   node ingesta/foto-stock.mjs --red           además busca en Wikimedia Commons (sin clave; no baja ninguna imagen, no gasta IA)
 * Lee web/data/*.json, no escribe nada y no usa claves.
 */
async function ensayo() {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { auditarFotos, MOTIVOS } = await import('./auditar-fotos.mjs');
  const raiz = path.join(import.meta.dirname, '..');
  const leer = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(raiz, f), 'utf8')); } catch { return d; } };
  const dias = Number((process.argv.find((a) => a.startsWith('--dias=')) ?? '--dias=14').split('=')[1]) || 14;
  const conHtml = process.argv.includes('--html');
  const conRed = process.argv.includes('--red') || conHtml;
  const tarjetas = [];
  const notas = [...(leer('web/data/portada.json', { notas: [] }).notas ?? []), ...(leer('web/data/archivo.json', { notas: [] }).notas ?? [])];
  const a = auditarFotos({ notas, banco: leer('web/data/banco-fotos.json', {}), desde: Date.now() - dias * 86_400_000 });
  const resumen = { aptas: 0, sinPersonas: 0, noAptas: 0, conTema: 0, soloGenerica: 0, sinCandidata: 0 };
  console.log(`\nNOTAS SIN FOTO DE LOS ÚLTIMOS ${dias} DÍAS: ${a.sinFoto.length}\n`);
  for (const { nota, motivo } of a.sinFoto) {
    if (motivo === 'borrada') continue;
    const ev = evaluarNota(nota);
    if (!ev.apto) resumen.noAptas += 1; else if (ev.sinPersonas) { resumen.aptas += 1; resumen.sinPersonas += 1; } else resumen.aptas += 1;
    let extra = '';
    if (conRed && ev.apto) {
      await new Promise((r) => setTimeout(r, 400));
      const r = await candidatasDeStock(nota, { proveedores: ['commons'], tiposPermitidos: ['lugar', 'tema', 'seccion'] });
      const m = r.candidatas[0];
      if (!m) resumen.sinCandidata += 1; else if (m.tipoDeConsulta === 'seccion') resumen.soloGenerica += 1; else resumen.conTema += 1;
      if (conHtml) tarjetas.push({ nota, motivo, ev, candidatas: r.candidatas.slice(0, 3) });
      extra = m ? ` · mejor: ${m.puntaje} pts, ${m.titulo.slice(0, 50)} (${m.licencia}) [consulta ${m.tipoDeConsulta}: ${m.consulta}]` : ' · sin candidata';
    }
    console.log(`[${nota.seccion}] ${String(nota.titulo).slice(0, 60)}\n    ${MOTIVOS[motivo]}\n    → ${ev.apto ? `stock${ev.sinPersonas ? ' SIN PERSONAS' : ''}: "${ev.consultas[0].es}"${extra}` : `no: ${ev.motivo}`}`);
  }
  console.log(`\nAptas para stock: ${resumen.aptas} (de ellas, sólo sin personas: ${resumen.sinPersonas}) · no aptas: ${resumen.noAptas}`);
  if (conRed) console.log(`Con la búsqueda en Commons: foto del tema ${resumen.conTema} · sólo una genérica de la sección ${resumen.soloGenerica} · ninguna ${resumen.sinCandidata}`);
  if (conHtml) {
    const destino = path.join(raiz, 'reels', 'salida', 'stock-candidatas.html');
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, htmlDeEnsayo(tarjetas, { dias }));
    console.log(`Para mirar las fotos con los ojos: ${destino}`);
  }
  console.log('');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await ensayo();

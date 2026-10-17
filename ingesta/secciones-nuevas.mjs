// El mapa de secciones (16/10/2026): 17 en el papel (docs/secciones/MAPA-DE-SECCIONES.md).
//
// Desde el 17/10/2026 (regla 215) están ACTIVAS tres: Educación, Salud y Ciencia (SECCIONES_SUMADAS, al final del archivo; el
// interruptor SECCIONES_NUEVAS de la regla 187 se sacó) y Tecnología se lee "Tecnología e IA". El resto del mapa (Espectáculos,
// Turismo, Ambiente) sigue en sombra: sirve para medir, con las notas reales, cómo quedaría el reparto.
// Lo corre `node ingesta/secciones-nuevas-sombra.mjs` y lo cuida
// pruebas/secciones-nuevas.test.mjs.
//
// Cómo decide: NO vuelve a clasificar desde cero. Parte de la sección que ya
// decidió el sistema de hoy (palabras + lectura con IA) y sólo la REFINA:
// una nota de Balcarce que habla de una escuela pasa a Educación; una de
// Argentina sobre una vacuna, a Salud; una de Tecnología sobre un telescopio,
// a Ciencia. Lo que no encaja en nada más preciso se queda donde estaba.
//
// Las reglas de siempre (CLAUDE.md, "Las palabras clave cortas engañan"):
//   · una palabra FIRME decide desde el título o la bajada;
//   · una palabra DÉBIL (ambigua: "clases", "serie", "colegio") decide sólo si
//     está en el TÍTULO y ninguna firme encontró nada;
//   · de cuatro letras para abajo se exige la palabra entera, y las de
//     ENTERAS también ("marte" no es "martes");
//   · CONTRAS: frases que anulan una palabra ("a ciencia cierta" no es ciencia,
//     "conductor ebrio" no es la tele).
//
// SIN dependencias (regla de ingesta/): ni siquiera importa ingesta.mjs.

// ------------------------------------------------------------- el mapa

/**
 * Las 17 secciones del mapa nuevo, en el orden editorial del menú.
 *   · `nombre`: la clave que se guarda en cada nota (`seccion`).
 *   · `etiqueta`: lo que lee la persona en el menú, si es distinto.
 *   · `ranura`: la dirección (/seccion/<ranura>). Las de hoy NO cambian.
 *   · `menu`: 'principal' (la barra) o 'mas' (el desplegable "Más secciones").
 *   · `nueva`: si hoy no existe.
 *   Las claves de hoy NO cambian ("Cultura y agenda" y "Tecnología" siguen siendo la
 *   clave de 60 archivos y de las notas guardadas): sólo cambia lo que se lee.
 */
export const SECCIONES_NUEVAS = [
  { nombre: 'Balcarce', ranura: 'balcarce', color: '#B91C1C', menu: 'principal', grupo: 'Balcarce', nueva: false },
  { nombre: 'Política', ranura: 'politica', color: '#3730A3', menu: 'principal', grupo: 'Balcarce', nueva: false },
  { nombre: 'Policiales', ranura: 'policiales', color: '#831843', menu: 'principal', grupo: 'Balcarce', nueva: false },
  { nombre: 'Educación', ranura: 'educacion', color: '#1D4BE0', menu: 'mas', grupo: 'Sociedad', nueva: true },
  { nombre: 'Salud', ranura: 'salud', color: '#004E5C', menu: 'mas', grupo: 'Sociedad', nueva: true },
  { nombre: 'Fútbol', ranura: 'futbol', color: '#7C3AED', menu: 'principal', grupo: 'Deportes', nueva: false },
  { nombre: 'Deportes', ranura: 'deportes', color: '#0F766E', menu: 'principal', grupo: 'Deportes', nueva: false },
  { nombre: 'Automovilismo', ranura: 'automovilismo', color: '#B45309', menu: 'principal', grupo: 'Deportes', nueva: false },
  { nombre: 'Agro', ranura: 'agro', color: '#5A6B0A', menu: 'principal', grupo: 'Economía', nueva: false },
  { nombre: 'Economía', ranura: 'economia', color: '#8A6500', menu: 'principal', grupo: 'Economía', nueva: false },
  { nombre: 'Ciencia', ranura: 'ciencia', color: '#772E9E', menu: 'mas', grupo: 'Ciencia y tecnología', nueva: true },
  { nombre: 'Tecnología', etiqueta: 'Tecnología e IA', ranura: 'tecnologia', color: '#0B6FB8', menu: 'mas', grupo: 'Ciencia y tecnología', nueva: false },
  { nombre: 'Cultura y agenda', etiqueta: 'Cultura', ranura: 'cultura', color: '#9D2C8F', menu: 'mas', grupo: 'Cultura y ocio', nueva: false },
  { nombre: 'Espectáculos', ranura: 'espectaculos', color: '#C0258F', menu: 'mas', grupo: 'Cultura y ocio', nueva: true },
  { nombre: 'Turismo', etiqueta: 'Turismo y gastronomía', ranura: 'turismo', color: '#5E3729', menu: 'mas', grupo: 'Cultura y ocio', nueva: true },
  { nombre: 'Ambiente', etiqueta: 'Ambiente y clima', ranura: 'ambiente', color: '#006516', menu: 'mas', grupo: 'Sociedad', nueva: true },
  { nombre: 'Argentina', ranura: 'argentina', color: '#4B5563', menu: 'mas', grupo: 'Sociedad', nueva: false },
];

export const NOMBRES_NUEVOS = SECCIONES_NUEVAS.map((s) => s.nombre);

/** Los nombres viejos que todavía pueden aparecer en notas guardadas → el del mapa. */
export const DE_VIEJA_A_NUEVA = { Servicios: 'Balcarce', País: 'Argentina', Región: 'Argentina' };

/** El texto de cada sección para la lectura con IA (reemplazaría el de ingesta/lectura-ia.mjs). */
export const TEXTO_PARA_LA_FICHA = {
  Balcarce: 'lo que pasa en la ciudad y no tiene una sección más precisa: vecinos, instituciones y clubes (lo no deportivo), obras, comercios de acá, y lo práctico: cortes de luz o agua, trámites, tasas, horarios, tarifas y subsidios de servicios públicos.',
  Política: 'el Concejo, el intendente, el gobierno provincial y nacional, leyes, elecciones, la Cancillería y Malvinas.',
  Policiales: 'delitos, accidentes de tránsito, incendios, bomberos, policía, estafas y prevención.',
  Educación: 'escuelas, jardines, docentes y paros docentes, universidades y la Facultad, becas, inscripciones, el ciclo lectivo.',
  Salud: 'hospitales, salas, vacunas, enfermedades y brotes, PAMI, IOMA, obras sociales y prepagas (lo que cubren), salud mental, zoonosis y campañas de prevención.',
  Fútbol: 'el fútbol, de la liga de Balcarce a la Selección y los clubes argentinos.',
  Deportes: 'todos los demás deportes (básquet, hockey, rugby, tenis, boxeo, atletismo, ciclismo, Juegos Bonaerenses…), salvo el automovilismo.',
  Automovilismo: 'autos de carrera (TC, Turismo Nacional, Fórmula 1, MotoGP, karting, rally), el autódromo Juan Manuel Fangio y Fangio. Nunca Deportes ni Turismo.',
  Agro: 'campo, papa, ganadería, granos, maquinaria agrícola, el INTA y la Facultad cuando es producción, clima para el productor.',
  Economía: 'precios, inflación, dólar, salarios y jubilaciones, empleo, empresas, combustibles, consumo.',
  Ciencia: 'investigación y descubrimientos: química, biología, física, investigación biomédica, espacio y astronomía, paleontología, ambiente y cambio climático como ciencia (no el pronóstico de todos los días), CONICET, universidades e INTA cuando es ciencia (no producción), premios científicos.',
  Tecnología: 'tecnología e inteligencia artificial (se lee «Tecnología e IA»): IA (ChatGPT, Gemini, OpenAI…), empresas tecnológicas, celulares y aplicaciones, ciberseguridad, robots, videojuegos y redes. No las guías de uso ni las ofertas.',
  'Cultura y agenda': 'la cultura de acá (Teatro Municipal, Casa del Bicentenario, museos, talleres, fiestas, artistas locales) y libros, arte, teatro, música y patrimonio.',
  Espectáculos: 'televisión, streaming, cine, recitales y giras de artistas de afuera, premios del espectáculo. No chimentos (vida privada de famosos).',
  Turismo: 'turismo y gastronomía: escapadas, fines de semana largos, ocupación, la Fiesta del Postre, las sierras, restaurantes y productos de la zona.',
  Ambiente: 'ambiente y clima: alertas meteorológicas, temporales, inundaciones, sequía, incendios forestales, residuos y reciclaje, árboles, fauna. El pronóstico de todos los días NO es una nota (está /clima).',
  Argentina: 'lo nacional que no entra en ninguna de las anteriores (sociedad, transporte, trámites nacionales, la Iglesia, grandes hechos).',
};

/** Las secciones que podría elegir la IA con el mapa nuevo. */
export const SECCIONES_DE_LA_FICHA_NUEVAS = [...NOMBRES_NUEVOS];

// ------------------------------------------------------------- palabras

// Por sección: `firmes` (deciden desde el título o la bajada), `debiles`
// (sólo desde el título y si no hay nada firme) y `contras` (frases que, si
// están, anulan la sección para esa nota).
export const PALABRAS_NUEVAS = {
  Educación: {
    firmes: ['escuela', 'escuelas', 'escolar', 'escolares', 'docente', 'docentes', 'paro docente', 'alumnos', 'alumnas',
      'estudiantes', 'estudiante', 'estudiantil', 'universidad', 'universidades', 'universitario', 'universitaria', 'facultad',
      'jardín de infantes', 'jardin de infantes', 'secundaria', 'secundarias', 'secundario', 'secundarios', 'educación', 'educacion',
      'educativo', 'educativa', 'educativos', 'ciclo lectivo', 'diplomatura', 'tecnicatura', 'egresados', 'egresadas',
      'progresar', 'suteba', 'udocba', 'consejo escolar', 'asociación de maestros', 'asociacion de maestros', 'unmdp', 'uba', 'utn', 'unicen',
      'acreditación académica', 'acreditacion academica', 'oficios'],
    debiles: ['clases', 'colegio', 'primaria', 'maestros', 'maestras', 'aulas', 'aula', 'becas', 'esi', 'inscripción', 'inscripcion', 'jardín', 'jardin', 'técnica', 'tecnica'],
    contras: ['colegio de abogados', 'colegio de escribanos', 'colegio de martilleros', 'colegio médico', 'colegio medico', 'clases de cocina',
      'clase media', 'river y estudiantes', 'conmebol', 'verificación técnica', 'verificacion tecnica', 'educación vial', 'educacion vial', 'elecciones primarias', 'atención primaria', 'atencion primaria', 'estudiantes de la plata', 'escuela de fútbol', 'escuela de futbol',
      // 17/10 (regla 215, con las notas del 16/10): "Estudiantes" es también un club. Con estas palabras la nota es de fútbol.
      'afa', 'supercopa', 'libertadores', 'sudamericana', 'campeón de américa', 'campeon de america', 'paquetá', 'paqueta', 'clausura', 'torneo apertura',
      'liga profesional', 'bombonera', 'tarjeta roja', 'roja para', 'roja a'],
  },
  Salud: {
    firmes: ['salud', 'hospital', 'hospitales', 'médico', 'medico', 'médicos', 'medicos', 'médica', 'vacuna', 'vacunas', 'vacunación', 'vacunacion',
      'sarampión', 'sarampion', 'dengue', 'gripe', 'influenza', 'bronquiolitis', 'hepatitis', 'cáncer', 'cancer', 'oncológico', 'oncologico',
      'mamografías', 'mamografias', 'mes rosa', 'pami', 'ioma', 'obra social', 'obras sociales', 'prepaga', 'prepagas', 'clínica', 'clinica',
      'clínicas', 'clinicas', 'pacientes', 'anmat', 'medicamento', 'medicamentos', 'enfermedad', 'enfermedades', 'epidemiológico',
      'epidemiologico', 'zoonosis', 'castraciones', 'lalcec', 'trasplante', 'cirugía', 'cirugia', 'quirúrgica', 'quirurgica', 'quirófano', 'quirofano',
      'terapéuticos', 'terapeuticos', 'fisiatría', 'fisiatria', 'enfermería', 'enfermeria', 'celíacas', 'celiacas', 'celíacos', 'celiacos',
      'estudios clínicos', 'estudios clinicos', 'salud mental', 'antiofídico', 'antiofidico', 'donantes', 'diabetes', 'alzheimer', 'rabia humana'],
    debiles: ['virus', 'brote', 'brotes', 'tratamiento', 'síntomas', 'sintomas', 'rabia', 'nutrición', 'nutricion'],
    contras: ['carne vacuna', 'vacunos', 'salud financiera', 'salud de la economía', 'salud de la economia', 'salud fiscal',
      // 17/10 (etapa 2, con las notas reales): la salud de UNA persona famosa y lo político del hospital no son la sección.
      'por su salud', 'papa león', 'papa leon', 'comisión de salud', 'comision de salud', 'tribunal de cuentas',
      // 17/10 (regla 215): la salud de una persona famosa (un futbolista operado, una internación, un juicio) es chimento o deportes.
      'cómo sigue la salud', 'como sigue la salud', 'estado de salud de', 'parte médico', 'parte medico', 'internaron a',
      'afectó su salud', 'afecto su salud', 'juicio por la muerte'],
  },
  Ciencia: {
    firmes: ['ciencia', 'científico', 'cientifico', 'científicos', 'cientificos', 'científica', 'cientifica', 'investigadores',
      'investigadora', 'conicet', 'conae', 'nasa', 'telescopio', 'astronomía', 'astronomia', 'astrónomos', 'astronomos', 'exoplaneta',
      'galaxia', 'asteroide', 'eclipse', 'meteorito', 'agujero negro', 'fósil', 'fosil', 'fósiles', 'fosiles', 'dinosaurio',
      'paleontólogos', 'paleontologos', 'paleontología', 'paleontologia', 'arqueólogos', 'arqueologos', 'arqueología', 'arqueologia',
      'neandertal', 'nuevas especies', 'adn', 'genoma', 'premio nobel', 'nobel', 'cohete', 'astronauta',
      'estación espacial', 'estacion espacial', 'saturno', 'júpiter', 'jupiter', 'marte', 'biólogos', 'biologos', 'bióloga', 'biologa',
      'cuántica', 'cuantica', 'cuántico', 'cuantico', 'investigación científica', 'investigacion cientifica', 'satélite', 'satelite',
      // Química, biología, física, geología y ambiente como ciencia (regla 215, Hernán: "química, biología, investigación").
      'química', 'quimica', 'químico', 'quimico', 'químicos', 'quimicos', 'biología', 'biologia', 'biológico', 'biologico',
      'biológica', 'biologica', 'molécula', 'molecula', 'moléculas', 'moleculas', 'bacteria', 'bacterias', 'microbioma',
      'genética', 'genetica', 'genético', 'genetico', 'neurociencia', 'neurociencias', 'células madre', 'celulas madre',
      'ecosistema', 'ecosistemas', 'biodiversidad', 'cambio climático', 'cambio climatico', 'calentamiento global',
      'especies en peligro', 'estudio científico', 'estudio cientifico', 'revista nature', 'revista science', 'física', 'fisica',
      'partículas', 'particulas', 'superconductor', 'nanotecnología', 'nanotecnologia', 'james webb', 'geología', 'geologia',
      'geólogos', 'geologos', 'microscopio', 'microorganismos'],
    debiles: ['investigador', 'descubren', 'descubrimiento', 'laboratorio', 'universo', 'luna', 'cerebro', 'especie', 'especies',
      'hallazgo', 'descubrieron', 'investigación', 'investigacion'],
    contras: ['a ciencia cierta', 'miss universo', 'luna de miel', 'investigadores de la causa', 'investigadores judiciales', 'ciencias económicas', 'ciencias economicas',
      'industria química', 'industria quimica', 'ataque químico', 'ataque quimico', 'arma química', 'arma quimica', 'armas químicas', 'armas quimicas',
      'arma biológica', 'arma biologica', 'ecosistema emprendedor', 'ecosistema empresarial', 'ecosistema digital', 'ecosistema de negocios',
      'química entre', 'quimica entre', 'física y mental', 'fisica y mental'],
  },
  Tecnología: {
    firmes: ['tecnología', 'tecnologia', 'tecnológica', 'tecnologica', 'tecnológico', 'tecnologico', 'inteligencia artificial', 'chatgpt', 'openai', 'anthropic',
      'deepseek', 'nvidia', 'machine learning', 'modelo de lenguaje', 'chatbot', 'ciberseguridad', 'ciberataque', 'hackeo', 'hackers',
      'whatsapp', 'iphone', 'android', 'smartphone', 'samsung', 'microsoft', 'google', 'videojuego', 'videojuegos', 'playstation',
      'xbox', 'nintendo', 'software', 'starlink', 'robot', 'robots', 'robótica', 'robotica', 'humanoide', 'semiconductores',
      'algoritmo', 'digitalización', 'digitalizacion', 'automatización', 'automatizacion', 'fibra óptica', 'fibra optica',
      'punto digital', 'plataforma digital', 'streaming de audio', 'audiolibros',
      // La IA (regla 215, Hernán: "tecnología, IA"): sus nombres propios y sus frases, firmes; "ia" suelta sigue siendo débil.
      'ia generativa', 'modelos de ia', 'agentes de ia', 'inteligencia artificial generativa', 'gpt', 'llm', 'robotaxi', 'robotaxis',
      'ciberdelito', 'ciberdelitos', 'criptomoneda', 'criptomonedas', 'bitcoin', 'blockchain', 'realidad virtual'],
    debiles: ['ia', 'gemini', 'claude', 'copilot', 'grok', 'celular', 'celulares', 'app', 'aplicación', 'aplicacion', 'internet', 'chip', 'chips', 'spotify'],
    contras: ['transporte de aplicaciones', 'robo de celular', 'robaron un celular', 'robaron el celular'],
  },
  Espectáculos: {
    firmes: ['netflix', 'disney', 'hbo', 'prime video', 'streaming', 'película', 'pelicula', 'estreno', 'actor', 'actriz', 'cantante',
      'recital', 'recitales', 'gran hermano', 'masterchef', 'televisión', 'television', 'telefe', 'rating', 'premios oscar', 'grammy',
      'martín fierro', 'martin fierro', 'famosos', 'influencer', 'tráiler', 'trailer', 'documental', 'reality', 'cantautor',
      'conductor de televisión', 'conductora de televisión', 'u2', 'slipknot', 'robbie williams', 'fito páez', 'fito paez', 'charly garcía', 'charly garcia', 'ratones paranoicos'],
    debiles: ['serie', 'show', 'gira', 'oscar', 'álbum', 'album', 'disco', 'cine'],
    contras: ['conductor ebrio', 'conductor alcoholizado', 'serie de robos', 'conductora alcoholizada', 'disco de freno', 'programa de gobierno', 'programa provincial', 'programa nacional'],
  },
  Turismo: {
    firmes: ['turismo', 'turistas', 'turístico', 'turistico', 'turística', 'turistica', 'turísticos', 'turisticos', 'escapada', 'escapadas',
      'fin de semana largo', 'ocupación hotelera', 'ocupacion hotelera', 'gastronomía', 'gastronomia', 'gastronómico', 'gastronomico',
      'restaurante', 'restaurantes', 'fiesta del postre', 'fiesta nacional del postre', 'balneario', 'balnearias', 'balnearios',
      'temporada de verano', 'previaje', 'cervecería', 'cerveceria', 'feria internacional de turismo', 'unidad turística', 'unidad turistica'],
    debiles: ['vacaciones', 'reservas', 'hotel', 'hoteles', 'sierras', 'receta', 'cocina', 'vino', 'vinos', 'bodega', 'paraje', 'visitantes'],
    contras: ['transporte público', 'transporte publico', 'turismo carretera', 'turismo nacional', 'turismo pista', 'tc pista', 'receta médica', 'receta medica', 'receta electrónica', 'receta electronica'],
  },
  Ambiente: {
    firmes: ['medio ambiente', 'ambiental', 'ambientales', 'cambio climático', 'cambio climatico', 'calentamiento global', 'contaminación',
      'contaminacion', 'reciclaje', 'ecopunto', 'ecopuntos', 'residuos', 'basural', 'incendio forestal', 'incendios forestales',
      'sequía', 'sequia', 'inundación', 'inundacion', 'inundaciones', 'crecida', 'temporal', 'tormenta', 'tormentas',
      'alerta amarilla', 'alerta naranja', 'alerta roja', 'alerta por lluvias', 'servicio meteorológico', 'servicio meteorologico', 'smn', 'granizo',
      'ola de calor', 'heladas', 'fuertes vientos', 'fuerte viento', 'ráfagas', 'rafagas', 'glaciar', 'glaciares', 'biodiversidad', 'humedales',
      'forestación', 'forestacion', 'forestan', 'arbolado', 'geoparque', 'parque nacional', 'reserva natural', 'algas', 'arsénico', 'arsenico',
      'pronóstico', 'pronostico', 'pronostican', 'máxima de', 'maxima de'],
    debiles: ['clima', 'lluvias', 'lluvia', 'viento', 'fauna', 'árboles', 'arboles', 'jabalíes', 'jabalies'],
    contras: ['clima político', 'clima politico', 'clima de negocios', 'clima electoral', 'clima social', 'temporal de la economía', 'para el productor', 'área agrícola', 'area agricola', 'región agrícola', 'region agricola'],
  },
  'Cultura y agenda': {
    firmes: ['teatro', 'teatro municipal', 'museo', 'libro', 'libros', 'escritor', 'escritora', 'poesía', 'poesia', 'biblioteca', 'feria del libro',
      'orquesta', 'coro', 'danza', 'folclore', 'folklore', 'malambo', 'peña', 'payador', 'artista', 'artistas', 'casa del bicentenario',
      'concierto', 'festival', 'pintura', 'murga', 'murgas', 'comparsas', 'tango', 'fanzine', 'mural', 'patrimonio', 'literario', 'literaria',
      'cortometraje', 'cortometrajes', 'musical', 'unipersonal', 'obra de teatro', 'espectáculo', 'espectaculo'],
    debiles: ['muestra', 'exposición', 'exposicion', 'taller', 'humor', 'música', 'musica', 'arte'],
    contras: ['teatro de operaciones', 'muestra de sangre', 'la muestra nacional'],
  },
  Política: {
    firmes: ['concejo deliberante', 'concejales', 'concejal', 'intendente', 'intendenta', 'ordenanza', 'legislatura', 'senado', 'diputados',
      'senadores', 'candidatura', 'elecciones', 'gobernador', 'canciller', 'cancillería', 'cancilleria', 'malvinas', 'congreso', 'bloque',
      'oficialismo', 'oposición', 'oposicion'],
    debiles: ['concejo'],
    contras: ['operativo de documentación', 'operativo de documentacion', 'operativo de dni', 'en el concejo deliberante funciona', 'dni'],
  },
  Policiales: {
    firmes: ['robo', 'robos', 'robar', 'robaron', 'roban', 'ladrones', 'ladrón', 'ladron', 'detenido', 'detenidos', 'detuvieron', 'aprehendido', 'aprehenden',
      'choque', 'colisión', 'colision', 'accidente', 'estafa', 'estafas', 'incendio', 'policía', 'policia', 'policial', 'alcoholemia', 'persecución',
      'persecucion', 'allanamiento', 'comando de prevención rural', 'comando de prevencion rural', 'cpr', 'infraccionan', 'infracción', 'infraccion',
      'atropellaron', 'atropelló', 'imputado'],
    debiles: ['denuncia', 'seguridad'],
    contras: ['seguridad social', 'seguridad alimentaria', 'incendio forestal', 'incendios forestales', 'educación vial', 'educacion vial'],
  },
  Deportes: {
    firmes: ['boxeo', 'boxeador', 'juegos bonaerenses', 'atletismo', 'ciclistas', 'ciclismo', 'maratón', 'maraton', 'gimnasia artística',
      'gimnasia artistica', 'newcom', 'hockey', 'básquet', 'basquet', 'vóley', 'voley', 'rugby', 'pádel', 'padel', 'tenis de mesa', 'natación',
      'natacion', '10k', 'supermediano', 'campeón argentino', 'campeon argentino', 'campeón nacional', 'campeon nacional', 'podio'],
    debiles: ['torneo', 'carrera', 'campeonato', 'final provincial'],
    contras: ['malambo', 'carrera de grado', 'carrera universitaria', 'carrera docente', 'carrera hacia la onu', 'carrera para liderar'],
  },
  Fútbol: {
    firmes: ['fútbol', 'futbol', 'liga balcarceña', 'liga balcarcena', 'champions league', 'selección argentina', 'seleccion argentina', 'messi', 'scaloni', 'torneo clausura', 'torneo apertura', 'liga profesional', 'copa argentina', 'libertadores', 'sudamericana', 'boca juniors', 'river plate', 'san lorenzo', 'mundial 2026'],
    debiles: [],
    contras: ['mural de messi', 'básquet', 'basquet', 'hockey', 'vóley', 'voley', 'rugby', 'los pumas', 'las leonas', 'handball', 'futsal'],
  },
  Economía: {
    firmes: ['anses', 'jubilaciones', 'jubilados', 'nafta', 'combustibles', 'inflación', 'inflacion', 'dólar', 'dolar', 'salarios', 'paritarias',
      'desocupación', 'desocupacion', 'puestos de trabajo', 'despidos', 'créditos hipotecarios', 'creditos hipotecarios'],
    debiles: ['precios'],
    contras: [],
  },
};

// Qué secciones pueden "llevarse" una nota que hoy está en cada sección, en
// orden de preferencia cuando empatan. Las que no están (Fútbol, Automovilismo,
// Policiales) no se tocan: ya son precisas.
export const PUEDEN_LLEVARSE = {
  // Balcarce es el cajón de sastre de lo de acá: es la que más reparte.
  Balcarce: ['Policiales', 'Educación', 'Salud', 'Política', 'Deportes', 'Fútbol', 'Ambiente', 'Turismo', 'Cultura y agenda', 'Ciencia', 'Tecnología', 'Economía'],
  // Argentina, el de lo nacional.
  Argentina: ['Salud', 'Educación', 'Ciencia', 'Ambiente', 'Tecnología', 'Turismo', 'Espectáculos', 'Política', 'Economía', 'Cultura y agenda'],
  // Cultura y agenda se parte en tres: lo de afuera de la tele y los recitales, y el turismo.
  'Cultura y agenda': ['Espectáculos', 'Turismo', 'Ambiente', 'Deportes', 'Educación', 'Salud', 'Ciencia', 'Tecnología'],
  Tecnología: ['Ciencia'],
  Agro: ['Ciencia'],
  Política: ['Educación', 'Salud'],
  Economía: ['Turismo', 'Tecnología', 'Ciencia'],
  Deportes: ['Fútbol'],
};

// De las secciones que ya son temáticas (no los cajones Balcarce, Argentina y
// Cultura) una nota se va sólo con una palabra FIRME en el TÍTULO.
const CAJONES = new Set(['Balcarce', 'Argentina', 'Cultura y agenda']);

// Lo de acá nunca es Espectáculos: un show en la Casa del Bicentenario es Cultura.
const SOLO_DE_AFUERA = new Set(['Espectáculos']);

// La música y los shows de afuera son Espectáculos aunque la palabra sea de Cultura ("Iván Noble llega con un show
// que revisita su historia musical"); los de acá, Cultura.
export const MUSICA_Y_SHOWS = ['musical', 'concierto', 'festival', 'artista', 'artistas', 'espectáculo', 'espectaculo', 'música', 'musica'];

// Lo de Agro va a Ciencia sólo si no habla de producción.
const PALABRAS_DE_PRODUCCION = ['siembra', 'cosecha', 'trigo', 'soja', 'maíz', 'maiz', 'ganado', 'ganadería', 'ganaderia', 'hacienda', 'papa', 'remate', 'cultivo', 'novillos', 'semillas', 'fertilizantes', 'plagas', 'productores'];

// ------------------------------------------------------------- la búsqueda

/** Sin tildes, en minúscula, sólo letras, números y espacios. */
export function normalizar(s = '') {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Palabras de cinco letras o más que igual se buscan enteras ("marte" no es "martes").
export const ENTERAS = new Set(['marte', 'salud', 'tecnica', 'nobel', 'cohete', 'robos', 'clases']);
const CACHE = new Map();

/** ¿Está esa palabra (o frase) entera en el texto ya normalizado? Hasta tres letras de más al final desde las cinco letras. */
export function contiene(texto, palabra) {
  let re = CACHE.get(palabra);
  if (!re) {
    const p = normalizar(palabra);
    const cola = p.length >= 5 && !ENTERAS.has(p) ? '\\w{0,3}' : '';
    re = new RegExp(`\\b${p.replace(/\s+/g, '\\s+')}${cola}\\b`);
    CACHE.set(palabra, re);
  }
  return re.test(texto);
}

/** El texto de cada parte de la nota: título, bajada (copete o el comienzo del cuerpo). */
function partes(nota = {}) {
  const titulo = normalizar(nota.titulo);
  const bajada = normalizar(nota.copete || nota.bajada || String(nota.cuerpo ?? nota.resumenFuente ?? '').slice(0, 300));
  return { titulo, bajada, todo: `${titulo} ${bajada}` };
}

/** ¿Es de acá? La marca que dejó el sistema (`local`, `alcance`), o la sección Balcarce. */
const esDeAca = (nota) => !!nota.local || nota.alcance === 'local' || nota.seccion === 'Balcarce';

/**
 * Qué tan bien encaja la nota en una sección: 3 = firme en el título,
 * 2 = firme en la bajada, 1 = débil en el título, 0 = nada (o una contra).
 */
export function encaje(nota, seccion, texto = partes(nota)) {
  const p = PALABRAS_NUEVAS[seccion];
  if (!p) return { puntos: 0, palabra: null };
  if (p.contras.some((c) => contiene(texto.todo, c))) return { puntos: 0, palabra: null, contra: true };
  const largo = (a, b) => b.length - a.length;
  const enTitulo = p.firmes.filter((w) => contiene(texto.titulo, w)).sort(largo)[0];
  if (enTitulo) return { puntos: 3, palabra: enTitulo };
  // En la bajada una sola palabra engaña (la bajada de una entrevista nombra "el paro docente" de pasada):
  // hacen falta dos firmes distintas, o una firme en la bajada y una débil en el título.
  const enBajada = p.firmes.filter((w) => contiene(texto.bajada, w)).sort(largo);
  const debil = p.debiles.filter((w) => contiene(texto.titulo, w)).sort(largo)[0];
  // Distintas de verdad: "paro docente" y "docente" son una sola; "escuela" y "escuelas", también.
  const planas = [...new Set(enBajada.map((w) => normalizar(w).slice(0, 6)))].map((r) => enBajada.find((w) => normalizar(w).startsWith(r)));
  const distintas = planas.filter((w) => !planas.some((o) => o !== w && normalizar(o).includes(normalizar(w).slice(0, 6))));
  if (distintas.length >= 2 || (enBajada.length && debil)) return { puntos: 2, palabra: enBajada[0] };
  if (debil) return { puntos: 1, palabra: debil };
  return { puntos: 0, palabra: null };
}

/**
 * La sección del mapa nuevo para una nota que ya tiene la sección de hoy.
 * Devuelve { seccion, antes, motivo, palabra, puntos, duda, aviso }.
 *   · `duda`: true si otra sección encajaba igual de bien, o si decidió una
 *     palabra de la bajada o una débil: son las que hay que mirar a mano.
 *   · `aviso`: algo que el mapa dice que no debería ser nota (el pronóstico).
 * Con `entre` sólo se consideran esas secciones como destino (producción mira sólo las activas: un empate con una que sigue en
 * sombra, como Ambiente, no frena a Ciencia); sin `entre`, todas las del mapa (la medición en sombra).
 */
export function seccionNueva(nota = {}, { entre = null } = {}) {
  const antes = nota.seccion ?? null;
  const base = DE_VIEJA_A_NUEVA[antes] ?? antes ?? (esDeAca(nota) ? 'Balcarce' : 'Argentina');
  const texto = partes(nota);
  const deAca = esDeAca(nota);
  const candidatas = (PUEDEN_LLEVARSE[base] ?? []).filter((s) => !(SOLO_DE_AFUERA.has(s) && deAca)).filter((s) => !entre || entre.includes(s));
  const resultados = candidatas.map((s, orden) => ({ s, orden, ...encaje(nota, s, texto) }))
    .filter((r) => r.puntos >= (CAJONES.has(base) ? 1 : 3))
    .filter((r) => !(r.s === 'Ciencia' && base === 'Agro' && PALABRAS_DE_PRODUCCION.some((w) => contiene(texto.todo, w))));
  // Una débil sólo cuenta si nadie encontró una firme.
  const hayFirme = resultados.some((r) => r.puntos >= 2);
  const validos = resultados.filter((r) => (hayFirme ? r.puntos >= 2 : true))
    .sort((a, b) => b.puntos - a.puntos || b.palabra.length - a.palabra.length || a.orden - b.orden);

  const aviso = contiene(texto.titulo, 'pronostico') || /\b(maxima|minima)s? de\b/.test(texto.titulo) || /\bel (lunes|martes|miercoles|jueves|viernes|sabado|domingo) (llega|presenta|se presenta|muestra)\b/.test(texto.titulo)
    ? 'parece un pronóstico del tiempo: según el criterio no es una nota (está /clima)' : null;

  // De una sección temática (Política, Agro…) no se va si dos secciones empatan: queda donde estaba.
  const empatan = validos[1] && validos[1].puntos === validos[0].puntos;
  let gana = empatan && !CAJONES.has(base) ? null : validos[0];
  if (gana?.s === 'Cultura y agenda' && !deAca && MUSICA_Y_SHOWS.includes(gana.palabra)) gana = { ...gana, s: 'Espectáculos' };
  if (!gana) return { seccion: base, antes, motivo: base === antes ? 'queda donde estaba' : `cambia de nombre (${antes} → ${base})`, palabra: null, puntos: 0, duda: false, aviso };
  const empate = empatan;
  return {
    seccion: gana.s,
    antes,
    motivo: `${gana.puntos === 3 ? 'firme en el título' : gana.puntos === 2 ? 'firme en la bajada' : 'débil en el título'}: "${gana.palabra}"`,
    palabra: gana.palabra,
    puntos: gana.puntos,
    duda: gana.puntos < 3 || !!empate,
    alternativa: empate ? validos[1].s : null,
    aviso,
  };
}

// ------------------------------------------------------------- las secciones que se suman (activas desde el 17/10/2026)
//
// Desde el 17/10/2026 (regla 215; antes, regla 187 detrás del interruptor SECCIONES_NUEVAS, que se sacó) el sitio tiene tres
// secciones más: Educación, Salud y Ciencia. Hernán: "me interesa mucho que haya notas de tecnología, IA, química, biología,
// investigación, educación, culturales… Todas las secciones tienen que tener notas todos los días". Tecnología se lee "Tecnología
// e IA" (la clave sigue siendo Tecnología). El resto del mapa (Espectáculos, Turismo, Ambiente) sigue en sombra: lo de Espectáculos
// va dentro de Cultura y agenda. Lo usan web/lib/datos.js (el sitio), ingesta/ingesta.mjs (`clasificar`), ingesta/lectura-ia.mjs
// (la ficha de la IA) y web/scripts/generar-datos.mjs.

/** Las secciones del mapa que están activas (se suman a las once de siempre). */
export const SECCIONES_SUMADAS = ['Educación', 'Salud', 'Ciencia'];

/** Sus datos (ranura, color, grupo), sacados del mapa para no escribirlos dos veces. */
export const DATOS_SUMADAS = SECCIONES_SUMADAS.map((n) => SECCIONES_NUEVAS.find((s) => s.nombre === n));

/** A dónde puede mandar una nota el clasificador de producción: las tres nuevas y Tecnología e IA (la IA, los celulares, la ciberseguridad). */
export const DESTINOS_ACTIVOS = [...SECCIONES_SUMADAS, 'Tecnología'];

/** ¿Es una de las secciones que se suman? */
export const esSumada = (seccion) => SECCIONES_SUMADAS.includes(seccion);

/** Cómo se lee cada sección (la clave de las notas no cambia): "Tecnología e IA", "Cultura". */
export const ETIQUETAS_DE_SECCION = Object.fromEntries(SECCIONES_NUEVAS.filter((s) => s.etiqueta).map((s) => [s.nombre, s.etiqueta]));

/** Secciones de las que no se lleva nada el clasificador: esperan a una persona en todas las piezas de redes (CLAUDE.md). */
const NO_SE_TOCAN = new Set(['Política', 'Policiales']);

/** ¿La sección de esta nota la decidió una persona? Lo que corrigió o publicó una persona no se toca. */
function laDecidioUnaPersona(nota) {
  const por = String(nota?.publicadaPor ?? '').trim();
  return !!nota?.corregidaAMano || (!!por && !/^(ia|m[aá]quina)$/i.test(por) && !/autom[aá]tica/i.test(por));
}

/**
 * La sección del mapa (Educación, Salud, Ciencia o Tecnología e IA) que le toca a una nota, o null si se queda donde está.
 * Usa `seccionNueva` tal cual (parte de la sección de hoy, las contras, la débil sólo desde el título), mirando sólo los destinos
 * activos (DESTINOS_ACTIVOS: lo que sigue en sombra no frena a lo activo), y acepta el cambio sólo si:
 *   · lo que gana es una de esas cuatro;
 *   · decidió algo firme: una firme en el título, o en la bajada dos firmes distintas o una firme con una débil en el título.
 *     Una débil sola no alcanza, y en la bajada una débil no cuenta nunca;
 *   · no empata con otra sección;
 *   · no sale de Política ni de Policiales (esperan a una persona en las redes);
 *   · no es una nota propia (dólar, clima, repasos…) ni la decidió una persona.
 * No cambia la dirección: /nota/<slug>-<id> no lleva la sección (web/lib/ruta.js).
 */
export function seccionSumada(nota = {}) {
  if (!nota?.seccion || nota.propia || NO_SE_TOCAN.has(nota.seccion) || laDecidioUnaPersona(nota)) return null;
  const r = seccionNueva(nota, { entre: DESTINOS_ACTIVOS });
  if (!DESTINOS_ACTIVOS.includes(r.seccion) || r.seccion === nota.seccion) return null;
  if (r.puntos < 2 || r.alternativa) return null;
  return { seccion: r.seccion, antes: nota.seccion, motivo: r.motivo };
}

/** El reparto: cuántas notas en cada sección nueva, y de dónde vinieron. */
export function repartir(notas = []) {
  const porSeccion = Object.fromEntries(NOMBRES_NUEVOS.map((s) => [s, 0]));
  const matriz = {};
  const clasificadas = notas.map((n) => ({ nota: n, r: seccionNueva(n) }));
  for (const { nota, r } of clasificadas) {
    porSeccion[r.seccion] = (porSeccion[r.seccion] ?? 0) + 1;
    const a = nota.seccion ?? '(sin sección)';
    (matriz[a] ??= {})[r.seccion] = (matriz[a][r.seccion] ?? 0) + 1;
  }
  return { porSeccion, matriz, clasificadas };
}

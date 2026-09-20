// Fuentes de Radar Balcarce.
// Este archivo es el que se toca para ir puliendo el medio: agregar, sacar
// o cambiar el peso de una fuente no requiere tocar el resto del código.

export const BALCARCE = {
  lat: -37.8459,
  lon: -58.2557,
  tz: 'America/Argentina/Buenos_Aires',
};

// tipo: 'rss' | 'atom' | 'scrape'
// alcance: 'local' | 'region' | 'provincia' | 'pais'
// peso: cuánto suma a la relevancia cuando la noticia viene de acá
export const FUENTES = [
  {
    id: 'newsbalcarce',
    nombre: 'News Balcarce',
    medio: 'News Balcarce (FM 91.7)',
    url: 'https://newsbalcarce.com.ar/?feed=rss2',
    tipo: 'rss',
    alcance: 'local',
    peso: 30,
    nota: 'Trae texto completo e imagen. El /feed clásico devuelve 404.',
    temas: ['actualidad', 'política', 'policiales', 'educación', 'deportes'],
  },
  {
    id: 'puntonueve',
    nombre: 'Puntonueve',
    medio: 'Puntonueve (FM 100.9)',
    url: 'https://puntonueve.com.ar/feed',
    tipo: 'rss',
    alcance: 'local',
    peso: 30,
    nota: 'Solo resumen y sin imagen, pero es el más rápido en avisar.',
    temas: ['actualidad', 'alertas'],
  },
  {
    id: 'informeseprimero',
    nombre: 'Infórmese Primero',
    medio: 'Infórmese Primero (FM 104.9)',
    url: 'http://feeds.feedburner.com/informeseprimero',
    tipo: 'atom',
    alcance: 'local',
    peso: 30,
    nota: 'Blogger vía FeedBurner. Texto completo, imagen y autor.',
    temas: ['ciudad', 'policiales', 'tránsito', 'deportes', 'opinión'],
  },
  {
    id: 'gabal-comunidad',
    nombre: 'Radio Gabal · Comunidad',
    medio: 'Radio Gabal (FM 104.1)',
    url: 'https://www.radiogabal.com.ar/index.php/comunidad?format=feed&type=rss',
    tipo: 'rss',
    alcance: 'local',
    peso: 28,
    seccion: 'Balcarce',
    temas: ['comunidad'],
  },
  {
    id: 'gabal-policiales',
    nombre: 'Radio Gabal · Policiales',
    medio: 'Radio Gabal (FM 104.1)',
    url: 'https://www.radiogabal.com.ar/index.php/policiales?format=feed&type=rss',
    tipo: 'rss',
    alcance: 'local',
    peso: 28,
    seccion: 'Policiales',
    temas: ['policiales'],
  },
  {
    id: 'gabal-politica',
    nombre: 'Radio Gabal · Política',
    medio: 'Radio Gabal (FM 104.1)',
    url: 'https://www.radiogabal.com.ar/index.php/politica?format=feed&type=rss',
    tipo: 'rss',
    alcance: 'local',
    peso: 28,
    seccion: 'Política',
    temas: ['política'],
  },
  {
    id: 'gabal-deportes',
    nombre: 'Radio Gabal · Deportes',
    medio: 'Radio Gabal (FM 104.1)',
    url: 'https://www.radiogabal.com.ar/index.php/deportes?format=feed&type=rss',
    tipo: 'rss',
    alcance: 'local',
    peso: 26,
    seccion: 'Deportes',
    temas: ['deportes'],
  },
  {
    id: 'gabal-agro',
    nombre: 'Radio Gabal · Agro',
    medio: 'Radio Gabal (FM 104.1)',
    url: 'https://www.radiogabal.com.ar/index.php/agro?format=feed&type=rss',
    tipo: 'rss',
    alcance: 'local',
    peso: 26,
    seccion: 'Agro',
    temas: ['agro'],
  },
  {
    id: 'municipio',
    nombre: 'Municipalidad de Balcarce',
    medio: 'Municipalidad de Balcarce',
    url: 'https://balcarce.gob.ar/feed/',
    tipo: 'rss',
    alcance: 'local',
    peso: 24,
    oficial: true,
    nota: 'Fuente oficial: se cita como comunicado, nunca como nota propia.',
    temas: ['oficial', 'obras', 'salud', 'agenda'],
  },
  {
    id: 'eldiario',
    nombre: 'El Diario Balcarce',
    medio: 'El Diario Balcarce',
    url: 'https://eldiariobalcarce.com.ar/',
    base: 'https://eldiariobalcarce.com.ar',
    tipo: 'scrape',
    alcance: 'local',
    peso: 28,
    nota: 'Sin feed: se lee la portada. Su sección Rural no la cubre nadie más.',
    temas: ['actualidad', 'rural', 'deportes', 'policiales'],
  },
  {
    id: 'lavanguardia',
    nombre: 'La Vanguardia',
    medio: 'Diario La Vanguardia',
    url: 'https://www.diariolavanguardia.com/',
    base: 'https://www.diariolavanguardia.com',
    // Sus notas son .../noticias/<id>-<slug>/, con el link absoluto (no
    // relativo como El Diario). Cada tarjeta trae un <h3> de bajada y un <h2>
    // con el título real: parsearScrape ya sabe preferir el <h2> si existe.
    patronEnlace: /<a[^>]+href=["']([^"']*\/noticias\/\d+-[a-z0-9-]+\/?)["'][^>]*>([\s\S]*?)<\/a>/gi,
    tipo: 'scrape',
    alcance: 'local',
    peso: 28,
    nota: 'Sin feed: se lee la portada. Único de los siete con sección Campo y Salud propias.',
    temas: ['actualidad', 'deportes', 'campo', 'salud', 'zonales'],
  },
];

// --- Nacionales y temáticas, ya probadas y vivas -------------------------
// De estas fuentes NO se toma todo: entra lo que menciona a Balcarce (siempre)
// más las `maxItems` más recientes, para tener la sección País sin inundarse.
export const FUENTES_NACIONALES = [
  {
    id: 'infobae',
    nombre: 'Infobae',
    medio: 'Infobae',
    url: 'https://www.infobae.com/arc/outboundfeeds/rss/?outputType=xml',
    tipo: 'rss',
    alcance: 'pais',
    peso: 8,
    maxItems: 6,
    temas: ['nacionales', 'general'],
  },
  {
    id: 'lanacion',
    nombre: 'La Nación',
    medio: 'La Nación',
    url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml',
    tipo: 'rss',
    alcance: 'pais',
    peso: 8,
    maxItems: 5,
    temas: ['nacionales', 'general'],
  },
  {
    id: 'clarin',
    nombre: 'Clarín · Lo último',
    medio: 'Clarín',
    url: 'https://www.clarin.com/rss/lo-ultimo/',
    tipo: 'rss',
    alcance: 'pais',
    peso: 8,
    maxItems: 5,
    temas: ['nacionales', 'general'],
  },
  {
    id: 'ole',
    nombre: 'Olé',
    medio: 'Olé',
    url: 'https://www.ole.com.ar/rss/ultimas-noticias/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Deportes',
    peso: 8,
    maxItems: 5,
    temas: ['deportes', 'fútbol'],
  },
  {
    id: 'clarin-deportes',
    nombre: 'Clarín · Deportes',
    medio: 'Clarín',
    url: 'https://www.clarin.com/rss/deportes/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Deportes',
    peso: 7,
    maxItems: 4,
    temas: ['deportes'],
  },
  {
    id: 'sendero',
    nombre: 'Sendero Regional',
    medio: 'Sendero Regional',
    url: 'https://senderomultimedios.com.ar/feed',
    tipo: 'rss',
    alcance: 'region',
    peso: 10,
    maxItems: 4,
    temas: ['región', 'agro', 'policiales', 'política'],
    nota: 'Cubre Necochea, Lobería, San Cayetano, Balcarce y Tandil. Primera fuente de región que funciona: las otras cuatro probadas (La Capital MdP, El Retrato de Hoy, 0223, La Noticia 1) fallaron.',
  },
  {
    id: 'campeones',
    nombre: 'Campeones',
    medio: 'Campeones',
    url: 'https://www.campeones.com.ar/feed/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Automovilismo',
    peso: 12, // en la ciudad de Fangio, el automovilismo pesa más
    maxItems: 6,
    temas: ['automovilismo'],
  },
  // ------------------------------------------------ deporte que no es fútbol
  //
  // Balcarce es tierra de fierros: es la ciudad de Fangio, tiene autódromo y
  // el automovilismo es de lo más leído. Pero los medios grandes cubren F1
  // sólo cuando pasa algo escandaloso, y el resto del año el hueco lo llena
  // quien quiera. Motorsport.com publica todos los días, en castellano y con
  // feed limpio: 50 notas por vuelta, de F1, MotoGP, Fórmula E y resistencia.
  //
  // Peso bajo a propósito (15): son notas de afuera, no tienen que competir
  // contra lo local. Suben solas cuando nombran a un argentino, porque la
  // regla de esRelevante suma 22 puntos si aparece Balcarce y el filtro de
  // alcance deja pasar lo que menciona a la ciudad.
  {
    id: 'motorsport-f1',
    nombre: 'Motorsport · Fórmula 1',
    medio: 'Motorsport',
    url: 'https://es.motorsport.com/rss/f1/news/',
    tipo: 'rss',
    alcance: 'pais',
    peso: 15,
    maxItems: 4,
    temas: ['automovilismo', 'formula 1'],
    nota: 'F1 en castellano, todos los días. Lo que no cubre nadie en la zona.',
  },
  {
    id: 'motorsport-motos',
    nombre: 'Motorsport · MotoGP',
    medio: 'Motorsport',
    url: 'https://es.motorsport.com/rss/motogp/news/',
    tipo: 'rss',
    alcance: 'pais',
    peso: 14,
    maxItems: 2,
    temas: ['automovilismo', 'motociclismo'],
    nota: 'MotoGP. Poco volumen a propósito: es para no tener sólo autos.',
  },
  {
    id: 'lanacion-deportes',
    nombre: 'La Nación · Deportes',
    medio: 'La Nación',
    url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/deportes/',
    tipo: 'rss',
    alcance: 'pais',
    peso: 16,
    maxItems: 3,
    temas: ['deportes'],
    nota: 'Para rugby, tenis, hockey y atletismo: lo que Olé no cubre porque va todo a fútbol.',
  },
  // ------------------------------------------------ más ojos en lo nacional
  //
  // No para llenar la portada de noticias de Buenos Aires: para no quedar
  // ciegos cuando pasa algo grande, y para agarrar lo que nombra a
  // Balcarce o a un balcarceño desde afuera (ahí el filtro de alcance deja
  // pasar todo y la relevancia suma 22 puntos).
  //
  // Pesos bajos y maxItems chicos a propósito: si empatan con lo local,
  // dejamos de ser un medio de Balcarce.
  {
    id: 'ambito',
    nombre: 'Ámbito',
    medio: 'Ámbito',
    url: 'https://www.ambito.com/rss/pages/ultimas-noticias.xml',
    tipo: 'rss',
    alcance: 'pais',
    peso: 15,
    maxItems: 3,
    temas: ['economia', 'pais'],
    nota: 'Economía y últimas noticias. Es la sección que más le pega al bolsillo.',
  },
  {
    id: 'minutouno',
    nombre: 'Minuto Uno',
    medio: 'Minuto Uno',
    url: 'https://www.minutouno.com/rss/pages/home.xml',
    tipo: 'rss',
    alcance: 'pais',
    peso: 13,
    maxItems: 3,
    temas: ['pais', 'espectaculos'],
  },
  {
    id: 'lanacion-economia',
    nombre: 'La Nación · Economía',
    medio: 'La Nación',
    url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/',
    tipo: 'rss',
    alcance: 'pais',
    peso: 15,
    maxItems: 2,
    temas: ['economia'],
  },
];

// Candidatos a probar para región, provincia, país, deportes y automovilismo.
// El probador dice cuáles están vivos; los que sirvan pasan a FUENTES.
export const CANDIDATOS = [
  // Pendientes: región y provincia. Ninguno resolvió todavía.
  // La Capital de Mar del Plata y El Retrato de Hoy devuelven 403 (bloquean
  // lectores automáticos), 0223 responde pero sin items, y La Noticia 1 no
  // publica feed: su sección de Balcarce habría que leerla de la página.
  { id: 'lacapitalmdp', nombre: 'La Capital (MdP)', url: 'https://www.lacapitalmdp.com/feed/', alcance: 'region' },
  { id: 'retratodehoy', nombre: 'El Retrato de Hoy', url: 'https://elretratodehoy.com.ar/feed/', alcance: 'region' },
  { id: '0223', nombre: '0223 (MdP)', url: 'https://www.0223.com.ar/rss/pages/home.xml', alcance: 'region' },
  { id: 'lanoticia1', nombre: 'La Noticia 1', url: 'https://www.lanoticia1.com/rss', alcance: 'provincia' },
  { id: 'pagina12', nombre: 'Página 12', url: 'https://www.pagina12.com.ar/rss/portada', alcance: 'pais' },
  { id: 'carburando', nombre: 'Carburando', url: 'https://carburando.com/feed/', alcance: 'pais' },
  { id: 'actc', nombre: 'ACTC (Turismo Carretera)', url: 'https://www.actc.org.ar/feed/', alcance: 'pais' },
];

// Palabras que hacen que una noticia sea "de Balcarce" aunque venga de afuera.
// OJO: acá sólo van nombres que no puedan aparecer por casualidad en una nota
// nacional. "El Triunfo" y "Los Pinos" son lugares de Balcarce, pero también
// frases comunes: colarlos hacía que Radar tomara por locales notas de fútbol
// europeo. Si hace falta usarlos, tiene que ser junto a "Balcarce".
export const PALABRAS_LOCALES = [
  'balcarce', 'balcarceño', 'balcarceno', 'balcarceña', 'fangio',
  'napaleofú', 'napaleofu', 'ramos otero', 'laguna la brava',
  'sierras de balcarce', 'inta balcarce', 'partido de balcarce',
  'autódromo juan manuel fangio', 'museo fangio',
];

// Clasificación por palabras. El orden importa: gana la primera que coincide.
export const REGLAS_SECCION = [
  {
    seccion: 'Automovilismo',
    palabras: ['turismo carretera', 'tc', 'tc pista', 'automovilismo', 'autódromo', 'autodromo',
      'fangio', 'karting', 'rally', 'tc2000', 'top race', 'procar', 'fórmula', 'formula 1',
      'pick up', 'motociclismo', 'motocross',
      // Los que trae Motorsport: sin esto, una nota de F1 caía en Deportes
      // por la palabra "campeonato" y se mezclaba con el fútbol local.
      'f1', 'gran premio', 'motogp', 'piloto', 'parrilla', 'pole', 'escudería',
      'escuderia', 'fórmula e', 'formula e', 'clasificación de f1', 'box', 'neumáticos'],
  },
  {
    seccion: 'Policiales',
    palabras: ['policía', 'policia', 'detenido', 'detenidos', 'robo', 'hurto', 'allanamiento',
      'fiscalía', 'fiscalia', 'homicidio', 'causa judicial', 'juzgado', 'aprehendido',
      'siniestro vial', 'choque', 'accidente'],
  },
  {
    seccion: 'Deportes',
    palabras: ['fútbol', 'futbol', 'básquet', 'basquet', 'vóley', 'voley', 'maxivoley',
      'torneo', 'campeonato', 'liga', 'partido', 'goleó', 'goleo', 'gol', 'goles',
      'playoffs', 'hockey', 'atletismo', 'maratón', 'maraton', 'árbitro', 'arbitro',
      'deportivo', 'descenso', 'selección', 'seleccion', 'copa',
      // Los que no son fútbol y suelen quedar sin cubrir en la zona.
      'rugby', 'tenis', 'ciclismo', 'mountain bike', 'running', 'triatlón',
      'triatlon', 'natación', 'natacion', 'handball', 'hándbol', 'pádel',
      'padel', 'ajedrez', 'patín', 'patin', 'las leonas', 'los pumas'],
  },
  {
    seccion: 'Cultura y agenda',
    palabras: ['teatro', 'muestra', 'espectáculo', 'espectaculo', 'concierto', 'festival',
      'exposición', 'exposicion', 'taller', 'museo', 'peña', 'feria', 'obra de teatro',
      'orquesta', 'cine'],
  },
  {
    seccion: 'Agro',
    palabras: ['agro', 'cosecha', 'siembra', 'trigo', 'soja', 'ganader', 'agropecuar',
      'inta', 'rural', 'productores', 'lluvias acumuladas', 'tambo', 'maquinaria agrícola'],
  },
  {
    seccion: 'Política',
    palabras: ['concejo deliberante', 'intendente', 'ordenanza', 'presupuesto municipal',
      'legislatura', 'diputados', 'senadores', 'elecciones', 'gobernador', 'ministerio',
      'kicillof', 'milei', 'gobierno provincial', 'paso', 'bloque', 'oposición', 'oposicion'],
  },
  {
    seccion: 'Servicios',
    palabras: ['corte de luz', 'corte de energía', 'corte de energia', 'corte de agua',
      'farmacia de turno', 'cronograma', 'licitación', 'licitacion', 'obra pública',
      'obra publica', 'asfalto', 'bacheo', 'recolección', 'recoleccion', 'tránsito',
      'transito', 'vacunación', 'vacunacion', 'desagüe', 'desague', 'pluvial'],
  },
  {
    // Sección diferencial: casi ningún medio de Balcarce cubre esto con
    // regularidad, y encaja con la identidad del pueblo (INTA Balcarce es uno
    // de los centros de investigación agropecuaria más grandes del país).
    // Hoy entra sólo por palabra clave desde las fuentes que ya leemos; el
    // día que exista un beat propio de IA/agro-tech, va acá.
    seccion: 'Tecnología',
    // Sin siglas sueltas como "IA" o "app": dan demasiados falsos positivos
    // sin el contexto de una frase completa.
    palabras: ['inteligencia artificial', 'algoritmo', 'drone', 'dron', 'satelital',
      'agricultura de precisión', 'agricultura precision', 'biotecnología', 'biotecnologia',
      'digitalización', 'digitalizacion', 'ciberseguridad', 'automatización', 'automatizacion'],
  },
];

// Semáforo editorial: qué necesita revisión humana antes de salir.
export const REGLAS_SEMAFORO = {
  // Nunca se publica. No es sólo criterio editorial: identificar a un
  // menor en un hecho policial/judicial (ley 26.061) o a una víctima de
  // violencia de género o delito sexual (ley 26.485) es ilegal para un
  // medio, no sólo de mal gusto. Ver INVESTIGACION.md, sección 6, para el
  // detalle y las fuentes. Esta lista es la red de seguridad automática:
  // el semáforo humano sigue siendo la primera línea, esto frena lo que
  // se le escape.
  rojo: ['menor de edad', 'abuso sexual', 'suicid', 'se quitó la vida',
    'violación', 'violacion', 'víctima de violencia', 'victima de violencia',
    'violencia de género', 'violencia de genero', 'femicidio', 'niño identificado',
    'niña identificada', 'abuso infantil', 'grooming'],
  // Espera aprobación.
  amarillo: ['concejo deliberante', 'intendente', 'denuncia', 'denunció', 'denuncio',
    'gremio', 'paro', 'protesta', 'reclamo', 'detenido', 'acusado', 'imputado',
    'hospital', 'muerte', 'falleció', 'fallecio', 'investigación', 'investigacion'],
  // Todo lo demás sale solo si la sección lo permite.
  verdeSecciones: ['Servicios', 'Cultura y agenda', 'Deportes', 'Automovilismo', 'Agro'],
  // Esto NO es noticia: es publicidad o promoción de otro medio. No se
  // bloquea (a veces un sorteo del club sí interesa), pero nunca sale solo:
  // el 18/09 la portada abrió con "Ganá tu entrada para el TC", que es una
  // promoción de una radio, no una noticia nuestra.
  promocional: ['sorteo', 'sortea', 'sortearemos', 'ganá tu entrada', 'gana tu entrada',
    'participá del', 'participa del', 'regala las entradas', 'promoción exclusiva',
    'promocion exclusiva', 'suscribite', 'seguinos en', 'auspicia', 'publicidad'],
};

// Argentinos que, cuando aparecen, la gente quiere leer — aunque la noticia
// no tenga nada que ver con Balcarce.
//
// El criterio para entrar acá es estrecho a propósito: tiene que ser alguien
// cuyo nombre solo alcance para que un balcarceño se detenga a leer. Si hay
// que explicar quién es, no va. Y nunca por polémica: es por logro
// deportivo o por relevancia que no se discute.
//
// Se usa en ingesta.mjs: una nota nacional que nombra a alguien de esta
// lista sube de puntaje y entra aunque no mencione a Balcarce.
export const FIGURAS = [
  // Fútbol
  'messi', 'scaloni', 'dibu martínez', 'dibu martinez', 'julián álvarez',
  'julian alvarez', 'enzo fernández', 'enzo fernandez', 'selección argentina',
  'seleccion argentina', 'la scaloneta',
  // Automovilismo — en la ciudad de Fangio esto pesa doble
  'colapinto', 'franco colapinto', 'canapino', 'agustín canapino',
  'agustin canapino', 'pechito lópez', 'pechito lopez', 'josé maría lópez',
  // Tenis
  'cerúndolo', 'cerundolo', 'báez', 'sebastián báez', 'etcheverry',
  // Básquet y otros
  'campazzo', 'facundo campazzo', 'las leonas', 'los pumas',
  // Ciclismo y atletismo, que en Balcarce tienen público propio
  'maximiliano richeze', 'belén casetta', 'belen casetta',
];

// Nombres propios de Balcarce y siglas que se repiten todo el tiempo. Sirven
// para reescribir los títulos que los medios publican EN MAYÚSCULAS sin
// perder los nombres por el camino. Es una lista a mano y se amplía: si un
// título sale mal escrito, la palabra se agrega acá.
export const NOMBRES_PROPIOS = [
  'Balcarce', 'Fangio', 'Napaleofú', 'Ramos Otero', 'San Agustín', 'Los Pinos',
  'El Triunfo', 'La Brava', 'Mar del Plata', 'Necochea', 'Tandil', 'Buenos Aires',
  'Municipalidad', 'Municipio', 'Concejo Deliberante', 'Intendente', 'Intendenta',
  'Provincia', 'Nación', 'Gobierno', 'Ejecutivo', 'Legislatura',
  'Dirección', 'Subsecretaría', 'Secretaría', 'Juventud', 'Cultura', 'Deportes',
  'Desarrollo Social', 'Salud', 'Educación', 'Producción', 'Turismo',
  'Hospital', 'Felipe Fossati', 'Policía', 'Bomberos', 'Defensa Civil',
  'Sociedad Rural', 'Cámara de Comercio', 'Cooperativa', 'Auto Club',
  'Ferroviarios', 'Balcarce Newcom', 'Las Valkyrias', 'Campo de Pato',
  'Teatro Municipal', 'Luis A. Conti', 'Museo Histórico', 'Plaza Libertad',
  'Autódromo', 'Polideportivo', 'Escuela', 'Jardín', 'Instituto',
  'Día del Estudiante', 'Día de la Primavera', 'Semana Santa',
  // Siglas: van enteras en mayúscula.
  'INTA', 'ARBAL', 'ABSA', 'EDEA', 'ANSES', 'PAMI', 'SAME', 'AFIP', 'ARCA',
  'UNMdP', 'ACA', 'TC', 'TN', 'APINTA', 'IOMA', 'PBA',
];

// Farmacias que el directorio del Colegio no lista, cargadas a mano.
//
// El cronograma de turnos las nombra igual, así que sin esto salen sin
// dirección — y una farmacia de turno sin dirección no sirve para nada: es
// justamente el dato que la persona necesita a las tres de la mañana.
//
// Las direcciones se verifican contra lo que publican los medios locales
// antes de cargarlas acá. Si aparece una nueva, el panel lo avisa en la
// pestaña "Clima y farmacias" y se agrega en esta lista.
export const FARMACIAS_A_MANO = {
  'san jose plaza': { nombre: 'San José de la Plaza', direccion: 'Av. Chaves esquina 15', telefono: null },
};

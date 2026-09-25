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
// oficial: true si es un organismo público (la Municipalidad, un ministerio,
//   la Policía), no un medio. Además de dar verde en el semáforo, cuenta para
//   el nivel de verificación de la nota: con una fuente oficial es ALTA
//   (nivelDeVerificacion en reels/reescritura.mjs). No cambia el peso.
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
  // --- Región y provincia (25/09) ------------------------------------------
  // Hernán y Andrés pidieron más fuentes de la zona para tener notas más
  // originales que le importen a Balcarce. Las eligió una búsqueda del 25/09
  // (qué medios de afuera nombraron a Balcarce en 30 días, con Google Noticias
  // como radar) y todas respondieron ese día.
  //
  // maxItems: 0 = de estas fuentes SÓLO entra lo que nombra a Balcarce
  // (PALABRAS_LOCALES), a una FIGURA, o toca la zona (PALABRAS_ZONA). Pesos
  // bajos a propósito: lo que nombra a Balcarce ya suma +25 y +22, y con más
  // peso una nota de Mar del Plata le ganaría a una de acá.
  // Siete medios de la región usan la misma plataforma (<medio>apiv3.eleco.com.ar):
  // si ese servidor se cae, se caen juntos.
  {
    id: '0223',
    nombre: '0223',
    medio: '0223 (Mar del Plata)',
    url: 'https://www.0223.com.ar/rss',
    tipo: 'rss',
    alcance: 'region',
    peso: 12,
    maxItems: 0,
    temas: ['región', 'mar del plata', 'rutas'],
    nota: 'El medio de afuera que más nombra a Balcarce (autódromo, ruta 226, sudeste). ~150 notas por día: sin filtro taparía todo. /rss/pages/home.xml viene vacío; /rss anda.',
  },
  {
    id: 'eleco',
    nombre: 'El Eco de Tandil',
    medio: 'El Eco de Tandil',
    url: 'https://articapiv3.eleco.com.ar/feed-notes',
    tipo: 'atom',
    alcance: 'region',
    peso: 12,
    maxItems: 0,
    temas: ['región', 'tandil', 'rutas'],
    nota: 'Tandil y la ruta 226 Tandil–Balcarce. El feed lo publica la plataforma de El Eco (el link rel=alternate de su portada).',
  },
  {
    id: 'lu9',
    nombre: 'LU9 Mar del Plata',
    medio: 'LU9 Mar del Plata',
    url: 'https://lu9mardelplataapiv3.eleco.com.ar/feed-notes',
    tipo: 'atom',
    alcance: 'region',
    peso: 12,
    maxItems: 0,
    temas: ['región', 'mar del plata'],
    nota: 'Radio de Mar del Plata con entrevistas propias (el 25/09, a Reino por el autódromo). Misma plataforma que El Eco.',
  },
  {
    id: 'qznoticias',
    nombre: 'QZ Noticias',
    medio: 'QZ Noticias (Mar del Plata)',
    url: 'https://qznoticiasapiv3.eleco.com.ar/feed-notes',
    tipo: 'atom',
    alcance: 'region',
    peso: 12,
    maxItems: 0,
    temas: ['región', 'mar del plata', 'gremiales'],
    nota: 'El 25/09 trajo el acuerdo salarial STM–Municipio de Balcarce, que no publicó ningún medio local.',
  },
  {
    id: 'ecosdiarios',
    nombre: 'Ecos Diarios',
    medio: 'Ecos Diarios (Necochea)',
    url: 'https://ecosdiariosapiv3.eleco.com.ar/feed-notes',
    tipo: 'atom',
    alcance: 'region',
    peso: 11,
    maxItems: 0,
    temas: ['región', 'necochea', 'lobería'],
    nota: 'El que más cubre Lobería. El dominio viejo (ecosdiariosweb.com.ar) corta la conexión.',
  },
  {
    id: 'dib',
    nombre: 'Agencia DIB',
    medio: 'Agencia DIB',
    url: 'https://dib.com.ar/rss/pages/home.xml',
    tipo: 'rss',
    alcance: 'provincia',
    peso: 12,
    maxItems: 0,
    temas: ['provincia', 'interior bonaerense'],
    nota: 'Agencia de noticias del interior bonaerense; la levantan decenas de diarios. Sólo lo que nombra a Balcarce o toca la zona: con dos por vuelta entraba "Edición impresa del día" y la sección Provincia no sale sola.',
  },
  {
    id: 'lanoticia1',
    nombre: 'La Noticia 1',
    medio: 'La Noticia 1',
    url: 'https://lanoticia1apiv3.eleco.com.ar/feed-notes',
    tipo: 'atom',
    alcance: 'provincia',
    peso: 11,
    maxItems: 0,
    temas: ['provincia'],
    nota: 'Interior bonaerense. La URL vieja (/rss) no andaba; el feed real es el de la plataforma de El Eco.',
  },
  {
    id: 'diputadosbsas',
    nombre: 'Diputados Bonaerenses',
    medio: 'Diputados Bonaerenses',
    url: 'https://diputadosbsas.com.ar/feed/',
    tipo: 'rss',
    alcance: 'provincia',
    peso: 11,
    maxItems: 0,
    temas: ['legislatura', 'política provincial'],
    nota: 'Legislatura bonaerense. Sólo entra cuando nombra a Balcarce (proyectos, legisladores de la sección).',
  },
  {
    id: 'gba',
    nombre: 'Gobierno de la Provincia',
    medio: 'Gobierno de la Provincia de Buenos Aires',
    url: 'https://www.gba.gob.ar/rss.xml',
    tipo: 'rss',
    alcance: 'provincia',
    peso: 14,
    maxItems: 0,
    oficial: true,
    temas: ['oficial', 'provincia'],
    nota: 'Sólo trae discursos del gobernador. oficial + maxItems 0: sale únicamente lo que nombra a Balcarce o toca la zona. NO subir maxItems con oficial: true (saltearía el piso).',
  },
  {
    id: 'loberia2261',
    nombre: '2261 Lobería',
    medio: '2261 – Noticias de Lobería',
    url: 'https://www.2261.com.ar/feed/',
    tipo: 'rss',
    alcance: 'region',
    peso: 10,
    maxItems: 1,
    temas: ['región', 'lobería', 'rural'],
    nota: 'Partido vecino. Una por vuelta: obras, rutas, sociedades rurales.',
  },
  {
    id: 'ayacuchoaldia',
    nombre: 'Ayacucho al Día',
    medio: 'Ayacucho al Día',
    url: 'https://ayacuchoaldia.com.ar/feed/',
    tipo: 'rss',
    alcance: 'region',
    peso: 10,
    maxItems: 0,
    temas: ['región', 'ayacucho'],
    nota: 'Partido vecino, pero mezcla notas de toda la provincia: sólo lo que nombra a Balcarce o toca la zona.',
  },
  {
    id: 'argenpapa',
    nombre: 'Argenpapa',
    medio: 'Argenpapa',
    url: 'https://www.argenpapa.com.ar/noticias/argentina/',
    base: 'https://www.argenpapa.com.ar',
    // Notas: /noticia/<id>-argentina-<slug>. Cada una tiene dos <a>: la foto
    // (vacía, la descarta el largo mínimo) y el título.
    patronEnlace: /<a[^>]+href=["']([^"']*\/noticia\/\d+-argentina-[a-z0-9-]+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    tipo: 'scrape',
    alcance: 'region',
    seccion: 'Agro',
    prefijoTitulo: 'Argentina:',
    peso: 16,
    maxItems: 3,
    temas: ['agro', 'papa'],
    nota: 'Balcarce es capital nacional de la papa y nadie de la zona cubre el negocio (precios, semilla, industria, importaciones). Sin feed: se lee la sección Argentina.',
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
    maxItems: 3,
    seccion: 'Economía',
    temas: ['economia'],
  },
  // --- Tecnología, economía y política nacionales ------------------------
  //
  // Se agregaron el 21/09 a pedido de la redacción: tecnología con foco en
  // inteligencia artificial, economía regional y nacional, y política, que
  // hasta entonces sólo entraba por palabra clave y casi no salía.
  //
  // Van con `seccion` fija: el feed ya viene separado por tema y es más
  // confiable que adivinar por palabras. Los pesos son parejos y bajos a
  // propósito — que un medio de Balcarce no se vuelva una copia de Infobae —
  // y `maxItems` chico, porque estas tres fuentes tiran cien notas por vuelta.
  {
    id: 'infobae-tecno',
    nombre: 'Infobae · Tecnología',
    medio: 'Infobae',
    url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/tecno/?outputType=xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Tecnología',
    peso: 14,
    maxItems: 4,
    temas: ['tecnologia'],
  },
  {
    id: 'clarin-tecno',
    nombre: 'Clarín · Tecnología',
    medio: 'Clarín',
    url: 'https://www.clarin.com/rss/tecnologia/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Tecnología',
    peso: 14,
    maxItems: 3,
    temas: ['tecnologia'],
  },
  {
    id: 'ambito-tecno',
    nombre: 'Ámbito · Tecnología',
    medio: 'Ámbito',
    url: 'https://www.ambito.com/rss/pages/tecnologia.xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Tecnología',
    peso: 13,
    maxItems: 3,
    temas: ['tecnologia'],
  },
  {
    id: 'infobae-economia',
    nombre: 'Infobae · Economía',
    medio: 'Infobae',
    url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/economia/?outputType=xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Economía',
    peso: 14,
    maxItems: 4,
    temas: ['economia'],
  },
  {
    id: 'clarin-economia',
    nombre: 'Clarín · Economía',
    medio: 'Clarín',
    url: 'https://www.clarin.com/rss/economia/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Economía',
    peso: 14,
    maxItems: 3,
    temas: ['economia'],
  },
  {
    id: 'ambito-economia',
    nombre: 'Ámbito · Economía',
    medio: 'Ámbito',
    url: 'https://www.ambito.com/rss/pages/economia.xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Economía',
    peso: 14,
    maxItems: 3,
    temas: ['economia'],
  },
  {
    id: 'infobae-politica',
    nombre: 'Infobae · Política',
    medio: 'Infobae',
    url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/politica/?outputType=xml',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Política',
    peso: 13,
    maxItems: 3,
    temas: ['politica'],
  },
  {
    id: 'clarin-politica',
    nombre: 'Clarín · Política',
    medio: 'Clarín',
    url: 'https://www.clarin.com/rss/politica/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Política',
    peso: 13,
    maxItems: 3,
    temas: ['politica'],
  },
  {
    id: 'lanacion-politica',
    nombre: 'La Nación · Política',
    medio: 'La Nación',
    url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/politica/',
    tipo: 'rss',
    alcance: 'pais',
    seccion: 'Política',
    peso: 13,
    maxItems: 3,
    temas: ['politica'],
  },
];

/** Los nombres de medio (`medio`) de las fuentes oficiales. Sirve para notas
 *  que no traen la marca `oficial` de cada fuente (las de antes del 25/09). */
export const MEDIOS_OFICIALES = new Set([...FUENTES, ...FUENTES_NACIONALES]
  .filter((f) => f.oficial)
  .map((f) => f.medio ?? f.nombre));

// Candidatos a probar para región, provincia, país, deportes y automovilismo.
// El probador dice cuáles están vivos; los que sirvan pasan a FUENTES.
export const CANDIDATOS = [
  // Pendientes: región y provincia. Ninguno resolvió todavía.
  // La Capital de Mar del Plata y El Retrato de Hoy devuelven 403 (bloquean
  // lectores automáticos), 0223 responde pero sin items, y La Noticia 1 no
  // publica feed: su sección de Balcarce habría que leerla de la página.
  { id: 'lacapitalmdp', nombre: 'La Capital (MdP)', url: 'https://www.lacapitalmdp.com/feed/', alcance: 'region' },
  { id: 'retratodehoy', nombre: 'El Retrato de Hoy', url: 'https://elretratodehoy.com.ar/feed/', alcance: 'region' },
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

// Lo que afecta a Balcarce sin nombrarla: las rutas que la cruzan, el sudeste
// y la papa. De las fuentes de afuera entra aunque no diga "Balcarce", pero sin
// los +22 de nombrarla (25/09). "papa" sola no: el 25/09 apareció "el Papa
// León XIV"; van frases que sólo pueden ser del cultivo.
export const PALABRAS_ZONA = [
  'ruta 226', 'ruta nacional 226', 'ruta 55', 'ruta provincial 55',
  'sudeste bonaerense', 'sudeste de la provincia',
  'productores de papa', 'papa semilla', 'cultivo de papa', 'producción de papa',
  'produccion de papa', 'cosecha de papa', 'siembra de papa',
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
    palabras: ['agro', 'cosecha', 'siembra', 'trigo', 'soja', 'ganader', 'agropecuar', 'exposicion rural', 'exposición rural', 'expo rural', 'expoagro',
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
    // Economía regional y nacional. Entró el 21/09: hasta entonces la plata
    // se repartía entre País, Agro y Servicios según por dónde se colara.
    seccion: 'Economía',
    palabras: ['dólar', 'dolar', 'inflación', 'inflacion', 'plazo fijo', 'tasa de interés',
      'tasas de interés', 'riesgo país', 'bcra', 'banco central', 'salarios', 'paritarias',
      'jubilaciones', 'aguinaldo', 'canasta básica', 'canasta basica', 'pymes', 'desempleo',
      'exportaciones', 'importaciones', 'aranceles', 'monotributo', 'arca', 'afip',
      'mercados', 'bonos', 'cedears', 'billetera virtual', 'crédito hipotecario',
      'credito hipotecario', 'costo de vida', 'precios', 'comercio local', 'comerciantes',
      'empresas en mora', 'ventas minoristas', 'ahorro', 'inversiones', 'finanzas'],
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
      'digitalización', 'digitalizacion', 'ciberseguridad', 'automatización', 'automatizacion',
      // Inteligencia artificial: es lo que más se lee de tecnología hoy y lo
      // que más le interesa a la redacción. "IA" sola sí entra: en castellano
      // no significa otra cosa, y la regla exige la palabra entera.
      'ia', 'chatgpt', 'openai', 'gemini', 'claude', 'copilot', 'chatbot', 'machine learning',
      'modelo de lenguaje', 'robot', 'robots', 'robótica', 'robotica',
      'ciberataque', 'ciberdelito', 'hackeo', 'software', 'startup', 'semiconductores',
      'smartphone', 'nvidia', 'inteligencia artificial generativa'],
  },
];

// Semáforo editorial: qué necesita revisión humana antes de salir.
// La parte del amarillo que cuida a los chicos y a las víctimas. Es la que se
// mira en TODO el texto (el artículo completo de la fuente y el cuerpo que
// escribe la IA). El resto del amarillo ("denuncia", "falleció", "hospital",
// "investigación") mira sólo el título y el comienzo, como siempre: el 25/09,
// mirando el artículo entero, frenaba 16 de cada 23 notas por una palabra
// perdida en el octavo párrafo. Lo decidieron Hernán y Andrés el 25/09.
// No es una lista aparte: se saca del amarillo de abajo, así no se desfasan.
const ES_DE_MENORES = /menor|beb[eé]|beba|nacid|alumn|abus|niñ|nen[ea]|adolescen/;

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
    'niña identificada', 'abuso infantil', 'grooming',
    // Sumados el 25/09 (auditoría, a pedido de Hernán y Andrés). Sólo frases
    // que no se pueden leer de otra forma: "trata de personas" NO, porque
    // "se trata de personas mayores" es castellano de todos los días.
    // No hace falta escribir la versión sin tilde: el semáforo compara todo
    // sin tildes. Cada una tiene su ejemplo a favor y en contra en
    // pruebas/semaforo.test.mjs.
    'abusó sexualmente', 'abusaron sexualmente', 'abusada sexualmente', 'abusado sexualmente',
    'agresión sexual', 'agresiones sexuales', 'abuso de menores', 'abuso de un menor',
    'abuso de una menor', 'corrupción de menores', 'pornografía infantil',
    'explotación sexual', 'víctimas de trata', 'red de trata', 'delito de trata',
    'violada', 'violador', 'la violaron', 'estupro'],
  // Espera aprobación.
  //
  // El 21/09 se sacaron de acá "concejo deliberante", "intendente", "gremio",
  // "paro", "protesta" y "reclamo", a pedido de la redacción: son política
  // de todos los días, y con ellas frenando, Política no publicaba nada.
  // Siguen esperando lo que acusa, lo que muere y lo que involucra a chicos.
  amarillo: ['denuncia', 'denunció', 'denuncio', 'detenido', 'acusado', 'imputado',
    'hospital', 'muerte', 'falleció', 'fallecio', 'investigación', 'investigacion',
    // Una muerte se llame como se llame. "Murió Mario Torres" salió sola
    // porque el filtro sólo conocía "muerte" y "falleció": es una necrológica,
    // y las necrológicas no salen sin fuente firmada.
    'murió', 'murio', 'muere', 'fallece', 'deceso', 'velatorio',
    // Policiales entró a las secciones automáticas el 21/09. Esto es lo que
    // hace que eso sea seguro: lo grave sigue esperando a una persona.
    'homicidio', 'asesinato', 'asesinado', 'asesinaron', 'cadáver', 'cadaver',
    'víctima', 'victima', 'apuñalado', 'apuñalaron', 'baleado', 'balearon',
    'adolescente', 'adolescentes', 'niño', 'niña', 'nene', 'nena', 'menores de edad',
    // Sumados el 25/09: lo que puede dejar identificado a un chico aunque no
    // sea un delito. "menor" suelto NO ("un precio menor"): va en frase.
    // "bebé" suelto tampoco: sin tilde es "bebe", del verbo beber.
    // "abusó" suelto tampoco: sin tilde es "abuso", y "abuso de poder" no es
    // esto; van las formas que sí lo son.
    'un menor de', 'una menor de', 'el menor de', 'la menor de',
    'un bebé', 'el bebé', 'del bebé', 'una beba', 'la beba', 'bebés',
    'recién nacido', 'recién nacida', 'alumna de', 'alumno de',
    'abusado', 'abusada', 'abusador', 'la abusó', 'lo abusó', 'abusaba de'],
  // Todo lo demás sale solo si la sección lo permite.
  //
  // Balcarce entró el 20/09: estaba afuera por prudencia y el resultado era
  // el contrario al buscado (58 de 61 notas locales esperando, contra 65 de
  // 67 de Deportes publicándose solas).
  //
  // Política, Policiales, Economía y Tecnología entraron el 21/09. Política
  // y Policiales estaban afuera porque en un pueblo son los dos temas donde
  // un error no se perdona, y tenían 38 notas esperando que nadie aprobaba:
  // dos secciones enteras que no existían para el lector. Lo que las hace
  // seguras no es que estén afuera sino la lista de arriba — todo lo que
  // acusa, mata o involucra a un chico sigue esperando a una persona — y
  // el rojo, que no sale nunca.
  verdeSecciones: ['Servicios', 'Cultura y agenda', 'Deportes', 'Automovilismo', 'Agro',
    'Balcarce', 'Política', 'Policiales', 'Economía', 'Tecnología'],
  // Esto NO es noticia: es publicidad o promoción de otro medio. No se
  // bloquea (a veces un sorteo del club sí interesa), pero nunca sale solo:
  // el 18/09 la portada abrió con "Ganá tu entrada para el TC", que es una
  // promoción de una radio, no una noticia nuestra.
  promocional: ['sorteo', 'sortea', 'sortearemos', 'ganá tu entrada', 'gana tu entrada',
    'participá del', 'participa del', 'regala las entradas', 'promoción exclusiva',
    'promocion exclusiva', 'suscribite', 'seguinos en', 'auspicia', 'publicidad'],
  // La cotización del dólar NO es una nota: es un número que cambia cada hora
  // y el sitio lo muestra en /dolar. El 25/09 salían dos o tres por día ("El
  // dólar minorista y el dólar blue cotizan este viernes", "Dólar hoy y dólar
  // blue en vivo…") y ninguna tenía cuerpo. Se mira sólo en el TÍTULO: una
  // nota de economía que menciona el dólar en el tercer párrafo sí es nota.
  // No frena como las listas de arriba: queda amarilla, con su motivo, por si
  // una persona quiere publicarla igual.
  cotizacion: ['dólar hoy', 'a cuánto cotiza', 'a cuanto cotiza', 'dólar blue', 'cotización del dólar',
    'dólar oficial', 'dólar mep', 'dólar minorista', 'dólar mayorista', 'dólar tarjeta',
    'dólar cripto', 'dólar ccl', 'contado con liquidación', 'precio del dólar', 'cotiza el dólar',
    'cotizó el dólar', 'blue hoy'],
  // Política y economía de OTROS países (26/09). "Donald Trump y Xi Jinping
  // concluyen su cumbre en Washington" salió sola en Tecnología, con 39 puntos,
  // y no le importa a nadie de Balcarce. Se mira sólo el TÍTULO y sólo en lo de
  // afuera que no nombra a Balcarce: queda amarilla, con su motivo, por si una
  // persona quiere publicarla igual (por ejemplo, si afecta a la papa o al agro).
  internacional: ['trump', 'xi jinping', 'putin', 'zelenski', 'zelensky', 'netanyahu', 'casa blanca',
    'kremlin', 'hamas', 'franja de gaza', 'ucrania', 'otan', 'brics', 'g20', 'g7',
    'unión europea', 'union europea', 'parlamento europeo', 'macron', 'starmer', 'sheinbaum', 'lula',
    'maduro', 'petro', 'boric', 'erdogan', 'kim jong'],
};

/** El motivo con que queda amarilla una nota internacional sin relación con Balcarce. */
export const MOTIVO_INTERNACIONAL = 'internacional: sin relación con Balcarce';

// Las fuentes de tecnología de los diarios nacionales traen de todo (esa
// cumbre, un partido, una serie): no alcanza con que el feed diga "Tecnología".
// La sección se confirma con el TÍTULO: si no nombra algo de tecnología, no se
// le cree a la fuente y la nota se clasifica por lo que dice.
export const PALABRAS_DE_TECNOLOGIA_EN_EL_TITULO = [
  'inteligencia artificial', 'algoritmo', 'drone', 'dron', 'drones', 'satelital', 'ciberseguridad',
  'ciberataque', 'hackeo', 'software', 'startup', 'semiconductores', 'smartphone', 'nvidia', 'robot',
  'robots', 'ia', 'chatgpt', 'openai', 'gemini', 'claude', 'copilot', 'chatbot', 'machine learning',
  'microsoft', 'google', 'apple', 'samsung', 'android', 'iphone', 'windows', 'linux',
  'celular', 'celulares', 'app', 'aplicación', 'aplicacion', 'tecnología', 'tecnologia', 'digital',
  'internet', 'wifi', 'fibra óptica', 'red social', 'redes sociales', 'videojuego', 'videojuegos',
  'consola', 'playstation', 'xbox', 'nintendo', 'gamer', 'starlink', 'spacex', 'tesla', 'bitcoin',
  'criptomoneda', 'criptomonedas', 'blockchain', 'chip', 'procesador',
  'batería', 'bateria', 'cámara', 'camara', 'streaming', 'netflix', 'spotify', 'youtube', 'tiktok',
  'instagram', 'whatsapp', 'telegram', 'ciencia', 'científico', 'cientifico', 'nasa', 'satélite',
  'satelite', 'espacial', 'cohete', 'genética', 'genetica', 'vacuna',
];

/** El motivo con que queda amarilla una nota de la cotización del dólar. */
export const MOTIVO_COTIZACION = 'cotización del dólar: se muestra en /dolar';

/** El amarillo que se mira en el texto entero: menores y víctimas. */
export const AMARILLO_MENORES = REGLAS_SEMAFORO.amarillo.filter((p) => ES_DE_MENORES.test(p));

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

// Los temas que se siguen en el tiempo.
//
// Una sección agrupa por tipo de noticia; un tema agrupa por historia. En un
// pueblo eso vale más que en un diario nacional: las historias duran meses y
// la gente quiere saber cómo siguió aquello que leyó en marzo. Hoy el que
// entra por una nota del autódromo no tiene forma de ver las otras once.
//
// Son pocos a propósito. Un tema con dos notas no es un tema, es una
// etiqueta suelta; y cincuenta etiquetas es lo mismo que ninguna. Se agrega
// uno cuando la historia ya demostró que vuelve.
//
// Las palabras van completas: acá "escuela" sola engancharía media portada.
export const TEMAS = [
  {
    nombre: 'El autódromo',
    ranura: 'autodromo',
    palabras: ['autodromo', 'autódromo', 'juan manuel fangio', 'circuito de balcarce'],
  },
  {
    nombre: 'Ferroviarios',
    ranura: 'ferroviarios',
    palabras: ['ferroviarios'],
  },
  {
    nombre: 'TC Pick Up',
    ranura: 'tc-pick-up',
    palabras: ['tc pick up', 'pick up en balcarce'],
  },
  {
    nombre: 'El Concejo Deliberante',
    ranura: 'concejo',
    palabras: ['concejo deliberante', 'concejal', 'concejales'],
  },
  {
    nombre: 'El INTA',
    ranura: 'inta',
    palabras: ['inta', 'instituto nacional de tecnologia agropecuaria'],
  },
  {
    nombre: 'El Cerro El Triunfo',
    ranura: 'cerro',
    palabras: ['cerro el triunfo', 'el cerro'],
  },
  {
    nombre: 'Bomberos Voluntarios',
    ranura: 'bomberos',
    palabras: ['bomberos voluntarios', 'cuartel de bomberos'],
  },
  {
    nombre: 'El hospital',
    ranura: 'hospital',
    palabras: ['hospital felipe glasman', 'hospital municipal', 'hospital de balcarce'],
  },
  {
    nombre: 'Las rutas',
    ranura: 'rutas',
    palabras: ['ruta 226', 'ruta 55', 'ruta provincial 55', 'ruta nacional 226'],
  },
  {
    nombre: 'Fangio',
    ranura: 'fangio',
    palabras: ['fangio', 'museo fangio'],
  },
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


// Cuánto puntaje necesita una nota de AFUERA para salir sola (el piso) y
// cuántas de afuera salen solas por sección (el cupo): son números del
// criterio editorial, y viven en ingesta/criterio.mjs, con el porqué de cada
// uno, y en la tabla "Los números" de CRITERIO-EDITORIAL.md. Se cambian ahí.
export {
  PISO_DE_AFUERA, PISO_POR_DEFECTO, CUPO_DE_AFUERA, CUPO_POR_DEFECTO,
} from './criterio.mjs';
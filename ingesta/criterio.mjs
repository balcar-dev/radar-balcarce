// Los números del criterio editorial, en un solo lugar.
//
// Cada número de acá está escrito también en CRITERIO-EDITORIAL.md, en la
// tabla "Los números", con la clave que lo nombra (por ejemplo
// `TITULO.maximo`). La prueba pruebas/criterio.test.mjs lee ese documento y
// falla si un número no coincide, si falta una fila o si sobra una: si se
// cambia un número, se cambia en los dos lados, y así lo que leen Hernán y
// Andrés es siempre lo que hace el sistema.
//
// Sin imports: lo usan ingesta/, panel/, redes/ y reels/, que no pueden
// depender de nada de afuera de Node. Los tres números que viven en web/lib
// (72 horas, 6 horas y 70 palabras) se quedan allá porque los compila la web,
// pero la misma prueba controla que sean iguales a éstos.

/** El título: apunta a unos 70 caracteres y el verificador rechaza más de 90. */
export const TITULO = {
  objetivo: 70,
  maximo: 90,
};

/** La bajada (el campo `copete`): dos o tres frases, unas 50 palabras. */
export const BAJADA = {
  frasesMinimas: 2,
  frasesMaximas: 3,
  palabras: 50,
  maximo: 360,
};

/** El cuerpo: se piden de 100 a 180 palabras; con menos de 70 no se publica. */
export const CUERPO = {
  minimoParaPublicar: 70,
  palabrasPedidasMinimo: 100,
  palabrasPedidasMaximo: 180,
  parrafosMaximo: 3,
  maximo: 1800,
};

/** El guion de voz: es el título, dicho en unos diez segundos. */
export const GUION = {
  maximo: 200,
  segundos: 10,
};

/** Las partes para la redacción (claves, qué se sabe…) y el texto para redes. */
export const PARTES = {
  clavesMinimo: 3,
  clavesMaximo: 5,
  clave: 180,
  dato: 260,
  aporte: 220,
  textoRedes: 280,
  etiquetasMinimo: 3,
  etiquetasMaximo: 8,
  etiqueta: 40,
};

/** Más de esto seguido, palabra por palabra, es copiar y no reescribir. */
export const COPIA_MAXIMA = 12;

/** Cómo trabaja la IA con cada nota. */
export const REESCRITURA = {
  intentosMaximos: 3,
  diasDeIntentos: 7,
  palabrasMinimasDeMaterial: 60,
  porCorrida: 40,
  // Tope de notas que se le piden a la IA en un día entero (hora de Balcarce).
  // La clave que se usa es paga y Hernán y Andrés no tienen margen: el 25/09 se
  // pidieron unas 300 en un día, con muchas corridas a mano. Primero se gasta
  // en lo de Balcarce (el orden ya lo hace así).
  porDia: 150,
  caracteresDelTextoCompleto: 4000,
  diasDeAntecedentes: 30,
  antecedentesMaximo: 3,
};

/** Cuánto se queda una nota a la vista. */
export const PORTADA = {
  horas: 72,
  horasNotaGrande: 6,
  diasDeArchivo: 180,
};

// Cuánto puntaje necesita una nota de AFUERA para salir sola, por sección.
//
// Lo de Balcarce no tiene piso. Lo de afuera sí, porque las fuentes
// nacionales tiran cincuenta notas por vuelta y sólo unas pocas le importan
// a alguien de acá. El piso no es igual para todas:
//
//   · Deportes sube: es casi un tercio de todo lo que entra y no es lo que
//     define a un medio de Balcarce. Queda lo que ya vale mucho — Messi,
//     Colapinto, la Selección — y lo de la zona.
//   · Economía, Tecnología, Política y Policiales bajan: las fuentes de
//     esas secciones son pocas y de peso parejo, y con el piso general de
//     50 no habría pasado casi nada.
export const PISO_DE_AFUERA = {
  Deportes: 62,
  Economía: 38,
  // 26/09: 38 dejaba afuera a Hipertextual y Xataka (36); es una sección flaca.
  Tecnología: 34,
  Política: 40,
  Policiales: 40,
  // 26/09: las secciones flacas. Con el piso de 50, las notas frescas de
  // espectáculos y de agro de afuera (unos 45 puntos) quedaban todas esperando.
  'Cultura y agenda': 38,
  Agro: 38,
};
export const PISO_POR_DEFECTO = 50;

// Cuántas notas de AFUERA salen solas por sección, como máximo.
//
// Con el piso no alcanza: un domingo de fútbol tiene treinta notas arriba de
// 62 puntos, y la portada de Balcarce sería la de Olé. El cupo se queda con
// las de más puntaje y manda el resto a esperar. Lo de Balcarce no tiene
// cupo.
//
// Automovilismo no tenía cupo hasta el 25/09, y la portada de ese día tenía
// 45 notas de fierros (22 de afuera: F1, TC nacional) contra 40 de Balcarce.
// Un medio de Balcarce no puede tener más Fórmula 1 que Balcarce. Con 12,
// lo de afuera baja a la mitad y lo local (el autódromo, los pilotos de acá)
// sigue sin cupo, como siempre: ese día habrían quedado 23 + 12 = 35.
// Tecnología y Política bajan de 12 a 8: ese día tenían 6 y 4 de afuera, así
// que no se vacían, pero un día de mucha noticia nacional ya no tapan lo local.
// Automovilismo bajó otra vez, de 12 a 6, esa misma madrugada: con la portada
// de 72 h quedaban 16 locales (semana del autódromo) + 12 de afuera (semana de
// F1) = 28, contra 24 de Balcarce. Con 6, las mejores de la F1 siguen saliendo.
export const CUPO_DE_AFUERA = {
  Deportes: 10,
  Economía: 12,
  Tecnología: 8,
  Política: 8,
  // 26/09: Policiales es sólo de Balcarce y la zona. Lo de afuera no sale solo.
  Policiales: 0,
  Automovilismo: 6,
  // 26/09: Cultura y agenda tenía el cupo de todas (15); con los espectáculos de
  // los diarios nacionales, la agenda de Balcarce quedaría tapada por la farándula.
  'Cultura y agenda': 8,
};
export const CUPO_POR_DEFECTO = 15;

/** Secciones que no salen solas a ninguna red: las decide una persona. */
export const SECCIONES_QUE_ESPERAN_PERSONA = ['Policiales', 'Política'];

/** Facebook: conservador a propósito (decisión del 21/09). */
export const FACEBOOK = {
  porDia: 5,
  relevanciaMinima: 75,
  desdeHora: 8,
  hastaHora: 22,
  minutosEntrePosteos: 90,
  esperaMinutos: 15,
  edadMaximaHoras: 8,
  horasSinRepetirTema: 24,
};

/** Las piezas de video (podcasts e historias de notas). */
export const PIEZAS = {
  relevanciaPodcast: 62,
  relevanciaFeed: 80,
  historiasDeNotas: 3,
  feedPorDia: 2,
  notasPorPodcast: 3,
  notasPodcastNoche: 4,
  notasMinimasPodcast: 2,
};

/**
 * El contrato del día en Facebook e Instagram (25/09): lo que TIENE que salir
 * cada día, en cada red, y lo que se audita (redes/contrato.mjs,
 * redes/auditar-redes.mjs, el resumen de las 21 y el cierre de las 23:30 del
 * vigilante). Qué pieza sale a qué hora está en redes/piezas.mjs; acá sólo van
 * los números.
 */
export const CONTRATO_DIARIO = {
  posteosPorDia: 5,          // notas con enlace (Facebook) y su espejo en el feed (Instagram): como máximo
  reelsPorDia: 3,            // los podcasts de la mañana, la tarde y la noche
  historiasDePodcast: 3,     // cada podcast se sube también como historia
  historiasDeClima: 2,       // la de la mañana y la de la noche
  historiasDeFarmacia: 1,
  historiasPorDia: 6,        // la suma de las tres de arriba (las semanales van aparte)
  historiasMaximasPorDia: 8, // techo del día: las 6 del contrato + 2 extras (teléfonos útiles y agenda del jueves)
  cierreMinutoDelDia: 1410,  // 23:30: el cierre del día contra lo que Meta tiene de verdad
  toleranciaDeHoraMinutos: 20, // cuánto pueden diferir la hora del libro y la de Meta para ser la misma pieza
  diasDeAuditoriaSemanal: 7,
};

/** Todos los números juntos, por nombre: es lo que la prueba compara con la
 *  tabla del documento (`TITULO.maximo`, `CUPO_DE_AFUERA.Deportes`…). */
export const NUMEROS_DEL_CRITERIO = {
  TITULO,
  BAJADA,
  CUERPO,
  GUION,
  PARTES,
  COPIA_MAXIMA,
  REESCRITURA,
  PORTADA,
  PISO_DE_AFUERA,
  PISO_POR_DEFECTO,
  CUPO_DE_AFUERA,
  CUPO_POR_DEFECTO,
  FACEBOOK,
  PIEZAS,
  CONTRATO_DIARIO,
};

// ---------------------------------------------------------------------------
// La voz y los textos de las redes: CRITERIO-REDES.md (sección 5, "Los números").
// La prueba pruebas/redes-criterio.test.mjs compara este bloque con esa tabla.
// Está aparte de NUMEROS_DEL_CRITERIO a propósito: ésa se compara con la tabla de
// CRITERIO-EDITORIAL.md y son dos documentos distintos.

/** La voz: ritmo de locución y cuántas veces se dice la dirección. */
export const VOZ = {
  palabrasPorSegundo: 2.5,
  // 1 = los podcasts dicen "Radar Balcarce punto com" siempre al cerrar; 0 = nunca.
  direccionEnPodcasts: 1,
  // El clima, la farmacia y las piezas semanales la dicen 1 de cada N días
  // (lo decide la fecha, no el azar). 0 = nunca.
  direccionUnaDeCada: 3,
};

/** Cuánto dura un clima, en segundos (se apunta a 10 a 20). */
export const CLIMA_VOZ = { segundosMinimo: 8, segundosMaximo: 25 };

/**
 * Cuánto dura un podcast, en segundos (se apunta a 45 a 75 con tres notas).
 *
 * Cada podcast se sube también como HISTORIA, y una historia acepta 60 segundos
 * como máximo (Instagram: "Max duration for stories is 61.0"; Facebook la
 * rechaza también). El 25/09 el podcast de la noche, con 4 notas y 153 palabras,
 * duró 62,7 segundos y su historia falló en las dos redes. Por eso:
 *   · `palabrasPorSegundo`: el ritmo REAL de la voz de Gemini con el texto de un
 *     podcast (salieron entre 2,3 y 2,6); es más lento que el de VOZ a propósito,
 *     para que el cálculo peque de largo y no de corto.
 *   · `segundosDeAdorno`: lo que el video suma a la voz (0,25 de entrada y 1,4 de
 *     cola, en reels/reel.mjs).
 *   · `segundosPresupuesto`: lo que puede durar un podcast al escribirlo; si el
 *     guion pasa, se le sacan detalles y después notas (mínimo 2).
 *   · `segundosMaximoHistoria`: el corte de seguridad. Si aun así el video pasa de
 *     esto, la historia sube recortada con fundido (el reel queda entero).
 */
export const PODCAST_VOZ = {
  segundosMinimo: 20,
  segundosMaximo: 100,
  palabrasPorSegundo: 2.4,
  segundosDeAdorno: 1.65,
  segundosPresupuesto: 55,
  segundosMaximoHistoria: 58,
};

/** Cuánto dura la farmacia o una pieza semanal, en segundos. */
export const PIEZA_FIJA_VOZ = { segundosMinimo: 6, segundosMaximo: 25 };

/** El texto de un posteo de una nota. */
export const POSTEO = { hashtagsMaximo: 3 };

/** Los números de las redes por nombre, como los nombra la tabla de CRITERIO-REDES.md. */
export const NUMEROS_DE_REDES = {
  VOZ, CLIMA_VOZ, PODCAST_VOZ, PIEZA_FIJA_VOZ, POSTEO,
};

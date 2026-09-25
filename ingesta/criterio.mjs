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
  Tecnología: 38,
  Política: 40,
  Policiales: 40,
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
  Policiales: 8,
  Automovilismo: 6,
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
};

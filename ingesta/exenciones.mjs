// Exenciones ANGOSTAS del semáforo amarillo (regla 172, 15/10/2026). Sin dependencias: sólo lo que trae Node.
//
// La auditoría del 15/10 (docs/etapa-6-9/ANALISIS.md, A.3) encontró que más de la mitad de lo que esperaba a una persona eran falsos
// positivos tontos: "El Niño" (el clima) frenaba como si fuera un chico, "petro" encontraba "petróleo", "sorteo del fixture" frenaba como
// si fuera una rifa. Acá están las frases exactas que dejan de frenar. Reglas del juego:
//
//   · Son frases y contextos, nunca una palabra sacada de una lista: las listas roja, "nunca" y amarilla no se tocan.
//   · Sólo valen para el AMARILLO (y para la promoción y lo internacional). Lo rojo se mira siempre sobre el texto completo, sin esto.
//   · Una frase exenta se tapa con una marca neutra: cualquier OTRA palabra sensible del mismo texto sigue frenando.
//   · Si un caso es dudoso, no está acá: queda frenando y lo decide Hernán.
//
// Cada una tiene su prueba, con el caso real a favor y los que NO tienen que dejar pasar, en pruebas/exenciones.test.mjs.

const sinTildes = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- El Niño / La Niña (el clima)

/** Palabras que sólo aparecen cuando se habla del clima. Se miran en el texto ya sin tildes. */
const CONTEXTO_CLIMA = /\b(fenomeno|clima|climatic\w*|sequias?|lluvias?|precipitaciones|temperaturas?|pronostico|enso|smn|meteorologic\w*|oceano|oceanic\w*|pacifico|crecidas?|inundaciones|calentamiento)\b/;

/** "El Niño" / "La Niña" con la inicial en mayúscula (el fenómeno; un chico va en minúscula: "el niño"). Dos cuidados: la palabra que
 *  sigue no puede ir también en mayúscula ("El Niño Jesús", "El Niño Maravilla", o un título en Title Case) ni ser "Jesús" o "Dios". */
const EL_NINO = /\b(?:[Ee]l|[Ll]a)\s+Ni(?:ñ|ñ)[oa]\b(?!\s+(?:[A-ZÁÉÍÓÚÑ]|jes[uú]s\b|dios\b))/g;

/** Tapa "El Niño" / "La Niña" cuando el texto habla del clima. Si no hay contexto de clima, o si va en minúscula, no toca nada. */
export function sinFenomenoClimatico(textoCrudo) {
  const texto = String(textoCrudo ?? '').normalize('NFC');
  if (!CONTEXTO_CLIMA.test(sinTildes(texto))) return texto;
  return texto.replace(EL_NINO, 'fenomeno ENSO');
}

// ---------------------------------------------------------------- sorteos deportivos y judiciales

const SORTEA = '(?:sorteos?|sorteadas?|sorteados?|sortea|sortean|sortearon|sorteara|sortearan|sortear)';
const DETERMINANTE = '(?:(?:de|del|de la|de los|de las|el|la|los|las|un|una|al|a los|a las)\\s+){0,2}';
// Lo que se sortea en un deporte o en un tribunal: nunca una rifa ni una promoción.
const SE_SORTEA_OBJETO = '(?:fixture|zonas?|grupos?|fase de grupos|cruces?|llaves?|bolillero|bombos?|eliminatorias?|rivales|play ?offs?|octavos|cuartos de final|semifinales|series|jueces?|juezas?|vocal(?:es)?|jurados?|conjueces|causas?|salas?|tribunal(?:es)?|arbitros?|ternas?)';
// Estos sólo valen si el texto es de deportes ("sorteo de la Copa" sin deportes puede ser una rifa del club).
const SE_SORTEA_COMPETENCIA = '(?:copa|torneo|campeonato|mundial|liga|clausura|apertura|libertadores|sudamericana|champions)';
const CONTEXTO_DEPORTE = /\b(fixture|partidos?|equipos|clasificad\w*|seleccion|fecha|rivales|bombo|afa|fifa|conmebol|uefa|eliminatorias?|zonas|grupos|llaves|cruces|bolillero)\b/;
const RE_SORTEO_OBJETO = new RegExp(`\\b${SORTEA}\\s+${DETERMINANTE}${SE_SORTEA_OBJETO}\\b`, 'g');
const RE_SORTEO_COMPETENCIA = new RegExp(`\\b${SORTEA}\\s+${DETERMINANTE}${SE_SORTEA_COMPETENCIA}\\b`, 'g');
// "El sorteo definió el fixture", "el fixture surgió del sorteo": el fixture o el bolillero a seis palabras o menos (el texto ya viene sin puntuación).
const DEL_FIXTURE = '(?:fixture|bolillero|bombos?|cruces|llaves)';
// Se tapa SÓLO la palabra "sorteo" (con lookahead / lookbehind), nunca el tramo del medio: lo que haya entre el sorteo y el fixture ("víctima", "menor",
// "rifa"…) sigue a la vista de las listas del semáforo (A2 de la revisión del 15/10).
const RE_SORTEO_ANTES_DEL_FIXTURE = new RegExp(`\\b${SORTEA}\\b(?=(?:\\s+\\w+){0,6}?\\s+${DEL_FIXTURE}\\b)`, 'g');
const RE_SORTEO_DESPUES_DEL_FIXTURE = new RegExp(`(?<=\\b${DEL_FIXTURE}\\b(?:\\s+\\w+){0,6}?\\s+)\\b${SORTEA}\\b`, 'g');

/** Tapa los sorteos que son de deportes o de un tribunal. Recibe el texto ya normalizado (sin tildes, sin puntuación). "Sorteo de una Smart TV",
 *  "sorteo de entradas" o "sorteo de camisetas" no entran: siguen frenando como promoción. */
export function sinSorteosDeportivos(textoNormalizado) {
  let t = String(textoNormalizado ?? '');
  if (!/\bsorte\w*/.test(t)) return t;
  t = t.replace(RE_SORTEO_OBJETO, 'definicion').replace(RE_SORTEO_ANTES_DEL_FIXTURE, 'definicion').replace(RE_SORTEO_DESPUES_DEL_FIXTURE, 'definicion');
  if (CONTEXTO_DEPORTE.test(t)) t = t.replace(RE_SORTEO_COMPETENCIA, 'definicion');
  return t;
}

// ---------------------------------------------------------------- animales (no son personas)

const ANIMAL = '(?:ballenas?|delfin(?:es)?|lobos? marinos?|lobos?|orcas?|tiburon(?:es)?|focas?|pinguinos?|aves|peces|animales|fauna|vacas?|vacunos|ganado|ovejas?|caballos?|yeguas?|perros?|gatos?|zorros?|pumas?|ciervos?|terneros?)';
const CANTIDAD = '(?:(?:un|una|el|la|los|las|unos|unas|varios|varias|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|\\d+)\\s+){0,2}';
const RE_CADAVER_ANIMAL = new RegExp(`\\bcadaver(?:es)?\\s+(?:de|del|de la|de los|de las)\\s+${CANTIDAD}${ANIMAL}\\b`, 'g');
const CRIA = '(?:aves|pollos?|pollitos?|gallinas?|pavos?|patitos?|terneros?|corderos?|lechones?|potrillos?|cabritos?|animales|crias?|cachorros?|ponedoras)';
const RE_NACIDO_ANIMAL = new RegExp(`\\b${CRIA}\\s+recien\\s+nacid[oa]s?\\b|\\brecien\\s+nacid[oa]s?\\s+(?:de\\s+)?${CRIA}\\b`, 'g');

// Si el mismo texto nombra a una persona, el cadáver puede ser el suyo ("el cadáver de una ballena y el de un hombre"): no se tapa nada.
const HAY_UNA_PERSONA = /\b(hombre|hombres|mujer|mujeres|persona|personas|joven|jovenes|vecin\w+|chic[oa]s?|nen[eao]s?|nin[oa]s?|menor|menores|adult\w+|anciano\w*|abuel\w+|bebes?|turista\w*|pescador\w*|marinero\w*|buzo\w*|cuerpo|cuerpos|humano\w*|identificad\w+|victima\w*|desaparecid\w+)\b/;

/** Tapa "cadáver de una ballena" y "pollitos recién nacidos". Texto ya normalizado. "Cadáver de un hombre" no entra, y el cadáver de un
 *  animal sólo se tapa si el texto no nombra a ninguna persona. */
export function sinAnimales(textoNormalizado) {
  const t = String(textoNormalizado ?? '');
  const sinCadaveres = HAY_UNA_PERSONA.test(t) ? t : t.replace(RE_CADAVER_ANIMAL, 'restos animales');
  return sinCadaveres.replace(RE_NACIDO_ANIMAL, 'cria animal');
}

// ---------------------------------------------------------------- un adulto que cuenta su infancia

const RE_INFANCIA_DE_ADULTO = /\b(?:cuando (?:era|eran|fue|fueron) (?:un |una )?(?:nino|nina|ninos|ninas)|desde (?:nino|nina)|siendo (?:nino|nina))\b/g;

/** Tapa "cuando era niño" / "desde niña": un adulto recordando. Texto ya normalizado. "Un niño de 8 años" no entra. */
export function sinInfanciaDeAdulto(textoNormalizado) {
  return String(textoNormalizado ?? '').replace(RE_INFANCIA_DE_ADULTO, 'en su infancia');
}

// ---------------------------------------------------------------- lo internacional que habla de un argentino

/** ¿El título nombra a un argentino o a la Argentina? Entonces "Trump", "Lula" o "Putin" no alcanzan para dejarla sin relación con acá
 *  (igual tiene que cumplir los medios que pide su sección). Título ya normalizado. */
export function tituloConArgentino(tituloNormalizado) {
  return /\b(milei|caputo|bullrich|adorni|casa rosada|gobierno nacional|gobierno argentino|presidente argentino|argentina|argentino|argentinos|argentinas)\b/.test(String(tituloNormalizado ?? ''));
}

/** Todas las exenciones del amarillo sobre un texto normalizado. El Niño va aparte, antes de normalizar (necesita la mayúscula). */
export function sinExencionesDelAmarillo(textoNormalizado) {
  return sinInfanciaDeAdulto(sinAnimales(sinSorteosDeportivos(textoNormalizado)));
}

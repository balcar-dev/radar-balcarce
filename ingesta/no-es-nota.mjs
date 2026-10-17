// Lo que publica un medio de Balcarce y no es una nota de Radar (regla 199, 17/10/2026).
//
// Hernán y Andrés: los medios de acá "son parte de la historia del pueblo y queremos que también estén", pero lo
// que es DEL MEDIO no se hace pasar por noticia nuestra. La auditoría del 16/10
// (docs/auditoria-2-0/02-FUENTES-CRITERIO-REPETIDAS.md § 4) encontró publicado como nota de Balcarce:
//   · el medio hablando de sí mismo: "Radio Líder Balcarce Stream alcanza cifras récord a dos semanas de su
//     inicio" (La Vanguardia, 11/10; Radio Líder es de La Vanguardia), y fue al repaso con voz de las redes;
//   · el anuncio de su propia entrevista: "Virginia Aparicio brinda su testimonio el viernes en Polémica en Gabal"
//     (10/10) y "El abogado de Virginia Aparicio visita una radio local" (16/10, el original: "…estará este
//     viernes en GABAL");
//   · el servicio que el sitio ya tiene: cinco pronósticos del clima y dos cronogramas de farmacias de turno de
//     Radio Gabal (25/09 al 14/10). El sitio tiene su clima y su farmacia de turno.
//
// Nada de esto se publica como nota ni va a las redes: queda en rojo con el motivo "no es nota: …" (como las
// efemérides de otro medio, regla 164), y una persona igual lo puede publicar desde el celular si quiere. El
// bloque "En los medios de Balcarce" (el título del medio con su enlace, sin reescribir) es una propuesta que
// cambia la portada: lo deciden ellos (docs/propuestas/EN-LOS-MEDIOS-DE-BALCARCE.md).
//
// Lo que SÍ sigue siendo nota: lo que alguien dijo en un programa ("Aparicio habló en Gabal: …" es la noticia de
// lo que dijo), el agasajo de una institución a los periodistas, una alerta del clima (granizo, temporal), un
// cambio en el sistema de farmacias, las rifas y sorteos de una institución (Bomberos, un club, un merendero).
// La publicidad de un comercio la saca la lectura con IA (`es_publicidad`); acá sólo va la red de lo evidente.
//
// El pronóstico y las farmacias se miran en lo de cualquier medio ("Clima hoy en Corrientes" o "cómo estará el clima
// este viernes en Mar del Plata" no le sirven a nadie de acá y el sitio tiene su clima); lo demás, sólo en lo de un
// medio de Balcarce (`alcance: 'local'`). Casi todo, sólo en el título del medio. Nunca en lo de un organismo
// (`oficial`). Sin dependencias: sólo lo que trae Node.

/** El comienzo del motivo de todo lo que no es nota. */
export const MOTIVO_NO_ES_NOTA = 'no es nota';

const plano = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9ñ%°\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** El último tramo de la dirección, con espacios: "mario-bolla-…-estara-este-viernes-en-gabal". */
function tramoDeLaDireccion(enlace = '') {
  try { return plano(new URL(String(enlace)).pathname.split('/').filter(Boolean).pop()?.replace(/[-_]+/g, ' ') ?? ''); } catch { return ''; }
}

// ---------------------------------------------------------------- el medio que habla de sí

/** Los medios de Balcarce, sus radios, sus streams y sus programas, como se los nombra en un título. */
const MARCAS = /\b(radio gabal|gabal|polemica en gabal|radio lider|lider stream|lider balcarce|multimedios balcarce|la vanguardia|informese primero|puntonueve|punto nueve|news balcarce|el diario balcarce|accion 5|canal 5 balcarce|ahora balcarce|radio sudestada)\b/;

/** El medio hablando de sí mismo: su audiencia, su aniversario, su programación, su sede. */
const DE_SI_MISMO = /\b(record|records|audiencia|rating|exito rotundo|aniversario|anos al aire|\d+ anos (de vida|informando|publicando|junto a)|celebra sus|festeja sus|cumple sus|nuevo programa|nuevos programas|nueva temporada|programacion|grilla|stream|streaming|escuchanos|sintoniza\w*|seguinos|renovacion tecnologica|nuevos ciclos|nuevo estudio|nuevos estudios|rol periodistico|vias de contacto|sede legal)\b/;

/** El anuncio de una entrevista o un programa que va a salir en el medio. En pasado ("habló", "dijo") es noticia. */
const ANUNCIO = /\b(estara|estaran|dara|daran|hablara|hablaran|visitara|visitaran|brindara|brindaran|pasara por|en exclusiva|sera entrevistad[oa]s?|llega a los estudios|en los estudios de)\b/;

/** El medio nombrándose sin su nombre. */
const PROPIO_SIN_MARCA = /\b(nuestro programa|nuestros programas|nuestros estudios|nuestra radio|nuestra emisora|nuestra senal|nuestro canal|nuestros oyentes|este medio)\b|\bel diario (celebra|festeja|cumple)\b/;

/** Las mismas dos señales sin la marca, con "una radio" o "el stream" (vienen de la selección nueva que se ensayó en sombra
 *  el 16/10): "El abogado de Virginia Aparicio visita una radio local para hablar del caso". */
// Sin "programa" ni "llega a": "El Municipio llega a los barrios con el programa Envión" es noticia.
const ANUNCIO_EN_UN_MEDIO = /\b(visita|visitara|estara|estaran|pasara por|invitad[oa]s? (a|en))\b.{0,40}\b(radio|estudios|stream|streaming|la fm)\b/;
const UN_MEDIO_DE_SI = /\b(radio|fm|stream|streaming|canal|diario|portal|semanario)\b.{0,40}\b(record|cumple \d+|aniversario|audiencia|oyentes|seguidores|suscriptores|nueva programacion)\b/;

/** El sorteo del propio medio: para sus oyentes o seguidores (se mira en el título y el comienzo). */
const SORTEO = /\b(sorte\w*|ganate|gana|participa|concurso)\b/;
const DEL_PUBLICO_DEL_MEDIO = /\b(oyentes|seguidores|suscriptores|etiqueta\w*|comenta|comparti|compartir el posteo|dale like|me gusta|nuestras redes|nuestro instagram|nuestro facebook)\b/;

// ---------------------------------------------------------------- lo que el sitio ya tiene

/** Un pronóstico del día o de la semana: con forma de pronóstico, no sólo una palabra del clima ("el pronóstico de
 *  crecimiento del FMI" o "un giro de 180 grados" no son el clima). */
const PRONOSTICO = new RegExp([
  '\\bpronostico (del tiempo|extendido|meteorologico|para (hoy|manana|el fin de semana|esta semana|los proximos dias)|anticipa|indica|preve)\\b',
  '\\bse esperan? (lluvias|temperaturas|chaparrones|tormentas|heladas|lloviznas)\\b',
  '\\bla (maxima|minima) sera\\b',
  '\\b(maxima|minima|temperaturas?|termometros?|sensacion termica)\\b.{0,40}\\b\\d+ ?(grados|°)',
  '\\b\\d+ grados bajo cero\\b',
  '\\btemperaturas? que no superara\\w*',
  '\\bsemana (fresca|fria|calurosa|templada|humeda|lluviosa)\\b',
  '\\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo|jornada|fin de semana) (fresco|fresca|frio|fria|caluroso|calurosa|templado|templada|nublado|nublada|soleado|soleada|ventoso|ventosa|lluvioso|lluviosa|humedo|humeda|inestable)\\b',
].join('|'));
/** El clima del día de una ciudad, como lo titulan los diarios: "Clima hoy en Corrientes", "cómo estará el clima este
 *  viernes en Mar del Plata", "El tiempo en el AMBA para este viernes" (16/10, en los feeds de afuera). */
const CLIMA_DEL_DIA = /\b(clima|tiempo|pronostico) (hoy|de hoy|para hoy|del dia|para este|para esta|para el fin de semana|para manana)\b|\bcomo estara el (clima|tiempo)\b|^el tiempo en\b|\bclima en [a-z ]{3,30} (hoy|este|esta|para)\b/;
/** Lo que hace del clima una noticia: una alerta, un daño, un corte, algo que se suspende, o el campo. */
const EL_CLIMA_ES_NOTICIA = /\b(alerta\w*|temporal\w*|granizo\w*|tormentas? fuertes?|evacuad\w*|emergencia\w*|inundac\w*|anegad\w*|dano\w*|destrozo\w*|arboles caidos|caida de arboles|corte\w*|suspend\w*|cancel\w*|posterga\w*|record\w*|productores|cosecha\w*|siembra\w*|cultivo\w*|campo|agro\w*|agricol\w*|zona nucleo|el nino|la nina|sismo\w*|terremoto\w*|magnitud|helada\w* (afecta|dana|complica)\w*)\b/;

const FARMACIAS = /\b(farmacias? de turno|turnos? de (las )?farmacias|cronograma de (las )?farmacias|farmacias? de guardia)\b/;
/** Una noticia sobre las farmacias de turno (cambia el sistema, un reclamo): ésa sí es nota. */
const LAS_FARMACIAS_SON_NOTICIA = /\b(cambi\w*|nuevo sistema|nueva modalidad|reclam\w*|denunc\w*|ordenanza|concejo|proyecto|cierr\w*|robo|asalt\w*|falta de|sin farmacia)\b/;

// ---------------------------------------------------------------- un comercio presentado como nota

/** La red de lo evidente (lo demás, la IA): un descuento, cuotas, "consultas al WhatsApp" en el título. */
const COMERCIO = /\b(\d+ ?% (de descuento|off)|descuentos? de hasta|cuotas sin interes|2x1|liquidacion total|promo (especial|imperdible)|consultas al|pedidos al|reservas al|whatsapp)\b/;
/** Una campaña de la Cámara de Comercio, del Municipio o de un banco público es otra cosa: noticia para el vecino. */
const COMERCIO_QUE_ES_NOTICIA = /\b(camara|centro de comercio|comerciantes|municipio|municipal|municipalidad|gobierno|provincia|anses|banco provincia|cuenta dni|jubilad\w*)\b/;

/**
 * ¿Es esto algo que publicó un medio de Balcarce y no es una nota de Radar? Devuelve { tipo, motivo } o null.
 * Tipos: 'del-medio' (habla de sí: audiencia, aniversario, programación, sede), 'programacion' (anuncia su propia
 * entrevista o programa), 'sorteo-del-medio', 'clima' y 'farmacias' (el sitio ya los tiene), 'comercio'.
 *
 * @param {{ titulo?: string, cuerpo?: string, resumenFuente?: string, enlace?: string, alcance?: string }} nota
 */
export function porQueNoEsNota(nota = {}) {
  if (!nota || nota.oficial) return null;
  const titulo = plano(nota.titulo);
  if (!titulo) return null;
  const no = (tipo, que) => ({ tipo, motivo: `${MOTIVO_NO_ES_NOTA}: ${que}` });

  // De cualquier medio: el pronóstico del día y las farmacias de turno. El sitio tiene los suyos, y el de otra ciudad
  // ("Clima hoy en Corrientes", "cómo estará el clima este viernes en Mar del Plata") no le sirve a nadie de acá.
  if (FARMACIAS.test(titulo) && !LAS_FARMACIAS_SON_NOTICIA.test(titulo)) return no('farmacias', 'el cronograma de farmacias de otro medio (el sitio tiene su farmacia de turno)');
  if ((PRONOSTICO.test(titulo) || CLIMA_DEL_DIA.test(titulo)) && !EL_CLIMA_ES_NOTICIA.test(titulo)) return no('clima', 'el pronóstico de otro medio (el sitio tiene su clima)');

  // Lo demás, sólo de un medio de Balcarce.
  if (nota.alcance !== 'local') return null;
  // El título del medio y su dirección (la IA o el medio a veces cambian el título; la dirección queda).
  const cabeza = `${titulo} . ${tramoDeLaDireccion(nota.enlace)}`;
  const comienzo = plano(`${nota.titulo ?? ''} ${String(nota.cuerpo ?? nota.resumenFuente ?? '').slice(0, 600)}`);
  if ((MARCAS.test(titulo) && ANUNCIO.test(cabeza)) || ANUNCIO_EN_UN_MEDIO.test(titulo)) return no('programacion', 'el medio anuncia su propia entrevista o programa');
  if ((MARCAS.test(titulo) && DE_SI_MISMO.test(cabeza)) || PROPIO_SIN_MARCA.test(titulo) || UN_MEDIO_DE_SI.test(titulo)) return no('del-medio', 'el medio habla de sí mismo');
  if (SORTEO.test(titulo) && (MARCAS.test(titulo) || DEL_PUBLICO_DEL_MEDIO.test(comienzo))) return no('sorteo-del-medio', 'un sorteo del propio medio');
  if (COMERCIO.test(titulo) && !COMERCIO_QUE_ES_NOTICIA.test(titulo)) return no('comercio', 'la publicidad de un comercio (queda para la agenda comercial)');
  return null;
}

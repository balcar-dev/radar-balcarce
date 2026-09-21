// Qué se publica en las redes, y cuándo.
//
// Es la parte editorial de las redes, y por eso está separada de meta.mjs:
// una función pura que recibe las notas y el libro de lo ya publicado, y
// devuelve qué corresponde salir ahora. Sin red, sin reloj propio: se prueba
// entera.
//
// Reglas de fondo:
//
//   · Sólo sale lo que YA está en la portada. Si el semáforo lo frenó, acá ni
//     se ve, porque portada.json no lo trae.
//   · Política y Policiales no salen solos a las redes. En la web sí, con el
//     semáforo, pero en una red la nota viaja sin contexto y a un vecino lo
//     nombra un titular. Para esas secciones decide una persona.
//   · Una nota se publica una sola vez por red. El libro lo garantiza.
//   · Se espera un rato antes de publicar: el enlace tiene que existir en la
//     web, o Facebook guarda una tarjeta de "página no encontrada".

import { rutaDeNota } from '../web/lib/ruta.js';

export const REGLAS_FACEBOOK = {
  porDia: 2,               // como en REDES.md: dos del feed por día
  relevanciaMinima: 80,
  porCorrida: 1,           // así no salen dos pegadas
  minutosEntrePosteos: 90,
  esperaMinutos: 15,       // que el deploy de la web ya haya terminado
  edadMaximaHoras: 8,      // no se publica lo que ya es viejo
  desdeHora: 8,            // horario de Balcarce
  hastaHora: 22,
  seccionesQueEsperanPersona: ['Policiales', 'Política'],
};

const ZONA = 'America/Argentina/Buenos_Aires';

/** La hora (0 a 23) en Balcarce. */
export function horaAR(fecha) {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: ZONA }).format(fecha)) % 24;
}

/** El día en Balcarce como AAAA-MM-DD. */
export function diaAR(fecha) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(fecha);
}

/** El libro vacío. */
export const libroNuevo = () => ({ facebook: {}, instagram: {} });

export function yaPublicada(libro, red, id) {
  return Boolean(libro?.[red]?.[id]);
}

/** Anota una publicación. Devuelve el libro, para poder encadenar. */
export function anotar(libro, red, id, datos, ahora = new Date()) {
  libro[red] ??= {};
  libro[red][id] = { cuando: ahora.toISOString(), ...datos };
  return libro;
}

const minutosDesde = (iso, ahora) => (ahora.getTime() - new Date(iso).getTime()) / 60000;

/** Cuándo salió la nota a la web. Si no lo dice, se usa la fecha de la nota. */
const cuandoSalio = (n) => n.publicadaCuando ?? n.fecha ?? null;

/**
 * Las notas que corresponde publicar ahora en Facebook, en orden.
 * Puede devolver cero, y casi siempre lo hace: es lo normal.
 */
export function elegirParaFacebook({ notas, libro = libroNuevo(), ahora = new Date(), reglas = REGLAS_FACEBOOK }) {
  const hora = horaAR(ahora);
  if (hora < reglas.desdeHora || hora > reglas.hastaHora) return [];

  const hoy = diaAR(ahora);
  const previas = Object.values(libro.facebook ?? {});
  const deHoy = previas.filter((p) => diaAR(new Date(p.cuando)) === hoy);
  const cupo = reglas.porDia - deHoy.length;
  if (cupo <= 0) return [];

  const ultima = previas.reduce((max, p) => Math.max(max, new Date(p.cuando).getTime()), 0);
  if (ultima && (ahora.getTime() - ultima) / 60000 < reglas.minutosEntrePosteos) return [];

  const candidatas = notas.filter((n) => {
    if (yaPublicada(libro, 'facebook', n.id)) return false;
    if ((n.relevancia ?? 0) < reglas.relevanciaMinima) return false;
    if (reglas.seccionesQueEsperanPersona.includes(n.seccion)) return false;
    const salio = cuandoSalio(n);
    if (!salio) return false;
    const edad = minutosDesde(salio, ahora);
    return edad >= reglas.esperaMinutos && edad <= reglas.edadMaximaHoras * 60;
  });

  candidatas.sort((a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0));
  return candidatas.slice(0, Math.min(cupo, reglas.porCorrida));
}

/** El copete cortado en una palabra entera. */
function recortar(texto = '', maximo = 220) {
  const t = String(texto).replace(/\s+/g, ' ').trim();
  if (t.length <= maximo) return t;
  const corte = t.slice(0, maximo);
  return `${corte.slice(0, corte.lastIndexOf(' ') > 100 ? corte.lastIndexOf(' ') : maximo).replace(/[\s,.;:]+$/, '')}…`;
}

/** La dirección completa de la nota en NUESTRO sitio. */
export function enlaceDeNota(nota, sitio) {
  return `${String(sitio).replace(/\/+$/, '')}${rutaDeNota(nota)}`;
}

/**
 * El texto del posteo. Dice de dónde sale la información y, cuando la
 * redactó la IA, que fue la IA: es la regla de que cada nota diga quién la
 * escribió, y vale también afuera del sitio.
 */
export function mensajeDeNota(nota) {
  const partes = [nota.titulo];
  const copete = recortar(nota.copete);
  if (copete) partes.push(copete);

  const fuente = (nota.medios ?? []).join(', ');
  const linea = [fuente ? `Fuente: ${fuente}` : null, nota.publicadaPor === 'ia' ? 'Resumen hecho con IA' : null]
    .filter(Boolean).join(' · ');
  if (linea) partes.push(linea);

  return partes.join('\n\n');
}

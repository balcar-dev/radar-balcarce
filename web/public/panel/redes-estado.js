// Qué salió y qué no, red por red (1/10/2026, Hernán: "la división: si es reel,
// historia, y si es Facebook o Instagram, y un botón para tratar que salga si no
// salió, y entender por qué fallan"). Sin nada del DOM: se prueba con Node
// (pruebas/redes-estado.test.mjs).
//
// De dónde sale cada cosa (web/data/redes.json, el libro de publicaciones):
//   instagram[dia/pieza]               el reel o la historia en Instagram
//   facebookVideos[dia/pieza]          lo mismo en Facebook
//   historiasDeReels[red/dia/pieza]    la historia que acompaña a un reel
//   problemas[dia/pieza/red/parte]     lo que falló y por qué (redes/publicar-piezas.mjs)

import { estadoDePieza } from './textos.js';

export const NOMBRE_DE_RED = { instagram: 'Instagram', facebook: 'Facebook' };
export const NOMBRE_DE_PARTE = { reel: 'Reel', historia: 'Historia', 'historia-del-reel': 'Historia del reel' };

/** Las partes de una pieza, en orden: un reel sale como reel y además como historia, en las dos redes; una historia, sólo como historia. */
export function partesDeLaPieza(pieza) {
  const partes = pieza.tipo === 'reel' ? ['reel', 'historia-del-reel'] : ['historia'];
  return ['instagram', 'facebook'].flatMap((red) => partes.map((parte) => ({ red, parte })));
}

/** Por qué falló algo, en castellano, con lo que conviene hacer. */
export function explicarFalloDeRed(error = '') {
  const e = String(error ?? '');
  if (!e) return 'No salió y no quedó anotado por qué. Probá reintentarla.';
  if (/token|oauth|\b190\b|expired|venci|revoc/i.test(e)) return 'El token de Meta venció o lo revocaron: hay que generar otro (eso lo hace una persona).';
  if (/max duration|duraci[oó]n|too long|61|60 s/i.test(e)) return 'El video dura más de lo que acepta una historia (60 segundos).';
  if (/rate|limit|l[ií]mite|too many|\(#4\)|\(#32\)|\b613\b/i.test(e)) return 'Se llegó al límite de publicaciones que Meta permite: hay que esperar un rato.';
  if (/Request processing failed|\(400\)|subida del video fall/i.test(e)) return 'Meta rechazó el video mientras lo procesaba. Suele ser un problema pasajero de ellos: reintentar casi siempre lo arregla.';
  if (/timeout|tard[oó]|tiempo/i.test(e)) return 'Meta tardó demasiado en contestar. Reintentar suele funcionar.';
  return `Meta contestó: ${e.slice(0, 140)}`;
}

/**
 * El estado de una parte de una pieza hoy.
 * @returns {{ clase: 'ok'|'mal'|'espera', texto: string, cuando: string|null, error: string|null, puedeReintentar: boolean }}
 */
export function estadoDeParte({ libro = {}, dia, pieza, red, parte, ahora = new Date() }) {
  const clave = `${dia}/${pieza.nombre}`;
  const salio = parte === 'historia-del-reel'
    ? libro.historiasDeReels?.[`${red}/${clave}`]
    : (red === 'instagram' ? libro.instagram : libro.facebookVideos)?.[clave];
  if (salio) return { clase: 'ok', texto: estadoDePieza({ hora: pieza.hora, ventana: pieza.ventana, salio: salio.cuando }, ahora).texto, cuando: salio.cuando ?? null, error: null, puedeReintentar: false };

  const problema = libro.problemas?.[`${clave}/${red}/${parte}`];
  if (problema) return { clase: 'mal', texto: 'No salió', cuando: problema.cuando ?? null, error: problema.error ?? '', puedeReintentar: true };

  // La historia de un reel sólo se intenta cuando sale el reel: si el reel salió en esa red y ella no, falló sin quedar anotado (antes del 1/10).
  if (parte === 'historia-del-reel') {
    const reel = (red === 'instagram' ? libro.instagram : libro.facebookVideos)?.[clave];
    if (reel) return { clase: 'mal', texto: 'No salió', cuando: null, error: '', puedeReintentar: true };
    return { clase: 'espera', texto: 'Sale junto con el reel', cuando: null, error: null, puedeReintentar: false };
  }
  const e = estadoDePieza({ hora: pieza.hora, ventana: pieza.ventana, salio: null }, ahora);
  // Pasó su horario y no salió ni dejó un problema anotado: nunca llegó a intentarse (o es de antes del 1/10): sólo se puede esperar.
  return { clase: e.clase, texto: e.texto, cuando: null, error: null, puedeReintentar: false };
}

/** Los problemas de hoy que siguen sin resolverse: [{ pieza, red, parte, error, cuando }]. */
export function problemasDeHoy(libro = {}, dia) {
  return Object.entries(libro.problemas ?? {}).filter(([k]) => k.startsWith(`${dia}/`)).map(([, v]) => v);
}

/** Todo el estado de hoy, pieza por pieza: [{ pieza, partes: [{ red, parte, ...estado }] }]. */
export function estadoPorRed({ libro = {}, piezas = [], dia, ahora = new Date() }) {
  return piezas.map((pieza) => ({
    pieza,
    partes: partesDeLaPieza(pieza).map((p) => ({ ...p, ...estadoDeParte({ libro, dia, pieza, ...p, ahora }) })),
  }));
}

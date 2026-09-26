// La parte pura de la auditoría de voz: qué clips se prueban y cómo se juzga lo
// que Gemini transcribe. La parte que llama a Gemini está en reels/auditar-voz.mjs.
//
// Se puede probar sin red y sin ffmpeg (pruebas/redes-criterio.test.mjs). Sin
// dependencias de afuera de Node.

import {
  SALUDOS, CIERRES_HUMANOS, firmasConDireccion, cierreDePodcast,
} from './guiones.mjs';
import { SITIO_DICHO } from './prompt-redes.mjs';

const fecha = (dia) => new Date(`${dia}T12:00:00-03:00`);

/** Lo que dice cada momento del día al saludar, y lo que NO puede decir. */
const SALUDO_ESPERADO = {
  manana: { debe: /buen dia/, noDebe: [/buenas tardes/, /buenas noches/] },
  tarde: { debe: /buenas tardes/, noDebe: [/buen dia/, /buenas noches/] },
  noche: { debe: /buenas noches/, noDebe: [/buen dia/, /buenas tardes/] },
};

/**
 * Los clips de prueba: textos cortos armados con las MISMAS piezas del libro de
 * recursos que usa producción. Cada uno dice la dirección al menos una vez.
 *   saludo: el momento cuyo saludo se comprueba (o null si el clip no saluda)
 */
export function clipsDeAuditoria() {
  const nocheDe = (m) => `${SALUDOS[m][0]} ${cierreDePodcast(m, { fecha: fecha('2026-09-25'), direccion: true })}`;
  return [
    { id: 'podcast-manana', momento: 'manana', saludo: 'manana', texto: nocheDe('manana') },
    { id: 'podcast-tarde', momento: 'tarde', saludo: 'tarde', texto: nocheDe('tarde') },
    { id: 'podcast-noche', momento: 'noche', saludo: 'noche', texto: nocheDe('noche') },
    {
      id: 'clima-noche',
      momento: 'noche',
      saludo: 'noche',
      texto: `${SALUDOS.noche[0]} ${CIERRES_HUMANOS.noche[0]} ${firmasConDireccion(SITIO_DICHO, 'general')[0]}`,
    },
    // Todas las frases con la dirección, en dos clips: nada se queda sin probar.
    { id: 'direccion-podcasts', momento: 'tarde', saludo: null, texto: firmasConDireccion(SITIO_DICHO, 'podcast').join(' ') },
    { id: 'direccion-clima-y-semanales', momento: 'manana', saludo: null, texto: firmasConDireccion(SITIO_DICHO, 'general').join(' ') },
  ];
}

/** Formas alternativas de decir la dirección, para explorar si la voz insiste en
 *  agregar ".ar". Sólo se usan con --explorar. */
export function variantesDeLaDireccion() {
  return [
    { id: 'variante-coma', dicho: 'Radar Balcarce, punto com' },
    { id: 'variante-junto', dicho: 'radarbalcarce, todo junto, punto com' },
    { id: 'variante-corte', dicho: 'Radar Balcarce punto com, y nada más' },
  ];
}

const sinAcentos = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const llano = (t) => sinAcentos(t).replace(/[^a-z0-9.]+/g, ' ').trim();

// En castellano la b y la v suenan igual, y la c ante e/i suena como la s: el
// transcriptor, que no conoce "Balcarce", escribió "Valcarce" (auditoría del
// 26/09) aunque la voz dijo bien el nombre. Se compara por cómo suena, no por
// cómo se escribe. Sólo para el nombre del medio: lo de ".ar" se busca en lo escrito.
const comoSuena = (t) => llano(t).replace(/v/g, 'b').replace(/z/g, 's').replace(/c(?=[ei])/g, 's');

/** Cuántas veces aparece la dirección en la transcripción: dicha ("punto com")
 *  o escrita como la suele devolver el transcriptor ("radarbalcarce.com"). */
export function cuantasDirecciones(transcripcion) {
  const t = llano(transcripcion);
  return (t.match(/punto com\b|radar ?balcarce\.com\b|\.com\b/g) ?? []).length;
}

/**
 * Juzga la transcripción de un clip. Devuelve la lista de fallas: vacía = PASA.
 *   · aparece "Radar Balcarce";
 *   · si el guion dice la dirección, la transcripción la trae tantas veces como
 *     el guion, y nunca con ".ar", "punto ar" ni ".com.ar";
 *   · el saludo es el de la hora y ninguno de los otros.
 */
export function revisarTranscripcion({ guion, transcripcion, saludo = null }) {
  const fallas = [];
  const crudo = String(transcripcion ?? '').toLowerCase();
  const t = llano(transcripcion);
  if (!t) return ['no hubo transcripción'];

  if (!/radar ?balcarse/.test(comoSuena(transcripcion))) fallas.push('no se oye "Radar Balcarce"');

  const esperadas = (String(guion).match(/punto com/gi) ?? []).length;
  if (esperadas) {
    const halladas = cuantasDirecciones(transcripcion);
    if (halladas < esperadas) fallas.push(`el guion dice "punto com" ${esperadas} vez/veces y la transcripción trae ${halladas}`);
  }
  if (/\.com\.ar|\.ar\b/.test(crudo) || /punto ar\b|punto a ere\b|punto a r\b|com punto ar\b|com ar\b/.test(t)) {
    fallas.push('la voz agregó ".ar" a la dirección');
  }

  if (saludo) {
    const regla = SALUDO_ESPERADO[saludo];
    if (!regla.debe.test(t)) fallas.push(`falta el saludo de la ${saludo === 'manana' ? 'mañana' : saludo}`);
    for (const otro of regla.noDebe) if (otro.test(t)) fallas.push(`saluda con otro horario (${otro.source})`);
  }
  return fallas;
}

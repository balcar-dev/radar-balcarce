// Las piezas para invitar a participar (IDEAS 18; cronograma del 30/09): una historia con voz
// a las 12:00, cuatro días por semana, cada una con su pregunta. Acá está lo que dice cada una;
// la placa es placaParticipa (reels/placa.mjs) y el día y la hora, panel/horarios.mjs.
// Sin dependencias de afuera de Node.

import { semillaDe, variante } from './guiones.mjs';

export const WHATSAPP = '2266 51-1612';
/** El mail de la redacción (6/10): reenvía a la cuenta del medio con Cloudflare Email Routing. Los otros: contacto@ (lectores y comercios) y publicidad@. */
export const MAIL_REDACCION = 'redaccion@radarbalcarce.com';

/** Cada pieza: su id en el cronograma, el día (0 = domingo), el color de su sección y lo que dice. */
export const PIEZAS_PARTICIPA = {
  'participa-noticias': {
    dia: 1, nombre: 'Participá con noticias', rotulo: 'Participá', seccion: 'Balcarce',
    pregunta: '¿Viste algo que tendría que ser noticia?', pie1: 'Mandanos la foto o el dato.', pie2: 'Antes de publicar, lo chequeamos.',
    sub: 'Mandanos la foto o el dato',
    voz: ['¿Viste algo que tendría que ser noticia? Mandanos la foto o el dato.'],
  },
  'participa-evento': {
    dia: 2, nombre: 'Tu evento o emprendimiento', rotulo: 'Tu evento', seccion: 'Cultura y agenda',
    pregunta: '¿Tenés un evento o un emprendimiento?', pie1: 'Sumalo a la agenda: contanos qué, cuándo y dónde.', pie2: 'Lo chequeamos antes de publicarlo.',
    sub: 'Sumalo a la agenda de Balcarce',
    voz: ['¿Organizás un evento o tenés un emprendimiento? Sumalo a la agenda: contanos qué, cuándo y dónde.'],
  },
  'participa-reclamos': {
    dia: 3, nombre: 'Tu reclamo', rotulo: 'Tu reclamo', seccion: 'Balcarce',
    pregunta: '¿Hay algo en tu cuadra que hace rato espera arreglo?', pie1: 'Contanos qué y dónde.', pie2: 'Lo chequeamos antes de publicar.',
    sub: 'Contanos qué y dónde',
    voz: ['¿Hay algo en tu cuadra que hace rato espera arreglo? Contanos qué y dónde.'],
  },
  'participa-nota': {
    dia: 5, nombre: 'Tu nota', rotulo: 'Tu nota', seccion: 'Cultura y agenda',
    pregunta: '¿Tu club, tu escuela o tu grupo tiene algo para contar?', pie1: 'Escribinos y lo miramos.', pie2: 'Antes de publicar, lo chequeamos.',
    sub: 'Escribinos y lo miramos',
    voz: ['¿Tu club, tu escuela o tu grupo tiene algo para contar? Escribinos y lo miramos.'],
  },
};

export const IDS_PARTICIPA = Object.keys(PIEZAS_PARTICIPA);

const SALUDOS = {
  manana: ['Buen día, Balcarce.', 'Buen día.'],
  tarde: ['Buenas tardes, Balcarce.', 'Buenas tardes.'],
  noche: ['Buenas noches, Balcarce.', 'Buenas noches.'],
};

/** Lo que dice la locutora: saludo, la pregunta y cómo escribir (el número va en la placa, no se lee). */
export function guionParticipa(id, { fecha = new Date(), momento = 'manana' } = {}) {
  const p = PIEZAS_PARTICIPA[id];
  if (!p) return '';
  const s = semillaDe(id, fecha);
  return [variante(SALUDOS[momento] ?? SALUDOS.manana, s, 'saludo'), ...p.voz, 'Escribinos por WhatsApp o por mail: los datos están en pantalla.', 'Radar Balcarce.'].join(' ');
}

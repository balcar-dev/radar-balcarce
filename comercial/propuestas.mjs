// Las propuestas comerciales: qué se le ofrece a cada uno y cómo se le escribe.
//
// Sirve para dos cosas a la vez: (1) confirmar que el comercio sigue activo
// —una respuesta a un mensaje vale más que cualquier señal— y (2) abrir la
// conversación comercial. Por eso el primer mensaje casi nunca vende: pregunta
// y ofrece algo gratis.
//
// Todo acá es texto y enlaces. Nada se envía solo: el enlace abre WhatsApp con
// el mensaje ya escrito y lo manda una persona. Es a propósito:
//   · WhatsApp bloquea las cuentas que mandan mensajes masivos.
//   · En un pueblo, un mensaje de una persona que se presenta cae distinto que
//     un envío automático.
//   · La ley 26.951 (No Llame) y la de protección de datos personales piden que
//     quien recibe pueda decir que no: cada mensaje lo ofrece.
//
// Funciones puras, sin red.

/** Lo que se le puede proponer a un comercio, de lo más suave a lo más comercial. */
export const OFERTAS = {
  confirmar: {
    nombre: 'Confirmar datos',
    para: 'Todos. Es el primer mensaje: valida que siguen abiertos y no vende nada.',
  },
  'sumarse-gratis': {
    nombre: 'Sumarse gratis a la guía',
    para: 'Comercios con ficha completa o que confirmaron. La entrada al resto.',
  },
  colaboracion: {
    nombre: 'Colaboración',
    para: 'Un intercambio sin plata: mención en historias o podcasts a cambio de algo (un premio, contar su novedad, una nota).',
  },
  sorteo: {
    nombre: 'Sorteo conjunto',
    para: 'Comercios con Instagram activo: sortean algo y les suma seguidores a los dos.',
  },
  publicidad: {
    nombre: 'Publicidad',
    para: 'Aviso fijo en la web, mención en los podcasts o historia propia. Paga.',
  },
  servicios: {
    nombre: 'Servicios digitales',
    para: 'Una página web, una tienda, una app o un sistema a medida. Para quien no tiene web o la tiene abandonada.',
  },
};

/** Los servicios que se pueden ofrecer, con qué comercio encajan. */
export const CATALOGO = [
  { id: 'ficha-basica', nombre: 'Ficha en la guía y el mapa', precio: 'Gratis', encaja: 'Todos' },
  { id: 'ficha-destacada', nombre: 'Ficha destacada (aparece primero en su rubro, con fotos y horarios)', precio: 'Abono mensual', encaja: 'Con ficha completa' },
  { id: 'aviso-fijo', nombre: 'Aviso fijo en la web (3 espacios)', precio: 'Abono mensual', encaja: 'Con presupuesto de publicidad' },
  { id: 'mencion-podcast', nombre: 'Mención en los podcasts diarios', precio: 'Por semana o por mes', encaja: 'Gastronomía, comercios de barrio, servicios' },
  { id: 'historia', nombre: 'Historia propia en Instagram y Facebook', precio: 'Por publicación', encaja: 'Con promoción o novedad' },
  { id: 'sorteo', nombre: 'Sorteo conjunto', precio: 'Sin costo (intercambio) o con premio a cargo del comercio', encaja: 'Con Instagram activo' },
  { id: 'nota-patrocinada', nombre: 'Nota patrocinada, siempre marcada como tal', precio: 'Por nota', encaja: 'Empresas con algo que contar' },
  { id: 'web', nombre: 'Página web o tienda online simple', precio: 'Proyecto + mantenimiento', encaja: 'Sin web, o con una abandonada' },
  { id: 'app', nombre: 'App o sistema a medida (turnos, pedidos, catálogo, stock)', precio: 'Proyecto', encaja: 'Empresas medianas, industria, agro, profesionales' },
  { id: 'marketing', nombre: 'Manejo de redes, contenido y campañas', precio: 'Abono mensual', encaja: 'Con redes abandonadas' },
];

/** Quién soy y cómo se sale: va al pie de todos los mensajes. */
export const PIE = 'Si no querés que te escribamos más, decímelo y listo.';

const saludo = (f) => `Hola, ¿cómo están? Soy de Radar Balcarce (radarbalcarce.com), el medio digital de Balcarce.`;

const CUERPOS = {
  confirmar: (f) => `${saludo(f)} Estamos armando una guía de comercios, servicios y empresas de Balcarce con un mapa, y quería confirmar que los datos de ${f.nombre} estén bien${f.direccion?.texto ? ` (${f.direccion.texto}` + `${f.contacto?.telefono ? `, ${f.contacto.telefono}` : ''})` : ''}. ¿Siguen atendiendo? ¿Me pasan el horario?`,
  'sumarse-gratis': (f) => `${saludo(f)} Estamos armando una guía gratuita de comercios y servicios de Balcarce, con mapa, horarios y contacto, y nos gustaría que ${f.nombre} esté. No tiene ningún costo. ¿Nos confirman los datos y quieren sumar fotos o promociones?`,
  colaboracion: (f) => `${saludo(f)} Nos gustaría hacer algo en conjunto con ${f.nombre}: mencionarlos en nuestras historias y podcasts a cambio de que nos cuenten alguna novedad o nos den algo para regalar entre los seguidores. Sin plata de por medio. ¿Les interesa que lo charlemos?`,
  sorteo: (f) => `${saludo(f)} Estamos armando un sorteo entre comercios de Balcarce y nos gustaría sumar a ${f.nombre}: ustedes ponen un premio (lo que quieran) y lo sorteamos entre los seguidores de los dos, con mención en historias y en el podcast. Les suma seguidores y clientes, y a nosotros también. ¿Les interesa?`,
  publicidad: (f) => `${saludo(f)} Tenemos espacios para que ${f.nombre} se muestre a los vecinos: un aviso fijo en la web al lado del clima y la farmacia de turno, menciones en los podcasts diarios o una historia propia. Puedo pasarles cómo se ve y los valores. ¿Les interesa?`,
  servicios: (f) => `${saludo(f)} Además del medio, hacemos páginas web, tiendas online y sistemas a medida para negocios y empresas de acá. Vimos que ${f.nombre} ${f.contacto?.web ? 'tiene una web que se podría mejorar' : 'todavía no tiene web'}. ¿Les sirve que les cuente qué podríamos armarles?`,
};

/** El texto del mensaje, listo para copiar. */
export function mensajePara(ficha, oferta = 'confirmar') {
  const cuerpo = CUERPOS[oferta];
  if (!cuerpo) throw new Error(`oferta desconocida: ${oferta}`);
  return `${cuerpo(ficha)} ${PIE}`;
}

/** El teléfono en formato wa.me (sólo dígitos, con el 9 de los celulares), o null. */
export function numeroParaWhatsApp(telefono) {
  const d = String(telefono ?? '').replace(/[^\d]/g, '');
  if (!d) return null;
  // +54 2266 42-1234 → 54 2266 421234: para WhatsApp hace falta el 9 después del 54.
  const sin54 = d.startsWith('54') ? d.slice(2) : d;
  if (sin54.length < 10) return null;
  return `549${sin54.replace(/^9/, '')}`;
}

/** El enlace que abre WhatsApp con el mensaje escrito, o null si no hay número. */
export function enlaceWhatsApp(ficha, oferta = 'confirmar') {
  const n = numeroParaWhatsApp(ficha.contacto?.whatsapp ?? ficha.contacto?.telefono);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(mensajePara(ficha, oferta))}`;
}

/**
 * Qué conviene proponerle primero a un comercio, según lo que se sabe de él.
 * Siempre se empieza confirmando; lo demás depende de con qué cuenta.
 */
export function ofertaSugerida(ficha) {
  const c = ficha.comercial ?? {};
  if (!c.confirmadoPorElComercio) return 'confirmar';
  if (!ficha.contacto?.web && ficha.rubro !== 'Educación y cultura') return 'servicios';
  if (ficha.redes?.instagram) return 'sorteo';
  return 'sumarse-gratis';
}

/** Los estados por los que pasa una propuesta. */
export const ETAPAS = ['sin-contactar', 'contactado', 'respondio', 'interesado', 'cliente', 'no-interesa'];

/** Anota que se le escribió, sin pisar el resto de la ficha. */
export function anotarContacto(ficha, oferta, ahora = new Date()) {
  const c = (ficha.comercial ??= {});
  c.contactado = true;
  c.propuesta = { ...(c.propuesta ?? {}), oferta, etapa: 'contactado', ultimoContacto: ahora.toISOString() };
  return ficha;
}

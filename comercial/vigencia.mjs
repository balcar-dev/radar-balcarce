// ¿Sigue abierto? Se cruzan varias señales y se saca un puntaje de 0 a 100.
//
// Ninguna señal alcanza sola: un sitio web caído no dice que el negocio cerró,
// y una ficha vieja en OpenStreetMap no dice que no exista. Por eso se suman
// varias, y lo único que decide un "cerrado" sin discusión es que alguien lo
// haya marcado así (en el mapa, o el propio comercio).
//
// Función pura: recibe la ficha y lo que se observó, devuelve el resultado.
// Lo que baja datos de la red está en verificar.mjs.

const MESES = (desde, ahora) => (ahora.getTime() - new Date(desde).getTime()) / (30.44 * 86400000);

/**
 * @param {object} ficha
 * @param {object} obs   lo observado
 * @param {{ ok: boolean, estado?: number }|null} [obs.web]      si el sitio del comercio responde
 * @param {number} [obs.mencionesEnNotas]  cuántas notas de los últimos 60 días nombran al comercio
 * @param {boolean} [obs.enOtraFuente]     figura en otra fuente independiente (Cámara, municipio…)
 * @param {Date} [ahora]
 */
export function evaluarVigencia(ficha, obs = {}, ahora = new Date()) {
  const senales = [];
  let puntaje = 30;
  const suma = (n, texto) => { puntaje += n; senales.push(`${n > 0 ? '+' : ''}${n} ${texto}`); };

  // Lo que decide sin discusión
  if (ficha.comercial?.cerradoConfirmado || ficha.fuentes?.some((f) => f.cerrado)) {
    return { estado: 'cerrado', puntaje: 0, ultimaVerificacion: ahora.toISOString(), senales: ['marcado como cerrado'] };
  }

  const confirmado = ficha.comercial?.confirmadoPorElComercio;
  if (confirmado) {
    const meses = ficha.comercial?.confirmadoEl ? MESES(ficha.comercial.confirmadoEl, ahora) : 0;
    suma(meses <= 12 ? 40 : 15, `confirmado por el propio comercio${meses > 12 ? ' (hace más de un año)' : ''}`);
  }

  // Las fuentes: qué tan reciente es lo último que se supo
  const edicion = ficha.fuentes?.map((f) => f.editadoEnOSM).filter(Boolean).sort().at(-1);
  if (edicion) {
    const m = MESES(edicion, ahora);
    if (m <= 24) suma(10, 'la ficha se tocó en el mapa hace menos de dos años');
    else if (m > 60) suma(-10, 'nadie toca su ficha en el mapa hace más de cinco años');
  }
  if (ficha.horarios) suma(8, 'tiene horarios cargados');
  if (obs.enOtraFuente) suma(15, 'figura en otra fuente independiente');

  // Lo que se ve desde afuera
  if (obs.web) {
    if (obs.web.ok) suma(15, 'su sitio web responde');
    else suma(-15, `su sitio web no responde${obs.web.estado ? ` (HTTP ${obs.web.estado})` : ''}`);
  }
  if ((obs.mencionesEnNotas ?? 0) > 0) suma(Math.min(20, 10 + obs.mencionesEnNotas * 5), `lo nombraron ${obs.mencionesEnNotas} nota(s) de los últimos 60 días`);

  // Sin forma de contactarlo no se puede confirmar nada
  if (!ficha.contacto?.telefono && !ficha.contacto?.whatsapp && !ficha.redes?.instagram && !ficha.redes?.facebook && !ficha.contacto?.web) {
    suma(-5, 'no tiene ningún dato de contacto');
  }

  puntaje = Math.max(0, Math.min(100, puntaje));
  const estado = puntaje >= 60 ? 'activo' : puntaje >= 35 ? 'dudoso' : 'a-confirmar';
  return { estado, puntaje, ultimaVerificacion: ahora.toISOString(), senales };
}

/** Qué falta hacer con cada ficha: la lista de trabajo para confirmar. */
export function accionSugerida(ficha) {
  const v = ficha.vigencia ?? {};
  const contacto = ficha.contacto ?? {};
  if (v.estado === 'cerrado') return 'sacar de la guía';
  if (ficha.comercial?.confirmadoPorElComercio && v.estado === 'activo') return 'ninguna';
  if (contacto.whatsapp || contacto.telefono) return 'mandarle un WhatsApp o llamarlo para confirmar';
  if (ficha.redes?.instagram || ficha.redes?.facebook) return 'escribirle por su red social';
  if (ficha.direccion?.texto) return 'pasar por la dirección';
  return 'buscar cómo contactarlo';
}

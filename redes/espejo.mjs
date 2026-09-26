// El espejo de un posteo de Facebook en el feed de Instagram, y su reintento.
//
// Cada posteo de Facebook se espeja como foto en Instagram (redes/publicar.mjs).
// Si ese espejo falla, el posteo ya quedó en Facebook y elegirParaFacebook no
// vuelve a mirarlo: el espejo se perdía para siempre. El 25/09 (01:25 UTC) pasó:
// "Only photo or video can be accepted as media type", casi seguro porque la
// tarjeta de la nota (/nota/ID/instagram.png) todavía no estaba en la web (el
// posteo sale a los 15 minutos de la nota y el sitio se arma cada 30). Con el
// contrato del día (redes/contrato.mjs) el hueco se ve: Instagram 4/5.
//
// Acá se decide cuáles reintentar: los posteos de Facebook de las últimas
// horas que no tienen su foto, con un tope de intentos por posteo. Función pura.
//
// Sin dependencias: sólo lo que trae Node.

export const ESPEJO = {
  horasDeReintento: 12,    // más viejo que esto, el espejo ya no tiene sentido
  intentosMaximos: 4,      // por posteo (uno por vuelta del reloj, cada 30 minutos)
};

/**
 * Las notas cuyo posteo de Facebook salió y todavía no tienen su foto en
 * Instagram, en orden de antigüedad.
 *
 * @param {object[]} o.notas   portada.json → notas (hace falta la nota para armar la tarjeta y el pie)
 * @param {object} o.libro
 * @returns {object[]} las notas a espejar
 */
export function espejosPendientes({ notas = [], libro = {}, ahora = new Date(), reglas = ESPEJO }) {
  const limite = ahora.getTime() - reglas.horasDeReintento * 3600e3;
  const porId = new Map(notas.map((n) => [n.id, n]));
  return Object.entries(libro?.facebook ?? {})
    .filter(([id, p]) => p?.cuando && new Date(p.cuando).getTime() >= limite && porId.has(id))
    .filter(([id]) => !libro?.instagramFeed?.[id])
    .filter(([, p]) => (p.intentosEspejo ?? 0) < reglas.intentosMaximos)
    .sort(([, a], [, b]) => new Date(a.cuando) - new Date(b.cuando))
    .map(([id]) => porId.get(id));
}

// Manda un WhatsApp con CallMeBot, un servicio gratuito pensado para avisarse
// a uno mismo.
//
// Cómo se activa (una sola vez, lo hace la persona dueña del número):
//   1. Agregar al teléfono el contacto de CallMeBot. El número CAMBIA de vez en
//      cuando (el 24/09 era +34 694 23 41 84): se mira en https://www.callmebot.com
//   2. Mandarle por WhatsApp: "I allow callmebot to send me messages".
//   3. Contesta con una clave (apikey). Esa clave y el número van a GitHub
//      Secrets: WHATSAPP_TELEFONO (con código de país, ej. 5492266123456) y
//      WHATSAPP_APIKEY. Nunca en el código ni en un chat.
//
// Sólo sirve para avisar a la persona que lo activó, no para mandar mensajes a
// terceros. La clave viaja en la dirección del pedido, así que no se muestra en
// ningún error ni registro.

const ENDPOINT = 'https://api.callmebot.com/whatsapp.php';

/** Saca la clave y el teléfono de cualquier texto que se vaya a mostrar. */
export function sinSecretos(texto, ...secretos) {
  let t = String(texto ?? '');
  for (const s of secretos.filter(Boolean)) t = t.split(s).join('***');
  return t;
}

/**
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function enviarWhatsApp({ telefono, apikey, texto, fetchFn = fetch }) {
  const numero = String(telefono ?? '').replace(/[^\d]/g, '');
  if (!numero || !apikey) return { ok: false, error: 'falta el teléfono o la clave' };
  if (!texto) return { ok: false, error: 'mensaje vacío' };

  const url = `${ENDPOINT}?phone=${numero}&text=${encodeURIComponent(String(texto).slice(0, 1000))}&apikey=${encodeURIComponent(apikey)}`;
  try {
    const r = await fetchFn(url, { signal: AbortSignal.timeout(20000) });
    const cuerpo = await r.text();
    // CallMeBot contesta 200 o 203 SIEMPRE, con el error o el éxito en el texto, y en
    // los dos casos repite el destino y el mensaje que mandamos. Sólo es éxito si
    // dice que quedó en cola; el eco de nuestro texto se saca antes de mirar, porque
    // el propio mensaje puede decir "error". (El 25/09 se dio por bueno un
    // "APIKey is invalid" y nunca llegó ningún aviso.)
    const sinEco = cuerpo.replace(/Text to send:.*?(?=(APIKey|Message queued|You will|Please|$))/is, ' ');
    const encolado = /message queued|you will receive/i.test(sinEco);
    if (!r.ok || !encolado || /error|invalid|not activated|blocked/i.test(sinEco)) {
      return { ok: false, error: sinSecretos(`HTTP ${r.status} ${cuerpo.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(-160)}`, apikey, numero) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: sinSecretos(e.message, apikey, numero) };
  }
}

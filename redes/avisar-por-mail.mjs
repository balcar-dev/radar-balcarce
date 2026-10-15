// Los avisos de GitHub salen por MAIL (regla 173, 15/10/2026). Desde el 1/10 el cupo de CallMeBot (WhatsApp) estaba muerto y nadie se enteraba:
// ahora el aviso va al Worker de Cloudflare `radar-balcarce-vigilante` (POST /avisar, infra/vigilante-cloudflare/worker.mjs), que ya sabe mandar
// mail a radarbalcarce@gmail.com, y WhatsApp queda sólo de respaldo (`avisar`): si el mail no sale, o no hay VIGILANTE_TOKEN, se intenta por ahí.
//
// Sin dependencias: sólo fetch. Nunca tira: devuelve { ok, motivo } y quien llama decide. El token viaja SÓLO en el encabezado x-token y jamás
// aparece en un motivo ni en un registro.

import { enviarWhatsApp, sinSecretos } from './whatsapp.mjs';

export const AVISOS_URL = 'https://radar-balcarce-vigilante.radarbalcarce.workers.dev/avisar';
export const ESPERA_MAXIMA_MS = 15000;

/**
 * El asunto de un mail a partir del texto del WhatsApp: la primera línea con algo (menos el "Radar Balcarce" suelto de la cabecera), sin
 * emojis ni símbolos al principio ni los dos puntos del final, cortada en palabra entera. El Worker le pone "[Radar Balcarce]" y, si el
 * nivel es "alta", "URGENTE".
 */
export function asuntoDe(texto = '') {
  const lineas = String(texto ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const linea = lineas.find((l) => !/^radar balcarce$/i.test(l)) ?? lineas[0] ?? '';
  const limpia = linea
    .replace(/^[^\p{L}\p{N}]+/u, '')            // emojis, viñetas, símbolos
    .replace(/^ℹ️?\s*/u, '')          // el "ℹ️" del vigilante cuenta como letra para Unicode
    .replace(/^radar balcarce:\s*/i, '')
    .replace(/[\s:;,.]+$/, '')
    .replace(/\s+/g, ' ');
  if (!limpia) return 'Aviso';
  if (limpia.length <= 110) return limpia;
  const corte = limpia.slice(0, 109);
  const espacio = corte.lastIndexOf(' ');
  return `${(espacio > 55 ? corte.slice(0, espacio) : corte).replace(/[\s,.;:]+$/, '')}…`;
}

/** ¿Hay con qué avisar por mail? (el token del vigilante). */
export const hayMail = (env = process.env) => Boolean(String(env?.VIGILANTE_TOKEN ?? '').trim());
/** ¿Hay con qué avisar por WhatsApp (el respaldo)? */
export const hayWhatsApp = (env = process.env) => Boolean(String(env?.WHATSAPP_TELEFONO ?? '').trim() && String(env?.WHATSAPP_APIKEY ?? '').trim());

/**
 * Manda un aviso por mail a través del Worker.
 *
 * @param {{ asunto?: string, texto: string, clave?: string, nivel?: string }} aviso
 *   `clave`: si se da, el Worker no repite esa misma clave en 6 horas. `nivel`: 'alta' | 'media' | 'info' (alta lleva "URGENTE" en el asunto).
 * @returns {Promise<{ ok: boolean, motivo?: string, repetido?: boolean }>}  `repetido`: el Worker ya había mandado esa clave hace poco (cuenta como ok).
 */
export async function avisarPorMail({ asunto, texto, clave, nivel } = {}, { fetchFn = fetch, env = process.env } = {}) {
  const token = String(env?.VIGILANTE_TOKEN ?? '').trim();
  if (!token) return { ok: false, motivo: 'no hay VIGILANTE_TOKEN' };
  if (!String(texto ?? '').trim()) return { ok: false, motivo: 'mensaje vacío' };
  const url = String(env?.AVISOS_URL ?? '').trim() || AVISOS_URL;
  if (!/^https:\/\//i.test(url)) return { ok: false, motivo: 'AVISOS_URL tiene que ser https' };
  const cuerpo = { asunto: asunto || asuntoDe(texto), texto: String(texto) };
  if (clave) cuerpo.clave = String(clave);
  if (nivel) cuerpo.nivel = String(nivel);
  try {
    const r = await fetchFn(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8', 'x-token': token, 'user-agent': 'radar-balcarce-avisos' },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
    let datos = null;
    try { datos = await r.json(); } catch { datos = null; }
    if (!r.ok) return { ok: false, motivo: sinSecretos(`el Worker contestó HTTP ${r.status}${datos?.error ? `: ${String(datos.error).slice(0, 120)}` : ''}`, token) };
    if (datos?.ok !== true) return { ok: false, motivo: 'el Worker contestó algo ilegible' };
    return datos.repetido ? { ok: true, repetido: true } : { ok: true };
  } catch (e) {
    const sinRespuesta = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    return { ok: false, motivo: sinRespuesta ? 'el Worker no contestó a tiempo' : sinSecretos(`no se pudo llegar al Worker: ${String(e?.message ?? e).slice(0, 120)}`, token) };
  }
}

/**
 * Avisa: primero por mail y, sólo si el mail no salió (o no hay token), por WhatsApp. Nunca tira.
 *
 * @returns {Promise<{ ok: boolean, via: 'mail'|'whatsapp'|null, motivo?: string, mail?: object, whatsapp?: object }>}
 *   `motivo` cuenta por qué falló todo (o por qué el mail no salió y se cayó a WhatsApp, también cuando ok es true).
 */
export async function avisar({ asunto, texto, clave, nivel } = {}, { fetchFn = fetch, env = process.env, whatsappFn = enviarWhatsApp } = {}) {
  let mail = null;
  if (hayMail(env)) {
    mail = await avisarPorMail({ asunto, texto, clave, nivel }, { fetchFn, env });
    if (mail.ok) return { ok: true, via: 'mail', mail };
  }
  const motivoMail = mail ? `mail: ${mail.motivo}` : 'mail: no hay VIGILANTE_TOKEN';
  if (!hayWhatsApp(env)) return { ok: false, via: null, motivo: `${motivoMail}; WhatsApp: no hay WHATSAPP_TELEFONO / WHATSAPP_APIKEY`, mail };
  const telefono = env.WHATSAPP_TELEFONO;
  const apikey = env.WHATSAPP_APIKEY;
  let whatsapp;
  try {
    whatsapp = await whatsappFn({ telefono, apikey, texto, fetchFn });
  } catch (e) {
    whatsapp = { ok: false, error: sinSecretos(e?.message, apikey, telefono) };
  }
  if (whatsapp?.ok) return { ok: true, via: 'whatsapp', motivo: motivoMail, mail, whatsapp };
  return { ok: false, via: null, motivo: `${motivoMail}; WhatsApp: ${sinSecretos(whatsapp?.error ?? 'no salió', apikey, telefono)}`, mail, whatsapp };
}

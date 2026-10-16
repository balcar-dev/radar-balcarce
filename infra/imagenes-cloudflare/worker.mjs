// Imágenes con Workers AI de Cloudflare (16/10/2026). Un Worker chico que, con el token en el encabezado, genera UNA imagen con el modelo
// flux-1-schnell y la devuelve como JPEG. Entra en las 10.000 «neuronas» diarias que trae el plan Workers que ya pagamos (unas 170 imágenes por
// día), así que no suma costo. Sin dependencias. Lo llaman los workflows de GitHub con el secreto VIGILANTE_TOKEN (el mismo de los avisos:
// el workflow lo carga acá como TOKEN). Las reglas editoriales (qué notas pueden llevar una imagen generada, el prompt sin nombres, la etiqueta
// «Ilustración generada con IA») viven en ingesta/foto-ia.mjs; este Worker sólo genera.
//
//   GET  /            → «en hora» (no gasta nada)
//   POST /generar     → cuerpo JSON { prompt, steps? }, encabezado x-token → image/jpeg

export const MODELO = '@cf/black-forest-labs/flux-1-schnell';
export const PROMPT_MAXIMO = 700;
export const PASOS = { minimo: 1, maximo: 8, normal: 6 };

/** Compara dos textos sin que el tiempo delate cuántas letras coinciden. */
export function mismoToken(a, b) {
  const x = String(a ?? ''); const y = String(b ?? '');
  if (!x || !y || x.length !== y.length) return false;
  let r = 0;
  for (let i = 0; i < x.length; i++) r |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return r === 0;
}

const json = (obj, estado) => new Response(JSON.stringify(obj), { status: estado, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

function bytesDeBase64(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/') return new Response('Imágenes de Radar Balcarce: en hora.', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    if (url.pathname !== '/generar' || req.method !== 'POST') return json({ error: 'No existe.' }, 404);
    if (!mismoToken(req.headers.get('x-token'), env.TOKEN)) return json({ error: 'Sin permiso.' }, 401);
    let cuerpo;
    try { cuerpo = await req.json(); } catch { return json({ error: 'El cuerpo tiene que ser JSON.' }, 400); }
    const prompt = String(cuerpo?.prompt ?? '').trim();
    if (!prompt) return json({ error: 'Falta el prompt.' }, 400);
    if (prompt.length > PROMPT_MAXIMO) return json({ error: `El prompt pasa de ${PROMPT_MAXIMO} caracteres.` }, 400);
    const pasos = Math.min(PASOS.maximo, Math.max(PASOS.minimo, Math.round(Number(cuerpo?.steps) || PASOS.normal)));
    try {
      const r = await env.AI.run(MODELO, { prompt, steps: pasos });
      const b64 = r?.image;
      if (typeof b64 !== 'string' || !b64) return json({ error: 'El modelo no devolvió imagen.' }, 502);
      return new Response(bytesDeBase64(b64), { status: 200, headers: { 'content-type': 'image/jpeg', 'cache-control': 'no-store' } });
    } catch (e) {
      return json({ error: `Falló la generación: ${String(e?.message ?? e).slice(0, 200)}` }, 502);
    }
  },
};

// Sondea Groq con la clave del repositorio: qué modelos hay, el cupo de cada uno y cuáles
// aceptan imágenes. Se corre a mano desde Actions → "Sondear Groq" (la clave está sólo
// en GitHub). Gasta un pedido mínimo por modelo; nunca imprime la clave.
import { leerVariable } from '../reels/claves.mjs';

const clave = leerVariable('GROQ_API_KEY');
if (!clave) { console.log('Sin GROQ_API_KEY.'); process.exit(0); }
const base = 'https://api.groq.com/openai/v1';
const h = { Authorization: `Bearer ${clave}`, 'content-type': 'application/json' };
// Un cuadradito PNG de 1x1 para probar si el modelo acepta imágenes.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const lista = await (await fetch(`${base}/models`, { headers: h })).json();
const modelos = (lista.data ?? []).map((m) => m.id).filter((id) => !/whisper|tts|orpheus|guard/i.test(id));
console.log(`${modelos.length} modelos de texto`);
for (const id of modelos) {
  const num = (r, n) => r.headers.get(n) ?? '?';
  const texto = await fetch(`${base}/chat/completions`, { method: 'POST', headers: h, body: JSON.stringify({ model: id, messages: [{ role: 'user', content: 'di ok' }], max_tokens: 8 }) });
  const imagen = await fetch(`${base}/chat/completions`, {
    method: 'POST', headers: h,
    body: JSON.stringify({ model: id, max_tokens: 8, messages: [{ role: 'user', content: [{ type: 'text', text: 'di ok' }, { type: 'image_url', image_url: { url: PNG } }] }] }),
  });
  console.log(`${id}: texto ${texto.status} · imagen ${imagen.status} · pedidos/día ${num(texto, 'x-ratelimit-limit-requests')} (quedan ${num(texto, 'x-ratelimit-remaining-requests')}) · tokens/min ${num(texto, 'x-ratelimit-limit-tokens')} (quedan ${num(texto, 'x-ratelimit-remaining-tokens')})`);
}

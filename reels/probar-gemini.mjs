// Un solo pedido mínimo a Gemini con la clave de REDACCIÓN (la gratis), para
// saber si está cargada y anda. No imprime la clave. Se corre a mano desde
// GitHub: Actions → "Prueba de Gemini" → Run workflow.
import { claveRedaccion } from './claves.mjs';

const clave = claveRedaccion();
if (!clave) { console.log('Falta GEMINI_API_KEY_REDACCION.'); process.exit(1); }
console.log(`Clave de redacción: ${clave.length} caracteres.`);

const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
  body: JSON.stringify({ contents: [{ parts: [{ text: 'Respondé sólo con la palabra: listo' }] }], generationConfig: { maxOutputTokens: 8 } }),
  signal: AbortSignal.timeout(30000),
});
const cuerpo = await r.text();
console.log(`HTTP ${r.status}`);
console.log(cuerpo.replace(clave, '***').slice(0, 300));
process.exit(r.ok ? 0 : 1);

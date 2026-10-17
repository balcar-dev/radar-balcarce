// Le hace una pregunta a DeepSeek por OpenRouter desde la terminal (o desde Claude Code), para una segunda opinión o una tarea chica y barata
// mientras Claude sigue con otra cosa. Usa OPENROUTER_API_KEY del entorno o del .env; nunca la imprime.
//   node scripts/deepseek.mjs "pregunta"                         DeepSeek V4 Pro
//   node scripts/deepseek.mjs --flash "pregunta"                 DeepSeek V4 Flash (más barato)
//   node scripts/deepseek.mjs --archivo ruta.js "revisá esto"    le manda también ese archivo (hasta ~200 KB)
//   echo "texto" | node scripts/deepseek.mjs --stdin "qué le falta"   con --stdin, lo que entra por la entrada estándar se suma al pedido
import fs from 'node:fs';
import { leerVariable } from '../reels/claves.mjs';

const args = process.argv.slice(2);
const flash = args.includes('--flash');
const archivos = [];
const palabras = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--flash' || args[i] === '--stdin') continue;
  if (args[i] === '--archivo') { archivos.push(args[i + 1]); i += 1; continue; }
  palabras.push(args[i]);
}
const clave = leerVariable('OPENROUTER_API_KEY');
if (!clave) { console.error('Falta OPENROUTER_API_KEY (variable de entorno o .env).'); process.exit(1); }

let pedido = palabras.join(' ').trim();
for (const f of archivos) pedido += `\n\n--- ${f} ---\n${fs.readFileSync(f, 'utf8').slice(0, 200_000)}`;
if (args.includes('--stdin')) { const entrada = fs.readFileSync(0, 'utf8').trim(); if (entrada) pedido += `\n\n${entrada}`; }
if (!pedido) { console.error('Falta la pregunta.'); process.exit(1); }

const modelo = flash ? 'deepseek/deepseek-v4-flash' : 'deepseek/deepseek-v4-pro';
const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://radarbalcarce.com', 'X-Title': 'Radar Balcarce (herramienta de desarrollo)' },
  body: JSON.stringify({ model: modelo, messages: [{ role: 'system', content: 'Respondé en castellano rioplatense, claro y corto. Si es código, mostrá sólo lo que cambia.' }, { role: 'user', content: pedido }], reasoning: { exclude: true } }),
});
const j = await r.json().catch(() => ({}));
if (!r.ok) { console.error(`OpenRouter ${r.status}: ${j?.error?.message ?? 'sin detalle'}`); process.exit(1); }
console.log(j.choices?.[0]?.message?.content ?? '(sin respuesta)');
console.error(`[${modelo} · ${j.usage?.prompt_tokens ?? '?'} tokens de entrada, ${j.usage?.completion_tokens ?? '?'} de salida]`);

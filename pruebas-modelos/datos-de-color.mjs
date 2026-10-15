// Experimento: ¿qué "dato de color" le agregaría cada IA a una nota, y de qué fuente lo saca?
//   node pruebas-modelos/datos-de-color.mjs --modelo=google/gemini-3.1-flash-lite [--solo=3]
// A cada modelo con búsqueda web se le da la nota y se le pide hasta 3 datos de contexto verificables, cada uno con la
// dirección exacta de donde sale. Guarda datos-de-color-<modelo>.json. Después, verificar-datos-de-color.mjs abre cada
// dirección y comprueba si el dato está ahí. Clave: OPENROUTER_API_KEY (nunca se imprime).

import fs from 'node:fs';
import path from 'node:path';

const AQUI = import.meta.dirname;
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = 'true'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const MODELO = args.modelo;
const SOLO = args.solo ? Number(args.solo) : Infinity;
const CLAVE = process.env.OPENROUTER_API_KEY;
if (!CLAVE) { console.error('Falta OPENROUTER_API_KEY. Frené.'); process.exit(1); }
if (!MODELO) { console.error('Uso: --modelo=...'); process.exit(1); }
// Los modelos de Perplexity ya buscan solos; a los demás se les activa la búsqueda web de OpenRouter con ":online".
const NATIVO = /^perplexity\//.test(MODELO);
const ID = NATIVO || MODELO.endsWith(':online') ? MODELO : `${MODELO}:online`;

// ---- las notas de prueba (se arman una vez)
const ARCHIVO_NOTAS = path.join(AQUI, 'notas-datos.json');
if (!fs.existsSync(ARCHIVO_NOTAS)) {
  const historias = JSON.parse(fs.readFileSync(path.join(AQUI, 'historias.json'), 'utf8')).historias;
  const pool = JSON.parse(fs.readFileSync(path.join(AQUI, 'pool.json'), 'utf8'));
  const locales = [1, 2, 3, 5, 9, 10, 14].map((i) => historias[i]).map((h) => ({
    titulo: h.titulo, texto: `${h.origenes[0].resumen} ${h.textoDeLaFuente ?? ''}`.replace(/\s+/g, ' ').slice(0, 1500), tipo: 'local o regional',
  }));
  const buscar = (re) => pool.find((n) => re.test(n.titulo));
  const nacionales = [/River Plate le ganó 1-0/i, /Colapinto abandonó el Gran Premio de Singapur/i, /Corte Suprema suspendió el artículo del DNU 70/i, /traslado de presos desde la cárcel de Devoto/i, /Messi.*Inter Miami.*DC United|doblete.*Inter Miami/i]
    .map(buscar).filter(Boolean).map((n) => ({ titulo: n.titulo, texto: n.resumen, tipo: 'nacional o deportiva' }));
  fs.writeFileSync(ARCHIVO_NOTAS, `${JSON.stringify([...locales, ...nacionales].map((n, i) => ({ id: `n${i + 1}`, ...n })), null, 1)}\n`);
}
const notas = JSON.parse(fs.readFileSync(ARCHIVO_NOTAS, 'utf8')).slice(0, SOLO);

const PROMPT = (n) => `Sos editor de datos de Radar Balcarce, un medio digital de Balcarce (provincia de Buenos Aires, Argentina). Hoy es ${new Date().toISOString().slice(0, 10)}.
Te paso una nota ya escrita. Quiero saber qué DATO DE CONTEXTO verificable le agregarías para hacerla más completa y original (una cifra, un antecedente histórico, una comparación, un récord, un dato oficial). Buscá en internet.

Reglas:
- Hasta 3 datos. Que NO repitan lo que ya dice la nota.
- Cada dato tiene que salir de una página que abriste de verdad: poné la dirección (URL) exacta de esa página. Sin dirección, no sirve.
- Si no encontrás un dato confiable y relevante, devolvé una lista vacía. Es mejor ningún dato que uno inventado.
- Nada de opiniones ni especulación.

NOTA
Título: ${n.titulo}
Texto: ${n.texto}

Devolvé SOLO un JSON con esta forma exacta:
{"datos": [{"dato": "una oración con el dato", "cifra": "el número o valor central", "fecha_del_dato": "a qué fecha o período corresponde", "fuente_url": "https://…", "fuente_nombre": "quién publica el dato", "por_que_suma": "una frase"}]}`;

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
function extraerJson(texto = '') {
  const limpio = String(texto).replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/g, '');
  const ini = limpio.indexOf('{');
  if (ini < 0) return null;
  let prof = 0;
  for (let i = ini; i < limpio.length; i += 1) {
    if (limpio[i] === '{') prof += 1;
    if (limpio[i] === '}') { prof -= 1; if (prof === 0) { try { return JSON.parse(limpio.slice(ini, i + 1)); } catch { return null; } } }
  }
  return null;
}
// Los modelos que "piensan" gastan tiempo y plata: se les baja el razonamiento (si el modelo no deja apagarlo, esfuerzo bajo).
let razonamiento = /gpt-5|claude|deepseek|grok/i.test(MODELO) ? (/gpt-5/i.test(MODELO) ? { effort: 'low' } : { enabled: false }) : null;

async function pedir(n) {
  const t0 = Date.now();
  for (let intento = 0; intento < 3; intento += 1) {
    const cuerpo = { model: ID, messages: [{ role: 'user', content: PROMPT(n) }], temperature: 0.2, max_tokens: 4000 };
    if (razonamiento) cuerpo.reasoning = razonamiento;
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${CLAVE}`, 'x-title': 'Radar Balcarce - datos de color' },
      body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(180_000),
    }).catch((e) => ({ status: 0, text: async () => String(e.message) }));
    const texto = await res.text();
    let j = null; try { j = JSON.parse(texto); } catch { /* no era JSON */ }
    if (res.status === 429 && intento < 2) { await espera(20000); continue; }
    if (res.status === 400 && razonamiento?.enabled === false) { razonamiento = { effort: 'low' }; continue; }
    const msg = j?.choices?.[0]?.message;
    const citadas = [
      ...(msg?.annotations ?? []).map((a) => a.url_citation?.url).filter(Boolean),
      ...((j?.citations ?? []).map((c) => (typeof c === 'string' ? c : c?.url)).filter(Boolean)),
    ];
    const salida = extraerJson(msg?.content ?? '');
    return {
      status: res.status, ms: Date.now() - t0, error: res.status === 200 ? (salida ? null : 'respuesta ilegible') : (j?.error?.message ?? texto.slice(0, 150)),
      datos: Array.isArray(salida?.datos) ? salida.datos.slice(0, 3) : [], citadas: [...new Set(citadas)],
      uso: j?.usage ? { entrada: j.usage.prompt_tokens, salida: j.usage.completion_tokens, costo: j.usage.cost ?? null } : null,
    };
  }
  return { status: 0, ms: Date.now() - t0, error: 'sin respuesta', datos: [], citadas: [] };
}

const resultado = { modelo: MODELO, usado: ID, fecha: new Date().toISOString(), notas: {} };
const destino = path.join(AQUI, `datos-de-color-${MODELO.replace(/[/:\\]/g, '_')}.json`);
console.log(`${MODELO} (${ID}) · ${notas.length} notas`);
for (const [i, n] of notas.entries()) {
  const r = await pedir(n);
  resultado.notas[n.id] = { titulo: n.titulo, ...r };
  console.log(`[${i + 1}/${notas.length}] ${r.error ? `ERROR ${r.status}: ${String(r.error).slice(0, 70)}` : `${r.datos.length} dato(s), ${r.citadas.length} fuente(s) citadas`} · ${(r.ms / 1000).toFixed(0)} s${r.uso?.costo != null ? ` · US$ ${r.uso.costo.toFixed(4)}` : ''}`);
  fs.writeFileSync(destino, `${JSON.stringify(resultado, null, 1)}\n`);
}
console.log(`Guardado en ${path.relative(process.cwd(), destino)}`);

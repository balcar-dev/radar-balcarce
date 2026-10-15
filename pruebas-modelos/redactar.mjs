// Prueba de REDACCIÓN: le pide a un modelo de OpenRouter que escriba cada historia de historias.json con el
// prompt actual o con el nuevo (criterio-unico) y la corrige con el MISMO verificador de producción.
//   node pruebas-modelos/redactar.mjs --modelo=google/gemini-3.1-flash-lite --prompt=actual
//   node pruebas-modelos/redactar.mjs --modelo=anthropic/claude-haiku-5.5 --prompt=nuevo
//   opciones: --solo=3 (las primeras 3)  --por-minuto=30
// Guarda redaccion-<modelo>--<prompt>.json. Clave: variable de entorno OPENROUTER_API_KEY (nunca se imprime).
// No toca producción: sólo lee ingesta/, reels/ y criterio-unico/.

import fs from 'node:fs';
import path from 'node:path';
import { leerCriterio } from '../ingesta/prompt-editorial.mjs';
import { verificar } from '../ingesta/verificar.mjs';
import { esTemaSerio, origenesDe, fechaConDia, materialParaVerificar, limpiarJson } from '../reels/reescritura.mjs';

const AQUI = import.meta.dirname;
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = 'true'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const MODELO = args.modelo;
const PROMPT = args.prompt ?? 'actual'; // actual | nuevo
const SOLO = args.solo ? Number(args.solo) : Infinity;
const POR_MINUTO = Number(args['por-minuto'] ?? 30);
// --razonamiento=off | low: los modelos que "piensan" antes de escribir tardan y cuestan de más. "off" lo apaga;
// si el modelo no deja apagarlo, se prueba con esfuerzo bajo. Sin la opción, el modelo hace lo que hace por defecto.
const RAZONAMIENTO = args.razonamiento ?? null;
const CLAVE = process.env.OPENROUTER_API_KEY;
if (!CLAVE) { console.error('Falta la variable de entorno OPENROUTER_API_KEY. Frené.'); process.exit(1); }
if (!MODELO || !['actual', 'nuevo'].includes(PROMPT)) { console.error('Uso: --modelo=... --prompt=actual|nuevo'); process.exit(1); }

// --datos=archivo.json: datos de contexto YA VERIFICADOS por historia ({ "<id de la historia>": [{ dato, fuente_url, fuente_nombre }] }).
// Se le agregan al pedido como un bloque aparte y se suman al material con el que el verificador controla lo que escribe.
const DATOS = args.datos ? JSON.parse(fs.readFileSync(path.join(AQUI, args.datos), 'utf8')) : {};
const bloqueDeDatos = (h) => (DATOS[h.id]?.length
  ? `\nDATOS DE CONTEXTO VERIFICADOS (cada uno con su fuente). Sumá al cuerpo los que aporten contexto real a esta nota (por lo menos dos si encajan), después de contar lo central, atribuidos a quien los publica y sin nombrar al medio; el que no encaje, no lo uses:\n${DATOS[h.id].map((d, i) => `Dato ${i + 1}: ${d.dato} (fuente: ${d.fuente_nombre}, ${d.fuente_url})`).join('\n')}`
  : '');
// Todo lo que ve el redactor tiene que estar también en el material del verificador (el dato y quién lo publica).
const textoDeDatos = (h) => (DATOS[h.id] ?? []).map((d) => `${d.dato} (${d.fuente_nombre})`).join('\n');

const CRITERIO = leerCriterio();
const historias = JSON.parse(fs.readFileSync(path.join(AQUI, 'historias.json'), 'utf8')).historias.slice(0, SOLO);

/** El prompt de una historia: el actual (reglas + tono) o el armado por bloques. */
function promptDe(h, serio) {
  if (PROMPT === 'actual') return CRITERIO.reglas.replace('{{TONO}}', () => (serio ? CRITERIO.tonoSerio : CRITERIO.tonoAmeno));
  return fs.readFileSync(path.join(AQUI, '..', 'criterio-unico', 'prompts-armados', serio ? 'redactor-serio.txt' : 'redactor-ameno.txt'), 'utf8').trim();
}

/** Igual que entradaDe de reels/reescritura.mjs (no se exporta): el texto que recibe el redactor. */
function entradaDe(nota) {
  const origenes = origenesDe(nota);
  const partes = [
    `Fecha de hoy: ${fechaConDia(new Date().toISOString())}`,
    `Sección: ${nota.seccion}`,
    `Titular original (de ${nota.medios?.join(' / ') ?? 'la fuente'}): ${nota.titulo}`,
    `FUENTES (${origenes.length === 1 ? 'una sola: no hay confirmación independiente' : `${origenes.length}, numeradas`}):`,
  ];
  origenes.forEach((o, i) => {
    const datos = [o.medio ?? 'otro medio', o.oficial ? 'fuente oficial' : null, o.fecha ? `publicada el ${fechaConDia(o.fecha)}` : null].filter(Boolean).join(' · ');
    partes.push(`Fuente ${i + 1} (${datos}): ${o.resumen || '(sin resumen)'}`);
  });
  if (nota.textoDeLaFuente) partes.push(`Texto completo de la Fuente ${nota.fuenteDelTexto ?? 1} (de acá sale la mayor parte de lo que podés contar en el cuerpo):\n${nota.textoDeLaFuente}`);
  return partes.join('\n');
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let esfuerzo = RAZONAMIENTO === 'low' ? { effort: 'low' } : RAZONAMIENTO === 'off' ? { enabled: false } : null;
async function pedir(cuerpo) {
  let ultimo;
  for (let intento = 0; intento < 3; intento += 1) {
    const t0 = Date.now();
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${CLAVE}`, 'x-title': 'Radar Balcarce - prueba de redaccion' },
        body: JSON.stringify(esfuerzo ? { ...cuerpo, reasoning: esfuerzo } : cuerpo), signal: AbortSignal.timeout(120_000),
      });
      const texto = await res.text();
      let json = null; try { json = JSON.parse(texto); } catch { /* no era JSON */ }
      ultimo = { status: res.status, json, texto: texto.slice(0, 300), ms: Date.now() - t0 };
      if (res.status === 429 && intento === 0) { await espera((Number(res.headers.get('retry-after')) || 20) * 1000); continue; }
      // El modelo no deja apagar el razonamiento: se pasa a esfuerzo bajo para el resto de la corrida.
      if (res.status === 400 && esfuerzo?.enabled === false) { esfuerzo = { effort: 'low' }; continue; }
      return ultimo;
    } catch (e) { return { status: 0, json: null, texto: String(e.message).slice(0, 200), ms: Date.now() - t0 }; }
  }
  return ultimo;
}

const palabras = (t) => String(t ?? '').trim().split(/\s+/).filter(Boolean).length;
let precios = null;
try {
  const lista = (await (await fetch('https://openrouter.ai/api/v1/models')).json()).data;
  const m = lista.find((x) => x.id === MODELO);
  if (m) precios = { entrada: Number(m.pricing.prompt), salida: Number(m.pricing.completion) };
} catch { /* sin precios */ }

const destino = path.join(AQUI, `redaccion-${MODELO.replace(/[/:\\]/g, '_')}--${PROMPT}${RAZONAMIENTO ? `-r${RAZONAMIENTO}` : ''}${args.datos ? '-datos' : ''}.json`);
const resultado = { modelo: MODELO, prompt: PROMPT, razonamiento: RAZONAMIENTO, fecha: new Date().toISOString(), precios, historias: {} };
const intervalo = Math.ceil(60000 / POR_MINUTO);
let ultimoPedido = 0;
console.log(`Redacción · ${MODELO} · prompt ${PROMPT} · ${historias.length} historias`);

for (const [i, h] of historias.entries()) {
  const falta = ultimoPedido + intervalo - Date.now();
  if (falta > 0) await espera(falta);
  ultimoPedido = Date.now();
  const nota = { ...h, resumenFuente: h.origenes[0]?.resumen ?? '', medios: h.medios };
  const serio = esTemaSerio(nota);
  const prompt = promptDe(h, serio);
  const r = await pedir({ model: MODELO, messages: [{ role: 'user', content: `${prompt}\n\n---\n\n${entradaDe(nota)}${bloqueDeDatos(h)}` }], temperature: 0.6, max_tokens: 8000 });
  const contenido = r.json?.choices?.[0]?.message?.content ?? '';
  let salida = null;
  try { salida = limpiarJson(contenido); } catch { /* ilegible */ }
  const fila = { id: h.id, titulo_original: h.titulo, fuentes: h.cantidadDeFuentes, serio, status: r.status, ms: r.ms, caracteresDelPrompt: prompt.length };
  if (r.json?.usage) fila.uso = { entrada: r.json.usage.prompt_tokens, salida: r.json.usage.completion_tokens, costo: r.json.usage.cost ?? null };
  if (r.status !== 200) fila.error = r.json?.error?.message ?? r.texto;
  else if (!salida?.titulo) {
    fila.error = 'respuesta ilegible o sin título';
    // Para ver si falla el modelo o mi lector: el motivo de corte y cómo empieza y termina lo que devolvió.
    fila.corte = r.json?.choices?.[0]?.finish_reason ?? null;
    fila.crudo = { largo: contenido.length, empieza: contenido.slice(0, 200), termina: contenido.slice(-200) };
  }
  else {
    const nuevo = { titulo: salida.titulo, copete: salida.copete ?? '', cuerpo: salida.cuerpo ?? '', guion: salida.guion ?? '' };
    const material = materialParaVerificar(nota);
    if (DATOS[h.id]?.length) material.resumen = `${material.resumen}\n${textoDeDatos(h)}`; // los datos verificados cuentan como fuente
    const v = verificar(material, nuevo, { estilo: true });
    fila.escrito = { ...nuevo, textoRedes: salida.textoRedes ?? '', claves: salida.claves ?? [] };
    fila.problemas = v.problemas.map((p) => ({ tipo: p.tipo, detalle: String(p.detalle).slice(0, 160) }));
    fila.palabrasCuerpo = palabras(nuevo.cuerpo); fila.palabrasBajada = palabras(nuevo.copete); fila.caracteresTitulo = nuevo.titulo.length;
  }
  resultado.historias[h.id] = fila;
  console.log(`[${i + 1}/${historias.length}] ${fila.error ? `ERROR ${fila.status}: ${String(fila.error).slice(0, 70)}` : `cuerpo ${fila.palabrasCuerpo} pal. · ${fila.problemas.length} problema(s)${fila.problemas.length ? ` (${[...new Set(fila.problemas.map((p) => p.tipo))].join(', ')})` : ''}`} · ${(r.ms / 1000).toFixed(1)} s`);
  fs.writeFileSync(destino, `${JSON.stringify(resultado, null, 1)}\n`);
}
console.log(`Guardado en ${path.relative(process.cwd(), destino)}`);

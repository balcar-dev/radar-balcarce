// Auditoría de voz: ¿la locutora dice lo que tiene que decir?
//
//   node reels/auditar-voz.mjs               los clips de prueba (6 voces + 6 transcripciones)
//   node reels/auditar-voz.mjs --explorar    además, formas alternativas de decir la dirección
//
// Nadie puede "escuchar" todo lo que sale. Entonces esto genera unos clips cortos
// con la MISMA ruta de producción (decirGemini, con la voz y la indicación de
// CRITERIO-REDES.md y el mismo paraLeer), le pide a Gemini la transcripción LITERAL
// de cada audio y comprueba (redes/auditoria-voz.mjs):
//   · que se oiga "Radar Balcarce";
//   · que si el guion dice "punto com", la voz diga "punto com" y NUNCA "punto ar"
//     ni ".com.ar";
//   · que el saludo sea el de la hora y ningún otro.
// Imprime un cuadro PASA/FALLA por clip y sale con error si alguno falla.
//
// GASTA (unos pocos audios cortos y sus transcripciones: centavos). Se corre a
// mano (Actions → "Auditar voz"), nunca en lazo ni en un reloj.
// Clave: GEMINI_API_KEY_REDES.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { decirGemini, clave } from './voz-gemini.mjs';
import { paraLeer } from './voz.mjs';
import { opcionesDeVoz, SITIO_DICHO } from '../redes/prompt-redes.mjs';
import { clipsDeAuditoria, variantesDeLaDireccion, revisarTranscripcion } from '../redes/auditoria-voz.mjs';

const MODELO_DE_TRANSCRIPCION = 'gemini-flash-lite-latest';

const PEDIDO = 'Transcribí este audio en castellano, LITERALMENTE: palabra por palabra, exactamente lo que se dice, '
  + 'sin corregir, sin completar y sin resumir. No normalices las direcciones web: si se dice "punto com" escribí '
  + '"punto com", y si se dice "punto ar" escribí "punto ar". Escribí "punto" con letras, no con un punto. '
  + 'Devolvé sólo el texto que se oye, nada más.';

/** Le pide a Gemini la transcripción literal de un mp3. */
export async function transcribir(archivo, { fetchFn = fetch, intentos = 3 } = {}) {
  const k = clave();
  if (!k) throw new Error('falta GEMINI_API_KEY_REDES (en el entorno o en .env)');
  const datos = fs.readFileSync(archivo).toString('base64');
  let ultimo = null;
  for (let i = 1; i <= intentos; i += 1) {
    const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO_DE_TRANSCRIPCION}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': k },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PEDIDO }, { inline_data: { mime_type: 'audio/mp3', data: datos } }] }],
        generationConfig: { temperature: 0 },
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (res.ok) {
      const j = await res.json();
      const texto = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
      if (texto) return texto;
      ultimo = new Error(`transcripción vacía: ${JSON.stringify(j).slice(0, 160)}`);
    } else {
      ultimo = new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      if (res.status < 500 && res.status !== 429) throw ultimo;
    }
    if (i < intentos) await new Promise((r) => { setTimeout(r, 4000 * i); });
  }
  throw ultimo;
}

/** Genera un clip por la ruta de producción y juzga su transcripción. */
async function auditarClip(clip, dir) {
  const { voz, indicacion } = opcionesDeVoz(clip.momento);
  const mp3 = path.join(dir, `${clip.id}.mp3`);
  await decirGemini(paraLeer(clip.texto), mp3, { voz, indicacion });
  const transcripcion = await transcribir(mp3);
  const fallas = revisarTranscripcion({ guion: clip.texto, transcripcion, saludo: clip.saludo });
  return { ...clip, transcripcion, fallas };
}

async function main() {
  const explorar = process.argv.includes('--explorar');
  const clips = clipsDeAuditoria();
  if (explorar) {
    for (const v of variantesDeLaDireccion()) {
      clips.push({
        id: v.id,
        momento: 'tarde',
        saludo: null,
        texto: `Seguimos en ${v.dicho}. Todo lo demás lo encontrás en ${v.dicho}.`,
      });
    }
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auditar-voz-'));
  console.log(`\nAuditoría de voz · dirección dicha: "${SITIO_DICHO}" · ${clips.length} clips\n`);

  const resultados = [];
  for (const clip of clips) {
    try {
      resultados.push(await auditarClip(clip, dir));
    } catch (e) {
      resultados.push({ ...clip, transcripcion: '', fallas: [`no se pudo generar o transcribir: ${e.message.slice(0, 160)}`] });
    }
    const r = resultados.at(-1);
    console.log(`${r.fallas.length ? 'FALLA' : 'PASA '}  ${r.id}`);
    console.log(`        dice el guion:  ${r.texto}`);
    console.log(`        se oyó:         ${r.transcripcion || '(nada)'}`);
    for (const f of r.fallas) console.log(`        ✗ ${f}`);
  }

  console.log('\n┌────────────────────────────────────┬────────┐');
  for (const r of resultados) console.log(`│ ${r.id.padEnd(34)} │ ${(r.fallas.length ? 'FALLA' : 'PASA').padEnd(6)} │`);
  console.log('└────────────────────────────────────┴────────┘');

  // Con --explorar, una variante que falla no rompe la corrida: sólo informa.
  const propios = new Set(clipsDeAuditoria().map((c) => c.id));
  const malos = resultados.filter((r) => r.fallas.length && propios.has(r.id));
  const pasan = resultados.filter((r) => !r.fallas.length).length;
  console.log(`\n${pasan} de ${resultados.length} pasan.${malos.length ? ` Fallan ${malos.length} de los clips obligatorios.` : ''}\n`);
  if (malos.length) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('auditar-voz.mjs')) {
  await main();
}

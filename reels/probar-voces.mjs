// Prueba de voces (28/09): el modelo de voz definitivo (gemini-3.8-flash-tts)
// con el perfil "locutora de radio" que eligieron Hernán y Andrés, y una versión
// de hombre. No publica nada: deja los audios en reels/salida/voces/ y el workflow
// "Probar voces" los sube como artefacto para escucharlos.
//
//   node reels/probar-voces.mjs formatos          la locutora, con tres maneras de
//                                                 pasarle las indicaciones (el
//                                                 podcast real: es el caso difícil)
//   node reels/probar-voces.mjs hombres <formato> el locutor, con tres voces de hombre
//
// Por qué: con el modelo 3.8, el pedido de producción hace que la voz LEA las
// indicaciones en voz alta (el podcast de 81 palabras duró 140 s). Cada audio se
// mide contra su texto con vozDeMas (reels/voz-gemini.mjs).
//
// Clave: GEMINI_API_KEY_REDES (paga). Cada audio cuesta centavos.

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
import { claveRedes } from './claves.mjs';
import { INDICACIONES } from '../redes/prompt-redes.mjs';
import { vozDeMas } from './voz-gemini.mjs';

const correr = promisify(execFile);
const MODELO = 'gemini-3.8-flash-tts';
const SALIDA = path.join(import.meta.dirname, 'salida', 'voces');
const FORMATOS = ['sistema', 'corto', 'doc'];
const VOCES_DE_HOMBRE = ['Charon', 'Orus', 'Iapetus'];

// Los dos textos: el podcast de la noche del 28/09 (el caso difícil, 81
// palabras) y el clima de la mañana (corto, el que ya anduvo).
const TEXTOS = {
  podcast: 'Buenas noches Balcarce, cómo estuvo el día. Repasamos lo que dejó este lunes. Para arrancar: El Fangio volvió a rugir después de 15 años. '
    + 'Otra que se comenta: la mala suerte de Ariel Durán en Balcarce. También: Movimiento 245, un espacio de contención y recuperación que funciona en Balcarce. '
    + 'Por último: Argentina vs Bolivia, cuándo juegan, entradas y las claves de un Kempes con aforo reducido. Que tengan una buena noche. '
    + 'Todo lo demás lo encontrás en Radar Balcarce punto com.',
  clima: 'Buen día, Balcarce. Hoy martes 29 de septiembre amanece nublado, con 11 grados y una sensación térmica de 8. '
    + 'A la tarde la máxima llega a 17 y hay chances de lluvia hacia la noche. Si salís temprano, llevá abrigo. '
    + 'Todas las noticias de hoy, en Radar Balcarce punto com.',
};

const MOMENTO = { podcast: INDICACIONES.noche, clima: INDICACIONES.manana };

const PERSONAS = {
  mujer: {
    rol: 'la locutora', quien: 'Mujer de unos 40 años', corto: 'locutora',
  },
  hombre: {
    rol: 'el locutor', quien: 'Hombre de unos 40 años', corto: 'locutor',
  },
};

/** El perfil "locutora de radio" (o su versión de hombre), en apartados. */
function perfil(genero) {
  const p = PERSONAS[genero];
  return [
    `QUIÉN HABLA: Sos ${p.rol} de Radar Balcarce, un medio digital de Balcarce, en la provincia de Buenos Aires. ${p.quien}, voz media tirando a grave, firme y cálida, con años de oficio en la radio local.`,
    'ACENTO: argentino, rioplatense, de la provincia de Buenos Aires, natural y sin exagerarlo. La "ll" y la "y" suenan como en Buenos Aires y el voseo se dice como acá ("salís", "llevá"). Nunca acento neutro ni de otro país.',
    'CÓMO LEE, SIEMPRE IGUAL: Ritmo parejo, de unas 145 palabras por minuto. El mismo volumen y la misma energía de la primera a la última palabra, sin susurrar, sin gritar, sin risas ni suspiros. Dicción clara: cada número y cada nombre se entiende bien. Una pausa corta en cada coma y una más larga en cada punto. Tono de radio local con oficio: seguro y tranquilo, que transmite confianza; nunca un noticiero de televisión ni un robot.',
    'REGLAS: Decí cada palabra del texto tal cual está escrita, sin agregar, sacar ni cambiar ninguna, porque el video lleva subtítulos con ese mismo texto (si dice "Buen día", es "Buen día", nunca "Buenos días"). Cuando el texto diga "Radar Balcarce punto com", decilo exactamente así y terminá en "com": nunca "punto ar".',
  ].join('\n\n');
}

/** Las tres maneras de pasarle las indicaciones al modelo. */
function pedido(formato, genero, textoId) {
  const texto = TEXTOS[textoId];
  const momento = MOMENTO[textoId];
  const p = PERSONAS[genero];
  if (formato === 'sistema') {
    // Las indicaciones como instrucción de sistema; el texto solo, sin nada más.
    return { sistema: `${perfil(genero)}\n\nEL MOMENTO DEL DÍA: ${momento}`, texto };
  }
  if (formato === 'corto') {
    // Una línea de estilo y el texto, como en la documentación de Google.
    return {
      texto: `Leé con voz de ${p.corto} de radio de pueblo, argentino rioplatense de la provincia de Buenos Aires (${p.quien.toLowerCase()}, voz media tirando a grave, firme y cálida), con ritmo parejo de unas 145 palabras por minuto, volumen parejo, dicción clara y tono seguro y tranquilo. ${momento} Decí sólo el texto, palabra por palabra, sin cambiar ni agregar nada:\n\n${texto}`,
    };
  }
  // "doc": el esquema de la documentación (perfil de audio, escena, notas del
  // director y transcripción).
  return {
    texto: `# PERFIL DE AUDIO: ${p.corto} de Radar Balcarce\n${perfil(genero)}\n\n## LA ESCENA\n${momento}\n\n### NOTAS DEL DIRECTOR\nLeer sin cambiar una sola palabra del texto.\n\n#### TRANSCRIPCIÓN\n${texto}`,
  };
}

const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });

async function pedirAudio({ voz, sistema, texto }, clave) {
  const cuerpo = {
    ...(sistema ? { systemInstruction: { parts: [{ text: sistema }] } } : {}),
    contents: [{ parts: [{ text: texto }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } },
    },
  };
  let ultimo = null;
  for (let intento = 1; intento <= 3; intento += 1) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(180_000),
    });
    if (res.ok) {
      const j = await res.json();
      const parte = j.candidates?.[0]?.content?.parts?.find((x) => x.inlineData);
      if (parte) return { pcm: Buffer.from(parte.inlineData.data, 'base64') };
      ultimo = `sin audio: ${JSON.stringify(j).slice(0, 200)}`;
    } else {
      ultimo = `HTTP ${res.status}: ${(await res.text()).replaceAll(clave, '***').slice(0, 300)}`;
      if (res.status === 400) return { error: ultimo };
    }
    await dormir(4000 * intento);
  }
  return { error: ultimo };
}

async function generar({ nombre, formato, genero, voz, textoId }, clave) {
  const p = pedido(formato, genero, textoId);
  const palabras = TEXTOS[textoId].split(/\s+/).length;
  const r = await pedirAudio({ voz, ...p }, clave);
  if (r.error) return { nombre, formato, genero, voz, textoId, palabras, error: r.error };
  const segundos = r.pcm.length / 48000;
  const crudo = path.join(SALIDA, `${nombre}.pcm`);
  fs.writeFileSync(crudo, r.pcm);
  await correr(ffmpeg, ['-y', '-v', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', crudo, '-b:a', '128k', path.join(SALIDA, `${nombre}.mp3`)]);
  fs.rmSync(crudo, { force: true });
  const deMas = vozDeMas(TEXTOS[textoId], segundos);
  return {
    nombre, formato, genero, voz, textoId, palabras, segundos: Number(segundos.toFixed(1)),
    palabrasPorSegundo: Number((palabras / segundos).toFixed(2)), leyoDeMas: Boolean(deMas), detalle: deMas,
  };
}

const [modo, formatoElegido] = process.argv.slice(2);
const clave = claveRedes();
if (!clave) { console.log('Falta GEMINI_API_KEY_REDES.'); process.exit(1); }
if (!['formatos', 'hombres'].includes(modo)) { console.log('Uso: probar-voces.mjs formatos | hombres <formato>'); process.exit(1); }
if (modo === 'hombres' && !FORMATOS.includes(formatoElegido)) { console.log(`Falta el formato: ${FORMATOS.join(' | ')}`); process.exit(1); }
fs.mkdirSync(SALIDA, { recursive: true });

const pruebas = modo === 'formatos'
  ? FORMATOS.flatMap((f) => [1, 2].map((n) => ({
    nombre: `mujer-${f}-podcast-${n}`, formato: f, genero: 'mujer', voz: 'Kore', textoId: 'podcast',
  })))
  : VOCES_DE_HOMBRE.flatMap((v) => ['podcast', 'clima'].map((t) => ({
    nombre: `hombre-${v}-${t}`, formato: formatoElegido, genero: 'hombre', voz: v, textoId: t,
  })));

const resumen = [];
for (const prueba of pruebas) {
  process.stdout.write(`${prueba.nombre}… `);
  const r = await generar(prueba, clave);
  resumen.push(r);
  console.log(r.error ? `ERROR ${r.error}` : `${r.segundos} s · ${r.palabrasPorSegundo} pal/s · ${r.leyoDeMas ? 'LEYÓ DE MÁS' : 'ok'}`);
  await dormir(3000);
}
fs.writeFileSync(path.join(SALIDA, 'resumen.json'), JSON.stringify(resumen, null, 2));
console.log(`\nListo: ${resumen.filter((r) => !r.error && !r.leyoDeMas).length} de ${resumen.length} sin problemas.`);

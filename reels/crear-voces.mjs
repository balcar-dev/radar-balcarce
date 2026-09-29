// Crear las voces propias de Radar Balcarce (28/09): la locutora y el locutor.
//
// El modelo Gemini 3.8 TTS trae dos cosas nuevas (blog de Google del 23/09 y
// ai.google.dev/gemini-api/docs/speech-generation):
//   · Voice Design: se describe una voz con palabras (POST /v1beta/voices, con
//     language_code "es-AR") y Google devuelve un id (voice_…) que queda guardado
//     en el proyecto (hasta 200 por proyecto, retención de un año). Con ese id
//     la voz es SIEMPRE la misma: ya no depende de cada pedido.
//   · La Interactions API (POST /v1beta/interactions) separa la transcripción, que
//     se lee literal, del estilo (speech_metadata.style): las indicaciones ya no
//     se pueden leer en voz alta por error.
//
// Este script crea unos candidatos (tres por género, apenas distintos), genera con
// cada uno el mismo podcast del lunes 28/09 y deja los audios en
// reels/salida/voces/ y los ids en voces-creadas.json. No publica nada.
//
//   node reels/crear-voces.mjs            crea los candidatos y los prueba
//   node reels/crear-voces.mjs listar     lista las voces propias del proyecto
//
// Clave: GEMINI_API_KEY_REDES (paga). Sin dependencias fuera de ffmpeg-static.

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
import { claveRedes } from './claves.mjs';

const correr = promisify(execFile);
const RAIZ_API = 'https://generativelanguage.googleapis.com/v1beta';
const MODELO = 'gemini-3.8-flash-tts';
const SALIDA = path.join(import.meta.dirname, 'salida', 'voces');

const PODCAST = 'Buenas noches Balcarce, cómo estuvo el día. Repasamos lo que dejó este lunes. Para arrancar: El Fangio volvió a rugir después de 15 años. '
  + 'Otra que se comenta: la mala suerte de Ariel Durán en Balcarce. También: Movimiento 245, un espacio de contención y recuperación que funciona en Balcarce. '
  + 'Por último: Argentina contra Bolivia, cuándo juegan, entradas y las claves de un Kempes con aforo reducido. Que tengan una buena noche. '
  + 'Todo lo demás lo encontrás en Radar Balcarce punto com.';
const MUESTRA = 'Buen día, Balcarce. Hoy amanece nublado, con 11 grados y una sensación térmica de 8. Todas las noticias de hoy, en Radar Balcarce punto com.';
const ESTILO = 'calm, confident and warm, steady pace, like a local radio announcer';

const COMUN = 'Acento rioplatense de la provincia de Buenos Aires, natural y sin exagerarlo, con voseo. Dicción clara y ritmo parejo y tranquilo. Transmite confianza, sin sonar a noticiero de televisión ni a robot.';
const CANDIDATOS = [
  { id: 'mujer-a', genero: 'female', nombre: 'Radar Balcarce · locutora A', descripcion: `Locutora de radio local argentina, mujer de unos 40 años, voz media tirando a grave, firme, cálida y segura. ${COMUN}` },
  { id: 'mujer-b', genero: 'female', nombre: 'Radar Balcarce · locutora B', descripcion: `Locutora de radio local argentina, mujer de unos 35 años, voz media, cercana, cálida y amable, con una sonrisa leve. ${COMUN}` },
  { id: 'mujer-c', genero: 'female', nombre: 'Radar Balcarce · locutora C', descripcion: `Locutora de radio local argentina, mujer de unos 45 años, voz más grave, serena y pausada, con mucho oficio. ${COMUN}` },
  { id: 'hombre-a', genero: 'male', nombre: 'Radar Balcarce · locutor A', descripcion: `Locutor de radio local argentino, hombre de unos 40 años, voz media tirando a grave, firme, cálida y segura. ${COMUN}` },
  { id: 'hombre-b', genero: 'male', nombre: 'Radar Balcarce · locutor B', descripcion: `Locutor de radio local argentino, hombre de unos 35 años, voz media, cercana, cálida y amable, con una sonrisa leve. ${COMUN}` },
  { id: 'hombre-c', genero: 'male', nombre: 'Radar Balcarce · locutor C', descripcion: `Locutor de radio local argentino, hombre de unos 50 años, voz grave, serena y pausada, con mucho oficio. ${COMUN}` },
];

const clave = claveRedes();
if (!clave) { console.log('Falta GEMINI_API_KEY_REDES.'); process.exit(1); }
const cabeceras = { 'content-type': 'application/json', 'x-goog-api-key': clave };
const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** Un pedido a la API; nunca lanza: devuelve { ok, estado, json } o { ok: false, error }. */
async function api(metodo, ruta, cuerpo) {
  try {
    const res = await fetch(`${RAIZ_API}${ruta}`, {
      method: metodo, headers: cabeceras, ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
      signal: AbortSignal.timeout(180_000),
    });
    const texto = await res.text();
    let json = null;
    try { json = JSON.parse(texto); } catch { /* no era JSON */ }
    if (!res.ok) return { ok: false, estado: res.status, error: texto.replaceAll(clave, '***').slice(0, 600) };
    return { ok: true, estado: res.status, json };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Busca en cualquier parte de la respuesta un audio en base64. */
function buscarAudio(nodo) {
  if (!nodo || typeof nodo !== 'object') return null;
  if (typeof nodo.data === 'string' && nodo.data.length > 2000) return nodo;
  for (const v of Object.values(nodo)) {
    const r = buscarAudio(v);
    if (r) return r;
  }
  return null;
}

/** Lo que dice la respuesta sin los audios (para leer errores de forma). */
const sinAudio = (j) => JSON.stringify(j, (k, v) => (typeof v === 'string' && v.length > 300 ? `${v.slice(0, 40)}…(${v.length})` : v)).slice(0, 900);

/** Segundos de un WAV (busca el trozo "data"). */
function segundosDeWav(b) {
  let p = 12;
  while (p + 8 <= b.length) {
    const nombre = b.toString('ascii', p, p + 4);
    const largo = b.readUInt32LE(p + 4);
    if (nombre === 'data') return Math.min(largo, b.length - p - 8) / 48000;
    p += 8 + largo;
  }
  return b.length / 48000;
}

async function aMp3(wav, destino) {
  const tmp = `${destino}.wav`;
  fs.writeFileSync(tmp, wav);
  await correr(ffmpeg, ['-y', '-v', 'error', '-i', tmp, '-b:a', '128k', destino]);
  fs.rmSync(tmp, { force: true });
}

fs.mkdirSync(SALIDA, { recursive: true });

if (process.argv[2] === 'borrar') {
  // node reels/crear-voces.mjs borrar voice_…: quita una voz propia del proyecto.
  const r = await api('DELETE', `/voices/${process.argv[3]}`);
  console.log(r.ok ? 'borrada' : `ERROR ${r.estado ?? ''} ${r.error}`);
  process.exit(0);
}

if (process.argv[2] === 'listar') {
  // Con un idioma (`listar es-AR`) muestra una línea por voz de la biblioteca de Google.
  const idioma = process.argv[3] && process.argv[3] !== 'todas' ? process.argv[3] : '';
  let pagina = '';
  for (let i = 0; i < 20; i += 1) {
    const r = await api('GET', `/voices?page_size=100${idioma ? `&language_code=${idioma}` : ''}${pagina}`);
    if (!r.ok) { console.log(`ERROR ${r.estado ?? ''} ${r.error}`); break; }
    for (const x of r.json?.voices ?? []) console.log([x.id, x.type, x.display_name, x.language_code, x.accent, x.gender, x.pitch, x.persona, x.description].join(' | '));
    if (!r.json?.next_page_token) break;
    pagina = `&page_token=${encodeURIComponent(r.json.next_page_token)}`;
  }
  process.exit(0);
}

if (process.argv[2] === 'dialogo' || process.argv[2] === 'dialogo2') {
  const version2 = process.argv[2] === 'dialogo2';
  // Una charla de radio entre la locutora y el locutor (28/09). Con voces propias
  // (voice_…) Google no deja hacer la conversación en un solo pedido: se sintetiza
  // cada intervención por separado, con la voz fija de cada uno, y se pegan con una
  // pausa corta. Los ids vienen de VOZ_MUJER y VOZ_HOMBRE.
  const mujer = process.env.VOZ_MUJER;
  const hombre = process.env.VOZ_HOMBRE;
  if (!mujer || !hombre) { console.log('Faltan VOZ_MUJER y VOZ_HOMBRE.'); process.exit(1); }
  // Sólo lo que dicen los titulares del lunes 28/09, sin agregar hechos.
  // La versión 2 usa lo que recomienda la documentación de Google para que suene a
  // conversación: un estilo corto y distinto en cada intervención, una pausa marcada
  // (<short pause>) y una interjección de quien escucha ("Mhm."). Mismos hechos.
  const GUION2 = [
    ['m', 'Buenas noches, Balcarce. Bienvenidos a Radar Balcarce.', 'warm and welcoming, relaxed'],
    ['h', 'Buenas noches. <short pause> Hoy repasamos lo que dejó este lunes.', 'friendly and easygoing, smiling'],
    ['m', 'Arrancamos por el autódromo: el Fangio volvió a rugir después de quince años.', 'excited, warm, with energy'],
    ['h', 'Mhm. <short pause> Y otra que se comenta: la mala suerte de Ariel Durán en Balcarce.', 'attentive, then curious'],
    ['m', 'También te contamos de Movimiento 245, un espacio de contención y recuperación que funciona en Balcarce.', 'warm, thoughtful, a little slower'],
    ['h', 'Y por último, Argentina y Bolivia: cuándo juegan, las entradas y las claves de un Kempes con aforo reducido.', 'upbeat and energetic'],
    ['m', 'Todo lo demás lo encontrás en Radar Balcarce punto com.', 'warm, clear, unhurried'],
    ['h', 'Que tengan una buena noche.', 'warm and calm, closing the show'],
  ];
  const GUION1 = [
    ['m', 'Buenas noches, Balcarce. Bienvenidos a Radar Balcarce.'],
    ['h', 'Buenas noches. Hoy repasamos lo que dejó este lunes.'],
    ['m', 'Arrancamos por el autódromo: el Fangio volvió a rugir después de quince años.'],
    ['h', 'Y otra que se comenta: la mala suerte de Ariel Durán en Balcarce.'],
    ['m', 'También te contamos de Movimiento 245, un espacio de contención y recuperación que funciona en Balcarce.'],
    ['h', 'Y por último, Argentina y Bolivia: cuándo juegan, las entradas y las claves de un Kempes con aforo reducido.'],
    ['m', 'Todo lo demás lo encontrás en Radar Balcarce punto com.'],
    ['h', 'Que tengan una buena noche.'],
  ];
  const GUION = version2 ? GUION2 : GUION1;
  const partes = [];
  for (const [i, [quien, texto, estilo]] of GUION.entries()) {
    const gen = await api('POST', '/interactions', {
      model: MODELO,
      input: [{ type: 'user_input', content: [{ type: 'text', text: texto, annotations: [{ type: 'speech_metadata', style: estilo ?? ESTILO }] }] }],
      response_format: { type: 'audio' },
      generation_config: { speech_config: [{ voice: quien === 'm' ? mujer : hombre }] },
    });
    const audio = gen.ok ? buscarAudio(gen.json) : null;
    if (!audio) { console.log('turno ' + (i + 1) + ': ERROR ' + (gen.error ?? 'sin audio')); process.exit(1); }
    const wav = path.join(SALIDA, 'turno-' + i + '.wav');
    fs.writeFileSync(wav, Buffer.from(audio.data, 'base64'));
    partes.push(wav);
    console.log('turno ' + (i + 1) + ' (' + (quien === 'm' ? 'ella' : 'él') + '): ' + (segundosDeWav(fs.readFileSync(wav))).toFixed(1) + ' s');
    await dormir(1500);
  }
  const silencio = path.join(SALIDA, 'silencio.wav');
  await correr(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', '0.3', silencio]);
  const lista = path.join(SALIDA, 'lista.txt');
  const aRuta = (x) => x.split(path.sep).join('/');
  fs.writeFileSync(lista, partes.map((p) => `file '${aRuta(p)}'\nfile '${aRuta(silencio)}'`).join('\n'));
  const salida = path.join(SALIDA, version2 ? 'dialogo2.mp3' : 'dialogo.mp3');
  await correr(ffmpeg, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-ar', '24000', '-ac', '1', '-b:a', '128k', salida]);
  const palabras = GUION.map((t) => t[1]).join(' ').split(/\s+/).length;
  const info = await correr(ffmpeg, ['-i', salida, '-f', 'null', '-']).catch((x) => x);
  const dur = String(info.stderr ?? '').match(/time=(\d+):(\d+):(\d+\.\d+)/g)?.pop();
  console.log('\nListo: dialogo.mp3, ' + palabras + ' palabras, ' + dur);
  process.exit(0);
}

const creadas = [];
for (const c of CANDIDATOS) {
  console.log(`\n== ${c.id} ==`);
  // El cuerpo exacto de ai.google.dev/gemini-api/docs/voice-design: store guarda la voz
  // en el proyecto (200 como máximo, un año).
  const cre = await api('POST', '/voices', {
    store: true,
    voice: {
      model: MODELO, type: 'prompted', display_name: c.nombre, gender: c.genero, language_code: 'es-AR', prompted: { input: c.descripcion },
    },
  });
  if (!cre.ok) { console.log(`crear: ERROR ${cre.estado ?? ''} ${cre.error}`); creadas.push({ ...c, error: cre.error }); continue; }
  const idVoz = cre.json?.id ?? cre.json?.name ?? null;
  console.log(`crear: ok · id ${idVoz} · ${sinAudio(cre.json)}`);
  const entrada = { ...c, idVoz };
  const muestra = buscarAudio(cre.json?.sample_audio ?? cre.json);
  if (muestra) await aMp3(Buffer.from(muestra.data, 'base64'), path.join(SALIDA, `${c.id}-muestra.mp3`));
  if (!idVoz) { creadas.push({ ...entrada, error: 'sin id' }); continue; }

  // El podcast entero con esa voz, por la Interactions API.
  const gen = await api('POST', '/interactions', {
    model: MODELO,
    input: [{ type: 'user_input', content: [{ type: 'text', text: PODCAST, annotations: [{ type: 'speech_metadata', style: ESTILO }] }] }],
    response_format: { type: 'audio' },
    generation_config: { speech_config: [{ voice: idVoz }] },
  });
  if (!gen.ok) { console.log(`podcast: ERROR ${gen.estado ?? ''} ${gen.error}`); creadas.push({ ...entrada, error: gen.error }); continue; }
  const audio = buscarAudio(gen.json);
  if (!audio) { console.log(`podcast: sin audio · ${sinAudio(gen.json)}`); creadas.push({ ...entrada, error: 'sin audio' }); continue; }
  const wav = Buffer.from(audio.data, 'base64');
  const segundos = segundosDeWav(wav);
  await aMp3(wav, path.join(SALIDA, `${c.id}-podcast.mp3`));
  const palabras = PODCAST.split(/\s+/).length;
  console.log(`podcast: ${segundos.toFixed(1)} s · ${(palabras / segundos).toFixed(2)} pal/s · ${audio.mime_type ?? ''}`);
  creadas.push({ ...entrada, segundos: Number(segundos.toFixed(1)), palabrasPorSegundo: Number((palabras / segundos).toFixed(2)) });
  await dormir(3000);
}
fs.writeFileSync(path.join(SALIDA, 'voces-creadas.json'), JSON.stringify(creadas, null, 2));
console.log(`\nListo: ${creadas.filter((c) => !c.error).length} de ${creadas.length} voces creadas y probadas.`);

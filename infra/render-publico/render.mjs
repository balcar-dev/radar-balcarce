// El render de video de Radar Balcarce (18/10/2026). Vive en un repositorio PÚBLICO aparte (radarbalcarce/radar-balcarce-render) y NO tiene ningún secreto:
// recibe un pedido (reels/pedido.mjs) y la voz ya generada, dibuja las placas (resvg) y arma el video con subtítulos (ffmpeg), y deja el resultado donde le
// dicen. Quién decide qué sale, quién pide la voz a Gemini y quién publica en Facebook e Instagram es el repositorio principal, que es privado.
//
// Cómo corre: GitHub Actions lo despierta con un `repository_dispatch` (tipo «render», .github/workflows/render.yml). El aviso trae:
//   huella    el resumen del pedido (lo que identifica el video)
//   nombre    el nombre de la pieza
//   pedido    una dirección firmada y temporal para BAJAR pedido.json
//   voz       una dirección firmada y temporal para BAJAR voz.mp3
//   subidas   { <archivo>: dirección firmada y temporal para SUBIR ese archivo }
// Las direcciones firmadas valen una hora y sirven para UN objeto y UN verbo cada una: no abren nada más. Se enmascaran en el registro público.
//
//   node render.mjs                       lee el aviso de la variable de entorno PAYLOAD (así corre en GitHub)
//   node render.mjs --local=carpeta       prueba a mano: la carpeta lleva pedido.json y voz.mp3; deja el resultado en carpeta/salida/
//
// El orden de las subidas importa: el manifiesto va ÚLTIMO. El Worker de tareas del repositorio principal sólo publica cuando ve el manifiesto, y para
// entonces ya están el video, la tapa y los subtítulos.
//
// Sólo Node 24 y los dos paquetes de package.json (@resvg/resvg-js y ffmpeg-static).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  problemasDelPedido, huellaDelPedido, archivosDeSalida, NOMBRE_DE_LA_VOZ, VERSION_DEL_PEDIDO,
} from './reels/pedido.mjs';
import { FUNCIONES_DE_ESCENA, rehacerEscena } from './reels/escenas/registro.mjs';
import { alinear } from './reels/alinear.mjs';
import { armarReel } from './reels/reel.mjs';
import { HISTORIA_MAXIMA } from './reels/duracion.mjs';

const AQUI = import.meta.dirname;
/** La carpeta donde reel.mjs deja los videos: tiene que estar al lado de reels/marca/ (los subtítulos buscan las tipografías en ../marca/fuentes). */
export const CARPETA_DE_SALIDA = path.join(AQUI, 'reels', 'salida');
/** Sólo se sube o se baja a R2: ni a un servidor cualquiera ni sin cifrar. */
export const ANFITRION_PERMITIDO = /\.r2\.cloudflarestorage\.com$/;
export const TIPOS = { mp4: 'video/mp4', png: 'image/png', ass: 'text/plain; charset=utf-8', json: 'application/json' };

/** ¿Es una dirección que el render acepta (https y de R2)? */
export function direccionValida(texto) {
  try {
    const u = new URL(String(texto));
    return u.protocol === 'https:' && ANFITRION_PERMITIDO.test(u.hostname) && !u.username && !u.password;
  } catch { return false; }
}

/** Revisa el aviso que llegó. Devuelve los problemas (vacío = bien). */
export function problemasDelAviso(aviso) {
  const e = [];
  if (!aviso || typeof aviso !== 'object') return ['el aviso no es un objeto'];
  if (!/^[0-9a-f]{24}$/.test(String(aviso.huella ?? ''))) e.push('la huella no es válida');
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(String(aviso.nombre ?? ''))) e.push('el nombre no es válido');
  if (!direccionValida(aviso.pedido)) e.push('la dirección del pedido no es de R2');
  if (!direccionValida(aviso.voz)) e.push('la dirección de la voz no es de R2');
  const esperadas = archivosDeSalida(String(aviso.nombre ?? ''));
  const dadas = Object.keys(aviso.subidas ?? {}).sort();
  if (JSON.stringify(dadas) !== JSON.stringify([...esperadas].sort())) e.push(`las subidas tienen que ser exactamente: ${esperadas.join(', ')}`);
  for (const [a, url] of Object.entries(aviso.subidas ?? {})) if (!direccionValida(url)) e.push(`la dirección para subir ${a} no es de R2`);
  return e;
}

/**
 * Arma el video de un pedido. `voz` son los bytes del mp3 que dio el principal.
 * Devuelve { carpeta, manifiesto, archivos } (archivos = los nombres que quedaron en la carpeta para subir, el manifiesto aparte).
 */
export async function renderizar({ pedido, voz, carpeta = CARPETA_DE_SALIDA, log = console.log, armar = armarReel }) {
  const problemas = problemasDelPedido(pedido, { funcionesDeEscena: FUNCIONES_DE_ESCENA });
  if (problemas.length) throw new Error(`pedido rechazado: ${problemas.join('; ')}`);
  if (pedido.opciones.historiaMaxima !== HISTORIA_MAXIMA) {
    throw new Error(`la historia máxima del pedido (${pedido.opciones.historiaMaxima} s) no es la de este render (${HISTORIA_MAXIMA} s): hay que volver a sincronizar el render con el principal`);
  }
  if (voz.length !== pedido.voz.bytes || crypto.createHash('sha256').update(voz).digest('hex') !== pedido.voz.sha256) {
    throw new Error('la voz que llegó no es la del pedido (no coincide su huella)');
  }
  const huella = huellaDelPedido(pedido);
  if (!fs.existsSync(path.join(carpeta, '..', 'marca', 'fuentes'))) throw new Error('la carpeta de salida tiene que estar al lado de reels/marca/fuentes (los subtítulos buscan ahí las tipografías)');

  fs.rmSync(carpeta, { recursive: true, force: true });
  fs.mkdirSync(carpeta, { recursive: true });

  // La voz ya viene hecha: sólo hay que ubicar cada palabra en el tiempo (reels/alinear.mjs, sólo ffmpeg), igual que cuando la pide el principal.
  const hablar = async (texto, destino) => {
    fs.writeFileSync(destino, voz);
    const a = await alinear(texto, destino);
    return { archivo: destino, duracion: a.duracion, palabras: a.palabras, anclasUsadas: a.anclasUsadas };
  };
  // La escena animada: si no se puede rehacer, la pieza sale con su placa, como siempre (la animación nunca frena una pieza).
  let escena = null;
  if (pedido.escena && pedido.opciones.animar) {
    try { escena = rehacerEscena(pedido.escena); } catch (e) { log(`  (la escena de ${pedido.nombre} no se pudo rehacer y sale con la placa quieta: ${String(e.message).split('\n')[0]})`); }
  }
  const r = await armar({
    nombre: pedido.nombre,
    svg: pedido.placa,
    svg2: pedido.segunda,
    guion: pedido.guion,
    acento: pedido.acento,
    escena,
    secuencia: pedido.secuencia,
    animar: pedido.opciones.animar,
    // Nunca se usa (la voz viene en el pedido): sólo evita buscar el reparto de voces del principal.
    vozGemini: 'render',
    hablar,
  }, carpeta);

  const manifiesto = {
    version: VERSION_DEL_PEDIDO,
    nombre: pedido.nombre,
    huella,
    archivo: path.basename(r.mp4),
    duracion: Number(r.duracion.toFixed(1)),
    ...(r.historia ? { archivoHistoria: path.basename(r.historia.mp4), duracionHistoria: Number(r.historia.duracion.toFixed(1)) } : {}),
    tapa: `${pedido.nombre}.png`,
    subtitulos: `${pedido.nombre}.ass`,
    generado: new Date().toISOString(),
  };
  const archivos = archivosDeSalida(pedido.nombre).filter((a) => a !== 'manifiesto.json' && fs.existsSync(path.join(carpeta, a)));
  fs.writeFileSync(path.join(carpeta, 'manifiesto.json'), `${JSON.stringify(manifiesto, null, 2)}\n`);
  return { carpeta, manifiesto, archivos };
}

async function conReintentos(que, hacer, intentos = 3, esperar = (ms) => new Promise((r) => { setTimeout(r, ms); })) {
  let ultimo;
  for (let i = 1; i <= intentos; i += 1) {
    try { return await hacer(); } catch (e) { ultimo = e; if (i < intentos) await esperar(2000 * i); }
  }
  throw new Error(`${que}: ${String(ultimo?.message ?? ultimo).slice(0, 160)}`);
}

/** Baja una dirección firmada. Nunca muestra la dirección en el error. */
export async function bajar(url, { fetchFn = fetch, maximo = 25 * 1024 * 1024 } = {}) {
  const r = await fetchFn(url, { signal: AbortSignal.timeout(120_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes.length > maximo) throw new Error('el archivo es más grande de lo esperado');
  return bytes;
}

/** Sube un archivo a su dirección firmada. */
export async function subir(url, archivo, { fetchFn = fetch } = {}) {
  const r = await fetchFn(url, { method: 'PUT', headers: { 'content-type': TIPOS[archivo.split('.').pop()] ?? 'application/octet-stream' }, body: fs.readFileSync(archivo), signal: AbortSignal.timeout(300_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

/** Todo el trabajo de un aviso: bajar, armar, subir (el manifiesto al final). Devuelve el manifiesto. */
export async function atenderAviso(aviso, { fetchFn = fetch, log = console.log, carpeta = CARPETA_DE_SALIDA } = {}) {
  // Primero lo primero: ni una dirección firmada sale en el registro (que es público).
  if (process.env.GITHUB_ACTIONS) for (const u of [aviso?.pedido, aviso?.voz, ...Object.values(aviso?.subidas ?? {})]) if (u) log(`::add-mask::${u}`);
  const problemas = problemasDelAviso(aviso);
  if (problemas.length) throw new Error(`aviso rechazado: ${problemas.join('; ')}`);

  const pedido = JSON.parse(new TextDecoder().decode(await conReintentos('bajar el pedido', () => bajar(aviso.pedido, { fetchFn }))));
  const voz = await conReintentos('bajar la voz', () => bajar(aviso.voz, { fetchFn }));
  if (huellaDelPedido(pedido) !== aviso.huella) throw new Error('la huella del pedido no es la del aviso');
  if (pedido.nombre !== aviso.nombre) throw new Error('el nombre del pedido no es el del aviso');

  const { manifiesto, archivos } = await renderizar({ pedido, voz, carpeta, log });
  log(`  video listo: ${manifiesto.archivo} · ${manifiesto.duracion} s${manifiesto.archivoHistoria ? ` · historia ${manifiesto.duracionHistoria} s` : ''}`);
  for (const a of archivos) await conReintentos(`subir ${a}`, () => subir(aviso.subidas[a], path.join(carpeta, a), { fetchFn }));
  await conReintentos('subir el manifiesto', () => subir(aviso.subidas['manifiesto.json'], path.join(carpeta, 'manifiesto.json'), { fetchFn }));
  log('  subido.');
  return manifiesto;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const local = process.argv.find((a) => a.startsWith('--local='))?.slice(8);
  try {
    if (local) {
      const pedido = JSON.parse(fs.readFileSync(path.join(local, 'pedido.json'), 'utf8'));
      const voz = fs.readFileSync(path.join(local, NOMBRE_DE_LA_VOZ));
      const { manifiesto } = await renderizar({ pedido, voz, carpeta: path.join(AQUI, 'reels', 'salida') });
      console.log(JSON.stringify(manifiesto, null, 2));
    } else {
      await atenderAviso(JSON.parse(process.env.PAYLOAD ?? 'null'));
    }
  } catch (e) {
    console.error(`El render no pudo terminar: ${String(e?.message ?? e).slice(0, 400)}`);
    process.exit(1);
  }
}

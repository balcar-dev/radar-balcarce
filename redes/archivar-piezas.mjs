// El ARCHIVO DE PIEZAS (15/10/2026): lo que arma el robot para las redes (videos, audios con la voz de Gemini, subtítulos y placas) vive en
// reels/salida/ dentro de GitHub Actions y se sube como artefacto 3 o 7 días; después se pierde. Meta guarda lo posteado, pero no los
// archivos propios (sobre todo el audio, que gasta cupo de voz, y el video fuente). Este script los copia a un depósito PROPIO de
// Cloudflare R2 (variable de GitHub R2_PIEZAS, nombre recomendado `radar-piezas`), después de publicar. Guía: docs/redes/ARCHIVO-DE-PIEZAS.md.
//
//   node redes/archivar-piezas.mjs            SIMULACIÓN (la de por defecto): no usa la red ni escribe nada; dice qué subiría y qué dejaría
//   node redes/archivar-piezas.mjs --subir    sube de verdad (hace falta R2_PIEZAS, CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID; no se imprimen)
//
// Opciones: --salida=reels/salida · --datos=web/data · --bucket=nombre (gana sobre R2_PIEZAS) · --limite=240 (segundos: pasado ese tiempo
// no se sube nada más y se guarda el índice con lo hecho) · --dia=AAAA-MM-DD (sólo para pruebas).
//
// Cómo queda en el depósito:
//   piezas/AAAA/MM/DD/<video|audio|subtitulos|imagen>/<archivo>     el archivo, tal cual
//   piezas/AAAA/MM/DD/indice.json                                   qué hay ese día: nota, fecha, hora, red, tipo, sha256, tamaño, enlace, firma
//
// Reglas:
//   · NUNCA frena ni retrasa la publicación: se corre después de publicar, con `continue-on-error: true` en los workflows; sin R2_PIEZAS o
//     sin credenciales dice "sin archivo de piezas" y termina bien. Una falla de red se cuenta y no tira nada.
//   · No duplica: si el sha256 ya está en el índice del día, no se vuelve a subir.
//   · No sube lo que espera a una persona (semáforo rojo, Política y Policiales sin visto bueno para las redes, aprobada por una persona
//     sin marcarla para las redes) ni lo retirado (web/data/retiradas.json, bloqueada o descartada en el celular), ni una pieza cuya nota no
//     se encuentra en los datos (no se puede comprobar: no se sube). Un podcast con una sola nota así queda entero afuera.
//   · Sólo sube lo que el manifiesto de la corrida (reels/salida/piezas.json) dice que es una pieza: nada de lo suelto que haya en la carpeta.
//   · No escribe NUNCA en el depósito de respaldos ni en el de fotos.
//
// Sin dependencias: sólo Node y los módulos propios. Para subir usa wrangler (la versión fija de los otros workflows).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { diaAR, horaCortaAR } from '../ingesta/zona.mjs';
import { SECCIONES_QUE_ESPERAN_PERSONA } from '../ingesta/criterio.mjs';
import { aprobadaParaLasRedes, loAproboUnaPersona } from './elegir.mjs';
import { idsRetiradosAMano } from '../web/lib/archivo.js';
import { firmaCorta } from '../web/components/metadatos.js';

const AQUI = import.meta.dirname;
const RAIZ = path.join(AQUI, '..');

export const VERSION_DE_WRANGLER = '4.139.0';
export const DEPOSITO_POR_DEFECTO = 'radar-piezas';
export const LIMITE_POR_DEFECTO = 240;
export const PREFIJO = 'piezas';
export const SIN_ARCHIVO = 'sin archivo de piezas';

/** Qué archivos se guardan, en qué carpeta del día van y con qué tipo se sirven. */
export const EXTENSIONES = {
  mp4: { carpeta: 'video', tipo: 'video/mp4' },
  mov: { carpeta: 'video', tipo: 'video/quicktime' },
  mp3: { carpeta: 'audio', tipo: 'audio/mpeg' },
  wav: { carpeta: 'audio', tipo: 'audio/wav' },
  ass: { carpeta: 'subtitulos', tipo: 'text/plain; charset=utf-8' },
  srt: { carpeta: 'subtitulos', tipo: 'text/plain; charset=utf-8' },
  png: { carpeta: 'imagen', tipo: 'image/png' },
  jpg: { carpeta: 'imagen', tipo: 'image/jpeg' },
  jpeg: { carpeta: 'imagen', tipo: 'image/jpeg' },
  webp: { carpeta: 'imagen', tipo: 'image/webp' },
};

/** Restos de armado que reels/reel.mjs borra al terminar; si quedaran, no son piezas. */
const TEMPORALES = [/-a\d+-\d{3,4}\.png$/, /-base\.mp4$/];

const NOMBRE_SEGURO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

// ------------------------------------------------------------------ las notas de cada pieza

/** El texto "qué espera a una persona" de una nota, o null si puede ir. */
export function porQueEspera(nota) {
  if (!nota) return 'nota-sin-datos';
  if (nota.semaforo === 'rojo') return 'semaforo-rojo';
  if (aprobadaParaLasRedes(nota)) return null; // una persona la marcó para las redes: lo decidió ella
  if (SECCIONES_QUE_ESPERAN_PERSONA.includes(nota.seccion)) return `espera-a-una-persona (${nota.seccion})`;
  if (loAproboUnaPersona(nota)) return 'aprobada-por-una-persona-sin-marcarla-para-las-redes';
  return null;
}

/**
 * ¿Se puede archivar esta pieza? Mira todas sus notas. `retiradas` es el conjunto de ids retirados a mano o bloqueados/descartados en el
 * celular. Una pieza sin notas (clima, farmacia, efemérides…) siempre se puede.
 * Devuelve { ok, motivo }.
 */
export function sePuedeArchivar(pieza, { notas = new Map(), retiradas = new Set() } = {}) {
  const ids = [...new Set([pieza?.notaId, ...(pieza?.notaIds ?? [])].filter(Boolean))];
  for (const id of ids) {
    if (retiradas.has(id)) return { ok: false, motivo: `retirada (${id})` };
    const motivo = porQueEspera(notas.get(id));
    if (motivo) return { ok: false, motivo: `${motivo} (${id})` };
  }
  return { ok: true, motivo: null };
}

/** Los ids que una persona sacó: retiradas.json a mano, más bloqueadas o descartadas desde el celular. */
export function idsRetirados({ retiradas = null, decisiones = null } = {}) {
  const ids = idsRetiradosAMano(retiradas);
  const notas = decisiones && typeof decisiones === 'object' ? decisiones.notas : null;
  if (notas && typeof notas === 'object') {
    for (const [id, d] of Object.entries(notas)) if (d && (d.estado === 'bloqueada' || d.estado === 'descartada')) ids.add(id);
  }
  return ids;
}

/** Las notas por id: la portada manda sobre el archivo. */
export function notasPorId(...listas) {
  const mapa = new Map();
  for (const lista of listas.reverse()) for (const n of lista ?? []) if (n?.id) mapa.set(n.id, n);
  return mapa;
}

// ------------------------------------------------------------------ qué archivo es de qué pieza

/** A qué pieza pertenece un archivo: el nombre exacto de la pieza o el más largo que sea su prefijo con guion. null si de ninguna. */
export function piezaDelArchivo(archivo, piezas = []) {
  const ext = path.extname(archivo);
  const tronco = archivo.slice(0, archivo.length - ext.length);
  let mejor = null;
  for (const p of piezas) {
    const dicho = [p.archivo, p.archivoHistoria].filter(Boolean).includes(archivo);
    const coincide = dicho || tronco === p.nombre || tronco.startsWith(`${p.nombre}-`);
    if (!coincide) continue;
    const peso = dicho || tronco === p.nombre ? Infinity : p.nombre.length;
    if (!mejor || peso > mejor.peso) mejor = { pieza: p, peso };
  }
  return mejor?.pieza ?? null;
}

/** El tipo de archivo (video, audio, subtitulos, imagen) o null si no se guarda. */
export function datosDeExtension(archivo) {
  const ext = path.extname(archivo).slice(1).toLowerCase();
  return EXTENSIONES[ext] ? { ext, ...EXTENSIONES[ext] } : null;
}

// ------------------------------------------------------------------ los posteos

/** Dónde salió la pieza: del libro de publicaciones (web/data/redes.json). Sin libro, vacío. */
export function posteosDe(libro, nombre, dia) {
  const posteos = [];
  const clave = `${dia}/${nombre}`;
  const sumar = (red, entrada, parte) => {
    if (!entrada) return;
    posteos.push({
      red, parte, tipo: entrada.tipo ?? null, mediaId: entrada.mediaId ?? null,
      enlace: entrada.permalink ?? null, cuando: entrada.cuando ?? null,
    });
  };
  sumar('instagram', libro?.instagram?.[clave], 'principal');
  sumar('facebook', libro?.facebookVideos?.[clave], 'principal');
  sumar('instagram', libro?.historiasDeReels?.[`instagram/${clave}`], 'historia-del-reel');
  sumar('facebook', libro?.historiasDeReels?.[`facebook/${clave}`], 'historia-del-reel');
  sumar('facebook', libro?.reelsEnFacebook?.[clave], 'reel-extra');
  return posteos;
}

// ------------------------------------------------------------------ el plan

/**
 * Arma qué se archivaría. No toca la red ni escribe.
 *   manifiesto  el piezas.json de la corrida
 *   archivos    los nombres que hay en la carpeta de salida
 *   leer(nombre) devuelve el Buffer del archivo
 * Devuelve { entradas, omitidas, sueltos }: `omitidas` son piezas enteras que no se archivan y por qué; `sueltos`, archivos de la carpeta que
 * no son de ninguna pieza (no se suben).
 */
export function armarPlan({ manifiesto = [], archivos = [], leer, notas = new Map(), retiradas = new Set(), libro = null, ahora = new Date(), dia = diaAR(ahora) }) {
  const piezas = (Array.isArray(manifiesto) ? manifiesto : []).filter((p) => p && typeof p.nombre === 'string' && NOMBRE_SEGURO.test(p.nombre));
  const veredictos = new Map(piezas.map((p) => [p.nombre, sePuedeArchivar(p, { notas, retiradas })]));
  const entradas = [];
  const omitidas = [];
  const sueltos = [];
  const yaOmitidas = new Set();

  for (const archivo of [...archivos].sort()) {
    const datos = datosDeExtension(archivo);
    if (!datos || !NOMBRE_SEGURO.test(archivo) || TEMPORALES.some((r) => r.test(archivo))) { sueltos.push(archivo); continue; }
    const pieza = piezaDelArchivo(archivo, piezas);
    if (!pieza) { sueltos.push(archivo); continue; }
    const veredicto = veredictos.get(pieza.nombre);
    if (!veredicto.ok) {
      if (!yaOmitidas.has(pieza.nombre)) { yaOmitidas.add(pieza.nombre); omitidas.push({ pieza: pieza.nombre, motivo: veredicto.motivo }); }
      continue;
    }
    let buffer;
    try { buffer = leer(archivo); } catch { sueltos.push(archivo); continue; }
    if (!buffer?.length) { sueltos.push(archivo); continue; }

    const posteos = posteosDe(libro, pieza.nombre, dia);
    const ids = [...new Set([pieza.notaId, ...(pieza.notaIds ?? [])].filter(Boolean))];
    const detalle = ids.map((id) => {
      const n = notas.get(id);
      return { id, titulo: n?.titulo ?? null, seccion: n?.seccion ?? null, firma: n ? firmaCorta(n) : null };
    });
    const [AAAA, MM, DD] = dia.split('-');
    entradas.push({
      archivo,
      pieza: pieza.nombre,
      carpeta: datos.carpeta,
      tipoArchivo: datos.ext,
      contentType: datos.tipo,
      clave: `${PREFIJO}/${AAAA}/${MM}/${DD}/${datos.carpeta}/${archivo}`,
      buffer,
      bytes: buffer.length,
      sha256: sha256(buffer),
      registro: {
        id: pieza.notaId ?? ids[0] ?? null,
        notaIds: ids,
        notas: detalle,
        pieza: pieza.nombre,
        tipo: pieza.tipo ?? null, // reel o historia
        titulo: pieza.titulo ?? null,
        dia,
        fecha: ahora.toISOString(),
        hora: pieza.hora ?? horaCortaAR(ahora),
        red: [...new Set(posteos.map((p) => p.red))],
        posteos,
        enlace: posteos.find((p) => p.enlace)?.enlace ?? null,
        escritoPor: datos.carpeta === 'imagen'
          ? 'Placa dibujada por Radar Balcarce (reels/placa.mjs)'
          : 'Guion armado por Radar Balcarce con plantillas (redes/guiones.mjs), sin modelo de IA; la voz la pone Gemini',
      },
    });
  }
  return { entradas, omitidas, sueltos };
}

// ------------------------------------------------------------------ el índice del día

export const claveDelIndice = (dia) => { const [a, m, d] = dia.split('-'); return `${PREFIJO}/${a}/${m}/${d}/indice.json`; };

export const indiceVacio = (dia) => ({ version: 1, dia, actualizado: null, archivos: [] });

/** Un índice leído del depósito, o uno vacío si lo bajado no sirve. */
export function indiceValido(json, dia) {
  return json && typeof json === 'object' && Array.isArray(json.archivos) ? json : indiceVacio(dia);
}

/**
 * Mezcla lo nuevo con el índice del día, sin duplicar por sha256. Devuelve { indice, nuevas, repetidas, cambio }:
 *   nuevas     las entradas que hay que subir (con su clave ya definitiva: si el nombre ya existía con otro contenido, lleva el sha8 al final)
 *   repetidas  las que ya estaban (mismo sha256): no se suben; si traen un enlace o una red que antes faltaba, se completa el índice
 */
export function mezclarIndice(indice, entradas, { dia }) {
  const mezcla = { ...indice, archivos: indice.archivos.map((a) => ({ ...a })) };
  const porSha = new Map(mezcla.archivos.map((a) => [a.sha256, a]));
  const claves = new Set(mezcla.archivos.map((a) => a.clave));
  const nuevas = [];
  const repetidas = [];
  let cambio = false;

  for (const e of entradas) {
    const previa = porSha.get(e.sha256);
    if (previa) {
      repetidas.push(e);
      const r = e.registro;
      if (!previa.enlace && r.enlace) { previa.enlace = r.enlace; cambio = true; }
      if (r.posteos.length > (previa.posteos?.length ?? 0)) { previa.posteos = r.posteos; previa.red = r.red; cambio = true; }
      if (e.archivo !== previa.archivo && !(previa.alias ?? []).includes(e.archivo) && e.pieza === previa.pieza) {
        previa.alias = [...(previa.alias ?? []), e.archivo];
        cambio = true;
      }
      continue;
    }
    let clave = e.clave;
    if (claves.has(clave)) { // el mismo nombre con otro contenido: se guardan los dos
      const punto = clave.lastIndexOf('.');
      clave = `${clave.slice(0, punto)}-${e.sha256.slice(0, 8)}${clave.slice(punto)}`;
    }
    claves.add(clave);
    const entrada = { ...e, clave };
    nuevas.push(entrada);
    const fila = { clave, archivo: path.posix.basename(clave), tipoArchivo: e.tipoArchivo, carpeta: e.carpeta, sha256: e.sha256, bytes: e.bytes, ...e.registro };
    mezcla.archivos.push(fila);
    porSha.set(e.sha256, fila);
    cambio = true;
  }
  mezcla.dia = dia;
  return { indice: mezcla, nuevas, repetidas, cambio };
}

// ------------------------------------------------------------------ las guardas

/** Qué depósito se usa: --bucket gana; si no, la variable R2_PIEZAS ("si" vale por el nombre por defecto). Vacío = no hay. */
export function elegirDeposito({ bucket = '', env = process.env } = {}) {
  const pedido = String(bucket || '').trim();
  if (pedido) return pedido;
  const variable = String(env.R2_PIEZAS ?? '').trim();
  if (!variable) return '';
  if (/^(si|sí|true|1|yes)$/i.test(variable)) return DEPOSITO_POR_DEFECTO;
  return variable;
}

/** ¿Se puede escribir en este depósito? Nunca en el de respaldos ni en el de fotos. */
export function comprobarDeposito(bucket, { env = process.env } = {}) {
  const nombre = String(bucket ?? '').trim();
  if (!nombre) return { ok: false, motivo: 'falta el depósito' };
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(nombre)) return { ok: false, motivo: `el nombre de depósito "${nombre}" no es válido` };
  const protegidos = [env.R2_RESPALDOS, env.R2_FOTOS].map((x) => String(x ?? '').trim()).filter(Boolean);
  if (/respaldo|backup/i.test(nombre) || protegidos.includes(nombre)) return { ok: false, motivo: `"${nombre}" es un depósito de respaldos o de fotos: el archivo de piezas nunca escribe ahí` };
  return { ok: true };
}

/** Texto sin los valores secretos del entorno (por si wrangler los repite en un error). */
export function sinSecretos(texto, env = process.env) {
  let salida = String(texto ?? '');
  for (const k of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']) {
    const v = env[k];
    if (v && String(v).length >= 6) salida = salida.split(String(v)).join('***');
  }
  return salida;
}

// ------------------------------------------------------------------ wrangler

/**
 * Corre wrangler (versión fija). Se resuelve siempre con { ok, salida }. Para las pruebas, PIEZAS_WRANGLER_JSON puede ser un arreglo JSON
 * con el comando entero que reemplaza a `npx wrangler` (por ejemplo ["node","falso.mjs"]).
 */
export function correrWrangler(args, { env = process.env } = {}) {
  return new Promise((resolve) => {
    let comando;
    let extra = {};
    try { comando = env.PIEZAS_WRANGLER_JSON ? JSON.parse(env.PIEZAS_WRANGLER_JSON) : null; } catch { comando = null; }
    if (!Array.isArray(comando) || !comando.length) {
      comando = [process.platform === 'win32' ? 'npx.cmd' : 'npx', '--yes', `wrangler@${VERSION_DE_WRANGLER}`];
      extra = { shell: process.platform === 'win32' };
    }
    execFile(comando[0], [...comando.slice(1), ...args], { env, maxBuffer: 8 * 1024 * 1024, ...extra }, (error, stdout, stderr) => {
      resolve({ ok: !error, salida: sinSecretos(`${stdout ?? ''}${stderr ?? ''}`, env).slice(-600) });
    });
  });
}

/** Crea el depósito si no existe (como hace archivo-staging.yml). Devuelve { ok, creado, salida }. */
export async function asegurarDeposito(bucket, ejecutar) {
  const lista = await ejecutar(['r2', 'bucket', 'list']);
  if (!lista.ok) return { ok: false, creado: false, salida: lista.salida };
  const hay = new RegExp(`name:\\s*${bucket.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm').test(lista.salida);
  if (hay) return { ok: true, creado: false, salida: '' };
  const r = await ejecutar(['r2', 'bucket', 'create', bucket]);
  return { ok: r.ok, creado: r.ok, salida: r.salida };
}

const NO_EXISTE = /does not exist|not found|10007|NoSuchKey|specified key/i;

/** Baja el índice del día. { ok, indice }: ok false si falló por otra cosa que "no existe" (entonces NO se escribe encima). */
export async function leerIndiceDelDeposito({ bucket, dia, ejecutar }) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'piezas-r2-'));
  try {
    const archivo = path.join(carpeta, 'indice.json');
    const r = await ejecutar(['r2', 'object', 'get', `${bucket}/${claveDelIndice(dia)}`, '--file', archivo, '--remote']);
    if (r.ok && fs.existsSync(archivo)) {
      try { return { ok: true, indice: indiceValido(JSON.parse(fs.readFileSync(archivo, 'utf8')), dia) }; } catch { return { ok: false, indice: null, salida: 'el índice del día está roto' }; }
    }
    if (!r.ok && NO_EXISTE.test(r.salida ?? '')) return { ok: true, indice: indiceVacio(dia) };
    return { ok: false, indice: null, salida: r.salida ?? '' };
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
}

async function enTandas(lista, concurrencia, hacer) {
  let siguiente = 0;
  const obreros = Array.from({ length: Math.max(1, Math.min(concurrencia, lista.length)) }, async () => {
    for (;;) {
      const i = siguiente++;
      if (i >= lista.length) return;
      await hacer(lista[i], i);
    }
  });
  await Promise.all(obreros);
}

/**
 * Sube los archivos nuevos y después el índice (sólo con lo que salió bien). Devuelve { subidas, fallidas, indiceSubido }.
 * `hasta` es la hora (ms) pasada la cual no se empieza ninguna subida más.
 */
export async function subirNuevas({ bucket, nuevas, indice, dia, ejecutar, concurrencia = 4, reintentos = 2, hasta = Infinity, ahora = () => Date.now() }) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'piezas-r2-'));
  const subidas = [];
  const fallidas = [];
  try {
    await enTandas(nuevas, concurrencia, async (e, i) => {
      if (ahora() > hasta) { fallidas.push({ clave: e.clave, salida: 'se acabó el tiempo' }); return; }
      const archivo = path.join(carpeta, `${i}.bin`);
      fs.writeFileSync(archivo, e.buffer);
      let ultimo = null;
      for (let intento = 1; intento <= reintentos; intento += 1) {
        const r = await ejecutar(['r2', 'object', 'put', `${bucket}/${e.clave}`, '--file', archivo, '--content-type', e.contentType, '--remote']);
        if (r.ok) { subidas.push(e.clave); fs.rmSync(archivo, { force: true }); return; }
        ultimo = r;
      }
      fs.rmSync(archivo, { force: true });
      fallidas.push({ clave: e.clave, salida: ultimo?.salida ?? '' });
    });

    // El índice sólo cuenta lo que de verdad quedó en el depósito.
    const fallo = new Set(fallidas.map((f) => f.clave));
    const final = { ...indice, archivos: indice.archivos.filter((a) => !fallo.has(a.clave)), actualizado: new Date().toISOString() };
    const archivo = path.join(carpeta, 'indice.json');
    fs.writeFileSync(archivo, `${JSON.stringify(final, null, 2)}\n`);
    const r = await ejecutar(['r2', 'object', 'put', `${bucket}/${claveDelIndice(dia)}`, '--file', archivo, '--content-type', 'application/json', '--remote']);
    if (!r.ok) fallidas.push({ clave: claveDelIndice(dia), salida: r.salida ?? '' });
    return { subidas, fallidas, indiceSubido: r.ok };
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
}

// ------------------------------------------------------------------ la línea de comandos

function leerJson(ruta, porDefecto) {
  try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch { return porDefecto; }
}

/** Los pedazos de --clave=valor y --bandera. */
export function leerArgumentos(argv) {
  const a = {};
  for (const x of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(x);
    if (m) a[m[1]] = m[2] === undefined ? true : m[2];
  }
  return a;
}

const kb = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`);

function alResumen(lineas, env) {
  if (!env.GITHUB_STEP_SUMMARY) return;
  try { fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `${lineas.join('\n')}\n`); } catch { /* el resumen es un lujo */ }
}

/**
 * La corrida entera. Devuelve el código de salida: 0 bien (también "sin archivo de piezas"), 1 si falló alguna subida, 2 si está mal pedido.
 * `ejecutar` (wrangler) y `escribir` se reemplazan en las pruebas.
 */
export async function principal(argv = process.argv.slice(2), { env = process.env, ejecutar = correrWrangler, escribir = (t) => console.log(t), ahora = new Date() } = {}) {
  const a = leerArgumentos(argv);
  const salida = path.resolve(String(a.salida ?? path.join(RAIZ, 'reels', 'salida')));
  const datos = path.resolve(String(a.datos ?? path.join(RAIZ, 'web', 'data')));
  const subir = a.subir === true;
  const dia = typeof a.dia === 'string' ? a.dia : diaAR(ahora);
  const limite = a.limite !== undefined ? Number(a.limite) : LIMITE_POR_DEFECTO;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !Number.isFinite(limite) || limite <= 0) { escribir('Mal pedido: --dia es AAAA-MM-DD y --limite un número de segundos.'); return 2; }

  const rutaManifiesto = path.join(salida, 'piezas.json');
  const manifiesto = fs.existsSync(rutaManifiesto) ? leerJson(rutaManifiesto, null) : null;
  if (!Array.isArray(manifiesto) || !manifiesto.length) {
    escribir(`Archivo de piezas: no hay piezas armadas en esta corrida (${path.basename(salida)}/piezas.json), nada que archivar.`);
    return 0;
  }

  const portada = leerJson(path.join(datos, 'portada.json'), {});
  const archivo = leerJson(path.join(datos, 'archivo.json'), {});
  const notas = notasPorId(portada.notas, archivo.notas);
  const retiradas = idsRetirados({ retiradas: leerJson(path.join(datos, 'retiradas.json'), null), decisiones: leerJson(path.join(datos, 'celular-decisiones.json'), null) });
  const libro = leerJson(path.join(datos, 'redes.json'), null);
  const nombres = fs.readdirSync(salida, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name);

  const plan = armarPlan({ manifiesto, archivos: nombres, leer: (n) => fs.readFileSync(path.join(salida, n)), notas, retiradas, libro, ahora, dia });
  const total = plan.entradas.reduce((s, e) => s + e.bytes, 0);

  const lineas = [
    `Archivo de piezas (${subir ? 'SUBIDA' : 'SIMULACIÓN: no se escribe nada ni se usa la red'}) · día ${dia}`,
    `  piezas del manifiesto: ${manifiesto.length} · archivos a guardar: ${plan.entradas.length} (${kb(total)}) · sueltos sin pieza (no se suben): ${plan.sueltos.length}`,
  ];
  for (const o of plan.omitidas) lineas.push(`  NO se guarda ${o.pieza}: ${o.motivo}`);
  for (const e of plan.entradas.slice(0, 40)) lineas.push(`  · ${e.clave} (${kb(e.bytes)})`);
  if (plan.entradas.length > 40) lineas.push(`  · … y ${plan.entradas.length - 40} más`);
  for (const l of lineas) escribir(l);

  if (!subir) { escribir('Simulación terminada. Para subir de verdad: --subir (con R2_PIEZAS y las credenciales de Cloudflare).'); return 0; }

  // ---- subir: todo lo que falte es "sin archivo de piezas" y no es un error
  const bucket = elegirDeposito({ bucket: typeof a.bucket === 'string' ? a.bucket : '', env });
  if (!bucket) { escribir(`${SIN_ARCHIVO}: falta la variable R2_PIEZAS (ver docs/redes/ARCHIVO-DE-PIEZAS.md).`); alResumen([`- Archivo de piezas: **${SIN_ARCHIVO}** (falta la variable R2_PIEZAS)`], env); return 0; }
  const guarda = comprobarDeposito(bucket, { env });
  if (!guarda.ok) { escribir(`${SIN_ARCHIVO}: ${guarda.motivo}.`); alResumen([`- Archivo de piezas: **${SIN_ARCHIVO}** (${guarda.motivo})`], env); return 0; }
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
    escribir(`${SIN_ARCHIVO}: faltan CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID.`);
    alResumen([`- Archivo de piezas: **${SIN_ARCHIVO}** (faltan las credenciales de Cloudflare)`], env);
    return 0;
  }
  if (!plan.entradas.length) { escribir('Nada para archivar en esta corrida.'); return 0; }

  const hasta = Date.now() + limite * 1000;
  const dep = await asegurarDeposito(bucket, ejecutar);
  if (!dep.ok) { escribir(`No se pudo comprobar o crear el depósito ${bucket}: ${String(dep.salida).replace(/\s+/g, ' ').slice(0, 200)}`); return 1; }
  if (dep.creado) escribir(`  depósito ${bucket} creado`);

  const previo = await leerIndiceDelDeposito({ bucket, dia, ejecutar });
  if (!previo.ok) { escribir(`No se pudo leer el índice del día (no se escribe encima): ${String(previo.salida).replace(/\s+/g, ' ').slice(0, 200)}`); return 1; }

  const mezcla = mezclarIndice(previo.indice, plan.entradas, { dia });
  escribir(`  por subir ${mezcla.nuevas.length}, ya estaban ${mezcla.repetidas.length}`);
  if (!mezcla.nuevas.length && !mezcla.cambio) { alResumen([`- Archivo de piezas: nada nuevo (${mezcla.repetidas.length} ya estaban en **${bucket}**)`], env); return 0; }

  const r = await subirNuevas({ bucket, nuevas: mezcla.nuevas, indice: mezcla.indice, dia, ejecutar, hasta });
  escribir(`  subidas ${r.subidas.length}, fallidas ${r.fallidas.length}${r.indiceSubido ? ', índice del día al día' : ''}`);
  for (const f of r.fallidas.slice(0, 10)) escribir(`  FALLÓ ${f.clave}: ${String(f.salida).replace(/\s+/g, ' ').slice(0, 200)}`);
  alResumen([`- Archivo de piezas: **${r.subidas.length}** archivos nuevos en **${bucket}** (${kb(mezcla.nuevas.reduce((s, e) => s + e.bytes, 0))})${r.fallidas.length ? `, ${r.fallidas.length} FALLARON` : ''}`], env);
  return r.fallidas.length ? 1 : 0;
}

if (process.argv[1] && process.argv[1].endsWith('archivar-piezas.mjs')) {
  principal().then((codigo) => process.exit(codigo)).catch((e) => {
    // Nunca frenar nada: cualquier error inesperado se cuenta y se sale con 1 (el workflow tiene continue-on-error).
    console.error(`El archivo de piezas falló: ${sinSecretos(e?.message ?? e)}`);
    process.exit(1);
  });
}

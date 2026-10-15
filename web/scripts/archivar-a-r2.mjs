// El exportador del archivo permanente (15/10/2026, docs/salud-tecnica/ARCHIVO-PERMANENTE.md y ARCHIVO-PERMANENTE-IMPLEMENTACION.md).
//
// Cloudflare Pages acepta 20.000 archivos y el sitio sólo guarda las últimas MAXIMO_EN_ARCHIVO notas (web/lib/archivo.js). Las que están por
// salir (o que ya salieron) se guardan acá, ya dibujadas, en un depósito R2; el Worker de infra/archivo-cloudflare/ las sirve con la misma
// dirección. Este script decide cuáles, las prepara tal como las sirve el sitio y arma el manifiesto.
//
//   node web/scripts/archivar-a-r2.mjs                       SIMULACIÓN: no escribe nada, no usa la red; cuenta y muestra
//   node web/scripts/archivar-a-r2.mjs --manifiesto=x.json   además guarda el manifiesto en ese archivo (nunca dentro de web/data)
//   node web/scripts/archivar-a-r2.mjs --subir --bucket=radar-archivo-staging   sube de verdad (hace falta CLOUDFLARE_API_TOKEN y
//                                                                          CLOUDFLARE_ACCOUNT_ID en el entorno; no se imprimen nunca)
//
// Opciones: --out=web/out (el sitio ya compilado, de donde sale el HTML) · --datos=web/data · --tope=3700 (MAXIMO_EN_ARCHIVO) ·
//   --margen=200 (cuántas notas ANTES de salir se archivan: unos 4 días) · --max=N (a lo sumo N notas, las más viejas primero) ·
//   --confirmar-borrado (deja borrar más del 5 % del depósito de una vez) · --ids=a,b (sólo esas) · --sin-fotos · --con-instagram (también la imagen de Instagram, ~800 KB por nota) · --borrar (con --subir: borra del depósito lo retirado desde la última vez) ·
//   --produccion (permite un depósito que no se llame "staging" o "prueba").
//
// Qué se archiva: las notas "viejas" = las que quedan fuera de las primeras (tope - margen) del orden en que el sitio se queda con ellas
// (primero las que salieron en redes, después las más nuevas: `actualizarArchivo`). Si la nota ya no tiene HTML en web/out (salió del sitio
// antes de que existiera el archivo), se anota como omitida: hace falta un armado de rescate (guía, sección "Lo que ya salió").
//
// Qué se le hace al HTML (prepararHtml): el CSS de Next, que cambia de nombre en cada armado, se copia adentro; los scripts se sacan (una
// nota vieja se lee sin JavaScript; los datos estructurados `application/ld+json` se quedan); y se saca lo que se congela mal (la franja
// de arriba con la fecha, el clima y la farmacia del día del armado, los "hace 5 días" y los botones que sólo andan con JavaScript). El resto del HTML es el del sitio, letra por
// letra: la prueba de contrato (pruebas/archivar-a-r2.test.mjs) lo cuida.
//
// Sin dependencias: sólo Node y los módulos propios. Para subir usa wrangler (el mismo, fijo, de los otros workflows).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { MAXIMO_EN_ARCHIVO, idsRetiradosAMano } from '../lib/archivo.js';
import { parteDeNota } from '../lib/ruta.js';
import {
  claveDePagina, claveDeTarjeta, claveDeInstagram, claveDeFoto, rutaCanonicaDe,
} from '../../infra/archivo-cloudflare/worker.mjs';

const AQUI = import.meta.dirname;
const RAIZ_WEB = path.join(AQUI, '..');

export const MARGEN_POR_DEFECTO = 200;
export const VERSION_DE_WRANGLER = '4.139.0';
export const CLAVE_DEL_MANIFIESTO = 'manifiesto.json';
/** Una página de nota de verdad pesa decenas de KB; menos que esto es un archivo roto. */
export const MINIMO_DE_BYTES_DE_UNA_PAGINA = 2000;

// ------------------------------------------------------------------ qué notas

const tiempo = (n) => new Date(n?.fecha).getTime();
const porFecha = (a, b) => (tiempo(b) || 0) - (tiempo(a) || 0);

/**
 * Todas las notas que alguna vez tuvieron página: el archivo (web/data/archivo.json) y el histórico por mes (web/data/historico/*.json).
 * Si una nota está en las dos, manda la del archivo. Sin repetir ids.
 */
export function juntarNotas(archivo = [], historicos = []) {
  const porId = new Map();
  for (const lista of historicos) for (const n of lista ?? []) if (n?.id) porId.set(n.id, n);
  for (const n of archivo) if (n?.id) porId.set(n.id, n);
  return [...porId.values()];
}

/**
 * Qué notas son "viejas": las que el sitio no se queda cuando el tope baja a (tope - margen). El orden es el de `actualizarArchivo`
 * (web/lib/archivo.js): primero las que salieron en redes (su enlace circula), después el resto, cada grupo de la más nueva a la más vieja.
 * Devuelve { viejas, quedan }, `viejas` de la más vieja a la más nueva.
 */
export function elegirViejas(notas = [], { tope = MAXIMO_EN_ARCHIVO, margen = MARGEN_POR_DEFECTO, enRedes = new Set(), retiradas = new Set() } = {}) {
  const vivas = notas.filter((n) => n?.id && !retiradas.has(n.id));
  const deRedes = vivas.filter((n) => n.redes || enRedes.has(n.id)).sort(porFecha);
  const resto = vivas.filter((n) => !(n.redes || enRedes.has(n.id))).sort(porFecha);
  const prioridad = [...deRedes, ...resto];
  const cuantas = Math.max(0, Math.floor(Number(tope) - Number(margen)));
  return {
    quedan: prioridad.slice(0, cuantas),
    viejas: prioridad.slice(cuantas).sort((a, b) => -porFecha(a, b)),
  };
}

// ------------------------------------------------------------------ el HTML

/** Quita el bloque `<div class="clase">…</div>` entero, contando los <div> de adentro. Devuelve el mismo texto si no lo encuentra. */
function quitarDiv(html, clase) {
  const inicio = html.indexOf(`<div class="${clase}">`);
  if (inicio < 0) return html;
  const abre = /<div\b/g;
  const cierra = /<\/div>/g;
  let hondo = 0;
  let pos = inicio;
  for (;;) {
    abre.lastIndex = pos;
    cierra.lastIndex = pos;
    const a = abre.exec(html);
    const c = cierra.exec(html);
    if (!c) return html; // desbalanceado: no se toca
    if (a && a.index < c.index) { hondo += 1; pos = a.index + 4; } else {
      hondo -= 1;
      pos = c.index + 6;
      if (hondo === 0) return html.slice(0, inicio) + html.slice(pos);
    }
  }
}

const ATRIBUTO = (etiqueta, nombre) => new RegExp(`\\b${nombre}="([^"]*)"`, 'i').exec(etiqueta)?.[1] ?? null;
const DATOS_ESTRUCTURADOS = /\btype="application\/ld\+json"/i;

/**
 * El HTML de una nota listo para durar. `css(href)` devuelve el texto de una hoja de estilo del sitio (o null si no está).
 * Devuelve { html, problemas }: si hay problemas la nota no se archiva.
 * Es idempotente: prepararHtml(prepararHtml(x)) es igual a prepararHtml(x).
 */
export function prepararHtml(original, { css = () => null, quitarDinamico = true } = {}) {
  const problemas = [];
  let html = String(original ?? '');

  // La huella del armado que Next deja pegada al doctype: cambia en cada armado y no sirve para nada en una página sin scripts.
  html = html.replace(/^(<!DOCTYPE html>)<!--[A-Za-z0-9_-]{10,40}-->/i, '$1');

  // Las hojas de estilo propias de Next: adentro de la página (cambian de nombre en cada armado y Cloudflare no guarda las viejas).
  html = html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*>/gi, (etiqueta) => {
    const href = ATRIBUTO(etiqueta, 'href');
    if (!href || !href.startsWith('/_next/')) return etiqueta;
    const texto = css(href);
    if (typeof texto !== 'string' || !texto) { problemas.push(`no se encontró la hoja de estilo ${href}`); return etiqueta; }
    return `<style>${texto.replace(/<\/style/gi, '<\\/style')}</style>`;
  });

  // Los scripts, salvo los datos estructurados (Google los lee) y los precargadores de scripts.
  html = html.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, (todo, atributos) => (DATOS_ESTRUCTURADOS.test(atributos) ? todo : ''));
  html = html.replace(/<link\b[^>]*\b(?:as="script"|href="\/_next\/static\/chunks\/[^"]*")[^>]*>/gi, '');

  if (quitarDinamico) {
    html = quitarDiv(html, 'chapa-superior');
    html = html.replace(/<time\b[^>]*\bdata-hace=[^>]*>[\s\S]*?<\/time>/g, '');
    // Los botones que sólo andan con JavaScript (buscar, compartir por WhatsApp, copiar el enlace): sin él quedarían muertos.
    html = html.replace(/<button\b[^>]*>[\s\S]*?<\/button>/g, '');
  }

  if (/\/_next\/static\//.test(html)) problemas.push('la página sigue apuntando a /_next/static/ (algo de Next quedó sin tratar)');
  if (!/<h1[\s>]/.test(html)) problemas.push('la página no tiene titular (<h1>)');
  if (!/<\/html>\s*$/i.test(html)) problemas.push('la página no termina en </html>');
  if (Buffer.byteLength(html) < MINIMO_DE_BYTES_DE_UNA_PAGINA) problemas.push('la página es demasiado corta');
  return { html, problemas };
}

/** Las fotos del banco propio que la página pide por una dirección del propio sitio ("/fotos-notas/ID.jpg"). Las de FOTOS_BASE no. */
export function fotosDeLaPagina(html) {
  const archivos = new Set();
  for (const m of String(html ?? '').matchAll(/(?:src|href|content)="\/fotos-notas\/([A-Za-z0-9][A-Za-z0-9._-]*)"/g)) archivos.add(m[1]);
  return [...archivos];
}

// ------------------------------------------------------------------ el plan y el manifiesto

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function objetoDeTexto(clave, texto, tipo, control) {
  const buffer = Buffer.from(texto, 'utf8');
  return { clave, buffer, tipo, control, bytes: buffer.length, sha256: sha256(buffer) };
}

function objetoDeArchivo(clave, ruta, tipo, control) {
  const buffer = fs.readFileSync(ruta);
  return { clave, buffer, tipo, control, bytes: buffer.length, sha256: sha256(buffer) };
}

const CONTROL_DE_PAGINA = 'public, max-age=300, s-maxage=3600';
const CONTROL_DE_IMAGEN = 'public, max-age=86400';
const CONTROL_DE_FOTO = 'public, max-age=31536000, immutable';
const TIPO_DE_FOTO = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/**
 * Arma lo que se subiría de cada nota vieja. Lee del sitio compilado (`out`): nunca escribe. Cada entrada es
 * { id, parte, ruta, titulo, fecha, objetos: [{ clave, buffer, tipo, control, bytes, sha256 }] }.
 * `omitidas` lista las que no se pueden archivar y por qué.
 */
export function armarPlan(viejas, { out, fotos = path.join(out, 'fotos-notas'), conFotos = true, conInstagram = false, max = Infinity } = {}) {
  const hojas = new Map();
  const leerCss = (href) => {
    const limpio = href.split('?')[0].replace(/^\/+/, '');
    if (!hojas.has(limpio)) {
      const ruta = path.join(out, limpio);
      hojas.set(limpio, fs.existsSync(ruta) ? fs.readFileSync(ruta, 'utf8') : null);
    }
    return hojas.get(limpio);
  };
  const entradas = [];
  const omitidas = [];

  for (const n of viejas) {
    if (entradas.length >= max) break; // --max cuenta notas ARCHIVABLES: las omitidas (sin HTML) no gastan el cupo
    const parte = parteDeNota(n);
    const ruta = `/nota/${parte}`;
    const archivoHtml = path.join(out, 'nota', `${parte}.html`);
    if (!fs.existsSync(archivoHtml)) { omitidas.push({ id: n.id, ruta, motivo: 'sin-html-en-el-sitio' }); continue; }

    const { html, problemas } = prepararHtml(fs.readFileSync(archivoHtml, 'utf8'), { css: leerCss });
    const canonica = rutaCanonicaDe(html);
    if (canonica !== ruta) problemas.push(`la dirección canónica de la página (${canonica}) no es la de la nota (${ruta})`);
    if (problemas.length) { omitidas.push({ id: n.id, ruta, motivo: 'html-invalido', detalle: problemas }); continue; }

    const objetos = [objetoDeTexto(claveDePagina(n.id), html, 'text/html; charset=utf-8', CONTROL_DE_PAGINA)];
    const tarjeta = path.join(out, 'nota', parte, 'opengraph-image');
    if (fs.existsSync(tarjeta)) objetos.push(objetoDeArchivo(claveDeTarjeta(n.id), tarjeta, 'image/png', CONTROL_DE_IMAGEN));
    const instagram = path.join(out, 'nota', parte, 'instagram.png');
    // La imagen de Instagram (instagram.png, ~800 KB) la lee Meta una vez, al publicar: no hace falta para siempre. Con --con-instagram sí.
    if (conInstagram && fs.existsSync(instagram)) objetos.push(objetoDeArchivo(claveDeInstagram(n.id), instagram, 'image/png', CONTROL_DE_IMAGEN));
    if (conFotos) {
      for (const f of fotosDeLaPagina(html)) {
        const origen = path.join(fotos, f);
        if (fs.existsSync(origen)) objetos.push(objetoDeArchivo(claveDeFoto(f), origen, TIPO_DE_FOTO[f.split('.').pop().toLowerCase()] ?? 'application/octet-stream', CONTROL_DE_FOTO));
      }
    }
    entradas.push({ id: n.id, parte, ruta, titulo: n.titulo ?? '', fecha: n.fecha ?? null, objetos });
  }
  return { entradas, omitidas };
}

/** El manifiesto: qué hay (o habría) en el depósito. Sin los bytes de los objetos, sólo claves, tamaños y huellas. */
export function armarManifiesto(plan, { bucket = null, tope, margen, creado = new Date().toISOString() } = {}) {
  const notas = {};
  for (const e of plan.entradas) {
    notas[e.id] = {
      ruta: e.ruta, titulo: e.titulo, fecha: e.fecha,
      objetos: e.objetos.map((o) => ({ clave: o.clave, bytes: o.bytes, sha256: o.sha256 })),
    };
  }
  return {
    version: 1, creado, bucket, tope, margen,
    totales: {
      notas: plan.entradas.length,
      objetos: plan.entradas.reduce((s, e) => s + e.objetos.length, 0),
      bytes: plan.entradas.reduce((s, e) => s + e.objetos.reduce((t, o) => t + o.bytes, 0), 0),
    },
    omitidas: plan.omitidas,
    notas,
  };
}

/**
 * Qué hay que hacer comparando con el manifiesto de la vez anterior (o null si es la primera):
 *   subir   los objetos nuevos o cambiados (mismas claves con otra huella)
 *   iguales cuántos ya estaban igual (no se vuelven a subir)
 *   borrar  los objetos de notas que la vez anterior estaban y ahora están RETIRADAS (menor, víctima, retirada a mano): hay que sacarlas
 *           del depósito. Una nota que sólo "se cayó" del plan (el tope cambió) NO se borra: el archivo es permanente.
 */
export function diferencias(plan, previo, retiradas = new Set()) {
  const subir = [];
  let iguales = 0;
  const conocidos = new Map();
  for (const [, n] of Object.entries(previo?.notas ?? {})) for (const o of n.objetos ?? []) conocidos.set(o.clave, o.sha256);
  for (const e of plan.entradas) {
    for (const o of e.objetos) {
      if (conocidos.get(o.clave) === o.sha256) iguales += 1; else subir.push({ id: e.id, ...o });
    }
  }
  const borrar = [];
  for (const [id, n] of Object.entries(previo?.notas ?? {})) {
    if (retiradas.has(id)) for (const o of n.objetos ?? []) if (!o.clave.startsWith('fotos-notas/')) borrar.push({ id, clave: o.clave });
  }
  return { subir, iguales, borrar };
}

/** Los ids que el manifiesto anterior tenía y ya no están en ningún lado (ni en archivo.json ni en el histórico): se sacaron (semáforo, retirada). */
export function idsDesaparecidos(previo, todas = []) {
  const vivos = new Set(todas.map((n) => n?.id));
  return Object.keys(previo?.notas ?? {}).filter((id) => !vivos.has(id));
}

/**
 * ¿Es razonable el borrado que se pide? Un archivo.json roto o vacío haría "desaparecer" todo el depósito: se frena si se borra más de
 * `fraccion` de lo que hay (y más de `minimo` notas) y se pide confirmarlo a mano con --confirmar-borrado.
 */
export function borradoRazonable(cantidad, totalPrevio, { minimo = 10, fraccion = 0.05 } = {}) {
  if (cantidad <= minimo || cantidad <= totalPrevio * fraccion) return { ok: true };
  return { ok: false, motivo: `se pide borrar ${cantidad} de ${totalPrevio} notas del depósito (más del ${Math.round(fraccion * 100)} %): parece un archivo roto, no se borra nada; si es de verdad, repetir con --confirmar-borrado` };
}

/**
 * El manifiesto que queda en el depósito después de subir: lo que ya había, más lo de esta vez (que manda), menos las notas borradas.
 * Sin esto cada corrida sobrescribiría el manifiesto con sólo sus notas y se olvidaría de las anteriores.
 */
export function fusionarManifiesto(previo, nuevo, borrados = new Set()) {
  const notas = { ...(previo?.notas ?? {}), ...nuevo.notas };
  for (const id of borrados) delete notas[id];
  const lista = Object.values(notas);
  return {
    ...nuevo,
    totales: {
      notas: lista.length,
      objetos: lista.reduce((t, n) => t + (n.objetos?.length ?? 0), 0),
      bytes: lista.reduce((t, n) => t + (n.objetos ?? []).reduce((u, o) => u + (o.bytes ?? 0), 0), 0),
    },
    notas,
  };
}

// ------------------------------------------------------------------ las guardas

/** Nombres que NUNCA se tocan desde acá, vengan de donde vengan. */
export function depositosProtegidos(env = process.env) {
  return [env.R2_RESPALDOS, env.R2_FOTOS].map((x) => String(x ?? '').trim()).filter(Boolean);
}

/**
 * ¿Se puede escribir en este depósito? Nunca en uno de respaldos o de fotos; sin --produccion, sólo en uno de ensayo
 * (el nombre lleva "staging" o "prueba"). Devuelve { ok, motivo }.
 */
export function comprobarDeposito(bucket, { produccion = false, env = process.env } = {}) {
  const nombre = String(bucket ?? '').trim();
  if (!nombre) return { ok: false, motivo: 'falta el depósito (--bucket=nombre)' };
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(nombre)) return { ok: false, motivo: `el nombre de depósito "${nombre}" no es válido` };
  if (/respaldo|backup/i.test(nombre) || depositosProtegidos(env).includes(nombre)) return { ok: false, motivo: `"${nombre}" es un depósito de respaldos o de fotos: el archivo nunca escribe ahí` };
  if (!produccion && !/staging|prueba/i.test(nombre)) return { ok: false, motivo: `"${nombre}" no parece un depósito de ensayo (le falta "staging" o "prueba" en el nombre); para producción hay que pasar --produccion a propósito` };
  return { ok: true };
}

/** Texto sin los valores secretos del entorno (por si una herramienta los repite en un error). */
export function sinSecretos(texto, env = process.env) {
  let salida = String(texto ?? '');
  for (const k of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) {
    const v = env[k];
    if (v && String(v).length >= 6) salida = salida.split(String(v)).join('***');
  }
  return salida;
}

// ------------------------------------------------------------------ subir

/** Corre wrangler (versión fija). Devuelve una promesa que se resuelve con { ok, salida }. Se reemplaza en las pruebas. */
export function correrWrangler(args, { env = process.env } = {}) {
  return new Promise((resolve) => {
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    execFile(npx, ['--yes', `wrangler@${VERSION_DE_WRANGLER}`, ...args], { env, shell: process.platform === 'win32', maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ ok: !error, salida: sinSecretos(`${stdout ?? ''}${stderr ?? ''}`, env).slice(-600) });
    });
  });
}

async function enTandas(lista, concurrencia, hacer) {
  const resultados = new Array(lista.length);
  let siguiente = 0;
  const obreros = Array.from({ length: Math.max(1, Math.min(concurrencia, lista.length)) }, async () => {
    for (;;) {
      const i = siguiente++;
      if (i >= lista.length) return;
      resultados[i] = await hacer(lista[i], i);
    }
  });
  await Promise.all(obreros);
  return resultados;
}

/**
 * Sube los objetos de `hacer.subir` al depósito, borra `hacer.borrar` y, si todo salió bien, sube el manifiesto. Escribe los archivos en una
 * carpeta temporal (wrangler necesita un archivo) y la borra al final. `ejecutar(args)` se reemplaza en las pruebas.
 * Devuelve { subidos, fallidos: [{clave, salida}], borrados, manifiestoSubido }.
 */
export async function subirAlDeposito({ bucket, hacer, manifiesto, ejecutar = correrWrangler, concurrencia = 6, reintentos = 3 }) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'archivo-r2-'));
  const fallidos = [];
  let subidos = 0;
  let borrados = 0;
  try {
    const poner = async (o, i) => {
      const archivo = path.join(carpeta, `${i}.bin`);
      fs.writeFileSync(archivo, o.buffer);
      let ultimo = null;
      for (let intento = 1; intento <= reintentos; intento++) {
        const r = await ejecutar(['r2', 'object', 'put', `${bucket}/${o.clave}`, '--file', archivo, '--content-type', o.tipo, '--cache-control', o.control, '--remote']);
        if (r.ok) { subidos += 1; fs.rmSync(archivo, { force: true }); return; }
        ultimo = r;
      }
      fs.rmSync(archivo, { force: true });
      fallidos.push({ clave: o.clave, salida: ultimo?.salida ?? '' });
    };
    await enTandas(hacer.subir, concurrencia, poner);

    for (const b of hacer.borrar ?? []) {
      const r = await ejecutar(['r2', 'object', 'delete', `${bucket}/${b.clave}`, '--remote']);
      if (r.ok) borrados += 1; else fallidos.push({ clave: b.clave, salida: r.salida ?? '' });
    }

    let manifiestoSubido = false;
    if (!fallidos.length && manifiesto) {
      const archivo = path.join(carpeta, 'manifiesto.json');
      fs.writeFileSync(archivo, `${JSON.stringify(manifiesto)}\n`);
      const r = await ejecutar(['r2', 'object', 'put', `${bucket}/${CLAVE_DEL_MANIFIESTO}`, '--file', archivo, '--content-type', 'application/json', '--remote']);
      manifiestoSubido = r.ok;
      if (!r.ok) fallidos.push({ clave: CLAVE_DEL_MANIFIESTO, salida: r.salida ?? '' });
    }
    return { subidos, fallidos, borrados, manifiestoSubido };
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
}

/** Baja el manifiesto de la vez anterior del depósito; null si no hay (o no se pudo). */
export async function leerManifiestoPrevio({ bucket, ejecutar = correrWrangler }) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'archivo-r2-'));
  try {
    const archivo = path.join(carpeta, 'previo.json');
    const r = await ejecutar(['r2', 'object', 'get', `${bucket}/${CLAVE_DEL_MANIFIESTO}`, '--file', archivo, '--remote']);
    if (!r.ok || !fs.existsSync(archivo)) return null;
    const json = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    return json && typeof json === 'object' && json.notas && typeof json.notas === 'object' ? json : null;
  } catch { return null; } finally {
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

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/**
 * La corrida entera. `ejecutar` y `escribir` se reemplazan en las pruebas. Devuelve el código de salida (0 bien, 1 falló algo, 2 mal pedido).
 */
export async function principal(argv = process.argv.slice(2), { env = process.env, ejecutar = correrWrangler, escribir = (t) => console.log(t) } = {}) {
  const a = leerArgumentos(argv);
  const out = path.resolve(String(a.out ?? path.join(RAIZ_WEB, 'out')));
  const datos = path.resolve(String(a.datos ?? path.join(RAIZ_WEB, 'data')));
  const tope = a.tope !== undefined ? Number(a.tope) : MAXIMO_EN_ARCHIVO;
  const margen = a.margen !== undefined ? Number(a.margen) : MARGEN_POR_DEFECTO;
  const subir = a.subir === true;
  const bucket = typeof a.bucket === 'string' ? a.bucket : '';

  if (!Number.isFinite(tope) || tope < 0 || !Number.isFinite(margen) || margen < 0) { escribir('--tope y --margen tienen que ser números.'); return 2; }
  if (!fs.existsSync(path.join(out, 'nota'))) { escribir(`No hay sitio compilado en ${out}. Falta compilarlo (cd web && npx next build).`); return 2; }

  if (subir) {
    const g = comprobarDeposito(bucket, { produccion: a.produccion === true, env });
    if (!g.ok) { escribir(`No se sube: ${g.motivo}.`); return 2; }
    if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) { escribir('No se sube: faltan CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID en el entorno.'); return 2; }
  }

  const historicos = fs.existsSync(path.join(datos, 'historico'))
    ? fs.readdirSync(path.join(datos, 'historico')).filter((f) => f.endsWith('.json')).sort().map((f) => leerJson(path.join(datos, 'historico', f), { notas: [] }).notas ?? [])
    : [];
  const todas = juntarNotas(leerJson(path.join(datos, 'archivo.json'), { notas: [] }).notas ?? [], historicos);
  const retiradas = idsRetiradosAMano(leerJson(path.join(datos, 'retiradas.json'), null));

  let { viejas } = elegirViejas(todas, { tope, margen, retiradas });
  if (typeof a.ids === 'string') { const pedidos = new Set(a.ids.split(',').map((x) => x.trim()).filter(Boolean)); viejas = viejas.filter((n) => pedidos.has(n.id)); }
  const max = a.max !== undefined && Number.isFinite(Number(a.max)) ? Math.max(0, Number(a.max)) : Infinity;

  const plan = armarPlan(viejas, { out, conFotos: a['sin-fotos'] !== true, conInstagram: a['con-instagram'] === true, max });
  const manifiesto = armarManifiesto(plan, { bucket: bucket || null, tope, margen });
  const previo = subir ? await leerManifiestoPrevio({ bucket, ejecutar }) : null;
  // Qué se borra del depósito: lo retirado a mano y lo que ya no existe en el archivo vivo (el semáforo lo sacó). Sólo con --borrar.
  const sacadas = new Set([...retiradas, ...idsDesaparecidos(previo, todas)]);
  const hacer = diferencias(plan, previo, sacadas);
  let borradoFrenado = null;
  if (a.borrar !== true) hacer.borrar = [];
  else if (a['confirmar-borrado'] !== true) {
    const g = borradoRazonable(new Set(hacer.borrar.map((b) => b.id)).size, Object.keys(previo?.notas ?? {}).length);
    if (!g.ok) { borradoFrenado = g.motivo; hacer.borrar = []; }
  }
  const idsBorrados = new Set(hacer.borrar.map((b) => b.id));
  const manifiestoFinal = subir ? fusionarManifiesto(previo, manifiesto, idsBorrados) : manifiesto;

  escribir(`Archivo permanente (${subir ? `SUBIDA a ${bucket}` : 'SIMULACIÓN: no se escribe nada'})`);
  escribir(`  notas conocidas: ${todas.length} (${retiradas.size} retiradas a mano) · tope ${tope}, margen ${margen}`);
  escribir(`  viejas a archivar: ${viejas.length} · con HTML: ${plan.entradas.length} · omitidas: ${plan.omitidas.length}`);
  escribir(`  objetos: ${manifiesto.totales.objetos} (${kb(manifiesto.totales.bytes)})${subir ? ` · por subir ${hacer.subir.length}, ya estaban ${hacer.iguales}, por borrar ${hacer.borrar.length}` : ''}`);
  const motivos = {};
  for (const o of plan.omitidas) motivos[o.motivo] = (motivos[o.motivo] ?? 0) + 1;
  for (const [m, n] of Object.entries(motivos)) escribir(`  omitidas por ${m}: ${n}`);
  for (const e of plan.entradas.slice(0, 5)) escribir(`  · ${e.ruta} (${e.objetos.length} objetos, ${kb(e.objetos.reduce((s, o) => s + o.bytes, 0))})`);
  if (plan.entradas.length > 5) escribir(`  · … y ${plan.entradas.length - 5} más`);

  if (borradoFrenado) escribir(`  OJO: ${borradoFrenado}`);

  if (typeof a.manifiesto === 'string') {
    const destino = path.resolve(a.manifiesto);
    if (destino.startsWith(`${datos}${path.sep}`)) { escribir('El manifiesto no puede guardarse dentro de web/data.'); return 2; }
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, `${JSON.stringify(manifiestoFinal, null, 2)}\n`);
    escribir(`  manifiesto guardado en ${destino}`);
  }

  if (!subir) { escribir('Simulación terminada. Para subir de verdad: --subir --bucket=<depósito de ensayo>.'); return 0; }

  const r = await subirAlDeposito({ bucket, hacer, manifiesto: manifiestoFinal, ejecutar });
  escribir(`  subidos ${r.subidos}, borrados ${r.borrados}, fallidos ${r.fallidos.length}${r.manifiestoSubido ? ', manifiesto al día' : ''}`);
  for (const f of r.fallidos.slice(0, 10)) escribir(`  FALLÓ ${f.clave}: ${String(f.salida).replace(/\s+/g, ' ').slice(0, 200)}`);
  return r.fallidos.length || borradoFrenado ? 1 : 0;
}

if (process.argv[1] && process.argv[1].endsWith('archivar-a-r2.mjs')) {
  principal().then((codigo) => process.exit(codigo));
}

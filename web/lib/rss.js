// El RSS de Radar Balcarce (8/10/2026, RSS-1): título, enlace, fecha, sección, bajada y, desde hoy, el TEXTO COMPLETO de la nota
// (content:encoded) con su foto y el crédito, y un feed por sección además del general. Todo se arma al compilar, sin servidor.
//
// 15/10/2026 (auditoría de feeds, docs/seo/AUDITORIA-FEEDS.md): la foto también va como <enclosure> (con su tamaño real) y como
// media:content; el autor y la firma de cada ítem dicen lo mismo que la página (quién la escribió, con IA o no); el canal trae
// ttl, imagen y responsable; los ítems salen del más nuevo al más viejo y con un tope; y ningún carácter que XML no admite
// (un control, un medio par de sustitutos) puede romper el feed entero.
//
// De entrada y salida de texto, sin leer archivos: se prueba sin red (pruebas/rss.test.mjs). El tamaño de las fotos lo trae quien
// arma el feed (`tamanoDeFoto`), porque leer el disco no es cosa de este archivo.

import { urlDeFoto } from './fotos.js';
import { autorDeNota, firmaCorta } from '../components/metadatos.js';

/** Los caracteres que un XML 1.0 no admite ni dentro de CDATA: controles, U+FFFE/U+FFFF y sustitutos sueltos. */
const NO_ADMITIDO = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** El texto sin lo que rompería el XML. */
export const limpiarXml = (s = '') => String(s ?? '').replace(NO_ADMITIDO, '');

export const esc = (s = '') => limpiarXml(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Un texto dentro de CDATA: lo único que no puede llevar es el cierre de la sección. */
const cdata = (s = '') => `<![CDATA[${limpiarXml(s).replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;

/** La dirección absoluta de una foto (si las fotos se sirven desde el propio sitio, con el sitio adelante). */
export function fotoAbsoluta(archivo, sitio) {
  const u = urlDeFoto(archivo);
  return /^https?:\/\//.test(u) ? u : `${sitio}${u}`;
}

const TIPOS_DE_FOTO = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

/** El tipo de una foto según su extensión; null si no es una imagen que conozcamos (entonces no se declara). */
export function tipoDeFoto(archivo = '') {
  const m = String(archivo).toLowerCase().match(/\.([a-z0-9]+)(?:\?.*)?$/);
  return (m && TIPOS_DE_FOTO[m[1]]) || null;
}

/** El cuerpo de una nota en párrafos de HTML, sin ningún enlace ni etiqueta que venga adentro. */
export function cuerpoEnHtml(cuerpo = '') {
  return String(cuerpo).split(/\n{2,}|\r\n\r\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
}

/**
 * La bajada del ítem. Si la nota no trae (no debería pasar), las primeras palabras del cuerpo: un ítem sin descripción
 * se ve vacío en cualquier lector.
 */
export function resumenDeLaNota(n) {
  const bajada = String(n.copete ?? '').replace(/\s+/g, ' ').trim();
  if (bajada) return bajada;
  const cuerpo = String(n.cuerpo ?? '').replace(/\s+/g, ' ').trim();
  if (cuerpo.length <= 280) return cuerpo;
  return `${cuerpo.slice(0, 280).replace(/\s+\S*$/, '')}…`;
}

/**
 * Quién firma el ítem (dc:creator): lo mismo que dice la página (`autorDeNota`), sin la aclaración entre paréntesis.
 * Una nota que es el texto de otro medio lleva el nombre de ese medio; las demás, Radar Balcarce.
 */
export function creadorDelItem(n) {
  return String(autorDeNota(n, '').name ?? 'Radar Balcarce').replace(/\s*\(.*\)\s*$/, '').trim() || 'Radar Balcarce';
}

/** El HTML completo de una nota para el feed: su foto con el crédito, el texto, quién la escribió y el enlace a la página (que lleva las fuentes). */
export function contenidoDeLaNota(n, sitio) {
  const foto = n.foto?.archivo
    ? `<figure><img src="${esc(fotoAbsoluta(n.foto.archivo, sitio))}" alt="" />${n.foto.credito ? `<figcaption>${esc(n.foto.credito)}</figcaption>` : ''}</figure>`
    : '';
  const cuerpo = cuerpoEnHtml(n.cuerpo);
  return `${foto}${n.copete ? `<p><strong>${esc(n.copete)}</strong></p>` : ''}${cuerpo}<p><em>${esc(firmaCorta(n))}</em></p>`
    + `<p><a href="${esc(`${sitio}${n.ruta}`)}">La nota completa, con sus fuentes, en Radar Balcarce</a></p>`;
}

/** La foto como <enclosure> (sólo si se sabe cuánto pesa: sin `length` el lector no puede confiar en él) y como media:content. */
function imagenDelItem(n, sitio, tamanoDeFoto) {
  const archivo = n.foto?.archivo;
  const tipo = archivo ? tipoDeFoto(archivo) : null;
  if (!archivo || !tipo) return '';
  const url = esc(fotoAbsoluta(archivo, sitio));
  const bytes = Number(tamanoDeFoto?.(archivo)) || 0;
  const enclosure = bytes > 0 ? `\n      <enclosure url="${url}" length="${Math.round(bytes)}" type="${tipo}" />` : '';
  const tamano = bytes > 0 ? ` fileSize="${Math.round(bytes)}"` : '';
  const credito = n.foto.credito ? `<media:credit>${esc(n.foto.credito)}</media:credit>` : '';
  return `${enclosure}
      <media:content url="${url}" medium="image" type="${tipo}"${tamano}>${credito}</media:content>`;
}

/** Un ítem del feed. */
export function itemDeLaNota(n, sitio, { tamanoDeFoto = null } = {}) {
  const url = `${sitio}${n.ruta}`;
  return `
    <item>
      <title>${esc(n.titulo)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <pubDate>${new Date(n.fecha).toUTCString()}</pubDate>
      <dc:creator>${esc(creadorDelItem(n))}</dc:creator>
      <category>${esc(n.seccion)}</category>
      <description>${esc(resumenDeLaNota(n))}</description>
      <content:encoded>${cdata(contenidoDeLaNota(n, sitio))}</content:encoded>${imagenDelItem(n, sitio, tamanoDeFoto)}
    </item>`;
}

/** Cuántos ítems como mucho lleva un feed: un lector que pasa una vez por día ve todo, y el archivo no pasa de unos 150 KB. */
export const ITEMS_POR_FEED = 50;

/** Cada cuántos minutos se rearma el sitio (y por lo tanto el feed): se lo decimos a los lectores con <ttl>. */
export const MINUTOS_ENTRE_ARMADOS = 30;

/**
 * El feed entero. `autoEnlace` es la dirección del propio feed (para `atom:link rel="self"`); `generado` es cuándo se armaron los datos.
 * Las notas sin fecha real no entran: un feed con fechas inventadas hace que los lectores muestren como nuevo algo viejo.
 * Salen de la más nueva a la más vieja, hasta `maximo`. `correo` (opcional) es el responsable del canal; `logo` (opcional), la
 * dirección de una imagen cuadrada del medio; `tamanoDeFoto(archivo)` (opcional) dice cuántos bytes pesa una foto.
 */
export function armarRss({
  titulo = 'Radar Balcarce', descripcion = 'Lo que pasa en Balcarce, la región y el país.', enlace, autoEnlace, notas = [], sitio, generado = null,
  maximo = ITEMS_POR_FEED, correo = null, logo = null, tamanoDeFoto = null,
}) {
  const validas = notas.filter((n) => n?.ruta && n.titulo && !n.sinFecha && Number.isFinite(new Date(n.fecha).getTime()));
  const items = [...validas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, maximo)
    .map((n) => itemDeLaNota(n, sitio, { tamanoDeFoto })).join('');
  const construido = generado && Number.isFinite(new Date(generado).getTime()) ? `\n    <lastBuildDate>${new Date(generado).toUTCString()}</lastBuildDate>` : '';
  const responsable = correo ? `\n    <managingEditor>${esc(correo)} (Radar Balcarce)</managingEditor>\n    <webMaster>${esc(correo)} (Radar Balcarce)</webMaster>` : '';
  // RSS 2.0 pide imágenes de hasta 144 de ancho; los lectores la achican si es más grande.
  const imagen = logo ? `\n    <image>\n      <url>${esc(logo)}</url>\n      <title>${esc(titulo)}</title>\n      <link>${esc(enlace ?? sitio)}</link>\n      <width>144</width>\n      <height>144</height>\n    </image>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${esc(titulo)}</title>
    <link>${esc(enlace ?? sitio)}</link>
    <atom:link href="${esc(autoEnlace ?? `${sitio}/feed.xml`)}" rel="self" type="application/rss+xml" />
    <description>${esc(descripcion)}</description>
    <language>es-AR</language>${construido}
    <ttl>${MINUTOS_ENTRE_ARMADOS}</ttl>${responsable}${imagen}
    <generator>Radar Balcarce</generator>
    ${items}
  </channel>
</rss>`;
}

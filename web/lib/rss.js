// El RSS de Radar Balcarce (8/10/2026, RSS-1): título, enlace, fecha, sección, bajada y, desde hoy, el TEXTO COMPLETO de la nota
// (content:encoded) con su foto y el crédito, y un feed por sección además del general. Todo se arma al compilar, sin servidor.
//
// De entrada y salida de texto, sin leer archivos: se prueba sin red (pruebas/rss.test.mjs).

import { urlDeFoto } from './fotos.js';

export const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Un texto dentro de CDATA: lo único que no puede llevar es el cierre de la sección. */
const cdata = (s = '') => `<![CDATA[${String(s).replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;

/** La dirección absoluta de una foto (si las fotos se sirven desde el propio sitio, con el sitio adelante). */
export function fotoAbsoluta(archivo, sitio) {
  const u = urlDeFoto(archivo);
  return /^https?:\/\//.test(u) ? u : `${sitio}${u}`;
}

/** El cuerpo de una nota en párrafos de HTML, sin ningún enlace ni etiqueta que venga adentro. */
export function cuerpoEnHtml(cuerpo = '') {
  return String(cuerpo).split(/\n{2,}|\r\n\r\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
}

/** El HTML completo de una nota para el feed: su foto con el crédito, el texto y el enlace a la página (que lleva las fuentes). */
export function contenidoDeLaNota(n, sitio) {
  const foto = n.foto?.archivo
    ? `<figure><img src="${esc(fotoAbsoluta(n.foto.archivo, sitio))}" alt="" />${n.foto.credito ? `<figcaption>${esc(n.foto.credito)}</figcaption>` : ''}</figure>`
    : '';
  const cuerpo = cuerpoEnHtml(n.cuerpo);
  return `${foto}${n.copete ? `<p><strong>${esc(n.copete)}</strong></p>` : ''}${cuerpo}<p><a href="${esc(`${sitio}${n.ruta}`)}">La nota completa, con sus fuentes, en Radar Balcarce</a></p>`;
}

/** Un ítem del feed. */
export function itemDeLaNota(n, sitio) {
  const url = `${sitio}${n.ruta}`;
  return `
    <item>
      <title>${esc(n.titulo)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <pubDate>${new Date(n.fecha).toUTCString()}</pubDate>
      <dc:creator>Radar Balcarce</dc:creator>
      <category>${esc(n.seccion)}</category>
      <description>${esc(n.copete)}</description>
      <content:encoded>${cdata(contenidoDeLaNota(n, sitio))}</content:encoded>
    </item>`;
}

/**
 * El feed entero. `autoEnlace` es la dirección del propio feed (para `atom:link rel="self"`); `generado` es cuándo se armaron los datos.
 * Las notas sin fecha real no entran: un feed con fechas inventadas hace que los lectores muestren como nuevo algo viejo.
 */
export function armarRss({
  titulo = 'Radar Balcarce', descripcion = 'Lo que pasa en Balcarce, la región y el país.', enlace, autoEnlace, notas = [], sitio, generado = null,
}) {
  const items = notas.filter((n) => n?.ruta && n.titulo && !n.sinFecha && Number.isFinite(new Date(n.fecha).getTime())).map((n) => itemDeLaNota(n, sitio)).join('');
  const construido = generado && Number.isFinite(new Date(generado).getTime()) ? `\n    <lastBuildDate>${new Date(generado).toUTCString()}</lastBuildDate>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(titulo)}</title>
    <link>${esc(enlace ?? sitio)}</link>
    <atom:link href="${esc(autoEnlace ?? `${sitio}/feed.xml`)}" rel="self" type="application/rss+xml" />
    <description>${esc(descripcion)}</description>
    <language>es-AR</language>${construido}
    <generator>Radar Balcarce</generator>
    ${items}
  </channel>
</rss>`;
}

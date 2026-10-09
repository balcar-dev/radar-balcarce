// El RSS (8/10/2026, RSS-1): texto completo de cada nota, su foto con el crédito, el feed propio de cada sección y las fechas honestas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { armarRss, itemDeLaNota, contenidoDeLaNota, cuerpoEnHtml, esc } from '../web/lib/rss.js';

const SITIO = 'https://radarbalcarce.com';
const nota = (extra = {}) => ({
  id: 'abc', titulo: 'Demarcan la Ruta 55 & el acceso', copete: 'Un pedido "de años" de los vecinos.', seccion: 'Balcarce', ruta: '/nota/demarcan-abc',
  fecha: '2026-10-08T15:00:00.000Z', cuerpo: 'Primer párrafo con <etiqueta>.\n\nSegundo párrafo.', foto: { archivo: 'fotos-notas/abc.jpg', credito: 'Foto: Municipalidad de Balcarce' }, ...extra,
});

test('cada ítem lleva el texto completo, la foto con su crédito y el enlace a la página', () => {
  const x = itemDeLaNota(nota(), SITIO);
  assert.match(x, /<content:encoded><!\[CDATA\[/);
  assert.match(x, /<p>Primer párrafo con &lt;etiqueta&gt;\.<\/p><p>Segundo párrafo\.<\/p>/);
  assert.match(x, /<img src="https:\/\/radarbalcarce\.com\/fotos-notas\/abc\.jpg"/);
  assert.match(x, /<figcaption>Foto: Municipalidad de Balcarce<\/figcaption>/);
  assert.match(x, /La nota completa, con sus fuentes, en Radar Balcarce/);
  assert.match(x, /<title>Demarcan la Ruta 55 &amp; el acceso<\/title>/);
  assert.match(x, /<guid isPermaLink="true">https:\/\/radarbalcarce\.com\/nota\/demarcan-abc<\/guid>/);
  assert.match(x, /<dc:creator>Radar Balcarce<\/dc:creator>/);
});

test('sin foto no hay imagen, y un cierre de CDATA adentro del texto no rompe el XML', () => {
  const c = contenidoDeLaNota(nota({ foto: null, cuerpo: 'Un texto con ]]> adentro.' }), SITIO);
  assert.ok(!c.includes('<img'));
  const x = itemDeLaNota(nota({ foto: null, cuerpo: 'Un texto con ]]> adentro.' }), SITIO);
  const abre = (x.match(/<!\[CDATA\[/g) ?? []).length;
  const cierra = (x.match(/\]\]>/g) ?? []).length;
  assert.equal(abre, cierra, 'cada CDATA que se abre se cierra');
});

test('el feed es válido en lo básico: self, fecha de armado, y sólo notas con fecha real', () => {
  const xml = armarRss({
    enlace: SITIO, autoEnlace: `${SITIO}/feed.xml`, sitio: SITIO, generado: '2026-10-08T16:00:00Z',
    notas: [nota(), nota({ id: 'sin', titulo: 'Sin fecha', sinFecha: true, ruta: '/nota/sin' }), nota({ id: 'mala', fecha: 'no es una fecha', ruta: '/nota/mala' })],
  });
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /xmlns:content="http:\/\/purl\.org\/rss\/1\.0\/modules\/content\/"/);
  assert.match(xml, /<atom:link href="https:\/\/radarbalcarce\.com\/feed\.xml" rel="self" type="application\/rss\+xml" \/>/);
  assert.match(xml, /<lastBuildDate>Thu, 08 Oct 2026 16:00:00 GMT<\/lastBuildDate>/);
  assert.equal((xml.match(/<item>/g) ?? []).length, 1, 'las notas sin fecha real no entran');
  assert.ok(!xml.includes('/nota/sin') && !xml.includes('/nota/mala'));
});

test('los párrafos y el escape', () => {
  assert.equal(cuerpoEnHtml('Uno.\n\n\nDos.'), '<p>Uno.</p><p>Dos.</p>');
  assert.equal(cuerpoEnHtml(''), '');
  assert.equal(esc('a & b < c > "d"'), 'a &amp; b &lt; c &gt; &quot;d&quot;');
});

test('hay un feed general y uno por sección, con su enlace de descubrimiento', () => {
  const general = fs.readFileSync(new URL('../web/app/feed.xml/route.js', import.meta.url), 'utf8');
  assert.match(general, /armarRss\(/);
  const seccion = fs.readFileSync(new URL('../web/app/seccion/[ranura]/feed.xml/route.js', import.meta.url), 'utf8');
  assert.match(seccion, /notasDeLaSeccion\(s\.nombre\)\.slice\(0, CUANTAS\)/);
  assert.match(seccion, /export const dynamicParams = false/);
  const pagina = fs.readFileSync(new URL('../web/app/seccion/[ranura]/page.js', import.meta.url), 'utf8');
  assert.match(pagina, /'application\/rss\+xml': `\/seccion\/\$\{s\.ranura\}\/feed\.xml`/);
});

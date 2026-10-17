// El mapa de noticias para Google Noticias y el índice de mapas (17/10/2026, regla 250). Sin red y sin compilar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  notasParaNoticias, xmlDeNoticias, xmlDeIndice, escaparXml, HORAS_DEL_MAPA_DE_NOTICIAS, MAXIMO_DEL_MAPA_DE_NOTICIAS,
} from '../web/lib/sitemap-noticias.js';
import { textoDeRobots } from '../web/lib/robots.js';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const AHORA = Date.parse('2026-10-17T15:00:00Z');
const hace = (h) => new Date(AHORA - h * 3600e3).toISOString();
const cuerpo = Array.from({ length: 90 }, (_, i) => `palabra${i}`).join(' ');
const nota = (id, horas, extra = {}) => ({ id, ruta: `/nota/titulo-${id}`, titulo: `Titular ${id}`, cuerpo, fecha: hace(horas), como: 'automatica', ...extra });
const enlace = (r) => `https://radarbalcarce.com${r}`;

test('al mapa de noticias entran las notas de las últimas 48 horas con hora real, las más nuevas primero', () => {
  const lista = notasParaNoticias([nota('a', 30), nota('b', 2), nota('c', 47), nota('d', 49), nota('e', 100)], { ahora: AHORA });
  assert.deepEqual(lista.map((n) => n.id), ['b', 'a', 'c']);
  assert.equal(HORAS_DEL_MAPA_DE_NOTICIAS, 48);
});

test('quedan afuera las notas sin hora real, las que llevan noindex y las de fecha futura', () => {
  const lista = notasParaNoticias([
    nota('sinhora', 2, { sinFecha: true }),
    nota('sincuerpo', 2, { cuerpo: 'corto' }),
    nota('futura', -3),
    nota('buena', 1),
    nota('persona', 2, { cuerpo: 'corto', como: 'publicada' }),
  ], { ahora: AHORA });
  // Una nota que aprobó una persona sale aunque el cuerpo sea corto (cuerpo.js): igual que en el sitemap.xml.
  assert.deepEqual(lista.map((n) => n.id), ['buena', 'persona']);
});

test('nunca más de 1.000 notas, como pide Google', () => {
  const muchas = Array.from({ length: 1300 }, (_, i) => nota(`n${i}`, 1 + (i % 40)));
  assert.equal(notasParaNoticias(muchas, { ahora: AHORA }).length, MAXIMO_DEL_MAPA_DE_NOTICIAS);
});

test('el XML lleva publicación, idioma, fecha con zona y título, escapado', () => {
  const xml = xmlDeNoticias([nota('a', 3, { titulo: 'Fangio & "el Chueco": <homenaje>\n en Balcarce' })], { enlace, nombre: 'Radar Balcarce', ahora: AHORA });
  assert.match(xml, /xmlns:news="http:\/\/www\.google\.com\/schemas\/sitemap-news\/0\.9"/);
  assert.match(xml, /<loc>https:\/\/radarbalcarce\.com\/nota\/titulo-a<\/loc>/);
  assert.match(xml, /<news:name>Radar Balcarce<\/news:name>\s*<news:language>es<\/news:language>/);
  assert.match(xml, /<news:publication_date>2026-10-17T12:00:00\.000Z<\/news:publication_date>/);
  assert.match(xml, /<news:title>Fangio &amp; &quot;el Chueco&quot;: &lt;homenaje&gt; en Balcarce<\/news:title>/);
  assert.equal(escaparXml("a'b"), 'a&apos;b');
});

test('sin notas, el mapa de noticias es un urlset vacío pero válido', () => {
  const xml = xmlDeNoticias([], { enlace, nombre: 'Radar Balcarce', ahora: AHORA });
  assert.match(xml, /<urlset[^>]*>\s*<\/urlset>/);
});

test('el índice de mapas lista el del sitio y el de noticias, con su fecha', () => {
  const xml = xmlDeIndice([
    { loc: enlace('/sitemap.xml'), lastmod: '2026-10-17T14:30:00.000Z' },
    { loc: enlace('/sitemap-news.xml') },
  ]);
  assert.match(xml, /<sitemapindex xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, /<sitemap>\s*<loc>https:\/\/radarbalcarce\.com\/sitemap\.xml<\/loc>\s*<lastmod>2026-10-17T14:30:00\.000Z<\/lastmod>/);
  assert.match(xml, /<sitemap>\s*<loc>https:\/\/radarbalcarce\.com\/sitemap-news\.xml<\/loc>\s*<\/sitemap>/);
});

test('robots.txt anuncia el índice y los dos mapas; fuera del dominio propio, ninguno de noticias', () => {
  const t = textoDeRobots({ base: 'https://radarbalcarce.com', propio: true });
  for (const m of ['sitemap-index.xml', 'sitemap.xml', 'sitemap-news.xml']) assert.match(t, new RegExp(`^Sitemap: https://radarbalcarce\\.com/${m.replace('.', '\\.')}$`, 'm'));
  assert.ok(!/sitemap-news/.test(textoDeRobots({ base: 'http://localhost:3000', propio: false })));
});

test('las rutas usan lo probado acá, y el sitemap.xml sigue siendo un mapa común (el vigilante lee su lastmod)', () => {
  assert.match(leer('web/app/sitemap-news.xml/route.js'), /xmlDeNoticias\(d\.notas/);
  assert.match(leer('web/app/sitemap-index.xml/route.js'), /xmlDeIndice\(/);
  assert.match(leer('web/app/sitemap-index.xml/route.js'), /enlace\('\/sitemap\.xml'\)/);
  // El vigilante (infra/vigilante-cloudflare/worker.mjs) busca <lastmod> en /sitemap.xml: si algún día se vuelve un índice, hay que enseñarle.
  assert.match(leer('infra/vigilante-cloudflare/worker.mjs'), /sitemap\.xml/);
  assert.match(leer('web/app/sitemap.js'), /export default function sitemap\(\)/);
});

test('IndexNow sigue andando: la clave publicada, el aviso después de subir y nada que lleve noindex', () => {
  const clave = leer('redes/indexnow.mjs').match(/CLAVE_INDEXNOW = '([0-9a-f]{32})'/)?.[1];
  assert.ok(clave, 'falta la clave en redes/indexnow.mjs');
  assert.equal(leer(`web/public/${clave}.txt`).trim(), clave, 'la clave no está publicada en el sitio');
  assert.match(leer('.github/workflows/actualizar.yml'), /node redes\/indexnow\.mjs/);
  assert.match(leer('.github/workflows/cloudflare-deploy.yml'), /node redes\/indexnow\.mjs/);
  assert.match(leer('infra/motor-cloudflare/vuelta.mjs'), /redes\/indexnow\.mjs/);
  assert.match(leer('redes/indexnow.mjs'), /!noSeOfreceAGoogle\(n\)/);
});

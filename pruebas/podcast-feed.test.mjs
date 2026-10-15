// El generador del feed de podcast (15/10/2026, docs/seo/AUDITORIA-FEEDS.md). Está SIN CONECTAR a producción: estas pruebas fijan lo que
// Apple Podcasts y Spotify piden, para que el día que se conecte no haya que descubrirlo con un feed rechazado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  canalDelPodcast, duracionLegible, idDeNotaDelRepaso, descripcionPlana, episodiosDeLosRepasos, problemasDelPodcast, armarPodcastRss,
  AVISO_DE_VOZ, MAXIMO_DESCRIPCION,
} from '../web/scripts/podcast-feed.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITIO = 'https://radarbalcarce.com';

const repaso = (extra = {}) => ({
  id: 'repaso20261015manana', propia: 'repaso', titulo: 'El repaso de la mañana en Radar Balcarce: cultura & Turismo Nacional',
  copete: 'Radar Balcarce publicó a las 10:09 el repaso.', slug: 'el-repaso-de-la-manana-en-radar-balcarce-cultura',
  cuerpo: 'Estas son las 2 notas que se contaron en el repaso de la mañana del jueves 15, en el orden en que salieron en el audio.\n\n'
    + 'La delegación local parte el lunes. Reciben la indumentaria oficial.\n\nÁngela Servín sube al podio. Completó setenta kilómetros.\n\n'
    + 'Mirá y escuchá el repaso en Instagram y Facebook, con los botones de acá abajo. Todas las notas del día están en la portada de Radar Balcarce.',
  fecha: '2026-10-15T13:09:21.887Z', sinFecha: false,
  enlacesEnTexto: [
    { texto: 'La delegación local parte el lunes hacia la final provincial', href: '/nota/la-delegacion-local-1v9h1ps' },
    { texto: 'Ángela Servín sube al podio en la Atlántica Ultra', href: '/nota/angela-servin-vt870i' },
  ],
  ...extra,
});
const audio = (extra = {}) => ({ url: 'https://audio.radarbalcarce.com/repasos/2026-10-15-manana.mp3', bytes: 987654, segundos: 61.4, tipo: 'audio/mpeg', ...extra });
const audios = (extra = {}) => ({ '2026-10-15/noticia1': audio(), ...extra });

test('la clave del libro lleva a la nota del repaso, y lo que no es un repaso no tiene nota', () => {
  assert.equal(idDeNotaDelRepaso('2026-10-15/noticia1'), 'repaso20261015manana');
  assert.equal(idDeNotaDelRepaso('2026-10-15/noticia2'), 'repaso20261015tarde');
  assert.equal(idDeNotaDelRepaso('2026-10-14/podcast'), 'repaso20261014noche');
  assert.equal(idDeNotaDelRepaso('2026-10-15/clima-manana'), null);
  assert.equal(idDeNotaDelRepaso('basura'), null);
});

test('la duración se escribe mm:ss o h:mm:ss', () => {
  assert.equal(duracionLegible(61.4), '01:01');
  assert.equal(duracionLegible(59.6), '01:00');
  assert.equal(duracionLegible(3725), '1:02:05');
  assert.equal(duracionLegible(0), '00:00');
  assert.equal(duracionLegible(undefined), '00:00');
});

test('un episodio por repaso con nota y con audio; sin una de las dos cosas, no hay episodio', () => {
  const tarde = repaso({ id: 'repaso20261015tarde', fecha: '2026-10-15T18:07:00.000Z', titulo: 'El repaso de la tarde' });
  const eps = episodiosDeLosRepasos({
    audios: audios({ '2026-10-15/noticia2': audio({ url: 'https://audio.radarbalcarce.com/repasos/2026-10-15-tarde.mp3' }) }),
    notas: [repaso(), tarde], sitio: SITIO,
  });
  assert.deepEqual(eps.map((e) => e.guid), ['radar-balcarce-repaso20261015tarde', 'radar-balcarce-repaso20261015manana'], 'de más nuevo a más viejo');
  // Un audio sin su nota (retirada o no armable: Política, Policiales, rojo): no sale.
  assert.equal(episodiosDeLosRepasos({ audios: audios(), notas: [], sitio: SITIO }).length, 0);
  // Una nota que no es un repaso no cuenta aunque tenga el mismo id.
  assert.equal(episodiosDeLosRepasos({ audios: audios(), notas: [repaso({ propia: false })], sitio: SITIO }).length, 0);
  assert.equal(episodiosDeLosRepasos({ audios: audios(), notas: [repaso({ sinFecha: true })], sitio: SITIO }).length, 0);
  // Un audio sin https o sin tamaño tampoco.
  assert.equal(episodiosDeLosRepasos({ audios: audios({ '2026-10-15/noticia1': audio({ url: 'http://x/a.mp3' }) }), notas: [repaso()], sitio: SITIO }).length, 0);
  assert.equal(episodiosDeLosRepasos({ audios: audios({ '2026-10-15/noticia1': audio({ bytes: 0 }) }), notas: [repaso()], sitio: SITIO }).length, 0);
});

test('el feed trae todo lo que piden Apple Podcasts y Spotify', () => {
  const canal = canalDelPodcast(SITIO);
  const episodios = episodiosDeLosRepasos({ audios: audios(), notas: [repaso()], sitio: SITIO });
  const xml = armarPodcastRss({ canal, episodios, generado: '2026-10-15T14:00:00Z' });
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /xmlns:itunes="http:\/\/www\.itunes\.com\/dtds\/podcast-1\.0\.dtd"/);
  // El canal.
  assert.match(xml, /<language>es-AR<\/language>/);
  assert.match(xml, /<atom:link href="https:\/\/radarbalcarce\.com\/podcast\.xml" rel="self" type="application\/rss\+xml" \/>/);
  assert.match(xml, /<itunes:image href="https:\/\/radarbalcarce\.com\/podcast\/portada\.jpg" \/>/);
  assert.match(xml, /<itunes:category text="News">\s*<itunes:category text="Daily News" \/>\s*<\/itunes:category>/);
  assert.match(xml, /<itunes:owner>\s*<itunes:name>Radar Balcarce<\/itunes:name>\s*<itunes:email>contacto@radarbalcarce\.com<\/itunes:email>\s*<\/itunes:owner>/);
  assert.match(xml, /<itunes:explicit>false<\/itunes:explicit>/);
  assert.match(xml, /<itunes:type>episodic<\/itunes:type>/);
  assert.match(xml, /<itunes:author>Radar Balcarce<\/itunes:author>/);
  assert.match(xml, /<lastBuildDate>Thu, 15 Oct 2026 14:00:00 GMT<\/lastBuildDate>/);
  // El episodio.
  assert.match(xml, /<guid isPermaLink="false">radar-balcarce-repaso20261015manana<\/guid>/);
  assert.match(xml, /<pubDate>Thu, 15 Oct 2026 13:09:21 GMT<\/pubDate>/);
  assert.match(xml, /<enclosure url="https:\/\/audio\.radarbalcarce\.com\/repasos\/2026-10-15-manana\.mp3" length="987654" type="audio\/mpeg" \/>/);
  assert.match(xml, /<itunes:duration>01:01<\/itunes:duration>/);
  assert.match(xml, /<itunes:episodeType>full<\/itunes:episodeType>/);
  assert.match(xml, /<title>El repaso de la mañana en Radar Balcarce: cultura &amp; Turismo Nacional<\/title>/);
  assert.match(xml, /<link>https:\/\/radarbalcarce\.com\/nota\/el-repaso-de-la-manana-en-radar-balcarce-cultura-repaso20261015manana<\/link>/);
});

test('el episodio avisa que la voz es de IA y lleva las notas con su enlace, sin el cierre de las redes', () => {
  const [e] = episodiosDeLosRepasos({ audios: audios(), notas: [repaso()], sitio: SITIO });
  assert.ok(e.descripcion.includes(AVISO_DE_VOZ));
  assert.match(e.descripcion, /^En este repaso: La delegación local parte el lunes hacia la final provincial; Ángela Servín sube al podio en la Atlántica Ultra\./);
  assert.match(e.html, /<li><a href="https:\/\/radarbalcarce\.com\/nota\/angela-servin-vt870i">Ángela Servín sube al podio en la Atlántica Ultra<\/a><\/li>/);
  assert.ok(e.html.includes(AVISO_DE_VOZ));
  assert.ok(!e.html.includes('botones de acá abajo'), 'el "mirá en Instagram" no va en un podcast');
  assert.ok(!e.html.includes('Estas son las 2 notas'));
  assert.match(e.html, /<p>La delegación local parte el lunes\. Reciben la indumentaria oficial\.<\/p>/);
  // El canal también lo dice.
  assert.ok(canalDelPodcast(SITIO).descripcion.includes(AVISO_DE_VOZ));
});

test('un texto larguísimo se corta antes del límite de Apple', () => {
  const nota = repaso({ enlacesEnTexto: Array.from({ length: 400 }, (_, i) => ({ texto: `Una nota bastante larga número ${i}`, href: `/nota/n${i}` })) });
  const d = descripcionPlana(nota, SITIO);
  assert.ok(d.length <= MAXIMO_DESCRIPCION);
});

test('los problemas que frenarían el envío se detectan antes', () => {
  const canal = canalDelPodcast(SITIO);
  const eps = episodiosDeLosRepasos({ audios: audios(), notas: [repaso()], sitio: SITIO });
  assert.deepEqual(problemasDelPodcast({ canal, episodios: eps }), []);
  assert.ok(problemasDelPodcast({ canal, episodios: [] }).some((p) => /ningún episodio/.test(p)));
  assert.ok(problemasDelPodcast({ canal: { ...canal, arte: 'https://x.com/arte.webp' }, episodios: eps }).some((p) => /portada/.test(p)));
  assert.ok(problemasDelPodcast({ canal: { ...canal, responsable: { nombre: 'x', correo: 'sin-arroba' } }, episodios: eps }).some((p) => /correo/.test(p)));
  assert.ok(problemasDelPodcast({ canal: { ...canal, urlDelFeed: 'http://radarbalcarce.com/podcast.xml' }, episodios: eps }).some((p) => /https/.test(p)));
  assert.ok(problemasDelPodcast({ canal, episodios: [{ ...eps[0], audio: { ...eps[0].audio, url: 'https://x.com/a.wav' } }] }).some((p) => /mp3 o \.m4a/.test(p)));
  assert.ok(problemasDelPodcast({ canal, episodios: [{ ...eps[0], segundos: 0 }] }).some((p) => /duración/.test(p)));
  assert.ok(problemasDelPodcast({ canal, episodios: [eps[0], eps[0]] }).some((p) => /guid repetido/.test(p)));
});

test('el tope de episodios y un cierre de CDATA adentro del texto no rompen el feed', () => {
  const canal = canalDelPodcast(SITIO);
  const eps = episodiosDeLosRepasos({ audios: audios(), notas: [repaso({ cuerpo: 'Estas son las 1.\n\nUn texto con ]]> adentro.\n\nMirá y escuchá el repaso en X.' })], sitio: SITIO });
  const xml = armarPodcastRss({ canal, episodios: [eps[0], { ...eps[0], guid: 'otro' }, { ...eps[0], guid: 'otro2' }], maximo: 2 });
  assert.equal((xml.match(/<item>/g) ?? []).length, 2);
  assert.equal((xml.match(/<!\[CDATA\[/g) ?? []).length, (xml.match(/\]\]>/g) ?? []).length);
});

test('el programa a mano no escribe un feed que Apple rechazaría (sin audios todavía) y no está conectado a nada', () => {
  const r = spawnSync(process.execPath, [path.join(RAIZ, 'web/scripts/podcast-feed.mjs')], { encoding: 'utf8', cwd: RAIZ });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /todavía no se puede enviar/);
  assert.match(r.stderr, /ningún episodio/);
  assert.equal(r.stdout, '');
  // Ningún workflow ni página lo usa mientras no se decida (si se conecta, esta prueba se cambia a propósito).
  const flujos = fs.readdirSync(path.join(RAIZ, '.github/workflows')).map((f) => fs.readFileSync(path.join(RAIZ, '.github/workflows', f), 'utf8')).join('\n');
  assert.ok(!flujos.includes('podcast-feed'));
  assert.ok(!fs.existsSync(path.join(RAIZ, 'web/app/podcast.xml')));
});

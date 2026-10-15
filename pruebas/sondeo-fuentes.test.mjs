// El sondeo de fuentes desde Cloudflare (15/10/2026, infra/sondeo-fuentes/): sin red. Que la lista sea la de las fuentes activas, que el Worker
// no conteste sin la llave, que los lotes se corten bien, que se cuenten bien las notas de un RSS, un Atom y un sitemap, y que el workflow
// sea sólo a mano y no lleve ninguna clave escrita.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TODAS_LAS_FUENTES } from '../ingesta/ingesta.mjs';
import { listaParaSondeo, textoDeLista } from '../infra/sondeo-fuentes/generar-lista.mjs';
import worker, {
  LOTE, cantidadDeLotes, loteDe, formatoDe, contarItems, fechaMasNueva, mismoToken, atender, sondearUno, sondearLote, leerHasta, AGENTES, SIMULTANEOS,
} from '../infra/sondeo-fuentes/worker.mjs';
import { estadoDe, resumir, pedirLote, sondearTodo } from '../infra/sondeo-fuentes/cliente.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const lista = JSON.parse(leer('infra/sondeo-fuentes/lista.json'));
const activas = TODAS_LAS_FUENTES.filter((f) => f.activa !== false);

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Medio</title><image><url>https://x/logo.png</url></image>
<lastBuildDate>Thu, 15 Oct 2026 10:00:00 GMT</lastBuildDate>
<item><title>Uno</title><pubDate>Wed, 14 Oct 2026 09:00:00 GMT</pubDate></item>
<item><title>Dos</title><pubDate>Thu, 15 Oct 2026 08:30:00 GMT</pubDate></item>
<itemprop>no es una nota</itemprop></channel></rss>`;
const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><updated>2026-10-15T12:00:00Z</updated>
<entry><title>A</title><published>2026-10-13T10:00:00-03:00</published></entry>
<entry><title>B</title><updated>2026-10-15T11:00:00-03:00</updated></entry><entry><title>C</title></entry></feed>`;
const SITEMAP = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
<url><loc>https://x/1</loc><news:news><news:publication_date>2026-10-15T07:00:00Z</news:publication_date></news:news></url>
<url><loc>https://x/2</loc><lastmod>2026-10-14</lastmod></url><url><loc>https://x/3</loc></url></urlset>`;

test('lista.json es exactamente el registro de fuentes activas (103 hoy): si se toca una fuente, hay que correr generar-lista.mjs', () => {
  assert.equal(lista.length, activas.length);
  assert.deepEqual([...lista.map((f) => f.id)].sort(), activas.map((f) => f.id).sort());
  for (const f of lista) {
    const original = activas.find((a) => a.id === f.id);
    assert.equal(f.url, original.url, f.id);
    assert.equal(f.tipo, original.tipo, f.id);
  }
  assert.equal(new Set(lista.map((f) => f.id)).size, lista.length, 'sin ids repetidos');
  assert.equal(leer('infra/sondeo-fuentes/lista.json').replace(/\r\n/g, '\n'), textoDeLista(), 'correr: node infra/sondeo-fuentes/generar-lista.mjs');
});

test('la lista no incluye las apagadas y reparte los feeds de un mismo sitio en lugar de dejarlos pegados', () => {
  const apagada = { id: 'a', url: 'https://a.com/1', tipo: 'rss', activa: false };
  const l = listaParaSondeo([apagada, { id: 'b1', url: 'https://b.com/1', tipo: 'rss' }, { id: 'b2', url: 'https://b.com/2', tipo: 'rss' }, { id: 'c', url: 'https://c.com/1', tipo: 'rss' }]);
  assert.deepEqual(l.map((f) => f.id), ['b1', 'c', 'b2']);
  assert.ok(lista.every((f) => f.id && f.url && f.tipo));
});

test('los lotes: 10 por vez, todos juntos son la lista entera y uno que no existe da vacío', () => {
  assert.equal(LOTE, 10);
  const total = lista.length;
  assert.equal(cantidadDeLotes(lista), Math.ceil(total / 10));
  const juntos = [];
  for (let n = 0; n < cantidadDeLotes(lista); n += 1) {
    const lote = loteDe(lista, n);
    assert.ok(lote.length > 0 && lote.length <= LOTE);
    juntos.push(...lote);
  }
  assert.deepEqual(juntos, lista);
  assert.deepEqual(loteDe(lista, cantidadDeLotes(lista)), []);
  assert.deepEqual(loteDe(lista, -1), []);
  assert.equal(loteDe(lista, 10).length, total - 100);
  assert.ok(SIMULTANEOS <= 6, 'Workers permite 6 conexiones abiertas a la vez');
});

test('cuenta las notas de un RSS (sin confundir el logo ni <itemprop>), un Atom y un sitemap de noticias', () => {
  assert.equal(formatoDe(RSS), 'rss');
  assert.equal(contarItems(RSS), 2);
  assert.equal(formatoDe(ATOM), 'atom');
  assert.equal(contarItems(ATOM), 3);
  assert.equal(formatoDe(SITEMAP), 'sitemap');
  assert.equal(contarItems(SITEMAP), 3);
  assert.equal(formatoDe('<?xml?><sitemapindex><sitemap><loc>a</loc></sitemap></sitemapindex>'), 'indice-de-sitemaps');
  assert.equal(contarItems('<sitemapindex><sitemap><loc>a</loc></sitemap><sitemap><loc>b</loc></sitemap></sitemapindex>'), 2);
  assert.equal(formatoDe('<!DOCTYPE html><html><body>hola</body></html>'), 'html');
  assert.equal(contarItems('<!DOCTYPE html><html></html>'), null);
  assert.equal(contarItems(''), null);
});

test('la fecha más nueva se saca de pubDate, published, updated y fechas de sitemap, aunque vengan en CDATA', () => {
  assert.equal(fechaMasNueva(RSS), '2026-10-15T08:30:00.000Z');
  assert.equal(fechaMasNueva(ATOM), '2026-10-15T14:00:00.000Z');
  assert.equal(fechaMasNueva(SITEMAP), '2026-10-15T07:00:00.000Z');
  assert.equal(fechaMasNueva('<item><pubDate><![CDATA[Wed, 14 Oct 2026 09:00:00 GMT]]></pubDate></item>'), '2026-10-14T09:00:00.000Z');
  assert.equal(fechaMasNueva('<item><pubDate>no es fecha</pubDate></item>'), null);
  assert.equal(fechaMasNueva('sin etiquetas'), null);
});

test('el Worker no contesta sin la llave: 503 si no está cargada, 401 si no coincide, y no hace ningún pedido a los medios', async () => {
  let pedidos = 0;
  const fetchFn = async () => { pedidos += 1; return new Response(RSS); };
  const pedir = (cabeceras = {}, ruta = '/sondear?lote=0', metodo = 'GET') => new Request(`https://sondeo.example${ruta}`, { method: metodo, headers: cabeceras });
  const sinToken = await atender(pedir({ 'x-sondeo-token': 'abc' }), {}, { fetchFn });
  assert.equal(sinToken.status, 503);
  assert.equal((await atender(pedir(), { SONDEO_TOKEN: '' }, { fetchFn })).status, 503);
  assert.equal((await atender(pedir(), { SONDEO_TOKEN: 'secreto' }, { fetchFn })).status, 401);
  assert.equal((await atender(pedir({ 'x-sondeo-token': 'secret' }), { SONDEO_TOKEN: 'secreto' }, { fetchFn })).status, 401);
  assert.equal((await atender(pedir({ 'x-sondeo-token': 'secreto' }, '/sondear?lote=0', 'POST'), { SONDEO_TOKEN: 'secreto' }, { fetchFn })).status, 405);
  assert.equal((await atender(pedir({ 'x-sondeo-token': 'secreto' }, '/otra-cosa'), { SONDEO_TOKEN: 'secreto' }, { fetchFn })).status, 404);
  // La llave en la dirección no vale: sólo el encabezado.
  assert.equal((await atender(pedir({}, '/sondear?lote=0&token=secreto'), { SONDEO_TOKEN: 'secreto' }, { fetchFn })).status, 401);
  // El `export default` hace lo mismo.
  assert.equal((await worker.fetch(pedir(), { SONDEO_TOKEN: 'secreto' })).status, 401);
  assert.equal(pedidos, 0);
  assert.ok(mismoToken('a', 'a') && !mismoToken('a', 'b') && !mismoToken('a', 'ab') && !mismoToken(undefined, 'a'));
});

test('con la llave devuelve el lote pedido con lo que se mide de cada feed, y rechaza un lote que no existe', async () => {
  const fuentes = [
    { id: 'rss', url: 'https://m1.example/feed', tipo: 'rss' },
    { id: 'atom', url: 'https://m2.example/atom', tipo: 'atom' },
    { id: 'caido', url: 'https://m3.example/feed', tipo: 'rss' },
    { id: 'bloqueado', url: 'https://m4.example/feed', tipo: 'rss' },
  ];
  const vistos = [];
  const fetchFn = async (url, o) => {
    vistos.push({ url, ua: o.headers['user-agent'] });
    if (url.includes('m1')) return new Response(RSS, { status: 200, headers: { 'content-type': 'application/rss+xml' } });
    if (url.includes('m2')) return new Response(ATOM, { status: 200, headers: { 'content-type': 'application/atom+xml' } });
    if (url.includes('m3')) throw Object.assign(new Error('Network connection lost.'), { name: 'Error' });
    return new Response('<html><title>Just a moment...</title></html>', { status: 403, headers: { 'content-type': 'text/html' } });
  };
  const env = { SONDEO_TOKEN: 'secreto' };
  const pedir = (ruta) => new Request(`https://sondeo.example${ruta}`, { headers: { 'x-sondeo-token': 'secreto' } });
  const r = await atender(pedir('/sondear?lote=0'), env, { fuentes, fetchFn });
  assert.equal(r.status, 200);
  const cuerpo = await r.json();
  assert.equal(cuerpo.lotes, 1);
  assert.equal(cuerpo.total, 4);
  assert.deepEqual(cuerpo.resultados.map((x) => x.id), ['rss', 'atom', 'caido', 'bloqueado']);
  const [a, b, c, d] = cuerpo.resultados;
  assert.deepEqual([a.http, a.contentType, a.formato, a.items, a.error], [200, 'application/rss+xml', 'rss', 2, null]);
  assert.equal(a.bytes, new TextEncoder().encode(RSS).length);
  assert.equal(a.nuevo, '2026-10-15T08:30:00.000Z');
  assert.deepEqual([b.formato, b.items], ['atom', 3]);
  assert.deepEqual([c.http, c.error], [null, 'Network connection lost.']);
  assert.deepEqual([d.http, d.error, d.desafio], [403, 'HTTP 403', true]);
  assert.ok(vistos.every((v) => v.ua === AGENTES.navegador) && AGENTES.navegador.startsWith('Mozilla/5.0'));
  assert.ok(a.ms >= 0 && typeof a.ms === 'number');
  // Con ua=robot usa el nombre del robot de hoy.
  vistos.length = 0;
  const robot = await (await atender(pedir('/sondear?lote=0&ua=robot'), env, { fuentes, fetchFn })).json();
  assert.equal(robot.ua, 'robot');
  assert.ok(vistos.every((v) => v.ua === AGENTES.robot));
  for (const mal of ['/sondear?lote=1', '/sondear?lote=-1', '/sondear?lote=x', '/sondear?lote=1.5']) assert.equal((await atender(pedir(mal), env, { fuentes, fetchFn })).status, 400, mal);
});

test('un feed que no contesta se corta a los 15 s sin trabar al resto, y nunca hay más de 4 pedidos a la vez', async () => {
  const colgado = (url, o) => new Promise((_, rechazar) => { o.signal.addEventListener('abort', () => rechazar(Object.assign(new Error('abortado'), { name: 'AbortError' }))); });
  const r = await sondearUno({ id: 'x', url: 'https://x.example/', tipo: 'rss' }, { fetchFn: colgado, tiempoMs: 20 });
  assert.equal(r.error, 'tiempo agotado (0 s)');
  assert.equal(r.http, null);
  let abiertos = 0;
  let maximo = 0;
  const fetchFn = async () => { abiertos += 1; maximo = Math.max(maximo, abiertos); await new Promise((ok) => { setTimeout(ok, 5); }); abiertos -= 1; return new Response(RSS); };
  const diez = Array.from({ length: 10 }, (_, i) => ({ id: `f${i}`, url: `https://f${i}.example/`, tipo: 'rss' }));
  const res = await sondearLote(diez, { fetchFn });
  assert.equal(res.length, 10);
  assert.ok(res.every((x, i) => x.id === `f${i}` && x.items === 2));
  assert.ok(maximo <= SIMULTANEOS && maximo > 1, `máximo a la vez: ${maximo}`);
});

test('un feed enorme se corta en el tope de lectura (no gasta memoria) y lo dice', async () => {
  const grande = new Response('a'.repeat(300));
  const { bytes, truncado, texto } = await leerHasta(grande, 100);
  assert.equal(truncado, true);
  assert.ok(bytes >= 100 && texto.length >= 100);
});

test('el cliente: arma el estado de cada feed, junta todos los lotes y resume lo que no anda', async () => {
  assert.equal(estadoDe({ http: 200, items: 5, formato: 'rss', tipo: 'rss' }), 'ok');
  assert.equal(estadoDe({ http: 200, items: 0, formato: 'rss', tipo: 'rss' }), 'vacío');
  assert.equal(estadoDe({ http: 200, bytes: 9000, formato: 'html', tipo: 'scrape' }), 'ok');
  assert.equal(estadoDe({ http: 200, bytes: 9000, formato: 'html', tipo: 'rss' }), 'html (no es un feed)');
  assert.equal(estadoDe({ http: 403, desafio: true, tipo: 'rss' }), 'desafío');
  assert.equal(estadoDe({ http: 404, tipo: 'rss' }), 'HTTP 404');
  assert.equal(estadoDe({ http: null, error: 'tiempo agotado (15 s)', tipo: 'rss' }), 'sin conexión');
  const lotes = [
    { lote: 0, lotes: 2, total: 3, ua: 'navegador', resultados: [{ id: 'a', http: 200, items: 3, formato: 'rss', tipo: 'rss', ms: 100, nuevo: new Date().toISOString() }, { id: 'b', http: null, error: 'tiempo agotado (15 s)', tipo: 'rss', ms: 15000 }] },
    { lote: 1, lotes: 2, total: 3, ua: 'navegador', resultados: [{ id: 'c', http: 404, error: 'HTTP 404', tipo: 'rss', ms: 80 }] },
  ];
  const llamadas = [];
  const fetchFn = async (url, o) => {
    llamadas.push({ url, token: o.headers['x-sondeo-token'] });
    const n = Number(/lote=(\d+)/.exec(url)[1]);
    return new Response(JSON.stringify(lotes[n]), { status: 200 });
  };
  const todo = await sondearTodo('https://sondeo.example/', { token: 'T', fetchFn });
  assert.deepEqual(todo.resultados.map((x) => x.id), ['a', 'b', 'c']);
  assert.equal(llamadas.length, 2);
  assert.ok(llamadas.every((l) => l.token === 'T' && !l.url.includes('T')), 'la llave va en el encabezado, no en la dirección');
  const texto = resumir(todo);
  assert.match(texto, /1 de 3 feeds andan/);
  assert.match(texto, /No andan 2: 1 sin conexión, 1 HTTP 404/);
  assert.match(texto, /b\s+sin conexión/);
  await assert.rejects(() => pedirLote('https://sondeo.example', 0, { token: 'T', intentos: 3, esperarMs: 1, fetchFn: async () => new Response('{}', { status: 401 }) }), /HTTP 401/);
});

test('el workflow es sólo a mano, fija versiones, dice sus permisos y no guarda nada en el repositorio ni lleva claves escritas', () => {
  const w = leer('.github/workflows/sondeo-fuentes-cloudflare.yml');
  assert.match(w, /^name: Sondeo de fuentes desde Cloudflare$/m);
  assert.match(w, /on:\s+workflow_dispatch:/);
  assert.ok(!/^\s*schedule:|^\s*push:|^\s*pull_request:/m.test(w), 'se corre sólo a mano');
  assert.match(w, /^permissions:\s+contents: read/m);
  assert.match(w, /timeout-minutes:/);
  assert.match(w, /runs-on:\s*ubuntu-24\.04/);
  assert.match(w, /wrangler@4\.139\.0 deploy/);
  assert.match(w, /wrangler@4\.139\.0 secret put SONDEO_TOKEN/);
  assert.match(w, /secrets\.SONDEO_TOKEN/);
  assert.match(w, /actions\/upload-artifact@v4/);
  assert.ok(!/git (add|commit|push)/.test(w), 'no commitea');
  assert.ok(!/contents: write/.test(w));
});

test('el Worker de sondeo no tiene cron, ni secretos escritos, ni dependencias, y lleva su LEEME', () => {
  const toml = leer('infra/sondeo-fuentes/wrangler.toml');
  assert.match(toml, /^name = "radar-balcarce-sondeo-fuentes"$/m);
  assert.ok(!/crons|\[triggers\]|\[vars\]|SONDEO_TOKEN\s*=/.test(toml.replace(/^#.*$/gm, '')), 'sin cron ni variables');
  const codigo = leer('infra/sondeo-fuentes/worker.mjs');
  const imports = [...codigo.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ['./lista.json']);
  for (const f of ['infra/sondeo-fuentes/worker.mjs', 'infra/sondeo-fuentes/wrangler.toml', 'infra/sondeo-fuentes/cliente.mjs']) assert.ok(!/ghp_|github_pat_|Bearer [A-Za-z0-9_]{20,}/.test(leer(f)), f);
  assert.match(leer('infra/sondeo-fuentes/LEEME.md'), /SONDEO_TOKEN/);
});

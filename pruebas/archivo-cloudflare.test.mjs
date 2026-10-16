// El Worker del archivo permanente (infra/archivo-cloudflare/, 15/10/2026): sirve desde R2 las notas que ya salieron del sitio, con la misma
// dirección. Se prueba sin red, con un R2 y un "sitio" simulados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker, { manejar, analizarRuta, rutaCanonicaDe, CABECERAS_DE_SEGURIDAD, claveDePagina, claveDeTarjeta, claveDeInstagram } from '../infra/archivo-cloudflare/worker.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');

const PARTE = 'un-titular-de-prueba-1abc2de';
const RUTA = `/nota/${PARTE}`;
const pagina = (canonica = `https://radarbalcarce.com${RUTA}`) => `<!DOCTYPE html><html><head><link rel="canonical" href="${canonica}"/><title>t</title></head><body><h1>Hola</h1></body></html>`;

/** Un R2 de mentira: sólo lee. Cuenta cuántas veces lo consultaron. */
function r2(objetos = {}, { falla = false } = {}) {
  const consultas = [];
  const cabezas = [];
  return {
    consultas,
    cabezas,
    async head(clave) {
      cabezas.push(clave);
      if (falla) throw new Error('R2 caído');
      return objetos[clave] === undefined ? null : { httpEtag: '"abc"' };
    },
    async get(clave) {
      consultas.push(clave);
      if (falla) throw new Error('R2 caído');
      const o = objetos[clave];
      if (o === undefined) return null;
      const texto = typeof o === 'string' ? o : o.texto;
      return {
        httpEtag: '"abc"',
        httpMetadata: { contentType: typeof o === 'string' ? undefined : o.tipo },
        async text() { return texto; },
        body: new Blob([texto]).stream(),
      };
    },
  };
}

/** Un "sitio" de mentira: contesta lo que se le diga y anota los pedidos. */
function sitio(respuesta) {
  const pedidos = [];
  return {
    pedidos,
    fetchFn: async (req) => {
      pedidos.push(req);
      if (respuesta instanceof Error) throw respuesta;
      return typeof respuesta === 'function' ? respuesta(req) : respuesta.clone();
    },
  };
}

const pedir = (url, opciones = {}) => new Request(`https://radarbalcarce.com${url}`, opciones);
const ctx = { waitUntil: (p) => p };
const sinCache = { cache: null };

test('analizarRuta: reconoce las páginas, las tarjetas y el id; lo demás pasa derecho', () => {
  const p = analizarRuta(RUTA);
  assert.deepEqual(p, { tipo: 'pagina', parte: PARTE, id: '1abc2de', clave: 'nota/1abc2de.html', camino: RUTA });
  assert.equal(analizarRuta(`${RUTA}/`).camino, RUTA);
  assert.equal(analizarRuta(`${RUTA}.html`).camino, RUTA);
  assert.equal(analizarRuta('/nota/2jiiqj').id, '2jiiqj', 'el formato viejo /nota/ID también tiene id');
  assert.equal(analizarRuta(`${RUTA}/opengraph-image`).clave, 'nota/1abc2de/opengraph-image');
  assert.equal(analizarRuta(`${RUTA}/instagram.png`).tipo, 'instagram');
  for (const malo of ['/', '/seccion/balcarce', '/nota/indice.json', '/nota/', '/nota/UnTitular-1abc', '/nota/_archivo/x', '/nota/a/b/c', '/nota/..%2f..%2fetc', '/nota//x', '/fotos-notas/190bbf8.jpg', '/nota/x-y%00z']) {
    assert.equal(analizarRuta(malo), null, malo);
  }
  assert.equal(analizarRuta('/fotos-notas/190bbf8.jpg', { fotos: true }).clave, 'fotos-notas/190bbf8.jpg');
  assert.equal(analizarRuta('/fotos-notas/../secreto', { fotos: true }), null);
});

test('las claves de los objetos son las que usa el exportador', () => {
  assert.equal(claveDePagina('x1'), 'nota/x1.html');
  assert.equal(claveDeTarjeta('x1'), 'nota/x1/opengraph-image');
  assert.equal(claveDeInstagram('x1'), 'nota/x1/instagram.png');
});

test('rutaCanonicaDe lee el camino de la dirección canónica', () => {
  assert.equal(rutaCanonicaDe(pagina()), RUTA);
  assert.equal(rutaCanonicaDe('<link rel="canonical" href="https://radarbalcarce.com/nota/x-1/"/>'), '/nota/x-1');
  assert.equal(rutaCanonicaDe('<html></html>'), null);
});

test('si el sitio tiene la página, la devuelve tal cual y NO consulta R2', async () => {
  const deposito = r2({ 'nota/1abc2de.html': pagina() });
  const s = sitio(new Response('<h1>del sitio</h1>', { status: 200, headers: { 'x-origen': 'pages' } }));
  const r = await manejar(pedir(RUTA), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-origen'), 'pages');
  assert.equal(await r.text(), '<h1>del sitio</h1>');
  assert.deepEqual(deposito.consultas, []);
});

test('el sitio puede contestar una redirección o un 304 y se devuelve sin tocar', async () => {
  const deposito = r2({ 'nota/1abc2de.html': pagina() });
  for (const estado of [301, 302, 304, 308]) {
    const s = sitio(new Response(null, { status: estado, headers: { location: '/otra' } }));
    const r = await manejar(pedir(RUTA), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, ...sinCache });
    assert.equal(r.status, estado);
  }
  assert.deepEqual(deposito.consultas, []);
});

test('si el sitio dice 404 y la nota está en R2: 200 con la página guardada, las cabeceras de seguridad y la caché', async () => {
  const html = pagina();
  const s = sitio(new Response('no hay', { status: 404 }));
  const r = await manejar(pedir(RUTA), { ARCHIVO: r2({ 'nota/1abc2de.html': html }) }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), html, 'la página sale tal cual se guardó');
  assert.equal(r.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(r.headers.get('x-radar-archivo'), 'r2');
  assert.match(r.headers.get('cache-control'), /s-maxage=3600/);
  assert.equal(r.headers.get('etag'), '"abc"');
  for (const [k, v] of Object.entries(CABECERAS_DE_SEGURIDAD)) assert.equal(r.headers.get(k), v, k);
});

test('las cabeceras de seguridad del Worker son las de web/public/_headers (/*)', () => {
  const bloque = /^\/\*\r?\n((?:[ \t]+.+\r?\n?)+)/m.exec(leer('web/public/_headers'))[1];
  const de_el_sitio = Object.fromEntries(bloque.split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
  assert.deepEqual(de_el_sitio, CABECERAS_DE_SEGURIDAD);
});

test('si el sitio dice 404 y R2 no la tiene: el 404 del sitio, con su página y su estado', async () => {
  const s = sitio(new Response('<h1>No encontramos esa página</h1>', { status: 404, headers: { 'content-type': 'text/html' } }));
  const r = await manejar(pedir(RUTA), { ARCHIVO: r2({}) }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(r.status, 404);
  assert.equal(await r.text(), '<h1>No encontramos esa página</h1>');
});

test('una nota retirada (borrada de R2) da 404 aunque se haya archivado antes', async () => {
  const deposito = r2({ 'nota/1abc2de.html': pagina() });
  const s = sitio(new Response('404', { status: 404 }));
  assert.equal((await manejar(pedir(RUTA), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, ...sinCache })).status, 200);
  const retirada = r2({});
  assert.equal((await manejar(pedir(RUTA), { ARCHIVO: retirada }, ctx, { fetchFn: s.fetchFn, ...sinCache })).status, 404);
});

test('la dirección con otro titular, /nota/ID a secas o con ?fbclid= redirige 301 a la canónica', async () => {
  const deposito = r2({ 'nota/1abc2de.html': pagina() });
  const s = sitio(new Response('404', { status: 404 }));
  for (const url of ['/nota/otro-titular-1abc2de', '/nota/1abc2de']) {
    const r = await manejar(pedir(`${url}?fbclid=XYZ`), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, ...sinCache });
    assert.equal(r.status, 301, url);
    assert.equal(r.headers.get('location'), `${RUTA}?fbclid=XYZ`);
    assert.equal(r.headers.get('content-security-policy'), "frame-ancestors 'self'");
  }
  // la dirección buena con ?fbclid= se sirve (no se redirige)
  const buena = await manejar(pedir(`${RUTA}?fbclid=XYZ`), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(buena.status, 200);
});

test('las imágenes de compartir se sirven como image/png', async () => {
  const deposito = r2({ 'nota/1abc2de/opengraph-image': { texto: 'PNG', tipo: 'image/png' }, 'nota/1abc2de/instagram.png': { texto: 'PNG2' } });
  const s = sitio(new Response('404', { status: 404 }));
  for (const sufijo of ['opengraph-image', 'instagram.png']) {
    const r = await manejar(pedir(`${RUTA}/${sufijo}`), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, ...sinCache });
    assert.equal(r.status, 200, sufijo);
    assert.equal(r.headers.get('content-type'), 'image/png');
  }
});

test('el sitio caído (error de red o 5xx): si R2 la tiene se sirve; si no, no se inventa nada', async () => {
  const deposito = r2({ 'nota/1abc2de.html': pagina() });
  const caido = sitio(new Error('sin conexión'));
  const a = await manejar(pedir(RUTA), { ARCHIVO: deposito }, ctx, { fetchFn: caido.fetchFn, ...sinCache });
  assert.equal(a.status, 200);

  const roto = sitio(new Response('boom', { status: 503 }));
  assert.equal((await manejar(pedir(RUTA), { ARCHIVO: deposito }, ctx, { fetchFn: roto.fetchFn, ...sinCache })).status, 200);
  const sinNota = await manejar(pedir(RUTA), { ARCHIVO: r2({}) }, ctx, { fetchFn: roto.fetchFn, ...sinCache });
  assert.equal(sinNota.status, 503, 'se devuelve lo que dijo el sitio');
  const nada = await manejar(pedir(RUTA), { ARCHIVO: r2({}) }, ctx, { fetchFn: caido.fetchFn, ...sinCache });
  assert.equal(nada.status, 502);
  assert.equal(nada.headers.get('cache-control'), 'no-store');
});

test('R2 caído: el Worker no rompe nada, devuelve la respuesta del sitio', async () => {
  const s = sitio(new Response('<h1>404 del sitio</h1>', { status: 404 }));
  const r = await manejar(pedir(RUTA), { ARCHIVO: r2({}, { falla: true }) }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(r.status, 404);
  assert.equal(await r.text(), '<h1>404 del sitio</h1>');
});

test('lo que no es del archivo pasa derecho, sin consultar R2: otros métodos, otras rutas, rutas raras', async () => {
  const deposito = r2({ 'nota/1abc2de.html': pagina() });
  const s = sitio(new Response('del sitio', { status: 200 }));
  const casos = [pedir(RUTA, { method: 'POST' }), pedir('/seccion/balcarce'), pedir('/nota/indice.json'), pedir('/'), pedir('/nota/Mayusculas-1abc'), pedir('/fotos-notas/x.jpg')];
  for (const req of casos) {
    const r = await manejar(req, { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, ...sinCache });
    assert.equal(r.status, 200);
  }
  assert.deepEqual(deposito.consultas, []);
  assert.equal(s.pedidos.length, casos.length);
});

test('interruptor: ARCHIVO_ACTIVO=0 convierte el Worker en un tubo', async () => {
  const deposito = r2({ 'nota/1abc2de.html': pagina() });
  const s = sitio(new Response('404 del sitio', { status: 404 }));
  const r = await manejar(pedir(RUTA), { ARCHIVO: deposito, ARCHIVO_ACTIVO: '0' }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(r.status, 404);
  assert.deepEqual(deposito.consultas, []);
  // sin depósito conectado, también un tubo
  assert.equal((await manejar(pedir(RUTA), {}, ctx, { fetchFn: s.fetchFn, ...sinCache })).status, 404);
});

test('con ORIGEN_PAGES el pedido al sitio va a esa dirección, con el mismo camino y sin el host original', async () => {
  const s = sitio(new Response('ok', { status: 200 }));
  await manejar(pedir(`${RUTA}?a=1`, { headers: { host: 'radarbalcarce.com', 'accept-language': 'es' } }), { ARCHIVO: r2({}), ORIGEN_PAGES: 'https://radar-balcarce.pages.dev' }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(s.pedidos.length, 1);
  assert.equal(s.pedidos[0].url, `https://radar-balcarce.pages.dev${RUTA}?a=1`);
  assert.equal(s.pedidos[0].headers.get('accept-language'), 'es');
});

test('If-None-Match: 304 sin cuerpo; HEAD: sin cuerpo', async () => {
  const deposito = r2({ 'nota/1abc2de.html': pagina() });
  const s = sitio(new Response('404', { status: 404 }));
  const r304 = await manejar(pedir(RUTA, { headers: { 'if-none-match': '"abc"' } }), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(r304.status, 304);
  assert.equal(await r304.text(), '');
  const head = await manejar(pedir(RUTA, { method: 'HEAD' }), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('la caché de Cloudflare: la segunda vez no pregunta ni al sitio ni a R2; sólo se guardan las respuestas 200', async () => {
  const guardado = new Map();
  const cache = { async match(k) { return guardado.get(k.url)?.clone(); }, async put(k, r) { guardado.set(k.url, r); } };
  const deposito = r2({ 'nota/1abc2de.html': pagina() });
  const s = sitio(new Response('404', { status: 404 }));
  const primera = await manejar(pedir(RUTA), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, cache });
  assert.equal(primera.status, 200);
  assert.equal(guardado.size, 1);
  const segunda = await manejar(pedir(`${RUTA}?fbclid=1`), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, cache });
  assert.equal(segunda.status, 200);
  assert.equal(await segunda.text(), pagina());
  assert.equal(s.pedidos.length, 1, 'no volvió a preguntar al sitio');
  assert.equal(deposito.consultas.length, 1, 'ni a R2');

  // un 404 y una redirección no se guardan
  guardado.clear();
  await manejar(pedir('/nota/otro-1abc2de'), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, cache });
  await manejar(pedir('/nota/nada-9zzzz'), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, cache });
  assert.equal(guardado.size, 0);
});

test('una nota retirada (borrada de R2) deja de verse en el pedido siguiente aunque esté en la caché (no una hora después)', async () => {
  const guardado = new Map();
  const cache = { async match(k) { return guardado.get(k.url)?.clone(); }, async put(k, r) { guardado.set(k.url, r); }, async delete(k) { return guardado.delete(k.url); } };
  const objetos = { 'nota/1abc2de.html': pagina() };
  const deposito = r2(objetos);
  const s = sitio(new Response('no está', { status: 404 }));
  assert.equal((await manejar(pedir(RUTA), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, cache })).status, 200);
  assert.equal(guardado.size, 1);
  // de la caché, confirmando contra R2 con un head (sin bajar la página)
  assert.equal((await manejar(pedir(RUTA), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, cache })).status, 200);
  assert.deepEqual(deposito.cabezas, ['nota/1abc2de.html']);
  // se borra de R2 (el exportador con --borrar o --quitar): el próximo pedido ya da el 404 del sitio y la caché se limpia
  delete objetos['nota/1abc2de.html'];
  const despues = await manejar(pedir(RUTA), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, cache });
  assert.equal(despues.status, 404);
  assert.equal(guardado.size, 0);
  // si R2 no contesta el head, se sirve lo guardado (no se rompe nada)
  const otro = r2({ 'nota/1abc2de.html': pagina() });
  await manejar(pedir(RUTA), { ARCHIVO: otro }, ctx, { fetchFn: s.fetchFn, cache });
  const caido = { ...otro, async head() { throw new Error('R2 caído'); } };
  assert.equal((await manejar(pedir(RUTA), { ARCHIVO: caido }, ctx, { fetchFn: s.fetchFn, cache })).status, 200);
});

test('/_archivo/estado: el resumen de la última corrida (nunca el manifiesto), sin caché; sin estado, 404', async () => {
  const estado = JSON.stringify({ version: 1, cuando: '2026-10-16T12:00:00.000Z', ok: true, notas: 1130 });
  const s = sitio(new Response('del sitio', { status: 200 }));
  const r = await manejar(pedir('/_archivo/estado'), { ARCHIVO: r2({ 'estado.json': estado, 'manifiesto.json': '{"notas":{}}' }) }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), estado);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(r.headers.get('content-type'), /application\/json/);
  assert.equal(s.pedidos.length, 0);
  assert.equal((await manejar(pedir('/_archivo/estado'), { ARCHIVO: r2({}) }, ctx, { fetchFn: s.fetchFn, ...sinCache })).status, 404);
  assert.equal((await manejar(pedir('/_archivo/estado'), { ARCHIVO: r2({}, { falla: true }) }, ctx, { fetchFn: s.fetchFn, ...sinCache })).status, 503);
  // el manifiesto no se sirve por ningún camino
  for (const camino of ['/manifiesto.json', '/nota/manifiesto.json', '/_archivo/manifiesto', '/_archivo/estado/../manifiesto.json']) {
    const x = await manejar(pedir(camino), { ARCHIVO: r2({ 'manifiesto.json': '{"notas":{}}' }) }, ctx, { fetchFn: s.fetchFn, ...sinCache });
    assert.equal(await x.text(), 'del sitio', camino);
  }
  // apagado, ni el estado
  const apagado = await manejar(pedir('/_archivo/estado'), { ARCHIVO: r2({ 'estado.json': estado }), ARCHIVO_ACTIVO: '0' }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(await apagado.text(), 'del sitio');
});

test('CACHE_SEGUNDOS manda sobre el tiempo de caché (lo que tarda en desaparecer una nota retirada)', async () => {
  const s = sitio(new Response('404', { status: 404 }));
  const r = await manejar(pedir(RUTA), { ARCHIVO: r2({ 'nota/1abc2de.html': pagina() }), CACHE_SEGUNDOS: '60' }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.match(r.headers.get('cache-control'), /s-maxage=60/);
});

test('ARCHIVO_PRIMERO=1 (sólo el ensayo): R2 antes que el sitio; si R2 no la tiene, el sitio', async () => {
  const deposito = r2({ 'nota/1abc2de.html': pagina() });
  const s = sitio(new Response('del sitio', { status: 200 }));
  const primero = await manejar(pedir(RUTA), { ARCHIVO: deposito, ARCHIVO_PRIMERO: '1' }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(primero.headers.get('x-radar-archivo'), 'r2');
  assert.equal(s.pedidos.length, 0, 'ni siquiera preguntó al sitio');
  const otra = await manejar(pedir('/nota/otra-9zzzz'), { ARCHIVO: deposito, ARCHIVO_PRIMERO: '1' }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(await otra.text(), 'del sitio');
  // sin la variable (producción) el sitio manda siempre
  const normal = await manejar(pedir(RUTA), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(await normal.text(), 'del sitio');
});

test('las fotos de respaldo sólo se sirven si se pide (FOTOS_DE_RESPALDO=1)', async () => {
  const deposito = r2({ 'fotos-notas/190bbf8.jpg': 'JPG' });
  const s = sitio(new Response('404', { status: 404 }));
  const sin = await manejar(pedir('/fotos-notas/190bbf8.jpg'), { ARCHIVO: deposito }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(sin.status, 404);
  const con = await manejar(pedir('/fotos-notas/190bbf8.jpg'), { ARCHIVO: deposito, FOTOS_DE_RESPALDO: '1' }, ctx, { fetchFn: s.fetchFn, ...sinCache });
  assert.equal(con.status, 200);
  assert.equal(con.headers.get('content-type'), 'image/jpeg');
});

test('el export por defecto atiende fetch con el binding del entorno', async () => {
  const antes = globalThis.fetch;
  globalThis.fetch = async () => new Response('404', { status: 404 });
  try {
    const r = await worker.fetch(pedir(RUTA), { ARCHIVO: r2({ 'nota/1abc2de.html': pagina() }) }, ctx);
    assert.equal(r.status, 200);
  } finally { globalThis.fetch = antes; }
});

// ------------------------------------------------------------------ lo que el repositorio promete del Worker

test('el Worker no escribe nunca en R2, no importa nada y no lleva claves', () => {
  const codigo = leer('infra/archivo-cloudflare/worker.mjs');
  assert.ok(!/^\s*import\s/m.test(codigo), 'sin dependencias ni imports');
  assert.ok(!/ARCHIVO\.(put|delete|createMultipartUpload)/.test(codigo), 'sólo lee');
  assert.ok(!/ghp_|github_pat_|Bearer [A-Za-z0-9_]{20,}/.test(codigo));
});

test('wrangler.toml: la producción no tiene ruta activa, el ensayo vive aparte con su propio depósito', () => {
  const toml = leer('infra/archivo-cloudflare/wrangler.toml');
  const sinComentarios = toml.split(/\r?\n/).filter((l) => !l.trim().startsWith('#')).join('\n');
  assert.ok(!/^\s*routes?\s*=/m.test(sinComentarios), 'mientras no se active, ninguna ruta de radarbalcarce.com apunta a este Worker');
  assert.ok(!/pattern\s*=/.test(sinComentarios));
  assert.match(sinComentarios, /\[env\.staging\]\s*\r?\nname = "radar-balcarce-archivo-staging"\s*\r?\nworkers_dev = true/);
  assert.match(sinComentarios, /\[\[env\.staging\.r2_buckets\]\]\s*\r?\nbinding = "ARCHIVO"\s*\r?\nbucket_name = "radar-archivo-staging"/);
  const depositos = [...sinComentarios.matchAll(/bucket_name = "([^"]+)"/g)].map((m) => m[1]);
  for (const d of depositos) assert.ok(!/respaldo|backup|fotos/i.test(d), `${d} no puede ser el de respaldos ni el de fotos`);
  assert.equal(new Set(depositos).size, 2, 'producción y ensayo no comparten depósito');
  assert.match(toml, /compatibility_date/);
  // la ruta comentada (para activar) tiene que estar ANTES de la primera tabla, o TOML la tomaría como parte de otra
  assert.ok(toml.indexOf('# routes = [') > 0 && toml.indexOf('# routes = [') < toml.search(/^\[\[r2_buckets\]\]/m));
  // "R2 primero" es un modo de ensayo: en producción apagado, en staging prendido
  const [produccion, ensayo] = sinComentarios.split('[env.staging]');
  assert.match(produccion, /ARCHIVO_PRIMERO = "0"/);
  assert.match(ensayo, /ARCHIVO_PRIMERO = "1"/);
  assert.match(produccion, /ARCHIVO_ACTIVO = "1"/);
  // producción vive en workers.dev (para probarla antes de la ruta y para /_archivo/estado); la ruta la maneja ruta.mjs, no este archivo
  assert.match(produccion, /^name = "radar-balcarce-archivo"\s*$/m);
  assert.match(produccion, /^workers_dev = true\s*$/m);
  assert.match(produccion, /bucket_name = "radar-archivo"/);
});

test('el workflow de staging es sólo a mano, con wrangler fijo, y nunca toca el depósito de respaldos ni usa --produccion', () => {
  const w = leer('.github/workflows/archivo-staging.yml');
  assert.match(w, /on:\s+workflow_dispatch:/);
  assert.ok(!/^\s*(schedule|push|pull_request|workflow_run):/m.test(w), 'no se dispara solo');
  assert.match(w, /wrangler@4\.139\.0 deploy --env staging/);
  assert.match(w, /BUCKET_DE_PRUEBA: radar-archivo-staging/);
  assert.ok(!/R2_RESPALDOS|R2_FOTOS/.test(w.replace(/#.*$/gm, '')), 'no usa las variables de los otros depósitos');
  assert.ok(!/--produccion/.test(w.replace(/#.*$/gm, '')));
  assert.ok(!/\brun:[^\n]*\$\{\{\s*inputs\./.test(w), 'las entradas pasan por env, no dentro del comando');
});

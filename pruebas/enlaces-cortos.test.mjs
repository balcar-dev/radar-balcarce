// Los enlaces cortos de las redes: radarbalcarce.com/r/<red>/<destino> (regla 282, 17/10/2026). Sin red: el Worker se prueba con un sitio de mentira.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  analizarCodigo, destinoDeLaVisita, enlaceCorto, fijarEnlacesCortos, soltarEnlacesCortos, hayEnlacesCortos, LETRAS_DE_RED, RED_DE_LETRA, CAMINO_DE_SERVICIO,
} from '../redes/enlaces-cortos.mjs';
import { ponerOrigen, enlaceConOrigen, enlaceDeNota, mensajeDeNota } from '../redes/elegir.mjs';
import { pieDePieza, enlaceDelRepaso } from '../redes/piezas.mjs';
import { manejar, esRobot, olvidarElIndice, CACHE_SEGUNDOS_POR_DEFECTO } from '../infra/enlaces-cloudflare/worker.mjs';
import { ruta, buscarRuta, PATRON, WORKER, idDeLaZona } from '../infra/enlaces-cloudflare/ruta.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const SITIO = 'https://radarbalcarce.com';
const LARGA = 'la-plata-concentra-propuestas-culturales-y-deportivas-para-el-sabado-dg5er4';
const nota = { id: 'dg5er4', titulo: 'La Plata concentra propuestas culturales y deportivas para el sábado' };

test('la gramática: /r/<red>/<destino>, con una letra por red', () => {
  assert.deepEqual(analizarCodigo('/r/f/dg5er4'), { red: 'facebook', letra: 'f', tipo: 'nota', destino: 'dg5er4', campana: 'posteo', contenido: 'dg5er4' });
  assert.equal(analizarCodigo('/r/t/dg5er4').red, 'telegram');
  assert.equal(analizarCodigo('/r/h/dg5er4').red, 'threads');
  assert.deepEqual(analizarCodigo('/r/i/repaso20261017noche'), { red: 'instagram', letra: 'i', tipo: 'repaso', destino: 'repaso20261017noche', campana: 'repaso', contenido: 'podcast' });
  assert.equal(analizarCodigo('/r/f/repaso20261017manana').contenido, 'noticia1');
  assert.equal(analizarCodigo('/r/f/repaso20261017tarde').contenido, 'noticia2');
  assert.deepEqual(analizarCodigo('/r/f/clima-noche'), { red: 'facebook', letra: 'f', tipo: 'servicio', destino: 'clima-noche', campana: 'servicio', contenido: 'clima-noche' });
  assert.equal(analizarCodigo('/r/f/farmacia/').tipo, 'servicio', 'la barra final no importa');
  // Lo que no es nuestro.
  for (const mal of ['/r/', '/r/f', '/r/f/', '/r/zz/abc', '/r/q/abc', '/r/f/AB', '/r/f/a b', '/r/f/../x', '/r/f/abc/def', '/nota/abc', '/r/f/aviso-', '', null]) {
    assert.equal(analizarCodigo(mal), null, String(mal));
  }
  // Las letras no se repiten y van y vienen.
  assert.equal(new Set(Object.values(LETRAS_DE_RED)).size, Object.keys(LETRAS_DE_RED).length);
  for (const [red, letra] of Object.entries(LETRAS_DE_RED)) assert.equal(RED_DE_LETRA[letra], red);
});

test('el destino arma la dirección de siempre con las UTM de siempre', () => {
  const d = destinoDeLaVisita(analizarCodigo('/r/f/dg5er4'), { parteDeLaNota: LARGA });
  assert.equal(d.camino, `/nota/${LARGA}`);
  assert.deepEqual(d.utm, { utm_source: 'facebook', utm_medium: 'social', utm_campaign: 'posteo', utm_content: 'dg5er4' });
  assert.equal(destinoDeLaVisita(analizarCodigo('/r/f/dg5er4')).camino, '/nota/dg5er4', 'sin el índice, por el identificador');
  assert.equal(destinoDeLaVisita(analizarCodigo('/r/f/repaso20261017manana')).camino, '/nota/repaso20261017manana');
  assert.equal(destinoDeLaVisita(analizarCodigo('/r/f/clima-manana')).camino, '/clima');
  assert.equal(destinoDeLaVisita(analizarCodigo('/r/f/farmacia')).camino, '/farmacias');
  assert.equal(destinoDeLaVisita(analizarCodigo('/r/f/aviso-viento')).camino, '/clima');
  assert.equal(CAMINO_DE_SERVICIO('aviso-viento'), '/clima');
  assert.equal(destinoDeLaVisita(null), null);
});

test('el generador: apagado todo sale como siempre; prendido, el enlace corto de la red que corresponde', () => {
  soltarEnlacesCortos();
  assert.equal(hayEnlacesCortos(), false, 'apagado por defecto');
  const largo = enlaceConOrigen(nota, SITIO, { fuente: 'facebook', campana: 'posteo', contenido: nota.id });
  assert.match(largo, /^https:\/\/radarbalcarce\.com\/nota\/.+-dg5er4\?utm_source=facebook&utm_medium=social&utm_campaign=posteo&utm_content=dg5er4$/);
  fijarEnlacesCortos('Sí');
  try {
    assert.equal(hayEnlacesCortos(), true);
    assert.equal(enlaceConOrigen(nota, SITIO, { fuente: 'facebook', campana: 'posteo', contenido: nota.id }), `${SITIO}/r/f/dg5er4`);
    assert.equal(enlaceConOrigen(nota, SITIO, { fuente: 'telegram', campana: 'posteo', contenido: nota.id }), `${SITIO}/r/t/dg5er4`);
    // El pie de un repaso, y las piezas de servicio.
    assert.equal(enlaceDelRepaso({ nombre: 'noticia2', dia: '2026-10-17' }, 'facebook'), `${SITIO.replace('https://', 'https://')}/r/f/repaso20261017tarde`);
    assert.match(pieDePieza({ tipo: 'reel', nombre: 'farmacia', titulo: 'Farmacia de turno: Del Pueblo' }, 'facebook'), /radarbalcarce\.com\/r\/f\/farmacia\n/);
    // Lo que no se puede acortar sale largo: una red que no tiene letra, otro sitio, otra página.
    assert.match(ponerOrigen(enlaceDeNota(nota, SITIO), { fuente: 'myspace', campana: 'posteo', contenido: 'dg5er4' }), /utm_source=myspace/);
    assert.match(ponerOrigen('https://otro.com/nota/x-abc', { fuente: 'facebook', campana: 'posteo' }), /\/r\/f\/abc$/, 'la gramática mira el camino: un sitio ajeno lo llena la red que publica, no se acorta a ciegas');
    assert.equal(enlaceCorto('https://radarbalcarce.com/contacto', { fuente: 'facebook', campana: 'posteo' }), null);
    // Instagram no lleva enlaces, con o sin cortos.
    assert.ok(!/https?:/.test(mensajeDeNota({ ...nota, copete: 'c' }, SITIO, { fuente: 'instagram' })));
  } finally { soltarEnlacesCortos(); }
  // El valor del entorno cuenta si nadie lo fijó.
  process.env.ENLACES_CORTOS = 'si';
  try { assert.equal(hayEnlacesCortos(), true); } finally { delete process.env.ENLACES_CORTOS; }
  assert.equal(hayEnlacesCortos(), false);
  fijarEnlacesCortos('');
  assert.equal(hayEnlacesCortos(), false, 'vacío = apagado');
  soltarEnlacesCortos();
});

test('un enlace corto mide una cuarta parte del largo (el caso de la nota del 17/10)', () => {
  soltarEnlacesCortos();
  const largo = enlaceConOrigen({ id: 'dg5er4', titulo: nota.titulo }, SITIO, { fuente: 'facebook', campana: 'posteo', contenido: 'dg5er4' });
  assert.ok(largo.length > 150, String(largo.length));
  fijarEnlacesCortos('si');
  try {
    const corto = enlaceConOrigen({ id: 'dg5er4', titulo: nota.titulo }, SITIO, { fuente: 'facebook', campana: 'posteo', contenido: 'dg5er4' });
    assert.equal(corto.length, 36);
    assert.ok(corto.length * 4 <= largo.length + 5);
  } finally { soltarEnlacesCortos(); }
});

// ------------------------------------------------------------- el Worker

/** Un sitio de mentira: contesta el índice de notas y anota qué se le pidió. */
function sitio(indice = { dg5er4: LARGA }, { estado = 200 } = {}) {
  const pedidos = [];
  const fetchFn = async (req) => {
    pedidos.push(String(req.url ?? req));
    if (String(req.url).endsWith('/nota/indice.json')) return new Response(JSON.stringify(indice), { status: estado, headers: { 'content-type': 'application/json' } });
    return new Response('pasó derecho', { status: 200 });
  };
  return { fetchFn, pedidos };
}
const clics = () => { const puntos = []; return { puntos, writeDataPoint: (p) => puntos.push(p) }; };
const pedir = (camino, extra = {}) => new Request(`https://radarbalcarce.com${camino}`, extra);
const ENTORNO = { SITIO, ORIGEN_PAGES: 'https://radar-balcarce.pages.dev' };

test('Worker: una nota va a su dirección con las UTM y sin guardar nada; el índice se baja una sola vez', async () => {
  olvidarElIndice();
  const s = sitio();
  const c = clics();
  const r = await manejar(pedir('/r/f/dg5er4', { headers: { 'user-agent': 'Mozilla/5.0 (iPhone) Mobile Safari' } }), { ...ENTORNO, CLICS: c }, {}, { fetchFn: s.fetchFn });
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), `${SITIO}/nota/${LARGA}?utm_source=facebook&utm_medium=social&utm_campaign=posteo&utm_content=dg5er4`);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.headers.get('x-robots-tag'), 'noindex');
  assert.equal(r.headers.get('referrer-policy'), null, 'no pisa el Referrer-Policy de la página de origen (si no, se pierde que vino de Facebook)');
  assert.deepEqual(s.pedidos, ['https://radar-balcarce.pages.dev/nota/indice.json'], 'el índice se pide al origen, no a la ruta del propio dominio');
  assert.deepEqual(c.puntos[0].blobs, ['facebook', 'posteo', 'dg5er4', 'persona', 'ok']);
  await manejar(pedir('/r/t/dg5er4'), ENTORNO, {}, { fetchFn: s.fetchFn });
  assert.equal(s.pedidos.length, 1, 'el segundo toque usa el índice guardado');
});

test('Worker: el índice vence a los 10 minutos y, si no contesta, se sigue con el último que había', async () => {
  olvidarElIndice();
  const s = sitio();
  const t0 = 1_000_000;
  await manejar(pedir('/r/f/dg5er4'), ENTORNO, {}, { fetchFn: s.fetchFn, ahora: t0 });
  await manejar(pedir('/r/f/dg5er4'), ENTORNO, {}, { fetchFn: s.fetchFn, ahora: t0 + (CACHE_SEGUNDOS_POR_DEFECTO - 1) * 1000 });
  assert.equal(s.pedidos.length, 1);
  const caido = async () => { throw new Error('sin red'); };
  const r = await manejar(pedir('/r/f/dg5er4'), ENTORNO, {}, { fetchFn: caido, ahora: t0 + (CACHE_SEGUNDOS_POR_DEFECTO + 5) * 1000 });
  assert.match(r.headers.get('location'), new RegExp(`/nota/${LARGA}\\?`), 'con el índice viejo alcanza');
});

test('Worker: una nota que no está en el índice (vieja) va por su identificador: ahí la lleva el archivo permanente o la página 404', async () => {
  olvidarElIndice();
  const c = clics();
  const r = await manejar(pedir('/r/f/viejaaaa'), { ...ENTORNO, CLICS: c }, {}, { fetchFn: sitio({}).fetchFn });
  assert.equal(r.headers.get('location'), `${SITIO}/nota/viejaaaa?utm_source=facebook&utm_medium=social&utm_campaign=posteo&utm_content=viejaaaa`);
  assert.equal(r.headers.get('x-radar-enlace'), 'por-id');
  assert.equal(c.puntos[0].blobs[4], 'sin-indice');
  // Si el sitio no contesta, igual: nunca un error.
  olvidarElIndice();
  const r2 = await manejar(pedir('/r/f/dg5er4'), ENTORNO, {}, { fetchFn: sitio({}, { estado: 500 }).fetchFn });
  assert.equal(r2.status, 302);
  assert.match(r2.headers.get('location'), /\/nota\/dg5er4\?/);
});

test('Worker: un índice con una dirección rara no se usa (nada que no sea "titular-id" entra en la dirección final)', async () => {
  olvidarElIndice();
  for (const rara of ['https://malo.com/x-dg5er4', '../../admin-dg5er4', 'otra-nota-zzz', 'MAYUSCULAS-dg5er4', 'a b-dg5er4']) {
    olvidarElIndice();
    const r = await manejar(pedir('/r/f/dg5er4'), ENTORNO, {}, { fetchFn: sitio({ dg5er4: rara }).fetchFn });
    const dest = new URL(r.headers.get('location'));
    assert.equal(dest.origin, SITIO, rara);
    assert.equal(dest.pathname, '/nota/dg5er4', `${rara} no es de esa nota: va por el identificador`);
  }
});

test('Worker: repaso y servicio van a su página; lo inválido, a la portada, sin error y sin UTM', async () => {
  olvidarElIndice();
  const s = sitio();
  const r = await manejar(pedir('/r/i/repaso20261017noche'), ENTORNO, {}, { fetchFn: s.fetchFn });
  assert.equal(r.headers.get('location'), `${SITIO}/nota/repaso20261017noche?utm_source=instagram&utm_medium=social&utm_campaign=repaso&utm_content=podcast`);
  assert.equal(s.pedidos.length, 0, 'un repaso no necesita el índice');
  const clima = await manejar(pedir('/r/f/clima-noche'), ENTORNO, {}, { fetchFn: s.fetchFn });
  assert.equal(clima.headers.get('location'), `${SITIO}/clima?utm_source=facebook&utm_medium=social&utm_campaign=servicio&utm_content=clima-noche`);
  const c = clics();
  for (const mal of ['/r/zz/abc', '/r/f/', '/r/f/%00', '/r/f/a%2F..%2Fb', '/r/f/UNA-COSA-RARA']) {
    const x = await manejar(pedir(mal), { ...ENTORNO, CLICS: c }, {}, { fetchFn: s.fetchFn });
    assert.equal(x.status, 302, mal);
    assert.equal(x.headers.get('location'), `${SITIO}/`, mal);
    assert.equal(x.headers.get('x-radar-enlace'), 'invalido');
  }
  assert.ok(c.puntos.every((p) => p.blobs[4] === 'invalido'));
});

test('Worker: la dirección final sale siempre de SITIO; lo que mande quien llega no puede llevar a otro dominio', async () => {
  olvidarElIndice();
  const r = await manejar(pedir('/r/f/dg5er4?next=https://malo.com&url=//malo.com', { headers: { host: 'malo.com' } }), { ...ENTORNO, SITIO: 'https://radarbalcarce.com/' }, {}, { fetchFn: sitio().fetchFn });
  const dest = new URL(r.headers.get('location'));
  assert.equal(dest.origin, 'https://radarbalcarce.com');
  assert.ok(![...dest.searchParams.keys()].some((k) => !k.startsWith('utm_')), 'no se copia nada de lo que vino en el pedido');
});

test('Worker: HEAD anda como GET; otros métodos y otras rutas pasan derecho; los robots de las redes se cuentan aparte', async () => {
  olvidarElIndice();
  const s = sitio();
  const c = clics();
  const head = await manejar(pedir('/r/f/dg5er4', { method: 'HEAD', headers: { 'user-agent': 'facebookexternalhit/1.1' } }), { ...ENTORNO, CLICS: c }, {}, { fetchFn: s.fetchFn });
  assert.equal(head.status, 302);
  assert.equal(c.puntos[0].blobs[3], 'robot');
  const post = await manejar(pedir('/r/f/dg5er4', { method: 'POST' }), ENTORNO, {}, { fetchFn: s.fetchFn });
  assert.equal(await post.text(), 'pasó derecho');
  const otra = await manejar(pedir('/nota/abc'), ENTORNO, {}, { fetchFn: s.fetchFn });
  assert.equal(await otra.text(), 'pasó derecho');
  for (const ua of ['facebookexternalhit/1.1', 'Mozilla/5.0 (compatible; Googlebot/2.1)', 'TelegramBot (like TwitterBot)', 'WhatsApp/2.23', 'Twitterbot/1.0', 'Bluesky Cardyb/1.1']) assert.equal(esRobot(ua), true, ua);
  for (const ua of ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1', 'Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450]', '']) assert.equal(esRobot(ua), false, ua);
});

test('Worker: si contar falla, o no hay dónde contar, el enlace anda igual; ENLACES_ACTIVO=0 deja de contar pero no de redirigir', async () => {
  olvidarElIndice();
  const roto = { writeDataPoint: () => { throw new Error('boom'); } };
  assert.equal((await manejar(pedir('/r/f/dg5er4'), { ...ENTORNO, CLICS: roto }, {}, { fetchFn: sitio().fetchFn })).status, 302);
  assert.equal((await manejar(pedir('/r/f/dg5er4'), ENTORNO, {}, { fetchFn: sitio().fetchFn })).status, 302);
  const c = clics();
  const r = await manejar(pedir('/r/f/dg5er4'), { ...ENTORNO, CLICS: c, ENLACES_ACTIVO: '0' }, {}, { fetchFn: sitio().fetchFn });
  assert.equal(r.status, 302);
  assert.equal(c.puntos.length, 0);
});

test('Worker: sin ninguna clave ni escritura (sólo lee el índice público) y sin dependencias de afuera de Node', () => {
  const codigo = leer('infra/enlaces-cloudflare/worker.mjs').replace(/\/\/.*$/gm, '');
  assert.ok(!/process\.env|\.put\(|\.delete\(|secret|token/i.test(codigo), 'el Worker no usa claves ni escribe');
  const imports = [...codigo.matchAll(/^import .* from '(.+)';/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ['../../redes/enlaces-cortos.mjs'], 'sólo comparte la gramática del enlace');
  assert.ok(!/^import/m.test(leer('redes/enlaces-cortos.mjs').replace(/\/\/.*$/gm, '')), 'la gramática no importa nada');
});

test('wrangler.toml: ninguna ruta activa (la pone ruta.mjs), con su variable, su índice y su cuenta de visitas', () => {
  const toml = leer('infra/enlaces-cloudflare/wrangler.toml');
  const sinComentarios = toml.replace(/^\s*#.*$/gm, '');
  assert.ok(!/^\s*routes?\s*=/m.test(sinComentarios), 'mientras no se active, ninguna ruta apunta a este Worker');
  assert.ok(toml.indexOf('# routes = [') > 0 && toml.indexOf('# routes = [') < toml.search(/^\[vars\]/m), 'la ruta comentada va antes de la primera tabla');
  assert.match(toml, /name = "radar-balcarce-enlaces"/);
  assert.match(toml, /SITIO = "https:\/\/radarbalcarce\.com"/);
  assert.match(toml, /ORIGEN_PAGES = "https:\/\/radar-balcarce\.pages\.dev"/);
  assert.match(toml, /\[\[analytics_engine_datasets\]\]\s*\nbinding = "CLICS"/);
  assert.equal(PATRON, 'radarbalcarce.com/r/*');
  assert.equal(WORKER, 'radar-balcarce-enlaces');
  assert.match(leer('infra/enlaces-cloudflare/wrangler.toml'), /ENLACES_CORTOS/);
});

test('ruta.mjs: ver, poner y sacar sólo ESTA ruta, con la API de Cloudflare de mentira; nunca toca la de otro Worker', async () => {
  const hechos = [];
  const mundo = { rutas: [{ id: 'r-archivo', pattern: 'radarbalcarce.com/nota/*', script: 'radar-balcarce-archivo' }] };
  const api = async (url, init = {}) => {
    const u = new URL(url);
    const metodo = init.method ?? 'GET';
    hechos.push(`${metodo} ${u.pathname}`);
    const ok = (result) => ({ ok: true, status: 200, json: async () => ({ success: true, result }) });
    if (u.pathname === '/client/v4/zones') return ok([{ id: 'zona1', name: 'radarbalcarce.com' }]);
    if (u.pathname === '/client/v4/zones/zona1/workers/routes' && metodo === 'GET') return ok(mundo.rutas);
    if (u.pathname === '/client/v4/zones/zona1/workers/routes' && metodo === 'POST') { const b = JSON.parse(init.body); mundo.rutas.push({ id: 'r-nueva', pattern: b.pattern, script: b.script }); return ok({ id: 'r-nueva' }); }
    if (u.pathname.startsWith('/client/v4/zones/zona1/workers/routes/') && metodo === 'DELETE') { const id = u.pathname.split('/').pop(); mundo.rutas = mundo.rutas.filter((x) => x.id !== id); return ok({ id }); }
    return { ok: false, status: 404, json: async () => ({ success: false, errors: [{ code: 1, message: 'no' }] }) };
  };
  const env = { CLOUDFLARE_API_TOKEN: 'token-secreto-123' };
  const sin = await ruta('ver', { env, fetchFn: api });
  assert.equal(sin.presente, false);
  assert.match(sin.texto, /NO está puesta/);
  const puesta = await ruta('poner', { env, fetchFn: api });
  assert.equal(puesta.ok, true);
  assert.equal(puesta.presente, true);
  assert.ok(mundo.rutas.some((x) => x.pattern === PATRON && x.script === WORKER));
  assert.equal((await ruta('poner', { env, fetchFn: api })).texto.includes('ya estaba puesta'), true, 'ponerla dos veces no la duplica');
  assert.equal(mundo.rutas.filter((x) => x.pattern === PATRON).length, 1);
  const fuera = await ruta('sacar', { env, fetchFn: api });
  assert.equal(fuera.presente, false);
  assert.ok(mundo.rutas.some((x) => x.id === 'r-archivo'), 'la ruta del archivo permanente no se toca');
  assert.match(fuera.texto, /dejó de andar/, 'avisa que los enlaces ya publicados dejan de andar');
  // Sin token, sin zona, otra ruta con el mismo patrón.
  assert.equal((await ruta('ver', { env: {}, fetchFn: api })).ok, false);
  mundo.rutas.push({ id: 'ajena', pattern: PATRON, script: 'otro-worker' });
  const choque = await ruta('poner', { env, fetchFn: api });
  assert.equal(choque.ok, false);
  assert.match(choque.texto, /otro Worker/);
  assert.equal(buscarRuta(mundo.rutas).ajena.id, 'ajena');
  assert.ok(!(await ruta('ver', { env, fetchFn: api })).texto.includes('token-secreto'));
  assert.equal((await idDeLaZona({ token: 'x', fetchFn: api, env: { CLOUDFLARE_ZONE_ID: 'dada' } })).id, 'dada');
  assert.equal((await ruta('bailar', { env, fetchFn: api })).ok, false);
});

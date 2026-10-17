// La firma de R2/S3 (infra/compartido/r2-s3.mjs): se prueba contra los ejemplos oficiales de Amazon (los mismos que usa R2) y contra un R2 de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firmarPedido, urlFirmada, clienteR2, codificar, marcaDeTiempo, sha256Hex, anfitrionDeR2 } from '../infra/compartido/r2-s3.mjs';

const CLAVE = 'AKIAIOSFODNN7EXAMPLE';
const SECRETO = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
const FECHA = new Date('2013-05-24T00:00:00Z');

test('el ejemplo oficial de Amazon con encabezados (GET Object con Range) da la firma publicada', async () => {
  const h = await firmarPedido({
    metodo: 'GET', host: 'examplebucket.s3.amazonaws.com', ruta: '/test.txt', cabeceras: { Range: 'bytes=0-9' },
    accessKey: CLAVE, secretKey: SECRETO, region: 'us-east-1', fecha: FECHA,
  });
  assert.match(h.authorization, /Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41$/);
  assert.match(h.authorization, /SignedHeaders=host;range;x-amz-content-sha256;x-amz-date,/);
  assert.match(h.authorization, /Credential=AKIAIOSFODNN7EXAMPLE\/20130524\/us-east-1\/s3\/aws4_request/);
});

test('el ejemplo oficial de Amazon de dirección firmada (GET, 24 horas) da la firma publicada', async () => {
  const u = await urlFirmada({
    metodo: 'GET', host: 'examplebucket.s3.amazonaws.com', ruta: '/test.txt', expira: 86400, accessKey: CLAVE, secretKey: SECRETO, region: 'us-east-1', fecha: FECHA,
  });
  assert.equal(u, 'https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404');
});

test('la dirección firmada no lleva la clave secreta y el vencimiento tiene tope de 7 días', async () => {
  const u = await urlFirmada({ metodo: 'PUT', host: anfitrionDeR2('cuenta1'), ruta: '/depo/render/a b.mp4', expira: 99999999, accessKey: CLAVE, secretKey: SECRETO, fecha: FECHA });
  assert.ok(!u.includes(SECRETO) && !u.includes('wJalrXUtnFEMI'), 'el secreto nunca viaja');
  assert.match(u, /X-Amz-Expires=604800/);
  assert.match(u, /^https:\/\/cuenta1\.r2\.cloudflarestorage\.com\/depo\/render\/a%20b\.mp4\?/, 'la ruta se codifica y se conserva la barra');
});

test('codificar deja pasar lo seguro, escapa lo demás y conserva las barras de una ruta', () => {
  assert.equal(codificar('a-b_c.d~e'), 'a-b_c.d~e');
  assert.equal(codificar("ñ (1)!'*"), '%C3%B1%20%281%29%21%27%2A');
  assert.equal(codificar('a/b c', { barra: true }), 'a/b%20c');
  assert.deepEqual(marcaDeTiempo(new Date('2026-10-18T12:34:56.789Z')), { amz: '20261018T123456Z', dia: '20261018' });
  return sha256Hex('').then((h) => assert.equal(h, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'));
});

/** Un R2 de mentira en memoria que además comprueba que cada pedido venga firmado. */
function r2Falso() {
  const objetos = new Map();
  const pedidos = [];
  const fetchFn = async (url, init = {}) => {
    const u = new URL(url);
    const metodo = init.method ?? 'GET';
    pedidos.push({ metodo, url: String(url), headers: init.headers });
    assert.match(init.headers.authorization, /^AWS4-HMAC-SHA256 Credential=K\//, 'viene firmado');
    assert.ok(!('host' in init.headers), 'fetch pone el host solo');
    const partes = decodeURIComponent(u.pathname).split('/').filter(Boolean);
    const clave = partes.slice(1).join('/');
    if (metodo === 'PUT') { objetos.set(clave, new Uint8Array(init.body)); return new Response('', { status: 200 }); }
    if (metodo === 'DELETE') { objetos.delete(clave); return new Response(null, { status: 204 }); }
    if (metodo === 'HEAD') return new Response('', { status: objetos.has(clave) ? 200 : 404 });
    if (u.searchParams.get('list-type') === '2') {
      const prefijo = u.searchParams.get('prefix') ?? '';
      const todas = [...objetos.keys()].filter((k) => k.startsWith(prefijo)).sort();
      const desde = u.searchParams.get('continuation-token') ? Number(u.searchParams.get('continuation-token')) : 0;
      const pagina = todas.slice(desde, desde + 2);
      const hayMas = desde + 2 < todas.length;
      return new Response(`<ListBucketResult>${pagina.map((k) => `<Contents><Key>${k.replace(/&/g, '&amp;')}</Key></Contents>`).join('')}<IsTruncated>${hayMas}</IsTruncated>${hayMas ? `<NextContinuationToken>${desde + 2}</NextContinuationToken>` : ''}</ListBucketResult>`, { status: 200 });
    }
    return objetos.has(clave) ? new Response(objetos.get(clave), { status: 200 }) : new Response('<Error/>', { status: 404 });
  };
  return { objetos, pedidos, fetchFn };
}

test('el cliente guarda, lee, mira, lista (con páginas) y borra, y firma todo', async () => {
  const r2 = r2Falso();
  const c = clienteR2({ cuenta: 'cuenta1', bucket: 'depo', accessKey: 'K', secretKey: 'S', fetchFn: r2.fetchFn, ahora: () => FECHA });
  assert.equal(await c.leer('no/esta.json'), null);
  assert.equal(await c.existe('no/esta.json'), false);
  await c.guardar('motor/a.json', '{"x":1}', 'application/json');
  await c.guardar('motor/b & c.json', new Uint8Array([1, 2, 3]));
  await c.guardar('motor/d.json', 'd');
  assert.equal(await c.leerTexto('motor/a.json'), '{"x":1}');
  assert.deepEqual([...await c.leer('motor/b & c.json')], [1, 2, 3]);
  assert.equal(await c.existe('motor/a.json'), true);
  assert.deepEqual(await c.listar('motor/'), ['motor/a.json', 'motor/b & c.json', 'motor/d.json']);
  await c.borrar('motor/a.json');
  await c.borrar('motor/ya-no-estaba.json');
  assert.deepEqual(await c.listar('motor/'), ['motor/b & c.json', 'motor/d.json']);
  const firmada = await c.firmar('render/p1/pedido.json', { metodo: 'PUT', expira: 600 });
  assert.match(firmada, /^https:\/\/cuenta1\.r2\.cloudflarestorage\.com\/depo\/render\/p1\/pedido\.json\?.*X-Amz-Expires=600/);
  for (const p of r2.pedidos) assert.ok(!JSON.stringify(p).includes('"S"') && !p.url.includes('secretKey'), 'el secreto no viaja');
});

test('un error de R2 se dice sin las claves y sin el cuerpo entero', async () => {
  const c = clienteR2({ cuenta: 'c', bucket: 'd', accessKey: 'K', secretKey: 'SECRETO-LARGO', fetchFn: async () => new Response('x'.repeat(500), { status: 403 }), ahora: () => FECHA });
  await assert.rejects(c.guardar('a', 'b'), (e) => /HTTP 403/.test(e.message) && !e.message.includes('SECRETO-LARGO') && e.message.length < 260);
  assert.throws(() => clienteR2({ cuenta: 'c', bucket: 'd', accessKey: '', secretKey: 's' }), /Faltan datos de R2/);
});

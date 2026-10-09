// IndexNow (8/10/2026): se avisa a Bing de las notas nuevas que Google también puede ver, nada más.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { direccionesParaAvisar, pedidoDeIndexNow, avisar, CLAVE_INDEXNOW, SITIO, MAXIMO } from '../redes/indexnow.mjs';

const AHORA = new Date('2026-10-08T21:00:00Z');
const cuerpo = Array.from({ length: 90 }, (_, i) => `palabra${i}`).join(' ');
const hace = (min) => new Date(AHORA.getTime() - min * 60000).toISOString();
const nota = (id, minutos, extra = {}) => ({ id, ruta: `/nota/${id}`, titulo: `Nota ${id}`, copete: `Bajada ${id}`, cuerpo, visto: hace(minutos), fecha: hace(minutos), como: 'automatica', ...extra });

test('se avisa la portada y las notas de los últimos 45 minutos con cuerpo; no lo viejo ni lo que lleva noindex', () => {
  const portada = { notas: [nota('nueva', 10), nota('vieja', 300), nota('sin-cuerpo', 5, { cuerpo: 'corto' }), nota('persona', 5, { cuerpo: 'corto', como: 'publicada' })] };
  const urls = direccionesParaAvisar({ portada, ahora: AHORA });
  assert.deepEqual(urls, [`${SITIO}/`, `${SITIO}/nota/nueva`, `${SITIO}/nota/persona`]);
});

test('sin notas nuevas no se avisa nada, y nunca más de MAXIMO', () => {
  assert.deepEqual(direccionesParaAvisar({ portada: { notas: [nota('vieja', 500)] }, ahora: AHORA }), []);
  assert.deepEqual(direccionesParaAvisar({ portada: {}, ahora: AHORA }), []);
  const muchas = { notas: Array.from({ length: 300 }, (_, i) => nota(`n${i}`, 5)) };
  assert.equal(direccionesParaAvisar({ portada: muchas, ahora: AHORA }).length, MAXIMO);
});

test('el pedido lleva el host, la clave y dónde está publicada', async () => {
  const p = pedidoDeIndexNow([`${SITIO}/nota/a`]);
  assert.deepEqual(p, { host: 'radarbalcarce.com', key: CLAVE_INDEXNOW, keyLocation: `${SITIO}/${CLAVE_INDEXNOW}.txt`, urlList: [`${SITIO}/nota/a`] });
  let visto = null;
  const r = await avisar({ urls: [`${SITIO}/nota/a`], fetchFn: async (url, init) => { visto = { url, cuerpo: JSON.parse(init.body) }; return { status: 202 }; } });
  assert.equal(r.enviadas, 1);
  assert.equal(visto.url, 'https://api.indexnow.org/indexnow');
  assert.equal(visto.cuerpo.key, CLAVE_INDEXNOW);
  await assert.rejects(avisar({ urls: ['x'], fetchFn: async () => ({ status: 403 }) }), /403/);
  assert.deepEqual(await avisar({ urls: [], fetchFn: async () => { throw new Error('no debería llamarse'); } }), { enviadas: 0, estado: null });
});

test('la clave está publicada en el sitio y el workflow avisa sin frenar el despliegue', () => {
  const archivo = new URL(`../web/public/${CLAVE_INDEXNOW}.txt`, import.meta.url);
  assert.equal(fs.readFileSync(archivo, 'utf8').trim(), CLAVE_INDEXNOW);
  const w = fs.readFileSync(new URL('../.github/workflows/cloudflare-deploy.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const i = w.indexOf('node redes/indexnow.mjs');
  assert.ok(i > w.indexOf('wrangler@'), 'después de subir el sitio');
  assert.match(w.slice(w.lastIndexOf('- name:', i), i), /continue-on-error: true/);
});

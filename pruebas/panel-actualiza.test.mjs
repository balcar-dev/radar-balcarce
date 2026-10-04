// Dos cosas que dejaron al panel del celular "viejo" o roto el 4/10/2026:
//  · aprobar una efeméride daba "GitHub no encontró el archivo": web/data/efemerides-elegidas.json no existía y el celular sólo sabía cambiar archivos que ya estaban;
//  · Cloudflare deja los archivos del panel 4 horas en la caché del navegador y las pantallas se veían viejas (el mensaje de las fotos "tiene que empezar con https://" siguió
//    saliendo horas después de arreglarlo).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { crearCliente, ARCHIVOS, ErrorDeGitHub } from '../web/public/panel/github.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

/** Un GitHub de mentira: un solo archivo en memoria (o ninguno). */
function githubDeMentira(archivos = {}) {
  const pedidos = [];
  const fetchFn = async (url, opts = {}) => {
    const ruta = decodeURIComponent(url.split('/contents/')[1].split('?')[0]);
    pedidos.push({ metodo: opts.method ?? 'GET', ruta, cuerpo: opts.body ? JSON.parse(opts.body) : null });
    if ((opts.method ?? 'GET') === 'GET') {
      if (!(ruta in archivos)) return { ok: false, status: 404, json: async () => ({ message: 'Not Found' }) };
      return { ok: true, status: 200, json: async () => ({ encoding: 'base64', content: Buffer.from(archivos[ruta]).toString('base64'), sha: 'sha1' }) };
    }
    const cuerpo = JSON.parse(opts.body);
    if (ruta in archivos && !cuerpo.sha) return { ok: false, status: 422, json: async () => ({ message: 'sha wasn\'t supplied' }) };
    archivos[ruta] = Buffer.from(cuerpo.content, 'base64').toString('utf8');
    return { ok: true, status: 200, json: async () => ({}) };
  };
  return { fetchFn, archivos, pedidos };
}

test('el celular crea el archivo si todavía no existe (la primera aprobación de una efeméride no falla)', async () => {
  const g = githubDeMentira({});
  const c = crearCliente({ token: 'x', fetchFn: g.fetchFn });
  const r = await c.guardar(ARCHIVOS.elegidas, (j) => ({ dias: {}, feriados: {}, piezas: { '2026-10-04': { estado: 'aprobada' } }, ...j }), 'prueba');
  assert.equal(r.piezas['2026-10-04'].estado, 'aprobada');
  assert.equal(JSON.parse(g.archivos[ARCHIVOS.elegidas]).piezas['2026-10-04'].estado, 'aprobada');
  assert.equal(g.pedidos.find((p) => p.metodo === 'PUT').cuerpo.sha, undefined, 'sin sha: es un archivo nuevo');
});

test('si el archivo existe, se cambia con su sha, como siempre; y un error que no es "no existe" sigue siendo un error', async () => {
  const g = githubDeMentira({ [ARCHIVOS.elegidas]: '{"dias":{},"feriados":{},"piezas":{}}\n' });
  const c = crearCliente({ token: 'x', fetchFn: g.fetchFn });
  await c.guardar(ARCHIVOS.elegidas, (j) => ({ ...j, piezas: { a: 1 } }), 'prueba');
  assert.equal(g.pedidos.find((p) => p.metodo === 'PUT').cuerpo.sha, 'sha1');
  const roto = crearCliente({ token: 'x', fetchFn: async () => ({ ok: false, status: 403, json: async () => ({ message: 'Forbidden' }) }) });
  await assert.rejects(roto.guardar(ARCHIVOS.elegidas, (j) => j, 'x'), (e) => e instanceof ErrorDeGitHub && e.estado === 403);
});

test('el archivo de lo que se aprueba de las efemérides y los feriados existe en el repositorio', () => {
  const j = JSON.parse(leer('web/data/efemerides-elegidas.json'));
  assert.equal(typeof j, 'object');
  assert.ok(!Array.isArray(j));
});

test('el service worker pide los archivos del panel salteándose la caché del navegador, y el panel tiene un botón para actualizarse', () => {
  const sw = leer('web/public/panel/sw.js');
  assert.match(sw, /fetch\(ev\.request, \{ cache: 'reload' \}\)/);
  assert.match(sw, /new Request\(a, \{ cache: 'reload' \}\)/, 'también al instalarse');
  const app = leer('web/public/panel/app.js');
  assert.ok(app.includes('data-accion="actualizar-panel"'));
  assert.ok(app.includes("fetch(a, { cache: 'reload' })"));
  assert.ok(app.includes('for (const k of await caches.keys()) await caches.delete(k);'));
  // La lista que baja el botón tiene todos los módulos que guarda el service worker.
  for (const modulo of sw.match(/\/panel\/[a-z-]+\.js/g)) assert.ok(app.includes(`'${modulo.replace('/panel/', '')}'`), `el botón no baja ${modulo}`);
});

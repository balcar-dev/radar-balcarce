// El reloj propio en Cloudflare (9/10/2026): qué pide a GitHub en cada minuto, cómo lo pide y que nunca lleve un token escrito.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker, { trabajosDelMinuto, despertar, REPOSITORIO } from '../infra/reloj-cloudflare/worker.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');

test('a los :00 y :30 pide la web y la vigilancia; a los :05, :35 y :45, el reloj de Redes; el resto del tiempo, nada', () => {
  for (const m of [0, 30]) assert.deepEqual(trabajosDelMinuto(m).map((t) => t.archivo), ['actualizar.yml', 'vigilancia.yml']);
  for (const m of [5, 35, 45]) assert.deepEqual(trabajosDelMinuto(m), [{ archivo: 'redes.yml', inputs: { accion: 'reloj' } }]);
  for (const m of [1, 4, 15, 29, 59]) assert.deepEqual(trabajosDelMinuto(m), []);
});

test('pide a la API de GitHub con el token en el encabezado, nunca en la dirección', async () => {
  let visto = null;
  const r = await despertar({ archivo: 'redes.yml', inputs: { accion: 'reloj' } }, { token: 'T0K3N', fetchFn: async (url, o) => { visto = { url, o }; return { status: 204 }; } });
  assert.equal(r.ok, true);
  assert.equal(visto.url, `https://api.github.com/repos/${REPOSITORIO}/actions/workflows/redes.yml/dispatches`);
  assert.ok(!visto.url.includes('T0K3N'));
  assert.equal(visto.o.headers.Authorization, 'Bearer T0K3N');
  assert.deepEqual(JSON.parse(visto.o.body), { ref: 'main', inputs: { accion: 'reloj' } });
});

test('si GitHub no acepta, el reloj falla a la vista; sin token, también', async () => {
  const antes = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 401 });
  try {
    await assert.rejects(() => worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 9, 13, 0) }, { GITHUB_TOKEN: 'x' }), /actualizar\.yml \(401\)/);
    await assert.rejects(() => worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 9, 13, 0) }, {}), /Falta el secreto/);
  } finally { globalThis.fetch = antes; }
});

test('el reloj está definido (crons), el workflow que lo sube es sólo a mano y no hay ninguna clave escrita', () => {
  assert.match(leer('infra/reloj-cloudflare/wrangler.toml'), /crons = \["0,30 \* \* \* \*", "5,35,45 \* \* \* \*"\]/);
  const w = leer('.github/workflows/reloj-cloudflare.yml');
  assert.match(w, /on:\s+workflow_dispatch:/);
  assert.ok(!/schedule:|push:/.test(w), 'el reloj nuevo no se sube solo');
  for (const f of ['infra/reloj-cloudflare/worker.mjs', 'infra/reloj-cloudflare/wrangler.toml']) assert.ok(!/ghp_|github_pat_|Bearer [A-Za-z0-9_]{20,}/.test(leer(f)), f);
});

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

// 15/10/2026: el informe diario por mail (redes/informe-diario.mjs, regla 176). El minuto :15 de las 11 y de las 0 UTC; el resto de los :15, nada.
test('a las 8:15 y a las 21:15 de Balcarce (11:15 y 0:15 UTC) pide el informe diario con su momento; a ninguna otra hora, y lo demás no cambia', () => {
  assert.deepEqual(trabajosDelMinuto(15, 11), [{ archivo: 'informe-diario.yml', inputs: { momento: 'manana' } }]);
  assert.deepEqual(trabajosDelMinuto(15, 0), [{ archivo: 'informe-diario.yml', inputs: { momento: 'noche' } }]);
  for (let h = 1; h < 24; h++) if (h !== 11) assert.deepEqual(trabajosDelMinuto(15, h), [], `a las ${h} UTC no hay informe`);
  // 16/10: el segundo intento va a los :30 de las 11 y de las 0 UTC (los :15 no despertaron nada), y el Worker del vigilante no manda dos mails por la misma clave.
  assert.deepEqual(trabajosDelMinuto(30, 11).map((t) => t.archivo), ['actualizar.yml', 'vigilancia.yml', 'informe-diario.yml']);
  assert.deepEqual(trabajosDelMinuto(30, 0).at(-1), { archivo: 'informe-diario.yml', inputs: { momento: 'noche' } });
  for (let h = 1; h < 24; h++) if (h !== 11) assert.deepEqual(trabajosDelMinuto(30, h).map((t) => t.archivo), ['actualizar.yml', 'vigilancia.yml'], `a las ${h}:30 UTC no hay informe`);
  for (const m of [0, 1, 5, 14, 16, 35, 45]) assert.deepEqual(trabajosDelMinuto(m, 11).filter((t) => t.archivo === 'informe-diario.yml'), [], `el minuto ${m} no es el del informe`);
  // lo de siempre, a cualquier hora, sigue igual
  for (const h of [0, 11, 13]) {
    for (const m of [0, 30]) assert.deepEqual(trabajosDelMinuto(m, h).map((t) => t.archivo).filter((x) => x !== 'informe-diario.yml'), ['actualizar.yml', 'vigilancia.yml']);
    for (const m of [5, 35, 45]) assert.deepEqual(trabajosDelMinuto(m, h), [{ archivo: 'redes.yml', inputs: { accion: 'reloj' } }]);
  }
});

test('el Worker le pasa la hora UTC: a las 0:15 UTC despierta el informe de la noche y a las 11:15 el de la mañana, con el token en el encabezado', async () => {
  const antes = globalThis.fetch;
  const pedidos = [];
  globalThis.fetch = async (url, o) => { pedidos.push({ url: String(url), body: JSON.parse(o.body), auth: o.headers.Authorization }); return { status: 204 }; };
  try {
    await worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 16, 0, 15) }, { GITHUB_TOKEN: 'T0K3N' });
    await worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 16, 11, 15) }, { GITHUB_TOKEN: 'T0K3N' });
    await worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 16, 13, 15) }, { GITHUB_TOKEN: 'T0K3N' });
  } finally { globalThis.fetch = antes; }
  assert.equal(pedidos.length, 2, 'a las 13:15 UTC no despierta nada');
  assert.ok(pedidos.every((p) => p.url.endsWith('/actions/workflows/informe-diario.yml/dispatches') && p.auth === 'Bearer T0K3N'));
  assert.deepEqual(pedidos.map((p) => p.body.inputs), [{ momento: 'noche' }, { momento: 'manana' }]);
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
  const toml = leer('infra/reloj-cloudflare/wrangler.toml');
  assert.match(toml, /crons = \["0,30 \* \* \* \*", "5,35,45 \* \* \* \*", "15 0,11 \* \* \*"\]/);
  assert.equal(toml.match(/crons = \[([^\]]+)\]/)[1].match(/"[^"]+"/g).length, 3, 'tres expresiones: el informe suma UNA sola, para no gastar triggers de la cuenta');
  const w = leer('.github/workflows/reloj-cloudflare.yml');
  assert.match(w, /on:\s+workflow_dispatch:/);
  assert.ok(!/schedule:|push:/.test(w), 'el reloj nuevo no se sube solo');
  for (const f of ['infra/reloj-cloudflare/worker.mjs', 'infra/reloj-cloudflare/wrangler.toml']) assert.ok(!/ghp_|github_pat_|Bearer [A-Za-z0-9_]{20,}/.test(leer(f)), f);
});

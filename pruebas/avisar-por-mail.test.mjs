// Regla 173 (15/10/2026): los avisos de GitHub salen por MAIL (Worker de Cloudflare, POST /avisar) y WhatsApp queda de respaldo. Sin red:
// el fetch y el envío de WhatsApp se reemplazan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { avisarPorMail, avisar, asuntoDe, hayMail, hayWhatsApp, AVISOS_URL } from '../redes/avisar-por-mail.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const TOKEN = 'token-secreto-del-vigilante-123';
const ENV = { VIGILANTE_TOKEN: TOKEN };
const ENV_CON_WHATSAPP = { VIGILANTE_TOKEN: TOKEN, WHATSAPP_TELEFONO: '5492266123456', WHATSAPP_APIKEY: 'clave-callmebot-987' };

/** Un fetch que anota los pedidos y contesta lo que se le diga. */
function fetchQue(estado, cuerpo) {
  const pedidos = [];
  const fn = async (url, opciones) => {
    pedidos.push({ url, ...opciones, json: opciones?.body ? JSON.parse(opciones.body) : null });
    return new Response(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo), { status: estado });
  };
  fn.pedidos = pedidos;
  return fn;
}
const whatsappQue = (resultado) => {
  const llamadas = [];
  const fn = async (a) => { llamadas.push(a); if (resultado instanceof Error) throw resultado; return resultado; };
  fn.llamadas = llamadas;
  return fn;
};

// ---------------------------------------------------------------- el pedido

test('avisarPorMail: POST al Worker con el token SÓLO en el encabezado x-token y el asunto, el texto, la clave y el nivel en el cuerpo', async () => {
  const f = fetchQue(200, { ok: true, para: 'radarbalcarce@gmail.com' });
  const r = await avisarPorMail({ asunto: 'Hay un problema: la web', texto: 'La web no anda', clave: 'web-vieja', nivel: 'alta' }, { fetchFn: f, env: ENV });
  assert.deepEqual(r, { ok: true });
  assert.equal(f.pedidos.length, 1);
  const p = f.pedidos[0];
  assert.equal(p.url, AVISOS_URL);
  assert.equal(p.url, 'https://radar-balcarce-vigilante.radarbalcarce.workers.dev/avisar');
  assert.equal(p.method, 'POST');
  assert.equal(p.headers['x-token'], TOKEN);
  assert.ok(!String(p.url).includes(TOKEN) && !p.body.includes(TOKEN), 'el token no viaja en la dirección ni en el cuerpo');
  assert.deepEqual(p.json, { asunto: 'Hay un problema: la web', texto: 'La web no anda', clave: 'web-vieja', nivel: 'alta' });
  assert.ok(p.signal, 'tiene tope de espera');
});

test('avisarPorMail: sin asunto lo saca de la primera línea; sin clave ni nivel no los manda; AVISOS_URL cambia la dirección (sólo https)', async () => {
  const f = fetchQue(200, { ok: true });
  await avisarPorMail({ texto: '⚠️ Radar Balcarce: hay un problema\n\n• La web no anda' }, { fetchFn: f, env: { ...ENV, AVISOS_URL: 'https://otro.example.com/avisar' } });
  assert.equal(f.pedidos[0].url, 'https://otro.example.com/avisar');
  assert.deepEqual(f.pedidos[0].json, { asunto: 'hay un problema', texto: '⚠️ Radar Balcarce: hay un problema\n\n• La web no anda' });
  const g = fetchQue(200, { ok: true });
  const r = await avisarPorMail({ texto: 'x' }, { fetchFn: g, env: { ...ENV, AVISOS_URL: 'http://inseguro.example.com/avisar' } });
  assert.equal(r.ok, false);
  assert.equal(g.pedidos.length, 0, 'el token no sale por http');
});

test('asuntoDe: la primera línea con algo, sin emojis, sin el "Radar Balcarce" suelto de la cabecera y cortada en palabra entera', () => {
  assert.equal(asuntoDe('⚠️ Radar Balcarce: hay un problema\n\n• x'), 'hay un problema');
  assert.equal(asuntoDe('ℹ️ Radar Balcarce: para mirar\n\n• x'), 'para mirar');
  assert.equal(asuntoDe('✅ Radar Balcarce: todo bien. Resumen del día\n\n• x'), 'todo bien. Resumen del día');
  assert.equal(asuntoDe('Radar Balcarce\n\n📣 Salió en redes:\n• 10:00 Algo'), 'Salió en redes');
  assert.equal(asuntoDe('🟡 3 nota(s) esperando a una persona:\n• x'), '3 nota(s) esperando a una persona');
  assert.equal(asuntoDe(''), 'Aviso');
  assert.equal(asuntoDe('🚨🚨'), 'Aviso');
  const largo = asuntoDe(`${'palabra '.repeat(40)}final`);
  assert.ok(largo.length <= 110 && largo.endsWith('…'));
});

// ---------------------------------------------------------------- lo que sale mal: nunca tira, nunca muestra el token

test('avisarPorMail: 401, 503, 429, 500 y respuestas raras dan ok:false con el motivo, sin el token', async () => {
  for (const [estado, cuerpo, esperado] of [
    [401, { ok: false, error: 'No autorizado.' }, /HTTP 401.*No autorizado/],
    [503, { ok: false, error: 'El Worker no tiene cargado VIGILANTE_TOKEN.' }, /HTTP 503/],
    [429, { ok: false, error: 'Demasiados avisos en esta hora' }, /HTTP 429/],
    [500, 'Internal Server Error', /HTTP 500/],
    [200, 'esto no es json', /ilegible/],
    [200, { ok: false }, /ilegible/],
  ]) {
    const r = await avisarPorMail({ texto: 'hola' }, { fetchFn: fetchQue(estado, cuerpo), env: ENV });
    assert.equal(r.ok, false, `${estado}`);
    assert.match(r.motivo, esperado);
    assert.ok(!r.motivo.includes(TOKEN));
  }
});

test('avisarPorMail: si el fetch tira (timeout, red caída) no tira: ok:false y un motivo sin el token', async () => {
  const tiempo = Object.assign(new Error('The operation timed out'), { name: 'TimeoutError' });
  let r = await avisarPorMail({ texto: 'hola' }, { fetchFn: async () => { throw tiempo; }, env: ENV });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /no contestó a tiempo/);
  r = await avisarPorMail({ texto: 'hola' }, { fetchFn: async () => { throw new Error(`fallo con ${TOKEN} adentro`); }, env: ENV });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /no se pudo llegar/);
  assert.ok(!r.motivo.includes(TOKEN), 'si el error trae el token, se tapa');
});

test('avisarPorMail: sin token no llama a nadie; sin texto tampoco', async () => {
  const f = fetchQue(200, { ok: true });
  assert.deepEqual(await avisarPorMail({ texto: 'hola' }, { fetchFn: f, env: {} }), { ok: false, motivo: 'no hay VIGILANTE_TOKEN' });
  assert.deepEqual(await avisarPorMail({ texto: 'hola' }, { fetchFn: f, env: { VIGILANTE_TOKEN: '   ' } }), { ok: false, motivo: 'no hay VIGILANTE_TOKEN' });
  assert.equal((await avisarPorMail({ texto: '  ' }, { fetchFn: f, env: ENV })).ok, false);
  assert.equal(f.pedidos.length, 0);
});

test('avisarPorMail: una clave que el Worker ya mandó hace poco (repetido) cuenta como bien', async () => {
  const r = await avisarPorMail({ texto: 'hola', clave: 'k' }, { fetchFn: fetchQue(200, { ok: true, repetido: true }), env: ENV });
  assert.deepEqual(r, { ok: true, repetido: true });
});

// ---------------------------------------------------------------- avisar: mail primero, WhatsApp de respaldo

test('avisar: si el mail sale, WhatsApp ni se toca', async () => {
  const wa = whatsappQue({ ok: true });
  const r = await avisar({ texto: 'hola', nivel: 'info' }, { fetchFn: fetchQue(200, { ok: true }), env: ENV_CON_WHATSAPP, whatsappFn: wa });
  assert.equal(r.ok, true);
  assert.equal(r.via, 'mail');
  assert.equal(wa.llamadas.length, 0);
});

test('avisar: con el Worker en 401 o 503 o sin contestar, cae a WhatsApp con el mismo texto', async () => {
  const intentos = [
    fetchQue(401, { ok: false, error: 'No autorizado.' }),
    fetchQue(503, { ok: false, error: 'sin token' }),
    async () => { throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }); },
  ];
  for (const f of intentos) {
    const wa = whatsappQue({ ok: true });
    const r = await avisar({ texto: 'el texto del aviso', nivel: 'alta' }, { fetchFn: f, env: ENV_CON_WHATSAPP, whatsappFn: wa });
    assert.equal(r.ok, true);
    assert.equal(r.via, 'whatsapp');
    assert.match(r.motivo, /^mail: /, 'queda anotado por qué el mail no salió');
    assert.equal(wa.llamadas.length, 1);
    assert.equal(wa.llamadas[0].texto, 'el texto del aviso');
    assert.equal(wa.llamadas[0].telefono, '5492266123456');
    assert.equal(wa.llamadas[0].apikey, 'clave-callmebot-987');
  }
});

test('avisar: sin VIGILANTE_TOKEN va directo a WhatsApp, sin tocar la red del mail', async () => {
  const f = fetchQue(200, { ok: true });
  const wa = whatsappQue({ ok: true });
  const { VIGILANTE_TOKEN, ...sinToken } = ENV_CON_WHATSAPP;
  const r = await avisar({ texto: 'hola' }, { fetchFn: f, env: sinToken, whatsappFn: wa });
  assert.equal(r.via, 'whatsapp');
  assert.equal(f.pedidos.length, 0);
  assert.equal(wa.llamadas.length, 1);
});

test('avisar: si fallan los dos, ok:false con los dos motivos y sin ninguna clave; si WhatsApp tira, tampoco tira', async () => {
  let r = await avisar({ texto: 'hola' }, {
    fetchFn: fetchQue(503, { ok: false }), env: ENV_CON_WHATSAPP,
    whatsappFn: whatsappQue({ ok: false, error: 'HTTP 203 APIKey is invalid clave-callmebot-987' }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.via, null);
  assert.match(r.motivo, /mail: .*503/);
  assert.match(r.motivo, /WhatsApp: .*invalid/);
  for (const secreto of [TOKEN, 'clave-callmebot-987', '5492266123456']) assert.ok(!r.motivo.includes(secreto), `el motivo no muestra ${secreto}`);

  r = await avisar({ texto: 'hola' }, { fetchFn: fetchQue(503, { ok: false }), env: ENV_CON_WHATSAPP, whatsappFn: whatsappQue(new Error('se cayó 5492266123456')) });
  assert.equal(r.ok, false);
  assert.ok(!r.motivo.includes('5492266123456'));
});

test('avisar: sin mail y sin WhatsApp configurados no hace nada y lo dice', async () => {
  const wa = whatsappQue({ ok: true });
  const f = fetchQue(200, { ok: true });
  const r = await avisar({ texto: 'hola' }, { fetchFn: f, env: {}, whatsappFn: wa });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /VIGILANTE_TOKEN/);
  assert.match(r.motivo, /WHATSAPP_TELEFONO/);
  assert.equal(f.pedidos.length + wa.llamadas.length, 0);
});

test('avisar: la clave y el nivel llegan tal cual al Worker (la clave es la del dedupe de 6 horas)', async () => {
  const f = fetchQue(200, { ok: true });
  await avisar({ asunto: 'Auditoría semanal', texto: 'x', clave: 'auditoria-semanal', nivel: 'media' }, { fetchFn: f, env: ENV });
  assert.deepEqual(f.pedidos[0].json, { asunto: 'Auditoría semanal', texto: 'x', clave: 'auditoria-semanal', nivel: 'media' });
});

test('hayMail y hayWhatsApp miran las variables de entorno', () => {
  assert.equal(hayMail({ VIGILANTE_TOKEN: 'x' }), true);
  assert.equal(hayMail({}), false);
  assert.equal(hayWhatsApp({ WHATSAPP_TELEFONO: '1', WHATSAPP_APIKEY: 'k' }), true);
  assert.equal(hayWhatsApp({ WHATSAPP_TELEFONO: '1' }), false);
});

// ---------------------------------------------------------------- lo cableado

test('los cuatro que avisan (vigilante, auditoría semanal, auditoría con IA, pistas) usan `avisar` y ya no llaman a enviarWhatsApp directo', () => {
  for (const f of ['redes/vigilar.mjs', 'redes/auditar.mjs', 'redes/auditar-notas.mjs', 'panel/revisar-pistas.mjs']) {
    const s = leer(f);
    assert.match(s, /from '(\.\/|\.\.\/redes\/)avisar-por-mail\.mjs'/, f);
    assert.ok(!/enviarWhatsApp\(/.test(s), `${f} llama a enviarWhatsApp directo`);
    assert.match(s, /\bavisar\(/, f);
  }
});

test('los workflows que avisan le pasan VIGILANTE_TOKEN (y conservan los de WhatsApp, que son el respaldo)', () => {
  for (const w of ['vigilancia', 'auditoria', 'auditoria-ia', 'pistas']) {
    const s = leer(`.github/workflows/${w}.yml`);
    assert.match(s, /VIGILANTE_TOKEN: \$\{\{ secrets\.VIGILANTE_TOKEN \}\}/, w);
    assert.match(s, /WHATSAPP_APIKEY: \$\{\{ secrets\.WHATSAPP_APIKEY \}\}/, w);
  }
});

test('el módulo no importa nada de afuera de Node (sólo whatsapp.mjs) y el código de WhatsApp sigue', () => {
  const s = leer('redes/avisar-por-mail.mjs');
  assert.deepEqual([...s.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]), ['./whatsapp.mjs']);
  assert.ok(fs.existsSync(new URL('../redes/whatsapp.mjs', import.meta.url)));
});

// Regla 176 (15/10/2026): los informes diarios mandan también una versión con formato (html) por el mismo camino.
test('avisarPorMail: el html va en el cuerpo si se da (y sólo entonces); el token sigue sólo en el encabezado', async () => {
  const f = fetchQue(200, { ok: true });
  const r = await avisarPorMail({ asunto: 'Informe de la noche', texto: 'plano', html: '<p>con formato</p>', clave: 'informe-noche-2026-10-15', nivel: 'info' }, { fetchFn: f, env: ENV });
  assert.deepEqual(r, { ok: true });
  assert.deepEqual(f.pedidos[0].json, { asunto: 'Informe de la noche', texto: 'plano', html: '<p>con formato</p>', clave: 'informe-noche-2026-10-15', nivel: 'info' });
  assert.ok(!f.pedidos[0].body.includes(TOKEN));
  const g = fetchQue(200, { ok: true });
  await avisarPorMail({ asunto: 'a', texto: 'b', html: '   ' }, { fetchFn: g, env: ENV });
  assert.ok(!('html' in g.pedidos[0].json), 'un html vacío no se manda');
  const h = fetchQue(200, { ok: true, repetido: true });
  assert.deepEqual(await avisarPorMail({ asunto: 'a', texto: 'b', clave: 'k' }, { fetchFn: h, env: ENV }), { ok: true, repetido: true });
});

// La app del panel del celular (web/public/panel/): lo que escribe tiene que
// ser exactamente lo que la corrida de la web acepta, con el mismo formato que
// el resto del repositorio. Sin red: GitHub se imita con un fetch falso.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  crearCliente, SECCIONES, ARCHIVOS, comoRenglones, formatear, aBase64, deBase64,
  conDecision, sinDecision, conRedes, conCorreccion, conLlave, corridaConMarca, haceCuanto,
} from '../web/public/panel/github.js';
import { SECCIONES as DE_LA_WEB } from '../web/lib/datos.js';
import { comoRetiradasJson, correccionesAMano } from '../web/lib/archivo.js';
import { problemaDeDecision, leerDecisionesCelular } from '../panel/celular-datos.mjs';
import { leerLlaves } from '../panel/cifrado.mjs';
import { crearLlaves } from '../web/public/panel/cifrado.js';

const leer = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const CUERPO = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(' ');

test('las secciones del celular son las once de la web', () => {
  assert.deepEqual(SECCIONES, DE_LA_WEB.map((s) => s.nombre));
});

test('el celular escribe correcciones y decisiones con una nota por renglón, como el repositorio', () => {
  const json = { notas: { a: { motivo: 'x', cuando: '2026-09-29', por: 'H' }, b: { motivo: 'y', cuando: '2026-09-29', por: 'H' } } };
  assert.equal(comoRenglones(json, ['notas']), comoRetiradasJson(json));
  assert.equal(formatear(ARCHIVOS.decisiones, { notas: {}, redes: {} }), '{"notas":{},"redes":{}}\n');
  // El archivo del repositorio, reescrito por el celular, dice lo mismo y en el
  // mismo formato: una nota por renglón (si traía un id repetido, queda el último,
  // que es el que ya se usaba).
  const actual = JSON.parse(leer('web/data/correcciones.json'));
  const reescrito = formatear(ARCHIVOS.correcciones, actual);
  assert.deepEqual(JSON.parse(reescrito), actual);
  assert.equal(reescrito.split('\n').length, Object.keys(actual.notas).length + 3);
});

test('lo que arma el celular al aprobar, retirar o marcar para redes es lo que acepta la web', () => {
  let j = { notas: {}, redes: {} };
  j = conDecision(j, 'a', { estado: 'publicada', titulo: 'T', copete: 'B', cuerpo: CUERPO, deIA: true, por: 'Hernán' });
  j = conDecision(j, 'b', { estado: 'bloqueada', motivo: 'repetida', por: 'Hernán' });
  j = conDecision(j, 'c', { estado: 'descartada', motivo: 'no es de acá', por: 'Hernán' });
  j = conRedes(j, 'a', 'Hernán');
  for (const d of Object.values(j.notas)) assert.equal(problemaDeDecision(d), null);
  const leido = leerDecisionesCelular(JSON.parse(formatear(ARCHIVOS.decisiones, j)));
  assert.deepEqual(Object.keys(leido.notas), ['a', 'b', 'c']);
  assert.deepEqual(Object.keys(leido.redes), ['a']);
  assert.deepEqual(Object.keys(sinDecision(j, 'b').notas), ['a', 'c']);
  assert.deepEqual(Object.keys(conRedes(j, 'a', 'Hernán', false).redes), []);
});

test('una corrección del celular dice motivo, cuándo y quién, y la web la aplica', () => {
  let j = { notas: { a: { titulo: 'Viejo', motivo: 'antes', cuando: '2026-09-28', por: 'Claude' } } };
  j = conCorreccion(j, 'a', { seccion: 'Balcarce', cuerpo: '  ' }, { motivo: 'editada desde el celular', por: 'Hernán' });
  assert.deepEqual(j.notas.a.titulo, 'Viejo', 'lo que ya tenía se conserva');
  assert.equal(j.notas.a.seccion, 'Balcarce');
  assert.ok(!('cuerpo' in j.notas.a), 'un campo vacío no pisa nada');
  assert.ok(j.notas.a.motivo && /^\d{4}-\d{2}-\d{2}$/.test(j.notas.a.cuando) && j.notas.a.por === 'Hernán');
  j = conCorreccion(j, 'a', { cuerpo: CUERPO }, { motivo: 'reescrita con IA', por: 'Hernán', deIA: true });
  const web = correccionesAMano(j).get('a');
  assert.equal(web.deIA, true);
  assert.equal(web.seccion, 'Balcarce');
});

test('la llave pública del celular se registra una sola vez y la lee la corrida de la web', async () => {
  const celular = await crearLlaves();
  let j = conLlave({ llaves: [] }, { nombre: 'Celular de Hernán', publica: celular.publica, huella: celular.huella });
  j = conLlave(j, { nombre: 'Celular de Hernán', publica: celular.publica, huella: celular.huella });
  assert.equal(j.llaves.length, 1);
  assert.equal(leerLlaves(j)[0].huella, celular.huella);
});

test('base64 con tildes y eñes, ida y vuelta', () => {
  const t = 'Napaleofú, señal, información — "comillas"';
  assert.equal(deBase64(aBase64(t)), t);
  assert.equal(Buffer.from(aBase64(t), 'base64').toString('utf8'), t);
});

test('el cliente lee un archivo chico y uno de más de 1 MB, y reintenta si otro lo cambió en el medio', async () => {
  const pedidos = [];
  let versiones = 0;
  const fetchFn = async (url, init = {}) => {
    pedidos.push(`${init.method ?? 'GET'} ${url.replace('https://api.github.com', '')}`);
    if (url.includes('archivo.json') && init.headers.accept.includes('raw')) return new Response('{"notas":[1]}', { status: 200 });
    if (url.includes('archivo.json')) return new Response(JSON.stringify({ sha: 's', encoding: 'none', content: '' }), { status: 200 });
    if (init.method === 'PUT') {
      versiones += 1;
      return versiones === 1 ? new Response('{"message":"conflict"}', { status: 409 }) : new Response('{}', { status: 200 });
    }
    return new Response(JSON.stringify({ sha: `s${versiones}`, encoding: 'base64', content: aBase64('{"notas":{},"redes":{}}') }), { status: 200 });
  };
  const c = crearCliente({ token: 'x', fetchFn });
  assert.deepEqual((await c.leer(ARCHIVOS.archivo)).json, { notas: [1] });
  const nuevo = await c.guardar(ARCHIVOS.decisiones, (j) => conRedes(j, 'a', 'H'), 'prueba');
  assert.ok(nuevo.redes.a);
  assert.equal(pedidos.filter((p) => p.startsWith('PUT')).length, 2, 'no reintentó tras el 409');
});

test('la corrida del celular se encuentra por su marca; las fechas se dicen como en la web', () => {
  assert.equal(corridaConMarca([{ display_title: 'Panel · escribir · abc123' }, { display_title: 'otra' }], 'abc123').display_title, 'Panel · escribir · abc123');
  assert.equal(corridaConMarca([], 'x'), null);
  const ahora = Date.parse('2026-09-29T20:00:00Z');
  assert.equal(haceCuanto('2026-09-29T19:59:30Z', ahora), 'recién');
  assert.equal(haceCuanto('2026-09-29T17:00:00Z', ahora), 'hace 3 h');
  assert.equal(haceCuanto('2026-09-28T17:00:00Z', ahora), 'ayer');
});

test('la página del panel: sin nada de afuera, sin indexar, y se puede instalar', () => {
  const html = leer('web/public/panel/index.html');
  assert.ok(!/<script[^>]+src="https?:/.test(html) && !/fonts.googleapis/.test(html), 'carga algo de afuera');
  assert.ok(!/ on[a-z]+="/.test(html) && !/ on[a-z]+="/.test(leer('web/public/panel/app.js')), 'un manejador en línea lo bloquea la CSP');
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  const m = JSON.parse(leer('web/public/panel/manifest.webmanifest'));
  assert.equal(m.start_url, '/panel/');
  assert.equal(m.display, 'standalone');
  assert.ok(m.icons.some((i) => i.sizes === '512x512'));
  const cabeceras = leer('web/public/_headers');
  assert.match(cabeceras, /\/panel\/\*\r?\n\s+X-Robots-Tag: noindex, nofollow/);
  assert.match(cabeceras, /connect-src 'self' https:\/\/api\.github\.com/);
  assert.match(leer('web/app/robots.js'), /'\/panel\/'/);
});

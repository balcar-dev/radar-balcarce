// La misma noticia con dos direcciones (29/09, pendiente A1): queda una y la otra
// redirige. Y las páginas viejas que dicen "EN VIVO" en el título se retiran.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  parecido, repetidasConOtraDireccion, conFusionadas, redireccionesDeFusionadas, REPETIDAS,
} from '../web/lib/repetidas.js';
import { diceEnVivo } from '../ingesta/verificar.mjs';

const CUERPO = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(' ');
const nota = (id, titulo, fecha, o = {}) => ({ id, titulo, fecha, slug: titulo.toLowerCase().replace(/\W+/g, '-'), ...o });

test('los casos reales del 29/09 son la misma noticia; dos notas del mismo tema, no', () => {
  assert.equal(parecido('Boccanera y Baigorria ganan en el regreso del Turismo Special de la Costa al Fangio', 'Boccanera y Baigorria ganan en el regreso del Turismo Special de la Costa al Fangio'), 1);
  assert.ok(parecido('Reabre el Autódromo Juan Manuel Fangio', 'El autódromo Juan Manuel Fangio reabre sus puertas') >= REPETIDAS.umbral);
  assert.ok(parecido('Top Serrano clasifica sus seis equipos a los Play Off', 'Top Serrano clasifica sus seis equipos a los Play Off provinciales') >= REPETIDAS.umbral);
  // El mismo tema, otra noticia.
  assert.ok(parecido('Mariano Werner logra la pole de las TC Pick Up', 'Hernán Palazzo gana la final del TC Pick Up en el autódromo Fangio') < REPETIDAS.umbral);
  assert.ok(parecido('Campo de Pato gana en el Torneo Desarrollo de rugby', 'Campo de Pato disputa una doble fecha de hockey') < REPETIDAS.umbral);
  assert.equal(parecido('Reabre', 'Reabre'), 0, 'con menos de tres palabras que dicen algo no se decide');
});

test('queda la que fue a las redes; si no, la que tiene cuerpo; si no, la primera', () => {
  const a = nota('a', 'Reabre el Autódromo Juan Manuel Fangio', '2026-09-25T00:03:00Z');
  const b = nota('b', 'El autódromo Juan Manuel Fangio reabre sus puertas', '2026-09-25T08:03:00Z', { cuerpo: CUERPO });
  const c = nota('c', 'El Autódromo Juan Manuel Fangio reabre', '2026-09-27T17:29:00Z');
  assert.deepEqual([...repetidasConOtraDireccion([a, b, c])], [['a', 'b'], ['c', 'b']]);
  assert.deepEqual([...repetidasConOtraDireccion([a, b, c], { enRedes: new Set(['c']) })], [['a', 'c'], ['b', 'c']]);
  assert.deepEqual([...repetidasConOtraDireccion([a, { ...b, cuerpo: '' }])], [['b', 'a']], 'sin cuerpo en ninguna, la primera');
});

test('no se tocan las notas propias, lo que fue a las redes, ni lo que está lejos en el tiempo', () => {
  const d1 = nota('d1', 'El dólar blue cotiza a $1.560 este viernes 25', '2026-09-25T14:00:00Z', { propia: true });
  const d2 = nota('d2', 'El dólar blue cotiza a $1.560 este lunes 28', '2026-09-28T14:00:00Z', { propia: true });
  assert.equal(repetidasConOtraDireccion([d1, d2]).size, 0);
  const x = nota('x', 'Impulsan educación tributaria en secundarias', '2026-09-01T10:00:00Z');
  const y = nota('y', 'Impulsan educación tributaria en secundarias', '2026-09-20T10:00:00Z');
  assert.equal(repetidasConOtraDireccion([x, y]).size, 0, 'con semanas de diferencia puede ser otra edición');
  const r1 = nota('r1', 'Hernán Palazzo gana en el regreso del TC Pick Up', '2026-09-27T18:00:00Z', { redes: true });
  const r2 = nota('r2', 'Hernán Palazzo gana en el regreso del TC Pick Up', '2026-09-27T19:00:00Z', { redes: true });
  assert.equal(repetidasConOtraDireccion([r1, r2]).size, 0, 'las dos circulan en Facebook');
});

test('la dirección de la repetida redirige a la que queda, y se guarda con su fecha', () => {
  const porId = new Map([['a', nota('a', 'Reabre el Autódromo Juan Manuel Fangio', '2026-09-25T00:03:00Z')]]);
  const ahora = new Date('2026-09-29T20:00:00Z');
  const json = conFusionadas({ notas: { vieja: { a: 'q', ruta: '/nota/x-vieja', cuando: '2026-01-01T00:00:00Z' } } }, new Map([['a', 'b']]), porId, ahora);
  assert.deepEqual(Object.keys(json.notas), ['a'], 'las de más de 180 días se van');
  assert.equal(json.notas.a.ruta, '/nota/reabre-el-aut-dromo-juan-manuel-fangio-a');
  const r = redireccionesDeFusionadas(json, (id) => (id === 'b' ? '/nota/el-autodromo-reabre-b' : null));
  assert.deepEqual(r, [
    { origen: '/nota/reabre-el-aut-dromo-juan-manuel-fangio-a', destino: '/nota/el-autodromo-reabre-b' },
    { origen: '/nota/a', destino: '/nota/el-autodromo-reabre-b' },
  ]);
  assert.deepEqual(redireccionesDeFusionadas(json, () => null), [], 'si la que queda ya no tiene página, no se redirige');
});

test('"EN VIVO" y "minuto a minuto" en el título se retiran; "música en vivo", no', () => {
  assert.ok(diceEnVivo('Dólar hoy y dólar blue, EN VIVO: a cuánto cotiza'));
  assert.ok(diceEnVivo('Minuto a minuto en vivo de San Lorenzo vs. Boca'));
  assert.ok(diceEnVivo('A qué hora habla Javier Milei en la ONU y cómo verlo en vivo'));
  assert.ok(!diceEnVivo('Una noche de música en vivo en el Teatro'));
  assert.ok(!diceEnVivo('Reabre el Autódromo Juan Manuel Fangio'));
  const datos = fs.readFileSync(new URL('../web/scripts/generar-datos.mjs', import.meta.url), 'utf8');
  assert.match(datos, /!decisionHumana\(d\) && diceEnVivo\(/);
  assert.match(fs.readFileSync(new URL('../.github/workflows/actualizar.yml', import.meta.url), 'utf8'), /web\/data\/fusionadas\.json/);
});

// ------------------------------------------- las repetidas con otras palabras (1/10/2026)

test('las parejas sospechosas: la Cooperativa y el RENAPER del 1/10, sí; dos notas distintas del mismo tema o de otra sección, no', async () => {
  const { parejasSospechosas, clavePareja } = await import('../web/lib/repetidas.js');
  const n = (id, titulo, seccion = 'Balcarce', fecha = '2026-10-01T16:00:00Z') => ({ id, titulo, seccion, fecha });
  const notas = [
    n('alddw5', 'La Cooperativa de Electricidad corta el suministro el viernes'),
    n('o1vynh', 'La Cooperativa corta la luz el viernes en un sector'),
    n('1vmovug', 'El RENAPER instala un móvil de documentación'),
    n('1dbyjp1', 'El RENAPER instala un móvil en Balcarce para tramitar DNI'),
    n('x1', 'Mariano Werner logra la pole de las TC Pick Up', 'Automovilismo'),
    n('x2', 'Mariano Werner gana la carrera de las TC Pick Up', 'Automovilismo', '2026-09-20T16:00:00Z'),
    n('y1', 'La Cooperativa corta la luz el viernes en un sector', 'Política'),
  ];
  const claves = parejasSospechosas(notas).map((p) => p.clave).sort();
  assert.deepEqual(claves, [clavePareja('alddw5', 'o1vynh'), clavePareja('1dbyjp1', '1vmovug')].sort());
  // Lo ya decidido no se vuelve a preguntar, ni siquiera si la respuesta fue "no".
  const decididas = { [clavePareja('alddw5', 'o1vynh')]: false };
  assert.deepEqual(parejasSospechosas(notas, { decididas }).map((p) => p.clave), [clavePareja('1dbyjp1', '1vmovug')]);
  // Las propias no entran, y las que ya son la misma por título las junta la regla de siempre.
  assert.deepEqual(parejasSospechosas([n('p1', 'La Cooperativa corta la luz', 'Balcarce'), { ...n('p2', 'La Cooperativa corta la luz el viernes'), propia: true }]), []);
});

test('una pareja confirmada por la IA se fusiona aunque los títulos no se parezcan; queda la que tiene foto', async () => {
  const { repetidasConOtraDireccion, clavePareja } = await import('../web/lib/repetidas.js');
  const notas = [
    { id: 'a', titulo: 'La Cooperativa corta la luz el viernes en un sector', fecha: '2026-10-01T16:15:00Z', cuerpo: 'palabra '.repeat(90) },
    { id: 'b', titulo: 'La Cooperativa de Electricidad corta el suministro el viernes', fecha: '2026-10-01T16:05:00Z', cuerpo: 'palabra '.repeat(90) },
  ];
  assert.equal(repetidasConOtraDireccion(notas).size, 0, 'sin la IA, los títulos no alcanzan');
  const f = repetidasConOtraDireccion(notas, { confirmadas: [['a', 'b']] });
  assert.equal(f.size, 1);
  assert.equal(f.get('a'), 'b', 'queda la primera que salió');
  const conFoto = repetidasConOtraDireccion(notas, { confirmadas: [['a', 'b']], conFoto: new Set(['a']) });
  assert.equal(conFoto.get('b'), 'a', 'pero si la otra tiene foto, queda la de la foto');
  assert.ok(clavePareja('a', 'b') === clavePareja('b', 'a'));
});

test('las fuentes de las dos notas se suman, para buscar la foto en todas (1/10)', async () => {
  const { sumarFuentesDeParejas } = await import('../web/lib/repetidas.js');
  const a = { id: 'a', medios: ['Gabal'], fuentesConsultadas: [{ medio: 'Gabal', enlace: 'https://g/1' }] };
  const b = { id: 'b', medios: ['Infórmese'], fuentesConsultadas: [{ medio: 'Infórmese', enlace: 'https://i/1' }, { medio: 'Gabal', enlace: 'https://g/1' }] };
  sumarFuentesDeParejas([a, b, { id: 'c', medios: ['Otro'] }], [['a', 'b']]);
  assert.deepEqual(a.medios.sort(), ['Gabal', 'Infórmese']);
  assert.deepEqual(a.fuentesConsultadas.map((f) => f.enlace), ['https://g/1', 'https://i/1']);
  assert.deepEqual(b.fuentesConsultadas.map((f) => f.enlace), ['https://i/1', 'https://g/1']);
});

test('confirmarParejas: Gemini primero, Groq si falla, y sólo vale lo que contesta con una clave que se le dio', async () => {
  const { confirmarParejas, leerRespuestaDeParejas } = await import('../ingesta/lectura-ia.mjs');
  const parejas = [{ clave: 'a|b', a: { titulo: 'A', fecha: 'x' }, b: { titulo: 'B', fecha: 'y' } }, { clave: 'c|d', a: { titulo: 'C' }, b: { titulo: 'D' } }];
  const llamadas = [];
  const gemini = (cuerpo) => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(cuerpo) }] } }] }) });
  const fetchOk = async (url) => { llamadas.push(url); return gemini({ pares: [{ clave: 'a|b', mismo: true }, { clave: 'c|d', mismo: false }, { clave: 'inventada', mismo: true }] }); };
  assert.deepEqual(await confirmarParejas(parejas, { clave: 'K', fetchFn: fetchOk }), { 'a|b': true, 'c|d': false });
  assert.match(llamadas[0], /generativelanguage/);
  // Gemini sin cupo: pasa a Groq con gpt-oss-20b y la clave en el encabezado, no en la dirección.
  const pedidos = [];
  const fetchCaido = async (url, init) => {
    pedidos.push({ url, init });
    if (/generativelanguage/.test(url)) return { ok: false, status: 429 };
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ pares: [{ clave: 'a|b', mismo: true }] }) } }] }) };
  };
  assert.deepEqual(await confirmarParejas(parejas, { clave: 'K', claveRespaldo: 'G', fetchFn: fetchCaido }), { 'a|b': true });
  const groq = pedidos.find((p) => /groq/.test(p.url));
  assert.match(groq.init.body, /openai\/gpt-oss-20b/);
  assert.equal(groq.init.headers.authorization, 'Bearer G');
  assert.ok(!groq.url.includes('G'), 'la clave no va en la dirección');
  // Sin respaldo y con Gemini caído, lanza; la respuesta rota también.
  await assert.rejects(() => confirmarParejas(parejas, { clave: 'K', fetchFn: async () => ({ ok: false, status: 503 }) }), /503/);
  assert.throws(() => leerRespuestaDeParejas('esto no es json', new Set()), /no es JSON/);
  assert.deepEqual(await confirmarParejas([], {}), {});
});

test('generar-datos pregunta por las parejas sospechosas y las fusiona, sin gastar de más', () => {
  const g = fs.readFileSync(path.join(import.meta.dirname, '..', 'web/scripts/generar-datos.mjs'), 'utf8');
  assert.match(g, /parejasSospechosas\(pool, \{ decididas: guardadas \}\)/);
  assert.match(g, /pedidosHoy < 40/);
  // Se pregunta con los títulos ya escritos (después de armar las notas) y justo antes de fusionar.
  assert.ok(g.indexOf('parejasSospechosas(pool') > g.indexOf('const conPaginaHoy') && g.indexOf('parejasSospechosas(pool') < g.indexOf('const fusion = repetidasConOtraDireccion('));
  assert.match(g, /confirmadas: parejasConfirmadas/);
  assert.match(g, /sumarFuentesDeParejas\(deLaIngesta, parejasConfirmadas\)/);
});

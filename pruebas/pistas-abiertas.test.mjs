// Las pistas quedan abiertas (2/10/2026, Hernán: "que yo te tire datos o links, que quede abierta la investigación y ver si aparece en
// algún medio, tengamos o no la fuente"): se guardan, se vuelven a mirar solas cada tres horas y avisan si hay novedades.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { enriquecerConEnlaces, revisarPista, rangoDeNivel, PISTA } from '../ingesta/pistas.mjs';
import {
  conPista, pistasParaRevisar, conRevision, sinNovedad, conEstado, podar, comoRenglones, avisoDePistas, PISTAS_ABIERTAS,
} from '../panel/pistas-libro.mjs';
import { pasadaDePistas } from '../panel/revisar-pistas.mjs';
import { crearLlaves, abrir } from '../web/public/panel/cifrado.js';
import { cerrar } from '../panel/cifrado.mjs';
import { htmlDeLista, htmlDeUnaPista } from '../web/public/panel/pistas.js';
import { conPistaSinNovedad, conPistaEstado, formatear, ARCHIVOS } from '../web/public/panel/github.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const AHORA = new Date('2026-10-03T15:00:00Z');
const hace = (dias) => new Date(AHORA - dias * 864e5);
const SOBRE = { para: [], iv: 'x', datos: 'y' };
const informe = (extra = {}) => ({
  ok: true, afirmacion: 'Cierra la fábrica de Balcarce', consultas: ['cierra fábrica Balcarce'], nivel: 'sin-cobertura', total: 0, medios: [], nuestras: [], ...extra,
});
const medios = (...n) => n.map((m) => ({ medio: m, titulo: `Cierra la fábrica de Balcarce - ${m}`, fecha: '2026-10-03T12:00:00Z' }));

test('una pista nueva queda abierta, con lo que se va a vigilar y el informe cifrado aparte', () => {
  const libro = conPista({}, 'pista1', { texto: 'Cierra la fábrica de Balcarce', informe: informe(), sobre: SOBRE, ahora: AHORA });
  const p = libro.pistas.pista1;
  assert.equal(p.estado, 'abierta');
  assert.deepEqual(p.consultas, ['cierra fábrica Balcarce']);
  assert.equal(p.nivel, 'sin-cobertura');
  assert.equal(p.novedad, false);
  assert.equal(p.sobre, SOBRE);
  assert.equal(p.historial.length, 1);
  assert.deepEqual(pistasParaRevisar(libro, AHORA), ['pista1']);
});

test('cada tres horas se miran las abiertas de menos de 14 días; las archivadas y las viejas, no', () => {
  let libro = conPista({}, 'a', { texto: 't', informe: informe(), sobre: SOBRE, ahora: hace(1) });
  libro = conPista(libro, 'b', { texto: 't', informe: informe(), sobre: SOBRE, ahora: hace(20) });
  libro = conPista(libro, 'c', { texto: 't', informe: informe(), sobre: SOBRE, ahora: hace(2) });
  libro = conEstado(libro, 'c', 'archivada', AHORA);
  assert.deepEqual(pistasParaRevisar(libro, AHORA), ['a']);
  assert.equal(podar(libro, AHORA).pistas.b.estado, 'vencida', 'a los 14 días queda vencida');
  assert.equal(conEstado(libro, 'c', 'abierta', AHORA).pistas.c.estado, 'abierta');
  assert.equal(conEstado(libro, 'c', 'cualquiera', AHORA), libro, 'un estado raro no cambia nada');
});

test('lo archivado o vencido se va a los 30 días y nunca hay más de 40', () => {
  let libro = conPista({}, 'vieja', { texto: 't', informe: informe(), sobre: SOBRE, ahora: hace(60) });
  libro = podar(libro, AHORA);
  assert.deepEqual(Object.keys(libro.pistas), [], 'abierta hace 60 días: vencida y después de 30 días más, se va');
  let muchas = {};
  for (let i = 0; i < PISTAS_ABIERTAS.maximo + 5; i += 1) muchas = conPista(muchas, `p${i}`, { texto: 't', informe: informe(), sobre: SOBRE, ahora: new Date(AHORA - i * 60e3) });
  assert.equal(Object.keys(muchas.pistas).length, PISTAS_ABIERTAS.maximo);
  assert.ok('p0' in muchas.pistas, 'quedan las más nuevas');
});

test('volver a mirar: si la cobertura sube de nivel hay novedad y se reemplaza el informe; si no, el celular sigue con el que tenía', () => {
  const libro = conPista({}, 'p', { texto: 't', informe: informe({ nivel: 'un-medio', total: 1, medios: medios('Medio A') }), sobre: SOBRE, ahora: hace(1) });
  const nuevoSobre = { para: [], iv: 'nuevo', datos: 'nuevo' };
  const igual = conRevision(libro, 'p', { informe: informe({ nivel: 'un-medio', total: 1, medios: medios('Medio A') }), sobre: nuevoSobre, novedad: false, ahora: AHORA });
  assert.equal(igual.pistas.p.sobre, SOBRE, 'sin cambios no se reemplaza el informe (conserva sus matices)');
  assert.equal(igual.pistas.p.novedad, false);
  assert.equal(igual.pistas.p.ultimaRevision, AHORA.toISOString(), 'pero sí la fecha de la mirada');
  const sube = conRevision(libro, 'p', { informe: informe({ nivel: 'cubierta', total: 3, medios: medios('Medio A', 'Medio B', 'Medio C') }), sobre: nuevoSobre, novedad: true, ahora: AHORA });
  assert.equal(sube.pistas.p.sobre, nuevoSobre);
  assert.equal(sube.pistas.p.novedad, true);
  assert.equal(sube.pistas.p.total, 3);
  assert.deepEqual(sube.pistas.p.mediosVistos, ['Medio A', 'Medio B', 'Medio C']);
  assert.equal(sube.pistas.p.historial.length, 2);
  assert.equal(sinNovedad(sube, 'p').pistas.p.novedad, false);
  assert.equal(conRevision(libro, 'no-existe', { informe: informe(), ahora: AHORA }), libro);
});

test('revisarPista: sube de nivel con más medios, o ya la publicamos nosotros; sólo ahí gasta IA', async () => {
  const pista = { texto: 't', afirmacion: 'Cierra la fábrica de Balcarce', consultas: ['cierra fábrica Balcarce'], nivel: 'un-medio', total: 1, mediosVistos: ['Medio A'], teniamos: false };
  const buscarN = (n) => async () => medios(...['Medio A', 'Medio B', 'Medio C', 'Medio D', 'Medio E'].slice(0, n));
  let pedidosDeIA = 0;
  const fetchFn = async () => { pedidosDeIA += 1; return { ok: false, status: 500 }; };
  const igual = await revisarPista(pista, { buscar: buscarN(1), fetchFn });
  assert.equal(igual.novedad, false);
  assert.equal(igual.informe.matices, null);
  const sube = await revisarPista(pista, { buscar: buscarN(3), fetchFn, clave: 'x' });
  assert.equal(sube.subio, true);
  assert.equal(sube.novedad, true);
  assert.equal(sube.informe.nivel, 'cubierta');
  assert.deepEqual(sube.nuevosMedios, ['Medio B', 'Medio C']);
  assert.match(sube.motivo, /ahora la cubren 3 medios/);
  assert.ok(pedidosDeIA >= 1, 'los matices (IA) sólo cuando subió');
  const tenemos = await revisarPista(pista, { buscar: buscarN(1), fetchFn, notas: [{ titulo: 'Cierra la fábrica de Balcarce y despide gente', copete: '', ruta: '/nota/x' }] });
  assert.equal(tenemos.novedad, true);
  assert.equal(tenemos.motivo, 'ya la publicamos nosotros');
  assert.ok(rangoDeNivel('muy-cubierta') > rangoDeNivel('cubierta') && rangoDeNivel('cubierta') > rangoDeNivel('un-medio') && rangoDeNivel('un-medio') > rangoDeNivel('sin-cobertura'));
  assert.ok(PISTA.cubierta === 2);
});

test('una pasada mira las abiertas, deja el informe nuevo cifrado para el celular y junta las novedades para el WhatsApp', async () => {
  const celular = await crearLlaves();
  const llaves = [{ nombre: 'Celular de prueba', publica: celular.publica, huella: celular.huella }];
  let libro = conPista({}, 'abierta', { texto: 'Cierra la fábrica de Balcarce', informe: informe({ nivel: 'un-medio', total: 1, medios: medios('Medio A') }), sobre: SOBRE, ahora: hace(1) });
  libro = conPista(libro, 'quieta', { texto: 'Otra cosa distinta que nadie cubre', informe: informe({ afirmacion: 'Otra cosa', consultas: ['otra cosa'] }), sobre: SOBRE, ahora: hace(1) });
  const buscar = async (c) => (c.includes('fábrica') ? medios('Medio A', 'Medio B', 'Medio C') : []);
  const r = await pasadaDePistas({ libro, llaves, buscar, fetchFn: async () => ({ ok: false, status: 500 }), ahora: AHORA });
  assert.deepEqual(r.revisadas.sort(), ['abierta', 'quieta']);
  assert.deepEqual(r.novedades.map((n) => n.id), ['abierta']);
  assert.equal(r.libro.pistas.abierta.novedad, true);
  assert.equal(r.libro.pistas.quieta.novedad, false);
  assert.equal(r.libro.pistas.quieta.sobre, SOBRE, 'sin novedades, el sobre no se toca');
  const abierto = await abrir(r.libro.pistas.abierta.sobre, celular);
  assert.equal(abierto.total, 3, 'el informe nuevo lo abre el celular registrado');
  assert.equal(abierto.nivel, 'cubierta');
  // Una sola pista, la que se pide.
  const sola = await pasadaDePistas({ libro, llaves, buscar, fetchFn: async () => ({ ok: false, status: 500 }), ahora: AHORA, solo: 'quieta' });
  assert.deepEqual(sola.revisadas, ['quieta']);
  assert.ok(cerrar);
});

test('el aviso de WhatsApp es corto y no lleva el texto de la pista', () => {
  assert.equal(avisoDePistas([]), '');
  const t = avisoDePistas([{ id: 'a', afirmacion: 'Cierra la fábrica de Balcarce', motivo: 'ahora la cubren 3 medios' }]);
  assert.match(t, /una pista tiene novedades/);
  assert.match(t, /Mirá la pestaña Pistas del panel/);
  assert.match(avisoDePistas([{ afirmacion: 'a', motivo: 'm' }, { afirmacion: 'b', motivo: 'm' }]), /2 pistas tienen novedades/);
});

test('un enlace se enriquece con el título y la bajada de la página; los de redes no se leen; no se sigue una dirección de adentro', async () => {
  const html = '<head><title>Título viejo</title><meta property="og:title" content="Cierra la fábrica &amp; despiden gente"><meta name="description" content="La empresa anunció el cierre."></head>';
  const pedidos = [];
  const fetchFn = async (u) => { pedidos.push(u); return { ok: true, status: 200, text: async () => html }; };
  const r = await enriquecerConEnlaces('Mirá esto https://medio.com.ar/nota/1 y https://x.com/alguien/status/1 y http://localhost/a y http://192.168.0.1/b', { fetchFn });
  assert.deepEqual(pedidos, ['https://medio.com.ar/nota/1'], 'sólo la página pública');
  assert.deepEqual(r.noLeidos, ['x.com']);
  assert.match(r.texto, /Enlace: Cierra la fábrica & despiden gente — La empresa anunció el cierre\./);
  assert.ok(r.texto.startsWith('Mirá esto'));
  assert.deepEqual((await enriquecerConEnlaces('sin enlaces', { fetchFn })).noLeidos, []);
});

test('el panel: la lista pone las novedades arriba, escapa lo que viene de afuera y cada pista tiene sus botones', () => {
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const apps = { esc, haceCuanto: () => 'hace 1 h', chip: (s) => `<chip>${s}</chip>` };
  const libro = { pistas: {
    a: { estado: 'abierta', creada: '2026-10-03T10:00:00Z', afirmacion: 'Sin novedad', total: 0, ultimaRevision: '2026-10-03T12:00:00Z', novedad: false },
    b: { estado: 'abierta', creada: '2026-10-02T10:00:00Z', afirmacion: 'Con <b>novedad</b>', total: 3, ultimaRevision: '2026-10-03T12:00:00Z', novedad: true, teniamos: true },
    c: { estado: 'archivada', creada: '2026-10-01T10:00:00Z', afirmacion: 'Vieja', total: 1, ultimaRevision: '2026-10-02T12:00:00Z', novedad: false },
  } };
  const h = htmlDeLista(libro, apps);
  assert.ok(h.indexOf('novedad') < h.indexOf('Sin novedad'), 'la que tiene novedad, primero');
  assert.ok(!h.includes('<b>novedad</b>'), 'se escapa');
  assert.match(h, /Abiertas \(2\)/);
  assert.match(h, /Archivadas y vencidas \(1\)/);
  assert.match(h, /3 medios/);
  assert.match(h, /ya la tenemos nosotros/);
  assert.match(htmlDeLista({ pistas: {} }, apps), /Todavía no hay pistas guardadas/);
  const una = htmlDeUnaPista({ id: 'b', pista: { ...libro.pistas.b, historial: [{ cuando: '2026-10-02T10:00:00Z', total: 1 }, { cuando: '2026-10-03T10:00:00Z', total: 3 }] }, informe: null }, apps);
  for (const a of ['mirar-pista', 'nota-de-pista', 'cerrar-pista', 'volver-pistas']) assert.match(una, new RegExp(`data-accion="${a}"`));
  assert.match(una, /Cómo fue cambiando/);
  assert.match(una, /todavía no puede abrir el informe/);
  assert.match(htmlDeUnaPista({ id: 'c', pista: libro.pistas.c, informe: null }, apps), /data-accion="reabrir-pista"/);
});

test('el libro del celular: apagar la novedad, archivar y escribirlo una pista por renglón', () => {
  const j = { version: 1, pistas: { a: { estado: 'abierta', novedad: true, creada: '2026-10-03T10:00:00Z' }, b: { estado: 'abierta', novedad: false, creada: '2026-10-03T11:00:00Z' } } };
  assert.equal(conPistaSinNovedad(j, 'a').pistas.a.novedad, false);
  assert.equal(conPistaEstado(j, 'a', 'archivada').pistas.a.estado, 'archivada');
  assert.equal(conPistaEstado(j, 'a', 'rara'), j);
  const texto = formatear(ARCHIVOS.pistas, j);
  assert.equal(texto.split('\n').filter((l) => /^"[ab]":/.test(l)).length, 2, 'una pista por renglón');
  assert.equal(JSON.parse(texto).version, 1);
  assert.deepEqual(JSON.parse(texto).pistas, j.pistas);
  assert.deepEqual(JSON.parse(comoRenglones(j)).pistas, j.pistas, 'y la nube lo escribe igual');
});

test('lo conectado: la nube guarda la pista abierta, un workflow la vuelve a mirar cada tres horas y el panel la muestra', () => {
  const cel = leer('panel/celular.mjs');
  assert.match(cel, /enriquecerConEnlaces\(pedido\)/);
  assert.match(cel, /conPista\(leerJson\(ARCHIVO_PISTAS, \{ pistas: \{\} \}\), id,/);
  const w = leer('.github/workflows/pistas.yml');
  assert.match(w, /cron: '23 \*\/3 \* \* \*'/);
  assert.match(w, /group: pistas\b/, 'candado propio (A-3): no se cancela con los pedidos de "Panel del celular"; los choques en pistas.json los une panel/unir-conflictos.mjs');
  assert.doesNotMatch(w, /group: panel-celular/);
  assert.match(w, /git add web\/data\/pistas\.json/);
  assert.match(w, /PISTA: \$\{\{ inputs\.id \}\}/, 'lo que manda el celular va por variable de entorno');
  assert.ok(!/run: .*\$\{\{ inputs\./.test(w), 'un run: no usa inputs directo');
  assert.match(w, /WHATSAPP_APIKEY: \$\{\{ secrets\.WHATSAPP_APIKEY \}\}/);
  const app = leer('web/public/panel/app.js');
  assert.match(app, /disparar\('pistas\.yml', \{ id, marca \}\)/);
  assert.match(app, /accion === 'abrir-pista'/);
  assert.match(app, /pistasConNovedad\(\)/);
  assert.match(leer('web/public/panel/github.js'), /pistas: 'web\/data\/pistas\.json'/);
});

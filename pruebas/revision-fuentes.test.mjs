// La página de revisión de fuentes (docs/etapa-1-fuentes/generar-revision.mjs): se arma en memoria con los
// datos reales del repositorio y tiene que mostrar cada fuente activa del registro, un solo archivo y sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { FUENTES, FUENTES_NACIONALES } from '../ingesta/fuentes.mjs';
import { FUENTES_CRUCE } from '../ingesta/fuentes-cruce.mjs';
import { armarDatos, generarHTML, leerCSV, esc, sugerenciaDe, dudasDe } from '../docs/etapa-1-fuentes/generar-revision.mjs';

const registro = [...FUENTES, ...FUENTES_NACIONALES, ...FUENTES_CRUCE];
const activas = registro.filter((f) => f.activa !== false);
const datos = armarDatos();
const html = generarHTML(datos);

test('cada fuente activa del registro aparece en la página: su medio, su dirección y su id', () => {
  assert.ok(activas.length >= 100, 'el registro tiene que traer sus fuentes activas');
  for (const f of activas) {
    assert.ok(html.includes(`data-feed="${esc(f.id)}"`), `falta la dirección ${f.id}`);
    assert.ok(html.includes(esc(f.medio ?? f.nombre)), `falta el medio ${f.medio ?? f.nombre}`);
  }
  const filasActivas = datos.medios.filter((m) => m.activo);
  assert.equal(filasActivas.length, new Set(activas.map((f) => f.medio ?? f.nombre)).size);
  assert.equal(datos.resumen.feedsActivos, activas.length);
});

test('también están las apagadas, y la lista elegida da 11 de Balcarce, 50 del país y 10 de Tandil y Mar del Plata', () => {
  for (const f of registro.filter((x) => x.activa === false)) assert.ok(html.includes(`data-feed="${esc(f.id)}"`), `falta la apagada ${f.id}`);
  const p = datos.resumen.porGrupo;
  assert.equal(p.balcarce, 11);
  assert.equal(p.pais, 50);
  assert.equal(p.zona, 10);
  assert.equal(p.otras, 0, 'una activa quedó fuera de LISTA-ELEGIDA.md');
});

test('es un solo archivo: sin scripts ni estilos de afuera, y el JavaScript de la página se puede leer', () => {
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+rel=["']?stylesheet/i);
  assert.doesNotMatch(html, /@import|url\(\s*https?:/i);
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.ok(script, 'falta el script en línea');
  assert.doesNotThrow(() => new vm.Script(script));
  assert.match(html, /prefers-color-scheme:\s*dark/);
  assert.match(html, /name="viewport"/);
  for (const id of ['q', 'f-grupo', 'f-decision', 'f-sug', 'f-tipo', 'f-origen', 'f-dudosas', 'copiar', 'descargar']) assert.ok(html.includes(`id="${id}"`), `falta #${id}`);
});

test('cada medio tiene los tres botones y un comentario', () => {
  const filas = html.split('<tr class="fila').slice(1);
  assert.equal(filas.length, datos.medios.length);
  for (const f of filas) {
    assert.match(f, /data-d="Sí"/);
    assert.match(f, /data-d="No"/);
    assert.match(f, /data-d="Duda"/);
    assert.match(f, /class="coment"/);
  }
});

test('los datos de la zona y del cruce salen de los registros y no se inventan', () => {
  const clarin = datos.medios.find((m) => m.nombre === 'Clarín');
  assert.equal(clarin.dueno, 'Grupo Clarín');
  assert.ok(clarin.hermanos.includes('Olé') && clarin.hermanos.includes('TN (Todo Noticias)'));
  assert.ok(clarin.dudas.some((d) => d.tipo === 'hermano'));
  const infobae = datos.medios.find((m) => m.nombre === 'Infobae');
  assert.ok(infobae.dudas.some((d) => d.tipo === 'cloudflare'), 'Infobae bloquea a Cloudflare (sondeo del 15/10)');
  assert.ok(datos.resumen.feedsCruce > 0 && datos.resumen.feedsCruce < datos.resumen.feedsActivos);
});

test('la sugerencia usa un criterio objetivo', () => {
  const base = { activo: true, grupo: 'pais', nuevo: false, hermanos: [], dueno: null, imprescindible: 0, pub30: 40, feeds: [{ activa: true, nivel: 'ok', estado: 'Anda', bloqueado: false }] };
  assert.equal(sugerenciaDe({ ...base }).accion, 'mantener');
  assert.equal(sugerenciaDe({ ...base, pub30: 0 }).accion, 'apagar');
  assert.equal(sugerenciaDe({ ...base, pub30: 1 }).accion, 'revisar');
  assert.equal(sugerenciaDe({ ...base, pub30: 1, imprescindible: 3 }).accion, 'mantener');
  assert.equal(sugerenciaDe({ ...base, pub30: 0, nuevo: true }).accion, 'mantener');
  assert.equal(sugerenciaDe({ ...base, pub30: 0, grupo: 'balcarce' }).accion, 'mantener', 'lo de Balcarce nunca se sugiere apagar por pocas notas');
  const caido = { ...base, feeds: [{ activa: true, nivel: 'mal', estado: 'No responde desde la PC (HTTP 404)', bloqueado: false }] };
  assert.equal(sugerenciaDe(caido).accion, 'apagar');
  assert.ok(dudasDe(caido).some((d) => d.tipo === 'caido'));
  assert.equal(sugerenciaDe({ ...base, activo: false, pub30: 0 }).accion, 'apagar');
  assert.equal(sugerenciaDe({ ...base, activo: false, pub30: 30 }).accion, 'revisar');
});

test('el lector de la planilla entiende comillas y comas', () => {
  const filas = leerCSV('﻿id,motivo,url\r\na,"uno, dos",http://x\r\nb,"dice ""hola""",http://y\r\n');
  assert.equal(filas.length, 2);
  assert.equal(filas[0].motivo, 'uno, dos');
  assert.equal(filas[1].motivo, 'dice "hola"');
});

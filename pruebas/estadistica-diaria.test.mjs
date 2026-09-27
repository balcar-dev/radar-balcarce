// La estadística diaria de lo publicado y su línea en el WhatsApp de las 21
// (27/09, Hernán: "que sigamos esa estadística de ahora en más, categorías y
// demás, diariamente, y me mandes un informe diario por WhatsApp").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  cuentaDelDia, anotarDia, comoHistoriaJson, promedioAnterior, textoDelDia, SECCIONES_DEL_SITIO, DIAS_GUARDADOS,
} from '../ingesta/estadistica-diaria.mjs';
import { SECCIONES } from '../web/lib/datos.js';
import { datosDelDia, textoResumen } from '../redes/avisos.mjs';
import { LARGO_MAXIMO } from '../redes/whatsapp.mjs';

const AHORA = new Date('2026-09-27T23:00:00Z'); // 20:00 en Balcarce
const PORTADA = {
  notas: [
    { id: 'a', seccion: 'Balcarce', local: true, visto: '2026-09-27T12:00:00Z', medios: ['La Vanguardia'] },
    { id: 'b', seccion: 'Balcarce', local: true, visto: '2026-09-27T14:00:00Z', medios: ['Puntonueve', 'Radio Gabal'], publicadaPor: 'hernan' },
    { id: 'c', seccion: 'Economía', local: false, visto: '2026-09-27T15:00:00Z', medios: ['Infobae', 'Clarín'], publicadaPor: 'ia' },
    // Ayer, en hora de Balcarce (las 23:30 del 26 son las 2:30 del 27 en UTC).
    { id: 'd', seccion: 'Política', local: true, visto: '2026-09-27T02:30:00Z' },
    { id: 'e', seccion: 'Balcarce', propia: 'repaso', local: true, visto: '2026-09-27T13:00:00Z' },
  ],
  esperandoCuerpo: 4,
  pendientes: [{ id: 'x' }],
};

test('cuenta lo publicado hoy, en hora de Balcarce, por sección', () => {
  const c = cuentaDelDia({ portada: PORTADA, ahora: AHORA });
  assert.equal(c.dia, '2026-09-27');
  assert.equal(c.publicadas, 3, 'la de ayer a la noche y la nota propia no cuentan como noticias de hoy');
  assert.equal(c.deBalcarce, 2);
  assert.equal(c.deAfuera, 1);
  assert.equal(c.conDosMediosOMas, 2);
  assert.equal(c.porPersona, 1, 'la IA no cuenta como persona');
  assert.equal(c.propias, 1);
  assert.deepEqual(c.porSeccion, { Balcarce: 2, Economía: 1 });
  assert.equal(c.enPortada, 5);
  assert.equal(c.esperandoCuerpo, 4);
  assert.equal(c.esperandoPersona, 1);
  assert.ok(!('actualizado' in c), 'sin hora: si no, cada corrida cambiaría el archivo y haría un commit');
});

test('la historia reemplaza el día de hoy, guarda un día por línea y no crece sin fin', () => {
  const c = cuentaDelDia({ portada: PORTADA, ahora: AHORA });
  let h = anotarDia({ dias: { '2026-09-26': { dia: '2026-09-26', publicadas: 10 } } }, c);
  h = anotarDia(h, { ...c, publicadas: 4 });
  assert.deepEqual(Object.keys(h.dias), ['2026-09-26', '2026-09-27']);
  assert.equal(h.dias['2026-09-27'].publicadas, 4);
  const texto = comoHistoriaJson(h);
  assert.equal(texto.split('\n').length, 5);
  assert.deepEqual(JSON.parse(texto), h);
  const muchos = { dias: Object.fromEntries(Array.from({ length: DIAS_GUARDADOS + 5 }, (_, i) => [`d${String(i).padStart(4, '0')}`, {}])) };
  assert.equal(Object.keys(anotarDia(muchos, c).dias).length, DIAS_GUARDADOS);
});

test('el promedio de los días anteriores no cuenta el de hoy', () => {
  const h = { dias: { '2026-09-25': { publicadas: 30 }, '2026-09-26': { publicadas: 50 }, '2026-09-27': { publicadas: 3 } } };
  assert.deepEqual(promedioAnterior(h, '2026-09-27'), { dias: 2, promedio: 40 });
  assert.equal(promedioAnterior({ dias: {} }, '2026-09-27'), null);
});

test('el informe es breve: el total contra los días anteriores y las notas por sección', () => {
  const c = cuentaDelDia({ portada: PORTADA, ahora: AHORA });
  const t = textoDelDia(c, { dias: { '2026-09-26': { publicadas: 5 } } });
  assert.equal(t, '📰 Hoy: 3 notas (2 de Balcarce) · ayer: 5\nBalcarce 2 · Economía 1');
  assert.equal(t.split('\n').length, 2, 'breve: dos líneas');
  const semana = { dias: Object.fromEntries(['20', '21', '22', '23', '24', '25', '26'].map((d) => [`2026-09-${d}`, { publicadas: 40 }])) };
  assert.match(textoDelDia(c, semana), /promedio de 7 días: 40/);
});

test('las secciones del informe son las del sitio', () => {
  assert.deepEqual(SECCIONES_DEL_SITIO, SECCIONES.map((s) => s.nombre));
});

test('el resumen de las 21 dice el total, y el detalle va en un bloque propio que sale una vez por día', async () => {
  const { planDeAvisos } = await import('../redes/vigilar.mjs');
  const secciones = Object.fromEntries(SECCIONES_DEL_SITIO.map((s, i) => [s, i + 1]));
  const notas = Object.entries(secciones).flatMap(([s, n]) => Array.from({ length: n }, (_, i) => ({ id: `${s}${i}`, seccion: s, visto: '2026-09-27T15:00:00Z' })));
  const resumen = textoResumen({ datos: datosDelDia({ ahora: AHORA, portada: { notas }, libro: {} }) });
  assert.doesNotMatch(resumen, /Notas|Fútbol 4/, 'las notas del día no se repiten dentro del resumen');

  const alas21 = new Date('2026-09-28T00:10:00Z'); // 21:10 en Balcarce
  const plan = planDeAvisos({ ahora: alas21, estado: {}, portada: { notas }, historia: {} });
  const informe = plan.secciones.find((s) => s.clave === 'informe');
  assert.ok(informe, 'a las 21 sale el informe');
  assert.match(informe.texto, /📰 Hoy: 66 notas \(0 de Balcarce\)/);
  assert.match(informe.texto, /Argentina 11/);
  assert.ok(informe.texto.length < 250, `breve: ${informe.texto.length} caracteres con las once secciones`);
  assert.ok(informe.texto.length < LARGO_MAXIMO);

  // Si no entró junto al resumen, sale en la corrida siguiente; una vez dado, no se repite.
  const estado = {};
  plan.anotar(estado, ['resumen']);
  assert.equal(estado.informePendiente, '2026-09-27');
  const despues = planDeAvisos({ ahora: new Date('2026-09-28T00:40:00Z'), estado, portada: { notas }, historia: {} });
  assert.deepEqual(despues.secciones.map((s) => s.clave), ['informe']);
  despues.anotar(estado, ['informe']);
  assert.equal(estado.informePendiente, undefined);
  assert.equal(estado.ultimoInforme, '2026-09-27');
  const otraVez = planDeAvisos({ ahora: new Date('2026-09-28T01:10:00Z'), estado, portada: { notas }, historia: {} });
  assert.ok(!otraVez.secciones.some((s) => s.clave === 'informe'));
  // Antes de las 21 no sale.
  const temprano = planDeAvisos({ ahora: new Date('2026-09-27T15:00:00Z'), estado: {}, portada: { notas }, historia: {} });
  assert.ok(!temprano.secciones.some((s) => s.clave === 'informe'));
});

test('la corrida de la web guarda la estadística y el workflow la sube', () => {
  const g = fs.readFileSync(new URL('../web/scripts/generar-datos.mjs', import.meta.url), 'utf8');
  assert.match(g, /notas-por-dia\.json/);
  assert.match(g, /cuentaDelDia\(/);
  const w = fs.readFileSync(new URL('../.github/workflows/actualizar.yml', import.meta.url), 'utf8');
  assert.match(w, /git add [^\n]*web\/data\/notas-por-dia\.json/);
});

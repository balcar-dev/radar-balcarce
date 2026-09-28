// El cruce de medios (27/09, ingesta/cruce.mjs): juntar las notas de todos
// los medios que cuentan el mismo hecho, con una memoria de las últimas horas.
// Con títulos reales del cruce de 90 medios del 27/09.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  agruparPorHecho, leerMemoria, guardarMemoria, desdeLaMemoria, CRUCE,
} from '../ingesta/cruce.mjs';
import { parsearFeed } from '../ingesta/ingesta.mjs';

const n = (medio, titulo, cuerpo = '') => ({ medio, titulo, cuerpo, fecha: new Date('2026-09-27T12:00:00Z'), enlace: `https://${medio}.test/${titulo.length}` });

/** Relleno para que el cruce tenga contra qué medir qué palabras son raras. */
const ruido = Array.from({ length: 60 }, (_, i) => n(`relleno${i % 7}`, `Nota número ${i} sobre el clima, el tránsito y los precios del día ${i}`));

test('el mismo hecho contado por tres medios con títulos distintos es una sola historia', () => {
  const notas = [
    n('Olé', 'Ailín Pérez le ganó por decisión unánime a Norma Dumont en la UFC', 'La argentina sumó su séptima victoria y quedó a un paso del título.'),
    n('Infobae', 'La argentina Ailín Pérez venció a la brasileña Norma Dumont en UFC', 'Ganó por decisión unánime y se acerca al título.'),
    n('TyC Sports', 'Ailín Pérez venció a Norma Dumont en la UFC y se acerca al título mundial', 'Decisión unánime en la cartelera.'),
    ...ruido,
  ];
  const grupos = agruparPorHecho(notas);
  const ufc = grupos.find((g) => g.includes(0));
  assert.deepEqual(ufc.sort(), [0, 1, 2]);
  assert.equal(new Set(ufc.map((i) => notas[i].medio)).size, 3);
});

test('dos hechos distintos del mismo tema no se juntan', () => {
  const notas = [
    n('Clarín', 'Alpine condenó los insultos en redes contra Gasly y Norris tras el choque de Colapinto', 'Mensajes de odio.'),
    n('La Nación', 'Montoya respaldó a Colapinto tras el accidente en Bakú', 'El colombiano habló del error.'),
    ...ruido,
  ];
  const grupos = agruparPorHecho(notas);
  assert.notDeepEqual(grupos.find((g) => g.includes(0)).sort(), [0, 1]);
});

test('dos notas del mismo medio no se cuentan como dos medios', () => {
  const notas = [
    n('Infobae', 'Boca y Racing se enfrentan por la Copa Argentina: probables formaciones'),
    n('Infobae', 'Boca y Racing se enfrentan por la Copa Argentina: hora y TV'),
    ...ruido,
  ];
  const grupos = agruparPorHecho(notas);
  assert.equal(grupos.find((g) => g.includes(0)).length, 1, 'no se juntan entre sí');
});

test('la memoria guarda 36 horas, sin repetir enlaces, y vuelve como notas', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cruce-'));
  const archivo = path.join(dir, 'memoria.json');
  const ahora = Date.parse('2026-09-27T12:00:00Z');
  const vieja = { ...n('Clarín', 'Algo de hace dos días'), fecha: new Date(ahora - 50 * 3600e3) };
  const nueva = { ...n('Clarín', 'Algo de hace una hora'), fecha: new Date(ahora - 3600e3) };
  guardarMemoria(archivo, [], [vieja, nueva, nueva], { ahora });
  const leida = leerMemoria(archivo, { ahora });
  assert.equal(leida.length, 1);
  assert.equal(leida[0].titulo, 'Algo de hace una hora');
  const deVuelta = desdeLaMemoria(leida[0]);
  assert.ok(deVuelta.fecha instanceof Date && deVuelta.deLaMemoria);
  assert.deepEqual(leerMemoria(path.join(dir, 'no-existe.json')), [], 'sin archivo, memoria vacía');
  assert.equal(CRUCE.horasDeMemoria, 36);
});

test('se lee el índice de noticias de un sitio (news-sitemap), que trae todo el día', () => {
  const xml = `<?xml version="1.0"?><urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
    <url><loc>https://www.tycsports.com/futbol/boca-racing-id1.html</loc>
      <news:news><news:publication_date>2026-09-27T15:00:00-03:00</news:publication_date>
      <news:title>Boca y Racing, por los cuartos de la Copa Argentina</news:title></news:news></url>
    <url><loc>https://www.tycsports.com/ufc/ailin-perez-id2.html</loc>
      <news:news><news:publication_date>2026-09-27T02:00:00-03:00</news:publication_date>
      <news:title>Ailín Pérez venció a Dumont</news:title></news:news></url></urlset>`;
  const notas = parsearFeed(xml, { id: 'tyc', medio: 'TyC Sports', alcance: 'pais' });
  assert.equal(notas.length, 2);
  assert.equal(notas[0].titulo, 'Boca y Racing, por los cuartos de la Copa Argentina');
  assert.equal(notas[0].enlace, 'https://www.tycsports.com/futbol/boca-racing-id1.html');
  assert.equal(notas[1].fecha.toISOString(), '2026-09-27T05:00:00.000Z');
  assert.equal(notas[0].medio, 'TyC Sports');
});

test('las fuentes del cruce no traen Google News ni medios que ya se descartaron', async () => {
  const { FUENTES_CRUCE } = await import('../ingesta/fuentes-cruce.mjs');
  for (const f of FUENTES_CRUCE) {
    assert.ok(!/news\.google\.com/.test(f.url), `${f.nombre}: Google News no da la dirección original`);
    assert.ok(!/xataka|hipertextual|fm105punto1|teleshow/.test(f.url), `${f.nombre}: descartado el 27/09`);
  }
});

// Las páginas fijas de tablas (4/10/2026, Hernán): la Liga Profesional y el campeonato de F1 en una dirección que no cambia y se actualiza sola.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resumirConstructores, resumirClasificacion, traerF1, ultimaCarreraTerminada } from '../ingesta/f1.mjs';
import { notaDeLasTablas, notaDeLosPartidos, COMPETENCIAS } from '../ingesta/futbol.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

const constructores = (ronda = 16) => ({ MRData: { StandingsTable: { season: '2026', round: String(ronda), StandingsLists: [{ season: '2026', round: String(ronda), ConstructorStandings: [
  { position: '1', points: '538', wins: '11', Constructor: { name: 'Mercedes' } },
  { position: '2', points: '378', wins: '2', Constructor: { name: 'Ferrari' } },
  { position: 'x', points: 'sin', Constructor: { name: '' } },
] }] } } });

test('el campeonato de constructores se resume con posición, equipo, puntos y victorias, y lo incompleto se descarta', () => {
  const k = resumirConstructores(constructores());
  assert.equal(k.temporada, 2026);
  assert.equal(k.ronda, 16);
  assert.deepEqual(k.filas, [{ posicion: 1, equipo: 'Mercedes', puntos: 538, victorias: 11 }, { posicion: 2, equipo: 'Ferrari', puntos: 378, victorias: 2 }]);
  assert.equal(resumirConstructores({}), null);
  assert.equal(resumirConstructores({ MRData: { StandingsTable: { StandingsLists: [{ ConstructorStandings: [] }] } } }), null);
});

test('los dos campeonatos se piden aunque la última carrera sea de hace más de cuatro días (4/10: faltaba el de constructores)', async () => {
  const carrera = { ronda: 16, nombre: 'Azerbaijan Grand Prix', circuito: 'Baku', localidad: 'Baku', pais: 'Azerbaijan', largada: '2026-09-27T11:00:00.000Z', sesiones: [] };
  assert.equal(ultimaCarreraTerminada({ carreras: [carrera, { ...carrera, ronda: 17, largada: '2026-10-11T11:00:00.000Z' }] }, new Date('2026-10-05T12:00:00Z')).ronda, 16);
  assert.equal(ultimaCarreraTerminada({ carreras: [carrera] }, new Date('2026-09-27T11:30:00Z')), null, 'recién largó: todavía no terminó');
  const antes = { calendario: { temporada: 2026, carreras: [carrera] }, calendarioCuando: '2026-10-05T00:00:00Z', pilotos: { temporada: 2026, colapinto: null }, clasificacion: { temporada: 2026, ronda: 16, filas: [] }, notas: {} };
  const fetchFn = async (url) => (url.includes('constructorstandings') ? { ok: true, json: async () => constructores(16) } : { ok: false });
  const f = await traerF1({ antes, fetchFn, ahora: new Date('2026-10-05T12:00:00Z') });
  assert.equal(f.constructores?.filas?.[0]?.equipo, 'Mercedes');
});

test('traerF1 pide también los constructores cuando termina una carrera, y no los vuelve a pedir si ya tiene los de esa ronda', async () => {
  const pedidos = [];
  const carrera = { ronda: 16, nombre: 'Azerbaijan Grand Prix', circuito: 'Baku', localidad: 'Baku', pais: 'Azerbaijan', largada: '2026-09-27T11:00:00.000Z', sesiones: [] };
  const antes = { calendario: { temporada: 2026, carreras: [carrera] }, calendarioCuando: '2026-10-01T00:00:00Z', pilotos: { temporada: 2026, colapinto: null }, resultado: { temporada: 2026, ronda: 16, filas: [] }, clasificacion: { temporada: 2026, ronda: 16, filas: [] }, notas: {} };
  const fetchFn = async (url) => {
    pedidos.push(url);
    if (url.includes('constructorstandings')) return { ok: true, json: async () => constructores(16) };
    return { ok: false };
  };
  const f = await traerF1({ antes, fetchFn, ahora: new Date('2026-09-27T14:00:00Z') });
  assert.equal(f.constructores?.filas?.[0]?.equipo, 'Mercedes');
  assert.ok(pedidos.some((u) => u.includes('constructorstandings')));
  pedidos.length = 0;
  await traerF1({ antes: f, fetchFn, ahora: new Date('2026-09-27T15:00:00Z') });
  assert.ok(!pedidos.some((u) => u.includes('constructorstandings')), 'ya los tiene');
  void resumirClasificacion;
});

test('las notas de la Liga y de la F1 enlazan a su página fija; las de las copas, no', () => {
  const liga = COMPETENCIAS.find((c) => c.clave === 'liga');
  const copa = COMPETENCIAS.find((c) => c.clave === 'copaargentina');
  const p = { id: '1', competencia: 'liga', inicio: '2026-10-03T20:00:00Z', estado: 'programado', local: { id: '1', nombre: 'A', goles: null }, visitante: { id: '2', nombre: 'B', goles: null }, goles: [], estadio: 'E', penales: null };
  assert.deepEqual(notaDeLosPartidos(liga, [p], { fecha: '2026-10-03T12:00:00Z' }).destacados, [{ texto: 'Ver la tabla de posiciones', href: '/tablas/liga-profesional' }]);
  assert.deepEqual(notaDeLosPartidos(copa, [{ ...p, competencia: 'copaargentina' }], { fecha: '2026-10-03T12:00:00Z' }).destacados, []);
  assert.deepEqual(notaDeLasTablas(liga, { torneo: 'T', zonas: [{ nombre: 'Zona A', filas: [{ posicion: 1, id: '1', equipo: 'A', pj: 1, g: 1, e: 0, p: 0, gf: 1, gc: 0, dif: 1, pts: 3 }] }] }, [p], { fecha: '2026-10-03T12:00:00Z' }).destacados[0].href, '/tablas/liga-profesional');
  assert.match(leer('ingesta/f1.mjs'), /href: '\/tablas\/formula-1'/);
});

test('la página de cada tabla lee lo guardado, dice la verdad si falta y no inventa nada', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tablas-'));
  fs.mkdirSync(path.join(dir, 'data'));
  const antes = process.cwd();
  process.chdir(dir);
  try {
    const { tablaDeLaLiga, campeonatoDeF1 } = await import('../web/lib/tablas.js');
    assert.equal(tablaDeLaLiga(), null, 'sin archivo, sin tabla');
    assert.equal(campeonatoDeF1(), null);
    fs.writeFileSync(path.join(dir, 'data', 'futbol.json'), JSON.stringify({ tabla: { torneo: 'Clausura', zonas: [{ nombre: 'Zona A', filas: [{ posicion: 1, equipo: 'Boca' }] }] }, tablaCuando: '2026-10-04T10:00:00Z' }));
    fs.writeFileSync(path.join(dir, 'data', 'f1.json'), JSON.stringify({ clasificacion: { temporada: 2026, ronda: 16, filas: [{ posicion: 1, piloto: 'Alguien', puntos: 300 }] }, constructores: null, calendario: { carreras: new Array(24).fill({}) }, consultado: '2026-10-04T10:00:00Z' }));
    assert.equal(tablaDeLaLiga().zonas[0].filas[0].equipo, 'Boca');
    assert.equal(tablaDeLaLiga().actualizada, '2026-10-04T10:00:00Z');
    const f1 = campeonatoDeF1();
    assert.equal(f1.ronda, 16);
    assert.equal(f1.carreras, 24);
    assert.deepEqual(f1.constructores, [], 'si todavía no están los constructores, la página muestra sólo los pilotos');
  } finally { process.chdir(antes); }
});

test('las páginas existen y están en el mapa del sitio, pero NO en el menú (4/10: una palabra "Tablas" suelta no le dice nada a un lector); y sus escudos son del sitio', () => {
  for (const p of ['web/app/tablas/page.js', 'web/app/tablas/liga-profesional/page.js', 'web/app/tablas/formula-1/page.js']) assert.ok(fs.existsSync(path.join(RAIZ, p)), p);
  assert.ok(!/href: '\/tablas'/.test(leer('web/app/layout.js')), 'no va en el menú');
  const mapa = leer('web/app/sitemap.js');
  for (const d of ['/tablas`', '/tablas/liga-profesional`', '/tablas/formula-1`']) assert.ok(mapa.includes(d), d);
  assert.match(leer('web/app/tablas/liga-profesional/page.js'), /camino: '\/tablas\/liga-profesional'/);
  assert.match(leer('web/app/tablas/formula-1/page.js'), /camino: '\/tablas\/formula-1'/);
  assert.ok(!/https?:\/\//.test(leer('web/components/tablas.js')), 'nada de afuera');
});

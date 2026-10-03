// La Fórmula 1 como nota propia (ingesta/f1.mjs, 3/10/2026, pedido de Hernán):
// horarios en hora argentina los días del Gran Premio y resultado al terminar.
// Sin red: Jolpica es de mentira (las respuestas son recortes de las reales).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  instante, enHoraArgentina, sesionesDeLaCarrera, resumirCalendario, resumirResultado, resumirClasificacion, resumirPilotos,
  ventanaDeHorarios, notaDeHorarios, notaDeResultado, notasDeF1, traerF1, nombreDelGranPremio, carreraEnCurso, FIRMA_F1,
} from '../ingesta/f1.mjs';
import { tieneCuerpo } from '../web/lib/cuerpo.js';
import { quienEscribio, firmaCorta, autorDeNota } from '../web/components/metadatos.js';
import { esNotaPropia, sePuedeSola } from '../redes/elegir.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

const carreraJson = (r, ronda, nombre, pais) => ({
  season: '2026', round: String(ronda), raceName: nombre,
  Circuit: { circuitName: 'Circuito de prueba', Location: { locality: 'Ciudad', country: pais } },
  ...r,
});
const CALENDARIO = {
  MRData: { RaceTable: { season: '2026', Races: [
    carreraJson({ date: '2026-09-26', time: '11:00:00Z', FirstPractice: { date: '2026-09-24', time: '08:30:00Z' }, Qualifying: { date: '2026-09-25', time: '12:00:00Z' } }, 15, 'Azerbaijan Grand Prix', 'Azerbaijan'),
    carreraJson({
      date: '2026-10-04', time: '07:00:00Z',
      FirstPractice: { date: '2026-10-02', time: '04:30:00Z' }, SecondPractice: { date: '2026-10-02', time: '08:00:00Z' },
      ThirdPractice: { date: '2026-10-03', time: '04:30:00Z' }, Qualifying: { date: '2026-10-03', time: '08:00:00Z' },
    }, 16, 'Bahrain Grand Prix in Malaysia', 'Malaysia'),
    carreraJson({
      date: '2026-10-11', time: '12:00:00Z',
      FirstPractice: { date: '2026-10-09', time: '08:30:00Z' }, SprintQualifying: { date: '2026-10-09', time: '12:30:00Z' },
      Sprint: { date: '2026-10-10', time: '09:00:00Z' }, Qualifying: { date: '2026-10-10', time: '13:00:00Z' },
    }, 17, 'Singapore Grand Prix', 'Singapore'),
    // La madrugada en UTC es el día anterior en Argentina.
    carreraJson({ date: '2026-11-22', time: '04:00:00Z', FirstPractice: { date: '2026-11-20', time: '00:30:00Z' }, Qualifying: { date: '2026-11-21', time: '04:00:00Z' } }, 21, 'Las Vegas Grand Prix', 'USA'),
  ] } },
};
const piloto = (id, nombre, apellido, cod) => ({ driverId: id, permanentNumber: '1', code: cod, givenName: nombre, familyName: apellido });
const fila = (pos, d, equipo, extra = {}) => ({
  number: '1', position: String(pos), positionText: String(pos), points: '0', Driver: d, Constructor: { name: equipo },
  grid: String(pos), laps: '51', status: 'Finished', ...extra,
});
const COL = piloto('colapinto', 'Franco', 'Colapinto', 'COL');
const RESULTADOS = () => ({
  MRData: { RaceTable: { season: '2026', round: '16', Races: [carreraJson({ date: '2026-10-04', time: '07:00:00Z', Results: [
    fila(1, piloto('russell', 'George', 'Russell', 'RUS'), 'Mercedes', { grid: '1', Time: { time: '1:38:02.143' }, FastestLap: { rank: '1', lap: '49', Time: { time: '1:44.916' } } }),
    fila(2, piloto('ver', 'Max', 'Verstappen', 'VER'), 'Red Bull', { grid: '8', Time: { time: '+0.196' }, FastestLap: { rank: '2', lap: '48', Time: { time: '1:44.993' } } }),
    fila(3, piloto('had', 'Isack', 'Hadjar', 'HAD'), 'Red Bull', { grid: '4', Time: { time: '+10.704' } }),
    fila(4, piloto('lec', 'Charles', 'Leclerc', 'LEC'), 'Ferrari'),
    fila(17, COL, 'Alpine F1 Team', { positionText: 'R', status: 'Retired', grid: '9', laps: '36' }),
  ] }, 16, 'Bahrain Grand Prix in Malaysia', 'Malaysia')] } },
});
const CLASIFICACION = (ronda) => ({
  MRData: { StandingsTable: { season: '2026', StandingsLists: [{ season: '2026', round: String(ronda), DriverStandings: [
    ['Antonelli', '302'], ['Russell', '236'], ['Hamilton', '199'], ['Norris', '186'], ['Leclerc', '179'], ['Verstappen', '163'],
  ].map(([ap, pts], i) => ({
    position: String(i + 1), points: pts, wins: '1', Driver: piloto(ap.toLowerCase(), 'X', ap, ap.slice(0, 3)), Constructors: [{ name: 'Equipo' }],
  })) }] } },
});
const PILOTOS = { MRData: { DriverTable: { season: '2026', Drivers: [piloto('russell', 'George', 'Russell', 'RUS'), COL] } } };
const PILOTOS_SIN = { MRData: { DriverTable: { season: '2027', Drivers: [piloto('russell', 'George', 'Russell', 'RUS')] } } };

const cal = resumirCalendario(CALENDARIO);
const carrera = (r) => cal.carreras.find((c) => c.ronda === r);

// ------------------------------------------------------ hora argentina

test('la hora de Jolpica (UTC) se muestra en hora argentina, con el cambio de día', () => {
  assert.deepEqual(enHoraArgentina(instante({ date: '2026-10-04', time: '07:00:00Z' })), { dia: '2026-10-04', hora: '04:00' });
  // 00:30 UTC del 20/11 es las 21:30 del 19/11 en Argentina.
  assert.deepEqual(enHoraArgentina(instante({ date: '2026-11-20', time: '00:30:00Z' })), { dia: '2026-11-19', hora: '21:30' });
  // La largada de Las Vegas (04:00Z del domingo 22) es el sábado 21 a la 01:00.
  assert.deepEqual(enHoraArgentina(instante({ date: '2026-11-22', time: '04:00:00Z' })), { dia: '2026-11-22', hora: '01:00' });
  assert.equal(instante({ date: '2026-10-04' }), null, 'sin hora no se inventa');
  assert.equal(instante({ date: 'mañana', time: '07:00:00Z' }), null);
});

test('las sesiones salen en orden, con el sprint si hay', () => {
  const s = sesionesDeLaCarrera({
    date: '2026-10-11', time: '12:00:00Z', FirstPractice: { date: '2026-10-09', time: '08:30:00Z' },
    SprintQualifying: { date: '2026-10-09', time: '12:30:00Z' }, Sprint: { date: '2026-10-10', time: '09:00:00Z' }, Qualifying: { date: '2026-10-10', time: '13:00:00Z' },
  });
  assert.deepEqual(s.map((x) => x.nombre), ['Práctica libre 1', 'Clasificación sprint', 'Sprint', 'Clasificación', 'Carrera']);
});

test('el nombre del Gran Premio sale en castellano y lo desconocido queda como lo dice la API', () => {
  assert.equal(nombreDelGranPremio('Azerbaijan Grand Prix'), 'Gran Premio de Azerbaiyán');
  assert.equal(nombreDelGranPremio('Bahrain Grand Prix in Malaysia'), 'Gran Premio de Baréin en Malasia');
  assert.equal(nombreDelGranPremio('Atlantis Grand Prix'), 'Gran Premio de Atlantis');
});

// ------------------------------------------------------------ horarios

test('la nota de horarios: título, días de la semana, hora argentina, circuito y Colapinto con el dato cierto', () => {
  const n = notaDeHorarios(carrera(16), { colapinto: { piloto: 'Franco Colapinto', numero: '43', equipo: 'Alpine F1 Team' }, fecha: '2026-10-03T12:00:00.000Z' });
  assert.equal(n.id, 'f1horarios2026r16');
  assert.equal(n.titulo, 'F1: horarios del Gran Premio de Baréin en Malasia, en hora argentina');
  assert.equal(n.seccion, 'Automovilismo');
  assert.equal(n.propia, 'f1');
  for (const x of [
    'Viernes 2 de octubre: práctica libre 1 a las 01:30 y práctica libre 2 a las 05:00.',
    'Sábado 3 de octubre: práctica libre 3 a las 01:30 y clasificación a las 05:00.',
    'Domingo 4 de octubre: carrera a las 04:00.',
    'Circuito de prueba', 'Franco Colapinto', 'Alpine F1 Team', 'número 43', 'UTC-3', 'Fangio',
  ]) assert.ok(n.cuerpo.includes(x), `falta: ${x}`);
  assert.ok(tieneCuerpo(n), 'pasa la regla de 70 palabras');
  assert.ok(!n.cuerpo.includes('sprint'), 'sin sprint no se habla de sprint');
  assert.deepEqual(n.fuentesConsultadas.map((f) => f.medio), ['Jolpica F1 (datos abiertos)']);
});

test('la nota de horarios con sprint lo cuenta y sin Colapinto no lo nombra', () => {
  const n = notaDeHorarios(carrera(17), { colapinto: null, fecha: '2026-10-08T12:00:00.000Z' });
  assert.match(n.cuerpo, /carrera sprint/);
  assert.match(n.cuerpo, /Viernes 9 de octubre: práctica libre 1 a las 05:30 y clasificación sprint a las 09:30\./);
  assert.match(n.cuerpo, /Sábado 10 de octubre: sprint a las 06:00 y clasificación a las 10:00\./);
  assert.ok(!/Colapinto/.test(n.cuerpo + n.titulo + n.copete), 'sin Colapinto en la temporada, no se lo menciona');
  assert.ok(tieneCuerpo(n));
});

test('la nota de horarios necesita sesiones y fecha', () => {
  assert.equal(notaDeHorarios({ ...carrera(16), sesiones: [] }, { fecha: 'x' }), null);
  assert.equal(notaDeHorarios(carrera(16), {}), null);
});

// ------------------------------------------------------ la ventana

test('la ventana de horarios va del jueves a 3 horas después de la largada', () => {
  const v = ventanaDeHorarios(carrera(16)); // domingo 4/10 04:00 AR
  assert.equal(v.desde, '2026-10-01T03:00:00.000Z', 'jueves 1/10 a las 00:00 de Balcarce');
  assert.equal(v.hasta, '2026-10-04T10:00:00.000Z');
  // Si la actividad empieza antes del jueves en Argentina, se adelanta.
  const v2 = ventanaDeHorarios(carrera(21)); // largada domingo 22/11 01:00 AR; práctica jueves 19/11 21:30 AR
  assert.equal(v2.desde, '2026-11-19T03:00:00.000Z');
});

test('las notas de F1 salen sólo dentro de la ventana y mantienen su fecha', () => {
  const f1 = { calendario: cal, pilotos: { temporada: 2026, colapinto: { piloto: 'Franco Colapinto', numero: '43' } }, notas: {} };
  const ids = (ahora) => notasDeF1(f1, { ahora: new Date(ahora) }).notas.map((n) => n.id);
  assert.deepEqual(ids('2026-09-30T20:00:00Z'), [], 'el miércoles todavía no');
  assert.deepEqual(ids('2026-10-01T04:00:00Z'), ['f1horarios2026r16'], 'jueves');
  assert.deepEqual(ids('2026-10-04T09:00:00Z'), ['f1horarios2026r16'], 'hasta que termina la carrera');
  assert.deepEqual(ids('2026-10-04T11:00:00Z'), [], 'después, la de horarios sale (y todavía no hay resultado)');
  // La fecha es la de la primera vez y no rejuvenece.
  const primera = notasDeF1(f1, { ahora: new Date('2026-10-01T04:00:00Z') });
  assert.equal(primera.notas[0].fecha, '2026-10-01T04:00:00.000Z');
  const segunda = notasDeF1({ ...f1, notas: primera.fechas }, { ahora: new Date('2026-10-03T10:00:00Z') });
  assert.equal(segunda.notas[0].fecha, '2026-10-01T04:00:00.000Z');
  assert.equal(segunda.notas[0].id, primera.notas[0].id, 'una sola dirección fija');
});

// ------------------------------------------------------------ resultado

test('la nota de resultado: podio, Colapinto, primero en la parrilla, vuelta rápida y campeonato', () => {
  const r = resumirResultado(RESULTADOS());
  const n = notaDeResultado(r, { clasificacion: resumirClasificacion(CLASIFICACION(16)), colapinto: { piloto: 'Franco Colapinto' }, fecha: '2026-10-04T09:30:00.000Z' });
  assert.equal(n.id, 'f1resultado2026r16');
  assert.match(n.titulo, /^F1: así fue el Gran Premio de Baréin en Malasia/);
  for (const x of [
    'George Russell (Mercedes) ganó', 'Max Verstappen (Red Bull), a 0,196 segundos', 'Isack Hadjar (Red Bull), a 10,704 segundos', '1:38:02,143',
    'no terminó la carrera', 'había largado desde el puesto 9', '36 vueltas',
    'salió desde el primer puesto de la parrilla', 'La vuelta rápida fue de George Russell (Mercedes), con 1:44,916 en la vuelta 49',
    '1º X Antonelli, 302 puntos', '5º X Leclerc, 179 puntos', 'Jolpica F1',
  ]) assert.ok(n.cuerpo.includes(x), `falta: ${x}`);
  assert.ok(!n.cuerpo.includes('Verstappen, 163'), 'sólo los cinco primeros del campeonato');
  assert.ok(tieneCuerpo(n));
});

test('la nota de resultado sin Colapinto no lo nombra y sin campeonato igual sale', () => {
  const sin = RESULTADOS();
  sin.MRData.RaceTable.Races[0].Results = sin.MRData.RaceTable.Races[0].Results.filter((f) => f.Driver.driverId !== 'colapinto');
  const n = notaDeResultado(resumirResultado(sin), { clasificacion: null, colapinto: null, fecha: '2026-10-04T09:30:00.000Z' });
  assert.ok(!/Colapinto/.test(n.cuerpo + n.titulo + n.copete));
  assert.ok(!/campeonato de pilotos/.test(n.cuerpo), 'sin clasificación no se inventa');
  assert.ok(tieneCuerpo(n));
  // Una clasificación de otra fecha (la API todavía no se actualizó) no se usa.
  const vieja = notaDeResultado(resumirResultado(sin), { clasificacion: resumirClasificacion(CLASIFICACION(15)), fecha: '2026-10-04T09:30:00.000Z' });
  assert.ok(!/campeonato de pilotos/.test(vieja.cuerpo));
});

test('Colapinto que termina la carrera: su puesto y su tiempo', () => {
  const j = RESULTADOS();
  j.MRData.RaceTable.Races[0].Results = j.MRData.RaceTable.Races[0].Results.filter((f) => f.Driver.driverId !== 'colapinto');
  j.MRData.RaceTable.Races[0].Results.push(fila(8, COL, 'Alpine F1 Team', { grid: '12', Time: { time: '+45.5' } }));
  const n = notaDeResultado(resumirResultado(j), { fecha: '2026-10-04T09:30:00.000Z' });
  assert.match(n.cuerpo, /Colapinto, con Alpine F1 Team, que había largado desde el puesto 12, terminó en el puesto 8 \(a 45,5 segundos del ganador\)/);
});

test('el resultado se muestra hasta 4 días después de la carrera', () => {
  const f1 = { calendario: cal, pilotos: null, resultado: resumirResultado(RESULTADOS()), clasificacion: resumirClasificacion(CLASIFICACION(16)), notas: {} };
  const ids = (ahora) => notasDeF1(f1, { ahora: new Date(ahora) }).notas.map((n) => n.id);
  assert.deepEqual(ids('2026-10-04T08:00:00Z'), ['f1horarios2026r16', 'f1resultado2026r16']);
  assert.deepEqual(ids('2026-10-06T12:00:00Z'), ['f1resultado2026r16']);
  assert.deepEqual(ids('2026-10-08T12:00:00Z'), ['f1horarios2026r17'], 'el resultado ya no, y empieza la semana siguiente');
});

// ------------------------------------------------------------ la API

const respuesta = (cuerpo) => ({ ok: true, json: async () => cuerpo });
const apiBuena = async (url) => {
  if (/current\.json/.test(url)) return respuesta(CALENDARIO);
  if (/drivers\.json/.test(url)) return respuesta(PILOTOS);
  if (/results\.json/.test(url)) return respuesta(RESULTADOS());
  if (/driverstandings/.test(url)) return respuesta(CLASIFICACION(16));
  return { ok: false, json: async () => ({}) };
};

test('traerF1 guarda calendario, pilotos, resultado y clasificación cuando la carrera ya terminó', async () => {
  const f = await traerF1({ fetchFn: apiBuena, ahora: new Date('2026-10-04T09:30:00Z') });
  assert.equal(f.calendario.carreras.length, 4);
  assert.equal(f.pilotos.colapinto.piloto, 'Franco Colapinto');
  assert.equal(f.resultado.ronda, 16);
  assert.equal(f.clasificacion.ronda, 16);
  assert.ok(notasDeF1(f, { ahora: new Date('2026-10-04T09:30:00Z') }).notas.some((n) => n.id === 'f1resultado2026r16'));
});

test('traerF1 antes de la carrera no pide el resultado', async () => {
  const pedidos = [];
  const f = await traerF1({ fetchFn: async (u) => { pedidos.push(u); return apiBuena(u); }, ahora: new Date('2026-10-03T15:00:00Z') });
  assert.ok(!pedidos.some((u) => /results|standings/i.test(u)));
  assert.equal(f.resultado, null);
});

test('si la API se cae no se rompe nada: queda lo último guardado o no hay nota', async () => {
  const caida = async () => { throw new Error('ECONNRESET'); };
  const rota = async () => ({ ok: true, json: async () => { throw new Error('no es JSON'); } });
  const error503 = async () => ({ ok: false, status: 503, json: async () => ({}) });
  const ahora = new Date('2026-10-03T15:00:00Z');
  for (const fetchFn of [caida, rota, error503]) {
    const sin = await traerF1({ fetchFn, ahora });
    assert.equal(sin.calendario, null);
    assert.deepEqual(notasDeF1(sin, { ahora }).notas, [], 'sin datos no hay nota');
    // Con algo guardado, se sigue mostrando.
    const bueno = await traerF1({ fetchFn: apiBuena, ahora });
    const guardado = JSON.parse(JSON.stringify({ ...bueno, calendarioCuando: '2026-10-03T00:00:00.000Z' }));
    const con = await traerF1({ antes: guardado, fetchFn, ahora });
    assert.equal(con.calendario.carreras.length, 4);
    assert.equal(notasDeF1(con, { ahora }).notas.length, 1);
  }
});

test('respuestas raras de la API no tiran', () => {
  for (const malo of [null, {}, { MRData: {} }, { MRData: { RaceTable: { Races: 'x' } } }]) {
    assert.equal(resumirCalendario(malo), null);
    assert.equal(resumirResultado(malo), null);
    assert.equal(resumirClasificacion(malo), null);
    assert.equal(resumirPilotos(malo), null);
  }
  assert.equal(notaDeResultado({ filas: [] }, { fecha: 'x' }), null);
  assert.deepEqual(notasDeF1(null).notas, []);
  assert.equal(carreraEnCurso(null), null);
});

test('si Colapinto no corre esa temporada, el dato queda en null', () => {
  assert.equal(resumirPilotos(PILOTOS_SIN).colapinto, null);
  assert.equal(resumirPilotos(PILOTOS).colapinto.numero, '1');
});

// ------------------------------------------------ propia, firma y redes

test('la nota de F1 es propia: firma como el sitio, no entra sola a las redes y no gasta IA', () => {
  const n = notaDeHorarios(carrera(16), { fecha: '2026-10-03T12:00:00.000Z' });
  assert.ok(esNotaPropia(n));
  assert.equal(quienEscribio(n).propia, true);
  assert.equal(firmaCorta(n), FIRMA_F1.replace(/\.$/, ''));
  assert.match(firmaCorta(n), /Radar Balcarce/);
  assert.equal(autorDeNota(n, 'https://radarbalcarce.com').name, 'Radar Balcarce');
  assert.equal(sePuedeSola(n), false);
  assert.equal(n.guion, null);
  const fuente = fs.readFileSync(path.join(RAIZ, 'ingesta', 'f1.mjs'), 'utf8');
  assert.ok(!/gemini|groq|claves/i.test(fuente.replace(/\/\/.*$/gm, '')), 'no usa IA ni voz');
  assert.ok(!/^import /m.test(fuente), 'ingesta/ no importa nada');
});

test('generar-datos arma las notas de F1 como propias y el workflow guarda f1.json', () => {
  const g = fs.readFileSync(path.join(RAIZ, 'web', 'scripts', 'generar-datos.mjs'), 'utf8');
  assert.match(g, /notasDeF1/);
  assert.match(g, /\.\.\.notasDelDolar\(historiaDolar\), \.\.\.notasF1, \.\.\.repasos/);
  const wf = fs.readFileSync(path.join(RAIZ, '.github', 'workflows', 'actualizar.yml'), 'utf8');
  assert.match(wf, /web\/data\/f1\.json/);
});

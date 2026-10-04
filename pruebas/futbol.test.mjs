// El fútbol como notas propias (3/10/2026, Hernán: "fútbol de primera, la Copa Argentina, la Sudamericana y la Libertadores sólo con equipos argentinos; destacar
// a todos por igual"): datos de ESPN, sin IA. Sin red: las respuestas son de ejemplo, con la forma que devuelve ESPN.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  COMPETENCIAS, estadoDelPartido, resumirPartido, resumirPartidos, resumirTabla, resumirEquipos, diasPorTraer, traerFutbol, fechasDe, rangoDeDias,
  notaDeLosPartidos, notaDeLosResultados, notaDeLasTablas, notasDeFutbol, FIRMA_FUTBOL, FUENTE_FUTBOL, RELEVANCIA_FUTBOL,
} from '../ingesta/futbol.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const LIGA = COMPETENCIAS.find((c) => c.clave === 'liga');
const LIBERTADORES = COMPETENCIAS.find((c) => c.clave === 'libertadores');

const equipo = (id, nombre, goles, lado, extra = {}) => ({ homeAway: lado, score: String(goles), team: { id: String(id), displayName: nombre }, ...extra });
const gol = (idEquipo, jugador, minuto, tipo = 'Goal') => ({ scoringPlay: true, team: { id: String(idEquipo) }, clock: { displayValue: minuto }, athletesInvolved: [{ displayName: jugador }], type: { text: tipo } });
const evento = (id, fecha, estado, local, visitante, extra = {}) => ({
  id: String(id), date: fecha, season: { slug: 'torneo-clausura' },
  competitions: [{
    status: { displayClock: "90'", type: { name: estado.nombre, state: estado.estado, completed: estado.completo } },
    venue: { fullName: 'Estadio Ejemplo' }, details: [],
    competitors: [equipo(local[0], local[1], local[2], 'home', local[3]), equipo(visitante[0], visitante[1], visitante[2], 'away', visitante[3])], ...extra,
  }],
});
const FINAL = { nombre: 'STATUS_FULL_TIME', estado: 'post', completo: true };
const PROGRAMADO = { nombre: 'STATUS_SCHEDULED', estado: 'pre', completo: false };
const JUGANDO = { nombre: 'STATUS_IN_PROGRESS', estado: 'in', completo: false };

test('el estado de un partido: sólo "final" si ESPN lo marca terminado; un partido en juego nunca es un resultado', () => {
  assert.equal(estadoDelPartido({ type: { name: 'STATUS_FULL_TIME', completed: true } }), 'final');
  assert.equal(estadoDelPartido({ type: { name: 'STATUS_FINAL_PEN', completed: true } }), 'final');
  assert.equal(estadoDelPartido({ type: { name: 'STATUS_FULL_TIME', completed: false } }), 'otro', 'sin "completo" no es un resultado');
  assert.equal(estadoDelPartido({ type: { name: 'STATUS_SCHEDULED' } }), 'programado');
  assert.equal(estadoDelPartido({ type: { name: 'STATUS_HALFTIME' } }), 'entretiempo');
  assert.equal(estadoDelPartido({ type: { name: 'STATUS_IN_PROGRESS' } }), 'en-juego');
  assert.equal(estadoDelPartido({ type: { name: 'STATUS_POSTPONED' } }), 'postergado');
  assert.equal(estadoDelPartido({ type: { name: 'STATUS_CANCELED' } }), 'cancelado');
  assert.equal(estadoDelPartido(null), 'otro');
});

test('un partido de ESPN se resume con equipos, marcador, goleadores con minuto y estadio; lo roto o sin definir se descarta', () => {
  const e = evento(1, '2026-10-03T17:45Z', FINAL, [8950, 'Defensa y Justicia', 3], [18, 'San Lorenzo', 0]);
  e.competitions[0].details = [gol(8950, 'Jeremías Lucco', "11'"), gol(8950, 'Héctor Martínez', "45'", 'Goal - Volley'), gol(18, 'Un Rival', "60'", 'Own Goal'), { scoringPlay: false, type: { text: 'Yellow Card' } }, { scoringPlay: true, team: { id: '8950' }, athletesInvolved: [] }];
  const p = resumirPartido(e, 'liga');
  assert.equal(p.estado, 'final');
  assert.equal(p.inicio, '2026-10-03T17:45:00.000Z');
  assert.deepEqual([p.local.nombre, p.local.goles, p.visitante.nombre, p.visitante.goles], ['Defensa y Justicia', 3, 'San Lorenzo', 0]);
  assert.deepEqual(p.goles.map((g) => [g.equipo, g.jugador, g.minuto, g.tipo]), [['local', 'Jeremías Lucco', "11'", 'gol'], ['local', 'Héctor Martínez', "45'", 'gol'], ['visitante', 'Un Rival', "60'", 'en contra']]);
  assert.equal(p.estadio, 'Estadio Ejemplo');
  assert.equal(resumirPartido(evento(2, '2026-10-25T18:00Z', PROGRAMADO, [1, 'TBD Home', 0], [2, 'Boca', 0]), 'copa'), null, 'la final sin definir no es un partido');
  assert.equal(resumirPartido({ id: '1' }, 'liga'), null);
  assert.equal(resumirPartido(evento(3, 'no es una fecha', FINAL, [1, 'A', 1], [2, 'B', 0]), 'liga'), null);
  const pen = resumirPartido(evento(4, '2026-10-03T20:00Z', FINAL, [1, 'A', 1], [2, 'B', 1]), 'copa');
  assert.equal(pen.penales, null);
  const conPenales = evento(5, '2026-10-03T20:00Z', FINAL, [1, 'A', 1, { shootoutScore: 4 }], [2, 'B', 1, { shootoutScore: 3 }]);
  assert.deepEqual(resumirPartido(conPenales, 'copa').penales, { local: 4, visitante: 3 });
  assert.equal(resumirPartidos({ events: [e, { id: 'roto' }] }, 'liga').length, 1);
  assert.deepEqual(resumirPartidos(null, 'liga'), []);
});

const tablaJson = () => ({ name: 'Argentine Liga Profesional de Fútbol', children: [
  { name: 'Group A', standings: { entries: [
    { team: { displayName: 'Boca Juniors' }, stats: [{ name: 'rank', value: 1 }, { name: 'points', value: 20 }, { name: 'gamesPlayed', value: 11 }, { name: 'wins', value: 5 }, { name: 'ties', value: 5 }, { name: 'losses', value: 1 }, { name: 'pointsFor', value: 17 }, { name: 'pointsAgainst', value: 11 }, { name: 'pointDifferential', value: 6 }] },
    { team: { displayName: 'Lanús' }, stats: [{ name: 'rank', value: 2 }, { name: 'points', value: 18 }, { name: 'gamesPlayed', value: 11 }, { name: 'wins', value: 5 }, { name: 'ties', value: 3 }, { name: 'losses', value: 3 }, { name: 'pointsFor', value: 12 }, { name: 'pointsAgainst', value: 10 }, { name: 'pointDifferential', value: 2 }] },
  ] } },
  { name: 'Group B', standings: { entries: [{ team: { displayName: 'Racing' }, stats: [{ name: 'rank', value: 1 }, { name: 'points', value: 19 }, { name: 'gamesPlayed', value: 11 }, { name: 'wins', value: 6 }, { name: 'ties', value: 1 }, { name: 'losses', value: 4 }, { name: 'pointsFor', value: 14 }, { name: 'pointsAgainst', value: 9 }, { name: 'pointDifferential', value: 5 }] }] } },
] });

test('la tabla se resume por zona, ordenada por posición, y lo incompleto se descarta', () => {
  const t = resumirTabla(tablaJson());
  assert.deepEqual(t.zonas.map((z) => z.nombre), ['Zona A', 'Zona B']);
  assert.deepEqual(t.zonas[0].filas[0], { posicion: 1, id: null, equipo: 'Boca Juniors', pj: 11, g: 5, e: 5, p: 1, gf: 17, gc: 11, dif: 6, pts: 20 });
  assert.equal(resumirTabla({ children: [] }), null);
  assert.equal(resumirTabla(null), null);
  assert.equal(resumirTabla({ children: [{ name: 'Group A', standings: { entries: [{ team: { displayName: 'X' }, stats: [] }] } }] }), null, 'sin puntos ni posición no sirve');
  assert.deepEqual(resumirEquipos({ sports: [{ leagues: [{ teams: [{ team: { id: 5 } }, { team: { id: '18' } }, { team: {} }] }] }] }), ['5', '18']);
});

test('qué días se piden: hoy y ayer siempre; los otros, sólo si hace más de 3 horas que no se piden', () => {
  const ahora = new Date('2026-10-03T18:00:00Z');
  assert.deepEqual(diasPorTraer({}, ahora), ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07']);
  const traidos = { '2026-10-01': '2026-10-03T17:00:00Z', '2026-10-04': '2026-10-03T17:00:00Z', '2026-10-05': '2026-10-03T10:00:00Z' };
  const d = diasPorTraer(traidos, ahora);
  assert.ok(d.includes('2026-10-02') && d.includes('2026-10-03'), 'ayer y hoy siempre');
  assert.ok(!d.includes('2026-10-01') && !d.includes('2026-10-04'), 'los de hace menos de 3 horas, no');
  assert.ok(d.includes('2026-10-05'), 'el de hace más de 3 horas, sí');
});

test('las fechas: lo que se juega con menos de 60 horas entre un partido y el siguiente es una fecha', () => {
  const p = (inicio) => ({ id: inicio, inicio });
  const g = fechasDe([p('2026-10-02T22:15:00Z'), p('2026-10-03T20:00:00Z'), p('2026-10-05T23:00:00Z'), p('2026-10-10T20:00:00Z'), p('2026-10-12T23:00:00Z')]);
  assert.deepEqual(g.map((x) => x.length), [3, 2]);
  assert.equal(rangoDeDias('2026-10-02T22:15:00Z', '2026-10-05T23:00:00Z'), '2 al 5 de octubre');
  assert.equal(rangoDeDias('2026-10-03T17:45:00Z', '2026-10-03T20:00:00Z'), 'sábado 3 de octubre');
  assert.equal(rangoDeDias('2026-10-30T20:00:00Z', '2026-11-02T20:00:00Z'), '30 de octubre al 2 de noviembre');
});

const P = (id, inicio, estado, local, golesL, visitante, golesV, extra = {}) => ({
  id, competencia: 'liga', inicio, estado, minuto: null, local: { id: `L${id}`, nombre: local, goles: golesL }, visitante: { id: `V${id}`, nombre: visitante, goles: golesV }, penales: null, goles: [], estadio: 'Estadio Ejemplo', fase: null, partidoDeLaSerie: null, torneo: 'torneo-clausura', ...extra,
});
const FECHA = '2026-10-03T12:00:00.000Z';

test('la nota de los partidos lista a todos en el orden en que se juegan, con la hora argentina y sin destacar a ninguno', () => {
  const grupo = [
    P('1', '2026-10-03T20:00:00Z', 'programado', 'Boca Juniors', null, 'Racing Club', null),
    P('2', '2026-10-02T22:15:00Z', 'programado', 'Independiente', null, 'Instituto (Córdoba)', null),
    P('3', '2026-10-04T00:30:00Z', 'programado', 'Platense', null, 'Central Córdoba', null),
  ];
  const n = notaDeLosPartidos(LIGA, grupo, { fecha: FECHA });
  assert.equal(n.id, 'futbolpartidosliga20261002');
  assert.equal(n.propia, 'futbol');
  assert.equal(n.seccion, 'Fútbol');
  assert.match(n.titulo, /^Liga Profesional: los partidos de la fecha del 2 al 3 de octubre, con horarios$/);
  assert.ok(n.cuerpo.indexOf('Independiente vs Instituto') < n.cuerpo.indexOf('Boca Juniors vs Racing Club'), 'por orden de partido, no por equipo grande');
  assert.match(n.cuerpo, /Viernes 2 de octubre, 19:15: Independiente vs Instituto \(Córdoba\)/, 'hora argentina (UTC-3)');
  assert.match(n.cuerpo, /Sábado 3 de octubre, 21:30: Platense vs Central Córdoba|Sábado 3 de octubre, 17:00: Boca Juniors vs Racing Club/);
  assert.equal(n.firma, FIRMA_FUTBOL);
  assert.deepEqual(n.fuentesConsultadas, [FUENTE_FUTBOL]);
  assert.equal(n.relevancia, RELEVANCIA_FUTBOL);
  assert.equal(n.lugarFoto, 'Estadio Ejemplo');
  assert.equal(n.guion, null);
  assert.equal(notaDeLosPartidos(LIGA, [], { fecha: FECHA }), null);
  assert.equal(notaDeLosPartidos(LIGA, grupo, {}), null, 'sin fecha no hay nota');
  const uno = notaDeLosPartidos(LIBERTADORES, [P('9', '2026-10-15T00:30:00Z', 'programado', 'Estudiantes', null, 'Flamengo', null, { fase: 'Semifinals', partidoDeLaSerie: 1 })], { fecha: FECHA });
  assert.match(uno.titulo, /^Copa Libertadores: Estudiantes y Flamengo juegan el miércoles 14 de octubre a las 21:30$/);
  assert.match(uno.cuerpo, /por semifinals, ida|Semifinals, ida/i);
  assert.match(uno.cuerpo, /sólo los equipos argentinos/);
});

test('la nota de los resultados cuenta sólo lo terminado, con goleadores, y dice lo que falta; un partido en juego no es un resultado', () => {
  const terminado = P('1', '2026-10-03T17:45:00Z', 'final', 'Defensa y Justicia', 3, 'San Lorenzo', 0, { goles: [{ equipo: 'local', jugador: 'Jeremías Lucco', minuto: "11'", tipo: 'gol' }, { equipo: 'local', jugador: 'Héctor Martínez', minuto: "45'", tipo: 'gol' }, { equipo: 'local', jugador: 'David Barbona', minuto: "45'+3'", tipo: 'de penal' }] });
  const sinGoles = P('2', '2026-10-03T20:00:00Z', 'final', "Newell's Old Boys", 0, 'Lanús', 0);
  const jugando = P('3', '2026-10-03T23:00:00Z', 'en-juego', 'Racing Club', 1, 'Boca Juniors', 0);
  const n = notaDeLosResultados(LIGA, [jugando, sinGoles, terminado], { fecha: FECHA });
  assert.equal(n.id, 'futbolresultadosliga20261003');
  assert.match(n.titulo, /así va la fecha del sábado 3 de octubre/);
  assert.match(n.cuerpo, /Defensa y Justicia 3, San Lorenzo 0\. Goles: Defensa y Justicia: Jeremías Lucco \(11'\), Héctor Martínez \(45'\) y David Barbona \(45'\+3', de penal\)\./);
  assert.match(n.cuerpo, /Newell's Old Boys 0, Lanús 0\. Sin goles\./);
  assert.ok(!n.cuerpo.includes('Racing Club 1'), 'el partido en juego no figura como resultado');
  assert.match(n.cuerpo, /Todavía faltan jugarse: Racing Club y Boca Juniors/);
  assert.ok(n.cuerpo.indexOf('Defensa y Justicia 3') < n.cuerpo.indexOf("Newell's"), 'por orden de partido');
  const completa = notaDeLosResultados(LIGA, [terminado, sinGoles], { fecha: FECHA });
  assert.match(completa.titulo, /así terminó la fecha/);
  assert.ok(!/Todavía faltan/.test(completa.cuerpo));
  assert.equal(notaDeLosResultados(LIGA, [jugando], { fecha: FECHA }), null, 'sin ningún partido terminado no hay nota de resultados');
  const uno = notaDeLosResultados(LIGA, [terminado], { fecha: FECHA });
  assert.equal(uno.titulo, 'Liga Profesional: Defensa y Justicia 3, San Lorenzo 0');
  const penales = P('4', '2026-10-03T23:00:00Z', 'final', 'A', 1, 'B', 1, { penales: { local: 4, visitante: 3 } });
  assert.match(notaDeLosResultados(LIGA, [penales], { fecha: FECHA }).cuerpo, /A 1, B 1 \(4-3 en los penales\)/);
  const postergado = P('5', '2026-10-04T20:00:00Z', 'postergado', 'C', null, 'D', null);
  assert.match(notaDeLosResultados(LIGA, [terminado, postergado], { fecha: FECHA }).cuerpo, /Quedaron sin jugarse por ahora: C y D \(postergado\)/);
});

test('la nota de las tablas trae las zonas con puntos, partidos y goles', () => {
  const n = notaDeLasTablas(LIGA, resumirTabla(tablaJson()), [P('1', '2026-10-03T17:45:00Z', 'final', 'A', 1, 'B', 0)], { fecha: FECHA });
  assert.equal(n.id, 'futboltablaliga20261003');
  assert.match(n.titulo, /así están las tablas después de la fecha del sábado 3 de octubre/);
  assert.match(n.cuerpo, /Zona A:\n1º Boca Juniors: 20 puntos, 11 jugados \(5 ganados, 5 empatados, 1 perdidos\), goles 17 a 11, diferencia \+6\./);
  assert.match(n.cuerpo, /Zona B:/);
  assert.equal(notaDeLasTablas(LIGA, null, [P('1', '2026-10-03T17:45:00Z', 'final', 'A', 1, 'B', 0)], { fecha: FECHA }), null);
});

const FUTBOL = (extra = {}) => ({
  partidos: {
    liga: [
      P('1', '2026-10-02T22:15:00Z', 'final', 'Independiente', 1, 'Instituto (Córdoba)', 4),
      P('2', '2026-10-03T20:00:00Z', 'final', 'Boca Juniors', 2, 'Racing Club', 0),
      P('3', '2026-10-05T23:00:00Z', 'programado', 'Platense', null, 'Central Córdoba', null),
    ],
    libertadores: [P('9', '2026-10-15T00:30:00Z', 'programado', 'Estudiantes', null, 'Flamengo', null, { competencia: 'libertadores', fase: 'Semifinals', partidoDeLaSerie: 1 })],
  },
  tabla: resumirTabla(tablaJson()), tablaCuando: '2026-10-06T03:00:00.000Z', notas: {}, ...extra,
});
const ids = (f, ahora) => notasDeFutbol(f, { ahora: new Date(ahora) }).notas.map((n) => n.id).sort();

test('cuándo sale cada nota: los partidos desde un día y medio antes hasta que termina, los resultados desde el primer partido terminado, las tablas al final', () => {
  const f = FUTBOL();
  assert.deepEqual(ids(f, '2026-09-30T00:00:00Z'), [], 'mucho antes: nada');
  assert.deepEqual(ids(f, '2026-10-01T12:00:00Z'), ['futbolpartidosliga20261002'], 'un día y medio antes de que empiece');
  assert.deepEqual(ids(f, '2026-10-04T12:00:00Z'), ['futbolpartidosliga20261002', 'futbolresultadosliga20261002'], 'ya hay partidos terminados, faltan otros');
  const sinTabla = ids(f, '2026-10-06T02:00:00Z');
  assert.ok(!sinTabla.some((i) => i.includes('tabla')), 'la fecha todavía no terminó (falta Platense)');
  const terminada = FUTBOL({ partidos: { liga: [...FUTBOL().partidos.liga.slice(0, 2), { ...FUTBOL().partidos.liga[2], estado: 'final', local: { id: 'L3', nombre: 'Platense', goles: 1 }, visitante: { id: 'V3', nombre: 'Central Córdoba', goles: 1 } }] } });
  assert.ok(ids(terminada, '2026-10-06T04:00:00Z').includes('futboltablaliga20261002'), 'terminó la fecha y ESPN ya actualizó la tabla');
  assert.ok(!ids({ ...terminada, tablaCuando: '2026-10-06T00:30:00.000Z' }, '2026-10-06T04:00:00Z').some((i) => i.includes('tabla')), 'con la tabla de antes del último partido no sale');
  assert.deepEqual(ids(terminada, '2026-10-12T12:00:00Z'), [], 'una semana después ya no está');
  const copa = ids(FUTBOL(), '2026-10-13T20:00:00Z');
  assert.ok(copa.includes('futbolpartidoslibertadores20261014'), 'las copas: la nota de los partidos con los equipos argentinos');
});

test('una nota tiene una sola fecha: la de la primera vez que se vio, y no rejuvenece', () => {
  const primera = notasDeFutbol(FUTBOL(), { ahora: new Date('2026-10-04T12:00:00Z') });
  assert.equal(primera.fechas.futbolresultadosliga20261002, '2026-10-04T12:00:00.000Z');
  const despues = notasDeFutbol(FUTBOL({ notas: primera.fechas }), { ahora: new Date('2026-10-05T08:00:00Z') });
  assert.equal(despues.notas.find((n) => n.id === 'futbolresultadosliga20261002').fecha, '2026-10-04T12:00:00.000Z');
});

const respuestas = (url) => {
  if (url.includes('/teams')) return { sports: [{ leagues: [{ teams: [{ team: { id: 'AR1' } }, { team: { id: 'AR2' } }] }] }] };
  if (url.includes('standings')) return tablaJson();
  const dia = url.match(/dates=(\d{8})/)?.[1];
  if (url.includes('conmebol.libertadores') && dia === '20261003') {
    return { events: [evento(11, '2026-10-03T22:00Z', PROGRAMADO, ['AR1', 'Estudiantes', 0], ['BR1', 'Flamengo', 0]), evento(12, '2026-10-03T23:00Z', PROGRAMADO, ['BR2', 'Palmeiras', 0], ['BR3', 'Fluminense', 0])] };
  }
  if (url.includes('arg.1') && dia === '20261003') return { events: [evento(1, '2026-10-03T17:45Z', FINAL, [8950, 'Defensa y Justicia', 3], [18, 'San Lorenzo', 0])] };
  return { events: [] };
};

test('traerFutbol: filtra los argentinos en las copas internacionales, no vuelve a pedir lo reciente y una API caída no rompe nada', async () => {
  const pedidos = [];
  const fetchFn = async (url) => { pedidos.push(url); return { ok: true, json: async () => respuestas(url) }; };
  const ahora = new Date('2026-10-03T21:00:00Z');
  const f = await traerFutbol({ fetchFn, ahora });
  assert.deepEqual(f.equipos.sort(), ['AR1', 'AR2']);
  assert.equal(f.partidos.liga.length, 1);
  assert.deepEqual(f.partidos.libertadores.map((p) => p.local.nombre), ['Estudiantes'], 'Palmeiras-Fluminense no es argentino');
  assert.equal(f.tabla.zonas.length, 2);
  assert.ok(pedidos.every((u) => u.startsWith('https://site.api.espn.com/apis/')));
  assert.ok(pedidos.some((u) => u.includes('apis/v2/sports/soccer/arg.1/standings')), 'la tabla va por /apis/v2/');
  assert.ok(Object.keys(f.diasTraidos.liga).every((d) => d !== '2026-10-03' && d !== '2026-10-02'), 'hoy y ayer no se anotan: se piden siempre');
  const antes = pedidos.length;
  const f2 = await traerFutbol({ antes: f, fetchFn, ahora: new Date('2026-10-03T21:05:00Z') });
  const nuevos = pedidos.slice(antes);
  assert.ok(!nuevos.some((u) => u.includes('/teams')), 'los equipos se piden una vez por día');
  assert.ok(!nuevos.some((u) => u.includes('standings')), 'la tabla no se vuelve a pedir enseguida');
  assert.ok(!nuevos.some((u) => u.includes('dates=20261006')), 'los días lejanos recién pedidos no se piden de nuevo');
  assert.ok(nuevos.some((u) => u.includes('dates=20261003')), 'pero hoy sí');
  assert.equal(f2.consultado, f.consultado, 'si no cambió nada, el archivo no cambia');
  // API caída: queda lo guardado.
  const caida = await traerFutbol({ antes: f2, fetchFn: async () => { throw new Error('sin red'); }, ahora: new Date('2026-10-03T23:00:00Z') });
  assert.equal(caida.partidos.liga.length, 1);
  assert.equal(caida.tabla.zonas.length, 2);
  const rota = await traerFutbol({ antes: f2, fetchFn: async () => ({ ok: true, json: async () => ({ cosa: 'rara' }) }), ahora: new Date('2026-10-03T23:30:00Z') });
  assert.equal(rota.partidos.liga.length, 0, 'una respuesta vacía sí reemplaza el día (no hay partidos)');
  const noOk = await traerFutbol({ antes: f2, fetchFn: async () => ({ ok: false, status: 503 }), ahora: new Date('2026-10-03T23:30:00Z') });
  assert.equal(noOk.partidos.liga.length, 1, 'un error 503 no borra nada');
});

test('conectado: generar-datos arma las notas de fútbol como propias, el workflow guarda futbol.json y la foto es la del estadio', () => {
  const gen = leer('web/scripts/generar-datos.mjs');
  assert.match(gen, /import \{ traerFutbol, notasDeFutbol, comoFutbolJson \} from '\.\.\/\.\.\/ingesta\/futbol\.mjs';/);
  assert.match(gen, /\.\.\.notasF1, \.\.\.notasFutbol, \.\.\.notasDePistas/);
  assert.match(gen, /n\.propia === 'futbol' && n\.lugarFoto \? `estadio \$\{n\.lugarFoto\}`/);
  assert.match(leer('.github/workflows/actualizar.yml'), /web\/data\/f1\.json web\/data\/futbol\.json/);
  assert.equal(COMPETENCIAS.length, 4);
  assert.deepEqual(COMPETENCIAS.filter((c) => c.soloArgentinos).map((c) => c.clave), ['libertadores', 'sudamericana']);
  assert.match(leer('ingesta/futbol.mjs'), /destacar a todos por igual/);
});

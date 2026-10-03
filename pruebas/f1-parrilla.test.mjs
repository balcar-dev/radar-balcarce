// La nota con la clasificación del sábado de F1 (3/10/2026, Hernán: "hoy estaría bueno armar la nota de la clasificación"). Sin red.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resumirParrilla, notaDeParrilla, notasDeF1, traerF1, HORAS_PARA_BUSCAR_PARRILLA, FIRMA_F1, FUENTE_F1,
} from '../ingesta/f1.mjs';

const piloto = (id, nombre, apellido) => ({ driverId: id, givenName: nombre, familyName: apellido, permanentNumber: '1' });
const PILOTOS = [
  ['max_verstappen', 'Max', 'Verstappen', 'Red Bull', '1:36.477', '1:35.696', '1:35.130'],
  ['hamilton', 'Lewis', 'Hamilton', 'Ferrari', '1:36.600', '1:35.800', '1:35.428'],
  ['hadjar', 'Isack', 'Hadjar', 'Red Bull', '1:36.700', '1:35.900', '1:35.558'],
  ['antonelli', 'Andrea Kimi', 'Antonelli', 'Mercedes', '1:36.8', '1:36.0', '1:35.7'],
  ['leclerc', 'Charles', 'Leclerc', 'Ferrari', '1:36.9', '1:36.1', '1:35.8'],
  ['norris', 'Lando', 'Norris', 'McLaren', '1:37.0', '1:36.2', '1:35.9'],
  ['piastri', 'Oscar', 'Piastri', 'McLaren', '1:37.1', '1:36.3', '1:36.0'],
  ['russell', 'George', 'Russell', 'Mercedes', '1:37.2', '1:36.4', '1:36.1'],
  ['gasly', 'Pierre', 'Gasly', 'Alpine F1 Team', '1:37.3', '1:36.5', '1:36.2'],
  ['bortoleto', 'Gabriel', 'Bortoleto', 'Audi', '1:37.4', '1:36.6', '1:36.3'],
  ['alonso', 'Fernando', 'Alonso', 'Aston Martin', '1:37.5', '1:36.7', null],
  ['albon', 'Alexander', 'Albon', 'Williams', '1:37.6', '1:36.8', null],
  ['colapinto', 'Franco', 'Colapinto', 'Alpine F1 Team', '1:37.179', null, null],
  ['stroll', 'Lance', 'Stroll', 'Aston Martin', '1:37.9', null, null],
];
const json = (extra = {}) => ({ MRData: { RaceTable: { Races: [{
  season: '2026', round: '16', raceName: 'Bahrain Grand Prix in Malaysia', date: '2026-10-04', time: '07:00:00Z',
  Circuit: { circuitName: 'Sepang International Circuit', Location: { locality: 'Kuala Lumpur', country: 'Malaysia' } },
  QualifyingResults: PILOTOS.map(([id, n, a, equipo, q1, q2, q3], i) => ({ number: String(i + 1), position: String(i + 1), Driver: piloto(id, n, a), Constructor: { name: equipo }, Q1: q1 ?? '', Q2: q2 ?? '', Q3: q3 ?? '' })),
  ...extra,
}] } } });

const FECHA = '2026-10-03T18:30:00.000Z';

test('la clasificación se resume con sus tiempos y se rechaza si está incompleta', () => {
  const p = resumirParrilla(json());
  assert.equal(p.ronda, 16);
  assert.equal(p.largada, '2026-10-04T07:00:00.000Z');
  assert.equal(p.filas.length, 14);
  assert.deepEqual(p.filas[0], { posicion: 1, piloto: 'Max Verstappen', colapinto: false, equipo: 'Red Bull', numero: '1', q1: '1:36.477', q2: '1:35.696', q3: '1:35.130' });
  assert.equal(p.filas.find((f) => f.colapinto).q2, null, 'sin Q2: quedó eliminado antes');
  assert.equal(resumirParrilla(json({ QualifyingResults: [] })), null);
  assert.equal(resumirParrilla(json({ QualifyingResults: json().MRData.RaceTable.Races[0].QualifyingResults.slice(0, 5) })), null, 'con pocas filas todavía no está completa');
  assert.equal(resumirParrilla(null), null);
  assert.equal(resumirParrilla(json({ time: undefined })), null, 'sin hora de largada no hay horario que dar');
});

test('la nota dice la pole, la primera fila con las diferencias, los diez primeros, a Colapinto y cuándo es la carrera, en hora argentina', () => {
  const n = notaDeParrilla(resumirParrilla(json()), { colapinto: { piloto: 'Franco Colapinto' }, fecha: FECHA });
  assert.equal(n.id, 'f1parrilla2026r16');
  assert.equal(n.propia, 'f1');
  assert.equal(n.tipoF1, 'parrilla');
  assert.equal(n.seccion, 'Automovilismo');
  assert.match(n.titulo, /^F1: Max Verstappen largará desde la pole en el Gran Premio de Baréin en Malasia/);
  assert.match(n.cuerpo, /con una vuelta de 1:35,130/);
  assert.match(n.cuerpo, /Lewis Hamilton \(Ferrari\) a 0,298 segundos/);
  assert.match(n.cuerpo, /Isack Hadjar \(Red Bull\) a 0,428 segundos/);
  assert.match(n.cuerpo, /1º Max Verstappen, 2º Lewis Hamilton/);
  assert.match(n.cuerpo, /10º Gabriel Bortoleto\./);
  assert.ok(!n.cuerpo.includes('11º'), 'sólo los diez primeros');
  assert.match(n.cuerpo, /Franco Colapinto, con Alpine F1 Team, largará desde el puesto 13: quedó eliminado en la Q1, con 1:37,179 como mejor tiempo/);
  assert.match(n.cuerpo, /domingo 4 de octubre y largará a las 04:00, hora argentina/);
  assert.match(n.cuerpo, /Jolpica F1 \(datos abiertos\)/);
  assert.match(n.cuerpo, /Fangio/);
  assert.equal(n.firma, FIRMA_F1);
  assert.deepEqual(n.fuentesConsultadas, [FUENTE_F1]);
  assert.equal(n.fecha, FECHA);
  assert.deepEqual(n.etiquetas.includes('Franco Colapinto'), true);
  assert.equal(n.guion, null);
});

test('Colapinto en Q2 o en Q3 y sin Colapinto: cada caso dice lo que pasó y no inventa', () => {
  const con = (q2, q3) => {
    const p = resumirParrilla(json());
    const c = p.filas.find((f) => f.colapinto);
    c.q2 = q2; c.q3 = q3;
    return notaDeParrilla(p, { colapinto: { piloto: 'Franco Colapinto' }, fecha: FECHA }).cuerpo;
  };
  assert.match(con('1:37.0', null), /quedó eliminado en la Q2/);
  assert.match(con('1:37.0', '1:36.9'), /llegó a la Q3/);
  const sin = resumirParrilla(json());
  sin.filas = sin.filas.filter((f) => !f.colapinto);
  assert.match(notaDeParrilla(sin, { colapinto: { piloto: 'Franco Colapinto' }, fecha: FECHA }).cuerpo, /no figura en la clasificación/);
  const nadie = notaDeParrilla(sin, { colapinto: null, fecha: FECHA });
  assert.ok(!/Colapinto/.test(nadie.cuerpo + nadie.copete), 'si no corre, no se lo nombra');
  assert.equal(notaDeParrilla({ filas: [] }, { fecha: FECHA }), null);
  assert.equal(notaDeParrilla(resumirParrilla(json()), {}), null, 'sin fecha no hay nota');
  const sinTiempos = resumirParrilla(json());
  for (const f of sinTiempos.filas) { f.q1 = null; f.q2 = null; f.q3 = null; }
  assert.ok(!/segundos/.test(notaDeParrilla(sinTiempos, { fecha: FECHA }).cuerpo), 'sin tiempos no se inventan diferencias');
});

const CARRERA = {
  ronda: 16, nombre: 'Bahrain Grand Prix in Malaysia', circuito: 'Sepang International Circuit', localidad: 'Kuala Lumpur', pais: 'Malaysia', largada: '2026-10-04T07:00:00.000Z',
  sesiones: [
    { clave: 'FirstPractice', nombre: 'Práctica libre 1', inicio: '2026-10-02T04:30:00.000Z' },
    { clave: 'Qualifying', nombre: 'Clasificación', inicio: '2026-10-03T08:00:00.000Z' },
    { clave: 'Race', nombre: 'Carrera', inicio: '2026-10-04T07:00:00.000Z' },
  ],
};
const f1 = (extra = {}) => ({ calendario: { temporada: 2026, carreras: [CARRERA] }, pilotos: { temporada: 2026, colapinto: { piloto: 'Franco Colapinto', numero: '43' } }, parrilla: resumirParrilla(json()), notas: {}, ...extra });
const AR = (iso) => new Date(iso);

test('la nota sale cuando termina la clasificación y hasta 3 horas después de la largada; antes y después, no', () => {
  const ids = (ahora) => notasDeF1(f1(), { ahora }).notas.map((n) => n.id).filter((id) => id.includes('parrilla'));
  assert.deepEqual(ids(AR('2026-10-03T07:59:00Z')), [], 'antes de que empiece la clasificación');
  assert.deepEqual(ids(AR('2026-10-03T18:30:00Z')), ['f1parrilla2026r16'], 'ya con la parrilla');
  assert.deepEqual(ids(AR('2026-10-04T08:30:00Z')), ['f1parrilla2026r16'], 'después de la largada, un rato');
  assert.deepEqual(ids(AR('2026-10-04T10:30:00Z')), [], '3 horas después de la largada se va');
  assert.deepEqual(notasDeF1(f1({ parrilla: null }), { ahora: AR('2026-10-03T18:30:00Z') }).notas.filter((n) => n.id.includes('parrilla')), [], 'sin parrilla no hay nota');
});

test('la nota tiene una sola fecha: la de la primera vez que se vio, y no rejuvenece', () => {
  const primera = notasDeF1(f1(), { ahora: AR('2026-10-03T18:30:00Z') });
  assert.equal(primera.fechas.f1parrilla2026r16, '2026-10-03T18:30:00.000Z');
  const despues = notasDeF1(f1({ notas: primera.fechas }), { ahora: AR('2026-10-04T01:00:00Z') });
  assert.equal(despues.notas.find((n) => n.id === 'f1parrilla2026r16').fecha, '2026-10-03T18:30:00.000Z');
});

test('traerF1 busca la clasificación sólo después de que termina y antes de la carrera, una sola vez, y una API caída no rompe nada', async () => {
  const pedidos = [];
  const respuesta = (url) => {
    pedidos.push(url);
    if (url.includes('qualifying')) return json();
    if (url.includes('drivers')) return { MRData: { DriverTable: { Drivers: [piloto('colapinto', 'Franco', 'Colapinto')] } } };
    return { MRData: { RaceTable: { season: '2026', Races: [{
      season: '2026', round: '16', raceName: 'Bahrain Grand Prix in Malaysia', date: '2026-10-04', time: '07:00:00Z',
      Circuit: { circuitName: 'Sepang International Circuit', Location: { locality: 'Kuala Lumpur', country: 'Malaysia' } },
      Qualifying: { date: '2026-10-03', time: '08:00:00Z' }, FirstPractice: { date: '2026-10-02', time: '04:30:00Z' },
    }] } } };
  };
  const fetchFn = async (url) => ({ ok: true, json: async () => respuesta(url) });
  const antes = await traerF1({ fetchFn, ahora: AR('2026-10-03T08:30:00Z') });
  assert.equal(antes.parrilla, null, 'la clasificación todavía no terminó (empezó hace media hora)');
  assert.ok(!pedidos.some((u) => u.includes('qualifying')));
  assert.ok(HORAS_PARA_BUSCAR_PARRILLA >= 1);
  const ya = await traerF1({ antes, fetchFn, ahora: AR('2026-10-03T18:30:00Z') });
  assert.equal(ya.parrilla?.ronda, 16);
  assert.equal(pedidos.filter((u) => u.includes('qualifying')).length, 1);
  assert.ok(pedidos.find((u) => u.includes('qualifying')).includes('/16/qualifying.json'));
  const otra = await traerF1({ antes: ya, fetchFn, ahora: AR('2026-10-03T19:00:00Z') });
  assert.equal(pedidos.filter((u) => u.includes('qualifying')).length, 1, 'ya la tiene: no la vuelve a pedir');
  assert.equal(otra.parrilla.ronda, 16);
  const caida = await traerF1({ antes: { ...antes, parrilla: null, calendarioCuando: new Date('2026-10-03T18:00:00Z').toISOString() }, fetchFn: async () => { throw new Error('sin red'); }, ahora: AR('2026-10-03T18:30:00Z') });
  assert.equal(caida.parrilla, null, 'la API caída no rompe: queda lo guardado');
  const lejos = await traerF1({ antes: ya, fetchFn, ahora: AR('2026-10-04T08:30:00Z') });
  assert.equal(lejos.parrilla.ronda, 16, 'después de la largada se conserva');
});

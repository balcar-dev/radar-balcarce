// El cronograma de la semana con la voz de cada pieza y el conteo de audios (1/10/2026).
process.env.TZ = 'America/Argentina/Buenos_Aires';
import test from 'node:test';
import assert from 'node:assert/strict';
import { cronogramaDeLaSemana, cronogramaDelDiaConVoz, textoDelCronograma, CUPO_DE_VOZ_POR_DIA, leerFijas } from '../redes/cronograma-semana.mjs';

const semana = cronogramaDeLaSemana('2026-10-05', 8, { conEfemeride: true });

test('la semana del 5 al 12/10 tiene ocho días y todas las piezas tienen voz', () => {
  assert.deepEqual(semana.map((d) => d.fecha), ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12']);
  for (const d of semana) for (const p of d.piezas) assert.notEqual(p.voz, 'SIN VOZ', `${d.fecha} ${p.nombre}`);
});

test('"Un día como hoy" sale todos los días a las 9:00 con la locutora, también el feriado, que sale antes, a las 8:00', () => {
  for (const d of semana) {
    const e = d.piezas.find((p) => p.nombre === 'efemeride');
    assert.equal(e?.hora, '09:00', d.fecha);
    assert.equal(e.voz, 'la locutora');
  }
  const feriado = semana.at(-1);
  assert.equal(feriado.fecha, '2026-10-12');
  assert.ok(feriado.feriado);
  assert.equal(feriado.piezas.find((p) => p.nombre === 'feriado').hora, '08:00');
});

test('el horario que acordaron el 1/10: clima 7, feriado 8, efeméride 9, repaso 10, mediodía 12, repaso 15, farmacia 19, clima 20, repaso final 21', () => {
  const horas = (iso) => Object.fromEntries(cronogramaDelDiaConVoz(iso, { conEfemeride: true }).piezas.map((p) => [p.nombre, p.hora]));
  const lunes = horas('2026-10-05');
  assert.deepEqual([lunes['clima-manana'], lunes.efemeride, lunes.noticia1, lunes['participa-noticias'], lunes.noticia2, lunes.farmacia, lunes['clima-noche'], lunes.podcast],
    ['07:00', '09:00', '10:00', '12:00', '15:00', '19:00', '20:00', '21:00']);
  assert.equal(horas('2026-10-12').feriado, '08:00');
  assert.equal(horas('2026-10-10').utiles, '17:00', 'los útiles, los sábados a las 17');
  assert.equal(horas('2026-10-06').utiles, undefined, 'y no los martes');
  assert.equal(horas('2026-10-08').agenda, '12:00', 'la agenda del jueves, al mediodía');
});

test('los audios por día: siete, ocho o nueve (el feriado, con participá, es el más cargado), nunca más del cupo', () => {
  const por = Object.fromEntries(semana.map((d) => [d.fecha, d.audios]));
  assert.deepEqual(por, {
    '2026-10-05': 8, '2026-10-06': 8, '2026-10-07': 8, '2026-10-08': 8, '2026-10-09': 8, '2026-10-10': 8, '2026-10-11': 7, '2026-10-12': 9,
  });
  for (const d of semana) assert.ok(d.audios <= CUPO_DE_VOZ_POR_DIA, d.fecha);
});

test('el reloj trae la efeméride sólo los días que la tienen preparada (web/data/efemerides-piezas.json)', () => {
  const preparado = cronogramaDelDiaConVoz('2026-10-05');
  assert.ok(preparado.piezas.some((p) => p.nombre === 'efemeride'), 'el 5/10 está preparada: sale');
  assert.equal(preparado.audios, 8);
  const sinPreparar = cronogramaDelDiaConVoz('2026-11-16');
  assert.ok(!sinPreparar.piezas.some((p) => p.nombre === 'efemeride'), 'un día sin entrada no sale nada');
  assert.equal(sinPreparar.audios, 7);
});

test('el texto marca cuánto sobra del cupo', () => {
  const t = textoDelCronograma(semana);
  assert.match(t, /Audios del día: \*\*9 de 10\*\* \(sobran 1\)/);
  assert.match(t, /Un día como hoy \(nueva\)/);
  assert.match(t, /FERIADO/);
});

test('las piezas fijas (armadas de antemano) no gastan audio ese día', () => {
  const fijas = ['participa-noticias', 'participa-evento', 'participa-reclamos', 'participa-nota'];
  const s = cronogramaDeLaSemana('2026-10-05', 8, { conEfemeride: true, fijas });
  const por = Object.fromEntries(s.map((d) => [d.fecha, d.audios]));
  assert.deepEqual(por, {
    '2026-10-05': 7, '2026-10-06': 7, '2026-10-07': 7, '2026-10-08': 8, '2026-10-09': 7, '2026-10-10': 8, '2026-10-11': 7, '2026-10-12': 8,
  });
  assert.ok(Math.max(...Object.values(por)) <= 8, 'con las de participá fijas, nunca más de 8 audios por día');
  assert.match(textoDelCronograma(s), /fija, sin voz nueva/);
});

test('las fijas con rango valen sólo dentro de su vigencia (como reels/fijas/vigencia.json)', () => {
  const fijas = leerFijas('participa-nota:2026-10-02:2026-10-15,participa-noticias');
  assert.deepEqual(fijas, [{ nombre: 'participa-nota', desde: '2026-10-02', hasta: '2026-10-15' }, 'participa-noticias']);
  const fija = (iso) => cronogramaDelDiaConVoz(iso, { fijas }).piezas.find((p) => p.nombre.startsWith('participa'))?.fija;
  assert.equal(fija('2026-10-09'), true, 'viernes dentro de la vigencia');
  assert.equal(fija('2026-10-16'), false, 'viernes pasada la vigencia: vuelve a gastar voz');
  assert.equal(fija('2026-10-05'), true, 'participa-noticias, sin rango, vale siempre');
});

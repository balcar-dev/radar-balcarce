// El cronograma de la semana con la voz de cada pieza y el conteo de audios (1/10/2026).
process.env.TZ = 'America/Argentina/Buenos_Aires';
import test from 'node:test';
import assert from 'node:assert/strict';
import { cronogramaDeLaSemana, cronogramaDelDiaConVoz, textoDelCronograma, CUPO_DE_VOZ_POR_DIA } from '../redes/cronograma-semana.mjs';

const semana = cronogramaDeLaSemana('2026-10-05', 8, { conEfemeride: true });

test('la semana del 5 al 12/10 tiene ocho días y todas las piezas tienen voz', () => {
  assert.deepEqual(semana.map((d) => d.fecha), ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12']);
  for (const d of semana) for (const p of d.piezas) assert.notEqual(p.voz, 'SIN VOZ', `${d.fecha} ${p.nombre}`);
});

test('"Un día como hoy" sale a las 9:00 con la locutora, salvo el feriado, que la reemplaza', () => {
  for (const d of semana.filter((x) => !x.feriado)) {
    const e = d.piezas.find((p) => p.nombre === 'efemeride');
    assert.equal(e?.hora, '09:00', d.fecha);
    assert.equal(e.voz, 'la locutora');
  }
  const feriado = semana.at(-1);
  assert.equal(feriado.fecha, '2026-10-12');
  assert.ok(feriado.feriado);
  assert.ok(!feriado.piezas.some((p) => p.nombre === 'efemeride'), 'el feriado reemplaza a la efeméride');
  assert.equal(feriado.piezas.find((p) => p.nombre === 'feriado').hora, '09:00');
});

test('los audios por día: ocho o nueve, nunca más del cupo (martes, con los útiles, es el más cargado)', () => {
  const por = Object.fromEntries(semana.map((d) => [d.fecha, d.audios]));
  assert.deepEqual(por, {
    '2026-10-05': 8, '2026-10-06': 9, '2026-10-07': 8, '2026-10-08': 8, '2026-10-09': 8, '2026-10-10': 7, '2026-10-11': 7, '2026-10-12': 8,
  });
  for (const d of semana) assert.ok(d.audios <= CUPO_DE_VOZ_POR_DIA, d.fecha);
});

test('sin la efeméride, el cronograma es el de hoy del reloj', () => {
  const hoy = cronogramaDelDiaConVoz('2026-10-05');
  assert.ok(!hoy.piezas.some((p) => p.nombre === 'efemeride'));
  assert.equal(hoy.audios, 7);
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
    '2026-10-05': 7, '2026-10-06': 8, '2026-10-07': 7, '2026-10-08': 8, '2026-10-09': 7, '2026-10-10': 7, '2026-10-11': 7, '2026-10-12': 7,
  });
  assert.ok(Math.max(...Object.values(por)) <= 8, 'con las de participá fijas, nunca más de 8 audios por día');
  assert.match(textoDelCronograma(s), /fija, sin voz nueva/);
});

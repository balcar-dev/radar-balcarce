// El cronograma como imagen (1/10/2026): quién dice cada pieza, cuántos audios gasta el día.
process.env.TZ = 'America/Argentina/Buenos_Aires';
import test from 'node:test';
import assert from 'node:assert/strict';
import { hojaDelCronograma, colorDePieza } from '../reels/hoja-cronograma.mjs';
import { cronogramaDeLaSemana } from '../redes/cronograma-semana.mjs';

const semana = cronogramaDeLaSemana('2026-10-05', 8, { conEfemeride: true, fijas: ['participa-noticias'] });
const svg = hojaDelCronograma(semana);

test('la hoja tiene un día por tarjeta, con la voz de cada pieza y el cupo', () => {
  assert.match(svg, /^<svg /);
  for (const dia of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']) assert.ok(svg.includes(dia), dia);
  assert.ok(svg.includes('LOCUTORA') && svg.includes('LOCUTOR'));
  assert.ok(svg.includes('NUEVA'), 'la efeméride se marca como nueva');
  assert.ok(svg.includes('FIJA'), 'la pieza armada de antemano se marca');
  assert.ok(svg.includes('FERIADO') && svg.includes('Día del Respeto a la Diversidad Cultural'));
  assert.match(svg, /\d de 10 audios/);
  assert.ok(!svg.includes('SIN VOZ'));
});

test('el color de cada pieza es el de su tema', () => {
  assert.notEqual(colorDePieza('efemeride'), colorDePieza('farmacia'));
  assert.equal(colorDePieza('participa-nota'), colorDePieza('participa-evento'));
  assert.equal(colorDePieza('noticia1'), colorDePieza('podcast'));
});

test('un texto con caracteres raros no rompe la imagen', () => {
  const s = cronogramaDeLaSemana('2026-10-05', 1);
  s[0].piezas[0].titulo = 'Clima <b> & "viento"';
  assert.ok(!hojaDelCronograma(s).includes('<b>'));
});

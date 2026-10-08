// Dónde sale cada pieza (8/10/2026, aprobado; se mide cuatro semanas): lo que tiene voz sale como reel y, con el mismo video, como historia en las dos
// redes; el clima y la farmacia, historia (y en Facebook, también reel). Los podcasts y la efeméride ya eran reel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SALE_COMO_REEL, TAMBIEN_REEL_EN_FACEBOOK, cronogramaDelDia, EXTRAS_DE_HISTORIAS } from '../redes/piezas.mjs';
import { planDelDia } from '../reels/plan.mjs';

const DATOS = {
  clima: { ahora: { temp: 14, sensacion: 13, viento: 12, rumbo: 'O', cielo: 'Nublado' }, dias: [{ fecha: '2026-10-09', max: 20, min: 9, lluvia: 30, codigo: 3, viento: 15 }, { fecha: '2026-10-10', max: 19, min: 8, lluvia: 10, codigo: 1, viento: 12 }] },
  farmacias: { turnos: [{ dia: 9, farmacias: ['DEL PUEBLO'], diaSemana: 'x', detalle: [{ nombre: 'DEL PUEBLO', direccion: 'Calle 17 N° 1140' }] }] },
  notas: [],
};
const A = (iso, hora = '06:00') => new Date(`${iso}T${hora}:00-03:00`);

test('qué sale como reel y qué sólo como historia', () => {
  for (const n of ['efemeride', 'feriado', 'agenda', 'utiles', 'participa-noticias', 'participa-evento', 'participa-reclamos', 'participa-nota']) assert.ok(SALE_COMO_REEL(n), n);
  for (const n of ['clima-manana', 'clima-noche', 'farmacia', 'aviso-helada', 'noticia1']) assert.ok(!SALE_COMO_REEL(n), n);
  assert.deepEqual(TAMBIEN_REEL_EN_FACEBOOK, ['clima-manana', 'clima-noche', 'farmacia']);
  assert.ok(EXTRAS_DE_HISTORIAS.includes('participa-nota'), 'siguen siendo lo primero que saca el tope de historias');
});

test('el cronograma dice que el feriado, la agenda y Participá son reel, y el clima y la farmacia historia', () => {
  const dia = cronogramaDelDia(A('2026-10-09'));
  const tipo = (n) => dia.find((p) => p.nombre === n)?.tipo;
  assert.equal(tipo('clima-manana'), 'historia');
  assert.equal(tipo('farmacia'), 'historia');
  assert.equal(tipo('efemeride'), 'reel');
  // El viernes toca "Tu nota"; el jueves, la agenda.
  assert.equal(tipo('participa-nota'), 'reel');
  assert.equal(cronogramaDelDia(A('2026-10-08')).find((p) => p.nombre === 'agenda')?.tipo, 'reel');
});

test('el plan arma Participá como reel y el clima y la farmacia como historia con reel en Facebook', () => {
  const { piezas } = planDelDia(DATOS, { fecha: A('2026-10-09'), estado: {} });
  const por = Object.fromEntries(piezas.map((p) => [p.nombre, p]));
  assert.equal(por['participa-nota'].tipo, 'reel');
  for (const n of ['clima-manana', 'clima-noche', 'farmacia']) {
    assert.equal(por[n].tipo, 'historia', n);
    assert.equal(por[n].reelEnFacebook, true, `${n}: también reel en Facebook`);
  }
  assert.ok(!por['participa-nota'].reelEnFacebook);
});

// Las escenas animadas en las piezas de todos los días (9/10/2026, regla 157): cada pieza del plan lleva su escena y, si no se puede armar, sale con
// su placa de siempre. Se comprueba sin ffmpeg ni voz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planDelDia } from '../reels/plan.mjs';
import { tipoDeEfemeride, tipoDeFeriado, escenaDelClima, escenaDelFeriado, escenaDeLaFarmacia } from '../reels/escenas/del-plan.mjs';
import { partirSvg } from '../reels/animacion.mjs';

const leer = (r) => JSON.parse(fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8'));

test('el tipo de una efeméride sale de lo que dice, y sin pistas es historia', () => {
  assert.equal(tipoDeEfemeride({ titulo: 'Se declara la Independencia argentina' }), 'patria');
  assert.equal(tipoDeEfemeride({ titulo: 'Nace Juan Manuel Fangio, en Balcarce' }), 'balcarce');
  assert.equal(tipoDeEfemeride({ titulo: 'Se sanciona el Estatuto del Peón rural' }), 'campo');
  assert.equal(tipoDeEfemeride({ titulo: 'Houssay recibe el Premio Nobel de Medicina' }), 'ciencia');
  assert.equal(tipoDeEfemeride({ titulo: 'Argentina, campeona del mundo' , cuerpo: 'El Mundial de fútbol'}), 'deporte');
  assert.equal(tipoDeEfemeride({ titulo: 'Nace Atahualpa Yupanqui', cuerpo: 'Cantor y compositor' }), 'cultura');
  assert.equal(tipoDeEfemeride({ titulo: 'Se funda una ciudad' }), 'historia');
});

test('el tipo de un feriado: decreto, trasladable, religioso, Carnaval o patrio', () => {
  assert.equal(tipoDeFeriado({ nombre: 'Feriado por la visita del papa', tipo: 'decreto' }), 'decreto');
  assert.equal(tipoDeFeriado({ nombre: 'Día de la Soberanía Nacional', tipo: 'trasladable' }), 'trasladable');
  assert.equal(tipoDeFeriado({ nombre: 'Navidad', tipo: 'inamovible' }), 'religioso');
  assert.equal(tipoDeFeriado({ nombre: 'Carnaval', tipo: 'inamovible' }), 'carnaval');
  assert.equal(tipoDeFeriado({ nombre: 'Día de la Revolución de Mayo', tipo: 'inamovible' }), 'patrio');
});

test('las escenas del plan se arman con datos de verdad y, sin datos, devuelven null (sale la placa)', () => {
  const portada = leer('web/data/portada.json');
  const fecha = new Date('2026-10-09T13:00:00Z');
  const e = escenaDelClima({ momento: 'manana', clima: portada.clima, fecha });
  assert.ok(e && partirSvg(e.cuadro(3)), 'el clima de hoy tiene escena');
  assert.equal(escenaDelClima({ momento: 'manana', clima: null, fecha }), null);
  assert.equal(escenaDeLaFarmacia({ turno: null, fecha, hasta: 'x' }), null);
  assert.equal(escenaDelFeriado({ feriado: null }), null);
  const f = leer('web/data/feriados-piezas.json').feriados[0];
  assert.ok(escenaDelFeriado({ feriado: f, dato: f.datos[0].texto }), 'un feriado con datos tiene escena');
});

test('REELS_ESCENAS=no las apaga todas: las piezas salen con la placa de siempre', () => {
  const antes = process.env.REELS_ESCENAS;
  process.env.REELS_ESCENAS = 'no';
  try {
    const portada = leer('web/data/portada.json');
    assert.equal(escenaDelClima({ momento: 'manana', clima: portada.clima, fecha: new Date() }), null);
  } finally { if (antes === undefined) delete process.env.REELS_ESCENAS; else process.env.REELS_ESCENAS = antes; }
});

test('cada pieza de servicio del plan lleva su escena y conserva su placa de respaldo', () => {
  const portada = leer('web/data/portada.json');
  const fecha = new Date('2026-10-10T15:00:00Z'); // sábado: toca "útiles"
  const { piezas: plan } = planDelDia({
    clima: portada.clima, farmacias: { turnos: [portada.farmacias.hoy] }, notas: [], yaPublicadas: true,
  }, { fecha, forzar: ['clima-manana', 'clima-noche', 'farmacia', 'utiles'] });
  for (const nombre of ['clima-manana', 'clima-noche', 'utiles']) {
    const p = plan.find((x) => x.nombre === nombre);
    assert.ok(p, `${nombre} está en el plan`);
    assert.ok(p.svg, `${nombre} conserva la placa de respaldo`);
    assert.ok(p.escena && typeof p.escena.cuadro === 'function', `${nombre} lleva su escena animada`);
  }
});

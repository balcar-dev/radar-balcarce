// La locución con memoria del día (8/10/2026, aprobada): la primera pieza de cada franja saluda y las que salen enseguida empiezan con un
// puente, en vez de tres "Buenas noches, Balcarce" seguidos entre las 19 y las 21.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  conMemoriaDelDia, SALUDO_AL_PRINCIPIO, MINUTOS_ENTRE_SALUDOS, PUENTES, SALUDOS, revisarTexto,
} from '../redes/guiones.mjs';
import { momentoDeHora } from '../redes/prompt-redes.mjs';

const FECHA = new Date('2026-10-08T15:00:00-03:00');
const pieza = (nombre, hora, guion, extra = {}) => ({ nombre, hora, guion, ...extra });

test('el saludo se reconoce completo, con lo que le sigue hasta el punto', () => {
  for (const franja of Object.values(SALUDOS)) for (const s of franja) assert.ok(SALUDO_AL_PRINCIPIO.test(s), s);
  assert.equal('Buen día, Balcarce, vamos con lo que hay. Hoy llueve.'.replace(SALUDO_AL_PRINCIPIO, ''), 'Hoy llueve.');
  assert.equal('Buenas noches, Balcarce, ¿cómo estuvo el día? Esto pasó.'.replace(SALUDO_AL_PRINCIPIO, ''), 'Esto pasó.');
  assert.ok(!SALUDO_AL_PRINCIPIO.test('Un día como hoy, hace cien años.'));
});

test('entre las 19 y las 21 saluda sólo la primera: la farmacia saluda, el clima y el repaso siguen con un puente', () => {
  const piezas = [
    pieza('noticia-noche', '21:00', 'Buenas noches, Balcarce, ¿cómo estuvo el día? Esto fue lo que pasó. Que descansen. Radar Balcarce.'),
    pieza('clima-noche', '20:00', 'Buenas noches, Balcarce. Mañana amanece fresco. Radar Balcarce.'),
    pieza('farmacia', '19:00', 'Buenas noches, Balcarce. La farmacia de turno es la del centro. Radar Balcarce.'),
  ];
  const cambiadas = conMemoriaDelDia(piezas, momentoDeHora, { fecha: FECHA });
  assert.deepEqual(cambiadas.sort(), ['clima-noche', 'noticia-noche']);
  const [repaso, clima, farmacia] = piezas;
  assert.match(farmacia.guion, /^Buenas noches, Balcarce\./);
  for (const p of [clima, repaso]) {
    assert.ok(!/buenas noches/i.test(p.guion), p.guion);
    assert.ok(PUENTES.some((x) => p.guion.startsWith(x)), p.guion);
    assert.deepEqual(revisarTexto(p.guion, { tipo: 'voz', momento: 'noche' }), [], 'sigue cumpliendo las reglas de la voz');
  }
  assert.match(clima.guion, /Mañana amanece fresco\. Radar Balcarce\.$/, 'el resto del guion queda intacto');
});

test('pasado el tiempo, la franja vuelve a saludar; y una franja distinta saluda por su cuenta', () => {
  const piezas = [
    pieza('clima-manana', '07:00', 'Buen día, Balcarce. Hoy hay sol. Radar Balcarce.'),
    pieza('efemeride', '09:00', 'Buen día, Balcarce. Un día como hoy, en 1872. Radar Balcarce.'),
    pieza('noticia1', '10:00', 'Buen día, Balcarce, vamos con lo que hay. Esto pasó. Radar Balcarce.'),
    pieza('noticia2', '15:00', 'Buenas tardes, Balcarce. Esto pasó por la tarde. Radar Balcarce.'),
  ];
  const cambiadas = conMemoriaDelDia(piezas, momentoDeHora, { fecha: FECHA });
  assert.deepEqual(cambiadas, ['efemeride'], 'sólo la de las 9 está a menos de 150 minutos de la de las 7');
  assert.match(piezas[2].guion, /^Buen día, Balcarce, vamos con lo que hay\./, 'a las 10 (tres horas después) vuelve a saludar');
  assert.match(piezas[3].guion, /^Buenas tardes, Balcarce\./, 'la tarde saluda por su cuenta');
  assert.ok(MINUTOS_ENTRE_SALUDOS === 150);
});

test('un aviso de clima, lo que no empieza saludando y lo que no sale no se tocan ni cuentan', () => {
  const piezas = [
    pieza('aviso-helada', '07:00', 'Buen día, Balcarce. Hay una helada fuerte. Radar Balcarce.'),
    pieza('feriado', '08:00', 'Hoy se conmemora el Día de la Raza. Radar Balcarce.'),
    pieza('farmacia', '08:30', 'Buen día, Balcarce. La farmacia de turno. Radar Balcarce.', { fueraDeTecho: true }),
    pieza('clima-manana', '09:00', 'Buen día, Balcarce. Hoy hay sol. Radar Balcarce.'),
  ];
  const antes = piezas.map((p) => p.guion);
  const cambiadas = conMemoriaDelDia(piezas, momentoDeHora, { fecha: FECHA });
  assert.deepEqual(cambiadas, []);
  assert.deepEqual(piezas.map((p) => p.guion), antes);
});

test('el plan del día aplica la memoria en las dos salidas (con la portada vieja también)', () => {
  const plan = fs.readFileSync(new URL('../reels/plan.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal([...plan.matchAll(/conMemoriaDelDia\(piezas, momentoDeHora, \{ fecha \}\)/g)].length, 2);
  const ruta = plan.indexOf('return { piezas, turno, portadaVieja: true }');
  assert.ok(plan.lastIndexOf('conMemoriaDelDia(', ruta) > plan.lastIndexOf('splice', ruta), 'después de sacar lo que envejece');
});

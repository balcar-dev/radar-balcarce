// El rediseño de las placas (30/09): participá con franja verde, listas con rasgo grande y un solo cierre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placaParticipa, placaLista, placaClima, placaFarmacia, COLOR_SECCION, anchoAproximado } from '../reels/placa.mjs';

test('participá lleva la franja verde con el número de WhatsApp y el cierre de siempre', () => {
  const svg = placaParticipa({ rotulo: 'Tu evento', pregunta: '¿Tenés un evento o un emprendimiento?', pie1: 'Contanos qué, cuándo y dónde.' });
  assert.ok(svg.includes(`fill="${COLOR_SECCION.WhatsApp}"`));
  assert.match(svg, /2266 51-1612/);
  assert.match(svg, /Escribinos por WhatsApp/i);
  assert.match(svg, /radarbalcarce\.com/);
});

test('la pregunta de participá nunca se sale del ancho, ni con una palabra larga', () => {
  const svg = placaParticipa({ rotulo: 'Tu reclamo', pregunta: '¿Hay algo en tu cuadra que hace rato espera arreglo, como la iluminación?' });
  for (const [, tam, texto] of svg.matchAll(/font-size="(\d+)"[^>]*>([^<]{6,})<\/text>/g)) {
    if (Number(tam) < 70) continue;
    assert.ok(anchoAproximado(texto, Number(tam), 'serif') <= 936 + 4, `"${texto}" no entra`);
  }
});

test('una lista con rasgo grande dibuja el rasgo en el color de la pieza', () => {
  const svg = placaLista({ rotulo: 'Descuentos de hoy', titulo: 'Martes en Balcarce', color: COLOR_SECCION.Economía, filas: [{ rasgo: '20%', rotulo: 'Cuenta DNI', principal: 'Comercios de barrio', secundario: 'Tope de $6.000' }] });
  assert.match(svg, />20%</);
  assert.ok(svg.includes(`fill="${COLOR_SECCION.Economía}"`));
});

test('el clima y la farmacia cierran igual que las demás: raya, firma a la izquierda y dirección a la derecha', () => {
  const clima = placaClima({ temp: 13, cielo: 'Nublado', max: 13, min: 7, fecha: 'Miércoles 30 de septiembre' });
  const farmacia = placaFarmacia({ detalle: [{ nombre: 'Marioli' }], diaSemana: 'miercoles', dia: 30, mes: 9 });
  for (const svg of [clima, farmacia]) {
    assert.match(svg, /y="1478" width="936" height="3"/);
    assert.ok(!/text-anchor="middle"[^>]*>\s*radarbalcarce\.com/.test(svg), 'la dirección no va centrada');
  }
});

// ---- el cronograma: lunes noticias, martes evento, miércoles reclamos, viernes nota, a las 12:00
import { cronogramaDelDia } from '../redes/piezas.mjs';
import { PIEZAS_PARTICIPA, guionParticipa } from '../redes/participa.mjs';

test('cada día toca su pieza de participá, a las 12:00, y jueves y fines de semana ninguna', () => {
  const dia = (f) => cronogramaDelDia(new Date(`${f}T12:00:00-03:00`)).filter((p) => p.nombre.startsWith('participa')).map((p) => `${p.nombre}@${p.hora}`);
  assert.deepEqual(dia('2026-10-05'), ['participa-noticias@12:00']); // lunes
  assert.deepEqual(dia('2026-10-06'), ['participa-evento@12:00']);
  assert.deepEqual(dia('2026-10-07'), ['participa-reclamos@12:00']);
  assert.deepEqual(dia('2026-10-08'), []); // jueves: la agenda
  assert.deepEqual(dia('2026-10-09'), ['participa-nota@12:00']);
  assert.deepEqual(dia('2026-10-10'), []);
  assert.deepEqual(dia('2026-10-11'), []);
});

test('el guion de participá saluda, hace la pregunta y manda al número de la pantalla, sin leerlo', () => {
  for (const id of Object.keys(PIEZAS_PARTICIPA)) {
    const g = guionParticipa(id, { fecha: new Date('2026-10-05T12:00:00-03:00'), momento: 'manana' });
    assert.match(g, /^Buen día/);
    assert.match(g, /WhatsApp/);
    assert.ok(!/\d{4}/.test(g), 'el número no se lee en voz alta');
  }
});

// interpretar(): cómo se traduce la respuesta de Open-Meteo a lo que muestra
// la web.
//
// El 20/09 la tarjeta grande y la pastilla de arriba mostraban un grado de
// diferencia porque cada una pedía el clima por su cuenta, en momentos
// distintos. Ahora las dos leen de acá — así que si esta función redondea o
// interpreta mal un dato, se equivocan las dos IGUAL, y al menos no se
// contradicen entre sí. Esto prueba que no se equivoque en absoluto.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpretar } from '../web/lib/pedir-clima.js';

const RESPUESTA = {
  current: {
    temperature_2m: 13.6, apparent_temperature: 11.2, relative_humidity_2m: 64,
    wind_speed_10m: 22.4, wind_direction_10m: 225, weather_code: 3, is_day: 1,
  },
  daily: {
    time: ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24'],
    temperature_2m_max: [16.4, 18.1, 14.9, 20.0],
    temperature_2m_min: [6.2, 7.8, 5.1, 9.0],
    precipitation_probability_max: [10, 60, 0, 20],
    weather_code: [3, 61, 0, 2],
  },
};

test('los números de ahora se redondean, no se truncan', () => {
  const r = interpretar(RESPUESTA);
  assert.equal(r.ahora.temp, 14); // 13.6 redondea a 14, no a 13
  assert.equal(r.ahora.sensacion, 11);
  assert.equal(r.ahora.viento, 22);
  assert.equal(r.ahora.humedad, 64);
});

test('el rumbo del viento se lee de la tabla de 8 direcciones', () => {
  assert.equal(interpretar(RESPUESTA).ahora.rumbo, 'SO'); // 225° es suroeste
  assert.equal(interpretar({ ...RESPUESTA, current: { ...RESPUESTA.current, wind_direction_10m: 0 } }).ahora.rumbo, 'N');
  assert.equal(interpretar({ ...RESPUESTA, current: { ...RESPUESTA.current, wind_direction_10m: 359 } }).ahora.rumbo, 'N', '359° redondea a 360°=0°=N, no se cae de la tabla');
});

test('un código de cielo desconocido no rompe: dice que no hay dato', () => {
  const r = interpretar({ ...RESPUESTA, current: { ...RESPUESTA.current, weather_code: 4242 } });
  assert.equal(r.ahora.cielo, 'Sin datos');
});

test('de noche, esDeDia da false', () => {
  const r = interpretar({ ...RESPUESTA, current: { ...RESPUESTA.current, is_day: 0 } });
  assert.equal(r.ahora.esDeDia, false);
});

test('los cuatro días vienen con su nombre corto, en el mismo orden que llegaron', () => {
  const r = interpretar(RESPUESTA);
  assert.equal(r.dias.length, 4);
  assert.equal(r.dias[0].fecha, '2026-09-21');
  assert.equal(r.dias[0].max, 16);
  assert.equal(r.dias[0].min, 6);
  assert.equal(r.dias[0].lluvia, 10);
  assert.ok(['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'].includes(r.dias[0].dia));
});

test('el día de la semana no se corre por la zona horaria', () => {
  // Se arma con T12:00:00 a propósito: con T00:00:00 a secas, en un huso
  // negativo (como Argentina) la fecha se lee como el día anterior.
  const r = interpretar(RESPUESTA);
  const esperado = new Date('2026-09-21T12:00:00').getDay();
  const nombres = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  assert.equal(r.dias[0].dia, nombres[esperado]);
});

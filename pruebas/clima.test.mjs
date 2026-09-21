// El clima: qué dibujo le toca a cada cielo y cuándo corresponde un aviso.
//
// Las dos cosas se publican solas todos los días sin que nadie las mire, y
// las dos ya salieron mal en producción: un sol radiante a las dos de la
// mañana, y otro sol un domingo nublado.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avisosDelClima, UMBRALES } from '../ingesta/alertas.mjs';
import { planDelDia } from '../reels/plan.mjs';
import { tipoDeCielo } from '../web/lib/clima.js';

// ------------------------------------------------------------ los dibujos

test('de noche no hay sol', () => {
  assert.equal(tipoDeCielo('Despejado', true), 'sol');
  assert.equal(tipoDeCielo('Despejado', false), 'luna');
});

test('nublado es una nube sola, sin sol detrás', () => {
  // Pasó el 20/09/2026: la tarjeta decía "Nublado" y la barra de arriba
  // dibujaba un sol. Eran dos copias de la misma decisión, y se separaron.
  assert.equal(tipoDeCielo('Nublado', true), 'cubierto');
  assert.equal(tipoDeCielo('Nublado', false), 'cubierto');
  assert.equal(tipoDeCielo('Niebla', true), 'cubierto');
});

test('parcialmente nublado sí deja ver el sol', () => {
  assert.equal(tipoDeCielo('Parcialmente nublado', true), 'nube');
  assert.equal(tipoDeCielo('Parcialmente nublado', false), 'luna-nube');
});

test('mayormente despejado es un día de sol', () => {
  assert.equal(tipoDeCielo('Mayormente despejado', true), 'sol');
});

test('si llueve, eso es lo que importa', () => {
  for (const c of ['Lluvia', 'Llovizna leve', 'Chaparrones fuertes', 'Tormenta con granizo', 'Nieve']) {
    assert.equal(tipoDeCielo(c, true), 'lluvia', c);
    assert.equal(tipoDeCielo(c, false), 'lluvia', c + ' de noche');
  }
});

test('sin dato no se inventa un cielo raro', () => {
  assert.equal(tipoDeCielo('', true), 'sol');
  assert.equal(tipoDeCielo(undefined, false), 'luna');
});

// -------------------------------------------------------------- los avisos

/** Un pronóstico tranquilo, para ir empeorándolo de a un dato por prueba. */
function pronostico(hoy = {}) {
  return {
    dias: [
      { fecha: '2026-09-20', max: 20, min: 9, lluvia: 10, codigo: 3, viento: 15, ...hoy },
      { fecha: '2026-09-21', max: 21, min: 10, lluvia: 5, codigo: 1, viento: 12 },
    ],
  };
}

test('un pronóstico tranquilo no avisa nada', () => {
  // Esto es lo más importante de todo: un aviso que salta todas las semanas
  // deja de ser un aviso, y el día que importa nadie lo mira.
  assert.deepEqual(avisosDelClima(pronostico()), []);
});

test('avisa la helada', () => {
  const [a] = avisosDelClima(pronostico({ min: -3 }));
  assert.equal(a.tipo, 'helada');
  assert.equal(a.gravedad, 'alta');
  assert.ok(a.texto.includes('-3'));
});

test('una noche fresca no es una helada', () => {
  assert.deepEqual(avisosDelClima(pronostico({ min: UMBRALES.helada + 1 })), []);
});

test('avisa el granizo', () => {
  const [a] = avisosDelClima(pronostico({ codigo: 96 }));
  assert.equal(a.tipo, 'granizo');
  assert.equal(a.gravedad, 'alta');
});

test('avisa el viento fuerte', () => {
  const [a] = avisosDelClima(pronostico({ viento: UMBRALES.vientoFuerte + 5 }));
  assert.equal(a.tipo, 'viento');
});

test('el aviso más grave va primero', () => {
  // En la tarjeta entra uno solo: tiene que ser el que puede hacer daño.
  const avisos = avisosDelClima(pronostico({ max: 36, viento: 70 }));
  assert.ok(avisos.length >= 2);
  assert.equal(avisos[0].gravedad, 'alta');
});

test('no se avisa a cuatro días', () => {
  // A esa distancia el pronóstico se equivoca lo suficiente como para
  // gastar la confianza de la gente.
  const lejos = {
    dias: [
      { fecha: '2026-09-20', max: 20, min: 9, lluvia: 10, codigo: 3, viento: 15 },
      { fecha: '2026-09-21', max: 21, min: 10, lluvia: 5, codigo: 1, viento: 12 },
      { fecha: '2026-09-22', max: 40, min: -8, lluvia: 100, codigo: 99, viento: 90 },
    ],
  };
  assert.deepEqual(avisosDelClima(lejos), []);
});

test('sin pronóstico no se rompe', () => {
  assert.deepEqual(avisosDelClima(null), []);
  assert.deepEqual(avisosDelClima({}), []);
  assert.deepEqual(avisosDelClima({ dias: [] }), []);
});


// ------------------------------------------- la historia que no espera

/** Unos datos mínimos como los que lee el plan del día. */
function datosDelDia(codigoHoy) {
  return {
    notas: [],
    farmacias: { turnos: [] },
    clima: {
      ahora: { temp: 14, sensacion: 13, humedad: 70, viento: 12, rumbo: 'O', cielo: 'Nublado', esDeDia: true },
      dias: [
        { fecha: '2026-09-20', dia: 'dom', max: 20, min: 9, lluvia: 30, codigo: codigoHoy, viento: 15 },
        { fecha: '2026-09-21', dia: 'lun', max: 19, min: 8, lluvia: 10, codigo: 1, viento: 12 },
      ],
    },
  };
}

const avisosDelPlan = (codigo) => planDelDia(datosDelDia(codigo))
  .piezas.filter((x) => x.nombre?.startsWith('aviso'));

test('un día tranquilo no interrumpe a nadie', () => {
  // Un aviso que salta todas las semanas deja de ser un aviso.
  assert.deepEqual(avisosDelPlan(3), []);
});

test('con granizo sale una historia, y sale ya', () => {
  const [pieza] = avisosDelPlan(96);
  assert.ok(pieza, 'no salió la pieza');
  assert.equal(pieza.hora, 'ahora');
  assert.match(pieza.guion, /granizo/i);
  assert.ok(pieza.svg?.length > 500, 'la placa salió vacía');
});

test('sólo los avisos graves interrumpen', () => {
  // El calor extremo y la posible helada ya están en la tarjeta de la
  // portada. Una historia es para lo que puede costar plata o un susto.
  const datos = datosDelDia(3);
  datos.clima.dias[0].max = 36; // calor extremo: gravedad media
  const piezas = planDelDia(datos).piezas.filter((x) => x.nombre?.startsWith('aviso'));
  assert.deepEqual(piezas, []);
});
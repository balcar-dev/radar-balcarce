// 4/10/2026 (Hernán): la historia del clima de la noche decía "buenas noches" dos veces: el saludo ("Buenas noches, Balcarce…") y el cierre ("Que tengan una buena noche").
// El saludo del momento se dice una sola vez por pieza: el cierre y los toques no lo repiten.

import test from 'node:test';
import assert from 'node:assert/strict';
import { CIERRES_HUMANOS, guionClima, guionClimaNoche, guionFarmacia, guionAgenda, saludoDePodcast } from '../redes/guiones.mjs';

const SALUDO = /buenas? noches?|buen d[ií]a|buenas tardes/gi;
const cuenta = (texto) => (String(texto).match(SALUDO) ?? []).length;

test('ningún cierre humano repite la palabra del saludo', () => {
  for (const [momento, cierres] of Object.entries(CIERRES_HUMANOS)) {
    for (const c of cierres) assert.equal(cuenta(c), 0, `${momento}: "${c}" repite el saludo`);
  }
});

test('el clima de la mañana y el de la noche dicen el saludo una sola vez, en cualquier día del año', () => {
  const clima = (min, max, lluvia) => ({ ahora: { temp: 17, viento: 12, cielo: 'despejado' }, dias: [{ min, max, lluvia: 10 }, { min: min + 2, max: max - 1, lluvia }, { min, max, lluvia: 10 }] });
  for (let d = 0; d < 120; d += 1) {
    const fecha = new Date(Date.UTC(2026, 9, 1 + d, 22));
    for (const c of [clima(1, 12, 5), clima(6, 18, 60), clima(12, 30, 80), clima(10, 21, 10)]) {
      const noche = guionClimaNoche(c, { fecha });
      assert.ok(cuenta(noche) <= 1, `noche ${fecha.toISOString()}: ${noche}`);
      const manana = guionClima(c, null, { fecha });
      assert.ok(cuenta(manana) <= 1, `mañana ${fecha.toISOString()}: ${manana}`);
    }
  }
});

// 5/10/2026 (Hernán): "algunos audios repiten buen día Balcarce, en Balcarce". No era la voz: era el texto ("Buen día, Balcarce. Así amanece Balcarce…", "Muy buenas noches, Balcarce. Para esta noche, en Balcarce…").
// Después del saludo, las dos primeras frases de una pieza no vuelven a decir Balcarce.
const primerasFrases = (texto, n = 2) => String(texto).match(/[^.?!]+[.?!]/g)?.slice(0, n).join(' ') ?? '';
const cuantasVeces = (texto) => (String(texto).match(/balcarce/gi) ?? []).length;

test('después del saludo, la pieza no repite Balcarce: clima, farmacia, agenda y el saludo de los podcasts, todos los días del año', () => {
  const clima = { ahora: { temp: 17, viento: 12, cielo: 'despejado' }, dias: [{ min: 6, max: 18, lluvia: 10 }, { min: 8, max: 20, lluvia: 60 }, { min: 9, max: 21, lluvia: 10 }] };
  const turno = { farmacias: ['BENITES'], detalle: [{ nombre: 'BENITES', direccion: 'Av. Chaves N° 329' }] };
  const eventos = [{ nombre: 'La Fiesta del Postre', cuando: 'sábado 10 de octubre', lugar: 'el Parque Cerrito' }, { nombre: 'Una feria', cuando: 'domingo', lugar: null }];
  for (let d = 0; d < 90; d += 1) {
    const fecha = new Date(Date.UTC(2026, 9, 1 + d, 15));
    const casos = {
      'clima de la mañana': guionClima(clima, null, { fecha }),
      'clima de la noche': guionClimaNoche(clima, { fecha }),
      'farmacia': guionFarmacia(turno, { fecha, momento: 'noche' }),
      'agenda': guionAgenda(eventos, { fecha, momento: 'tarde' }),
      'podcast de la mañana': saludoDePodcast('manana', { fecha }),
      'podcast de la tarde': saludoDePodcast('tarde', { fecha }),
      'podcast de la noche': saludoDePodcast('noche', { fecha }),
    };
    for (const [que, texto] of Object.entries(casos)) {
      assert.ok(cuantasVeces(primerasFrases(texto)) <= 1, `${que} (${fecha.toISOString().slice(0, 10)}): ${primerasFrases(texto)}`);
    }
  }
});

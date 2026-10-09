// Los subtítulos nunca se encimen (9/10/2026): un cartel dura 0,12 s más que su última palabra, y si el cartel que sigue arranca antes (la voz no hizo pausa),
// en una historia se veían dos líneas una encima de la otra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armarAss } from '../reels/reel.mjs';
import { enCarteles } from '../reels/voz.mjs';

const aSegundos = (t) => { const [h, m, s] = t.split(':'); return Number(h) * 3600 + Number(m) * 60 + Number(s); };

/** Los eventos de un .ass como [{ desde, hasta }], en el orden en que están. */
const eventos = (ass) => ass.split('\n').filter((l) => l.startsWith('Dialogue:')).map((l) => {
  const p = l.split(',');
  return { desde: aSegundos(p[1]), hasta: aSegundos(p[2]) };
});

test('sin pausa entre carteles, ningún subtítulo se superpone con el siguiente', () => {
  // Palabras seguidas, sin silencio: el fin de una es el comienzo de la otra.
  const texto = 'Se observa la supernova más reciente de la Vía Láctea y se funda Tolhuin en Tierra del Fuego'.split(' ');
  const palabras = texto.map((t, i) => ({ texto: t, desde: i * 0.3, hasta: (i + 1) * 0.3 }));
  const carteles = enCarteles(palabras);
  assert.ok(carteles.length >= 3);
  assert.ok(carteles[0].hasta > carteles[1].desde, 'el caso de prueba: los carteles sí se pisan por el margen de 0,12 s');
  const ev = eventos(armarAss(carteles));
  for (let i = 1; i < ev.length; i += 1) {
    assert.ok(ev[i].desde >= ev[i - 1].hasta - 0.011, `el evento ${i} arranca antes de que termine el ${i - 1} (${ev[i - 1].hasta} > ${ev[i].desde})`);
  }
});

test('con pausa, el cartel conserva su margen final y el último termina donde dice', () => {
  const carteles = enCarteles([
    { texto: 'Buen', desde: 0, hasta: 0.3 }, { texto: 'día', desde: 0.3, hasta: 0.6, finFrase: true },
    { texto: 'Hoy', desde: 2, hasta: 2.3 }, { texto: 'llueve', desde: 2.3, hasta: 2.8, finFrase: true },
  ]);
  const ev = eventos(armarAss(carteles));
  assert.ok(Math.abs(ev[1].hasta - 0.72) < 0.02, 'el primer cartel dura hasta 0,12 s después de su última palabra');
  assert.ok(Math.abs(ev.at(-1).hasta - 2.92) < 0.02);
});

// Los reels y las historias no tiemblan (30/09, Hernán: "algunas tiemblan
// levemente, es molesto"). La causa era el zoom lento con zoompan, que recorta
// en píxeles enteros. La placa va quieta y los subtítulos encima.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const reel = fs.readFileSync(new URL('../reels/reel.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('el video de una pieza no usa zoompan ni ningún zoom sobre la placa', () => {
  const codigo = reel.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(codigo, /zoompan|pzoom|scale=2160/);
  assert.match(codigo, /subtitles=\$\{path\.basename\(ass\)\}/, 'los subtítulos siguen encima');
});

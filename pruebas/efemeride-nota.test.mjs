// La nota de "Un día como hoy" (14/10/2026, Hernán): sale cuando sale el video, con el texto de nuestro calendario (nunca de otro medio) y la
// ilustración de fondo declarada como hecha con IA. Sin red. Los datos son los reales del 14/10 y del 15/10 (efemerides-piezas.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { efemeridesDelLibro, notaDeEfemeride, notasDeEfemerides, FOTO_DE_EFEMERIDE, esNotaPropia } from '../web/lib/notas-propias.js';
import { tieneCuerpo } from '../web/lib/cuerpo.js';

const DIA_14 = {
  principal: { id: 'x', anio: 1959, titulo: 'Se funda la UTN', cuerpo: 'La Universidad Tecnológica Nacional, la universidad de la ingeniería argentina.', verificar: [] },
  ademas: [
    { id: 'a', anio: 1934, texto: 'Nace Horacio Accavallo, boxeador argentino' },
    { id: 'b', anio: 1964, texto: 'Se anuncia el Nobel de la Paz para Martin Luther King' },
    { id: 'c', anio: 2025, texto: 'Windows 10 deja de recibir soporte de Microsoft' },
  ],
};
const AHORA = new Date('2026-10-14T18:00:00Z');
const libro = (extra = {}) => ({
  instagram: { '2026-10-14/efemeride': { cuando: '2026-10-14T12:04:00.000Z', tipo: 'REELS', permalink: 'https://www.instagram.com/reel/abc/' } },
  facebookVideos: { '2026-10-14/efemeride': { cuando: '2026-10-14T12:05:00.000Z', tipo: 'REELS' } },
  ...extra,
});

test('la nota sale sólo si el video de ese día ya salió, y sólo de los últimos días', () => {
  assert.deepEqual(efemeridesDelLibro({}, { ahora: AHORA }), []);
  assert.deepEqual(efemeridesDelLibro({ instagram: { '2026-10-14/clima-manana': { cuando: '2026-10-14T10:00:00Z' } } }, { ahora: AHORA }), []);
  const s = efemeridesDelLibro(libro(), { ahora: AHORA });
  assert.equal(s.length, 1);
  assert.equal(s[0].dia, '2026-10-14');
  assert.equal(s[0].cuando, '2026-10-14T12:04:00.000Z', 'la fecha es la del primer video que salió');
  assert.equal(s[0].redes.instagram, 'https://www.instagram.com/reel/abc/');
  assert.equal(s[0].redes.facebook, undefined, 'sin dirección de Facebook no se inventa una');
  assert.deepEqual(efemeridesDelLibro(libro(), { ahora: new Date('2026-10-30T18:00:00Z') }), [], 'una de hace 16 días ya no se arma');
  const soloHistoria = { historiasDeReels: { 'instagram/2026-10-14/efemeride': { cuando: '2026-10-14T12:07:00Z' } } };
  assert.equal(efemeridesDelLibro(soloHistoria, { ahora: AHORA }).length, 1, 'con sólo la historia del video, también');
});

test('la nota cuenta lo mismo que el video, con cuerpo suficiente y la ilustración declarada como IA', () => {
  const [s] = efemeridesDelLibro(libro(), { ahora: AHORA });
  const n = notaDeEfemeride(s, DIA_14);
  assert.equal(n.id, 'efemeride20261014');
  assert.equal(n.propia, 'efemeride');
  assert.equal(esNotaPropia(n), true, 'no va a Facebook como nota: ya salió como video');
  assert.equal(n.titulo, 'Un día como hoy, en 1959: Se funda la UTN');
  assert.equal(n.seccion, 'Cultura y agenda');
  assert.match(n.cuerpo, /En 1959: Se funda la UTN\. La Universidad Tecnológica Nacional/);
  assert.match(n.cuerpo, /1934: Nace Horacio Accavallo, boxeador argentino\./);
  assert.match(n.cuerpo, /2025: Windows 10 deja de recibir soporte de Microsoft\./);
  assert.equal(tieneCuerpo(n), true, 'pasa la regla de las 70 palabras');
  assert.deepEqual(n.foto, FOTO_DE_EFEMERIDE);
  assert.match(n.foto.credito, /generada con IA/);
  assert.ok(fs.existsSync(new URL('../web/public/' + n.foto.archivo, import.meta.url)), 'la ilustración está en disco');
  assert.equal(n.fecha, '2026-10-14T12:04:00.000Z');
  assert.match(n.firma, /Radar Balcarce/);
});

test('con la dirección del video, la nota la enlaza; sin dirección, no inventa ninguna', () => {
  const [s] = efemeridesDelLibro(libro(), { ahora: AHORA });
  const n = notaDeEfemeride(s, DIA_14);
  assert.deepEqual(n.enlacesEnTexto, [{ texto: 'video en Instagram', href: 'https://www.instagram.com/reel/abc/' }]);
  assert.ok(n.cuerpo.includes('video en Instagram'), 'el texto del enlace está en el cuerpo');
  const sin = notaDeEfemeride({ ...s, redes: {} }, DIA_14);
  assert.deepEqual(sin.enlacesEnTexto, []);
  assert.ok(!sin.cuerpo.includes('Mirá el video'));
});

test('un "día de…" sin año y un día sin datos', () => {
  const d = notaDeEfemeride({ dia: '2026-10-13', cuando: '2026-10-13T12:00:00Z', redes: {} }, {
    principal: { anio: null, titulo: 'Día del Psicólogo', cuerpo: 'Se celebra todos los 13 de octubre.' },
    ademas: [{ anio: null, texto: 'Día Nacional de la Patagonia' }],
  });
  assert.equal(d.titulo, 'Un día como hoy: Día del Psicólogo');
  assert.match(d.cuerpo, /Hoy: Día Nacional de la Patagonia\./);
  assert.equal(notaDeEfemeride({ dia: '2026-10-13' }, undefined), null);
  assert.deepEqual(notasDeEfemerides({ dias: {} }, libro(), { ahora: AHORA }), [], 'si no hay efeméride preparada de ese día, no hay nota');
  assert.equal(notasDeEfemerides({ dias: { '2026-10-14': DIA_14 } }, libro(), { ahora: AHORA }).length, 1);
});

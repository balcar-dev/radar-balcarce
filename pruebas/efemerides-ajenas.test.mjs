// Las efemérides son nuestras (14/10/2026, Hernán): de otro medio no se toma ninguna.
// El caso real: Radio Gabal, "Efemérides 10 de octubre: se celebra el Día Mundial de la Salud Mental".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esEfemerideAjena, paraPruebas } from '../ingesta/ingesta.mjs';

const { semaforo } = paraPruebas;
const leida = (titulo, extra = {}) => ({
  titulo, cuerpo: 'Resumen de la nota, sin nada raro.', categorias: [], alcance: 'local', peso: 28, fecha: new Date(), ...extra,
});

test('la efeméride de Radio Gabal se reconoce por la dirección, aunque el título sea otro', () => {
  const n = leida('El calendario conmemora la salud mental y la danza', {
    enlace: 'https://www.radiogabal.com.ar/index.php/comunidad/efemerides-10-de-octubre-se-celebra-el-dia-mundial-de-la-salud-mental',
  });
  assert.equal(esEfemerideAjena(n), true);
  const r = semaforo(n, 'Cultura y agenda', 1);
  assert.equal(r.color, 'rojo');
  assert.match(r.motivo, /efeméride de otro medio/);
});

test('también por el título: "Efemérides…" y "Un día como hoy…" de cualquier medio', () => {
  assert.equal(esEfemerideAjena(leida('Efemérides del 12 de octubre')), true);
  assert.equal(esEfemerideAjena(leida('Un día como hoy, pero de 1492')), true);
  assert.equal(semaforo(leida('Efemérides: qué se recuerda hoy'), 'Argentina', 3).color, 'rojo');
});

test('una noticia que nombra la efeméride no es una efeméride ajena', () => {
  assert.equal(esEfemerideAjena(leida('Acto por la efeméride del 12 de octubre en la Escuela 4', { enlace: 'https://x.com/acto-por-la-efemeride-del-12' })), false);
  assert.equal(esEfemerideAjena(leida('El Concejo declara de interés el aniversario del Club Amigos Unidos')), false);
  assert.equal(esEfemerideAjena({}), false);
});

test('una efeméride de otro medio que ya estaba archivada pierde la página; las nuestras no (15/10: la de Gabal del 14/10 salió antes de la regla)', async () => {
  const fs = await import('node:fs');
  const g = fs.readFileSync(new URL('../web/scripts/generar-datos.mjs', import.meta.url), 'utf8');
  assert.match(g, /if \(!a\.propia && esEfemerideAjena\(a\)\) retiradas\.add\(a\.id\);/);
  const gabal = { titulo: 'El mundo conmemora la donación de órganos y otras efemérides', enlace: 'https://www.radiogabal.com.ar/index.php/comunidad/efemerides-14-de-octubre-se-conmemora-el-dia-mundial-de-la-donacion-de-organos' };
  assert.equal(esEfemerideAjena(gabal), true);
  assert.equal(esEfemerideAjena({ titulo: 'Un día como hoy, en 1959: Se funda la UTN', enlace: 'https://radarbalcarce.com', propia: 'efemeride' }), true,
    'el título nuestro también parece de efeméride: por eso el archivo exceptúa lo propio');
});

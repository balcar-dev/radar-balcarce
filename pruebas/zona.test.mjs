// Lo que afecta a Balcarce sin nombrarla (25/09): la ruta 226, el sudeste, la
// papa. De las fuentes de región entra aunque no diga "Balcarce".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paraPruebas } from '../ingesta/ingesta.mjs';
import { FUENTES_NACIONALES, PALABRAS_ZONA } from '../ingesta/fuentes.mjs';

const { tocaLaZona } = paraPruebas;
const nota = (titulo, cuerpo = '') => ({ titulo, cuerpo });

test('la ruta 226, el sudeste y la papa tocan la zona', () => {
  assert.ok(tocaLaZona(nota('Avanza la obra de la Ruta 226 entre Tandil y Mar del Plata')));
  assert.ok(tocaLaZona(nota('Lluvias en el sudeste bonaerense', 'El temporal afectó caminos rurales.')));
  assert.ok(tocaLaZona(nota('Precios en baja', 'Los productores de papa advierten por la importación.')));
});

test('"el Papa" no es la papa, y una ruta cualquiera no es la zona', () => {
  assert.equal(tocaLaZona(nota('El Papa León XIV recibe a una delegación argentina')), false);
  assert.equal(tocaLaZona(nota('Cortan la ruta 2 por un accidente')), false);
  assert.equal(tocaLaZona(nota('Choque en la ruta 2260')), false);
});

test('las fuentes de región nuevas no tapan lo local: sólo entra lo que importa acá', () => {
  const nuevas = ['0223', 'eleco', 'lu9', 'qznoticias', 'ecosdiarios', 'lanoticia1', 'diputadosbsas', 'gba', 'ayacuchoaldia'];
  for (const id of nuevas) {
    const f = FUENTES_NACIONALES.find((x) => x.id === id);
    assert.ok(f, `falta ${id}`);
    assert.equal(f.maxItems, 0, `${id} tiene que entrar sólo si nombra a Balcarce o toca la zona`);
    assert.ok(f.peso <= 16, `${id} pesa demasiado: le ganaría a lo local`);
  }
});

test('una fuente oficial de afuera nunca tiene maxItems: saltearía el piso', () => {
  for (const f of FUENTES_NACIONALES.filter((x) => x.oficial)) {
    assert.equal(f.maxItems ?? 5, 0, `${f.id} es oficial y tiene maxItems`);
  }
});

test('ninguna palabra de zona es "papa" sola', () => {
  assert.ok(!PALABRAS_ZONA.includes('papa'));
});

test('Argenpapa: sin "Argentina:" adelante y siempre en Agro', () => {
  const f = FUENTES_NACIONALES.find((x) => x.id === 'argenpapa');
  const html = '<a href="/noticia/12345-argentina-las-importaciones-de-papa-crecieron-mucho">Argentina: Las importaciones de papa crecieron más de 1.300% en agosto</a>';
  const [n] = paraPruebas.parsearScrape(html, f);
  assert.equal(n.titulo, 'Las importaciones de papa crecieron más de 1.300% en agosto');
  assert.equal(n.seccionFuente, 'Agro');
  assert.equal(paraPruebas.clasificar({ ...n, cuerpo: 'Drones y tecnología para el cultivo.' }), 'Agro');
});

test('una nota de afuera que nombra a Balcarce y no encaja en ninguna sección es de Balcarce, no de Región (25/09)', () => {
  const n = {
    titulo: 'El STM y el Municipio de Balcarce avanzan en un acuerdo', cuerpo: 'Negociación entre el sindicato y la comuna.',
    alcance: 'region', nombraBalcarce: true, categorias: [],
  };
  assert.equal(paraPruebas.clasificar(n), 'Balcarce');
});

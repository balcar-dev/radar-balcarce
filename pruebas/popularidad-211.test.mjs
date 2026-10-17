// La popularidad de lo de afuera (regla 215, 17/10/2026). Hernán: "dejá todos los criterios que tenemos antes de lado. NO HAY NINGÚN CUPO DE
// NADA. Tiene que entrar todo lo nacional solo en base a las notas más relevantes, las que más fuentes tienen a la vez, y en todo caso que
// entre en las áreas donde suele haber poco. La idea es que tengamos unas 100 notas por día y SIN TOPE de Balcarce."
//
//   · 3 medios distintos por defecto, 2 en las áreas donde suele haber poco, 1 de una fuente especializada que la IA marque de interés;
//   · el ritmo del día (unas 100 por día): si va faltando, lo genérico baja de 3 a 2; si sobra, no hay tope;
//   · el control de calidad de lo que sale por una vía más baja (sin pronósticos de otras ciudades, "dónde ver", chimentos);
//   · el extranjero y Policiales de afuera no cambian.
// Sin red ni IA.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  esperadasA, ritmoDelDia, publicadasHoy, mediosMinimos, controlDeCalidad, popularidadDe, esAreaChica, esSeccionSoloDeAca, IMPORTANCIAS_DE_INTERES,
} from '../ingesta/popularidad.mjs';
import { POPULARIDAD, AREAS_CHICAS, SECCIONES_SOLO_DE_ACA, SECCIONES_SIN_FRONTERAS } from '../ingesta/criterio.mjs';
import { exigirMedios, aplicarPopularidad, mediosMinimosDe, armarPortada, MOTIVO_POCO_CONTADA } from '../ingesta/ingesta.mjs';
import { notasDeLasCrudas, simularElDia } from '../scripts/medir/simular-popularidad.mjs';

const leer = (r) => fs.readFileSync(new URL(r, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
// Hora de Balcarce (UTC-3) de un día cualquiera.
const a = (hhmm) => new Date(`2026-10-16T${hhmm}:00-03:00`);
const afuera = (id, seccion, medios, extra = {}) => ({
  id, titulo: `Nota ${id} de la semana`, seccion, medios, semaforo: 'verde', motivo: `sección ${seccion}`, local: false, alcance: 'pais', relevancia: 50, ...extra,
});

// ------------------------------------------------------------------ cuántos medios

test('3 medios por defecto, 2 en las áreas donde suele haber poco, y 2 en lo genérico si el día va flojo; nunca 1', () => {
  assert.deepEqual([...AREAS_CHICAS].sort(), ['Agro', 'Automovilismo', 'Ciencia', 'Cultura y agenda', 'Educación', 'Salud', 'Tecnología']);
  for (const s of AREAS_CHICAS) { assert.equal(mediosMinimos(s), 2, s); assert.ok(esAreaChica(s)); }
  for (const s of ['Política', 'Economía', 'Fútbol', 'Deportes', 'Argentina', 'Balcarce']) { assert.equal(mediosMinimos(s), 3, s); assert.ok(!esAreaChica(s)); }
  for (const s of ['Política', 'Economía', 'Fútbol', 'Deportes', 'Argentina']) assert.equal(mediosMinimos(s, { vaFaltando: true }), 2, `${s} si va faltando`);
  for (const s of AREAS_CHICAS) assert.equal(mediosMinimos(s, { vaFaltando: true }), 2, `${s} no baja de 2`);
  assert.equal(mediosMinimosDe('Política', {}, { vaFaltando: true }), 2);
  // El mínimo de "va faltando" nunca pasa del de siempre ni baja de 2.
  assert.ok(POPULARIDAD.mediosSiVaFaltando >= 2 && POPULARIDAD.mediosSiVaFaltando <= POPULARIDAD.mediosPorDefecto);
  assert.ok(POPULARIDAD.mediosEnAreasChicas >= 2);
  assert.equal(POPULARIDAD.mediosDeUnaFuenteEspecializada, 1);
});

test('la popularidad de una nota: llega con 3, con 2 en un área chica o si va flojo; con 1 sólo una fuente especializada que la IA marcó', () => {
  const n = (seccion, extra) => ({ titulo: 'Una novedad sólida de la semana', seccion, ...extra });
  assert.equal(popularidadDe(n('Política'), 3).llega, true);
  assert.equal(popularidadDe(n('Política'), 2).llega, false);
  assert.equal(popularidadDe(n('Política'), 2, { vaFaltando: true }).llega, true);
  assert.equal(popularidadDe(n('Política'), 1, { vaFaltando: true }).llega, false, 'nunca con uno');
  assert.equal(popularidadDe(n('Ciencia'), 2).llega, true);
  assert.equal(popularidadDe(n('Ciencia'), 1).llega, false);
  // Una fuente especializada sola: sólo si es de un área chica y la IA dijo que le interesa.
  assert.equal(popularidadDe(n('Ciencia', { especializada: true }), 1).llega, false, 'sin la ficha, espera');
  assert.equal(popularidadDe(n('Ciencia', { especializada: true, interesDeLaIA: true }), 1).llega, true);
  assert.equal(popularidadDe(n('Política', { especializada: true, interesDeLaIA: true }), 1).llega, false, 'no es un área chica');
  assert.equal(popularidadDe(n('Ciencia', { interesDeLaIA: true }), 1).llega, false, 'no es una fuente especializada');
  assert.deepEqual(IMPORTANCIAS_DE_INTERES, ['alta', 'media']);
});

test('el control de calidad frena lo que sale por la vía baja: pronósticos de otras ciudades, "dónde ver", en vivo, chimentos de horóscopo', () => {
  for (const titulo of ['Dónde ver Boca contra Racing', 'Pronóstico del tiempo para el fin de semana en Tucumán', 'River - Racing en vivo: minuto a minuto',
    'Horóscopo de hoy', 'El tiempo en Córdoba para el martes', 'Temperaturas en Mendoza para el sábado', 'Alerta amarilla por tormentas en CABA',
    'Dólar blue hoy: a cuánto cotiza']) {
    assert.ok(controlDeCalidad({ titulo }), titulo);
  }
  for (const titulo of ['Descubren una molécula que degrada plásticos', 'Una ola de calor récord en el hemisferio sur', 'Sequía: el campo pierde la cosecha de trigo',
    'Las temperaturas bajas afectan la papa en Balcarce']) {
    assert.equal(controlDeCalidad({ titulo }), null, titulo);
  }
  // Y bloquea sólo lo que salía por la vía baja: con 3 medios sale como siempre.
  assert.equal(popularidadDe({ titulo: 'Dónde ver Boca contra Racing', seccion: 'Fútbol' }, 3).llega, true);
  const baja = popularidadDe({ titulo: 'Pronóstico del tiempo para el fin de semana en Tucumán', seccion: 'Argentina' }, 2, { vaFaltando: true });
  assert.equal(baja.llega, false);
  assert.match(baja.motivo, /no son noticia/);
  assert.equal(popularidadDe({ titulo: 'Dónde ver el estreno', seccion: 'Cultura y agenda' }, 2).llega, false, 'ni en un área chica con 2');
  // El motivo que se ve lo dice.
  const portada = [afuera('x', 'Cultura y agenda', ['Infobae', 'Clarín'], { titulo: 'Dónde ver el estreno de la serie del año' })];
  exigirMedios(portada);
  assert.equal(portada[0].semaforo, 'amarillo');
  assert.ok(portada[0].motivo.startsWith(MOTIVO_POCO_CONTADA));
  assert.match(portada[0].motivo, /control de calidad/);
});

// ------------------------------------------------------------------ el ritmo del día

test('el ritmo: 100 por día repartidas de las 7 a las 23; antes de las 7, cero; después de las 23, todas', () => {
  assert.equal(POPULARIDAD.notasPorDia, 100);
  assert.equal(esperadasA(a('06:00')), 0);
  assert.equal(esperadasA(a('07:00')), 0);
  assert.equal(esperadasA(a('15:00')), 50);
  assert.equal(esperadasA(a('23:00')), 100);
  assert.equal(esperadasA(a('23:59')), 100);
  assert.equal(Math.round(esperadasA(a('19:00'))), 75);
  // No depende de la zona de la máquina: son las 15 de Balcarce aunque el servidor (GitHub) esté en UTC.
  assert.equal(esperadasA(new Date('2026-10-16T18:00:00Z')), 50);
});

test('va faltando si lleva menos de las que corresponden a esa hora; con las justas o de más, no', () => {
  assert.deepEqual(ritmoDelDia({ publicadas: 30, ahora: a('15:00') }), { publicadasHoy: 30, esperadas: 50, vaFaltando: true });
  assert.equal(ritmoDelDia({ publicadas: 50, ahora: a('15:00') }).vaFaltando, false);
  assert.equal(ritmoDelDia({ publicadas: 140, ahora: a('15:00') }).vaFaltando, false, 'si sobra no pasa nada: no hay tope');
  assert.equal(ritmoDelDia({ publicadas: 0, ahora: a('06:30') }).vaFaltando, false, 'de madrugada nadie espera nada');
  assert.equal(ritmoDelDia({ publicadas: 99, ahora: a('23:30') }).vaFaltando, true, 'a la noche pide las 100 enteras');
});

test('publicadasHoy cuenta las noticias del día de Balcarce que ya salieron, sin las propias ni las repetidas', () => {
  const notas = [
    { id: 'a', visto: '2026-10-16T13:00:00Z' }, // 10:00 del 16
    { id: 'b', fecha: '2026-10-16T22:00:00Z' }, // 19:00 del 16 (sin visto)
    { id: 'a', visto: '2026-10-16T13:00:00Z' }, // repetida
    { id: 'c', visto: '2026-10-16T01:00:00Z' }, // 22:00 del 15 en Balcarce: ayer
    { id: 'd', visto: '2026-10-16T14:00:00Z', propia: true }, // el clima, el dólar…
    { id: 'e', visto: '2026-10-17T02:00:00Z' }, // 23:00 del 16
    { id: 'f', visto: '2026-10-17T03:30:00Z' }, // 00:30 del 17: mañana
    { titulo: 'sin id', visto: '2026-10-16T15:00:00Z' },
  ];
  assert.equal(publicadasHoy(notas, a('12:00')), 4);
  assert.equal(publicadasHoy([], a('12:00')), 0);
});

test('lo genérico de afuera con 2 medios sale sólo si el día va flojo; lo que ya salió no se baja cuando el ritmo se recupera', () => {
  const dos = () => [afuera('p', 'Política', ['Infobae', 'Perfil']), afuera('f', 'Fútbol', ['Olé', 'TyC Sports'])];
  const normal = dos();
  aplicarPopularidad(normal);
  assert.deepEqual(normal.map((n) => n.semaforo), ['amarillo', 'amarillo'], 'con el día normal piden 3');
  const flojo = dos();
  aplicarPopularidad(flojo, { vaFaltando: true });
  assert.deepEqual(flojo.map((n) => n.semaforo), ['verde', 'verde'], 'con el día flojo alcanzan 2');
  // Una hora después el ritmo se recuperó: las que ya salieron siguen; las nuevas con 2 medios, no.
  const luego = [...dos(), afuera('nueva', 'Política', ['Infobae', 'Clarín'])];
  aplicarPopularidad(luego, { vaFaltando: false, publicadas: new Set(['p', 'f']) });
  assert.deepEqual(luego.map((n) => n.semaforo), ['verde', 'verde', 'amarillo']);
  // Nunca con un solo medio, ni flojo.
  const uno = [afuera('u', 'Política', ['Infobae'])];
  aplicarPopularidad(uno, { vaFaltando: true });
  assert.equal(uno[0].semaforo, 'amarillo');
});

test('generar-datos cuenta lo que salió hoy, se lo pasa a la ingesta y vuelve a aplicar la popularidad con la fecha de cada nota', () => {
  const g = leer('../web/scripts/generar-datos.mjs');
  assert.match(g, /const RITMO = ritmoDelDia\(\{ publicadas: publicadasHoy\(notasDeAntes\) \}\);/);
  assert.match(g, /vaFaltando: RITMO\.vaFaltando,\s*\}\);/);
  assert.match(g, /aplicarPopularidad\(notas\.sort\(\(a, b\) => \(b\.relevancia \?\? 0\) - \(a\.relevancia \?\? 0\)\), \{ publicadas: yaSalieron, fecha: fechaReal, vaFaltando: RITMO\.vaFaltando \}\);/);
  // Las fuentes especializadas esperan la ficha: se leen primero lo de acá y, enseguida, ellas.
  assert.match(g, /n\.especializada && n\.semaforo === 'amarillo' \? 1 : 0/);
  assert.match(g, /\.\.\.\(n\.interesDeLaIA \? \{ deFuenteEspecializada: true \} : \{\}\),/);
  const ingesta = leer('../ingesta/ingesta.mjs');
  assert.doesNotMatch(ingesta, /CUPO_DE_AFUERA|CUPO_POR_DEFECTO|MEDIOS_DE_AFUERA|MEDIOS_POR_DEFECTO|MEDIOS_CON_FIGURA/);
  assert.doesNotMatch(ingesta, /export function aplicarCupos/);
});

// ------------------------------------------------------------------ lo que no cambia

test('Policiales de afuera no sale solo ni con treinta medios; el extranjero sólo con un argentino salvo en ciencia y tecnología', () => {
  assert.deepEqual(SECCIONES_SOLO_DE_ACA, ['Policiales']);
  assert.ok(esSeccionSoloDeAca('Policiales') && !esSeccionSoloDeAca('Política'));
  const policial = afuera('pol', 'Policiales', Array.from({ length: 30 }, (_, i) => `Medio ${i}`));
  aplicarPopularidad([policial]);
  assert.equal(policial.semaforo, 'amarillo');
  assert.match(policial.motivo, /sólo de Balcarce y la zona/);
  assert.deepEqual(SECCIONES_SIN_FRONTERAS, ['Ciencia', 'Tecnología']);
  // Una de acá sigue sin pedir nada.
  const deAca = [afuera('b', 'Balcarce', ['Radio Gabal'], { local: true, alcance: 'local' }), afuera('o', 'Argentina', ['Gobierno'], { oficial: true })];
  exigirMedios(deAca);
  assert.deepEqual(deAca.map((n) => n.semaforo), ['verde', 'verde']);
});

// ------------------------------------------------------------------ la simulación (scripts/medir/simular-popularidad.mjs)

test('la simulación arma las notas de una lectura guardada con la marca de las fuentes especializadas y mide el día', () => {
  const crudas = [
    { f: 'infobae-tecno', m: 'Infobae', t: 'Crean un modelo de IA que detecta el rechazo tras un trasplante', e: 'https://x.test/1', d: '2026-10-16T13:00:00.000Z', x: null, v: 0, r: 'Investigadores de un hospital crearon una herramienta de inteligencia artificial.' },
    { f: 'perfil-ciencia', m: 'Perfil', t: 'Descubren una molécula nueva contra las bacterias resistentes', e: 'https://x.test/2', d: '2026-10-16T14:00:00.000Z', x: null, v: 0, r: 'Un equipo de científicos descubrió una molécula.' },
    { f: 'infobae-tecno', m: 'Infobae', t: 'Una nota descartada por la sección del medio', e: 'https://x.test/3', d: '2026-10-16T14:00:00.000Z', x: 'otro país', v: 0, r: '' },
    { f: 'infobae-tecno', m: 'Infobae', t: 'Una sin fecha real', e: 'https://x.test/4', d: null, x: null, v: 0, r: '' },
  ];
  const notas = notasDeLasCrudas(crudas, { generado: Date.parse('2026-10-17T04:00:00Z') });
  assert.equal(notas.length, 2, 'sin las descartadas ni las que no tienen fecha de verdad');
  assert.ok(notas.every((n) => n.especializada), 'las dos son de fuentes especializadas');
  assert.equal(notas[0].seccionFuente, 'Tecnología');
  assert.equal(notas[1].seccionFuente, 'Ciencia');
  const { publicadas, traza } = simularElDia({ notas, dia: '2026-10-16', fichas: {}, interes: 1, retiro: 0, calentamiento: 2, paso: 2 });
  assert.ok(Array.isArray(traza) && traza.length > 0);
  // Con la IA de acuerdo en las dos (interes = 1), salen las dos con un solo medio, en su sección.
  assert.equal(publicadas.length, 2);
  assert.deepEqual(publicadas.map((p) => p.nota.seccion).sort(), ['Ciencia', 'Tecnología']);
  // Con la IA en contra (interes = 0), no sale ninguna con un solo medio.
  assert.equal(simularElDia({ notas, dia: '2026-10-16', fichas: {}, interes: 0, retiro: 0, calentamiento: 2, paso: 2 }).publicadas.length, 0);
});

test('armarPortada es la misma que usa la ingesta: sin lo policial de afuera y ordenada por puntaje', () => {
  assert.equal(typeof armarPortada, 'function');
  assert.deepEqual(armarPortada([]), { portada: [], policialesDeAfuera: 0 });
});

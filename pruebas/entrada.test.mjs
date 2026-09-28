// El filtro de la entrada (plan V2.2, 27/09): lo que no se trae de los medios
// de afuera, mirando la sección que le pone el propio medio a la nota, y la
// ficha de cada fuente. Las direcciones son reales, de notas que salieron
// publicadas y no tendrían que haber salido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paraPruebas } from '../ingesta/ingesta.mjs';
import { FUENTES, FUENTES_NACIONALES, fichaDeFuente } from '../ingesta/fuentes.mjs';

const { motivoDeDescarte, esPolicialDeAfuera } = paraPruebas;
const NACIONAL = { alcance: 'pais' };
const nota = (enlace, titulo = 'Un titular', extra = {}) => ({ enlace, titulo, cuerpo: '', categorias: [], ...extra });

test('lo de secciones de otros países no entra (California, Colombia, el tigre de México)', () => {
  for (const enlace of [
    'https://www.lanacion.com.ar/estados-unidos/california/es-oficial-la-ley-firmada-por-newsom-nid27092026/',
    'https://www.infobae.com/colombia/2026/09/27/grupos-armados-en-colombia-han-realizado-292-ataques-con-drones/',
    'https://www.infobae.com/mexico/2026/09/27/tigre-suelto-pone-en-alerta-a-la-barca-jalisco/',
    'https://www.clarin.com/estados-unidos/votantes-de-miami-definiran-un-impuesto_0_abc.html',
    'https://www.ole.com.ar/futbol-internacional/chivas-le-gana-a-america_0_abc.html',
  ]) {
    assert.equal(motivoDeDescarte(nota(enlace), NACIONAL), 'de otro país', enlace);
  }
});

test('de una sección de otro país entra igual lo que tiene conexión argentina o es automovilismo', () => {
  const america = 'https://www.infobae.com/america/mundo/2026/09/23/la-asamblea-general-de-la-onu/';
  assert.equal(motivoDeDescarte(nota(america, 'La ONU, en vivo: hablan Milei y Zelensky'), NACIONAL), null);
  assert.equal(motivoDeDescarte(nota(america, 'Colapinto larga noveno en Azerbaiyán'), NACIONAL), null);
  assert.equal(motivoDeDescarte(nota('https://www.ole.com.ar/futbol-internacional/liverpool_0_abc.html', 'Con Mac Allister, Liverpool quiere pegar el golpe'), NACIONAL), null);
  assert.equal(motivoDeDescarte(nota('https://es.motorsport.com/mundo/f1/news/verstappen-gana/123/'), { alcance: 'pais', temas: ['automovilismo'] }), null);
});

test('policiales de afuera y consejos genéricos no entran', () => {
  assert.equal(motivoDeDescarte(nota('https://www.infobae.com/sociedad/policiales/2026/09/27/dejo-a-la-hija-encerrada/'), NACIONAL), 'policial de afuera');
  assert.equal(motivoDeDescarte(nota('https://www.ambito.com/autos/que-hacer-si-no-sube-el-vidrio-n6326308'), NACIONAL), 'consejo genérico');
});

test('el horóscopo no entra aunque la URL no diga "horoscopo" (28/09: se coló como "Cultura y agenda")', () => {
  // Reales, de la nota 1m3wgub que salió publicada y no tendría que haber salido.
  assert.equal(
    motivoDeDescarte(nota('https://www.c5n.com/astrologia/horoscopo-hoy-lunes-28-septiembre-n250074', 'Horóscopo de hoy: qué dice tu signo'), NACIONAL),
    'consejo genérico',
  );
  assert.equal(
    motivoDeDescarte(nota('https://www.canal26.com/tendencias/2026/09/28/numeros-de-la-suerte-de-hoy-lunes/', 'Números de la suerte de hoy, lunes 28 de septiembre'), NACIONAL),
    'consejo genérico',
  );
  assert.equal(
    motivoDeDescarte(nota('https://www.eldia.com/informacion-general/los-numeros-de-la-suerte/', 'Los astros anticipan las previsiones para cada signo'), NACIONAL),
    'consejo genérico',
  );
  // "signo" solo no alcanza: una enfermedad o un gol también tienen "signos".
  assert.equal(motivoDeDescarte(nota('https://www.infobae.com/salud/2026/09/27/los-signos-de-alerta-de-un-acv/'), NACIONAL), null);
});

test('lo de secciones argentinas entra, y de los medios de Balcarce entra todo', () => {
  assert.equal(motivoDeDescarte(nota('https://www.infobae.com/economia/2026/09/27/el-riesgo-pais/'), NACIONAL), null);
  assert.equal(motivoDeDescarte(nota('https://www.lanacion.com.ar/politica/el-congreso-aprobo-nid1/'), NACIONAL), null);
  assert.equal(motivoDeDescarte(nota('https://www.radiogabal.com.ar/policiales/un-robo-en-el-centro'), { alcance: 'local' }), null);
  // El último tramo es el nombre de la nota, no una sección.
  assert.equal(motivoDeDescarte(nota('https://www.0223.com.ar/nota/mexico'), { alcance: 'region' }), null);
});

test('un policial de afuera no se trae; si dice Balcarce en el título o es de un medio de acá, sí', () => {
  const robo = { titulo: 'Detuvieron a un ladrón tras un robo en La Matanza', cuerpo: 'La policía lo detuvo.', categorias: [], alcance: 'pais' };
  assert.equal(esPolicialDeAfuera(robo), true);
  assert.equal(esPolicialDeAfuera({ ...robo, titulo: 'Detuvieron a un ladrón tras un robo en Balcarce' }), false);
  assert.equal(esPolicialDeAfuera({ ...robo, alcance: 'local' }), false);
  assert.equal(esPolicialDeAfuera({ ...robo, titulo: 'El Concejo aprueba el presupuesto', cuerpo: 'Sesión ordinaria.' }), false);
});

test('cada fuente tiene su ficha: tipo y ciudad', () => {
  for (const f of [...FUENTES, ...FUENTES_NACIONALES].filter((x) => x.activa !== false)) {
    const ficha = fichaDeFuente(f);
    assert.ok(ficha.tipo, `${f.id} sin tipo`);
    assert.ok(ficha.ciudad, `${f.id} sin ciudad: los medios de la región y la provincia la necesitan`);
  }
  assert.equal(fichaDeFuente(FUENTES_NACIONALES.find((f) => f.id === 'ecosdiarios')).ciudad, 'Necochea');
});

test('desde el cruce ya no hay fuentes "de señal" ni un máximo por fuente (27/09)', async () => {
  // Todas entran enteras al cruce y lo que sale lo decide cuántos medios
  // cuentan cada hecho. `uso` y `maxItems` decidían eso antes y ya no hacían nada.
  const { FUENTES_CRUCE } = await import('../ingesta/fuentes-cruce.mjs');
  for (const f of [...FUENTES, ...FUENTES_NACIONALES, ...FUENTES_CRUCE]) {
    assert.ok(!('maxItems' in f), `${f.id} todavía tiene maxItems`);
    assert.ok(!('uso' in f), `${f.id} todavía tiene uso`);
  }
  assert.equal(fichaDeFuente(FUENTES_NACIONALES.find((x) => x.id === 'infobae')).tipo, 'nacional general');
  assert.equal(fichaDeFuente(FUENTES_NACIONALES.find((x) => x.id === 'infobae-economia')).tipo, 'nacional por sección');
});

test('los medios de España y los de chimentos están apagados (Hernán, 27/09)', () => {
  for (const id of ['hipertextual', 'xataka', 'infobae-teleshow', 'minutouno-espectaculos']) {
    assert.equal(FUENTES_NACIONALES.find((x) => x.id === id)?.activa, false, id);
  }
});

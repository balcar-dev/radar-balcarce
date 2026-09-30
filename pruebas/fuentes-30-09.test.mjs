// Arreglos de fuentes del 30/09 (informe de fuentes por sección): lo que se
// tiraba por error, lo que no se leía y las fuentes que no responden desde
// GitHub (apagadas y anotadas, no usadas).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paraPruebas, traer, TODAS_LAS_FUENTES } from '../ingesta/ingesta.mjs';
import { FUENTES } from '../ingesta/fuentes.mjs';

const { motivoDeDescarte, parsearScrape } = paraPruebas;
const porId = (id) => TODAS_LAS_FUENTES.find((f) => f.id === id);

test('Olé pone toda su F1 y su TC bajo "/autos/": en una fuente de automovilismo no es un consejo de autos', () => {
  const nota = { titulo: 'Fernando Alonso renovó con Aston Martin', enlace: 'https://www.ole.com.ar/autos/fernando-alonso-renovo_0_abc.html' };
  assert.equal(motivoDeDescarte(nota, porId('ole-automovilismo')), null);
  // Las demás fuentes siguen tirando los consejos de autos.
  assert.equal(motivoDeDescarte(nota, { alcance: 'pais', seccion: 'Deportes' }), 'consejo genérico');
  // Y el horóscopo se sigue tirando también en una fuente de automovilismo.
  const horoscopo = { titulo: 'Tu día', enlace: 'https://www.ole.com.ar/horoscopo/tu-dia_0_abc.html' };
  assert.equal(motivoDeDescarte(horoscopo, porId('ole-automovilismo')), 'consejo genérico');
});

test('La Vanguardia: se leen también sus notas de deportes (el Clausura de la Liga no entraba)', () => {
  const html = `<a href="https://www.diariolavanguardia.com/deportes/14268-oficial-arranca-el-torneo-clausura-con-nuevo-horario/"><h2>Oficial: arranca el torneo Clausura con nuevo horario</h2></a>
    <a href="https://www.diariolavanguardia.com/noticias/14300-otra-nota-de-balcarce/"><h2>Otra nota de Balcarce que ya se leía</h2></a>
    <a href="https://www.diariolavanguardia.com/salud/14301-no-es-de-las-que-leemos/"><h2>Una de salud</h2></a>`;
  const notas = parsearScrape(html, FUENTES.find((f) => f.id === 'lavanguardia'));
  assert.deepEqual(notas.map((n) => n.enlace.split('/')[3]).sort(), ['deportes', 'noticias']);
});

test('Acción 5, el medio de deportes de Balcarce, es una fuente local', () => {
  const f = porId('accion5');
  assert.equal(f.alcance, 'local');
  assert.match(f.url, /accion5\.com/);
  assert.ok(f.peso >= 26, 'pesa como los demás medios de acá');
});

test('lo que no responde desde GitHub está apagado y anotado, no usado', () => {
  for (const id of ['el-norte-general', 'radio-sudestada-general', 'el-argentino-digital-general', 'municipios-vecinos-general-alvarado-beni', 'sendero-regional-general', 'sendero', 'loberia2261']) {
    const f = porId(id);
    assert.equal(f.activa, false, `${id} tendría que estar apagada`);
  }
  // Las que se apagaron el 30/09 en el cruce dicen por qué (queda anotado).
  const deHoy = TODAS_LAS_FUENTES.filter((x) => x.activa === false && /^30\/09/.test(x.nota ?? ''));
  assert.ok(deHoy.length >= 10, 'las apagadas del 30/09 llevan su nota con la fecha');
  for (const f of deHoy) assert.ok(f.nota.length > 20, `${f.id}: la nota no dice por qué`);
  assert.equal(porId('a24-policiales'), undefined, 'A24 policiales se borró: lo policial de afuera no entra');
});

test('SoloTC se pide sin compresión y TNT Sports con otro nombre; los feeds enormes se cortan', async () => {
  assert.equal(porId('solotc-turismo-carretera').sinCompresion, true);
  assert.match(porId('tnt-sports').agente, /Mozilla\/5\.0 \(compatible; RadarBalcarce/);
  for (const id of ['openai', 'google-deepmind', 'nasa-ciencia']) assert.ok(porId(id).maxNotas > 0, `${id} sin tope de notas`);
  // `traer` pasa esas dos opciones como encabezados.
  let cabeceras = null;
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opciones) => { cabeceras = opciones.headers; return { ok: true, arrayBuffer: async () => Buffer.from('<rss/>') }; };
  try {
    await traer('https://ejemplo.test/feed', { agente: 'Otro/1.0', sinCompresion: true });
  } finally { globalThis.fetch = original; }
  assert.equal(cabeceras['user-agent'], 'Otro/1.0');
  assert.equal(cabeceras['accept-encoding'], 'identity');
});

test('las fuentes nuevas de las empresas de IA no se marcan "oficiales": son avisos de la empresa, no comunicados de gobierno', () => {
  for (const id of ['openai', 'google-deepmind', 'google-espanol', 'nvidia-blog', 'microsoft-news']) assert.ok(!porId(id).oficial, id);
  assert.ok(porId('incaa').oficial && porId('municipio-san-cayetano').oficial);
});

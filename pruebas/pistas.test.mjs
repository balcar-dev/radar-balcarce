// Las pistas del panel (1/10/2026): pegar un tuit y ver si lo cubrieron los medios. El caso real: Pilar Ferrer y el gel.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PISTA, palabraDelicada, consultasLocales, parsearGoogleNoticias, soloLosQueHablanDeLoBuscado, resumirCobertura, buscarEnNuestras,
  consultasDeLaPista, matices, investigarPista, NIVELES,
} from '../ingesta/pistas.mjs';
import { htmlDeFormulario, htmlDeInforme } from '../web/public/panel/pistas.js';

const RAIZ = path.join(import.meta.dirname, '..');
const TUIT = '🚨AVANCE: Una bióloga de 25 años ha creado algo que suena a ciencia ficción.\n\nPilar Ferrer, de Argentina, desarrolló un gel inyectable que ayuda al corazón a repararse a sí mismo después de un infarto.\n\nTiene 25 años. Que eso cale hondo.';

const RSS = `<?xml version="1.0"?><rss><channel>
<item><title>Una becaria del Conicet desarrolló un gel que podría reparar el corazón después de un infarto - pausa.com.ar</title><link>https://news.google.com/rss/articles/AAA</link><pubDate>Tue, 04 Aug 2026 10:00:00 GMT</pubDate><source url="https://www.pausa.com.ar">pausa.com.ar</source></item>
<item><title>Quién es Pilar Ferrer, la bióloga argentina que desarrolló un gel &amp; más - MinutoUno</title><link>https://news.google.com/rss/articles/BBB</link><pubDate>Mon, 03 Aug 2026 09:00:00 GMT</pubDate><source url="https://www.minutouno.com">MinutoUno</source></item>
<item><title>Una inyección para darle otra oportunidad al corazón: Pilar Ferrer - MDZ Online</title><link>https://news.google.com/rss/articles/CCC</link><pubDate>Fri, 28 Aug 2026 09:00:00 GMT</pubDate><source url="https://www.mdzol.com">MDZ Online</source></item>
<item><title>Otra nota de MinutoUno sobre Pilar Ferrer - MinutoUno</title><link>https://news.google.com/rss/articles/DDD</link><pubDate>Tue, 04 Aug 2026 12:00:00 GMT</pubDate><source url="https://www.minutouno.com">MinutoUno</source></item>
<item><title>Premiaron a una científica mendocina por sus avances - MDZ Online</title><link>https://news.google.com/rss/articles/EEE</link><pubDate>Tue, 04 Aug 2026 12:00:00 GMT</pubDate><source url="https://www.mdzol.com">MDZ Online</source></item>
</channel></rss>`;

test('una pista con algo del semáforo rojo (un menor, una víctima) no se investiga', async () => {
  assert.equal(palabraDelicada('Un menor de edad fue encontrado en la plaza'), 'menor de edad');
  assert.equal(palabraDelicada(TUIT), null);
  const r = await investigarPista('Una nena fue víctima de abuso sexual en un colegio de la ciudad, dicen', { clave: null, buscar: async () => { throw new Error('no debería buscar'); } });
  assert.equal(r.ok, false);
  assert.equal(r.bloqueada, true);
  assert.match(r.motivo, /no se investiga/);
  assert.equal((await investigarPista('corto', {})).ok, false);
});

test('sin IA, las búsquedas salen de los nombres propios y las frases entre comillas, no de palabras sueltas', () => {
  assert.deepEqual(consultasLocales(TUIT), ['Pilar Ferrer']);
  assert.deepEqual(consultasLocales('Dicen que "el gel repara el corazón" según Lionel Messi y Mariano Werner'), ['el gel repara el corazón', 'Lionel Messi', 'Mariano Werner']);
  assert.ok(consultasLocales('algo sucedió hoy con bastante gente en la ciudad').length <= 1, 'sin nombres, una sola búsqueda general');
});

test('Google Noticias: el título pierde el medio del final, el medio sale de <source> y las entidades se decodifican', () => {
  const n = parsearGoogleNoticias(RSS);
  assert.equal(n.length, 5);
  assert.deepEqual(n[0], { titulo: 'Una becaria del Conicet desarrolló un gel que podría reparar el corazón después de un infarto', medio: 'pausa.com.ar', sitio: 'https://www.pausa.com.ar', fecha: '2026-08-04T10:00:00.000Z' });
  assert.match(n[1].titulo, /gel & más$/);
  assert.deepEqual(parsearGoogleNoticias('no es un rss'), []);
});

test('sólo cuentan los títulos que hablan de lo buscado, y los medios se cuentan una vez cada uno', () => {
  const todo = parsearGoogleNoticias(RSS);
  const buenos = soloLosQueHablanDeLoBuscado([todo], ['Pilar Ferrer', 'gel corazón infarto']);
  assert.ok(!buenos.some((x) => /mendocina/.test(x.titulo)), 'la científica mendocina no habla de esto');
  const c = resumirCobertura([buenos]);
  assert.equal(c.total, 3, 'pausa, MinutoUno (dos notas) y MDZ');
  assert.equal(c.nivel, 'cubierta');
  assert.equal(c.primera, '2026-08-03T09:00:00.000Z');
  assert.equal(c.medios[0].medio, 'MinutoUno', 'el primero en publicarlo, primero');
  assert.equal(resumirCobertura([]).nivel, 'sin-cobertura');
  assert.equal(resumirCobertura([[{ medio: 'Uno', titulo: 'x', fecha: null }]]).nivel, 'un-medio');
  const muchos = Array.from({ length: PISTA.muyCubierta }, (_, i) => ({ medio: `Medio ${i}`, titulo: 't', fecha: null }));
  assert.equal(resumirCobertura([muchos]).nivel, 'muy-cubierta');
  for (const nivel of ['muy-cubierta', 'cubierta', 'un-medio', 'sin-cobertura']) assert.ok(NIVELES[nivel]);
});

test('lo nuestro: las notas que comparten varias palabras con la pista; las que no, no', () => {
  const notas = [
    { id: 'a1', titulo: 'Una becaria desarrolló un gel para reparar el corazón tras un infarto', seccion: 'Tecnología', slug: 'una-becaria', fecha: '2026-08-05T00:00:00Z' },
    { id: 'b2', titulo: 'El Concejo aprobó el presupuesto', seccion: 'Política' },
  ];
  const r = buscarEnNuestras(['Pilar Ferrer', 'gel inyectable corazón infarto reparar'], notas);
  assert.deepEqual(r.map((x) => x.titulo), ['Una becaria desarrolló un gel para reparar el corazón tras un infarto']);
  assert.equal(r[0].ruta, '/nota/una-becaria-a1');
  assert.deepEqual(buscarEnNuestras(['Pilar Ferrer'], notas), [], 'con una sola coincidencia no alcanza');
});

test('con IA: las búsquedas y los matices vienen de Gemini; si Gemini falla, se sigue sin ella', async () => {
  const gemini = (obj) => async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }) });
  const c = await consultasDeLaPista(TUIT, { clave: 'k', fetchFn: gemini({ afirmacion: 'Pilar Ferrer creó un gel inyectable para reparar el corazón', consultas: ['Pilar Ferrer gel corazón', 'gel reparar corazón infarto', 'x'] }) });
  assert.deepEqual(c.consultas, ['Pilar Ferrer gel corazón', 'gel reparar corazón infarto']);
  const caida = await consultasDeLaPista(TUIT, { clave: 'k', fetchFn: async () => ({ ok: false, status: 429 }) });
  assert.deepEqual(caida.consultas, ['Pilar Ferrer'], 'sin Gemini, las búsquedas locales');
  const m = await matices('afirmación', [{ medio: 'MDZ', titulo: 'Un gel que podría reparar el corazón' }], { clave: 'k', fetchFn: gemini({ confirma: 'parcial', resumen: 'Dicen que podría.', exagera: ['"ya ayuda al corazón" no figura: dicen que podría'], falta: ['en qué etapa está'] }) });
  assert.equal(m.confirma, 'parcial');
  assert.equal(m.exagera.length, 1);
  assert.equal(await matices('x', [], { clave: 'k' }), null, 'sin medios, nada que comparar');
  assert.equal(await matices('x', [{ medio: 'a', titulo: 'b' }], { clave: null }), null);
});

test('la investigación entera: el caso del gel de Pilar Ferrer', async () => {
  const todo = parsearGoogleNoticias(RSS);
  const buscadas = [];
  const r = await investigarPista(TUIT, {
    clave: null, ahora: new Date('2026-10-01T22:00:00Z'),
    buscar: async (consulta) => { buscadas.push(consulta); return todo; },
    notas: [{ id: 'a1', titulo: 'Un gel para reparar el corazón después de un infarto, la apuesta de una becaria', seccion: 'Tecnología' }],
  });
  assert.equal(r.ok, true);
  assert.deepEqual(buscadas, ['Pilar Ferrer']);
  // Sin IA hay una sola búsqueda ("Pilar Ferrer") y sólo cuentan los títulos que nombran a la persona: MinutoUno y MDZ.
  // Con Gemini hay tres búsquedas (el gel, el infarto) y también entra la nota que no la nombra en el título.
  assert.equal(r.nivel, 'cubierta');
  assert.equal(r.total, 2);
  assert.equal(r.relevancia, PISTA.relevancia, 'una pista entra bien valorada');
  assert.ok(PISTA.relevancia >= 90);
  assert.equal(r.matices, null, 'sin clave no hay matices, y el informe sale igual');
  assert.equal(r.nuestras.length, 1);
  assert.equal(r.pedido.length <= PISTA.maximoDeTexto, true);
});

test('el informe en el panel: escapa lo que viene de afuera, marca el nivel y avisa que sólo se leyeron los títulos', () => {
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const apps = { esc, haceCuanto: () => 'hace 2 meses', chip: (s) => `<chip>${s}</chip>` };
  const html = htmlDeInforme({
    ok: true, afirmacion: 'Un <gel> para el corazón', nivel: 'cubierta', total: 3, primera: '2026-08-03T09:00:00Z', consultas: ['Pilar Ferrer'],
    medios: [{ medio: 'MinutoUno', titulo: 'Quién es Pilar Ferrer', fecha: '2026-08-03T09:00:00Z' }],
    matices: { confirma: 'parcial', resumen: 'Dicen que podría.', exagera: ['"ya repara"'], falta: ['la etapa'] },
    nuestras: [{ titulo: 'Un gel', ruta: '/nota/x', seccion: 'Tecnología' }],
  }, apps);
  assert.match(html, /Un &lt;gel&gt; para el corazón/);
  assert.match(html, /Cubierta por más de un medio/);
  assert.match(html, /3 medios, el primero hace 2 meses/);
  assert.match(html, /Los títulos confirman una parte/);
  assert.match(html, /Puede estar exagerando/);
  assert.match(html, /no leyó las notas/);
  assert.match(htmlDeInforme({ ok: false, motivo: 'La pista toca un tema' }, apps), /No se pudo investigar/);
  assert.match(htmlDeFormulario({ texto: 'hola <b>' }, apps), /hola &lt;b&gt;/);
  assert.match(htmlDeFormulario({}, apps), /no pegues nombres de menores/);
});

test('el panel manda la pista a "Panel del celular" y la nube la guarda cifrada con el mismo camino que los borradores', () => {
  const app = fs.readFileSync(path.join(RAIZ, 'web/public/panel/app.js'), 'utf8');
  assert.match(app, /disparar\('panel\.yml', \{ accion: 'pista', id, pedido: texto, marca \}\)/);
  assert.match(app, /\['pistas', 'Pistas'/);
  assert.match(app, /accion === 'investigar-pista'/);
  const cel = fs.readFileSync(path.join(RAIZ, 'panel/celular.mjs'), 'utf8');
  assert.match(cel, /accion === 'pista'/);
  assert.match(cel, /cerrar\(\{ id, tipo: 'pista', \.\.\.informe \}, llaves\)/);
  assert.match(fs.readFileSync(path.join(RAIZ, '.github/workflows/panel.yml'), 'utf8'), /escribir, pista, nota-pista o foto/);
  assert.match(fs.readFileSync(path.join(RAIZ, 'web/public/panel/sw.js'), 'utf8'), /\/panel\/pistas\.js/);
});

// "Hacer la nota" de una pista y el seguimiento de en qué quedó cada una (3/10/2026, Hernán: "si investiga y si puede armar algo, publicarlas
// como propias" y "ir haciendo un seguimiento en qué quedó cada pista"). Sin red: la búsqueda y la IA se reemplazan.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buscarConTexto, juntarFuentes, esDeRedes, BUSQUEDA } from '../ingesta/busqueda.mjs';
import { escribirNotaDePista, notaParaEscribir, seccionDeLaPista, PEDIDO_DE_PISTA } from '../panel/nota-de-pista.mjs';
import { conPista, conSeguimiento, conResultado, conRevision, RESULTADOS } from '../panel/pistas-libro.mjs';
import { notasDePistas, motivoDeRechazo, idDeNotaDePista, firmaDePista, RELEVANCIA_DE_PISTA, SECCIONES_DE_PISTAS } from '../web/lib/notas-de-pistas.js';
import { idDeNotaDePista as idDelPanel, conNotaDePista, conNotaDePistaRetirada, conPistaResultado, RESULTADOS_DE_PISTA, formatear, ARCHIVOS } from '../web/public/panel/github.js';
import { RESULTADOS as RESULTADOS_DEL_PANEL, htmlDeSeguimiento, htmlDeResultado, htmlDeCerrarPista, htmlDeUnaPista, htmlDeLista } from '../web/public/panel/pistas.js';
import { tieneCuerpo } from '../web/lib/cuerpo.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const AHORA = new Date('2026-10-03T18:00:00Z');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const apps = { esc, haceCuanto: () => 'hace 1 h', chip: (s) => `<chip>${s}</chip>` };
const TEXTO = 'La Municipalidad informó que el corte de agua del jueves en el barrio Norte se extiende hasta las 14 por una obra en la red. '.repeat(8);
const resultado = (url, extra = {}) => ({ url, titulo: `Corte de agua - ${url}`, medio: new URL(url).hostname.replace(/^www\./, ''), fecha: '2026-10-03T10:00:00Z', resumen: 'Resumen del corte de agua del jueves.', texto: TEXTO, puntaje: 0.8, ...extra });
const PISTA = { id: 'pista1abc', texto: 'Cortan el agua el jueves en el barrio Norte de Balcarce', afirmacion: 'Cortan el agua el jueves en el barrio Norte', consultas: ['corte de agua barrio Norte Balcarce'] };

test('la búsqueda manda la clave en un encabezado, descarta las redes y lo que trae poco texto, y no repite un sitio', async () => {
  const pedidos = [];
  const fetchFn = async (url, opts) => {
    pedidos.push({ url, opts });
    return { ok: true, status: 200, json: async () => ({ results: [
      { url: 'https://www.diario.com/a', title: 'A', content: 'r', raw_content: 'x'.repeat(2000), score: 0.9, published_date: '2026-10-03' },
      { url: 'https://www.facebook.com/p', title: 'FB', content: 'r', raw_content: 'x'.repeat(2000), score: 0.8 },
      { url: 'https://radio.com/b', title: 'B', content: 'r', raw_content: 'corto', score: 0.7 },
      { url: 'https://www.diario.com/otra', title: 'C', content: 'r', raw_content: 'y'.repeat(2000), score: 0.6 },
    ] }) };
  };
  const r = await buscarConTexto('corte de agua', { clave: 'tvly-secreta', fetchFn });
  assert.equal(pedidos[0].opts.headers.authorization, 'Bearer tvly-secreta');
  assert.ok(!pedidos[0].url.includes('tvly-secreta'), 'la clave nunca va en la dirección');
  assert.equal(JSON.parse(pedidos[0].opts.body).topic, 'news');
  assert.deepEqual(r.map((x) => x.url), ['https://www.diario.com/a', 'https://www.diario.com/otra'], 'sin redes ni textos cortos');
  assert.equal(juntarFuentes([r]).length, 1, 'dos páginas del mismo sitio no son dos medios');
  assert.ok(esDeRedes('https://www.instagram.com/x') && esDeRedes('https://x.com/a') && !esDeRedes('https://diario.com/x'));
  await assert.rejects(buscarConTexto('x', { clave: 'k', fetchFn: async () => ({ ok: false, status: 401, text: async () => 'bad key' }) }), (e) => e.status === 401 && !/k\b/.test(''));
  await assert.rejects(buscarConTexto('x', { clave: '', fetchFn }), /falta TAVILY_API_KEY/);
  assert.ok(BUSQUEDA.textoMinimo >= 500);
});

test('una pista se escribe con las fuentes que encontró, y el verificador controla contra el texto de ellas', async () => {
  const buscar = async () => [resultado('https://www.diariolavanguardia.com/n/1'), resultado('https://radio.com.ar/n/2')];
  let recibido = null;
  const escribir = async (nota, o) => {
    recibido = { nota, o, texto1: await o.traer(nota.origenes[0].enlace), textoAjeno: await o.traer('https://otro.com') };
    return { ok: true, texto: { titulo: 'Corte de agua el jueves', copete: 'Bajada', cuerpo: TEXTO }, problemas: [], sacadas: 0, aviso: null };
  };
  const r = await escribirNotaDePista(PISTA, { buscar, escribir, ahora: AHORA });
  assert.equal(r.ok, true);
  assert.equal(r.seccion, 'Balcarce', 'la pista nombra Balcarce');
  assert.equal(r.medios, 2);
  assert.deepEqual(r.fuentes.map((f) => f.medio), ['diariolavanguardia.com', 'radio.com.ar']);
  assert.equal(recibido.o.pedido, PEDIDO_DE_PISTA);
  assert.equal(recibido.texto1, TEXTO, 'la IA lee el texto que trajo la búsqueda');
  assert.equal(recibido.textoAjeno, null);
  assert.equal(recibido.nota.fuentesTexto.length, 1, 'el texto de la otra fuente sirve para verificar');
  assert.ok(recibido.nota.id.startsWith('np'));
});

test('si la pista es delicada, no hay fuentes o la búsqueda falla, no se escribe y dice por qué', async () => {
  const escribir = async () => { throw new Error('no se tendría que llamar'); };
  const delicada = await escribirNotaDePista({ ...PISTA, texto: 'Un caso de abuso infantil en Balcarce' }, { buscar: async () => [], escribir });
  assert.equal(delicada.ok, false);
  assert.match(delicada.motivo, /menores, víctimas/);
  const sinFuentes = await escribirNotaDePista(PISTA, { buscar: async () => [], escribir });
  assert.match(sinFuentes.motivo, /No encontré notas de medios con texto/);
  const falla = await escribirNotaDePista(PISTA, { buscar: async () => { throw new Error('Tavily HTTP 429'); }, escribir });
  assert.match(falla.motivo, /No pude buscar en internet/);
  assert.equal((await escribirNotaDePista({ id: 'p', texto: 'algo', consultas: [] }, { escribir })).ok, false);
  assert.equal(seccionDeLaPista('Algo del Concejo en Buenos Aires'), 'Argentina');
  assert.equal(seccionDeLaPista('Cortan el agua en Balcarce'), 'Balcarce');
  assert.ok(notaParaEscribir(PISTA, [resultado('https://a.com/x')]).origenes[0].enlace);
});

const ENTRADA = (extra = {}) => ({
  titulo: 'Corte de agua el jueves en el barrio Norte', copete: 'La obra en la red se extiende hasta las 14.', cuerpo: TEXTO, seccion: 'Balcarce',
  fuentes: [{ medio: 'diariolavanguardia.com', enlace: 'https://www.diariolavanguardia.com/n/1', fecha: '2026-10-03T10:00:00Z' }, { medio: 'radio.com.ar', enlace: 'https://radio.com.ar/n/2' }],
  pista: 'pista1abc', motivo: 'revisada desde el celular', cuando: '2026-10-03T17:00:00Z', por: 'Hernán', ...extra,
});

test('la nota de una pista aprobada se arma como propia, con sus fuentes, su firma y relevancia alta', () => {
  const [n] = notasDePistas({ notas: { pista1abc: ENTRADA() } }, { ahora: AHORA });
  assert.equal(n.id, 'np1abc');
  assert.equal(n.propia, 'pista');
  assert.equal(n.relevancia, RELEVANCIA_DE_PISTA);
  assert.equal(n.relevancia, 95);
  assert.equal(n.seccion, 'Balcarce');
  assert.equal(n.local, true);
  assert.equal(n.fecha, '2026-10-03T17:00:00.000Z');
  assert.equal(n.como, 'publicada');
  assert.equal(n.publicadaPor, 'Hernán');
  assert.equal(n.fuentesConsultadas.length, 2);
  assert.match(n.firma, /escrita con IA a partir de lo que publicaron diariolavanguardia\.com y radio\.com\.ar y revisada por la redacción/);
  assert.ok(tieneCuerpo(n));
  assert.equal(firmaDePista(['A']), 'Nota de Radar Balcarce, escrita con IA a partir de lo que publicaron A y revisada por la redacción');
});

test('una entrada incompleta, retirada o vencida no se publica y no rompe a las otras', () => {
  const malas = {
    sinQuien: ENTRADA({ por: '' }), sinMotivo: ENTRADA({ motivo: '' }), sinFuentes: ENTRADA({ fuentes: [] }), fuenteRara: ENTRADA({ fuentes: [{ medio: 'x', enlace: 'javascript:alert(1)' }] }),
    cuerpoCorto: ENTRADA({ cuerpo: 'Muy corto.' }), seccion: ENTRADA({ seccion: 'Chimentos' }), retirada: ENTRADA({ retirada: { cuando: 'x', por: 'a', motivo: 'b' } }),
    vencida: ENTRADA({ cuando: '2026-01-01T00:00:00Z' }), roto: null,
  };
  const r = notasDePistas({ notas: { ...malas, buena: ENTRADA() } }, { ahora: AHORA });
  assert.deepEqual(r.map((n) => n.pista), ['buena']);
  assert.match(motivoDeRechazo(malas.sinQuien), /falta motivo/);
  assert.match(motivoDeRechazo(malas.cuerpoCorto), /muy corto/);
  assert.deepEqual(notasDePistas(null), []);
  assert.deepEqual(notasDePistas({ notas: 'no' }), []);
});

test('las secciones de las pistas son las de la web, y el panel y la nube arman el mismo id', async () => {
  const datos = leer('web/lib/datos.js');
  for (const s of SECCIONES_DE_PISTAS) assert.ok(datos.includes(`'${s}'`) || datos.includes(`"${s}"`), s);
  assert.equal(SECCIONES_DE_PISTAS.length, 11);
  for (const id of ['pista1abc', 'pistaZ9Y8', 'abc-123', '', null]) assert.equal(idDelPanel(id), idDeNotaDePista(id), String(id));
});

test('el libro de pistas lleva el seguimiento: cómo empezó, cada novedad, la nota y en qué quedó', () => {
  let libro = conPista({}, 'p1', { texto: 't', informe: { ok: true, afirmacion: 'Algo', consultas: ['algo'], nivel: 'sin-cobertura', total: 0, medios: [], nuestras: [] }, sobre: { iv: 'x' }, ahora: new Date(AHORA - 864e5) });
  assert.match(libro.pistas.p1.seguimiento[0].texto, /Se empezó a seguir: sin cobertura/);
  libro = conRevision(libro, 'p1', { informe: { nivel: 'cubierta', total: 3, medios: [{ medio: 'A' }, { medio: 'B' }, { medio: 'C' }], nuestras: [] }, sobre: { iv: 'y' }, novedad: true, motivo: 'ahora la cubren 3 medios', ahora: AHORA });
  assert.match(libro.pistas.p1.seguimiento.at(-1).texto, /Novedad: ahora la cubren 3 medios/);
  libro = conSeguimiento(libro, 'p1', 'Se escribió un borrador con 2 fuentes', AHORA);
  libro = conResultado(libro, 'p1', { tipo: 'publicada', ruta: '/nota/np1' }, AHORA);
  const p = libro.pistas.p1;
  assert.equal(p.estado, 'archivada');
  assert.equal(p.resultado.tipo, 'publicada');
  assert.equal(p.resultado.ruta, '/nota/np1');
  assert.equal(p.novedad, false);
  assert.match(p.seguimiento.at(-1).texto, /Cerrada: Salió como nota nuestra/);
  assert.equal(p.seguimiento.length, 4);
  assert.equal(conResultado(libro, 'p1', { tipo: 'rara' }, AHORA), libro, 'un resultado que no existe no cambia nada');
  assert.deepEqual(Object.keys(RESULTADOS_DEL_PANEL), Object.keys(RESULTADOS));
  assert.deepEqual(Object.keys(RESULTADOS_DE_PISTA), Object.keys(RESULTADOS));
  // Volver a investigar la misma pista conserva el seguimiento y el resultado.
  const otra = conPista(libro, 'p1', { texto: 't', informe: { ok: true, afirmacion: 'Algo', consultas: ['algo'], nivel: 'cubierta', total: 3, medios: [], nuestras: [] }, sobre: { iv: 'z' }, ahora: AHORA });
  assert.equal(otra.pistas.p1.seguimiento.length, 4);
  assert.equal(otra.pistas.p1.resultado.tipo, 'publicada');
});

test('el celular escribe lo mismo que la nube al cerrar una pista, y la nota de una pista con motivo, cuándo y quién', () => {
  const j = { version: 1, pistas: { p1: { estado: 'abierta', creada: AHORA.toISOString(), novedad: true, seguimiento: [] } } };
  const c = conPistaResultado(j, 'p1', { tipo: 'desmentida', comentario: 'lo desmintió el municipio' });
  assert.equal(c.pistas.p1.estado, 'archivada');
  assert.equal(c.pistas.p1.resultado.tipo, 'desmentida');
  assert.equal(c.pistas.p1.resultado.comentario, 'lo desmintió el municipio');
  assert.match(c.pistas.p1.seguimiento[0].texto, /Cerrada: Se desmintió o era falsa \(lo desmintió el municipio\)/);
  assert.equal(conPistaResultado(j, 'p1', { tipo: 'rara' }), j);
  const n = conNotaDePista({}, 'p1', { titulo: 'T', copete: 'C', cuerpo: TEXTO, seccion: 'Balcarce', fuentes: ENTRADA().fuentes, por: 'Hernán', motivo: 'm' });
  assert.equal(n.notas.p1.por, 'Hernán');
  assert.ok(Number.isFinite(Date.parse(n.notas.p1.cuando)));
  assert.equal(notasDePistas(n, { ahora: new Date(Date.parse(n.notas.p1.cuando) + 1000) }).length, 1, 'lo que escribe el celular lo acepta la web');
  const r = conNotaDePistaRetirada(n, 'p1', { por: 'Andrés', motivo: 'error' });
  assert.equal(notasDePistas(r, { ahora: new Date(Date.parse(n.notas.p1.cuando) + 1000) }).length, 0, 'retirada: deja de salir');
  const texto = formatear(ARCHIVOS.notasDePistas, { notas: { a: { titulo: 'x' }, b: { titulo: 'y' } } });
  assert.equal(texto.split('\n').filter((l) => /^"[ab]":/.test(l)).length, 2, 'una nota por renglón');
});

test('el panel muestra el seguimiento, en qué quedó, cómo cerrar y cada acción', () => {
  const pista = { estado: 'archivada', creada: '2026-10-01T10:00:00Z', afirmacion: 'Con <b>algo</b>', total: 3, ultimaRevision: '2026-10-03T10:00:00Z', historial: [],
    seguimiento: [{ cuando: '2026-10-01T10:00:00Z', texto: 'Se empezó a seguir: sin cobertura todavía' }, { cuando: '2026-10-02T10:00:00Z', texto: 'Novedad: ahora la cubren 3 medios' }],
    resultado: { tipo: 'publicada', cuando: '2026-10-03T10:00:00Z', ruta: '/nota/np1' } };
  const s = htmlDeSeguimiento(pista.seguimiento, apps);
  assert.ok(s.indexOf('Novedad') < s.indexOf('Se empezó'), 'lo más nuevo primero');
  assert.equal(htmlDeSeguimiento([], apps), '');
  assert.match(htmlDeResultado(pista, apps), /Salió como nota nuestra/);
  assert.match(htmlDeResultado(pista, apps), /href="https:\/\/radarbalcarce\.com\/nota\/np1"/);
  assert.equal(htmlDeResultado({}, apps), '');
  const cerrar = htmlDeCerrarPista({ id: 'p1', pista }, apps);
  for (const k of ['confirmada', 'desmentida', 'sin-novedad', 'descartada']) assert.match(cerrar, new RegExp(`data-resultado="${k}"`));
  assert.ok(!cerrar.includes('data-resultado="publicada"'), '"salió como nota" lo pone solo el publicar');
  assert.ok(!cerrar.includes('<b>algo</b>'), 'se escapa');
  const una = htmlDeUnaPista({ id: 'p1', pista, informe: null }, apps);
  assert.match(una, /data-accion="retirar-nota-pista"/);
  assert.match(una, /data-accion="reabrir-pista"/);
  const abierta = htmlDeUnaPista({ id: 'p2', pista: { ...pista, estado: 'abierta', resultado: undefined }, informe: null }, apps);
  assert.match(abierta, /data-accion="cerrar-pista"/);
  assert.match(htmlDeLista({ pistas: { p1: pista } }, apps), /En qué quedó: Salió como nota nuestra/);
});

test('lo conectado: la nube hace el borrador, el celular lo publica y la web lo arma', () => {
  const cel = leer('panel/celular.mjs');
  assert.match(cel, /accion === 'nota-pista'/);
  assert.match(cel, /escribirNotaDePista\(\{ \.\.\.pista, id \}, \{ archivo \}\)/);
  assert.match(cel, /`nota-\$\{id\}`/);
  const w = leer('.github/workflows/panel.yml');
  assert.match(w, /TAVILY_API_KEY: \$\{\{ secrets\.TAVILY_API_KEY \}\}/);
  assert.match(w, /nota-pista/);
  const app = leer('web/public/panel/app.js');
  assert.ok(app.includes("disparar('panel.yml', { accion: 'nota-pista', id, pedido: '', marca })"));
  assert.ok(app.includes('async function publicarNotaDePista(id, campos, por)'));
  assert.ok(app.includes("conPistaResultado(j, id, { tipo: 'publicada', ruta: `/nota/${idDeNotaDePista(id)}` })"));
  assert.ok(app.includes("tipo === 'nota-pista' && palabras(campos.cuerpo) < 70"), 'con menos de 70 palabras la web no la arma: el celular no la deja');
  assert.ok(app.includes("accion === 'resultado-pista'"));
  const gen = leer('web/scripts/generar-datos.mjs');
  assert.match(gen, /notasDePistas\(leerJson\(NOTAS_DE_PISTAS, null\)\)/);
  // El archivo existe (el celular necesita uno para guardar) y es un libro de notas; lo que tenga lo escriben las personas, así que la
  // prueba no puede esperarlo vacío (el 3/10 una nota publicada desde el celular la hizo fallar y la web quedó sin actualizarse una hora).
  assert.equal(typeof JSON.parse(leer('web/data/notas-de-pistas.json')).notas, 'object');
  assert.match(leer('web/public/panel/github.js'), /notasDePistas: 'web\/data\/notas-de-pistas\.json'/);
  // Sin la clave de la búsqueda ninguna otra cosa se rompe: sólo "Hacer la nota" avisa que falta.
  assert.match(leer('ingesta/busqueda.mjs'), /falta TAVILY_API_KEY/);
});

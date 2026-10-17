// Redes en el Worker de tareas (infra/tareas-cloudflare/redes.mjs): lo que toca se pide, lo que el render dejó listo se publica, nada se repite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  huellasListas, publicarListos, pedirPiezas, REDES, PIEZA_EN_CAMINO_SEG, INTENTOS_POR_PIEZA_Y_DIA, HORAS_DE_VIDA_DE_UN_RENDER,
} from '../infra/tareas-cloudflare/redes.mjs';
import { correrTarea } from '../infra/tareas-cloudflare/corredor.mjs';
import { crearGithub } from '../infra/compartido/github.mjs';
import { githubFalso } from './ayudas/github-falso.mjs';
import { bindingR2Falso } from './ayudas/r2-falso.mjs';
import { libroNuevo, anotar } from '../redes/elegir.mjs';
import { claveDePieza, piezasQueTocan } from '../redes/piezas.mjs';

const silencio = () => {};
const carpetaTemporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'redes-'));
const escribir = (raiz, ruta, contenido) => { fs.mkdirSync(path.dirname(path.join(raiz, ruta)), { recursive: true }); fs.writeFileSync(path.join(raiz, ruta), contenido); };
const kvFalso = () => { const m = new Map(); return { m, async get(k) { return m.get(k) ?? null; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); } }; };

// 10:05 en Balcarce: el clima de la mañana (7:00) ya pasó, la noticia y el repaso de las 10 tocan.
const AHORA = new Date('2026-10-18T13:05:00Z');

/** Un render ya terminado en el depósito de mentira. */
function renderListo({ huella = 'h1', nombre = 'noticia1', armada = AHORA, historia = false, hora = '10:00' } = {}) {
  const entrada = { nombre, tipo: 'reel', hora, titulo: 'Titular de prueba', notaId: 'n1', notaIds: ['n1', 'n2'], items: [] };
  const manifiesto = { nombre, archivo: `${nombre}.mp4`, duracion: 41.2, huella, ...(historia ? { archivoHistoria: `${nombre}-historia.mp4`, duracionHistoria: 58 } : {}) };
  const objetos = {
    [`pedidos/${huella}/meta.json`]: JSON.stringify({ armada: armada.toISOString(), dia: '2026-10-18', entrada }),
    [`listos/${huella}/manifiesto.json`]: JSON.stringify(manifiesto),
    [`listos/${huella}/${nombre}.mp4`]: new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]),
    ...(historia ? { [`listos/${huella}/${nombre}-historia.mp4`]: new Uint8Array([1, 2, 3]) } : {}),
  };
  return { render: bindingR2Falso(objetos), entrada, manifiesto };
}

test('huellasListas encuentra los pedidos con manifiesto (y sólo ésos), aunque haya muchos', async () => {
  const render = bindingR2Falso({ 'listos/a/manifiesto.json': '{}', 'listos/a/x.mp4': 'x', 'listos/b/x.mp4': 'sin manifiesto todavía', 'listos/c/manifiesto.json': '{}', 'pedidos/d/meta.json': '{}' });
  assert.deepEqual((await huellasListas(render)).sort(), ['a', 'c']);
  assert.deepEqual(await huellasListas(bindingR2Falso()), []);
});

test('un video listo se baja a reels/salida con su pieza en piezas.json, se publica y queda marcado: no se vuelve a publicar', async () => {
  const raiz = carpetaTemporal();
  escribir(raiz, 'web/data/redes.json', JSON.stringify(libroNuevo()));
  const { render, entrada } = renderListo({ historia: true });
  let visto = null;
  const publicarFn = async ({ argv, raiz: r }) => {
    visto = { argv, piezas: JSON.parse(fs.readFileSync(path.join(r, 'reels/salida/piezas.json'), 'utf8')), mp4: [...fs.readFileSync(path.join(r, 'reels/salida/noticia1.mp4'))], historia: fs.existsSync(path.join(r, 'reels/salida/noticia1-historia.mp4')) };
    // como lo haría publicar.mjs: anota la pieza en el libro
    const libro = JSON.parse(fs.readFileSync(path.join(r, 'web/data/redes.json'), 'utf8'));
    anotar(libro, 'instagram', claveDePieza('noticia1', AHORA), { mediaId: 'ig1' });
    fs.writeFileSync(path.join(r, 'web/data/redes.json'), JSON.stringify(libro));
    return 0;
  };
  const r = await publicarListos({ render, raiz, env: {}, ahora: AHORA, log: silencio, publicarFn });
  assert.deepEqual(visto.argv, ['--piezas']);
  assert.equal(visto.piezas.length, 1);
  assert.deepEqual(visto.piezas[0], { ...entrada, archivo: 'noticia1.mp4', duracion: 41.2, archivoHistoria: 'noticia1-historia.mp4', duracionHistoria: 58 });
  assert.deepEqual(visto.mp4, [0, 0, 0, 24, 102, 116, 121, 112], 'el video llegó entero');
  assert.equal(visto.historia, true);
  assert.deepEqual(r.terminadas, ['h1']);
  assert.ok(await render.get('publicados/h1'), 'queda marcado');
  assert.ok(!fs.existsSync(path.join(raiz, 'reels/salida/noticia1.mp4')), 'se borra el video de la carpeta de trabajo (la memoria de un Worker es chica)');
  // la vuelta siguiente no lo toca
  visto = null;
  const otra = await publicarListos({ render, raiz, env: {}, ahora: new Date(AHORA.getTime() + 600e3), log: silencio, publicarFn });
  assert.equal(visto, null);
  assert.deepEqual(otra.intentadas, []);
});

test('lo armado para publicar que lo piezasQueTocan del programa de siempre acepta: la entrada tiene la forma del manifiesto de plan.mjs', () => {
  const { entrada, manifiesto } = renderListo();
  const pieza = { ...entrada, archivo: manifiesto.archivo, duracion: manifiesto.duracion };
  const libro = libroNuevo();
  assert.deepEqual(piezasQueTocan({ piezas: [pieza], libro, ahora: AHORA }).map((p) => p.nombre), ['noticia1']);
  anotar(libro, 'instagram', claveDePieza('noticia1', AHORA), { mediaId: 'x' });
  assert.deepEqual(piezasQueTocan({ piezas: [pieza], libro, ahora: AHORA }), []);
});

test('si la publicación falla, el video queda para la vuelta siguiente; si la pieza ya salió o venció, se marca sin publicarla', async () => {
  const raiz = carpetaTemporal();
  escribir(raiz, 'web/data/redes.json', JSON.stringify(libroNuevo()));
  const { render } = renderListo();
  let intentos = 0;
  const falla = async () => { intentos += 1; return 1; };
  const r = await publicarListos({ render, raiz, env: {}, ahora: AHORA, log: silencio, publicarFn: falla });
  assert.equal(r.codigo, 1);
  assert.deepEqual(r.terminadas, []);
  assert.equal(await render.get('publicados/h1'), null, 'no se marca: se reintenta');
  await publicarListos({ render, raiz, env: {}, ahora: new Date(AHORA.getTime() + 600e3), log: silencio, publicarFn: falla });
  assert.equal(intentos, 2);
  // ya venció: no se publica, se marca
  const viejo = await publicarListos({ render, raiz, env: {}, ahora: new Date(AHORA.getTime() + (HORAS_DE_VIDA_DE_UN_RENDER + 0.5) * 3600e3), log: silencio, publicarFn: falla });
  assert.equal(intentos, 2);
  assert.deepEqual(viejo.terminadas, ['h1']);
  assert.match(JSON.parse(await (await render.get('publicados/h1')).text()).motivo, /vencido/);
  // ya estaba en el libro (otra vuelta lo publicó)
  const b = renderListo({ huella: 'h2' });
  const libro = libroNuevo();
  anotar(libro, 'instagram', claveDePieza('noticia1', AHORA), { mediaId: 'ya' });
  escribir(raiz, 'web/data/redes.json', JSON.stringify(libro));
  const ya = await publicarListos({ render: b.render, raiz, env: {}, ahora: AHORA, log: silencio, publicarFn: falla });
  assert.deepEqual(ya.terminadas, ['h2']);
  assert.equal(intentos, 2);
});

test('un manifiesto de otro pedido, sin su meta o sin el video no se publica', async () => {
  const raiz = carpetaTemporal();
  escribir(raiz, 'web/data/redes.json', JSON.stringify(libroNuevo()));
  let llamadas = 0;
  const publicarFn = async () => { llamadas += 1; return 0; };
  const a = renderListo({ huella: 'a' });
  await a.render.put('listos/a/manifiesto.json', JSON.stringify({ ...a.manifiesto, huella: 'otra' }));
  await publicarListos({ render: a.render, raiz, env: {}, ahora: AHORA, log: silencio, publicarFn });
  const sinMeta = bindingR2Falso({ 'listos/b/manifiesto.json': JSON.stringify({ archivo: 'x.mp4' }) });
  await publicarListos({ render: sinMeta, raiz, env: {}, ahora: AHORA, log: silencio, publicarFn });
  assert.equal(llamadas, 0);
  const c = renderListo({ huella: 'c' });
  await c.render.delete('listos/c/noticia1.mp4');
  await assert.rejects(publicarListos({ render: c.render, raiz, env: {}, ahora: AHORA, log: silencio, publicarFn }), /falta noticia1\.mp4/);
  // sin depósito no hace nada
  assert.deepEqual((await publicarListos({ render: null, raiz, env: {}, ahora: AHORA, log: silencio, publicarFn })).intentadas, []);
});

// ------------------------------------------------------------------ pedir lo que toca

function entornoDePedidos(portada = {}) {
  const falso = githubFalso({ archivosIniciales: {} });
  const github = crearGithub({ token: falso.token, repo: falso.repo, fetchFn: falso.fetchFn, espera: async () => {} });
  const raiz = carpetaTemporal();
  escribir(raiz, 'web/data/redes.json', JSON.stringify(libroNuevo()));
  escribir(raiz, 'web/data/portada.json', JSON.stringify({ notas: [], farmacias: { hoy: true }, ...portada }));
  return { falso, github, raiz, kv: kvFalso() };
}

test('lo que toca ahora se pide UNA vez a «redes-piezas.yml», queda en camino 30 minutos y no se vuelve a pedir en cada vuelta', async () => {
  const e = entornoDePedidos();
  const r = await pedirPiezas({ raiz: e.raiz, env: { REDES_ACTIVAS: 'Si' }, github: e.github, kv: e.kv, ahora: AHORA, log: silencio });
  assert.ok(r.tocan.includes('noticia1'), `tocan: ${r.tocan}`);
  assert.deepEqual(r.pedidas, r.tocan);
  assert.equal(e.falso.estado.despachos.length, 1);
  assert.equal(e.falso.estado.despachos[0].archivo, 'redes-piezas.yml');
  assert.equal(e.falso.estado.despachos[0].inputs.solo, r.pedidas.join(','));
  assert.equal(PIEZA_EN_CAMINO_SEG, 1800);
  assert.ok(await e.kv.get('render:2026-10-18:noticia1'));
  // cinco minutos después: ya están en camino
  const otra = await pedirPiezas({ raiz: e.raiz, env: { REDES_ACTIVAS: 'Si' }, github: e.github, kv: e.kv, ahora: new Date(AHORA.getTime() + 300e3), log: silencio });
  assert.deepEqual(otra.pedidas, []);
  assert.deepEqual(otra.enCamino.sort(), r.pedidas.sort());
  assert.equal(e.falso.estado.despachos.length, 1);
});

test('una pieza que no sale tras cuatro pedidos en el día no se pide más (para no gastar minutos de GitHub en vano)', async () => {
  const e = entornoDePedidos();
  for (let i = 0; i < INTENTOS_POR_PIEZA_Y_DIA; i += 1) {
    e.kv.m.delete('render:2026-10-18:noticia1'); // pasaron los 30 minutos
    await pedirPiezas({ raiz: e.raiz, env: { REDES_ACTIVAS: 'Si' }, github: e.github, kv: e.kv, ahora: AHORA, log: silencio });
  }
  e.kv.m.delete('render:2026-10-18:noticia1');
  const r = await pedirPiezas({ raiz: e.raiz, env: { REDES_ACTIVAS: 'Si' }, github: e.github, kv: e.kv, ahora: AHORA, log: silencio });
  assert.ok(r.sinIntentos.includes('noticia1'));
  assert.ok(!r.pedidas.includes('noticia1'));
});

test('con las redes apagadas no pide nada; en simulacro dice qué pediría y no despierta ningún workflow', async () => {
  const e = entornoDePedidos();
  const apagadas = await pedirPiezas({ raiz: e.raiz, env: { REDES_ACTIVAS: 'No' }, github: e.github, kv: e.kv, ahora: AHORA, log: silencio });
  assert.deepEqual(apagadas.tocan, []);
  assert.equal(e.falso.estado.despachos.length, 0);
  const sim = await pedirPiezas({ raiz: e.raiz, env: { REDES_ACTIVAS: 'Si' }, github: e.github, kv: e.kv, ahora: AHORA, simular: true, log: silencio });
  assert.ok(sim.pedidas.length > 0);
  assert.equal(e.falso.estado.despachos.length, 0);
  assert.equal(e.kv.m.size, 0);
});

// ------------------------------------------------------------------ la tarea entera

test('la tarea «redes» de punta a punta con las redes apagadas: lee el libro y la portada, simula Facebook, no pide ni publica nada y no ensucia GitHub', async () => {
  const falso = githubFalso({ archivosIniciales: { 'web/data/redes.json': JSON.stringify(libroNuevo()), 'web/data/portada.json': JSON.stringify({ notas: [], farmacias: { hoy: true } }) } });
  const github = crearGithub({ token: falso.token, repo: falso.repo, fetchFn: falso.fetchFn, espera: async () => {} });
  const antes = falso.cabeza;
  const r = await correrTarea(REDES, {
    env: { RADAR_GITHUB_TOKEN: falso.token, META_TOKEN: 'meta-falso', REDES_ACTIVAS: 'No', RENDER: undefined },
    github, kv: kvFalso(), raiz: carpetaTemporal(), log: silencio,
  });
  assert.equal(r.ok, true, r.motivo);
  assert.equal(r.cambios, 0);
  assert.equal(falso.cabeza, antes);
  assert.equal(falso.estado.despachos.length, 0);
});

test('la tarea «redes» declara el mismo candado y los mismos archivos que redes.yml, y su mensaje es el del workflow', () => {
  assert.equal(REDES.grupo, 'redes');
  assert.deepEqual(REDES.escribe, ['web/data/redes.json']);
  const yml = fs.readFileSync(path.join(import.meta.dirname, '..', '.github/workflows/redes.yml'), 'utf8');
  assert.match(yml, /group: redes\b/);
  assert.match(yml, /git add web\/data\/redes\.json/);
});

// ------------------------------------------------------------------ las ilustraciones

import { TAREAS } from '../infra/tareas-cloudflare/tareas.mjs';
import { shaDeBlob } from '../infra/compartido/github.mjs';

test('«ilustrar-notas»: antes de correr baja las fotos de las ilustraciones sin control (hay que mirarlas: sin el archivo el control las daría por perdidas y las sacaría de la nota)', async () => {
  const fotos = {
    n1: { archivo: 'n1-ia.jpg', modelo: 'gemini-web', prompt: 'hecha con Gemini web', credito: 'Ilustración generada con IA' }, // sin control
    n2: { archivo: 'n2.jpg', modelo: 'sdxl', credito: 'Ilustración generada con IA' }, // automática vieja: cuenta como controlada
    n3: { archivo: 'n3.jpg', modelo: 'sdxl', control: { ok: true }, credito: 'Ilustración generada con IA' },
  };
  const falso = githubFalso({ archivosIniciales: { 'web/public/fotos-notas/n1-ia.jpg': 'jpeg-viejo-1', 'web/public/fotos-notas/n2.jpg': 'jpeg-2', 'web/public/fotos-notas/n3.jpg': 'jpeg-3' } });
  const cliente = crearGithub({ token: falso.token, repo: falso.repo, fetchFn: falso.fetchFn, espera: async () => {} });
  const raiz = carpetaTemporal();
  const bajados = new Map([['web/data/fotos-ia.json', { sha: 'x', bytes: new TextEncoder().encode(JSON.stringify(fotos)) }]]);
  const mas = await TAREAS['ilustrar-notas'].despuesDeBajar({ github: cliente, raiz, bajados });
  assert.deepEqual([...mas.keys()], ['web/public/fotos-notas/n1-ia.jpg'], 'sólo la que no tiene control');
  assert.equal(fs.readFileSync(path.join(raiz, 'web/public/fotos-notas/n1-ia.jpg'), 'utf8'), 'jpeg-viejo-1');
  assert.equal(mas.get('web/public/fotos-notas/n1-ia.jpg').sha, await shaDeBlob('jpeg-viejo-1'));
  // sin libro todavía, nada que traer
  assert.deepEqual([...await TAREAS['ilustrar-notas'].despuesDeBajar({ github: cliente, raiz, bajados: new Map() })], []);
});

test('«ilustrar-notas»: corre con sus rutas en la carpeta de trabajo, deja la cuenta del día para la corrida siguiente y, si no se pudo generar nada, no cambia nada en GitHub', async () => {
  const portada = { notas: [{ id: 'n1', titulo: 'Se inauguró la muestra de pintura en el Museo', seccion: 'Cultura y agenda', fecha: AHORA.toISOString(), cuerpo: 'x'.repeat(300), local: true }] };
  const falso = githubFalso({
    archivosIniciales: {
      'web/data/portada.json': JSON.stringify(portada), 'web/data/archivo.json': JSON.stringify({ notas: [] }), 'web/data/banco-fotos.json': '{}',
      'web/data/fotos-manuales.json': '{}', 'web/data/fotos-ia.json': '{}',
    },
  });
  const cliente = crearGithub({ token: falso.token, repo: falso.repo, fetchFn: falso.fetchFn, espera: async () => {} });
  const memoria = bindingR2Falso();
  const antes = falso.cabeza;
  const original = globalThis.fetch;
  const pedidos = [];
  globalThis.fetch = async (url) => { pedidos.push(String(url)); return new Response('{}', { status: 400 }); };
  const consola = console.log;
  console.log = () => {};
  let r;
  try {
    // El «esperar» vacío evita los minutos de espera entre reintentos que tendría la corrida de verdad.
    const tarea = { ...TAREAS['ilustrar-notas'], ejecutar: (ctx) => TAREAS['ilustrar-notas'].ejecutar({ ...ctx, esperar: async () => {} }) };
    r = await correrTarea(tarea, {
      env: { RADAR_GITHUB_TOKEN: falso.token, GEMINI_API_KEY_REDACCION: 'g', GEMINI_API_KEY_CLASIFICACION: 'g2', VIGILANTE_TOKEN: 'v' },
      github: cliente, kv: kvFalso(), memoria, raiz: carpetaTemporal(), ahora: () => AHORA, log: silencio,
    });
  } finally { globalThis.fetch = original; console.log = consola; }
  assert.equal(r.ok, true, r.motivo);
  assert.equal(falso.cabeza, antes, 'sin imágenes nuevas no hay nada que guardar');
  assert.ok(pedidos.some((u) => /generativelanguage|groq/.test(u)), `pidió el prompt a una IA: ${pedidos.join(', ')}`);
  // la cuenta del día quedó en la memoria de R2 para la corrida siguiente
  assert.ok([...memoria.objetos.keys()].some((k) => /^memoria\/ilustrar-notas\/\.cache\/cuentas\/2026-10-18-\d+\/cuenta\.json$/.test(k)), [...memoria.objetos.keys()].join(', '));
});

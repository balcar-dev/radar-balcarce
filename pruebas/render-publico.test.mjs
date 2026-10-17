// El video en un repositorio público aparte (infra/render-publico/ y reels/pedido.mjs, reels/render-remoto.mjs; 18/10/2026): lo que se copia está al día, el
// repositorio de render no lleva ningún secreto, y el camino entero —del plan del día al video listo, pasando por R2— anda con una voz de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { controlar, COPIAS, derivados, reemplazos } from '../scripts/sincronizar-render-publico.mjs';
import {
  armarPedido, conVoz, huellaDelPedido, problemasDelPedido, jsonCanonico, entradaDelManifiesto, archivosDeSalida, NOMBRE_VALIDO, VERSION_DEL_PEDIDO,
} from '../reels/pedido.mjs';
import { rehacerEscena, FUNCIONES_DE_ESCENA } from '../reels/escenas/registro.mjs';
import { planDelDia } from '../reels/plan.mjs';
import { armarReelRemoto, enviarAlRender, subirPiezaFija, dependenciasDelEntorno, REPOSITORIO_DE_RENDER } from '../reels/render-remoto.mjs';
import { renderizar, atenderAviso, problemasDelAviso, direccionValida } from '../infra/render-publico/render.mjs';
import { publicarListos } from '../infra/tareas-cloudflare/redes.mjs';
import { clienteR2 } from '../infra/compartido/r2-s3.mjs';
import { HISTORIA_MAXIMA } from '../reels/duracion.mjs';
import { libroNuevo, anotar } from '../redes/elegir.mjs';
import { claveDePieza } from '../redes/piezas.mjs';
import { r2Falso, bindingR2Falso } from './ayudas/r2-falso.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
const leerJson = (r) => JSON.parse(leer(r));
const silencio = () => {};

function tono(segundos) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'tono-'));
  const mp3 = path.join(carpeta, 'voz.mp3');
  execFileSync(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', `sine=frequency=330:duration=${segundos}`, '-b:a', '64k', mp3]);
  return fs.readFileSync(mp3);
}
const PLACA = '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="#F4F1EA"/><text x="540" y="600" font-family="Inter" font-size="72" text-anchor="middle" fill="#14161A">Radar Balcarce</text></svg>';

// ------------------------------------------------------------------ la carpeta que se copia

test('infra/render-publico está al día con reels/ (si cambió un original, hay que correr scripts/sincronizar-render-publico.mjs y volver a copiar la carpeta al repositorio de render)', async () => {
  const { viejos, faltan } = await controlar();
  assert.deepEqual({ viejos, faltan }, { viejos: [], faltan: [] }, 'node scripts/sincronizar-render-publico.mjs');
});

test('los archivos copiados son EXACTAMENTE los de reels/ (sólo cambia el final de línea) y lo que el render reemplaza es mínimo', async () => {
  for (const ruta of COPIAS) {
    const original = leer(ruta).replace(/\r\n/g, '\n');
    const copia = fs.readFileSync(path.join(RAIZ, 'infra/render-publico', ruta), 'utf8');
    assert.equal(copia, original, ruta);
  }
  const r = await reemplazos();
  assert.deepEqual(Object.keys(r).sort(), ['ingesta/criterio.mjs', 'reels/voz-gemini.mjs', 'redes/prompt-redes.mjs'].sort());
  for (const texto of Object.values(r)) assert.ok(texto.split('\n').length < 20, 'los reemplazos son archivos mínimos');
  assert.match(r['ingesta/criterio.mjs'], new RegExp(`segundosMaximoHistoria: ${HISTORIA_MAXIMA} `));
  // el render no se lleva nada del proyecto que no tenga que llevarse: ni datos, ni claves, ni el criterio editorial
  const sobra = [];
  const recorrer = (dir, base = '') => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = `${base}${e.name}`;
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'salida') recorrer(path.join(dir, e.name), `${rel}/`); } else sobra.push(rel);
    }
  };
  recorrer(path.join(RAIZ, 'infra/render-publico'));
  for (const f of sobra) assert.doesNotMatch(f, /(^|\/)(\.env|web\/data|.*redes\.json|CRITERIO.*\.md|celular.*|.*llaves.*)$/i, `no debería estar en el render: ${f}`);
});

test('package.json y package-lock.json del render llevan los mismos paquetes y versiones que los del principal', () => {
  const d = derivados();
  const paquete = JSON.parse(d['package.json']);
  assert.deepEqual(paquete.dependencies, leerJson('package.json').dependencies);
  const lock = JSON.parse(d['package-lock.json']);
  assert.deepEqual(lock.packages[''].dependencies, paquete.dependencies);
  assert.equal(lock.name, 'radar-balcarce-render');
  assert.deepEqual(Object.keys(lock.packages).filter((k) => k && !leerJson('package-lock.json').packages[k]), [], 'ningún paquete que el principal no tenga');
  assert.equal(paquete.type, 'module');
});

test('el repositorio de render no tiene ningún secreto: su workflow no usa `secrets.`, no escucha pull requests y sólo lee; ningún archivo lleva una clave', () => {
  const w = leer('infra/render-publico/.github/workflows/render.yml').replace(/^\s*#.*$/gm, '');
  assert.doesNotMatch(w, /secrets\./);
  assert.doesNotMatch(w, /pull_request/);
  assert.match(w, /repository_dispatch:\s+types: \[render\]/);
  assert.match(w, /permissions:\s+contents: read/);
  assert.match(w, /PAYLOAD: \$\{\{ toJSON\(github\.event\.client_payload\) \}\}/, 'el aviso entra por una variable de entorno, no pegado en el comando');
  assert.ok(!w.split('\n').some((l) => /^\s*run:/.test(l) && /client_payload/.test(l)), 'el aviso no se interpola en ningún comando');
  assert.match(w, /timeout-minutes: \d+/);
  const archivos = ['render.mjs', 'README.md', '.github/workflows/render.yml', 'package.json', 'pruebas/humo.test.mjs'];
  for (const f of archivos) assert.doesNotMatch(fs.readFileSync(path.join(RAIZ, 'infra/render-publico', f), 'utf8'), /ghp_[A-Za-z0-9]{20,}|github_pat_|AKIA[0-9A-Z]{12,}|AIza[0-9A-Za-z_-]{30,}|X-Amz-Signature=[0-9a-f]{20,}/, f);
});

// ------------------------------------------------------------------ el pedido

test('el pedido se arma sin tocar nada de afuera, la misma entrada da la misma huella y cualquier cambio (hasta en la voz) la cambia', () => {
  const voz = tono(1);
  const p1 = conVoz(armarPedido({ nombre: 'clima-manana', tipo: 'historia', guion: 'Buen día, Balcarce.', svg: PLACA, historiaMaxima: HISTORIA_MAXIMA }), voz);
  const p2 = conVoz(armarPedido({ nombre: 'clima-manana', tipo: 'historia', guion: 'Buen día, Balcarce.', svg: PLACA, historiaMaxima: HISTORIA_MAXIMA }), voz);
  assert.equal(huellaDelPedido(p1), huellaDelPedido(p2));
  assert.match(huellaDelPedido(p1), /^[0-9a-f]{24}$/);
  assert.notEqual(huellaDelPedido(p1), huellaDelPedido({ ...p1, acento: '#112233' }));
  assert.notEqual(huellaDelPedido(p1), huellaDelPedido(conVoz(armarPedido({ nombre: 'clima-manana', tipo: 'historia', guion: 'Buen día, Balcarce.', svg: PLACA, historiaMaxima: HISTORIA_MAXIMA }), tono(2))));
  assert.equal(jsonCanonico({ b: 1, a: [2, { d: 1, c: undefined }] }), '{"a":[2,{"d":1}],"b":1}', 'las claves salen ordenadas y lo indefinido no cuenta');
  assert.equal(p1.version, VERSION_DEL_PEDIDO);
  assert.deepEqual(problemasDelPedido(p1, { funcionesDeEscena: FUNCIONES_DE_ESCENA }), []);
  assert.deepEqual(archivosDeSalida('clima-manana'), ['clima-manana.mp4', 'clima-manana-historia.mp4', 'clima-manana.png', 'clima-manana.ass', 'manifiesto.json']);
});

test('un pedido mal armado se rechaza con el motivo: nombre con barras, guion que no coincide con el texto, escena desconocida, voz sin huella, SVG que no es SVG', () => {
  const voz = tono(1);
  const bueno = conVoz(armarPedido({ nombre: 'noticia1', tipo: 'reel', guion: 'Hola.', svg: PLACA, historiaMaxima: HISTORIA_MAXIMA }), voz);
  const malos = [
    [{ ...bueno, nombre: '../x' }, /nombre/], [{ ...bueno, nombre: 'A B' }, /nombre/], [{ ...bueno, tipo: 'video' }, /tipo/], [{ ...bueno, texto: 'Chau.' }, /no es el del guion/],
    [{ ...bueno, escena: { fn: 'rm -rf' } }, /escena desconocida/], [{ ...bueno, voz: undefined }, /voz/], [{ ...bueno, placa: '<script>' }, /placa/], [{ ...bueno, version: 99 }, /versión/],
    [{ ...bueno, acento: 'rojo' }, /acento/], [{ ...bueno, opciones: { ...bueno.opciones, fps: 1000 } }, /fps/], [{ ...bueno, secuencia: { placas: [{ svg: PLACA }] } }, /dos placas/],
  ];
  for (const [p, re] of malos) assert.ok(problemasDelPedido(p, { funcionesDeEscena: FUNCIONES_DE_ESCENA }).some((x) => re.test(x)), `${re}: ${JSON.stringify(problemasDelPedido(p, { funcionesDeEscena: FUNCIONES_DE_ESCENA }))}`);
  assert.ok(NOMBRE_VALIDO.test('clima-manana') && NOMBRE_VALIDO.test('noticia1'));
  assert.ok(problemasDelPedido(null).length);
  assert.ok(problemasDelPedido({ ...bueno, placa: `<svg>${'x'.repeat(13 * 1024 * 1024)}</svg>` }).some((x) => /demasiado grande/.test(x)));
});

// ------------------------------------------------------------------ de una pieza real del plan al video

const portada = leerJson('web/data/portada.json');
const FECHA = new Date('2026-10-09T10:00:00Z');
const plan = () => planDelDia({ clima: portada.clima, farmacias: { turnos: [portada.farmacias.hoy].filter(Boolean) }, notas: [], yaPublicadas: true }, { fecha: FECHA, forzar: ['clima-manana', 'clima-noche'] }).piezas;

test('la escena del clima lleva su descriptor y, rehecha desde él, dibuja EXACTAMENTE los mismos cuadros', () => {
  const p = plan().find((x) => x.nombre === 'clima-manana');
  assert.ok(p?.escena?.descriptor, 'la escena trae su descriptor');
  assert.equal(p.escena.descriptor.fn, 'escenaDeClima');
  const viaJson = JSON.parse(JSON.stringify(p.escena.descriptor)); // lo que viaja por la red
  const otra = rehacerEscena(viaJson);
  for (const t of [0, 1.5, 4, 9]) assert.equal(otra.cuadro(t, 12), p.escena.cuadro(t, 12), `el cuadro de t=${t}`);
  assert.throws(() => rehacerEscena({ fn: 'inventada', args: {} }), /escena desconocida/);
  // y los pedidos de TODAS las piezas del plan salen bien armados
  for (const pieza of plan()) {
    const pedido = conVoz(armarPedido({
      nombre: pieza.nombre, tipo: pieza.tipo, guion: pieza.guion, svg: pieza.svg, svg2: pieza.svg2, acento: pieza.acento, escena: pieza.escena, secuencia: pieza.secuencia, historiaMaxima: HISTORIA_MAXIMA,
    }), Buffer.from('voz'));
    assert.deepEqual(problemasDelPedido(pedido, { funcionesDeEscena: FUNCIONES_DE_ESCENA }), [], pieza.nombre);
  }
});

test('una pieza del plan armada con el render de infra/render-publico da el mismo video que pide el principal: dura lo que la voz, con tapa, subtítulos y manifiesto', async () => {
  const pieza = plan().find((x) => x.nombre === 'clima-manana');
  const voz = tono(3);
  const pedido = conVoz(armarPedido({ nombre: pieza.nombre, tipo: pieza.tipo, guion: pieza.guion, svg: pieza.svg, acento: pieza.acento, escena: pieza.escena, historiaMaxima: HISTORIA_MAXIMA }), voz);
  const r = await renderizar({ pedido, voz, log: silencio });
  assert.equal(r.manifiesto.nombre, 'clima-manana');
  assert.equal(r.manifiesto.huella, huellaDelPedido(pedido));
  assert.ok(r.manifiesto.duracion >= 3 && r.manifiesto.duracion < 10, `dura ${r.manifiesto.duracion}`);
  assert.equal(r.manifiesto.archivoHistoria, undefined, 'dura menos de 58 s: no hace falta recorte');
  assert.deepEqual(r.archivos.sort(), ['clima-manana.ass', 'clima-manana.mp4', 'clima-manana.png']);
  assert.ok(fs.statSync(path.join(r.carpeta, 'clima-manana.mp4')).size > 50_000);
});

test('un video de más de 58 segundos deja además la versión recortada para las historias, y el manifiesto lo dice', async () => {
  const voz = tono(1);
  const pedido = conVoz(armarPedido({ nombre: 'repaso-largo', tipo: 'reel', guion: 'Un repaso muy largo.', svg: PLACA, animar: false, historiaMaxima: HISTORIA_MAXIMA }), voz);
  // El armado de verdad de un video de más de un minuto tarda más de uno en armarse: acá se reemplaza por uno que devuelve lo que devolvería.
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'largo-'));
  const armar = async (spec, dir) => {
    fs.mkdirSync(dir, { recursive: true });
    for (const a of ['repaso-largo.mp4', 'repaso-largo-historia.mp4', 'repaso-largo.png', 'repaso-largo.ass']) fs.writeFileSync(path.join(dir, a), a);
    return { mp4: path.join(dir, 'repaso-largo.mp4'), duracion: 71.26, historia: { mp4: path.join(dir, 'repaso-largo-historia.mp4'), duracion: 58 } };
  };
  const r = await renderizar({ pedido, voz, log: silencio, armar, carpeta: path.join(RAIZ, 'infra/render-publico/reels/salida') });
  assert.equal(r.manifiesto.duracion, 71.3);
  assert.equal(r.manifiesto.archivoHistoria, 'repaso-largo-historia.mp4');
  assert.equal(r.manifiesto.duracionHistoria, 58);
  assert.deepEqual(r.archivos.sort(), ['repaso-largo-historia.mp4', 'repaso-largo.ass', 'repaso-largo.mp4', 'repaso-largo.png']);
  void carpeta;
});

test('el render se niega si la voz no es la del pedido, o si su historia máxima no es la del principal', async () => {
  const voz = tono(1);
  const pedido = conVoz(armarPedido({ nombre: 'humo', tipo: 'historia', guion: 'Hola.', svg: PLACA, animar: false, historiaMaxima: HISTORIA_MAXIMA }), voz);
  await assert.rejects(renderizar({ pedido, voz: tono(2), log: silencio }), /no es la del pedido/);
  const otro = conVoz(armarPedido({ nombre: 'humo', tipo: 'historia', guion: 'Hola.', svg: PLACA, animar: false, historiaMaxima: 45 }), voz);
  await assert.rejects(renderizar({ pedido: otro, voz, log: silencio }), /sincronizar/);
});

// ------------------------------------------------------------------ del principal al render y de vuelta, por R2

function renderGitHubFalso() {
  const avisos = [];
  return { avisos, async avisar(tipo, payload) { avisos.push({ tipo, payload }); return true; } };
}

test('armarReelRemoto: pide la voz, sube el pedido a R2, firma direcciones de una hora y despierta al render con un aviso que entra en los límites de GitHub', async () => {
  const r2 = r2Falso();
  const render = renderGitHubFalso();
  const pieza = plan().find((x) => x.nombre === 'clima-manana');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'remoto-'));
  const hablar = async (texto, destino, opciones) => { fs.writeFileSync(destino, tono(5)); hablar.visto = { texto, opciones }; return { archivo: destino, duracion: 5, palabras: [] }; };
  const ahora = new Date('2026-10-09T10:05:00Z');
  const r = await armarReelRemoto({ ...pieza, reservarVoz: 2, hablar }, dir, { dependencias: { r2: r2.cliente, render }, ahora, log: silencio });
  assert.equal(r.pendiente, true);
  assert.match(r.huella, /^[0-9a-f]{24}$/);
  // la voz se pidió con la voz de la pieza, su indicación y su lugar en el cupo (como armarReel)
  assert.equal(hablar.visto.opciones.pieza, 'clima-manana');
  assert.equal(hablar.visto.opciones.reservar, 2);
  assert.ok(hablar.visto.texto.length > 10);
  // en R2: el pedido, la voz y lo que el manifiesto necesita saber
  const claves = [...r2.objetos.keys()].sort();
  assert.deepEqual(claves, [`pedidos/${r.huella}/meta.json`, `pedidos/${r.huella}/pedido.json`, `pedidos/${r.huella}/voz.mp3`]);
  const pedido = JSON.parse(r2.texto(`pedidos/${r.huella}/pedido.json`));
  assert.equal(huellaDelPedido(pedido), r.huella);
  assert.deepEqual(problemasDelPedido(pedido, { funcionesDeEscena: FUNCIONES_DE_ESCENA }), []);
  const meta = JSON.parse(r2.texto(`pedidos/${r.huella}/meta.json`));
  assert.equal(meta.dia, '2026-10-09');
  assert.deepEqual(meta.entrada, entradaDelManifiesto(pieza));
  // el aviso al render
  assert.equal(render.avisos.length, 1);
  const { tipo, payload } = render.avisos[0];
  assert.equal(tipo, 'render');
  assert.deepEqual(Object.keys(payload).sort(), ['huella', 'nombre', 'pedido', 'subidas', 'voz'], 'GitHub acepta hasta 10 propiedades');
  assert.ok(JSON.stringify(payload).length < 60_000, 'y hasta 65.535 caracteres');
  assert.deepEqual(Object.keys(payload.subidas).sort(), archivosDeSalida('clima-manana').sort());
  assert.match(payload.pedido, /metodo=GET&expira=3600/);
  for (const [archivo, url] of Object.entries(payload.subidas)) assert.match(url, new RegExp(`listos/${r.huella}/${archivo.replace(/\./g, '\\.')}\\?metodo=PUT&expira=3600`));
  assert.ok(!JSON.stringify(payload).includes('GEMINI') && !JSON.stringify(payload).includes('META_TOKEN'));
  // si ya estaba renderizado, no se vuelve a pedir
  await r2.cliente.guardar(`listos/${r.huella}/manifiesto.json`, '{}');
  const otra = await armarReelRemoto({ ...pieza, hablar }, dir, { dependencias: { r2: r2.cliente, render }, ahora, log: silencio });
  assert.equal(otra.yaListo, true);
  assert.equal(render.avisos.length, 1, 'no despertó al render de nuevo');
});

test('sin cupo de voz la pieza no se manda al render (nunca con otra voz) y el mensaje es el de siempre', async () => {
  const pieza = plan().find((x) => x.nombre === 'clima-manana');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'remoto-'));
  const sinCupo = async () => { const e = new Error('hoy ya se usaron los 10 audios'); e.sinCupo = true; throw e; };
  const render = renderGitHubFalso();
  await assert.rejects(armarReelRemoto({ ...pieza, hablar: sinCupo }, dir, { dependencias: { r2: r2Falso().cliente, render }, log: silencio }), /sin voz: .*La pieza no sale con otra voz/);
  await assert.rejects(armarReelRemoto({ ...pieza, hablar: async () => { throw new Error('503'); } }, dir, { dependencias: { r2: r2Falso().cliente, render }, log: silencio }), /Gemini no respondió/);
  assert.equal(render.avisos.length, 0);
});

test('faltan variables: el error dice cuáles (sin mostrar ninguna), y con todas arma los clientes', () => {
  assert.throws(() => dependenciasDelEntorno({}), /faltan variables.*CLOUDFLARE_ACCOUNT_ID.*RENDER_GITHUB_TOKEN/);
  const d = dependenciasDelEntorno({ CLOUDFLARE_ACCOUNT_ID: 'c', R2_ACCESS_KEY_ID: 'k', R2_SECRET_ACCESS_KEY: 's', R2_RENDER: 'radar-render', RENDER_GITHUB_TOKEN: 'ghp_x' });
  assert.equal(typeof d.r2.firmar, 'function');
  assert.equal(d.render.repo, REPOSITORIO_DE_RENDER);
});

test('de punta a punta: el aviso del principal → el render baja el pedido, arma el video y sube todo con el manifiesto al final → el Worker de tareas lo ve listo y lo prepara para publicar', async () => {
  const pieza = plan().find((x) => x.nombre === 'clima-manana');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'remoto-'));
  const r2 = r2Falso();
  const render = renderGitHubFalso();
  const ahora = new Date('2026-10-09T10:05:00Z');
  const voz = tono(3);
  await armarReelRemoto({ ...pieza, escena: null, hablar: async (texto, destino) => { fs.writeFileSync(destino, voz); return { archivo: destino, duracion: 5, palabras: [] }; } }, dir, { dependencias: { r2: r2.cliente, render }, ahora, log: silencio });
  const aviso = render.avisos[0].payload;

  // El «Internet» del render: las direcciones firmadas de mentira apuntan al R2 de mentira.
  const subidasEnOrden = [];
  const claveDe = (url) => new URL(url).pathname.replace(/^\//, '');
  const fetchFn = async (url, init = {}) => {
    const clave = claveDe(url);
    if ((init.method ?? 'GET') === 'PUT') { subidasEnOrden.push(clave.split('/').pop()); await r2.cliente.guardar(clave, new Uint8Array(init.body)); return new Response('', { status: 200 }); }
    const bytes = await r2.cliente.leer(clave);
    return bytes ? new Response(bytes, { status: 200 }) : new Response('', { status: 404 });
  };
  // las direcciones del R2 de mentira son de otro anfitrión: se las traduce a una de R2 de verdad, que es lo que el render exige
  const aR2 = (u) => u.replace('https://falso.r2.cloudflarestorage.com', 'https://cuenta.r2.cloudflarestorage.com');
  const avisoR2 = { ...aviso, pedido: aR2(aviso.pedido), voz: aR2(aviso.voz), subidas: Object.fromEntries(Object.entries(aviso.subidas).map(([a, u]) => [a, aR2(u)])) };
  assert.deepEqual(problemasDelAviso(avisoR2), []);
  const carpeta = path.join(RAIZ, 'infra/render-publico/reels/salida');
  const manifiesto = await atenderAviso(avisoR2, { fetchFn, log: silencio, carpeta });
  assert.equal(manifiesto.huella, aviso.huella);
  assert.equal(subidasEnOrden.at(-1), 'manifiesto.json', 'el manifiesto se sube ÚLTIMO');
  assert.deepEqual(subidasEnOrden.slice(0, -1).sort(), ['clima-manana.ass', 'clima-manana.mp4', 'clima-manana.png']);
  assert.ok((await r2.cliente.leer(`listos/${aviso.huella}/clima-manana.mp4`)).length > 50_000);

  // el Worker de tareas, en la vuelta siguiente del reloj de Redes: ve el manifiesto, baja el video y arma la pieza para publicar
  const binding = bindingR2Falso();
  for (const [k, v] of r2.objetos) await binding.put(k, v);
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'tareas-'));
  fs.mkdirSync(path.join(raiz, 'web/data'), { recursive: true });
  fs.writeFileSync(path.join(raiz, 'web/data/redes.json'), JSON.stringify(libroNuevo()));
  let piezas = null;
  const publicarFn = async ({ raiz: r }) => {
    piezas = JSON.parse(fs.readFileSync(path.join(r, 'reels/salida/piezas.json'), 'utf8'));
    assert.ok(fs.statSync(path.join(r, 'reels/salida/clima-manana.mp4')).size > 50_000);
    const libro = JSON.parse(fs.readFileSync(path.join(r, 'web/data/redes.json'), 'utf8'));
    anotar(libro, 'instagram', claveDePieza('clima-manana', ahora), { mediaId: 'ig' });
    fs.writeFileSync(path.join(r, 'web/data/redes.json'), JSON.stringify(libro));
    return 0;
  };
  const res = await publicarListos({ render: binding, raiz, env: {}, ahora, log: silencio, publicarFn });
  assert.deepEqual(res.terminadas, [aviso.huella]);
  assert.equal(piezas.length, 1);
  assert.deepEqual({ ...piezas[0], duracion: undefined }, { ...entradaDelManifiesto(pieza), archivo: 'clima-manana.mp4', duracion: undefined });
  assert.equal(piezas[0].duracion, manifiesto.duracion);
});

test('el render rechaza un aviso con direcciones que no son de R2, subidas de más o un pedido que no es el de la huella', async () => {
  const huella = 'a'.repeat(24);
  const r2 = 'https://c.r2.cloudflarestorage.com/x';
  const subidas = Object.fromEntries(archivosDeSalida('humo').map((a) => [a, `${r2}/${a}`]));
  assert.deepEqual(problemasDelAviso({ huella, nombre: 'humo', pedido: r2, voz: r2, subidas }), []);
  assert.ok(problemasDelAviso({ huella, nombre: 'humo', pedido: 'https://evil.example/x', voz: r2, subidas }).length);
  assert.ok(problemasDelAviso({ huella, nombre: 'humo', pedido: r2, voz: r2, subidas: { ...subidas, 'otro.sh': r2 } }).length);
  assert.ok(problemasDelAviso({ huella, nombre: '../x', pedido: r2, voz: r2, subidas }).length);
  assert.ok(problemasDelAviso({ huella: 'corta', nombre: 'humo', pedido: r2, voz: r2, subidas }).length);
  assert.equal(direccionValida('https://evil.r2.cloudflarestorage.com.evil.com/x'), false);
  const voz = tono(1);
  const pedido = conVoz(armarPedido({ nombre: 'humo', tipo: 'historia', guion: 'Hola.', svg: PLACA, animar: false, historiaMaxima: HISTORIA_MAXIMA }), voz);
  const fetchFn = async (url) => new Response(String(url).includes('voz') ? voz : JSON.stringify(pedido), { status: 200 });
  await assert.rejects(atenderAviso({ huella, nombre: 'humo', pedido: `${r2}/pedido.json`, voz: `${r2}/voz.mp3`, subidas }, { fetchFn, log: silencio }), /huella del pedido no es la del aviso/);
});

test('una pieza fija no pasa por el render: su video ya armado se sube a R2 con su manifiesto y se publica igual', async () => {
  const r2 = r2Falso();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fija-'));
  const mp4 = path.join(dir, 'participa-lunes.mp4');
  fs.writeFileSync(mp4, Buffer.from([0, 0, 0, 24, 102, 116, 121, 112]));
  const p = { nombre: 'participa-lunes', tipo: 'historia', hora: '12:00', titulo: 'Participá', notaIds: [], items: [] };
  const a = await subirPiezaFija({ p, archivoMp4: mp4, duracion: 20.04, hasta: '2026-10-20', r2: r2.cliente, ahora: new Date('2026-10-12T14:00:00Z'), log: silencio });
  const claves = [...r2.objetos.keys()];
  assert.ok(claves.includes(`listos/${a.huella}/participa-lunes.mp4`) && claves.includes(`listos/${a.huella}/manifiesto.json`) && claves.includes(`pedidos/${a.huella}/meta.json`));
  assert.equal(JSON.parse(r2.texto(`listos/${a.huella}/manifiesto.json`)).duracion, 20);
  const antes = r2.registro.length;
  await subirPiezaFija({ p, archivoMp4: mp4, duracion: 20, hasta: '2026-10-20', r2: r2.cliente, ahora: new Date('2026-10-12T14:00:00Z'), log: silencio });
  assert.equal(r2.registro.filter(([v]) => v === 'guardar').length, 3, 'la segunda vez no sube nada de nuevo');
  void antes; void clienteR2;
});

test('con RENDER_REMOTO el plan no arma videos acá: el manifiesto queda vacío y las enviadas quedan anotadas (probado sin gastar voz)', () => {
  const plan_ = leer('reels/plan.mjs');
  assert.match(plan_, /RENDER_REMOTO/);
  assert.match(plan_, /if \(r\.pendiente\) \{[\s\S]*?enviadas\.push\(/);
  assert.match(plan_, /enviadas\.json/);
  assert.match(plan_, /\.\.\.entradaDelManifiesto\(p\),/);
  // la entrada del manifiesto que arma el plan tiene la misma forma que la que arma el pedido
  const e = entradaDelManifiesto({ nombre: 'n', tipo: 'reel', hora: '10:00', titulo: 'T', notaId: 'a', notaIds: ['a', 'b'], items: [{ x: 1 }], reelEnFacebook: true });
  assert.deepEqual(Object.keys(e), ['nombre', 'tipo', 'hora', 'titulo', 'notaId', 'notaIds', 'items', 'reelEnFacebook']);
  assert.deepEqual(Object.keys(entradaDelManifiesto({ nombre: 'n', tipo: 'reel', hora: '10:00', titulo: 'T' })), ['nombre', 'tipo', 'hora', 'titulo', 'notaId', 'notaIds', 'items']);
});

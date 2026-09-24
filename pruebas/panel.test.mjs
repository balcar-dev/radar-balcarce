// El panel: lo que se puede probar sin abrirlo.
//
// El tablero corre en una ventana y guarda archivos, así que lo que vale la
// pena vigilar acá son las tres cosas que ya fallaron o que pueden fallar sin
// que nadie se entere: que un campo editable se vea, que llegue a la web, y
// que lo decidido se suba a GitHub.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { aplicarAviso, SLOTS_AVISOS } from '../panel/avisos.mjs';
import { camposEditables, decisionParaLaWeb } from '../panel/notas.mjs';
import { crearSincronizador } from '../panel/sincronizar.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');

// ------------------------------------------------------------ los avisos

test('cargar un aviso lo deja en su espacio, sin espacios de sobra', () => {
  const r = aplicarAviso({ pie: null }, { slot: 'clima', nombre: '  Panadería La Espiga ', texto: ' Pan casero ', logo: '' });
  assert.deepEqual(r.clima, { nombre: 'Panadería La Espiga', texto: 'Pan casero', logo: undefined });
  assert.equal(r.pie, null, 'tocó otro espacio');
});

test('un nombre vacío borra el aviso y no toca los otros', () => {
  const r = aplicarAviso({ clima: { nombre: 'X' }, pie: { nombre: 'Y' } }, { slot: 'clima', nombre: '   ' });
  assert.equal(r.clima, null);
  assert.deepEqual(r.pie, { nombre: 'Y' });
});

test('un espacio que no existe se rechaza', () => {
  assert.throws(() => aplicarAviso({}, { slot: 'banner-gigante', nombre: 'X' }), /no existe/);
});

test('son exactamente tres espacios, los mismos que dibuja la web', () => {
  assert.deepEqual(SLOTS_AVISOS, ['apertura', 'clima', 'pie']);
  const web = leer('web/components/avisos.js') + leer('web/app/page.js') + leer('web/app/layout.js');
  for (const s of SLOTS_AVISOS) assert.ok(web.includes(`slot="${s}"`), `la web no dibuja el espacio ${s}`);
});

test('no se le entrega a la web un aviso que no sea texto y un logo', () => {
  const r = aplicarAviso({}, { slot: 'pie', nombre: 'Ferretería', texto: 'Abierto todos los días', logo: 'https://x/l.png' });
  assert.deepEqual(Object.keys(r.pie).sort(), ['logo', 'nombre', 'texto']);
});

// ---------------------------------------------- los campos de cada nota

test('el panel muestra el cuerpo de la nota (se les había olvidado el 23/09)', () => {
  const c = camposEditables({ titulo: 'T', resumenFuente: 'R' }, { cuerpo: 'Un párrafo.', guion: 'G', deIA: true });
  assert.equal(c.cuerpo, 'Un párrafo.');
  assert.equal(c.titulo, 'T');
  assert.equal(c.copete, 'R', 'sin decisión, el copete es el resumen de la fuente');
});

test('lo decidido manda sobre lo que trajo la fuente', () => {
  const c = camposEditables({ titulo: 'T', resumenFuente: 'R' }, { titulo: 'Mío', copete: 'Copete mío' });
  assert.equal(c.titulo, 'Mío');
  assert.equal(c.copete, 'Copete mío');
  assert.equal(c.cuerpo, null);
});

test('todo lo que se edita en el panel llega a la web', () => {
  const d = decisionParaLaWeb({
    estado: 'publicada', titulo: 'T', copete: 'C', cuerpo: 'Cuerpo', guion: 'G', deIA: false, por: 'hernan', cuando: 'hoy', interno: 'no sale',
  });
  assert.equal(d.cuerpo, 'Cuerpo');
  assert.equal(d.estado, 'publicada');
  assert.ok(!('interno' in d), 'exportó algo que la web no usa');
});

test('el panel guarda el cuerpo que se edita y el formulario lo envía', () => {
  const html = leer('panel/panel.html');
  const servidor = leer('panel/servidor.mjs');
  assert.match(html, /id="eB"/, 'falta el campo de cuerpo en el formulario');
  assert.match(html, /cuerpo: \$\('#eB'\)\.value/, 'el formulario no manda el cuerpo');
  assert.match(servidor, /cuerpo: cuerpo \?\? previo\.cuerpo/, 'el servidor no guarda el cuerpo editado');
  assert.match(servidor, /\.\.\.camposEditables\(n, d\)/, 'la vista no usa los campos editables');
});

// ------------------------------------------------- el tablero en sí

test('el script del tablero es JavaScript válido y trae todas sus pestañas', () => {
  const html = leer('panel/panel.html');
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  assert.doesNotThrow(() => new vm.Script(script), 'el script del panel tiene un error de sintaxis');
  const pestanas = [...html.matchAll(/data-t="(\w+)"/g)].map((m) => m[1]);
  for (const p of pestanas) {
    assert.ok(script.includes(`tab === '${p}'`) || p === 'cola', `la pestaña ${p} no se dibuja`);
  }
  assert.ok(pestanas.includes('avisos'));
});

test('el servidor del panel es JavaScript válido y atiende los avisos', () => {
  const servidor = leer('panel/servidor.mjs');
  assert.match(servidor, /ruta === '\/api\/avisos'/);
  assert.match(servidor, /aplicarAviso\(/);
});

// -------------------------------------- la sincronización con GitHub

function gitFalso(respuestas = {}) {
  const llamadas = [];
  const git = async (args) => {
    llamadas.push(args.join(' '));
    const clave = args[0] === 'diff' ? 'diff' : args[0];
    return respuestas[clave] ?? { codigo: 0, salida: '' };
  };
  return { git, llamadas };
}

test('con cambios: agrega, commitea, trae lo nuevo y sube', async () => {
  const { git, llamadas } = gitFalso({ diff: { codigo: 1, salida: '' } });
  const s = crearSincronizador({ archivos: ['web/data/decisiones.json', 'web/data/avisos.json'], git, log: () => {} });
  const r = await s.sincronizar();
  assert.equal(r.hecho, true);
  assert.deepEqual(llamadas.map((l) => l.split(' ')[0]), ['add', 'diff', 'commit', 'pull', 'push']);
  assert.match(llamadas[0], /web\/data\/decisiones\.json web\/data\/avisos\.json/);
  assert.match(llamadas[3], /--rebase --autostash/);
});

test('sin cambios no commitea ni sube nada', async () => {
  const { git, llamadas } = gitFalso({ diff: { codigo: 0, salida: '' } });
  const r = await crearSincronizador({ archivos: ['a'], git, log: () => {} }).sincronizar();
  assert.equal(r.hecho, false);
  assert.ok(!llamadas.some((l) => l.startsWith('commit') || l.startsWith('push')));
});

test('si el pull da conflicto, cancela el rebase y no sube', async () => {
  const { git, llamadas } = gitFalso({ diff: { codigo: 1, salida: '' }, pull: { codigo: 1, salida: 'CONFLICT' } });
  const r = await crearSincronizador({ archivos: ['a'], git, log: () => {} }).sincronizar();
  assert.equal(r.hecho, false);
  assert.match(r.motivo, /pull/);
  assert.ok(llamadas.includes('rebase --abort'), 'dejó el repositorio en medio de un rebase');
  assert.ok(!llamadas.some((l) => l.startsWith('push')));
});

test('varios cambios seguidos se juntan en una sola subida', async () => {
  const { git, llamadas } = gitFalso({ diff: { codigo: 1, salida: '' } });
  let pendiente = null;
  const s = crearSincronizador({
    archivos: ['a'], git, log: () => {},
    temporizador: (fn) => { pendiente = fn; return 1; }, cancelar: () => { pendiente = null; },
  });
  s.programar(); s.programar(); s.programar();
  assert.equal(llamadas.length, 0, 'subió antes de esperar');
  await pendiente();
  assert.equal(llamadas.filter((l) => l.startsWith('push')).length, 1);
});

test('dos sincronizaciones a la vez no se pisan', async () => {
  let libera;
  const espera = new Promise((r) => { libera = r; });
  const git = async (args) => { if (args[0] === 'add') await espera; return { codigo: args[0] === 'diff' ? 0 : 0, salida: '' }; };
  const s = crearSincronizador({ archivos: ['a'], git, log: () => {} });
  const primera = s.sincronizar();
  const segunda = await s.sincronizar();
  assert.equal(segunda.motivo, 'ya hay una en curso');
  libera();
  await primera;
});

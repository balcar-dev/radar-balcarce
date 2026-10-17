// Guardar en GitHub por la API, sin git ni minutos de Actions (infra/compartido/github.mjs), contra un GitHub de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearGithub, shaDeBlob, ErrorDeGithub } from '../infra/compartido/github.mjs';
import { githubFalso } from './ayudas/github-falso.mjs';

const TOKEN = 'ghp_PRUEBA';
const hacer = (archivos = {}) => {
  const falso = githubFalso({ token: TOKEN, archivosIniciales: archivos });
  const gh = crearGithub({ token: TOKEN, repo: falso.repo, fetchFn: falso.fetchFn, espera: async () => {} });
  return { falso, gh };
};

test('el SHA de un archivo es el que calcula el sistema de versiones (valores de referencia conocidos)', async () => {
  // El valor de referencia para el archivo vacío y para "hello world\n":
  assert.equal(await shaDeBlob(''), 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
  assert.equal(await shaDeBlob('hello world\n'), '3b18e512dba79e4c8300dd08aeb37f8e728b8dad');
});

test('lee un archivo, su SHA y el árbol; lo que no existe da null', async () => {
  const { gh } = hacer({ 'web/data/a.json': '{"a":1}', 'x/y.txt': 'ñandú' });
  assert.equal(new TextDecoder().decode(await gh.leerArchivo('web/data/a.json')), '{"a":1}');
  assert.equal(new TextDecoder().decode(await gh.leerArchivo('x/y.txt')), 'ñandú');
  assert.equal(await gh.leerArchivo('no/esta.json'), null);
  assert.equal(await gh.shaDe('web/data/a.json'), await shaDeBlob('{"a":1}'));
  assert.equal(await gh.shaDe('no/esta.json'), null);
  const arbol = await gh.arbol();
  assert.equal(arbol.get('x/y.txt'), await shaDeBlob('ñandú'));
  assert.equal(arbol.size, 2);
});

test('un commit sube texto, binarios y borra, todo junto, sobre la cabeza actual', async () => {
  const { falso, gh } = hacer({ 'web/data/a.json': '{"a":1}', 'web/public/fotos-notas/vieja.jpg': 'vieja' });
  const foto = Uint8Array.from([255, 216, 255, 0, 1, 2, 250]);
  const r = await gh.commitear({
    mensaje: 'Datos de la portada · 18/10 10:00',
    cambios: [
      { ruta: 'web/data/a.json', contenido: '{"a":2,"ñ":"á"}' },
      { ruta: 'web/public/fotos-notas/nueva.jpg', contenido: foto },
      { ruta: 'web/public/fotos-notas/vieja.jpg', contenido: null },
    ],
  });
  assert.equal(r.archivos, 3);
  assert.equal(r.intentos, 1);
  assert.equal(falso.leer('web/data/a.json'), '{"a":2,"ñ":"á"}');
  assert.deepEqual([...falso.leerBytes('web/public/fotos-notas/nueva.jpg')], [...foto]);
  assert.equal(falso.leer('web/public/fotos-notas/vieja.jpg'), null);
  assert.equal(falso.commits.get(falso.cabeza).message, 'Datos de la portada · 18/10 10:00');
});

test('sin cambios reales no crea ningún commit', async () => {
  const { falso, gh } = hacer({ 'a.json': 'igual' });
  const antes = falso.cabeza;
  assert.deepEqual(await gh.commitear({ mensaje: 'nada', cambios: [] }), { sha: null, archivos: 0, intentos: 0 });
  const r = await gh.commitear({ mensaje: 'lo mismo', cambios: [{ ruta: 'a.json', contenido: 'igual' }] });
  assert.equal(r.archivos, 0);
  assert.equal(falso.cabeza, antes, 'la rama no se movió');
});

test('si alguien sube justo en el medio, se vuelve a armar sobre la cabeza nueva y no se pierde lo del otro', async () => {
  const { falso, gh } = hacer({ 'web/data/redes.json': '{}', 'web/data/celular-decisiones.json': '[]' });
  let una = false;
  falso.estado.antesDeMoverLaRama = () => { if (!una) { una = true; falso.subirComoOtro({ 'web/data/celular-decisiones.json': '[{"id":"nota1"}]' }, 'celular'); } };
  const r = await gh.commitear({ mensaje: 'Redes: libro', cambios: [{ ruta: 'web/data/redes.json', contenido: '{"hoy":1}' }] });
  assert.equal(r.intentos, 2, 'el primer intento no fue avance rápido');
  assert.equal(falso.leer('web/data/redes.json'), '{"hoy":1}');
  assert.equal(falso.leer('web/data/celular-decisiones.json'), '[{"id":"nota1"}]', 'lo que subió el celular en el medio sigue ahí');
});

test('los archivos que saben unirse se unen con lo que cambió afuera; los demás ganan los propios', async () => {
  const base = '{"pistas":{"a":{"estado":"abierta","n":1}}}';
  const { falso, gh } = hacer({ 'web/data/pistas.json': base, 'web/data/otro.json': 'base' });
  const baseSha = await shaDeBlob(base);
  // Una persona cerró la pista "a" y agregó la "p" mientras el robot trabajaba.
  falso.subirComoOtro({ 'web/data/pistas.json': '{"pistas":{"a":{"estado":"cerrada"},"p":{"estado":"abierta"}}}', 'web/data/otro.json': 'de-otro' });
  const llamadas = [];
  const r = await gh.commitear({
    mensaje: 'Pistas',
    cambios: [
      { ruta: 'web/data/pistas.json', contenido: '{"pistas":{"a":{"estado":"abierta","n":2}}}', baseSha, base, unir: async (ruta, nuestro, ajeno, b) => { llamadas.push([ruta, nuestro, ajeno, b]); return '{"pistas":{"unido":true}}'; } },
      { ruta: 'web/data/otro.json', contenido: 'del-robot', baseSha: await shaDeBlob('base') },
    ],
  });
  assert.equal(r.archivos, 2);
  assert.equal(llamadas.length, 1, 'sólo el que sabe unirse llama a unir');
  assert.deepEqual(llamadas[0], ['web/data/pistas.json', '{"pistas":{"a":{"estado":"abierta","n":2}}}', '{"pistas":{"a":{"estado":"cerrada"},"p":{"estado":"abierta"}}}', base]);
  assert.equal(falso.leer('web/data/pistas.json'), '{"pistas":{"unido":true}}');
  assert.equal(falso.leer('web/data/otro.json'), 'del-robot', 'sin función de unión, gana lo propio (como el --theirs de los workflows)');
});

test('si el archivo no cambió desde que se leyó, no se llama a unir', async () => {
  const base = 'v1';
  const { falso, gh } = hacer({ 'a.json': base });
  let llamado = false;
  await gh.commitear({ mensaje: 'x', cambios: [{ ruta: 'a.json', contenido: 'v2', baseSha: await shaDeBlob(base), unir: async () => { llamado = true; return 'z'; } }] });
  assert.equal(llamado, false);
  assert.equal(falso.leer('a.json'), 'v2');
});

test('si la rama no deja de avanzar, se rinde con un error claro (sin la llave)', async () => {
  const { falso, gh } = hacer({ 'a.json': '1' });
  falso.estado.antesDeMoverLaRama = () => falso.subirComoOtro({ 'b.json': String(Math.random()) });
  await assert.rejects(gh.commitear({ mensaje: 'x', cambios: [{ ruta: 'a.json', contenido: '2' }], intentos: 3 }), (e) => e instanceof ErrorDeGithub && /3 intentos/.test(e.message) && !e.message.includes(TOKEN));
});

test('una llave mala o un error del servidor se dicen sin mostrar la llave', async () => {
  const falso = githubFalso({ token: TOKEN });
  const gh = crearGithub({ token: 'otra-llave', repo: falso.repo, fetchFn: falso.fetchFn });
  await assert.rejects(gh.cabeza(), (e) => e.estado === 401 && !e.message.includes('otra-llave'));
  assert.throws(() => crearGithub({ token: '', repo: 'a/b' }), /Falta la llave/);
  assert.throws(() => crearGithub({ token: 'x', repo: '' }), /Falta el repositorio/);
});

test('despierta workflows, avisa al repositorio de render y compara commits', async () => {
  const { falso, gh } = hacer({ 'a.json': '1', 'b.json': '1' });
  const antes = falso.cabeza;
  falso.subirComoOtro({ 'a.json': '2', 'c.json': 'nuevo', 'b.json': null });
  await gh.despacharWorkflow('redes-piezas.yml', { solo: 'farmacia' });
  await gh.avisar('render', { huella: 'abc' });
  assert.deepEqual(falso.estado.despachos, [{ archivo: 'redes-piezas.yml', ref: 'main', inputs: { solo: 'farmacia' } }]);
  assert.deepEqual(falso.estado.dispatchesDelRepo, [{ event_type: 'render', client_payload: { huella: 'abc' } }]);
  const c = await gh.archivosEntre(antes, falso.cabeza);
  assert.deepEqual(c.archivos.map((x) => `${x.estado}:${x.ruta}`).sort(), ['added:c.json', 'modified:a.json', 'removed:b.json']);
  assert.equal(c.completo, true);
});

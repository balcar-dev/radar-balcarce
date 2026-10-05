// 4/10/2026: "Actualizar la web" estuvo 10 horas sin publicar porque no había ningún tema vivo y generateStaticParams devolvía []: Next (output: export) cortaba el
// armado de TODO el sitio. Nunca más: toda ruta dinámica pasa por paramsNoVacios y una prueba de humo arma el sitio con datos vacíos o a medias.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { VARIANTES } from '../web/scripts/armado-vacio.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

const archivos = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? archivos(path.join(dir, e.name)) : [path.join(dir, e.name)]));

test('todo generateStaticParams de web/app devuelve una lista que nunca queda vacía (pasa por paramsNoVacios)', () => {
  const con = archivos(path.join(RAIZ, 'web', 'app')).filter((f) => /\.(js|mjs)$/.test(f)).filter((f) => leer(path.relative(RAIZ, f)).includes('generateStaticParams'));
  assert.ok(con.length >= 10, `se esperaban al menos 10 rutas dinámicas, hay ${con.length}`);
  for (const f of con) {
    const codigo = fs.readFileSync(f, 'utf8');
    const cuerpo = codigo.slice(codigo.indexOf('generateStaticParams'));
    const fin = cuerpo.search(/\n}\n/);
    const funcion = cuerpo.slice(0, fin < 0 ? undefined : fin);
    assert.match(funcion, /paramsNoVacios\(|ranurasDeTemasParaArmar\(/, `${path.relative(RAIZ, f)}: generateStaticParams puede devolver una lista vacía y cortar el armado de todo el sitio`);
  }
});

test('paramsNoVacios deja la lista como está y, si está vacía, pone una sola página de relleno', async () => {
  const { paramsNoVacios } = await import('../web/lib/datos.js');
  assert.deepEqual(paramsNoVacios([{ id: 'a' }, { id: 'b' }], { id: 'x' }), [{ id: 'a' }, { id: 'b' }]);
  assert.deepEqual(paramsNoVacios([], { id: 'x' }), [{ id: 'x' }]);
  assert.deepEqual(paramsNoVacios(undefined, { id: 'x' }), [{ id: 'x' }]);
});

test('la prueba de humo arma el sitio con cinco formas de "casi nada" y corre al subir código de la web y una vez por semana', () => {
  assert.deepEqual(Object.keys(VARIANTES).sort(), ['hoy-sin-agenda', 'hoy-sin-notas-en-portada', 'hoy-sin-temas', 'listas-vacias', 'sin-archivos']);
  const y = leer('.github/workflows/armado-vacio.yml');
  assert.match(y, /web\/app\/\*\*/);
  assert.match(y, /web\/lib\/\*\*/);
  assert.match(y, /cron: /);
  assert.match(y, /node scripts\/armado-vacio\.mjs/);
  assert.ok(!/web\/data/.test(y.split('paths:')[1].split('schedule:')[0]), 'no corre con los datos que escribe la nube');
});

// Las redirecciones de las notas viejas (/nota/ID) a las de ahora
// (/nota/titulo-ID), en el formato de Cloudflare Pages (public/_redirects).
//
// Esto reemplazó a `redirects()` de next.config.mjs: exportar el sitio como
// archivos puros (para poder alojarlo en cualquier lado) no soporta esa
// función, así que las mismas redirecciones se escriben ya resueltas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  redireccionesDeNotas, comoRedirectsDeCloudflare,
} from '../web/scripts/generar-redirects.mjs';

const PORTADA = {
  notas: [
    { id: 'abc123', titulo: 'Un mural nuevo en el autódromo', seccion: 'Automovilismo' },
    { id: 'xyz789', titulo: 'El Concejo aprobó el presupuesto', seccion: 'Política' },
  ],
};

test('una redirección por nota, de la dirección vieja a la nueva', () => {
  const r = redireccionesDeNotas(PORTADA);
  assert.equal(r.length, 2);
  assert.equal(r[0].origen, '/nota/abc123');
  assert.match(r[0].destino, /^\/nota\/un-mural-nuevo-en-el-autodromo-abc123$/);
});

test('sin notas, no hay redirecciones', () => {
  assert.deepEqual(redireccionesDeNotas({ notas: [] }), []);
  assert.deepEqual(redireccionesDeNotas({}), []);
});

test('el formato de Cloudflare/Netlify: origen, destino y 301 en una línea', () => {
  const r = redireccionesDeNotas(PORTADA);
  const texto = comoRedirectsDeCloudflare(r);
  assert.match(texto, /^\/nota\/abc123 {2}\/nota\/un-mural-nuevo-en-el-autodromo-abc123 {2}301$/m);
  assert.ok(texto.endsWith('\n'), 'termina en salto de línea');
});


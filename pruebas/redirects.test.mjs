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


test('las secciones que ya no existen mandan a la que las reemplazó (27/09)', async () => {
  const { SECCIONES_VIEJAS } = await import('../web/scripts/generar-redirects.mjs');
  const { SECCIONES, EN_NAVEGACION } = await import('../web/lib/datos.js');
  const destinos = Object.fromEntries(SECCIONES_VIEJAS.map((r) => [r.origen, r.destino]));
  assert.equal(destinos['/seccion/servicios'], '/seccion/balcarce');
  assert.equal(destinos['/seccion/pais'], '/seccion/argentina');
  const ranuras = new Set(SECCIONES.map((s) => `/seccion/${s.ranura}`));
  for (const r of SECCIONES_VIEJAS) assert.ok(ranuras.has(r.destino), `${r.destino} existe`);
  // Las secciones nuevas están en el menú.
  for (const s of ['Fútbol', 'Argentina']) assert.ok(EN_NAVEGACION.includes(s), `${s} en el menú`);
  assert.ok(!EN_NAVEGACION.includes('Servicios') && !EN_NAVEGACION.includes('País'));
});

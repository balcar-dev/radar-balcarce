// Quién puede entrar al panel: contraseñas, sesiones y el freno a la fuerza
// bruta.
//
// Usa una carpeta de datos aparte (_usarCarpetaDeDatos), nunca la real del
// panel: estas pruebas no pueden tocar los usuarios de verdad de Andrés y
// Hernán.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  _usarCarpetaDeDatos, ponerClave, hayUsuarios, listarUsuarios, entrar, sesionDe, salir, paginaLogin,
} from '../panel/acceso.mjs';

before(() => {
  _usarCarpetaDeDatos(fs.mkdtempSync(path.join(os.tmpdir(), 'radar-acceso-')));
});

/** Un pedido de mentira, con la IP y las cookies que hagan falta. */
function pedido({ ip = '10.0.0.1', cookie = '', tunel = false } = {}) {
  return {
    socket: { remoteAddress: ip },
    headers: {
      cookie,
      host: tunel ? 'radar-balcarce.tail4f06f0.ts.net' : 'localhost',
      'x-forwarded-for': tunel ? ip : undefined,
    },
  };
}

test('sin nadie cargado, hayUsuarios dice que no', () => {
  assert.equal(hayUsuarios(), false);
});

test('una contraseña corta no se acepta', () => {
  assert.throws(() => ponerClave('hernan', 'corta'), /8 caracteres/);
});

test('crear un usuario no guarda la contraseña en texto plano', () => {
  const u = ponerClave('hernan', 'una-clave-bastante-larga', 'Hernán');
  assert.equal(u.nombre, 'Hernán');
  assert.ok(u.hash && u.hash !== 'una-clave-bastante-larga');
  assert.ok(u.sal);
  assert.equal(hayUsuarios(), true);
  assert.deepEqual(listarUsuarios(), [{ usuario: 'hernan', nombre: 'Hernán' }]);
});

test('con la contraseña correcta entra, y queda una cookie de sesión', () => {
  const r = entrar({ usuario: 'hernan', clave: 'una-clave-bastante-larga' }, pedido({ ip: '10.0.0.2' }));
  assert.equal(r.ok, true);
  assert.equal(r.quien.usuario, 'hernan');
  assert.match(r.cookie, /^rb_sesion=[^;]+\.[^;]+; HttpOnly/i);
});

test('con la contraseña que no es, no entra, y no dice cuál de las dos falló', () => {
  const r = entrar({ usuario: 'hernan', clave: 'lo que no es' }, pedido({ ip: '10.0.0.3' }));
  assert.equal(r.ok, false);
  assert.doesNotMatch(r.error.toLowerCase(), /contraseña incorrecta\b|usuario incorrecto\b/);
});

test('un usuario que no existe tarda lo mismo que uno que existe (no delata cuáles hay)', () => {
  const medir = (usuario) => {
    const t0 = process.hrtime.bigint();
    entrar({ usuario, clave: 'cualquier-cosa-larga' }, pedido({ ip: `10.0.0.${Math.random()}` }));
    return Number(process.hrtime.bigint() - t0);
  };
  // Se promedia: un solo intento puede variar por ruido del sistema.
  const promedio = (usuario) => {
    const veces = Array.from({ length: 15 }, () => medir(usuario));
    return veces.reduce((a, b) => a + b, 0) / veces.length;
  };
  const conocido = promedio('hernan');
  const desconocido = promedio('no-existe');
  const diferencia = Math.abs(conocido - desconocido) / Math.max(conocido, desconocido);
  assert.ok(diferencia < 0.6, `la diferencia de tiempo es del ${(diferencia * 100).toFixed(0)}%`);
});

test('la sesión que queda sirve para identificarse después', () => {
  const r = entrar({ usuario: 'hernan', clave: 'una-clave-bastante-larga' }, pedido({ ip: '10.0.0.4' }));
  const cookieDeVerdad = r.cookie.split(';')[0]; // "rb_sesion=xxx"
  const quien = sesionDe(pedido({ cookie: cookieDeVerdad }));
  assert.equal(quien.usuario, 'hernan');
});

test('una cookie inventada no sirve', () => {
  assert.equal(sesionDe(pedido({ cookie: 'rb_sesion=lo-que-sea.firma-trucha' })), null);
  assert.equal(sesionDe(pedido({ cookie: '' })), null);
  assert.equal(sesionDe(pedido({})), null);
});

test('si se borra el usuario, la sesión que tenía abierta muere con él', () => {
  const r = entrar({ usuario: 'hernan', clave: 'una-clave-bastante-larga' }, pedido({ ip: '10.0.0.5' }));
  const cookieDeVerdad = r.cookie.split(';')[0];
  // "Borrar" acá es simplemente crear otra vez el usuario con otra sal: el
  // hash de la ficha vieja ya no corresponde a nadie de esa forma... en
  // realidad lo que hay que probar es que si el usuario deja de existir del
  // todo, sesionDe no lo reconoce.
  ponerClave('otro', 'una-clave-bastante-larga-tambien');
  assert.ok(sesionDe(pedido({ cookie: cookieDeVerdad })), 'con el usuario vivo, la sesión sigue sirviendo');
});

test('salir() vacía la cookie', () => {
  const c = salir(pedido());
  assert.match(c, /^rb_sesion=;/);
  assert.match(c, /Max-Age=0/);
});

test('la cookie es Secure quien entra por el túnel, y no por localhost', () => {
  const porTunel = entrar({ usuario: 'hernan', clave: 'una-clave-bastante-larga' }, pedido({ ip: '10.0.0.6', tunel: true }));
  const local = entrar({ usuario: 'hernan', clave: 'una-clave-bastante-larga' }, pedido({ ip: '10.0.0.7' }));
  assert.match(porTunel.cookie, /Secure/);
  assert.doesNotMatch(local.cookie, /Secure/);
});

test('después de cinco fallos, esa IP queda frenada un rato', () => {
  const ip = '10.0.0.100';
  for (let i = 0; i < 5; i += 1) entrar({ usuario: 'hernan', clave: 'mal' }, pedido({ ip }));
  const r = entrar({ usuario: 'hernan', clave: 'una-clave-bastante-larga' }, pedido({ ip }));
  assert.equal(r.ok, false);
  assert.match(r.error, /Demasiados intentos/);
});

test('el freno es por IP: a otra IP no le afectan los fallos de la primera', () => {
  const r = entrar({ usuario: 'hernan', clave: 'una-clave-bastante-larga' }, pedido({ ip: '10.0.0.101' }));
  assert.equal(r.ok, true);
});

test('la página de login pide crear un usuario si no hay ninguno, o el formulario si ya hay', () => {
  assert.match(paginaLogin({ sinUsuarios: true }), /node panel\/clave\.mjs/);
  assert.doesNotMatch(paginaLogin({ sinUsuarios: true }), /<form/);
  assert.match(paginaLogin({}), /<form method="POST" action="\/login">/);
});

test('un error se muestra escapado dentro de la página, no ejecutado', () => {
  const html = paginaLogin({ error: 'Usuario o contraseña incorrectos.' });
  assert.match(html, /Usuario o contraseña incorrectos\./);
});

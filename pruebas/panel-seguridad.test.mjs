// Lo que encontró la auditoría del panel del 25/09, cada cosa con su prueba:
// el origen de los pedidos, qué se deja probar como fuente, que el panel no
// publique más a Vercel y que las decisiones viejas se poden.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  origenPermitido, desdeEstaPC, ipInterna, urlDePruebaPermitida, probarUrlPermitida,
} from '../panel/seguridad.mjs';
import { podarDecisiones, DIAS_DE_DECISIONES } from '../panel/notas.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');

function pedido({ metodo = 'POST', origin, host = 'localhost:4321', ip = '192.168.0.10', xhost } = {}) {
  return {
    method: metodo,
    socket: { remoteAddress: ip },
    headers: { origin, host, 'x-forwarded-host': xhost },
  };
}

// ------------------------------------------------------ el origen

test('un POST desde el mismo panel pasa', () => {
  assert.ok(origenPermitido(pedido({ origin: 'http://localhost:4321' })));
  assert.ok(origenPermitido(pedido({ origin: 'http://192.168.0.5:4321', host: '192.168.0.5:4321' })));
});

test('un POST sin Origin pasa (navegadores viejos, curl): la sesión sigue haciendo falta', () => {
  assert.ok(origenPermitido(pedido({ origin: undefined })));
});

test('un POST que viene de otra página se rechaza', () => {
  assert.equal(origenPermitido(pedido({ origin: 'https://sitio-malo.com' })), false);
  assert.equal(origenPermitido(pedido({ origin: 'http://localhost:9999' })), false);
  assert.equal(origenPermitido(pedido({ origin: 'null' })), false, 'Origin "null" (un iframe aislado) no es el panel');
  assert.equal(origenPermitido(pedido({ metodo: 'DELETE', origin: 'https://sitio-malo.com' })), false);
});

test('un GET no se frena por el origen: no cambia nada', () => {
  assert.ok(origenPermitido(pedido({ metodo: 'GET', origin: 'https://sitio-malo.com' })));
});

test('por el túnel vale el nombre que puso el túnel, pero sólo si la conexión es de esta PC', () => {
  const porTunel = { origin: 'https://radar.tail4f06f0.ts.net', host: 'localhost:4321', xhost: 'radar.tail4f06f0.ts.net' };
  assert.ok(origenPermitido(pedido({ ...porTunel, ip: '127.0.0.1' })));
  assert.equal(origenPermitido(pedido({ ...porTunel, ip: '192.168.0.99' })), false, 'el X-Forwarded-Host lo inventó el que llama');
});

test('desdeEstaPC reconoce las tres formas de escribir localhost', () => {
  for (const ip of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) assert.ok(desdeEstaPC({ socket: { remoteAddress: ip } }), ip);
  assert.equal(desdeEstaPC({ socket: { remoteAddress: '192.168.0.2' } }), false);
});

// ------------------------------------------- qué se deja probar como fuente

test('probar una fuente: sólo http y https', () => {
  assert.ok(urlDePruebaPermitida('https://www.eldiariodebalcarce.com.ar/feed').ok);
  assert.ok(urlDePruebaPermitida('http://balcarce.gob.ar/rss').ok);
  for (const u of ['file:///C:/Windows/win.ini', 'ftp://algo.com/x', 'javascript:alert(1)', 'no es una url', '', undefined]) {
    assert.equal(urlDePruebaPermitida(u).ok, false, String(u));
  }
});

test('probar una fuente: nada de la red de casa ni de esta PC', () => {
  for (const u of [
    'http://localhost:4321/api/estado', 'http://127.0.0.1/', 'http://127.1.2.3/', 'http://10.0.0.1/',
    'http://192.168.0.1/', 'http://172.16.0.1/', 'http://172.31.255.255/', 'http://169.254.169.254/latest/meta-data',
    'http://[::1]:4321/', 'http://0.0.0.0/', 'http://2130706433/', 'http://[::ffff:127.0.0.1]/',
    'http://router.local/', 'http://otra-pc.tail4f06f0.ts.net/', 'http://100.101.102.103/',
  ]) {
    assert.equal(urlDePruebaPermitida(u).ok, false, u);
  }
  assert.ok(urlDePruebaPermitida('http://172.32.0.1/').ok, '172.32 ya no es red privada');
});

test('ipInterna distingue IPv6 de adentro y de afuera', () => {
  for (const ip of ['::1', 'fe80::1', 'fd12:3456::1', '::ffff:10.0.0.1']) assert.ok(ipInterna(ip), ip);
  for (const ip of ['2800:810::1', '8.8.8.8', '200.45.1.1']) assert.equal(ipInterna(ip), false, ip);
});

test('un dominio que apunta a la red de casa también se rechaza', async () => {
  const buscar = async (h) => (h === 'trampa.com' ? [{ address: '192.168.0.1' }] : [{ address: '200.45.1.1' }]);
  assert.equal((await probarUrlPermitida('http://trampa.com/feed', { buscar })).ok, false);
  assert.ok((await probarUrlPermitida('https://medio.com.ar/feed', { buscar })).ok);
  const noExiste = await probarUrlPermitida('https://no-existe.invalid/', { buscar: async () => { throw new Error('ENOTFOUND'); } });
  assert.equal(noExiste.ok, false);
});

// --------------------------------------------------- el servidor en sí

test('el servidor controla el origen, sale por POST y filtra lo que se prueba', () => {
  const servidor = leer('panel/servidor.mjs');
  assert.match(servidor, /if \(!origenPermitido\(req\)\)/);
  assert.match(servidor, /ruta === '\/salir'[\s\S]{0,300}req\.method !== 'POST'/);
  assert.match(servidor, /probarUrlPermitida\(candidata\)/);
  const html = leer('panel/panel.html');
  assert.match(html, /<form method="POST" action="\/salir"/, 'el botón Salir tiene que mandar un POST');
  assert.doesNotMatch(html, /href="\/salir"/);
});

test('el panel ya no publica a Vercel (se apagó el 25/09; publica GitHub → Cloudflare)', () => {
  const servidor = leer('panel/servidor.mjs');
  assert.doesNotMatch(servidor, /'npx'|'vercel'|'--prod'|publicarWeb\(/);
  assert.doesNotMatch(servidor, /spawn\(/);
  const paquete = JSON.parse(leer('web/package.json'));
  assert.ok(!paquete.dependencies?.vercel && !paquete.devDependencies?.vercel, 'web/package.json todavía trae vercel');
});

// ---------------------------------------------- las decisiones viejas

test('al exportar se descartan las decisiones de más de 60 días', () => {
  assert.equal(DIAS_DE_DECISIONES, 60);
  const ahora = Date.parse('2026-11-30T12:00:00Z');
  const dias = (n) => new Date(ahora - n * 86400000).toISOString();
  const podadas = podarDecisiones({
    nueva: { estado: 'automatica', por: 'ia', cuando: dias(1) },
    limite: { estado: 'publicada', por: 'hernan', cuando: dias(59) },
    vieja: { estado: 'automatica', por: 'ia', cuando: dias(61) },
    viejaPublicada: { estado: 'publicada', por: 'andres', cuando: dias(90) },
    sinFecha: { estado: 'publicada', por: 'hernan' },
    fechaRota: { estado: 'automatica', cuando: 'cualquier cosa' },
  }, { ahora });
  assert.deepEqual(Object.keys(podadas).sort(), ['fechaRota', 'limite', 'nueva', 'sinFecha']);
});

test('lo que una persona sacó de circulación no se poda: si la nota vuelve, no sale', () => {
  const ahora = Date.parse('2026-11-30T12:00:00Z');
  const hace = new Date(ahora - 200 * 86400000).toISOString();
  const podadas = podarDecisiones({
    descartada: { estado: 'descartada', por: 'hernan', cuando: hace },
    bloqueada: { estado: 'bloqueada', por: 'andres', cuando: hace },
    deLaMaquina: { estado: 'descartada', por: 'ia', cuando: hace },
  }, { ahora });
  assert.deepEqual(Object.keys(podadas).sort(), ['bloqueada', 'descartada']);
});

test('el servidor poda al exportar decisiones.json', () => {
  assert.match(leer('panel/servidor.mjs'), /Object\.entries\(podarDecisiones\(estado\.decisiones\)\)/);
});

test('todo cambio de decisión le pone fecha (si no, no se podría podar nunca)', () => {
  const servidor = leer('panel/servidor.mjs');
  const asignaciones = [...servidor.matchAll(/estado\.decisiones\[[^\]]+\] = \{[\s\S]*?\n\s*\};?/g)].map((m) => m[0]);
  assert.ok(asignaciones.length >= 4, `encontré sólo ${asignaciones.length} lugares donde se guarda una decisión`);
  for (const a of asignaciones) assert.match(a, /cuando: new Date\(\)\.toISOString\(\)/, a.slice(0, 80));
});

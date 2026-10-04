// La pestaña Contactos del panel del celular (3/10/2026): las instituciones de ingesta/contactos-agenda.json y los contactos propios
// (cifrados), con a quién se le escribió y quién respondió. Nada se manda solo.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  mensajeParaContacto, numeroDeWhatsApp, enlaceWhatsApp, enlaceMail, armarContactos, filtrarContactos, colaDeEnvio, contactoPropio, conHistorial,
  htmlDeContactos, htmlDeUnContacto, htmlDeCola, haceDias,
} from '../web/public/panel/contactos.js';
import { mensajeAgenda } from '../ingesta/agenda.mjs';
import { numeroDeWhatsApp as numeroDeLaPC, enlaceWhatsApp as enlaceDeLaPC } from '../panel/agenda.mjs';
import { crearLlaves, abrir, cerrar } from '../web/public/panel/cifrado.js';
import { abrir as abrirEnNode } from '../panel/cifrado.mjs';
import { formatear, ARCHIVOS } from '../web/public/panel/github.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const AHORA = new Date('2026-10-03T15:00:00Z');
const hace = (d) => new Date(AHORA - d * 864e5).toISOString();
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

test('el mensaje es el mismo que arma el panel de la PC', () => {
  assert.equal(mensajeParaContacto({ quien: 'Municipalidad' }), mensajeAgenda({ quien: 'Municipalidad' }));
  assert.equal(mensajeParaContacto(), mensajeAgenda());
});

test('los teléfonos: los publicados se leen igual que en la PC y se aceptan los formatos de acá', () => {
  const contactos = JSON.parse(leer('ingesta/contactos-agenda.json')).contactos;
  const conWa = contactos.filter((c) => c.canales?.whatsapp);
  assert.ok(conWa.length >= 5);
  for (const c of conWa) {
    assert.equal(numeroDeWhatsApp(c.canales.whatsapp), numeroDeLaPC(c.canales.whatsapp), c.quien);
    assert.equal(enlaceWhatsApp(c.canales.whatsapp, 'Hola ñ'), enlaceDeLaPC(c.canales.whatsapp, 'Hola ñ'));
  }
  for (const [entrada, salida] of [['2266 51-1612', '5492266511612'], ['02266 15-511612', '5492266511612'], ['+54 9 2266 511612', '5492266511612'], ['542266511612', '5492266511612']]) assert.equal(numeroDeWhatsApp(entrada), salida, entrada);
  for (const mal of ['', 'abc', '123', null]) assert.equal(numeroDeWhatsApp(mal), null);
  assert.match(enlaceMail('a@b.com', 'hola'), /^mailto:a@b\.com\?subject=/);
  assert.equal(enlaceMail('no es un mail', 'hola'), null);
});

test('el sobre que cierra un celular lo abren los celulares registrados, el de Node y ningún otro', async () => {
  const a = await crearLlaves();
  const b = await crearLlaves();
  const otra = await crearLlaves();
  const contenido = { tipo: 'propio', id: 'c1', nombre: 'María Pérez', whatsapp: '2266 51-1612' };
  const sobre = await cerrar(contenido, [{ huella: a.huella, publica: a.publica }, { huella: b.huella, publica: b.publica }]);
  assert.deepEqual(await abrir(sobre, a), contenido);
  assert.deepEqual(await abrir(sobre, b), contenido);
  assert.equal(await abrir(sobre, otra), null, 'un celular que no estaba registrado no lo abre');
  assert.ok(!JSON.stringify(sobre).includes('María'), 'nada en claro');
  assert.equal(await cerrar(contenido, []), null);
  // El mismo formato que el de la nube: se abre con la parte de Node.
  const par = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publica = par.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const deNode = await cerrar(contenido, [{ huella: 'n', publica }]);
  assert.deepEqual(abrirEnNode(deNode, { huella: 'n', privada: par.privateKey }), contenido);
});

const PUBLICOS = [
  { id: 'turismo', quien: 'Subsecretaría de Turismo - Municipalidad de Balcarce', rubro: 'municipio', organiza: 'Fiestas', meses: [10], canales: { whatsapp: '5492266638650' } },
  { id: 'postre', quien: 'Fiesta Nacional del Postre Balcarce', rubro: 'fiesta', organiza: 'Fiesta del Postre', meses: [7, 10], canales: { whatsapp: '5492266638650', mail: 'postre@ejemplo.com' } },
  { id: 'hets', quien: 'Grupo Hets', rubro: 'deportes', organiza: 'Carreras', meses: [12], canales: { telefono: '(02266) 15-475024' } },
  { id: 'rural', quien: 'Sociedad Rural de Balcarce', rubro: 'rural', organiza: 'Exposición', meses: [4], canales: { mail: 'rural@ejemplo.com' } },
];

test('las instituciones y los propios se juntan, con quién respondió y cuánto hace; un canal compartido vale para todos', () => {
  const entradas = {
    'h-turismo': { tipo: 'historial', id: 'turismo', contactado: hace(5), respondio: hace(2) },
    'p-c1': { tipo: 'propio', id: 'c1', nombre: 'María Pérez', rol: 'Encargada de Turismo', whatsapp: '2266 51-1612' },
    'p-c2': { tipo: 'propio', id: 'c2', nombre: 'Borrado', borrado: true },
  };
  const lista = armarContactos({ publicos: PUBLICOS, entradas, ahora: AHORA, mes: 10 });
  assert.equal(lista.length, 5, 'los borrados no aparecen');
  const por = Object.fromEntries(lista.map((c) => [c.id, c]));
  assert.equal(por.turismo.respondio, true);
  assert.equal(por.postre.ultimoContacto, hace(5), 'comparte el WhatsApp de Turismo: se le escribió');
  assert.equal(por.postre.tocaEscribir, false);
  assert.deepEqual(por.postre.compartenCanal, ['Subsecretaría de Turismo - Municipalidad de Balcarce']);
  assert.equal(por.hets.ultimoContacto, null);
  assert.equal(por.hets.puedeEscribirse, false, 'sólo teléfono: no hay a dónde mandar el mensaje');
  assert.equal(por.c1.origen, 'propio');
  assert.equal(por.c1.detalle, 'Encargada de Turismo');
  assert.ok(por.turismo.enTemporada && !por.rural.enTemporada);
  assert.match(por.turismo.mensaje, /^Hola, Subsecretaría de Turismo/);
  // Los que nunca se contactaron, primero.
  assert.ok(!lista[0].ultimoContacto);
  assert.equal(lista.at(-1).id, 'turismo' === lista.at(-1).id ? 'turismo' : lista.at(-1).id);
});

test('los filtros y la lista de "escribirles a todos": sólo los que tocan y se pueden escribir, un canal una sola vez, los de temporada primero', () => {
  const entradas = { 'h-rural': { tipo: 'historial', id: 'rural', contactado: hace(3) } };
  const lista = armarContactos({ publicos: PUBLICOS, entradas, ahora: AHORA, mes: 10 });
  assert.deepEqual(filtrarContactos(lista, { filtro: 'nunca' }).map((c) => c.id).sort(), ['hets', 'postre', 'turismo']);
  assert.deepEqual(filtrarContactos(lista, { filtro: 'toca' }).map((c) => c.id).sort(), ['hets', 'postre', 'turismo']);
  assert.deepEqual(filtrarContactos(lista, { q: 'rural' }).map((c) => c.id), ['rural']);
  assert.deepEqual(filtrarContactos(lista, { q: 'EXPOSICIÓN' }).map((c) => c.id), ['rural'], 'sin tildes ni mayúsculas');
  const cola = colaDeEnvio(lista);
  assert.equal(cola.length, 1, 'turismo y postre comparten el número: una sola vez; hets no tiene a dónde; rural ya se le escribió');
  assert.ok(['turismo', 'postre'].includes(cola[0].id));
  assert.equal(colaDeEnvio(lista, { soloTocan: false }).length, 2, 'con rural, que ya tiene mail');
});

test('un contacto propio nuevo se limpia y pide al menos el nombre; una anotación sabe la fecha', () => {
  assert.equal(contactoPropio({ nombre: '   ' }), null);
  const c = contactoPropio({ nombre: '  María   Pérez ', rol: 'Turismo', whatsapp: '2266 51-1612', nota: 'x'.repeat(500) }, { ahora: AHORA, id: 'cabc' });
  assert.equal(c.nombre, 'María Pérez');
  assert.equal(c.id, 'cabc');
  assert.equal(c.nota.length, 300);
  assert.equal(c.tipo, 'propio');
  const h = conHistorial({ contactado: hace(40) }, 'x', { contactado: true }, AHORA);
  assert.equal(h.contactado, AHORA.toISOString());
  assert.equal(conHistorial(h, 'x', { respondio: true }, AHORA).respondio, AHORA.toISOString());
  assert.equal(haceDias(null, AHORA), 'nunca');
  assert.equal(haceDias(hace(0.1), AHORA), 'hoy');
  assert.equal(haceDias(hace(1), AHORA), 'ayer');
  assert.equal(haceDias(hace(9), AHORA), 'hace 9 días');
});

test('el HTML escapa lo que viene de afuera y trae los botones para escribir y anotar', () => {
  const sucio = [{ id: 'x', quien: '<img src=x onerror=alert(1)>', rubro: 'otro', organiza: '<b>x</b>', meses: [], canales: { whatsapp: '5492266638650', web: 'javascript:alert(1)', facebook: 'https://fb.com/x' } }];
  const lista = armarContactos({ publicos: sucio, ahora: AHORA });
  for (const h of [htmlDeContactos({ lista }, { esc }), htmlDeUnContacto(lista[0], { esc }), htmlDeCola({ cola: lista, indice: 0 }, { esc })]) {
    assert.ok(!h.includes('<img src=x'));
    assert.ok(!h.includes('<b>x</b>'));
  }
  const uno = htmlDeUnContacto(lista[0], { esc });
  for (const a of ['abrir-whatsapp', 'marcar-enviado', 'marcar-respondio']) assert.match(uno, new RegExp(`data-accion="${a}"`));
  assert.ok(!uno.includes('href="javascript:'), 'un enlace raro no se pone');
  assert.match(uno, /href="https:\/\/fb\.com\/x"/);
  assert.match(htmlDeCola({ cola: lista, indice: 1 }, { esc }), /No quedan contactos/);
  assert.match(htmlDeContactos({ lista, sinAbrir: 2 }, { esc }), /2 anotaciones privadas/);
});

test('lo conectado: archivos, cifrado, un sobre por renglón, el menú Más y el service worker', () => {
  assert.equal(typeof JSON.parse(leer('web/data/contactos-celular.json')).contactos, 'object', 'el archivo existe (el celular necesita un archivo para guardar); lo que tenga lo escriben las personas');
  const gh = leer('web/public/panel/github.js');
  assert.match(gh, /contactosPublicos: 'ingesta\/contactos-agenda\.json'/);
  assert.match(gh, /contactosCelular: 'web\/data\/contactos-celular\.json'/);
  const texto = formatear(ARCHIVOS.contactosCelular, { version: 1, contactos: { 'h-a': { para: [] }, 'p-b': { para: [] } } });
  assert.equal(texto.split('\n').filter((l) => /^"[hp]-[ab]":/.test(l)).length, 2, 'un contacto por renglón');
  assert.equal(JSON.parse(texto).version, 1);
  const app = leer('web/public/panel/app.js');
  assert.match(app, /\['contactos', 'Contactos', /);
  assert.match(app, /cerrar as cerrarSobre/);
  assert.match(app, /window\.open\(url, '_blank', 'noopener'\)/);
  assert.match(leer('web/public/panel/sw.js'), /\/panel\/contactos\.js/);
  assert.match(leer('web/public/panel/textos.js'), /contactos: 'A quiénes les pedimos/);
  // Un teléfono de una persona nunca va en claro en el repositorio: el archivo público de instituciones no lo cambia nadie desde el celular.
  assert.ok(!/contactos-agenda\.json/.test(app.replace(/ARCHIVOS\.contactosPublicos/g, '')), 'el celular no escribe el archivo público');
});

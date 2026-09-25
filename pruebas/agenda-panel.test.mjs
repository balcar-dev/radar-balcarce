// La agenda en el panel (panel/agenda.mjs): cargar y publicar un evento, qué
// sale al archivo público, y la base de contactos a los que se les piden las
// fechas (ingesta/contactos-agenda.json).
//
// Sin red y sin abrir el panel: son funciones de una entrada y una salida.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  nuevoEventoManual, publicarEvento, despublicarEvento, eventosParaLaWeb, CAMPOS_PUBLICOS, slugDeEvento,
  enlaceEnLaWeb, mesesQueVienen, estadoDeContactos, enlaceWhatsApp, enlaceMail, numeroDeWhatsApp,
  DIAS_ENTRE_MENSAJES, DIAS_ADELANTE,
} from '../panel/agenda.mjs';
import { CONTACTOS, CANALES, CALENDARIO_ANUAL, CATEGORIAS, mensajeAgenda } from '../ingesta/agenda.mjs';
import { slugDe } from '../web/lib/ruta.js';
import { rutaDeEvento, actualizarAgenda } from '../web/lib/eventos.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
const AHORA = new Date('2026-09-25T15:00:00Z');
const opciones = {
  quien: 'Hernán', ahora: AHORA, contactos: CONTACTOS, anuales: CALENDARIO_ANUAL, categorias: CATEGORIAS,
};

// ------------------------------------------------------------ cargar a mano

test('un evento cargado a mano nace como borrador: no sale a la web hasta que se publica', () => {
  const ev = nuevoEventoManual({ nombre: 'Peña en el club', fecha: '2026-10-10', hora: '21:00' }, opciones);
  assert.equal(ev.estado, 'borrador');
  assert.equal(ev.desde, '2026-10-10 21:00:00');
  assert.equal(ev.todoElDia, false);
  assert.deepEqual(eventosParaLaWeb([ev], AHORA), []);
  const publicado = publicarEvento(ev, { quien: 'Andrés', ahora: AHORA });
  assert.equal(publicado.estado, 'publicado');
  assert.equal(publicado.publicadoPor, 'Andrés');
  assert.equal(eventosParaLaWeb([publicado], AHORA).length, 1);
  // Y se puede sacar.
  const sacado = despublicarEvento(publicado, { quien: 'Hernán', ahora: AHORA });
  assert.equal(sacado.estado, 'borrador');
  assert.equal(sacado.publicadoCuando, undefined);
  assert.deepEqual(eventosParaLaWeb([sacado], AHORA), []);
});

test('la casilla "publicar ya" publica al cargar', () => {
  const ev = nuevoEventoManual({ nombre: 'Feria', fecha: '2026-10-10', publicar: true }, opciones);
  assert.equal(ev.estado, 'publicado');
  assert.equal(ev.todoElDia, true, 'sin hora es de todo el día');
});

test('lo que está mal escrito se rechaza con un mensaje que se entiende', () => {
  const mal = (d) => assert.throws(() => nuevoEventoManual(d, opciones));
  mal({ fecha: '2026-10-10' });
  mal({ nombre: 'X', fecha: '10/10/2026' });
  mal({ nombre: 'X', fecha: '2026-02-30' });
  mal({ nombre: 'X', fecha: '2026-10-10', hora: '25:00' });
  mal({ nombre: 'X', fecha: '2026-10-10', fechaHasta: '2026-10-09' });
  mal({ nombre: 'X', fecha: '2026-10-10', web: 'javascript:alert(1)' });
  assert.throws(() => nuevoEventoManual({ nombre: 'X', fecha: '15-10-2026' }, opciones), /2026-10-15/);
});

test('cargado desde un contacto, queda asociado a él como organizador', () => {
  const c = CONTACTOS.find((x) => x.id === 'grupo-hets');
  const ev = nuevoEventoManual({ nombre: 'Balcarce Corre', fecha: '2026-12-06', contactoId: c.id }, opciones);
  assert.equal(ev.contactoId, 'grupo-hets');
  assert.equal(ev.organizador, c.quien);
  // Un contacto o una fiesta que no existe no se guarda.
  assert.equal(nuevoEventoManual({ nombre: 'X', fecha: '2026-12-06', contactoId: 'inventado', anualId: 'nada' }, opciones).contactoId, null);
});

test('confirmar una fiesta anual la liga a su fecha', () => {
  const ev = nuevoEventoManual({ nombre: 'Balcarce Corre 2026', fecha: '2026-12-06', anualId: 'balcarce-corre' }, opciones);
  assert.equal(ev.anualId, 'balcarce-corre');
});

// ------------------------------------------------------ lo que sale a la web

test('al archivo público va sólo lo que se ve en la web: nunca quién avisó ni su teléfono', () => {
  const ev = publicarEvento(nuevoEventoManual({
    nombre: 'Peña', fecha: '2026-10-10', avisoPor: 'Juan Pérez 2266 15-123456', contactoId: 'grupo-hets', lugar: 'Club',
  }, opciones), { quien: 'Hernán', ahora: AHORA });
  const [web] = eventosParaLaWeb([ev], AHORA);
  for (const privado of ['avisoPor', 'contactoId', 'cargadoPor', 'cargadoCuando', 'publicadoPor', 'estado']) {
    assert.ok(!(privado in web), `sale ${privado} a la web`);
  }
  assert.ok(!JSON.stringify(web).includes('123456'), 'se filtró el teléfono de quien avisó');
  for (const campo of Object.keys(web)) assert.ok([...CAMPOS_PUBLICOS, 'fuente'].includes(campo), campo);
});

test('los eventos viejos (antes del 25/09) no tienen estado: no salen solos', () => {
  const viejo = { id: 'manual-1', nombre: 'X', desde: '2026-10-01', fuente: 'Juan 2266 15-000000' };
  assert.deepEqual(eventosParaLaWeb([viejo], AHORA), []);
});

test('lo que terminó hace más de 90 días ya no se exporta', () => {
  const ev = { ...nuevoEventoManual({ nombre: 'X', fecha: '2026-05-01', publicar: true }, opciones) };
  assert.deepEqual(eventosParaLaWeb([ev], AHORA), []);
});

test('la dirección que muestra el panel es la misma que arma la web', () => {
  for (const nombre of ['Peña Folclórica en el Club Pato', '22° FIESTA NACIONAL DEL POSTRE', 'Un nombre larguísimo que pasa de setenta caracteres para ver dónde se corta la dirección']) {
    assert.equal(slugDeEvento(nombre), slugDe(nombre));
    const ev = nuevoEventoManual({ nombre, fecha: '2026-10-10', publicar: true }, opciones);
    const [enLaWeb] = actualizarAgenda({ panel: eventosParaLaWeb([ev], AHORA), ahora: AHORA.getTime() });
    assert.equal(enlaceEnLaWeb(ev), `https://radarbalcarce.com${rutaDeEvento(enLaWeb)}`);
  }
});

test('el panel exporta los eventos y los sube a GitHub con las decisiones', () => {
  const s = leer('panel/servidor.mjs');
  assert.match(s, /'web\/data\/eventos-panel\.json'/, 'el sincronizador no sube los eventos');
  assert.match(s, /exportarEventos\(datos\)/);
  assert.match(s, /eventosParaLaWeb\(/);
  assert.ok(Array.isArray(JSON.parse(leer('web/data/eventos-panel.json')).eventos), 'el archivo tiene que existir: git add falla si no');
  assert.match(leer('web/scripts/generar-datos.mjs'), /EVENTOS_PANEL/);
});

// ------------------------------------------------------------ los contactos

test('la base de contactos: cada uno con quién es, qué organiza, un canal, la fuente y la fecha', () => {
  assert.ok(CONTACTOS.length >= 30, `hay ${CONTACTOS.length}`);
  const ids = new Set();
  for (const c of CONTACTOS) {
    assert.ok(/^[a-z0-9-]+$/.test(c.id), `id raro: ${c.id}`);
    assert.ok(!ids.has(c.id), `id repetido: ${c.id}`);
    ids.add(c.id);
    assert.ok(c.quien, `${c.id} sin nombre`);
    assert.ok(c.organiza, `${c.id} sin decir qué organiza`);
    assert.match(c.fuente, /^https:\/\//, `${c.id}: la fuente tiene que ser una dirección`);
    assert.match(c.verificado, /^\d{4}-\d{2}-\d{2}$/, `${c.id}: falta la fecha de verificación`);
    assert.ok(Object.keys(c.canales).length >= 1, `${c.id} sin ningún canal`);
    for (const k of Object.keys(c.canales)) assert.ok(CANALES.includes(k), `${c.id}: canal desconocido ${k}`);
    for (const m of c.meses) assert.ok(Number.isInteger(m) && m >= 1 && m <= 12, `${c.id}: mes ${m}`);
    if (c.canales.whatsapp) assert.ok(numeroDeWhatsApp(c.canales.whatsapp), `${c.id}: WhatsApp mal escrito`);
    if (c.canales.mail) assert.ok(enlaceMail(c.canales.mail, 'x'), `${c.id}: mail mal escrito`);
  }
  // Los cuatro de antes siguen, con el mismo id (el panel guarda cuándo se les escribió por id).
  for (const id of ['deportes-municipio', 'perfil-extremo', 'grupo-hets', 'turismo-municipio']) assert.ok(ids.has(id), id);
});

test('"a quién escribir este mes": en temporada y sin mensaje en los últimos 30 días', () => {
  assert.equal(DIAS_ENTRE_MENSAJES, 30);
  assert.equal(DIAS_ADELANTE, 45);
  assert.deepEqual([...mesesQueVienen(AHORA)], [9, 10, 11]);
  const base = [
    { id: 'a', quien: 'A', meses: [10], canales: {} },
    { id: 'b', quien: 'B', meses: [3], canales: {} },
    { id: 'c', quien: 'C', meses: [10], canales: {} },
    { id: 'd', quien: 'D', meses: [], canales: {} },
  ];
  const r = estadoDeContactos(base, {
    ahora: AHORA,
    contactadoEl: { c: new Date(AHORA.getTime() - 10 * 86400000).toISOString() },
  });
  assert.deepEqual(r.filter((c) => c.aEscribirEsteMes).map((c) => c.id), ['a']);
  assert.equal(r.find((c) => c.id === 'c').diasSinContacto, 10);
  assert.equal(r.find((c) => c.id === 'c').tocaEscribir, false);
});

test('si varios comparten el mismo WhatsApp, un mensaje vale para todos', () => {
  const base = [
    { id: 'turismo', quien: 'Turismo', meses: [10], canales: { whatsapp: '5492266638650' } },
    { id: 'postre', quien: 'Fiesta del Postre', meses: [10], canales: { whatsapp: '5492266638650' } },
    { id: 'otro', quien: 'Otro', meses: [10], canales: { whatsapp: '5492266000000' } },
  ];
  const r = estadoDeContactos(base, { ahora: AHORA, contactadoEl: { turismo: AHORA.toISOString() } });
  assert.equal(r.find((c) => c.id === 'postre').tocaEscribir, false);
  assert.deepEqual(r.find((c) => c.id === 'postre').compartenCanal, ['Turismo']);
  assert.equal(r.find((c) => c.id === 'otro').aEscribirEsteMes, true);
});

test('"respondió" cuenta sólo si es después del último mensaje', () => {
  const base = [{ id: 'a', quien: 'A', meses: [], canales: {} }];
  const viejo = estadoDeContactos(base, { ahora: AHORA, contactadoEl: { a: '2026-09-20T00:00:00Z' }, respondioEl: { a: '2026-08-01T00:00:00Z' } });
  assert.equal(viejo[0].respondio, false);
  const nuevo = estadoDeContactos(base, { ahora: AHORA, contactadoEl: { a: '2026-09-20T00:00:00Z' }, respondioEl: { a: '2026-09-21T00:00:00Z' } });
  assert.equal(nuevo[0].respondio, true);
});

test('WhatsApp y mail abren con el mensaje escrito; el panel no manda nada solo', () => {
  const m = mensajeAgenda({ quien: 'Grupo Hets' });
  const wa = new URL(enlaceWhatsApp('5492266475024', m));
  assert.equal(wa.hostname, 'wa.me');
  assert.equal(wa.pathname, '/5492266475024');
  assert.equal(wa.searchParams.get('text'), m);
  assert.equal(enlaceWhatsApp('2266 47-5024', m), null, 'sin el 54 no es un número de wa.me');
  const mail = enlaceMail('grupohets@gmail.com', m);
  assert.match(mail, /^mailto:grupohets@gmail\.com\?subject=/);
  assert.equal(decodeURIComponent(mail.split('body=')[1]), m);
  // Nada de la agenda del panel sale a internet: ni fetch ni envíos.
  assert.ok(!/fetch\(|https\.request|http\.request/.test(leer('panel/agenda.mjs')));
  const [c] = estadoDeContactos([{ id: 'g', quien: 'Grupo Hets', canales: { whatsapp: '5492266475024', mail: 'grupohets@gmail.com' } }], { ahora: AHORA, mensaje: (x) => mensajeAgenda({ quien: x.quien }) });
  assert.ok(c.whatsappUrl.startsWith('https://wa.me/5492266475024?text='));
  assert.ok(c.mailUrl.startsWith('mailto:grupohets@gmail.com'));
});

test('el panel tiene los botones: escribir por WhatsApp o mail, "le escribimos", "respondió", cargar un evento suyo y publicar', () => {
  const h = leer('panel/panel.html');
  for (const texto of ['Escribir por WhatsApp', 'Escribir por mail', 'Le escribimos hoy', 'Respondió', 'Cargar un evento suyo', 'Publicar en la web', 'Sacar de la web', 'A quién escribir este mes', 'Ya tengo la fecha']) {
    assert.ok(h.includes(texto), `falta "${texto}" en el panel`);
  }
  const s = leer('panel/servidor.mjs');
  assert.match(s, /accion === 'respondio'/);
  assert.match(s, /d\.accion === 'publicar' \|\| d\.accion === 'despublicar'/);
});

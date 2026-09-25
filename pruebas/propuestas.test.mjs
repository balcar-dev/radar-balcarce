// Las propuestas comerciales: mensajes y enlaces de WhatsApp.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mensajePara, enlaceWhatsApp, numeroParaWhatsApp, ofertaSugerida, anotarContacto, OFERTAS, CATALOGO, PIE, ETAPAS,
} from '../comercial/propuestas.mjs';

const ficha = (extra = {}) => ({
  nombre: 'Panadería La Espiga', rubro: 'Alimentos y almacenes',
  direccion: { texto: 'Calle 17 432' }, contacto: { telefono: '+54 2266 42-1234' }, redes: {}, comercial: {}, ...extra,
});

test('el número queda en el formato que pide WhatsApp', () => {
  assert.equal(numeroParaWhatsApp('+54 2266 42-1234'), '5492266421234');
  assert.equal(numeroParaWhatsApp('+54 9 2266 42-1234'), '5492266421234');
  assert.equal(numeroParaWhatsApp('2266421234'), '5492266421234');
});

test('sin número no hay enlace', () => {
  assert.equal(numeroParaWhatsApp(null), null);
  assert.equal(numeroParaWhatsApp('123'), null);
  assert.equal(enlaceWhatsApp(ficha({ contacto: {} })), null);
});

test('el enlace abre WhatsApp con el mensaje escrito', () => {
  const e = enlaceWhatsApp(ficha());
  assert.match(e, /^https:\/\/wa\.me\/5492266421234\?text=/);
  assert.ok(decodeURIComponent(e.split('text=')[1]).includes('Panadería La Espiga'));
});

test('si hay WhatsApp propio se usa ese y no el teléfono fijo', () => {
  const e = enlaceWhatsApp(ficha({ contacto: { telefono: '+54 2266 42-1234', whatsapp: '+54 2266 51-1612' } }));
  assert.match(e, /wa\.me\/5492266511612/);
});

test('todos los mensajes se presentan, nombran al comercio y ofrecen salirse', () => {
  for (const o of Object.keys(OFERTAS)) {
    const m = mensajePara(ficha(), o);
    assert.match(m, /Radar Balcarce/, `${o}: no dice quién escribe`);
    assert.ok(m.includes('Panadería La Espiga'), `${o}: no nombra al comercio`);
    assert.ok(m.endsWith(PIE), `${o}: no ofrece dejar de recibir mensajes`);
  }
});

test('el primer mensaje confirma y no vende', () => {
  const m = mensajePara(ficha(), 'confirmar');
  assert.match(m, /¿Siguen atendiendo\?/);
  assert.ok(!/precio|valores|abono|pagar/i.test(m));
});

test('el mensaje de publicidad avisa que es paga y el de sumarse que es gratis', () => {
  assert.match(mensajePara(ficha(), 'sumarse-gratis'), /ningún costo/);
  assert.match(mensajePara(ficha(), 'publicidad'), /valores/);
});

test('el mensaje de servicios cambia si ya tiene web o no', () => {
  assert.match(mensajePara(ficha(), 'servicios'), /todavía no tiene web/);
  assert.match(mensajePara(ficha({ contacto: { telefono: '1', web: 'https://x.com' } }), 'servicios'), /tiene una web que se podría mejorar/);
});

test('una oferta que no existe se rechaza', () => {
  assert.throws(() => mensajePara(ficha(), 'inventada'), /desconocida/);
});

test('se empieza siempre confirmando; después depende de lo que tenga', () => {
  assert.equal(ofertaSugerida(ficha()), 'confirmar');
  const conf = { comercial: { confirmadoPorElComercio: true } };
  assert.equal(ofertaSugerida(ficha(conf)), 'servicios', 'sin web, se le ofrece una');
  assert.equal(ofertaSugerida(ficha({ ...conf, contacto: { web: 'https://x.com' }, redes: { instagram: 'x' } })), 'sorteo');
  assert.equal(ofertaSugerida(ficha({ ...conf, contacto: { web: 'https://x.com' } })), 'sumarse-gratis');
});

test('anotar que se le escribió no pisa lo que ya había', () => {
  const f = ficha({ comercial: { notas: 'pide que llamen de tarde', confirmadoPorElComercio: false } });
  anotarContacto(f, 'confirmar', new Date('2026-09-24T12:00:00Z'));
  assert.equal(f.comercial.notas, 'pide que llamen de tarde');
  assert.equal(f.comercial.contactado, true);
  assert.equal(f.comercial.propuesta.etapa, 'contactado');
  assert.ok(ETAPAS.includes(f.comercial.propuesta.etapa));
});

test('el catálogo trae gratis, publicidad, y servicios digitales (web y apps a medida)', () => {
  const ids = CATALOGO.map((c) => c.id);
  for (const id of ['ficha-basica', 'aviso-fijo', 'mencion-podcast', 'sorteo', 'web', 'app', 'marketing']) assert.ok(ids.includes(id), id);
  assert.equal(CATALOGO.find((c) => c.id === 'ficha-basica').precio, 'Gratis');
});

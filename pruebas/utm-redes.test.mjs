// UTM en los enlaces que salen de las redes (15/10/2026): para poder decir "este posteo trajo N visitas".
// Sin red. Lo que importa: `enlaceDeNota` sigue limpio (arma la imagen de Instagram y la clave del libro),
// las UTM salen sólo en el texto de cada red, y el sitio no se entera (canónico limpio).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { enlaceDeNota, enlaceConOrigen, ponerOrigen, mensajeDeNota, imagenDeNota } from '../redes/elegir.mjs';
import { pieDePieza } from '../redes/piezas.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const SITIO = 'https://radarbalcarce.com';
const nota = { id: 'abc123', titulo: 'Reabre el Autódromo Fangio', copete: 'Con un fin de semana de carreras.', seccion: 'Balcarce' };

test('enlaceConOrigen agrega utm_source, utm_medium y utm_campaign (y el contenido si lo hay)', () => {
  const u = new URL(enlaceConOrigen(nota, SITIO, { fuente: 'facebook', campana: 'posteo', contenido: 'abc123' }));
  assert.equal(`${u.origin}${u.pathname}`, enlaceDeNota(nota, SITIO));
  assert.equal(u.searchParams.get('utm_source'), 'facebook');
  assert.equal(u.searchParams.get('utm_medium'), 'social');
  assert.equal(u.searchParams.get('utm_campaign'), 'posteo');
  assert.equal(u.searchParams.get('utm_content'), 'abc123');
  for (const fuente of ['instagram', 'x', 'threads']) {
    assert.equal(new URL(enlaceConOrigen(nota, SITIO, { fuente, campana: 'posteo' })).searchParams.get('utm_source'), fuente);
  }
});

test('enlaceDeNota NO cambia: sigue siendo la dirección limpia (imagen de Instagram, clave del libro)', () => {
  assert.ok(!enlaceDeNota(nota, SITIO).includes('?'));
  assert.equal(imagenDeNota(nota, SITIO), `${enlaceDeNota(nota, SITIO)}/instagram.png`);
});

test('sin fuente o sin campaña, el enlace queda como estaba; un valor raro se limpia', () => {
  assert.equal(ponerOrigen(enlaceDeNota(nota, SITIO), {}), enlaceDeNota(nota, SITIO));
  assert.equal(ponerOrigen(enlaceDeNota(nota, SITIO), { fuente: 'facebook' }), enlaceDeNota(nota, SITIO));
  const u = new URL(ponerOrigen(enlaceDeNota(nota, SITIO), { fuente: 'Face Book!', campana: 'Repaso del día' }));
  assert.equal(u.searchParams.get('utm_source'), 'face-book');
  assert.equal(u.searchParams.get('utm_campaign'), 'repaso-del-d-a');
});

test('el texto del posteo: sin origen sale limpio; con origen, cada red lleva el suyo', () => {
  assert.ok(!mensajeDeNota(nota, SITIO).includes('utm_'), 'sin origen, nada cambia');
  const fb = mensajeDeNota(nota, SITIO, { fuente: 'facebook' });
  const ig = mensajeDeNota(nota, SITIO, { fuente: 'instagram' });
  assert.match(fb, /\?utm_source=facebook&utm_medium=social&utm_campaign=posteo&utm_content=abc123/);
  // Desde el 17/10/2026 Instagram NUNCA lleva enlace (no se toca en el celular): el posteo manda a la bio.
  assert.ok(!/https?:|utm_/.test(ig) && /link en la bio/.test(ig), ig);
  const conTextoDeRedes = mensajeDeNota({ ...nota, textoRedes: 'Reabre el Fangio.' }, SITIO, { fuente: 'facebook' });
  assert.match(conTextoDeRedes, /utm_source=facebook/);
});

test('el pie de un podcast: los enlaces de las notas llevan la red y la campaña "repaso"', () => {
  const pieza = { tipo: 'reel', nombre: 'noticia1', titulo: 'El repaso de la mañana', items: [{ titulo: 'Una', enlace: 'https://radarbalcarce.com/nota/una-a' }] };
  assert.ok(!pieDePieza(pieza).includes('utm_'), 'sin red, igual que antes');
  assert.ok(!/https?:|utm_/.test(pieDePieza(pieza, 'instagram')), 'Instagram sin enlaces');
  assert.match(pieDePieza(pieza, 'facebook'), /nota\/repaso\d{8}manana\?utm_source=facebook&utm_medium=social&utm_campaign=repaso&utm_content=noticia1/);
  assert.ok(!pieDePieza(pieza, 'facebook').includes('una-a'), 'no lleva el enlace de cada noticia');
  // los reels sin lista no llevan enlace a una nota: no hay nada que marcar
  assert.ok(!pieDePieza({ tipo: 'reel', nombre: 'otro', titulo: 'Un reel' }, 'facebook').includes('utm_'));
});

test('quien publica pasa la red: Facebook, el espejo de Instagram y los reels', () => {
  const publicar = leer('redes/publicar.mjs');
  assert.match(publicar, /ORIGEN_FACEBOOK = \{ fuente: 'facebook' \}/);
  assert.match(publicar, /ORIGEN_INSTAGRAM = \{ fuente: 'instagram' \}/);
  assert.ok(!/mensajeDeNota\(nota, SITIO\)/.test(publicar), 'ningún posteo sale con el enlace sin origen');
  assert.match(publicar, /anotar\(libro, 'facebook', nota\.id, \{\s*postId: r\.id, titulo: nota\.titulo, enlace,/, 'el libro guarda el enlace limpio');
  assert.match(publicar, /const enlace = enlaceDeNota\(nota, SITIO\);/);
  assert.match(leer('redes/publicar-piezas.mjs'), /pieDePieza\(pieza, red\)/);
  assert.match(leer('redes/reintentar.mjs'), /pieDePieza\(pieza, red\)/);
});

test('el sitio no se rompe con las UTM: el canónico de la nota es siempre el enlace limpio', () => {
  const pagina = leer('web/app/nota/[id]/page.js');
  assert.match(pagina, /alternates: \{ canonical: camino \}/);
  assert.match(pagina, /const camino = n\.ruta;/);
  assert.ok(!/searchParams|utm_/.test(pagina.replace(/\/\*[\s\S]*?\*\//g, '')), 'la página no lee la dirección con parámetros');
});

test('el contrato de Facebook y la auditoría ignoran la parte ?… al comparar enlaces', () => {
  assert.match(leer('redes/contrato.mjs'), /replace\(\/\[\?#\]\.\*\$\/, ''\)/);
  assert.match(leer('redes/auditar-redes.mjs'), /replace\(\/\[\?#\]\.\*\$\/, ''\)/);
});

// Fotos libres de Wikimedia Commons para las notas propias (3/10/2026): la F1 lleva una foto del circuito. Sin red.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { licenciaBuena, elegirFotoLibre, creditoDeCommons, buscarFotoLibre, bajarFotoLibre } from '../web/scripts/foto-libre.mjs';
import { notaDeHorarios, notaDeParrilla, resumirParrilla } from '../ingesta/f1.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

test('sólo licencias que se pueden reusar con crédito', () => {
  for (const ok of ['CC BY 3.0', 'CC BY-SA 4.0', 'CC BY-SA 2.5', 'CC BY 2.5 ar', 'CC0', 'Public domain', 'PD-self', 'cc-by-sa 3.0']) assert.ok(licenciaBuena(ok), ok);
  for (const mal of ['CC BY-NC 4.0', 'CC BY-ND 2.0', 'CC BY-NC-SA 3.0', 'Fair use', 'All rights reserved', '', undefined, 'GFDL']) assert.ok(!licenciaBuena(mal), String(mal));
});

const pagina = (titulo, extra = {}) => ({
  title: `File:${titulo}`,
  imageinfo: [{ mime: 'image/jpeg', width: 3000, height: 2000, thumburl: `https://upload.wikimedia.org/${encodeURIComponent(titulo)}`, descriptionurl: `https://commons.wikimedia.org/wiki/File:${titulo}`, extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: '<a href="x">Ana  <b>Pérez</b></a>' } }, ...extra }],
});

test('se elige la foto horizontal, grande, de licencia buena y que no sea un logo ni un mapa, con más palabras de la consulta', () => {
  const paginas = {
    1: pagina('Sepang logo.jpg'),
    2: pagina('Sepang circuit map.jpg'),
    3: pagina('Vertical tower.jpg', { width: 2000, height: 3000 }),
    4: pagina('Chica.jpg', { width: 500, height: 300 }),
    5: pagina('Con licencia no comercial.jpg', { extmetadata: { LicenseShortName: { value: 'CC BY-NC 4.0' } } }),
    6: pagina('Una tribuna cualquiera.jpg'),
    7: pagina('Sepang International Circuit pits.jpg'),
    8: pagina('Dibujo.svg', { mime: 'image/svg+xml' }),
  };
  const f = elegirFotoLibre(paginas, 'Sepang International Circuit');
  assert.equal(f.titulo, 'File:Sepang International Circuit pits.jpg');
  assert.equal(f.autor, 'Ana Pérez', 'el autor sin etiquetas');
  assert.equal(creditoDeCommons(f), 'Foto: Ana Pérez / Wikimedia Commons (CC BY-SA 4.0)');
  assert.equal(elegirFotoLibre({}, 'x'), null);
  assert.equal(elegirFotoLibre({ 1: paginas[1], 2: paginas[2] }, 'x'), null, 'sólo logos y mapas: ninguna');
  assert.equal(creditoDeCommons({ autor: null, licencia: 'CC0' }), 'Foto: Wikimedia Commons (CC0)');
});

test('buscar y bajar: una respuesta rara o caída da null y no rompe nada', async () => {
  const buena = async () => ({ ok: true, json: async () => ({ query: { pages: { 1: pagina('Circuito grande.jpg') } } }) });
  assert.equal((await buscarFotoLibre('circuito grande', { fetchFn: buena })).titulo, 'File:Circuito grande.jpg');
  assert.equal(await buscarFotoLibre('x', { fetchFn: async () => ({ ok: false, status: 429 }) }), null);
  assert.equal(await buscarFotoLibre('x', { fetchFn: async () => { throw new Error('sin red'); } }), null);
  assert.equal(await buscarFotoLibre('x', { fetchFn: async () => ({ ok: true, json: async () => ({}) }) }), null);
  const foto = elegirFotoLibre({ 1: pagina('Circuito grande.jpg') }, 'circuito');
  const bytes = Buffer.alloc(8000, 3);
  const r = await bajarFotoLibre(foto, 'libre-f1horarios2026r16', { fetchFn: async () => ({ ok: true, arrayBuffer: async () => bytes }), achicar: async () => Buffer.alloc(3000, 1) });
  assert.equal(r.archivo, 'fotos-notas/libre-f1horarios2026r16.jpg');
  assert.equal(r.bytes.length, 3000);
  assert.equal(r.entrada.credito, 'Foto: Ana Pérez / Wikimedia Commons (CC BY-SA 4.0)');
  assert.equal(r.entrada.licencia, 'CC BY-SA 4.0');
  assert.equal(r.entrada.origen, 'libre');
  assert.match(r.entrada.enlace, /commons\.wikimedia\.org/);
  assert.equal(await bajarFotoLibre(foto, 'x', { fetchFn: async () => ({ ok: true, arrayBuffer: async () => Buffer.alloc(100) }) }), null, 'una imagen diminuta no sirve');
  assert.equal(await bajarFotoLibre(foto, 'x', { fetchFn: async () => ({ ok: false }) }), null);
  assert.equal(await bajarFotoLibre(foto, 'x', { fetchFn: async () => { throw new Error('x'); } }), null);
});

test('las notas de F1 llevan el circuito para buscarle la foto, y generar-datos se la pone una vez por nota', () => {
  const carrera = { ronda: 16, nombre: 'Bahrain Grand Prix in Malaysia', circuito: 'Sepang International Circuit', localidad: 'Kuala Lumpur', pais: 'Malaysia', largada: '2026-10-04T07:00:00.000Z', sesiones: [{ clave: 'Race', nombre: 'Carrera', inicio: '2026-10-04T07:00:00.000Z' }] };
  assert.equal(notaDeHorarios(carrera, { fecha: '2026-10-03T12:00:00.000Z' }).circuitoF1, 'Sepang International Circuit');
  const filas = Array.from({ length: 12 }, (_, i) => ({ posicion: i + 1, piloto: `Piloto ${i + 1}`, colapinto: false, equipo: 'E', numero: String(i), q1: '1:30.000', q2: null, q3: null }));
  assert.equal(notaDeParrilla({ ...carrera, temporada: 2026, filas }, { fecha: '2026-10-03T12:00:00.000Z' }).circuitoF1, 'Sepang International Circuit');
  assert.ok(resumirParrilla);
  const gen = leer('web/scripts/generar-datos.mjs');
  assert.ok(gen.includes("const lugarDeLaFoto = n.propia === 'f1' ? n.circuitoF1 : "), 'la F1 usa el circuito (y el fútbol, el estadio)');
  assert.match(gen, /await import\('\.\/foto-libre\.mjs'\)/);
  assert.match(gen, /if \(enLaNube\) \{\n  const \{ buscarFotoLibre, bajarFotoLibre \}/.test(gen.replace(/\r\n/g, '\n')) ? /./ : /if \(enLaNube\)/, 'sólo en la nube');
  assert.match(gen, /no hubo una foto libre buena/);
  assert.match(gen, /< 6 \* 3600e3/, 'si no hubo foto, se vuelve a probar a las 6 horas');
  assert.match(leer('web/scripts/foto-libre.mjs'), /Wikimedia Commons/);
});

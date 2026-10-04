// 4/10/2026 (Hernán): dos notas de fútbol salieron con la misma foto, la nota era "mucho texto" y las portadas mostraban el crédito de la foto.
// Ahora: cada nota de la misma fecha lleva una foto distinta, la nota se dibuja con tablas y escudos, y el crédito sólo va adentro de la nota.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { notaDeLosPartidos, notaDeLosResultados, notaDeLasTablas, COMPETENCIAS } from '../ingesta/futbol.mjs';
import { elegirFotoLibre } from '../web/scripts/foto-libre.mjs';
import { idsDeEscudos, bajarEscudos, urlDelEscudo } from '../web/scripts/escudos.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const liga = COMPETENCIAS.find((c) => c.clave === 'liga');

const partido = (id, local, visitante, inicio, extra = {}) => ({
  id, competencia: 'liga', inicio, estado: 'final', minuto: "90'",
  local: { id: local[0], nombre: local[1], goles: 1 }, visitante: { id: visitante[0], nombre: visitante[1], goles: 2 },
  penales: null, goles: [{ equipo: 'local', jugador: 'Juan Pérez', minuto: "10'", tipo: 'gol' }], estadio: 'Estadio Libertadores de América', fase: null, partidoDeLaSerie: null, torneo: 'torneo-clausura', ...extra,
});
const PARTIDOS = [
  partido('1', ['11', 'Independiente'], ['2975', 'Instituto (Córdoba)'], '2026-10-02T22:15:00.000Z'),
  partido('2', ['5', 'Racing Club'], ['4', 'Boca Juniors'], '2026-10-03T19:00:00.000Z', { estado: 'programado' }),
];

test('las notas de fútbol llevan sus datos ordenados para dibujarlos, con los ids de los equipos (el escudo)', () => {
  const p = notaDeLosPartidos(liga, PARTIDOS, { fecha: '2026-10-02T12:00:00Z' });
  assert.equal(p.tipoFutbol, 'partidos');
  assert.equal(p.datosFutbol.partidos.length, 2);
  assert.deepEqual(p.datosFutbol.partidos[0].local, { id: '11', nombre: 'Independiente', goles: 1 });
  assert.equal(p.datosFutbol.partidos[0].dia, 'Viernes 2 de octubre');
  assert.match(p.datosFutbol.partidos[0].hora, /^\d{2}:\d{2}$/);
  const r = notaDeLosResultados(liga, PARTIDOS, { fecha: '2026-10-02T12:00:00Z' });
  assert.equal(r.datosFutbol.partidos.length, 1, 'sólo los terminados');
  assert.equal(r.datosFutbol.faltan, 1);
  assert.equal(r.datosFutbol.partidos[0].goles[0].jugador, 'Juan Pérez');
  assert.ok(r.cuerpo.includes('Independiente 1, Instituto (Córdoba) 2'), 'el cuerpo en texto sigue estando (redes y buscadores)');
});

test('la tabla guarda las zonas con el id de cada equipo', () => {
  const tabla = { torneo: 'Clausura', zonas: [{ nombre: 'Zona A', filas: [{ posicion: 1, id: '4', equipo: 'Boca Juniors', pj: 1, g: 1, e: 0, p: 0, gf: 2, gc: 0, dif: 2, pts: 3 }] }] };
  const n = notaDeLasTablas(liga, tabla, PARTIDOS, { fecha: '2026-10-03T12:00:00Z' });
  assert.equal(n.datosFutbol.zonas[0].filas[0].id, '4');
  assert.deepEqual(idsDeEscudos([n]), ['4']);
});

test('los escudos que hay que bajar salen de los partidos y las tablas, sin repetir ni aceptar ids raros', () => {
  const p = notaDeLosPartidos(liga, PARTIDOS, { fecha: '2026-10-02T12:00:00Z' });
  assert.deepEqual(idsDeEscudos([p, { datosFutbol: { partidos: [{ local: { id: '../x' }, visitante: { id: '11' } }] } }, { titulo: 'sin datos' }]).sort(), ['11', '2975', '4', '5']);
});

test('los escudos se bajan una vez, sólo si son un PNG de verdad, y un fallo no rompe nada', async () => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'escudos-'));
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(600)]);
  const pedidos = [];
  const fetchFn = async (url) => {
    pedidos.push(url);
    if (url.includes('/2975.')) return { ok: false, status: 404 };
    if (url.includes('/5.')) return { ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => Buffer.from('<html>no soy un png, soy una pagina de error</html>'.repeat(20)) };
    if (url.includes('/4.')) throw new Error('sin red');
    return { ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => png };
  };
  assert.equal(await bajarEscudos(['11', '2975', '5', '4'], carpeta, { fetchFn }), 1);
  assert.deepEqual(fs.readdirSync(carpeta), ['11.png']);
  pedidos.length = 0;
  assert.equal(await bajarEscudos(['11'], carpeta, { fetchFn }), 0);
  assert.equal(pedidos.length, 0, 'el que ya está no se vuelve a pedir');
  assert.match(urlDelEscudo('11'), /^https:\/\/a\.espncdn\.com\/.*\/11\.png/);
});

test('dos notas del mismo estadio no llevan la misma foto: la que ya usó otra nota se saltea', () => {
  const pagina = (n, titulo) => ({ title: `File:${titulo}.jpg`, imageinfo: [{ mime: 'image/jpeg', width: 1600, height: 1000, thumburl: `https://x/${n}.jpg`, extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: 'Alguien' } } }] });
  const paginas = { a: pagina(1, 'Estadio Libertadores de America 1'), b: pagina(2, 'Estadio Libertadores 2') };
  assert.equal(elegirFotoLibre(paginas, 'estadio Libertadores de América').url, 'https://x/1.jpg');
  assert.equal(elegirFotoLibre(paginas, 'estadio Libertadores de América', ['https://x/1.jpg']).url, 'https://x/2.jpg');
  assert.equal(elegirFotoLibre(paginas, 'estadio', ['https://x/1.jpg', 'https://x/2.jpg']), null, 'si no queda otra, sin foto antes que repetida');
  const gen = leer('web/scripts/generar-datos.mjs');
  assert.match(gen, /buscarFotoLibre\(`\$\{lugarDeLaFoto\}`, \{ excluir: \[\.\.\.usadas\] \}\)/);
  assert.match(gen, /const repetida = guardada\?\.imagenOriginal && usadas\.has\(guardada\.imagenOriginal\)/, 'una foto repetida que ya estaba guardada se cambia');
});

test('la nota de fútbol se dibuja con la maqueta y los escudos salen de la carpeta propia (nunca de otro sitio)', () => {
  assert.match(leer('web/app/nota/[id]/page.js'), /\{n\.datosFutbol && <CuerpoDeFutbol tipo=\{n\.tipoFutbol\} datos=\{n\.datosFutbol\} \/>\}/);
  assert.match(leer('web/app/nota/[id]/page.js'), /n\.cuerpo && !n\.datosFutbol/, 'las viejas, sin datos, siguen con el texto');
  const c = leer('web/components/futbol.js');
  assert.ok(!/https?:/.test(c), 'el escudo es de /escudos/, no de afuera (la página tiene img-src self)');
  assert.match(leer('web/lib/escudos.js'), /\/escudos\//);
  assert.match(leer('.github/workflows/actualizar.yml'), /web\/public\/escudos\//, 'sin esto los escudos bajados se pierden');
  assert.match(leer('web/scripts/generar-datos.mjs'), /bajarEscudos\(idsDeEscudos\(propias\)/);
});

test('el crédito de la foto no sale en las portadas ni en las secciones, sólo adentro de la nota', () => {
  for (const f of ['web/components/postales.js', 'web/components/imagen-destacada.js']) assert.ok(!leer(f).includes('credito'), f);
  assert.match(leer('web/app/nota/[id]/page.js'), /\{n\.foto\.credito\}<\/figcaption>/);
});

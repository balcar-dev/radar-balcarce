// Los enlaces de las notas no se rompen: ni cuando cambia el titular, ni
// cuando la nota sale de la portada.
//
// Pasó el 25/09: los enlaces publicados en Facebook daban 404. Dos causas:
// la IA reescribía el titular después de publicar (y la dirección se armaba
// con el titular del momento), y cuando la nota salía de portada.json su
// página dejaba de generarse. Ver web/lib/ruta.js y web/lib/archivo.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rutaDeNota, parteDeNota, idDeRuta, destinoDesde404 } from '../web/lib/ruta.js';
import {
  vigenteEnPortada, slugsConocidos, fijarSlug, actualizarArchivo, idsEnRedes, HORAS_EN_PORTADA,
} from '../web/lib/archivo.js';
import { sinTitularRepetido, titularNormalizado } from '../web/lib/texto.js';
import { enlaceDeNota } from '../redes/elegir.mjs';
import { redireccionesDeNotas } from '../web/scripts/generar-redirects.mjs';
import { notasDelHistorial } from '../web/scripts/recuperar-archivo.mjs';

const SITIO = 'https://radarbalcarce.com';
const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const AHORA = new Date('2026-09-25T12:00:00-03:00').getTime();
const haceHoras = (h) => new Date(AHORA - h * 3600e3).toISOString();

const nota = (extra = {}) => ({
  id: 'lcvlqf', titulo: 'Vuelve el TC al autódromo Juan Manuel Fangio', copete: 'Copete', cuerpo: null,
  seccion: 'Automovilismo', medios: ['Un medio'], enlace: 'https://otro.medio/x', fecha: haceHoras(2), temas: ['autodromo'],
  ...extra,
});

/** Una corrida de generar-datos, en chico: la dirección se fija con lo que ya
 *  estaba publicado (portada anterior, archivo y libro de las redes). */
function corrida(publicadas, { anterior = [], archivo = [], libro = {} } = {}) {
  const conocidos = slugsConocidos({ archivo, anterior, libro });
  return publicadas.map((n) => fijarSlug(n, conocidos));
}

// ------------------------------------------------ el titular cambia después

test('el enlace publicado en Facebook sigue andando cuando la IA cambia el titular', () => {
  // Primera corrida: la nota sale con el titular de la fuente.
  const [primera] = corrida([nota()]);
  const enFacebook = enlaceDeNota(primera, SITIO);
  assert.equal(enFacebook, `${SITIO}/nota/vuelve-el-tc-al-autodromo-juan-manuel-fangio-lcvlqf`);

  // Segunda corrida: la IA le cambió el titular. La dirección no se mueve.
  const [segunda] = corrida([nota({ titulo: 'La reapertura del Fangio tendrá a las Pick Up' })], { anterior: [primera] });
  assert.equal(segunda.titulo, 'La reapertura del Fangio tendrá a las Pick Up');
  assert.equal(enlaceDeNota(segunda, SITIO), enFacebook);
  assert.equal(`${SITIO}${rutaDeNota(segunda)}`, enFacebook, 'la página se genera en la misma dirección que se publicó');
});

test('la dirección también se sostiene desde el archivo, cuando la nota ya no está en la portada', () => {
  const [primera] = corrida([nota()]);
  const [vuelve] = corrida([nota({ titulo: 'Otro titular' })], { archivo: [primera] });
  assert.equal(parteDeNota(vuelve), parteDeNota(primera));
});

test('los enlaces que ya estaban en Facebook antes del arreglo se rescatan del libro', () => {
  // Al 25/09 la portada no guardaba la dirección. El libro de las redes sí
  // guarda el titular con el que salió el posteo, que es con el que se armó
  // el enlace: 942wi7 salió como "Urcera y la tranquilidad…" y hoy se llama
  // "Confirman la continuidad…".
  const libro = { facebook: { '942wi7': { titulo: 'Urcera y la tranquilidad del “trabajo a largo plazo” con Mercedes en TC' } } };
  const [hoy] = corrida([nota({ id: '942wi7', titulo: 'Confirman la continuidad del proyecto de Mercedes en el TC en Balcarce' })], { libro });
  assert.equal(rutaDeNota(hoy), '/nota/urcera-y-la-tranquilidad-del-trabajo-a-largo-plazo-con-mercedes-en-tc-942wi7');

  // Y si el libro ya guarda el enlace (desde el 25/09), manda el enlace.
  const libro2 = { facebook: { abc: { titulo: 'Cualquier cosa', enlace: `${SITIO}/nota/el-que-se-publico-abc` } } };
  const [n2] = corrida([nota({ id: 'abc', titulo: 'Titular nuevo' })], { libro: libro2 });
  assert.equal(rutaDeNota(n2), '/nota/el-que-se-publico-abc');
});

test('las piezas de Instagram del libro (día/nombre) no se confunden con notas', () => {
  const libro = { instagram: { '2026-09-21/podcast': { titulo: 'Podcast', notaId: 'zz1' } }, instagramFeed: { abc: {} } };
  assert.deepEqual(slugsConocidos({ libro }), {});
  assert.deepEqual([...idsEnRedes(libro)].sort(), ['abc', 'zz1']);
});

test('una dirección vieja que igual llega (con otro titular o con el id a secas) va a la nota', () => {
  const indice = { lcvlqf: 'vuelve-el-tc-al-autodromo-juan-manuel-fangio-lcvlqf' };
  const buena = '/nota/vuelve-el-tc-al-autodromo-juan-manuel-fangio-lcvlqf';
  assert.equal(destinoDesde404('/nota/un-titular-que-ya-no-existe-lcvlqf', indice), buena);
  assert.equal(destinoDesde404('/nota/lcvlqf', indice), buena);
  assert.equal(destinoDesde404('/nota/otro-titular-lcvlqf/instagram.png', indice), `${buena}/instagram.png`);
  assert.equal(destinoDesde404('/nota/otro-titular-lcvlqf/', indice), `${buena}/`);
  // La misma dirección no se redirige a sí misma (sería un bucle).
  assert.equal(destinoDesde404(buena, indice), null);
  // Lo que no es una nota, o una nota que no existe, se queda en el 404.
  assert.equal(destinoDesde404('/nota/no-existe-zzz999', indice), null);
  assert.equal(destinoDesde404('/seccion/deportes', indice), null);
  assert.equal(destinoDesde404('/nota/x-lcvlqf', null), null);
  assert.equal(idDeRuta('un-titular-que-ya-no-existe-lcvlqf'), 'lcvlqf');
});

test('la página 404 del sitio lleva el rescate de enlaces, y el índice existe', () => {
  const pagina = leer('web/app/not-found.js');
  assert.match(pagina, /destinoDesde404\.toString\(\)/);
  assert.match(pagina, /\/nota\/indice\.json/);
  assert.match(leer('web/app/nota/indice.json/route.js'), /todasLasNotas\(\)/);
  // La función viaja al navegador como texto: no puede depender de nada de afuera.
  const suelta = new Function(`return (${destinoDesde404.toString()});`)();
  assert.equal(suelta('/nota/viejo-abc', { abc: 'nuevo-abc' }), '/nota/nuevo-abc');
});

test('/nota/ID tiene redirección fija también para las notas archivadas', () => {
  const r = redireccionesDeNotas(
    { notas: [{ id: 'a1', titulo: 'Hoy', slug: 'hoy', fecha: haceHoras(1) }] },
    { notas: [{ id: 'a1', titulo: 'Hoy', slug: 'hoy', fecha: haceHoras(1) }, { id: 'b2', titulo: 'Titular nuevo', slug: 'titular-viejo', fecha: haceHoras(200) }] },
  );
  assert.deepEqual(r, [
    { origen: '/nota/a1', destino: '/nota/hoy-a1' },
    { origen: '/nota/b2', destino: '/nota/titular-viejo-b2' },
  ]);
  // Cloudflare ignora las que pasan de 2.000: se corta en las más nuevas.
  assert.equal(redireccionesDeNotas({ notas: Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, titulo: 'x', fecha: haceHoras(i) })) }, {}, 10).length, 10);
});

// ------------------------------------------------- la nota sale de la portada

test('una nota que salió de la portada sigue en el archivo', () => {
  const [n] = corrida([nota()]);
  const primera = actualizarArchivo({ publicadas: [n], enPortada: new Set([n.id]), ahora: AHORA });
  assert.deepEqual(primera.map((x) => x.id), ['lcvlqf']);

  // La corrida siguiente ya no la trae (la fuente la bajó): se queda igual.
  const segunda = actualizarArchivo({ archivo: primera, publicadas: [], ahora: AHORA });
  assert.deepEqual(segunda, primera);
});

test('una nota que sale de la portada sigue teniendo página y no aparece en las listas', async () => {
  // El sitio de verdad, leyendo datos de mentira desde otra carpeta.
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-archivo-'));
  fs.mkdirSync(path.join(carpeta, 'data'));
  const archivada = { ...nota({ id: 'viejo1', titulo: 'Una nota de la semana pasada', fecha: new Date(Date.now() - 7 * 24 * 3600e3).toISOString() }), slug: 'una-nota-de-la-semana-pasada' };
  const deHoy = { ...nota({ id: 'hoy1', titulo: 'Una nota de hoy', fecha: new Date().toISOString() }), slug: 'una-nota-de-hoy' };
  // Una de hace cuatro días que quedó en portada.json (el archivo tardó en
  // regenerarse): no va en las listas, pero tiene página.
  const rezagada = { ...nota({ id: 'reza1', titulo: 'Rezagada', fecha: new Date(Date.now() - 96 * 3600e3).toISOString() }), slug: 'rezagada' };
  fs.writeFileSync(path.join(carpeta, 'data', 'portada.json'), JSON.stringify({ generado: new Date().toISOString(), notas: [deHoy, rezagada] }));
  fs.writeFileSync(path.join(carpeta, 'data', 'archivo.json'), JSON.stringify({ notas: [deHoy, archivada] }));

  const antes = process.cwd();
  process.chdir(carpeta);
  try {
    const datos = await import('../web/lib/datos.js');
    assert.deepEqual(datos.obtenerDatos().notas.map((n) => n.id), ['hoy1'], 'las listas sólo muestran lo de las últimas 72 horas');
    assert.deepEqual(datos.todasLasNotas().map((n) => n.id).sort(), ['hoy1', 'reza1', 'viejo1']);
    assert.equal(datos.obtenerNota('una-nota-de-la-semana-pasada-viejo1')?.titulo, 'Una nota de la semana pasada');
    assert.equal(datos.obtenerNota('viejo1')?.ruta, '/nota/una-nota-de-la-semana-pasada-viejo1');
    assert.equal(datos.obtenerNota('rezagada-reza1')?.id, 'reza1');
  } finally {
    process.chdir(antes);
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
});

test('las páginas de notas se generan desde todas las notas, no sólo las de la portada', () => {
  assert.match(leer('web/app/nota/[id]/page.js'), /return todasLasNotas\(\)\.map/);
  for (const f of ['web/app/nota/[id]/opengraph-image.js', 'web/app/nota/[id]/instagram.png/route.js']) {
    assert.match(leer(f), /notasConImagen\(\)/, f);
  }
});

test('lo que salió en las redes queda con imagen aunque se archive', () => {
  const [n] = corrida([nota()]);
  const a = actualizarArchivo({ publicadas: [n], enPortada: new Set([n.id]), enRedes: new Set(['lcvlqf']), ahora: AHORA });
  assert.equal(a[0].redes, true);
});

test('una corrección llega a la página archivada, pero la dirección no cambia', () => {
  const [n] = corrida([nota()]);
  const archivo = actualizarArchivo({ publicadas: [n], enPortada: new Set([n.id]), ahora: AHORA });
  const corregida = { ...n, titulo: 'Titular corregido', slug: 'otra-cosa' };
  const [despues] = actualizarArchivo({ archivo, publicadas: [corregida], ahora: AHORA });
  assert.equal(despues.titulo, 'Titular corregido');
  assert.equal(despues.slug, n.slug);
});

test('lo que se bloquea después (o el semáforo pasa a rojo) sale del archivo y pierde la página', () => {
  // Es lo que protege a un menor o a una víctima si se descubre tarde.
  const [n] = corrida([nota()]);
  const archivo = actualizarArchivo({ publicadas: [n], enPortada: new Set([n.id]), ahora: AHORA });
  assert.deepEqual(actualizarArchivo({ archivo, retiradas: new Set(['lcvlqf']), ahora: AHORA }), []);
});

test('lo que nunca estuvo en las listas no entra al archivo', () => {
  // Una nota de hace una semana que aparece recién hoy no es noticia: no
  // se le arma página.
  const vieja = nota({ id: 'vieja', fecha: haceHoras(24 * 7) });
  assert.deepEqual(actualizarArchivo({ publicadas: [vieja], enPortada: new Set(), ahora: AHORA }), []);
});

test('el archivo guarda 180 días y tiene tope, con prioridad a lo que salió en redes', () => {
  const vieja = { ...nota({ id: 'z', fecha: haceHoras(24 * 181) }), slug: 'z' };
  assert.deepEqual(actualizarArchivo({ archivo: [vieja], ahora: AHORA }), []);

  const muchas = Array.from({ length: 10 }, (_, i) => ({ ...nota({ id: `m${i}`, fecha: haceHoras(i + 1) }), slug: `m${i}` }));
  const conRedes = [...muchas, { ...nota({ id: 'fb', fecha: haceHoras(500) }), slug: 'fb', redes: true }];
  const r = actualizarArchivo({ archivo: conRedes, ahora: AHORA, maximo: 5 });
  assert.equal(r.length, 5);
  assert.ok(r.some((n) => n.id === 'fb'), 'se cayó una nota que está en Facebook');
  assert.deepEqual(r.slice(0, 4).map((n) => n.id), ['m0', 'm1', 'm2', 'm3']);
});

test('lo que salió de la portada antes del archivo se recupera del historial, en su última versión', () => {
  const versiones = [
    { notas: [{ id: 'a', titulo: 'Primera versión' }, { id: 'b', titulo: 'Otra' }] },
    { notas: [{ id: 'a', titulo: 'Titular reescrito' }] },
    null,
  ];
  const notas = notasDelHistorial(versiones);
  assert.deepEqual(notas.map((n) => [n.id, n.titulo]), [['a', 'Titular reescrito'], ['b', 'Otra']]);
});

// ---------------------------------------------------------- 72 horas (25/09)

test('las listas no muestran notas de más de 72 horas', () => {
  assert.equal(HORAS_EN_PORTADA, 72);
  assert.ok(vigenteEnPortada({ fecha: haceHoras(71) }, AHORA));
  assert.ok(!vigenteEnPortada({ fecha: haceHoras(73) }, AHORA));
  // Sin fecha no se sabe: no se saca.
  assert.ok(vigenteEnPortada({}, AHORA));
});

test('generar-datos corta las listas en 72 horas y guarda el archivo, sin tocar farmacia, clima ni agenda', () => {
  const s = leer('web/scripts/generar-datos.mjs');
  assert.match(s, /const notas = publicadas\.filter\(\(n\) => vigenteEnPortada\(n\)\)/);
  assert.match(s, /actualizarArchivo\(/);
  assert.match(s, /fs\.writeFileSync\(ARCHIVO/);
  // Las piezas que no son notas salen de otro lado, no del filtro.
  assert.match(s, /farmacias: \{ hoy: turnoHoy, proximos: proximosTurnos/);
  assert.match(s, /clima: ultima\.clima \?\? null/);
  assert.match(s, /municipio: \(agenda\?\.municipio \?\? \[\]\)/);
});

// -------------------------------------------------- "Seguí leyendo" (25/09)

test('"Seguí leyendo" no repite una nota con el mismo titular', () => {
  const lista = [
    { id: 'a', titulo: 'El Senado aprueba la reforma de Zona Fría en Balcarce' },
    { id: 'b', titulo: 'El senado aprueba la reforma de Zona Fria en Balcarce.' },
    { id: 'c', titulo: 'Otra cosa' },
    { id: 'd', titulo: 'La que se está leyendo' },
  ];
  assert.deepEqual(sinTitularRepetido(lista, [{ id: 'x', titulo: 'La que se está leyendo' }]).map((n) => n.id), ['a', 'c']);
  assert.equal(titularNormalizado('¡Hola, Fangio!'), 'hola fangio');
  assert.match(leer('web/app/nota/[id]/page.js'), /sinTitularRepetido\(/);
});

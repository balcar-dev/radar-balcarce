// La pestaña Fotos del panel del celular y el flujo de sumar una foto a mano (2/10/2026), más lo que se reordenó ese día:
// cinco pestañas, Esperan y Sin cuerpo juntas, Publicadas de las últimas 24 horas y la IA escribiendo en segundo plano.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  motivoDeFoto, notasSinFoto, palabrasDeBusqueda, busquedasDeFoto, urlDeFotoValida, creditoDeFoto, htmlDeFotos, htmlDeUnaNotaSinFoto, MOTIVOS_DE_FOTO,
} from '../web/public/panel/fotos.js';
import { motivoDeLaNota, MOTIVOS_FIRMES } from '../ingesta/auditar-fotos.mjs';
import { sumarFoto, bajarImagen } from '../web/scripts/foto-manual.mjs';

const leer = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const apps = { esc: (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), chip: (s) => `[${s}]`, haceCuanto: () => 'hace un rato' };

test('el motivo de una nota sin foto es el mismo que el de la auditoría de fotos (npm run auditar-fotos)', () => {
  const casos = [
    [{ seccion: 'Balcarce' }, undefined],
    [{ seccion: 'Policiales' }, undefined],
    [{ seccion: 'Deportes' }, { razon: 'La única foto disponible incluye menores de edad reconocibles', intentos: 1 }],
    [{ seccion: 'Deportes' }, { razon: 'La foto tiene la marca de agua de otro medio' }],
    [{ seccion: 'Deportes' }, { razon: 'La única imagen es el logo del medio' }],
    [{ seccion: 'Deportes' }, { razon: 'es un flyer institucional' }],
    [{ seccion: 'Deportes' }, { razon: 'sin fotos para comparar', origen: 'gemini' }],
    [{ seccion: 'Deportes' }, { razon: 'Gemini falló: 429', intentos: 1 }],
    [{ seccion: 'Deportes' }, { razon: 'Gemini falló: 429', intentos: 5 }],
    [{ seccion: 'Deportes' }, { error: 'no se pudo volver a bajar la elegida', origen: 'medio' }],
    [{ seccion: 'Deportes' }, { razon: 'otra cosa distinta' }],
  ];
  for (const [nota, entrada] of casos) assert.equal(motivoDeFoto(nota, entrada), motivoDeLaNota(nota, entrada), JSON.stringify([nota, entrada]));
});

test('las reglas firmes del panel son las mismas que las de la auditoría', () => {
  const firmes = new Set(Object.entries(MOTIVOS_DE_FOTO).filter(([, m]) => m.firme).map(([k]) => k));
  // La auditoría también cuenta "propia" como firme; el panel no la lista nunca (las propias no llevan foto de otro).
  assert.deepEqual([...firmes].sort(), [...MOTIVOS_FIRMES].filter((k) => k !== 'propia').sort());
});

test('notasSinFoto: sólo las que no tienen foto ni en la nota ni en el banco, sin las propias, las más nuevas primero', () => {
  const notas = [
    { id: 'a', titulo: 'A', fecha: '2026-10-02T10:00:00Z' },
    { id: 'b', titulo: 'B', fecha: '2026-10-02T12:00:00Z' },
    { id: 'c', titulo: 'C', fecha: '2026-10-02T11:00:00Z', foto: { archivo: 'fotos-notas/c.jpg' } },
    { id: 'd', titulo: 'D', fecha: '2026-10-02T09:00:00Z', propia: true },
    { id: 'e', titulo: 'E', fecha: '2026-10-02T08:00:00Z' },
  ];
  const lista = notasSinFoto(notas, { e: { archivo: 'fotos-notas/e.jpg' } });
  assert.deepEqual(lista.map((x) => x.nota.id), ['b', 'a']);
  assert.equal(lista[0].motivo, 'sinProbar');
});

test('palabras de búsqueda: sin relleno, y "Mar del Plata" no se parte', () => {
  assert.equal(palabrasDeBusqueda('Jugadoras locales compiten en un torneo de básquet en Mar del Plata').join(' '), 'Jugadoras locales compiten torneo básquet Mar del Plata');
  assert.equal(palabrasDeBusqueda('El Autódromo Juan Manuel Fangio reabre sus puertas tras quince años').join(' '), 'Autódromo Juan Manuel Fangio reabre puertas quince años');
  assert.deepEqual(palabrasDeBusqueda(''), []);
});

test('busquedasDeFoto: enlaces armados con el título, "Balcarce" si la nota es de acá y las páginas de sus fuentes', () => {
  const b = busquedasDeFoto({ titulo: 'Cortan el agua el jueves en el barrio Norte', seccion: 'Balcarce', fuentesConsultadas: [{ medio: 'Municipalidad', enlace: 'https://balcarce.gob.ar/a' }, { medio: 'Repetida', enlace: 'https://balcarce.gob.ar/a' }, { medio: 'Mala', enlace: 'javascript:alert(1)' }], enlace: 'https://balcarce.gob.ar/a' });
  assert.match(b.consulta, /Balcarce$/);
  assert.equal(b.enlaces.length, 3);
  assert.ok(b.enlaces.every((e) => e.url.startsWith('https://')));
  assert.match(b.enlaces[0].url, /q=Cortan%20agua%20jueves%20barrio%20Norte%20Balcarce/);
  assert.deepEqual(b.fuentes, [{ medio: 'Municipalidad', url: 'https://balcarce.gob.ar/a' }]);
});

test('la dirección de la foto: sólo https de un sitio de verdad', () => {
  for (const ok of ['https://balcarce.gob.ar/foto.jpg', 'https://upload.wikimedia.org/a/b.png?x=1']) assert.ok(urlDeFotoValida(ok), ok);
  for (const mal of ['http://balcarce.gob.ar/foto.jpg', 'javascript:alert(1)', 'https://localhost/a.jpg', 'https://127.0.0.1/a.jpg', 'https://10.0.0.1/a.jpg', 'https://usuario:clave@sitio.com/a.jpg', 'https://sitio/a.jpg', 'no es una dirección', '', null]) assert.ok(!urlDeFotoValida(mal), String(mal));
});

test('el crédito va como "Foto: …", sin repetir el prefijo y con tope', () => {
  assert.equal(creditoDeFoto('Municipalidad de Balcarce'), 'Foto: Municipalidad de Balcarce');
  assert.equal(creditoDeFoto('foto:   Bomberos  Voluntarios '), 'Foto: Bomberos Voluntarios');
  assert.equal(creditoDeFoto('   '), '');
  assert.ok(creditoDeFoto('x'.repeat(300)).length <= 'Foto: '.length + 80);
});

test('la lista y la nota de Fotos escapan lo que viene de afuera', () => {
  const item = { nota: { id: 'a1', titulo: '<img src=x onerror=alert(1)>', seccion: 'Balcarce', fecha: '2026-10-02T10:00:00Z', fuentesConsultadas: [{ medio: '<b>', enlace: 'https://x.com/a"onmouseover="y' }] }, motivo: 'otra', entrada: { razon: '<script>alert(1)</script>' } };
  const lista = htmlDeFotos({ items: [item], total: 3, conFoto: 2 }, apps);
  const nota = htmlDeUnaNotaSinFoto(item, apps);
  for (const h of [lista, nota]) {
    assert.ok(!h.includes('<img src=x'), 'título sin escapar');
    assert.ok(!h.includes('<script>'), 'razón sin escapar');
  }
  assert.ok(!nota.includes('onmouseover="y'), 'el enlace de la fuente se escapa');
  assert.match(lista, /2<\/strong> de <strong>3/);
  assert.match(htmlDeFotos({ items: [], total: 3, conFoto: 3 }, apps), /Todas las notas de la portada tienen foto/);
  assert.match(nota, /Confirmo que la foto no tiene marca de agua ni el nombre de otro medio/);
});

// ---------------------------------------------------------------- sumar la foto (la nube)

const JPG = Buffer.alloc(5000, 7);
const respuesta = (cuerpo, { estado = 200, tipo = 'image/jpeg' } = {}) => async () => ({ ok: estado < 400, status: estado, headers: { get: () => tipo }, arrayBuffer: async () => cuerpo });
const carpetaTemporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'radar-fm-'));

test('sumarFoto baja la imagen, la guarda con el id de la nota y la anota con su crédito', async () => {
  const dir = carpetaTemporal();
  try {
    const archivo = path.join(dir, 'manuales.json');
    const e = await sumarFoto({ id: 'abc123', url: 'https://balcarce.gob.ar/f.jpg', credito: 'Municipalidad de Balcarce', por: 'Hernán', ahora: new Date('2026-10-02T15:00:00Z') }, {
      fetchFn: respuesta(JPG), achicar: async () => Buffer.alloc(1000, 1), carpeta: path.join(dir, 'fotos'), archivo,
    });
    assert.equal(e.archivo, 'fotos-notas/abc123.jpg');
    assert.equal(e.credito, 'Foto: Municipalidad de Balcarce');
    assert.equal(e.origen, 'manual');
    assert.equal(fs.readFileSync(path.join(dir, 'fotos', 'abc123.jpg')).length, 1000, 'se guarda la achicada');
    const libro = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    assert.deepEqual(Object.keys(libro), ['abc123']);
    assert.equal(libro.abc123.imagenOriginal, 'https://balcarce.gob.ar/f.jpg');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('sumarFoto no guarda nada si no es una imagen, si el sitio contesta mal, si falta el crédito o la dirección no sirve', async () => {
  const dir = carpetaTemporal();
  const opciones = { achicar: async () => null, carpeta: path.join(dir, 'fotos'), archivo: path.join(dir, 'm.json') };
  const base = { id: 'abc123', url: 'https://balcarce.gob.ar/f.jpg', credito: 'Municipalidad' };
  try {
    await assert.rejects(sumarFoto(base, { ...opciones, fetchFn: respuesta(Buffer.from('<html>'), { tipo: 'text/html' }) }), /no es una foto/);
    await assert.rejects(sumarFoto(base, { ...opciones, fetchFn: respuesta(JPG, { estado: 403 }) }), /contestó 403/);
    await assert.rejects(sumarFoto({ ...base, credito: '  ' }, { ...opciones, fetchFn: respuesta(JPG) }), /crédito/);
    await assert.rejects(sumarFoto({ ...base, url: 'http://sitio.com/a.jpg' }, { ...opciones, fetchFn: respuesta(JPG) }), /https/);
    await assert.rejects(sumarFoto({ ...base, id: '../etc' }, { ...opciones, fetchFn: respuesta(JPG) }), /no es válida/);
    await assert.rejects(bajarImagen('https://sitio.com/a.jpg', { fetchFn: respuesta(Buffer.alloc(13 * 1024 * 1024)) }), /pesa demasiado/);
    assert.ok(!fs.existsSync(opciones.archivo), 'sin foto no hay libro');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('sin ffmpeg se guarda la original (una foto pesada es mejor que ninguna)', async () => {
  const dir = carpetaTemporal();
  try {
    const e = await sumarFoto({ id: 'zzz999', url: 'https://sitio.com/a.png', credito: 'X' }, {
      fetchFn: respuesta(JPG, { tipo: 'image/png' }), achicar: async () => null, carpeta: path.join(dir, 'f'), archivo: path.join(dir, 'm.json'),
    });
    assert.equal(e.archivo, 'fotos-notas/zzz999.png');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- lo conectado

test('la foto sumada llega al banco y a la web: el workflow la guarda y generar-datos la suma al banco', () => {
  const yml = leer('.github/workflows/panel.yml');
  assert.match(yml, /node web\/scripts\/foto-manual\.mjs "--id=\$NOTA"/);
  assert.match(yml, /if: inputs\.accion == 'foto'/);
  assert.match(yml, /if: inputs\.accion != 'foto'/, 'la IA no corre para una foto');
  const gen = leer('web/scripts/generar-datos.mjs');
  assert.match(gen, /fotos-manuales\.json/);
  assert.match(gen, /let bancoDeFotos = \{ \.\.\.leerJson\(BANCO_FOTOS, \{\}\), \.\.\.fotosManuales \};/);
  // Esa foto la escribe sólo "Panel del celular": "Actualizar la web" no la pisa.
  assert.ok(!/fotos-manuales/.test(leer('.github/workflows/actualizar.yml')), 'actualizar.yml no escribe fotos-manuales.json');
  assert.match(leer('web/public/panel/sw.js'), /\/panel\/fotos\.js/);
});

test('el panel tiene cinco pestañas de todos los días y lo demás vive en "Más"', () => {
  const app = leer('web/public/panel/app.js').split('\r\n').join('\n');
  const items = app.match(/const items = \[\n([\s\S]*?)\n  \];\n  const actual/)[1];
  assert.deepEqual([...items.matchAll(/\['(\w+)', '/g)].map((m) => m[1]), ['esperan', 'publicadas', 'fotos', 'redes', 'mas']);
  assert.match(leer('web/public/panel/index.html'), /repeat\(5, 1fr\)/);
  for (const [id, nombre] of [['pistas', 'Pistas'], ['revision', 'Revisión'], ['fechas', 'Fechas'], ['numeros', 'Números']]) assert.match(app, new RegExp(`\\['${id}', '${nombre}', `), nombre);
  assert.match(app, /EN_MAS\.has\(E\.pestana\)/);
});

test('Esperan trae las dos listas (a una persona y sin cuerpo), cada una con su porqué', () => {
  const app = leer('web/public/panel/app.js');
  assert.match(app, /Esperan a una persona \(\$\{sinDecidir\.length\}\)/);
  assert.match(app, /Salen solas, pero todavía no tienen cuerpo/);
  assert.match(app, /if \(E\.pestana === 'sin-cuerpo'\) E\.pestana = 'esperan';/);
  assert.match(app, /explicarMotivoSinCuerpo\(n\.motivo\)/);
  assert.match(app, /motivoCorto\(n\.motivo\)/);
});

test('Publicadas muestra las últimas 24 horas, lo más nuevo primero, y el buscador mira todo', () => {
  const app = leer('web/public/panel/app.js');
  assert.match(app, /const HORAS_EN_PUBLICADAS = 24;/);
  assert.match(app, /const base = q \|\| E\.publicadasTodas \? todas : ultimas;/);
  assert.match(app, /\.sort\(\(a, b\) => \(Date\.parse\(b\.fecha\) \|\| 0\) - \(Date\.parse\(a\.fecha\) \|\| 0\)\)/);
  assert.match(app, /data-accion="todas-las-publicadas"/);
});

test('la IA escribe en segundo plano: la lista marca el trabajo, se avisa al terminar y se vuelve al mismo lugar', () => {
  const app = leer('web/public/panel/app.js');
  assert.match(app, /E\.trabajos\[id\] = \{ clase: 'ia', estado: 'escribiendo'/);
  assert.match(app, /la IA la está escribiendo…/);
  assert.match(app, /borrador listo: abrila para revisarlo/);
  assert.match(app, /data-accion="ver-borrador" data-tipo=/, 'el aviso trae el botón para ver el borrador');
  assert.match(app, /silencioso: true/, 'publicar sola no traba la pantalla');
  assert.match(app, /E\.restaurar = E\.scrollLista \?\? null;/);
  assert.match(app, /E\.scrollLista = window\.scrollY; vistaNota/);
  assert.ok(!/async function pedirALaIA/.test(app), 'ya no hay una espera que trabe el panel');
});

test('sumar una foto desde el panel exige crédito, la confirmación de las reglas y pregunta antes', () => {
  const app = leer('web/public/panel/app.js');
  assert.match(app, /disparar\('panel\.yml', \{ accion: 'foto', id, pedido: url, credito:/);
  assert.match(app, /Tildá la confirmación: sin marca de otro medio y sin menores reconocibles/);
  assert.match(app, /titulo: '¿Sumar esta foto\?'/);
  assert.match(app, /ARCHIVOS\.banco/);
  assert.match(leer('web/public/panel/github.js'), /banco: 'web\/data\/banco-fotos\.json'/);
});

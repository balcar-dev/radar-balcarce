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
import { nombreDeFotoNueva } from '../web/scripts/achicar-foto.mjs';

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

test('la dirección de la foto: http o https de un sitio de verdad (muchos medios chicos siguen en http)', () => {
  for (const ok of ['https://balcarce.gob.ar/foto.jpg', 'https://upload.wikimedia.org/a/b.png?x=1', 'http://informesep.com.ar/nota/1']) assert.ok(urlDeFotoValida(ok), ok);
  for (const mal of ['ftp://balcarce.gob.ar/foto.jpg', 'javascript:alert(1)', 'https://localhost/a.jpg', 'https://127.0.0.1/a.jpg', 'https://10.0.0.1/a.jpg', 'https://usuario:clave@sitio.com/a.jpg', 'https://sitio/a.jpg', 'no es una dirección', '', null]) assert.ok(!urlDeFotoValida(mal), String(mal));
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

const JPG = Buffer.alloc(12000, 7);
const respuesta = (cuerpo, { estado = 200, tipo = 'image/jpeg' } = {}) => async () => ({ ok: estado < 400, status: estado, headers: { get: () => tipo }, arrayBuffer: async () => cuerpo });
const carpetaTemporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'radar-fm-'));

test('sumarFoto baja la imagen, la guarda con el id de la nota y la anota con su crédito', async () => {
  const dir = carpetaTemporal();
  try {
    const archivo = path.join(dir, 'manuales.json');
    const e = await sumarFoto({ id: 'abc123', url: 'https://balcarce.gob.ar/f.jpg', credito: 'Municipalidad de Balcarce', por: 'Hernán', ahora: new Date('2026-10-02T15:00:00Z') }, {
      fetchFn: respuesta(JPG), achicar: async () => Buffer.alloc(8000, 1), carpeta: path.join(dir, 'fotos'), archivo,
    });
    assert.equal(e.archivo, 'fotos-notas/abc123.jpg');
    assert.equal(e.credito, 'Foto: Municipalidad de Balcarce');
    assert.equal(e.origen, 'manual');
    assert.equal(fs.readFileSync(path.join(dir, 'fotos', 'abc123.jpg')).length, 8000, 'se guarda la achicada');
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
    await assert.rejects(sumarFoto(base, { ...opciones, fetchFn: respuesta(Buffer.from('<html>'), { tipo: 'text/html' }) }), /No encontré una foto en esa página/);
    await assert.rejects(sumarFoto(base, { ...opciones, fetchFn: respuesta(Buffer.from('algo'), { tipo: 'application/pdf' }) }), /no es una foto/);
    await assert.rejects(sumarFoto(base, { ...opciones, fetchFn: respuesta(JPG, { estado: 403 }) }), /contestó 403/);
    await assert.rejects(sumarFoto({ ...base, credito: '  ' }, { ...opciones, fetchFn: respuesta(JPG) }), /crédito/);
    await assert.rejects(sumarFoto({ ...base, url: 'ftp://sitio.com/a.jpg' }, { ...opciones, fetchFn: respuesta(JPG) }), /http o https/);
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
  assert.deepEqual([...items.matchAll(/\['(\w+)', '/g)].map((m) => m[1]), ['hoy', 'esperan', 'publicadas', 'redes', 'mas']);
  assert.match(leer('web/public/panel/index.html'), /repeat\(5, 1fr\)/);
  for (const [id, nombre] of [['fotos', 'Fotos'], ['pistas', 'Pistas'], ['revision', 'Revisión'], ['fechas', 'Fechas'], ['numeros', 'Números']]) assert.match(app, new RegExp(`\\['${id}', '${nombre}', `), nombre);
  assert.match(app, /EN_MAS\.has\(E\.pestana\)/);
});

test('Esperan es UNA sola lista: cada nota dice por qué no salió, qué falta y si va a tener foto', () => {
  const app = leer('web/public/panel/app.js');
  assert.ok(app.includes("...sinDecidir.map((n) => ({ n, tipo: 'pendiente' }))"));
  assert.ok(app.includes("...sinCuerpo.map((n) => ({ n, tipo: 'sin-cuerpo' }))"), 'una sola lista con las dos');
  assert.ok(!app.includes('Esperan a una persona (') && !app.includes('Salen solas, pero todavía no tienen cuerpo'), 'ya no hay dos secciones');
  assert.ok(app.includes("if (E.pestana === 'sin-cuerpo') E.pestana = 'esperan';"));
  for (const texto of ['Necesita tu OK', 'Falta el cuerpo', 'explicarMotivoSinCuerpo(n.motivo)', 'motivoCorto(n.motivo)', 'Hoy saldría sin foto']) assert.ok(app.includes(texto), texto);
  assert.ok(app.includes('fotoDeLaNota(n)'), 'la tarjeta dice si va a tener foto');
  assert.ok(app.includes('cajaDeFoto(n)'), 'y la nota que se revisa también');
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

// ---------------------------------------------------------------- un enlace de una página: la nube busca su foto

import { imagenDeLaPagina } from '../web/scripts/foto-manual.mjs';

test('la foto principal de una página sale de og:image, después twitter:image, después image_src', () => {
  const base = 'https://medio.com.ar/nota/algo';
  assert.equal(imagenDeLaPagina('<head><meta property="og:image" content="https://cdn.medio.com.ar/a.jpg"><meta name="twitter:image" content="https://cdn.medio.com.ar/b.jpg"></head>', base), 'https://cdn.medio.com.ar/a.jpg');
  assert.equal(imagenDeLaPagina('<meta name="twitter:image" content="/img/b.jpg?x=1&amp;y=2">', base), 'https://medio.com.ar/img/b.jpg?x=1&y=2', 'relativa y con &amp;');
  assert.equal(imagenDeLaPagina('<link rel="image_src" href="https://cdn.medio.com.ar/c.jpg">', base), 'https://cdn.medio.com.ar/c.jpg');
  assert.equal(imagenDeLaPagina('<meta content="https://cdn.medio.com.ar/d.jpg" property="og:image">', base), 'https://cdn.medio.com.ar/d.jpg', 'el orden de los atributos da igual');
  assert.equal(imagenDeLaPagina('<meta property="og:image" content="http://medio-chico.com/a.jpg">', base), 'http://medio-chico.com/a.jpg', 'muchos medios chicos siguen en http');
  assert.equal(imagenDeLaPagina('<meta property="og:image" content="http://localhost/a.jpg">', base), null, 'una dirección de adentro, nunca');
  assert.equal(imagenDeLaPagina('<html><body>nada</body></html>', base), null);
  assert.equal(imagenDeLaPagina('', base), null);
});

test('sumarFoto con el enlace de una página baja su foto principal y anota la página', async () => {
  const dir = carpetaTemporal();
  try {
    const html = '<meta property="og:image" content="https://cdn.medio.com.ar/foto.jpg">';
    const pedidos = [];
    const fetchFn = async (url) => {
      pedidos.push(url);
      return url.endsWith('foto.jpg') ? respuesta(JPG)() : { ok: true, status: 200, headers: { get: () => 'text/html; charset=utf-8' }, text: async () => html, arrayBuffer: async () => Buffer.from(html) };
    };
    const e = await sumarFoto({ id: 'abc123', url: 'https://medio.com.ar/nota/algo', credito: 'Medio', por: 'Hernán' }, { fetchFn, achicar: async () => null, carpeta: path.join(dir, 'f'), archivo: path.join(dir, 'm.json') });
    assert.deepEqual(pedidos, ['https://medio.com.ar/nota/algo', 'https://cdn.medio.com.ar/foto.jpg']);
    assert.equal(e.enlace, 'https://medio.com.ar/nota/algo');
    assert.equal(e.credito, 'Foto: Medio');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('la pantalla de resultado dice qué pasó, cuándo se ve y deja seguir con la siguiente nota', () => {
  const app = leer('web/public/panel/app.js');
  assert.ok(app.includes('function vistaResultado({ titulo, texto, conActualizar = true })'));
  assert.ok(app.includes('Siguiente nota (quedan ${sig.cuantas})'));
  assert.ok(app.includes('La decisión ya quedó guardada en GitHub'));
  assert.ok(app.includes("vistaResultado({ titulo: tituloDelResultado(listo), texto: listo });"), 'descartar, retirar y deshacer terminan ahí');
  assert.ok(app.includes("titulo: tipo === 'nota-pista' ? 'Nota publicada' : tipo === 'retirada' ? 'Vuelve a publicarse'"), 'publicar también');
  assert.ok(!app.includes("aviso(listo, { conActualizar: true });"), 'ya no se queda en la misma lista con un aviso que se va');
  assert.ok(app.includes('data-accion="foto-de-fuente"') || leer('web/public/panel/fotos.js').includes('data-accion=\\"foto-de-fuente\\"') || leer('web/public/panel/fotos.js').includes('data-accion="foto-de-fuente"'));
  assert.match(htmlDeUnaNotaSinFoto({ nota: { id: 'a1', titulo: 'T', seccion: 'Balcarce', fecha: '2026-10-02T10:00:00Z', fuentesConsultadas: [{ medio: 'Municipalidad', enlace: 'https://balcarce.gob.ar/a' }] }, motivo: 'otra', entrada: null }, apps), /Usar la foto de Municipalidad/);
});

// ---------------------------------------------------------------- subir una foto nuestra desde el celular (3/10)

test('subir una foto nuestra: se achica en el celular, se guarda en el repositorio y queda anotada sin fuente salvo que se escriba un crédito', () => {
  const app = leer('web/public/panel/app.js');
  assert.ok(app.includes('async function subirFotoPropia(id)'));
  assert.ok(app.includes('async function achicarEnElCelular(archivo'));
  assert.ok(app.includes("E.cliente.subirArchivo(`web/public/fotos-notas/${id}.jpg`, base64"));
  assert.ok(app.includes("credito: credito ? `Foto: ${credito}` : null"), 'sin crédito por defecto');
  assert.ok(app.includes("Tildá la confirmación: sin marca de otro medio y sin menores reconocibles."));
  assert.match(htmlDeUnaNotaSinFoto({ nota: { id: 'a1', titulo: 'T', seccion: 'Balcarce', fecha: '2026-10-02T10:00:00Z' }, motivo: 'otra', entrada: null }, apps), /type="file" id="f-archivo" accept="image\/\*"/);
  const gh = leer('web/public/panel/github.js');
  assert.match(gh, /async function subirArchivo\(ruta, base64, mensaje\)/);
  assert.match(gh, /fotosManuales: 'web\/data\/fotos-manuales\.json'/);
  assert.match(leer('web/scripts/generar-datos.mjs'), /fotos-manuales\.json/);
  assert.ok(Object.keys(JSON.parse(leer('web/data/fotos-manuales.json'))).length >= 0, 'el archivo existe');
});

test('la nota de una pista puede llevar una foto subida desde el celular; el dólar, los repasos, F1 y fútbol llevan la suya solos', () => {
  const notas = [
    { id: 'p', titulo: 'De una pista', fecha: '2026-10-03T10:00:00Z', propia: 'pista' },
    { id: 'f', titulo: 'F1', fecha: '2026-10-03T10:00:00Z', propia: 'f1' },
    { id: 'g', titulo: 'Fútbol', fecha: '2026-10-03T10:00:00Z', propia: 'futbol' },
    { id: 'd', titulo: 'Dólar', fecha: '2026-10-03T10:00:00Z', propia: 'dolar' },
  ];
  assert.deepEqual(notasSinFoto(notas, {}).map((x) => x.nota.id), ['p']);
  const gen = leer('web/scripts/generar-datos.mjs');
  assert.ok(gen.includes("n.propia === 'pista' && guardada?.archivo"), 'generar-datos le pone la foto subida');
});


// W-8 (8/10/2026): una foto que reemplaza a otra lleva un nombre nuevo, porque la vieja queda una semana en la caché.
test('una foto que reemplaza a otra se guarda con otro nombre (ID-2, ID-3…)', async () => {
  assert.equal(nombreDeFotoNueva('abc', []), 'abc');
  assert.equal(nombreDeFotoNueva('abc', ['abc.jpg']), 'abc-2');
  assert.equal(nombreDeFotoNueva('abc', ['fotos-notas/abc.jpg', 'abc-2.png']), 'abc-3');
  assert.equal(nombreDeFotoNueva('abc', ['abcd.jpg']), 'abc', 'otra nota con un nombre parecido no cuenta');
  const dir = carpetaTemporal();
  try {
    const archivo = path.join(dir, 'manuales.json');
    const pedido = { id: 'abc123', url: 'https://balcarce.gob.ar/f.jpg', credito: 'Municipalidad de Balcarce', por: 'Hernán' };
    const opciones = { fetchFn: respuesta(JPG), achicar: async () => Buffer.alloc(8000, 1), carpeta: path.join(dir, 'fotos'), archivo };
    assert.equal((await sumarFoto(pedido, opciones)).archivo, 'fotos-notas/abc123.jpg');
    assert.equal((await sumarFoto(pedido, opciones)).archivo, 'fotos-notas/abc123-2.jpg', 'la segunda no pisa a la primera');
    assert.equal((await sumarFoto(pedido, opciones)).archivo, 'fotos-notas/abc123-3.jpg');
    assert.equal(JSON.parse(fs.readFileSync(archivo, 'utf8')).abc123.archivo, 'fotos-notas/abc123-3.jpg', 'el libro apunta a la última');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

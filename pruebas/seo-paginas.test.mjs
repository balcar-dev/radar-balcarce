// Lo que ve un buscador de nuestras páginas: íconos, títulos, encabezados.
//
// El 24/09 se auditó el sitio publicado y no tenía ícono, la portada y las
// secciones no tenían un h1, las notas tenían títulos de más de 70 caracteres
// y las secciones compartían la misma descripción. Esto vigila que no vuelva.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { recortarEn } from '../web/lib/texto.js';
import {
  metadatosDePagina, autorDeNota, quienEscribio, OG_COMUN,
} from '../web/components/metadatos.js';

const RAIZ = path.join(import.meta.dirname, '..', 'web');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');

// ----------------------------------------------------- recortar títulos

test('un texto corto no se toca', () => {
  assert.equal(recortarEn('Un título corto', 60), 'Un título corto');
});

test('un texto largo se corta en una palabra entera y termina en puntos suspensivos', () => {
  const r = recortarEn('Ferroviarios se consagró campeón de básquet en una final apretadísima', 40);
  assert.ok(r.length <= 40, `mide ${r.length}`);
  assert.ok(r.endsWith('…'));
  assert.ok(!/\s…$/.test(r), 'dejó un espacio antes de los puntos');
  assert.ok('Ferroviarios se consagró campeón de básquet en una final apretadísima'.startsWith(r.slice(0, -1)), 'cortó por la mitad de una palabra');
});

test('no deja una coma ni un guion colgando antes de los puntos', () => {
  const r = recortarEn('Balcarce, la ciudad de Fangio, recibe a los pilotos - y a todo el país', 32);
  assert.ok(!/[,\-–—.;:]…$/.test(r), r);
});

test('espacios de sobra y saltos de línea se limpian', () => {
  assert.equal(recortarEn('  Una   nota\n con  espacios  ', 60), 'Una nota con espacios');
});

// ------------------------------------------------------------- íconos

test('están todos los íconos que piden los navegadores y los celulares', () => {
  for (const f of ['favicon.ico', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'manifest.webmanifest']) {
    assert.ok(fs.existsSync(path.join(RAIZ, 'public', f)), `falta web/public/${f}`);
  }
});

test('favicon.ico es un ícono de verdad, con varios tamaños', () => {
  const b = fs.readFileSync(path.join(RAIZ, 'public', 'favicon.ico'));
  assert.equal(b.readUInt16LE(0), 0, 'cabecera');
  assert.equal(b.readUInt16LE(2), 1, 'no es un .ico');
  assert.ok(b.readUInt16LE(4) >= 2, 'tiene un solo tamaño');
});

test('los PNG son cuadrados y del tamaño que dicen', () => {
  for (const [f, t] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
    const b = fs.readFileSync(path.join(RAIZ, 'public', f));
    assert.equal(b.subarray(1, 4).toString(), 'PNG');
    assert.equal(b.readUInt32BE(16), t, `${f}: ancho`);
    assert.equal(b.readUInt32BE(20), t, `${f}: alto`);
  }
});

test('el manifiesto apunta a íconos que existen', () => {
  const m = JSON.parse(leer('public/manifest.webmanifest'));
  assert.equal(m.name, 'Radar Balcarce');
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(RAIZ, 'public', i.src.replace(/^\//, ''))), i.src);
});

test('el layout declara los íconos y el manifiesto', () => {
  const l = leer('app/layout.js');
  for (const s of ['/favicon.ico', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/manifest.webmanifest']) {
    assert.ok(l.includes(s), `el layout no menciona ${s}`);
  }
});

// -------------------------------------------------- encabezados y títulos

test('la portada tiene un h1 y un título que dice qué es', () => {
  const p = leer('app/page.js');
  assert.match(p, /<h1 className="solo-lectores">/);
  assert.match(p, /absolute: 'Radar Balcarce · Noticias de Balcarce/);
});

test('cada página de sección tiene un h1 y su propia tarjeta para compartir', () => {
  assert.match(leer('app/seccion/[ranura]/page.js'), /<h1 style=\{\{ fontSize: 28 \}\}>/);
  assert.ok(fs.existsSync(path.join(RAIZ, 'app/seccion/[ranura]/opengraph-image.js')));
});

test('la descripción de una sección nombra las últimas notas: no es igual para todas', () => {
  const s = leer('app/seccion/[ranura]/page.js');
  assert.match(s, /ultimas/);
  assert.ok(!s.includes('Todo lo que publicamos en ${nombreCorto(s.nombre)}, en Radar Balcarce.'));
});

test('los títulos y descripciones de las notas se recortan al largo que muestra Google', () => {
  const n = leer('app/nota/[id]/page.js');
  assert.match(n, /title: recortarEn\(n\.titulo, \d+\)/);
  assert.match(n, /recortarEn\(n\.copete[^)]*, 155\)/);
});

test('las analíticas de Vercel ya no están: en Cloudflare pedían un archivo que no existe', () => {
  assert.ok(!leer('app/layout.js').includes('@vercel/analytics'));
  assert.ok(!leer('package.json').includes('@vercel/analytics'));
});

// ------------------------------------------------ auditoría del 25/09
//
// Lo que encontró la auditoría del 25/09 sobre el sitio publicado: páginas
// con el canónico de la portada, textos que prometían una revisión humana
// que no hubo, la tarjeta para compartir servida como un archivo cualquiera,
// sin páginas de "quiénes somos" ni de contacto, y detalles de accesibilidad.

/** Todos los archivos de una carpeta de web/, con su camino relativo. */
function archivos(carpeta) {
  const salida = [];
  const recorrer = (rel) => {
    for (const e of fs.readdirSync(path.join(RAIZ, rel), { withFileTypes: true })) {
      const r = path.join(rel, e.name);
      if (e.isDirectory()) recorrer(r);
      else salida.push(r.split(path.sep).join('/'));
    }
  };
  recorrer(carpeta);
  return salida;
}

test('el layout no le pone el canónico de la portada a todo el sitio', () => {
  const l = leer('app/layout.js');
  assert.ok(!/canonical\s*:/.test(l), 'el layout declara un canonical: lo heredan todas las páginas que no declaran el suyo');
  assert.ok(!/url:\s*'\/'/.test(l), 'el layout pone og:url = portada para todo el sitio');
});

test('cada página declara su propio canónico, y sólo la portada es "/"', () => {
  const paginas = archivos('app').filter((f) => f.endsWith('/page.js'));
  assert.ok(paginas.length >= 8, `encontré ${paginas.length} páginas`);
  for (const p of paginas) {
    const t = leer(p);
    const declara = /canonical\s*:/.test(t) || /metadatosDePagina\(/.test(t);
    assert.ok(declara, `${p} no declara canónico: heredaría el del layout`);
    const esPortada = /camino:\s*'\/'/.test(t) || /canonical:\s*'\/'/.test(t);
    if (p === 'app/page.js') assert.ok(esPortada, 'la portada tiene que tener canónico "/"');
    else assert.ok(!esPortada, `${p} tiene el canónico de la portada`);
  }
});

test('metadatosDePagina: canónico, og:url, tarjeta, nombre del sitio e idioma', () => {
  const m = metadatosDePagina({ titulo: 'Farmacias de turno', descripcion: 'x', camino: '/farmacias' });
  assert.equal(m.alternates.canonical, '/farmacias');
  assert.equal(m.openGraph.url, '/farmacias');
  assert.equal(m.openGraph.siteName, 'Radar Balcarce');
  assert.equal(m.openGraph.locale, 'es_AR');
  assert.equal(m.openGraph.images[0].url, '/opengraph-image');
  assert.equal(m.title, 'Farmacias de turno');
  assert.throws(() => metadatosDePagina({ titulo: 'x', descripcion: 'x', camino: 'farmacias' }));
});

test('las secciones y los temas no pierden el nombre del sitio ni el idioma al compartir', () => {
  assert.deepEqual(OG_COMUN, { siteName: 'Radar Balcarce', locale: 'es_AR' });
  for (const p of ['app/seccion/[ranura]/page.js', 'app/tema/[ranura]/page.js']) {
    assert.match(leer(p), /openGraph: \{ \.\.\.OG_COMUN,/, p);
  }
});

test('ningún título repite la marca: la plantilla del layout ya la agrega', () => {
  for (const p of archivos('app').filter((f) => f.endsWith('page.js'))) {
    const sinAbsolutos = leer(p).replace(/absolute:[^}]*/g, '');
    assert.ok(!/(title|titulo):\s*'[^']*· Radar Balcarce'/.test(sinAbsolutos), `${p} pone "· Radar Balcarce" en el título`);
  }
});

// ------------------------------------------------ lo que decimos de la IA

test('no volvemos a prometer una revisión humana que no hay', () => {
  const textos = [...archivos('app'), ...archivos('components')].filter((f) => /\.(js|mjs|jsx)$/.test(f));
  for (const f of textos) {
    const t = leer(f);
    assert.ok(!/siempre con revisi[oó]n humana/i.test(t), `${f} dice "siempre con revisión humana"`);
    assert.ok(!/con revisi[oó]n humana/i.test(t), `${f} dice "con revisión humana"`);
    assert.ok(!/resumen autom[aá]tico con revisi[oó]n/i.test(t), `${f} dice "resumen automático con revisión"`);
  }
  const perfiles = fs.readFileSync(path.join(RAIZ, '..', 'PERFILES.md'), 'utf8');
  assert.ok(!/revisi[oó]n humana/i.test(perfiles), 'PERFILES.md promete revisión humana en las biografías');
});

test('el autor de los datos estructurados dice lo mismo que la firma de la nota', () => {
  const auto = autorDeNota({ guion: 'x', como: 'automatica', medios: ['La Vanguardia'] }, 'https://radarbalcarce.com');
  assert.match(auto.name, /IA/);
  assert.match(auto.name, /verificado automáticamente contra la fuente/);
  assert.ok(!/revis/i.test(auto.name), `una nota automática dice que fue revisada: ${auto.name}`);

  const revisada = autorDeNota({ guion: 'x', como: 'publicada' }, 'https://radarbalcarce.com');
  assert.match(revisada.name, /revisado por una persona/);

  // El resumen es el de la fuente: el autor es ese medio.
  assert.equal(autorDeNota({ guion: null, como: 'automatica', medios: ['El Diario Balcarce'] }).name, 'El Diario Balcarce');
  assert.equal(autorDeNota({ guion: null, como: 'automatica', medios: [] }).name, 'Radar Balcarce');

  assert.deepEqual(quienEscribio({ guion: 'x', como: 'publicada' }), { reescrita: true, revisada: true });
  assert.deepEqual(quienEscribio({ guion: null, como: 'automatica' }), { reescrita: false, revisada: false });

  assert.match(leer('components/ficha.js'), /author: autorDeNota\(nota, base\)/);
  assert.match(leer('components/piezas.js'), /quienEscribio\(nota\)/);
});

// ------------------------------------------------ encabezados de Cloudflare

test('_headers: la tarjeta para compartir sale como imagen, y los encabezados de seguridad y caché', () => {
  const h = leer('public/_headers');
  const reglas = {};
  let actual = null;
  for (const linea of h.split(/\r?\n/)) {
    if (!linea.trim() || linea.trim().startsWith('#')) continue;
    if (!/^\s/.test(linea)) { actual = linea.trim(); reglas[actual] = {}; continue; }
    const [k, ...v] = linea.trim().split(':');
    reglas[actual][k.trim().toLowerCase()] = v.join(':').trim();
  }

  // Todas las tarjetas que genera la app (opengraph-image.js o
  // twitter-image.js en cualquier carpeta), como las ve Cloudflare.
  const tarjetas = archivos('app')
    .filter((f) => /(^|\/)(opengraph|twitter)-image\.js$/.test(f))
    .map((f) => f.replace(/^app/, '').replace(/\.js$/, '').replace(/\[[^\]]+\]/g, '*'));
  assert.ok(tarjetas.includes('/opengraph-image'));
  assert.ok(tarjetas.includes('/nota/*/opengraph-image'));
  for (const t of tarjetas) {
    assert.equal(reglas[t]?.['content-type'], 'image/png', `${t} no tiene Content-Type: image/png`);
  }

  const todo = reglas['/*'];
  assert.ok(todo, 'falta la regla /*');
  assert.match(todo['strict-transport-security'], /max-age=31536000/);
  assert.equal(todo['x-content-type-options'], 'nosniff');
  assert.equal(todo['x-frame-options'], 'SAMEORIGIN');
  assert.equal(todo['referrer-policy'], 'strict-origin-when-cross-origin');
  for (const p of ['camera=()', 'microphone=()', 'geolocation=()']) assert.ok(todo['permissions-policy'].includes(p), p);
  // Una CSP estricta rompería el beacon de Cloudflare y el JSON-LD en línea.
  if (todo['content-security-policy']) assert.equal(todo['content-security-policy'], "frame-ancestors 'self'");

  assert.equal(reglas['/_next/static/*']?.['cache-control'], 'public, max-age=31536000, immutable');
});

test('el sitio se exporta como archivos estáticos, así _headers llega a lo publicado', () => {
  assert.match(leer('next.config.mjs'), /output: 'export'/);
});

// ------------------------------------------------ páginas de confianza

test('están "Quiénes somos" y "Contacto", con h1, enlazadas desde el pie y en el sitemap', () => {
  const l = leer('app/layout.js');
  const s = leer('app/sitemap.js');
  for (const camino of ['/quienes-somos', '/contacto']) {
    const p = leer(`app${camino}/page.js`);
    assert.match(p, /<h1/, `${camino} no tiene h1`);
    assert.ok(p.includes(`camino: '${camino}'`), `${camino} no declara su canónico`);
    assert.ok(l.includes(`href="${camino}"`), `el pie no enlaza a ${camino}`);
    assert.ok(s.includes(`\${base}${camino}`), `el sitemap no incluye ${camino}`);
  }
  // El contacto usa el correo y el WhatsApp que ya publica el sitio.
  assert.match(leer('app/contacto/page.js'), /MAIL/);
});

// ------------------------------------------------ detalles

test('el idioma es castellano de Argentina y el medio tiene logo', () => {
  assert.match(leer('app/layout.js'), /<html lang="es-AR">/);
  assert.match(leer('app/layout.js'), /locale: 'es_AR'/);
  const f = leer('components/ficha.js');
  assert.match(f, /logo: \{/);
  assert.match(f, /icon-512\.png/);
});

test('el campo del buscador tiene un nombre para los lectores de pantalla', () => {
  const campo = leer('components/buscador.js').match(/<input[\s\S]*?\/>/)?.[0] ?? '';
  assert.match(campo, /aria-label="[^"]+"/);
});

test('las etiquetas de sección se leen: blanco sobre el color de la sección, al menos 4,5:1', () => {
  const css = leer('app/globals.css');
  const colores = [...css.matchAll(/--s-([a-z]+):\s*(#[0-9A-Fa-f]{6})/g)];
  assert.ok(colores.length >= 10, `encontré ${colores.length} colores de sección`);
  const lum = (h) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  for (const [, nombre, color] of colores) {
    const contraste = 1.05 / (lum(color) + 0.05);
    assert.ok(contraste >= 4.5, `--s-${nombre} (${color}) da ${contraste.toFixed(2)}:1 con blanco`);
  }
});

test('el sitemap de noticias deja afuera las notas sin fecha real', () => {
  // Cuando la fuente no da hora, `fecha` es la primera vez que la vimos: el
  // 25/09 diecinueve notas salían con la misma hora de relleno.
  assert.match(leer('app/sitemap-news.xml/route.js'), /\.filter\(\(n\) => !n\.sinFecha/);
});

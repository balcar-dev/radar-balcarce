// Revisa que el sitio compilado siga teniendo lo que necesita para que
// Google lo entienda y WhatsApp lo muestre.
//
//   node scripts/revisar-seo.mjs
//
// Corre en GitHub Actions después de compilar y antes de publicar. El motivo
// es concreto: nada de esto se ve mirando la página. Alguien toca layout.js
// dentro de seis meses, se lleva puesto el Open Graph, el sitio sigue
// viéndose perfecto, y nos enteramos cuando alguien comparte una nota y
// llega pelada.
//
// Si falla, el workflow no commitea y la web se queda como está.

import fs from 'node:fs';
import path from 'node:path';
import { parteDeNota } from '../lib/ruta.js';

const SALIDA = path.join(process.cwd(), '.next', 'server', 'app');
const fallas = [];

function leer(relativo) {
  try { return fs.readFileSync(path.join(SALIDA, relativo), 'utf8'); } catch { return null; }
}

/** Exige que el HTML tenga cada una de esas cosas. */
function exigir(donde, html, cosas) {
  if (html === null) { fallas.push(`${donde}: no se generó`); return; }
  for (const [que, aguja] of Object.entries(cosas)) {
    if (!html.includes(aguja)) fallas.push(`${donde}: falta ${que}`);
  }
}

// --- La portada -------------------------------------------------------
exigir('la portada', leer('index.html'), {
  'el título': '<title>',
  'la descripción': 'name="description"',
  'el enlace canónico': 'rel="canonical"',
  'og:title': 'property="og:title"',
  'og:image': 'property="og:image"',
  'la tarjeta de Twitter': 'name="twitter:card"',
  'la ficha del medio': 'NewsMediaOrganization',
});

// --- Una nota cualquiera, la primera que haya --------------------------
const datos = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'portada.json'), 'utf8'));
const primera = datos.notas?.[0];

if (!primera) {
  fallas.push('no hay ninguna nota publicada para revisar');
} else {
  const html = leer(path.join('nota', `${parteDeNota(primera)}.html`));
  exigir(`la nota ${primera.id}`, html, {
    'el enlace canónico': 'rel="canonical"',
    'og:title': 'property="og:title"',
    'og:image': 'property="og:image"',
    'og:type article': 'content="article"',
    'la fecha de publicación': 'property="article:published_time"',
    'la ficha NewsArticle': '"@type":"NewsArticle"',
    'el camino de migas': 'BreadcrumbList',
  });

  // La imagen para compartir tiene que existir de verdad, no sólo estar
  // declarada: una etiqueta og:image que apunta a un 404 es peor que nada.
  const imagen = path.join(SALIDA, 'nota', parteDeNota(primera), 'opengraph-image.body');
  if (!fs.existsSync(imagen)) {
    fallas.push(`la nota ${primera.id}: og:image declarada pero la imagen no se generó`);
  } else if (fs.statSync(imagen).size < 4000) {
    fallas.push(`la nota ${primera.id}: la imagen salió vacía o rota`);
  }
}

// La imagen de CADA nota (29/09): hasta esa fecha 7 de cada 10 notas declaraban
// una tarjeta que nunca se generó y compartían un 404 en Facebook y WhatsApp.
// Se controla la que declara cada página, no sólo la de la primera nota.
{
  const carpeta = path.join(SALIDA, 'nota');
  const paginas = fs.existsSync(carpeta) ? fs.readdirSync(carpeta).filter((f) => f.endsWith('.html')) : [];
  const sinImagen = [];
  for (const f of paginas) {
    const html = fs.readFileSync(path.join(carpeta, f), 'utf8');
    const declarada = html.match(/property="og:image" content="([^"]+)"/)?.[1];
    if (!declarada) { sinImagen.push(`${f}: sin og:image`); continue; }
    let ruta;
    try { ruta = new URL(declarada).pathname; } catch { sinImagen.push(`${f}: og:image inválida (${declarada})`); continue; }
    const archivo = path.join(SALIDA, `${ruta.replace(/^\//, '')}.body`);
    if (!fs.existsSync(archivo)) sinImagen.push(`${f}: declara ${ruta} pero no existe`);
    else if (fs.statSync(archivo).size < 4000) sinImagen.push(`${f}: la imagen ${ruta} salió vacía o rota`);
  }
  if (sinImagen.length) {
    fallas.push(`${sinImagen.length} de ${paginas.length} notas con la imagen para compartir rota; por ejemplo ${sinImagen.slice(0, 3).join(' | ')}`);
  }
}

// --- El sitemap y el robots -------------------------------------------
const sitemap = leer('sitemap.xml.body');
if (!sitemap) fallas.push('el sitemap: no se generó');
else {
  const cuantas = (sitemap.match(/<url>/g) ?? []).length;
  if (cuantas < datos.notas.length) {
    fallas.push(`el sitemap: ${cuantas} direcciones para ${datos.notas.length} notas`);
  }
}

const robots = leer('robots.txt.body');
if (!robots) fallas.push('el robots: no se generó');
else if (!robots.includes('/sitemap.xml')) fallas.push('el robots: no apunta al sitemap');

// ----------------------------------------------------------------------
if (fallas.length) {
  console.error('\nEl SEO se rompió:\n');
  fallas.forEach((f) => console.error(`  · ${f}`));
  console.error('\nNo se publica. La web se queda como está.\n');
  process.exit(1);
}

console.log(`SEO en pie · ${datos.notas.length} notas, ${(sitemap.match(/<url>/g) ?? []).length} direcciones en el sitemap`);

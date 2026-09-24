// Audita el SEO de las páginas REALES, ya publicadas.
//
//   node web/scripts/auditar-seo-vivo.mjs [https://radarbalcarce.com] [--todas]
//
// Baja el sitemap y revisa cada página como la ve un buscador: título,
// descripción, enlace canónico, robots, un solo h1, datos estructurados,
// imagen para compartir, idioma e imágenes sin texto alternativo. Complementa
// a revisar-seo.mjs, que corre al compilar; éste corre contra lo publicado.
// Sin dependencias.

const BASE = (process.argv.find((a) => a.startsWith('http')) ?? 'https://radarbalcarce.com').replace(/\/$/, '');
const TODAS = process.argv.includes('--todas');

const texto = async (url) => {
  const r = await fetch(url, { headers: { 'user-agent': 'auditor-seo' } });
  return { status: r.status, cuerpo: await r.text(), cabeceras: r.headers };
};

const unico = (html, re) => (html.match(re) ?? [])[1]?.trim();

function revisar(url, html) {
  const p = [];
  const titulo = unico(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const desc = unico(html, /<meta name="description" content="([^"]*)"/i);
  const canonico = unico(html, /<link rel="canonical" href="([^"]*)"/i);
  const robots = unico(html, /<meta name="robots" content="([^"]*)"/i) ?? '';
  const h1 = (html.match(/<h1[\s>]/gi) ?? []).length;
  const ogImg = unico(html, /<meta property="og:image" content="([^"]*)"/i);
  const ldjson = (html.match(/application\/ld\+json/g) ?? []).length;
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const sinAlt = imgs.filter((i) => !/\balt=/.test(i)).length;

  if (!titulo) p.push('sin <title>');
  else if (titulo.length > 70) p.push(`título largo (${titulo.length})`);
  else if (titulo.length < 15) p.push(`título corto (${titulo.length})`);
  if (!desc) p.push('sin meta description');
  else if (desc.length > 170) p.push(`descripción larga (${desc.length})`);
  else if (desc.length < 50) p.push(`descripción corta (${desc.length})`);
  if (!canonico) p.push('sin canonical');
  else if (!canonico.startsWith(BASE) && !canonico.startsWith('https://radarbalcarce.com')) p.push(`canonical de otro dominio: ${canonico}`);
  if (/noindex/i.test(robots)) p.push('NOINDEX');
  if (h1 !== 1) p.push(`${h1} h1`);
  if (!ogImg) p.push('sin imagen para compartir');
  if (!/<html[^>]*lang="es/i.test(html)) p.push('sin lang="es"');
  if (!/<meta name="viewport"/i.test(html)) p.push('sin viewport');
  if (!/rel="icon"/i.test(html)) p.push('sin ícono');
  if (sinAlt) p.push(`${sinAlt} imagen(es) sin alt`);
  if (!ldjson) p.push('sin datos estructurados');
  return { titulo, desc, p };
}

const mapa = await texto(`${BASE}/sitemap.xml`);
if (mapa.status !== 200) { console.error(`sitemap.xml devolvió ${mapa.status}`); process.exit(1); }
// El sitemap trae direcciones absolutas del dominio real; se apuntan a la base
// que se pidió, para poder auditar también una copia local.
let urls = [...mapa.cuerpo.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, BASE));
const total = urls.length;
if (!TODAS) {
  // Todo lo que no es una nota, y una muestra de notas.
  const notas = urls.filter((u) => u.includes('/nota/'));
  urls = [...urls.filter((u) => !u.includes('/nota/')), ...notas.slice(0, 15)];
}

const problemas = {};
const titulos = new Map();
const descripciones = new Map();
for (const u of urls) {
  try {
    const { status, cuerpo } = await texto(u);
    if (status !== 200) { problemas[u] = [`HTTP ${status}`]; continue; }
    const r = revisar(u, cuerpo);
    if (r.p.length) problemas[u] = r.p;
    if (r.titulo) titulos.set(r.titulo, [...(titulos.get(r.titulo) ?? []), u]);
    if (r.desc) descripciones.set(r.desc, [...(descripciones.get(r.desc) ?? []), u]);
  } catch (e) {
    problemas[u] = [`no abrió: ${e.message}`];
  }
}
for (const [t, us] of titulos) if (us.length > 1) for (const u of us) (problemas[u] ??= []).push(`título repetido: "${t.slice(0, 40)}"`);
for (const [d, us] of descripciones) if (us.length > 1 && us.length < 6) for (const u of us) (problemas[u] ??= []).push('descripción repetida');

// lo que un buscador pide aparte
const extra = [];
for (const ruta of ['/robots.txt', '/sitemap-news.xml', '/feed.xml', '/llms.txt', '/favicon.ico', '/manifest.webmanifest']) {
  const { status } = await texto(`${BASE}${ruta}`);
  if (status !== 200) extra.push(`${ruta} → ${status}`);
}
const www = await fetch(BASE.replace('://', '://www.'), { redirect: 'manual' }).catch(() => null);
if (www && www.status === 200) extra.push('www responde 200: debería redirigir al dominio sin www');

console.log(`\n  ${urls.length} páginas revisadas de ${total} en el sitemap (${BASE})\n`);
const malas = Object.entries(problemas);
if (!malas.length && !extra.length) console.log('  Todo en orden.\n');
for (const [u, p] of malas) console.log(`  ${u.replace(BASE, '') || '/'}\n      ${p.join(' · ')}`);
if (extra.length) console.log(`\n  Aparte: ${extra.join(' · ')}`);
console.log('');
process.exit(malas.length || extra.length ? 1 : 0);

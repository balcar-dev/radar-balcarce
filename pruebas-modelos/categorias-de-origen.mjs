// Cómo llaman los propios diarios a las categorías de sus notas, SIN sacar duplicadas.
//   node pruebas-modelos/categorias-de-origen.mjs
// Sólo lee los feeds. Para cada nota junta tres pistas del diario de origen:
//   1. etiquetas del propio feed (<category>), limpiando palabras sueltas como "de", "la"…
//   2. la sección del feed: la que el diario le pone a ese feed ("deportes", "politica"…)
//   3. la sección que el diario pone en la dirección web (/politica/…), si habla de un tema
// Informe: categorias-de-origen.md. Se calcula para las 200 notas de la muestra y para todas las notas de hoy.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { traer, parsearFeed } from '../ingesta/ingesta.mjs';
import { FUENTES, FUENTES_NACIONALES } from '../ingesta/fuentes.mjs';
import { FUENTES_CRUCE } from '../ingesta/fuentes-cruce.mjs';

const AQUI = import.meta.dirname;
const idDe = (url) => createHash('sha1').update(url).digest('hex').slice(0, 8);
const sinTildes = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (s) => sinTildes(String(s)).toLowerCase().replace(/[-_+]+/g, ' ').replace(/\s+/g, ' ').trim();

const PARADAS = new Set('de la el en a y un una que del los las por con para su se al mas es lo como pero sus le ya o fue ha son muy sin sobre este esta entre tras desde hasta'.split(' '));
// Direcciones que no dicen un tema (números, plantillas del sitio).
const NO_TEMA = /^(\d+|nota|notas|noticia|noticias|index|index php|articulo|articulos|blog|diario|post|ver|detalle|n|p|amp|\d{4}|wp content|category|tag|tema|temas|ar|es|home|portada|ultimas noticias|ultimo momento|actualidad)$/;

const fuentes = [...FUENTES, ...FUENTES_NACIONALES, ...FUENTES_CRUCE].filter((f) => f.activa !== false && ['rss', 'atom'].includes(f.tipo));
console.log(`Leyendo ${fuentes.length} feeds…`);

/** La sección del feed según su nombre o su dirección ("TN · politica", /category/deportes/, /rss/economia). */
function categoriaDelFeed(f) {
  // Ojo: f.seccion es la que NOSOTROS le pusimos al feed (no es del diario) y no se cuenta. Sólo vale lo que dice el diario en el
  // nombre del feed o en su dirección.
  const delNombre = String(f.nombre ?? '').split('·')[1];
  if (delNombre) return norm(delNombre);
  const m = String(f.url).match(/\/(?:category|categoria|seccion|secciones|rss|feed)\/([a-z0-9-]+)/i) ?? String(f.url).match(/[?&](?:cat|category|seccion)=([a-z0-9-]+)/i);
  return m ? norm(m[1]) : null;
}
const limpiarEtiqueta = (c) => {
  const n = norm(c);
  if (!n || n.length < 3 || n.length > 40 || PARADAS.has(n) || /^\d+$/.test(n)) return null;
  return n;
};
function seccionDeLaUrl(enlace) {
  try {
    const partes = new URL(enlace).pathname.split('/').filter(Boolean).map(norm);
    return partes.slice(0, 2).find((p) => p && !NO_TEMA.test(p) && !/^\d/.test(p) && p.split(' ').length <= 3 && p.length <= 22) ?? null;
  } catch { return null; }
}

const pool = new Map();
async function una(f) {
  try {
    const items = parsearFeed(await traer(f.url, { timeout: 15000 }), { ...f, peso: f.peso ?? 10 });
    const delFeed = categoriaDelFeed(f);
    for (const n of items) {
      if (!n.enlace) continue;
      const etiquetas = [...new Set((n.categorias ?? []).map(limpiarEtiqueta).filter(Boolean))];
      const previa = pool.get(n.enlace);
      pool.set(n.enlace, {
        id: idDe(n.enlace), medio: f.medio, enlace: n.enlace, titulo: n.titulo,
        etiquetas: previa ? [...new Set([...previa.etiquetas, ...etiquetas])] : etiquetas,
        delFeed: previa?.delFeed ?? delFeed, deLaUrl: seccionDeLaUrl(n.enlace),
      });
    }
  } catch { /* un feed caído no frena nada */ }
}
const cola = [...fuentes];
await Promise.all(Array.from({ length: 8 }, async () => { while (cola.length) await una(cola.shift()); }));
console.log(`${pool.size} notas distintas leídas.`);

// ---- la muestra de 200 (con la sección que le puso el modelo, sólo para comparar)
const muestra = JSON.parse(fs.readFileSync(path.join(AQUI, 'muestra-200.json'), 'utf8')).notas;
const mercury = JSON.parse(fs.readFileSync(path.join(AQUI, 'resultados-inception_mercury-decide_free--200.json'), 'utf8')).notas;
const enMuestra = muestra.map((n) => {
  const p = pool.get(n.enlace);
  return {
    id: n.id, medio: n.medio, titulo: n.titulo, seccionIA: mercury[n.id]?.respuesta?.seccion ?? null,
    etiquetas: p?.etiquetas ?? [], delFeed: p?.delFeed ?? null, deLaUrl: p?.deLaUrl ?? seccionDeLaUrl(n.enlace), enFeedHoy: !!p,
  };
});

// ---- agrupar etiquetas parecidas en "familias" (a mano, para ver cuántas secciones salen)
const FAMILIAS = [
  ['Política', /politic|gobierno|elecciones|congreso|senado|diputados|legislat|justicia|oficialismo|oposicion|casa rosada|gabinete|municipal|concejo|intendente|decreto/],
  ['Economía', /econom|finanza|negocio|mercado|dolar|inflacion|empleo|trabajo|empresa|combustible|impuesto|previsional|jubilacion|banco|bolsa|campo y|comercio|inversion|salario|cripto/],
  ['Fútbol', /futbol|liga profesional|torneo|clausura|apertura|copa libertadores|copa argentina|seleccion|boca|river|racing|independiente|mundial|ascenso/],
  ['Deportes', /deporte|rugby|tenis|basquet|hockey|voley|atletismo|boxeo|ufc|golf|ciclismo|natacion|padel|paleta|nba|olimpic|esport|maraton/],
  ['Automovilismo', /automovil|motor|formula|f1|motogp|tc |turismo carretera|rally|karting|autos|autodromo|pista|circuit|nascar|indycar/],
  ['Policiales', /policial|crimen|seguridad|delito|justicia penal|policia|robo|homicid|accidente|incendio|bomberos/],
  ['Mundo', /mundo|internacional|global|exterior|america|europa|asia|eeuu|estados unidos|china|rusia|ucrania|israel|gaza|espana|brasil|latinoamerica|business|world|global affairs/],
  ['Sociedad', /sociedad|comunidad|vecinos|actualidad|general|gente|historias|vida|familia|genero|social|religion|iglesia/],
  ['Cultura y espectáculos', /cultura|espectaculo|entretenimiento|cine|musica|teatro|tv|television|series|streaming|famosos|show|farandula|libros|arte|recital|festival|gastronomia|turismo|viajes|horoscopo|loteria/],
  ['Tecnología', /tecnolog|tecno|digital|celular|internet|ia |inteligencia artificial|ciberseguridad|apps|gaming|videojuego|innovacion|software|robot|redes sociales/],
  ['Ciencia y ambiente', /ciencia|ambiente|clima|medio ambiente|naturaleza|espacio|astronom|nasa|biolog|energia|sustentab|ecolog|meteorolog|tiempo/],
  ['Salud', /salud|medicina|bienestar|hospital|nutricion|enfermedad|vacuna|covid/],
  ['Educación', /educacion|escuela|universidad|docente|colegio|alumnos|estudiantes|educ/],
  ['Agro', /agro|campo|ganaderia|cosecha|siembra|soja|trigo|papa|cereales|granos|rural|inta/],
  ['Opinión y notas propias', /opinion|editorial|columna|blog|propia|nota propia|analisis|entrevista|cartas/],
];
function familiaDe(etiqueta) {
  for (const [nombre, re] of FAMILIAS) if (re.test(`${etiqueta} `)) return nombre;
  return null;
}

const contar = (xs) => { const m = new Map(); xs.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]); };
const todas = (n) => [...new Set([...n.etiquetas.map((e) => `etiqueta:${e}`), ...(n.delFeed ? [`feed:${n.delFeed}`] : []), ...(n.deLaUrl ? [`url:${n.deLaUrl}`] : [])])];

function informe(titulo, notas, conIA) {
  const L = [`## ${titulo}\n`];
  const conAlgo = notas.filter((n) => todas(n).length).length;
  const conEtiqueta = notas.filter((n) => n.etiquetas.length).length;
  const conFeed = notas.filter((n) => n.delFeed).length;
  const conUrl = notas.filter((n) => n.deLaUrl).length;
  L.push(`- Notas: **${notas.length}** (sin sacar duplicadas). Con alguna categoría del diario: **${conAlgo}** (${Math.round((100 * conAlgo) / notas.length)}%).`);
  L.push(`- Por tipo de pista: etiquetas propias del feed ${conEtiqueta} · sección del feed ${conFeed} · sección en la dirección web ${conUrl}.`);

  // todas las categorías distintas, sin juntar
  const crudas = contar(notas.flatMap((n) => [...new Set(todas(n).map((x) => x.split(':').slice(1).join(':')))]));
  const acumulado = (k) => crudas.slice(0, k).reduce((s, [, c]) => s + c, 0);
  L.push(`- **Categorías distintas tal como las escriben los diarios: ${crudas.length}.** Las ${Math.min(20, crudas.length)} más comunes aparecen en ${acumulado(20)} de las menciones; las 40 más comunes, en ${acumulado(40)}.`);
  L.push('');
  L.push(`Las 40 categorías más comunes (con ${conIA ? 'la sección que les puso Mercury' : 'su familia'}):\n`);
  L.push(conIA ? '| Categoría del diario | Notas | Mercury la manda sobre todo a | Coincidencia |' : '| Categoría del diario | Notas | Familia |');
  L.push(conIA ? '|---|---|---|---|' : '|---|---|---|');
  for (const [cat, n] of crudas.slice(0, 40)) {
    if (conIA) {
      const sec = contar(notas.filter((x) => todas(x).some((t) => t.endsWith(`:${cat}`))).map((x) => x.seccionIA ?? '—'));
      L.push(`| ${cat} | ${n} | ${sec[0]?.[0] ?? '—'} | ${Math.round((100 * (sec[0]?.[1] ?? 0)) / n)}% |`);
    } else L.push(`| ${cat} | ${n} | ${familiaDe(cat) ?? '—'} |`);
  }

  // familias: cuántas "secciones" salen si se agrupan etiquetas parecidas
  const porFamilia = new Map();
  const sinFamilia = new Map();
  for (const [cat, n] of crudas) {
    const f = familiaDe(cat);
    if (f) porFamilia.set(f, (porFamilia.get(f) ?? 0) + n); else sinFamilia.set(cat, n);
  }
  L.push(`\n**Si se juntan las etiquetas parecidas salen ${porFamilia.size} familias** (a mano, con palabras clave):\n`);
  L.push('| Familia | Menciones |');
  L.push('|---|---|');
  for (const [f, n] of [...porFamilia].sort((a, b) => b[1] - a[1])) L.push(`| ${f} | ${n} |`);
  const sinN = [...sinFamilia.values()].reduce((s, x) => s + x, 0);
  L.push(`\nQuedan **${sinFamilia.size} etiquetas sin familia** (${sinN} menciones), por ejemplo: ${[...sinFamilia].slice(0, 25).map(([c, n]) => `${c} (${n})`).join(', ')}.\n`);
  return L;
}

// ---- qué secciones usa cada medio (las que se leen de su feed o de su dirección web)
function porMedio(notas) {
  const L = ['\n### Qué secciones usa cada medio (sus propias palabras)\n', '| Medio | Notas | Con categoría propia | Sus secciones más comunes |', '|---|---|---|---|'];
  const medios = contar(notas.map((n) => n.medio));
  for (const [medio, cuantas] of medios.slice(0, 40)) {
    const ns = notas.filter((n) => n.medio === medio);
    const conCat = ns.filter((n) => todas(n).length).length;
    const secciones = contar(ns.flatMap((n) => [...new Set(todas(n).map((x) => x.split(':').slice(1).join(':')))])).slice(0, 8);
    L.push(`| ${medio} | ${cuantas} | ${Math.round((100 * conCat) / cuantas)}% | ${secciones.map(([c, k]) => `${c} (${k})`).join(', ') || '—'} |`);
  }
  return L;
}

const salida = ['# Categorías de origen: cómo las llaman los propios diarios\n', 'Pistas que trae cada nota de su diario: etiquetas del feed, sección del feed y sección de la dirección web. No se sacaron duplicadas.\n'];
salida.push(...informe('Las 200 notas de la muestra', enMuestra, true));
salida.push(`Nota: ${enMuestra.filter((n) => !n.enFeedHoy).length} de las 200 ya no están en los feeds de hoy; de esas sólo se pudo leer la dirección web.\n`);
const delPool = [...pool.values()].map((p) => ({ ...p, seccionIA: null }));
salida.push(...informe('Todas las notas que traen los feeds hoy', delPool, false));
salida.push(...porMedio(delPool));
fs.writeFileSync(path.join(AQUI, 'categorias-de-origen.md'), `${salida.join('\n')}\n`);
fs.writeFileSync(path.join(AQUI, 'categorias-de-origen.json'), `${JSON.stringify({ muestra: enMuestra }, null, 0)}\n`);
console.log(salida.filter((l) => l.startsWith('- ') || l.startsWith('## ') || l.startsWith('**Si se juntan')).join('\n'));

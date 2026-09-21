// La auditoría del filtro: qué está decidiendo cada cosa, y con qué palabra.
//
//   npm run auditar
//
// Se corre cuando algo se ve raro en la portada, o cada tanto sin motivo. No
// toca nada: baja las fuentes, clasifica y muestra. Cada corrida mira las
// noticias de ESE día, así que encuentra cosas distintas — la del 20/09
// descubrió que "gol" encontraba "golpe" y que un partido de la provincia
// de Buenos Aires no es un partido de fútbol.
//
// Lo que hay que mirar:
//
//   · La tabla de arriba: si una sección tiene muchas notas y casi ninguna
//     sale sola, el semáforo está trabado ahí. Si tiene muchas y salen
//     todas, capaz que está entrando basura.
//   · "Las palabras que más deciden": si una palabra corta y común decide
//     veinte notas, es candidata a estar equivocándose.
//   · "Decididas por una palabra ambigua": ahí aparecen los errores.

import {
  traer, parsearFeed, TODAS_LAS_FUENTES, paraPruebas, ingestar,
} from './ingesta.mjs';
import { REGLAS_SECCION, TEMAS } from './fuentes.mjs';

const { normalizar, parsearScrape, clasificar } = paraPruebas;

// Las que fuera de su sección significan otra cosa. La lista está en
// ingesta.mjs (PALABRAS_DEBILES); acá se repite para poder marcarlas en el
// informe sin exportar nada más.
const AMBIGUAS = new Set([
  'partido', 'descenso', 'tenis', 'copa', 'liga', 'gol',
  'muestra', 'exposicion', 'exposición', 'paso', 'box',
]);

const pega = (t, p) => {
  const n = normalizar(p).replace(/\s+/g, '\\s+');
  return new RegExp(`\\b${n}${n.length >= 5 ? '\\w{0,3}' : ''}\\b`).test(t);
};

const titulo = (t) => console.log(`\n\x1b[1m${t}\x1b[0m\n`);

// ------------------------------------------------- lo que sale y lo que no

const salida = await ingestar({ silencioso: true, escribirArchivos: false });

const tabla = {};
for (const n of salida.notas) {
  const t = (tabla[n.seccion] ??= { total: 0, verde: 0, amarillo: 0, rojo: 0, rel: [] });
  t.total += 1;
  t[n.semaforo] += 1;
  t.rel.push(n.relevancia);
}

titulo('QUÉ SALE SOLO Y QUÉ ESPERA');
console.log('SECCIÓN              TOTAL  SALEN  ESPERAN  BLOQ   PUNTAJE med');
for (const [s, t] of Object.entries(tabla).sort((a, b) => b[1].total - a[1].total)) {
  const med = Math.round(t.rel.reduce((a, b) => a + b, 0) / t.rel.length);
  const alerta = t.total >= 10 && t.verde / t.total < 0.1 ? '  ← trabada' : '';
  console.log(
    s.padEnd(20), String(t.total).padStart(5), String(t.verde).padStart(6),
    String(t.amarillo).padStart(8), String(t.rojo).padStart(5), String(med).padStart(11), alerta,
  );
}

const verdes = salida.notas.filter((n) => n.semaforo === 'verde');
console.log(`\n  ${verdes.length} de ${salida.notas.length} saldrían solas.`);

titulo('POR QUÉ ESPERAN');
const motivos = {};
for (const n of salida.notas) {
  if (n.semaforo === 'verde') continue;
  motivos[(n.motivo ?? '?').replace(/"[^"]*"/, '"…"').replace(/\(\d+ de \d+\)/, '(…)')] ??= 0;
  motivos[(n.motivo ?? '?').replace(/"[^"]*"/, '"…"').replace(/\(\d+ de \d+\)/, '(…)')] += 1;
}
for (const [m, c] of Object.entries(motivos).sort((a, b) => b[1] - a[1])) {
  console.log(String(c).padStart(5), m);
}

titulo('LOS TEMAS QUE SE SIGUEN');
const porTema = {};
for (const n of salida.notas) for (const t of n.temas ?? []) porTema[t] = (porTema[t] ?? 0) + 1;
for (const t of TEMAS) {
  const c = porTema[t.ranura] ?? 0;
  console.log(String(c).padStart(5), t.nombre, c < 2 ? '  (no se muestra: menos de dos)' : '');
}

// --------------------------------------- qué palabra decidió cada sección

const todas = [];
await Promise.all(TODAS_LAS_FUENTES.map(async (f) => {
  try {
    const html = await traer(f.url);
    todas.push(...(f.tipo === 'scrape' ? parsearScrape(html, f) : parsearFeed(html, f)));
  } catch { /* una fuente caída no frena la auditoría */ }
}));

const decide = {};
const sospechosas = [];
for (const n of todas) {
  if (n.seccionFuente) continue; // la sección la puso la fuente, no una palabra
  const seccion = clasificar(n);
  const texto = normalizar(`${n.titulo} ${(n.categorias ?? []).join(' ')} ${(n.cuerpo ?? '').slice(0, 400)}`);
  let cual = null;
  let largo = 0;
  for (const r of REGLAS_SECCION) {
    for (const p of r.palabras) {
      if (r.seccion === seccion && p.length > largo && pega(texto, p)) { largo = p.length; cual = p; }
    }
  }
  if (!cual) continue;
  decide[cual] ??= { n: 0, ej: [] };
  decide[cual].n += 1;
  if (decide[cual].ej.length < 2) decide[cual].ej.push(`[${seccion}] ${n.titulo.slice(0, 66)}`);
  if (AMBIGUAS.has(cual)) sospechosas.push(`[${seccion}] "${cual}" · ${n.titulo.slice(0, 68)}`);
}

titulo('LAS PALABRAS QUE MÁS DECIDEN');
for (const [p, d] of Object.entries(decide).sort((a, b) => b[1].n - a[1].n).slice(0, 12)) {
  console.log(`${String(d.n).padStart(5)}x  "${p}"${AMBIGUAS.has(p) ? '   ← ambigua' : ''}`);
  d.ej.forEach((e) => console.log(`         ${e}`));
}

titulo('DECIDIDAS POR UNA PALABRA AMBIGUA — MIRAR SI ALGUNA ESTÁ MAL');
sospechosas.slice(0, 20).forEach((s) => console.log('  ' + s));
console.log(`\n  ${sospechosas.length} de ${todas.length} notas leídas.\n`);

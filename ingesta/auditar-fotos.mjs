// La auditoría de las fotos: cuántas notas tienen foto, y de las que no, por qué.
//
//   npm run auditar-fotos            (las notas de los últimos 3 días)
//   npm run auditar-fotos -- --dias=7
//   npm run auditar-fotos -- --html          además arma reels/salida/fotos-sin-foto.html: cada nota sin foto con las
//                                            fotos candidatas de sus fuentes, para ver si la decisión fue buena
//
// No toca nada y no gasta cupo de IA: lee web/data/banco-fotos.json (lo que se
// decidió de cada nota), web/data/portada.json y web/data/archivo.json. Sirve
// para ver si el criterio de las fotos (docs/05-FOTOS.md) deja afuera demasiado
// y por qué motivo: lo que es una regla firme (menores, marcas de agua) no se
// toca; lo que es una falla (sin cupo, no se pudo bajar) se puede arreglar.
//
// Cuidado con una cosa: una entrada del banco "borrada" no es una falla. Es una
// nota vieja cuya foto se podó (`podarFotos`, web/scripts/fotos-notas.mjs) para
// que el repositorio no crezca. Por eso se mide por NOTA y no por entrada del banco.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { candidatasDeNota } from './fotos.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

/** Cuántos intentos se le dan a una falla antes de rendirse: 3 y dos repasos más (web/scripts/fotos-notas.mjs, REINTENTOS_DE_FOTO). */
export const INTENTOS_MAXIMOS = 5;

// Mismo criterio que sePuedeReintentar (web/scripts/fotos-notas.mjs): esto no es una decisión sobre la foto sino una falla.
const FALLA = /^(Gemini falló|Groq también falló|sin clave para comparar|sin fotos para comparar)/;

/** Los motivos, de lo que no se toca a lo que se puede arreglar. */
export const MOTIVOS = {
  conFoto: 'con foto',
  propia: 'nota propia (los repasos y el dólar no llevan foto de otro, por regla)',
  sinProbar: 'todavía no se probó',
  menor: 'la IA vio un menor reconocible (regla firme)',
  marca: 'la foto tenía marca de agua de un medio (regla firme)',
  logo: 'la única imagen era el logo del medio',
  noIlustra: 'la foto no ilustra la nota (flyer, cartel, genérica)',
  fuenteSinFoto: 'la fuente no traía foto para comparar',
  fallaReintentable: 'falló (sin cupo de IA o no se pudo bajar) y se va a reintentar',
  fallaAgotada: 'falló y ya se probó el máximo de veces',
  policiales: 'Policiales sin fuente oficial (regla firme)',
  borrada: 'tenía foto y se podó (nota vieja o retirada)',
  otra: 'otro motivo (mirar el texto)',
};

/** Las reglas firmes: de acá no se sale sin decidirlo Hernán y Andrés. */
export const MOTIVOS_FIRMES = new Set(['menor', 'marca', 'propia', 'policiales']);

/**
 * Por qué una nota tiene o no tiene foto. `nota` es la de portada.json o
 * archivo.json; `entrada` es lo que dice el banco de esa nota (puede no haber).
 * Devuelve la clave de MOTIVOS.
 */
export function motivoDeLaNota(nota, entrada) {
  if (nota?.foto?.archivo || entrada?.archivo) return 'conFoto';
  if (nota?.propia) return 'propia';
  if (!entrada) return nota?.seccion === 'Policiales' ? 'policiales' : 'sinProbar';
  if (entrada.borrada) return 'borrada';
  const razon = String(entrada.razon ?? entrada.error ?? '');
  const falla = entrada.origen === 'error' || !!entrada.error || FALLA.test(razon);
  if (falla) {
    if (/sin fotos para comparar/.test(razon)) return 'fuenteSinFoto';
    return (entrada.intentos ?? 1) >= INTENTOS_MAXIMOS ? 'fallaAgotada' : 'fallaReintentable';
  }
  const t = razon.toLowerCase();
  if (/menor|adolescen|niñ|alumn/.test(t)) return 'menor';
  if (/logo|logotipo/.test(t) && !/marca de agua/.test(t)) return 'logo';
  if (/marca de agua|marca del medio|marca institucional|watermark/.test(t) && !/sin marca|no tiene marca|no presenta marca|libre de marca/.test(t)) return 'marca';
  if (/flyer|cartel gen|no ilustra|ninguna de las fotos|no corresponde|ajena/.test(t)) return 'noIlustra';
  return 'otra';
}

/**
 * La auditoría entera, sin leer ni escribir nada (para probarla).
 * `notas`: las de portada y archivo; `banco`: banco-fotos.json; `desde`: la fecha desde la que se mide.
 */
export function auditarFotos({ notas = [], banco = {}, desde = 0 } = {}) {
  const vistas = new Set();
  const lista = [];
  for (const n of notas) {
    if (!n?.id || vistas.has(n.id)) continue;
    vistas.add(n.id);
    if (n.sinFecha || !(new Date(n.fecha).getTime() >= desde)) continue;
    lista.push({ nota: n, motivo: motivoDeLaNota(n, banco[n.id]), entrada: banco[n.id] });
  }
  const porMotivo = {};
  const porSeccion = {};
  for (const { nota, motivo } of lista) {
    porMotivo[motivo] = (porMotivo[motivo] ?? 0) + 1;
    const s = (porSeccion[nota.seccion] ??= { total: 0, conFoto: 0, propias: 0 });
    s.total += 1;
    if (motivo === 'conFoto') s.conFoto += 1;
    if (motivo === 'propia') s.propias += 1;
  }
  const medibles = lista.filter((x) => x.motivo !== 'propia');
  const conFoto = medibles.filter((x) => x.motivo === 'conFoto').length;
  const arreglables = medibles.filter((x) => !MOTIVOS_FIRMES.has(x.motivo) && x.motivo !== 'conFoto');
  return {
    total: lista.length,
    medibles: medibles.length,
    conFoto,
    porcentaje: medibles.length ? Math.round((conFoto / medibles.length) * 100) : 0,
    porMotivo,
    porSeccion,
    sinFoto: medibles.filter((x) => x.motivo !== 'conFoto'),
    arreglables: arreglables.length,
  };
}

/** Un resumen del banco entero (todas las entradas, también las de notas viejas): cuánto se probó y cómo salió. */
export function resumenDelBanco(banco = {}) {
  const r = { entradas: 0, conFoto: 0, borradas: 0, descartadas: 0, fallas: 0, agotadas: 0 };
  for (const e of Object.values(banco)) {
    r.entradas += 1;
    if (e.archivo) r.conFoto += 1;
    else if (e.borrada) r.borradas += 1;
    else {
      const m = motivoDeLaNota({}, e);
      if (m === 'fallaReintentable' || m === 'fuenteSinFoto') r.fallas += 1;
      else if (m === 'fallaAgotada') { r.fallas += 1; r.agotadas += 1; } else r.descartadas += 1;
    }
  }
  return r;
}

const esc = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * La página para mirar con los ojos (a mano, en la PC): por cada nota sin foto, qué dijo la IA y las fotos
 * que tenían sus fuentes. `items`: [{ nota, motivo, entrada, candidatas: [{ medio, enlace, imagen, error }] }].
 * Las fotos se muestran desde el medio de origen y nunca se guardan; la página es para revisar, no para compartir
 * (puede haber menores en las fotos de los descartes).
 */
export function htmlDeAuditoria(items = [], { dias = 3 } = {}) {
  const tarjetas = items.map(({ nota, motivo, entrada, candidatas = [] }) => `
  <article>
    <h2><a href="https://radarbalcarce.com${esc(nota.ruta ?? '')}">${esc(nota.titulo)}</a></h2>
    <p class="m"><b>${esc(nota.seccion)}</b> · ${esc(MOTIVOS[motivo])}${MOTIVOS_FIRMES.has(motivo) && !/firme/.test(MOTIVOS[motivo]) ? ' (regla firme)' : ''}</p>
    ${entrada?.razon ? `<p class="r">La IA dijo: ${esc(entrada.razon)}</p>` : ''}
    <div class="fotos">${candidatas.length ? candidatas.map((c) => c.imagen
    ? `<figure><a href="${esc(c.enlace)}"><img src="${esc(c.imagen)}" loading="lazy" alt=""></a><figcaption>${esc(c.medio)}</figcaption></figure>`
    : `<figure class="sin"><figcaption>${esc(c.medio)}: ${esc(c.error ?? 'la página no declara una foto')}</figcaption></figure>`).join('') : '<p class="r">No hay fuentes con enlace para buscar fotos.</p>'}</div>
  </article>`).join('');
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Notas sin foto</title>
<style>body{font:15px/1.4 system-ui,sans-serif;max-width:980px;margin:24px auto;padding:0 16px;background:#f6f5f2;color:#1c1b19}h1{font-size:22px}article{background:#fff;border:1px solid #e4e1da;padding:14px 16px;margin:14px 0;border-radius:6px}h2{font-size:17px;margin:0 0 4px}.m{margin:2px 0;color:#6b6860}.r{margin:4px 0;font-style:italic}.fotos{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}figure{margin:0;width:230px}figure img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:4px;display:block}figcaption{font-size:12px;color:#6b6860;margin-top:3px}.sin{width:230px;background:#eee;padding:8px;border-radius:4px}a{color:#1d4ed8}</style>
<h1>Notas sin foto de los últimos ${dias} días (${items.length})</h1><p>Para revisar, no para compartir: puede haber menores en las fotos de los descartes.</p>${tarjetas}</html>`;
}

const leerJson = (f, defecto) => {
  try { return JSON.parse(fs.readFileSync(path.join(RAIZ, f), 'utf8')); } catch { return defecto; }
};
const barra = (pct) => '█'.repeat(Math.round(pct / 5)).padEnd(20, '░');
const titulo = (t) => console.log(`\n\x1b[1m${t}\x1b[0m\n`);

async function main() {
  const dias = Number((process.argv.find((a) => a.startsWith('--dias=')) ?? '--dias=3').split('=')[1]) || 3;
  const portada = leerJson('web/data/portada.json', { notas: [] }).notas ?? [];
  const archivo = leerJson('web/data/archivo.json', { notas: [] }).notas ?? [];
  const banco = leerJson('web/data/banco-fotos.json', {});
  const desde = Date.now() - dias * 86_400_000;
  const a = auditarFotos({ notas: [...portada, ...archivo], banco, desde });

  titulo(`LAS FOTOS DE LAS NOTAS DE LOS ÚLTIMOS ${dias} DÍAS`);
  console.log(`  ${a.total} notas (${a.total - a.medibles} son propias y no cuentan).`);
  console.log(`  Con foto: ${a.conFoto} de ${a.medibles}  ${barra(a.porcentaje)} ${a.porcentaje}%`);

  titulo('POR SECCIÓN');
  for (const [s, v] of Object.entries(a.porSeccion).sort((x, y) => y[1].total - x[1].total)) {
    const med = v.total - v.propias;
    const pct = med ? Math.round((v.conFoto / med) * 100) : 0;
    console.log(`  ${s.padEnd(18)} ${String(v.conFoto).padStart(3)} de ${String(med).padEnd(3)} ${barra(pct)} ${pct}%`);
  }

  titulo('POR QUÉ NO TIENEN FOTO');
  for (const [m, n] of Object.entries(a.porMotivo).sort((x, y) => y[1] - x[1])) {
    if (m === 'conFoto') continue;
    console.log(`  ${String(n).padStart(4)}  ${MOTIVOS[m]}${MOTIVOS_FIRMES.has(m) ? '' : m === 'borrada' ? '' : '   ← se puede mejorar'}`);
  }
  console.log(`\n  Se pueden mejorar: ${a.arreglables} de ${a.medibles - a.conFoto} sin foto (el resto son reglas firmes).`);

  titulo('LAS NOTAS SIN FOTO (las 25 más nuevas)');
  const nuevas = [...a.sinFoto].sort((x, y) => new Date(y.nota.fecha) - new Date(x.nota.fecha)).slice(0, 25);
  for (const { nota, motivo, entrada } of nuevas) {
    console.log(`  [${nota.seccion}] ${String(nota.titulo).slice(0, 62)}`);
    console.log(`      → ${MOTIVOS[motivo]}${entrada?.intentos ? ` · intentos: ${entrada.intentos}` : ''}`);
    if (motivo === 'otra' && entrada?.razon) console.log(`        "${String(entrada.razon).slice(0, 110)}"`);
  }

  if (process.argv.includes('--html')) {
    const items = [];
    for (const x of a.sinFoto) {
      if (x.motivo === 'borrada' || x.motivo === 'policiales') continue;
      items.push({ ...x, candidatas: await candidatasDeNota(x.nota).catch(() => []) });
    }
    const destino = path.join(RAIZ, 'reels', 'salida', 'fotos-sin-foto.html');
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, htmlDeAuditoria(items, { dias }));
    console.log(`
  Para mirar las fotos: ${destino}
`);
  }

  const b = resumenDelBanco(banco);
  titulo('EL BANCO ENTERO (desde que existe)');
  console.log(`  ${b.entradas} notas probadas: ${b.conFoto} con foto, ${b.borradas} con foto podada, ${b.descartadas} descartadas por la IA, ${b.fallas} por una falla (${b.agotadas} ya sin más intentos).\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

// Compara las redacciones (redaccion-*.json): cuántas pasan el verificador, qué fallas tienen, largo de cada parte,
// costo por mes. Escribe comparacion-redaccion.md y redaccion-lado-a-lado.md. No necesita la clave.
//   node pruebas-modelos/comparar-redaccion.mjs [--notas-por-dia=450]

import fs from 'node:fs';
import path from 'node:path';

const AQUI = import.meta.dirname;
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = 'true'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const POR_DIA = Number(args['notas-por-dia'] ?? 450);
const prom = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : 'n/d');
const dolares = (x) => (x == null ? 's/d' : x === 0 ? 'US$ 0' : `US$ ${x < 10 ? x.toFixed(1) : x.toFixed(0)}`);

const corridas = fs.readdirSync(AQUI).filter((f) => /^redaccion-.*\.json$/.test(f))
  .map((f) => JSON.parse(fs.readFileSync(path.join(AQUI, f), 'utf8')))
  .sort((a, b) => a.modelo.localeCompare(b.modelo) || a.prompt.localeCompare(b.prompt));
if (!corridas.length) { console.error('No hay redaccion-*.json: corré primero redactar.mjs'); process.exit(1); }

const filas = [];
for (const c of corridas) {
  const hs = Object.values(c.historias);
  const escritas = hs.filter((h) => h.escrito);
  // "largo" (el cuerpo pasa del tope de caracteres de hoy) se cuenta aparte: el criterio nuevo pide más largo que lo que hoy tolera el código.
  const sinLargo = (h) => h.problemas.filter((p) => p.tipo !== 'largo');
  const aprobadas = escritas.filter((h) => sinLargo(h).length === 0).length;
  const tipos = {};
  for (const h of escritas) for (const t of new Set(sinLargo(h).map((p) => p.tipo))) tipos[t] = (tipos[t] ?? 0) + 1;
  const unaFuente = escritas.filter((h) => h.fuentes === 1); const varias = escritas.filter((h) => h.fuentes > 1);
  const usos = hs.map((h) => h.uso).filter((u) => u?.entrada != null);
  const entrada = prom(usos.map((u) => u.entrada)); const salida = prom(usos.map((u) => u.salida ?? 0));
  const reales = usos.filter((u) => u.costo != null).map((u) => u.costo);
  const porNota = c.precios && entrada != null ? entrada * c.precios.entrada + salida * c.precios.salida : (reales.length ? prom(reales) : null);
  filas.push({
    modelo: c.modelo + (c.razonamiento ? ` (razonamiento ${c.razonamiento === 'off' ? 'apagado' : 'bajo'})` : ''), prompt: c.prompt, total: hs.length, escritas: escritas.length, errores: hs.filter((h) => h.error).length,
    aprobadas, tipos, largoPasado: escritas.filter((h) => h.problemas.some((p) => p.tipo === 'largo')).length,
    cuerpo1: prom(unaFuente.map((h) => h.palabrasCuerpo)), cuerpoN: prom(varias.map((h) => h.palabrasCuerpo)),
    enGuia: escritas.filter((h) => (h.fuentes === 1 ? h.palabrasCuerpo >= 90 && h.palabrasCuerpo <= 150 : h.palabrasCuerpo >= 150 && h.palabrasCuerpo <= 250)).length,
    bajo70: escritas.filter((h) => h.palabrasCuerpo < 70).length,
    titulo: prom(escritas.map((h) => h.caracteresTitulo)), bajada: prom(escritas.map((h) => h.palabrasBajada)),
    segundos: prom(hs.map((h) => h.ms / 1000)), entrada, salida, porNota, mes: porNota == null ? null : porNota * POR_DIA * 30,
    caracteresDelPrompt: hs[0]?.caracteresDelPrompt ?? null,
  });
}

const L = ['# Redacción: prompt actual contra prompt nuevo, con varios modelos\n'];
L.push(`${filas[0].total} historias (10 con una fuente y 5 con varias), el mismo verificador de producción. "Aprobadas" = el verificador no encontró problemas (sin contar el largo del cuerpo, que hoy se corta en 1.800 caracteres). Costo mensual con ${POR_DIA} notas por día, un intento por nota (en producción hay hasta 3 intentos si falla).\n`);
L.push('| Modelo | Prompt | Escritas | Aprobadas sin problemas | Fallas más comunes | Cuerpo (1 fuente / varias) | En la guía de largo | Título / bajada | Seg. | Costo por mes |');
L.push('|---|---|---|---|---|---|---|---|---|---|');
for (const f of filas) {
  const top = Object.entries(f.tipos).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${t} ${n}`).join(', ') || '—';
  L.push(`| ${f.modelo} | ${f.prompt} (${f.caracteresDelPrompt} car.) | ${f.escritas}/${f.total}${f.errores ? ` (${f.errores} error)` : ''} | ${f.aprobadas}/${f.escritas} (${pct(f.aprobadas, f.escritas)}) | ${top} | ${f.cuerpo1 == null ? '—' : Math.round(f.cuerpo1)} / ${f.cuerpoN == null ? '—' : Math.round(f.cuerpoN)} | ${f.enGuia}/${f.escritas} | ${f.titulo == null ? '—' : `${Math.round(f.titulo)} car. / ${Math.round(f.bajada)} pal.`} | ${f.segundos == null ? '—' : f.segundos.toFixed(1)} | ${dolares(f.mes)} |`);
}
L.push('\nAl lado de cada prompt va el tamaño del prompt en caracteres. Cuerpo = palabras promedio. "En la guía de largo": 90–150 palabras con una fuente, 150–250 con varias.');
fs.writeFileSync(path.join(AQUI, 'comparacion-redaccion.md'), `${L.join('\n')}\n`);

// ---- los textos, lado a lado, para leerlos
const ver = [];
const ids = Object.keys(corridas[0].historias);
const elegidos = [ids[0], ids[5], ids[10], ids[13]].filter(Boolean);
ver.push('# Redacciones lado a lado\n\nPara leer y juzgar a ojo. Para cada historia, cada modelo con el prompt actual y con el nuevo.\n');
for (const id of elegidos) {
  const base = corridas[0].historias[id];
  ver.push(`\n## ${base.titulo_original} (${base.fuentes} fuente${base.fuentes > 1 ? 's' : ''})\n`);
  for (const c of corridas) {
    const h = c.historias[id];
    if (!h?.escrito) { ver.push(`**${c.modelo} · ${c.prompt}:** sin texto (${h?.error ?? 'sin respuesta'})\n`); continue; }
    const probs = h.problemas.length ? ` · problemas: ${h.problemas.map((p) => p.tipo).join(', ')}` : ' · sin problemas';
    ver.push(`**${c.modelo} · prompt ${c.prompt}** (${h.palabrasCuerpo} palabras${probs})\n\n*${h.escrito.titulo}*\n\n${h.escrito.copete}\n\n${h.escrito.cuerpo}\n`);
  }
}
fs.writeFileSync(path.join(AQUI, 'redaccion-lado-a-lado.md'), `${ver.join('\n')}\n`);
console.log(L.join('\n'));

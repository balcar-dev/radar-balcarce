// Audita los feeds (sólo lectura): cuántas notas trae cada uno, cada cuánto publica, si perdería notas
// leyéndolo cada hora y qué categorías trae. Escribe auditoria-feeds.md y auditoria-feeds.json.
//   node pruebas-modelos/auditar-feeds.mjs

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { traer, parsearFeed } from '../ingesta/ingesta.mjs';
import { FUENTES, FUENTES_NACIONALES } from '../ingesta/fuentes.mjs';
import { FUENTES_CRUCE } from '../ingesta/fuentes-cruce.mjs';

const AQUI = import.meta.dirname;
const AHORA = Date.now();
const H = 3600000;
const idDe = (url) => createHash('sha1').update(url).digest('hex').slice(0, 8); // el mismo id que usa bajar-crudas.mjs

const fuentes = [...FUENTES, ...FUENTES_NACIONALES, ...FUENTES_CRUCE].filter((f) => f.activa !== false && ['rss', 'atom'].includes(f.tipo));
console.log(`Leyendo ${fuentes.length} feeds…`);

const porFeed = [];
const notas = new Map();
async function una(f) {
  try {
    const items = parsearFeed(await traer(f.url, { timeout: 15000 }), { ...f, peso: f.peso ?? 10 });
    const fechas = items.map((n) => new Date(n.fecha).getTime()).filter((t) => t > 0 && t <= AHORA + H);
    const span = fechas.length > 1 ? (Math.max(...fechas) - Math.min(...fechas)) / H : 0;
    porFeed.push({
      id: f.id, medio: f.medio, alcance: f.alcance, seccionFija: f.seccion ?? null, items: items.length, spanHoras: Number(span.toFixed(1)),
      porHora: span > 0 ? Number((fechas.length / span).toFixed(2)) : null,
      ultimos30: fechas.filter((t) => AHORA - t <= 0.5 * H).length, ultimos60: fechas.filter((t) => AHORA - t <= H).length,
      conCategorias: items.filter((n) => n.categorias?.length).length,
    });
    for (const n of items) {
      if (!n.enlace || notas.has(n.enlace)) continue;
      let seg = '';
      try { seg = new URL(n.enlace).pathname.split('/').filter(Boolean)[0] ?? ''; } catch { /* sin dirección */ }
      notas.set(n.enlace, { id: idDe(n.enlace), medio: f.medio, fecha: new Date(n.fecha).getTime(), categorias: n.categorias ?? [], segmento: seg, seccionFija: f.seccion ?? null });
    }
  } catch { porFeed.push({ id: f.id, medio: f.medio, alcance: f.alcance, error: true }); }
}
const cola = [...fuentes];
await Promise.all(Array.from({ length: 8 }, async () => { while (cola.length) await una(cola.shift()); }));

const ok = porFeed.filter((f) => !f.error);
const lista = [...notas.values()];
const sum = (xs) => xs.reduce((s, x) => s + x, 0);

// ---- cuántas notas nuevas por media hora y por hora
const nuevas = (h) => lista.filter((n) => AHORA - n.fecha <= h * H && AHORA - n.fecha >= 0).length;
const ultimas24 = nuevas(24); const ultimas72 = nuevas(72);
const porHoraDelDia = Array(24).fill(0);
for (const n of lista) if (AHORA - n.fecha <= 24 * H && AHORA - n.fecha >= 0) porHoraDelDia[(new Date(n.fecha).getUTCHours() + 21) % 24] += 1; // hora de Argentina (UTC-3)

// ---- ¿se perdería algo leyendo cada hora? un feed que guarda menos de ~1 hora de notas pierde las que salen de más
const riesgo = ok.filter((f) => f.porHora && f.spanHoras < 1.25 + 0 && f.items >= 3).map((f) => f.medio);
const riesgoHora = ok.filter((f) => f.porHora && f.items / f.porHora < 1.5 && f.items >= 3);

// ---- categorías: cuántas notas traen y cuáles son las más comunes
const conCat = lista.filter((n) => n.categorias.length).length;
const frecuencia = (xs) => { const m = new Map(); xs.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]); };
const topCat = frecuencia(lista.flatMap((n) => n.categorias.map((c) => c.toLowerCase()))).slice(0, 40);
const topSeg = frecuencia(lista.map((n) => n.segmento).filter(Boolean)).slice(0, 40);
const mediosConCat = {};
for (const n of lista) { const m = (mediosConCat[n.medio] ??= { notas: 0, con: 0 }); m.notas += 1; if (n.categorias.length) m.con += 1; }

const L = [];
L.push('# Auditoría de feeds\n');
L.push(`Feeds leídos: ${ok.length} de ${fuentes.length} (el resto falló en esta lectura). Notas distintas encontradas: ${lista.length}.\n`);
L.push('## Cuántas notas traen los feeds\n');
L.push(`- Publicadas en las últimas 24 horas: **${ultimas24}**; en las últimas 72 horas: **${ultimas72}**.`);
L.push(`- Eso es un promedio de **${(ultimas24 / 48).toFixed(0)} notas nuevas por cada media hora** y ${(ultimas24 / 24).toFixed(0)} por hora (sin filtros, antes de sacar lo que no entra).`);
L.push(`- Las más publicadas por hora del día (hora de Argentina): ${porHoraDelDia.map((c, h) => [h, c]).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([h, c]) => `${h}:00 (${c})`).join(', ')}; las menos: ${porHoraDelDia.map((c, h) => [h, c]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([h, c]) => `${h}:00 (${c})`).join(', ')}.`);
L.push(`- Cada feed devuelve entre ${Math.min(...ok.map((f) => f.items))} y ${Math.max(...ok.map((f) => f.items))} notas por lectura (mediana ${ok.map((f) => f.items).sort((a, b) => a - b)[Math.floor(ok.length / 2)]}).\n`);
L.push('## ¿Conviene leer cada hora en vez de cada media hora?\n');
L.push(`Un feed guarda sólo las últimas N notas. Si publica más notas por hora de las que guarda, leerlo menos seguido hace perder notas. Con lectura cada hora, **${riesgoHora.length} feeds** guardan menos de 1,5 horas de notas y podrían perder alguna en los picos:\n`);
L.push('| Medio | Notas que guarda | Publica por hora | Cuántas horas guarda |');
L.push('|---|---|---|---|');
for (const f of riesgoHora.sort((a, b) => a.items / a.porHora - b.items / b.porHora).slice(0, 25)) L.push(`| ${f.medio} (${f.id}) | ${f.items} | ${f.porHora} | ${(f.items / f.porHora).toFixed(1)} |`);
L.push('\nLeer más seguido no cuesta IA: lo que ya se vio se descarta antes de gastar nada.\n');
L.push('## Categorías que traen los feeds\n');
L.push(`- Notas con categorías en el propio feed: **${conCat} de ${lista.length}** (${Math.round((100 * conCat) / lista.length)}%).`);
L.push(`- Feeds con sección fija en el código (por ejemplo "Deportes", "Economía"): ${ok.filter((f) => f.seccionFija).length} de ${ok.length}.\n`);
L.push('Las 40 categorías más comunes: ' + topCat.map(([c, n]) => `${c} (${n})`).join(', ') + '.\n');
L.push('Los 40 primeros tramos de la dirección más comunes (la sección que el diario pone en la URL): ' + topSeg.map(([c, n]) => `/${c}/ (${n})`).join(', ') + '.\n');
L.push('### Cuántas notas traen categorías, por medio\n');
L.push('| Medio | Notas | Con categorías |');
L.push('|---|---|---|');
for (const [m, v] of Object.entries(mediosConCat).sort((a, b) => b[1].notas - a[1].notas).slice(0, 40)) L.push(`| ${m} | ${v.notas} | ${Math.round((100 * v.con) / v.notas)}% |`);

fs.writeFileSync(path.join(AQUI, 'auditoria-feeds.md'), `${L.join('\n')}\n`);
fs.writeFileSync(path.join(AQUI, 'auditoria-feeds.json'), `${JSON.stringify({ leido: new Date(AHORA).toISOString(), porFeed, notas: lista }, null, 0)}\n`);
console.log(L.slice(0, 12).join('\n'));

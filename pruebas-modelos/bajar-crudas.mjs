// Baja notas CRUDAS de los feeds (como las ve el sistema antes de decidir) y arma muestra-200.json.
//   node pruebas-modelos/bajar-crudas.mjs            (200 notas)
//   node pruebas-modelos/bajar-crudas.mjs --notas=100
// Sólo LEE feeds públicos y escribe en esta carpeta. No toca web/data ni nada de producción.
//
// Por qué: web/data/archivo.json sólo guarda lo publicado. Para saber si un modelo sirve para
// seleccionar hay que darle también lo que hoy se descarta (horóscopo, policiales de afuera,
// chimentos, publicidad…). Las notas salen de acá sin ninguna decisión del sistema: la "verdad"
// se arma después, a mano, revisando las discrepancias entre modelos.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { traer, parsearFeed } from '../ingesta/ingesta.mjs';
import { FUENTES, FUENTES_NACIONALES } from '../ingesta/fuentes.mjs';
import { FUENTES_CRUCE } from '../ingesta/fuentes-cruce.mjs';
import { ciudadDelMedio } from '../ingesta/lectura-ia.mjs';

const AQUI = import.meta.dirname;
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = 'true'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const TOTAL = Number(args.notas ?? 200);
const HORAS = 72;

// Qué proporción de la muestra viene de cada alcance (sobra volumen de afuera, como en producción).
const CUOTAS = { local: 0.25, region: 0.15, provincia: 0.1, pais: 0.5 };
// Para que la muestra tenga de todo, se garantizan unas pocas de lo que NO debería salir.
const RUIDO = {
  horoscopo: /hor[oó]scopo|signos? del zod|astrolog|los astros/i,
  loteria: /loter[ií]a|quiniela|quini ?6|tómbola|tombola|resultados? del (sorteo|quini|loto)/i,
  chimento: /farándula|farandula|separaci[oó]n|romance|escándalo|escandalo|se casa|internad[oa]|revel[oó]/i,
  policial: /detuvieron|asesin|homicidio|apuñal|balacera|robo a mano armada|femicidio|crimen/i,
  extranjero: /trump|putin|gaza|ucrania|israel|china|rusia|eeuu|estados unidos|francia|reino unido/i,
};
const RUIDO_POR_CLASE = 4;

// Con semilla fija: la misma corrida da la misma muestra mientras los feeds no cambien.
let semilla = 20261010;
const azar = () => { semilla = (semilla * 1664525 + 1013904223) % 4294967296; return semilla / 4294967296; };
const mezclar = (xs) => xs.map((x) => [azar(), x]).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
const limpiar = (s = '') => String(s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const idDe = (url) => createHash('sha1').update(url).digest('hex').slice(0, 8);

const fuentes = [...FUENTES, ...FUENTES_NACIONALES, ...FUENTES_CRUCE]
  .filter((f) => f.activa !== false && ['rss', 'atom'].includes(f.tipo));
console.log(`Bajando ${fuentes.length} feeds (sólo lectura)…`);

const crudas = [];
let hechas = 0;
async function una(f) {
  try {
    const xml = await traer(f.url, { timeout: 15000 });
    for (const n of parsearFeed(xml, { ...f, peso: f.peso ?? 10 })) {
      const resumen = limpiar(n.cuerpo ?? n.resumen ?? '');
      if (!n.titulo || !n.enlace || resumen.length < 40) continue;
      if ((Date.now() - new Date(n.fecha).getTime()) / 3600000 > HORAS) continue;
      crudas.push({
        id: idDe(n.enlace), titulo: limpiar(n.titulo), resumen: resumen.slice(0, 600), medio: f.medio,
        ciudad_del_medio: ciudadDelMedio({ medio: f.medio }), alcance: f.alcance ?? 'pais', enlace: n.enlace, fecha: new Date(n.fecha).toISOString(),
      });
    }
  } catch { /* un feed caído no frena nada */ }
  hechas += 1;
}
// De a 8 a la vez, para no castigar a nadie.
const cola = [...fuentes];
await Promise.all(Array.from({ length: 8 }, async () => { while (cola.length) await una(cola.shift()); }));
console.log(`${crudas.length} notas crudas de ${hechas} feeds.`);

// Sin repetir (misma dirección) ni el mismo título del mismo medio.
const vistos = new Set();
const unicas = crudas.filter((n) => { const k = n.enlace; if (vistos.has(k)) return false; vistos.add(k); return true; });

const elegidas = new Map();
// 1) lo que no debería salir, sólo de afuera (los medios de acá no se toman para esta cuota)
const deAfuera = mezclar(unicas.filter((n) => n.alcance === 'pais' || n.alcance === 'region'));
for (const [clase, re] of Object.entries(RUIDO)) {
  let k = 0;
  for (const n of deAfuera) {
    if (k >= RUIDO_POR_CLASE) break;
    if (re.test(n.titulo) && !elegidas.has(n.id)) { elegidas.set(n.id, { ...n, aporta: `ruido:${clase}` }); k += 1; }
  }
}
// 2) el resto por cuotas de alcance
for (const [alcance, parte] of Object.entries(CUOTAS)) {
  const falta = Math.round(TOTAL * parte) - [...elegidas.values()].filter((n) => n.alcance === alcance).length;
  for (const n of mezclar(unicas.filter((x) => x.alcance === alcance)).slice(0, Math.max(0, falta))) if (!elegidas.has(n.id)) elegidas.set(n.id, n);
}
// 3) si faltan, se completa con lo que haya
for (const n of mezclar(unicas)) { if (elegidas.size >= TOTAL) break; if (!elegidas.has(n.id)) elegidas.set(n.id, n); }

const notas = [...elegidas.values()].slice(0, TOTAL);
const porAlcance = {}; notas.forEach((n) => { porAlcance[n.alcance] = (porAlcance[n.alcance] ?? 0) + 1; });
const salida = { bajada: new Date().toISOString(), nota: 'Notas crudas sin decisión del sistema. "aporta" marca las que se garantizaron por ser de lo que no debería salir.', notas };
fs.writeFileSync(path.join(AQUI, `muestra-${TOTAL}.json`), `${JSON.stringify(salida, null, 1)}\n`);
console.log(`muestra-${TOTAL}.json: ${notas.length} notas`, porAlcance, `· con ruido garantizado: ${notas.filter((n) => n.aporta).length}`);

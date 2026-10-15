// Diagnóstico de las estadísticas (15/10/2026). SÓLO LEE web/data/estadisticas.json y
// web/data/estadisticas-piezas.json: no escribe nada ni sale a internet.
//
//   node docs/analiticas/diagnostico.mjs
//
// Qué muestra: (1) qué días y qué mediciones están en cero o se contradicen; (2) cuánto
// del tráfico parece de robots (países de centros de datos); (3) de dónde llega la gente;
// (4) cuántas mediciones de piezas de redes sirven y cuántas no.

import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.join(import.meta.dirname, '..', '..');
const leer = (f) => JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', f), 'utf8'));
const suma = (o) => Object.values(o ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);
const est = leer('estadisticas.json');
const piezas = leer('estadisticas-piezas.json');

console.log('=== 1. Mediciones de las 9 y las 21 (puntos) con algo raro ===');
const sosp = [];
for (const p of est.puntos) {
  const w = p.web;
  if (!w) { sosp.push(`${p.cuando.slice(0, 16)}  sin web (${p.cloudflare ?? '?'})`); continue; }
  const cero = w.u24.vistas === 0 && w.u12.vistas === 0 && w.a24.vistas === 0;
  const imposible = w.u24.vistas < w.u12.vistas || w.u24.visitas < w.u12.visitas;
  const visitasCero = w.u24.visitas === 0 && w.u24.vistas > 0;
  if (cero) sosp.push(`${p.cuando.slice(0, 16)}  TODO EN CERO (u12, u24 y hasta las 24-48 h de antes)`);
  else if (imposible) sosp.push(`${p.cuando.slice(0, 16)}  IMPOSIBLE: 12 h = ${w.u12.visitas}/${w.u12.vistas}, 24 h = ${w.u24.visitas}/${w.u24.vistas}`);
  else if (visitasCero) sosp.push(`${p.cuando.slice(0, 16)}  visitas 0 con ${w.u24.vistas} vistas`);
}
console.log(sosp.length ? sosp.join('\n') : '(ninguna)');
console.log(`Total de mediciones: ${est.puntos.length}; raras: ${sosp.length}`);

console.log('\n=== 2. Días del detalle (`dias`) ===');
const buenos = [];
for (const [dia, d] of Object.entries(est.dias)) {
  const horas = suma(d.horas);
  const motivos = [];
  if (!d.vistas && !horas && !suma(d.notas) && !suma(d.referentes)) motivos.push('VACÍO (todo cero)');
  else {
    if (!d.vistas && horas) motivos.push(`vistas 0 pero las horas suman ${horas}`);
    if (d.vistas && !horas) motivos.push(`vistas ${d.vistas} pero las horas suman 0`);
    if (d.vistas && !suma(d.notas) && !suma(d.paginas)) motivos.push('sin ninguna dirección');
    if (suma(d.dispositivos) > (d.vistas || 0) * 1.05 && d.vistas) motivos.push(`aparatos suman ${suma(d.dispositivos)} > vistas ${d.vistas}`);
    if (!Object.keys(d.paises ?? {}).length && d.vistas) motivos.push('sin países');
  }
  console.log(`${dia}  visitas ${String(d.visitas ?? '-').padStart(3)}  vistas ${String(d.vistas ?? '-').padStart(3)}  ${motivos.length ? `<-- ${motivos.join('; ')}` : 'ok'}`);
  if (!motivos.length && d.vistas) buenos.push([dia, d]);
}

console.log(`\n=== 3. Con los ${buenos.length} días sanos ===`);
const paises = {}; const ref = {}; const disp = {};
let visitas = 0; let vistas = 0;
for (const [, d] of buenos) {
  visitas += d.visitas; vistas += d.vistas;
  for (const [k, n] of Object.entries(d.paises ?? {})) paises[k] = (paises[k] ?? 0) + n;
  for (const [k, n] of Object.entries(d.referentes ?? {})) ref[k] = (ref[k] ?? 0) + n;
  for (const [k, n] of Object.entries(d.dispositivos ?? {})) disp[k] = (disp[k] ?? 0) + n;
}
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)} %` : '-');
console.log(`Promedio por día: ${(visitas / buenos.length).toFixed(1)} visitas y ${(vistas / buenos.length).toFixed(1)} páginas vistas`);
const totalP = suma(paises);
const argentina = paises.AR ?? 0;
console.log(`Páginas vistas desde Argentina: ${argentina} de ${totalP} (${pct(argentina, totalP)}); fuera: ${pct(totalP - argentina, totalP)}`);
console.log(`Países: ${Object.entries(paises).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`);
const totalR = suma(ref);
console.log(`Visitas por origen: ${Object.entries(ref).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n} (${pct(n, totalR)})`).join(', ')}`);
console.log(`Aparatos: ${Object.entries(disp).map(([k, n]) => `${k} ${n}`).join(', ')}`);
const argPorDia = buenos.map(([, d]) => d.paises?.AR ?? 0);
console.log(`Páginas vistas de Argentina por día: ${argPorDia.join(', ')}  (promedio ${(suma(argPorDia) / argPorDia.length).toFixed(0)})`);

console.log('\n=== 4. Hora 9 de Balcarce (12:00 UTC) en el detalle ===');
console.log(Object.entries(est.dias).map(([dia, d]) => `${dia.slice(5)}:${d.horas?.[9] ?? '-'}`).join('  '));

console.log('\n=== 5. Estadísticas por pieza de redes ===');
const g = {};
for (const m of piezas.medidas) {
  const k = `${m.red}/${m.parte}`;
  g[k] ??= { n: 0, vacias: 0, ceros: 0 };
  g[k].n += 1;
  const v = Object.values(m.metricas ?? {});
  if (!v.length) g[k].vacias += 1; else if (v.every((x) => !x)) g[k].ceros += 1;
}
let total = 0; let inutil = 0;
for (const [k, e] of Object.entries(g)) {
  total += e.n; inutil += e.vacias + e.ceros;
  console.log(`${k.padEnd(20)} ${String(e.n).padStart(4)} mediciones; vacías ${String(e.vacias).padStart(3)}; todo en cero ${String(e.ceros).padStart(3)}`);
}
console.log(`Sin utilidad: ${inutil} de ${total} (${pct(inutil, total)})`);
const fbp = piezas.medidas.filter((m) => m.red === 'facebook' && m.parte === 'posteo');
const clics = fbp.reduce((a, m) => a + (m.metricas?.post_clicks ?? 0), 0);
console.log(`Posteos de Facebook medidos: ${fbp.length}; clics totales que informa Meta: ${clics}`);

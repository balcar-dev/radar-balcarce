// Probador de fuentes candidatas: dice cuáles feeds están vivos antes de
// sumarlos a fuentes.mjs.
//   node probar.mjs
// También acepta URLs sueltas:
//   node probar.mjs https://un-medio.com.ar/feed

import { CANDIDATOS, PALABRAS_LOCALES } from './fuentes.mjs';
import { traer, parsearFeed } from './ingesta.mjs';

const sueltas = process.argv.slice(2).filter((a) => a.startsWith('http'));
const lista = sueltas.length
  ? sueltas.map((url, i) => ({ id: `suelta${i}`, nombre: url.replace(/^https?:\/\//, '').slice(0, 34), url, alcance: '?' }))
  : CANDIDATOS;

function normalizar(s = '') {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

console.log('\n\x1b[1mPROBANDO FUENTES CANDIDATAS\x1b[0m\n');
console.log(`  ${'FUENTE'.padEnd(28)} ${'ALCANCE'.padEnd(10)} ${'ESTADO'.padEnd(8)} NOTAS  ÚLTIMA        MENCIONAN BALCARCE`);
console.log(`  ${'-'.repeat(100)}`);

const resultados = await Promise.allSettled(lista.map(async (c) => {
  const xml = await traer(c.url, { timeout: 20000 });
  const notas = parsearFeed(xml, { ...c, peso: 10 });
  if (!notas.length) throw new Error('responde pero no trae items');
  return { c, notas };
}));

const sirven = [];
resultados.forEach((r, i) => {
  const c = lista[i];
  if (r.status !== 'fulfilled') {
    console.log(`  ${c.nombre.padEnd(28)} ${String(c.alcance).padEnd(10)} \x1b[31m${'falla'.padEnd(8)}\x1b[0m ${String(r.reason?.message ?? r.reason).slice(0, 44)}`);
    return;
  }
  const { notas } = r.value;
  const ultima = notas.map((n) => n.fecha).sort((a, b) => b - a)[0];
  const horas = (Date.now() - ultima.getTime()) / 3600000;
  const frescura = horas < 48 ? `hace ${Math.round(horas)} h` : `hace ${Math.round(horas / 24)} días`;
  const conBalcarce = notas.filter((n) => {
    const t = normalizar(`${n.titulo} ${n.cuerpo.slice(0, 500)}`);
    return PALABRAS_LOCALES.some((p) => t.includes(normalizar(p)));
  }).length;
  const viva = horas < 72;
  console.log(`  ${c.nombre.padEnd(28)} ${String(c.alcance).padEnd(10)} ${viva ? '\x1b[32mok      \x1b[0m' : '\x1b[33mdormida \x1b[0m'} ${String(notas.length).padStart(4)}   ${frescura.padEnd(13)} ${conBalcarce ? `\x1b[1m${conBalcarce}\x1b[0m` : '-'}`);
  if (viva) sirven.push({ ...c, notas: notas.length, conBalcarce });
});

console.log(`\n  \x1b[1m${sirven.length} de ${lista.length} sirven para sumar a fuentes.mjs\x1b[0m`);
const conLocal = sirven.filter((s) => s.conBalcarce > 0);
if (conLocal.length) {
  console.log(`  De ésas, ${conLocal.length} ya traen notas que mencionan Balcarce: ${conLocal.map((s) => s.nombre).join(', ')}`);
}
console.log('');

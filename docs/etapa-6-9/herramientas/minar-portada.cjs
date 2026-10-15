// Recorre la historia de web/data/portada.json y junta, por id, los pendientes (semaforo amarillo) y lo publicado.
const { execSync } = require('child_process');
const fs = require('fs');
const repo = process.argv[2];
const desde = process.argv[3] || '2026-09-25';
const salida = process.argv[4];
const log = execSync(`git -C "${repo}" log --since=${desde} --format=%H -- web/data/portada.json`, { maxBuffer: 1e8 }).toString().trim().split('\n');
const pend = {}; // id -> {seccion, motivo, titulo, primera, ultima, vecesVisto}
const publ = {}; // id -> {seccion, primera}
const espCuerpo = {};
let n = 0;
for (const h of log) {
  let j;
  try { j = JSON.parse(execSync(`git -C "${repo}" show ${h}:web/data/portada.json`, { maxBuffer: 1e8 }).toString()); } catch { continue; }
  n++;
  const g = j.generado;
  for (const p of j.pendientes ?? []) {
    const e = pend[p.id] ??= { seccion: p.seccion, motivo: p.motivo, titulo: p.titulo, primera: g, ultima: g, veces: 0, motivos: new Set() };
    e.veces++; e.motivos.add(p.motivo);
    if (g < e.primera) { e.primera = g; }
    if (g > e.ultima) { e.ultima = g; e.motivo = p.motivo; e.seccion = p.seccion; }
    if (!e.titulo && p.titulo) e.titulo = p.titulo;
  }
  for (const x of j.notas ?? []) {
    const e = publ[x.id] ??= { seccion: x.seccion, primera: g, titulo: x.titulo, local: x.local, oficial: x.oficial, medios: (x.medios || []).length };
    if (g < e.primera) e.primera = g;
  }
  const ec = j.esperandoCuerpo;
  if (Array.isArray(ec)) for (const x of ec) { const id = x.id ?? x; espCuerpo[id] ??= { primera: g, motivo: x.motivo, seccion: x.seccion }; }
}
for (const e of Object.values(pend)) e.motivos = [...e.motivos];
fs.writeFileSync(salida, JSON.stringify({ commits: n, desde, pend, publ, espCuerpo }, null, 0));
console.log('commits', n, 'pendientes', Object.keys(pend).length, 'publicadas', Object.keys(publ).length, 'espCuerpo', Object.keys(espCuerpo).length);

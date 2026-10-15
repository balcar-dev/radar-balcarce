// Una corrida de la ingesta SIN escribir nada (escribirArchivos:false, memoria:null) y sin IA.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const repo = process.argv[2];
const salida = process.argv[3];
const { ingestar } = await import(pathToFileURL(`${repo}/ingesta/ingesta.mjs`).href);
const r = await ingestar({ silencioso: true, escribirArchivos: false, memoria: null });
const notas = r.notas.map((n) => ({
  id: n.id, seccion: n.seccion, semaforo: n.semaforo, motivo: n.motivo, titulo: n.titulo,
  medios: (n.medios ?? []).length, local: !!n.local, alcance: n.alcance, oficial: !!n.oficial,
  inicio: String(n.cuerpo ?? '').slice(0, 600),
}));
writeFileSync(salida, JSON.stringify({ cuando: new Date().toISOString(), notas }, null, 1));
const c = {}; for (const n of notas) c[n.semaforo] = (c[n.semaforo] || 0) + 1;
console.log('notas', notas.length, c);

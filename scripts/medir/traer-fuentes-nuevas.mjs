// Trae lo que publican hoy las fuentes que se sumaron el 17/10/2026 (regla 211: ciencia, salud, educación y tecnología) y lo guarda en
// el mismo formato que las «crudas» de una lectura guardada (scripts/medir/informe-del-dia.mjs), para que
// scripts/medir/simular-popularidad.mjs pueda sumarlas a la lectura del viernes 16/10 y medir qué tendría cada sección.
//
//   node scripts/medir/traer-fuentes-nuevas.mjs                       lee los feeds ahora y escribe .cache/fuentes-nuevas.json
//   node scripts/medir/traer-fuentes-nuevas.mjs --salida=otro.json
//   node scripts/medir/traer-fuentes-nuevas.mjs --ids=unlp,unr        sólo esas
//
// Usa el mismo lector que la ingesta (parsearFeed). Sale a internet (sólo lee), no llama a ninguna IA y no escribe en web/data.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TODAS_LAS_FUENTES, paraPruebas } from '../../ingesta/ingesta.mjs';
import { decodificarPagina } from '../../ingesta/articulo.mjs';
import { parsearFeed } from '../../ingesta/ingesta.mjs';

const { motivoDeDescarte } = paraPruebas;
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..', '..');
const arg = (nombre) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3) ?? null;

/** Las fuentes que se sumaron o volvieron el 17/10/2026 (regla 211). */
export const IDS_NUEVAS = ['perfil-ciencia', 'jgm-ciencia', 'conae', 'inti', 'infobae-salud', 'perfil-salud', 'anmat', 'infobae-educacion',
  'perfil-educacion', 'unlp', 'unr', 'unicen', 'uncuyo', 'itsitio', 'senasa', 'lanacion-tecnologia', 'fayerwayer'];

const UA = 'RadarBalcarce/0.1 (agregador local de noticias de Balcarce)';

export async function traer(ids = IDS_NUEVAS) {
  const crudas = [];
  const estado = [];
  for (const id of ids) {
    const f = TODAS_LAS_FUENTES.find((x) => x.id === id);
    if (!f) { estado.push({ id, estado: 'no existe' }); continue; }
    try {
      const res = await fetch(f.url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) { estado.push({ id, estado: `HTTP ${res.status}` }); continue; }
      const notas = parsearFeed(decodificarPagina(await res.arrayBuffer()), f);
      for (const n of notas) {
        crudas.push({
          f: f.id, m: f.medio ?? f.nombre, t: n.titulo, e: n.enlace,
          d: n.fechaEstimada || !(n.fecha instanceof Date) || Number.isNaN(n.fecha.getTime()) ? null : n.fecha.toISOString(),
          x: motivoDeDescarte(n, f) ?? null, v: 0, r: (n.cuerpo ?? '').slice(0, 300),
        });
      }
      estado.push({ id, estado: 'ok', notas: notas.length });
    } catch (e) { estado.push({ id, estado: `error: ${e.message}` }); }
  }
  return { traido: new Date().toISOString(), estado, crudas };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ids = arg('ids') ? arg('ids').split(',') : IDS_NUEVAS;
  const salida = path.resolve(RAIZ, arg('salida') ?? '.cache/fuentes-nuevas.json');
  const r = await traer(ids);
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, JSON.stringify(r));
  for (const e of r.estado) console.log(`${e.id.padEnd(22)} ${e.estado}${e.notas != null ? ` · ${e.notas} notas` : ''}`);
  console.log(`\n${r.crudas.length} notas en total · escrito ${path.relative(RAIZ, salida)}`);
}

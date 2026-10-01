// Junta las auditorías de varias IA sobre el mes de "Un día como hoy" en UNA propuesta
// por día (1/10/2026, Hernán: "armá 2 o 3 agentes que auditen la nueva lista").
//
// Cada auditoría elige, para cada día, una principal, hasta tres "sí", hasta tres
// "opcional" y los "no", con el formato de `exportar-efemerides.mjs`:
//
//   AAAA-MM-DD | PRINCIPAL: id | SI: id, id | OPCIONAL: id, id | NO: id, id | MOTIVO: …
//
// La propuesta final sale por votos, con reglas fijas:
//
//   · Una principal vale 5 puntos, un "sí" 3 y un "opcional" 1; gana quien más suma
//     (con el puntaje de `efemerides.mjs` para desempatar).
//   · Veta la auditoría de riesgo (la tercera: su "no" y su lista de vetos) o dos
//     auditorías cualesquiera que digan "no". Lo vetado va a "no".
//   · Lo que tiene un error de datos (año o fecha mal) no entra como principal ni
//     como "sí". Lo que se sabe que murió hace años ("puede estar vivo" mal puesto
//     por el feed) no se veta por esa marca.
//   · Una fecha patria curada habla sola. Dentro del día no se repite el estilo si
//     hay de dónde elegir.
//   · Si ninguna auditoría opinó de un día, queda la propuesta automática por reglas.
//
// Uso:
//   node ingesta/combinar-auditorias.mjs A.txt B.txt RIESGO.txt [--errores=id,id] [--ya-murieron=id,id]
//
// Escribe `propuesta` en cada día de web/data/efemerides-candidatas.json. Sin dependencias.

import fs from 'node:fs';
import path from 'node:path';
import { proponerDia, motivoDe } from './efemerides-propuesta.mjs';

const PESOS = { principal: 5, si: 3, opcional: 1 };

const ids = (texto = '') => String(texto).split(',').map((x) => x.trim()).filter((x) => x && x !== '-');

/** Lee una auditoría: { 'AAAA-MM-DD': { principal, si, opcional, no, motivo } } y, si trae, la lista de vetos. */
export function leerAuditoria(texto = '', validos = new Set()) {
  const dias = {};
  for (const linea of String(texto).split(/\r?\n/)) {
    const m = linea.match(/^\s*(\d{4}-\d{2}-\d{2})\s*\|(.*)$/);
    if (!m) continue;
    const campos = {};
    for (const parte of m[2].split(' | ')) {
      const k = parte.match(/^\s*(PRINCIPAL|SI|S[IÍ]|OPCIONAL|NO|MOTIVO)\s*:\s*(.*)$/i);
      if (k) campos[k[1].toUpperCase().replace('Í', 'I')] = k[2].trim();
    }
    const filtrar = (lista) => ids(lista).filter((id) => validos.has(id));
    dias[m[1]] = {
      principal: filtrar(campos.PRINCIPAL)[0] ?? null,
      si: filtrar(campos.SI), opcional: filtrar(campos.OPCIONAL), no: filtrar(campos.NO), motivo: campos.MOTIVO ?? '',
    };
  }
  // La sección "VETOS": los identificadores que van antes de los dos puntos de cada renglón.
  const vetos = new Set();
  const desde = String(texto).search(/^\s*VETOS\b/m);
  if (desde >= 0) {
    const resto = String(texto).slice(desde);
    const hasta = resto.search(/^\s*ERRORES DE DATOS\b/m);
    for (const l of resto.slice(0, hasta > 0 ? hasta : undefined).split(/\r?\n/)) {
      const izquierda = l.includes(':') ? l.slice(0, l.indexOf(':')) : l;
      for (const tok of izquierda.match(/[0-9a-z]{2,8}/g) ?? []) if (validos.has(tok)) vetos.add(tok);
    }
  }
  return { dias, vetos };
}

/**
 * La propuesta de un día a partir de las auditorías.
 * @param {object[]} candidatas  las del día
 * @param {{ auditorias: object[], riesgo: number, errores: Set<string>, yaMurieron: Set<string> }} o
 */
export function consensoDelDia(fecha, candidatas, { auditorias, riesgo = auditorias.length - 1, errores = new Set(), yaMurieron = new Set(), ayer = null, anteayer = null }) {
  const automatica = proponerDia(candidatas, { ayer, anteayer });
  const patria = candidatas.find((c) => c.origen === 'curada' && c.estilo === 'patria');
  if (patria) return { ...automatica, fuente: 'fecha patria' };

  const opiniones = auditorias.map((a) => a.dias[fecha]).filter(Boolean);
  if (!opiniones.length) return { ...automatica, fuente: 'reglas' };

  const puntos = new Map();
  const noDe = new Map();
  opiniones.forEach((o) => {
    if (o.principal) puntos.set(o.principal, (puntos.get(o.principal) ?? 0) + PESOS.principal);
    for (const id of o.si) puntos.set(id, (puntos.get(id) ?? 0) + PESOS.si);
    for (const id of o.opcional) puntos.set(id, (puntos.get(id) ?? 0) + PESOS.opcional);
    for (const id of o.no) noDe.set(id, (noDe.get(id) ?? 0) + 1);
  });
  const porId = new Map(candidatas.map((c) => [c.id, c]));
  const delRiesgo = auditorias[riesgo];
  const vetada = (id) => {
    if (yaMurieron.has(id)) return false; // la marca "puede estar vivo" del feed estaba mal
    return (delRiesgo?.dias[fecha]?.no ?? []).includes(id) || (delRiesgo?.vetos?.has(id) ?? false) || (noDe.get(id) ?? 0) >= 2;
  };
  const orden = [...porId.values()]
    .filter((c) => (puntos.get(c.id) ?? 0) > 0)
    .sort((a, b) => (puntos.get(b.id) - puntos.get(a.id)) || (b.puntaje - a.puntaje));
  const buenas = orden.filter((c) => !vetada(c.id) && !errores.has(c.id));
  if (!buenas.length) return { ...automatica, fuente: 'reglas' };

  const principal = buenas[0];
  const resto = buenas.slice(1);
  const si = [];
  const estilos = new Set([principal.estilo]);
  for (const c of resto) { if (si.length < 3 && !estilos.has(c.estilo)) { si.push(c); estilos.add(c.estilo); } }
  for (const c of resto) { if (si.length < 3 && !si.includes(c)) si.push(c); }
  const opcionales = orden.filter((c) => !vetada(c.id) && c !== principal && !si.includes(c)).slice(0, 2);
  const descartadas = [...porId.keys()].filter((id) => vetada(id) && !yaMurieron.has(id));

  // El motivo de la principal es el de la primera auditoría que la eligió como principal.
  const motivos = {};
  const deLaAuditoria = opiniones.find((o) => o.principal === principal.id)?.motivo;
  motivos[principal.id] = deLaAuditoria || motivoDe(principal, { lugar: 'principal', ayer });
  for (const [i, c] of si.entries()) motivos[c.id] = motivoDe(c, { lugar: ['argentina', 'mundo', 'curiosa'][i] });
  for (const c of opcionales) motivos[c.id] = `${motivoDe(c, {})}${errores.has(c.id) ? ' ⚠ Confirmar el dato antes de usarla.' : ''}`;

  return {
    principal: principal.id, si: si.map((c) => c.id), opcionales: opcionales.map((c) => c.id), descartadas, motivos,
    estilo: principal.estilo, automatica: true, fuente: `consenso de ${opiniones.length} auditorías`,
    votos: Object.fromEntries([principal, ...si, ...opcionales].map((c) => [c.id, puntos.get(c.id)])),
  };
}

/** Todos los días, de corrido (cada uno mira el estilo de la principal de ayer y de anteayer). */
export function combinarMes(dias, opciones) {
  const salida = {};
  let ayer = null;
  let anteayer = null;
  for (const fecha of Object.keys(dias).sort()) {
    const p = consensoDelDia(fecha, dias[fecha].candidatas ?? [], { ...opciones, ayer, anteayer });
    salida[fecha] = p;
    anteayer = ayer;
    ayer = p.estilo;
  }
  return salida;
}

// ---------------------------------------------------------------- a mano

function main() {
  const RAIZ = path.join(import.meta.dirname, '..');
  const args = process.argv.slice(2);
  const archivos = args.filter((a) => !a.startsWith('--'));
  const lista = (nombre) => new Set(ids((args.find((a) => a.startsWith(`--${nombre}=`)) ?? '').split('=')[1]));
  if (archivos.length < 2) {
    console.error('Uso: node ingesta/combinar-auditorias.mjs A.txt B.txt RIESGO.txt [--errores=id,id] [--ya-murieron=id,id]');
    process.exit(2);
  }
  const ruta = path.join(RAIZ, 'web', 'data', 'efemerides-candidatas.json');
  const j = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  const validos = new Set(Object.values(j.dias).flatMap((d) => (d.candidatas ?? []).map((c) => c.id)));
  const auditorias = archivos.map((f) => leerAuditoria(fs.readFileSync(f, 'utf8'), validos));
  const propuestas = combinarMes(j.dias, { auditorias, riesgo: auditorias.length - 1, errores: lista('errores'), yaMurieron: lista('ya-murieron') });
  // --avisos=archivo.json: { id: "lo que hay que corregir al escribirla" } (lo que dejó la verificación): queda en el motivo.
  const rutaAvisos = (args.find((a) => a.startsWith('--avisos=')) ?? '').slice(9);
  const avisos = rutaAvisos ? JSON.parse(fs.readFileSync(rutaAvisos, 'utf8')) : {};
  for (const p of Object.values(propuestas)) {
    for (const id of [p.principal, ...(p.si ?? []), ...(p.opcionales ?? [])]) {
      if (id && avisos[id]) p.motivos[id] = `${p.motivos[id] ?? ''} ⚠ ${avisos[id]}`.trim();
    }
  }
  for (const [fecha, p] of Object.entries(propuestas)) j.dias[fecha].propuesta = p;
  const { dias, ...meta } = j;
  const renglones = Object.entries(dias).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',\n');
  fs.writeFileSync(ruta, `{${JSON.stringify(meta).slice(1, -1)},\n"dias":{\n${renglones}\n}}\n`.replace(/\n/g, '\r\n'));
  const fuentes = {};
  for (const p of Object.values(propuestas)) fuentes[p.fuente] = (fuentes[p.fuente] ?? 0) + 1;
  console.log(`Propuesta del mes escrita (${Object.keys(propuestas).length} días):`, fuentes);
}

if (process.argv[1] && process.argv[1].endsWith('combinar-auditorias.mjs')) main();

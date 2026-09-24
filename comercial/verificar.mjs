// Cruza los datos para ver qué comercios siguen vigentes.
//
//   node comercial/verificar.mjs [--sin-red]
//
// Para cada ficha junta las señales que se pueden ver desde afuera:
//   · si su sitio web responde;
//   · si las notas de los últimos 60 días de Radar Balcarce lo nombran;
//   · si figura en otra fuente independiente (hoy: el directorio de farmacias
//     del Colegio, que ya usamos para la farmacia de turno);
// y con eso saca el puntaje de vigencia (comercial/vigencia.mjs).
//
// Lo que NO hace, a propósito: entrar a Instagram o Facebook a mirar si el
// perfil existe. Esas redes no lo permiten sin iniciar sesión y hacerlo a la
// fuerza es contra sus condiciones. Confirmar por ahí lo hace una persona con
// un mensaje ("¿siguen abiertos?"), que además es el primer contacto comercial.

import fs from 'node:fs';
import path from 'node:path';
import { clave } from './esquema.mjs';
import { evaluarVigencia } from './vigencia.mjs';
import { leerBase, guardarBase, resumen } from './base.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

/** Nombres tan genéricos que no prueban nada si aparecen en una nota. */
const GENERICOS = new Set(['farmacia', 'kiosco', 'almacen', 'supermercado', 'panaderia', 'carniceria', 'ferreteria', 'peluqueria', 'restaurante', 'hotel', 'bar', 'cafe', 'banco', 'escuela', 'jardin', 'club']);

/** ¿El nombre del comercio aparece en el texto? Sólo si es un nombre propio
 *  reconocible: al menos 5 letras y no una palabra genérica sola. */
export function nombrado(nombre, textoClaveado) {
  const c = clave(nombre);
  if (c.length < 5 || GENERICOS.has(c)) return false;
  return ` ${textoClaveado} `.includes(` ${c} `);
}

/** Cuántas notas de los últimos `dias` días nombran a cada comercio. */
export function mencionesEnNotas(comercios, notas, ahora = new Date(), dias = 60) {
  const desde = ahora.getTime() - dias * 86400000;
  const textos = notas
    .filter((n) => !n.fecha || new Date(n.fecha).getTime() >= desde)
    .map((n) => clave(`${n.titulo ?? ''} ${n.copete ?? ''} ${n.cuerpo ?? ''}`));
  const r = {};
  for (const c of comercios) r[c.id] = textos.filter((t) => nombrado(c.nombre, t)).length;
  return r;
}

async function pruebaWeb(url) {
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(10000), headers: { 'user-agent': 'RadarBalcarce/1.0 (+https://radarbalcarce.com)' } });
    return { ok: r.status < 400, estado: r.status };
  } catch {
    return { ok: false, estado: null };
  }
}

if (process.argv[1]?.endsWith('verificar.mjs')) {
  const sinRed = process.argv.includes('--sin-red');
  const ahora = new Date();
  const base = leerBase();
  let portada = { notas: [], farmacias: {} };
  try { portada = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'portada.json'), 'utf8')); } catch { /* sin portada */ }

  const menciones = mencionesEnNotas(base.comercios, portada.notas ?? [], ahora);
  const farmaciasDelColegio = new Set((portada.farmacias?.hoy?.detalle ?? []).map((f) => clave(f.nombre)));

  let n = 0;
  for (const c of base.comercios) {
    const web = !sinRed && c.contacto?.web ? await pruebaWeb(c.contacto.web) : null;
    c.vigencia = evaluarVigencia(c, {
      web,
      mencionesEnNotas: menciones[c.id],
      enOtraFuente: c.rubro === 'Salud y farmacias' && [...farmaciasDelColegio].some((f) => f && clave(c.nombre).includes(f)),
    }, ahora);
    n += 1;
  }
  base.actualizado = ahora.toISOString();
  guardarBase(base);
  const r = resumen(base);
  console.log(`  ${n} comercios verificados. Estados: ${JSON.stringify(r.porEstado)}`);
}

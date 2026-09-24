// La base de comercios: un archivo JSON, con cuidado para no perder lo que se
// cargó a mano.
//
// Hoy es un archivo (comercial/datos/comercios.json) porque es lo más simple
// y se puede leer, editar y revisar en git. Cuando pase de unos cientos de
// fichas o haga falta que varias personas editen a la vez, se pasa a SQLite
// (node:sqlite ya viene con Node) sin cambiar el resto: todo pasa por acá.
//
// La regla de la fusión: lo que viene de una fuente automática (OpenStreetMap)
// completa lo que falta y actualiza lo que ella misma escribió, pero NUNCA
// pisa un dato que una persona cargó o corrigió (marcado en `manual`).

import fs from 'node:fs';
import path from 'node:path';
import { clave } from './esquema.mjs';

export const ARCHIVO = path.join(import.meta.dirname, 'datos', 'comercios.json');

export function leerBase(archivo = ARCHIVO) {
  try {
    return JSON.parse(fs.readFileSync(archivo, 'utf8'));
  } catch {
    return { version: 1, actualizado: null, comercios: [] };
  }
}

export function guardarBase(base, archivo = ARCHIVO) {
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  base.comercios.sort((a, b) => a.rubro.localeCompare(b.rubro, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
  fs.writeFileSync(archivo, `${JSON.stringify(base, null, 2)}\n`);
}

/** Los campos que una fuente automática puede actualizar. */
const CAMPOS_AUTOMATICOS = [
  ['rubro'], ['tipo'], ['horarios'],
  ['direccion', 'calle'], ['direccion', 'numero'], ['direccion', 'texto'],
  ['ubicacion'],
  ['contacto', 'telefono'], ['contacto', 'email'], ['contacto', 'web'],
  ['redes', 'instagram'], ['redes', 'facebook'],
];

const leer = (o, ruta) => ruta.reduce((x, k) => x?.[k], o);
function poner(o, ruta, valor) {
  let x = o;
  for (const k of ruta.slice(0, -1)) x = (x[k] ??= {});
  x[ruta.at(-1)] = valor;
}

/**
 * Suma una ficha nueva a la base o la fusiona con la que ya existe.
 * Devuelve 'nueva', 'actualizada' o 'igual'.
 */
export function fusionar(base, nueva) {
  const previa = base.comercios.find((c) => c.id === nueva.id)
    // El mismo lugar puede venir de otra fuente: mismo nombre y misma dirección.
    ?? base.comercios.find((c) => clave(c.nombre) === clave(nueva.nombre) && c.direccion?.texto && clave(c.direccion.texto) === clave(nueva.direccion?.texto));

  if (!previa) {
    base.comercios.push(nueva);
    return 'nueva';
  }
  let cambio = false;
  const manual = new Set(previa.manual ?? []);
  for (const ruta of CAMPOS_AUTOMATICOS) {
    const nombreCampo = ruta.join('.');
    const valor = leer(nueva, ruta);
    if (manual.has(nombreCampo) || valor == null) continue;
    if (JSON.stringify(leer(previa, ruta)) !== JSON.stringify(valor)) { poner(previa, ruta, valor); cambio = true; }
  }
  for (const f of nueva.fuentes ?? []) {
    const i = previa.fuentes.findIndex((x) => x.tipo === f.tipo && x.id === f.id);
    if (i < 0) { previa.fuentes.push(f); cambio = true; } else if (previa.fuentes[i].editadoEnOSM !== f.editadoEnOSM) { previa.fuentes[i] = f; cambio = true; }
  }
  if (nueva.vigencia?.estado === 'cerrado' && previa.vigencia?.estado !== 'cerrado') { previa.vigencia = nueva.vigencia; cambio = true; }
  if (cambio) previa.actualizado = nueva.actualizado;
  return cambio ? 'actualizada' : 'igual';
}

/** Un dato cargado a mano: queda protegido de las fuentes automáticas. */
export function cargarAMano(ficha, campo, valor, ahora = new Date()) {
  poner(ficha, campo.split('.'), valor);
  ficha.manual = [...new Set([...(ficha.manual ?? []), campo])];
  ficha.actualizado = ahora.toISOString();
  return ficha;
}

/** Números para saber cómo viene la base. */
export function resumen(base) {
  const c = base.comercios;
  const cuenta = (f) => c.filter(f).length;
  const porRubro = {};
  for (const x of c) porRubro[x.rubro] = (porRubro[x.rubro] ?? 0) + 1;
  return {
    total: c.length,
    conTelefono: cuenta((x) => x.contacto?.telefono || x.contacto?.whatsapp),
    conDireccion: cuenta((x) => x.direccion?.texto),
    conMapa: cuenta((x) => x.ubicacion),
    conRedes: cuenta((x) => x.redes?.instagram || x.redes?.facebook),
    conWeb: cuenta((x) => x.contacto?.web),
    conHorarios: cuenta((x) => x.horarios),
    porEstado: c.reduce((a, x) => ({ ...a, [x.vigencia?.estado ?? 'sin-verificar']: (a[x.vigencia?.estado ?? 'sin-verificar'] ?? 0) + 1 }), {}),
    confirmados: cuenta((x) => x.comercial?.confirmadoPorElComercio),
    porRubro,
  };
}

// Lo que el panel del celular le pide a GitHub (29/09): que la IA escriba o
// reescriba una nota. Lo corre el workflow "Panel del celular" (panel.yml), que
// el celular dispara con la llave de quien lo usa.
//
//   node panel/celular.mjs escribir --id=abc123 [--pedido="más corta"]
//   node panel/celular.mjs pista --id=pista1a2b3c4d --pedido="el texto de la pista"   (1/10: el informe de una pista, ingesta/pistas.mjs)
//
// Busca la nota (lo que espera a una persona, en la caché de Actions que deja
// "Actualizar la web"; lo publicado o lo que espera cuerpo, en web/data/), la
// escribe con IA (panel/reescribir-una.mjs) y deja el borrador CIFRADO para los
// celulares registrados en web/data/celular-borradores.json (panel/cifrado.mjs):
// el repositorio es público y el registro de Actions también, así que acá no se
// imprime nada de la nota, sólo si salió o no.
//
// El borrador no se publica solo: lo lee una persona en el celular y decide.
// Sin dependencias.

import fs from 'node:fs';
import path from 'node:path';
import { leerJson } from '../ingesta/json.mjs';
import { reescribirUna, notaDesdeLoPublicado } from './reescribir-una.mjs';
import { cerrar, leerLlaves } from './cifrado.mjs';
import { PEDIDO_MAXIMO } from '../reels/reescritura.mjs';
import { investigarPista, PISTA } from '../ingesta/pistas.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const DATOS = path.join(RAIZ, 'web', 'data');
export const ARCHIVO_BORRADORES = path.join(DATOS, 'celular-borradores.json');
export const ARCHIVO_LLAVES = path.join(DATOS, 'celular-llaves.json');
// La deja "Actualizar la web" (web/scripts/generar-datos.mjs) en la caché de Actions.
export const NOTAS_EN_CACHE = path.join(RAIZ, '.cache', 'celular-notas.json');

/** Cuántos borradores se guardan, y por cuántos días. */
export const BORRADORES = { maximo: 30, dias: 7 };

/** Un identificador de nota: sólo letras y números (idDe, ingesta/ingesta.mjs). */
export const idValido = (id) => /^[a-z0-9]{3,20}$/.test(String(id ?? ''));

/** Busca la nota: primero lo que trajo la ingesta (con sus fuentes enteras). */
export function buscarNota(id, { enCache = null, portada = null, esperando = null, archivo = null } = {}) {
  const deLaIngesta = enCache?.notas?.find((n) => n.id === id);
  if (deLaIngesta) return { nota: deLaIngesta, de: 'ingesta' };
  for (const [lista, de] of [[portada?.notas, 'portada'], [esperando?.notas, 'esperando'], [archivo?.notas, 'archivo']]) {
    const n = (lista ?? []).find((x) => x.id === id);
    if (n) return { nota: notaDesdeLoPublicado(n), de };
  }
  return null;
}

/**
 * Suma un borrador (ya cerrado) al archivo y poda los viejos. Cada borrador es
 * un sobre propio: así se agrega uno sin tener que abrir los demás.
 */
export function conBorrador(archivo, id, sobre, ahora = new Date()) {
  const lista = { ...(archivo?.borradores ?? {}), [id]: { ...sobre, cuando: ahora.toISOString() } };
  const desde = ahora.getTime() - BORRADORES.dias * 864e5;
  const quedan = Object.entries(lista)
    .filter(([, b]) => Date.parse(b.cuando) >= desde)
    .sort((a, b) => Date.parse(b[1].cuando) - Date.parse(a[1].cuando))
    .slice(0, BORRADORES.maximo);
  return { version: 1, borradores: Object.fromEntries(quedan) };
}

async function main() {
  const [accion] = process.argv.slice(2);
  const opcion = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? '';
  const id = opcion('id').trim();
  const pedido = opcion('pedido').replace(/\s+/g, ' ').trim().slice(0, accion === 'pista' ? PISTA.maximoDeTexto : PEDIDO_MAXIMO);
  if (!['escribir', 'pista'].includes(accion) || !idValido(id)) {
    console.log('Uso: node panel/celular.mjs escribir --id=<nota> [--pedido="…"]  ·  node panel/celular.mjs pista --id=<pista…> --pedido="…"');
    process.exit(1);
  }
  const llaves = leerLlaves(leerJson(ARCHIVO_LLAVES, null));
  if (!llaves.length) {
    console.log('No hay ningún celular registrado (web/data/celular-llaves.json): no hay a quién mandarle el borrador.');
    process.exit(1);
  }

  if (accion === 'pista') {
    // Lo nuestro, para ver si ya lo tenemos: la portada, el archivo y lo que trajo la ingesta.
    const notas = [
      ...(leerJson(NOTAS_EN_CACHE, null)?.notas ?? []),
      ...(leerJson(path.join(DATOS, 'portada.json'), null)?.notas ?? []),
      ...(leerJson(path.join(DATOS, 'archivo.json'), null)?.notas ?? []),
    ];
    const informe = await investigarPista(pedido, { notas });
    const guardado = conBorrador(leerJson(ARCHIVO_BORRADORES, null), id, cerrar({ id, tipo: 'pista', ...informe }, llaves));
    fs.writeFileSync(ARCHIVO_BORRADORES, `${JSON.stringify(guardado, null, 1)}\n`, 'utf8');
    // Al registro, nada de la pista: sólo si se pudo investigar.
    console.log(informe.ok ? `Informe de la pista listo (${id}).` : `La pista ${id} no se investigó (el motivo va cifrado al celular).`);
    return;
  }

  const encontrada = buscarNota(id, {
    enCache: leerJson(NOTAS_EN_CACHE, null),
    portada: leerJson(path.join(DATOS, 'portada.json'), null),
    esperando: leerJson(path.join(DATOS, 'esperando-cuerpo.json'), null),
    archivo: leerJson(path.join(DATOS, 'archivo.json'), null),
  });
  let borrador;
  if (!encontrada) {
    borrador = { id, pedido, ok: false, motivo: 'No encontré la nota: puede que la ingesta ya no la traiga. Probá después de la próxima actualización.', problemas: [] };
  } else {
    const r = await reescribirUna(encontrada.nota, {
      pedido, archivo: leerJson(path.join(DATOS, 'archivo.json'), { notas: [] }).notas ?? [],
    });
    borrador = { id, pedido, de: encontrada.de, ...r, seccion: encontrada.nota.seccion ?? null };
  }
  const archivo = conBorrador(leerJson(ARCHIVO_BORRADORES, null), id, cerrar(borrador, llaves));
  fs.writeFileSync(ARCHIVO_BORRADORES, `${JSON.stringify(archivo, null, 1)}\n`, 'utf8');
  // Al registro, nada de la nota: sólo si salió.
  console.log(borrador.ok ? `Borrador listo para ${id}.` : `Borrador de ${id} con avisos o sin texto (el detalle va cifrado al celular).`);
}

if (process.argv[1] && process.argv[1].endsWith('celular.mjs')) {
  await main().catch((e) => {
    console.error(`El panel del celular no pudo terminar: ${e?.message ?? e}`);
    process.exit(1);
  });
}

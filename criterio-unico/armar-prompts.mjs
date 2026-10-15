// Arma cada prompt juntando bloques de CRITERIO-UNICO.md.
// Node 22, sin dependencias. No llama a ninguna IA ni usa claves.
//
//   node criterio-unico/armar-prompts.mjs
//
// Escribe criterio-unico/prompts-armados/<nombre>.txt, escribe
// criterio-unico/CRITERIO-UNICO-CON-NUMEROS.md (el documento con los números ya puestos) y muestra
// una tabla con los caracteres de cada prompt armado contra el actual.
// No modifica nada del repositorio fuera de criterio-unico/.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ = path.join(AQUI, '..');
export const RUTA_DOC = path.join(AQUI, 'CRITERIO-UNICO.md');

/**
 * Qué bloques arma cada prompt (matriz de la sección 6.2 del inventario).
 * 'B18' no se pega: es la tabla de números, de donde salen los {{CLAVE}}.
 * `rellenar`: un hueco {{x}} que se llena con otro bloque (la nota de pista lleva B8.pista dentro del pedido).
 * Los huecos sin punto ({{pedido}}, {{fallas}}) los llena el programa que usa el prompt, en el momento.
 */
export const PROMPTS = {
  'redactor-ameno': { bloques: ['B0', 'B1', 'B5', 'B5.texto', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B13.ameno', 'B14', 'B15', 'B18', 'B19.redactor'] },
  'redactor-serio': { bloques: ['B0', 'B1', 'B5', 'B5.texto', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B13.serio', 'B14', 'B15', 'B18', 'B19.redactor'] },
  'nota-de-pista': {
    bloques: ['B0', 'B1', 'B5', 'B5.texto', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13', 'B13.ameno', 'B14', 'B15', 'B18', 'B19.redactor', 'B19.pedido'],
    rellenar: { pedido: 'B8.pista' },
  },
  'pedido-de-la-redaccion': { bloques: ['B19.pedido'] },
  'correccion-obligatoria': { bloques: ['B18', 'B19.correccion'] },
  lectura: { bloques: ['B0.corto', 'B1', 'B2', 'B3', 'B4', 'B7', 'B18', 'B19.lectura'] },
  parejas: { bloques: ['B0.corto', 'B6', 'B19.parejas'] },
  repetidas: { bloques: ['B0.corto', 'B6', 'B19.repetidas'] },
  auditoria: { bloques: ['B0.corto', 'B3', 'B5', 'B5.texto', 'B17', 'B19.auditoria'] },
  fotos: { bloques: ['B0.corto', 'B5', 'B16', 'B19.fotos'] },
  'persona-publica': { bloques: ['B0.corto', 'B19.persona'] },
  'pistas-consultas': { bloques: ['B0.corto', 'B19.consultas'] },
  'pistas-matices': { bloques: ['B0.corto', 'B19.matices'] },
  'voz-manana': { bloques: ['B21.base', 'B21.manana'] },
  'voz-tarde': { bloques: ['B21.base', 'B21.tarde'] },
  'voz-noche': { bloques: ['B21.base', 'B21.noche'] },
};

/** Huecos que llena el programa que usa el prompt, no este script. */
export const HUECOS_DE_EJECUCION = ['pedido', 'fallas'];

/** Los bloques que sólo son para personas: no entran en ningún prompt. */
export const BLOQUES_SOLO_PERSONAS = ['B20'];

const SIN_MARCAS = (t) => t
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/[ \t]*\[A CONFIRMAR[^\]]*\]/g, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

export function leerDocumento(ruta = RUTA_DOC) {
  return fs.readFileSync(ruta, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

/**
 * Los bloques del documento. Devuelve { bloques: Map(id → texto crudo), problemas: [] }.
 * Un bloque que no cierra, que se repite o que está adentro de otro es un problema.
 */
export function leerBloques(doc) {
  const bloques = new Map();
  const problemas = [];
  const marca = /<!-- BLOQUE:([\w.]+):(INICIO|FIN) -->/g;
  let abierto = null;
  let desde = 0;
  let m;
  while ((m = marca.exec(doc))) {
    const [todo, id, tipo] = m;
    if (tipo === 'INICIO') {
      if (abierto) problemas.push(`el bloque ${id} empieza adentro de ${abierto}`);
      if (bloques.has(id)) problemas.push(`el bloque ${id} está repetido`);
      abierto = id;
      desde = m.index + todo.length;
    } else {
      if (abierto !== id) problemas.push(`el FIN de ${id} no corresponde al bloque abierto (${abierto ?? 'ninguno'})`);
      else bloques.set(id, doc.slice(desde, m.index).trim());
      abierto = null;
    }
  }
  if (abierto) problemas.push(`el bloque ${abierto} no cierra`);
  return { bloques, problemas };
}

/** La tabla de números (bloque B18): Map(clave → valor en texto). */
export function leerNumeros(crudoB18) {
  const numeros = new Map();
  const repetidas = [];
  for (const linea of String(crudoB18 ?? '').split('\n')) {
    const m = linea.match(/^\|\s*(.+?)\s*\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|/);
    if (!m) continue;
    if (numeros.has(m[3])) repetidas.push(m[3]);
    numeros.set(m[3], m[2]);
  }
  return { numeros, repetidas };
}

/** Reemplaza {{CLAVE}} por el valor de la tabla. Los huecos sin punto se dejan. Devuelve { texto, faltan }. */
export function ponerNumeros(texto, numeros) {
  const faltan = [];
  const salida = texto.replace(/\{\{([^}]+)\}\}/g, (todo, clave) => {
    if (!clave.includes('.') && !clave.includes('_')) return todo;
    if (numeros.has(clave)) return numeros.get(clave);
    faltan.push(clave);
    return todo;
  });
  return { texto: salida, faltan };
}

/** Arma un prompt. Devuelve { texto, faltan, bloquesFaltantes }. */
export function armar(nombre, bloques, numeros) {
  const def = PROMPTS[nombre];
  if (!def) throw new Error(`no hay un prompt llamado ${nombre}`);
  const partes = [];
  const bloquesFaltantes = [];
  for (const id of def.bloques) {
    if (id === 'B18') continue;
    if (!bloques.has(id)) { bloquesFaltantes.push(id); continue; }
    let cuerpo = SIN_MARCAS(bloques.get(id));
    for (const [hueco, origen] of Object.entries(def.rellenar ?? {})) {
      if (id === 'B19.pedido') {
        if (!bloques.has(origen)) bloquesFaltantes.push(origen);
        else cuerpo = cuerpo.replace(`{{${hueco}}}`, SIN_MARCAS(bloques.get(origen)));
      }
    }
    partes.push(cuerpo);
  }
  const { texto, faltan } = ponerNumeros(partes.join('\n\n'), numeros);
  return { texto, faltan, bloquesFaltantes };
}

// ---------------------------------------------------------------- los prompts actuales (para comparar)

const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n?/g, '\n');

/** El texto de una plantilla `...` del código, evaluada con los datos de prueba. Sólo código del propio repositorio. */
function plantilla(fuente, desdeTexto, variables = {}) {
  const i = fuente.indexOf(desdeTexto);
  if (i < 0) throw new Error(`no encontré "${desdeTexto.slice(0, 40)}"`);
  const ini = fuente.indexOf('`', i);
  let fin = ini + 1;
  while (fin < fuente.length && !(fuente[fin] === '`' && fuente[fin - 1] !== '\\')) fin += 1;
  const cuerpo = fuente.slice(ini + 1, fin);
  const nombres = Object.keys(variables);
  // eslint-disable-next-line no-new-func
  return new Function(...nombres, `return \`${cuerpo}\`;`)(...Object.values(variables));
}

/** { nombre: caracteres } de los prompts que rigen hoy. Lee el código como texto: no importa módulos con efectos. */
export async function medirActuales() {
  const actual = {};
  const { leerCriterio } = await import(pathToFileURL(path.join(RAIZ, 'ingesta', 'prompt-editorial.mjs')).href); // sólo lee un archivo
  const c = leerCriterio();
  const ameno = c.reglas.replace('{{TONO}}', () => c.tonoAmeno);
  const serio = c.reglas.replace('{{TONO}}', () => c.tonoSerio);
  actual['redactor-ameno'] = ameno.length;
  actual['redactor-serio'] = serio.length;

  const reesc = leer('reels/reescritura.mjs');
  const pedidoVacio = plantilla(reesc, 'PEDIDO DE LA REDACCIÓN', { delEditor: '' });
  const pedidoDePista = leer('panel/nota-de-pista.mjs').match(/PEDIDO_DE_PISTA = '([^']*)'/)?.[1] ?? '';
  const pedidoConPista = plantilla(reesc, 'PEDIDO DE LA REDACCIÓN', { delEditor: pedidoDePista });
  actual['nota-de-pista'] = ameno.length + 2 + pedidoConPista.length;
  actual['pedido-de-la-redaccion'] = pedidoVacio.length;
  actual['correccion-obligatoria'] = plantilla(reesc, 'CORRECCIÓN OBLIGATORIA', {
    correccion: [], CUERPO: { palabrasPedidasMinimo: 70, palabrasPedidasMaximo: 180 },
  }).length;

  const lect = leer('ingesta/lectura-ia.mjs');
  const perfil = leer('ingesta/perfil-balcarce.md');
  const instLectura = plantilla(lect, 'const INSTRUCCION = ');
  actual.lectura = `${instLectura}\n\n--- PERFIL DE BALCARCE ---\n${perfil}\n\n--- NOTAS ---\n`.length;
  actual.parejas = plantilla(lect, 'const INSTRUCCION_PAREJAS = ').length;
  actual.repetidas = plantilla(lect, 'const INSTRUCCION_REPETIDAS = ').length;

  const aud = leer('ingesta/auditoria-ia.mjs');
  const secciones = aud.match(/SECCIONES_VALIDAS = \[([\s\S]*?)\]/)[1].replace(/['\s]/g, '').split(',').filter(Boolean);
  actual.auditoria = plantilla(aud, 'const INSTRUCCION = ', { SECCIONES_VALIDAS: secciones }).length;

  const fot = leer('ingesta/fotos.mjs');
  actual.fotos = plantilla(fot, 'return `Sos el editor de fotos', { lista: '', nota: { titulo: '', seccion: '' } }).length;
  actual['persona-publica'] = plantilla(fot, 'const texto = `Mirá el título', { nota: { titulo: '', copete: '' } }).length;

  const pis = leer('ingesta/pistas.mjs');
  actual['pistas-consultas'] = plantilla(pis, 'const INSTRUCCION_CONSULTAS = ').length;
  actual['pistas-matices'] = plantilla(pis, 'const INSTRUCCION_MATICES = ').length;

  const redes = leer('CRITERIO-REDES.md');
  const marca = (n) => redes.match(new RegExp(`<!-- VOZ:${n}:INICIO -->\\n([\\s\\S]*?)\\n<!-- VOZ:${n}:FIN -->`))?.[1].trim() ?? '';
  for (const [nombre, clave] of [['voz-manana', 'MANANA'], ['voz-tarde', 'TARDE'], ['voz-noche', 'NOCHE']]) {
    actual[nombre] = marca('BASE').length + 1 + marca(clave).length;
  }
  return actual;
}

// ---------------------------------------------------------------- programa principal

async function principal() {
  const doc = leerDocumento();
  const { bloques, problemas } = leerBloques(doc);
  if (problemas.length) {
    console.error('El documento tiene problemas:\n- ' + problemas.join('\n- '));
    process.exitCode = 1;
    return;
  }
  const { numeros } = leerNumeros(bloques.get('B18'));
  const salida = path.join(AQUI, 'prompts-armados');
  fs.mkdirSync(salida, { recursive: true });
  const actuales = await medirActuales();

  const filas = [];
  let mal = false;
  for (const nombre of Object.keys(PROMPTS)) {
    const { texto, faltan, bloquesFaltantes } = armar(nombre, bloques, numeros);
    if (faltan.length || bloquesFaltantes.length) {
      mal = true;
      console.error(`${nombre}: faltan números ${faltan.join(', ') || '-'} / bloques ${bloquesFaltantes.join(', ') || '-'}`);
    }
    fs.writeFileSync(path.join(salida, `${nombre}.txt`), `${texto}\n`, 'utf8');
    const a = actuales[nombre];
    filas.push({ nombre, armado: texto.length, actual: a, dif: a ? Math.round(((texto.length - a) / a) * 100) : null });
  }

  // El documento con los números puestos, para leerlo sin llaves.
  const legible = ponerNumeros(doc, numeros).texto;
  fs.writeFileSync(path.join(AQUI, 'CRITERIO-UNICO-CON-NUMEROS.md'), legible, 'utf8');

  const ancho = Math.max(...filas.map((f) => f.nombre.length));
  console.log(`${'prompt'.padEnd(ancho)}  ${'armado'.padStart(7)}  ${'actual'.padStart(7)}  diferencia`);
  for (const f of filas) {
    console.log(`${f.nombre.padEnd(ancho)}  ${String(f.armado).padStart(7)}  ${String(f.actual ?? '-').padStart(7)}  ${f.dif == null ? '-' : `${f.dif > 0 ? '+' : ''}${f.dif} %`}`);
  }
  console.log(`\nEscritos ${filas.length} prompts en ${salida}`);
  if (mal) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await principal();

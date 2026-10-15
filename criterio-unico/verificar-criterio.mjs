// Controla CRITERIO-UNICO.md y la matriz de prompts. Node 22, sin dependencias.
//
//   node criterio-unico/verificar-criterio.mjs
//
// Chequea:
//   1. que cada bloque exista, abra y cierre una sola vez, y que estén B0 a B21;
//   2. que cada prompt pida sólo bloques que existen (y que B20 no vaya a ninguna IA);
//   3. que ningún bloque repita una secuencia de 12 palabras de otro;
//   4. que cada número de la tabla esté definido una sola vez y no aparezca escrito a mano en el texto;
//   5. que los prompts armados queden sin huecos, sin marcas "A CONFIRMAR" y sin lo que se decidió borrar.
// Termina con código 1 si algo falla.

import {
  PROMPTS, BLOQUES_SOLO_PERSONAS, HUECOS_DE_EJECUCION, leerDocumento, leerBloques, leerNumeros, armar,
} from './armar-prompts.mjs';

const errores = [];
const avisos = [];
const falla = (m) => errores.push(m);

const doc = leerDocumento();
const { bloques, problemas } = leerBloques(doc);
problemas.forEach(falla);

// 1. B0 a B21 tienen que estar (los sub-bloques como B19.lectura son aparte).
for (let i = 0; i <= 21; i += 1) {
  const hay = [...bloques.keys()].some((k) => k === `B${i}` || k.startsWith(`B${i}.`));
  if (!hay) falla(`falta el bloque B${i}`);
}
for (const [id, texto] of bloques) if (!texto.trim()) falla(`el bloque ${id} está vacío`);

// 2. cada prompt pide sólo bloques que existen
for (const [nombre, def] of Object.entries(PROMPTS)) {
  const pedidos = [...def.bloques, ...Object.values(def.rellenar ?? {})];
  for (const id of pedidos) {
    if (!bloques.has(id)) falla(`el prompt "${nombre}" pide el bloque ${id}, que no existe`);
    if (BLOQUES_SOLO_PERSONAS.includes(id)) falla(`el prompt "${nombre}" pide ${id}, que es sólo para personas`);
  }
}
const usados = new Set(Object.values(PROMPTS).flatMap((d) => [...d.bloques, ...Object.values(d.rellenar ?? {})]));
for (const id of bloques.keys()) {
  if (!usados.has(id) && !BLOQUES_SOLO_PERSONAS.includes(id)) avisos.push(`el bloque ${id} no lo usa ningún prompt`);
}

// 3. ninguna secuencia de 12 palabras repetida entre bloques distintos
const LARGO = 12;
const palabras = (t) => t
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .toLowerCase()
  .split(/[^\p{L}\p{N}]+/u)
  .filter(Boolean);
const vistas = new Map();
for (const [id, texto] of bloques) {
  if (id === 'B18') continue; // la tabla repite a propósito "Medios que tienen que contar…" y es un solo bloque
  const p = palabras(texto);
  const propias = new Set();
  for (let i = 0; i + LARGO <= p.length; i += 1) {
    const g = p.slice(i, i + LARGO).join(' ');
    if (propias.has(g)) continue;
    propias.add(g);
    if (vistas.has(g) && vistas.get(g) !== id) falla(`los bloques ${vistas.get(g)} y ${id} repiten ${LARGO} palabras seguidas: "${g}"`);
    else if (!vistas.has(g)) vistas.set(g, id);
  }
}

// 4. números: una sola definición por clave, y nada escrito a mano fuera de la tabla
const { numeros, repetidas } = leerNumeros(bloques.get('B18'));
repetidas.forEach((k) => falla(`la clave ${k} está dos veces en la tabla de números`));
if (numeros.size < 50) falla(`la tabla de números parece incompleta (${numeros.size} filas)`);

const usadasEnTexto = new Set();
const UNIDADES = '(?:caracteres|palabras|frases|p[aá]rrafos|medios|segundos|minutos|horas|d[ií]as|puntos|datos|intentos|notas|pedidos|%|por ciento)';
const valores = new Set([...numeros.values()].map((v) => String(v)));
for (const [id, crudo] of bloques) {
  if (id === 'B18') continue;
  const texto = crudo.replace(/<!--[\s\S]*?-->/g, '');
  for (const m of texto.matchAll(/\{\{([^}]+)\}\}/g)) {
    const clave = m[1];
    if (HUECOS_DE_EJECUCION.includes(clave)) continue;
    usadasEnTexto.add(clave);
    if (!numeros.has(clave)) falla(`el bloque ${id} usa {{${clave}}}, que no está en la tabla de números`);
  }
  const sinLlaves = texto.replace(/\{\{[^}]+\}\}/g, ' ');
  for (const m of sinLlaves.matchAll(new RegExp(`(?<![\\d.,])(\\d+(?:[.,]\\d+)?)\\s*${UNIDADES}\\b`, 'giu'))) {
    if (valores.has(m[1])) falla(`el bloque ${id} escribe a mano el número de la tabla "${m[0]}": usar la llave {{CLAVE}}`);
    else avisos.push(`el bloque ${id} tiene un número que no está en la tabla: "${m[0]}"`);
  }
}
for (const clave of numeros.keys()) {
  if (!usadasEnTexto.has(clave) && !/^(REESCRITURA|PORTADA|NOTA_DEL|MEDIOS|CUPO|FACEBOOK|PIEZAS|CONTRATO|CRUCE|REPETIDAS|PAREJAS|LECTURA|AUDITORIA|FOTOS|SEMAFORO|ESTILO|COPIA_MAXIMA|CUERPO\.(minimo|aviso|maximo|parrafos)|TITULO\.maximo|BAJADA\.maximo|GUION\.maximo|PARTES\.(clave|dato|aporte|etiqueta)\b)/.test(clave)) {
    avisos.push(`la clave ${clave} está en la tabla pero ningún bloque la usa`);
  }
}

// 5. prompts armados
const PROHIBIDO = [
  [/A CONFIRMAR/, 'quedó una marca A CONFIRMAR'],
  [/declaraci[oó]n(es)? de parte/i, 'nombra "declaración de parte" (se decidió borrarla)'],
  [/atribu[ií] cada dato al medio/i, 'manda atribuir al medio (se decidió: a la fuente en general)'],
  [/\bnivel\b.*ALTA/i, 'le pide a la IA un "nivel" de verificación'],
  [/<!--/, 'quedó una marca HTML'],
];
for (const nombre of Object.keys(PROMPTS)) {
  const { texto, faltan, bloquesFaltantes } = armar(nombre, bloques, numeros);
  faltan.forEach((k) => falla(`el prompt "${nombre}" tiene el número {{${k}}} sin resolver`));
  bloquesFaltantes.forEach((b) => falla(`el prompt "${nombre}" no pudo juntar ${b}`));
  for (const m of texto.matchAll(/\{\{([^}]+)\}\}/g)) {
    if (!HUECOS_DE_EJECUCION.includes(m[1])) falla(`el prompt "${nombre}" quedó con el hueco {{${m[1]}}}`);
  }
  for (const [re, que] of PROHIBIDO) if (re.test(texto)) falla(`el prompt "${nombre}": ${que}`);
  if (!/Tarea:|Estilo|Calm|It is the/.test(texto) && !nombre.startsWith('pedido') && !nombre.startsWith('correccion') && !nombre.startsWith('voz')) {
    avisos.push(`el prompt "${nombre}" no tiene un bloque de tarea`);
  }
}
if (/declaraci[oó]n(es)? de parte/i.test(doc)) falla('el documento nombra "declaración de parte" (se decidió borrarla)');

avisos.forEach((a) => console.log(`aviso: ${a}`));
if (errores.length) {
  console.error(`\nFALLA (${errores.length}):`);
  errores.forEach((e) => console.error(`- ${e}`));
  process.exit(1);
}
console.log(`\nOK: ${bloques.size} bloques, ${numeros.size} números, ${Object.keys(PROMPTS).length} prompts.`);

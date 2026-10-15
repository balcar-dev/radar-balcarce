// Etiqueta a mano (Claude, leyendo título y resumen) los pares de candidatos-pares.json y arma pares-200.json.
//   node pruebas-modelos/etiquetar-pares.mjs
// "mismo: true" = cuentan EXACTAMENTE el mismo hecho. Ante la duda, false (como pide el criterio del sistema).
// Es la "verdad" de esta prueba: es una lectura nuestra, no una verdad oficial. Los casos dudosos están marcados.

import fs from 'node:fs';
import path from 'node:path';

const AQUI = import.meta.dirname;
const candidatos = JSON.parse(fs.readFileSync(path.join(AQUI, 'candidatos-pares.json'), 'utf8'));

// Índice del par en candidatos-pares.json -> true si cuentan el mismo hecho.
const MISMO = new Set([0, 2, 5, 6, 7, 10, 11, 12, 13, 14, 19, 23, 34, 35, 37, 38, 46, 47, 49, 58, 59]);
// Los que se podrían discutir: el 33 (análisis de la misma reunión) y el 60 (la apelación y el paso a la Cámara, dos pasos del mismo caso).
const DUDOSOS = new Set([33, 60]);
// Qué grupo de varias fuentes del mismo hecho forman (la Fiesta del Postre, "nueva fecha", son 5 notas y 10 pares).
const GRUPO_NUEVA_FECHA = new Set([5, 7, 10, 12, 34, 35, 46, 47, 58, 59]);

const pares = candidatos.map((p, i) => ({
  clave: `p${String(i).padStart(2, '0')}`, a: p.a, b: p.b, similitud: p.similitud,
  mismo: MISMO.has(i), dudoso: DUDOSOS.has(i), grupo: GRUPO_NUEVA_FECHA.has(i) ? 'fiesta-del-postre-nueva-fecha' : null,
}));
fs.writeFileSync(path.join(AQUI, 'pares-200.json'), `${JSON.stringify({ nota: 'Etiquetas hechas a mano por Claude; los dudosos están marcados.', pares }, null, 1)}\n`);
console.log(`${pares.length} pares: ${pares.filter((p) => p.mismo).length} del mismo hecho, ${pares.filter((p) => !p.mismo).length} distintos, ${pares.filter((p) => p.dudoso).length} dudosos`);

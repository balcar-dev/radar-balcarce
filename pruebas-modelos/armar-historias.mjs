// Arma historias.json: 15 noticias para probar la REDACCIÓN, con el mismo formato de fuentes que recibe el
// redactor real (fuentes numeradas + texto completo de la principal).
//   node pruebas-modelos/armar-historias.mjs
// Sólo lee: baja el texto de cada nota de internet (ingesta/articulo.mjs, igual que producción) y guarda acá.
//   · 10 historias de UNA fuente (la guía de largo del cuerpo es 90–150 palabras).
//   · 5 historias de VARIAS fuentes (la misma noticia contada por 2 a 5 medios; guía 150–250).

import fs from 'node:fs';
import path from 'node:path';
import { traerTexto } from '../ingesta/articulo.mjs';

const AQUI = import.meta.dirname;
const notas = JSON.parse(fs.readFileSync(path.join(AQUI, 'muestra-200.json'), 'utf8')).notas;
const seccionesIA = JSON.parse(fs.readFileSync(path.join(AQUI, 'resultados-inception_mercury-decide_free--200.json'), 'utf8')).notas;

// Índices de muestra-200.json. La primera de cada grupo es la fuente principal.
const UNA = [20, 21, 22, 23, 26, 36, 38, 48, 62, 87];
const VARIAS = [[31, 43, 46, 65, 66], [29, 30], [41, 49], [28, 40], [51, 60]];

const limpiar = (s = '') => String(s).replace(/\s+/g, ' ').trim();
async function historia(indices) {
  const fuentes = indices.map((i) => notas[i]);
  const principal = fuentes[0];
  const texto = await traerTexto(principal.enlace).catch(() => null);
  return {
    id: principal.id,
    seccion: seccionesIA[principal.id]?.respuesta?.seccion ?? 'Balcarce',
    titulo: principal.titulo,
    medios: [...new Set(fuentes.map((f) => f.medio))],
    origenes: fuentes.map((f) => ({ medio: f.medio, enlace: f.enlace, fecha: f.fecha, oficial: /Municipalidad/.test(f.medio), resumen: limpiar(f.resumen) })),
    textoDeLaFuente: texto ? limpiar(texto).slice(0, 6000) : null,
    fuenteDelTexto: 1,
    cantidadDeFuentes: fuentes.length,
  };
}

const historias = [];
for (const g of [...UNA.map((i) => [i]), ...VARIAS]) {
  const h = await historia(g);
  historias.push(h);
  console.log(`${h.cantidadDeFuentes} fuente(s) · texto completo: ${h.textoDeLaFuente ? `${h.textoDeLaFuente.split(' ').length} palabras` : 'NO se pudo bajar'} · ${h.titulo.slice(0, 70)}`);
}
fs.writeFileSync(path.join(AQUI, 'historias.json'), `${JSON.stringify({ armadas: new Date().toISOString(), historias }, null, 1)}\n`);
console.log(`historias.json: ${historias.length} historias`);

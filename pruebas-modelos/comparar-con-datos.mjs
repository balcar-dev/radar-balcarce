// Muestra la nota de Camila Peralta escrita SIN y CON los tres datos verificados, lado a lado.
import fs from 'node:fs';
import path from 'node:path';

const AQUI = import.meta.dirname;
const id = JSON.parse(fs.readFileSync(path.join(AQUI, 'historias.json'), 'utf8')).historias[1].id;
const leer = (f) => JSON.parse(fs.readFileSync(path.join(AQUI, f), 'utf8')).historias[id];
const mostrar = (titulo, h) => {
  console.log(`\n=== ${titulo} (${h.palabrasCuerpo} palabras; problemas del verificador: ${h.problemas.map((p) => `${p.tipo}: ${p.detalle.slice(0, 90)}`).join(' | ') || 'ninguno'})`);
  console.log(`TITULO: ${h.escrito.titulo}`);
  console.log(`BAJADA: ${h.escrito.copete}`);
  console.log(`CUERPO: ${h.escrito.cuerpo}`);
};
mostrar('SIN datos (una sola fuente)', leer('redaccion-google_gemini-3.1-flash-lite--nuevo.json'));
mostrar('CON 3 datos verificados', leer('redaccion-google_gemini-3.1-flash-lite--nuevo-datos.json'));

// Corre la comparación de fotos (ingesta/fotos.mjs) sobre toda la tapa de
// hoy, para ver cómo quedarían las notas con foto de verdad, antes de
// construir el banco (PENDIENTES.md, "El banco de fotos propio").
//
//   node ingesta/probar-fotos.mjs [maximo]
//
// No publica nada ni toca portada.json: sólo lee y deja un reporte en
// web/data/_prueba-fotos.json (con un guion bajo adelante para que se note
// que es de prueba; no lo lee ninguna página de la web).
//
// Se corre desde GitHub Actions (workflow manual "Probar banco de fotos"),
// porque ahí están las claves de verdad (GEMINI_API_KEY_CLASIFICACION y
// GROQ_API_KEY); localmente sin esas claves en .env no compara nada.

import fs from 'node:fs';
import path from 'node:path';
import { candidatasConDatos, elegirFoto } from './fotos.mjs';
import { claveClasificacion, claveGroq } from '../reels/claves.mjs';

const AQUI = import.meta.dirname;
const PORTADA = path.join(AQUI, '..', 'web', 'data', 'portada.json');
const SALIDA = path.join(AQUI, '..', 'web', 'data', '_prueba-fotos.json');

async function main() {
  const maximo = Number(process.argv[2]) || 100;
  const datos = JSON.parse(fs.readFileSync(PORTADA, 'utf8'));
  const notas = (datos.notas ?? datos).filter((n) => n.teniaImagenLaFuente);

  const clave = claveClasificacion();
  const claveRespaldo = claveGroq();
  console.log(`  ${notas.length} notas con foto en la fuente (de ${(datos.notas ?? datos).length} en la tapa); reviso hasta ${maximo}.`);
  console.log(`  claves: Gemini ${clave ? 'sí' : 'NO'}, Groq ${claveRespaldo ? 'sí' : 'NO'}`);

  const resultados = [];
  let conFoto = 0;
  let conSospecha = 0;
  let proveedores = { gemini: 0, groq: 0, ninguno: 0 };

  for (const n of notas.slice(0, maximo)) {
    process.stdout.write(`  ${n.id} · ${n.seccion} · ${n.titulo.slice(0, 60)}... `);
    try {
      const candidatas = await candidatasConDatos(n);
      const bajadas = candidatas.filter((c) => c.datos).length;
      if (bajadas === 0) {
        console.log('sin ninguna foto bajable');
        resultados.push({
          id: n.id, titulo: n.titulo, seccion: n.seccion, medios: n.medios,
          candidatas: candidatas.map((c) => ({ medio: c.medio, imagen: c.imagen, error: c.error ?? (c.imagen ? 'no se pudo bajar' : 'sin og:image') })),
          elegida: null, razon: 'ninguna foto se pudo bajar', proveedor: null,
        });
        continue;
      }
      const r = await elegirFoto(n, candidatas, { clave, claveRespaldo });
      proveedores[r.proveedor ?? 'ninguno'] += 1;
      if (r.elegida) conFoto += 1;
      if (r.candidatas.some((c) => c.sospechaMarca)) conSospecha += 1;
      console.log(r.elegida ? `elegida: ${r.elegida.medio} (${r.proveedor})` : `sin elegir (${r.razon})`);
      resultados.push({
        id: n.id, titulo: n.titulo, seccion: n.seccion, medios: n.medios,
        candidatas: r.candidatas, elegida: r.elegida, razon: r.razon, proveedor: r.proveedor,
      });
    } catch (e) {
      console.log(`error: ${e.message}`);
      resultados.push({ id: n.id, titulo: n.titulo, seccion: n.seccion, error: e.message });
    }
  }

  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  fs.writeFileSync(SALIDA, JSON.stringify({
    cuando: new Date().toISOString(),
    total: resultados.length,
    conFotoElegida: conFoto,
    conSospechaDeMarca: conSospecha,
    proveedores,
    resultados,
  }, null, 1));
  console.log(`\n  listo: ${conFoto}/${resultados.length} con foto elegida, ${conSospecha} con sospecha de marca de agua.`);
  console.log(`  reporte en ${SALIDA}`);
}

main();

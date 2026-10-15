import { pathToFileURL } from 'node:url';
const repo = process.argv[2];
const ing = await import(pathToFileURL(`${repo}/ingesta/ingesta.mjs`).href);
const { REGLAS_SEMAFORO } = await import(pathToFileURL(`${repo}/ingesta/fuentes.mjs`).href);
const { normalizar } = ing.paraPruebas;
const contiene = (t, p) => { const n = normalizar(p).replace(/\s+/g, '\\s+'); return new RegExp(`\\b${n}${n.length >= 5 ? '\\w{0,3}' : ''}\\b`).test(normalizar(t)); };
const casos = [
  'El FMI alertó que el petróleo seguirá caro en 2027',
  'La minería sigue en alza y subió más de 8% en agosto por el petróleo',
  'Los niños de la escuela 5 visitaron el museo',
  'Un niño de 8 años fue atendido',
  'Alumnos de la Escuela Técnica ganaron un premio',
  'El alumno de la Técnica 1 ganó la olimpíada',
  'El Niño golpea el Litoral',
  'Juan Manuel Cerúndolo, el menor de los hermanos, ganó',
  'Fin del fútbol gratis: la AFA confirmó el sorteo del fixture',
];
for (const t of casos) {
  const listas = Object.entries(REGLAS_SEMAFORO).flatMap(([lista, ps]) => ps.filter((p) => contiene(t, p)).map((p) => `${lista}:"${p}"`));
  console.log(t, '→', listas.join(' ') || '(nada)', '| semaforoDelTexto entero:', JSON.stringify(ing.semaforoDelTexto(t, { soloMenores: true })));
}

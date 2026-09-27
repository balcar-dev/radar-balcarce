// FUENTES.md: el registro único de las fuentes, armado desde el código.
//
//   node ingesta/listar-fuentes.mjs
//
// Hernán (27/09): "un archivo sólo para fuentes, con el detalle de dónde y
// los datos que sirven para el cruce, así eso no vuelve a cambiar". Las
// fuentes viven en dos listas de código (ingesta/fuentes.mjs, las de siempre,
// e ingesta/fuentes-cruce.mjs, las del cruce de medios) y este programa las
// escribe juntas, en un solo documento que se lee sin saber programar. Una
// prueba (pruebas/fuentes-registro.test.mjs) controla que el documento diga
// exactamente lo mismo que el código: si alguien suma o apaga una fuente y
// no vuelve a correr esto, las pruebas fallan.
//
// Sin dependencias: sólo lo que trae Node.

import fs from 'node:fs';
import path from 'node:path';
import { FUENTES, FUENTES_NACIONALES, fichaDeFuente } from './fuentes.mjs';
import { FUENTES_CRUCE } from './fuentes-cruce.mjs';
import { MEDIOS_DE_AFUERA, MEDIOS_POR_DEFECTO, MEDIOS_CON_FIGURA } from './criterio.mjs';

export const ARCHIVO = path.join(import.meta.dirname, '..', 'FUENTES.md');

const TIPOS = { rss: 'RSS', atom: 'Atom', sitemap: 'índice de noticias', scrape: 'página (se lee el HTML)' };
const ALCANCES = { local: 'Balcarce', region: 'región', provincia: 'provincia', pais: 'nacional' };
const celda = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();

function fila(f) {
  const ficha = fichaDeFuente(f);
  return `| ${celda(f.medio)} | ${celda(f.nombre)} | ${celda(ficha.ciudad ?? '')} | ${celda(TIPOS[f.tipo] ?? f.tipo)} | ${celda(f.seccion ?? '—')} | ${f.peso ?? ''} | ${f.oficial ? 'sí' : ''} | ${f.activa === false ? 'apagada' : 'sí'} | ${celda(f.url)} |`;
}

const CABEZA = '| Medio | Feed | Ciudad | Cómo se lee | Sección fija | Peso | Oficial | Activa | Dirección |\n|---|---|---|---|---|---|---|---|---|';

function tabla(fuentes) {
  const orden = [...fuentes].sort((a, b) => a.medio.localeCompare(b.medio, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
  return `${CABEZA}\n${orden.map(fila).join('\n')}`;
}

/** El texto entero de FUENTES.md. */
export function registroDeFuentes() {
  const todas = [
    ...FUENTES.map((f) => ({ ...f, lista: 'fuentes.mjs' })),
    ...FUENTES_NACIONALES.map((f) => ({ ...f, lista: 'fuentes.mjs' })),
    ...FUENTES_CRUCE.map((f) => ({ ...f, lista: 'fuentes-cruce.mjs' })),
  ];
  const activas = todas.filter((f) => f.activa !== false);
  const medios = new Set(activas.map((f) => f.medio));
  const grupo = (alcance) => todas.filter((f) => f.alcance === alcance);
  const cuenta = (xs) => `${xs.filter((f) => f.activa !== false).length} feeds activos de ${new Set(xs.filter((f) => f.activa !== false).map((f) => f.medio)).size} medios`;
  const pide = Object.entries(MEDIOS_DE_AFUERA).map(([s, n]) => `${s} ${n}`).join(', ');

  return `# Las fuentes de Radar Balcarce

*Este documento lo escribe \`node ingesta/listar-fuentes.mjs\` a partir del código. No se edita a mano: una prueba controla que diga lo mismo que \`ingesta/fuentes.mjs\` y \`ingesta/fuentes-cruce.mjs\`. Para sumar, sacar o apagar una fuente se toca una de esas dos listas y se vuelve a correr el programa.*

Hoy: **${activas.length} feeds activos de ${medios.size} medios** (${todas.length} configurados).

## Cómo se usan

1. **Cada media hora** se leen todos los feeds activos (GitHub Actions, "Actualizar la web").
2. **De los medios de afuera, lo que el propio medio pone en una sección de otro país, de policiales o de consejos no se trae** (se mira la dirección de la nota: \`SECCIONES_QUE_NO_ENTRAN\`, en \`ingesta/fuentes.mjs\`).
3. **El cruce** (\`ingesta/cruce.mjs\`): se juntan las notas de todos los medios que cuentan el mismo hecho, con una memoria de 36 horas. Un medio cuenta una sola vez aunque llegue por varios feeds (por eso cada medio tiene **un solo nombre**, el de la columna "Medio").
4. **Qué queda:**
   - todo lo de los medios de Balcarce;
   - de afuera, lo que dice Balcarce en el título o toca la zona (la ruta 226, la 55, la papa, el sudeste);
   - de afuera, lo que cuentan los medios que pide su sección: ${pide}; el resto, ${MEDIOS_POR_DEFECTO}; lo que nombra a una figura argentina, ${MEDIOS_CON_FIGURA} (\`MEDIOS_DE_AFUERA\`, en \`ingesta/criterio.mjs\`). Nunca con un solo medio.
   - Lo que cuentan **sólo** medios de otras ciudades de la zona (Mar del Plata, Tandil, Necochea…) no se trae.
5. **El peso** sirve para ordenar (qué va primero, qué entra en el cupo de cada sección), no para decidir si sale. Lo de Balcarce pesa más a propósito.
6. **"Oficial"** es un organismo público (la Municipalidad, el Gobierno de la Provincia): da verificación alta y sale solo si dice Balcarce en el título o toca la zona.
7. **"Sección fija"**: el feed ya viene separado por tema y se le cree (salvo Tecnología, que se confirma con el título).
8. **"Cómo se lee"**: RSS o Atom (la lista de notas del medio), índice de noticias (el que cada sitio arma para Google, trae todo el día) o la página misma cuando el medio no tiene feed.

## De Balcarce (${cuenta(grupo('local'))})

${tabla(grupo('local'))}

## De la región (${cuenta(grupo('region'))})

Cuentan como un medio más cuando cuentan lo mismo que los demás; solos, sólo entra lo que dice Balcarce en el título o toca la zona.

${tabla(grupo('region'))}

## De la provincia (${cuenta(grupo('provincia'))})

${tabla(grupo('provincia'))}

## Nacionales (${cuenta(grupo('pais'))})

${tabla(grupo('pais'))}
`;
}

if (process.argv[1] && process.argv[1].endsWith('listar-fuentes.mjs')) {
  fs.writeFileSync(ARCHIVO, registroDeFuentes(), 'utf8');
  console.log(`  FUENTES.md escrito (${ARCHIVO})`);
}

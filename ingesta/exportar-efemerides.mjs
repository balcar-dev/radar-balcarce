// Las candidatas de "Un día como hoy" en formato texto, con el contexto para
// dárselas a otra IA (30/09, Hernán): "que me elija y ver cuáles son las
// diferencias". El texto dice quiénes somos, para qué es, qué criterio
// seguimos y en qué formato contestar, así la respuesta se puede comparar con
// lo que se eligió en el panel (web/data/efemerides-elegidas.json).
//
// Uso:  node ingesta/exportar-efemerides.mjs --salida=carpeta
// Escribe un archivo con todo el mes y uno por semana (para chats más chicos).
// Sin dependencias, como todo `ingesta/`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOMBRE_DE_ESTILO } from './efemerides.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** El contexto y las instrucciones que van arriba de las candidatas. */
export const CONTEXTO = `# Elegí las efemérides de "Un día como hoy" para Radar Balcarce

## Quiénes somos
Radar Balcarce (radarbalcarce.com) es un medio digital automático de **Balcarce**, una ciudad del sudeste de la provincia de Buenos Aires, Argentina (a unos 60 km de Mar del Plata; cerca de Tandil, Necochea y Lobería). Es la ciudad de Juan Manuel Fangio y de un autódromo con su museo; una de las grandes zonas de producción de papa del país, con la Unidad Integrada INTA-Facultad de Ciencias Agrarias. Nuestros lectores son vecinos de Balcarce y la región. Escribimos en castellano rioplatense, claro y formal pero ameno.

## Qué estamos armando
Una pieza diaria de **"Un día como hoy"**: una nota corta en la web y un video de unos 30 segundos con voz (para Instagram y Facebook). Cada día cuenta **una efeméride principal** y, a veces, una segunda. Durante la semana queremos **variedad de estilos** (ciencia, cultura, deporte, campo, historia, personas, cosas de la zona) para que dos días seguidos no se parezcan. En los feriados y fechas patrias la pieza habla **sólo de esa fecha**.

## Qué buscamos (lo más importante)
Elegí, en este orden de interés:
1. **Lo de Balcarce y la región** (Balcarce, Mar del Plata, Tandil, Necochea, Lobería, el sudeste bonaerense), y Fangio y el automovilismo.
2. **Lo importante para Argentina**: figuras, hechos, descubrimientos, deportes, cultura, campo y ciencia argentinos que un vecino reconocería.
3. **Lo importante para todo el mundo**: figuras o fechas que conoce cualquiera (un gran científico, un invento, un hito, una obra célebre).
4. **Datos curiosos** que le den ganas de seguir leyendo a una persona común.

## Qué evitamos
- **Política partidaria** y figuras políticas conflictivas (de cualquier signo). Tono institucional, sin opinión, sin ideología ("ni militante ni woke").
- **Violencia, guerras, atentados, crímenes, tragedias**; nada con **menores** ni **víctimas**.
- **Personas que pueden estar vivas** (salvo grandes figuras ya muy consagradas) y cualquier muerte reciente.
- Hechos **locales de España u otros países** sin importancia mundial ni relación con Argentina (hay muchos y sobran).
- **Fundaciones de empresas, bancos, aerolíneas o ciudades de otros países**, y política o economía de afuera, aunque sean famosas en muchos idiomas (1/10, Hernán: "no me hace falta la fundación de algo de Holanda"). La fama mundial sólo alcanza para una **persona**, un **descubrimiento, invento o hito de la ciencia o el espacio**, o una **obra o hecho cultural** que conoce cualquiera.
- **"Balcarce" también es un apellido** (el gobernador Juan Ramón Balcarce, Antonio González Balcarce): eso no es de nuestra ciudad.
- **Religión** como tema central, y días "de algo" que son de una marca, un gremio o inventados.
- Lo que sólo entiende un especialista. Si una efeméride necesita mucho contexto para entenderse, no sirve.

## Lo que hay que hacer
Para **cada día**, elegí usando **sólo los identificadores [entre corchetes]** de la lista:
- **1 PRINCIPAL** (la mejor del día: la que da para una nota y un video de 30 segundos, con un gancho que se cuente en una frase y una foto posible).
- Pensá el día como **cuatro lugares**: la principal; una **argentina** (de otro estilo que la principal); una de **ciencia, cultura o del mundo**; y una **curiosa** para cerrar liviano. Que dos días seguidos no abran con el mismo estilo.
- Hasta **3 SÍ**: buenas, van si no entra la principal o si hace falta una segunda.
- Hasta **3 OPCIONAL**: sirven pero no son lo mejor.
- Las que descartarías por algún motivo de la lista de "Qué evitamos": **NO**.
- Si ninguna del día sirve, escribí **NINGUNA** y decí en una frase qué tipo de tema buscarías.

## Formato de la respuesta
Un renglón por día, así, sin nada más en el medio:

\`AAAA-MM-DD | PRINCIPAL: id | SI: id, id | OPCIONAL: id, id | NO: id, id | MOTIVO: una frase sobre por qué elegiste esa principal\`

Al final agregá una sección **"Criterios que seguí"** con 5 a 8 puntos: qué priorizaste, qué descartaste y qué regla general usaste. Eso nos sirve para comparar tu criterio con el nuestro.

## Datos que te damos de cada candidata
\`[id] Estilo · año (hace N años) · texto · conocida en N idiomas de Wikipedia · marcas\`
"Idiomas" es cuántas ediciones de Wikipedia tienen página sobre el tema: a más idiomas, más conocido en el mundo (Argentina se mide aparte). "Marcas" son alertas automáticas (política, puede estar vivo, religión) que podés tomar o no. **No te damos nuestro puntaje** para no condicionarte.
`;

const fechaLarga = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay();
  return `${DIAS[dia][0].toUpperCase()}${DIAS[dia].slice(1)} ${d} de ${MESES[m - 1]} de ${a}`;
};

const anioTexto = (c) => {
  if (c.anio == null) return 'sin año';
  if (c.anio < 0) return `${-c.anio} a. C.`;
  return `${c.anio}${c.hace ? ` (hace ${c.hace} años)` : ''}`;
};

/** Una candidata en una línea (o más, si es una fecha patria con sus datos). */
export function lineaDeCandidata(c) {
  const partes = [
    `[${c.id}]`,
    `${c.origen === 'curada' ? 'FECHA PATRIA O DE ACÁ' : (NOMBRE_DE_ESTILO[c.estilo] ?? c.estilo)}`,
    anioTexto(c),
    c.texto.replace(/\s+/g, ' '),
  ];
  if (c.importancia) partes.push(`conocida en ${c.importancia} idiomas`);
  if (c.marcas?.length) partes.push(`marcas: ${c.marcas.join(', ')}`);
  let linea = `- ${partes.join(' · ')}`;
  if (c.datos?.length) linea += `\n${c.datos.map((d) => `    · dato verificado: ${d.texto.replace(/\s+/g, ' ')}`).join('\n')}`;
  return linea;
}

/**
 * El texto de un rango de días. Las candidatas van ordenadas por año (no por
 * nuestro puntaje), para no condicionar a quien elige.
 */
export function textoDeDias(dias = {}, { incluirContexto = true } = {}) {
  const fechas = Object.keys(dias).sort();
  const bloques = fechas.map((iso) => {
    const lista = [...(dias[iso].candidatas ?? [])].sort((a, b) => (a.anio ?? 99999) - (b.anio ?? 99999));
    const feriado = lista.some((c) => c.origen === 'curada' && /feriado/i.test(`${c.titulo} ${c.estilo}`))
      ? '\n**Es feriado o fecha patria: la pieza habla sólo de esa fecha.**' : '';
    return `### ${iso} · ${fechaLarga(iso)}${feriado}\n${lista.map(lineaDeCandidata).join('\n') || '- (sin candidatas)'}`;
  });
  return `${incluirContexto ? `${CONTEXTO}\n---\n\n## Las candidatas\n\n` : ''}${bloques.join('\n\n')}\n`;
}

/** Los días agrupados de lunes a domingo: { lunes: { iso: dia } }. */
export function porSemana(dias = {}) {
  const semanas = {};
  for (const iso of Object.keys(dias).sort()) {
    const [a, m, d] = iso.split('-').map(Number);
    const semana = new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay();
    const lunes = new Date(Date.UTC(a, m - 1, d - ((semana + 6) % 7), 12)).toISOString().slice(0, 10);
    (semanas[lunes] ??= {})[iso] = dias[iso];
  }
  return semanas;
}

function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
  const salida = path.resolve(args.salida ?? path.join(RAIZ, 'efemerides-para-otra-ia'));
  const { dias } = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'efemerides-candidatas.json'), 'utf8'));
  fs.mkdirSync(salida, { recursive: true });
  fs.writeFileSync(path.join(salida, 'efemerides-todo-el-mes.md'), textoDeDias(dias));
  for (const [lunes, sem] of Object.entries(porSemana(dias))) {
    fs.writeFileSync(path.join(salida, `efemerides-semana-${lunes}.md`), textoDeDias(sem));
  }
  process.stdout.write(`listo en ${salida}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();

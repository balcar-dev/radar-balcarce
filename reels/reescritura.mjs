// Reescritura editorial por IA.
//
// Hasta acá, el título y el guion salían de tomar la primera oración del
// resumen y pegarle una entrada fija ("Deportes en Balcarce. ..."). Servía
// para probar que el resto de la cadena funcionaba, pero se notaba. Esto lo
// reemplaza por un texto escrito de verdad, con la línea editorial como
// instrucción — no como una regla aparte que alguien tiene que acordarse de
// aplicar a mano.
//
// El prompt se arma con reglas fijas + UNO de dos tonos, según el tema
// (esTemaSerio). Se exporta INSTRUCCION_EDITORIAL a propósito: es lo que el
// panel muestra en la pestaña "Cómo escribe la IA", para que se pueda leer y
// corregir sin abrir el código.

import { claveRedaccion, claveRedes } from './claves.mjs';
import { verificar } from '../ingesta/verificar.mjs';
import { decisionHumana } from '../ingesta/utiles.mjs';

// "-latest" en vez de un número de versión fijo: la reescritura no necesita
// la última novedad, necesita no romperse cuando Google jubile un modelo
// (como pasó con gemini-2.5-flash, discontinuado para cuentas nuevas).
// "flash-lite" en vez de "flash" a secas: para reescribir un título y un
// copete no hace falta el modelo grande, y en la práctica respondió más
// rápido y con menos 503 de "alta demanda" que el flash normal.
const MODELO = 'gemini-flash-lite-latest';

const REGLAS_FIJAS = `Sos el redactor de Radar Balcarce, un medio digital de Balcarce (provincia de Buenos Aires, Argentina).

Tu trabajo es reescribir una noticia que llegó de otro medio (a veces más de uno contó lo mismo), con estas reglas fijas:

1. NUNCA copiás el texto original. Se reescribe con palabras propias, cruzando lo que cuenta cada fuente si hay más de una. Podés citar una frase textual corta si hace falta, entre comillas.
2. El título va hasta 65 caracteres, sin signos de admiración, sin pregunta, y se entiende solo en la pantalla del celular.
3. El copete son dos líneas COMO MUCHO (unas 30 palabras): qué pasó, dónde y cuándo. Nada de contexto antes del hecho, nada de antecedentes largos, nada de "cabe destacar que". Si la fuente da para más, esa profundidad queda para el cuerpo de la nota en la web, no para el copete.
{{TONO}}
5. Los números van redondeados y comparados cuando se pueda ("el triple que el año pasado") antes que un porcentaje con decimales.
6. El guion para la voz ES EL TÍTULO, dicho tal cual, y nada más. Nada de contexto, nada de cierre, nada de "la nota completa en...". Sólo cambiás algo si el título no se puede leer en voz alta: las siglas se escriben como se pronuncian y los números van en palabras (catorce, no 14). La pieza tiene que durar unos diez segundos: si el título es largo, acortalo al hecho central en vez de agregarle nada.
7. La fuente NO se nombra nunca en el guion de voz ni en el título: eso va aparte, en la atribución de la nota.
8. Si el texto de origen no alcanza para escribir dos oraciones propias, el guion puede ser más corto: mejor breve y cierto que largo y relleno.
9. Nunca inventás un dato, una cifra o una cita que no esté en el texto de origen. Si dos fuentes se contradicen en un dato (una hora, un número), usás el que repiten más o el más reciente, nunca inventás uno propio para "resolver" la diferencia.
10. Si la nota original ACUSA a alguien de algo (un delito, una falta, una irregularidad) y todavía no hay una condena o una confirmación oficial: SIEMPRE atribuís la acusación a quien la hizo ("según la denuncia de...", "de acuerdo con la Policía...", "según fuentes judiciales...") y usás el modo condicional ("habría", no "hizo"). Nunca lo escribís como un hecho afirmado por vos. Esto no es sólo estilo: es lo que en Argentina protege a un medio de una demanda por calumnias o injurias (doctrina Campillay).
11. Escribís en castellano correcto, con las tildes y la eñe donde van (últimos, sábado, Napaleofú, señal). Un medio que escribe sin tildes se lee como un mensaje apurado, no como un medio.

Devolvés SOLO un JSON con esta forma exacta, sin texto alrededor:
{"titulo": "...", "copete": "...", "guion": "..."}`;

const TONO_AMENO = `4. Tono: español rioplatense neutro y cercano. Tercera persona, sin voseo ni modismos: no es un amigo contando algo, es un medio informando — pero se lee liviano, como una novedad del pueblo bien contada, no como un parte frío. Ni solemne ni canchero. Sin adjetivos de opinión en nota informativa, sin exclamaciones, sin "impresionante", "tremendo" ni "increíble".`;

const TONO_SERIO = `4. Tono: por el tema (inseguridad o una problemática local), acá el registro es sobrio e institucional. Preciso y mesurado, sin ninguna calidez ni color: sólo los hechos, con el cuidado que exige algo que afecta a la gente. Nada de liviandad ni de humor. Tercera persona, sin opinión.`;

// Palabras que, sin llegar a frenar el semáforo (eso ya lo filtra
// REGLAS_SEMAFORO en ingesta/fuentes.mjs), sí piden el tono serio en vez del
// ameno de todos los días: son una "problemática", no una novedad cualquiera.
const PALABRAS_SERIAS = [
  'inseguridad', 'robo', 'robaron', 'hurto', 'hurtaron', 'delincuencia',
  'choque', 'accidente', 'incendio', 'corte de luz', 'corte de agua',
  'sin luz', 'sin agua', 'conflicto', 'protesta', 'reclamo', 'crisis',
  'violencia', 'inundación', 'inundacion', 'temporal', 'emergencia',
];

/** ¿Esta nota pide el tono serio en vez del ameno de todos los días?
 *  Policiales siempre lo pide: aunque ya pasó el filtro de palabras (lo que
 *  acusa o involucra a alguien sigue esperando a una persona), lo que queda
 *  igual no es una nota liviana. */
export function esTemaSerio(nota) {
  if (nota?.seccion === 'Policiales') return true;
  const texto = `${nota?.titulo ?? ''} ${nota?.resumenFuente ?? ''}`.toLowerCase();
  return PALABRAS_SERIAS.some((p) => texto.includes(p));
}

function instruccionPara(nota) {
  return REGLAS_FIJAS.replace('{{TONO}}', esTemaSerio(nota) ? TONO_SERIO : TONO_AMENO);
}

// Para el panel ("Cómo escribe la IA"): las reglas con el tono de todos los
// días, más la aclaración de cuándo cambia. No es literalmente el prompt que
// recibe cada nota (ésa se arma con instruccionPara), pero describe las dos
// igual de fiel.
export const INSTRUCCION_EDITORIAL = `${instruccionPara({ seccion: '', titulo: '', resumenFuente: '' })}

—

Nota aparte, esto no se lo manda a la IA: cuando la noticia es de Policiales, o
toca inseguridad, robos, choques, accidentes, incendios, cortes de luz o agua,
conflictos, protestas, reclamos o alguna emergencia, el punto 4 cambia por el
registro serio de arriba en vez del cercano.`;

function limpiarJson(texto) {
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('la respuesta no trae un JSON reconocible');
  return JSON.parse(m[0]);
}

/** El texto que recibe el modelo: el titular y, si hay más de un medio, el
 *  resumen de cada uno por separado, para que cruce en vez de repetir uno. */
function entradaDe(nota) {
  const partes = [
    `Sección: ${nota.seccion}`,
    `Titular original (de ${nota.medios?.join(' / ') ?? 'la fuente'}): ${nota.titulo}`,
  ];
  const fuentes = [nota.resumenFuente, ...(nota.fuentesTexto ?? [])].filter(Boolean);
  if (fuentes.length <= 1) {
    if (fuentes[0]) partes.push(`Resumen original: ${fuentes[0]}`);
  } else {
    fuentes.forEach((f, i) => partes.push(`Resumen del medio ${i + 1}: ${f}`));
  }
  return partes.join('\n');
}

const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** Un pedido a Gemini con una clave puntual. Devuelve la respuesta cruda
 *  (fetch Response) o lanza si se agotaron los reintentos por saturación. */
async function pedir({ prompt, entrada, clave, fetchFn, intentos }) {
  let res;
  for (let i = 1; i <= intentos; i += 1) {
    res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${clave}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\n---\n\n${entrada}` }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
      }),
    });
    // 503 es "el modelo está saturado en este instante", no un error nuestro:
    // vale la pena esperar un poco y reintentar antes de resignarse.
    if (res.status !== 503 || i === intentos) break;
    await dormir(4000);
  }
  return res;
}

/**
 * Reescribe una nota. `nota` = { titulo, resumenFuente, seccion, medios,
 * fuentesTexto? }. Devuelve { titulo, copete, guion, deIA: true } o lanza si
 * Gemini falla — quien llama decide el respaldo (ver reescribirConRespaldo).
 *
 * Prueba primero con la clave de redacción (gratis). Si esa clave devuelve
 * "sin cupo" (429) y hay una clave de redes cargada (paga), reintenta una
 * sola vez con esa — mejor gastar un poco de la paga que dejar la nota sin
 * reescribir. Cualquier otro error no reintenta con la otra clave: no tiene
 * sentido pagar por un pedido que ya está mal armado.
 */
export async function reescribir(nota, { intentos = 3, fetchFn = fetch } = {}) {
  const primera = claveRedaccion();
  const segunda = claveRedes();
  if (!primera && !segunda) throw new Error('falta GEMINI_API_KEY_REDACCION');

  const prompt = instruccionPara(nota);
  const entrada = entradaDe(nota);

  let res;
  let usada = 'redaccion';
  if (primera) {
    res = await pedir({ prompt, entrada, clave: primera, fetchFn, intentos });
  }
  if ((!primera || res?.status === 429) && segunda) {
    res = await pedir({ prompt, entrada, clave: segunda, fetchFn, intentos });
    usada = 'redes';
  }
  if (!res) throw new Error('no se pudo pedir a Gemini');
  if (!res.ok) throw new Error(`HTTP ${res.status} (clave ${usada}): ${(await res.text()).slice(0, 200)}`);

  const j = await res.json();
  const texto = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  const salida = limpiarJson(texto);
  if (!salida.titulo || !salida.guion) throw new Error('la respuesta no trae título o guion');

  return {
    titulo: salida.titulo.trim().slice(0, 90),
    copete: (salida.copete ?? '').trim(),
    guion: salida.guion.trim(),
    deIA: true,
  };
}

/**
 * Igual que reescribir(), pero si Gemini falla por cualquier motivo (cupo,
 * red, respuesta rara), cae al armado mecánico que ya existía — nunca deja
 * una pieza sin texto. `mecanico` es la función de fallback que le pasa
 * quien llama (para no crear una dependencia circular con plan.mjs).
 */
export async function reescribirConRespaldo(nota, mecanico, opciones) {
  try {
    return await reescribir(nota, opciones);
  } catch (e) {
    const m = mecanico(nota);
    return { ...m, deIA: false, motivoRespaldo: e.message };
  }
}

// El respaldo mecánico por defecto: lo que se mostraba antes de que
// existiera la reescritura. Lo usa reescribirAutomaticas(); plan.mjs y el
// panel tienen el suyo propio (guionNoticia), más elaborado, porque ahí sí
// pueden darse el lujo de tener reels/plan.mjs cargado.
function mecanicoPorDefecto(nota) {
  const titulo = String(nota.titulo ?? '').replace(/\s+/g, ' ').trim().replace(/[.:]+$/, '');
  return { titulo: nota.titulo, copete: nota.resumenFuente || '', guion: `${titulo}.` };
}

// Cuántas se reescriben por corrida. La ingesta corre cada 30 minutos, así
// que 20 por vuelta son unas 40 por hora: de sobra para lo que Balcarce
// publica en un día, sin vaciar el cupo gratis de una sola vez.
export const REESCRITURAS_POR_CORRIDA = 20;
// Si la IA falla tres veces seguidas (Gemini saturado, sin red), se corta:
// insistir sólo llenaría el registro de errores sin cambiar el resultado.
const FALLOS_PARA_CORTAR = 3;

/**
 * Reescribe con IA, sola y sin que nadie la mire, las notas que van a salir
 * sin revisión humana (semáforo verde y sin que una persona haya decidido
 * algo). Es lo que hace posible que el sitio se actualice con la PC apagada
 * y aun así tenga texto propio, no sólo el resumen de la fuente.
 *
 * Nunca pisa lo que ya escribió una persona (`decisiones`), y reusa lo que
 * ya se reescribió en una corrida anterior (`previas`, la portada de la vez
 * pasada) en vez de volver a gastar cuota en la misma nota: la única fuente
 * de "ya está" que existe en la nube es lo que ya quedó publicado.
 *
 * Cada resultado pasa por `ingesta/verificar.mjs` antes de aceptarse: si la
 * IA agregó un dato que ninguna fuente trae, se descarta y la nota sigue
 * con el resumen mecánico, como salía antes de que existiera esto.
 *
 * @param {object[]} notas
 * @param {object} [o]
 * @param {Record<string, {titulo:string,copete:string,guion:string}>} [o.previas]
 * @param {Record<string, object>} [o.decisiones]
 * @param {number} [o.tope]
 * @param {object} [o.opciones] se le pasa tal cual a reescribir() (fetchFn, intentos)
 * @returns {Promise<Record<string, {titulo:string,copete:string,guion:string,deIA:boolean}>>}
 */
export async function reescribirAutomaticas(notas, {
  previas = {}, decisiones = {}, tope = REESCRITURAS_POR_CORRIDA, opciones,
} = {}) {
  const resultado = {};
  let hechas = 0;
  let fallos = 0;

  const candidatas = [...notas]
    .filter((n) => n.semaforo === 'verde')
    .filter((n) => !decisionHumana(decisiones[n.id]))
    .sort((a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0));

  for (const nota of candidatas) {
    // Ya se reescribió en una corrida anterior: se revalida (es local y
    // gratis, no pide nada a Gemini) y se reusa sin gastar un pedido nuevo.
    // Así, si mañana se agrega una regla nueva a verificar.mjs, lo que ya
    // estaba publicado y ahora la incumple se cae solo y se vuelve a
    // reescribir en una corrida siguiente, en vez de quedar mal para
    // siempre porque "ya estaba hecho".
    if (previas[nota.id]?.titulo) {
      const cacheada = previas[nota.id];
      const control = verificar(
        { titulo: nota.titulo, resumen: nota.resumenFuente },
        { titulo: cacheada.titulo, copete: cacheada.copete, guion: cacheada.guion },
      );
      if (control.ok) { resultado[nota.id] = cacheada; continue; }
      // No entra en resultado: queda el resumen mecánico por ahora, y como
      // no aparece acá tampoco va a aparecer en `previas` la próxima vez, así
      // que se reintenta con Gemini en una corrida futura.
      continue;
    }
    if (hechas >= tope || fallos >= FALLOS_PARA_CORTAR) continue; // sigue por si algo más abajo está en caché

    const r = await reescribirConRespaldo(nota, mecanicoPorDefecto, opciones);
    hechas += 1;
    if (!r.deIA) { fallos += 1; continue; } // Gemini falló: queda el copete de siempre por ahora

    const control = verificar(
      { titulo: nota.titulo, resumen: nota.resumenFuente },
      { titulo: r.titulo, copete: r.copete, guion: r.guion },
    );
    if (!control.ok) continue; // inventó algo: se descarta, queda el copete de siempre

    resultado[nota.id] = { titulo: r.titulo, copete: r.copete, guion: r.guion, deIA: true };
  }

  return resultado;
}

if (process.argv[1] && process.argv[1].endsWith('reescritura.mjs')) {
  const prueba = {
    titulo: 'Puesta en valor de las canchas de tenis del Polideportivo Municipal',
    resumenFuente: 'El municipio informó que se realizaron trabajos de mantenimiento y mejora en las canchas de tenis del Polideportivo, que incluyeron el recambio de la superficie y el arreglo del alambrado perimetral.',
    seccion: 'Balcarce',
    medios: ['Puntonueve', 'News Balcarce'],
  };
  console.log('\n\x1b[1mPRUEBA DE REESCRITURA\x1b[0m\n');
  console.log('Original:', prueba.titulo);
  try {
    const r = await reescribir(prueba);
    console.log('\n\x1b[32mTítulo IA:\x1b[0m', r.titulo);
    console.log('\x1b[32mCopete:\x1b[0m  ', r.copete);
    console.log('\x1b[32mGuion:\x1b[0m   ', r.guion, '\n');
  } catch (e) {
    console.log('\n\x1b[31mfalla\x1b[0m', e.message, '\n');
  }
}

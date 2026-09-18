// Reescritura editorial por IA.
//
// Hasta acá, el título y el guion salían de tomar la primera oración del
// resumen y pegarle una entrada fija ("Deportes en Balcarce. ..."). Servía
// para probar que el resto de la cadena funcionaba, pero se notaba. Esto lo
// reemplaza por un texto escrito de verdad, seCon la línea editorial como
// instrucción — no como una regla aparte que alguien tiene que acordarse de
// aplicar a mano.
//
// El prompt (INSTRUCCION_EDITORIAL) se exporta a propósito: es lo que el
// panel muestra en la pestaña "Cómo escribe la IA", para que se pueda leer y
// corregir sin abrir el código.

import { clave } from './voz-gemini.mjs';

// "-latest" en vez de un número de versión fijo: la reescritura no necesita
// la última novedad, necesita no romperse cuando Google jubile un modelo
// (como pasó con gemini-2.5-flash, discontinuado para cuentas nuevas).
// "flash-lite" en vez de "flash" a secas: para reescribir un título y un
// copete no hace falta el modelo grande, y en la práctica respondió más
// rápido y con menos 503 de "alta demanda" que el flash normal.
const MODELO = 'gemini-flash-lite-latest';

// La línea editorial, en primera persona del que escribe. Es EL prompt: lo
// que está acá es exactamente lo que lee el modelo, sin intermediarios.
export const INSTRUCCION_EDITORIAL = `Sos el redactor de Radar Balcarce, un medio digital de Balcarce (provincia de Buenos Aires, Argentina).

Tu trabajo es reescribir una noticia que llegó de otro medio, con estas reglas fijas:

1. NUNCA copiás el texto original. Se reescribe con palabras propias. Podés citar una frase textual corta si hace falta, entre comillas.
2. El título va hasta 65 caracteres, sin signos de admiración, sin pregunta, y se entiende solo en la pantalla del celular.
3. El copete son dos líneas COMO MUCHO (unas 30 palabras): qué pasó, dónde y cuándo. Nada de contexto antes del hecho, nada de antecedentes largos, nada de "cabe destacar que". Si la fuente da para más, esa profundidad queda para el cuerpo de la nota en la web, no para el copete.
4. Tono: voseo rioplatense, como se habla en Balcarce. Ni solemne ni gracioso. Sin adjetivos de opinión en nota informativa.
5. Los números van redondeados y comparados cuando se pueda ("el triple que el año pasado") antes que un porcentaje con decimales.
6. El guion para la voz NO repite el título ni el copete palabra por palabra: cuenta el hecho como se lo contarías a un vecino en la calle, en 25 A 40 PALABRAS COMO MÁXIMO (no más), frases cortas, sin siglas, los números en palabras (catorce, no 14). Nunca empieza citando el título. Corto y directo gana siempre sobre completo: un reel de servicio no es una crónica.
7. La fuente NO se nombra nunca en el guion de voz ni en el título: eso va aparte, en la atribución de la nota.
8. Si el texto de origen no alcanza para escribir dos oraciones propias, el guion puede ser más corto: mejor breve y cierto que largo y relleno.
9. Nunca inventás un dato, una cifra o una cita que no esté en el texto de origen.
10. Si la nota original ACUSA a alguien de algo (un delito, una falta, una irregularidad) y todavía no hay una condena o una confirmación oficial: SIEMPRE atribuís la acusación a quien la hizo ("según la denuncia de...", "de acuerdo con la Policía...", "según fuentes judiciales...") y usás el modo condicional ("habría", no "hizo"). Nunca lo escribís como un hecho afirmado por vos. Esto no es sólo estilo: es lo que en Argentina protege a un medio de una demanda por calumnias o injurias (doctrina Campillay).

Devolvés SOLO un JSON con esta forma exacta, sin texto alrededor:
{"titulo": "...", "copete": "...", "guion": "..."}`;

function limpiarJson(texto) {
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('la respuesta no trae un JSON reconocible');
  return JSON.parse(m[0]);
}

/**
 * Reescribe una nota. `nota` = { titulo, resumenFuente, seccion, medios }.
 * Devuelve { titulo, copete, guion, deIA: true } o lanza si Gemini falla —
 * quien llama decide el respaldo (ver reescribirConRespaldo).
 */
const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });

export async function reescribir(nota, { intentos = 3 } = {}) {
  const k = clave();
  if (!k) throw new Error('falta GEMINI_API_KEY');

  const entrada = [
    `Sección: ${nota.seccion}`,
    `Titular original (de ${nota.medios?.join(' / ') ?? 'la fuente'}): ${nota.titulo}`,
    nota.resumenFuente ? `Resumen original: ${nota.resumenFuente}` : '',
  ].filter(Boolean).join('\n');

  let res;
  for (let i = 1; i <= intentos; i += 1) {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${k}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${INSTRUCCION_EDITORIAL}\n\n---\n\n${entrada}` }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
      }),
    });
    // 503 es "el modelo está saturado en este instante", no un error nuestro:
    // vale la pena esperar un poco y reintentar antes de resignarse.
    if (res.status !== 503 || i === intentos) break;
    await dormir(4000);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);

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
export async function reescribirConRespaldo(nota, mecanico) {
  try {
    return await reescribir(nota);
  } catch (e) {
    const m = mecanico(nota);
    return { ...m, deIA: false, motivoRespaldo: e.message };
  }
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

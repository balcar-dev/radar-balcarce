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
import { verificar, resumirProblemas } from '../ingesta/verificar.mjs';
import { semaforoDelTexto } from '../ingesta/ingesta.mjs';
import { decisionHumana } from '../ingesta/utiles.mjs';
import { traerTexto } from '../ingesta/articulo.mjs';

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
2. El título va hasta 65 caracteres, sin signos de admiración, sin pregunta, y se entiende solo en la pantalla del celular. Empieza por lo que pasó (sujeto y verbo en presente: "El Concejo aprueba…", "Ferroviarios gana…"), no por el lugar ni por una etiqueta. Si el hecho es de Balcarce y el título no lo dice, va "en Balcarce" al final. Nunca "Video:", "Ojo:" ni frases de gancho ("lo que tenés que saber").
3. El copete son dos líneas COMO MUCHO (unas 30 palabras): qué pasó, dónde y cuándo. Nada de contexto antes del hecho, nada de antecedentes largos, nada de "cabe destacar que". Es un adelanto, no el resumen completo: esa profundidad va en el cuerpo (punto 4), nunca en el copete.
4. Además escribís el cuerpo: la nota desarrollada, que es lo que se lee al abrirla. Se arma como una noticia, de lo más importante a lo menos:
   · Primer párrafo: el hecho central con el dato que el copete NO dio (quién, cuándo, dónde, cuánto). Nunca arranca con las mismas palabras del copete ni lo dice de nuevo.
   · Segundo párrafo: el contexto que sí importa (antecedentes, cómo se llegó a esto, qué había antes).
   · Tercer párrafo (sólo si la fuente da para eso): qué sigue o qué significa para la gente de Balcarce.
   Escribí entre uno y cuatro párrafos cortos, separados por un salto de línea en blanco, de hasta tres oraciones cada uno. Tantos párrafos como hechos distintos tenga la fuente: si el texto de origen es largo, desarrollalo (tres o cuatro párrafos); si es corto, uno o dos, sin relleno. Las citas textuales sólo si están en la fuente, entre comillas y atribuidas ("dijo", "explicó"). Nada de conclusiones ni valoraciones al final ("sin dudas", "una gran noticia").
{{TONO}}
6. Los números van redondeados y comparados cuando se pueda ("el triple que el año pasado") antes que un porcentaje con decimales.
7. El guion para la voz ES EL TÍTULO, dicho tal cual, y nada más. Nada de contexto, nada de cierre, nada de "la nota completa en...". Sólo cambiás algo si el título no se puede leer en voz alta: las siglas se escriben como se pronuncian y los números van en palabras (catorce, no 14). La pieza tiene que durar unos diez segundos: si el título es largo, acortalo al hecho central en vez de agregarle nada.
8. La fuente NO se nombra nunca en el guion de voz ni en el título: eso va aparte, en la atribución de la nota. En el cuerpo sí podés referirte a ella en general ("según informó el municipio"), nunca citar el nombre del medio que la publicó.
9. Nunca inventás un dato, una cifra o una cita que no esté en el texto de origen — ni en el copete ni en el cuerpo. Si dos fuentes se contradicen en un dato (una hora, un número), usás el que repiten más o el más reciente, nunca inventás uno propio para "resolver" la diferencia.
10. Si la nota original ACUSA a alguien de algo (un delito, una falta, una irregularidad) y todavía no hay una condena o una confirmación oficial: SIEMPRE atribuís la acusación a quien la hizo ("según la denuncia de...", "de acuerdo con la Policía...", "según fuentes judiciales...") y usás el modo condicional ("habría", no "hizo"). Nunca lo escribís como un hecho afirmado por vos, ni en el copete ni en el cuerpo. Esto no es sólo estilo: es lo que en Argentina protege a un medio de una demanda por calumnias o injurias (doctrina Campillay).
11. Presentás a cada persona con su cargo la primera vez que aparece ("el intendente Fulano Pérez", "la concejal Mengana Gómez") y después por el apellido. No usás "ayer", "hoy" ni "mañana" si la fuente no dice el día: ponés el día de la semana que la fuente trae, o nada.
12. Escribís en castellano correcto, con las tildes y la eñe donde van (últimos, sábado, Napaleofú, señal). Un medio que escribe sin tildes se lee como un mensaje apurado, no como un medio.
13. NUNCA identificás a un menor de edad (sea víctima, acusado o testigo) ni a una víctima de un delito sexual o de violencia de género. Eso quiere decir: ni su nombre, ni su apodo, ni sus iniciales, ni su escuela, ni su domicilio o su cuadra, ni un parentesco que la deje identificada ("la hija del dueño de tal comercio"), ni su foto ni su descripción física. Aunque la fuente lo publique, vos no lo repetís: hablás de la persona de forma general, sin nada que permita saber quién es. No es estilo: lo exigen las leyes 26.061 y 26.485.

Devolvés SOLO un JSON con esta forma exacta, sin texto alrededor:
{"titulo": "...", "copete": "...", "cuerpo": "...", "guion": "..."}`;

const TONO_AMENO = `5. Tono: español rioplatense neutro y cercano. Tercera persona, sin voseo ni modismos: no es un amigo contando algo, es un medio informando — pero se lee liviano, como una novedad del pueblo bien contada, no como un parte frío. Ni solemne ni canchero. Sin adjetivos de opinión en nota informativa, sin exclamaciones, sin "impresionante", "tremendo" ni "increíble".`;

const TONO_SERIO = `5. Tono: por el tema (inseguridad o una problemática local), acá el registro es sobrio e institucional. Preciso y mesurado, sin ninguna calidez ni color: sólo los hechos, con el cuidado que exige algo que afecta a la gente. Nada de liviandad ni de humor. Tercera persona, sin opinión.`;

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
conflictos, protestas, reclamos o alguna emergencia, el punto 5 cambia por el
registro serio de arriba en vez del cercano.

Además, antes de publicar lo que escribió la IA, el texto completo de la
fuente y lo que ella escribió pasan por el semáforo (las listas roja y
amarilla de ingesta/fuentes.mjs). Si algo da rojo o amarillo, lo escrito por
la IA no se usa y la nota espera a una persona (o no sale, si es rojo).`;

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
  if (nota.textoDeLaFuente) partes.push(`Texto completo de la nota original (de acá sale todo lo que podés contar):\n${nota.textoDeLaFuente}`);
  return partes.join('\n');
}

/** Todo lo que la IA recibió de la fuente, junto: contra eso se verifica. Si se
 *  verificara sólo contra un resumen, un dato que venía en otro medio o en el
 *  texto completo pasaría por inventado. */
export function fuenteParaVerificar(nota) {
  return [nota.resumenFuente, ...(nota.fuentesTexto ?? []), nota.textoDeLaFuente].filter(Boolean).join('\n');
}

const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });

// Cuánto se espera a Gemini por pedido. Contesta en unos segundos; un pedido
// colgado sin límite dejaba a "Actualizar la web" esperando hasta que GitHub
// la mataba, sin publicar nada de esa corrida.
export const ESPERA_MAXIMA_GEMINI = 60_000;

/** Un pedido a Gemini con una clave puntual. Devuelve la respuesta cruda
 *  (fetch Response) o lanza si se agotaron los reintentos por saturación.
 *  La clave va en el encabezado `x-goog-api-key` y no en la dirección
 *  (`?key=`): una dirección queda en registros y mensajes de error. */
async function pedir({ prompt, entrada, clave, fetchFn, intentos }) {
  let res;
  for (let i = 1; i <= intentos; i += 1) {
    res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}\n\n---\n\n${entrada}` }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
      }),
      signal: AbortSignal.timeout(ESPERA_MAXIMA_GEMINI),
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
export async function reescribir(nota, { intentos = 3, fetchFn = fetch, correccion = null } = {}) {
  const primera = claveRedaccion();
  const segunda = claveRedes();
  if (!primera && !segunda) throw new Error('falta GEMINI_API_KEY_REDACCION');

  const prompt = instruccionPara(nota);
  let entrada = entradaDe(nota);
  // Segundo intento: se le dice qué inventó y se le pide que lo rehaga sin eso.
  if (correccion?.length) {
    entrada += `\n\nCORRECCIÓN OBLIGATORIA: en un intento anterior tu texto tenía estos problemas, y por eso se descartó:\n- ${correccion.join('\n- ')}\nEscribilo de nuevo usando ÚNICAMENTE lo que dice la fuente de arriba: si un nombre, un número, un día o una cita no está ahí, no lo pongas. Si la fuente da poco, el cuerpo puede ser más corto, pero nunca repite el copete.`;
  }

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
    cuerpo: (salida.cuerpo ?? '').trim(),
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
// que 40 por vuelta son unas 80 por hora: de sobra para lo que Balcarce
// publica en un día. Lo ya reescrito (en caché) no cuenta contra el tope.
export const REESCRITURAS_POR_CORRIDA = 40;
// Si la IA falla tres veces seguidas (Gemini saturado, sin red), se corta:
// insistir sólo llenaría el registro de errores sin cambiar el resultado.
const FALLOS_PARA_CORTAR = 3;

/** ¿Es de acá? Lo local se reescribe primero (ver reescribirAutomaticas). */
export function esLocal(nota) {
  return !!(nota?.local || nota?.seccion === 'Balcarce' || nota?.alcance === 'local');
}

/**
 * El semáforo pasado sobre todo lo que la ingesta no miró.
 *
 * La ingesta decide el color con el título y los primeros 600 caracteres del
 * resumen. Pero la IA reescribe con la nota ENTERA (ingesta/articulo.mjs) y
 * con lo que contaron los otros medios: si el nombre de un chico o de una
 * víctima está en el tercer párrafo, la IA lo lee, y lo que escribe no volvía
 * a pasar por ningún filtro. Leyes 26.061 y 26.485: esto no se negocia.
 *
 * Mira, en este orden: el texto completo de la fuente, los resúmenes de los
 * otros medios y lo que escribió la IA (título, copete, cuerpo y guion).
 * Devuelve { color, motivo } con lo más grave que encontró (el rojo gana), o
 * null si todo está limpio.
 *
 * @param {object} nota   con textoDeLaFuente y fuentesTexto, si los hay
 * @param {object} [escrito]  lo que devolvió la IA
 */
export function semaforoDeLaReescritura(nota, escrito = null) {
  const partes = [
    ['el texto completo de la fuente', nota?.textoDeLaFuente],
    ['lo que contaron otros medios', (nota?.fuentesTexto ?? []).join('\n')],
    ['lo que escribió la IA', escrito ? [escrito.titulo, escrito.copete, escrito.cuerpo, escrito.guion].filter(Boolean).join('\n') : ''],
  ];
  let peor = null;
  for (const [donde, texto] of partes) {
    const s = semaforoDelTexto(texto);
    if (!s) continue;
    const conDonde = { color: s.color, motivo: `${s.motivo}, en ${donde}` };
    if (s.color === 'rojo') return conDonde;
    peor ??= conDonde;
  }
  return peor;
}

/**
 * Una nota verde que, mirada entera, resultó sensible deja de ser verde.
 *
 * Se cambia el objeto que llegó (no una copia) a propósito: quien llama
 * (web/scripts/generar-datos.mjs) decide qué se publica mirando
 * `nota.semaforo` de esas mismas notas DESPUÉS de reescribir. Así, una nota
 * que pasa a amarillo espera a una persona y una que pasa a rojo no sale,
 * igual que si la ingesta la hubiera visto así desde el principio.
 */
function frenar(nota, s) {
  nota.semaforo = s.color;
  nota.motivo = `${s.motivo} (visto al reescribir)`;
}

/** El motivo de un rechazo del verificador, en una línea corta: el tipo de
 *  cada problema y el primero, recortado. Nunca el texto entero. */
export function motivoCorto(problemas = []) {
  const primero = String(problemas[0]?.detalle ?? '').replace(/\s+/g, ' ').slice(0, 100);
  return `${resumirProblemas(problemas)}${primero ? `: ${primero}` : ''}`;
}

/**
 * Lo que la portada de la corrida anterior ya trae reescrito, para no volver
 * a pedírselo a Gemini. La portada no guarda un campo "redactada por IA": la
 * señal es que la nota tenga guion (el resumen mecánico de la fuente no lo
 * tiene). Las que no tienen `cuerpo` (de antes de que existiera) quedan
 * afuera a propósito, para que se reescriban de nuevo con cuerpo.
 */
export function previasDeLaPortada(notas) {
  return Object.fromEntries(notas
    .filter((n) => n.titulo && n.guion && n.cuerpo != null)
    .map((n) => [n.id, {
      titulo: n.titulo, copete: n.copete, cuerpo: n.cuerpo, guion: n.guion, deIA: true,
    }]));
}

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
 * Primero lo de Balcarce (esLocal), y dentro de cada grupo, la de más
 * puntaje: el tope por corrida se gasta en lo que define al medio, no en la
 * Fórmula 1.
 *
 * Antes de pedirle nada a Gemini, el texto completo de la fuente pasa por el
 * semáforo; y lo que escribe la IA, también (semaforoDeLaReescritura). Si da
 * rojo o amarillo, no se usa y la nota cambia de color: deja de salir sola.
 *
 * Cada resultado pasa por `ingesta/verificar.mjs` antes de aceptarse: si la
 * IA agregó un dato que ninguna fuente trae, se descarta y la nota sigue
 * con el resumen mecánico, como salía antes de que existiera esto.
 *
 * @param {object[]} notas   OJO: las que resultan sensibles se modifican (frenar)
 * @param {object} [o]
 * @param {Record<string, {titulo:string,copete:string,cuerpo?:string,guion:string}>} [o.previas]
 * @param {Record<string, object>} [o.decisiones]
 * @param {number} [o.tope]
 * @param {object} [o.opciones] se le pasa tal cual a reescribir() (fetchFn, intentos)
 * @returns {Promise<Record<string, {titulo:string,copete:string,cuerpo?:string,guion:string,deIA:boolean}>>}
 */
export async function reescribirAutomaticas(notas, {
  previas = {}, decisiones = {}, tope = REESCRITURAS_POR_CORRIDA, opciones, traer = traerTexto, registro = console.log,
} = {}) {
  const resultado = {};
  let hechas = 0;
  let fallos = 0;
  let rechazadas = 0;
  let frenadas = 0;
  let sinCuerpoPorFalla = 0;
  let motivo = null;

  const candidatas = [...notas]
    .filter((n) => n.semaforo === 'verde')
    .filter((n) => !decisionHumana(decisiones[n.id]))
    .sort((a, b) => (Number(esLocal(b)) - Number(esLocal(a))) || ((b.relevancia ?? 0) - (a.relevancia ?? 0)));

  // En el registro de Actions no va el título de una nota frenada por el
  // semáforo: si la frenó, puede ser justamente porque identifica a alguien.
  const frenada = (nota, s) => {
    frenar(nota, s);
    frenadas += 1;
    registro(`  semáforo al reescribir · nota ${nota.id} · ${s.color}: ${s.motivo}`);
  };

  for (const nota of candidatas) {
    // Ya se reescribió en una corrida anterior: se revalida (es local y
    // gratis, no pide nada a Gemini) y se reusa sin gastar un pedido nuevo.
    // Así, si mañana se agrega una regla nueva a verificar.mjs, lo que ya
    // estaba publicado y ahora la incumple se cae solo y se vuelve a
    // reescribir en una corrida siguiente, en vez de quedar mal para
    // siempre porque "ya estaba hecho".
    if (previas[nota.id]?.titulo) {
      const cacheada = previas[nota.id];
      // Lo ya publicado también pasa por el semáforo de hoy: si la lista
      // creció (como el 25/09), lo que ya estaba y ahora da rojo o amarillo
      // deja de salir solo en esta misma corrida.
      const sensible = semaforoDeLaReescritura(nota, cacheada);
      if (sensible) { frenada(nota, sensible); continue; }
      // Sólo la forma (largo, tildes, que el cuerpo no repita el copete):
      // los datos ya se compararon contra el texto completo cuando se escribió,
      // y ese texto no se vuelve a bajar en cada corrida.
      const control = verificar(
        { titulo: nota.titulo, resumen: nota.resumenFuente },
        {
          titulo: cacheada.titulo, copete: cacheada.copete, guion: cacheada.guion, cuerpo: cacheada.cuerpo,
        },
        { soloForma: true },
      );
      if (control.ok) { resultado[nota.id] = cacheada; continue; }
      // No entra en resultado: queda el resumen mecánico por ahora, y como
      // no aparece acá tampoco va a aparecer en `previas` la próxima vez, así
      // que se reintenta con Gemini en una corrida futura.
      continue;
    }
    if (hechas >= tope || fallos >= FALLOS_PARA_CORTAR) continue; // sigue por si algo más abajo está en caché

    // El texto completo de la nota original, para que el cuerpo salga de
    // hechos reales y no de rellenar. Si no se puede bajar, se sigue sin él.
    const conTexto = { ...nota, textoDeLaFuente: await traer(nota.enlace) };
    hechas += 1;

    // Antes de gastar un pedido: si la nota entera es sensible, la IA no la
    // escribe y la nota deja de salir sola.
    const deLaFuente = semaforoDeLaReescritura(conTexto);
    if (deLaFuente) { frenada(nota, deLaFuente); continue; }

    const fuente = { titulo: nota.titulo, resumen: fuenteParaVerificar(conTexto) };
    const comprobar = (x) => verificar(fuente, { titulo: x.titulo, copete: x.copete, guion: x.guion, cuerpo: x.cuerpo });

    let r = await reescribirConRespaldo(conTexto, mecanicoPorDefecto, opciones);
    if (!r.deIA) { fallos += 1; motivo ??= r.motivoRespaldo; continue; } // Gemini falló: queda el copete de siempre por ahora
    let control = comprobar(r);

    // Segunda oportunidad: se le dice qué inventó y se le pide que lo rehaga.
    // Antes se tiraba todo apenas aparecía un dato de más, y así sólo 1 de cada
    // 10 notas llegaba a tener cuerpo.
    if (!control.ok) {
      const r2 = await reescribirConRespaldo(conTexto, mecanicoPorDefecto, { ...opciones, correccion: control.problemas.map((p) => p.detalle).slice(0, 6) });
      if (r2.deIA) { r = r2; control = comprobar(r2); }
    }

    // Si lo único que falla es el cuerpo, se publica el título y el copete
    // (que están bien) y la nota queda sin cuerpo: mejor eso que un cuerpo
    // inventado o que repite el copete.
    if (!control.ok && r.cuerpo) {
      const sinCuerpo = { ...r, cuerpo: '' };
      if (comprobar(sinCuerpo).ok) { r = sinCuerpo; control = { ok: true }; sinCuerpoPorFalla += 1; }
    }
    if (!control.ok) {
      // Inventó algo: se descarta, queda el copete de siempre. El motivo va
      // al registro de "Actualizar la web": sin eso, "12 rechazadas" no
      // decía si era un número, un nombre o una tilde.
      rechazadas += 1;
      registro(`  IA rechazada · ${String(nota.titulo).slice(0, 50)} · ${motivoCorto(control.problemas)}`);
      continue;
    }

    // Lo que escribió la IA, por el semáforo antes de publicarse.
    const loEscrito = semaforoDeLaReescritura({}, r);
    if (loEscrito) { frenada(nota, loEscrito); continue; }

    resultado[nota.id] = {
      titulo: r.titulo, copete: r.copete, cuerpo: r.cuerpo, guion: r.guion, deIA: true,
    };
  }

  if (hechas || frenadas) registro(`  reescritura: ${hechas} pedidas, ${fallos} fallaron${motivo ? ` (${String(motivo).slice(0, 160)})` : ''}, ${rechazadas} rechazadas por no cuadrar con la fuente, ${sinCuerpoPorFalla} quedaron sin cuerpo, ${frenadas} frenadas por el semáforo`);
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

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
//
// Desde el 25/09 la IA trabaja como "editor digital" (el modelo que mandaron
// Hernán y Andrés): antes de escribir contrasta las fuentes que recibe, y
// además del título, la bajada y el cuerpo devuelve las claves, qué se sabe,
// qué falta confirmar, qué aportó cada fuente, un texto para redes y
// etiquetas. Todo pasa por el verificador, parte por parte: lo que no cuadra
// con la fuente se descarta sin perder la nota. El NIVEL DE VERIFICACIÓN no
// lo decide la IA sino nivelDeVerificacion(), con reglas fijas.
//
// Sin búsqueda en internet, a propósito (EDITORIAL.md): las "otras fuentes"
// son los medios que contaron lo mismo y los ANTECEDENTES, notas que el sitio
// ya publicó sobre el tema en los últimos 30 días (antecedentesDe).

import { claveRedaccion, claveRedes } from './claves.mjs';
import { verificar, verificarExtras, resumirProblemas } from '../ingesta/verificar.mjs';
import { semaforoDelTexto } from '../ingesta/ingesta.mjs';
import { decisionHumana } from '../ingesta/utiles.mjs';
import { traerTexto } from '../ingesta/articulo.mjs';
import { MEDIOS_OFICIALES } from '../ingesta/fuentes.mjs';
import { palabrasDeTitular } from '../redes/elegir.mjs';
import { rutaDeNota } from '../web/lib/ruta.js';

// "-latest" en vez de un número de versión fijo: la reescritura no necesita
// la última novedad, necesita no romperse cuando Google jubile un modelo
// (como pasó con gemini-2.5-flash, discontinuado para cuentas nuevas).
// "flash-lite" en vez de "flash" a secas: para reescribir un título y un
// copete no hace falta el modelo grande, y en la práctica respondió más
// rápido y con menos 503 de "alta demanda" que el flash normal.
const MODELO = 'gemini-flash-lite-latest';

const REGLAS_FIJAS = `Sos el editor digital de Radar Balcarce, un medio digital de Balcarce (provincia de Buenos Aires, Argentina). Tu trabajo es que quien lee entienda qué pasó, dónde, cuándo, a quién afecta, qué significa para los balcarceños, qué se sabe y qué falta confirmar. Escribís claro, directo y neutral: sin sensacionalismo y sin opinión.

Te llega una noticia que publicó otro medio (a veces más de uno contó lo mismo). Antes de escribir, la investigás con lo que recibís — no tenés nada más que eso, y nada de afuera cuenta:

A. Identificás el hecho central: qué pasó, dónde, cuándo y a quién afecta.
B. Contrastás las fuentes que recibís, numeradas (Fuente 1, Fuente 2…): son los medios que contaron esta misma noticia, y a veces un organismo público marcado como fuente oficial. Separás lo que confirman varias fuentes, lo que dice una sola, lo que se contradice entre ellas, lo que es una declaración de parte (lo que afirma alguien interesado: un denunciante, un funcionario sobre su propia gestión, un club sobre su equipo) y lo que no se puede verificar.
C. Priorizás lo local: si la noticia es de afuera, contás qué tiene que ver con Balcarce sólo si las fuentes lo dicen.
D. Cada dato importante va atribuido a quien lo dio, y se prefiere la fuente primaria (el organismo, el club, la Policía, la persona que habló) antes que el medio que lo reprodujo. Si hay una fuente oficial, su versión va primero.
E. Cuidás las fechas: no mezclás lo que pasó antes con lo de ahora, ni presentás como actual algo que la fuente cuenta como histórico.
F. Los ANTECEDENTES, si vienen, son notas que Radar Balcarce publicó antes sobre el mismo tema, cada una con su fecha. Sirven sólo de contexto: lo que saques de ahí va en el cuerpo, en las claves o en lo que se sabe, dicho como anterior y con su fecha o su momento ("en agosto", "a principios de mes", "como se había informado"). Nunca en el título, la bajada, el guion ni el texto para redes, y nunca como si fuera de hoy. Si un antecedente y la fuente de hoy no coinciden, manda la fuente de hoy.
G. Nunca presentás como propio de Radar Balcarce lo que informó otro medio: nada de "pudo saber este medio" ni "confirmó Radar Balcarce".
H. Si recibiste una sola fuente, no inventás una "ampliación": la nota cuenta lo que esa fuente dice, y en lo que falta confirmar va que todavía no pudo ser contrastada de forma independiente.

Después la escribís, con estas reglas fijas:

1. NUNCA copiás el texto original. Se reescribe con palabras propias, cruzando lo que cuenta cada fuente si hay más de una. Podés citar una frase textual corta si hace falta, entre comillas.
2. El título apunta a unos 70 caracteres y NUNCA pasa de 90, sin signos de admiración, sin pregunta, y se entiende solo en la pantalla del celular. Dice qué pasó: empieza por el hecho (sujeto y verbo en presente: "El Concejo aprueba…", "Ferroviarios gana…"), no por el lugar ni por una etiqueta. Si el hecho es de Balcarce y el título no lo dice, va "en Balcarce" al final. Nunca "Video:", "Ojo:" ni frases de gancho ("lo que tenés que saber").
3. La bajada (el campo "copete") son dos o tres frases cortas, unas 50 palabras como mucho: qué pasó, cómo se relaciona con Balcarce y el dato más importante. Nada de "cabe destacar que" ni antecedentes largos: la profundidad va en el cuerpo (punto 4).
4. Además escribís el cuerpo: el resumen desarrollado de la nota, que es lo que se lee al abrirla, SÓLO con información de las fuentes. Va de 100 a 180 palabras, en uno a tres párrafos cortos separados por un salto de línea en blanco. Si la fuente da poco, escribís lo que dé, sin relleno. Se arma de lo más importante a lo menos:
   · Primer párrafo: el hecho central con el dato que la bajada NO dio (quién, cuándo, dónde, cuánto). Nunca arranca con las mismas palabras de la bajada ni la dice de nuevo.
   · Segundo párrafo: el contexto que sí importa (antecedentes, cómo se llegó a esto, qué había antes).
   · Tercer párrafo (sólo si la fuente da para eso): qué sigue o qué significa para la gente de Balcarce.
   Las citas textuales sólo si están en la fuente, entre comillas y atribuidas ("dijo", "explicó"). Nada de conclusiones ni valoraciones al final ("sin dudas", "una gran noticia").
{{TONO}}
6. Los números van redondeados y comparados cuando se pueda ("el triple que el año pasado") antes que un porcentaje con decimales.
7. El guion para la voz ES EL TÍTULO, dicho tal cual, y nada más. Nada de contexto, nada de cierre, nada de "la nota completa en...". Sólo cambiás algo si el título no se puede leer en voz alta: las siglas se escriben como se pronuncian y los números van en palabras (catorce, no 14). La pieza tiene que durar unos diez segundos: si el título es largo, acortalo al hecho central en vez de agregarle nada.
8. La fuente NO se nombra nunca en el guion de voz, en el título ni en el texto para redes: eso va aparte, en la atribución de la nota. En el cuerpo sí podés referirte a ella en general ("según informó el municipio"), nunca citar el nombre del medio que la publicó.
9. Nunca inventás un dato, una cifra, un nombre, un día o una cita que no esté en lo que recibiste — en ninguna parte de lo que devolvés. Si un dato no se puede verificar con las fuentes recibidas, no lo afirmás: va en lo que falta confirmar. Si dos fuentes se contradicen en un dato (una hora, un número), no elegís una al azar ni inventás uno propio para "resolver" la diferencia: mostrás las dos versiones atribuidas ("un medio habla de… y otro de…"), o usás la de la fuente oficial si la hay, y la diferencia va en lo que falta confirmar.
10. Si la nota original ACUSA a alguien de algo (un delito, una falta, una irregularidad) y todavía no hay una condena o una confirmación oficial: SIEMPRE atribuís la acusación a quien la hizo ("según la denuncia de...", "de acuerdo con la Policía...", "según fuentes judiciales...") y usás el modo condicional ("habría", no "hizo"). Nunca lo escribís como un hecho afirmado por vos, ni en el copete ni en el cuerpo. Esto no es sólo estilo: es lo que en Argentina protege a un medio de una demanda por calumnias o injurias (doctrina Campillay).
11. Presentás a cada persona con su cargo la primera vez que aparece ("el intendente Fulano Pérez", "la concejal Mengana Gómez") y después por el apellido. No usás "ayer", "hoy" ni "mañana" si la fuente no dice el día: ponés el día de la semana que la fuente trae, o nada.
12. Escribís en castellano correcto, con las tildes y la eñe donde van (últimos, sábado, Napaleofú, señal). Un medio que escribe sin tildes se lee como un mensaje apurado, no como un medio.
13. NUNCA identificás a un menor de edad (sea víctima, acusado o testigo) ni a una víctima de un delito sexual o de violencia de género. Eso quiere decir: ni su nombre, ni su apodo, ni sus iniciales, ni su escuela, ni su domicilio o su cuadra, ni un parentesco que la deje identificada ("la hija del dueño de tal comercio"), ni su foto ni su descripción física. Aunque la fuente lo publique, vos no lo repetís: hablás de la persona de forma general, sin nada que permita saber quién es. No es estilo: lo exigen las leyes 26.061 y 26.485.

Además del título, la bajada, el cuerpo y el guion, devolvés:

- claves: de 3 a 5 puntos cortos, de una línea cada uno, con lo esencial de la nota.
- seSabe: los datos confirmados por las fuentes, uno por punto, atribuidos cuando corresponde ("según la Municipalidad…").
- noConfirmado: lo que no se pudo verificar con las fuentes recibidas y lo que las fuentes cuentan distinto, uno por punto. Si no hay nada, una lista vacía. Si recibiste una sola fuente, va este punto tal cual: "No pudo ser contrastado de forma independiente con las fuentes consultadas."
- aportes: por cada fuente que usaste, {"fuente": su número, "aporte": qué información aportó, en una frase}. Sin nombrar al medio: el nombre ya se muestra al lado.
- textoRedes: el texto para el posteo de Facebook, hasta 280 caracteres: qué pasó y por qué le importa a Balcarce. Sin nombrar al medio de origen, sin hashtags, sin enlaces y sin emojis (el enlace a la nota y los hashtags se agregan aparte).
- etiquetas: de 3 a 8 palabras o frases cortas que digan de qué trata la nota, sin "#".
- nivel: cómo evaluás la verificación, ALTA (hay una fuente oficial o varias fuentes independientes), MEDIA (una sola fuente confiable, sin confirmación independiente) o BAJA (información preliminar, declaraciones de parte sin verificar o evidencia insuficiente). Es sólo una sugerencia: el nivel que se publica lo calcula el sistema.

Todo eso sigue las mismas reglas que el cuerpo: nada que no esté en lo que recibiste, nada copiado, ningún menor ni víctima identificable, y las acusaciones siempre atribuidas y en condicional.

Devolvés SOLO un JSON con esta forma exacta, sin texto alrededor:
{"titulo": "...", "copete": "...", "cuerpo": "...", "guion": "...", "claves": ["..."], "seSabe": ["..."], "noConfirmado": ["..."], "aportes": [{"fuente": 1, "aporte": "..."}], "textoRedes": "...", "etiquetas": ["..."], "nivel": "MEDIA"}`;

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
la IA no se usa y la nota espera a una persona (o no sale, si es rojo).

Las partes nuevas (claves, qué se sabe, qué falta confirmar, qué aportó cada
fuente, el texto para redes y las etiquetas) pasan por el mismo verificador
que el cuerpo. Si una no cuadra con la fuente, se descarta esa parte sola y la
nota sale igual.

El nivel de verificación que se publica NO es el que sugiere la IA: lo calcula
el sistema. ALTA si entre las fuentes hay una oficial o dos o más medios
distintos; MEDIA con un solo medio; BAJA si, con un solo medio, la nota se
apoya en una denuncia o en una declaración de parte, o si lo que falta
confirmar toca el hecho central.

No se busca nada en internet: las otras fuentes son los medios que contaron lo
mismo y hasta tres notas que el sitio ya publicó sobre el tema en los últimos
30 días (los antecedentes), marcadas con su fecha.`;

function limpiarJson(texto) {
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('la respuesta no trae un JSON reconocible');
  return JSON.parse(m[0]);
}

const ZONA = 'America/Argentina/Buenos_Aires';

/** "24/09/2026", en la hora de Balcarce. Vacío si no hay fecha. */
export function fechaCorta(iso) {
  const t = Date.parse(iso ?? '');
  if (!Number.isFinite(t)) return '';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: ZONA,
  }).format(new Date(t));
}

/**
 * Las fuentes de la noticia, en el orden en que la IA las recibe numeradas:
 * la principal primero. Las notas de la ingesta nueva (25/09) las traen en
 * `origenes`, con su medio, su enlace, su fecha y si son oficiales. Para las
 * de antes se arman con lo que haya, sin adivinar el medio de las demás.
 */
export function origenesDe(nota) {
  if (nota?.origenes?.length) {
    return nota.origenes.map((o) => ({
      medio: o.medio ?? null,
      enlace: o.enlace ?? null,
      fecha: o.fecha ?? null,
      oficial: !!o.oficial || MEDIOS_OFICIALES.has(o.medio),
      resumen: o.resumen ?? '',
    }));
  }
  const medio = nota?.medio ?? nota?.medios?.[0] ?? null;
  const principal = {
    medio,
    enlace: nota?.enlace ?? null,
    fecha: nota?.cuando === 'sin fecha en la fuente' ? null : (nota?.fecha ?? null),
    oficial: MEDIOS_OFICIALES.has(medio),
    resumen: nota?.resumenFuente ?? '',
  };
  const otras = (nota?.fuentesTexto ?? []).filter(Boolean).map((resumen) => ({
    medio: null, enlace: null, fecha: null, oficial: false, resumen,
  }));
  return [principal, ...otras];
}

/**
 * Las notas que el sitio ya publicó sobre el mismo tema: los ANTECEDENTES.
 *
 * Sin buscar en internet (EDITORIAL.md): salen del archivo del sitio
 * (web/data/archivo.json). Cuentan las de los últimos `dias` días, anteriores
 * a la nota, que comparten un tema de los que sigue el sitio (`temas`) o dos
 * palabras que dicen algo del titular. Las más parecidas primero y, entre
 * iguales, las más nuevas. Como mucho `maximo`.
 */
export function antecedentesDe(nota, archivo = [], { ahora = Date.now(), dias = 30, maximo = 3 } = {}) {
  const desde = Number(ahora) - dias * 86400000;
  const tope = Math.min(Number(ahora), Date.parse(nota?.fecha ?? '') || Number(ahora));
  const temas = new Set(nota?.temas ?? []);
  const propias = palabrasDeTitular(nota?.titulo);
  return (archivo ?? [])
    .map((a) => {
      if (!a?.id || !a.titulo || a.id === nota?.id) return null;
      const t = Date.parse(a.fecha ?? '');
      if (!Number.isFinite(t) || t < desde || t >= tope) return null;
      const comunes = [...palabrasDeTitular(a.titulo)].filter((w) => propias.has(w)).length;
      const mismoTema = (a.temas ?? []).some((x) => temas.has(x));
      if (!mismoTema && comunes < 2) return null;
      return { a, t, peso: comunes * 2 + (mismoTema ? 1 : 0) };
    })
    .filter(Boolean)
    .sort((x, y) => (y.peso - x.peso) || (y.t - x.t))
    .slice(0, maximo)
    .map(({ a }) => ({
      id: a.id, titulo: a.titulo, copete: a.copete ?? '', fecha: a.fecha, ruta: rutaDeNota(a),
    }));
}

/** Los antecedentes como los lee la IA (y como los compara el verificador):
 *  cada uno con su fecha adelante. */
function textoDeAntecedentes(antecedentes = []) {
  return antecedentes.map((a) => `[${fechaCorta(a.fecha)}] ${a.titulo}. ${a.copete ?? ''}`.trim()).join('\n');
}

/** El texto que recibe el modelo: el titular, cada fuente numerada con su
 *  medio y su fecha (para que cruce en vez de repetir una, y para que en
 *  `aportes` diga qué dio cada una), el texto completo de la principal y los
 *  antecedentes, marcados como información anterior. */
function entradaDe(nota) {
  const origenes = origenesDe(nota);
  const partes = [
    `Fecha de hoy: ${fechaCorta(new Date().toISOString())}`,
    `Sección: ${nota.seccion}`,
    `Titular original (de ${nota.medios?.join(' / ') ?? 'la fuente'}): ${nota.titulo}`,
    `FUENTES (${origenes.length === 1 ? 'una sola: no hay confirmación independiente' : `${origenes.length}, numeradas`}):`,
  ];
  origenes.forEach((o, i) => {
    const datos = [o.medio ?? 'otro medio', o.oficial ? 'fuente oficial' : null, o.fecha ? `publicada el ${fechaCorta(o.fecha)}` : null].filter(Boolean).join(' · ');
    partes.push(`Fuente ${i + 1} (${datos}): ${o.resumen || '(sin resumen)'}`);
  });
  if (nota.textoDeLaFuente) partes.push(`Texto completo de la Fuente 1 (de acá sale todo lo que podés contar):\n${nota.textoDeLaFuente}`);
  if (nota.antecedentes?.length) {
    partes.push(`ANTECEDENTES: notas que Radar Balcarce publicó ANTES sobre el tema. Es información ANTERIOR, no de hoy: si usás algo de acá, va con su fecha o su momento, sólo en el cuerpo, las claves o lo que se sabe.\n${textoDeAntecedentes(nota.antecedentes)}`);
  }
  return partes.join('\n');
}

/** Todo lo que la IA recibió de la fuente, junto: contra eso se verifica. Si se
 *  verificara sólo contra un resumen, un dato que venía en otro medio o en el
 *  texto completo pasaría por inventado. */
export function fuenteParaVerificar(nota) {
  const resumenes = nota?.origenes?.length
    ? nota.origenes.map((o) => o.resumen)
    : [nota.resumenFuente, ...(nota.fuentesTexto ?? [])];
  return [...resumenes, nota.textoDeLaFuente].filter(Boolean).join('\n');
}

/** Lo que se le pasa al verificador: la fuente de hoy y, aparte, los
 *  antecedentes (que valen sólo como información anterior). */
export function materialParaVerificar(nota) {
  return {
    titulo: nota.titulo,
    resumen: fuenteParaVerificar(nota),
    antecedentes: textoDeAntecedentes(nota.antecedentes ?? []),
  };
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
 * fuentesTexto?, origenes?, textoDeLaFuente?, antecedentes? }. Devuelve
 * { titulo, copete, cuerpo, guion, deIA: true } más las partes nuevas que haya
 * mandado (extrasDeLaRespuesta, todavía sin verificar), o lanza si Gemini
 * falla — quien llama decide el respaldo (ver reescribirConRespaldo).
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
    ...extrasDeLaRespuesta(salida),
    deIA: true,
  };
}

/** Una lista de textos limpia: sólo textos con algo, sin repetir, hasta `max`. */
function listaDeTextos(valor, max) {
  if (!Array.isArray(valor)) return [];
  const vistos = new Set();
  return valor
    .map((v) => String(typeof v === 'string' ? v : '').replace(/\s+/g, ' ').trim())
    .filter((v) => v && !vistos.has(v.toLowerCase()) && vistos.add(v.toLowerCase()))
    .slice(0, max);
}

/**
 * Las partes nuevas de la respuesta (25/09), limpias de forma: listas de
 * textos, sin vacíos, con topes, y las etiquetas sin "#". Si la IA no las
 * mandó, no aparecen. Todavía no están verificadas: eso lo hace
 * completarReescritura().
 */
export function extrasDeLaRespuesta(salida = {}) {
  const extras = {};
  const claves = listaDeTextos(salida.claves, 5);
  const seSabe = listaDeTextos(salida.seSabe, 6);
  const noConfirmado = listaDeTextos(salida.noConfirmado, 6);
  const aportes = (Array.isArray(salida.aportes) ? salida.aportes : [])
    .map((a) => ({ fuente: Number(a?.fuente), aporte: String(a?.aporte ?? '').replace(/\s+/g, ' ').trim() }))
    .filter((a) => Number.isInteger(a.fuente) && a.fuente >= 1 && a.aporte)
    .slice(0, 8);
  const etiquetas = listaDeTextos((Array.isArray(salida.etiquetas) ? salida.etiquetas : [])
    .map((e) => String(e ?? '').replace(/^#+/, '')), 8);
  const textoRedes = String(salida.textoRedes ?? '').replace(/\s+/g, ' ').trim();
  const nivel = String(salida.nivel ?? '').trim().toUpperCase();

  if (claves.length) extras.claves = claves;
  if (seSabe.length) extras.seSabe = seSabe;
  if (noConfirmado.length) extras.noConfirmado = noConfirmado;
  if (aportes.length) extras.aportes = aportes;
  if (textoRedes) extras.textoRedes = textoRedes;
  if (etiquetas.length) extras.etiquetas = etiquetas;
  if (['ALTA', 'MEDIA', 'BAJA'].includes(nivel)) extras.nivelSugerido = nivel;
  return extras;
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

/** Todo lo que escribió la IA, junto, para pasarlo por el semáforo. */
function textoEscrito(e) {
  return [
    e.titulo, e.copete, e.cuerpo, e.guion,
    ...(e.claves ?? []), ...(e.seSabe ?? []), ...(e.noConfirmado ?? []),
    ...(e.aportes ?? []).map((a) => a?.aporte),
    ...(e.fuentesConsultadas ?? []).map((f) => f?.aporte),
    e.textoRedes, ...(e.etiquetas ?? []),
  ].filter(Boolean).join('\n');
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
 * otros medios y lo que escribió la IA (título, copete, cuerpo y guion, y
 * desde el 25/09 también las claves, qué se sabe, qué falta confirmar, qué
 * aportó cada fuente, el texto para redes y las etiquetas).
 * Devuelve { color, motivo } con lo más grave que encontró (el rojo gana), o
 * null si todo está limpio.
 *
 * @param {object} nota   con textoDeLaFuente y fuentesTexto, si los hay
 * @param {object} [escrito]  lo que devolvió la IA
 */
export function semaforoDeLaReescritura(nota, escrito = null) {
  // Lo que se ve primero (el título, la bajada y el texto para redes) pasa
  // por el semáforo entero, como el título y el comienzo de la fuente. Lo
  // largo (el artículo completo, lo de otros medios, el cuerpo y las partes
  // nuevas) sólo por el rojo y lo de menores y víctimas: decisión del 25/09,
  // ver AMARILLO_MENORES en ingesta/fuentes.mjs.
  const aLaVista = escrito ? [escrito.titulo, escrito.copete, escrito.guion, escrito.textoRedes].filter(Boolean).join('\n') : '';
  const partes = [
    ['el texto completo de la fuente', nota?.textoDeLaFuente, true],
    ['lo que contaron otros medios', (nota?.fuentesTexto ?? []).join('\n'), true],
    ['lo que escribió la IA (título, bajada o texto para redes)', aLaVista, false],
    ['lo que escribió la IA', escrito ? textoEscrito(escrito) : '', true],
  ];
  let peor = null;
  for (const [donde, texto, soloMenores] of partes) {
    const s = semaforoDelTexto(texto, { soloMenores });
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

// ------------------------------------------------ el nivel de verificación

/** Lo que va en "Qué falta confirmar" cuando hay una sola fuente. */
export const FRASE_FUENTE_UNICA = 'No pudo ser contrastado de forma independiente con las fuentes consultadas.';

const normalizar = (s = '') => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// Una denuncia o una declaración de parte (doctrina Campillay): lo que alguien
// afirma o acusa, no un hecho comprobado. "Según" a secas no: la instrucción
// pide atribuir todo ("según informó el municipio") y eso no es una denuncia.
const DE_PARTE = /\b(denuncia\w*|denuncio|denunciaron|acusa|acusan|acuso|acusaron|acusacion\w*|acusad\w*|habria|habrian|presunt\w*|supuest\w*|segun (trascendio|fuentes|la denuncia|el denunciante|la denunciante|testigos|vecinos|familiares|allegados)|aseguro que|afirmo que|sostuvo que|reclamo que)\b/;

const EN_PALABRAS = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis'];

/** Cuántas fuentes hay, contadas como corresponde: los medios distintos (dos
 *  secciones de Clarín son UN medio) y los organismos oficiales aparte. */
function contarFuentes(origenes = [], medios = []) {
  const oficiales = [...new Set(origenes.filter((o) => o.oficial).map((o) => o.medio).filter(Boolean))];
  const deMedios = new Set([
    ...origenes.filter((o) => !o.oficial).map((o) => o.medio),
    ...medios.filter((m) => !MEDIOS_OFICIALES.has(m)),
  ].filter(Boolean).map(normalizar));
  const nOficiales = oficiales.length || (origenes.some((o) => o.oficial) ? 1 : 0);
  const nMedios = deMedios.size || (origenes.some((o) => !o.oficial) ? 1 : 0);
  return { oficiales, nOficiales, nMedios };
}

/** ¿Este dato sin confirmar toca el hecho central? Comparte con el título dos
 *  palabras que dicen algo, o una larga ("autódromo", "presupuesto"). */
function tocaElHecho(dato, titulo) {
  const delTitulo = palabrasDeTitular(titulo);
  const comunes = [...palabrasDeTitular(dato)].filter((w) => delTitulo.has(w));
  return comunes.length >= 2 || comunes.some((w) => w.length >= 8);
}

/**
 * El nivel de verificación de una nota, con su porqué. Lo calcula el código,
 * no la IA (la IA sugiere uno y queda anotado, pero no manda):
 *
 *   ALTA   hay una fuente oficial (la Municipalidad u otro organismo público,
 *          `oficial: true` en ingesta/fuentes.mjs) o dos o más medios
 *          distintos contaron lo mismo.
 *   MEDIA  un solo medio, sin confirmación independiente.
 *   BAJA   un solo medio y la nota se apoya en una denuncia o una declaración
 *          de parte (denuncia, acusó, habría, presunto, "según trascendió"…,
 *          en el titular original, el título o la bajada); o, con cualquier
 *          cantidad de fuentes, lo que falta confirmar toca el hecho central.
 *
 * Devuelve { nivel, porque, sugeridoPorIA } o null si no se sabe de dónde
 * salió la nota.
 */
export function nivelDeVerificacion({
  origenes = [], medios = [], escrito = {}, tituloFuente = '', sugerido = null,
} = {}) {
  const { oficiales, nOficiales, nMedios } = contarFuentes(origenes, medios);
  if (!nOficiales && !nMedios) return null;
  const con = (nivel, porque) => ({ nivel, porque, sugeridoPorIA: sugerido ?? null });

  const centrales = (escrito.noConfirmado ?? [])
    .filter((d) => normalizar(d) !== normalizar(FRASE_FUENTE_UNICA))
    .filter((d) => tocaElHecho(d, escrito.titulo || tituloFuente));
  if (centrales.length) return con('BAJA', 'Hay datos centrales de la nota que no pudieron confirmarse con las fuentes consultadas.');

  const cuantos = EN_PALABRAS[nMedios] ?? String(nMedios);
  if (nOficiales) {
    const quien = oficiales[0] ?? 'un organismo oficial';
    if (!nMedios) return con('ALTA', `Sale de una fuente oficial: ${quien}.`);
    if (nMedios === 1) return con('ALTA', `Lo informaron ${quien} y un medio independiente.`);
    return con('ALTA', `Lo confirman ${cuantos} medios independientes y ${quien}.`);
  }
  if (nMedios >= 2) return con('ALTA', `Lo contaron ${cuantos} medios independientes.`);

  const central = normalizar(`${tituloFuente} ${escrito.titulo ?? ''} ${escrito.copete ?? ''}`);
  if (DE_PARTE.test(central)) {
    return con('BAJA', 'Se apoya en una denuncia o en declaraciones de parte que informó un solo medio, sin confirmación independiente.');
  }
  return con('MEDIA', 'La informó un solo medio y todavía no pudo ser contrastada de forma independiente.');
}

// ---------------------------------------------------- las partes nuevas

/** Los campos que la nota suma desde el 25/09, tal como llegan a la web. */
export const CAMPOS_EXTRA = [
  'claves', 'seSabe', 'noConfirmado', 'textoRedes', 'etiquetas', 'fuentesConsultadas', 'antecedentes', 'verificacion',
];

/** Sólo las partes nuevas de un objeto (las que tienen algo). */
export function extrasDe(o) {
  if (!o) return {};
  return Object.fromEntries(CAMPOS_EXTRA
    .filter((k) => o[k] != null && !(Array.isArray(o[k]) && !o[k].length))
    .map((k) => [k, o[k]]));
}

/** Un objeto sin las partes nuevas. */
export function sinExtras(o = {}) {
  return Object.fromEntries(Object.entries(o).filter(([k]) => !CAMPOS_EXTRA.includes(k)));
}

/**
 * Las partes nuevas que van a la web: las de la decisión del panel si ahí hay
 * texto propio (la escribió la IA desde el panel, o una persona, y en ese
 * caso el panel ya las borró si cambió el texto); si no, las de la
 * reescritura automática. Nunca se mezclan: unas claves escritas sobre otro
 * texto podrían contradecir la nota.
 */
export function extrasParaLaWeb(decision, auto) {
  const textoPropio = !!decision && ['titulo', 'copete', 'cuerpo', 'guion'].some((k) => decision[k] != null);
  return extrasDe(textoPropio ? decision : auto);
}

/** Los medios que el texto para redes no puede nombrar: los de la noticia,
 *  menos los organismos oficiales ("según la Municipalidad" es atribuir). */
function mediosQueNoSeNombran(nota, origenes) {
  return [...origenes.filter((o) => !o.oficial).map((o) => o.medio), ...(nota.medios ?? []).filter((m) => !MEDIOS_OFICIALES.has(m))]
    .filter(Boolean);
}

/**
 * Las partes nuevas, verificadas y listas para publicar.
 *
 * Cada parte pasa por el verificador (verificarExtras) contra todo lo que la
 * IA recibió, antecedentes incluidos; la que no cuadra se descarta sola y la
 * nota sigue. Además:
 *   · si hay una sola fuente, "Qué falta confirmar" dice que no pudo
 *     contrastarse (y si hay varias, esa frase no va, aunque la IA la ponga);
 *   · el nivel de verificación se calcula acá (nivelDeVerificacion);
 *   · "Fuentes consultadas" se arma con los datos de la ingesta (medio,
 *     enlace, fecha) y lo que la IA dijo que aportó cada una.
 *
 * @returns {{ extras: object, descartados: {campo:string, problemas:object[]}[] }}
 */
export function completarReescritura(nota, r) {
  const origenes = origenesDe(nota);
  const pedidos = {
    claves: r.claves,
    seSabe: r.seSabe,
    noConfirmado: r.noConfirmado,
    // Un número de fuente que no existe no se muestra, sin tirar el resto.
    aportes: (r.aportes ?? []).filter((a) => a.fuente >= 1 && a.fuente <= origenes.length),
    textoRedes: r.textoRedes,
    etiquetas: r.etiquetas,
  };
  const control = verificarExtras(materialParaVerificar(nota), pedidos, { medios: mediosQueNoSeNombran(nota, origenes) });

  const quedan = {};
  const descartados = [];
  for (const campo of ['claves', 'seSabe', 'noConfirmado', 'aportes', 'textoRedes']) {
    if (!control[campo]) continue;
    if (control[campo].ok) quedan[campo] = pedidos[campo];
    else descartados.push({ campo, problemas: control[campo].problemas });
  }
  if (control.etiquetas) {
    if (control.etiquetas.validas.length) quedan.etiquetas = control.etiquetas.validas;
    if (!control.etiquetas.ok) descartados.push({ campo: 'etiquetas', problemas: control.etiquetas.problemas });
  }

  const { nOficiales, nMedios } = contarFuentes(origenes, nota.medios ?? []);
  const unica = nOficiales + nMedios === 1;
  const noConfirmado = [
    ...(quedan.noConfirmado ?? []).filter((d) => normalizar(d) !== normalizar(FRASE_FUENTE_UNICA)),
    ...(unica ? [FRASE_FUENTE_UNICA] : []),
  ];

  const verificacion = nivelDeVerificacion({
    origenes, medios: nota.medios ?? [], escrito: { ...r, noConfirmado }, tituloFuente: nota.titulo, sugerido: r.nivelSugerido,
  });

  const vistos = new Set();
  const fuentesConsultadas = origenes
    .map((o, i) => ({
      medio: o.medio, enlace: o.enlace, fecha: o.fecha, oficial: !!o.oficial,
      aporte: quedan.aportes?.find((a) => a.fuente === i + 1)?.aporte ?? null,
    }))
    .filter((f) => (f.medio || f.enlace) && !(f.enlace && vistos.has(f.enlace)) && (!f.enlace || vistos.add(f.enlace)));

  const antecedentes = (nota.antecedentes ?? []).map(({
    id, titulo, fecha, ruta,
  }) => ({
    id, titulo, fecha, ruta,
  }));

  return {
    extras: extrasDe({
      claves: quedan.claves,
      seSabe: quedan.seSabe,
      noConfirmado,
      textoRedes: quedan.textoRedes,
      etiquetas: quedan.etiquetas,
      fuentesConsultadas,
      antecedentes,
      verificacion,
    }),
    descartados,
  };
}

/**
 * Lo ya publicado, revalidado con las reglas de forma de hoy (largo, tildes,
 * acusaciones, que el texto para redes no nombre al medio): la parte que ya
 * no pasa se saca, sin tocar el resto ni pedir nada a Gemini.
 */
export function revalidarExtras(cacheada = {}, nota = {}) {
  const fuentes = cacheada.fuentesConsultadas ?? [];
  const pedidos = {
    claves: cacheada.claves,
    seSabe: cacheada.seSabe,
    noConfirmado: cacheada.noConfirmado,
    aportes: fuentes.map((f, i) => ({ fuente: i + 1, aporte: f?.aporte })).filter((a) => a.aporte),
    textoRedes: cacheada.textoRedes,
    etiquetas: cacheada.etiquetas,
  };
  const control = verificarExtras({ titulo: nota.titulo, resumen: nota.resumenFuente }, pedidos, {
    soloForma: true, medios: mediosQueNoSeNombran(nota, fuentes),
  });
  const limpia = { ...cacheada };
  for (const campo of ['claves', 'seSabe', 'noConfirmado', 'textoRedes']) {
    if (control[campo] && !control[campo].ok) delete limpia[campo];
  }
  if (control.aportes && !control.aportes.ok) limpia.fuentesConsultadas = fuentes.map((f) => ({ ...f, aporte: null }));
  if (control.etiquetas && !control.etiquetas.ok) {
    if (control.etiquetas.validas.length) limpia.etiquetas = control.etiquetas.validas;
    else delete limpia.etiquetas;
  }
  return limpia;
}

/**
 * Lo que la portada de la corrida anterior ya trae reescrito, para no volver
 * a pedírselo a Gemini. La portada no guarda un campo "redactada por IA": la
 * señal es que la nota tenga guion (el resumen mecánico de la fuente no lo
 * tiene). Las que no tienen `cuerpo` (de antes de que existiera) quedan
 * afuera a propósito, para que se reescriban de nuevo con cuerpo.
 *
 * Las partes nuevas (25/09) viajan con la nota. Lo reescrito antes de que
 * existieran NO se vuelve a pedir para llenarlas: nunca se paga dos veces por
 * lo mismo, y esas notas se ven como se veían.
 */
export function previasDeLaPortada(notas) {
  return Object.fromEntries(notas
    .filter((n) => n.titulo && n.guion && n.cuerpo != null)
    .map((n) => [n.id, {
      titulo: n.titulo, copete: n.copete, cuerpo: n.cuerpo, guion: n.guion, ...extrasDe(n), deIA: true,
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
 * Desde el 25/09, además, las partes nuevas (claves, qué se sabe, qué falta
 * confirmar, fuentes consultadas, texto para redes, etiquetas) y el nivel de
 * verificación: completarReescritura(). Si falla una parte, se descarta esa
 * sola, sin reintentar (un segundo pedido sólo se hace si falla el título, la
 * bajada, el cuerpo o el guion, como antes).
 *
 * @param {number} [o.tope]
 * @param {object[]} [o.archivo] lo ya publicado (web/data/archivo.json), de donde salen los antecedentes
 * @param {object} [o.opciones] se le pasa tal cual a reescribir() (fetchFn, intentos)
 * @returns {Promise<Record<string, {titulo:string,copete:string,cuerpo?:string,guion:string,deIA:boolean}>>}
 */
export async function reescribirAutomaticas(notas, {
  previas = {}, decisiones = {}, tope = REESCRITURAS_POR_CORRIDA, opciones, traer = traerTexto, registro = console.log,
  archivo = [], ahora = Date.now(),
} = {}) {
  const resultado = {};
  let hechas = 0;
  let fallos = 0;
  let rechazadas = 0;
  let frenadas = 0;
  let sinCuerpoPorFalla = 0;
  let partesDescartadas = 0;
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
      const cacheada = revalidarExtras(previas[nota.id], nota);
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
    // Y los antecedentes: lo que el sitio ya publicó sobre el tema.
    const conTexto = {
      ...nota, textoDeLaFuente: await traer(nota.enlace), antecedentes: antecedentesDe(nota, archivo, { ahora }),
    };
    hechas += 1;

    // Antes de gastar un pedido: si la nota entera es sensible, la IA no la
    // escribe y la nota deja de salir sola.
    const deLaFuente = semaforoDeLaReescritura(conTexto);
    if (deLaFuente) { frenada(nota, deLaFuente); continue; }

    const fuente = materialParaVerificar(conTexto);
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

    // Las partes nuevas, cada una por el verificador: la que no cuadra se
    // descarta sola. En el registro, el id y no el título.
    const { extras, descartados } = completarReescritura(conTexto, r);
    if (descartados.length) {
      partesDescartadas += descartados.length;
      registro(`  partes descartadas · nota ${nota.id} · ${descartados.map((d) => `${d.campo}: ${motivoCorto(d.problemas)}`).join(' · ')}`);
    }

    // Lo que escribió la IA, todo, por el semáforo antes de publicarse.
    const loEscrito = semaforoDeLaReescritura({}, { ...r, ...extras });
    if (loEscrito) { frenada(nota, loEscrito); continue; }

    resultado[nota.id] = {
      titulo: r.titulo, copete: r.copete, cuerpo: r.cuerpo, guion: r.guion, ...extras, deIA: true,
    };
  }

  if (hechas || frenadas) registro(`  reescritura: ${hechas} pedidas, ${fallos} fallaron${motivo ? ` (${String(motivo).slice(0, 160)})` : ''}, ${rechazadas} rechazadas por no cuadrar con la fuente, ${sinCuerpoPorFalla} quedaron sin cuerpo, ${partesDescartadas} partes nuevas descartadas, ${frenadas} frenadas por el semáforo`);
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

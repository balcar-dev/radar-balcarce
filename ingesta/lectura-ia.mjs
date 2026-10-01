// La lectura rápida con IA (plan V2.2, docs/historico/PLAN-V2.2.md § 7).
//
// Una IA lee el título y el resumen de cada nota nueva, con el perfil de
// Balcarce al lado (ingesta/perfil-balcarce.md) y la ciudad del medio, y
// completa una ficha: de dónde es el hecho, de qué sección es, si le importa a
// un vecino de Balcarce y por qué.
//
// DESDE EL 27/09 DECIDE, sin prueba previa (Hernán: se corrige en vivo). Las
// fichas se guardan en web/data/fichas.json y aplicarFichas() las usa: saca lo
// que no es para Radar, corrige la sección y dice qué es de Balcarce. El
// semáforo sigue mandando y sin ficha queda lo de siempre.
//
// Usa la clave de clasificación; mientras no esté cargada, la gratis de
// redacción. Nunca la paga de redes (reels/claves.mjs). Sin dependencias: sólo
// fetch de Node.

import fs from 'node:fs';
import path from 'node:path';
import { claveClasificacion, claveGroq, leerVariable, MODELO_DE_TEXTO } from '../reels/claves.mjs';
import { fichaDeFuente, FUENTES, FUENTES_NACIONALES, CONEXION_ARGENTINA, PALABRAS_LOCALES, PALABRAS_ZONA } from './fuentes.mjs';
import { FUENTES_CRUCE } from './fuentes-cruce.mjs';
import { diaAR } from './zona.mjs';
import { sinTildes } from '../web/lib/texto.js';

/** ¿El título nombra a Balcarce o a una localidad del partido? */
function nombraBalcarceEnElTitulo(n) {
  const titulo = sinTildes(n.titulo ?? '');
  return PALABRAS_LOCALES.some((p) => titulo.includes(sinTildes(p)));
}

const AQUI = import.meta.dirname;
const MODELO = MODELO_DE_TEXTO;

// El segundo proveedor (28/09): gpt-oss-120b, el modelo de OpenAI que Groq
// aloja gratis (Llama dejó de estar en el plan gratis en agosto). Sólo para
// TEXTO: la lectura no manda imágenes.
const MODELO_GROQ = 'openai/gpt-oss-120b';

/** Las secciones que puede elegir: las de la web, sin inventar ninguna. */
export const SECCIONES_DE_LA_FICHA = ['Balcarce', 'Política', 'Policiales', 'Fútbol', 'Deportes', 'Automovilismo',
  'Economía', 'Agro', 'Tecnología', 'Cultura y agenda', 'Argentina'];
export const AMBITOS = ['balcarce', 'region', 'provincia', 'nacional', 'internacional'];
export const IMPACTOS = ['directo', 'indirecto', 'nulo'];
export const RAZONES = ['local', 'servicio', 'actividad', 'provincia', 'nacional', 'popular', 'ninguna'];
export const IMPORTANCIAS = ['alta', 'media', 'baja'];

/** Los números de la lectura con IA (decide desde el 27/09). */
export const LECTURA = {
  // 12 y no 20: con 20 notas y sus bajadas, un pedido de cada tres pasaba el
  // minuto de espera y se perdía (27/09).
  notasPorPedido: 12,
  // Por corrida y por día. Mientras la lectura comparte la clave gratis de la
  // redacción (500 pedidos por día), 60; con su propia clave
  // (GEMINI_API_KEY_CLASIFICACION), 200: el 27/09 quedaron 170 historias de
  // afuera sin leer porque se habían gastado los 60 (topeDeLecturas).
  pedidosPorCorrida: 5,
  pedidosPorDia: 60,
  pedidosPorDiaConClavePropia: 200,
  // Las repetidas: una vuelta por corrida como mucho, y sólo si cambió la
  // lista. Cada vuelta hace hasta dos pedidos (lo que va a salir, y lo de
  // afuera que espera por pocos medios) y cuenta como una contra este tope
  // (web/scripts/generar-datos.mjs).
  pedidosRepetidasPorDia: 60,
  // Cuánto se guarda una ficha.
  diasDeFichas: 3,
  resumenMaximo: 500,
};

const INSTRUCCION = `Sos el editor de selección de Radar Balcarce, un medio digital de Balcarce, provincia de Buenos Aires.
Con el perfil de Balcarce que sigue, decidí para cada nota qué valor tiene para una persona que vive en Balcarce.

Reglas:
- Juzgá por lo que cuenta la nota, no por palabras sueltas: que aparezca "Fangio", "taller" o "Balcarce" no define nada. Definí de qué trata el hecho.
- El ámbito es el del HECHO, no el del medio que lo publica. Cada nota dice de qué ciudad es el medio.
- Lo que hace o dice el gobierno argentino en el exterior (el Presidente en un viaje, Malvinas en la ONU) es "nacional", no "internacional".
- Si una medida provincial o nacional cambia algo concreto en Balcarce (una tarifa, un subsidio, un trámite, un precio acá), el impacto es "directo" aunque el ámbito sea provincia o nacional.
- Que la nota mencione Balcarce (por ejemplo, en una lista de localidades) no la hace de Balcarce.
- Si no es de Balcarce, decí en una frase concreta por qué le interesaría a un vecino de Balcarce. Si no hay una razón concreta, el impacto es "nulo" y la razón "ninguna". No inventes vínculos con Balcarce.
- "impacto_balcarce": "directo" si pasa en Balcarce o cambia algo concreto acá; "indirecto" si toca la zona o una actividad de la ciudad (campo, papa, automovilismo); "nulo" si no.
- "razon": local (pasó acá), servicio (cambia algo práctico para los vecinos: tarifas, trámites, salud, clima, rutas), actividad (automovilismo, campo, papa), provincia (medida provincial con efecto acá), nacional (noticia nacional importante), popular (tema del que habla todo el país) o ninguna.
- "seccion", qué va en cada una:
  · Balcarce: lo que pasa en la ciudad y no tiene una sección más precisa (vecinos, instituciones, obras, escuelas, salud local), y también lo práctico para el vecino: cortes de luz o agua, trámites, horarios de atención, tarifas y subsidios de servicios públicos, vencimientos, alertas.
  · Política: el Concejo, el intendente, el gobierno provincial y nacional, leyes, elecciones.
  · Policiales: delitos, accidentes, incendios, bomberos, policía.
  · Fútbol: el fútbol, de la liga de Balcarce a la Selección y los clubes argentinos.
  · Deportes: todos los demás deportes (básquet, hockey, rugby, tenis, boxeo, UFC, ajedrez, atletismo…), salvo el automovilismo.
  · Automovilismo: autos de carrera (TC, Turismo Nacional, Fórmula 1, MotoGP, karting, rally), el autódromo Juan Manuel Fangio y Fangio. Nunca Deportes.
  · Economía: precios, inflación, dólar, empleo, empresas, combustibles.
  · Agro: campo, papa, ganadería, INTA, clima para el productor.
  · Tecnología: tecnología, ciencia, inteligencia artificial.
  · Cultura y agenda: espectáculos, música, teatro, cine, libros, muestras, actividades.
  · Argentina: lo nacional que no entra en ninguna de las anteriores (sociedad, clima, salud, educación, grandes hechos).
- "es_publicidad": true si promociona un comercio, producto o servicio sin ser noticia.
- "es_chimento": true si es farándula o la vida privada de famosos (romances, casamientos, separaciones, peleas, internaciones, fiestas o viajes de gente de la tele, la música o las redes). La muerte de una figura, un premio, un estreno o una obra no son chimento.
- Devolvé una ficha por nota, con el mismo "id".`;

let perfilCacheado = null;
/** El perfil de Balcarce, leído tal cual del archivo. */
export function perfilDeBalcarce() {
  if (perfilCacheado == null) {
    perfilCacheado = fs.readFileSync(path.join(AQUI, 'perfil-balcarce.md'), 'utf8');
  }
  return perfilCacheado;
}

// Con las del cruce: sin ellas, los medios del cruce iban a la IA con la
// ciudad "desconocida" (27/09).
const FUENTE_POR_MEDIO = new Map([...FUENTES_CRUCE, ...FUENTES, ...FUENTES_NACIONALES].map((f) => [f.medio, f]));

/** Cuántos pedidos de fichas se hacen por día: más con la clave propia (27/09). */
export function topeDeLecturas(o) {
  return leerVariable('GEMINI_API_KEY_CLASIFICACION', o) ? LECTURA.pedidosPorDiaConClavePropia : LECTURA.pedidosPorDia;
}

/** De qué ciudad es el medio de una nota. */
export function ciudadDelMedio(nota) {
  const f = FUENTE_POR_MEDIO.get(nota.medio ?? nota.medios?.[0]);
  return f ? fichaDeFuente(f).ciudad : 'desconocida';
}

/** Lo que se le manda de cada nota: poco, y sólo lo público. */
export function entradaDeNota(nota) {
  const resumen = String(nota.resumenFuente ?? nota.copete ?? '').replace(/\s+/g, ' ').trim().slice(0, LECTURA.resumenMaximo);
  return { id: nota.id, titulo: nota.titulo, resumen, medio: nota.medio ?? nota.medios?.[0] ?? '', ciudad_del_medio: ciudadDelMedio(nota) };
}

/** El pedido completo para un grupo de notas. */
export function pedidoPara(notas) {
  return `${INSTRUCCION}\n\n--- PERFIL DE BALCARCE ---\n${perfilDeBalcarce()}\n\n--- NOTAS ---\n${JSON.stringify(notas.map(entradaDeNota), null, 1)}`;
}

/** El esquema que Gemini tiene que respetar: listas cerradas, sin campos libres de más. */
export const ESQUEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      id: { type: 'STRING' },
      ambito: { type: 'STRING', enum: AMBITOS },
      seccion: { type: 'STRING', enum: SECCIONES_DE_LA_FICHA },
      impacto_balcarce: { type: 'STRING', enum: IMPACTOS },
      razon: { type: 'STRING', enum: RAZONES },
      importancia: { type: 'STRING', enum: IMPORTANCIAS },
      es_publicidad: { type: 'BOOLEAN' },
      es_chimento: { type: 'BOOLEAN' },
      por_que_interesa: { type: 'STRING' },
    },
    // Sin lugar_del_hecho, es_anuncio ni clave_tema desde el 28/09 (auditoría):
    // se pedían y no decidían nada. es_chimento sí decide, así que es obligatoria.
    required: ['id', 'ambito', 'seccion', 'impacto_balcarce', 'razon', 'importancia',
      'es_publicidad', 'es_chimento', 'por_que_interesa'],
  },
};

/** Una ficha válida, o null si algo no está en su lista. No se corrige nada:
 *  lo que no cierra se descarta y se vuelve a pedir en otra corrida. */
export function fichaValida(f) {
  if (!f || typeof f !== 'object' || !f.id) return null;
  if (!AMBITOS.includes(f.ambito) || !(SECCIONES_DE_LA_FICHA.includes(f.seccion) || ['Servicios', 'País'].includes(f.seccion)) || !IMPACTOS.includes(f.impacto_balcarce)
    || !RAZONES.includes(f.razon) || !IMPORTANCIAS.includes(f.importancia)) return null;
  return {
    ambito: f.ambito,
    seccion: f.seccion,
    impacto: f.impacto_balcarce,
    razon: f.razon,
    importancia: f.importancia,
    publicidad: f.es_publicidad === true,
    // Las fichas de antes del 27/09 no lo traen: cuentan como "no".
    chimento: f.es_chimento === true,
    porque: String(f.por_que_interesa ?? '').slice(0, 200),
  };
}

/** Un pedido a Gemini. Devuelve la lista de fichas válidas por id, o lanza. */
export async function leerGrupo(notas, { clave, fetchFn = fetch } = {}) {
  const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: 'POST',
    // La clave va en el encabezado, nunca en la dirección (docs/10-REGLAS-Y-PRUEBAS.md, regla 16).
    headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
    body: JSON.stringify({
      contents: [{ parts: [{ text: pedidoPara(notas) }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: ESQUEMA, temperature: 0 },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  const j = await res.json();
  const texto = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  let lista;
  try { lista = JSON.parse(texto); } catch { throw new Error('la respuesta no es JSON'); }
  const pedidos = new Set(notas.map((n) => n.id));
  const fichas = {};
  for (const f of Array.isArray(lista) ? lista : []) {
    const v = fichaValida(f);
    if (v && pedidos.has(f.id)) fichas[f.id] = v;
  }
  return fichas;
}

/**
 * Igual que leerGrupo, pero con Groq (28/09): un segundo proveedor gratis
 * para cuando Gemini falla o se queda sin cupo. Mismo prompt, mismo esquema
 * contado en palabras (la API de Groq no fuerza un JSON Schema como la de
 * Gemini) y la misma validación (fichaValida): nunca decide distinto por
 * venir de otro modelo. Su API es la de OpenAI (mensajes de chat), así que
 * el pedido y la respuesta tienen otra forma.
 */
export async function leerGrupoGroq(notas, { clave, fetchFn = fetch, modelo = MODELO_GROQ } = {}) {
  const instruccion = `${pedidoPara(notas)}\n\nDevolvé un objeto JSON con esta forma exacta y nada más: {"fichas": [ … ]}, con una ficha por nota.`;
  const res = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    // La clave va en el encabezado, nunca en la dirección (docs/10-REGLAS-Y-PRUEBAS.md, regla 16).
    headers: { 'content-type': 'application/json', authorization: `Bearer ${clave}` },
    body: JSON.stringify({
      model: modelo,
      messages: [{ role: 'user', content: instruccion }],
      response_format: { type: 'json_object' },
      temperature: 0,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  const j = await res.json();
  const texto = j.choices?.[0]?.message?.content ?? '';
  let obj;
  try { obj = JSON.parse(texto); } catch { throw new Error('la respuesta no es JSON'); }
  // Por las dudas de que conteste una lista sola en vez del objeto pedido.
  const lista = Array.isArray(obj) ? obj : Array.isArray(obj?.fichas) ? obj.fichas : (Object.values(obj ?? {}).find(Array.isArray) ?? []);
  const pedidos = new Set(notas.map((n) => n.id));
  const fichas = {};
  for (const f of lista) {
    const v = fichaValida(f);
    if (v && pedidos.has(f.id)) fichas[f.id] = v;
  }
  return fichas;
}

/** Las fichas guardadas, sin las de más de `diasDeFichas`. */
export function podarFichas(guardado = {}, { ahora = Date.now(), dias = LECTURA.diasDeFichas } = {}) {
  const limite = ahora - dias * 86400000;
  const fichas = Object.fromEntries(Object.entries(guardado.fichas ?? {})
    .filter(([, f]) => Date.parse(f?.cuando ?? '') >= limite));
  return { ...guardado, fichas };
}

/**
 * Lee con IA las notas que todavía no tienen ficha. Devuelve el archivo nuevo
 * ({ dia, pedidosHoy, fichas }) y lo que pasó. No lanza nunca: si Gemini falla
 * o no hay clave, deja todo como estaba y lo cuenta.
 */
export async function leerNotasNuevas(notas, {
  guardado = {}, fetchFn = fetch, ahora = new Date(), clave = claveClasificacion(), claveRespaldo = claveGroq(), registro = () => {},
} = {}) {
  const dia = diaAR(ahora);
  let archivo = podarFichas(guardado, { ahora: ahora.getTime() });
  if (archivo.dia !== dia) archivo = { ...archivo, dia, pedidosHoy: 0 };
  archivo.pedidosHoy ??= 0;
  const cuenta = {
    pedidos: 0, nuevas: 0, fallas: 0, sinClave: !clave, groq: 0,
  };
  if (!clave) return { archivo, cuenta };

  const faltan = notas.filter((n) => n?.id && !archivo.fichas[n.id]);
  const grupos = [];
  for (let i = 0; i < faltan.length; i += LECTURA.notasPorPedido) grupos.push(faltan.slice(i, i + LECTURA.notasPorPedido));

  for (const grupo of grupos) {
    if (cuenta.pedidos >= LECTURA.pedidosPorCorrida || archivo.pedidosHoy >= topeDeLecturas()) break;
    cuenta.pedidos += 1;
    archivo.pedidosHoy += 1;
    let nuevas;
    let error;
    try {
      nuevas = await leerGrupo(grupo, { clave, fetchFn });
    } catch (e) {
      error = e;
    }
    // Gemini falló (sin cupo, caído, lo que sea): con una segunda clave
    // gratis (Groq, 28/09) se prueba el mismo grupo ahí antes de darlo por
    // perdido. Nunca se pasa a una clave paga.
    if (!nuevas && claveRespaldo) {
      try {
        nuevas = await leerGrupoGroq(grupo, { clave: claveRespaldo, fetchFn });
        cuenta.groq += 1;
        error = null;
      } catch (e2) {
        error = e2;
      }
    }
    if (nuevas) {
      for (const [id, f] of Object.entries(nuevas)) {
        archivo.fichas[id] = { ...f, cuando: ahora.toISOString() };
        cuenta.nuevas += 1;
      }
    } else {
      cuenta.fallas += 1;
      registro(`  lectura con IA: falló un pedido (${error?.message})`);
      // Sin cupo en ninguna de las dos: no se insiste en esta corrida.
      if (error?.status === 429) break;
    }
  }
  return { archivo, cuenta };
}

/**
 * La IA decide (27/09, Hernán: "sin testear, corregimos en vivo"). Aplica cada
 * ficha a su nota, con límites que no se negocian:
 *
 *   · El semáforo manda: lo rojo o amarillo sigue igual. La IA sólo puede
 *     endurecer (sacar una nota o mandarla a esperar), nunca destrabar.
 *   · Sin ficha, la nota sigue como la decidió el sistema de siempre.
 *
 * Con ficha:
 *   · No entra: publicidad; lo del extranjero que no es automovilismo ni
 *     nombra a una figura argentina; lo de un medio de afuera sin relación
 *     con Balcarce (impacto nulo); un policial que no es de Balcarce.
 *   · Es de Balcarce sólo con dos llaves: la fuente es de acá o el medio lo
 *     dice en el título, Y la IA dice que el hecho es de Balcarce. Una nota
 *     nacional reproducida por un medio local deja de ser local (sin los +25)
 *     y queda marcada `noEsDeAcaSegunLaIA`: para esDeAca (ingesta/ingesta.mjs)
 *     el título ya no alcanza, y pide los medios de lo de afuera.
 *   · La sección es la de la IA, salvo "Balcarce" para lo que no es de acá.
 *     Las fichas viejas que dicen Servicios o País se traducen a Balcarce y
 *     Argentina.
 *
 * Devuelve { notas, cambios } sin tocar las originales.
 */
/** El motivo con que espera una nota de un medio de acá que no nombra nada de
 *  acá, hasta que la lea la IA (28/09). */
export const MOTIVO_ESPERA_LECTURA = 'de un medio de acá sin nombrar Balcarce ni la zona: espera la lectura con IA';

/**
 * ¿La nota nombra algo de Balcarce o de la zona en el título o al comienzo?
 * Con palabras enteras ("papa" no es "papá"; "la 226" sí).
 */
export function mencionaAca(nota) {
  if (nota?.nombraBalcarce || nota?.deLaZona) return true;
  const texto = ` ${sinTildes(`${nota?.titulo ?? ''} ${String(nota?.resumenFuente ?? nota?.cuerpo ?? '').slice(0, 600)}`).replace(/[^a-z0-9ñ]+/g, ' ')} `;
  return [...PALABRAS_LOCALES, ...PALABRAS_ZONA].some((p) => texto.includes(` ${sinTildes(p).replace(/[^a-z0-9ñ]+/g, ' ').trim()} `));
}

/** Desde cuándo las fichas conocen la sección Fútbol (con margen: fue el 27/09 a la tarde). */
const FICHAS_CON_FUTBOL = '2026-09-28T00:00:00Z';

export function aplicarFichas(notas, fichas = {}, { esperarSinFicha = false, yaPublicadas = new Set() } = {}) {
  const cambios = { sacadas: [], dejanDeSerLocales: [], otraSeccion: [], aEsperar: [] };
  // Las fichas viejas pueden decir "Servicios", que ya no existe (27/09).
  const seccionDe = (f) => ({ Servicios: 'Balcarce', País: 'Argentina' }[f.seccion] ?? f.seccion);
  const salida = [];
  for (const original of notas) {
    const f = fichas[original.id];
    // Un medio de acá que copia una noticia de afuera sin nombrar nada de acá
    // (28/09: Radio Sudestada con un referéndum de Suiza, salió en Balcarce
    // porque ningún medio de afuera contó lo mismo y la IA todavía no la había
    // leído): espera a la IA. Sólo si la lectura anda (esperarSinFicha) y si la
    // nota nunca salió: lo ya publicado no se toca.
    if (!f && esperarSinFicha && original.semaforo === 'verde' && original.alcance === 'local'
      && !yaPublicadas.has(original.id) && !mencionaAca(original)) {
      salida.push({ ...original, semaforo: 'amarillo', motivo: MOTIVO_ESPERA_LECTURA });
      cambios.aEsperar.push({ id: original.id, titulo: original.titulo, porque: MOTIVO_ESPERA_LECTURA });
      continue;
    }
    if (!f || original.semaforo === 'rojo') { salida.push(original); continue; }
    const n = { ...original };
    const deFuenteLocal = n.alcance === 'local';
    const deFierros = f.seccion === 'Automovilismo' || n.seccion === 'Automovilismo' || !!n.figura;
    const llaveDeLaFuente = deFuenteLocal || !!n.nombraBalcarce;
    // El ámbito es dónde se decidió; el impacto, dónde pega. Una medida
    // provincial que cambia la tarifa de luz acá es de Balcarce (27/09).
    const esLocal = llaveDeLaFuente && (f.ambito === 'balcarce' || f.impacto === 'directo');
    // Lo argentino en el exterior (Milei en París, Malvinas en la ONU) y lo que
    // cubren muchos medios o es muy importante no se saca por "no ser de acá".
    const palabrasDelTitulo = new Set(sinTildes(n.titulo ?? '').split(/[^a-z0-9ñ]+/));
    const conexionArgentina = CONEXION_ARGENTINA.some((p) => palabrasDelTitulo.has(sinTildes(p)));
    const nacionalQueImporta = (n.medios?.length ?? 1) >= 3 || f.importancia === 'alta'
      || ['nacional', 'popular', 'servicio'].includes(f.razon);
    const caso = { id: n.id, titulo: n.titulo, porque: f.porque };

    let motivo = null;
    if (f.publicidad) motivo = 'es publicidad';
    else if (f.chimento) motivo = 'es un chimento';
    // Del extranjero, sólo si un argentino se destaca en algo o le importa a
    // Balcarce (Hernán, 27/09): una figura argentina (Colapinto, Messi) o la
    // conexión argentina en el título. La Fórmula 1 sin un argentino, no.
    else if (f.ambito === 'internacional' && !n.figura && !conexionArgentina) motivo = 'es del extranjero';
    // De un medio de acá sólo se saca si ni siquiera nombra a Balcarce en el
    // título ("precios sugeridos para alquilar en Mar del Plata", 27/09).
    else if (f.impacto === 'nulo' && !deFierros && !conexionArgentina && !nacionalQueImporta
      && (!deFuenteLocal || !nombraBalcarceEnElTitulo(n))) motivo = 'no tiene relación con Balcarce';
    // Lo de la zona sí entra (28/09): ver esPolicialDeAfuera, ingesta/ingesta.mjs.
    else if (f.seccion === 'Policiales' && !esLocal && !n.deLaZona) motivo = 'policial que no es de Balcarce';
    if (motivo) { cambios.sacadas.push({ ...caso, motivo }); continue; }

    // Tenía la llave de la fuente o del título pero la IA dice que el hecho no
    // es de acá: se rige por lo de afuera (esDeAca, ingesta/ingesta.mjs).
    if (llaveDeLaFuente && !esLocal) n.noEsDeAcaSegunLaIA = true;
    if (n.local && !esLocal) {
      n.local = false;
      n.relevancia = Math.max(0, (n.relevancia ?? 0) - 25);
      cambios.dejanDeSerLocales.push(caso);
    }
    // Las fichas de antes del 27/09 a la tarde no conocían Fútbol: si la IA
    // dice Deportes y las palabras dicen Fútbol, es Fútbol. Sólo en ésas: una
    // ficha nueva que dice Deportes sabe lo que dice (29/09: "Pato Naranja goleó
    // a Pampas", de rugby, salió en Fútbol por "goleó"). Las fichas duran tres
    // días (LECTURA.diasDeFichas): desde el 1/10 no queda ninguna vieja.
    const sinFutbol = !(Date.parse(f.cuando ?? '') >= Date.parse(FICHAS_CON_FUTBOL));
    const deLaIA = sinFutbol && seccionDe(f) === 'Deportes' && n.seccion === 'Fútbol' ? 'Fútbol' : seccionDe(f);
    const seccion = deLaIA === 'Balcarce' && !esLocal ? (['Servicios', 'País'].includes(n.seccion) ? 'Argentina' : n.seccion)
      : deLaIA === 'Argentina' && esLocal ? 'Balcarce'
        : deLaIA;
    if (seccion !== n.seccion) {
      cambios.otraSeccion.push({ ...caso, antes: n.seccion, ahora: seccion });
      n.seccion = seccion;
    }
    salida.push(n);
  }
  return { notas: salida, cambios };
}

// ------------------------------------------------- las parejas sospechosas (1/10)

// Para Groq: gpt-oss-20b, que tiene su propio cupo (1.000 pedidos por día) y deja libre el del 120b,
// que es el respaldo de la lectura. Es sólo texto.
const MODELO_GROQ_PAREJAS = 'openai/gpt-oss-20b';

const INSTRUCCION_PAREJAS = `Cada par son dos notas de un medio de Balcarce, publicadas con poco tiempo de diferencia.
Para cada par decidí si cuentan EXACTAMENTE el mismo hecho: el mismo suceso o la misma noticia, aunque estén escritas con otras palabras o con distinto detalle.
NO es el mismo hecho si son dos noticias distintas sobre el mismo tema (la pole y la carrera, una práctica y otra, dos partidos), si es un anuncio y su resultado, o si cambia la persona, el lugar, la fecha o la cifra principal.
Ante la duda, mismo = false.
Devolvé un objeto JSON {"pares":[{"clave":"…","mismo":true|false}]} con una entrada por cada par, con la clave que se te dio.`;

const pedidoDeParejas = (parejas) => `${INSTRUCCION_PAREJAS}

${JSON.stringify(parejas.map(({ clave, a, b }) => ({
    clave,
    a: { titulo: a.titulo, texto: String(a.resumenFuente ?? a.copete ?? '').slice(0, 280), medios: (a.medios ?? []).slice(0, 3), fecha: a.fecha },
    b: { titulo: b.titulo, texto: String(b.resumenFuente ?? b.copete ?? '').slice(0, 280), medios: (b.medios ?? []).slice(0, 3), fecha: b.fecha },
  })), null, 1)}`;

/** Lee la respuesta { pares: [{ clave, mismo }] } (o la lista sola) y deja sólo lo válido: { clave: boolean }. */
export function leerRespuestaDeParejas(texto, validas) {
  let obj;
  try { obj = JSON.parse(texto); } catch { throw new Error('la respuesta no es JSON'); }
  const lista = Array.isArray(obj) ? obj : Array.isArray(obj?.pares) ? obj.pares : (Object.values(obj ?? {}).find(Array.isArray) ?? []);
  const salida = {};
  for (const p of lista) if (validas.has(p?.clave) && typeof p.mismo === 'boolean') salida[p.clave] = p.mismo;
  return salida;
}

/**
 * Pregunta por parejas de notas si cuentan el mismo hecho: { clave: true|false } con lo que la IA
 * contestó (lo que no contestó no está). Gemini primero; si falla o se queda sin cupo, Groq. Lanza
 * si fallan los dos.
 */
export async function confirmarParejas(parejas, { clave, claveRespaldo, fetchFn = fetch } = {}) {
  if (!parejas.length) return {};
  const validas = new Set(parejas.map((p) => p.clave));
  const prompt = pedidoDeParejas(parejas);
  let falla = null;
  if (clave) {
    try {
      const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
      const j = await res.json();
      return leerRespuestaDeParejas(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '', validas);
    } catch (e) { falla = e; }
  }
  if (!claveRespaldo) throw falla ?? new Error('sin clave');
  const res = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${claveRespaldo}` },
    body: JSON.stringify({ model: MODELO_GROQ_PAREJAS, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0 }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) { const e = new Error(`Groq HTTP ${res.status}`); e.status = res.status; throw e; }
  const j = await res.json();
  return leerRespuestaDeParejas(j.choices?.[0]?.message?.content ?? '', validas);
}

// ------------------------------------------------------------ las repetidas
//
// La misma noticia contada por tres medios con títulos distintos salía tres
// veces (27/09: "McCain advierte por estafas con falsas ofertas de empleo",
// "McCain advierte sobre una falsa convocatoria laboral" y "Advierten por una
// falsa búsqueda laboral de la empresa McCain"). Comparar títulos no alcanza, y
// la clave de tema de la ficha tampoco (la IA le pone otro nombre en cada
// pedido, y junta como un solo tema doce notas distintas del autódromo). Así
// que la IA mira juntas las notas del momento y agrupa sólo las que cuentan
// EXACTAMENTE el mismo hecho.

const INSTRUCCION_REPETIDAS = `Estas son las notas que un medio de Balcarce tiene para publicar ahora.
Agrupá SOLAMENTE las que cuentan exactamente el mismo hecho: la misma noticia contada por distintos medios o con otro título.
NO agrupes notas distintas sobre el mismo tema (por ejemplo, dos prácticas distintas del TC, o una nota de la reapertura del autódromo y otra de su estacionamiento): esas son notas distintas.
Devolvé sólo los grupos de dos o más notas, con sus "id". Si no hay repetidas, devolvé una lista vacía.`;

export const ESQUEMA_REPETIDAS = {
  type: 'ARRAY',
  items: { type: 'OBJECT', properties: { ids: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['ids'] },
};

/** Un pedido: los grupos de ids que cuentan el mismo hecho. Lanza si falla. */
export async function agruparRepetidas(notas, { clave, fetchFn = fetch } = {}) {
  const lista = notas.map((n) => ({
    id: n.id, titulo: n.titulo, bajada: String(n.resumenFuente ?? n.copete ?? '').slice(0, 200), medio: n.medio ?? n.medios?.[0] ?? '',
  }));
  const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${INSTRUCCION_REPETIDAS}

${JSON.stringify(lista, null, 1)}` }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: ESQUEMA_REPETIDAS, temperature: 0 },
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.status = res.status; throw e; }
  const j = await res.json();
  let grupos;
  try { grupos = JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''); } catch { throw new Error('la respuesta no es JSON'); }
  const validos = new Set(lista.map((n) => n.id));
  return (Array.isArray(grupos) ? grupos : [])
    .map((g) => [...new Set((g?.ids ?? []).filter((id) => validos.has(id)))])
    .filter((ids) => ids.length >= 2);
}

/**
 * Junta los grupos de una corrida con los de las anteriores: si antes se vio
 * que A y B cuentan lo mismo y ahora que B y C, A, B y C son una sola noticia.
 * La IA no siempre agrupa igual (27/09: de las tres de McCain juntó dos), así
 * que lo que ya vio no se pierde. Sólo quedan los ids que siguen existiendo.
 */
export function unirGrupos(anteriores = [], nuevos = [], idsVigentes = null) {
  const padre = new Map();
  const raiz = (x) => { while (padre.get(x) !== x) x = padre.get(x); return x; };
  for (const ids of [...anteriores, ...nuevos]) {
    const vivos = idsVigentes ? ids.filter((id) => idsVigentes.has(id)) : ids;
    for (const id of vivos) if (!padre.has(id)) padre.set(id, id);
    for (let i = 1; i < vivos.length; i += 1) padre.set(raiz(vivos[i]), raiz(vivos[0]));
  }
  const grupos = new Map();
  for (const id of padre.keys()) { const r = raiz(id); (grupos.get(r) ?? grupos.set(r, []).get(r)).push(id); }
  return [...grupos.values()].filter((g) => g.length >= 2).map((g) => g.sort());
}

/**
 * De cada grupo de repetidas queda una sola (27/09): primero la que ya está
 * publicada (`publicadas`, los ids de la portada anterior: si no, una nota
 * que la gente ya ve desaparece y queda otra que todavía no tiene cuerpo),
 * después la que puede salir sola (verde), después la que cuentan más medios
 * y por último la de más puntaje. Se le suman los medios de las otras (así
 * cuenta como contada por varios). Devuelve { notas, repetidas } sin tocar
 * las originales.
 */
export function quitarRepetidas(notas, grupos = [], { publicadas = new Set() } = {}) {
  const porId = new Map(notas.map((n) => [n.id, n]));
  const fuera = new Map();
  const reemplazo = new Map();
  for (const ids of grupos) {
    const del = ids.map((id) => porId.get(id)).filter(Boolean).filter((n) => n.semaforo !== 'rojo');
    if (del.length < 2) continue;
    const orden = (n) => [publicadas.has(n.id) ? 1 : 0, n.semaforo === 'verde' ? 1 : 0, new Set(n.medios ?? []).size, n.relevancia ?? 0];
    del.sort((a, b) => {
      const [x, y] = [orden(a), orden(b)];
      for (let i = 0; i < x.length; i += 1) if (x[i] !== y[i]) return y[i] - x[i];
      return 0;
    });
    const [queda, ...resto] = del;
    const medios = [...new Set(del.flatMap((n) => n.medios ?? []))];
    reemplazo.set(queda.id, { ...queda, medios });
    for (const n of resto) fuera.set(n.id, { id: n.id, titulo: n.titulo, queda: queda.id });
  }
  return {
    notas: notas.filter((n) => !fuera.has(n.id)).map((n) => reemplazo.get(n.id) ?? n),
    repetidas: [...fuera.values()],
  };
}

/** El archivo de fichas como texto: una línea por ficha, para que el commit de
 *  cada corrida cambie sólo lo nuevo. */
export function comoFichasJson(archivo) {
  const lineas = Object.entries(archivo.fichas ?? {}).sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([id, f]) => `${JSON.stringify(id)}:${JSON.stringify(f)}`);
  const repetidas = archivo.repetidas ? `"repetidas":${JSON.stringify(archivo.repetidas)},\n` : '';
  return `{"dia":${JSON.stringify(archivo.dia ?? null)},"pedidosHoy":${archivo.pedidosHoy ?? 0},${repetidas}"fichas":{\n${lineas.join(',\n')}\n}}\n`;
}

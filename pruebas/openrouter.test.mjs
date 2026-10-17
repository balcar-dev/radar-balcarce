// Regla 240 (17/10/2026): OpenRouter, el ÚLTIMO respaldo gratis de la IA de texto (reels/openrouter.mjs).
// Hernán: "si tenés API de OpenRouter, dejarla para usar gratis los modelos que se puedan, por si se nos terminan los tokens de Google".
// Todo sin red: OpenRouter se simula con respuestas grabadas. Lo que se cuida:
//   · sin OPENROUTER_API_KEY no se llama a nadie y nada cambia;
//   · sólo modelos ":free" (nunca uno pago, aunque lo pongan en la variable);
//   · sólo de último respaldo: si Gemini (o Groq) contesta, OpenRouter ni se toca;
//   · 429 del proveedor → el modelo que sigue; 429 "del día" y 402/401/403 → se corta; JSON roto → el modelo que sigue;
//   · el contador diario (web/data/uso-ia.json) frena antes de los 50 pedidos gratis y deja lugar a la redacción;
//   · lo que escribe queda anotado con su modelo, y una falla de OpenRouter no le gasta un intento a la nota.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  pedirJsonAOpenRouter, modelosDeOpenRouter, MODELOS_POR_DEFECTO, TOPE_DIARIO, limiteDeLaTarea, pedidosDeHoy,
  jsonDeLaRespuesta, reiniciarEstadoDelProceso, URL_OPENROUTER, CABEZALES_DE_IDENTIFICACION,
} from '../reels/openrouter.mjs';
import { claveOpenRouter } from '../reels/claves.mjs';
import { reescribir, FALLA_DEL_SERVICIO } from '../reels/reescritura.mjs';
import { leerNotasNuevas } from '../ingesta/lectura-ia.mjs';
import { auditarNotas } from '../ingesta/auditoria-ia.mjs';
import { revisarClaves, CLAVES_DE_IA, evaluar } from '../redes/vigilar.mjs';

const AHORA = new Date('2026-10-17T15:00:00Z');
const NADA = { env: {}, archivo: path.join(os.tmpdir(), 'no-existe-.env') };

beforeEach(() => reiniciarEstadoDelProceso());

/** Una carpeta nueva con un uso-ia.json (o sin él), para que el contador no toque el repositorio. */
function usoDeMentira(hechos = 0, dia = '2026-10-17') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'or-uso-'));
  const archivo = path.join(dir, 'uso-ia.json');
  if (hechos) {
    fs.writeFileSync(archivo, JSON.stringify({ dias: { [dia]: { redaccion: { 'google/gemma-4-31b-it:free': { llamadas: hechos, claves: { openrouter: hechos } } } } } }));
  }
  return archivo;
}

const respuestaDe = (contenido, extra = {}) => ({
  ok: true, status: 200, text: async () => '', json: async () => ({ model: 'x', choices: [{ message: { content: contenido }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }, ...extra }),
});
const falla = (status, cuerpo = '') => ({ ok: false, status, text: async () => cuerpo, json: async () => ({}) });

/** Un OpenRouter de mentira: contesta lo que diga `guion[i]` (una respuesta por pedido) y guarda lo que se le pidió. */
function openRouterFalso(guion) {
  const pedidos = [];
  const fn = async (url, o) => {
    pedidos.push({ url: String(url), headers: o.headers, cuerpo: JSON.parse(o.body) });
    const g = guion[Math.min(pedidos.length - 1, guion.length - 1)];
    return typeof g === 'function' ? g(pedidos.length) : g;
  };
  return { fn, pedidos };
}

// ------------------------------------------------------------------------------------------------ la clave y los modelos

test('sin OPENROUTER_API_KEY no hay clave, y pedirle algo al módulo no llama a nadie', async () => {
  assert.equal(claveOpenRouter(NADA), null);
  const { fn, pedidos } = openRouterFalso([respuestaDe('{}')]);
  await assert.rejects(() => pedirJsonAOpenRouter({ tarea: 'redaccion', prompt: 'x', clave: null, fetchFn: fn, ahora: AHORA, archivoDeUso: usoDeMentira() }), /falta OPENROUTER_API_KEY/);
  assert.equal(pedidos.length, 0);
  assert.equal(claveOpenRouter({ env: { OPENROUTER_API_KEY: ' sk-or-prueba ' }, archivo: NADA.archivo }), 'sk-or-prueba');
});

test('los modelos: los de siempre, los que se configuran en orden, y NUNCA uno que no sea gratis', () => {
  assert.deepEqual(modelosDeOpenRouter(NADA), MODELOS_POR_DEFECTO);
  assert.ok(MODELOS_POR_DEFECTO.length >= 2 && MODELOS_POR_DEFECTO.length <= 4);
  assert.ok(MODELOS_POR_DEFECTO.every((m) => m.endsWith(':free')), 'todos los de siempre son gratis');
  const env = { OPENROUTER_MODELOS: 'meta/uno:free, openai/gpt-5 ; otro/dos:free\nopenai/gpt-5-mini' };
  assert.deepEqual(modelosDeOpenRouter({ env, archivo: NADA.archivo }), ['meta/uno:free', 'otro/dos:free']);
  // Si ninguno es gratis, se vuelve a los de siempre: jamás se pide uno pago.
  assert.deepEqual(modelosDeOpenRouter({ env: { OPENROUTER_MODELOS: 'openai/gpt-5' }, archivo: NADA.archivo }), MODELOS_POR_DEFECTO);
});

test('aunque se le pase un modelo pago al pedido, no se manda', async () => {
  const { fn, pedidos } = openRouterFalso([respuestaDe('{}')]);
  await assert.rejects(() => pedirJsonAOpenRouter({ tarea: 'redaccion', prompt: 'x', clave: 'k', modelos: ['openai/gpt-5'], fetchFn: fn, ahora: AHORA, archivoDeUso: usoDeMentira() }), /ningún modelo gratis/);
  assert.equal(pedidos.length, 0);
});

// ------------------------------------------------------------------------------------------------ el pedido

test('el pedido va con la clave en el encabezado (nunca en la dirección), la identificación de Radar Balcarce y sólo modelos gratis', async () => {
  const { fn, pedidos } = openRouterFalso([respuestaDe('{"ok":true}')]);
  const r = await pedirJsonAOpenRouter({ tarea: 'lectura', prompt: 'hola', clave: 'sk-or-secreta', fetchFn: fn, ahora: AHORA, archivoDeUso: usoDeMentira(), temperatura: 0 });
  assert.deepEqual(JSON.parse(r.texto), { ok: true });
  assert.equal(r.modelo, MODELOS_POR_DEFECTO[0]);
  const p = pedidos[0];
  assert.equal(p.url, URL_OPENROUTER);
  assert.ok(!p.url.includes('sk-or-secreta'));
  assert.equal(p.headers.authorization, 'Bearer sk-or-secreta');
  assert.equal(p.headers['HTTP-Referer'], 'https://radarbalcarce.com');
  assert.equal(p.headers['X-Title'], 'Radar Balcarce');
  assert.deepEqual(CABEZALES_DE_IDENTIFICACION, { 'HTTP-Referer': p.headers['HTTP-Referer'], 'X-Title': p.headers['X-Title'] });
  assert.ok(p.cuerpo.model.endsWith(':free'));
  assert.deepEqual(p.cuerpo.response_format, { type: 'json_object' });
  assert.equal(p.cuerpo.messages[0].content, 'hola');
});

test('orden de respaldo: si el primer modelo está saturado (429 del proveedor) o no existe (404), sigue con el segundo y el tercero', async () => {
  const archivo = usoDeMentira();
  const { fn, pedidos } = openRouterFalso([falla(429, '{"error":{"message":"Provider returned error"}}'), falla(404), respuestaDe('```json\n{"ok":1}\n```')]);
  const r = await pedirJsonAOpenRouter({ tarea: 'redaccion', prompt: 'x', clave: 'k', fetchFn: fn, ahora: AHORA, archivoDeUso: archivo });
  assert.deepEqual(pedidos.map((p) => p.cuerpo.model), MODELOS_POR_DEFECTO);
  assert.equal(r.modelo, MODELOS_POR_DEFECTO[2]);
  assert.deepEqual(JSON.parse(r.texto), { ok: 1 }, 'se le sacan las vallas ```json');
});

test('JSON roto, respuesta vacía o cortada: se prueba con el modelo que sigue', async () => {
  const { fn, pedidos } = openRouterFalso([respuestaDe('esto no es JSON {roto'), respuestaDe(null), respuestaDe('{"ok":2}')]);
  const r = await pedirJsonAOpenRouter({ tarea: 'redaccion', prompt: 'x', clave: 'k', fetchFn: fn, ahora: AHORA, archivoDeUso: usoDeMentira() });
  assert.equal(pedidos.length, 3);
  assert.deepEqual(JSON.parse(r.texto), { ok: 2 });
  const cortada = { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"a":' }, finish_reason: 'length' }] }) };
  const segundo = openRouterFalso([cortada, respuestaDe('{"ok":3}')]);
  assert.deepEqual(JSON.parse((await pedirJsonAOpenRouter({ tarea: 'redaccion', prompt: 'x', clave: 'k', fetchFn: segundo.fn, ahora: AHORA, archivoDeUso: usoDeMentira() })).texto), { ok: 3 });
  // Un 200 con el error adentro (pasa con OpenRouter) también cuenta como falla del modelo.
  const conError = { ok: true, status: 200, json: async () => ({ error: { code: 503, message: 'saturado' } }) };
  const tercero = openRouterFalso([conError, respuestaDe('{"ok":4}')]);
  assert.deepEqual(JSON.parse((await pedirJsonAOpenRouter({ tarea: 'redaccion', prompt: 'x', clave: 'k', fetchFn: tercero.fn, ahora: AHORA, archivoDeUso: usoDeMentira() })).texto), { ok: 4 });
});

test('jsonDeLaRespuesta saca el JSON de la charla y arregla las barras que no son escapes', () => {
  assert.equal(jsonDeLaRespuesta('Acá va: {"a":1} listo'), '{"a":1}');
  assert.equal(jsonDeLaRespuesta('[1,2]'), '[1,2]');
  assert.equal(JSON.parse(jsonDeLaRespuesta('{"t":"a\\é"}')).t, 'a\\é');
  assert.equal(jsonDeLaRespuesta('sin nada'), null);
  assert.equal(jsonDeLaRespuesta('{"roto":'), null);
});

test('402 (cuenta sin saldo), 401 y 403 cortan en el acto y no se insiste en toda la corrida', async () => {
  for (const status of [402, 401, 403]) {
    reiniciarEstadoDelProceso();
    const { fn, pedidos } = openRouterFalso([falla(status, '{"error":{"message":"Insufficient credits"}}'), respuestaDe('{}')]);
    const opciones = { tarea: 'redaccion', prompt: 'x', clave: 'k', fetchFn: fn, ahora: AHORA, archivoDeUso: usoDeMentira() };
    await assert.rejects(() => pedirJsonAOpenRouter(opciones), (e) => e.status === status && /^no se pudo pedir a OpenRouter/.test(e.message));
    assert.equal(pedidos.length, 1, `con ${status} no se prueba otro modelo`);
    await assert.rejects(() => pedirJsonAOpenRouter(opciones), (e) => e.status === status);
    assert.equal(pedidos.length, 1, 'y la segunda vez ni siquiera se llama');
  }
});

test('el 429 que dice que se acabaron los pedidos del día corta; el resto del día no se vuelve a llamar', async () => {
  const { fn, pedidos } = openRouterFalso([falla(429, '{"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day"}}')]);
  const opciones = { tarea: 'redaccion', prompt: 'x', clave: 'k', fetchFn: fn, ahora: AHORA, archivoDeUso: usoDeMentira() };
  await assert.rejects(() => pedirJsonAOpenRouter(opciones), (e) => e.status === 429);
  assert.equal(pedidos.length, 1);
  await assert.rejects(() => pedirJsonAOpenRouter(opciones), (e) => e.status === 429);
  assert.equal(pedidos.length, 1);
  // Al otro día (el de Balcarce) vuelve a intentar.
  const manana = openRouterFalso([respuestaDe('{"ok":5}')]);
  const r = await pedirJsonAOpenRouter({ ...opciones, fetchFn: manana.fn, ahora: new Date('2026-10-18T15:00:00Z') });
  assert.deepEqual(JSON.parse(r.texto), { ok: 5 });
});

test('si todos los modelos fallan, el error empieza con «no se pudo pedir a OpenRouter» (falla del servicio: no gasta intentos de una nota)', async () => {
  const { fn } = openRouterFalso([falla(503), falla(503), respuestaDe('basura')]);
  await assert.rejects(() => pedirJsonAOpenRouter({ tarea: 'redaccion', prompt: 'x', clave: 'k', fetchFn: fn, ahora: AHORA, archivoDeUso: usoDeMentira() }), (e) => {
    assert.match(e.message, /^no se pudo pedir a OpenRouter/);
    assert.ok(FALLA_DEL_SERVICIO.test(e.message), 'reels/reescritura.mjs lo toma por falla del servicio');
    return true;
  });
  // Un error de red tampoco gasta nada.
  const sinRed = async () => { throw new Error('fetch failed'); };
  await assert.rejects(() => pedirJsonAOpenRouter({ tarea: 'redaccion', prompt: 'x', clave: 'k', fetchFn: sinRed, ahora: AHORA, archivoDeUso: usoDeMentira() }), (e) => FALLA_DEL_SERVICIO.test(e.message));
});

// ------------------------------------------------------------------------------------------------ el contador diario

test('el contador: cada pedido se anota en uso-ia.json con la clave «openrouter» y con los tokens; los de otro día no cuentan', async () => {
  const archivo = usoDeMentira(0);
  const { fn } = openRouterFalso([respuestaDe('{"ok":1}')]);
  await pedirJsonAOpenRouter({ tarea: 'lectura', prompt: 'x', clave: 'k', fetchFn: fn, ahora: AHORA, archivoDeUso: archivo });
  const anotado = JSON.parse(fs.readFileSync(archivo, 'utf8')).dias['2026-10-17'].lectura[MODELOS_POR_DEFECTO[0]];
  assert.equal(anotado.llamadas, 1);
  assert.equal(anotado.claves.openrouter, 1);
  assert.equal(anotado.total, 15);
  assert.equal(pedidosDeHoy({ ahora: AHORA, archivoDeUso: archivo }), 1);
  assert.equal(pedidosDeHoy({ ahora: new Date('2026-10-18T15:00:00Z'), archivoDeUso: archivo }), 0);
});

test('el tope diario es menor que los 50 gratis, y la redacción puede gastar más que las auditorías', () => {
  assert.ok(TOPE_DIARIO < 50);
  assert.equal(limiteDeLaTarea('redaccion'), TOPE_DIARIO);
  assert.ok(limiteDeLaTarea('lectura') <= TOPE_DIARIO && limiteDeLaTarea('lectura') > limiteDeLaTarea('auditoria'));
  assert.ok(limiteDeLaTarea('auditoria') < limiteDeLaTarea('redaccion') && limiteDeLaTarea('revision') < limiteDeLaTarea('redaccion'));
});

test('con el tope del día alcanzado no se llama a nadie (429 propio); la redacción sigue hasta el final cuando las auditorías ya pararon', async () => {
  // 25 pedidos hechos: la auditoría (tope 22) ya paró, la redacción (45) todavía puede.
  const archivo = usoDeMentira(25);
  const { fn, pedidos } = openRouterFalso([respuestaDe('{"ok":1}')]);
  await assert.rejects(() => pedirJsonAOpenRouter({ tarea: 'auditoria', prompt: 'x', clave: 'k', fetchFn: fn, ahora: AHORA, archivoDeUso: archivo }), (e) => e.status === 429 && /tope propio/.test(e.message));
  assert.equal(pedidos.length, 0);
  await pedirJsonAOpenRouter({ tarea: 'redaccion', prompt: 'x', clave: 'k', fetchFn: fn, ahora: AHORA, archivoDeUso: archivo });
  assert.equal(pedidos.length, 1);
  // 45 hechos: ni la redacción.
  const lleno = usoDeMentira(TOPE_DIARIO);
  await assert.rejects(() => pedirJsonAOpenRouter({ tarea: 'redaccion', prompt: 'x', clave: 'k', fetchFn: fn, ahora: AHORA, archivoDeUso: lleno }), (e) => e.status === 429);
  assert.equal(pedidos.length, 1);
  // El tope se puede subir el día que se compren créditos (OPENROUTER_TOPE_DIARIO).
  await pedirJsonAOpenRouter({ tarea: 'redaccion', prompt: 'x', clave: 'k', fetchFn: fn, ahora: AHORA, archivoDeUso: lleno, tope: 900 });
  assert.equal(pedidos.length, 2);
});

test('los intentos de un mismo pedido también cuentan para el tope (cada modelo probado es un pedido de los 50)', async () => {
  const archivo = usoDeMentira(TOPE_DIARIO - 1);
  const { fn, pedidos } = openRouterFalso([falla(503), respuestaDe('{"ok":1}')]);
  await assert.rejects(() => pedirJsonAOpenRouter({ tarea: 'redaccion', prompt: 'x', clave: 'k', fetchFn: fn, ahora: AHORA, archivoDeUso: archivo }), (e) => e.status === 429);
  assert.equal(pedidos.length, 1, 'el segundo ya habría pasado el tope');
});

// ------------------------------------------------------------------------------------------------ la redacción

const NOTA = {
  titulo: 'Obras en la ruta 226', resumenFuente: 'Vialidad informó trabajos de bacheo en la ruta 226 entre Balcarce y Mar del Plata durante toda la semana.',
  seccion: 'Balcarce', medios: ['Diario A', 'Diario B'],
};
const SALIDA_DE_LA_NOTA = { titulo: 'Bacheo en la ruta 226', copete: 'Vialidad trabaja toda la semana.', cuerpo: 'Vialidad hace trabajos de bacheo en la ruta 226. '.repeat(20) };
const geminiOk = { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(SALIDA_DE_LA_NOTA) }] } }] }), text: async () => '' };

/** fetch que reparte: Gemini contesta `gemini`, OpenRouter lo que diga `or`. */
function mundo({ gemini, or }) {
  const llamados = { gemini: 0, openrouter: 0 };
  const fn = async (url) => {
    if (String(url).includes('openrouter.ai')) { llamados.openrouter += 1; return or(llamados.openrouter); }
    llamados.gemini += 1;
    return typeof gemini === 'function' ? gemini(llamados.gemini) : gemini;
  };
  return { fn, llamados };
}

const DE_PRUEBA = { intentos: 1, clavePropia: 'g', claveDeRedes: null, claveDeRespaldo: null, ahora: AHORA };

test('redacción: si Gemini contesta, OpenRouter ni se toca (aunque haya clave)', async () => {
  const { fn, llamados } = mundo({ gemini: geminiOk, or: () => respuestaDe('{}') });
  const r = await reescribir(NOTA, { ...DE_PRUEBA, fetchFn: fn, claveDeOpenRouter: 'or' });
  assert.equal(r.titulo, SALIDA_DE_LA_NOTA.titulo);
  assert.equal(llamados.openrouter, 0);
  assert.equal(r.ia, undefined);
  assert.equal(r.modeloIA, undefined);
});

test('redacción: Gemini sin cupo (429), saturado (503) o con la clave rechazada (401/402/403) → último respaldo OpenRouter, anotado con su modelo', async () => {
  for (const status of [429, 503, 401, 402, 403]) {
    reiniciarEstadoDelProceso();
    const { fn, llamados } = mundo({ gemini: falla(status), or: () => respuestaDe(JSON.stringify(SALIDA_DE_LA_NOTA)) });
    const r = await reescribir(NOTA, { ...DE_PRUEBA, fetchFn: fn, claveDeOpenRouter: 'or' });
    assert.equal(r.deIA, true, `con Gemini en ${status}`);
    assert.equal(r.titulo, SALIDA_DE_LA_NOTA.titulo);
    assert.equal(r.ia, 'openrouter');
    assert.equal(r.modeloIA, MODELOS_POR_DEFECTO[0]);
    assert.equal(llamados.openrouter, 1);
  }
});

test('redacción: un pedido mal armado (400) no se manda a OpenRouter, y sin su clave nada cambia', async () => {
  const { fn, llamados } = mundo({ gemini: falla(400, 'mal'), or: () => respuestaDe('{}') });
  await assert.rejects(() => reescribir(NOTA, { ...DE_PRUEBA, fetchFn: fn, claveDeOpenRouter: 'or' }), /HTTP 400/);
  assert.equal(llamados.openrouter, 0);
  const sinClave = mundo({ gemini: falla(503), or: () => respuestaDe('{}') });
  await assert.rejects(() => reescribir(NOTA, { ...DE_PRUEBA, fetchFn: sinClave.fn, claveDeOpenRouter: null }), (e) => /HTTP 503/.test(e.message) && FALLA_DEL_SERVICIO.test(e.message));
  assert.equal(sinClave.llamados.openrouter, 0, 'sin OPENROUTER_API_KEY no se llama a nadie');
});

test('redacción: si OpenRouter también falla, el error es de falla del servicio (no le gasta un intento a la nota) y nombra las dos', async () => {
  const { fn } = mundo({ gemini: falla(429), or: () => falla(503) });
  await assert.rejects(() => reescribir(NOTA, { ...DE_PRUEBA, fetchFn: fn, claveDeOpenRouter: 'or' }), (e) => {
    assert.match(e.message, /HTTP 429/);
    assert.match(e.message, /OpenRouter/);
    assert.ok(FALLA_DEL_SERVICIO.test(e.message));
    return true;
  });
});

test('redacción: sin ninguna clave de Gemini pero con la de OpenRouter, escribe con OpenRouter; sin ninguna, el mismo error de siempre', async () => {
  const { fn, llamados } = mundo({ gemini: geminiOk, or: () => respuestaDe(JSON.stringify(SALIDA_DE_LA_NOTA)) });
  const sinGemini = { intentos: 1, clavePropia: null, claveDeRedes: null, claveDeRespaldo: null, ahora: AHORA };
  const r = await reescribir(NOTA, { ...sinGemini, fetchFn: fn, claveDeOpenRouter: 'or' });
  assert.equal(r.ia, 'openrouter');
  assert.equal(llamados.gemini, 0);
  await assert.rejects(() => reescribir(NOTA, { ...sinGemini, fetchFn: fn, claveDeOpenRouter: null }), /falta GEMINI_API_KEY_REDACCION/);
});

test('redacción de punta a punta: lo que escribe OpenRouter pasa por el verificador, sale con cuerpo y queda anotado con su modelo en intentos-ia.json y en el registro', async () => {
  const { reescribirAutomaticas } = await import('../reels/reescritura.mjs');
  const { CUERPO } = await import('./cuerpo-de-prueba.mjs');
  const nota = { id: 'n1', titulo: 'Se realizó una reunión en el municipio', resumenFuente: 'Hubo una reunión en el municipio por el tema del agua.', seccion: 'Balcarce', medios: ['El Diario'], semaforo: 'verde', relevancia: 80 };
  const buena = JSON.stringify({ titulo: 'Reunión en el municipio por el agua', copete: 'Hubo una reunión en el municipio por el tema del agua.', cuerpo: CUERPO });
  const inventa = JSON.stringify({ titulo: 'Reunión en el municipio por el agua', copete: 'Lo esperaban ms de tres mil personas.', cuerpo: CUERPO });
  const correr = async (contenido) => {
    reiniciarEstadoDelProceso();
    const intentos = {};
    const registros = [];
    const fn = async (url) => (String(url).includes('openrouter.ai') ? respuestaDe(contenido) : falla(503));
    const r = await reescribirAutomaticas([nota], {
      minimoDeMaterial: 0, intentos, registro: (t) => registros.push(t), ahora: AHORA.getTime(),
      opciones: { fetchFn: fn, intentos: 1, clavePropia: 'g', claveDeRedes: null, claveDeRespaldo: null, claveDeOpenRouter: 'or' },
    });
    return { r, intentos, registros };
  };
  const bien = await correr(buena);
  assert.equal(bien.r.n1.titulo, 'Reunión en el municipio por el agua');
  assert.equal(bien.r.n1.deIA, true);
  assert.equal(bien.intentos.n1.motivo, 'con cuerpo');
  assert.equal(bien.intentos.n1.modelo, MODELOS_POR_DEFECTO[0], 'queda anotado con qué modelo la escribió');
  assert.ok(bien.registros.some((t) => t.includes('escrita con OpenRouter') && t.includes(MODELOS_POR_DEFECTO[0])));
  assert.ok(bien.registros.some((t) => /con OpenRouter \(modelos gratis, último respaldo\)/.test(t)), 'y el resumen de claves lo cuenta');
  // Un dato inventado por el modelo gratis se descarta igual que si lo inventara Gemini: la verificación no se afloja.
  const mala = await correr(inventa);
  assert.equal(mala.r.n1, undefined, 'un dato inventado no queda publicado');
});

// ------------------------------------------------------------------------------------------------ la lectura con IA

const NOTA_LECTURA = { id: 'abc', titulo: 'El Concejo aprueba el presupuesto', medio: 'El Diario Balcarce', resumenFuente: 'Sesión ordinaria.', seccion: 'Política', local: true, semaforo: 'verde' };
const FICHA = { id: 'abc', ambito: 'balcarce', seccion: 'Política', impacto_balcarce: 'directo', razon: 'local', importancia: 'media', es_publicidad: false, es_chimento: false, por_que_interesa: 'Es de acá.' };

function lecturaDelMundo({ gemini, groq, or }) {
  const llamados = { gemini: 0, groq: 0, openrouter: 0 };
  const fn = async (url) => {
    const u = String(url);
    if (u.includes('openrouter.ai')) { llamados.openrouter += 1; return or(); }
    if (u.includes('groq.com')) { llamados.groq += 1; return groq(); }
    llamados.gemini += 1;
    return gemini();
  };
  return { fn, llamados };
}

test('lectura: Gemini y Groq fallan → OpenRouter, y la ficha queda marcada con ia y modelo', async () => {
  const { fn, llamados } = lecturaDelMundo({ gemini: () => falla(429), groq: () => falla(429), or: () => respuestaDe(JSON.stringify({ fichas: [FICHA] })) });
  const registros = [];
  const r = await leerNotasNuevas([NOTA_LECTURA], { fetchFn: fn, ahora: AHORA, clave: 'k', claveRespaldo: 'g', claveOpenRouterDeRespaldo: 'or', registro: (t) => registros.push(t) });
  assert.equal(r.cuenta.openrouter, 1);
  assert.equal(r.cuenta.nuevas, 1);
  assert.equal(r.archivo.fichas.abc.ia, 'openrouter');
  assert.equal(r.archivo.fichas.abc.modelo, MODELOS_POR_DEFECTO[0]);
  assert.equal(r.archivo.fichas.abc.ambito, 'balcarce');
  assert.deepEqual([llamados.gemini, llamados.groq, llamados.openrouter], [1, 1, 1]);
  assert.ok(registros.some((t) => t.includes('OpenRouter')));
});

test('lectura: si Groq contesta, OpenRouter no se toca; sin su clave, no se llama a nadie y el pedido falla como antes', async () => {
  const bien = lecturaDelMundo({ gemini: () => falla(503), groq: () => respuestaDe(JSON.stringify({ fichas: [FICHA] })), or: () => respuestaDe('{}') });
  const a = await leerNotasNuevas([NOTA_LECTURA], { fetchFn: bien.fn, ahora: AHORA, clave: 'k', claveRespaldo: 'g', claveOpenRouterDeRespaldo: 'or' });
  assert.equal(a.cuenta.groq, 1);
  assert.equal(a.cuenta.openrouter, 0);
  assert.equal(bien.llamados.openrouter, 0);
  const sin = lecturaDelMundo({ gemini: () => falla(503), groq: () => falla(503), or: () => respuestaDe('{}') });
  const b = await leerNotasNuevas([NOTA_LECTURA], { fetchFn: sin.fn, ahora: AHORA, clave: 'k', claveRespaldo: 'g', claveOpenRouterDeRespaldo: null });
  assert.equal(b.cuenta.fallas, 1);
  assert.equal(b.cuenta.nuevas, 0);
  assert.equal(sin.llamados.openrouter, 0);
});

test('lectura: una ficha mal formada de un modelo gratis se descarta igual que las de Gemini (nada se arregla de más)', async () => {
  const mala = { ...FICHA, importancia: 'altísima' };
  const { fn } = lecturaDelMundo({ gemini: () => falla(429), groq: () => falla(429), or: () => respuestaDe(JSON.stringify({ fichas: [mala] })) });
  const r = await leerNotasNuevas([NOTA_LECTURA], { fetchFn: fn, ahora: AHORA, clave: 'k', claveRespaldo: 'g', claveOpenRouterDeRespaldo: 'or' });
  assert.equal(r.cuenta.nuevas, 0);
  assert.deepEqual(r.archivo.fichas, {});
});

// ------------------------------------------------------------------------------------------------ la auditoría

const NOTA_AUDITADA = { id: 'n1', titulo: 'Nota de prueba', seccion: 'Balcarce', copete: 'Un copete', cuerpo: 'Un cuerpo con una palabra mal escrita: cancion.' };
const HALLAZGOS = { notas: [{ id: 'n1', hallazgos: [{ tipo: 'ortografia', gravedad: 'baja', cita: 'cancion', detalle: 'Falta la tilde.', sugerencia: 'canción' }] }] };

test('auditoría: Groq falla → OpenRouter lee el lote; las citas que no están en la nota se descartan igual', async () => {
  const conCitaFalsa = { notas: [{ id: 'n1', hallazgos: [...HALLAZGOS.notas[0].hallazgos, { tipo: 'ortografia', gravedad: 'baja', cita: 'esto no está', detalle: 'x', sugerencia: 'y' }] }] };
  const urls = [];
  const fn = async (url) => {
    urls.push(String(url));
    return String(url).includes('openrouter.ai') ? respuestaDe(JSON.stringify(conCitaFalsa)) : falla(429);
  };
  const r = await auditarNotas([NOTA_AUDITADA], { clave: 'g', fetchFn: fn, dormir: async () => {}, claveOpenRouter: 'or', archivoDeUso: usoDeMentira() });
  assert.equal(r.hallazgos.length, 1);
  assert.equal(r.hallazgos[0].cita, 'cancion');
  assert.equal(r.descartados, 1);
  assert.deepEqual(r.leidas, ['n1']);
  assert.deepEqual(r.fallas, []);
  assert.deepEqual(r.openrouter, [MODELOS_POR_DEFECTO[0]]);
  assert.ok(urls.some((u) => u.includes('groq.com')) && urls.some((u) => u.includes('openrouter.ai')));
});

test('auditoría: sin la clave de OpenRouter no se llama a nadie más y el lote queda sin leer; si Groq contesta, tampoco', async () => {
  const urls = [];
  const sinOR = async (url) => { urls.push(String(url)); return falla(429); };
  const a = await auditarNotas([NOTA_AUDITADA], { clave: 'g', fetchFn: sinOR, dormir: async () => {}, claveOpenRouter: null });
  assert.deepEqual(a.leidas, []);
  assert.equal(a.fallas.length, 1);
  assert.ok(urls.every((u) => u.includes('groq.com')));
  const urls2 = [];
  const groqBien = async (url) => { urls2.push(String(url)); return respuestaDe(JSON.stringify({ notas: [] })); };
  const b = await auditarNotas([NOTA_AUDITADA], { clave: 'g', fetchFn: groqBien, dormir: async () => {}, claveOpenRouter: 'or' });
  assert.deepEqual(b.leidas, ['n1']);
  assert.ok(urls2.every((u) => u.includes('groq.com')), 'con Groq andando, OpenRouter no se toca');
});

// ------------------------------------------------------------------------------------------------ la revisión del archivo

const CUERPO_ARCHIVO = 'El Concejo Deliberante aprobó por unanimidad el proyecto que reordena el tránsito en el centro de la ciudad. La iniciativa prevé nuevas sendas para bicicletas, más lugares para motos y una revisión de los semáforos de las avenidas principales. '
  + 'Los concejales explicaron que el plan se discutió durante tres meses con vecinos, comerciantes y la cooperativa de transporte, y que las obras empezarán después de las fiestas. La comision analizará el tema una vez por mes durante el próximo año completo.';
const NOTA_ARCHIVO = {
  id: 'n0', titulo: 'El Concejo aprueba el nuevo plan de tránsito para el centro', copete: 'La ordenanza reordena calles y semáforos.', cuerpo: CUERPO_ARCHIVO,
  seccion: 'Balcarce', medios: ['Radio Gabal (FM 104.1)', 'Diario La Vanguardia'], fecha: '2026-10-01T12:00:00.000Z', visto: '2026-10-01T12:00:00.000Z',
  publicadaCuando: '2026-10-01T12:05:00.000Z', como: 'automatica', publicadaPor: null, local: true, fuentesConsultadas: [], slug: 'el-concejo-aprueba',
};

test('revisión del archivo: Groq y Gemini sin cupo → último respaldo OpenRouter con su tope («revision»); sin su clave, la nota queda pendiente', async () => {
  const { revisarTanda } = await import('../web/scripts/revisar-archivo.mjs');
  const hallazgo = { notas: [{ id: 'n0', hallazgos: [{ tipo: 'ortografia', gravedad: 'baja', cita: 'comision', detalle: 'falta la tilde', sugerencia: 'comisión' }] }] };
  const urls = [];
  const fetchFn = async (url) => {
    urls.push(String(url));
    return String(url).includes('openrouter.ai') ? respuestaDe(JSON.stringify(hallazgo)) : falla(429);
  };
  const ahora = new Date('2026-10-22T05:12:00Z');
  const { tanda } = await revisarTanda({
    datos: { archivo: [NOTA_ARCHIVO], banco: {} }, ahora, claves: { groq: 'g', gemini: 'k', openrouter: 'or' }, fetchFn, dormir: async () => {}, archivoDeUso: usoDeMentira(),
  });
  assert.deepEqual(tanda.resultados[0].tildes, [{ campo: 'cuerpo', antes: 'comision', despues: 'comisión' }]);
  assert.equal(tanda.uso.openrouter, 1);
  const orden = urls.map((u) => (u.includes('groq.com') ? 'groq' : u.includes('openrouter.ai') ? 'openrouter' : 'gemini'));
  assert.deepEqual(orden, ['groq', 'gemini', 'openrouter'], 'OpenRouter siempre al final');

  const sinClave = await revisarTanda({
    datos: { archivo: [NOTA_ARCHIVO], banco: {} }, ahora, claves: { groq: 'g', gemini: 'k' }, fetchFn, dormir: async () => {}, archivoDeUso: usoDeMentira(),
  });
  assert.equal(sinClave.tanda.resultados[0].texto, 'pendiente');
  assert.equal(sinClave.tanda.uso.openrouter, undefined);
});

// ------------------------------------------------------------------------------------------------ el vigilante

test('el vigilante mira la clave de OpenRouter sin gastar pedidos (/key) y sólo si está cargada', async () => {
  assert.ok(CLAVES_DE_IA.some((c) => c.nombre === 'OPENROUTER_API_KEY' && c.proveedor === 'openrouter'));
  const pedidos = [];
  const fetchFn = async (url, { headers }) => {
    pedidos.push({ url: String(url), headers });
    return new Response(JSON.stringify({ error: { code: 401, message: 'User not found.' } }), { status: 401 });
  };
  const sin = await revisarClaves({ env: {}, fetchFn });
  assert.deepEqual(sin.claves, []);
  assert.equal(pedidos.length, 0, 'sin la variable no se pregunta nada');
  const con = await revisarClaves({ env: { OPENROUTER_API_KEY: 'sk-or-muerta' }, fetchFn });
  assert.deepEqual(con.claves.map((c) => [c.nombre, c.estado]), [['OPENROUTER_API_KEY', 401]]);
  assert.equal(pedidos[0].url, 'https://openrouter.ai/api/v1/key');
  assert.ok(!con.claves[0].detalle.includes('sk-or-muerta'));
});

test('una clave de OpenRouter rechazada avisa como las otras (alta, con qué hacer y sin chat); 429 o 5xx no', () => {
  const ahora = new Date('2026-09-24T12:00:00-03:00');
  const hace = (min) => new Date(ahora.getTime() - min * 60000).toISOString();
  const corrida = (min) => ({ createdAt: hace(min), conclusion: 'success', status: 'completed' });
  const base = {
    ahora, web: { estado: 200, actualizado: hace(20) }, www: { redirige: true },
    corridas: { 'Actualizar la web': [corrida(20)], Redes: [corrida(10)], 'Cloudflare Pages': [corrida(18)] },
    libro: { instagram: {}, facebook: {} },
    claves: [{ nombre: 'OPENROUTER_API_KEY', uso: 'el último respaldo de la IA (modelos gratis)', proveedor: 'openrouter', estado: 401, detalle: 'User not found.' }],
  };
  const avisos = evaluar(base).filter((a) => a.clave === 'clave-OPENROUTER_API_KEY');
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].nivel, 'alta');
  assert.match(avisos[0].texto, /OpenRouter contesta 401/);
  assert.match(avisos[0].texto, /openrouter\.ai\/keys/);
  assert.match(avisos[0].texto, /nunca en un chat/);
  for (const estado of [429, 500, 503, null]) {
    const hay = evaluar({ ...base, claves: [{ ...base.claves[0], estado }] }).some((a) => a.clave === 'clave-OPENROUTER_API_KEY');
    assert.equal(hay, false, `con ${estado} no es una clave rota`);
  }
});

// ------------------------------------------------------------------------------------------------ las reglas de la casa

test('reels/openrouter.mjs no importa nada de afuera de Node (ingesta/, panel/ y redes/ lo usan)', () => {
  const codigo = fs.readFileSync(new URL('../reels/openrouter.mjs', import.meta.url), 'utf8');
  const imports = [...codigo.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
  assert.ok(imports.length > 0);
  for (const i of imports) assert.ok(i.startsWith('node:') || i.startsWith('.'), `importa ${i}`);
});

test('la clave jamás está escrita en el código: el módulo sólo la lee del entorno', () => {
  for (const f of ['../reels/openrouter.mjs', '../reels/claves.mjs']) {
    assert.ok(!/sk-or-[A-Za-z0-9]{10,}/.test(fs.readFileSync(new URL(f, import.meta.url), 'utf8')));
  }
});

test('los workflows que usan la IA reciben OPENROUTER_API_KEY como secreto (una línea cada uno)', () => {
  for (const f of ['actualizar', 'auditoria-ia', 'revisar-archivo', 'panel', 'vigilancia', 'probar-gemini']) {
    const yml = fs.readFileSync(new URL(`../.github/workflows/${f}.yml`, import.meta.url), 'utf8');
    assert.match(yml, /OPENROUTER_API_KEY: \$\{\{ secrets\.OPENROUTER_API_KEY \}\}/, `falta en ${f}.yml`);
  }
});

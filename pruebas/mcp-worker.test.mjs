// El servidor MCP de sólo lectura (infra/mcp-cloudflare/, 16/10/2026): protocolo (las dos épocas), herramientas, límites y seguridad. Sin red: el
// sitio se imita con los mismos armadores que usa la web (web/lib/para-agentes.js), así si el formato de los JSON cambia, esto se entera.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker, {
  manejar, vaciarCache, HERRAMIENTAS, VERSIONES, MAXIMO_DE_PEDIDO, MAXIMO_DE_NOTAS, MAXIMO_DE_CUERPO, palabrasDeConsulta, fichaDeNotaEnHtml,
  decodificarCabecera, fechaEnBalcarce, haceCuanto, filasDelIndice, SECCIONES as SECCIONES_DEL_WORKER,
} from '../infra/mcp-cloudflare/worker.mjs';
import { armarUltimas, armarIndice, armarServicios } from '../web/lib/para-agentes.js';
import { SECCIONES } from '../web/lib/datos.js';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');
const BASE = 'https://radarbalcarce.com';
const AHORA = Date.parse('2026-10-15T23:00:00Z');
const cuerpoLargo = Array.from({ length: 90 }, (_, i) => `palabra${i}`).join(' ');

const nota = (id, titulo, copete, extra = {}) => ({
  id, ruta: `/nota/${titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}-${id}`, titulo, copete, cuerpo: cuerpoLargo, seccion: 'Balcarce',
  fecha: '2026-10-15T20:00:00.000Z', medios: ['El Diario Balcarce'], local: true, como: 'automatica', guion: 'x', etiquetas: [], ...extra,
});

const NOTAS = [
  nota('aaa111', 'El autódromo Juan Manuel Fangio recibe al TC Pick Up', 'La categoría corre este fin de semana en Balcarce.', { etiquetas: ['automovilismo', 'TC Pick Up'], seccion: 'Automovilismo', fecha: '2026-10-15T22:00:00.000Z' }),
  nota('bbb222', 'UDOCBA concreta un paro docente con alto acatamiento', 'El gremio reclama mejoras salariales.', { seccion: 'Política', local: false, medios: ['La Nación', 'TN'], fecha: '2026-10-15T21:00:00.000Z' }),
  nota('ccc333', 'Balcarce amplía el horario de la biblioteca', 'Desde noviembre abre también los sábados.', { seccion: 'Cultura y agenda', fecha: '2026-10-14T15:00:00.000Z' }),
  nota('ddd444', 'Obras en la ruta 226', 'Habrá desvíos entre Balcarce y Mar del Plata.', { fecha: '2026-10-10T15:00:00.000Z' }),
  nota('eee555', 'Sin cuerpo', 'No se ofrece', { cuerpo: 'corto' }),
];
const FARMACIAS = {
  hoy: { fecha: '2026-10-15', diaSemana: 'JUEVES', farmacias: ['NORTE'], detalle: [{ nombre: 'Norte', direccion: 'Calle 15 esquina 8', telefono: '42-4656' }] },
  proximos: [{ fecha: '2026-10-16', diaSemana: 'VIERNES', farmacias: ['DEL PATIO'], detalle: [{ nombre: 'Del Patio', direccion: 'Av. 39 N° 793', telefono: '42-2200' }] }],
};
const CLIMA = { ahora: { temp: 14, sensacion: 10, humedad: 65, viento: 19, rumbo: 'SE', cielo: 'Nublado' }, dias: [{ fecha: '2026-10-16', max: 12, min: 6, lluvia: 13, viento: 18, cielo: 'Llovizna leve' }], fuente: 'Open-Meteo' };
const EVENTOS = [
  { id: 'muni-1', nombre: 'TC Pick Up Balcarce', desde: '2026-10-24 09:00:00', hasta: '2026-10-25 17:00:00', lugar: 'Autodromo Juan Manuel Fangio', organizador: 'ACTC', fuente: 'Municipalidad de Balcarce', ruta: '/agenda/tc-pick-up-balcarce-muni1' },
  { id: 'muni-2', nombre: 'Fiesta lejana', desde: '2026-12-05 20:00:00', lugar: 'Plaza', ruta: '/agenda/fiesta-lejana-muni2' },
];

function paginaDeNota(n) {
  const ficha = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: n.titulo, articleBody: `${n.copete}\n\nTexto completo de ${n.titulo}.`, author: { '@type': 'Organization', name: 'Radar Balcarce (nota escrita con IA y verificada automáticamente contra las fuentes)' } };
  const sitioLd = { '@context': 'https://schema.org', '@graph': [{ '@type': 'NewsMediaOrganization', name: 'Radar Balcarce' }] };
  const j = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
  return `<html><head><script type="application/ld+json">${j(sitioLd)}</script><script type="application/ld+json">${j(ficha)}</script></head><body></body></html>`;
}

let pedidos;
function sitioFalso({ caido = false, sinPagina = false } = {}) {
  const generado = '2026-10-15T22:50:00.000Z';
  const archivos = {
    '/agentes/ultimas.json': armarUltimas({ notas: NOTAS, base: BASE, generado }),
    '/agentes/indice.json': armarIndice({ notas: NOTAS, base: BASE, generado }),
    '/agentes/servicios.json': armarServicios({ farmacias: FARMACIAS, clima: CLIMA, eventos: EVENTOS, base: BASE, generado }),
  };
  return async (url) => {
    pedidos.push(url);
    if (caido) return { status: 503, text: async () => '' };
    const ruta = new URL(url).pathname;
    if (archivos[ruta]) return { status: 200, text: async () => JSON.stringify(archivos[ruta]) };
    const n = NOTAS.find((x) => x.ruta === ruta);
    if (n && !sinPagina) return { status: 200, text: async () => paginaDeNota(n) };
    return { status: 404, text: async () => 'no' };
  };
}

beforeEach(() => { vaciarCache(); pedidos = []; });

// Un pedido en la época moderna (2026-07-28), con sus encabezados.
function moderno(metodo, params = {}, { id = 1, cabeceras = {} } = {}) {
  const meta = { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {}, 'io.modelcontextprotocol/clientInfo': { name: 'prueba', version: '1' } };
  const h = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2026-07-28', 'mcp-method': metodo, ...(metodo === 'tools/call' ? { 'mcp-name': params.name } : {}), ...cabeceras };
  return new Request('https://mcp.test/mcp', { method: 'POST', headers: h, body: JSON.stringify({ jsonrpc: '2.0', id, method: metodo, params: { ...params, _meta: meta } }) });
}
// Un pedido de la época anterior (sin _meta; lo que mandan los clientes de hoy).
function anterior(metodo, params, { id = 1, version, cabeceras = {} } = {}) {
  const h = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(version ? { 'mcp-protocol-version': version } : {}), ...cabeceras };
  const cuerpo = { jsonrpc: '2.0', method: metodo, ...(id === null ? {} : { id }), ...(params !== undefined ? { params } : {}) };
  return new Request('https://mcp.test/mcp', { method: 'POST', headers: h, body: JSON.stringify(cuerpo) });
}
const llamar = (req, env = {}, opciones = {}) => manejar(req, env, { fetchFn: sitioFalso(), ahora: AHORA, ...opciones });
const json = async (res) => JSON.parse(await res.text());

// ------------------------------------------------------------------ HTTP

test('sólo POST /mcp: GET y DELETE dan 405, otras rutas 404, OPTIONS responde para los navegadores y / se describe sola', async () => {
  for (const metodo of ['GET', 'DELETE', 'PUT']) {
    const r = await llamar(new Request('https://mcp.test/mcp', { method: metodo }));
    assert.equal(r.status, 405, metodo);
    assert.equal(r.headers.get('allow'), 'POST, OPTIONS');
  }
  assert.equal((await llamar(new Request('https://mcp.test/otra', { method: 'POST', body: '{}' }))).status, 404);
  const op = await llamar(new Request('https://mcp.test/mcp', { method: 'OPTIONS' }));
  assert.equal(op.status, 204);
  assert.match(op.headers.get('access-control-allow-headers'), /mcp-protocol-version/);
  const raiz = await llamar(new Request('https://mcp.test/', { method: 'GET' }));
  const info = await json(raiz);
  assert.equal(info.endpoint, 'https://mcp.test/mcp');
  assert.deepEqual(info.herramientas.map((h) => h.nombre), HERRAMIENTAS.map((h) => h.name));
  assert.equal(raiz.headers.get('cache-control'), 'no-store');
  assert.equal(raiz.headers.get('x-content-type-options'), 'nosniff');
});

test('un pedido mal armado da el error de JSON-RPC que corresponde', async () => {
  const post = (cuerpo, h = {}) => llamar(new Request('https://mcp.test/mcp', { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: cuerpo }));
  let r = await post('{no es json');
  assert.equal(r.status, 400);
  assert.equal((await json(r)).error.code, -32700);
  r = await post(JSON.stringify([{ jsonrpc: '2.0', id: 1, method: 'ping' }]));
  assert.equal((await json(r)).error.code, -32600, 'no se aceptan lotes');
  r = await post(JSON.stringify({ jsonrpc: '1.0', id: 1, method: 'ping' }));
  assert.equal(r.status, 400);
  r = await post(JSON.stringify({ jsonrpc: '2.0', id: null, method: 'ping' }));
  assert.equal(r.status, 400, 'el id no puede ser null');
  r = await post('x'.repeat(MAXIMO_DE_PEDIDO + 1));
  assert.equal(r.status, 413);
  r = await post(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }), { 'content-length': String(MAXIMO_DE_PEDIDO + 5) });
  assert.equal(r.status, 413);
  // Una notificación se acepta sin responder nada.
  r = await post(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }));
  assert.equal(r.status, 202);
  assert.equal(await r.text(), '');
});

test('Origin: con la lista abierta pasa cualquiera; con una lista, sólo los de la lista (403 si no)', async () => {
  const con = (origen) => anterior('ping', {}, { cabeceras: { origin: origen } });
  assert.equal((await llamar(con('https://cualquiera.example'), { ORIGENES_PERMITIDOS: '*' })).status, 200);
  assert.equal((await llamar(anterior('ping'), { ORIGENES_PERMITIDOS: 'https://claude.ai' })).status, 200, 'sin Origin (servidor a servidor) pasa');
  assert.equal((await llamar(con('https://claude.ai'), { ORIGENES_PERMITIDOS: 'https://claude.ai, https://chatgpt.com' })).status, 200);
  const r = await llamar(con('https://malo.example'), { ORIGENES_PERMITIDOS: 'https://claude.ai' });
  assert.equal(r.status, 403);
  assert.equal((await json(r)).id, null);
});

test('límite de pedidos: si el binding dice que no, 429 con Retry-After; si el binding falla, se atiende igual', async () => {
  const llaves = [];
  const limitado = { limit: async ({ key }) => { llaves.push(key); return { success: false }; } };
  const r = await llamar(anterior('ping', {}, { cabeceras: { 'cf-connecting-ip': '1.2.3.4' } }), { LIMITADOR: limitado });
  assert.equal(r.status, 429);
  assert.equal(r.headers.get('retry-after'), '60');
  assert.deepEqual(llaves, ['1.2.3.4']);
  const roto = { limit: async () => { throw new Error('caído'); } };
  assert.equal((await llamar(anterior('ping'), { LIMITADOR: roto })).status, 200);
});

// ------------------------------------------------------------------ la época moderna

test('server/discover: versiones, capacidades, instrucciones y caché pública', async () => {
  const r = await llamar(moderno('server/discover'));
  assert.equal(r.status, 200);
  const { result } = await json(r);
  assert.equal(result.resultType, 'complete');
  assert.deepEqual(result.supportedVersions, VERSIONES);
  assert.ok(VERSIONES.includes('2026-07-28') && VERSIONES.includes('2025-11-25'));
  assert.deepEqual(result.capabilities, { tools: {} });
  assert.match(result.instructions, /citá siempre a Radar Balcarce/);
  assert.equal(result.cacheScope, 'public');
  assert.ok(result.ttlMs > 0);
  assert.equal(result._meta['io.modelcontextprotocol/serverInfo'].name, 'radar-balcarce');
});

test('tools/list moderno: las siete herramientas, de sólo lectura, con nombres válidos y en orden estable', async () => {
  const a = (await json(await llamar(moderno('tools/list')))).result;
  const b = (await json(await llamar(moderno('tools/list')))).result;
  assert.deepEqual(a.tools, b.tools, 'el orden es determinista');
  assert.equal(a.resultType, 'complete');
  assert.equal(a.cacheScope, 'public');
  assert.deepEqual(a.tools.map((t) => t.name), ['ultimas_noticias', 'buscar_notas', 'noticias_por_seccion', 'obtener_nota', 'agenda_de_eventos', 'farmacia_de_turno', 'clima_de_balcarce']);
  for (const t of a.tools) {
    assert.match(t.name, /^[A-Za-z0-9_.-]{1,128}$/);
    assert.equal(t.annotations.readOnlyHint, true, t.name);
    assert.equal(t.annotations.destructiveHint, false, t.name);
    assert.equal(t.annotations.openWorldHint, false, t.name);
    assert.equal(t.inputSchema.type, 'object');
    assert.equal(t.inputSchema.additionalProperties, false);
    assert.ok(t.description.length > 40, t.name);
  }
});

test('época moderna: el encabezado tiene que coincidir con el cuerpo (-32020), la versión tiene que existir (-32022) y faltan capacidades (-32602)', async () => {
  let r = await llamar(moderno('tools/list', {}, { cabeceras: { 'mcp-protocol-version': '2025-11-25' } }));
  assert.equal(r.status, 400);
  assert.equal((await json(r)).error.code, -32020);

  r = await llamar(moderno('tools/list', {}, { cabeceras: { 'mcp-method': 'tools/call' } }));
  assert.equal(r.status, 400);
  assert.equal((await json(r)).error.code, -32020);

  r = await llamar(moderno('tools/call', { name: 'farmacia_de_turno', arguments: {} }, { cabeceras: { 'mcp-name': 'clima_de_balcarce' } }));
  assert.equal(r.status, 400);
  assert.match((await json(r)).error.message, /Mcp-Name/);

  // Una versión que no existe: 400 con la lista de las que sí.
  const raro = new Request('https://mcp.test/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'mcp-protocol-version': '1900-01-01', 'mcp-method': 'tools/list' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/list', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '1900-01-01' } } }),
  });
  r = await llamar(raro);
  assert.equal(r.status, 400);
  const e = (await json(r)).error;
  assert.equal(e.code, -32022);
  assert.deepEqual(e.data, { supported: VERSIONES, requested: '1900-01-01' });

  // Sin las capacidades del cliente, el pedido está mal armado.
  const sinCapacidades = new Request('https://mcp.test/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'tools/list' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 8, method: 'tools/list', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' } } }),
  });
  r = await llamar(sinCapacidades);
  assert.equal(r.status, 400);
  assert.equal((await json(r)).error.code, -32602);

  // Sin encabezado de versión pero con la versión moderna en el cuerpo, también es un -32020.
  const sinCabecera = new Request('https://mcp.test/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'mcp-method': 'tools/list' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'tools/list', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {} } } }),
  });
  assert.equal((await json(await llamar(sinCabecera))).error.code, -32020);
});

test('Mcp-Name puede venir en base64 cuando no es ASCII simple', async () => {
  assert.equal(decodificarCabecera('=?base64?SGVsbG8sIOS4lueVjA==?='), 'Hello, 世界');
  assert.equal(decodificarCabecera('plano'), 'plano');
  assert.equal(decodificarCabecera('=?base64?%%%?='), null);
});

test('método desconocido: 404 con -32601 en la época moderna y 200 con el mismo error en la anterior', async () => {
  let r = await llamar(moderno('resources/list'));
  assert.equal(r.status, 404);
  assert.equal((await json(r)).error.code, -32601);
  r = await llamar(anterior('resources/list', {}, { version: '2025-11-25' }));
  assert.equal(r.status, 200);
  assert.equal((await json(r)).error.code, -32601);
});

// ------------------------------------------------------------------ la época anterior

test('initialize (2025-11-25): responde sin inventar una sesión; con una versión que no conoce, ofrece la última que habla', async () => {
  let r = await llamar(anterior('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'x', version: '1' } }));
  let { result } = await json(r);
  assert.equal(result.protocolVersion, '2025-06-18');
  assert.deepEqual(result.capabilities, { tools: {} });
  assert.equal(result.serverInfo.name, 'radar-balcarce');
  assert.equal(r.headers.get('mcp-session-id'), null, 'sin sesiones');
  assert.ok(!('resultType' in result), 'la época anterior no conoce resultType');

  ({ result } = await json(await llamar(anterior('initialize', { protocolVersion: '2030-01-01' }))));
  assert.equal(result.protocolVersion, '2025-11-25');
  ({ result } = await json(await llamar(anterior('initialize', { protocolVersion: '2026-07-28' }))));
  assert.equal(result.protocolVersion, '2025-11-25', 'initialize es de la época anterior: se contesta como tal');
});

test('tools/list y tools/call de un cliente de la época anterior (con o sin encabezado de versión)', async () => {
  for (const version of ['2025-11-25', '2025-06-18', undefined]) {
    const lista = (await json(await llamar(anterior('tools/list', {}, { version })))).result;
    assert.equal(lista.tools.length, 7, String(version));
    assert.ok(!('resultType' in lista) && !('ttlMs' in lista));
    const r = await json(await llamar(anterior('tools/call', { name: 'farmacia_de_turno', arguments: {} }, { version })));
    assert.equal(r.result.isError, false);
    assert.match(r.result.content[0].text, /Norte/);
  }
  // ping de los clientes de antes.
  assert.deepEqual((await json(await llamar(anterior('ping', undefined, { version: '2025-11-25' })))).result, {});
});

// ------------------------------------------------------------------ las herramientas

const llamarHerramienta = async (nombre, argumentos = {}, env = {}, opciones = {}) => (await json(await llamar(moderno('tools/call', { name: nombre, arguments: argumentos }), env, opciones))).result;

test('ultimas_noticias: más nuevas primero, sin lo que no se ofrece, con fuentes, firma, enlace y aviso de resumen automático', async () => {
  const r = await llamarHerramienta('ultimas_noticias');
  assert.equal(r.resultType, 'complete');
  assert.equal(r.isError, false);
  const ids = r.structuredContent.notas.map((n) => n.id);
  assert.deepEqual(ids, ['aaa111', 'bbb222', 'ccc333', 'ddd444']);
  const primera = r.structuredContent.notas[0];
  assert.equal(primera.url, `${BASE}${NOTAS[0].ruta}`);
  assert.deepEqual(primera.fuentes, ['El Diario Balcarce']);
  assert.equal(primera.redaccion, 'Redacción con IA, verificada contra las fuentes');
  assert.equal(primera.hace, 'hace 1 h');
  assert.match(r.content[0].text, /Enlace: https:\/\/radarbalcarce\.com\/nota\//);
  assert.match(r.content[0].text, /Fuentes: El Diario Balcarce · Redacción con IA/);
  assert.match(r.content[0].text, /remitite a la fuente original/);
  assert.match(r.structuredContent.como_citar, /Citá a Radar Balcarce/);
  assert.ok(!r.content[0].text.includes('Sin cuerpo'));

  const soloAca = await llamarHerramienta('ultimas_noticias', { solo_balcarce: true, limite: 2 });
  assert.deepEqual(soloAca.structuredContent.notas.map((n) => n.id), ['aaa111', 'ccc333']);
});

test('buscar_notas: encuentra por palabras sin tildes ni plurales, ordena por puntaje y respeta sección, fecha y límite', async () => {
  let r = await llamarHerramienta('buscar_notas', { consulta: 'autodromo fangio' });
  assert.deepEqual(r.structuredContent.notas.map((n) => n.id), ['aaa111']);
  r = await llamarHerramienta('buscar_notas', { consulta: 'paros docentes' });
  assert.deepEqual(r.structuredContent.notas.map((n) => n.id), ['bbb222'], 'plural → singular');
  r = await llamarHerramienta('buscar_notas', { consulta: 'Balcarce' });
  assert.ok(r.structuredContent.notas.length >= 3);
  assert.equal(r.structuredContent.notas[0].id, 'ccc333', 'el título que dice Balcarce va antes que los que sólo lo tienen en la bajada o la etiqueta');
  r = await llamarHerramienta('buscar_notas', { consulta: 'Balcarce', seccion: 'automovilismo' });
  assert.deepEqual(r.structuredContent.notas.map((n) => n.id), ['aaa111']);
  r = await llamarHerramienta('buscar_notas', { consulta: 'Balcarce', desde: '2026-10-15' });
  assert.ok(r.structuredContent.notas.every((n) => n.fecha >= '2026-10-15'));
  r = await llamarHerramienta('buscar_notas', { consulta: 'Balcarce', limite: 1 });
  assert.equal(r.structuredContent.notas.length, 1);
  r = await llamarHerramienta('buscar_notas', { consulta: 'zzzxyz inexistente' });
  assert.equal(r.isError, false);
  assert.deepEqual(r.structuredContent.notas, []);
  assert.match(r.content[0].text, /No encontré notas/);
  // Lo que no se ofrece nunca aparece.
  r = await llamarHerramienta('buscar_notas', { consulta: 'Sin cuerpo' });
  assert.deepEqual(r.structuredContent.notas, []);
  assert.deepEqual(palabrasDeConsulta('¿Qué pasó con el Autódromo de Balcarce?'), ['paso', 'autodromo', 'balcarce']);
  assert.ok(!palabrasDeConsulta('la de los el').length);
});

test('los argumentos mal puestos son errores de la herramienta (que la IA puede corregir), no del protocolo', async () => {
  const casos = [
    ['buscar_notas', {}, /Falta el argumento "consulta"/],
    ['buscar_notas', { consulta: 'a' }, /2 a 100/],
    ['buscar_notas', { consulta: 'x'.repeat(101) }, /2 a 100/],
    ['buscar_notas', { consulta: 'paro', limite: 50 }, /1 a 20/],
    ['buscar_notas', { consulta: 'paro', limite: 'diez' }, /1 a 20/],
    ['buscar_notas', { consulta: 'paro', seccion: 'chismes' }, /"seccion"/],
    ['buscar_notas', { consulta: 'paro', desde: 'ayer' }, /AAAA-MM-DD/],
    ['buscar_notas', { consulta: 'paro', extra: 1 }, /no existen/],
    ['buscar_notas', { consulta: '... ,, de la' }, /palabras/],
    ['noticias_por_seccion', {}, /Falta el argumento "seccion"/],
    ['ultimas_noticias', { solo_balcarce: 'si' }, /true o false/],
    ['agenda_de_eventos', { dias: 400 }, /1 a 60/],
    ['obtener_nota', {}, /"url" o "id"/],
    ['obtener_nota', { id: 'Nota con Espacios' }, /formato/],
    ['farmacia_de_turno', { fecha: 'hoy' }, /no existen/],
  ];
  for (const [nombre, args, patron] of casos) {
    const r = await llamarHerramienta(nombre, args);
    assert.equal(r.isError, true, `${nombre} ${JSON.stringify(args)}`);
    assert.match(r.content[0].text, patron, `${nombre} ${JSON.stringify(args)}`);
  }
  // Una herramienta que no existe sí es un error del protocolo (-32602).
  const r = await json(await llamar(moderno('tools/call', { name: 'borrar_todo', arguments: {} })));
  assert.equal(r.error.code, -32602);
  assert.match(r.error.message, /Unknown tool/);
  // Argumentos que no son un objeto.
  assert.equal((await llamarHerramienta('farmacia_de_turno', [])).isError, true);
});

test('noticias_por_seccion: las once secciones de la web son las del servidor, y cada una devuelve lo suyo', async () => {
  assert.deepEqual(SECCIONES_DEL_WORKER.map((s) => [s.nombre, s.ranura]), SECCIONES.map((s) => [s.nombre, s.ranura]), 'si cambian las secciones del sitio, hay que cambiarlas acá');
  const r = await llamarHerramienta('noticias_por_seccion', { seccion: 'politica' });
  assert.deepEqual(r.structuredContent.notas.map((n) => n.id), ['bbb222']);
  assert.equal(r.structuredContent.seccion, 'politica');
  // También acepta el nombre con tildes.
  assert.deepEqual((await llamarHerramienta('noticias_por_seccion', { seccion: 'Política' })).structuredContent.notas.map((n) => n.id), ['bbb222']);
  const vacia = await llamarHerramienta('noticias_por_seccion', { seccion: 'agro' });
  assert.equal(vacia.isError, false);
  assert.match(vacia.content[0].text, /No encontré notas/);
});

test('obtener_nota: lee el cuerpo del JSON-LD de la página, sólo de este sitio, y si la página falla devuelve el resumen', async () => {
  const url = `${BASE}${NOTAS[0].ruta}`;
  let r = await llamarHerramienta('obtener_nota', { url });
  assert.equal(r.isError, false);
  assert.match(r.content[0].text, /Texto completo de El autódromo/);
  assert.match(r.content[0].text, /Firma: Radar Balcarce \(nota escrita con IA/);
  assert.match(r.structuredContent.cuerpo, /Texto completo/);
  assert.equal(r.structuredContent.url, url);
  // Por id, también.
  r = await llamarHerramienta('obtener_nota', { id: 'bbb222' });
  assert.match(r.structuredContent.titulo, /UDOCBA/);
  // Direcciones de otro lado o de otra parte del sitio: no se abren (esto no es un navegador).
  for (const mala of ['https://example.com/nota/x-aaa111', `${BASE}/panel/`, 'http://radarbalcarce.com/nota/x-aaa111', 'file:///etc/passwd', 'no es una url', `https://radarbalcarce.com.evil.test/nota/x-aaa111`]) {
    pedidos.length = 0;
    r = await llamarHerramienta('obtener_nota', { url: mala });
    assert.equal(r.isError, true, mala);
    assert.ok(!pedidos.some((p) => !p.startsWith(BASE)), `pidió algo afuera con ${mala}`);
  }
  // Una nota que no está en el índice.
  assert.equal((await llamarHerramienta('obtener_nota', { id: 'zzz999' })).isError, true);
  // La página no contesta: se devuelve el resumen y se avisa.
  vaciarCache();
  r = await llamarHerramienta('obtener_nota', { url }, {}, { fetchFn: sitioFalso({ sinPagina: true }) });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.cuerpo, null);
  assert.match(r.content[0].text, /No pude leer el texto completo/);
});

test('fichaDeNotaEnHtml: encuentra el NewsArticle entre varios bloques y no se rompe con basura', () => {
  assert.equal(fichaDeNotaEnHtml(paginaDeNota(NOTAS[0])).headline, NOTAS[0].titulo);
  assert.equal(fichaDeNotaEnHtml('<html><script type="application/ld+json">{roto</script></html>'), null);
  assert.equal(fichaDeNotaEnHtml('sin nada'), null);
});

test('agenda, farmacia y clima: los datos del sitio, con su fuente, y la agenda respeta los días pedidos', async () => {
  let r = await llamarHerramienta('agenda_de_eventos', { dias: 14 });
  assert.equal(r.structuredContent.eventos.length, 1, 'la fiesta de diciembre queda fuera de 14 días');
  assert.match(r.content[0].text, /TC Pick Up Balcarce — del sábado 24 al domingo 25 de octubre/);
  assert.match(r.content[0].text, /Ficha: https:\/\/radarbalcarce\.com\/agenda\//);
  r = await llamarHerramienta('agenda_de_eventos', { dias: 60 });
  assert.equal(r.structuredContent.eventos.length, 2);
  r = await llamarHerramienta('agenda_de_eventos', { dias: 60, limite: 1 });
  assert.equal(r.structuredContent.eventos.length, 1);

  r = await llamarHerramienta('farmacia_de_turno');
  assert.match(r.content[0].text, /Norte, Calle 15 esquina 8 \(tel\. 42-4656\)/);
  assert.match(r.content[0].text, /Colegio de Farmacéuticos de Balcarce/);
  assert.match(r.content[0].text, /Confirmá por teléfono/);
  assert.match(r.content[0].text, /viernes 2026-10-16: Del Patio/);

  r = await llamarHerramienta('clima_de_balcarce');
  assert.match(r.content[0].text, /Nublado, 14°C \(sensación 10°C\), humedad 65%, viento 19 km\/h del SE/);
  assert.match(r.content[0].text, /Open-Meteo/);
});

test('si el sitio no contesta, la herramienta lo dice (isError) y no se rompe ni cuelga el detalle interno', async () => {
  const r = await llamarHerramienta('ultimas_noticias', {}, {}, { fetchFn: sitioFalso({ caido: true }) });
  assert.equal(r.isError, true);
  assert.match(r.content[0].text, /No pude leer los datos de https:\/\/radarbalcarce\.com ahora/);
  // Un archivo que no es el esperado también se rechaza.
  const raro = async () => ({ status: 200, text: async () => JSON.stringify({ hola: 'mundo' }) });
  vaciarCache();
  assert.equal((await llamarHerramienta('ultimas_noticias', {}, {}, { fetchFn: raro })).isError, true);
  const noJson = async () => ({ status: 200, text: async () => '<html>' });
  vaciarCache();
  assert.equal((await llamarHerramienta('ultimas_noticias', {}, {}, { fetchFn: noJson })).isError, true);
});

test('lo que lee del sitio se guarda: dos preguntas seguidas hacen un solo pedido al origen; con CACHE_SEGUNDOS=0, uno por pregunta', async () => {
  await llamarHerramienta('ultimas_noticias');
  await llamarHerramienta('ultimas_noticias');
  assert.equal(pedidos.length, 1);
  vaciarCache(); pedidos.length = 0;
  await llamarHerramienta('ultimas_noticias', {}, { CACHE_SEGUNDOS: '0' });
  await llamarHerramienta('ultimas_noticias', {}, { CACHE_SEGUNDOS: '0' });
  assert.equal(pedidos.length, 2);
  // Sólo se pide al origen configurado.
  vaciarCache(); pedidos.length = 0;
  await llamarHerramienta('ultimas_noticias', {}, { ORIGEN: 'https://otro.example/' });
  assert.ok(pedidos.every((p) => p.startsWith('https://otro.example/agentes/')));
});

test('el límite de notas por respuesta nunca pasa de MAXIMO_DE_NOTAS y el cuerpo nunca de MAXIMO_DE_CUERPO', async () => {
  const muchas = Array.from({ length: 60 }, (_, i) => nota(`n${String(i).padStart(3, '0')}`, `Titular ${i} de Balcarce`, `Bajada ${i} de Balcarce`, { fecha: new Date(AHORA - i * 60000).toISOString() }));
  const largo = { ...muchas[0], copete: 'Bajada' };
  const fetchFn = async (url) => {
    const ruta = new URL(url).pathname;
    if (ruta === '/agentes/ultimas.json') return { status: 200, text: async () => JSON.stringify(armarUltimas({ notas: muchas, base: BASE })) };
    if (ruta === '/agentes/indice.json') return { status: 200, text: async () => JSON.stringify(armarIndice({ notas: muchas, base: BASE })) };
    if (ruta === largo.ruta) {
      const ficha = { '@type': 'NewsArticle', articleBody: 'x'.repeat(MAXIMO_DE_CUERPO * 3) };
      return { status: 200, text: async () => `<script type="application/ld+json">${JSON.stringify(ficha)}</script>` };
    }
    return { status: 404, text: async () => '' };
  };
  const r = await llamarHerramienta('ultimas_noticias', { limite: MAXIMO_DE_NOTAS }, {}, { fetchFn });
  assert.equal(r.structuredContent.notas.length, MAXIMO_DE_NOTAS);
  assert.equal((await llamarHerramienta('buscar_notas', { consulta: 'Balcarce', limite: MAXIMO_DE_NOTAS }, {}, { fetchFn })).structuredContent.notas.length, MAXIMO_DE_NOTAS);
  const n = await llamarHerramienta('obtener_nota', { id: 'n000' }, {}, { fetchFn });
  assert.ok(n.structuredContent.cuerpo.length <= MAXIMO_DE_CUERPO);
});

test('el índice se lee por nombre de columna: si el sitio suma columnas al final, no se rompe', () => {
  const indice = {
    columnas: ['id', 'titulo', 'bajada', 'seccion', 'fecha', 'de_balcarce', 'ruta', 'fuentes', 'etiquetas', 'columna_nueva'],
    filas: [['a1', 'T', 'B', 'Agro', '2026-10-01T00:00:00Z', 0, '/nota/t-a1', ['X'], ['y'], 'lo que sea']],
  };
  assert.deepEqual(filasDelIndice(indice)[0], { id: 'a1', titulo: 'T', bajada: 'B', seccion: 'Agro', fecha: '2026-10-01T00:00:00Z', de_balcarce: false, ruta: '/nota/t-a1', fuentes: ['X'], etiquetas: ['y'] });
  assert.deepEqual(filasDelIndice({}), []);
});

test('fechas en hora de Balcarce y "hace cuánto"', () => {
  assert.equal(fechaEnBalcarce('2026-10-15T20:36:00.000Z'), '15/10/2026 17:36');
  assert.equal(fechaEnBalcarce('2026-10-15T03:00:00.000Z'), '15/10/2026 00:00');
  assert.equal(fechaEnBalcarce(null), 'sin fecha');
  assert.equal(haceCuanto('2026-10-15T22:35:00.000Z', AHORA), 'hace 25 min');
  assert.equal(haceCuanto('2026-10-15T20:00:00.000Z', AHORA), 'hace 3 h');
  assert.equal(haceCuanto('2026-10-10T23:00:00.000Z', AHORA), 'hace 5 días');
  assert.equal(haceCuanto('basura', AHORA), null);
});

test('el export default atiende sin ensuciar: un error interno no cuenta detalles', async () => {
  const r = await worker.fetch(new Request('https://mcp.test/mcp', { method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }) }), { LIMITADOR: { limit: () => { throw new Error('secreto interno'); } } });
  assert.equal(r.status, 200);
  const roto = await worker.fetch({ url: 'https://mcp.test/mcp', method: 'POST', headers: null }, {});
  assert.equal(roto.status, 500);
  assert.ok(!(await roto.text()).includes('headers'));
});

// ------------------------------------------------------------------ que no esté activado ni tenga secretos

test('el Worker no está activado (sin rutas, sin workers.dev, sin workflow que lo suba) y no tiene claves ni dependencias', () => {
  const toml = leer('infra/mcp-cloudflare/wrangler.toml');
  assert.ok(!/^\s*routes\s*=/m.test(toml), 'tiene routes activas');
  assert.match(toml, /^workers_dev = false$/m);
  assert.match(toml, /^name = "radar-balcarce-mcp"$/m);
  const codigo = leer('infra/mcp-cloudflare/worker.mjs');
  assert.ok(!/^\s*import\s/m.test(codigo), 'el Worker no importa nada');
  for (const f of [codigo, toml, leer('infra/mcp-cloudflare/LEEME.md')]) assert.ok(!/ghp_|github_pat_|AIza|sk-[A-Za-z0-9]{20,}|Bearer [A-Za-z0-9_]{20,}/.test(f), 'hay una clave escrita');
  const workflows = fs.readdirSync(new URL('../.github/workflows/', import.meta.url)).map((w) => leer(`.github/workflows/${w}`)).join('\n');
  assert.ok(!/mcp-cloudflare|radar-balcarce-mcp/.test(workflows), 'algún workflow sube el Worker MCP: todavía no se activa');
  // Es de sólo lectura: ni un fetch con método de escritura.
  assert.ok(!/method:\s*['"](POST|PUT|DELETE|PATCH)['"]/.test(codigo.replace(/request\.method/g, '')), 'el Worker no escribe');
});

test('las direcciones que lee el Worker son las que publica el sitio', () => {
  const codigo = leer('infra/mcp-cloudflare/worker.mjs');
  for (const ruta of ['/agentes/ultimas.json', '/agentes/indice.json', '/agentes/servicios.json']) {
    assert.ok(codigo.includes(ruta), ruta);
    assert.ok(fs.existsSync(new URL(`../web/app${ruta}/route.js`, import.meta.url)), `el sitio no publica ${ruta}`);
  }
});

// Ilustraciones con IA para las notas sin foto (15/10/2026): el módulo ingesta/foto-ia.mjs, todavía sin conectar a nada y apagado. Sin red: todas las
// respuestas de Gemini (la que genera la imagen y la que la mira) son simuladas. Lo más importante de este archivo son los casos que el módulo
// tiene que RECHAZAR.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  fotoIaActiva, topes, modeloDeImagen, costoEstimado, nombresDePersona, temaDeLaNota, evaluarNotaIA, armarPrompt, pedidoDeImagen, imagenDeLaRespuesta,
  generarImagen, instruccionDeVerificacion, interpretarVerificacion, verificarIlustracion, llamadasDelDia, hayCupo, textoAlternativo, esIlustracionIA,
  entradaDeBancoIA, paqueteXmp, incrustarXmpEnJpeg, textoConEtiqueta, elegirIlustracionIA,
  ETIQUETA, CREDITO, FUENTE_DIGITAL_IPTC, ENDPOINT, MODELO_POR_DEFECTO, PRECIOS_USD, TOPE_POR_CORRIDA, TOPE_POR_DIA, MAXIMO_ABSOLUTO_POR_DIA,
  SECCIONES_APTAS, TEMAS_IA, ESTILO, PROHIBIDO, ACENTO_POR_SECCION,
} from '../ingesta/foto-ia.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const SIN_ENV = {}; // un entorno vacío: nunca se lee el .env de verdad en estas pruebas
const CON_CLAVE = { GEMINI_API_KEY_IMAGENES: 'clave-secreta-de-prueba' };

const nota = (titulo, seccion, extra = {}) => ({ id: 'n1', titulo, seccion, copete: '', etiquetas: [], ...extra });

const IMAGEN_FALSA = Buffer.alloc(300, 7).toString('base64');
const respuestaDeImagen = (extra = {}) => ({ steps: [{ type: 'model_output', content: [{ type: 'image', mime_type: 'image/jpeg', data: IMAGEN_FALSA }] }], usage: { total_input_tokens: 40, total_output_tokens: 1290 }, ...extra });
const BIEN = { personas_visibles: false, rostros: false, texto_visible: false, logo_o_marca: false, parece_foto_real: false, lugar_reconocible: false, ilustra_el_tema: true, razon: 'un tractor dibujado en un campo' };
const respuestaDeVision = (obj) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }], usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 60, totalTokenCount: 960 } });

/** Un fetch simulado: separa lo que genera la imagen (interactions) de lo que la mira (generateContent) y cuenta los pedidos. */
function redSimulada({ imagen = () => ({ ok: true, json: respuestaDeImagen() }), vision = () => ({ ok: true, json: respuestaDeVision(BIEN) }) } = {}) {
  const pedidos = [];
  const fetchFn = async (url, opciones = {}) => {
    pedidos.push({ url: String(url), opciones });
    const r = String(url).includes('/interactions') ? imagen(opciones) : vision(opciones);
    return { ok: r.ok, status: r.status ?? (r.ok ? 200 : 500), json: async () => r.json, text: async () => JSON.stringify(r.json ?? {}) };
  };
  return { fetchFn, pedidos };
}

// ------------------------------------------------------------- el interruptor

test('el interruptor viene apagado y sólo "Si" lo prende', () => {
  assert.equal(fotoIaActiva({ env: SIN_ENV }), false);
  assert.equal(fotoIaActiva({ env: { FOTO_IA_ACTIVA: 'No' } }), false);
  assert.equal(fotoIaActiva({ env: { FOTO_IA_ACTIVA: '1' } }), false);
  assert.equal(fotoIaActiva({ env: { FOTO_IA_ACTIVA: 'true' } }), false);
  assert.equal(fotoIaActiva({ env: { FOTO_IA_ACTIVA: 'Si' } }), true);
  assert.equal(fotoIaActiva({ env: { FOTO_IA_ACTIVA: 'sí' } }), true);
});

test('apagado, elegirIlustracionIA no hace ni un pedido, ni siquiera con una nota perfecta y con clave', async () => {
  const { fetchFn, pedidos } = redSimulada();
  const r = await elegirIlustracionIA(nota('Comienza la siembra de soja y maíz', 'Agro'), { env: { ...CON_CLAVE }, fetchFn });
  assert.equal(r.elegida, null);
  assert.equal(r.apagado, true);
  assert.equal(pedidos.length, 0);
});

// ------------------------------------------------- lo que tiene que RECHAZAR

test('Policiales: nunca una ilustración, aunque el tema sea inofensivo', () => {
  for (const t of ['Un cazador recibe el alta tras la mordedura de una víbora', 'Obras en el hospital de la zona', 'Comienza la siembra de soja']) {
    const e = evaluarNotaIA(nota(t, 'Policiales'));
    assert.equal(e.apto, false, t);
    assert.match(e.motivo, /Policiales/);
  }
});

test('lo que cuenta un hecho, un delito, una víctima o una emergencia no se ilustra, esté en la sección que esté', () => {
  const casos = [
    ['Un tractor vuelca en un campo y el conductor queda herido', 'Agro'],
    ['Incendio en un campo de soja destruye la cosecha', 'Agro'],
    ['Detienen a un hombre por el robo de maquinaria agrícola', 'Agro'],
    ['Un joven muere en un accidente en el autódromo', 'Automovilismo'],
    ['Alerta por granizo en la zona de siembra', 'Agro'],
    ['Aparecen restos de una víctima en un campo', 'Agro'],
    ['Estafa con inversiones: denuncian a una financiera', 'Economía'],
    ['Ciberataque a un banco: hackeo de datos', 'Tecnología'],
  ];
  for (const [t, s] of casos) assert.equal(evaluarNotaIA(nota(t, s)).apto, false, t);
});

test('menores: ni siquiera una ilustración de objetos', () => {
  for (const [t, s] of [
    ['Comienzan las inscripciones a útiles escolares', 'Cultura y agenda'],
    ['Torneo de vóley juvenil en el club', 'Deportes'],
    ['Los alumnos de la escuela presentan una obra de teatro', 'Cultura y agenda'],
    ['La Sub-17 juega al fútbol en el estadio', 'Fútbol'],
    ['Niños y niñas visitan la biblioteca', 'Cultura y agenda'],
    ['Una familia dona libros a la biblioteca', 'Cultura y agenda'],
  ]) {
    const e = evaluarNotaIA(nota(t, s));
    assert.equal(e.apto, false, t);
    assert.match(e.motivo, /menores/, t);
  }
});

test('las secciones fuera de la lista (Política, Balcarce, Argentina) nunca llevan ilustración, aunque el tema esté en la tabla', () => {
  assert.deepEqual([...SECCIONES_APTAS].sort(), ['Agro', 'Automovilismo', 'Cultura y agenda', 'Deportes', 'Economía', 'Fútbol', 'Tecnología']);
  for (const s of ['Política', 'Balcarce', 'Argentina', 'Policiales', 'Región', undefined]) {
    const e = evaluarNotaIA(nota('Comienza la siembra de soja y maíz', s));
    assert.equal(e.apto, false, String(s));
  }
});

test('personas reales: un nombre propio, una figura con sólo el apellido o un cargo cierran la puerta', () => {
  for (const [t, s] of [
    ['Luis Caputo habla de la inflación', 'Economía'],
    ['Milei y la inteligencia artificial', 'Tecnología'],
    ['Mariano Werner y el autódromo', 'Automovilismo'],
    ['El intendente inaugura la feria del libro', 'Cultura y agenda'],
    ['Un productor mostró su nueva cosechadora', 'Agro'],
    ['El actor presenta su obra de teatro', 'Cultura y agenda'],
    ['Colapinto y la Fórmula 1', 'Automovilismo'],
  ]) assert.equal(evaluarNotaIA(nota(t, s)).apto, false, t);
  // también en las etiquetas
  assert.equal(evaluarNotaIA(nota('Comienza la siembra', 'Agro', { etiquetas: ['Juan Pérez'] })).apto, false);
  assert.deepEqual(nombresDePersona('La Bolsa de Comercio y el Banco Central'), []);
  assert.ok(nombresDePersona('Juan Pérez en Buenos Aires').includes('Juan Pérez'));
});

test('justicia, política y balanzas: no se ilustran (ni en secciones aptas)', () => {
  for (const [t, s] of [
    ['La Justicia multa a una empresa de energía', 'Economía'],
    ['Un fallo judicial frena el cobro de tarifas de luz', 'Economía'],
    ['El Congreso debate la reforma sobre el campo', 'Agro'],
    ['Decreto del gobierno sobre las retenciones al trigo', 'Agro'],
    ['Elecciones en una cooperativa agrícola', 'Agro'],
  ]) assert.equal(evaluarNotaIA(nota(t, s)).apto, false, t);
});

test('un lugar o un problema concreto, o un resultado concreto, no se ilustra', () => {
  assert.equal(evaluarNotaIA(nota('Vecinos reclaman por el estado del camino rural de la siembra', 'Agro')).apto, false);
  assert.equal(evaluarNotaIA(nota('Corte de ruta frena el transporte de soja', 'Agro')).apto, false);
  assert.equal(evaluarNotaIA(nota('Boca gana en el estadio de fútbol y pasa a la final', 'Fútbol')).apto, false);
  assert.equal(evaluarNotaIA(nota('Resultado del torneo de pádel', 'Deportes')).apto, false);
});

test('sin un tema genérico de la tabla no hay ilustración; una nota propia o que ya tiene foto, tampoco', () => {
  assert.equal(evaluarNotaIA(nota('Se conocieron los datos del trimestre', 'Economía')).apto, false);
  assert.equal(evaluarNotaIA(nota('Comienza la siembra de soja', 'Agro', { propia: 'dolar' })).apto, false);
  assert.equal(evaluarNotaIA(nota('Comienza la siembra de soja', 'Agro', { foto: { archivo: 'fotos-notas/x.jpg' } })).apto, false);
  assert.equal(evaluarNotaIA({ seccion: 'Agro' }).apto, false);
  assert.equal(evaluarNotaIA(null).apto, false);
});

test('las notas que SÍ pueden llevar ilustración: conceptos genéricos en secciones aptas', () => {
  const casos = [
    ['Comienza la siembra de soja y maíz en la región', 'Agro', 'siembra'],
    ['La inflación de septiembre y los precios de la canasta', 'Economía', 'inflacion'],
    ['Cómo funciona la inteligencia artificial generativa', 'Tecnología', 'ia'],
    ['Se estrena una obra de teatro en la ciudad', 'Cultura y agenda', 'teatro'],
    ['Nuevo torneo de tenis de mesa abierto', 'Deportes', 'tenis-de-mesa'],
  ];
  for (const [t, s, id] of casos) {
    const e = evaluarNotaIA(nota(t, s));
    assert.equal(e.apto, true, `${t}: ${e.motivo}`);
    assert.equal(e.tema.id, id);
  }
  // el tema sale del título; si no, de las etiquetas (no de la bajada)
  assert.equal(temaDeLaNota(nota('Una novedad importante', 'Agro', { etiquetas: ['ganadería'] })).id, 'ganaderia');
  assert.equal(temaDeLaNota(nota('Una novedad importante', 'Agro', { copete: 'soja soja soja' })), null);
});

// ------------------------------------------------------------- el pedido

test('el prompt lleva la escena de la tabla, el estilo de la marca y lo prohibido, y NUNCA el título ni ningún nombre de la nota', () => {
  const n = nota('Comienza la siembra de soja en Tandil, dijo el productor Roberto Gómez', 'Agro', { copete: 'Detalles de Radar Balcarce', etiquetas: ['Tandil'] });
  const e = { apto: true, tema: temaDeLaNota(n) };
  const p = armarPrompt(e, n);
  assert.ok(p.includes(e.tema.escena));
  assert.ok(p.includes(ESTILO) && p.includes(PROHIBIDO));
  assert.match(p, /no people/);
  assert.match(p, /no text/);
  assert.match(p, /no logos/);
  assert.match(p, /NOT a photograph/);
  for (const prohibida of ['Tandil', 'Roberto', 'Gómez', 'Gomez', 'productor', 'Radar', 'soja en']) assert.ok(!p.includes(prohibida), prohibida);
  assert.throws(() => armarPrompt({ apto: false }, n), /no es apta/);
});

test('todas las escenas de la tabla son sin personas, sin marcas y sin lugares reales; y la tabla está completa', () => {
  const GENTE = /\b(man|men|woman|women|people|person|crowd|child|children|kid|boy|girl|player|players|athlete|runner|driver|face|faces|portrait|family|audience|fans|musician|dancer|worker|farmer)\b/i;
  const MARCAS = /\b(logo|brand name|nike|adidas|apple|samsung|google|boca|river|argentina|buenos aires|balcarce|tandil|mar del plata|congress|casa rosada)\b/i;
  const ids = new Set();
  for (const t of TEMAS_IA) {
    assert.ok(t.id && t.re instanceof RegExp && t.escena && t.alt, t.id);
    assert.ok(!ids.has(t.id), `id repetido ${t.id}`);
    ids.add(t.id);
    // "no driver visible" y "nobody" se permiten: son negaciones
    assert.ok(!GENTE.test(t.escena.replace(/no driver visible/g, '')), `${t.id}: ${t.escena}`);
    assert.ok(!MARCAS.test(t.escena.replace(/no logo,? no brand/g, '')), `${t.id}: ${t.escena}`);
    assert.ok(!/\b(ciudad|municipalidad|plaza|calle)\b/i.test(t.alt), t.id);
  }
  assert.ok(TEMAS_IA.length >= 25);
});

test('el pedido a la API: modelo, entrada y formato de imagen 16:9 en 1K; la Lite no manda tamaño', () => {
  const p = pedidoDeImagen({ prompt: 'escena' });
  assert.equal(p.model, MODELO_POR_DEFECTO);
  assert.equal(p.input, 'escena');
  assert.deepEqual(p.response_format, { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '16:9', image_size: '1K' });
  assert.equal(pedidoDeImagen({ prompt: 'x', modelo: 'gemini-3.1-flash-lite-image' }).response_format.image_size, undefined);
  assert.equal(ENDPOINT, 'https://generativelanguage.googleapis.com/v1beta/interactions');
});

test('los modelos: el de por defecto está en la tabla de precios; uno desconocido o apagado (2.5) no se acepta', () => {
  assert.ok(PRECIOS_USD[MODELO_POR_DEFECTO]);
  assert.equal(modeloDeImagen({ env: SIN_ENV }), MODELO_POR_DEFECTO);
  assert.equal(modeloDeImagen({ env: { FOTO_IA_MODELO: 'gemini-3.1-flash-image' } }), 'gemini-3.1-flash-image');
  assert.equal(modeloDeImagen({ env: { FOTO_IA_MODELO: 'gemini-2.5-flash-image' } }), MODELO_POR_DEFECTO);
  assert.equal(modeloDeImagen({ env: { FOTO_IA_MODELO: 'cualquier-cosa' } }), MODELO_POR_DEFECTO);
  assert.equal(PRECIOS_USD['gemini-2.5-flash-image'], undefined);
});

test('el costo: 100 imágenes a 1K con el modelo de por defecto son US$ 3,36; un modelo o tamaño que no figura, null', () => {
  assert.equal(costoEstimado(100), 3.36);
  assert.equal(costoEstimado(10, { modelo: 'gemini-3-pro-image' }), 1.34);
  assert.equal(costoEstimado(1, { modelo: 'otro' }), null);
  assert.equal(costoEstimado(1, { tamano: '8K' }), null);
});

// ---------------------------------------------------------- la respuesta

test('la imagen de la respuesta: bloque image de la API de Interactions, o inlineData del formato clásico; sin imagen, null', () => {
  assert.deepEqual(imagenDeLaRespuesta(respuestaDeImagen()), { mime: 'image/jpeg', base64: IMAGEN_FALSA });
  assert.equal(imagenDeLaRespuesta({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: IMAGEN_FALSA } }] } }] }).mime, 'image/png');
  assert.equal(imagenDeLaRespuesta({ steps: [{ type: 'model_output', content: [{ type: 'text', text: 'No puedo hacer eso' }] }] }), null);
  assert.equal(imagenDeLaRespuesta({ steps: [] }), null);
  assert.equal(imagenDeLaRespuesta(null), null);
  assert.equal(imagenDeLaRespuesta({ steps: [{ content: [{ type: 'image', mime_type: 'text/html', data: IMAGEN_FALSA }] }] }), null);
  // una imagen de más de 6 MB no se acepta
  assert.equal(imagenDeLaRespuesta({ steps: [{ content: [{ type: 'image', mime_type: 'image/png', data: 'A'.repeat(9 * 1024 * 1024) }] }] }), null);
});

test('generarImagen: pide con la clave en el encabezado, devuelve la imagen y anota el uso (tarea "imagenes")', async () => {
  const { fetchFn, pedidos } = redSimulada();
  const uso = [];
  const r = await generarImagen('escena', { fetchFn, claveApi: 'clave-secreta-de-prueba', anotarUso: (x) => uso.push(x) });
  assert.equal(r.datos.mime, 'image/jpeg');
  assert.equal(pedidos.length, 1);
  assert.equal(pedidos[0].opciones.headers['x-goog-api-key'], 'clave-secreta-de-prueba');
  assert.ok(!pedidos[0].url.includes('clave-secreta'), 'la clave no va en la dirección');
  assert.equal(JSON.parse(pedidos[0].opciones.body).input, 'escena');
  assert.equal(uso.length, 1);
  assert.equal(uso[0].tarea, 'imagenes');
  assert.equal(uso[0].clave, 'imagenes');
  assert.ok(uso[0].respuesta);
  assert.equal(uso[0].error, undefined);
});

test('generarImagen: sin clave no pide nada; un 429 o una respuesta sin imagen no lanzan, se anotan como error y la clave no aparece en ningún mensaje', async () => {
  const a = redSimulada();
  const sinClave = await generarImagen('x', { fetchFn: a.fetchFn, claveApi: null, anotarUso: () => {} });
  assert.equal(sinClave.datos, null);
  assert.equal(a.pedidos.length, 0);

  const uso = [];
  const b = redSimulada({ imagen: () => ({ ok: false, status: 429, json: { error: { message: 'Quota exceeded for gemini-2.5-flash-image' } } }) });
  const cuota = await generarImagen('x', { fetchFn: b.fetchFn, claveApi: 'clave-secreta-de-prueba', anotarUso: (x) => uso.push(x) });
  assert.equal(cuota.datos, null);
  assert.equal(cuota.estado, 429);
  assert.match(cuota.motivo, /429/);
  assert.equal(uso[0].error, 429);

  const c = redSimulada({ imagen: () => ({ ok: true, json: { steps: [{ type: 'model_output', content: [{ type: 'text', text: 'bloqueado' }] }] } }) });
  const bloqueada = await generarImagen('x', { fetchFn: c.fetchFn, claveApi: 'clave-secreta-de-prueba', anotarUso: (x) => uso.push(x) });
  assert.equal(bloqueada.datos, null);
  assert.match(bloqueada.motivo, /no trae una imagen/);
  assert.equal(uso[1].error, 'sin imagen');

  const rota = await generarImagen('x', { fetchFn: async () => { throw new Error('fallo con clave-secreta-de-prueba'); }, claveApi: 'clave-secreta-de-prueba', anotarUso: () => {} });
  assert.equal(rota.datos, null);
  for (const r of [sinClave, cuota, bloqueada, rota]) assert.ok(!JSON.stringify(r).includes('clave-secreta-de-prueba'));
});

// -------------------------------------------------- mirar el resultado

test('la verificación sólo aprueba si TODO lo malo vino en false y el tema se ve; una clave que falta es un no', () => {
  assert.equal(interpretarVerificacion(BIEN).aprobada, true);
  for (const k of ['personas_visibles', 'rostros', 'texto_visible', 'logo_o_marca', 'parece_foto_real', 'lugar_reconocible']) {
    const r = interpretarVerificacion({ ...BIEN, [k]: true });
    assert.equal(r.aprobada, false, k);
    assert.match(r.motivo, new RegExp(k));
    const sin = { ...BIEN }; delete sin[k];
    assert.equal(interpretarVerificacion(sin).aprobada, false, `sin ${k}`);
  }
  assert.equal(interpretarVerificacion({ ...BIEN, ilustra_el_tema: false }).aprobada, false);
  assert.equal(interpretarVerificacion({ ...BIEN, rostros: 'no' }).aprobada, false, 'un texto no es un false');
  assert.equal(interpretarVerificacion(null).aprobada, false);
  assert.equal(interpretarVerificacion('hola').aprobada, false);
  assert.match(instruccionDeVerificacion({ tema: { alt: 'un tractor' } }), /un tractor/);
});

test('verificarIlustracion: usa la clave de clasificación, manda la imagen, y sin clave, sin imagen o con un error no aprueba', async () => {
  const { fetchFn, pedidos } = redSimulada();
  const uso = [];
  const ok = await verificarIlustracion({ mime: 'image/jpeg', base64: IMAGEN_FALSA }, { tema: { alt: 'un tractor' } }, { fetchFn, claveApi: 'otra-clave-de-prueba', anotarUso: (x) => uso.push(x) });
  assert.equal(ok.aprobada, true);
  assert.equal(pedidos[0].opciones.headers['x-goog-api-key'], 'otra-clave-de-prueba');
  assert.ok(JSON.parse(pedidos[0].opciones.body).contents[0].parts.some((p) => p.inlineData?.data === IMAGEN_FALSA));
  assert.equal(uso[0].tarea, 'fotos');

  assert.equal((await verificarIlustracion(null, {}, { fetchFn, claveApi: 'x' })).aprobada, false);
  assert.equal((await verificarIlustracion({ mime: 'image/jpeg', base64: 'a' }, {}, { fetchFn, claveApi: null })).aprobada, false);
  const mala = redSimulada({ vision: () => ({ ok: false, status: 503, json: {} }) });
  assert.equal((await verificarIlustracion({ mime: 'image/jpeg', base64: 'a' }, {}, { fetchFn: mala.fetchFn, claveApi: 'x', anotarUso: () => {} })).aprobada, false);
  const ilegible = redSimulada({ vision: () => ({ ok: true, json: { candidates: [{ content: { parts: [{ text: 'no es json' }] } }] } }) });
  assert.equal((await verificarIlustracion({ mime: 'image/jpeg', base64: 'a' }, {}, { fetchFn: ilegible.fetchFn, claveApi: 'x', anotarUso: () => {} })).aprobada, false);
});

// ------------------------------------------------------------- los topes

test('los topes: 3 por corrida y 6 por día; las variables los pueden bajar o subir, pero nunca más del máximo absoluto', () => {
  assert.deepEqual(topes({ env: SIN_ENV }), { porCorrida: TOPE_POR_CORRIDA, porDia: TOPE_POR_DIA });
  assert.equal(TOPE_POR_CORRIDA, 3);
  assert.equal(TOPE_POR_DIA, 6);
  assert.deepEqual(topes({ env: { FOTO_IA_TOPE_CORRIDA: '1', FOTO_IA_TOPE_DIA: '2' } }), { porCorrida: 1, porDia: 2 });
  assert.equal(topes({ env: { FOTO_IA_TOPE_DIA: '500' } }).porDia, MAXIMO_ABSOLUTO_POR_DIA);
  assert.equal(topes({ env: { FOTO_IA_TOPE_CORRIDA: '9', FOTO_IA_TOPE_DIA: '2' } }).porCorrida, 2, 'la corrida no pasa el tope del día');
  assert.deepEqual(topes({ env: { FOTO_IA_TOPE_CORRIDA: 'abc', FOTO_IA_TOPE_DIA: '-4' } }), { porCorrida: TOPE_POR_CORRIDA, porDia: TOPE_POR_DIA });
  assert.equal(hayCupo({ enLaCorrida: 2, usoDelDia: 5, env: SIN_ENV }).puede, true);
  assert.equal(hayCupo({ enLaCorrida: 3, usoDelDia: 0, env: SIN_ENV }).puede, false);
  assert.equal(hayCupo({ enLaCorrida: 0, usoDelDia: 6, env: SIN_ENV }).puede, false);
});

test('las llamadas del día salen de uso-ia.json y cuentan también las que salieron mal', () => {
  const uso = { dias: { '2026-10-15': { imagenes: { 'gemini-nano-banana-2.1': { llamadas: 4, errores: 1 }, 'gemini-3.1-flash-image': { llamadas: 2, errores: 0 } }, redaccion: { x: { llamadas: 99 } } } } };
  assert.equal(llamadasDelDia(uso, { dia: '2026-10-15' }), 6);
  assert.equal(llamadasDelDia(uso, { dia: '2026-10-16' }), 0);
  assert.equal(llamadasDelDia(null), 0);
});

// ------------------------------------------------------ el armado completo

test('elegirIlustracionIA, camino feliz: genera, la IA la aprueba, vuelve con la etiqueta, el alt y el modelo; y anota el uso', async () => {
  const { fetchFn, pedidos } = redSimulada();
  const uso = [];
  const n = nota('Comienza la siembra de soja y maíz en la región', 'Agro');
  const r = await elegirIlustracionIA(n, { env: { FOTO_IA_ACTIVA: 'Si', ...CON_CLAVE }, fetchFn, usoDelDia: 0, anotarUso: (x) => uso.push(x), claveVerificacion: 'clave-de-clasificacion' });
  assert.ok(r.elegida, r.razon);
  assert.equal(r.origen, 'ia');
  assert.equal(r.elegida.credito, CREDITO);
  assert.equal(r.elegida.credito, 'Ilustración generada con IA (Google)');
  assert.match(r.elegida.alt, /^Ilustración generada con IA: /);
  assert.equal(r.elegida.modelo, MODELO_POR_DEFECTO);
  assert.equal(r.elegida.generadaConIA, true);
  assert.equal(r.elegida.datos.mime, 'image/jpeg');
  assert.equal(pedidos.length, 2, 'uno para generar y otro para mirar');
  const generacion = JSON.parse(pedidos[0].opciones.body);
  assert.ok(!generacion.input.includes('soja y maíz'), 'el título no viaja en el pedido');
  assert.deepEqual(uso.map((u) => u.tarea), ['imagenes', 'fotos']);
});

test('elegirIlustracionIA: si la IA que mira ve algo malo, la imagen NO se usa (pero el gasto queda anotado)', async () => {
  const uso = [];
  for (const mala of [{ ...BIEN, personas_visibles: true }, { ...BIEN, texto_visible: true }, { ...BIEN, logo_o_marca: true }, { ...BIEN, parece_foto_real: true }, { ...BIEN, lugar_reconocible: true }]) {
    const { fetchFn } = redSimulada({ vision: () => ({ ok: true, json: respuestaDeVision(mala) }) });
    const r = await elegirIlustracionIA(nota('Comienza la siembra de soja', 'Agro'), { env: { ...CON_CLAVE }, forzar: true, fetchFn, usoDelDia: 0, anotarUso: (x) => uso.push(x), claveVerificacion: 'k' });
    assert.equal(r.elegida, null);
    assert.equal(r.descartada, true);
    assert.match(r.razon, /se descartó/);
  }
  assert.equal(uso.filter((u) => u.tarea === 'imagenes').length, 5);
});

test('elegirIlustracionIA: sin clave de verificación o con una verificación que falla, no se usa (no se puede apagar el control)', async () => {
  const sinClave = redSimulada();
  const a = await elegirIlustracionIA(nota('Comienza la siembra de soja', 'Agro'), { env: { ...CON_CLAVE }, forzar: true, fetchFn: sinClave.fetchFn, usoDelDia: 0, anotarUso: () => {}, claveVerificacion: null });
  assert.equal(a.elegida, null);
  const apagada = redSimulada();
  const b = await elegirIlustracionIA(nota('Comienza la siembra de soja', 'Agro'), { env: { ...CON_CLAVE }, forzar: true, fetchFn: apagada.fetchFn, usoDelDia: 0, anotarUso: () => {}, verificar: false });
  assert.equal(b.elegida, null);
  assert.match(b.razon, /no se puede apagar/);
});

test('elegirIlustracionIA: una nota que no es apta no hace ningún pedido', async () => {
  const { fetchFn, pedidos } = redSimulada();
  for (const n of [
    nota('Choque frontal en la Ruta 226', 'Policiales'),
    nota('Luis Caputo habla de la inflación', 'Economía'),
    nota('Útiles escolares: comienzan las inscripciones', 'Cultura y agenda'),
    nota('Comienza la siembra de soja', 'Balcarce'),
  ]) {
    const r = await elegirIlustracionIA(n, { env: { ...CON_CLAVE }, forzar: true, fetchFn, usoDelDia: 0, anotarUso: () => {} });
    assert.equal(r.elegida, null);
    assert.match(r.razon, /no se usa ilustración/);
  }
  assert.equal(pedidos.length, 0);
});

test('elegirIlustracionIA: sin la clave GEMINI_API_KEY_IMAGENES no pide nada (y no usa otra clave)', async () => {
  const { fetchFn, pedidos } = redSimulada();
  const r = await elegirIlustracionIA(nota('Comienza la siembra de soja', 'Agro'), {
    env: { GEMINI_API_KEY_CLASIFICACION: 'c', GEMINI_API_KEY_REDACCION: 'r', GEMINI_API_KEY_REDES: 'v', GROQ_API_KEY: 'g' }, forzar: true, fetchFn, usoDelDia: 0, anotarUso: () => {},
  });
  assert.equal(r.elegida, null);
  assert.equal(r.sinClave, true);
  assert.equal(pedidos.length, 0);
});

test('elegirIlustracionIA: los topes cortan antes de pedir (por corrida y por día)', async () => {
  const { fetchFn, pedidos } = redSimulada();
  const base = { env: { ...CON_CLAVE }, forzar: true, fetchFn, anotarUso: () => {}, claveVerificacion: 'k' };
  const porCorrida = await elegirIlustracionIA(nota('Comienza la siembra de soja', 'Agro'), { ...base, enLaCorrida: TOPE_POR_CORRIDA, usoDelDia: 0 });
  assert.equal(porCorrida.elegida, null);
  assert.equal(porCorrida.tope, true);
  const porDia = await elegirIlustracionIA(nota('Comienza la siembra de soja', 'Agro'), { ...base, enLaCorrida: 0, usoDelDia: TOPE_POR_DIA });
  assert.equal(porDia.tope, true);
  assert.match(porDia.razon, /por día/);
  assert.equal(pedidos.length, 0);
  const pasa = await elegirIlustracionIA(nota('Comienza la siembra de soja', 'Agro'), { ...base, enLaCorrida: TOPE_POR_CORRIDA - 1, usoDelDia: TOPE_POR_DIA - 1 });
  assert.ok(pasa.elegida);
});

test('elegirIlustracionIA: si Google contesta 429 (sin cuota o sin facturación para imágenes) no lanza y la nota queda con su placa', async () => {
  const { fetchFn } = redSimulada({ imagen: () => ({ ok: false, status: 429, json: { error: { message: 'You exceeded your current quota' } } }) });
  const r = await elegirIlustracionIA(nota('Comienza la siembra de soja', 'Agro'), { env: { ...CON_CLAVE }, forzar: true, fetchFn, usoDelDia: 0, anotarUso: () => {} });
  assert.equal(r.elegida, null);
  assert.equal(r.estado, 429);
  assert.match(r.razon, /429/);
});

// ------------------------------------------------- etiqueta y metadatos

test('la etiqueta: el epígrafe, el alt y el banco dicen "Ilustración generada con IA" y no hay manera de armar una entrada sin ella', () => {
  assert.equal(ETIQUETA, 'Ilustración generada con IA');
  assert.equal(CREDITO, 'Ilustración generada con IA (Google)');
  const tema = TEMAS_IA.find((t) => t.id === 'siembra');
  assert.equal(textoAlternativo(tema), 'Ilustración generada con IA: un tractor en un campo al atardecer');
  const e = entradaDeBancoIA({ modelo: MODELO_POR_DEFECTO, tema }, nota('Comienza la siembra', 'Agro'), { archivo: 'fotos-notas/n1.jpg', ahora: new Date('2026-10-16T12:00:00Z') });
  assert.equal(e.credito, CREDITO);
  assert.match(e.alt, /^Ilustración generada con IA/);
  assert.equal(e.origen, 'ia');
  assert.equal(e.ilustrativa, true);
  assert.equal(e.generadaConIA, true);
  assert.equal(e.licencia, null);
  assert.equal(e.fuenteDigital, FUENTE_DIGITAL_IPTC);
  assert.equal(e.archivo, 'fotos-notas/n1.jpg');
  assert.equal(esIlustracionIA(e), true);
  assert.equal(esIlustracionIA({ origen: 'medio' }), false);
  // el credito de una foto de otro medio nunca se confunde con éste
  assert.ok(!/Ilustración generada con IA/.test('Foto: Radio Gabal'));
});

test('el XMP lleva DigitalSourceType = trainedAlgorithmicMedia, el crédito y la descripción, y se mete en un JPEG como un segmento APP1', () => {
  const entrada = { credito: CREDITO, alt: 'Ilustración generada con IA: un tractor & un campo' };
  const xmp = paqueteXmp(entrada);
  assert.ok(xmp.includes('http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia'));
  assert.ok(xmp.includes('Ilustración generada con IA (Google)'));
  assert.ok(xmp.includes('un tractor &amp; un campo'), 'se escapa el XML');
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xd9]);
  const con = incrustarXmpEnJpeg(jpeg, xmp);
  assert.equal(con[0], 0xff); assert.equal(con[1], 0xd8);
  assert.equal(con[2], 0xff); assert.equal(con[3], 0xe1);
  assert.ok(con.includes(Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'latin1')));
  assert.ok(con.includes(Buffer.from('trainedAlgorithmicMedia')));
  assert.equal(con.length, jpeg.length + 2 + con.readUInt16BE(4));
  assert.deepEqual(con.subarray(con.length - 8), jpeg.subarray(2));
  // lo que no es un JPEG, o un paquete que no entra, no se toca
  assert.equal(incrustarXmpEnJpeg(Buffer.from('no soy jpeg'), xmp), null);
  assert.equal(incrustarXmpEnJpeg('texto', xmp), null);
  assert.equal(incrustarXmpEnJpeg(jpeg, 'x'.repeat(70_000)), null);
});

test('ninguna pieza de redes con una ilustración sale sin la etiqueta; con una foto de verdad no se toca el texto', () => {
  const e = { origen: 'ia', credito: CREDITO };
  assert.equal(textoConEtiqueta('Comienza la siembra. Leé más en radarbalcarce.com', e), `Comienza la siembra. Leé más en radarbalcarce.com\n\n${CREDITO}`);
  const ya = `Texto\n\n${CREDITO}`;
  assert.equal(textoConEtiqueta(ya, e), ya, 'no se repite');
  assert.equal(textoConEtiqueta('', e), CREDITO);
  assert.equal(textoConEtiqueta('Texto', { origen: 'medio', credito: 'Foto: Radio Gabal' }), 'Texto');
  assert.equal(textoConEtiqueta('Texto', undefined), 'Texto');
});

test('el estilo es único: collage con la paleta del sitio, sin fotorrealismo, y los acentos por sección son los de las placas', () => {
  for (const c of ['#F4F1EA', '#14161A', '#C7381C', '#16615B', '#E8A33C']) assert.ok(ESTILO.includes(c), c);
  assert.match(ESTILO, /NOT a photograph/);
  const css = fs.readFileSync(path.join(RAIZ, 'web', 'app', 'globals.css'), 'utf8');
  for (const c of ['#F4F1EA', '#14161A', '#C7381C', '#16615B', '#E8A33C']) assert.ok(css.toUpperCase().includes(c), `${c} no está en globals.css`);
  const placa = fs.readFileSync(path.join(RAIZ, 'reels', 'placa.mjs'), 'utf8');
  for (const [seccion, color] of Object.entries(ACENTO_POR_SECCION)) {
    assert.ok(SECCIONES_APTAS.includes(seccion), seccion);
    const clave = /\s/.test(seccion) ? `'${seccion}'` : seccion;
    assert.ok(placa.includes(`${clave}: '${color}'`), `${seccion} ${color} no coincide con COLOR_SECCION`);
  }
  for (const s of SECCIONES_APTAS) assert.ok(ACENTO_POR_SECCION[s], `falta el acento de ${s}`);
});

// ----------------------------------------- el módulo no está conectado todavía

function archivosDe(carpeta, acum = []) {
  for (const e of fs.readdirSync(carpeta, { withFileTypes: true })) {
    if (['node_modules', '.next', 'out', 'salida', 'datos', '.git'].includes(e.name)) continue;
    const completo = path.join(carpeta, e.name);
    if (e.isDirectory()) archivosDe(completo, acum);
    else if (/\.(mjs|js|cjs|yml|yaml)$/.test(e.name)) acum.push(completo);
  }
  return acum;
}

test('el módulo no está conectado a producción: nada lo importa fuera de las pruebas y ningún workflow lo prende', () => {
  const quienes = [];
  for (const carpeta of ['ingesta', 'redes', 'panel', 'reels', 'web/scripts', 'web/lib', 'web/app', '.github']) {
    const dir = path.join(RAIZ, carpeta);
    if (!fs.existsSync(dir)) continue;
    for (const a of archivosDe(dir)) {
      if (a.endsWith('foto-ia.mjs')) continue;
      const texto = fs.readFileSync(a, 'utf8');
      if (/foto-ia/.test(texto) || /FOTO_IA_ACTIVA|GEMINI_API_KEY_IMAGENES/.test(texto)) quienes.push(path.relative(RAIZ, a).replaceAll('\\', '/'));
    }
  }
  // reels/claves.mjs define la clave nueva y la nombra: es lo único permitido.
  assert.deepEqual(quienes.filter((q) => q !== 'reels/claves.mjs'), [], 'cuando se conecte, esta prueba se cambia a propósito (docs/fotos/PROPUESTA-IMAGEN-IA.md)');
});

test('el módulo no lleva claves escritas ni las muestra, y su única clave nueva es la de imágenes (sin respaldo en las otras)', () => {
  const texto = fs.readFileSync(path.join(RAIZ, 'ingesta', 'foto-ia.mjs'), 'utf8');
  assert.ok(!/AIza[0-9A-Za-z_-]{20,}|gsk_[0-9A-Za-z]{20,}|[A-Za-z0-9]{40,}/.test(texto.replace(/https?:\/\/\S+/g, '')), 'parece haber una clave escrita');
  assert.ok(!/console\.(log|error|warn)\([^)]*(clave|key|token)/i.test(texto), 'no se muestran claves');
  const claves = fs.readFileSync(path.join(RAIZ, 'reels', 'claves.mjs'), 'utf8');
  assert.match(claves, /export const claveImagenes = \(o\) => leerVariable\('GEMINI_API_KEY_IMAGENES', o\);/, 'sin ?? hacia otra clave');
  // sin red y sin .env: la clave de imágenes no se completa con las otras
  assert.equal(modeloDeImagen({ env: SIN_ENV }), MODELO_POR_DEFECTO);
});

test('nada de lo que se anota en el banco ni en el prompt es un recorte del título de la nota (el prompt no lo lleva y el banco lo guarda sólo como dato)', () => {
  const n = nota('Comienza la siembra de soja', 'Agro');
  const e = evaluarNotaIA(n);
  assert.ok(!armarPrompt(e, n).toLowerCase().includes('comienza'));
});

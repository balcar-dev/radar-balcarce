// El cuerpo de la nota: que exista, que desarrolle y que no repita el copete.
//
// El 24/09 sólo 18 de 178 notas tenían cuerpo: apenas la IA metía un dato de
// más se tiraba todo, sin segunda oportunidad. Ahora se le dice qué inventó y
// se le pide que lo rehaga; si igual falla sólo el cuerpo, se publica el
// titular y el copete y la nota queda sin cuerpo (mejor que uno inventado).

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { verificar, similitud } from '../ingesta/verificar.mjs';
import { reescribirAutomaticas } from '../reels/reescritura.mjs';

before(() => { process.env.GEMINI_API_KEY_REDACCION = 'clave-de-prueba'; });

const FUENTE = {
  titulo: 'El Concejo aprobó la ordenanza de tránsito',
  resumen: 'El Concejo Deliberante de Balcarce aprobó este jueves la ordenanza de tránsito con el voto de la mayoría. La norma ordena el estacionamiento en el centro y fija multas por mal estacionamiento en la avenida principal.',
};

// ------------------------------------------------- que no repita el copete

test('un cuerpo que repite el copete se rechaza', () => {
  const copete = 'El Concejo aprobó la ordenanza de tránsito del centro.';
  const r = verificar(FUENTE, { titulo: 'El Concejo aprobó la ordenanza', copete, guion: 'x', cuerpo: copete });
  assert.ok(r.problemas.some((p) => p.tipo === 'repite'));
});

test('un cuerpo que empieza con el mismo texto del copete se rechaza', () => {
  const copete = 'El Concejo Deliberante aprobó la ordenanza de tránsito con el voto de la mayoría.';
  const r = verificar(FUENTE, { titulo: 'Aprobaron la ordenanza', copete, guion: 'x', cuerpo: `${copete} También otras cosas de la norma.` });
  assert.ok(r.problemas.some((p) => p.tipo === 'repite'));
});

test('un cuerpo que amplía el copete pasa', () => {
  const r = verificar(FUENTE, {
    titulo: 'Aprobaron la ordenanza de tránsito',
    copete: 'El Concejo Deliberante aprobó la nueva norma de tránsito.',
    guion: 'x',
    cuerpo: 'Además de regular dónde se puede dejar el auto en el centro, la ordenanza establece sanciones económicas para quienes estacionen mal sobre la avenida principal.',
  });
  assert.equal(r.ok, true, JSON.stringify(r.problemas));
});

test('similitud: iguales dan 1, distintos dan casi 0', () => {
  assert.equal(similitud('el perro corre rápido', 'el perro corre rápido'), 1);
  assert.ok(similitud('aprobaron la ordenanza de tránsito', 'llovió sobre la ciudad ayer') < 0.3);
});

// ----------------------------------------- revalidar sin volver a bajar el texto

test('con soloForma no se comparan los datos contra la fuente', () => {
  const nuevo = { titulo: 'Aprobaron la ordenanza', copete: 'El Concejo aprobó la norma.', guion: 'x', cuerpo: 'Participaron 45 vecinos de Juan Pérez.' };
  assert.equal(verificar(FUENTE, nuevo).ok, false, 'el dato inventado tiene que rechazarse contra la fuente');
  assert.equal(verificar(FUENTE, nuevo, { soloForma: true }).ok, true, 'revalidar la forma no debería depender del texto de origen');
});

test('con soloForma se siguen controlando el largo y las tildes', () => {
  const r = verificar(FUENTE, { titulo: 'Aprobaron la ordenanza', copete: 'El Concejo aprobó la norma.', guion: 'x', cuerpo: 'Hubo ms de cien vecinos.' }, { soloForma: true });
  assert.ok(r.problemas.some((p) => p.tipo === 'tilde'));
});

// -------------------------------------------- el reintento con corrección

const NOTA = { id: 'n1', semaforo: 'verde', relevancia: 90, seccion: 'Política', medios: ['X'], titulo: FUENTE.titulo, resumenFuente: FUENTE.resumen, enlace: 'https://x/n1' };

/** Un Gemini de mentira que contesta lo que se le diga, en orden. */
function gemini(respuestas) {
  const pedidos = [];
  const fetchFn = async (url, init) => {
    pedidos.push(JSON.parse(init.body).contents[0].parts[0].text);
    const r = respuestas.shift();
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] }) };
  };
  return { fetchFn, pedidos };
}
const bueno = {
  titulo: 'Aprobaron la ordenanza de tránsito', copete: 'El Concejo Deliberante aprobó la nueva norma de tránsito.',
  guion: 'Aprobaron la ordenanza de tránsito', cuerpo: 'Además de regular dónde se puede dejar el auto en el centro, la ordenanza establece sanciones económicas para quienes estacionen mal sobre la avenida principal.',
};
const conDatoInventado = { ...bueno, cuerpo: 'La norma alcanza a 350 comercios del centro y fue impulsada por Roberto Salinas.' };
const sinTexto = async () => null;

test('si la primera respuesta inventa un dato, se reintenta con la corrección y se acepta', async () => {
  const { fetchFn, pedidos } = gemini([conDatoInventado, bueno]);
  const r = await reescribirAutomaticas([NOTA], { traer: sinTexto, opciones: { fetchFn, intentos: 1 } });
  assert.ok(r.n1, 'la nota se perdió en vez de reintentarse');
  assert.equal(r.n1.cuerpo, bueno.cuerpo);
  assert.equal(pedidos.length, 2);
  assert.match(pedidos[1], /CORRECCIÓN OBLIGATORIA/);
  assert.match(pedidos[1], /350|Roberto Salinas/, 'no le dijo qué había inventado');
});

test('si a la primera sale bien, no se gasta un segundo pedido', async () => {
  const { fetchFn, pedidos } = gemini([bueno]);
  await reescribirAutomaticas([NOTA], { traer: sinTexto, opciones: { fetchFn, intentos: 1 } });
  assert.equal(pedidos.length, 1);
});

test('si sólo falla el cuerpo las dos veces, se publica el titular y el copete sin cuerpo', async () => {
  const { fetchFn } = gemini([conDatoInventado, conDatoInventado]);
  const r = await reescribirAutomaticas([NOTA], { traer: sinTexto, opciones: { fetchFn, intentos: 1 } });
  assert.ok(r.n1, 'perdió también el titular y el copete, que estaban bien');
  assert.equal(r.n1.cuerpo, '');
  assert.equal(r.n1.titulo, bueno.titulo);
});

test('si falla el titular, no se publica nada de la IA', async () => {
  const malo = { ...bueno, titulo: 'Roberto Salinas aprobó 350 multas' };
  const { fetchFn } = gemini([malo, malo]);
  const r = await reescribirAutomaticas([NOTA], { traer: sinTexto, opciones: { fetchFn, intentos: 1 } });
  assert.equal(r.n1, undefined);
});

test('lo que ya se reescribió no se vuelve a pedir, aunque el texto original no esté a mano', async () => {
  const { fetchFn, pedidos } = gemini([]);
  const previas = { n1: { titulo: bueno.titulo, copete: bueno.copete, cuerpo: 'Un cuerpo que usó datos del texto completo: 350 comercios.', guion: bueno.guion, deIA: true } };
  const r = await reescribirAutomaticas([NOTA], { previas, traer: sinTexto, opciones: { fetchFn, intentos: 1 } });
  assert.ok(r.n1, 'descartó una nota buena por no tener el texto completo en esta corrida');
  assert.equal(pedidos.length, 0);
});

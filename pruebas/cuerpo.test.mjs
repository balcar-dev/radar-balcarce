// El cuerpo de la nota: que exista, que desarrolle y que no repita el copete.
//
// El 24/09 sólo 18 de 178 notas tenían cuerpo: apenas la IA metía un dato de
// más se tiraba todo, sin segunda oportunidad. Desde entonces se le dice qué
// inventó y se le pide que lo rehaga.
//
// El 25/09 42 de 89 notas de la portada seguían saliendo sin cuerpo (39 de
// ellas escritas por la IA): si el cuerpo no pasaba, se publicaba el título y
// la bajada con el cuerpo vacío, y ese cuerpo vacío se reusaba para siempre.
// Desde ese día (regla 23 de REGLAS.md):
//   · una nota automática SIN CUERPO NO SE PUBLICA (web/lib/cuerpo.js);
//   · un cuerpo vacío nunca se reusa: la nota vuelve a intentarse;
//   · como mucho tres intentos por nota, en corridas distintas;
//   · si el cuerpo trae un dato que no cuadra, se sacan esas oraciones;
//   · sin texto completo y con un resumen corto, no se le pide a Gemini.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { verificar, similitud, depurarCuerpo } from '../ingesta/verificar.mjs';
import {
  reescribirAutomaticas, previasDeLaPortada, podarIntentos, textoCompletoDe, MAXIMO_DE_INTENTOS,
} from '../reels/reescritura.mjs';
import { tieneCuerpo, esperaCuerpo, palabrasDe, PALABRAS_MINIMAS_CUERPO } from '../web/lib/cuerpo.js';
import { elegirParaFacebook, sePuedeSola } from '../redes/elegir.mjs';
import { datosDelDia, textoResumen } from '../redes/avisos.mjs';
import { CUERPO, TEXTO_COMPLETO } from './cuerpo-de-prueba.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');

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

// ------------------------------------------------ qué es "cuerpo de verdad"

test('tieneCuerpo: 70 palabras o más, y que no sea la bajada otra vez', () => {
  assert.ok(palabrasDe(CUERPO) >= PALABRAS_MINIMAS_CUERPO);
  assert.equal(tieneCuerpo({ cuerpo: CUERPO, copete: 'Otra cosa.' }), true);
  assert.equal(tieneCuerpo({ cuerpo: '', copete: 'x' }), false, 'el cuerpo vacío del 25/09');
  assert.equal(tieneCuerpo({ cuerpo: null }), false);
  assert.equal(tieneCuerpo({ cuerpo: 'Un párrafo corto de veinte palabras no alcanza para ser una nota elaborada aunque tenga un par de datos.' }), false);
  const copete = 'Una bajada bastante larga que cuenta el hecho central de la nota con sus datos principales y algo más.';
  assert.equal(tieneCuerpo({ cuerpo: `${copete} ${CUERPO}`, copete }), false, 'arranca repitiendo la bajada');
  assert.equal(esperaCuerpo({ como: 'automatica', cuerpo: '' }), true);
  assert.equal(esperaCuerpo({ como: 'publicada', cuerpo: '' }), false, 'lo que publicó una persona se respeta');
  assert.equal(esperaCuerpo({ como: 'automatica', cuerpo: CUERPO }), false);
});

// -------------------------------------------- nunca reusar un cuerpo vacío

test('la memoria entre corridas NO reusa un cuerpo vacío ni corto: esa nota vuelve a intentarse', () => {
  const previas = previasDeLaPortada([
    { id: 'buena', titulo: 'T', copete: 'C', cuerpo: CUERPO, guion: 'G' },
    { id: 'vacia', titulo: 'T', copete: 'C', cuerpo: '', guion: 'G' },
    { id: 'corta', titulo: 'T', copete: 'C', cuerpo: 'Dos renglones y nada más.', guion: 'G' },
  ]);
  assert.deepEqual(Object.keys(previas), ['buena']);
});

// -------------------------------------------- el reintento con corrección

const NOTA = { id: 'n1', semaforo: 'verde', relevancia: 90, seccion: 'Política', medios: ['X'], titulo: FUENTE.titulo, resumenFuente: FUENTE.resumen, enlace: 'https://x/n1' };

/** Un Gemini de mentira que contesta lo que se le diga, en orden. */
function gemini(respuestas) {
  const pedidos = [];
  const fetchFn = async (url, init) => {
    pedidos.push(JSON.parse(init.body).contents[0].parts[0].text);
    const r = respuestas.shift();
    if (r?.status) return { ok: false, status: r.status, text: async () => 'sin cupo', json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] }) };
  };
  return { fetchFn, pedidos };
}
const bueno = {
  titulo: 'Aprobaron la ordenanza de tránsito', copete: 'El Concejo Deliberante aprobó la nueva norma de tránsito.',
  guion: 'Aprobaron la ordenanza de tránsito', cuerpo: CUERPO,
};
const conDatoInventado = { ...bueno, cuerpo: 'La norma alcanza a 350 comercios del centro y fue impulsada por Roberto Salinas.' };
const sinTexto = async () => null;
// Estas pruebas no son sobre el material: se lo baja a cero.
const correr = (respuestas, extra = {}) => {
  const g = gemini(respuestas);
  const lineas = [];
  const intentos = extra.intentos ?? {};
  return reescribirAutomaticas([{ ...NOTA, ...(extra.nota ?? {}) }], {
    traer: extra.traer ?? sinTexto, minimoDeMaterial: extra.minimoDeMaterial ?? 0, intentos,
    opciones: { fetchFn: g.fetchFn, intentos: 1 }, registro: (l) => lineas.push(l), previas: extra.previas ?? {},
  }).then((r) => ({ r, pedidos: g.pedidos, lineas, intentos }));
};

test('si la primera respuesta inventa un dato, se reintenta con la corrección y se acepta', async () => {
  const { r, pedidos } = await correr([conDatoInventado, bueno]);
  assert.ok(r.n1, 'la nota se perdió en vez de reintentarse');
  assert.equal(r.n1.cuerpo, bueno.cuerpo);
  assert.equal(pedidos.length, 2);
  assert.match(pedidos[1], /CORRECCIÓN OBLIGATORIA/);
  assert.match(pedidos[1], /350|Roberto Salinas/, 'no le dijo qué había inventado');
});

test('si a la primera sale bien, no se gasta un segundo pedido', async () => {
  const { pedidos, intentos } = await correr([bueno]);
  assert.equal(pedidos.length, 1);
  assert.equal(intentos.n1.intentos, 1);
  assert.equal(intentos.n1.motivo, 'con cuerpo');
});

test('si el cuerpo falla las dos veces, la nota NO se publica sin cuerpo: queda esperando y se anota el intento', async () => {
  // Hasta el 25/09 se publicaba el título y la bajada con el cuerpo vacío.
  const { r, lineas, intentos } = await correr([conDatoInventado, conDatoInventado]);
  assert.equal(r.n1, undefined, 'se publicó una nota sin cuerpo');
  assert.equal(intentos.n1.intentos, 1);
  assert.match(intentos.n1.motivo, /cuerpo/);
  assert.ok(lineas.some((l) => /IA rechazada .* cuerpo/.test(l)), lineas.join('\n'));
});

test('si falla el titular, no se publica nada de la IA', async () => {
  const malo = { ...bueno, titulo: 'Roberto Salinas aprobó 350 multas' };
  const { r } = await correr([malo, malo]);
  assert.equal(r.n1, undefined);
});

test('un dato inventado en el cuerpo se va con SU oración, sin tirar el cuerpo entero ni gastar otro pedido', async () => {
  const conUnaMala = { ...bueno, cuerpo: `${CUERPO} La norma alcanza a 350 comercios y la impulsó Roberto Salinas.` };
  const { r, pedidos, lineas } = await correr([conUnaMala]);
  assert.equal(pedidos.length, 1, 'no hacía falta un segundo pedido');
  assert.ok(r.n1, 'se perdió la nota');
  assert.ok(!/350|Salinas/.test(r.n1.cuerpo));
  assert.ok(tieneCuerpo(r.n1));
  assert.ok(lineas.some((l) => /oraciones sacadas · nota n1 · 1 \(numero, nombre\)/.test(l)), lineas.join('\n'));
});

test('si al sacar las oraciones malas queda menos de 70 palabras, se pide de nuevo', async () => {
  const pocoYMalo = { ...bueno, cuerpo: 'Además de regular el estacionamiento, la ordenanza fija sanciones. La norma alcanza a 350 comercios.' };
  const { r, pedidos } = await correr([pocoYMalo, bueno]);
  assert.equal(pedidos.length, 2);
  assert.equal(r.n1.cuerpo, CUERPO);
});

test('un cuerpo corto (aunque no invente nada) pide otra vez, diciéndole que es obligatorio', async () => {
  const corto = { ...bueno, cuerpo: 'Además de regular dónde se puede dejar el auto en el centro, la ordenanza establece sanciones.' };
  const { r, pedidos } = await correr([corto, bueno]);
  assert.equal(pedidos.length, 2);
  assert.match(pedidos[1], /quedó corto \(\d+ palabras\)/);
  assert.equal(r.n1.cuerpo, CUERPO);
});

test('depurarCuerpo saca sólo las oraciones con problemas y conserva los párrafos', () => {
  const { cuerpo, sacadas } = depurarCuerpo(FUENTE, {
    copete: 'Otra cosa.',
    cuerpo: 'La ordenanza fija multas en la avenida principal. La firmó Roberto Salinas.\n\nEl estacionamiento en el centro queda ordenado. Alcanza a 350 comercios.',
  });
  assert.equal(cuerpo, 'La ordenanza fija multas en la avenida principal.\n\nEl estacionamiento en el centro queda ordenado.');
  assert.deepEqual(sacadas.map((s) => s.problemas[0].tipo), ['nombre', 'numero']);
});

test('depurarCuerpo saca el primer párrafo si repite la bajada', () => {
  const copete = 'El Concejo Deliberante aprobó la ordenanza de tránsito con el voto de la mayoría.';
  const { cuerpo } = depurarCuerpo(FUENTE, { copete, cuerpo: `${copete}\n\n${CUERPO}` });
  assert.equal(cuerpo, CUERPO);
});

// ---------------------------------------------------- el tope de intentos

test('cada nota se le pide a Gemini como mucho tres veces, en corridas distintas', async () => {
  assert.equal(MAXIMO_DE_INTENTOS, 3);
  const intentos = {};
  for (let i = 0; i < 4; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await correr([conDatoInventado, conDatoInventado], { intentos });
  }
  assert.equal(intentos.n1.intentos, 3, 'la cuarta corrida no tenía que pedir nada');
  const { pedidos, lineas } = await correr([bueno], { intentos });
  assert.equal(pedidos.length, 0);
  assert.ok(lineas.some((l) => /1 ya agotaron los 3 intentos/.test(l)), lineas.join('\n'));
});

test('el registro dice cuándo una nota agota los intentos, con el motivo', async () => {
  const intentos = { n1: { intentos: 2, ultimo: new Date().toISOString(), motivo: 'x' } };
  const { lineas } = await correr([conDatoInventado, conDatoInventado], { intentos });
  assert.ok(lineas.some((l) => /sin cuerpo después de 3 intentos, no se publica · nota n1 · cuerpo/.test(l)), lineas.join('\n'));
});

test('una falla del servicio (sin cupo, sin red) no cuenta como intento: no se gastó nada', async () => {
  const { intentos } = await correr([{ status: 503 }]);
  assert.equal(intentos.n1, undefined);
});

test('los intentos se podan a los siete días', () => {
  const ahora = Date.parse('2026-09-25T12:00:00Z');
  const podado = podarIntentos({
    vieja: { intentos: 1, ultimo: '2026-09-10T12:00:00Z' },
    nueva: { intentos: 2, ultimo: '2026-09-24T12:00:00Z' },
  }, ahora);
  assert.deepEqual(Object.keys(podado), ['nueva']);
});

// --------------------------------------------------------- el material

test('sin texto completo y con un resumen corto no se le pide nada a Gemini: cuenta como intento "sin material"', async () => {
  const { r, pedidos, intentos } = await correr([bueno], { minimoDeMaterial: 60 });
  assert.equal(pedidos.length, 0, 'se pagó un pedido sin material para escribir');
  assert.equal(r.n1, undefined);
  assert.equal(intentos.n1.motivo, 'sin material');
});

test('con el texto completo de la fuente sí hay material, y la IA lo recibe', async () => {
  const { r, pedidos } = await correr([bueno], { minimoDeMaterial: 60, traer: async () => TEXTO_COMPLETO });
  assert.equal(pedidos.length, 1);
  assert.match(pedidos[0], /Texto completo de la Fuente 1/);
  assert.ok(r.n1);
});

test('si el texto de la nota principal no se puede bajar, se usa el de otra fuente que contó lo mismo', async () => {
  const nota = {
    ...NOTA,
    origenes: [
      { medio: 'A', enlace: 'https://a/1', resumen: 'Uno.' },
      { medio: 'B', enlace: 'https://b/2', resumen: 'Dos.' },
    ],
    enlace: 'https://a/1',
  };
  const traer = async (url) => (url === 'https://b/2' ? TEXTO_COMPLETO : null);
  assert.deepEqual(await textoCompletoDe(nota, traer), { texto: TEXTO_COMPLETO, numero: 2 });
  const { pedidos } = await correr([bueno], { minimoDeMaterial: 60, traer, nota });
  assert.match(pedidos[0], /Texto completo de la Fuente 2/);
});

// ------------------------------------------------- la caché con cuerpo

test('lo que ya se reescribió CON cuerpo no se vuelve a pedir, aunque el texto original no esté a mano', async () => {
  const previas = { n1: { titulo: bueno.titulo, copete: bueno.copete, cuerpo: `${CUERPO} Un dato del texto completo: 350 comercios.`, guion: bueno.guion, deIA: true } };
  const { r, pedidos } = await correr([], { previas });
  assert.ok(r.n1, 'descartó una nota buena por no tener el texto completo en esta corrida');
  assert.equal(pedidos.length, 0);
});

test('lo que quedó publicado con el cuerpo vacío se vuelve a pedir', async () => {
  const previas = { n1: { titulo: bueno.titulo, copete: bueno.copete, cuerpo: '', guion: bueno.guion, deIA: true } };
  const { r, pedidos } = await correr([bueno], { previas });
  assert.equal(pedidos.length, 1);
  assert.equal(r.n1.cuerpo, CUERPO);
});

// ------------------------------------------------ la publicación y las redes

test('generar-datos no publica una nota automática sin cuerpo y cuenta las que esperan', () => {
  const g = leer('web/scripts/generar-datos.mjs');
  assert.match(g, /if \(!humana && !tieneCuerpo\(nota\)\) \{/);
  assert.match(g, /esperandoCuerpo: esperandoCuerpo\.length/);
  assert.match(g, /intentos,\n?\s*\}\);/, 'la reescritura recibe los intentos');
  assert.match(leer('.github/workflows/actualizar.yml'), /git add [^\n]*web\/data\/intentos-ia\.json/);
});

test('Facebook y los podcasts no toman una nota automática sin cuerpo', () => {
  const ahora = new Date('2026-09-25T15:00:00Z');
  const nota = {
    id: 'a', titulo: 'Una nota', seccion: 'Balcarce', relevancia: 99, como: 'automatica', cuerpo: '', fecha: new Date(ahora - 60 * 60e3).toISOString(),
  };
  assert.deepEqual(elegirParaFacebook({ notas: [nota], ahora }), []);
  assert.equal(sePuedeSola(nota), false);
  assert.equal(elegirParaFacebook({ notas: [{ ...nota, cuerpo: CUERPO }], ahora }).length, 1);
  assert.equal(sePuedeSola({ ...nota, como: 'publicada' }), true, 'lo que publicó una persona se respeta');
});

test('el resumen de las 21 dice cuántas notas esperan cuerpo', () => {
  const datos = datosDelDia({ ahora: new Date(), portada: { notas: [], pendientes: [], esperandoCuerpo: 4 }, libro: {} });
  assert.equal(datos.esperandoCuerpo, 4);
  assert.match(textoResumen({ datos }), /• Esperando cuerpo: 4/);
  assert.ok(!/Esperando cuerpo/.test(textoResumen({ datos: { ...datos, esperandoCuerpo: null } })));
});

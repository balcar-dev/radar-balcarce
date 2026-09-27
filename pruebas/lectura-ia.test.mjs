// La lectura con IA en prueba silenciosa (plan V2.2, ingesta/lectura-ia.mjs).
// Sin red: Gemini se simula. Lo que se cuida: que el pedido lleve el perfil de
// Balcarce y la ciudad del medio, que sólo quede lo que respeta las listas
// cerradas, que cada nota se lea una vez, que haya topes, que nunca se use la
// clave paga, y que no decida nada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  pedidoPara, entradaDeNota, fichaValida, leerNotasNuevas, compararConElSistema, podarFichas,
  comoFichasJson, LECTURA, ESQUEMA,
} from '../ingesta/lectura-ia.mjs';
import { claveClasificacion } from '../reels/claves.mjs';

const NECOCHEA = {
  id: 't3o3tt', titulo: 'Este viernes comienza la 58ª Invasión de Pueblos', medio: 'Ecos Diarios (Necochea)',
  resumenFuente: 'Participan jóvenes de Necochea, Balcarce y la región.', seccion: 'Cultura y agenda', local: false, semaforo: 'verde',
};
const DE_ACA = {
  id: 'abc', titulo: 'El Concejo aprueba el presupuesto', medio: 'El Diario Balcarce', resumenFuente: 'Sesión ordinaria.',
  seccion: 'Política', local: true, semaforo: 'verde',
};

const fichaDe = (id, extra = {}) => ({
  id, ambito: 'balcarce', lugar_del_hecho: 'Balcarce', seccion: 'Política', impacto_balcarce: 'directo', razon: 'local',
  importancia: 'media', es_publicidad: false, es_anuncio: false, por_que_interesa: 'Pasa en Balcarce.', clave_tema: 'presupuesto-concejo', ...extra,
});

/** Un Gemini de mentira que contesta lo que le digan y cuenta los pedidos. */
function geminiFalso(responder) {
  const pedidos = [];
  const fn = async (url, opciones) => {
    pedidos.push({ url, opciones, cuerpo: JSON.parse(opciones.body) });
    const r = responder(pedidos.length);
    if (r.status && r.status !== 200) return { ok: false, status: r.status, text: async () => 'error' };
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] }) };
  };
  return { fn, pedidos };
}

test('el pedido lleva el perfil de Balcarce, la ciudad del medio y sólo lo público de la nota', () => {
  const p = pedidoPara([NECOCHEA]);
  assert.match(p, /PERFIL DE BALCARCE/);
  assert.match(p, /Napaleofú/, 'el perfil tiene las localidades del partido');
  assert.match(p, /"ciudad_del_medio": "Necochea"/, 'la IA sabe que el medio es de Necochea');
  assert.match(p, /no la hace de Balcarce/, 'la regla de la mención al pasar');
  const e = entradaDeNota({ ...NECOCHEA, resumenFuente: 'x'.repeat(2000) });
  assert.equal(e.resumen.length, LECTURA.resumenMaximo, 'se manda un resumen corto, no el artículo');
  assert.deepEqual(Object.keys(e).sort(), ['ciudad_del_medio', 'id', 'medio', 'resumen', 'titulo']);
});

test('el esquema pide listas cerradas, y lo que no está en la lista se descarta', () => {
  assert.ok(ESQUEMA.items.properties.seccion.enum.includes('Balcarce'), 'Balcarce sigue siendo sección');
  assert.ok(fichaValida(fichaDe('a')));
  assert.equal(fichaValida(fichaDe('a', { seccion: 'Curiosidades' })), null, 'no inventa secciones');
  assert.equal(fichaValida(fichaDe('a', { ambito: 'mundo' })), null);
  assert.equal(fichaValida(null), null);
});

test('cada nota se lee una sola vez, de a grupos, y queda guardada', async () => {
  const { fn, pedidos } = geminiFalso(() => [fichaDe('abc'), fichaDe('t3o3tt', { ambito: 'region', impacto_balcarce: 'nulo', razon: 'ninguna' })]);
  const ahora = new Date('2026-09-27T15:00:00Z');
  const { archivo, cuenta } = await leerNotasNuevas([DE_ACA, NECOCHEA], { fetchFn: fn, ahora, clave: 'k' });
  assert.equal(cuenta.nuevas, 2);
  assert.equal(pedidos.length, 1, 'un pedido para las dos');
  assert.equal(pedidos[0].opciones.headers['x-goog-api-key'], 'k', 'la clave va en el encabezado');
  assert.ok(!pedidos[0].url.includes('k='), 'y nunca en la dirección');
  const otra = await leerNotasNuevas([DE_ACA, NECOCHEA], { fetchFn: fn, ahora, clave: 'k', guardado: archivo });
  assert.equal(pedidos.length, 1, 'lo que ya tiene ficha no se vuelve a pedir');
  assert.equal(otra.cuenta.pedidos, 0);
});

test('hay topes por corrida y por día, y sin cupo (429) se corta', async () => {
  const muchas = Array.from({ length: 200 }, (_, i) => ({ ...DE_ACA, id: `n${i}` }));
  const { fn, pedidos } = geminiFalso(() => []);
  const ahora = new Date('2026-09-27T15:00:00Z');
  await leerNotasNuevas(muchas, { fetchFn: fn, ahora, clave: 'k' });
  assert.equal(pedidos.length, LECTURA.pedidosPorCorrida);
  const lleno = { dia: '2026-09-27', pedidosHoy: LECTURA.pedidosPorDia, fichas: {} };
  const r = await leerNotasNuevas(muchas, { fetchFn: fn, ahora, clave: 'k', guardado: lleno });
  assert.equal(r.cuenta.pedidos, 0, 'con el tope del día lleno no se pide nada');
  const sinCupo = geminiFalso(() => ({ status: 429 }));
  const s = await leerNotasNuevas(muchas, { fetchFn: sinCupo.fn, ahora, clave: 'k' });
  assert.equal(sinCupo.pedidos.length, 1, 'con 429 no se insiste');
  assert.equal(s.cuenta.fallas, 1);
});

test('la clave de clasificación: la propia o la gratis de redacción, nunca la paga de redes', () => {
  const sinArchivo = { archivo: '/no/existe/.env' };
  assert.equal(claveClasificacion({ ...sinArchivo, env: { GEMINI_API_KEY_CLASIFICACION: 'c', GEMINI_API_KEY_REDACCION: 'r' } }), 'c');
  assert.equal(claveClasificacion({ ...sinArchivo, env: { GEMINI_API_KEY_REDACCION: 'r', GEMINI_API_KEY_REDES: 'paga' } }), 'r');
  assert.equal(claveClasificacion({ ...sinArchivo, env: { GEMINI_API_KEY_REDES: 'paga' } }), null);
});

test('la prueba silenciosa compara y cuenta, pero no toca las notas', () => {
  const fichas = {
    t3o3tt: { ...fichaValida(fichaDe('t3o3tt', { ambito: 'region', seccion: 'Cultura y agenda', impacto_balcarce: 'nulo', razon: 'ninguna' })) },
    abc: fichaValida(fichaDe('abc')),
  };
  const antes = JSON.stringify([DE_ACA, { ...NECOCHEA, local: true }]);
  const notas = JSON.parse(antes);
  const c = compararConElSistema(notas, fichas);
  assert.equal(c.comparadas, 2);
  assert.deepEqual(c.noEsDeBalcarce.map((x) => x.id), ['t3o3tt'], 'la IA dice que lo de Necochea no es de acá');
  assert.deepEqual(c.noInteresa.map((x) => x.id), ['t3o3tt']);
  assert.equal(JSON.stringify(notas), antes, 'no cambió ninguna nota');
});

test('las fichas viejas se podan y el archivo se escribe una línea por ficha', () => {
  const guardado = { fichas: { vieja: { cuando: '2026-09-20T10:00:00Z' }, nueva: { cuando: '2026-09-27T10:00:00Z' } } };
  const p = podarFichas(guardado, { ahora: Date.parse('2026-09-27T15:00:00Z') });
  assert.deepEqual(Object.keys(p.fichas), ['nueva']);
  const texto = comoFichasJson({ dia: '2026-09-27', pedidosHoy: 3, ...p });
  assert.deepEqual(JSON.parse(texto).fichas, p.fichas);
  // El archivo del repositorio existe y se lee (el workflow lo suma con git add).
  assert.ok(JSON.parse(fs.readFileSync(new URL('../web/data/fichas.json', import.meta.url), 'utf8')).fichas);
});

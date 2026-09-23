// La reescritura editorial por IA: qué tono le toca a cada nota, que cruce
// varias fuentes en vez de repetir una, y que no se quede sin reescribir
// sólo porque la clave gratis se quedó sin cupo.
//
// Nada de esto toca la red: el fetch es de mentira.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  esTemaSerio, reescribir, reescribirConRespaldo, reescribirAutomaticas,
} from '../reels/reescritura.mjs';

// claveRedaccion()/claveRedes() leen de process.env primero: alcanza con
// ponerlas acá, sin tocar ningún .env real.
before(() => {
  process.env.GEMINI_API_KEY_REDACCION = 'clave-redaccion-de-prueba';
  process.env.GEMINI_API_KEY_REDES = 'clave-redes-de-prueba';
});
after(() => {
  delete process.env.GEMINI_API_KEY_REDACCION;
  delete process.env.GEMINI_API_KEY_REDES;
});

/** Un fetch de mentira: contesta lo que se le diga y anota qué se le pidió. */
function fetchFalso(respuestas) {
  const pedidos = [];
  const fn = async (url, init) => {
    pedidos.push({ url: String(url), init });
    const r = respuestas.shift();
    if (r.lanza) throw new Error(r.lanza);
    return {
      ok: r.ok ?? true,
      status: r.status ?? 200,
      json: async () => r.json,
      text: async () => JSON.stringify(r.json ?? {}),
    };
  };
  return { fn, pedidos };
}

const respuestaOk = (titulo, copete, guion) => ({
  json: { candidates: [{ content: { parts: [{ text: JSON.stringify({ titulo, copete, guion }) }] } }] },
});

// ---------------------------------------------------------------- el tono

test('Policiales siempre pide el tono serio', () => {
  assert.ok(esTemaSerio({ seccion: 'Policiales', titulo: 'Un robo cualquiera' }));
});

test('una palabra de problemática pide el tono serio aunque la sección no sea Policiales', () => {
  assert.ok(esTemaSerio({ seccion: 'Balcarce', titulo: 'Vecinos denuncian inseguridad en el barrio' }));
  assert.ok(esTemaSerio({ seccion: 'Servicios', titulo: 'Corte de luz previsto para mañana' }));
});

test('una noticia común usa el tono de todos los días', () => {
  assert.ok(!esTemaSerio({ seccion: 'Automovilismo', titulo: 'Ganó el piloto local en el autódromo' }));
});

// ------------------------------------------------------------ reescribir()

test('reescribe con la clave gratis y no toca la paga si anduvo', async () => {
  const { fn, pedidos } = fetchFalso([respuestaOk('Título nuevo', 'Copete nuevo.', 'Título nuevo.')]);
  const r = await reescribir(
    { titulo: 'Original', resumenFuente: 'Pasó tal cosa.', seccion: 'Balcarce', medios: ['El Diario'] },
    { fetchFn: fn },
  );
  assert.equal(r.titulo, 'Título nuevo');
  assert.equal(r.deIA, true);
  assert.equal(pedidos.length, 1);
  assert.ok(pedidos[0].url.includes('clave-redaccion-de-prueba'));
});

test('si hay más de una fuente, se le manda cada una por separado, no sólo la principal', async () => {
  const { fn, pedidos } = fetchFalso([respuestaOk('T', 'C', 'T')]);
  await reescribir(
    {
      titulo: 'Original', resumenFuente: 'Versión del medio 1.', seccion: 'Deportes', medios: ['A', 'B'],
      fuentesTexto: ['Versión del medio 2.', 'Versión del medio 3.'],
    },
    { fetchFn: fn },
  );
  const cuerpo = JSON.parse(pedidos[0].init.body);
  const texto = cuerpo.contents[0].parts[0].text;
  assert.match(texto, /Versión del medio 1\./);
  assert.match(texto, /Versión del medio 2\./);
  assert.match(texto, /Versión del medio 3\./);
});

test('si la clave gratis dice "sin cupo" (429), reintenta con la paga', async () => {
  const { fn, pedidos } = fetchFalso([
    { ok: false, status: 429, json: { error: 'sin cupo' } },
    respuestaOk('Título pagado', 'Copete.', 'Título pagado.'),
  ]);
  const r = await reescribir(
    { titulo: 'Original', resumenFuente: 'Pasó tal cosa.', seccion: 'Balcarce', medios: ['El Diario'] },
    { fetchFn: fn },
  );
  assert.equal(r.titulo, 'Título pagado');
  assert.equal(pedidos.length, 2);
  assert.ok(pedidos[0].url.includes('clave-redaccion-de-prueba'));
  assert.ok(pedidos[1].url.includes('clave-redes-de-prueba'));
});

test('un error que no es de cupo no reintenta con la clave paga', async () => {
  const { fn, pedidos } = fetchFalso([{ ok: false, status: 400, json: { error: 'pedido mal armado' } }]);
  await assert.rejects(() => reescribir(
    { titulo: 'Original', resumenFuente: 'Pasó tal cosa.', seccion: 'Balcarce', medios: ['El Diario'] },
    { fetchFn: fn },
  ));
  assert.equal(pedidos.length, 1, 'no debería haber un segundo pedido con la otra clave');
});

test('reescribirConRespaldo cae al armado mecánico si la IA falla del todo', async () => {
  const { fn } = fetchFalso([{ lanza: 'sin red' }]);
  const mecanico = (n) => ({ titulo: n.titulo, copete: n.resumenFuente, guion: `${n.titulo}.` });
  const r = await reescribirConRespaldo(
    { titulo: 'Original', resumenFuente: 'Pasó tal cosa.', seccion: 'Balcarce', medios: ['El Diario'] },
    mecanico,
    { fetchFn: fn },
  );
  assert.equal(r.deIA, false);
  assert.equal(r.titulo, 'Original');
  assert.ok(r.motivoRespaldo);
});

// ------------------------------------------------------- reescribirAutomaticas()

const notaVerde = (extra = {}) => ({
  id: 'n1', titulo: 'Se realizó una reunión en el municipio', resumenFuente: 'Hubo una reunión en el municipio por el tema del agua.',
  seccion: 'Balcarce', medios: ['El Diario'], semaforo: 'verde', relevancia: 80, ...extra,
});

test('no toca una nota que ya decidió una persona', async () => {
  const { fn, pedidos } = fetchFalso([]);
  const r = await reescribirAutomaticas([notaVerde()], {
    decisiones: { n1: { por: 'hernan', estado: 'publicada' } },
    opciones: { fetchFn: fn },
  });
  assert.deepEqual(r, {});
  assert.equal(pedidos.length, 0);
});

test('no toca una nota que no es verde', async () => {
  const { fn, pedidos } = fetchFalso([]);
  const r = await reescribirAutomaticas([notaVerde({ semaforo: 'amarillo' })], { opciones: { fetchFn: fn } });
  assert.deepEqual(r, {});
  assert.equal(pedidos.length, 0);
});

test('reusa lo ya reescrito en una corrida anterior, sin gastar un pedido', async () => {
  const { fn, pedidos } = fetchFalso([]);
  const previas = { n1: { titulo: 'Ya reescrito', copete: 'Ya.', guion: 'Ya reescrito.', deIA: true } };
  const r = await reescribirAutomaticas([notaVerde()], { previas, opciones: { fetchFn: fn } });
  assert.equal(r.n1.titulo, 'Ya reescrito');
  assert.equal(pedidos.length, 0);
});

test('reescribe una nota nueva y la deja si la verificación no encuentra nada raro', async () => {
  const { fn } = fetchFalso([respuestaOk(
    'El municipio se reunió por el agua',
    'Se trató el tema del agua en una reunión municipal.',
    'El municipio se reunió por el agua.',
  )]);
  const r = await reescribirAutomaticas([notaVerde()], { opciones: { fetchFn: fn } });
  assert.equal(r.n1.deIA, true);
  assert.equal(r.n1.titulo, 'El municipio se reunió por el agua');
});

test('si la IA inventa un dato que la fuente no trae, se descarta y no queda nada', async () => {
  const { fn } = fetchFalso([respuestaOk(
    'Veinte vecinos participaron de la reunión',
    'Veinte vecinos se reunieron con el municipio por el agua.',
    'Veinte vecinos participaron de la reunión.',
  )]);
  const r = await reescribirAutomaticas([notaVerde()], { opciones: { fetchFn: fn } });
  assert.equal(r.n1, undefined, 'un dato inventado no debería quedar publicado');
});

test('no pasa del tope de pedidos nuevos por corrida, pero igual reusa lo que ya está en caché', async () => {
  const { fn, pedidos } = fetchFalso([respuestaOk('Título nuevo', 'Copete nuevo.', 'Título nuevo.')]);
  const notas = [notaVerde({ id: 'nuevo', relevancia: 90 }), notaVerde({ id: 'n1', relevancia: 50 })];
  const previas = { n1: { titulo: 'Cacheada', copete: 'C.', guion: 'Cacheada.', deIA: true } };
  const r = await reescribirAutomaticas(notas, { previas, tope: 1, opciones: { fetchFn: fn } });
  assert.equal(pedidos.length, 1, 'sólo un pedido nuevo, por el tope');
  assert.equal(r.nuevo.titulo, 'Título nuevo');
  assert.equal(r.n1.titulo, 'Cacheada', 'la que ya estaba en caché se reusa igual, sin contar contra el tope');
});

test('lo que ya estaba en caché se revalida: si ahora no pasa la verificación, se descarta', async () => {
  // Simula que ayer se aceptó algo que la regla de hoy (una nueva en
  // verificar.mjs) ya no dejaría pasar: no debería quedar publicado para
  // siempre sólo porque "ya estaba hecho".
  const { fn, pedidos } = fetchFalso([]);
  const previas = { n1: { titulo: 'Un título cualquiera', copete: 'Lo esperaban ms de tres mil personas.', guion: 'Un título cualquiera.', deIA: true } };
  const r = await reescribirAutomaticas([notaVerde()], { previas, opciones: { fetchFn: fn } });
  assert.equal(r.n1, undefined, 'lo cacheado que ya no pasa la verificación no debería reusarse');
  assert.equal(pedidos.length, 0, 'tampoco debería gastar un pedido nuevo en la misma corrida');
});

test('lo que ya estaba en caché y sigue pasando la verificación se reusa igual', () => {
  const { fn, pedidos } = fetchFalso([]);
  const previas = { n1: { titulo: 'Un título cualquiera', copete: 'Se hizo una reunión por el agua.', guion: 'Un título cualquiera.', deIA: true } };
  return reescribirAutomaticas([notaVerde()], { previas, opciones: { fetchFn: fn } }).then((r) => {
    assert.equal(r.n1.titulo, 'Un título cualquiera');
    assert.equal(pedidos.length, 0);
  });
});

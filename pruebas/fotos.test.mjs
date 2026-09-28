// La comparación de fotos con IA (ingesta/fotos.mjs): primer paso del banco
// de fotos propio (CRITERIO-EDITORIAL.md, "Las fotos"). Sin red: todo con
// fetchFn de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  imagenPrincipalDe, candidatasDeNota, descargarImagen, candidatasConDatos, elegirFoto,
} from '../ingesta/fotos.mjs';

test('imagenPrincipalDe lee el og:image, con orden de atributos distinto, y si no hay, el twitter:image', () => {
  assert.equal(imagenPrincipalDe('<meta property="og:image" content="https://a.com/1.jpg">'), 'https://a.com/1.jpg');
  assert.equal(imagenPrincipalDe('<meta content="https://a.com/2.jpg" property="og:image">'), 'https://a.com/2.jpg');
  assert.equal(imagenPrincipalDe('<meta name="twitter:image" content="https://a.com/3.jpg">'), 'https://a.com/3.jpg');
  assert.equal(imagenPrincipalDe('<html>sin nada</html>'), null);
});

test('candidatasDeNota trae la imagen de cada fuentesConsultadas, y sigue si una falla', async () => {
  const nota = {
    titulo: 'x',
    fuentesConsultadas: [
      { medio: 'A', enlace: 'https://a.com/nota' },
      { medio: 'B', enlace: 'https://b.com/nota' },
      { medio: 'C', enlace: 'https://c.com/nota' },
    ],
  };
  const fetchFn = async (url) => {
    if (url === 'https://a.com/nota') return { ok: true, text: async () => '<meta property="og:image" content="https://a.com/foto.jpg">' };
    if (url === 'https://b.com/nota') return { ok: false, status: 404 };
    if (url === 'https://c.com/nota') throw new Error('se cayó');
  };
  const candidatas = await candidatasDeNota(nota, { fetchFn });
  assert.equal(candidatas.length, 3);
  assert.equal(candidatas[0].imagen, 'https://a.com/foto.jpg');
  assert.equal(candidatas[1].imagen, null);
  assert.match(candidatas[1].error, /404/);
  assert.equal(candidatas[2].imagen, null);
  assert.match(candidatas[2].error, /se cayó/);
});

test('candidatasDeNota usa el único medio de una nota sin fuentesConsultadas', async () => {
  const nota = { titulo: 'x', medios: ['Solo'], enlace: 'https://solo.com/nota' };
  const fetchFn = async () => ({ ok: true, text: async () => '<meta property="og:image" content="https://solo.com/f.jpg">' });
  const candidatas = await candidatasDeNota(nota, { fetchFn });
  assert.deepEqual(candidatas, [{ medio: 'Solo', enlace: 'https://solo.com/nota', imagen: 'https://solo.com/f.jpg' }]);
});

test('descargarImagen rechaza lo que no sea imagen y lo que pese de más', async () => {
  const chica = Buffer.from('foto');
  const grande = Buffer.alloc(7 * 1024 * 1024);
  const casos = {
    'https://a.com/ok.jpg': { ok: true, headers: new Map([['content-type', 'image/jpeg']]), arrayBuffer: async () => chica },
    'https://a.com/html.html': { ok: true, headers: new Map([['content-type', 'text/html']]), arrayBuffer: async () => chica },
    'https://a.com/grande.jpg': { ok: true, headers: new Map([['content-type', 'image/jpeg']]), arrayBuffer: async () => grande },
    'https://a.com/404.jpg': { ok: false },
  };
  const fetchFn = async (url) => ({ ...casos[url], headers: { get: (k) => casos[url].headers.get(k) } });
  assert.deepEqual(await descargarImagen('https://a.com/ok.jpg', { fetchFn }), { mime: 'image/jpeg', base64: chica.toString('base64') });
  assert.equal(await descargarImagen('https://a.com/html.html', { fetchFn }), null);
  assert.equal(await descargarImagen('https://a.com/grande.jpg', { fetchFn }), null);
  assert.equal(await descargarImagen('https://a.com/404.jpg', { fetchFn }), null);
});

test('candidatasConDatos junta la dirección de la imagen con sus bytes', async () => {
  const nota = { titulo: 'x', fuentesConsultadas: [{ medio: 'A', enlace: 'https://a.com/n' }] };
  const fetchFn = async (url) => {
    if (url === 'https://a.com/n') return { ok: true, text: async () => '<meta property="og:image" content="https://a.com/f.jpg">' };
    if (url === 'https://a.com/f.jpg') {
      return { ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => Buffer.from('abc') };
    }
  };
  const [c] = await candidatasConDatos(nota, { fetchFn });
  assert.equal(c.medio, 'A');
  assert.deepEqual(c.datos, { mime: 'image/jpeg', base64: Buffer.from('abc').toString('base64') });
});

// Para elegirFoto no hace falta bajar de verdad: se arman candidatas ya con
// `datos`, como si `candidatasConDatos` ya hubiera corrido.
const conDatos = (letras) => letras.map((medio, i) => ({
  medio, enlace: `https://${medio}.com`, imagen: `https://${medio}.com/f.jpg`,
  datos: { mime: 'image/jpeg', base64: `foto-${i}` },
}));

function fetchGemini(respuesta, { falla } = {}) {
  return async (url) => {
    assert.match(url, /generativelanguage\.googleapis\.com/);
    if (falla) return { ok: false, status: falla };
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(respuesta) }] } }] }) };
  };
}

test('elegirFoto: Gemini elige una candidata sin marca', async () => {
  const nota = { titulo: 't', seccion: 'Automovilismo' };
  const candidatas = conDatos(['ElDiario', 'Campeones']);
  const fetchFn = fetchGemini({
    elegida: 'B', razon: 'mejor encuadre',
    fotos: [{ letra: 'A', tiene_marca: false }, { letra: 'B', tiene_marca: false }],
  });
  const r = await elegirFoto(nota, candidatas, { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(r.proveedor, 'gemini');
  assert.equal(r.elegida.medio, 'Campeones');
  assert.equal(r.razon, 'mejor encuadre');
});

test('elegirFoto: si la IA marca la elegida con marca de agua, no se elige ninguna', async () => {
  const nota = { titulo: 't', seccion: 'Balcarce' };
  const candidatas = conDatos(['Local1', 'Local2']);
  const fetchFn = fetchGemini({
    elegida: 'A', razon: 'la mejor',
    fotos: [{ letra: 'A', tiene_marca: true, detalle: 'logo abajo a la derecha' }, { letra: 'B', tiene_marca: false }],
  });
  const r = await elegirFoto(nota, candidatas, { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(r.elegida, null);
  assert.equal(r.candidatas[0].sospechaMarca, true);
});

test('elegirFoto: si Gemini falla, prueba con Groq', async () => {
  const nota = { titulo: 't', seccion: 'Fútbol' };
  const candidatas = conDatos(['A', 'B']);
  let llamoGroq = false;
  const fetchFn = async (url, init) => {
    if (String(url).includes('generativelanguage')) return { ok: false, status: 429 };
    llamoGroq = true;
    assert.match(url, /api\.groq\.com/);
    assert.equal(init.headers.authorization, 'Bearer r');
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ elegida: 'A', razon: 'ok', fotos: [{ letra: 'A', tiene_marca: false }, { letra: 'B', tiene_marca: false }] }) } }],
      }),
    };
  };
  const r = await elegirFoto(nota, candidatas, { clave: 'g', claveRespaldo: 'r', fetchFn });
  assert.equal(llamoGroq, true);
  assert.equal(r.proveedor, 'groq');
  assert.equal(r.elegida.medio, 'A');
});

test('elegirFoto: sin fotos que comparar, no llama a nadie', async () => {
  const nota = { titulo: 't' };
  const candidatas = [{ medio: 'A', enlace: 'x', imagen: null, datos: null }];
  const r = await elegirFoto(nota, candidatas, { clave: 'g', claveRespaldo: 'r', fetchFn: async () => { throw new Error('no debería llamarse'); } });
  assert.equal(r.elegida, null);
  assert.match(r.razon, /sin fotos/);
});

test('elegirFoto: sin ninguna clave, lo dice y no llama a nadie', async () => {
  const nota = { titulo: 't' };
  const candidatas = conDatos(['A']);
  const r = await elegirFoto(nota, candidatas, { clave: null, claveRespaldo: null, fetchFn: async () => { throw new Error('no debería llamarse'); } });
  assert.equal(r.elegida, null);
  assert.match(r.razon, /sin clave/);
});

// La comparación de fotos con IA (ingesta/fotos.mjs): primer paso del banco
// de fotos propio (CRITERIO-EDITORIAL.md, "Las fotos"). Sin red: todo con
// fetchFn de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  imagenPrincipalDe, candidatasDeNota, descargarImagen, candidatasConDatos, elegirFoto,
  personaPublicaDeNota, buscarFotoWikimedia, elegirFotoParaNota,
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

test('elegirFoto: si la IA elige (mal) la marcada, usa la otra sin marca en su lugar (28/09, Hernán: "aunque no sea la ideal")', async () => {
  const nota = { titulo: 't', seccion: 'Balcarce' };
  const candidatas = conDatos(['Local1', 'Local2']);
  const fetchFn = fetchGemini({
    elegida: 'A', razon: 'la mejor',
    fotos: [{ letra: 'A', tiene_marca: true, detalle: 'logo abajo a la derecha' }, { letra: 'B', tiene_marca: false }],
  });
  const r = await elegirFoto(nota, candidatas, { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(r.elegida.medio, 'Local2');
  assert.equal(r.candidatas[0].sospechaMarca, true);
  // La "razon" no puede quedar como si la marcada se hubiera elegido (pasó
  // de verdad el 28/09, con la foto del papa León XIV y el logo de ANDigital).
  assert.match(r.razon, /Local1/);
  assert.match(r.razon, /marca de agua/);
  assert.match(r.razon, /logo abajo a la derecha/);
  assert.match(r.razon, /Local2/);
  assert.doesNotMatch(r.razon, /^la mejor$/);
});

test('elegirFoto: si TODAS tienen marca, ahí sí no se elige ninguna', async () => {
  const nota = { titulo: 't', seccion: 'Balcarce' };
  const candidatas = conDatos(['Local1', 'Local2']);
  const fetchFn = fetchGemini({
    elegida: 'A', razon: 'la mejor de las dos',
    fotos: [{ letra: 'A', tiene_marca: true, detalle: 'logo A' }, { letra: 'B', tiene_marca: true, detalle: 'logo B' }],
  });
  const r = await elegirFoto(nota, candidatas, { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(r.elegida, null);
  assert.match(r.razon, /ninguna de las otras sirve: no se elige ninguna/);
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

test('elegirFoto: a Groq nunca le manda más de 3 fotos (límite documentado de Groq, 28/09)', async () => {
  const nota = { titulo: 't', seccion: 'Balcarce' };
  const candidatas = conDatos(['A', 'B', 'C', 'D', 'E']);
  let imagenesEnviadas = null;
  const fetchFn = async (url, init) => {
    if (String(url).includes('generativelanguage')) return { ok: false, status: 429 };
    const body = JSON.parse(init.body);
    imagenesEnviadas = body.messages[0].content.filter((c) => c.type === 'image_url').length;
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({ elegida: 'A', razon: 'ok', fotos: [{ letra: 'A', tiene_marca: false }, { letra: 'B', tiene_marca: false }, { letra: 'C', tiene_marca: false }] }) } }] }),
    };
  };
  const r = await elegirFoto(nota, candidatas, { clave: 'g', claveRespaldo: 'r', fetchFn });
  assert.equal(imagenesEnviadas, 3);
  assert.equal(r.candidatas.length, 3, 'el reporte cubre sólo las que de verdad se compararon');
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

// --------------------------------------- persona pública y Wikimedia (28/09)

function fetchGeminiTexto(respuesta) {
  return async (url) => {
    assert.match(url, /generativelanguage\.googleapis\.com/);
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(respuesta) }] } }] }) };
  };
}

test('personaPublicaDeNota: devuelve el nombre que contesta la IA', async () => {
  const nota = { titulo: 'Mariano Werner lidera la clasificación del TC Pick Up', copete: '' };
  const fetchFn = fetchGeminiTexto({ persona: 'Mariano Werner' });
  assert.equal(await personaPublicaDeNota(nota, { clave: 'g', fetchFn }), 'Mariano Werner');
});

test('personaPublicaDeNota: null si la IA dice null, si falla, o si no hay clave', async () => {
  const nota = { titulo: 'El Concejo aprueba el presupuesto 2027' };
  assert.equal(await personaPublicaDeNota(nota, { clave: 'g', fetchFn: fetchGeminiTexto({ persona: null }) }), null);
  assert.equal(await personaPublicaDeNota(nota, { clave: 'g', fetchFn: async () => ({ ok: false, status: 500 }) }), null);
  assert.equal(await personaPublicaDeNota(nota, { clave: null, fetchFn: async () => { throw new Error('no debería llamarse'); } }), null);
});

const paginaWikimedia = (props) => ({ 1: { imageinfo: [{ mime: 'image/jpeg', width: 1200, height: 800, url: 'https://upload.wikimedia.org/f.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:F.jpg', extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' } }, ...props }] } });

test('buscarFotoWikimedia: acepta una licencia libre, de tamaño razonable', async () => {
  const fetchFn = async (url) => {
    assert.match(url, /commons\.wikimedia\.org/);
    assert.match(url, /Mariano%20Werner|Mariano\+Werner/);
    return { ok: true, json: async () => ({ query: { pages: paginaWikimedia({}) } }) };
  };
  const r = await buscarFotoWikimedia('Mariano Werner', { fetchFn });
  assert.equal(r.medio, 'Wikimedia Commons');
  assert.equal(r.imagen, 'https://upload.wikimedia.org/f.jpg');
  assert.equal(r.licencia, 'CC BY-SA 4.0');
});

test('buscarFotoWikimedia: rechaza licencias que no son libres, imágenes chicas, y SVG (logos)', async () => {
  const casos = [
    { query: { pages: paginaWikimedia({ extmetadata: { LicenseShortName: { value: 'All rights reserved' } } }) } },
    { query: { pages: paginaWikimedia({ width: 100, height: 80 }) } },
    { query: { pages: paginaWikimedia({ mime: 'image/svg+xml' }) } },
    { query: { pages: {} } },
  ];
  for (const j of casos) {
    const r = await buscarFotoWikimedia('X', { fetchFn: async () => ({ ok: true, json: async () => j }) });
    assert.equal(r, null);
  }
  assert.equal(await buscarFotoWikimedia('X', { fetchFn: async () => ({ ok: false }) }), null);
  assert.equal(await buscarFotoWikimedia('X', { fetchFn: async () => { throw new Error('caído'); } }), null);
});

test('elegirFotoParaNota: si una fuente sirve, ni pregunta por la persona pública', async () => {
  const nota = { titulo: 't', seccion: 'Automovilismo' };
  let preguntoPersona = false;
  const fetchFn = async (url, init) => {
    if (String(url).includes('generativelanguage')) {
      const body = JSON.parse(init.body);
      if (body.contents[0].parts.length === 1) preguntoPersona = true; // sin imágenes: sería el pedido de persona
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ elegida: 'A', razon: 'sirve', fotos: [{ letra: 'A', tiene_marca: false }] }) }] } }] }) };
    }
    if (url === 'https://a.com/n') return { ok: true, text: async () => '<meta property="og:image" content="https://a.com/f.jpg">' };
    if (url === 'https://a.com/f.jpg') return { ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => Buffer.from('abc') };
  };
  const nota2 = { ...nota, fuentesConsultadas: [{ medio: 'A', enlace: 'https://a.com/n' }] };
  const r = await elegirFotoParaNota(nota2, { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(r.origen, 'medio');
  assert.equal(r.elegida.medio, 'A');
  assert.equal(preguntoPersona, false);
});

test('elegirFotoParaNota: sin foto de fuente, prueba Wikimedia si hay una persona pública clara', async () => {
  const nota = { titulo: 'Mariano Werner lidera la clasificación del TC Pick Up', seccion: 'Automovilismo', fuentesConsultadas: [] };
  const fetchFn = async (url) => {
    if (String(url).includes('generativelanguage')) return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ persona: 'Mariano Werner' }) }] } }] }) };
    if (String(url).includes('commons.wikimedia.org')) return { ok: true, json: async () => ({ query: { pages: paginaWikimedia({}) } }) };
  };
  const r = await elegirFotoParaNota(nota, { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(r.origen, 'wikimedia');
  assert.equal(r.elegida.medio, 'Wikimedia Commons');
  assert.match(r.razon, /Mariano Werner/);
  assert.match(r.razon, /Wikimedia/);
});

test('elegirFotoParaNota: sin foto de fuente y sin persona pública clara, no elige ninguna', async () => {
  const nota = { titulo: 'El Concejo aprueba el presupuesto 2027', seccion: 'Política', fuentesConsultadas: [] };
  const fetchFn = async (url) => {
    if (String(url).includes('generativelanguage')) return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ persona: null }) }] } }] }) };
    throw new Error('no debería buscar en Wikimedia sin persona');
  };
  const r = await elegirFotoParaNota(nota, { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(r.origen, 'ninguna');
  assert.equal(r.elegida, null);
});

// ------------- 28/09: el nombre de otro medio en la escena y los menores
// Caso real: la nota de Reino sobre el Fangio salió con la foto de La Vanguardia
// donde se leía el micrófono de "Radio Líder 90.9". La IA la dejó pasar porque
// la instrucción decía que un logo "de la escena" no es marca. Y el banco tenía
// fotos de equipos de chicas (U15, hockey) con las caras a la vista.

test('la instrucción de fotos pide descartar el nombre de otro medio aunque esté en la escena, y a los menores', async () => {
  let pedido = '';
  const fetchFn = async (url, opciones) => {
    pedido = JSON.parse(opciones.body).contents[0].parts[0].text;
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ elegida: null, razon: 'x', fotos: [] }) }] } }] }) };
  };
  await elegirFoto({ titulo: 'Reino destaca el éxito del regreso automovilístico al Fangio', seccion: 'Balcarce' },
    conDatos(['Diario La Vanguardia']), { clave: 'g', claveRespaldo: null, fetchFn });
  assert.match(pedido, /OTRO MEDIO DE\s+COMUNICACIÓN/);
  assert.match(pedido, /micrófono con el nombre de una radio/);
  assert.match(pedido, /MENOR DE 18 AÑOS/);
  assert.match(pedido, /"menor": false/);
});

test('elegirFoto: una foto con un menor nunca es la elegida, aunque la IA la prefiera', async () => {
  const candidatas = conDatos(['Infoeme', 'Municipio']);
  const fetchFn = fetchGemini({
    elegida: 'A', razon: 'la mejor',
    fotos: [{ letra: 'A', tiene_marca: false, menor: true, detalle: 'equipo U15 con las caras a la vista' }, { letra: 'B', tiene_marca: false, menor: false }],
  });
  const r = await elegirFoto({ titulo: 'La Selección U15 femenina gana la copa', seccion: 'Deportes' }, candidatas, { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(r.elegida.medio, 'Municipio');
  assert.equal(r.candidatas[0].sospechaMenor, true);
});

test('elegirFoto: si la única foto muestra el nombre de otro medio, no se elige ninguna (Reino, 28/09)', async () => {
  const fetchFn = fetchGemini({
    elegida: 'A', razon: 'la única',
    fotos: [{ letra: 'A', tiene_marca: true, menor: false, detalle: 'micrófono de Radio Líder 90.9 a la derecha' }],
  });
  const r = await elegirFoto({ titulo: 'Reino destaca el éxito del regreso automovilístico al Fangio', seccion: 'Balcarce' },
    conDatos(['Diario La Vanguardia']), { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(r.elegida, null);
  assert.match(r.razon, /Radio Líder/);
});

// Fotos de stock libres para las notas sin foto (15/10/2026): el módulo ingesta/foto-stock.mjs, todavía sin conectar a nada y apagado. Sin red:
// todas las respuestas de Commons, Pexels, Unsplash, Pixabay, Gemini y Groq son simuladas.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  fotoStockActiva, proveedoresDisponibles, evaluarNota, nombresDePersona, armarConsultas, puntuarCandidata,
  buscarEnCommons, buscarEnPexels, buscarEnUnsplash, buscarEnPixabay, avisarDescargaUnsplash,
  candidatasDeStock, interpretarConfirmacion, confirmarConIA, elegirFotoStock, creditoDeStock, entradaDeBancoStock, yaUsadasEnElBanco,
  UMBRAL, ANCHO_MINIMO, TOPE_GENERICA, TEMAS,
} from '../ingesta/foto-stock.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const SIN_ENV = {}; // un entorno vacío: nunca se lee el .env de verdad en estas pruebas

const nota = (titulo, seccion, extra = {}) => ({ id: 'n1', titulo, seccion, copete: '', etiquetas: [], ...extra });

// ------------------------------------------------------------- el interruptor

test('el interruptor viene apagado y sólo "Si" lo prende', () => {
  assert.equal(fotoStockActiva({ env: SIN_ENV }), false);
  assert.equal(fotoStockActiva({ env: { FOTO_STOCK_ACTIVA: 'No' } }), false);
  assert.equal(fotoStockActiva({ env: { FOTO_STOCK_ACTIVA: '1' } }), false);
  assert.equal(fotoStockActiva({ env: { FOTO_STOCK_ACTIVA: 'Si' } }), true);
  assert.equal(fotoStockActiva({ env: { FOTO_STOCK_ACTIVA: 'sí' } }), true);
});

test('apagado, elegirFotoStock no hace ni un pedido', async () => {
  const fetchFn = async () => { throw new Error('no debería haber red'); };
  const r = await elegirFotoStock(nota('El Cementerio Municipal actualiza sus horarios', 'Balcarce'), { env: SIN_ENV, fetchFn });
  assert.equal(r.elegida, null);
  assert.equal(r.apagado, true);
});

test('las claves de los proveedores: Commons siempre, el resto sólo si hay clave; nunca se devuelven los valores', () => {
  assert.deepEqual(proveedoresDisponibles({ env: SIN_ENV }), ['commons']);
  const env = { PEXELS_API_KEY: 'secreta-1', UNSPLASH_ACCESS_KEY: 'secreta-2', PIXABAY_API_KEY: 'secreta-3' };
  const lista = proveedoresDisponibles({ env });
  assert.deepEqual(lista, ['commons', 'pexels', 'unsplash', 'pixabay']);
  assert.ok(!JSON.stringify(lista).includes('secreta'));
});

// --------------------------------------------------------------- las reglas duras

test('Policiales: nunca una foto de stock', () => {
  for (const t of ['Un cazador recibe el alta en el hospital tras la mordedura de una víbora', 'Vecinos advierten sobre el robo de flexibles de gas', 'Obras en el hospital de Balcarce']) {
    const e = evaluarNota(nota(t, 'Policiales'));
    assert.equal(e.apto, false, t);
    assert.match(e.motivo, /Policiales/);
    assert.deepEqual(e.consultas, []);
  }
});

test('lo que cuenta un hecho, un delito o una víctima no lleva stock, esté en la sección que esté', () => {
  const casos = [
    ['Choque frontal en la Ruta 226 deja tres heridos', 'Balcarce'],
    ['Incendio en un galpón de la zona rural', 'Balcarce'],
    ['Cauan Barros choca con su auto y se pierde el partido ante Boca', 'Fútbol'],
    ['El Comando de Prevención Rural intercepta maquinaria agrícola en El Verano', 'Balcarce'],
    ['Aprehenden a un joven tras un enfrentamiento con agentes', 'Balcarce'],
    ['Incidentes y represión policial en el ingreso de River en Junín', 'Fútbol'],
    ['Un temporal deja sin luz a media ciudad', 'Argentina'],
    ['Murió un hombre en la rotonda', 'Balcarce'],
    ['Hallan sin vida a un hombre en un campo', 'Balcarce'],
    ['Denuncian una estafa con falsos alquileres', 'Argentina'],
  ];
  for (const [t, s] of casos) assert.equal(evaluarNota(nota(t, s)).apto, false, t);
});

test('un lugar o un problema concreto del barrio no lleva stock: una foto de otra calle parecería ésa', () => {
  for (const t of ['Vecinos reclaman soluciones por el difícil tránsito en la zona de calles 19 y 114 bis', 'Suspenden el acto escolar por el estado del camino']) {
    assert.equal(evaluarNota(nota(t, 'Balcarce')).apto, false, t);
  }
});

test('Política, las notas con una persona o un cargo y las de menores: sólo una foto SIN personas', () => {
  const sin = [
    ['El Gobierno defiende la estrategia del Banco Central con el oro', 'Política'],
    ['Luis Caputo pide confianza a los empresarios y descarta devaluar', 'Economía'],
    ['La Escuela Municipal de Básquet juega una nueva fecha', 'Deportes'],
    ['El Concejo Deliberativo Estudiantil cierra su quinta edición', 'Balcarce'],
    ['Tobía Goytía anota para la Sub-17 en la victoria ante Tanzania', 'Fútbol'],
    ['Vóley Balcarce gana el Torneo Promocional Sub-21 en Mar del Plata', 'Deportes'],
    ['La Justicia multa al jefe de Gabinete por incumplir la ley universitaria', 'Política'],
  ];
  for (const [t, s] of sin) {
    const e = evaluarNota(nota(t, s));
    assert.equal(e.apto, true, t);
    assert.equal(e.sinPersonas, true, `${t} debería exigir una foto sin personas`);
  }
  // Una nota común, sobre un tema, sin personas ni menores: puede llevar una foto con gente anónima.
  const libre = evaluarNota(nota('La cosecha de soja avanza más rápido que el año pasado', 'Agro'));
  assert.equal(libre.apto, true);
  assert.equal(libre.sinPersonas, false);
});

test('con personasAnonimas los deportistas anónimos no fuerzan una foto sin personas, pero un nombre o un menor sí', () => {
  const t = 'Atletas locales consiguen triunfos y podios en Tandil';
  assert.equal(evaluarNota(nota(t, 'Deportes')).sinPersonas, true);
  assert.equal(evaluarNota(nota(t, 'Deportes'), { personasAnonimas: true }).sinPersonas, false);
  assert.equal(evaluarNota(nota('Franco Colapinto penaliza quince puestos', 'Automovilismo'), { personasAnonimas: true }).sinPersonas, true);
  assert.equal(evaluarNota(nota('Atletas de la escuela primaria ganan en Tandil', 'Deportes'), { personasAnonimas: true }).sinPersonas, true);
});

test('las notas propias y las sin tema reconocible tampoco llevan stock', () => {
  assert.equal(evaluarNota(nota('El dólar cierra a 1.400', 'Economía', { propia: true })).apto, false);
  assert.equal(evaluarNota({ seccion: 'Balcarce' }).apto, false);
  // Sección sin fallback (Policiales ya está afuera) y sin tema: no hay qué buscar.
  assert.equal(evaluarNota(nota('Algo raro', 'Sin sección')).apto, false);
});

// ------------------------------------------------------------ nombres y consultas

test('se reconocen los nombres de persona y no las instituciones ni los lugares', () => {
  assert.deepEqual(nombresDePersona('Luis Caputo pide confianza a los empresarios'), ['Luis Caputo']);
  assert.deepEqual(nombresDePersona('Franco Colapinto penaliza quince puestos en la grilla'), ['Franco Colapinto']);
  assert.deepEqual(nombresDePersona('Fernando de la Torre repasa sus veinticuatro años entre Balcarce y España'), ['Fernando de la Torre']);
  assert.deepEqual(nombresDePersona('El Cementerio Municipal actualiza sus horarios desde el lunes 26 de octubre'), []);
  assert.deepEqual(nombresDePersona('La Fiesta Nacional del Postre evalúa su paso para noviembre'), []);
  assert.deepEqual(nombresDePersona('El Concejo Deliberativo Estudiantil cierra su quinta edición'), []);
  assert.deepEqual(nombresDePersona('Milei sube el tono contra la oposición'), ['Milei']);
  assert.deepEqual(nombresDePersona(''), []);
});

test('las consultas nunca llevan el nombre de una persona', () => {
  const casos = [
    nota('Luis Caputo pide confianza a los empresarios y descarta devaluar', 'Economía', { etiquetas: ['Luis Caputo', 'dólar'] }),
    nota('Franco Colapinto penaliza quince puestos en la grilla por un cambio de motor', 'Automovilismo', { etiquetas: ['Franco Colapinto', 'Fórmula 1'] }),
    nota('Giuliana Romero afronta una nueva cirugía en el pie derecho', 'Balcarce'),
    nota('Cristian Méndez regresa a Balcarce tras una gira por España', 'Cultura y agenda', { etiquetas: ['Cristian Méndez'] }),
  ];
  for (const n of casos) {
    const e = evaluarNota(n);
    const nombres = [...e.personas, ...nombresDePersona(n.titulo)].flatMap((x) => x.split(/\s+/)).filter((p) => p.length > 3 && !['Balcarce'].includes(p));
    assert.ok(e.sinPersonas, n.titulo);
    for (const c of e.consultas) {
      for (const p of nombres) {
        assert.ok(!c.es.includes(p) && !c.en.includes(p), `la consulta "${c.es}" / "${c.en}" lleva "${p}"`);
      }
    }
  }
});

test('el tema sale del título; las de Balcarce suman la consulta con el lugar; la genérica de la sección va al final', () => {
  const c = armarConsultas(nota('El Cementerio Municipal actualiza sus horarios', 'Balcarce'));
  assert.deepEqual(c.map((x) => x.tipo), ['lugar', 'tema', 'seccion']);
  assert.equal(c[0].es, 'cementerio Balcarce');
  assert.equal(c[1].en, 'cemetery');
  const e = armarConsultas(nota('El riesgo país sube y las acciones registran caídas en la bolsa', 'Economía'));
  assert.equal(e[0].tipo, 'tema');
  assert.match(e[0].es, /Bolsa de Comercio/);
  assert.equal(e.at(-1).tipo, 'seccion');
  // Sin tema en el título, cae a las etiquetas.
  const t = armarConsultas(nota('Una novedad importante', 'Agro', { etiquetas: ['soja', 'cosecha'] }));
  assert.match(t[0].es, /cosecha/);
});

test('la tabla de temas es coherente: cada tema trae su consulta en castellano y en inglés', () => {
  for (const t of TEMAS) {
    assert.ok(t.re instanceof RegExp);
    assert.ok(t.es && t.en, String(t.re));
    assert.ok(!/\p{Lu}\p{Ll}+ \p{Lu}\p{Ll}+/u.test(t.en.replace(/Buenos Aires|La Plata|Casa Rosada|Balcarce/g, '')), `¿nombre de persona en la consulta "${t.en}"?`);
  }
});

// ----------------------------------------------------------------------- puntaje

const buena = (extra = {}) => ({ proveedor: 'commons', id: '1', imagen: 'https://x/a.jpg', ancho: 1600, alto: 1000, licencia: 'CC BY-SA 4.0', titulo: 'Portal del Cementerio de Balcarce', texto: 'Portal del Cementerio de Balcarce', ...extra });
const consultaCementerio = { tipo: 'lugar', es: 'cementerio Balcarce', en: 'cemetery Balcarce Argentina' };

test('el puntaje: relevancia por palabras, ancho mínimo de 1.200 px y orientación', () => {
  const ok = puntuarCandidata(buena(), consultaCementerio, { tipo: 'lugar' });
  assert.equal(ok.descartada, null);
  assert.ok(ok.puntaje >= UMBRAL, String(ok.puntaje));
  assert.equal(ok.desglose.relevancia, 60, 'las dos palabras de la consulta están en el título');

  assert.match(puntuarCandidata(buena({ ancho: 1100, alto: 700 }), consultaCementerio).descartada, /1100/);
  assert.equal(puntuarCandidata(buena({ ancho: ANCHO_MINIMO, alto: 800 }), consultaCementerio).descartada, null, '1.200 px justos sirven');
  assert.match(puntuarCandidata(buena({ ancho: 1200, alto: 1600 }), consultaCementerio).descartada, /apaisada/, 'una vertical no sirve');
  assert.match(puntuarCandidata(buena({ ancho: 1500, alto: 1400 }), consultaCementerio).descartada, /apaisada/, 'casi cuadrada tampoco');

  const sinPalabras = puntuarCandidata(buena({ titulo: 'Una vista cualquiera', texto: '' }), consultaCementerio, { tipo: 'lugar' });
  assert.ok(sinPalabras.puntaje < ok.puntaje, 'sin las palabras de la consulta puntúa menos');
  const grande = puntuarCandidata(buena({ ancho: 3000, alto: 2000 }), consultaCementerio, { tipo: 'lugar' });
  assert.ok(grande.puntaje >= ok.puntaje, 'más grande no puntúa menos');
});

test('se descartan los logos, mapas, dibujos y fotos con marca o de un banco de imágenes', () => {
  for (const titulo of ['Logo del club', 'Mapa de Balcarce', 'Escudo de Balcarce', 'Cementerio watermark', 'Cementerio shutterstock', 'Vector de un cementerio', 'Dibujo del cementerio', 'plano.svg', 'Captura de pantalla']) {
    assert.ok(puntuarCandidata(buena({ titulo, texto: titulo }), consultaCementerio).descartada, titulo);
  }
});

test('con "sin personas" se descarta lo que habla de personas; sin esa exigencia sólo resta puntos', () => {
  const gente = buena({ titulo: 'Cementerio con gente y un hombre', texto: 'Cementerio con gente' });
  assert.match(puntuarCandidata(gente, consultaCementerio, { sinPersonas: true }).descartada, /sin personas/);
  const libre = puntuarCandidata(gente, consultaCementerio, { sinPersonas: false });
  assert.equal(libre.descartada, null);
  assert.equal(libre.desglose.personas, -25);
});

test('la foto genérica de la sección nunca pasa de 60 puntos', () => {
  const g = puntuarCandidata(buena({ ancho: 4000, alto: 2500, licencia: 'CC0' }), { tipo: 'seccion', es: 'Balcarce Buenos Aires', en: 'Balcarce Argentina' }, { tipo: 'seccion' });
  assert.ok(g.puntaje <= TOPE_GENERICA);
});

// ------------------------------------------------------------------- proveedores

const pagina = (titulo, extra = {}, meta = {}) => ({
  pageid: Math.floor(Math.random() * 1e6), index: 1, title: `File:${titulo}`,
  imageinfo: [{
    mime: 'image/jpeg', width: 4000, height: 2600, thumbwidth: 1600, thumbheight: 1040, thumburl: `https://upload.wikimedia.org/thumb/${encodeURIComponent(titulo)}`,
    url: `https://upload.wikimedia.org/${encodeURIComponent(titulo)}`, descriptionurl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(titulo)}`,
    extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: '<a href="https://commons.wikimedia.org/wiki/User:Ana">Ana  <b>Pérez</b></a>' }, ImageDescription: { value: '<p>Cementerio de Balcarce</p>' }, Categories: { value: 'Cemeteries in Argentina|Balcarce' }, ...meta },
    ...extra,
  }],
});

test('Commons: la licencia se verifica en la respuesta y sólo pasan las libres, con autor en texto y la miniatura de 1.600 px', async () => {
  const paginas = {
    1: { ...pagina('Portal del Cementerio de Balcarce.jpg'), index: 2 },
    2: pagina('Cementerio con licencia no comercial.jpg', {}, { LicenseShortName: { value: 'CC BY-NC 4.0' } }),
    3: pagina('Cementerio no libre.jpg', {}, { NonFree: { value: 'true' } }),
    4: pagina('Cementerio con derechos de la personalidad.jpg', {}, { Restrictions: { value: 'personality' } }),
    5: pagina('Cementerio todos los derechos.jpg', {}, { LicenseShortName: { value: 'All rights reserved' } }),
    6: pagina('Cementerio plano.svg', { mime: 'image/svg+xml' }),
    7: { ...pagina('Cementerio de dominio público.png', { mime: 'image/png' }, { LicenseShortName: { value: 'Public domain' } }), index: 1 },
  };
  let url = '';
  const r = await buscarEnCommons('cementerio Balcarce', { fetchFn: async (u) => { url = u; return { ok: true, json: async () => ({ query: { pages: paginas } }) }; } });
  assert.deepEqual(r.map((c) => c.titulo), ['Cementerio de dominio público', 'Portal del Cementerio de Balcarce'], 'en el orden de Commons, sólo las libres');
  assert.equal(r[1].autor, 'Ana Pérez');
  assert.equal(r[1].licencia, 'CC BY-SA 4.0');
  assert.match(r[1].imagen, /thumb/);
  assert.equal(r[1].ancho, 1600);
  assert.match(url, /commons\.wikimedia\.org/);
  assert.match(decodeURIComponent(url), /filetype:bitmap/);
  await assert.rejects(buscarEnCommons('x', { fetchFn: async () => ({ ok: false, status: 429 }) }), /429/);
});

test('Pexels: la clave va en el encabezado y el resultado trae autor y licencia', async () => {
  let pedido;
  const r = await buscarEnPexels('cemetery', {
    claveApi: 'CLAVE-PEXELS', fetchFn: async (u, o) => { pedido = { u, o }; return { ok: true, json: async () => ({ photos: [{ id: 7, width: 5000, height: 3300, url: 'https://www.pexels.com/photo/7', photographer: 'Juan Gómez', alt: 'Old cemetery with trees', src: { large2x: 'https://images.pexels.com/photos/7/large2x.jpg' } }, { id: 8, src: {} }] }) }; },
  });
  assert.equal(pedido.o.headers.authorization, 'CLAVE-PEXELS');
  assert.ok(!pedido.u.includes('CLAVE-PEXELS'), 'la clave no va en la dirección');
  assert.match(pedido.u, /orientation=landscape/);
  assert.equal(r.length, 1);
  assert.deepEqual([r[0].proveedor, r[0].autor, r[0].licencia], ['pexels', 'Juan Gómez', 'Licencia Pexels']);
  assert.ok(!JSON.stringify(r).includes('CLAVE-PEXELS'));
  await assert.rejects(buscarEnPexels('x', { claveApi: 'k', fetchFn: async () => ({ ok: false, status: 401 }) }), /401/);
});

test('Unsplash: pide 1.600 px, usa el encabezado Client-ID y avisa la descarga', async () => {
  const llamadas = [];
  const fetchFn = async (u, o) => { llamadas.push({ u, o }); return { ok: true, json: async () => ({ results: [{ id: 'u1', width: 6000, height: 4000, alt_description: 'harvest field', urls: { raw: 'https://images.unsplash.com/photo-1?ixid=x', regular: 'https://images.unsplash.com/photo-1?w=1080' }, links: { html: 'https://unsplash.com/photos/u1', download_location: 'https://api.unsplash.com/photos/u1/download' }, user: { name: 'Lucía Díaz' }, tags: [{ title: 'farm' }] }] }) }; };
  const r = await buscarEnUnsplash('harvest', { claveApi: 'CLAVE-UNS', fetchFn });
  assert.equal(llamadas[0].o.headers.authorization, 'Client-ID CLAVE-UNS');
  assert.match(r[0].imagen, /w=1600/);
  assert.equal(r[0].autor, 'Lucía Díaz');
  assert.match(r[0].texto, /farm/);
  assert.equal(await avisarDescargaUnsplash(r[0], { fetchFn, claveApi: 'CLAVE-UNS' }), true);
  assert.match(llamadas[1].u, /\/download$/);
  assert.equal(await avisarDescargaUnsplash(buena(), { fetchFn, claveApi: 'k' }), false, 'sólo las de Unsplash');
  assert.equal(await avisarDescargaUnsplash(r[0], { fetchFn: async () => { throw new Error('x'); }, claveApi: 'k' }), false, 'nunca lanza');
});

test('Pixabay: pide fotos horizontales de 1.200 px y usa el ancho original para la exigencia', async () => {
  let u = '';
  const r = await buscarEnPixabay('tractor field', {
    claveApi: 'CLAVE-PIX', fetchFn: async (url) => { u = url; return { ok: true, json: async () => ({ hits: [{ id: 3, pageURL: 'https://pixabay.com/photos/3', tags: 'tractor, field, agriculture', largeImageURL: 'https://pixabay.com/get/3_1280.jpg', imageWidth: 5472, imageHeight: 3648, user: 'campo_ar' }] }) }; },
  });
  assert.match(u, /min_width=1200/);
  assert.match(u, /orientation=horizontal/);
  assert.equal(r[0].anchoOriginal, 5472);
  assert.equal(r[0].ancho, 1280);
  assert.equal(r[0].autor, 'campo_ar');
  assert.equal(puntuarCandidata(r[0], { es: 'tractor field', en: 'tractor field' }, { idioma: 'en' }).descartada, null);
});

// ----------------------------------------------------------- la búsqueda entera

const respuestaCommons = (paginas) => async (u) => {
  if (String(u).includes('commons.wikimedia.org')) return { ok: true, json: async () => ({ query: { pages: paginas } }) };
  throw new Error(`pedido inesperado: ${u}`);
};

test('buscar para una nota apta: candidatas puntuadas de mayor a menor, sin las ya usadas', async () => {
  const n = nota('El Cementerio Municipal actualiza sus horarios', 'Balcarce');
  const paginas = {
    1: { ...pagina('Portal del Cementerio de Balcarce.jpg'), index: 1 },
    2: { ...pagina('Vista aérea.jpg'), index: 2 },
    3: { ...pagina('Cementerio de Balcarce (2).jpg'), index: 3 },
  };
  const r = await candidatasDeStock(n, { fetchFn: respuestaCommons(paginas), env: SIN_ENV });
  assert.equal(r.evaluacion.apto, true);
  assert.ok(r.candidatas.length >= 1);
  assert.ok(r.candidatas.every((c, i, a) => c.puntaje >= UMBRAL && (i === 0 || a[i - 1].puntaje >= c.puntaje)), 'ordenadas y sobre el umbral');
  assert.match(r.candidatas[0].titulo, /Cementerio/);
  assert.ok(r.candidatas.every((c) => c.consulta && c.tipoDeConsulta !== 'seccion'), 'por defecto, nunca la genérica de la sección');

  const usadas = new Set(r.candidatas.map((c) => c.imagen));
  const r2 = await candidatasDeStock(n, { fetchFn: respuestaCommons(paginas), env: SIN_ENV, excluir: usadas });
  assert.equal(r2.candidatas.length, 0, 'las que ya usó otra nota no se repiten');
});

test('una nota que no es apta no hace ningún pedido', async () => {
  let pedidos = 0;
  const r = await candidatasDeStock(nota('Choque frontal en la Ruta 226 deja tres heridos', 'Policiales'), { fetchFn: async () => { pedidos += 1; throw new Error('no'); }, env: SIN_ENV });
  assert.equal(pedidos, 0);
  assert.deepEqual(r.candidatas, []);
});

test('si un proveedor falla se anota el error y los demás siguen; nunca lanza', async () => {
  const env = { PEXELS_API_KEY: 'k1' };
  const fetchFn = async (u) => {
    if (String(u).includes('pexels')) return { ok: false, status: 500 };
    return { ok: true, json: async () => ({ query: { pages: { 1: pagina('Portal del Cementerio de Balcarce.jpg') } } }) };
  };
  const r = await candidatasDeStock(nota('El Cementerio Municipal actualiza sus horarios', 'Balcarce'), { fetchFn, env });
  assert.ok(r.candidatas.length >= 1);
  assert.ok(r.errores.some((e) => /pexels/.test(e) && /500/.test(e)));
  const caido = await candidatasDeStock(nota('El Cementerio Municipal actualiza sus horarios', 'Balcarce'), { fetchFn: async () => { throw new Error('sin red'); }, env: SIN_ENV });
  assert.deepEqual(caido.candidatas, []);
  assert.ok(caido.errores.length > 0);
});

test('"sin personas" en la búsqueda: las candidatas que mencionan gente ya no pasan', async () => {
  const paginas = { 1: pagina('Jugadores de vóley y público en la cancha.jpg', {}, { ImageDescription: { value: 'Voleibol con gente' } }), 2: pagina('Cancha de voleibol vacía.jpg') };
  const r = await candidatasDeStock(nota('Doce equipos compiten en un nuevo torneo de vóley', 'Deportes'), { fetchFn: respuestaCommons(paginas), env: SIN_ENV });
  assert.equal(r.evaluacion.sinPersonas, true);
  assert.ok(r.candidatas.length >= 1);
  assert.ok(r.candidatas.every((c) => !/jugadores|gente/i.test(c.titulo)));
});

// ------------------------------------------------------------ confirmar con IA

test('interpretarConfirmacion: sólo se aprueba con todas las respuestas explícitas y sin riesgos', () => {
  const buenaRta = { relevante: true, puntaje: 8, hay_personas: false, hay_menores: false, marca_o_texto: false, parece_escena_real: false, razon: 'una cancha vacía' };
  assert.equal(interpretarConfirmacion(buenaRta, { sinPersonas: true }).aprobada, true);
  assert.equal(interpretarConfirmacion({ ...buenaRta, hay_menores: true }, {}).aprobada, false);
  assert.match(interpretarConfirmacion({ ...buenaRta, hay_menores: true }, {}).motivo, /menor/);
  assert.match(interpretarConfirmacion({ ...buenaRta, marca_o_texto: true }, {}).motivo, /marca/);
  assert.match(interpretarConfirmacion({ ...buenaRta, hay_personas: true }, { sinPersonas: true }).motivo, /sin personas/);
  assert.equal(interpretarConfirmacion({ ...buenaRta, hay_personas: true }, { sinPersonas: false }).aprobada, true, 'si no se exige sin personas, una persona adulta anónima pasa');
  assert.match(interpretarConfirmacion({ ...buenaRta, parece_escena_real: true }, {}).motivo, /hecho/);
  assert.match(interpretarConfirmacion({ ...buenaRta, relevante: false }, {}).motivo, /ilustra/);
  assert.match(interpretarConfirmacion({ ...buenaRta, puntaje: 4 }, {}).motivo, /ilustra/);
  const incompleta = { relevante: true, puntaje: 9 };
  assert.equal(interpretarConfirmacion(incompleta, {}).aprobada, false, 'sin evaluar si hay menores o marca no se usa');
  assert.equal(interpretarConfirmacion(null, {}).aprobada, false);
});

test('confirmarConIA usa Gemini y, si falla, Groq; sin ninguna, no aprueba; nunca lanza', async () => {
  const datos = { mime: 'image/jpeg', base64: 'AAAA' };
  const rta = { relevante: true, puntaje: 9, hay_personas: false, hay_menores: false, marca_o_texto: false, parece_escena_real: false, razon: 'ok' };
  const gemini = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(rta) }] } }] }) });
  assert.equal((await confirmarConIA(nota('t', 'Agro'), {}, datos, { claveGemini: 'k', claveGroqApi: null, fetchFn: gemini })).aprobada, true);

  const geminiCaido_groqBien = async (u) => (String(u).includes('groq')
    ? { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(rta) } }] }) }
    : { ok: false, status: 429 });
  assert.equal((await confirmarConIA(nota('t', 'Agro'), {}, datos, { claveGemini: 'k', claveGroqApi: 'g', fetchFn: geminiCaido_groqBien })).aprobada, true);

  const todoCaido = async () => ({ ok: false, status: 500 });
  const caida = await confirmarConIA(nota('t', 'Agro'), {}, datos, { claveGemini: 'k', claveGroqApi: 'g', fetchFn: todoCaido });
  assert.equal(caida.aprobada, false);
  assert.match(caida.motivo, /no pudo confirmar/);
  assert.equal((await confirmarConIA(nota('t', 'Agro'), {}, datos, { claveGemini: null, claveGroqApi: null, fetchFn: todoCaido })).aprobada, false);
  assert.equal((await confirmarConIA(nota('t', 'Agro'), {}, null, { claveGemini: 'k', fetchFn: gemini })).aprobada, false);
});

// -------------------------------------------------------------------- elegir

const imagenFalsa = () => ({ ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => new Uint8Array(20_000).buffer });
const fetchCompleto = (paginas) => async (u) => (String(u).includes('commons.wikimedia.org/w/api.php') ? { ok: true, json: async () => ({ query: { pages: paginas } }) } : imagenFalsa());

test('elegir: con la IA aprobando sale la foto con su epígrafe "Foto ilustrativa", autor, proveedor y licencia', async () => {
  const n = nota('La cosecha de soja avanza más rápido que el año pasado', 'Agro');
  const paginas = { 1: pagina('Cosecha de soja en el campo.jpg', {}, { ImageDescription: { value: 'Cosecha de soja' } }) };
  const r = await elegirFotoStock(n, { env: SIN_ENV, forzar: true, fetchFn: fetchCompleto(paginas), confirmar: async () => ({ aprobada: true, razon: 'un campo' }) });
  assert.ok(r.elegida);
  assert.equal(r.origen, 'stock');
  assert.equal(r.elegida.credito, 'Foto ilustrativa. Foto: Ana Pérez / Wikimedia Commons (CC BY-SA 4.0)');
  assert.equal(r.elegida.ilustrativa, true);
  assert.equal(r.elegida.datos.mime, 'image/jpeg');
  assert.ok(r.elegida.datos.base64.length > 100);

  const e = entradaDeBancoStock(r.elegida, n, { archivo: 'fotos-notas/n1.jpg', ahora: new Date('2026-10-15T12:00:00Z') });
  assert.equal(e.archivo, 'fotos-notas/n1.jpg');
  assert.equal(e.origen, 'stock');
  assert.equal(e.ilustrativa, true);
  assert.equal(e.proveedor, 'commons');
  assert.equal(e.licencia, 'CC BY-SA 4.0');
  assert.equal(e.autor, 'Ana Pérez');
  assert.match(e.credito, /^Foto ilustrativa\. /);
  assert.equal(e.titulo, n.titulo);
  assert.equal(e.cuando, '2026-10-15T12:00:00.000Z');
  assert.ok(e.imagenOriginal && e.enlace);
});

test('elegir: una nota que exige "sin personas" no sale sin la IA, ni con la IA apagada', async () => {
  const n = nota('Doce equipos compiten en un nuevo torneo de vóley', 'Deportes');
  const paginas = { 1: pagina('Cancha de voleibol vacía.jpg') };
  const sinIA = await elegirFotoStock(n, { env: SIN_ENV, forzar: true, fetchFn: fetchCompleto(paginas), confirmar: false });
  assert.equal(sinIA.elegida, null);
  assert.match(sinIA.razon, /sin personas/);
});

test('elegir: si la IA rechaza (menor, personas, marca, no ilustra) se prueba la siguiente y, si ninguna, no hay foto', async () => {
  const n = nota('La cosecha de soja avanza más rápido que el año pasado', 'Agro');
  const paginas = { 1: { ...pagina('Cosecha de soja uno.jpg'), index: 1 }, 2: { ...pagina('Cosecha de soja dos.jpg'), index: 2 } };
  let vez = 0;
  const unaSi = await elegirFotoStock(n, { env: SIN_ENV, forzar: true, fetchFn: fetchCompleto(paginas), confirmar: async () => (++vez === 1 ? { aprobada: false, motivo: 'se ve un menor' } : { aprobada: true }) });
  assert.ok(unaSi.elegida);
  assert.equal(unaSi.rechazadas.length, 1);
  assert.match(unaSi.rechazadas[0], /menor/);
  const ninguna = await elegirFotoStock(n, { env: SIN_ENV, forzar: true, fetchFn: fetchCompleto(paginas), confirmar: async () => ({ aprobada: false, motivo: 'tiene marca de agua' }) });
  assert.equal(ninguna.elegida, null);
  assert.match(ninguna.razon, /marca de agua/);
});

test('elegir: no se usa una foto que no se pudo bajar y nunca lanza', async () => {
  const n = nota('La cosecha de soja avanza más rápido que el año pasado', 'Agro');
  const paginas = { 1: pagina('Cosecha de soja.jpg') };
  const fetchFn = async (u) => (String(u).includes('w/api.php') ? { ok: true, json: async () => ({ query: { pages: paginas } }) } : { ok: false, status: 404 });
  const r = await elegirFotoStock(n, { env: SIN_ENV, forzar: true, fetchFn, confirmar: false });
  assert.equal(r.elegida, null);
  const r2 = await elegirFotoStock(n, { env: SIN_ENV, forzar: true, fetchFn: async () => { throw new Error('sin red'); }, confirmar: false });
  assert.equal(r2.elegida, null);
});

test('elegir: una nota de Policiales, un hecho o un menor como tema nunca llega a pedir nada, ni forzando', async () => {
  const fetchFn = async () => { throw new Error('no debería haber red'); };
  for (const [t, s] of [['Choque frontal en la Ruta 226 deja tres heridos', 'Policiales'], ['Hallan sin vida a un hombre', 'Balcarce'], ['Aprehenden a un joven', 'Policiales']]) {
    const r = await elegirFotoStock(nota(t, s), { env: SIN_ENV, forzar: true, fetchFn, confirmar: async () => ({ aprobada: true }) });
    assert.equal(r.elegida, null, t);
  }
});

test('el crédito siempre empieza con "Foto ilustrativa" y nombra autor, proveedor y (en Commons) la licencia', () => {
  assert.equal(creditoDeStock({ proveedor: 'commons', autor: 'Ana', licencia: 'CC BY 4.0' }), 'Foto ilustrativa. Foto: Ana / Wikimedia Commons (CC BY 4.0)');
  assert.equal(creditoDeStock({ proveedor: 'commons', licencia: 'CC0' }), 'Foto ilustrativa. Foto: Wikimedia Commons (CC0)');
  assert.equal(creditoDeStock({ proveedor: 'pexels', autor: 'Juan' }), 'Foto ilustrativa. Foto: Juan / Pexels');
  assert.equal(creditoDeStock({ proveedor: 'unsplash', autor: 'Lu' }), 'Foto ilustrativa. Foto: Lu / Unsplash');
  assert.equal(creditoDeStock({ proveedor: 'pixabay', autor: 'x' }), 'Foto ilustrativa. Foto: x / Pixabay');
});

test('las fotos de stock ya usadas se reconocen en el banco', () => {
  const usadas = yaUsadasEnElBanco({ a: { origen: 'stock', imagenOriginal: 'https://x/1.jpg' }, b: { origen: 'medio', imagenOriginal: 'https://x/2.jpg' }, c: { intentado: true } });
  assert.deepEqual([...usadas], ['https://x/1.jpg']);
});

// ----------------------------------------------- el módulo no está conectado todavía

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
      if (a.endsWith('foto-stock.mjs')) continue;
      const texto = fs.readFileSync(a, 'utf8');
      if (/foto-stock/.test(texto) || /FOTO_STOCK_ACTIVA/.test(texto)) quienes.push(path.relative(RAIZ, a).replaceAll('\\', '/'));
    }
  }
  assert.deepEqual(quienes, [], 'cuando se conecte, esta prueba se cambia a propósito (docs/fotos/PROPUESTA-STOCK.md)');
});

test('el módulo no lleva claves escritas ni las muestra', () => {
  const texto = fs.readFileSync(path.join(RAIZ, 'ingesta', 'foto-stock.mjs'), 'utf8');
  assert.ok(!/AIza[0-9A-Za-z_-]{20,}|gsk_[0-9A-Za-z]{20,}|[A-Za-z0-9]{40,}/.test(texto.replace(/https?:\/\/\S+/g, '')), 'parece haber una clave escrita');
  assert.ok(!/console\.(log|error|warn)\([^)]*(clave|key|token)/i.test(texto), 'no se muestran claves');
});

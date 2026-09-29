// A qué notas se les prueba una foto en cada corrida, y qué queda en el
// banco (web/scripts/fotos-notas.mjs). Sin red: todo con fetchFn de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elegiblePorSeccion, elegirFotosNuevas, fotoDeLaWeb, TOPE_POR_CORRIDA } from '../web/scripts/fotos-notas.mjs';

test('elegiblePorSeccion: Policiales sólo con una fuente oficial; el resto, siempre', () => {
  assert.equal(elegiblePorSeccion({ seccion: 'Balcarce' }), true);
  assert.equal(elegiblePorSeccion({ seccion: 'Policiales', fuentesConsultadas: [{ medio: 'El Diario', oficial: false }] }), false);
  assert.equal(elegiblePorSeccion({ seccion: 'Policiales', fuentesConsultadas: [{ medio: 'Bomberos', oficial: true }] }), true);
  assert.equal(elegiblePorSeccion({ seccion: 'Policiales', origenes: [{ medio: 'Policía', oficial: true }] }), true);
  assert.equal(elegiblePorSeccion({ seccion: 'Policiales' }), false);
});

test('fotoDeLaWeb: sólo lo que hace falta mostrar, y nada si no hay archivo (falló o quedó "intentado")', () => {
  const banco = {
    a: { archivo: 'fotos-notas/a.jpg', credito: 'Foto: El Diario Balcarce', origen: 'medio' },
    b: { intentado: true, origen: 'ninguna' },
  };
  assert.deepEqual(fotoDeLaWeb(banco, 'a'), { archivo: 'fotos-notas/a.jpg', credito: 'Foto: El Diario Balcarce' });
  assert.equal(fotoDeLaWeb(banco, 'b'), null);
  assert.equal(fotoDeLaWeb(banco, 'c'), null);
});

const imagenJpeg = () => ({ ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => Buffer.from('foto') });

function fetchDeUnaFuenteConFoto() {
  return async (url) => {
    if (String(url).includes('generativelanguage')) {
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ elegida: 'A', razon: 'sirve', fotos: [{ letra: 'A', tiene_marca: false }] }) }] } }] }) };
    }
    if (url === 'https://a.com/n') return { ok: true, text: async () => '<meta property="og:image" content="https://a.com/f.jpg">' };
    if (url === 'https://a.com/f.jpg') return imagenJpeg();
  };
}

test('elegirFotosNuevas: una nota nueva con foto queda en el banco y su archivo, listo para guardar', async () => {
  const nota = { id: 'n1', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [{ medio: 'A', enlace: 'https://a.com/n' }] };
  const { banco, archivos } = await elegirFotosNuevas([nota], { clave: 'g', claveRespaldo: null, fetchFn: fetchDeUnaFuenteConFoto() });
  assert.equal(banco.n1.archivo, 'fotos-notas/n1.jpg');
  assert.equal(banco.n1.credito, 'Foto: A');
  assert.equal(banco.n1.origen, 'medio');
  assert.equal(archivos['fotos-notas/n1.jpg'].toString(), 'foto');
  // Con lo necesario para revisarla y reusarla (28/09): de qué nota nuestra
  // es y de qué nota del medio salió.
  assert.equal(banco.n1.titulo, 't');
  assert.equal(banco.n1.enlace, 'https://a.com/n');
  assert.ok(banco.n1.imagenOriginal, 'la dirección original de la imagen');
});

test('elegirFotosNuevas: una nota ya en el banco no se vuelve a preguntar', async () => {
  const nota = { id: 'n1', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [{ medio: 'A', enlace: 'https://a.com/n' }] };
  const banco = { n1: { archivo: 'fotos-notas/n1.jpg', credito: 'Foto: A', origen: 'medio' } };
  const { banco: bancoNuevo, archivos } = await elegirFotosNuevas([nota], {
    banco, clave: 'g', claveRespaldo: null, fetchFn: async () => { throw new Error('no debería llamarse'); },
  });
  assert.deepEqual(bancoNuevo, banco);
  assert.deepEqual(archivos, {});
});

test('elegirFotosNuevas: una nota de Policiales sin fuente oficial no se pregunta (no entra en la lista siquiera)', async () => {
  const nota = { id: 'p1', titulo: 't', seccion: 'Policiales', fuentesConsultadas: [{ medio: 'El Diario', oficial: false, enlace: 'https://a.com/n' }] };
  const { banco } = await elegirFotosNuevas([nota], { clave: 'g', claveRespaldo: null, fetchFn: async () => { throw new Error('no debería llamarse'); } });
  assert.equal(banco.p1, undefined);
});

test('elegirFotosNuevas: sin foto que sirva, queda "intentado" (no se reintenta después)', async () => {
  const nota = { id: 'n2', titulo: 't', seccion: 'Economía', fuentesConsultadas: [] };
  const fetchFn = async (url) => {
    if (String(url).includes('generativelanguage')) return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ persona: null }) }] } }] }) };
  };
  const { banco, archivos } = await elegirFotosNuevas([nota], { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(banco.n2.intentado, true);
  assert.equal(banco.n2.origen, 'ninguna');
  assert.deepEqual(archivos, {});
});

test('elegirFotosNuevas: no procesa más de "tope" notas por corrida', async () => {
  const notas = Array.from({ length: TOPE_POR_CORRIDA + 3 }, (_, i) => ({ id: `n${i}`, titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [] }));
  let llamadas = 0;
  const fetchFn = async (url) => {
    if (String(url).includes('generativelanguage')) {
      llamadas += 1;
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ persona: null }) }] } }] }) };
    }
  };
  const { banco } = await elegirFotosNuevas(notas, { clave: 'g', claveRespaldo: null, fetchFn, tope: 4 });
  assert.equal(Object.keys(banco).length, 4);
  assert.equal(llamadas, 4);
});

test('elegirFotosNuevas: con el tope justo, las notas más nuevas van primero (28/09: "que todas las nuevas tengan fotos")', async () => {
  // Una vieja, sin probar todavía (un resto de una corrida anterior), y dos
  // nuevitas: con tope 1, tiene que tocarle a la más nueva, no a la vieja.
  const notas = [
    { id: 'vieja', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [], fecha: '2026-09-27T10:00:00Z' },
    { id: 'nueva-2', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [], fecha: '2026-09-28T09:00:00Z' },
    { id: 'nueva-1', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [], fecha: '2026-09-28T10:00:00Z' },
  ];
  const fetchFn = async (url) => {
    if (String(url).includes('generativelanguage')) return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ persona: null }) }] } }] }) };
  };
  const { banco } = await elegirFotosNuevas(notas, { clave: 'g', claveRespaldo: null, fetchFn, tope: 2 });
  assert.deepEqual(Object.keys(banco).sort(), ['nueva-1', 'nueva-2']);
  assert.equal(banco.vieja, undefined);
});

test('elegirFotosNuevas: un error de red en una nota no frena a las demás', async () => {
  const notas = [
    { id: 'ok', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [{ medio: 'A', enlace: 'https://a.com/n' }] },
    { id: 'cae', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [{ medio: 'B', enlace: 'https://b.com/n' }] },
  ];
  const fetchFn = async (url) => {
    if (url === 'https://b.com/n') throw new Error('se cayó');
    return fetchDeUnaFuenteConFoto()(url);
  };
  const { banco } = await elegirFotosNuevas(notas, { clave: 'g', claveRespaldo: null, fetchFn });
  assert.equal(banco.ok.archivo, 'fotos-notas/ok.jpg');
  assert.ok(banco.cae.intentado || banco.cae.archivo === undefined);
});

// --------------------------------------------------- la página de la nota

import fs from 'node:fs';
const leer = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('la página de la nota muestra la foto sólo si hay, con el crédito en el epígrafe, nunca en la imagen', () => {
  const pagina = leer('web/app/nota/[id]/page.js');
  assert.match(pagina, /\{n\.foto && \(/, 'la foto es condicional: sin foto, no se rompe nada');
  assert.match(pagina, /<figcaption[^>]*>\{n\.foto\.credito\}<\/figcaption>/, 'el crédito va en el epígrafe');
  assert.match(pagina, /src=\{`\/\$\{n\.foto\.archivo\}`\}/, 'la imagen sale de banco-fotos.json, no de la fuente');
  // El nombre del medio no se escribe DENTRO de la imagen (eso sería un
  // <text> o un overlay sobre el <img>; acá sólo puede estar en el epígrafe).
  const bloqueFoto = pagina.match(/\{n\.foto && \([\s\S]*?\)\}/)?.[0] ?? '';
  assert.equal((bloqueFoto.match(/n\.foto\.credito/g) ?? []).length, 1, 'el crédito aparece una sola vez, en el epígrafe');
});

test('el workflow "Actualizar la web" sube banco-fotos.json y las fotos guardadas (28/09: se armaban y se perdían)', () => {
  const y = leer('.github/workflows/actualizar.yml');
  const paso = y.match(/Guardar si cambió algo[\s\S]*?git add ([^\n]+)/)?.[1] ?? '';
  assert.match(paso, /web\/data\/banco-fotos\.json/);
  assert.match(paso, /web\/public\/fotos-notas\//);
});

// ------- 29/09: las fotos del banco se guardan achicadas
import { fotoParaGuardar, achicarFoto, ANCHO_MAXIMO_FOTO } from '../web/scripts/achicar-foto.mjs';

test('fotoParaGuardar: la achicada si pesa menos; si no, la original (y si no se pudo achicar, la original)', async () => {
  const original = Buffer.alloc(1_000_000, 1);
  const chica = Buffer.alloc(120_000, 2);
  const a = await fotoParaGuardar(original, 'png', { achicar: async () => chica });
  assert.deepEqual({ ext: a.ext, achicada: a.achicada, bytes: a.bytes.length }, { ext: 'jpg', achicada: true, bytes: 120_000 });
  const b = await fotoParaGuardar(original, 'webp', { achicar: async () => null });
  assert.deepEqual({ ext: b.ext, achicada: b.achicada, bytes: b.bytes.length }, { ext: 'webp', achicada: false, bytes: 1_000_000 });
  const c = await fotoParaGuardar(chica, 'jpg', { achicar: async () => original });
  assert.equal(c.achicada, false, 'una "achicada" más pesada que la original no se usa');
});

test('achicarFoto: pide a ffmpeg un JPEG de hasta 1.200 px y nunca lanza', async () => {
  let pedido = null;
  const ejecutar = async (programa, argumentos) => {
    pedido = { programa, argumentos };
    const fs = await import('node:fs');
    fs.writeFileSync(argumentos.at(-1), Buffer.from('jpeg-chico'));
  };
  const r = await achicarFoto(Buffer.from('imagen-grande'), { ejecutar, ffmpeg: 'ffmpeg-de-mentira' });
  assert.equal(r.toString(), 'jpeg-chico');
  assert.equal(pedido.programa, 'ffmpeg-de-mentira');
  assert.ok(pedido.argumentos.includes(`scale='min(${ANCHO_MAXIMO_FOTO},iw)':-2`));
  assert.equal(ANCHO_MAXIMO_FOTO, 1200);
  // Si ffmpeg falla, o no hay imagen, devuelve null en vez de lanzar.
  assert.equal(await achicarFoto(Buffer.from('x'), { ejecutar: async () => { throw new Error('roto'); }, ffmpeg: 'f' }), null);
  assert.equal(await achicarFoto(Buffer.alloc(0), { ejecutar, ffmpeg: 'f' }), null);
});

test('elegirFotosNuevas guarda la foto achicada (jpg) y la anota así en el banco', async () => {
  const nota = { id: 'n9', titulo: 't', seccion: 'Balcarce', fuentesConsultadas: [{ medio: 'A', enlace: 'https://a.com/n' }] };
  const grande = Buffer.from('foto'.repeat(100));
  const fetchFn = async (url) => {
    if (String(url).includes('generativelanguage')) return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ elegida: 'A', razon: 'sirve', fotos: [{ letra: 'A', tiene_marca: false }] }) }] } }] }) };
    if (url === 'https://a.com/n') return { ok: true, text: async () => '<meta property="og:image" content="https://a.com/f.png">' };
    if (url === 'https://a.com/f.png') return { ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => grande };
  };
  const { banco, archivos } = await elegirFotosNuevas([nota], { clave: 'g', claveRespaldo: null, fetchFn, achicar: async () => Buffer.from('chica') });
  assert.equal(banco.n9.archivo, 'fotos-notas/n9.jpg', 'una PNG achicada queda como jpg');
  assert.equal(archivos['fotos-notas/n9.jpg'].toString(), 'chica');
});

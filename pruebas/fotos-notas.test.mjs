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

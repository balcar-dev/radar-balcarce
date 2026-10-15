// El registro de uso de la IA por día (15/10/2026): tokens, llamadas y errores, para saber cuánto costaría la IA
// el día que deje de ser gratis. Sin red.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { usoDe, sumarUso, anotarUsoIA, MAXIMO_DE_DIAS_DE_USO } from '../redes/uso-ia.mjs';
import { reescribir } from '../reels/reescritura.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const temporal = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'uso-ia-')), 'uso-ia.json');

test('usoDe lee los tokens de Gemini (usageMetadata) y los de Groq (usage)', () => {
  assert.deepEqual(
    usoDe({ usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 120, thoughtsTokenCount: 30, totalTokenCount: 1050 } }),
    { entrada: 900, salida: 120, pensamiento: 30, total: 1050 },
  );
  assert.deepEqual(usoDe({ usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } }), { entrada: 10, salida: 5, pensamiento: 0, total: 15 });
  assert.deepEqual(usoDe({ usage: { prompt_tokens: 700, completion_tokens: 80, total_tokens: 780 } }), { entrada: 700, salida: 80, pensamiento: 0, total: 780 });
  assert.equal(usoDe({ candidates: [] }), null);
  assert.equal(usoDe(null), null);
});

test('sumarUso junta las llamadas del día por tarea y por modelo, sin tocar lo anterior', () => {
  let a = sumarUso({ dias: {} }, { dia: '2026-10-15', tarea: 'redaccion', modelo: 'm1', clave: 'redaccion', uso: { entrada: 100, salida: 20, pensamiento: 0, total: 120 } });
  a = sumarUso(a, { dia: '2026-10-15', tarea: 'redaccion', modelo: 'm1', clave: 'redes', uso: { entrada: 50, salida: 10, pensamiento: 0, total: 60 } });
  a = sumarUso(a, { dia: '2026-10-15', tarea: 'redaccion', modelo: 'm1', clave: 'redaccion', error: 429 });
  a = sumarUso(a, { dia: '2026-10-15', tarea: 'lectura', modelo: 'm2', uso: { entrada: 7, salida: 1, pensamiento: 0, total: 8 } });
  a = sumarUso(a, { dia: '2026-10-14', tarea: 'redaccion', modelo: 'm1', uso: { entrada: 1, salida: 1, pensamiento: 0, total: 2 } });
  assert.deepEqual(a.dias['2026-10-15'].redaccion.m1, {
    llamadas: 3, errores: 1, entrada: 150, salida: 30, pensamiento: 0, total: 180, claves: { redaccion: 2, redes: 1 },
  });
  assert.equal(a.dias['2026-10-15'].lectura.m2.entrada, 7);
  assert.equal(a.dias['2026-10-14'].redaccion.m1.llamadas, 1);
  assert.deepEqual(Object.keys(a.dias), ['2026-10-14', '2026-10-15'], 'ordenados por día');
});

test('se guardan sólo los últimos 120 días', () => {
  let a = { dias: {} };
  for (let i = 1; i <= 130; i += 1) {
    a = sumarUso(a, { dia: `2026-${String(Math.ceil(i / 28)).padStart(2, '0')}-${String(((i - 1) % 28) + 1).padStart(2, '0')}`, tarea: 't', modelo: 'm' });
  }
  assert.equal(Object.keys(a.dias).length, MAXIMO_DE_DIAS_DE_USO);
});

test('anotarUsoIA escribe el archivo, suma y nunca lanza', () => {
  const archivo = temporal();
  const ahora = new Date('2026-10-15T15:00:00Z');
  const respuesta = { usageMetadata: { promptTokenCount: 500, candidatesTokenCount: 50, totalTokenCount: 550 } };
  assert.equal(anotarUsoIA({ tarea: 'redaccion', modelo: 'gemini-x', clave: 'redaccion', respuesta, ahora, archivo }), true);
  assert.equal(anotarUsoIA({ tarea: 'redaccion', modelo: 'gemini-x', clave: 'redaccion', respuesta, ahora, archivo }), true);
  const j = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  assert.equal(j.dias['2026-10-15'].redaccion['gemini-x'].llamadas, 2);
  assert.equal(j.dias['2026-10-15'].redaccion['gemini-x'].entrada, 1000);
  // sin tarea o sin modelo no anota; un archivo roto no hace caer a nadie
  assert.equal(anotarUsoIA({ modelo: 'x', archivo }), false);
  fs.writeFileSync(archivo, '{ roto');
  assert.doesNotThrow(() => anotarUsoIA({ tarea: 't', modelo: 'm', archivo, ahora }));
  assert.equal(anotarUsoIA({ tarea: 't', modelo: 'm', archivo: path.join(archivo, 'no', 'existe', 'x.json'), ahora }), false);
});

test('dentro de las pruebas no se escribe en web/data/uso-ia.json (a menos que se diga a qué archivo)', () => {
  const antes = leer('web/data/uso-ia.json');
  assert.equal(anotarUsoIA({ tarea: 'redaccion', modelo: 'm', respuesta: {} }), false);
  assert.equal(leer('web/data/uso-ia.json'), antes);
});

test('reescribir anota los tokens de la respuesta de Gemini (y el error de una que falló)', async () => {
  const archivo = temporal();
  process.env.USO_IA_ARCHIVO = archivo;
  try {
    const nota = { titulo: 'Reabre el Fangio', resumenFuente: 'El autódromo reabre este fin de semana con una fecha del Turismo Carretera.', seccion: 'Automovilismo', medios: ['Radio X'] };
    const buena = async () => ({
      ok: true, status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ titulo: 'Reabre el Fangio', copete: 'Con carreras.', cuerpo: 'Texto.', guion: 'Reabre el Fangio.' }) }] } }],
        usageMetadata: { promptTokenCount: 1234, candidatesTokenCount: 321, totalTokenCount: 1555 },
      }),
    });
    await reescribir(nota, { fetchFn: buena, clavePropia: 'K1', claveDeRedes: null, claveDeRespaldo: null });
    const c = Object.values(Object.values(JSON.parse(fs.readFileSync(archivo, 'utf8')).dias).at(-1).redaccion)[0];
    assert.equal(c.entrada, 1234);
    assert.equal(c.salida, 321);
    assert.equal(c.total, 1555);
    assert.equal(c.claves.redaccion, 1);
    const mala = async () => ({ ok: false, status: 400, text: async () => 'pedido mal armado', json: async () => ({}) });
    await assert.rejects(reescribir(nota, { fetchFn: mala, clavePropia: 'K1', claveDeRedes: null, claveDeRespaldo: null }), /HTTP 400/);
    const c2 = Object.values(Object.values(JSON.parse(fs.readFileSync(archivo, 'utf8')).dias).at(-1).redaccion)[0];
    assert.equal(c2.errores, 1);
    assert.equal(c2.llamadas, 2);
  } finally {
    delete process.env.USO_IA_ARCHIVO;
  }
});

test('el archivo existe y "Actualizar la web" lo sube', () => {
  assert.ok(Array.isArray(Object.keys(JSON.parse(leer('web/data/uso-ia.json')).dias)));
  assert.match(leer('.github/workflows/actualizar.yml'), /git add [^\n]*web\/data\/uso-ia\.json/);
  assert.match(leer('reels/reescritura.mjs'), /anotarUsoIA\(\{ tarea: 'redaccion'/);
});

test('uso-ia.mjs no importa nada de afuera de Node (redes/ no tiene dependencias)', () => {
  const imports = [...leer('redes/uso-ia.mjs').matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
  for (const i of imports) assert.ok(i.startsWith('node:') || i.startsWith('.'), i);
});

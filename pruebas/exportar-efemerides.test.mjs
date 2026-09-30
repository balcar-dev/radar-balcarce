// El texto para dárselo a otra IA (30/09): contexto, criterio, formato de respuesta
// y las candidatas sin nuestro puntaje.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CONTEXTO, lineaDeCandidata, textoDeDias, porSemana } from '../ingesta/exportar-efemerides.mjs';

const DIAS = {
  '2026-10-05': { candidatas: [
    { id: 'b1', origen: 'feed', estilo: 'curioso', anio: 1952, hace: 74, texto: 'En Estados Unidos sale a la luz la primera patente del código de barras.', marcas: [], puntaje: 99, importancia: 123 },
    { id: 'a1', origen: 'portal', estilo: 'nacimiento', anio: 1901, hace: 125, texto: 'Nace el poeta Carlos Mastronardi.', marcas: ['puede estar vivo'], puntaje: 10 },
  ] },
  '2026-10-12': { candidatas: [
    { id: 'c1', origen: 'curada', estilo: 'patria', titulo: 'Día del Respeto a la Diversidad Cultural feriado', anio: null, texto: 'Recuerda la llegada de Colón.', marcas: [], puntaje: 120, datos: [{ texto: 'El decreto 1584/2010 le cambió el nombre.' }] },
  ] },
};

test('el contexto dice quiénes somos, qué buscamos, qué evitamos y en qué formato contestar', () => {
  for (const frase of [/Radar Balcarce/, /Balcarce/, /Fangio/, /Un día como hoy/, /Política partidaria/, /menores/, /woke/, /PRINCIPAL/, /OPCIONAL/, /NINGUNA/, /Criterios que seguí/, /No te damos nuestro puntaje/]) {
    assert.match(CONTEXTO, frase);
  }
  assert.match(CONTEXTO, /AAAA-MM-DD \| PRINCIPAL: id \| SI: id, id \| OPCIONAL: id, id \| NO: id, id \| MOTIVO:/);
});

test('cada candidata va en una línea con su id, estilo, año, idiomas y marcas, y nunca con el puntaje', () => {
  const l = lineaDeCandidata(DIAS['2026-10-05'].candidatas[0]);
  assert.match(l, /^- \[b1\] · Dato curioso · 1952 \(hace 74 años\) · En Estados Unidos/);
  assert.match(l, /conocida en 123 idiomas/);
  assert.doesNotMatch(l, /99|puntaje|pts/);
  assert.match(lineaDeCandidata(DIAS['2026-10-05'].candidatas[1]), /marcas: puede estar vivo/);
  assert.match(lineaDeCandidata(DIAS['2026-10-12'].candidatas[0]), /FECHA PATRIA O DE ACÁ[\s\S]*dato verificado: El decreto 1584/);
});

test('los días salen ordenados por año (no por nuestro puntaje) y el feriado lo dice', () => {
  const t = textoDeDias(DIAS);
  assert.ok(t.indexOf('[a1]') < t.indexOf('[b1]'), 'por año: 1901 antes que 1952, aunque el puntaje diga lo contrario');
  assert.match(t, /### 2026-10-12 · Lunes 12 de octubre de 2026\n\*\*Es feriado o fecha patria: la pieza habla sólo de esa fecha\.\*\*/);
  assert.ok(t.startsWith('# Elegí las efemérides'));
  assert.ok(!textoDeDias(DIAS, { incluirContexto: false }).startsWith('#  '));
});

test('por semana, de lunes a domingo', () => {
  const s = porSemana({ '2026-10-05': {}, '2026-10-11': {}, '2026-10-12': {} });
  assert.deepEqual(Object.entries(s).map(([l, d]) => [l, Object.keys(d).length]), [['2026-10-05', 2], ['2026-10-12', 1]]);
});

test('el mes de candidatas del repositorio se exporta entero, sin puntajes', () => {
  const { dias } = JSON.parse(fs.readFileSync(new URL('../web/data/efemerides-candidatas.json', import.meta.url), 'utf8'));
  const t = textoDeDias(dias);
  assert.equal((t.match(/^### 2026-/gm) ?? []).length, 31);
  assert.ok(Object.values(dias).every((d) => d.candidatas.every((c) => t.includes(`[${c.id}]`))), 'todas las candidatas están');
});

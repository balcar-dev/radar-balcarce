// Tres arreglos del vigilante, de la auditoría del 25/09.
//
//   1. "sin hora" encontraba "sin horario" y avisaba en falso.
//   2. Cuando encontraba algo grave, la corrida terminaba con error y Actions
//      pintaba de rojo "Vigilancia", como si el roto fuera el vigilante. Ahora
//      termina bien y deja una anotación ::warning:: arriba de la corrida.
//   3. El dominio radarbalcarce.com vence el 21/09/2027 (DonWeb): se avisa
//      30 días antes, igual que el token de GitHub.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  revisarPortada, evaluar, anotacion, VENCIMIENTOS, DIAS_DE_AVISO_ANTES,
} from '../redes/vigilar.mjs';

// ------------------------------------------------------- 1. "sin horario"

test('"sin horario" no es "sin hora": no avisa en falso', () => {
  assert.equal(revisarPortada('<p>Atención sin horario de cierre</p>').laVimos, false);
  assert.equal(revisarPortada('<p>Trabajan sin horas extra</p>').laVimos, false);
});

test('"sin hora" y "la vimos hace" sueltos se siguen detectando', () => {
  assert.equal(revisarPortada('<span>sin hora</span>').laVimos, true);
  assert.equal(revisarPortada('<span class="meta">La vimos hace 3 horas</span>').laVimos, true);
  assert.equal(revisarPortada('<span>Sin hora.</span>').laVimos, true);
});

// ------------------------------------------- 2. termina bien, con anotación

test('un problema se anota como ::warning:: de GitHub, sin cortarse en los saltos de línea', () => {
  const l = anotacion({ clave: 'x', nivel: 'alta', texto: 'La web no responde.\nRevisá 100% de las cosas.' });
  assert.match(l, /^::warning title=[^:]+::/);
  assert.ok(!l.includes('\n'), 'una sola línea');
  assert.match(l, /%0A/);
  assert.match(l, /100%25/);
});

test('el título de la anotación escapa los dos puntos, como pide GitHub', () => {
  const l = anotacion({ clave: 'x', nivel: 'media', texto: 'algo' });
  assert.match(l, /^::warning title=Vigilancia%3A para mirar::algo$/);
});

test('el vigilante ya no termina con error por encontrar un problema', () => {
  // Se mira el código: correr main() de verdad saldría a la red.
  const codigo = fs.readFileSync(path.join(import.meta.dirname, '..', 'redes', 'vigilar.mjs'), 'utf8');
  assert.ok(!/process\.exit\(problemas/.test(codigo), 'volvió el exit(1) por problemas');
  assert.match(codigo, /console\.log\(anotacion\(p\)\)/);
  assert.match(codigo, /main\(\)\.catch/, 'si falla el vigilante mismo, sí tiene que terminar con error');
});

// -------------------------------------------------------- 3. el dominio

/** Un día sin ningún otro problema: sólo importa el vencimiento. */
function unDia(ahora) {
  return { ahora, web: { estado: 200, actualizado: new Date(ahora.getTime() - 10 * 60000).toISOString() } };
}

test('el dominio vence el 21/09/2027, en DonWeb', () => {
  const v = VENCIMIENTOS.find((x) => x.clave === 'vence-dominio');
  assert.ok(v, 'falta el vencimiento del dominio');
  assert.equal(v.fecha, '2027-09-21');
  assert.match(v.texto, /radarbalcarce\.com/);
  assert.match(v.texto, /DonWeb/);
});

test('30 días antes del vencimiento del dominio, se avisa; antes, no', () => {
  const dentro = evaluar(unDia(new Date('2027-08-25T12:00:00-03:00'))).find((p) => p.clave === 'vence-dominio');
  assert.ok(dentro, 'no avisó');
  assert.match(dentro.texto, /Faltan \d+ día/);
  assert.equal(dentro.nivel, 'media');
  const antes = evaluar(unDia(new Date('2027-08-01T12:00:00-03:00'))).find((p) => p.clave === 'vence-dominio');
  assert.equal(antes, undefined);
  assert.equal(DIAS_DE_AVISO_ANTES, 30);
});

test('la última semana del dominio es grave, y pasada la fecha dice que venció', () => {
  assert.equal(evaluar(unDia(new Date('2027-09-17T12:00:00-03:00'))).find((p) => p.clave === 'vence-dominio').nivel, 'alta');
  assert.match(evaluar(unDia(new Date('2027-09-23T12:00:00-03:00'))).find((p) => p.clave === 'vence-dominio').texto, /YA VENCIÓ/);
});

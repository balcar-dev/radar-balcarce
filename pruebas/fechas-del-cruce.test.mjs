// Regla 194 (17/10/2026, auditoría 2.0: docs/auditoria-2-0/02-FUENTES-CRITERIO-REPETIDAS.md § 2.3, punto 4, y § 5.3). «Una
// nota tiene una sola fecha, que envejece y nunca rejuvenece» está bien para que un medio no refresque su nota; pero la nota
// envejecía también cuando el cruce le pegaba una nota vieja de OTRO hecho: 80 notas publicadas (7 %) figuraban con una fecha
// de más de tres días antes de la primera vez que se vieron. La peor: «El Concejo Deliberativo Estudiantil cierra su quinta
// edición con 25 iniciativas», vista y publicada el 14/10, figuraba del 30/04/2026 por una nota vieja del Concejo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fechaDeLaNota, fechaEnvejecidaPorError, conFechaSinError, llegaTarde, HORAS_DE_UN_HECHO, HORAS_PARA_ESTRENAR,
  DESDE_QUE_NO_SE_ESTRENA_VIEJA,
} from '../web/lib/archivo.js';
import { CRUCE } from '../ingesta/cruce.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// La nota tal como estaba en web/data/archivo.json el 17/10 (sin el texto).
const CONCEJO_ESTUDIANTIL = {
  id: 'wm8hav',
  titulo: 'El Concejo Deliberativo Estudiantil cierra su quinta edición con 25 iniciativas',
  seccion: 'Balcarce',
  medios: ['Radio Gabal (FM 104.1)', 'Concejo Deliberante de Balcarce'],
  enlace: 'https://www.radiogabal.com.ar/index.php/politica/el-concejo-deliberativo-estudiantil-cerro-su-quinta-edicion-con-25-proyectos-presentados',
  fecha: '2026-04-30T17:34:56.000Z',
  sinFecha: false,
  visto: '2026-10-14T23:01:59.982Z',
  local: true,
  publicadaPor: null,
  como: 'automatica',
};

test('el Concejo Estudiantil (publicado el 14/10, figuraba del 30/04): la fecha era un error y pasa a la primera vez que se vio', () => {
  assert.equal(fechaEnvejecidaPorError(CONCEJO_ESTUDIANTIL), true);
  const c = conFechaSinError(CONCEJO_ESTUDIANTIL);
  assert.equal(c.fecha, '2026-10-14T23:01:59.982Z');
  assert.equal(c.id, 'wm8hav', 'la dirección no cambia');
  // Una sola vez: ya corregida, no se vuelve a tocar.
  assert.equal(fechaEnvejecidaPorError(c), false);
  assert.equal(conFechaSinError(c), c);
});

test('mientras sigue en la ingesta, la nota vieja que el cruce le pegó no la vuelve a envejecer', () => {
  // La historia: la de Radio Gabal (la principal, del 14/10 a la noche) y la nota vieja del Concejo (30/04).
  const historia = {
    fecha: '2026-10-14T22:40:00.000Z',
    origenes: [
      { medio: 'Radio Gabal (FM 104.1)', fecha: '2026-10-14T22:40:00.000Z' },
      { medio: 'Concejo Deliberante de Balcarce', fecha: '2026-04-30T17:34:56.000Z' },
    ],
  };
  const visto = CONCEJO_ESTUDIANTIL.visto;
  // Antes (sin ventana): la más vieja de todas, el 30/04.
  assert.equal(fechaDeLaNota(historia, { visto, horas: Infinity }), '2026-04-30T17:34:56.000Z');
  // Ahora: la de Radio Gabal, con la fecha ya publicada corregida (generar-datos la corrige al leer el archivo).
  const yaPublicada = conFechaSinError(CONCEJO_ESTUDIANTIL).fecha;
  assert.equal(fechaDeLaNota(historia, { fechaAnterior: yaPublicada, visto }), '2026-10-14T22:40:00.000Z');
});

test('lo que todavía no salió toma la fecha del hecho nuevo, no la de una nota vieja pegada, y se puede estrenar', () => {
  const ahora = Date.parse('2026-10-16T15:00:00Z');
  const nueva = {
    fecha: '2026-04-30T17:34:56.000Z', // la principal del grupo era la vieja (la más vieja de las de acá)
    origenes: [{ fecha: '2026-04-30T17:34:56.000Z' }, { fecha: '2026-10-16T13:30:00.000Z' }],
  };
  const fecha = fechaDeLaNota(nueva, { visto: '2026-10-16T14:31:00.000Z' });
  assert.equal(fecha, '2026-10-16T13:30:00.000Z');
  assert.equal(llegaTarde(fecha, ahora), false);
  assert.equal(llegaTarde(fechaDeLaNota(nueva, { visto: '2026-10-16T14:31:00.000Z', horas: Infinity }), ahora), true, 'antes llegaba tarde y no salía');
});

test('lo que SÍ envejece: una nota vieja de verdad vista tarde, y el mismo hecho contado antes por otro medio', () => {
  // Todas las fuentes son viejas (la vimos tarde): conserva su fecha y llega tarde, como siempre.
  const vieja = { fecha: '2026-10-10T12:00:00.000Z', origenes: [{ fecha: '2026-10-10T12:00:00.000Z' }] };
  assert.equal(fechaDeLaNota(vieja, { visto: '2026-10-16T14:00:00.000Z' }), '2026-10-10T12:00:00.000Z');
  // El Diario Balcarce republica el 15/10 lo que Infórmese contó el 13/10 a la noche («Pato Naranja y Pato Negro clasifican…»,
  // 43 horas): es el mismo hecho, del 13/10, y la nota envejece (no es un error del cruce).
  const pato = { fecha: '2026-10-15T15:30:00.000Z', origenes: [{ fecha: '2026-10-15T15:30:00.000Z' }, { fecha: '2026-10-13T21:19:00.000Z' }] };
  assert.equal(fechaDeLaNota(pato, { visto: '2026-10-15T16:04:00.000Z', fechaAnterior: '2026-10-15T15:30:00.000Z' }), '2026-10-13T21:19:00.000Z');
  assert.equal(fechaEnvejecidaPorError({ ...CONCEJO_ESTUDIANTIL, fecha: '2026-10-13T21:19:00.000Z', visto: '2026-10-15T16:04:00.000Z' }), false);
  // La regla de siempre sigue: un medio que actualiza su nota no la trae de vuelta.
  assert.equal(fechaDeLaNota({ fecha: '2026-09-28T13:46:08.000Z' }, { fechaAnterior: '2026-09-26T15:00:00.000Z' }), '2026-09-26T15:00:00.000Z');
});

test('no se corrige: lo de una persona, lo sin hora de la fuente, lo propio y lo de antes de que existiera llegaTarde', () => {
  assert.equal(fechaEnvejecidaPorError({ ...CONCEJO_ESTUDIANTIL, como: 'publicada', publicadaPor: 'Hernán' }), false);
  assert.equal(fechaEnvejecidaPorError({ ...CONCEJO_ESTUDIANTIL, publicadaPor: 'Andrés' }), false);
  assert.equal(fechaEnvejecidaPorError({ ...CONCEJO_ESTUDIANTIL, publicadaPor: 'ia' }), true, 'lo que guardó la máquina sí');
  assert.equal(fechaEnvejecidaPorError({ ...CONCEJO_ESTUDIANTIL, sinFecha: true }), false);
  assert.equal(fechaEnvejecidaPorError({ ...CONCEJO_ESTUDIANTIL, propia: 'dolar' }), false);
  // «Roban herramientas de un comercio» (3/09, vista el 23/09 en la primera corrida): antes del 28/09 se publicaba lo viejo.
  assert.equal(fechaEnvejecidaPorError({ ...CONCEJO_ESTUDIANTIL, fecha: '2026-09-03T12:00:00.000Z', visto: '2026-09-23T03:05:00.000Z' }), false);
  assert.ok(Date.parse(DESDE_QUE_NO_SE_ESTRENA_VIEJA) > Date.parse('2026-09-28T00:00:00Z'));
});

test('las horas de un hecho son las del cruce coherente, y más que las de estrenar', () => {
  assert.equal(HORAS_DE_UN_HECHO, CRUCE.coherente.horasEnDesarrollo);
  assert.ok(HORAS_DE_UN_HECHO > 24 && HORAS_DE_UN_HECHO > HORAS_PARA_ESTRENAR);
});

test('generar-datos corrige al leer el archivo y la portada anteriores, antes de tomar la fecha ya publicada', () => {
  const g = fs.readFileSync(path.join(RAIZ, 'web', 'scripts', 'generar-datos.mjs'), 'utf8');
  assert.match(g, /const c = conFechaSinError\(lista\[i\]\);/);
  assert.ok(g.indexOf('conFechaSinError(lista[i])') < g.indexOf('const fechaAntes ='), 'antes de fechaAntes');
  assert.ok(g.indexOf('conFechaSinError(lista[i])') > g.indexOf('const archivoAnterior ='));
});

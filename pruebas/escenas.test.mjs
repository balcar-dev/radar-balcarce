// Las escenas animadas (8/10/2026; docs/propuestas/PLANTILLAS-DE-PIEZAS.md): cada pieza tiene su escena, con todas sus variantes. Propuesta para
// aprobar: todavía no están conectadas a las redes (los ejemplos se arman con `node reels/ejemplos-plantillas.mjs`). Acá se comprueba lo que se puede
// sin ver el video: que cada escena dibuja un SVG entero y sano en todos sus tiempos, que lleva la firma, que no hay números rotos y que cada variante
// del clima se reconoce.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ejemplos, ejemplosDeServicios, ejemplosDeClima, ejemplosDeDeportes, CLIMAS } from '../reels/ejemplos-plantillas.mjs';
import {
  baseDelCielo, nombreDeVariante, etiquetasDelClima, fechaEnLetras, BASES, TODAS_LAS_VARIANTES, TODOS_LOS_AVISOS, escenaDeClima,
} from '../reels/escenas/clima.mjs';
import { partirSvg } from '../reels/animacion.mjs';
import { FPS_ESCENA } from '../reels/escenas/comun.mjs';

const TIEMPOS = [0, 0.4, 1.0, 2.6, 5, 9, 16];

test('el cielo se reconoce por su texto, de día y de noche', () => {
  const casos = {
    Despejado: 'despejado', 'Parcialmente nublado': 'parcial', 'Algo nublado': 'parcial', Nublado: 'nublado', Cubierto: 'nublado', Llovizna: 'llovizna',
    'Llovizna leve': 'llovizna', Lluvia: 'lluvia', 'Chaparrones fuertes': 'lluvia', 'Tormenta eléctrica': 'tormenta', 'Tormenta con granizo': 'tormenta', Niebla: 'niebla', Neblina: 'niebla',
  };
  for (const [cielo, base] of Object.entries(casos)) assert.equal(baseDelCielo(cielo), base, cielo);
  assert.equal(baseDelCielo(''), 'despejado', 'sin dato, despejado: nunca se rompe');
  assert.equal(nombreDeVariante({ cielo: 'Lluvia', esDeDia: false }), 'lluvia-noche');
  assert.equal(TODAS_LAS_VARIANTES.length, BASES.length * 2, 'siete cielos, de día y de noche');
  assert.deepEqual(TODOS_LOS_AVISOS, ['helada', 'granizo', 'viento']);
});

test('las etiquetas chicas del clima: helada, calor y viento fuerte, y de noche la mínima es la de esta noche', () => {
  const hoy = { max: 24, min: 2, viento: 15 };
  assert.deepEqual(etiquetasDelClima({ ahora: { viento: 10 }, hoy, momento: 'manana' }).map((e) => e.texto), ['Helada']);
  assert.deepEqual(etiquetasDelClima({ ahora: { viento: 10 }, hoy: { max: 34, min: 20 }, momento: 'manana' }).map((e) => e.texto), ['Calor']);
  assert.deepEqual(etiquetasDelClima({ ahora: { viento: 45 }, hoy: { max: 20, min: 10 }, momento: 'manana' }).map((e) => e.texto), ['Viento fuerte']);
  assert.deepEqual(etiquetasDelClima({ ahora: {}, hoy: { max: 20, min: 10 }, manana: { max: 18, min: 1 }, momento: 'noche' }).map((e) => e.texto), ['Helada'], 'de noche cuenta la mínima de la madrugada que viene');
  assert.deepEqual(etiquetasDelClima({ ahora: {}, hoy: { max: 20, min: 10 }, momento: 'manana' }), []);
  assert.equal(fechaEnLetras('2026-10-09'), 'Viernes 9 de octubre');
});

test('cada ejemplo dibuja un SVG entero y sano en todos los tiempos, con la firma y sin números rotos', () => {
  const todos = [...ejemplos(), ...ejemplosDeClima(), ...ejemplosDeServicios(), ...ejemplosDeDeportes()];
  assert.ok(todos.length >= 50, `hay ${todos.length} ejemplos`);
  for (const e of todos) {
    assert.equal(e.escena.fps, FPS_ESCENA);
    for (const t of TIEMPOS) {
      const svg = e.escena.cuadro(t, 16);
      assert.match(svg, /^<svg [^>]*width="1080" height="1920"/, `${e.nombre} @${t}`);
      assert.ok(!/NaN|undefined|Infinity|\[object/.test(svg), `${e.nombre} @${t}: hay un valor roto`);
      assert.ok(partirSvg(svg), `${e.nombre} @${t}: el SVG no se puede partir (etiquetas sin cerrar)`);
      assert.ok(svg.includes('radarbalcarce.com'), `${e.nombre} @${t}: falta la firma`);
    }
    assert.ok(e.guion.length > 40, `${e.nombre}: tiene guion`);
  }
});

test('el clima tiene su variante para cada cielo, de día y de noche, y para cada aviso', () => {
  const clima = (cielo, esDeDia) => ({ ...CLIMAS.sol, ahora: { ...CLIMAS.sol.ahora, cielo, esDeDia } });
  const vistos = new Set();
  for (const v of TODAS_LAS_VARIANTES) {
    const cielo = { despejado: 'Despejado', parcial: 'Parcialmente nublado', nublado: 'Nublado', llovizna: 'Llovizna', lluvia: 'Lluvia', tormenta: 'Tormenta', niebla: 'Niebla' }[v.base];
    const escena = escenaDeClima({ momento: v.noche ? 'noche' : 'manana', clima: clima(cielo, !v.noche), fecha: '2026-10-09' });
    assert.equal(escena.variante, v.nombre);
    for (const t of [0.5, 3, 8]) assert.ok(partirSvg(escena.cuadro(t)), `${v.nombre} @${t}`);
    vistos.add(escena.variante);
  }
  assert.equal(vistos.size, 14);
  for (const tipo of TODOS_LOS_AVISOS) {
    const escena = escenaDeClima({
      momento: 'aviso', clima: CLIMAS.helada, fecha: '2026-10-09', aviso: { tipo, titulo: `Aviso de ${tipo}`, texto: 'Un texto de ejemplo con lo que hay que saber y hacer.', dia: '2026-10-09' },
    });
    assert.equal(escena.variante, `aviso-${tipo}`);
    for (const t of [0.5, 3, 8]) assert.ok(partirSvg(escena.cuadro(t)), `aviso ${tipo} @${t}`);
  }
});

test('el tiempo se acaba con la última pieza: una escena sin lluvia de datos de lluvia no escribe "0 %"', () => {
  const sinLluvia = { ...CLIMAS.sol, dias: CLIMAS.sol.dias.map((d) => ({ ...d, lluvia: null })) };
  const svg = escenaDeClima({ momento: 'manana', clima: sinLluvia, fecha: '2026-10-09' }).cuadro(8);
  assert.ok(!/>0%</.test(svg) && !/>null%</.test(svg), 'sin dato de lluvia no se dibuja ningún porcentaje');
});

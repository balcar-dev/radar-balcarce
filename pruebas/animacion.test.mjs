// La animación de las piezas (8/10/2026, "videos animados y unificados"): cada bloque de la placa entra de a uno, la firma de abajo está desde
// el principio y, pasada la entrada, el cuadro es la placa de siempre (sin nada que tiemble: regla 90). Sin ffmpeg ni resvg: son funciones de
// texto. El armado del video con ffmpeg lo prueba reel-dos-placas.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  partirSvg, clasificar, esperas, duracionDeLaEntrada, cuadrosDeLaEntrada, placaEn, comoContador, ENTRADA, CONTADOR, FPS,
} from '../reels/animacion.mjs';
import {
  placaParticipa, placaRepaso, placaFarmacia, placaEfemeride, placaAgenda, placaUtiles, COLORES,
} from '../reels/placa.mjs';

const sinEspacios = (s) => s.replace(/\s+/g, '');

const PLACAS = {
  participa: () => placaParticipa({ rotulo: 'Tu reclamo', pregunta: '¿Hay algo en tu cuadra que hace rato espera arreglo?', pie1: 'Contanos qué y dónde.', pie2: 'Lo chequeamos antes de publicar.', mail: 'redaccion@radarbalcarce.com' }),
  efemeride: () => placaEfemeride({ rotulo: 'Un día como hoy', grande: '1872', titulo: 'Se publica el Martín Fierro', cuerpo: 'José Hernández lo publica en Buenos Aires.' }),
  agenda: () => placaAgenda({ eventos: [{ titulo: 'Peña folklórica', cuando: 'Sábado 21:00', lugar: 'Club Ferroviarios' }] }),
};

test('una placa se parte en sus bloques de primer nivel, y el fondo y la firma se reconocen', () => {
  for (const [nombre, hacer] of Object.entries(PLACAS)) {
    const p = partirSvg(hacer());
    assert.ok(p, nombre);
    const c = clasificar(p.hijos);
    assert.equal(c[0].tipo, 'fijo', `${nombre}: el fondo no se anima`);
    assert.ok(c.filter((x) => x.tipo === 'bloque').length >= 2, `${nombre}: tiene bloques que entran`);
    assert.ok(c.filter((x) => x.tipo === 'pie').length >= 2, `${nombre}: la firma de abajo (raya, "Radar Balcarce" y la dirección) va aparte`);
    // Partida y vuelta a juntar, es la misma placa.
    assert.equal(sinEspacios(p.apertura + p.hijos.join('') + '</svg>'), sinEspacios(hacer()), nombre);
  }
});

test('un texto con etiquetas adentro (la firma con "Balcarce" en rojo) queda en un solo bloque', () => {
  const p = partirSvg('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="#fff"/><text x="72" y="1544">Radar <tspan fill="#C7381C">Balcarce</tspan>\n</text></svg>');
  assert.equal(p.hijos.length, 2);
  assert.match(p.hijos[1], /tspan/);
});

test('lo que no se puede partir devuelve null y la pieza sigue con la placa quieta', () => {
  assert.equal(partirSvg('no es un svg'), null);
  assert.equal(partirSvg('<svg width="1"><g></svg>'), null);
});

test('al empezar sólo se ve el fondo y la firma, y pasada la entrada el cuadro es la placa original', () => {
  const svg = PLACAS.participa();
  const p = partirSvg(svg);
  const inicio = placaEn(p, 0);
  assert.ok(!inicio.includes('ESCRIBINOS'), 'la franja verde todavía no entró');
  assert.ok(!inicio.includes('TU RECLAMO'), 'el rótulo tampoco, en el primer cuadro');
  assert.ok(inicio.includes('radarbalcarce.com'), 'la firma está (aunque se aclara de a poco)');
  const fin = placaEn(p, duracionDeLaEntrada(p) + 0.05);
  assert.equal(sinEspacios(fin), sinEspacios(svg), 'sin ningún envoltorio ni movimiento al terminar');
  assert.ok(!fin.includes('translate('), 'nada quedó corrido');
});

test('mientras entra, cada bloque sube desde abajo y aparece; nunca baja de más ni se pasa de su lugar', () => {
  const p = partirSvg(PLACAS.participa());
  const medio = placaEn(p, 0.35);
  const corrimientos = [...medio.matchAll(/translate\(0 ([\d.]+)\)/g)].map((m) => Number(m[1]));
  assert.ok(corrimientos.length > 0);
  assert.ok(corrimientos.every((y) => y > 0 && y <= ENTRADA.sube), 'siempre hacia arriba y como mucho lo que sube');
  assert.ok([...medio.matchAll(/opacity="([\d.]+)"/g)].every((m) => Number(m[1]) <= 1));
});

test('la entrada dura poco, aunque la placa tenga muchos renglones (una lista de diez no tarda más de la cuenta)', () => {
  const muchas = placaUtiles({ grupos: Array.from({ length: 6 }, (_, i) => ({ categoria: `Grupo ${i}`, items: [{ nombre: `Servicio ${i}`, numero: `Teléfono ${i}` }] })) });
  for (const svg of [PLACAS.participa(), PLACAS.efemeride(), muchas]) {
    const p = partirSvg(svg);
    assert.ok(duracionDeLaEntrada(p) <= ENTRADA.tope + CONTADOR.duracion, `${duracionDeLaEntrada(p)} s`);
    assert.ok(cuadrosDeLaEntrada(p) <= Math.ceil((ENTRADA.tope + CONTADOR.duracion) * FPS) + 1);
  }
  const e = esperas(30);
  assert.ok(e.at(-1) + ENTRADA.duracion <= ENTRADA.tope + 0.001, 'con treinta bloques se achica la espera');
  assert.deepEqual(esperas(0), []);
});

test('el reel arma la animación y la barra de avance, la apaga con REELS_ANIMADOS=no y limpia sus cuadros', () => {
  const reel = fs.readFileSync(new URL('../reels/reel.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(reel, /REELS_ANIMADOS !== 'no'/);
  assert.match(reel, /renderizarEntrada/);
  assert.match(reel, /overlay=x='-w\+w\*t\//, 'la barra de avance corre durante toda la pieza');
  assert.match(reel, /limpiarAnimacion\(dir, nombre\)/);
  assert.match(reel, /la animación de \$\{nombre\} no se pudo armar y sale con la placa quieta/, 'si falla, la pieza sale quieta');
  assert.ok(COLORES.rojo.toLowerCase() === '#c7381c' && reel.includes('0xC7381C'), 'la barra es el rojo de la marca');
});

test('la cifra grande cuenta: la temperatura sube desde cero y el año corre hacia atrás hasta el del hecho (8/10)', () => {
  const grande = (txt, tam = 296) => `<text x="106" y="874" font-family="Source Serif 4 60pt" font-size="${tam}" font-weight="900" fill="#FFFFFF">${txt}</text>`;
  assert.equal(comoContador(grande('9°')).valor, 9);
  assert.equal(comoContador(grande('-3°')).valor, -3);
  assert.equal(comoContador(grande('1872')).esAnio, true);
  assert.equal(comoContador(grande('12')).esAnio, false);
  assert.equal(comoContador(grande('9°', 60)), null, 'un número chico no cuenta');
  assert.equal(comoContador('<text font-size="300">Hola</text>'), null);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="#fff"/>${grande('20°')}${grande('1872')}</svg>`;
  const p = partirSvg(svg);
  const numeros = (t) => [...placaEn(p, t, { anio: 2026 }).matchAll(/>(-?\d+)(°)?<\/text>/g)].map((m) => Number(m[1]));
  const medio = numeros(0.5);
  assert.ok(medio[0] > 0 && medio[0] < 20, `la temperatura va subiendo: ${medio[0]}`);
  assert.ok(medio[1] > 1872 && medio[1] < 2026, `el año va corriendo hacia atrás: ${medio[1]}`);
  const fin = placaEn(p, duracionDeLaEntrada(p) + 0.05, { anio: 2026 });
  assert.ok(fin.includes('>20°<') && fin.includes('>1872<'), 'termina en el valor verdadero');
  assert.ok(!fin.includes('<g '), 'y sin ningún envoltorio');
});

test('en las placas de verdad, el clima de la mañana y la efeméride tienen su cifra que cuenta', () => {
  const e = partirSvg(PLACAS.efemeride());
  assert.equal(clasificar(e.hijos).filter((c) => comoContador(c.h)).length, 1);
});

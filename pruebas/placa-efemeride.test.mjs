// La placa de "Un día como hoy" y de los feriados (29/09): mismo diseño que las
// demás placas (papel, serif, pie con la firma) y sin nombrar otro medio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placaEfemeride, COLOR_FERIADO, COLORES, ANCHO, ALTO } from '../reels/placa.mjs';

test('la placa de una efeméride lleva el pie de siempre y el rótulo en su color', () => {
  const svg = placaEfemeride({ rotulo: 'Dato curioso', grande: '1952', titulo: 'Primera patente del código de barras', cuerpo: 'Se otorgó en Estados Unidos.' });
  assert.match(svg, new RegExp(`width="${ANCHO}" height="${ALTO}"`));
  assert.match(svg, /DATO CURIOSO/);
  assert.match(svg, /1952/);
  assert.match(svg, /Radar <tspan/);
  assert.match(svg, /radarbalcarce\.com/);
  assert.ok(svg.includes(COLORES.papel));
});

test('el feriado usa su azul y una cifra larga no se sale del margen', () => {
  const svg = placaEfemeride({ rotulo: 'Censo 2022', grande: '1.306.730', titulo: 'personas se reconocieron indígenas o descendientes', color: COLOR_FERIADO });
  assert.ok(svg.includes(COLOR_FERIADO));
  // 1.306.730 son 9 caracteres: cuerpo chico (150), para que entre en el ancho útil.
  assert.match(svg, /font-size="150"[^>]*>|font-size="150"/);
});

test('ninguna placa de efeméride nombra a otro medio', () => {
  const svg = placaEfemeride({ rotulo: 'Un día como hoy', titulo: '7 de octubre', cuerpo: 'Miércoles 7 de octubre de 2026' });
  assert.doesNotMatch(svg, /Infobae|Clarín|Wikipedia|La Vanguardia/i);
});

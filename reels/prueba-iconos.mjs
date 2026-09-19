// Renderiza los tres íconos del clima uno al lado del otro, para poder
// mirarlos sin esperar a que cambie el tiempo. Es una herramienta de
// revisión, no forma parte de lo que se publica.
//   node reels/prueba-iconos.mjs
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const rayos = (cx, cy, d, h) => Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4; const x = Math.cos(a); const y = Math.sin(a);
  return `M${(cx + x * d).toFixed(1)} ${(cy + y * d).toFixed(1)}L${(cx + x * h).toFixed(1)} ${(cy + y * h).toFixed(1)}`;
}).join('');

const nube = (y, c) => `<g transform="translate(0 ${y})">`
  + `<circle cx="46" cy="50" r="17" fill="${c}"/><circle cx="28" cy="58" r="12" fill="${c}"/>`
  + `<circle cx="62" cy="57" r="13" fill="${c}"/><rect x="28" y="56" width="34" height="14" rx="7" fill="${c}"/></g>`;

const sol = `<g stroke="#E8A33C" stroke-width="5" stroke-linecap="round"><path d="${rayos(48, 48, 26, 35)}"/></g>`
  + '<circle cx="48" cy="48" r="18" fill="#E8A33C"/>';
const nublado = `<g stroke="#E8A33C" stroke-width="4" stroke-linecap="round"><path d="${rayos(62, 30, 19, 26)}"/></g>`
  + `<circle cx="62" cy="30" r="13" fill="#E8A33C"/>${nube(6, '#E7EDF0')}`;
const lluvia = `${nube(-12, '#C8D4DB')}<g stroke="#7FBCE8" stroke-width="5" stroke-linecap="round">`
  + '<path d="M33 62v8"/><path d="M47 62v8"/><path d="M61 62v8"/></g>';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="330" height="120" viewBox="0 0 330 120">
<rect width="330" height="120" fill="#1D4F63"/>
<g transform="translate(6 12)">${sol}</g>
<g transform="translate(116 12)">${nublado}</g>
<g transform="translate(226 12)">${lluvia}</g></svg>`;

const destino = path.join(import.meta.dirname, 'salida', 'iconos.png');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, new Resvg(svg, { fitTo: { mode: 'width', value: 660 } }).render().asPng());
console.log('  listo:', destino);

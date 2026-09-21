// La foto de portada de la página de Facebook.
//
//   node reels/portada.mjs
//
// 1640 x 624: el tamaño que pide Facebook para verse nítida en pantallas
// grandes. En el celular la recorta de los costados y en la PC muestra toda
// la franja, así que lo importante va en el centro y los anillos del radar
// llenan el resto sin decir nada que se pueda perder.

import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const AQUI = import.meta.dirname;
const FUENTES = path.join(AQUI, 'marca', 'fuentes');
const DESTINO = path.join(AQUI, 'salida', 'portada-facebook.png');

const archivos = fs.existsSync(FUENTES)
  ? fs.readdirSync(FUENTES).filter((f) => /\.(ttf|otf)$/i.test(f)).map((f) => path.join(FUENTES, f))
  : [];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1640" height="624" viewBox="0 0 1640 624">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1D4F63"/>
      <stop offset="55%" stop-color="#14161A"/>
    </linearGradient>
  </defs>
  <rect width="1640" height="624" fill="url(#fondo)"/>
  <g fill="none" stroke="#C7381C">
    <circle cx="820" cy="312" r="230" stroke-width="4" stroke-opacity="0.5"/>
    <circle cx="820" cy="312" r="380" stroke-width="3" stroke-opacity="0.28"/>
    <circle cx="820" cy="312" r="540" stroke-width="3" stroke-opacity="0.16"/>
    <circle cx="820" cy="312" r="720" stroke-width="3" stroke-opacity="0.09"/>
  </g>
  <text x="820" y="300" text-anchor="middle" font-family="Fraunces" font-weight="900"
        font-size="120" fill="#F4F1EA" letter-spacing="-5">RADAR <tspan fill="#C7381C">BALCARCE</tspan></text>
  <circle cx="820" cy="352" r="9" fill="#E8A33C"/>
  <text x="820" y="416" text-anchor="middle" font-family="IBM Plex Sans" font-weight="600"
        font-size="34" fill="#F4F1EA" fill-opacity="0.85" letter-spacing="1">Lo que pasa en Balcarce, la región y el país</text>
</svg>`;

const r = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1640 },
  font: { fontFiles: archivos, loadSystemFonts: archivos.length === 0, defaultFontFamily: 'IBM Plex Sans' },
});

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, r.render().asPng());
console.log(`  listo: ${DESTINO}`);

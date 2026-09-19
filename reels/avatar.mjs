// La foto de perfil de las redes.
//
//   node reels/avatar.mjs
//
// Cuadrada y con todo lo importante bien adentro del centro, porque
// Instagram y Facebook la recortan en círculo: lo que quede en las esquinas
// no se ve. Usa las mismas tipografías que las placas y la web, así el
// perfil y el sitio se reconocen como del mismo medio.

import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const AQUI = import.meta.dirname;
const FUENTES = path.join(AQUI, 'marca', 'fuentes');
const DESTINO = path.join(AQUI, 'salida', 'avatar.png');

const archivos = fs.existsSync(FUENTES)
  ? fs.readdirSync(FUENTES).filter((f) => /\.(ttf|otf)$/i.test(f)).map((f) => path.join(FUENTES, f))
  : [];

// El círculo naranja del centro es el "radar": un punto y dos anillos. No es
// un logo elaborado, y a este tamaño es mejor así — en la lista de historias
// de Instagram esto se ve a 60 píxeles.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1D4F63"/>
      <stop offset="55%" stop-color="#14161A"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#fondo)"/>
  <g fill="none" stroke="#C7381C">
    <circle cx="540" cy="540" r="300" stroke-width="5" stroke-opacity="0.5"/>
    <circle cx="540" cy="540" r="420" stroke-width="4" stroke-opacity="0.22"/>
  </g>
  <circle cx="540" cy="548" r="22" fill="#E8A33C"/>
  <text x="540" y="470" text-anchor="middle" font-family="Fraunces" font-weight="900"
        font-size="138" fill="#F4F1EA" letter-spacing="-6">RADAR</text>
  <text x="540" y="700" text-anchor="middle" font-family="Fraunces" font-weight="900"
        font-size="116" fill="#C7381C" letter-spacing="-4">BALCARCE</text>
</svg>`;

const r = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1080 },
  font: { fontFiles: archivos, loadSystemFonts: archivos.length === 0, defaultFontFamily: 'IBM Plex Sans' },
});

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, r.render().asPng());
console.log(`  listo: ${DESTINO}`);

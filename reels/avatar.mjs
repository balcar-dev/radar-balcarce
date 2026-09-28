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

// El círculo del centro es el "radar": un punto y dos anillos, el mismo
// ícono que va en la esquina de todas las piezas del rediseño (dirección B,
// PROPUESTA-REDES.md). Acá va solo, sin texto: con la foto recortada en
// círculo (así la muestran Instagram y Facebook) y vista a 60 píxeles, el
// nombre no se leía y sobraba ruido. El fondo es el rojo de la marca
// (MEDIA-KIT.md: "el perfil se mantiene siempre en el rojo de la marca"),
// no el color de una sección — así se lo reconoce igual aunque cambien los
// colores de las piezas alrededor.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#C7381C"/>
      <stop offset="60%" stop-color="#9C2B15"/>
      <stop offset="100%" stop-color="#14161A"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#fondo)"/>
  <g fill="none" stroke="#F4F1EA">
    <circle cx="540" cy="540" r="300" stroke-width="9" stroke-opacity="0.85"/>
    <circle cx="540" cy="540" r="420" stroke-width="7" stroke-opacity="0.4"/>
  </g>
  <circle cx="540" cy="548" r="40" fill="#E8A33C"/>
</svg>`;

const r = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1080 },
  font: { fontFiles: archivos, loadSystemFonts: archivos.length === 0, defaultFontFamily: 'Inter' },
});

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, r.render().asPng());
console.log(`  listo: ${DESTINO}`);

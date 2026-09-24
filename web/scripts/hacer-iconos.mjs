// Genera los íconos del sitio a partir de un dibujo vectorial.
//
//   node web/scripts/hacer-iconos.mjs
//
// Deja en web/public: favicon.ico (16, 32 y 48), icon-192.png, icon-512.png y
// apple-touch-icon.png (180). Se corre una vez y los archivos se versionan:
// no hace falta volver a correrlo salvo que cambie el dibujo. Usa resvg, que
// ya está en el proyecto para las placas de los reels.

import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const SALIDA = path.join(import.meta.dirname, '..', 'public');

// Una "R" gruesa sobre fondo oscuro y un punto rojo, como un blip de radar.
// Las mismas tintas de la marca (globals.css).
const svg = (redondeo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="${redondeo}" fill="#14161A"/>
  <path fill="#F4F1EA" fill-rule="evenodd" d="M16 14h18.5a11.5 11.5 0 0 1 3.4 22.5L47 50H35.2l-7.4-12H27v12H16zM27 23v9h7.3a4.5 4.5 0 0 0 0-9z"/>
  <circle cx="50" cy="14.5" r="5.5" fill="#C7381C"/>
</svg>`;

const png = (tam, redondeo = 12) => new Resvg(svg(redondeo), { fitTo: { mode: 'width', value: tam } }).render().asPng();

fs.mkdirSync(SALIDA, { recursive: true });
fs.writeFileSync(path.join(SALIDA, 'icon-192.png'), png(192));
fs.writeFileSync(path.join(SALIDA, 'icon-512.png'), png(512));
// iOS redondea solo las esquinas: se le da el cuadrado entero.
fs.writeFileSync(path.join(SALIDA, 'apple-touch-icon.png'), png(180, 0));

// favicon.ico: un contenedor con varios PNG adentro.
const tamanos = [16, 32, 48];
const imagenes = tamanos.map((t) => png(t, t <= 16 ? 3 : 6));
const cabecera = Buffer.alloc(6);
cabecera.writeUInt16LE(0, 0); // reservado
cabecera.writeUInt16LE(1, 2); // tipo: ícono
cabecera.writeUInt16LE(tamanos.length, 4);
let desplazamiento = 6 + 16 * tamanos.length;
const entradas = tamanos.map((t, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(t, 0); e.writeUInt8(t, 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(imagenes[i].length, 8); e.writeUInt32LE(desplazamiento, 12);
  desplazamiento += imagenes[i].length;
  return e;
});
fs.writeFileSync(path.join(SALIDA, 'favicon.ico'), Buffer.concat([cabecera, ...entradas, ...imagenes]));
console.log('Íconos listos en web/public');

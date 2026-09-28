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

// El mismo "radar" de la foto de perfil y de todas las placas (reels/avatar.mjs,
// reels/placa.mjs): dos anillos y un punto ámbar corrido del centro, sobre el
// rojo de la marca. Antes era una "R" sobre fondo oscuro, sin relación con el
// resto del rediseño (dirección B, 28/09): un ícono de pestaña que no se
// parecía a nada del medio en Instagram o Facebook.
const svg = (redondeo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#C7381C"/>
      <stop offset="100%" stop-color="#9C2B15"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="${redondeo}" fill="url(#fondo)"/>
  <g fill="none" stroke="#F4F1EA">
    <circle cx="32" cy="32" r="14" stroke-width="3.4" stroke-opacity="0.9"/>
    <circle cx="32" cy="32" r="23" stroke-width="2.6" stroke-opacity="0.45"/>
  </g>
  <circle cx="32" cy="32.6" r="4.6" fill="#E8A33C"/>
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

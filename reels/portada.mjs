// La foto de portada de la página de Facebook.
//
//   node reels/portada.mjs [carpeta-de-salida]
//
// 1640 x 924 (16:9), UNA sola imagen que tiene que verse bien en dos recortes:
//
//   - Celular: Facebook muestra la portada en 16:9 (640 x 360), o sea entera, pero
//     el avatar redondo tapa el centro-abajo (desde ~54 % de la altura) y la barra
//     de estado y los botones tapan el borde de arriba.
//   - Computadora: la muestra a 820 x 312 (2,63:1): recorta arriba y abajo y deja la
//     franja central (en esta imagen, de la fila 150 a la 774). El avatar cae abajo
//     a la izquierda.
//
// La marca y la bajada van en la ZONA SEGURA COMÚN: dentro de esa franja central,
// por arriba del avatar del celular y lejos de los costados. Ver FORMATOS.md.
// Los anillos del radar son el fondo: si el recorte los corta, no se pierde nada.

import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const AQUI = import.meta.dirname;
const FUENTES = path.join(AQUI, 'marca', 'fuentes');

export const ANCHO = 1640;
export const ALTO = 924;

/** Lo que muestra Facebook en escritorio: 2,63:1 centrado. */
export const RECORTE_ESCRITORIO = { ancho: ANCHO, alto: 624, y: (ALTO - 624) / 2 };
/** Lo que muestra en el celular: 16:9 (la imagen entera). */
export const RECORTE_CELULAR = { ancho: ANCHO, alto: ALTO, y: 0 };
/** Avatar en el celular (medido de una captura): centrado, ~44 % del ancho, arriba a ~54 % del alto. */
export const AVATAR_CELULAR = { cx: ANCHO / 2, cy: Math.round(ALTO * 0.54) + Math.round(ANCHO * 0.22), r: Math.round(ANCHO * 0.22) };
/** Avatar en escritorio: abajo a la izquierda (aproximado; el centro queda libre). */
export const AVATAR_ESCRITORIO = { cx: 260, cy: 774, r: 190 };

/**
 * Zona segura común: el texto tiene que caer dentro de esta caja.
 * Arriba: fila 190 (debajo de la barra de estado del celular y del recorte de escritorio, que empieza en 150).
 * Abajo: fila 425 (antes del avatar del celular, que arranca a ~499 y puede subir algo).
 * Costados: se dejan 220 px por lado (el celular puede recortar un poco más).
 */
export const ZONA_SEGURA = { x: 220, y: 190, ancho: ANCHO - 440, alto: 425 - 190 };

const TAM_MARCA = 118;
const Y_MARCA = 318; // línea de base
const Y_BAJADA = 396;
const TAM_BAJADA = 36;
export const BAJADA = 'Lo que pasa en Balcarce, la región y el país';

const marcaSvg = (extra = '') => `<text x="${ANCHO / 2}" y="${Y_MARCA}" text-anchor="middle" font-family="Fraunces" font-weight="900"
        font-size="${TAM_MARCA}" fill="#F4F1EA" letter-spacing="-4"${extra}>RADAR <tspan fill="#C7381C">BALCARCE</tspan></text>`;
const bajadaSvg = () => `<text x="${ANCHO / 2}" y="${Y_BAJADA}" text-anchor="middle" font-family="IBM Plex Sans" font-weight="600"
        font-size="${TAM_BAJADA}" fill="#F4F1EA" fill-opacity="0.85" letter-spacing="1">${BAJADA}</text>`;

const envolver = (contenido) => `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">${contenido}</svg>`;

export function svgPortada() {
  const cx = ANCHO / 2, cy = 300;
  return envolver(`
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1D4F63"/>
      <stop offset="55%" stop-color="#14161A"/>
    </linearGradient>
  </defs>
  <rect width="${ANCHO}" height="${ALTO}" fill="url(#fondo)"/>
  <g fill="none" stroke="#C7381C">
    <circle cx="${cx}" cy="${cy}" r="200" stroke-width="4" stroke-opacity="0.5"/>
    <circle cx="${cx}" cy="${cy}" r="360" stroke-width="3" stroke-opacity="0.3"/>
    <circle cx="${cx}" cy="${cy}" r="540" stroke-width="3" stroke-opacity="0.18"/>
    <circle cx="${cx}" cy="${cy}" r="740" stroke-width="3" stroke-opacity="0.1"/>
    <circle cx="${cx}" cy="${cy}" r="960" stroke-width="3" stroke-opacity="0.06"/>
  </g>
  ${marcaSvg()}
  <circle cx="${cx}" cy="350" r="8" fill="#E8A33C"/>
  ${bajadaSvg()}`);
}

const opciones = () => {
  const archivos = fs.existsSync(FUENTES)
    ? fs.readdirSync(FUENTES).filter((f) => /\.(ttf|otf)$/i.test(f)).map((f) => path.join(FUENTES, f))
    : [];
  return { font: { fontFiles: archivos, loadSystemFonts: archivos.length === 0, defaultFontFamily: 'IBM Plex Sans' } };
};

/** Cajas reales (medidas con las tipografías) de la marca y la bajada. */
export function cajasDeTexto() {
  const medir = (nodo) => {
    const b = new Resvg(envolver(nodo), opciones()).getBBox();
    return { x: b.x, y: b.y, ancho: b.width, alto: b.height };
  };
  return { marca: medir(marcaSvg()), bajada: medir(bajadaSvg()) };
}

export function renderPortada() {
  return new Resvg(svgPortada(), { ...opciones(), fitTo: { mode: 'width', value: ANCHO } }).render().asPng();
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const destino = path.join(process.argv[2] || path.join(AQUI, 'salida'), 'portada-facebook.png');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, renderPortada());
  console.log(`  listo: ${destino}`);
}

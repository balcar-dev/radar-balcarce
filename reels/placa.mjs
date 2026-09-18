// Las placas de Radar Balcarce: se dibujan por código, en SVG, y se
// convierten a imagen. Nunca se usa la foto de otro medio.
//
// La marca es el radar: círculos concéntricos y un barrido, en el color de
// cada sección. Cambia el color y el dato, nunca la estructura, así cualquiera
// que la ve de reojo en el teléfono sabe que es nuestra.

import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

export const ANCHO = 1080;
export const ALTO = 1920;

export const COLORES = {
  tinta: '#14161A',
  papel: '#F7F5EF',
  suave: '#B9BDB4',
  rojo: '#A8371F',
  ambar: '#E8A33C',
  verde: '#16615B',
};

// Cada sección tiene su color, siempre el mismo.
export const COLOR_SECCION = {
  Balcarce: '#A8371F',
  Servicios: '#16615B',
  Deportes: '#16615B',
  Automovilismo: '#E8A33C',
  Policiales: '#8C2D18',
  Política: '#A8371F',
  Agro: '#6B7A2A',
  'Cultura y agenda': '#7A4B8C',
  País: '#4A4F4B',
  Región: '#4A4F4B',
  Clima: '#16615B',
  Farmacias: '#A8371F',
  Tecnología: '#2B6CB0',
  Reclamos: '#8C2D18',
  Seguimiento: '#6B7A2A',
};

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Ilustración de fondo por sección.
 *
 * La idea: NO se genera una imagen por noticia. Se hace UNA ilustración por
 * sección, con nuestra estética, y se reusa siempre. Así la placa deja de ser
 * fría sin que nadie pueda confundirla con la foto del hecho, y sin gastar en
 * generar imágenes todos los días.
 *
 * Basta con dejar el archivo en reels/marca/fondos/<seccion>.png y aparece
 * solo. Si no está, la placa sale como hasta ahora.
 */
const CARPETA_FONDOS = path.join(import.meta.dirname, 'marca', 'fondos');

export function fondoDeSeccion(seccion) {
  if (!seccion) return null;
  const slug = String(seccion).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const nombre of [`${slug}.png`, `${slug}.jpg`, 'general.png']) {
    const ruta = path.join(CARPETA_FONDOS, nombre);
    if (fs.existsSync(ruta)) {
      const tipo = nombre.endsWith('.jpg') ? 'jpeg' : 'png';
      return `data:image/${tipo};base64,${fs.readFileSync(ruta).toString('base64')}`;
    }
  }
  return null;
}

/** La ilustración a sangre, oscurecida para que el texto siempre se lea. */
function capaFondo(dataUri) {
  if (!dataUri) return '';
  return `
  <image href="${dataUri}" x="0" y="0" width="${ANCHO}" height="${ALTO}"
         preserveAspectRatio="xMidYMid slice" opacity="0.55"/>
  <defs>
    <linearGradient id="velo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#14161A" stop-opacity="0.92"/>
      <stop offset="45%" stop-color="#14161A" stop-opacity="0.70"/>
      <stop offset="100%" stop-color="#14161A" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect width="${ANCHO}" height="${ALTO}" fill="url(#velo)"/>`;
}

/** Corta un texto en renglones de a lo sumo `ancho` caracteres. */
export function envolver(texto, ancho) {
  const palabras = String(texto).split(/\s+/);
  const renglones = []; let actual = '';
  for (const p of palabras) {
    if ((`${actual} ${p}`).trim().length > ancho && actual) { renglones.push(actual); actual = p; }
    else actual = (`${actual} ${p}`).trim();
  }
  if (actual) renglones.push(actual);
  return renglones;
}

/** El barrido del radar, que es el fondo de todas las placas. */
function radar(color, { cx = 980, cy = 380, escala = 1 } = {}) {
  const anillos = [260, 420, 580, 760, 960].map((r) => `
    <circle cx="${cx}" cy="${cy}" r="${r * escala}" fill="none"
            stroke="${color}" stroke-width="2" opacity="${0.42 - r / 3400}"/>`).join('');
  return `
  <defs>
    <radialGradient id="barrido" cx="${cx}" cy="${cy}" r="${960 * escala}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="${color}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${960 * escala}" fill="url(#barrido)"/>
  ${anillos}
  <path d="M ${cx} ${cy} L ${cx - 960 * escala} ${cy - 360 * escala} A ${960 * escala} ${960 * escala} 0 0 1 ${cx - 860 * escala} ${cy + 430 * escala} Z"
        fill="${color}" opacity="0.10"/>`;
}

/**
 * La chapa de arriba: sólo el logo. El horario de publicación no va: es dato
 * interno nuestro y al que mira la pieza no le dice nada.
 * Va a 170 px del borde y no más arriba: Instagram tapa la franja superior
 * con su propia interfaz, y el zoom del video se come otro poco.
 */
function cabecera(_hora, color) {
  return `
  <rect x="0" y="0" width="${ANCHO}" height="10" fill="${color}"/>
  <text x="72" y="196" font-family="Georgia, serif" font-size="42" font-weight="bold" fill="${COLORES.papel}">
    RADAR <tspan fill="${COLORES.ambar}">BALCARCE</tspan>
  </text>`;
}

/** El pie, arriba de la zona donde van los subtítulos. */
function pie(texto, color) {
  return `
  <rect x="72" y="${ALTO - 150}" width="8" height="52" fill="${color}"/>
  <text x="104" y="${ALTO - 112}" font-family="Segoe UI, sans-serif" font-size="27"
        fill="${COLORES.suave}">${esc(texto)}</text>`;
}

/**
 * `cajas` son los tres datos chicos de abajo: los decide quien llama, para que
 * la placa de la mañana y la de la tarde no digan lo mismo. Nunca va la fuente.
 */
export function placaClima({
  temp, cielo, max, min, fecha, hora = '07:30',
  kicker = 'EL CLIMA DE HOY', cajas = [],
}) {
  const color = COLOR_SECCION.Clima;
  const caja = (x, titulo, valor) => `
    <rect x="${x}" y="1180" width="292" height="150" rx="14" fill="#ffffff" fill-opacity="0.09"/>
    <text x="${x + 28}" y="1234" font-family="Segoe UI, sans-serif" font-size="24" font-weight="700"
          letter-spacing="3" fill="${COLORES.suave}">${esc(titulo)}</text>
    <text x="${x + 28}" y="1296" font-family="Segoe UI, sans-serif" font-size="40" font-weight="600"
          fill="${COLORES.papel}">${esc(valor)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <rect width="${ANCHO}" height="${ALTO}" fill="${COLORES.tinta}"/>
  ${radar(color, { cx: 820, cy: 700 })}
  ${cabecera(hora, color)}
  <text x="72" y="360" font-family="Segoe UI, sans-serif" font-size="30" font-weight="700"
        letter-spacing="7" fill="${COLORES.ambar}">${esc(kicker)}</text>
  <text x="72" y="450" font-family="Georgia, serif" font-size="66" font-weight="bold"
        fill="${COLORES.papel}">${esc(fecha)}</text>
  <text x="66" y="880" font-family="Georgia, serif" font-size="300" font-weight="bold"
        fill="${COLORES.papel}">${temp}<tspan font-size="150" fill="${COLORES.ambar}">°</tspan></text>
  <text x="72" y="980" font-family="Segoe UI, sans-serif" font-size="46"
        fill="${COLORES.suave}">${esc(cielo)}</text>
  <text x="72" y="1070" font-family="Segoe UI, sans-serif" font-size="52" font-weight="600"
        fill="${COLORES.papel}">mínima ${min}° · máxima ${max}°</text>
  ${cajas.slice(0, 3).map((c, i) => caja(72 + i * 322, c.titulo, c.valor)).join('')}
  ${pie('radarbalcarce.com.ar · el clima todos los días', color)}
</svg>`;
}

/**
 * El dato que importa acá es la DIRECCIÓN: a las once de la noche nadie quiere
 * el apellido, quiere saber a qué esquina ir. Por eso va grande y debajo del
 * nombre, no escondida en una línea de pie.
 * `detalle` = [{ nombre, direccion, telefono }]
 */
export function placaFarmacia({ detalle = [], farmacias = [], dia, diaSemana }) {
  const color = COLOR_SECCION.Farmacias;
  const lista = detalle.length ? detalle : farmacias.map((n) => ({ nombre: n }));
  const doble = lista.length > 1;

  const bloque = (f, y) => {
    const nombre = envolver(f.nombre, doble ? 20 : 15);
    const dir = f.direccion ? envolver(f.direccion, doble ? 30 : 26) : [];
    let cursor = y;
    const partes = nombre.map((l, i) => `<text x="72" y="${cursor + i * (doble ? 76 : 112)}"
        font-family="Georgia, serif" font-size="${doble ? 68 : 100}" font-weight="bold"
        fill="${COLORES.ambar}">${esc(l)}</text>`).join('');
    cursor += (nombre.length - 1) * (doble ? 76 : 112) + (doble ? 62 : 86);
    const dirs = dir.map((l, i) => `<text x="72" y="${cursor + i * (doble ? 48 : 60)}"
        font-family="Segoe UI, sans-serif" font-size="${doble ? 40 : 52}" font-weight="600"
        fill="${COLORES.papel}">${esc(l)}</text>`).join('');
    cursor += Math.max(0, dir.length - 1) * (doble ? 48 : 60);
    const tel = f.telefono ? `<text x="72" y="${cursor + (doble ? 46 : 58)}"
        font-family="Segoe UI, sans-serif" font-size="${doble ? 34 : 42}"
        fill="${COLORES.suave}">Tel. ${esc(f.telefono)}</text>` : '';
    return { svg: partes + dirs + tel, alto: cursor - y + (doble ? 100 : 120) };
  };

  let y = doble ? 500 : 620;
  const bloques = lista.map((f) => {
    const b = bloque(f, y);
    y += b.alto + (doble ? 30 : 0);
    return b.svg;
  }).join('');
  // La chapa del horario va pegada al bloque, no colgada abajo: si no, queda
  // un agujero en el medio de la placa.
  const yHorario = Math.min(1240, y + 30);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <rect width="${ANCHO}" height="${ALTO}" fill="${COLORES.tinta}"/>
  ${radar(color, { cx: 260, cy: 760 })}
  ${cabecera(null, color)}
  <text x="72" y="340" font-family="Segoe UI, sans-serif" font-size="30" font-weight="700"
        letter-spacing="7" fill="${COLORES.ambar}">FARMACIA DE TURNO</text>
  <text x="72" y="412" font-family="Georgia, serif" font-size="54" font-weight="bold"
        fill="${COLORES.papel}">${esc(diaSemana)} ${dia}</text>
  ${bloques}
  <rect x="72" y="${yHorario}" width="936" height="96" rx="14" fill="#ffffff" fill-opacity="0.09"/>
  <text x="104" y="${yHorario + 60}" font-family="Segoe UI, sans-serif" font-size="36"
        font-weight="600" fill="${COLORES.papel}">Abierta hasta las 9 de la mañana de mañana</text>
  ${pie('Colegio de Farmacéuticos de Balcarce', color)}
</svg>`;
}

const COLOR_UTILES = '#8C2D18';

/**
 * Números útiles: una vez por semana, en un día que varía (ver
 * ingesta/utiles.mjs). Sólo entran las primeras 6 líneas para que la
 * tipografía no se achique: el resto queda para la página.
 * `grupos` = [{ categoria, items: [{ nombre, numero }] }]
 */
export function placaUtiles({ grupos = [] }) {
  const color = COLOR_UTILES;
  const filas = [];
  for (const g of grupos) {
    if (filas.length >= 6) break;
    for (const it of g.items) {
      if (filas.length >= 6) break;
      filas.push({ ...it, categoria: g.categoria });
    }
  }

  const fila = (it, y) => `
    <text x="72" y="${y}" font-family="Segoe UI, sans-serif" font-size="26" font-weight="700"
          letter-spacing="1" fill="${COLORES.ambar}">${esc(it.categoria.toUpperCase())}</text>
    <text x="72" y="${y + 44}" font-family="Georgia, serif" font-size="34" font-weight="600"
          fill="${COLORES.papel}">${esc(it.nombre)}</text>
    <text x="72" y="${y + 82}" font-family="Segoe UI, sans-serif" font-size="30"
          fill="${COLORES.ambar}">${esc(it.numero)}</text>
    <rect x="72" y="${y + 106}" width="936" height="1" fill="#ffffff" fill-opacity="0.12"/>`;

  let y = 460;
  const bloques = filas.map((it) => { const s = fila(it, y); y += 138; return s; }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <rect width="${ANCHO}" height="${ALTO}" fill="${COLORES.tinta}"/>
  ${radar(color, { cx: 900, cy: 300 })}
  ${cabecera(null, color)}
  <text x="72" y="340" font-family="Segoe UI, sans-serif" font-size="30" font-weight="700"
        letter-spacing="7" fill="${COLORES.ambar}">TELÉFONOS ÚTILES</text>
  <text x="72" y="410" font-family="Georgia, serif" font-size="46" font-weight="bold"
        fill="${COLORES.papel}">Guardalos en el celular</text>
  ${bloques}
  ${pie('Municipalidad de Balcarce · más en radarbalcarce.com.ar', color)}
</svg>`;
}

// Regla: en las piezas para redes NO va la fuente. La atribución vive en la
// nota de la página, que es donde además está el link al original.
export function placaNoticia({ seccion, titulo, cuando = '', hora = '', fondo }) {
  const color = COLOR_SECCION[seccion] ?? COLORES.rojo;
  const ilustracion = fondo === undefined ? fondoDeSeccion(seccion) : fondo;
  const renglones = envolver(titulo, 22).slice(0, 5);
  const y0 = 760 - (renglones.length - 3) * 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <rect width="${ANCHO}" height="${ALTO}" fill="${COLORES.tinta}"/>
  ${capaFondo(ilustracion)}
  ${radar(color, { cx: 900, cy: 480 })}
  ${cabecera(hora, color)}
  <rect x="72" y="300" width="${18 + esc(seccion).length * 22}" height="58" rx="8" fill="${color}"/>
  <text x="${81 + 9}" y="341" font-family="Segoe UI, sans-serif" font-size="28" font-weight="700"
        letter-spacing="4" fill="#ffffff">${esc(seccion.toUpperCase())}</text>
  ${renglones.map((l, i) => `<text x="72" y="${y0 + i * 104}" font-family="Georgia, serif"
        font-size="86" font-weight="bold" fill="${COLORES.papel}">${esc(l)}</text>`).join('')}
  <rect x="72" y="${y0 + renglones.length * 104 + 40}" width="150" height="6" fill="${color}"/>
  ${cuando ? `<text x="72" y="${y0 + renglones.length * 104 + 120}" font-family="Segoe UI, sans-serif"
        font-size="32" fill="${COLORES.suave}">${esc(cuando)}</text>` : ''}
  ${pie('La nota completa en radarbalcarce.com.ar', color)}
</svg>`;
}

/** Pasa el SVG a PNG con la calidad que pide Instagram. */
export function aPng(svg, destino) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: ANCHO },
    font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' },
  });
  fs.writeFileSync(destino, r.render().asPng());
  return destino;
}

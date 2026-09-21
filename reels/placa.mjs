// Las placas de Radar Balcarce: se dibujan por código, en SVG, y se
// convierten a imagen. Nunca se usa la foto de otro medio.
//
// La marca es el radar: círculos concéntricos y un barrido, en el color de
// cada sección. Cambia el color y el dato, nunca la estructura, así cualquiera
// que la ve de reojo en el teléfono sabe que es nuestra.

import fs from 'node:fs';
import path from 'node:path';

export const ANCHO = 1080;
export const ALTO = 1920;

export const COLORES = {
  tinta: '#14161A',
  papel: '#F7F5EF',
  // El gris de los datos secundarios: antes era claro porque el fondo era
  // negro. Ahora el fondo es papel, así que tiene que ser oscuro o no se lee.
  suave: '#6B6F6C',
  rojo: '#A8371F',
  ambar: '#E8A33C',
  verde: '#16615B',
};

// Cada sección tiene su color, siempre el mismo.
// Los colores de sección, subidos de tono. Los de antes eran apagados y,
// sobre fondo casi negro, la placa entera se veía vieja. Estos son los
// mismos tonos pero saturados, pensados para ocupar media placa como
// bloque de color en vez de ser una insinuación en un degradado.
export const COLOR_SECCION = {
  Balcarce: '#D6412A',
  Servicios: '#12857A',
  Deportes: '#12857A',
  Automovilismo: '#F2A324',
  Policiales: '#B23A1C',
  Política: '#D6412A',
  Agro: '#7E9420',
  'Cultura y agenda': '#8B5BC4',
  País: '#5A6270',
  Región: '#5A6270',
  Clima: '#12857A',
  Farmacias: '#D6412A',
  Economía: '#C08A1E',
  Tecnología: '#2F7FD6',
  Reclamos: '#B23A1C',
  Seguimiento: '#7E9420',
};

/** Una versión más oscura del color. */
function oscurecer(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Qué tan claro se ve un color, según cómo lo percibe el ojo (WCAG). El
 *  verde pesa mucho más que el azul: por eso un amarillo "medio" es en
 *  realidad clarísimo y se come el texto blanco. */
function luminancia(hex) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

/** Oscurece el color lo necesario para que el texto blanco encima se lea.
 *
 *  Es la vuelta que faltaba: sobre el color puro el texto se perdía, y con
 *  el amarillo del automovilismo directamente desaparecía. La regla de
 *  accesibilidad pide un contraste de 4.5 a 1, que para blanco encima se
 *  traduce en que el fondo no pase de 0.18 de luminancia. Se baja el color
 *  hasta ahí — sigue siendo el mismo tono, sólo que profundo. */
function paraTextoBlanco(hex, objetivo = 0.16) {
  let factor = 1;
  let salida = hex;
  while (luminancia(salida) > objetivo && factor > 0.12) {
    factor -= 0.04;
    salida = oscurecer(hex, factor);
  }
  return salida;
}

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

// Tipografías: las mismas del portal. Se declaran acá una sola vez para no
// repetir el string en cada placa.
const DISPLAY = 'Fraunces';
const TEXTO = 'IBM Plex Sans';

// El margen lateral. Más aire que antes: las placas apretadas contra el
// borde se leen peor y parecen hechas a las apuradas.
const MARGEN = 88;

// Dónde termina el bloque de color y empieza el papel. El corte es en
// diagonal: es lo que hace que la placa se vea actual en vez de una caja
// dentro de otra caja.
const CORTE = 820;

/**
 * El fondo. Antes era un "radar" de anillos concéntricos muy tenue que casi
 * no se veía y, cuando se veía, ensuciaba. Ahora es un degradado profundo
 * del color de la sección más un arco grande y limpio: se lee como marca
 * incluso a tamaño de miniatura, que es como la gente ve los reels.
 */
function fondo(color) {
  return `
  <defs>
    <linearGradient id="bloque" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="${paraTextoBlanco(color)}"/>
      <stop offset="100%" stop-color="${oscurecer(paraTextoBlanco(color), 0.6)}"/>
    </linearGradient>
  </defs>
  <rect width="${ANCHO}" height="${ALTO}" fill="${COLORES.papel}"/>
  <path d="M0 0 H${ANCHO} V${CORTE - 150} L0 ${CORTE} Z" fill="url(#bloque)"/>
  <circle cx="${ANCHO - 120}" cy="200" r="300" fill="#FFFFFF" opacity="0.10"/>
  <circle cx="${ANCHO - 120}" cy="200" r="460" fill="none"
          stroke="#FFFFFF" stroke-width="3" opacity="0.14"/>`;
}

/**
 * La chapa de arriba: logo y una barra de color que identifica la sección
 * de un vistazo. El horario de publicación no va: es dato interno nuestro.
 * Va a 170 px del borde y no más arriba: Instagram tapa la franja superior
 * con su interfaz, y el zoom del video se come otro poco.
 */
function cabecera(_hora, _color) {
  return `
  <text x="${MARGEN}" y="196" font-family="${DISPLAY}" font-size="42" font-weight="900"
        letter-spacing="-1" fill="#FFFFFF">RADAR <tspan opacity="0.72">BALCARCE</tspan></text>`;
}

/**
 * El rótulo de sección: un bloque de color sólido con el nombre en
 * mayúsculas. Es el elemento que más rápido comunica de qué se trata la
 * pieza antes de que nadie lea el título.
 */
// El rótulo va en blanco sobre el color, no al revés: sobre el bloque de
// color un chip del mismo color no se distinguiría.
function rotulo(texto, color, y = 300) {
  const ancho = 46 + String(texto).length * 23;
  return `
  <rect x="${MARGEN}" y="${y}" width="${ancho}" height="62" rx="31" fill="#FFFFFF"/>
  <text x="${MARGEN + ancho / 2}" y="${y + 41}" text-anchor="middle" font-family="${TEXTO}"
        font-size="26" font-weight="700" letter-spacing="3"
        fill="${paraTextoBlanco(color, 0.22)}">${esc(String(texto).toUpperCase())}</text>`;
}

/** El pie, arriba de la zona donde van los subtítulos. */
function pie(texto, color) {
  return `
  <rect x="${MARGEN}" y="${ALTO - 152}" width="52" height="6" fill="${color}"/>
  <text x="${MARGEN}" y="${ALTO - 108}" font-family="${TEXTO}" font-size="26"
        font-weight="500" fill="#7C7F79">${esc(texto)}</text>`;
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
  const anchoCaja = (ANCHO - MARGEN * 2 - 32) / 3;

  // Las tres cajas de datos: sin recuadro, separadas por una línea fina
  // arriba. Menos marco, más aire — lo que hace que se vea actual y no
  // como una plantilla de PowerPoint.
  const caja = (i, titulo, valor) => {
    const x = MARGEN + i * (anchoCaja + 16);
    return `
    <rect x="${x}" y="1210" width="${anchoCaja - 16}" height="3" fill="${color}" opacity="0.65"/>
    <text x="${x}" y="1264" font-family="${TEXTO}" font-size="22" font-weight="700"
          letter-spacing="3" fill="${COLORES.suave}">${esc(titulo)}</text>
    <text x="${x}" y="1320" font-family="${TEXTO}" font-size="40" font-weight="700"
          fill="${COLORES.tinta}">${esc(valor)}</text>`;
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  ${fondo(color)}
  ${cabecera(hora, color)}
  ${rotulo(kicker, color, 296)}
  <text x="${MARGEN}" y="470" font-family="${DISPLAY}" font-size="58" font-weight="700"
        letter-spacing="-1" fill="#FFFFFF">${esc(fecha)}</text>

  <!-- La temperatura, con aire suficiente arriba de la diagonal. Antes casi
       la tocaba y la placa del clima se veía distinta a todas las demás,
       aunque el corte fuera exactamente el mismo. -->
  <text x="${MARGEN - 12}" y="${CORTE - 120}" font-family="${DISPLAY}" font-size="264" font-weight="900"
        letter-spacing="-14" fill="#FFFFFF">${temp}<tspan
        font-size="114" letter-spacing="0" dx="30" dy="-120" opacity="0.65">°</tspan></text>

  <text x="${MARGEN}" y="1010" font-family="${DISPLAY}" font-size="62" font-weight="900"
        letter-spacing="-2" fill="${COLORES.tinta}">${esc(cielo)}</text>
  <text x="${MARGEN}" y="1096" font-family="${TEXTO}" font-size="50" font-weight="700"
        fill="${COLORES.tinta}">${min}° <tspan font-weight="400" fill="${COLORES.suave}">mínima</tspan>  ·  ${max}° <tspan font-weight="400" fill="${COLORES.suave}">máxima</tspan></text>

  ${cajas.slice(0, 3).map((c, i) => caja(i, c.titulo, c.valor)).join('')}
  ${pie('radarbalcarce.com', color)}
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
    const nombre = envolver(f.nombre, doble ? 18 : 14);
    const dir = f.direccion ? envolver(f.direccion, doble ? 28 : 24) : [];
    const tamNombre = doble ? 72 : 108;
    let cursor = y;
    // El nombre va en la sans, no en Fraunces. Fraunces tiene un rasgo de
    // diseño llamado "wonk" que hace las letras a propósito irregulares: en
    // un titular largo se lee como carácter, pero en un nombre corto a 108
    // píxeles la J y las s se ven torcidas, como si la tipografía estuviera
    // rota. Un nombre de farmacia tiene que leerse limpio y rápido.
    const partes = nombre.map((l, i) => `<text x="${MARGEN}" y="${cursor + i * (tamNombre * 1.1)}"
        font-family="${TEXTO}" font-size="${tamNombre}" font-weight="700" letter-spacing="-2"
        fill="${COLORES.tinta}">${esc(l)}</text>`).join('');
    cursor += (nombre.length - 1) * (tamNombre * 1.1) + (doble ? 66 : 92);
    const dirs = dir.map((l, i) => `<text x="${MARGEN}" y="${cursor + i * (doble ? 48 : 58)}"
        font-family="${TEXTO}" font-size="${doble ? 38 : 48}" font-weight="600"
        fill="${COLORES.ambar}">${esc(l)}</text>`).join('');
    cursor += Math.max(0, dir.length - 1) * (doble ? 48 : 58);
    const tel = f.telefono ? `<text x="${MARGEN}" y="${cursor + (doble ? 46 : 56)}"
        font-family="${TEXTO}" font-size="${doble ? 32 : 40}" font-weight="500"
        fill="${COLORES.suave}">Tel. ${esc(f.telefono)}</text>` : '';
    return { svg: partes + dirs + tel, alto: cursor - y + (doble ? 104 : 124) };
  };

  // Debajo del bloque de color. Arriba el texto es blanco; el nombre de la
  // farmacia va en tinta, así que tiene que caer sobre el papel.
  let y = CORTE + (doble ? 140 : 190);
  const bloques = lista.map((f) => {
    const b = bloque(f, y);
    y += b.alto + (doble ? 56 : 0);
    return b.svg;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  ${fondo(color)}
  ${cabecera(null, color)}
  ${rotulo('Farmacia de turno', color, 296)}
  <text x="${MARGEN}" y="456" font-family="${DISPLAY}" font-size="52" font-weight="700"
        letter-spacing="-1" fill="#FFFFFF" opacity="0.8">${esc(diaSemana)} ${dia}</text>
  ${bloques}
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
const COLOR_AGENDA = '#6D4BA0';

/** La agenda del fin de semana.
 *
 *  Es la pieza que ningún medio de Balcarce tiene hoy: los tres publican
 *  noticias, pero ninguno arma un calendario. El jueves a la tarde, cuando
 *  la gente empieza a pensar qué hacer, es cuando sirve.
 *
 *  Cuatro eventos como máximo: en una historia que se mira cinco segundos,
 *  seis ya no se leen. */
export function placaAgenda({ eventos = [], titulo = 'Qué hacer este fin de semana' }) {
  const color = COLOR_AGENDA;
  const lista = eventos.slice(0, 4);

  const fila = (ev, y) => `
    <text x="${MARGEN}" y="${y}" font-family="${TEXTO}" font-size="21" font-weight="700"
          letter-spacing="3" fill="${COLORES.ambar}">${esc((ev.cuando ?? '').toUpperCase())}</text>
    <text x="${MARGEN}" y="${y + 52}" font-family="${DISPLAY}" font-size="40" font-weight="700"
          letter-spacing="-1" fill="${COLORES.tinta}">${esc(ev.nombre)}</text>
    <text x="${MARGEN}" y="${y + 98}" font-family="${TEXTO}" font-size="28" font-weight="500"
          fill="${COLORES.suave}">${esc(ev.lugar ?? 'Balcarce')}</text>
    <rect x="${MARGEN}" y="${y + 132}" width="${ANCHO - MARGEN * 2}" height="1"
          fill="${COLORES.tinta}" fill-opacity="0.12"/>`;

  // El espacio se reparte entre los eventos que haya: con tres, quedaba
  // media placa vacía abajo.
  const desde = CORTE + 150;
  const hasta = 1700;
  const paso = Math.min(260, Math.round((hasta - desde) / Math.max(1, lista.length)));
  const bloques = lista.map((ev, i) => fila(ev, desde + i * paso)).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  ${fondo(color)}
  ${cabecera(null, color)}
  ${rotulo('Agenda', color, 296)}
  <text x="${MARGEN}" y="460" font-family="${DISPLAY}" font-size="58" font-weight="900"
        letter-spacing="-2" fill="#FFFFFF">${esc(titulo)}</text>
  ${bloques}
  ${pie('Agenda del Municipio de Balcarce · radarbalcarce.com', color)}
</svg>`;
}

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

  // Cada teléfono como una fila: nombre grande y número debajo, que se lee
  // de un vistazo — es para lo que existe esta pieza.
  //
  // La categoría sólo se escribe cuando cambia: antes se repetía en cada
  // fila y la placa decía "EMERGENCIAS" dos veces seguidas.
  const fila = (it, y, conCategoria) => `
    ${conCategoria ? `<text x="${MARGEN}" y="${y}" font-family="${TEXTO}" font-size="21" font-weight="700"
          letter-spacing="3" fill="${color}">${esc(it.categoria.toUpperCase())}</text>` : ''}
    <text x="${MARGEN}" y="${y + 48}" font-family="${DISPLAY}" font-size="38" font-weight="700"
          letter-spacing="-1" fill="${COLORES.tinta}">${esc(it.nombre)}</text>
    <text x="${MARGEN}" y="${y + 96}" font-family="${TEXTO}" font-size="34" font-weight="600"
          fill="${COLORES.ambar}">${esc(it.numero)}</text>
    <rect x="${MARGEN}" y="${y + 126}" width="${ANCHO - MARGEN * 2}" height="1"
          fill="${COLORES.tinta}" fill-opacity="0.12"/>`;

  // El espacio se reparte entre las filas que haya, para no dejar media
  // placa vacía cuando son pocas.
  const desde = CORTE + 150;
  const paso = Math.min(180, Math.round((1720 - desde) / Math.max(1, filas.length)));
  let anterior = null;
  const bloques = filas.map((it, i) => {
    const conCategoria = it.categoria !== anterior;
    anterior = it.categoria;
    return fila(it, desde + i * paso, conCategoria);
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  ${fondo(color)}
  ${cabecera(null, color)}
  ${rotulo('Teléfonos útiles', color, 296)}
  <text x="${MARGEN}" y="450" font-family="${DISPLAY}" font-size="56" font-weight="900"
        letter-spacing="-2" fill="#FFFFFF">Guardalos en el celular</text>
  ${bloques}
  ${pie('Municipalidad de Balcarce · radarbalcarce.com', color)}
</svg>`;
}

// Regla: en las piezas para redes NO va la fuente. La atribución vive en la
// nota de la página, que es donde además está el link al original.
// Cuánto ocupa un texto, aproximadamente, en píxeles.
//
// Cortar por cantidad de letras no sirve con una tipografía proporcional:
// "La Dirección de Juventud" y "MMMMMMMMMMMMMMMMMMMMMMMM" tienen las mismas
// letras y ocupan el doble una que la otra. Por eso el renglón se pasaba
// del margen derecho aunque el conteo diera bien.
//
// Estos factores son del ancho de cada letra respecto del cuerpo, medidos
// a ojo sobre Fraunces en negrita. No son exactos, pero alcanzan: el error
// queda muy por debajo del margen que dejamos.
// Calibrados contra una placa real: con los valores de antes, "La Dirección
// de Juventud" medía 859 px estimados y se dibujaba en 945. Fraunces en
// negro es más ancha de lo que parece.
const ANCHO_LETRA = { estrecha: 0.34, normal: 0.58, ancha: 0.96, mayuscula: 0.72, numero: 0.62 };

// Un poco de aire: el cálculo es aproximado y es preferible que un renglón
// baje antes de tiempo a que se salga del margen.
const AIRE = 0.96;

function anchoAproximado(texto, tam) {
  let total = 0;
  for (const c of String(texto)) {
    if (' iltjfr.,;:!|\'"()[]-'.includes(c)) total += ANCHO_LETRA.estrecha;
    else if ('mwMW'.includes(c)) total += ANCHO_LETRA.ancha;
    else if (c >= '0' && c <= '9') total += ANCHO_LETRA.numero;
    else if (c === c.toUpperCase() && c !== c.toLowerCase()) total += ANCHO_LETRA.mayuscula;
    else total += ANCHO_LETRA.normal;
  }
  return total * tam;
}

/** Corta el texto en renglones que entren en `disponible` píxeles. */
export function envolverAncho(texto, tam, disponible) {
  const palabras = String(texto).split(/\s+/);
  const renglones = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = (`${actual} ${p}`).trim();
    if (actual && anchoAproximado(prueba, tam) > disponible) { renglones.push(actual); actual = p; }
    else actual = prueba;
  }
  if (actual) renglones.push(actual);
  return renglones;
}

// Los cuerpos posibles para el titular, de mayor a menor, con cuántos
// renglones se le permiten a cada uno. Gana el primero donde el título
// entre completo: uno corto sale enorme y uno largo se achica lo justo.
const ESCALONES = [
  { tam: 104, max: 2 },
  { tam: 96, max: 3 },
  { tam: 86, max: 4 },
  { tam: 76, max: 5 },
  { tam: 66, max: 6 },
  { tam: 58, max: 7 },
];

function repartirTitular(titulo) {
  const disponible = (ANCHO - MARGEN * 2) * AIRE;
  for (const e of ESCALONES) {
    const lineas = envolverAncho(titulo, e.tam, disponible);
    if (lineas.length <= e.max) return { lineas, tam: e.tam };
  }
  // Ni en el cuerpo más chico entra. Se corta, pero con puntos suspensivos
  // para que quede claro que el titular sigue.
  const ultimo = ESCALONES[ESCALONES.length - 1];
  const lineas = envolverAncho(titulo, ultimo.tam, disponible).slice(0, ultimo.max);
  lineas[lineas.length - 1] = `${lineas[lineas.length - 1]}…`;
  return { lineas, tam: ultimo.tam };
}

export function placaNoticia({
  seccion, titulo, cuando = '', hora = '', fondo: ilustracionPedida,
}) {
  const color = COLOR_SECCION[seccion] ?? COLORES.rojo;
  const ilustracion = ilustracionPedida === undefined ? fondoDeSeccion(seccion) : ilustracionPedida;

  // El titular es el protagonista, así que el cuerpo se adapta a su largo.
  //
  // Antes esto cortaba a cinco renglones con un slice y listo: un título de
  // seis renglones salía publicado por la mitad, terminando en "en el" y
  // sin que nada avisara. Ahora se busca el primer escalón donde entre
  // entero, y recién si no entra en ninguno se corta — pero con puntos
  // suspensivos, para que se vea que falta algo.
  const renglones = repartirTitular(titulo);
  const tam = renglones.tam;
  const interlinea = Math.round(tam * 1.16);

  // Anclado ARRIBA, justo debajo del bloque de color, y crece hacia abajo.
  // Antes crecía hacia arriba desde una línea fija, y un titular de cinco
  // renglones se metía adentro de la diagonal de color.
  const lineas = renglones.lineas;
  const y0 = CORTE + 150;
  const base = y0 + (lineas.length - 1) * interlinea;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  ${fondo(color)}
  ${capaFondo(ilustracion)}
  ${cabecera(hora, color)}
  ${rotulo(seccion, color, 296)}

  ${lineas.map((l, i) => `<text x="${MARGEN}" y="${y0 + i * interlinea}"
        font-family="${DISPLAY}" font-size="${tam}" font-weight="900" letter-spacing="-2"
        fill="${COLORES.tinta}">${esc(l)}</text>`).join('')}

  <rect x="${MARGEN}" y="${base + 62}" width="96" height="6" fill="${color}"/>
  ${cuando ? `<text x="${MARGEN}" y="${base + 142}" font-family="${TEXTO}"
        font-size="30" font-weight="500" fill="${COLORES.suave}">${esc(cuando)}</text>` : ''}
  ${pie('La nota completa en radarbalcarce.com', color)}
</svg>`;
}

/** Pasa el SVG a PNG con la calidad que pide Instagram. */
// Las tipografías del portal, incrustadas de verdad. Antes las placas se
// dibujaban con Georgia y Segoe UI (las que trae Windows) y por eso no
// terminaban de verse del mismo medio que la web. Estas son las mismas
// que usa el sitio: Fraunces para los titulares, IBM Plex Sans para todo
// lo demás.
const CARPETA_FUENTES = path.join(import.meta.dirname, 'marca', 'fuentes');

function archivosDeFuente() {
  try {
    return fs.readdirSync(CARPETA_FUENTES)
      .filter((f) => f.endsWith('.ttf'))
      .map((f) => path.join(CARPETA_FUENTES, f));
  } catch {
    return [];
  }
}

/**
 * Convierte una placa a PNG.
 *
 * Es async porque el conversor se carga recién acá. Dibujar una placa es
 * SVG puro y no necesita nada instalado; convertirla sí, y es una
 * dependencia nativa pesada. Con el import arriba del archivo, importar
 * este módulo para leer el plan del día la arrastraba — y las pruebas
 * rompían en GitHub Actions, donde a propósito no se instala nada.
 */
export async function aPng(svg, destino, ancho = ANCHO) {
  const { Resvg } = await import('@resvg/resvg-js');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const propias = archivosDeFuente();
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: ancho },
    font: {
      fontFiles: propias,
      // Si por lo que sea faltan los archivos, sigue andando con las del
      // sistema en vez de romperse: una placa fea es mejor que ninguna.
      loadSystemFonts: propias.length === 0,
      defaultFontFamily: 'IBM Plex Sans',
    },
  });
  fs.writeFileSync(destino, r.render().asPng());
  return destino;
}
